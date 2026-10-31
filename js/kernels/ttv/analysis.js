// =============================================================================
// The super-period of an O-C diagram, and the verdict (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// A straight line plus one sinusoid, T_n = T0 + n P + A cos(w t) + B sin(w t), fitted
// for every trial period by weighted linear least squares (the period is the only
// non-linear parameter, so the scan is exact). The best period, its amplitude and
// its one-sigma interval (the span over which chi-square stays within 1 of its
// minimum) are reported, with the plain statements the panel needs: no signal above
// the noise, or a signal the record is too short to resolve.
//
// "Resolved" means the record covers at least 1.5 cycles of the period it reports
// (and of the expected one, when the pair's periods give one): a straight line absorbs
// a shorter piece of a long swing, and the period that comes back is then arbitrary.
//
// Pure: no DOM, no clock.
// =============================================================================

import { linearEphemeris, solveSmall, ttvSignal, chi2Sf } from './ephemeris.js';

const { Math } = globalThis;

/** The record must span this many cycles of the period it reports. */
export const MIN_CYCLES = 1.5;

/** The chi-square of the line plus one sinusoid at trial period Pt; null when singular. */
export function fitSinusoidAt(epochs, times, sigmas, Pt) {
  const w = (2 * Math.PI) / Pt;
  const A = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const b = new Array(4).fill(0);
  const rows = [];
  for (let i = 0; i < times.length; i++) {
    const row = [1, epochs[i], Math.cos(w * times[i]), Math.sin(w * times[i])];
    const wt = sigmas ? 1 / (sigmas[i] * sigmas[i]) : 1;
    rows.push(row);
    for (let a = 0; a < 4; a++) {
      b[a] += wt * row[a] * times[i];
      for (let c = 0; c < 4; c++) A[a][c] += wt * row[a] * row[c];
    }
  }
  const x = solveSmall(A, b);
  if (!x) return null;
  let chi2 = 0;
  for (let i = 0; i < times.length; i++) {
    const wt = sigmas ? 1 / (sigmas[i] * sigmas[i]) : 1;
    const r =
      times[i] -
      (x[0] * rows[i][0] +
        x[1] * rows[i][1] +
        x[2] * rows[i][2] +
        x[3] * rows[i][3]);
    chi2 += wt * r * r;
  }
  // the covariance of the cos and sin terms, for the amplitude's one-sigma
  let sigmaAmplitude = NaN;
  if (sigmas) {
    const col = k =>
      solveSmall(
        A,
        [0, 1, 2, 3].map(i => (i === k ? 1 : 0))
      );
    const c2 = col(2);
    const c3 = col(3);
    if (c2 && c3) {
      const amp = Math.hypot(x[2], x[3]);
      const v =
        (x[2] * x[2] * c2[2] + 2 * x[2] * x[3] * c2[3] + x[3] * x[3] * c3[3]) /
        (amp * amp);
      sigmaAmplitude = Math.sqrt(Math.max(0, v));
    }
  }
  return {
    chi2,
    A: x[2],
    B: x[3],
    coef: x,
    period: Pt,
    amplitude: Math.hypot(x[2], x[3]),
    sigmaAmplitude,
  };
}

/**
 * Scan trial periods and keep the best.
 * @param {{minPeriod: number, maxPeriod: number, oversample?: number}} range
 */
export function scanSuperPeriod(
  epochs,
  times,
  sigmas,
  { minPeriod, maxPeriod, oversample = 12 }
) {
  const span = times[times.length - 1] - times[0];
  const f0 = 1 / maxPeriod;
  const f1 = 1 / minPeriod;
  const df = 1 / (oversample * span);
  const profile = [];
  let best = null;
  for (let f = f0; f <= f1; f += df) {
    const r = fitSinusoidAt(epochs, times, sigmas, 1 / f);
    if (!r) continue;
    profile.push([1 / f, r.chi2]);
    if (!best || r.chi2 < best.chi2) best = r;
  }
  if (!best) return { best: null, profile, span };
  // a fine scan about the coarse minimum, fine enough to cross delta chi-square 1
  const fb = 1 / best.period;
  const fine = [];
  for (let k = -150; k <= 150; k++) {
    const f = fb + (k * df) / 75;
    if (!(f > 0)) continue;
    const r = fitSinusoidAt(epochs, times, sigmas, 1 / f);
    if (!r) continue;
    fine.push([1 / f, r.chi2]);
    if (r.chi2 < best.chi2) best = r;
  }
  return { best, profile: fine, span };
}

/** The period span within delta chi-square 1 of the minimum (a frequency-space crossing). */
function periodInterval(profile, best, scale) {
  const level = best.chi2 + scale;
  let lo = best.period;
  let hi = best.period;
  const k = profile.findIndex(p => p[0] === best.period);
  for (let i = k; i >= 0 && profile[i][1] <= level; i--) lo = profile[i][0];
  for (let i = k; i < profile.length && profile[i][1] <= level; i++)
    hi = profile[i][0];
  return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
}

/**
 * The whole analysis of one planet's transit times.
 *
 * @param {{epochs: ArrayLike<number>, times: ArrayLike<number>,
 *   sigmas?: ArrayLike<number>|null, expectedPeriod?: number|null,
 *   minPeriod?: number}} input - `expectedPeriod`: the cited relation's super-period
 *   from this pair's mean periods, when the other planet is known
 * @returns {{status: 'ok'|'no-signal'|'unresolved'|'refused', reason?: string,
 *   ephemeris: object, signal: object, superPeriod?: {value: number, lo: number,
 *   hi: number}, amplitude?: number, phase?: number, baseline: number,
 *   cycles?: number, deltaChi2?: number}}
 */
export function analyseTransitTimes({
  epochs,
  times,
  sigmas = null,
  expectedPeriod = null,
  minPeriod,
}) {
  const eph = linearEphemeris(epochs, times, sigmas);
  if (eph.status !== 'ok')
    return { status: 'refused', reason: eph.reason, ephemeris: eph };
  const baseline = times[times.length - 1] - times[0];
  const signal = ttvSignal(eph, sigmas);
  const base = { ephemeris: eph, signal, baseline };
  if (signal.verdict === 'no-signal') return { status: 'no-signal', ...base };
  if (expectedPeriod && baseline < MIN_CYCLES * expectedPeriod)
    return {
      status: 'unresolved',
      reason: 'short-record',
      cycles: baseline / expectedPeriod,
      ...base,
    };
  const lo = minPeriod ?? 4 * eph.P;
  const scan = scanSuperPeriod(epochs, times, sigmas, {
    minPeriod: lo,
    maxPeriod: Math.max(2 * baseline, 2 * lo),
  });
  if (!scan.best) return { status: 'refused', reason: 'singular', ...base };
  const { best, profile } = scan;
  const reduced = sigmas ? best.chi2 / Math.max(1, times.length - 4) : 1;
  const iv = periodInterval(profile, best, Math.max(1, reduced));
  const cycles = baseline / best.period;
  const out = {
    ...base,
    superPeriod: { value: best.period, lo: iv.lo, hi: iv.hi },
    amplitude: Math.hypot(best.A, best.B),
    phase: Math.atan2(best.B, best.A),
    cycles,
    reducedChi2: reduced,
    deltaChi2: sigmas ? eph.chi2 - best.chi2 : null,
    pFit: sigmas ? chi2Sf(best.chi2, times.length - 4) : null,
  };
  if (cycles < MIN_CYCLES)
    return { status: 'unresolved', reason: 'short-record', ...out };
  return { status: 'ok', ...out };
}
