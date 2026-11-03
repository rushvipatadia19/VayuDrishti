# 09. API Contract: VayuDrishti

**Owner:** Vaidehi · **This file and `lib/types.ts` win over every other doc.** Change it only by telling everyone and adding a line to the change log at the bottom.

## §1 Conventions
- Base path `/api`, same origin. JSON in, JSON out. Field names are camelCase (`db.ts` maps from the snake_case columns).
- Every response is `{ success: true, data, message? }` or `{ success: false, error, code? }`.
- Dates are ISO 8601 strings in UTC. Units are µg/m³.
- Types are in `lib/types.ts` (see `08_DATABASE_DESIGN.md` §5). Add these map types there too (`Reading` also gains `aqi` and `aqiBucket`, and `Analysis` gains `currentAqi` and `aqiBucket`):

```typescript
export interface Station { id: string; name: string; city: string; state: string; lat: number; lng: number }
export interface StationSummary extends Station {
  latestPm25: number | null; latestPm10: number | null;
  aqi: number | null; aqiBucket: string | null;      // CPCB band: Good, Satisfactory, Moderate, Poor, Very Poor, Severe
  measuredAt: string;
}
```

- Status values: `open` → `under_review` → `action_taken` → `closed`.
- Allowed status changes: `open → under_review`, `under_review → action_taken`, `under_review → open`, `action_taken → closed`, `action_taken → under_review`. `closed` is final. Anything else returns `409 BAD_TRANSITION`.
- If Supabase is unavailable, reads return seed data with HTTP 200 and `message: "Showing demo data"`.
- No login. Nothing in this contract needs auth.

## §2 Endpoints

| # | Method and path | Purpose | Screen | Must / Should |
| --- | --- | --- | --- | --- |
| 1 | `GET /api/health` | liveness | none | Must |
| 2 | `GET /api/stations` | all locations across India with latest AQI (map pins) | dashboard map, report form | Must |
| 3 | `GET /api/stations/[id]/readings?pollutant=PM2.5&days=30` | daily readings for charts | map side panel, case page | Must |
| 4 | `GET /api/incidents` | list cases | cases list | Should |
| 5 | `POST /api/incidents` | submit a report | report form | Must |
| 6 | `GET /api/incidents/[id]` | case with events and latest analysis | case page | Must |
| 7 | `POST /api/analyze` | run analysis and explanation | case page | Must |
| 8 | `POST /api/incidents/[id]/events` | log a corrective action | case page | Must |
| 9 | `PATCH /api/incidents/[id]` | change status | case page | Must |

### 1. `GET /api/health`
Response: `{ "success": true, "data": { "status": "ok" } }`

### 2. `GET /api/stations`
Response `data`: `StationSummary[]` (about 26 city-level locations in the demo seed)
```json
{ "success": true, "data": [ { "id": "loc-delhi", "name": "Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.61, "lng": 77.21,
  "latestPm25": 142, "latestPm10": 260, "aqi": 312, "aqiBucket": "Very Poor", "measuredAt": "2019-11-03T00:00:00Z" } ] }
```
The map shows one pin per entry, coloured by `aqiBucket` with the bucket name as text too.

### 3. `GET /api/stations/[id]/readings`
Query: `pollutant` = `PM2.5` or `PM10` (default `PM2.5`), `days` = 1 to 90 (default 30).
Response `data`: `Reading[]`, one per day (a 24-hour average), oldest first.
```json
{ "success": true, "data": [ { "id": "r-1", "stationId": "stn-01", "pollutant": "PM2.5", "value": 48.2, "aqi": 96, "aqiBucket": "Satisfactory", "measuredAt": "2019-10-30T00:00:00Z" } ] }
```
Errors: `404 NOT_FOUND` unknown station; `400 VALIDATION` bad query.

### 4. `GET /api/incidents`
Response `data`: `Incident[]`, newest first.

### 5. `POST /api/incidents`
Request:
```json
{
  "title": "Heavy dust and smell near the plant gate",
  "description": "Started this morning, visibility low.",
  "pollutant": "PM2.5",
  "reportedValue": 142,
  "stationId": "stn-01",
  "locationName": "Near Example Industrial Area",
  "imageUrl": "https://res.cloudinary.com/<cloud>/image/upload/v1/example.jpg"
}
```
Rules: `title` 1–120 chars; `description` up to 1000; `pollutant` is `PM2.5` or `PM10`; `reportedValue` 0–2000 or null; `stationId` must exist; `imageUrl` optional, a Cloudinary https URL or null.
Response `201`, `data`: `Incident` with `status: "open"`. A `report` case event is created.
Errors: `400 VALIDATION`, `404 NOT_FOUND` (unknown station).

### 6. `GET /api/incidents/[id]`
Response `data`:
```json
{
  "incident": { "id": "…", "title": "…", "status": "open", "pollutant": "PM2.5", "stationId": "stn-01", "…": "…" },
  "events": [ { "id": "…", "incidentId": "…", "kind": "report", "text": "…", "imageUrl": null, "fromStatus": null, "toStatus": null, "createdAt": "…" } ],
  "analysis": null
}
```
`events` are newest first. `analysis` is the latest saved `Analysis` or `null`.
Errors: `404 NOT_FOUND`.

### 7. `POST /api/analyze`
Request: `{ "incidentId": "…" }`
What happens: data-quality check, z-score against the 30-day baseline, short forecast (next 3 days), the daily 24-hour average vs the 24-hour limit (all code), then the explanation (cache → Hugging Face → fallback). The result is saved and an `analysis` case event is added.
Response `data`: `Analysis`
```json
{
  "id": "…", "incidentId": "…",
  "isAnomaly": true, "zScore": 3.8,
  "forecast": [ { "t": "2019-11-04T00:00:00Z", "value": 151.2 } ],
  "currentAqi": 312, "aqiBucket": "Very Poor",
  "threshold": { "limit": 60, "unit": "µg/m³", "averagingPeriod": "24h", "standard": "CPCB NAAQS", "observed": 142, "exceeded": true, "ratio": 2.37 },
  "standardRef": { "name": "CPCB NAAQS", "clause": "PM2.5, 24-hour", "excerpt": "…" },
  "dataQuality": "valid",
  "unknowns": ["Source of the spike is not established", "Instrument calibration not verified"],
  "explanation": "…3 to 4 plain sentences…",
  "nextStep": "Verify the instrument and dispatch an officer to inspect nearby sources.",
  "cacheHit": true, "fallback": false, "createdAt": "…"
}
```
`fallback: true` means the explanation came from fixed wording because the model was unavailable. The HTTP status is still 200. The numbers (`isAnomaly`, `threshold`, `forecast`) never come from the model.
Errors: `400 VALIDATION`, `404 NOT_FOUND`.

### 8. `POST /api/incidents/[id]/events`
Request: `{ "kind": "action", "text": "Inspection team sent to the site gate.", "imageUrl": null }`
Rules: `kind` is `action`; `text` 1–500 chars; `imageUrl` optional.
Response `201`, `data`: `CaseEvent`.
Errors: `400 VALIDATION`, `404 NOT_FOUND`, `409 BAD_TRANSITION` (adding to a closed case is not allowed).

### 9. `PATCH /api/incidents/[id]`
Request: `{ "status": "under_review", "reason": "Officer assigned" }` (`reason` optional, up to 200 chars)
Response `data`: updated `Incident`. A `status_change` case event is written with `fromStatus` and `toStatus`.
Errors: `400 VALIDATION`, `404 NOT_FOUND`, `409 BAD_TRANSITION`.

## §3 Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION` | 400 | body or query failed validation |
| `NOT_FOUND` | 404 | station or incident does not exist |
| `BAD_TRANSITION` | 409 | status change or action not allowed |
| `INTERNAL` | 500 | unexpected error (friendly message, no stack trace) |

## §4 Screen to endpoint map

| Screen | Calls |
| --- | --- |
| Dashboard (India map) | 2, 3 (side panel chart), 4 (recent cases) |
| Report form | 2, 5 (and the Cloudinary upload in the browser, before 5) |
| Case page (chart + infographics) | 6, 3, 7, 8, 9 |

## §5 Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-11-03 | First version | Vaidehi |
| 2026-11-03 | Scope is all of India: `StationSummary` for the map, daily readings (`days`), `currentAqi` and `aqiBucket` on `Analysis` | Vaidehi |
