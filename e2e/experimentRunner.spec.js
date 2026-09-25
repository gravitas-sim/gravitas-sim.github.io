// =============================================================================
// The experiment runner, with real Workers
// -----------------------------------------------------------------------------
// tests/experimentScheduler.test.js stages every way a realm can misbehave
// with fake Workers, and tests/experimentTrial.test.js runs the trial in a
// clean Node realm. This is the thing itself: /experiments/ in a browser,
// starting real module Workers (js/experiments/experimentWorker.js) - one per
// trial, each terminated when it answers - against the published sources and
// against dist/, where the Worker is its own bundle.
//
// The defaults are the bench's binary sweep, short: eight orbit sizes, two
// seeds, 10,000 time units - sixteen trials that finish in a second or two.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openRunner(page, { cores } = {}) {
  if (cores) {
    await page.addInitScript(n => {
      Object.defineProperty(window.navigator, 'hardwareConcurrency', {
        get: () => n,
      });
    }, cores);
  }
  await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
  // Priced: one trial has been built in a realm and the whole estimated.
  await expect(page.locator('#xpEstimate')).toContainText(
    /trials of \d+ bodies/,
    { timeout: 30_000 }
  );
}

/** Every trial row's text, without the wall-clock column. */
const rows = page =>
  page.locator('#xpTrialsBody tr').evaluateAll(trs =>
    trs.map(tr =>
      [...tr.children]
        .slice(0, 6)
        .map(c => c.textContent)
        .join('|')
    )
  );

test.describe('the experiment runner', () => {
  test('runs every trial in its own Worker, and reports them in order', async ({
    page,
  }) => {
    const workers = [];
    page.on('worker', w => {
      const entry = { url: w.url(), closed: false };
      w.on('close', () => (entry.closed = true));
      workers.push(entry);
    });
    await openRunner(page);
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText(
      'Finished: 16 of 16',
      { timeout: 60_000 }
    );

    const table = await rows(page);
    expect(table).toHaveLength(16);
    expect(table.map(r => r.split('|')[0])).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i + 1))
    );
    expect(table.every(r => r.split('|')[3] === 'measured')).toBe(true);
    // One realm to price the experiment and one per trial, every one of them
    // gone by the time the result is on screen.
    await expect
      .poll(
        () => workers.filter(w => /experimentWorker\.js/.test(w.url)).length
      )
      .toBe(17);
    await expect
      .poll(() => workers.every(w => w.closed), { timeout: 10_000 })
      .toBe(true);

    // The binary sheds its planet past about 0.3 separations: the summary
    // shows a bound orbit of a few AU at the small end and hundreds at the
    // large end, and the plot switched to a log axis to show both.
    const means = await page
      .locator('#xpSummaryBody tr td:nth-child(2)')
      .allTextContents();
    expect(Number(means[0])).toBeLessThan(1);
    expect(Number(means.at(-1))).toBeGreaterThan(100);
    await expect(page.locator('#xpPlot')).toContainText('(log scale)');
    await expect(page.locator('#xpPlot')).toHaveAttribute(
      'aria-label',
      /16 trials with a measurement, 0 without/
    );
  });

  test('gives the same numbers every time it runs', async ({ page }) => {
    await openRunner(page);
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText('Finished', {
      timeout: 60_000,
    });
    const first = await rows(page);
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText('Finished', {
      timeout: 60_000,
    });
    expect(await rows(page)).toEqual(first);
  });

  test('can be canceled, keeps what finished, and resumes the rest', async ({
    page,
  }) => {
    await openRunner(page);
    await page.locator('#xpCount').fill('20');
    await page.locator('#xpSeeds').fill('5');
    await page.locator('#xpDuration').fill('40000');
    await expect(page.locator('#xpEstimate')).toContainText('100 trials', {
      timeout: 30_000,
    });
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText(
      /[1-9]\d* of 100 trials finished/,
      { timeout: 60_000 }
    );
    await page.locator('#xpCancel').click();
    await expect(page.locator('#xpStatus')).toContainText('Canceled', {
      timeout: 10_000,
    });
    const done = await page
      .locator('#xpTrialsBody tr')
      .evaluateAll(
        trs =>
          trs.filter(tr => tr.children[3].textContent === 'measured').length
      );
    expect(done).toBeGreaterThan(0);
    expect(done).toBeLessThan(100);
    await expect(page.locator('#xpResume')).toBeVisible();
    await expect(page.locator('#xpResume')).toContainText(
      `(${done} of 100 done)`
    );
    await page.locator('#xpResume').click();
    await expect(page.locator('#xpStatus')).toContainText(
      'Finished: 100 of 100',
      { timeout: 120_000 }
    );
    await expect(page.locator('#xpResume')).toBeHidden();
  });

  test('refuses on a small device what would freeze it, and says why', async ({
    page,
  }) => {
    await openRunner(page, { cores: 2 });
    await expect(page.locator('#xpDevice')).toContainText('low-end');
    await page.locator('#xpCount').fill('20');
    await page.locator('#xpSeeds').fill('20');
    await expect(page.locator('#xpRefusals')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#xpRefusals')).toContainText(
      '400 trials is more than this device runs in one experiment (at most 120)'
    );
    await expect(page.locator('#xpRun')).toBeDisabled();
  });

  test('prices on this device, and refuses trials that would all stop at the sample cap', async ({
    page,
  }) => {
    // A desktop, whatever runs the test: the cap, and so the length that
    // fits, is the profile's. A four-core CI runner is a low-end device, where
    // the cap is 4,000 samples and the length 999 units.
    await openRunner(page, { cores: 8 });
    await expect(page.locator('#xpDevice')).toContainText('desktop');
    // Timed in the planning realm, not guessed from a figure per device.
    await expect(page.locator('#xpEstimate')).toContainText(
      'timed on this device'
    );
    // The heliocentric assist advances a quarter of a unit a frame: at the
    // default 10,000 units, every trial would reach the 5,000-sample cap,
    // be cut short and be left out of every average.
    await page
      .locator('#xpScenario')
      .selectOption('Gravity Assist: Heliocentric');
    await expect(page.locator('#xpRefusals')).toContainText(
      'after 1249 of its 10000 units of time',
      { timeout: 30_000 }
    );
    await expect(page.locator('#xpRun')).toBeDisabled();
    // The length it names runs.
    await page.locator('#xpDuration').fill('1249');
    await expect(page.locator('#xpRefusals')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('#xpRun')).toBeEnabled();
  });

  test('a saved result checks as reproducible here, and an edited one does not', async ({
    page,
  }) => {
    await openRunner(page);
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText('Finished', {
      timeout: 60_000,
    });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#xpDownloadJson').click(),
    ]);
    const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(saved).toMatchObject({
      format: 'gravitas.experiment-result',
      formatVersion: 1,
      status: 'complete',
    });
    expect(saved.engine.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(saved.trials).toHaveLength(16);

    await page.locator('#xpCheckInput').fill(JSON.stringify(saved));
    await page.locator('#xpCheckBtn').click();
    await expect(page.locator('#xpCheckOut')).toContainText(
      'Reproducible here'
    );
    saved.manifest.stop.duration = 12345;
    await page.locator('#xpCheckInput').fill(JSON.stringify(saved));
    await page.locator('#xpCheckBtn').click();
    await expect(page.locator('#xpCheckOut')).toContainText(
      'edited since it was run'
    );
  });

  test('speaks Spanish when asked', async ({ page }) => {
    await openRunner(page);
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.locator('h1')).toHaveText('Ejecutar un experimento');
    await expect(page.locator('#xpEstimate')).toContainText('ensayos de', {
      timeout: 30_000,
    });
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText(
      'Terminado: 16 de 16',
      { timeout: 60_000 }
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('has no accessibility violations, before and after a run', async ({
    page,
  }) => {
    await openRunner(page);
    const before = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      before.violations.map(
        v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
      )
    ).toEqual([]);
    await page.locator('#xpRun').click();
    await expect(page.locator('#xpStatus')).toContainText('Finished', {
      timeout: 60_000,
    });
    const after = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      after.violations.map(
        v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
      )
    ).toEqual([]);
  });
});

test.describe('realms that misbehave, in a real browser', () => {
  test.skip(
    DIST,
    'imports the scheduler by path, which the bundle does not serve'
  );

  test('a hung realm is terminated at its limit, and a garbled answer is reported', async ({
    page,
  }) => {
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    const statuses = await page.evaluate(async () => {
      const { createScheduler } = await import('/js/experiments/scheduler.js');
      const M = await import('/js/experiments/experimentManifest.js');
      const manifest = {
        format: M.FORMAT,
        formatVersion: 1,
        title: 't',
        model: { scenario: 'Binary Planet Lab', platform: '^1.0.0' },
        initial: { settings: {} },
        seeds: ['a'],
        vary: [{ parameter: 'binary_lab_planet_a', values: [0.1, 0.2, 0.3] }],
        observables: {
          metrics: ['distance_to_primary'],
          roles: M.SWEEPABLE['Binary Planet Lab'].roles,
        },
        stop: { duration: 10000, events: [] },
        numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
        limits: {
          ...M.defaultLimits('desktop', { hardwareConcurrency: 8 }),
          trialTimeoutMs: 1500,
        },
        summaries: [],
      };
      const blob = source =>
        URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const hang = blob('self.onmessage = () => {};');
      const garble = blob(
        "self.onmessage = e => self.postMessage({ type: 'result', result: { index: e.data.trial.index, lies: true } });"
      );
      const real = new URL(
        '/js/experiments/experimentWorker.js',
        location.href
      );
      const kinds = [hang, garble, real];
      let n = 0;
      const spawn = () => new Worker(kinds[n++], { type: 'module' });
      const out = await createScheduler({
        manifest,
        trials: M.planTrials(manifest),
        spawn,
        concurrency: 1,
        now: () => performance.now(),
      }).run();
      return out.trials.map(t => t.status);
    });
    expect(statuses).toEqual(['timeout', 'corrupt', 'ok']);
  });
});
