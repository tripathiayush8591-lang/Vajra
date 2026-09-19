# CivicPulse AI — UI Registry & Design Patterns

Baseline established: 2026-09-06
Theme: GovTech Clean Light Mode

## Global Design Tokens
- Canvas: \g-slate-50\ (#F8FAFC) with ambient radial mesh
- Card Surfaces: \g-white border border-slate-200/90 rounded-2xl shadow-card\
- Typography: Primary \	ext-slate-900\ (ink), Secondary \	ext-slate-600\ (muted), Accents \	ext-civic\ (#1D4ED8)
- Buttons: Primary \g-civic hover:bg-civic-hover text-white rounded-xl font-bold shadow-md shadow-blue-600/20\
- Badges: Light tinted pill \g-{color}-50 text-{color}-700 border border-{color}-200\

### HotspotMap
File: \rontend/src/components/HotspotMap.tsx\
- Canvas: Clean OpenStreetMap standard tiles (no inversion filter)
- Hotspot Markers: CircleMarkers colored by severity, critical clusters have pulsing halos
- Tooltips: Slate-900 high contrast floating badges

### Liquid Glass & Refined Chromatic System
File: `frontend/src/index.css`
- Liquid Tab Borders: **Normal refined glass borders (`1px solid rgba(...)`)** across all tab tracks and tab items in all modes, avoiding harsh stark white borders.
- Liquid Tab Tracks: `.liquid-tab-track`, `.glass-tab-track` — fluid subtle track with clean 1px border and soft ambient shadow.
- Liquid Tab Items: `.liquid-tab-item`, `.glass-tab-item` — sleek glass items with refined border, smooth hover lift, and natural contrast.
- Active Liquid Tabs: Luminous core gradients with explicit `border: 1.5px solid #ffffff` and multi-layered inner glow:
  - Civic / Electric Sapphire: `.liquid-tab-item-active-civic`
  - Authority Midnight Aurora: `.liquid-tab-item-active-official`
  - Sanitation: `.liquid-tab-active-emerald`
  - Roads & Infrastructure: `.liquid-tab-active-amber`
  - Water Supply: `.liquid-tab-active-cyan`
  - Electricity & Lighting: `.liquid-tab-active-violet`
  - Voice / Urgent: `.liquid-tab-active-rose`
  - Neutral / Light: `.liquid-tab-item-active-light`
- Implemented in:
  - `Navbar.tsx`: Header navigation tabs & role badges
  - `AuthPage.tsx`: Role selection tabs (Citizen vs Govt Authority) and Sign-in/Sign-up toggle
  - `CommandCenter.tsx`: Category filter pills (with per-category vivid liquid presets), KPIs, and offline/online mode selector
  - `SubmissionModal.tsx`: Reporting method selector (Text: Blue, Voice: Coral, Photo: Emerald)
  - `PipelineTracePage.tsx`: Telemetry execution runs tab strip with glowing cyan/sapphire highlights
  - `CitizenPortal.tsx`: One-tap presets, tracking module, and guarantee cards
  - `CopilotDrawer.tsx` & `HotspotDrawer.tsx`: Frosted liquid drawer containers and grounded query pills

### Pitch Black Reference Dashboard Theme (Dark Mode)
Files: `frontend/src/index.css`, `frontend/src/components/Navbar.tsx`, `frontend/src/pages/CommandCenter.tsx`, `frontend/src/components/HotspotMap.tsx`
- Canvas: Flat, pure `#000000` AMOLED OLED background (no gradients, matching reference project `JALSUTRA Assessment Dashboard`).
- Cards & Surfaces: Rounded-2xl dark obsidian cards (`#0b0d11`) with subtle, crisp slate borders (`#1e2430`), matching the 4-quadrant and KPI layout of the reference app.
- Navigation Tabs: Capsule pill track (`#07090c`) with rounded-full pill tabs (`#18202d` active with `#2d3b52` border; transparent inactive with `#94a3b8` text).
- Brand / Action Pill: Rounded-full emerald green pill button (`#052e16` with `#10b981` border and `#34d399` text) matching the "Analyse Water" pill button.
- Dataset Filter Chips: Rounded-full chips (`#090c10` with `#1b222c` border and `#38bdf8` cyan text).
- KPI Stat Metrics: Large, bold stat numbers in vivid theme colors (Electric Cyan `#38bdf8`, Amber `#fbbf24`, Rose Coral `#fb7185`, Mint Emerald `#34d399`) with subtle uppercase silver labels (`#7d8b9e`).
- Charts & Visualization:
  - Severity classification donut chart with emerald, amber, and rose sectors.
  - Priority distribution vertical bars in mint green (`#34d399`).
  - Horizontal ward volume bars in electric sky cyan (`#38bdf8`).
  - 14-day timeline area chart with electric cyan stroke and semi-transparent cyan glow fill.
- Map Integration: Dark Carto / midnight inverted OpenStreetMap tiles (`#05070a` container, `#181d26` border) with glowing pink/amber/emerald hotspot circles and dark pill legend overlay.
- Form Inputs: Dark slate inputs (`#07090c`, border `#1e2430`) with cyan focus halos (`#0ea5e9`).


### HotspotDrawer
File: `frontend/src/components/HotspotDrawer.tsx`
- Panel: `bg-white shadow-drawer border-l border-slate-200`
- What-If Slider: Accent civic with live green delta chip
- Dispatch Action: 1-click team dispatch with audit confirmation

### Cinematic Landing Experience
Files: `frontend/src/pages/LandingPage.tsx`, `frontend/src/components/cinematic/CinematicCanvas.tsx`, `frontend/src/components/cinematic/CinematicOverlay.tsx`
- Container: Fullscreen pinned viewport (`sticky top-0 h-[100dvh] w-full`) driven by a 600vh scroll container.
- Canvas Scaling: Mathematical `object-fit: cover` with devicePixelRatio support and smooth requestAnimationFrame rendering.
- Color Palette: Deep space black (`#000000`), glowing electric blue (`#3b82f6`), vivid cyan (`#22d3ee`), neon neural pulses, and warm amber streetlights.
- Typography: Bold uppercase display headings (`tracking-tighter font-black text-white`) with high-contrast ambient drop shadows (`drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]`).
- Minimal Floating Header: Floating brand pill with pulsing cyan orb and compact glass `ENTER APP →` button.
- CTA Button: Dark translucent glass (`bg-black/50 hover:bg-black/70 border border-blue-400/50 hover:border-cyan-400/80 backdrop-blur-xl`) with soft sapphire/cyan radiance (`shadow-[0_0_35px_rgba(37,99,235,0.35)]`), scale lift (1.02), and directional arrow translation.
