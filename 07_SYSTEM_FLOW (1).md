# 07. System Flow

**For:** everyone · Keep each flow to about 10 lines.

## §1 Overall flow

```
User ──▶ Screen (Next.js page)
        │ user action
        ▼
   api()/useApi()  ──HTTP──▶ Route Handler ──▶ validate (Zod)
                                                ├─▶ data: Supabase ──(error)──▶ seed.json
                                                ├─▶ analysis: lib/analysis.ts (z-score, forecast, threshold)
                                                └─▶ AI: cache ─▶ Hugging Face model ─▶ fallback text
        ◀── { success, data | error } ◀──────────┘
        │
   UI states: loading → data | error | empty
   (optional image: browser ──▶ Cloudinary ──▶ secure_url ──▶ sent with the report)
```

## §2 Feature flows (one per Must-have)

### Feature 0: Dashboard map (India)  (FR-01)
```
1. User does: opens the dashboard
2. UI calls:  GET /api/stations (and GET /api/incidents for recent cases)
3. Backend:   return about 26 city-level locations with latest AQI and CPCB band
4. UI shows:  full India map with one pin per location, coloured by AQI band and labelled with the band name;
              click a pin → side panel with a small 30-day chart (GET /api/stations/[id]/readings) and "Report an incident here"
5. If it fails: error banner with Retry; seed data loads with a "Showing demo data" toast
```

### Feature 1: Report and investigate  (US-01, FR-01)
```
1. User does: fills the report form (station, pollutant, value, description, optional photo) and submits
              (photo, if any, is uploaded to Cloudinary first; the form sends back only its URL)
2. UI calls:  POST /api/incidents with { title, description, pollutant, reportedValue, stationId, locationName, imageUrl? }
3. Backend:   validate → insert incident (status "open") + a "report" case event → return the incident
4. UI shows:  case page with the incident details and the recent readings chart for that station
              (GET /api/stations/[id]/readings)
5. If it fails: error banner with Retry; if Supabase is down, the demo incident from seed.json opens instead
```

### Feature 2: Analyze and check compliance  (US-02, FR-02)
```
1. User does: presses "Analyze" on the case page
2. UI calls:  POST /api/analyze with { incidentId }
3. Backend:   validate → load recent readings → data-quality status → z-score vs 30-day baseline
              → 3-day forecast → daily (24 h) average vs the 24 h limit from the standards seed (deterministic)
              → explanation: cache → Hugging Face model → fallback text → save analysis + "analysis" case event
4. UI shows:  infographic panel: current AQI and CPCB band, observed vs limit bar with the ratio, z-score gauge,
              chart with baseline band and forecast, plus cited standard and clause, plain-language explanation, next step,
              "what is not yet known", badge ⚡ Instant (cache) or ✨ Just generated, and the label
              "AI-assisted screening, not an official regulatory decision"
5. If it fails: the numeric results still show; the explanation falls back to fixed wording (HTTP 200)
```

### Feature 3: Record action and track the case  (US-03, FR-03)
```
1. User does: adds a corrective action or note, and/or changes the status
2. UI calls:  POST /api/incidents/[id]/events { kind, text, imageUrl? }  and/or  PATCH /api/incidents/[id] { status }
3. Backend:   validate → check the status change is allowed (open → under_review → action_taken → closed)
              → update the incident → write a case event (with from/to status) → return the updated case
4. UI shows:  status badge updated and a timeline of every event, newest first
5. If it fails: toast with the API's error text; a disallowed status change returns 409 and the status stays
```

## §3 AI flow

```
User clicks Analyze → api('/analyze', POST { incidentId })
  → validate
  → analysis.ts computes: dataQuality, zScore, forecast, thresholdCheck   (no model involved)
  → key = incidentId (seeded) or stationId|pollutant|rounded value
  → in data/ai-cache.json or Map?
       YES → { explanation, cacheHit: true }            (~50 ms)
       NO  → Hugging Face chat completion (~1–3 s, 8 s timeout) → store in Map → { cacheHit: false }
       HF error / timeout / bad JSON → fallback explanation built from the computed facts (still HTTP 200)
  → UI badge: ⚡ Instant (cacheHit) or ✨ Just generated
```

## §4 Error flow
Any failing call throws in `api()`. `useApi` sets `error`; the screen shows `ErrorBanner` with Retry. Mutations show a toast with the API's `error` text. A route never returns raw errors. If Supabase fails, reads fall back to `seed.json` with a "Showing demo data" toast.

## §5 Team and code flow

```
docs agreed ─▶ Diva: feat/frontend  ─┐
            ─▶ Shreya: feat/backend ├─▶ Pull Request ─▶ Vaidehi merges to main ─▶ Vercel auto-deploys
            ─▶ Rushvi: deck + README ┘
```
Merge points: about 1:30 into the build (skeleton, stub routes, first screens), 2:45 (real integration), then at every checkpoint. Details in `12_IMPLEMENTATION_PLAN.md`, which must be compressed to a 5-hour window.
