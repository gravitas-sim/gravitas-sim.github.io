// =============================================================================
// Planets in binary stars
// -----------------------------------------------------------------------------
// The arithmetic is proved elsewhere. tests/binaryOrbits.test.js checks the
// layout against closed-form elements, tests/binaryStability.test.js checks the
// published boundary against alpha Centauri and Kepler-16, and
// tests/binaryWatch.test.js drives the recorder with a hand-written integrator.
//
// What only a browser can show is that the three of them are wired to the same
// simulation: that the scenario a student loads is the one the layout describes,
// that changing where the planet starts actually changes the run rather than
// being overwritten by the rebuild, and that a configuration which disrupts is
// reported as disrupted while one whose answer depends on the timestep is
// reported as not yet an answer.
//
// The representative configurations below are the ones the lesson is written
// against. If any of them changes outcome, either the physics moved or the
// lesson is now teaching something false, and both are worth a failing test.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Load a lab, set the experiment, and integrate it to completion.
 *
 * Stepped directly rather than watched in real time. The scenario is tuned so
 * that a run takes about half a minute of wall clock at sixty frames a second,
 * which is right for a student and wrong for a test suite; the integrator does
 * not care which loop calls it, and the substep size is passed explicitly here
 * so the run is the same one either way.
 *
 * @param {object} page - The Playwright page
 * @param {object} spec - scenario, planetA, timestep, periods
 * @returns {Promise<object>} The finished run and its verdict
 */
const runToCompletion = (page, spec) =>
  page.evaluate(async s => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const { SETTINGS } = await import('/js/appState.js');
    const watch = await import('/js/binaryWatch.js');
    const stability = await import('/js/binaryStability.js');
    const panel = await import('/js/binaryRunPanel.js');

    SETTINGS.preset_scenario = s.scenario;
    ui.initialize_simulation({ seed: 'e2e' });
    if (s.planetA !== undefined) SETTINGS.binary_lab_planet_a = s.planetA;
    if (s.periods !== undefined) SETTINGS.binary_lab_periods = s.periods;
    if (s.timestep !== undefined) SETTINGS.max_timestep = s.timestep;
    ui.initialize_simulation({ seed: 'e2e' });

    panel.armBinaryRun();
    const dt = SETTINGS.max_timestep;
    let guard = 0;
    while (!watch.currentRun()?.finished && guard < 4_000_000) {
      physics.updatePhysics(dt);
      guard++;
    }
    const run = watch.currentRun();
    return {
      run,
      verdict: stability.classifyRun(run),
      boundary: stability.boundaryVerdict(
        run.mode,
        run.planetA,
        run.mu,
        run.eccentricity
      ),
      appliedA: SETTINGS.binary_lab_planet_a,
      appliedStep: SETTINGS.max_timestep,
    };
  }, spec);

test.describe('the controlled binary', () => {
  test('is built from the stated numbers, not from the world generator', async ({
    page,
    app,
  }) => {
    await app.boot();
    // Paused: the assertions below are about the state the builder
    // produced, and a running world has moved on by the time they read it.
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });

    const world = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { SETTINGS } = await import('/js/appState.js');
      return {
        stars: p.stars.map(s => ({
          mass: s.mass,
          x: s.pos.x,
          y: s.pos.y,
          vx: s.vel.x,
          vy: s.vel.y,
        })),
        planets: p.planets.length,
        bodies: [...p.stars, ...p.planets].map(b => ({
          mass: b.mass,
          vx: b.vel.x,
          vy: b.vel.y,
        })),
        others:
          p.gas_giants.length +
          p.asteroids.length +
          p.comets.length +
          p.bh_list.length,
        planet: p.planets[0] && {
          x: p.planets[0].pos.x,
          y: p.planets[0].pos.y,
        },
        settings: {
          m1: SETTINGS.binary_lab_m1,
          m2: SETTINGS.binary_lab_m2,
          sep: SETTINGS.binary_lab_separation,
          e: SETTINGS.binary_lab_eccentricity,
        },
      };
    });

    // Two stars, one planet, nothing else. A generated scenario would have
    // sprayed a dozen bodies in at random and the experiment would be over.
    expect(world.stars).toHaveLength(2);
    expect(world.planets).toBe(1);
    expect(world.others).toBe(0);

    // Periapsis, along +x, split about a barycenter at the origin. With
    // e = 0.4 the separation is 0.6 * 1000 units, and the stars sit at
    // -m2/M and +m1/M of it: -200 and +400.
    expect(world.stars[0].x).toBeCloseTo(-200, 6);
    expect(world.stars[1].x).toBeCloseTo(400, 6);
    expect(world.stars[0].y).toBeCloseTo(0, 9);
    expect(world.stars[1].y).toBeCloseTo(0, 9);
    // The planet starts 0.15 separations out from its own star.
    expect(world.planet.x).toBeCloseTo(-50, 6);

    // Zero net momentum, so "distance from the system" means something fixed
    // over forty binary periods.
    //
    // Over all three bodies, not just the stars. zeroNetMomentum balances the
    // whole world, so the stars carry exactly the planet's momentum reversed -
    // 0.0059 in these units, which is what summing the pair alone reports and
    // which is not a drift.
    const px = world.bodies.reduce((s, b) => s + b.mass * b.vx, 0);
    const py = world.bodies.reduce((s, b) => s + b.mass * b.vy, 0);
    expect(Math.abs(px)).toBeLessThan(1e-9);
    expect(Math.abs(py)).toBeLessThan(1e-9);
  });

  test('rebuilds to exactly the same world', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    const snapshot = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        return [...p.stars, ...p.planets].map(b =>
          [b.pos.x, b.pos.y, b.vel.x, b.vel.y, b.mass].join(',')
        );
      });
    const first = await snapshot();
    // Let it run, then rebuild: the point is that the rebuild returns to the
    // same start, not that a paused world stays where it was put.
    await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      state.paused = false;
    });
    await app.waitForFrames(30);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const { state } = await import('/js/appState.js');
      ui.initialize_simulation({ seed: 'different-seed-entirely' });
      state.paused = true;
    });
    // Nothing here is seeded, so a different seed must make no difference.
    expect(await snapshot()).toEqual(first);
  });

  test('both labs describe the same pair of stars', async ({ page, app }) => {
    await app.boot();
    const stars = async key => {
      await app.loadScenario(key, 'e2e', { run: false });
      return page.evaluate(async () => {
        const p = await import('/js/physics.js');
        return p.stars.map(s => [s.mass, s.pos.x, s.pos.y].join(','));
      });
    };
    expect(await stars('Circumbinary Planet Lab')).toEqual(
      await stars('Binary Planet Lab')
    );
  });
});

test.describe('representative configurations', () => {
  test.describe.configure({ timeout: 180_000 });

  test('a planet well inside the boundary survives the integration', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run, verdict, boundary } = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.15,
      timestep: 1.0,
      periods: 20,
    });

    expect(verdict.outcome).toBe('survived');
    expect(verdict.trustworthy).toBe(true);
    expect(run.periodsDone).toBeGreaterThanOrEqual(20);
    // Quiet: it never went further than two thirds of a separation from the
    // barycenter and never came near the companion.
    expect(run.maxDistance).toBeLessThan(0.8);
    expect(run.encounters).toBe(0);
    expect(run.energyDrift).toBeLessThan(1e-4);
    // And the published fit agrees, which is the only place in this suite
    // where simulation and literature are asked to say the same thing.
    expect(boundary.side).toBe('expectedSurvive');
    expect(boundary.inRange).toBe(true);
  });

  test('a planet outside the boundary is ejected, and says when', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run, verdict, boundary } = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.3,
      timestep: 1.0,
      periods: 20,
    });

    expect(verdict.outcome).toBe('ejected');
    expect(verdict.trustworthy).toBe(true);
    // Gone early, and gone far: this is not a wide orbit being misread.
    expect(run.periodsDone).toBeLessThan(20);
    expect(run.maxDistance).toBeGreaterThanOrEqual(10);
    expect(run.unbound).toBe(true);
    expect(boundary.side).toBe('expectedDisrupted');
  });

  test('a circumbinary planet far enough out survives', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run, verdict, boundary } = await runToCompletion(page, {
      scenario: 'Circumbinary Planet Lab',
      planetA: 4.0,
      timestep: 2.0,
      periods: 40,
    });

    expect(verdict.outcome).toBe('survived');
    expect(run.periodsDone).toBeGreaterThanOrEqual(40);
    // It stays on the ring it started on rather than being walked outward.
    expect(run.maxDistance).toBeLessThan(4.5);
    expect(boundary.side).toBe('expectedSurvive');
  });

  test('a circumbinary planet too close in is ejected', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run, verdict, boundary } = await runToCompletion(page, {
      scenario: 'Circumbinary Planet Lab',
      planetA: 2.0,
      timestep: 2.0,
      periods: 40,
    });

    expect(verdict.outcome).toBe('ejected');
    expect(verdict.trustworthy).toBe(true);
    expect(run.periodsDone).toBeLessThan(40);
    // No close pass at all - it is driven out by the changing pull of a
    // binary it can still tell apart, not by a slingshot.
    expect(run.encounters).toBe(0);
    expect(boundary.side).toBe('expectedDisrupted');
  });
});

test.describe('telling a numerical result from a physical one', () => {
  test.describe.configure({ timeout: 240_000 });

  test('an outcome that changes with the timestep is not reported as an outcome', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The measured case the whole investigation is built around. At 0.25
    // separations the planet is close enough to the boundary that its fate is
    // decided by grazing passes, and the run is not converged: energy drift
    // stays tiny at both steps and the answers still disagree.
    const coarse = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.25,
      timestep: 1.0,
      periods: 20,
    });
    const fine = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.25,
      timestep: 0.25,
      periods: 20,
    });

    // Both runs pass the energy screen on their own...
    expect(coarse.verdict.trustworthy).toBe(true);
    expect(fine.verdict.trustworthy).toBe(true);
    expect(coarse.run.energyDrift).toBeLessThan(1e-3);
    expect(fine.run.energyDrift).toBeLessThan(1e-3);
    // ...and they disagree, which is the point: energy conservation cannot
    // certify an outcome.
    expect(coarse.verdict.outcome).not.toBe(fine.verdict.outcome);

    const converged = await page.evaluate(
      async ([a, b]) => {
        const s = await import('/js/binaryStability.js');
        return s.convergenceVerdict(a, b);
      },
      [coarse.verdict, fine.verdict]
    );
    expect(converged.converged).toBe(false);
    expect(converged.reason).toBe('outcomeChanged');
    expect(converged.outcome).toBeNull();
  });

  test('the panel reports the step it was actually integrated at', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run, appliedStep } = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.15,
      timestep: 0.5,
      periods: 2,
    });
    expect(appliedStep).toBe(0.5);
    expect(run.dtMax).toBeCloseTo(0.5, 12);
    expect(run.dtMean).toBeCloseTo(0.5, 12);
    // The count is a real count, not the requested one rounded.
    expect(run.steps).toBeGreaterThan(20_000);
  });

  test('a chosen starting radius survives the rebuild it triggers', async ({
    page,
    app,
  }) => {
    await app.boot();
    // Without the carry in applyPreset this returns the scenario's 0.15 and
    // every experiment a student runs is the same experiment.
    const { appliedA, run } = await runToCompletion(page, {
      scenario: 'Binary Planet Lab',
      planetA: 0.22,
      timestep: 1.0,
      periods: 2,
    });
    expect(appliedA).toBe(0.22);
    expect(run.planetA).toBe(0.22);
  });
});

test.describe('the panel', () => {
  test('opens from the rail and reads the scenario it is looking at', async ({
    page,
    app,
  }) => {
    await app.boot();
    // No rail chip: the panel is an instrument for two scenarios rather than a
    // general tool, so it shows itself when one of them loads.
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeVisible();

    await expect(page.locator('#binaryRunPlanetA')).toHaveValue('0.15');
    await expect(page.locator('#binaryRunPeriods')).toHaveValue('20');
    await expect(page.locator('#binaryRunTimestep')).toHaveValue('1');

    // Every string resolved. A missing key renders as the key itself, which is
    // the failure this catches.
    const text = await page.locator('#binaryRunContainer').innerText();
    expect(text).not.toMatch(/binaryRun\./);
    expect(text).toMatch(/binary periods/i);
  });

  test('stays out of the way in scenarios it has nothing to say about', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeVisible();
    // Leaving the lab hides it again: a readout about a planet in a binary
    // would be describing bodies that no longer exist.
    await app.loadScenario('Solar System', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeHidden();
    await app.loadScenario('Circumbinary Planet Lab', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeVisible();
  });

  test('closing it keeps it closed until the scenario changes', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    await page.locator('#binaryRunClose').click();
    await expect(page.locator('#binaryRunContainer')).toBeHidden();
    // A rebuild is not a reason to reappear after being dismissed.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.initialize_simulation({ seed: 'e2e' });
    });
    await expect(page.locator('#binaryRunContainer')).toBeHidden();
    // Choosing the scenario again is.
    await app.loadScenario('Solar System', 'e2e', { run: false });
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeVisible();
  });

  test('never calls a configuration stable, in either language', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Planet Lab', 'e2e', { run: false });
    await expect(page.locator('#binaryRunContainer')).toBeVisible();

    for (const [locale, forbidden] of [
      ['en', /\bstable\b/i],
      ['es', /\bestable\b/i],
    ]) {
      await page.evaluate(async l => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(l);
      }, locale);
      const text = await page.locator('#binaryRunContainer').innerText();
      expect(text).not.toMatch(forbidden);
      expect(text).not.toMatch(/binaryRun\./);
    }
  });

  test('says the boundary is a published fit and whose', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      const { SETTINGS } = await import('/js/appState.js');
      const watch = await import('/js/binaryWatch.js');
      SETTINGS.preset_scenario = 'Binary Planet Lab';
      ui.initialize_simulation({ seed: 'e2e' });
      SETTINGS.binary_lab_periods = 1;
      ui.initialize_simulation({ seed: 'e2e' });
      const panel = await import('/js/binaryRunPanel.js');
      panel.setBinaryRunEnabled(true);
      panel.armBinaryRun();
      let guard = 0;
      while (!watch.currentRun()?.finished && guard < 200_000) {
        physics.updatePhysics(1.0);
        guard++;
      }
      panel.setBinaryRunEnabled(false);
      panel.setBinaryRunEnabled(true);
    });

    const boundary = await page.locator('#binaryRunBoundary').innerText();
    expect(boundary).toMatch(/Holman/);
    expect(boundary).toMatch(/1999/);
    expect(boundary).toMatch(/AJ 117, 621/);
    // The assumptions travel with the number.
    expect(boundary).toMatch(/massless/i);
    expect(boundary).toMatch(/coplanar/i);
    expect(boundary).toMatch(/circular orbit/i);

    const outcome = await page.locator('#binaryRunOutcome').innerText();
    expect(outcome).toMatch(/survived this integration/i);
    expect(outcome).not.toMatch(/\bstable\b/i);
  });
});
