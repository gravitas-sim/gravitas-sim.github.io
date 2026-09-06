// =============================================================================
// The radial velocity analysis workspace
// -----------------------------------------------------------------------------
// The arithmetic is proved in tests/rvFit.test.js and the state machine in
// tests/rvWorkspace.test.js. What only a browser can show is that the chunk
// really is deferred, that the panel is reachable from a recording, and that
// the truth stays hidden until somebody presses the button.
// =============================================================================

import { test, expect } from './fixtures.js';

/** A recording in the shape the RV panel hands over. */
const RECORDING = {
  points: Array.from({ length: 24 }, (_, i) => {
    const day = i * 0.37;
    return {
      day,
      rv: 5 + 45 * Math.sin((2 * Math.PI * day) / 3.2),
      sigma: 2,
      quality: 'ok',
      missed: false,
      truth: 5 + 45 * Math.sin((2 * Math.PI * day) / 3.2),
    };
  }),
  target: 'HD 209458',
  scenario: 'Exoplanet Characterization Lab',
  seed: 'e2e',
  config: { cadenceDays: 0.37, baselineDays: 8.5, sigma: 2 },
  worldGeneration: 3,
  recordedAt: '2026-09-05T00:00:00Z',
  truth: { period: 3.2, K: 45, gamma: 5, note: 'from the simulated orbit' },
};

test.describe('the workspace', () => {
  test('is not in the start-up path', async ({ page, app }) => {
    await app.boot();
    // The bridge is the only thing the application loads eagerly, and it does
    // not pull the workspace in until asked.
    const loaded = await page.evaluate(async () => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      return bridge.rvWorkspaceLoaded();
    });
    expect(loaded).toBe(false);
  });

  test('opens on a recording and fits it', async ({ page, app }) => {
    await app.boot();
    const out = await page.evaluate(async rec => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace(rec);
      const ws = await import('/js/rvWorkspace.js');
      const before = ws.trialParameters();
      const search = ws.runSearch({ minPeriod: 1.5, maxPeriod: 9 });
      const a = ws.analysis();
      return {
        loaded: bridge.rvWorkspaceLoaded(),
        openingPeriod: before.period,
        bestPeriod: search.bestPeriod,
        bestK: search.best.K,
        gridPoints: search.grid.length,
        minima: search.minima.length,
        used: a.used,
        revealed: a.revealed,
        truthInPayload: JSON.stringify(a).includes('simulated orbit'),
      };
    }, RECORDING);

    expect(out.loaded).toBe(true);
    // It did not start from the answer.
    expect(Math.abs(out.openingPeriod - 3.2)).toBeGreaterThan(0.1);
    // And it found it.
    expect(out.bestPeriod).toBeCloseTo(3.2, 1);
    expect(out.bestK).toBeCloseTo(45, 0);
    expect(out.gridPoints).toBeGreaterThan(100);
    expect(out.minima).toBeGreaterThan(0);
    expect(out.used).toBe(24);
    // The truth is present in the recording and absent from the analysis.
    expect(out.revealed).toBe(false);
    expect(out.truthInPayload).toBe(false);
  });

  test('the panel renders, in both languages, with every string resolved', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async rec => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace(rec);
      const ws = await import('/js/rvWorkspace.js');
      ws.runSearch({ minPeriod: 1.5, maxPeriod: 9 });
      const panel = await import('/js/rvWorkspacePanel.js');
      panel.setRvWorkspaceEnabled(false);
      panel.setRvWorkspaceEnabled(true);
    }, RECORDING);

    await expect(page.locator('#rvFitContainer')).toBeVisible();
    for (const locale of ['en', 'es']) {
      await page.evaluate(async l => {
        const i18n = await import('/js/i18n/index.js');
        await i18n.setLocale(l);
        const panel = await import('/js/rvWorkspacePanel.js');
        panel.setRvWorkspaceEnabled(false);
        panel.setRvWorkspaceEnabled(true);
      }, locale);
      const text = await page.locator('#rvFitContainer').innerText();
      expect(text).not.toMatch(/rvfit\./);
    }
  });

  test('the truth appears only when the button is pressed', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async rec => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace(rec);
      const panel = await import('/js/rvWorkspacePanel.js');
      panel.setRvWorkspaceEnabled(true);
    }, RECORDING);

    await expect(page.locator('#rvFitTruth')).toHaveText('');
    await page.locator('#rvFitReveal').click();
    const revealed = await page.locator('#rvFitTruth').innerText();
    expect(revealed).toMatch(/3\.2/);
    // And the export records that it was looked at.
    const report = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      return ws.exportReport();
    });
    expect(report.truthRevealed).toBe(true);
    expect(report.recording.target).toBe('HD 209458');
    expect(report.recording.seed).toBe('e2e');
    expect(report.residuals).toHaveLength(24);
    expect(report.assumptions.join(' ')).toMatch(/circular/i);
  });

  test('nothing anywhere in the panel claims a detection', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async rec => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace(rec);
      const ws = await import('/js/rvWorkspace.js');
      ws.runSearch({ minPeriod: 1.5, maxPeriod: 9 });
      const panel = await import('/js/rvWorkspacePanel.js');
      panel.setRvWorkspaceEnabled(true);
    }, RECORDING);
    const text = (
      await page.locator('#rvFitContainer').innerText()
    ).toLowerCase();
    expect(text).not.toMatch(/\bdetected\b/);
    expect(text).not.toMatch(/significan/);
    expect(text).not.toMatch(/confidence/);
  });
});
