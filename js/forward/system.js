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
// The orbit's semi-major axis comes from the period and the masses (Kepler's
// third law with the constants of js/constants.js). Each planet is treated as
// a two-body orbit with the star; several planets' reflex motions add, which is
// the standard approximation when they are far from each other in period.
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
import { solveKepler } from '../inference/rv.js';
import { geometryFor } from '../observerGeometry.js';

const DEG = Math.PI / 180;

/** The observer's geometry for a state; edge-on from the reference direction. */
export const geometryOf = state =>
  geometryFor(
    state.geometry?.positionAngleDeg ?? 0,
    state.geometry?.inclinationDeg ?? 90
  );

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

/**
 * The planet's position and velocity relative to the star, in the orbital
 * plane, in AU and AU per day, at time t (days).
 */
export function relativeState(o, t) {
  const M = o.M0 + o.n * (t - o.epochDays);
  const E = solveKepler(M, o.e);
  const cE = Math.cos(E);
  const sE = Math.sin(E);
  const s1 = Math.sqrt(1 - o.e * o.e);
  const px = o.aAU * (cE - o.e);
  const py = o.aAU * s1 * sE;
  const r = 1 - o.e * cE;
  const vx = (-o.aAU * o.n * sE) / r;
  const vy = (o.aAU * o.n * s1 * cE) / r;
  const c = Math.cos(o.omega);
  const s = Math.sin(o.omega);
  return {
    pos: { x: c * px - s * py, y: s * px + c * py },
    vel: { x: c * vx - s * vy, y: s * vx + c * vy },
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
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - o.e) * Math.sin(nu / 2),
      Math.sqrt(1 + o.e) * Math.cos(nu / 2)
    );
  const Mc = E - o.e * Math.sin(E);
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
 *   clockwise orbit
 */
export function elementsFromBodies({
  G,
  mass,
  rel,
  time = 0,
  timeUnitDays = 1,
}) {
  const mu = G * mass;
  const r = Math.hypot(rel.x, rel.y);
  const v2 = rel.vx * rel.vx + rel.vy * rel.vy;
  const energy = v2 / 2 - mu / r;
  if (!(energy < 0)) return null;
  const a = -mu / (2 * energy);
  const h = rel.x * rel.vy - rel.y * rel.vx;
  // Only counter-clockwise orbits are described: the elements assume them.
  if (!(h > 0)) return null;
  // The eccentricity vector points at periapsis.
  const ex = (rel.vy * h) / mu - rel.x / r;
  const ey = (-rel.vx * h) / mu - rel.y / r;
  const e = Math.hypot(ex, ey);
  const omega = e > 1e-12 ? Math.atan2(ey, ex) : 0;
  // True anomaly from the angle of the position past periapsis.
  const nu = Math.atan2(rel.y, rel.x) - omega;
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu / 2),
      Math.sqrt(1 + e) * Math.cos(nu / 2)
    );
  const M = E - e * Math.sin(E);
  return {
    periodDays: 2 * Math.PI * Math.sqrt((a * a * a) / mu) * timeUnitDays,
    e,
    omegaDeg: (omega / DEG + 360) % 360,
    meanAnomalyDeg: (((M / DEG) % 360) + 360) % 360,
    epochDays: time * timeUnitDays,
  };
}

export { SOLAR_RADIUS_M, AU_METERS };
