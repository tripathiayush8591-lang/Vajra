from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AdminAction, Hotspot

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/actions")
def list_actions(hotspot_id: int | None = None, db: Session = Depends(get_db)):
    q = select(AdminAction).order_by(AdminAction.created_at.desc())
    if hotspot_id:
        q = q.where(AdminAction.hotspot_id == hotspot_id)
    rows = db.execute(q.limit(100)).scalars().all()
    return {"actions": [
        {"id": a.id, "hotspot_id": a.hotspot_id, "action_type": a.action_type,
         "notes": a.notes, "officer": a.officer_name, "budget": a.budget_allocated,
         "created_at": str(a.created_at)} for a in rows
    ]}


@router.post("/actions", status_code=201)
def create_action(body: dict, db: Session = Depends(get_db)):
    h = db.get(Hotspot, body.get("hotspot_id"))
    if not h:
        from fastapi import HTTPException
        raise HTTPException(404, "hotspot not found")
    a = AdminAction(
        hotspot_id=h.id, action_type=body.get("action_type", "INSPECTION_ORDERED"),
        notes=body.get("notes"), officer_name=body.get("officer_name", "Municipal Officer"),
        budget_allocated=float(body.get("budget_allocated", 0)),
    )
    if a.action_type in ("BUDGET_ALLOCATED", "CONTRACTOR_ASSIGNED", "INSPECTION_ORDERED"):
        h.status = "Under Intervention"
    elif a.action_type == "RESOLVED":
        h.status = "Resolved"
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "action_type": a.action_type, "hotspot_status": h.status}


@router.get("/system")
def system_info():
    return {"llm_mode": "gemini" if settings.llm_available else "fallback", "offline_mode": settings.OFFLINE_MODE}


@router.post("/system")
def set_system(body: dict):
    settings.OFFLINE_MODE = bool(body.get("offline_mode", settings.OFFLINE_MODE))
    return {"llm_mode": "gemini" if settings.llm_available else "fallback", "offline_mode": settings.OFFLINE_MODE}
