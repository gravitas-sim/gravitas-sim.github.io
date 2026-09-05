# Browser smoke tests

What `npm test` cannot tell you: whether the application still works.

These drive a real browser through the workflows that matter and fail on any
uncaught exception or `console.error` along the way. They are smoke tests, not a
UI specification: they check that things work, not that they look a particular
way.

## Running them

```bash
npx playwright install chromium   # once
npm run e2e                       # everything, headless, ~2.5 min
npm run e2e:headed                # watch it, chromium only
npm run e2e:ui                    # the Playwright inspector
npm run e2e:report                # open the last HTML report
```

Narrow it down while working:

```bash
npx playwright test observing                 # one spec
npx playwright test -g "shared observer"      # one describe or test
npx playwright test --project=mobile-chrome   # the phone
npx playwright test --debug -g "light curve"  # step through it
```

The server starts and stops on its own — `tools/static-server.mjs`, no
dependencies, on port 4173. If you already have one running on that port
Playwright reuses it.

## The two targets

The suite runs against the **unbundled sources** by default, because it reaches
into the running application:

```js
const p = await import('/js/physics.js');
```

That is how a test reads the body list to check for NaNs, watches the frame
counter to prove the loop is alive, or loads a scenario on a fixed seed. None of
it works against `dist/`, where esbuild has bundled those modules into hashed
chunks and there is no `/js/ui.js` to import.

So the built site gets its own spec. `production.spec.js` touches nothing but the
DOM and runs against `dist/`, covering what the source suite structurally cannot
reach — chunk splitting, deferred imports, assets the build did not copy:

```bash
npm run build && npm run e2e:dist
npm run e2e:all                    # both targets, one after the other
```

The config selects one or the other from `GRAVITAS_E2E_TARGET` and includes or
excludes `production.spec.js` to match, so the two never run against the wrong
thing.

## Other browsers

Chromium runs everything. Firefox and WebKit run a deliberate subset.

```bash
npx playwright install firefox webkit

# The engine-compatibility profile: the tests tagged @cross-browser.
GRAVITAS_E2E_BROWSERS=webkit npm run e2e:cross-browser -- --workers=1
GRAVITAS_E2E_BROWSERS=firefox npm run e2e:cross-browser -- --workers=1

# Everything, in another engine. Slow, and mostly redundant. See below.
GRAVITAS_E2E_BROWSERS=all npm run e2e
```

### Why the other engines do not run everything

They used to, and it did not fit. The serial WebKit job reached GitHub's
thirty-minute ceiling at 177 tests; Firefox took about twenty-three minutes and
WebKit is slower. Raising the ceiling would have bought another few minutes
before the same thing happened again, so the question was which of those 177
tests were testing WebKit at all.

Most of them were not. A chaos divergence exponent, a resonance libration
amplitude, a conservation drift: these are arithmetic over IEEE-754 doubles.
They come out the same in every engine because they are the same additions in
the same order. Running them three times checks the same arithmetic three times
and charges twenty minutes for the second and third.

Two of them were worse than redundant:

- **The video-capture tests** waited for `#recordBtn` to be visible. Gravitas
  hides that button when `capture.canRecord()` is false, which is correct - there
  is nothing behind it in a browser that cannot encode - and on the Linux CI
  runner Playwright's WebKit has no usable combination of `MediaRecorder`,
  `HTMLCanvasElement.captureStream` and an accepted MIME type. The test was
  asserting a promise the application does not make, and it cost two failures
  and two retries.

- **The long chaos tests** wait for 3,200 simulated seconds of recorded
  evolution. The bench advances a fixed simulation step per animation frame
  while recording, so that span is a function of frame throughput. WebKit on a
  two-core runner cannot reach it inside the 300-second wait, and then spends
  another five minutes retrying.

Neither was a product regression, and neither would have been fixed by a longer
timeout.

### What the profile contains

Tests tagged `@cross-browser`, chosen because each exercises a **browser API or
layout behaviour that genuinely differs between engines**: booting and asset
loading, canvas animation, the scenario gallery, pause/resume/reset, downloads,
`MediaRecorder` availability, history and share-link restoration, a lesson
advancing, the deferred chart chunk, the inspector, the A/B bench recording,
WebGL, embed mode, language switching and Spanish layout, and the document
pages.

It also carries one short chaos test that opens the Three-Body Sensitivity Lab,
starts the bench, and collects eight samples over two simulated seconds. That
proves the bench records and that sampling is wired to the simulated clock. It
asserts nothing about the numerical outcome; that stays in Chromium.

Adding a test to the profile is one word:

```js
test('...', { tag: '@cross-browser' }, async ({ page, app }) => {
```

A tag rather than a title-text filter, because a grep over titles silently loses
a test the day somebody rewords it.

### Capability-based video testing

`e2e/capability.js` asks the application its own `capture.canRecord()` and
collects the three sub-capabilities so a skip can name the missing one. Nothing
names a browser. Two tests actually encode and download a clip, and they call
`test.skip()` when the capability is absent - so they will begin running by
themselves the day an engine gains support, with no change here.

The contract itself runs everywhere: when `canRecord()` is true the button is
visible and enabled, when it is false the button is hidden and screenshot
capture still works. A companion test removes `MediaRecorder` before the
application loads and checks the degraded path, because on macOS all three
engines can record and the branch that matters would otherwise never be
exercised where people develop.

The screenshot test runs in every browser: it needs no codec.

## What is here

| Spec                          | Covers                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sandbox.spec.js`             | Booting from a clean browser, the first-visit front door, the scenario gallery, pause / speed / reset                                                                                                                                                                                                                                                                                                     |
| `inspector.spec.js`           | Selecting an object, the inspector readout, changing mass and settings, switching units                                                                                                                                                                                                                                                                                                                   |
| `observing.spec.js`           | Light curve, radial velocity, astrometry, the shared observer geometry, reference frames                                                                                                                                                                                                                                                                                                                  |
| `instruments.spec.js`         | Ruler, protractor, stopwatch, the canvas instrumentation, the vector overlay, the screenshot download                                                                                                                                                                                                                                                                                                     |
| `spacetime.spec.js`           | The 3-D view: that it opens into the window, stacks with the other instruments, and actually renders at any scene scale                                                                                                                                                                                                                                                                                   |
| `chaos.spec.js`               | The Butterfly Effect investigation: the reproducibility control, the two-body control being refused a timescale, the three-body pair diverging and surviving refinement, and the lesson running to a report                                                                                                                                                                                               |
| `resonance.spec.js`           | When Orbits Lock: the four resonance scenarios loading with the bodies they name, the instruments reaching libration for the Trojans and Pluto and circulation for both controls, and the lesson running to a report                                                                                                                                                                                      |
| `experiments.spec.js`         | The A/B bench: capturing a start, recording two runs, returning to the identical start, changing one variable, comparing, exporting both files, reopening from a manifest, and reproducing a setup from a share link                                                                                                                                                                                      |
| `capture.spec.js`             | Screenshots and clip recording: the burnt-in provenance, the recording indicator, the size cap, the saved files                                                                                                                                                                                                                                                                                           |
| `presentation.spec.js`        | Embed mode, lecture mode, the control rail accordion and the bottom dock across window widths                                                                                                                                                                                                                                                                                                             |
| `investigations.spec.js`      | Opening a lesson, every representative step type, grading, persistence across a reload, the PDF report                                                                                                                                                                                                                                                                                                    |
| `progressSafety.spec.js`      | Storage that refuses to save: a full disk and a private window told apart, the standing warning, the lesson still working in memory, and the backup file carrying the work out and putting it back — including into a browser that can save                                                                                                                                                               |
| `authorWalk.spec.js`          | All 13 investigations and all 385 steps: each setup applied, each widget painted, each probe reporting, required interactions performed, declared answers accepted, and every lesson reaching its report                                                                                                                                                                                                  |
| `detectPlanet.spec.js`        | The synthetic observing run: that it is off until asked for, takes the measurements its schedule asks for and then stops, records the same numbers whatever the frame rate, labels the ideal signal as a teaching overlay, starts over when the schedule changes, and exports one row per measurement with its uncertainty. Plus the lesson opening and its planner collapsing from ten phase bins to two |
| `selfContained.spec.js`       | Every non-local request blocked, then the application booted, the fonts checked, a chart drawn and the 3-D view opened — proving three.js, Chart.js and the typography are served from this origin. Runs against the sources and the bundle                                                                                                                                                               |
| `accessibility.spec.js`       | axe-core over 13 surfaces in both languages and both themes — 52 runs, no rules disabled                                                                                                                                                                                                                                                                                                                  |
| `accessibilityManual.spec.js` | What axe cannot see: focus order and visible focus, focus trapping and restoration, Escape, heading order and landmarks, reflow at 200% and 400%, reduced motion, and the canvas's textual description                                                                                                                                                                                                    |
| `sharing.spec.js`             | Encoding and restoring a shared-state URL, seeded determinism, a corrupt link                                                                                                                                                                                                                                                                                                                             |
| `shareObserving.spec.js`      | That an ordinary share link carries the viewing context — inclination, position angle, reference frame and target, observed star, assumed distance — and that restoring it reproduces the same instantaneous observables, including under `?embed=1`                                                                                                                                                      |
| `robustness.spec.js`          | The heaviest scenarios, a NaN sweep over every scenario the catalog holds, scenario churn                                                                                                                                                                                                                                                                                                                 |
| `galaxyGravity.spec.js`       | The three galaxy-gravity modes: that they are mutually exclusive, that MOND is refused where no galactic scale is declared, that a mode does not leak across a scenario change, and that it survives a shared link and registers with the A/B bench                                                                                                                                                       |
| `capability.js`               | Not a spec: asks the application what this engine can actually do, so the video tests can skip on the capability rather than on a browser name                                                                                                                                                                                                                                                            |
| `offline.spec.js`             | The service worker and the low-end quality tier: precache completeness, a reload with no network at all, a lesson opened for the first time offline, the thumbnails, and the tier demoting under CPU throttling without breaking where a click lands                                                                                                                                                      |
| `worldConstruction.spec.js`   | A characterization golden: every scenario in the catalogue built from one fixed seed, digested body by body in list order, so a refactor of the world builder has to prove it changed nothing                                                                                                                                                                                                             |
| `scenarioContract.spec.js`    | That a scenario named after specific objects contains them: names, classifications, masses, ordering, survival, and seeded reproducibility                                                                                                                                                                                                                                                                |
| `assets.spec.js`              | Failed requests, deferred chunks, thumbnails decoding, the document pages                                                                                                                                                                                                                                                                                                                                 |
| `mobile.spec.js`              | A Pixel 7 profile: layout, overflow, the menu, a lesson on a phone                                                                                                                                                                                                                                                                                                                                        |
| `production.spec.js`          | The built `dist/` — DOM only, the only spec that runs against a bundle                                                                                                                                                                                                                                                                                                                                    |

`fixtures.js` holds the shared machinery: the error trap and the `app` helper.

## Writing a test

Import from `./fixtures.js`, not from `@playwright/test`:

```js
import { test, expect } from './fixtures.js';

test('something', async ({ page, app }) => {
  await app.boot();
  await app.loadScenario('Binary Pair');
  await app.waitForFrames(30);
  expect((await app.bodySnapshot()).nonFinite).toBe(0);
});
```

Every test gets two fixtures automatically:

- **`app`** — `boot`, `loadScenario`, `waitForBodies`, `waitForFrames`,
  `bodySnapshot`, `selectFirstObject`, `openPanel`, `setObserver` and the rest.
  Read the file; it is short.
- **an error trap** — uncaught exceptions and `console.error` output fail the
  test that was on screen when they happened. This is the highest-value check in
  the suite: most ways of breaking a canvas application do not change the DOM at
  all, they throw inside an animation frame and the picture quietly stops
  updating.

### Rules that keep it from becoming flaky

**Never sleep.** The simulation animates for as long as the tab is open, so there
is no `networkidle` and no settled DOM. Wait on application state:
`app.waitForFrames(30)`, `expect.poll(...)`, `expect(locator).toBeVisible()`.
A `waitForTimeout` is a test that will fail on a slower machine.

**Do not compare a running simulation against itself.** Positions depend on how
many frames have elapsed, which is not something a test controls. Build the world
paused — `app.loadScenario(key, seed, { run: false })` — if you need to compare
two worlds body for body.

**Use the application's own vocabulary.** The inspector dispatches on `'Star'`,
not on the constructor name `StarObject`, and the mapping lives in
`findObjectAtPosition`. `app.selectFirstObject()` goes through that function
rather than duplicating the map, and anything else you add should do the same.

**No whole-application screenshots.** The output is a moving simulation. A
snapshot of it would fail on every commit for reasons nobody could act on.

**One golden file, and it is not a screenshot.**
`worldConstruction.spec.js` compares against
`e2e/golden/world-construction.json`, which records a digest of every body in
every scenario at t=0 - id, name, mass, radius, position, velocity, in list
order. Construction is arithmetic on a fixed seed, so this is reproducible in a
way a rendered frame is not.

A diff in that file means world construction changed. Regenerate it only when
that change was intended, and say what moved in the same commit:

```
GRAVITAS_UPDATE_WORLD_GOLDEN=1 GRAVITAS_E2E_PORT=4199 \
  npx playwright test worldConstruction --project=chromium
```

### Known failures

`mobile.spec.js` has one test marked `test.fail()`: tapping the object
inspector's close button on an emulated phone does not close it. The test runs
and CI requires it to keep failing, so that if someone fixes the underlying
problem the run goes red and the marker gets removed deliberately rather than the
fix going unnoticed. The comment on that test records what has been ruled out.
