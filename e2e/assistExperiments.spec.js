// =============================================================================
// The gravity-assist comparison and its sweep, through the panel
// -----------------------------------------------------------------------------
// tests/assistSweep.test.js covers the classification, the comparison and the
// notebook entries against fixed inputs. This covers the half only a browser
// can show: that both experiments run the real integrator through the real
// assist watcher, that what comes back is a matched pair of gate readings and
// not the bench's time-averaged speed, that an encounter which never came back
// out is reported as such rather than as a flyby, and that the world the
// reader was looking at is put back afterwards.
//
// The scientific claims are checked here rather than only in the unit tests,
// because a claim about a flyby that is only ever checked against a fixture is
// a claim about the fixture.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the isolated laboratory with both experiment sections showing. */
async function openLab(page, app, scenario = 'Gravity Assist Lab') {
  await app.boot();
  await app.loadScenario(scenario, 'e2e', { run: false });
  await expect(page.locator('#assistContainer')).toBeVisible();
  await page.evaluate(() => {
    for (const id of ['assistCompareSection', 'assistSweepSection']) {
      const el = document.getElementById(id);
      if (el) el.open = true;
    }
  });
}

/** Wait for whichever experiment is running, and hand back its report. */
async function reportFrom(page, which, timeout = 360_000) {
  await expect
    .poll(
      () =>
        page.evaluate(async key => {
          const p = await import('/js/assistPanel.js');
          if (p.isAssistExperimentRunning()) return null;
          const report =
            key === 'comparison'
              ? p.assistComparisonReport()
              : p.assistSweepReport();
          return Boolean(report);
        }, which),
      { timeout, intervals: [500] }
    )
    .toBe(true);
  return page.evaluate(async key => {
    const p = await import('/js/assistPanel.js');
    return key === 'comparison'
      ? p.assistComparisonReport()
      : p.assistSweepReport();
  }, which);
}

// Each test here runs the simulation for real - a pass is about half a minute
// of wall clock and the sweep is five of them - so the two experiments are run
// once each and examined in full, rather than re-run for every claim. The
// timeouts are generous for the same reason, and sized from measurement: the
// whole file takes 4.2 minutes of wall clock at six local workers, its slowest
// test 4.2 minutes on its own under that contention, and CI's runners are
// about 1.4 times slower than this laptop.
const LONG = 540_000;

test.describe('the retained comparison', () => {
  test('two passes, one difference, and everything it reports about them', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openLab(page, app);

    const before = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return {
        scenario: SETTINGS.preset_scenario,
        b: SETTINGS.assist_impact_parameter,
        vInf: SETTINGS.assist_v_infinity,
        gate: SETTINGS.assist_gate,
        step: SETTINGS.max_timestep,
        integrator: SETTINGS.integrator,
      };
    });

    await page.locator('#assistCompareRun').click();
    const report = await reportFrom(page, 'comparison', LONG - 60_000);

    // --- one difference, everything else held ---------------------------------
    expect(report.gaining.value).toBe(40);
    expect(report.losing.value).toBe(-40);
    expect(report.held.vInfinity).toBeCloseTo(0.461, 6);
    expect(report.held.gate).toBe(before.gate);
    expect(report.held.integrator).toBe(before.integrator);
    expect(report.held.maxTimestep).toBe(before.step);
    expect(typeof report.seed).toBe('string');

    // --- both are complete encounters, read at the same gate ------------------
    for (const enc of [report.gaining, report.losing]) {
      expect(enc.outcome).toBe('complete');
      expect(enc.usable).toBe(true);
      expect(enc.gate).toBe(before.gate);
      for (const field of [
        'relBefore',
        'relAfter',
        'inertBefore',
        'inertAfter',
        'deflectionDeg',
        'closest',
        'deltaVMagnitude',
      ]) {
        expect(Number.isFinite(enc[field])).toBe(true);
      }
    }

    // --- one gains and one loses ----------------------------------------------
    expect(report.gaining.side).toBe('trailing');
    expect(report.losing.side).toBe('leading');
    expect(report.gaining.speedChange).toBeGreaterThan(0);
    expect(report.losing.speedChange).toBeLessThan(0);

    // --- what IS the same: the turn, the closest approach, the velocity change
    expect(report.sides.deflectionMismatch).toBeLessThan(0.01);
    expect(report.sides.closestMismatch).toBeLessThan(0.01);
    expect(report.sides.deltaVMismatch).toBeLessThan(0.01);

    // --- and what is not, which must never be reported as though it were ------
    expect(report.sides.symmetric).toBe(false);
    expect(Math.abs(report.losing.speedChange)).toBeLessThan(
      Math.abs(report.gaining.speedChange) * 0.9
    );

    // --- the claim the isolated laboratory exists to make exactly --------------
    for (const enc of [report.gaining, report.losing]) {
      expect(Math.abs(enc.relativeResidual)).toBeLessThan(1e-6);
    }

    // --- the finite spacecraft, and the recoil that follows from it -----------
    const audit = report.audit;
    expect(audit.massRatio).toBeCloseTo(1e-6, 12);
    // Momentum conservation as a division: the planet's velocity change is the
    // spacecraft's, scaled by the mass ratio.
    expect(audit.recoilMatchesMass).toBe(true);
    expect(audit.planetRecoil).toBeGreaterThan(0);
    // The books balance. Not to machine precision, and not because of the
    // integrator: the readings are taken at a finite distance, where the two
    // bodies are still very slightly pulling on each other, so what is left
    // depends on how finely the encounter was integrated - which the
    // application sizes from the frame rate. Measured at 6e-6 on an idle
    // laptop and 1.7e-5 on a loaded one, so the bound is 1e-4: still four
    // orders below anything the lesson's argument needs, and not a bound that
    // turns red when the machine is busy.
    expect(Math.abs(audit.ledgerMismatch)).toBeLessThan(1e-4);
    expect(Math.abs(audit.ledgerMismatch)).toBeGreaterThan(0);

    // --- and the reader's own world, back as it was ---------------------------
    const after = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return {
        scenario: SETTINGS.preset_scenario,
        b: SETTINGS.assist_impact_parameter,
        vInf: SETTINGS.assist_v_infinity,
        step: SETTINGS.max_timestep,
      };
    });
    expect(after).toEqual({
      scenario: before.scenario,
      b: before.b,
      vInf: before.vInf,
      step: before.step,
    });
  });

  test('an encounter that never came back out is not reported as a flyby', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openLab(page, app);
    // Freeze the world under the runner. Every trial then builds, arms, and
    // integrates nothing, so no spacecraft reaches the outbound gate - which
    // is the state an over-short budget would produce, without having to
    // reach inside the runner to produce it.
    await page.evaluate(async () => {
      const { state } = await import('/js/physics.js');
      window.__freeze = window.setInterval(() => {
        state.paused = true;
      }, 10);
    });
    await page.locator('#assistCompareRun').click();
    const report = await reportFrom(page, 'comparison', LONG - 60_000);
    await page.evaluate(() => window.clearInterval(window.__freeze));

    for (const enc of [report.gaining, report.losing]) {
      expect(enc.outcome).not.toBe('complete');
      expect(enc.usable).toBe(false);
      // Nothing that could be read as a measured flyby survives.
      expect(enc.speedChange).toBeNull();
      expect(enc.deltaVMagnitude).toBeNull();
    }
    // And with no usable pass there is no comparison to report.
    expect(report.sides).toBeNull();
    expect(report.audit).toBeNull();
  });

  test('the panel writes the pair into the notebook', async ({ page, app }) => {
    test.setTimeout(LONG);
    await openLab(page, app);
    await page.locator('#assistCompareRun').click();
    await reportFrom(page, 'comparison', LONG - 60_000);

    await expect(page.locator('#assistCompareKeep')).toBeEnabled();
    await page.locator('#assistCompareKeep').click();
    await expect(page.locator('#nbDraftClaim')).toBeVisible();
    await page
      .locator('#nbDraftClaim')
      .fill('I predicted that passing behind would gain speed.');
    await page.locator('#nbDraftSave').click();
    await expect(page.locator('.nb-entry')).toHaveCount(1);

    const entry = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const all = panel.notebookEntries();
      return all[all.length - 1];
    });

    expect(entry.source).toBe('bench-comparison');
    // The numbers that carry the argument, and the limitations that outlive
    // them: the two speed changes are not mirror images, and the spacecraft
    // has a mass.
    const labels = entry.snapshot.quantities.map(q => q.label).join(' | ');
    expect(labels).toMatch(/behind/i);
    expect(labels).toMatch(/in front/i);
    expect(entry.prose.limitations).toMatch(/not the same size/i);
    expect(entry.prose.limitations).toMatch(/recoil/i);
    // The settings the passes were actually integrated at, not the panel's.
    expect(entry.snapshot.provenance.seed).toBeTruthy();
    expect(entry.snapshot.provenance.numerical.integrator).toBe(
      'Velocity Verlet'
    );
    expect(
      Number.isFinite(entry.snapshot.provenance.numerical.maxTimestep)
    ).toBe(true);
  });
});

test.describe('the optional sweep', () => {
  test('five passes on one side, and the question it asks of them', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openLab(page, app);
    await page.locator('#assistSweepRun').click();
    const report = await reportFrom(page, 'sweep', LONG - 60_000);

    expect(report.encounters).toHaveLength(5);
    expect(report.encounters.map(enc => enc.value)).toEqual([
      20, 30, 40, 60, 90,
    ]);
    for (const enc of report.encounters) {
      // Every one of these clears the planet, so every one is a flyby.
      expect(enc.outcome).toBe('complete');
      expect(enc.speedChange).toBeGreaterThan(0);
      expect(Math.abs(enc.deflectionDeg)).toBeGreaterThan(0);
      // The closest of them is still several planet radii out. A sweep that
      // quietly included a collision would report it as a flyby with no
      // outgoing reading.
      expect(enc.closest).toBeGreaterThan(3 * 2.4);
    }

    // The turn falls as the pass gets wider. Physics, not a fit.
    const turns = report.encounters.map(enc => Math.abs(enc.deflectionDeg));
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]).toBeLessThan(turns[i - 1]);
    }

    // Only the impact parameter changed, and every pass was read at one gate.
    expect(report.held.vInfinity).toBeCloseTo(0.461, 6);
    expect(new Set(report.encounters.map(enc => enc.gate)).size).toBe(1);

    // In this laboratory the strongest turn does gain the most, because the
    // pass that would overshoot the optimum hits the planet. The verdict is
    // read off the trials rather than asserted.
    expect(report.verdict.n).toBe(5);
    expect(report.verdict.mostTurned).toBe(20);
    expect(report.verdict.mostGained).toBe(20);
    expect(report.verdict.same).toBe(true);
    expect(report.verdict.monotonic).toBe(true);

    // And the caveat that stops it being read as a law is on screen.
    await expect(page.locator('#assistSweepCaveat')).toContainText(
      /Neither answer is a rule/i
    );
  });

  test('a stopped sweep keeps what it measured and says what it did not', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openLab(page, app);
    await page.locator('#assistSweepRun').click();
    // Stop it as soon as the first pass is under way.
    await expect(page.locator('#assistSweepCancel')).toBeVisible();
    await page.locator('#assistSweepCancel').click();
    const report = await reportFrom(page, 'sweep', LONG - 60_000);

    expect(report.cancelled).toBe(true);
    // Values that never ran are in the table, marked, rather than missing.
    expect(report.encounters).toHaveLength(5);
    expect(report.encounters.some(enc => enc.outcome === 'notRun')).toBe(true);
    for (const enc of report.encounters) {
      if (enc.outcome === 'notRun') expect(enc.usable).toBe(false);
    }
    await expect(page.locator('#assistSweepCaveat')).toContainText(/stopped/i);
  });
});

test.describe('where the experiments belong', () => {
  test('they are offered in the isolated lab and hidden with a star', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    await expect(page.locator('#assistCompareSection')).toBeVisible();
    await expect(page.locator('#assistSweepSection')).toBeVisible();

    await app.loadScenario('Gravity Assist: Heliocentric', 'e2e', {
      run: false,
    });
    await expect(page.locator('#assistContainer')).toBeVisible();
    // The comparison's claim is that its two arms differ in one number. With a
    // star present the planet's frame is accelerating too, so it would differ
    // in two - and the lesson meets that deliberately, one screen at a time.
    await expect(page.locator('#assistCompareSection')).toBeHidden();
    await expect(page.locator('#assistSweepSection')).toBeHidden();
  });
});
