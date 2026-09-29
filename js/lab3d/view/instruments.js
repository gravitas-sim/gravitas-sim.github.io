// =============================================================================
// The 3-D lab's instruments, as numbers
// -----------------------------------------------------------------------------
// What a reader measures in the lab, computed from a frame (positions,
// velocities, masses and liveness at one time: ./snapshot.js frameAt) and
// never from pixels: distances, angles, relative states, the hierarchy that
// says which body orbits which, and each body's orbital elements about its
// primary. The table view and the drawn instruments read the same numbers,
// and tests/lab3dView.test.js checks them against cases worked by hand.
//
// Units are the system's: code units (G = 1, lengths and times unnamed) or
// solar (AU, days, solar masses). SPEEDS gives a solar speed in km/s too.
// =============================================================================

import { toElements } from '../elements.js';
import { vec } from './projection.js';

const { dot, sub, cross, norm } = vec;

/** One AU a day, in km/s (IAU 2012: 1 au = 149 597 870.7 km). */
export const KM_S_PER_AU_DAY = 149597870.7 / 86400;

const at = (a, i) => [a[3 * i], a[3 * i + 1], a[3 * i + 2]];

/** A body's position and velocity in a frame. */
export const stateOf = (f, i) => ({ x: at(f.x, i), v: at(f.v, i) });

/**
 * Body j relative to body i: the separation vector and its length, the
 * relative velocity and its length, and the radial rate (positive apart).
 */
export function relative(f, i, j) {
  const r = sub(at(f.x, j), at(f.x, i));
  const u = sub(at(f.v, j), at(f.v, i));
  const d = norm(r);
  return {
    r,
    distance: d,
    u,
    speed: norm(u),
    radialRate: d > 0 ? dot(r, u) / d : 0,
  };
}

/** The angle at `vertex` between the directions to a and b, in radians. */
export function angleAt(f, a, vertex, b) {
  const p = sub(at(f.x, a), at(f.x, vertex));
  const q = sub(at(f.x, b), at(f.x, vertex));
  const pn = norm(p);
  const qn = norm(q);
  if (!(pn > 0) || !(qn > 0)) return NaN;
  // atan2 of the cross and dot products: accurate at 0 and at pi, where
  // acos of a rounded cosine is not.
  return Math.atan2(norm(cross(p, q)), dot(p, q));
}

/**
 * Which body each body orbits. A body's primary is the heavier live body
 * that pulls on it hardest (G m / r^2); the heaviest has none (-1). Massless
 * test particles orbit whatever pulls on them hardest. Ties go to the lower
 * index, so the answer does not depend on anything but the numbers.
 * @returns {{primary: number[], children: number[][], roots: number[], depth: number[]}}
 */
export function hierarchy(f) {
  const n = f.m.length;
  const primary = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (!f.alive[i]) continue;
    let best = -1;
    let pull = 0;
    for (let j = 0; j < n; j++) {
      if (j === i || !f.alive[j] || !(f.m[j] > 0)) continue;
      if (!(f.m[j] > f.m[i] || (f.m[j] === f.m[i] && j < i))) continue;
      const r = sub(at(f.x, j), at(f.x, i));
      const g = f.m[j] / dot(r, r);
      if (g > pull) {
        pull = g;
        best = j;
      }
    }
    primary[i] = best;
  }
  const children = Array.from({ length: n }, () => []);
  const roots = [];
  for (let i = 0; i < n; i++) {
    if (!f.alive[i]) continue;
    if (primary[i] < 0) roots.push(i);
    else children[primary[i]].push(i);
  }
  const depth = new Array(n).fill(0);
  const walk = (i, d) => {
    depth[i] = d;
    for (const c of children[i]) walk(c, d + 1);
  };
  for (const r of roots) walk(r, 0);
  return { primary, children, roots, depth };
}

/**
 * Body i's osculating elements about body p, with mu = G (m_i + m_p):
 * a, e, i, Omega, omega, M and nu (angles in radians; a < 0 when unbound),
 * the period when bound, the specific orbital energy and the angular
 * momentum's direction (the orbit's normal).
 */
export function elementsAbout(f, i, p, G) {
  const x = sub(at(f.x, i), at(f.x, p));
  const v = sub(at(f.v, i), at(f.v, p));
  const mu = G * (f.m[i] + f.m[p]);
  if (!(mu > 0) || !(norm(x) > 0)) return null;
  const el = toElements(x, v, mu);
  const h = cross(x, v);
  const energy = dot(v, v) / 2 - mu / norm(x);
  return {
    ...el,
    bound: energy < 0,
    period:
      energy < 0 ? 2 * Math.PI * Math.sqrt((el.a * el.a * el.a) / mu) : null,
    energy,
    normal: norm(h) > 0 ? h.map(c => c / norm(h)) : [0, 0, 1],
  };
}

/** The angle between two orbits' normals: their mutual inclination, radians. */
export function mutualInclination(n1, n2) {
  return Math.atan2(norm(cross(n1, n2)), dot(n1, n2));
}

/**
 * Body b as seen from far along `dir` (a unit vector from the scene toward
 * the observer): its separation from body a across the line of sight (on
 * the sky) and along it, and which of the two is nearer the observer.
 * This is the geometry of an eclipse: b is in front of a when it is nearer
 * and its sky separation is below the sum of their radii.
 */
export function onTheSky(f, a, b, dir) {
  const d = vec.unit(dir);
  const r = sub(at(f.x, b), at(f.x, a));
  const along = dot(r, d);
  const across = norm(
    sub(
      r,
      d.map(c => c * along)
    )
  );
  return { across, along, nearer: along > 0 ? b : a };
}

/**
 * The angle between two bodies' orbits, each about its own primary: their
 * mutual inclination, from the two angular momentum directions. Null when
 * either body orbits nothing (the hierarchy's root).
 */
export function between(f, a, b, G) {
  const h = hierarchy(f);
  const pa = h.primary[a];
  const pb = h.primary[b];
  if (pa < 0 || pb < 0) return null;
  const ea = elementsAbout(f, a, pa, G);
  const eb = elementsAbout(f, b, pb, G);
  if (!ea || !eb) return null;
  return {
    angle: mutualInclination(ea.normal, eb.normal),
    about: [pa, pb],
    inclinations: [ea.i, eb.i],
  };
}

/**
 * The Kozai-Lidov quantity sqrt(1 - e^2) cos i of a body's orbit about its
 * primary, with i measured from the reference plane: conserved, to the
 * quadrupole order, for a test particle whose perturber orbits in that plane.
 */
export function kozaiOf(f, i, G) {
  const h = hierarchy(f);
  const p = h.primary[i];
  if (p < 0) return null;
  const e = elementsAbout(f, i, p, G);
  return e ? Math.sqrt(Math.max(0, 1 - e.e * e.e)) * Math.cos(e.i) : null;
}
