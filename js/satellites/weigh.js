// =============================================================================
// Weighing Jupiter from a moon (Prompt 193, SATELLITE_EPHEMERIS.md)
// -----------------------------------------------------------------------------
// A moon's elongation from the planet, read along the planet's equator, is
// very nearly a sinusoid in time: x(t) = a sin(wt) + b cos(wt) + c. Its period
// is the moon's orbital period (as the Earth sees it, see below) and its
// amplitude the orbit's semi-major axis. Kepler's third law then gives the
// planet's GM = 4 pi^2 a^3 / P^2, and its mass.
//
//   fitSinusoid      a period scan (a chi-square for every trial frequency),
//                    the best one refined, its uncertainties from the
//                    Jacobian, and every other period the data fit nearly as
//                    well (the alias list) with the chi-square difference
//   kepler           GM and mass with the propagated uncertainty
//   combine          the four moons' values, their weighted mean and a
//                    consistency test (chi-square against the mean)
//
// The apparent period is the one between conjunctions as seen from the Earth;
// the Earth and Jupiter both move, and the line of sight turns, so it differs
// from the orbital period by up to 0.1 percent (cadence.js: siderealPeriod).
// Pure: no DOM.
// =============================================================================

import { chiSquareSf } from '../analysis/stats.js';
import { GM_JUPITER, R_JUPITER_KM } from './galilean.js';

export const G_SI = 6.6743e-11;
export const FIT_LIMITS = Object.freeze({ minMarks: 8, maxMarks: 5000 });

/** Why a fit was refused, in words a student can act on. */
export class FitRefusal extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Solve the 3 by 3 weighted least squares of x on sin, cos and 1 at frequency f. */
function linearAt(t, x, w, f, t0) {
  const w2 = 2 * Math.PI * f;
  let s00 = 0,
    s01 = 0,
    s02 = 0,
    s11 = 0,
    s12 = 0,
    s22 = 0,
    b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < t.length; i++) {
    const ph = w2 * (t[i] - t0);
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    const wi = w[i];
    s00 += wi * s * s;
    s01 += wi * s * c;
    s02 += wi * s;
    s11 += wi * c * c;
    s12 += wi * c;
    s22 += wi;
    b0 += wi * s * x[i];
    b1 += wi * c * x[i];
    b2 += wi * x[i];
  }
  // Cramer's rule on a symmetric 3 by 3.
  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s12 - s11 * s02);
  if (!(Math.abs(det) > 1e-300)) return null;
  const a =
    (b0 * (s11 * s22 - s12 * s12) -
      s01 * (b1 * s22 - s12 * b2) +
      s02 * (b1 * s12 - s11 * b2)) /
    det;
  const b =
    (s00 * (b1 * s22 - s12 * b2) -
      b0 * (s01 * s22 - s12 * s02) +
      s02 * (s01 * b2 - b1 * s02)) /
    det;
  const c =
    (s00 * (s11 * b2 - b1 * s12) -
      s01 * (s01 * b2 - b1 * s02) +
      b0 * (s01 * s12 - s11 * s02)) /
    det;
  let chi2 = 0;
  for (let i = 0; i < t.length; i++) {
    const ph = w2 * (t[i] - t0);
    const r = x[i] - (a * Math.sin(ph) + b * Math.cos(ph) + c);
    chi2 += w[i] * r * r;
  }
  return { a, b, c, chi2 };
}

/** Invert a small symmetric positive definite matrix (rows of rows), or null. */
function invert(m) {
  const n = m.length;
  const a = m.map((r, i) => [
    ...r,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++)
      if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    if (Math.abs(a[p][i]) < 1e-300) return null;
    [a[i], a[p]] = [a[p], a[i]];
    const d = a[i][i];
    for (let c = 0; c < 2 * n; c++) a[i][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      for (let c = 0; c < 2 * n; c++) a[r][c] -= f * a[i][c];
    }
  }
  return a.map(r => r.slice(n));
}

/**
 * Fit x(t) = a sin(2 pi f (t - t0)) + b cos(...) + c.
 * @param {ArrayLike<number>} t - Days
 * @param {ArrayLike<number>} x - Jupiter radii
 * @param {number|ArrayLike<number>|null} sigma - One-sigma errors (a number for all), or null for none
 * @param {{minPeriodDays?: number, maxPeriodDays?: number}} [opts]
 * @returns {{periodDays, sigmaPeriodDays, amplitude, sigmaAmplitude, offset, sigmaOffset, chi2, dof, reducedChi2, marks, spanDays, candidates: Array<{periodDays, chi2, deltaChi2}>, ambiguous: boolean, weighted: boolean}}
 * @throws {FitRefusal}
 */
export function fitSinusoid(t, x, sigma = null, opts = {}) {
  const n = t.length;
  if (n < FIT_LIMITS.minMarks)
    throw new FitRefusal(
      'too-few-marks',
      `Only ${n} marks: a period needs at least ${FIT_LIMITS.minMarks}.`
    );
  if (n > FIT_LIMITS.maxMarks)
    throw new FitRefusal(
      'too-many-marks',
      `More than ${FIT_LIMITS.maxMarks} marks.`
    );
  let tMin = Infinity;
  let tMax = -Infinity;
  let tSum = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(t[i]) || !Number.isFinite(x[i]))
      throw new FitRefusal(
        'not-finite',
        'A time or a position is not a number.'
      );
    tMin = Math.min(tMin, t[i]);
    tMax = Math.max(tMax, t[i]);
    tSum += t[i];
  }
  const span = tMax - tMin;
  const weighted = sigma !== null;
  const w = Float64Array.from({ length: n }, (_, i) => {
    if (!weighted) return 1;
    const s = typeof sigma === 'number' ? sigma : sigma[i];
    if (!(s > 0))
      throw new FitRefusal('bad-sigma', 'An uncertainty is not positive.');
    return 1 / (s * s);
  });
  const t0 = tSum / n;
  const maxP = opts.maxPeriodDays ?? span / 1.5;
  const minP = opts.minPeriodDays ?? 0.3;
  if (!(span > 0) || maxP <= minP)
    throw new FitRefusal(
      'span-too-short',
      'The marks cover too little time to hold a period.'
    );
  const fLo = 1 / maxP;
  const fHi = 1 / minP;
  const df = 0.1 / span;
  const grid = [];
  for (let f = fLo; f <= fHi; f += df) {
    const r = linearAt(t, x, w, f, t0);
    if (r) grid.push({ f, chi2: r.chi2 });
  }
  if (grid.length < 3)
    throw new FitRefusal('span-too-short', 'There is no period to search.');
  // Local minima, the deepest first.
  const minima = [];
  for (let i = 1; i < grid.length - 1; i++)
    if (grid[i].chi2 <= grid[i - 1].chi2 && grid[i].chi2 < grid[i + 1].chi2)
      minima.push(i);
  minima.sort((p, q) => grid[p].chi2 - grid[q].chi2);
  if (!minima.length)
    throw new FitRefusal('no-minimum', 'The period search found no minimum.');
  const refine = i => {
    let lo = grid[i - 1].f;
    let hi = grid[i + 1].f;
    const g = (Math.sqrt(5) - 1) / 2;
    let p = hi - g * (hi - lo);
    let q = lo + g * (hi - lo);
    let fp = linearAt(t, x, w, p, t0).chi2;
    let fq = linearAt(t, x, w, q, t0).chi2;
    for (let k = 0; k < 80; k++) {
      if (fp < fq) {
        hi = q;
        q = p;
        fq = fp;
        p = hi - g * (hi - lo);
        fp = linearAt(t, x, w, p, t0).chi2;
      } else {
        lo = p;
        p = q;
        fp = fq;
        q = lo + g * (hi - lo);
        fq = linearAt(t, x, w, q, t0).chi2;
      }
    }
    const f = (lo + hi) / 2;
    return { f, ...linearAt(t, x, w, f, t0) };
  };
  const best = refine(minima[0]);
  const candidates = [];
  for (const i of minima.slice(0, 8)) {
    const c = i === minima[0] ? best : refine(i);
    candidates.push({ periodDays: 1 / c.f, chi2: c.chi2 });
  }
  candidates.sort((p, q) => p.chi2 - q.chi2);
  for (const c of candidates) c.deltaChi2 = c.chi2 - candidates[0].chi2;
  const P = 1 / best.f;
  if (P > span)
    throw new FitRefusal(
      'span-shorter-than-period',
      `The marks cover ${span.toFixed(2)} days and the best period is ${P.toFixed(2)} days: less than one cycle is not a period.`
    );
  // Jacobian at the best fit: a, b, c, f.
  const w2 = 2 * Math.PI * best.f;
  const JtWJ = Array.from({ length: 4 }, () => new Array(4).fill(0));
  for (let i = 0; i < n; i++) {
    const tt = t[i] - t0;
    const ph = w2 * tt;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    const row = [s, c, 1, 2 * Math.PI * tt * (best.a * c - best.b * s)];
    for (let p = 0; p < 4; p++)
      for (let q = 0; q < 4; q++) JtWJ[p][q] += w[i] * row[p] * row[q];
  }
  const cov = invert(JtWJ);
  if (!cov)
    throw new FitRefusal('singular', 'The marks do not fix the sinusoid.');
  const dof = Math.max(1, n - 4);
  const reduced = best.chi2 / dof;
  const scale = weighted ? Math.max(1, reduced) : reduced;
  const amp = Math.hypot(best.a, best.b);
  const gA = [best.a / amp, best.b / amp];
  const varA =
    gA[0] * gA[0] * cov[0][0] +
    2 * gA[0] * gA[1] * cov[0][1] +
    gA[1] * gA[1] * cov[1][1];
  const sigmaF = Math.sqrt(cov[3][3] * scale);
  const ambiguous =
    candidates.length > 1 &&
    candidates[1].deltaChi2 < 9 &&
    Math.abs(1 / candidates[1].periodDays - best.f) > 3 * df;
  return {
    periodDays: P,
    sigmaPeriodDays: sigmaF * P * P,
    amplitude: amp,
    sigmaAmplitude: Math.sqrt(varA * scale),
    offset: best.c,
    sigmaOffset: Math.sqrt(cov[2][2] * scale),
    chi2: best.chi2,
    dof,
    reducedChi2: reduced,
    marks: n,
    spanDays: span,
    candidates,
    ambiguous,
    weighted,
  };
}

/**
 * Kepler's third law on a fitted period (days) and amplitude (Jupiter radii),
 * with the uncertainty propagated: GM = 4 pi^2 a^3 / P^2.
 * @returns {{gm: number, sigmaGm: number, massKg: number, sigmaMassKg: number, aKm: number, relative: number}}
 *   gm in km^3/s^2.
 */
export function kepler({
  periodDays,
  sigmaPeriodDays,
  amplitude,
  sigmaAmplitude,
}) {
  const aKm = amplitude * R_JUPITER_KM;
  const P = periodDays * 86400;
  const gm = (4 * Math.PI * Math.PI * aKm ** 3) / (P * P);
  const relative = Math.hypot(
    (3 * sigmaAmplitude) / amplitude,
    (2 * sigmaPeriodDays) / periodDays
  );
  const massKg = (gm * 1e9) / G_SI;
  return {
    gm,
    sigmaGm: gm * relative,
    massKg,
    sigmaMassKg: massKg * relative,
    aKm,
    relative,
  };
}

/**
 * The moons' weighed values together: the weighted mean GM and a chi-square of
 * each value against it. A moon whose value differs from the others by more
 * than its stated uncertainty makes the test fail; the oblateness of Jupiter
 * (about 0.06 percent for Io, 0.003 percent for Callisto) is not in the model.
 * @param {Array<{id?: string, gm: number, sigmaGm: number}>} values
 */
export function combine(values) {
  const w = values.map(v => 1 / (v.sigmaGm * v.sigmaGm));
  const sw = w.reduce((p, q) => p + q, 0);
  const mean = values.reduce((s, v, i) => s + w[i] * v.gm, 0) / sw;
  const chi2 = values.reduce((s, v, i) => s + w[i] * (v.gm - mean) ** 2, 0);
  const dof = values.length - 1;
  return {
    gm: mean,
    sigmaGm: Math.sqrt(1 / sw),
    chi2,
    dof,
    p: dof > 0 ? chiSquareSf(chi2, dof) : null,
    consistent: dof > 0 ? chiSquareSf(chi2, dof) > 0.01 : null,
    massKg: (mean * 1e9) / G_SI,
  };
}

/** The planet's GM from a Kepler value, as a fraction of the reference (1 = equal). */
export const againstReference = (gm, reference = GM_JUPITER) => gm / reference;
