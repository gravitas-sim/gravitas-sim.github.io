// =============================================================================
// Pulsar kernel: folding, the fold statistic, the period search
// -----------------------------------------------------------------------------
//   foldSeries     MEASURED: the mean of the samples that fall in each of nbin phase
//                  bins at a period, bin = floor(frac(t / P) nbin) with t_j = j dt,
//                  and the number in each
//   foldStatistic  MEASURED: chi2 = sum_b n_b (m_b - mean)^2 / sigma^2 on nbin - 1
//                  degrees of freedom, sigma the white-noise sigma of the series; its
//                  survival function is the false-alarm probability of ONE trial, and
//                  trialCorrected multiplies it by the number of independent trials
//                  (Bonferroni: conservative, never below the single-trial p)
//   searchPeriod   MEASURED: the statistic on a grid uniform in frequency with spacing
//                  1 / (T nbin oversample); the period is the grid maximum (the sub-
//                  integration phase drift of pulsarPeriod.js refines it, with an interval)
//   foldChannels   MEASURED: every channel folded, per-bin counts kept
//
// Assumes: white noise of constant variance; a period constant over the series (no
// spin-down, no acceleration). Folding at P/2 or 2P also gives a high statistic: the
// maximum is the fundamental for a pulse narrower than half the period but a noisy
// weak series can pick a harmonic, so the result carries the statistic at P/2 and 2P.
// Pure: no DOM, no clock.
// =============================================================================

import { refuse, finite } from './constants.js';
import { chi2Sf } from '../statistics/special.js';

const { Math, Float64Array, Int32Array } = globalThis;

function checkFoldArgs(dt, period, nbin) {
  finite(dt, 'the sample time');
  finite(period, 'the period');
  if (!(dt > 0)) refuse('bad-argument', 'the sample time must be positive');
  if (!(period > 0)) refuse('bad-argument', 'the period must be positive');
  if (!(Number.isInteger(nbin) && nbin >= 8))
    refuse('bad-argument', 'nbin must be a whole number of at least 8', {
      nbin,
    });
}

/**
 * Fold a series at a period.
 * @param {ArrayLike<number>} y
 * @param {number} dt - seconds
 * @param {number} period - seconds
 * @param {number} nbin
 * @param {{start?: number, end?: number, origin?: number}} [o] - a slice of the array (indices
 *   start to end); the time of index j is (j - origin) dt, origin 0 unless the array holds many channels
 * @returns {{nbin: number, period: number, profile: Float64Array,
 *   counts: Int32Array, total: number, n: number}}
 */
export function foldSeries(y, dt, period, nbin, o = {}) {
  checkFoldArgs(dt, period, nbin);
  const start = o.start ?? 0;
  const end = o.end ?? y.length;
  const origin = o.origin ?? 0;
  const sum = new Float64Array(nbin);
  const counts = new Int32Array(nbin);
  const inv = 1 / period;
  let total = 0;
  for (let j = start; j < end; j++) {
    let x = (j - origin) * dt * inv;
    x -= Math.floor(x);
    const b = Math.min(nbin - 1, Math.floor(x * nbin));
    sum[b] += y[j];
    counts[b]++;
    total += y[j];
  }
  const profile = new Float64Array(nbin);
  for (let b = 0; b < nbin; b++)
    profile[b] = counts[b] ? sum[b] / counts[b] : 0;
  return { nbin, period, profile, counts, total, n: end - start };
}

/** Fold every channel; the per-channel folds share the bin edges. */
export function foldChannels(dyn, period, nbin, o = {}) {
  const { nsamp, nchan, data, dt } = dyn;
  const out = new Array(nchan);
  const start = o.start ?? 0;
  const end = o.end ?? nsamp;
  for (let c = 0; c < nchan; c++) {
    const row = c * nsamp;
    out[c] = foldSeries(data, dt, period, nbin, {
      start: row + start,
      end: row + end,
      origin: row,
    });
  }
  return out;
}

/** chi-square of a folded profile against its mean, and its single-trial p. */
export function foldStatistic(fold, sigma) {
  if (!(sigma > 0)) refuse('bad-argument', 'the noise sigma must be positive');
  const { profile, counts, nbin } = fold;
  let sw = 0;
  let sm = 0;
  for (let b = 0; b < nbin; b++) {
    sw += counts[b];
    sm += counts[b] * profile[b];
  }
  const mean = sm / sw;
  let chi2 = 0;
  for (let b = 0; b < nbin; b++) chi2 += counts[b] * (profile[b] - mean) ** 2;
  chi2 /= sigma * sigma;
  const dof = nbin - 1;
  return { chi2, dof, p: chi2Sf(chi2, dof), mean };
}

/** The probability of a statistic this large in at least one of `trials` trials, at most 1. */
export function trialCorrected(p, trials) {
  return Math.min(1, trials * p);
}

/** Fold statistic of a series at one period, without building a result object. */
function foldChi2(y, dt, period, nbin, sigma, work) {
  const { sum, cnt } = work;
  sum.fill(0);
  cnt.fill(0);
  const inv = 1 / period;
  const n = y.length;
  for (let j = 0; j < n; j++) {
    let x = j * dt * inv;
    x -= Math.floor(x);
    const b = Math.min(nbin - 1, Math.floor(x * nbin));
    sum[b] += y[j];
    cnt[b]++;
  }
  let sw = 0;
  let sm = 0;
  for (let b = 0; b < nbin; b++) {
    sw += cnt[b];
    sm += sum[b];
  }
  const mean = sm / sw;
  let chi2 = 0;
  for (let b = 0; b < nbin; b++) if (cnt[b]) chi2 += (sum[b] * sum[b]) / cnt[b];
  chi2 -= sw * mean * mean;
  return chi2 / (sigma * sigma);
}

/**
 * Search a period range by folding.
 * @param {ArrayLike<number>} y - an evenly sampled series (the de-dispersed sum)
 * @param {number} dt
 * @param {{pMin: number, pMax: number, nbin?: number, oversample?: number,
 *   sigma: number, trials?: number}} o - trials multiplies the grid size in the correction
 */
export function searchPeriod(y, dt, o) {
  const nbin = o.nbin ?? 64;
  const oversample = o.oversample ?? 2;
  const { pMin, pMax, sigma } = o;
  checkFoldArgs(dt, pMin, nbin);
  finite(pMax, 'the largest period');
  if (!(pMax > pMin))
    refuse('bad-range', 'the period range is inverted or empty');
  const T = y.length * dt;
  if (pMax > T / 3)
    refuse(
      'bad-argument',
      'a period of more than a third of the series leaves under three pulses',
      {
        pMax,
        seriesS: T,
      }
    );
  const fmin = 1 / pMax;
  const fmax = 1 / pMin;
  const df = 1 / (T * nbin * oversample);
  const n = Math.floor((fmax - fmin) / df) + 1;
  const work = { sum: new Float64Array(nbin), cnt: new Int32Array(nbin) };
  let best = 0;
  let bestChi = -Infinity;
  const stat = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const s = foldChi2(y, dt, 1 / (fmin + k * df), nbin, sigma, work);
    stat[k] = s;
    if (s > bestChi) {
      bestChi = s;
      best = k;
    }
  }
  // No sub-grid refinement: the fold statistic is a ragged function of the period at scales finer
  // than the grid (samples change bins one at a time), so a golden-section search finds a different
  // local maximum in each implementation. The grid maximum is deterministic, and the sub-integration
  // phase drift (pulsarPeriod.js) refines it with an interval (thresholds.json, AM5).
  const f0 = fmin + best * df;
  const at = f => foldChi2(y, dt, 1 / f, nbin, sigma, work);
  const chi2 = bestChi;
  const trials = n * (o.trials ?? 1);
  const dof = nbin - 1;
  const p = chi2Sf(chi2, dof);
  return {
    period: 1 / f0,
    chi2,
    dof,
    p,
    pCorrected: trialCorrected(p, trials),
    trials,
    gridSize: n,
    gridSpacingHz: df,
    range: [pMin, pMax],
    atRangeEdge: best === 0 || best === n - 1,
    halfPeriodChi2: at(2 * f0),
    doublePeriodChi2: at(f0 / 2),
    nbin,
    seriesS: T,
  };
}
