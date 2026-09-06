// =============================================================================
// The parameter sweep
// -----------------------------------------------------------------------------
// tests/sweep.test.js pins what a valid sweep is and what a finished one
// means. What only a browser can establish is that the trials are real runs of
// the real engine and that the sweep is not quietly measuring itself:
//
//   the value reaches the world      a rebuild re-stamps the scenario's own
//                                    settings, so a swept value that does not
//                                    survive would give a flat line at every
//                                    point - a believable, false result
//
//   the trials agree with the bench  the same value, run by hand through the
//                                    ordinary bench path, must give the same
//                                    number. This is the check that the sweep
//                                    is not a second implementation
//
//   nothing leaks between trials     value n+1 must not depend on value n, and
//                                    cancelling must leave the live simulation
//                                    exactly where it was
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

/** Run a sweep through the bench's own entry point. */
async function sweep(page, spec) {
  return page.evaluate(async s => {
    const bench = await import('/js/experiments/bench.js');
    return bench.runSweep(s);
  }, spec);
}

const BINARY = {
  scenario: 'Binary Planet Lab',
  parameter: 'binary_lab_planet_a',
  from: 0.05,
  to: 0.35,
  count: 4,
  duration: 2000,
  metrics: ['distance_to_primary', 'speed'],
  seed: 'spec',
};

test.describe('the trials', () => {
  test('the swept value actually reaches the built world', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await openBench(page, app);

    const out = await sweep(page, { ...BINARY, count: 3 });
    expect(out.ok).toBe(true);

    // Every trial measured something, and the measurements are not all the
    // same number. A sweep whose parameter was reset by the rebuild would run
    // three identical worlds and draw a flat line.
    const measured = out.trials.filter(tr => tr.status === 'ok');
    expect(measured).toHaveLength(3);
    const distances = measured.map(tr => tr.results.distance_to_primary);
    expect(new Set(distances.map(d => d.toFixed(6))).size).toBe(3);

    // And it moves the right way: a planet started further out stays further
    // out, at least over the part of the range where it is still in orbit.
    expect(distances[1]).toBeGreaterThan(distances[0]);
  });

  test('a trial matches the same value run by hand through the bench', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    await app.boot();
    await openBench(page, app);

    const value = 0.2;
    const out = await sweep(page, {
      ...BINARY,
      from: value,
      to: 0.4,
      count: 3,
    });
    expect(out.ok).toBe(true);
    const fromSweep = out.trials[0];
    expect(fromSweep.status).toBe('ok');
    expect(fromSweep.value).toBeCloseTo(value, 12);

    // The same value, built and integrated independently here rather than by
    // the sweep: same settings, same seed, and the frame count the sweep
    // reported, using physics.js directly instead of the render loop. If the
    // sweep were a second implementation of the stepping or the reduction,
    // this is where it would show.
    const byHand = await page.evaluate(
      async ({ v, frames, metrics, seed }) => {
        const ui = await import('/js/ui.js');
        const physics = await import('/js/physics.js');
        const timestep = await import('/js/timestep.js');
        const M = await import('/js/experiments/metrics.js');
        const units = await import('/js/units.js');

        ui.SETTINGS.preset_scenario = 'Binary Planet Lab';
        ui.initialize_simulation({ seed });
        ui.SETTINGS.binary_lab_planet_a = v;
        ui.initialize_simulation({ seed });

        const planet = physics.planets[0];
        const primary = physics.stars.find(s => s.name === 'Star A');
        const dtSim = timestep.frameAdvance(
          1 / 60,
          ui.SETTINGS.sim_speed,
          physics.DT
        );
        const plan = timestep.substepPlan(dtSim, ui.SETTINGS.max_timestep);
        const t0 = physics.getSimulationTime();

        const samples = [];
        const take = () =>
          samples.push(
            M.sampleFrame({
              t: physics.getSimulationTime(),
              bodies: [planet],
              primary,
              conserved: physics.conservedQuantities(),
              drift: physics.conservationDrift(),
              secondsPerUnit: units.timeUnitSeconds(),
              metrics,
            })
          );

        // One before the first advance, then one after each: exactly the
        // pattern the runner uses.
        take();
        for (let f = 0; f < frames; f++) {
          for (let i = 0; i < plan.substeps; i++) {
            physics.updatePhysics(plan.step);
          }
          take();
        }
        const reduced = M.reduceRun(
          samples,
          metrics,
          86400 / units.timeUnitSeconds()
        );
        return {
          samples: samples.length,
          duration: physics.getSimulationTime() - t0,
          distance: reduced.distance_to_primary?.value ?? null,
          speed: reduced.speed?.value ?? null,
        };
      },
      {
        v: value,
        frames: out.framesPerTrial,
        metrics: BINARY.metrics,
        seed: BINARY.seed,
      }
    );

    // Same number of samples over the same simulated span, so the two are
    // comparisons of the same calculation rather than of two similar ones.
    expect(byHand.samples).toBe(fromSweep.samples);
    expect(byHand.duration).toBeCloseTo(out.duration, 6);

    // And the same answer. Tight, because with the frame count matched there
    // is nothing left to differ except the physics itself.
    expect(byHand.distance).not.toBeNull();
    expect(fromSweep.results.distance_to_primary).toBeCloseTo(
      byHand.distance,
      6
    );
    expect(fromSweep.results.speed).toBeCloseTo(byHand.speed, 6);
  });

  test('a trial does not depend on the trial before it', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    await app.boot();
    await openBench(page, app);

    // The same value, once as the first trial of an ascending sweep and once
    // as the last of a descending one. Each trial rebuilds from the scenario,
    // so the answer must not remember what ran before it.
    const up = await sweep(page, { ...BINARY, from: 0.1, to: 0.3, count: 3 });
    const down = await sweep(page, { ...BINARY, from: 0.3, to: 0.1, count: 3 });
    expect(up.ok && down.ok).toBe(true);

    const at = (out, v) =>
      out.trials.find(tr => Math.abs(tr.value - v) < 1e-9)?.results
        ?.distance_to_primary;

    for (const v of [0.1, 0.2, 0.3]) {
      const a = at(up, v);
      const b = at(down, v);
      if (a === undefined || b === undefined) continue;
      expect(Math.abs(a - b) / Math.abs(a)).toBeLessThan(1e-9);
    }
  });
});

test.describe('stopping it', () => {
  test('cancelling leaves the live simulation exactly as it was', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(5);
    await openBench(page, app);

    const before = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      return {
        scenario: ui.current_scenario_name,
        bodies: physics.planets.length + physics.stars.length,
        maxTimestep: ui.SETTINGS.max_timestep,
        planetA: ui.SETTINGS.binary_lab_planet_a,
        paused: ui.state.paused,
      };
    });

    const out = await page.evaluate(async spec => {
      const bench = await import('/js/experiments/bench.js');
      const running = bench.runSweep({ ...spec, count: 20, duration: 500 });
      await new Promise(r => setTimeout(r, 600));
      const wasRunning = bench.isSweeping();
      bench.cancelSweep();
      const result = await running;
      return {
        wasRunning,
        cancelled: result.cancelled,
        notRun: result.counts.cancelled,
        stillSweeping: bench.isSweeping(),
      };
    }, BINARY);

    expect(out.wasRunning).toBe(true);
    expect(out.cancelled).toBe(true);
    // The values that never ran are in the table as such rather than absent.
    expect(out.notRun).toBeGreaterThan(0);
    expect(out.stillSweeping).toBe(false);

    const after = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      return {
        scenario: ui.current_scenario_name,
        bodies: physics.planets.length + physics.stars.length,
        maxTimestep: ui.SETTINGS.max_timestep,
        planetA: ui.SETTINGS.binary_lab_planet_a,
        paused: ui.state.paused,
      };
    });

    // The sweep rebuilt the world into a different scenario several times over
    // and put this one back, settings included.
    expect(after.scenario).toBe(before.scenario);
    expect(after.bodies).toBe(before.bodies);
    expect(after.maxTimestep).toBe(before.maxTimestep);
    expect(after.planetA).toBe(before.planetA);
    expect(after.paused).toBe(before.paused);
  });
});

test.describe('what it reports', () => {
  test('a failed trial is a row with a reason, not a gap', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await openBench(page, app);

    // Far out in the circumstellar range the planet is not bound to one star,
    // and some of these trials will not produce a usable measurement. Whatever
    // happens, every requested value must appear with a status.
    const out = await sweep(page, {
      ...BINARY,
      from: 0.3,
      to: 0.45,
      count: 4,
      duration: 20000,
    });
    expect(out.ok).toBe(true);
    expect(out.trials).toHaveLength(4);
    for (const tr of out.trials) {
      expect(typeof tr.status).toBe('string');
      expect(tr.status.length).toBeGreaterThan(0);
    }
    expect(out.counts.total).toBe(4);
    expect(out.counts.ok + out.counts.failed + out.counts.cancelled).toBe(4);
  });

  test('the CSV carries the initial conditions and the numerical settings', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await openBench(page, app);
    await sweep(page, { ...BINARY, count: 3 });

    const text = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      return bench.exportFiles('test').sweep.text;
    });

    // Reproducible means somebody else can run it: which scenario, which seed,
    // which parameter over what range, and the numerics it ran under.
    expect(text).toMatch(/# scenario: Binary Planet Lab/);
    expect(text).toMatch(/# seed: spec/);
    expect(text).toMatch(/# parameter: binary_lab_planet_a/);
    expect(text).toMatch(/# duration_per_trial: /);
    expect(text).toMatch(/# duration_requested: 2000/);
    expect(text).toMatch(/# frames_per_trial: /);
    expect(text).toMatch(/# integrator: /);
    expect(text).toMatch(/# integration_step: /);
    expect(text).toMatch(/# substeps_per_frame: /);
    expect(text).toMatch(/# max_timestep: /);
    // And it says what it holds fixed, which is the whole claim of a sweep.
    expect(text).toMatch(/every other initial condition/i);

    const rows = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
    expect(rows[0]).toMatch(/^trial,value,status,/);
    expect(rows).toHaveLength(4); // header plus three trials
  });

  test('the panel draws the sweep and says what moved, in both languages', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    for (const locale of ['en', 'es']) {
      await page.addInitScript(loc => {
        localStorage.setItem('gravitas_locale', loc);
      }, locale);
      await app.boot();
      await openBench(page, app);
      await sweep(page, { ...BINARY, count: 3 });
      await page.evaluate(async () => {
        const panel = await import('/js/experiments/panel.js');
        panel.render();
        document.getElementById('benchSweepSection').open = true;
      });

      const section = page.locator('#benchSweepSection');
      await expect(section.locator('#benchSweepResults table')).toBeVisible();
      const text = await section.innerText();
      // No unresolved ids in either language.
      expect(text).not.toMatch(/sweep\./);
      expect(text.length).toBeGreaterThan(80);
      await expect(page.locator('#benchSweepChart')).toBeVisible();
    }
  });

  test('the guided example runs and shows the outcome changing', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    await app.boot();
    await openBench(page, app);
    await page.evaluate(() => {
      document.getElementById('benchSweepSection').open = true;
      document.getElementById('benchSweepGuide').open = true;
    });

    await page.locator('#benchSweepGuided').click();
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const bench = await import('/js/experiments/bench.js');
            return bench.latestSweep()?.counts?.ok ?? 0;
          }),
        { timeout: 240_000 }
      )
      .toBeGreaterThan(4);

    const sweepOut = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const s = bench.latestSweep();
      return {
        scenario: s.scenario,
        parameter: s.parameter,
        summaries: s.summaries,
      };
    });

    expect(sweepOut.scenario).toBe('Binary Planet Lab');
    expect(sweepOut.parameter).toBe('binary_lab_planet_a');
    // The point of a guided example is that something visibly depends on the
    // parameter. If nothing moved, the example teaches nothing.
    expect(sweepOut.summaries.some(s => s.changed)).toBe(true);
  });
});
