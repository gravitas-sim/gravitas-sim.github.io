// =============================================================================
// The linear ephemeris, the O-C diagram and the TTV verdict (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// T_n = T0 + n P by weighted least squares, the residuals O - C = T_n - (T0 + n P),
// and the verdict on whether they are more than noise. A planet that is alone
// keeps a straight-line clock; a second planet bends it, and the bend is what the
// O-C diagram shows.
//
// Pure: no DOM, no clock. Times are in the caller's unit (days in every use here).
// =============================================================================

import { gammaQ } from '../statistics/special.js';

const { Math, Float64Array } = globalThis;

/** The one-sided p of a chi-square of `chi2` with `dof` degrees of freedom. */
export const chi2Sf = (chi2, dof) =>
  dof > 0 && Number.isFinite(chi2) ? gammaQ(dof / 2, chi2 / 2) : NaN;

/** The level below which the O-C is called a signal. */
export const SIGNAL_P = 0.01;

/**
 * The weighted straight line through transit times.
 *
 * @param {ArrayLike<number>} epochs - Transit numbers (integers, gaps allowed)
 * @param {ArrayLike<number>} times - Mid-transit times
 * @param {ArrayLike<number>|null} [sigmas] - One-sigma of each time; null for equal weights
 * @returns {{status: 'ok'|'refused', reason?: string, T0: number, P: number,
 *   sigmaT0: number, sigmaP: number, covariance: number, oc: Float64Array,
 *   chi2: number|null, dof: number}} The ephemeris; the O-C is `oc`
 */
export function linearEphemeris(epochs, times, sigmas = null) {
  const n = times.length;
  if (n < 3 || epochs.length !== n)
    return { status: 'refused', reason: 'too-few-transits' };
  let s = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const w = sigmas ? 1 / (sigmas[i] * sigmas[i]) : 1;
    if (!Number.isFinite(w) || !Number.isFinite(times[i]))
      return { status: 'refused', reason: 'not-finite' };
    s += w;
    sx += w * epochs[i];
    sy += w * times[i];
    sxx += w * epochs[i] * epochs[i];
    sxy += w * epochs[i] * times[i];
  }
  const det = s * sxx - sx * sx;
  if (!(det > 0)) return { status: 'refused', reason: 'degenerate-epochs' };
  const P = (s * sxy - sx * sy) / det;
  const T0 = (sxx * sy - sx * sxy) / det;
  const oc = new Float64Array(n);
  let chi2 = 0;
  for (let i = 0; i < n; i++) {
    oc[i] = times[i] - (T0 + epochs[i] * P);
    const w = sigmas ? 1 / (sigmas[i] * sigmas[i]) : 1;
    chi2 += w * oc[i] * oc[i];
  }
  return {
    status: 'ok',
    T0,
    P,
    sigmaT0: Math.sqrt(sxx / det),
    sigmaP: Math.sqrt(s / det),
    covariance: -sx / det,
    oc,
    chi2: sigmas ? chi2 : null,
    dof: n - 2,
  };
}

/**
 * Whether the O-C is more than noise: the chi-square of the residuals about the
 * line, against its degrees of freedom, one-sided.
 *
 * @returns {{verdict: 'signal'|'no-signal'|'unknown', chi2: number, dof: number,
 *   p: number, reducedChi2: number, rms: number}} 'unknown' without stated sigmas
 */
export function ttvSignal(ephemeris, sigmas) {
  if (ephemeris.status !== 'ok' || !sigmas)
    return {
      verdict: 'unknown',
      chi2: NaN,
      dof: NaN,
      p: NaN,
      reducedChi2: NaN,
      rms: NaN,
    };
  const { chi2, dof, oc } = ephemeris;
  const p = chi2Sf(chi2, dof);
  let ss = 0;
  for (let i = 0; i < oc.length; i++) ss += oc[i] * oc[i];
  return {
    verdict: p < SIGNAL_P ? 'signal' : 'no-signal',
    chi2,
    dof,
    p,
    reducedChi2: chi2 / dof,
    rms: Math.sqrt(ss / oc.length),
  };
}

/** Solve a small dense symmetric system by Gaussian elimination with pivoting. */
export function solveSmall(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}
