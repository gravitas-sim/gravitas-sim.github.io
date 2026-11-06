// =============================================================================
// SPIKE (Prompt 256 Part A): the supernova likelihood prototype. Never merged.
// -----------------------------------------------------------------------------
// The likelihood the thresholds (tests/fixtures/supernova-likelihood/thresholds.json)
// define: a distance modulus from the Prompt 255 model with one additive nuisance
// offset, analytic marginalisation, a covariance of two treatments (DIAG and the
// decided survey-coherent split), the single Cholesky of Prompt 152 and one
// forward substitution per trial, two-parameter planes with a refined minimum,
// edge crossings and a closure rule, and the refusals. Nothing here is shipped.
// =============================================================================
import { cholesky } from '../../../numeric/linalg.js';
import { gaussLegendre } from '../../../numeric/quadrature.js';
import { brent } from '../../../numeric/roots.js';
import { C_KMS } from '../flrw.js';
import { createFriedmann } from '../late/index.js';
import { chi2Quantile, levelOfSigma } from '../../statistics/index.js';

const { Math, Float64Array } = globalThis;

export const TAU = 0.02;
export const ZCUT = 0.01;
export const H0_REF = 70;
export const OFFSET = 0.37;
export const LEVEL_K = [1, 2, 3];
export const PK = LEVEL_K.map(k => levelOfSigma(k));

/** Delta chi-square for p and k free parameters, by the statistics kernel. */
export const deltaOf = (p, k) => chi2Quantile(p, k);

const round12 = x => Math.round(x * 1e12) / 1e12;
const grid = (lo, hi, n) =>
  Array.from({ length: n }, (_, i) => round12(lo + ((hi - lo) * i) / (n - 1)));

export const PLANES = {
  L1: { a: grid(0, 1, 201), b: null, box: [[0, 1]] },
  P1: {
    a: grid(0, 1, 51),
    b: grid(0, 1.5, 51),
    box: [
      [0, 1],
      [0, 1.5],
    ],
  },
  P2: {
    a: grid(0, 1, 51),
    b: grid(-3, 0, 51),
    box: [
      [0, 1],
      [-3, 0],
    ],
  },
};

// -------------------------------------------------------------------- the data
/** The sample S: no calibrator, z >= ZCUT, in the pack's order. */
export function sampleOf(pp) {
  const rows = [];
  for (let i = 0; i < pp.z.length; i++)
    if (pp.calibrator[i] === 0 && pp.z[i] >= ZCUT)
      rows.push({
        z: pp.z[i],
        mu: pp.mu[i],
        sigma: pp.err[i],
        survey: pp.survey[i],
        source: i,
      });
  return {
    n: rows.length,
    z: Float64Array.from(rows.map(r => r.z)),
    mu: Float64Array.from(rows.map(r => r.mu)),
    sigma: Float64Array.from(rows.map(r => r.sigma)),
    survey: rows.map(r => r.survey),
    source: rows.map(r => r.source),
  };
}

export const subset = (S, idx) => ({
  n: idx.length,
  z: Float64Array.from(idx.map(i => S.z[i])),
  mu: Float64Array.from(idx.map(i => S.mu[i])),
  sigma: Float64Array.from(idx.map(i => S.sigma[i])),
  survey: idx.map(i => S.survey[i]),
});

// ------------------------------------------------------------ distance modulus
const dhOf = H0 => C_KMS / H0;

/**
 * mu_th at the sorted redshifts z (Or = 0): the comoving distance accumulated
 * segment by segment in u = ln(1 + z) with the 16-point Gauss-Legendre rule of
 * js/numeric/quadrature.js (segments at most 0.25 wide), then the curvature
 * function, D_L = (1 + z) D_M. Ode and w are the model's; H0 is the reference.
 */
export function muTheory(z, Om, Ode, w) {
  const Ok = 1 - Om - Ode;
  const pw = 3 * (1 + w);
  const g = u => {
    const x = Math.exp(u);
    const x2 = x * x;
    return x / Math.sqrt(Om * x2 * x + Ok * x2 + Ode * Math.pow(x, pw));
  };
  const flat = Math.abs(Ok) < 1e-12;
  const sk = Math.sqrt(Math.abs(Ok));
  const dh = dhOf(H0_REF);
  const out = new Float64Array(z.length);
  let u0 = 0;
  let dc = 0;
  for (let i = 0; i < z.length; i++) {
    const u1 = Math.log1p(z[i]);
    const panels = Math.max(1, Math.ceil((u1 - u0) / 0.25));
    dc += gaussLegendre(g, u0, u1, panels);
    u0 = u1;
    const dm = flat
      ? dc
      : Ok > 0
        ? Math.sinh(sk * dc) / sk
        : Math.sin(sk * dc) / sk;
    out[i] = 5 * Math.log10((1 + z[i]) * dh * dm) + 25;
  }
  return out;
}

/** The model parameters of a node: [Om, Ode, w]. */
export function paramsOf(kind, a, b) {
  if (kind === 'L1') return [a, 1 - a, -1];
  if (kind === 'P1') return [a, b, -1];
  return [a, 1 - a, b];
}

/**
 * The domain of a node (AM1): refused when the Prompt 255 kernel refuses the
 * set or its luminosity distance at the largest redshift (a bounce; beyond the
 * antipode), or when the node is MARGINAL by the prototype's own scan of the
 * scale-free ratio. {refused, raw, marginal, code}.
 */
export function nodeDomain(kind, a, b, zmax) {
  const [Om, Ode, w] = paramsOf(kind, a, b);
  let raw = false;
  let code = null;
  try {
    const c = createFriedmann({ H0: H0_REF, Om, Ode, w });
    c.quantity('luminosity', zmax);
  } catch (e) {
    if (e?.name !== 'FriedmannDomainError') throw e;
    raw = true;
    code = e.code;
  }
  const Ok = 1 - Om - Ode;
  let rmin = Infinity;
  const n = 20000;
  const l0 = Math.log(1e-8);
  for (let k = 0; k < n; k++) {
    const x = Math.exp(l0 + (-l0 * k) / (n - 1));
    const F = Om * x + Ok * x * x + Ode * Math.pow(x, 1 - 3 * w);
    const den = Om * x + Math.abs(Ok) * x * x + Ode * Math.pow(x, 1 - 3 * w);
    const r = den > 0 ? F / den : 1;
    if (r < rmin) rmin = r;
  }
  const marginal = Math.abs(rmin) < 1e-6;
  return { refused: raw || marginal, raw, marginal, code };
}

// ---------------------------------------------------------------- treatments
const now = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
};

/**
 * A treatment's covariance on the rows of `data` ({sigma, survey, n}), factored
 * once by Prompt 152's cholesky (unchanged). 'diag': C = diag(sigma^2). 'cov':
 * the decided split, sigma^2 on the diagonal and tau^2 between rows of one
 * survey of two or more rows. Refusals carry a code and no number.
 */
export function makeTreatment(kind, data, { tau = TAU, timing = false } = {}) {
  const { sigma, survey } = data;
  const n = data.n ?? sigma?.length;
  if (
    !sigma ||
    (kind === 'cov' && !survey) ||
    (survey && sigma.length !== survey.length) ||
    (data.mu && data.mu.length !== sigma.length)
  )
    return refusal('mismatch', 'the lengths of mu, sigma and the survey codes differ');
  if (n < 8) return refusal('too-few', 'fewer than 8 rows');
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(sigma[i]) || (data.mu && !Number.isFinite(data.mu[i])))
      return refusal('non-finite', 'a mu or a sigma is not finite');
    if (!(sigma[i] > 0)) return refusal('bad-sigma', 'a sigma is at or below 0');
  }
  const out = { status: 'ok', kind, n, sigma, tau };
  if (kind === 'diag') {
    out.e = Float64Array.from(sigma, s => 1 / s);
    out.ee = out.e.reduce((s, v) => s + v * v, 0);
    out.whiten = r => Float64Array.from(r, (v, i) => v / sigma[i]);
    out.groups = [];
    out.matvec = v => Float64Array.from(v, (x, i) => sigma[i] * sigma[i] * x);
    out.solveBack = v => Float64Array.from(v, (x, i) => x / sigma[i] / sigma[i]);
    out.factorSeconds = 0;
    return out;
  }
  const groups = new Map();
  survey.forEach((s, i) => {
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(i);
  });
  out.groups = [...groups.values()].filter(g => g.length >= 2);
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) A[i][i] = sigma[i] * sigma[i];
  for (const g of out.groups)
    for (const i of g) for (const j of g) if (i !== j) A[i][j] = tau * tau;
  const t0 = now();
  const L = cholesky(A);
  out.factorSeconds = now() - t0;
  if (!L) return refusal('not-positive-definite', 'the covariance is not positive definite');
  const flat = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) flat[i * n + j] = L[i][j];
  out.L = flat;
  out.A = timing ? A : null;
  const fwd = r => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = r[i];
      const row = i * n;
      for (let k = 0; k < i; k++) s -= flat[row + k] * y[k];
      y[i] = s / flat[row + i];
    }
    return y;
  };
  out.whiten = fwd;
  out.e = fwd(new Float64Array(n).fill(1));
  out.ee = out.e.reduce((s, v) => s + v * v, 0);
  // C v, structurally: sigma^2 v_i + tau^2 (S_g - v_i) inside a group
  out.matvec = v => {
    const r = Float64Array.from(v, (x, i) => sigma[i] * sigma[i] * x);
    for (const g of out.groups) {
      let S = 0;
      for (const i of g) S += v[i];
      for (const i of g) r[i] += tau * tau * (S - v[i]);
    }
    return r;
  };
  // C^-1 v by L L^T
  out.solveBack = v => {
    const y = fwd(v);
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= flat[k * n + i] * x[k];
      x[i] = s / flat[i * n + i];
    }
    return x;
  };
  return out;
}

const refusal = (code, why) => ({ status: 'refused', code, why });

/** chi2 marginalised over the additive offset, for residual r = mu - mu_th (length n). */
export function chi2Resid(T, r) {
  const u = T.whiten(r);
  let uu = 0;
  let eu = 0;
  for (let i = 0; i < u.length; i++) {
    uu += u[i] * u[i];
    eu += T.e[i] * u[i];
  }
  return uu - (eu * eu) / T.ee;
}

/** chi2 from a whitened vector u and a whitened model v (u - v is the whitened residual). */
export function chi2Whitened(T, u, v) {
  let uu = 0;
  let eu = 0;
  for (let i = 0; i < u.length; i++) {
    const d = u[i] - v[i];
    uu += d * d;
    eu += T.e[i] * d;
  }
  return uu - (eu * eu) / T.ee;
}

// ---------------------------------------------------------------- evaluators
/**
 * The exact chi-square of an analysis: data mu on the rows `rows` of the
 * sample (z sorted ascending in S), treatment T on those rows. Returns a
 * function of (kind, a, b) giving chi2, or Infinity for a node outside the box
 * or the domain (AM1).
 */
export function evaluator(T, S, rows, muData) {
  const zr = Float64Array.from(rows, i => S.z[i]);
  const zmax = S.z[S.n - 1];
  const ev = (kind, a, b) => {
    const box = PLANES[kind].box;
    if (!(a >= box[0][0] && a <= box[0][1])) return Infinity;
    if (kind !== 'L1' && !(b >= box[1][0] && b <= box[1][1])) return Infinity;
    if (nodeDomain(kind, a, b, zmax).refused) return Infinity;
    const [Om, Ode, w] = paramsOf(kind, a, b);
    const m = muTheory(S.z, Om, Ode, w);
    const r = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i++) r[i] = muData[i] - m[rows[i]];
    return chi2Resid(T, r);
  };
  ev.zr = zr;
  return ev;
}

// ------------------------------------------------------------- minimisation
/** scipy's Nelder-Mead (rho 1, chi 2, psi 0.5, sigma 0.5), with +Infinity outside the feasible set. */
export function nelderMead(f, simplex, { xatol = 1e-10, fatol = 1e-12, maxfev = 4000 } = {}) {
  const n = simplex[0].length;
  let sim = simplex.map(v => v.slice());
  let fsim = sim.map(f);
  let nfev = sim.length;
  const order = () => {
    const idx = fsim.map((_, i) => i).sort((p, q) => fsim[p] - fsim[q] || p - q);
    sim = idx.map(i => sim[i]);
    fsim = idx.map(i => fsim[i]);
  };
  order();
  while (nfev < maxfev) {
    let dx = 0;
    let df = 0;
    for (let j = 1; j <= n; j++) {
      for (let k = 0; k < n; k++) dx = Math.max(dx, Math.abs(sim[j][k] - sim[0][k]));
      df = Math.max(df, Math.abs(fsim[0] - fsim[j]));
    }
    if (dx <= xatol && df <= fatol) break;
    const xbar = Array.from({ length: n }, (_, k) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += sim[j][k];
      return s / n;
    });
    const along = t => xbar.map((v, k) => (1 + t) * v - t * sim[n][k]);
    const xr = along(1);
    const fxr = f(xr);
    nfev++;
    let shrink = false;
    if (fxr < fsim[0]) {
      const xe = along(2);
      const fxe = f(xe);
      nfev++;
      if (fxe < fxr) {
        sim[n] = xe;
        fsim[n] = fxe;
      } else {
        sim[n] = xr;
        fsim[n] = fxr;
      }
    } else if (fxr < fsim[n - 1]) {
      sim[n] = xr;
      fsim[n] = fxr;
    } else {
      if (fxr < fsim[n]) {
        const xc = along(0.5);
        const fxc = f(xc);
        nfev++;
        if (fxc <= fxr) {
          sim[n] = xc;
          fsim[n] = fxc;
        } else shrink = true;
      } else {
        const xcc = xbar.map((v, k) => 0.5 * v + 0.5 * sim[n][k]);
        const fxcc = f(xcc);
        nfev++;
        if (fxcc < fsim[n]) {
          sim[n] = xcc;
          fsim[n] = fxcc;
        } else shrink = true;
      }
      if (shrink)
        for (let j = 1; j <= n; j++) {
          sim[j] = sim[0].map((v, k) => v + 0.5 * (sim[j][k] - v));
          fsim[j] = f(sim[j]);
          nfev++;
        }
    }
    order();
  }
  return { x: sim[0], fun: fsim[0], nfev };
}

/** Golden-section minimum of f on [lo, hi] to xtol. */
export function golden(f, lo, hi, xtol = 1e-12) {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  while (Math.abs(b - a) > xtol) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  const x = (a + b) / 2;
  return { x, fun: f(x) };
}

// ----------------------------------------------------------------- contours
/** Edge crossings of `level`: [i, j, dir, f]; dir 0 = (i,j)->(i+1,j), 1 = (i,j)->(i,j+1). */
export function edgesOf(chi, accepted, n1, n2, level) {
  const out = [];
  for (let i = 0; i < n1; i++)
    for (let j = 0; j < n2; j++) {
      const k = i * n2 + j;
      if (!accepted[k]) continue;
      if (i + 1 < n1 && accepted[k + n2] && chi[k] <= level !== chi[k + n2] <= level)
        out.push([i, j, 0, (level - chi[k]) / (chi[k + n2] - chi[k])]);
      if (j + 1 < n2 && accepted[k + 1] && chi[k] <= level !== chi[k + 1] <= level)
        out.push([i, j, 1, (level - chi[k]) / (chi[k + 1] - chi[k])]);
    }
  return out;
}

/** CLOSED iff no node inside the level lies on the outer ring and none has a refused 4-neighbour. */
export function regionClosed(chi, accepted, n1, n2, level) {
  let any = false;
  const inside = k => accepted[k] && chi[k] <= level;
  for (let i = 0; i < n1; i++)
    for (let j = 0; j < n2; j++) {
      const k = i * n2 + j;
      if (!inside(k)) continue;
      any = true;
      if (i === 0 || i === n1 - 1 || j === 0 || j === n2 - 1) return false;
      for (const kk of [k + n2, k - n2, k + 1, k - 1]) if (!accepted[kk]) return false;
    }
  return any;
}

const linspace = (lo, hi, n) =>
  Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

/** Crossings of absolute levels along a slice: a 401-point scan and Brent's rule. */
export function sliceCrossings(f, lo, hi, levels, n = 401) {
  const xs = linspace(lo, hi, n);
  const vals = xs.map(f);
  return levels.map(L => {
    const cr = [];
    for (let t = 0; t < n - 1; t++)
      if (
        Number.isFinite(vals[t]) &&
        Number.isFinite(vals[t + 1]) &&
        vals[t] <= L !== vals[t + 1] <= L
      )
        cr.push(brent(x => f(x) - L, xs[t], xs[t + 1], { xTol: 1e-12 }).x);
    return cr;
  });
}

// ------------------------------------------------------------ condition number
const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
const normed = v => {
  const s = Math.sqrt(dot(v, v));
  return Float64Array.from(v, x => x / s);
};

/** cond(C) by power and inverse iteration (AM2: to a relative change of 1e-10, at most 2000 each). */
export function conditionEstimate(T, start) {
  const iterate = apply => {
    let v = normed(start);
    let q = 0;
    let it = 0;
    for (; it < 2000; it++) {
      const w = apply(v);
      const qn = dot(v, w);
      v = normed(w);
      if (it > 0 && Math.abs(qn - q) <= 1e-10 * Math.abs(qn)) {
        q = qn;
        break;
      }
      q = qn;
    }
    return { q, it };
  };
  const hi = iterate(T.matvec);
  const lo = iterate(T.solveBack);
  const lmax = hi.q;
  const lmin = 1 / lo.q;
  return { lmax, lmin, cond: lmax / lmin, iterations: [hi.it, lo.it] };
}
