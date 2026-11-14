// =============================================================================
// Reference solutions for the sandbox's reference cases
// -----------------------------------------------------------------------------
// Pure arithmetic, no imports: nothing here reads the engine, so a case judged
// against these functions is judged against something the engine did not write.
// Two kinds of reference:
//
//   Exact Kepler propagation of a bound two-body orbit about a fixed centre
//   (the restricted cases R1, R2 and R5), and
//
//   a classical fourth-order Runge-Kutta of the engine's own softened force law
//   (js/engine/forces.js:204-213) for the many-body cases R4 and R4x, with its
//   energy written to match: the force clamps r^2 at rmin^2 and keeps the
//   direction from the unclamped separation, so inside the floor the pull is
//   linear in r and its potential is -1.5/rmin + r^2 / (2 rmin^3) per unit of G m.
//
// Tested in tests/referenceCases.test.js against closed-form values.
// =============================================================================

/** Two-dimensional elements of a bound orbit from a state about a fixed centre. */
export function elements(r0, v0, mu) {
  const r = Math.hypot(r0.x, r0.y);
  const v2 = v0.x * v0.x + v0.y * v0.y;
  const eps = v2 / 2 - mu / r;
  if (!(eps < 0)) throw new Error('elements: the orbit is not bound');
  const a = -mu / (2 * eps);
  const h = r0.x * v0.y - r0.y * v0.x;
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (mu * mu)));
  const sigma0 = (r0.x * v0.x + r0.y * v0.y) / Math.sqrt(mu);
  const n = Math.sqrt(mu / (a * a * a));
  return {
    a,
    e,
    h,
    eps,
    n,
    sigma0,
    r0: r,
    period: (2 * Math.PI) / n,
    rp: a * (1 - e),
    ra: a * (1 + e),
    vp: Math.sqrt((mu * (1 + e)) / (a * (1 - e))),
  };
}

/**
 * Solve the time equation for the change in eccentric anomaly.
 * n t = dE + (sigma0 / sqrt a)(1 - cos dE) - (1 - r0 / a) sin dE; its derivative
 * is r / a > 0, so it is monotonic and a bracketed Newton always converges.
 */
function solveDeltaE(el, t) {
  const { a, n, sigma0, r0 } = el;
  const nt = n * t;
  const s = sigma0 / Math.sqrt(a);
  const c = 1 - r0 / a;
  const f = x => x + s * (1 - Math.cos(x)) - c * Math.sin(x) - nt;
  // |dE - nt| is bounded by the largest swing of the sinusoidal terms.
  const span = Math.abs(s) * 2 + Math.abs(c) + 1;
  let lo = nt - span;
  let hi = nt + span;
  let x = nt;
  for (let i = 0; i < 100; i++) {
    const fx = f(x);
    if (fx > 0) hi = Math.min(hi, x);
    else lo = Math.max(lo, x);
    const d = 1 + s * Math.sin(x) - c * Math.cos(x);
    let next = x - fx / d;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - x) < 1e-15 * Math.max(1, Math.abs(x))) {
      x = next;
      break;
    }
    x = next;
  }
  return x;
}

/** Exact position and velocity at time t after the state (r0, v0), bound orbit. */
export function keplerState(el, r0, v0, mu, t) {
  const { a, n, sigma0, r0: rr0 } = el;
  const dE = solveDeltaE(el, t);
  const cs = Math.cos(dE);
  const sn = Math.sin(dE);
  const r = a + (rr0 - a) * cs + sigma0 * Math.sqrt(a) * sn;
  const f = 1 - (a / rr0) * (1 - cs);
  const g = t - (dE - sn) / n;
  const fd = (-Math.sqrt(mu * a) / (r * rr0)) * sn;
  const gd = 1 - (a / r) * (1 - cs);
  return {
    x: f * r0.x + g * v0.x,
    y: f * r0.y + g * v0.y,
    vx: fd * r0.x + gd * v0.x,
    vy: fd * r0.y + gd * v0.y,
    r,
  };
}

/** The time after the state at which the orbit next reaches periapsis. */
export function timeToPeriapsis(el) {
  const { a, e, n, sigma0, r0: rr0 } = el;
  // Eccentric anomaly of the start: cos E0 = (1 - r0/a) / e, sign from the
  // radial velocity (outbound E0 in (0, pi), inbound in (-pi, 0)).
  let E0 = Math.acos(Math.max(-1, Math.min(1, (1 - rr0 / a) / e)));
  if (sigma0 < 0) E0 = -E0;
  const twoPi = 2 * Math.PI;
  let dE = -E0;
  dE = ((dE % twoPi) + twoPi) % twoPi;
  const s = sigma0 / Math.sqrt(a);
  const c = 1 - rr0 / a;
  return (dE + s * (1 - Math.cos(dE)) - c * Math.sin(dE)) / n;
}

/**
 * The largest value over the exact orbit of a |rdot| / r^2, the amplitude of
 * the first-order energy term of an eccentric orbit (R2's bound).
 */
export function maxEnergyShadow(el, mu) {
  const { a, e } = el;
  let best = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const E = (2 * Math.PI * i) / N;
    const r = a * (1 - e * Math.cos(E));
    const rdot = (Math.sqrt(mu * a) * e * Math.sin(E)) / r;
    best = Math.max(best, (a * Math.abs(rdot)) / (r * r));
  }
  return best;
}

/** Potential per unit of G m at separation r, matching the clamped force law. */
export function phi(r, rmin) {
  if (r >= rmin) return -1 / r;
  return -1.5 / rmin + (0.5 * r * r) / (rmin * rmin * rmin);
}

/** Total energy of bodies that all attract one another under the softened law. */
export function nbodyEnergy(bodies, G, rmin) {
  let e = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    e += 0.5 * b.mass * (b.vel.x * b.vel.x + b.vel.y * b.vel.y);
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(
        b.pos.x - bodies[j].pos.x,
        b.pos.y - bodies[j].pos.y
      );
      e += G * b.mass * bodies[j].mass * phi(d, rmin);
    }
  }
  return e;
}

/** Angular momentum about the centre of mass. */
export function angularMomentum(bodies) {
  let m = 0;
  let cx = 0;
  let cy = 0;
  for (const b of bodies) {
    m += b.mass;
    cx += b.mass * b.pos.x;
    cy += b.mass * b.pos.y;
  }
  cx /= m;
  cy /= m;
  let L = 0;
  for (const b of bodies)
    L += b.mass * ((b.pos.x - cx) * b.vel.y - (b.pos.y - cy) * b.vel.x);
  return L;
}

export function momentum(bodies) {
  let px = 0;
  let py = 0;
  for (const b of bodies) {
    px += b.mass * b.vel.x;
    py += b.mass * b.vel.y;
  }
  return { x: px, y: py };
}

/** Centre of mass. */
export function centre(bodies) {
  let m = 0;
  let cx = 0;
  let cy = 0;
  for (const b of bodies) {
    m += b.mass;
    cx += b.mass * b.pos.x;
    cy += b.mass * b.pos.y;
  }
  return { x: cx / m, y: cy / m };
}

/**
 * An N-body state for the RK4 reference: typed arrays, every body a source and
 * a target (the shipped heliocentric and three-body scenes run with mutual
 * gravity and no star-only restriction).
 */
export function nbodyState(bodies) {
  return {
    m: Float64Array.from(bodies, b => b.mass),
    x: Float64Array.from(bodies, b => b.pos.x),
    y: Float64Array.from(bodies, b => b.pos.y),
    vx: Float64Array.from(bodies, b => b.vel.x),
    vy: Float64Array.from(bodies, b => b.vel.y),
  };
}

function accelerations(m, x, y, G, rmin, ax, ay) {
  const n = m.length;
  const floor2 = rmin * rmin;
  for (let i = 0; i < n; i++) {
    ax[i] = 0;
    ay[i] = 0;
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      let r2 = dx * dx + dy * dy;
      if (r2 < floor2) r2 = floor2;
      const k = (G * m[j]) / (r2 * Math.sqrt(r2));
      ax[i] += k * dx;
      ay[i] += k * dy;
    }
  }
}

/** Advance the state by `duration` in steps of at most h with classical RK4. */
export function rk4Advance(st, duration, h, G, rmin) {
  const n = st.m.length;
  const { m, x, y, vx, vy } = st;
  const mk = () => new Float64Array(n);
  const a1x = mk(),
    a1y = mk(),
    a2x = mk(),
    a2y = mk();
  const a3x = mk(),
    a3y = mk(),
    a4x = mk(),
    a4y = mk();
  const x2 = mk(),
    y2 = mk(),
    v2x = mk(),
    v2y = mk();
  const x3 = mk(),
    y3 = mk(),
    v3x = mk(),
    v3y = mk();
  const x4 = mk(),
    y4 = mk(),
    v4x = mk(),
    v4y = mk();
  const steps = Math.max(1, Math.ceil(duration / h - 1e-9));
  const hh = duration / steps;
  for (let s = 0; s < steps; s++) {
    accelerations(m, x, y, G, rmin, a1x, a1y);
    for (let i = 0; i < n; i++) {
      x2[i] = x[i] + 0.5 * hh * vx[i];
      y2[i] = y[i] + 0.5 * hh * vy[i];
      v2x[i] = vx[i] + 0.5 * hh * a1x[i];
      v2y[i] = vy[i] + 0.5 * hh * a1y[i];
    }
    accelerations(m, x2, y2, G, rmin, a2x, a2y);
    for (let i = 0; i < n; i++) {
      x3[i] = x[i] + 0.5 * hh * v2x[i];
      y3[i] = y[i] + 0.5 * hh * v2y[i];
      v3x[i] = vx[i] + 0.5 * hh * a2x[i];
      v3y[i] = vy[i] + 0.5 * hh * a2y[i];
    }
    accelerations(m, x3, y3, G, rmin, a3x, a3y);
    for (let i = 0; i < n; i++) {
      x4[i] = x[i] + hh * v3x[i];
      y4[i] = y[i] + hh * v3y[i];
      v4x[i] = vx[i] + hh * a3x[i];
      v4y[i] = vy[i] + hh * a3y[i];
    }
    accelerations(m, x4, y4, G, rmin, a4x, a4y);
    for (let i = 0; i < n; i++) {
      x[i] += (hh / 6) * (vx[i] + 2 * v2x[i] + 2 * v3x[i] + v4x[i]);
      y[i] += (hh / 6) * (vy[i] + 2 * v2y[i] + 2 * v3y[i] + v4y[i]);
      vx[i] += (hh / 6) * (a1x[i] + 2 * a2x[i] + 2 * a3x[i] + a4x[i]);
      vy[i] += (hh / 6) * (a1y[i] + 2 * a2y[i] + 2 * a3y[i] + a4y[i]);
    }
  }
}
