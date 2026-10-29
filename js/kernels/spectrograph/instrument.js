// =============================================================================
// The spectrograph kernel: the instrument
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// One slit spectrograph, as numbers: how many pixels, the instrument's own wavelength
// solution (a polynomial known only to the simulator), the line-spread function's FWHM and
// the detector's read noise. Everything the student works out (resolving power, sampling,
// the solution) is read from it or fitted to what it produced; nothing here is a facility's
// (Prompt 209's library lists no spectrograph, and no number is typed from memory).
//
//   DEFINED   nPixels, the truth coefficients, lsfFwhmNm, readNoiseE
//   DERIVED   R(lambda) = lambda / FWHM, the dispersion and sampling at a pixel,
//             the resolution elements across the detector
//
// The truth solution must increase with the pixel (bluest pixel first); a decreasing one
// is refused. Pure: no DOM.
// =============================================================================

import {
  FWHM_PER_SIGMA,
  judgeSampling,
  resolutionElements,
  samplingOf,
} from './lsf.js';
import { truthSolution } from './solution.js';

const { Float64Array } = globalThis;

/**
 * @param {object} o
 * @param {number[]} o.coefficients - lambda = c0 + c1 x + ... in nm
 * @param {number} o.nPixels
 * @param {number} o.lsfFwhmNm - the line-spread FWHM, the same at every wavelength
 * @param {number} [o.readNoiseE] - electrons rms per pixel
 * @param {string} [o.name]
 */
export function makeSpectrograph({
  coefficients,
  nPixels,
  lsfFwhmNm,
  readNoiseE = 5,
  name = 'reference spectrograph',
}) {
  if (!(Number.isInteger(nPixels) && nPixels >= 8))
    throw new RangeError('a spectrograph has at least 8 pixels');
  if (!(lsfFwhmNm > 0))
    throw new RangeError('the line-spread FWHM must be positive');
  if (!(readNoiseE >= 0)) throw new RangeError('read noise cannot be negative');
  const truth = truthSolution(coefficients);
  const edges = new Float64Array(nPixels + 1);
  for (let i = 0; i <= nPixels; i++) edges[i] = truth.edge(i);
  for (let i = 1; i <= nPixels; i++)
    if (!(edges[i] > edges[i - 1]))
      throw new RangeError(
        'the wavelength solution must increase with the pixel'
      );
  const lsfSigmaNm = lsfFwhmNm / FWHM_PER_SIGMA;
  const spec = {
    name,
    nPixels,
    coefficients: truth.coefficients,
    truth,
    edges,
    lsfFwhmNm,
    lsfSigmaNm,
    readNoiseE,
    /** the first and last pixel centres' wavelengths */
    rangeNm: [truth.at(0), truth.at(nPixels - 1)],
    centreNm: i => truth.at(i),
    dispersionAt: x => truth.slope(x),
    resolvingPowerAt: lambdaNm => lambdaNm / lsfFwhmNm,
    fwhmPxAt: x => samplingOf(lsfFwhmNm, truth.slope(x)),
    samplingAt: x => samplingOf(lsfFwhmNm, truth.slope(x)),
    samplingVerdictAt: x =>
      judgeSampling(samplingOf(lsfFwhmNm, truth.slope(x))),
    resolutionElements: () =>
      resolutionElements(truth.at(nPixels - 0.5) - truth.at(-0.5), lsfFwhmNm),
    /** the pixel coordinate of a wavelength, NaN off the detector */
    pixelOf: lambdaNm => {
      if (!(lambdaNm >= edges[0] && lambdaNm <= edges[nPixels])) return NaN;
      let lo = -0.5;
      let hi = nPixels - 0.5;
      for (let k = 0; k < 200 && hi - lo > 1e-12; k++) {
        const m = 0.5 * (lo + hi);
        if (truth.at(m) < lambdaNm) lo = m;
        else hi = m;
      }
      return 0.5 * (lo + hi);
    },
  };
  return Object.freeze(spec);
}

/** The reference instrument of the validation contract: 2048 pixels, 380 + 0.105 x - 1e-7 x^2 + 4e-12 x^3 nm, FWHM 0.3 nm, 5 e- read noise. */
export const REFERENCE = Object.freeze({
  coefficients: Object.freeze([380.0, 0.105, -1e-7, 4e-12]),
  nPixels: 2048,
  lsfFwhmNm: 0.3,
  readNoiseE: 5,
});

export const referenceSpectrograph = (overrides = {}) =>
  makeSpectrograph({
    ...REFERENCE,
    coefficients: [...REFERENCE.coefficients],
    ...overrides,
  });
