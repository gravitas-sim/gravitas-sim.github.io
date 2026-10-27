// The functions of the orbit-determination gate (Prompt 197, part A), spike code:
// two-body propagation by universal variables, the geocentric light-time forward
// model, Gauss's method, Laplace's method, differential correction, the
// conditioning measure, the covariance and the refusal rule. Units: AU and days,
// mu = k^2. Never merged; Part B writes the kernel afresh against the verdict.

export const K = 0.01720209895;
export const MU = K * K;
export const C_LIGHT = 173.1446326846693;
export const ARCSEC = 206264.80624709636;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm = a => Math.hypot(a[0], a[1], a[2]);
export const unitOf = (lam, bet) => [
  Math.cos(bet) * Math.cos(lam),
  Math.cos(bet) * Math.sin(lam),
  Math.sin(bet),
];
export const sepArcsec = (l1, b1, l2, b2) => {
  const d = norm(sub(unitOf(l1, b1), unitOf(l2, b2)));
  return 2 * Math.asin(Math.min(1, d / 2)) * ARCSEC;
};
const wrap = d => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));

// ---------------------------------------------------------------- propagation
function stumpff(z) {
  if (Math.abs(z) < 1) {
    let C = 0;
    let S = 0;
    let term = 1;
    for (let k = 0; k < 14; k++) {
      C += term / factorial(2 * k + 2);
      S += term / factorial(2 * k + 3);
      term *= -z;
    }
    return [C, S];
  }
  if (z > 0) {
    const s = Math.sqrt(z);
    return [(1 - Math.cos(s)) / z, (s - Math.sin(s)) / (s * s * s)];
  }
  const s = Math.sqrt(-z);
  return [(Math.cosh(s) - 1) / -z, (Math.sinh(s) - s) / (s * s * s)];
}
const FACT = [1];
function factorial(n) {
  while (FACT.length <= n) FACT.push(FACT[FACT.length - 1] * FACT.length);
  return FACT[n];
}

/** The two-body state after dt days, by universal variables; also f, g, fdot, gdot. */
export function propagate(r0, v0, dt) {
  if (dt === 0) return { r: r0.slice(), v: v0.slice(), f: 1, g: 0, fd: 0, gd: 1 };
  const r0n = norm(r0);
  const vr0 = dot(r0, v0) / r0n;
  const alpha = 2 / r0n - dot(v0, v0) / MU;
  let chi = alpha > 1e-9 ? K * alpha * dt : (K * dt) / r0n;
  let ok = false;
  let C = 0;
  let S = 0;
  for (let it = 0; it < 200; it++) {
    const z = alpha * chi * chi;
    [C, S] = stumpff(z);
    const r =
      chi * chi * C + ((r0n * vr0) / K) * chi * (1 - z * S) + r0n * (1 - z * C);
    const F =
      ((r0n * vr0) / K) * chi * chi * C +
      (1 - alpha * r0n) * chi ** 3 * S +
      r0n * chi -
      K * dt;
    const d = -F / r;
    chi += d;
    if (Math.abs(d) < 1e-15 * Math.max(1, Math.abs(chi))) {
      ok = true;
      break;
    }
  }
  if (!ok) return { r: [NaN, NaN, NaN], v: [NaN, NaN, NaN], f: NaN, g: NaN, fd: NaN, gd: NaN };
  const z = alpha * chi * chi;
  [C, S] = stumpff(z);
  const f = 1 - (chi * chi * C) / r0n;
  const g = dt - (chi ** 3 * S) / K;
  const r = add(mul(r0, f), mul(v0, g));
  const rn = norm(r);
  const fd = (K / (rn * r0n)) * chi * (z * S - 1);
  const gd = 1 - (chi * chi * C) / rn;
  return { r, v: add(mul(r0, fd), mul(v0, gd)), f, g, fd, gd };
}

export function invariants(r, v) {
  return { energy: dot(v, v) / 2 - MU / norm(r), h: cross(r, v) };
}

// -------------------------------------------------------------- forward model
/**
 * The geocentric astrometric direction at the receive time tObs of the object
 * whose two-body state at t0 is (r, v), the observer at R: the light time
 * iterated, no aberration.
 */
export function observe(state, t0, tObs, R) {
  let tau = 0;
  let p = null;
  for (let it = 0; it < 9; it++) {
    p = propagate(state.r, state.v, tObs - tau - t0);
    tau = norm(sub(p.r, R)) / C_LIGHT;
  }
  p = propagate(state.r, state.v, tObs - tau - t0);
  const rho = sub(p.r, R);
  const n = norm(rho);
  return {
    lam: Math.atan2(rho[1], rho[0]),
    bet: Math.asin(rho[2] / n),
    range: n,
  };
}

const flat = s => [...s.r, ...s.v];
const unflat = x => ({ r: [x[0], x[1], x[2]], v: [x[3], x[4], x[5]] });
// central differences: below about 1e-5 AU the rounding of the residuals, divided by the step, makes the
// Gauss-Newton steps cycle at 1e-9 AU on an arc whose residual is not zero
const STEP = [1e-5, 1e-5, 1e-5, 1e-7, 1e-7, 1e-7];

/** Residual (model minus observation) as (dlam cos bet, dbet) in radians, per observation. */
function residuals(x, t0, obs) {
  const s = unflat(x);
  const out = [];
  for (const o of obs) {
    const m = observe(s, t0, o.t, o.R);
    out.push(wrap(m.lam - o.lam) * Math.cos(o.bet), m.bet - o.bet);
  }
  return out;
}

/** The Jacobian of the observed pair at the observations with respect to the state, by central differences. */
export function jacobian(x, t0, obs) {
  const m = obs.length * 2;
  const J = Array.from({ length: m }, () => new Array(6).fill(0));
  for (let j = 0; j < 6; j++) {
    const xp = x.slice();
    const xm = x.slice();
    xp[j] += STEP[j];
    xm[j] -= STEP[j];
    const rp = residuals(xp, t0, obs);
    const rm = residuals(xm, t0, obs);
    for (let i = 0; i < m; i++) J[i][j] = (rp[i] - rm[i]) / (2 * STEP[j]);
  }
  return J;
}

// ------------------------------------------------------------------ linear algebra
/** One-sided Jacobi SVD of an m by n matrix (m >= n): {U (m by n), S, V (n by n)}. */
export function svd(A) {
  const m = A.length;
  const n = A[0].length;
  const U = A.map(r => r.slice());
  const V = Array.from({ length: n }, (_, i) => {
    const r = new Array(n).fill(0);
    r[i] = 1;
    return r;
  });
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = false;
    for (let p = 0; p < n - 1; p++)
      for (let q = p + 1; q < n; q++) {
        let al = 0;
        let be = 0;
        let ga = 0;
        for (let i = 0; i < m; i++) {
          al += U[i][p] * U[i][p];
          be += U[i][q] * U[i][q];
          ga += U[i][p] * U[i][q];
        }
        if (Math.abs(ga) <= 1e-15 * Math.sqrt(al * be) || ga === 0) continue;
        rotated = true;
        const zeta = (be - al) / (2 * ga);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let i = 0; i < m; i++) {
          const up = U[i][p];
          const uq = U[i][q];
          U[i][p] = c * up - s * uq;
          U[i][q] = s * up + c * uq;
        }
        for (let i = 0; i < n; i++) {
          const vp = V[i][p];
          const vq = V[i][q];
          V[i][p] = c * vp - s * vq;
          V[i][q] = s * vp + c * vq;
        }
      }
    if (!rotated) break;
  }
  const S = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += U[i][j] * U[i][j];
    S[j] = Math.sqrt(s);
    if (S[j] > 0) for (let i = 0; i < m; i++) U[i][j] /= S[j];
  }
  return { U, S, V };
}

function columnScales(J) {
  const n = J[0].length;
  const s = new Array(n).fill(0);
  for (const row of J) for (let j = 0; j < n; j++) s[j] += row[j] * row[j];
  return s.map(v => Math.sqrt(v) || 1);
}

/** kappa: largest over smallest singular value after every column is scaled to unit norm. */
export function kappaOf(J) {
  const s = columnScales(J);
  const { S } = svd(J.map(r => r.map((v, j) => v / s[j])));
  const hi = Math.max(...S);
  const lo = Math.min(...S);
  return lo > 0 ? hi / lo : Infinity;
}

/** The covariance of the state, sigma^2 (J^T J)^-1, sigma in radians, by the SVD of the column-scaled J. */
export function covarianceOf(J, sigmaRad) {
  const s = columnScales(J);
  const { S, V } = svd(J.map(r => r.map((v, j) => v / s[j])));
  const n = S.length;
  const C = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      let acc = 0;
      for (let k = 0; k < n; k++) acc += (V[a][k] * V[b][k]) / (S[k] * S[k]);
      C[a][b] = (acc * sigmaRad * sigmaRad) / (s[a] * s[b]);
    }
  return C;
}

/** The 2 by 2 prediction covariance (rad^2) of the observed pair at an epoch, and its semi-axes (1 sigma, arcsec). */
export function predictionOf(x, t0, tW, RW, C) {
  const m0 = observe(unflat(x), t0, tW, RW);
  const G = jacobian(x, t0, [{ t: tW, R: RW, lam: m0.lam, bet: m0.bet }]);
  const S = [
    [0, 0],
    [0, 0],
  ];
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      let acc = 0;
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) acc += G[i][a] * C[a][b] * G[j][b];
      S[i][j] = acc;
    }
  const tr = S[0][0] + S[1][1];
  const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = Math.max(0, tr / 2 - disc);
  return {
    S,
    major: Math.sqrt(l1) * ARCSEC,
    minor: Math.sqrt(l2) * ARCSEC,
  };
}

function solve3(M, b) {
  const [a, bb, c] = [M[0], M[1], M[2]];
  const det = a[0] * (bb[1] * c[2] - bb[2] * c[1]) - a[1] * (bb[0] * c[2] - bb[2] * c[0]) + a[2] * (bb[0] * c[1] - bb[1] * c[0]);
  if (!(Math.abs(det) > 1e-300)) return null;
  const rep = k => M.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)));
  const d = m =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  return [d(rep(0)) / det, d(rep(1)) / det, d(rep(2)) / det];
}

// ---------------------------------------------------------------- Gauss's method
function bisect(f, lo, hi) {
  let flo = f(lo);
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (flo * fm <= 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
    if (hi - lo < 1e-14) break;
  }
  return 0.5 * (lo + hi);
}

/** The polynomial in r2 of Gauss's method (canonical times, mu = 1) and its coefficients. */
export function gaussSetup(obs) {
  const [o1, o2, o3] = obs;
  const u = obs.map(o => unitOf(o.lam, o.bet));
  const t1 = K * (o1.t - o2.t);
  const t3 = K * (o3.t - o2.t);
  const tau = t3 - t1;
  const p = [cross(u[1], u[2]), cross(u[0], u[2]), cross(u[0], u[1])];
  const D0 = dot(u[0], p[0]);
  const R = [o1.R, o2.R, o3.R];
  const D = (i, j) => dot(R[i], p[j]);
  const A = (1 / D0) * ((-D(0, 1) * t3) / tau + D(1, 1) + (D(2, 1) * t1) / tau);
  const B =
    (1 / (6 * D0)) *
    ((D(0, 1) * (t3 * t3 - tau * tau) * t3) / tau + (D(2, 1) * (tau * tau - t1 * t1) * t1) / tau);
  const E = dot(R[1], u[1]);
  const R2sq = dot(R[1], R[1]);
  const a = -(A * A + 2 * A * E + R2sq);
  const b = -2 * B * (A + E);
  const c = -B * B;
  return { u, t1, t3, tau, p, D0, R, D, A, B, E, a, b, c };
}

export function gaussRoots(setup) {
  const { a, b, c } = setup;
  const f = r => r ** 8 + a * r ** 6 + b * r ** 3 + c;
  const roots = [];
  const N = 6000;
  let prev = 0.05;
  let fprev = f(prev);
  for (let i = 1; i <= N; i++) {
    const r = 0.05 * Math.exp((Math.log(14 / 0.05) * i) / N);
    const fr = f(r);
    if (fprev === 0) roots.push(prev);
    else if (fprev * fr < 0) roots.push(bisect(f, prev, r));
    prev = r;
    fprev = fr;
  }
  return roots;
}

/**
 * Carry one root of the polynomial through the f and g series and the universal-variable
 * refinement with the light-time correction. Returns the state at the emission time of
 * the middle observation, then moved to the middle observation's receive time.
 */
export function gaussIterate(obs, setup, r2root) {
  const { u, t1, t3, tau, p, D0, R, D, A, B } = setup;
  const o2t = obs[1].t;
  const r23 = r2root ** 3;
  const rho1 =
    (1 / D0) *
    ((6 * (D(2, 0) * (t1 / t3) + D(1, 0) * (tau / t3)) * r23 + D(2, 0) * (tau * tau - t1 * t1) * (t1 / t3)) /
      (6 * r23 + (tau * tau - t3 * t3)) -
      D(0, 0));
  const rho2 = A + B / r23;
  const rho3 =
    (1 / D0) *
    ((6 * (D(0, 2) * (t3 / t1) - D(1, 2) * (tau / t1)) * r23 + D(0, 2) * (tau * tau - t3 * t3) * (t3 / t1)) /
      (6 * r23 + (tau * tau - t1 * t1)) -
      D(2, 2));
  let rho = [rho1, rho2, rho3];
  const pos = i => add(R[i], mul(u[i], rho[i]));
  let r1 = pos(0);
  let r2 = pos(1);
  let r3 = pos(2);
  // first-order f and g series
  const f1 = 1 - t1 * t1 / (2 * r23);
  const f3 = 1 - t3 * t3 / (2 * r23);
  const g1 = t1 - t1 ** 3 / (6 * r23);
  const g3 = t3 - t3 ** 3 / (6 * r23);
  let v2 = mul(add(mul(r1, -f3), mul(r3, f1)), 1 / (f1 * g3 - f3 * g1));
  v2 = mul(v2, K); // canonical to AU per day
  let prevRho2 = Infinity;
  for (let it = 0; it < 200; it++) {
    const te = rho.map((q, i) => obs[i].t - q / C_LIGHT);
    const p1 = propagate(r2, v2, te[0] - te[1]);
    const p3 = propagate(r2, v2, te[2] - te[1]);
    if (!(Number.isFinite(p1.f) && Number.isFinite(p3.f))) return { ok: false, why: 'propagate' };
    const dlt = p1.f * p3.g - p3.f * p1.g;
    const c1 = p3.g / dlt;
    const c3 = -p1.g / dlt;
    const M = [0, 1, 2].map(row => [c1 * u[0][row], -u[1][row], c3 * u[2][row]]);
    const rhs = [0, 1, 2].map(row => -(c1 * R[0][row] - R[1][row] + c3 * R[2][row]));
    const sol = solve3(M, rhs);
    if (!sol) return { ok: false, why: 'singular' };
    rho = sol;
    r1 = pos(0);
    r2 = pos(1);
    r3 = pos(2);
    v2 = mul(add(mul(r1, -p3.f), mul(r3, p1.f)), 1 / dlt);
    if (Math.abs(rho[1] - prevRho2) < 1e-10) {
      const back = propagate(r2, v2, rho[1] / C_LIGHT);
      return { ok: true, state: { r: back.r, v: back.v }, t0: o2t, rho2: rho[1], iterations: it + 1 };
    }
    prevRho2 = rho[1];
  }
  return { ok: false, why: 'iterations' };
}

// ------------------------------------------------------- differential correction
function cost(x, t0, obs) {
  const r = residuals(x, t0, obs);
  let s = 0;
  for (const v of r) s += v * v;
  return s;
}

/** Newton's method (Gauss-Newton with a line search) on the state at t0; returns {x, rms (arcsec), converged, iterations}. */
export function polish(obs, state0, t0) {
  let x = flat(state0);
  let c = cost(x, t0, obs);
  if (!Number.isFinite(c)) return { x, rms: Infinity, converged: false, iterations: 0 };
  let converged = false;
  let it = 0;
  for (; it < 60; it++) {
    const res = residuals(x, t0, obs);
    const J = jacobian(x, t0, obs);
    const sc = columnScales(J);
    const { U, S, V } = svd(J.map(r => r.map((v, j) => v / sc[j])));
    const smax = Math.max(...S);
    const n = 6;
    const dxs = new Array(n).fill(0);
    for (let k = 0; k < n; k++) {
      if (S[k] < 1e-14 * smax) continue;
      let ut = 0;
      for (let i = 0; i < res.length; i++) ut += U[i][k] * res[i];
      const coef = -ut / S[k];
      for (let a = 0; a < n; a++) dxs[a] += V[a][k] * coef;
    }
    const dx = dxs.map((v, j) => v / sc[j]);
    let lam = 1;
    let xn = x;
    let cn = c;
    let improved = false;
    const dr0 = Math.max(Math.abs(dx[0]), Math.abs(dx[1]), Math.abs(dx[2]));
    const dv0 = Math.max(Math.abs(dx[3]), Math.abs(dx[4]), Math.abs(dx[5]));
    // inside Newton's region (a step of 1e-6 AU or less) the cost is flat to rounding and a line search
    // measures the rounding; the step is taken as it stands
    if (dr0 < 1e-6 && dv0 < 1e-8) {
      xn = x.map((v, j) => v + dx[j]);
      cn = cost(xn, t0, obs);
      improved = Number.isFinite(cn);
    }
    for (let ls = 0; ls < 30 && !improved; ls++) {
      xn = x.map((v, j) => v + lam * dx[j]);
      cn = cost(xn, t0, obs);
      if (Number.isFinite(cn) && cn <= c) {
        improved = true;
        break;
      }
      lam /= 2;
    }
    const dr = Math.max(Math.abs(dx[0]), Math.abs(dx[1]), Math.abs(dx[2]));
    const dv = Math.max(Math.abs(dx[3]), Math.abs(dx[4]), Math.abs(dx[5]));
    if (improved) {
      x = xn;
      c = cn;
    }
    if (dr < 1e-12 && dv < 1e-13) {
      converged = true;
      break;
    }
    if (!improved) break;
  }
  const rms = Math.sqrt(c / obs.length / 2) * ARCSEC;
  // three observations are six equations in six unknowns: a stationary point that does not fit them is no solution
  if (obs.length === 3 && rms > 1e-6) converged = false;
  return { x, rms, converged, iterations: it + 1 };
}

// ------------------------------------------------------------ the full pipeline
export const ROOT_RANGE = [0.5, 8];

function physical(x, t0) {
  const r = x.slice(0, 3);
  const v = x.slice(3);
  const rn = norm(r);
  const energy = dot(v, v) / 2 - MU / rn;
  if (!(energy < 0)) return false;
  const a = -MU / (2 * energy);
  const h = norm(cross(r, v));
  const e = Math.sqrt(Math.max(0, 1 - (h * h) / (MU * a)));
  return e < 0.95 && rn >= ROOT_RANGE[0] && rn <= ROOT_RANGE[1];
}

/**
 * Determine an orbit from observations [{t, R, lam, bet}]. cfg: {sigmaArcsec, kappaMax}.
 * Returns {status, x, t0, rms, kappa, cov, candidates, raw}.
 */
export function determine(obs, cfg) {
  const n = obs.length;
  const three = n === 3 ? obs : [obs[0], obs[(n - 1) >> 1], obs[n - 1]];
  const t0 = three[1].t;
  const setup = gaussSetup(three);
  const out = { status: null, t0, candidates: 0, roots: 0 };
  const R2 = norm(three[1].R);
  const roots = gaussRoots(setup).filter(
    r => r >= ROOT_RANGE[0] && r <= ROOT_RANGE[1] && Math.abs(r - R2) / R2 > 0.05
  );
  out.roots = roots.length;
  if (!roots.length) return { ...out, status: 'noRoot' };
  const cands = [];
  let iterated = 0;
  for (const r of roots) {
    const g = gaussIterate(three, setup, r);
    if (!g.ok) continue;
    iterated++;
    const pol = polish(obs, g.state, t0);
    cands.push({ g, pol });
  }
  out.iterated = iterated;
  if (!cands.length) return { ...out, status: 'noConvergence' };
  const conv = cands.filter(c => c.pol.converged);
  if (!conv.length) return { ...out, status: 'noConvergence' };
  const phys = conv.filter(c => physical(c.pol.x, t0));
  if (!phys.length) return { ...out, status: 'unphysical' };
  phys.sort((a, b) => a.pol.rms - b.pol.rms);
  const best = phys[0];
  const distinct = phys.filter(
    (c, i) => i === 0 || norm(sub(c.pol.x.slice(0, 3), best.pol.x.slice(0, 3))) > 1e-6
  );
  out.candidates = distinct.length;
  out.x = best.pol.x;
  out.rms = best.pol.rms;
  out.raw = { state: best.g.state, rho2: best.g.rho2, iterations: best.g.iterations };
  const rho2 = norm(sub(best.pol.x.slice(0, 3), three[1].R));
  out.range = rho2;
  if (rho2 < 0.5) return { ...out, status: 'nearEarth' };
  const J = jacobian(best.pol.x, t0, obs);
  out.kappa = kappaOf(J);
  if (out.kappa > cfg.kappaMax) return { ...out, status: 'illConditioned' };
  const second = distinct.find((c, i) => i > 0 && c.pol.rms <= 2 * best.pol.rms + 1e-6);
  if (second) return { ...out, status: 'ambiguousRoots' };
  out.cov = covarianceOf(J, (cfg.sigmaArcsec / ARCSEC));
  return { ...out, status: 'ok' };
}

// ---------------------------------------------------------------- Laplace's method
/** Laplace's method on three observations: returns the raw states (at the middle epoch) of every root, no polish. */
export function laplace(obs, velObserver) {
  const [o1, o2, o3] = obs;
  const u = obs.map(o => unitOf(o.lam, o.bet));
  const x1 = o1.t - o2.t;
  const x3 = o3.t - o2.t;
  const d1 = [0, 1, 2].map(
    k => (u[0][k] * (0 - x3)) / ((x1 - 0) * (x1 - x3)) + (u[1][k] * (0 - x1 + 0 - x3)) / ((0 - x1) * (0 - x3)) + (u[2][k] * (0 - x1)) / ((x3 - x1) * (x3 - 0))
  );
  const d2 = [0, 1, 2].map(
    k => 2 * (u[0][k] / ((x1 - 0) * (x1 - x3)) + u[1][k] / ((0 - x1) * (0 - x3)) + u[2][k] / ((x3 - x1) * (x3 - 0)))
  );
  const R = o2.R;
  const Rn = norm(R);
  const Racc = mul(R, -MU / Rn ** 3);
  const u2 = u[1];
  const g = r => {
    const q = MU / r ** 3;
    const rhs = mul(add(Racc, mul(R, q)), -1); // -(R'' + mu R / r^3), R'' = -mu R / |R|^3
    const M = [0, 1, 2].map(row => [u2[row], 2 * d1[row], d2[row] + q * u2[row]]);
    const sol = solve3(M, rhs);
    if (!sol) return null;
    return sol; // [rho'', rho', rho]
  };
  const f = r => {
    const s = g(r);
    if (!s) return NaN;
    const rv = add(R, mul(u2, s[2]));
    return norm(rv) - r;
  };
  const out = [];
  let prev = 0.3;
  let fprev = f(prev);
  for (let i = 1; i <= 3000; i++) {
    const r = 0.3 * Math.exp((Math.log(14 / 0.3) * i) / 3000);
    const fr = f(r);
    if (Number.isFinite(fprev) && Number.isFinite(fr) && fprev * fr < 0) {
      const root = bisect(f, prev, r);
      const s = g(root);
      if (s && s[2] > 0) {
        const rv = add(R, mul(u2, s[2]));
        const vv = add(velObserver, add(mul(u2, s[1]), mul(d1, s[2])));
        out.push({ r2: root, state: { r: rv, v: vv }, rho: s[2] });
      }
    }
    prev = r;
    fprev = fr;
  }
  return out;
}
