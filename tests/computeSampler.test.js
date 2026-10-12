import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { entryOf } from '../js/compute/catalogue.js';

// =============================================================================
// The posterior-sampling notebook's sampler, held to exact answers
// -----------------------------------------------------------------------------
// The sampler is the notebook's own sampler cell, written in NumPy alone: the
// affine-invariant ensemble sampler of Goodman and Weare (2010), the stretch
// move, on four independent ensembles. Prompt 103's gate (SAMPLER_GATE.md)
// measured the same algorithm on four problems whose answers are known, and
// left posterior sampling to the compute page. This holds the notebook's
// sampler to three of those problems (the fourth, the transit, is held to the
// notebook's own grid in the same run: tests/computeCurriculum.test.js), with
// the gate's own accuracy criteria, which were fixed before any prototype
// existed and are not moved here:
//
//   G, P and T  the mean within 0.10 sd of the exact one, the sd within 10
//               percent, the 16th, 50th and 84th percentiles within 0.15 sd;
//               for G also every correlation within 0.10.
//   B           the means within 0.10 sd, the sds within 15 percent, the
//               percentiles of x1 and x2 within 0.20 sd of the exact
//               marginals, and the slope of x2 on x1 squared in [-0.036,
//               -0.024] (exact -0.03).
//   a problem passes with at least 9 of 10 replicates passing.
//
// And the refusal rules the gate fixed and the notebook keeps: a run far too
// short to have converged, and a bimodal target whose modes the ensembles never
// cross, must be refused (no interval reported) in every replicate.
//
// The replicates were run by tools/compute-answers.mjs --sampler under CPython
// (tools/compute-sampler-cases.py), which executes the notebook's sampler cell
// as vendored. The file carries that cell's notebook hash, so a changed
// notebook makes it stale and this test says so. The exact answers below are
// worked out here from the formulas, never read from the file.
//
// What the gate also found, and this reproduces: at these run lengths the
// sampler's own diagnostics (the 50-autocorrelation-time rule) refuse most runs
// of G, B and P although the draws are accurate. That is why the notebook's
// default run is long and its limits are stated, and why the investigation
// asks the student to shorten a run and read the refusal.
// =============================================================================

const cases = JSON.parse(
  readFileSync('tests/fixtures/compute/sampler-cases.json', 'utf8')
);
const reps = name => cases.cases[name].replicates;
const passes = (list, test) => list.filter(test).length;

/** The standard normal distribution function (Abramowitz and Stegun 7.1.26 on erf, 1.5e-7). */
const Phi = x => {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp((-x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
};
const Z = [-1, 0, 1]; // the 16th, 50th and 84th percentiles of a normal, to the 15.87 percent used

describe('the fixture is of this notebook', () => {
  test('carries the hash of the sampler’s own notebook, so a changed sampler makes it stale', () => {
    expect(cases.notebook.cellsSha256).toBe(
      entryOf('posterior-sampling').cellsSha256
    );
  });
  test('has ten replicates of each case', () => {
    for (const name of ['G', 'B', 'P', 'short', 'bimodal'])
      expect(reps(name)).toHaveLength(10);
  });
});

describe('G: a six-dimensional correlated Gaussian', () => {
  const { sds, means, rho } = cases.cases.G.problem;
  const ok = r =>
    r.mean.every((m, i) => Math.abs(m - means[i]) / sds[i] <= 0.1) &&
    r.sd.every((s, i) => Math.abs(s / sds[i] - 1) <= 0.1) &&
    r.pct.every((row, i) =>
      row.every(
        (q, j) => Math.abs(q - (means[i] + Z[j] * sds[i])) / sds[i] <= 0.15
      )
    ) &&
    r.corr.every((row, i) =>
      row.every((c, j) => Math.abs(c - rho ** Math.abs(i - j)) <= 0.1)
    );
  test('9 of 10 replicates meet every criterion of the gate', () => {
    expect(passes(reps('G'), ok)).toBeGreaterThanOrEqual(9);
  });
  test('and in fact all ten do, and the means are within a tenth of a standard deviation', () => {
    expect(passes(reps('G'), ok)).toBe(10);
  });
});

describe('B: the twisted Gaussian (a banana)', () => {
  // x1 ~ N(0, 10^2); x2 = 0.03 (100 - x1^2) + N(0, 1). The marginal of x2 is
  // worked out here by integrating the conditional over x1.
  const cdf2 = x => {
    let total = 0;
    const n = 4000;
    const lo = -60;
    const hi = 60;
    const h = (hi - lo) / n;
    for (let i = 0; i < n; i++) {
      const x1 = lo + (i + 0.5) * h;
      const density =
        Math.exp(-(x1 * x1) / 200) / (10 * Math.sqrt(2 * Math.PI));
      total += density * Phi(x - 3 + 0.03 * x1 * x1) * h;
    }
    return total;
  };
  const quantile2 = p => {
    let lo = -40;
    let hi = 10;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (cdf2(mid) < p) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const exact = {
    mean: [0, 0],
    sd: [10, Math.sqrt(19)],
    pct: [
      [-10, 0, 10],
      [quantile2(0.1587), quantile2(0.5), quantile2(0.8413)],
    ],
  };
  test('the exact marginals are what the problem says', () => {
    // Var(x2) = 0.03^2 Var(x1^2) + 1 = 0.0009 * 2 * 10^4 + 1 = 19. The
    // marginal is skewed (a long tail below): its median, 1.36, is above its mean, 0.
    expect(exact.sd[1] ** 2).toBeCloseTo(19, 12);
    expect(exact.pct[1][1]).toBeGreaterThan(1.3);
    expect(exact.pct[1][1]).toBeLessThan(1.42);
  });
  const ok = r =>
    r.mean.every((m, i) => Math.abs(m - exact.mean[i]) / exact.sd[i] <= 0.1) &&
    r.sd.every((s, i) => Math.abs(s / exact.sd[i] - 1) <= 0.15) &&
    r.pct.every((row, i) =>
      row.every((q, j) => Math.abs(q - exact.pct[i][j]) / exact.sd[i] <= 0.2)
    ) &&
    r.slope >= -0.036 &&
    r.slope <= -0.024;
  test('9 of 10 replicates meet every criterion of the gate', () => {
    expect(passes(reps('B'), ok)).toBeGreaterThanOrEqual(9);
  });
});

describe('P: a straight line with normal priors, a conjugate normal posterior', () => {
  const { x, y, sigma, tau } = cases.cases.P.problem;
  // Posterior precision = X^T X / sigma^2 + diag(1 / tau^2); mean = cov X^T y / sigma^2.
  const n = x.length;
  const a = [
    [
      n / sigma ** 2 + 1 / tau[0] ** 2,
      x.reduce((s, v) => s + v, 0) / sigma ** 2,
    ],
    [0, x.reduce((s, v) => s + v * v, 0) / sigma ** 2 + 1 / tau[1] ** 2],
  ];
  a[1][0] = a[0][1];
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  const cov = [
    [a[1][1] / det, -a[0][1] / det],
    [-a[1][0] / det, a[0][0] / det],
  ];
  const b = [
    y.reduce((s, v) => s + v, 0) / sigma ** 2,
    x.reduce((s, v, i) => s + v * y[i], 0) / sigma ** 2,
  ];
  const mean = [
    cov[0][0] * b[0] + cov[0][1] * b[1],
    cov[1][0] * b[0] + cov[1][1] * b[1],
  ];
  const sd = [Math.sqrt(cov[0][0]), Math.sqrt(cov[1][1])];
  const ok = r =>
    r.mean.every((m, i) => Math.abs(m - mean[i]) / sd[i] <= 0.1) &&
    r.sd.every((s, i) => Math.abs(s / sd[i] - 1) <= 0.1) &&
    r.pct.every((row, i) =>
      row.every(
        (q, j) => Math.abs(q - (mean[i] + Z[j] * sd[i])) / sd[i] <= 0.15
      )
    );
  test('the exact posterior is the one the problem defines', () => {
    expect(mean[0]).toBeGreaterThan(1.9);
    expect(mean[0]).toBeLessThan(2.5);
    expect(mean[1]).toBeGreaterThan(0.3);
    expect(mean[1]).toBeLessThan(0.5);
  });
  test('9 of 10 replicates meet every criterion of the gate', () => {
    expect(passes(reps('P'), ok)).toBeGreaterThanOrEqual(9);
  });
});

describe('the refusal rules the gate fixed', () => {
  test('ten runs of B far too short to have converged are all refused', () => {
    expect(reps('short').every(r => r.refused)).toBe(true);
    expect(reps('short').every(r => r.why.length > 0)).toBe(true);
  });
  test('ten bimodal runs, two ensembles in each mode, are all refused', () => {
    expect(reps('bimodal').every(r => r.refused)).toBe(true);
    // The reason is the one a bimodal target gives: the ensembles disagree.
    expect(reps('bimodal').every(r => r.why.some(w => /R-hat/.test(w)))).toBe(
      true
    );
  });
  test('a refused run says what failed in words, not only that it failed', () => {
    for (const r of [...reps('short'), ...reps('bimodal')])
      for (const w of r.why)
        expect(w).toMatch(/^(parameter \d|the acceptance)/);
  });
  test('as the gate found, the draws of a refused run can still be accurate: the run is refused, not the answer', () => {
    // G at 6,000 steps: most replicates are refused by the 50-tau rule while all ten are accurate (above).
    expect(reps('G').filter(r => r.refused).length).toBeGreaterThanOrEqual(5);
  });
});
