"""Pipeline orchestrator.

Stages run sequentially; agents within a stage run concurrently via
asyncio.gather (see stage modules). Each agent writes only to its registered
shared-record keys (zero-collision asserted in schemas/shared_record.py).
Every agent execution is traced for the Pipeline Live Viewer.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.pipeline import trace
from app.models import AdminAction, Complaint, Hotspot, Ward
from app.pipeline import (
    stage1_input,
    stage2_understand,
    stage3_connect,
    stage4_locate,
    stage5_prioritize,
    stage6_act,
)
from app.pipeline.trace import append_stage, create, finish, set_record
from app.schemas.shared_record import STAGES, STAGE_NAMES
from app.services import embeddings as emb
from app.services import geo, priority_engine

STAGE_MODULES = {
    1: stage1_input, 2: stage2_understand, 3: stage3_connect,
    4: stage4_locate, 5: stage5_prioritize, 6: stage6_act,
}


def _mask_phone(phone: str | None) -> str | None:
    if not phone or len(phone) < 8:
        return None
    return f"{phone[:3]}****{phone[-4:]}"


def _load_recent_complaints(db: Session, days: int = 14, limit: int = 300) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(Complaint).where(Complaint.created_at >= cutoff).order_by(Complaint.created_at.desc()).limit(limit)
    ).scalars().all()
    out = []
    for c in rows:
        out.append({
            "id": c.id, "lat": c.latitude, "lng": c.longitude, "category": c.category,
            "channel": c.channel, "cluster_id": c.cluster_id,
            "embedding": emb.embed(c.raw_text or c.standardized_summary or c.category),
            "created_at": c.created_at.replace(tzinfo=timezone.utc).isoformat() if c.created_at.tzinfo is None else c.created_at.isoformat(),
        })
    return out


def _resolve_ward(db: Session, lat: float, lng: float, ward_id_hint: int | None) -> dict:
    wards = db.execute(select(Ward)).scalars().all()
    if ward_id_hint:
        w = next((w for w in wards if w.id == ward_id_hint), None)
        if w:
            return _ward_dict(w)
    w = min(wards, key=lambda w: geo.haversine_m(lat, lng, w.latitude, w.longitude))
    return _ward_dict(w)


def _ward_dict(w: Ward) -> dict:
    return {
        "id": w.id, "ward_number": w.ward_number, "ward_name": w.ward_name,
        "zone_name": w.zone_name, "latitude": w.latitude, "longitude": w.longitude,
        "population": w.population_estimate, "infra_gap_index": w.infra_gap_index,
    }


def _load_hotspot_context(db: Session, ctx: dict) -> dict:
    """Aggregate scoring inputs across the (ward, category) cluster around this point."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    rows = db.execute(
        select(Complaint).where(
            Complaint.ward_id == ctx["ward"]["id"],
            Complaint.category == ctx.get("category"),
            Complaint.created_at >= cutoff,
        )
    ).scalars().all()
    lat, lng = ctx["payload"]["lat"], ctx["payload"]["lng"]
    pts = [c for c in rows if geo.haversine_m(lat, lng, c.latitude, c.longitude) <= 400]
    count = len(pts) + 1  # include this submission
    avg_sev = (sum(c.severity_score for c in pts) + ctx.get("severity", 3)) / count
    oldest = max(
        [priority_engine.days_since(c.created_at) for c in pts] + [0.0]
    )
    duplicate_ratio = (
        sum(1 for c in pts if c.ai_metadata and c.ai_metadata.get("duplicate")) / max(len(pts), 1)
    )
    return {
        "complaint_count": count,
        "avg_severity": round(avg_sev, 2),
        "population": ctx["ward"]["population"],
        "oldest_open_days": round(oldest, 1),
        "radius_m": ctx.get("boundary", {}).get("radius_m", 250.0),
        "duplicate_ratio": duplicate_ratio,
        "same_phone_burst": False,
        "last_48h": ctx.get("temporal", {}).get("last_48h", 0),
        "category": ctx.get("category", ""),
    }


def _persist(db: Session, ctx: dict, record: dict) -> dict:
    """Write Complaint + (re)compute the cluster's Hotspot row."""
    payload = ctx["payload"]
    tracking_code = ctx.get("tracking_code") or f"CP-IND-{random.randint(1000, 9999)}"
    complaint = Complaint(
        tracking_code=tracking_code,
        submission_id=ctx["submission_id"],
        channel=payload.get("channel", "text"),
        raw_text=ctx.get("text") or None,
        audio_path=payload.get("audio_ref"),
        photo_path=payload.get("photo_ref"),
        original_language=record["stage2_understand"].get("detected_language", "English"),
        standardized_summary=ctx.get("standardized_summary", ""),
        category=ctx.get("category", "Other"),
        subcategory=record["stage2_understand"].get("subcategory"),
        severity_score=ctx.get("severity", 3),
        urgency_level=record["stage2_understand"].get("urgency", "Medium"),
        latitude=payload["lat"], longitude=payload["lng"],
        ward_id=ctx["ward"]["id"],
        status="Reported",
        citizen_phone_masked=_mask_phone(payload.get("phone")),
        ai_metadata={
            "duplicate": ctx.get("duplicate_of") is not None,
            "landmarks": ctx.get("landmarks", []),
            "temporal": ctx.get("temporal"),
            "llm_used": (record.get("trace") and any(t.get("summary", "").endswith("(llm)") for t in record["trace"])),
        },
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    result = {"complaint_id": complaint.id, "tracking_code": tracking_code}

    if ctx.get("is_hotspot"):
        # find or build the hotspot for this cluster
        s = ctx["score_inputs"]
        boundary = ctx["boundary"]
        hotspot = db.execute(
            select(Hotspot).where(
                Hotspot.ward_id == ctx["ward"]["id"], Hotspot.category == ctx.get("category"),
                Hotspot.status.in_(["Active", "Under Intervention"]),
            )
        ).scalars().first()
        if hotspot is None:
            hotspot = Hotspot(
                title=ctx.get("cluster_label", "Civic hotspot"),
                ward_id=ctx["ward"]["id"], category=ctx.get("category"),
                centroid_lat=boundary["centroid"][0], centroid_lng=boundary["centroid"][1],
                radius_meters=boundary["radius_m"], ai_summary=ctx.get("evidence", ""),
            )
            db.add(hotspot)
            db.commit()
            db.refresh(hotspot)
        else:
            hotspot.title = ctx.get("cluster_label") or hotspot.title
            hotspot.centroid_lat = boundary["centroid"][0]
            hotspot.centroid_lng = boundary["centroid"][1]
            hotspot.radius_meters = boundary["radius_m"]

        hotspot.complaint_count = s["complaint_count"]
        hotspot.avg_severity = s["avg_severity"]
        hotspot.priority_score = ctx.get("priority_score", 0)
        hotspot.score_breakdown = ctx.get("components")
        hotspot.ai_summary = ctx.get("evidence", "")
        hotspot.temporal = ctx.get("temporal")
        hotspot.sample_audio_path = payload.get("audio_ref")
        db.commit()
        db.refresh(hotspot)
        complaint.cluster_id = hotspot.id
        db.commit()
        result.update({"hotspot_id": hotspot.id, "priority_score": hotspot.priority_score})

    return result


async def run_submission(payload: dict, db: Session) -> str:
    """Full 6-stage pipeline for one submission. Returns submission_id."""
    submission_id = f"SUB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    create(submission_id, payload.get("channel", "text"))
    record = {
        "submission_id": submission_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "channel": payload.get("channel", "text"),
        "stage1_input": {}, "stage2_understand": {}, "stage3_connect": {},
        "stage4_locate": {}, "stage5_prioritize": {"components": {}}, "stage6_act": {},
        "trace": [],
    }
    ctx: dict = {
        "submission_id": submission_id,
        "payload": payload,
        "tracking_code": f"CP-IND-{random.randint(1000, 9999)}",
        "load_recent_complaints": lambda: _load_recent_complaints(db),
        "resolve_ward": lambda: _resolve_ward(db, payload["lat"], payload["lng"], payload.get("ward_id")),
        "load_hotspot_context": lambda: _load_hotspot_context(db, ctx),
    }

    try:
        for stage_no in range(1, 7):
            trace.set_stage(stage_no)
            t0 = datetime.now(timezone.utc)
            module = STAGE_MODULES[stage_no]
            if stage_no == 6:
                # tracking code chosen once, shared by feedback_looper + persistence
                payload["tracking_code"] = ctx["tracking_code"]
            await module.run_all(record, ctx)
            stage_block = {
                "stage": stage_no,
                "name": STAGE_NAMES[stage_no],
                "status": "done",
                "ms": round((datetime.now(timezone.utc) - t0).total_seconds() * 1000, 1),
                "agents": [t for t in record["trace"] if t["stage"] == stage_no],
            }
            append_stage(submission_id, stage_block)
            set_record(submission_id, record)

        result = _persist(db, ctx, record)
        finish(submission_id, "done", result)
    except Exception as exc:  # noqa: BLE001
        finish(submission_id, "failed", {"error": f"{type(exc).__name__}: {exc}"})
        raise
    return submission_id
