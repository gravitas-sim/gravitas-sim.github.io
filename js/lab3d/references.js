// =============================================================================
// The 3-D kernel's reference problems, with their fixed tolerances
// -----------------------------------------------------------------------------
// The corpus of VALIDATED_3D_LAB_GATE.md, made permanent: each problem is a
// gravitas.system3d/1, the options it runs with, and a check that measures
// the result against the analytic or published value with the tolerance the
// gate fixed before any code existed. Two changes from the gate's SPEC.md,
// both the gate's own recommendations:
//
// - Energy is sampled 25 times an orbit. Sampled once, at one phase, a
//   bounded error reads as growth.
// - R4's instability check is the largest distance from L1 reached within
//   20 orbits (it must pass 0.1), not the distance at the 20th. A chaotic
//   particle that has left can drift back.
//
// Each problem names the integrator and step the gate found meets it, and
// tools/validate-lab3d.mjs runs them all (LAB3D.md prints the table).
// =============================================================================

import { fromElements, toElements } from './elements.js';
import { FORMAT, FORMAT_VERSION } from './state.js';

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;
const norm = a => Math.hypot(a[0], a[1], a[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const system = (bodies, integrator) => ({
  format: FORMAT,
  formatVersion: FORMAT_VERSION,
  units: 'code',
  integrator,
  t: 0,
  bodies,
});
/** Body i's three components in a sample's flat array. */
const at = (x, i) => [x[3 * i], x[3 * i + 1], x[3 * i + 2]];
/** The orbit of body j about body i in a sample (positions and velocities). */
const orbitIn = (s, i, j, mu) =>
  toElements(sub(at(s.x, j), at(s.x, i)), sub(at(s.v, j), at(s.v, i)), mu);

/** Two bodies with the relative orbit `el`, the barycenter at rest at the origin. */
function pair(m1, m2, el, ids = ['primary', 'secondary']) {
  const mu = m1 + m2;
  const r = fromElements(el, mu);
  const f1 = -m2 / mu;
  const f2 = m1 / mu;
  return [
    {
      id: ids[0],
      m: m1,
      radius: 0,
      x: r.x.map(c => f1 * c),
      v: r.v.map(c => f1 * c),
    },
    {
      id: ids[1],
      m: m2,
      radius: 0,
      x: r.x.map(c => f2 * c),
      v: r.v.map(c => f2 * c),
    },
  ];
}

export const REFERENCES = [
  {
    id: 'R1',
    title: 'Two-body Kepler orbit in 3-D: e = 0.6, i = 40°',
    make() {
      const el = {
        a: 1,
        e: 0.6,
        i: 40 * DEG,
        Omega: 30 * DEG,
        omega: 60 * DEG,
        M: 0,
      };
      const P = TAU / Math.sqrt(1.001);
      return {
        system: system(pair(1, 1e-3, el), { scheme: 'yoshida4c', h: P / 8000 }),
        options: {
          span: 1000 * P,
          samples: 25000,
          positions: true,
          velocities: true,
        },
        context: { el, P },
      };
    },
    check(result, { el }) {
      const s100 = result.samples[2500];
      const rel = sub(at(s100.x, 1), at(s100.x, 0));
      const exact = fromElements({ ...el, M: 0 }, 1.001);
      const worst100 = Math.max(
        ...result.samples.slice(0, 2501).map(s => s.energy)
      );
      const first = orbitIn(result.samples[0], 0, 1, 1.001);
      const last = orbitIn(result.samples.at(-1), 0, 1, 1.001);
      return [
        {
          what: 'position after 100 orbits, against the analytic orbit',
          value: norm(sub(rel, exact.x)),
          tolerance: 1e-6,
        },
        {
          what: 'largest relative energy error over 1000 orbits',
          value: result.residuals.energy,
          tolerance: 1e-8,
        },
        {
          what: 'that error over 1000 orbits against over 100 (bounded)',
          value: result.residuals.energy / worst100,
          tolerance: 1.5,
        },
        {
          what: 'relative change of the angular momentum vector',
          value: result.residuals.angularMomentum,
          tolerance: 1e-12,
        },
        {
          what: 'drift of the inclination over 1000 orbits (radians)',
          value: Math.abs(last.i - first.i),
          tolerance: 1e-10,
        },
        {
          what: 'drift of the node over 1000 orbits (radians)',
          value: Math.abs(last.Omega - first.Omega),
          tolerance: 1e-10,
        },
      ];
    },
  },
  {
    id: 'R2',
    title: 'Inclined binary, the whole system moving',
    make() {
      const el = {
        a: 1,
        e: 0.5,
        i: 60 * DEG,
        Omega: 10 * DEG,
        omega: 20 * DEG,
        M: 0.3,
      };
      const boost = [0.3, -0.2, 0.5];
      const bodies = pair(0.5, 0.5, el).map(b => ({
        ...b,
        v: b.v.map((c, k) => c + boost[k]),
      }));
      return {
        system: system(bodies, { scheme: 'yoshida4c', h: TAU / 1000 }),
        options: { span: 100 * TAU, samples: 100, positions: true },
        context: {
          el,
          boost,
          still: system(pair(0.5, 0.5, el), {
            scheme: 'yoshida4c',
            h: TAU / 1000,
          }),
        },
      };
    },
    check(result, ctx, run) {
      const last = result.samples.at(-1);
      const t = last.t;
      const c = [0, 1, 2].map(k => 0.5 * (at(last.x, 0)[k] + at(last.x, 1)[k]));
      const expected = ctx.boost.map(b => b * t);
      const still = run(ctx.still, {
        span: 100 * TAU,
        samples: 100,
        positions: true,
      }).samples.at(-1);
      const relMoving = sub(at(last.x, 1), at(last.x, 0));
      const relStill = sub(at(still.x, 1), at(still.x, 0));
      return [
        {
          what: 'barycenter against uniform motion, relative to the distance traveled',
          value: norm(sub(c, expected)) / (norm(ctx.boost) * t),
          tolerance: 1e-12,
        },
        {
          what: 'relative orbit against the same binary at rest',
          value: norm(sub(relMoving, relStill)),
          tolerance: 1e-9,
        },
      ];
    },
  },
  {
    id: 'R3',
    title: 'Barycentric three-body: a star, Jupiter- and Saturn-like planets',
    make() {
      const star = { id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] };
      const planets = [
        {
          id: 'inner',
          m: 1e-3,
          el: {
            a: 5.2,
            e: 0.048,
            i: 1.3 * DEG,
            Omega: 100 * DEG,
            omega: 275 * DEG,
            M: 0.3,
          },
        },
        {
          id: 'outer',
          m: 3e-4,
          el: {
            a: 9.5,
            e: 0.056,
            i: 2.5 * DEG,
            Omega: 113 * DEG,
            omega: 340 * DEG,
            M: 2.1,
          },
        },
      ].map(p => {
        const r = fromElements(p.el, 1 + p.m);
        return { id: p.id, m: p.m, radius: 0, x: r.x, v: r.v };
      });
      const bodies = [star, ...planets];
      const M = bodies.reduce((s, b) => s + b.m, 0);
      const cx = [0, 1, 2].map(
        k => bodies.reduce((s, b) => s + b.m * b.x[k], 0) / M
      );
      const cv = [0, 1, 2].map(
        k => bodies.reduce((s, b) => s + b.m * b.v[k], 0) / M
      );
      const P = TAU * Math.sqrt(5.2 ** 3);
      return {
        system: system(
          bodies.map(b => ({ ...b, x: sub(b.x, cx), v: sub(b.v, cv) })),
          { scheme: 'yoshida4c', h: P / 1000 }
        ),
        options: { span: 1000 * P, samples: 25000, positions: false },
        context: {},
      };
    },
    check(result) {
      return [
        {
          what: 'total momentum, relative to the largest body momentum',
          value: result.residuals.momentum,
          tolerance: 1e-13,
        },
        {
          what: 'largest relative energy error over 1000 inner orbits',
          value: result.residuals.energy,
          tolerance: 1e-9,
        },
        {
          what: 'relative change of the angular momentum vector',
          value: result.residuals.angularMomentum,
          tolerance: 1e-12,
        },
      ];
    },
  },
  {
    id: 'R4',
    title: 'Restricted three-body, mu = 0.001: L4 holds, L1 does not',
    make() {
      const MU = 1e-3;
      const spin = p => [-p[1], p[0], 0];
      const primaries = [
        {
          id: 'sun',
          m: 1 - MU,
          radius: 0,
          x: [-MU, 0, 0],
          v: spin([-MU, 0, 0]),
        },
        {
          id: 'planet',
          m: MU,
          radius: 0,
          x: [1 - MU, 0, 0],
          v: spin([1 - MU, 0, 0]),
        },
      ];
      const L4 = [0.5 - MU, Math.sqrt(3) / 2, 0];
      const p4 = [L4[0] + 1e-3, L4[1], 1e-3];
      let x1 = 1 - MU - Math.cbrt(MU / 3);
      const f = x =>
        x -
        ((1 - MU) * (x + MU)) / Math.abs(x + MU) ** 3 -
        (MU * (x - 1 + MU)) / Math.abs(x - 1 + MU) ** 3;
      for (let k = 0; k < 60; k++)
        x1 -= f(x1) / ((f(x1 + 1e-7) - f(x1)) / 1e-7);
      const p1 = [x1 + 1e-6, 0, 0];
      const withParticle = p => [
        ...primaries,
        { id: 'particle', m: 0, radius: 0, x: p, v: spin(p) },
      ];
      return {
        system: system(withParticle(p4), { scheme: 'yoshida4c', h: TAU / 500 }),
        options: {
          span: 100 * TAU,
          samples: 1000,
          positions: true,
          velocities: true,
        },
        context: {
          MU,
          L4,
          L1: [x1, 0, 0],
          l1System: system(withParticle(p1), {
            scheme: 'yoshida4c',
            h: TAU / 500,
          }),
        },
      };
    },
    check(result, ctx, run) {
      const rotate = (x, t) => {
        const [c, s] = [Math.cos(-t), Math.sin(-t)];
        return [c * x[0] - s * x[1], s * x[0] + c * x[1], x[2]];
      };
      // The Jacobi constant of the particle in the frame turning with the
      // primaries: C = x^2 + y^2 + 2(1 - mu)/r1 + 2 mu/r2 - |v_rot|^2.
      const MU = ctx.MU;
      const jacobi = s => {
        const t = s.t;
        const [c, sn] = [Math.cos(-t), Math.sin(-t)];
        const [x, y, z] = at(s.x, 2);
        const [vx, vy, vz] = at(s.v, 2);
        const X = c * x - sn * y;
        const Y = sn * x + c * y;
        const VX = c * vx - sn * vy + Y;
        const VY = sn * vx + c * vy - X;
        const r1 = Math.hypot(X + MU, Y, z);
        const r2 = Math.hypot(X - 1 + MU, Y, z);
        return (
          X * X +
          Y * Y +
          (2 * (1 - MU)) / r1 +
          (2 * MU) / r2 -
          (VX * VX + VY * VY + vz * vz)
        );
      };
      const C0 = jacobi(result.samples[0]);
      let far = 0;
      let worstC = 0;
      for (const s of result.samples) {
        const p = rotate(at(s.x, 2), s.t);
        far = Math.max(far, norm(sub(p, ctx.L4)));
        worstC = Math.max(worstC, Math.abs((jacobi(s) - C0) / C0));
      }
      const l1 = run(ctx.l1System, {
        span: 20 * TAU,
        samples: 200,
        positions: true,
      });
      let reach = 0;
      for (const s of l1.samples)
        reach = Math.max(reach, norm(sub(rotate(at(s.x, 2), s.t), ctx.L1)));
      return [
        {
          what: 'largest distance from L4 over 100 orbits',
          value: far,
          tolerance: 0.05,
        },
        {
          what: "relative change of the particle's Jacobi constant",
          value: worstC,
          tolerance: 1e-9,
        },
        {
          what: 'largest distance from L1 reached within 20 orbits (must leave)',
          value: reach,
          atLeast: 0.1,
        },
      ];
    },
  },
  {
    id: 'R5',
    title: 'The figure-eight choreography, rotated into 3-D',
    make() {
      const x1 = [0.97000436, -0.24308753, 0];
      const v3 = [-0.93240737, -0.86473146, 0];
      const planar = [
        { x: x1, v: v3.map(c => -c / 2) },
        { x: x1.map(c => -c), v: v3.map(c => -c / 2) },
        { x: [0, 0, 0], v: v3 },
      ];
      const Rz = t => [
        [Math.cos(t), -Math.sin(t), 0],
        [Math.sin(t), Math.cos(t), 0],
        [0, 0, 1],
      ];
      const Rx = t => [
        [1, 0, 0],
        [0, Math.cos(t), -Math.sin(t)],
        [0, Math.sin(t), Math.cos(t)],
      ];
      const mul = (A, B) =>
        A.map(row =>
          B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0))
        );
      const R = mul(mul(Rz(0.3), Rx(0.7)), Rz(1.1));
      const rot = p =>
        R.map(row => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
      const T = 6.32591398;
      const bodies = planar.map((p, i) => ({
        id: `body-${i + 1}`,
        m: 1,
        radius: 0,
        x: rot(p.x),
        v: rot(p.v),
      }));
      return {
        system: system(bodies, { scheme: 'yoshida4c', h: T / 1000 }),
        options: { span: T, samples: 1, positions: true },
        context: { start: bodies.map(b => b.x), R },
      };
    },
    check(result, ctx) {
      const end = result.samples.at(-1).x;
      const RT = ctx.R[0].map((_, j) => ctx.R.map(row => row[j]));
      let err = 0;
      let z = 0;
      for (let i = 0; i < 3; i++) {
        err = Math.max(err, norm(sub(at(end, i), ctx.start[i])));
        const back = RT.map(
          row =>
            row[0] * end[3 * i] +
            row[1] * end[3 * i + 1] +
            row[2] * end[3 * i + 2]
        );
        z = Math.max(z, Math.abs(back[2]));
      }
      return [
        {
          what: 'largest position error after one period (Chenciner and Montgomery 2000)',
          value: err,
          tolerance: 1e-6,
        },
        {
          what: 'out-of-plane motion, rotated back',
          value: z,
          tolerance: 1e-12,
        },
      ];
    },
  },
  {
    id: 'R6',
    title: 'Kozai-Lidov: a test particle at i = 65° under a distant perturber',
    make() {
      const outer = fromElements(
        { a: 20, e: 0, i: 0, Omega: 0, omega: 0, M: 0 },
        2
      );
      const inner = fromElements(
        { a: 1, e: 0.01, i: 65 * DEG, Omega: 0, omega: 0, M: 0 },
        1
      );
      const bodies = [
        { id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] },
        { id: 'perturber', m: 1, radius: 0, x: outer.x, v: outer.v },
        { id: 'particle', m: 0, radius: 0, x: inner.x, v: inner.v },
      ];
      const c = [0, 1, 2].map(k => (bodies[0].x[k] + bodies[1].x[k]) / 2);
      const w = [0, 1, 2].map(k => (bodies[0].v[k] + bodies[1].v[k]) / 2);
      const Pin = TAU;
      const Pout = TAU * Math.sqrt(8000 / 2);
      const tK = ((2 * Pout * Pout) / (3 * Math.PI * Pin)) * 2;
      return {
        system: system(
          bodies.map(b => ({ ...b, x: sub(b.x, c), v: sub(b.v, w) })),
          { scheme: 'dopri5', tol: 1e-10 }
        ),
        options: {
          span: 20 * tK,
          samples: 10000,
          positions: true,
          velocities: true,
        },
        context: {
          prediction: Math.sqrt(1 - (5 / 3) * Math.cos(65 * DEG) ** 2),
        },
      };
    },
    check(result, ctx) {
      let emax = 0;
      let kmin = Infinity;
      let kmax = -Infinity;
      let cycles = 0;
      let prev = 0;
      let closest = Infinity;
      for (const s of result.samples) {
        const el = orbitIn(s, 0, 2, 1);
        emax = Math.max(emax, el.e);
        const K = Math.sqrt(1 - el.e * el.e) * Math.cos(el.i);
        kmin = Math.min(kmin, K);
        kmax = Math.max(kmax, K);
        if (prev < 0.5 && el.e >= 0.5) cycles++;
        prev = el.e;
        closest = Math.min(closest, norm(sub(at(s.x, 2), at(s.x, 1))));
      }
      return [
        {
          what: 'secular cycles resolved (numerically defensible)',
          value: cycles,
          atLeast: 2,
        },
        {
          what: 'largest relative energy error (defensible)',
          value: result.residuals.energy,
          tolerance: 1e-8,
        },
        {
          what: 'closest approach to the perturber (defensible)',
          value: closest,
          atLeast: 0.5,
        },
        {
          what: 'largest eccentricity against the quadrupole prediction 0.838',
          value: Math.abs(emax - ctx.prediction),
          tolerance: 0.03,
        },
        {
          what: 'variation of sqrt(1 - e^2) cos i',
          value: kmax - kmin,
          tolerance: 0.02,
        },
      ];
    },
  },
  {
    id: 'R7',
    title: 'A hyperbolic close approach: v_inf = 0.5, pericenter 0.01',
    make() {
      const vInf = 0.5;
      const q = 0.01;
      const e = 1 + q * vInf * vInf;
      const a = -1 / (vInf * vInf);
      const n = Math.sqrt(1 / Math.abs(a) ** 3);
      const H0 = Math.acosh((200 / Math.abs(a) + 1) / e);
      const M0 = e * Math.sinh(H0) - H0;
      const el = { a, e, i: 25 * DEG, Omega: 40 * DEG, omega: 70 * DEG };
      const start = fromElements({ ...el, M: -M0 }, 1);
      return {
        system: system(
          [
            { id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] },
            { id: 'visitor', m: 0, radius: 0, x: start.x, v: start.v },
          ],
          { scheme: 'dopri5', tol: 1e-10 }
        ),
        options: {
          span: (2 * M0) / n,
          samples: 1,
          positions: true,
          velocities: true,
          closeWithin: 0.1,
        },
        context: { el, M0, e },
      };
    },
    check(result, ctx) {
      const end = fromElements({ ...ctx.el, M: ctx.M0 }, 1);
      const last = result.samples.at(-1);
      const approach = result.events.find(e => e.kind === 'closeApproach');
      const u = at(last.v, 1);
      const w = end.v;
      // The angle as atan2(|u x w|, u . w): acos of a cosine this close to 1
      // cannot tell 1e-9 rad from 0.
      const c = [
        u[1] * w[2] - u[2] * w[1],
        u[2] * w[0] - u[0] * w[2],
        u[0] * w[1] - u[1] * w[0],
      ];
      const angle = Math.atan2(
        norm(c),
        u[0] * w[0] + u[1] * w[1] + u[2] * w[2]
      );
      // The visitor is massless and the star starts at rest, so the system's
      // energy is zero: the energy that must hold is the visitor's own orbit's.
      const orbitEnergy = smp => {
        const r = sub(at(smp.x, 1), at(smp.x, 0));
        const v = sub(at(smp.v, 1), at(smp.v, 0));
        return 0.5 * (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) - 1 / norm(r);
      };
      const e0 = orbitEnergy(result.samples[0]);
      return [
        {
          what: 'deflection against the analytic 2 arcsin(1/e) (radians)',
          value: angle,
          tolerance: 1e-6,
        },
        {
          what: "relative error in the visitor's orbital energy through the encounter",
          value: Math.abs((orbitEnergy(last) - e0) / e0),
          tolerance: 1e-8,
        },
        {
          what: 'closest approach at the step found, against the pericenter 0.01 (relative)',
          value: approach
            ? Math.abs(approach.distance - 0.01) / 0.01
            : Infinity,
          diagnostic: true,
        },
      ];
    },
  },
  {
    id: 'R8',
    title: 'Mergers, head-on and grazing',
    make() {
      const bodiesOf = grazing => [
        {
          id: 'big',
          m: 1,
          radius: 0.05,
          x: [-1, 0, 0],
          v: [0.2, 0, grazing ? 0.01 : 0],
        },
        {
          id: 'small',
          m: 0.5,
          radius: 0.05,
          x: [1, grazing ? 0.09 : 0, 0],
          v: [-0.3, 0, grazing ? -0.02 : 0],
        },
      ];
      const integrator = { scheme: 'yoshida4c', h: 1e-4 };
      return {
        system: system(bodiesOf(false), integrator),
        options: { span: 3, samples: 30, positions: false },
        context: { grazing: system(bodiesOf(true), integrator) },
      };
    },
    check(result, ctx, run) {
      const grazing = run(ctx.grazing, {
        span: 3,
        samples: 30,
        positions: false,
      });
      const checks = [];
      for (const [name, r] of [
        ['head-on', result],
        ['grazing', grazing],
      ]) {
        const mergers = r.events.filter(e => e.kind === 'merger');
        checks.push(
          { what: `${name}: mergers`, value: mergers.length, exactly: 1 },
          {
            what: `${name}: mass after the merger, against 1.5`,
            value: mergers[0]
              ? Math.abs(mergers[0].mass - 1.5) / 1.5
              : Infinity,
            tolerance: 1e-15,
          },
          {
            what: `${name}: momentum through the merger, relative`,
            value: mergers[0] ? mergers[0].momentumChange : Infinity,
            tolerance: 1e-15,
          },
          {
            what: `${name}: kinetic energy lost`,
            value: mergers[0] ? mergers[0].keLost : -1,
            atLeast: 0,
          }
        );
      }
      return checks;
    },
  },
];

/** Whether one measured check passes. */
export const passes = c =>
  c.diagnostic
    ? true
    : c.tolerance !== undefined
      ? c.value <= c.tolerance
      : c.atLeast !== undefined
        ? c.value >= c.atLeast
        : c.value === c.exactly;
