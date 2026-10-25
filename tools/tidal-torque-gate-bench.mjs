#!/usr/bin/env node
// G8 of the tidal-torque gate: the cost of computeAccelerations at 50 bodies.
//   node tools/tidal-torque-gate-bench.mjs [calls]   prints nanoseconds per call
// Run from the base checkout and from the spike, interleaved, by the caller.
import * as physics from '../js/physics.js';
import {
  computeAccelerations,
  cachedMajorSources,
} from '../js/engine/forces.js';

const calls = Number(process.argv[2] || 20000);
physics.updatePhysicsSettings({
  gravitational_constant: 1,
  mutual_gravity: true,
});
const bodies = [];
for (let i = 0; i < 50; i++) {
  const p = new physics.Planet(
    { x: 100 * Math.cos(i), y: 100 * Math.sin(i) * (1 + i / 50) },
    { x: 0, y: 0 }
  );
  p.mass = 1 + (i % 7);
  bodies.push(p);
  cachedMajorSources.push(p);
}
const ax = new Float64Array(50);
const ay = new Float64Array(50);
for (let i = 0; i < 2000; i++)
  computeAccelerations(bodies, 50, null, false, ax, ay);
const t0 = process.hrtime.bigint();
for (let i = 0; i < calls; i++)
  computeAccelerations(bodies, 50, null, false, ax, ay);
const t1 = process.hrtime.bigint();
process.stdout.write(`${Number(t1 - t0) / calls}\n`);
