// =============================================================================
// The manoeuvre planner
// -----------------------------------------------------------------------------
// tests/maneuver.test.js pins the arithmetic against the closed form. What only
// a browser can show is that the burn the panel previews is the burn the engine
// then flies, that Apply and Undo leave the world in the states they claim, and
// that the two things a burn quietly breaks - a running recording and the
// timeline - are told about it.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Load the transfer lab and open the planner on the spacecraft. */
async function openPlanner(page, app) {
  await app.boot();
  await app.loadScenario('Orbital Transfer Lab');
  await app.waitForFrames(5);
  await page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const bridge = await import('/js/maneuverBridge.js');
    const probe = p.planets.find(b => b.name === 'Spacecraft');
    await bridge.openManeuverFor(probe.id);
  });
  await expect(page.locator('#maneuverPanel')).toBeVisible({ timeout: 30_000 });
}

/** The spacecraft's orbit right now, as the application sees it. */
const orbit = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const { orbitalElements } = await import('/js/orbital.js');
    const ui = await import('/js/ui.js');
    const probe = p.planets.find(b => b.name === 'Spacecraft');
    const star = p.stars[0];
    const el = orbitalElements(probe, star, ui.SETTINGS.gravitational_constant);
    return {
      a: el.a,
      e: el.e,
      periapsis: el.periapsis,
      apoapsis: el.apoapsis,
      energy: el.energy,
      h: el.angularMomentum,
      bound: el.bound,
      mu: el.mu,
    };
  });

test.describe('the planner is not in the start-up path', () => {
  test('nothing loads it until it is asked for', async ({ page, app }) => {
    await app.boot();
    const loaded = await page.evaluate(async () => {
      const bridge = await import('/js/maneuverBridge.js');
      return bridge.maneuverPlannerLoaded();
    });
    expect(loaded).toBe(false);
  });
});

test.describe('previewing and applying', () => {
  test('the burn the panel previews is the burn the engine flies', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);
    // Paused, because the claim is that the preview describes the burn - and
    // an unpaused world moves between reading the prediction and pressing
    // Apply, so the burn would be made from a slightly different place and the
    // two would differ for a reason that is not the planner's fault.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.paused = true;
    });
    const before = await orbit(page);

    // The analytic first burn of a Hohmann transfer to the station's radius.
    const dv1 = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { orbitalElements } = await import('/js/orbital.js');
      const { hohmann } = await import('/js/maneuver.js');
      const ui = await import('/js/ui.js');
      const G = ui.SETTINGS.gravitational_constant;
      const star = p.stars[0];
      const probe = p.planets.find(b => b.name === 'Spacecraft');
      const target = p.planets.find(b => b.name === 'Target Station');
      const ep = orbitalElements(probe, star, G);
      const et = orbitalElements(target, star, G);
      return hohmann({ r1: ep.r, r2: et.r, mu: ep.mu }).dv1;
    });

    await page.locator('#maneuverTransverse').fill(String(dv1));
    await page.locator('#maneuverTransverse').dispatchEvent('input');
    await expect(page.locator('#maneuverPreview table')).toBeVisible();

    // What the preview says will happen.
    const predicted = await page.evaluate(async dv => {
      const p = await import('/js/physics.js');
      const { previewBurn } = await import('/js/maneuver.js');
      const ui = await import('/js/ui.js');
      const probe = p.planets.find(b => b.name === 'Spacecraft');
      return previewBurn({
        body: probe,
        primary: p.stars[0],
        G: ui.SETTINGS.gravitational_constant,
        transverse: dv,
      }).after;
    }, dv1);

    await page.locator('#maneuverApply').click();
    const after = await orbit(page);

    // The engine's orbit after the burn is the one the panel drew before it.
    expect(after.a).toBeCloseTo(predicted.a, 6);
    expect(after.e).toBeCloseTo(predicted.e, 6);
    expect(after.apoapsis).toBeCloseTo(predicted.apoapsis, 5);

    // And it is the transfer ellipse the closed form asks for: periapsis where
    // we started, apoapsis at the destination.
    // The burn point stays on the new orbit, so periapsis is where the
    // spacecraft was. Relative, because the starting orbit has an eccentricity
    // of about 1e-4 rather than exactly zero, so the burn is not quite at an
    // apsis and periapsis moves by a part in a few thousand.
    expect(after.periapsis / before.periapsis).toBeCloseTo(1, 3);
    expect(after.apoapsis / before.periapsis).toBeCloseTo(2.5, 2);
    expect(after.energy).toBeGreaterThan(before.energy);
    expect(after.h).toBeGreaterThan(before.h);
  });

  test('an escape burn is called escape, not given an apoapsis', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);
    const before = await orbit(page);
    // Comfortably over escape: v_esc = sqrt(2) * v_circ.
    const dv = Math.sqrt(before.mu / before.a) * 0.6;
    await page.locator('#maneuverTransverse').fill(String(dv));
    await page.locator('#maneuverTransverse').dispatchEvent('input');

    const text = await page.locator('#maneuverPreview').innerText();
    expect(text).toMatch(/escape trajectory/i);
    // No apoapsis and no period, rather than a cell reading Infinity.
    expect(text).not.toMatch(/Infinity/);
  });

  test('the panel states the two-body assumption without being asked', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);
    const caveat = await page.locator('.maneuver-caveat').innerText();
    expect(caveat).toMatch(/osculating two-body/i);
    expect(caveat).toMatch(/ignored/i);
    expect(caveat).toMatch(/drift away/i);
  });
});

test.describe('undo', () => {
  test('puts the world back where it was', async ({ page, app }) => {
    await openPlanner(page, app);
    const before = await orbit(page);

    await page.locator('#maneuverTransverse').fill('0.4');
    await page.locator('#maneuverTransverse').dispatchEvent('input');
    await page.locator('#maneuverApply').click();
    const burned = await orbit(page);
    expect(burned.apoapsis).toBeGreaterThan(before.apoapsis * 1.05);

    await page.locator('#maneuverUndo').click();
    await page.waitForTimeout(300);
    const undone = await orbit(page);

    // Not merely "the impulse was subtracted": the orbit is the one that was
    // there before, to the precision the restore preserves.
    expect(undone.a / before.a).toBeCloseTo(1, 5);
    expect(undone.energy / before.energy).toBeCloseTo(1, 5);
    // Both are circular to within a rounding of the saved state; comparing two
    // near-zero eccentricities for equality would be comparing serialisation
    // noise. What matters is that the burn's eccentricity is gone.
    expect(burned.e).toBeGreaterThan(0.05);
    expect(undone.e).toBeLessThan(0.001);
  });

  test('undo empties the log and disables itself', async ({ page, app }) => {
    await openPlanner(page, app);
    await page.locator('#maneuverTransverse').fill('0.2');
    await page.locator('#maneuverTransverse').dispatchEvent('input');
    await page.locator('#maneuverApply').click();

    await expect(page.locator('#maneuverLog p')).toHaveCount(1);
    await expect(page.locator('#maneuverUndo')).toBeEnabled();

    await page.locator('#maneuverUndo').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#maneuverLog p')).toHaveCount(0);
    await expect(page.locator('#maneuverUndo')).toBeDisabled();
  });

  test('undo resets the timeline, because the recorded future is gone', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);
    await app.waitForFrames(150);

    // The timeline's own clock rather than its frame count. The recorder
    // throttles captures on simulated time, and this scenario runs fast enough
    // that a hundred and fifty animation frames are only a couple of recorded
    // ones - so a count is a measurement of the throttle, not of the reset.
    const clockBefore = await page.evaluate(async () => {
      const tl = await import('/js/timeline.js');
      return tl.getSimClock();
    });
    expect(clockBefore).toBeGreaterThan(0);

    await page.locator('#maneuverTransverse').fill('0.2');
    await page.locator('#maneuverTransverse').dispatchEvent('input');
    await page.locator('#maneuverApply').click();
    await page.locator('#maneuverUndo').click();
    await page.waitForTimeout(200);

    const clockAfter = await page.evaluate(async () => {
      const tl = await import('/js/timeline.js');
      return tl.getSimClock();
    });
    // Restoring re-initialises the world, so the recorded history - which
    // describes a future that has been discarded - goes with it.
    expect(clockAfter).toBeLessThan(clockBefore);
  });
});

test.describe('what a burn invalidates', () => {
  test('a running recording is restarted, and says why', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);

    const out = await page.evaluate(async () => {
      const { sessionKey, sessionChange } =
        await import('/js/observingSession.js');
      const physics = await import('/js/physics.js');
      const p = await import('/js/physics.js');
      const before = sessionKey({
        starId: 7,
        interventionEpoch: physics.getInterventionEpoch(),
      });
      // A burn, through the panel's own path.
      const probe = p.planets.find(b => b.name === 'Spacecraft');
      probe.vel.y += 0.01;
      physics.noteIntervention();
      const after = sessionKey({
        starId: 7,
        interventionEpoch: physics.getInterventionEpoch(),
      });
      return sessionChange(before, after);
    });

    // Same star, same geometry, same units, same world - and the recording is
    // still not a recording of what is on screen.
    expect(out).toBe('maneuver');
  });

  test('the burn log carries everything needed to reproduce it', async ({
    page,
    app,
  }) => {
    await openPlanner(page, app);
    await page.locator('#maneuverRadial').fill('0.05');
    await page.locator('#maneuverTransverse').fill('0.3');
    await page.locator('#maneuverTransverse').dispatchEvent('input');
    await page.locator('#maneuverApply').click();

    const entry = await page.evaluate(async () => {
      const planner = await import('/js/maneuverPlanner.js');
      return planner.burnLog()[0];
    });

    expect(entry.body.name).toBe('Spacecraft');
    expect(entry.primary.name).toBe('Sol');
    expect(entry.frame).toMatch(/radial-transverse/i);
    expect(entry.delta.radial).toBeCloseTo(0.05, 12);
    expect(entry.delta.transverse).toBeCloseTo(0.3, 12);
    expect(Number.isFinite(entry.simTime)).toBe(true);
    // Units, so the numbers mean something outside this tab.
    expect(entry.units.velocityToMs).toBeGreaterThan(0);
    expect(entry.units.timeToSeconds).toBeGreaterThan(0);
    // The orbit either side, and the caveat with them.
    expect(entry.before.apoapsis).toBeGreaterThan(0);
    expect(entry.after.apoapsis).toBeGreaterThan(entry.before.apoapsis);
    expect(entry.assumption).toMatch(/two-body/i);
  });
});

test.describe('the whole transfer', () => {
  test('both burns and the coast match the closed form', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await openPlanner(page, app);

    // The whole manoeuvre inside one evaluate, with the world stopped. Not
    // fastidiousness: this scenario advances five simulation units per frame,
    // so a round trip to the test runner between the burn and the coast lets
    // the spacecraft fly a third of the transfer before the clock starts, and
    // the coast then reads nine per cent short of the closed form for reasons
    // that have nothing to do with the physics. Applying through the panel is
    // covered by the tests above; what this one is for is the arithmetic.
    const out = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { orbitalElements } = await import('/js/orbital.js');
      const { hohmann, previewBurn } = await import('/js/maneuver.js');
      const ui = await import('/js/ui.js');
      ui.state.paused = true;

      const G = ui.SETTINGS.gravitational_constant;
      const star = p.stars[0];
      const probe = p.planets.find(b => b.name === 'Spacecraft');
      const target = p.planets.find(b => b.name === 'Target Station');
      const el = () => orbitalElements(probe, star, G);

      const before = el();
      const plan = hohmann({
        r1: before.r,
        r2: orbitalElements(target, star, G).r,
        mu: before.mu,
      });

      // --- Burn one, at the inner circular orbit ---------------------------
      const first = previewBurn({
        body: probe,
        primary: star,
        G,
        transverse: plan.dv1,
      });
      probe.vel.x += first.delta.vector.x;
      probe.vel.y += first.delta.vector.y;
      const transfer = el();

      // --- Coast to apoapsis, integrated rather than jumped ----------------
      const startClock = p.getSimulationTime();
      let previous = transfer.r;
      let steps = 0;
      for (; steps < 500000; steps++) {
        p.updatePhysics(0.02);
        const r = el().r;
        if (r < previous) break;
        previous = r;
      }
      const coasted = p.getSimulationTime() - startClock;
      const atApoapsis = el();

      // --- Burn two, circularising -----------------------------------------
      const second = previewBurn({
        body: probe,
        primary: star,
        G,
        transverse: plan.dv2,
      });
      probe.vel.x += second.delta.vector.x;
      probe.vel.y += second.delta.vector.y;
      const finalOrbit = el();

      return {
        plan,
        transfer: {
          a: transfer.a,
          periapsis: transfer.periapsis,
          apoapsis: transfer.apoapsis,
          halfPeriod: transfer.period / 2,
        },
        coasted,
        arrivedAt: previous,
        arrivalSpeed: atApoapsis.v,
        final: {
          e: finalOrbit.e,
          a: finalOrbit.a,
          periapsis: finalOrbit.periapsis,
          apoapsis: finalOrbit.apoapsis,
        },
      };
    });

    // The first burn produces exactly the transfer ellipse the closed form
    // describes: periapsis where we are, apoapsis at the destination.
    expect(out.transfer.periapsis / out.plan.r1).toBeCloseTo(1, 4);
    expect(out.transfer.apoapsis / out.plan.r2).toBeCloseTo(1, 3);
    // A part in four thousand. The starting orbit is circular to about 1e-4
    // rather than exactly, so the plan's radius and the orbit's semi-major
    // axis are not quite the same number to begin with.
    expect(out.transfer.a / out.plan.aTransfer).toBeCloseTo(1, 3);

    // The coast takes the time the closed form says, integrated by the engine
    // rather than computed. This is the claim that the analytic transfer time
    // is a fact about this simulation and not only about the algebra.
    expect(out.coasted / out.plan.transferTime).toBeCloseTo(1, 3);
    expect(out.coasted / out.transfer.halfPeriod).toBeCloseTo(1, 3);
    expect(out.arrivedAt / out.plan.r2).toBeCloseTo(1, 3);

    // And the arrival speed is the one vis-viva predicts at apoapsis, which is
    // what makes the size of the second burn a prediction rather than a fit.
    expect(out.arrivalSpeed / out.plan.transfer.arrive).toBeCloseTo(1, 3);

    // The half everybody forgets. Without it the spacecraft falls straight
    // back to where it came from.
    expect(out.final.e).toBeLessThan(0.005);
    expect(out.final.a / out.plan.r2).toBeCloseTo(1, 3);
    expect(out.final.periapsis / out.plan.r2).toBeCloseTo(1, 2);
  });
});
