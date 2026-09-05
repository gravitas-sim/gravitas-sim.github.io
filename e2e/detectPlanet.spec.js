// =============================================================================
// Can you detect this planet?
// -----------------------------------------------------------------------------
// The lesson and the machinery under it. Two things are worth driving a browser
// for, and neither can be seen from a unit test:
//
//   the synthetic observing run against the *live* simulation, where the
//   measurements have to be scheduled on the simulation clock rather than on
//   the frame rate, and the panel has to stop at the end of the baseline
//
//   the export, which has to carry the uncertainty and the schedule out of the
//   browser in a file a student can open
//
// The arithmetic of the two schedules is pinned in tests/rvSurvey.test.js and
// tests/exoplanetWidgets.test.js, where it belongs; this file is about whether
// the parts are wired together.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const OUT = join(process.cwd(), 'test-results', 'detect-planet');
const LESSON = 'detect-this-planet';

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
  // The seed field's change event is what restarts the run on the new schedule.
  await page.locator('#rvSurveySeed').blur();
}

/** Whatever the panel's run currently holds. */
const runState = page =>
  page.evaluate(async () => {
    const rv = await import('/js/radialVelocity.js');
    const s = rv.radialVelocitySurvey();
    return {
      running: s.running,
      planned: s.planned,
      count: s.measurements.length,
      days: s.measurements.map(m => m.day),
      sigmas: s.measurements.map(m => m.sigma),
      target: s.target,
      config: s.config,
    };
  });

test.describe('the synthetic observing run', () => {
  test('is off until it is asked for', async ({ page, app }) => {
    await openRv(page, app);
    await expect(page.locator('#rvSurveyEnabled')).not.toBeChecked();
    await expect(page.locator('#rvSurveyFields')).toBeHidden();
    expect((await runState(page)).running).toBe(false);
  });

  test('takes the measurements its schedule asks for and then stops', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    // A short schedule so the test does not wait out a whole programme: six
    // measurements across most of one orbit.
    await startSurvey(page, {
      cadence: 0.5,
      baseline: 2.5,
      sigma: 8,
      seed: 'e2e',
    });

    expect((await runState(page)).planned).toBe(6);

    await expect
      .poll(async () => (await runState(page)).count, { timeout: 60_000 })
      .toBe(6);

    const s = await runState(page);
    // Scheduled in simulated days, on the cadence, and nowhere in between.
    s.days.forEach((d, i) => expect(d - s.days[0]).toBeCloseTo(i * 0.5, 6));
    expect(s.sigmas.every(v => v === 8)).toBe(true);
    expect(s.target?.name).toBeTruthy();

    // Past the end it adds nothing, however long it runs.
    await app.waitForFrames(120);
    expect((await runState(page)).count).toBe(6);
  });

  test('the panel reports progress and stops claiming anything else', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await startSurvey(page, {
      cadence: 0.4,
      baseline: 1.2,
      sigma: 5,
      seed: 'e2e',
    });

    const status = page.locator('#rvSurveyStatus');
    await expect(status).toBeVisible();
    await expect(status).toContainText(/of 4 measurements/i);
    await expect(status).toContainText(/finished/i, { timeout: 60_000 });
    // No verdict. Deciding whether this is a planet is the reader's job.
    await expect(status).not.toContainText(/detect/i);
  });

  test('the ideal signal is drawn behind the data and labelled as not data', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await startSurvey(page, {
      cadence: 0.4,
      baseline: 1.2,
      sigma: 5,
      seed: 'e2e',
    });

    const labels = () =>
      page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        void rv;
        const canvas = document.getElementById('rvCanvas');
        const chart = window.Chart?.getChart?.(canvas);
        return chart
          ? chart.data.datasets.map(d => ({
              label: d.label,
              hidden: Boolean(d.hidden),
              dashed: (d.borderDash || []).length > 0,
            }))
          : null;
      });

    await expect.poll(labels, { timeout: 20_000 }).not.toBeNull();
    const before = await labels();
    const ideal = before.find(d => /teaching overlay/i.test(d.label || ''));
    expect(ideal).toBeTruthy();
    expect(ideal.dashed).toBe(true);
    expect(ideal.hidden).toBe(false);
    expect(before.some(d => /measurements/i.test(d.label || ''))).toBe(true);

    // And it can be taken away, which is what a real observer has.
    await page.locator('#rvSurveyIdeal').uncheck();
    await expect
      .poll(
        async () =>
          (await labels()).find(d => /teaching overlay/i.test(d.label || ''))
            ?.hidden
      )
      .toBe(true);
  });

  test('changing the schedule starts a new run rather than mixing two', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await startSurvey(page, {
      cadence: 0.3,
      baseline: 3,
      sigma: 8,
      seed: 'e2e',
    });
    await expect
      .poll(async () => (await runState(page)).count, { timeout: 60_000 })
      .toBeGreaterThan(2);

    await page.locator('#rvSurveyCadence').fill('1.5');
    await page.locator('#rvSurveyCadence').blur();

    const after = await runState(page);
    expect(after.config.cadenceDays).toBe(1.5);
    // Measurements taken under the old schedule are not part of the new one.
    expect(after.count).toBeLessThanOrEqual(1);
  });

  test('the measurements do not depend on the frame rate', async ({
    page,
    app,
  }) => {
    // The claim the whole design rests on. Run the same seeded schedule twice
    // against the same seeded world at two simulation speeds, and the twelve
    // numbers have to agree.
    const collect = async speed => {
      await openRv(page, app);
      await page.evaluate(async s => {
        const { SETTINGS } = await import('/js/appState.js');
        SETTINGS.sim_speed = s;
      }, speed);
      await startSurvey(page, {
        cadence: 0.4,
        baseline: 2,
        sigma: 6,
        seed: 'framerate',
      });
      await expect
        .poll(async () => (await runState(page)).count, { timeout: 90_000 })
        .toBe(6);
      return page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        return rv
          .radialVelocitySurvey()
          .measurements.map(m => ({ day: m.day, noise: m.rv - m.truth }));
      });
    };

    const slow = await collect(1);
    const fast = await collect(3);

    expect(fast).toHaveLength(slow.length);
    fast.forEach((m, i) => {
      // The epoch is the schedule's, and the noise belongs to the epoch.
      expect(m.day - fast[0].day).toBeCloseTo(slow[i].day - slow[0].day, 6);
      expect(m.noise).toBeCloseTo(slow[i].noise, 6);
    });
  });
});

test.describe('the export', () => {
  test('carries the measurements, the uncertainty and the schedule', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await startSurvey(page, {
      cadence: 0.4,
      baseline: 1.2,
      sigma: 7.5,
      seed: 'export-test',
    });
    await expect
      .poll(async () => (await runState(page)).count, { timeout: 60_000 })
      .toBe(4);

    await app.railControl('exportDataBtn');
    await page.locator('#exportDataBtn').click();
    const dialog = page.locator('#dataExport');
    await expect(dialog).toBeVisible();

    const row = dialog.locator('[data-export="radialvelocity"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText(/4 measurements/);

    const download = page.waitForEvent('download');
    await row.locator('button').click();
    const file = await download;
    const path = join(OUT, 'rv.csv');
    await file.saveAs(path);

    const text = await readFile(path, 'utf8');
    const lines = text
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/);
    expect(lines[0].split(',')).toEqual([
      't_days',
      'rv_ms',
      'rv_err_ms',
      'target',
      'target_id',
      'inclination_deg',
      'cadence_days',
      'baseline_days',
      'sigma_ms',
      'noise_seed',
    ]);
    // One row per measurement and nothing between them.
    expect(lines).toHaveLength(5);
    for (const line of lines.slice(1)) {
      const cells = line.split(',');
      expect(Number(cells[2])).toBe(7.5);
      expect(cells[6]).toBe('0.4');
      expect(cells[9]).toBe('export-test');
    }
  });

  test('is not offered when there is no run', async ({ page, app }) => {
    // The continuous curve is not a set of measurements, and exporting it as
    // one would teach the opposite of what the observing mode is for.
    await openRv(page, app);
    await app.railControl('exportDataBtn');
    await page.locator('#exportDataBtn').click();
    const row = page.locator('#dataExport [data-export="radialvelocity"]');
    await expect(row).toContainText(/No observing run/i);
    await expect(row.locator('button')).toBeDisabled();
  });
});

test.describe('the lesson', () => {
  test('opens, and its instrument draws both schedules', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator(`[data-investigation="${LESSON}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('15-20 min');
    await card.click();

    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('.inv-step-title')).toContainText('Twelve');

    // Step 3 is the planner. Walk to it through the interface.
    for (let i = 0; i < 2; i++) {
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const next = page.locator('#investigationNext');
      await expect(next).toBeEnabled({ timeout: 15_000 });
      await next.click();
    }

    await expect(page.locator('.inv-step-title')).toContainText('Schedule A');
    await expect(page.locator('#investigationToolCanvas')).toBeVisible();

    // The readout says what was observed, and says what it does not mean.
    const body = page.locator('#investigationToolReadout');
    await expect(body).toContainText(/Phase coverage/i);
    await expect(body).toContainText(/10\s*\/\s*10/);
    await expect(body).toContainText(/does not identify a planet/i);

    // Switching to Schedule B collapses the coverage.
    // The instrument is a sibling of the step panel, not inside it.
    await page
      .locator('#investigationToolPresets')
      .getByRole('button', { name: /one cycle apart/i })
      .click();
    await expect(body).toContainText(/2\s*\/\s*10/);
  });
});
