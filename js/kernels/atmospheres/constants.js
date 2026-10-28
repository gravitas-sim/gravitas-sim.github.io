// Atmospheres kernel (Prompt 200): constants and the refusal shape. Pure functions, no DOM, no imports
// beyond the radiation kernel's constants.
import {
  K_BOLTZMANN,
  SIGMA_SB,
  AU_M,
  R_SUN_M,
  H_PLANCK,
  C_LIGHT,
} from '../radiation/constants.js';

export { K_BOLTZMANN, SIGMA_SB, AU_M, R_SUN_M, H_PLANCK, C_LIGHT };
/** Atomic mass constant, kg (CODATA 2018). */
export const ATOMIC_MASS = 1.6605390666e-27;
/** Solar constant at 1 AU, W m^-2 (Kopp and Lean 2011, 1360.8). */
export const SOLAR_CONSTANT = 1360.8;

/** A refusal: a reason and no number. */
export const refuse = (model, reason) => ({ refused: true, model, reason });
export const isPos = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
export const isUnit = x =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
