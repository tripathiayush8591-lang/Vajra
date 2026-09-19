# CivicPulse AI — Demo Walkthrough Guide (operator notes)

## Pre-demo setup (10 min before)
1. `powershell -File run-local.ps1` (or start backend `python run.py` + frontend `npm run dev` manually).
2. Verify: open http://localhost:8000/docs → health shows `llm_mode` (gemini or fallback — both fine).
3. Open three browser tabs: `:5173/` (Report), `:5173/pipeline`, `:5173/admin`.
4. Fresh state check: Command Center shows 4 hotspots; top = "Recurring drainage cluster near Palasia Square", 71/100, ⚡surging.
5. Backup: snapshot of `backend/data/civicpulse.db` copied aside.

## Beat-by-beat
| # | Tab | Do | Say |
|---|---|---|---|
| 1 | Report | Open modal → Voice → pick "Sewage overflow — Palasia" clip → Submit | "Citizens speak in their own language — voice, text, photo." |
| 2 | Pipeline | Trace auto-loads; all 39 agents light up stage by stage | "Every AI decision is visible. 39 agents, 6 stages, under 3 seconds." |
| 3 | Admin | Top hotspot n=13, surge +54% | "This new voice report was understood, deduplicated, and merged into a live hotspot automatically." |
| 4 | Admin | Click top hotspot → drawer | "Score 71/100 — and every point is explained." Walk the bars: severity, frequency, equity (population), surge, concentration. |
| 5 | Admin | Play the what-if slider, resolve 6 | "It's a decision tool: watch the score respond to intervention." |
| 6 | Admin | Play audio in drawer (if present) / read evidence | "The citizen's actual voice reaches the decision room." |
| 7 | Admin | Copilot → "Which ward needs budget first?" → draft work order card | "It doesn't just answer — it drafts the work order with budget and timeline." |
| 8 | Admin | Flip ✈ Airplane → Report tab → submit any text complaint → Pipeline shows fallback mode completing | "No API, no internet, no problem. Governance can't wait for a vendor's uptime." |
| 9 | Report | Track `CP-IND-…` code | "Closed loop: citizens see exactly where their complaint stands." |

## If something breaks
- Backend down: restart `python run.py` (DB persists; seeds only on empty DB).
- Map tiles gray: toggle "Vector (offline) mode" on the map — intentional feature, not a failure.
- Voice clip issue: use Text mode with the same Hindi sentence (transcript is pre-filled).
- Total failure: restore `civicpulse.db` snapshot and reload — 30 seconds.

## Q&A prep
- **"Why agents, not one LLM call?"** — 33 of 39 agents are deterministic (embedding, clustering, scoring, routing) for speed, auditability, and offline reliability; 6 use Gemini with fallback.
- **"How do you prevent spam/astroturfing?"** — Trust discount: duplicate ratio and same-phone bursts subtract points (anomaly_adjuster agent).
- **"Fairness?"** — Population normalization (per-10k-residents) is a first-class scoring term, not an afterthought.
- **"Privacy?"** — Phone numbers masked at rest; AI never receives full numbers.
- **"Scale?"** — SQLite → PostgreSQL is a connection-string change; scoring is O(n) per hotspot window.
