"""Policymaker Copilot: grounded answers + work-order drafting.

Deterministic-grounded: builds a factual context packet from live DB aggregates,
then optionally asks Gemini to phrase the answer. Offline fallback returns the
grounded packet verbatim — the copilot still works with zero LLM access.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Hotspot

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _grounding(db: Session) -> str:
    hotspots = db.execute(
        select(Hotspot).where(Hotspot.status == "Active").order_by(Hotspot.priority_score.desc()).limit(8)
    ).scalars().all()
    lines = []
    for h in hotspots:
        lines.append(
            f"- {h.title} | {h.ward.ward_name} ({h.ward.zone_name}) | score {h.priority_score}/100 | "
            f"{h.complaint_count} complaints | avg severity {h.avg_severity} | "
            f"surge={bool((h.temporal or {}).get('accelerating'))}"
        )
    return "\n".join(lines) or "- No active hotspots."


def _fallback_answer(query: str, grounding: str) -> str:
    return (
        f"**Grounded briefing** (offline mode)\n\nTop active hotspots by priority:\n{grounding}\n\n"
        f"Regarding your query “{query}”: the highest-priority item above should be addressed first; "
        "dispatch the mapped department and monitor the surge flags."
    )


def _draft_work_order(h: Hotspot) -> dict:
    timeline = "24 hours" if h.priority_score >= 85 else "72 hours" if h.priority_score >= 70 else "1 week"
    return {
        "hotspot_id": h.id, "title": h.title, "department_hint": h.category,
        "ward": h.ward.ward_name, "timeline": timeline,
        "equipment_hint": "Jetting machine / cold-mix patch crew as per category",
        "budget_estimate_inr": int(max(50_000, h.priority_score * 5_000)),
    }


@router.post("/chat")
def chat(body: dict, db: Session = Depends(get_db)):
    query = body.get("query", "").strip()
    if not query:
        return {"answer": "Please ask a question about wards, hotspots, or priorities.", "draft_work_order": None}

    grounding = _grounding(db)
    answer = None
    if settings.llm_available:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            prompt = (
                "You are CivicPulse Copilot, advisor to the Municipal Commissioner. "
                "Use ONLY this live data:\n" + grounding +
                f"\n\nQuery: {query}\nAnswer concisely in markdown with specifics."
            )
            answer = model.generate_content(prompt).text.strip()
        except Exception:  # noqa: BLE001
            answer = None
    if not answer:
        answer = _fallback_answer(query, grounding)

    top = db.execute(
        select(Hotspot).where(Hotspot.status == "Active").order_by(Hotspot.priority_score.desc())
    ).scalars().first()
    draft = _draft_work_order(top) if top else None
    return {"answer": answer, "draft_work_order": draft, "llm_mode": "gemini" if settings.llm_available else "fallback"}
