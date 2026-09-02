// =============================================================================
// Playwright configuration for the browser smoke suite
// -----------------------------------------------------------------------------
// What these tests are for, and what they are not
// -----------------------------------------------------------------------------
// They check that the major user workflows still work in a real browser. They do
// not check pixels. Gravitas is a canvas application whose entire output is a
// moving simulation, so a screenshot comparison of the sandbox would fail on
// every commit for reasons nobody could act on. Where a stable surface is worth
// snapshotting - the front door, a lesson panel - it is snapshotted deliberately
// and named as such.
//
// Two targets, and the split is forced by the build
// -----------------------------------------------------------------------------
// The deep suite runs against the unbundled sources, because it needs to see
// inside the application: a NaN check has to read the body list, a "the loop is
// still alive" check has to read the frame counter, and a scenario has to be
// loaded on a fixed seed. All of that goes through `import('/js/physics.js')`
// from inside the page, which is exactly what the repository's other browser
// tools already do - and which cannot work against `dist/`, where esbuild has
// bundled those modules into hashed chunks with no `/js/ui.js` to import.
//
// So the production build gets its own spec, `production.spec.js`, which touches
// nothing but the DOM. It is a narrower test and it defends the thing the deep
// suite cannot reach: that the bundle boots, splits its chunks correctly, loads
// its deferred lesson code and throws nothing. Between them the two targets
// cover both failure modes.
//
//   npm run e2e            the deep suite, against sources
//   npm run e2e:dist       the production spec, against dist/ (build it first)
//   npm run e2e:all        both
//   npm run e2e:headed     watch it happen, chromium only
//   npm run e2e:ui         the Playwright inspector
//
// Browser coverage
// -----------------------------------------------------------------------------
// Chromium always. Firefox and WebKit only when asked, because they roughly
// triple the wall-clock and the failures they find in a canvas application are
// overwhelmingly engine timing rather than product regressions. CI runs the full
// set on pushes to main and on a schedule, and chromium alone on pull requests,
// which keeps the signal a contributor waits for under a few minutes.
//
//   GRAVITAS_E2E_BROWSERS=all npm run e2e
// =============================================================================

import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

/** 'src' (default) or 'dist'. */
const target = process.env.GRAVITAS_E2E_TARGET === 'dist' ? 'dist' : 'src';
const serveRoot = target === 'dist' ? 'dist' : '.';

// The production spec is DOM-only and is the only thing that can run against a
// bundle; everything else needs module access and can only run against sources.
const PRODUCTION_SPEC = /production\.spec\.js/;

/**
 * Which engines to run.
 *
 * 'chromium' by default; 'all' for the full set; or an explicit comma-separated
 * list, which is what CI uses to run firefox and webkit without repeating the
 * chromium work a pull request has already done.
 */
const ENGINES = ['chromium', 'firefox', 'webkit'];
const requested = (process.env.GRAVITAS_E2E_BROWSERS || 'chromium')
  .toLowerCase()
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);
const engines = requested.includes('all')
  ? ENGINES
  : ENGINES.filter(name => requested.includes(name));
if (!engines.length) {
  throw new Error(
    `GRAVITAS_E2E_BROWSERS="${process.env.GRAVITAS_E2E_BROWSERS}" names no ` +
      `known engine. Use "all", or a comma-separated list of: ${ENGINES.join(', ')}`
  );
}

const PORT = Number(process.env.GRAVITAS_E2E_PORT || 4173);

// The mobile spec belongs to the phone project alone: it opens the menu toggle
// and asserts on layout that only exists below the breakpoint, so running it in
// a 1440px window fails for reasons that are not bugs.
const MOBILE_SPEC = /mobile\.spec\.js/;

/**
 * The desktop projects.
 *
 * A generous viewport on purpose: the rail, the instrument column and the lesson
 * sheet all collapse below about 1100px, and the desktop suite is meant to be
 * testing the desktop layout. The mobile layout has its own project.
 */

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const DEVICE_FOR = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

const desktop = engines.map(name => ({
  name,
  testIgnore: MOBILE_SPEC,
  use: { ...devices[DEVICE_FOR[name]], viewport: DESKTOP_VIEWPORT },
}));

export default defineConfig({
  testDir: './e2e',
  ...(target === 'dist'
    ? { testMatch: PRODUCTION_SPEC }
    : { testIgnore: PRODUCTION_SPEC }),
  // Every spec here drives a live simulation, so they are slower than a typical
  // DOM test and the default 30s is too tight for the heavy-scenario one.
  timeout: 90_000,
  expect: { timeout: 10_000 },

  // Serial inside a file, parallel across files. The specs share nothing but a
  // server, and each one starts from a fresh browser context.
  fullyParallel: true,
  workers: isCI ? 2 : undefined,

  // A canvas app has genuine timing flake in it. One retry in CI turns a
  // coincidence into a pass and a real break into two failures; locally, none,
  // so a developer sees the flake rather than having it hidden.
  retries: isCI ? 1 : 0,

  // No accidental `test.only` reaching main.
  forbidOnly: isCI,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Traces and video only for a failure that survived its retry, which keeps
    // the artifact small enough to actually download.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    // The simulation animates constantly, so there is no "network idle" and no
    // settled DOM to wait for. Actions wait on the element, not the page.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    ...desktop,
    // A real phone profile rather than a narrow desktop window: the mobile layout
    // branches on touch support and on the user agent, not only on width. Only
    // meaningful against sources, where the mobile spec can read app state.
    // Pixel 7 is a Chromium profile, so the phone project only exists when
    // chromium is among the engines being run.
    ...(target === 'dist' || !engines.includes('chromium')
      ? []
      : [
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
            testMatch: MOBILE_SPEC,
          },
        ]),
  ],

  webServer: {
    // The repository's own dependency-free server. `npx http-server` would work
    // and would also fetch a package from the network in the middle of a CI run.
    command: `node tools/static-server.mjs --root ${serveRoot} --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !isCI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
