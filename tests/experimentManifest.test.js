import { describe, test, expect } from '@jest/globals';

import {
  FORMAT,
  PROFILES,
  RESULT_FORMAT,
  STATUS,
  SWEEPABLE,
  concurrencyFor,
  defaultLimits,
  detectProfile,
  estimate,
  experimentHash,
  fromSweepSpec,
  isTrialResult,
  migrateExperiment,
  planTrials,
  refusals,
  reproducibility,
  summarizeExperiment,
  trialCount,
  validateExperiment,
  valuesFor,
} from '../js/experiments/experimentManifest.js';

// =============================================================================
// gravitas.experiment/1: what an experiment may ask for, and what it means
// -----------------------------------------------------------------------------
// EXPERIMENTS.md describes the format. These are its rules, the order trials
// run in, what a device is refused, and how a saved result says whether it
// can be reproduced.
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const paths = m => validateExperiment(m).map(p => p.path);

const base = () => ({
  format: FORMAT,
  formatVersion: 1,
  title: 'Where does the planet stop being bound?',
  model: { scenario: 'Binary Planet Lab', platform: '^1.0.0' },
  initial: { settings: {} },
  seeds: ['a', 'b'],
  vary: [{ parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 4 }],
  observables: {
    metrics: ['distance_to_primary'],
    roles: SWEEPABLE['Binary Planet Lab'].roles,
  },
  stop: { duration: 10000, events: [] },
  numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
  limits: defaultLimits('desktop', { hardwareConcurrency: 8 }),
  summaries: ['mean', 'status-counts'],
});

describe('what an experiment may ask for', () => {
  test('a well-formed experiment has no problems', () => {
    expect(validateExperiment(base())).toEqual([]);
  });

  test('only what the bench can vary, inside its validated bounds', () => {
    const m = base();
    m.vary[0].parameter = 'mutual_gravity';
    expect(paths(m)).toEqual(['vary[0].parameter']);
    const out = base();
    out.vary[0].to = 0.9;
    expect(paths(out)).toEqual(['vary[0]']);
    const scenario = base();
    scenario.model.scenario = 'Solar System';
    expect(paths(scenario)).toContain('model.scenario');
  });

  test('a range that crosses the collision neighbourhood of an assist is refused', () => {
    const m = base();
    m.model.scenario = 'Gravity Assist Lab';
    m.observables.roles = SWEEPABLE['Gravity Assist Lab'].roles;
    m.vary = [{ parameter: 'assist_impact_parameter', values: [-40, 0, 40] }];
    expect(
      validateExperiment(m)
        .map(p => p.message)
        .join()
    ).toMatch(/collision/);
    m.vary = [{ parameter: 'assist_impact_parameter', values: [-40, 40] }];
    expect(validateExperiment(m)).toEqual([]);
  });

  test('seeds, metrics, duration, numerics and limits are all bounded', () => {
    const m = base();
    m.seeds = ['a', 'a'];
    m.observables.metrics = ['total_nonsense'];
    m.stop.duration = 0;
    m.numerics.frameSeconds = 0.5;
    m.limits.concurrency = 99;
    expect(paths(m).sort()).toEqual(
      [
        'limits.concurrency',
        'numerics.frameSeconds',
        'observables.metrics[0]',
        'seeds',
        'stop.duration',
      ].sort()
    );
  });

  test('a distribution needs its own seed, so the draw is the same every time', () => {
    const m = base();
    m.vary = [
      {
        parameter: 'binary_lab_planet_a',
        distribution: { kind: 'uniform', min: 0.1, max: 0.3, samples: 5 },
      },
    ];
    expect(paths(m)).toEqual(['vary[0].distribution.seed']);
    m.vary[0].distribution.seed = 'draw';
    expect(validateExperiment(m)).toEqual([]);
    expect(valuesFor(m.vary[0])).toEqual(valuesFor(clone(m.vary[0])));
    expect(valuesFor(m.vary[0]).every(v => v >= 0.1 && v <= 0.3)).toBe(true);
  });

  test('a parameter is varied once, and no manifest asks for more trials than any device runs', () => {
    const twice = base();
    twice.vary.push({
      parameter: 'binary_lab_planet_a',
      from: 0.1,
      to: 0.2,
      count: 3,
    });
    expect(paths(twice)).toContain('vary[1].parameter');
    // Twenty values, twenty seeds: the most one parameter can ask for.
    const most = base();
    most.seeds = Array.from({ length: 20 }, (_, i) => `s${i}`);
    most.vary[0].count = 20;
    expect(trialCount(most)).toBe(PROFILES.desktop.maxTrials);
    expect(validateExperiment(most)).toEqual([]);
    // Two parameters of twenty values each, with twenty seeds, is 8000.
    const grid = clone(most);
    grid.model.scenario = 'Gravity Assist Lab';
    grid.observables.roles = SWEEPABLE['Gravity Assist Lab'].roles;
    grid.vary = [
      { parameter: 'assist_impact_parameter', from: 20, to: 400, count: 20 },
      { parameter: 'assist_v_infinity', from: 0.1, to: 3, count: 20 },
    ];
    expect(
      validateExperiment(grid)
        .map(p => p.message)
        .join()
    ).toMatch(/8000 trials/);
  });
});

describe('the order trials run in', () => {
  test('each value in turn, every seed within a value, the same on every machine', () => {
    const trials = planTrials(base());
    expect(
      trials.map(t => [t.index, t.params.binary_lab_planet_a, t.seed])
    ).toEqual([
      [0, 0.1, 'a'],
      [1, 0.1, 'b'],
      [2, 0.2, 'a'],
      [3, 0.2, 'b'],
      [4, 0.30000000000000004, 'a'],
      [5, 0.30000000000000004, 'b'],
      [6, 0.4, 'a'],
      [7, 0.4, 'b'],
    ]);
    expect(planTrials(clone(base()))).toEqual(trials);
  });

  test('two parameters make a grid, the first slowest', () => {
    const m = base();
    m.model.scenario = 'Gravity Assist Lab';
    m.observables.roles = SWEEPABLE['Gravity Assist Lab'].roles;
    m.seeds = ['s'];
    m.vary = [
      { parameter: 'assist_impact_parameter', values: [20, 40] },
      { parameter: 'assist_v_infinity', values: [0.5, 1, 1.5] },
    ];
    expect(planTrials(m).map(t => Object.values(t.params))).toEqual([
      [20, 0.5],
      [20, 1],
      [20, 1.5],
      [40, 0.5],
      [40, 1],
      [40, 1.5],
    ]);
  });

  test('a manifest has a stable identity, and any change to it changes that', () => {
    const m = base();
    expect(experimentHash(m)).toBe(experimentHash(clone(m)));
    const edited = base();
    edited.stop.duration = 10001;
    expect(experimentHash(edited)).not.toBe(experimentHash(m));
  });
});

describe('what a device may be asked to do', () => {
  test('four cores or four gigabytes is low-end, and gets fewer realms', () => {
    expect(detectProfile({ hardwareConcurrency: 4 })).toBe('low-end');
    expect(detectProfile({ hardwareConcurrency: 16, deviceMemory: 4 })).toBe(
      'low-end'
    );
    expect(detectProfile({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(
      'desktop'
    );
    expect(concurrencyFor('low-end', { hardwareConcurrency: 4 })).toBe(2);
    expect(concurrencyFor('desktop', { hardwareConcurrency: 6 })).toBe(5);
    expect(concurrencyFor('desktop', { hardwareConcurrency: 32 })).toBe(
      PROFILES.desktop.maxConcurrency
    );
    expect(concurrencyFor('desktop', { hardwareConcurrency: 1 })).toBe(1);
  });

  test('an experiment is priced from what its planning realm timed on this device', () => {
    const m = base();
    const P = PROFILES.desktop;
    const plan = {
      bodies: 3,
      steps: 10080,
      samples: 161,
      frameAdvance: 62.5,
      startMs: 40,
      buildMs: 6,
      calibration: { stepsPerMs: 250, warmupMs: 20, complete: false },
    };
    const est = estimate(m, plan, 'desktop', 4);
    expect(est.trials).toBe(8);
    expect(est.timed).toBe(true);
    // Start-up, build and warm-up once, then the steps at the timed rate;
    // four realms at once each keep the profile's share of that speed.
    const solo = 40 + 6 + 20 + 10080 / 250;
    expect(est.trialMs).toBeCloseTo(solo / P.parallelShare, 6);
    expect(est.wallMs).toBeCloseTo(2 * est.trialMs, 6);
    expect(refusals(est, m, 'desktop')).toEqual([]);
    // A lone realm shares nothing.
    expect(estimate(m, plan, 'desktop', 1).trialMs).toBeCloseTo(solo, 6);
    // Twice the rate, and the running part costs half: nothing about the
    // price is a fixed figure per device.
    const faster = estimate(
      m,
      { ...plan, calibration: { ...plan.calibration, stepsPerMs: 500 } },
      'desktop',
      1
    );
    expect(faster.trialMs).toBeCloseTo(66 + 10080 / 500, 6);
  });

  test('a plan without timing falls back to the profile, cautiously', () => {
    const m = base();
    const plan = { bodies: 3, steps: 10080, samples: 161 };
    for (const [profile, P] of Object.entries(PROFILES)) {
      const est = estimate(m, plan, profile, 2);
      expect(est.timed).toBe(false);
      expect(est.trialMs).toBeCloseTo(
        (P.setupMs + (10080 * 3) / P.rate) / P.parallelShare,
        6
      );
      // A clock too coarse to time the burst is the same as no timing.
      const coarse = estimate(
        m,
        { ...plan, calibration: { stepsPerMs: null } },
        profile,
        2
      );
      expect(coarse.timed).toBe(false);
      expect(coarse.trialMs).toBeCloseTo(est.trialMs, 6);
    }
    // Every profile says what a trial costs before it integrates anything,
    // and a slower device is slower at both.
    for (const P of Object.values(PROFILES)) {
      expect(P.setupMs).toBeGreaterThan(0);
      expect(P.rate).toBeGreaterThan(0);
      expect(P.parallelShare).toBeGreaterThan(0);
      expect(P.parallelShare).toBeLessThanOrEqual(1);
    }
    expect(PROFILES['low-end'].setupMs).toBeGreaterThan(
      PROFILES.desktop.setupMs
    );
    expect(PROFILES['low-end'].rate).toBeLessThan(PROFILES.desktop.rate);
  });

  test('trials that would all stop at the sample cap are refused, with the length that fits', () => {
    const m = base();
    m.stop.duration = 10000;
    // The heliocentric assist: a quarter of a unit a frame, sampled every
    // frame. The first of 5,000 samples is the start, so the other 4,999
    // reach 1,249.75 units of a 10,000-unit trial.
    const plan = {
      bodies: 3,
      steps: 40000,
      samples: 40001,
      frameAdvance: 0.25,
      calibration: { stepsPerMs: 400, warmupMs: 0 },
    };
    const est = estimate(m, plan, 'desktop', 4);
    const capped = refusals(est, m, 'desktop').find(
      r => r.reason === 'wouldBeCapped'
    );
    expect(capped.detail).toEqual({ reachable: 1249, duration: 10000 });
    // And the length it names does fit.
    const fits = { ...m, stop: { duration: 1249, events: [] } };
    const frames = Math.ceil(1249 / 0.25);
    expect(
      refusals(
        estimate(
          fits,
          { ...plan, steps: frames, samples: frames + 1 },
          'desktop',
          4
        ),
        fits,
        'desktop'
      ).map(r => r.reason)
    ).not.toContain('wouldBeCapped');
    // A stop event may end each trial first, so it is not refused then.
    m.stop.events = [{ kind: 'separation-above', au: 10 }];
    expect(
      refusals(estimate(m, plan, 'desktop', 4), m, 'desktop').map(r => r.reason)
    ).not.toContain('wouldBeCapped');
  });

  test('an experiment that would hold too much memory at once is refused', () => {
    const m = base();
    const plan = {
      bodies: 3,
      steps: 1000,
      samples: 101,
      calibration: { stepsPerMs: 400, warmupMs: 0 },
    };
    const est = estimate(m, plan, 'low-end', 2);
    expect(est.memoryBytes).toBe(2 * est.realmBytes + est.resultBytes);
    expect(refusals(est, m, 'low-end').map(r => r.reason)).not.toContain(
      'tooMuchMemory'
    );
    const heavy = {
      ...est,
      memoryBytes: PROFILES['low-end'].maxMemoryBytes + 1,
    };
    expect(refusals(heavy, m, 'low-end').map(r => r.reason)).toContain(
      'tooMuchMemory'
    );
  });

  test('one that would look frozen on this device is refused, with the reason', () => {
    const m = base();
    m.limits = defaultLimits('low-end', { hardwareConcurrency: 2 });
    m.vary[0].count = 20;
    m.seeds = Array.from({ length: 10 }, (_, i) => `s${i}`);
    // A long, many-bodied trial: the price of a big sweep on a small machine.
    const est = estimate(
      m,
      { bodies: 40, steps: 2_000_000, samples: 3000 },
      'low-end',
      1
    );
    const reasons = refusals(est, m, 'low-end').map(r => r.reason);
    expect(reasons).toEqual(
      expect.arrayContaining(['tooManyTrials', 'tooLong', 'trialTooLong'])
    );
  });
});

describe('reading a result', () => {
  const trial = { index: 0, params: { binary_lab_planet_a: 0.1 }, seed: 'a' };
  const good = {
    ...trial,
    status: 'ok',
    results: { distance_to_primary: 1 },
    series: { distance_to_primary: [] },
    steps: 10,
  };

  test('a realm’s answer is a result only if it is this trial’s, in this shape', () => {
    expect(isTrialResult(good, trial, ['distance_to_primary'])).toBe(true);
    expect(
      isTrialResult({ ...good, index: 1 }, trial, ['distance_to_primary'])
    ).toBe(false);
    expect(
      isTrialResult({ ...good, status: 'fine' }, trial, ['distance_to_primary'])
    ).toBe(false);
    expect(
      isTrialResult(
        { ...good, results: { distance_to_primary: 'far' } },
        trial,
        ['distance_to_primary']
      )
    ).toBe(false);
    expect(isTrialResult(null, trial, ['distance_to_primary'])).toBe(false);
  });

  test('a summary averages measured trials only, and counts the rest', () => {
    const m = base();
    const trials = planTrials(m).map((t, i) => ({
      ...t,
      status: i === 1 ? STATUS.TIMEOUT : i === 3 ? STATUS.CAPPED : STATUS.OK,
      results: { distance_to_primary: i },
    }));
    const s = summarizeExperiment(m, trials);
    const first = s.metrics.distance_to_primary[0];
    expect(first).toMatchObject({ n: 1, mean: 0, missing: 1, partial: 0 });
    expect(s.metrics.distance_to_primary[1]).toMatchObject({
      n: 1,
      mean: 2,
      partial: 1,
    });
    expect(s.statusCounts).toMatchObject({
      total: 8,
      ok: 6,
      timeout: 1,
      capped: 1,
    });
  });

  test('a result says whether it can be reproduced, and why not', () => {
    const m = base();
    const result = {
      format: RESULT_FORMAT,
      formatVersion: 1,
      hash: experimentHash(m),
      manifest: m,
      engine: { fingerprint: 'aaaa0000', app: 'v1' },
    };
    expect(reproducibility(result, { engine: 'aaaa0000', app: 'v1' })).toEqual({
      reproducible: true,
      reasons: [],
      notes: [],
    });
    // A new build whose engine integrates the same way still reproduces.
    const newer = reproducibility(result, { engine: 'aaaa0000', app: 'v2' });
    expect(newer.reproducible).toBe(true);
    expect(newer.notes.join()).toMatch(/made by Gravitas v1/);
    // One whose engine changed does not, and says that is the reason.
    const changed = reproducibility(result, { engine: 'bbbb1111', app: 'v2' });
    expect(changed.reproducible).toBe(false);
    expect(changed.reasons.join()).toMatch(/integrates differently/);
    // Nor does a result whose manifest was edited after it ran.
    const edited = clone(result);
    edited.manifest.stop.duration = 9999;
    expect(
      reproducibility(edited, { engine: 'aaaa0000', app: 'v1' }).reasons.join()
    ).toMatch(/edited/);
  });
});

describe('migration', () => {
  test('a bench sweep becomes an experiment that validates', () => {
    const sweep = {
      scenario: 'Binary Planet Lab',
      parameter: 'binary_lab_planet_a',
      from: 0.05,
      to: 0.4,
      count: 12,
      duration: 10000,
      metrics: ['distance_to_primary', 'speed'],
      seed: 'guided',
    };
    const { manifest, notes, error } = migrateExperiment(sweep);
    expect(error).toBeNull();
    expect(notes[0]).toMatch(/bench sweep/);
    expect(validateExperiment(manifest)).toEqual([]);
    expect(manifest.seeds).toEqual(['guided']);
    expect(planTrials(manifest)).toHaveLength(12);
    expect(
      fromSweepSpec({ ...sweep, values: [0.1, 0.2, 0.3] }).vary[0]
    ).toEqual({ parameter: 'binary_lab_planet_a', values: [0.1, 0.2, 0.3] });
  });

  test('a newer format is refused with the reason, never half-read', () => {
    expect(
      migrateExperiment({ format: FORMAT, formatVersion: 2 }).error
    ).toMatch(/newer than this Gravitas reads/);
    expect(
      migrateExperiment({ format: FORMAT, formatVersion: 0 }).error
    ).toMatch(/not a version that was ever published/);
    expect(migrateExperiment({ hello: 1 }).error).toMatch(/neither/);
    expect(migrateExperiment(base()).manifest).toEqual(base());
  });
});
