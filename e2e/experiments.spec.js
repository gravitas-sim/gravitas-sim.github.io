// =============================================================================
// The A/B experiment bench, driven the way a student drives it
// -----------------------------------------------------------------------------
// The unit tests cover the arithmetic: hashing, alignment, metrics, storage,
// exports. What they cannot cover is the claim the whole feature rests on -
// that Run B genuinely starts where Run A started, in a real browser, after a
// real simulation has been run past that point and put back.
//
// So this walks the whole thing: capture, record, restore, change one variable,
// record again, compare, export both files, reopen from the file, and open the
// setup from a share link in a fresh page.
// =============================================================================

import { test, expect } from './fixtures.js';
import { mkdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'test-results', 'experiments');

/** Open the bench from the rail. */
async function openBench(page, app) {
  await app.railControl('toggleExperiments');
  await page.locator('#toggleExperiments').click();
  await expect(page.locator('#experimentPanel')).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Record a run until the bench has taken this many samples.
 *
 * Waits on the sample count rather than on a wall clock or on the simulated
 * clock. Wall time varies by machine; the simulated clock is worse, because a
 * scenario that substeps advances it several times inside one animation frame,
 * so "three simulated seconds" can be three frames and three samples. The
 * count is the thing the comparison actually needs.
 */
async function recordRun(page, label, samples = 12, span = 2) {
  const button = page.locator(`#benchRecord${label}`);
  // The module is stashed first and the predicate is synchronous. An async
  // predicate here returns a Promise, which is truthy, so waitForFunction
  // succeeds on its first poll and the run is stopped after three samples.
  await page.evaluate(async () => {
    window.__bench = await import('/js/experiments/bench.js');
  });
  await button.click();
  // Both a sample count and a simulated span: the two runs are compared on a
  // shared time axis, so a run that took twenty samples covering a tenth of a
  // second would overlap the other one barely at all.
  await page.waitForFunction(
    ([n, seconds]) =>
      window.__bench.sampleCount() >= n &&
      window.__bench.recordingSpan() >= seconds,
    [samples, span],
    { timeout: 60_000 }
  );
  await button.click();
  await expect(page.locator(`#benchRun${label}`)).not.toHaveText(
    /not recorded/
  );
}

function simClock(page) {
  return page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return p.getSimulationTime();
  });
}

/** Read the bench's own view of the experiment. */
function benchState(page) {
  return page.evaluate(async () => {
    const bench = await import('/js/experiments/bench.js');
    const exp = bench.activeExperiment();
    if (!exp) return null;
    return {
      name: exp.name,
      hash: exp.provenance.initialStateHash,
      scenario: exp.provenance.scenario,
      seed: exp.provenance.seed,
      objects: exp.objects,
      metrics: exp.metrics,
      runs: Object.keys(exp.runs || {}),
      samplesA: exp.runs?.A?.samples?.length || 0,
      samplesB: exp.runs?.B?.samples?.length || 0,
      diff: exp.diff,
    };
  });
}

test.describe('the A/B experiment bench', () => {
  test.beforeEach(async ({ app }) => {
    mkdirSync(OUT, { recursive: true });
    await app.boot();
    await app.dismissFrontDoor();
  });

  test('a whole experiment: capture, run A, restore, change one thing, run B, compare', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await openBench(page, app);

    // 1. Name it and capture the start.
    await page.locator('#benchName').fill('Gravity doubled');
    await page.locator('#benchCapture').click();
    const captured = await benchState(page);
    expect(captured.name).toBe('Gravity doubled');
    expect(captured.scenario).toBe('Binary BH');
    expect(captured.hash).toMatch(/^[0-9a-f]{8}$/);

    // 2. Select two bodies, which is what a separation needs.
    await page.locator('#benchSelection').evaluate(el => (el.open = true));
    const chips = page.locator('.experiment-chip');
    await chips.nth(0).click();
    await chips.nth(1).click();
    expect((await benchState(page)).objects.length).toBe(2);

    // 3. Run A.
    await recordRun(page, 'A', 20);
    const afterA = await benchState(page);
    expect(afterA.runs).toContain('A');
    expect(afterA.samplesA).toBeGreaterThanOrEqual(20);

    // 4. Back to the exact start. The simulation has run past it, so this is
    //    the claim the whole feature rests on.
    const clockBefore = await simClock(page);
    expect(clockBefore).toBeGreaterThan(0);
    await page.locator('#benchRestore').click();
    const restored = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const now = ui.captureShareState({
        kind: 'full',
        includeCamera: false,
        forExperiment: true,
      });
      const { hashState } = await import('/js/experiments/canonicalState.js');
      return {
        clock: p.getSimulationTime(),
        hash: hashState(now),
        expected: bench.activeExperiment().provenance.initialStateHash,
      };
    });
    expect(restored.hash).toBe(restored.expected);
    expect(restored.clock).toBeLessThan(clockBefore);

    // 5. Change exactly one independent variable.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      ui.SETTINGS.gravitational_constant *= 2;
      physics.updatePhysicsSettings(ui.SETTINGS);
    });

    // 6. Run B.
    await recordRun(page, 'B', 20);
    const afterB = await benchState(page);
    expect(afterB.runs).toEqual(expect.arrayContaining(['A', 'B']));
    expect(afterB.samplesB).toBeGreaterThanOrEqual(20);

    // 7. The comparison: one variable named, a table, and aligned series.
    expect(afterB.diff.variables.map(v => v.key)).toEqual([
      'gravitational_constant',
    ]);
    expect(afterB.diff.multivariable).toBe(false);

    await expect(page.locator('#benchDiff')).toContainText(
      'gravitational_constant'
    );
    const table = page.locator('.experiment-table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).not.toHaveCount(0);

    const alignment = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const c = bench.compare();
      const key = Object.keys(c.aligned)[0];
      const a = c.aligned[key];
      return {
        rows: a.rows.length,
        empty: a.window.empty,
        // Every row must be one simulated time compared against itself.
        monotonic: a.rows.every((r, i) => i === 0 || r.t >= a.rows[i - 1].t),
      };
    });
    expect(alignment.empty).toBe(false);
    expect(alignment.rows).toBeGreaterThan(3);
    expect(alignment.monotonic).toBe(true);

    await page.screenshot({ path: join(OUT, 'compared.png') });
  });

  test('warns when more than one variable changed, and lets it be confirmed', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await openBench(page, app);

    await page.locator('#benchCapture').click();
    await page.locator('#benchSelection').evaluate(el => (el.open = true));
    await page.locator('.experiment-chip').nth(0).click();
    await page.locator('.experiment-chip').nth(1).click();
    await recordRun(page, 'A', 12);
    await page.locator('#benchRestore').click();

    // Two variables, deliberately.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      ui.SETTINGS.gravitational_constant *= 2;
      ui.SETTINGS.integrator = 'Velocity Verlet';
      physics.updatePhysicsSettings(ui.SETTINGS);
    });
    await recordRun(page, 'B', 12);

    const warning = page
      .locator('.experiment-warning.is-warn')
      .filter({ hasText: /things changed/i });
    await expect(warning).toContainText(/2 things changed/i);
    const confirm = page.locator('button', { hasText: /on purpose/i });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(confirm).toHaveCount(0);

    // Starting both runs from the capture is what guarantees a shared window.
    const overlap = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const c = bench.compare();
      const first = Object.values(c.aligned)[0];
      return { empty: first.window.empty, span: first.window.span };
    });
    expect(overlap.empty).toBe(false);
    expect(overlap.span).toBeGreaterThan(0);
  });

  test('exports a CSV and a manifest, and reopens from the manifest', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await openBench(page, app);

    await page.locator('#benchName').fill('Export check');
    await page.locator('#benchCapture').click();
    await page.locator('#benchSelection').evaluate(el => (el.open = true));
    await page.locator('.experiment-chip').nth(0).click();
    await page.locator('.experiment-chip').nth(1).click();
    await recordRun(page, 'A', 12);
    await page.locator('#benchRestore').click();
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      ui.SETTINGS.gravitational_constant *= 1.5;
      physics.updatePhysicsSettings(ui.SETTINGS);
    });
    await recordRun(page, 'B', 12);

    const csvDownload = page.waitForEvent('download');
    await page.locator('#benchExportCsv').click();
    const csvFile = await csvDownload;
    const csvPath = join(OUT, 'experiment.csv');
    await csvFile.saveAs(csvPath);
    expect(statSync(csvPath).size).toBeGreaterThan(100);
    const csv = readFileSync(csvPath, 'utf8');
    const [header, ...lines] = csv.trim().split('\r\n');
    // Run identifiers and explicit units, which is the whole contract.
    expect(header).toMatch(/^experiment,run,t_days,/);
    expect(header).toMatch(/_au|_kms|_pct|_simunits/);
    expect(lines.some(l => l.includes(',A,'))).toBe(true);
    expect(lines.some(l => l.includes(',B,'))).toBe(true);

    const jsonDownload = page.waitForEvent('download');
    await page.locator('#benchExportJson').click();
    const jsonFile = await jsonDownload;
    const jsonPath = join(OUT, 'experiment.json');
    await jsonFile.saveAs(jsonPath);
    const manifest = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(manifest.format).toBe('gravitas-experiment');
    expect(manifest.provenance.scenario).toBe('Binary BH');
    expect(manifest.provenance.seed).toBeTruthy();
    expect(manifest.provenance.integrator).toBeTruthy();
    expect(manifest.provenance.initialStateHash).toMatch(/^[0-9a-f]{8}$/);
    expect(manifest.provenance.units.length).toBe('AU');
    expect(manifest.selection.metrics.length).toBeGreaterThan(0);
    expect(manifest.parameterChange.variables[0].key).toBe(
      'gravitational_constant'
    );
    // The manifest is a definition, not a data dump.
    expect(JSON.stringify(manifest)).not.toContain('"samples":[');
    expect(manifest.runs[0].samples).toBeGreaterThan(0);

    // Reopen it locally.
    const reopened = await page.evaluate(
      async text => {
        const bench = await import('/js/experiments/bench.js');
        const result = bench.importFrom(text);
        const exp = bench.activeExperiment();
        return { ok: result.ok, name: exp?.name, metrics: exp?.metrics };
      },
      readFileSync(jsonPath, 'utf8')
    );
    expect(reopened.ok).toBe(true);
    expect(reopened.name).toBe('Export check');
    expect(reopened.metrics.length).toBeGreaterThan(0);
  });

  test('saves locally, lists, renames and deletes', async ({ page, app }) => {
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await openBench(page, app);

    await page.locator('#benchName').fill('Keeps between visits');
    await page.locator('#benchCapture').click();
    await page.locator('#benchSave').click();

    const saved = await page.evaluate(async () => {
      const store = await import('/js/experiments/store.js');
      return store.listExperiments().map(e => e.name);
    });
    expect(saved).toContain('Keeps between visits');

    // A duplicate is a new record, not a second pointer to the same one.
    const ids = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const first = bench.activeExperiment().id;
      bench.duplicate('A copy');
      return { first, second: bench.activeExperiment().id };
    });
    expect(ids.second).not.toBe(ids.first);

    const afterDelete = await page.evaluate(async id => {
      const store = await import('/js/experiments/store.js');
      store.deleteExperiment(id);
      return store.listExperiments().map(e => e.id);
    }, ids.first);
    expect(afterDelete).not.toContain(ids.first);
  });

  test('a share link reproduces the setup and the A/B difference', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await openBench(page, app);

    await page.locator('#benchName').fill('Shared setup');
    await page.locator('#benchCapture').click();
    await page.locator('#benchSelection').evaluate(el => (el.open = true));
    await page.locator('.experiment-chip').nth(0).click();
    await page.locator('.experiment-chip').nth(1).click();

    // Give it a parameter change to carry, without needing two full runs.
    const link = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const ui = await import('/js/ui.js');
      const { encodePayload, shareUrl } = await import('/js/shareState.js');
      const exp = bench.activeExperiment();
      exp.diff = {
        variables: [{ key: 'gravitational_constant', from: 1, to: 2 }],
        incidental: [],
        context: [],
        multivariable: false,
      };
      const payload = ui.captureShareState({
        kind: 'seeded',
        includeCamera: false,
        forExperiment: true,
        experiment: bench.linkBlock(),
      });
      return {
        url: shareUrl(await encodePayload(payload)),
        seed: payload.seed,
        metrics: exp.metrics,
      };
    });
    expect(link.url.length).toBeLessThan(8000);

    // Open it as a fresh visitor.
    const fragment = link.url.slice(link.url.indexOf('#'));
    await app.boot({ url: `/${fragment}` });
    await app.dismissFrontDoor();

    await expect(page.locator('#experimentPanel')).toBeVisible({
      timeout: 30_000,
    });
    const adopted = await benchState(page);
    expect(adopted.name).toBe('Shared setup');
    expect(adopted.seed).toBe(link.seed);
    expect(adopted.metrics).toEqual(link.metrics);
    expect(adopted.objects.length).toBe(2);
    expect(adopted.diff.variables[0].key).toBe('gravitational_constant');
    // The link carried a setup, not somebody's results.
    expect(adopted.runs).toEqual([]);
  });

  test('the panel fits a phone screen', async ({ page, app }) => {
    // The bench is a form, not a chart, and a form is the panel most likely to
    // grow out of the window. It joins the instrument stack, which lays out
    // from the bottom, so an unbounded one puts its own controls above the top
    // edge where nothing can reach them.
    await page.setViewportSize({ width: 390, height: 844 });
    await app.loadScenario('Binary BH');
    await app.waitForFrames(5);
    await page.evaluate(async () => {
      const { ensureBench } = await import('/js/experimentsBridge.js');
      const { panel, bench } = await ensureBench();
      panel.openPanel();
      bench.captureExperiment('Phone check');
      panel.render();
    });
    await expect(page.locator('#experimentPanel')).toBeVisible();

    const fits = await page.evaluate(() => {
      const el = document.getElementById('experimentPanel');
      const r = el.getBoundingClientRect();
      return {
        left: r.x,
        right: r.x + r.width,
        top: r.y,
        bottom: r.y + r.height,
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    });
    expect(fits.left).toBeGreaterThanOrEqual(0);
    expect(fits.right).toBeLessThanOrEqual(fits.vw + 1);
    expect(fits.top).toBeGreaterThanOrEqual(0);
    expect(fits.bottom).toBeLessThanOrEqual(fits.vh + 1);
  });

  test('an ordinary share link still opens, with no bench and no errors', async ({
    page,
    app,
  }) => {
    await app.loadScenario('Solar System');
    await app.waitForFrames(5);
    const fragment = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const { encodePayload } = await import('/js/shareState.js');
      return encodePayload(ui.captureShareState({ kind: 'seeded' }));
    });
    await app.boot({ url: `/#${fragment}` });
    await app.dismissFrontDoor();
    await app.waitForBodies(2);
    await expect(page.locator('#experimentPanel')).toHaveCount(0);
  });
});
