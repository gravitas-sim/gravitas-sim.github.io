// =============================================================================
// One transit time from a light curve (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// A template fit: the transit's shape is known (the quadratic-law model of
// js/inference/transit.js with the shape values the caller states), and only the
// mid-time and the baseline are fitted, by the inference core's fitter (js/inference/
// fit.js, Prompt 150). The time's one-sigma is the core's covariance, J^T W J
// inverted, for the stated per-point sigma. A coarse scan over the window starts the
// fit, because a flat out-of-transit stretch has no gradient to follow.
//
// The fit says when its own premise is wrong: the chi-square of the residuals against
// their degrees of freedom, one-sided, is flagged below p = 0.01. A stated sigma that
// is too small, or a transit shape that is not the template, shows there and not in
// the time's error bar, which would then be too small.
//
// Pure: no DOM, no clock.
// =============================================================================

import { createProblem, refine, covarianceAt } from '../../inference/fit.js';
import { TRANSIT } from '../../inference/models.js';
import { halfDuration } from '../../inference/transit.js';
import { chi2Sf } from './ephemeris.js';

const { Float64Array } = globalThis;

/** The p below which a transit's own fit is flagged. */
export const FIT_FLAG_P = 0.01;

/**
 * @param {{t: ArrayLike<number>, flux: ArrayLike<number>, sigma: number|ArrayLike<number>,
 *   template: {P: number, k: number, aRs: number, b: number, q1: number, q2: number},
 *   guess: number, scan?: number, exposure?: number}} w
 *   `scan`: half-width of the coarse search about `guess` (default 0.5 half-durations)
 * @returns {{status: 'ok'|'refused', reason?: string, time: number, sigma: number,
 *   chi2: number, dof: number, p: number, flagged: boolean, baseline: number}}
 */
export function measureTransitTime({
  t,
  flux,
  sigma,
  template,
  guess,
  scan,
  exposure = 0,
}) {
  const n = t.length;
  if (n < 8 || flux.length !== n)
    return { status: 'refused', reason: 'too-few-points' };
  const sig = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sig[i] = typeof sigma === 'number' ? sigma : sigma[i];
    if (!(sig[i] > 0) || !Number.isFinite(flux[i]) || !Number.isFinite(t[i]))
      return { status: 'refused', reason: 'not-finite' };
  }
  const half = halfDuration({
    P: template.P,
    k: template.k,
    aRs: template.aRs,
    b: template.b,
  });
  if (!Number.isFinite(half))
    return { status: 'refused', reason: 'no-transit-in-template' };
  const reach = scan ?? 0.5 * half;
  const data = {
    x: Float64Array.from(t),
    y: Float64Array.from(flux),
    sigma: sig,
    groups: null,
  };
  const values = { ...template, t0: guess };
  const parameters = TRANSIT.parameters.map(p => ({
    name: p.name,
    mode: p.name === 't0' ? 'fitted' : 'fixed',
    value: values[p.name],
    lo: p.name === 't0' ? guess - 2 * reach : p.lo,
    hi: p.name === 't0' ? guess + 2 * reach : p.hi,
  }));
  const problem = createProblem(TRANSIT, data, parameters, {
    exposure,
    supersample: exposure > 0 ? 5 : 1,
  });
  // coarse scan
  let start = guess;
  let low = Infinity;
  const steps = 41;
  for (let i = 0; i < steps; i++) {
    const c = guess - reach + (2 * reach * i) / (steps - 1);
    const e = problem.evaluate([c]);
    if (e.chi2 < low) {
      low = e.chi2;
      start = c;
    }
  }
  const fit = refine(problem, [start], { maxIterations: 60 });
  const cov = covarianceAt(problem, fit.theta);
  const sigmaT = cov.sigma[0];
  if (!Number.isFinite(sigmaT) || !(sigmaT > 0))
    return { status: 'refused', reason: 'no-covariance' };
  const dof = n - 2;
  const chi2 = fit.best.chi2;
  const p = chi2Sf(chi2, dof);
  return {
    status: 'ok',
    time: fit.theta[0],
    sigma: sigmaT,
    chi2,
    dof,
    p,
    flagged: p < FIT_FLAG_P,
    baseline: fit.best.linear.f0,
  };
}
