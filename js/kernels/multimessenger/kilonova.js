// =============================================================================
// An expanding-blackbody kilonova: a bounded, illustrative model
// -----------------------------------------------------------------------------
// The optical and infrared counterpart of a neutron-star merger is modelled here
// as a sphere that expands at a stated speed and cools by a stated law, radiating
// as a blackbody. This is the simplest member of the class of models used to read
// kilonova colours in the literature (Li and Paczynski 1998 introduced the
// signal; blackbody fits to the early photospheric phase are the common first
// reading). It is a CONTINUUM model of the early, optically thick phase only:
//
//   R(t) = v t                              (free expansion from t = 0)
//   T(t) = max(T_floor, T0 (t / t_ref)^-p)  (a power-law cooling to a floor)
//   L(t) = 4 pi R^2 sigma T^4,  f_lambda at the observer = (R/D)^2 pi B_lambda(T)
//
// What it is NOT: not fitted to any event; its default parameters are
// illustrative inputs, not results; it has no line features, no opacity, no
// heating rate and no dependence on the ejected mass, so NOTHING here can be
// inverted for a mass or a heavy-element yield (and the module offers no such
// function). Outside its declared time domain the model is refused unless the
// caller says allowOutside, and the result then says it is outside.
// =============================================================================

import { SIGMA_SB } from '../radiation/constants.js';
import {
  abMag,
  blackbodyColor,
  blackbodySed,
} from '../radiation/photometry.js';
import { C_LIGHT, MPC_M, DAY_S, finite, refuse } from './constants.js';

/**
 * ILLUSTRATIVE parameters (not fitted to any observation; no published result).
 * velocityC in units of c, T0K at tRefDays, domainDays the model's stated validity.
 */
export const ILLUSTRATIVE_PARAMETERS = Object.freeze({
  label:
    'ILLUSTRATIVE parameters of the expanding-blackbody model: chosen for demonstration, not fitted to any observation',
  velocityC: 0.2,
  T0K: 6000,
  tRefDays: 1,
  coolingExponent: 0.6,
  floorK: 2200,
  domainDays: Object.freeze([0.25, 15]),
});

function checkParameters(p) {
  const v = finite(p.velocityC, 'velocityC');
  if (!(v > 0 && v < 1))
    refuse(
      'bad-velocity',
      'the expansion speed is between 0 and 1 (units of c)'
    );
  for (const k of ['T0K', 'floorK']) {
    if (!(finite(p[k], k) > 0))
      refuse('bad-temperature', `${k} must be positive`);
  }
  if (!(finite(p.tRefDays, 'tRefDays') > 0))
    refuse('bad-parameter', 'tRefDays must be positive');
  if (!(finite(p.coolingExponent, 'coolingExponent') >= 0))
    refuse('bad-parameter', 'the cooling exponent is not negative');
  if (p.floorK > p.T0K)
    refuse('bad-parameter', 'the temperature floor is above T0');
  const [a, b] = p.domainDays ?? [];
  if (!(a > 0 && b > a))
    refuse(
      'bad-parameter',
      'domainDays is [first, last] with 0 < first < last'
    );
}

/**
 * The photosphere at a time after the merger.
 * @param {object} params - see ILLUSTRATIVE_PARAMETERS
 * @param {number} tDays
 * @param {{allowOutside?: boolean}} [opts]
 * @returns {{tDays: number, radiusM: number, temperatureK: number, luminosityW: number, atFloor: boolean,
 *   outOfDomain: boolean}}
 */
export function kilonovaState(params, tDays, { allowOutside = false } = {}) {
  checkParameters(params);
  if (!(finite(tDays, 'tDays') > 0))
    refuse(
      'out-of-domain',
      'time is measured after the merger and is positive'
    );
  const outOfDomain =
    tDays < params.domainDays[0] || tDays > params.domainDays[1];
  if (outOfDomain && !allowOutside)
    refuse(
      'out-of-domain',
      `the model is stated for ${params.domainDays[0]} to ${params.domainDays[1]} days; ${tDays} is outside (pass allowOutside to see it anyway)`
    );
  const radiusM = params.velocityC * C_LIGHT * tDays * DAY_S;
  const raw = params.T0K * (tDays / params.tRefDays) ** -params.coolingExponent;
  const temperatureK = Math.max(params.floorK, raw);
  return {
    tDays,
    radiusM,
    temperatureK,
    luminosityW: 4 * Math.PI * radiusM * radiusM * SIGMA_SB * temperatureK ** 4,
    atFloor: raw <= params.floorK,
    outOfDomain,
  };
}

/**
 * AB magnitude of the sphere in a band at a distance.
 * @param {object} band - decoded by the radiation kernel's decodeBand
 * @param {{radiusM: number, temperatureK: number}} state
 * @param {number} distanceMpc
 */
export function kilonovaAbMag(band, state, distanceMpc) {
  if (!(finite(distanceMpc, 'distanceMpc') > 0))
    refuse('bad-parameter', 'the distance must be positive');
  const scale = (state.radiusM / (distanceMpc * MPC_M)) ** 2;
  return abMag(band, blackbodySed(state.temperatureK, scale));
}

/** Colour (band A minus band B) of the sphere, mag: a function of temperature only. */
export const kilonovaColour = (bandA, bandB, state, system = 'ab') =>
  blackbodyColor(state.temperatureK, bandA, bandB, system);

/**
 * A light curve: the AB magnitude in one band at each time, with the states.
 * @param {{params: object, band: object, distanceMpc: number, tDays: number[], allowOutside?: boolean}} p
 */
export function kilonovaLightCurve({
  params,
  band,
  distanceMpc,
  tDays,
  allowOutside = false,
}) {
  return tDays.map(t => {
    const state = kilonovaState(params, t, { allowOutside });
    return { ...state, mag: kilonovaAbMag(band, state, distanceMpc) };
  });
}
