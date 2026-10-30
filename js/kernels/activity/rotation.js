// =============================================================================
// The rotation period of a spotted star, and what it cannot say (Prompt 220)
// -----------------------------------------------------------------------------
//   rotationPeriod   MEASURED: the Lomb-Scargle peak (js/kernels/variables/period.js,
//                    read unchanged), its false-alarm probability under white noise,
//                    a K-harmonic refinement, and a profile interval widened by the
//                    residual's lag-1 correlation. The factor-two alias of the peak is
//                    always among the candidates: a star with two dips a rotation
//                    peaks at half its period, and nothing in the light tells the
//                    two apart unless the dips differ
//   foldedHalves     MEASURED: the nested test behind that statement (a series at 2P
//                    against the same series restricted to P)
//
// The verdicts, in the order they are tried:
//   'no-signal'        the best peak's false-alarm probability exceeds `fapLimit`
//   'not-constrained'  the peak's period is longer than half the baseline: fewer than
//                      two cycles cannot fix a period (the number is withheld)
//   'double-period'    the odd and even dips differ at the stated significance, so the
//                      peak is the half period and the rotation period is twice it
//   'period-with-alias' the peak is the period and twice the peak is not excluded (it
//                      is listed as an alternative, marked untestable when the
//                      baseline holds fewer than two cycles of it)
//
// ASSUMPTIONS: the false-alarm probability is that of white Gaussian noise, (1 - z)^
// ((N - 3) / 2) per independent frequency (Scargle 1982; Zechmeister & Kuerster
// 2009), so a star with correlated noise and evolving spots has a smaller real
// probability than the one stated; the interval is the profile of the harmonic
// series' scatter at 95 per cent for one parameter, multiplied by sqrt((1 + r1) /
// (1 - r1)) for the residuals' lag-1 correlation r1 (never below 1), and it is
// a floor: spot evolution and differential rotation move the period by more than
// it says. The period a light curve gives is that of the spots' latitudes.
// Pure: no DOM, no clock.
// =============================================================================

import { chiSquareSf } from '../../analysis/stats.js';
import { harmonicFit, curveStats } from '../variables/fit.js';
import { periodGrid, periodogram, findPeriod } from '../variables/period.js';
import { quiescentModel } from './flares.js';

const { Math, Float64Array, Int32Array } = globalThis;

export const VERSION = '1.0.0';

/** chi-square 95 per cent point for one parameter. */
const CHI2_1 = 3.841458820694124;

/** The false-alarm probability of a normalised Lomb-Scargle peak under white noise. */
export function falseAlarm(power, n, independent) {
  if (!(power > 0) || n < 4) return 1;
  const p = Math.exp(((n - 3) / 2) * Math.log1p(-Math.min(power, 1 - 1e-15)));
  const q = -Math.expm1(independent * Math.log1p(-p));
  return Math.min(1, Math.max(0, q));
}

function lag1(res) {
  const n = res.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += res[i];
  m /= n;
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const d = res[i] - m;
    b += d * d;
    if (i + 1 < n) a += d * (res[i + 1] - m);
  }
  return b > 0 ? a / b : 0;
}

/** rss of the K-harmonic series at P, and the residuals in time order. */
function rssAt(t, y, P, K, t0) {
  const f = harmonicFit(t, y, P, K, { t0 });
  return f ? f.chi2 : Infinity;
}

/**
 * The profile interval of a period for a K-harmonic series: the periods whose rss
 * stays within one chi-square (1 d.o.f.) of the minimum, scaled by `inflate`.
 */
function profileInterval(t, y, P, K, t0, T, sigma2, inflate) {
  const base = rssAt(t, y, P, K, t0);
  const limit = base + CHI2_1 * sigma2 * inflate * inflate;
  const side = dir => {
    let step = (0.002 * P * P) / T;
    let lo = P;
    let hi = P;
    for (let i = 0; i < 40; i++) {
      hi = P + dir * step;
      if (!(hi > 0) || rssAt(t, y, hi, K, t0) > limit) break;
      lo = hi;
      step *= 1.6;
      if (step > 0.5 * P) break;
    }
    if (!(hi > 0)) hi = P * 0.5;
    for (let i = 0; i < 28; i++) {
      const mid = 0.5 * (lo + hi);
      if (rssAt(t, y, mid, K, t0) > limit) hi = mid;
      else lo = mid;
    }
    return lo;
  };
  return [side(-1), side(+1)];
}

/**
 * The nested test of the factor-two alias at the half period P: a series of 2K
 * harmonics at 2P against the series of K harmonics at P (the even harmonics).
 * @returns {{statistic: number, df: number, p: number, rssFull: number, rssHalf: number}}
 */
export function foldedHalves(t, y, P, K = 4, widening = 1) {
  const t0 = t[0];
  const full = harmonicFit(t, y, 2 * P, 2 * K, { t0 });
  const half = harmonicFit(t, y, P, K, { t0 });
  if (!full || !half)
    return { statistic: NaN, df: 2 * K, p: 1, rssFull: NaN, rssHalf: NaN };
  const dof = Math.max(1, t.length - (4 * K + 1));
  const s2 = (full.chi2 / dof) * widening * widening;
  const stat = Math.max(0, half.chi2 - full.chi2) / s2;
  return {
    statistic: stat,
    df: 2 * K,
    p: chiSquareSf(stat, 2 * K),
    rssFull: full.chi2,
    rssHalf: half.chi2,
  };
}

/**
 * The rotation period from a light curve, with the alias kept in view.
 * @param {ArrayLike<number>} t - times (days), increasing
 * @param {ArrayLike<number>} y - flux or magnitude (any offset)
 * @param {{minPeriod?: number, maxPeriod?: number, K?: number, fapLimit?: number,
 *   aliasLevel?: number, oversample?: number}} [opts]
 */
export function rotationPeriod(t, y, opts = {}) {
  const n = t.length;
  const K = opts.K ?? 4;
  const fapLimit = opts.fapLimit ?? 0.01;
  const aliasLevel = opts.aliasLevel ?? 0.001;
  const T = n > 1 ? t[n - 1] - t[0] : 0;
  const out = {
    verdict: 'no-signal',
    period: null,
    interval: null,
    sigma: null,
    candidates: [],
    peak: null,
    baseline: T,
    cycles: null,
    widening: 1,
    amplitude: null,
    alias: null,
    notes: [],
  };
  if (n < 20 || !(T > 0)) {
    out.verdict = 'not-constrained';
    out.notes.push('too-few-points');
    return out;
  }
  const minP = opts.minPeriod ?? Math.max(0.05, 4 * (T / n));
  const maxP = opts.maxPeriod ?? T;
  const oversample = opts.oversample ?? 8;
  const found = findPeriod(t, y, {
    minPeriod: minP,
    maxPeriod: maxP,
    oversample,
  });
  const independent = Math.max(1, T * (1 / minP - 1 / maxP));
  const fap = falseAlarm(found.power, n, independent);
  out.peak = {
    period: found.period,
    power: found.power,
    fap,
    width: found.width,
  };
  if (!(fap <= fapLimit)) {
    out.verdict = 'no-signal';
    return out;
  }
  const P1 = found.period;
  out.cycles = T / P1;
  if (out.cycles < 2) {
    out.verdict = 'not-constrained';
    out.notes.push('fewer-than-two-cycles');
    return out;
  }
  const t0 = t[0];
  // Refine within a fraction of the peak's width.
  const best = refine(t, y, P1, K, T);
  const fit = harmonicFit(t, y, best, K, { t0 });
  const dof = Math.max(1, n - (2 * K + 1));
  const sigma2 = fit.chi2 / dof;
  // The residuals in time order, for the lag-1 correlation.
  const res = new Float64Array(n);
  for (let i = 0; i < n; i++) res[i] = y[i] - fit.at(t[i]);
  const r1 = Math.min(0.95, Math.max(0, lag1(res)));
  const widening = Math.sqrt((1 + r1) / (1 - r1));
  out.widening = widening;
  out.amplitude = curveStats(fit).amplitude;
  const interval = profileInterval(t, y, best, K, t0, T, sigma2, widening);
  const alias = foldedHalves(t, y, best, K, widening);
  out.alias = {
    p: alias.p,
    statistic: alias.statistic,
    df: alias.df,
    level: aliasLevel,
  };
  const cand = (period, role, status, ivl) => ({
    period,
    interval: ivl,
    role,
    status,
  });
  if (alias.p < aliasLevel) {
    // The odd and even dips differ: the peak is the half period.
    const P2 = refine(t, y, 2 * best, 2 * K, T);
    const fit2 = harmonicFit(t, y, P2, 2 * K, { t0 });
    const s2 = fit2.chi2 / Math.max(1, n - (4 * K + 1));
    const ivl2 = profileInterval(t, y, P2, 2 * K, t0, T, s2, widening);
    out.verdict = 'double-period';
    out.period = P2;
    out.interval = ivl2;
    out.candidates = [
      cand(P2, 'rotation', 'primary', ivl2),
      cand(best, 'half-period', 'excluded', interval),
    ];
  } else {
    out.verdict = 'period-with-alias';
    out.period = best;
    out.interval = interval;
    const testable = T / (2 * best) >= 2;
    out.candidates = [
      cand(best, 'peak', 'primary', interval),
      cand(
        2 * best,
        'double-period',
        testable ? 'not-excluded' : 'untestable',
        null
      ),
    ];
    if (!testable) out.notes.push('alias-baseline-short');
  }
  out.sigma = (out.interval[1] - out.interval[0]) / (2 * 1.96);
  return out;
}

/** The K-harmonic scatter minimum near P0 (a scan, then golden section). */
function refine(t, y, P0, K, T) {
  const t0 = t[0];
  const hw = (0.5 * (P0 * P0)) / T;
  const rss = P => rssAt(t, y, P, K, t0);
  let bestP = P0;
  let bestR = Infinity;
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const P = P0 - hw + (2 * hw * i) / N;
    if (!(P > 0)) continue;
    const r = rss(P);
    if (r < bestR) {
      bestR = r;
      bestP = P;
    }
  }
  let lo = bestP - hw / N;
  let hi = bestP + hw / N;
  const g = (Math.sqrt(5) - 1) / 2;
  let c = hi - g * (hi - lo);
  let d = lo + g * (hi - lo);
  for (let i = 0; i < 40; i++) {
    if (rss(c) < rss(d)) hi = d;
    else lo = c;
    c = hi - g * (hi - lo);
    d = lo + g * (hi - lo);
  }
  return (lo + hi) / 2;
}

/** The periodogram on the search grid, for a panel. */
export function spectrumOf(t, y, { minPeriod, maxPeriod, oversample = 8 }) {
  const T = t[t.length - 1] - t[0];
  const grid = periodGrid(minPeriod, maxPeriod, T, oversample);
  return { grid, power: periodogram(t, y, grid) };
}

/**
 * Average a light curve into bins of `minutes`, counted from its first time; a bin
 * with fewer than `minimum` points is dropped. The bin's time and value are means.
 */
export function binSeries(t, y, minutes = 30, minimum = 8) {
  const w = minutes / 1440;
  const sumT = new Map();
  const sumY = new Map();
  const cnt = new Map();
  const t0 = t[0];
  for (let i = 0; i < t.length; i++) {
    const k = Math.floor((t[i] - t0) / w);
    sumT.set(k, (sumT.get(k) ?? 0) + t[i]);
    sumY.set(k, (sumY.get(k) ?? 0) + y[i]);
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  const keys = [...cnt.keys()]
    .filter(k => cnt.get(k) >= minimum)
    .sort((a, b) => a - b);
  return {
    t: Float64Array.from(keys, k => sumT.get(k) / cnt.get(k)),
    y: Float64Array.from(keys, k => sumY.get(k) / cnt.get(k)),
    n: Int32Array.from(keys, k => cnt.get(k)),
  };
}

/**
 * A light curve that may carry flares, taken to a rotation period: the upward outliers a
 * period-free quiescent model flags (flares) are dropped, the rest binned and searched.
 * @returns {{rotation: object, binned: {t: Float64Array, y: Float64Array}, flagged: number}}
 */
export function rotationFromLightCurve(t, f, opts = {}) {
  const { binMinutes = 30, minimum = 8, ...search } = opts;
  const { mask } = quiescentModel(t, f, { period: null, window: 0.25 });
  const keep = [];
  for (let i = 0; i < t.length; i++) if (!mask[i]) keep.push(i);
  const tt = Float64Array.from(keep, i => t[i]);
  const yy = Float64Array.from(keep, i => f[i]);
  const binned = binSeries(tt, yy, binMinutes, minimum);
  return {
    rotation: rotationPeriod(binned.t, binned.y, search),
    binned,
    flagged: t.length - keep.length,
  };
}
