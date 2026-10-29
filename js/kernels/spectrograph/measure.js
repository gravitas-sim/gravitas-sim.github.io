// =============================================================================
// The spectrograph kernel: measuring a line, and a velocity
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// fitLine         MEASURED   a pixel-integrated Gaussian on a linear continuum, five
//                            parameters (total flux, centre, sigma, the continuum's value
//                            and slope) by weighted least squares through
//                            js/inference/fit.js (Levenberg-Marquardt, the covariance
//                            (J^T W J)^-1). The same model the forward model makes, so on
//                            noise-free data the centre is exact at any sampling.
// resolving power DERIVED    R = lambda / (FWHM_pixels x dispersion), from an unresolved
//                            line's width (an arc line); a line with its own width gives
//                            the quadrature sum of the two
// radialVelocity  DERIVED    c (lambda_obs / lambda_rest - 1) in the relativistic form,
//                            ASSUMING the two wavelengths are in the same, stated medium
//
// Flags, none of them a proof:
//   broadened      the width exceeds the instrument's by more than 3 sigma and by more than
//                  10 percent: the signature of an unresolved blend (or a line wider than the
//                  instrument), never a diagnosis
//   undersampled   fewer than 2 pixels per FWHM (the fit goes ahead); fewer than 1 is refused
//   scatter        the reduced chi-square exceeds the chi-square distribution's 0.99
//                  quantile: the uncertainties are scaled up by it and the result says so
//
// Pure: no DOM, no clock; deterministic.
// =============================================================================

import { createProblem, refine, covarianceAt } from '../../inference/fit.js';
import { chi2Quantile } from '../statistics/special.js';
import { velocityFromWavelengths } from '../radiation/doppler.js';
import { C_LIGHT } from '../radiation/constants.js';
import {
  FWHM_PER_SIGMA,
  SAMPLING_FLOOR,
  gaussianArea,
  judgeSampling,
} from './lsf.js';
import { FLAG_QUANTILE } from './solution.js';

const { Math, Number, Float64Array } = globalThis;
const C_KM_S = C_LIGHT / 1000;

/** A broadened line exceeds the instrument's width by this many sigma and by this fraction. */
export const BROADENED_SIGMAS = 3;
export const BROADENED_FRACTION = 0.1;
/** Fewer usable pixels than this and a line is not fitted. */
export const MIN_PIXELS = 6;

const LINE_MODEL = {
  id: 'spectral-line-pixel-gaussian',
  version: '1.0.0',
  parameters: ['flux', 'mu', 's', 'c0', 'c1'].map(name => ({ name })),
  linear: [],
  predict(v, xs, settings) {
    const out = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      out[i] =
        v.c0 +
        v.c1 * (x - settings.x0) +
        v.flux * gaussianArea(v.mu, v.s, x - 0.5, x + 0.5);
    }
    return out;
  },
  solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
};

const refused = (reason, message) => ({ status: 'refused', reason, message });

const median = a => {
  const s = Array.from(a).sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};

/**
 * Fit one line in a window of the pixels.
 * @param {ArrayLike<number>} x - pixel coordinates (centres)
 * @param {ArrayLike<number>} y - electrons per pixel
 * @param {ArrayLike<number>|null} sigma - each pixel's error, or null (the scatter of the fit then stands in)
 * @param {object} o
 * @param {number} o.guess - a pixel near the line (a mark)
 * @param {number} [o.halfWidth] - the window's half width in pixels (default 4 x the FWHM, else 12)
 * @param {number} [o.lsfFwhmPx] - the instrument's FWHM in pixels there: the sampling check and the broadened flag use it
 * @param {ArrayLike<number>|null} [o.mask] - nonzero for a masked pixel; one in the window is refused
 */
export function fitLine(
  x,
  y,
  sigma,
  { guess, halfWidth, lsfFwhmPx = null, mask = null } = {}
) {
  if (!Number.isFinite(guess))
    return refused('no-guess', 'a line needs a pixel to start from');
  if (lsfFwhmPx !== null && !(lsfFwhmPx >= SAMPLING_FLOOR))
    return {
      status: 'not-constrained',
      reason: 'severely-undersampled',
      message: `a line only ${lsfFwhmPx.toFixed(2)} pixel wide (FWHM) does not fix its width and its centre separately`,
      sampling: lsfFwhmPx,
    };
  const half = halfWidth ?? (lsfFwhmPx ? Math.ceil(4 * lsfFwhmPx) : 12);
  const idx = [];
  for (let i = 0; i < x.length; i++)
    if (Math.abs(x[i] - guess) <= half) idx.push(i);
  if (idx.length < MIN_PIXELS)
    return refused(
      'too-few-pixels',
      `only ${idx.length} usable pixels in the window; at least ${MIN_PIXELS} are needed`
    );
  if (mask && idx.some(i => mask[i]))
    return refused('masked-pixel', 'a masked pixel lies in the window');
  const xs = Float64Array.from(idx, i => x[i]);
  const ys = Float64Array.from(idx, i => y[i]);
  if (ys.some(v => !Number.isFinite(v)))
    return refused('not-finite', 'a pixel in the window is not a number');
  let sg = null;
  if (sigma) {
    sg = Float64Array.from(idx, i => sigma[i]);
    if (sg.some(v => !(v > 0 && v < Infinity)))
      return refused(
        'bad-error',
        'a pixel in the window has an error that is not positive'
      );
  }
  const x0 = guess;
  const med = median(ys);
  let top = 0;
  let bottom = 0;
  let iTop = 0;
  let iBot = 0;
  ys.forEach((v, i) => {
    if (v - med > top) {
      top = v - med;
      iTop = i;
    }
    if (med - v > bottom) {
      bottom = med - v;
      iBot = i;
    }
  });
  const emission = top >= bottom;
  const peak = emission ? top : -bottom;
  const mu0 = xs[emission ? iTop : iBot];
  const s0 = lsfFwhmPx ? lsfFwhmPx / FWHM_PER_SIGMA : 1.2;
  let best = null;
  for (const k of [1, 0.6, 1.8]) {
    const sStart = s0 * k;
    const params = [
      {
        name: 'flux',
        mode: 'fitted',
        value: peak * sStart * Math.sqrt(2 * Math.PI),
        lo: -Infinity,
        hi: Infinity,
      },
      { name: 'mu', mode: 'fitted', value: mu0, lo: x0 - half, hi: x0 + half },
      { name: 's', mode: 'fitted', value: sStart, lo: 0.15, hi: 3 * half },
      { name: 'c0', mode: 'fitted', value: med, lo: -Infinity, hi: Infinity },
      { name: 'c1', mode: 'fitted', value: 0, lo: -Infinity, hi: Infinity },
    ];
    const problem = createProblem(
      LINE_MODEL,
      { x: xs, y: ys, sigma: sg },
      params,
      { x0 }
    );
    const run = refine(
      problem,
      params.map(p => p.value),
      { maxIterations: 300, tolerance: 1e-14 }
    );
    if (!best || run.best.chi2 < best.run.best.chi2) best = { run, problem };
    if (
      k === 1 &&
      run.converged &&
      run.best.chi2 / Math.max(1, xs.length - 5) < 3
    )
      break;
  }
  const { run, problem } = best;
  const [flux, mu, s, c0, c1] = run.theta;
  const { covariance } = covarianceAt(problem, run.theta);
  if (!covariance)
    return {
      status: 'not-constrained',
      reason: 'singular',
      message: 'the data do not fix the five parameters (singular covariance)',
    };
  const dof = xs.length - 5;
  const chi2 = run.best.chi2;
  const reduced = chi2 / dof;
  const flagged =
    Boolean(sg) && reduced > chi2Quantile(FLAG_QUANTILE, dof) / dof;
  const scale = !sg ? reduced : flagged ? reduced : 1;
  const C = covariance.map(r => r.map(v => v * scale));
  const sd = i => Math.sqrt(Math.max(0, C[i][i]));
  const fwhmPx = FWHM_PER_SIGMA * s;
  const sigmaFwhmPx = FWHM_PER_SIGMA * sd(2);
  const continuumAtCentre = c0 + c1 * (mu - x0);
  const out = {
    status: 'ok',
    centrePx: mu,
    sigmaCentrePx: sd(1),
    sigmaPx: s,
    sigmaSigmaPx: sd(2),
    fwhmPx,
    sigmaFwhmPx,
    fluxE: flux,
    sigmaFluxE: sd(0),
    c0,
    c1,
    x0,
    continuumAtCentre,
    kind: flux < 0 ? 'absorption' : 'emission',
    chi2,
    dof,
    reducedChi2: reduced,
    errorsFromScatter: !sg,
    scatterExceedsErrors: flagged,
    scale,
    covariance: C,
    window: [xs[0], xs[xs.length - 1]],
    pixels: xs.length,
    converged: run.converged,
    sampling: lsfFwhmPx ?? fwhmPx,
    samplingVerdict: judgeSampling(lsfFwhmPx ?? fwhmPx),
  };
  if (flux < 0 && continuumAtCentre > 0) {
    // the equivalent width in pixels: -F / C(mu), and its propagation through F, c0, c1 and mu
    const ew = -flux / continuumAtCentre;
    const g = [
      -1 / continuumAtCentre,
      (flux * c1) / continuumAtCentre ** 2,
      0,
      flux / continuumAtCentre ** 2,
      (flux * (mu - x0)) / continuumAtCentre ** 2,
    ];
    let v = 0;
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++) v += g[i] * C[i][j] * g[j];
    out.equivalentWidthPx = ew;
    out.sigmaEquivalentWidthPx = Math.sqrt(Math.max(0, v));
  }
  if (lsfFwhmPx) {
    const excess = fwhmPx - lsfFwhmPx;
    out.broadened =
      excess > BROADENED_SIGMAS * sigmaFwhmPx &&
      excess > BROADENED_FRACTION * lsfFwhmPx;
    out.widthExcess = excess / lsfFwhmPx;
  }
  return out;
}

/**
 * The resolving power an arc line's width gives, with the solution's dispersion at the line: R = lambda / (FWHM x dispersion).
 * @param {{centrePx: number, fwhmPx: number, sigmaFwhmPx: number}} fit
 * @param {{at: Function, dispersionAt: Function}} solution
 */
export function resolvingPowerFromFit(fit, solution) {
  const lambdaNm = solution.at(fit.centrePx);
  const fwhmNm = fit.fwhmPx * Math.abs(solution.dispersionAt(fit.centrePx));
  const R = lambdaNm / fwhmNm;
  return { R, sigmaR: (R * fit.sigmaFwhmPx) / fit.fwhmPx, lambdaNm, fwhmNm };
}

/** What a rest wavelength in the wrong medium costs in velocity: c (lambda_vacuum / lambda_air - 1), km/s. */
export const mediaOffsetKmS = line => C_KM_S * (line.vacuum / line.air - 1);

/**
 * A radial velocity from an observed and a rest wavelength, with its uncertainty to first order.
 * Refuses when either medium is missing or the two differ: it never converts silently.
 */
export function radialVelocity({
  observedNm,
  sigmaNm = 0,
  restNm,
  observedMedium,
  restMedium,
  form = 'relativistic',
}) {
  if (!observedMedium || !restMedium)
    return refused(
      'medium-missing',
      'a velocity needs the medium (air or vacuum) of the observed and of the rest wavelength'
    );
  if (observedMedium !== restMedium)
    return refused(
      'medium-mismatch',
      `the observed wavelength is in ${observedMedium} and the rest wavelength in ${restMedium}; a mismatch of this kind is worth tens of km/s`
    );
  const v = velocityFromWavelengths(observedNm, restNm, form);
  const r = observedNm / restNm;
  // relativistic: v = c (r^2 - 1) / (r^2 + 1); classical: c (r - 1)
  const dv =
    form === 'classical'
      ? C_KM_S / restNm
      : (C_KM_S * 4 * r) / (r * r + 1) ** 2 / restNm;
  return {
    status: 'ok',
    velocityKmS: v,
    sigmaKmS: Math.abs(dv) * sigmaNm,
    medium: observedMedium,
    form,
    z: r - 1,
  };
}
