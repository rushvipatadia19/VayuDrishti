# 06. Backend Architecture

**For:** Shreya

## §1 Overview

```
Browser (Next.js UI)
   │  fetch /api/...  (same origin: no CORS)
   │  └─ optional image ──▶ Cloudinary (unsigned upload) ──▶ secure_url sent in the report
   ▼
Route Handlers  app/api/**/route.ts
   │  1. parse JSON  2. Zod validate  3. call lib  4. ok()/fail()
   ├──▶ lib/db.ts ──▶ Supabase (Postgres)  ──(on error)──▶ data/seed.json (read-only)
   ├──▶ lib/analysis.ts   z-score, forecast, threshold check (plain code)
   └──▶ lib/ai.ts ──▶ cache (data/ai-cache.json + Map) ──▶ Hugging Face Inference Providers (pretrained model)
                          │ on error ──▶ rule-based fallback explanation
Deployed on Vercel (env vars set in the dashboard)
```

## §2 Folder layout (backend owner folders are marked ★)

```
app/api/
├── health/route.ts                    # ★ GET → { success: true }
├── stations/route.ts                  # ★ locations + latest AQI for the map
├── stations/[id]/readings/route.ts    # ★ daily readings for charts
├── incidents/route.ts                 # ★ GET list, POST create
├── incidents/[id]/route.ts            # ★ GET detail, PATCH status
├── incidents/[id]/events/route.ts     # ★ POST action or note (case history)
└── analyze/route.ts                   # ★ POST analysis + explanation
lib/
├── response.ts                # ★ ok() / fail()
├── schemas.ts                 # ★ Zod schemas for request bodies
├── db.ts                      # ★ Supabase client, seed fallback, snake_case ⇄ camelCase mapper
├── analysis.ts                # ★ rolling z-score, forecast, threshold check, data-quality status
├── ai.ts                      # ★ HF call, prompt builder, parse, cache, fallback
└── types.ts                   # SHARED (Vaidehi edits only)
data/
├── seed.json                  # SHARED: stations, readings, incidents, standards snippets
└── ai-cache.json              # ★ pre-generated demo explanations
```

## §3 Layers and responsibilities

| Layer | Does | Must not |
| --- | --- | --- |
| Route Handler | parse, validate, call lib, format response | contain business logic or prompts |
| `schemas.ts` | Zod schemas, one per request body | duplicate type names from `types.ts` |
| `db.ts` | read/write Supabase, fall back to seed, map column names | know about HTTP |
| `analysis.ts` | z-score, forecast, threshold comparison, data-quality status | call the model |
| `ai.ts` | prompt, HF call, parsing, cache, fallback | decide compliance; throw to the route without a fallback |

## §4 AI service design

| Part | Decision |
| --- | --- |
| Provider | Hugging Face Inference Providers, `https://router.huggingface.co/v1/chat/completions` (OpenAI-compatible) |
| Model | `process.env.HF_MODEL` (default `openai/gpt-oss-120b`; test in the HF Playground first) |
| Role | explanation, applicable standard in plain words, one next step, list of unknowns |
| Not its role | deciding "exceeded", supplying thresholds, forecasting |
| Settings | `temperature: 0.2`, `max_tokens: 800`, 8 s timeout |
| Input | facts computed by `analysis.ts` + one standards snippet from the seed; no personal data |
| Cache key | incident id (seeded) or `stationId|pollutant|rounded value` |
| Cache order | `data/ai-cache.json` → in-memory `Map` → HF |
| On failure | rule-based fallback explanation, `fallback: true`, HTTP 200 |
| Demo prep | run the 3 demo incidents once, paste results into `ai-cache.json` |

HF free accounts have a small monthly credit, so treat live calls as a bonus and the cache as the real path.

## §5 Data decision
Supabase for incidents, readings, analyses and case events, because case history must persist and JSON writes do not persist on Vercel. `data/seed.json` is the read-only fallback and also holds stations and the 3–4 standards snippets. Tables are in `08_DATABASE_DESIGN.md`; create the Supabase project during the event; client in `lib/db.ts`.

## §6 Error handling

| Case | Status | `code` |
| --- | --- | --- |
| Invalid input | 400 | `VALIDATION` |
| Not found | 404 | `NOT_FOUND` |
| Invalid status change | 409 | `BAD_TRANSITION` |
| Unexpected error | 500 | `INTERNAL` (friendly message, no stack trace) |
| AI failure | 200 with fallback | none |
| Supabase failure | 200 from seed, `message: "Showing demo data"` | none |

## §7 Deployment
Vercel from GitHub `main`. Set `HF_TOKEN`, `HF_MODEL`, the Supabase vars and the Cloudinary vars in the Vercel dashboard. Redeploy after changing env vars. Deploy a hello-world by about 0:45 of the build; deploy every hour.

## §8 What we deliberately do not build
Separate server (FastAPI/Express), Docker, PostGIS, pgvector and embeddings, Prisma, Redis, custom auth or roles, admin panel, rate limiters, PDF export, SMS or push notifications, model training. They are roadmap items.
