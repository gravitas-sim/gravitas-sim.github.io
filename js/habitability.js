// =============================================================================
// Habitability: what a planet receives, and where liquid water could be possible
// -----------------------------------------------------------------------------
// Pure physics. No DOM, no imports, everything in astronomical units and solar
// units, so the renderer, the lesson instruments and the tests all get the same
// numbers from the same functions.
//
// Two things this module deliberately fixes.
//
//   The habitable-zone renderer used to derive luminosity from mass as M^3.5
//   with a floor of 0.01 L_sun. For TRAPPIST-1, whose true luminosity is
//   0.000553 L_sun, that floor is wrong by a factor of eighteen and puts the
//   zone in the wrong place by a factor of four. Measured luminosity is used
//   whenever a star carries it, and the mass-luminosity relation is a clearly
//   labeled fallback for stars a user made up.
//
//   The zone edges used to come from an "optimism" slider that widened a band
//   around 1 AU by an arbitrary multiplier. They now come from a published
//   prescription, which is what makes the numbers checkable.
//
// A note on naming: "flux" is already taken in this codebase, by the transit
// light curve, where it means the relative brightness of a star as seen from
// outside. Here the quantity is the energy arriving at a planet, so it is
// called insolation or stellar flux, never bare "flux".
// =============================================================================

import { t } from './i18n/index.js';

/** Earth's insolation is the unit everything is quoted in: 1 at 1 AU from the Sun. */
export const EARTH_INSOLATION_WM2 = 1361;

/** The Sun's effective temperature, the reference point of the HZ polynomials. */
export const SUN_TEFF_K = 5780;

/**
 * Incident stellar energy at a planet, relative to what Earth gets from the Sun.
 *
 * The inverse-square law, and nothing else: S = L / d². A star is not running
 * out of light with distance; the same luminosity is spread over the surface of
 * an ever larger sphere, whose area goes as d².
 *
 * @param {number} luminositySolar - Stellar luminosity in solar units
 * @param {number} distanceAU - Orbital distance in AU
 * @returns {number} Insolation in Earth units (1.0 = what Earth receives)
 */
export function relativeInsolation(luminositySolar, distanceAU) {
  if (!(distanceAU > 0) || !Number.isFinite(luminositySolar)) return NaN;
  return luminositySolar / (distanceAU * distanceAU);
}

/**
 * The same quantity in SI, for a readout that wants real units.
 * @param {number} luminositySolar - Stellar luminosity in solar units
 * @param {number} distanceAU - Orbital distance in AU
 * @returns {number} Insolation in W/m²
 */
export const insolationWm2 = (luminositySolar, distanceAU) =>
  relativeInsolation(luminositySolar, distanceAU) * EARTH_INSOLATION_WM2;

/**
 * Distance at which a planet receives a given insolation.
 * @param {number} luminositySolar - Stellar luminosity in solar units
 * @param {number} insolation - Insolation in Earth units
 * @returns {number} Distance in AU
 */
export const distanceForInsolation = (luminositySolar, insolation) =>
  insolation > 0 ? Math.sqrt(luminositySolar / insolation) : NaN;

// --- Habitable zone boundaries -----------------------------------------------

// Kopparapu et al. (2013), ApJ 765, 131, with the coefficients from the 2014
// erratum (ApJ 787, L29), for a 1 Earth-mass planet. Each boundary is an
// effective stellar flux S_eff, in Earth units, expressed as a quartic in
// T* = T_eff - 5780 K:
//
//     S_eff = S_eff_sun + a T* + b T*^2 + c T*^3 + d T*^4
//
// and the boundary distance follows from the inverse-square law:
//
//     d = sqrt( (L / L_sun) / S_eff )   AU
//
// The four boundaries, from hottest to coldest:
//
//   Recent Venus       empirical: Venus has had no liquid water for ~1 Gyr
//   Runaway Greenhouse where a water-rich planet loses its oceans to space
//   Maximum Greenhouse the most a CO2 atmosphere can warm a surface
//   Early Mars         empirical: Mars appears to have had surface water
//
// The conservative zone is Runaway Greenhouse to Maximum Greenhouse; those two
// come from a climate model. The optimistic zone is Recent Venus to Early Mars;
// those two come from what the Solar System's own history rules out.
const BOUNDARIES = {
  recentVenus: {
    label: t('hz.recentVenus'),
    sun: 1.7763,
    a: 1.4335e-4,
    b: 3.3954e-9,
    c: -7.6364e-12,
    d: -1.195e-15,
  },
  runawayGreenhouse: {
    label: t('hz.runaway'),
    sun: 1.0385,
    a: 1.2456e-4,
    b: 1.4612e-8,
    c: -7.6345e-12,
    d: -1.7511e-15,
  },
  maximumGreenhouse: {
    label: t('hz.maximum'),
    sun: 0.3507,
    a: 5.9578e-5,
    b: 1.6707e-9,
    c: -3.0058e-12,
    d: -5.1925e-16,
  },
  earlyMars: {
    label: t('hz.earlyMars'),
    sun: 0.3207,
    a: 5.4471e-5,
    b: 1.5275e-9,
    c: -2.1709e-12,
    d: -3.8282e-16,
  },
};

/** The published fit is calibrated over this range of stellar temperature. */
export const HZ_TEFF_RANGE = { min: 2600, max: 7200 };

/**
 * Effective stellar flux at one habitable-zone boundary.
 * @param {string} boundary - Key from BOUNDARIES
 * @param {number} teffK - Stellar effective temperature, K
 * @returns {number} S_eff in Earth units
 */
export function effectiveFluxAt(boundary, teffK) {
  const c = BOUNDARIES[boundary];
  if (!c) return NaN;
  // Outside the fit's calibrated range the polynomial is evaluated at the
  // nearest calibrated temperature rather than extrapolated. A quartic run
  // past its data does not fail gracefully, and TRAPPIST-1 at 2566 K sits just
  // below the floor. The caller is told, through habitableZoneBounds().
  const t =
    Math.min(HZ_TEFF_RANGE.max, Math.max(HZ_TEFF_RANGE.min, teffK)) -
    SUN_TEFF_K;
  return c.sun + c.a * t + c.b * t ** 2 + c.c * t ** 3 + c.d * t ** 4;
}

/**
 * The habitable zone of a star.
 *
 * @param {Object} star
 * @param {number} star.luminositySolar - Luminosity in solar units
 * @param {number} star.teffK - Effective temperature in K
 * @param {string} [model] - 'conservative' or 'optimistic'
 * @returns {Object} Inner and outer edges in AU, with what set them
 */
export function habitableZoneBounds(
  { luminositySolar, teffK },
  model = 'conservative'
) {
  const optimistic = model === 'optimistic';
  const innerKey = optimistic ? 'recentVenus' : 'runawayGreenhouse';
  const outerKey = optimistic ? 'earlyMars' : 'maximumGreenhouse';

  const innerFlux = effectiveFluxAt(innerKey, teffK);
  const outerFlux = effectiveFluxAt(outerKey, teffK);
  const inner = distanceForInsolation(luminositySolar, innerFlux);
  const outer = distanceForInsolation(luminositySolar, outerFlux);

  return {
    model: optimistic ? 'optimistic' : 'conservative',
    innerAU: inner,
    outerAU: outer,
    innerFlux,
    outerFlux,
    innerLabel: BOUNDARIES[innerKey].label,
    outerLabel: BOUNDARIES[outerKey].label,
    // True when the star is outside the range the published fit covers, so a
    // caller can say so instead of quoting an extrapolation as a measurement.
    extrapolated: teffK < HZ_TEFF_RANGE.min || teffK > HZ_TEFF_RANGE.max,
    teffUsed: Math.min(HZ_TEFF_RANGE.max, Math.max(HZ_TEFF_RANGE.min, teffK)),
  };
}

/**
 * Where a planet sits relative to the zone.
 *
 * Returns a status word rather than a boolean, because "inside" and "outside"
 * are not the only useful answers: a planet just past an edge is a different
 * kind of object from one ten times too close.
 *
 * @param {number} distanceAU - Orbital distance
 * @param {Object} bounds - From habitableZoneBounds()
 * @returns {Object} status, a label, and how far in or out
 */
export function habitableZoneStatus(distanceAU, bounds) {
  const { innerAU, outerAU } = bounds;
  if (
    !(distanceAU > 0) ||
    !Number.isFinite(innerAU) ||
    !Number.isFinite(outerAU)
  ) {
    return { status: 'unknown', label: 'not known' };
  }
  if (distanceAU < innerAU) {
    return {
      status: 'inner',
      label: 'closer than the inner edge',
      // How far inside, as a fraction of the zone's own width: a scale a
      // student can read without knowing the star.
      offsetZoneWidths: (innerAU - distanceAU) / (outerAU - innerAU),
    };
  }
  if (distanceAU > outerAU) {
    return {
      status: 'outer',
      label: 'beyond the outer edge',
      offsetZoneWidths: (distanceAU - outerAU) / (outerAU - innerAU),
    };
  }
  return {
    status: 'inside',
    label: 'within the modeled zone',
    // 0 at the inner edge, 1 at the outer edge.
    positionInZone: (distanceAU - innerAU) / (outerAU - innerAU),
  };
}

// --- Stars whose luminosity nobody measured ----------------------------------

/**
 * A luminosity for a star that does not carry one.
 *
 * An approximation, and labeled as one. The main-sequence mass-luminosity
 * relation is a broken power law rather than a single exponent, so the
 * piecewise form below is used; it is still only good to a factor of order two
 * for the lowest masses, and it says nothing at all about a star that has left
 * the main sequence. Any star with a measured luminosity should use it instead.
 *
 * @param {number} massSolar - Stellar mass in solar masses
 * @returns {number} Estimated luminosity in solar units
 */
export function estimateLuminosityFromMass(massSolar) {
  const m = Number(massSolar);
  if (!(m > 0)) return NaN;
  if (m < 0.43) return 0.23 * m ** 2.3;
  if (m < 2) return m ** 4;
  if (m < 55) return 1.4 * m ** 3.5;
  return 32000 * m;
}

/**
 * An effective temperature for a star that does not carry one.
 * @param {number} massSolar - Stellar mass in solar masses
 * @returns {number} Estimated effective temperature in K
 */
export function estimateTeffFromMass(massSolar) {
  const m = Number(massSolar);
  if (!(m > 0)) return NaN;
  // A rough main-sequence fit, adequate for placing a zone but no more.
  return 5780 * m ** 0.55;
}

/**
 * Read the properties the habitable-zone model needs off a simulation star.
 *
 * Measured values win. A star built by a scenario from real data carries
 * luminosityInSuns and temperature; a star a user dropped on the canvas carries
 * only a mass, and gets estimates.
 *
 * @param {Object} star - A simulation star object
 * @param {number} solarMassUnit - Mass units in one solar mass
 * @returns {Object} luminositySolar, teffK, and whether either was estimated
 */
export function stellarPropertiesFor(star, solarMassUnit = 1000) {
  const massSolar =
    Number.isFinite(star?.massInSuns) && star.massInSuns > 0
      ? star.massInSuns
      : (star?.mass ?? 0) / solarMassUnit;

  const measuredL =
    Number.isFinite(star?.luminosityInSuns) && star.luminosityInSuns > 0
      ? star.luminosityInSuns
      : null;
  const measuredT =
    Number.isFinite(star?.temperature) && star.temperature > 0
      ? star.temperature
      : null;

  return {
    massSolar,
    luminositySolar: measuredL ?? estimateLuminosityFromMass(massSolar),
    teffK: measuredT ?? estimateTeffFromMass(massSolar),
    luminosityEstimated: measuredL === null,
    teffEstimated: measuredT === null,
  };
}

// --- Eccentric orbits ---------------------------------------------------------

/**
 * Solve Kepler's equation for the eccentric anomaly.
 *
 * Newton's method, which converges in a handful of iterations for the
 * eccentricities this is used at. Needed because a planet does not move round
 * an ellipse at a constant rate, and an animation that pretends it does gets
 * the whole point of this section backwards: the planet spends most of its year
 * in the cold, slow, outer part of the orbit.
 *
 * @param {number} M - Mean anomaly, radians
 * @param {number} e - Eccentricity
 * @returns {number} Eccentric anomaly, radians
 */
export function eccentricAnomaly(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - M;
    const df = 1 - e * Math.cos(E);
    const step = f / df;
    E -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return E;
}

/**
 * Where a planet is, and what it is receiving, at a given point in its year.
 *
 * @param {Object} orbit
 * @param {number} orbit.semiMajorAU - Semi-major axis
 * @param {number} orbit.eccentricity - Eccentricity
 * @param {number} orbit.luminositySolar - Stellar luminosity in solar units
 * @param {number} phase - Fraction of the orbital period elapsed, 0 to 1
 * @returns {Object} distance, insolation, and the position for drawing
 */
export function orbitalStateAt(
  { semiMajorAU, eccentricity, luminositySolar },
  phase
) {
  const M = 2 * Math.PI * (phase - Math.floor(phase));
  const E = eccentricAnomaly(M, eccentricity);
  const distanceAU = semiMajorAU * (1 - eccentricity * Math.cos(E));
  // True anomaly, for drawing the planet in the right place on the ellipse.
  const trueAnomaly =
    2 *
    Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
    );
  return {
    distanceAU,
    trueAnomaly,
    insolation: relativeInsolation(luminositySolar, distanceAU),
    x: distanceAU * Math.cos(trueAnomaly),
    y: distanceAU * Math.sin(trueAnomaly),
  };
}

/** Periapsis and apoapsis distances and insolations. */
export function orbitExtremes({ semiMajorAU, eccentricity, luminositySolar }) {
  const peri = semiMajorAU * (1 - eccentricity);
  const apo = semiMajorAU * (1 + eccentricity);
  return {
    periapsisAU: peri,
    apoapsisAU: apo,
    periapsisInsolation: relativeInsolation(luminositySolar, peri),
    apoapsisInsolation: relativeInsolation(luminositySolar, apo),
  };
}

/**
 * The fraction of a planet's year spent inside the zone.
 *
 * Time, not arc: sampling evenly in mean anomaly samples evenly in time, which
 * is exactly the thing that makes this number worth computing. A planet on an
 * eccentric orbit sweeps through its hot periapsis quickly and dawdles through
 * the cold outer half, so the fraction of the *path* inside the zone and the
 * fraction of the *year* inside it are different numbers.
 *
 * @param {Object} orbit - semiMajorAU, eccentricity, luminositySolar
 * @param {Object} bounds - From habitableZoneBounds()
 * @param {number} [samples] - Samples in mean anomaly
 * @returns {number} Fraction between 0 and 1
 */
export function fractionOfYearInZone(orbit, bounds, samples = 4000) {
  if (!Number.isFinite(bounds?.innerAU) || !Number.isFinite(bounds?.outerAU)) {
    return NaN;
  }
  let inside = 0;
  for (let i = 0; i < samples; i++) {
    const { distanceAU } = orbitalStateAt(orbit, (i + 0.5) / samples);
    if (distanceAU >= bounds.innerAU && distanceAU <= bounds.outerAU) inside++;
  }
  return inside / samples;
}
