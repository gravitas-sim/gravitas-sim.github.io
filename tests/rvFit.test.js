import {
  usablePoints,
  weightsFor,
  WEIGHTING,
  EXCLUDED,
  modelCurve,
  fitAtPeriod,
  periodSearch,
  localMinima,
  foldOnPeriod,
  residualStructure,
  fitReport,
  MODEL_PARAMETERS,
} from '../js/rvFit.js';

/** A measurement in the shape js/rvSurvey.js produces. */
const point = (day, rv, sigma = 1, quality = 'ok') => ({
  day,
  rv,
  sigma,
  quality,
  missed: quality === 'missed',
});

/** Sample a circular signal on a schedule, optionally with fixed noise. */
function signal({
  days,
  period,
  K,
  phase = 0,
  gamma = 0,
  sigma = 1,
  noise = null,
}) {
  return days.map((d, i) =>
    point(
      d,
      gamma +
        K * Math.sin((2 * Math.PI * d) / period + phase) +
        (noise ? noise[i % noise.length] : 0),
      sigma
    )
  );
}

const evenly = (n, step) => Array.from({ length: n }, (_, i) => i * step);

describe('choosing what to fit', () => {
  test('missed epochs are excluded and counted, not treated as zero', () => {
    const pts = [
      point(0, 10),
      { day: 1, rv: null, sigma: null, quality: 'missed', missed: true },
      point(2, -10),
    ];
    const { usable, excluded, counts } = usablePoints(pts);
    expect(usable).toHaveLength(2);
    expect(counts.missed).toBe(1);
    expect(excluded[0].reason).toBe(EXCLUDED.MISSED);
  });

  test('a degraded reading is kept by default and droppable on request', () => {
    const pts = [point(0, 1), point(1, 2, 1, 'degraded'), point(2, 3)];
    expect(usablePoints(pts).usable).toHaveLength(3);
    expect(usablePoints(pts).counts.degraded).toBe(1);
    expect(usablePoints(pts, { dropDegraded: true }).usable).toHaveLength(2);
  });

  test('a non-finite reading or a negative sigma is not a measurement', () => {
    const pts = [
      point(0, NaN),
      point(1, 5, -2),
      point(2, 5, 1),
      { day: Infinity, rv: 1, sigma: 1, quality: 'ok' },
    ];
    const { usable, counts } = usablePoints(pts);
    expect(usable).toHaveLength(1);
    expect(counts.notFinite).toBe(2);
    expect(counts.badSigma).toBe(1);
  });
});

describe('weighting, including the case with no error bars', () => {
  test('positive uncertainties give inverse-variance weights', () => {
    const w = weightsFor([point(0, 1, 2), point(1, 1, 4)]);
    expect(w.mode).toBe(WEIGHTING.INVERSE_VARIANCE);
    expect(w.weights).toEqual([1 / 4, 1 / 16]);
  });

  test('zero uncertainties fall back to uniform and say why', () => {
    // Noiseless data is a real thing a student can generate, and the right
    // answer is an unweighted fit with no chi-square, not an infinity.
    const w = weightsFor([point(0, 1, 0), point(1, 1, 0)]);
    expect(w.mode).toBe(WEIGHTING.UNIFORM);
    expect(w.reason).toBe('noUncertainties');
    expect(w.weights).toEqual([1, 1]);
  });

  test('a mix of stated and missing uncertainties is uniform, and flagged', () => {
    const w = weightsFor([point(0, 1, 2), point(1, 1, 0)]);
    expect(w.mode).toBe(WEIGHTING.UNIFORM);
    expect(w.reason).toBe('mixedUncertainties');
  });

  test('an unweighted fit refuses to report a reduced chi-square', () => {
    const pts = signal({ days: evenly(20, 0.4), period: 3, K: 40, sigma: 0 });
    const fit = fitAtPeriod(pts, 3);
    expect(fit.weighting).toBe(WEIGHTING.UNIFORM);
    expect(fit.reducedChi2).toBeNull();
    // But the RMS is still meaningful and still reported.
    expect(fit.rms).toBeLessThan(1e-9);
  });
});

describe('fitting at a known period', () => {
  test('it recovers a noiseless circular signal exactly', () => {
    const truth = { period: 3.5247, K: 84, phase: 1.1, gamma: -14.7 };
    const pts = signal({ days: evenly(24, 0.3), ...truth, sigma: 1 });
    const fit = fitAtPeriod(pts, truth.period);
    expect(fit.K).toBeCloseTo(truth.K, 8);
    expect(fit.gamma).toBeCloseTo(truth.gamma, 8);
    expect(fit.phase).toBeCloseTo(truth.phase, 8);
    expect(fit.chi2).toBeLessThan(1e-16);
  });

  test('the amplitude comes back positive whatever the phase', () => {
    // K and phase are degenerate up to a sign flip and half a cycle; two
    // students comparing answers should be comparing the same number.
    for (const phase of [0, 1, 2, 3, 4, 5, 6]) {
      const pts = signal({ days: evenly(20, 0.37), period: 4, K: 30, phase });
      const fit = fitAtPeriod(pts, 4);
      expect(fit.K).toBeGreaterThan(0);
      expect(fit.phase).toBeGreaterThanOrEqual(0);
      expect(fit.phase).toBeLessThan(2 * Math.PI);
      // And it reproduces the curve regardless of which representation it chose.
      const back = modelCurve(fit, [0.3, 1.7, 2.9]);
      const want = modelCurve(
        { period: 4, K: 30, phase, gamma: 0 },
        [0.3, 1.7, 2.9]
      );
      back.forEach((v, i) => expect(v).toBeCloseTo(want[i], 8));
    }
  });

  test('it needs at least three points and says so by returning null', () => {
    expect(fitAtPeriod([point(0, 1), point(1, 2)], 3)).toBeNull();
    expect(
      fitAtPeriod(signal({ days: [0, 1, 2], period: 3, K: 5 }), 3)
    ).not.toBeNull();
  });

  test('degrees of freedom count all four parameters', () => {
    const pts = signal({ days: evenly(10, 0.4), period: 3, K: 20 });
    expect(fitAtPeriod(pts, 3).dof).toBe(10 - MODEL_PARAMETERS);
  });

  test('a rubbish period fits worse than the right one', () => {
    const pts = signal({ days: evenly(30, 0.31), period: 3.5, K: 60 });
    expect(fitAtPeriod(pts, 3.5).chi2).toBeLessThan(fitAtPeriod(pts, 2.1).chi2);
  });
});

describe('constant velocity', () => {
  const flat = evenly(25, 0.4).map(d => point(d, 12.5, 2));

  test('the fit finds the constant and essentially no amplitude', () => {
    const fit = fitAtPeriod(flat, 3.1);
    expect(fit.gamma).toBeCloseTo(12.5, 8);
    expect(fit.K).toBeLessThan(1e-9);
  });

  test('no period is meaningfully preferred over any other', () => {
    // The honest outcome for a flat dataset: the periodogram is featureless,
    // and the tool must not manufacture a period out of it.
    const search = periodSearch(flat, { minPeriod: 1, maxPeriod: 8 });
    const worst = Math.max(...search.grid.map(g => g.chi2));
    const best = Math.min(...search.grid.map(g => g.chi2));
    expect(worst - best).toBeLessThan(1e-9);
  });

  test('noisy constant velocity gives an amplitude consistent with the noise', () => {
    const noise = [1.4, -0.7, 0.2, -1.1, 0.9, 0.1, -0.4, 0.6];
    const pts = evenly(24, 0.4).map((d, i) =>
      point(d, 12.5 + noise[i % noise.length], 1)
    );
    const search = periodSearch(pts, { minPeriod: 1, maxPeriod: 8 });
    // Something will always fit best. The point is that it is small, not that
    // it is absent, and nothing here calls it a planet.
    expect(search.best.K).toBeLessThan(3);
  });
});

describe('the period search keeps its alternatives', () => {
  test('it finds the true period of a well-sampled signal', () => {
    const pts = signal({ days: evenly(40, 0.23), period: 3.1, K: 55 });
    const search = periodSearch(pts, { minPeriod: 1.5, maxPeriod: 8 });
    expect(search.bestPeriod).toBeCloseTo(3.1, 1);
    expect(search.best.K).toBeCloseTo(55, 0);
  });

  test('it returns the whole curve, not only the winner', () => {
    const pts = signal({ days: evenly(30, 0.3), period: 2.7, K: 40 });
    const search = periodSearch(pts, { minPeriod: 1, maxPeriod: 9 });
    expect(search.grid.length).toBeGreaterThan(100);
    expect(search.grid[0]).toHaveProperty('chi2');
    expect(search.minima.length).toBeGreaterThan(1);
    // Ranked, deepest first, with how much worse each one is.
    expect(search.minima[0].deltaChi2).toBeCloseTo(0, 6);
    expect(search.minima[1].deltaChi2).toBeGreaterThan(0);
  });

  test('sparse sampling leaves rival periods that fit almost as well', () => {
    // Twelve measurements taken close to one period apart: the classic alias.
    // Several periods fit nearly as well as the true one, and a tool that
    // reported only the lowest would be hiding the whole difficulty.
    const days = Array.from({ length: 12 }, (_, i) => i * 3.02);
    const pts = signal({ days, period: 3.0, K: 60, sigma: 5 });
    const search = periodSearch(pts, { minPeriod: 1, maxPeriod: 12 });
    const rivals = search.minima.filter(
      m => m.deltaChi2 < 1 && Math.abs(m.period - search.bestPeriod) > 0.05
    );
    expect(rivals.length).toBeGreaterThan(0);

    // The sharp version of the same point, and the reason this tool must never
    // print "period found" over the lowest trough: on this schedule the best
    // period is about 1.009 days and the TRUE period of 3.0 days fits with a
    // delta chi-square of zero to four decimal places. The winner is an alias,
    // the truth is a runner-up, and nothing in the data distinguishes them.
    expect(search.bestPeriod).toBeLessThan(1.5);
    const truth = search.minima.find(m => Math.abs(m.period - 3.0) < 0.05);
    expect(truth).toBeDefined();
    expect(truth.deltaChi2).toBeLessThan(1e-3);
  });

  test('bad bounds are refused rather than guessed at', () => {
    const pts = signal({ days: evenly(20, 0.4), period: 3, K: 20 });
    expect(periodSearch(pts, { minPeriod: 0, maxPeriod: 5 })).toBeNull();
    expect(periodSearch(pts, { minPeriod: 5, maxPeriod: 1 })).toBeNull();
    expect(periodSearch(pts, {})).toBeNull();
  });

  test('the search reports the bounds it actually used', () => {
    const pts = signal({ days: evenly(20, 0.4), period: 3, K: 20 });
    const search = periodSearch(pts, { minPeriod: 1.25, maxPeriod: 7.5 });
    expect(search.bounds).toEqual({ minPeriod: 1.25, maxPeriod: 7.5 });
    // Nothing outside them, ever.
    for (const g of search.grid) {
      expect(g.period).toBeGreaterThanOrEqual(1.25 - 1e-9);
      expect(g.period).toBeLessThanOrEqual(7.5 + 1e-9);
    }
  });

  test('localMinima ignores a monotonic curve', () => {
    const grid = [1, 2, 3, 4].map((p, i) => ({ period: p, chi2: 10 - i }));
    expect(localMinima(grid, 7)).toEqual([]);
  });
});

describe('folding and residuals', () => {
  test('phases land in [0,1) and the model is evaluated at each point', () => {
    const pts = signal({ days: evenly(12, 0.5), period: 2, K: 10 });
    const folded = foldOnPeriod(pts, fitAtPeriod(pts, 2));
    for (const f of folded) {
      expect(f.phase).toBeGreaterThanOrEqual(0);
      expect(f.phase).toBeLessThan(1);
      expect(Math.abs(f.residual)).toBeLessThan(1e-9);
    }
  });

  test('folding without a period gives nothing rather than NaN', () => {
    expect(foldOnPeriod([point(0, 1)], { period: 0 })).toEqual([]);
  });
});

describe('residual structure', () => {
  test('a good circular fit leaves residuals that change sign freely', () => {
    const noise = [0.9, -1.2, 0.4, 1.1, -0.6, -0.3, 1.4, -0.8, 0.2, -1.0];
    const pts = signal({
      days: evenly(30, 0.29),
      period: 3.3,
      K: 50,
      sigma: 1,
      noise,
    });
    const fit = fitAtPeriod(pts, 3.3);
    const s = residualStructure(foldOnPeriod(pts, fit));
    // Scattered noise changes sign about as often as chance predicts.
    expect(s.runsRatio).toBeGreaterThan(0.6);
  });

  test('an eccentric signal leaves structure the circular model cannot absorb', () => {
    // The case the whole diagnostic exists for. A genuinely eccentric orbit
    // fitted with a circle gets the period roughly right and leaves a residual
    // curve with a shape in it: long stretches of phase where the residuals
    // all have the same sign.
    const period = 4.0;
    const e = 0.6;
    const K = 60;
    const days = evenly(40, 0.21);
    const pts = days.map(d => {
      // True anomaly from the mean anomaly by a short Newton solve, then the
      // standard eccentric radial velocity with omega = 0.
      const M = ((2 * Math.PI * d) / period) % (2 * Math.PI);
      let E = M;
      for (let i = 0; i < 60; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      }
      const nu =
        2 *
        Math.atan2(
          Math.sqrt(1 + e) * Math.sin(E / 2),
          Math.sqrt(1 - e) * Math.cos(E / 2)
        );
      return point(d, K * (Math.cos(nu) + e), 1);
    });

    const search = periodSearch(pts, { minPeriod: 2, maxPeriod: 8 });
    // The period is still about right - eccentricity does not hide it.
    expect(search.bestPeriod).toBeCloseTo(period, 0);

    const folded = foldOnPeriod(pts, search.best);
    const s = residualStructure(folded);
    // Far fewer sign changes than chance, and strongly correlated neighbours:
    // the residuals have a shape.
    expect(s.runsRatio).toBeLessThan(0.5);
    expect(s.lag1).toBeGreaterThan(0.5);
    // And the residuals are large compared with the stated uncertainty, so
    // this is not a subtle effect being over-read.
    expect(search.best.rms).toBeGreaterThan(3);
  });

  test('too few points to say anything gives null rather than a verdict', () => {
    const pts = signal({ days: evenly(4, 1), period: 3, K: 10 });
    expect(
      residualStructure(foldOnPeriod(pts, fitAtPeriod(pts, 3)))
    ).toBeNull();
  });
});

describe('the report', () => {
  const pts = [
    ...signal({ days: evenly(20, 0.35), period: 3.2, K: 45, gamma: 5 }),
    { day: 7.2, rv: null, sigma: null, quality: 'missed', missed: true },
  ];

  test('it carries the assumptions with the numbers', () => {
    const report = fitReport(pts, fitAtPeriod(usablePoints(pts).usable, 3.2));
    expect(report.model).toBe('circular-single');
    expect(report.assumptions.length).toBeGreaterThanOrEqual(4);
    expect(report.assumptions.join(' ')).toMatch(/circular/i);
    expect(report.assumptions.join(' ')).toMatch(/sin i/);
  });

  test('it says how many epochs were planned, used and dropped', () => {
    const report = fitReport(pts, fitAtPeriod(usablePoints(pts).usable, 3.2));
    expect(report.planned).toBe(21);
    expect(report.used).toBe(20);
    expect(report.excluded.missed).toBe(1);
    expect(report.residuals).toHaveLength(20);
  });

  test('it attaches the search bounds and rival periods when given a search', () => {
    const usable = usablePoints(pts).usable;
    const search = periodSearch(usable, { minPeriod: 1, maxPeriod: 9 });
    const report = fitReport(pts, search.best, { search });
    expect(report.search.bounds).toEqual({ minPeriod: 1, maxPeriod: 9 });
    expect(report.search.minima.length).toBeGreaterThan(0);
    expect(report.search.minima.length).toBeLessThanOrEqual(5);
  });

  test('nothing in it claims a detection', () => {
    const usable = usablePoints(pts).usable;
    const search = periodSearch(usable, { minPeriod: 1, maxPeriod: 9 });
    const report = fitReport(pts, search.best, { search });
    const text = JSON.stringify(report).toLowerCase();
    expect(text).not.toMatch(/detect/);
    expect(text).not.toMatch(/significan/);
    expect(text).not.toMatch(/confidence/);
    expect(text).not.toMatch(/p-value|pvalue/);
  });

  test('it declines to report on nothing', () => {
    expect(fitReport([], { period: 3 })).toBeNull();
    expect(fitReport(pts, null)).toBeNull();
  });
});
