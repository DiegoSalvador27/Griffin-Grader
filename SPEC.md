# Griffin Grader v1: Build Spec

> Source of truth for building Griffin Grader. Claude Code: read this whole file before planning. If anything here is contradictory or impossible, say so in your plan instead of silently choosing.

---

## 1. Product summary

**Griffin Grader by Diego D.** is an iPad web app for the PE teachers at **Ernest Manning High School** (Calgary, AB; team name: Griffins). Teachers use it live in the gym to:

1. Take attendance (Absent / Present / Late).
2. Tap a student tile and record a **rubric level** (DV1, DV2, PR1, PR2, EX1, EX2) for a rubric **category** (Skills, Teamwork, Participation, ...), plus an optional comment.
3. See an **attention count** on each tile: how many entries they've recorded for that student this class period, and optionally a flag on students they haven't assessed yet.
4. Randomly split the class into **teams** (groups of N, or N groups).
5. **Export** the day's results as a spreadsheet so they can type them into PowerSchool.

It's inspired by Tap & Tally (tapandtally.com): tap a student, tap what they did, the app keeps the record. Unlike Tap & Tally, Griffin Grader uses rubric levels instead of counters, has a Late status, has teams, and installs to the iPad Home Screen to work fully offline.

**No accounts, no backend, no cloud.** All data lives on the teacher's iPad (IndexedDB). The app is static files on free hosting (GitHub Pages), installed to the Home Screen as a PWA.

### Users and scale
- Each PE teacher has their **own iPad** (not school-managed) and their own classes. No data is shared between teachers in v1.
- Typical: 4 classes x 30 students. Must comfortably handle at least 12 classes x 40 students and a full school year of entries.

### Timeline
- First teacher trial: **Monday, November 23, 2026**. Full use planned for next semester if the trial goes well.

### Non-goals for v1 (do NOT build)
- Accounts, login, cloud sync, multi-device sync.
- Sharing or transferring a class between teachers (planned v2: export/import a single class file).
- Direct PowerSchool integration.
- Tap & Tally style counters ("Participation +1"). Rubric levels replace them.
- Push notifications, analytics, ads, any third-party network calls at runtime.

---

## 2. Locked tech decisions

| Area | Decision | Why |
|---|---|---|
| Language | TypeScript, `strict: true`, no `any` | Owner knows JS/TS; catches bugs early |
| UI | React (current stable) + Vite | Mature, fast dev server, great PWA plugin |
| Routing | React Router with **HashRouter** | GitHub Pages has no SPA fallback, so hash routes avoid 404s on reload |
| Storage | **Dexie** (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) | Real database in the browser, survives reloads, reactive UI |
| PWA | `vite-plugin-pwa` (Workbox generateSW, precache all build assets, `registerType: 'prompt'`) | Offline after first load, controlled updates |
| CSV | PapaParse | Robust CSV parse/unparse |
| Styling | Plain CSS + CSS custom properties (`src/styles/theme.css`) + CSS Modules per component. No UI kit, no Tailwind | Colours must be easy to change in one place |
| IDs | `crypto.randomUUID()` | |
| Fonts | System font stack only (`-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`). No web font CDNs | Offline, zero network |
| Unit tests | Vitest + @testing-library/react + `fake-indexeddb` | |
| E2E tests | Playwright, **WebKit** engine, iPad device profiles | iPads run WebKit |
| Lint/format | ESLint + Prettier | |
| Deploy | GitHub Actions to GitHub Pages | Free |

Use current stable versions of all packages. Do not add other runtime dependencies without asking Diego first (dev dependencies for tooling are fine).

---

## 3. Data model

Store everything in one Dexie database `griffin-grader`. Use Dexie `version(n).stores(...)` with upgrade functions for any future schema change. Never clear tables except in "Erase everything" and "Restore backup".

```ts
type ID = string; // crypto.randomUUID()

interface Level {            // one rung of the rubric scale
  id: ID;
  code: string;              // "DV1"
  label: string;             // "Developing 1"
  tier: 'DV' | 'PR' | 'EX' | 'other';  // drives colour
  order: number;             // 0 = lowest
}

interface RubricCategory {
  id: ID;
  name: string;              // "Skills"
  description?: string;      // optional criteria text shown small under the name
  order: number;
  hidden?: boolean;          // categories with existing entries are hidden, never hard-deleted
}

interface Rubric {
  id: ID;
  name: string;              // "PE 10 Rubric"
  categories: RubricCategory[];
  levels: Level[];
  createdAt: number;
  updatedAt: number;
}

interface ClassGroup {        // "Class" is a reserved-ish word, so ClassGroup
  id: ID;
  name: string;              // "PE 10 - Block 2"
  rubricId: ID;
  gridOrder: 'first' | 'last' | 'custom';
  customOrder: ID[];         // student ids when gridOrder = custom
  archived: boolean;
  createdAt: number;
}

interface Student {
  id: ID;
  classId: ID;
  firstName: string;
  lastName: string;
  studentNumber?: string;    // from PowerSchool CSV when available
  active: boolean;           // removed students: active=false, history kept
  createdAt: number;
}

interface Session {           // one class period
  id: ID;
  classId: ID;
  date: string;              // local date "YYYY-MM-DD"
  startedAt: number;
  endedAt?: number;
}

interface Attendance {
  id: ID;
  sessionId: ID;
  studentId: ID;
  status: 'absent' | 'present' | 'late';
  updatedAt: number;
}                             // unique on [sessionId+studentId]

interface Assessment {        // one rubric entry; the core record
  id: ID;
  sessionId: ID;
  classId: ID;
  studentId: ID;
  categoryId: ID;
  categoryName: string;      // snapshot so history survives rubric edits
  levelId: ID;
  levelCode: string;         // snapshot, e.g. "PR2"
  comment: string;           // "" when none
  createdAt: number;
  updatedAt: number;
}

interface TeamSet {
  id: ID;
  sessionId: ID;
  classId: ID;
  mode: 'size' | 'count';    // groups of N  |  N groups
  n: number;
  presentOnly: boolean;
  teams: { name: string; colorToken: string; studentIds: ID[] }[];
  createdAt: number;
}

interface QuickComment { id: ID; text: string; order: number }

interface Settings {          // single row, id = 'settings'
  id: 'settings';
  teacherName?: string;
  flagUnassessed: boolean;   // default true
  lastBackupAt?: number;
  onboardingDone: boolean;
}
```

Suggested Dexie indexes:
```
rubrics:       'id'
classes:       'id, archived'
students:      'id, classId, [classId+active]'
sessions:      'id, classId, date, [classId+date]'
attendance:    'id, sessionId, studentId, &[sessionId+studentId]'
assessments:   'id, sessionId, classId, studentId, createdAt, [classId+createdAt], [studentId+createdAt]'
teamSets:      'id, sessionId, classId'
quickComments: 'id, order'
settings:      'id'
```

### Defaults (seeded on first run)
- **Levels** (lowest to highest): DV1 "Developing 1", DV2 "Developing 2", PR1 "Proficient 1", PR2 "Proficient 2", EX1 "Extending 1", EX2 "Extending 2". Teachers can rename, reorder, add or remove levels.
- **Default rubric** "PE Rubric" with categories: Skills, Teamwork, Participation, Sportsmanship. Fully editable.
- **Quick comments**: "Great effort", "Helped a teammate", "Needs to stay on task", "Strong leadership", "Unsafe play", "Not dressed for activity". Editable.

---

## 4. Screens and behaviour

Global layout: navy top bar with the EM crest + "Griffin Grader", nav: **Classes**, **Rubrics**, **Export**, **Settings**. Every page has a small muted footer watermark: **"Griffin Grader by Diego D."** (on the live class screen it sits in the bottom toolbar, never over tiles).

### 4.1 First run / onboarding
- Welcome screen with the school crest, app name, and one line: "Grade your PE classes right from your iPad. Everything stays on this iPad."
- If NOT running as an installed app (`matchMedia('(display-mode: standalone)')` false and `navigator.standalone` false): show an **Install card** with steps: tap Share, then "Add to Home Screen", then open Griffin Grader from the Home Screen. Explain why in one sentence: data in a Safari tab can be cleared by iPadOS if the site isn't used for a while; the Home Screen app keeps it.
- Buttons: "Create my first class" and "Try a demo class" (creates a clearly labelled "DEMO" class with 24 fake students that can be deleted).
- Call `navigator.storage.persist()` (feature-detected) the first time data is written.

### 4.2 Classes (home)
- Cards: class name, student count, rubric name, last session date. Big gold **Start class** button on each card.
- "+ New class". Archived classes in a collapsed section.
- "Export today" shortcut button if any entries exist today.
- Backup reminder banner (see 4.8).

### 4.3 New class wizard
1. **Name + roster.** Two tabs:
   - **Paste names**: textarea, one student per line. Accept: `First Last`, `Last, First`, tab-separated rows pasted from a spreadsheet (`First<TAB>Last`, `Last<TAB>First`, optional third column = student number). For `First Middle Last` style lines, first token = first name, rest = last name. Trim spaces, ignore blank lines, keep accents/apostrophes/hyphens (José, O'Neil, Mary-Kate).
   - **Import CSV (PowerSchool)**: file picker (`accept=".csv,text/csv"`). Parse with PapaParse. Auto-detect columns by case-insensitive header match: first name (`first`), last name (`last`), full name (`name`, `student name`, `student`; split "Last, First"), student number (`student number`, `student_number`, `student id`, `number`, `id`). Show column-mapping dropdowns pre-filled with the guess, and a preview of the first 5 rows. We have NOT seen a real PowerSchool export yet, so the mapper must be forgiving and editable.
   - Both tabs end in an **editable preview table** (first name, last name, number) with a "swap first/last" button and a delete button per row, plus a count. Warn on duplicate names.
2. **Rubric**: pick an existing rubric (default "PE Rubric") or "Create new" (opens the rubric editor, then returns).
3. **Done**: "Start class now" or "Back to classes".

### 4.4 Class page
- Roster table: name, number, attendance totals (P / L / A sessions), total entries, latest level per category.
- Add students (same paste/CSV UI), edit name/number, remove (soft: `active=false`, history kept, can restore).
- Grid order: first name A-Z, last name A-Z, or custom (drag to reorder).
- Edit class: rename, change rubric (warn that old entries keep their snapshot names), archive, delete (double confirm, only allowed after a backup in the last 24 h or explicit "I understand" checkbox).
- Tap a student: **Student history**: all entries (date, category, level chip, comment) newest first, attendance history; edit comment / change level / delete an entry.

### 4.5 Live class screen (the core; must feel instant)
**Start / resume**: Starting a class creates a `Session` for today. If an unended session for this class exists today, resume it. If an unended session exists from an earlier date, close it (`endedAt = its last activity`) and start fresh. **Every active student starts ABSENT** (attendance rows created lazily or up front; either way, missing = absent).

**Header**: class name, today's date, live counts "18 Present · 2 Late · 10 Absent", buttons: **Attendance** (mode toggle), **Teams**, gear menu, **End class**.

**Grid**: responsive tiles. Landscape iPad: 5-6 columns; portrait: 4; narrow split view: 2-3. Tile shows big initials, then first name + last initial (add more letters of the last name to disambiguate duplicates, e.g. "Alex Mo." / "Alex Ma."). Minimum tile size ~120x100 pt.

Tile states:
- **Absent**: faded (opacity ~0.45), dashed border, small "ABSENT" text.
- **Present**: solid white card, navy text.
- **Late**: white card with a gold left stripe and a "LATE" chip.
- **Attention badge** (top-right): number of assessments for this student in this session. Hidden when 0. Navy circle, white number.
- **Unassessed flag** (when Settings.flagUnassessed is on): present or late students with 0 entries this session get a sky-blue ring. Toggle also available in the gear menu.

**Attendance**
- **Attendance mode** (auto-on when a session starts; header shows "Taking attendance" and a **Done** button): tapping a tile cycles **Absent > Present > Late > Absent**. Buttons: "Mark all present", "Mark all absent".
- **Normal mode**: tap opens the Student sheet. **Long-press (~500 ms)** a tile also cycles attendance, with a visible press animation, so a late arrival can be fixed without opening the sheet.
- The Student sheet has a segmented control **Absent | Present | Late** at the top.
- Grading a student who is marked Absent automatically marks them Present and shows a toast "Marked Present" with Undo.

**Student sheet** (large bottom/centre sheet, closes with X or tap outside)
- Header: full name, attendance segmented control, "N entries today".
- One row per visible rubric category: category name (+ description in small text), then one button per level (DV1 ... EX2). Buttons are colour-coded by tier (see Design). If the student already has entries for that category today, the latest one's level button is highlighted and a small "x2" style count shows for repeats.
- Tapping a level **records an Assessment immediately** (await the Dexie write, then update UI; target < 100 ms), shows a toast with **Undo** (5 s), and opens an inline **comment field** for that entry with quick-comment chips. Comment autosaves (debounced ~600 ms and on blur). Empty comment is fine.
- "Today" list at the bottom: time, category, level chip, comment; each with edit and delete (delete = toast with Undo).
- Multiple entries per category per session are allowed; each counts toward the attention badge.

**Teams** (panel from header button)
- Choose **Groups of N** or **N groups**, stepper for N, toggle "Only present + late students" (default ON).
- **Randomize**: Fisher-Yates shuffle, then distribute so team sizes differ by at most 1. For "groups of N" when the count doesn't divide evenly, never leave a tiny leftover team: e.g. 22 students in groups of 4 gives 4,4,4,4,3,3. Each eligible student appears in exactly one team.
- **Re-roll** button. Teams named "Team 1..n" with distinct colours from the theme palette.
- Move a student: tap the student, then tap the destination team (drag-and-drop optional).
- A **Grid | Teams** toggle in the bottom toolbar switches the live view to tiles grouped by team columns. Tiles stay fully tappable for grading and attendance.
- Saved as a `TeamSet` on the session; reopening the panel shows the latest set.

**End class**: sets `endedAt`, shows a summary: attendance counts, total entries, list of present/late students with 0 entries, buttons **Export today** and **Back to classes**.

**Screen wake**: request the Screen Wake Lock API while the live screen is open if `'wakeLock' in navigator`; silently no-op otherwise. Re-request on `visibilitychange`.

### 4.6 Rubrics
- List rubrics with which classes use them.
- Editor: rubric name; categories (add, rename, description, reorder, hide; hard delete only if no entries use it); levels (code, label, tier, reorder, add/remove; warn if entries use a level); duplicate rubric.
- Quick comments editor (add, edit, reorder, delete).

### 4.7 Export (end of day, for PowerSchool)
- Controls: date range (**Today** default, Yesterday, This week, Custom), classes (default: all classes with data in range).
- **On-screen preview** of the PowerSchool sheet, one table per class, so a teacher can type marks into PowerSchool straight from the iPad without opening a file.
- **Download "PowerSchool sheet" (CSV)**: one file, rows sorted by Class, then Last name, then First name. Columns:
  `Class, Date(s), Last Name, First Name, Student Number, Attendance, <Category 1>, <Category 1> Comments, <Category 2>, <Category 2> Comments, ...`
  - Attendance: single day = `Present` / `Late` / `Absent`; range = `P:n L:n A:n`.
  - Category cell = the **latest** level recorded in the range. Comments = all comments for that category in the range joined with ` | `.
  - Classes with different rubrics: union of category columns, blank where not applicable.
- **Download "Full log" (CSV)**: one row per assessment: `Date, Time, Class, Last Name, First Name, Student Number, Category, Level, Comment`, plus one row per attendance status per session.
- CSV: UTF-8 **with BOM** (so Excel shows accents), CRLF line endings, proper quoting.
- Filenames: `griffin-grader_powerschool_2026-11-23.csv`, `griffin-grader_log_2026-11-23.csv` (range: `..._2026-11-23_to_2026-11-27.csv`).
- Delivery: if `navigator.canShare?.({ files: [file] })` use `navigator.share({ files })` (iPad share sheet: Save to Files, AirDrop, Mail). Otherwise fall back to a Blob URL + `<a download>`.

### 4.8 Settings
- Teacher name (optional; used in backup filenames).
- Flag unassessed students: on/off.
- **Backup**: "Download backup" creates JSON `{ app: "Griffin Grader by Diego D.", schemaVersion, exportedAt, data: { ...all tables } }`, filename `griffin-grader_backup_<teacher>_<date>.json`, delivered via the same share/download helper. Sets `lastBackupAt`.
- **Restore backup**: pick file, validate shape and schemaVersion, show counts ("4 classes, 118 students, 2,340 entries"), confirm, then replace everything in one transaction. Migrate older schema versions.
- **Backup reminder banner** on Classes page when data exists and `lastBackupAt` is missing or older than 7 days.
- Storage status: installed to Home Screen yes/no (with install steps if no), persistent storage granted yes/no.
- **Erase everything**: double confirm, user must type `ERASE`.
- About: app version, "Griffin Grader by Diego D.", one-line privacy statement.
- App update: when the service worker finds a new version, show a non-blocking banner "Update available, tap to reload". **Never auto-reload while a class session is open.**

---

## 5. Design and brand

Use the **frontend-design** skill for visual direction. Feel: confident, athletic, clean, school-spirit without clutter. Large, glove-friendly targets. Make it look like a polished school app, not a template.

### Colours: single source of truth
All colours are CSS custom properties in `src/styles/theme.css`. Components never hard-code hex values. Changing a token must re-theme the whole app.

```css
:root {
  --color-navy: #0B1F3A;      /* primary: top bar, headings, text */
  --color-gold: #C9A227;      /* accent: primary buttons, highlights, Late */
  --color-white: #FFFFFF;
  --color-bg: #F5F7FA;        /* page background */
  --color-sky: #4A90C2;       /* info: unassessed flag, links, PR tier */
  --color-crimson: #B23A48;   /* destructive actions, DV tier */
  --color-muted: #6B7280;     /* secondary text, watermark */

  --tier-dv: var(--color-crimson);
  --tier-pr: var(--color-sky);
  --tier-ex: var(--color-gold);

  --att-absent: #9CA3AF;
  --att-present: var(--color-navy);
  --att-late: var(--color-gold);
}
```
- Level buttons: tier colour; the "1" level is a lighter tint, the "2" level the full colour. The level code is always printed on the button (colour is never the only signal).
- Contrast: meet WCAG AA. Gold backgrounds get **navy** text, not white.
- Team colours: derive 8 distinct colours from the palette plus a few complementary tints, defined as tokens.

### Brand assets
- `brand/emhs-crest.png`: Ernest Manning crest from the school website (134x140, PNG despite the original `.svg` URL). Use in the top bar and welcome screen.
- `brand/em-griffin-athletics.jpg`: EM + Griffin athletics mark (225x225). Use to generate the app icons: centre it on a navy square with padding, export `apple-touch-icon` 180x180, PWA icons 192x192 and 512x512, and a maskable 512x512 with safe-zone padding.
- These source images are small. Scale cleanly (no blurry stretching beyond what's needed) and tell Diego in the final summary that higher-res originals from the school would look sharper.
- If `brand/` files are missing, run `bash brand/get-logos.sh`. If that fails, fall back to a navy square with a gold "GG" monogram and continue. Never block the build on images.
- Copy final assets into `public/` as needed; leave `brand/` untouched.

### Watermark
- Footer text "Griffin Grader by Diego D." in `--color-muted`, small (12-13 px), on every page. On the live screen, inside the bottom toolbar.

### iPad specifics
- `touch-action: manipulation` on interactive elements (no double-tap zoom delay).
- On tiles: `-webkit-user-select: none; -webkit-touch-callout: none;` so long-press doesn't select text or open the iOS callout.
- No hover-only UI. Respect `env(safe-area-inset-*)`. Works in portrait, landscape, and Split View.
- Respect `prefers-reduced-motion`. Transitions ~150 ms.
- All buttons have accessible names; sheets trap focus; attendance status also shown as text.

---

## 6. PWA and offline

- Web manifest: `name: "Griffin Grader"`, `short_name: "Griffin Grader"`, `display: "standalone"`, `start_url: "./"`, `scope: "./"`, `theme_color` and `background_color` navy, icons from 5.
- iOS tags in `index.html`: `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title="Griffin Grader"`, `apple-touch-icon`.
- Service worker precaches every build asset. After the first load the app must work in **airplane mode**, including reload.
- Zero runtime requests to other origins.

---

## 7. Data safety rules
- Every write goes through a small repository layer (`src/db/*`) inside Dexie transactions. Components never touch tables directly.
- A failed write shows an error toast; never pretend it saved.
- Assessments, attendance and sessions are never hard-deleted except by explicit user delete, "Erase everything", or restore.
- Backup -> erase -> restore must round-trip to identical data (tested).

---

## 8. Performance targets
- Tap level -> badge updates: < 100 ms on a 2020+ iPad.
- Open student sheet: < 150 ms.
- 40-tile grid scrolls without jank. Memoize tiles; query counts per session once, not per tile.
- Initial JS bundle: aim < 250 KB gzipped.

---

## 9. Project structure

```
/                      (existing: SPEC.md, CLAUDE.md, brand/ -- never delete or overwrite)
  index.html
  vite.config.ts
  package.json
  src/
    main.tsx
    app/            App.tsx, routes.tsx, layout (TopBar, Footer watermark)
    db/             db.ts (Dexie schema), seed.ts, repos: classes.ts, students.ts,
                    rubrics.ts, sessions.ts, attendance.ts, assessments.ts, teams.ts,
                    backup.ts
    features/
      onboarding/   classes/   live/   rubrics/   export/   settings/
    lib/            roster/parsePaste.ts, roster/parseCsv.ts, export/powerschool.ts,
                    export/fullLog.ts, teams/randomize.ts, names.ts, dates.ts,
                    share.ts, wakeLock.ts
    components/     Button, Sheet, Toast, SegmentedControl, Tile, LevelButton, Banner
    styles/         theme.css, global.css
  public/           icons, crest
  tests/e2e/        Playwright specs
  docs/
    BUILD-LOG.md    running log (see CLAUDE.md)
    TEACHER-GUIDE.md
  .github/workflows/deploy.yml
  README.md
```

---

## 10. Testing and Definition of Done

### Unit tests (Vitest)
- `parsePaste`: every accepted format, blank lines, extra spaces, accents, apostrophes, hyphens, 3-word names, tab-separated with number.
- `parseCsv`: header detection for plausible PowerSchool headers (`Student Number, Last Name, First Name`, `Student Name` as "Last, First", odd casing), manual mapping override. Fixtures in `src/lib/roster/__fixtures__/` (label them as guesses, not real exports).
- `randomize`: every student exactly once; sizes differ by at most 1; 22 in groups of 4 -> [4,4,4,4,3,3]; N groups mode; presentOnly filter; deterministic with an injected seeded RNG.
- `powerschool` export: latest level per category, comment joining, sort order, union of categories across rubrics, BOM present, CRLF, quoting of commas/quotes.
- `names`: initials and duplicate disambiguation.
- Attendance cycle function.
- Backup round-trip with `fake-indexeddb`.
- Component test: tapping a level in the Student sheet creates an assessment and the tile badge shows 1.

### E2E (Playwright, WebKit, `iPad Pro 11` landscape and portrait)
1. Fresh app -> create class by paste (6 students) -> default rubric -> start class.
2. Attendance mode: mark 3 present, 1 late, leave 2 absent; header counts correct.
3. Open a present student, tap Skills PR2, add comment "Great effort" -> badge shows 1; tap Teamwork EX1 -> badge shows 2.
4. Grade an absent student -> becomes Present, toast shown.
5. Teams: groups of 2, present only -> every present/late student in exactly one team.
6. End class -> summary lists unassessed students.
7. Export today -> PowerSchool CSV contains the expected row values (assert on generated content).
8. Reload -> all data still there.
9. Offline: after service worker is active, go offline and reload; app still loads (if Playwright can't exercise the SW reliably, assert the precache manifest includes `index.html` and all JS/CSS, and note it).

### Definition of Done (all must pass; report each as pass/fail)
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build` all succeed.
- No console errors on any screen.
- Manual QA checklist exists in `README.md` for Diego to run on a real iPad.
- `docs/TEACHER-GUIDE.md`: one page, plain language: install, add a class, take attendance, grade, teams, export, backup.
- Final summary lists every assumption from section 12 and anything you couldn't do.

---

## 11. Deployment (GitHub Pages)
- `vite.config.ts` reads the base path from an env var (`BASE_PATH`, default `/`). The workflow sets it to `/<repo-name>/`.
- `.github/workflows/deploy.yml` builds on push to `main` and deploys with the official Pages actions (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`).
- README explains: create the repo, push, then repo Settings > Pages > Source: **GitHub Actions**, then the URL to share with teachers.
- **Do not create a GitHub repo, add a remote, or push without Diego's explicit OK.** Local git commits are fine.

---

## 12. Assumptions (implement these defaults; list them in the final summary so Diego can confirm)
1. Level order is DV1 < DV2 < PR1 < PR2 < EX1 < EX2 (Developing, Proficient, Extending).
2. Grading an Absent student auto-marks them Present (with Undo).
3. The PowerSchool sheet uses the **latest** level per category in the range (not an average).
4. The unassessed flag applies to Present/Late students with 0 entries in the current session.
5. Default categories: Skills, Teamwork, Participation, Sportsmanship.
6. Attendance doesn't affect grades; it's a stat only.

---

## 13. Build order
Work in phases. After each phase: run typecheck + unit tests, fix failures, make a local git commit, and append to `docs/BUILD-LOG.md`.

0. **Scaffold** in the existing folder **without deleting anything** (don't run a scaffolder that wipes the directory; scaffold into a temp dir and move files, or create files by hand). `git init` if needed. Tooling, theme tokens, layout shell, footer watermark, brand assets/icons.
1. **Data layer**: Dexie schema, seed, repositories, backup/restore + unit tests.
2. **Classes + roster import** (paste + CSV mapper) + class page + student history.
3. **Rubrics + quick comments** editor.
4. **Live screen**: sessions, attendance mode, tiles, badges, flag, student sheet, grading, undo.
5. **Teams**: randomizer, panel, Teams view.
6. **Export**: preview, PowerSchool CSV, full log, share helper.
7. **Settings, onboarding, PWA** (manifest, SW, install card, update banner, wake lock).
8. **E2E tests, polish, README, TEACHER-GUIDE, deploy workflow**, final Definition of Done report.
