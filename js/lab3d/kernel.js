// =============================================================================
// The 3-D small-N kernel: state, forces, integrators, collisions
// -----------------------------------------------------------------------------
// The accepted design of VALIDATED_3D_LAB_GATE.md, in production form. Pure:
// typed arrays in and out, no DOM, no module state and nothing from the 2-D
// engine, so it runs in a disposable Worker realm (./worker.js) and in Node
// alike, and one realm can never see another's bodies.
//
// Reproducible to the byte: the force loop, the integrators and the step
// control use only + - * / and Math.sqrt, which IEEE 754 fixes to the last
// bit, so the same numbers in give the same numbers out in every engine (the
// gate's R9). Anything that needs sin, cos or pow (orbital elements, a seeded
// system) happens once, before a run, and the run is handed the numbers.
//
// State: n bodies; m (Float64Array n), x (Float64Array 3n, xyz interleaved),
// v (3n), radius (n), t, and G. A body with m = 0 is a test particle: it
// feels the others and pulls on nothing. A merged body keeps its slot with
// m = 0 and radius = 0, and `alive` says which slots still hold a body.
// =============================================================================

/** A state from plain bodies [{m, x: [3], v: [3], radius?}]. */
export function makeState(bodies, { G = 1 } = {}) {
  const n = bodies.length;
  const s = {
    n,
    G,
    t: 0,
    m: new Float64Array(n),
    radius: new Float64Array(n),
    x: new Float64Array(3 * n),
    v: new Float64Array(3 * n),
    merged: [],
    alive: new Uint8Array(n).fill(1),
  };
  bodies.forEach((b, i) => {
    s.m[i] = b.m;
    s.radius[i] = b.radius ?? 0;
    for (let k = 0; k < 3; k++) {
      s.x[3 * i + k] = b.x[k];
      s.v[3 * i + k] = b.v[k];
    }
  });
  return s;
}

export const copyState = s => ({
  ...s,
  m: s.m.slice(),
  radius: s.radius.slice(),
  x: s.x.slice(),
  v: s.v.slice(),
  merged: [...s.merged],
  alive: s.alive.slice(),
  cx: s.cx?.slice(),
  cv: s.cv?.slice(),
  work: undefined,
});

/** Accelerations of every body from positions x, into a (3n). Pairwise and symmetric. */
export function accelerations(s, x, a) {
  const { n, m, G } = s;
  a.fill(0);
  for (let i = 0; i < n; i++) {
    const xi = x[3 * i];
    const yi = x[3 * i + 1];
    const zi = x[3 * i + 2];
    for (let j = i + 1; j < n; j++) {
      if (m[i] === 0 && m[j] === 0) continue;
      if (!s.alive[i] || !s.alive[j]) continue;
      const dx = x[3 * j] - xi;
      const dy = x[3 * j + 1] - yi;
      const dz = x[3 * j + 2] - zi;
      const r2 = dx * dx + dy * dy + dz * dz;
      const inv = G / (r2 * Math.sqrt(r2));
      const fi = m[j] * inv;
      const fj = m[i] * inv;
      a[3 * i] += fi * dx;
      a[3 * i + 1] += fi * dy;
      a[3 * i + 2] += fi * dz;
      a[3 * j] -= fj * dx;
      a[3 * j + 1] -= fj * dy;
      a[3 * j + 2] -= fj * dz;
    }
  }
  return a;
}

// --- Fixed-step schemes --------------------------------------------------------

function kick(s, a, h) {
  const { v } = s;
  for (let k = 0; k < v.length; k++) v[k] += h * a[k];
}
function drift(s, h) {
  const { x, v } = s;
  for (let k = 0; k < x.length; k++) x[k] += h * v[k];
}

/** One leapfrog (kick-drift-kick) step: order 2, symplectic, time-reversible. */
export function leapfrog(s, h, a = new Float64Array(3 * s.n)) {
  accelerations(s, s.x, a);
  kick(s, a, h / 2);
  drift(s, h);
  accelerations(s, s.x, a);
  kick(s, a, h / 2);
  s.t += h;
}

// Yoshida (1990): a fourth-order composition of three leapfrog steps, with
// w1 = 1 / (2 - 2^(1/3)) and w0 = 1 - 2 w1. Written as literals, not
// computed: Math.cbrt is only approximated by the standard, and an engine
// that rounds it differently would break the byte-for-byte reproducibility.
const W1 = 1.3512071919596578;
const W0 = -1.7024143839193155;

/** One Yoshida step: order 4, symplectic, three leapfrogs of weights w1, w0, w1. */
export function yoshida4(s, h, a = new Float64Array(3 * s.n)) {
  const t = s.t;
  leapfrog(s, W1 * h, a);
  leapfrog(s, W0 * h, a);
  leapfrog(s, W1 * h, a);
  s.t = t + h;
}

/** Scratch arrays a scheme reuses from step to step, made once per state. */
function work(s, count) {
  const N = 3 * s.n;
  if (!s.work || s.work.length < count || s.work[0].length !== N)
    s.work = Array.from({ length: count }, () => new Float64Array(N));
  return s.work;
}

/** One classical RK4 step: order 4, not symplectic. */
export function rk4(s, h) {
  const N = 3 * s.n;
  const [x0, v0, k1v, k2v, k3v, k4v, k2x, k3x, k4x, xt] = work(s, 10);
  x0.set(s.x);
  v0.set(s.v);
  accelerations(s, x0, k1v);
  for (let k = 0; k < N; k++) xt[k] = x0[k] + 0.5 * h * v0[k];
  for (let k = 0; k < N; k++) k2x[k] = v0[k] + 0.5 * h * k1v[k];
  accelerations(s, xt, k2v);
  for (let k = 0; k < N; k++) xt[k] = x0[k] + 0.5 * h * k2x[k];
  for (let k = 0; k < N; k++) k3x[k] = v0[k] + 0.5 * h * k2v[k];
  accelerations(s, xt, k3v);
  for (let k = 0; k < N; k++) xt[k] = x0[k] + h * k3x[k];
  for (let k = 0; k < N; k++) k4x[k] = v0[k] + h * k3v[k];
  accelerations(s, xt, k4v);
  for (let k = 0; k < N; k++) {
    s.x[k] = x0[k] + (h / 6) * (v0[k] + 2 * k2x[k] + 2 * k3x[k] + k4x[k]);
    s.v[k] = v0[k] + (h / 6) * (k1v[k] + 2 * k2v[k] + 2 * k3v[k] + k4v[k]);
  }
  s.t += h;
}

// --- Adaptive Dormand-Prince 5(4) ----------------------------------------------

const DP = {
  c: [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1],
  a: [
    [],
    [1 / 5],
    [3 / 40, 9 / 40],
    [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
    [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
  ],
  b: [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0],
  e: [
    71 / 57600,
    0,
    -71 / 16695,
    71 / 1920,
    -17253 / 339200,
    22 / 525,
    -1 / 40,
  ],
};

/**
 * The next step's factor, 0.9 err^(-1/5) held to [0.2, 5], computed with
 * Newton's method on y^5 = 1/err in + - * / only. `err ** -0.2` would be
 * shorter; the standard leaves Math.pow to each engine, and the step sizes
 * would then depend on the engine running them.
 */
export function stepFactor(err) {
  if (!(err > 0)) return 5;
  const c = 1 / err;
  // 0.9 y outside [0.2, 5] is clamped, so y is only needed on [0.222, 5.56].
  if (c >= 5373.0) return 5; // (5 / 0.9)^5 = 5292.7
  if (c <= 0.00053) return 0.2; // (0.2 / 0.9)^5 = 0.000542
  let y = c > 1 ? 2 : 0.6;
  for (let k = 0; k < 40; k++) {
    const y4 = y * y * y * y;
    y -= (y4 * y - c) / (5 * y4);
  }
  return Math.min(5, Math.max(0.2, 0.9 * y));
}

/**
 * Advance to t + span with Dormand-Prince 5(4), step size chosen by a local
 * error tolerance. Deterministic: the same state and tolerance take the same
 * steps. Returns the number of accepted and rejected steps.
 */
export function dopri5(
  s,
  span,
  { tol = 1e-12, h0 = 1e-3, hmax = Infinity, onStep, maxSteps = Infinity } = {}
) {
  const N = 3 * s.n;
  const t0 = s.t;
  const y = new Float64Array(2 * N);
  y.set(s.x, 0);
  y.set(s.v, N);
  const f = (yy, out) => {
    out.set(yy.subarray(N), 0);
    const acc = accelerations(s, yy.subarray(0, N), new Float64Array(N));
    out.set(acc, N);
    return out;
  };
  const k = Array.from({ length: 7 }, () => new Float64Array(2 * N));
  const tmp = new Float64Array(2 * N);
  const next = new Float64Array(2 * N);
  let t = 0;
  let h = Math.min(h0, span);
  let accepted = 0;
  let rejected = 0;
  f(y, k[0]);
  while (t < span) {
    if (t + h > span) h = span - t;
    for (let st = 1; st < 7; st++) {
      for (let q = 0; q < 2 * N; q++) {
        let sum = y[q];
        for (let r = 0; r < st; r++) sum += h * DP.a[st][r] * k[r][q];
        tmp[q] = sum;
      }
      f(tmp, k[st]);
    }
    let err = 0;
    for (let q = 0; q < 2 * N; q++) {
      let sum = y[q];
      let e = 0;
      for (let r = 0; r < 7; r++) {
        sum += h * DP.b[r] * k[r][q];
        e += h * DP.e[r] * k[r][q];
      }
      next[q] = sum;
      const scale = tol * (1 + Math.max(Math.abs(y[q]), Math.abs(sum)));
      err = Math.max(err, Math.abs(e) / scale);
    }
    if (err <= 1) {
      t += h;
      y.set(next);
      k[0].set(k[6]); // first same as last
      accepted++;
      if (onStep) {
        // The state as of this step, for event detection; a stop request
        // ends the span here.
        s.x.set(y.subarray(0, N));
        s.v.set(y.subarray(N));
        s.t = t0 + t;
        if (onStep(h) === false)
          return { accepted, rejected, stopped: true, h };
      }
    } else rejected++;
    if (accepted + rejected >= maxSteps) {
      s.x.set(y.subarray(0, N));
      s.v.set(y.subarray(N));
      s.t = t0 + t;
      return { accepted, rejected, stopped: true, h };
    }
    h = Math.min(hmax, h * stepFactor(err));
  }
  s.x.set(y.subarray(0, N));
  s.v.set(y.subarray(N));
  s.t = t0 + span;
  return { accepted, rejected, stopped: false, h };
}

// --- Compensated summation --------------------------------------------------------
//
// Added after the first corpus run showed a rounding floor: over millions of
// steps, the rounding in x += h v and v += h a accumulates past 1e-13 in the
// total momentum (R3). Kahan's compensated sum carries each update's lost
// low-order bits into the next, as production N-body codes do. The scheme is
// Yoshida's unchanged; only the additions are more exact.

function kahan(target, comp, k, inc) {
  const y = inc - comp[k];
  const t = target[k] + y;
  comp[k] = t - target[k] - y;
  target[k] = t;
}
function leapfrogC(s, h, a) {
  s.cx ??= new Float64Array(3 * s.n);
  s.cv ??= new Float64Array(3 * s.n);
  const N = 3 * s.n;
  accelerations(s, s.x, a);
  for (let k = 0; k < N; k++) kahan(s.v, s.cv, k, (h / 2) * a[k]);
  for (let k = 0; k < N; k++) kahan(s.x, s.cx, k, h * s.v[k]);
  accelerations(s, s.x, a);
  for (let k = 0; k < N; k++) kahan(s.v, s.cv, k, (h / 2) * a[k]);
  s.t += h;
}
/** Yoshida's fourth-order scheme with compensated kicks and drifts. */
export function yoshida4c(s, h, a = new Float64Array(3 * s.n)) {
  const t = s.t;
  leapfrogC(s, W1 * h, a);
  leapfrogC(s, W0 * h, a);
  leapfrogC(s, W1 * h, a);
  s.t = t + h;
}

export const SCHEMES = Object.freeze({ leapfrog, yoshida4, yoshida4c, rk4 });
/** Force evaluations per step: what a run's cost is counted in. */
export const EVALS_PER_STEP = Object.freeze({
  leapfrog: 2,
  yoshida4: 6,
  yoshida4c: 6,
  rk4: 4,
});

/** Advance by `steps` fixed steps of h with a named scheme; returns force evaluations. */
export function run(s, scheme, h, steps) {
  const a = new Float64Array(3 * s.n);
  const step = SCHEMES[scheme];
  for (let i = 0; i < steps; i++) step(s, h, a);
  return steps * EVALS_PER_STEP[scheme];
}

// --- Collisions -------------------------------------------------------------------

/** A cube root in + - * / only (Newton's method), for the same reason as stepFactor. */
export function cubeRoot(c) {
  if (!(c > 0)) return 0;
  let y = c > 1 ? c / 3 + 0.7 : 1;
  for (let k = 0; k < 200; k++) {
    const next = y - (y * y * y - c) / (3 * y * y);
    if (next === y) break;
    y = next;
  }
  return y;
}

/**
 * Merge every pair in contact (centers closer than the sum of the radii).
 * Two bodies with mass become one: mass and momentum kept, the center of mass
 * kept, the volumes added, and the kinetic energy lost reported. A test
 * particle that touches a body is absorbed and changes nothing. Two test
 * particles pass through each other.
 * @returns {Array<{into: number, from: number, t: number, keLost: number}>}
 */
export function mergeContacts(s) {
  const out = [];
  for (let i = 0; i < s.n; i++) {
    if (!s.alive[i]) continue;
    for (let j = i + 1; j < s.n; j++) {
      if (!s.alive[j] || !s.alive[i]) continue;
      if (s.m[i] === 0 && s.m[j] === 0) continue;
      const dx = s.x[3 * j] - s.x[3 * i];
      const dy = s.x[3 * j + 1] - s.x[3 * i + 1];
      const dz = s.x[3 * j + 2] - s.x[3 * i + 2];
      const reach = s.radius[i] + s.radius[j];
      if (dx * dx + dy * dy + dz * dz >= reach * reach) continue;
      // The survivor is the heavier; on a tie, the earlier slot.
      const [keep, gone] = s.m[j] > s.m[i] ? [j, i] : [i, j];
      const M = s.m[keep] + s.m[gone];
      const before = [0, 1, 2].map(
        k => s.m[keep] * s.v[3 * keep + k] + s.m[gone] * s.v[3 * gone + k]
      );
      let ke = 0;
      if (s.m[gone] > 0) {
        for (let k = 0; k < 3; k++) {
          const a = 3 * keep + k;
          const b = 3 * gone + k;
          const vc = (s.m[keep] * s.v[a] + s.m[gone] * s.v[b]) / M;
          ke +=
            0.5 *
            (s.m[keep] * s.v[a] * s.v[a] +
              s.m[gone] * s.v[b] * s.v[b] -
              M * vc * vc);
          s.x[a] = (s.m[keep] * s.x[a] + s.m[gone] * s.x[b]) / M;
          s.v[a] = vc;
        }
        const r1 = s.radius[keep];
        const r2 = s.radius[gone];
        s.radius[keep] = cubeRoot(r1 * r1 * r1 + r2 * r2 * r2);
        s.m[keep] = M;
      }
      s.m[gone] = 0;
      s.radius[gone] = 0;
      s.alive[gone] = 0;
      s.merged.push([keep, gone]);
      // What the merger itself changed: nothing, to rounding, in mass and
      // momentum (the gate's R8 checks both).
      const after = [0, 1, 2].map(k => s.m[keep] * s.v[3 * keep + k]);
      const pn = Math.sqrt(
        before[0] * before[0] + before[1] * before[1] + before[2] * before[2]
      );
      const dp = Math.sqrt(
        (after[0] - before[0]) * (after[0] - before[0]) +
          (after[1] - before[1]) * (after[1] - before[1]) +
          (after[2] - before[2]) * (after[2] - before[2])
      );
      out.push({
        into: keep,
        from: gone,
        t: s.t,
        keLost: ke,
        momentumChange: pn > 0 ? dp / pn : dp,
        mass: M,
      });
    }
  }
  return out;
}

// --- Conserved quantities -------------------------------------------------------------

export function energy(s) {
  let T = 0;
  let U = 0;
  for (let i = 0; i < s.n; i++) {
    const vx = s.v[3 * i];
    const vy = s.v[3 * i + 1];
    const vz = s.v[3 * i + 2];
    T += 0.5 * s.m[i] * (vx * vx + vy * vy + vz * vz);
    for (let j = i + 1; j < s.n; j++) {
      const dx = s.x[3 * j] - s.x[3 * i];
      const dy = s.x[3 * j + 1] - s.x[3 * i + 1];
      const dz = s.x[3 * j + 2] - s.x[3 * i + 2];
      U -= (s.G * s.m[i] * s.m[j]) / Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return T + U;
}

export function momentum(s) {
  const p = [0, 0, 0];
  for (let i = 0; i < s.n; i++)
    for (let k = 0; k < 3; k++) p[k] += s.m[i] * s.v[3 * i + k];
  return p;
}

export function angularMomentum(s) {
  const L = [0, 0, 0];
  for (let i = 0; i < s.n; i++) {
    const [x, y, z] = [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]];
    const [vx, vy, vz] = [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]];
    L[0] += s.m[i] * (y * vz - z * vy);
    L[1] += s.m[i] * (z * vx - x * vz);
    L[2] += s.m[i] * (x * vy - y * vx);
  }
  return L;
}

export function barycenter(s) {
  let M = 0;
  const c = [0, 0, 0];
  for (let i = 0; i < s.n; i++) {
    if (!s.alive[i]) continue;
    M += s.m[i];
    for (let k = 0; k < 3; k++) c[k] += s.m[i] * s.x[3 * i + k];
  }
  return c.map(v => v / M);
}

/** SHA-256 of the state's bytes (positions, velocities, masses, t). */
export async function stateHash(s) {
  const buf = new Float64Array(s.x.length + s.v.length + s.m.length + 1);
  buf.set(s.x, 0);
  buf.set(s.v, s.x.length);
  buf.set(s.m, s.x.length + s.v.length);
  buf[buf.length - 1] = s.t;
  const d = await crypto.subtle.digest('SHA-256', buf.buffer);
  return [...new Uint8Array(d)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
