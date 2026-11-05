// =============================================================================
// Galaxy kernel: the logarithmic wavelength grid and the high-pass (X1, X2)
// -----------------------------------------------------------------------------
// A redshift multiplies every wavelength by 1 + z, which is a shift of log10(lambda). The
// correlation therefore runs on a grid that is uniform in log10(lambda), and a spectrum that is
// not on one is refused rather than resampled behind the caller's back: linear interpolation
// correlates the errors, which the curvature uncertainty does not know (toLogGrid says so).
// Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../statistics/check.js';
import { FWHM_PER_SIGMA } from '../spectrograph/lsf.js';

const { Math, Float64Array } = globalThis;

/** The moving-average window of the high-pass, in samples (about 7,000 km/s at a step of 1e-4 dex). */
export const HIGH_PASS_WINDOW = 101;

/** The relative tolerance on a logarithmic step. */
export const LOG_UNIFORM_TOLERANCE = 1e-3;

/** The mean log10 step of an ascending wavelength axis and the largest relative departure from it. */
export function logStepOf(lambdaNm) {
  const n = lambdaNm.length;
  const step =
    (Math.log10(lambdaNm[n - 1]) - Math.log10(lambdaNm[0])) / (n - 1);
  let worst = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.log10(lambdaNm[i]) - Math.log10(lambdaNm[i - 1]);
    worst = Math.max(worst, Math.abs(d - step) / step);
  }
  return { step, worstRelative: worst };
}

/** A refusal if the axis is not uniform in log10(lambda), else the step. */
export function checkLogGrid(lambdaNm, what) {
  const { step, worstRelative } = logStepOf(lambdaNm);
  if (!(step > 0) || worstRelative > LOG_UNIFORM_TOLERANCE)
    return refused(
      'not-log-uniform',
      `the ${what} axis is not uniform in log10(wavelength) (largest relative departure ${worstRelative.toExponential(1)}); toLogGrid resamples it by linear interpolation, which correlates the errors`
    );
  return { step };
}

/**
 * Resample a spectrum onto a grid uniform in log10(lambda) by linear interpolation of the flux and the error. The result
 * says it was resampled: neighbouring errors are correlated and the curvature uncertainty does not know it.
 * @param {object} spec
 * @param {{step?: number}} [o] - the log10 step; default the smallest step of the axis
 */
export function toLogGrid(spec, { step } = {}) {
  const lam = spec.lambdaNm;
  const n = lam.length;
  let s = step;
  if (!(s > 0)) {
    s = Infinity;
    for (let i = 1; i < n; i++)
      s = Math.min(s, Math.log10(lam[i]) - Math.log10(lam[i - 1]));
  }
  const l0 = Math.log10(lam[0]);
  const m = Math.floor((Math.log10(lam[n - 1]) - l0) / s) + 1;
  const outLam = new Float64Array(m);
  const flux = new Float64Array(m);
  const sigma = spec.sigma ? new Float64Array(m) : null;
  let j = 0;
  for (let i = 0; i < m; i++) {
    const x = 10 ** (l0 + i * s);
    outLam[i] = x;
    while (j < n - 2 && lam[j + 1] < x) j++;
    const t = (x - lam[j]) / (lam[j + 1] - lam[j]);
    flux[i] = spec.flux[j] + t * (spec.flux[j + 1] - spec.flux[j]);
    if (sigma)
      sigma[i] = spec.sigma[j] + t * (spec.sigma[j + 1] - spec.sigma[j]);
  }
  return {
    ...spec,
    lambdaNm: outLam,
    flux,
    sigma,
    resampled: {
      from: 'linear interpolation onto a logarithmic grid',
      step: s,
      note: 'neighbouring errors are correlated by the interpolation; the correlation uncertainty assumes they are not',
    },
  };
}

/** The line-spread sigma, in samples of a log10 step, of a spectrograph of resolving power R. */
export const lsfSigmaSamples = (R, step) =>
  1 / (R * FWHM_PER_SIGMA * Math.LN10 * step);

/**
 * Degrade a template to a lower resolving power by a Gaussian convolution in log wavelength (the quadrature
 * difference of the two line-spread sigmas, truncated at four sigma). The template keeps its label and source and says so.
 * @param {object} template
 * @param {number} R - target resolving power, below the template's
 */
export function degradeToResolution(template, R) {
  const { step } = logStepOf(template.lambdaNm);
  const s0 = lsfSigmaSamples(template.resolvingPower, step);
  const s1 = lsfSigmaSamples(R, step);
  if (!(R > 0) || !(s1 > s0))
    return refused(
      'not-a-degradation',
      'the target resolving power must be below the template’s'
    );
  const s = Math.sqrt(s1 * s1 - s0 * s0);
  const h = Math.ceil(4 * s);
  const w = new Float64Array(2 * h + 1);
  for (let k = -h; k <= h; k++) w[k + h] = Math.exp((-0.5 * k * k) / (s * s));
  const n = template.flux.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let a = 0;
    let norm = 0;
    for (let k = -h; k <= h; k++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      a += w[k + h] * template.flux[j];
      norm += w[k + h];
    }
    out[i] = a / norm;
  }
  return {
    ...template,
    flux: out,
    resolvingPower: R,
    degradedFrom: template.resolvingPower,
  };
}

/** Subtract the centred moving average over `window` samples (the window shrinks at the ends): a linear, shift-invariant high-pass. */
export function highPass(y, window = HIGH_PASS_WINDOW) {
  const n = y.length;
  const half = window >> 1;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + y[i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    out[i] = y[i] - (cum[hi + 1] - cum[lo]) / (hi - lo + 1);
  }
  return out;
}
