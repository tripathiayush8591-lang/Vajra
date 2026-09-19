"""Explainable priority engine (Stage 5 math).

score = severity(25) + frequency(20) + population(15) + recency(15)
        + concentration(15) - trust_discount, clamped 0..100.

Population normalization is the EQUITY term: complaints per 10k residents, so a
low-income ward's 5 reports can outrank a commercial hub's 15.
"""
from __future__ import annotations

from datetime import datetime, timezone

HEALTH_HAZARD_CATEGORIES = {
    "Drainage & Sewage", "Water Supply & Leakage", "Public Safety & Hazards",
}


def _norm(value: float, lo: float, hi: float) -> float:
    return max(0.0, min(1.0, (value - lo) / (hi - lo)))


def compute_components(
    *,
    avg_severity: float,
    complaint_count: int,
    population: int,
    oldest_open_days: float,
    radius_m: float,
    duplicate_ratio: float = 0.0,
    same_phone_burst: bool = False,
    last_48h: int = 0,
    category: str = "",
) -> dict:
    # Health-hazard categories (sewage, water, safety) hit harder — capped at 25.
    sev_raw = _norm(avg_severity, 1, 5)
    if category in HEALTH_HAZARD_CATEGORIES:
        sev_raw = min(1.0, sev_raw * 1.2)
    severity = round(sev_raw * 25, 1)

    # linear frequency: 12+ reports saturate the 20-point band
    frequency = round(min(20.0, complaint_count / 12 * 20), 1)

    complaints_per_10k = complaint_count / max(population, 1) * 10_000
    population_pts = round(_norm(complaints_per_10k, 0, 6) * 15, 1)

    recency = round(min(15.0, oldest_open_days / 10 * 15 + min(5.0, last_48h)), 1)

    concentration = round(max(0.0, 1.0 - min(radius_m, 500) / 500) * 15, 1)

    trust_discount = 0.0
    if duplicate_ratio > 0.5:
        trust_discount -= 5.0
    if same_phone_burst:
        trust_discount -= 3.0

    return {
        "severity": severity,
        "frequency": frequency,
        "population": population_pts,
        "recency": recency,
        "concentration": concentration,
        "trust_discount": trust_discount,
    }


def aggregate(components: dict) -> float:
    total = sum(v for v in components.values() if isinstance(v, (int, float)))
    return round(max(0.0, min(100.0, total)), 1)


def fallback_evidence(components: dict, score: float, *, count: int, days: int, place: str, category: str) -> str:
    return (
        f"Ranked {score:.0f}/100: {count} {category.lower()} reports in {place} over "
        f"{days} days (severity {components['severity']:.0f}/25, equity-weighted population "
        f"impact {components['population']:.0f}/15, surge-adjusted recency {components['recency']:.0f}/15)."
    )


def days_since(dt: datetime) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
