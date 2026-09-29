// =============================================================================
// The frame the 3-D lab is drawn in
// -----------------------------------------------------------------------------
// Frames are views, never where anything is integrated (LAB3D.md): the kernel
// runs in one inertial frame and the lab re-expresses its numbers. A frame is
//
//   'inertial'                    the system's own coordinates
//   'barycentric'                 origin at the barycenter of what is alive
//   {primary: i}                  origin at body i, axes the system's
//   {corotating: [i, j]}          origin at the pair's barycenter, +x from i
//                                 to j, +z along their orbital angular momentum
//
// Trail points are re-expressed with the positions of every body at their own
// time, so a corotating trail is the path in the rotating frame (a tadpole
// about L4, not a smear); the corotating +z is the pair's current normal,
// which is exact for a pair whose plane does not precess.
// =============================================================================

import { corotating } from '../elements.js';

const as3 = (a, i) => [a[3 * i], a[3 * i + 1], a[3 * i + 2]];

/** A frame's name for the legend and the tables: an id and its bodies. */
export function frameKey(frame) {
  if (frame === 'inertial' || frame === 'barycentric') return { id: frame };
  if (Number.isInteger(frame?.primary))
    return { id: 'body', bodies: [frame.primary] };
  if (Array.isArray(frame?.corotating))
    return { id: 'corotating', bodies: frame.corotating };
  return { id: 'barycentric' };
}

/** The mass-weighted center of positions (3n) of the bodies alive. */
function center(x, m, alive) {
  const c = [0, 0, 0];
  let M = 0;
  for (let i = 0; i < m.length; i++) {
    if (!alive[i]) continue;
    M += m[i];
    for (let k = 0; k < 3; k++) c[k] += m[i] * x[3 * i + k];
  }
  // Only test particles left: their plain average.
  if (!(M > 0)) {
    let n = 0;
    for (let i = 0; i < m.length; i++) {
      if (!alive[i]) continue;
      n++;
      for (let k = 0; k < 3; k++) c[k] += x[3 * i + k];
    }
    return n ? c.map(q => q / n) : c;
  }
  return c.map(q => q / M);
}

/**
 * Positions and velocities of a frame (./snapshot.js frameAt) in `frame`.
 * @returns {{x: Float64Array, v: Float64Array}}
 */
export function toFrame(f, frame) {
  const n = f.m.length;
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  const key = frameKey(frame);
  if (key.id === 'corotating') {
    const [i, j] = key.bodies;
    const s = { m: f.m, x: f.x, v: f.v };
    const map = corotating(s, i, j);
    for (let b = 0; b < n; b++) {
      const r = map(as3(f.x, b), as3(f.v, b));
      x.set(r.x, 3 * b);
      v.set(r.v, 3 * b);
    }
    return { x, v };
  }
  let ox = [0, 0, 0];
  let ov = [0, 0, 0];
  if (key.id === 'barycentric') {
    ox = center(f.x, f.m, f.alive);
    ov = center(f.v, f.m, f.alive);
  } else if (key.id === 'body') {
    ox = as3(f.x, key.bodies[0]);
    ov = as3(f.v, key.bodies[0]);
  }
  for (let b = 0; b < n; b++)
    for (let k = 0; k < 3; k++) {
      x[3 * b + k] = f.x[3 * b + k] - ox[k];
      v[3 * b + k] = f.v[3 * b + k] - ov[k];
    }
  return { x, v };
}

/**
 * Trail points (k rows of 3n inertial positions) in `frame`, each row with
 * its own time's positions. `f` is the current frame, for the masses and,
 * in a corotating frame, the pair's normal.
 * @returns {Float64Array} k rows of 3n
 */
export function trailToFrame(points, k, f, frame) {
  const n = f.m.length;
  const out = new Float64Array(points.length);
  const key = frameKey(frame);
  let ez = null;
  if (key.id === 'corotating') {
    const [i, j] = key.bodies;
    const d = [0, 1, 2].map(q => f.x[3 * j + q] - f.x[3 * i + q]);
    const u = [0, 1, 2].map(q => f.v[3 * j + q] - f.v[3 * i + q]);
    const h = [
      d[1] * u[2] - d[2] * u[1],
      d[2] * u[0] - d[0] * u[2],
      d[0] * u[1] - d[1] * u[0],
    ];
    const hn = Math.hypot(...h);
    ez = hn > 0 ? h.map(q => q / hn) : [0, 0, 1];
  }
  for (let r = 0; r < k; r++) {
    const row = points.subarray(r * 3 * n, (r + 1) * 3 * n);
    let o = [0, 0, 0];
    let ex = null;
    let ey = null;
    if (key.id === 'barycentric') o = center(row, f.m, f.alive);
    else if (key.id === 'body') o = as3(row, key.bodies[0]);
    else if (key.id === 'corotating') {
      const [i, j] = key.bodies;
      const mi = f.m[i];
      const mj = f.m[j];
      const M = mi + mj;
      const xi = as3(row, i);
      const xj = as3(row, j);
      o = xi.map((q, c) => (mi * q + mj * xj[c]) / M);
      const d = xj.map((q, c) => q - xi[c]);
      // The separation's part in the pair's plane is the rotating +x.
      const dz = d[0] * ez[0] + d[1] * ez[1] + d[2] * ez[2];
      const p = d.map((q, c) => q - dz * ez[c]);
      const pn = Math.hypot(...p);
      ex = pn > 0 ? p.map(q => q / pn) : [1, 0, 0];
      ey = [
        ez[1] * ex[2] - ez[2] * ex[1],
        ez[2] * ex[0] - ez[0] * ex[2],
        ez[0] * ex[1] - ez[1] * ex[0],
      ];
    }
    for (let b = 0; b < n; b++) {
      const q = [0, 1, 2].map(c => row[3 * b + c] - o[c]);
      const at = r * 3 * n + 3 * b;
      if (ex) {
        out[at] = q[0] * ex[0] + q[1] * ex[1] + q[2] * ex[2];
        out[at + 1] = q[0] * ey[0] + q[1] * ey[1] + q[2] * ey[2];
        out[at + 2] = q[0] * ez[0] + q[1] * ez[1] + q[2] * ez[2];
      } else for (let c = 0; c < 3; c++) out[at + c] = q[c];
    }
  }
  return out;
}
