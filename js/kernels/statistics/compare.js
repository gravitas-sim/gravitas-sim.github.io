// =============================================================================
// Comparing two estimates, and the F-test of nested models (Prompt 154)
// -----------------------------------------------------------------------------
// Two estimates computed from the same data are not independent, and the
// variance of their difference is Var A + Var B - 2 Cov(A, B): ignoring the
// covariance (taking it as zero) is wrong in either direction, by a factor that
// can be ten. `difference` takes it, says it used it, and refuses an input in
// which it could not be.
//
// The F-test is valid for nested models that are regular and Gaussian, with
// the extra parameters free inside their space and not searched. It is NOT
// valid for a period found on a grid (the best of many trials is not an F
// variable), for a variance or amplitude whose null value is on the boundary,
// or for models that are not nested, and the function refuses those with a
// code before it prints a p value (Protassov et al. 2002).
// =============================================================================

import { fSf, normalCdf } from './special.js';

const { Math, Number } = globalThis;

const refused = (code, why) => ({ status: 'refused', code, why });

/**
 * A - B with its variance from the two variances and their covariance, and the
 * z score of the difference against zero (a two-sided normal p value).
 * @param {{a: number, b: number, varA: number, varB: number, covAB?: number}} args
 */
export function difference({ a, b, varA, varB, covAB = 0 }) {
  if (![a, b, varA, varB, covAB].every(Number.isFinite))
    return refused('input', 'an input is not a number');
  if (varA < 0 || varB < 0)
    return refused('variance', 'a variance is negative');
  if (Math.abs(covAB) > Math.sqrt(varA * varB) * (1 + 1e-9))
    return refused(
      'covariance',
      'the covariance is larger than the standard deviations allow'
    );
  let variance = varA + varB - 2 * covAB;
  if (variance < 1e-12 * (varA + varB)) variance = 0;
  const value = a - b;
  const sigma = Math.sqrt(variance);
  const base = {
    method: 'difference',
    value,
    variance,
    sigma,
    used: { covariance: covAB },
    assumes: [
      'the two estimates are jointly normal with the variances and covariance given',
    ],
  };
  if (variance === 0)
    return {
      ...base,
      status: 'degenerate',
      z: null,
      p: null,
      why: 'the two estimates are the same function of the same data',
    };
  const z = value / sigma;
  return {
    ...base,
    status: 'ok',
    z,
    p: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))),
  };
}

/**
 * The F-test of a full model against the reduced model nested in it.
 * @param {{rssReduced: number, pReduced: number, rssFull: number, pFull: number,
 *   n: number, searched?: boolean, boundary?: boolean}} args - residual sums of
 *   squares and parameter counts; `searched` is true when any extra parameter
 *   (a period, a position) was found by a search; `boundary` when a null value
 *   sits on the edge of the parameter space
 */
export function fTest({
  rssReduced,
  pReduced,
  rssFull,
  pFull,
  n,
  searched = false,
  boundary = false,
}) {
  if (searched)
    return refused(
      'searched',
      'an extra parameter found by a search is not an F variable: use a simulation of the search, or the number of independent trials'
    );
  if (boundary)
    return refused(
      'boundary',
      'a null value on the boundary of the parameter space changes the reference distribution'
    );
  if (
    ![rssReduced, rssFull, pReduced, pFull, n].every(Number.isFinite) ||
    rssFull < 0 ||
    rssReduced < 0
  )
    return refused(
      'input',
      'an input is not a number, or a sum of squares is negative'
    );
  if (!(pFull > pReduced) || rssFull > rssReduced * (1 + 1e-12))
    return refused(
      'not-nested',
      'the full model must have more parameters and fit no worse'
    );
  const d1 = pFull - pReduced;
  const d2 = n - pFull;
  if (!(d2 > 0))
    return refused(
      'no-dof',
      'no degrees of freedom are left in the full model'
    );
  const F =
    rssFull === 0 ? Infinity : (rssReduced - rssFull) / d1 / (rssFull / d2);
  return {
    status: 'ok',
    method: 'f-test-nested',
    F,
    d1,
    d2,
    p: fSf(F, d1, d2),
    assumes: [
      'the models are nested and linear in the added parameters (or regular enough to behave so)',
      'the errors are independent and normal with one variance',
      'the added parameters are not searched and their null values are not on a boundary',
    ],
  };
}
