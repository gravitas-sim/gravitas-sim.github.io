// =============================================================================
// The RV workspace, reached the way a student reaches it
// -----------------------------------------------------------------------------
// e2e/rvWorkspace.spec.js hands the workspace a recording object directly. That
// is a fine way to test the workspace and a useless way to test getting into
// it, and the gap was not academic: the Analyse button's listener was
// registered inside the Restart button's listener, so Analyse did nothing at
// all until a student pressed Restart, and pressed Restart n times bound n
// copies of the handler. Every unit test passed throughout.
//
// So this file touches nothing but the controls a student can see. Record with
// the panel, press Analyse, drag the sliders, open the export dialog, download
// the file, and check the numbers in it against the residuals in it.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const OUT = join(process.cwd(), 'test-results', 'rv-launch');

/** Open the RV panel on a scenario whose star is free to move. */
async function openRv(page, app) {
  await app.boot();
  await app.loadScenario('Exoplanet Characterization Lab');
  await app.waitForFrames(10);
  await app.openPanel('toggleRadialVelocity', 'rvContainer');
  await expect(page.locator('#rvCanvas')).toBeVisible();
}

/** Switch the synthetic run on, with a schedule. */
async function startSurvey(page, { cadence, baseline, sigma, seed }) {
  await page.locator('#rvSurveyEnabled').check();
  await expect(page.locator('#rvSurveyFields')).toBeVisible();
  await page.locator('#rvSurveyCadence').fill(String(cadence));
  await page.locator('#rvSurveyBaseline').fill(String(baseline));
  await page.locator('#rvSurveySigma').fill(String(sigma));
  await page.locator('#rvSurveySeed').fill(String(seed));
  await page.locator('#rvSurveySeed').blur();
}

/**
 * Let the run collect at least `n` measurements.
 *
 * The wait is in simulated days rather than in wall clock, so the timeout has
 * to be generous enough for the longest schedule here on a machine that is
 * running several browsers at once. It is not a hang detector; the assertion
 * below is.
 */
async function collect(page, app, n, timeout = 30000) {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const rv = await import('/js/radialVelocity.js');
          return rv.radialVelocitySurvey().measurements.length;
        }),
      { timeout }
    )
    .toBeGreaterThanOrEqual(n);
  await app.waitForFrames(2);
}

/** Record a short run and return once there is something to analyse. */
async function record(page, app, opts = {}) {
  const { points = 8, collectTimeout = 30000, ...schedule } = opts;
  await openRv(page, app);
  await startSurvey(page, {
    cadence: 0.05,
    baseline: 0.6,
    sigma: 3,
    seed: 'launch-path',
    ...schedule,
  });
  await collect(page, app, points, collectTimeout);
}

test.describe('reaching the workspace', () => {
  test('Analyse works on the first recording, with no Restart', async ({
    page,
    app,
  }) => {
    await record(page, app);

    // The regression, in one line. Nothing has been restarted; the button is
    // pressed exactly once, the way somebody who has just taken a recording
    // would press it.
    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();

    // And it opened on the run that was showing, not on a blank workspace.
    const used = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      return ws.analysis().used;
    });
    expect(used).toBeGreaterThanOrEqual(8);
  });

  test('the Analyse handler is registered exactly once, however many restarts', async ({
    page,
    app,
  }) => {
    // Counted at the source. Nothing in the DOM API reports how many listeners
    // an element carries, so the tally is installed before the application
    // boots and the application registers into it without knowing.
    await page.addInitScript(() => {
      window.__clickBinds = {};
      const proto = window.EventTarget.prototype;
      const real = proto.addEventListener;
      proto.addEventListener = function (type, fn, opts) {
        if (type === 'click' && this.id) {
          window.__clickBinds[this.id] =
            (window.__clickBinds[this.id] || 0) + 1;
        }
        return real.call(this, type, fn, opts);
      };
    });

    await record(page, app);

    const binds = page =>
      page.evaluate(() => window.__clickBinds.rvAnalyse || 0);

    // One, before anything has been restarted. This was zero: the listener
    // lived inside the Restart handler and had never run.
    expect(await binds(page)).toBe(1);

    for (let i = 0; i < 3; i++) {
      await page.locator('#rvSurveyRestart').click();
      await collect(page, app, 8);
    }

    // Still one. It was four.
    expect(await binds(page)).toBe(1);

    // And it still opens on the run that is showing now.
    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();
    const used = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      return ws.analysis().used;
    });
    expect(used).toBeGreaterThanOrEqual(8);
  });
});

test.describe('the sliders and the file', () => {
  test('every model parameter moves the fit, and the export matches it', async ({
    page,
    app,
  }) => {
    // A full cycle of the 3.5247-day signal rather than the sixth of one the
    // other tests here record. The reason is in the loop below: these
    // assertions are about the sliders moving the reported fit, and a model
    // that cannot be brought near the data has a goodness of fit that barely
    // responds to anything.
    test.setTimeout(180000);
    await record(page, app, {
      cadence: 0.3,
      baseline: 4,
      points: 14,
      collectTimeout: 120000,
    });
    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();

    /** The RMS the panel is currently reporting. */
    const shownRms = async () => {
      const text = await page.locator('#rvFitStats').textContent();
      const m = text.match(/RMS ([\d.]+)/);
      return m ? Number(m[1]) : null;
    };

    // Every one of the four, through its own control. A slider that does not
    // change the reported goodness of fit is a slider whose value is being
    // discarded - which is exactly what happened while the panel scored a
    // refit instead of the model on screen.
    //
    // Each one is tested from the fit the panel's own search finds, restored
    // before every parameter. Starting anywhere else is what made this test
    // intermittent, in two different ways that are the same way: with the
    // model far from the data the residuals are the signal itself and the
    // reported RMS is on a plateau, so a large and perfectly effective move of
    // the period slider changed the quoted figure by less than the digits on
    // screen; and a model snapped to the best fit at a wrong period has an
    // amplitude near zero, where a sine is the same flat line at every phase.
    // From a model that is actually near the data, every move is a move away
    // from it and the RMS has to follow.
    for (const key of ['K', 'period', 'phase', 'gamma']) {
      const slider = page.locator(`#rvFit_${key}`);
      await expect(slider).toBeVisible();

      await page.locator('#rvFitSearch').click();
      await expect.poll(shownRms, { timeout: 20000 }).not.toBeNull();
      const rmsBefore = await shownRms();

      // Moved with the control's own stepper rather than by writing a value.
      // Two earlier attempts got this wrong in different ways: nudging by a
      // fixed number of steps silently clamped near the top of a range, so the
      // slider never moved and the assertion below was testing that nothing
      // had happened; and computing a target arithmetically produced values
      // off the slider's step grid, which the browser refuses outright.
      // stepUp handles the grid and the bounds, and stepping the other way
      // when it is already at the maximum handles the end.
      const before = Number(await slider.inputValue());
      const moved = await slider.evaluate(el => {
        const start = Number(el.value);
        for (let i = 0; i < 25; i++) el.stepUp();
        if (Number(el.value) === start) {
          for (let i = 0; i < 25; i++) el.stepDown();
        }
        return Number(el.value);
      });
      await slider.dispatchEvent('input');

      // The control really did move, so a still RMS below means the value was
      // ignored rather than that the test failed to press anything.
      expect(moved).not.toBe(before);

      // Polled rather than waited on. A fixed pause is a guess about how long
      // the panel takes to redraw, and under parallel load an 80ms guess was
      // wrong often enough to read the previous value and call the slider
      // dead. The poll still fails, by timing out, if the value genuinely
      // does not move.
      await expect
        .poll(shownRms, {
          timeout: 5000,
          intervals: [25],
          message: `${key}: moved ${before} -> ${moved} and the RMS did not follow`,
        })
        .not.toBe(rmsBefore);
      expect(await shownRms(), `${key}: no RMS shown`).not.toBeNull();
    }

    // Now export what is on screen, and check the file against itself.
    const rmsOnScreen = await shownRms();

    await app.railControl('exportDataBtn');
    await page.locator('#exportDataBtn').click();
    const dialog = page.locator('#dataExport');
    await expect(dialog).toBeVisible();

    const row = dialog.locator('[data-export="rvfit"]');
    await expect(row).toBeVisible();

    const download = page.waitForEvent('download');
    await row.locator('button').click();
    const path = join(OUT, 'fit.csv');
    await (await download).saveAs(path);

    const text = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
    const lines = text.trim().split(/\r?\n/);
    const comments = lines.filter(l => l.startsWith('#'));
    const table = lines.filter(l => !l.startsWith('#'));

    // The row was reachable at all, which it was not while rvFitCsv returned a
    // bare string: the dialog read `.rows` off it, found undefined, and wrote
    // no file.
    expect(table.length).toBeGreaterThan(1);

    const header = table[0].split(',');
    const iResidual = header.indexOf('residual_ms');
    const iModel = header.indexOf('model_ms');
    const iRv = header.indexOf('rv_ms');
    expect(iResidual).toBeGreaterThan(-1);

    const residuals = table.slice(1).map(l => {
      const cells = l.split(',');
      return {
        residual: Number(cells[iResidual]),
        model: Number(cells[iModel]),
        rv: Number(cells[iRv]),
      };
    });

    // Each residual is the observation minus the model in the same row.
    for (const r of residuals) {
      expect(r.residual).toBeCloseTo(r.rv - r.model, 4);
    }

    // And the RMS in the header is the RMS of those residuals - computed here
    // from the file rather than read out of it, so that a header claiming one
    // model while the rows describe another cannot pass.
    const fromFile = Math.sqrt(
      residuals.reduce((a, r) => a + r.residual * r.residual, 0) /
        residuals.length
    );
    const stated = Number(
      comments.find(c => c.startsWith('# residual_rms_ms:')).split(':')[1]
    );
    expect(stated).toBeCloseTo(fromFile, 3);

    // The number on screen is the number in the file. These disagreed while
    // the panel scored a refit and the residuals came from the trial.
    expect(rmsOnScreen).toBeCloseTo(fromFile, 1);

    // The convention behind any chi-square travels with it.
    expect(text).toMatch(/# degrees_of_freedom:/);
    expect(text).toMatch(/# parameters_estimated_from_data:/);
  });
});

test.describe('recordings that are not clean', () => {
  test('the first epoch carries noise like every other', async ({
    page,
    app,
  }) => {
    await record(page, app, { sigma: 20, seed: 'first-epoch' });

    const first = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      const m = rv.radialVelocitySurvey().measurements.filter(x => !x.missed);
      return m.slice(0, 6).map(x => ({ rv: x.rv, truth: x.truth }));
    });

    expect(first.length).toBeGreaterThan(2);
    // It used to be recorded raw, so this difference was exactly zero while
    // every later epoch scattered by ~20 m/s. One point sitting perfectly on
    // the truth is a hint no real observer gets.
    expect(Math.abs(first[0].rv - first[0].truth)).toBeGreaterThan(1e-6);
  });

  test('degraded readings are held out of the fit and the count is shown', async ({
    page,
    app,
  }) => {
    await record(page, app);
    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();

    const shown = await page.evaluate(async () => {
      const ws = await import('/js/rvWorkspace.js');
      const a = ws.analysis();
      return {
        used: a.used,
        degraded: a.excluded.degraded,
        status: document.getElementById('rvFitStatus').textContent,
      };
    });

    // Whatever the run produced, the panel's own count and the analysis agree,
    // and any held-out readings are disclosed rather than quietly missing.
    expect(shown.status).toMatch(new RegExp(`${shown.used}`));
    if (shown.degraded > 0) {
      expect(shown.status).toMatch(/interpolated|interpolad/i);
    }
  });

  test('a recording that cannot be fitted says so instead of throwing', async ({
    page,
    app,
  }) => {
    await record(page, app);
    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();

    // Two points at the same instant: the normal equations are singular and
    // there is no fit to be had. The panel must survive being asked.
    const out = await page.evaluate(async () => {
      const bridge = await import('/js/rvWorkspaceBridge.js');
      await bridge.openRvWorkspace({
        points: [
          { day: 1, rv: 10, sigma: 1, quality: 'ok', missed: false },
          { day: 1, rv: 12, sigma: 1, quality: 'ok', missed: false },
          { day: 1, rv: 11, sigma: 1, quality: 'ok', missed: false },
        ],
        target: 'singular',
        config: {},
      });
      const ws = await import('/js/rvWorkspace.js');
      ws.snapToBestAtPeriod();
      const a = ws.analysis();
      return {
        finitePeriod: Number.isFinite(ws.trialParameters().period),
        scored: a.tooFew ? 'tooFew' : a.atTrial === null ? 'null' : 'scored',
      };
    });

    expect(out.finitePeriod).toBe(true);
    expect(['tooFew', 'null', 'scored']).toContain(out.scored);
    await expect(page.locator('#rvFitContainer')).toBeVisible();
    // The fixture fails this test on any console error or uncaught exception,
    // so surviving to here is the assertion.
  });
});

test.describe('what a saved fit remembers about the run', () => {
  test('the entry carries the conditions the samples were taken under', async ({
    page,
    app,
  }) => {
    // The whole chain, in the order a student walks it: the sampler records,
    // the workspace analyses, the notebook keeps it. The gap this covers is
    // the one where the workspace dropped the acquisition metadata and the
    // notebook filled it back in from whatever world was on screen - so a
    // recording taken at one geometry was written down at another.
    test.setTimeout(180000);
    await record(page, app, { cadence: 0.2, baseline: 1.6, points: 8 });

    // What the run was actually taken under, read from the sampler itself.
    const taken = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      const run = rv.radialVelocitySurvey();
      return {
        inclinationDeg: run.inclinationDeg,
        positionAngleDeg: run.positionAngleDeg,
        integrator: run.provenance?.numerical?.integrator ?? null,
        maxTimestep: run.provenance?.numerical?.maxTimestep ?? null,
      };
    });
    expect(taken.integrator).toBeTruthy();

    await page.locator('#rvAnalyse').click();
    await expect(page.locator('#rvFitContainer')).toBeVisible();
    await page.locator('#rvFitSearch').click();

    // The world moves on, exactly as it does when a student goes and looks at
    // something else before saving.
    await page.evaluate(async () => {
      const observer = await import('/js/observerControls.js');
      const { SETTINGS } = await import('/js/appState.js');
      SETTINGS.integrator = 'yoshida';
      SETTINGS.max_timestep = 4;
      observer.setObserverGeometry?.({
        inclinationDeg: 20,
        positionAngleDeg: 170,
      });
    });

    // The draft has to be saved, not merely opened.
    await page.locator('#rvFitNotebook').click();
    await expect(page.locator('#nbDraftClaim')).toBeVisible();
    await page
      .locator('#nbDraftClaim')
      .fill('The period is what this schedule could see.');
    await page.locator('#nbDraftSave').click();
    await expect(page.locator('.nb-entry')).toHaveCount(1);

    const entry = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const all = panel.notebookEntries();
      return all.length ? all[all.length - 1] : null;
    });
    expect(entry).not.toBe(null);
    const p = entry.snapshot.provenance;

    // The geometry the star was watched from, not the one on screen now.
    expect(p.observer.inclinationDeg).toBeCloseTo(taken.inclinationDeg, 6);
    expect(p.observer.positionAngleDeg).toBeCloseTo(taken.positionAngleDeg, 6);
    // The integrator the samples were produced under, not the one just set.
    expect(p.numerical.integrator).toBe(taken.integrator);
    expect(p.numerical.integrator).not.toBe('yoshida');
    expect(p.numerical.maxTimestep).toBe(taken.maxTimestep);
    // And when the observations happened, in their own units.
    expect(p.observedEpochs.unit).toBe('days');
    expect(p.observedEpochs.count).toBeGreaterThanOrEqual(8);
    expect(p.simTimeUnits).toBe(null);
  });
});
