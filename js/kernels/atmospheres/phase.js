// The Lambert-sphere phase curve and its albedo (Prompt 201 spike). ATMOSPHERES_GATE_II.md.
import { refuse, isUnit } from './constants.js';

const MODEL = 'Lambert-sphere phase curve';
const ASSUMES = [
  'a Lambert sphere (isotropic reflection, phase integral 3/2)',
  'reflected light only: no thermal phase variation, no polarisation, no clouds',
  'the albedo found is the albedo of a Lambert sphere',
];
/** Phase integral of a Lambert sphere. */
export const PHASE_INTEGRAL = 1.5;
export const bondFromGeometric = ag => PHASE_INTEGRAL * ag;
export const geometricFromBond = ab => ab / PHASE_INTEGRAL;

/** Phi(alpha) = [sin(alpha) + (pi - alpha) cos(alpha)] / pi; 1 at full phase. */
export const lambertPhase = a =>
  (Math.sin(a) + (Math.PI - a) * Math.cos(a)) / Math.PI;

/** Reflected flux ratio A_g (R_p/a)^2 Phi(alpha) at each phase angle (radians). */
export function phaseCurve({ albedo, semiMajorOverRp, alphas }) {
  if (!isUnit(albedo))
    return refuse(MODEL, 'the geometric albedo must be in [0, 1]');
  if (!(semiMajorOverRp > 1)) return refuse(MODEL, 'a / R_p must exceed 1');
  if (!alphas.every(a => a >= 0 && a <= Math.PI))
    return refuse(MODEL, 'every phase angle must be in [0, pi]');
  return {
    model: MODEL,
    assumes: ASSUMES,
    flux: alphas.map(a => (albedo * lambertPhase(a)) / semiMajorOverRp ** 2),
  };
}

/** The 0.99 quantile of chi-square with nu degrees of freedom (Wilson-Hilferty). */
export const chi2Critical = nu =>
  nu * (1 - 2 / (9 * nu) + 2.3263478740408408 * Math.sqrt(2 / (9 * nu))) ** 3;

/** Least-squares Lambert albedo from a phase curve with known noise; flags a curve a Lambert sphere does not describe. */
export function fitAlbedo({ alphas, flux, sigma, semiMajorOverRp }) {
  if (
    !(sigma > 0) ||
    !(semiMajorOverRp > 1) ||
    alphas.length !== flux.length ||
    alphas.length < 3
  )
    return refuse(
      MODEL,
      'needs at least 3 points, a positive noise and a / R_p above 1'
    );
  const k = 1 / semiMajorOverRp ** 2;
  const phi = alphas.map(lambertPhase);
  let num = 0;
  let den = 0;
  for (let i = 0; i < phi.length; i++) {
    num += flux[i] * phi[i];
    den += phi[i] * phi[i];
  }
  const ag = num / (k * den);
  const s = sigma / (k * Math.sqrt(den));
  let chi2 = 0;
  for (let i = 0; i < phi.length; i++)
    chi2 += ((flux[i] - ag * k * phi[i]) / sigma) ** 2;
  const dof = phi.length - 1;
  if (chi2 > chi2Critical(dof))
    return {
      model: MODEL,
      assumes: ASSUMES,
      flagged: true,
      reason: 'a Lambert sphere does not describe this curve: no albedo',
      chi2,
      dof,
    };
  return {
    model: MODEL,
    assumes: ASSUMES,
    flagged: false,
    albedo: ag,
    sigma: s,
    lo: ag - 1.96 * s,
    hi: ag + 1.96 * s,
    bond: bondFromGeometric(ag),
    chi2,
    dof,
  };
}
