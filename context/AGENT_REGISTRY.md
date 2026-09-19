# CivicPulse AI — Agent Registry & Shared Record Contract

Single source of truth for all 69 agents. Each agent declares exactly which shared-record
keys it **writes**. The orchestrator asserts at registration time that no two agents in the
same stage write the same key (zero-collision contract).

Agent types:
- **DET** = deterministic Python (no LLM, offline-safe, fast)
- **LLM** = Gemini call with deterministic fallback (never blocks the pipeline)

---

## Shared Record (per grievance batch / submission)

A single JSON document flows through the pipeline. Keys are grouped by stage; agents append
to their own keys only.

```json
{
  "submission_id": "SUB-2026-0001",
  "received_at": "2026-09-06T10:00:00Z",
  "channel": "text | voice | photo | messaging",

  "stage1_input": {
    "raw_text": "...", "audio_blob_ref": null, "photo_blob_ref": null,
    "normalized_payload": {...}, "input_valid": true, "rejection_reason": null,
    "rate_limited": false
  },
  "stage2_understand": {
    "transcript": "...", "detected_language": "Hinglish",
    "image_caption": null, "image_relevant": null,
    "category": "Roads & Potholes", "subcategory": "Pothole",
    "extracted_location": {"landmarks": ["Palasia Square"], "lat": null, "lng": null},
    "severity": 4, "urgency": "High", "sentiment": "frustrated",
    "understanding_valid": true
  },
  "stage3_connect": {
    "embedding": [0.1, "..."], "similarities": [...],
    "duplicate_of": null, "merged_into_cluster": 12,
    "cross_channel_matches": 2, "temporal_trend": {"window_days": 14, "count": 9, "accelerating": true},
    "cluster_label": "Recurring pothole cluster near Palasia Square"
  },
  "stage4_locate": {
    "ward": {"id": 3, "name": "Palasia", "zone": "Zone 3"},
    "density": 14.2, "is_hotspot": true, "hotspot_threshold": 3,
    "boundary": {"centroid": [22.7533, 75.8937], "radius_m": 250},
    "geo_viz": {"type": "FeatureCollection", "features": []}
  },
  "stage5_prioritize": {
    "components": {"severity": 22, "frequency": 20, "population": 12, "recency": 15, "concentration": 14, "trust_discount": -3},
    "priority_score": 80,
    "evidence": "Ranked 80/100 due to surge of 14 complaints in 48h near a school transit route."
  },
  "stage6_act": {
    "department": "PWD", "notification": {"sent": true, "channel": "dashboard+email-sim"},
    "report_ref": "reports/RPT-0001.md", "tracking_code": "CP-IND-8491",
    "public_transparency_entry": true
  },

  "trace": [ {"agent": "...", "stage": 1, "status": "ok", "ms": 12, "summary": "..."} ]
}
```

---

## Stage 1 — Input Capture (6 agents) — all DET

| # | Agent | Writes | Notes |
|---|---|---|---|
| 1 | `text_ingest` | `stage1_input.raw_text` | Text channel capture |
| 2 | `voice_ingest` | `stage1_input.audio_blob_ref` | Saves webm/wav blob to `data/media/` |
| 3 | `photo_ingest` | `stage1_input.photo_blob_ref` | Saves image, size/type check |
| 4 | `messaging_ingest` | `stage1_input.normalized_payload` | WhatsApp/webhook-style payload normalizer |
| 5 | `input_validator` | `stage1_input.input_valid`, `rejection_reason` | Non-empty, min length, geo present or fallback |
| 6 | `rate_guard` | `stage1_input.rate_limited` | Per-IP/phone sliding window (10/hr) |

## Stage 2 — Understanding (9 agents) — 6 LLM, 3 DET

| # | Agent | Writes | Type | Notes |
|---|---|---|---|---|
| 7 | `transcriber` | `stage2_understand.transcript` | LLM | Audio→text; fallback: Web Speech API text or pre-baked clip transcript |
| 8 | `language_detector` | `stage2_understand.detected_language` | DET | Hindi/Hinglish/English heuristic on script + stopword mix |
| 9 | `image_captioner` | `stage2_understand.image_caption` | LLM | Vision caption; fallback: filename/mime-based placeholder |
| 10 | `image_verifier` | `stage2_understand.image_relevant` | LLM | Does photo corroborate complaint? |
| 11 | `intent_classifier` | `stage2_understand.category` | LLM | Taxonomy classification; fallback: keyword rules |
| 12 | `subcategory_tagger` | `stage2_understand.subcategory` | LLM | Fallback: keyword rules |
| 13 | `location_extractor` | `stage2_understand.extracted_location` | LLM | Landmarks + geocode; fallback: ward centroid + landmark gazetteer |
| 14 | `severity_assessor` | `stage2_understand.severity` | LLM | 1–5; fallback: keyword severity ladder |
| 15 | `understanding_validator` | `stage2_understanding_valid`, `urgency`, `sentiment` | DET | Schema check + urgency/sentiment derived from severity & keywords |

> Note: LLM agents 7–14 are executed via **one batched Gemini call** per submission
> (single multimodal inference) then fanned out to their keys — logged in the trace as
> individual agents so the Pipeline Trace viewer shows all of them.

## Stage 3 — Connection (6 agents) — 5 DET, 1 LLM

| # | Agent | Writes | Type | Notes |
|---|---|---|---|---|
| 16 | `embedder` | `stage3_connect.embedding` | DET | Gemini embeddings if cached/online, else hashed n-gram TF-IDF vector |
| 17 | `similarity_engine` | `stage3_connect.similarities` | DET | Cosine vs. recent complaints (14d window) |
| 18 | `duplicate_merger` | `stage3_connect.duplicate_of`, `merged_into_cluster` | DET | ≥0.82 similarity + <300m + same category → merge |
| 19 | `cross_channel_linker` | `stage3_connect.cross_channel_matches` | DET | Same cluster across voice/text/photo channels |
| 20 | `temporal_analyzer` | `stage3_connect.temporal_trend` | DET | Count in window, acceleration flag (surge detector) |
| 21 | `cluster_labeler` | `stage3_connect.cluster_label` | LLM | Human title for cluster; fallback: "{subcategory} cluster near {top landmark}" |

## Stage 4 — Location & Hotspots (5 agents) — all DET

| # | Agent | Writes |
|---|---|---|
| 22 | `ward_aggregator` | `stage4_locate.ward` |
| 23 | `density_calculator` | `stage4_locate.density` |
| 24 | `hotspot_detector` | `stage4_locate.is_hotspot`, `hotspot_threshold` |
| 25 | `boundary_mapper` | `stage4_locate.boundary` (centroid + radius via mean-point + max-distance) |
| 26 | `geoviz_builder` | `stage4_locate.geo_viz` (GeoJSON FeatureCollection for Leaflet) |

## Stage 5 — Prioritization (8 agents) — 7 DET, 1 LLM

| # | Agent | Writes | Notes |
|---|---|---|---|
| 27 | `severity_weight` | `components.severity` | avg severity × 25 |
| 28 | `frequency_weight` | `components.frequency` | log-scaled complaint count × 20 |
| 29 | `population_norm` | `components.population` | complaints per 10k pop × 15 (**equity weighting**) |
| 30 | `recency_weight` | `components.recency` | escalation curve on days unresolved × 15 |
| 31 | `geo_concentration` | `components.concentration` | cluster tightness (radius inverse) × 15 |
| 32 | `anomaly_adjuster` | `components.trust_discount` | spam/astroturf discount (same-phone burst, duplicate ratio) — negative |
| 33 | `score_aggregator` | `priority_score` | clamp 0–100, deterministic |
| 34 | `evidence_compiler` | `evidence` | LLM narrative; fallback: template sentence |

Formula: `score = clamp(0, 100, Σ components)` with max component points summing to 100
(25+20+15+15+15 = 90 baseline + 10 concentration bonus modeled inside geo_concentration),
minus trust discount.

## Stage 6 — Action (5 agents) — 1 LLM, 4 DET

| # | Agent | Writes | Type | Notes |
|---|---|---|---|---|
| 35 | `department_router` | `stage6_act.department` | DET | Category→dept map (PWD, Water, Electricity, Solid Waste, Drainage) |
| 36 | `notifier` | `stage6_act.notification` | DET | Dashboard alert + simulated email/SMS queue |
| 37 | `report_generator` | `stage6_act.report_ref` | LLM | Executive md report; fallback: template |
| 38 | `feedback_looper` | `stage6_act.tracking_code` | DET | Citizen tracking code issue |
| 39 | `transparency_publisher` | `stage6_act.public_transparency_entry` | DET | Public ledger entry |

---

## Pod C — Frontend (10 agents), Pod E — DevOps (5), Pod F — QA (5), Pod G — Pitch (5)

Build-unit agents (one component / task each), not runtime agents:

- **Pod C**: NavbarShell, CitizenPortal, SubmissionModal, HotspotMap, PriorityBadge, EvidenceCard, RoutingTable, PipelineLiveViewer, CommandCenter, CopilotDrawer
- **Pod E**: CORS/env config, DB init + seed runner, `run-local.ps1`, `run-local.sh`, offline-mode switch
- **Pod F**: stage unit tests, pipeline E2E test, seed data verification, frontend build check, demo dry-run
- **Pod G**: pitch summary, demo walkthrough guide, uniqueness one-pager, metric sheet, Q&A prep

**Total: 39 pipeline agents + 30 build agents = 69.**
