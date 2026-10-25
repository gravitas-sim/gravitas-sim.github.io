// =============================================================================
// The Galilean moons as seen from the Earth (Prompt 193, SATELLITE_EPHEMERIS.md)
// -----------------------------------------------------------------------------
// The satellite pack (ephemeris-packs/galilean-2025-11.json, sky/galilean-
// moons.json) holds each moon's geometric position about Jupiter's centre, in
// the ecliptic of J2000.0, as Chebyshev series fitted to JPL Horizons (JUP365).
// This module turns that into what a telescope sees: where each moon is from
// the centre of the planet, east and north-ish of it, in Jupiter radii, at the
// moment its light left it.
//
//   x   along the planet's equator as projected on the sky, positive east
//   y   along the planet's projected pole (toward the pole that leans to us)
//   z   along the line of sight, positive away from the Earth (behind Jupiter)
//
// The line of sight is the geocentric direction to Jupiter from the planetary
// pack (DE441), light-time corrected; the pole is the IAU working group's
// (Archinal et al. 2018). Everything is in the 3-D vectors of the packs, so
// nothing here assumes a circular orbit or an edge-on view.
//
// Pure: no DOM, no fetch. A caller hands over the two packs' parsed files.
// =============================================================================

import { createEphemeris } from '../mission/ephemeris.js';
import { createPlanetSource } from '../kernels/sky/planets.js';

export const R_JUPITER_KM = 71492;
export const C_KM_S = 299792.458;
export const AU_KM = 149597870.7;
export const DAY_S = 86400;
/** The ecliptic of J2000.0's obliquity, as the sky kernel states it. */
const EPS_J2000 = (23.439291111 * Math.PI) / 180;
const RAD = Math.PI / 180;

/**
 * Jupiter's planetary GM, km^3/s^2 (planet alone), as js/mission/bodies.js
 * states it, and the system's (planet and moons) as js/mission/solar.js does.
 * A moon's Kepler law sees the planet and its own mass, and the planet's
 * oblateness: the first is 1e-4 of the planet's, the second is the bias in
 * `OBLATENESS_BIAS`.
 */
export const GM_JUPITER = 126686534;
export const GM_JUPITER_SYSTEM = 126712764.1;
/** Jupiter's J2 and equatorial radius, for the oblateness bias (Jacobson 2003). */
export const J2_JUPITER = 0.014736;

export const MOON_IDS = Object.freeze(['io', 'europa', 'ganymede', 'callisto']);

/**
 * The reference mean orbits: JPL Solar System Dynamics, Satellite Mean
 * Elements (the table the resonance module also states). An independent
 * statement of each period and semi-major axis, which no result here is
 * made from.
 */
export const REFERENCE = Object.freeze({
  io: { periodDays: 1.769137786, aKm: 421800 },
  europa: { periodDays: 3.551181041, aKm: 671100 },
  ganymede: { periodDays: 7.15455296, aKm: 1070400 },
  callisto: { periodDays: 16.6890184, aKm: 1882700 },
});

export const POLE_J2000 = Object.freeze({
  raDeg: 268.056595,
  decDeg: 64.495303,
  raRatePerCentury: -0.006499,
  decRatePerCentury: 0.002413,
});

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = a => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};
/** An ecliptic J2000 vector in the equatorial J2000 frame. */
const toEquatorial = ([x, y, z]) => {
  const c = Math.cos(EPS_J2000);
  const s = Math.sin(EPS_J2000);
  return [x, y * c - z * s, y * s + z * c];
};

/** Jupiter's pole as a unit vector in the equatorial J2000 frame. */
export function poleVector(jdTt) {
  const T = (jdTt - 2451545) / 36525;
  const a = (POLE_J2000.raDeg + POLE_J2000.raRatePerCentury * T) * RAD;
  const d = (POLE_J2000.decDeg + POLE_J2000.decRatePerCentury * T) * RAD;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/**
 * The two packs as one model.
 * @param {{pack: object, data: object}} satellites - sky/galilean-moons.json
 * @param {{pack: object, data: object}} planets - sky/ephemeris.json
 */
export function openGalilean(satellites, planets) {
  const moons = createEphemeris(satellites.pack, satellites.data);
  const planetEphemeris = createEphemeris(planets.pack, planets.data);
  const source = createPlanetSource(planetEphemeris);
  const range = {
    startJd: Math.max(moons.range.startJd, planetEphemeris.range.startJd),
    stopJd: Math.min(moons.range.stopJd, planetEphemeris.range.stopJd),
  };
  return { moons, planetEphemeris, source, range, pack: satellites.pack };
}

/** Whether a TDB Julian date is inside the satellite pack, with room for light-time. */
export const inRange = (model, jdTt) =>
  jdTt - 0.05 >= model.range.startJd && jdTt <= model.range.stopJd;

/**
 * Jupiter from the Earth at a TT Julian date: the line of sight, the
 * light-time and the distance. The planetary pack's Jupiter is the planet
 * system's barycentre; its offset from the planet's centre is below 0.01
 * Jupiter radii and is neglected.
 */
export function viewOf(model, jdTt) {
  const eq = toEquatorial(model.source.geocentric('jupiter', jdTt));
  const distanceKm = Math.hypot(eq[0], eq[1], eq[2]) * AU_KM;
  const u = unit(eq);
  const pole = poleVector(jdTt);
  const xHat = unit(cross(pole, u));
  const yHat = cross(u, xHat);
  // The latitude of the Earth on Jupiter: the angle of the line of sight to the
  // equatorial plane, positive when the north pole tips toward us.
  const subEarthLatDeg = Math.asin(-dot(u, pole)) / RAD;
  return {
    u,
    xHat,
    yHat,
    distanceKm,
    lightTimeS: distanceKm / C_KM_S,
    arcsecPerRj: (R_JUPITER_KM / distanceKm) * 206264.806,
    subEarthLatDeg,
  };
}

/**
 * Every moon's offset from the planet's centre as seen from the Earth at a TT
 * Julian date: x, y and z in Jupiter radii, at the moment the light left.
 * @returns {{view: object, moons: Object<string, {x: number, y: number, z: number, rKm: number}>}}
 */
export function moonsAt(model, jdTt) {
  const view = viewOf(model, jdTt);
  const tdbLeft = jdTt - view.lightTimeS / DAY_S;
  const moons = {};
  for (const id of MOON_IDS) {
    const r = toEquatorial(model.moons.stateAt(id, tdbLeft).r);
    moons[id] = {
      x: dot(r, view.xHat) / R_JUPITER_KM,
      y: dot(r, view.yHat) / R_JUPITER_KM,
      z: dot(r, view.u) / R_JUPITER_KM,
      rKm: Math.hypot(r[0], r[1], r[2]),
    };
  }
  return { view, moons };
}

/**
 * The bias a spherical-planet Kepler law has from Jupiter's oblateness, as a
 * fraction of the planet's GM: (3/2) J2 (R/a)^2 for a circular equatorial
 * orbit (the mean motion is faster than the point-mass one, so a^3 n^2 reads
 * high by this much). Stated, never subtracted from a measurement.
 */
export const oblatenessBias = aKm =>
  1.5 * J2_JUPITER * (R_JUPITER_KM / aKm) ** 2;
