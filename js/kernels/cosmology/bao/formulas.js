// =============================================================================
// The follow-up prototype of Prompt 257 (the authentic legs): the Eisenstein and Hu 1998 fitting formulas and the sound
// horizon with one massive neutrino. SPIKE ONLY, never merged (7.5 rule 4). Every coefficient is READ from
// tests/fixtures/bao/authentic/fitting-formulas.json (transcribed by script); none is typed here. The structure of
// each equation (which coefficient multiplies what) follows the printed equations (pdf pages 4, 5 and 12).
// =============================================================================

import { adaptive } from '../../../numeric/quadrature.js';
import { BaoDomainError, radiation, soundHorizon } from './bao.js';
import { C_KMS } from '../flrw.js';

const { Math, Number } = globalThis;

const K_B = 1.380649e-23;
const E_CHARGE = 1.602176634e-19;

/** @param {object} coefficients the `coefficients` block of fitting-formulas.json */
export function createFormulas(coefficients) {
  const V = k => coefficients[k].value;
  const X = k => coefficients[k].exponent;
  const dom = {
    w0: [V('domain.omega0h2.lower'), V('domain.omega0h2.upper')],
    wb: [V('domain.omegaBh2.lower'), V('domain.omegaBh2.upperForDragEpoch')],
  };

  /** The refusal code of the stated domain, in the committed order, or null. */
  const decide = (w0, wb) => {
    if (!Number.isFinite(w0) || !Number.isFinite(wb)) return 'not-finite';
    if (w0 < dom.w0[0]) return 'omega0-below-domain';
    if (w0 > dom.w0[1]) return 'omega0-above-domain';
    if (wb < dom.wb[0]) return 'omegab-below-domain';
    if (wb > dom.wb[1]) return 'omegab-above-domain';
    return null;
  };
  const guard = (w0, wb) => {
    const code = decide(w0, wb);
    if (code) throw new BaoDomainError(code, `(omega0, omega_b) = (${w0}, ${wb}) is outside the stated domain of the formula`);
  };

  /** Equation (4): the drag redshift. */
  const zd = (w0, wb) => {
    guard(w0, wb);
    const b1 = V('b1.a') * Math.pow(w0, V('b1.exponentOfOmega0h2')) * (1 + V('b1.bracketCoefficient') * Math.pow(w0, V('b1.bracketExponent')));
    const b2 = V('b2.a') * Math.pow(w0, V('b2.exponentOfOmega0h2'));
    return (V('zd.a') * Math.pow(w0, V('zd.exponentOfOmega0h2'))) / (1 + V('zd.denominatorCoefficient') * Math.pow(w0, V('zd.denominatorExponent'))) * (1 + b1 * Math.pow(wb, b2));
  };

  /** Equation (26): the sound horizon in Mpc as a function of omega0 and omega_b alone. */
  const s26 = (w0, wb) => {
    guard(w0, wb);
    return (V('s26.a') * Math.log(V('s26.lnArgument') / w0)) / Math.sqrt(1 + V('s26.denominatorCoefficient') * Math.pow(wb, V('s26.denominatorExponent')));
  };

  const theta = () => V('T.cobe') / 2.7; // Theta_2.7 = the paper's COBE temperature over 2.7 K

  /** Equation (6) with (2), (3) and (5); the three printed constants can be overridden for the propagation of their rounding. */
  const s6 = (w0, wb, z, over = {}) => {
    const aR = over.aR ?? V('R.a');
    const mz = over.mz ?? V('zeq.mantissa');
    const mk = over.mk ?? V('keq.mantissa');
    const th = theta();
    const zeq = mz * Math.pow(10, X('zeq.power10')) * w0 * Math.pow(th, -4);
    const keq = mk * Math.pow(10, X('keq.power10')) * w0 * Math.pow(th, -2);
    const R = zz => aR * wb * Math.pow(th, -4) / (zz / Math.pow(10, X('R.zScale.power10')));
    const Rd = R(z);
    const Req = R(zeq);
    const value = ((2 / (3 * keq)) * Math.sqrt(6 / Req)) * Math.log((Math.sqrt(1 + Rd) + Math.sqrt(Rd + Req)) / (1 + Math.sqrt(Req)));
    return { value, zeq };
  };

  return { decide, zd, s26, s6, theta, domain: dom, V, X };
}

/** Half a unit of the last printed digit of a token such as '31.5'. */
export const halfUnit = token => 0.5 * Math.pow(10, -((String(token).split('.')[1] || '').length));
export const unitOf = token => Math.pow(10, -((String(token).split('.')[1] || '').length));

// ------------------------------------------------------------------ the integral in the paper's model
/** The sound horizon in the model of the Eisenstein and Hu paper: flat, T = 2.728 K, three massless species, h = 1. */
export function paperIntegral(w0, wb, zdrag, G, T = 2.728) {
  const r = radiation({ T, Neff: 3, G });
  return soundHorizon({ H0: 100, Om: w0, Or: r.omegaRad, Ode: 'flat', w: -1, omegaB: wb, omegaGamma: r.omegaGamma, zd: zdrag }).value;
}

// ------------------------------------------------------------------ one massive neutrino by its Fermi-Dirac density
const I0 = (7 * Math.PI ** 4) / 120;
const FD_PIECES = [0, 1, 4, 12, 30, 80];
/** f(y) = Int x^2 sqrt(x^2 + y^2) / (e^x + 1) dx divided by its massless value 7 pi^4 / 120. */
export function fdRatio(y) {
  const g = x => (x * x * Math.sqrt(x * x + y * y)) / (Math.exp(x) + 1);
  let s = 0;
  for (let k = 0; k < FD_PIECES.length - 1; k++) {
    const r = adaptive(g, FD_PIECES[k], FD_PIECES[k + 1], { absTol: 0, relTol: 1e-13, maxDepth: 30 });
    if (!r.converged) throw new BaoDomainError('not-converged', 'the Fermi-Dirac quadrature did not converge');
    s += r.value;
  }
  return s / I0;
}

/**
 * P1c: the sound horizon with three species of weight Neff/3, one of mass mnuEv (Fermi-Dirac density), two massless, T_nu = (4/11)^(1/3) T,
 * flat, matter = omega_b + omega_c. The cosmological constant closes flatness today and is negligible at z_d.
 */
export function soundHorizonMassiveNu({ wb, wc, H0, zd, mnuEv, T, Neff, G }) {
  const h = H0 / 100;
  const rad = radiation({ T, Neff: 0, G });
  const OG = rad.omegaGamma;
  const NU = (7 / 8) * Math.pow(4 / 11, 4 / 3);
  const kappa = (NU * Neff) / 3;
  const ktNu = (K_B * Math.pow(4 / 11, 1 / 3) * T) / E_CHARGE; // eV
  const y0 = mnuEv / ktNu;
  const wm = wb + wc;
  const wrel0 = OG * (1 + 2 * kappa);
  const wL = h * h - wm - wrel0 - OG * kappa * fdRatio(y0);
  const b = (3 * wb) / (4 * OG);
  const ad = 1 / (1 + zd);
  const f = t => {
    const a = ad * t * t;
    const d = wm * a + wrel0 + OG * kappa * fdRatio(y0 * a) + wL * Math.pow(a, 4);
    return (2 * ad * t) / (Math.sqrt(3 * (1 + b * a)) * Math.sqrt(d));
  };
  const pts = [0, 0.1, 0.3, 0.6, 1];
  let v = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const r = adaptive(f, pts[k], pts[k + 1], { absTol: 0, relTol: 1e-12, maxDepth: 20 });
    if (!r.converged || !Number.isFinite(r.value)) throw new BaoDomainError('not-converged', 'the quadrature did not converge');
    v += r.value;
  }
  return { value: (C_KMS / 100) * v, y0 };
}
