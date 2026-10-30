// =============================================================================
// Flares: the template, the detection rule and the equivalent duration (Prompt 220)
// -----------------------------------------------------------------------------
//   flareTemplate       the empirical shape of Davenport et al. (2014), Eqs. 1 and 4
//   flareProfile        the template integrated over each exposure
//   quiescentModel      the light the star would have without flares: a harmonic series at
//                       the rotation period plus a running median, clipped upward
//   detectFlares        the form of the Chang et al. (2015) criteria (N1, N2, N3)
//   equivalentDuration  the integral of the relative excess, with its uncertainty
//   cumulativeFrequency, powerLawSlope   the flare-frequency distribution in ED, an
//                       exact maximum-likelihood power-law slope and its interval
//
// The equivalent duration is the time the star's quiescent light would take to emit the
// flare's energy in the band: ED = integral (f - q) / q dt. It is a measurement in the
// band and nothing more; turning it into an energy needs the star's luminosity in the
// band and, for a bolometric energy, a flare temperature and a bandpass (Part B of
// Prompt 220, gated), and no function here does either.
//
// ASSUMPTIONS: the rule's N1 = 3, N2 = 2, N3 = 3 are this contract's choice; sigma is the
// robust scatter of the detrended light curve, so a flare-rich star with red noise has a
// larger sigma and a smaller completeness; the window ends where the excess drops below
// 1 sigma, so the tail beyond it is not in the ED, and the uncertainty carries a term for
// it (the template's tail: sigma times t_1/2 over 0.2783, in units of the quiescent
// light) that makes the interval conservative for faint flares.
// Pure: no DOM, no clock.
// =============================================================================

import { chiSquareSf } from '../../analysis/stats.js';
import { gaussian, stream } from '../../random/streams.js';
import { harmonicFit } from '../variables/fit.js';

const { Math, Float64Array, Uint8Array } = globalThis;

export const VERSION = '1.0.0';

export const TEMPLATE = Object.freeze({
  rise: [1, 1.941, -0.175, -2.246, -1.125],
  decay: [
    [0.689, 1.6],
    [0.303, 0.2783],
  ],
});

/** The analytic integral of the template over t / t_1/2, from -1 to infinity. */
export const TEMPLATE_INTEGRAL = (() => {
  const c = TEMPLATE.rise;
  // the integral from -1 to 0 of c0 + c1 t + c2 t^2 + c3 t^3 + c4 t^4
  let rise = 0;
  for (let k = 0; k < c.length; k++) rise += (c[k] / (k + 1)) * (0 - (-1) ** (k + 1));
  const decay = TEMPLATE.decay.reduce((s, [a, b]) => s + a / b, 0);
  return rise + decay;
})();

/** The template at x = (t - t_peak) / t_1/2; zero before the rise. */
export function flareTemplate(x) {
  if (x < -1) return 0;
  if (x <= 0) {
    const c = TEMPLATE.rise;
    return c[0] + x * (c[1] + x * (c[2] + x * (c[3] + x * c[4])));
  }
  return (
    TEMPLATE.decay[0][0] * Math.exp(-TEMPLATE.decay[0][1] * x) +
    TEMPLATE.decay[1][0] * Math.exp(-TEMPLATE.decay[1][1] * x)
  );
}

/**
 * The relative excess of a flare at each exposure (the mean over `sub` sub-samples).
 * @param {ArrayLike<number>} t - exposure mid-times, days
 * @param {{tPeak: number, tHalf: number, amp: number}} flare - days, days, relative
 * @param {number} cadence - days
 */
export function flareProfile(t, flare, cadence, sub = 5) {
  const out = new Float64Array(t.length);
  const { tPeak, tHalf, amp } = flare;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < tPeak - tHalf - cadence || t[i] > tPeak + 40 * tHalf + cadence)
      continue;
    let s = 0;
    for (let j = 0; j < sub; j++)
      s += flareTemplate((t[i] + ((j + 0.5) / sub - 0.5) * cadence - tPeak) / tHalf);
    out[i] = (amp * s) / sub;
  }
  return out;
}

const median = a => {
  const s = Float64Array.from(a).sort();
  const m = s.length >> 1;
  return s.length === 0 ? NaN : s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};
const madSigma = a => {
  const m = median(a);
  return 1.4826 * median(Float64Array.from(a, v => Math.abs(v - m)));
};

function runningMedian(t, r, mask, half) {
  const tk = [];
  const rk = [];
  for (let i = 0; i < t.length; i++)
    if (!mask[i]) {
      tk.push(t[i]);
      rk.push(r[i]);
    }
  const out = new Float64Array(t.length);
  let lo = 0;
  let hi = 0;
  const buf = new Float64Array(tk.length);
  for (let i = 0; i < t.length; i++) {
    while (lo < tk.length && tk[lo] < t[i] - half) lo++;
    if (hi < lo) hi = lo;
    while (hi < tk.length && tk[hi] <= t[i] + half) hi++;
    const m = hi - lo;
    if (!m) continue;
    for (let j = 0; j < m; j++) buf[j] = rk[lo + j];
    const seg = buf.subarray(0, m).sort();
    out[i] = m % 2 ? seg[m >> 1] : 0.5 * (seg[(m >> 1) - 1] + seg[m >> 1]);
  }
  return out;
}

/**
 * The quiescent model: three clipped passes of (a harmonic series at `period`) plus (a
 * running median of the residual over `window` days).
 * @returns {{q: Float64Array, sigma: number, mask: Uint8Array}}
 */
export function quiescentModel(
  t,
  f,
  { period = null, window = 0.25, K = 3, passes = 3, mask: start = null } = {}
) {
  const n = t.length;
  let mask = start ? Uint8Array.from(start) : new Uint8Array(n);
  const q = new Float64Array(n);
  let sigma = NaN;
  const t0 = t[0];
  for (let pass = 0; pass < passes; pass++) {
    const tu = [];
    const fu = [];
    for (let i = 0; i < n; i++)
      if (!mask[i]) {
        tu.push(t[i]);
        fu.push(f[i]);
      }
    const h = new Float64Array(n);
    const fit = period
      ? harmonicFit(Float64Array.from(tu), Float64Array.from(fu), period, K, { t0 })
      : null;
    if (fit) for (let i = 0; i < n; i++) h[i] = fit.at(t[i]);
    else h.fill(median(fu));
    const r = Float64Array.from(f, (v, i) => v - h[i]);
    const m = runningMedian(t, r, mask, window / 2);
    const resid = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      q[i] = h[i] + m[i];
      resid[i] = f[i] - q[i];
    }
    const kept = [];
    for (let i = 0; i < n; i++) if (!mask[i]) kept.push(resid[i]);
    sigma = madSigma(kept);
    // Each point above 2.5 sigma seeds a run that extends both ways while the excess stays
    // above 1 sigma (a flare's wings would otherwise lift the median and take their own light
    // out of the flare), and two points on either side are masked as well.
    const ext = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (!(resid[i] > 2.5 * sigma)) continue;
      ext[i] = 1;
      for (let a = i - 1; a >= 0 && resid[a] >= sigma; a--) ext[a] = 1;
      for (let b = i + 1; b < n && resid[b] >= sigma; b++) ext[b] = 1;
    }
    mask = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      if (ext[i])
        for (let s = -2; s <= 2; s++)
          if (i + s >= 0 && i + s < n) mask[i + s] = 1;
  }
  return { q, sigma, mask };
}

/**
 * Flares in a light curve by the form of the Chang et al. (2015) criteria.
 * @param {ArrayLike<number>} t - days, increasing
 * @param {ArrayLike<number>} f - flux
 * @param {ArrayLike<number>|number} err - one-sigma errors, or one number
 * @param {{period?: number|null, window?: number, N1?: number, N2?: number, N3?: number}} [opts]
 * @returns {{flares: object[], sigma: number, q: Float64Array, cadence: number}}
 */
export function detectFlares(t, f, err, opts = {}) {
  const N1 = opts.N1 ?? 3;
  const N2 = opts.N2 ?? 2;
  const N3 = opts.N3 ?? 3;
  const window = opts.window ?? 0.25;
  const n = t.length;
  const e = typeof err === 'number' ? new Float64Array(n).fill(err) : err;
  const { q, sigma } = quiescentModel(t, f, { period: opts.period ?? null, window });
  const resid = Float64Array.from(f, (v, i) => v - q[i]);
  const diffs = [];
  for (let i = 1; i < n; i++) diffs.push(t[i] - t[i - 1]);
  const cadence = median(diffs);
  const gap = 1.5 * cadence;
  const cand = Uint8Array.from(resid, (r, i) =>
    r / sigma >= N1 && (r - e[i]) / sigma >= N2 ? 1 : 0
  );
  const wins = [];
  for (let i = 0; i < n; ) {
    if (!cand[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && cand[j + 1] && t[j + 1] - t[j] < gap) j++;
    if (j - i + 1 >= N3) {
      let a = i;
      let b = j;
      // The window runs on until three consecutive points lie below 1 sigma, so that one
      // noise dip in a flare's tail does not end it.
      for (let moved = true; moved; ) {
        moved = false;
        for (let k = 1; k <= 3 && a - k >= 0 && t[a] - t[a - k] < gap * k; k++)
          if (resid[a - k] >= sigma) {
            a -= k;
            moved = true;
            break;
          }
      }
      for (let moved = true; moved; ) {
        moved = false;
        for (let k = 1; k <= 3 && b + k < n && t[b + k] - t[b] < gap * k; k++)
          if (resid[b + k] >= sigma) {
            b += k;
            moved = true;
            break;
          }
      }
      const last = wins[wins.length - 1];
      if (last && t[a] - t[last[1]] < gap) last[1] = Math.max(last[1], b);
      else wins.push([a, b]);
    }
    i = j + 1;
  }
  const nWin = Math.max(1, Math.round(window / cadence));
  // Second stage: the quiescent model again with every flare's window, extended before by
  // half its length and after by twice it (a decay is slower than a rise), masked from the start,
  // so that the wings below the detection threshold do not lift the median under the flare.
  let q2 = q;
  if (wins.length && opts.refine !== false) {
    const m0 = new Uint8Array(n);
    for (const [a, b] of wins) {
      const len = b - a + 1;
      for (let i = Math.max(0, a - Math.ceil(len / 2)); i <= Math.min(n - 1, b + 2 * len); i++) m0[i] = 1;
    }
    q2 = quiescentModel(t, f, { period: opts.period ?? null, window, passes: 1, mask: m0 }).q;
  }
  const resid2 = Float64Array.from(f, (v, i) => v - q2[i]);
  const flares = wins.map(([a, b], k) =>
    describe(t, resid2, q2, e, sigma, a, b, nWin, cadence, {
      lo: k ? wins[k - 1][1] + 1 : 0,
      hi: k + 1 < wins.length ? wins[k + 1][0] - 1 : n - 1,
      fit: opts.fit !== false,
    })
  );
  return { flares, sigma, q: q2, cadence };
}

function describe(t, resid, q, e, sigma, a, b, nWin, cadence, around) {
  let pk = a;
  for (let i = a; i <= b; i++) if (resid[i] > resid[pk]) pk = i;
  // Trapezoid weights (days) and the integral of (f - q) / q.
  let ed = 0;
  let v = 0;
  let qBar = 0;
  for (let i = a; i <= b; i++) {
    const w = (i > a ? (t[i] - t[i - 1]) / 2 : 0) + (i < b ? (t[i + 1] - t[i]) / 2 : 0);
    ed += (w * resid[i]) / q[i];
    v += ((w * e[i]) / q[i]) ** 2;
    qBar += q[i];
  }
  qBar /= b - a + 1;
  const T = t[b] - t[a];
  // The half-maximum width, linearly interpolated.
  const half = resid[pk] / 2;
  let tl = t[a];
  for (let i = pk; i > a; i--)
    if (resid[i - 1] < half) {
      tl = t[i - 1] + ((half - resid[i - 1]) / (resid[i] - resid[i - 1])) * (t[i] - t[i - 1]);
      break;
    }
  let tr = t[b];
  for (let i = pk; i < b; i++)
    if (resid[i + 1] < half) {
      tr = t[i] + ((resid[i] - half) / (resid[i] - resid[i + 1])) * (t[i + 1] - t[i]);
      break;
    }
  const fwhm = Math.max(cadence, tr - tl);
  const quiescentTerm = (T * 1.2533 * sigma) / (qBar * Math.sqrt(nWin));
  const tail = (sigma / qBar) * (fwhm / 0.2783);
  const edSigma = Math.sqrt(v + quiescentTerm ** 2 + tail ** 2);
  const D = 86400;
  const out = {
    iStart: a,
    iStop: b,
    iPeak: pk,
    tStart: t[a],
    tStop: t[b],
    tPeak: t[pk],
    amp: resid[pk] / q[pk],
    edWindow: ed * D,
    edWindowSigma: edSigma * D,
    ed: ed * D,
    edSigma: edSigma * D,
    fwhm,
    n: b - a + 1,
    fit: null,
  };
  if (around.fit) {
    const fit = fitTemplate(t, resid, q, e, a, b, pk, cadence, around);
    if (fit) {
      out.fit = fit;
      out.ed = fit.ed;
      out.edSigma = fit.edSigma;
    }
  }
  return out;
}

/** The template's profile for the fit, three sub-samples an exposure. */
function templateAt(t, tPeak, tHalf, cadence, out) {
  for (let i = 0; i < t.length; i++) {
    let sum = 0;
    for (let j = 0; j < 3; j++)
      sum += flareTemplate((t[i] + ((j + 0.5) / 3 - 0.5) * cadence - tPeak) / tHalf);
    out[i] = sum / 3;
  }
}

/**
 * The template fitted to a flare and the light around it: relative excess = c + A F(t),
 * c and A by weighted linear least squares at each (t_peak, t_1/2) of a grid and then of a
 * finer one. The equivalent duration is the template's integral, 1.827 A t_1/2, so it counts
 * the tail the noise hides. Its uncertainty is the spread of the same fit over 16 parametric
 * bootstrap realisations (the best-fit model plus Gaussian noise of the quoted errors, scaled
 * up by sqrt(chi2 / dof) when above one) refitted on a local grid, which carries the
 * correlation of A with t_1/2 that a formal error leaves out.
 * The fit is a model: a flare that is not the template (several peaks, a different decay) is
 * fitted anyway, and chi2 / dof says how far from it.
 */
const BOOT = 16;
/**
 * The bootstrap treats the quiescent model as exact, but it is a running median of the same
 * noisy light curve: on 180 injected flares (seeds unrelated to the validation ensemble) the
 * errors of the fitted ED were 1.32 times the bootstrap spread (median |z| / 0.6745), and the
 * stated spread is multiplied by 1.35 for it. An empirical factor, not a derivation.
 */
const ED_INFLATION = 1.35;
function fitTemplate(t, resid, q, e, a, b, pk, cadence, { lo, hi }) {
  const dur = t[b] - t[a];
  const i0 = Math.max(lo, a - Math.max(30, 2 * (b - a)));
  const i1 = Math.min(hi, b + Math.max(100, 4 * (b - a)));
  const m = i1 - i0 + 1;
  if (m < 12) return null;
  const tt = Float64Array.from({ length: m }, (_, i) => t[i0 + i]);
  const g = new Float64Array(m);
  const w = new Float64Array(m);
  const sg = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    g[i] = resid[i0 + i] / q[i0 + i];
    sg[i] = e[i0 + i] / q[i0 + i];
    w[i] = 1 / (sg[i] * sg[i]);
  }
  const F = new Float64Array(m);
  const solve = (y, tPeak, tHalf) => {
    templateAt(tt, tPeak, tHalf, cadence, F);
    let s0 = 0;
    let sf = 0;
    let sff = 0;
    let sy = 0;
    let sfy = 0;
    for (let i = 0; i < m; i++) {
      s0 += w[i];
      sf += w[i] * F[i];
      sff += w[i] * F[i] * F[i];
      sy += w[i] * y[i];
      sfy += w[i] * F[i] * y[i];
    }
    const det = s0 * sff - sf * sf;
    if (!(det > 0)) return null;
    const A = (s0 * sfy - sf * sy) / det;
    if (!(A > 0)) return null;
    const c = (sff * sy - sf * sfy) / det;
    let rss = 0;
    for (let i = 0; i < m; i++) {
      const r = y[i] - c - A * F[i];
      rss += w[i] * r * r;
    }
    return { A, c, rss, sigA: Math.sqrt(s0 / det) };
  };
  const search = (y, tps, ths) => {
    let best = null;
    for (const tp of tps)
      for (const th of ths) {
        const r = solve(y, tp, th);
        if (r && (!best || r.rss < best.rss)) best = { ...r, tPeak: tp, tHalf: th };
      }
    return best;
  };
  const th0 = 0.5 * cadence;
  const th1 = Math.max(4 * cadence, 3 * dur);
  const coarseTp = Array.from({ length: 6 }, (_, k) => t[pk] + (k - 3) * 0.5 * cadence);
  const coarseTh = Array.from({ length: 60 }, (_, j) => th0 * (th1 / th0) ** (j / 59));
  const c0 = search(g, coarseTp, coarseTh);
  if (!c0) return null;
  const fineTp = Array.from({ length: 5 }, (_, k) => c0.tPeak + (k - 2) * 0.25 * cadence);
  const fineTh = Array.from({ length: 17 }, (_, j) => c0.tHalf * 1.25 ** ((j - 8) / 8));
  const best = search(g, fineTp, fineTh);
  const D = 86400;
  const edOf = r => TEMPLATE_INTEGRAL * r.A * r.tHalf * D;
  const ed = edOf(best);
  const dof = Math.max(1, m - 4);
  const scale = Math.max(1, best.rss / dof);
  // parametric bootstrap
  const noise = gaussian(stream('noise', 'flare-fit', pk));
  templateAt(tt, best.tPeak, best.tHalf, cadence, F);
  const model = Float64Array.from(F, v => best.c + best.A * v);
  const localTp = Array.from({ length: 5 }, (_, k) => best.tPeak + (k - 2) * 0.25 * cadence);
  const localTh = Array.from({ length: 13 }, (_, j) => best.tHalf * 1.08 ** (j - 6));
  let sum = 0;
  let sum2 = 0;
  let nb = 0;
  const y = new Float64Array(m);
  for (let k = 0; k < BOOT; k++) {
    for (let i = 0; i < m; i++) y[i] = model[i] + Math.sqrt(scale) * sg[i] * noise();
    const r = search(y, localTp, localTh);
    if (!r) continue;
    const v = edOf(r);
    sum += v;
    sum2 += v * v;
    nb++;
  }
  const mean = nb ? sum / nb : ed;
  const edSigma =
    nb > 3
      ? ED_INFLATION * Math.sqrt(Math.max(0, (sum2 - nb * mean * mean) / (nb - 1)))
      : NaN;
  return {
    ed,
    edSigma,
    amp: best.A,
    tHalf: best.tHalf,
    tPeak: best.tPeak,
    baseline: best.c,
    chi2: best.rss,
    dof,
  };
}

/** The equivalent duration (seconds) of an excess over points a..b of a series, trapezoid rule. */
export function equivalentDuration(t, f, q, a, b) {
  let ed = 0;
  for (let i = a; i < b; i++)
    ed +=
      0.5 * ((f[i] - q[i]) / q[i] + (f[i + 1] - q[i + 1]) / q[i + 1]) * (t[i + 1] - t[i]);
  return ed * 86400;
}

/** The cumulative frequency of flares with ED at least each value: [{ed, rate}], largest first. */
export function cumulativeFrequency(eds, days) {
  const s = Float64Array.from(eds).sort().reverse();
  return Array.from(s, (ed, i) => ({ ed, rate: (i + 1) / days }));
}

/** The x with P(chi-square_k <= x) = p, by bisection on the survival function. */
function chiQuantile(p, k) {
  let lo = 0;
  let hi = Math.max(10, 4 * k);
  while (chiSquareSf(hi, k) > 1 - p) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi);
    if (1 - chiSquareSf(mid, k) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * The maximum-likelihood slope of dN / dED ~ ED^-alpha above edMin, and its exact interval
 * from 2 (alpha - 1) S ~ chi-square with 2 n degrees of freedom, S = sum ln(ED / edMin).
 * @returns {{n: number, alpha: number, sigma: number, interval: number[], edMin: number}|null}
 */
export function powerLawSlope(eds, edMin, level = 0.95) {
  const x = Array.from(eds).filter(v => v >= edMin);
  const n = x.length;
  if (n < 2) return null;
  let S = 0;
  for (const v of x) S += Math.log(v / edMin);
  if (!(S > 0)) return null;
  const a = 1 + n / S;
  const lo = 1 + chiQuantile((1 - level) / 2, 2 * n) / (2 * S);
  const hi = 1 + chiQuantile(1 - (1 - level) / 2, 2 * n) / (2 * S);
  return { n, alpha: a, sigma: (a - 1) / Math.sqrt(n), interval: [lo, hi], edMin };
}

/**
 * The edMin that minimises the Kolmogorov-Smirnov distance between the data above it and its
 * fitted power law (Clauset et al. 2009), among the values leaving at least `minCount`.
 */
export function scanEdMin(eds, minCount = 10) {
  const s = Float64Array.from(eds).sort();
  let best = null;
  for (let i = 0; i + minCount <= s.length; i++) {
    const xm = s[i];
    if (i && s[i] === s[i - 1]) continue;
    const fit = powerLawSlope(s, xm);
    if (!fit) continue;
    const m = s.length - i;
    let d = 0;
    for (let j = 0; j < m; j++) {
      const model = 1 - (s[i + j] / xm) ** (1 - fit.alpha);
      d = Math.max(d, Math.abs(model - j / m), Math.abs(model - (j + 1) / m));
    }
    if (!best || d < best.ks) best = { edMin: xm, ks: d, ...fit };
  }
  return best;
}
