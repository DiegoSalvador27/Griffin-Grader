# Griffin Grader

An offline iPad web app for the PE teachers at Ernest Manning High School.
Attendance, rubric grading (DV1 to EX2), random teams, and a spreadsheet export
for PowerSchool. No accounts, no backend, no network at runtime: every record
lives in IndexedDB on the teacher's own iPad.

Built by Diego D. Full spec in [`SPEC.md`](SPEC.md). Build history and the
reasoning behind each decision in [`docs/BUILD-LOG.md`](docs/BUILD-LOG.md).
One-page guide for teachers in
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

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` is ready but nothing has been
pushed anywhere. To put it online:

1. Create a repo on GitHub and add it as a remote, then push `main`.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. The workflow runs typecheck, lint and tests, then builds with the right base
   path and deploys.
4. Share the resulting `https://<user>.github.io/<repo>/` URL with teachers, and
   tell them to Add to Home Screen.

## Manual QA on a real iPad

Everything below is something the automated suite genuinely cannot check.
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

### Accessibility

- [ ] VoiceOver: a tile announces the student's full name, attendance and entry
      count.
- [ ] Settings, Accessibility, Reduce Motion: the sheet and toasts stop
      animating.

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

Three rules worth keeping:

1. **No component touches a Dexie table.** Everything goes through
   `src/db/repos/*` inside transactions.
2. **No hard-coded colours.** Every value comes from `src/styles/theme.css`, so
   changing a token re-themes the whole app. `docs/design/preview.html` loads
   the same file and is the quickest way to see a change.
3. **Never `toISOString()` for a calendar date.** Calgary is UTC-7, so an
   evening class would be filed under tomorrow. Use `src/lib/dates.ts`.

---

Griffin Grader by Diego D.
