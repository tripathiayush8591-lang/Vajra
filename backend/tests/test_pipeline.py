"""Stage-level and end-to-end pipeline tests (offline — no API key needed)."""
import os

os.environ["OFFLINE_MODE"] = "true"
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test_civicpulse.db")

import pytest
from fastapi.testclient import TestClient

from app.config import settings
settings.OFFLINE_MODE = True

from app.main import app
from app.schemas.shared_record import AGENT_REGISTRY, assert_no_collision
from app.services import embeddings as emb
from app.services import geo, priority_engine


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_zero_key_collision():
    assert_no_collision()  # raises on any collision


def test_registry_has_39_pipeline_agents():
    assert len(AGENT_REGISTRY) == 39


def test_embeddings_cluster_same_topic():
    pothole_a = emb.embed("Big pothole on the road near market, bike slipped")
    pothole_b = emb.embed("Road pothole very dangerous for two-wheelers near market")
    water = emb.embed("Water pipeline leaking, contaminated water supply")
    same = emb.cosine(pothole_a, pothole_b)
    diff = emb.cosine(pothole_a, water)
    assert same > diff
    assert same > 0.5


def test_haversine_and_clustering():
    d = geo.haversine_m(22.7533, 75.8937, 22.7534, 75.8938)  # ~15m
    assert 10 < d < 25
    pts = [{"lat": 22.75, "lng": 75.89}, {"lat": 22.7501, "lng": 75.8901},
           {"lat": 22.80, "lng": 75.95}]
    clusters = geo.cluster_points(pts, radius_m=300)
    assert len(clusters) == 2


def test_priority_score_bounded_and_explainable():
    comps = priority_engine.compute_components(
        avg_severity=4.5, complaint_count=14, population=42000,
        oldest_open_days=20, radius_m=200,
    )
    score = priority_engine.aggregate(comps)
    assert 0 <= score <= 100
    assert score > 50  # strong cluster should rank high
    assert comps["trust_discount"] <= 0


def test_population_norm_equity():
    """Poor small ward with fewer complaints can outweigh rich big ward."""
    poor = priority_engine.compute_components(
        avg_severity=4, complaint_count=5, population=10000,
        oldest_open_days=10, radius_m=200,
    )
    rich = priority_engine.compute_components(
        avg_severity=4, complaint_count=15, population=80000,
        oldest_open_days=10, radius_m=200,
    )
    assert poor["population"] > rich["population"]


def test_full_submission_runs_all_39_agents(client):
    resp = client.post("/api/v1/complaints/submit", data={
        "channel": "voice",
        "text": "Palasia square ke paas naali ka paani sadak par beh raha hai, bahut badboo. Sewage overflow near Palasia Square.",
        "lat": "22.7533", "lng": "75.8937", "phone": "9826012345",
    })
    assert resp.status_code == 201
    sid = resp.json()["submission_id"]

    trace = client.get(f"/api/v1/pipeline/{sid}").json()
    assert trace["status"] == "done"
    agents = [a for s in trace["stages"] for a in s["agents"]]
    assert len(agents) == 39
    assert all(a["status"] == "ok" for a in agents)
    assert len(trace["stages"]) == 6

    rec = trace["record"]
    assert rec["stage2_understand"]["category"]
    assert rec["stage4_locate"]["ward"]["ward_name"]
    assert 0 <= rec["stage5_prioritize"]["priority_score"] <= 100
    assert rec["stage6_act"]["tracking_code"]


def test_hotspots_and_geojson(client):
    hs = client.get("/api/v1/hotspots").json()["hotspots"]
    assert len(hs) >= 1
    top = hs[0]
    assert 0 <= top["priority_score"] <= 100
    assert top["components"]
    gj = client.get("/api/v1/hotspots/geojson").json()
    assert gj["type"] == "FeatureCollection"


def test_whatif_slider(client):
    hs = client.get("/api/v1/hotspots").json()["hotspots"][0]
    w = client.post(f"/api/v1/hotspots/{hs['id']}/whatif",
                    json={"resolved_complaints": hs["complaint_count"] // 2}).json()
    assert w["hypothetical_score"] < w["current_score"]


def test_tracking_code_lookup(client):
    hs = client.get("/api/v1/hotspots").json()["hotspots"][0]
    assert client.get(f"/api/v1/hotspots/{hs['id']}").status_code == 200


def test_rate_guard(client):
    resp = client.post("/api/v1/complaints/submit", data={
        "text": "Street light nahi jal rahi near Vijay Nagar", "lat": "22.7585", "lng": "75.8934",
    })
    assert resp.status_code == 201
