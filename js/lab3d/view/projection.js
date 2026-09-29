// =============================================================================
// The 3-D lab's camera, as numbers
// -----------------------------------------------------------------------------
// Everything the lab needs to know about where a point lands on the screen,
// without a renderer: the camera presets (face-on and edge-on to an orbit or
// to the reference plane), the projection of a world point to the screen for
// labels and picking, the distance that frames a set of bodies, and the scale
// bar. three.js draws with the same eye, target, up and field of view, and
// tests/lab3dView.test.js holds the two projections to each other.
//
// A camera here is {mode: 'perspective' | 'orthographic', eye, target, up,
// fov (degrees, vertical), height (the orthographic view's world height)}.
// World axes are the system's: z is the reference plane's normal.
// =============================================================================

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = a => Math.sqrt(dot(a, a));
const unit = a => {
  const n = norm(a);
  return n > 0 ? scale(a, 1 / n) : [0, 0, 0];
};
export const vec = { dot, sub, add, scale, cross, norm, unit };

/** The camera's right, up and forward (toward the target) unit vectors. */
export function basis(cam) {
  const f = unit(sub(cam.target, cam.eye));
  let r = cross(f, cam.up);
  // Up along the line of sight: any perpendicular will do.
  if (norm(r) < 1e-12)
    r = cross(f, Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
  r = unit(r);
  const u = cross(r, f);
  return { right: r, up: u, forward: f };
}

/**
 * Where a world point lands in a viewport of w by h pixels.
 * @returns {{x: number, y: number, depth: number, visible: boolean}} Pixels
 *   from the top left, and the distance along the line of sight
 */
export function project(p, cam, w, h) {
  const { right, up, forward } = basis(cam);
  const d = sub(p, cam.eye);
  const vx = dot(d, right);
  const vy = dot(d, up);
  const vz = dot(d, forward);
  const aspect = w / h;
  let nx;
  let ny;
  if (cam.mode === 'orthographic') {
    const half = cam.height / 2;
    nx = vx / (half * aspect);
    ny = vy / half;
  } else {
    const t = Math.tan(((cam.fov ?? 45) * Math.PI) / 360);
    if (!(vz > 1e-12)) return { x: NaN, y: NaN, depth: vz, visible: false };
    nx = vx / (vz * t * aspect);
    ny = vy / (vz * t);
  }
  return {
    x: ((nx + 1) / 2) * w,
    y: ((1 - ny) / 2) * h,
    depth: vz,
    visible:
      Math.abs(nx) <= 1 &&
      Math.abs(ny) <= 1 &&
      (cam.mode === 'orthographic' || vz > 0),
  };
}

/**
 * The world length one pixel spans at the target's depth: exact everywhere
 * in an orthographic view, true only at the target's distance in a
 * perspective one (which the scale bar says).
 */
export function worldPerPixel(cam, h) {
  if (cam.mode === 'orthographic') return cam.height / h;
  const dist = norm(sub(cam.target, cam.eye));
  return (2 * dist * Math.tan(((cam.fov ?? 45) * Math.PI) / 360)) / h;
}

/** The largest 1, 2 or 5 times a power of ten that is at most `max`. */
export function niceLength(max) {
  if (!(max > 0) || !Number.isFinite(max)) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  for (const k of [5, 2, 1]) if (k * p <= max * (1 + 1e-12)) return k * p;
  return p;
}

/**
 * A scale bar between `minPx` and `maxPx` pixels long, in world units.
 * @returns {{length: number, px: number, exact: boolean}} exact is false in
 *   perspective, where the length holds only at the target's distance
 */
export function scaleBar(cam, h, maxPx = 160) {
  const per = worldPerPixel(cam, h);
  const length = niceLength(per * maxPx);
  return {
    length,
    px: per > 0 ? length / per : 0,
    exact: cam.mode === 'orthographic',
  };
}

/** The center and radius of the live bodies' positions (3n array). */
export function bounds(x, alive) {
  const c = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < alive.length; i++) {
    if (!alive[i]) continue;
    for (let k = 0; k < 3; k++) c[k] += x[3 * i + k];
    n++;
  }
  if (!n) return { center: [0, 0, 0], radius: 1 };
  for (let k = 0; k < 3; k++) c[k] /= n;
  let r = 0;
  for (let i = 0; i < alive.length; i++) {
    if (!alive[i]) continue;
    r = Math.max(
      r,
      norm([x[3 * i] - c[0], x[3 * i + 1] - c[1], x[3 * i + 2] - c[2]])
    );
  }
  return { center: c, radius: r > 0 ? r : 1 };
}

/**
 * Look at `target` from direction `dir` (a unit vector from the target to
 * the eye), with `up`, far enough that a sphere of `radius` fits.
 */
export function lookFrom(dir, target, radius, up, base = {}) {
  const fov = base.fov ?? 45;
  const margin = 1.25;
  // The distance at which a sphere of this radius just fits the vertical
  // field of view, with a margin.
  const dist = (radius * margin) / Math.sin((fov * Math.PI) / 360) || 1;
  return {
    mode: base.mode ?? 'perspective',
    fov,
    target: [...target],
    eye: add(target, scale(unit(dir), dist)),
    up: unit(up),
    height: 2 * radius * margin,
  };
}

/**
 * The line of nodes of a plane with normal n against the reference plane
 * (z = 0), or +x when the plane is the reference plane itself.
 */
export function lineOfNodes(n) {
  const node = cross([0, 0, 1], unit(n));
  return norm(node) < 1e-9 ? [1, 0, 0] : unit(node);
}

/**
 * The named presets. `normal` is an orbit's angular momentum direction, for
 * the two orbit-aware ones; without it they are the reference plane's.
 * - top: the reference plane face-on, from +z, +y up
 * - side: the reference plane edge-on, from -y, +z up
 * - faceOn: the orbit face-on, from its angular momentum, its node line up
 * - edgeOn: the orbit edge-on, along its line of nodes, its normal up
 */
export function preset(name, { target, radius, normal, base } = {}) {
  const n = normal && norm(normal) > 0 ? unit(normal) : [0, 0, 1];
  switch (name) {
    case 'top':
      return lookFrom([0, 0, 1], target, radius, [0, 1, 0], base);
    case 'side':
      return lookFrom([0, -1, 0], target, radius, [0, 0, 1], base);
    case 'faceOn':
      return lookFrom(n, target, radius, cross(n, lineOfNodes(n)), base);
    case 'edgeOn':
      return lookFrom(lineOfNodes(n), target, radius, n, base);
    default:
      // An oblique view that shows depth: above the plane, off to one side.
      return lookFrom(
        unit([0.55, -0.75, 0.45]),
        target,
        radius,
        [0, 0, 1],
        base
      );
  }
}
