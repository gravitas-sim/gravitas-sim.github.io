// =============================================================================
// TRAPPIST-1, in one place
// -----------------------------------------------------------------------------
// The system is used by the scenario builder, by the light curve and by the
// habitable-zone instruments in "The Goldilocks Question". Three copies of
// these numbers would eventually become three different versions of TRAPPIST-1,
// and the one that mattered would be whichever the reader happened to open.
//
// Content only, no imports, in the same spirit as the rest of js/data.
//
// Sources: Agol et al. (2021), Planet. Sci. J. 2, 1 for the planetary masses,
// radii and semi-major axes; Ducrot et al. (2020) and Gillon et al. (2017) for
// the stellar properties. Values rounded to the precision the simulation and
// the lessons actually use.
// =============================================================================

/** The star. */
export const TRAPPIST1_STAR = {
  name: 'TRAPPIST-1',
  massInSuns: 0.0898,
  radiusInSuns: 0.1192,
  // Measured, not derived. A mass-luminosity relation puts this star's
  // luminosity out by more than an order of magnitude, which moves its
  // habitable zone by a factor of several.
  luminosityInSuns: 0.000553,
  temperatureK: 2566,
  spectralType: 'M8V',
  distanceLightYears: 40.7,
  baseColor: '#a83232',
};

/**
 * The seven planets, b through h, in order of distance.
 * Semi-major axes in AU, masses in Earth masses, radii in Earth radii.
 */
export const TRAPPIST1_PLANETS = [
  { name: 'b', a: 0.0115, mass: 1.374, radius: 1.116, periodDays: 1.5109 },
  { name: 'c', a: 0.0158, mass: 1.308, radius: 1.097, periodDays: 2.4218 },
  { name: 'd', a: 0.0223, mass: 0.388, radius: 0.788, periodDays: 4.0496 },
  { name: 'e', a: 0.0292, mass: 0.692, radius: 0.92, periodDays: 6.0996 },
  { name: 'f', a: 0.0385, mass: 1.039, radius: 1.045, periodDays: 9.2067 },
  { name: 'g', a: 0.0469, mass: 1.321, radius: 1.129, periodDays: 12.3535 },
  { name: 'h', a: 0.0619, mass: 0.326, radius: 0.755, periodDays: 18.7729 },
];

/** @returns {Object|undefined} One planet, by its letter */
export const trappistPlanet = letter =>
  TRAPPIST1_PLANETS.find(p => p.name === letter);
