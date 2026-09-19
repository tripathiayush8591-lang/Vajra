"""Stage 4 — Locate agents (5): ward aggregation, density, hotspot, boundary, GeoJSON."""
from __future__ import annotations

import asyncio
import time
from typing import Callable

from app.schemas.shared_record import set_key
from app.services import geo

HOTSPOT_THRESHOLD = 3


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


def ward_aggregator(record: dict, ctx: dict) -> None:
    ward = ctx["resolve_ward"]()  # loader provided by orchestrator
    ctx["ward"] = ward
    ctx["_sum_ward_aggregator"] = f"Ward {ward['ward_number']} {ward['ward_name']}"
    set_key(record, "stage4_locate.ward", ward)


def density_calculator(record: dict, ctx: dict) -> None:
    area = geo.density_per_km2(
        [{"lat": ctx["payload"]["lat"], "lng": ctx["payload"]["lng"]}],
        radius_m=250.0,
    )
    same_area = ctx.get("temporal", {}).get("count", 1)
    density = round(same_area / max(area, 0.2), 1)
    ctx["_sum_density_calculator"] = f"{density}/km²"
    set_key(record, "stage4_locate.density", density)


def hotspot_detector(record: dict, ctx: dict) -> None:
    count = ctx.get("temporal", {}).get("count", 1)
    is_hotspot = count >= HOTSPOT_THRESHOLD
    ctx["is_hotspot"] = is_hotspot
    ctx["_sum_hotspot_detector"] = f"{count}>={HOTSPOT_THRESHOLD}: {is_hotspot}"
    set_key(record, "stage4_locate.is_hotspot", is_hotspot)
    set_key(record, "stage4_locate.hotspot_threshold", HOTSPOT_THRESHOLD)


def boundary_mapper(record: dict, ctx: dict) -> None:
    lat, lng = ctx["payload"]["lat"], ctx["payload"]["lng"]
    # include nearby same-category points from the 14d window for a tighter hull
    near = [c for c in ctx.get("recent", []) if ctx.get("category") == c["category"]]
    if near:
        from app.services.geo import haversine_m

        pts = [c for c in near if haversine_m(lat, lng, c["lat"], c["lng"]) <= 400]
    else:
        pts = []
    if pts:
        clat = (lat + sum(p["lat"] for p in pts)) / (len(pts) + 1)
        clng = (lng + sum(p["lng"] for p in pts)) / (len(pts) + 1)
        radius = max(
            [geo.haversine_m(clat, clng, p["lat"], p["lng"]) for p in pts] + [150.0]
        )
    else:
        clat, clng, radius = lat, lng, 250.0
    boundary = {"centroid": [round(clat, 6), round(clng, 6)], "radius_m": round(radius)}
    ctx["boundary"] = boundary
    ctx["_sum_boundary_mapper"] = f"r={boundary['radius_m']}m"
    set_key(record, "stage4_locate.boundary", boundary)


def geoviz_builder(record: dict, ctx: dict) -> None:
    ward = ctx["ward"]
    lat, lng = ctx["boundary"]["centroid"]
    feature = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": {
            "submission_id": ctx["submission_id"],
            "category": ctx.get("category"),
            "severity": ctx.get("severity"),
            "ward": ward["ward_name"],
            "is_hotspot": ctx.get("is_hotspot", False),
            "cluster_label": ctx.get("cluster_label"),
            "temporal": ctx.get("temporal"),
        },
    }
    ctx["_sum_geoviz_builder"] = "FeatureCollection built"
    set_key(record, "stage4_locate.geo_viz", {"type": "FeatureCollection", "features": [feature]})


AGENTS = {
    "ward_aggregator": ward_aggregator,
    "density_calculator": density_calculator,
    "hotspot_detector": hotspot_detector,
    "boundary_mapper": boundary_mapper,
    "geoviz_builder": geoviz_builder,
}


_ORDER = ["ward_aggregator", "boundary_mapper"]  # seed ward + boundary for geoviz_builder


async def run_all(record: dict, ctx: dict) -> None:
    for name in _ORDER:
        await asyncio.to_thread(_agent, name, 4, record, ctx, AGENTS[name])
    rest = {k: v for k, v in AGENTS.items() if k not in _ORDER}
    await asyncio.gather(*[
        asyncio.to_thread(_agent, name, 4, record, ctx, fn) for name, fn in rest.items()
    ])
