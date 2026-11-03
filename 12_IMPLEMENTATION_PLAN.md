# 12. Implementation Plan: VayuDrishti (5-hour build)

**For:** everyone · Times are from the start of the build (0:00), not clock time. One vertical slice at a time. `main` is always deployable.

## §1 Roles and folders

| Person | Role | Owns (only edits these) | Branch |
| --- | --- | --- | --- |
| Vaidehi | Lead, integrator, docs | `docs/`, `lib/types.ts`, merges to `main`, final deploy | `main` |
| Diva | Frontend | `components/`, `app/` pages (not `app/api`) | `feat/frontend` |
| Shreya | Backend and AI | `app/api/`, `lib/db.ts`, `lib/analysis.ts`, `lib/ai.ts`, `lib/schemas.ts`, `lib/response.ts`, `data/ai-cache.json` | `feat/backend` |
| Rushvi | Data and testing, README | `data/seed.json`, the seed and cache scripts, README, test cases | `feat/data` |

Shared files (`lib/types.ts`, `docs/09_API_CONTRACT.md`) change only through Vaidehi. Swap roles by strengths if needed.

## §2 Timeline

| Time | Phase | Done when |
| --- | --- | --- |
| 0:00–0:30 | Handoff and setup | Everyone has read their docs and said back what they will build. Repo created, `AGENTS.md` committed, Next app runs, hello-world live on Vercel. Supabase project created and SQL from `08` run. HF token and model tested in the Playground. Cloudinary unsigned preset created |
| 0:30–1:30 | Parallel foundations | **Diva:** Stitch screens exported, layout, nav, tokens, `IndiaMap` using stub data. **Shreya:** stub routes returning `seed.json` for endpoints 1–9, `db.ts` with Supabase and the snake/camel mapper. **Rushvi:** `seed.json` (about 26 cities, daily readings for the chosen window, standards snippets, 3 demo incidents) and a loader script. **Vaidehi:** `types.ts`, `api.ts`/`useApi.ts`, checks the contract matches |
| **1:30** | **Merge point 1** | Skeleton app on Vercel; dashboard shows the map from stub data; every route answers |
| 1:30–3:00 | Core build | **Diva:** report form with photo upload, case page infographics and chart. **Shreya:** `analysis.ts` (z-score, forecast, threshold), `/api/analyze`, status and events routes, `ai.ts` with cache and fallback. **Rushvi:** load seed into Supabase, 5 test cases for the analysis, pre-generate `ai-cache.json` for the 3 demo incidents. **Vaidehi:** wires real endpoints into screens |
| **3:00** | **Merge point 2** | The full flow works on the deployed URL with real routes: map → report → case → analyze → action → status |
| **3:30** | **Scope freeze** | From here: bug fixes and polish only. New ideas go to the roadmap |
| 3:30–4:15 | Polish | Loading, empty and error states on every demo screen; phone width checked; demo data labelled "historical"; copy from `10` applied |
| 4:15–4:50 | Test | Full demo run 3 times on the **production URL**; env vars confirmed in Vercel; README written |
| 4:50–5:00 | Buffer | Submission or last fix only |

## §3 Standups and agreements
- Commit at least every 30 minutes; merge small and often; one branch per person.
- Standup at 1:30, 3:00 and 4:15 (2 minutes each: done, doing next, blocked).
- Any blocker over 15 minutes goes to the team.
- AI-written code is run in the browser or with curl before it is committed.
- Do not change the contract without a line in its change log.

## §4 Checkpoint tests (run at each merge point)
1. `GET /api/health` and `GET /api/stations` return `success: true` on the production URL.
2. Dashboard map shows pins with band colours and names; a pin opens the panel.
3. Submit a report (with and without a photo) → case page opens.
4. Analyze on the 3 demo incidents: clear exceedance flagged, borderline shown honestly, normal case not flagged.
5. Run Analyze twice: the second is instant.
6. Add an action, move status through the allowed steps; a disallowed step shows an error and keeps the status.
7. Turn off Supabase or the HF token: the app still shows data and a fallback explanation.

## §5 Cut list (if behind schedule, cut in this order)
1. Cases list page
2. Photo upload (the form works without it)
3. Forecast line on the chart
4. Live Hugging Face call (serve cached answers only)
5. Side-panel chart on the map (keep the pins)

Never cut: map with pins, report, analyze with cited standard and limit check, action log with status.

## §6 Risks

| Risk | Mitigation |
| --- | --- |
| Seed data late (it blocks the real chart and analysis) | Rushvi starts at 0:00; Shreya's stubs use a tiny hand-made seed until it lands |
| Chosen window has no real exceedance | add one staged spike, labelled simulated |
| HF model unavailable or out of credits | cached answers and fallback text; swap `HF_MODEL` |
| Map breaks on server render | load Leaflet client-side only; use `CircleMarker` |
| Merge conflicts late | folder ownership above; merge at the checkpoints |
| Supabase RLS blocks reads | disable RLS on the four tables or add policies |
| Antigravity quota runs out | switch to a teammate's account; code by hand from the docs |
| Stitch credits run out | build from `10_UI_UX_DESIGN.md` with our components |
