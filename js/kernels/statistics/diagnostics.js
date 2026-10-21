// =============================================================================
// Residual diagnostics (Prompt 154)
// -----------------------------------------------------------------------------
// Four questions to ask of a fit's residuals before believing its error bars:
// are they the size the error bars say (normalised residuals), do their signs
// come in too few or too many runs (a runs test), does each follow the last
// (lag-one autocorrelation), and are they normal (a normal-probability plot).
// Each returns a record with a status: "refused" with a code when the question
// has no answer (a constant list, too few values), never a number that looks
// like one.
// =============================================================================

import { lnGamma, normalCdf, normalSf, normalQuantile } from './special.js';
import { refused, allFinite } from './check.js';

const { Math, Number, Float64Array } = globalThis;

/**
 * (y - fit) / sigma, so that a fit with right error bars gives unit-variance
 * residuals. With no sigma the residuals are scaled by their own rms about the
 * fit (divisor n - parameters), and the record says it was `estimated`: such
 * residuals say whether the SHAPE of the scatter is right, not its size.
 * @param {{y: ArrayLike<number>, fit: ArrayLike<number>,
 *   sigma?: number|ArrayLike<number>|null, parameters?: number}} args
 */
export function normalisedResiduals({ y, fit, sigma = null, parameters = 0 }) {
  const n = y?.length ?? 0;
  if (!n || fit?.length !== n)
    return refused('length', 'the data and the fit differ in length');
  if (!allFinite(y) || !allFinite(fit))
    return refused(
      'non-finite',
      'the data or the fit has a value that is NaN or infinite'
    );
  const values = new Float64Array(n);
  if (sigma === null || sigma === undefined) {
    const dof = n - parameters;
    if (!(dof >= 1)) return refused('dof', 'no degrees of freedom are left');
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (y[i] - fit[i]) ** 2;
    const s = Math.sqrt(ss / dof);
    if (!(s > 0)) return refused('sigma', 'the residuals are all zero');
    for (let i = 0; i < n; i++) values[i] = (y[i] - fit[i]) / s;
    return { status: 'ok', values, scale: 'estimated', sigma: s, n };
  }
  for (let i = 0; i < n; i++) {
    const s = typeof sigma === 'number' ? sigma : sigma[i];
    if (!(s > 0 && Number.isFinite(s)))
      return refused('sigma', 'an error bar is zero, negative or not finite');
    values[i] = (y[i] - fit[i]) / s;
  }
  return { status: 'ok', values, scale: 'sigma', n };
}

/**
 * ln C(n, k): exact integers while they fit (C(60, 30) is below 2^53), ln Gamma
 * beyond, where the relative error of an exponentiated term is ~1e-14.
 */
function lnC(n, k) {
  if (k < 0 || k > n) return -Infinity;
  if (n <= 60) {
    let r = 1;
    const m = Math.min(k, n - k);
    for (let i = 1; i <= m; i++) r = (r * (n - m + i)) / i;
    return Math.log(Math.round(r));
  }
  return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
}

/**
 * The exact distribution of the number of runs in a random arrangement of n1
 * of one kind and n2 of another (Wald and Wolfowitz 1940): an array indexed by
 * the number of runs, from 0 to n1 + n2.
 */
export function runsPmf(n1, n2) {
  const n = n1 + n2;
  const pmf = new Float64Array(n + 1);
  if (n1 === 0 || n2 === 0) {
    pmf[Math.min(n, 1)] = 1;
    return pmf;
  }
  const total = lnC(n, n1);
  const term = (a, b) =>
    a === -Infinity || b === -Infinity ? 0 : Math.exp(a + b - total);
  for (let r = 2; r <= n; r++) {
    const k = r >> 1;
    pmf[r] =
      r % 2 === 0
        ? 2 * term(lnC(n1 - 1, k - 1), lnC(n2 - 1, k - 1))
        : term(lnC(n1 - 1, k), lnC(n2 - 1, k - 1)) +
          term(lnC(n1 - 1, k - 1), lnC(n2 - 1, k));
  }
  return pmf;
}

/**
 * The runs test on the signs of values about a centre (the median, or a number:
 * values equal to the centre are dropped). Too few runs means the residuals
 * cluster (a wrong shape of model); too many means they alternate.
 * `pFew` is P(runs <= observed), `pMany` is P(runs >= observed), and
 * `pTwoSided` is twice the smaller, at most 1. `method` is "exact" (the
 * distribution of runsPmf), "normal" (Wald-Wolfowitz moments with a continuity
 * correction) or "auto" (exact up to 1,000 values).
 */
export function runsTest(values, { center = 'median', method = 'auto' } = {}) {
  const finite = Array.from(values ?? []);
  if (!allFinite(finite))
    return refused(
      'non-finite',
      'a value is NaN or infinite: dropping it would change the run structure'
    );
  let c = center;
  if (center === 'median') {
    const s = finite.slice().sort((a, b) => a - b);
    const h = s.length >> 1;
    c = s.length % 2 ? s[h] : 0.5 * (s[h - 1] + s[h]);
  }
  const signs = finite.filter(v => v !== c).map(v => v > c);
  if (signs.length < 8)
    return refused(
      'length',
      'a runs test needs at least 8 values away from the centre'
    );
  const n1 = signs.filter(Boolean).length;
  const n2 = signs.length - n1;
  if (!n1 || !n2)
    return refused('one-sign', 'every value is on one side of the centre');
  let runs = 1;
  for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) runs++;
  const n = n1 + n2;
  const mean = (2 * n1 * n2) / n + 1;
  const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  const exact = method === 'exact' || (method === 'auto' && n <= 1000);
  let pFew;
  let pMany;
  if (exact) {
    const pmf = runsPmf(n1, n2);
    pFew = 0;
    pMany = 0;
    for (let r = 0; r <= n; r++) {
      if (r <= runs) pFew += pmf[r];
      if (r >= runs) pMany += pmf[r];
    }
  } else {
    const sd = Math.sqrt(variance);
    pFew = normalCdf((runs + 0.5 - mean) / sd);
    pMany = normalSf((runs - 0.5 - mean) / sd);
  }
  pFew = Math.min(1, pFew);
  pMany = Math.min(1, pMany);
  return {
    status: 'ok',
    method: exact ? 'runs-exact' : 'runs-normal',
    n,
    nPositive: n1,
    nNegative: n2,
    runs,
    mean,
    variance,
    z: (runs - mean) / Math.sqrt(variance),
    pFew,
    pMany,
    pTwoSided: Math.min(1, 2 * Math.min(pFew, pMany)),
  };
}

/**
 * The lag-one autocorrelation of a series about its mean, and a z test against
 * white noise: mean -1/n and the Gaussian white-noise standard deviation of the
 * circular coefficient, sqrt((n - 2) / (n^2 - 1)) (Anderson 1942); at least ten values.
 */
export function lagOne(values) {
  const x = Array.from(values ?? []);
  const n = x.length;
  if (!allFinite(x))
    return refused(
      'non-finite',
      'a value is NaN or infinite: dropping it would change which values are adjacent'
    );
  if (n < 10)
    return refused(
      'length',
      'lag-one autocorrelation needs at least ten values (its null is a large-n one)'
    );
  const m = x.reduce((a, b) => a + b, 0) / n;
  let den = 0;
  for (let i = 0; i < n; i++) den += (x[i] - m) ** 2;
  if (!(den > 0)) return refused('constant', 'the values are constant');
  let num = 0;
  for (let i = 0; i + 1 < n; i++) num += (x[i] - m) * (x[i + 1] - m);
  const r1 = num / den;
  const expected = -1 / n;
  const sigma = Math.sqrt((n - 2) / (n * n - 1));
  const z = (r1 - expected) / sigma;
  return {
    status: 'ok',
    method: 'lag-one',
    n,
    r1,
    expected,
    sigma,
    z,
    p: Math.min(1, 2 * normalSf(Math.abs(z))),
  };
}

/**
 * A normal-probability plot: the sorted values against normal quantiles at the
 * Blom plotting positions (i - 3/8) / (n + 1/4), with the least-squares line
 * through them and its correlation (the probability-plot correlation
 * coefficient, near 1 for a normal sample).
 */
export function normalProbability(values) {
  const raw = Array.from(values ?? []);
  if (!allFinite(raw))
    return refused('non-finite', 'a value is NaN or infinite');
  const x = Float64Array.from(raw).sort();
  const n = x.length;
  if (n < 3)
    return refused('length', 'a probability plot needs at least three values');
  const q = new Float64Array(n);
  for (let i = 0; i < n; i++)
    q[i] = normalQuantile((i + 1 - 0.375) / (n + 0.25));
  let mq = 0;
  let mx = 0;
  for (let i = 0; i < n; i++) {
    mq += q[i];
    mx += x[i];
  }
  mq /= n;
  mx /= n;
  let sqq = 0;
  let sxx = 0;
  let sqx = 0;
  for (let i = 0; i < n; i++) {
    sqq += (q[i] - mq) ** 2;
    sxx += (x[i] - mx) ** 2;
    sqx += (q[i] - mq) * (x[i] - mx);
  }
  if (!(sxx > 0)) return refused('constant', 'the values are constant');
  const slope = sqx / sqq;
  return {
    status: 'ok',
    method: 'normal-probability',
    n,
    theoretical: q,
    ordered: x,
    slope,
    intercept: mx - slope * mq,
    correlation: sqx / Math.sqrt(sqq * sxx),
  };
}
