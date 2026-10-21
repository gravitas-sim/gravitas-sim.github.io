// =============================================================================
// Coverage intervals, labelled by the method that made them (Prompt 154)
// -----------------------------------------------------------------------------
// An interval here is a record, never a bare pair: { status, method, level,
// lo, hi, ... } with the method's id and the sentences it rests on, so a chart,
// a table or a student can say "a 68.27% profile-likelihood interval" and a
// reader can find what that assumes (STATISTICS.md). Nothing here is a
// posterior: a profile or a covariance interval is a frequentist coverage
// statement, and the kernel has no priors beyond a model's bounds.
//
// The numbers come from the fitter. A profile interval is read off a chi-square
// profile with js/inference/fit.js's `crossing`, which is the function the
// inference core already uses, so the values are the core's own; the covariance
// interval is a normal interval about a value whose sigma `covarianceAt`
// supplied.
// =============================================================================

import { crossing } from '../../inference/fit.js';
import {
  chi2Cdf,
  chi2Quantile,
  gammaP,
  normalQuantile,
  tQuantile,
} from './special.js';

const { Math, Number, Float64Array } = globalThis;

/** The methods an interval can carry as its label, and what each assumes. */
export const METHODS = Object.freeze({
  covariance: {
    label: 'covariance (linearised)',
    assumes: [
      'the model is linear in the parameters over the interval',
      'the error bars are right (or were scaled by the reduced chi-square)',
    ],
  },
  profile: {
    label: 'profile likelihood',
    assumes: [
      'Delta chi-square of the profile follows a chi-square on one degree of freedom (a regular model, the truth inside the bounds)',
      'the error bars are right (or were scaled by the reduced chi-square)',
      'a coverage statement about repeated data, not a posterior probability',
    ],
  },
  'student-t': {
    label: "Student's t",
    assumes: [
      'independent values from a normal distribution of unknown mean and variance',
    ],
  },
  'poisson-profile': {
    label: 'Poisson profile deviance',
    assumes: [
      'independent counts at a constant rate',
      'enough counts for the deviance to follow a chi-square on one degree of freedom (about 10 or more)',
    ],
  },
  percentile: {
    label: 'percentile of draws',
    assumes: [
      'the draws sample the distribution the interval is meant to describe',
    ],
  },
  'case-bootstrap': {
    label: 'case bootstrap, percentile',
    assumes: [
      'the rows are independent draws from one population',
      'the statistic is smooth enough for the percentile interval (a mean is; an extreme is not)',
    ],
  },
  'residual-bootstrap': {
    label: 'residual bootstrap, percentile',
    assumes: [
      'the model is right and the residuals are exchangeable (equal variance, no correlation)',
    ],
  },
  propagation: {
    label: 'Monte Carlo propagation, percentile',
    assumes: [
      'the parameters are jointly normal with the covariance given',
      'the function is evaluated exactly at every draw',
    ],
  },
});

const assumesOf = method => METHODS[method]?.assumes ?? [];
const refused = (code, why) => ({ status: 'refused', code, why });

/** The coverage of a central interval of k sigmas of a normal: erf(k / sqrt 2). */
export const levelOfSigma = k => gammaP(0.5, (k * k) / 2);
/** The number of sigmas of a central normal interval of the given coverage. */
export const sigmaOfLevel = level => normalQuantile((1 + level) / 2);

const ONE_SIGMA = levelOfSigma(1);

/**
 * A normal interval about a value: value +- z sigma.
 * @param {number} value - The fitted value
 * @param {number} sigma - Its standard deviation (from covarianceAt, scaled if the fit says so)
 * @param {{level?: number}} [opts] - Coverage, 0.6827 (one sigma) by default
 */
export function covarianceInterval(value, sigma, { level = ONE_SIGMA } = {}) {
  if (!Number.isFinite(value))
    return refused('value', 'the value is not a number');
  if (!(Number.isFinite(sigma) && sigma >= 0))
    return refused(
      'sigma',
      'the standard deviation is missing, negative or not finite'
    );
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const half = sigmaOfLevel(level) * sigma;
  return {
    status: 'ok',
    method: 'covariance',
    level,
    value,
    sigma,
    lo: value - half,
    hi: value + half,
    assumes: assumesOf('covariance'),
  };
}

/**
 * The interval where a chi-square profile stays within a level of its minimum.
 * Either `level` (a coverage, which sets Delta chi-square from the chi-square
 * distribution on one degree of freedom) or `deltaChi2` (which sets the level):
 * Delta chi-square = 1 is the 68.27% interval. A side the profile never
 * reaches is open (null), and says so.
 *
 * @param {Array<{value: number, chi2: number}>} points - The profile, sorted by value
 * @param {number} minimum - chi-square at the best fit
 * @param {{level?: number, deltaChi2?: number}} [opts]
 */
export function profileInterval(points, minimum, { level, deltaChi2 } = {}) {
  if (!Array.isArray(points) || points.length < 3)
    return refused('points', 'a profile needs at least three points');
  if (!Number.isFinite(minimum))
    return refused('minimum', 'the minimum is not a number');
  let delta = deltaChi2;
  let cover = level;
  if (delta === undefined) {
    cover = cover ?? ONE_SIGMA;
    if (!(cover > 0 && cover < 1))
      return refused('level', 'the level is not between 0 and 1');
    delta = chi2Quantile(cover, 1);
  } else {
    if (!(delta > 0))
      return refused('level', 'Delta chi-square must be positive');
    cover = chi2Cdf(delta, 1);
  }
  const [lo, hi] = crossing(points, minimum, delta);
  return {
    status: 'ok',
    method: 'profile',
    level: cover,
    deltaChi2: delta,
    lo,
    hi,
    open: [lo === null, hi === null],
    assumes: assumesOf('profile'),
  };
}

/** Student's t interval of the mean of independent values. */
export function studentInterval(samples, { level = 0.95 } = {}) {
  const n = samples?.length ?? 0;
  if (n < 2)
    return refused(
      'samples',
      'an interval of a mean needs at least two values'
    );
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  let m = 0;
  for (let i = 0; i < n; i++) m += samples[i];
  m /= n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (samples[i] - m) ** 2;
  const se = Math.sqrt(ss / (n - 1) / n);
  const dof = n - 1;
  const half = tQuantile((1 + level) / 2, dof) * se;
  return {
    status: 'ok',
    method: 'student-t',
    level,
    value: m,
    sigma: se,
    dof,
    lo: m - half,
    hi: m + half,
    assumes: assumesOf('student-t'),
  };
}

/**
 * The rate of a Poisson process and its profile-deviance interval. The counts
 * were taken in equal exposures `exposure` each (or one exposure per count, as
 * an array); the rate is the sum of the counts over the total exposure, which is
 * the maximum of the likelihood exactly. The interval is where the deviance
 * D = 2 (L - N - N ln (L / N)), L = rate x total exposure, stays under the
 * chi-square quantile of the level on one degree of freedom. With no counts the
 * lower end is 0 and the upper end the one-sided limit.
 */
export function poissonInterval(counts, { exposure = 1, level = 0.95 } = {}) {
  const n = counts?.length ?? 0;
  if (n < 1) return refused('counts', 'there are no counts');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  let N = 0;
  for (let i = 0; i < n; i++) {
    if (!(counts[i] >= 0))
      return refused('counts', 'a count is negative or not a number');
    N += counts[i];
  }
  const T = Array.isArray(exposure)
    ? exposure.reduce((a, b) => a + b, 0)
    : exposure * n;
  if (!(T > 0))
    return refused('exposure', 'the total exposure is not positive');
  const thr = chi2Quantile(level, 1);
  const rate = N / T;
  let lo = 0;
  let hi;
  if (N === 0) hi = thr / (2 * T);
  else {
    // x = L / N: the deviance is 2 N (x - 1 - ln x), zero at 1, rising both ways.
    const f = x => 2 * N * (x - 1 - Math.log(x)) - thr;
    const root = (a, b, rising) => {
      for (let i = 0; i < 200; i++) {
        const mid = 0.5 * (a + b);
        if (mid === a || mid === b) break;
        if (f(mid) > 0 === rising) b = mid;
        else a = mid;
      }
      return 0.5 * (a + b);
    };
    let top = 2;
    while (f(top) < 0 && top < 1e12) top *= 2;
    lo = root(0, 1, false) * rate;
    hi = root(1, top, true) * rate;
  }
  return {
    status: 'ok',
    method: 'poisson-profile',
    level,
    rate,
    total: N,
    exposure: T,
    lo,
    hi,
    assumes: assumesOf('poisson-profile'),
  };
}

/**
 * The central interval of a set of draws: the (1 - level) / 2 and (1 + level) / 2
 * quantiles by linear interpolation of the sorted draws. `method` is the label
 * of the scheme that produced the draws (a bootstrap, a propagation).
 */
export function percentileInterval(
  samples,
  { level = 0.95, method = 'percentile' } = {}
) {
  const sorted = Float64Array.from(samples).filter(Number.isFinite).sort();
  const n = sorted.length;
  if (n < 20)
    return refused(
      'samples',
      'a percentile interval needs at least 20 finite draws'
    );
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const at = p => {
    const h = (n - 1) * p;
    const i = Math.floor(h);
    return i + 1 < n
      ? sorted[i] + (h - i) * (sorted[i + 1] - sorted[i])
      : sorted[n - 1];
  };
  return {
    status: 'ok',
    method,
    level,
    draws: n,
    value: at(0.5),
    lo: at((1 - level) / 2),
    hi: at((1 + level) / 2),
    assumes: assumesOf(method),
  };
}
