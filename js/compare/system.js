// =============================================================================
// A system, and the elements a student may move
// -----------------------------------------------------------------------------
// The comparison instrument lays a model's observable over an observation. When
// the model is a system (js/forward/system.js: a star and planets in the units
// astronomers state them in) the student moves its elements, and the overlay is
// recomputed from the new state. This module is the elements: how a system is
// read from an exoplanet record or from the Orbital System Builder's bodies
// (js/systemSpec.js), which elements there are, and how to change one without
// touching the rest.
//
// The Builder writes a semi-major axis in AU; the forward models take a period
// in days. The two are one number seen two ways (Kepler's third law with the
// masses of the star and the planet), so `aAU` and `periodDays` are both
// elements here, converted exactly, and a slider offers one of them.
//
// Pure: no DOM.
// =============================================================================

import {
  AU_METERS,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  G_SI,
  JUPITER_MASS_KG,
  JUPITER_RADIUS_M,
  SECONDS_PER_DAY,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from '../constants.js';
import { getExoplanetSystem } from '../data/exoplanetSystems.js';

/** The system ids this module reads without a Builder file. */
export const EXOPLANET_IDS = Object.freeze(['hd209458', 'sun-jupiter']);

/**
 * A system from the exoplanet records (js/data/exoplanetSystems.js).
 * @param {string} id
 * @returns {object|null} A forward-model state, or null for an unknown id
 */
export function stateFromExoplanet(id) {
  const s = getExoplanetSystem(id);
  if (!s) return null;
  return {
    star: {
      massSun: s.star.massSolar,
      radiusSun: s.star.radiusSolar,
      teffK: s.star.temperatureK,
      distancePc: s.star.distancePc,
    },
    planets: [
      {
        id: s.planetName,
        massEarth: (s.planet.massJupiter * JUPITER_MASS_KG) / EARTH_MASS_KG,
        radiusEarth:
          (s.planet.radiusJupiter * JUPITER_RADIUS_M) / EARTH_RADIUS_M,
        periodDays: s.planet.periodDays,
        e: s.planet.eccentricity,
        omegaDeg: 0,
        meanAnomalyDeg: 0,
        epochDays: 0,
      },
    ],
    geometry: { positionAngleDeg: 0, inclinationDeg: s.planet.inclinationDeg },
  };
}

/** Period in days for a semi-major axis in AU (Kepler III, both masses). */
export function periodFromSemiMajor(star, planet, aAU) {
  const total = star.massSun * SOLAR_MASS_KG + planet.massEarth * EARTH_MASS_KG;
  const a = aAU * AU_METERS;
  return (
    (2 * Math.PI * Math.sqrt((a * a * a) / (G_SI * total))) / SECONDS_PER_DAY
  );
}

/** Semi-major axis in AU for a period in days: the inverse, exactly. */
export function semiMajorFromPeriod(star, planet, periodDays) {
  const total = star.massSun * SOLAR_MASS_KG + planet.massEarth * EARTH_MASS_KG;
  const P = periodDays * SECONDS_PER_DAY;
  return (
    Math.cbrt((G_SI * total * P * P) / (4 * Math.PI * Math.PI)) / AU_METERS
  );
}

/**
 * A system from the Orbital System Builder's validated bodies
 * (js/systemSpec.js validateSystem). The root must be a star and every
 * companion must orbit it directly: a moon or a planet of a planet is a
 * system the forward models do not describe, and is refused in words.
 *
 * The Builder's radius is a contact radius for the integrator, not a physical
 * size, so the physical ones come from `extra`.
 *
 * @param {Array<object>} bodies - name, type, mass (in the type's entry unit),
 *   primary, a (AU), e, omega, phase (mean anomaly, degrees)
 * @param {{star?: object, radiusEarth?: number[], geometry?: object}} [extra]
 * @returns {{ok: true, state: object}|{ok: false, reason: string}}
 */
export function stateFromBuilder(bodies, extra = {}) {
  const root = bodies[0];
  if (!root || root.type !== 'Star')
    return { ok: false, reason: 'the first body must be a star' };
  const massSun = root.mass;
  const planets = [];
  for (const b of bodies.slice(1)) {
    if (b.primary !== 0)
      return {
        ok: false,
        reason: `${b.name || 'a body'} orbits another planet; only planets of the star are modelled`,
      };
    if (b.retrograde)
      return {
        ok: false,
        reason: `${b.name || 'a body'} is retrograde; the models describe prograde orbits`,
      };
    const massEarth =
      b.type === 'Star'
        ? (b.mass * SOLAR_MASS_KG) / EARTH_MASS_KG
        : b.type === 'GasGiant'
          ? (b.mass * JUPITER_MASS_KG) / EARTH_MASS_KG
          : b.mass;
    const planet = { id: b.name, massEarth };
    planet.periodDays = periodFromSemiMajor({ massSun }, planet, b.a);
    Object.assign(planet, {
      e: b.e,
      omegaDeg: b.omega,
      meanAnomalyDeg: b.phase,
      epochDays: 0,
      radiusEarth: extra.radiusEarth?.[planets.length],
    });
    planets.push(planet);
  }
  if (!planets.length) return { ok: false, reason: 'the system has no planet' };
  return {
    ok: true,
    state: {
      star: { massSun, radiusSun: 1, ...(extra.star ?? {}) },
      planets,
      ...(extra.geometry ? { geometry: extra.geometry } : {}),
    },
  };
}

/**
 * The elements a slider can be bound to. `get` reads one from a state and
 * `set` returns a new state with that element changed and nothing else; the
 * state passed in is never modified.
 */
export const ELEMENTS = Object.freeze({
  periodDays: {
    unit: 'd',
    planet: true,
    get: (s, i) => s.planets[i].periodDays,
    set: (s, i, v) => withPlanet(s, i, { periodDays: v }),
  },
  aAU: {
    unit: 'AU',
    planet: true,
    get: (s, i) =>
      semiMajorFromPeriod(s.star, s.planets[i], s.planets[i].periodDays),
    set: (s, i, v) =>
      withPlanet(s, i, {
        periodDays: periodFromSemiMajor(s.star, s.planets[i], v),
      }),
  },
  e: {
    unit: '',
    planet: true,
    get: (s, i) => s.planets[i].e ?? 0,
    set: (s, i, v) => withPlanet(s, i, { e: v }),
  },
  omegaDeg: {
    unit: 'deg',
    planet: true,
    get: (s, i) => s.planets[i].omegaDeg ?? 0,
    set: (s, i, v) => withPlanet(s, i, { omegaDeg: v }),
  },
  meanAnomalyDeg: {
    unit: 'deg',
    planet: true,
    get: (s, i) => s.planets[i].meanAnomalyDeg ?? 0,
    set: (s, i, v) => withPlanet(s, i, { meanAnomalyDeg: v }),
  },
  epochDays: {
    unit: 'd',
    planet: true,
    get: (s, i) => s.planets[i].epochDays ?? 0,
    set: (s, i, v) => withPlanet(s, i, { epochDays: v }),
  },
  massEarth: {
    unit: 'M_Earth',
    planet: true,
    get: (s, i) => s.planets[i].massEarth,
    set: (s, i, v) => withPlanet(s, i, { massEarth: v }),
  },
  radiusEarth: {
    unit: 'R_Earth',
    planet: true,
    get: (s, i) => s.planets[i].radiusEarth,
    set: (s, i, v) => withPlanet(s, i, { radiusEarth: v }),
  },
  inclinationDeg: {
    unit: 'deg',
    get: s => s.geometry?.inclinationDeg ?? 90,
    set: (s, _i, v) => ({
      ...s,
      geometry: { positionAngleDeg: 0, ...s.geometry, inclinationDeg: v },
    }),
  },
  starMassSun: {
    unit: 'M_Sun',
    get: s => s.star.massSun,
    set: (s, _i, v) => ({ ...s, star: { ...s.star, massSun: v } }),
  },
  starRadiusSun: {
    unit: 'R_Sun',
    get: s => s.star.radiusSun,
    set: (s, _i, v) => ({ ...s, star: { ...s.star, radiusSun: v } }),
  },
  baselineFlux: {
    unit: '',
    get: s => s.star.baselineFlux ?? 1,
    set: (s, _i, v) => ({ ...s, star: { ...s.star, baselineFlux: v } }),
  },
  systemicKmS: {
    unit: 'km/s',
    get: s => s.star.systemicKmS ?? 0,
    set: (s, _i, v) => ({ ...s, star: { ...s.star, systemicKmS: v } }),
  },
});

function withPlanet(state, i, patch) {
  return {
    ...state,
    planets: state.planets.map((p, k) => (k === i ? { ...p, ...patch } : p)),
  };
}

/**
 * A new state with one element changed.
 * @param {object} state
 * @param {string} element - A key of ELEMENTS
 * @param {number} value
 * @param {number} [planet] - Which planet, for a planet's element
 */
export function withElement(state, element, value, planet = 0) {
  const el = ELEMENTS[element];
  if (!el) throw new Error(`no element "${element}"`);
  if (!Number.isFinite(value)) throw new Error(`${element} needs a number`);
  return el.set(state, planet, value);
}

/** The value of an element in a state. */
export const elementValue = (state, element, planet = 0) =>
  ELEMENTS[element].get(state, planet);

export { SOLAR_RADIUS_M };
