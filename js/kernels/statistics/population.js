// =============================================================================
// SPIKE (Roadmap III, Prompt 264 Part A): one selected-population likelihood. Never merged.
// -----------------------------------------------------------------------------
// The listings of a survey are a Poisson process over the measured value. The
// population is binned in the true value (uniform inside a bin); each object has
// a measured value x with a known Gaussian sigma; the survey's selection is the
// exposure E_j of each true bin (the summed completeness of the targets for
// planets, an effective volume for stars), built from Prompt 154's selection
// object. With mu_j = E_j Gamma_j / r_j the expected number of listings of true
// bin j (r_j the stated reliability) and K_ij the density of x_i from a value
// uniform in bin j,
//
//   l(mu) = sum_i ln(sum_j mu_j K_ij) - sum_j mu_j,
//
// concave in mu. Exact bins (sigma = 0) give mu_j = n_j and Gamma_j = n_j r_j / E_j,
// Prompt 229's rate. The maximum is found by EM with SQUAREM; the interval of a
// rate is the profile-likelihood interval (convex deviance, so an interval); the
// counts path returns Prompt 154's Poisson interval. The smoothing is a named
// roughness penalty on the second difference of the log rate: a regularisation,
// with no interval.
// =============================================================================

import { poissonInterval } from './intervals.js';
import { chi2Quantile, normalSf } from './special.js';
import { refused, isCount } from './check.js';

const { Math, Number, Float64Array, Uint8Array } = globalThis;

export const LEVELS = [0.6827];
export const LIMIT_LEVEL = 0.95;
export const FLOOR = 5;
export const ZERO_MU = 1e-6;
export const NODES = 64;
export const RESOLUTION_MAX = 0.5;
export const EM_REL_TOL = 1e-13;
export const EM_MAX_ITER = 20000;
export const UNBOUNDED = 1e6;
export const BISECT_REL_TOL = 1e-10;
export const MAX_BINS = 64;

// ---- the exposure from a selection ------------------------------------------------------

/**
 * E_j = sum over targets of weight_t times the mean of the target's inclusion probability over
 * `nodes` midpoints of bin j. A target is { selection, weight = 1, row = {} }; the selection reads
 * the observable `value` (the true value) and any other field of `row` (a distance, say).
 */
export function exposureFromSelection({ edges, targets, nodes = NODES }) {
  if (!validEdges(edges))
    return refused(
      'edges',
      'the edges are not strictly increasing finite numbers'
    );
  const J = edges.length - 1;
  const E = new Array(J).fill(0);
  for (const t of targets) {
    const wt = t.weight ?? 1;
    for (let j = 0; j < J; j++) {
      const lo = edges[j];
      const h = (edges[j + 1] - lo) / nodes;
      let s = 0;
      for (let k = 0; k < nodes; k++)
        s += t.selection.inclusion({
          ...(t.row ?? {}),
          value: lo + (k + 0.5) * h,
        });
      E[j] += (wt * s) / nodes;
    }
  }
  return E;
}

const validEdges = edges =>
  Array.isArray(edges) &&
  edges.length >= 2 &&
  edges.length <= MAX_BINS + 1 &&
  edges.every(Number.isFinite) &&
  edges.every((e, i) => i === 0 || e > edges[i - 1]);

// ---- the kernel K_ij ---------------------------------------------------------------------

/** The density of x from a true value uniform in [lo, hi), noise sigma; no cancellation in the tail. */
function density(x, sigma, lo, hi, last) {
  const w = hi - lo;
  if (sigma === 0)
    return (x >= lo && (x < hi || (last && x === hi)) ? 1 : 0) / w;
  const a = (x - lo) / sigma;
  const b = (x - hi) / sigma;
  const mass = b > 0 ? normalSf(b) - normalSf(a) : normalSf(-a) - normalSf(-b);
  return mass / w;
}

// ---- the fit -----------------------------------------------------------------------------

function logLik(P, mu) {
  const { K, wt, N, J } = P;
  let ll = 0;
  for (let i = 0; i < N; i++) {
    let d = 0;
    const o = i * J;
    for (let j = 0; j < J; j++) d += K[o + j] * mu[j];
    ll += wt[i] * Math.log(d > 1e-300 ? d : 1e-300);
  }
  for (let j = 0; j < J; j++) ll -= mu[j];
  return ll;
}

/** One EM step on the free bins; returns the log-likelihood of the input. */
function emStep(P, mu, out, free) {
  const { K, wt, N, J } = P;
  const acc = new Float64Array(J);
  for (let i = 0; i < N; i++) {
    let d = 0;
    const o = i * J;
    for (let j = 0; j < J; j++) d += K[o + j] * mu[j];
    const f = wt[i] / (d > 1e-300 ? d : 1e-300);
    for (let j = 0; j < J; j++) acc[j] += f * K[o + j];
  }
  for (let j = 0; j < J; j++) out[j] = free[j] ? mu[j] * acc[j] : mu[j];
}

/**
 * The maximum over mu >= 0 of the bins in P.active, with bin `fixed.j` held at `fixed.m`:
 * EM accelerated by SQUAREM (the three-point extrapolation, kept only where it does not lower the
 * likelihood, followed by an EM step).
 */
function maximize(P, start, fixed = null) {
  const { J, active } = P;
  const free = new Uint8Array(J);
  for (let j = 0; j < J; j++)
    free[j] = active[j] && !(fixed && fixed.j === j) ? 1 : 0;
  let mu = new Float64Array(J);
  if (start) {
    for (let j = 0; j < J; j++) mu[j] = free[j] ? Math.max(start[j], 1e-9) : 0;
  } else {
    let tot = 0;
    for (let i = 0; i < P.N; i++) tot += P.wt[i];
    let nf = 0;
    for (let j = 0; j < J; j++) nf += free[j];
    for (let j = 0; j < J; j++)
      mu[j] = free[j] ? Math.max(tot, 1) / Math.max(nf, 1) : 0;
  }
  if (fixed) mu[fixed.j] = fixed.m;
  let ll = logLik(P, mu);
  const t1 = new Float64Array(J);
  const t2 = new Float64Array(J);
  const cand = new Float64Array(J);
  const cand2 = new Float64Array(J);
  let calm = 0;
  let it = 0;
  let converged = false;
  for (; it < EM_MAX_ITER; it++) {
    emStep(P, mu, t1, free);
    emStep(P, t1, t2, free);
    let nr = 0;
    let nv = 0;
    for (let j = 0; j < J; j++) {
      const r = t1[j] - mu[j];
      const v = t2[j] - t1[j] - r;
      nr += r * r;
      nv += v * v;
    }
    let best = t2;
    let llBest = logLik(P, t2);
    if (nr > 0 && nv > 0) {
      let alpha = -Math.sqrt(nr / nv);
      if (alpha > -1) alpha = -1;
      for (let tries = 0; tries < 6; tries++) {
        for (let j = 0; j < J; j++) {
          const r = t1[j] - mu[j];
          const v = t2[j] - t1[j] - r;
          const c = mu[j] - 2 * alpha * r + alpha * alpha * v;
          cand[j] = free[j] ? Math.max(c, 0) : mu[j];
        }
        emStep(P, cand, cand2, free);
        const l2 = logLik(P, cand2);
        if (l2 >= llBest) {
          best = cand2;
          llBest = l2;
          break;
        }
        alpha = (alpha - 1) / 2;
      }
    }
    for (let j = 0; j < J; j++) mu[j] = best[j];
    const change = llBest - ll;
    ll = llBest;
    if (change <= EM_REL_TOL * (1 + Math.abs(ll))) {
      if (++calm >= 2) {
        converged = true;
        it++;
        break;
      }
    } else calm = 0;
  }
  return { mu, ll, iterations: it, converged };
}

/** The deviance of bin j at mu_j = m: 2 (l_hat - max of l with mu_j = m), from the maximum's start. */
function deviance(P, fit, j, m) {
  const f = maximize(P, fit.mu, { j, m });
  return { dev: Math.max(0, 2 * (fit.ll - f.ll)), converged: f.converged };
}

/** Illinois false position on f between a and b, where fa = f(a) and fb = f(b) have opposite signs. */
function falsePosition(f, a, b, fa, fb) {
  let side = 0;
  for (let it = 0; it < 200; it++) {
    const c = (a * fb - b * fa) / (fb - fa);
    const fc = f(c);
    if (
      Math.abs(fc) <= 1e-10 ||
      Math.abs(b - a) <= BISECT_REL_TOL * Math.max(Math.abs(c), 1e-9)
    )
      return c;
    if (fc * fb > 0) {
      b = c;
      fb = fc;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = c;
      fa = fc;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return 0.5 * (a + b);
}

/** The profile interval of bin j in mu units at a deviance threshold: [lo, hi|null]. */
function profileEnds(P, fit, j, dev) {
  const mh = fit.mu[j];
  const D = m => deviance(P, fit, j, m).dev;
  let lo = 0;
  const d0 = D(0);
  if (d0 > dev) lo = falsePosition(m => D(m) - dev, 0, mh, d0 - dev, -dev);
  let prev = mh;
  let fprev = -dev;
  let top = Math.max(mh, 1);
  const cap = UNBOUNDED * Math.max(mh, 1);
  let ftop = D(top) - dev;
  while (ftop < 0) {
    prev = top;
    fprev = ftop;
    if (top >= cap) return [lo, null];
    top *= 4;
    ftop = D(top) - dev;
  }
  return [lo, falsePosition(m => D(m) - dev, prev, top, fprev, ftop)];
}

/** The upper limit of a zero bin: the mu at which the deviance reaches -2 ln(1 - level). */
function profileLimit(P, fit, j, level) {
  const target = -2 * Math.log(1 - level);
  let prev = 0;
  let fprev = -target;
  let top = 1;
  let ftop = deviance(P, fit, j, top).dev - target;
  while (ftop < 0) {
    prev = top;
    fprev = ftop;
    top *= 4;
    if (top > 1e9) return null;
    ftop = deviance(P, fit, j, top).dev - target;
  }
  return falsePosition(
    m => deviance(P, fit, j, m).dev - target,
    prev,
    top,
    fprev,
    ftop
  );
}

// ---- the penalised maximum ---------------------------------------------------------------

function solve(A, b, n) {
  // Gaussian elimination with partial pivoting on a copy; A is n x n row-major.
  const M = Float64Array.from(A);
  const x = Float64Array.from(b);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r * n + c]) > Math.abs(M[p * n + c])) p = r;
    if (Math.abs(M[p * n + c]) < 1e-300) return null;
    if (p !== c) {
      for (let k = 0; k < n; k++) {
        const t = M[c * n + k];
        M[c * n + k] = M[p * n + k];
        M[p * n + k] = t;
      }
      const t = x[c];
      x[c] = x[p];
      x[p] = t;
    }
    for (let r = c + 1; r < n; r++) {
      const f = M[r * n + c] / M[c * n + c];
      if (f === 0) continue;
      for (let k = c; k < n; k++) M[r * n + k] -= f * M[c * n + k];
      x[r] -= f * x[c];
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = x[r];
    for (let k = r + 1; k < n; k++) s -= M[r * n + k] * x[k];
    x[r] = s / M[r * n + r];
  }
  return x;
}

/** The penalised objective -l + (kappa / 2) |D2 theta|^2 with its gradient and Hessian, theta = ln Gamma. */
function penalisedParts(P, theta, scale, kappa) {
  const { K, wt, N, J } = P;
  const mu = new Float64Array(J);
  for (let j = 0; j < J; j++) mu[j] = scale[j] * Math.exp(theta[j]);
  const a = new Float64Array(J);
  const B = new Float64Array(J * J);
  let ll = 0;
  for (let i = 0; i < N; i++) {
    let d = 0;
    const o = i * J;
    for (let j = 0; j < J; j++) d += K[o + j] * mu[j];
    if (d < 1e-300) d = 1e-300;
    ll += wt[i] * Math.log(d);
    const f = wt[i] / d;
    for (let j = 0; j < J; j++) {
      a[j] += f * K[o + j];
      const g = (f / d) * K[o + j] * mu[j];
      for (let k = 0; k < J; k++) B[j * J + k] += g * K[o + k] * mu[k];
    }
  }
  for (let j = 0; j < J; j++) ll -= mu[j];
  const grad = new Float64Array(J);
  const H = new Float64Array(J * J);
  for (let j = 0; j < J; j++) {
    grad[j] = -mu[j] * (a[j] - 1);
    for (let k = 0; k < J; k++) H[j * J + k] = B[j * J + k];
    H[j * J + j] += -mu[j] * (a[j] - 1);
  }
  // -l has gradient -dl and Hessian -d2l; d2l = diag(mu (a - 1)) - B, so -d2l = B - diag(mu (a - 1))
  let pen = 0;
  for (let i = 0; i + 2 < J; i++) {
    const c = theta[i] - 2 * theta[i + 1] + theta[i + 2];
    pen += c * c;
    const idx = [i, i + 1, i + 2];
    const co = [1, -2, 1];
    for (let p = 0; p < 3; p++) {
      grad[idx[p]] += kappa * c * co[p];
      for (let q = 0; q < 3; q++)
        H[idx[p] * J + idx[q]] += kappa * co[p] * co[q];
    }
  }
  return { obj: -ll + 0.5 * kappa * pen, grad, H };
}

function penalisedFit(P, fit, scale, kappa, stop) {
  const { J } = P;
  let listings = 0;
  for (let i = 0; i < P.N; i++) listings += P.wt[i];
  const theta = new Float64Array(J);
  for (let j = 0; j < J; j++)
    theta[j] = Math.log(Math.max(fit.mu[j], 0.5) / scale[j]);
  let cur = penalisedParts(P, theta, scale, kappa);
  let lambda = 1e-3;
  let converged = false;
  let reason = 'cap';
  let it = 0;
  for (; it < 1000; it++) {
    let gmax = 0;
    for (let j = 0; j < J; j++) gmax = Math.max(gmax, Math.abs(cur.grad[j]));
    if (gmax < 1e-10) {
      converged = true;
      reason = 'criterion';
      break;
    }
    if (stop === 'rounding-floor') {
      // amendment AM-F3 of the follow-up: one more step cannot lower the objective by more than its rounding
      const st = solve(cur.H, cur.grad, J);
      if (st) {
        let d = 0;
        for (let j = 0; j < J; j++) d += 0.5 * cur.grad[j] * st[j];
        if (
          Number.isFinite(d) &&
          d >= 0 &&
          d <= 64 * 2 ** -52 * Math.max(1, Math.abs(cur.obj)) &&
          gmax <= 1e-6 * Math.max(1, listings)
        ) {
          converged = true;
          reason = 'rounding-floor';
          break;
        }
      }
    }
    let accepted = false;
    for (let tries = 0; tries < 40; tries++) {
      const A = Float64Array.from(cur.H);
      for (let j = 0; j < J; j++)
        A[j * J + j] += lambda * (1 + Math.abs(cur.H[j * J + j]));
      const step = solve(
        A,
        Float64Array.from(cur.grad, g => -g),
        J
      );
      if (step) {
        const next = Float64Array.from(theta, (t, j) => t + step[j]);
        const nxt = penalisedParts(P, next, scale, kappa);
        if (nxt.obj <= cur.obj) {
          for (let j = 0; j < J; j++) theta[j] = next[j];
          cur = nxt;
          lambda = Math.max(lambda / 10, 1e-12);
          accepted = true;
          break;
        }
      }
      lambda *= 10;
    }
    if (!accepted) {
      reason = 'no-accepted-step';
      break;
    }
  }
  // the follow-up's diagnostic return (amendment AM-F2): intermediate quantities only, no arithmetic changed
  let gmax = 0;
  for (let j = 0; j < J; j++) gmax = Math.max(gmax, Math.abs(cur.grad[j]));
  return {
    theta,
    objective: cur.obj,
    converged,
    iterations: it,
    diagnostic: { reason, lambda, gmax, grad: cur.grad, H: cur.H },
  };
}

// ---- the problem -------------------------------------------------------------------------

/**
 * Rates of a selected population.
 * @param {{edges: number[], exposure: number[], reliability?: number|number[],
 *   counts?: number[], objects?: {x: number, sigma: number}[], levels?: number[],
 *   limitLevel?: number, floor?: number, penalty?: {kappa: number}|null}} spec
 */
export function populationRates({
  edges,
  exposure,
  reliability = 1,
  counts,
  objects,
  levels = LEVELS,
  limitLevel = LIMIT_LEVEL,
  floor = FLOOR,
  penalty = null,
  intervals = true,
}) {
  if (!validEdges(edges))
    return refused(
      'edges',
      'the edges are not strictly increasing finite numbers (at least two, at most 64 bins)'
    );
  const J = edges.length - 1;
  if (
    !Array.isArray(exposure) ||
    exposure.length !== J ||
    !exposure.every(e => Number.isFinite(e) && e >= 0)
  )
    return refused(
      'exposure',
      'there must be one finite exposure of at least 0 per bin'
    );
  const r = Array.isArray(reliability)
    ? reliability
    : new Array(J).fill(reliability);
  if (r.length !== J || !r.every(v => Number.isFinite(v) && v > 0 && v <= 1))
    return refused(
      'reliability',
      'a reliability is a probability above 0 and at most 1, one per bin or one for all'
    );
  if (
    !Array.isArray(levels) ||
    !levels.every(l => Number.isFinite(l) && l > 0 && l < 1) ||
    !(limitLevel > 0 && limitLevel < 1)
  )
    return refused('level', 'a level is strictly between 0 and 1');
  const kappa = penalty ? penalty.kappa : 0;
  if (penalty && !(Number.isFinite(kappa) && kappa >= 0))
    return refused(
      'penalty',
      'the penalty weight kappa is a finite number of at least 0'
    );
  if ((counts === undefined) === (objects === undefined))
    return refused(
      'sample',
      'give either counts or objects, not neither and not both'
    );

  const E = exposure;
  let exact = true;
  if (counts !== undefined) {
    if (!Array.isArray(counts) || counts.length !== J)
      return refused('counts', 'there must be one count per bin');
    if (!counts.every(n => isCount(n)))
      return refused('count', 'a count is a whole number of at least 0');
  } else {
    if (!Array.isArray(objects))
      return refused('sample', 'objects is a list of {x, sigma}');
    for (const o of objects) {
      if (!(Number.isFinite(o.sigma) && o.sigma >= 0))
        return refused(
          'sigma',
          'an uncertainty sigma is a finite number of at least 0'
        );
      if (!Number.isFinite(o.x))
        return refused('object', 'a measured value is not a finite number');
      if (o.sigma > 0) exact = false;
    }
    if (exact) {
      counts = new Array(J).fill(0);
      for (const o of objects) {
        let j = -1;
        for (let b = 0; b < J; b++)
          if (
            o.x >= edges[b] &&
            (o.x < edges[b + 1] || (b === J - 1 && o.x === edges[J]))
          ) {
            j = b;
            break;
          }
        if (j < 0)
          return refused(
            'outside',
            'an object with no uncertainty lies outside the edges'
          );
        counts[j]++;
      }
    }
  }
  if (penalty && kappa > 0 && E.some(e => e === 0))
    return refused(
      'penalty-gap',
      'a penalty needs every bin to have an exposure above 0'
    );

  const N =
    counts !== undefined && exact
      ? counts.reduce((a, b) => a + b, 0)
      : objects.length;
  const active = new Uint8Array(J);
  for (let j = 0; j < J; j++) active[j] = E[j] > 0 ? 1 : 0;

  // ---- the problem matrix
  let P;
  let resolutionRec = null;
  if (exact) {
    // exact bins: one row per populated bin with the count as its weight; K is 1 / width in its bin
    const idx = counts.map((n, j) => (n > 0 ? j : -1)).filter(j => j >= 0);
    const K = new Float64Array(idx.length * J);
    const wt = new Float64Array(idx.length);
    idx.forEach((j, i) => {
      K[i * J + j] = 1 / (edges[j + 1] - edges[j]);
      wt[i] = counts[j];
    });
    P = { K, wt, N: idx.length, J, active: new Uint8Array(J).fill(1) };
  } else {
    const K = new Float64Array(objects.length * J);
    const wt = new Float64Array(objects.length).fill(1);
    const ratios = [];
    for (let i = 0; i < objects.length; i++) {
      const { x, sigma } = objects[i];
      let s = 0;
      for (let j = 0; j < J; j++) {
        const k = active[j]
          ? density(x, sigma, edges[j], edges[j + 1], j === J - 1)
          : 0;
        K[i * J + j] = k;
        s += k;
      }
      if (!(s >= 1e-300))
        return refused(
          'unplaceable',
          'an object has no likelihood in any bin (its value is too far from every bin for its sigma)'
        );
      let b = J - 1;
      for (let j = 0; j < J; j++)
        if (x < edges[j + 1]) {
          b = j;
          break;
        }
      ratios.push(sigma / (edges[b + 1] - edges[b]));
    }
    P = { K, wt, N: objects.length, J, active };
    ratios.sort((a, b) => a - b);
    const m = ratios.length
      ? ratios.length % 2
        ? ratios[(ratios.length - 1) / 2]
        : 0.5 * (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2])
      : 0;
    resolutionRec = { median: m, ok: m <= RESOLUTION_MAX };
  }

  const scale = E.map((e, j) => e / r[j]);
  const bins = new Array(J);
  const allBelow = E.every(e => e < floor);
  let fit = null;
  let ll = null;
  let mu = null;
  let converged = true;
  let iterations = 0;

  if (exact) {
    // the closed form: mu_j = n_j
    mu = counts.map(Number);
    for (let j = 0; j < J; j++) {
      const n = counts[j];
      const base = { n, completeness: E[j], reliability: r[j] };
      if (E[j] < floor) {
        bins[j] = { status: 'not-constrained', ...base, floor };
        continue;
      }
      if (n === 0) {
        bins[j] = {
          status: 'upper-limit',
          ...base,
          level: limitLevel,
          upperLimit: -Math.log(1 - limitLevel) / E[j],
        };
        continue;
      }
      const ivs = levels.map(level => ({
        level,
        ...poissonInterval([n], { exposure: E[j] / r[j], level }),
      }));
      const iv = ivs[0];
      bins[j] = {
        status: 'ok',
        ...base,
        rate: (n * r[j]) / E[j],
        lo: iv.lo,
        hi: iv.hi,
        level: iv.level,
        method: iv.method,
        intervals: ivs.map(v => ({
          level: v.level,
          lo: v.lo,
          hi: v.hi,
          method: v.method,
        })),
      };
    }
  } else {
    fit = maximize(P, null);
    ll = fit.ll;
    mu = Array.from(fit.mu);
    converged = fit.converged;
    iterations = fit.iterations;
    for (let j = 0; j < J; j++) {
      const base = { completeness: E[j], reliability: r[j] };
      if (E[j] < floor) {
        bins[j] = { status: 'not-constrained', ...base, floor };
        continue;
      }
      if (fit.mu[j] < ZERO_MU) {
        const m = profileLimit(P, fit, j, limitLevel);
        bins[j] = {
          status: 'upper-limit',
          ...base,
          level: limitLevel,
          upperLimit: m === null ? null : (m * r[j]) / E[j],
        };
        continue;
      }
      const ivs = (intervals ? levels : []).map(level => {
        const [lo, hi] = profileEnds(P, fit, j, chi2Quantile(level, 1));
        return {
          level,
          lo: (lo * r[j]) / E[j],
          hi: hi === null ? null : (hi * r[j]) / E[j],
          method: 'profile-likelihood',
        };
      });
      bins[j] = {
        status: 'ok',
        ...base,
        rate: (fit.mu[j] * r[j]) / E[j],
        lo: ivs[0]?.lo ?? null,
        hi: ivs[0]?.hi ?? null,
        level: ivs[0]?.level ?? null,
        method: 'profile-likelihood',
        unbounded: ivs.some(v => v.hi === null),
        intervals: ivs,
      };
    }
  }
  if (exact) {
    fit = { mu: Float64Array.from(mu), ll: logLik(P, Float64Array.from(mu)) };
    ll = fit.ll;
  }

  const stats = { fits: exact ? 0 : 1, bad: exact || fit.converged ? 0 : 1 };
  const out = {
    status: allBelow ? 'not-constrained' : 'ok',
    path: exact ? 'counts' : 'objects',
    uncertainty: exact ? 'none' : 'objects',
    n: N,
    logLik: ll,
    mu,
    converged,
    iterations,
    levels,
    limitLevel,
    floor,
    bins,
    resolution: resolutionRec,
    penalty: null,
    /** The deviance of bin j at the rate gamma (for coverage and for a reader's own interval). */
    deviance: (j, gamma) => {
      const d = deviance(P, fit, j, (gamma * E[j]) / r[j]);
      stats.fits++;
      if (!d.converged) stats.bad++;
      return d.dev;
    },
    stats,
  };
  if (allBelow)
    out.why =
      'every bin has an exposure below the floor: the searched population cannot constrain any rate';
  if (penalty) {
    const pf =
      kappa > 0
        ? penalisedFit(P, fit, scale, kappa, penalty.stop)
        : {
            theta: Float64Array.from(fit.mu, (m, j) => Math.log(m / scale[j])),
            objective: -ll,
            converged,
          };
    out.penalty = {
      statistic: 'penalised maximum likelihood',
      kind: 'roughness',
      of: 'the second difference of the log rate',
      kappa,
      rates: Array.from(pf.theta, Math.exp),
      theta: Array.from(pf.theta),
      objective: pf.objective,
      converged: pf.converged,
      interval: null,
      note: 'a smoothing chosen by the user: the intervals above belong to the unpenalised maximum and are not recomputed for the penalised rates',
      unpenalised: bins.map(b => (b.status === 'ok' ? b.rate : null)),
    };
    if (penalty.diagnostic === true && pf.diagnostic)
      out.penalty.diagnostic = {
        iterations: pf.iterations,
        reason: pf.diagnostic.reason,
        lambda: pf.diagnostic.lambda,
        gmax: pf.diagnostic.gmax,
        grad: Array.from(pf.diagnostic.grad),
        H: Array.from(pf.diagnostic.H),
        solve,
      };
  }
  return out;
}
