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
