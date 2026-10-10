// =============================================================================
// The Light investigations' expected values, from the radiation kernel
// -----------------------------------------------------------------------------
// Each is the value the lesson writes as a literal, recomputed here from
// js/kernels/radiation (RADIATION.md) and the bandpass pack, in the unit the
// step asks for. tools/authoring/modelChecked.mjs spreads this table into
// MODELS; tests/lightInvestigations.test.js also reads it. Node only: no route
// downloads any of it.
// =============================================================================

import {
  wienPeakLambda,
  temperatureFromPeak,
  luminosity,
  SIGMA_SB,
  R_SUN_M,
  L_SUN_W,
  blackbodyColor,
  decodeBand,
} from '../../js/kernels/radiation/index.js';
import { BANDS } from '../../js/data/radiation/bandpasses.js';

const band = id => decodeBand(BANDS.find(b => b.id === id));

/** Bisection on a monotone function. */
const solve = (f, target, lo, hi) => {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target === f(lo) < f(hi)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

/** B - V (Vega system) of a blackbody. */
export const bMinusV = T => blackbodyColor(T, band('B'), band('V'), 'vega');
/** g - r (AB system) of a blackbody. */
export const gMinusR = T => blackbodyColor(T, band('g'), band('r'), 'ab');

export const LIGHT_MODELS = {
  'color-and-temperature/peak-of-4000': {
    via: 'js/kernels/radiation planck.js wienPeakLambda at 4,000 K, in nm',
    value: () => wienPeakLambda(4000) * 1e9,
  },
  'color-and-temperature/temperature-from-peak': {
    via: 'js/kernels/radiation planck.js temperatureFromPeak at 380 nm',
    value: () => temperatureFromPeak(380e-9),
  },
  'color-and-temperature/temperature-from-color': {
    via: 'js/kernels/radiation photometry.js blackbodyColor (Johnson B - V, Vega system, bandpass pack), inverted for B - V = 0.82',
    value: () => solve(bMinusV, 0.82, 3000, 12000),
  },
};

/** The depth steps' values, for the headless grading test. */
export const LIGHT_DEPTH_VALUES = {
  luminosity: () => luminosity(0.8 * R_SUN_M, 4400) / L_SUN_W,
  radius: () =>
    Math.sqrt((1e5 * L_SUN_W) / (4 * Math.PI * SIGMA_SB)) / 3600 ** 2 / R_SUN_M,
  gMinusR4400: () => gMinusR(4400),
};
