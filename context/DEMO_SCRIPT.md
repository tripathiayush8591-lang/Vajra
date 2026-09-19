# CivicPulse AI — 5-Minute Demo Script & Rehearsal Checklist

## The story arc
"Citizens speak in any language, any channel. CivicPulse listens, connects the dots,
finds the hotspot, explains why it matters, and routes the fix — live, transparently."

## Timeline

| T | Beat | Action | What judges see |
|---|---|---|---|
| 0:00 | Hook | Open Citizen Portal. Play pre-baked Hindi voice clip: *"Palasia square ke paas do din se naali ka paani sadak par beh raha hai..."* | Real citizen voice, multimodal input |
| 0:40 | The signature moment | Switch to Pipeline page. Trace lights up Stage 1→6, agents tick green, shared record fills | Glass-box AI — 39 agents visible |
| 1:40 | Intelligence | Command Center: the new complaint has merged into an existing hotspot; surge flag "⚡ +200% in 48h" | Pattern detection, not ticketing |
| 2:20 | Explainability | Open hotspot drawer: score 84/100, component bars, evidence narrative, play cluster audio | Trust — no black box |
| 3:00 | Interactivity | What-if slider: resolve 6 complaints → score recomputes live | Decision tool, not dashboard |
| 3:40 | Action | Routing table: PWD dispatched; Copilot drafts a work order with timeline + equipment | Closed loop to government action |
| 4:10 | Resilience | Flip Airplane mode → toggle flips to "Fallback", resubmit a complaint, pipeline still completes end-to-end | 100% demo reliability |
| 4:40 | Equity close | Point at population-normalization line in score: "a poor ward's 5 complaints outrank a commercial hub's 15" | Values + tech |

## Rehearsal checklist (run twice, day before)
- [ ] Backend starts clean: `run-local.ps1` → seed runs, `/docs` opens
- [ ] Frontend build passes; map tiles load (and vector mode works with network off)
- [ ] All 3 voice clips play; transcript extracts correct ward
- [ ] Pipeline trace completes < 3s; all 39 agents green
- [ ] Hotspot drawer: audio plays, what-if slider recomputes, action button writes audit row
- [ ] Airplane mode: resubmission succeeds fully offline
- [ ] Tracking code lookup shows status timeline
- [ ] Screen: 100% zoom, projector contrast checked (crimson vs amber distinguishable)
- [ ] Backup: seeded DB snapshot copied; second laptop browser tab open on Command Center
