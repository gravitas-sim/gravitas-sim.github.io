// =============================================================================
// Injection and recovery of a transit in a searched target (Prompt 229)
// -----------------------------------------------------------------------------
// A planet is injected into a target's series: the exposure-integrated,
// limb-darkened deficit of the transit model of the inference core
// (js/inference/transit.js, the one the forward model uses) at the cadence's
// own times, at every epoch the target's span holds. The search recovers it
// with the matched filter at the injected ephemeris: the amplitude of the
// injected shape fitted to the noisy series, in units of its error,
//
//   S_true = sqrt(sum s_t^2) / sigma          the statistic with no noise
//   S      = S_true + e                       e ~ N(0, 1) for white noise
//
// recovered when S reaches the threshold and the target holds at least
// MIN_TRANSITS epochs. Its analytic form for white noise is Phi(S_true -
// threshold). Stated simplifications, all of which make completeness
// optimistic and are in the validation table: the ephemeris is known (no period
// search, so no look-elsewhere), the baseline is perfect, the noise is white
// unless a correlation is stated (an AR(1) series: the statistic's variance is
// the closed form `redFactor`), at most MAX_EPOCHS epochs are integrated and
// the sum scaled by N / used, and white noise sums to N(0, 1) so one draw
// replaces the points (validated against a draw at every point).
// =============================================================================

import { halfDuration, transitFlux } from '../../inference/transit.js';
import { gaussian } from '../../random/streams.js';
import { normalCdf } from '../statistics/special.js';
import {
  CADENCE,
  LIMB,
  MIN_TRANSITS,
  R_EARTH,
  R_SUN,
  THRESHOLD,
  aOverR,
  epochCount,
} from './survey.js';

const { Math, Float64Array } = globalThis;

export const MAX_EPOCHS = 24;
const SUPERSAMPLE = 3;
const ANNULI = 16;

/** Phi(S_true - threshold): the efficiency of a white-noise matched filter, given at least MIN_TRANSITS epochs. */
export const analyticEfficiency = (sTrue, threshold = THRESHOLD) =>
  normalCdf(sTrue - threshold);

/** The transit's parameters in the inference core's names, for a star and a planet. */
export function transitParameters({ P, radiusEarth, b }, star, t0 = 0) {
  return {
    t0,
    P,
    k: (radiusEarth * R_EARTH) / (star.radius * R_SUN),
    aRs: aOverR(P, star),
    b,
    u1: LIMB[0],
    u2: LIMB[1],
  };
}

/** The cadence times within a half window of a mid-time: t = (j + 0.5) CADENCE. */
export function windowTimes(mid, half) {
  const j0 = Math.floor((mid - half) / CADENCE);
  const j1 = Math.ceil((mid + half) / CADENCE);
  const t = new Float64Array(j1 - j0 + 1);
  for (let j = j0; j <= j1; j++) t[j - j0] = (j + 0.5) * CADENCE;
  return t;
}

/**
 * The signal of an injected planet: N epochs, the deficits at up to MAX_EPOCHS
 * of them (spread evenly) and the sum of their squares scaled to all N.
 * @param {{P: number, radiusEarth: number, b: number}} planet
 * @param {{radius: number, mass: number, span: number}} star
 * @param {number} t0 - The first mid-transit time, in [0, P), days
 * @param {{keepShapes?: boolean, maxEpochs?: number}} [o]
 */
export function transitSignal(planet, star, t0, o = {}) {
  const N = epochCount(planet.P, star.span, t0);
  if (N === 0) return { N, used: 0, s2: 0, shapes: [] };
  const p = transitParameters(planet, star, t0);
  const half = halfDuration(p);
  if (!Number.isFinite(half)) return { N, used: 0, s2: 0, shapes: [] };
  const used = Math.min(N, o.maxEpochs ?? MAX_EPOCHS);
  let s2 = 0;
  const shapes = [];
  for (let m = 0; m < used; m++) {
    const e = Math.floor(((m + 0.5) * N) / used);
    const mid = t0 + e * planet.P;
    const t = windowTimes(mid, half + CADENCE);
    const f = transitFlux(
      t,
      { ...p, t0: mid },
      { exposure: CADENCE, supersample: SUPERSAMPLE, annuli: ANNULI }
    );
    const s = new Float64Array(f.length);
    for (let i = 0; i < f.length; i++) {
      s[i] = 1 - f[i];
      s2 += s[i] * s[i];
    }
    if (o.keepShapes) shapes.push(s);
  }
  return { N, used, s2: (s2 * N) / used, shapes };
}

/** S_true of a signal for a target: sqrt(sum s^2) / sigma. */
export const signalToNoise = (signal, star) =>
  Math.sqrt(signal.s2) / star.sigma;

/**
 * The factor by which AR(1) noise (unit marginal variance, correlation rho
 * between consecutive cadences) widens the statistic: sqrt(sum over epochs of
 * s' C s / sum s^2), C_ij = rho^|i-j|. One for rho = 0.
 */
export function redFactor(signal, rho) {
  if (!(rho > 0) || !signal.shapes.length) return 1;
  let num = 0;
  let den = 0;
  for (const s of signal.shapes) {
    const n = s.length;
    // s' C s by the recursion of the AR(1) covariance: O(n) per epoch.
    let q = 0; // sum_j<=i rho^(i-j) s_j
    let acc = 0;
    for (let i = 0; i < n; i++) {
      q = rho * q + s[i];
      acc += s[i] * (2 * q - s[i]);
      den += s[i] * s[i];
    }
    num += acc;
  }
  return Math.sqrt(num / den);
}

/**
 * Whether the search recovers the signal, by the matched filter: the statistic
 * is S_true + sEff * e, e ~ N(0, 1), drawn once from `draw` (a uniform stream).
 * @param {{N: number, s2: number, shapes?: Float64Array[]}} signal
 * @param {{sigma: number}} star
 * @param {function(): number} draw
 * @param {{threshold?: number, rho?: number}} [o]
 */
export function recover(
  signal,
  star,
  draw,
  { threshold = THRESHOLD, rho = 0 } = {}
) {
  if (signal.N < MIN_TRANSITS || !(signal.s2 > 0))
    return { detected: false, S: 0, statistic: NaN, N: signal.N };
  const S = signalToNoise(signal, star);
  const sEff = rho > 0 ? redFactor(signal, rho) : 1;
  const statistic = S + sEff * gaussian(draw)();
  return { detected: statistic >= threshold, S, statistic, N: signal.N };
}

/**
 * The same, with a noise draw at every point of every used epoch (white or
 * AR(1)): the literal injection and recovery. The statistic is the sum of
 * s_t n_t over the points in the used epochs, scaled by sqrt(N / used) and
 * divided by sqrt(sum s^2) (sigma is the marginal scatter of n_t / sigma).
 */
export function recoverByPoints(
  signal,
  star,
  draw,
  { threshold = THRESHOLD, rho = 0 } = {}
) {
  if (signal.N < MIN_TRANSITS || !(signal.s2 > 0))
    return { detected: false, S: 0, statistic: NaN, N: signal.N };
  const g = gaussian(draw);
  let sum = 0;
  let ss = 0;
  const innov = Math.sqrt(1 - rho * rho);
  for (const s of signal.shapes) {
    let prev = g();
    for (let i = 0; i < s.length; i++) {
      const e = i === 0 ? prev : rho * prev + innov * g();
      prev = e;
      sum += s[i] * e;
      ss += s[i] * s[i];
    }
  }
  const scale = signal.N / signal.shapes.length;
  const S = Math.sqrt(signal.s2) / star.sigma;
  const statistic = S + (Math.sqrt(scale) * sum) / Math.sqrt(ss * scale);
  return { detected: statistic >= threshold, S, statistic, N: signal.N };
}
