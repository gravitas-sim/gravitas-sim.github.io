// =============================================================================
// Scenario contracts
// -----------------------------------------------------------------------------
// A scenario named after specific objects has to contain those objects. That
// sounds too obvious to test until it is not: the Kuiper Belt scenario spent a
// long release configuring Pluto, Eris, Haumea, Makemake and four more, writing
// each one onto the first entry of the `planets` array and then splicing that
// entry straight back out. All eight were built and deleted before the first
// frame, so the scenario whose entire subject is named trans-Neptunian objects
// shipped without a single one of them. Nothing threw, the body count was
// plausible, and every screenshot looked like a belt.
//
// These are contract tests rather than physics tests: they assert what the
// world *contains* after the application builds it, in the browser, through the
// same entry point the gallery uses. The physics suites check how it then
// moves.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The eight named bodies, with the published masses ui.js builds them from. */
const KUIPER_OBJECTS = [
  { name: 'Orcus', massInEarths: 0.000106, semiMajorAxisAu: 39.17 },
  { name: 'Pluto', massInEarths: 0.00218, semiMajorAxisAu: 39.48 },
  { name: 'Varuna', massInEarths: 0.0000619, semiMajorAxisAu: 42.92 },
  { name: 'Haumea', massInEarths: 0.000671, semiMajorAxisAu: 43.13 },
  { name: 'Quaoar', massInEarths: 0.000201, semiMajorAxisAu: 43.69 },
  { name: 'Makemake', massInEarths: 0.000519, semiMajorAxisAu: 45.43 },
  { name: 'Eris', massInEarths: 0.00276, semiMajorAxisAu: 67.78 },
  { name: 'Sedna', massInEarths: 0.00017, semiMajorAxisAu: 506.8 },
];

/**
 * Every named body in the world, by list, with the fields these tests judge.
 *
 * Read out of physics.js rather than off the canvas, because the failure this
 * guards against is invisible on the canvas.
 *
 * @param {import('@playwright/test').Page} page - Page under test
 * @returns {Promise<Array>} One record per live body that carries a name
 */
function namedBodies(page) {
  return page.evaluate(async () => {
    const p = await import('/js/physics.js');
    // physics.js reassigns these arrays rather than mutating them, so they are
    // read here, at call time, and never captured once and reused.
    const lists = [
      'stars',
      'planets',
      'gas_giants',
      'asteroids',
      'comets',
      'bh_list',
      'neutron_stars',
      'white_dwarfs',
    ];
    const out = [];
    for (const key of lists) {
      for (const b of p[key] || []) {
        if (!b || b.alive === false || !b.name) continue;
        out.push({
          list: key,
          name: b.name,
          type: b.constructor?.name ?? null,
          mass: b.mass,
          massInEarths: b.massInEarths ?? null,
          semiMajorAxisAu: b.semi_major_axis_au ?? null,
          density: b.density ?? null,
          r: Math.hypot(b.pos.x, b.pos.y),
        });
      }
    }
    return out;
  });
}

test.describe('Kuiper Belt scenario contract', () => {
  test.beforeEach(async ({ app }) => {
    await app.boot();
    await app.loadScenario('Kuiper Belt', 'kbo-contract');
  });

  test('all eight named objects exist at startup', async ({ page }) => {
    const bodies = await namedBodies(page);
    const byName = new Map(bodies.map(b => [b.name, b]));

    for (const want of KUIPER_OBJECTS) {
      const got = byName.get(want.name);
      expect(got, `${want.name} is missing from the world`).toBeTruthy();
    }
  });

  test('each is classified as a solid body, not a gas giant', async ({
    page,
  }) => {
    const bodies = await namedBodies(page);
    const byName = new Map(bodies.map(b => [b.name, b]));

    for (const want of KUIPER_OBJECTS) {
      const got = byName.get(want.name);
      // Quaoar, Sedna, Orcus and Varuna were previously built as GasGiants
      // because that array happened to have spare entries.
      expect(got.type, `${want.name} is a ${got.type}`).toBe('Planet');
      expect(got.list).toBe('planets');
      expect(got.density).toBe('icy');
    }

    // And nothing else crept in: a Kuiper Belt has no gas giants at all.
    const giants = bodies.filter(b => b.type === 'GasGiant');
    expect(giants.map(g => g.name)).toEqual([]);
  });

  test('masses are the published values the scenario claims', async ({
    page,
  }) => {
    const bodies = await namedBodies(page);
    const byName = new Map(bodies.map(b => [b.name, b]));

    for (const want of KUIPER_OBJECTS) {
      const got = byName.get(want.name);
      // The stored mass and the simulated mass have to describe one object:
      // the reported figure is what the inspector prints and the simulation
      // mass is what gravity uses.
      expect(got.massInEarths).toBeCloseTo(want.massInEarths, 12);
      expect(got.mass).toBeGreaterThan(0);
      expect(got.semiMajorAxisAu).toBeCloseTo(want.semiMajorAxisAu, 6);
    }
  });

  test('the radial ladder is ordered by real semi-major axis', async ({
    page,
  }) => {
    const bodies = await namedBodies(page);
    const named = KUIPER_OBJECTS.map(w => bodies.find(b => b.name === w.name));

    // The scenario's radial scale is schematic rather than linear in AU - 39 to
    // 507 AU will not fit on one screen - so what is asserted is the ordering,
    // which is the part a student reads off the picture.
    const byRadius = [...named].sort((a, b) => a.r - b.r).map(b => b.name);
    const byAxis = [...KUIPER_OBJECTS]
      .sort((a, b) => a.semiMajorAxisAu - b.semiMajorAxisAu)
      .map(b => b.name);
    expect(byRadius).toEqual(byAxis);
  });

  test('all eight survive the simulation starting', async ({ page, app }) => {
    // The original defect removed them during setup, so a check that only ran
    // at t = 0 against the configuration object would still have passed. This
    // one runs the loop.
    await app.waitForFrames(120);

    const bodies = await namedBodies(page);
    const names = new Set(bodies.map(b => b.name));
    for (const want of KUIPER_OBJECTS) {
      expect(names.has(want.name), `${want.name} did not survive`).toBe(true);
    }

    const snapshot = await app.bodySnapshot();
    expect(snapshot.nonFinite).toBe(0);
  });

  test('the same seed rebuilds the same eight bodies', async ({
    page,
    app,
  }) => {
    // Both builds are loaded paused. A running world moves between the two
    // snapshots, and this test is about what initialization produces, not about
    // how far the belt has travelled since.
    await app.loadScenario('Kuiper Belt', 'kbo-seeded', { run: false });
    const first = await namedBodies(page);
    await app.loadScenario('Kuiper Belt', 'kbo-seeded', { run: false });
    const second = await namedBodies(page);

    const shape = list =>
      list
        .filter(b => KUIPER_OBJECTS.some(k => k.name === b.name))
        .map(b => `${b.name}:${b.mass}:${b.r}`)
        .sort();

    expect(shape(second)).toEqual(shape(first));
    expect(shape(first)).toHaveLength(KUIPER_OBJECTS.length);
  });
});
