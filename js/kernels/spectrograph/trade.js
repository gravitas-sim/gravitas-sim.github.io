// =============================================================================
// The spectrograph kernel: light through a slit, and the resolving-power trade
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// A narrower slit gives a narrower line-spread function, and a higher resolving power,
// and passes less of the star's light. For a fixed grating, camera and detector the
// resolving power is inversely proportional to the slit width: R w = R_s theta, with R_s
// the resolving power at which the slit just equals the seeing disk's FWHM theta.
//
//   slitThroughput        DERIVED  erf(w / (2 sqrt 2 sigma_seeing)), the fraction of a
//                                  Gaussian seeing disk a long slit of width w passes
//   throughputAtR         DERIVED  erf(sqrt(ln 2) R_s / R)
//   ewSigma               DERIVED  the standard deviation of a weighted fit of an absorption
//                                  line's equivalent width, its shape and the continuum
//                                  known: 1 / (S_c sqrt(sum P_i^2 / (S_c d + RN^2))), the
//                                  discrete sum over pixels; ewSigmaContinuous is its
//                                  matched-filter limit sqrt(2 sqrt(pi) sigma_obs / S_c)
//   optimumResolvingPower DERIVED  the R that maximises the line's signal-to-noise
//
// ASSUMED: no guiding error, no diffraction in the slit, a slit long enough to hold the
// seeing disk, sky noise ignored, the pixel size following the line-spread FWHM so the
// sampling stays fixed (the trade is about light and width, not about undersampling).
// Pure: no DOM.
// =============================================================================

import { FWHM_PER_SIGMA, erf, gaussianArea, sigmaFromFwhm } from './lsf.js';

const { Math } = globalThis;

/** The fraction of a Gaussian seeing disk of FWHM theta that a long slit of width w passes (both in arcsec). */
export const slitThroughput = (slitArcsec, seeingFwhmArcsec) =>
  erf(slitArcsec / (2 * Math.SQRT2 * sigmaFromFwhm(seeingFwhmArcsec)));

/** The slit width that holds a resolving power R: w = R_s theta / R (R_s the resolving power at slit = seeing). */
export const slitWidthFor = (R, Rs, seeingFwhmArcsec) =>
  (Rs * seeingFwhmArcsec) / R;

/** The throughput at a resolving power R: erf(sqrt(ln 2) R_s / R). */
export const throughputAtR = (R, Rs) => erf((Math.sqrt(Math.LN2) * Rs) / R);

/**
 * The standard deviation of the fitted equivalent width (nm) of an absorption line of a known profile on a known
 * continuum, a discrete sum over the pixels within 12 sigma.
 * @param {{sigmaObsNm: number, continuumPerNm: number, pixelNm: number, readNoiseE?: number, centreOffsetPx?: number}} o
 */
export function ewSigma({
  sigmaObsNm,
  continuumPerNm,
  pixelNm,
  readNoiseE = 0,
  centreOffsetPx = 0,
}) {
  const n = Math.ceil((12 * sigmaObsNm) / pixelNm);
  const variance = continuumPerNm * pixelNm + readNoiseE * readNoiseE;
  let sum = 0;
  for (let i = -n; i <= n; i++) {
    const p = gaussianArea(
      centreOffsetPx * pixelNm,
      sigmaObsNm,
      (i - 0.5) * pixelNm,
      (i + 0.5) * pixelNm
    );
    sum += (p * p) / variance;
  }
  return 1 / (continuumPerNm * Math.sqrt(sum));
}

/** The matched-filter limit of ewSigma: no read noise, many pixels per sigma. */
export const ewSigmaContinuous = (sigmaObsNm, continuumPerNm) =>
  Math.sqrt((2 * Math.sqrt(Math.PI) * sigmaObsNm) / continuumPerNm);

/** The line-spread sigma at a resolving power and wavelength (nm). */
export const lsfSigmaAtR = (lambdaNm, R) => lambdaNm / R / FWHM_PER_SIGMA;

/**
 * One point of the trade: at a resolving power R, with the slit that gives it, what the line's signal-to-noise is.
 * @param {object} o
 * @param {number} o.R
 * @param {number} o.Rs - the resolving power at which the slit equals the seeing
 * @param {number} o.lambdaNm
 * @param {number} o.sigmaIntNm - the line's own sigma (0 for unresolved)
 * @param {number} o.ewNm - the line's equivalent width
 * @param {number} o.continuumPerNmFull - the continuum in electrons per nm that reaches the detector with no slit loss
 * @param {number} [o.readNoiseE]
 * @param {number} [o.samplingPx] - pixels per FWHM the pixel size is set to
 */
export function tradePoint({
  R,
  Rs,
  lambdaNm,
  sigmaIntNm,
  ewNm,
  continuumPerNmFull,
  readNoiseE = 0,
  samplingPx = 2.5,
}) {
  const throughput = throughputAtR(R, Rs);
  const sigmaLsfNm = lsfSigmaAtR(lambdaNm, R);
  const sigmaObsNm = Math.hypot(sigmaIntNm, sigmaLsfNm);
  const continuumPerNm = continuumPerNmFull * throughput;
  const pixelNm = (sigmaLsfNm * FWHM_PER_SIGMA) / samplingPx;
  const sigmaEw = ewSigma({ sigmaObsNm, continuumPerNm, pixelNm, readNoiseE });
  return {
    R,
    throughput,
    sigmaObsNm,
    sigmaLsfNm,
    fwhmNm: sigmaLsfNm * FWHM_PER_SIGMA,
    resolved: sigmaIntNm > sigmaLsfNm,
    continuumPerNm,
    pixelNm,
    sigmaEwNm: sigmaEw,
    snr: ewNm / sigmaEw,
    minimumEwNm3: 3 * sigmaEw,
  };
}

/** The objective whose maximum is the best resolving power: throughput over the observed sigma (SNR squared up to constants). */
export const lineObjective = (R, { Rs, lambdaNm, sigmaIntNm }) =>
  throughputAtR(R, Rs) / Math.hypot(sigmaIntNm, lsfSigmaAtR(lambdaNm, R));

/**
 * The resolving power in [lo, hi] that maximises lineObjective, by golden-section search on its logarithm. For an
 * unresolved line (sigmaIntNm 0) the objective only rises with R and the answer is the upper end.
 */
export function optimumResolvingPower({
  Rs,
  lambdaNm,
  sigmaIntNm,
  lo = Rs / 20,
  hi = 40 * Rs,
}) {
  const f = lr => lineObjective(Math.exp(lr), { Rs, lambdaNm, sigmaIntNm });
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = Math.log(lo);
  let b = Math.log(hi);
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < 200 && b - a > 1e-13; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - gr * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + gr * (b - a);
      fd = f(d);
    }
  }
  const R = Math.exp(0.5 * (a + b));
  return {
    R,
    value: lineObjective(R, { Rs, lambdaNm, sigmaIntNm }),
    atBound: Math.abs(Math.log(R) - Math.log(hi)) < 1e-6,
  };
}
