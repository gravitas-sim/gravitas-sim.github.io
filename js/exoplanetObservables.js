// =============================================================================
// What an exoplanet observation actually measures
// -----------------------------------------------------------------------------
// The physics behind the radial-velocity and astrometry instruments, kept out of
// the drawing code so that a live panel, a lesson widget, a characterization
// summary and a test all compute the same number.
//
// Every constant here is imported from js/constants.js. There is one G in this
// project; a second copy that disagreed in the fourth digit would be a lesson
// quietly teaching the wrong answer.
// =============================================================================

import {
  G_SI,
  SOLAR_MASS_KG,
  JUPITER_MASS_KG,
  JUPITER_RADIUS_M,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SECONDS_PER_DAY,
  ARCSEC_PER_RADIAN,
} from './constants.js';

/**
 * Radial-velocity semi-amplitude of a star pulled by one companion.
 *
 * K is the *semi*-amplitude: half the peak-to-peak swing, not the whole range.
 * Conflating the two is the commonest way to be a factor of two wrong.
 *
 *   K = (2 pi G / P)^(1/3) * (M_p sin i) / (M_star + M_p)^(2/3) / sqrt(1 - e^2)
 *
 * @param {object} params - System parameters
 * @param {number} params.starMassSolar - Stellar mass in solar masses
 * @param {number} params.planetMassJupiter - Planet mass in Jupiter masses
 * @param {number} params.periodDays - Orbital period in days
 * @param {number} [params.inclinationDeg] - Inclination, 90 = edge-on
 * @param {number} [params.eccentricity] - Orbital eccentricity
 * @returns {number} Semi-amplitude in m/s, or NaN if the inputs are unphysical
 */
export function radialVelocitySemiAmplitude({
  starMassSolar,
  planetMassJupiter,
  periodDays,
  inclinationDeg = 90,
  eccentricity = 0,
}) {
  const P = Number(periodDays) * SECONDS_PER_DAY;
  const mStar = Number(starMassSolar) * SOLAR_MASS_KG;
  const mPlanet = Number(planetMassJupiter) * JUPITER_MASS_KG;
  const e = Number(eccentricity) || 0;
  if (!(P > 0) || !(mStar > 0) || !(mPlanet >= 0) || e < 0 || e >= 1)
    return NaN;

  const sinI = Math.sin((Number(inclinationDeg) * Math.PI) / 180);
  const scale = Math.cbrt((2 * Math.PI * G_SI) / P);
  const total = Math.pow(mStar + mPlanet, 2 / 3);
  return (scale * (mPlanet * sinI)) / total / Math.sqrt(1 - e * e);
}

/**
 * How far the star itself orbits the barycenter.
 *
 * The same center-of-mass rule the Weighing the Stars lesson teaches for two
 * stars, applied to a star and a planet: each body's distance from the
 * barycenter is the separation times the *other* body's share of the mass.
 *
 * @param {object} params - System parameters
 * @param {number} params.semiMajorAU - Relative semi-major axis in AU
 * @param {number} params.starMassSolar - Stellar mass in solar masses
 * @param {number} params.planetMassJupiter - Planet mass in Jupiter masses
 * @returns {number} The star's own semi-major axis, in AU
 */
export function stellarReflexSemimajorAxis({
  semiMajorAU,
  starMassSolar,
  planetMassJupiter,
}) {
  const mStar = Number(starMassSolar) * SOLAR_MASS_KG;
  const mPlanet = Number(planetMassJupiter) * JUPITER_MASS_KG;
  const total = mStar + mPlanet;
  if (!(total > 0)) return NaN;
  return (Number(semiMajorAU) * mPlanet) / total;
}

/**
 * The planet's own semi-major axis about the barycenter, for completeness.
 *
 * @param {object} params - Same shape as stellarReflexSemimajorAxis
 * @returns {number} The planet's semi-major axis about the barycenter, in AU
 */
export function planetSemimajorAxisAboutBarycenter({
  semiMajorAU,
  starMassSolar,
  planetMassJupiter,
}) {
  const mStar = Number(starMassSolar) * SOLAR_MASS_KG;
  const mPlanet = Number(planetMassJupiter) * JUPITER_MASS_KG;
  const total = mStar + mPlanet;
  if (!(total > 0)) return NaN;
  return (Number(semiMajorAU) * mStar) / total;
}

/**
 * Angular size of the star's reflex orbit, as seen from a given distance.
 *
 * One AU seen from one parsec subtends one arcsecond, by the definition of the
 * parsec, so this is a division rather than a trigonometric identity.
 *
 * Distance changes the *angle*, never the physical orbit. Keeping those two
 * apart is the whole point of the astrometry panel.
 *
 * @param {object} params - Reflex orbit and distance
 * @param {number} params.starReflexAU - The star's semi-major axis in AU
 * @param {number} params.distancePc - System distance in parsecs
 * @returns {{arcsec: number, mas: number, microarcsec: number}} The signature
 */
export function astrometricSignature({ starReflexAU, distancePc }) {
  const d = Number(distancePc);
  if (!(d > 0)) return { arcsec: NaN, mas: NaN, microarcsec: NaN };
  const arcsec = Number(starReflexAU) / d;
  return { arcsec, mas: arcsec * 1e3, microarcsec: arcsec * 1e6 };
}

/**
 * Format an angular signature at whichever unit keeps the number legible.
 *
 * 0.63 microarcseconds is a quantity a student can hold; 0.00000063 arcseconds
 * is the same quantity written so it cannot be read.
 *
 * @param {number} arcsec - Angle in arcseconds
 * @returns {{value: number, unit: string}} Value and unit symbol
 */
export function chooseAngularUnit(arcsec) {
  const a = Math.abs(Number(arcsec));
  if (!Number.isFinite(a) || a === 0) return { value: 0, unit: 'arcsec' };
  if (a >= 1) return { value: arcsec, unit: 'arcsec' };
  if (a >= 1e-3) return { value: arcsec * 1e3, unit: 'mas' };
  return { value: arcsec * 1e6, unit: 'µas' };
}

/**
 * Bulk density of a planet from its mass and radius.
 *
 * Bulk density is a clue, not an interior. Several mixtures of rock, iron, water
 * and gas can land on the same number, which is why every student-facing string
 * built from this says "consistent with" and never "is made of".
 *
 * @param {object} params - Mass and radius, in either Earth or Jupiter units
 * @param {number} [params.massEarth] - Mass in Earth masses
 * @param {number} [params.radiusEarth] - Radius in Earth radii
 * @param {number} [params.massJupiter] - Mass in Jupiter masses
 * @param {number} [params.radiusJupiter] - Radius in Jupiter radii
 * @returns {{gramsPerCm3: number, relativeToEarth: number}} Density
 */
export function planetBulkDensity({
  massEarth,
  radiusEarth,
  massJupiter,
  radiusJupiter,
}) {
  let massKg;
  let radiusM;
  if (massJupiter !== undefined && radiusJupiter !== undefined) {
    massKg = Number(massJupiter) * JUPITER_MASS_KG;
    radiusM = Number(radiusJupiter) * JUPITER_RADIUS_M;
  } else {
    massKg = Number(massEarth) * EARTH_MASS_KG;
    radiusM = Number(radiusEarth) * EARTH_RADIUS_M;
  }
  if (!(massKg > 0) || !(radiusM > 0)) {
    return { gramsPerCm3: NaN, relativeToEarth: NaN };
  }
  const volumeM3 = (4 / 3) * Math.PI * radiusM ** 3;
  const kgPerM3 = massKg / volumeM3;
  const earthVolume = (4 / 3) * Math.PI * EARTH_RADIUS_M ** 3;
  const earthDensity = EARTH_MASS_KG / earthVolume;
  return {
    gramsPerCm3: kgPerM3 / 1000,
    relativeToEarth: kgPerM3 / earthDensity,
  };
}

/**
 * Mass ratio of companion to primary, both in solar masses.
 *
 * @param {number} companionSolar - Companion mass in solar masses
 * @param {number} primarySolar - Primary mass in solar masses
 * @returns {number} The ratio
 */
export const massRatio = (companionSolar, primarySolar) =>
  Number(companionSolar) / Number(primarySolar);

/**
 * Minimum mass implied by a measured K, the quantity RV alone can deliver.
 *
 * Inverts the semi-amplitude relation for M_p sin i. Because sin i is unknown
 * without another measurement, what comes back is a floor on the mass, not the
 * mass. A transit is what turns the floor into a value, by pinning sin i near 1.
 *
 * @param {object} params - Measurement and known quantities
 * @param {number} params.semiAmplitudeMs - Measured K in m/s
 * @param {number} params.starMassSolar - Stellar mass in solar masses
 * @param {number} params.periodDays - Orbital period in days
 * @param {number} [params.eccentricity] - Orbital eccentricity
 * @returns {number} M_p sin i in Jupiter masses
 */
export function minimumPlanetMass({
  semiAmplitudeMs,
  starMassSolar,
  periodDays,
  eccentricity = 0,
}) {
  const K = Number(semiAmplitudeMs);
  const P = Number(periodDays) * SECONDS_PER_DAY;
  const mStar = Number(starMassSolar) * SOLAR_MASS_KG;
  const e = Number(eccentricity) || 0;
  if (!(K >= 0) || !(P > 0) || !(mStar > 0) || e < 0 || e >= 1) return NaN;

  // The planet mass appears on both sides through (M_star + M_p)^(2/3). For a
  // planetary companion the correction is a fraction of a per cent, but two
  // fixed-point passes cost nothing and make the function exact enough to
  // invert its own forward calculation in a test.
  const scale = Math.cbrt((2 * Math.PI * G_SI) / P);
  const damping = Math.sqrt(1 - e * e);
  let mPlanet = 0;
  for (let i = 0; i < 4; i++) {
    mPlanet = (K * damping * Math.pow(mStar + mPlanet, 2 / 3)) / scale;
  }
  return mPlanet / JUPITER_MASS_KG;
}

/**
 * Convert a radial velocity into the Doppler shift it produces.
 *
 * Non-relativistic, which at stellar reflex speeds of tens of m/s is exact to
 * far more digits than any spectrograph delivers: dLambda / lambda = v / c.
 *
 * @param {number} velocityMs - Radial velocity in m/s, positive receding
 * @param {number} restWavelengthNm - Rest wavelength in nanometres
 * @returns {number} Wavelength shift in nanometres, positive to the red
 */
export function dopplerShiftNm(velocityMs, restWavelengthNm) {
  const C = 299792458;
  return (Number(restWavelengthNm) * Number(velocityMs)) / C;
}

/** Arcseconds per radian, exported for callers that need the raw conversion. */
export { ARCSEC_PER_RADIAN };
