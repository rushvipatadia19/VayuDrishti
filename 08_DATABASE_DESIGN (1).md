# 08. Database Design

**For:** Shreya · Keep to 4 entities. Spend at most 15 minutes here.

## §1 Decide first

**Our choice (decided):** Supabase (Postgres) with `data/seed.json` as read-only fallback, and Cloudinary for images (only the URL is stored here), because the case history (actions and status changes) must survive requests and refreshes, and writes to JSON files do not persist on Vercel. No user accounts: a single "Continue as demo user" button, or none.

**Fallback rule:** `lib/db.ts` tries Supabase; on any error it reads `data/seed.json` (read-only) and the UI shows a toast "Showing demo data". Writes in fallback mode go to an in-memory array (lost on restart, fine for a rescue demo).

## §2 Entities

| Entity | Purpose | Fields (name: type) | Relations |
| --- | --- | --- | --- |
| `incidents` | the reported concern and its current status | id: uuid, title: text, description: text, pollutant: text ('PM2.5' or 'PM10'), reported_value: float (µg/m³, optional), station_id: text, location_name: text, lat: float, lng: float, image_url: text (Cloudinary secure_url, optional), status: text, created_at: timestamptz | has many `readings` (by station), one latest `analyses`, many `case_events` |
| `readings` | daily (24-hour average) PM values for a location | id: uuid, station_id: text, pollutant: text, value: float, aqi: float (optional), aqi_bucket: text (optional), measured_at: timestamptz | belongs to a location (location metadata lives in `seed.json`) |
| `analyses` | saved result of one "Analyze" run | id: uuid, incident_id: uuid → incidents, is_anomaly: boolean, z_score: float, forecast: jsonb, threshold: jsonb, standard_ref: jsonb, data_quality: text, unknowns: jsonb, explanation: text, next_step: text, cache_hit: boolean, fallback: boolean, created_at: timestamptz | belongs to `incidents` |
| `case_events` | history of the incident: actions, notes, status changes | id: uuid, incident_id: uuid → incidents, kind: text ('report', 'analysis', 'action', 'status_change'), text: text, image_url: text (optional), from_status: text, to_status: text, created_at: timestamptz | belongs to `incidents` |

**Status values (the only allowed ones):** `open` → `under_review` → `action_taken` → `closed`.

`stations` (id, name, lat, lng) and the short **standards snippets** (3 to 4 entries: name, clause, limit, averaging period, excerpt) are kept in `data/seed.json` only, not in the database.

## §3 SQL skeleton (Supabase SQL editor)

```sql
create table incidents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  pollutant text not null check (pollutant in ('PM2.5','PM10')),
  reported_value float,
  station_id text not null,
  location_name text not null,
  lat float,
  lng float,
  image_url text,
  status text not null default 'open'
    check (status in ('open','under_review','action_taken','closed')),
  created_at timestamptz default now()
);

create table readings (
  id uuid default gen_random_uuid() primary key,
  station_id text not null,
  pollutant text not null,
  value float not null,
  aqi float,
  aqi_bucket text,
  measured_at timestamptz not null
);
create index on readings (station_id, pollutant, measured_at);

create table analyses (
  id uuid default gen_random_uuid() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  is_anomaly boolean,
  z_score float,
  forecast jsonb,
  threshold jsonb,
  standard_ref jsonb,
  data_quality text default 'valid',
  unknowns jsonb,
  explanation text,
  next_step text,
  cache_hit boolean default false,
  fallback boolean default false,
  created_at timestamptz default now()
);

create table case_events (
  id uuid default gen_random_uuid() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  kind text not null check (kind in ('report','analysis','action','status_change')),
  text text,
  image_url text,
  from_status text,
  to_status text,
  created_at timestamptz default now()
);
```
If reads come back empty in the app, the usual cause is Row Level Security on new tables with no policy. This demo has no private data, so disable RLS on these four tables or add a simple read/insert policy.

## §4 Supabase client and naming

```typescript
// lib/db.ts (server only; use the service role key only on the server, never NEXT_PUBLIC_)
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

**Naming rule (avoids a common bug):** columns are `snake_case`, but `lib/types.ts` is `camelCase`. Supabase returns snake_case as-is, so `db.ts` must convert in one place (a small `toCamel()` for rows coming out and `toSnake()` going in). Do not map by hand in routes or components.

## §5 Shared types (one file, both sides import it)

```typescript
// lib/types.ts   (only Vaidehi edits; must match 09_API_CONTRACT.md)
export type Pollutant = 'PM2.5' | 'PM10';
export type CaseStatus = 'open' | 'under_review' | 'action_taken' | 'closed';

export interface Incident {
  id: string; title: string; description: string; pollutant: Pollutant;
  reportedValue: number | null; stationId: string; locationName: string;
  lat: number | null; lng: number | null; imageUrl: string | null; status: CaseStatus; createdAt: string;
}
export interface Reading { id: string; stationId: string; pollutant: Pollutant; value: number; aqi: number | null; aqiBucket: string | null; measuredAt: string }

export interface ThresholdCheck {
  limit: number; unit: 'µg/m³'; averagingPeriod: string; standard: string;
  observed: number; exceeded: boolean; ratio: number;     // observed / limit
}
export interface StandardRef { name: string; clause: string; excerpt: string }
export interface Analysis {
  id: string; incidentId: string; isAnomaly: boolean; zScore: number;
  forecast: { t: string; value: number }[];
  threshold: ThresholdCheck; standardRef: StandardRef;
  currentAqi: number | null; aqiBucket: string | null;
  dataQuality: 'valid' | 'stale' | 'implausible' | 'missing'; unknowns: string[];
  explanation: string; nextStep: string;
  cacheHit: boolean; fallback: boolean; createdAt: string;
}
export interface CaseEvent {
  id: string; incidentId: string; kind: 'report' | 'analysis' | 'action' | 'status_change';
  text: string; imageUrl: string | null; fromStatus: CaseStatus | null; toStatus: CaseStatus | null; createdAt: string;
}
export interface ApiOk<T> { success: true; data: T; message?: string }
export interface ApiErr { success: false; error: string; code?: string }
```

## §6 Seed data (`data/seed.json`)
- `stations`: about 26 city-level locations across India (id, name, city, state, lat, lng; city coordinates you type in once). The Kaggle station file has no coordinates, so pins are city-level; say so on the map.
- `readings`: about 45 daily rows per city (PM2.5, PM10, AQI, AQI bucket) from the Kaggle "Air Quality Data in India" city-level daily file. Pick a window where real spikes exist (for example the weeks around Diwali 2019 in northern cities; check the numbers first) so the anomaly and threshold check fire on **real** data. If nothing fires, add one staged spike and label it simulated. Label the whole dataset "historical, not live" in the UI. Daily values are 24-hour averages, so they compare directly with the 24-hour limit.
- `incidents`: 3 demo scenarios: (1) clear exceedance, (2) borderline, (3) normal fluctuation that should NOT be flagged. Each with realistic text, no "test123", no lorem ipsum.
- `standards`: 3 to 4 snippets. Check the PM2.5 / PM10 limits against the official CPCB NAAQS table before you paste them. If you add the WHO guideline as a second reference, label it as a guideline, not a legal limit.
- Images: no image files in the repo. Seed incidents have `imageUrl: null` (or one Cloudinary URL you upload beforehand).
- Load the same file into Supabase with a one-off script, and run it against production before the demo. Pre-compute the analysis for the 3 scenarios into `data/ai-cache.json`.
