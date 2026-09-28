// =============================================================================
// Spike: a minimal 3-D N-body kernel, Worker-safe, for the reference corpus
// -----------------------------------------------------------------------------
// Pure: typed arrays in, typed arrays out, no DOM and no module state, so it
// runs the same in Node, a page or a Worker realm. The force loop uses only
// +, -, *, / and Math.sqrt, which IEEE 754 fixes to the last bit; initial
// conditions that need sin or cos are computed once and carried as numbers,
// so a run is reproducible to the byte (R9 tests that).
//
// State: n bodies; m (Float64Array n), x (Float64Array 3n, xyz interleaved),
// v (3n), radius (n), t. A body with m = 0 is a test particle: it feels the
// others and pulls on nothing.
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

/** One classical RK4 step: order 4, not symplectic. */
export function rk4(s, h) {
  const N = 3 * s.n;
  const x0 = s.x.slice();
  const v0 = s.v.slice();
  const k1x = v0.slice();
  const k1v = accelerations(s, x0, new Float64Array(N));
  const xt = new Float64Array(N);
  const stage = (kx, c) => {
    for (let k = 0; k < N; k++) xt[k] = x0[k] + c * h * kx[k];
    return xt;
  };
  const k2x = new Float64Array(N);
  for (let k = 0; k < N; k++) k2x[k] = v0[k] + (h / 2) * k1v[k];
  const k2v = accelerations(s, stage(k1x, 0.5), new Float64Array(N));
  const k3x = new Float64Array(N);
  for (let k = 0; k < N; k++) k3x[k] = v0[k] + (h / 2) * k2v[k];
  const k3v = accelerations(s, stage(k2x, 0.5), new Float64Array(N));
  const k4x = new Float64Array(N);
  for (let k = 0; k < N; k++) k4x[k] = v0[k] + h * k3v[k];
  const k4v = accelerations(s, stage(k3x, 1), new Float64Array(N));
  for (let k = 0; k < N; k++) {
    s.x[k] = x0[k] + (h / 6) * (k1x[k] + 2 * k2x[k] + 2 * k3x[k] + k4x[k]);
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
 * Advance to t + span with Dormand-Prince 5(4), step size chosen by a local
 * error tolerance. Deterministic: the same state and tolerance take the same
 * steps. Returns the number of accepted and rejected steps.
 */
export function dopri5(s, span, { tol = 1e-12, h0 = 1e-3, hmax = Infinity } = {}) {
  const N = 3 * s.n;
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
    } else rejected++;
    const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * err ** -0.2));
    h = Math.min(hmax, h * factor);
  }
  s.x.set(y.subarray(0, N));
  s.v.set(y.subarray(N));
  s.t += span;
  return { accepted, rejected };
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

export const SCHEMES = { leapfrog, yoshida4, rk4, yoshida4c };

/** Advance by `steps` fixed steps of h with a named scheme; returns force evaluations. */
export function run(s, scheme, h, steps) {
  const a = new Float64Array(3 * s.n);
  const step = SCHEMES[scheme];
  for (let i = 0; i < steps; i++) step(s, h, a);
  return steps * { leapfrog: 2, yoshida4: 6, rk4: 4, yoshida4c: 6 }[scheme];
}

// --- Collisions -------------------------------------------------------------------

/** Merge every pair in contact: mass and momentum kept, kinetic energy lost reported. */
export function mergeContacts(s) {
  const out = [];
  for (let i = 0; i < s.n; i++) {
    for (let j = i + 1; j < s.n; j++) {
      if (s.m[i] === 0 && s.m[j] === 0) continue;
      const d = [0, 1, 2].map(k => s.x[3 * j + k] - s.x[3 * i + k]);
      const r = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      if (r >= s.radius[i] + s.radius[j] || s.m[j] === 0) continue;
      const M = s.m[i] + s.m[j];
      let ke = 0;
      for (let k = 0; k < 3; k++) {
        const vi = s.v[3 * i + k];
        const vj = s.v[3 * j + k];
        const vc = (s.m[i] * vi + s.m[j] * vj) / M;
        ke += 0.5 * (s.m[i] * vi * vi + s.m[j] * vj * vj - M * vc * vc);
        s.x[3 * i + k] = (s.m[i] * s.x[3 * i + k] + s.m[j] * s.x[3 * j + k]) / M;
        s.v[3 * i + k] = vc;
      }
      s.radius[i] = Math.cbrt(s.radius[i] ** 3 + s.radius[j] ** 3);
      s.m[i] = M;
      s.m[j] = 0;
      s.radius[j] = 0;
      for (let k = 0; k < 3; k++) {
        s.x[3 * j + k] = s.x[3 * i + k];
        s.v[3 * j + k] = s.v[3 * i + k];
      }
      s.merged.push([i, j]);
      out.push({ into: i, from: j, keLost: ke });
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
    M += s.m[i];
    for (let k = 0; k < 3; k++) c[k] += s.m[i] * s.x[3 * i + k];
  }
  return c.map(v => v / M);
}

// --- Orbital elements ---------------------------------------------------------------

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => Math.sqrt(dot(a, a));

/** Position and velocity from elements (radians), for mu = G(m1 + m2). */
export function fromElements({ a, e, i, Omega, omega, M }, mu) {
  let E;
  let r;
  let vPf;
  if (e < 1) {
    E = M;
    for (let k = 0; k < 60; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const b = a * Math.sqrt(1 - e * e);
    r = [a * (cosE - e), b * sinE, 0];
    const n = Math.sqrt(mu / a ** 3);
    const dE = n / (1 - e * cosE);
    vPf = [-a * sinE * dE, b * cosE * dE, 0];
  } else {
    let H = M;
    for (let k = 0; k < 80; k++) H -= (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
    const A = Math.abs(a);
    const b = A * Math.sqrt(e * e - 1);
    r = [A * (e - Math.cosh(H)), b * Math.sinh(H), 0];
    const n = Math.sqrt(mu / A ** 3);
    const dH = n / (e * Math.cosh(H) - 1);
    vPf = [-A * Math.sinh(H) * dH, b * Math.cosh(H) * dH, 0];
  }
  const [cO, sO, co, so, ci, si] = [Math.cos(Omega), Math.sin(Omega), Math.cos(omega), Math.sin(omega), Math.cos(i), Math.sin(i)];
  const R = [
    [cO * co - sO * so * ci, -cO * so - sO * co * ci, sO * si],
    [sO * co + cO * so * ci, -sO * so + cO * co * ci, -cO * si],
    [so * si, co * si, ci],
  ];
  const rot = p => R.map(row => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
  return { x: rot(r), v: rot(vPf) };
}

/** Elements of a relative state (radians). */
export function toElements(x, v, mu) {
  const h = cross(x, v);
  const r = norm(x);
  const ev = cross(v, h).map((c, k) => c / mu - x[k] / r);
  const e = norm(ev);
  const energyPerMass = dot(v, v) / 2 - mu / r;
  const a = -mu / (2 * energyPerMass);
  const i = Math.acos(h[2] / norm(h));
  const node = [-h[1], h[0], 0];
  const Omega = Math.atan2(node[1], node[0]);
  const omega = Math.atan2(dot(cross(node, ev), h) / norm(h), dot(node, ev));
  return { a, e, i, Omega, omega, h, ev };
}

/** SHA-256 of the state's bytes (positions, velocities, masses, t). */
export async function stateHash(s) {
  const buf = new Float64Array(s.x.length + s.v.length + s.m.length + 1);
  buf.set(s.x, 0);
  buf.set(s.v, s.x.length);
  buf.set(s.m, s.x.length + s.v.length);
  buf[buf.length - 1] = s.t;
  const d = await crypto.subtle.digest('SHA-256', buf.buffer);
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
