// =============================================================================
// Main-sequence estimates from mass alone
// -----------------------------------------------------------------------------
// The oldest and crudest thing in the stellar stack, kept because it is the
// only thing that works when all you have is a mass - which is the case for
// every star the sandbox generates. It was in js/habitability.js, where two of
// its three callers had nothing to do with habitability; it is here so that
// js/stellar/state.js and js/habitability.js can both reach it without one
// importing the other.
//
// What these are for, and what they are not for
// -----------------------------------------------------------------------------
// They describe a star sitting on the main sequence and nothing else. Applied
// to a red giant, a protostar or a white dwarf they are not approximations,
// they are wrong: a red giant is thousands of times more luminous than its mass
// suggests, and a white dwarf is a hundred thousand times less. Anything that
// has a modelled temperature, luminosity or radius should use that instead, and
// js/stellar/state.js exists to make that the default rather than the exception.
// =============================================================================

/** The IAU 2015 nominal solar effective temperature, in kelvin. */
export const TEFF_SUN_K = 5772;

/**
 * Bolometric luminosity from mass, for a main-sequence star.
 *
 * The main-sequence mass-luminosity relation is a broken power law rather than
 * a single one: the exponent is about 2.3 for the smallest stars, near 4 around
 * a solar mass, 3.5 through the intermediate range, and close to 1 for the most
 * massive, where radiation pressure dominates. The break points and
 * coefficients are the ones usually quoted in introductory texts (Duric,
 * Advanced Astrophysics, 2004, and standard course treatments).
 *
 * It says nothing at all about a star that has left the main sequence.
 *
 * @param {number} massSolar - Mass in solar masses
 * @returns {number} Luminosity in solar luminosities
 */
export function estimateLuminosityFromMass(massSolar) {
  const m = Math.max(massSolar, 1e-6);
  if (m < 0.43) return 0.23 * m ** 2.3;
  if (m < 2) return m ** 4;
  if (m < 55) return 1.4 * m ** 3.5;
  return 32000 * m;
}

/**
 * Effective temperature from mass, for a main-sequence star.
 *
 * A rough fit, adequate for placing a habitable zone or choosing a colour and
 * no more.
 *
 * @param {number} massSolar - Mass in solar masses
 * @returns {number} Effective temperature in kelvin
 */
export function estimateTeffFromMass(massSolar) {
  return TEFF_SUN_K * Math.max(massSolar, 1e-6) ** 0.55;
}

/**
 * Total core-hydrogen-burning lifetime from mass, for a main-sequence star.
 *
 * Fuel divided by the rate it is burned at: the reservoir goes as the mass and
 * the rate goes as the luminosity, so the lifetime goes as M/L. With the broken
 * power law above that is not a single exponent, which is the point - the often
 * quoted t = 10 Gyr x M^-2.5 is a fit to the middle of the range only.
 *
 * This is an estimate. Where a modelled track exists, js/stellar/tracks.js
 * reports the lifetime MESA actually integrated, which is a different and
 * better number.
 *
 * @param {number} massSolar - Mass in solar masses
 * @returns {number} Main-sequence lifetime in years
 */
export function estimateMainSequenceLifetime(massSolar) {
  const m = Math.max(massSolar, 1e-6);
  return 1e10 * (m / estimateLuminosityFromMass(m));
}
