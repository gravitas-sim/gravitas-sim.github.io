// =============================================================================
// The three ways a star's size can be written down
// -----------------------------------------------------------------------------
// Luminosity, effective temperature and radius are one relation with three
// unknowns, and every part of this application that quotes two of them has to
// agree about the third. That relation is the Stefan-Boltzmann law:
//
//     L / Lsun = (R / Rsun)^2 (Teff / Teff_sun)^4
//
// It is exact by construction - it is the definition of effective temperature -
// so there is no approximation here and no room for two functions to disagree.
// The bundled MIST tracks satisfy it to machine precision, which is why the
// radius is derived from them rather than stored: see PROVENANCE in
// js/data/stellar/mistTracks.js.
//
// Nothing here is a *displayed* size. That is js/bodyVisuals.js, which owns a
// deliberately compressed scale, and a body's interaction radius is a third
// thing again. See /model/#sizes.
// =============================================================================

import { TEFF_SUN_K } from './mainSequence.js';

export { TEFF_SUN_K };

/** One solar radius, in metres. IAU 2015 nominal. */
export const R_SUN_M = 6.957e8;

/** One solar luminosity, in watts. IAU 2015 nominal. */
export const L_SUN_W = 3.828e26;

/**
 * Photospheric radius from luminosity and effective temperature.
 *
 * @param {number} luminositySolar - Bolometric luminosity, solar units
 * @param {number} teffK - Effective temperature, kelvin
 * @returns {number} Radius in solar radii, or NaN if either input is unusable
 */
export function radiusFromLuminosityAndTemperature(luminositySolar, teffK) {
  if (!(luminositySolar > 0) || !(teffK > 0)) return NaN;
  return Math.sqrt(luminositySolar) / (teffK / TEFF_SUN_K) ** 2;
}

/**
 * Luminosity from radius and effective temperature.
 * @param {number} radiusSolar - Radius, solar radii
 * @param {number} teffK - Effective temperature, kelvin
 * @returns {number} Luminosity in solar luminosities
 */
export function luminosityFromRadiusAndTemperature(radiusSolar, teffK) {
  if (!(radiusSolar > 0) || !(teffK > 0)) return NaN;
  return radiusSolar ** 2 * (teffK / TEFF_SUN_K) ** 4;
}

/**
 * Effective temperature from luminosity and radius.
 * @param {number} luminositySolar - Luminosity, solar units
 * @param {number} radiusSolar - Radius, solar radii
 * @returns {number} Effective temperature in kelvin
 */
export function temperatureFromLuminosityAndRadius(
  luminositySolar,
  radiusSolar
) {
  if (!(luminositySolar > 0) || !(radiusSolar > 0)) return NaN;
  return TEFF_SUN_K * (luminositySolar / radiusSolar ** 2) ** 0.25;
}

/**
 * Whether three quantities are consistent with each other.
 *
 * Used by the build and by the tests rather than by the interface: a star whose
 * three numbers do not close is a star somebody has half-edited, and it is
 * worth knowing about rather than silently preferring one of them.
 *
 * @param {number} luminositySolar - Luminosity
 * @param {number} teffK - Effective temperature
 * @param {number} radiusSolar - Radius
 * @param {number} [tolerance] - Fractional agreement required
 * @returns {boolean} True when the three close to within the tolerance
 */
export function isSelfConsistent(
  luminositySolar,
  teffK,
  radiusSolar,
  tolerance = 0.02
) {
  const implied = radiusFromLuminosityAndTemperature(luminositySolar, teffK);
  if (!Number.isFinite(implied) || !(radiusSolar > 0)) return false;
  return Math.abs(implied / radiusSolar - 1) <= tolerance;
}

/**
 * A rough luminosity class from radius and luminosity.
 *
 * Display shorthand, not a spectroscopic classification: a real luminosity
 * class comes from line widths, and this comes from two numbers on a track.
 * The thresholds are the conventional teaching ones and are stated here rather
 * than buried: a supergiant is enormous *and* bright, a giant is enormous, and
 * a star smaller than the Sun that is far too faint for its temperature is a
 * degenerate remnant rather than a small ordinary star.
 *
 * @param {number} radiusSolar - Radius, solar radii
 * @param {number} luminositySolar - Luminosity, solar units
 * @returns {'supergiant'|'giant'|'subgiant'|'dwarf'|'degenerate'|'unknown'} A class
 */
export function luminosityClass(radiusSolar, luminositySolar) {
  if (!(radiusSolar > 0) || !(luminositySolar > 0)) return 'unknown';
  if (radiusSolar < 0.05) return 'degenerate';
  if (radiusSolar >= 100 && luminositySolar >= 1e4) return 'supergiant';
  if (radiusSolar >= 10) return 'giant';
  if (radiusSolar >= 2 && luminositySolar < 1e3) return 'subgiant';
  return 'dwarf';
}
