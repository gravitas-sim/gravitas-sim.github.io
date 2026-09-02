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

```bash
npx playwright install firefox webkit
GRAVITAS_E2E_BROWSERS=firefox,webkit npm run e2e
GRAVITAS_E2E_BROWSERS=all npm run e2e
```

Chromium runs on every change; CI adds Firefox and WebKit on pushes to `main` and
weekly. They roughly triple the wall clock and what they find in a canvas
application is mostly engine timing, so making every contributor wait for them
was not worth it.

## What is here

| Spec | Covers |
| --- | --- |
| `sandbox.spec.js` | Booting from a clean browser, the first-visit front door, the scenario gallery, pause / speed / reset |
| `inspector.spec.js` | Selecting an object, the inspector readout, changing mass and settings, switching units |
| `observing.spec.js` | Light curve, radial velocity, astrometry, the shared observer geometry, reference frames |
| `investigations.spec.js` | Opening a lesson, every representative step type, grading, persistence across a reload, the PDF report |
| `sharing.spec.js` | Encoding and restoring a shared-state URL, seeded determinism, a corrupt link |
| `robustness.spec.js` | The heaviest scenarios, a NaN sweep over all 48, scenario churn |
| `scenarioContract.spec.js` | That a scenario named after specific objects contains them: names, classifications, masses, ordering, survival, and seeded reproducibility |
| `assets.spec.js` | Failed requests, deferred chunks, thumbnails decoding, the document pages |
| `mobile.spec.js` | A Pixel 7 profile: layout, overflow, the menu, a lesson on a phone |
| `production.spec.js` | The built `dist/` — DOM only, the only spec that runs against a bundle |

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

### Known failures

`mobile.spec.js` has one test marked `test.fail()`: tapping the object
inspector's close button on an emulated phone does not close it. The test runs
and CI requires it to keep failing, so that if someone fixes the underlying
problem the run goes red and the marker gets removed deliberately rather than the
fix going unnoticed. The comment on that test records what has been ruled out.
