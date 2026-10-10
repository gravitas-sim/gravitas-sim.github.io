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
import { LINES } from '../../js/data/radiation/lines.js';
import * as SDSS from '../../js/data/spectra/sdssSpectra.js';
import {
  velocityFromWavelengths,
  velocityFromZ,
} from '../../js/kernels/radiation/doppler.js';
import {
  syntheticFlux,
  syntheticGrid,
  SYNTH_STARS,
  VIEW_LINES,
  measureViewLine,
  kirchhoffFacts,
  planckRatio,
  KIRCHHOFF_LINES,
  boltzmannRatio21,
} from '../../js/light/model.js';

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

/**
 * What the spectrum viewer reports for one line of one source: the measurement
 * node's result on the very spectrum the viewer draws (js/lightWidgets.js
 * builds the same arrays), with the star's catalogue velocity for a real one.
 * @param {string} src - 'a', 'g', 'k', 'm' or 's1' to 's3'
 * @param {string} lineId - A line-list id the viewer measures
 */
export function viewerMeasurement(src, lineId) {
  const win = VIEW_LINES.find(w => w.id === lineId);
  const restA = LINES.find(l => l.id === lineId).vacuum * 10;
  let x;
  let y;
  if (src.startsWith('s')) {
    x = syntheticGrid(restA);
    y = Array.from(
      syntheticFlux(
        x,
        SYNTH_STARS.find(s => s.id === src)
      )
    );
  } else {
    x = Array.from(SDSS.wavelengths());
    y = Array.from(SDSS.decodeSpectrum(src).flux);
  }
  return measureViewLine(x, y, restA, win);
}

/** Inverse-variance weighted mean of (value, sigma) pairs, and its sigma. */
export function weightedMean(pairs) {
  const w = pairs.map(([, e]) => 1 / (e * e));
  const sum = w.reduce((a, b) => a + b, 0);
  return {
    mean: pairs.reduce((a, [v], i) => a + v * w[i], 0) / sum,
    sigma: Math.sqrt(1 / sum),
  };
}

/** The Lines and Motion values the lesson writes as literals. */
export const MOTION_VALUES = {
  arithmetic: () => velocityFromWavelengths(4865.0, 4862.7, 'classical'),
  star1Halpha: () => viewerMeasurement('s1', 'h-alpha').velocity,
  star2Halpha: () => viewerMeasurement('s2', 'h-alpha').velocity,
  star1Combined: () =>
    weightedMean(
      ['h-alpha', 'h-beta'].map(id => {
        const m = viewerMeasurement('s1', id);
        return [m.velocity, m.velocityError];
      })
    ).mean,
  aHbetaEw: () => viewerMeasurement('a', 'h-beta').ew,
  z01Relativistic: () => velocityFromZ(0.1),
  aCombined: () =>
    weightedMean(
      ['h-alpha', 'h-beta'].map(id => {
        const m = viewerMeasurement('a', id);
        return [m.velocity, m.velocityError];
      })
    ).mean,
  aCatalogue: () => SDSS.decodeSpectrum('a').z * 299792.458,
};

/** What the Kirchhoff demonstrator reads at H-alpha for a source seen through a cloud. */
export const kirchhoff = (Ts, Tc, tau0 = 3) =>
  kirchhoffFacts({ Ts, Tc, tau0, mode: 'both' });

/** What What a Spectrum Is Made Of asks for in its core measurement, percent. */
export const KIRCHHOFF_CORE = {
  cool: () => kirchhoff(6000, 4000).centre * 100,
  hot: () => kirchhoff(6000, 8000).centre * 100,
};

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
  'lines-and-motion/doppler-arithmetic': {
    via: 'js/kernels/radiation doppler.js velocityFromWavelengths, classical form, observed 4,865.0 A against a rest 4,862.7 A',
    value: () => MOTION_VALUES.arithmetic(),
  },
};

/** The depth steps' values, for the headless grading test. */
export const LIGHT_DEPTH_VALUES = {
  luminosity: () => luminosity(0.8 * R_SUN_M, 4400) / L_SUN_W,
  radius: () =>
    Math.sqrt((1e5 * L_SUN_W) / (4 * Math.PI * SIGMA_SB)) / 3600 ** 2 / R_SUN_M,
  gMinusR4400: () => gMinusR(4400),
  // What a Spectrum Is Made Of
  planckFloor: () => planckRatio(KIRCHHOFF_LINES[0].rest, 4000, 8000) * 100,
  equivalentWidth: () => kirchhoff(6000, 4000).m.ew,
  boltzmann: () => boltzmannRatio21(10000) / boltzmannRatio21(6000),
  patch: Tc => {
    const f = kirchhoff(6000, Tc);
    return f.m.ew / (1 - f.ratio);
  },
  balmerRatio: () =>
    viewerMeasurement('a', 'h-alpha').ew / viewerMeasurement('g', 'h-alpha').ew,
};
