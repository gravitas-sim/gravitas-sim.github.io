// Spike: the reference corpus of SPEC.md, run against the kernel.
// node spike/threed/corpus.mjs [R1 R2 ...] > results.json
// For each problem and scheme it finds the coarsest step (or loosest DOPRI5
// tolerance) that meets every tolerance, and reports what it measured there
// and the force evaluations it cost. The tolerances are SPEC.md's, unchanged.
import {
  makeState,
  copyState,
  run,
  dopri5,
  energy,
  momentum,
  angularMomentum,
  barycenter,
  fromElements,
  toElements,
  mergeContacts,
  leapfrog,
} from './kernel.js';

const DEG = Math.PI / 180;
const norm = a => Math.hypot(...a);
const sub = (a, b) => a.map((v, k) => v - b[k]);
const rel = (s, i, j) => [0, 1, 2].map(k => s.x[3 * j + k] - s.x[3 * i + k]);
const relv = (s, i, j) => [0, 1, 2].map(k => s.v[3 * j + k] - s.v[3 * i + k]);
const FIXED = (process.env.SCHEMES || 'leapfrog,yoshida4,rk4').split(',');
const KS = [125, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
const TOLS = [1e-8, 1e-9, 1e-10, 1e-11, 1e-12, 1e-13];
const MAX_EVALS = Number(process.env.MAX_EVALS || 6e7);

/** Two bodies, m1 at rest in the barycenter frame, from relative elements. */
function twoBody(m1, m2, el) {
  const mu = m1 + m2;
  const r = fromElements(el, mu);
  const f1 = -m2 / mu;
  const f2 = m1 / mu;
  return makeState([
    { m: m1, x: r.x.map(c => f1 * c), v: r.v.map(c => f1 * c) },
    { m: m2, x: r.x.map(c => f2 * c), v: r.v.map(c => f2 * c) },
  ]);
}

/** Advance s by `span` in `chunks` equal pieces, calling sample after each. */
function advance(s, how, span, chunks, sample) {
  let evals = 0;
  for (let c = 0; c < chunks; c++) {
    if (how.scheme === 'dopri5') {
      const r = dopri5(s, span / chunks, { tol: how.tol, h0: span / chunks / 100 });
      evals += 6 * (r.accepted + r.rejected);
    } else {
      const steps = Math.round(how.perChunk);
      evals += run(s, how.scheme, span / chunks / steps, steps);
    }
    if (evals > MAX_EVALS) return { evals, aborted: true };
    sample?.(c + 1);
  }
  return { evals };
}

/** Try each setting from coarse to fine; the first that passes every check wins. */
function sweep(name, attempt) {
  const out = {};
  for (const scheme of [...FIXED, ...(process.env.SCHEMES ? [] : ['dopri5'])]) {
    const settings =
      scheme === 'dopri5' ? TOLS.map(tol => ({ scheme, tol })) : KS.map(k => ({ scheme, k }));
    let last = null;
    const history = [];
    for (const how of settings) {
      const r = attempt(how);
      last = { ...how, ...r };
      history.push(last);
      if (r.aborted) break;
      if (r.pass) break;
    }
    out[scheme] = { ...last, history };
    console.error(name, scheme, JSON.stringify(last));
  }
  return out;
}

const results = {};
const want = new Set(process.argv.slice(2));
const on = id => !want.size || want.has(id);

// --- R1 -------------------------------------------------------------------------
if (on('R1')) {
  const el = { a: 1, e: 0.6, i: 40 * DEG, Omega: 30 * DEG, omega: 60 * DEG, M: 0 };
  const mu = 1.001;
  const P = 2 * Math.PI / Math.sqrt(mu);
  results.R1 = sweep('R1', how => {
    const s = twoBody(1, 1e-3, el);
    const E0 = energy(s);
    const L0 = angularMomentum(s);
    const e0 = toElements(rel(s, 0, 1), relv(s, 0, 1), mu);
    let worst100 = 0;
    let worst = 0;
    let pos100 = null;
    // Energy is sampled 25 times an orbit: sampled once an orbit, at the same
    // phase, a bounded oscillation reads as whatever that phase drifts to.
    const r = advance(s, { ...how, perChunk: how.k / 25 }, 1000 * P, 25000, c => {
      const dE = Math.abs((energy(s) - E0) / E0);
      worst = Math.max(worst, dE);
      if (c <= 2500) worst100 = Math.max(worst100, dE);
      if (c === 2500) {
        const exact = fromElements({ ...el, M: (2 * Math.PI * 100) % (2 * Math.PI) }, mu);
        pos100 = norm(sub(rel(s, 0, 1), exact.x)) / el.a;
      }
    });
    if (r.aborted) return { aborted: true, evals: r.evals };
    const L = angularMomentum(s);
    const e1 = toElements(rel(s, 0, 1), relv(s, 0, 1), mu);
    const m = {
      position100: pos100,
      energy1000: worst,
      growth: worst / worst100,
      angularMomentum: norm(sub(L, L0)) / norm(L0),
      inclinationDrift: Math.abs(e1.i - e0.i),
      nodeDrift: Math.abs(e1.Omega - e0.Omega),
    };
    const pass =
      m.position100 <= 1e-6 &&
      m.energy1000 <= 1e-8 &&
      m.growth <= 1.5 &&
      m.angularMomentum <= 1e-12 &&
      m.inclinationDrift <= 1e-10 &&
      m.nodeDrift <= 1e-10;
    return { ...m, pass, evals: r.evals, evalsPerOrbit: r.evals / 1000 };
  });
}

// --- R2 -------------------------------------------------------------------------
if (on('R2')) {
  const el = { a: 1, e: 0.5, i: 60 * DEG, Omega: 10 * DEG, omega: 20 * DEG, M: 0.3 };
  const P = 2 * Math.PI;
  const boost = [0.3, -0.2, 0.5];
  results.R2 = sweep('R2', how => {
    const plain = twoBody(0.5, 0.5, el);
    const moving = copyState(plain);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) moving.v[3 * i + k] += boost[k];
    const c0 = barycenter(moving);
    const a = advance(plain, { ...how, perChunk: how.k }, 100 * P, 1);
    const b = advance(moving, { ...how, perChunk: how.k }, 100 * P, 1);
    if (a.aborted || b.aborted) return { aborted: true, evals: a.evals };
    const t = moving.t;
    const expected = c0.map((c, k) => c + boost[k] * t);
    const m = {
      barycenter: norm(sub(barycenter(moving), expected)) / (norm(boost) * t),
      relativeOrbit: norm(sub(rel(moving, 0, 1), rel(plain, 0, 1))) / el.a,
    };
    return { ...m, pass: m.barycenter <= 1e-12 && m.relativeOrbit <= 1e-9, evals: a.evals };
  });
}

// --- R3 -------------------------------------------------------------------------
function threeBodySystem() {
  const star = { m: 1, x: [0, 0, 0], v: [0, 0, 0] };
  const planets = [
    { m: 1e-3, el: { a: 5.2, e: 0.048, i: 1.3 * DEG, Omega: 100 * DEG, omega: 275 * DEG, M: 0.3 } },
    { m: 3e-4, el: { a: 9.5, e: 0.056, i: 2.5 * DEG, Omega: 113 * DEG, omega: 340 * DEG, M: 2.1 } },
  ].map(p => {
    const r = fromElements(p.el, 1 + p.m);
    return { m: p.m, x: r.x, v: r.v };
  });
  const bodies = [star, ...planets];
  const M = bodies.reduce((s, b) => s + b.m, 0);
  const cx = [0, 1, 2].map(k => bodies.reduce((s, b) => s + b.m * b.x[k], 0) / M);
  const cv = [0, 1, 2].map(k => bodies.reduce((s, b) => s + b.m * b.v[k], 0) / M);
  return makeState(bodies.map(b => ({ m: b.m, x: sub(b.x, cx), v: sub(b.v, cv) })));
}
if (on('R3')) {
  const P = 2 * Math.PI * Math.sqrt(5.2 ** 3);
  results.R3 = sweep('R3', how => {
    const s = threeBodySystem();
    const E0 = energy(s);
    const L0 = angularMomentum(s);
    const pJ = 1e-3 * norm(s.v.slice(3, 6));
    let worstE = 0;
    let worstP = 0;
    const r = advance(s, { ...how, perChunk: how.k / 25 }, 1000 * P, 25000, () => {
      worstE = Math.max(worstE, Math.abs((energy(s) - E0) / E0));
      worstP = Math.max(worstP, norm(momentum(s)) / pJ);
    });
    if (r.aborted) return { aborted: true, evals: r.evals };
    const m = { momentum: worstP, energy: worstE, angularMomentum: norm(sub(angularMomentum(s), L0)) / norm(L0) };
    return { ...m, pass: m.momentum <= 1e-13 && m.energy <= 1e-9 && m.angularMomentum <= 1e-12, evals: r.evals, evalsPerOrbit: r.evals / 1000 };
  });
}

// --- R4 -------------------------------------------------------------------------
const MU = 1e-3;
function restricted(particle) {
  // Primaries on a circular orbit of separation 1 about their barycenter; the
  // frame rotates at 1 radian per unit time, and coincides with the inertial
  // frame at t = 0.
  const v = (p) => [-p[1], p[0], 0];
  const p1 = [-MU, 0, 0];
  const p2 = [1 - MU, 0, 0];
  return makeState([
    { m: 1 - MU, x: p1, v: v(p1) },
    { m: MU, x: p2, v: v(p2) },
    { m: 0, x: particle, v: [-particle[1], particle[0], 0] },
  ]);
}
function toRotating(s, i) {
  const t = s.t;
  const [c, sn] = [Math.cos(-t), Math.sin(-t)];
  const x = s.x[3 * i];
  const y = s.x[3 * i + 1];
  const vx = s.v[3 * i];
  const vy = s.v[3 * i + 1];
  const X = c * x - sn * y;
  const Y = sn * x + c * y;
  const VX = c * vx - sn * vy + Y;
  const VY = sn * vx + c * vy - X;
  return { X, Y, Z: s.x[3 * i + 2], VX, VY, VZ: s.v[3 * i + 2] };
}
function jacobi(s) {
  const q = toRotating(s, 2);
  const r1 = Math.hypot(q.X + MU, q.Y, q.Z);
  const r2 = Math.hypot(q.X - 1 + MU, q.Y, q.Z);
  return q.X * q.X + q.Y * q.Y + (2 * (1 - MU)) / r1 + (2 * MU) / r2 - (q.VX ** 2 + q.VY ** 2 + q.VZ ** 2);
}
function l1Position() {
  let x = 1 - MU - Math.cbrt(MU / 3);
  for (let k = 0; k < 50; k++) {
    const f = x - ((1 - MU) * (x + MU)) / Math.abs(x + MU) ** 3 - (MU * (x - 1 + MU)) / Math.abs(x - 1 + MU) ** 3;
    const h = 1e-7;
    const g = (x + h) - ((1 - MU) * (x + h + MU)) / Math.abs(x + h + MU) ** 3 - (MU * (x + h - 1 + MU)) / Math.abs(x + h - 1 + MU) ** 3;
    x -= f / ((g - f) / h);
  }
  return x;
}
if (on('R4')) {
  const L4 = [0.5 - MU, Math.sqrt(3) / 2, 0];
  const L1 = [l1Position(), 0, 0];
  const P = 2 * Math.PI;
  results.R4 = sweep('R4', how => {
    const s = restricted([L4[0] + 1e-3, L4[1], 1e-3]);
    const C0 = jacobi(s);
    let far = 0;
    let worstC = 0;
    const r = advance(s, { ...how, perChunk: how.k / 10 }, 100 * P, 1000, () => {
      const q = toRotating(s, 2);
      far = Math.max(far, Math.hypot(q.X - L4[0], q.Y - L4[1], q.Z));
      worstC = Math.max(worstC, Math.abs((jacobi(s) - C0) / C0));
    });
    if (r.aborted) return { aborted: true, evals: r.evals };
    const u = restricted([L1[0] + 1e-6, 0, 0]);
    let l1Max = 0;
    advance(u, { ...how, perChunk: how.k / 10 }, 20 * P, 200, () => {
      const w = toRotating(u, 2);
      l1Max = Math.max(l1Max, Math.hypot(w.X - L1[0], w.Y, w.Z));
    });
    const q = toRotating(u, 2);
    const leaves = Math.hypot(q.X - L1[0], q.Y, q.Z);
    // l1Max is a diagnostic, not SPEC.md's criterion (the distance at 20 orbits).
    const m = { maxFromL4: far, jacobi: worstC, l1Distance: leaves, l1MaxDistance: l1Max };
    return { ...m, pass: m.maxFromL4 <= 0.05 && m.jacobi <= 1e-9 && m.l1Distance >= 0.1, evals: r.evals, evalsPerOrbit: r.evals / 100 };
  });
}

// --- R5 -------------------------------------------------------------------------
if (on('R5')) {
  const T = 6.32591398;
  const x1 = [0.97000436, -0.24308753, 0];
  const v3 = [-0.93240737, -0.86473146, 0];
  const planar = [
    { m: 1, x: x1, v: v3.map(c => -c / 2) },
    { m: 1, x: x1.map(c => -c), v: v3.map(c => -c / 2) },
    { m: 1, x: [0, 0, 0], v: v3 },
  ];
  // A fixed rotation, from Euler angles 0.3, 0.7 and 1.1 radians.
  const [a, b, c] = [0.3, 0.7, 1.1];
  const Rz = t => [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
  const Rx = t => [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]];
  const mul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
  const R = mul(mul(Rz(a), Rx(b)), Rz(c));
  const rot = (M, p) => M.map(row => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
  const RT = R[0].map((_, j) => R.map(row => row[j]));
  results.R5 = sweep('R5', how => {
    const s = makeState(planar.map(p => ({ m: 1, x: rot(R, p.x), v: rot(R, p.v) })));
    const start = s.x.slice();
    let zmax = 0;
    const r = advance(s, { ...how, perChunk: how.k }, T, 1, () => {});
    if (r.aborted) return { aborted: true, evals: r.evals };
    let err = 0;
    for (let i = 0; i < 3; i++) {
      err = Math.max(err, norm(sub([...s.x.slice(3 * i, 3 * i + 3)], [...start.slice(3 * i, 3 * i + 3)])));
      zmax = Math.max(zmax, Math.abs(rot(RT, [...s.x.slice(3 * i, 3 * i + 3)])[2]));
    }
    return { returnError: err, outOfPlane: zmax, pass: err <= 1e-6 && zmax <= 1e-12, evals: r.evals };
  });
}

// --- R6 -------------------------------------------------------------------------
if (on('R6')) {
  const aOut = 20;
  const outer = fromElements({ a: aOut, e: 0, i: 0, Omega: 0, omega: 0, M: 0 }, 2);
  const inner = fromElements({ a: 1, e: 0.01, i: 65 * DEG, Omega: 0, omega: 0, M: 0 }, 1);
  const bodies = [
    { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
    { m: 1, x: outer.x, v: outer.v },
    { m: 0, x: inner.x, v: inner.v },
  ];
  const cx = [0, 1, 2].map(k => (bodies[0].x[k] + bodies[1].x[k]) / 2);
  const cv = [0, 1, 2].map(k => (bodies[0].v[k] + bodies[1].v[k]) / 2);
  const Pin = 2 * Math.PI;
  const Pout = 2 * Math.PI * Math.sqrt(aOut ** 3 / 2);
  const tK = ((2 * Pout ** 2) / (3 * Math.PI * Pin)) * 2;
  // Long enough for two secular cycles from e = 0.01 (a first run of 6 tK held one).
  const span = 20 * tK;
  const prediction = Math.sqrt(1 - (5 / 3) * Math.cos(65 * DEG) ** 2);
  const settings = [{ scheme: 'dopri5', tol: 1e-10 }];
  results.R6 = { tK, span, prediction, runs: {} };
  for (const how of settings) {
    const s = makeState(bodies.map(b => ({ m: b.m, x: sub(b.x, cx), v: sub(b.v, cv) })));
    const E0 = energy(s);
    let emax = 0;
    let kmin = Infinity;
    let kmax = -Infinity;
    let worstE = 0;
    let closest = Infinity;
    let cycles = 0;
    let prevE = 0;
    const chunks = 10000;
    const r = advance(s, { ...how, perChunk: (how.k ?? 0) * (span / Pin) / chunks }, span, chunks, () => {
      const el = toElements(rel(s, 0, 2), relv(s, 0, 2), 1);
      emax = Math.max(emax, el.e);
      const K = Math.sqrt(1 - el.e ** 2) * Math.cos(el.i);
      kmin = Math.min(kmin, K);
      kmax = Math.max(kmax, K);
      worstE = Math.max(worstE, Math.abs((energy(s) - E0) / E0));
      closest = Math.min(closest, norm(rel(s, 1, 2)));
      // A secular cycle is an upward crossing of e = 0.5.
      if (prevE < 0.5 && el.e >= 0.5) cycles++;
      prevE = el.e;
    });
    const defensible = !r.aborted && cycles >= 2 && worstE <= 1e-8 && closest >= 0.5;
    results.R6.runs[how.scheme + (how.tol ?? how.k)] = {
      emax,
      kozaiVariation: kmax - kmin,
      energy: worstE,
      closest,
      maxima: cycles,
      defensible,
      pass: defensible && Math.abs(emax - prediction) <= 0.03 && kmax - kmin <= 0.02,
      evals: r.evals,
      aborted: !!r.aborted,
    };
    console.error('R6', JSON.stringify(results.R6.runs[how.scheme + (how.tol ?? how.k)]));
  }
}

// --- R7 -------------------------------------------------------------------------
if (on('R7')) {
  const vInf = 0.5;
  const q = 0.01;
  const e = 1 + (q * vInf ** 2) / 1;
  const a = -1 / vInf ** 2;
  const n = Math.sqrt(1 / Math.abs(a) ** 3);
  const H0 = Math.acosh((200 / Math.abs(a) + 1) / e);
  const M0 = e * Math.sinh(H0) - H0;
  const el = { a, e, i: 25 * DEG, Omega: 40 * DEG, omega: 70 * DEG };
  const span = (2 * M0) / n;
  results.R7 = sweep('R7', how => {
    const start = fromElements({ ...el, M: -M0 }, 1);
    const s = makeState([
      { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { m: 0, x: start.x, v: start.v },
    ]);
    const e0 = 0.5 * norm(start.v) ** 2 - 1 / norm(start.x);
    const r = advance(s, { ...how, perChunk: how.k * 100 }, span, 1);
    if (r.aborted) return { aborted: true, evals: r.evals };
    const end = fromElements({ ...el, M: M0 }, 1);
    const v = relv(s, 0, 1);
    const cosang = (v[0] * end.v[0] + v[1] * end.v[1] + v[2] * end.v[2]) / (norm(v) * norm(end.v));
    const e1 = 0.5 * norm(v) ** 2 - 1 / norm(rel(s, 0, 1));
    const m = { deflectionError: Math.acos(Math.min(1, cosang)), energy: Math.abs((e1 - e0) / e0), deflection: 2 * Math.asin(1 / e) };
    return { ...m, pass: m.deflectionError <= 1e-6 && m.energy <= 1e-8, evals: r.evals };
  });
}

// --- R8 -------------------------------------------------------------------------
if (on('R8')) {
  const cases = {
    headOn: [
      { m: 1, x: [-1, 0, 0], v: [0.2, 0, 0], radius: 0.05 },
      { m: 0.5, x: [1, 0, 0], v: [-0.3, 0, 0], radius: 0.05 },
    ],
    grazing: [
      { m: 1, x: [-1, 0, 0], v: [0.2, 0, 0.01], radius: 0.05 },
      { m: 0.5, x: [1, 0.09, 0], v: [-0.3, 0, -0.02], radius: 0.05 },
    ],
  };
  results.R8 = {};
  for (const [name, bodies] of Object.entries(cases)) {
    const s = makeState(bodies);
    const m0 = s.m[0] + s.m[1];
    let merged = [];
    let steps = 0;
    let pBefore = null;
    while (!merged.length && steps < 200000) {
      leapfrog(s, 1e-4);
      pBefore = momentum(s);
      merged = mergeContacts(s);
      steps++;
    }
    const p = momentum(s);
    const dm = Math.abs(s.m[0] + s.m[1] - m0) / m0;
    const dp = norm(sub(p, pBefore)) / norm(pBefore);
    results.R8[name] = { steps, merged: merged.length, mass: dm, momentum: dp, keLost: merged[0]?.keLost, pass: merged.length === 1 && dm <= 1e-15 && dp <= 1e-15 };
    console.error('R8', name, JSON.stringify(results.R8[name]));
  }
}

console.log(JSON.stringify(results, null, 1));
