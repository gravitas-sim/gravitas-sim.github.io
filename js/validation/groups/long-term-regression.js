// =============================================================================
// Long-term energy drift, a regression check (Prompt 137)
// -----------------------------------------------------------------------------
// This is not validation. Nothing here compares the engine with a truth: a
// chaotic three-body system has no closed-form energy history to compare with,
// and the drift of a fixed-step integrator through close encounters is a
// property of the scheme, not an error against nature. What the group does is
// record, once, how the engine behaves on a seeded sample of the problem, and
// fail when a later change makes it worse, so an integrator edit that quietly
// raises the drift is seen the day it lands.
//
// The sample: 50 seeded three-body systems. Each is Lagrange's equilateral
// triangle of three 6-solar-mass stars (the Three-Body Sensitivity Lab's world,
// unstable by Gascheau's criterion) with every coordinate and velocity
// component nudged by up to 1% of its scale, the nudges drawn from the seed
// with + - * / only so the worlds are bit-identical on every platform. Each is
// run for 1000 steps of 0.05 s (50 simulated seconds, about two rotations of
// the unperturbed triangle) with the engine's own integrator and the
// application's G. The statistic is the relative energy drift
// |E_end - E_start| / |E_start|, summarized by its median and its 90th
// percentile over the seeds, because one seed's value is dominated by whether
// that seed had a close encounter: by 50 s the worst tenth of the seeds have
// drifted by tens of percent, the fixed step no longer resolving their
// encounter, while the median seed has drifted by about six parts in a
// thousand. The heavy tail is the engine's: a
// fixed step through a close encounter, which the model page says plainly.
//
// A change of 1e-13 in the initial positions leaves both statistics
// unchanged to three digits, so last-bit differences between platforms do not
// move them.
//
// The recorded values are the medians and percentiles measured when this file
// was written; the bound is the recording times REGRESSION.margin (1.25, in
// js/validation/engineTolerances.js, committed before the first measurement).
// The bound is one-sided: a drift that falls is not a failure. Re-record by
// running `node tools/validate-physics.mjs` after a deliberate change and
// updating RECORDED with the new values and the date in the same commit.
// =============================================================================

import { REGRESSION } from '../engineTolerances.js';
import { mulberry32 } from '../../rng.js';

const G = 2; // the application's gravitational constant
const STEPS = 1000;
const DT = 0.05;
const PERTURB = 0.01;

/** Recorded 2026-10-19 on the engine at the commit that added this group. */
export const RECORDED = Object.freeze({ median: 6.15e-3, p90: 4.79e-1 });

/**
 * The relative energy drift of one seeded system.
 *
 * @param {object} physics - The js/physics.js namespace
 * @param {object} lab - The harness lab
 * @param {number} seed - Seed of the initial conditions
 * @returns {number} |E_end - E_start| / |E_start|
 */
export function drift(physics, lab, seed) {
  const rand = mulberry32(seed);
  const MASS = 6 * physics.SOLAR_MASS_UNIT;
  const R = 50;
  const SIDE = R * Math.sqrt(3);
  const OMEGA = Math.sqrt((G * 3 * MASS) / SIDE ** 3);
  // Lagrange's equilateral triangle, the Three-Body Sensitivity Lab's world,
  // with every coordinate and velocity component nudged by up to PERTURB of
  // its scale. The unperturbed triangle has no randomness to seed; the nudge
  // is what the seeds are, and the triangle is unstable (Gascheau), so the
  // sample spans orbits that stay regular and orbits that scatter.
  const pos = [];
  const vel = [];
  for (let i = 0; i < 3; i++) {
    const c = [1, -0.5, -0.5][i];
    const sn = [0, 0.8660254037844386, -0.8660254037844386][i];
    const x = R * c;
    const y = R * sn;
    pos.push({
      x: x + R * PERTURB * (2 * rand() - 1),
      y: y + R * PERTURB * (2 * rand() - 1),
    });
    vel.push({
      x: -OMEGA * y + OMEGA * R * PERTURB * (2 * rand() - 1),
      y: OMEGA * x + OMEGA * R * PERTURB * (2 * rand() - 1),
    });
  }

  lab.reset({
    gravitational_constant: G,
    mutual_gravity: true,
    star_only_gravity: false,
    enable_star_merging: false,
  });
  physics.resetSimulationTime();
  for (let i = 0; i < 3; i++) {
    const star = new physics.StarObject({ ...pos[i] }, { ...vel[i] }, 1);
    star.mass = MASS;
    star.radius = 8;
    star.persistent = true;
    physics.stars.push(star);
  }
  lab.commit();
  const before = physics.conservedQuantities();
  for (let k = 0; k < STEPS; k++) physics.updatePhysics(DT);
  const after = physics.conservedQuantities();
  return Math.abs((after.energy - before.energy) / before.energy);
}

/** The q-quantile of a sample, by linear interpolation. */
const quantile = (sorted, q) => {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
};

/**
 * The distribution over the seeds.
 *
 * @param {object} physics - The js/physics.js namespace
 * @param {object} lab - The harness lab
 * @returns {{median: number, p90: number, all: number[]}} Summary
 */
export function distribution(physics, lab) {
  const all = Array.from({ length: REGRESSION.seeds }, (_, k) =>
    drift(physics, lab, 1000 + k)
  );
  const sorted = [...all].sort((a, b) => a - b);
  return { median: quantile(sorted, 0.5), p90: quantile(sorted, 0.9), all };
}

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const GROUP = 'Long-term regression';
  const d = distribution(physics, lab);
  const why = what =>
    `A regression check, not validation: ${what} of the relative energy drift over ${REGRESSION.seeds} seeded three-body systems (1000 steps of 0.05 s from a perturbed Lagrange triangle, the engine's integrator, G = 2). The bound is the value recorded when the group was written times ${REGRESSION.margin}; a drift that falls is not a failure, one that rises is a change to look at. A chaotic system has no analytic energy history to be validated against, so this says only that the engine has not got worse.`;
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Median energy drift over 50 seeded three-body systems does not rise',
    measured: d.median,
    expected: RECORDED.median * REGRESSION.margin,
    unit: 'fraction',
    tolerance: 0,
    toleranceKind: 'bound',
    why: why('the median'),
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: '90th-percentile energy drift over 50 seeded three-body systems does not rise',
    measured: d.p90,
    expected: RECORDED.p90 * REGRESSION.margin,
    unit: 'fraction',
    tolerance: 0,
    toleranceKind: 'bound',
    why: why('the 90th percentile'),
  });
}
