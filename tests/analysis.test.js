import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The analysis laboratory's numbers, against truth
// -----------------------------------------------------------------------------
// js/analysis/ rests on three modules, and each is held to something known:
//   stats.js          tabulated values (chi-square, Student t, R's quantile),
//                     and the properties a resampling method must have: the
//                     same seed gives the same bits, a p-value is never zero
//   sweepAnalysis.js  synthetic experiment results with a known slope, peak,
//                     flat stretch or interaction, and the warnings each must
//                     raise; its planning, refusals and cancellation
//   modelCompare.js   fits of named models to synthetic radial velocities,
//                     -2 ln L by hand, the nesting it detects and the data it
//                     refuses to compare
// tools/analysis-validate.mjs runs the same cases over hundreds of seeds and
// prints the coverage and error-rate tables ANALYSIS_LAB.md quotes.
// =============================================================================

const S = await import('../js/analysis/stats.js');
const A = await import('../js/analysis/sweepAnalysis.js');
const C = await import('../js/analysis/modelCompare.js');
const { fitOnce } = await import('../js/inference/infer.js');
const { syntheticRv, gaussian } = await import('../js/inference/synthetic.js');
const { MODELS } = await import('../js/inference/models.js');

/** A result as js/experimentsPage.js writes it, from a function of the setting. */
function sweepResult({
  values,
  seeds = 6,
  f,
  noise = 0.3,
  fail = () => false,
  second = null,
  sampled = false,
  step = 1 / 60,
}) {
  const g = gaussian('sweep-noise');
  const trials = [];
  const combos = second
    ? values.flatMap(x => second.values.map(y => ({ p: x, q: y })))
    : values.map(x => ({ p: x }));
  for (const params of combos)
    for (let s = 0; s < seeds; s++) {
      const bad = fail(params, s);
      trials.push({
        index: trials.length,
        params,
        seed: `s${s}`,
        status: bad ? 'lostBody' : 'ok',
        results: { m: bad ? null : f(params) + noise * g() },
      });
    }
  const vary = [
    sampled
      ? {
          parameter: 'p',
          distribution: {
            kind: 'uniform',
            samples: values.length,
            min: values[0],
            max: values.at(-1),
            seed: 'u',
          },
        }
      : {
          parameter: 'p',
          from: values[0],
          to: values.at(-1),
          count: values.length,
        },
  ];
  if (second)
    vary.push({
      parameter: 'q',
      from: second.values[0],
      to: second.values.at(-1),
      count: second.values.length,
    });
  return {
    format: 'gravitas.experiment-result',
    formatVersion: 1,
    hash: 'abc123',
    manifest: {
      format: 'gravitas.experiment',
      formatVersion: 1,
      vary,
      seeds: Array.from({ length: seeds }, (_, i) => `s${i}`),
      observables: { metrics: ['m'] },
      numerics: { frameSeconds: step, sampleEvery: 1 },
    },
    trials,
  };
}
const range = (a, b, n) =>
  Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
const codes = a => a.warnings.map(w => w.code);

describe('the statistics', () => {
  test('chi-square tails match the tables', () => {
    expect(S.chiSquareSf(3.841459, 1)).toBeCloseTo(0.05, 6);
    expect(S.chiSquareSf(5.991465, 2)).toBeCloseTo(0.05, 6);
    expect(S.chiSquareSf(18.307038, 10)).toBeCloseTo(0.05, 6);
    expect(S.chiSquareSf(124.342113, 100)).toBeCloseTo(0.05, 5);
    expect(S.chiSquareSf(0, 3)).toBe(1);
    // exp(-x/2) exactly for two degrees of freedom.
    expect(S.chiSquareSf(7, 2)).toBeCloseTo(Math.exp(-3.5), 12);
  });

  test("quantiles are R's type 7, and Student t is tabulated", () => {
    expect(S.quantile([1, 2, 3, 4], 0.16)).toBeCloseTo(1.48, 12);
    expect(S.quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(S.quantile([7], 0.9)).toBe(7);
    expect(S.t975(1)).toBe(12.706);
    expect(S.t975(19)).toBe(2.093);
    expect(S.t975(35)).toBeGreaterThan(2.021);
    expect(S.t975(35)).toBeLessThan(2.042);
    expect(S.t975(1e9)).toBeCloseTo(1.96, 6);
  });

  test('describe leaves out what is not a number, and counts it', () => {
    const d = S.describe([1, 2, 3, NaN, Infinity]);
    expect(d.n).toBe(3);
    expect(d.left).toBe(2);
    expect(d.mean).toBe(2);
    expect(d.sd).toBeCloseTo(1, 12);
    const i = S.meanInterval(d);
    expect(i.hi - i.lo).toBeCloseTo((2 * 4.303) / Math.sqrt(3), 10);
    expect(S.meanInterval(S.describe([5]))).toBeNull();
  });

  test('a bootstrap is its seed: the same seed, the same bits', () => {
    // Square roots, so the resampled means are not a lattice two seeds share.
    const xs = range(1, 20, 20).map(Math.sqrt);
    const a = S.bootstrap(xs, S.mean, { seed: 'one' });
    const b = S.bootstrap(xs, S.mean, { seed: 'one' });
    const c = S.bootstrap(xs, S.mean, { seed: 'two' });
    expect(a).toEqual(b);
    expect([a.lo, a.hi]).not.toEqual([c.lo, c.hi]);
    expect(a.lo).toBeLessThan(a.estimate);
    expect(a.hi).toBeGreaterThan(a.estimate);
    expect(S.bootstrap([3], S.mean)).toBeNull();
  });

  test('a permutation p-value is never zero, and is one for groups that do not differ', () => {
    const apart = S.permutationTest(
      [
        [1, 1.1, 0.9],
        [5, 5.1, 4.9],
        [9, 9.1, 8.9],
      ],
      { seed: 's' }
    );
    expect(apart.p).toBeGreaterThan(0);
    expect(apart.p).toBeLessThan(0.01);
    const same = S.permutationTest(
      [
        [1, 2, 3],
        [1, 2, 3],
      ],
      { seed: 's' }
    );
    expect(same.p).toBe(1);
    expect(S.permutationTest([[1, 2]], { seed: 's' })).toBeNull();
  });

  test('histograms keep every value, in five to forty bins', () => {
    const g = gaussian('h');
    const xs = Array.from({ length: 500 }, () => g());
    const h = S.histogram(xs);
    expect(h.rule).toBe('freedman-diaconis');
    expect(h.counts.length).toBeGreaterThanOrEqual(5);
    expect(h.counts.length).toBeLessThanOrEqual(40);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(500);
    expect(h.edges.length).toBe(h.counts.length + 1);
    expect(S.histogram([2, 2, 2]).rule).toBe('single-value');
  });

  test('ranks share ties, and Spearman sees any monotonic relation', () => {
    expect(Array.from(S.ranks([3, 1, 3, 2]))).toEqual([3.5, 1, 3.5, 2]);
    expect(S.spearman([1, 2, 3, 4, 5], [1, 8, 27, 64, 125])).toBeCloseTo(1, 12);
    expect(S.spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 12);
    expect(S.spearman([1, 2, 3], [4, 4, 4])).toBeNull();
  });
});

describe('a one-setting sweep', () => {
  const linear = sweepResult({
    values: range(1, 8, 8),
    f: ({ p }) => 2 + 0.5 * p,
  });

  test('recovers the slope, with an error that holds it', async () => {
    const a = await A.analyzeSweep(linear, { seed: 'a' });
    expect(a.design.kind).toBe('grid-1d');
    expect(a.cells).toHaveLength(8);
    const { trend } = a.sensitivity;
    expect(Math.abs(trend.slope - 0.5)).toBeLessThan(3 * trend.se);
    expect(
      a.sensitivity.local.filter(s => s.resolved).length
    ).toBeGreaterThanOrEqual(6);
    // Elasticity is the slope scaled to x / y.
    const s = a.sensitivity.local[3];
    const cell = a.cells[3];
    expect(s.elasticity).toBeCloseTo((s.slope * cell.params.p) / cell.mean, 12);
    expect(a.shares.eta2).toBeGreaterThan(0.9);
    expect(a.shares.p).toBeLessThan(0.01);
    expect(a.sensitivity.spearman.rho).toBeGreaterThan(0.9);
    expect(codes(a)).not.toContain('notResolved');
  });

  test('keeps the source whole, and is its seed', async () => {
    const a = await A.analyzeSweep(linear, { seed: 'a' });
    const b = await A.analyzeSweep(linear, { seed: 'a' });
    const c = await A.analyzeSweep(linear, { seed: 'b' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.cells.map(x => x.mean)).toEqual(c.cells.map(x => x.mean));
    expect(a.cells.map(x => x.medianInterval)).not.toEqual(
      c.cells.map(x => x.medianInterval)
    );
    expect(a.source.manifest).toEqual(linear.manifest);
    expect(a.source.hash).toBe('abc123');
    expect(a.format).toBe('gravitas.analysis');
    expect(a.options).toEqual({
      metric: 'm',
      resamples: 1000,
      permutations: 999,
      seed: 'a',
      level: 0.95,
    });
  });

  test('a measurement that rises and falls cannot be read back to one setting', async () => {
    const peak = sweepResult({
      values: range(0, 10, 11),
      f: ({ p }) => -((p - 5) ** 2),
      noise: 0.2,
    });
    expect(codes(await A.analyzeSweep(peak, { seed: 'a' }))).toContain(
      'nonMonotonic'
    );
  });

  test('a peak at the end of the range may lie beyond it', async () => {
    const rising = sweepResult({
      values: range(0, 5, 6),
      f: ({ p }) => -((p - 6) ** 2) + 0.5 * p,
      noise: 0.05,
    });
    const halfway = sweepResult({
      values: range(0, 10, 11),
      f: ({ p }) => -((p - 10) ** 2) + (p < 3 ? 40 * (3 - p) : 0),
      noise: 0.05,
    });
    expect(codes(await A.analyzeSweep(rising, { seed: 'a' }))).not.toContain(
      'edgeMax'
    );
    const w = codes(await A.analyzeSweep(halfway, { seed: 'a' }));
    expect(w).toContain('edgeMax');
  });

  test('a flat measurement does not identify the setting', async () => {
    const flat = sweepResult({
      values: range(1, 8, 8),
      f: () => 3,
      noise: 0.3,
    });
    const a = await A.analyzeSweep(flat, { seed: 'a' });
    expect(codes(a)).toEqual(
      expect.arrayContaining(['notResolved', 'flat', 'seedsDominate'])
    );
    expect(a.shares.p).toBeGreaterThan(0.05);
  });

  test('one seed measures no scatter: no intervals and no test', async () => {
    const one = sweepResult({
      values: range(1, 8, 8),
      seeds: 1,
      f: ({ p }) => p,
    });
    const a = await A.analyzeSweep(one, { seed: 'a' });
    expect(codes(a)).toContain('oneSeed');
    expect(codes(a)).not.toContain('notResolved');
    expect(a.shares.p).toBeNull();
    expect(
      a.cells.every(c => c.meanInterval === null && c.medianInterval === null)
    ).toBe(true);
    expect(
      a.sensitivity.local.every(s => s.se === null && s.resolved === null)
    ).toBe(true);
    expect(a.sensitivity.trend.se).toBeGreaterThan(0);
  });

  test("trials that did not finish are counted, and the means called survivors'", async () => {
    const lossy = sweepResult({
      values: range(1, 6, 6),
      f: ({ p }) => p,
      fail: ({ p }, s) => p > 4 && s < 3,
    });
    const a = await A.analyzeSweep(lossy, { seed: 'a' });
    const w = a.warnings.find(x => x.code === 'survivors');
    expect(w.detail).toEqual({ trials: 6, statuses: 'lostBody' });
    expect(a.cells.at(-1)).toMatchObject({
      trials: 6,
      n: 3,
      left: 3,
      statuses: { ok: 3, lostBody: 3 },
    });
    expect(a.cells.at(-1).medianInterval).toBeNull();
  });
});

describe('a model that ignores the seed', () => {
  // The bench's laboratory scenarios: every seed gives the same number.
  const exact = step =>
    sweepResult({
      values: range(1, 8, 8),
      seeds: 3,
      noise: 0,
      step,
      f: ({ p }) => 2 + 0.5 * p + (step > 1 / 100 ? 0.0002 * p * p : 0),
    });

  test('puts no interval on a scatter of zero, and runs no test', async () => {
    const a = await A.analyzeSweep(exact(1 / 60), { seed: 'a' });
    expect(a.shares).toMatchObject({
      replicates: 'identical',
      eta2: null,
      p: null,
      permutations: 0,
    });
    expect(
      a.cells.every(
        c =>
          c.identical &&
          c.se === null &&
          c.meanInterval === null &&
          c.medianInterval === null
      )
    ).toBe(true);
    expect(a.sensitivity.local.every(s => s.resolved === null)).toBe(true);
    expect(codes(a)).toContain('deterministic');
    expect(codes(a)).not.toContain('notResolved');
    expect(codes(a)).not.toContain('seedsDominate');
  });

  test('takes its uncertainty from the same experiment at another step', async () => {
    const a = await A.analyzeSweep(exact(1 / 60), {
      seed: 'a',
      reference: exact(1 / 120),
    });
    expect(a.numerical).toMatchObject({
      comparable: true,
      frameSeconds: [1 / 60, 1 / 120],
    });
    const row = a.numerical.cells.find(r => r.params.p === 4);
    expect(row.diff).toBeCloseTo(0.0002 * 16, 12);
    expect(a.numerical.maxRel).toBeGreaterThan(0);
    // Slopes judged against the numerical error: 0.5 against about 0.0003.
    expect(
      a.sensitivity.local.every(
        s => s.numericalError > 0 && s.resolved === true
      )
    ).toBe(true);
    expect(codes(a)).toContain('deterministicStepped');
    expect(codes(a)).not.toContain('stepSensitive');

    const loose = sweepResult({
      values: range(1, 8, 8),
      seeds: 3,
      noise: 0,
      step: 1 / 30,
      f: ({ p }) => 2.3 + 0.5 * p,
    });
    const b = await A.analyzeSweep(exact(1 / 60), {
      seed: 'a',
      reference: loose,
    });
    expect(codes(b)).toContain('stepSensitive');
  });

  test('refuses to compare with another experiment, or the same step', async () => {
    const other = sweepResult({
      values: range(1, 9, 8),
      seeds: 3,
      noise: 0,
      step: 1 / 120,
      f: ({ p }) => p,
    });
    const a = await A.analyzeSweep(exact(1 / 60), {
      seed: 'a',
      reference: other,
    });
    expect(a.numerical).toEqual({
      comparable: false,
      reason: 'otherExperiment',
    });
    expect(codes(a)).toContain('reference.otherExperiment');
    const same = await A.analyzeSweep(exact(1 / 60), {
      seed: 'a',
      reference: exact(1 / 60),
    });
    expect(same.numerical.reason).toBe('sameStep');
  });

  test('still reads a peak as a peak', async () => {
    const peak = sweepResult({
      values: range(0, 10, 11),
      seeds: 2,
      noise: 0,
      f: ({ p }) => -((p - 5) ** 2),
    });
    expect(codes(await A.analyzeSweep(peak, { seed: 'a' }))).toContain(
      'nonMonotonic'
    );
  });

  test('splits a grid between its settings, with the seeds at exactly zero', async () => {
    const grid = sweepResult({
      values: range(1, 5, 5),
      second: { values: range(0, 2, 3) },
      seeds: 2,
      noise: 0,
      f: ({ p, q }) => p + 3 * q,
    });
    const a = await A.analyzeSweep(grid, { seed: 'a' });
    expect(a.shares.replicates).toBe('identical');
    expect(a.shares.split.seeds).toBe(0);
    expect(a.shares.split.p + a.shares.split.q).toBeCloseTo(1, 12);
  });
});

describe('a two-setting grid', () => {
  test('splits the scatter between the settings, their interaction and the seeds', async () => {
    const additive = sweepResult({
      values: range(1, 5, 5),
      second: { values: range(0, 2, 3) },
      seeds: 4,
      f: ({ p, q }) => p + 3 * q,
      noise: 0.1,
    });
    const a = await A.analyzeSweep(additive, { seed: 'a' });
    expect(a.design.kind).toBe('grid-2d');
    const { split, balanced } = a.shares;
    expect(balanced).toBe(true);
    expect(split.p + split.q + split.interaction + split.seeds).toBeCloseTo(
      1,
      12
    );
    expect(split.interaction).toBeLessThan(0.01);
    const [P, Q] = a.sensitivity.main;
    expect(P.trend.slope).toBeCloseTo(1, 1);
    expect(Q.trend.slope).toBeCloseTo(3, 1);

    const crossed = sweepResult({
      values: range(-2, 2, 5),
      second: { values: range(-1, 1, 3) },
      seeds: 4,
      f: ({ p, q }) => p * q,
      noise: 0.1,
    });
    const b = await A.analyzeSweep(crossed, { seed: 'a' });
    expect(b.shares.split.interaction).toBeGreaterThan(0.8);
  });
});

describe('a sampled design', () => {
  test('reads the trend by rank and in bins, and says when there is none', async () => {
    const values = range(0, 10, 40);
    const rising = await A.analyzeSweep(
      sweepResult({
        values,
        seeds: 1,
        f: ({ p }) => p,
        noise: 1,
        sampled: true,
      }),
      { seed: 'a' }
    );
    expect(rising.design.kind).toBe('sampled');
    expect(rising.sensitivity.spearman.lo).toBeGreaterThan(0.5);
    expect(rising.sensitivity.bins.length).toBeGreaterThanOrEqual(3);
    expect(rising.shares.p).toBeNull();
    const noise = await A.analyzeSweep(
      sweepResult({ values, seeds: 1, f: () => 0, noise: 1, sampled: true }),
      { seed: 'a' }
    );
    expect(codes(noise)).toContain('noTrend');
  });
});

describe('planning, refusing and canceling', () => {
  const r = sweepResult({ values: range(1, 8, 8), f: ({ p }) => p });

  test('prices the work in draws, and forecasts its time from a measured rate', () => {
    const plan = A.planSweepAnalysis(r, { rate: 1000 });
    expect(plan.ok).toBe(48);
    expect(plan.cells).toBe(8);
    expect(plan.draws).toBe(1000 * 48 * 2 + 999 * 48);
    expect(plan.ms).toBe(Math.ceil(plan.draws / 1000));
    expect(plan.refusals).toEqual([]);
    expect(A.calibrate()).toBeGreaterThan(0);
  });

  test('refuses what it cannot analyze, and what is too much for the device', async () => {
    expect(A.planSweepAnalysis({}).refusals[0].reason).toBe('notAResult');
    expect(A.planSweepAnalysis(r, { metric: 'nope' }).refusals[0].reason).toBe(
      'noMetric'
    );
    const big = sweepResult({
      values: range(1, 20, 20),
      seeds: 20,
      f: ({ p }) => p,
    });
    const refused = A.planSweepAnalysis(big, {
      resamples: 10_000,
      permutations: 9999,
      profile: 'low-end',
    });
    expect(refused.refusals).toEqual([
      {
        reason: 'tooManyDraws',
        detail: { draws: refused.draws, max: 5_000_000 },
      },
    ]);
    await expect(
      A.analyzeSweep(big, {
        resamples: 10_000,
        permutations: 9999,
        profile: 'low-end',
      })
    ).rejects.toMatchObject({
      name: 'AnalysisRefused',
    });
    // The same analysis fits a desktop's limit.
    expect(
      A.planSweepAnalysis(big, {
        resamples: 10_000,
        permutations: 9999,
        profile: 'desktop',
      }).refusals
    ).toEqual([]);
  });

  test('clamps resampling to its limits', () => {
    expect(
      A.planSweepAnalysis(r, { resamples: 5, permutations: 1e9 }).draws
    ).toBe(200 * 48 * 2 + 9999 * 48);
  });

  test('stops when canceled, before or during, and leaves nothing half-made', async () => {
    const before = new globalThis.AbortController();
    before.abort();
    await expect(
      A.analyzeSweep(r, { signal: before.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    const during = new globalThis.AbortController();
    let clock = 0;
    const run = A.analyzeSweep(r, {
      signal: during.signal,
      // A clock that jumps, so the pacer yields at every step.
      now: () => (clock += 50),
      onProgress: f => {
        if (f > 0.2) during.abort();
      },
    });
    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('comparing named models', () => {
  const truth = { P: 4.2308, tc: 100.3, K: 25, sqrtEcosw: 0, sqrtEsinw: 0 };
  const times = Array.from(
    { length: 40 },
    (_, i) => 100 + i * 0.61 + 0.2 * Math.sin(i * 7.1)
  );
  const base = {
    P: { lo: 4.1, hi: 4.4 },
    tc: { lo: 99.5, hi: 101.5 },
    jitter: { mode: 'fixed', value: 0 },
  };
  const circular = {
    model: { id: 'rv-keplerian' },
    parameters: {
      ...base,
      sqrtEcosw: { mode: 'fixed', value: 0 },
      sqrtEsinw: { mode: 'fixed', value: 0 },
    },
  };
  const eccentric = { model: { id: 'rv-keplerian' }, parameters: { ...base } };
  const data = syntheticRv({ seed: 'cmp', times, sigma: 5, gamma: 3, truth });
  const fits = () => [
    {
      label: 'circular',
      fit: fitOnce(circular, data),
      request: circular,
      data,
    },
    {
      label: 'eccentric',
      fit: fitOnce(eccentric, data),
      request: eccentric,
      data,
    },
  ];

  test('ranks them with the constant, and finds which is nested in which', () => {
    const c = C.compareModels(fits(), { models: MODELS });
    expect(c.models.map(m => m.label)).toEqual([
      'constant',
      'circular',
      'eccentric',
    ]);
    expect(c.models.map(m => m.k)).toEqual([1, 4, 6]);
    expect(c.models.reduce((a, m) => a + m.weight, 0)).toBeCloseTo(1, 12);
    expect(c.models[0].dAic).toBeGreaterThan(100);
    const ce = c.nested.find(
      x => x.simpler === 'circular' && x.fuller === 'eccentric'
    );
    expect(ce).toMatchObject({ df: 2, boundary: false });
    expect(ce.p).toBeCloseTo(S.chiSquareSf(ce.delta, 2), 15);
    expect(
      c.nested.find(x => x.simpler === 'constant' && x.fuller === 'circular')
    ).toMatchObject({ df: 3, boundary: true });
    expect(c.nested.some(x => x.simpler === 'eccentric')).toBe(false);
    expect(c.warnings.map(w => w.code)).toContain('boundary');
  });

  test('computes -2 ln L from the residuals, as a student would', () => {
    const d = {
      x: [1, 2, 3],
      y: [1, 2, 4],
      sigma: [1, 1, 2],
      rows: [0, 1, 2],
      groups: null,
    };
    const fit = {
      residuals: Float64Array.from([0.5, -0.5, 1]),
      nuisance: null,
    };
    const byHand =
      0.25 +
      0.25 +
      0.25 +
      Math.log(2 * Math.PI) * 2 +
      Math.log(2 * Math.PI * 4);
    expect(C.minusTwoLnL(fit, d).value).toBeCloseTo(byHand, 12);
    const jittered = { ...fit, nuisance: { jitter: { value: 1 } } };
    const withJitter =
      0.25 / 2 +
      0.25 / 2 +
      1 / 5 +
      2 * Math.log(2 * Math.PI * 2) +
      Math.log(2 * Math.PI * 5);
    expect(C.minusTwoLnL(jittered, d).value).toBeCloseTo(withJitter, 12);
    const unweighted = C.minusTwoLnL(fit, { ...d, sigma: null });
    expect(unweighted.extra).toBe(1);
    expect(unweighted.value).toBeCloseTo(
      3 * Math.log((2 * Math.PI * 1.5) / 3) + 3,
      12
    );
  });

  test('refuses fits to other data, and fits that failed', () => {
    const [a, b] = fits();
    const masked = {
      ...data,
      rows: data.rows.slice(1),
      y: data.y.slice(1),
      x: data.x.slice(1),
      sigma: data.sigma.slice(1),
    };
    const c = C.compareModels(
      [
        a,
        { ...b, data: masked },
        { label: 'broken', fit: { status: 'failed' }, data },
      ],
      { models: MODELS }
    );
    expect(c.refused).toEqual([
      { label: 'eccentric', reason: 'otherData' },
      { label: 'broken', reason: 'notFitted' },
    ]);
    expect(c.models.map(m => m.label)).toEqual(['constant', 'circular']);
  });

  test('reads structure in residuals: the runs test and the lag-one correlation', () => {
    const d = {
      x: range(0, 1, 40),
      sigma: new Array(40).fill(1),
      rows: [],
      y: [],
    };
    const blocky = {
      residuals: Float64Array.from({ length: 40 }, (_, i) => (i < 20 ? 1 : -1)),
    };
    const alternating = {
      residuals: Float64Array.from({ length: 40 }, (_, i) => (i % 2 ? 1 : -1)),
    };
    expect(C.residualSummary(blocky, d).runsZ).toBeLessThan(-5);
    expect(C.residualSummary(blocky, d).lag1).toBeGreaterThan(0.9);
    expect(C.residualSummary(alternating, d).runsZ).toBeGreaterThan(5);
    expect(C.residualSummary(alternating, d).lag1).toBeLessThan(-0.9);
  });

  test('a circular truth is rarely called eccentric: the test holds its size', () => {
    let rejected = 0;
    const seeds = 40;
    for (let s = 0; s < seeds; s++) {
      const d = syntheticRv({
        seed: `size-${s}`,
        times,
        sigma: 5,
        gamma: 3,
        truth,
      });
      const c = C.compareModels(
        [
          {
            label: 'circular',
            fit: fitOnce(circular, d),
            request: circular,
            data: d,
          },
          {
            label: 'eccentric',
            fit: fitOnce(eccentric, d),
            request: eccentric,
            data: d,
          },
        ],
        { models: MODELS }
      );
      if (c.nested.find(x => x.simpler === 'circular').p < 0.05) rejected++;
    }
    // 5% nominal; tools/analysis-validate.mjs measures it over 400 seeds.
    expect(rejected / seeds).toBeLessThan(0.2);
  }, 60_000);
});
