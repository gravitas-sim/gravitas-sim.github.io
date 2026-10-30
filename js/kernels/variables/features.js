// =============================================================================
// Variable stars: the features of a folded light curve, with their errors
// -----------------------------------------------------------------------------
// What the classification and the period-luminosity work read off a curve that
// repeats, and how sure each number is (Prompt 223; TIME_DOMAIN_LADDER.md and
// VARIABLES_II.md):
//
//   period, cycles   GIVEN and MEASURED: the period the curve is folded on and
//                    how many cycles the run holds
//   amplitude        DERIVED: peak to peak of the fitted curve
//   skewness         DERIVED: the third standardised moment of the fitted
//                    magnitudes over one cycle
//   riseFraction     DERIVED: the fraction of a cycle the light takes to rise
//                    from faintest to brightest (0.5 for a sinusoid; a sawtooth RR
//                    Lyrae star rises in about a fifth of its cycle)
//   R21, R31         DERIVED: A2/A1 and A3/A1 (Simon and Lee 1981, ApJ 248, 291)
//   phi21, phi31     DERIVED: phi2 - 2 phi1 and phi3 - 3 phi1, in [0, 2 pi)
//                    (the Fourier decomposition of Simon and Lee 1981; Soszynski
//                    et al. 2008, AcA 58, 163)
//
// Each shape number carries a first-order error propagated from the covariance
// of the cosine/sine coefficients. And each can be refused: a run of fewer than
// three cycles, or one whose phases leave a gap of more than 0.35 of a cycle,
// or one with too few points for the harmonics asked for, does not constrain
// the shape. Then the numbers are null and the status says why, rather than a
// fit to whatever is there. A harmonic is "detected" when its amplitude is more
// than three of its own sigmas.
//
// The Hertzsprung progression is a described feature, not a template here: the
// bump on the light curve of a classical Cepheid moves from the descending to
// the rising branch as the period passes about ten days (Hertzsprung 1926), and
// the Fourier numbers R21 and phi21 change character there.
// =============================================================================

import { harmonicFit } from './fit.js';

const { Math } = globalThis;
const TWO_PI = 2 * Math.PI;
const wrap = x => ((x % TWO_PI) + TWO_PI) % TWO_PI;

export const FEATURES_VERSION = '1.0.0';

/** What a run must hold before its shape is believed. */
export const MIN_CYCLES = 3;
export const MAX_PHASE_GAP = 0.35;
export const DETECTION_SIGMA = 3;

/** The largest gap in phase, as a fraction of a cycle, left by the times. */
export function largestPhaseGap(t, period, t0 = 0) {
  const p = Array.from(t, x => {
    const f = (x - t0) / period;
    return f - Math.floor(f);
  }).sort((a, b) => a - b);
  if (p.length < 2) return 1;
  let gap = p[0] + 1 - p[p.length - 1];
  for (let i = 1; i < p.length; i++) gap = Math.max(gap, p[i] - p[i - 1]);
  return gap;
}

const quad = (g, C) => {
  let s = 0;
  for (let i = 0; i < g.length; i++)
    for (let j = 0; j < g.length; j++) s += g[i] * C[i][j] * g[j];
  return Math.sqrt(Math.max(0, s));
};

/** Gradient of the amplitude and the phase of harmonic k with respect to the coefficients. */
function harmonicGradients(coef, m, k) {
  const a = coef[2 * k - 1];
  const s = coef[2 * k];
  const A = Math.hypot(a, s);
  const gA = new Array(m).fill(0);
  const gP = new Array(m).fill(0);
  gA[2 * k - 1] = a / A;
  gA[2 * k] = s / A;
  gP[2 * k - 1] = s / (A * A);
  gP[2 * k] = -a / (A * A);
  return { A, gA, gP, phase: Math.atan2(-s, a) };
}

const combine = (...pairs) => {
  const out = new Array(pairs[0][1].length).fill(0);
  for (const [w, g] of pairs)
    for (let i = 0; i < out.length; i++) out[i] += w * g[i];
  return out;
};

/**
 * The features of a light curve at a period.
 * @param {ArrayLike<number>} t
 * @param {ArrayLike<number>} mag - magnitudes (or any quantity that repeats)
 * @param {number} period
 * @param {{K?: number, dy?: ArrayLike<number>|null, t0?: number, minCycles?: number,
 *   maxGap?: number}} [opts]
 * @returns {{status: 'ok'|'not-constrained', reason: string|null, period: number,
 *   t0: number, K: number, n: number, cycles: number, phaseGap: number,
 *   mean: number|null, meanError: number|null, amplitude: number|null,
 *   skewness: number|null, riseFraction: number|null, rms: number|null,
 *   harmonics: Array<{amplitude: number, sigma: number, detected: boolean}>|null,
 *   fourier: null|{r21: {value: number, sigma: number}, r31: {value: number, sigma: number},
 *     phi21: {value: number, sigma: number}, phi31: {value: number, sigma: number}}}}
 */
export function lightCurveFeatures(
  t,
  mag,
  period,
  { K = 3, dy = null, t0, minCycles = MIN_CYCLES, maxGap = MAX_PHASE_GAP } = {}
) {
  const n = t.length;
  const ref = t0 ?? t[0];
  const span = n ? Math.max(...t) - Math.min(...t) : 0;
  const cycles = period > 0 ? span / period : 0;
  const phaseGap = largestPhaseGap(t, period, ref);
  const base = {
    status: 'not-constrained',
    reason: null,
    period,
    t0: ref,
    K,
    n,
    cycles,
    phaseGap,
    mean: null,
    meanError: null,
    amplitude: null,
    skewness: null,
    riseFraction: null,
    rms: null,
    harmonics: null,
    fourier: null,
  };
  const fit =
    n >= 2 * K + 2 ? harmonicFit(t, mag, period, K, { t0: ref, dy }) : null;
  if (fit) {
    base.mean = fit.mean;
    base.meanError = fit.meanError;
    base.rms = fit.rms;
  }
  if (!(period > 0)) return { ...base, reason: 'period' };
  if (K < 3) return { ...base, reason: 'harmonics' };
  if (!fit) return { ...base, reason: 'points' };
  if (cycles < minCycles) return { ...base, reason: 'cycles' };
  if (phaseGap > maxGap) return { ...base, reason: 'phase-gap' };
  if (n < 4 * K + 1) return { ...base, reason: 'points' };

  const m = 2 * K + 1;
  const C = fit.covariance;
  const h = [];
  for (let k = 1; k <= K; k++)
    h.push(harmonicGradients(fit.coefficients, m, k));
  const harmonics = h.map(x => {
    const sigma = quad(x.gA, C);
    return {
      amplitude: x.A,
      sigma,
      detected: x.A / sigma > DETECTION_SIGMA,
    };
  });
  const ratio = j => {
    const g = combine(
      [1 / h[0].A, h[j].gA],
      [-h[j].A / (h[0].A * h[0].A), h[0].gA]
    );
    return { value: h[j].A / h[0].A, sigma: quad(g, C) };
  };
  const phi = j => {
    const g = combine([1, h[j].gP], [-(j + 1), h[0].gP]);
    return {
      value: wrap(h[j].phase - (j + 1) * h[0].phase),
      sigma: quad(g, C),
    };
  };

  // The fitted curve over one cycle: its range, its skewness, its rise.
  const grid = 720;
  const v = new Array(grid);
  let lo = Infinity;
  let hi = -Infinity;
  let iLo = 0;
  let iHi = 0;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const y = fit.at(ref + (i / grid) * period);
    v[i] = y;
    sum += y;
    if (y < lo) {
      lo = y;
      iLo = i;
    }
    if (y > hi) {
      hi = y;
      iHi = i;
    }
  }
  const mu = sum / grid;
  let m2 = 0;
  let m3 = 0;
  for (let i = 0; i < grid; i++) {
    const d = v[i] - mu;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= grid;
  m3 /= grid;
  // In magnitudes brighter is smaller: the light rises from the faintest (hi) to the brightest (lo).
  const rise = (((iLo - iHi) % grid) + grid) % grid;
  return {
    ...base,
    status: 'ok',
    reason: null,
    amplitude: hi - lo,
    skewness: m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0,
    riseFraction: rise / grid,
    harmonics,
    fourier: { r21: ratio(1), r31: ratio(2), phi21: phi(1), phi31: phi(2) },
  };
}
