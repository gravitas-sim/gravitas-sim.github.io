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

import { elementsProblem, fromElements, toElements } from '../elements.js';
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

// --- Reference planes, the resonant argument, the sky and the editor -------------------
//
// Prompt 271. A reference plane is a choice of axes for the numbers the lab
// shows (the orbit's inclination and node are measured from it), never where
// anything is integrated. A plane is three unit vectors, as rows: the new x,
// y and z in the system's own axes, so a vector's new components are R . v.
//
//   system       the system's own axes: the ecliptic of a system in solar
//                units, an arbitrary reference plane in code units
//   equatorial   the ecliptic turned by the obliquity about +x (solar units
//                only: a code-unit system has no ecliptic to tilt)
//   invariable   +z along the total angular momentum about the barycenter
//   sky          +z toward an observer (az, el in the system's own axes), +y
//                the system's +z as it appears on the sky, so the plane of the
//                sky is x, y and an inclination here is measured from face-on

/**
 * The mean obliquity at J2000, in degrees: the sky kernel's own value
 * (js/kernels/sky/time.js meanObliquityDeg at J2000.0, IAU 2006), which
 * tests/lab3dCurriculumII.test.js holds this copy to.
 */
export const OBLIQUITY_J2000_DEG = 23.439291111;
export const PLANES = Object.freeze([
  'system',
  'equatorial',
  'invariable',
  'sky',
]);
/** Where an observer is by default: on -y, in the reference plane (the "side" look). */
export const DEFAULT_OBSERVER = Object.freeze({ az: -90, el: 0 });

const RAD = Math.PI / 180;

/** sin and cos of an angle in degrees, exact at every multiple of 90. */
const sinDeg = d =>
  d % 90 === 0 ? [0, 1, 0, -1][(((d / 90) % 4) + 4) % 4] : Math.sin(d * RAD);
const cosDeg = d => sinDeg(d + 90);

/** The unit vector from the system toward an observer at (az, el) degrees. */
export function observerDirection({ az, el } = DEFAULT_OBSERVER) {
  const c = cosDeg(el);
  return [c * cosDeg(az), c * sinDeg(az), sinDeg(el)];
}

/** Total angular momentum of the live bodies about their barycenter. */
export function angularMomentumOf(f) {
  let M = 0;
  const cx = [0, 0, 0];
  const cv = [0, 0, 0];
  for (let i = 0; i < f.m.length; i++) {
    if (!f.alive[i]) continue;
    M += f.m[i];
    for (let k = 0; k < 3; k++) {
      cx[k] += f.m[i] * f.x[3 * i + k];
      cv[k] += f.m[i] * f.v[3 * i + k];
    }
  }
  const L = [0, 0, 0];
  if (!(M > 0)) return L;
  for (let i = 0; i < f.m.length; i++) {
    if (!f.alive[i]) continue;
    const r = [0, 1, 2].map(k => f.x[3 * i + k] - cx[k] / M);
    const u = [0, 1, 2].map(k => f.v[3 * i + k] - cv[k] / M);
    const l = cross(r, u);
    for (let k = 0; k < 3; k++) L[k] += f.m[i] * l[k];
  }
  return L;
}

/** Rows (x, y, z) of an orthonormal frame from a +z and the hint it keeps near (+y). */
function axesFrom(z, up) {
  let y = sub(
    up,
    z.map(c => c * dot(up, z))
  );
  if (!(norm(y) > 1e-9)) y = [0, 1, 0];
  y = vec.unit(y);
  const x = cross(y, z);
  return [x, y, z];
}

/**
 * The axes of a reference plane, as rows, or null when the plane cannot be
 * made for this system (equatorial needs solar units; invariable needs
 * angular momentum). `f` is a frame (m, x, v, alive) in the system's axes.
 */
export function planeAxes(
  plane,
  f,
  { units = 'code', observer = DEFAULT_OBSERVER } = {}
) {
  if (plane === 'system')
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  if (plane === 'equatorial') {
    if (units !== 'solar') return null;
    const c = Math.cos(OBLIQUITY_J2000_DEG * RAD);
    const s = Math.sin(OBLIQUITY_J2000_DEG * RAD);
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c],
    ];
  }
  if (plane === 'invariable') {
    const L = angularMomentumOf(f);
    if (!(norm(L) > 0)) return null;
    const z = vec.unit(L);
    // The new x is the node of the invariable plane on the system's plane.
    const node = cross([0, 0, 1], z);
    const x = norm(node) > 1e-12 ? vec.unit(node) : [1, 0, 0];
    return [x, cross(z, x), z];
  }
  if (plane === 'sky') {
    // Closed form (east, up on the sky, toward the observer): the same frame
    // as axesFrom builds, without the cancellation it suffers near a pole,
    // where leg B4 of the validation measured 3.6e-14 of non-orthogonality.
    const { az, el } = observer;
    const c = cosDeg(el);
    if (c > 1e-9) {
      const s = sinDeg(el);
      return [
        [0 - sinDeg(az), cosDeg(az), 0],
        [0 - s * cosDeg(az), 0 - s * sinDeg(az), c],
        [c * cosDeg(az), c * sinDeg(az), s],
      ];
    }
    return axesFrom(observerDirection(observer), [0, 0, 1]);
  }
  return null;
}

/** Vectors (3n numbers) turned into a plane's axes: new components are R . v. */
export function turnVectors(a, R) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length / 3; i++)
    for (let r = 0; r < 3; r++)
      out[3 * i + r] =
        R[r][0] * a[3 * i] + R[r][1] * a[3 * i + 1] + R[r][2] * a[3 * i + 2];
  return out;
}

/** A frame with positions and velocities turned into a plane's axes (new arrays). */
export function reorient(f, R) {
  return { ...f, x: turnVectors(f.x, R), v: turnVectors(f.v, R) };
}

const wrapPi = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/**
 * The resonant argument of a pair, j : (j - 1), about their primary:
 * phi = j lambda_outer - (j - 1) lambda_inner - varpi_(inner or outer), in
 * (-pi, pi], with lambda = Omega + omega + M and varpi = Omega + omega
 * (osculating, from the instant's positions and velocities). Null when
 * either orbit is not bound about the primary.
 */
export function resonantArgument(
  f,
  inner,
  outer,
  primary,
  G,
  { j = 2, about = 'inner' } = {}
) {
  const ei = elementsAbout(f, inner, primary, G);
  const eo = elementsAbout(f, outer, primary, G);
  if (!ei?.bound || !eo?.bound) return null;
  const lam = e => e.Omega + e.omega + e.M;
  const varpi = about === 'outer' ? eo.Omega + eo.omega : ei.Omega + ei.omega;
  return wrapPi(j * lam(eo) - (j - 1) * lam(ei) - varpi);
}

/** The orbit's own perifocal axes in the system's, columns P (periapsis) and Q. */
function perifocal({ i, Omega, omega }) {
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);
  const co = Math.cos(omega);
  const so = Math.sin(omega);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  return {
    P: [cO * co - sO * so * ci, sO * co + cO * so * ci, so * si],
    Q: [-cO * so - sO * co * ci, -sO * so + cO * co * ci, co * si],
  };
}

/**
 * An elliptical orbit as an observer sees it. `axes` are a plane's rows with
 * +z toward the observer ('sky' above). The orbit is the affine image of a
 * circle, so its apparent ellipse has closed-form semi-axes (the singular
 * values of the 2 x 2 projection), a center (offset from the primary on the
 * sky, by -a e along periapsis) and an angle for its major axis, from the
 * sky's +x toward +y.
 * @returns {{center: number[], major: number, minor: number, angle: number}}
 */
export function apparentEllipse(el, axes) {
  const { P, Q } = perifocal(el);
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  const sky = u => [dot(axes[0], u), dot(axes[1], u)];
  const A = sky(P.map(c => c * el.a));
  const B = sky(Q.map(c => c * b));
  const C = sky(P.map(c => -el.a * el.e * c));
  const p = A[0] * A[0] + B[0] * B[0];
  const r = A[1] * A[1] + B[1] * B[1];
  const q = A[0] * A[1] + B[0] * B[1];
  const mid = (p + r) / 2;
  const half = Math.sqrt(((p - r) / 2) ** 2 + q * q);
  return {
    center: C,
    major: Math.sqrt(mid + half),
    minor: Math.sqrt(Math.max(0, mid - half)),
    angle: 0.5 * Math.atan2(2 * q, p - r),
  };
}

/**
 * How far an orbit reaches on the sky: [min, max] along the sky's x (u) and
 * y (w) axes. The affine image of a circle reaches its center plus or minus
 * the length of its two column vectors, so these are closed forms.
 */
export function skyExtent(el, axes) {
  const { P, Q } = perifocal(el);
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  const reach = k => {
    const A = dot(axes[k], P) * el.a;
    const B = dot(axes[k], Q) * b;
    const C = -el.a * el.e * dot(axes[k], P);
    const half = Math.hypot(A, B);
    return [C - half, C + half];
  };
  return { u: reach(0), w: reach(1) };
}

/** Where on the sky, and how deep, an orbit's point at eccentric anomaly E is. */
export function skyPoint(el, axes, E) {
  const { P, Q } = perifocal(el);
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  const pos = [0, 1, 2].map(
    k => el.a * (Math.cos(E) - el.e) * P[k] + b * Math.sin(E) * Q[k]
  );
  return {
    u: dot(axes[0], pos),
    w: dot(axes[1], pos),
    depth: dot(axes[2], pos),
  };
}

/**
 * Whether, and how, a body passes in front of its primary for an observer:
 * its smallest sky separation while it is nearer the observer (the impact
 * parameter, in the orbit's length unit), that separation against the sum of
 * the radii, and the half-length of the straight chord it cuts across a disc
 * of that sum. Sampled on 4,096 eccentric anomalies and refined by golden
 * section, so the result is the orbit's own geometry, never the drawing's.
 * @returns {{impact: number, E: number, transits: boolean, chordHalf: number}|null}
 *   null when the orbit never lies in front (face-on from behind, or a
 *   hidden half only)
 */
export function transitOf(el, axes, radius) {
  const N = 4096;
  const sep = E => {
    const p = skyPoint(el, axes, E);
    return Math.hypot(p.u, p.w);
  };
  let best = -1;
  let bestSep = Infinity;
  for (let k = 0; k < N; k++) {
    const E = (2 * Math.PI * k) / N;
    if (skyPoint(el, axes, E).depth <= 0) continue;
    const s = sep(E);
    if (s < bestSep) {
      bestSep = s;
      best = k;
    }
  }
  if (best < 0) return null;
  let lo = (2 * Math.PI * (best - 1)) / N;
  let hi = (2 * Math.PI * (best + 1)) / N;
  const g = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 100; k++) {
    const x1 = hi - g * (hi - lo);
    const x2 = lo + g * (hi - lo);
    if (sep(x1) < sep(x2)) hi = x2;
    else lo = x1;
  }
  const E = (lo + hi) / 2;
  // The refined point must still be on the near side; if the minimum sits on
  // the limb of the two halves, the sampled one is the answer.
  const impact =
    skyPoint(el, axes, E).depth > 0 ? Math.min(sep(E), bestSep) : bestSep;
  const contact = radius.star + radius.planet;
  return {
    impact,
    E,
    transits: impact < contact,
    chordHalf:
      impact < contact ? Math.sqrt(contact * contact - impact * impact) : 0,
  };
}

/**
 * Edit one body's orbit about its primary: `edits` holds only the elements to
 * change (a, e in the system's length unit, the four angles in degrees), and
 * the body is rebuilt on the new orbit with the elements it was not given
 * exactly as they read. Bodies that orbit it ride along (their state relative
 * to it is kept); everything else is untouched, bit for bit. No edit returns
 * the system itself. `R` (a plane's rows) edits in that plane's axes. A body
 * with no primary, or elements the kernel refuses, throws an Error whose
 * `code` says why and the system is left as it was.
 */
export function editElements(system, index, edits, G, R = null) {
  const keys = Object.keys(edits).filter(
    k => edits[k] !== null && edits[k] !== undefined
  );
  if (!keys.length) return system;
  const n = system.bodies.length;
  const f = {
    m: Float64Array.from(system.bodies, b => b.m),
    x: Float64Array.from(system.bodies.flatMap(b => b.x)),
    v: Float64Array.from(system.bodies.flatMap(b => b.v)),
    alive: Uint8Array.from(system.bodies, () => 1),
  };
  const refuse = code => Object.assign(new Error(`edit: ${code}`), { code });
  if (!(index >= 0 && index < n)) throw refuse('body');
  const h = hierarchy(f);
  const p = h.primary[index];
  if (p < 0) throw refuse('noPrimary');
  const turned = R ? reorient(f, R) : f;
  const el0 = elementsAbout(turned, index, p, G);
  if (!el0) throw refuse('degenerate');
  const el1 = {
    a: el0.a,
    e: el0.e,
    i: el0.i,
    Omega: el0.Omega,
    omega: el0.omega,
    M: el0.M,
  };
  for (const k of keys) {
    if (!['a', 'e', 'i', 'Omega', 'omega', 'M'].includes(k))
      throw refuse('field');
    el1[k] = k === 'a' || k === 'e' ? edits[k] : edits[k] * RAD;
  }
  const mu = G * (f.m[index] + f.m[p]);
  const bad = elementsProblem(el1, mu);
  if (bad) throw refuse(bad);
  const rel = fromElements(el1, mu);
  const back = vec3 =>
    R
      ? [0, 1, 2].map(
          r => R[0][r] * vec3[0] + R[1][r] * vec3[1] + R[2][r] * vec3[2]
        )
      : vec3;
  const dx = back(rel.x);
  const dv = back(rel.v);
  const x = [0, 1, 2].map(k => system.bodies[p].x[k] + dx[k]);
  const v = [0, 1, 2].map(k => system.bodies[p].v[k] + dv[k]);
  const shift = [
    x[0] - system.bodies[index].x[0],
    x[1] - system.bodies[index].x[1],
    x[2] - system.bodies[index].x[2],
  ];
  const kick = [
    v[0] - system.bodies[index].v[0],
    v[1] - system.bodies[index].v[1],
    v[2] - system.bodies[index].v[2],
  ];
  const riders = new Set();
  const take = i => {
    for (const c of h.children[i]) {
      riders.add(c);
      take(c);
    }
  };
  take(index);
  return {
    ...system,
    bodies: system.bodies.map((b, i) => {
      if (i === index) return { ...b, x, v };
      if (!riders.has(i)) return b;
      return {
        ...b,
        x: b.x.map((c, k) => c + shift[k]),
        v: b.v.map((c, k) => c + kick[k]),
      };
    }),
  };
}
