// =============================================================================
// Variable stars: the period search, its width and its bootstrap
// -----------------------------------------------------------------------------
//   periodogram     MEASURED: Lomb-Scargle power (Lomb 1976, Scargle 1982), the
//                   fraction of the variance one sinusoid and a floating mean
//                   explain at each trial period
//   findPeriod      MEASURED: the highest peak, refined by a golden-section
//                   search, and the peak's width: the full width at half the
//                   peak's power, in period
//   refinePeriod    MEASURED: the period at which a K-harmonic series leaves the
//                   smallest scatter. The sinusoid's peak is slightly off for a
//                   sawtooth; the series is not
//   bootstrapPeriod DERIVED, under ASSUMPTIONS: resample the points with
//                   replacement, refit, and take the spread of the periods. It
//                   assumes the points are independent, which flux that varies
//                   slowly within a cadence is not quite; the result is a
//                   floor on the error, and it says so
//   aliasPeriods    DERIVED: the periods a sampling pattern of frequency f_s
//                   cannot tell from the true one, 1 / |1/P +- k f_s|
//
// The width of a peak is about P^2 / T for a baseline T: it is how well a
// finite run can tell two periods apart, and the error of the period is a
// small fraction of it (the width over the signal-to-noise ratio), not the
// width itself. The lessons show both.
// =============================================================================

import { harmonicFit } from './fit.js';
import { mulberry32, normalizeSeed } from '../../rng.js';

const { Math, Float64Array } = globalThis;

/**
 * Lomb-Scargle power with a floating mean (unweighted) at each period.
 * @returns {Float64Array} power in [0, 1]
 */
export function periodogram(t, y, periods) {
  const n = t.length;
  let ym = 0;
  for (let i = 0; i < n; i++) ym += y[i];
  ym /= n;
  let tm = 0;
  for (let i = 0; i < n; i++) tm += t[i];
  tm /= n;
  let yy = 0;
  for (let i = 0; i < n; i++) yy += (y[i] - ym) ** 2;
  const out = new Float64Array(periods.length);
  if (!(yy > 0)) return out;
  for (let k = 0; k < periods.length; k++) {
    const w = (2 * Math.PI) / periods[k];
    let C = 0;
    let S = 0;
    let CC = 0;
    let SS = 0;
    let CS = 0;
    let yc = 0;
    let ys = 0;
    for (let i = 0; i < n; i++) {
      const x = w * (t[i] - tm);
      const c = Math.cos(x);
      const s = Math.sin(x);
      C += c;
      S += s;
      CC += c * c;
      SS += s * s;
      CS += c * s;
      yc += (y[i] - ym) * c;
      ys += (y[i] - ym) * s;
    }
    const cc = CC - (C * C) / n;
    const ss = SS - (S * S) / n;
    const cs = CS - (C * S) / n;
    const det = cc * ss - cs * cs;
    if (!(Math.abs(det) > 1e-12 * n * n)) continue;
    const a = (yc * ss - ys * cs) / det;
    const b = (ys * cc - yc * cs) / det;
    out[k] = Math.max(0, Math.min(1, (a * yc + b * ys) / yy));
  }
  return out;
}

/** Trial periods evenly spaced in frequency, `oversample` points per 1/T. */
export function periodGrid(minPeriod, maxPeriod, baseline, oversample = 8) {
  const fmin = 1 / maxPeriod;
  const fmax = 1 / minPeriod;
  const df = 1 / (oversample * baseline);
  const m = Math.floor((fmax - fmin) / df) + 1;
  return Float64Array.from({ length: m }, (_, k) => 1 / (fmin + k * df));
}

const span = t => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of t) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  return hi - lo;
};

/**
 * The strongest period in a range, and how wide its peak is.
 * @returns {{period: number, power: number, width: number, baseline: number,
 *   grid: Float64Array, spectrum: Float64Array}}
 */
export function findPeriod(t, y, { minPeriod, maxPeriod, oversample = 8 }) {
  const T = span(t);
  const grid = periodGrid(minPeriod, maxPeriod, T, oversample);
  const spectrum = periodogram(t, y, grid);
  let best = 0;
  for (let k = 1; k < spectrum.length; k++) if (spectrum[k] > spectrum[best]) best = k;
  // Golden-section refinement within one grid step on either side (in frequency).
  // Index k is frequency fmin + k df: the neighbours of the peak in frequency.
  let lo = 1 / grid[Math.max(0, best - 1)];
  let hi = 1 / grid[Math.min(grid.length - 1, best + 1)];
  const at = f => periodogram(t, y, [1 / f])[0];
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 50; i++) {
    if (at(c) > at(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  const f0 = (lo + hi) / 2;
  const power = at(f0);
  // Full width at half power: walk out from the peak to where the power falls below half.
  const half = power / 2;
  let a = best;
  while (a > 0 && spectrum[a] > half) a--;
  let z = best;
  while (z < grid.length - 1 && spectrum[z] > half) z++;
  const width = Math.abs(grid[a] - grid[z]);
  return { period: 1 / f0, power, width, baseline: T, grid, spectrum };
}

/**
 * Refine a period by minimising the scatter of a K-harmonic series.
 * @returns {{period: number, rms: number}}
 */
export function refinePeriod(t, y, P0, K = 4, halfWidth = null) {
  const T = span(t);
  const hw = halfWidth ?? (0.5 * P0 * P0) / T;
  const rms = P => {
    const f = harmonicFit(t, y, P, K, { t0: t[0] });
    return f ? f.rms : Infinity;
  };
  // Coarse scan to land in the right basin, then golden section.
  const N = 24;
  let bestP = P0;
  let bestR = Infinity;
  for (let i = 0; i <= N; i++) {
    const P = P0 - hw + (2 * hw * i) / N;
    const r = rms(P);
    if (r < bestR) {
      bestR = r;
      bestP = P;
    }
  }
  let lo = bestP - hw / N;
  let hi = bestP + hw / N;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 40; i++) {
    if (rms(c) < rms(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  const P = (lo + hi) / 2;
  return { period: P, rms: rms(P) };
}

/**
 * The spread of the refined period over resamples of the points.
 * @returns {{sigma: number, mean: number, periods: number[], resamples: number}}
 */
export function bootstrapPeriod(t, y, P0, { K = 3, resamples = 40, seed = 'bootstrap' } = {}) {
  const n = t.length;
  const rand = mulberry32(normalizeSeed(`${seed}:${n}:${P0}`));
  const T = span(t);
  const hw = (0.25 * P0 * P0) / T;
  const periods = [];
  const tb = new Float64Array(n);
  const yb = new Float64Array(n);
  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      const j = Math.min(n - 1, Math.floor(rand() * n));
      tb[i] = t[j];
      yb[i] = y[j];
    }
    const o = Array.from(tb.keys()).sort((a, b) => tb[a] - tb[b]);
    const ts = Float64Array.from(o, i => tb[i]);
    const ys = Float64Array.from(o, i => yb[i]);
    periods.push(refinePeriod(ts, ys, P0, K, hw).period);
  }
  const mean = periods.reduce((s, v) => s + v, 0) / periods.length;
  const sigma = Math.sqrt(
    periods.reduce((s, v) => s + (v - mean) ** 2, 0) / (periods.length - 1)
  );
  return { sigma, mean, periods, resamples };
}

/**
 * The periods a sampling pattern cannot tell from P: 1 / |1/P + k f_s| for the
 * orders k = -order..order (not zero), the positive ones, longest first.
 * @param {number} P - the true period
 * @param {number} fs - the sampling frequency (1 per day for one visit per night)
 */
export function aliasPeriods(P, fs, order = 2) {
  const out = [];
  for (let k = -order; k <= order; k++) {
    if (k === 0) continue;
    const f = Math.abs(1 / P + k * fs);
    if (f > 1e-9) out.push({ k, period: 1 / f });
  }
  return out.sort((a, b) => b.period - a.period);
}
