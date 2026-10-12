// =============================================================================
// A 3-D system, observed: the 3-D lab's state as the forward models read it
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105 (LAB3D.md, "On the platform"). The forward models
// (./index.js) describe a star and planets by Keplerian elements and put the
// observer at two angles over a plane (./system.js). In a gravitas.system3d/1
// every orbit has a plane of its own, so inclination and the line of nodes
// are physical numbers rather than a viewing choice. This module is the
// bridge: it reads each planet's osculating orbit about the star from the
// system's numbers, puts the observer's line of sight into each orbit's own
// frame, and returns the state the models already accept, with each planet
// carrying the geometry of its own plane (`planet.geometry`).
//
// What that means, in one sentence: a student can ask what an observer
// standing in a chosen direction would record, and the answer is the same
// transit, radial-velocity or astrometric model the platform uses everywhere,
// not a second one.
//
// How the frames meet. The forward models put one planet's orbit in the plane
// z = 0, with periapsis on the x axis (the planet's `omegaDeg` is 0 here) and
// the observer at line of sight
//
//   n = ( sin i cos phi, sin i sin phi, cos i )     (js/observerGeometry.js)
//
// Take the orbit's perifocal axes P (toward periapsis), Q and W (the angular
// momentum), read from the system's own numbers. The observer's line of sight
// n, a unit vector in the system's frame pointing from the system toward the
// observer, has components (n.P, n.Q, n.W) in that frame, so
//
//   cos i = n.W        phi = atan2(n.Q, n.P)
//
// and an orbit seen retrograde has i above 90 degrees, which the models
// accept. For a circular orbit periapsis is undefined, and P is taken toward
// the planet at the epoch (mean anomaly 0 there), which changes no observable.
//
// Constants. The models use SI constants (js/constants.js); the lab's solar
// units use the Gaussian k (state.js). They differ by 2.6e-4 in GM, so the
// period is preserved exactly and the semi-major axis the models derive from
// it differs by 8.7e-5 (a/R*, and the radial-velocity K with the unequal mass
// units: 1.2e-4 of K against a kernel run, tests/forwardSystem3d.test.js).
//
// What it is not. Osculating elements at one instant, and planets that do not
// pull on each other: a Kozai cycle or a resonance the lab shows is not in the
// model's curve. The bridge says so in `warnings`. Pure: no DOM.
// =============================================================================

import {
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SECONDS_PER_DAY,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from '../constants.js';
import { toElements } from '../lab3d/elements.js';
import { UNIT_SYSTEMS, gravityOf, validateSystem } from '../lab3d/state.js';
import { runForward } from './index.js';

const DEG = Math.PI / 180;
/** IAU 2012: one astronomical unit in meters (the lab's solar unit). */
const AU_IAU_M = 149597870700;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => {
  const n = norm(a);
  return a.map(c => c / n);
};

/**
 * The line of sight, from the system toward the observer, for two angles in
 * the system's frame: the polar angle from +z (the reference plane's normal)
 * and the azimuth in the reference plane from +x. The same two angles as
 * js/observerGeometry.js, so inclination 90 is in the reference plane.
 */
export const lineOfSight = ({ inclinationDeg = 90, positionAngleDeg = 0 }) => [
  Math.sin(inclinationDeg * DEG) * Math.cos(positionAngleDeg * DEG),
  Math.sin(inclinationDeg * DEG) * Math.sin(positionAngleDeg * DEG),
  Math.cos(inclinationDeg * DEG),
];

/** The two angles of a line of sight, the inverse of lineOfSight(). */
export function anglesOfSight(n) {
  const v = unit(n);
  return {
    inclinationDeg: Math.acos(Math.max(-1, Math.min(1, v[2]))) / DEG,
    positionAngleDeg: (((Math.atan2(v[1], v[0]) / DEG) % 360) + 360) % 360,
  };
}

/** The scales that carry a unit system to days, solar masses and AU. */
function scalesOf(system, scale) {
  const u = UNIT_SYSTEMS[system.units];
  if (u?.length)
    return {
      auPerLength: u.length.meters / AU_IAU_M,
      daysPerTime: u.time.seconds / SECONDS_PER_DAY,
      // The lab's solar unit is the Sun's mass, so one is one.
      sunPerMass: 1,
    };
  const ok =
    scale &&
    [scale.lengthAU, scale.timeDays, scale.massSun].every(
      q => Number.isFinite(q) && q > 0
    );
  if (!ok) return null;
  return {
    auPerLength: scale.lengthAU,
    daysPerTime: scale.timeDays,
    sunPerMass: scale.massSun,
  };
}

/**
 * The orbit of body j about body s: its perifocal axes in the system's frame
 * and the elements the models want, or null when it is not a bound orbit.
 */
function orbitAbout(system, s, j, G) {
  const b = system.bodies[j];
  const star = system.bodies[s];
  const r = sub(b.x, star.x);
  const v = sub(b.v, star.v);
  const mu = G * (star.m + b.m);
  const h = cross(r, v);
  const rn = norm(r);
  const energy = dot(v, v) / 2 - mu / rn;
  if (!(energy < 0) || !(norm(h) > 0)) return null;
  const el = toElements(r, v, mu);
  const W = unit(h);
  const ev = cross(v, h).map((c, k) => c / mu - r[k] / rn);
  const e = norm(ev);
  const circular = e < 1e-9;
  const P = circular ? unit(r) : unit(ev);
  const Q = cross(W, P);
  return {
    P,
    Q,
    W,
    a: el.a,
    e: circular ? 0 : el.e,
    M: circular ? 0 : el.M,
    period: 2 * Math.PI * Math.sqrt((el.a * el.a * el.a) / mu),
  };
}

/**
 * A forward-model state from a 3-D system and an observer.
 *
 * @param {object} system - A gravitas.system3d/1
 * @param {object} [o]
 * @param {string} [o.star] - The central body's id (default: the heaviest)
 * @param {{direction?: number[], inclinationDeg?: number,
 *   positionAngleDeg?: number}} [o.observer] - A line of sight, or its two
 *   angles in the system's frame (default: in the reference plane, along +x)
 * @param {object} [o.starProps] - teffK, distancePc, radiusSun, limb,
 *   baselineFlux, systemicKmS, for what the system does not say
 * @param {object} [o.radiusEarth] - A physical radius in Earth radii by body
 *   id, where the body's own (in length units) is zero or not the physical one
 * @param {{lengthAU: number, timeDays: number, massSun: number}} [o.scale] -
 *   What one code length, time and mass are, for a system in code units
 * @returns {{ok: true, state: object, planets: object[], warnings: string[],
 *   observer: object} | {ok: false, code: string, vars?: object}}
 */
export function stateFromSystem3d(system, o = {}) {
  const problems = validateSystem(system);
  if (problems.length) return { ok: false, code: problems[0].code };
  const scales = scalesOf(system, o.scale);
  if (!scales) return { ok: false, code: 'needsScale' };
  const bodies = system.bodies;
  let s = 0;
  if (o.star !== undefined) {
    s = bodies.findIndex(b => b.id === o.star);
    if (s < 0) return { ok: false, code: 'noStar', vars: { id: o.star } };
  } else bodies.forEach((b, i) => (s = b.m > bodies[s].m ? i : s));
  const star = bodies[s];
  if (!(star.m > 0)) return { ok: false, code: 'massless' };
  const n = o.observer?.direction
    ? unit(o.observer.direction)
    : lineOfSight(o.observer ?? {});
  if (!n.every(Number.isFinite)) return { ok: false, code: 'badObserver' };

  const G = gravityOf(system);
  const toSun = x => x * scales.sunPerMass;
  const toAU = x => x * scales.auPerLength;
  const warnings = [];
  const planets = [];
  const detail = [];
  bodies.forEach((b, j) => {
    if (j === s) return;
    const orbit = orbitAbout(system, s, j, G);
    if (!orbit) {
      warnings.push(`unbound:${b.id}`);
      return;
    }
    // A moon (or a body pulled harder by a planet than by the star) is not an
    // orbit about the star, and a two-body description of it would be wrong.
    for (let k = 0; k < bodies.length; k++) {
      if (k === s || k === j || !(bodies[k].m > b.m)) continue;
      const pull =
        bodies[k].m / dot(sub(b.x, bodies[k].x), sub(b.x, bodies[k].x));
      const pullStar = star.m / dot(sub(b.x, star.x), sub(b.x, star.x));
      if (pull > pullStar) {
        warnings.push(`notAboutStar:${b.id}`);
        return;
      }
    }
    const nP = dot(n, orbit.P);
    const nQ = dot(n, orbit.Q);
    const nW = dot(n, orbit.W);
    const geometry = {
      positionAngleDeg: (((Math.atan2(nQ, nP) / DEG) % 360) + 360) % 360,
      inclinationDeg: Math.atan2(Math.hypot(nP, nQ), nW) / DEG,
    };
    const physical = o.radiusEarth?.[b.id];
    const radiusM = toAU(b.radius) * AU_IAU_M;
    planets.push({
      id: b.id,
      massEarth: (toSun(b.m) * SOLAR_MASS_KG) / EARTH_MASS_KG,
      ...(physical > 0
        ? { radiusEarth: physical }
        : b.radius > 0
          ? { radiusEarth: radiusM / EARTH_RADIUS_M }
          : {}),
      periodDays: orbit.period * scales.daysPerTime,
      e: orbit.e,
      omegaDeg: 0,
      meanAnomalyDeg: (((orbit.M / DEG) % 360) + 360) % 360,
      epochDays: (system.t || 0) * scales.daysPerTime,
      geometry,
    });
    detail.push({
      id: b.id,
      aAU: toAU(orbit.a),
      e: orbit.e,
      inclinationToSky: geometry.inclinationDeg,
      positionAngle: geometry.positionAngleDeg,
      normal: orbit.W,
    });
  });
  if (!planets.length) return { ok: false, code: 'noPlanet' };

  const sp = o.starProps ?? {};
  const radiusSun =
    sp.radiusSun ??
    (star.radius > 0
      ? (toAU(star.radius) * AU_IAU_M) / SOLAR_RADIUS_M
      : undefined);
  if (radiusSun === undefined) warnings.push('noStarRadius');
  for (const p of planets)
    if (p.radiusEarth === undefined) warnings.push(`noRadius:${p.id}`);
  warnings.push('osculating', 'planetsDoNotInteract');
  if (sp.teffK === undefined) warnings.push('assumedTeff');
  if (sp.distancePc === undefined) warnings.push('assumedDistance');

  return {
    ok: true,
    state: {
      star: {
        massSun: toSun(star.m),
        ...(radiusSun !== undefined ? { radiusSun } : {}),
        teffK: sp.teffK ?? 5772,
        distancePc: sp.distancePc ?? 10,
        ...(sp.limb ? { limb: sp.limb } : {}),
        ...(sp.baselineFlux !== undefined
          ? { baselineFlux: sp.baselineFlux }
          : {}),
        ...(sp.systemicKmS !== undefined
          ? { systemicKmS: sp.systemicKmS }
          : {}),
      },
      planets,
    },
    planets: detail,
    warnings,
    observer: anglesOfSight(n),
    starId: star.id,
  };
}

/**
 * What an observer would record from a 3-D system: the bridge, then the
 * forward model the platform already has.
 *
 * @param {object} system - A gravitas.system3d/1
 * @param {string} model - A key of FORWARD_MODELS (transit, radial-velocity,
 *   astrometry)
 * @param {object} setup - gravitas.observing-setup/1
 * @param {object} [o] - As stateFromSystem3d, plus `title`
 * @returns {{ok: true, observation: object, bridge: object} |
 *   {ok: false, code: string, vars?: object}}
 */
export function observeSystem3d(system, model, setup, o = {}) {
  const bridge = stateFromSystem3d(system, o);
  if (!bridge.ok) return bridge;
  if (model === 'transit') {
    if (
      bridge.warnings.some(
        w => w === 'noStarRadius' || w.startsWith('noRadius:')
      )
    )
      return { ok: false, code: 'needsRadii' };
    if (bridge.state.planets.some(p => p.e > 1e-9))
      return { ok: false, code: 'eccentricTransit' };
  }
  const observation = runForward(model, bridge.state, setup, {
    title: o.title,
  });
  return { ok: true, observation, bridge };
}
