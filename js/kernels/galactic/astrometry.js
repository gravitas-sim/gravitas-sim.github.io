// =============================================================================
// Galactic kernel: a Gaia parallax as a distance, with its assumptions visible
// (Roadmap III Prompt 233, GAIA_WORKFLOWS.md)
// -----------------------------------------------------------------------------
// A parallax p is a measurement of 1/r, not of r. The kernel keeps it that way:
//
//   corrected parallax   w = p - z             z: the zero-point offset, stated,
//                                              with its own error sz
//   total error          s^2 = sp^2 + sz^2     for one star; a cluster keeps sz
//                                              unreduced (clusterParallax)
//   likelihood           L(r) = N(w | 1/r, s^2)
//
// With no prior the answer is the likelihood: the maximum is 1/w, and the
// interval at level k sigma (Delta ln L = k^2 / 2) maps exactly to
// [1/(w + k s), 1/(w - k s)], open at the far end when w <= k s. No posterior
// exists without a prior (the likelihood does not fall at large r), so no
// quantile is reported. With a stated prior P(r) the posterior is
// p(r) proportional to L(r) P(r) on [rMin, rMax] and the interval is
// equal-tailed.
//
// A point distance is reported only when w / s is at least POE_THRESHOLD (5, a
// stated choice, not tuned). From 0 to the threshold the status is
// 'low-signal' (or 'prior-dominated' with a prior); at or below 0 it is
// 'likelihood-only' and the distance is null: a negative parallax has a
// likelihood, not a distance.
//
// No universal correction is applied to anything. A prior is a named option
// whose sample assumptions travel with the result.
//
// Pure: no DOM, no clock. Distances in kpc, parallaxes in mas, proper motions
// in mas/yr, velocities in km/s. Random draws come from a named stream.
// =============================================================================

import { K_PM } from './coords.js';
import { normalQuantile } from '../statistics/special.js';
import { stream, gaussian } from '../../random/streams.js';
import { brent } from '../../numeric/roots.js';

const { Math, Number, Float64Array } = globalThis;

/** A point distance needs a corrected parallax over error of at least this. */
export const POE_THRESHOLD = 5;

/** The default levels: one and two sigma of a normal. */
export const LEVELS = Object.freeze({ one: 0.6827, two: 0.9545 });

/** The distance priors a caller may name, what each assumes, and where it is from. */
export const PRIORS = Object.freeze({
  none: {
    label: 'none (the likelihood alone)',
    params: [],
    cite: null,
    assumes: [
      'no statement is made about where stars are: the answer is how well the parallax fixes 1/r, not a probability of r',
      'the parallax error is Gaussian with the stated size, and the zero point is the one stated',
    ],
  },
  edsd: {
    label: 'exponentially decreasing space density',
    params: ['L'],
    cite: 'Astraatmadja and Bailer-Jones (2016), ApJ 833, 119; Bailer-Jones (2015), PASP 127, 994',
    assumes: [
      'the sample is a population whose number density falls as exp(-r / L) along the line of sight, with the scale length L the caller states',
      'the sample is complete in distance over the range used: no magnitude or parallax cut thins it (a cut changes the prior)',
    ],
  },
  'uniform-density': {
    label: 'uniform space density to a radius',
    params: ['rMax'],
    cite: 'Lutz and Kelker (1973), PASP 85, 573',
    assumes: [
      'stars fill space uniformly out to rMax, so the prior rises as r^2 and is cut at rMax',
      'the sample is complete in distance to rMax and the parallax error is the same for all of them',
    ],
  },
});

const refused = (code, why) => ({ status: 'refused', code, why });
const isNum = Number.isFinite;

/**
 * A prior from its specification: 'none', or {name: 'edsd', L} (kpc), or
 * {name: 'uniform-density', rMax} (kpc). A refusal for anything else.
 */
export function priorOf(spec) {
  if (spec === undefined || spec === null || spec === 'none')
    return { name: 'none' };
  const name = typeof spec === 'string' ? spec : spec.name;
  if (!Object.prototype.hasOwnProperty.call(PRIORS, name))
    return refused('prior', `no prior is called "${name}"`);
  if (name === 'none') return { name };
  if (name === 'edsd') {
    if (!(spec.L > 0 && isNum(spec.L)))
      return refused('prior-scale', 'the scale length L must be positive');
    return { name, L: spec.L };
  }
  if (!(spec.rMax > 0 && isNum(spec.rMax)))
    return refused('prior-scale', 'the radius rMax must be positive');
  return { name, rMax: spec.rMax };
}

function logPrior(prior, r) {
  if (prior.name === 'edsd') return 2 * Math.log(r) - r / prior.L;
  if (prior.name === 'uniform-density')
    return r <= prior.rMax ? 2 * Math.log(r) : -Infinity;
  return 0;
}

/** d ln P / dr. */
function dLogPrior(prior, r) {
  if (prior.name === 'edsd') return 2 / r - 1 / prior.L;
  if (prior.name === 'uniform-density') return 2 / r;
  return 0;
}

/** Check a parallax measurement and its zero point; the corrected values or a refusal. */
export function correctParallax({ parallax, error, zeroPoint } = {}) {
  const z = zeroPoint?.value ?? 0;
  const sz = zeroPoint?.sigma ?? 0;
  if (!isNum(parallax))
    return refused('parallax', 'the parallax is not a finite number');
  if (!(error > 0) || !isNum(error))
    return refused(
      'error',
      'the parallax error must be positive and finite: a measurement with no error says nothing'
    );
  if (!isNum(z))
    return refused('zero-point', 'the zero-point value is not finite');
  if (!(sz >= 0) || !isNum(sz))
    return refused(
      'zero-point',
      'the zero-point error must be zero or positive'
    );
  const w = parallax - z;
  const s = Math.sqrt(error * error + sz * sz);
  return { w, s, poe: w / s, sp: error, sz, z };
}

// ---- the posterior on a grid --------------------------------------------------

const lnLikelihood = (r, w, s) => {
  const d = w - 1 / r;
  return (-d * d) / (2 * s * s);
};
const dLnLikelihood = (r, w, s) => -(w - 1 / r) / (r * r) / (s * s);

/**
 * The grid for a posterior: log-spaced over [rMin, rMax] merged with a fine
 * linear-in-parallax grid over the part of the likelihood that matters.
 */
function gridFor(w, s, rMin, rMax, n) {
  const pts = [];
  const step = Math.log(rMax / rMin) / (n - 1);
  for (let i = 0; i < n; i++) pts.push(rMin * Math.exp(step * i));
  const uLo = Math.max(w - 6 * s, 1 / rMax);
  const uHi = Math.min(w + 6 * s, 1 / rMin);
  if (uHi > uLo)
    for (let i = 0; i < n; i++)
      pts.push(1 / (uLo + ((uHi - uLo) * i) / (n - 1)));
  pts.sort((a, b) => a - b);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++)
    if (pts[i] > out[out.length - 1]) out.push(pts[i]);
  return Float64Array.from(out);
}

/**
 * The posterior of the distance under a prior, on a grid: normalised density,
 * cumulative, its mode (refined) and an inverse-CDF `quantile(q)`.
 * @param {{parallax: number, error: number, zeroPoint?: {value: number, sigma: number},
 *   prior: object|string, rMin?: number, rMax?: number, n?: number}} args
 */
export function posterior({
  parallax,
  error,
  zeroPoint,
  prior,
  rMin = 0.001,
  rMax = 100,
  n = 3000,
} = {}) {
  const c = correctParallax({ parallax, error, zeroPoint });
  if (c.status === 'refused') return c;
  const pr = priorOf(prior);
  if (pr.status === 'refused') return pr;
  if (pr.name === 'none')
    return refused(
      'no-prior',
      'without a prior there is a likelihood, not a posterior'
    );
  const hi = pr.name === 'uniform-density' ? Math.min(rMax, pr.rMax) : rMax;
  const r = gridFor(c.w, c.s, rMin, hi, n);
  const m = r.length;
  const lp = new Float64Array(m);
  let top = -Infinity;
  let k = 0;
  for (let i = 0; i < m; i++) {
    lp[i] = lnLikelihood(r[i], c.w, c.s) + logPrior(pr, r[i]);
    if (lp[i] > top) {
      top = lp[i];
      k = i;
    }
  }
  const f = new Float64Array(m);
  for (let i = 0; i < m; i++) f[i] = Math.exp(lp[i] - top);
  const cdf = new Float64Array(m);
  for (let i = 1; i < m; i++)
    cdf[i] = cdf[i - 1] + 0.5 * (f[i] + f[i - 1]) * (r[i] - r[i - 1]);
  const total = cdf[m - 1];
  for (let i = 0; i < m; i++) {
    cdf[i] /= total;
    f[i] /= total;
  }
  // The mode: the zero of d ln p / dr next to the grid's maximum.
  let mode = r[k];
  const edge = k === 0 || k === m - 1;
  if (!edge) {
    const g = x => dLnLikelihood(x, c.w, c.s) + dLogPrior(pr, x);
    try {
      mode = brent(g, r[k - 1], r[k + 1], { xTol: 1e-13 }).x;
    } catch {
      mode = r[k];
    }
  }
  const quantile = q => {
    if (!(q >= 0 && q <= 1)) return NaN;
    let lo = 0;
    let up = m - 1;
    while (up - lo > 1) {
      const mid = (lo + up) >> 1;
      if (cdf[mid] < q) lo = mid;
      else up = mid;
    }
    const span = cdf[up] - cdf[lo];
    const t = span > 0 ? (q - cdf[lo]) / span : 0;
    return r[lo] + t * (r[up] - r[lo]);
  };
  return {
    status: 'ok',
    r,
    density: f,
    cdf,
    mode,
    modeAtEdge: edge,
    quantile,
    corrected: c,
    prior: pr,
  };
}

/** E[g(r)] under a posterior's grid (trapezoid). */
export function posteriorMean(post, g) {
  const { r, density } = post;
  let s = 0;
  for (let i = 1; i < r.length; i++)
    s +=
      0.5 *
      (g(r[i]) * density[i] + g(r[i - 1]) * density[i - 1]) *
      (r[i] - r[i - 1]);
  return s;
}

// ---- the distance ---------------------------------------------------------------

/** The relative likelihood L(r) / L_max as arrays, for drawing; n points between rLo and rHi. */
export function likelihoodCurve({
  parallax,
  error,
  zeroPoint,
  rMin,
  rMax,
  n = 200,
}) {
  const c = correctParallax({ parallax, error, zeroPoint });
  if (c.status === 'refused') return c;
  const rLo = rMin ?? 0.02;
  const rHi = rMax ?? 20;
  const r = new Float64Array(n);
  const rel = new Float64Array(n);
  let top = -Infinity;
  const ln = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = rLo * Math.exp((Math.log(rHi / rLo) * i) / (n - 1));
    ln[i] = lnLikelihood(r[i], c.w, c.s);
    if (ln[i] > top) top = ln[i];
  }
  // The curve is relative to its own maximum over the whole range of r, which
  // for w <= 0 is at the largest r (the likelihood never falls to zero there).
  for (let i = 0; i < n; i++) rel[i] = Math.exp(ln[i] - top);
  return { status: 'ok', r, relative: rel, corrected: c };
}

/**
 * A parallax as a distance.
 * @param {{parallax: number, error: number, zeroPoint?: {value: number, sigma: number},
 *   prior?: string|object, level?: number, curve?: number}} args
 * @returns the record: status, distance (kpc or null), interval {lo, hi (null
 *   when open), level}, the corrected parallax, the prior with its
 *   assumptions, and for a prior `posterior` {status, median, mode, interval}
 */
export function distanceFromParallax({
  parallax,
  error,
  zeroPoint,
  prior,
  level = LEVELS.one,
  curve = 0,
  rMin,
  rMax,
} = {}) {
  const c = correctParallax({ parallax, error, zeroPoint });
  if (c.status === 'refused') return c;
  const pr = priorOf(prior);
  if (pr.status === 'refused') return pr;
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const k = normalQuantile((1 + level) / 2);
  const base = {
    unit: 'kpc',
    parallax: {
      observed: parallax,
      corrected: c.w,
      error: c.sp,
      totalError: c.s,
      zeroPoint: { value: c.z, sigma: c.sz },
    },
    poe: c.poe,
    threshold: POE_THRESHOLD,
    level,
    prior: pr.name,
    priorLabel: PRIORS[pr.name].label,
    priorCite: PRIORS[pr.name].cite,
    assumes: PRIORS[pr.name].assumes,
    correction: 'none beyond the stated zero point',
  };
  if (curve > 0) {
    const cv = likelihoodCurve({
      parallax,
      error,
      zeroPoint,
      rMin,
      rMax,
      n: curve,
    });
    base.curve = { r: cv.r, relative: cv.relative };
  }
  // The likelihood's own result.
  let status;
  let distance = null;
  let interval = null;
  if (c.poe <= 0) status = 'likelihood-only';
  else {
    status = c.poe >= POE_THRESHOLD ? 'ok' : 'low-signal';
    distance = 1 / c.w;
    const denom = c.w - k * c.s;
    interval = {
      lo: 1 / (c.w + k * c.s),
      hi: denom > 1e-9 * c.s ? 1 / denom : null,
      level,
      method: 'likelihood',
    };
  }
  const out = { ...base, status, distance, interval, mode: distance };
  if (pr.name === 'none') {
    out.posterior = null;
    out.method = 'likelihood (Delta ln L = ' + (0.5 * k * k).toFixed(2) + ')';
    return out;
  }
  const post = posterior({ parallax, error, zeroPoint, prior: pr, rMin, rMax });
  const lo = post.quantile((1 - level) / 2);
  const hi = post.quantile((1 + level) / 2);
  const median = post.quantile(0.5);
  out.posterior = {
    status: c.poe >= POE_THRESHOLD ? 'ok' : 'prior-dominated',
    median,
    mode: post.mode,
    interval: { lo, hi, level, method: 'posterior (equal-tailed)' },
    prior: pr,
  };
  out.method = 'posterior under the ' + PRIORS[pr.name].label + ' prior';
  if (c.poe > 0) {
    // With a prior the reported distance is the posterior median, and the
    // status says where the answer follows the prior.
    out.distance = median;
    out.mode = post.mode;
    out.interval = out.posterior.interval;
    out.status = c.poe >= POE_THRESHOLD ? 'ok' : 'prior-dominated';
  }
  return out;
}

/**
 * A distance record as an artifact envelope's quantity (150): an interval with
 * its level and basis, or, where the far end is open, a lower limit.
 */
export function distanceQuantity(record) {
  if (!record || record.distance === null || record.distance === undefined)
    return { value: null, unit: 'kpc', uncertainty: { kind: 'none' } };
  const iv = record.interval;
  if (!iv || iv.hi === null || iv.hi === undefined)
    return {
      value: iv ? iv.lo : record.distance,
      unit: 'kpc',
      uncertainty: { kind: 'limit', bound: 'lower' },
    };
  return {
    value: record.distance,
    unit: 'kpc',
    uncertainty: {
      kind: 'interval',
      lo: iv.lo,
      hi: iv.hi,
      level: iv.level,
      basis: iv.method,
    },
  };
}

// ---- a cluster's mean parallax ----------------------------------------------------

/**
 * The weighted mean corrected parallax of a cluster's stars with its error: the
 * statistical error from the weights and the zero point's systematic added once
 * in quadrature (a shared systematic is never divided by the number of stars).
 * An iterative clip at `clipSigma` on (w_i - mean) / s_i, recorded.
 * @param {{stars: Array<{parallax: number, error: number, zeroPoint?: number}>,
 *   systematic?: number, clipSigma?: number|null}} args
 */
export function clusterParallax({
  stars,
  systematic = 0,
  clipSigma = null,
} = {}) {
  if (!Array.isArray(stars) || !stars.length)
    return refused('stars', 'a cluster needs at least one star');
  if (!(systematic >= 0) || !isNum(systematic))
    return refused(
      'systematic',
      'the systematic error must be zero or positive'
    );
  const rows = [];
  for (const st of stars) {
    if (!isNum(st.parallax) || !(st.error > 0) || !isNum(st.error))
      return refused(
        'star',
        'a star has a parallax or an error that is not usable'
      );
    rows.push({
      w: st.parallax - (st.zeroPoint ?? 0),
      s: st.error,
      z: st.zeroPoint ?? 0,
    });
  }
  let keep = rows.map(() => true);
  let mean = 0;
  let stat = 0;
  let iterations = 0;
  for (; iterations < 50; iterations++) {
    let sw = 0;
    let swx = 0;
    for (let i = 0; i < rows.length; i++)
      if (keep[i]) {
        const wt = 1 / (rows[i].s * rows[i].s);
        sw += wt;
        swx += wt * rows[i].w;
      }
    if (!sw) return refused('clip', 'every star was clipped');
    mean = swx / sw;
    stat = Math.sqrt(1 / sw);
    if (!(clipSigma > 0)) break;
    const next = rows.map(r => Math.abs(r.w - mean) / r.s <= clipSigma);
    if (next.every((v, i) => v === keep[i])) break;
    keep = next;
  }
  const n = keep.filter(Boolean).length;
  const meanZero = rows.reduce((a, r, i) => a + (keep[i] ? r.z : 0), 0) / n;
  return {
    status: 'ok',
    mean,
    statError: stat,
    systematic,
    error: Math.sqrt(stat * stat + systematic * systematic),
    n,
    clipped: rows.length - n,
    meanZeroPoint: meanZero,
    iterations,
  };
}

// ---- proper motion to velocity ----------------------------------------------------

/** The tangential speed of a proper motion at a distance: k mu r. */
export const tangentialSpeed = (mu, r) => K_PM * mu * r;

/**
 * A distance record scaled to a tangential speed at a fixed proper motion mu
 * (mas/yr): the value and both interval ends multiply by k mu, exactly.
 */
export function velocityAtFixedMotion(record, mu) {
  if (!record || record.distance === null || !(mu >= 0))
    return { value: null, interval: null };
  const f = K_PM * mu;
  const iv = record.interval;
  return {
    value: f * record.distance,
    interval: iv
      ? {
          lo: f * iv.lo,
          hi: iv.hi === null ? null : f * iv.hi,
          level: iv.level,
        }
      : null,
  };
}

function percentile(sorted, q) {
  const pos = q * (sorted.length - 1);
  const i = Math.floor(pos);
  const t = pos - i;
  return i + 1 < sorted.length
    ? sorted[i] * (1 - t) + sorted[i + 1] * t
    : sorted[i];
}

/**
 * The tangential velocity of a star with the distance's whole uncertainty and
 * the proper motion's, by sampling. The distance is drawn from the posterior
 * under a prior, or (no prior, corrected parallax over error of at least the
 * threshold) from the normal in parallax that the likelihood is. The proper
 * motion is drawn from its normal conditional on the drawn parallax, so the
 * parallax-proper-motion correlations Gaia gives are carried. The zero-point
 * error widens the parallax only. A star with no distance has no velocity.
 * @param {{pmra: number, pmdec: number, pmraError: number, pmdecError: number,
 *   correlations?: {parallaxPmra?: number, parallaxPmdec?: number, pmraPmdec?: number},
 *   parallax: number, error: number, zeroPoint?: object, prior?: string|object,
 *   level?: number, draws?: number, seed: number|string, label?: string,
 *   keepSamples?: boolean}} args
 */
export function tangentialVelocity({
  pmra,
  pmdec,
  pmraError,
  pmdecError,
  correlations = {},
  parallax,
  error,
  zeroPoint,
  prior,
  level = LEVELS.one,
  draws = 20000,
  seed,
  label = 'velocity',
  keepSamples = false,
} = {}) {
  if (![pmra, pmdec].every(isNum))
    return refused('proper-motion', 'the proper motion is not finite');
  if (!(pmraError > 0 && pmdecError > 0))
    return refused(
      'proper-motion-error',
      'the proper-motion errors must be positive'
    );
  if (!(draws >= 100) || !Number.isInteger(draws))
    return refused(
      'draws',
      'the number of draws must be a whole number of at least 100'
    );
  if (seed === undefined || seed === null || seed === '')
    return refused('seed', 'a seed is required');
  const rec = distanceFromParallax({
    parallax,
    error,
    zeroPoint,
    prior,
    level,
  });
  if (rec.status === 'refused') return rec;
  const pr = priorOf(prior);
  const noDistance = rec.distance === null;
  const needsPrior = pr.name === 'none' && rec.status !== 'ok';
  if (noDistance || needsPrior)
    return {
      status: 'no-distance',
      why:
        'the parallax does not fix a distance (' +
        rec.status +
        '): no tangential velocity is stated',
      distance: rec,
      value: null,
      interval: null,
    };
  const { w, s, sp } = correctParallax({ parallax, error, zeroPoint });
  const cor = {
    wa: correlations.parallaxPmra ?? 0,
    wd: correlations.parallaxPmdec ?? 0,
    ad: correlations.pmraPmdec ?? 0,
  };
  // Cross covariances are statistical: the zero-point error adds to the
  // parallax variance only. Conditional on the true parallax p_t,
  //   mu | p_t ~ N(mu_obs + c (p_t - w) / s^2, C_mm - c c^T / s^2).
  const ca = cor.wa * sp * pmraError;
  const cd = cor.wd * sp * pmdecError;
  const caa = pmraError * pmraError - (ca * ca) / (s * s);
  const cdd = pmdecError * pmdecError - (cd * cd) / (s * s);
  const cad = cor.ad * pmraError * pmdecError - (ca * cd) / (s * s);
  const l11 = Math.sqrt(caa);
  const l21 = cad / l11;
  const l22sq = cdd - l21 * l21;
  if (!(caa > 0) || !(l22sq > 0))
    return refused(
      'covariance',
      'the proper-motion covariance is not positive definite'
    );
  const l22 = Math.sqrt(l22sq);
  const u = stream('noise', seed, label);
  const z = gaussian(u);
  let post = null;
  if (pr.name !== 'none')
    post = posterior({ parallax, error, zeroPoint, prior: pr });
  const v = new Float64Array(draws);
  for (let i = 0; i < draws; i++) {
    let r;
    let pt;
    if (post) {
      r = post.quantile(u());
      pt = 1 / r;
    } else {
      pt = w + s * z();
      r = 1 / pt;
    }
    const dp = (pt - w) / (s * s);
    const g1 = z();
    const g2 = z();
    const ma = pmra + ca * dp + l11 * g1;
    const md = pmdec + cd * dp + l21 * g1 + l22 * g2;
    v[i] = K_PM * Math.hypot(ma, md) * r;
  }
  const sorted = Float64Array.from(v).sort();
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < draws; i++) {
    sum += v[i];
    sum2 += v[i] * v[i];
  }
  const mean = sum / draws;
  const lo = percentile(sorted, (1 - level) / 2);
  const hi = percentile(sorted, (1 + level) / 2);
  const median = percentile(sorted, 0.5);
  return {
    status: 'ok',
    unit: 'km/s',
    method: 'posterior sample',
    draws,
    stream: u.stream,
    value: median,
    interval: { lo, hi, level },
    mean,
    variance: (sum2 - draws * mean * mean) / (draws - 1),
    secondMoment: sum2 / draws,
    distance: rec,
    samples: keepSamples ? v : undefined,
    uncertainty: { kind: 'interval', lo, hi, level, basis: 'posterior sample' },
  };
}
