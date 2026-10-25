// Atmospheres kernel (spike of Prompt 199): constants and the refusal shape.
import {
  K_BOLTZMANN,
  SIGMA_SB,
  AU_M,
  R_SUN_M,
} from '../radiation/constants.js';

export { K_BOLTZMANN, SIGMA_SB, AU_M, R_SUN_M };
/** Newtonian constant, m^3 kg^-1 s^-2 (CODATA 2018). */
export const G_NEWTON = 6.6743e-11;
/** Atomic mass constant, kg (CODATA 2018). */
export const ATOMIC_MASS = 1.6605390666e-27;
/** Solar constant at 1 AU, W m^-2 (Kopp and Lean 2011, 1360.8). */
export const SOLAR_CONSTANT = 1360.8;

/** A refusal: a reason and no number. */
export const refuse = (model, reason) => ({ refused: true, model, reason });
export const isPos = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
export const isUnit = x =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
