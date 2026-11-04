// The measurement of Prompt 237, written once in tests/fixtures/dynamics/thresholds.json
// ("definitions.measurement") and implemented here for the engine's runs and for the pinned
// snapshots of the reference (tools/dynamics-oracle/reference.py implements it again, in Python;
// leg R4 holds the two to the same numbers). Heggie units: G = 1, the softened pair potential
// of the problem statement. No code of the application.

/** The softening length of the problem statement, in Heggie units. */
export const EPSILON = 0.02;

/** The potential of unit masses at separation r: -1/r outside epsilon, -(3 e^2 - r^2) / (2 e^3) inside. */
export function pairPotential(r) {
  return r >= EPSILON
    ? -1 / r
    : -(3 * EPSILON ** 2 - r * r) / (2 * EPSILON ** 3);
}

/** phi_i, the potential at body i from every other body. */
function potentials(x, y, m) {
  const n = m.length;
  const phi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      s += m[j] * pairPotential(Math.hypot(x[j] - x[i], y[j] - y[i]));
    }
    phi[i] = s;
  }
  return phi;
}

/** The total energy, kinetic and potential, of the softened problem. */
export function totalEnergy({ x, y, vx, vy, m }) {
  const phi = potentials(x, y, m);
  let K = 0;
  let W = 0;
  for (let i = 0; i < m.length; i++) {
    K += 0.5 * m[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
    W += 0.5 * m[i] * phi[i];
  }
  return { K, W, E: K + W };
}

/**
 * r10, r50, r90 (the Lagrangian radii of the bound members), the segregation index and the
 * escaped mass fraction of a family S snapshot.
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>, vx: ArrayLike<number>, vy: ArrayLike<number>, m: ArrayLike<number>}} s
 */
export function measureCluster({ x, y, vx, vy, m }) {
  const n = m.length;
  let M = 0;
  let Vx = 0;
  let Vy = 0;
  for (let i = 0; i < n; i++) {
    M += m[i];
    Vx += m[i] * vx[i];
    Vy += m[i] * vy[i];
  }
  Vx /= M;
  Vy /= M;
  const phi = potentials(x, y, m);
  const bound = [];
  for (let i = 0; i < n; i++) {
    const E = 0.5 * ((vx[i] - Vx) ** 2 + (vy[i] - Vy) ** 2) + phi[i];
    if (E < 0) bound.push(i);
  }
  let MB = 0;
  let cx = 0;
  let cy = 0;
  for (const i of bound) {
    MB += m[i];
    cx += m[i] * x[i];
    cy += m[i] * y[i];
  }
  cx /= MB;
  cy /= MB;
  const rows = bound
    .map(i => ({ r: Math.hypot(x[i] - cx, y[i] - cy), m: m[i] }))
    .sort((a, b) => a.r - b.r);
  const lagrangian = p => {
    let c = 0;
    for (const row of rows) {
      c += row.m;
      if (c >= p * MB) return row.r;
    }
    return rows[rows.length - 1].r;
  };
  const r10 = lagrangian(0.1);
  const r50 = lagrangian(0.5);
  const r90 = lagrangian(0.9);
  let inner = 0;
  let innerMass = 0;
  for (const row of rows)
    if (row.r <= r50) {
      inner++;
      innerMass += row.m;
    }
  return {
    r10,
    r50,
    r90,
    seg: innerMass / inner / (MB / rows.length),
    esc: (M - MB) / M,
  };
}

/** The satellite's radius from the centre of mass of the cluster stars (the last body is the satellite). */
export function measureSatellite({ x, y, m }) {
  const n = m.length - 1;
  let M = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    M += m[i];
    cx += m[i] * x[i];
    cy += m[i] * y[i];
  }
  return Math.hypot(x[n] - cx / M, y[n] - cy / M);
}
