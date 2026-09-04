// =============================================================================
// Heavy scenarios, and things that should not produce a NaN
// -----------------------------------------------------------------------------
// Workflow 15. The failure this defends against is specific and it has happened:
// one non-finite value in one body's position propagates through the gravity sum
// and reaches every other body in a single frame, and it never washes out. The
// canvas goes blank or freezes and nothing in the DOM changes, so this is exactly
// the class of break a DOM test cannot see.
//
// The scenarios chosen are the ones most likely to produce one: the largest body
// count in the catalog, a system whose orbits are packed into a few units, and a
// merger that removes bodies while the integrator is running.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Run a scenario hard and report what came out. */
async function stress(app, key, { frames = 300, seed = 'stress' } = {}) {
  await app.loadScenario(key, seed);
  const before = await app.bodySnapshot();
  await app.waitForFrames(frames);
  const after = await app.bodySnapshot();
  return { before, after };
}

test.describe('heavy scenarios stay finite', () => {
  test('the largest scenario in the catalog runs without producing a NaN', async ({
    app,
  }) => {
    // Galactic Collision is the biggest thing here: two galaxies, hundreds of
    // bodies, mutual gravity and mergers all at once.
    await app.boot();
    const { before, after } = await stress(app, 'Galactic Collision', {
      frames: 240,
    });

    expect(before.count).toBeGreaterThan(100);
    expect(before.nonFinite).toBe(0);
    expect(after.nonFinite).toBe(0);
    // Bodies merge and get culled, which is the scenario working. What must not
    // happen is the world emptying out entirely.
    expect(after.count).toBeGreaterThan(10);
  });

  test('a tightly packed system holds its orbits', async ({ app }) => {
    // TRAPPIST-1's seven planets orbit between 1.15 and 6.19 simulation units,
    // which is the regime where a softening floor set for a scenario a hundred
    // times larger used to starve them of gravity and throw them out.
    await app.boot();
    const { before, after } = await stress(app, 'TRAPPIST-1 System', {
      frames: 400,
    });

    expect(after.nonFinite).toBe(0);
    // All seven planets and the star are still here: nothing was ejected and
    // nothing collided.
    expect(after.count).toBe(before.count);
  });

  test('a merger removes bodies without corrupting the survivors', async ({
    app,
  }) => {
    await app.boot();
    const { before, after } = await stress(app, 'GW150914', { frames: 300 });

    expect(before.nonFinite).toBe(0);
    expect(after.nonFinite).toBe(0);
    expect(after.count).toBeGreaterThan(0);
    // The two holes are meant to spiral together and merge.
    expect(after.count).toBeLessThanOrEqual(before.count);
  });

  test('no scenario places two bodies at exactly the same point', async ({
    page,
    app,
  }, testInfo) => {
    // Two bodies at identical coordinates are not merely ugly. The contact test
    // in js/physics.js skips a pair whose separation is zero, so nothing ever
    // pushes them apart: they stay superimposed for the life of the scenario
    // and draw as a single body.
    //
    // Two placement modes shipped with this. Multi-Ring clamped every ring to
    // the central body's keep-out radius with a Math.max, collapsing the inner
    // rings onto one circle - and since it lays twenty objects per ring at
    // repeating angles, object i and object i+20 coincided exactly. Four
    // scenarios carried twenty superimposed pairs each. Grid centred itself on
    // the origin, which is precisely where the central body is pinned, so one
    // cell always landed inside it.
    await app.boot();
    const keys = await page.evaluate(async () => {
      const info = await import('/js/data/scenarioInfo.js');
      return Object.keys(info.SCENARIO_INFO);
    });
    testInfo.setTimeout(Math.max(90_000, keys.length * 4_000));

    const offenders = [];
    for (const key of keys) {
      const found = await page.evaluate(async k => {
        const ui = await import('/js/ui.js');
        const p = await import('/js/physics.js');
        ui.SETTINGS.preset_scenario = k;
        ui.initialize_simulation({ seed: 'coincident-sweep' });
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
          .flatMap(x => p[x] || [])
          .filter(b => b && b.alive !== false);
        const seen = new Map();
        const dups = [];
        for (const b of bodies) {
          // Exact equality, not proximity: a crowded scenario is allowed to
          // start with bodies touching, and several deliberately do. What no
          // scenario may do is start two of them at the same point.
          const at = `${b.pos.x},${b.pos.y}`;
          if (seen.has(at)) dups.push(`${seen.get(at)} == ${b.name}`);
          else seen.set(at, b.name);
        }
        return dups.slice(0, 3);
      }, key);
      if (found.length) offenders.push(`${key}: ${found.join('; ')}`);
    }
    expect(offenders).toEqual([]);
  });

  test('a scenario that promises a population builds one', async ({
    page,
    app,
  }) => {
    // Kessler Cascade's card promised "hundreds of micro-stars orbiting
    // chaotically" and built a single black hole in an empty sky, because the
    // three settings its preset wrote were read by nothing. Slingshot Gauntlet
    // promised "a fast-moving star fired through a black hole obstacle course"
    // and placed every body at rest. Neither failed loudly; both simply were
    // not what the gallery said they were.
    //
    // Body counts and starting speeds are the cheapest observable that would
    // have caught either.
    await app.boot();
    const got = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      const read = key => {
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'promise-check' });
        const lists = [
          'bh_list',
          'stars',
          'planets',
          'gas_giants',
          'asteroids',
        ];
        const bodies = lists
          .flatMap(x => p[x] || [])
          .filter(b => b && b.alive !== false);
        const movers = bodies.filter(b => !p.bh_list.includes(b));
        return {
          bodies: bodies.length,
          fastest: Math.max(
            0,
            ...movers.map(b => Math.hypot(b.vel.x, b.vel.y))
          ),
        };
      };
      return {
        kessler: read('Kessler Cascade'),
        slingshot: read('Slingshot Gauntlet'),
      };
    });

    // Hundreds, as advertised - not one black hole.
    expect(got.kessler.bodies).toBeGreaterThan(200);
    expect(got.kessler.fastest).toBeGreaterThan(0);
    // Something is actually fired.
    expect(got.slingshot.fastest).toBeGreaterThan(1);
  });

  test('the simulation survives every scenario in the catalog booting', async ({
    page,
    app,
  }, testInfo) => {
    // Not a deep run: each scenario is built, stepped briefly and checked for
    // non-finite state. That is enough to catch a scenario whose initial
    // conditions are broken, which is a whole class of bug that otherwise only
    // shows up when a student picks that one card.
    await app.boot();

    const keys = await page.evaluate(async () => {
      const info = await import('/js/data/scenarioInfo.js');
      return Object.keys(info.SCENARIO_INFO);
    });
    expect(keys.length).toBeGreaterThan(30);

    // The budget grows with the catalogue rather than being a fixed number,
    // because the work does: one build, one round trip and 120 steps per
    // scenario. At a fixed 90 seconds this test passed at 49 scenarios and
    // began timing out intermittently at 53, which is a slow failure to
    // diagnose and tells you nothing about the scenarios.
    testInfo.setTimeout(Math.max(90_000, keys.length * 4_000));

    const broken = [];
    for (const key of keys) {
      const result = await page.evaluate(async k => {
        const ui = await import('/js/ui.js');
        const p = await import('/js/physics.js');
        try {
          ui.SETTINGS.preset_scenario = k;
          ui.initialize_simulation({ seed: 'catalog-sweep' });
        } catch (err) {
          return { key: k, why: `build threw: ${err.message}` };
        }
        // A short run in the page, synchronously, so the sweep stays fast.
        for (let i = 0; i < 120; i++) p.updatePhysics(0.05);
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
          .flatMap(x => p[x] || [])
          .filter(b => b && b.alive !== false);
        const bad = bodies.filter(
          b =>
            !Number.isFinite(b.pos?.x) ||
            !Number.isFinite(b.pos?.y) ||
            !Number.isFinite(b.vel?.x) ||
            !Number.isFinite(b.vel?.y) ||
            !Number.isFinite(b.mass)
        );
        if (bad.length) {
          return {
            key: k,
            why: `${bad.length} non-finite bodies after 120 steps`,
          };
        }
        return null;
      }, key);
      if (result) broken.push(`${result.key}: ${result.why}`);
    }

    expect(broken).toEqual([]);
  });
});

test.describe('the application recovers from rough handling', () => {
  test('switching scenarios repeatedly leaks neither bodies nor errors', async ({
    app,
  }) => {
    // A rebuild that failed to clear the previous world used to leave the
    // integrator advancing bodies nobody was drawing, which shows up as a body
    // count that only ever grows.
    await app.boot();

    // Counted as generated, with the clock stopped. Counting after a run would
    // not be deterministic and would not be testing this: the Solar System culls
    // asteroids and merges bodies as it goes, so two runs of unequal length
    // legitimately end with different counts. What has to be identical is the
    // world each rebuild produces.
    const counts = [];
    for (const key of [
      'Binary Pair',
      'Solar System',
      'Binary Pair',
      'Solar System',
      'Binary Pair',
    ]) {
      // run: false builds the world with the clock already stopped, so no body
      // is absorbed or culled between the build and the count.
      await app.loadScenario(key, 'churn', { run: false });
      counts.push((await app.bodySnapshot()).count);
    }

    // The same scenario has to give the same count each time it comes back. A
    // rebuild that failed to clear the previous world shows up here as a count
    // that grows.
    expect(counts[0]).toBe(counts[2]);
    expect(counts[2]).toBe(counts[4]);
    expect(counts[1]).toBe(counts[3]);

    // And the two scenarios are genuinely different sizes, so the check above is
    // not passing because everything is the same.
    expect(counts[1]).toBeGreaterThan(counts[0]);

    // Back to running, and still finite.
    await app.setPaused(false);
    await app.waitForFrames(20);
    expect((await app.bodySnapshot()).nonFinite).toBe(0);
  });

  test('pausing and resuming many times does not drift the world', async ({
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.waitForFrames(20);

    for (let i = 0; i < 8; i++) {
      await app.setPaused(true);
      await app.setPaused(false);
      await app.waitForFrames(5);
    }
    expect((await app.bodySnapshot()).nonFinite).toBe(0);
  });
});
