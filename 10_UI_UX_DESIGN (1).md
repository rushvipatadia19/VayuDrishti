# 10. UI/UX Design: VayuDrishti

**For:** Diva (build) and Vaidehi (copy review) · Mobile-first at 390 px. Tokens and components are in `03_FRONTEND_GUIDELINES.md`; screen prompts for Stitch are in `11_STITCH_PROMPT.md`.

## §1 Design principles
1. **Evidence first.** Every flag sits next to its number, limit and cited clause.
2. **Colour plus text.** AQI band, status and quality always show a label, never colour alone.
3. **Neutral language.** "Potential concern", "exceeds the limit", never "violation" or a named facility as culprit.
4. **One flow.** Map → report → case → analyze → action → status. No dead ends.
5. **Honest data.** The header always says "Historical data (2015–2020), not live". Simulated values are labelled simulated.

## §2 Visual language

| Item | Value |
| --- | --- |
| Background / surface | `bg-bg` (#f3f4f6) / `bg-surface` white cards, `rounded-card`, `border-border`, `shadow-sm` |
| Primary | `bg-primary` buttons with white text; `hover:bg-primary-hover` |
| Accent / tint / dark | `accent` for highlights, `tint` for light fills, `dark-accent` for headings and links |
| Text | Inter; numbers in JetBrains Mono (`font-mono`) |
| Spacing | 8 px grid (`p-2`, `p-4`, `gap-4`, `py-6`) |
| Radius | cards `rounded-card`, buttons `rounded-xl`, badges `rounded-full` |
| Focus | `focus-visible:ring-2 focus-visible:ring-primary` on every interactive element |

**AQI bands (CPCB)**

| Range | Label | Token | Badge |
| --- | --- | --- | --- |
| 0–50 | Good | `aqi-good` | green |
| 51–100 | Satisfactory | `aqi-satisfactory` | green |
| 101–200 | Moderate | `aqi-moderate` | yellow |
| 201–300 | Poor | `aqi-poor` | orange |
| 301–400 | Very Poor | `aqi-very-poor` | red |
| 401–500 | Severe | `aqi-severe` | maroon |

**Status badges:** Open (grey) · Under review (yellow) · Action taken (green tint) · Closed (dark green). Text label always shown.

## §3 Navigation
Top bar on every page: logo and name (links to `/`), the yellow "Historical data" chip, and on the dashboard a "Report an incident" button. Cases list is reachable from a "Cases" text link (only if built). The case page has a "← Back to map" link. No hamburger menu needed.

## §4 Screens

### Screen 1: Dashboard (`/`)

| Region | Phone (390 px) | Laptop (≥ 768 px) |
| --- | --- | --- |
| Hero | one line "See the air. Explain the risk. Close the case." | same, larger |
| Map | full width, height 360 px | full width, height 480 px |
| Legend | wraps under the map, six bands with names | one row |
| Station panel | bottom drawer after tapping a pin | right-side panel beside the map |
| Recent cases | stacked Cards | 3 columns |

Station panel contents: city, state · big AQI number with band Badge · PM2.5 and PM10 values (µg/m³) · 30-day chart · "Report an incident here" button (goes to `/report?stationId=…`).
Under the map: "City-level locations. Map data © OpenStreetMap contributors."
States: see `05_FRONTEND_ARCHITECTURE.md` §7.

### Screen 2: Report form (`/report`)

Title "Report an air-quality concern".

| Field | Type | Rules | Error text |
| --- | --- | --- | --- |
| Location | select, prefilled from `stationId` | required | "Choose a location." |
| Pollutant | radio PM2.5 / PM10 | required | "Choose a pollutant." |
| Observed value (µg/m³) | number, optional | 0–2000 | "Enter a value between 0 and 2000, or leave it blank." |
| Title | text | 1–120 chars | "Add a short title (up to 120 characters)." |
| Description | textarea, optional | up to 1000 | "Keep the description under 1000 characters." |
| Photo | file, optional, image only | helper "Report still submits without a photo." | "Photo upload failed. You can still submit." |

Primary button "Submit report" (loading state while posting). Helper under it: "Reports support human review and are not official regulatory decisions." On success go to `/cases/[id]`. `locationName` is sent as the selected city name unless the user types a more specific place in the description.

### Screen 3: Case page (`/cases/[id]`)

Order top to bottom:
1. **Header:** title, location, created time, optional photo thumbnail, status Badge, `StatusStepper` (Open › Under review › Action taken › Closed, current step highlighted with text).
2. **Readings chart** (always visible after load): 30-day PM line, grey baseline band, horizontal limit line labelled "Limit 60 µg/m³ (24 h)", spike day highlighted. Dashed 3-day forecast appears after Analyze.
3. **Analyze button:** "Analyze this case". Before analysis the four cards show "Run the analysis to see evidence".
4. **Four info cards** (2 × 2 on phone, 4 across on laptop):

| Card | Content |
| --- | --- |
| Current AQI | number, band Badge, segmented scale with marker |
| Observed vs limit | horizontal bar; text "142 µg/m³ vs limit 60 µg/m³ (24 h, CPCB NAAQS). 2.4× the limit, exceeds limit." |
| How unusual | z-score gauge; text "Unusual for this location" if anomaly, else "Within normal range" |
| Data quality | Badge (Valid / Stale / Implausible / Missing) and one sentence |

5. **Analysis panel:** cited standard name and clause with excerpt · plain explanation (3–4 sentences) · "Suggested next step" · "What is not yet known" list · badge "⚡ Instant" or "✨ Just generated" · note "AI-assisted screening, not an official regulatory decision".
6. **Add action:** textarea (1–500 chars), optional photo, button "Add action". Status control: only the allowed next steps are offered (see §6); a rejected change shows the API error in a Toast and the status stays.
7. **Timeline:** newest first; each row has an icon with `aria-label`, event kind in text (Report, Analysis, Action, Status change), text, time, and "Open → Under review" for status changes.

Closed case: action form and status control are disabled with the note "This case is closed."

### Screen 4: Cases list (`/cases`, Should)
Cards with title, city, status Badge, relative time; newest first. EmptyState "No cases yet. Report the first concern." First item on the cut list.

## §5 Copy deck (use exactly; keep tone neutral)

| Where | Text |
| --- | --- |
| Header chip | Historical data (2015–2020), not live |
| Dashboard hero | See the air. Explain the risk. Close the case. |
| Map note | City-level locations. Map data © OpenStreetMap contributors. |
| Demo-data toast | Showing demo data |
| Analysis disclaimer | AI-assisted screening, not an official regulatory decision |
| Report helper | Reports support human review and are not official regulatory decisions. |
| Exceeded | Exceeds the limit |
| Not exceeded | Within the limit |
| Anomaly | Unusual for this location |
| Not anomaly | Within the normal range for this location |
| Generic error | Something went wrong. Please try again. |
| Network error | Could not reach the server. Check your connection and retry. |
| Bad transition | That status change is not allowed from the current status. |
| Empty readings | No readings for this period. |

Never use: "violation", "illegal", "guilty", "polluter", or any named factory.

## §6 Status rules shown in the UI

| Current | Offered next steps |
| --- | --- |
| Open | Under review |
| Under review | Action taken, Open |
| Action taken | Closed, Under review |
| Closed | none |

Matches the transitions in `09_API_CONTRACT.md` §1; the server still enforces them with `409 BAD_TRANSITION`.

## §7 Responsive behaviour

| Breakpoint | Layout |
| --- | --- |
| < 640 px | single column; map 360 px; drawer for station panel; cards stacked; buttons full width |
| 640–767 px | two-column card grid |
| ≥ 768 px | side panel beside map; four info cards in a row; content `max-w-5xl` |

Touch targets at least 44 × 44 px. No horizontal scroll at 390 px.

## §8 Accessibility
Same checklist as `03_FRONTEND_GUIDELINES.md` §9, plus:
- Map has a text alternative: a "View as list" toggle that lists cities with AQI and band as text (build only if time allows; otherwise the legend and the station panel text carry it).
- Charts have a one-sentence text summary below ("PM2.5 rose from 48 to 142 µg/m³ in three days; limit is 60").
- Status and AQI use Badge text. Error areas use `role="alert"`.
- Contrast of every text/background pair at least 4.5 : 1 (check yellow and orange badges).

## §9 Demo data on screen (must match the seed)
- Dashboard examples: Delhi AQI 312 Very Poor, Mumbai 118 Moderate, Chennai 64 Satisfactory.
- Demo incident 1 (clear exceedance): PM2.5 142 µg/m³ vs 60 limit, 2.4×, anomaly yes.
- Demo incident 2 (borderline): value close to the limit, shown honestly ("exceeds by a small margin" or "just within the limit").
- Demo incident 3 (normal fluctuation): not flagged, "Within the normal range for this location".
- All values are historical; any staged value is labelled "simulated".

## §10 Demo script (2 minutes)
1. Open the production URL on a phone: map with coloured, labelled pins.
2. Tap Delhi: panel shows AQI, band, 30-day chart. Tap "Report an incident here".
3. Submit the report (with a photo): case page opens with the chart.
4. Press "Analyze this case": four cards, cited standard, explanation, next step, unknowns. Press again: ⚡ Instant.
5. Add an action; move status Open → Under review → Action taken. Try a disallowed jump to show the error.
6. Show demo incident 3: not flagged. Close with the disclaimer and "Phase 2" roadmap.

## §11 Design acceptance checklist (before merge)
- [ ] Looks right at 390 px and at laptop width
- [ ] Only token classes; no raw hex or inline styles
- [ ] Only shared UI components; one button style
- [ ] Loading, error, empty, data on every data screen
- [ ] AQI and status always have text labels
- [ ] Copy matches §5
- [ ] No console errors on the demo path
