# AGENTS.md: VayuDrishti

Read the files in `/docs` before you write code: `01_PRD.md`, `02_TRD.md`, `03`/`04` guidelines, `05`/`06` architecture, `07_SYSTEM_FLOW.md`, `08_DATABASE_DESIGN.md`, `09_API_CONTRACT.md`, `10_UI_UX_DESIGN.md`. If a doc and `09_API_CONTRACT.md` or `lib/types.ts` disagree, the contract and types win.

## Project
VayuDrishti is an air-quality incident and compliance tool for India. A user reports a PM2.5/PM10 concern, the app shows readings and an India map, flags what is unusual, checks the 24-hour limit, explains the applicable standard and suggests a next step, and tracks the case from open to closed. It supports human review and is not an official regulatory decision.

## Stack (do not add to it)
Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4 (tokens in `app/globals.css`, no `tailwind.config.ts`), Zod 4, Supabase (Postgres) with `data/seed.json` as read-only fallback, Cloudinary (unsigned image upload, store only the URL), Hugging Face Inference Providers for the explanation (`HF_MODEL` env var), Recharts, Leaflet (client-side only). Hosting: Vercel.

## Rules
1. `params`, `searchParams`, `cookies()`, `headers()` are async: `await` them.
2. `'use client'` only for hooks, events and browser APIs. Load the Leaflet map client-side only; use `CircleMarker`.
3. TypeScript strict, no `any`.
4. Every data component handles loading (Skeleton), error (ErrorBanner with retry), empty (EmptyState) and data.
5. All HTTP from components goes through `api()` / `useApi()` in `lib/`. No raw `fetch` in components.
6. Backend = Route Handlers in `app/api/**/route.ts`. Responses use `ok()` / `fail()` from `lib/response.ts`. Validate every body with Zod `safeParse`.
7. All data goes through `lib/db.ts` (Supabase first, seed fallback). `db.ts` is the only place that converts snake_case columns to camelCase types.
8. **Compliance decisions are made in code (`lib/analysis.ts`), never by the model.** The model only explains, using facts we pass in. It must never supply or decide a threshold.
9. Secrets: `HF_TOKEN` server-side only, never `NEXT_PUBLIC_`. Never log secrets. Never send personal data to the model.
10. Tailwind tokens only; no inline styles and no raw hex in components. Use the shared `Button`, `Card`, `Badge`, `EmptyState`, `ErrorBanner`.
11. Accessibility: labels on inputs, `aria-label` on icon buttons, `role="alert"` on errors, colour never the only signal (always add text).
12. Mobile first; check at phone width.
13. Do **not** change `lib/types.ts` or `docs/09_API_CONTRACT.md`. Ask Vaidehi.
14. No new dependencies without asking. No Prisma, Redis, custom auth, separate server, Docker, or model training.
15. Neutral wording in UI text: "potential concern", never blame a named facility.

## Ownership (only edit your folders)
- Frontend (Diva): `components/`, `app/` pages.
- Backend and AI (Shreya): `app/api/`, `lib/db.ts`, `lib/analysis.ts`, `lib/ai.ts`, `lib/schemas.ts`, `lib/response.ts`, `data/ai-cache.json`.
- Data (Rushvi): `data/seed.json`, seed and cache scripts, README.
- Shared, change via Vaidehi only: `lib/types.ts`, `docs/`.

## How to work
Small, specific tasks. After each task: run it (browser or curl), show how you tested it, list the files you changed. Never merge or commit code you have not run.

## Commands
```
npm install
npm run dev        # http://localhost:3000
npm run build
npm audit
```
Copy `.env.example` to `.env.local` and fill in the keys (see `docs/02_TRD.md` §3).
