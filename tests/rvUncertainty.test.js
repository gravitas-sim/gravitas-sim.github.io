import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  ASSUMPTIONS,
  MC_LIMITS,
  OUTCOME,
  REFUSED,
  TRIAL,
  aliasFamilies,
  gaussianStream,
  histogram,
  percentile,
  refineAtTrough,
  refitTrial,
  resampleAtEpochs,
  runMonteCarlo,
  summarise,
  validateSpec,
} from '../js/rvUncertainty.js';
import { periodSearch, weightsFor } from '../js/rvFit.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

/** Run everything without waiting for frames. */
const NOW = { yieldTo: () => Promise.resolve() };

/**
 * A synthetic recording.
 *
 * @param {object} spec - truth, epochs (days), sigma, seed
 * @returns {Array<object>} Measurements shaped like js/rvSurvey.js output
 */
function recording({ truth, days, sigma, seed = 'data' }) {
  const g = gaussianStream(seed);
  return days.map(day => ({
    day,
    rv:
      truth.gamma +
      truth.K * Math.sin((2 * Math.PI * day) / truth.period + truth.phase) +
      sigma * g(),
    sigma,
    quality: 'ok',
    missed: false,
  }));
}

const evenly = (n, step) => Array.from({ length: n }, (_, i) => i * step);

/** A well-sampled run: forty epochs over a fortnight, one clear period. */
function wellSampled() {
  const truth = { period: 3.5, K: 40, gamma: -3, phase: 1.1 };
  const points = recording({ truth, days: evenly(40, 0.37), sigma: 4 });
  const fit = periodSearch(points, {
    minPeriod: 1,
    maxPeriod: 10,
    samples: 3000,
  }).best;
  return { truth, points, fit, bounds: { minPeriod: 1, maxPeriod: 10 } };
}

describe('the seeded stream', () => {
  test('the same seed gives the same sequence', () => {
    const a = gaussianStream('abc');
    const b = gaussianStream('abc');
    const first = Array.from({ length: 20 }, () => a());
    const second = Array.from({ length: 20 }, () => b());
    expect(first).toEqual(second);
  });

  test('different seeds give different sequences', () => {
    const a = Array.from({ length: 20 }, gaussianStream('abc'));
    const b = Array.from({ length: 20 }, gaussianStream('abd'));
    expect(a).not.toEqual(b);
  });

  test('it is standard normal to within sampling error', () => {
    const g = gaussianStream('moments');
    const n = 40000;
    let sum = 0;
    let sumSq = 0;
    let sumQuad = 0;
    for (let i = 0; i < n; i++) {
      const x = g();
      expect(Number.isFinite(x)).toBe(true);
      sum += x;
      sumSq += x * x;
      sumQuad += x * x * x * x;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    // Standard error of the mean is 1/sqrt(n) = 0.005; three of those.
    expect(Math.abs(mean)).toBeLessThan(0.015);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
    // Kurtosis 3 for a Gaussian. Catches a stream that is uniform-ish or a
    // Box-Muller that dropped its second value and re-derived it wrongly.
    expect(Math.abs(sumQuad / n - 3)).toBeLessThan(0.2);
  });
});

describe('the synthetic runs', () => {
  test('keep the epochs and the sigmas, and change only the velocities', () => {
    const { points, fit } = wellSampled();
    const model = points.map(
      p =>
        fit.gamma +
        fit.K * Math.sin((2 * Math.PI * p.day) / fit.period + fit.phase)
    );
    const drawn = resampleAtEpochs(points, model, gaussianStream('r'));
    expect(drawn.map(p => p.day)).toEqual(points.map(p => p.day));
    expect(drawn.map(p => p.sigma)).toEqual(points.map(p => p.sigma));
    expect(drawn.map(p => p.rv)).not.toEqual(points.map(p => p.rv));
    // Scattered about the model, not about the data.
    const residuals = drawn.map((p, i) => p.rv - model[i]);
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    expect(Math.abs(mean)).toBeLessThan(points[0].sigma);
  });

  test('a missed epoch never comes back as a measurement', () => {
    const points = [
      { day: 0, rv: 1, sigma: 2, quality: 'ok', missed: false },
      { day: 1, rv: 2, sigma: 2, quality: 'ok', missed: false },
    ];
    const drawn = resampleAtEpochs(points, [0, 0], gaussianStream('r'));
    expect(drawn.every(p => p.missed === false)).toBe(true);
  });
});

describe('finding the bottom of the trough', () => {
  test('it beats the grid point it starts from', () => {
    // The failure this exists for: a grid spaced to *find* a trough is far
    // coarser than the trough's own bottom, so without this every trial
    // returns the same grid period and the interval is zero-width.
    const { points, bounds } = wellSampled();
    const coarse = periodSearch(points, { ...bounds, samples: 200 });
    const weights = weightsFor(points);
    const fMin = 1 / bounds.maxPeriod;
    const fMax = 1 / bounds.minPeriod;
    const refined = refineAtTrough(
      points,
      1 / coarse.bestPeriod,
      (fMax - fMin) / (coarse.samples - 1),
      weights,
      { fMin, fMax }
    );
    expect(refined).not.toBe(null);
    expect(refined.chi2).toBeLessThanOrEqual(coarse.best.chi2);
    expect(refined.period).not.toBe(coarse.bestPeriod);
    // And it agrees with what a very fine grid would have found.
    const fine = periodSearch(points, { ...bounds, samples: 20000 });
    expect(Math.abs(refined.period - fine.bestPeriod)).toBeLessThan(0.01);
  });

  test('it refuses rather than returning nonsense on a degenerate run', () => {
    const same = [
      { day: 1, rv: 1, sigma: 1 },
      { day: 1, rv: 2, sigma: 1 },
      { day: 1, rv: 3, sigma: 1 },
    ];
    const out = refineAtTrough(same, 0.3, 0.01, weightsFor(same), {
      fMin: 0.1,
      fMax: 1,
    });
    expect(out === null || Number.isFinite(out.period)).toBe(true);
  });
});

describe('alias families', () => {
  test('one clump is one family', () => {
    const trials = Array.from({ length: 50 }, (_, i) => ({
      period: 3.5 + (i - 25) * 0.0005,
      K: 40,
    }));
    const families = aliasFamilies(trials, 14);
    expect(families).toHaveLength(1);
    expect(families[0].count).toBe(50);
    expect(families[0].fraction).toBe(1);
  });

  test('two clumps a resolvable distance apart are two families', () => {
    // 1/(2*baseline) with baseline 14 is 0.036 in frequency. These two are
    // 0.21 apart, which is far more.
    const trials = [
      ...Array.from({ length: 30 }, () => ({ period: 3.5, K: 40 })),
      ...Array.from({ length: 20 }, () => ({ period: 2.0, K: 30 })),
    ];
    const families = aliasFamilies(trials, 14);
    expect(families).toHaveLength(2);
    // Most populated first.
    expect(families[0].count).toBe(30);
    expect(families[0].period.median).toBeCloseTo(3.5, 6);
    expect(families[1].count).toBe(20);
    expect(families[0].fraction + families[1].fraction).toBeCloseTo(1, 12);
  });

  test('clustering is in frequency, so it works at both ends of the range', () => {
    // In period these pairs are 0.01 and 1.0 apart; in frequency both pairs
    // are the same distance apart, and both must be split the same way.
    const shortPair = [
      { period: 0.5, K: 1 },
      { period: 0.51, K: 1 },
    ];
    const longPair = [
      { period: 10, K: 1 },
      { period: 14, K: 1 },
    ];
    const baseline = 3;
    // 1/(2*3) = 0.167. Short pair: 2 - 1.961 = 0.039, under -> one family.
    expect(aliasFamilies(shortPair, baseline)).toHaveLength(1);
    // Long pair: 0.1 - 0.0714 = 0.029, also under -> one family.
    expect(aliasFamilies(longPair, baseline)).toHaveLength(1);
    // A pair genuinely further apart in frequency splits, at either end.
    expect(
      aliasFamilies(
        [
          { period: 0.5, K: 1 },
          { period: 1, K: 1 },
        ],
        baseline
      )
    ).toHaveLength(2);
  });

  test('an empty set has no families rather than one empty one', () => {
    expect(aliasFamilies([], 14)).toEqual([]);
  });

  test('the order is deterministic when two families tie', () => {
    const trials = [
      ...Array.from({ length: 10 }, () => ({ period: 5, K: 1 })),
      ...Array.from({ length: 10 }, () => ({ period: 2, K: 1 })),
    ];
    const once = aliasFamilies(trials, 14).map(f => f.period.median);
    const again = aliasFamilies([...trials].reverse(), 14).map(
      f => f.period.median
    );
    expect(once).toEqual(again);
  });
});

describe('percentiles', () => {
  test('they interpolate rather than snapping to a sample', () => {
    const sorted = [1, 2, 3, 4];
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 1)).toBe(4);
    expect(percentile(sorted, 0.5)).toBe(2.5);
  });

  test('one value is its own every percentile, and none is null', () => {
    expect(percentile([7], 0.16)).toBe(7);
    expect(percentile([], 0.5)).toBe(null);
  });
});

describe('what it refuses to attempt', () => {
  const base = () => {
    const { points, fit, bounds } = wellSampled();
    return { points, params: fit, ...bounds, trials: 100 };
  };

  test('no fit on screen', () => {
    expect(validateSpec({ ...base(), params: null }).reason).toBe(
      REFUSED.NO_FIT
    );
    expect(validateSpec({ ...base(), params: { period: 0 } }).reason).toBe(
      REFUSED.NO_FIT
    );
  });

  test('too few points', () => {
    const spec = base();
    const verdict = validateSpec({ ...spec, points: spec.points.slice(0, 3) });
    expect(verdict.reason).toBe(REFUSED.TOO_FEW_POINTS);
    expect(verdict.detail).toEqual({ n: 3, need: MC_LIMITS.minPoints });
  });

  test('no stated uncertainties, which is the one that matters', () => {
    // With every sigma zero there is nothing to propagate: every synthetic run
    // is the fit itself, every trial returns the same period, and the interval
    // would print as a perfectly determined answer. Refused by name.
    const spec = base();
    const bare = spec.points.map(p => ({ ...p, sigma: 0 }));
    expect(validateSpec({ ...spec, points: bare }).reason).toBe(
      REFUSED.NO_UNCERTAINTIES
    );
    // And half-stated is refused too, for the same reason weightsFor refuses
    // to mix them.
    const half = spec.points.map((p, i) => ({ ...p, sigma: i % 2 ? 0 : 4 }));
    expect(validateSpec({ ...spec, points: half }).reason).toBe(
      REFUSED.NO_UNCERTAINTIES
    );
  });

  test('bad bounds and impossible trial counts', () => {
    const spec = base();
    expect(validateSpec({ ...spec, minPeriod: 0 }).reason).toBe(
      REFUSED.BAD_BOUNDS
    );
    expect(validateSpec({ ...spec, maxPeriod: 0.5 }).reason).toBe(
      REFUSED.BAD_BOUNDS
    );
    expect(validateSpec({ ...spec, trials: 1 }).reason).toBe(
      REFUSED.BAD_TRIALS
    );
    expect(
      validateSpec({ ...spec, trials: MC_LIMITS.maxTrials + 1 }).reason
    ).toBe(REFUSED.BAD_TRIALS);
    expect(validateSpec({ ...spec, trials: NaN }).reason).toBe(
      REFUSED.BAD_TRIALS
    );
  });

  test('a refusal still carries the assumptions and never throws', async () => {
    const spec = base();
    const out = await runMonteCarlo(
      {
        ...spec,
        points: spec.points.map(p => ({ ...p, sigma: 0 })),
        seed: 'x',
      },
      NOW
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(REFUSED.NO_UNCERTAINTIES);
    expect(out.assumptions).toEqual(ASSUMPTIONS);
  });

  test('every refusal has a message in both languages', () => {
    for (const reason of Object.values(REFUSED)) {
      expect(typeof EN_DEFERRED[`rvfit.mc.refused.${reason}`]).toBe('string');
      expect(typeof ES_DEFERRED[`rvfit.mc.refused.${reason}`]).toBe('string');
    }
  });

  test('every assumption has a sentence in both languages', () => {
    for (const id of ASSUMPTIONS) {
      expect(typeof EN_DEFERRED[id]).toBe('string');
      expect(typeof ES_DEFERRED[id]).toBe('string');
    }
  });
});

describe('a well-sampled run', () => {
  test('one family, and an interval that contains the truth', async () => {
    const { truth, points, fit, bounds } = wellSampled();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 200, seed: 'well' },
      NOW
    );
    expect(out.ok).toBe(true);
    expect(out.families).toHaveLength(1);
    expect(out.multimodal).toBe(false);
    expect(out.succeeded).toBe(200);
    expect(out.complete).toBe(true);

    // A single interval is offered, because there is a single family.
    expect(out.period).not.toBe(null);
    expect(out.period.p16).toBeLessThan(truth.period);
    expect(out.period.p84).toBeGreaterThan(truth.period);
    expect(out.K.p16).toBeLessThan(truth.K);
    expect(out.K.p84).toBeGreaterThan(truth.K);
  });

  test('the interval is a property of the data, not of the grid', async () => {
    // The regression that motivated refineAtTrough: a zero-width interval
    // because every trial snapped to the same grid point.
    const { points, fit, bounds } = wellSampled();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 120, seed: 'grid' },
      NOW
    );
    expect(out.gridLimited).toBe(false);
    expect(out.distinctPeriods).toBeGreaterThan(50);
    expect(out.period.p84 - out.period.p16).toBeGreaterThan(0);
    // And a plausible width: a few parts in a thousand of the period, not a
    // number that would only arise from quantisation.
    const width = (out.period.p84 - out.period.p16) / out.period.median;
    expect(width).toBeGreaterThan(1e-4);
    expect(width).toBeLessThan(0.1);
  });

  test('a grid-limited result withholds the interval and says why', () => {
    const same = Array.from({ length: 60 }, () => ({
      status: TRIAL.OK,
      period: 3.5,
      K: 40,
    }));
    const out = summarise({
      trials: same,
      failures: { [TRIAL.NO_SEARCH]: 0, [TRIAL.NOT_FINITE]: 0 },
      spec: {
        seed: 's',
        minPeriod: 1,
        maxPeriod: 10,
        samples: 200,
        params: {},
      },
      requested: 60,
      baseline: 14,
    });
    expect(out.gridLimited).toBe(true);
    expect(out.distinctPeriods).toBe(1);
    expect(out.period).toBe(null);
    expect(out.K).toBe(null);
  });
});

describe('a sparse, aliased run', () => {
  /** Nine epochs, near-nightly, on a period short enough to alias. */
  const sparse = () => {
    const truth = { period: 1.31, K: 35, gamma: 2, phase: 0.4 };
    const days = [0, 1, 2, 3, 4, 12, 13, 14, 15];
    const points = recording({ truth, days, sigma: 6, seed: 'sparse' });
    const fit = periodSearch(points, {
      minPeriod: 0.5,
      maxPeriod: 5,
      samples: 5000,
    }).best;
    return { truth, points, fit, bounds: { minPeriod: 0.5, maxPeriod: 5 } };
  };

  test('the aliases are kept apart and no single interval is offered', async () => {
    const { points, fit, bounds } = sparse();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 200, seed: 'alias' },
      NOW
    );
    expect(out.ok).toBe(true);
    expect(out.families.length).toBeGreaterThan(1);
    expect(out.multimodal).toBe(true);

    // The whole point: nothing downstream can print "P = x +/- y" here.
    expect(out.period).toBe(null);
    expect(out.K).toBe(null);

    // Several families carry a real share of the trials, and the shares add up.
    const substantial = out.families.filter(f => f.fraction > 0.1);
    expect(substantial.length).toBeGreaterThan(1);
    const total = out.families.reduce((a, f) => a + f.fraction, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(out.families.reduce((a, f) => a + f.count, 0)).toBe(out.succeeded);
  });

  test('each family gets its own interval, and they do not overlap', async () => {
    const { points, fit, bounds } = sparse();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 200, seed: 'alias' },
      NOW
    );
    const big = out.families.filter(f => f.count > 5);
    for (const family of big) {
      expect(family.period.p16).toBeLessThanOrEqual(family.period.median);
      expect(family.period.median).toBeLessThanOrEqual(family.period.p84);
      expect(family.K.median).toBeGreaterThan(0);
    }
    // Distinct solutions, not slices of one distribution.
    const medians = big.map(f => f.period.median).sort((a, b) => a - b);
    for (let i = 1; i < medians.length; i++) {
      expect(medians[i]).toBeGreaterThan(medians[i - 1] * 1.05);
    }
  });
});

describe('a run with no signal in it', () => {
  test('it completes, claims nothing, and offers no single interval', async () => {
    const g = gaussianStream('null');
    const points = evenly(24, 0.6).map(day => ({
      day,
      rv: 5 * g(),
      sigma: 5,
      quality: 'ok',
      missed: false,
    }));
    const fit = periodSearch(points, {
      minPeriod: 1,
      maxPeriod: 10,
      samples: 2000,
    }).best;
    const out = await runMonteCarlo(
      {
        points,
        params: fit,
        minPeriod: 1,
        maxPeriod: 10,
        trials: 200,
        seed: 'z',
      },
      NOW
    );

    expect(out.ok).toBe(true);
    expect(out.succeeded).toBeGreaterThan(150);
    // Pure noise still produces a periodogram with a lowest point, and the
    // trials still cluster. What the report must not do is turn that into a
    // detection: there is no field here that says one.
    expect(out.multimodal).toBe(true);
    expect(out.period).toBe(null);
    expect(JSON.stringify(out)).not.toMatch(/detect|significan|confiden/i);
    // The amplitude the fit found is the noise, and the trials say so.
    const biggest = out.families[0];
    expect(biggest.K.median).toBeLessThan(3 * points[0].sigma);
  });
});

describe('reproducibility', () => {
  test('the same seed gives byte-identical results', async () => {
    const { points, fit, bounds } = wellSampled();
    const spec = { points, params: fit, ...bounds, trials: 80, seed: 'repeat' };
    const a = await runMonteCarlo(spec, NOW);
    const b = await runMonteCarlo(spec, NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('a different seed gives a different draw but a compatible answer', async () => {
    const { points, fit, bounds } = wellSampled();
    const a = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 120, seed: 'one' },
      NOW
    );
    const b = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 120, seed: 'two' },
      NOW
    );
    expect(a.period.median).not.toBe(b.period.median);
    // Same data, so the two intervals must overlap; if they did not, the
    // Monte Carlo would be measuring the seed rather than the noise.
    expect(a.period.p16).toBeLessThan(b.period.p84);
    expect(b.period.p16).toBeLessThan(a.period.p84);
  });

  test('the export block carries everything needed to reproduce the run', async () => {
    const { points, fit, bounds } = wellSampled();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 60, seed: 'export-me' },
      NOW
    );
    expect(out.spec).toMatchObject({
      trials: 60,
      seed: 'export-me',
      minPeriod: bounds.minPeriod,
      maxPeriod: bounds.maxPeriod,
      model: 'circular-single',
      errors: 'independentGaussian',
      // The one field that says the synthetic runs came from the student's
      // fit and not from the answer.
      resampledAbout: 'studentFit',
    });
    expect(out.spec.samples).toBeGreaterThan(0);
    expect(out.spec.epochs).toBe(points.length);
    expect(Number.isFinite(out.spec.seedNormalised)).toBe(true);
    expect(out.spec.fit.period).toBe(fit.period);

    // And re-running from the exported block alone reproduces it.
    const again = await runMonteCarlo(
      {
        points,
        params: out.spec.fit,
        minPeriod: out.spec.minPeriod,
        maxPeriod: out.spec.maxPeriod,
        samples: out.spec.samples,
        trials: out.spec.trials,
        seed: out.spec.seed,
      },
      NOW
    );
    expect(again.period).toEqual(out.period);
    expect(again.families).toEqual(out.families);
  });
});

describe('progress, cancellation and failures', () => {
  test('progress is reported and ends at the total', async () => {
    const { points, fit, bounds } = wellSampled();
    const seen = [];
    await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 60, seed: 'p' },
      { ...NOW, onProgress: p => seen.push(p) }
    );
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toEqual({ done: 60, total: 60 });
    // Monotonic, and never past the total.
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i].done).toBeGreaterThanOrEqual(seen[i - 1].done);
      expect(seen[i].done).toBeLessThanOrEqual(60);
    }
  });

  test('cancelling stops early and says the result is incomplete', async () => {
    const { points, fit, bounds } = wellSampled();
    let done = 0;
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 400, seed: 'c' },
      {
        ...NOW,
        onProgress: p => {
          done = p.done;
        },
        shouldCancel: () => done >= 24,
      }
    );
    expect(out.cancelled).toBe(true);
    expect(out.complete).toBe(false);
    expect(out.completed).toBeLessThan(400);
    expect(out.completed).toBeGreaterThan(0);
    expect(out.requested).toBe(400);
    // A partial run is still a real result with a smaller n, summarised by
    // exactly the same code.
    expect(out.families.length).toBeGreaterThan(0);
    expect(out.families.reduce((a, f) => a + f.count, 0)).toBe(out.succeeded);
  });

  test('a cancelled run is the prefix of the full one', async () => {
    // Which is what makes a partial result trustworthy: it is the first n
    // trials of the run that was asked for, not a different run.
    const { points, fit, bounds } = wellSampled();
    const spec = { points, params: fit, ...bounds, seed: 'prefix' };
    const short = await runMonteCarlo({ ...spec, trials: 60 }, NOW);
    let done = 0;
    const cut = await runMonteCarlo(
      { ...spec, trials: 400 },
      {
        ...NOW,
        onProgress: p => {
          done = p.done;
        },
        shouldCancel: () => done >= 60,
      }
    );
    // Cancellation lands on a batch boundary by design, so the count is the
    // batch multiple at or after the threshold rather than the threshold.
    expect(cut.completed).toBe(60);
    expect(cut.completed % 12).toBe(0);
    expect(cut.families).toEqual(short.families);
  });

  test('failed trials are counted by reason, not swallowed', () => {
    const out = summarise({
      trials: [
        { status: TRIAL.OK, period: 3.5, K: 40 },
        { status: TRIAL.NO_SEARCH },
        { status: TRIAL.NOT_FINITE },
        { status: TRIAL.OK, period: 3.51, K: 41 },
      ],
      failures: { [TRIAL.NO_SEARCH]: 1, [TRIAL.NOT_FINITE]: 1 },
      spec: {
        seed: 's',
        minPeriod: 1,
        maxPeriod: 10,
        samples: 200,
        params: {},
      },
      requested: 4,
      baseline: 14,
    });
    expect(out.completed).toBe(4);
    expect(out.succeeded).toBe(2);
    expect(out.failed).toBe(2);
    expect(out.failures).toEqual({ noSearch: 1, notFinite: 1 });
    // Failures make a run incomplete even when none was cancelled.
    expect(out.complete).toBe(false);
  });

  test('a trial that cannot be fitted is reported rather than thrown', () => {
    // Three points at one instant: the normal equations are singular at every
    // period, so there is no fit to be had at any of them.
    const degenerate = [
      { day: 1, rv: 10, sigma: 1 },
      { day: 1, rv: 12, sigma: 1 },
      { day: 1, rv: 11, sigma: 1 },
    ];
    const out = refitTrial(degenerate, {
      minPeriod: 1,
      maxPeriod: 10,
      samples: 200,
    });
    expect(Object.values(TRIAL)).toContain(out.status);
  });

  test('every failure reason has a message in both languages', () => {
    for (const status of Object.values(TRIAL)) {
      if (status === TRIAL.OK) continue;
      expect(typeof EN_DEFERRED[`rvfit.mc.failed.${status}`]).toBe('string');
      expect(typeof ES_DEFERRED[`rvfit.mc.failed.${status}`]).toBe('string');
    }
  });
});

describe('the simulation truth is not in the inference', () => {
  test('the module does not reach for it, structurally', () => {
    // Not a stylistic check. An interval computed from the answer would look
    // exactly like a good one and would be a demonstration of nothing, so the
    // absence is asserted rather than trusted.
    const source = readFileSync('js/rvUncertainty.js', 'utf8');
    const code = source
      .split('\n')
      .filter(
        line => !line.trim().startsWith('//') && !line.trim().startsWith('*')
      )
      .join('\n');
    expect(code).not.toMatch(/truthParameters|revealTruth|isRevealed/);
    expect(code).not.toMatch(/from '\.\/rvWorkspace\.js'/);
    expect(code).not.toMatch(/radialVelocity\.js|physics\.js/);
  });

  test('the result never mentions a truth', async () => {
    const { points, fit, bounds } = wellSampled();
    const out = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 60, seed: 't' },
      NOW
    );
    expect(JSON.stringify(out)).not.toMatch(/truth|revealed/i);
  });
});

describe('the histogram', () => {
  test('it bins, and the counts add up', () => {
    const h = histogram([1, 2, 2, 3, 3, 3, 4], 4);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(7);
    expect(h.n).toBe(7);
    expect(h.peak).toBe(Math.max(...h.counts));
    expect(h.lo).toBe(1);
    expect(h.hi).toBe(4);
  });

  test('a single repeated value gets a drawable axis rather than a zero one', () => {
    const h = histogram([5, 5, 5, 5], 10);
    expect(h.hi).toBeGreaterThan(h.lo);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(4);
    expect(h.counts.every(Number.isFinite)).toBe(true);
  });

  test('nothing to bin is null, not an empty chart', () => {
    expect(histogram([])).toBe(null);
    expect(histogram([NaN, Infinity])).toBe(null);
  });
});

describe('refinement never leaves the range it was told to search', () => {
  /**
   * A 1.999-day sinusoid, searched over 2 to 3 days.
   *
   * The truth sits just outside the low edge, so the grid must pin to the
   * 2-day boundary - and the first version of refineAtTrough then bracketed
   * `best +/- step`, walked off the end, and returned 1.99666. A search told
   * to consider only 2 to 3 days must not answer 1.997.
   */
  const edgeCase = () => {
    const g = gaussianStream('edge');
    const points = Array.from({ length: 30 }, (_, i) => {
      const day = i * 0.31;
      return {
        day,
        rv: 5 + 30 * Math.sin((2 * Math.PI * day) / 1.999 + 0.7) + 3 * g(),
        sigma: 3,
        quality: 'ok',
        missed: false,
      };
    });
    const bounds = { minPeriod: 2, maxPeriod: 3 };
    const grid = periodSearch(points, { ...bounds, samples: 400 });
    return { points, bounds, grid };
  };

  test('the grid pins to the boundary, as it must', () => {
    const { grid } = edgeCase();
    expect(grid.bestPeriod).toBeGreaterThanOrEqual(2);
    expect(grid.bestPeriod).toBeLessThanOrEqual(3);
    expect(grid.bestPeriod).toBeCloseTo(2, 3);
  });

  test('every accepted trial stays inside 2 to 3 days', async () => {
    const { points, bounds, grid } = edgeCase();
    const out = await runMonteCarlo(
      { points, params: grid.best, ...bounds, trials: 200, seed: 'edge' },
      NOW
    );
    expect(out.ok).toBe(true);
    expect(out.succeeded).toBeGreaterThan(150);
    for (const family of out.families) {
      expect(family.period.min).toBeGreaterThanOrEqual(2);
      expect(family.period.max).toBeLessThanOrEqual(3);
    }
  });

  test('the boundary itself stays a candidate rather than being skipped', () => {
    // Clamping the bracket must not mean losing the edge: when the trough's
    // lowest point IS the boundary, the boundary is the answer.
    const { points, bounds, grid } = edgeCase();
    const fMin = 1 / bounds.maxPeriod;
    const fMax = 1 / bounds.minPeriod;
    const step = (fMax - fMin) / (grid.samples - 1);
    const refined = refineAtTrough(points, fMax, step, weightsFor(points), {
      fMin,
      fMax,
    });
    expect(refined).not.toBe(null);
    expect(refined.period).toBeGreaterThanOrEqual(bounds.minPeriod);
    expect(refined.period).toBeLessThanOrEqual(bounds.maxPeriod);
    // It found the edge, because that is where the minimum is.
    expect(refined.period).toBeCloseTo(2, 4);
  });

  test('refinement is refused rather than guessed without bounds', () => {
    const { points } = edgeCase();
    const w = weightsFor(points);
    expect(refineAtTrough(points, 0.4, 0.01, w, undefined)).toBe(null);
    expect(refineAtTrough(points, 0.4, 0.01, w, { fMin: 0, fMax: 1 })).toBe(
      null
    );
    expect(refineAtTrough(points, 0.4, 0.01, w, { fMin: 1, fMax: 0.5 })).toBe(
      null
    );
  });

  test('a worse refinement is discarded and the grid fit kept', () => {
    // The floor: refitTrial must never trade a valid result for one that is
    // out of range or higher in chi-square.
    const { points, bounds, grid } = edgeCase();
    const out = refitTrial(points, { ...bounds, samples: 400 });
    expect(out.status).toBe(TRIAL.OK);
    expect(out.chi2).toBeLessThanOrEqual(grid.best.chi2 + 1e-9);
    expect(out.period).toBeGreaterThanOrEqual(bounds.minPeriod);
    expect(out.period).toBeLessThanOrEqual(bounds.maxPeriod);
  });

  test('a narrow range is respected too', async () => {
    // Bounds tighter than the grid step: the bracket collapses onto the range
    // and nothing may escape it.
    const { points } = edgeCase();
    const bounds = { minPeriod: 2.4, maxPeriod: 2.45 };
    const grid = periodSearch(points, { ...bounds, samples: 200 });
    const out = await runMonteCarlo(
      { points, params: grid.best, ...bounds, trials: 80, seed: 'narrow' },
      NOW
    );
    for (const family of out.families) {
      expect(family.period.min).toBeGreaterThanOrEqual(2.4);
      expect(family.period.max).toBeLessThanOrEqual(2.45);
    }
  });
});

describe('a run is bound to the inputs it started from', () => {
  test('the snapshot is frozen and the caller cannot reach into it', async () => {
    const { points, fit, bounds } = wellSampled();
    const live = points.map(p => ({ ...p }));
    const params = { ...fit };
    const out = await runMonteCarlo(
      { points: live, params, ...bounds, trials: 60, seed: 'bound' },
      NOW
    );
    // Mutating the caller's objects afterwards cannot change what ran.
    const before = JSON.stringify(out.spec);
    live[0].rv = 99999;
    params.period = 99;
    expect(JSON.stringify(out.spec)).toBe(before);
    expect(out.spec.fit.period).toBe(fit.period);
  });

  test('the report carries the key of the inputs it describes', async () => {
    const { points, fit, bounds } = wellSampled();
    const out = await runMonteCarlo(
      {
        points,
        params: fit,
        ...bounds,
        trials: 60,
        seed: 'k',
        inputsKey: 'RECORDING-A/3.5',
      },
      NOW
    );
    expect(out.inputsKey).toBe('RECORDING-A/3.5');
    expect(out.spec.inputsKey).toBe('RECORDING-A/3.5');
  });

  test('the three outcomes are named, not inferred from two booleans', async () => {
    const { points, fit, bounds } = wellSampled();
    const complete = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 60, seed: 'o' },
      NOW
    );
    expect(complete.outcome).toBe(OUTCOME.COMPLETE);

    let done = 0;
    const cancelled = await runMonteCarlo(
      { points, params: fit, ...bounds, trials: 400, seed: 'o' },
      {
        ...NOW,
        onProgress: p => {
          done = p.done;
        },
        shouldCancel: () => done >= 24,
      }
    );
    expect(cancelled.outcome).toBe(OUTCOME.CANCELLED);

    const partial = summarise({
      trials: [
        { status: TRIAL.OK, period: 3.5, K: 40 },
        { status: TRIAL.NO_SEARCH },
      ],
      failures: { [TRIAL.NO_SEARCH]: 1, [TRIAL.NOT_FINITE]: 0 },
      spec: {
        seed: 's',
        minPeriod: 1,
        maxPeriod: 10,
        samples: 200,
        params: {},
      },
      requested: 2,
      baseline: 14,
    });
    expect(partial.outcome).toBe(OUTCOME.PARTIAL);
    expect(partial.cancelled).toBe(false);
  });

  test('every outcome has a sentence in both languages', () => {
    for (const outcome of Object.values(OUTCOME)) {
      expect(typeof EN_DEFERRED[`rvfit.mc.outcome.${outcome}`]).toBe('string');
      expect(typeof ES_DEFERRED[`rvfit.mc.outcome.${outcome}`]).toBe('string');
    }
    expect(typeof EN_DEFERRED['rvfit.mc.stale']).toBe('string');
    expect(typeof ES_DEFERRED['rvfit.mc.stale']).toBe('string');
  });
});
