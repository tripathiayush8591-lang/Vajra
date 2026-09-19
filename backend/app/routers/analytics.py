from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint, Hotspot

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    complaints = db.execute(select(Complaint)).scalars().all()
    hotspots = db.execute(select(Hotspot).where(Hotspot.status.in_(["Active", "Under Intervention"]))).scalars().all()
    total = len(complaints)
    resolved = sum(1 for c in complaints if c.status == "Resolved")

    by_category: dict[str, int] = {}
    by_ward: dict[str, int] = {}
    for c in complaints:
        by_category[c.category] = by_category.get(c.category, 0) + 1
        name = c.ward.ward_name if c.ward else "Unknown"
        by_ward[name] = by_ward.get(name, 0) + 1

    # 14-day timeline (day → count)
    timeline = []
    now = datetime.now(timezone.utc)
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        n = sum(1 for c in complaints if c.created_at.date() == day)
        timeline.append({"date": day.isoformat(), "count": n})

    return {
        "total_complaints": total,
        "active_hotspots": len(hotspots),
        "critical_count": sum(1 for c in complaints if c.severity_score >= 4),
        "resolution_rate": round(resolved / total, 2) if total else 0,
        "surging_hotspots": sum(1 for h in hotspots if (h.temporal or {}).get("accelerating")),
        "by_category": [{"name": k, "value": v} for k, v in sorted(by_category.items(), key=lambda x: -x[1])],
        "by_ward": [{"name": k, "value": v} for k, v in sorted(by_ward.items(), key=lambda x: -x[1])],
        "timeline": timeline,
    }
