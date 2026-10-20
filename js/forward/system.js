// =============================================================================
// A system as the forward models read it
// -----------------------------------------------------------------------------
// A Keplerian description of a star and its planets, in the units astronomers
// state them in, with the observer standing where js/observerGeometry.js puts
// them. Gravitas integrates gravity in a plane; the observer is built
// analytically in three dimensions around it, and the forward models reuse that
// geometry (position angle, inclination, line of sight, sky plane) rather than
// keep a second one.
//
//   {
//     star:    { massSun, radiusSun, teffK, distancePc, systemicKmS?, limb? },
//     planets: [{ id, massEarth, radiusEarth, periodDays, e?, omegaDeg?,
//                 meanAnomalyDeg?, epochDays? }],
//     geometry?: { positionAngleDeg, inclinationDeg }     default edge-on
//   }
//
// A planet may also carry `geometry` of its own, which then wins for that
// planet (a system read from the 3-D lab, ./system3d.js).
//
// The orbit's semi-major axis comes from the period and the masses (Kepler's
// third law with the constants of js/constants.js). Each planet is treated as
// a two-body orbit with the star; several planets' reflex motions add, which is
// the standard approximation when they are far from each other in period.
//
// The conversions between elements, anomalies and a state go through the
// orbital layer (js/orbital/layer.js, ORBITAL_LAYER.md), with this module's
// units named there (AU and days, the clock 'elapsed'). Its outputs are the
// earlier ones to the last bit (tests/orbitalLayerValidation.test.js); what
// changed is that a planet with e outside [0, 1) or a period that is not
// positive is refused with an OrbitalLayerError, where it used to return NaN.
//
// Pure: no DOM, no state of its own.
// =============================================================================

import {
  AU_METERS,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  G_SI,
  SECONDS_PER_DAY,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from '../constants.js';
import {
  OrbitalLayerError,
  PHYSICAL_UNITS,
  angle,
  convertAnomaly,
  dimensionless,
  elementsToState,
  gm,
  instant,
  keplerElements,
  length,
  makeState,
  simulationUnits,
  stateToElements,
  time as duration,
  vector,
} from '../orbital/layer.js';
import { geometryFor } from '../observerGeometry.js';

const DEG = Math.PI / 180;

/**
 * The observer's geometry for a state; edge-on from the reference direction.
 * A planet may carry its own (`planet.geometry`, the same two angles): a
 * system read from the 3-D lab has an orbit plane of its own for each planet
 * (./system3d.js), and the observer stands at one place relative to each.
 */
export const geometryOf = (state, planet) => {
  const g = planet?.geometry ?? state.geometry;
  return geometryFor(g?.positionAngleDeg ?? 0, g?.inclinationDeg ?? 90);
};

/**
 * One planet's orbit about the star.
 * @returns {object} aAU, aM, a1AU (the star's own semi-major axis), period and
 *   mean motion (per day), e, omega (radians), the mean anomaly at the epoch
 */
export function orbitOf(star, planet) {
  const mStar = star.massSun * SOLAR_MASS_KG;
  const mPlanet = planet.massEarth * EARTH_MASS_KG;
  const P = planet.periodDays;
  const total = mStar + mPlanet;
  const aM = Math.cbrt(
    (G_SI * total * (P * SECONDS_PER_DAY) ** 2) / (4 * Math.PI ** 2)
  );
  const aAU = aM / AU_METERS;
  return {
    id: planet.id,
    aM,
    aAU,
    a1AU: (aAU * mPlanet) / total,
    massRatio: mPlanet / total,
    periodDays: P,
    n: (2 * Math.PI) / P,
    e: planet.e ?? 0,
    omega: (planet.omegaDeg ?? 0) * DEG,
    M0: (planet.meanAnomalyDeg ?? 0) * DEG,
    epochDays: planet.epochDays ?? 0,
    radiusM: (planet.radiusEarth ?? 0) * EARTH_RADIUS_M,
  };
}

const AU_DAY = PHYSICAL_UNITS['AU-day'];

/**
 * The planet's position and velocity relative to the star, in the orbital
 * plane, in AU and AU per day, at time t (days).
 *
 * Through the orbital layer: the orbit as elements in AU and days, the clock
 * named 'elapsed' (days from the zero its author chose), and the layer's planar
 * branch, which is this function's earlier arithmetic to the last bit.
 */
export function relativeState(o, t) {
  const { r, v } = elementsToState(
    keplerElements({
      dimension: 2,
      a: length(o.aAU, AU_DAY),
      e: dimensionless(o.e),
      omega: angle(o.omega),
      anomaly: { type: 'mean', value: angle(o.M0) },
      epoch: instant(o.epochDays, AU_DAY, 'elapsed'),
      period: duration(o.periodDays, AU_DAY),
    }),
    instant(t, AU_DAY, 'elapsed')
  );
  return {
    pos: { x: r.value[0], y: r.value[1] },
    vel: { x: v.value[0], y: v.value[1] },
  };
}

/**
 * The time (days, within one period after the epoch) at which the planet is
 * nearest the observer: its orbital longitude, true anomaly plus the longitude
 * of periapsis, equals the observer's position angle. For a transit this is
 * mid-transit; for radial velocity, inferior conjunction.
 */
export function conjunctionTime(o, geometry) {
  const nu = geometry.positionAngleDeg * DEG - o.omega;
  const Mc = convertAnomaly(
    { type: 'true', value: angle(nu) },
    'mean',
    dimensionless(o.e)
  ).value.value;
  const frac = ((((Mc - o.M0) / (2 * Math.PI)) % 1) + 1) % 1;
  return o.epochDays + frac * o.periodDays;
}

/**
 * Orbital elements of a two-body state, for a system written down as bodies.
 *
 * `rel` is the planet's position and velocity relative to the star, in any one
 * consistent unit system with gravitational constant `G`; the result is in
 * those units' time, so the caller says how many days one time unit is. The
 * planet's size and mass are not needed: the orbit comes from the state.
 *
 * @param {{G: number, mass: number, rel: {x, y, vx, vy}, time?: number,
 *   timeUnitDays?: number}} s - mass is the total of the two bodies
 * @returns {{periodDays: number, e: number, omegaDeg: number,
 *   meanAnomalyDeg: number, epochDays: number}|null} null on an unbound or
 *   clockwise orbit, or one the layer does not describe
 */
export function elementsFromBodies({
  G,
  mass,
  rel,
  time = 0,
  timeUnitDays = 1,
}) {
  const units = simulationUnits(G);
  let el;
  try {
    el = stateToElements(
      makeState({
        frame: 'primary-reference',
        epoch: instant(time, units, 'simulation'),
        r: vector([rel.x, rel.y], 'length', units),
        v: vector([rel.vx, rel.vy], 'speed', units),
      }),
      gm(G * mass, units)
    );
  } catch (err) {
    // Not an ellipse, no angular momentum, or an orbit the layer does not
    // describe (e rounds to 1): nothing to say.
    if (
      err instanceof OrbitalLayerError &&
      (err.code === 'unbound' ||
        err.code === 'degenerate' ||
        err.code === 'domain')
    )
      return null;
    throw err;
  }
  // Only counter-clockwise orbits are described: the elements assume them.
  if (el.sense !== 1) return null;
  return {
    periodDays: el.period.value * timeUnitDays,
    e: el.e.value,
    omegaDeg: (el.omega.value / DEG + 360) % 360,
    meanAnomalyDeg: (((el.anomaly.value.value / DEG) % 360) + 360) % 360,
    epochDays: time * timeUnitDays,
  };
}

export { SOLAR_RADIUS_M, AU_METERS };
