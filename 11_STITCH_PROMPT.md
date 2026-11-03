# 11. Stitch Prompts: VayuDrishti

**For:** Diva · Time-box: about 30 minutes in total. Generate, export, move on. Do not polish in Stitch; polish in code.

## §1 How to use
1. Paste the **Shared design brief** first, then one screen prompt at a time.
2. Generate in this order: Dashboard, Case page, Report form.
3. Export the code (React/Tailwind if offered) and `DESIGN.md` if available.
4. Follow `03_FRONTEND_GUIDELINES.md` §4 to move it into the repo: our components, Tailwind 4 tokens, no raw hex, real data through `useApi`, the four states on every data screen.
5. Open it at phone width before committing.

## §2 Shared design brief (paste first)

```
Design a clean, modern web app called VayuDrishti, an air-quality incident and compliance tool for India.
Audience: citizens who report pollution and officers who review cases.
Style: white cards on a light grey background, rounded corners (rounded-xl), generous spacing, 8px grid.
Colours: primary green from a leaf-and-circuit logo: #237a3b for buttons (white text), #3aa347 for accents, #ecf9ee for light tints, #14532d for dark text accents.
AQI bands with BOTH colour and text label: Good (dark green), Satisfactory (light green), Moderate (yellow), Poor (orange), Very Poor (red), Severe (maroon).
Fonts: Inter for text, JetBrains Mono for numbers.
Mobile-first, works at phone width. Accessible: visible focus, contrast at least 4.5:1, never colour alone.
Tone: clear, neutral, plain language. No lorem ipsum, use realistic Indian city names and values.
```

## §3 Screen 1: Dashboard (India map)

```
Screen: Dashboard of VayuDrishti.
Top bar: leaf logo + "VayuDrishti", a yellow label "Historical data (2015–2020), not live", and a green button "Report an incident".
Hero: one line "See the air. Explain the risk. Close the case."
Main: a large map of India filling the width, with about 26 circular pins on major cities coloured by AQI band, and a legend listing the six bands with names.
Side panel (opens when a pin is clicked, bottom drawer on phones): city and state, big AQI number with band name, PM2.5 and PM10 values, a small 30-day line chart, and a button "Report an incident here".
Below the map: "Recent cases" with 3 cards (title, city, status badge, time).
Show realistic data, e.g. Delhi AQI 312 Very Poor, Mumbai 118 Moderate, Chennai 64 Satisfactory.
```

## §4 Screen 2: Case page (chart + infographics)

```
Screen: Case page of VayuDrishti for the incident "Heavy dust and smell near the industrial area gate", location Delhi, status badge "Under review".
Top: title, location, created time, status stepper (Open > Under review > Action taken > Closed), optional photo thumbnail.
Row of 4 infographic cards:
1) Current AQI 312 with band "Very Poor" and a segmented band scale with a marker.
2) Observed vs limit: horizontal bar "142 µg/m³ vs limit 60 µg/m³ (24 h, CPCB NAAQS)", text "2.4× the limit, exceeds limit".
3) How unusual: gauge with z-score 3.8 and text "Unusual for this location".
4) Data quality: badge "Valid" with one short sentence.
Chart: 30-day line chart of PM2.5 with a grey baseline band, a dashed 3-day forecast, a horizontal limit line at 60, and the spike day highlighted.
Button "Analyze this case". After analysis, an evidence panel: cited standard "CPCB NAAQS, PM2.5 24-hour" with a short excerpt, a 3-sentence plain explanation, "Suggested next step", a list "What is not yet known", a small badge "Instant" and the note "AI-assisted screening, not an official regulatory decision".
Bottom: "Add action" text box with optional photo, and a timeline of events (newest first).
```

## §5 Screen 3: Report form

```
Screen: Report form of VayuDrishti, title "Report an air-quality concern".
Fields: location (select, prefilled "Delhi"), pollutant (PM2.5 or PM10), observed value in µg/m³ (optional), short title, description, optional photo upload with thumbnail preview.
Primary green button "Submit report". Show inline error messages under fields and a loading state on the button.
Small helper text: "Reports support human review and are not official regulatory decisions."
```

## §6 After export (checklist)
- [ ] Colours replaced with tokens from `globals.css`
- [ ] Our `Button`, `Card`, `Badge`, `ErrorBanner`, `EmptyState`, `Skeleton` used; no second button style
- [ ] Hard-coded sample data replaced with `useApi` calls (or `data/seed.json` until the API is ready)
- [ ] Map loaded client-side only, `CircleMarker` pins, OSM attribution visible
- [ ] Loading, empty and error states added to every data screen
- [ ] Checked at phone width
