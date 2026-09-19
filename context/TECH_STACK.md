# CivicPulse AI — Tech Stack & Dependencies Specification

## 1. Core Architecture Stack

| Layer | Technology | Version / Tooling | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **React** + **Vite** | React 18 / Vite 5 | Fast, modular Single Page Application |
| **Styling & Icons** | **Tailwind CSS** + **Lucide React** | Tailwind v3 / Lucide | Modern glassmorphism, responsive dashboard UI |
| **Geospatial & Maps** | **Leaflet.js** + **React-Leaflet v4 (pinned, React 18)** | Leaflet 1.9 + `leaflet.heat` | Interactive city map, CircleMarkers, demand heatmaps, offline vector mode |
| **Data Visualization** | **Recharts** or **Chart.js** | Recharts 2.x | Category distributions, priority charts, time-series |
| **Backend API** | **FastAPI (Python)** | Python 3.10+ / FastAPI 0.110+ | Async, high-performance REST API with OpenAPI |
| **AI & Multimodal** | **Google Gemini API** | `google-genai` / `google-generativeai` | Speech-to-text, photo verification, JSON classification |
| **Database** | **SQLite** (Dev) / **PostgreSQL** | SQLAlchemy 2.0 (Async) | Relational persistence for complaints, hotspots, wards |
| **HTTP Client** | **Axios** | Axios 1.7+ | Seamless frontend-to-backend API communication |

---

## 2. Directory Structure

```
Prompt-Pirate/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/                   # SQLAlchemy: Ward, Complaint, Hotspot, AdminAction
│   │   ├── schemas/                  # Pydantic v2 + shared_record.py (zero-collision keys)
│   │   ├── pipeline/
│   │   │   ├── stage1_input/         # 6 agents
│   │   │   ├── stage2_understand/    # 9 agents (one batched Gemini call fanned out)
│   │   │   ├── stage3_connect/       # 6 agents
│   │   │   ├── stage4_locate/        # 5 agents
│   │   │   ├── stage5_prioritize/    # 8 agents
│   │   │   ├── stage6_act/           # 5 agents
│   │   │   ├── orchestrator.py       # sequential stages, asyncio.gather per stage, key-collision assert
│   │   │   └── trace.py              # in-memory + DB trace store (polled by Pipeline viewer)
│   │   ├── routers/                  # complaints, pipeline, hotspots, analytics, assistant, admin
│   │   ├── services/                 # gemini_service.py (fallback), clustering, priority_engine, geo
│   │   └── seed/seed_indore_data.py  # 25+ grievances incl. 48h surge cluster
│   ├── data/                         # civicpulse.db, media/, reports/
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, SubmissionModal, HotspotMap, PriorityBadge,
│   │   │                             # EvidenceCard, RoutingTable, PipelineViewer, CopilotDrawer...
│   │   ├── pages/                    # CitizenPortal, CommandCenterDashboard, PipelineTracePage
│   │   ├── services/api.ts
│   │   ├── App.tsx, main.tsx, index.css
│   ├── package.json, vite.config.ts, tailwind.config.js
│
├── context/                          # docs (see SHARED_CONTEXT.md index)
├── docs/                             # pitch_deck_summary.md, demo_walkthrough_guide.md
├── SHARED_CONTEXT.md
└── run-local.ps1 / run-local.sh
```

---

## 3. Dependency Specifications

### Backend (`requirements.txt`)
```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
google-genai>=0.1.1
google-generativeai>=0.8.0
sqlalchemy>=2.0.28
aiosqlite>=0.20.0
python-multipart>=0.0.9
aiofiles>=23.2.1
python-dotenv>=1.0.1
requests>=2.31.0
```

### Frontend (`package.json` dependencies)
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.0",
    "axios": "^1.7.2",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "leaflet.heat": "^0.2.0",
    "@types/leaflet": "^1.9.12",
    "lucide-react": "^0.383.0",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.11"
  }
}
```

---

## 4. Environment Variables

### Backend `.env`
```env
# Gemini API Key (Required for AI understanding and copilot)
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Database (Default to SQLite file for zero-config hackathon speed)
DATABASE_URL=sqlite+aiosqlite:///./civicpulse.db
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 5. Development Run Commands

### Backend
```powershell
# In /backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```powershell
# In /frontend
npm install
npm run dev
```
