// =============================================================================
// The numerical reliability check
// -----------------------------------------------------------------------------
// The arithmetic of the verdict is pinned in tests/reliability.test.js. What
// only a browser can establish is that the two runs are real runs of the real
// engine, that the second one is genuinely more finely integrated than the
// first, and that the check gives the three different answers it should give
// to three different kinds of system:
//
//   an analytic two-body orbit    resolved at both steps; the conclusions hold
//   a close encounter             resolved at neither; refinement moves them
//   a chaotic system              paths part, aggregates survive
//
// Also that it puts the world back. A check that left the simulation somewhere
// else would be worse than no check, because the student's next measurement
// would silently be of a different state.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the bench from the rail. */
async function openBench(page, app) {
  await app.railControl('toggleExperiments');
  await page.locator('#toggleExperiments').click();
  await expect(page.locator('#experimentPanel')).toBeVisible({
    timeout: 30_000,
  });
}

/** Capture a start and choose what to measure. */
async function setUp(page, app, scenario, { bodies = 2, metrics } = {}) {
  await app.boot();
  await app.loadScenario(scenario);
  await app.waitForFrames(5);
  await openBench(page, app);
  await page.locator('#benchName').fill('reliability');
  await page.locator('#benchCapture').click();

  await page.locator('#benchSelection').evaluate(el => (el.open = true));
  const chips = page.locator('.experiment-chip');
  for (let i = 0; i < bodies; i++) await chips.nth(i).click();

  if (metrics) {
    await page.evaluate(async ids => {
      const bench = await import('/js/experiments/bench.js');
      bench.activeExperiment().metrics = ids;
    }, metrics);
  }
}

/** Run the check through the engine and return the report. */
async function check(page, duration) {
  return page.evaluate(async d => {
    const bench = await import('/js/experiments/bench.js');
    return bench.runReliabilityCheck({ duration: d });
  }, duration);
}

test.describe('the two runs', () => {
  test('the fine run really is integrated at half the step', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift'],
    });

    const report = await check(page, 20);
    expect(report.ok).toBe(true);

    // Exactly half, not approximately. This is the property the whole method
    // rests on, and the obvious way to get it - halving the frame advance -
    // does not deliver it.
    expect(report.steps.fine).toBeCloseTo(report.steps.coarse / 2, 12);
    expect(report.cost.substeps.fine).toBe(report.cost.substeps.coarse * 2);

    // Both runs covered the same simulated duration, so the difference
    // between them is the step and nothing else.
    expect(report.duration).toBeGreaterThan(0);

    // And sampled it the same number of times, because the frame advance was
    // never touched. Identical instants means no interpolation in between.
    expect(
      Math.abs(report.cost.coarseSamples - report.cost.fineSamples)
    ).toBeLessThanOrEqual(1);
  });

  test('the world is exactly where it was afterwards', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation'],
    });

    const before = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const bench = await import('/js/experiments/bench.js');
      return {
        hash: bench.activeExperiment().provenance.initialStateHash,
        maxTimestep: ui.SETTINGS.max_timestep,
        simSpeed: ui.SETTINGS.sim_speed,
        paused: ui.state.paused,
      };
    });

    await check(page, 12);

    const after = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const bench = await import('/js/experiments/bench.js');
      return {
        hash: bench.activeExperiment().provenance.initialStateHash,
        maxTimestep: ui.SETTINGS.max_timestep,
        simSpeed: ui.SETTINGS.sim_speed,
        paused: ui.state.paused,
        runA: bench.activeExperiment().runs?.A ?? null,
        runB: bench.activeExperiment().runs?.B ?? null,
      };
    });

    // The setting the check drives is handed back, not left where it finished.
    expect(after.maxTimestep).toBe(before.maxTimestep);
    expect(after.simSpeed).toBe(before.simSpeed);
    expect(after.hash).toBe(before.hash);
    // And neither phase was filed as one of the student's own runs.
    expect(after.runA).toBeNull();
    expect(after.runB).toBeNull();
  });

  test('it can be stopped, and stopping still puts the world back', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation'],
    });

    const out = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const bench = await import('/js/experiments/bench.js');
      const maxBefore = ui.SETTINGS.max_timestep;
      // A long check, cancelled almost immediately.
      const running = bench.runReliabilityCheck({ duration: 4000 });
      await new Promise(r => setTimeout(r, 400));
      const wasRunning = bench.isCheckingReliability();
      bench.cancelReliabilityCheck();
      const result = await running;
      return {
        wasRunning,
        reason: result.reason,
        ok: result.ok,
        restored: ui.SETTINGS.max_timestep === maxBefore,
        stillChecking: bench.isCheckingReliability(),
      };
    });

    expect(out.wasRunning).toBe(true);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('cancelled');
    expect(out.restored).toBe(true);
    expect(out.stillChecking).toBe(false);
  });
});

test.describe('three systems, three answers', () => {
  test('an analytic two-body orbit is resolved at both steps', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    // A single planet on a wide, near-circular orbit: the case with a closed
    // form, and the one a working check must not call unresolved.
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift', 'angular_drift'],
    });

    const report = await check(page, 30);
    expect(report.ok).toBe(true);
    expect(report.verdict).toBe('converging');

    // Every conclusion it drew survived refinement.
    const moved = report.metrics.filter(m => m.agrees === false);
    expect(moved).toEqual([]);

    // And the headline still refuses to call it accurate.
    expect(report.explanation.notes).toContain('reliability.stillNotProof');
    expect(report.explanation.notes).toContain(
      'reliability.conservationIsNotAccuracy'
    );
  });

  test('a close encounter under-resolved is caught, and the same one resolved is not', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    // Slingshot is a fast, deep passage. At the step the scenario ships it is
    // resolved, and the check should say so - a check that called everything
    // unresolved would be as useless as one that called everything converged.
    // So this drives it from both sides: the same encounter at the shipped
    // step and at a deliberately coarse one, and the two answers must differ.
    await setUp(page, app, 'Slingshot', {
      bodies: 2,
      metrics: ['separation', 'speed', 'closest_approach', 'energy_drift'],
    });

    const shipped = await check(page, 30);
    expect(shipped.ok).toBe(true);

    // Now the same captured start, integrated far more coarsely - which is
    // literally what a student gets by turning the simulation speed up and
    // leaving it there. Speed rather than the substep cap, because this
    // scenario is already taking one step per frame: the cap is above the
    // frame advance, so raising it further changes nothing at all and the
    // step is simply the frame advance.
    const coarse = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const bench = await import('/js/experiments/bench.js');
      ui.SETTINGS.sim_speed = ui.SETTINGS.sim_speed * 8;
      return bench.runReliabilityCheck({ duration: 30 });
    });
    expect(coarse.ok).toBe(true);

    // The coarse pass is genuinely coarser, so this is a comparison of two
    // different integrations of one encounter rather than of two scenarios.
    expect(coarse.steps.coarse).toBeGreaterThan(shipped.steps.coarse);

    // And the check discriminates: refining the coarse one moves conclusions
    // that refining the shipped one leaves alone.
    const movedAt = r => r.metrics.filter(m => m.agrees === false).length;
    expect(movedAt(coarse)).toBeGreaterThan(movedAt(shipped));
    expect(coarse.verdict).not.toBe('converging');

    // The per-conclusion table is what a reader acts on: which numbers may
    // still be quoted, and which may not.
    expect(coarse.metrics.length).toBeGreaterThan(1);
    expect(coarse.metrics.every(m => 'agrees' in m)).toBe(true);
  });

  test('a chaotic system parts ways without that being called a bad step', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await setUp(page, app, 'Three-Body Sensitivity Lab', {
      bodies: 2,
      metrics: ['separation', 'speed', 'energy_drift'],
    });

    const report = await check(page, 40);
    expect(report.ok).toBe(true);

    // Whatever it concludes, it must not be silent about the distinction.
    if (report.verdict === 'diverged') {
      expect(report.explanation.notes).toContain('reliability.chaosSeparates');
      expect(report.explanation.notes).toContain('reliability.quoteStatistics');
      // The early window is what separates chaos from a broken integration.
      expect(report.series.earlyAgrees).toBe(true);
      expect(report.series.wholeAgrees).toBe(false);
    }
    expect(report.series === null || report.series.n > 3).toBe(true);
  });
});

test.describe('what it reports', () => {
  test('conservation is evidence beside the verdict, never the verdict', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift'],
    });

    const report = await check(page, 20);
    expect(report.conservation).toBeTruthy();
    expect(report.conservation.energy).toHaveProperty('coarse');
    expect(report.conservation.energy).toHaveProperty('fine');
    // The verdict is computed from the outcome, and the outcome is not a
    // conservation diagnostic.
    expect(report.outcomeMetric).not.toBe('energy_drift');
    expect(report.outcomeMetric).not.toBe('angular_drift');
  });

  test('the cost of running it is reported', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation'],
    });
    const report = await check(page, 15);
    expect(report.cost.wallMs).toBeGreaterThan(0);
    expect(report.cost.coarseMs).toBeGreaterThan(0);
    expect(report.cost.fineMs).toBeGreaterThan(0);
    expect(report.cost.substeps.fine).toBeGreaterThan(
      report.cost.substeps.coarse
    );
  });

  test('the export carries everything needed to repeat it', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift'],
    });
    await check(page, 15);

    const text = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      return bench.exportFiles('test').reliability.text;
    });
    const doc = JSON.parse(text);

    expect(doc.kind).toBe('gravitas-reliability-check');
    // Provenance: which start, which seed, which integrator.
    expect(doc.experiment.initialStateHash).toMatch(/^[0-9a-f]{8}$/);
    expect(doc.experiment.seed).toBeTruthy();
    expect(doc.method.integrator).toBeTruthy();
    // Both steps and both substep counts, so the run can be reproduced.
    expect(doc.method.steps.fine).toBeCloseTo(doc.method.steps.coarse / 2, 12);
    expect(doc.method.substeps.fine).toBe(doc.method.substeps.coarse * 2);
    expect(doc.method.tolerance).toBeGreaterThan(0);
    // Per-conclusion agreement, not a single badge.
    expect(Array.isArray(doc.conclusions)).toBe(true);
    // And the caveat travels with the numbers rather than living in the UI.
    expect(doc.conservation.note).toMatch(/does not establish/i);
  });

  test('no string anywhere in the panel calls a result accurate', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift'],
    });
    await check(page, 15);
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      panel.render();
      document.getElementById('benchReliabilitySection').open = true;
    });

    const text = await page.locator('#benchReliabilitySection').innerText();
    expect(text.length).toBeGreaterThan(40);
    // A convergence check cannot establish accuracy, so nothing may claim it.
    expect(text).not.toMatch(/\baccurate\b/i);
    expect(text).not.toMatch(/\bcorrect\b(?!ness)/i);
    // No unresolved message ids either.
    expect(text).not.toMatch(/reliability\./);
  });

  test('the panel says the same careful things in Spanish', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await page.addInitScript(() => {
      localStorage.setItem('gravitas_locale', 'es');
    });
    await setUp(page, app, "Kepler's 2nd Law", {
      bodies: 2,
      metrics: ['separation', 'energy_drift'],
    });
    await check(page, 15);
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      panel.render();
      document.getElementById('benchReliabilitySection').open = true;
    });

    const text = await page.locator('#benchReliabilitySection').innerText();
    expect(text).not.toMatch(/reliability\./);
    expect(text).not.toMatch(/\bpreciso\b/i);
  });
});
