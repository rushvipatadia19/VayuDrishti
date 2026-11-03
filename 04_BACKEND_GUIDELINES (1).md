# 04. Backend Guidelines

**For:** Shreya (and anyone writing API code) · Read before writing any route.

## §1 Principles
- The backend is **Route Handlers** inside the Next.js app: `app/api/**/route.ts`. No separate server (no FastAPI, no Docker).
- The contract is the boss: implement exactly what `docs/09_API_CONTRACT.md` and `lib/types.ts` say. Do not change names, shapes or status codes without telling Vaidehi.
- Order of work: stub routes that return `data/seed.json` first, then Supabase, then analysis, then the AI explanation.
- **Compliance decisions are made in code, never by the model.** Anomaly flag, forecast and "limit exceeded" come from `lib/analysis.ts` and the `standards` seed. The model only explains.

## §2 Response helpers

```typescript
// lib/response.ts
import { NextResponse } from 'next/server';
export const ok = <T,>(data: T, message?: string, status = 200) =>
  NextResponse.json({ success: true, data, message }, { status });
export const fail = (error: string, status = 400, code?: string) =>
  NextResponse.json({ success: false, error, code }, { status });
```

## §3 A route with validation (Next 16)

```typescript
// app/api/incidents/route.ts
import { z } from 'zod';
import { ok, fail } from '@/lib/response';
import { listIncidents, createIncident } from '@/lib/db';

const CreateIncident = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  pollutant: z.enum(['PM2.5', 'PM10']),
  reportedValue: z.number().min(0).max(2000).nullable().optional(),
  stationId: z.string().min(1),
  locationName: z.string().min(1).max(120),
  imageUrl: z.string().url().nullable().optional(),   // Cloudinary secure_url
});

export async function GET() { return ok(await listIncidents()); }

export async function POST(req: Request) {
  const parsed = CreateIncident.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Invalid input', 400, 'VALIDATION');
  return ok(await createIncident(parsed.data), 'Created', 201);
}

// app/api/incidents/[id]/route.ts : params is a Promise in Next 16
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // look it up; return fail('Not found', 404, 'NOT_FOUND') if missing
}
```
**Data rules:** all reads and writes go through `lib/db.ts` (Supabase first, `seed.json` fallback). `db.ts` is the only place that converts snake_case columns to the camelCase in `lib/types.ts`. Writes to a JSON file do not persist on Vercel, so never use JSON as the write store.

## §4 Analysis (plain code, no model)

```typescript
// lib/analysis.ts (sketch; unit-test with 5 cases before the demo)
export function zScore(latest: number, window: number[]) {
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const sd = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length) || 1;
  return (latest - mean) / sd;                       // window = trailing 30 daily values; flag if > 3 (tune on seed data)
}
export function thresholdCheck(observed: number, limit: number) {
  return { observed, limit, exceeded: observed > limit, ratio: observed / limit };
}
// forecast: simple linear trend or exponential smoothing over the last 14-30 daily values, next 3 days
```
Compare like with like: seed readings are daily (24-hour) averages, so they compare directly with the 24-hour limit. Show the averaging period in the result, and never compare a 24-hour limit with a single instantaneous reading. Return `dataQuality` ('valid' | 'stale' | 'implausible' | 'missing') and an `unknowns: string[]` list with every analysis.

## §5 AI explanation route (Hugging Face, cache + fallback)

```typescript
// lib/ai.ts  (written from the HF Inference Providers docs; not run yet, so test it)
import precached from '@/data/ai-cache.json';            // { "<incidentId>": <explanation object> }
const memory = new Map<string, unknown>();               // warm-instance help only; the JSON file is the real cache

export async function explain(key: string, facts: ExplainFacts) {
  const hit = (precached as Record<string, unknown>)[key] ?? memory.get(key);
  if (hit) return { result: hit, cacheHit: true, fallback: false };
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.HF_MODEL ?? 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: buildPrompt(facts) }],
        temperature: 0.2,
        max_tokens: 800,                                  // reasoning models need room before the answer
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HF ${res.status}`);
    const json = await res.json();
    const result = safeParseJson(json.choices?.[0]?.message?.content ?? '');
    if (!result) throw new Error('bad json');
    memory.set(key, result);
    return { result, cacheHit: false, fallback: false };
  } catch {
    return { result: fallbackExplanation(facts), cacheHit: false, fallback: true };   // never 500 on the demo path
  }
}

function safeParseJson(text: string) {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return null; }
}
```
- `buildPrompt` and `fallbackExplanation` live in `lib/ai.ts`. The fallback builds the same fields from the standard and threshold results with fixed wording, so the UI never changes shape.
- The cache key for seeded incidents is the incident id; for new incidents use `stationId|pollutant|rounded value`.
- Pre-generate the 3 demo scenarios into `data/ai-cache.json`. HF free credits are small, so assume the live call may fail.
- If a call signature or the model name differs, check the HF Inference Providers docs and change `HF_MODEL` only.

## §6 Prompt rules
1. Pass the facts (readings summary, z-score, threshold, limit, averaging period, the standards snippet) and ask for exact JSON keys. Say "Return ONLY the JSON".
2. Tell the model: do not decide or compute whether the limit is exceeded; do not state a legal violation; use the supplied limit only; if something is unknown, put it in `unknowns`.
3. Keep prompts short (under about 800 tokens) and use `temperature: 0.2`.
4. Parse safely (strip fences, try/catch, fallback).
5. Test on 5 cases (clear exceedance, borderline, normal fluctuation, missing value, very long description) before the demo.
6. Neutral wording: "potential concern", never blame a named facility.

**Prompt template**

```
You are an environmental compliance assistant helping an officer review an air-quality incident.
Facts (computed by our code, do not recalculate):
- Pollutant: {{pollutant}} at {{station}}; observed {{observed}} µg/m³ ({{averagingPeriod}} average)
- Applicable limit: {{limit}} µg/m³ ({{standardName}}, {{clause}}); exceeded: {{exceeded}}; {{ratio}}x the limit
- Anomaly: z-score {{z}} against the recent baseline; data quality: {{dataQuality}}
Relevant official text: """{{standardExcerpt}}"""
Return this exact JSON and nothing else:
{
  "explanation": "<3-4 plain sentences on why this was flagged, citing the standard above>",
  "nextStep": "<one practical next step for the officer>",
  "unknowns": ["<what is not yet established>"]
}
Do not state that a legal violation occurred. Use only the limit given above.
```

## §7 Security and errors
- `HF_TOKEN` only in server code; never `NEXT_PUBLIC_`. Cloudinary values are public by design (unsigned preset); the Cloudinary API secret is never used in this app.
- Zod on every body; length cap on AI input.
- Return friendly errors. No stack traces, no keys in responses; no `console.log` of secrets.

## §8 Task prompt for Antigravity (one task at a time keeps quota use low)

```
Read docs/04_BACKEND_GUIDELINES.md, docs/06_BACKEND_ARCHITECTURE.md, docs/08_DATABASE_DESIGN.md, docs/09_API_CONTRACT.md and lib/types.ts.
Task: implement [endpoint, e.g. POST /api/analyze] exactly as in docs/09_API_CONTRACT.md.
Rules: Route Handlers only; ok()/fail() from lib/response.ts; Zod safeParse on the body; Next 16 async params;
all data through lib/db.ts (Supabase, seed.json fallback); compliance checks in lib/analysis.ts, never by the model;
do NOT change docs/09_API_CONTRACT.md or lib/types.ts; no new dependencies; no Prisma, Redis, custom auth or separate server.
When done: show me how to test it with curl, and list the files you changed.
```
Always run the curl test yourself before committing.
