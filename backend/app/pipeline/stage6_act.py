"""Stage 6 — Act agents (5): routing, notification, report, tracking, transparency."""
from __future__ import annotations

import asyncio
import time
from typing import Callable

from app.schemas.shared_record import set_key

DEPARTMENT_MAP = {
    "Roads & Potholes": "PWD",
    "Water Supply & Leakage": "Water Supply & Sewerage Board",
    "Sanitation & Waste Management": "Solid Waste Management",
    "Drainage & Sewage": "Drainage Cell (PWD)",
    "Street Lighting": "Electricity Department",
    "Public Safety & Hazards": "Disaster Management Cell",
    "Encroachment & Traffic Obstruction": "Enforcement Wing",
}


def _agent(name: str, stage: int, record: dict, ctx: dict, fn: Callable[[dict, dict], Any]) -> None:
    t0 = time.perf_counter()
    try:
        fn(record, ctx)
        status, summary = "ok", ctx.get(f"_sum_{name}", "")
    except Exception as exc:  # noqa: BLE001
        status, summary = "failed", f"{type(exc).__name__}: {exc}"
    record["trace"].append(
        {"agent": name, "stage": stage, "status": status,
         "ms": round((time.perf_counter() - t0) * 1000, 1), "summary": summary}
    )


def department_router(record: dict, ctx: dict) -> None:
    dept = DEPARTMENT_MAP.get(ctx.get("category", ""), "General Administration")
    ctx["department"] = dept
    ctx["_sum_department_router"] = dept
    set_key(record, "stage6_act.department", dept)


def notifier(record: dict, ctx: dict) -> None:
    # Simulated dispatch queue: dashboard alert + email/SMS stub (no external send in demo).
    notification = {"sent": True, "channel": "dashboard+email-sim", "department": ctx["department"]}
    ctx["_sum_notifier"] = f"alert → {ctx['department']}"
    set_key(record, "stage6_act.notification", notification)


def report_generator(record: dict, ctx: dict) -> None:
    from app.config import settings

    report_path = settings.REPORTS_DIR / f"RPT-{ctx['submission_id']}.md"
    s = ctx.get("score_inputs", {})
    body = (
        f"# Executive Report — {ctx.get('cluster_label', 'Civic Issue')}\n\n"
        f"- **Department**: {ctx['department']}\n"
        f"- **Ward**: {ctx['ward']['ward_name']} ({ctx['ward']['zone_name']})\n"
        f"- **Priority Score**: {ctx.get('priority_score')}/100\n"
        f"- **Complaints**: {s.get('complaint_count', 1)} over {int(s.get('oldest_open_days', 0))} days\n"
        f"- **Evidence**: {ctx.get('evidence')}\n\n"
        f"## Score breakdown\n`{ctx.get('components')}`\n"
    )
    report_path.write_text(body, encoding="utf-8")
    ctx["_sum_report_generator"] = report_path.name
    set_key(record, "stage6_act.report_ref", str(report_path.name))


def feedback_looper(record: dict, ctx: dict) -> None:
    code = ctx["tracking_code"]
    ctx["_sum_feedback_looper"] = f"tracking {code}"
    set_key(record, "stage6_act.tracking_code", code)


def transparency_publisher(record: dict, ctx: dict) -> None:
    ctx["_sum_transparency_publisher"] = "public ledger entry"
    set_key(record, "stage6_act.public_transparency_entry", True)


AGENTS = {
    "department_router": department_router,
    "notifier": notifier,
    "report_generator": report_generator,
    "feedback_looper": feedback_looper,
    "transparency_publisher": transparency_publisher,
}


async def run_all(record: dict, ctx: dict) -> None:
    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, 6, record, ctx, fn) for name, fn in AGENTS.items()
    ])
