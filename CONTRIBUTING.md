# Contributing to Gravitas

Gravitas is a teaching tool before it is a piece of software. The bar for a
change is not "does it work" but "does it teach the right thing, and can an
instructor trust it in front of a class". That shapes most of what follows.

Issues and pull requests are welcome. If you are not sure whether something is
wanted, open an issue first — it is cheaper than a rejected branch.

---

## Getting set up

Node 22 or newer. `.nvmrc` pins the major version CI tests against, so
`nvm use` in the repository root gets you the same one; development is on 24.

```bash
npm install
npm run dev          # serves the repository root at http://localhost:8003
```

The unbundled ES modules run straight from disk, so there is no build step in
the development loop. `npm run build` exists for publishing, not for working,
and it needs the instructor passphrase, which a contributor does not have and
does not need: `npm run build:ci` is the same build with a throwaway key, and it
is the one CI runs.

---

## The checks

Everything CI runs, you can run:

```bash
npm test                  # jest: physics, data, formatting of numbers, i18n parity
npm run lint              # eslint (prettier runs inside it)
npm run format:check      # prettier, for the files it owns
npm run docs:check:full   # every count in the docs matches the source, the test counts too
npm run check:architecture  # no import cycles, no low-level module importing up
npm run vendor:check      # vendor/ matches the pinned three.js and fonts
npm run a11y              # axe over every surface, plus the keyboard checks
npm run build:ci          # a production bundle must still build (no passphrase)
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

Nothing the application needs is fetched from another origin. three.js
and the three font families used to come from jsdelivr and Google
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
- **Neither three.js nor the plot component may enter the initial chunk.**
  `npm run budget` enforces a ceiling on what a first-time visitor downloads;
  raising it means editing `tools/bundle-budget.mjs` in the same commit and
  saying in its `reason` what was added. Growth is allowed, unexplained growth
  is not.
- **The budget policy (`tools/budget-policy.json`, `docs/BUDGET_POLICY.md`).**
  It is switched off (`mode: "exact"`), and while it is, the rule above and the
  standing size-budget approval apply as before. When the owner switches it to
  `"declared"`: no slice raises any ceiling (it finds a saving or stops); the
  workflow ceilings (front door, sandbox, each lesson route's first-usable
  graph, the Observatory with one observation open, the initial download, the
  deferred core) never move except by the owner's explicit decision; lazy
  families and packs draw on a capped allowance recorded in
  `tools/growth-ledger.json`; and a re-baseline (`node tools/budget-policy.mjs
  rebaseline`) is a ceiling increase, made in a reviewed pull request labelled
  "ceiling increase", never automatically. Module line ceilings are separate
  and unchanged. `tools/data-budget.json` holds the data-plane ceilings (pack
  bytes, precache tiers, worker caps; browser-probe ones are not measured yet).

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
- **A modal must actually be modal.** Open it with `openDialog()` from
  `js/dialog.js`, which keeps Tab inside it, closes it on Escape, puts focus
  back on what opened it and, with `isolate`, marks the rest of the page
  `inert`. `tests/dialogInventory.test.js` fails on a `role="dialog"` that does
  not, unless it is on that file's list of the ones that are not modal.

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
the widest fan-out. The same check holds every module to a size rule:

- A module of 1,500 lines or fewer needs no entry and may grow freely.
- A module over 1,500 lines must be listed in `tools/module-size-ceilings.json`
  and sit exactly at its ceiling, so each slice of the decomposition lowers the
  entry in the same commit. `npm run check:architecture -- --record-sizes`
  lowers entries to today's sizes and removes those of modules that fell to
  1,500 lines or fewer; it never raises or adds one.
- A module that crosses 1,500 lines fails the check. Split it, or add an entry
  by hand with a DECISION_REGISTER row that says why. Raising an entry needs a
  row too.

`node tools/check-architecture.mjs --sizes` prints the largest modules. They and
their ceilings:

<!--fact-block:moduleSizes-->
| Module | Lines | Ceiling |
| --- | ---: | ---: |
| `js/data/instructorContent.js` | 6,715 | 6,715 |
| `js/validation/physicsChecks.js` | 6,621 | 6,621 |
| `js/i18n/es.deferred.js` | 4,092 | 4,092 |
| `js/i18n/en.deferred.js` | 3,845 | 3,845 |
| `js/investigations.js` | 3,296 | 3,296 |
| `js/render.js` | 3,028 | 3,028 |
| `js/physics.js` | 2,951 | 2,951 |
| `js/world/build.js` | 2,599 | 2,599 |
<!--/fact-block-->

| Layer | What lives there | Examples |
| --- | --- | --- |
| `foundation` | Pure helpers and constants. No application state, no DOM. | `constants.js`, `utils.js`, `units.js`, `rng.js`, `i18n/` |
| `domain` | The science, as pure functions over numbers. What the validation suite imports directly. | `orbital.js`, `mond.js`, `darkMatter.js`, `chaos/`, `resonance/` |
| `services` | Stateful cross-cutting machinery with no opinion about the interface. | `quality.js`, `offline.js`, `referenceFrame.js` |
| `engine` | The simulation, and the world it is built into. | `physics.js`, `scenarios.js`, `world/build.js` |
| `state` | The objects the interface shares. | `appState.js` |
| `render` | What a body looks like on the canvas: the drawers, what they share and the black hole renderer. The engine never imports them. | `bodyDraw.js`, `bodyDrawSky.js`, `blackHole/render.js` |
| `feature` | Everything that draws or is driven. | `render.js`, `controls.js`, `investigations.js`, `experiments/` |
| `coordinator` | Wires the rest together. Nothing may import these. | `ui.js`, `main.js` |

**Names.** A storage key, a window event name or a format id is spelled once,
in `js/names.js` (`KEY_*`, `EV_*`, `ID_*`), and a module imports it. The
`gravitas*` literals still written inline are listed in
`tools/key-registry-allowlist.json`; `tests/keyRegistry.test.js` fails on a new
one and on a stale entry, so the list only shrinks (run
`node tools/key-registry-scan.mjs --record` after moving one). A value never
changes: saved games, share links and student storage hold the exact strings.

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
`SETTINGS` is the reader's document, and it is what a share link serializes and
what the A/B bench hashes.

**The engine paints nothing.** A body class's `draw(ctx)` looks its kind up in a
table of drawers (`registerBodyDrawers` in `js/physics.js`), and the render
layer (`js/bodyDraw.js` and `js/bodyDrawSky.js`) imports the engine and fills
the table. The engine reaches the render layer only that way, so an engine to
render import fails `check:architecture`, including a dynamic `import()` in the
middle of a line. A body with no drawer draws nothing, which is what a Worker,
where there is no canvas, wants.

**A body's `kind` is a static string, not state.** Every body class carries
`static kind` (a string no minifier renames) and reads it through an accessor,
and the engine branches on `kind`, never on `constructor.name`. The accessor has
a setter that does nothing, on purpose: `set_state()` and an investigation's
`assign` copy fields onto a body with `Object.assign`, and a getter alone would
throw there in strict mode, while a saved `kind` must never change what a body
is. The class decides; the data cannot. For an object that is not a body (a
test double, a plain record), the readers (`className`, `kindOf`) answer
`'Object'` unless it states a string `kind` or an `obj_type`.

**Every random draw stays in the engine.** Seeded stepping exists, and a
collision draws from the same stream as the effects before it, so a realm that
never imports `js/bodyEffects.js` (a Worker, a Node script) must take the same
draws in the same order. The thirteen particle bursts are one table
(`BURSTS` in `js/physics.js`: count, speed and lifetime, which are draws) and one
helper (`burst`); what a burst looks like (size, color) and the disk tracer's
color are the effects module's, filed by `registerEffects`. The four explosion
builders stay whole. `tests/effectsMissing.test.js` runs nineteen engine events
with no module and compares draws, the next draw and the ripples with the
registered engine.

**The engine split is under way** (D-DECOMP-18, Prompts 107 and 135). `js/physics.js`
stays the one facade, re-exporting every name it ever exported (live, so no
importer changes), and the engine folder is read downward only: a module in it
never imports the facade. Where each piece lives so far:

| File | What it owns | Slice |
|---|---|---|
| `js/engine/state.js` | the body lists, the settings, the clocks and counters, the registries | S1 |
| `js/engine/events.js` | simulation events and the step listeners | S2 |
| `js/engine/conservation.js` | the absorption ledgers, the conserved totals and the energy history | S3 |
| `js/engine/forces.js` | the sources a body feels, the dark-matter and MOND terms, softening, direct-sum acceleration and the Velocity Verlet, RK4 and default step schemes | S4 |
| `js/engine/bodies.js` | the size and mass constants, the bursts, the absorption rule, and every body class from `PhysicsObject` to `Comet` with the accretion-disk tracer and the galaxy helpers | S5 |
| `js/engine/blackHole.js` | the black hole class and its default appearance | S5 |

Still in `js/physics.js`: collisions, mergers and collapse, and the step
itself (S6 and S7). Order, risks and the test
that proves each slice are in the register row. Two decisions remain for the
last slice: what replaces the canvas size that culls off-screen bodies, and the
wall clock a new black hole's grace period reads.

**A module carved out of `ui.js` is handed nothing it can ask for.** The slices
of Prompt 107 follow one rule: an extracted module never imports `ui.js`, and
what it needs of the coordinator it either owns (state moves with the code) or
asks for through the command bus. `js/inspectorWindow.js` needs no application
context object: it owns the inspector's suppression flag, `ui.js` registers its
`hideObjectInspector` and `setInspectorSuppressed` on the bus, and the
header buttons are wired by one call (`wireInspectorControls()`) made where
`ui.js`'s own start-up code ran them. A module that does need several local
values of `ui.js` takes **one** small context object, built once in `ui.js` and
passed to an `init...(ctx)` function; the module's header lists every member, and
adding one is a design decision, not an edit. `js/placement.js` (placement by
pointer and keyboard, the object picker) is the example: `initPlacement({canvas})`
registers the pointer, wheel and key listeners where `ui.js` ran them, and `initObjectPicker()` wires the
picker, so listener order is unchanged; `ui.js` re-exports the public names so no
caller moved. Such a module touches no element when it is imported, because `ui.js`
mounts the panels' markup after every import has run.
`js/captureMeasure.js` (the area sweep, speed, screenshot and clip buttons, the
measurement tools, demo mode and the bottom dock) is the second:
`initCaptureMeasure({canvas, starfieldCanvas})` takes the two canvases and
nothing else; the demo cycle rebuilds a world and shows its card through
`command('initialize_simulation')` and `command('show_enhanced_scenario_info')`.
`js/world.js` (world build, clear, rebuild, save, load, share capture and apply,
the scenario card, scenario loading) is the third, and needs **no** context
object: its five pieces of live state (`builtSystem`, `worldPack`,
`generationSettings`, `worldTouched`, `pendingSettingsOverride`) are its own
module-level bindings (the sixth the slice 10 count named, `allBodies`, is a
function of the physics lists), so there is one holder
and nothing to hand in. `ui.js` still writes two of them, through
`setBuiltSystem()` (Blank Simulation) and `setPendingSettings()` (Apply); a third
writer is a design decision. `initWorld()` wires the listeners where `ui.js` ran
them. The embed shell (`initEmbedMode()`, `embedWorldBuilt()`) lives in the same
module, to pay for its request.

### When you need something from a layer above

Four options, in order of preference:

1. **Move it down.** Usually the right answer, and usually smaller than it
   looks. `SOLAR_MASS_UNIT` lived in `physics.js`, so `units.js` imported the
   whole engine to find out what a solar mass is. It is a number; it moved to
   `constants.js`.
2. **Pass it in.** `buildWorld` gets `regenerateStarfield` through its context
   rather than importing `render.js`. That single edge was closing five of the
   eleven cycles the graph used to have.
3. **Ask for it.** If what you need is coordinator *behavior* (load this
   scenario, rebuild that world, restore a share link), call it through the
   command bus in `js/appState.js`: `const loadScenarioByKey =
   command('loadScenarioByKey')` in your module, and `ui.js` registers the
   handler once at start-up. A command is a plain synchronous call, so timing
   and order are those of the direct call. Asking for a command nobody
   registered throws.
4. **Record it.** If it is genuinely unavoidable, add it to `ALLOWED_UPWARD` in
   `tools/check-architecture.mjs` with a reason saying why. The list is
   shrink-only: the check also fails on an entry whose import no longer exists,
   so a fixed edge cannot quietly stay on the books.

No upward import is recorded now: the four that were (`investigations.js`,
`share.js` and the two lazy bridges, each importing `ui.js`) go through the bus,
and `welcome.js` with them. The check also fails on any other file that names
`ui.js` in a relative path, in any form, which closes the gap for a dynamic
import in the middle of a line.
Adding one should feel harder than fixing the last.

---

## Conventions

**CSS is layered.** The order is `tokens, base, legacy, components, overrides`.
Component rules beat legacy rules on layer order alone, which is why nothing in
`components.css` needs `!important`. Color belongs in `tokens.css`; no other
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

A scenario is named by its **id**: lower case, words joined by hyphens
(`binary-planet-lab`), and permanent once it ships, because share links,
lessons, course packs and experiments name it by that id. Its title is a
translation of the id and may be reworded at any time; the id may not. (Until
Roadmap II Prompt 63 a scenario was keyed by its English name. Those 59 names
still read, through the rule in `scenarioId()`; a new scenario has no such
name.)

Two places, both data:

1. **`js/data/scenarioInfo.js`** — an entry under the id with one to four
   concept tags from the fixed tag list. Its title and summary are
   `scenario.<id>.title` and `scenario.<id>.summary` in `js/i18n/en.js` and
   `js/i18n/es.js`, and its thumbnail is `images/scenarios/<id>.webp`.
2. **`js/scenarios.js`** — a row of `SCENARIO_PRESETS` under the same id: the
   settings the scenario runs under, as data. Geometry that settings cannot
   describe is a branch on the id in `js/world/build.js`.

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

A lesson is not one file. It is a module, a translation shadow, an entry in the
synchronous barrel, an instructor-guide stub, two generated manifests and the
generated lazy registry (`npm run registries`) — and a broken reference between
any of them is invisible until a class hits it. Three commands cover that.

```bash
npm run author:new -- --id=tidal-heating --title="Tidal Heating"
npm run author:check
npm run author:walk
```

**`author:new`** scaffolds the hand-written registration points and prints what
to do next (`npm run manifest`, then `npm run registries` for the lazy loaders).
It never overwrites, so it is safe to re-run. The scaffold deliberately does not
pass `author:check` yet: the placeholder summary, objectives and
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
produced rows against a live world, or that Next moved. The walker opens all <!--fact:investigations-->60<!--/fact--> investigations in
a browser and takes all <!--fact:investigationSteps-->1024<!--/fact--> steps,
sharded one lesson per test so contexts are reused and a failure names its lesson. It takes about two
minutes and runs as part of `npm run e2e`.

It earns its keep: it is what found a widget that had never drawn — its `draw`
shadowed the imported translation function with the color palette, so the
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
npm run manifest    # lesson-card manifests and the browser's filter metadata
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

## Adding a data pack, a course or an instrument as an extension

The Extension SDK ([sdk/README.md](sdk/README.md)) scaffolds, validates, tests
and packs the three kinds of extension: an observation data pack, a course
(a sequence of existing lessons), and an instrument family. Its checks tell
you what is wrong by file, line and field, without your having to read the
code underneath. Start with `npm run sdk -- init <type> <id>`. An accepted
extension is reviewed and vendored into the application; nothing is
installed into a running copy.

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
every scenario, because each one was laid out against its error behavior.

---

## Documentation

**Counts are generated.** Anything of the form

```markdown
**<!--fact:scenarios-->59<!--/fact--> built-in scenarios**
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

- One change per pull request. A rename and a behavior change in the same
  branch cannot be reviewed.
- Say what you measured. "Faster" is not reviewable; "trail pass 12.4 ms →
  6.9 ms on Star Cluster, `npm run perf`" is.
- New behavior needs a test. Physics goes in `tests/`, anything a user can see
  goes in `e2e/`.
- If you changed what a student sees, say which lesson steps it affects.

CI runs formatting, lint, jest, the physics table, the link checker, the
documentation check, a production build, and the browser suite against both the
sources and the built artifact. Branch protection requires the aggregate `CI`
job.

---

## License

Two, depending on what you changed, and [`LICENSES.md`](LICENSES.md) says which
covers which file.

- **Code** — MIT, same as the project.
- **Teaching material** — an investigation, an instructor guide, a scenario
  description, a translation, a figure — CC BY 4.0. See
  [`LICENSE-CC-BY-4.0.md`](LICENSE-CC-BY-4.0.md).

By contributing you agree your work is released under whichever of those applies
to the files you touched. A pull request that changes both is released under
both, file by file; there is nothing to sign and no CLA.

Third-party material you did not write cannot be added under either. If a change
needs something with its own license, it goes in `vendor/` with that license
beside it and an entry in [`NOTICE`](NOTICE) — `npm run vendor:check` enforces
the first half of that.
