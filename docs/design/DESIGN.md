# Griffin Grader: visual direction

Open `docs/design/preview.html` to see it. The preview loads the real
`src/styles/theme.css`, so editing a token there changes the preview too. That
is the test for whether the token system actually works.

## The idea

A PE teacher uses this standing up, mid-period, holding the iPad in one hand
while a game is going on. They are not reading, they are glancing. So the app
is built around one band at the top of the screen that can be read at arm's
length while walking: **the scoreboard**.

Everything else stays quiet so the scoreboard and the student grid do the work.

## Signature: the scoreboard

A navy band with a gold rule under it, holding four live counts as big tabular
numerals with small uppercase labels: Present, Late, Absent, Graded.

- **Graded (13/20) is the only gold number on the screen.** "Have I missed
  anyone?" is the question a teacher actually worries about, so it gets the
  accent and nothing else competes for it.
- There is no second progress bar or coverage strip anywhere. One device, used
  once.
- Counts use `font-variant-numeric: tabular-nums` so a digit changing from 1 to
  7 does not shift the layout while the teacher is mid-tap.
- The band wraps on its own instead of at a chosen breakpoint, because the
  class name is free text whose length we do not control. Verified at 1194
  (landscape), 834 (portrait) and 507 (Split View).

## Type: one family, three registers

No web fonts, because the app has to load in airplane mode. Personality comes
from how the system font is set, not from which font it is.

| Register | Where | How |
|---|---|---|
| **Count** | Scoreboard, badges, any number that changes on tap | 34px, weight 800, tight tracking, tabular figures |
| **Stencil** | Labels, level codes, status words, team names | 11px, weight 600, uppercase, +0.08em tracking |
| **Plain** | Student names, sentences, comments | 16px, weight 400 to 500 |

The stencil register is the jersey-lettering voice. It is what makes the app
feel athletic without needing a decorative typeface.

## Colour

The five brand colours are locked by `SPEC.md` section 5. Two of them fail
WCAG AA when used for text, so the theme adds text-safe variants rather than
changing the brand colours:

| Token | Contrast | Verdict |
|---|---|---|
| `--color-sky` `#4A90C2` on `--color-bg` | 3.23:1 | Fine for a ring or border, fails for words |
| `--color-sky-deep` `#2E6E9E` on `--color-bg` | 5.10:1 | Added, used for PR tier and links |
| `--att-absent` `#9CA3AF` on `--color-bg` | 2.37:1 | Fine for the dashed rule, fails for words |
| `--att-absent-ink` `#5B6472` on sunken | 4.9:1 | Added, used for the word "ABSENT" |

Everything else passes AA. Gold never takes white text (2.42:1); it takes navy
(6.83:1). All 8 team colours pass AA against their own text, and teams are
always named as well as coloured.

Rubric tiers: level "1" is a tint, level "2" is the full colour. Tint buttons
carry a 2px edge in the tier colour, because a pale fill sitting next to a
saturated one reads as a disabled control without one. The level code is always
printed, so colour is never the only signal.

## Motion

Three places, nothing else:

1. Tile and button press: `scale(0.97)` over 100ms.
2. Long-press to cycle attendance: a 500ms fill, because the spec asks for
   visible feedback that the half-second hold is registering.
3. Sheet rise: 150ms.

`prefers-reduced-motion` zeroes the first and third via the token values.

## Decisions worth knowing

- **Absent tiles are recessed, not faded.** The spec asks for `opacity: 0.45`,
  which drops the student's name to roughly 2:1 against the page. Lowering the
  surface instead (sunken fill, dashed border, darker ink) gives the same
  "switched off" read and stays legible. Flagged for Diego.
- **"Mark all present" is attendance-mode only.** A roster-wide action that is
  always one tap away is a way to lose a period of attendance by accident.
- **Class cards have no block-number spine.** `ClassGroup` stores one free-text
  `name`, so a block number is not a field we have. The card shows today's
  session state instead, which is real data and is what a teacher scans for.
- **The undo toast sits in the bottom toolbar**, not floating over the grid.
  The undo window is what makes fast tapping safe, and a floating toast would
  cover the tiles it is talking about.
- **Teams view uses the same tiles laid on their side**, keeping initials,
  badge and attendance marks, so grading works identically in either view.
- **No sequence numbering anywhere.** The screens are not a sequence. The new
  class wizard is, so numbered steps belong there and only there.

## Not yet designed

Rubric editor, export preview, settings, onboarding and the install card. They
inherit these tokens and registers.
