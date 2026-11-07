// =============================================================================
// The CMB angular-scale gate prototype (Prompt 258 Part A): the sound horizon at recombination, the
// angular diameter distance, theta_star = r_s / D_M, the peak relation, a bounded peak fit with
// not-constrained refusals, the nearest grid node and the claim rule. SPIKE ONLY: this file is never merged
// (7.5 rule 4); the record of what it measured is CMB_SCALE_GATE.md and tests/fixtures/cmb-scale/.
// Nothing here is a fitting formula: z_star and the peak offset are inputs. No function maps a spectrum to a
// cosmological parameter through a grid.
//
//   r_s(z*)  = Int_0^{a*} c_s c da / (a^2 H),   c_s = 1/sqrt(3 (1 + R)),   R = (3 omegaB / (4 omegaGamma)) a
//   theta*   = r_s / D_M(z*),  ell_A = pi / theta*,  ell_1 = ell_A (1 - phi_1)
// =============================================================================

import { adaptive } from '../../../numeric/quadrature.js';
import { polyfit } from '../../../numeric/polyfit.js';
import { createFriedmann, checkParameters } from '../late/index.js';
import { C_KMS } from '../flrw.js';

const { Math, Number } = globalThis;
const EPS = Number.EPSILON;

export class CmbDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CmbDomainError';
    this.code = code;
  }
}
const refuse = (code, message) => {
  throw new CmbDomainError(code, message);
};

// ------------------------------------------------------------------ radiation
const K_B = 1.380649e-23;
const H_PLANCK = 6.62607015e-34;
const HBAR = H_PLANCK / (2 * Math.PI);
const C_SI = 299792458;
const MPC_M = 3.0856775814913673e22;
const E_CHARGE = 1.602176634e-19;
export const NU_FACTOR = (7 / 8) * Math.pow(4 / 11, 4 / 3);

/** omegaGamma = Omega_gamma h^2 and omegaRad = Omega_r h^2 (photons plus massless neutrinos) from T, Neff and G. */
export function radiation({ T, Neff, G }) {
  const rhoG = ((Math.PI ** 2) / 15) * Math.pow(K_B * T, 4) / Math.pow(HBAR * C_SI, 3) / (C_SI * C_SI);
  const h100 = (100 * 1e3) / MPC_M;
  const rhoC = (3 * h100 * h100) / (8 * Math.PI * G);
  const omegaGamma = rhoG / rhoC;
  return { omegaGamma, omegaRad: omegaGamma * (1 + NU_FACTOR * Neff) };
}

// ------------------------------------------------------------------ domain
/** Validate in the committed order; the 255 kernel's parameter codes are passed through. */
export function checkRecombination(p) {
  const nums = [p.H0, p.Om, p.Or, p.w, p.omegaGamma, p.omegaB, p.zstar];
  if (p.phi !== undefined) nums.push(p.phi);
  if (p.Ode !== 'flat' && p.Ode !== undefined) nums.push(p.Ode);
  if (!nums.every(v => typeof v === 'number' && Number.isFinite(v))) refuse('not-finite', 'every input must be a finite number');
  let n;
  try {
    n = checkParameters({ H0: p.H0, Om: p.Om, Or: p.Or, w: p.w, Ode: p.Ode === 'flat' ? undefined : p.Ode });
  } catch (e) {
    if (e && e.code) refuse(e.code, e.message);
    throw e;
  }
  if (!(p.Or > 0) || !(p.omegaGamma > 0)) refuse('no-radiation', 'the sound horizon needs a radiation density');
  const h = p.H0 / 100;
  if (!(p.omegaB > 0) || !(p.omegaB / (h * h) < p.Om)) refuse('bad-baryons', 'omegaB must be positive and Omega_b below Omega_m');
  if (p.zstar < 800 || p.zstar > 1500) refuse('bad-recombination-redshift', 'z_star must lie in [800, 1500], the design domain of this integral');
  if (p.phi !== undefined && (p.phi < 0 || p.phi > 0.5)) refuse('bad-offset', 'the peak offset phi_1 must lie in [0, 0.5]');
  return n;
}

const kernelParams = p => ({ H0: p.H0, Om: p.Om, Or: p.Or, w: p.w, ...(p.Ode === 'flat' || p.Ode === undefined ? {} : { Ode: p.Ode }) });

// ------------------------------------------------------------------ the sound horizon and D_M
/** The comoving sound horizon at z_star in Mpc, with the integrator's error estimate. */
export function soundHorizon(p) {
  const n = checkRecombination(p);
  const { Om, Or, Ode, w, Ok } = n;
  const b = (3 * p.omegaB) / (4 * p.omegaGamma);
  const as = 1 / (1 + p.zstar);
  const pe = 1 - 3 * w;
  const f = t => {
    const a = as * t * t;
    const d = Om * a + Or + Ok * a * a + Ode * Math.pow(a, pe);
    return (2 * as * t) / (Math.sqrt(3 * (1 + b * a)) * Math.sqrt(d));
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

/** D_M(z_star) in Mpc from the 255 kernel (radiation included, curvature by sinh or sin), refusing beyond the antipode. */
export function comovingDistance(p) {
  checkRecombination(p);
  const F = createFriedmann(kernelParams(p));
  const q = F.quantity('transverse', p.zstar);
  return { value: q.value, error: q.error };
}

/** theta_star = r_s / D_M, ell_A = pi / theta_star, and ell_1 when phi_1 is given. */
export function acousticScale(p) {
  const rs = soundHorizon(p);
  const dm = comovingDistance(p);
  const theta = rs.value / dm.value;
  const out = { rs: rs.value, DM: dm.value, theta, ellA: Math.PI / theta, error: theta * (rs.error / rs.value + dm.error / dm.value) };
  if (p.phi !== undefined) out.ell1 = peakMultipole({ theta, phi: p.phi });
  return out;
}

/** ell_1 = pi (1 - phi_1) / theta_star. */
export function peakMultipole({ theta, phi }) {
  if (!(theta > 0) || !Number.isFinite(theta)) refuse('not-finite', 'theta_star must be a positive finite number');
  if (!(phi >= 0 && phi <= 0.5)) refuse('bad-offset', 'the peak offset phi_1 must lie in [0, 0.5]');
  return (Math.PI * (1 - phi)) / theta;
}

/** theta_star = pi (1 - phi_1) / ell_1: the angular scale a measured first-peak position gives under a stated offset. */
export function thetaFromPeak({ ell1, phi }) {
  if (!(ell1 > 0) || !Number.isFinite(ell1)) refuse('not-finite', 'ell_1 must be a positive finite number');
  if (!(phi >= 0 && phi <= 0.5)) refuse('bad-offset', 'the peak offset phi_1 must lie in [0, 0.5]');
  return (Math.PI * (1 - phi)) / ell1;
}

// ------------------------------------------------------------------ one massive neutrino by its Fermi-Dirac density
const I0 = (7 * Math.PI ** 4) / 120;
const FD_PIECES = [0, 1, 4, 12, 30, 80];
function fdRatio(y) {
  const g = x => (x * x * Math.sqrt(x * x + y * y)) / (Math.exp(x) + 1);
  let s = 0;
  for (let k = 0; k < FD_PIECES.length - 1; k++) {
    const r = adaptive(g, FD_PIECES[k], FD_PIECES[k + 1], { absTol: 0, relTol: 1e-13, maxDepth: 30 });
    if (!r.converged) refuse('not-converged', 'the Fermi-Dirac quadrature did not converge');
    s += r.value;
  }
  return s / I0;
}

/**
 * r_s, D_M and theta_star in a flat model with three species of weight Neff/3, one of mass mnuEv (Fermi-Dirac
 * density), two massless, T_nu = (4/11)^(1/3) T; matter = omega_b + omega_c; the cosmological constant closes flatness.
 */
export function massiveNuModel({ wb, wc, H0, zstar, mnuEv, T, Neff, G }) {
  const h = H0 / 100;
  const rad = radiation({ T, Neff: 0, G });
  const OG = rad.omegaGamma;
  const kappa = (NU_FACTOR * Neff) / 3;
  const ktNu = (K_B * Math.pow(4 / 11, 1 / 3) * T) / E_CHARGE;
  const y0 = mnuEv / ktNu;
  const wm = wb + wc;
  const wrel0 = OG * (1 + 2 * kappa);
  const wL = h * h - wm - wrel0 - OG * kappa * fdRatio(y0);
  const b = (3 * wb) / (4 * OG);
  const as = 1 / (1 + zstar);
  const d = a => wm * a + wrel0 + OG * kappa * fdRatio(y0 * a) + wL * Math.pow(a, 4);
  const fr = t => {
    const a = as * t * t;
    return (2 * as * t) / (Math.sqrt(3 * (1 + b * a)) * Math.sqrt(d(a)));
  };
  const pts = [0, 0.1, 0.3, 0.6, 1];
  let rs = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const r = adaptive(fr, pts[k], pts[k + 1], { absTol: 0, relTol: 1e-12, maxDepth: 20 });
    if (!r.converged) refuse('not-converged', 'the quadrature did not converge');
    rs += r.value;
  }
  rs *= C_KMS / 100;
  const g = u => Math.exp(u) / Math.sqrt(d(Math.exp(u)));
  const dm = adaptive(g, Math.log(as), 0, { absTol: 0, relTol: 1e-12, maxDepth: 25 });
  if (!dm.converged) refuse('not-converged', 'the quadrature did not converge');
  const DM = (C_KMS / 100) * dm.value;
  return { rs, DM, theta: rs / DM, theta100: (100 * rs) / DM, y0, wL };
}

// ------------------------------------------------------------------ the bounded peak fit
export const PEAK_WINDOW = 75;
/**
 * A weighted quadratic in a window of +-75 multipoles about the largest bin, the apex and its delta-method
 * interval, refusing as not-constrained (no apex, no interval) with a code.
 * @returns {{constrained: boolean, code: ?string, apex?: number, sigma?: number, curvatureSigma?: number, bins?: number}}
 * @throws {CmbDomainError} for an input refusal (not-finite, bad-sigma, not-sorted, length-mismatch, empty, bad-window)
 */
export function fitPeak({ ell, D, sigma }) {
  const n0 = ell.length;
  if (n0 === 0) refuse('empty', 'no bins');
  if (D.length !== n0 || sigma.length !== n0) refuse('length-mismatch', 'ell, D and sigma must have the same length');
  for (let i = 0; i < n0; i++) if (!Number.isFinite(ell[i]) || !Number.isFinite(D[i]) || !Number.isFinite(sigma[i])) refuse('not-finite', 'every bin must be finite');
  for (let i = 0; i < n0; i++) if (!(sigma[i] > 0)) refuse('bad-sigma', 'every sigma must be positive');
  for (let i = 1; i < n0; i++) if (!(ell[i] > ell[i - 1])) refuse('not-sorted', 'bin centres must be strictly increasing');
  if (n0 === 1) refuse('bad-window', 'a single bin has no window');
  let k = 0;
  for (let i = 1; i < n0; i++) if (D[i] > D[k]) k = i;
  const idx = [];
  for (let i = 0; i < n0; i++) if (Math.abs(ell[i] - ell[k]) <= PEAK_WINDOW) idx.push(i);
  const bins = idx.length;
  if (bins < 5) return { constrained: false, code: 'too-few-bins', bins };
  const f = polyfit(idx.map(i => ell[i]), idx.map(i => D[i]), 2, { sigma: idx.map(i => sigma[i]) });
  if (!f) return { constrained: false, code: 'no-curvature', bins };
  const [a, b, c] = f.coefficients;
  const sc = Math.sqrt(f.covariance[2][2]);
  const curvatureSigma = c / sc;
  if (c >= 0 || curvatureSigma > -5) return { constrained: false, code: 'no-curvature', bins, curvatureSigma };
  const ts = -b / (2 * c);
  const apex = f.center + f.halfWidth * ts;
  if (Math.abs((apex - ell[k]) / PEAK_WINDOW) > 1) return { constrained: false, code: 'apex-outside-window', bins, curvatureSigma };
  const g = [0, -1 / (2 * c), b / (2 * c * c)];
  const V = f.covariance;
  let q = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) q += g[i] * V[i][j] * g[j];
  const sig = f.halfWidth * Math.sqrt(q);
  if (2 * sig > 2 * PEAK_WINDOW) return { constrained: false, code: 'interval-too-wide', bins, curvatureSigma };
  void a;
  return { constrained: true, code: null, apex, sigma: sig, curvatureSigma, bins };
}

// ------------------------------------------------------------------ the comparison surface: the nearest node
/**
 * The index of the grid node nearest to `point` on every axis (normalised by the axis range, ties to the lower
 * index), refusing a point outside an axis with code outside-domain. It returns node indices only: nothing here
 * reads a parameter from a spectrum.
 */
export function nearestNode(axes, point) {
  if (!Array.isArray(point) || point.length !== axes.length || !point.every(Number.isFinite)) refuse('not-finite', 'a point needs a finite value on every axis');
  const idx = [];
  for (let j = 0; j < axes.length; j++) {
    const v = axes[j].values;
    const lo = v[0];
    const hi = v[v.length - 1];
    const x = point[j];
    if (x < lo || x > hi) refuse('outside-domain', `${axes[j].name} = ${x} is outside the grid (${lo} to ${hi})`);
    const range = hi - lo;
    let best = Infinity;
    let bi = 0;
    for (let i = 0; i < v.length; i++) {
      const dd = Math.abs(x - v[i]) / range;
      if (dd < best) {
        best = dd;
        bi = i;
      }
    }
    idx.push(bi);
  }
  return idx;
}

// ------------------------------------------------------------------ the claim rule
const GRID_WORDS = ['grid', 'nearest spectrum', 'closest spectrum', 'closest model', 'closest curve', 'looks closest', 'look closest', 'best-matching spectrum', 'best matching spectrum', 'best-matching model', 'rejilla', 'cuadricula', 'cuadrícula', 'espectro mas cercano', 'espectro más cercano', 'espectro mas parecido', 'espectro más parecido', 'se parece mas', 'se parece más'];
const READ_WORDS = ['H0', 'Hubble constant', 'constante de Hubble', 'composition', 'composicion', 'composición', 'baryon density', 'densidad barionica', 'densidad bariónica', 'matter density', 'densidad de materia', 'dark matter', 'materia oscura', 'Omega_m', 'Omega m', 'omega_b', 'omega_c'];
const NEG_WORDS = ['not', 'never', 'cannot', "can't", 'does not', "doesn't", 'no', 'nunca', 'jamas', 'jamás', 'sin', 'ni', 'no se'];
const rx = words => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...words].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}_])`, 'iu');
const RX_GRID = rx(GRID_WORDS);
const RX_READ = rx(READ_WORDS);
const RX_NEG = rx(NEG_WORDS);

/** The sentences of `text` that read a Hubble constant or a composition from a grid (empty when the text is clean). */
export function claimViolations(text) {
  return String(text)
    .split(/[.!?;\n]+/)
    .filter(s => RX_GRID.test(s) && RX_READ.test(s) && !RX_NEG.test(s));
}
