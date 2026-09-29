// =============================================================================
// Patched conics: spheres of influence, departure and arrival, flybys
// -----------------------------------------------------------------------------
// The patched-conic approximation splits a trajectory into two-body pieces:
// inside a planet's sphere of influence only the planet pulls, outside it
// only the Sun, and the pieces meet at the sphere with the planet's velocity
// added or taken away. The sphere is Laplace's, r = a (m / M)^(2/5), and in
// the heliocentric piece it is a point: the spacecraft leaves from the
// planet's centre with the hyperbolic excess velocity v_inf.
//
// What that leaves out, and MISSION.md measures: the Sun's pull inside the
// sphere, the planet's outside it, and the time spent crossing it. A patched
// conic is a design estimate, the kind a first transfer window is drawn
// from; it is not a trajectory a spacecraft could fly.
//
// A flyby here is unpowered and in one plane: the hyperbola turns v_inf
// through delta = 2 asin(1 / e), e = 1 + r_p v_inf^2 / mu, at constant
// |v_inf|. Powered flybys, B-plane targeting in three dimensions and
// sequences of flybys are not supported; a periapsis below the surface is
// refused.
// =============================================================================

import { AU, BODIES, circularOrbit } from './bodies.js';
import { hohmann } from './transfers.js';
import { circularSpeed, norm, vec3 } from './twobody.js';

const { sqrt, asin, abs, cos, sin, pow } = Math;
const positive = (...xs) => xs.every(x => Number.isFinite(x) && x > 0);
const refuse = code => ({ ok: false, status: code });

/** Laplace's sphere of influence of a planet, km. */
export function sphereOfInfluence(id) {
  const p = BODIES[id];
  if (!p?.a) throw new Error(`sphereOfInfluence: ${id}`);
  return p.a * AU * pow(p.GM / BODIES.sun.GM, 0.4);
}

/**
 * The burn at periapsis r_p of a circular parking orbit that leaves (or,
 * run backwards, captures into) it on a hyperbola with excess speed vinf.
 */
export function hyperbolicBurn(mu, rp, vinf) {
  if (!positive(mu, rp) || !(Number.isFinite(vinf) && vinf >= 0))
    return refuse('input');
  const vc = circularSpeed(mu, rp);
  const vp = sqrt(vinf * vinf + (2 * mu) / rp);
  const e = 1 + (rp * vinf * vinf) / mu;
  return {
    ok: true,
    status: 'ok',
    vc,
    vp,
    dv: vp - vc,
    e,
    // The asymptote's angle from periapsis: the burn point is this far
    // behind the direction the spacecraft leaves in.
    beta: Math.acos(1 / e),
    c3: vinf * vinf,
  };
}

/**
 * A Hohmann transfer between two planets' model orbits (./bodies.js), with
 * a departure from a circular parking orbit of altitude `from.altitude` and
 * a capture into one of `to.altitude`: the textbook patched conic.
 */
export function interplanetaryHohmann(from, to) {
  const A = BODIES[from?.id];
  const B = BODIES[to?.id];
  if (!A?.a || !B?.a) return refuse('input');
  if (!(from.altitude >= 0 && to.altitude >= 0)) return refuse('input');
  if (from.id === to.id) return refuse('sameOrbit');
  const muS = BODIES.sun.GM;
  const r1 = circularOrbit(from.id).r;
  const r2 = circularOrbit(to.id).r;
  const h = hohmann(muS, r1, r2);
  const vinfDep = h.burns[0].dv;
  const vinfArr = h.burns[1].dv;
  const dep = hyperbolicBurn(A.GM, A.radius + from.altitude, vinfDep);
  const arr = hyperbolicBurn(B.GM, B.radius + to.altitude, vinfArr);
  return {
    ok: true,
    status: 'ok',
    kind: 'interplanetaryHohmann',
    tof: h.tof,
    heliocentric: h,
    departure: { ...dep, vinf: vinfDep, soi: sphereOfInfluence(from.id) },
    arrival: { ...arr, vinf: vinfArr, soi: sphereOfInfluence(to.id) },
    total: dep.dv + arr.dv,
  };
}

/**
 * An unpowered flyby in one plane. `vinfIn` is the approach velocity
 * relative to the planet (km/s, a 3-vector in its orbit plane), rp the
 * closest approach (km, from the centre), and `side` which way the
 * hyperbola turns it: +1 counter-clockwise about +z, -1 clockwise.
 * `planetVelocity` adds the heliocentric view.
 */
export function flyby({ id, vinfIn, rp, side = 1, planetVelocity = null }) {
  const p = BODIES[id];
  if (!p || !vec3(vinfIn) || !positive(rp)) return refuse('input');
  if (side !== 1 && side !== -1) return refuse('input');
  if (abs(vinfIn[2]) > 1e-12 * norm(vinfIn)) return refuse('outOfPlane');
  if (planetVelocity !== null && !vec3(planetVelocity)) return refuse('input');
  if (rp < p.radius) return refuse('belowSurface');
  const v = norm(vinfIn);
  if (!(v > 0)) return refuse('input');
  const e = 1 + (rp * v * v) / p.GM;
  const delta = 2 * asin(1 / e);
  const c = cos(side * delta);
  const s = sin(side * delta);
  const vinfOut = [
    c * vinfIn[0] - s * vinfIn[1],
    s * vinfIn[0] + c * vinfIn[1],
    0,
  ];
  const out = {
    ok: true,
    status: 'ok',
    kind: 'flyby',
    e,
    delta,
    vinf: v,
    vinfIn: [...vinfIn],
    vinfOut,
    // The change a flyby gives the heliocentric velocity, for nothing.
    dvEquivalent: 2 * v * sin(delta / 2),
    periapsisSpeed: sqrt(v * v + (2 * p.GM) / rp),
  };
  if (planetVelocity) {
    const vin = vinfIn.map((x, k) => x + planetVelocity[k]);
    const vout = vinfOut.map((x, k) => x + planetVelocity[k]);
    out.heliocentric = {
      in: vin,
      out: vout,
      speedIn: norm(vin),
      speedOut: norm(vout),
    };
  }
  return out;
}
