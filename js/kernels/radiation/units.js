// =============================================================================
// Radiation kernel: flux units, through the unit registry
// -----------------------------------------------------------------------------
// The registry (js/units/registry.js) converts within a dimension by a factor
// and refuses to turn a flux per wavelength into a flux per frequency, because
// that needs a wavelength. This is that conversion, for the two flux
// dimensions, done in SI: f_nu = f_lambda lambda^2 / c.
// =============================================================================

import { UNITS } from '../../units/registry.js';
import { C_LIGHT, JY } from './constants.js';

// Registry factors: flux-per-wavelength is in erg s^-1 cm^-2 A^-1 (1 of it is
// 1e7 W m^-3); flux-per-frequency is in Jy (1 of it is 1e-26 W m^-2 Hz^-1).
const FLAMBDA_TO_SI = 1e7; // W m^-3 per registry base unit
const FNU_TO_SI = JY; // W m^-2 Hz^-1 per registry base unit

/**
 * Convert a flux density between registry units, using a wavelength when the
 * conversion crosses between per-wavelength and per-frequency.
 * @param {number} value
 * @param {string} from - A registry id of dimension flux-per-wavelength or -frequency
 * @param {string} to - Likewise
 * @param {number} [lambdaNm] - Required to cross dimensions
 * @returns {number} NaN when a unit is not a flux density or lambda is missing
 */
export function convertFlux(value, from, to, lambdaNm) {
  const a = UNITS[from];
  const b = UNITS[to];
  const flux = u =>
    u?.dim === 'flux-per-wavelength' || u?.dim === 'flux-per-frequency';
  if (!flux(a) || !flux(b)) return NaN;
  if (a.dim === b.dim) return (value * a.factor) / b.factor;
  const lam = lambdaNm * 1e-9;
  if (!(lam > 0)) return NaN;
  if (a.dim === 'flux-per-wavelength') {
    const fnu = (value * a.factor * FLAMBDA_TO_SI * lam * lam) / C_LIGHT;
    return fnu / FNU_TO_SI / b.factor;
  }
  const flam = (value * a.factor * FNU_TO_SI * C_LIGHT) / (lam * lam);
  return flam / FLAMBDA_TO_SI / b.factor;
}
