// =============================================================================
// A real Worker builds a real world
// -----------------------------------------------------------------------------
// tests/workerCompatibility.test.js proves the engine modules evaluate in a
// realm with no DOM, using a child Node process. That is the right shape for a
// unit test and it is not the thing itself: a Worker is a browser realm, with
// `self` rather than `globalThis` conventions and its own module map, and the
// decision in MULTI_WORLD_DECISION.md rests on Workers specifically.
//
// So this does it for real. It builds the worker from a Blob rather than from a
// file in the repository, for two reasons: the spike that originally
// demonstrated this is deliberately not deployed, and a test that depended on
// the spike would break the moment somebody tidied it away. Everything the
// worker imports - js/physics.js, js/world/build.js and their dependencies - is
// shipped source.
//
// This spec runs against sources only. Against the production build there is no
// /js/physics.js to import: the bundler has merged it into a hashed chunk, and
// what a Worker could import there is a different question from the one this
// answers.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * The worker body. Builds a named scenario with an injected context, steps it,
 * and reports what it made.
 *
 * Kept as a string because it is compiled into a Blob in the page.
 */
const WORKER_SOURCE = `
self.onmessage = async e => {
  const { scenario, seed, steps, origin } = e.data;
  try {
    // Absolute URLs, because a blob: module has an opaque base and cannot
    // resolve a root-relative specifier. The origin is handed in by the page.
    const p = await import(origin + '/js/physics.js');
    const { buildWorld } = await import(origin + '/js/world/build.js');
    const { applyPreset } = await import(origin + '/js/scenarios.js');
    const { DEFAULT_SETTINGS } = await import(origin + '/js/appState.js');
    const { withSeed, normalizeSeed } = await import(origin + '/js/rng.js');

    const SETTINGS = { ...DEFAULT_SETTINGS, preset_scenario: scenario };
    const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
    const noop = () => {};

    withSeed(normalizeSeed(seed), () =>
      buildWorld({
        settings: SETTINGS,
        state,
        applyPreset: () => applyPreset(SETTINGS, DEFAULT_SETTINGS, state),
        takePendingSettings: () => null,
        setScenarioName: noop,
        hideObjectInspector: noop,
        showScenarioInfo: noop,
        updateObjectTypeButton: noop,
        computeAreaSweep: noop,
        isAreaSweepSuppressed: () => true,
        regenerateStarfield: noop,
      })
    );

    const LISTS = ['bh_list','planets','stars','gas_giants','asteroids','comets',
      'neutron_stars','white_dwarfs','galaxies'];
    let bodies = 0;
    let lowestId = Infinity;
    for (const name of LISTS) {
      bodies += p[name].length;
      for (const b of p[name]) if (Number.isFinite(b?.id)) lowestId = Math.min(lowestId, b.id);
    }

    const before = p.getSimulationTime();
    for (let i = 0; i < steps; i++) p.updatePhysics(0.002);

    self.postMessage({
      ok: true, scenario, bodies,
      lowestId: Number.isFinite(lowestId) ? lowestId : null,
      advanced: p.getSimulationTime() > before,
    });
  } catch (err) {
    self.postMessage({ ok: false, scenario, message: String(err && err.message || err) });
  }
};
`;

/**
 * Run one or more scenarios, each in its own Worker, all at once.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @param {string[]} scenarios - Scenario keys to build
 * @returns {Promise<Array<object>>} One report per scenario
 */
const buildInWorkers = (page, scenarios) =>
  page.evaluate(
    ([source, keys]) => {
      const url = URL.createObjectURL(
        new Blob([source], { type: 'text/javascript' })
      );
      const one = scenario =>
        new Promise(resolve => {
          const w = new Worker(url, { type: 'module' });
          const done = d => {
            w.terminate();
            resolve(d);
          };
          w.onmessage = ev => done(ev.data);
          w.onerror = ev => done({ ok: false, scenario, message: ev.message });
          w.postMessage({
            scenario,
            seed: 'characterization',
            steps: 50,
            origin: location.origin,
          });
        });
      return Promise.all(keys.map(one)).finally(() => URL.revokeObjectURL(url));
    },
    [WORKER_SOURCE, scenarios]
  );

test.describe('the engine runs in a Worker realm', () => {
  test('a Worker builds a scenario and integrates it', async ({
    app,
    page,
  }) => {
    await app.boot();
    const [solar] = await buildInWorkers(page, ['Solar System']);

    expect(solar.ok, `worker failed: ${solar.message}`).toBe(true);
    expect(solar.bodies).toBeGreaterThan(0);
    expect(solar.advanced).toBe(true);
  });

  test('each Worker gets its own module instance', async ({ app, page }) => {
    await app.boot();
    // The page has already built its own world, so its id counter is well past
    // zero. Two workers building the same scenario must agree exactly: if they
    // shared module state with the page or with each other, the second would
    // number its bodies from wherever the first stopped.
    const reports = await buildInWorkers(page, [
      'Solar System',
      'TRAPPIST-1 System',
      'Solar System',
    ]);

    for (const r of reports) {
      expect(r.ok, `worker failed: ${r.message}`).toBe(true);
      expect(r.bodies).toBeGreaterThan(0);
    }

    const solar = reports.filter(r => r.scenario === 'Solar System');
    expect(solar).toHaveLength(2);
    expect(solar[0].bodies).toBe(solar[1].bodies);
    // The identity assertion. Not `toBe(0)`: construction creates and discards
    // bodies - a preset builds a population and then replaces part of it - so
    // the lowest id that survives into the finished world is not the first id
    // the counter issued. What matters is that it is the SAME in both workers.
    expect(solar[0].lowestId).toBe(solar[1].lowestId);
    // And low enough to have come from a counter that started fresh, rather
    // than one continuing from the page's own world.
    expect(solar[0].lowestId).toBeLessThan(1000);
  });
});
