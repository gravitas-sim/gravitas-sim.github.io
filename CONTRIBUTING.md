# Contributing to Gravitas

Gravitas is a teaching tool before it is a piece of software. The bar for a
change is not "does it work" but "does it teach the right thing, and can an
instructor trust it in front of a class". That shapes most of what follows.

Issues and pull requests are welcome. If you are not sure whether something is
wanted, open an issue first — it is cheaper than a rejected branch.

---

## Getting set up

Node 18 or newer (developed on 24).

```bash
npm install
npm run dev          # serves the repository root at http://localhost:8003
```

The unbundled ES modules run straight from disk, so there is no build step in
the development loop. `npm run build` exists for publishing, not for working.

---

## The checks

Everything CI runs, you can run:

```bash
npm test                  # jest: physics, data, formatting of numbers, i18n parity
npm run lint              # eslint (prettier runs inside it)
npm run format:check      # prettier, for the files it owns
npm run docs:check        # the counts in the docs still match the source
npm run check:architecture  # no import cycles, no low-level module importing up
npm run vendor:check      # vendor/ matches the pinned three.js, Chart.js and fonts
npm run a11y              # axe over every surface, plus the keyboard checks
npm run build             # a production bundle must still build
```

Depending on what you touched:

```bash
npm run validate:physics  # any change to js/physics.js or a tolerance
npm run e2e               # any change to the interface
npm run validate:scenarios  # any change to a scenario's initial conditions
npm run author:check      # any change to a lesson, a widget or a scenario name
npm run author:walk       # any change to the lesson engine or a widget's draw
npm run thumbnails:check  # any change to how a scenario looks
```

Two things worth knowing before you run the browser suite:

- `npx playwright install chromium` once, first.
- The suite reuses an existing dev server on its port. If you have a second
  checkout of this repository serving port 4173, your run will silently test
  _that_ one. `GRAVITAS_E2E_PORT=4199 npm run e2e` gives you a private server.

---

## The build is self-contained

Nothing the application needs is fetched from another origin. three.js,
Chart.js and the three font families used to come from jsdelivr and Google
Fonts; they are now pinned in `package.json`, bundled into `vendor/` by
`tools/vendor-deps.mjs`, and committed — because GitHub Pages serves the
repository root, so a generated file that is not committed is a 404 on the live
site.

```bash
npm run vendor          # regenerate vendor/ and css/fonts.css
npm run vendor:check    # fails if they no longer match the installed packages
```

`vendor:check` runs in CI, which is what stops a lockfile bump from moving
three.js while the site keeps serving the old copy.

Two rules follow from this:

- **Do not add a `<script src="https://...">`, a `@import url(https://...)` or
  a bare-specifier import.** `e2e/selfContained.spec.js` blocks every non-local
  request and then uses the application, the charts and the 3-D view anyway. It
  runs against the sources *and* the production bundle, because the two have to
  resolve the same files.
- **Both libraries must stay lazy.** Neither may enter the initial chunk.
  `npm run budget` enforces a ceiling on what a first-time visitor downloads;
  raising it means editing `tools/bundle-budget.mjs` in the same commit and
  saying in its `reason` what was added. Growth is allowed, unexplained growth
  is not.

Dependabot is configured conservatively in `.github/dependabot.yml`: grouped by
what breaks together, majors never grouped, and the vendored packages ignored
because a bump there needs `npm run vendor` and a look at the regenerated
bundles.

---

## Accessibility

The target is WCAG 2.2 AA. `ACCESSIBILITY.md` records what was fixed, what is
checked and — the part worth reading before adding a feature — the limits of
what a canvas simulation can offer.

```bash
npm run a11y            # both suites
npm run a11y:axe        # axe over 13 surfaces x 2 languages x 2 themes
npm run a11y:manual     # keyboard, focus, reflow, reduced motion, the canvas
```

Three things to know when adding an interface:

- **No axe rule is disabled, and none should be.** Two exemptions were
  considered during the pass and both turned out to be real defects.
- **Never quiet a check by hiding a control from assistive technology.** The
  3-D viewport carried `aria-hidden="true"` over two focusable buttons, so a
  keyboard reader could focus a close button and hear nothing. That is a worse
  defect than the one it silenced.
- **A modal must actually be modal.** If it declares `aria-modal="true"`, wrap
  it with `trapFocus()` from `js/focusTrap.js`, which cycles Tab inside it,
  marks the rest of the page `inert` and restores focus on release.

The canvas has a textual equivalent (`js/canvasSummary.js`) reached through
`aria-describedby`. It is deliberately **not** a live region: the simulation
changes sixty times a second, and announcing that would drown out everything
that matters. Discrete events go to the polite region instead, and a test
watches it for six seconds of ordinary running and fails if it is written more
than once.

---

## Module boundaries

The JavaScript is layered. A module may import from its own layer or any layer
below it, never above. `npm run check:architecture` enforces this and fails the
build on a violation; `npm run check:architecture:report` prints the layers and
the widest fan-out.

| Layer | What lives there | Examples |
| --- | --- | --- |
| `foundation` | Pure helpers and constants. No application state, no DOM. | `constants.js`, `utils.js`, `units.js`, `rng.js`, `spatialHash.js`, `i18n/` |
| `domain` | The science, as pure functions over numbers. What the validation suite imports directly. | `orbital.js`, `mond.js`, `darkMatter.js`, `chaos/`, `resonance/` |
| `services` | Stateful cross-cutting machinery with no opinion about the interface. | `quality.js`, `offline.js`, `referenceFrame.js` |
| `engine` | The simulation, and the world it is built into. | `physics.js`, `scenarios.js`, `world/build.js` |
| `state` | The objects the interface shares. | `appState.js` |
| `feature` | Everything that draws or is driven. | `render.js`, `controls.js`, `investigations.js`, `experiments/` |
| `coordinator` | Wires the rest together. Nothing may import these. | `ui.js`, `main.js` |

Two rules do the real work.

**Nothing imports a coordinator.** `ui.js` and `main.js` are where modules are
wired together, not where they go to find each other. When a module imports
`ui.js`, the import graph stops describing the application: it once said the
renderer depended on the settings panel, when what it actually depended on was a
settings object.

**The engine is handed what it needs.** `buildWorld` takes a context object
rather than importing the pieces it calls. That is why world construction is
reproducible: everything that can change the world it builds arrives through one
argument list, so a test can hold it fixed. It is also why the quality tier's
population caps are *read* during construction and never written back —
`SETTINGS` is the reader's document, and it is what a share link serialises and
what the A/B bench hashes.

### When you need something from a layer above

Three options, in order of preference:

1. **Move it down.** Usually the right answer, and usually smaller than it
   looks. `SOLAR_MASS_UNIT` lived in `physics.js`, so `units.js` imported the
   whole engine to find out what a solar mass is. It is a number; it moved to
   `constants.js`.
2. **Pass it in.** `buildWorld` gets `regenerateStarfield` through its context
   rather than importing `render.js`. That single edge was closing five of the
   eleven cycles the graph used to have.
3. **Record it.** If it is genuinely unavoidable, add it to `ALLOWED_UPWARD` in
   `tools/check-architecture.mjs` with a reason saying why. The list is
   shrink-only: the check also fails on an entry whose import no longer exists,
   so a fixed edge cannot quietly stay on the books.

There are three recorded entries, all of them `-> ui.js`, and all for the same
reason: `investigations.js`, `share.js` and `experimentsBridge.js` want
coordinator *behaviour* — load this scenario, rebuild that world — rather than
shared data. Removing them needs a command interface that does not exist yet.
Adding a fourth should feel harder than fixing the third.

---

## Conventions

**CSS is layered.** The order is `tokens, base, legacy, components, overrides`.
Component rules beat legacy rules on layer order alone, which is why nothing in
`components.css` needs `!important`. Colour belongs in `tokens.css`; no other
stylesheet should carry a hex value.

**One source of truth per fact.** A scenario's title, summary, concept tags and
thumbnail live in `js/data/scenarioInfo.js`, and every surface — the gallery,
the settings dropdown, the instructor materials — reads from there. The same
holds for lesson content and the habitable-zone model. Several tests exist only
to enforce this.

**User-visible text is a message id.** Strings live in `js/i18n/en.js` and are
reached with `t('rail.screenshot')` from JavaScript or `data-i18n="..."` from
HTML. `js/i18n/es.js` carries the Spanish. A key added to one catalog and not
the other fails `npm test`.

**Comments say why.** The codebase is unusually heavily commented and the
comments are about decisions, not mechanics — why the handles are stored in
world coordinates, why the integrator default cannot change. A comment that
restates the line below it will be asked about in review.

**Numbers in documentation are generated.** See
[Documentation](#documentation) below.

---

## Adding a scenario

Two places, both data:

1. **`js/data/scenarioInfo.js`** — the title, the summary a student reads, one
   to four concept tags from the fixed tag list, and a thumbnail path.
2. **`js/scenarios.js`** — a branch in `applyPreset` that transforms the
   settings object. It is a pure function of settings: it may not reach into
   the UI.

Then:

```bash
npm run thumbnails            # capture the thumbnail
npm run validate:scenarios    # conservation audit, in a real browser
npm run docs:sync             # the catalog count in the docs
```

A scenario has to demonstrate what its title claims within about thirty seconds
of loading, on a laptop, without the reader touching anything. If it needs a
paragraph of setup to be interesting, it is a lesson, not a scenario.

---

## Adding an investigation

A lesson is one module in `js/data/investigations/`, exporting a default object:

```js
export default {
  id: 'tides',
  title: 'Tides',
  subtitle: '…',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  summary: '…',
  objectives: ['…'],
  steps: [
    /* … */
  ],
};
```

Each step has a `type`, and the five types are the whole vocabulary:

| `type`     | What it does                                                           |
| ---------- | ---------------------------------------------------------------------- |
| `read`     | Prose, optionally with a `setup` that loads a scenario                 |
| `predict`  | Asks for a commitment before anything is shown                         |
| `question` | A graded question: `options` and an `answer`, or a numeric `tolerance` |
| `measure`  | Hands over a `tool` and takes the reading, with a `validate`           |
| `explore`  | A free-form checklist against a `rubric`                               |

Rules that are not obvious:

- **Predict before reveal.** Every measured result is preceded by a `predict`
  step. A lesson that shows the answer first teaches nothing.
- **The lesson owns no physics.** A step measures what the engine produces. If
  a lesson needs a number the engine cannot produce, fix the engine.
- **Answers carry a tolerance and a reason.** `tolerance` is not a fudge
  factor; it is the precision the instrument can actually deliver.

### The authoring toolchain

A lesson is not one file. It is a module, a translation shadow, two registry
entries, an entry in the synchronous barrel, an instructor-guide stub and two
generated manifests — and a broken reference between any of them is invisible
until a class hits it. Three commands cover that.

```bash
npm run author:new -- --id=tidal-heating --title="Tidal Heating"
npm run author:check
npm run author:walk
```

**`author:new`** scaffolds all six registration points and prints what to do
next. It never overwrites, so it is safe to re-run. The scaffold deliberately
does not pass `author:check` yet: the placeholder summary, objectives and
guide sections are there to be replaced, and the checker is the to-do list.

**`author:check`** validates every investigation and every step — ids, required
content, references to scenarios, widgets, controls and response fields, setup
values against the control ranges a widget actually has, answer shapes and
tolerances, whether the grader accepts the answer the lesson declares, whether
a validator accepts the author's own hint values, translation shape, instructor
guidance, and agreement between the lessons, both manifests, the answer keys and
the guides. `npm run author:rules` lists what is enforced and why; every finding
names its rule, so an argument with a finding is an argument with a rule in
`js/authoring/rules.js` rather than with the tool.

Errors fail the command and CI. Warnings do not, unless you pass `--warnings`:
they are things a person should look at, and a checker that fails on those gets
switched off and then it is checking nothing.

```bash
npm run author:check -- --lesson=tides    # one lesson
npm run author:check -- --json            # for an editor
```

**`author:walk`** is the part that cannot be done as data. The checker can see
that a step names a widget and that the widget has a control called `mass`; it
cannot see that the widget painted, that the scenario built, that a probe
produced rows against a live world, or that Next moved. The walker opens all 12
investigations in a browser and takes all 370 steps, sharded one lesson per
test so contexts are reused and a failure names its lesson. It takes about two
minutes and runs as part of `npm run e2e`.

It earns its keep: it is what found a widget that had never drawn — its `draw`
shadowed the imported translation function with the colour palette, so the
first row threw, the engine logged a warning nobody read, and the canvas was
blank — and three computed fields that could only ever be empty, because they
read a value measured on an earlier step and a computed field only sees its own
step's responses.

### Looking at one step

```
?author=<lesson-id>&step=<n>
```

Opens a lesson at any step with a diagnostics strip: the step's type, scenario,
widget and controls, response fields, answer and tolerance, and the checker's
findings for that step. There is a box to jump straight to another step, and
every finding `author:check` prints comes with the preview link for it.

The preview neither reads nor writes saved progress, so previewing step 30 of
Tides on a machine a class is using leaves that class's Tides where it was. It
is loaded dynamically and only when the URL asks for it, so none of it reaches
a student's download.

### After adding one

```bash
npm run manifest    # regenerate both lesson-card manifests
npm run author:check
npm test            # investigationRegistry.test.js catches a missed registration
npm run docs:sync   # lesson and step counts in the docs
```

The instructor guide and answer key for a new lesson are generated from it by
`npm run build:instructors` — you do not write them. The guide's `expectations`
are keyed by the **1-based step number**, the same number the panel shows and
the key prints; `author:check` fails if one points past the end of a lesson,
which is what happens when a step is inserted above it.

---

## Adding a language

The interface is fully extracted, so a new language is:

1. Copy `js/i18n/en.js` to `js/i18n/<code>.js` and translate the values. Keys,
   placeholders (`{n}`) and plural forms stay exactly as they are.
2. Add a row to `LOCALES` in `js/i18n/index.js` with the endonym and a one-line
   `coverage` sentence, written in that language, saying honestly how much is
   translated.
3. Optionally translate lessons: one file per lesson under
   `js/data/investigations/<code>/`, carrying words only. Arrays line up by
   index with the English and `null` means "not translated".

A lesson translation cannot reach a lesson's machinery — not a scenario name,
a seed, a widget id, a numeric answer or a probe — so a mistranslation can
change what a student reads but never what the simulation measures. Keep it
that way.

---

## Physics changes

Any change to `js/physics.js` needs `npm run validate:physics` before and after,
and the pull request should say which rows moved and by how much.

Tolerances are derived, not chosen: an integrated tolerance comes from the
integrator's measured convergence order, a published one from the precision the
source quotes. If you need to loosen a tolerance, the reason goes in the table
next to it.

The default integrator is Symplectic Euler and cannot change without re-tuning
every scenario, because each one was laid out against its error behaviour.

---

## Documentation

**Counts are generated.** Anything of the form

```markdown
**<!--fact:scenarios-->53<!--/fact--> built-in scenarios**
```

is written by `npm run docs:sync` from the catalog, the lesson manifest, the
test output or the build summary. Never edit the number by hand; run the sync.
One rule about placement: a marker must never be the first thing on a line.
Prettier reads a line-leading HTML comment as a block element and puts blank
lines around it, which splits the paragraph in three on the rendered page.
`docs:check` fails on it, so you will hear about it before a reader does.
`npm run docs:check` fails a pull request whose counts have drifted, and
`npm run docs:check -- --full` also verifies the ones that cost a test run.

**The user manual is LaTeX.** Source in `manual/`, built with `npm run manual`,
committed as `Gravitas_User_Manual.pdf`. Its counts come from the same
generator, as `manual/facts.tex`.

**Three documents are history, not description.**
`UI_PERFORMANCE_AUDIT.md`, `PERFORMANCE_OPTIMIZATIONS_SUMMARY.md` and
`SCENARIO_FIXES.md` record work that was done at a point in time, with the
measurements taken then. Do not update their numbers to match the present — the
numbers are the record. If a recommendation in one of them has since been
carried out, mark it as superseded and say where the work landed.

---

## Pull requests

- One change per pull request. A rename and a behaviour change in the same
  branch cannot be reviewed.
- Say what you measured. "Faster" is not reviewable; "trail pass 12.4 ms →
  6.9 ms on Star Cluster, `npm run perf`" is.
- New behaviour needs a test. Physics goes in `tests/`, anything a user can see
  goes in `e2e/`.
- If you changed what a student sees, say which lesson steps it affects.

CI runs formatting, lint, jest, the physics table, the link checker, the
documentation check, a production build, and the browser suite against both the
sources and the built artifact. Branch protection requires the aggregate `CI`
job.

---

## Licence

MIT, same as the project. By contributing you agree your work is released under
it.
