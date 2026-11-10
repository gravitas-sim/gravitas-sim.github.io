// =============================================================================
// The 3-D lab's run modes: Kepler-only and precomputed, beside the N-body run
// -----------------------------------------------------------------------------
// A guide names the physical run mode its task needs, because a mode that
// cannot show a thing must not be asked to (Prompt 271):
//
//   kepler       every body on its own two-body orbit about its primary,
//                advanced by the mean motion and Kepler's equation. Nothing
//                pulls on anything else: the elements stay fixed forever, so
//                it can show an orbit's geometry and cannot show libration,
//                secular exchange, precession or a close encounter
//   nbody        the integrator of the validated 3-D kernel (live.js), the
//                scheme and step named by the system
//   precomputed  a recorded run played back, with its provenance
//
// A mode's session has the live client's shape (liveClient.js): `ready`
// resolves with the first snapshot, `advance(k)` with the snapshot k
// intervals later, `stop()` ends it, so the lab draws all three alike.
// Loaded only when a reader or a guide asks for Kepler-only or a replay.
// =============================================================================

import { toElements, fromElements } from './elements.js';
import { gravityOf } from './state.js';
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from './snapshot.js';
import { hierarchy } from './view/instruments.js';

export const MODES = Object.freeze(['kepler', 'nbody', 'precomputed']);

/** The most intervals one advance takes, as the live session's. */
const MAX_PER_ADVANCE = 256;

/**
 * The bodies of a system as the frame the hierarchy reads.
 * @returns {{m: Float64Array, x: Float64Array, v: Float64Array, alive: Uint8Array}}
 */
const frameOf = system => ({
  m: Float64Array.from(system.bodies, b => b.m),
  x: Float64Array.from(system.bodies.flatMap(b => b.x)),
  v: Float64Array.from(system.bodies.flatMap(b => b.v)),
  alive: Uint8Array.from(system.bodies, () => 1),
});

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/**
 * The conserved quantities of a state, as the engine reports them against
 * the start: relative energy, relative angular momentum vector and the change
 * of total momentum relative to the largest body momentum.
 */
function conserved(m, x, v, G) {
  const n = m.length;
  let ke = 0;
  let pe = 0;
  const L = [0, 0, 0];
  const P = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const vi = [v[3 * i], v[3 * i + 1], v[3 * i + 2]];
    const xi = [x[3 * i], x[3 * i + 1], x[3 * i + 2]];
    ke += 0.5 * m[i] * (vi[0] ** 2 + vi[1] ** 2 + vi[2] ** 2);
    L[0] += m[i] * (xi[1] * vi[2] - xi[2] * vi[1]);
    L[1] += m[i] * (xi[2] * vi[0] - xi[0] * vi[2]);
    L[2] += m[i] * (xi[0] * vi[1] - xi[1] * vi[0]);
    for (let k = 0; k < 3; k++) P[k] += m[i] * vi[k];
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(
        xi[0] - x[3 * j],
        xi[1] - x[3 * j + 1],
        xi[2] - x[3 * j + 2]
      );
      pe -= (G * m[i] * m[j]) / d;
    }
  }
  return { energy: ke + pe, L, P };
}

/**
 * A Kepler-only session (see the header). The roots of the hierarchy (the
 * bodies that orbit nothing) move in straight lines at their own velocities;
 * every other body is on the two-body orbit it has about its primary at the
 * start, mu = G (m + m_primary), advanced by the mean motion.
 * @param {object} system - A validated gravitas.system3d/1
 * @param {{interval: number}} o - Simulation time per tick
 */
export function createKeplerSession(system, { interval }) {
  const G = gravityOf(system);
  const f = frameOf(system);
  const n = system.bodies.length;
  const h = hierarchy(f);
  const order = [...Array(n).keys()].sort((a, b) => h.depth[a] - h.depth[b]);
  const orbit = new Array(n).fill(null);
  for (const i of order) {
    const p = h.primary[i];
    if (p < 0) continue;
    const b = system.bodies[i];
    const q = system.bodies[p];
    const mu = G * (b.m + q.m);
    const el = toElements(sub(b.x, q.x), sub(b.v, q.v), mu);
    const A = Math.abs(el.a);
    orbit[i] = { p, el, mu, n: Math.sqrt(mu / (A * A * A)) };
  }
  const t0 = system.t ?? 0;
  const start = conserved(f.m, f.x, f.v, G);
  const ids = system.bodies.map(b => b.id);
  const m = f.m.slice();
  const radius = Float64Array.from(system.bodies, b => b.radius ?? 0);
  let k = 0;
  let seq = 0;
  let stopped = false;
  let warned = false;

  const stateAt = t => {
    const x = new Float64Array(3 * n);
    const v = new Float64Array(3 * n);
    for (const i of order) {
      const o = orbit[i];
      const b = system.bodies[i];
      if (!o) {
        for (let c = 0; c < 3; c++) {
          x[3 * i + c] = b.x[c] + b.v[c] * (t - t0);
          v[3 * i + c] = b.v[c];
        }
        continue;
      }
      const rel = fromElements({ ...o.el, M: o.el.M + o.n * (t - t0) }, o.mu);
      for (let c = 0; c < 3; c++) {
        x[3 * i + c] = x[3 * o.p + c] + rel.x[c];
        v[3 * i + c] = v[3 * o.p + c] + rel.v[c];
      }
    }
    return { x, v };
  };

  const snapshot = (trail, trailT, t, s) => {
    const now = conserved(m, s.x, s.v, G);
    const Lnorm = Math.hypot(...start.L) || 1;
    const Pscale =
      Math.max(
        ...m.map(
          (mi, i) => mi * Math.hypot(f.v[3 * i], f.v[3 * i + 1], f.v[3 * i + 2])
        )
      ) || 1;
    const warnings = warned ? [] : [{ code: 'keplerOnly' }];
    warned = true;
    return {
      format: SNAPSHOT_FORMAT,
      formatVersion: SNAPSHOT_VERSION,
      seq: seq++,
      t,
      ids,
      m: m.slice(),
      radius: radius.slice(),
      x: s.x.slice(),
      v: s.v.slice(),
      alive: new Uint8Array(n).fill(1),
      trail,
      trailT,
      events: [],
      warnings,
      errors: {
        energy: Math.abs((now.energy - start.energy) / start.energy),
        angularMomentum: Math.hypot(...sub(now.L, start.L)) / Lnorm,
        momentum: Math.hypot(...sub(now.P, start.P)) / Pscale,
      },
      status: null,
    };
  };

  const first = snapshot(
    new Float64Array(0),
    new Float64Array(0),
    t0,
    stateAt(t0)
  );
  /** The advance itself, synchronous: the tools and tests that run in Node use it. */
  const advanceNow = intervals => {
    const steps = Math.min(
      MAX_PER_ADVANCE,
      Math.max(1, Math.floor(intervals) || 1)
    );
    const trail = new Float64Array(steps * 3 * n);
    const trailT = new Float64Array(steps);
    let s = null;
    for (let r = 0; r < steps; r++) {
      k++;
      const t = t0 + k * interval;
      s = stateAt(t);
      trail.set(s.x, r * 3 * n);
      trailT[r] = t;
    }
    return snapshot(trail, trailT, t0 + k * interval, s);
  };
  return {
    first,
    advanceNow,
    ready: Promise.resolve({ snapshot: first, migrated: false }),
    advance(intervals) {
      if (stopped)
        return Promise.reject(
          Object.assign(new Error('stopped'), { code: 'stopped' })
        );
      return Promise.resolve(advanceNow(intervals));
    },
    stop() {
      stopped = true;
    },
  };
}

/**
 * A precomputed run played back as a session (see the header). A run is plain
 * data: {ids, m, radius, t0, interval, x: Float64Array[], v: Float64Array[],
 * provenance}, one position and velocity array per tick from t0, recorded from
 * the kernel (tests/lab3dCurriculumII.test.js records one from a live
 * session). It lives in memory: no file format is defined for it.
 */
export function createReplaySession(run) {
  const n = run.ids.length;
  const last = run.x.length - 1;
  let k = 0;
  let seq = 0;
  let stopped = false;
  const snapshot = (trail, trailT, frame) => ({
    format: SNAPSHOT_FORMAT,
    formatVersion: SNAPSHOT_VERSION,
    seq: seq++,
    t: run.t0 + frame * run.interval,
    ids: run.ids,
    m: run.m.slice(),
    radius: run.radius.slice(),
    x: run.x[frame].slice(),
    v: run.v[frame].slice(),
    alive: new Uint8Array(n).fill(1),
    trail,
    trailT,
    events: [],
    warnings: [],
    errors: { energy: 0, angularMomentum: 0, momentum: 0 },
    status: frame >= last ? 'precomputedEnd' : null,
  });
  return {
    ready: Promise.resolve({
      snapshot: snapshot(new Float64Array(0), new Float64Array(0), 0),
      migrated: false,
    }),
    advance(intervals) {
      if (stopped)
        return Promise.reject(
          Object.assign(new Error('stopped'), { code: 'stopped' })
        );
      const steps = Math.min(
        MAX_PER_ADVANCE,
        Math.max(1, Math.floor(intervals) || 1),
        Math.max(1, last - k)
      );
      const trail = new Float64Array(steps * 3 * n);
      const trailT = new Float64Array(steps);
      for (let r = 0; r < steps; r++) {
        k = Math.min(last, k + 1);
        trail.set(run.x[k], r * 3 * n);
        trailT[r] = run.t0 + k * run.interval;
      }
      return Promise.resolve(snapshot(trail, trailT, k));
    },
    stop() {
      stopped = true;
    },
  };
}

/**
 * What a run mode is, as data for the lab's indicator and the tests: the mode,
 * and for N-body the integrator and the step the system names, for a
 * precomputed run its provenance.
 */
export function describeMode(mode, system, { interval, provenance } = {}) {
  if (mode === 'kepler') return { mode, interval };
  if (mode === 'precomputed') return { mode, interval, provenance };
  const it = system.integrator;
  return {
    mode: 'nbody',
    scheme: it.scheme,
    step: it.h ?? null,
    tolerance: it.tol ?? null,
    interval,
  };
}
