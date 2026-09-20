# CivicPulse AI 🏛️📍

> **A Civic Demand Intelligence Platform that turns fragmented citizen feedback into explainable, equitable development priorities.**
> *Built for the Google Developer Group (GDG) Indore Hackathon.*

---

## 📌 Table of Contents

1. [The Problem](#-the-problem)
2. [The Solution](#-the-solution)
3. [Key Features](#-key-features)
4. [How It Works — The 6-Stage Pipeline](#-how-it-works--the-6-stage-pipeline)
5. [Explainable Priority Score](#-explainable-priority-score-0100)
6. [System Architecture](#-system-architecture)
7. [Tech Stack](#-tech-stack)
8. [Project Structure](#-project-structure)
9. [Running Locally](#-running-locally)
10. [Environment Variables](#-environment-variables)
11. [Demo Accounts & 5-Minute Demo Script](#-demo-accounts--5-minute-demo-script)
12. [API Reference](#-api-reference)
13. [Design Documentation](#-design-documentation)
14. [Live Demo](#-live-demo)

---

## 🌐 Live Demo

🔗 **Frontend (Vercel):** [https://vajra-two.vercel.app/](https://vajra-two.vercel.app/)

> ⚠️ **Disclaimer:** The backend is hosted on [Render](https://render.com/) free tier. Due to Render's free tier limitations, the backend **spins down after 10 minutes of inactivity**. The first request after idle may take **30–60 seconds** while the server cold-starts. Subsequent requests will be fast. Apologies for the inconvenience — this is a constraint of free-tier hosting during the hackathon.

---

## 😤 The Problem

Indian municipalities receive **thousands of citizen complaints every month** — via phone calls, WhatsApp, walk-ins, voice notes in Hindi/Hinglish, and photos. Roughly 90% of that signal dies in silos:

| Pain Point | Real-World Consequence |
| :--- | :--- |
| **Fragmented feedback** | Complaints arrive across 5+ unconnected channels with no correlation or deduplication. |
| **Unstructured data** | Raw voice notes and photos have no standardized category, severity, or verifiable evidence. |
| **No hotspot visibility** | Municipalities react to the *loudest caller*, never seeing chronic area-wide failure patterns. |
| **Subjective prioritization** | Budgets and work orders are allocated by guesswork — or first-come-first-served. |
| **Broken trust loop** | Citizens stop reporting because nothing visibly happens after they do. |

---

## 💡 The Solution

**CivicPulse AI** is a single pipeline that carries a citizen's voice all the way to a government work order:

```
Citizen → Feedback → AI → Pattern Detection → Hotspot → Priority Score → Government Action
```

- **Citizens report by text, voice (Hindi/Hinglish), or photo** — AI transcribes, translates, classifies, geo-locates, and severity-rates every report.
- **Pattern detection** merges duplicates, links cross-channel reports, and clusters them into geographic **Demand Hotspots** on an interactive Indore map.
- An **explainable, equity-weighted Priority Score (0–100)** ranks every hotspot with a plain-English *"why this matters"* narrative.
- **One tap routes work to the right department** with budget estimates, and the outcome is tracked publicly via tracking codes — closing the trust loop.

### Why judges should care — our differentiators

1. **Glass-box AI, not a black box.** A live trace viewer shows all **39 pipeline agents across 6 stages** executing in real time (polled every 300 ms). Nothing about the AI's reasoning is hidden.
2. **Explainable scoring.** Every point of the 0–100 score is attributable — see the [full formula](#-explainable-priority-score-0100).
3. **Equity by design.** Population normalization (complaints per 10k residents) means a low-income ward's 5 reports can legitimately outrank a commercial hub's 15. *AI that doesn't ignore poor neighborhoods.*
4. **Counterfactual what-if slider.** "Resolve 6 complaints → hotspot score drops 71 → 48", computed live.
5. **Surge prediction.** A temporal trend agent flags accelerating clusters (*"+54% in 48h"*).
6. **Airplane-mode resilience.** One toggle (`OFFLINE_MODE`) proves the entire pipeline runs end-to-end on a deterministic fallback engine — **100% demo reliability, no API key required**.
7. **Voice-first, multilingual.** Real Hindi/Hinglish voice notes are transcribed and even played back inside hotspot drawers — the citizen's actual voice stays in the decision room.
8. **Closed accountability loop.** Public tracking codes, status workflow (*Reported → Under Review → Work Scheduled → Resolved*), and a transparency ledger of admin actions.

---

## ✨ Key Features

### 👤 Citizen Portal (`/citizen`)
- 🎙️ **Voice recording** with live audio-wave visualizer — speak in Hindi, English, or Hinglish.
- 📷 **Photo evidence** uploader with instant preview and AI damage verification.
- 📍 **Auto geolocation** with a fallback ward dropdown for all Indore wards.
- 🎫 **Instant tracking ID** — citizens follow their complaint's live AI pipeline and status.

### 🏛️ Government Command Center (`/admin`)
- 📊 **KPI overview bar** — total reports, active hotspots, critical urgency index, resolution rate.
- 🗺️ **Interactive Leaflet map** — severity-coded markers (🔴 Critical / 🟡 Moderate / 🔵 Low), `leaflet.heat` density heatmap, and ward-level aggregation. Offline vector mode included.
- 🎯 **Priority queue** — hotspots ranked by explainable score, with a full score-breakdown modal and what-if slider.
- 📈 **Analytics** — category distributions (roads, water, waste, streetlights, drainage…) and day-over-day surge time-series (Recharts).
- 🤖 **AI Civic Copilot** — a chat drawer grounded in live database records: *"Which ward requires immediate road-repair budget this week?"* → executive briefing + recommended actions.
- 🚀 **One-tap dispatch** — routes work orders to departments with budget estimates via `POST /api/v1/admin/actions`.

### 🔬 Live Pipeline Trace (`/pipeline`)
- Watch each of the 39 agents execute — name, stage, status, duration (ms), and a human-readable summary of what it produced.
- Role-aware view, accessible to both citizens and authorities.

---

## ⚙️ How It Works — The 6-Stage Pipeline

The backend orchestrates **39 deterministic agents** in **6 sequential stages**. Within each stage, agents run concurrently via `asyncio.gather` and write to a **zero-collision shared record** (registration-time key-collision assertion guarantees no two agents ever overwrite each other's keys).

| Stage | Name | Agents | What Happens |
| :--- | :--- | :---: | :--- |
| **1** | Input | 6 | Ingest text / audio / photo payloads, persist media, capture GPS + ward hints. |
| **2** | Understand | 9 | **One batched Gemini call** (transcription, translation, classification, severity, landmark extraction) memoized once, then fanned out to 9 agent keys: transcriber, language detector, image captioner & verifier, intent classifier, subcategory tagger, location extractor, severity assessor, understanding validator. |
| **3** | Connect | 6 | Duplicate detection, cross-channel linking, same-phone burst detection, thread merging. |
| **4** | Locate | 5 | Landmark → coordinates resolution, Haversine-based spatial clustering into **Demand Hotspots**, ward assignment. |
| **5** | Prioritize | 8 | Explainable priority scoring (see below), surge trend detection, evidence narrative generation. |
| **6** | Act | 5 | Department routing, work-order drafting, budget estimation, public tracking, transparency ledger. |

**Design principles:**
- Only **~6 LLM touchpoints** exist in the whole system — every other agent is deterministic and testable.
- Every agent — LLM or not — has an **offline fallback**, so the pipeline never hard-fails mid-demo.
- Every agent execution is recorded to an **in-memory + DB trace store**, exposed via `GET /api/v1/pipeline/{submission_id}`.

---

## 🧮 Explainable Priority Score (0–100)

```
score = severity(25) + frequency(20) + population(15) + recency(15) + concentration(15)
        − trust_discount,   clamped to 0..100
```

| Component | Max | Logic |
| :--- | :---: | :--- |
| **Severity** | 25 | Normalized avg. AI severity (1–5). Health-hazard categories (sewage, water leakage, public safety) get a ×1.2 boost. |
| **Frequency** | 20 | Linear in complaint count; saturates at 12+ reports. |
| **Population (equity)** | 15 | Complaints **per 10,000 residents** — this is the fairness term. A poor ward's 5 reports can outrank a commercial hub's 15. |
| **Recency** | 15 | Oldest open complaint's age (saturates at 10 days) + a bonus for last-48h surges. |
| **Concentration** | 15 | Tighter geographic radius (≤ 500 m) = more targeted fix = more points. |
| **Trust discount** | −8 | Duplicates (> 50% ratio) −5; same-phone burst campaigns −3. |

Every hotspot ships with a generated **justification statement**, e.g.:

> *"Ranked 71/100: 9 road & pothole reports in Vijay Nagar over 6 days (severity 22/25, equity-weighted population impact 11/15, surge-adjusted recency 12/15)."*

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Citizen Channels
        A1[🎤 Voice notes Hindi/Hinglish]
        A2[📝 Text complaints]
        A3[📷 Photo evidence]
    end

    subgraph Frontend — React 18 + Vite + Tailwind + Leaflet
        B1[Citizen Portal]
        B2[Command Center Dashboard]
        B3[Live Pipeline Trace]
        B4[AI Copilot Drawer]
    end

    subgraph Backend — FastAPI + 39-Agent Orchestrator
        C1[REST API Gateway /api/v1]
        C2[6-Stage Agent Pipeline]
        C3[Spatial Clustering Engine]
        C4[Explainable Priority Engine]
        C5[Copilot Context Retrieval]
    end

    subgraph Intelligence
        D1[Gemini Flash<br/>multimodal + structured JSON]
        D2[Deterministic Fallback Engine<br/>airplane mode]
    end

    subgraph Persistence
        E1[(SQLite / PostgreSQL<br/>SQLAlchemy 2.0)]
        E2[/media — audio & photos/]
        E3[Trace Store — memory + DB]
    end

    A1 & A2 & A3 --> B1 -->|multipart submit| C1 --> C2
    B2 & B4 --> C1
    C2 <--> D1
    C2 -.->|OFFLINE_MODE| D2
    C2 --> C3 --> C4 --> E1
    C2 --> E3 --> B3
    C5 <--> E1
    C5 <--> D1
```

**Spatial strategy:** grid-based spatial binning + Haversine clustering produces ward-level demand hotspots **without requiring PostGIS** — a deliberate hackathon-speed decision that upgrades cleanly to PostgreSQL + PostGIS in production.

---

## 🧰 Tech Stack

| Layer | Technology | Why |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite 5 + TypeScript | Fast SPA, instant HMR during the demo |
| **Styling** | Tailwind CSS 3 + Lucide icons | Modern glassmorphism UI, dark/light themes |
| **Maps** | Leaflet 1.9 + react-leaflet v4 + leaflet.heat | Interactive markers, density heatmaps, offline vector mode |
| **Charts** | Recharts 2 | Category & time-series analytics |
| **Backend** | FastAPI (Python 3.10+) + Pydantic v2 | Async REST API, auto OpenAPI docs at `/docs` |
| **AI** | Google Gemini Flash (`google-generativeai`) | Native multimodal audio + vision + structured JSON |
| **Resilience** | Deterministic fallback engine | 100% offline operation — no key, no problem |
| **Database** | SQLite (zero-config) → PostgreSQL via SQLAlchemy 2.0 | One connection-string swap to scale |
| **Auth** | Firebase Authentication | Email/password + Google sign-in, role-based (citizen / authority) |
| **Realtime trace** | Polling @ 300 ms | Simple, robust, demo-friendly |

---

## 📂 Project Structure

```
Prompt-Pirate/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan seeding, routers, CORS
│   │   ├── config.py                # Pydantic-style settings from .env
│   │   ├── database.py              # SQLAlchemy engine + session
│   │   ├── models/                  # Ward, Complaint, DemandHotspot, AdminAction
│   │   ├── schemas/                 # Pydantic v2 + shared_record.py (zero-collision keys)
│   │   ├── pipeline/                # ⭐ the star of the show
│   │   │   ├── orchestrator.py      # sequential stages, per-stage asyncio.gather
│   │   │   ├── stage1_input.py      # 6 agents
│   │   │   ├── stage2_understand.py # 9 agents (1 batched Gemini call fanned out)
│   │   │   ├── stage3_connect.py    # 6 agents
│   │   │   ├── stage4_locate.py     # 5 agents
│   │   │   ├── stage5_prioritize.py # 8 agents
│   │   │   ├── stage6_act.py        # 5 agents
│   │   │   └── trace.py             # in-memory + DB trace store
│   │   ├── routers/                 # complaints, pipeline, hotspots, analytics, assistant, admin
│   │   ├── services/                # gemini_service, priority_engine, clustering, geo
│   │   └── seed/seed_indore_data.py # 25+ realistic grievances incl. a 48h surge cluster
│   ├── data/                        # civicpulse.db, media/, reports/ (auto-created)
│   ├── tests/                       # pytest suite (priority engine, pipeline)
│   ├── requirements.txt
│   └── run.py                       # uvicorn entrypoint (reads PORT from .env)
│
├── frontend/
│   ├── src/
│   │   ├── pages/                   # Landing, Auth, CitizenPortal, CommandCenter,
│   │   │                            # ComplaintsAnalysis, PipelineTrace
│   │   ├── components/              # HotspotMap, HotspotDrawer, CopilotDrawer,
│   │   │                            # PipelineViewer, SubmissionModal, PriorityBadge…
│   │   ├── context/                 # AuthContext (Firebase), ThemeContext
│   │   └── services/api.ts          # Axios client (VITE_API_BASE_URL)
│   ├── .env                         # VITE_API_BASE_URL + Firebase config
│   └── package.json
│
├── context/                         # 📚 Full design specifications (see below)
├── docs/                            # pitch_deck_summary.md, demo_walkthrough_guide.md
├── run-local.sh / run-local.ps1     # 🚀 one-click startup for Linux/macOS / Windows
└── SHARED_CONTEXT.md                # single source of truth for contributors
```

---

## 🚀 Running Locally

### Prerequisites

| Tool | Version | Check |
| :--- | :--- | :--- |
| Python | 3.10+ | `python --version` |
| Node.js + npm | 18+ | `node --version` |
| Gemini API key | *(optional)* | Free at [Google AI Studio](https://aistudio.google.com/) |

> ⚠️ **No Gemini key? No problem.** The platform auto-detects the missing key and runs the deterministic fallback engine. Set `OFFLINE_MODE=true` to force airplane mode deliberately (great for demoing resilience).

### Option A — One-click startup (recommended)

```bash
# Linux / macOS
./run-local.sh
```
```powershell
# Windows PowerShell
.\run-local.ps1
```

The script creates the backend venv, installs all dependencies (first run only), and starts both servers:
- 🖥️ **Frontend** → http://localhost:5173
- ⚙️ **Backend** → http://localhost:8000 (Swagger docs at http://localhost:8000/docs)

### Option B — Manual setup

**1. Backend (FastAPI):**

```bash
cd backend

# Create & activate a virtual environment
python -m venv venv
source venv/bin/activate          # Linux/macOS
venv\Scripts\activate             # Windows

pip install -r requirements.txt

# Start the API (reads PORT from .env, defaults to 8000)
python run.py
# — or —
python -m uvicorn app.main:app --reload --port 8000
```

On first boot the app auto-creates `data/civicpulse.db` and **seeds it with 25+ realistic Indore grievances** — including a 48-hour surge cluster — so the map, analytics, and priority queue are populated immediately.

> 💡 **Tip:** If the backend starts on a random port instead of 8000, a `PORT` variable is leaking into your shell environment (e.g. `PORT=0`). Explicitly set `PORT=8000` before running, or unset it.

**2. Frontend (React + Vite):**

```bash
cd frontend
npm install
npm run dev
```

**3. Open the app:**

| URL | What |
| :--- | :--- |
| http://localhost:5173 | 🖥️ CivicPulse AI web app |
| http://localhost:8000/docs | 📖 Interactive Swagger API docs |
| http://localhost:8000/api/v1/health | ❤️ Health check (`llm_mode` shows `gemini` or `fallback`) |

### Running the tests

```bash
cd backend
venv\Scripts\activate             # or source venv/bin/activate
python -m pytest tests/ -v
```

---

## 🔐 Environment Variables

### Backend — `backend/.env` (see `.env.example`)

```env
# Gemini AI (optional — omit to run in deterministic fallback mode)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
OFFLINE_MODE=false

# Server
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Database (SQLite by default — zero config; swap for PostgreSQL in prod)
DATABASE_URL=sqlite:///./data/civicpulse.db
```

### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
# Firebase Auth (pre-configured for the hackathon project civicpulse-indore)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

> 🔒 Secrets live only in `.env` files (gitignored). Logs redact API keys and citizen phone numbers.

---

## 👥 Demo Accounts & 5-Minute Demo Script

### Sign-in options

The login page (`/login`) offers three ways in — pick your role tab (Citizen / Govt Authority) first:

1. **⚡ 1-Tap Demo (recommended for judges)** — instant access, zero configuration:
   - **Citizen:** *Rahul Verma* — Resident, Ward 24 Vijay Nagar
   - **Official:** *Er. Ashish Saxena* — Zonal Officer, Zone 3 Palasia
2. **Google Sign-In** via the pre-configured Firebase project.
3. **Email/password** (requires the providers to be enabled in the Firebase console — the UI detects and explains this, and offers the 1-Tap demo as fallback).

### The 5-minute demo flow

| ⏱️ | Step | What to show |
| :--- | :--- | :--- |
| 0:00 | **Voice complaint** | As the citizen, record in Hinglish: *"Vijay Nagar square ke paas do din se bada gaddha hai, accident ho sakta hai."* |
| 0:45 | **Live trace** | Watch all 39 agents execute on `/pipeline` — transcription → category `Roads & Potholes` → severity 4/5 → landmark extraction. |
| 1:30 | **Hotspot merge** | In the Command Center, see the report join a Vijay Nagar hotspot with a **+54% 48h surge flag**. |
| 2:15 | **Explainable score** | Open the score breakdown: severity 22/25, equity-weighted population 11/15, surge-adjusted recency 12/15. Drag the **what-if slider**: resolve 6 complaints → score drops 71 → 48, live. |
| 3:00 | **Copilot + dispatch** | Ask the AI Copilot *"Which ward requires immediate road repair budget this week?"* → executive briefing → one-tap department dispatch with budget estimate. |
| 4:00 | **Airplane mode** | Toggle `OFFLINE_MODE` and submit another complaint — the entire pipeline still completes on the deterministic engine. **Zero single points of failure.** |

Full rehearsal script: [`docs/demo_walkthrough_guide.md`](docs/demo_walkthrough_guide.md) · Pitch narrative: [`docs/pitch_deck_summary.md`](docs/pitch_deck_summary.md).

---

## 🔌 API Reference

Base URL: `http://localhost:8000/api/v1` · Interactive docs: `/docs`

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/complaints/submit` | Multipart submission: text + audio + photo + GPS. Triggers the full 6-stage pipeline. |
| `GET` | `/complaints` | Paginated, filterable complaint list (ward, status, category, severity). |
| `GET` | `/complaints/{tracking_code}` | Public tracking by citizen tracking code. |
| `PATCH` | `/complaints/{id}/status` | Advance status: Reported → Under Review → Work Scheduled → Resolved. |
| `GET` | `/pipeline/{submission_id}` | Live 39-agent execution trace (polled every 300 ms). |
| `GET` | `/hotspots` | Clustered demand hotspots with priority scores & evidence narratives. |
| `GET` | `/hotspots/geojson` | Map-ready GeoJSON for Leaflet. |
| `POST` | `/hotspots/{id}/whatif` | Counterfactual: "what happens to the score if N complaints are resolved?" |
| `GET` | `/analytics/summary` | KPIs, ward breakdown, category distribution, surge time-series. |
| `POST` | `/assistant/chat` | AI Civic Copilot — grounded in live database records. |
| `POST` | `/admin/actions` | Department dispatch: work orders + budget estimates + transparency ledger. |
| `GET` | `/health` | Health check + current LLM mode (`gemini` / `fallback`). |

---

## 📚 Design Documentation

Every architectural decision is specified in versioned docs under [`context/`](context/):

| Document | Contents |
| :--- | :--- |
| [`ARCHITECTURE.md`](context/ARCHITECTURE.md) | System design, component boundaries, Mermaid diagrams |
| [`APPLICATION_FLOW.md`](context/APPLICATION_FLOW.md) | End-to-end user journeys through all 6 stages |
| [`TECH_STACK.md`](context/TECH_STACK.md) | Dependencies, env config, directory layout, run commands |
| [`DATABASE_SCHEMA.md`](context/DATABASE_SCHEMA.md) | ERD — Wards, Complaints, Demand Hotspots, Admin Actions |
| [`API_CONTRACTS.md`](context/API_CONTRACTS.md) | Every REST endpoint's request/response shapes |
| [`GEMINI_PROMPTS.md`](context/GEMINI_PROMPTS.md) | Production prompt templates & JSON schemas |
| [`DEMO_SCRIPT.md`](context/DEMO_SCRIPT.md) | Timed 5-minute demo + rehearsal checklist |
| [`AGENT_REGISTRY.md`](context/AGENT_REGISTRY.md) | All 39 agents, shared-record keys, zero-collision contract |

---

<div align="center">

**CivicPulse AI** — *Every voice counted. Every rupee explainable. Every ward visible.* 🇮🇳

Developed for **GDG Indore Hackathon** · Powered by **Google Gemini**

</div>
