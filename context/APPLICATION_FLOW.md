# CivicPulse AI — Application & Data Flow Specification (v3, 6-stage pipeline)

## 1. End-to-End Lifecycle Overview

```
[Citizen Input] (Voice / Photo / Text / Messaging)
       │
       ▼
[FastAPI Ingestion Endpoint] ──► shared record created (submission_id)
       │
       ▼
ORCHESTRATOR — stages run sequentially; agents within a stage run concurrently (asyncio.gather)
       │
       ├─ Stage 1 INPUT (6 agents)      capture channels, validate, rate-guard
       ├─ Stage 2 UNDERSTAND (9 agents) batched Gemini call → transcript, category, severity, location (fallback: rules)
       ├─ Stage 3 CONNECT (6 agents)    embeddings, similarity, duplicate merge, temporal surge, cluster label
       ├─ Stage 4 LOCATE (5 agents)     ward aggregation, density, hotspot threshold, GeoJSON
       ├─ Stage 5 PRIORITIZE (8 agents) equity-weighted 0–100 score + evidence narrative
       ├─ Stage 6 ACT (5 agents)        department routing, alerts, report, tracking code, public ledger
       │
       ▼
[Trace store] ──► GET /api/v1/pipeline/{id} (frontend polls every 300ms → Pipeline Live Viewer)
       │
       ▼
[Command Center] (Leaflet hotspots, priority queue, what-if slider, Copilot) → [Resolution & citizen tracking loop]
```

Every agent writes only to its declared shared-record keys (see `AGENT_REGISTRY.md`);
the orchestrator asserts zero key collisions at registration time. Only ~6 LLM touchpoints
exist; everything else is deterministic — full pipeline completes in < 3s and runs
100% offline in fallback mode.

---

## 2. Detailed Step-by-Step Flow

### Step 1: Citizen Reports an Issue (`/report`)
1. Citizen opens the responsive web portal on desktop or mobile.
2. Selects reporting mode:
   - **Voice Note**: Taps the microphone button and records a 5–30 second message in Hindi, Hinglish, or English (e.g., *"Yahan Palasia square ke paas do din se naali ka paani sadak par beh raha hai aur bahut badboo aa rahi hai"*).
   - **Photo Upload**: Snaps or uploads an image of the pothole, leaking pipe, or garbage pile.
   - **Text**: Types an issue description.
3. Location Capture:
   - Browser asks for GPS location (latitude, longitude).
   - Citizen can pick their Indore ward (e.g. Ward 18 - Palasia, Ward 24 - Vijay Nagar, Ward 5 - Rajwada) from an intuitive search dropdown or autocomplete.
4. Form submits via `multipart/form-data` to `POST /api/v1/complaints/submit`.

---

### Step 2: Backend Ingestion & AI Processing Pipeline
1. **Payload Reception**:
   - FastAPI endpoint saves any attached audio or image to temporary storage.
2. **Gemini 1.5/2.0 Flash Execution**:
   - The multimodal model receives the audio/image alongside a strict system prompt.
   - The AI performs 5 operations in a single inference call:
     1. **Transcription & Translation**: Converts Hindi/Hinglish audio or text into clear, standardized English.
     2. **Category Classification**: Classifies into one of: `Roads & Potholes`, `Water Supply`, `Sanitation & Waste`, `Drainage & Sewage`, `Street Lighting`, `Public Safety`, `Encroachment`.
     3. **Severity Assessment**: Rates severity from `1` (minor annoyance) to `5` (critical hazard/emergency).
     4. **Entity Extraction**: Identifies landmarks, streets, and affected infrastructure.
     5. **Image Verification**: If a photo is attached, confirms whether the image corroborates the reported issue (guards against spam/irrelevant photos).
3. **Pydantic Validation**:
   - Model response is parsed against `ComplaintAISchema` to ensure 100% valid types.
4. **Database Record Creation**:
   - Complaint is persisted in the database with status `NEW_REPORTED`.

---

### Step 3: Aggregation & Demand Hotspot Engine
1. **Trigger**:
   - Automatically re-computed when new complaints arrive or queried by the Admin portal (`GET /api/v1/hotspots`).
2. **Clustering Logic**:
   - Complaints within the same **Ward** and **Category** submitted within a sliding time window (e.g. past 14 days) are grouped.
   - Spatial centroids (mean latitude/longitude) are calculated for the cluster.
   - If a cluster exceeds a volume threshold (e.g., $\ge 3$ complaints in a 250-meter radius), it is flagged as an active **Demand Hotspot**.
3. **Density Calculation for Map**:
   - Intensity weight is assigned to each point:
     $$\text{Weight} = \text{Severity} \times 0.6 + \text{Urgency Factor} \times 0.4$$
   - Fed directly into Leaflet's heat layer format: `[lat, lng, intensity]`.

---

### Step 4: Explainable Priority Scoring (0–100)
To avoid black-box decision making, every hotspot and issue is scored transparently using a deterministic formula paired with AI justification:

$$\text{Priority Score} = w_v \cdot S_{\text{volume}} + w_s \cdot S_{\text{severity}} + w_d \cdot S_{\text{duration}} + w_p \cdot S_{\text{population}} + w_g \cdot S_{\text{infra\_gap}}$$

| Metric | Weight | Measurement |
| :--- | :--- | :--- |
| **Volume of Complaints ($S_{\text{volume}}$)** | 25% | Number of distinct citizen reports filed in this area. |
| **Severity Index ($S_{\text{severity}}$)** | 25% | Average AI-assessed severity rating (1–5 normalized to 0–100). |
| **Duration / Age ($S_{\text{duration}}$)** | 20% | Days elapsed since first unresolved complaint (escalation curve). |
| **Population Impact ($S_{\text{population}}$)** | 15% | High footfall commercial hub (e.g. Rajwada) vs. residential ward. |
| **Infrastructure Gap ($S_{\text{infra\_gap}}$)** | 15% | Recurring historical failure frequency in the area. |

**Explainability Output**:
The API returns both the overall score and the granular component points, plus a 1-sentence plain-English justification displayed directly on the UI card (e.g., *"Ranked 88/100 due to rapid surge of 14 complaints in 48 hours impacting main hospital transit route"*).

---

### Step 5: Admin & Policymaker Command Center (`/admin`)
1. **Live Heatmap View**:
   - Official views Indore municipal map with active demand hotspots.
   - Toggle filters: Filter by Category (e.g., only show Water Supply issues) or Ward.
   - Clicking a hotspot opens a detailed slide-out drawer with:
     - Aggregated summary of citizen voices.
     - Sample photos of damage.
     - Priority score breakdown.
     - Quick Action Button: *"Assign to Ward Engineer"*, *"Mark Budget Allocated"*, *"Mark In Progress"*.
2. **Strategic Analytics Tab**:
   - Bar and Donut charts showing most impacted wards and resolution trends.
3. **AI Civic Copilot (Chat)**:
   - Admin opens the assistant drawer and asks questions like:
     - *"What are the top 3 critical issues requiring immediate budget in Zone 4?"*
     - *"Summarize citizen feedback regarding water contamination near Bhanwar Kuan."*
   - Backend queries relevant database records and prompts Gemini to synthesize executive briefings.

---

### Step 6: Feedback Loop & Citizen Status Tracking
1. When an official updates a complaint or hotspot status (`Work Scheduled` / `Resolved`):
   - Status updates are reflected on the public tracking portal.
   - Citizen can check status via their unique tracking code (e.g. `CP-IND-2024-8491`).
   - Closed-loop accountability fosters public trust in municipal governance.
