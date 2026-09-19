"""Shared record contract: every pipeline agent writes ONLY to its declared keys.

The registry below is the machine-checkable version of context/AGENT_REGISTRY.md.
The orchestrator asserts at registration time that no two agents in the same stage
write the same key.
"""
from __future__ import annotations

from typing import Any

# agent_name -> {"stage": int, "writes": set[str], "kind": "det"|"llm"}
AGENT_REGISTRY: dict[str, dict[str, Any]] = {
    # Stage 1 — Input (6, det)
    "text_ingest": {"stage": 1, "writes": {"stage1_input.raw_text"}, "kind": "det"},
    "voice_ingest": {"stage": 1, "writes": {"stage1_input.audio_blob_ref"}, "kind": "det"},
    "photo_ingest": {"stage": 1, "writes": {"stage1_input.photo_blob_ref"}, "kind": "det"},
    "messaging_ingest": {"stage": 1, "writes": {"stage1_input.normalized_payload"}, "kind": "det"},
    "input_validator": {"stage": 1, "writes": {"stage1_input.input_valid", "stage1_input.rejection_reason"}, "kind": "det"},
    "rate_guard": {"stage": 1, "writes": {"stage1_input.rate_limited"}, "kind": "det"},
    # Stage 2 — Understand (9, llm fan-out from one batched call)
    "transcriber": {"stage": 2, "writes": {"stage2_understand.transcript"}, "kind": "llm"},
    "language_detector": {"stage": 2, "writes": {"stage2_understand.detected_language"}, "kind": "det"},
    "image_captioner": {"stage": 2, "writes": {"stage2_understand.image_caption"}, "kind": "llm"},
    "image_verifier": {"stage": 2, "writes": {"stage2_understand.image_relevant"}, "kind": "llm"},
    "intent_classifier": {"stage": 2, "writes": {"stage2_understand.category"}, "kind": "llm"},
    "subcategory_tagger": {"stage": 2, "writes": {"stage2_understand.subcategory"}, "kind": "llm"},
    "location_extractor": {"stage": 2, "writes": {"stage2_understand.extracted_location"}, "kind": "llm"},
    "severity_assessor": {"stage": 2, "writes": {"stage2_understand.severity"}, "kind": "llm"},
    "understanding_validator": {"stage": 2, "writes": {"stage2_understand.urgency", "stage2_understand.sentiment", "stage2_understand.understanding_valid"}, "kind": "det"},
    # Stage 3 — Connect (5 det, 1 llm)
    "embedder": {"stage": 3, "writes": {"stage3_connect.embedding"}, "kind": "det"},
    "similarity_engine": {"stage": 3, "writes": {"stage3_connect.similarities"}, "kind": "det"},
    "duplicate_merger": {"stage": 3, "writes": {"stage3_connect.duplicate_of", "stage3_connect.merged_into_cluster"}, "kind": "det"},
    "cross_channel_linker": {"stage": 3, "writes": {"stage3_connect.cross_channel_matches"}, "kind": "det"},
    "temporal_analyzer": {"stage": 3, "writes": {"stage3_connect.temporal_trend"}, "kind": "det"},
    "cluster_labeler": {"stage": 3, "writes": {"stage3_connect.cluster_label"}, "kind": "llm"},
    # Stage 4 — Locate (5 det)
    "ward_aggregator": {"stage": 4, "writes": {"stage4_locate.ward"}, "kind": "det"},
    "density_calculator": {"stage": 4, "writes": {"stage4_locate.density"}, "kind": "det"},
    "hotspot_detector": {"stage": 4, "writes": {"stage4_locate.is_hotspot", "stage4_locate.hotspot_threshold"}, "kind": "det"},
    "boundary_mapper": {"stage": 4, "writes": {"stage4_locate.boundary"}, "kind": "det"},
    "geoviz_builder": {"stage": 4, "writes": {"stage4_locate.geo_viz"}, "kind": "det"},
    # Stage 5 — Prioritize (7 det, 1 llm)
    "severity_weight": {"stage": 5, "writes": {"stage5_prioritize.components.severity"}, "kind": "det"},
    "frequency_weight": {"stage": 5, "writes": {"stage5_prioritize.components.frequency"}, "kind": "det"},
    "population_norm": {"stage": 5, "writes": {"stage5_prioritize.components.population"}, "kind": "det"},
    "recency_weight": {"stage": 5, "writes": {"stage5_prioritize.components.recency"}, "kind": "det"},
    "geo_concentration": {"stage": 5, "writes": {"stage5_prioritize.components.concentration"}, "kind": "det"},
    "anomaly_adjuster": {"stage": 5, "writes": {"stage5_prioritize.components.trust_discount"}, "kind": "det"},
    "score_aggregator": {"stage": 5, "writes": {"stage5_prioritize.priority_score"}, "kind": "det"},
    "evidence_compiler": {"stage": 5, "writes": {"stage5_prioritize.evidence"}, "kind": "llm"},
    # Stage 6 — Act (1 llm, 4 det)
    "department_router": {"stage": 6, "writes": {"stage6_act.department"}, "kind": "det"},
    "notifier": {"stage": 6, "writes": {"stage6_act.notification"}, "kind": "det"},
    "report_generator": {"stage": 6, "writes": {"stage6_act.report_ref"}, "kind": "llm"},
    "feedback_looper": {"stage": 6, "writes": {"stage6_act.tracking_code"}, "kind": "det"},
    "transparency_publisher": {"stage": 6, "writes": {"stage6_act.public_transparency_entry"}, "kind": "det"},
}

STAGE_NAMES = {1: "Input", 2: "Understand", 3: "Connect", 4: "Locate", 5: "Prioritize", 6: "Act"}

STAGES: dict[int, list[str]] = {}
for _name, _meta in AGENT_REGISTRY.items():
    STAGES.setdefault(_meta["stage"], []).append(_name)

for _stage_agents in STAGES.values():
    _stage_agents.sort()


def assert_no_collision() -> None:
    """Fail fast if two agents in the same stage write the same key."""
    for stage, agents in STAGES.items():
        seen: dict[str, str] = {}
        for agent in agents:
            for key in AGENT_REGISTRY[agent]["writes"]:
                if key in seen:
                    raise RuntimeError(
                        f"Key collision in stage {stage}: '{key}' written by both "
                        f"'{seen[key]}' and '{agent}'"
                    )
                seen[key] = agent


assert_no_collision()


def new_record(submission_id: str, channel: str) -> dict[str, Any]:
    """Fresh shared record with every stage's key namespace pre-created."""
    return {
        "submission_id": submission_id,
        "received_at": None,
        "channel": channel,
        "stage1_input": {},
        "stage2_understand": {},
        "stage3_connect": {},
        "stage4_locate": {},
        "stage5_prioritize": {"components": {}},
        "stage6_act": {},
        "trace": [],
    }


def set_key(record: dict[str, Any], key: str, value: Any) -> None:
    """Write a dotted key like 'stage5_prioritize.components.severity'."""
    parts = key.split(".")
    node = record
    for part in parts[:-1]:
        node = node.setdefault(part, {})
    node[parts[-1]] = value
