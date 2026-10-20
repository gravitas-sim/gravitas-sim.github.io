// =============================================================================
// The orbital layer's validation group (Prompt 148)
// -----------------------------------------------------------------------------
// Cases in the five kinds the validation contract asks of a kernel, as data:
//
//   analytic    a closed form the layer does not compute (circular speed,
//               apsides, vis-viva, Kepler's equation residual, a closed orbit)
//   oracle      an independent result: the 3-D kernel's own conversions
//               (js/lab3d/elements.js) compared bit for bit on its reference
//               corpus (js/lab3d/references.js), the mission core's universal-
//               variable propagator (js/mission/twobody.js) on its Kepler
//               fixture, and the first consumers' own functions on theirs
//   ensemble    seeded orbits round-tripped through a state vector and back
//               against a bound stated before the run: the fraction outside
//               it must be zero
//   negative    every way the layer must refuse: dimensions, unit systems,
//               frames, time scales, orbits it does not describe
//   authentic   a worked example from a textbook, to the digits it prints
//
// A case is `run()` returning measures { name, value, expected, tolerance,
// unit }; a measure passes when |value - expected| <= tolerance. Bit identity
// is counted as mismatches against 0 +- 0: one differing bit fails it.
// `npm run validate:orbital` prints the table and writes it into
// ORBITAL_LAYER.md; tests/orbitalLayerValidation.test.js runs the same cases.
//
// The seeds are fixed, so every machine prints the same table. The tolerances
// are fixed here and argued in each case's `why`.
// =============================================================================

import * as L from '../js/orbital/layer.js';
import * as kernel from '../js/lab3d/elements.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { BODIES } from '../js/mission/bodies.js';
import { propagate, sub, norm } from '../js/mission/twobody.js';
import { keplerState, validateSystem, buildSystem } from '../js/systemSpec.js';
import * as forward from '../js/forward/system.js';
import { solveKepler } from '../js/orbital.js';

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;
const CODE = L.simulationUnits(1, 'code');
const SIM2 = L.simulationUnits(2);
const KMS = L.PHYSICAL_UNITS['km-s'];
const AUD = L.PHYSICAL_UNITS['AU-day'];

const measure = (name, value, expected, tolerance, unit = '') => ({
  name,
  value,
  expected,
  tolerance,
  unit,
});
/** Bit identity of two number lists: how many differ. */
const mismatches = (a, b) =>
  a.reduce((n, x, k) => n + (Object.is(x, b[k]) ? 0 : 1), 0);

/** A seeded generator (a linear congruence): the same sequence on every machine. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

// --- Builders ---------------------------------------------------------------

const spatial = (el, mu, units = CODE, scale = 'code') =>
  L.keplerElements({
    dimension: 3,
    a: L.length(el.a, units),
    e: L.dimensionless(el.e),
    i: L.angle(el.i),
    Omega: L.angle(el.Omega),
    omega: L.angle(el.omega),
    anomaly: { type: 'mean', value: L.angle(el.M) },
    epoch: L.instant(0, units, scale),
    mu: L.gm(mu, units),
  });
const planar = (el, units, mu, scale = 'simulation', sense = 1) =>
  L.keplerElements({
    dimension: 2,
    a: L.length(el.a, units),
    e: L.dimensionless(el.e),
    omega: L.angle(el.omega),
    anomaly: { type: 'mean', value: L.angle(el.M) },
    epoch: L.instant(0, units, scale),
    mu: L.gm(mu, units),
    sense,
  });

// --- The 3-D kernel's reference corpus --------------------------------------
//
// The element sets js/lab3d/references.js passes to fromElements (R1, R2, R3,
// R6, R7), with the mu each is given. Tied to the file below: the bodies of
// R1, R2, R6 and R7 are rebuilt through the layer and compared with the
// corpus's own, so a transcription error fails there.

const HYP = (() => {
  const vInf = 0.5;
  const q = 0.01;
  const e = 1 + q * vInf * vInf;
  const a = -1 / (vInf * vInf);
  const H0 = Math.acosh((200 / Math.abs(a) + 1) / e);
  const M0 = e * Math.sinh(H0) - H0;
  return { a, e, i: 25 * DEG, Omega: 40 * DEG, omega: 70 * DEG, M0 };
})();
export const KERNEL_CORPUS = [
  {
    id: 'R1',
    mu: 1 + 1e-3,
    el: { a: 1, e: 0.6, i: 40 * DEG, Omega: 30 * DEG, omega: 60 * DEG, M: 0 },
  },
  {
    id: 'R2',
    mu: 0.5 + 0.5,
    el: { a: 1, e: 0.5, i: 60 * DEG, Omega: 10 * DEG, omega: 20 * DEG, M: 0.3 },
  },
  {
    id: 'R3 inner',
    mu: 1 + 1e-3,
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
    id: 'R3 outer',
    mu: 1 + 3e-4,
    el: {
      a: 9.5,
      e: 0.056,
      i: 2.5 * DEG,
      Omega: 113 * DEG,
      omega: 340 * DEG,
      M: 2.1,
    },
  },
  {
    id: 'R6 perturber',
    mu: 2,
    el: { a: 20, e: 0, i: 0, Omega: 0, omega: 0, M: 0 },
  },
  {
    id: 'R6 particle',
    mu: 1,
    el: { a: 1, e: 0.01, i: 65 * DEG, Omega: 0, omega: 0, M: 0 },
  },
  {
    id: 'R7 start',
    mu: 1,
    el: { ...HYP, M: -HYP.M0 },
  },
  {
    id: 'R7 end',
    mu: 1,
    el: { ...HYP, M: HYP.M0 },
  },
];
for (const c of KERNEL_CORPUS) {
  delete c.el.M0;
}

/** The layer's state for an element set, as the kernel's { x, v }. */
const layerState = (el, mu) => {
  const s = L.elementsToState(spatial(el, mu));
  return { x: [...s.r.value], v: [...s.v.value] };
};

/** The kernel's own two-body setup (references.js pair), through a state source. */
const pairBodies = (m1, m2, state) => {
  const f1 = -m2 / (m1 + m2);
  const f2 = m1 / (m1 + m2);
  return [
    { x: state.x.map(c => f1 * c), v: state.v.map(c => f1 * c) },
    { x: state.x.map(c => f2 * c), v: state.v.map(c => f2 * c) },
  ];
};

// --- The first consumers' baseline ------------------------------------------
//
// js/forward/system.js moved onto the layer in this prompt. Its earlier
// arithmetic is kept here, verbatim from v3 at a97582ee, as the baseline the
// layer must reproduce bit for bit. (js/systemSpec.js's keplerState has not
// moved and is imported live below.)

const baseline = {
  relativeState(o, t) {
    const M = o.M0 + o.n * (t - o.epochDays);
    const E = solveKepler(M, o.e);
    const cE = Math.cos(E);
    const sE = Math.sin(E);
    const s1 = Math.sqrt(1 - o.e * o.e);
    const px = o.aAU * (cE - o.e);
    const py = o.aAU * s1 * sE;
    const r = 1 - o.e * cE;
    const vx = (-o.aAU * o.n * sE) / r;
    const vy = (o.aAU * o.n * s1 * cE) / r;
    const c = Math.cos(o.omega);
    const s = Math.sin(o.omega);
    return {
      pos: { x: c * px - s * py, y: s * px + c * py },
      vel: { x: c * vx - s * vy, y: s * vx + c * vy },
    };
  },
  conjunctionTime(o, geometry) {
    const nu = geometry.positionAngleDeg * DEG - o.omega;
    const E =
      2 *
      Math.atan2(
        Math.sqrt(1 - o.e) * Math.sin(nu / 2),
        Math.sqrt(1 + o.e) * Math.cos(nu / 2)
      );
    const Mc = E - o.e * Math.sin(E);
    const frac = ((((Mc - o.M0) / (2 * Math.PI)) % 1) + 1) % 1;
    return o.epochDays + frac * o.periodDays;
  },
  elementsFromBodies({ G, mass, rel, time = 0, timeUnitDays = 1 }) {
    const mu = G * mass;
    const r = Math.hypot(rel.x, rel.y);
    const v2 = rel.vx * rel.vx + rel.vy * rel.vy;
    const energy = v2 / 2 - mu / r;
    if (!(energy < 0)) return null;
    const a = -mu / (2 * energy);
    const h = rel.x * rel.vy - rel.y * rel.vx;
    if (!(h > 0)) return null;
    const ex = (rel.vy * h) / mu - rel.x / r;
    const ey = (-rel.vx * h) / mu - rel.y / r;
    const e = Math.hypot(ex, ey);
    const omega = e > 1e-12 ? Math.atan2(ey, ex) : 0;
    const nu = Math.atan2(rel.y, rel.x) - omega;
    const E =
      2 *
      Math.atan2(
        Math.sqrt(1 - e) * Math.sin(nu / 2),
        Math.sqrt(1 + e) * Math.cos(nu / 2)
      );
    const M = E - e * Math.sin(E);
    return {
      periodDays: 2 * Math.PI * Math.sqrt((a * a * a) / mu) * timeUnitDays,
      e,
      omegaDeg: (omega / DEG + 360) % 360,
      meanAnomalyDeg: (((M / DEG) % 360) + 360) % 360,
      epochDays: time * timeUnitDays,
    };
  },
};
export const BASELINE = baseline;

/** The measures of one random elliptic orbit's worth of 3-D elements. */
function randomSpatial(rnd, { hyperbola = false, planarOnly = false } = {}) {
  const e = hyperbola ? 1.05 + rnd() * 3 : rnd() * 0.97;
  return {
    a: hyperbola ? -(0.5 + rnd() * 5) : 0.3 + rnd() * 10,
    e,
    i: planarOnly ? 0 : rnd() * Math.PI,
    Omega: (rnd() - 0.5) * TAU,
    omega: (rnd() - 0.5) * TAU,
    M: (rnd() - 0.5) * (hyperbola ? 6 : 20),
    mu: 0.5 + rnd() * 3,
  };
}

/** The builder's own example systems, in the schema of js/systemSpec.js. */
const BUILDER_SYSTEMS = [
  [
    { name: 'A', type: 'Star', mass: 0.6897 },
    {
      name: 'B',
      type: 'Star',
      mass: 0.20255,
      primary: 0,
      a: 0.22431,
      e: 0.15944,
      omega: 263.464,
    },
    {
      name: 'p',
      type: 'GasGiant',
      mass: 0.333,
      primary: 0,
      a: 0.7048,
      e: 0.0069,
      omega: 318,
    },
  ],
  [
    { name: 'A', type: 'Star', mass: 1.0788 },
    { name: 'p', type: 'Planet', mass: 1, primary: 0, a: 1.2 },
    {
      name: 'B',
      type: 'Star',
      mass: 0.9092,
      primary: 0,
      a: 23.4,
      e: 0.5179,
      omega: 231.65,
    },
  ],
  [
    { name: 'A', type: 'Star', mass: 1 },
    { name: 'B', type: 'Star', mass: 0.8, primary: 0, a: 0.5, e: 0.1 },
    { name: 'C', type: 'Star', mass: 0.6, primary: 0, a: 5, e: 0.2, phase: 90 },
  ],
  [
    { name: 'A', type: 'Star', mass: 1 },
    {
      name: 'b',
      type: 'Planet',
      mass: 1,
      primary: 0,
      a: 1,
      e: 0.3,
      omega: 40,
      phase: 200,
      retrograde: true,
    },
    {
      name: 'c',
      type: 'GasGiant',
      mass: 1,
      primary: 0,
      a: 5.2,
      e: 0.05,
      omega: 14,
      phase: 300,
    },
  ],
];

// --- The cases --------------------------------------------------------------

export const CASES = [
  {
    id: 'A1',
    kind: 'analytic',
    title: 'A circular orbit, planar and spatial',
    source:
      'r = a (cos M, sin M), v = sqrt(mu / a) (-sin M, cos M), turned through omega',
    why: 'Closed form, no solver in it: each component to 1e-13 of the scale (a for position, the circular speed for velocity), eight phases and three turns of omega.',
    run() {
      let worst = 0;
      for (const mu of [1, 2000]) {
        for (let k = 0; k < 8; k++) {
          const M = (k * TAU) / 8 - 0.3;
          const omega = 0.4 + k;
          const a = 3.7;
          const vc = Math.sqrt(mu / a);
          const c = Math.cos(omega);
          const s = Math.sin(omega);
          const unit = [Math.cos(M), Math.sin(M)];
          const want = {
            r: [
              a * (c * unit[0] - s * unit[1]),
              a * (s * unit[0] + c * unit[1]),
            ],
            v: [
              vc * (-c * unit[1] - s * unit[0]),
              vc * (-s * unit[1] + c * unit[0]),
            ],
          };
          const state = L.elementsToState(
            planar({ a, e: 0, omega, M }, SIM2, mu)
          ).r.value;
          const vel = L.elementsToState(planar({ a, e: 0, omega, M }, SIM2, mu))
            .v.value;
          for (let q = 0; q < 2; q++) {
            worst = Math.max(
              worst,
              Math.abs(state[q] - want.r[q]) / a,
              Math.abs(vel[q] - want.v[q]) / vc
            );
          }
          // The same orbit in 3-D with no inclination and no node.
          const s3 = L.elementsToState(
            spatial({ a, e: 0, i: 0, Omega: 0, omega, M }, mu)
          );
          for (let q = 0; q < 2; q++) {
            worst = Math.max(
              worst,
              Math.abs(s3.r.value[q] - want.r[q]) / a,
              Math.abs(s3.v.value[q] - want.v[q]) / vc
            );
          }
          worst = Math.max(
            worst,
            Math.abs(s3.r.value[2]),
            Math.abs(s3.v.value[2])
          );
        }
      }
      return [measure('worst component error / scale', worst, 0, 1e-13)];
    },
  },
  {
    id: 'A2',
    kind: 'analytic',
    title: 'Apsides, vis-viva and the angular momentum',
    source:
      'r_p = a (1 - e), r_a = a (1 + e); v^2 = mu (2 / r - 1 / a); h = sqrt(mu a (1 - e^2))',
    why: 'Seeded orbits in 3-D (e up to 0.97) and in the plane: the three constants of the Kepler problem come out of the state to 1e-12 relative; the apsides are met at M = 0 and M = pi.',
    run() {
      const rnd = seeded(148);
      let apsis = 0;
      let visViva = 0;
      let momentum = 0;
      for (let k = 0; k < 400; k++) {
        const p = randomSpatial(rnd);
        const el = spatial({ ...p, M: 0 }, p.mu);
        const peri = L.elementsToState(el).r.value;
        apsis = Math.max(
          apsis,
          Math.abs(Math.hypot(...peri) / (p.a * (1 - p.e)) - 1)
        );
        const apo = L.elementsToState(spatial({ ...p, M: Math.PI }, p.mu)).r
          .value;
        apsis = Math.max(
          apsis,
          Math.abs(Math.hypot(...apo) / (p.a * (1 + p.e)) - 1)
        );
        const s = L.elementsToState(spatial(p, p.mu));
        const r = Math.hypot(...s.r.value);
        const v2 = s.v.value.reduce((q, c) => q + c * c, 0);
        visViva = Math.max(
          visViva,
          Math.abs(v2 / (p.mu * (2 / r - 1 / p.a)) - 1)
        );
        const [x, y, z] = s.r.value;
        const [vx, vy, vz] = s.v.value;
        const h = Math.hypot(y * vz - z * vy, z * vx - x * vz, x * vy - y * vx);
        momentum = Math.max(
          momentum,
          Math.abs(h / Math.sqrt(p.mu * p.a * (1 - p.e * p.e)) - 1)
        );
      }
      return [
        measure('apsis distance / closed form - 1', apsis, 0, 1e-12),
        measure('v^2 / vis-viva - 1', visViva, 0, 1e-12),
        measure(
          'angular momentum / sqrt(mu a (1 - e^2)) - 1',
          momentum,
          0,
          1e-12
        ),
      ];
    },
  },
  {
    id: 'A3',
    kind: 'analytic',
    title: "Kepler's equation and the anomaly conversions",
    source:
      'E - e sin E = M; tan(nu / 2) = sqrt((1 + e) / (1 - e)) tan(E / 2); hyperbola: e sinh H - H = M',
    why: 'The residual of the equation itself, mean to eccentric to true and back on 20 eccentricities (to 0.99) by 360 anomalies, and the hyperbolic branch on 8 eccentricities: 1e-14 on the residual, 1e-13 / (1 - e) on the round trip, 1e-12 on a hyperbola: the conditioning of the equation and no more.',
    run() {
      let residual = 0;
      let roundTrip = 0;
      const ecc = Array.from({ length: 20 }, (_, k) => (k * 0.99) / 19);
      for (const e of ecc) {
        for (let k = 0; k < 360; k++) {
          const M = -Math.PI + ((k + 0.5) * TAU) / 360;
          const m = { type: 'mean', value: L.angle(M) };
          const ee = L.dimensionless(e);
          const E = L.convertAnomaly(m, 'eccentric', ee).value.value;
          residual = Math.max(residual, Math.abs(E - e * Math.sin(E) - M));
          const nu = L.convertAnomaly(m, 'true', ee);
          const back = L.convertAnomaly(nu, 'mean', ee).value.value;
          roundTrip = Math.max(roundTrip, Math.abs(back - M) * (1 - e));
        }
      }
      let hyper = 0;
      for (const e of [1.05, 1.2, 1.5, 2, 2.5, 3, 4, 6]) {
        for (let k = 0; k < 120; k++) {
          const M = -6 + (k * 12) / 119;
          const H = L.convertAnomaly(
            { type: 'mean', value: L.angle(M) },
            'eccentric',
            L.dimensionless(e)
          ).value.value;
          hyper = Math.max(hyper, Math.abs(e * Math.sinh(H) - H - M));
        }
      }
      return [
        measure('residual of E - e sin E = M', residual, 0, 1e-14),
        measure('mean to true to mean, error x (1 - e)', roundTrip, 0, 1e-13),
        measure('hyperbola: residual of e sinh H - H = M', hyper, 0, 1e-12),
      ];
    },
  },
  {
    id: 'A4',
    kind: 'analytic',
    title: 'A closed orbit, and the clock',
    source:
      'the state at t0 + P is the state at t0; the mean motion is sqrt(mu / a^3) or 2 pi / P',
    why: 'Time enters through the epoch and the mean motion: after one period, planar and spatial, the position returns to 1e-12 of a, whether the orbit is given by its mu or by its period (the forward models state the period).',
    run() {
      const rnd = seeded(4);
      let worst = 0;
      let rateGap = 0;
      for (let k = 0; k < 200; k++) {
        const p = randomSpatial(rnd);
        const el = spatial(p, p.mu);
        const n = L.meanMotion(el).value;
        const P = TAU / n;
        const s0 = L.elementsToState(el, L.instant(0, CODE, 'code'));
        const s1 = L.elementsToState(el, L.instant(P, CODE, 'code'));
        worst = Math.max(
          worst,
          Math.hypot(...s0.r.value.map((c, q) => c - s1.r.value[q])) / p.a
        );
        const pl = L.keplerElements({
          dimension: 2,
          a: L.length(p.a, AUD),
          e: L.dimensionless(p.e),
          omega: L.angle(p.omega),
          anomaly: { type: 'mean', value: L.angle(p.M) },
          epoch: L.instant(0, AUD, 'elapsed'),
          period: L.time(P, AUD),
        });
        const q0 = L.elementsToState(pl, L.instant(3, AUD, 'elapsed'));
        const q1 = L.elementsToState(pl, L.instant(3 + P, AUD, 'elapsed'));
        worst = Math.max(
          worst,
          Math.hypot(...q0.r.value.map((c, q) => c - q1.r.value[q])) / p.a
        );
        rateGap = Math.max(
          rateGap,
          Math.abs((L.meanMotion(pl).value * P) / TAU - 1)
        );
      }
      return [
        measure('position error after one period, / a', worst, 0, 1e-12),
        measure('mean motion x P / 2 pi - 1', rateGap, 0, 1e-15),
      ];
    },
  },
  {
    id: 'O1',
    kind: 'oracle',
    title: "The 3-D kernel's corpus, bit for bit",
    source:
      'js/lab3d/references.js R1, R2, R3, R6, R7: the element sets passed to fromElements, and the states back through toElements',
    why: "The kernel's conversions are the oracle (its corpus is pinned to the bit: a state rebuilt from elements in two engines is already two states). Zero differing bits, in both directions, for the corpus and for the 20,000 seeded orbits beside it (ellipses and hyperbolas). A mismatch of one bit fails.",
    run() {
      let toState = 0;
      let back = 0;
      for (const c of KERNEL_CORPUS) {
        const ref = kernel.fromElements(c.el, c.mu);
        const mine = layerState(c.el, c.mu);
        toState += mismatches([...ref.x, ...ref.v], [...mine.x, ...mine.v]);
        const el = kernel.toElements(ref.x, ref.v, c.mu);
        const s = L.elementsToState(spatial(c.el, c.mu));
        const e2 = L.stateToElements(s, L.gm(c.mu, CODE));
        back += mismatches(
          [el.a, el.e, el.i, el.Omega, el.omega, el.M, el.nu],
          [
            e2.a.value,
            e2.e.value,
            e2.i.value,
            e2.Omega.value,
            e2.omega.value,
            e2.anomaly.value.value,
            e2.trueAnomaly.value,
          ]
        );
      }
      const rnd = seeded(20260);
      let sweepState = 0;
      let sweepBack = 0;
      for (let k = 0; k < 20000; k++) {
        const p = randomSpatial(rnd, {
          hyperbola: k % 5 === 4,
          planarOnly: k % 50 === 7,
        });
        const el = {
          a: p.a,
          e: p.e,
          i: p.i,
          Omega: p.Omega,
          omega: p.omega,
          M: p.M,
        };
        const ref = kernel.fromElements(el, p.mu);
        const mine = layerState(el, p.mu);
        sweepState += mismatches([...ref.x, ...ref.v], [...mine.x, ...mine.v]);
        const b = kernel.toElements(ref.x, ref.v, p.mu);
        const e2 = L.stateToElements(
          L.elementsToState(spatial(el, p.mu)),
          L.gm(p.mu, CODE)
        );
        sweepBack += mismatches(
          [b.a, b.e, b.i, b.Omega, b.omega, b.M, b.nu],
          [
            e2.a.value,
            e2.e.value,
            e2.i.value,
            e2.Omega.value,
            e2.omega.value,
            e2.anomaly.value.value,
            e2.trueAnomaly.value,
          ]
        );
      }
      return [
        measure('corpus: elements to state, differing bits', toState, 0, 0),
        measure('corpus: state to elements, differing bits', back, 0, 0),
        measure(
          '20,000 orbits: elements to state, differing bits',
          sweepState,
          0,
          0
        ),
        measure(
          '20,000 orbits: state to elements, differing bits',
          sweepBack,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'O2',
    kind: 'oracle',
    title: "The corpus's own initial bodies through the layer",
    source:
      'REFERENCES R1 and R2 (the pair), R6 (the star, the perturber and the particle), R7 (the visitor): make().system.bodies',
    why: 'Ties the corpus table above to the file it was transcribed from. The bodies the kernel integrates are rebuilt from the layer and compared bit for bit with the ones make() returns.',
    run() {
      const by = id => REFERENCES.find(r => r.id === id).make();
      let bad = 0;
      const compare = (bodies, want) =>
        bodies.reduce(
          (n, b, k) =>
            n + mismatches([...b.x, ...b.v], [...want[k].x, ...want[k].v]),
          0
        );
      const pickEl = id => KERNEL_CORPUS.find(c => c.id === id);
      // R1: a pair with the 1:1e-3 masses, its relative orbit from the layer.
      const r1 = pickEl('R1');
      bad += compare(
        pairBodies(1, 1e-3, layerState(r1.el, r1.mu)),
        by('R1').system.bodies
      );
      // R2: the same binary, at rest (the context's `still`), masses 1/2 each.
      const r2 = pickEl('R2');
      bad += compare(
        pairBodies(0.5, 0.5, layerState(r2.el, r2.mu)),
        by('R2').context.still.bodies
      );
      // R6: the perturber and the particle, about the star-perturber centre.
      const outer = layerState(pickEl('R6 perturber').el, 2);
      const inner = layerState(pickEl('R6 particle').el, 1);
      const c = [0, 1, 2].map(k => (0 + outer.x[k]) / 2);
      const w = [0, 1, 2].map(k => (0 + outer.v[k]) / 2);
      const about = st => ({
        x: st.x.map((q, k) => q - c[k]),
        v: st.v.map((q, k) => q - w[k]),
      });
      bad += compare(
        [about({ x: [0, 0, 0], v: [0, 0, 0] }), about(outer), about(inner)],
        by('R6').system.bodies
      );
      // R7: the visitor starts at M = -M0.
      const r7 = by('R7').system.bodies[1];
      bad += compare([layerState(pickEl('R7 start').el, 1)], [r7]);
      return [measure('differing bits over eight bodies', bad, 0, 0)];
    },
  },
  {
    id: 'O3',
    kind: 'oracle',
    title: "The mission core's Kepler fixture, against its propagator",
    source:
      'js/mission/references.js K1: an ellipse of e = 0.7 over 3.3 periods and a hyperbola of e = 2.5 for 30 hours about the Earth (GM 398600.4418 km^3/s^2), in universal variables (js/mission/twobody.js)',
    why: "Two unrelated methods of the same motion, as K1 states: the layer advances the mean anomaly and solves Kepler's equation, the propagator never forms an anomaly. They agree to 1e-9 of the distance, K1's own bound; and the layer's initial state is the kernel's to the bit.",
    run() {
      const mu = BODIES.earth.GM;
      const cases = [
        {
          name: 'ellipse',
          el: { a: 20000, e: 0.7, i: 0.4, Omega: 1, omega: 2, M: 0.3 },
          dt: 3.3 * TAU * Math.sqrt(20000 ** 3 / mu),
        },
        {
          name: 'hyperbola',
          el: { a: -8000, e: 2.5, i: 1.1, Omega: -0.5, omega: 0.7, M: -3 },
          dt: 30 * 3600,
        },
      ];
      const out = [];
      let bits = 0;
      for (const c of cases) {
        const el = spatial(c.el, mu, KMS, 'elapsed');
        const s0 = L.elementsToState(el);
        const ref = kernel.fromElements(c.el, mu);
        bits += mismatches(
          [...ref.x, ...ref.v],
          [...s0.r.value, ...s0.v.value]
        );
        const s1 = L.elementsToState(el, L.instant(c.dt, KMS, 'elapsed'));
        const p = propagate(mu, ref.x, ref.v, c.dt);
        out.push(
          measure(
            `${c.name}: layer vs propagator, relative distance`,
            norm(sub(s1.r.value, p.r)) / norm(p.r),
            0,
            1e-9
          )
        );
      }
      out.push(
        measure('initial states vs the kernel, differing bits', bits, 0, 0)
      );
      return out;
    },
  },
  {
    id: 'O4',
    kind: 'oracle',
    title: "The Orbital System Builder's keplerState, bit for bit",
    source:
      'js/systemSpec.js keplerState (not yet on the layer: the live function), on 20,000 seeded orbits and on every orbit of four builder systems',
    why: "The builder's states are saved with a hash and compared on load (initialStateMatches), so its bits are pinned. The layer's planar branch, with the mean anomaly reduced to the principal turn, must give the live function's output exactly: zero differing bits, prograde and retrograde.",
    run() {
      const asLayer = ({ a, e, omegaDeg, phaseDeg, mu, retrograde }, G) => {
        const units = L.simulationUnits(G);
        const s = L.elementsToState(
          L.keplerElements({
            dimension: 2,
            a: L.length(a, units),
            e: L.dimensionless(e),
            omega: L.degrees(omegaDeg),
            anomaly: {
              type: 'mean',
              value: L.principalAngle(L.degrees(phaseDeg)),
            },
            epoch: L.instant(0, units, 'simulation'),
            mu: L.gm(mu, units),
            sense: retrograde ? -1 : 1,
          })
        );
        return [...s.r.value, ...s.v.value];
      };
      const live = args => {
        const s = keplerState(args);
        return [s.pos.x, s.pos.y, s.vel.x, s.vel.y];
      };
      const rnd = seeded(2026);
      let sweep = 0;
      for (let k = 0; k < 20000; k++) {
        const args = {
          a: 1 + rnd() * 500,
          e: rnd() * 0.98,
          omegaDeg: rnd() * 720 - 360,
          phaseDeg: rnd() * 1000 - 500,
          mu: 1 + rnd() * 5000,
          retrograde: rnd() < 0.3,
        };
        sweep += mismatches(live(args), asLayer(args, 2));
      }
      let fixtures = 0;
      let orbits = 0;
      for (const bodies of BUILDER_SYSTEMS) {
        const verdict = validateSystem({ bodies });
        const built = buildSystem(verdict.bodies, { G: 2 });
        for (const o of built.orbits) {
          const args = {
            a: o.a,
            e: o.e,
            omegaDeg: o.omega,
            phaseDeg: o.phase,
            mu: o.mu,
            retrograde: o.retrograde,
          };
          fixtures += mismatches(live(args), asLayer(args, 2));
          orbits++;
        }
      }
      return [
        measure('20,000 orbits, differing bits', sweep, 0, 0),
        measure(
          `${orbits} orbits of four builder systems, differing bits`,
          fixtures,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'O5',
    kind: 'oracle',
    title: 'The forward models on the layer, against their earlier arithmetic',
    source:
      'js/forward/system.js relativeState, conjunctionTime and elementsFromBodies, now through the layer, against the v3 functions kept in this file',
    why: 'The forward models fit published light curves and radial velocities, and the observatory saves their output: moving onto the layer may not move a bit. 20,000 seeded planets and epochs, circular and eccentric; 20,000 conjunctions; 20,000 states read back (prograde, retrograde and unbound ones included).',
    run() {
      const rnd = seeded(5);
      const star = { massSun: 0.9, radiusSun: 1, teffK: 5500, distancePc: 30 };
      let rel = 0;
      let conj = 0;
      for (let k = 0; k < 20000; k++) {
        const planet = {
          id: 'b',
          massEarth: 1 + rnd() * 300,
          radiusEarth: 1,
          periodDays: 0.5 + rnd() * 800,
          e: rnd() < 0.3 ? 0 : rnd() * 0.95,
          omegaDeg: rnd() * 360,
          meanAnomalyDeg: rnd() * 360,
          epochDays: rnd() * 10,
        };
        const o = forward.orbitOf(star, planet);
        const t = rnd() * 2000 - 100;
        const a = baseline.relativeState(o, t);
        const b = forward.relativeState(o, t);
        rel += mismatches(
          [a.pos.x, a.pos.y, a.vel.x, a.vel.y],
          [b.pos.x, b.pos.y, b.vel.x, b.vel.y]
        );
        const g = { positionAngleDeg: rnd() * 360 };
        conj += Object.is(
          baseline.conjunctionTime(o, g),
          forward.conjunctionTime(o, g)
        )
          ? 0
          : 1;
      }
      let read = 0;
      for (let k = 0; k < 20000; k++) {
        const G = 0.5 + rnd() * 3;
        const input = {
          G,
          mass: 0.5 + rnd() * 4,
          rel: {
            x: (rnd() - 0.5) * 6,
            y: (rnd() - 0.5) * 6,
            vx: (rnd() - 0.5) * 3,
            vy: (rnd() - 0.5) * 3,
          },
          time: rnd() * 50,
          timeUnitDays: 0.5 + rnd() * 4,
        };
        const a = baseline.elementsFromBodies(input);
        const b = forward.elementsFromBodies(input);
        if (a === null || b === null) read += a === b ? 0 : 1;
        else
          read += mismatches(
            [a.periodDays, a.e, a.omegaDeg, a.meanAnomalyDeg, a.epochDays],
            [b.periodDays, b.e, b.omegaDeg, b.meanAnomalyDeg, b.epochDays]
          );
      }
      return [
        measure('relativeState, differing bits', rel, 0, 0),
        measure('conjunctionTime, differing bits', conj, 0, 0),
        measure(
          'elementsFromBodies, differing bits (null included)',
          read,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'E1',
    kind: 'ensemble',
    title: 'A state through elements and back, on seeded ensembles',
    source:
      '2,000 planar orbits (e to 0.95, both senses) and 2,000 spatial ones (ellipses to e = 0.97 and hyperbolas to e = 4, including planar ones)',
    why: "Stated before the run: a position returns to within 1e-11 a / (1 - e) on an ellipse and 1e-10 a on a hyperbola, which is the conditioning of Kepler's equation (one ulp in M is up to 1 / (1 - e) in E) with two orders of room. The fraction outside the bound must be zero.",
    run() {
      const rnd = seeded(99);
      let outside = 0;
      let worstPlanar = 0;
      for (let k = 0; k < 2000; k++) {
        const e = rnd() * 0.95;
        const a = 0.1 + rnd() * 50;
        const mu = 0.5 + rnd() * 5000;
        const el = planar(
          { a, e, omega: (rnd() - 0.5) * TAU, M: (rnd() - 0.5) * 12 },
          SIM2,
          mu,
          'simulation',
          rnd() < 0.5 ? 1 : -1
        );
        const s = L.elementsToState(el);
        const back = L.stateToElements(s, L.gm(mu, SIM2));
        const s2 = L.elementsToState(back);
        const err =
          Math.hypot(
            s.r.value[0] - s2.r.value[0],
            s.r.value[1] - s2.r.value[1]
          ) / a;
        worstPlanar = Math.max(worstPlanar, err * (1 - e));
        if (!(err <= 1e-11 / (1 - e))) outside++;
      }
      let worstSpatial = 0;
      for (let k = 0; k < 2000; k++) {
        const p = randomSpatial(rnd, {
          hyperbola: k % 4 === 3,
          planarOnly: k % 40 === 11,
        });
        const el = spatial(p, p.mu);
        const s = L.elementsToState(el);
        const s2 = L.elementsToState(L.stateToElements(s, L.gm(p.mu, CODE)));
        const scale = Math.abs(p.a);
        const err =
          Math.hypot(...s.r.value.map((c, q) => c - s2.r.value[q])) / scale;
        const bound = p.e < 1 ? 1e-11 / (1 - p.e) : 1e-10;
        worstSpatial = Math.max(worstSpatial, p.e < 1 ? err * (1 - p.e) : err);
        if (!(err <= bound)) outside++;
      }
      return [
        measure('orbits outside the stated bound, of 4,000', outside, 0, 0),
        measure('planar: worst error x (1 - e) / a', worstPlanar, 0, 1e-11),
        measure(
          'spatial: worst error x (1 - e) / a (hyperbolas: / a)',
          worstSpatial,
          0,
          1e-11
        ),
      ];
    },
  },
  {
    id: 'N1',
    kind: 'negative',
    title: 'What the layer must refuse',
    source:
      'a dimension, a unit system, a frame, a time scale, an orbit it does not describe',
    why: 'A layer that only converts is a layer that lets a mismatch through. Each case is built to be wrong in exactly one way and must be refused with the named code; the measure counts the ones that were not.',
    run() {
      const el = planar({ a: 1, e: 0.1, omega: 0, M: 0 }, SIM2, 1);
      const sp = spatial(KERNEL_CORPUS[0].el, KERNEL_CORPUS[0].mu);
      const state = L.elementsToState(el);
      const cases = [
        [
          'mu given as a length',
          'dimension',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, SIM2),
              e: L.dimensionless(0.1),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, SIM2, 'simulation'),
              mu: L.length(1, SIM2),
            }),
        ],
        [
          'an eccentricity with units',
          'dimension',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, SIM2),
              e: L.length(0.1, SIM2),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, SIM2, 'simulation'),
              mu: L.gm(1, SIM2),
            }),
        ],
        [
          'a bare number for an angle',
          'quantity',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, SIM2),
              e: L.dimensionless(0.1),
              omega: 0.2,
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, SIM2, 'simulation'),
              mu: L.gm(1, SIM2),
            }),
        ],
        ['an angle given units', 'units', () => L.quantity(1, 'angle', SIM2)],
        ['a length without units', 'units', () => L.quantity(1, 'length')],
        [
          'mu in km-s with a in AU-day',
          'units',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, AUD),
              e: L.dimensionless(0.1),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, AUD, 'elapsed'),
              mu: L.gm(1, KMS),
            }),
        ],
        [
          'simulation G = 2 against G = 9000',
          'units',
          () => L.stateToElements(state, L.gm(1, L.simulationUnits(9000))),
        ],
        [
          'an epoch in other units than the orbit',
          'units',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, SIM2),
              e: L.dimensionless(0.1),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, AUD, 'elapsed'),
              mu: L.gm(1, SIM2),
            }),
        ],
        [
          'elements measured in the perifocal frame',
          'frame',
          () =>
            L.keplerElements({
              dimension: 2,
              frame: 'perifocal',
              a: L.length(1, SIM2),
              e: L.dimensionless(0.1),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, SIM2, 'simulation'),
              mu: L.gm(1, SIM2),
            }),
        ],
        [
          'a frame that is not in the enumeration',
          'frame',
          () =>
            L.makeState({
              r: state.r,
              v: state.v,
              frame: 'heliocentric-ecliptic',
              epoch: state.epoch,
            }),
        ],
        [
          'elements read from a perifocal state',
          'frame',
          () => L.stateToElements(L.perifocalState(el), L.gm(1, SIM2)),
        ],
        [
          'a reference-frame state rotated again',
          'frame',
          () => L.toReferenceFrame(state, el),
        ],
        [
          'a time on TDB for an epoch on the simulation clock',
          'timeScale',
          () => L.elementsToState(el, L.instant(1, SIM2, 'TDB')),
        ],
        [
          'an unknown time scale',
          'timeScale',
          () => L.instant(0, SIM2, 'Julian'),
        ],
        [
          'a duration where an instant is needed',
          'timeScale',
          () => L.elementsToState(el, L.time(1, SIM2)),
        ],
        [
          'a planar orbit with e = 1',
          'domain',
          () => planar({ a: 1, e: 1, omega: 0, M: 0 }, SIM2, 1),
        ],
        [
          'a planar orbit with e = 1.5',
          'domain',
          () => planar({ a: 1, e: 1.5, omega: 0, M: 0 }, SIM2, 1),
        ],
        [
          'a negative semi-major axis, planar',
          'domain',
          () => planar({ a: -1, e: 0.1, omega: 0, M: 0 }, SIM2, 1),
        ],
        [
          'mu of zero, planar',
          'domain',
          () => planar({ a: 1, e: 0.1, omega: 0, M: 0 }, SIM2, 0),
        ],
        [
          'neither mu nor a period',
          'domain',
          () =>
            L.keplerElements({
              dimension: 2,
              a: L.length(1, SIM2),
              e: L.dimensionless(0.1),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, SIM2, 'simulation'),
            }),
        ],
        [
          'a parabola, spatial',
          'elements',
          () => spatial({ ...KERNEL_CORPUS[0].el, e: 1, a: 1 }, 1),
        ],
        [
          'an ellipse with a negative axis, spatial',
          'elements',
          () => spatial({ ...KERNEL_CORPUS[0].el, a: -1 }, 1),
        ],
        [
          'a hyperbola with a positive axis, spatial',
          'elements',
          () => spatial({ ...KERNEL_CORPUS[0].el, e: 2 }, 1),
        ],
        [
          'an inclination above pi',
          'elements',
          () => spatial({ ...KERNEL_CORPUS[0].el, i: 4 }, 1),
        ],
        [
          'a non-finite element',
          'elements',
          () => spatial({ ...KERNEL_CORPUS[0].el, omega: NaN }, 1),
        ],
        [
          'a sense on a 3-D orbit',
          'domain',
          () =>
            L.keplerElements({
              dimension: 3,
              sense: -1,
              a: L.length(1, CODE),
              e: L.dimensionless(0.1),
              i: L.angle(0),
              Omega: L.angle(0),
              omega: L.angle(0),
              anomaly: { type: 'mean', value: L.angle(0) },
              epoch: L.instant(0, CODE, 'code'),
              mu: L.gm(1, CODE),
            }),
        ],
        [
          'an unbound planar state',
          'unbound',
          () =>
            L.stateToElements(
              L.makeState({
                r: L.vector([1, 0], 'length', SIM2),
                v: L.vector([0, 5], 'speed', SIM2),
                frame: 'primary-reference',
                epoch: L.instant(0, SIM2, 'simulation'),
              }),
              L.gm(1, SIM2)
            ),
        ],
        [
          'a radial planar state',
          'degenerate',
          () =>
            L.stateToElements(
              L.makeState({
                r: L.vector([1, 0], 'length', SIM2),
                v: L.vector([-0.1, 0], 'speed', SIM2),
                frame: 'primary-reference',
                epoch: L.instant(0, SIM2, 'simulation'),
              }),
              L.gm(1, SIM2)
            ),
        ],
        [
          'a radial spatial state',
          'degenerate',
          () =>
            L.stateToElements(
              L.makeState({
                r: L.vector([1, 0, 0], 'length', CODE),
                v: L.vector([-0.1, 0, 0], 'speed', CODE),
                frame: 'primary-reference',
                epoch: L.instant(0, CODE, 'code'),
              }),
              L.gm(1, CODE)
            ),
        ],
        [
          'a true anomaly beyond the asymptote',
          'domain',
          () =>
            L.convertAnomaly(
              { type: 'true', value: L.angle(3) },
              'mean',
              L.dimensionless(2)
            ),
        ],
        [
          'a 2-D state with 3-D elements to rotate',
          'dimension',
          () => L.toReferenceFrame(L.perifocalState(el), sp),
        ],
        [
          'a state of mixed size',
          'dimension',
          () =>
            L.makeState({
              r: L.vector([1, 0], 'length', SIM2),
              v: L.vector([0, 1, 0], 'speed', SIM2),
              frame: 'primary-reference',
              epoch: L.instant(0, SIM2, 'simulation'),
            }),
        ],
      ];
      let unrefused = 0;
      let wrongCode = 0;
      for (const [, code, make] of cases) {
        try {
          make();
          unrefused++;
        } catch (err) {
          if (!(err instanceof L.OrbitalLayerError) || err.code !== code)
            wrongCode++;
        }
      }
      // The 3-D kernel refuses the same element sets with the same words.
      let words = 0;
      const base = KERNEL_CORPUS[0].el;
      for (const [el, mu] of [
        [{ ...base, e: 1, a: 1 }, 1],
        [{ ...base, a: -1 }, 1],
        [{ ...base, e: 2 }, 1],
        [{ ...base, i: 4 }, 1],
        [{ ...base, omega: NaN }, 1],
        [{ ...base }, 0],
        [{ ...base, e: -0.1 }, 1],
      ]) {
        const say = make => {
          try {
            make();
          } catch (err) {
            return err.message;
          }
          return 'not refused';
        };
        words +=
          say(() => spatial(el, mu)) === say(() => kernel.fromElements(el, mu))
            ? 0
            : 1;
      }
      return [
        measure(`refusals missed, of ${cases.length}`, unrefused, 0, 0),
        measure('refusals with the wrong code', wrongCode, 0, 0),
        measure(
          "element sets refused in other words than the 3-D kernel's, of 7",
          words,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'T1',
    kind: 'authentic',
    title: 'A textbook state vector to its elements',
    source:
      'H. D. Curtis, Orbital Mechanics for Engineering Students, example 4.3: r = (-6045, -3490, 2500) km, v = (-3.457, 6.618, 2.533) km/s about the Earth, mu = 398600 km^3/s^2; printed e = 0.1712, i = 153.2 deg, Omega = 255.3 deg, omega = 20.07 deg, true anomaly 28.45 deg, h = 58,310 km^2/s',
    why: 'Printed to four figures: half a unit in the last printed place is the tolerance of each (5e-5 for e, 0.05 deg for i and Omega, 0.005 deg for omega and the anomaly, 5 km^2/s for h). The values were not used to build the layer; this is the one measurement here that no code of this repository stands behind.',
    run() {
      const s = L.makeState({
        r: L.vector([-6045, -3490, 2500], 'length', KMS),
        v: L.vector([-3.457, 6.618, 2.533], 'speed', KMS),
        frame: 'primary-reference',
        epoch: L.instant(0, KMS, 'elapsed'),
      });
      const el = L.stateToElements(s, L.gm(398600, KMS));
      const deg = x => (((x / DEG) % 360) + 360) % 360;
      const [x, y, z] = s.r.value;
      const [vx, vy, vz] = s.v.value;
      const h = Math.hypot(y * vz - z * vy, z * vx - x * vz, x * vy - y * vx);
      return [
        measure('e', el.e.value, 0.1712, 5e-5),
        measure('i', deg(el.i.value), 153.2, 0.05, 'deg'),
        measure('Omega', deg(el.Omega.value), 255.3, 0.05, 'deg'),
        measure('omega', deg(el.omega.value), 20.07, 0.005, 'deg'),
        measure('true anomaly', deg(el.trueAnomaly.value), 28.45, 0.005, 'deg'),
        measure('h', h, 58310, 5, 'km^2/s'),
      ];
    },
  },
];

/** Run one case: its measures, each with the verdict. */
export function runCase(c) {
  const measures = c.run().map(m => ({
    ...m,
    ok: Math.abs(m.value - m.expected) <= m.tolerance,
  }));
  return { ...c, measures, ok: measures.every(m => m.ok) };
}

// --- The table --------------------------------------------------------------

const fmt = v =>
  typeof v !== 'number'
    ? String(v)
    : v === 0
      ? '0'
      : Math.abs(v) >= 0.01 && Math.abs(v) < 1e6
        ? String(Number(v.toPrecision(4)))
        : v.toExponential(0);
const bound = m =>
  m.tolerance === 0
    ? `= ${fmt(m.expected)}`
    : `${fmt(m.expected)} ± ${fmt(m.tolerance)}${m.unit ? ` ${m.unit}` : ''}`;
const named = m =>
  `${m.name}${m.unit && m.tolerance === 0 ? ` (${m.unit})` : ''}`;

/** The markdown table of results, one row per measure. */
export function table(results) {
  const rows = [
    '| Case | Kind | Measure | Value | Bound | |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const c of results)
    c.measures.forEach((m, k) =>
      rows.push(
        `| ${k === 0 ? `**${c.id}** ${c.title}` : ''} | ${k === 0 ? c.kind : ''} | ${named(m)} | ${fmt(m.value)} | ${bound(m)} | ${m.ok ? 'pass' : '**FAIL**'} |`
      )
    );
  return rows.join('\n');
}
