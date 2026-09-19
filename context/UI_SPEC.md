# CivicPulse AI — UI Spec (tokens + rules + registry, merged)

## Design language
GovTech clean: calm civic blues for structure, emerald for positive status, amber for
alerts, crimson for urgency. Light mode primary; generous whitespace; no glassmorphism
excess — legibility wins in a live demo on a projector.

## Tokens (Tailwind extension)

| Token | Value | Use |
|---|---|---|
| `civic` | `#1D4ED8` (blue-700) | Primary actions, active nav, links |
| `civic-soft` | `#EFF6FF` (blue-50) | Section backgrounds |
| `status-ok` | `#059669` (emerald-600) | Resolved, healthy |
| `status-warn` | `#D97706` (amber-600) | Moderate urgency, surging |
| `status-crit` | `#DC2626` (red-600) | Critical, emergency |
| `ink` | `#0F172A` (slate-900) | Headings |
| `muted` | `#64748B` (slate-500) | Secondary text |
| Font | Inter (system fallback) | All text |
| Radius | `rounded-xl` cards, `rounded-lg` inputs | |
| Shadow | `shadow-sm` default, `shadow-md` hover | |

Severity → color mapping (used everywhere: map pins, badges, table rows):
1 `slate` 2 `sky` 3 `amber` 4 `orange` 5 `red` · Urgency Emergency = pulsing crimson dot.

## Layout rules
- Navbar (h-14): logo left; nav: **Report** (citizen) / **Command Center** (admin) / **Pipeline**; right: LLM-mode chip (Gemini/Fallback) + Airplane-mode toggle.
- Citizen portal: single centered column, max-w-2xl; big mode tabs Text/Voice/Photo.
- Command center: metric bar (4 KPI cards) → map + priority queue split (2/3 + 1/3) → analytics row.
- Pipeline page: left rail = 6 stage accordion; right = live shared-record JSON filling key-by-key.
- All interactive elements ≥44px touch target; `focus-visible` rings; WCAG AA contrast.

## Component registry

| Component | Page | Key details |
|---|---|---|
| `Navbar` | all | Civic blue, mode chips |
| `SubmissionModal` | Citizen | Text/Voice/Photo tabs; voice = record or 3 pre-baked Hindi clips; ward fallback picker |
| `TrackingSearch` | Citizen | tracking code lookup, status timeline, before/after photos |
| `HotspotMap` | Command | Leaflet; CircleMarkers colored by severity; density heat toggle; ward circles; click → drawer |
| `HotspotDrawer` | Command | Evidence card, score breakdown bars, audio playback, what-if slider, action buttons |
| `PriorityBadge` | Command | 0–100 with color; hover → component breakdown tooltip |
| `EvidenceCard` | Command | "Why this matters" narrative |
| `TopIssuesWidget` | Command | Trending categories + surge flags |
| `RoutingTable` | Command | Dept dispatch status (PWD/Water/etc.) |
| `PipelineViewer` | Pipeline | Stage accordion + agent pills lighting up + record JSON; polls 300ms |
| `MetricCards` | Command | Totals, hotspots, critical, resolution rate |
| `CopilotDrawer` | Command | Chat + work-order draft card |

## Map specifics (Leaflet)
- react-leaflet v4 + React 18; `leaflet.heat` side-effect import for heat layer.
- Use `CircleMarker` (no icon assets → no Vite icon bug). Heat points: `[lat, lng, weight]`, weight = severity×0.6 + urgency×0.4.
- Offline/vector mode: hide tile layer, keep dark `#1e293b` background + ward circles — demo never shows a gray map.
- Center: Indore `[22.7196, 75.8577]`, zoom 12.
