# The platform model

Roadmap II, Prompt 49: the design gate for one shell, one taxonomy and one
set of surfaces. The acceptance criteria were committed before any
prototype existed (`spike/platform-shell/CRITERIA.md`, commit 8761b90 on the
`spike/platform-shell` branch). The prototype and its measurements stay on
that branch (d450026); this document and a register row are what land.

**Verdict: B.** The taxonomy, the surface map, the shell specification, the
templates, the responsive specification and the dialog and first-run
policies are ready for Prompt 50. The shell met C1, C3, C4 and C5, and C2's
size limits. It failed C2's last clause: on both prototyped pages it put the
route over its ceiling. So Prompt 50 may put the shell on a page only where
that page's route pays for it. See "What B authorizes" below.

## The criteria, as measured

Measured on the `spike/platform-shell` branch at d450026, from its own tree,
by `spike/platform-shell/measure.mjs` (Chromium, headless, service worker
blocked). Results are in `spike/platform-shell/results/measure.json`.

| | Criterion | Measured | Met |
|---|---|---|---|
| C1 | Every capability within two activations from Home, by mouse, keyboard and touch | All 19 entry pages reached in two activations (open a group, follow a link) from both prototyped pages, by mouse, keyboard (Tab moves, Enter activates) and touch | yes |
| C2 | One header, navigation, footer, locale and theme switch from one module; ≤ 6 KB JS and ≤ 4 KB CSS as served; precached; no route budget exceeded | `js/shell.js` **2.9 KB** gzipped (8.3 KB raw, 5.6 KB minified); `css/shell.css` **0.9 KB** gzipped. Precached by the default `js/*.js` rule. **Route budgets: teaching 254.2 KB of 246.4, Observatory 182.9 KB of 175.3.** Both over | size yes; routes **no** |
| C3 | Axe clean on every page, all four themes, both languages | 0 violations (WCAG 2.2 AA rule tags) on the shell and on the whole page: 2 pages × 4 themes × 2 languages, with a navigation group open | yes |
| C4 | Layouts at 375, 768, 1024 and 1440 px | Specified below. On the prototype, no horizontal overflow on either page at any of the four widths; the Observatory had an observation open (`?open=tess-light-curve`) | yes |
| C5 | At most eight nouns, with a mapping from every current name | Eight nouns; the mapping is below | yes |

Why the routes fail. Route budgets count the raw bytes of every script a page
fetches, because the site is served unbundled. The shell adds 8.3 KB raw to
each page, or 5.6 KB minified, and neither route has that room. The page's own
chrome code that the shell replaces is far smaller. The Observatory's and the
teaching page's language-switch functions are under 1 KB each.

## What is there today

Nineteen entry pages (`history/original/` excluded: it is kept as it was).
The inventory script is `spike/platform-shell/inventory.py`. It reads each
page's links, and every route named in its static import closure.

| Page | Shell today | Linked from | Links out |
|---|---|---|---|
| `/` (the application) | menu, locale, footer | 16 pages | figure, instructors, model, teaching, validation |
| `/model/`, `/validation/`, `/teaching/`, `/instructors/` | `doc-nav` bar, footer; the bar differs on every page | 3–5 document pages and `/` | each other, `/` |
| `/evaluation/` | none | instructors, teaching | three document pages |
| `/observatory/`, `/catalog/` | "Back to Gravitas", locale buttons | each other | `/`, each other |
| `/studio/`, `/studio/lesson/`, `/studio/course/`, `/course/` | "Back to Gravitas", locale buttons | each other | `/`, each other |
| `/figure/` | "Back to Gravitas", locale | `/` | `/` |
| `/lab3d/`, `/mission/` | "Back to Gravitas", locale | `/3d/`; `/mission/lab/` | `/` |
| `/3d/`, `/experiments/`, `/mission/lab/` | "Back to Gravitas", locale | **nothing** | `/` |
| `/instructors/submissions/` | locale | **nothing** on `v2` (Prompt 47 Part C links it) | **nothing**: a dead end |

Deep links that reach a capability, and the only way to reach several of
them today: `#investigation=`, `#investigations`, `#activity=`, `#a1…`
(assignment), `#1z…` (a world), `?author=&step=`, `?assign=`, `?roster=`,
`?embed=` and `?ev=` (figures), `?guide=`, `?open=`, `?installed=`,
`?course=`, `?system=`, `?view=`, `?activity=`, `?format=`, `?path=`,
`?parent=`.

## The nouns

Eight, as the roadmap's section 8.1 proposed. Every current name maps to
one.

| Noun | What it is | Today's names |
|---|---|---|
| **Scenario** | A reproducible starting world: bodies, settings, seed | scenario, preset, world, system (Orbital System Builder), scenario pack, share-link world |
| **Investigation** | A guided sequence of steps with predictions, measurements and questions | investigation, lesson, guided investigation, guide (Observatory, 3-D lab, mission lab), suite, investigation pack |
| **Activity** | A classroom format cut from an Investigation, or a selection of its steps | classroom activity, teaching route, demonstration, assignment |
| **Dataset** | A pinned, cited observation or model table, with its provenance | data pack, observation, fixture, table pack, ephemeris pack, archive import |
| **Experiment** | A declared run of the model over parameters and seeds | experiment, A/B bench run, sweep, trial, inference run, fit |
| **Course** | An ordered set of the above, with objectives, prerequisites and time | course, course pack, sequence ("ways through") |
| **Evidence** | Anything a student produces | measurement, capture, notebook entry, figure, lab report, submission token, progress backup, results export |
| **Package** | The unit of distribution for authored or curated content | capability package, extension, catalog entry |

A name that is not a noun is either a surface (Observatory, Studio, Catalog)
or a verb (assign, install, embed).

## The surfaces

| Surface | Today | After Prompts 50–57 |
|---|---|---|
| **Home** | `/` opens straight into the simulation, with a welcome dialog on first visit | A hub at `/`: three ways in (explore, learn, teach), the Library, My work and Courses. The simulation stays at `/` behind "Explore"; the welcome's tour becomes onboarding (Prompt 73) |
| **Sandbox** | `/` | Unchanged; reached from Home and from every page's Labs group |
| **Library** | the lesson browser, a dialog in `/` | One Library of Investigations, Activities, Scenarios, Datasets, Courses and Experiments (Prompt 54). The teaching page's activity list and the scenario gallery become filters of it |
| **Observatory** | `/observatory/` | Stays; its guides become Investigations (section 8.3 of the roadmap) |
| **Experiments** | `/experiments/`, linked from nowhere | Stays; in the Learn group and the Library |
| **Labs** | `/3d/`, `/mission/lab/` and their diagnostic pages | Stay as peers of the Sandbox. The diagnostic pages (`/lab3d/`, `/mission/`) move to About, beside validation |
| **Courses** | `/course/` | Stays; in Learn and on Home |
| **My work** | none | New (Prompt 69): Evidence in one place |
| **Teach** | `/teaching/`, `/instructors/`, `/instructors/submissions/`, `/evaluation/` | One Teach group, and a hub at `/teaching/` that links the portal, submission review and the evidence kit (Prompt 76) |
| **Studio** | `/studio/`, `/studio/lesson/`, `/studio/course/`, `/figure/`, `/catalog/` | One Make group. The four builders stay pages; the catalog stays a page |

Nothing merges into a single-page application. Pages stay pages; what they
share is the shell.

## The shell

- **Header:** the product name, linking Home; the primary navigation; the
  locale switch; the theme switch.
- **Primary navigation:** five groups, each a disclosure button that shows
  its links: **Learn** (Investigations, Courses, Observatory, Experiments),
  **Labs** (Sandbox, 3-D lab, Mission lab), **Make** (Scenario Studio,
  Investigation Composer, Course builder, Figure builder, Catalog), **Teach**
  (Teaching, Instructor resources, Submission review, Classroom evidence
  kit), **About** (the model, physics validation, the two diagnostic pages).
  - One group opens at a time. Escape closes it and returns focus to its
    button, and a click elsewhere closes it.
  - The current page is marked `aria-current="page"`.
  - It is the WAI-ARIA disclosure navigation pattern, not a menu: links stay
    links, and Tab moves through them.
- **"Back to":** none. Every page has the whole navigation, so no page is a
  dead end, and no link needs to be named after where it goes back to.
- **Footer:** physics validation, the source code, the citation.
- **Locale:** one select, which writes `gravitas_locale`. Every page already
  reads that key when it loads. A page that can re-translate in place passes
  `onLanguage` and does; the Observatory and the teaching page both can. Any
  other page reloads.
- **Theme:** one select over the four themes, which writes `gravitas_theme`.
  The shell uses only the design tokens in `css/tokens.css`, so all four
  themes apply to it.

### Page templates

- **Application:** `/` and the labs. The canvas is full-bleed, and the shell
  header is the only chrome above it.
- **Document:** model, validation, teaching, instructors, evaluation. The
  shell, then `doc-main`.
- **Tool:** Observatory, Experiments, Studio pages, catalog, figure builder,
  course home, submission review. The shell, then the tool's own `main`.
- **Hub:** Home and Teach. The shell, then cards.

### Dialogs

- **Modal:** only flows that must finish or be cancelled before anything
  else can happen: finishing a lesson, sharing, precise placement, a
  destructive confirmation, the export dialog.
- **Inline:** everything that is browsing or reading: the Library, the
  object inspector, settings and panels.
- The lesson browser, a modal today, becomes the Library page or panel.

### Commands

- One keyboard-shortcut catalogue, one "?" affordance in the shell header
  that opens it on every page, and the application's existing Shortcuts
  dialog as its content.
- A page adds its own shortcuts to the catalogue; it never defines a second
  help surface.

### First run

- One overlay at a time, in a fixed order:
  1. the storage or update notice, if any;
  2. the welcome (Home) or the page's own introduction;
  3. the guided tour, only when asked for.
- Nothing opens a second overlay while one is open. The application has 13
  dialogs today, and their order is decided by timing.

## Responsive layouts

Specified for Prompt 57. On the prototype, the shell itself holds at every
width.

| Width | Application with a lesson open | Observatory with an observation open |
|---|---|---|
| **1440** | Shell header; canvas; the lesson panel docked right at its current width; instruments docked beside it | Shell header; the linked views (plot, table, image) side by side; the provenance card beside them |
| **1024** | As 1440, the lesson panel narrower; one docked instrument at a time, as tabs | Plot above table and image, side by side below |
| **768** | Canvas above; the lesson panel as a bottom sheet at 50% height, draggable to full; instruments as tabs inside it | The views stacked: plot, table, image; the provenance card collapsed into a disclosure |
| **375** | The shell collapses to one Menu button, with the groups stacked beneath it (measured on the prototype). The lesson is a full-screen step with Next and Back fixed at the foot; the canvas is reached through a "Look" button and returns with one tap; instruments are a tab row under the step | The views stacked, one at a time, by tab; the table scrolls horizontally inside its own box and never the page |

Two rules hold at every width. The page itself never scrolls horizontally.
Controls are at least 24 by 24 CSS pixels (WCAG 2.2, 2.5.8).

The Studio pages are read-only under 768 px, with a note saying so. An
editor of this density is not usable on a phone, and a half-usable one loses
work.

## What B authorizes, and what it does not

For Prompt 50, under the "no ceiling increase" rule:

1. **The shell lands on a page only when that page's route pays for it.**
   It pays by removing the page's own header, navigation, locale and theme
   code, and by a smaller shell:
   - labels read from the page's existing catalog, not a second table
     (-2.2 KB raw);
   - comments stripped from the served module, if Prompt 109's pipeline
     allows.

   A page whose route still cannot pay keeps its current chrome, and 50
   lists it.
2. **Or Carl decides the route ceilings.** A per-route allowance of up to
   8 KB raw for the shell is the decision that would make C2 pass as
   written. Nothing in this PR raises a ceiling.
3. **The taxonomy, the surface map, the templates, the dialog, command and
   first-run policies and the responsive specification** are ratified as
   design for Prompts 50–57, within their own budgets.

Not authorized: the Library merge (Prompt 54) or any page restructuring
beyond the shell. The Home hub is part of Prompt 50, under the same rule: it
lands only if the front door's route pays for it.

### What the budgets allow today

Measured on `v2` c4d0984 (`node tools/route-budget.mjs --report`). The shell
needs about 5.6 KB of raw JavaScript and one request on each page it serves.

| Room for the shell | Routes (sources) |
|---|---|
| Kilobytes, and a request | experiments (7.6 KB), figure (5.2), course builder (4.9), studio (4.4), 3-D guides (4.1), 3-D lab (3.4) |
| Kilobytes, but no request | the four lesson routes (11 KB each, at their request ceilings) |
| Neither | front door and sandbox (0), teaching (0.3), evaluation (0.2), instructors (1.3), observatory (0.5), catalog (0.4), composer (0.1), course home (1.1), 3-D kernel page (0.4), mission (0.1), mission lab (1.7) |

A shell on only the first row's six pages would add a fifth shell to the
four there are now. So Prompt 50 is only useful once one of two things has
happened: Carl allows the shell its bytes on each route, or Prompt 109's
deploy pipeline serves minified sources and so gives the routes room.

## Rejected alternatives

- **A framework** (React, Vue, Lit). It would cost far more than the whole
  shell, give no capability the pages lack, and add a dependency the
  offline, unbundled deploy would carry everywhere.
- **A router, or a single-page application.** The site is 19 static pages
  served from the committed tree. Deep links, the service worker's precache
  and every page's route budget assume pages. A router would move every page
  into one start-up path.
- **An iframe or `<template>` include for the header.** An iframe breaks
  focus order, `aria-current` and the theme cascade. An HTML include needs a
  server the site does not have.
- **One header per template.** That is the four shells there are today.
