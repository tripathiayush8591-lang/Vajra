"""Stage 5 — Prioritize agents (8): explainable, equity-weighted 0–100 score."""
from __future__ import annotations

import asyncio
import time
from typing import Callable

from app.schemas.shared_record import set_key
from app.services import gemini_service, priority_engine


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


def _inputs(ctx: dict) -> dict:
    """Shared scoring inputs (loaded once by severity_weight, first in stage order)."""
    if "score_inputs" not in ctx:
        hotspot_ctx = ctx["load_hotspot_context"]()
        ctx["score_inputs"] = hotspot_ctx
    return ctx["score_inputs"]


def severity_weight(record: dict, ctx: dict) -> None:
    s = _inputs(ctx)
    comp = priority_engine.compute_components(
        avg_severity=s["avg_severity"], complaint_count=s["complaint_count"],
        population=s["population"], oldest_open_days=s["oldest_open_days"],
        radius_m=s["radius_m"], duplicate_ratio=s["duplicate_ratio"],
        same_phone_burst=s["same_phone_burst"],
        last_48h=s.get("last_48h", 0), category=s.get("category", ""),
    )
    ctx["components"] = comp
    ctx["_sum_severity_weight"] = f"{comp['severity']}/25"
    set_key(record, "stage5_prioritize.components.severity", comp["severity"])


def frequency_weight(record: dict, ctx: dict) -> None:
    ctx["_sum_frequency_weight"] = f"{ctx['components']['frequency']}/20"
    set_key(record, "stage5_prioritize.components.frequency", ctx["components"]["frequency"])


def population_norm(record: dict, ctx: dict) -> None:
    ctx["_sum_population_norm"] = f"{ctx['components']['population']}/15 (equity)"
    set_key(record, "stage5_prioritize.components.population", ctx["components"]["population"])


def recency_weight(record: dict, ctx: dict) -> None:
    ctx["_sum_recency_weight"] = f"{ctx['components']['recency']}/15"
    set_key(record, "stage5_prioritize.components.recency", ctx["components"]["recency"])


def geo_concentration(record: dict, ctx: dict) -> None:
    ctx["_sum_geo_concentration"] = f"{ctx['components']['concentration']}/15"
    set_key(record, "stage5_prioritize.components.concentration", ctx["components"]["concentration"])


def anomaly_adjuster(record: dict, ctx: dict) -> None:
    ctx["_sum_anomaly_adjuster"] = f"{ctx['components']['trust_discount']}"
    set_key(record, "stage5_prioritize.components.trust_discount", ctx["components"]["trust_discount"])


def score_aggregator(record: dict, ctx: dict) -> None:
    score = priority_engine.aggregate(ctx["components"])
    ctx["priority_score"] = score
    ctx["_sum_score_aggregator"] = f"{score}/100"
    set_key(record, "stage5_prioritize.priority_score", score)


def evidence_compiler(record: dict, ctx: dict) -> None:
    s = ctx["score_inputs"]
    narrative = gemini_service.generate_evidence({
        "score": ctx["priority_score"], "category": ctx.get("category"),
        "ward": ctx["ward"]["ward_name"], "complaint_count": s["complaint_count"],
        "avg_severity": s["avg_severity"], "temporal": ctx.get("temporal"),
        "components": ctx["components"],
    })
    if not narrative:
        narrative = priority_engine.fallback_evidence(
            ctx["components"], ctx["priority_score"],
            count=s["complaint_count"], days=int(s["oldest_open_days"]),
            place=ctx["ward"]["ward_name"], category=ctx.get("category", "civic"),
        )
    ctx["evidence"] = narrative
    ctx["_sum_evidence_compiler"] = narrative[:60] + "..."
    set_key(record, "stage5_prioritize.evidence", narrative)


AGENTS = {
    "severity_weight": severity_weight,
    "frequency_weight": frequency_weight,
    "population_norm": population_norm,
    "recency_weight": recency_weight,
    "geo_concentration": geo_concentration,
    "anomaly_adjuster": anomaly_adjuster,
    "score_aggregator": score_aggregator,
    "evidence_compiler": evidence_compiler,
}

_ORDER = ["severity_weight", "score_aggregator"]  # seed components, then the total


async def run_all(record: dict, ctx: dict) -> None:
    for name in _ORDER:
        await asyncio.to_thread(_agent, name, 5, record, ctx, AGENTS[name])
    rest = {k: v for k, v in AGENTS.items() if k not in _ORDER}
    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, 5, record, ctx, fn) for name, fn in rest.items()
    ])
