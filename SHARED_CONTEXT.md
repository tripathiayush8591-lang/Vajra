# CivicPulse AI — SHARED_CONTEXT (single source of truth)

**Status**: Wave 0 complete · Waves 1–5 in progress
**Stack**: FastAPI + SQLAlchemy/SQLite + Gemini (deterministic fallback) · React/Vite + Tailwind + Leaflet
**Pipeline**: `Citizen → Feedback → AI → Pattern Detection → Hotspot → Priority Score → Government Action`

## Doc index
| Doc | Purpose |
|---|---|
| `context/AGENT_REGISTRY.md` | 69 agents, shared-record keys, zero-collision contract — **read first** |
| `context/API_CONTRACTS.md` | All REST endpoint shapes |
| `context/DATABASE_SCHEMA.md` | wards / complaints / demand_hotspots / admin_actions |
| `context/UI_SPEC.md` | tokens + rules + component registry |
| `context/DEMO_SCRIPT.md` | 5-min demo + rehearsal checklist |
| `context/APPLICATION_FLOW.md` | 6-stage data flow |
| `context/TECH_STACK.md` | deps, env, run commands |
| `context/GEMINI_PROMPTS.md` | prompts + JSON schemas |

## Locked decisions
1. Agents = deterministic units of work; **only ~6 LLM touchpoints**, all with offline fallback. Trace shows all 39 regardless.
2. One batched Gemini call per Stage-2 submission, fanned out to 8 agent keys.
3. Orchestrator: stages sequential, agents within stage via `asyncio.gather`; registration-time key-collision assert.
4. Trace store in-memory + DB; frontend polls `GET /api/v1/pipeline/{id}` every 300ms.
5. Priority formula: severity 25 + frequency 20 + population 15 + recency 15 + concentration 15 (equity-weighted) − trust discount, clamp 0–100.
6. react-leaflet **v4** + React 18; CircleMarkers only; vector offline mode; Indore center [22.7196, 75.8577].
7. Secrets only in `.env` (gitignored); logs redact keys/phones.

## Build order (waves)
0 Docs ✅ → 1 Backend (orchestrator+trace first, then stages, routers, seed, tests) → 2 Frontend → 3 DevOps scripts → 4 QA/E2E → 5 Pitch docs.
