// =============================================================================
// Depth and completeness of a stacked exposure (Prompt 215, SURVEY_DESIGN.md)
// -----------------------------------------------------------------------------
// The CCD equation is js/kernels/detector/snr.js, read unchanged. A point source is
// measured with the matched filter (optimal aperture of 4 pi sigma^2 pixels), so the
// signal to noise s of a source of magnitude m after `v` frames of `t` seconds is
// snrAt with the read noise of v frames. A source is detected when s plus unit
// Gaussian noise exceeds the threshold theta: completeness Phi(s - theta), so the
// half-completeness magnitude IS the magnitude at which s = theta (`depth`).
// =============================================================================

import {
  FWHM_PER_SIGMA,
  limitingMagnitude,
  rateOfMagnitude,
  skyRatePerPixel,
  snrAt,
} from '../detector/snr.js';
import { normalCdf } from './special.js';

const { Math } = globalThis;

export const VERSION = '1.0.0';

/**
 * A setup checked and completed: the dark rate, the overhead, the extinction (total magnitudes at the
 * airmass) and the full well default to 0, 0, 0 and Infinity. Returns {ok:false, code} on a bad field.
 */
export function normalizeSetup(s) {
  if (!s || typeof s !== 'object') return { ok: false, code: 'bad-setup' };
  const v = {
    darkRate: 0,
    overhead: 0,
    extinction: 0,
    fullWell: Infinity,
    readNoise: 0,
    ...s,
  };
  const bad = f => ({ ok: false, code: 'bad-setup', field: f });
  if (!(v.zeroPoint > 0)) return bad('zeroPoint');
  if (!(v.pixelScale > 0)) return bad('pixelScale');
  if (!(v.fwhm > 0)) return bad('fwhm');
  if (!Number.isFinite(v.skyMag)) return bad('skyMag');
  if (!(v.readNoise >= 0)) return bad('readNoise');
  if (!(v.darkRate >= 0)) return bad('darkRate');
  if (!(v.fullWell > 0)) return bad('fullWell');
  if (!(v.fovDeg2 > 0)) return bad('fovDeg2');
  if (!(v.overhead >= 0)) return bad('overhead');
  if (!(v.extinction >= 0)) return bad('extinction');
  return { ok: true, setup: v };
}

/** The sigma of the point-spread function in pixels. */
export const sigmaPixels = s => s.fwhm / s.pixelScale / FWHM_PER_SIGMA;

/** The noise-equivalent area of the matched filter, in pixels. */
export const matchedPixels = s => 4 * Math.PI * sigmaPixels(s) ** 2;

/** The inputs of snr.js for a normalised setup and `visits` stacked frames. */
export function noiseParams(setup, visits = 1) {
  return {
    zeroPoint: setup.zeroPoint,
    npix: matchedPixels(setup),
    skyRate: skyRatePerPixel(setup.zeroPoint, setup.skyMag, setup.pixelScale),
    darkRate: setup.darkRate,
    readNoise: setup.readNoise,
    nExp: visits,
    extinction: setup.extinction,
  };
}

/** The magnitude at which the matched-filter signal to noise reaches `snr` after `visits` frames of `exposure` seconds. */
export const depthOf = (setup, exposure, visits, snr) =>
  limitingMagnitude(noiseParams(setup, visits), exposure * visits, snr);

/** The matched-filter signal to noise of a source of magnitude m. */
export function snrOfMagnitude(setup, exposure, visits, m) {
  const p = noiseParams(setup, visits);
  return snrAt(
    { ...p, rate: rateOfMagnitude(setup.zeroPoint, m + setup.extinction) },
    exposure * visits
  );
}

/** The magnitude of the source whose matched-filter signal to noise is `s` (monotone: bisection). */
export function magnitudeAtSnr(setup, exposure, visits, s) {
  let lo = -5;
  let hi = 45;
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    if (snrOfMagnitude(setup, exposure, visits, mid) > s) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Completeness of a detection threshold at signal to noise s. */
export const completeness = (s, theta) => normalCdf(s - theta);

/** Seconds of sky and dark that fill the pixel well: the longest frame that does not saturate. */
export function wellTime(setup) {
  const rate =
    skyRatePerPixel(setup.zeroPoint, setup.skyMag, setup.pixelScale) +
    setup.darkRate;
  return setup.fullWell / rate;
}

/** The longest frame exposure that reaches `depth` at signal to noise theta with `visits` frames; Infinity when the sky alone cannot reach it. */
export function exposureForDepth(setup, visits, depth, theta) {
  let lo = 1e-3;
  let hi = 1e7;
  if (depthOf(setup, hi, visits, theta) < depth) return Infinity;
  for (let i = 0; i < 100; i++) {
    const mid = Math.sqrt(lo * hi);
    if (depthOf(setup, mid, visits, theta) >= depth) hi = mid;
    else lo = mid;
  }
  return hi;
}
