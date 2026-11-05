// =============================================================================
// SED kernel: flux-density conventions (Prompt 245)
// -----------------------------------------------------------------------------
// Four ways of writing the same monochromatic flux density, and two magnitude
// systems, kept apart:
//
//   f_nu       energy per time, area and frequency      Jy  (1 Jy = 1e-26 W m^-2 Hz^-1)
//   f_lambda   energy per time, area and wavelength     W m^-2 nm^-1 (the registry's 'W/m2/nm')
//   nu f_nu    energy per time and area, per ln nu      W m^-2
//   lambda f_lambda                                     W m^-2, equal to nu f_nu at the same point
//
//   AB magnitude    m = -2.5 log10(f_nu / 3631 Jy)            Oke and Gunn 1983
//   Vega magnitude  m_Vega = m_AB - (AB - Vega)_band          the offset is data of the bandpass pack
//
// The magnitude conversions are the radiation kernel's constants and the pack's
// offsets; the flux units are the registry's, through the radiation kernel's
// convertFlux. Nothing here is a published number typed from memory: the AB zero
// point is the kernel's AB_ZERO_JY, the Vega offsets come with the bands.
//
// The unit registry is NOT extended: a magnitude is a logarithm that needs a
// band, so it cannot be a factor of a dimension (the registry's 'mag' stays
// unconvertible by design), and the radiation kernel already holds Jy, mJy,
// f_lambda and the crossing between them.
// =============================================================================

import { UNITS } from '../../units/registry.js';
import { AB_ZERO_JY, C_LIGHT, convertFlux } from '../radiation/index.js';

const { Math, Number } = globalThis;

/** The two magnitude conventions. */
export const MAGNITUDE_CONVENTIONS = Object.freeze(['ab-mag', 'vega-mag']);

/** Registry ids accepted as flux-density conventions. */
export const FLUX_CONVENTIONS = Object.freeze([
  'Jy',
  'mJy',
  'W/m2/nm',
  'erg/s/cm2/Angstrom',
]);

/** True when `id` is a convention the kernel accepts. */
export const isConvention = id =>
  MAGNITUDE_CONVENTIONS.includes(id) || FLUX_CONVENTIONS.includes(id);

/** True for a flux density per unit wavelength (the registry's flux-per-wavelength). */
export const isPerWavelength = id =>
  FLUX_CONVENTIONS.includes(id) && UNITS[id]?.dim === 'flux-per-wavelength';

/** f_nu in Jy of an AB magnitude. */
export const abMagToJy = m => AB_ZERO_JY * 10 ** (-0.4 * m);
/** AB magnitude of an f_nu in Jy. */
export const jyToAbMag = f => -2.5 * Math.log10(f / AB_ZERO_JY);

/**
 * f_nu in Jy of a magnitude in a system, for a band with a stated AB-Vega offset.
 * @param {number} m
 * @param {'ab-mag'|'vega-mag'} system
 * @param {?number} abMinusVega - (AB - Vega) of the band, mag; null when the pack states none
 * @returns {number} NaN for a Vega magnitude with no offset
 */
export function magToJy(m, system, abMinusVega = null) {
  if (system === 'ab-mag') return abMagToJy(m);
  if (system === 'vega-mag')
    return Number.isFinite(abMinusVega) ? abMagToJy(m + abMinusVega) : NaN;
  return NaN;
}

/** The magnitude of an f_nu in Jy in a system (the inverse of magToJy). */
export function jyToMag(f, system, abMinusVega = null) {
  if (system === 'ab-mag') return jyToAbMag(f);
  if (system === 'vega-mag')
    return Number.isFinite(abMinusVega) ? jyToAbMag(f) - abMinusVega : NaN;
  return NaN;
}

/** f_lambda (W m^-2 nm^-1) of an f_nu (Jy) at a wavelength (nm). */
export const jyToFlambda = (fJy, lambdaNm) =>
  convertFlux(fJy, 'Jy', 'W/m2/nm', lambdaNm);
/** f_nu (Jy) of an f_lambda (W m^-2 nm^-1) at a wavelength (nm). */
export const flambdaToJy = (fl, lambdaNm) =>
  convertFlux(fl, 'W/m2/nm', 'Jy', lambdaNm);

/** nu f_nu in W m^-2 of an f_nu in Jy at a wavelength (nm). */
export function nuFnu(fJy, lambdaNm) {
  const nu = C_LIGHT / (lambdaNm * 1e-9);
  return nu * fJy * 1e-26;
}
/** lambda f_lambda in W m^-2 of an f_lambda (W m^-2 nm^-1) at a wavelength (nm). */
export const lambdaFlambda = (fl, lambdaNm) => lambdaNm * fl;

/** The log-flux (natural log) standard deviation of a magnitude error. */
export const sigmaLnOfMag = sigmaMag => 0.4 * Math.log(10) * sigmaMag;
