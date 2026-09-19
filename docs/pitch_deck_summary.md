# CivicPulse AI — Pitch Deck Summary

## The problem
Cities receive thousands of citizen complaints a month across phone calls, apps, voice
notes in Hindi/Hinglish, photos, and ward offices. 90% of that signal dies in silos:
duplicate tickets, no pattern detection, no prioritization, and no way for a commissioner
to know *what to fix first*. Citizens stop reporting because nothing visibly happens.

## The solution
**CivicPulse AI: a Civic Demand Intelligence Platform.**
`Citizen → Feedback → AI → Pattern Detection → Hotspot → Priority Score → Government Action`

- Citizens report by **text, voice (Hindi/Hinglish), or photo** — AI transcribes, translates,
  classifies, and geo-locates every report.
- **Pattern detection** merges duplicates, links cross-channel reports, and clusters them
  into geographic **Demand Hotspots**.
- An **explainable, equity-weighted priority score (0–100)** ranks every hotspot with a
  plain-English "why this matters" narrative.
- One tap **routes work to the right department** with budget estimates and tracks the
  outcome publicly — closing the trust loop.

## Architecture in one line
39 pipeline agents across 6 stages (input → understand → connect → locate → prioritize →
act), orchestrated with per-stage concurrency, a zero-collision shared record, and a
**fully transparent live trace** — powered by Gemini with a deterministic offline
fallback that guarantees 100% demo reliability.

## Technical differentiators (why we win)
1. **Glass-box AI** — judges *see* all 39 agents execute live; nothing is a black box.
2. **Explainable scoring** — every point of the 0–100 score is attributable
   (severity 25 · frequency 20 · population equity 15 · recency 15 · concentration 15 − trust discount).
3. **Equity by design** — population normalization means a poor ward's 5 reports can
   outrank a commercial hub's 15. AI that doesn't ignore poor neighborhoods.
4. **Counterfactual what-if slider** — "resolve 6 complaints → score drops 71→48", live.
5. **Surge prediction** — temporal trend agent flags accelerating clusters ("+54% in 48h").
6. **Airplane mode** — one toggle proves the entire pipeline runs offline with the
   deterministic fallback engine.
7. **Voice-first, multilingual** — real Hindi/Hinglish voice notes, played back inside
   hotspot drawers to keep the citizen's actual voice in the decision room.
8. **Closed accountability loop** — public tracking codes, before/after resolution,
   public transparency ledger.

## Market impact
- Municipalities: 60–70% of complaint-handling triage automated; ward-level budget
  targeting instead of first-come-first-served.
- Citizens: measurable response; trust through visible status and fairness.
- Scales from ward → city → state with the same 6-stage contract.

## Demo (5 min)
Voice complaint in Hindi → live 39-agent trace → hotspot merge + surge flag → score
breakdown + what-if slider → department dispatch + copilot work order → airplane mode
resilience proof. Full script: `context/DEMO_SCRIPT.md`.
