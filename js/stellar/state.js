// =============================================================================
// One description of a star, wherever it came from
// -----------------------------------------------------------------------------
// Four different parts of this application used to work out how hot a star is,
// and they disagreed. The inspector had a linear fit in mass; the habitable
// zone had a power law; the light curve had a third relation for the radius;
// and a star built from a real catalogue carried measured values that only one
// of the three ever looked at, so TRAPPIST-1 was drawn with a habitable zone
// from its measured 2566 K and an inspector card claiming 3350 K.
//
// This is the one description. Everything about a star that is not its position
// and velocity comes out of here, and it says on every field how it was
// arrived at:
//
//   'track'      a MIST evolutionary model, at a stated age
//   'declared'   values a scenario supplied, usually from a real catalogue
//   'estimated'  a main-sequence relation applied to a mass, because that is
//                all there was
//
// The last of those is the common case in the sandbox, where a star is a mass
// and nothing else, and it is honest about being a guess: `estimated` is true
// and `estimatedFields` names exactly which numbers were invented.
//
// The three radii
// -----------------------------------------------------------------------------
// `radiusSun` here is the photosphere: a physical length in solar radii. It is
// not `obj.radius`, which is the simulation's collision radius in its own
// units, and it is not the drawn size, which js/bodyVisuals.js compresses on
// purpose. Nothing in this file touches either of the other two.
// =============================================================================

import {
  estimateLuminosityFromMass,
  estimateTeffFromMass,
  estimateMainSequenceLifetime,
} from './mainSequence.js';
import {
  radiusFromLuminosityAndTemperature,
  temperatureFromLuminosityAndRadius,
  luminosityFromRadiusAndTemperature,
  luminosityClass,
} from './geometry.js';

/** The phases a state can report. Track segments use the same vocabulary. */
export const PHASES = Object.freeze([
  'pre-main-sequence',
  'main-sequence',
  'red-giant-branch',
  'post-main-sequence-expansion',
  'helium-ignition',
  'core-helium-burning',
  'early-asymptotic-giant-branch',
  'thermally-pulsing-agb',
  'advanced-burning',
  'post-agb-and-cooling',
  'white-dwarf',
  'neutron-star',
  'black-hole',
  'unknown',
]);

/** Where a number came from. */
export const ORIGIN = Object.freeze({
  TRACK: 'track',
  DECLARED: 'declared',
  ESTIMATED: 'estimated',
});

/**
 * Build a stellar state, filling what is missing and recording what was filled.
 *
 * The precedence is fixed and is the whole point: a declared value is never
 * overwritten by an estimate, and two declared values are never contradicted by
 * a third that is derived from them. Given a luminosity and a temperature the
 * radius follows; given a radius and a temperature the luminosity follows;
 * given only a mass, everything is a main-sequence guess and says so.
 *
 * @param {object} spec
 * @param {number} spec.massSun - Current mass, solar masses. The one required field
 * @param {number} [spec.initialMassSun] - Defaults to the current mass
 * @param {?number} [spec.teffK] - Declared effective temperature
 * @param {?number} [spec.luminositySun] - Declared bolometric luminosity
 * @param {?number} [spec.radiusSun] - Declared photospheric radius
 * @param {?number} [spec.ageYr] - Declared age
 * @param {string} [spec.phase] - Declared evolutionary phase
 * @param {string} [spec.source] - Overrides the origin label
 * @param {object} [spec.extra] - Fields to carry through untouched
 * @returns {object} A frozen stellar state
 */
export function stellarState({
  massSun,
  initialMassSun = null,
  teffK = null,
  luminositySun = null,
  radiusSun = null,
  ageYr = null,
  phase = null,
  source = null,
  extra = null,
} = {}) {
  const m = Number.isFinite(massSun) && massSun > 0 ? massSun : NaN;
  const estimatedFields = [];
  const has = v => Number.isFinite(v) && v > 0;

  let L = has(luminositySun) ? luminositySun : null;
  let T = has(teffK) ? teffK : null;
  let R = has(radiusSun) ? radiusSun : null;

  // Close the triangle from whichever two are known, before falling back.
  if (L === null && T !== null && R !== null) {
    L = luminosityFromRadiusAndTemperature(R, T);
  } else if (T === null && L !== null && R !== null) {
    T = temperatureFromLuminosityAndRadius(L, R);
  } else if (R === null && L !== null && T !== null) {
    R = radiusFromLuminosityAndTemperature(L, T);
  }

  // Still short: guess from the mass, on the main sequence, and admit it.
  if (L === null) {
    L = estimateLuminosityFromMass(m);
    estimatedFields.push('luminositySun');
  }
  if (T === null) {
    T = estimateTeffFromMass(m);
    estimatedFields.push('teffK');
  }
  if (R === null) {
    R = radiusFromLuminosityAndTemperature(L, T);
    // Derived, not guessed - but only as good as whatever produced L and T.
    if (estimatedFields.length) estimatedFields.push('radiusSun');
  }

  const declaredPhase = typeof phase === 'string' && PHASES.includes(phase);
  const estimated = estimatedFields.length > 0;
  const msLifetime = estimateMainSequenceLifetime(m);

  return Object.freeze({
    source:
      source ||
      (estimated
        ? ORIGIN.ESTIMATED
        : declaredPhase
          ? ORIGIN.DECLARED
          : ORIGIN.DECLARED),
    trackId: null,
    initialMassSun: has(initialMassSun) ? initialMassSun : m,
    currentMassSun: m,
    ageYr: Number.isFinite(ageYr) && ageYr >= 0 ? ageYr : null,
    ageZeroPoint: null,
    teffK: T,
    luminositySun: L,
    radiusSun: R,
    phase: declaredPhase ? phase : estimated ? 'main-sequence' : 'unknown',
    phaseStartYr: null,
    phaseEndYr: null,
    phaseDurationYr: null,
    luminosityClass: luminosityClass(R, L),
    // An estimate, and marked as one: where a track exists it reports the
    // lifetime MESA integrated, which is a different and better number.
    mainSequenceYr: msLifetime,
    remainingMainSequenceYr:
      Number.isFinite(ageYr) && ageYr >= 0
        ? Math.max(0, msLifetime - ageYr)
        : null,
    mainSequenceFraction:
      Number.isFinite(ageYr) && ageYr >= 0 && msLifetime > 0
        ? Math.min(1, ageYr / msLifetime)
        : null,
    composition: null,
    rotation: null,
    grid: null,
    estimated,
    /** Exactly which numbers were not supplied and had to be guessed. */
    estimatedFields: Object.freeze(estimatedFields),
    ...(extra ? { extra: Object.freeze({ ...extra }) } : {}),
  });
}

/**
 * The stellar state of a simulation body.
 *
 * Reads whatever the body happens to carry - a real catalogue star has a
 * measured temperature and luminosity, a generated one has a mass - and returns
 * the same shape either way.
 *
 * @param {object} star - A StarObject, or anything with a mass
 * @param {number} [solarMassUnit] - Simulation mass units per solar mass
 * @returns {object} A stellar state
 */
export function stellarStateFor(star, solarMassUnit = 1000) {
  const massSun = Number.isFinite(star?.massInSuns)
    ? star.massInSuns
    : Number.isFinite(star?.mass)
      ? star.mass / solarMassUnit
      : NaN;
  return stellarState({
    massSun,
    initialMassSun: star?.initialMassInSuns ?? null,
    teffK: star?.temperature ?? null,
    luminositySun: star?.luminosityInSuns ?? null,
    radiusSun: star?.radiusInSuns ?? null,
    ageYr: star?.ageYr ?? null,
    phase: star?.stellarPhase ?? null,
  });
}

/**
 * Whether the habitable-zone model has anything to say about this star.
 *
 * The Kopparapu parameterisation the habitability module uses is fitted for
 * main-sequence stars between 2600 K and 7200 K. A red giant is outside it in
 * both senses - the fit does not cover the temperature, and the concept of a
 * stable zone does not survive a star whose luminosity is changing by a factor
 * of a thousand - so the honest answer is that the tool does not apply rather
 * than a zone drawn from an extrapolated polynomial.
 *
 * @param {object} state - From stellarState() or the track API
 * @returns {{ok: boolean, reason: ?string}} Whether, and why not
 */
export function supportsHabitableZone(state) {
  if (!state || !Number.isFinite(state.teffK)) {
    return { ok: false, reason: 'no-temperature' };
  }
  if (
    state.phase &&
    state.phase !== 'main-sequence' &&
    state.phase !== 'unknown'
  ) {
    return { ok: false, reason: 'not-main-sequence' };
  }
  if (state.teffK < 2600 || state.teffK > 7200) {
    return { ok: false, reason: 'outside-fit' };
  }
  return { ok: true, reason: null };
}

/**
 * Whether the transit photometry model has anything to say about this star.
 *
 * It needs a physical radius, and it assumes the star is not changing size
 * appreciably over the observation. Both hold for a main-sequence star and
 * neither is safe on the asymptotic giant branch.
 *
 * @param {object} state - A stellar state
 * @returns {{ok: boolean, reason: ?string}} Whether, and why not
 */
export function supportsTransitPhotometry(state) {
  if (!state || !Number.isFinite(state.radiusSun) || !(state.radiusSun > 0)) {
    return { ok: false, reason: 'no-radius' };
  }
  const unstable = new Set([
    'pre-main-sequence',
    'thermally-pulsing-agb',
    'post-agb-and-cooling',
    'advanced-burning',
  ]);
  if (unstable.has(state.phase)) return { ok: false, reason: 'phase-unstable' };
  return { ok: true, reason: null };
}

/**
 * A spectral type from an effective temperature.
 *
 * The Morgan-Keenan boundaries, which are defined on temperature. The
 * inspector used to derive this from mass, which is only right for a
 * main-sequence star and is silently wrong for every other kind.
 *
 * @param {number} teffK - Effective temperature, kelvin
 * @returns {string} One of O B A F G K M, or '?'
 */
export function spectralType(teffK) {
  if (!Number.isFinite(teffK) || teffK <= 0) return '?';
  if (teffK >= 30000) return 'O';
  if (teffK >= 10000) return 'B';
  if (teffK >= 7500) return 'A';
  if (teffK >= 6000) return 'F';
  if (teffK >= 5200) return 'G';
  if (teffK >= 3700) return 'K';
  return 'M';
}
