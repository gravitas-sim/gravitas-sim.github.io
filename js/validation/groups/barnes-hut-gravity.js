// =============================================================================
// Barnes-Hut gravity (Prompt 137)
// -----------------------------------------------------------------------------
// The application switches to the tree when the world is big enough, and the
// suite had never run it: the direct sum was the only gravity validated, and the
// tree's accuracy had been calibrated once, by hand, on one 78-body cluster
// (recorded in the comment above `physicsSettings` in js/engine/state.js).
//
// The tree lives in a Worker, which a deterministic suite cannot start, so the
// arithmetic was moved out of the Worker verbatim into js/engine/barnesHut.js
// (bitwise identical output, checked when it moved) and this group runs that
// function: the code the Worker runs, not a copy of it.
//
// The configurations are seeded, so every run measures the same three worlds.
// The tolerances are in js/validation/engineTolerances.js, which was committed
// before this file existed.
// =============================================================================

import { BARNES_HUT as TOL } from '../engineTolerances.js';
import { barnesHutAccel } from '../../engine/barnesHut.js';

const G = 2; // the application's constant; the tree is linear in it either way

/** A small seeded generator (mulberry32), so the worlds never change. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Plummer-like cluster: radius a, N bodies of mass 1 to 20. */
function plummer(n, a, seed) {
  const r = rng(seed);
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = 0.02 + 0.96 * r();
    const rad = a / Math.sqrt(u ** (-2 / 3) - 1);
    const th = 2 * Math.PI * r();
    x[i] = rad * Math.cos(th);
    y[i] = rad * Math.sin(th);
    m[i] = 1 + 19 * r();
  }
  return { x, y, m };
}

/** Two clumps of n/2 bodies, 600 units apart. */
function twoClumps(n, seed) {
  const r = rng(seed);
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const side = i < n / 2 ? -300 : 300;
    const rad = 60 * Math.sqrt(r());
    const th = 2 * Math.PI * r();
    x[i] = side + rad * Math.cos(th);
    y[i] = rad * Math.sin(th);
    m[i] = 1 + 19 * r();
  }
  return { x, y, m };
}

/** A uniform disc of light bodies about one body fifty times heavier. */
function discAndCentre(n, seed) {
  const r = rng(seed);
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const m = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const rad = 20 + 380 * Math.sqrt(r());
    const th = 2 * Math.PI * r();
    x[i] = rad * Math.cos(th);
    y[i] = rad * Math.sin(th);
    m[i] = 1 + 4 * r();
  }
  m[0] = 500;
  return { x, y, m };
}

/** The direct sum on exactly the single-precision inputs the tree is given. */
function direct(w, minDistSq = 0) {
  const n = w.x.length;
  const ax = new Float64Array(n);
  const ay = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = w.x[j] - w.x[i];
      const dy = w.y[j] - w.y[i];
      let d2 = dx * dx + dy * dy;
      if (d2 < minDistSq) d2 = minDistSq;
      const d = Math.sqrt(d2);
      const f = (G * w.m[j]) / d2;
      ax[i] += (f * dx) / d;
      ay[i] += (f * dy) / d;
    }
  }
  return { ax, ay };
}

/** The tree on the same world, every body a target of its own source. */
function tree(w, theta, minDistSq = 0) {
  const n = w.x.length;
  const self = Int32Array.from({ length: n }, (_, i) => i);
  return barnesHutAccel(w.x, w.y, w.m, w.x, w.y, self, theta, G, minDistSq);
}

/** Per-body relative force error of the tree against the direct sum. */
function errors(w, theta) {
  const d = direct(w);
  const t = tree(w, theta);
  return Array.from(
    w.x,
    (_, i) =>
      Math.hypot(t.ax[i] - d.ax[i], t.ay[i] - d.ay[i]) /
      Math.hypot(d.ax[i], d.ay[i])
  );
}

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

/**
 * Energy drift of `steps` steps of symplectic Euler (the engine's default
 * scheme: kick with the acceleration at the current positions, then drift),
 * with the accelerations from `accel`. Total energy is the direct pair sum in
 * double precision whichever force drove the run.
 */
function drift(w0, accel, steps, dt, minDistSq) {
  const n = w0.x.length;
  const x = Float64Array.from(w0.x);
  const y = Float64Array.from(w0.y);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const energy = () => {
    let e = 0;
    for (let i = 0; i < n; i++) {
      e += 0.5 * w0.m[i] * (vx[i] ** 2 + vy[i] ** 2);
      for (let j = i + 1; j < n; j++) {
        const d2 = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
        const r0 = Math.sqrt(minDistSq);
        // Inside the clamp the force is linear in r, so its potential is
        // G m (r^2 - 3 r0^2) / (2 r0^3): the energy the force conserves.
        e +=
          d2 >= minDistSq
            ? -(G * w0.m[i] * w0.m[j]) / Math.sqrt(d2)
            : (G * w0.m[i] * w0.m[j] * (d2 - 3 * minDistSq)) / (2 * r0 ** 3);
      }
    }
    return e;
  };
  const e0 = energy();
  for (let s = 0; s < steps; s++) {
    const a = accel({
      x: Float32Array.from(x),
      y: Float32Array.from(y),
      m: w0.m,
    });
    for (let i = 0; i < n; i++) {
      vx[i] += a.ax[i] * dt;
      vy[i] += a.ay[i] * dt;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }
  }
  return Math.abs((energy() - e0) / e0);
}

/**
 * Run this group's checks.
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Barnes-Hut gravity';
  const worlds = [
    ['a Plummer-like cluster', plummer(160, 100, 11)],
    ['two clumps', twoClumps(160, 12)],
    ['a disc about a heavy centre', discAndCentre(160, 13)],
  ];
  const at = Object.fromEntries(
    worlds.map(([name, w]) => [name, errors(w, TOL.theta)])
  );
  const all = Object.values(at).flat();

  add({
    group: GROUP,
    kind: 'approximation',
    name: 'Mean force error at the application opening angle, three seeded worlds',
    measured: mean(all),
    expected: 0,
    unit: 'relative',
    tolerance: TOL.meanForceError,
    toleranceKind: 'absolute',
    why: 'The tree is an approximation of the direct sum, so the measure is how far it is from it: the mean over 480 bodies of |a_tree - a_direct| / |a_direct| at theta = 0.4, in a cluster, two clumps and a disc about a heavy centre. One percent is the ceiling Barnes & Hut (1986) and Hernquist (1987) give for a monopole tree at theta near 1; the error falls steeply with theta, so this is far looser than the method needs, and set before the first measurement.',
    source:
      'Barnes & Hut (1986), Nature 324, 446; Hernquist (1987), ApJS 64, 715',
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: 'Worst single-body force error at the application opening angle',
    measured: Math.max(...all),
    expected: TOL.maxForceError,
    unit: 'relative',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'A bound, not a claim: the error of a monopole tree has a heavy tail, concentrated in bodies where the true acceleration is small by cancellation (Salmon & Warren 1994). Ten percent is the largest error the literature treats as ordinary for one body; the mean above is the figure to read, this is the guard against a tail that has grown.',
    source: 'Salmon & Warren (1994), J. Comput. Phys. 111, 136',
  });

  // Theta orders the error: a smaller angle opens more cells.
  const bigger = Object.fromEntries(
    [0.2, 0.4, 0.7].map(t => [t, mean(worlds.flatMap(([, w]) => errors(w, t)))])
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The error falls with the opening angle (theta 0.7 > 0.4 > 0.2)',
    measured: bigger[0.7] > bigger[0.4] && bigger[0.4] > bigger[0.2],
    expected: true,
    why: 'Opening more cells can only replace a cell by its parts, so the mean error must fall as theta falls. A tree whose error does not order with theta is not using theta.',
  });

  const exactOpen = mean(worlds.flatMap(([, w]) => errors(w, 0)));
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Opening angle zero is the direct sum, to single precision',
    measured: exactOpen,
    expected: 0,
    unit: 'relative',
    tolerance: TOL.zeroThetaError,
    toleranceKind: 'absolute',
    why: "At theta = 0 no cell is ever far enough to stand in for its parts, so the tree sums every pair. It differs from the double-precision sum only by the Worker's single-precision positions and outputs: 6e-8 relative on positions of a few hundred units against separations of tens, a few parts in 1e6 of force. The tolerance is two orders over that, no more.",
  });

  // Reciprocity: the tree breaks Newton's third law.
  const net = worlds.map(([, w]) => {
    const t = tree(w, TOL.theta);
    let fx = 0;
    let fy = 0;
    let scale = 0;
    for (let i = 0; i < w.x.length; i++) {
      fx += w.m[i] * t.ax[i];
      fy += w.m[i] * t.ay[i];
      scale += w.m[i] * Math.hypot(t.ax[i], t.ay[i]);
    }
    return Math.hypot(fx, fy) / scale;
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: 'Net force on a closed system, as a fraction of the force magnitudes',
    measured: Math.max(...net),
    expected: TOL.netForceFraction,
    unit: 'fraction',
    tolerance: 0,
    toleranceKind: 'bound',
    why: "The direct sum is reciprocal, so the net force on an isolated system is zero to round-off. The tree is not: a cell pulls a body that the body does not pull back with the same term. How far from zero is the tree's momentum non-conservation, bounded by the same one percent as its force error (Springel 2005 accepts error tolerances of 0.005 to 0.01 for this reason).",
    source: 'Springel (2005), MNRAS 364, 1105',
  });

  // Energy: one integrator, two force providers.
  const STEPS = 400;
  const DT = 0.05;
  const SOFT2 = 25;
  const w = plummer(100, 100, 21);
  const dDirect = drift(w, c => direct(c, SOFT2), STEPS, DT, SOFT2);
  const dTree = drift(w, c => tree(c, TOL.theta, SOFT2), STEPS, DT, SOFT2);
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Energy drift over 400 steps driven by the tree',
    measured: dTree,
    expected: TOL.energyDrift,
    unit: 'fraction',
    tolerance: 0,
    toleranceKind: 'bound',
    why: "Symplectic Euler at dt = 0.05 for 400 steps of a 100-body cluster (about two thirds of a dynamical time), with the accelerations from the tree at theta = 0.4 and the energy summed directly in double precision. One percent is the same tolerance as the force error that causes the drift, and the scheme's own drift at this step is far below it (the direct-sum run, next).",
    source: 'Springel (2005), MNRAS 364, 1105',
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: "Energy drift of the tree run against the direct sum's, same integrator",
    measured: Math.abs(dTree - dDirect),
    expected: TOL.energyDrift,
    unit: 'fraction',
    tolerance: 0,
    toleranceKind: 'bound',
    why: "The same steps, the same cluster, the same scheme, with the force from the direct sum instead: the difference isolates what the tree's force error costs in energy, with the integrator's own error common to both runs and removed.",
    source: 'Springel (2005), MNRAS 364, 1105',
  });
}
