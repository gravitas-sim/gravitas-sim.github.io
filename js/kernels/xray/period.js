// =============================================================================
// The period search on unevenly sampled counts, with gaps (Prompt 243)
// -----------------------------------------------------------------------------
// The statistic is the generalized Lomb-Scargle of js/measure/periodogram.js (Zechmeister
// and Kuerster 2009: a sinusoid plus a floating mean fitted by weighted least squares at
// every trial frequency, the power the fraction of the weighted variance it explains), on
// the rate y = counts / exposure at the bin midpoints, over the very grid that module
// uses. What differs is the noise: a bin of counts is Poisson, so the weights come from
// the constant-rate null (variance of y_i = lambda / exposure_i, lambda the series' mean
// rate) and are fixed before the data are looked at, and the SIGNIFICANCE IS BY
// SIMULATION, never by the asymptotic false-alarm formula of that module (which assumes
// Gaussian errors and a different count of trials):
//
//   p = (1 + #{simulations whose highest power over the whole grid >= the observed}) / (nSim + 1)
//
// each simulation drawing Poisson(lambda exposure_i) counts in every live bin, the same
// times, gaps and exposures, the same grid. The trials are the whole grid, so p is global.
// The smallest p there can be is 1 / (nSim + 1) and the result says so.
//
// Two more things a period on gapped data must say. ALIAS: the sampling has its own
// frequencies (the peaks of the window |sum w exp(2 pi i f t)|^2); a peak at one of them,
// or one that is the reflection or the beat of another strong peak against one, is flagged
// and never reported clean. BACKGROUND: the same search on the background region's counts;
// a period there at the same frequency is flagged. The times must be stated barycentric
// (contract) or the search is refused.
//
// The fast path stores cos and sin of every (bin, frequency) once, since the weights are
// fixed, and a simulation then costs two dot products per frequency; B3 holds it to the
// existing module and to astropy.
// =============================================================================

import { refused } from '../statistics/check.js';
import { stream } from '../../random/streams.js';
import { bandCounts, stamp, validateSeries } from './contract.js';
import { ONE_SIGMA, poissonDraw } from './poisson.js';

const { Math, Number, Float64Array } = globalThis;

export const LIMITS = Object.freeze({
  work: 3_000_000, // bins x frequencies (two tables of that many doubles)
  minSimulations: 99,
  maxSimulations: 20_000,
  minBins: 5,
});

const TWO_PI = 2 * Math.PI;

/** The tables and the y-independent sums of the power at every grid frequency. */
function makeDesign(t, w, fmin, df, m) {
  const n = t.length;
  let tm = 0;
  for (let i = 0; i < n; i++) tm += w[i] * t[i];
  const cosT = new Float64Array(n * m);
  const sinT = new Float64Array(n * m);
  const cd = new Float64Array(n);
  const sd = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    cd[i] = Math.cos(TWO_PI * df * (t[i] - tm));
    sd[i] = Math.sin(TWO_PI * df * (t[i] - tm));
  }
  const C = new Float64Array(m);
  const S = new Float64Array(m);
  const CC = new Float64Array(m);
  const SS = new Float64Array(m);
  const CS = new Float64Array(m);
  const D = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const base = k * n;
    const exact = k % 64 === 0;
    let c1 = 0;
    let s1 = 0;
    let cc = 0;
    let ss = 0;
    let cs = 0;
    for (let i = 0; i < n; i++) {
      let c;
      let s;
      if (exact) {
        const x = TWO_PI * (fmin + k * df) * (t[i] - tm);
        c = Math.cos(x);
        s = Math.sin(x);
      } else {
        const cp = cosT[base - n + i];
        const sp = sinT[base - n + i];
        c = cp * cd[i] - sp * sd[i];
        s = sp * cd[i] + cp * sd[i];
      }
      cosT[base + i] = c;
      sinT[base + i] = s;
      const wi = w[i];
      c1 += wi * c;
      s1 += wi * s;
      cc += wi * c * c;
      ss += wi * s * s;
      cs += wi * c * s;
    }
    C[k] = c1;
    S[k] = s1;
    CC[k] = cc - c1 * c1;
    SS[k] = ss - s1 * s1;
    CS[k] = cs - c1 * s1;
    D[k] = CC[k] * SS[k] - CS[k] * CS[k];
  }
  return { n, m, tm, cosT, sinT, C, S, CC, SS, CS, D };
}

/** The power at every grid frequency of rates y (weights w sum to 1). */
function powers(design, w, y, out) {
  const { n, m, cosT, sinT, C, S, CC, SS, CS, D } = design;
  let Y = 0;
  for (let i = 0; i < n; i++) Y += w[i] * y[i];
  let YY = 0;
  const wy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    YY += w[i] * (y[i] - Y) * (y[i] - Y);
    wy[i] = w[i] * y[i];
  }
  let best = 0;
  let bestP = -1;
  for (let k = 0; k < m; k++) {
    const base = k * n;
    let yc = 0;
    let ys = 0;
    for (let i = 0; i < n; i++) {
      yc += wy[i] * cosT[base + i];
      ys += wy[i] * sinT[base + i];
    }
    const YC = yc - Y * C[k];
    const YS = ys - Y * S[k];
    let p = 0;
    if (D[k] > 0 && YY > 0)
      p = Math.min(
        1,
        Math.max(
          0,
          (SS[k] * YC * YC + CC[k] * YS * YS - 2 * CS[k] * YC * YS) /
            (YY * D[k])
        )
      );
    if (out) out[k] = p;
    if (p > bestP) {
      bestP = p;
      best = k;
    }
  }
  return { best, max: bestP };
}

/** The GLS power and the sinusoid's coefficients at one frequency, by direct sums. */
export function powerAt(t, w, y, f, tm) {
  const n = t.length;
  let Y = 0;
  for (let i = 0; i < n; i++) Y += w[i] * y[i];
  let YY = 0;
  for (let i = 0; i < n; i++) YY += w[i] * (y[i] - Y) * (y[i] - Y);
  const omega = TWO_PI * f;
  let C = 0;
  let S = 0;
  let YCh = 0;
  let YSh = 0;
  let CCh = 0;
  let SSh = 0;
  let CSh = 0;
  for (let i = 0; i < n; i++) {
    const x = omega * (t[i] - tm);
    const c = Math.cos(x);
    const s = Math.sin(x);
    C += w[i] * c;
    S += w[i] * s;
    YCh += w[i] * y[i] * c;
    YSh += w[i] * y[i] * s;
    CCh += w[i] * c * c;
    CSh += w[i] * c * s;
    SSh += w[i] * s * s;
  }
  const YC = YCh - Y * C;
  const YS = YSh - Y * S;
  const CC = CCh - C * C;
  const SS = SSh - S * S;
  const CS = CSh - C * S;
  const D = CC * SS - CS * CS;
  if (!(D > 0) || !(YY > 0)) return { power: 0, a: 0, b: 0, offset: Y };
  const a = (YC * SS - YS * CS) / D;
  const b = (YS * CC - YC * CS) / D;
  const power = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * D);
  return {
    power: Math.min(1, Math.max(0, power)),
    a,
    b,
    offset: Y - a * C - b * S,
  };
}

/** The live bins of a view as the search's arrays, or a refusal. */
function searchInput(view, counts, expo, opts) {
  const { minPeriod, maxPeriod, oversample = 5 } = opts;
  const idx = [];
  for (let i = 0; i < view.n; i++) if (view.live[i] && expo[i] > 0) idx.push(i);
  if (idx.length < LIMITS.minBins)
    return refused(
      'tooFew',
      `${idx.length} live bins; a period search needs at least ${LIMITS.minBins}`
    );
  const n = idx.length;
  const t = new Float64Array(n);
  const e = new Float64Array(n);
  const c = new Float64Array(n);
  let N = 0;
  let E = 0;
  let maxWidth = 0;
  for (let k = 0; k < n; k++) {
    const i = idx[k];
    t[k] = 0.5 * (view.start[i] + view.stop[i]);
    e[k] = expo[i];
    c[k] = counts[i];
    N += c[k];
    E += e[k];
    maxWidth = Math.max(maxWidth, view.width[i]);
  }
  if (!(N > 0)) return refused('noCounts', 'the series has no counts');
  if (!(minPeriod > 0 && maxPeriod > minPeriod))
    return refused('undersampled', 'the period range is not a range');
  if (minPeriod < 2 * maxWidth)
    return refused(
      'undersampled',
      `the shortest period (${minPeriod} s) is under twice the widest bin (${maxWidth} s): a bin that wide smears it`
    );
  const T = t[n - 1] - t[0];
  if (!(T > 0)) return refused('tooFew', 'all the live bins are at one time');
  const fmin = 1 / maxPeriod;
  const fmax = 1 / minPeriod;
  const df = 1 / (oversample * T);
  const m = Math.floor((fmax - fmin) / df) + 1;
  if (n * m > LIMITS.work)
    return refused(
      'tooLarge',
      `${n} bins by ${m} frequencies is more than this search does (${LIMITS.work})`
    );
  const w = new Float64Array(n);
  for (let k = 0; k < n; k++) w[k] = e[k] / E;
  const y = new Float64Array(n);
  for (let k = 0; k < n; k++) y[k] = c[k] / e[k];
  return {
    status: 'ok',
    n,
    index: idx,
    t,
    expo: e,
    counts: c,
    y,
    w,
    lambda: N / E,
    T,
    fmin,
    fmax,
    df,
    m,
    maxWidth,
  };
}

/** The grid scan: observed powers, the peak, and the refined peak frequency. */
function scan(input) {
  const design = makeDesign(input.t, input.w, input.fmin, input.df, input.m);
  const power = new Float64Array(input.m);
  const { best, max } = powers(design, input.w, input.y, power);
  const { t, w, y, fmin, df, m } = input;
  const lo0 = fmin + Math.max(0, best - 1) * df;
  const hi0 = fmin + Math.min(m - 1, best + 1) * df;
  const at = f => powerAt(t, w, y, f, design.tm).power;
  const gr = (Math.sqrt(5) - 1) / 2;
  let lo = lo0;
  let hi = hi0;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  for (let i = 0; i < 60; i++) {
    if (at(c) > at(d)) hi = d;
    else lo = c;
    c = hi - gr * (hi - lo);
    d = lo + gr * (hi - lo);
  }
  const f = (lo + hi) / 2;
  const fit = powerAt(t, w, y, f, design.tm);
  return { design, power, best, max, frequency: f, fit };
}

function simulate(input, design, nSim, draw) {
  const { n, w, expo, lambda } = input;
  const y = new Float64Array(n);
  const maxima = new Float64Array(nSim);
  for (let s = 0; s < nSim; s++) {
    for (let i = 0; i < n; i++)
      y[i] = poissonDraw(draw, lambda * expo[i]) / expo[i];
    maxima[s] = powers(design, w, y, null).max;
  }
  return maxima;
}

const peaksOf = (power, fmin, df) => {
  const out = [];
  const m = power.length;
  for (let k = 0; k < m; k++) {
    const left = k === 0 ? -1 : power[k - 1];
    const right = k === m - 1 ? -1 : power[k + 1];
    if (power[k] >= left && power[k] > right)
      out.push({ k, frequency: fmin + k * df, power: power[k] });
  }
  return out;
};

/** The sampling frequencies (peaks of the window) and the alias flags of the candidate. */
function aliasAnalysis(input, sc) {
  const { design, power } = sc;
  const { fmin, df, m, T } = input;
  const delta = 1 / T;
  const W = new Float64Array(m);
  for (let k = 0; k < m; k++)
    W[k] = design.C[k] * design.C[k] + design.S[k] * design.S[k];
  const sampling = peaksOf(W, fmin, df).filter(
    p => p.power >= 0.25 && p.frequency >= 2 / T
  );
  const peaks = peaksOf(power, fmin, df);
  const top = sc.max;
  const strong = peaks.filter(p => p.power >= 0.8 * top);
  const f1 = sc.frequency;
  const flags = [];
  for (const s of sampling) {
    if (Math.abs(f1 - s.frequency) <= delta) {
      flags.push({ code: 'atSampling', samplingFrequency: s.frequency });
      break;
    }
  }
  const partners = [];
  for (const p of strong) {
    if (Math.abs(p.frequency - f1) <= delta) continue;
    for (const s of sampling) {
      const diff = Math.abs(Math.abs(f1 - p.frequency) - s.frequency);
      const sum = Math.abs(f1 + p.frequency - s.frequency);
      if (diff <= delta || sum <= delta) {
        partners.push({
          frequency: p.frequency,
          period: 1 / p.frequency,
          power: p.power,
          via: s.frequency,
          relation: diff <= delta ? 'beat' : 'reflection',
        });
        break;
      }
    }
  }
  if (partners.length) flags.push({ code: 'aliasPair', partners });
  return {
    delta,
    samplingFrequencies: sampling.map(p => p.frequency),
    strongPeaks: strong.map(p => ({
      frequency: p.frequency,
      period: 1 / p.frequency,
      power: p.power,
    })),
    flags,
  };
}

/**
 * The period search with its significance by simulation.
 * @param {object} series - A counts series (contract); times must be barycentric
 * @param {{band?: string|string[], minPeriod: number, maxPeriod: number, oversample?: number,
 *   nSim?: number, seed: string|number, label?: string, backgroundCheck?: boolean,
 *   keepGrid?: boolean}} opts
 */
export function searchPeriod(series, opts = {}) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  if (!view.time.barycentric)
    return refused(
      'notBarycentric',
      'the bin edges are not stated barycentric: correct the times to the solar-system barycentre (or state that they already are) before searching for a period'
    );
  const {
    band = 'total',
    nSim = 999,
    seed,
    label = 'period',
    backgroundCheck = true,
    keepGrid = false,
  } = opts;
  if (
    !Number.isInteger(nSim) ||
    nSim < LIMITS.minSimulations ||
    nSim > LIMITS.maxSimulations
  )
    return refused(
      'simulations',
      `nSim must be a whole number from ${LIMITS.minSimulations} to ${LIMITS.maxSimulations}: the significance is by simulation and fewer cannot resolve a small p`
    );
  if (seed === undefined || seed === null)
    return refused(
      'simulations',
      'a seed is required so that the significance can be reproduced'
    );
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  const input = searchInput(view, bc.src, view.exposure, opts);
  if (input.status !== 'ok') return input;

  const sc = scan(input);
  const draw = stream('noise', seed, label, 'sim');
  const maxima = simulate(input, sc.design, nSim, draw);
  let exceed = 0;
  for (let s = 0; s < nSim; s++) if (maxima[s] >= sc.max) exceed++;
  const p = (1 + exceed) / (nSim + 1);
  const alias = aliasAnalysis(input, sc);

  let background = { checked: false };
  if (backgroundCheck && view.background.kind === 'region') {
    const bkgCounts = bc.bkg;
    const bexp = view.background.exposure;
    const binput = searchInput(view, bkgCounts, bexp, opts);
    if (binput.status === 'ok') {
      const bsc = scan(binput);
      const bm = simulate(
        binput,
        bsc.design,
        199,
        stream('noise', seed, label, 'bkg')
      );
      let be = 0;
      for (let s = 0; s < bm.length; s++) if (bm[s] >= bsc.max) be++;
      const bp = (1 + be) / (bm.length + 1);
      background = {
        checked: true,
        nSim: 199,
        p: bp,
        frequency: bsc.frequency,
        power: bsc.max,
        periodic:
          bp <= 0.01 && Math.abs(bsc.frequency - sc.frequency) <= 2 / input.T,
      };
    } else background = { checked: false, why: binput.code };
  }
  const flags = [...alias.flags];
  if (background.periodic)
    flags.push({ code: 'backgroundPeriodic', frequency: background.frequency });

  const amplitude = Math.hypot(sc.fit.a, sc.fit.b);
  const result = {
    status: 'ok',
    method: 'gls',
    band: bc.ids,
    period: 1 / sc.frequency,
    frequency: sc.frequency,
    power: sc.fit.power,
    amplitude,
    fractionalAmplitude: input.lambda > 0 ? amplitude / input.lambda : null,
    binAttenuation: (() => {
      const x = Math.PI * sc.frequency * input.maxWidth;
      return x === 0 ? 1 : Math.sin(x) / x;
    })(),
    significance: {
      method: 'simulation',
      null: 'constant rate (the series mean) with Poisson counts at the observed times, gaps and exposures',
      nSim,
      p,
      smallestP: 1 / (nSim + 1),
      trials: input.m,
      scope: 'the highest power over the whole grid, so p includes the trials',
    },
    grid: {
      minPeriod: opts.minPeriod,
      maxPeriod: opts.maxPeriod,
      fmin: input.fmin,
      df: input.df,
      frequencies: input.m,
      baseline: input.T,
      resolution: 1 / input.T,
      oversample: opts.oversample ?? 5,
    },
    bins: input.n,
    meanRate: input.lambda,
    alias: {
      delta: alias.delta,
      samplingFrequencies: alias.samplingFrequencies,
      strongPeaks: alias.strongPeaks,
    },
    background,
    flags,
    clean: flags.length === 0,
    warnings: [
      {
        code: 'sinusoidModel',
        why: 'the search finds sinusoidal variation; the period of a non-sinusoidal signal is a harmonic series, its fundamental is the longest period of strong peaks',
      },
    ],
  };
  if (keepGrid) result.powerGrid = Array.from(sc.power);
  return stamp(result, view);
}

/**
 * The peak of the grid with no simulations: the best frequency and its power, by the same
 * statistic and grid (the period interval's input, and the cross-check against the
 * existing module).
 */
export function peakFrequency(series, opts = {}) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  if (!view.time.barycentric)
    return refused(
      'notBarycentric',
      'the bin edges are not stated barycentric'
    );
  const bc = bandCounts(view, opts.band ?? 'total');
  if (bc.status !== 'ok') return bc;
  const input = searchInput(view, bc.src, view.exposure, opts);
  if (input.status !== 'ok') return input;
  const sc = scan(input);
  return stamp(
    {
      status: 'ok',
      frequency: sc.frequency,
      period: 1 / sc.frequency,
      power: sc.fit.power,
      fit: sc.fit,
      meanRate: input.lambda,
      grid: {
        fmin: input.fmin,
        df: input.df,
        frequencies: input.m,
        baseline: input.T,
      },
      input: {
        t: input.t,
        y: input.y,
        w: input.w,
        expo: input.expo,
        tm: sc.design.tm,
      },
      powerGrid: sc.power,
    },
    view
  );
}

/**
 * The period interval by a parametric bootstrap. The best sinusoid plus floating mean is
 * the model; `nBoot` Poisson series are drawn from it at the observed times and
 * exposures, each is searched on a window of plus and minus two frequency resolutions
 * around the best frequency (step 0.05 resolutions, a parabola through the highest three
 * points), and the interval is the central `level` of the bootstrap periods.
 */
export function periodInterval(
  series,
  {
    frequency,
    band = 'total',
    seed,
    label = 'boot',
    nBoot = 200,
    level = ONE_SIGMA,
    minPeriod,
    maxPeriod,
  } = {}
) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  if (!view.time.barycentric)
    return refused(
      'notBarycentric',
      'the bin edges are not stated barycentric'
    );
  if (
    seed === undefined ||
    seed === null ||
    !Number.isInteger(nBoot) ||
    nBoot < 20
  )
    return refused(
      'simulations',
      'a seed and at least 20 bootstrap series are required'
    );
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  const input = searchInput(view, bc.src, view.exposure, {
    minPeriod: minPeriod ?? 1 / (frequency * 1.5),
    maxPeriod: maxPeriod ?? 1 / (frequency / 1.5),
  });
  if (input.status !== 'ok') return input;
  const { t, w, y, expo, T } = input;
  let tm = 0;
  for (let i = 0; i < t.length; i++) tm += w[i] * t[i];
  const fit = powerAt(t, w, y, frequency, tm);
  const omega = TWO_PI * frequency;
  const mu = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++)
    mu[i] = Math.max(
      0,
      fit.offset +
        fit.a * Math.cos(omega * (t[i] - tm)) +
        fit.b * Math.sin(omega * (t[i] - tm))
    );
  const step = 0.05 / T;
  const half = 40;
  const grid = new Float64Array(2 * half + 1);
  for (let g = -half; g <= half; g++) grid[g + half] = frequency + g * step;
  const design = makeDesign(t, w, grid[0], step, grid.length);
  const draw = stream('noise', seed, label);
  const ys = new Float64Array(t.length);
  const pw = new Float64Array(grid.length);
  const found = [];
  for (let b = 0; b < nBoot; b++) {
    for (let i = 0; i < t.length; i++)
      ys[i] = poissonDraw(draw, mu[i] * expo[i]) / expo[i];
    const { best } = powers(design, w, ys, pw);
    let fb = grid[best];
    if (best > 0 && best < grid.length - 1) {
      const a0 = pw[best - 1];
      const a1 = pw[best];
      const a2 = pw[best + 1];
      const den = a0 - 2 * a1 + a2;
      if (den < 0) fb += (0.5 * step * (a0 - a2)) / den;
    }
    found.push(fb);
  }
  found.sort((a, b) => a - b);
  const q = pr => {
    const x = pr * (found.length - 1);
    const i = Math.floor(x);
    const j = Math.min(found.length - 1, i + 1);
    return found[i] + (x - i) * (found[j] - found[i]);
  };
  const fLo = q((1 - level) / 2);
  const fHi = q((1 + level) / 2);
  return stamp(
    {
      status: 'ok',
      method: 'parametric-bootstrap',
      level,
      nBoot,
      frequency,
      frequencyLo: fLo,
      frequencyHi: fHi,
      period: 1 / frequency,
      periodLo: 1 / fHi,
      periodHi: 1 / fLo,
      assumes: [
        'the signal is a sinusoid plus a constant, with Poisson counts',
        'the interval is a percentile interval of the bootstrap periods: its coverage is measured (HIGH_ENERGY.md)',
      ],
    },
    view
  );
}
