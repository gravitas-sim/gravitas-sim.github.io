// =============================================================================
// Structure growth in a declared domain: the prototype of the Prompt 259 Part A gate
// -----------------------------------------------------------------------------
// On spike/structure-growth-gate only; never merged (7.5 rule 4). The contract is
// tests/fixtures/growth/thresholds.json (model.*): the linear growth equation with a
// constant-w smooth dark energy and curvature, no radiation, a in [0.01, 1]; the
// Eisenstein-Hu no-wiggle transfer-function shape and the variance on a scale; the
// Jeans criterion in the expanding background. Pure: no DOM, no clock.
//
//   D'' + (2 + dlnE/du) D' + [ (kappa/(a E))^2 - (3/2) Omega_m(a) ] D = 0,   u = ln a
//   E^2 = Om a^-3 + Ok a^-2 + Ode a^(-3 (1 + w)),   Ok = 1 - Om - Ode
// =============================================================================

import { adaptive, gaussLegendre } from '../../../numeric/quadrature.js';
import { brent } from '../../../numeric/roots.js';

const { Math, Number } = globalThis;

// ----------------------------------------------------------------- domains
export const GROWTH_DOMAIN = Object.freeze({
  Om: [0.1, 1],
  Ode: [0, 1.2],
  w: [-1.5, -0.5],
  a: [0.01, 1],
});
export const GROWTH_CODES = Object.freeze([
  'not-finite',
  'bad-argument',
  'radiation-in-growth',
  'density-out-of-domain',
  'w-out-of-domain',
  'bounce',
  'a-out-of-domain',
]);
export const SHAPE_DOMAIN = Object.freeze({
  h: [0.3, 1.2],
  Omh2: [0.025, 0.5],
  Obh2Min: 0.0125,
  baryonFractionMax: 0.5,
  ns: [0.5, 1.5],
  sigma8: [0, 3],
  k: [1e-5, 1e4],
  R: [0.1, 1000],
});
export const SHAPE_CODES = Object.freeze([
  'not-finite',
  'bad-argument',
  'h-out-of-domain',
  'omega-m-h2',
  'omega-b-h2',
  'baryon-fraction',
  'ns-out-of-domain',
  'sigma8-out-of-domain',
  'k-out-of-domain',
  'R-out-of-domain',
]);
export const JEANS_DOMAIN = Object.freeze({ cs: [0, 100], k: [0, 1e4] });
export const JEANS_CODES = Object.freeze(['not-finite', 'bad-sound-speed', 'bad-wavenumber']);

export class GrowthDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GrowthDomainError';
    this.code = code;
  }
}
const refuse = (code, message) => {
  throw new GrowthDomainError(code, message);
};

const A_START = 1e-6;
const THETA = 2.728 / 2.7;

// ------------------------------------------------------------- background
function parse(params, keys) {
  for (const k of keys) {
    const v = params[k];
    if (v === undefined) continue;
    if (typeof v !== 'number') refuse('bad-argument', `${k} must be a number`);
    if (!Number.isFinite(v)) refuse('not-finite', `${k} is not finite`);
  }
}

export function checkGrowthParameters(params) {
  if (!params || typeof params !== 'object') refuse('bad-argument', 'parameters are required');
  parse(params, ['Om', 'Ode', 'w', 'Or']);
  if (params.Om === undefined || params.Ode === undefined) refuse('bad-argument', 'Om and Ode are required');
  const w = params.w === undefined ? -1 : params.w;
  const Or = params.Or === undefined ? 0 : params.Or;
  if (Or !== 0) refuse('radiation-in-growth', 'the growth domain has no radiation term (Or must be 0)');
  const { Om, Ode } = params;
  if (Om < GROWTH_DOMAIN.Om[0] || Om > GROWTH_DOMAIN.Om[1] || Ode < GROWTH_DOMAIN.Ode[0] || Ode > GROWTH_DOMAIN.Ode[1])
    refuse('density-out-of-domain', 'Om must lie in [0.1, 1] and Ode in [0, 1.2]');
  if (w < GROWTH_DOMAIN.w[0] || w > GROWTH_DOMAIN.w[1]) refuse('w-out-of-domain', 'w must lie in [-1.5, -0.5]');
  const bg = makeBackground(Om, Ode, w);
  let min = Infinity;
  for (let i = 0; i <= 4000; i++) {
    const a = Math.pow(10, -6 + (6 * i) / 4000);
    const e2 = bg.e2(a) * a * a * a;
    if (e2 < min) min = e2;
  }
  if (!(min > 0)) refuse('bounce', 'E^2 reaches zero between a = 1e-6 and 1');
  return { Om, Ode, w };
}

export function makeBackground(Om, Ode, w) {
  const Ok = 1 - Om - Ode;
  const p = -3 * (1 + w);
  const e2 = a => Om * a ** -3 + Ok * a ** -2 + Ode * a ** p;
  return {
    Om,
    Ode,
    w,
    Ok,
    e2,
    dlnE: a => (-3 * Om * a ** -3 - 2 * Ok * a ** -2 + p * Ode * a ** p) / (2 * e2(a)),
    omegaM: a => (Om * a ** -3) / e2(a),
  };
}

// ----------------------------------------------------------- the growth solve
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

/**
 * Solves the growth equation to every scale factor in aList (any order) and returns D (normalised to D -> a in
 * the matter era), the rate f = dlnD/dlna, D' and the carried relative error estimate of D.
 * `pressure: { kappa }` adds the Jeans term (kappa = c_s k / H0).
 */
export function solveGrowth(params, aList, { rtol = 1e-11, pressure = null } = {}) {
  const { Om, Ode, w } = checkGrowthParameters(params);
  if (!Array.isArray(aList) || aList.length === 0) refuse('bad-argument', 'a list of scale factors is required');
  for (const a of aList) if (typeof a !== 'number' || !Number.isFinite(a)) refuse('not-finite', 'a is not finite');
  for (const a of aList)
    if (a < GROWTH_DOMAIN.a[0] || a > GROWTH_DOMAIN.a[1]) refuse('a-out-of-domain', 'a must lie in [0.01, 1]');
  let kappa = 0;
  if (pressure) {
    kappa = pressure.kappa;
    if (typeof kappa !== 'number' || !Number.isFinite(kappa) || kappa < 0) refuse('bad-argument', 'kappa must be finite and >= 0');
  }
  const bg = makeBackground(Om, Ode, w);
  const K = bg.Ok / Om;
  const rhs = (u, y, out) => {
    const a = Math.exp(u);
    const E2 = bg.e2(a);
    const pr = kappa ? (kappa * kappa) / (a * a * E2) : 0;
    out[0] = y[1];
    out[1] = -(2 + bg.dlnE(a)) * y[1] - (pr - 1.5 * bg.omegaM(a)) * y[0];
  };
  const order = aList.map((a, i) => [a, i]).sort((x, y) => x[0] - y[0]);
  const D = new Array(aList.length);
  const dD = new Array(aList.length);
  const est = new Array(aList.length);
  const icError = (Math.abs(K) * A_START) ** 2 + (Ode / Om) * A_START ** (-3 * w);
  let u = Math.log(A_START);
  let y = [A_START * (1 - (4 / 7) * K * A_START), A_START * (1 - (8 / 7) * K * A_START)];
  let h = 1e-3;
  let sumErr = 0;
  let steps = 0;
  const k = Array.from({ length: 7 }, () => [0, 0]);
  const tmp = [0, 0];
  for (const [aT, idx] of order) {
    const uT = Math.log(aT);
    while (u < uT) {
      let last = false;
      let hh = h;
      if (u + hh >= uT) {
        hh = uT - u;
        last = true;
      }
      rhs(u, y, k[0]);
      for (let s = 1; s < 7; s++) {
        for (let c = 0; c < 2; c++) {
          let acc = 0;
          for (let j = 0; j < s; j++) acc += A[s][j] * k[j][c];
          tmp[c] = y[c] + hh * acc;
        }
        rhs(u + C[s] * hh, tmp, k[s]);
      }
      const y5 = [0, 0];
      const y4 = [0, 0];
      for (let c = 0; c < 2; c++) {
        let s5 = 0;
        let s4 = 0;
        for (let s = 0; s < 7; s++) {
          s5 += B5[s] * k[s][c];
          s4 += B4[s] * k[s][c];
        }
        y5[c] = y[c] + hh * s5;
        y4[c] = y[c] + hh * s4;
      }
      const scale = rtol * Math.max(Math.abs(y[0]), Math.abs(y[1]), Math.abs(y5[0]), Math.abs(y5[1]));
      const err = Math.max(Math.abs(y5[0] - y4[0]), Math.abs(y5[1] - y4[1])) / scale;
      steps++;
      if (steps > 2e6) refuse('not-converged', 'the integration did not finish');
      if (err <= 1 || hh < 1e-12) {
        sumErr += Math.abs(y5[0] - y4[0]) / Math.abs(y5[0]);
        u = last ? uT : u + hh;
        y = y5;
        if (!last) h = hh * Math.min(5, Math.max(0.2, 0.9 * err ** -0.2));
        else h = Math.max(h, 1e-3);
      } else {
        h = hh * Math.max(0.2, 0.9 * err ** -0.2);
        last = false;
      }
    }
    D[idx] = y[0];
    dD[idx] = y[1];
    est[idx] = sumErr + icError;
  }
  return {
    a: aList.slice(),
    D,
    dD,
    f: D.map((d, i) => dD[i] / d),
    error: est,
    steps,
    rtol,
    icError,
  };
}

/** Omega_m(a) of a parameter set (for the growth-index report). */
export function omegaMatter(params, a) {
  const { Om, Ode, w } = checkGrowthParameters(params);
  return makeBackground(Om, Ode, w).omegaM(a);
}

/** The cited fit, EH98 equations (A4) to (A6): D1 = a (5 Omega/2) {Omega^(4/7) - OmegaL + (1 + Omega/2)(1 + OmegaL/70)}^-1. */
export function cptGrowthFit({ Om, Ode }, a) {
  const z = 1 / a - 1;
  const R = 1 - Om - Ode;
  const den = Ode + R * (1 + z) ** 2 + Om * (1 + z) ** 3;
  const O = (Om * (1 + z) ** 3) / den;
  const OL = Ode / den;
  return ((1 / (1 + z)) * 2.5 * O) / (O ** (4 / 7) - OL + (1 + O / 2) * (1 + OL / 70));
}

// ------------------------------------------------------------------- shape
export function checkShapeParameters(p) {
  if (!p || typeof p !== 'object') refuse('bad-argument', 'parameters are required');
  parse(p, ['Om', 'Ob', 'h', 'ns', 'sigma8']);
  if (p.Om === undefined || p.Ob === undefined || p.h === undefined) refuse('bad-argument', 'Om, Ob and h are required');
  const ns = p.ns === undefined ? 1 : p.ns;
  const sigma8 = p.sigma8 === undefined ? 0.8 : p.sigma8;
  const { Om, Ob, h } = p;
  if (h < SHAPE_DOMAIN.h[0] || h > SHAPE_DOMAIN.h[1]) refuse('h-out-of-domain', 'h must lie in [0.3, 1.2]');
  const omh2 = Om * h * h;
  const obh2 = Ob * h * h;
  if (omh2 < SHAPE_DOMAIN.Omh2[0] || omh2 > SHAPE_DOMAIN.Omh2[1]) refuse('omega-m-h2', 'Om h^2 must lie in [0.025, 0.5]');
  if (obh2 < SHAPE_DOMAIN.Obh2Min) refuse('omega-b-h2', 'Ob h^2 must be at least 0.0125');
  if (Ob / Om > SHAPE_DOMAIN.baryonFractionMax) refuse('baryon-fraction', 'Ob/Om must be at most 0.5');
  if (ns < SHAPE_DOMAIN.ns[0] || ns > SHAPE_DOMAIN.ns[1]) refuse('ns-out-of-domain', 'ns must lie in [0.5, 1.5]');
  if (!(sigma8 > SHAPE_DOMAIN.sigma8[0]) || sigma8 > SHAPE_DOMAIN.sigma8[1]) refuse('sigma8-out-of-domain', 'sigma8 must lie in (0, 3]');
  return { Om, Ob, h, ns, sigma8, omh2, obh2 };
}

/** EH98 equation (29). */
export function transferZeroBaryon(q) {
  const L0 = Math.log(2 * Math.E + 1.8 * q);
  const C0 = 14.2 + 731 / (1 + 62.5 * q);
  return L0 / (L0 + C0 * q * q);
}

/** The shape function T(k) of EH98 (26), (28) to (31); k in h/Mpc. */
export function makeTransfer(p) {
  const { Om, Ob, h, omh2, obh2 } = checkShapeParameters(p);
  const s = (44.5 * Math.log(9.83 / omh2)) / Math.sqrt(1 + 10 * obh2 ** 0.75);
  const fb = Ob / Om;
  const ag = 1 - 0.328 * Math.log(431 * omh2) * fb + 0.38 * Math.log(22.3 * omh2) * fb * fb;
  return k => {
    if (!Number.isFinite(k)) refuse('not-finite', 'k is not finite');
    if (k < SHAPE_DOMAIN.k[0] || k > SHAPE_DOMAIN.k[1]) refuse('k-out-of-domain', 'k must lie in [1e-5, 1e4] h/Mpc');
    const ks = k * h * s;
    const geff = Om * h * (ag + (1 - ag) / (1 + (0.43 * ks) ** 4));
    return transferZeroBaryon((k * THETA * THETA) / geff);
  };
}

function window(x) {
  if (x < 1e-2) return 1 - (x * x) / 10;
  return (3 * (Math.sin(x) - x * Math.cos(x))) / x ** 3;
}

/**
 * Integral over ln k of delta2(k) W(kR)^2, k from kmin to kmax (h/Mpc), R in Mpc/h, on `panels` equal panels of
 * 152's adaptive quadrature with a tolerance of 1e-13 of a rough total as the absolute floor.
 */
export function varianceIntegral(R, delta2, { kmin = 1e-5, kmax = 1e4, panels = 200 } = {}) {
  if (!Number.isFinite(R)) refuse('not-finite', 'R is not finite');
  if (R < SHAPE_DOMAIN.R[0] || R > SHAPE_DOMAIN.R[1]) refuse('R-out-of-domain', 'R must lie in [0.1, 1000] Mpc/h');
  const f = lk => {
    const k = Math.exp(lk);
    return delta2(k) * window(k * R) ** 2;
  };
  const lo = Math.log(kmin);
  const hi = Math.log(kmax);
  const rough = Math.abs(gaussLegendre(f, lo, hi, panels));
  const abs = 1e-13 * rough;
  let sum = 0;
  let err = 0;
  let ok = true;
  for (let i = 0; i < panels; i++) {
    const r = adaptive(f, lo + ((hi - lo) * i) / panels, lo + ((hi - lo) * (i + 1)) / panels, { absTol: abs / panels, relTol: 1e-11 });
    sum += r.value;
    err += r.error;
    ok = ok && r.converged;
  }
  return { value: sum, error: err, converged: ok };
}

/** sigma(R) for the shape model normalised to sigma(8 Mpc/h) = sigma8 at a = 1, scaled by dRatio = D(a)/D(1). */
export function makeSigma(p) {
  const sp = checkShapeParameters(p);
  const T = makeTransfer(p);
  const shape = k => k ** (3 + sp.ns) * T(k) ** 2;
  const I8 = varianceIntegral(8, shape).value;
  const N = (sp.sigma8 * sp.sigma8) / I8;
  return (R, dRatio = 1) => Math.sqrt(N * varianceIntegral(R, shape).value) * dRatio;
}

// ------------------------------------------------------------------- Jeans
export function checkJeans({ cs, k }) {
  if (typeof cs !== 'number' || typeof k !== 'number') refuse('bad-argument', 'cs and k are required numbers');
  if (!Number.isFinite(cs) || !Number.isFinite(k)) refuse('not-finite', 'cs and k must be finite');
  if (!(cs > JEANS_DOMAIN.cs[0]) || cs > JEANS_DOMAIN.cs[1]) refuse('bad-sound-speed', 'cs must lie in (0, 100] km/s');
  if (!(k > JEANS_DOMAIN.k[0]) || k > JEANS_DOMAIN.k[1]) refuse('bad-wavenumber', 'k must lie in (0, 1e4] per Mpc');
}

/** k_J(a) = sqrt(3 Omega_m(a)/2) a E(a) H0 / c_s, in 1/Mpc (c_s km/s, H0 km/s/Mpc). */
export function jeansWavenumber(params, a, cs, H0 = 70) {
  const { Om, Ode, w } = checkGrowthParameters(params);
  if (!(cs > 0)) refuse('bad-sound-speed', 'cs must be positive');
  const bg = makeBackground(Om, Ode, w);
  return (Math.sqrt(1.5 * bg.omegaM(a)) * a * Math.sqrt(bg.e2(a)) * H0) / cs;
}

/** The scale factor at which k = k_J(a): the root of (kappa/(aE))^2 - 3 Omega_m(a)/2, kappa = c_s k / H0. */
export function jeansScaleFactor(params, { cs, k, H0 = 70 }) {
  checkJeans({ cs, k });
  const { Om, Ode, w } = checkGrowthParameters(params);
  const bg = makeBackground(Om, Ode, w);
  const kappa = (cs * k) / H0;
  const g = a => (kappa * kappa) / (a * a * bg.e2(a)) - 1.5 * bg.omegaM(a);
  return brent(g, 1e-6, 100, { xTol: 1e-14 }).x;
}
