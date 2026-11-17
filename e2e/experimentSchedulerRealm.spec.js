// =============================================================================
// The experiment scheduler's supervision of its realms
// -----------------------------------------------------------------------------
// Moved out of experimentRunner.spec.js, which judges the product through the
// page and runs against `dist/` too. This one test drives the scheduler module
// itself with stand-in Workers (one that never answers, one that answers with
// something that is not a result), so it reads `/js/experiments/` and runs
// against the sources only. It is the same test, still run with the browser
// suite; nothing was skipped to move it.
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('the experiment scheduler', () => {
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
        model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
        initial: { settings: {} },
        seeds: ['a'],
        vary: [{ parameter: 'binary_lab_planet_a', values: [0.1, 0.2, 0.3] }],
        observables: {
          metrics: ['distance_to_primary'],
          roles: M.SWEEPABLE['binary-planet-lab'].roles,
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
