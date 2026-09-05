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

// --- What a live run has actually measured ------------------------------------
//
// The two functions above compute observables from known orbital elements. The
// two below do the opposite job: they describe a recorded series without
// assuming what produced it. Keeping them here, pure and beside the formulas
// they must not be confused with, is the point - the panels used to blur
// exactly that line.

/**
 * Half the range of a recorded radial-velocity series, and whether the run has
 * covered enough of the curve for that to describe the whole curve.
 *
 * The returned `halfRange` is (max - min) / 2 over the samples given. It equals
 * the orbital semi-amplitude K only for a single planet on a circular orbit
 * observed over at least a full cycle. An eccentric orbit's velocity curve is
 * K[cos(nu + omega) + e cos omega] + gamma, which is not a sinusoid and whose
 * range depends on e and omega; two planets give a superposition whose range is
 * neither planet's K.
 *
 * `complete` is evidence that both extremes have actually been observed, which
 * is what the half-range needs and is a weaker requirement than a full cycle: a
 * run from just before a maximum to just after the following minimum has seen
 * the whole range. The test is that the curve *turned around* at each extreme -
 * that on both sides of the maximum there are samples meaningfully below it,
 * and on both sides of the minimum samples meaningfully above it. A monotonic
 * arc fails because its extremes are its endpoints, with nothing beyond them.
 *
 * "Meaningfully" is a small fraction of the observed range, so that a single
 * noisy sample just inside the end of a rising run does not read as a turning
 * point.
 *
 * An earlier version of this also demanded two crossings of the midline, which
 * sounds stricter and is simply wrong: a sinusoid sampled over exactly one
 * period beginning at the midline crosses it once in the interior and twice at
 * the endpoints, so the most complete run imaginable was reported as partial.
 *
 * The test it replaces was "the samples include both signs", which is not a
 * statement about coverage at all: a few minutes either side of a zero crossing
 * satisfies it while sampling a few per cent of the amplitude, and a system
 * with a systemic velocity large enough that the curve never changes sign can
 * never satisfy it however long it is watched.
 *
 * @param {Array<{y: number}>} series - Samples, in order
 * @param {object} [options]
 * @param {number} [options.minSamples] - Fewest samples worth quoting
 * @returns {{halfRange: number, complete: boolean, min: number, max: number,
 *   midlineCrossings: number}|null} The estimate, or null when too short
 */
/**
 * How far the curve must retreat from an extreme, as a fraction of the observed
 * range, before that extreme counts as a turning point rather than the end of a
 * rising run with a noisy last sample.
 */
const TURNAROUND_FRACTION = 0.05;

export function halfRangeOfSeries(series, { minSamples = 12 } = {}) {
  if (!Array.isArray(series) || series.length < minSamples) return null;

  let lo = Infinity;
  let hi = -Infinity;
  let loAt = 0;
  let hiAt = 0;
  series.forEach((point, i) => {
    const y = Number(point?.y);
    if (!Number.isFinite(y)) return;
    if (y < lo) {
      lo = y;
      loAt = i;
    }
    if (y > hi) {
      hi = y;
      hiAt = i;
    }
  });
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;

  const range = hi - lo;
  const margin = range * TURNAROUND_FRACTION;

  /** Whether the curve retreats from an extreme on both sides of it. */
  const turnedAround = (at, isMax) => {
    let before = false;
    let after = false;
    for (let i = 0; i < series.length; i++) {
      const y = Number(series[i]?.y);
      if (!Number.isFinite(y)) continue;
      const retreated = isMax ? y <= hi - margin : y >= lo + margin;
      if (!retreated) continue;
      if (i < at) before = true;
      else if (i > at) after = true;
      if (before && after) return true;
    }
    return false;
  };

  // Reported for diagnostics rather than used as a gate; see the note above.
  const mid = (hi + lo) / 2;
  let midlineCrossings = 0;
  for (let i = 1; i < series.length; i++) {
    const before = Number(series[i - 1]?.y) - mid;
    const after = Number(series[i]?.y) - mid;
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    if (before === 0) continue;
    if ((before < 0 && after > 0) || (before > 0 && after < 0)) {
      midlineCrossings++;
    }
  }

  const complete =
    range > 0 && turnedAround(hiAt, true) && turnedAround(loAt, false);

  return {
    halfRange: (hi - lo) / 2,
    complete,
    min: lo,
    max: hi,
    midlineCrossings,
  };
}

/**
 * The largest offset from the origin in a recorded sky path.
 *
 * This is a maximum projected separation, not a semi-major axis. The barycenter
 * is at a *focus* of the star's orbit, so on an eccentric orbit the largest
 * offset is the apoapsis distance a(1 + e): for a = 1 AU and e = 0.5 it is
 * 1.5 AU, and calling that a measured semi-major axis is wrong by half the
 * eccentricity. The two coincide only for a circular orbit.
 *
 * Recovering a_star - and with it the astrometric signature a_star / d - means
 * fitting an ellipse to the path and locating its focus. That is a different
 * operation and is not what this does.
 *
 * @param {Array<{x: number, y: number}>} path - Points, in any order
 * @param {object} [options]
 * @param {number} [options.minPoints] - Fewest points worth quoting
 * @returns {number|null} The largest offset, in the path's own units
 */
export function maxOffsetOfPath(path, { minPoints = 8 } = {}) {
  if (!Array.isArray(path) || path.length < minPoints) return null;
  let max = 0;
  let seen = false;
  for (const point of path) {
    const r = Math.hypot(Number(point?.x), Number(point?.y));
    if (!Number.isFinite(r)) continue;
    seen = true;
    if (r > max) max = r;
  }
  return seen ? max : null;
}
