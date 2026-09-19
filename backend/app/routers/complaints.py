from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Complaint
from app.pipeline.orchestrator import run_submission

router = APIRouter(prefix="/complaints", tags=["complaints"])

ALLOWED_STATUS = {"Reported", "Under Review", "Work Scheduled", "In Progress", "Resolved", "Rejected"}

DEPARTMENT_MAP = {
    "Roads & Potholes": "PWD",
    "Water Supply & Leakage": "Water Supply & Sewerage Board",
    "Sanitation & Waste Management": "Solid Waste Management",
    "Drainage & Sewage": "Drainage Cell (PWD)",
    "Street Lighting": "Electricity Department",
    "Public Safety & Hazards": "Disaster Management Cell",
    "Encroachment & Traffic Obstruction": "Enforcement Wing",
}


@router.post("/submit", status_code=201)
async def submit_complaint(
    channel: str = Form("text"),
    text: str = Form(""),
    lat: float = Form(...),
    lng: float = Form(...),
    ward_id: int | None = Form(None),
    phone: str | None = Form(None),
    audio: UploadFile | None = File(None),
    photo: UploadFile | None = File(None),
    client_ip: str | None = Form(None),
    db: Session = Depends(get_db),
):
    audio_ref = photo_ref = None
    if audio is not None and audio.filename:
        ext = (audio.filename or "clip.webm").rsplit(".", 1)[-1][:5]
        audio_ref = f"audio_{uuid.uuid4().hex[:8]}.{ext}"
        (settings.MEDIA_DIR / audio_ref).write_bytes(await audio.read())
    if photo is not None and photo.filename:
        ext = (photo.filename or "img.jpg").rsplit(".", 1)[-1][:5]
        photo_ref = f"photo_{uuid.uuid4().hex[:8]}.{ext}"
        (settings.MEDIA_DIR / photo_ref).write_bytes(await photo.read())

    payload = {
        "channel": channel, "text": text, "lat": lat, "lng": lng,
        "ward_id": ward_id, "phone": phone, "client_ip": client_ip,
        "audio_ref": audio_ref, "photo_ref": photo_ref,
    }

    submission_id = await run_submission(payload, db)
    return {
        "submission_id": submission_id,
        "pipeline_status": "done",
        "trace_url": f"/api/v1/pipeline/{submission_id}",
    }


@router.get("")
def list_complaints(
    ward: int | None = None,
    category: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db),
):
    q = select(Complaint).order_by(Complaint.created_at.desc())
    if ward:
        q = q.where(Complaint.ward_id == ward)
    if category and category != "All":
        q = q.where(Complaint.category == category)
    if status and status != "All":
        q = q.where(Complaint.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                Complaint.tracking_code.ilike(term),
                Complaint.submission_id.ilike(term),
                Complaint.standardized_summary.ilike(term),
                Complaint.raw_text.ilike(term),
                Complaint.category.ilike(term),
                Complaint.subcategory.ilike(term),
                Complaint.citizen_phone_masked.ilike(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.execute(q.limit(page_size).offset((page - 1) * page_size)).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "complaints": [
            {
                "id": c.id,
                "tracking_code": c.tracking_code,
                "submission_id": c.submission_id,
                "category": c.category,
                "subcategory": c.subcategory,
                "summary": c.standardized_summary,
                "raw_text": c.raw_text,
                "severity": c.severity_score,
                "urgency": c.urgency_level,
                "ward": c.ward.ward_name if c.ward else None,
                "ward_id": c.ward_id,
                "zone": c.ward.zone_name if c.ward else None,
                "status": c.status,
                "department": DEPARTMENT_MAP.get(c.category, "General Administration"),
                "channel": c.channel,
                "photo_path": c.photo_path,
                "audio_path": c.audio_path,
                "citizen_phone_masked": c.citizen_phone_masked,
                "ai_metadata": c.ai_metadata,
                "lat": c.latitude,
                "lng": c.longitude,
                "cluster_id": c.cluster_id,
                "created_at": str(c.created_at),
                "updated_at": str(c.updated_at),
            }
            for c in rows
        ],
    }


@router.get("/{tracking_code}")
def get_complaint(tracking_code: str, db: Session = Depends(get_db)):
    code_cleaned = tracking_code.strip()
    q = select(Complaint).where(
        or_(
            Complaint.tracking_code == code_cleaned,
            Complaint.submission_id == code_cleaned,
        )
    )
    if code_cleaned.isdigit():
        q = select(Complaint).where(
            or_(
                Complaint.tracking_code == code_cleaned,
                Complaint.submission_id == code_cleaned,
                Complaint.id == int(code_cleaned),
            )
        )
    c = db.execute(q).scalars().first()
    if not c:
        raise HTTPException(404, f"Complaint with identifier '{tracking_code}' not found")

    dept = DEPARTMENT_MAP.get(c.category, "General Administration")

    timeline = [
        {
            "status": "Reported",
            "at": str(c.created_at),
            "notes": "Complaint registered & processed via Indore 311 Multimodal AI.",
            "by": f"Citizen ({c.channel or 'portal'})",
        }
    ]

    # Include full status history if stored in ai_metadata
    history = (c.ai_metadata or {}).get("status_history", []) if isinstance(c.ai_metadata, dict) else []
    for item in history:
        timeline.append({
            "status": item.get("status", c.status),
            "at": item.get("at", str(c.updated_at)),
            "notes": item.get("notes") or f"Status updated to {item.get('status')}",
            "by": item.get("officer_name") or "Municipal Official",
        })

    if not history and c.status != "Reported":
        timeline.append({
            "status": c.status,
            "at": str(c.updated_at),
            "notes": f"Status updated to {c.status}",
            "by": "Municipal Official",
        })

    return {
        "id": c.id,
        "tracking_code": c.tracking_code,
        "submission_id": c.submission_id,
        "category": c.category,
        "subcategory": c.subcategory,
        "summary": c.standardized_summary,
        "raw_text": c.raw_text,
        "status": c.status,
        "department": dept,
        "severity": c.severity_score,
        "urgency": c.urgency_level,
        "ward": c.ward.ward_name if c.ward else None,
        "ward_id": c.ward_id,
        "zone": c.ward.zone_name if c.ward else None,
        "lat": c.latitude,
        "lng": c.longitude,
        "channel": c.channel,
        "photo_path": c.photo_path,
        "audio_path": c.audio_path,
        "citizen_phone_masked": c.citizen_phone_masked,
        "ai_metadata": c.ai_metadata,
        "created_at": str(c.created_at),
        "updated_at": str(c.updated_at),
        "timeline": timeline,
        "resolution_photo": c.photo_path if c.status == "Resolved" else None,
    }


@router.patch("/{complaint_id}/status")
def update_status(complaint_id: int, body: dict, db: Session = Depends(get_db)):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(404, "Complaint not found")
    new_status = body.get("status")
    if new_status not in ALLOWED_STATUS:
        raise HTTPException(422, f"status must be one of {sorted(ALLOWED_STATUS)}")

    notes = (body.get("notes") or "").strip()
    officer_name = (body.get("officer_name") or "Municipal Official").strip()

    meta = dict(c.ai_metadata or {})
    history = list(meta.get("status_history", []))
    now_iso = datetime.now(timezone.utc).isoformat()

    history.append({
        "status": new_status,
        "at": now_iso,
        "notes": notes,
        "officer_name": officer_name,
    })
    meta["status_history"] = history
    c.ai_metadata = meta
    c.status = new_status
    c.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)

    return {
        "id": c.id,
        "tracking_code": c.tracking_code,
        "status": c.status,
        "notes": notes,
        "officer_name": officer_name,
        "updated_at": str(c.updated_at),
        "status_history": history,
    }

