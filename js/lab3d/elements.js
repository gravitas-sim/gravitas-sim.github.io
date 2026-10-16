// =============================================================================
// Orbital elements and frames for the 3-D kernel
// -----------------------------------------------------------------------------
// Elements are an authoring convenience. They are turned into numbers once,
// before a run, and the run is handed the numbers: sin and cos are rounded
// differently by different engines, so a state rebuilt from its elements in
// two engines is already two states (VALIDATED_3D_LAB_GATE.md, R9).
//
// Conventions, which the round-trip tests hold:
//
//   a   semi-major axis; negative for a hyperbola (a = -mu / v_inf^2)
//   e   0 <= e < 1 elliptic, e > 1 hyperbolic. e = 1 is refused: a parabola
//       has no a, and no finite number stands in for one
//   i   0 to pi, from the reference plane's +z
//   Om  longitude of the ascending node, -pi to pi. With i = 0 or pi the node
//       is undefined, and is 0
//   om  argument of periapsis, -pi to pi. On a circular orbit periapsis is
//       undefined; it is 0, and the phase is measured from the node
//   M   mean anomaly (hyperbolic mean anomaly for e > 1)
//
// Angles are radians throughout; the forms convert degrees at their edge.
// =============================================================================

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => Math.sqrt(dot(a, a));
/** Below this, e is circular and i is in the plane, for the conventions above. */
export const SINGULAR = 1e-11;

/** Why a set of elements cannot be turned into a state, or null. */
export function elementsProblem({ a, e, i, Omega, omega, M }, mu) {
  const finite = [a, e, i, Omega, omega, M, mu].every(Number.isFinite);
  if (!finite) return 'notFinite';
  if (!(mu > 0)) return 'mu';
  if (e < 0) return 'eccentricity';
  if (Math.abs(e - 1) < 1e-9) return 'parabolic';
  if (e < 1 && !(a > 0)) return 'ellipseAxis';
  if (e > 1 && !(a < 0)) return 'hyperbolaAxis';
  if (i < 0 || i > Math.PI) return 'inclination';
  return null;
}

/**
 * Kepler's equation E - e sin E = M, for 0 <= e < 1. Newton's method from
 * Danby's starting value, kept inside the bracket [M - e, M + e] that always
 * holds the root, with a bisection whenever a step would leave it: started
 * at pi, plain Newton wanders at high eccentricity (e = 0.95, M = -1.74
 * never converged).
 */
export function solveKepler(M, e) {
  const wrapped = M - 2 * Math.PI * Math.round(M / (2 * Math.PI));
  let lo = wrapped - e;
  let hi = wrapped + e;
  let E = wrapped + 0.85 * e * Math.sign(Math.sin(wrapped) || 1);
  for (let k = 0; k < 200; k++) {
    const f = E - e * Math.sin(E) - wrapped;
    if (f > 0) hi = E;
    else lo = E;
    let next = E - f / (1 - e * Math.cos(E));
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - E) <= 1e-16 * (1 + Math.abs(E))) {
      E = next;
      break;
    }
    E = next;
  }
  return E + (M - wrapped);
}

/**
 * Position and velocity of a body relative to its primary, for
 * mu = G (m_primary + m_body).
 * @returns {{x: number[], v: number[]}}
 */
export function fromElements(el, mu) {
  const problem = elementsProblem(el, mu);
  if (problem) throw new Error(`elements: ${problem}`);
  const { a, e, i, Omega, omega, M } = el;
  let r;
  let vp;
  if (e < 1) {
    const E = solveKepler(M, e);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const b = a * Math.sqrt(1 - e * e);
    const dE = Math.sqrt(mu / (a * a * a)) / (1 - e * cosE);
    r = [a * (cosE - e), b * sinE, 0];
    vp = [-a * sinE * dE, b * cosE * dE, 0];
  } else {
    const A = -a;
    let H = Math.asinh(M / e);
    for (let k = 0; k < 200; k++) {
      const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
      H -= d;
      if (Math.abs(d) < 1e-16 * (1 + Math.abs(H))) break;
    }
    const b = A * Math.sqrt(e * e - 1);
    const dH = Math.sqrt(mu / (A * A * A)) / (e * Math.cosh(H) - 1);
    r = [A * (e - Math.cosh(H)), b * Math.sinh(H), 0];
    vp = [-A * Math.sinh(H) * dH, b * Math.cosh(H) * dH, 0];
  }
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);
  const co = Math.cos(omega);
  const so = Math.sin(omega);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const R = [
    [cO * co - sO * so * ci, -cO * so - sO * co * ci, sO * si],
    [sO * co + cO * so * ci, -sO * so + cO * co * ci, -cO * si],
    [so * si, co * si, ci],
  ];
  const rot = p => R.map(row => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
  return { x: rot(r), v: rot(vp) };
}

/** Elements of a relative state, with the conventions above. */
export function toElements(x, v, mu) {
  const h = cross(x, v);
  const hn = norm(h);
  const r = norm(x);
  const ev = cross(v, h).map((c, k) => c / mu - x[k] / r);
  const e = norm(ev);
  const a = 1 / (2 / r - dot(v, v) / mu);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hn)));
  const planar = i < SINGULAR || Math.PI - i < SINGULAR;
  const node = planar ? [1, 0, 0] : [-h[1], h[0], 0];
  const Omega = planar ? 0 : Math.atan2(node[1], node[0]);
  const nn = norm(node);
  // The in-plane direction the phase is measured from: periapsis, or the node
  // on a circular orbit.
  const along = (vec, from) =>
    Math.atan2(dot(cross(from, vec), h) / hn, dot(from, vec));
  const circular = e < SINGULAR;
  const omega = circular
    ? 0
    : along(
        ev,
        node.map(c => c / nn)
      );
  const ref = circular ? node.map(c => c / nn) : ev.map(c => c / e);
  const nu = along(x, ref);
  let M;
  if (e < 1) {
    const E =
      2 *
      Math.atan2(
        Math.sqrt(1 - e) * Math.sin(nu / 2),
        Math.sqrt(1 + e) * Math.cos(nu / 2)
      );
    M = E - e * Math.sin(E);
  } else {
    const H = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
    M = e * Math.sinh(H) - H;
  }
  return { a, e, i, Omega, omega, M, nu };
}

// --- Frames -----------------------------------------------------------------
//
// Frames are views of a state, never where it is integrated. Each returns new
// arrays and leaves the state alone.

/** Barycenter position and velocity of the bodies still alive. */
export function barycenterOf(s) {
  let M = 0;
  const c = [0, 0, 0];
  const w = [0, 0, 0];
  for (let i = 0; i < s.n; i++) {
    if (!s.alive[i]) continue;
    M += s.m[i];
    for (let k = 0; k < 3; k++) {
      c[k] += s.m[i] * s.x[3 * i + k];
      w[k] += s.m[i] * s.v[3 * i + k];
    }
  }
  return { x: c.map(q => q / M), v: w.map(q => q / M), mass: M };
}

/**
 * Positions and velocities in a frame: 'inertial', 'barycentric', or
 * {primary: index} for a body-centered one.
 */
export function inFrame(s, frame = 'inertial') {
  const x = s.x.slice();
  const v = s.v.slice();
  let ox = [0, 0, 0];
  let ov = [0, 0, 0];
  if (frame === 'barycentric') {
    const b = barycenterOf(s);
    ox = b.x;
    ov = b.v;
  } else if (
    frame &&
    typeof frame === 'object' &&
    Number.isInteger(frame.primary)
  ) {
    const p = frame.primary;
    if (p < 0 || p >= s.n) throw new Error('frame: no such primary');
    ox = [s.x[3 * p], s.x[3 * p + 1], s.x[3 * p + 2]];
    ov = [s.v[3 * p], s.v[3 * p + 1], s.v[3 * p + 2]];
  } else if (frame !== 'inertial') throw new Error('frame: unknown');
  for (let i = 0; i < s.n; i++)
    for (let k = 0; k < 3; k++) {
      x[3 * i + k] -= ox[k];
      v[3 * i + k] -= ov[k];
    }
  return { x, v, origin: { x: ox, v: ov } };
}

/**
 * A pair's corotating frame at the state's time: origin at their barycenter,
 * +x from the first to the second, +z along their orbital angular momentum.
 * Returns a function taking an inertial position and velocity to the frame.
 */
export function corotating(s, i, j) {
  const mi = s.m[i];
  const mj = s.m[j];
  const M = mi + mj;
  if (!(M > 0)) throw new Error('frame: the pair has no mass');
  const xi = [0, 1, 2].map(k => s.x[3 * i + k]);
  const xj = [0, 1, 2].map(k => s.x[3 * j + k]);
  const vi = [0, 1, 2].map(k => s.v[3 * i + k]);
  const vj = [0, 1, 2].map(k => s.v[3 * j + k]);
  const c = xi.map((q, k) => (mi * q + mj * xj[k]) / M);
  const cv = vi.map((q, k) => (mi * q + mj * vj[k]) / M);
  const d = xj.map((q, k) => q - xi[k]);
  const dv = vj.map((q, k) => q - vi[k]);
  const ex = d.map(q => q / norm(d));
  const hz = cross(d, dv);
  const ez = hz.map(q => q / norm(hz));
  const ey = cross(ez, ex);
  const omega = hz.map(q => q / dot(d, d));
  return (x, v) => {
    const rx = x.map((q, k) => q - c[k]);
    const rv = v.map((q, k) => q - cv[k]);
    const w = cross(omega, rx);
    const vr = rv.map((q, k) => q - w[k]);
    return {
      x: [dot(rx, ex), dot(rx, ey), dot(rx, ez)],
      v: [dot(vr, ex), dot(vr, ey), dot(vr, ez)],
    };
  };
}
