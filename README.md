# Griffin Grader

An offline iPad web app for the PE teachers at Ernest Manning High School.
Attendance, rubric grading (DV1 to EX2), random teams, and a spreadsheet export
for PowerSchool. No accounts, no backend, no network at runtime: every record
lives in IndexedDB on the teacher's own iPad.

Built by Diego D. One-page guide for teachers in
[`docs/TEACHER-GUIDE.md`](docs/TEACHER-GUIDE.md).

## Running it

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # open it from an iPad on the same wifi
```

> **Note on `--host`:** a LAN address like `http://192.168.1.5:5173` is not a
> secure context, so service workers do not register and the PWA cannot be
> installed there. The app itself works (IDs fall back to `getRandomValues`),
> but test installing and offline on the deployed HTTPS URL.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit and component tests |
| `npm run test:e2e` | Playwright, WebKit, iPad Pro 11 landscape and portrait |
| `npm run build` | Typecheck then production build |
| `npm run preview` | Serve the production build |
| `npm run icons` | Regenerate app icons from `brand/` |
| `bash brand/get-logos.sh` | Download the school logos if missing |

First time running E2E: `npx playwright install webkit`.

## Manual QA on a real iPad

Everything below is something the automated suite cannot check.
Playwright's WebKit is not Safari: it has no Home Screen install, no iOS storage
eviction, and its `navigator.share` behaves differently from the real one.

### Install and offline

- [ ] Open the Pages URL in Safari. The welcome screen shows the **Add to Home
      Screen** card.
- [ ] Add to Home Screen. The icon is the griffin on navy, not a screenshot.
- [ ] Open from the Home Screen. It fills the screen with no Safari chrome.
- [ ] The scoreboard clears the iPad clock and camera housing at the top.
- [ ] Settings says **Installed to Home Screen: Yes**.
- [ ] Turn on Airplane Mode. Force-quit the app, reopen it. It loads.
- [ ] Still offline: take attendance, grade someone, reload. Everything is there.

### Feel

- [ ] Tap a level. The badge updates immediately (target is under 100ms).
- [ ] Press and hold a tile for half a second. Attendance cycles, no text gets
      selected, no copy/paste callout appears.
- [ ] Hold a tile and drag slightly. Nothing happens, the grid scrolls.
- [ ] Tap a tile normally straight after a hold. It opens the sheet.
- [ ] The screen does not dim while a class is open.

### Layout

- [ ] Landscape: 6 columns of tiles.
- [ ] Portrait: 4 columns.
- [ ] Split View at half width: 2 columns, scoreboard stacks, nothing clipped.
- [ ] Tap a text field. The page does not zoom.

### Export and backup

- [ ] Export today, tap **Download PowerSchool sheet**. The iOS share sheet
      opens and **Save to Files** works.
- [ ] Open the file. Accented names (José) render correctly, not as `JosÃ©`.
- [ ] Settings, **Download backup**, save it off the iPad.
- [ ] Settings, **Erase everything** (type ERASE), then **Restore a backup**.
      The counts match what you had.

## How it is put together

```
src/
  app/        shell, routes, service worker prompt
  db/         Dexie schema, seed, repositories (all writes go through here)
  features/   onboarding, classes, live, rubrics, export, settings
  lib/        ids, dates, names, roster parsing, teams, export, share
  components/ Button, Sheet, Toast, SegmentedControl, LevelChip, Banner, Field
  styles/     theme.css (every design token), global.css
```

Griffin Grader by Diego D.
