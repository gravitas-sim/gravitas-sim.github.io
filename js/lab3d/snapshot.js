// =============================================================================
// The boundary between the 3-D kernel's Worker and anything that draws it
// -----------------------------------------------------------------------------
// A live run (./live.js) does not hand a page its state. It hands a snapshot:
// a versioned copy of the bodies at one simulation time, with what happened
// since the last one. A renderer reads snapshots, and nothing else, so the
// kernel can change without the lab noticing and the lab can be tested
// without a kernel.
//
//   {format: 'gravitas.lab3d.snapshot', formatVersion: 1, seq, t,
//    ids,                   the system's body ids, one per slot
//    m, radius, x, v, alive, per body: mass, radius, position, velocity (3
//                           each) and whether it is still there (0/1)
//    trail, trailT,         every interval's positions since the last snapshot
//    events, warnings,      what the run reported since the last snapshot
//    errors: {energy, angularMomentum, momentum},  against the session start
//    status}                null while live, else why it stopped
//
// Between two snapshots a page draws from the newer one's trail rows, which
// are every interval's positions: a cubic through the four rows around the
// moment (Catmull-Rom on a uniform grid), so the error is set by one tick of
// the kernel, however many ticks a snapshot covers. With no rows it falls
// back to cubic Hermite from both ends' positions and velocities. A body that
// merged is drawn where the newer snapshot says. Numbers a reader measures
// come from a snapshot itself, never from these.
// =============================================================================

export const SNAPSHOT_FORMAT = 'gravitas.lab3d.snapshot';
export const SNAPSHOT_VERSION = 1;

const isArr = v => v instanceof Float64Array;

/**
 * Whether a message is a snapshot this page can read.
 * @returns {string|null} Why not, or null
 */
export function snapshotProblem(s) {
  if (!s || typeof s !== 'object') return 'notObject';
  if (s.format !== SNAPSHOT_FORMAT) return 'format';
  if (s.formatVersion !== SNAPSHOT_VERSION) return 'version';
  if (!Number.isFinite(s.t) || !Number.isInteger(s.seq)) return 'time';
  const n = s.m?.length;
  if (!isArr(s.m) || !isArr(s.x) || !isArr(s.v) || !isArr(s.radius))
    return 'arrays';
  if (!Array.isArray(s.ids) || s.ids.length !== n) return 'ids';
  if (s.radius.length !== n) return 'arrays';
  if (s.x.length !== 3 * n || s.v.length !== 3 * n) return 'arrays';
  if (!(s.alive instanceof Uint8Array) || s.alive.length !== n) return 'arrays';
  if (!isArr(s.trail) || !isArr(s.trailT)) return 'trail';
  if (s.trail.length !== s.trailT.length * 3 * n) return 'trail';
  return null;
}

/**
 * Positions at time t between snapshots a (earlier) and b (later), by cubic
 * Hermite interpolation. Outside [a.t, b.t] it clamps to the nearer end.
 * @returns {Float64Array} 3n positions
 */
export function interpolate(a, b, t, out = new Float64Array(b.x.length)) {
  const dt = b.t - a.t;
  if (!(dt > 0) || t >= b.t || a.x.length !== b.x.length) {
    out.set(b.x);
    return out;
  }
  if (t <= a.t) {
    out.set(a.x);
    return out;
  }
  const s = (t - a.t) / dt;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const n = b.m.length;
  for (let i = 0; i < n; i++) {
    const base = 3 * i;
    // A merger in the gap: the survivor jumps, the absorbed body is gone.
    if (!b.alive[i] || !a.alive[i] || a.m[i] !== b.m[i]) {
      for (let k = 0; k < 3; k++) out[base + k] = b.x[base + k];
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const j = base + k;
      out[j] =
        h00 * a.x[j] + h10 * dt * a.v[j] + h01 * b.x[j] + h11 * dt * b.v[j];
    }
  }
  return out;
}

/** The velocity at t between a and b: the derivative of the same Hermite curve. */
export function interpolateVelocity(
  a,
  b,
  t,
  out = new Float64Array(b.v.length)
) {
  const dt = b.t - a.t;
  if (!(dt > 0) || t >= b.t || a.v.length !== b.v.length) {
    out.set(b.v);
    return out;
  }
  if (t <= a.t) {
    out.set(a.v);
    return out;
  }
  const s = (t - a.t) / dt;
  const s2 = s * s;
  const d00 = (6 * s2 - 6 * s) / dt;
  const d10 = 3 * s2 - 4 * s + 1;
  const d01 = (-6 * s2 + 6 * s) / dt;
  const d11 = 3 * s2 - 2 * s;
  const n = b.m.length;
  for (let i = 0; i < n; i++) {
    const base = 3 * i;
    if (!b.alive[i] || !a.alive[i] || a.m[i] !== b.m[i]) {
      for (let k = 0; k < 3; k++) out[base + k] = b.v[base + k];
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const j = base + k;
      out[j] = d00 * a.x[j] + d10 * a.v[j] + d01 * b.x[j] + d11 * b.v[j];
    }
  }
  return out;
}

/**
 * The frame a page draws at time t: positions and velocities from the two
 * snapshots around it, with the masses and liveness of the newer.
 */
export function frameAt(a, b, t) {
  return {
    t: Math.min(Math.max(t, a ? a.t : b.t), b.t),
    m: b.m,
    alive: b.alive,
    x: a ? interpolate(a, b, t) : b.x.slice(),
    v: a ? interpolateVelocity(a, b, t) : b.v.slice(),
  };
}

/**
 * Positions at time t from b's trail rows (every interval since a), with a's
 * positions as the row before the first: a cubic through the four rows around
 * t. Falls back to interpolate() when b has no rows.
 * @returns {Float64Array} 3n positions
 */
export function positionsAt(a, b, t, out = new Float64Array(b.x.length)) {
  const k = b.trailT.length;
  if (!a || !k || a.x.length !== b.x.length)
    return a ? interpolate(a, b, t, out) : (out.set(b.x), out);
  const n3 = b.x.length;
  // Row r: -1 is a's positions, 0..k-1 are b's trail rows.
  const T = r => (r < 0 ? a.t : b.trailT[Math.min(r, k - 1)]);
  const row = r =>
    r < 0
      ? a.x
      : b.trail.subarray(
          Math.min(r, k - 1) * n3,
          (Math.min(r, k - 1) + 1) * n3
        );
  if (t <= a.t) {
    out.set(a.x);
    return out;
  }
  if (t >= b.trailT[k - 1]) {
    out.set(row(k - 1));
    return out;
  }
  let j = 0;
  while (j < k && b.trailT[j] < t) j++;
  // t lies in [T(j - 1), T(j)].
  const t1 = T(j - 1);
  const t2 = T(j);
  const s = (t - t1) / (t2 - t1);
  const p1 = row(j - 1);
  const p2 = row(j);
  // Neighbors outside the rows repeat the end, which makes that end's
  // tangent one-sided rather than inventing a point.
  const p0 = j - 2 >= -1 ? row(j - 2) : p1;
  const p3 = j + 1 <= k - 1 ? row(j + 1) : p2;
  const s2 = s * s;
  const s3 = s2 * s;
  for (let q = 0; q < n3; q++) {
    const m1 = (p2[q] - p0[q]) / 2;
    const m2 = (p3[q] - p1[q]) / 2;
    out[q] =
      (2 * s3 - 3 * s2 + 1) * p1[q] +
      (s3 - 2 * s2 + s) * m1 +
      (-2 * s3 + 3 * s2) * p2[q] +
      (s3 - s2) * m2;
  }
  const i0 = b.m.length;
  for (let i = 0; i < i0; i++)
    if (!b.alive[i] || !a.alive[i] || a.m[i] !== b.m[i])
      for (let c = 0; c < 3; c++) out[3 * i + c] = b.x[3 * i + c];
  return out;
}

/**
 * The frame a page draws at t: positions from the trail rows, velocities by
 * Hermite from the snapshots' own (for arrows only), masses and liveness of
 * the newer snapshot.
 */
export function drawnAt(a, b, t) {
  return {
    t: Math.min(Math.max(t, a ? a.t : b.t), b.t),
    m: b.m,
    alive: b.alive,
    x: positionsAt(a, b, t),
    v: a ? interpolateVelocity(a, b, t) : b.v.slice(),
  };
}

/** A snapshot's own state as a frame: what the tables and instruments read. */
export const exactFrame = s => ({
  t: s.t,
  m: s.m,
  alive: s.alive,
  x: s.x,
  v: s.v,
});
