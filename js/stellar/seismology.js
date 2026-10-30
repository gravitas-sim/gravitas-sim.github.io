// Asteroseismology of a red giant at an educational level (Prompt 221,
// SEISMOLOGY.md): a power spectrum, a granulation-plus-white background, the
// frequency of maximum power and the large frequency separation, and a mass and
// radius through the two scaling relations. Pure: numbers in, numbers out.
//
// Every convention is committed in tests/fixtures/seismology-gate/thresholds.json
// before any spectrum existed; this file only implements it.
import { fft } from '../numeric/fft.js';
import { stream, gaussian } from '../random/streams.js';

const { Math } = globalThis;

export const VERSION = '1.0.0';
/** Kepler long cadence, seconds. */
export const CADENCE_S = 1765.5;
/** Solar references (Yu et al. 2018, Sec. 3.3). */
export const SOLAR = Object.freeze({
  numax: 3090,
  numaxSigma: 30,
  dnu: 135.1,
  dnuSigma: 0.1,
  teff: 5777,
});
/** Systematic floors added in quadrature (Yu et al. 2018, Sec. 3.5). */
export const FLOORS = Object.freeze({ numax: 0.01, dnu: 0.005 });
/** Relation scatter of the contract (a choice between Huber 2017 and Gaulme 2016). */
export const RELATION_SCATTER = Object.freeze({ mass: 0.1, radius: 0.05 });
/** The domain in which a mass and a radius are returned. */
export const DOMAIN = Object.freeze({ numaxMin: 20, nyquistFraction: 0.8 });
export const DETECTION = Object.freeze({
  minDeltaLogLike2: 40,
  combP: 0.01,
});

const TWO_SQRT2_PI = (2 * Math.SQRT2) / Math.PI;

// --------------------------------------------------------------------------
// The power spectrum
// --------------------------------------------------------------------------

/**
 * Single-sided power spectral density in ppm^2 per uHz of a series on an even
 * grid (a missing cadence is NaN: it is zero-filled after the mean of the valid
 * values is removed and the spectrum is divided by the duty cycle). Parseval
 * holds: the sum of power x df over the grid equals the variance of the valid
 * values. `x` is in ppm, `dt` in seconds.
 */
export function powerSpectrum(x, dt = CADENCE_S) {
  const N = x.length;
  let nv = 0;
  let sum = 0;
  for (let i = 0; i < N; i++)
    if (Number.isFinite(x[i])) {
      nv++;
      sum += x[i];
    }
  if (nv < 8) throw new RangeError('powerSpectrum: fewer than 8 valid points');
  const mean = sum / nv;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) if (Number.isFinite(x[i])) re[i] = x[i] - mean;
  fft(re, im);
  const duty = nv / N;
  const h = N >> 1;
  const df = 1e6 / (N * dt);
  const freq = new Float64Array(h);
  const power = new Float64Array(h);
  const scale = (2 * dt * 1e-6) / (N * duty);
  for (let k = 1; k <= h; k++) {
    let p = scale * (re[k] * re[k] + im[k] * im[k]);
    if (k === h && N % 2 === 0) p /= 2;
    freq[k - 1] = k * df;
    power[k - 1] = p;
  }
  return {
    freq,
    power,
    df,
    nyquist: 1e6 / (2 * dt),
    n: N,
    nValid: nv,
    duty,
    dt,
  };
}

/**
 * The periodogram for gaps: at each frequency (uHz) the least-squares sinusoid
 * a cos + b sin on the mean-subtracted data, power density (a^2 + b^2)/2 x
 * N_valid dt x 1e-6 ppm^2/uHz. Same units, white level and sine peak as
 * powerSpectrum. `t` in seconds.
 */
export function periodogram(t, y, freqs, dt = CADENCE_S) {
  const n = t.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += y[i];
  const mean = sum / n;
  const out = new Float64Array(freqs.length);
  const c = new Float64Array(n);
  const s = new Float64Array(n);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = y[i] - mean;
  for (let f = 0; f < freqs.length; f++) {
    const w = 2 * Math.PI * freqs[f] * 1e-6;
    let scc = 0;
    let sss = 0;
    let scs = 0;
    let syc = 0;
    let sys = 0;
    for (let i = 0; i < n; i++) {
      const a = w * t[i];
      const cc = Math.cos(a);
      const ss = Math.sin(a);
      scc += cc * cc;
      sss += ss * ss;
      scs += cc * ss;
      syc += d[i] * cc;
      sys += d[i] * ss;
    }
    void c;
    void s;
    const det = scc * sss - scs * scs;
    if (!(Math.abs(det) > 1e-12 * n * n)) {
      out[f] = NaN;
      continue;
    }
    const a = (syc * sss - sys * scs) / det;
    const b = (sys * scc - syc * scs) / det;
    out[f] = ((a * a + b * b) / 2) * n * dt * 1e-6;
  }
  return out;
}

// --------------------------------------------------------------------------
// Pre-processing of a Kepler light curve
// --------------------------------------------------------------------------

function median(sorted) {
  const m = sorted.length >> 1;
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** A running median over `window` consecutive values (clipped at the ends). */
export function runningMedian(y, window = 99) {
  const n = y.length;
  const half = window >> 1;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n, i + half + 1);
    const w = Float64Array.from(y.subarray(lo, hi)).sort();
    out[i] = median(w);
  }
  return out;
}

/**
 * Quarters of valid points -> an even cadence grid in ppm. Each quarter is
 * `{cadence: ArrayLike<number>, flux: ArrayLike<number>}` of points that passed the
 * quality flag and are finite. Per quarter: divide by the median, ppm, subtract
 * a 99-cadence running median; then one 4.5-sigma clip (MAD sigma) over all.
 * The grid runs from the first to the last cadence; a missing cadence is NaN.
 */
export function prepareSeries(
  quarters,
  { window = 99, clip = 4.5, dt = CADENCE_S } = {}
) {
  const cad = [];
  const val = [];
  for (const q of quarters) {
    const n = q.flux.length;
    if (n < window) continue;
    const f = Float64Array.from(q.flux);
    const med = median(Float64Array.from(f).sort());
    const ppm = f.map(v => 1e6 * (v / med - 1));
    const base = runningMedian(ppm, window);
    for (let i = 0; i < n; i++) {
      cad.push(q.cadence[i]);
      val.push(ppm[i] - base[i]);
    }
  }
  const dev = Float64Array.from(val).sort();
  const m = median(dev);
  const mad = median(Float64Array.from(val.map(v => Math.abs(v - m))).sort());
  const sigma = 1.4826 * mad;
  const keep = [];
  for (let i = 0; i < val.length; i++)
    if (Math.abs(val[i] - m) <= clip * sigma) keep.push(i);
  let c0 = Infinity;
  let c1 = -Infinity;
  for (const i of keep) {
    c0 = Math.min(c0, cad[i]);
    c1 = Math.max(c1, cad[i]);
  }
  const x = new Float64Array(c1 - c0 + 1).fill(NaN);
  for (const i of keep) x[cad[i] - c0] = val[i];
  return {
    x,
    dt,
    cadence0: c0,
    sigma,
    clipped: val.length - keep.length,
  };
}

// --------------------------------------------------------------------------
// The background model and its fit
// --------------------------------------------------------------------------

/** Empirical Delta nu of a red giant (Stello et al. 2009). */
export const dnuEmpirical = nu => 0.263 * nu ** 0.772;
const fwhmEnvelope = nu => 0.66 * nu ** 0.88;

const sinc2 = (f, nyq) => {
  const x = (Math.PI * f) / (2 * nyq);
  if (x < 1e-8) return 1;
  const s = Math.sin(x) / x;
  return s * s;
};

/** Background-only power density at frequency f (uHz). p: {a1,b1,a2,b2,W}. */
export function backgroundAt(p, f, nyq) {
  const e = sinc2(f, nyq);
  const g1 = (TWO_SQRT2_PI * p.a1 * p.a1) / p.b1 / (1 + (f / p.b1) ** 4);
  const g2 = (TWO_SQRT2_PI * p.a2 * p.a2) / p.b2 / (1 + (f / p.b2) ** 4);
  return e * (g1 + g2) + p.W;
}

function envelopeAt(p, f, nyq) {
  const z = (f - p.numax) / p.s;
  return sinc2(f, nyq) * p.H * Math.exp(-0.5 * z * z);
}

export function modelAt(p, f, nyq, withEnvelope = true) {
  return backgroundAt(p, f, nyq) + (withEnvelope ? envelopeAt(p, f, nyq) : 0);
}

function boundsFor(nyq) {
  return {
    a: [1, 1e4],
    b1: [1, 150],
    b2: [10, 600],
    W: [0.1, 500],
    H: [1e-3, 1e5],
    numax: [5, 0.9 * nyq],
    s: [1.5, 40],
  };
}

/** Nelder-Mead (adaptive coefficients, Gao and Han 2012). */
export function nelderMead(f, x0, step, { maxEval = 3000, tol = 1e-9 } = {}) {
  const n = x0.length;
  const alpha = 1;
  const beta = 1 + 2 / n;
  const gamma = 0.75 - 1 / (2 * n);
  const delta = 1 - 1 / n;
  let pts = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += step[i];
    pts.push(p);
  }
  let vals = pts.map(f);
  let evals = n + 1;
  while (evals < maxEval) {
    const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    pts = order.map(i => pts[i]);
    vals = order.map(i => vals[i]);
    if (Math.abs(vals[n] - vals[0]) <= tol * (Math.abs(vals[0]) + tol)) break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) c[j] += pts[i][j] / n;
    const xr = c.map((cj, j) => cj + alpha * (cj - pts[n][j]));
    const fr = f(xr);
    evals++;
    if (fr < vals[0]) {
      const xe = c.map((cj, j) => cj + beta * (xr[j] - cj));
      const fe = f(xe);
      evals++;
      if (fe < fr) {
        pts[n] = xe;
        vals[n] = fe;
      } else {
        pts[n] = xr;
        vals[n] = fr;
      }
    } else if (fr < vals[n - 1]) {
      pts[n] = xr;
      vals[n] = fr;
    } else {
      const outside = fr < vals[n];
      const xc = outside
        ? c.map((cj, j) => cj + gamma * (xr[j] - cj))
        : c.map((cj, j) => cj + gamma * (pts[n][j] - cj));
      const fc = f(xc);
      evals++;
      if (fc < (outside ? fr : vals[n])) {
        pts[n] = xc;
        vals[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          pts[i] = pts[i].map((v, j) => pts[0][j] + delta * (v - pts[0][j]));
          vals[i] = f(pts[i]);
          evals++;
        }
      }
    }
  }
  let b = 0;
  for (let i = 1; i <= n; i++) if (vals[i] < vals[b]) b = i;
  return { x: pts[b], value: vals[b], evals };
}

/** Bin a spectrum by m bins from fmin on (means). */
export function binSpectrum(freq, power, m, fmin) {
  const f = [];
  const p = [];
  let i0 = 0;
  while (i0 < freq.length && freq[i0] < fmin) i0++;
  for (let i = i0; i + m <= freq.length; i += m) {
    let sf = 0;
    let sp = 0;
    for (let j = 0; j < m; j++) {
      sf += freq[i + j];
      sp += power[i + j];
    }
    f.push(sf / m);
    p.push(sp / m);
  }
  return { f: Float64Array.from(f), p: Float64Array.from(p), m };
}

const logB = (lo, hi) => [Math.log(lo), Math.log(hi)];

/**
 * Fit the background alone (withEnvelope false) or with the Gaussian envelope.
 * The Whittle likelihood on spectra averaged over m bins (chi-squared with 2m
 * degrees of freedom), parameters in logs with a quadratic wall at the bounds.
 */
export function fitBackground(
  spec,
  { withEnvelope = true, fmin = 10, m = 4, start = null } = {}
) {
  const nyq = spec.nyquist;
  const B = boundsFor(nyq);
  const { f, p, m: mm } = binSpectrum(spec.freq, spec.power, m, fmin);
  const names = ['a1', 'b1', 'a2', 'b2', 'W'];
  const lims = [
    logB(...B.a),
    logB(...B.b1),
    logB(...B.a),
    logB(...B.b2),
    logB(...B.W),
  ];
  if (withEnvelope)
    (names.push('H', 'numax', 's'),
      lims.push(logB(...B.H), logB(...B.numax), logB(...B.s)));
  const unpack = u =>
    Object.fromEntries(
      names.map((k, i) => [
        k,
        Math.exp(Math.min(lims[i][1], Math.max(lims[i][0], u[i]))),
      ])
    );
  const wall = u => {
    let w = 0;
    for (let i = 0; i < u.length; i++) {
      const d = Math.max(0, lims[i][0] - u[i], u[i] - lims[i][1]);
      w += d * d;
    }
    return w;
  };
  const nll = u => {
    const q = unpack(u);
    let s = 0;
    for (let j = 0; j < f.length; j++) {
      const M = modelAt(q, f[j], nyq, withEnvelope);
      s += Math.log(M) + p[j] / M;
    }
    return mm * s + 1e6 * wall(u);
  };
  const highMed = (() => {
    const tail = Float64Array.from(
      p.subarray(Math.floor(p.length * 0.9))
    ).sort();
    return median(tail);
  })();
  const startSet = [];
  const nus = withEnvelope
    ? [15, 20, 30, 45, 65, 95, 140, 200, 250]
    : [20, 40, 80, 160, 320, 1000];
  const kall = nu => ({
    a1: Math.min(B.a[1], 3382 * nu ** -0.609),
    b1: Math.min(150, Math.max(1, 0.317 * nu ** 0.97)),
    a2: Math.min(B.a[1], 3382 * nu ** -0.609),
    b2: Math.min(600, Math.max(10, 0.948 * nu ** 0.992)),
    W: Math.min(500, Math.max(0.1, highMed * 0.5)),
  });
  for (const nu of nus) {
    if (withEnvelope && nu > 0.9 * nyq) continue;
    for (const g of start ? [kall(nu), start] : [kall(nu)]) {
      const q = { ...g };
      if (withEnvelope) {
        q.numax = nu;
        q.s = Math.min(40, Math.max(1.5, fwhmEnvelope(nu) / 2.355));
        let sum = 0;
        let cnt = 0;
        for (let j = 0; j < f.length; j++)
          if (Math.abs(f[j] - nu) <= q.s) {
            sum += p[j];
            cnt++;
          }
        const resid = Math.max(
          1,
          (cnt ? sum / cnt : 1) - backgroundAt(q, nu, nyq)
        );
        q.H = Math.min(1e5, Math.max(1e-3, 3 * resid));
      }
      startSet.push(names.map(k => Math.log(q[k])));
    }
  }
  if (withEnvelope && start) {
    // a coarse scan of the envelope on the background-only fit: the likelihood's
    // landscape in (numax, s, H) is multi-modal, so the best cells start the search
    const cells = [];
    for (let k = 0; k < 14; k++) {
      const nu = 12 * ((0.9 * nyq) / 12) ** (k / 13);
      for (const sw of [4, 8, 14, 24, 36])
        for (let h = 0; h < 7; h++) {
          const q = { ...start, numax: nu, s: sw, H: 5 * 400 ** (h / 6) };
          const u = names.map(key => Math.log(q[key]));
          cells.push({ u, v: nll(u) });
        }
    }
    cells.sort((x, y) => x.v - y.v);
    for (const c of cells.slice(0, 3)) startSet.push(c.u);
  }
  const scored = startSet
    .map(u => ({ u, v: nll(u) }))
    .sort((a, b) => a.v - b.v);
  let best = null;
  for (const s of scored.slice(0, 4)) {
    let cur = { x: s.u, value: s.v, evals: 0 };
    for (let r = 0; r < 3; r++)
      cur = nelderMead(
        nll,
        cur.x,
        names.map(() => 0.3),
        { maxEval: 2500 }
      );
    if (!best || cur.value < best.value) best = cur;
  }
  const q = unpack(best.x);
  if (q.b1 > q.b2) [q.a1, q.a2, q.b1, q.b2] = [q.a2, q.a1, q.b2, q.b1];
  const onBound = names.filter((k, i) => {
    const span = lims[i][1] - lims[i][0];
    return (
      best.x[i] - lims[i][0] < 1e-3 * span ||
      lims[i][1] - best.x[i] < 1e-3 * span
    );
  });
  return { params: q, nll: best.value, onBound, bins: f.length, m: mm };
}

// --------------------------------------------------------------------------
// numax and Delta nu
// --------------------------------------------------------------------------

function smoothedPeak(freq, y, df, nu0, halfSearch, nyq, maxIter = 12) {
  // Gaussian smoothing with FWHM = 2 dnu_emp(nu), iterated to a fixed point
  let nu = nu0;
  const lo = Math.max(nu0 - halfSearch, 10);
  const hi = Math.min(nu0 + halfSearch, 0.95 * nyq);
  const i0 = Math.max(0, Math.round(lo / df) - 1);
  const i1 = Math.min(freq.length - 1, Math.round(hi / df) - 1);
  for (let it = 0; it < maxIter; it++) {
    const sigma = (2 * dnuEmpirical(nu)) / 2.355;
    const reach = Math.ceil((4 * sigma) / df);
    const g = new Float64Array(reach + 1);
    for (let j = 0; j <= reach; j++)
      g[j] = Math.exp(-0.5 * ((j * df) / sigma) ** 2);
    let bestI = -1;
    let bestV = -Infinity;
    const vals = new Float64Array(i1 - i0 + 1);
    for (let i = i0; i <= i1; i++) {
      let sum = 0;
      let w = 0;
      const ja = Math.max(0, i - reach);
      const jb = Math.min(freq.length - 1, i + reach);
      for (let j = ja; j <= jb; j++) {
        const k = g[j > i ? j - i : i - j];
        sum += k * y[j];
        w += k;
      }
      const v = sum / w;
      vals[i - i0] = v;
      if (v > bestV) {
        bestV = v;
        bestI = i;
      }
    }
    let est = freq[bestI];
    const k = bestI - i0;
    if (k > 0 && k < vals.length - 1) {
      const y0 = vals[k - 1];
      const y1 = vals[k];
      const y2 = vals[k + 1];
      const den = y0 - 2 * y1 + y2;
      if (den < 0) est += ((0.5 * (y0 - y2)) / den) * df;
    }
    const moved = Math.abs(est - nu);
    nu = est;
    if (moved < 0.1) break;
  }
  return nu;
}

/** Autocorrelation (normalised to lag 0) of a mean-subtracted series, lags 0..maxLag, by FFT. */
export function autocorrelation(y, maxLag) {
  const n = y.length;
  let m = 1;
  while (m < 2 * n) m <<= 1;
  const re = new Float64Array(m);
  const im = new Float64Array(m);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += y[i];
  mean /= n;
  for (let i = 0; i < n; i++) re[i] = y[i] - mean;
  fft(re, im);
  for (let k = 0; k < m; k++) {
    re[k] = re[k] * re[k] + im[k] * im[k];
    im[k] = 0;
  }
  fft(re, im);
  const out = new Float64Array(maxLag + 1);
  const z = re[0];
  for (let l = 0; l <= maxLag; l++) out[l] = re[l] / z;
  return out;
}

function smoothLags(acf, sigmaLags) {
  if (sigmaLags < 0.5) return acf;
  const reach = Math.ceil(3 * sigmaLags);
  const out = new Float64Array(acf.length);
  for (let i = 0; i < acf.length; i++) {
    let s = 0;
    let w = 0;
    for (
      let j = Math.max(0, i - reach);
      j <= Math.min(acf.length - 1, i + reach);
      j++
    ) {
      const g = Math.exp(-0.5 * ((j - i) / sigmaLags) ** 2);
      s += g * acf[j];
      w += g;
    }
    out[i] = s / w;
  }
  return out;
}

/** The highest smoothed-ACF peak in [0.6, 1.4] dnu_emp; null when the window is empty. */
export function acfPeak(snrWindow, df, nu) {
  const dEmp = dnuEmpirical(nu);
  const lagMax = Math.min(
    snrWindow.length - 2,
    Math.ceil((1.4 * dEmp) / df) + 3
  );
  if (lagMax < 8) return null;
  const acf = smoothLags(
    autocorrelation(snrWindow, lagMax),
    (0.02 * dEmp) / df
  );
  const lo = Math.max(1, Math.floor((0.6 * dEmp) / df));
  const hi = Math.min(lagMax - 1, Math.ceil((1.4 * dEmp) / df));
  let bi = -1;
  let bv = -Infinity;
  for (let l = lo; l <= hi; l++) {
    if (acf[l] > acf[l - 1] && acf[l] >= acf[l + 1] && acf[l] > bv) {
      bv = acf[l];
      bi = l;
    }
  }
  if (bi < 0) return null;
  const y0 = acf[bi - 1];
  const y1 = acf[bi];
  const y2 = acf[bi + 1];
  const den = y0 - 2 * y1 + y2;
  const off = den < 0 ? (0.5 * (y0 - y2)) / den : 0;
  return { dnu: (bi + off) * df, height: bv };
}

function windowOf(freq, snr, centre, half) {
  const df = freq[1] - freq[0];
  const i0 = Math.max(0, Math.round((centre - half) / df) - 1);
  const i1 = Math.min(freq.length - 1, Math.round((centre + half) / df) - 1);
  return snr.subarray(i0, i1 + 1);
}

const expDraw = u => -Math.log(Math.max(u(), 1e-300));

/**
 * The whole analysis of a spectrum. Returns detection, numax, Delta nu, their
 * formal uncertainties and the stated ones, the comb's significance and the
 * fitted background. `opts.seed` names the random streams.
 */
export function analyse(
  spec,
  {
    seed = 221,
    shuffles = 400,
    perturbations = 200,
    teff = null,
    teffSigma = 0,
  } = {}
) {
  const nyq = spec.nyquist;
  const fit0 = fitBackground(spec, { withEnvelope: false });
  const fit1 = fitBackground(spec, { withEnvelope: true, start: fit0.params });
  const dll2 = 2 * (fit0.nll - fit1.nll);
  const p1 = fit1.params;
  const bg = f => backgroundAt(p1, f, nyq);
  const snr = new Float64Array(spec.freq.length);
  for (let i = 0; i < snr.length; i++)
    snr[i] = spec.power[i] / bg(spec.freq[i]);
  const df = spec.df;
  const fwhm = 2.355 * p1.s;
  const result = {
    version: VERSION,
    background: p1,
    onBound: fit1.onBound,
    background0: fit0.params,
    deltaLogLike2: dll2,
    detected: false,
    reasons: [],
    numax: null,
    dnu: null,
  };
  if (!(dll2 >= DETECTION.minDeltaLogLike2)) {
    result.reasons.push('the envelope does not improve the fit enough');
    return result;
  }
  // AM3: the estimator is the peak of the smoothed background-subtracted spectrum; the committed
  // estimator (the peak of the smoothed ratio) is kept as numaxRatio and reported.
  const exc = new Float64Array(snr.length);
  for (let i = 0; i < exc.length; i++)
    exc[i] = spec.power[i] - bg(spec.freq[i]);
  result.numaxRatio = smoothedPeak(spec.freq, snr, df, p1.numax, 2 * fwhm, nyq);
  const numax = smoothedPeak(spec.freq, exc, df, p1.numax, 2 * fwhm, nyq);
  result.numax = numax;
  const win = windowOf(spec.freq, snr, numax, fwhm);
  const peak = acfPeak(win, df, numax);
  if (!peak) {
    result.reasons.push('no autocorrelation peak in the search window');
    return result;
  }
  result.dnu = peak.dnu;
  result.combHeight = peak.height;
  // shuffle test of the comb
  const u = stream('noise', seed, 'shuffle');
  let reach = 0;
  const w = Float64Array.from(win);
  for (let s = 0; s < shuffles; s++) {
    for (let i = w.length - 1; i > 0; i--) {
      const j = Math.floor(u() * (i + 1));
      const t = w[i];
      w[i] = w[j];
      w[j] = t;
    }
    const pk = acfPeak(w, df, numax);
    if (pk && pk.height >= peak.height) reach++;
  }
  result.combP = (reach + 1) / (shuffles + 1);
  if (!(result.combP < DETECTION.combP)) {
    result.reasons.push('the comb is not significant');
    return result;
  }
  result.detected = true;
  // formal uncertainties: chi-squared(2)/2 perturbations of the spectrum, background fixed
  const v = stream('noise', seed, 'perturb');
  const nus = [];
  const dns = [];
  const sn = new Float64Array(snr.length);
  const ex = new Float64Array(snr.length);
  for (let r = 0; r < perturbations; r++) {
    for (let i = 0; i < sn.length; i++) {
      const e = expDraw(v);
      sn[i] = snr[i] * e;
      ex[i] = spec.power[i] * e - bg(spec.freq[i]);
    }
    const nu = smoothedPeak(spec.freq, ex, df, numax, 2 * fwhm, nyq, 4);
    const pk = acfPeak(windowOf(spec.freq, sn, nu, fwhm), df, nu);
    nus.push(nu);
    if (pk) dns.push(pk.dnu);
  }
  const sd = a => {
    const m = a.reduce((s, x) => s + x, 0) / a.length;
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  };
  result.numaxSigma = sd(nus);
  result.dnuSigma = dns.length > 5 ? sd(dns) : NaN;
  result.numaxSigmaStated = Math.hypot(result.numaxSigma, FLOORS.numax * numax);
  result.dnuSigmaStated = Math.hypot(result.dnuSigma, FLOORS.dnu * result.dnu);
  result.inDomain =
    numax >= DOMAIN.numaxMin && numax <= DOMAIN.nyquistFraction * nyq;
  if (teff && result.inDomain)
    result.massRadius = massRadius(
      {
        numax,
        numaxSigma: result.numaxSigmaStated,
        dnu: result.dnu,
        dnuSigma: result.dnuSigmaStated,
        teff,
        teffSigma,
      },
      { seed }
    );
  return result;
}

// --------------------------------------------------------------------------
// The scaling relations
// --------------------------------------------------------------------------

/** The two relations: M and R in solar units from numax, Delta nu (uHz) and Teff (K). */
export function scaling({ numax, dnu, teff }, sun = SOLAR) {
  const x = numax / sun.numax;
  const d = dnu / sun.dnu;
  const t = teff / sun.teff;
  return { mass: x ** 3 * d ** -4 * t ** 1.5, radius: x * d ** -2 * t ** 0.5 };
}

/**
 * Monte Carlo propagation (4000 draws, the nominal level 68.27 per cent) through the relations
 * with independent Gaussian numax, Delta nu, Teff and the solar references,
 * then the relation scatter in quadrature (fractional).
 */
export function massRadius(
  { numax, numaxSigma, dnu, dnuSigma, teff, teffSigma },
  { seed = 221, draws = 4000, scatter = RELATION_SCATTER } = {}
) {
  const u = stream('noise', seed, 'massRadius');
  const z = gaussian(u);
  const M = new Float64Array(draws);
  const R = new Float64Array(draws);
  for (let i = 0; i < draws; i++) {
    const s = scaling(
      {
        numax: numax + numaxSigma * z(),
        dnu: dnu + dnuSigma * z(),
        teff: teff + teffSigma * z(),
      },
      {
        numax: SOLAR.numax + SOLAR.numaxSigma * z(),
        dnu: SOLAR.dnu + SOLAR.dnuSigma * z(),
        teff: SOLAR.teff,
      }
    );
    M[i] = s.mass;
    R[i] = s.radius;
  }
  const q = (a, p) => {
    const s = Float64Array.from(a).sort();
    const x = p * (s.length - 1);
    const i = Math.floor(x);
    return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (x - i);
  };
  const point = scaling({ numax, dnu, teff });
  const out = {};
  for (const [name, a, sc] of [
    ['mass', M, scatter.mass],
    ['radius', R, scatter.radius],
  ]) {
    const lo = q(a, 0.1587);
    const hi = q(a, 0.8413);
    const mid = point[name];
    // fractional relation scatter widens each side in quadrature
    const dl = Math.hypot(mid - lo, sc * mid);
    const dh = Math.hypot(hi - mid, sc * mid);
    out[name] = {
      value: mid,
      low: mid - dl,
      high: mid + dh,
      measurementOnly: [lo, hi],
      relationScatter: sc,
    };
  }
  return out;
}
