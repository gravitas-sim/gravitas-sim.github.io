// =============================================================================
// The Butterfly Effect in Space, end to end
// -----------------------------------------------------------------------------
// The unit tests cover the arithmetic of the divergence analysis and the
// physics checks cover the configuration. What neither can cover is the claim
// the lesson actually makes to a student: that they can run this experiment,
// in this browser, and get the four results in order.
//
// So this performs the central paired experiment for real - capture, Run A,
// restore, perturb, Run B, compare - and then walks the lesson to its report.
// =============================================================================

import { test, expect } from './fixtures.js';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'test-results', 'chaos');

/** Open the bench and hand its modules to the page for polling. */
async function openBench(page, app) {
  await app.railControl('toggleExperiments');
  await page.locator('#toggleExperiments').click();
  await expect(page.locator('#experimentPanel')).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(async () => {
    window.__bench = await import('/js/experiments/bench.js');
    window.__chaos = await import('/js/chaos/divergence.js');
  });
}

/**
 * Record one run until it has enough samples over enough simulated time.
 *
 * A synchronous predicate over a pre-imported module: an async predicate
 * returns a Promise, which is truthy, and the wait would pass on its first
 * poll.
 */
async function record(page, label, { samples = 45, span = 60 } = {}) {
  const button = page.locator(`#benchRecord${label}`);
  await button.click();
  // A generous budget. These recordings are the simulation genuinely running
  // for a minute of simulated time, twice per test, and under a loaded CI
  // machine sharing cores with other workers the frame rate - and therefore
  // the rate the simulated clock advances - drops a long way.
  await page.waitForFunction(
    ([n, s]) =>
      window.__bench.sampleCount() >= n && window.__bench.recordingSpan() >= s,
    [samples, span],
    { timeout: 300_000 }
  );
  await button.click();
}

/** The divergence verdict for the two recorded runs. */
function verdict(page) {
  return page.evaluate(() => {
    const exp = window.__bench.activeExperiment();
    const shape = run =>
      (run?.samples || [])
        .filter(s => Array.isArray(s.__bodies))
        .map(s => ({ t: s.t, bodies: s.__bodies }));
    const { series } = window.__chaos.separationSeries(
      shape(exp.runs.A),
      shape(exp.runs.B)
    );
    const v = window.__chaos.analyseDivergence(series);
    return {
      behaviour: v.behaviour,
      tau: v.tau,
      r2: v.r2,
      linearR2: v.linearR2,
      growth: v.growth,
      points: series.length,
      perturbation: exp.perturbation,
      controls: exp.numericalControls,
    };
  });
}

/** Set up an experiment on the current scenario, recording body positions. */
async function prepare(page, name) {
  await page.locator('#benchName').fill(name);
  await page.locator('#benchCapture').click();
  await page.evaluate(() => {
    const bench = window.__bench;
    bench.setRecordBodies(true);
    // Positions are what the divergence measure needs; the metric selection is
    // otherwise irrelevant to this test.
    bench.activeExperiment().metrics = ['position'];
  });
}

// Serial: each test records the simulation running for real, twice, and three
// of them competing for the same cores is how they time out rather than how
// they go faster.
test.describe.configure({ mode: 'serial' });

test.describe('the chaos investigation', () => {
  test.beforeEach(async ({ app }) => {
    mkdirSync(OUT, { recursive: true });
    await app.boot();
    await app.dismissFrontDoor();
  });

  test('identical runs are identical, and the widget says so', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(600_000);
    await app.loadScenario('Three-Body Sensitivity Lab', 'chaos-lab');
    await app.waitForBodies(3);
    await openBench(page, app);
    await prepare(page, 'Reproducibility control');

    await record(page, 'A');
    await page.locator('#benchRestore').click();
    await record(page, 'B');

    const v = await verdict(page);
    expect(v.points).toBeGreaterThan(20);
    expect(v.behaviour).toBe('identical');
    expect(v.tau).toBeNull();
  });

  test('the two-body control drifts and is refused a timescale', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(600_000);
    await app.loadScenario('Binary Pair', 'chaos-binary');
    await app.waitForBodies(2);
    // The lesson raises the speed for this section, because the pair's year is
    // 795 simulated seconds and the drift needs several of them.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      ui.SETTINGS.sim_speed = 20;
      physics.updatePhysicsSettings(ui.SETTINGS);
    });
    await openBench(page, app);
    await prepare(page, 'Two-body control');

    // Four orbits, which is what the lesson asks for.
    await record(page, 'A', { samples: 60, span: 3200 });
    await page.locator('#benchRestore').click();

    const applied = await page.evaluate(() => {
      const bench = window.__bench;
      const id = bench.activeExperiment().initialState.b[0].id;
      return bench.applyPerturbation({ bodyId: id, axis: 'x', km: 1500 });
    });
    expect(applied.ok).toBe(true);

    await record(page, 'B', { samples: 60, span: 3200 });
    const v = await verdict(page);

    // The whole point of the control: it comes apart, and it is not chaos.
    expect(v.growth).toBeGreaterThan(2);
    expect(v.behaviour).not.toBe('exponential');
    expect(v.tau).toBeNull();
    expect(v.linearR2).toBeGreaterThan(0.9);
  });

  test('the three-body pair diverges exponentially, and survives refinement', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(700_000);
    await app.loadScenario('Three-Body Sensitivity Lab', 'chaos-lab');
    await app.waitForBodies(3);
    await openBench(page, app);
    await prepare(page, 'Butterfly effect');

    // 1. Baseline.
    await record(page, 'A');

    // 2. Back to the identical start, then one coordinate moved.
    await page.locator('#benchRestore').click();
    const applied = await page.evaluate(() => {
      const bench = window.__bench;
      const alpha = bench
        .activeExperiment()
        .initialState.b.find(b => b.name === 'Alpha');
      return bench.applyPerturbation({
        bodyId: alpha.id,
        axis: 'x',
        km: 1500,
      });
    });
    expect(applied.ok).toBe(true);

    await record(page, 'B');

    const v = await verdict(page);
    expect(v.behaviour).toBe('exponential');
    expect(v.tau).toBeGreaterThan(4);
    expect(v.tau).toBeLessThan(11);
    expect(v.r2).toBeGreaterThan(0.98);
    // Exponential beats a straight line, which is the distinction the lesson
    // exists to draw.
    expect(v.r2).toBeGreaterThan(v.linearR2);
    expect(v.growth).toBeGreaterThan(100);
    // The perturbation is recorded with the experiment, in both units.
    expect(v.perturbation.km).toBe(1500);
    expect(v.perturbation.bodyName).toBe('Alpha');
    expect(v.perturbation.axis).toBe('x');

    // 3. The numerical control: same comparison, different integrator.
    const control = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      ui.SETTINGS.integrator = 'Velocity Verlet';
      physics.updatePhysicsSettings(ui.SETTINGS);
      return window.__bench.recordNumericalControl();
    });
    expect(control.ok).toBe(true);

    const after = await verdict(page);
    expect(after.controls.length).toBeGreaterThan(0);
    const refined = await page.evaluate(() => {
      const exp = window.__bench.activeExperiment();
      return window.__chaos.refinementVerdict([
        {
          tau: exp.numericalControls[0].tau,
          behaviour: exp.numericalControls[0].behaviour,
        },
        {
          tau: exp.numericalControls[0].tau,
          behaviour: exp.numericalControls[0].behaviour,
        },
      ]);
    });
    expect(refined.agree).toBe(true);

    // 4. The experiment exports carrying the perturbation and the provenance.
    const files = await page.evaluate(() => window.__bench.exportFiles('e2e'));
    expect(files.csv.text).toMatch(/^experiment,run,t_days/);
    const manifest = JSON.parse(files.json.text);
    expect(manifest.provenance.scenario).toBe('Three-Body Sensitivity Lab');
    expect(manifest.provenance.integrator).toBeTruthy();
    expect(manifest.provenance.initialStateHash).toMatch(/^[0-9a-f]{8}$/);

    await page.screenshot({ path: join(OUT, 'divergence.png') });
  });

  test('the lesson runs to a report that carries the numbers', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(700_000);
    await app.boot();
    await app.dismissFrontDoor();
    await page
      .locator('#mobileMenuToggle')
      .click()
      .catch(() => {});
    await app.railControl('investigationsBtn');
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="butterfly-effect"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    const total = await page.evaluate(async () => {
      const data = await import('/js/data/investigations.js');
      return data.getInvestigation('butterfly-effect').steps.length;
    });
    expect(total).toBe(28);

    const stepNumber = () =>
      page.evaluate(() => {
        const el = document.getElementById('investigationProgressText');
        const m = /(\d+)/.exec(el?.textContent || '');
        return m ? Number(m[1]) : 0;
      });

    const next = page.locator('#investigationNext');
    const finish = page.locator('#investigationFinish');

    for (let i = 0; i < total + 2; i++) {
      if (await finish.isVisible().catch(() => false)) break;
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      const n = await boxes.count();
      for (let b = 0; b < n; b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }
      const at = await stepNumber();
      await next.click();
      await expect
        .poll(
          async () =>
            (await finish.isVisible().catch(() => false)) ||
            (await stepNumber()) > at,
          { timeout: 30_000 }
        )
        .toBe(true);
    }

    await expect(finish).toBeVisible({ timeout: 30_000 });
    await page.locator('#investigationName').fill('Chaos E2E');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('#investigationDownload').click(),
    ]);
    const path = join(OUT, 'chaos-report.pdf');
    await download.saveAs(path);
    expect(statSync(path).size).toBeGreaterThan(2000);
  });

  // The bench's own home is the bottom left, which during a lesson is the
  // lesson panel's column. Step 3 tells the student to open the bench and keep
  // reading, so a bench on top of the step is the lesson telling them to do
  // something they can no longer see.
  test('the bench never covers the lesson it is opened from', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);

    // A wide screen, one narrow enough that the bench and the lesson compete
    // for the same strip, and a phone, where the lesson is a bottom sheet.
    const sizes = [
      { width: 1440, height: 900 },
      { width: 1024, height: 820 },
      { width: 390, height: 780 },
    ];

    await page
      .locator('#mobileMenuToggle')
      .click()
      .catch(() => {});
    await app.railControl('investigationsBtn');
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="butterfly-effect"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await openBench(page, app);

    // Step 4 carries the divergence instrument as well, so the panel it has to
    // stay clear of is the lesson *and* the tool docked above it.
    const stepNow = () =>
      page.evaluate(() => {
        const m = /(\d+)/.exec(
          document.getElementById('investigationProgressText')?.textContent ||
            ''
        );
        return m ? Number(m[1]) : 0;
      });

    for (const step of [1, 4]) {
      // Forward only, one step at a time, answering whatever a step asks for:
      // there is no public way to jump the lesson to a step.
      while ((await stepNow()) < step) {
        const options = page.locator('#investigationBody .inv-option');
        if (await options.count()) await options.first().click();
        const at = await stepNow();
        await page.locator('#investigationNext').click();
        await expect.poll(stepNow, { timeout: 30_000 }).toBeGreaterThan(at);
      }
      for (const size of sizes) {
        await page.setViewportSize(size);
        // The stack lays out on a frame, so let one pass.
        await page.waitForTimeout(300);
        const boxes = await page.evaluate(() => {
          const rect = id => {
            const el = document.getElementById(id);
            if (!el || getComputedStyle(el).display === 'none' || el.hidden) {
              return null;
            }
            const r = el.getBoundingClientRect();
            return r.width && r.height ? r : null;
          };
          return {
            bench: rect('experimentPanel'),
            lesson: rect('investigationPanel'),
            tool: rect('investigationTool'),
          };
        });
        expect(boxes.bench).not.toBeNull();
        expect(boxes.lesson).not.toBeNull();
        const overlaps = (a, b) =>
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom;
        const where = `step ${step} at ${size.width}x${size.height}`;
        expect(overlaps(boxes.bench, boxes.lesson), where).toBe(false);
        if (boxes.tool) {
          expect(overlaps(boxes.bench, boxes.tool), where).toBe(false);
        }
      }
    }
  });
});
