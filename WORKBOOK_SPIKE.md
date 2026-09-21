# The workbook spike

A pre-integration gate, not a feature. It answers one question with one lesson
and stops:

> Can Gravitas drive a real lesson and the real engine headlessly well enough to
> produce one deterministic printable workbook whose numerical answers are
> checked against the interactive lesson's own logic?

**Technical result: B — yes, with one small missing seam.** The engine and the
world builder run headlessly today with no changes and no shim. What does not
is the lesson panel's private context factory, and the exact dependency
boundary is named below. Two smaller traps sit beside it: `buildWorld` leaves
four lines of its reset in `js/ui.js`, and the clock the panel hands its event
watcher reads zero outside a render loop.

**Product result: no named adopter or requester was found.** Nothing in this
family — general workbook infrastructure, translator tooling, XLIFF, `/lite/`,
RTL — should be built on the strength of this spike. The spike itself is worth
keeping because it cost two days and it now guards an invariant that nothing
else guarded.

```
npm run workbook          regenerate workbooks/keplers-laws.json and the PDF
npm run workbook:check    fail if either has drifted
npx jest tests/workbookSpike.test.js
```

## Decision

Recorded 2026-09-21, after the gate was reviewed and its result accepted.

| | |
| --- | --- |
| **Technical gate** | **B** — the real engine can be driven headlessly and can produce deterministic workbook measurements checked by the lesson's own validation logic. One small missing seam, named below. |
| **Product-demand gate** | **FAIL** — no named instructor, course, institution, translator or other adopter was found requesting this capability. |
| **Disposition** | **Preserve the spike as evidence. Do not productize it.** |

The technical result is evidence that a workbook system is *possible*. It is not
a reason to build one. The two gates are independent and this work clears only
the first; a passing technical gate behind a failed product gate is a finding,
not a mandate.

Accordingly, none of the following is to be built on the strength of this spike:
general workbook infrastructure, a second workbook, generalized headless lesson
generation, translator tooling, XLIFF, `/lite/`, or RTL. The generator stays
narrow and single-purpose, and `probeContext()` stays where it is.

**Reconsideration criterion.** Reopen this work only when one of these is true:

- a specific adopter — a named instructor, course, institution or translator —
  asks for printable or offline workbook material; or
- another concrete use case independently requires this headless path.

Absent one of those, this is closed. Gravitas has no telemetry by design, so
adoption cannot be inferred later from analytics: for this class of feature an
explicit request is the only signal that exists, and there is not one. Stars,
visits, the general desirability of printable material and general best
practice are not requests and are not to be read as satisfying the criterion
above.

## What this established, for whoever needs it next

The five findings worth carrying forward, independently of workbooks. Each is
documented in full further down.

1. **`applyPreset` + `buildWorld` work headlessly**, in plain node, with no DOM
   shim — the Worker guards carry it.
2. **Deterministic scientific stepping must not depend on frame timing.** The
   browser's step comes from `frameAdvance(realSeconds, ...)`; anything
   reproducible has to pin the advance and count whole steps.
3. **`resetSimulationTime` and the rest of the world-reset postlude sit outside
   `buildWorld`**, in `js/ui.js`. A caller that does not replicate them gets a
   half-built world, silently.
4. **`currentTimeDays()` is not a usable headless simulation clock.** It reads
   the timeline recorder, which returns zero outside a render loop.
5. **A lesson's own validator can serve as the workbook/site consistency
   invariant.** It needs no second answer key and it demonstrably rejects a
   corrupted value.

## The lesson

**Kepler's Laws** (`js/data/investigations/keplers-laws.js`), chosen over the
other twenty-one because it is the only one that scores on every one of the
things this gate has to exercise:

- **Numbers worth printing.** Semi-major axes, periods, speeds at two orbital
  extremes, across three different scenarios. A table of these is genuinely
  more useful on paper than the prose around it, which is the bar section 4
  sets.
- **A natural deterministic sequence of states.** Periapsis and apoapsis are
  physical conditions, not clock times, and the application already has a
  detector for them.
- **Five machine-checkable answer paths** (`validate` on
  `measure-the-two-orbits`, `fast-and-slow-in-numbers`, `measure-four-planets`,
  `work-the-law-out-step`, `weigh-trappist-1-yourself`), and — the part that
  decided it — **two of them take a context object.** `lives-of-stars` has
  fifteen validators and `listening-to-spacetime` eight, but none of theirs
  need a context, so either would have let the spike pass without ever meeting
  the thing that actually blocks headless reuse. Kepler forces the seam into
  the open and then still asks three context-free validators to pass, which is
  the combination a gate wants.
- **The engine, not a model.** The three scenarios drive `applyPreset`,
  `buildWorld` and the real N-body integrator over a complete orbit. The
  stellar lessons compute from an evolution model against a staged scene, which
  would have exercised much less of the path this gate is about.
- **A number-producing function that belongs to the lesson.**
  `measure-four-planets.importFromSelection(ctx)` is the function the panel's
  "copy this reading into the table" button calls. The workbook calls it. The
  printed row is therefore not a reimplementation of the reading, it is the
  reading.

Three scenarios get exercised: `Kepler's 2nd Law`, `Solar System` and
`TRAPPIST-1 System`.

## What was reused, and what had to be new

Everything scientific is the application's own code:

| Module | What it does here |
| --- | --- |
| `js/scenarios.js` | `applyPreset` — the scenario's own settings |
| `js/world/build.js` | `buildWorld` — the same function `js/ui.js` calls on reset |
| `js/physics.js` | `updatePhysics` — the integrator the tab runs at 60 Hz |
| `js/timestep.js` | `substepPlan` — the rule that turns time into steps |
| `js/pauseAtEvent.js` | `armEvent` — the periapsis/apoapsis detector the panel drives |
| `js/orbital.js` | `orbitalElements`, `dominantPrimary` — what the readout shows |
| `js/units.js` | the four formatters the probe rows print through |
| `js/pdf.js` | `createDocument` — the PDF writer the instructor materials use |
| `js/answerKey.js` | `plainText`, `entryFor` — prose and step classification |
| `js/data/investigations.js` | the lesson itself: `probe`, `importFromSelection`, `validate` |

No DOM shim is installed and none is needed. `js/physics.js` and
`js/world/build.js` each carry a one-line guard — the Worker guards recorded in
`MULTI_WORLD_DECISION.md` and regression-tested in
`tests/workerCompatibility.test.js` — that lets them evaluate in a realm with
no `document` and no `window`. `tools/dom-shim.mjs` is deliberately *not* used:
installing it would hide a regression in those guards behind a stub canvas.

New code is three files and no new dependency:

- `tools/workbook/world.mjs` — the seam (below)
- `tools/workbook/kepler.mjs` — the schedule, and the grading harness
- `tools/build-workbook.mjs` — the CLI and the PDF layout

## The seam, exactly

Two things had to be rebuilt outside the application, and both are small.

### 1. `probeContext()` cannot be reached

Every lesson step's `probe`, `importFromSelection` and `validate` is handed a
context object. `js/investigations.js` builds it in a private function,
`probeContext()` (line 704). It is not exported, and the module cannot be
imported outside a browser:

```
$ node --input-type=module -e "await import('./js/investigations.js')"
ReferenceError: document is not defined

$ # ...and with tools/dom-shim.mjs installed:
RangeError: Maximum call stack size exceeded
    at generateStarfield (js/render.js:484)
    at drawStarfield (js/render.js:802)
```

`js/investigations.js` imports `js/render.js`, whose `drawStarfield` regenerates
the field whenever its dimensions disagree with the canvas. Against a stub
canvas they never agree, so the two functions call each other until the stack
ends. That is the dependency boundary, and it is not a physics problem: the
engine is clean, the *lesson panel* is not separable from rendering.

`tools/workbook/world.mjs` rebuilds the members the Kepler validators actually
use — `elements`, `find`, `distance`, `speed`, `time`, `years`, `au`,
`selected`, `G` — from the same modules `probeContext` builds them from. It
copies no tolerance, no expected value and no part of any answer; those stay in
the lesson file and are *called*. `tests/workbookSpike.test.js` asserts both
halves of that: that no threshold appears in the tool, and that
`js/investigations.js` still sources its orbital elements from `js/orbital.js`,
so the two cannot drift apart silently.

### 2. `buildWorld` does not finish building the world

`js/ui.js:4286-4299` follows every `buildWorld` with five more calls, four of
which are physics:

```js
withSeed(seed, () => build_simulation());
bumpWorldGeneration();
resetSimulationTime();
resetAbsorptionAccounting();
resetConservationBaseline();
resetPotentialCache();          // js/vectorOverlay.js — drawing, not physics
```

A headless host that calls only `buildWorld` gets a world whose clock is
whatever the previous world left behind, because `simulationTime` is a module
global. This was not theoretical: the first run of this tool reported the Solar
System's "time zero" sample at 935.58 simulated days, and computed a *negative*
advance to one year, and so took zero steps and printed the previous scenario's
clock as though it were this one's. `tools/workbook/world.mjs` replicates the
four physics calls, and there is a test for it.

If this spike were ever pursued, that postlude is the thing to move: a
`resetWorld()` that `js/ui.js` and any headless host both call would remove the
only way to build a world that is half-built.

### 3. The clock the panel reads is not the integrator's

Not a seam that had to be rebuilt so much as a trap that had to be avoided, and
the most expensive one here because reusing the application's code is the
*wrong* answer.

`js/pauseAtEvent.js` is handed `clockDays: currentTimeDays` by the panel
(`js/pauseAtEventPanel.js:246`), and `currentTimeDays` reads `getSimClock()`
from `js/timeline.js` — the *recorder's* clock, the simulated time of the frame
currently on screen. Live in a tab it tracks the integrator. Headlessly nothing
feeds the recorder, so it stays at zero however far the world is stepped:

```
integrator clock, after advancing 100 days:  99.9913
lightCurve currentTimeDays():                 0
```

Handing that to the watcher would not have thrown. `js/pauseAtEvent.js` drops
any sample whose clock reading equals the previous one — a deliberate guard, so
that several integration substeps inside one frame cannot bracket a crossing to
zero elapsed time — so a clock frozen at zero produces one sample, no bracket,
and a watch that waits for ever. The workbook uses the integrator's clock
through the same conversion, and there is a test that pins the two apart so
nobody "improves" it back.

**`applyPreset` + `buildWorld` otherwise worked exactly as expected.** One
surprise worth writing down: `applyPreset` clears `SETTINGS.preset_scenario` to
`'None'` when it finishes (`js/scenarios.js:1756`) — it is a one-shot trigger,
which is why `buildWorld` captures the name before calling it. A caller that
reads the key back afterwards to find out which scenario it built gets `'None'`.

## Determinism

Nothing in the workbook path reads `requestAnimationFrame`, `Date.now()`,
`performance.now()` or a frame rate; there is a test that scans for it.

The browser's integration step comes from
`frameAdvance(realSeconds, sim_speed, DT)`, clamped by `substepPlan`. Its first
argument is wall clock, which is exactly why a frame-driven workbook would print
a different table on every machine: `js/timestep.js` records that Kepler's 2nd
Law lands on a step of 0.0463 at 60 fps and 0.0417 at 30 fps.

So the wall clock is removed and **the scenario's own declared `max_timestep` is
used as the advance**. `substepPlan` then returns exactly one substep of that
size. This is a deliberate, conservative choice: it is the largest step the
scenario's author says the scenario may be integrated at, so every student's
browser integrates it at least as finely as the workbook did. A scenario that
declares no ceiling — the Solar System is one — falls back to 0.002, the step
`tools/physics-checks.mjs` uses.

| Scenario | Step | From |
| --- | --- | --- |
| Kepler's 2nd Law | 0.05 | `max_timestep` |
| Solar System | 0.002 | fallback |
| TRAPPIST-1 System | 0.0006 | `max_timestep` |

`max_timestep` alone is not enough and was not relied on. What makes the run
reproducible is that the advance is pinned *and* every sample is reached by a
counted whole number of identical `updatePhysics(step)` calls.

One wall-clock leak was found and stripped: `js/pauseAtEvent.js:439` stamps
every fired event with `new Date().toISOString()`. Right in a panel, fatal in a
reproducible artifact. `runToEvent` drops it.

Both artifacts are byte-identical across runs from the same source revision.

## The schedule

| Name | Scenario | Moment |
| --- | --- | --- |
| `kepler-t0` | Kepler's 2nd Law | simulated day 0 |
| `kepler-periapsis` | Kepler's 2nd Law | first periapsis, located by the application's watcher (day 623.6093, bracket 0.0919 d) |
| `kepler-apoapsis` | Kepler's 2nd Law | first apoapsis (day 935.5554, bracket 0.0919 d) |
| `solar-t0` | Solar System | simulated day 0 |
| `solar-one-year` | Solar System | simulated day 365.251, after 99,357 steps |
| `trappist-t0` | TRAPPIST-1 System | simulated day 0 |

The two event moments are outputs, not inputs, and the workbook prints both the
interpolated crossing time and the bracket it was found in, so a reader can see
the resolution rather than being asked to trust it.

## How the workbook is prevented from disagreeing with the site

This is the invariant the gate is actually about.

1. Every printed number is produced by a function inside
   `js/data/investigations/keplers-laws.js` — the step's own `probe` or
   `importFromSelection` — run against a world built by `js/world/build.js`.
2. Every printed number is then handed **back** to the same lesson's own
   `validate`, as *text*, in the shape `js/investigations.js` would have handed
   it: raw strings in, `compute` fields filled by the step's own `compute` and
   rounded to the step's own `decimals`, everything to `Number` alongside its
   `_text`.
3. `tools/build-workbook.mjs` writes nothing unless all 11 readings come back
   `ok`. A `warn`, an `error` or a `null` fails the build and prints what the
   lesson said.

Point 2 matters more than it looks. Because the grader is fed the *printed*
strings, a workbook whose print precision was too coarse for the lesson's
tolerance fails here rather than passing on unrounded internals.

The 11 readings, all `ok` at the current revision:

| Step | Readings | The lesson's own tolerance |
| --- | --- | --- |
| `measure-the-two-orbits` | 1 | mean of extremes within 10% of `a` |
| `fast-and-slow-in-numbers` | 1 | speed ratio within 15% of (1+e)/(1−e) |
| `measure-four-planets` | 1 (8 planets) | spread of P²/a³ under 50% |
| `work-the-law-out-step` | 1 | P²/a³ within 0.25 of 1 |
| `weigh-trappist-1-yourself` | 7 (one per planet) | mass within 0.008 of 0.0898 M☉ |

The TRAPPIST-1 check is the demanding one and the engine passes it from all
seven planets to four decimal places.

It caught a real one during this spike. A refactor of the event sequence in
`tools/workbook/kepler.mjs` moved the sampling to after both events had fired,
so the periapsis row was filled with the apoapsis state. Nothing about the
numbers looked absurd — two plausible distances and two plausible speeds — and
the build refused to write, because the lesson's own validator said the two
readings were the wrong way round. That is the check doing exactly the job it
is here for, on its author, before anything was committed.

### The check can fail

`tests/workbookSpike.test.js` bends TRAPPIST-1e's printed period by 5% — four
digits of `6.0808` that look entirely plausible on paper — and requires the
lesson to reject it, both through `gradeWithLesson` directly and end to end
through the tool's real grading path.

Five percent, and not one, because the sensitivity was measured rather than
guessed: the lesson's ±0.008 M☉ band admits a period out by 4.5% and a
semi-major axis out by 2%, since mass goes as a³/P². That asymmetry is the
lesson author's call and is not the test's to tighten.

### What is *not* machine-checked

Q1–Q6 on the sheet are arithmetic a student does on printed values. The values
are checked; the handwriting is not, and the workbook says so on the page. The
lesson's other 8 graded questions (`predict`, `choice`, short-answer — the
classification comes from `entryFor` in `js/answerKey.js`, not from a second
list here) are deliberately absent: printing them without the key makes a
worksheet, printing them with it makes an answer key, and both already exist
under `/instructors/`.

## Cost

- **No new dependency.** `js/pdf.js` already writes PDFs in Node — it is what
  `tools/build-instructor-materials.js` uses — so no LaTeX, no headless browser
  and nothing added to `package.json` but two scripts.
- **No browser bundle change.** No file under `js/` was modified. `workbooks/`
  is in neither `STATIC_FILES` nor `STATIC_DIRS` in `build.js`, so it never
  reaches `dist/`; there is a test for that too. Verified after a full
  `npm run build:ci`: initial download 813.7 KB, deferred 3879.7 KB, both
  unchanged and both passing `npm run budget:check`.
- **No runtime networking**, in the tool or in what it emits.
- About 8 s to generate on an idle machine, dominated by the 99,357 integration
  steps the one-year Solar System sample takes.

Worth flagging separately: the deferred-JS budget is at **3879.7 KB of 3880.0 KB
— 100%**. That is pre-existing and nothing to do with this spike, but the next
lazy chunk anyone adds fails `budget:check`.

## Artifacts

- `workbooks/keplers-laws.json` — **committed.** The scientific table: no date,
  no path, no commit hash, nothing that moves unless the physics moves.
  `npm run workbook:check` diffs it, so engine drift shows up as a readable
  diff rather than as changed PDF bytes.
- `workbooks/keplers-laws.pdf` — **generated, git-ignored.** It stamps the
  commit it was built from, and a file that names its own commit can never be
  current inside that commit. Five pages: three parts of measurement with
  writing space, a page of what the lesson's validators said, and a provenance
  block carrying the full commit SHA, the world seed, the integration step per
  scenario and a SHA-256 digest of the scientific table. Grayscale throughout —
  `js/pdf.js` bands its tables at 0.975 and heads them at 0.93, and nothing here
  distinguishes two things by hue.

## The product gate

**No named adopter or requester was found.** The search, and what it returned:

- **GitHub issues:** none. `gh issue list --state all` returns an empty list.
- **GitHub discussions:** none.
- **Pull requests:** 21 — 17 by the project owner, 4 by dependabot. No
  external human has opened anything on this repository.
- **Repository documentation and planning notes:** `IMPLEMENTATION_CHECKLIST.md`,
  `CHANGELOG.md`, `README.md` and the 30-odd other top-level documents record
  the Spanish locale as engineering work with no requester attached to it.
  Nothing anywhere names an instructor, course, institution, translator or
  adopter who asked for a workbook, a translation, a lite site or RTL.
- **The project's own statement**, `SUPPORT.md`: *"There is no classroom
  evaluation of this software yet and the first real account of one would be
  worth more than any feature."*

That last line is the honest summary of the demand signal. This project has no
telemetry by design, so usage cannot be inferred later from analytics; for this
class of feature an explicit request is the only signal available, and there is
not one. Stars, visits, the general desirability of printable material and the
general desirability of translation are not requests and are not treated as
requests here.

**Recommendation: do not proceed** with general workbook infrastructure,
translator tooling, XLIFF, `/lite/`, RTL, or other broad reach work. Keep this
spike, because the invariant it enforces is real and cheap to run. If a named
adopter ever appears, the first thing to ask them is which lesson and whether
they want the numbers at all — the answer changes the design completely, and
guessing it now would be the expensive mistake.

## Status of the branch

`feat/workbook-spike-preintegration` is pushed and is **evidence only**. It is
not to be merged, not to be rebased onto the moving `v2`, and no pull request is
to be opened for it. It is a record of what was measured, kept where it can be
read.

If the reconsideration criterion above is ever met, the re-test is
`npm run workbook:check` against whatever `v2` has become: if the engine has
moved a number, the committed table will not match and the diff says which.
That is a check to run at that point, not a reason to keep the branch current
in the meantime.

## Carried out of here as a separate candidate

One item leaves this spike as its own piece of work, because its value does not
depend on workbooks:

> **Extract the `js/ui.js` reset postlude into a `resetWorld()` that
> `js/world/build.js` and any other caller both use.** Four lines
> (`bumpWorldGeneration`, `resetSimulationTime`, `resetAbsorptionAccounting`,
> `resetConservationBaseline`), and it removes the only way to build a world
> that is half-built — a correctness trap for the Worker route, for tests, and
> for anything else that builds a second world in one process.

It is **not** implemented here, and it must not be: smuggling an unrelated
architectural change in through a failed product gate is how a "no" becomes a
partial "yes". Evaluate it on its own merits against the final integrated `v2`.

Two things that are explicitly *not* candidates:

- **Extracting `probeContext`.** Doing it properly means separating the lesson
  panel from `js/render.js`. That is a real refactor and needs a better reason
  than one tool that is not being productized.
- **Anything in the workbook, translation, `/lite/` or RTL family**, per the
  Decision above.

Unrelated to all of it, and worth knowing: **the deferred-JS budget is full**
(3879.7 KB of 3880.0). The next lazy chunk anyone adds fails `budget:check`.
