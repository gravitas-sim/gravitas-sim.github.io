// =============================================================================
// The RV workspace's uncertainty analysis, through the panel
// -----------------------------------------------------------------------------
// tests/rvUncertainty.test.js covers the arithmetic against fixed inputs. This
// file covers the things a unit test cannot: that the button runs it, that the
// panel prints an interval when there is one and refuses to print one when
// there is not, that cancelling works, that the seed shown is the seed used,
// and that the export carries the block needed to reproduce the numbers.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Put a recording into the workspace and search it.
 *
 * Synthetic points, so each test picks the sampling it needs - well-sampled or
 * sparse - rather than waiting for a live survey to produce one. Getting a
 * real recording into the workspace is e2e/rvLaunchPath.spec.js's job.
 */
async function analyse(page, { days, period, K, sigma, bounds, seed = 'd' }) {
  await page.evaluate(
    async ([schedule, truth, noise, range, noiseSeed]) => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      const { gaussianStream } = await import('/js/rvUncertainty.js');
      const g = gaussianStream(noiseSeed);
      const points = schedule.map(day => ({
        day,
        rv:
          truth.gamma +
          truth.K * Math.sin((2 * Math.PI * day) / truth.period + truth.phase) +
          noise * g(),
        sigma: noise,
        quality: 'ok',
        missed: false,
      }));
      await bridge.openRvWorkspace({
        points,
        target: 'Star A',
        scenario: 'Exoplanet Characterization Lab',
        seed: 'rec-1',
        config: { sigma: noise },
        worldGeneration: 1,
      });
      const ws = await import('/js/rvWorkspace.js');
      ws.runSearch(range);
    },
    [days, { period, K, gamma: -3, phase: 1.1 }, sigma, bounds, seed]
  );
  await expect(page.locator('#rvFitContainer')).toBeVisible();
  await page.locator('#rvMcSection > summary').click();
}

const evenly = (n, step) => Array.from({ length: n }, (_, i) => i * step);

/** Wait for a run to finish and hand back the report the panel is holding. */
async function report(page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const panel = await import('/js/rvWorkspacePanel.js');
          return panel.isUncertaintyRunning();
        }),
      { timeout: 60_000 }
    )
    .toBe(false);
  return page.evaluate(async () => {
    const panel = await import('/js/rvWorkspacePanel.js');
    return panel.uncertaintyReport();
  });
}

test.describe('a well-sampled run', () => {
  test('the button runs it and the panel prints one interval', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(40, 0.37),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });

    await page.locator('#rvMcTrials').fill('120');
    await page.locator('#rvMcSeed').fill('panel-1');
    await page.locator('#rvMcRun').click();
    // The progress line is a live region, so a screen reader hears the run.
    await expect(page.locator('#rvMcStatus')).toHaveAttribute(
      'aria-live',
      'polite'
    );

    const r = await report(page);
    expect(r.ok).toBe(true);
    expect(r.families).toHaveLength(1);
    expect(r.succeeded).toBe(120);
    expect(r.spec.seed).toBe('panel-1');

    // One interval on screen, and the truth inside it.
    await expect(page.locator('.rvfit-mc-interval')).toBeVisible();
    expect(r.period.p16).toBeLessThan(3.5);
    expect(r.period.p84).toBeGreaterThan(3.5);
    // No family table, because there is one family.
    await expect(page.locator('.rvfit-mc-table')).toHaveCount(0);

    // The assumptions and the guidance are on screen with the number, not
    // behind a link.
    await expect(page.locator('.rvfit-mc-assume li')).toHaveCount(
      r.assumptions.length
    );
    await expect(page.locator('.rvfit-mc-guidance h4')).toBeVisible();
    const guidance = await page.locator('.rvfit-mc-guidance').innerText();
    expect(guidance.toLowerCase()).toContain('precision');
  });

  test('the same seed gives the same interval twice', async ({ page, app }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(30, 0.4),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    await page.locator('#rvMcTrials').fill('80');
    await page.locator('#rvMcSeed').fill('same');
    await page.locator('#rvMcRun').click();
    const first = await report(page);
    await page.locator('#rvMcRun').click();
    const second = await report(page);
    expect(second.period).toEqual(first.period);
    expect(second.families).toEqual(first.families);

    // And a different seed moves it, so the first result was not a constant.
    await page.locator('#rvMcSeed').fill('different');
    await page.locator('#rvMcRun').click();
    const third = await report(page);
    expect(third.period.median).not.toBe(first.period.median);
  });
});

test.describe('a sparse run', () => {
  test('the aliases get a table and no single interval', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: [0, 1, 2, 3, 4, 12, 13, 14, 15],
      period: 1.31,
      K: 35,
      sigma: 6,
      bounds: { minPeriod: 0.5, maxPeriod: 5 },
      seed: 'sparse',
    });
    await page.locator('#rvMcTrials').fill('150');
    await page.locator('#rvMcSeed').fill('alias');
    await page.locator('#rvMcRun').click();

    const r = await report(page);
    expect(r.multimodal).toBe(true);
    expect(r.period).toBe(null);

    // The refusal is structural: there is no interval element to render.
    await expect(page.locator('.rvfit-mc-interval')).toHaveCount(0);
    await expect(page.locator('.rvfit-mc-multimodal')).toBeVisible();
    const table = page.locator('.rvfit-mc-table tbody tr');
    expect(await table.count()).toBeGreaterThan(1);
    // Every row carries its share and its own interval, in numbers.
    const firstRow = await table.first().innerText();
    expect(firstRow).toMatch(/%/);
    expect(firstRow).toMatch(/\d/);
  });
});

test.describe('what it refuses', () => {
  test('a run with no stated uncertainties is refused by name', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(20, 0.5),
      period: 3.5,
      K: 40,
      sigma: 0,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    await page.locator('#rvMcTrials').fill('60');
    await page.locator('#rvMcRun').click();

    const r = await report(page);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('noUncertainties');
    await expect(page.locator('.rvfit-mc-refused')).toBeVisible();
    const said = await page.locator('.rvfit-mc-refused').innerText();
    // Says what to do, not just that it failed.
    expect(said.toLowerCase()).toContain('uncertaint');
    await expect(page.locator('.rvfit-mc-interval')).toHaveCount(0);
  });

  test('the run button is disabled until there is a fit to resample', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace({ points: [], target: 'none', config: {} });
    });
    await expect(page.locator('#rvFitContainer')).toBeVisible();
    await page.locator('#rvMcSection > summary').click();
    await expect(page.locator('#rvMcRun')).toBeDisabled();
  });
});

test.describe('cancellation and invalidation', () => {
  test('cancelling stops it and reports what did run', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(40, 0.37),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    await page.locator('#rvMcTrials').fill('2000');
    await page.locator('#rvMcRun').click();
    await expect(page.locator('#rvMcCancel')).toBeVisible();
    // Let a few batches through so there is something to report.
    await expect(page.locator('#rvMcStatus')).toContainText('2000');
    await page.locator('#rvMcCancel').click();

    const r = await report(page);
    expect(r.cancelled).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.completed).toBeLessThan(2000);
    expect(r.completed).toBeGreaterThan(0);
    await expect(page.locator('.rvfit-mc-warn').first()).toBeVisible();
    // And the panel is usable again rather than stuck mid-run.
    await expect(page.locator('#rvMcCancel')).toBeHidden();
    await expect(page.locator('#rvMcRun')).toBeEnabled();
  });

  test('a new recording drops the old interval rather than keeping it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(30, 0.4),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    await page.locator('#rvMcTrials').fill('60');
    await page.locator('#rvMcRun').click();
    expect((await report(page)).ok).toBe(true);

    // A different observing run. An interval computed from the old points
    // must not survive to be exported beside the new ones.
    await analyse(page, {
      days: evenly(12, 1.0),
      period: 2.2,
      K: 20,
      sigma: 5,
      bounds: { minPeriod: 1, maxPeriod: 8 },
      seed: 'other',
    });
    expect(await report(page)).toBe(null);
    await expect(page.locator('.rvfit-mc-interval')).toHaveCount(0);
  });
});

test.describe('the export', () => {
  test('carries the block that reproduces the interval', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(30, 0.4),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    await page.locator('#rvMcTrials').fill('80');
    await page.locator('#rvMcSeed').fill('export-seed');
    await page.locator('#rvMcRun').click();
    const r = await report(page);

    const exported = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      return ws.exportReport();
    });
    expect(exported.uncertainty).not.toBe(null);
    expect(exported.uncertainty.spec).toMatchObject({
      seed: 'export-seed',
      trials: 80,
      model: 'circular-single',
      errors: 'independentGaussian',
      resampledAbout: 'studentFit',
    });
    expect(exported.uncertainty.period).toEqual(r.period);
    expect(exported.uncertainty.assumptions).toEqual(r.assumptions);
    // The one thing an interval must never have used.
    expect(JSON.stringify(exported.uncertainty)).not.toMatch(/truth/i);
  });

  test('an export with no analysis run says so rather than omitting it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(20, 0.5),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });
    const exported = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      return ws.exportReport();
    });
    expect('uncertainty' in exported).toBe(true);
    expect(exported.uncertainty).toBe(null);
  });
});

test.describe('everyone can use it', () => {
  test('it is translated and keyboard-operable', async ({ page, app }) => {
    await app.boot();
    await analyse(page, {
      days: evenly(24, 0.45),
      period: 3.5,
      K: 40,
      sigma: 4,
      bounds: { minPeriod: 1, maxPeriod: 10 },
    });

    // Reached and run from the keyboard alone. The trial count is set with
    // fill: how a number input handles select-all is the browser's business,
    // and the accessibility claim being tested is that the control can be
    // reached and pressed without a pointer.
    await page.locator('#rvMcTrials').fill('60');
    await page.locator('#rvMcRun').focus();
    await expect(page.locator('#rvMcRun')).toBeFocused();
    await page.keyboard.press('Enter');
    expect((await report(page)).ok).toBe(true);

    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    const leaked = await page.evaluate(() => {
      const el = document.getElementById('rvMcSection');
      return (el.innerText.match(/\brvfit\.mc\.[a-zA-Z.]+/g) || []).slice(0, 5);
    });
    expect(leaked).toEqual([]);
    await expect(page.locator('#rvMcRun')).toContainText('Ejecutar');
    const guidance = await page.locator('.rvfit-mc-guidance').innerText();
    expect(guidance.toLowerCase()).toContain('precisión');
  });
});
