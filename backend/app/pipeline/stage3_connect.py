"""Stage 3 — Connection agents (6): embeddings, similarity, duplicates, temporal, label."""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Callable

from app.schemas.shared_record import set_key
from app.services import embeddings as emb
from app.services import gemini_service, geo

SIMILARITY_THRESHOLD = 0.82
DUP_RADIUS_M = 300


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


def _recent_complaints(ctx: dict) -> list[dict]:
    """Recent processed complaints (14d) for similarity — loaded lazily via ctx loader."""
    if "recent" not in ctx:
        ctx["recent"] = ctx["load_recent_complaints"]()
    return ctx["recent"]


def embedder(record: dict, ctx: dict) -> None:
    vec = emb.embed(ctx.get("text", "") or (ctx.get("standardized_summary") or ""))
    ctx["embedding"] = vec
    ctx["_sum_embedder"] = f"{emb.DIM}-d vector"
    set_key(record, "stage3_connect.embedding", vec[:16] + ["..."])


def similarity_engine(record: dict, ctx: dict) -> None:
    vec = ctx["embedding"]
    scored = []
    for c in _recent_complaints(ctx):
        scored.append({"complaint_id": c["id"], "similarity": round(emb.cosine(vec, c["embedding"]), 3)})
    scored.sort(key=lambda x: -x["similarity"])
    ctx["similarities"] = scored[:10]
    top = scored[0] if scored else None
    ctx["top_similarity"] = top
    ctx["_sum_similarity_engine"] = f"top={top['similarity']}" if top else "no history"
    set_key(record, "stage3_connect.similarities", scored[:5])


def duplicate_merger(record: dict, ctx: dict) -> None:
    top = ctx.get("top_similarity")
    duplicate_of = None
    merged_into = None
    if top and top["similarity"] >= SIMILARITY_THRESHOLD:
        match = next((c for c in _recent_complaints(ctx) if c["id"] == top["complaint_id"]), None)
        if match:
            from app.services.geo import haversine_m

            d = haversine_m(ctx["payload"]["lat"], ctx["payload"]["lng"], match["lat"], match["lng"])
            if d <= DUP_RADIUS_M and match["category"] == ctx.get("category"):
                duplicate_of = match["id"]
                merged_into = match.get("cluster_id")
    ctx["duplicate_of"] = duplicate_of
    ctx["merged_into_cluster"] = merged_into
    ctx["_sum_duplicate_merger"] = f"dup_of={duplicate_of}"
    set_key(record, "stage3_connect.duplicate_of", duplicate_of)
    set_key(record, "stage3_connect.merged_into_cluster", merged_into)


def cross_channel_linker(record: dict, ctx: dict) -> None:
    top = ctx.get("top_similarity")
    matches = 0
    if top:
        match = next((c for c in _recent_complaints(ctx) if c["id"] == top["complaint_id"]), None)
        if match and match.get("channel") != ctx["payload"].get("channel"):
            matches = 1
    ctx["_sum_cross_channel_linker"] = f"{matches} cross-channel"
    set_key(record, "stage3_connect.cross_channel_matches", matches)


def temporal_analyzer(record: dict, ctx: dict) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    same_area = [
        c for c in _recent_complaints(ctx)
        if c["category"] == ctx.get("category")
        and datetime.fromisoformat(c["created_at"]).replace(tzinfo=timezone.utc) >= cutoff
        and geo.haversine_m(ctx["payload"]["lat"], ctx["payload"]["lng"], c["lat"], c["lng"]) <= 300
    ]
    count = len(same_area) + 1  # include this submission
    last_48h = sum(
        1 for c in same_area
        if datetime.fromisoformat(c["created_at"]).replace(tzinfo=timezone.utc)
        >= datetime.now(timezone.utc) - timedelta(hours=48)
    ) + 1
    trend_pct = round(last_48h / max(count, 1) * 100)
    trend = {"window_days": 14, "count": count, "last_48h": last_48h,
             "accelerating": last_48h >= 3, "trend_pct": trend_pct}
    ctx["temporal"] = trend
    ctx["_sum_temporal_analyzer"] = f"{count} in 14d, +{trend_pct}%"
    set_key(record, "stage3_connect.temporal_trend", trend)


def cluster_labeler(record: dict, ctx: dict) -> None:
    place = (ctx.get("landmarks") or ["the reported location"])[0]
    subcat = ctx.get("category", "Civic issue")
    fallback = f"Recurring {subcat.split(' & ')[0].lower()} cluster near {place}"
    brief = gemini_service.synthesize_cluster_brief(
        [ctx.get("text", "")], fallback
    )
    label = (brief or {}).get("hotspot_title") or fallback
    ctx["cluster_label"] = label
    ctx["_sum_cluster_labeler"] = label
    set_key(record, "stage3_connect.cluster_label", label)


AGENTS = {
    "embedder": embedder,
    "similarity_engine": similarity_engine,
    "duplicate_merger": duplicate_merger,
    "cross_channel_linker": cross_channel_linker,
    "temporal_analyzer": temporal_analyzer,
    "cluster_labeler": cluster_labeler,
}


async def run_all(record: dict, ctx: dict) -> None:
    # Pre-load recent complaints synchronously to prevent concurrent session access
    if "recent" not in ctx and "load_recent_complaints" in ctx:
        ctx["recent"] = ctx["load_recent_complaints"]()
    # Embedder must run before similarity engine
    _agent("embedder", 3, record, ctx, embedder)
    _agent("similarity_engine", 3, record, ctx, similarity_engine)
    # Remaining agents can run concurrently
    rest = ["duplicate_merger", "cross_channel_linker", "temporal_analyzer", "cluster_labeler"]
    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, 3, record, ctx, AGENTS[name])
        for name in rest
    ])
