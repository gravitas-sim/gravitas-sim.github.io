// =============================================================================
// Gravity assist
// -----------------------------------------------------------------------------
// The scattering arithmetic is proved in tests/gravityAssist.test.js and the
// encounters are run against theory in tools/physics-checks.mjs. What only a
// browser can show is that the two are wired to the same simulation and to the
// same panel: that the scenario a student loads is the encounter the elements
// describe, that flipping one number flips the outcome, and that the two
// columns really do report the same encounter differently.
//
// The last of those is the lesson, so it is the test that matters most here.
// If the left-hand column ever stops being unchanged, the investigation is
// teaching something false and this should be what says so.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Load a scenario, set the impact parameter, and fly the encounter to the gate.
 *
 * Stepped directly rather than watched. The scenario is tuned so a student sees
 * the flyby in about nine seconds, which is right for a person and wrong for a
 * suite; the integrator does not care which loop calls it and the substep is
 * passed explicitly, so it is the same encounter either way.
 *
 * @param {object} page - Playwright page
 * @param {object} spec - scenario and impact parameter
 * @returns {Promise<object>} The finished encounter
 */
const fly = (page, spec) =>
  page.evaluate(async s => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const { SETTINGS } = await import('/js/appState.js');
    const watch = await import('/js/assistWatch.js');
    const panel = await import('/js/assistPanel.js');

    SETTINGS.preset_scenario = s.scenario;
    ui.initialize_simulation({ seed: 'e2e' });
    if (s.b !== undefined) SETTINGS.assist_impact_parameter = s.b;
    ui.initialize_simulation({ seed: 'e2e' });

    panel.armAssistRun();
    const dt = SETTINGS.max_timestep;
    let guard = 0;
    while (watch.currentAssist()?.phase !== 'done' && guard < 500000) {
      physics.updatePhysics(dt);
      guard++;
    }
    const run = watch.currentAssist();
    return {
      run,
      appliedB: SETTINGS.assist_impact_parameter,
      relResidual:
        run.vInfBefore && run.vInfAfter
          ? Math.abs((run.vInfAfter - run.vInfBefore) / run.vInfBefore)
          : null,
    };
  }, spec);

test.describe('the controlled encounter', () => {
  test('is two bodies and nothing else, placed from its elements', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Gravity Assist Lab', 'e2e', { run: false });

    const world = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { SETTINGS } = await import('/js/appState.js');
      const GA = await import('/js/gravityAssist.js');
      const planet = p.gas_giants[0];
      const probe = p.planets[0];
      const mu = SETTINGS.gravitational_constant * planet.mass;
      const rel = {
        x: probe.vel.x - planet.vel.x,
        y: probe.vel.y - planet.vel.y,
      };
      const r = Math.hypot(
        probe.pos.x - planet.pos.x,
        probe.pos.y - planet.pos.y
      );
      return {
        stars: p.stars.length,
        others: p.asteroids.length + p.comets.length + p.bh_list.length,
        planets: p.planets.length,
        gasGiants: p.gas_giants.length,
        gate: r,
        wantGate: SETTINGS.assist_gate,
        vInf: GA.asymptoticSpeed(Math.hypot(rel.x, rel.y), r, mu),
        wantVInf: SETTINGS.assist_v_infinity,
        planetSpeed: Math.hypot(planet.vel.x, planet.vel.y),
        wantPlanetSpeed: SETTINGS.assist_planet_speed,
        massRatio: probe.mass / planet.mass,
      };
    });

    // No star: the point of this scenario is that the planet's frame is
    // exactly inertial, which it is only if nothing is pulling on the planet.
    expect(world.stars).toBe(0);
    expect(world.others).toBe(0);
    expect(world.gasGiants).toBe(1);
    expect(world.planets).toBe(1);

    // Placed from elements, so these are exact inputs rather than approximate
    // consequences of a starting position.
    expect(world.gate).toBeCloseTo(world.wantGate, 6);
    expect(world.vInf).toBeCloseTo(world.wantVInf, 9);
    expect(world.planetSpeed).toBeCloseTo(world.wantPlanetSpeed, 12);
    expect(world.massRatio).toBeCloseTo(1e-6, 12);
  });

  test('the heliocentric version has a star and an orbiting planet', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Gravity Assist: Heliocentric', 'e2e', {
      run: false,
    });
    const world = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { SETTINGS } = await import('/js/appState.js');
      const planet = p.gas_giants[0];
      const G = SETTINGS.gravitational_constant;
      const a = SETTINGS.assist_orbit_radius;
      return {
        stars: p.stars.length,
        orbitRadius: Math.hypot(planet.pos.x, planet.pos.y),
        wantRadius: a,
        planetSpeed: Math.hypot(planet.vel.x, planet.vel.y),
        circular: Math.sqrt((G * (p.stars[0].mass + planet.mass)) / a),
        // The gate must sit inside the Hill radius or the encounter is not a
        // flyby of the planet at all.
        gate: SETTINGS.assist_gate,
        hill:
          a * Math.cbrt(planet.mass / (3 * (p.stars[0].mass + planet.mass))),
      };
    });
    expect(world.stars).toBe(1);
    expect(world.orbitRadius).toBeCloseTo(world.wantRadius, 6);
    expect(world.planetSpeed).toBeCloseTo(world.circular, 9);
    expect(world.gate).toBeLessThan(world.hill);
  });

  test('rebuilds to the same encounter regardless of seed', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Gravity Assist Lab', 'e2e', { run: false });
    const snapshot = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        return [...p.gas_giants, ...p.planets].map(b =>
          [b.pos.x, b.pos.y, b.vel.x, b.vel.y, b.mass].join(',')
        );
      });
    const first = await snapshot();
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.initialize_simulation({ seed: 'something-else-entirely' });
    });
    // Nothing here is sampled, so nothing here is seeded.
    expect(await snapshot()).toEqual(first);
  });
});

test.describe('what the flyby does', () => {
  test.describe.configure({ timeout: 180_000 });

  test('passing behind gains speed and passing in front loses it', async ({
    page,
    app,
  }) => {
    await app.boot();
    const behind = await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    const ahead = await fly(page, { scenario: 'Gravity Assist Lab', b: -40 });

    expect(behind.appliedB).toBe(40);
    expect(behind.run.side).toBe('trailing');
    expect(behind.run.inertialAfter).toBeGreaterThan(behind.run.inertialBefore);

    expect(ahead.run.side).toBe('leading');
    expect(ahead.run.inertialAfter).toBeLessThan(ahead.run.inertialBefore);

    // The same closest approach both ways, which is what rules out "the losing
    // pass came closer" as an explanation for the asymmetry.
    expect(ahead.run.closest).toBeCloseTo(behind.run.closest, 1);
  });

  test('the speed relative to the planet does not change at all', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The claim the whole investigation rests on. With no star the planet's
    // frame is inertial and the encounter can only turn the velocity.
    for (const b of [40, -40, 90]) {
      const { run, relResidual } = await fly(page, {
        scenario: 'Gravity Assist Lab',
        b,
      });
      expect(run.phase).toBe('done');
      expect(relResidual).toBeLessThan(1e-7);
      // And meanwhile the inertial speed moved by something a person notices.
      expect(
        Math.abs(run.inertialAfter - run.inertialBefore) / run.inertialBefore
      ).toBeGreaterThan(0.1);
    }
  });

  test('the deflection matches the two-body prediction', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run } = await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    const predicted = await page.evaluate(
      async ([b, vInf]) => {
        const GA = await import('/js/gravityAssist.js');
        const p = await import('/js/physics.js');
        const { SETTINGS } = await import('/js/appState.js');
        const mu = SETTINGS.gravitational_constant * p.gas_giants[0].mass;
        return GA.deflectionAngle(mu, b, vInf);
      },
      [40, run.vInfBefore]
    );
    expect(Math.abs(run.deflection)).toBeCloseTo(predicted, 3);
  });

  test('the planet loses the momentum the spacecraft gains', async ({
    page,
    app,
  }) => {
    await app.boot();
    const { run } = await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    const probe = Math.hypot(run.probeDeltaP.x, run.probeDeltaP.y);
    const planet = Math.hypot(run.planetDeltaP.x, run.planetDeltaP.y);
    expect(probe).toBeGreaterThan(0);
    expect(Math.abs(planet - probe) / probe).toBeLessThan(1e-5);
    // Tiny in the planet's own terms, which is the other half of the point.
    expect(run.planetDeltaVMagnitude / run.planetSpeed).toBeLessThan(1e-4);
  });

  test('a star makes the same claim only approximately, by a stated amount', async ({
    page,
    app,
  }) => {
    await app.boot();
    const isolated = await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    const helio = await fly(page, {
      scenario: 'Gravity Assist: Heliocentric',
      b: 18,
    });

    // Still a big real gain in the frame that matters.
    expect(helio.run.inertialAfter).toBeGreaterThan(
      helio.run.inertialBefore * 1.2
    );
    // But the planet-frame speed is no longer exactly unchanged, and the
    // difference between the two cases is orders of magnitude rather than a
    // rounding detail. That gap is the patched-conic approximation.
    expect(helio.relResidual).toBeGreaterThan(isolated.relResidual * 1000);
    expect(helio.relResidual).toBeLessThan(0.05);
  });
});

test.describe('the panel', () => {
  test.describe.configure({ timeout: 120_000 });

  test('opens with its scenario and reports both frames', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Gravity Assist Lab', 'e2e', { run: false });
    await expect(page.locator('#assistContainer')).toBeVisible();
    await expect(page.locator('#assistImpact')).toHaveValue('40');

    await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    await page.evaluate(async () => {
      const panel = await import('/js/assistPanel.js');
      panel.setAssistEnabled(false);
      panel.setAssistEnabled(true);
    });

    const text = await page.locator('#assistContainer').innerText();
    // Every string resolved: a missing key renders as the key itself.
    expect(text).not.toMatch(/assist\./);
    expect(text).toMatch(/behind the planet/i);
    // The ledger is the answer to "where did the energy come from".
    expect(await page.locator('#assistLedger').innerText()).toMatch(
      /Nothing was created/i
    );
  });

  test('names the approximation when a star is present, and not otherwise', async ({
    page,
    app,
  }) => {
    await app.boot();
    await fly(page, { scenario: 'Gravity Assist Lab', b: 40 });
    await page.evaluate(async () => {
      const panel = await import('/js/assistPanel.js');
      panel.setAssistEnabled(true);
    });
    // Nothing to qualify: with no star the claim is exact.
    expect(await page.locator('#assistCaveat').innerText()).toBe('');

    await fly(page, { scenario: 'Gravity Assist: Heliocentric', b: 18 });
    await page.evaluate(async () => {
      const panel = await import('/js/assistPanel.js');
      panel.setAssistEnabled(false);
      panel.setAssistEnabled(true);
    });
    const caveat = await page.locator('#assistCaveat').innerText();
    expect(caveat).toMatch(/patched-conic/i);
    expect(caveat).toMatch(/Hill radius/i);
    expect(caveat).toMatch(/%/);
  });

  test('hides itself outside its own scenarios, in both languages', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Gravity Assist Lab', 'e2e', { run: false });
    await expect(page.locator('#assistContainer')).toBeVisible();
    await app.loadScenario('Solar System', 'e2e', { run: false });
    await expect(page.locator('#assistContainer')).toBeHidden();

    await app.loadScenario('Gravity Assist Lab', 'e2e', { run: false });
    for (const locale of ['en', 'es']) {
      await page.evaluate(async l => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(l);
      }, locale);
      const text = await page.locator('#assistContainer').innerText();
      expect(text).not.toMatch(/assist\./);
    }
  });
});
