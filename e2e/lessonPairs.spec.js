// =============================================================================
// Two lessons' controlled pairs, through the panels a student uses
// -----------------------------------------------------------------------------
// tests/lessonPairs.test.js covers the classification, the refinement report
// and the notebook entries against fixed inputs. This covers what only a
// browser can show: that one button really does assemble the apparatus, that
// both arms are recorded over the same simulated interval by the real
// integrator, that a numerical control changes the arithmetic it claims to
// change, and that stopping one halfway puts the world back.
//
// Each test runs the simulation for real, so the two experiments are each set
// up and run once and then examined in full rather than re-run per claim.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Generous, and sized from measurement: see the note in each test. */
const LONG = 540_000;

/** Open the bench on one of the chaos lesson's scenarios. */
async function openBench(page, app, scenario, seed) {
  await app.boot();
  await app.loadScenario(scenario, seed, { run: false });
  await page.evaluate(async () => {
    const bridge = await import('/js/experimentsBridge.js');
    await bridge.ensureBench();
    const panel = await import('/js/experiments/panel.js');
    panel.openPanel();
  });
  await expect(page.locator('#benchChaosSection')).toBeVisible();
}

/** The chaos section's report, once nothing is running. */
const chaosReport = page =>
  page.evaluate(async () => {
    const panel = await import('/js/experiments/panel.js');
    return panel.chaosPairReport();
  });

test.describe('the chaos lesson’s controlled pair', () => {
  test('one action sets it up and runs both arms over one interval', async ({
    page,
    app,
  }) => {
    // Measured at 55 s for the pair on an idle laptop; the ceiling is for a
    // loaded two-core runner.
    test.setTimeout(LONG);
    await openBench(page, app, 'Three-Body Sensitivity Lab', 'chaos-lab');

    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair();
    });
    const report = await chaosReport(page);

    // The apparatus, assembled: the bodies the measure is about, the metrics
    // the lesson reads, and body positions recorded for the divergence.
    const exp = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const e = bench.activeExperiment();
      return {
        objects: e.objects.length,
        metrics: e.metrics,
        recordBodies: e.recordBodies,
        runs: Object.keys(e.runs).sort(),
      };
    });
    expect(exp.objects).toBeGreaterThanOrEqual(3);
    expect(exp.metrics).toContain('separation');
    expect(exp.recordBodies).toBe(true);
    expect(exp.runs).toEqual(['A', 'B']);

    // The same interval, and it is checked rather than hoped for.
    expect(report.a.span).toBeCloseTo(report.b.span, 6);
    expect(report.interval.ok).toBe(true);
    expect(report.a.asked).toBe(40);

    // One variable: the nudge, and nothing in the settings.
    expect(report.perturbation.km).toBe(1500);
    expect(report.perturbation.bodyName).toBe('Alpha');
    expect(report.diff.variables).toEqual([]);

    // The step the engine took, measured.
    expect(report.a.steps).toBeGreaterThan(100);
    expect(report.a.mean).toBeGreaterThan(0);
    expect(report.a.min).toBeCloseTo(report.a.max, 12);

    // And the evidence the lesson is built on: exponential divergence with the
    // interval it was fitted over. Not an execution status, and not a
    // reliability score.
    expect(report.verdict.behaviour).toBe('exponential');
    expect(report.verdict.tau).toBeGreaterThan(7);
    expect(report.verdict.tau).toBeLessThan(10);
    expect(report.verdict.r2).toBeGreaterThan(0.97);
    expect(report.verdict.window.from).toBeGreaterThan(0);
    expect(report.verdict.window.to).toBeGreaterThan(
      report.verdict.window.from
    );

    // Until a control has run, the honest answer is "not resolved".
    expect(report.refinement.unresolved).toBe(true);
    await expect(page.locator('#benchChaosReport')).toContainText(
      /Not resolved yet/i
    );
  });

  test('the reproducibility control changes nothing at all', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openBench(page, app, 'Three-Body Sensitivity Lab', 'chaos-lab');
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair({ nudge: false });
    });
    const report = await chaosReport(page);

    expect(report.nudged).toBe(false);
    expect(report.perturbation).toBeNull();
    expect(report.diff.variables).toEqual([]);
    // Identical input, identical output: the lesson's first act.
    expect(report.verdict.behaviour).toBe('identical');
    await expect(page.locator('#benchChaosReport')).toContainText(
      /Nothing was changed between the runs/i
    );
  });

  test('the two-body control is measured and refused an e-folding time', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openBench(page, app, 'Binary Pair', 'chaos-binary');
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair();
    });
    const report = await chaosReport(page);

    expect(report.configuration).toBe('binary');
    expect(report.perturbation.km).toBe(1500);
    expect(report.interval.ok).toBe(true);
    // The counterexample, kept: growth without exponential growth.
    expect(report.verdict.behaviour).not.toBe('exponential');
    expect(report.verdict.tau).toBeNull();
  });

  test('a numerical control changes the arithmetic it says it changes', async ({
    page,
    app,
  }) => {
    // Measured at 2.8 min for a pair plus two controls.
    test.setTimeout(LONG);
    await openBench(page, app, 'Three-Body Sensitivity Lab', 'chaos-lab');
    const before = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return { step: SETTINGS.max_timestep, integrator: SETTINGS.integrator };
    });

    const out = await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair();
      const base = panel.chaosPairReport();
      await panel.startChaosPair({ control: 'finerStep' });
      const step = panel.chaosPairReport();
      await panel.startChaosPair({ control: 'altIntegrator' });
      const scheme = panel.chaosPairReport();
      return { base, step, scheme };
    });

    // The step control halved the step the engine MEASURED taking. This lab
    // ships with no cap at all, so halving the setting would have halved
    // nothing - which is the whole reason the control works this way.
    expect(before.step).toBe(0);
    expect(out.step.controlDiff.stepChanged).toBe(true);
    expect(out.step.controlDiff.stepChange).toBeCloseTo(-0.5, 2);

    // The integrator control changed the scheme and not the step.
    expect(out.scheme.controlDiff.schemeChanged).toBe(true);
    expect(out.scheme.controlDiff.stepChanged).toBe(false);

    // Both are filed beside the original rather than replacing it, labelled
    // with the step they took, and both count towards the verdict.
    expect(out.scheme.controls).toHaveLength(2);
    for (const c of out.scheme.controls) {
      expect(c.differs).toBe(true);
      expect(c.label).toMatch(/step /);
      expect(c.behaviour).toBe('exponential');
    }
    expect(out.scheme.verdict.tau).toBeCloseTo(out.base.verdict.tau, 6);
    expect(out.scheme.refinement.resolved).toBe(true);
    expect(out.scheme.refinement.effective).toBe(2);
    await expect(page.locator('#benchChaosReport')).toContainText(/Resolved/i);

    // And the settings the reader had are back.
    const after = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return { step: SETTINGS.max_timestep, integrator: SETTINGS.integrator };
    });
    expect(after).toEqual(before);
  });

  test('it will not overwrite an experiment somebody else recorded', async ({
    page,
    app,
  }) => {
    await openBench(page, app, 'Three-Body Sensitivity Lab', 'chaos-lab');
    // A reader's own experiment, with a run in it.
    await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      bench.captureExperiment('My own work');
      bench.activeExperiment().runs.A = { samples: [], results: {} };
    });
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair();
    });
    expect(await chaosReport(page)).toBeNull();
    await expect(page.locator('#benchChaosStatus')).toContainText(
      /My own work/
    );
    const held = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      return bench.activeExperiment().name;
    });
    expect(held).toBe('My own work');
  });
});

test.describe('the Lagrange lesson’s controlled pair', () => {
  /** Open the lab with the three-body panel and the pair section showing. */
  async function openLab(page, app) {
    await app.boot();
    await app.loadScenario('Lagrange Point Lab', 'lagrange', { run: false });
    await expect(page.locator('#cr3bpContainer')).toBeVisible();
    await page.evaluate(() => {
      document.getElementById('cr3bpPairSection').open = true;
    });
  }

  const neckReport = page =>
    page.evaluate(async () => {
      const p = await import('/js/cr3bpPanel.js');
      return p.neckPairReport();
    });

  test('same region, same step, two directions, two paths', async ({
    page,
    app,
  }) => {
    // Measured at 66 s for both arms.
    test.setTimeout(LONG);
    await openLab(page, app);
    const before = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return { speed: SETTINGS.sim_speed, step: SETTINGS.max_timestep };
    });

    await page.locator('#cr3bpPairRun').click();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const p = await import('/js/cr3bpPanel.js');
            return p.isNeckPairRunning() ? null : Boolean(p.neckPairReport());
          }),
        { timeout: LONG - 60_000, intervals: [1000] }
      )
      .toBe(true);
    const report = await neckReport(page);

    // The control: one place, one speed, one Jacobi constant, one open neck.
    expect(report.a.conditions.x).toBeCloseTo(0.6, 6);
    expect(report.b.conditions.x).toBeCloseTo(0.6, 6);
    expect(report.a.conditions.speed).toBeCloseTo(0.565, 9);
    expect(report.b.conditions.speed).toBeCloseTo(0.565, 9);
    expect(report.a.conditions.C).toBeCloseTo(report.b.conditions.C, 12);
    expect(report.comparison.region.ok).toBe(true);
    for (const arm of [report.a, report.b]) {
      expect(arm.conditions.l1Open).toBe(true);
      expect(arm.conditions.l2Open).toBe(false);
      expect(arm.path.complete).toBe(true);
    }
    // Computed the same way, which is checked rather than assumed.
    expect(report.a.steps.mean).toBeCloseTo(report.b.steps.mean, 9);
    expect(report.a.steps.max).toBeLessThanOrEqual(before.step * 1.2);

    // And the finding: the same permission, different routes.
    expect(report.a.path.crossed).toBe(true);
    expect(report.b.path.crossed).toBe(false);
    expect(report.b.path.closestToL1).toBeGreaterThan(0.1);
    expect(report.comparison.conclusion).toBe('sameRegionDifferentPaths');

    // Both paths kept, in the frame the overlay draws in.
    expect(report.a.samples.length).toBeGreaterThan(20);
    expect(report.b.samples.length).toBeGreaterThan(20);

    // The caveat that stops "did not cross" becoming "cannot cross".
    await expect(page.locator('#cr3bpPairCaveat')).toContainText(
      /may use it in the next/i
    );
    // And nothing about stability, which is a different act.
    await expect(page.locator('#cr3bpPairCaveat')).not.toContainText(/stab/i);

    // The reader's own numerical settings, back.
    const after = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return { speed: SETTINGS.sim_speed, step: SETTINGS.max_timestep };
    });
    expect(after).toEqual(before);
  });

  test('stopping it halfway puts the world and the settings back', async ({
    page,
    app,
  }) => {
    test.setTimeout(LONG);
    await openLab(page, app);
    const before = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      const physics = await import('/js/physics.js');
      return {
        speed: SETTINGS.sim_speed,
        step: SETTINGS.max_timestep,
        integrator: SETTINGS.integrator,
        stars: physics.stars.length,
        tracers: physics.planets.length,
      };
    });

    await page.locator('#cr3bpPairRun').click();
    await expect(page.locator('#cr3bpPairCancel')).toBeVisible();
    await page.locator('#cr3bpPairCancel').click();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const p = await import('/js/cr3bpPanel.js');
            return p.isNeckPairRunning();
          }),
        { timeout: 120_000, intervals: [500] }
      )
      .toBe(false);

    const after = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      const physics = await import('/js/physics.js');
      return {
        speed: SETTINGS.sim_speed,
        step: SETTINGS.max_timestep,
        integrator: SETTINGS.integrator,
        stars: physics.stars.length,
        tracers: physics.planets.length,
      };
    });
    expect(after).toEqual(before);

    // A stopped pair does not claim anything. Either there is no report, or it
    // is marked as stopped and its conclusion is not the finding.
    const report = await neckReport(page);
    if (report) {
      expect(report.cancelled).toBe(true);
      expect(report.comparison?.conclusion).not.toBe(
        'sameRegionDifferentPaths'
      );
    }
    // And the panel is usable again.
    await expect(page.locator('#cr3bpPairRun')).toBeEnabled();
    await expect(page.locator('#cr3bpPairCancel')).toBeHidden();
  });

  test('it is offered only where its premise holds', async ({ page, app }) => {
    await openLab(page, app);
    await expect(page.locator('#cr3bpPairSection')).toBeVisible();
    // A third massive body is not a restricted three-body problem, and the
    // overlay says so; the activity has nothing to hold fixed there.
    await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const star = new physics.StarObject(
        { x: 300, y: 300 },
        { x: 0, y: 0 },
        1
      );
      star.mass = 500;
      star.persistent = true;
      physics.stars.push(star);
      const p = await import('/js/cr3bpPanel.js');
      p.refreshCr3bp();
    });
    await expect(page.locator('#cr3bpPairSection')).toBeHidden();
  });
});
