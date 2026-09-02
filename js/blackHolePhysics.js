// =============================================================================
// Black hole physics: one place that knows what a mass implies
// -----------------------------------------------------------------------------
// The object inspector has always shown a black hole's Schwarzschild radius,
// average density, Hawking temperature and evaporation lifetime. The "Black
// Holes by the Numbers" investigation asks a student to discover the trends in
// exactly those four quantities, so they are computed here and consumed in both
// places. A lesson that disagreed with the inspector by a factor of two would
// be worse than no lesson at all.
//
// Everything is a Schwarzschild black hole: non-rotating and uncharged. Real
// astrophysical black holes spin, which changes the horizon geometry; the
// lesson says so out loud rather than quietly pretending otherwise.
//
// No DOM, no canvas. Pure numbers in SI, plus the formatting helpers that turn
// them into something a non-science major can read. The one import is
// js/format.js, which is equally pure: the superscript table and the
// scientific-notation routine used to be duplicated here, which is how the same
// quantity came to be written two ways in one interface.
// =============================================================================

import { G_SI, C_SI, SOLAR_MASS_KG, EARTH_RADIUS_M } from './constants.js';
import { t } from './i18n/index.js';
import {
  superscript as formatSuperscript,
  scientific,
  withUnit,
} from './format.js';

/** Gravitational constant, m³ kg⁻¹ s⁻². */
export { G_SI };
/** Speed of light in vacuum, m/s. */
export { C_SI };
/** Reduced Planck constant, J s. */
export const HBAR = 1.054571817e-34;
/** Boltzmann constant, J/K. */
export const K_B = 1.380649e-23;

/** One solar mass, kg. */
export { SOLAR_MASS_KG };
/** One solar radius, m. */
export const SOLAR_RADIUS_M = 6.957e8;
/** Earth's equatorial radius, m. */
export { EARTH_RADIUS_M };
/** One astronomical unit, m. */
export const AU_M = 1.496e11;
/** Seconds in a Julian year. */
export const SECONDS_PER_YEAR = 3.15576e7;

/** Age of the universe, years. Planck 2018. */
export const AGE_OF_UNIVERSE_YEARS = 1.38e10;
/** Temperature of the cosmic microwave background, K. */
export const CMB_TEMPERATURE_K = 2.725;

/**
 * Schwarzschild radius: the radius of the event horizon of a non-rotating
 * black hole. R_s = 2GM/c².
 * @param {number} massKg - Mass in kilograms
 * @returns {number} Radius in meters
 */
export const schwarzschildRadiusM = massKg =>
  (2 * G_SI * massKg) / (C_SI * C_SI);

/**
 * Newtonian escape speed, used only for the pedagogical squeeze-the-Sun panel.
 * The event horizon itself is a general-relativistic object; this expression
 * happens to give the right radius for the wrong reason, which is a point the
 * lesson makes explicitly rather than glossing over.
 * @param {number} massKg - Mass in kilograms
 * @param {number} radiusM - Radius in meters
 * @returns {number} Escape speed in m/s
 */
export const newtonianEscapeSpeed = (massKg, radiusM) =>
  radiusM > 0 ? Math.sqrt((2 * G_SI * massKg) / radiusM) : Infinity;

/**
 * Everything the inspector and the lesson need about a black hole of a given
 * mass.
 *
 * `density` is deliberately named for what it is: the mass divided by the
 * volume of a sphere whose radius is the Schwarzschild radius. It is a
 * comparison quantity, not a claim that the interior is a uniform ball of
 * stuff at that density.
 *
 * @param {number} massInSuns - Mass in solar masses
 * @returns {Object} Derived quantities in SI, plus friendlier units
 */
export function blackHoleFacts(massInSuns) {
  const suns = Number(massInSuns);
  const massKg = suns * SOLAR_MASS_KG;
  const rsM = schwarzschildRadiusM(massKg);
  const volumeM3 = (4 / 3) * Math.PI * rsM ** 3;
  const density = volumeM3 > 0 ? massKg / volumeM3 : Infinity;
  // T = hbar c³ / (8 pi G M k_B)
  const temperature = (HBAR * C_SI ** 3) / (8 * Math.PI * G_SI * massKg * K_B);
  // t = 5120 pi G² M³ / (hbar c⁴)
  const lifetimeSeconds =
    (5120 * Math.PI * G_SI ** 2 * massKg ** 3) / (HBAR * C_SI ** 4);
  const lifetimeYears = lifetimeSeconds / SECONDS_PER_YEAR;
  // Innermost stable circular orbit sits at 3 R_s for a Schwarzschild hole.
  const iscoRadiusM = 3 * rsM;
  const iscoPeriodSeconds =
    2 * Math.PI * Math.sqrt(iscoRadiusM ** 3 / (G_SI * massKg));

  return {
    massInSuns: suns,
    massKg,
    rsM,
    rsKm: rsM / 1000,
    rsAU: rsM / AU_M,
    rsInSolarRadii: rsM / SOLAR_RADIUS_M,
    rsInEarthRadii: rsM / EARTH_RADIUS_M,
    volumeM3,
    density,
    temperature,
    lifetimeSeconds,
    lifetimeYears,
    lifetimeInUniverseAges: lifetimeYears / AGE_OF_UNIVERSE_YEARS,
    timesColderThanCMB: CMB_TEMPERATURE_K / temperature,
    iscoPeriodSeconds,
    iscoPeriodHours: iscoPeriodSeconds / 3600,
    category: blackHoleCategory(suns),
  };
}

/**
 * The conventional mass class. The boundaries are conventions rather than
 * anything the physics cares about, and the lesson says so.
 * @param {number} massInSuns - Mass in solar masses
 * @returns {string} 'Primordial', 'Stellar-Mass', 'Intermediate' or 'Supermassive'
 */
export function blackHoleCategory(massInSuns) {
  if (massInSuns > 1e6) return 'Supermassive';
  if (massInSuns > 100) return 'Intermediate';
  if (massInSuns > 3) return 'Stellar-Mass';
  return 'Primordial';
}

// --- Reference objects, for comparison panels --------------------------------

/** Familiar things a horizon can be measured against, radius in meters. */
export const BENCHMARKS = {
  manhattanLength: {
    get label() {
      return t('bhP.manhattanEndToEnd');
    },
    m: 21600,
  },
  earthRadius: {
    get label() {
      return t('bhP.earthSRadius');
    },
    m: EARTH_RADIUS_M,
  },
  sunRadius: {
    get label() {
      return t('bhP.theSunSRadius');
    },
    m: SOLAR_RADIUS_M,
  },
  mercuryOrbit: {
    get label() {
      return t('bhP.mercurySOrbit');
    },
    m: 0.387 * AU_M,
  },
};

/** Densities to hang a black hole's average density against, kg/m³. */
export const DENSITY_MARKS = [
  {
    get label() {
      return t('bhP.airAtSeaLevel');
    },
    value: 1.2,
  },
  {
    get label() {
      return t('bhP.water');
    },
    value: 1000,
  },
  {
    get label() {
      return t('bhP.theSunOnAverage');
    },
    value: 1408,
  },
  {
    get label() {
      return t('bhP.rock');
    },
    value: 3000,
  },
  {
    get label() {
      return t('bhP.lead');
    },
    value: 11340,
  },
  {
    get label() {
      return t('bhP.aWhiteDwarf');
    },
    value: 1e9,
  },
  {
    get label() {
      return t('bhP.anAtomicNucleus');
    },
    value: 2.3e17,
  },
];

/** Temperatures to hang a Hawking temperature against, K. */
export const TEMPERATURE_MARKS = [
  {
    get label() {
      return t('bhP.theSurfaceOfTheSun');
    },
    value: 5772,
  },
  {
    get label() {
      return t('bhP.roomTemperature');
    },
    value: 293,
  },
  {
    get label() {
      return t('bhP.liquidNitrogen');
    },
    value: 77,
  },
  {
    get label() {
      return t('bhP.theMicrowaveBackground');
    },
    value: CMB_TEMPERATURE_K,
  },
  {
    get label() {
      return t('bhP.theColdestLabExperiment');
    },
    value: 3.8e-11,
  },
];

/** Timespans to hang an evaporation lifetime against, years. */
export const TIME_MARKS = [
  {
    get label() {
      return t('bhP.aHumanLifetime');
    },
    value: 80,
  },
  {
    get label() {
      return t('bhP.sinceTheDinosaurs');
    },
    value: 6.6e7,
  },
  {
    get label() {
      return t('bhP.ageOfTheUniverse');
    },
    value: AGE_OF_UNIVERSE_YEARS,
  },
  {
    get label() {
      return t('bhP.theLastStarBurnsOut');
    },
    value: 1e14,
  },
];

// --- Formatting for people who are not comfortable with 10^67 ----------------
//
// Every value is bound to whatever follows it with a non-breaking space, symbol
// or word alike. These are readout items, not sentences: "29.5" on one line and
// "km" on the next is never what was wanted.

/**
 * Render an integer as Unicode superscript digits, so a canvas and an HTML
 * readout can show the same string without one of them needing markup.
 *
 * Re-exported rather than reimplemented: this file used to carry its own
 * superscript table and its own scientific-notation routine, which is how the
 * same quantity came to be written two ways in one interface.
 *
 * @param {number} n - Integer exponent
 * @returns {string} e.g. '⁻¹⁴'
 */
export const superscript = formatSuperscript;

/**
 * Scientific notation a student can read aloud: "1.8 × 10¹⁹".
 *
 * Takes decimal places in the mantissa, which is how every caller here asks for
 * it, and hands that to the shared formatter as a significant-figure count. A
 * mantissa of exactly 1 is dropped, because "10¹⁹" reads better aloud than
 * "1.0 × 10¹⁹" and nothing on these panels is being lined up in a column.
 *
 * @param {number} v - The value
 * @param {number} [digits] - Digits after the decimal point in the mantissa
 * @returns {string} Formatted value
 */
export function sci(v, digits = 1) {
  return scientific(v, digits + 1, true);
}

/**
 * A number written out with thousands separators.
 * @param {number} v - The value
 * @param {number} [digits] - Decimal places
 * @returns {string} e.g. '1,000,000'
 */
export const commas = (v, digits = 0) =>
  Number(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * A mass in solar masses, written the way it would be said out loud. Small
 * masses get every digit, large ones get "million" and "billion", because
 * "4,300,000" stops meaning anything somewhere around the third comma.
 * @param {number} suns - Mass in solar masses
 * @returns {string} e.g. '8 M☉' or '4.3 million M☉'
 */
export function massLabel(suns) {
  if (!Number.isFinite(suns)) return '-';
  if (suns < 10) return withUnit(String(Number(suns.toFixed(1))), 'M☉');
  if (suns < 1e6) return withUnit(commas(Math.round(suns)), 'M☉');
  if (suns < 1e9)
    return withUnit(String(Number((suns / 1e6).toPrecision(2))), 'million M☉');
  if (suns < 1e12)
    return withUnit(String(Number((suns / 1e9).toPrecision(2))), 'billion M☉');
  return withUnit(sci(suns), 'M☉');
}

/**
 * A length in whichever familiar unit keeps the number small.
 * @param {number} meters - The length
 * @returns {string} e.g. '29.5 km' or '0.085 AU'
 */
export function lengthLabel(meters) {
  if (!Number.isFinite(meters)) return '-';
  const km = meters / 1000;
  if (km < 0.001) return withUnit(commas(meters, 2), 'm');
  if (km < 1000) return withUnit(String(Number(km.toPrecision(3))), 'km');
  if (meters < 0.02 * AU_M) return withUnit(commas(Math.round(km)), 'km');
  const au = meters / AU_M;
  if (au < 1000) return withUnit(String(Number(au.toPrecision(3))), 'AU');
  return withUnit(sci(au), 'AU');
}

/**
 * A span of years, kept readable across sixty orders of magnitude.
 * @param {number} years - The span
 * @returns {string} e.g. '13.8 billion years' or '2.1 × 10⁶⁷ years'
 */
export function yearsLabel(years) {
  if (!Number.isFinite(years)) return '-';
  if (years < 1e6) return withUnit(commas(Math.round(years)), 'years');
  if (years < 1e9)
    return withUnit(
      String(Number((years / 1e6).toPrecision(3))),
      'million years'
    );
  if (years < 1e12)
    return withUnit(
      String(Number((years / 1e9).toPrecision(3))),
      'billion years'
    );
  // Trillions are the last word most people have a feel for; past that the
  // only honest thing to write down is the exponent.
  if (years < 1e15)
    return withUnit(
      String(Number((years / 1e12).toPrecision(3))),
      'trillion years'
    );
  return withUnit(sci(years), 'years');
}

/**
 * A density, in kg/m³, with a familiar comparison where one is close enough
 * to be useful.
 * @param {number} kgPerM3 - The density
 * @returns {string} Formatted density
 */
export function densityLabel(kgPerM3) {
  if (!Number.isFinite(kgPerM3)) return '-';
  if (kgPerM3 >= 1e5 || kgPerM3 < 0.01) return withUnit(sci(kgPerM3), 'kg/m³');
  return withUnit(commas(Math.round(kgPerM3)), 'kg/m³');
}

/**
 * A ratio expressed in words rather than as a bare exponent, because "a
 * hundred thousand times" lands and "10⁵ times" does not.
 * @param {number} ratio - The multiplier
 * @returns {string} e.g. '1,000 times' or '10¹² times'
 */
export function timesLabel(ratio) {
  if (!Number.isFinite(ratio)) return '-';
  if (ratio < 1) return withUnit(String(Number(ratio.toPrecision(2))), 'times');
  if (ratio < 1e4) return withUnit(commas(Math.round(ratio)), 'times');
  if (ratio < 1e6)
    return withUnit(commas(Math.round(ratio / 1e3)), 'thousand times');
  if (ratio < 1e9)
    return withUnit(
      String(Number((ratio / 1e6).toPrecision(2))),
      'million times'
    );
  if (ratio < 1e12)
    return withUnit(
      String(Number((ratio / 1e9).toPrecision(2))),
      'billion times'
    );
  return withUnit(sci(ratio), 'times');
}
