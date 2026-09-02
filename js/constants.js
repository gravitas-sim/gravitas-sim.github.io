// =============================================================================
// Physical constants
// -----------------------------------------------------------------------------
// One home for the numbers that are not ours to choose. Before this file the
// gravitational constant was declared three separate times - in units.js, in
// physics.js and in blackHolePhysics.js - and the solar mass twice. They all
// happened to agree, which is the good version of that problem; the bad version
// is a lesson and the inspector disagreeing in the fourth digit and nobody
// knowing which one the student should believe.
//
// Pure: no DOM, no simulation state, no imports. That matters, because the
// modules that need constants most - blackHolePhysics.js, exoplanetObservables.js
// - are themselves pure and testable in plain node, and importing anything that
// touches `document` would take that away from them.
//
// Values are CODATA 2018 for G and c, IAU 2015 nominal for the solar and
// planetary quantities. Jupiter and Earth radii are equatorial.
// =============================================================================

/** Gravitational constant, m^3 kg^-1 s^-2. CODATA 2018. */
export const G_SI = 6.6743e-11;

/** Speed of light in vacuum, m/s. Exact by definition. */
export const C_SI = 299792458;

/** Solar mass, kg. IAU 2015 nominal. */
export const SOLAR_MASS_KG = 1.989e30;

/** Solar radius, m. IAU 2015 nominal. */
export const SOLAR_RADIUS_M = 6.957e8;

/** Astronomical unit, m. Exact by definition since IAU 2012. */
export const AU_METERS = 1.496e11;

/** Parsec, m. */
export const PARSEC_M = 3.085677581e16;

/** Earth mass, kg. */
export const EARTH_MASS_KG = 5.972e24;

/** Earth equatorial radius, m. */
export const EARTH_RADIUS_M = 6.371e6;

/** Jupiter mass, kg. */
export const JUPITER_MASS_KG = 1.898e27;

/** Jupiter equatorial radius, m. */
export const JUPITER_RADIUS_M = 7.1492e7;

/** Seconds in a day. */
export const SECONDS_PER_DAY = 86400;

/** Seconds in a Julian year. */
export const SECONDS_PER_YEAR = 3.15576e7;

/** Arcseconds in one radian. */
export const ARCSEC_PER_RADIAN = 206264.806;

/**
 * Jupiter masses in one solar mass.
 *
 * Quoted directly rather than derived from SOLAR_MASS_KG / JUPITER_MASS_KG,
 * which would give 1047.95. That is not a typo in either constant: a mass in
 * kilograms is only known to about four figures because it carries G's
 * uncertainty, while the ratio of two masses comes from the GM products, which
 * are measured to ten. The ratio is the better number, and it is the one a
 * student will find quoted, so it is the one stored here.
 */
export const JUPITER_MASSES_PER_SOLAR_MASS = 1047.348644;

/**
 * Earth masses in one Jupiter mass. Used for the inspector's cross-check, where
 * a gas giant's mass is quoted in Earth masses alongside Jupiter masses.
 */
export const EARTH_MASSES_PER_JUPITER_MASS = 317.828;

/**
 * Ceres, kg. JPL SBDB, from the Dawn mission's gravity science.
 *
 * The anchor for the small rocky bodies, and quoted in kilograms rather than as
 * a ratio because that is how a minor planet's mass is measured and published:
 * there is no GM ratio against the Sun known to ten digits for a body like this
 * one. Ceres is a third of the mass of the entire asteroid belt, which makes it
 * the largest asteroid rather than the typical one - the simulation's asteroids
 * are the ones a student is meant to be able to see and click on, so the
 * largest is the right end of the distribution to anchor to, and it is the
 * comparison MASS_UNITS.md already used when it named this bug.
 */
export const CERES_MASS_KG = 9.3835e20;

/**
 * Comet 1P/Halley, kg. From its measured volume and a bulk density near
 * 0.6 g/cm^3, which is the usual quoted figure.
 *
 * The Comet class already counts its mass in Halley masses and says so; it was
 * multiplying them by a hardcoded 0.1 simulation units, which is a hundred and
 * eighty billion times too heavy.
 */
export const HALLEY_MASS_KG = 2.2e14;

/**
 * A kilometre-scale rocky fragment, kg.
 *
 * Debris is collision and tidal ejecta, and there is no catalogued object to
 * anchor it to, so it is built rather than quoted: a sphere one kilometre
 * across at 3000 kg/m^3, the bulk density of ordinary stony rock. That is
 * (4/3) * pi * (500 m)^3 * 3000 kg/m^3.
 */
export const DEBRIS_FRAGMENT_MASS_KG = 1.5708e12;

/**
 * Earth masses in one solar mass.
 *
 * Quoted for the same reason as JUPITER_MASSES_PER_SOLAR_MASS above: the ratio
 * is measured far better than either mass in kilograms, and it is the number a
 * student will find quoted.
 */
export const EARTH_MASSES_PER_SOLAR_MASS = 332946.0487;
