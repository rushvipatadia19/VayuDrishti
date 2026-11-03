# 05. Frontend Architecture

**For:** Diva · Read with `03_FRONTEND_GUIDELINES.md` and `10_UI_UX_DESIGN.md`. If this file and `09_API_CONTRACT.md` / `lib/types.ts` disagree, the contract and types win.

## §1 Overview

```
Browser
 ├─ Server Components (default)     layout, static shells, page frames
 └─ Client Components ('use client') hooks, events, Leaflet, Recharts, forms, photo upload
        │  useApi() / api()  (lib/)  ── same-origin fetch ──▶ /api/** Route Handlers
        └─ PhotoUpload ──▶ Cloudinary (unsigned) ──▶ secure_url ──▶ sent inside POST /api/incidents
```

- One Next.js 16 app (App Router, React 19, TypeScript strict, Tailwind 4). No separate frontend repo.
- Pages are thin: a Server Component frame that renders one Client Component which owns the data fetching.
- All HTTP goes through `lib/api.ts` / `lib/useApi.ts`. No raw `fetch` in components (the one exception is the Cloudinary upload inside `PhotoUpload`, because it is not our API).

## §2 Folder layout (frontend-owned folders marked ★)

```
app/
├── layout.tsx                  ★ header, "Historical data" label, main container
├── globals.css                 ★ Tailwind 4 @theme tokens
├── page.tsx                    ★ Dashboard (map + recent cases)
├── report/page.tsx             ★ Report form (reads ?stationId= from searchParams)
├── cases/page.tsx              ★ Cases list (Should; first thing on the cut list)
├── cases/[id]/page.tsx         ★ Case page (await params)
├── error.tsx                   ★ friendly error boundary
├── not-found.tsx               ★ friendly 404
└── api/**                      (backend owner, do not edit)
components/
├── ui/                         ★ Button, Card, Badge, EmptyState, ErrorBanner, Skeleton, Toast
├── dashboard/                  ★ DashboardView, IndiaMap, StationPanel, RecentCases, AqiLegend
├── report/                     ★ ReportForm, PhotoUpload
└── case/                       ★ CaseView, CaseHeader, StatusStepper, InfoCards (AqiCard, LimitCard,
                                   AnomalyGauge, QualityCard), ReadingsChart, AnalysisPanel,
                                   ActionForm, Timeline
lib/
├── api.ts, useApi.ts           shared (Vaidehi)
├── aqi.ts                      AQI band helper
├── format.ts                   ★ date, number and ratio formatters
└── types.ts                    SHARED (Vaidehi edits only)
```

## §3 Routes and data

| Route | Client component | Calls (file 09) | Notes |
| --- | --- | --- | --- |
| `/` | `DashboardView` | 2, 3 (panel chart), 4 (recent cases) | Map loaded with `next/dynamic`, `ssr: false` |
| `/report?stationId=` | `ReportForm` | 2 (location select), 5 | Photo uploaded to Cloudinary first; form sends only the URL |
| `/cases` | `CasesList` | 4 | Optional |
| `/cases/[id]` | `CaseView` | 6, 3, 7, 8, 9 | Analyze is a button, never automatic |

## §4 State management
No global store. Three kinds of state only:

| Kind | Where | Example |
| --- | --- | --- |
| Server data | `useApi<T>(path)` in the owning view | stations, incident, readings |
| Mutations | local `async` handler + `api(path, { method, body })`, then `refetch()` | submit report, add action, change status |
| UI state | `useState` in the component | selected station, form fields, drawer open |

Rules:
- The case page calls `useApi` for the incident (6) and for readings (3) separately, so a chart failure does not hide the case.
- After `POST /events`, `PATCH` status or `POST /analyze`, call `refetch()` on endpoint 6 so the timeline, status and analysis all refresh from one source.
- Analysis result comes from `POST /analyze` (store in local state) and from `analysis` in endpoint 6 on reload.
- Mutations show a `Toast` with the API `error` text on failure. Reads show `ErrorBanner` with Retry.

## §5 Component tree

```
Dashboard (/)
└─ DashboardView
   ├─ Hero line + "Report an incident" Button
   ├─ IndiaMap (dynamic, client-only)  + AqiLegend
   ├─ StationPanel (side panel on ≥ md, bottom drawer on phones)
   │   └─ ReadingsChart (30 days, small)
   └─ RecentCases (3 Cards)

Case page (/cases/[id])
└─ CaseView
   ├─ CaseHeader (title, location, time, StatusStepper, photo thumbnail)
   ├─ InfoCards (4): AqiCard · LimitCard · AnomalyGauge · QualityCard   (shown after Analyze; skeleton before)
   ├─ ReadingsChart (baseline band, dashed 3-day forecast, limit line, spike highlight)
   ├─ Button "Analyze this case" ─▶ AnalysisPanel (standard + excerpt, explanation, next step,
   │                                   unknowns, ⚡ Instant / ✨ Just generated badge, disclaimer)
   └─ ActionForm (text + optional PhotoUpload + status select) · Timeline (newest first)
```

## §6 Key implementation decisions

| Topic | Decision |
| --- | --- |
| Map | Plain Leaflet loaded inside `useEffect`; `CircleMarker` pins; OSM attribution visible; label "City-level locations" under the map |
| **Marker colour gotcha** | Leaflet writes `fillColor` to an SVG attribute, where `var(--color-…)` does **not** resolve. Read the token once with `getComputedStyle(document.documentElement).getPropertyValue('--color-aqi-poor')` and pass the resolved value, or keep a small `AQI_HEX` map inside `lib/aqi.ts` generated from the same tokens. Do not hard-code hex in components |
| Charts | Recharts `ComposedChart`: `Area` (baseline band), `Line` (readings), `Line strokeDasharray` (forecast), `ReferenceLine` (limit), `ReferenceDot` (spike). Wrap in `ResponsiveContainer` with an explicit height. Add a text summary under the chart for screen readers |
| Gauge | Pure CSS/SVG (a bar with a marker); no extra dependency |
| AI text | Rendered as plain text. Never `dangerouslySetInnerHTML` |
| Disclaimer | `AnalysisPanel` always shows "AI-assisted screening, not an official regulatory decision" |
| Fallback | If `analysis.fallback` is true, still show every number; the explanation reads normally. No error styling |
| Demo-data label | The header chip "Historical data (2015–2020), not live" is in the root layout and must never be removed |
| Images | `<img>` with `alt`, fixed height, `object-cover`; Cloudinary URL only |
| Dates | `Intl.DateTimeFormat('en-IN')` in `lib/format.ts`; show UTC ISO strings as local readable dates |
| Number font | Numbers use `font-mono` |

## §7 Loading, error, empty (every data screen)

| Screen | Loading | Error | Empty |
| --- | --- | --- | --- |
| Dashboard map | Skeleton `h-[480px]` | ErrorBanner + Retry | EmptyState "No locations found" |
| Station panel chart | Skeleton `h-40` | ErrorBanner + Retry | EmptyState "No readings for this period" |
| Recent cases | 3 Skeleton cards | ErrorBanner + Retry | EmptyState "No cases yet. Report the first concern." |
| Case page | Skeleton header + 4 skeleton cards | ErrorBanner + Retry; 404 shows not-found message | n/a |
| Analysis panel | Button `loading` + skeleton panel | ErrorBanner inside panel, Analyze button stays enabled | "Run the analysis to see evidence" |
| Timeline | Skeleton rows | ErrorBanner | "No events yet" |

If the API returns `message: "Showing demo data"`, show a small Toast once per session.

## §8 Performance and accessibility
- Dynamic-import Leaflet and Recharts views; target first load of the dashboard shell under 2 s on mobile data.
- Skeleton for anything over 300 ms; no spinner over 5 s (show the error state with Retry instead).
- Focus order follows reading order; the drawer on phones traps focus and closes with Escape; icon buttons have `aria-label`.
- Full checklist: `03_FRONTEND_GUIDELINES.md` §9.

## §9 What we deliberately do not build
Global state library (Redux/Zustand), React Query/SWR, UI kit libraries (shadcn, MUI), i18n framework, auth screens, service worker/PWA, animations beyond Tailwind transitions, dark mode. Roadmap items.

## §10 Build order for the frontend (matches `12_IMPLEMENTATION_PLAN.md`)
1. `globals.css` tokens, `components/ui/*`, `lib/aqi.ts`, root layout (0:30–0:50)
2. `IndiaMap` + `DashboardView` on stub data from `data/seed.json` (0:50–1:30)
3. `ReportForm` + `PhotoUpload` (1:30–2:00)
4. `CaseView`: header, status stepper, timeline, action form (2:00–2:30)
5. Infographic cards, `ReadingsChart`, `AnalysisPanel` (2:30–3:00)
6. Polish: states, phone width, copy from file 10 (3:30–4:15)
