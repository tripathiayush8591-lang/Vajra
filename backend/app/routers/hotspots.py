from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint, Hotspot
from app.services import priority_engine

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


def _hotspot_dict(h: Hotspot, db: Session, full: bool = False) -> dict:
    d = {
        "id": h.id, "title": h.title,
        "ward": {"id": h.ward.id, "name": h.ward.ward_name, "zone": h.ward.zone_name},
        "category": h.category,
        "centroid": {"lat": h.centroid_lat, "lng": h.centroid_lng},
        "radius_m": h.radius_meters,
        "complaint_count": h.complaint_count, "avg_severity": h.avg_severity,
        "priority_score": h.priority_score,
        "components": h.score_breakdown or {},
        "evidence": h.ai_summary, "temporal": h.temporal or {},
        "status": h.status, "sample_audio_ref": h.sample_audio_path,
    }
    if full:
        rows = db.execute(select(Complaint).where(Complaint.cluster_id == h.id)).scalars().all()
        d["complaints"] = [
            {"id": c.id, "summary": c.standardized_summary[:120], "severity": c.severity_score,
             "channel": c.channel, "created_at": str(c.created_at)} for c in rows
        ]
        d["geojson"] = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [h.centroid_lng, h.centroid_lat]},
            "properties": {"id": h.id, "title": h.title, "priority_score": h.priority_score,
                           "category": h.category, "complaint_count": h.complaint_count,
                           "radius_m": h.radius_meters},
        }
    return d


@router.get("")
def list_hotspots(category: str | None = None, ward_id: int | None = None,
                  status: str | None = None,
                  min_score: float = 0, db: Session = Depends(get_db)):
    q = select(Hotspot).order_by(Hotspot.priority_score.desc())
    if status and status != "All":
        q = q.where(Hotspot.status == status)
    elif status is None:
        q = q.where(Hotspot.status.in_(["Active", "Under Intervention"]))
    if category and category != "All":
        q = q.where(Hotspot.category == category)
    if ward_id:
        q = q.where(Hotspot.ward_id == ward_id)
    rows = db.execute(q).scalars().all()
    return {"hotspots": [_hotspot_dict(h, db, full=True) for h in rows if h.priority_score >= min_score]}


@router.get("/geojson")
def hotspots_geojson(db: Session = Depends(get_db)):
    rows = db.execute(select(Hotspot).where(Hotspot.status.in_(["Active", "Under Intervention"]))).scalars().all()
    return {
        "type": "FeatureCollection",
        "features": [_hotspot_dict(h, db, full=True)["geojson"] for h in rows],
    }


@router.get("/{hotspot_id}")
def get_hotspot(hotspot_id: int, db: Session = Depends(get_db)):
    h = db.get(Hotspot, hotspot_id)
    if not h:
        raise HTTPException(404, "hotspot not found")
    return _hotspot_dict(h, db, full=True)


@router.post("/{hotspot_id}/whatif")
def whatif(hotspot_id: int, body: dict, db: Session = Depends(get_db)):
    """Counterfactual: 'resolve N complaints' → re-run Stage 5 math."""
    h = db.get(Hotspot, hotspot_id)
    if not h:
        raise HTTPException(404, "hotspot not found")
    resolved = max(0, min(int(body.get("resolved_complaints", 0)), h.complaint_count))
    remaining = h.complaint_count - resolved
    days_active = max((h.updated_at - h.created_at).days, 1)
    components = priority_engine.compute_components(
        avg_severity=h.avg_severity, complaint_count=max(remaining, 0),
        population=h.ward.population_estimate, oldest_open_days=days_active,
        radius_m=h.radius_meters, last_48h=max((h.temporal or {}).get("last_48h", 0) - resolved, 0),
        category=h.category,
    )
    hypothetical = priority_engine.aggregate(components) if remaining > 0 else 0.0
    return {
        "hotspot_id": h.id, "resolved_complaints": resolved,
        "current_score": h.priority_score, "hypothetical_score": hypothetical,
        "components": components,
    }
