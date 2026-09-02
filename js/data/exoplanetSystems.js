// =============================================================================
// Real exoplanet systems, in one place
// -----------------------------------------------------------------------------
// HD 209458 was already described three times over: once in the Transit Lab
// scenario builder in ui.js, once in the transit widgets, and again in the
// lesson prose. Three copies of a period and a stellar mass is three chances for
// them to drift, and the drift is silent - a lesson that quietly disagrees with
// the instrument the student is reading it from.
//
// Everything that needs a real system's numbers now reads them from here: the
// scenario builders, the transit widgets, the radial-velocity and astrometry
// instruments, the characterization panel and the tests.
//
// On the values
// -----------------------------------------------------------------------------
// These are the accepted published parameters for the system, at the precision
// the literature actually supports. They are stored locally and never fetched:
// Gravitas makes no network requests. Where a quantity is derived rather than
// measured - the semi-amplitude K, the reflex orbit - it is computed from the
// stored parameters by js/exoplanetObservables.js rather than written down, so
// the arithmetic cannot disagree with the inputs.
//
// A note on precision: the parameters below carry the digits the measurements
// justify. Do not add more.
// =============================================================================

/**
 * HD 209458 and its planet, the first transiting exoplanet.
 *
 * The historically important part for the lesson: the planet was found by the
 * radial-velocity wobble of its star first, in 1999, and only then caught in
 * transit. It is the one system where a student can walk the whole inference
 * chain - radius, mass, density - on real numbers.
 */
export const HD209458 = {
  id: 'hd209458',
  name: 'HD 209458',
  planetName: 'HD 209458 b',
  // Informal name given after the Egyptian god, common in the literature.
  planetNickname: 'Osiris',

  star: {
    massSolar: 1.148,
    radiusSolar: 1.155,
    luminositySolar: 1.77,
    temperatureK: 6065,
    spectralType: 'G0V',
    // Gaia parallax puts the system at roughly 48 parsecs, about 157 light
    // years. The astrometry panel needs this; the transit does not.
    distancePc: 48.3,
  },

  planet: {
    massJupiter: 0.69,
    radiusJupiter: 1.38,
    periodDays: 3.5247,
    semiMajorAU: 0.04747,
    // Consistent with zero in the literature; the orbit is circularized.
    eccentricity: 0,
    // Not 90 degrees. The transit is grazing enough that this matters: at a
    // true 90 the dip would be deeper than the one that is actually measured.
    inclinationDeg: 86.71,
  },

  // What the lesson can state as measured rather than derived.
  measured: {
    transitDepthPercent: 1.5,
    semiAmplitudeMs: 84,
  },
};

/**
 * The Sun and Jupiter, as an exoplanet system would look from outside.
 *
 * The contrast case for astrometry. HD 209458 b is a large radial-velocity
 * signal and a hopeless astrometric one; this is the reverse, and the reason
 * the two methods are described as complementary rather than redundant.
 */
export const SUN_JUPITER = {
  id: 'sun-jupiter',
  name: 'The Sun',
  planetName: 'Jupiter',

  star: {
    massSolar: 1,
    radiusSolar: 1,
    luminositySolar: 1,
    temperatureK: 5772,
    spectralType: 'G2V',
    // Not a real distance: the question the comparison asks is what our own
    // system would look like to an astronomer ten parsecs away.
    distancePc: 10,
  },

  planet: {
    massJupiter: 1,
    radiusJupiter: 1,
    periodDays: 4332.59,
    semiMajorAU: 5.2028,
    eccentricity: 0.0489,
    inclinationDeg: 90,
  },
};

/** Every system this module knows about, by id. */
export const EXOPLANET_SYSTEMS = {
  [HD209458.id]: HD209458,
  [SUN_JUPITER.id]: SUN_JUPITER,
};

/**
 * Look up a system by id.
 * @param {string} id - System id
 * @returns {object|null} The system, or null
 */
export const getExoplanetSystem = id => EXOPLANET_SYSTEMS[id] || null;

/**
 * Flatten a system into the shape the observables functions take.
 *
 * Saves every caller from spelling out the same five-line object, and means a
 * change to a stored parameter reaches the instruments without anyone having to
 * remember which of them re-typed it.
 *
 * @param {object} system - A system from this module
 * @returns {object} Parameters for js/exoplanetObservables.js
 */
export function observableParams(system) {
  return {
    starMassSolar: system.star.massSolar,
    planetMassJupiter: system.planet.massJupiter,
    periodDays: system.planet.periodDays,
    semiMajorAU: system.planet.semiMajorAU,
    eccentricity: system.planet.eccentricity,
    inclinationDeg: system.planet.inclinationDeg,
    distancePc: system.star.distancePc,
  };
}
