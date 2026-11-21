# Griffin Grader: rules for Claude Code

**What this is:** an offline iPad PWA for Ernest Manning High School PE teachers to take attendance, grade students with a rubric (DV1 to EX2), split teams, and export for PowerSchool. Built by Diego D. (a high school student). Full spec: `SPEC.md`. It is the source of truth.

## Always
- Read `SPEC.md` before planning or making big changes. Follow its locked decisions (section 2). If you want to deviate, ask first and explain the tradeoff.
- Work in the phases from SPEC.md section 13. After each phase: run `npm run typecheck` and `npm test`, fix failures, commit locally, and append an entry to `docs/BUILD-LOG.md`.
- **Teach while you build.** Diego wants to keep his coding skills sharp. Each BUILD-LOG entry should have: what was built, key decisions and *why*, anything tricky (with the file to look at), open issues. Keep it short and concrete. Add brief comments in code where the *why* isn't obvious (not what the line does).
- TypeScript strict, no `any`, small focused components, all DB access through `src/db/` repositories.
- All colours come from CSS custom properties in `src/styles/theme.css`. Never hard-code hex values in components.
- Keep the footer watermark "Griffin Grader by Diego D." on every page.

## Never (without asking Diego first)
- Delete or overwrite `SPEC.md`, `CLAUDE.md`, or anything in `brand/`.
- Create a GitHub repo, add a git remote, or `git push`.
- Add a new runtime dependency not listed in SPEC.md.
- Add any analytics, tracking, external fonts/CDNs, or network calls at runtime.
- Store or send student data anywhere except the device's IndexedDB.

## Commands (once scaffolded)
- `npm run dev` : dev server (`npm run dev -- --host` to open it from an iPad on the same wifi)
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run test:e2e` / `npm run build`
- `bash brand/get-logos.sh` : downloads the school logos into `brand/` if missing

## Writing style for UI text and docs
- Short, plain, teacher-friendly. No jargon in the UI.
- Don't use em dashes. Use commas, colons, or parentheses.
- Don't write "not X, but Y" style sentences. Just say the thing.
