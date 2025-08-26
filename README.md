## NcCountdown

A tiny Angular app that shows a **full-width, single-line** countdown (“_X days, Y h, Z m, S s_”) and a **quote of the day**.  
Built with Angular **Components** and a reusable **Text-Fit** directive.  
Generated with Angular CLI **20.2.x.**
Works on desktop + mobile (portrait & landscape).

---

## Live Demo

https://shreya-p2.github.io/nc-countdown

---

## Quick start

```bash
npm install
npm start   # http://localhost:4200
```

---

## Prerequisites

- Node.js **20.x** or **22.x** (LTS versions supported by Angular 20)
- npm **10.x+**
- (Optional) Global Angular CLI; project also works via local CLI with `npx`.

---

## Build

```bash
npm run build
# output: dist/nc-countdown/browser
```

---

## Format (Prettier)

```bash
npm run format        # write
npm run format:check  # verify
```

```js
// prettier.config.js
module.exports = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
}
```

---

## Development

Run `npm start` in one terminal and `npm run format:check -- --watch` in another to auto-check formatting.

---

## What the app does

- **Title**: “Time to _{Event}_” — fitted to one line, fills the width.
- **Countdown**: “_N days, H h, M m, S s_” — updates every second, fitted to one line.
- **Quote of the day**: fetched from `https://dummyjson.com/quotes/random` with an **in-place** loading indicator (rest of the page stays interactive).
- **Form**: Title + Date (`YYYY-MM-DD`). **Save** persists to `localStorage`.

---

## How it works

- **Text-Fit directive (reusable)**  
  Measures text in a hidden element and **binary-searches** the largest `font-size` that fits the available width (no wrap). Uses `ResizeObserver` for container resizes.  
  Inputs:
  - `minPx`, `maxPx` — bounds
  - `paddingPx` — breathing room subtracted from width
  - `onlyOnResize` — if `true`, don’t refit on content changes
  - `refText` — optional “longest” sample string

  - Both the event title and the countdown line ("N days, H h, M m, S s") use the custom TextFitDirective.The directive measures text and automatically adjusts font-size so each line fills the entire screen width on a single line.
  - Title → resizes as the event name changes.
  - Countdown → resizes as numbers tick down, ensuring consistent sizing.
    This makes the solution reusable and guarantees the design requirement: always full-width, always single-line, across devices and orientations.
  - The TextFitDirective supports an optional refText for stable sizing, but for the countdown I intentionally left it unset so the text always stretches to the exact container width on each tick, per assignment spec.

Example:

```html
<span
  appTextFit
  [minPx]="20"
  [maxPx]="1200"
  [paddingPx]="16"
  [onlyOnResize]="true"
>
  {{ remainingLabel() }}
</span>
```

---

- **State (Angular Signals)**  
  `settings` (persisted `{ eventName, endIso }`), `formEventName`/`formDate` (live inputs), and computed `targetMs`/`remainingParts`/`remainingLabel` for the countdown.  
  Quote UX uses `quote`, `quoteLoading`, `quoteError`.

- **Persistence**  
  `StorageService` reads/writes `localStorage` under key `nc.settings.v1` and migrates old `endDate` → `endIso`.

- **Accessibility**
- Semantic structure
  Uses real landmarks: <header> and <main>, with the interactive content inside <section>.
  Logo has a descriptive alt="Natural Cycles" so screen readers don’t announce a file name.
- Single‑line, visual countdown
  The big countdown <span> is aria-hidden="true" so screen readers aren’t forced to re‑announce every second.
- Inline, non‑blocking async status
  The quote loader is local to the quote area and uses a spinner with role="status" + an aria-label (“Loading quote”), keeping the rest of the UI interactive.
  “Retry” is a plain button in place (good for discoverability).
- Form basics
  Each input has a proper <label for="...">.
  Past‑date state is surfaced with a clear text warning (⚠️), and the date input sets:
  aria-describedby="date-warn" to link the warning,
  aria-invalid="true" while the warning shows.

---

## Project structure

```
src/
  app/
    app.component.html
    app.component.ts
    directives/
      text-fit.directive.ts
    services/
      storage.service.ts
    types.ts
  assets/
    nc-logo.png
styles.scss
```

---

## Scripts reference

```bash
npm start         # ng serve
npm run build     # production build
npm run watch     # build --watch
npm run format    # prettier --write .
npm run format:check
```

---

## Deployment

- The project is automatically deployed to GitHub Pages.
- **How it works**
  - Every push to the main branch triggers a GitHub Actions workflow.
  - The workflow builds the Angular app and publishes it to GitHub Pages.
  - Each deploy takes ~1–2 minutes;
- **For reviewers**
  - No manual steps needed — just open the live demo link.
  - If you want to run locally:
  - npm ci
  - npm start # http://localhost:4200

---

## Assignment checklist

- [x] Angular + TypeScript (Latest Version)
- [x] Portrait & landscape; single-line, full-width text
- [x] **Reusable** text-fit solution
- [x] Editable **event name + date**, persisted
- [x] Countdown format: `Days, Hours(h), Minutes(m), Seconds(s)`
- [x] Quote from `dummyjson.com/quotes/random` (no caching, in-place loader)
- [x] Prettier formatting as specified
- [x] README + deployable build

---

## Demo

Here’s how the app looks:

**Mobile view**
![Mobile Screenshot](./src/assets/mobile-view.png)

---

**Desktop view**
![Desktop Screenshot](./src/assets/desktop-view.png)

## Suggestions for improvement / Production readiness

I’m happy with the core solution — it’s clean, accurate, and resilient — but if this were shipping inside a popular app like Natural Cycles, here’s what I’d add before calling it production-ready:

1. Accessibility & inclusivity
   Natural Cycles is a certified medical app and must work for everyone.
   Ensures everyone can use it regardless of ability or environment.

- Make the big ticking line visual-only (aria-hidden="true") and provide a calmer, screen-reader-friendly summary (e.g. “Event ends in 3 days, 2 hours”).
- Confirm keyboard flow, focus styles, and color contrast meet WCAG.
- Add dark mode support for comfort.

2. Internationalization & localization
   Natural Cycles operates in 150+ countries, so language and time correctness matter.

- System integration: Add “Add to Calendar” export (iCal/Google) so events can be synced.
- Pluralization in multiple languages (days vs Tage vs días).
- Localize “h/m/s” abbreviations.
- Allow choosing an exact time & time zone to avoid DST surprises.
- Builds global trust and avoids confusion around dates/times.

3. Quality guardrails
   Before release, I’d add:

- Unit tests for countdown math + text-fit directive edge cases.

4. Privacy & Security

- No personal or health data is stored or transmitted.
- Only the event name and end date are saved locally in the browser (`localStorage`).
- The quote is fetched anonymously from a public API; no user info is included.
- No third-party analytics or trackers are used.

5. Future-proof features
   Worth exploring:

- Multiple countdowns (switchable events).
- Shareable links (?event=Birthday&date=2025-12-12).
- Lightweight PWA so users can “install” the countdown.

  ** The solution as-is is solid for the assignment — it’s accurate (no drift), inclusive (text-fit works everywhere), private (data is local), and resilient (quotes don’t block the UI).
  If I were preparing this for Natural Cycles’ production standards, I’d polish the accessibility, global reach, and trust aspects: screen-reader comfort, multilingual support, explicit privacy messaging, and quality guardrails. These aren’t just technical extras; they’re what turn a neat demo into a product people trust their health with. **
