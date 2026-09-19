"""Geo helpers: Haversine distance, point clustering, density."""
from __future__ import annotations

import math


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def cluster_points(
    points: list[dict], radius_m: float = 300.0
) -> list[list[dict]]:
    """Greedy centroid clustering (DBSCAN-lite). Each point: {lat, lng, ...}.

    Points join the first cluster whose running centroid is within radius_m;
    otherwise they seed a new cluster. Deterministic given input order.
    """
    clusters: list[list[dict]] = []
    for pt in points:
        placed = False
        for cluster in clusters:
            clat = sum(p["lat"] for p in cluster) / len(cluster)
            clng = sum(p["lng"] for p in cluster) / len(cluster)
            if haversine_m(clat, clng, pt["lat"], pt["lng"]) <= radius_m:
                cluster.append(pt)
                placed = True
                break
        if not placed:
            clusters.append([pt])
    return clusters


def density_per_km2(points: list[dict], radius_m: float = 250.0) -> float:
    """Complaint count normalized by the cluster footprint area."""
    area_km2 = max(math.pi * (radius_m / 1000) ** 2, 0.01)
    return round(len(points) / area_km2, 2)
