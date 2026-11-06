// =============================================================================
// Rest-frame velocities, the sigma clip and its truncation factor (Prompt 250, rules R2, R4, R6)
// -----------------------------------------------------------------------------
// v = c (z - z_c) / (1 + z_c) is the linear rest-frame velocity of a galaxy at z in a cluster at z_c; the
// exact relativistic relative velocity differs by a relative z_rel / 2 + O(z_rel^3) (leg A1 prices it).
//
// Membership is an iterated clip of u = c (z - z_0)/(1 + z_0): the first pass about the median with the
// MAD scale (1 / Phi^-1(3/4), computed, not typed), then about the mean and the standard deviation of the
// kept set, at kappa standard deviations, until the kept set repeats or MAX_PASSES have run.
//
// A clip at kappa truncates a Gaussian parent, which lowers the variance of the kept set. At the clip's
// fixed point the kept set is the parent cut at |v - mean| <= kappa s, so with x = s / sigma
//   x^2 = V(kappa x),   V(a) = 1 - 2 a phi(a) / (2 Phi(a) - 1),
// and truncationFactor(kappa) is the root x* in (0, 1]. The correction sigma_hat = s / x* is exact for a
// Gaussian parent and says nothing for any other. Below kappa = sqrt(3) the only root is 0: refused.
// =============================================================================

import { normalCdf, normalQuantile } from '../../statistics/index.js';
import { C_KMS, KAPPA, MAX_PASSES, refused } from './constants.js';

/** Linear rest-frame velocity, km/s. */
export const restVelocity = (z, zc) => (C_KMS * (z - zc)) / (1 + zc);

/** The exact relativistic relative velocity of the same pair, km/s (used only to price the linear form). */
export function relativisticVelocity(z, zc) {
  const g = (1 + z) / (1 + zc);
  return (C_KMS * (g * g - 1)) / (g * g + 1);
}

/** 1 / Phi^-1(3/4): the factor that turns a MAD into a Gaussian standard deviation. */
export const MAD_TO_SIGMA = 1 / normalQuantile(0.75);

const SQRT3 = Math.sqrt(3);

export function median(values) {
  const a = Float64Array.from(values).sort();
  const n = a.length;
  if (n === 0) return NaN;
  return n % 2 ? a[(n - 1) / 2] : 0.5 * (a[n / 2 - 1] + a[n / 2]);
}

const pdf = a => Math.exp(-0.5 * a * a) / Math.sqrt(2 * Math.PI);

/** V(a): the variance of a standard normal cut at |z| <= a. */
export function truncatedVariance(a) {
  return 1 - (2 * a * pdf(a)) / (1 - 2 * (1 - normalCdf(a)));
}

/**
 * x*(kappa): the root of x^2 = V(kappa x) in (0, 1].
 * @returns {number|{status: 'refused', code: string, why: string}}
 */
export function truncationFactor(kappa) {
  if (!(kappa > SQRT3))
    return refused(
      'bad-clip-level',
      'a clip at or below sqrt(3) standard deviations has no truncated-Gaussian fixed point'
    );
  const f = x => x * x - truncatedVariance(kappa * x);
  let lo = 0.05;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
function sd(a, m) {
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.sqrt(s / (a.length - 1));
}

/**
 * The iterated sigma clip of rule R4.
 * @param {ArrayLike<number>} u - velocities (any consistent origin), one per galaxy
 * @param {{kappa?: number, maxPasses?: number}} [opts]
 * @returns {{status: 'ok', kept: number[], passes: number, converged: true} |
 *   {status: 'not-constrained', code: string, passes: number} | {status: 'refused', code: string}}
 */
export function sigmaClip(u, { kappa = KAPPA, maxPasses = MAX_PASSES } = {}) {
  if (!(kappa > SQRT3))
    return refused(
      'bad-clip-level',
      'the clip level must exceed sqrt(3) standard deviations'
    );
  const n = u.length;
  if (n < 2)
    return {
      status: 'not-constrained',
      code: 'too-few-members',
      passes: 0,
      kept: [],
    };
  let centre = median(u);
  let scale = MAD_TO_SIGMA * median(Array.from(u, v => Math.abs(v - centre)));
  let previous = null;
  const seen = new Set();
  for (let pass = 1; pass <= maxPasses; pass++) {
    const kept = [];
    for (let i = 0; i < n; i++)
      if (Math.abs(u[i] - centre) <= kappa * scale) kept.push(i);
    if (kept.length < 2)
      return {
        status: 'not-constrained',
        code: 'too-few-members',
        passes: pass,
        kept,
      };
    const key = kept.join(',');
    if (previous !== null && key === previous.join(','))
      return { status: 'ok', kept, passes: pass, converged: true };
    if (seen.has(key))
      return {
        status: 'not-constrained',
        code: 'clip-not-converged',
        why: 'the kept set returned to an earlier set that is not its predecessor',
        passes: pass,
        kept,
      };
    seen.add(key);
    previous = kept;
    const vals = kept.map(i => u[i]);
    centre = mean(vals);
    scale = sd(vals, centre);
  }
  return {
    status: 'not-constrained',
    code: 'clip-not-converged',
    why: `the kept set was still changing after ${maxPasses} passes`,
    passes: maxPasses,
    kept: previous ?? [],
  };
}
