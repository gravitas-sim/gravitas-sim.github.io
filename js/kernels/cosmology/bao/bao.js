// =============================================================================
// The BAO gate prototype (Prompt 257 Part A): sound horizon, distance ratios, the profile likelihood and the
// pair counter. SPIKE ONLY: this file is never merged (7.5 rule 4); the record of what it measured is
// BAO_GATE.md and tests/fixtures/bao/. Nothing here is a fitting formula: the drag redshift is an input.
//
//   r_s(z_d) = Int_0^{a_d} c_s c da / (a^2 H),   c_s = 1/sqrt(3 (1 + R)),   R = (3 omegaB / (4 omegaGamma)) a
//   a^2 H    = H0 sqrt(Om a + Or + Ok a^2 + Ode a^(1 - 3 w))
//   D_V      = (z D_H D_M^2)^(1/3),  D_H = c/H(z);   observables are the ratios D/r_d
//   model    = theta b(Om), theta = c/(H0 r_d) profiled analytically; flat Lambda-CDM, Or = 0 in the likelihood
// =============================================================================

import { adaptive } from '../../../numeric/quadrature.js';
import { brent } from '../../../numeric/roots.js';
import { cholesky, invertSpd } from '../../../numeric/linalg.js';
import { gammaQ } from '../../statistics/special.js';
import { createFriedmann, checkParameters } from '../late/index.js';
import { C_KMS } from '../flrw.js';

const { Math, Number } = globalThis;
const EPS = Number.EPSILON;

export class BaoDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BaoDomainError';
    this.code = code;
  }
}
const refuse = (code, message) => {
  throw new BaoDomainError(code, message);
};

// ------------------------------------------------------------------ radiation
const K_B = 1.380649e-23;
const H_PLANCK = 6.62607015e-34;
const HBAR = H_PLANCK / (2 * Math.PI);
const C_SI = 299792458;
const MPC_M = 3.0856775814913673e22;
export const NU_FACTOR = (7 / 8) * Math.pow(4 / 11, 4 / 3);

/** omegaGamma = Omega_gamma h^2 and omegaRad = Omega_r h^2 (photons plus massless neutrinos) from T, Neff and G. */
export function radiation({ T, Neff, G }) {
  const rhoG = (Math.PI ** 2 / 15) * Math.pow(K_B * T, 4) / Math.pow(HBAR * C_SI, 3) / (C_SI * C_SI);
  const h100 = (100 * 1e3) / MPC_M;
  const rhoC = (3 * h100 * h100) / (8 * Math.PI * G);
  const omegaGamma = rhoG / rhoC;
  return { omegaGamma, omegaRad: omegaGamma * (1 + NU_FACTOR * Neff) };
}

// ------------------------------------------------------------------ the sound horizon
const dropOde = p => ({ ...p, Ode: p.Ode === 'flat' ? undefined : p.Ode });

/**
 * Validate the inputs of the sound horizon in the committed order and return the normalised set.
 * @throws {BaoDomainError} with a code; the 255 kernel's own codes are passed through
 */
export function checkSoundHorizon(p) {
  const nums = [p.H0, p.Om, p.Or, p.w, p.omegaGamma, p.omegaB, p.zd];
  if (p.Ode !== 'flat' && p.Ode !== undefined) nums.push(p.Ode);
  if (!nums.every(v => typeof v === 'number' && Number.isFinite(v)))
    refuse('not-finite', 'every input must be a finite number');
  let n;
  try {
    n = checkParameters({ H0: p.H0, Om: p.Om, Or: p.Or, w: p.w, Ode: dropOde(p).Ode });
  } catch (e) {
    if (e && e.code) refuse(e.code, e.message);
    throw e;
  }
  if (!(p.Or > 0) || !(p.omegaGamma > 0))
    refuse('no-radiation', 'the sound horizon needs a radiation density');
  const h = p.H0 / 100;
  if (!(p.omegaB > 0) || !(p.omegaB / (h * h) < p.Om))
    refuse('bad-baryons', 'omegaB must be positive and Omega_b below Omega_m');
  if (p.zd < 500 || p.zd > 3000)
    refuse('bad-drag-redshift', 'z_d must lie in [500, 3000], the design domain of this integral');
  return n;
}

/** The comoving sound horizon at z_d in Mpc, with the integrator's error estimate. */
export function soundHorizon(p) {
  const n = checkSoundHorizon(p);
  const { Om, Or, Ode, w, Ok } = n;
  const b = (3 * p.omegaB) / (4 * p.omegaGamma);
  const ad = 1 / (1 + p.zd);
  const pe = 1 - 3 * w;
  const f = t => {
    const a = ad * t * t;
    const d = Om * a + Or + Ok * a * a + Ode * Math.pow(a, pe);
    return (2 * ad * t) / (Math.sqrt(3 * (1 + b * a)) * Math.sqrt(d));
  };
  const pts = [0, 0.1, 0.3, 0.6, 1];
  let value = 0;
  let error = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const r = adaptive(f, pts[k], pts[k + 1], { absTol: 0, relTol: 1e-12, maxDepth: 20 });
    if (!r.converged || !Number.isFinite(r.value)) refuse('not-converged', 'the quadrature did not converge');
    value += r.value;
    error += r.error;
  }
  const pre = C_KMS / p.H0;
  return { value: pre * value, error: pre * (error + 8 * EPS * Math.abs(value)) };
}

// ------------------------------------------------------------------ distance ratios
/** D_M, D_H and D_V in Mpc at z from a Friedmann object of the 255 kernel. */
export function distances(F, z) {
  const DM = F.transverseComovingDistance(z);
  const DH = C_KMS / F.hubbleParameter(z);
  return { DM, DH, DV: Math.cbrt(z * DH * DM * DM) };
}

// ------------------------------------------------------------------ the profile likelihood
const OM_FROM = 0.02;
const OM_STEP = 0.001;
export const NODES = Array.from({ length: 961 }, (_, k) => OM_FROM + OM_STEP * k);
export const CORR = -0.4;

/** theta-free basis of flat Lambda-CDM (Or = 0) at Om: for each z, [D_M H0/c, D_H H0/c]. */
export function basisFlat(Om, zs) {
  const F = createFriedmann({ H0: 100, Om, Or: 0 });
  const out = [];
  for (const z of zs) {
    out.push((F.transverseComovingDistance(z) * 100) / C_KMS, 1 / F.E(z));
  }
  return out;
}

/** The design covariance: sigma = frac x |mean|, correlation CORR within each (D_M, D_H) pair. */
export function designCovariance(mean, frac) {
  const m = mean.length;
  const sig = mean.map((v, i) => frac[i] * Math.abs(v));
  const C = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) C[i][i] = sig[i] * sig[i];
  for (let k = 0; k < m / 2; k++) {
    const i = 2 * k;
    const j = i + 1;
    C[i][j] = C[j][i] = CORR * sig[i] * sig[j];
  }
  return C;
}

/** Input checks of the likelihood, in the committed order: returns null or a refusal code. */
export function checkInputs(d, C, nParams = 2) {
  if (!Array.isArray(C) || C.length !== d.length || !C.every(r => Array.isArray(r) && r.length === d.length))
    return 'bad-argument';
  if (!d.every(Number.isFinite) || !C.every(r => r.every(Number.isFinite))) return 'not-finite';
  let big = 0;
  for (const r of C) for (const v of r) big = Math.max(big, Math.abs(v));
  let asym = 0;
  for (let i = 0; i < d.length; i++) for (let j = 0; j < d.length; j++) asym = Math.max(asym, Math.abs(C[i][j] - C[j][i]));
  if (asym > 1e-9 * big) return 'bad-covariance';
  if (!cholesky(C)) return 'bad-covariance';
  if (d.length <= nParams) return 'underdetermined';
  return null;
}

// Brent between a node outside the set and the first node inside; a node that is inside by rounding only is the end point
const root = (g, a, b) => (g(b) > 0 || g(a) < 0 ? b : brent(g, a, b, { xTol: 1e-14 }).x);

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const matVec = (M, v) => M.map(r => dot(r, v));

export function createProfile({ zs, covariance }) {
  const Ci = invertSpd(covariance);
  const B = NODES.map(o => basisFlat(o, zs));
  const BCi = B.map(b => matVec(Ci, b));
  const v = B.map((b, i) => dot(b, BCi[i]));
  const chi2Nodes = d => {
    const Cid = matVec(Ci, d);
    const dCd = dot(d, Cid);
    const ch = new Array(NODES.length);
    const th = new Array(NODES.length);
    for (let i = 0; i < NODES.length; i++) {
      const u = dot(B[i], Cid);
      ch[i] = dCd - (u * u) / v[i];
      th[i] = u / v[i];
    }
    return { ch, th };
  };
  const chi2At = (d, Om) => {
    const b = basisFlat(Om, zs);
    const Cid = matVec(Ci, d);
    const u = dot(b, Cid);
    return dot(d, Cid) - (u * u) / dot(b, matVec(Ci, b));
  };
  const argmin = ch => ch.reduce((bi, c, i) => (c < ch[bi] ? i : bi), 0);
  const edges = (d, ch, i, delta) => {
    const thr = ch[i] + delta;
    let loI = -1;
    let hiI = -1;
    for (let k = 0; k < ch.length; k++)
      if (ch[k] <= thr) {
        if (loI < 0) loI = k;
        hiI = k;
      }
    const g = o => chi2At(d, o) - thr;
    const lo = loI === 0 ? null : root(g, NODES[loI - 1], NODES[loI]);
    const hi = hiI === NODES.length - 1 ? null : root(g, NODES[hiI + 1], NODES[hiI]);
    return { lo, hi, open: lo === null || hi === null };
  };
  return {
    Ci,
    zs,
    chi2At,
    chi2Nodes,
    fit(d) {
      const { ch, th } = chi2Nodes(d);
      const i = argmin(ch);
      const res = { chi2min: ch[i], bestOm: NODES[i], theta: th[i], index: i, p: gammaQ((d.length - 2) / 2, ch[i] / 2) };
      for (const [name, delta] of [['68', 1], ['95', 4]]) {
        const e = edges(d, ch, i, delta);
        res['lo' + name] = e.lo;
        res['hi' + name] = e.hi;
        res['open' + name] = e.open;
      }
      return res;
    },
    /** Joint fit with a second chi-square on the nodes (the product of likelihoods). */
    joint(d, other) {
      const { ch } = chi2Nodes(d);
      const j = ch.map((c, i) => c + other(NODES[i]));
      const i = argmin(j);
      const thr = j[i] + 1;
      let loI = -1;
      let hiI = -1;
      for (let k = 0; k < j.length; k++)
        if (j[k] <= thr) {
          if (loI < 0) loI = k;
          hiI = k;
        }
      const g = o => chi2At(d, o) + other(o) - thr;
      return {
        bestOm: NODES[i],
        chi2min: j[i],
        lo68: loI === 0 ? null : root(g, NODES[loI - 1], NODES[loI]),
        hi68: hiI === NODES.length - 1 ? null : root(g, NODES[hiI + 1], NODES[hiI]),
        sum: j,
        bao: ch,
      };
    },
  };
}

/** One ensemble: coverage of the true Om at delta 1 and 4, the open and poor-fit fractions. */
export function runEnsemble(profile, mean, covariance, gauss, n, OmTrue) {
  const L = cholesky(covariance);
  const m = mean.length;
  let c68 = 0;
  let c95 = 0;
  let open = 0;
  let poor = 0;
  let violation = false;
  for (let k = 0; k < n; k++) {
    const z = Array.from({ length: m }, () => gauss());
    const d = mean.map((mu, i) => {
      let s = 0;
      for (let j = 0; j <= i; j++) s += L[i][j] * z[j];
      return mu + s;
    });
    const { ch } = profile.chi2Nodes(d);
    const i = ch.reduce((bi, c, q) => (c < ch[bi] ? q : bi), 0);
    const at = profile.chi2At(d, OmTrue);
    if (at <= ch[i] + 1) c68++;
    if (at <= ch[i] + 4) c95++;
    let loI = -1;
    let hiI = -1;
    for (let q = 0; q < ch.length; q++)
      if (ch[q] <= ch[i] + 1) {
        if (loI < 0) loI = q;
        hiI = q;
      }
    const isOpen = loI === 0 || hiI === ch.length - 1;
    if (isOpen) open++;
    if (gammaQ((m - 2) / 2, ch[i] / 2) < 0.0027) poor++;
    // a finite two-sided number must never be reported for an open set: fit() returns null on the open side
    const f = isOpen ? profile.fit(d) : null;
    if (f && !(f.lo68 === null || f.hi68 === null)) violation = true;
  }
  return { n, cover68: c68 / n, cover95: c95 / n, openFraction: open / n, poorFitFraction: poor / n, violation };
}

// ------------------------------------------------------------------ pair counts and the estimator
export const EDGES = Array.from({ length: 13 }, (_, k) => 40 + 10 * k);
export const NBINS = 12;
export const NB = 12;

/** Cartesian positions in Mpc/h from RA (deg), a comoving distance in Mpc and a fixed declination. */
export function positions(ra, dist, h, decDeg) {
  const dec = (decDeg * Math.PI) / 180;
  const n = ra.length;
  const X = new Float64Array(n);
  const Y = new Float64Array(n);
  const Z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const D = dist[i] * h;
    const a = (ra[i] * Math.PI) / 180;
    X[i] = D * Math.cos(dec) * Math.cos(a);
    Y[i] = D * Math.cos(dec) * Math.sin(a);
    Z[i] = D * Math.sin(dec);
  }
  return { X, Y, Z, n };
}

export const blockOf = ra => ra.map(r => Math.min(Math.floor((r - 120) / 10), NB - 1));

const LO2 = EDGES[0] * EDGES[0];
const HI2 = EDGES[EDGES.length - 1] * EDGES[EDGES.length - 1];

/** Unordered pairs within one catalog: counts[(min block * NB + max block) * NBINS + bin]. */
export function pairsSelf(P, blk) {
  const counts = new Float64Array(NB * NB * NBINS);
  const { X, Y, Z, n } = P;
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    const yi = Y[i];
    const zi = Z[i];
    const bi = blk[i];
    for (let j = i + 1; j < n; j++) {
      const dx = xi - X[j];
      const dy = yi - Y[j];
      const dz = zi - Z[j];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < LO2 || d2 >= HI2) continue;
      const bin = Math.floor((Math.sqrt(d2) - EDGES[0]) / 10);
      const bj = blk[j];
      const a = bi < bj ? bi : bj;
      const b = bi < bj ? bj : bi;
      counts[(a * NB + b) * NBINS + bin]++;
    }
  }
  return counts;
}

/** Pairs between two catalogs: counts[(block1 * NB + block2) * NBINS + bin]. */
export function pairsCross(P1, blk1, P2, blk2) {
  const counts = new Float64Array(NB * NB * NBINS);
  for (let i = 0; i < P1.n; i++) {
    const xi = P1.X[i];
    const yi = P1.Y[i];
    const zi = P1.Z[i];
    const bi = blk1[i];
    for (let j = 0; j < P2.n; j++) {
      const dx = xi - P2.X[j];
      const dy = yi - P2.Y[j];
      const dz = zi - P2.Z[j];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < LO2 || d2 >= HI2) continue;
      counts[(bi * NB + blk2[j]) * NBINS + Math.floor((Math.sqrt(d2) - EDGES[0]) / 10)]++;
    }
  }
  return counts;
}

const totals = counts => {
  const t = new Array(NBINS).fill(0);
  for (let c = 0; c < NB * NB; c++) for (let b = 0; b < NBINS; b++) t[b] += counts[c * NBINS + b];
  return t;
};
/** The counts with every pair that involves block k removed (upper-triangle storage when `tri`, full otherwise). */
const without = (counts, k) => {
  const t = new Array(NBINS).fill(0);
  for (let a = 0; a < NB; a++)
    for (let b = 0; b < NB; b++) {
      if (a === k || b === k) continue;
      for (let q = 0; q < NBINS; q++) t[q] += counts[(a * NB + b) * NBINS + q];
    }
  return t;
};

export const landySzalay = (DD, DR, RR, nd, nr) =>
  DD.map((dd, i) => {
    const ddn = dd / ((nd * (nd - 1)) / 2);
    const drn = DR[i] / (nd * nr);
    const rrn = RR[i] / ((nr * (nr - 1)) / 2);
    return (ddn - 2 * drn + rrn) / rrn;
  });

/** Full estimate with the delete-one block jackknife. */
export function correlation({ DDc, DRc, RRc, nd, nr, ndBlock, nrBlock }) {
  const DD = totals(DDc);
  const DR = totals(DRc);
  const RR = totals(RRc);
  const xi = landySzalay(DD, DR, RR, nd, nr);
  const reps = [];
  for (let k = 0; k < NB; k++)
    reps.push(landySzalay(without(DDc, k), without(DRc, k), without(RRc, k), nd - ndBlock[k], nr - nrBlock[k]));
  const sigma = xi.map((_, q) => {
    const mean = reps.reduce((s, r) => s + r[q], 0) / NB;
    return Math.sqrt(((NB - 1) / NB) * reps.reduce((s, r) => s + (r[q] - mean) ** 2, 0));
  });
  return { DD, DR, RR, xi, sigma };
}

/** The committed detectability rule: weighted straight line in log10 s outside the window, S/N in the window. */
export function peakSignificance(xi, sigma) {
  const centres = EDGES.slice(0, -1).map(e => e + 5);
  const inWin = centres.map(c => c >= 90 && c < 130);
  if (!sigma.every(s => Number.isFinite(s) && s > 0) || !xi.every(Number.isFinite))
    return { refused: true, sn: null, maxWindowSN: NaN };
  let s00 = 0;
  let s01 = 0;
  let s11 = 0;
  let t0 = 0;
  let t1 = 0;
  centres.forEach((c, i) => {
    if (inWin[i]) return;
    const w = 1 / sigma[i] ** 2;
    const x = Math.log10(c);
    s00 += w;
    s01 += w * x;
    s11 += w * x * x;
    t0 += w * xi[i];
    t1 += w * x * xi[i];
  });
  const det = s00 * s11 - s01 * s01;
  const alpha = (s11 * t0 - s01 * t1) / det;
  const beta = (s00 * t1 - s01 * t0) / det;
  const smooth = centres.map(c => alpha + beta * Math.log10(c));
  const sn = xi.map((x, i) => (x - smooth[i]) / sigma[i]);
  return { refused: false, smooth, fit: [alpha, beta], sn, maxWindowSN: Math.max(...sn.filter((_, i) => inWin[i])) };
}
