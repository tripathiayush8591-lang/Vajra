# CivicPulse AI — REST API Contracts (v1)

Base URL: `http://localhost:8000/api/v1`. All responses are JSON. Errors follow
`{"detail": "..."}` FastAPI convention.

---

## 1. Complaints

### POST `/complaints/submit` — multipart/form-data
Fields: `channel` (`text|voice|photo|messaging`), `text` (optional str),
`audio` (optional file, webm/wav/mp3), `photo` (optional file, jpg/png),
`phone` (optional str), `lat`, `lng` (optional floats), `ward_id` (optional int fallback).

**201 Response** — submission accepted, pipeline kicked off async:
```json
{
  "submission_id": "SUB-2026-0001",
  "tracking_code": "CP-IND-8491",
  "pipeline_status": "processing",
  "trace_url": "/api/v1/pipeline/SUB-2026-0001"
}
```
**429** if rate-limited. **422** if input invalid (empty/no content).

### GET `/complaints?ward=&category=&status=&severity_min=&page=&page_size=`
Paginated list of processed complaints (summary fields only).

### GET `/complaints/{tracking_code}` — public status tracking
Returns complaint summary, status timeline, and resolution before/after photos if resolved.

### PATCH `/complaints/{id}/status` (admin)
Body: `{"status": "Under Review|Work Scheduled|Resolved", "notes": "...", "resolution_photo": null}`

---

## 2. Pipeline (the live-trace API)

### GET `/pipeline/{submission_id}`
Returns the shared record + per-agent trace; frontend polls every 300ms while `status != done`.
```json
{
  "submission_id": "SUB-2026-0001",
  "status": "running | done | failed",
  "current_stage": 3,
  "stages": [
    {"stage": 1, "name": "Input", "status": "done", "ms": 18, "agents": [
      {"agent": "text_ingest", "status": "ok", "ms": 2, "summary": "142 chars captured"}
    ]}
  ],
  "record": { ...full shared record so far... },
  "result": {"hotspot_id": 12, "priority_score": 80, "department": "PWD"}
}
```

### GET `/pipeline/{submission_id}/stream` — SSE (optional; polling is the default demo path)

---

## 3. Hotspots

### GET `/hotspots?category=&ward_id=&min_score=`
```json
{"hotspots": [{
  "id": 12, "title": "Recurring pothole cluster near Palasia Square",
  "ward": {"id": 3, "name": "Palasia"}, "category": "Roads & Potholes",
  "centroid": {"lat": 22.7533, "lng": 75.8937}, "radius_m": 250,
  "complaint_count": 14, "avg_severity": 4.1,
  "priority_score": 80,
  "components": {"severity": 22, "frequency": 20, "population": 12, "recency": 15, "concentration": 14, "trust_discount": -3},
  "evidence": "Ranked 80/100 due to ...",
  "temporal": {"accelerating": true, "trend_pct": 200},
  "status": "Active",
  "sample_audio_ref": "media/clip_pothole_01.webm",
  "geojson": { ...Feature for this hotspot... }
}]}
```

### GET `/hotspots/geojson` — all active hotspots as one FeatureCollection (for Leaflet)

### GET `/hotspots/{id}` — full detail incl. constituent complaints

### POST `/hotspots/{id}/whatif` — counterfactual
Body: `{"resolved_complaints": 6}` → re-run Stage 5 math, return hypothetical score + components.

---

## 4. Analytics

### GET `/analytics/summary`
```json
{"total_complaints": 312, "active_hotspots": 11, "critical_count": 4,
 "resolution_rate": 0.38, "surging_hotspots": 2,
 "by_category": [...], "by_ward": [...], "timeline": [...]}
```

---

## 5. Assistant (Copilot)

### POST `/assistant/chat`
Body: `{"query": "...", "ward_id": null}` → `{"answer": "markdown string", "draft_work_order": {...} | null}`
Grounded on live DB aggregates; supports work-order drafting mode.

---

## 6. Admin

- `GET /admin/actions?hotspot_id=` — audit trail
- `POST /admin/actions` — `{"hotspot_id": 12, "action_type": "BUDGET_ALLOCATED", "budget_allocated": 250000, "notes": "..."}`
- `GET /admin/system` — `{"llm_mode": "gemini|fallback", "offline_mode": false}` (airplane-mode toggle state)
- `POST /admin/system` — `{"offline_mode": true}` (forces deterministic fallback)

---

## DB models backing these endpoints: see `DATABASE_SCHEMA.md` (wards, complaints, demand_hotspots, admin_actions).
