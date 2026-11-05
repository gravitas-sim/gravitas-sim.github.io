// =============================================================================
// ISM kernel: a continuum, an equivalent width, a line and its velocity
// (Prompt 247, ISM.md; the rule is ISM-RULE-1 of tests/fixtures/ism/thresholds.json)
// -----------------------------------------------------------------------------
// fitContinuum     MEASURED   the straight line (or constant) through the flux in two side windows
// equivalentWidth  MEASURED   the direct sum W = sum (1 - F/C) w over a line window, positive for
//                             absorption, with the continuum choice recorded and the constant-
//                             continuum result beside it as the continuum systematic
// fitGaussianLine  MEASURED   the spectrograph kernel's pixel-integrated Gaussian on a linear
//                             continuum, in sample-index space (linear in wavelength to first order
//                             on a uniform or logarithmic grid), converted to nm
// lineVelocity     DERIVED    the relativistic Doppler velocity of the fitted centre against a rest
//                             wavelength in the spectrum's own medium; refused on any mismatch
// pairResolved     DERIVED    the Gaussian pair's central dip against the committed 0.10 cut
//
// Pure: no DOM, no clock; deterministic.
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { fitLine, radialVelocity } from '../spectrograph/measure.js';
import { pairDip } from '../spectrograph/lsf.js';
import {
  checkSpectrum,
  pixelWidths,
  nearestIndex,
  lambdaAtIndex,
  dispersionAtIndex,
  lsfFwhmAt,
} from './spectrum.js';

const { Math, Number, Float64Array } = globalThis;

/** The Gaussian pair's central dip, as a fraction of its peak, at which two lines count as resolved. */
export const DIP_CUT = 0.1;

/** A continuum needs this many samples on each side and this many in all. */
export const MIN_CONTINUUM_EACH = 3;
export const MIN_CONTINUUM_ALL = 8;

const inWindow = (lambda, [lo, hi]) => lambda >= lo && lambda <= hi;

/** A refusal in the statistics kernel's shape from another kernel's {reason, message}. */
const norm = r =>
  r.status === 'ok' || r.code
    ? r
    : { ...r, code: r.reason, why: r.message ?? r.why };

/**
 * Fit the continuum in two side windows: C(lambda) = c0 + c1 (lambda - x0) (order 1) or c0 (order 0).
 * Weighted by 1 / sigma^2 when the spectrum has sigma (the covariance is then (X^T W X)^-1, unscaled), else
 * unweighted with the pixel error the window scatter about the fit (the covariance scaled by it).
 * @param {object} spec
 * @param {Array<[number, number]>} windows - [[aLo, aHi], [bLo, bHi]] in nm
 * @param {{order?: 0|1}} [o]
 */
export function fitContinuum(spec, windows, { order = 1 } = {}) {
  const bad = checkSpectrum(spec);
  if (bad) return bad;
  if (!Array.isArray(windows) || windows.length !== 2)
    return refused('bad-windows', 'two continuum windows are required');
  const idx = [];
  const each = [0, 0];
  for (let i = 0; i < spec.lambdaNm.length; i++)
    windows.forEach((w, k) => {
      if (inWindow(spec.lambdaNm[i], w)) {
        idx.push(i);
        each[k]++;
      }
    });
  if (
    each[0] < MIN_CONTINUUM_EACH ||
    each[1] < MIN_CONTINUUM_EACH ||
    idx.length < MIN_CONTINUUM_ALL
  )
    return refused(
      'too-few-continuum-samples',
      `the continuum windows hold ${each[0]} and ${each[1]} samples; ${MIN_CONTINUUM_EACH} on each side and ${MIN_CONTINUUM_ALL} in all are needed`
    );
  let x0 = 0;
  for (const i of idx) x0 += spec.lambdaNm[i];
  x0 /= idx.length;
  let S0 = 0;
  let S1 = 0;
  let S2 = 0;
  let T0 = 0;
  let T1 = 0;
  for (const i of idx) {
    const w = spec.sigma ? 1 / spec.sigma[i] ** 2 : 1;
    const x = spec.lambdaNm[i] - x0;
    S0 += w;
    S1 += w * x;
    S2 += w * x * x;
    T0 += w * spec.flux[i];
    T1 += w * x * spec.flux[i];
  }
  let c0;
  let c1 = 0;
  let cov;
  if (order === 0) {
    c0 = T0 / S0;
    cov = [[1 / S0]];
  } else {
    const det = S0 * S2 - S1 * S1;
    c0 = (S2 * T0 - S1 * T1) / det;
    c1 = (S0 * T1 - S1 * T0) / det;
    cov = [
      [S2 / det, -S1 / det],
      [-S1 / det, S0 / det],
    ];
  }
  const p = order === 0 ? 1 : 2;
  let rss = 0;
  for (const i of idx) {
    const r = spec.flux[i] - (c0 + c1 * (spec.lambdaNm[i] - x0));
    rss += r * r;
  }
  const rms = Math.sqrt(rss / (idx.length - p));
  const errorsFromScatter = !spec.sigma;
  if (errorsFromScatter) for (const row of cov) for (let j = 0; j < row.length; j++) row[j] *= rms * rms;
  return {
    status: 'ok',
    order,
    x0,
    coefficients: order === 0 ? [c0] : [c0, c1],
    covariance: cov,
    rms,
    pixelSigma: errorsFromScatter ? rms : null,
    errorsFromScatter,
    windows: windows.map(w => [...w]),
    samples: idx.length,
    at: lambda => c0 + c1 * (lambda - x0),
  };
}

/** W and its variance with one continuum fit over the samples idx (S3). */
function widthWith(spec, cont, idx, w) {
  let W = 0;
  let v = 0;
  let g0 = 0;
  let g1 = 0;
  for (const i of idx) {
    const C = cont.at(spec.lambdaNm[i]);
    if (!(C > 0)) return null;
    const s = spec.sigma ? spec.sigma[i] : cont.pixelSigma;
    W += w[i] * (1 - spec.flux[i] / C);
    v += ((w[i] * s) / C) ** 2;
    const d = (w[i] * spec.flux[i]) / (C * C);
    g0 += d;
    g1 += d * (spec.lambdaNm[i] - cont.x0);
  }
  const cv = cont.covariance;
  v +=
    cont.order === 0
      ? g0 * g0 * cv[0][0]
      : g0 * g0 * cv[0][0] + 2 * g0 * g1 * cv[0][1] + g1 * g1 * cv[1][1];
  return { widthNm: W, sigmaNm: Math.sqrt(v) };
}

/**
 * The direct equivalent width of S3, positive for absorption and negative for emission.
 * @param {object} spec
 * @param {{continuumWindows: Array<[number, number]>, lineWindow: [number, number]}} o
 */
export function equivalentWidth(spec, { continuumWindows, lineWindow }) {
  const lin = fitContinuum(spec, continuumWindows, { order: 1 });
  if (lin.status !== 'ok') return lin;
  const con = fitContinuum(spec, continuumWindows, { order: 0 });
  const idx = [];
  for (let i = 0; i < spec.lambdaNm.length; i++)
    if (inWindow(spec.lambdaNm[i], lineWindow)) idx.push(i);
  if (!idx.length)
    return refused('empty-window', 'the line window holds no samples');
  const w = pixelWidths(spec.lambdaNm);
  const a = widthWith(spec, lin, idx, w);
  const b = widthWith(spec, con, idx, w);
  if (!a || !b)
    return refused(
      'non-positive-continuum',
      'the continuum is not positive across the line window'
    );
  return {
    status: 'ok',
    widthNm: a.widthNm,
    sigmaNm: a.sigmaNm,
    significance: a.widthNm / a.sigmaNm,
    kind: a.widthNm > 0 ? 'absorption' : 'emission',
    convention: 'W > 0 is absorption; W = sum (1 - F/C) w over the line window',
    continuum: {
      choice: 'linear, fitted to the two side windows',
      windows: lin.windows,
      coefficients: lin.coefficients,
      covariance: lin.covariance,
      x0: lin.x0,
      rms: lin.rms,
      errorsFromScatter: lin.errorsFromScatter,
      samples: lin.samples,
    },
    lineWindow: [...lineWindow],
    samples: idx.length,
    constantContinuum: { widthNm: b.widthNm, sigmaNm: b.sigmaNm },
    continuumSystematicNm: Math.abs(a.widthNm - b.widthNm),
  };
}

/**
 * Fit one line (S4): a pixel-integrated Gaussian on a linear continuum through the spectrograph kernel's fitLine,
 * in sample-index space, converted to nm. Needs the spectrum's resolving power.
 * @param {object} spec
 * @param {{guessNm: number, halfWidthPx?: number}} o
 */
export function fitGaussianLine(spec, { guessNm, halfWidthPx } = {}) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  if (!Number.isFinite(guessNm))
    return refused('no-guess', 'a line needs a wavelength to start from');
  const i0 = nearestIndex(spec.lambdaNm, guessNm);
  const lsfNm = lsfFwhmAt(spec, spec.lambdaNm[i0]);
  const disp0 = dispersionAtIndex(spec.lambdaNm, i0);
  const lsfFwhmPx = lsfNm / disp0;
  const half = halfWidthPx ?? Math.max(8, Math.ceil(4 * lsfFwhmPx));
  const lo = Math.max(0, i0 - half - 1);
  const hi = Math.min(spec.lambdaNm.length - 1, i0 + half + 1);
  const xs = new Float64Array(hi - lo + 1);
  const ys = new Float64Array(hi - lo + 1);
  const sg = spec.sigma ? new Float64Array(hi - lo + 1) : null;
  for (let i = lo; i <= hi; i++) {
    xs[i - lo] = i;
    ys[i - lo] = spec.flux[i];
    if (sg) sg[i - lo] = spec.sigma[i];
  }
  const fit = norm(
    fitLine(xs, ys, sg, { guess: i0, halfWidth: half, lsfFwhmPx })
  );
  if (fit.status !== 'ok') return { ...fit, samplingFwhmPx: lsfFwhmPx };
  const disp = dispersionAtIndex(spec.lambdaNm, fit.centrePx);
  const Cc = fit.continuumAtCentre;
  const sd = k => Math.sqrt(Math.max(0, fit.covariance[k][k]));
  // W = -F / C(mu): the gradient over (flux, mu, s, c0, c1)
  const g = [
    -1 / Cc,
    (fit.fluxE * fit.c1) / Cc ** 2,
    0,
    fit.fluxE / Cc ** 2,
    (fit.fluxE * (fit.centrePx - fit.x0)) / Cc ** 2,
  ];
  let v = 0;
  for (let a = 0; a < 5; a++)
    for (let b = 0; b < 5; b++) v += g[a] * fit.covariance[a][b] * g[b];
  const peakDepth =
    fit.fluxE < 0 && Cc > 0
      ? -fit.fluxE / (fit.sigmaPx * Math.sqrt(2 * Math.PI) * Cc)
      : null;
  return {
    status: 'ok',
    kind: fit.kind,
    centreNm: lambdaAtIndex(spec.lambdaNm, fit.centrePx),
    sigmaCentreNm: fit.sigmaCentrePx * disp,
    sigmaNm: fit.sigmaPx * disp,
    sigmaSigmaNm: fit.sigmaSigmaPx * disp,
    fwhmNm: fit.fwhmPx * disp,
    sigmaFwhmNm: fit.sigmaFwhmPx * disp,
    flux: fit.fluxE * disp,
    sigmaFlux: sd(0) * disp,
    widthNm: (-fit.fluxE / Cc) * disp,
    sigmaWidthNm: Math.sqrt(Math.max(0, v)) * disp,
    continuumAtCentre: Cc,
    continuumChoice: 'linear, fitted with the line in the window',
    peakDepth,
    lsfFwhmNm: lsfNm,
    lsfFwhmPx,
    samplingVerdict: fit.samplingVerdict,
    undersampled: fit.samplingVerdict !== 'ok',
    broadened: Boolean(fit.broadened),
    widthExcess: fit.widthExcess,
    scatterExceedsErrors: fit.scatterExceedsErrors,
    reducedChi2: fit.reducedChi2,
    errorsFromScatter: fit.errorsFromScatter,
    window: [lambdaAtIndex(spec.lambdaNm, fit.window[0]), lambdaAtIndex(spec.lambdaNm, fit.window[1])],
    pixels: fit.pixels,
    converged: fit.converged,
    fit,
  };
}

/** The rest wavelength of a pack line in a medium, with the medium named, or a refusal. */
export function restOf(line, medium) {
  const restNm = line?.[medium];
  if (!Number.isFinite(restNm))
    return refused(
      'no-rest-wavelength',
      `the line has no rest wavelength in ${medium}`
    );
  return { status: 'ok', restNm, restMedium: medium, id: line.id };
}

/**
 * A Doppler velocity from a line (S5). The rest wavelength and its medium are explicit inputs (see restOf); a missing
 * medium is refused 'medium-missing' and a mismatch with the spectrum's 'medium-mismatch', never converted.
 * @param {object} spec
 * @param {{restNm: number, restMedium: string, guessNm?: number, z0?: number, halfWidthPx?: number}} o
 */
export function lineVelocity(spec, { restNm, restMedium, guessNm, z0 = 0, halfWidthPx } = {}) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  if (!restMedium)
    return refused(
      'medium-missing',
      'a velocity needs the medium of the rest wavelength'
    );
  const fit = fitGaussianLine(spec, {
    guessNm: guessNm ?? restNm * (1 + z0),
    halfWidthPx,
  });
  if (fit.status !== 'ok') return fit;
  const rv = norm(
    radialVelocity({
      observedNm: fit.centreNm,
      sigmaNm: fit.sigmaCentreNm,
      restNm,
      observedMedium: spec.medium,
      restMedium,
    })
  );
  if (rv.status !== 'ok') return rv;
  return {
    status: 'ok',
    velocityKmS: rv.velocityKmS,
    sigmaKmS: rv.sigmaKmS,
    interval: covarianceInterval(rv.velocityKmS, rv.sigmaKmS),
    z: rv.z,
    medium: rv.medium,
    form: rv.form,
    restNm,
    fit,
  };
}

/** Whether two lines are resolved from each other by the committed dip rule. */
export function pairResolved(separationNm, fwhmNm) {
  const separationFwhm = separationNm / fwhmNm;
  const dip = pairDip(separationFwhm);
  return { resolved: dip >= DIP_CUT, dip, separationFwhm, dipCut: DIP_CUT };
}
