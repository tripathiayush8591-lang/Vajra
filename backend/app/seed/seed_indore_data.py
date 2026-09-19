"""Seeds Indore wards + 25+ realistic grievances, including the demo's 48h surge cluster.

Run automatically on first startup, or manually: `python -m app.seed.seed_indore_data`.
All processing uses the offline rule engine (no API key needed for seeding).
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AdminAction, Complaint, Hotspot, Ward
from app.services import geo, priority_engine

WARDS = [
    # ward_number, name, zone, lat, lng, population, infra_gap
    (3, "Palasia", "Zone 3", 22.7533, 75.8937, 42000, 0.45),
    (5, "Rajwada", "Zone 1", 22.7196, 75.8577, 51000, 0.72),
    (18, "Bhawarkuan", "Zone 7", 22.7248, 75.8839, 38000, 0.61),
    (24, "Vijay Nagar", "Zone 4", 22.7585, 75.8934, 58000, 0.38),
    (33, "Sudama Nagar", "Zone 6", 22.7103, 75.8699, 36000, 0.68),
    (44, "Annapurna Road", "Zone 8", 22.7041, 75.8613, 31000, 0.59),
    (56, "Scheme 78", "Zone 9", 22.7396, 75.9088, 29000, 0.33),
    (71, "Nipania", "Zone 12", 22.7716, 75.9076, 27000, 0.47),
]

CATEGORIES = {
    "Roads & Potholes": ["Pothole", "Broken Pavement", "Speed breaker damaged"],
    "Water Supply & Leakage": ["Pipeline Leak", "Contaminated Water", "Low Pressure"],
    "Sanitation & Waste Management": ["Garbage Overflow", "Illegal Dumping", "Dead Animal"],
    "Drainage & Sewage": ["Sewage Overflow", "Blocked Drain", "Open Manhole"],
    "Street Lighting": ["Light Not Working", "Flickering Light", "Pole Damaged"],
    "Public Safety & Hazards": ["Live Wire Hazard", "Open Pit", "Wall Collapse"],
    "Encroachment & Traffic Obstruction": ["Vendor Encroachment", "Illegal Parking"],
}

SAMPLES = {
    "Roads & Potholes": "Bade gaddha sadak mein hai, bike slide ho gayi thi kal. Road pothole near the market road, very dangerous for two-wheelers.",
    "Water Supply & Leakage": "Pipeline leak ho gaya, paani poore din barbaad ho raha hai. Water pipeline leaking since morning near the main road.",
    "Sanitation & Waste Management": "Kachra 3 din se nahi uthaya, badboo aa rahi hai. Garbage not collected for three days, strong stink in the lane.",
    "Drainage & Sewage": "Naali ka paani sadak par beh raha hai. Sewage water overflowing onto the street, health hazard for children.",
    "Street Lighting": "Street light pichle hafte se nahi jal rahi, raat ko poora andhera. Light not working for a week, unsafe at night.",
    "Public Safety & Hazards": "Electric wire latka hua hai, bahut khatarnak. Live wire hanging low over the footpath, extremely dangerous.",
    "Encroachment & Traffic Obstruction": "Footpath pe vendors ne poora raasta block kar diya. Footpath fully encroached, pedestrians forced onto the road.",
}

SURGE_CLUSTER = {
    "ward_number": 3,  # Palasia
    "category": "Drainage & Sewage",
    "text": "Palasia square ke paas do din se naali ka paani sadak par beh raha hai aur bahut badboo aa rahi hai. Sewage overflowing near Palasia Square, unbearable smell.",
    "count": 12,
}

NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Neha", "Arjun", "Kavita", "Rohit", "Anjali"]


def seed(db: Session) -> None:
    random.seed(42)  # deterministic demo data
    now = datetime.now(timezone.utc)

    wards: dict[int, Ward] = {}
    for num, name, zone, lat, lng, pop, gap in WARDS:
        w = Ward(ward_number=num, ward_name=name, zone_name=zone, latitude=lat,
                 longitude=lng, population_estimate=pop, infra_gap_index=gap)
        db.add(w)
        wards[num] = w
    db.commit()

    seq = 4000
    made: list[Complaint] = []

    def add_complaint(ward: Ward, category: str, subcat: str, text: str,
                      lat: float, lng: float, sev: int, age_hours: float,
                      channel: str = "text") -> Complaint:
        nonlocal seq
        seq += 1
        c = Complaint(
            tracking_code=f"CP-IND-{seq}", submission_id=f"SEED-{seq}", channel=channel,
            raw_text=text, original_language="Hinglish",
            standardized_summary=text[:280], category=category, subcategory=subcat,
            severity_score=sev, urgency_level={1: "Low", 2: "Low", 3: "Medium", 4: "High", 5: "Emergency"}[sev],
            latitude=lat, longitude=lng, ward_id=ward.id, status=random.choice(["Reported", "Reported", "Under Review", "Work Scheduled", "Resolved"]),
            citizen_phone_masked=None,
            created_at=now - timedelta(hours=age_hours),
            updated_at=now - timedelta(hours=age_hours / 2),
            ai_metadata={"duplicate": False, "landmarks": [], "temporal": None},
        )
        db.add(c)
        made.append(c)
        return c

    # --- The demo surge cluster: 12 sewage complaints near Palasia Square, 1h-96h old ---
    palasia = wards[3]
    for i in range(SURGE_CLUSTER["count"]):
        jitter_lat = palasia.latitude + random.uniform(-0.0012, 0.0012)
        jitter_lng = palasia.longitude + random.uniform(-0.0012, 0.0012)
        add_complaint(palasia, SURGE_CLUSTER["category"], "Sewage Overflow",
                      SURGE_CLUSTER["text"], jitter_lat, jitter_lng,
                      sev=random.choice([4, 4, 5]), age_hours=random.uniform(1, 96),
                      channel=random.choice(["text", "voice", "photo", "messaging"]))

    # --- Tight demo mini-clusters (each forms its own hotspot) ---
    mini_clusters = [
        (wards[24], "Roads & Potholes", "Pothole", 4, 5, 22.7585, 75.8934),
        (wards[5], "Sanitation & Waste Management", "Garbage Overflow", 3, 4, 22.7196, 75.8577),
        (wards[18], "Water Supply & Leakage", "Pipeline Leak", 4, 6, 22.7248, 75.8839),
    ]
    for ward, cat, subcat, sev, n, clat, clng in mini_clusters:
        for _ in range(n):
            add_complaint(ward, cat, subcat, SAMPLES[cat],
                          clat + random.uniform(-0.0008, 0.0008),
                          clng + random.uniform(-0.0008, 0.0008),
                          sev=sev, age_hours=random.uniform(6, 240),
                          channel=random.choice(["text", "voice", "photo"]))

    # --- 14 scattered single grievances across wards/categories, up to 30 days old ---
    for _ in range(14):
        ward = random.choice(list(wards.values()))
        category = random.choice(list(CATEGORIES.keys()))
        subcat = random.choice(CATEGORIES[category])
        sev = random.choices([1, 2, 3, 4, 5], weights=[1, 2, 4, 3, 1])[0]
        add_complaint(
            ward, category, subcat, SAMPLES[category],
            ward.latitude + random.uniform(-0.004, 0.004),
            ward.longitude + random.uniform(-0.004, 0.004),
            sev, age_hours=random.uniform(2, 30 * 24),
            channel=random.choice(["text", "voice", "photo", "messaging"]),
        )
    db.commit()

    # --- Build hotspots: cluster by (ward, category), radius 400m, threshold 3 ---
    for ward in wards.values():
        ward_rows = [c for c in made if c.ward_id == ward.id]
        by_cat: dict[str, list[Complaint]] = {}
        for c in ward_rows:
            by_cat.setdefault(c.category, []).append(c)
        for category, rows in by_cat.items():
            clusters = geo.cluster_points(
                [{"lat": c.latitude, "lng": c.longitude, "c": c} for c in rows], radius_m=400
            )
            for cluster in clusters:
                if len(cluster) < 3:
                    continue
                pts = [p["c"] for p in cluster]
                clat = sum(c.latitude for c in pts) / len(pts)
                clng = sum(c.longitude for c in pts) / len(pts)
                radius = max([geo.haversine_m(clat, clng, c.latitude, c.longitude) for c in pts] + [150.0])
                avg_sev = sum(c.severity_score for c in pts) / len(pts)
                oldest = max(priority_engine.days_since(c.created_at) for c in pts)
                recent = sum(1 for c in pts if (now - c.created_at.replace(tzinfo=timezone.utc)).total_seconds() < 48 * 3600)
                temporal = {"window_days": 14, "count": len(pts), "last_48h": recent,
                            "accelerating": recent >= 3,
                            "trend_pct": round(recent * 100 / max(len(pts), 1))}
                comps = priority_engine.compute_components(
                    avg_severity=avg_sev, complaint_count=len(pts),
                    population=ward.population_estimate, oldest_open_days=oldest,
                    radius_m=radius, last_48h=recent, category=category,
                )
                score = priority_engine.aggregate(comps)
                h = Hotspot(
                    title=f"Recurring {category.split(' & ')[0].lower()} cluster near {ward.ward_name}",
                    ward_id=ward.id, category=category,
                    centroid_lat=clat, centroid_lng=clng, radius_meters=round(radius),
                    complaint_count=len(pts), avg_severity=round(avg_sev, 2),
                    priority_score=score, score_breakdown=comps,
                    ai_summary=priority_engine.fallback_evidence(
                        comps, score, count=len(pts), days=int(oldest),
                        place=ward.ward_name, category=category),
                    temporal=temporal, status="Active",
                )
                db.add(h)
                db.flush()
                for c in pts:
                    c.cluster_id = h.id
    db.commit()

    # --- One pre-existing admin action for the top hotspot ---
    top = db.execute(select(Hotspot).order_by(Hotspot.priority_score.desc())).scalars().first()
    if top:
        db.add(AdminAction(hotspot_id=top.id, action_type="INSPECTION_ORDERED",
                           notes="Field team dispatched to verify sewage overflow.",
                           officer_name="Ward Officer " + random.choice(NAMES)))
        db.commit()

    print(f"Seeded {len(WARDS)} wards, {len(made)} complaints, "
          f"{db.query(Hotspot).count()} hotspots.")


if __name__ == "__main__":
    from app.database import SessionLocal, init_db

    init_db()
    with SessionLocal() as session:
        seed(session)
