// =============================================================================
// Constants of the stellar-structure kernel (STELLAR_STRUCTURE.md)
// -----------------------------------------------------------------------------
// SI. The solar and gravitational values are the application's own, so a star
// here is the same size as the Sun everywhere else in Gravitas; the others are
// CODATA 2018. The 0.03 percent by which the application's solar mass differs
// from GM/G is stated in the document and is smaller than every tolerance.
// =============================================================================

import {
  G_SI,
  C_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  SECONDS_PER_YEAR,
} from '../../constants.js';
import { H_PLANCK, K_BOLTZMANN, L_SUN_W } from '../radiation/constants.js';

export {
  G_SI,
  C_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  SECONDS_PER_YEAR,
  H_PLANCK,
  K_BOLTZMANN,
  L_SUN_W,
};

export const M_ELECTRON_KG = 9.1093837015e-31; // CODATA 2018
export const M_UNIT_KG = 1.6605390666e-27; // atomic mass unit, CODATA 2018
/** Mass fraction of hydrogen turned into energy: four H to one He, 0.7 percent. */
export const H_BURNING_EFFICIENCY = 0.007;
