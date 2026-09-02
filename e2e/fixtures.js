// =============================================================================
// Shared fixtures for the browser smoke suite
// -----------------------------------------------------------------------------
// Two things live here.
//
// A page that fails on its own errors. Every test gets a page that collects
// uncaught exceptions and console errors and fails at the end of the test if it
// saw any. That is the single highest-value check in the whole suite: most ways
// of breaking a canvas application do not change the DOM at all, they throw
// inside a requestAnimationFrame callback and the picture quietly stops
// updating. A DOM assertion will not notice. This will.
//
// A `gravitas` helper that knows how to get the application into a known state:
// past the splash, past the first-visit front door, into a named scenario, with
// the simulation actually running. Every spec needs that and none of them should
// be reimplementing it.
//
// On waiting
// -----------------------------------------------------------------------------
// There is no networkidle to wait for and no settled DOM: the simulation
// animates for as long as the tab is open. So the helpers wait on explicit
// application state - `window.splashScreenEnded`, a body count, a frame counter
// advancing - rather than on timeouts. A test that sleeps is a test that will be
// flaky on a slower machine.
// =============================================================================

import { test as base, expect } from '@playwright/test';

/** localStorage keys that decide what a "clean browser" sees. */
export const STORAGE_KEYS = {
  welcomeSeen: 'gravitas_welcome_seen_v1',
  units: 'gravitas_units',
  theme: 'gravitas_theme',
};

/**
 * Console messages that are noise rather than signal.
 *
 * Kept deliberately short, and every entry has to say why it is here. The
 * temptation with a list like this is to grow it until the check passes, at
 * which point it is checking nothing.
 */
const IGNORED_CONSOLE = [
  // Chrome's autoplay policy: the sonification AudioContext cannot start until
  // the user gestures, which is correct behaviour and is handled.
  /AudioContext was not allowed to start/i,
  /The AudioContext was not allowed to start/i,
  // WebGL is unavailable on some CI runners; the spacetime view is optional and
  // degrades to a message rather than breaking the app.
  /WebGL|THREE\.WebGLRenderer|Could not create a WebGL context/i,
  // Playwright's own service worker / favicon fetches on a static server.
  /Failed to load resource.*favicon/i,
];

const isIgnorable = text => IGNORED_CONSOLE.some(re => re.test(text));

/**
 * Everything a spec needs to drive the application.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {object} Helpers
 */
function makeApp(page) {
  return {
    /**
     * Load the application in a chosen storage state and wait until it is ready.
     *
     * @param {object} [options]
     * @param {boolean} [options.firstVisit] - Leave the front door in place
     * @param {string} [options.url] - A share link or hash to open instead of /
     * @returns {Promise<void>}
     */
    async boot({ firstVisit = false, url = '/' } = {}) {
      // The flag has to be written before any application script runs, which
      // means before the first navigation rather than after it.
      await page.addInitScript(
        ([key, seen]) => {
          try {
            if (seen) window.localStorage.setItem(key, '1');
            else window.localStorage.removeItem(key);
          } catch {
            /* storage unavailable; the app copes and so does the test */
          }
        },
        [STORAGE_KEYS.welcomeSeen, !firstVisit]
      );

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // The splash removes itself and sets this. It is the application's own
      // signal that it is running, which is why the other dev tools use it too.
      await page.waitForFunction(
        () => window.splashScreenEnded === true,
        null,
        {
          timeout: 30_000,
        }
      );
    },

    /** Dismiss the first-visit front door, if it is showing. */
    async dismissFrontDoor() {
      const screen = page.locator('#welcomeScreen');
      if (!(await screen.isVisible().catch(() => false))) return false;
      await page.locator('#welcomeClose').click();
      await expect(screen).toBeHidden();
      return true;
    },

    /**
     * Load a scenario through the public API the gallery itself calls.
     *
     * Clicking through the gallery is covered by its own test. Every other spec
     * needs to *be* in a scenario rather than to test how one is chosen, and
     * going through the module keeps those specs from breaking when a button
     * moves.
     *
     * @param {string} key - A scenario key from js/data/scenarioInfo.js
     * @param {string} [seed] - A fixed seed, so a run is reproducible
     */
    async loadScenario(key, seed = 'e2e', { run = true } = {}) {
      const ok = await page.evaluate(
        async ({ key, seed, run }) => {
          const ui = await import('/js/ui.js');
          if (!ui.SETTINGS) return false;
          ui.SETTINGS.preset_scenario = key;
          // initialize_simulation takes the seed, so a run is reproducible.
          // loadScenarioByKey is the single public entry point but does not
          // accept one, and the whole suite depends on a fixed world.
          ui.initialize_simulation({ seed });
          ui.state.paused = !run;
          return true;
        },
        { key, seed, run }
      );
      if (!ok) throw new Error(`Could not load scenario "${key}"`);
      await this.waitForBodies();
    },

    /** Wait until the world actually contains something. */
    async waitForBodies(min = 1) {
      await page.waitForFunction(
        async least => {
          const p = await import('/js/physics.js');
          const n =
            p.bh_list.length +
            p.stars.length +
            p.planets.length +
            p.gas_giants.length +
            p.asteroids.length +
            p.comets.length +
            p.neutron_stars.length +
            p.white_dwarfs.length +
            p.galaxies.length;
          return n >= least;
        },
        min,
        { timeout: 20_000 }
      );
    },

    /** Wait for the simulation to advance, proving the loop is alive. */
    async waitForFrames(count = 10) {
      const start = await this.frameCount();
      await page.waitForFunction(
        async ([from, n]) => {
          const ui = await import('/js/ui.js');
          return (ui.state?.frame_count ?? 0) >= from + n;
        },
        [start, count],
        { timeout: 20_000 }
      );
    },

    /** The simulation's own frame counter. */
    frameCount() {
      return page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return ui.state?.frame_count ?? 0;
      });
    },

    /** Pause or resume, through the state the transport bar writes. */
    async setPaused(paused) {
      await page.evaluate(async wanted => {
        const ui = await import('/js/ui.js');
        ui.state.paused = wanted;
      }, paused);
    },

    /** Whether the simulation is paused. */
    isPaused() {
      return page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return Boolean(ui.state?.paused);
      });
    },

    /** A snapshot of every body's state, for NaN hunting and drift checks. */
    bodySnapshot() {
      return page.evaluate(async () => {
        const p = await import('/js/physics.js');
        const lists = [
          'bh_list',
          'stars',
          'planets',
          'gas_giants',
          'asteroids',
          'comets',
          'neutron_stars',
          'white_dwarfs',
          'galaxies',
        ];
        const bodies = lists
          .flatMap(k => p[k] || [])
          .filter(b => b && b.alive !== false);
        return {
          count: bodies.length,
          nonFinite: bodies.filter(
            b =>
              !Number.isFinite(b.pos?.x) ||
              !Number.isFinite(b.pos?.y) ||
              !Number.isFinite(b.vel?.x) ||
              !Number.isFinite(b.vel?.y) ||
              !Number.isFinite(b.mass)
          ).length,
          totalMass: bodies.reduce((s, b) => s + (b.mass || 0), 0),
        };
      });
    },

    /**
     * Select an object the way a click on the canvas does, without needing to
     * know where on the canvas it currently is.
     *
     * A moving target is not something to hit with a mouse in a test. The
     * inspector's own selection path is what matters and that is what this uses.
     *
     * @param {string} [preferType] - e.g. 'StarObject'; falls back to anything
     */
    async selectFirstObject(preferType) {
      const picked = await page.evaluate(async wanted => {
        const p = await import('/js/physics.js');
        const ui = await import('/js/ui.js');
        const lists = [
          'stars',
          'planets',
          'gas_giants',
          'bh_list',
          'neutron_stars',
          'white_dwarfs',
          'asteroids',
          'galaxies',
        ];
        const all = lists
          .flatMap(k => p[k] || [])
          .filter(b => b && b.alive !== false);
        const pick =
          (wanted && all.find(b => b.constructor?.name === wanted)) || all[0];
        if (!pick) return null;

        // The type string the inspector dispatches on is not the constructor
        // name - a StarObject is a 'Star' there - and the mapping lives in
        // findObjectAtPosition, which is what the canvas click handler calls.
        // Asking it about the body's own position gets the exact {object, type}
        // pair a click would produce, so this test uses the application's
        // vocabulary rather than inventing a parallel one that would drift.
        const hit = p.findObjectAtPosition(pick.pos);
        const target = hit?.object === pick ? hit : null;
        if (!target) return { missed: pick.constructor?.name ?? 'unknown' };

        ui.showObjectInspector(target.object, target.type);
        return {
          id: target.object.id,
          type: target.type,
          constructor: target.object.constructor?.name,
          name: target.object.name ?? null,
          mass: target.object.mass,
        };
      }, preferType);

      if (!picked) throw new Error('No object available to select');
      if (picked.missed) {
        // The body exists but no click at its own centre would land on it, which
        // means the click target is smaller than the body. Worth failing loudly
        // rather than silently testing nothing.
        throw new Error(
          `A click at the centre of a ${picked.missed} does not select it`
        );
      }
      return picked;
    },

    /** What the inspector currently believes is selected. */
    selection() {
      return page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        const sel = ui.state?.selectedObject;
        if (!sel?.object) return null;
        return {
          id: sel.object.id,
          type: sel.type,
          mass: sel.object.mass,
          name: sel.object.name ?? null,
        };
      });
    },

    /** Open one of the docked observing panels by its toggle button. */
    async openPanel(toggleId, containerId) {
      const container = page.locator(`#${containerId}`);
      if (await container.isVisible().catch(() => false)) return;
      await this.railControl(toggleId);
      await page.locator(`#${toggleId}`).click();
      await expect(container).toBeVisible({ timeout: 15_000 });
    },

    /**
     * Reveal a control in the right-hand rail.
     *
     * The rail is an accordion: one section is open at a time, so a control in
     * a shut section is present in the DOM and not clickable. A user opens the
     * section first, and so does a test. Does nothing on a narrow viewport,
     * where the rail is a menu rather than a column, or if the control is
     * already on screen.
     *
     * @param {string} id - The control's element id
     */
    async railControl(id) {
      const control = page.locator(`#${id}`);
      if (await control.isVisible().catch(() => false)) return;
      const toggleId = await page.evaluate(elementId => {
        const el = document.getElementById(elementId);
        const group = el?.closest('.rail-group');
        const toggle = group?.querySelector('.rail-section-toggle');
        return toggle && toggle.getAttribute('aria-expanded') === 'false'
          ? toggle.id
          : null;
      }, id);
      if (toggleId) await page.locator(`#${toggleId}`).click();
      await expect(control).toBeVisible({ timeout: 10_000 });
    },

    /** The shared observer geometry, as the modules see it. */
    observerGeometry() {
      return page.evaluate(async () => {
        const o = await import('/js/observerGeometry.js');
        return {
          positionAngle: o.getPositionAngle(),
          inclination: o.getInclination(),
        };
      });
    },

    /** Move the shared observer, which every observing panel listens to. */
    async setObserver({ positionAngle, inclination }) {
      await page.evaluate(
        async ({ positionAngle, inclination }) => {
          const o = await import('/js/observerGeometry.js');
          if (positionAngle !== undefined) o.setPositionAngle(positionAngle);
          if (inclination !== undefined) o.setInclination(inclination);
        },
        { positionAngle, inclination }
      );
    },

    /** Read a localStorage value from the page. */
    storage(key) {
      return page.evaluate(k => {
        try {
          return window.localStorage.getItem(k);
        } catch {
          return null;
        }
      }, key);
    },
  };
}

/**
 * The test fixture.
 *
 * `errors` is exposed so a test that deliberately provokes a warning can inspect
 * or clear it; leaving it alone is the normal case and gets the automatic check.
 */
export const test = base.extend({
  errors: async ({ page }, use) => {
    const collected = { pageErrors: [], consoleErrors: [] };

    page.on('pageerror', err => {
      collected.pageErrors.push(err.message || String(err));
    });
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (isIgnorable(text)) return;
      collected.consoleErrors.push(text);
    });

    await use(collected);
  },

  app: async ({ page }, use) => {
    await use(makeApp(page));
  },

  // Runs after every test in every spec: an uncaught exception anywhere in the
  // run fails the test that was on screen when it happened.
  autoErrorCheck: [
    async ({ errors }, use) => {
      await use();
      expect(
        errors.pageErrors,
        'uncaught JavaScript exceptions during this test'
      ).toEqual([]);
      expect(
        errors.consoleErrors,
        'console.error output during this test'
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
