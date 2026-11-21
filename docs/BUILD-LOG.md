# Griffin Grader build log

Running log of what was built, why, and what's still open. Newest entries at the bottom.

## 2026-11-21: Planning
- Studied Tap & Tally (tapandtally.com): tap a student, tap a behaviour, counts kept per day; data in one localStorage blob; not installable offline.
- Decided: TypeScript + React + Vite PWA on GitHub Pages, data in IndexedDB (Dexie), no backend. Reason: iPads need the app served from a URL once, but after "Add to Home Screen" it runs offline and student data never leaves the iPad.
- Grading model: rubric categories (Skills, Teamwork, Participation, ...) x levels DV1-EX2 + comment. Attendance starts Absent, cycles to Present/Late.
- Spec written: `SPEC.md`. Rules for Claude Code: `CLAUDE.md`.
- Target: teacher trial Monday Nov 23, 2026.

### Open questions
- Need a real PowerSchool roster CSV export from a teacher to confirm column names.
- Higher-res school logos would make sharper app icons.

## 2026-11-21: Visual direction (pre-scaffold)

**Built:** `src/styles/theme.css` (all design tokens), `src/styles/global.css`
(reset, type registers, iPad rules), `docs/design/preview.html` (static mockup
of the live class screen, student sheet, classes list and teams view),
`docs/design/DESIGN.md` (the direction written down). Ran `brand/get-logos.sh`,
both logos downloaded.

No app code yet. This is the groundwork for phase 0.

**Key decisions and why:**

- *The scoreboard is the signature.* A navy band of big tabular counts, read at
  arm's length while walking the gym. "Graded 13/20" is the only gold number on
  the screen, because "did I miss anyone?" is the thing a teacher actually
  worries about. Deliberately no second progress bar: one bold device, used
  once, everything else quiet.
- *Three type registers from one system font* (Count / Stencil / Plain). No web
  fonts allowed, so the personality has to come from weight, case and tracking
  instead of from the typeface. The uppercase letter-spaced "stencil" register
  is what makes it read as athletic.
- *Tabular figures everywhere a number changes.* Without `tabular-nums`, a
  count going 1 to 7 shifts the layout under a finger that is mid-tap.
- *Contrast was measured, not eyeballed.* Script in the scratchpad; results in
  `DESIGN.md`. Two spec colours fail AA as text, so the theme adds
  `--color-sky-deep` and `--att-absent-ink` rather than changing the brand
  colours.

**Tricky bits:**

- The scoreboard overlapped itself at iPad portrait width (834px). Fixed by
  letting the band wrap on its own (`flex-wrap` plus a flex-basis on the
  identity block) instead of picking a breakpoint. The class name is free text,
  so any fixed breakpoint is a guess. See `.scoreboard` in `preview.html`.
- The navy crest disappears on the navy band. It now sits on a small white
  plate.
- Pale tint level buttons (DV1, PR1, EX1) read as disabled next to the solid
  ones. Added `--tier-*-edge` tokens for a 2px outline.

**Needs Diego's OK (one deviation from SPEC):**

- SPEC 4.5 says absent tiles get `opacity: 0.45`. That puts the student's name
  at about 2:1 contrast, which fails the AA rule in SPEC 5. Built them as a
  recessed surface instead (sunken fill, dashed border, darker ink), same
  "switched off" read, still legible. Say if you want the literal opacity.

**Open:**

- Rubric editor, export preview, settings and onboarding are not designed yet.
- Icon generation from `em-griffin-athletics.jpg` still to do in phase 0.

## 2026-11-21: Phase 0, scaffold and installable PWA shell

**Built:** Vite + React + TypeScript project hand-created into the existing
folder (nothing deleted). App shell with `TopBar`, hash routes, footer
watermark, update banner. App icons generated into `public/icons/`. Manifest,
iOS meta tags, service worker, and `.github/workflows/deploy.yml`.

`npm run typecheck` pass, `npm run lint` pass, `npm test` pass (3 tests),
`npm run build` pass. Bundle is **84 KB gzipped** against the 250 KB budget,
with Dexie and PapaParse still to come.

**Key decisions and why:**

- *Phase 0 now includes the manifest, service worker and deploy workflow.*
  SPEC 13 puts those in phases 7 and 8, but neither is polish: without Home
  Screen install iPadOS can evict the data, and without a deploy there is no URL
  to hand a teacher. Proving that path first means features are not built on an
  unverified foundation. Agreed with Diego before starting.
- *TypeScript 6.0.3, not 7.0.2.* npm's current TypeScript is the Go rewrite, and
  `typescript-eslint` declares `typescript >=4.8.4 <6.1.0`. TS 7 would leave
  `npm run lint` broken, which SPEC 10 requires to pass. 6.0.3 is the newest
  release inside the supported range.
- *`noUncheckedIndexedAccess` is on.* It makes `arr[i]` yield `T | undefined`,
  which is friction, and it is friction exactly where the team splitter and the
  CSV mapper live. Those index into arrays whose length they computed somewhere
  else, which is where off-by-one bugs hide.
- *Service worker is `registerType: 'prompt'`, never `autoUpdate'`.* See
  `src/app/pwa.ts`: `holdUpdates()` lets the live class screen defer a waiting
  worker, and a worker that became ready mid-class is offered as soon as the
  class ends. A reload mid-period would lose a teacher's place.

**Tricky bits:**

- *The app icon.* SPEC 5 says to centre the athletics mark on a navy square, but
  that mark's griffin is itself navy, so it vanished into the field. Recolouring
  the griffin to white also failed: the "EM" letters are navy with a gold
  outline, so their interiors turned white too and the letters dissolved into a
  slab (there is a screenshot of this failure in the session). The fix keeps the
  mark in its real colours on a white rounded plate, which is also how the crest
  is treated in the top bar, so the icon and the running app agree.
  See `scripts/make-icons.mjs`. It uses headless Chrome rather than an image
  library, so no dependency was added, and it never exits non-zero.
- *ESLint 10 no longer pulls in `@eslint/js` or `globals`*, so both had to be
  added explicitly or `eslint.config.js` cannot resolve its own imports.
- *Precache manifest had duplicate entries* because `includeAssets` overlapped
  `globPatterns`. Verified the remaining duplicates all carry identical
  revisions, so Workbox dedupes them with no install conflict. 14 entries,
  `index.html` plus all JS and CSS included, which is what SPEC 10 test 9 wants
  to assert on.

**Open:**

- 4 moderate npm audit findings, all in `workbox-build`'s `glob`/`minimatch`
  chain. Build-time only, nothing ships to the iPad. Not worth a forced
  breaking upgrade before the trial.
- Nothing is deployed yet. Diego needs to create the repo and set
  Settings > Pages > Source to GitHub Actions before an iPad can install it.
- The absent-tile contrast deviation from SPEC 4.5 is still unconfirmed.

## 2026-11-21: Phase 1, data layer

**Built:** `src/db/` (types, Dexie schema, seed, nine repositories including
backup and restore), `src/lib/ids.ts`, `src/lib/dates.ts`. 52 unit tests pass,
typecheck and lint clean.

**The thing worth remembering: IndexedDB cannot index a boolean.**

SPEC section 3 suggests `classes: 'id, archived'` and
`students: 'id, classId, [classId+active]'`. Both of those columns are
booleans, and valid IndexedDB keys are only number, string, Date, ArrayBuffer
and Array. This does not fail quietly. Querying `[classId+active]` throws
`DataError`, so *every* "list the active students in this class" lookup would
have crashed the moment a class screen opened.

Fix: drop both from the index strings and filter in memory after an indexed
lookup on `classId`. A class holds about 40 students, so the scan is free. The
model keeps its booleans, so nothing in SPEC section 3 had to change.
`src/db/db.test.ts` contains a test that builds the *suggested* index and
asserts it throws, so the index cannot be "helpfully" added back later.

**Other decisions and why:**

- *Attendance rows are created lazily.* Missing row means absent (SPEC 4.5), so
  starting a class writes nothing. Readers must go through `statusFor` or
  `statusMapForSession` rather than assuming a row exists. 40 writes avoided
  every time a class starts.
- *Assessments snapshot `categoryName` and `levelCode`.* A rubric edit in March
  must not rewrite what a teacher recorded in November.
- *A stale session closes at its last activity, not at now.* A class someone
  forgot to end on Friday would otherwise look like it ran all weekend. See
  `lastActivityAt` in `src/db/repos/sessions.ts`.
- *Restore writes in 2000-row chunks inside one transaction.* SPEC section 1
  asks for a full school year, which is six figures of assessments; handing
  that to IndexedDB as a single array spikes memory on an iPad. Either the
  whole restore lands or none of it does.
- *`parseBackup` validates before anything is erased.* A restore replaces
  everything, so a wrong file has to fail up front. A missing table is treated
  as empty rather than fatal, because an older backup may simply not have had
  one.

**Tricky bits:**

- *`vi.useFakeTimers()` deadlocks Dexie.* Dexie and fake-indexeddb schedule
  their own work, and freezing the timers hangs them: five tests timed out at
  10s each. `vi.useFakeTimers({ toFake: ['Date'] })` fakes the clock and leaves
  the scheduler alone. See the top of `src/db/repos/sessions.test.ts`.
- *`db.transaction()` positional overloads stop at five tables.* Deleting a
  class touches six, so it uses the array form instead.

**Open:**

- `exactOptionalPropertyTypes` is off. With it on, `{ studentNumber: undefined }`
  and "no studentNumber" become different types, which fights Dexie's update
  patches. Worth revisiting after the trial.

## 2026-11-21: Phase 2, classes and roster import

**Built:** `parsePaste`, `parseCsv` with an editable column mapper, `names`
(tile labels), the classes list, the three-step new class wizard, the class
page (roster, settings, delete) and the student page (details, attendance
totals, editable entry history). 112 tests pass, typecheck and lint clean.

**Key decisions and why:**

- *Tab-separated pastes are always read as First then Last.* A spreadsheet is
  equally likely to hold either order and there is no way to tell per line, so
  rather than guess cleverly the preview offers one "Swap first and last"
  button that fixes the whole list in a tap.
- *The CSV mapper prefers a split First/Last pair over a combined "Student
  Name" column*, and prefers "Student Number" over a bare "Number". Nobody has
  seen a real PowerSchool export yet, so matching is exact-then-contains and
  every guess is editable. Fixtures live in
  `src/lib/roster/__fixtures__/powerschool.ts` and are labelled as guesses.
- *Numbered steps appear in the new class wizard and nowhere else.* It is the
  only part of the app that is genuinely a sequence, so the numbers carry real
  information there and would be decoration anywhere else.
- *Editing a student's name lives on the student page, not inline in the
  roster table.* The table is for scanning 40 rows; putting three text inputs
  in every row would wreck that.

**Tricky bits:**

- *`displayNames` had a real bug the tests caught.* Collisions were detected by
  comparing the rendered label, so "Martin" and "Martinez" separated into
  "Alex Martin" and "Alex Martin." The only difference was a full stop, which
  is invisible across a gym. Fixed by comparing the surname prefix instead of
  the label, giving "Alex Martin" and "Alex Martine.". See `prefixKey` in
  `src/lib/names.ts`.
- *Headless Chrome screenshots are useless for this app now.* Chrome's
  `--virtual-time-budget` flag does not drive IndexedDB callbacks, so every
  page renders blank because `useBoot` never resolves. Verified with a minimal
  IndexedDB probe over http. Visual checks now go through Playwright WebKit
  instead, which is the right engine anyway since iPads run WebKit. This cost
  about twenty minutes of chasing a bug that did not exist.
- *`App` renders null until the first-run seed lands*, so component tests have
  to use `findBy*` rather than `getBy*`.

## 2026-11-21: Phase 3, the live class screen

**Built:** the core screen. Scoreboard, tile grid with badges and the
unassessed flag, attendance mode, long-press to cycle, student sheet with
grading and autosaving comments, undo toasts, wake lock, End class summary.
Plus the shared `Sheet`, `Toast` and `SegmentedControl` components. 120 tests
pass (8 new on the grading loop), typecheck and lint clean. Bundle 138 KB
gzipped, still well under the 250 KB budget.

**Key decisions and why:**

- *One query for the whole screen, never one per tile.* `useLiveSession`
  fetches students, attendance, counts and rubric in a single `useLiveQuery`.
  Forty tiles each holding their own live subscription would mean forty
  re-renders per tap, and SPEC 8 wants the badge under 100ms.
- *`Tile` is memoised.* Same reason. The grid re-renders on every tap and only
  one tile actually changed.
- *Long-press cancels on movement and on `pointercancel`.* It is competing
  with text selection, the iOS callout and iPad's press-and-drag all at once.
  A completed hold also suppresses the click that follows it, so one gesture
  never both cycles attendance AND opens the sheet. See
  `src/lib/useLongPress.ts`.
- *The service worker is held back while a class is open.* `holdUpdates(true)`
  on mount, released on unmount, and a worker that arrives mid-class is offered
  the moment the class ends.
- *Undo restores a deleted entry with its original id*, so it is the same row
  coming back rather than a lookalike.
- *Roster-wide buttons only exist in attendance mode.* "Mark all absent" one
  tap away at all times is a way to lose a period of attendance.

**Tricky bits:**

- *Tile sizing was wrong and the screenshot caught it.* `--tile-min-w` was the
  spec's 120px floor, which packs **8** columns across an iPad in landscape;
  SPEC 4.5 asks for 5 to 6. Raised to 11rem, which makes
  `repeat(auto-fill, minmax(…, 1fr))` land on exactly 6 / 4 / 2 for landscape,
  portrait and Split View. Measured all three in WebKit rather than guessing.
- *The attendance hint wrapped to six lines in Split View* and pushed the grid
  off screen. It is hidden under 700px; the gold "Taking attendance" label and
  the two buttons already carry the meaning.

**Open:**

- The Teams button shows a placeholder toast until phase 6.
