// Energy error must be first order in the timestep. This is the check that
// says the tolerances above are physics rather than luck.

import { makeTracer, makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const G = 1;
  const M = 1000;
  const a = 120;
  const e = 0.4;
  const errors = [];
  for (const dt of [0.08, 0.04, 0.02]) {
    lab.reset({ min_interaction_distance: 1e-6 });
    const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
    const rApo = a * (1 + e);
    const vApo = Math.sqrt(((G * M) / a) * ((1 - e) / (1 + e)));
    const p = makeTracer(physics, { x: rApo, y: 0 }, { x: 0, y: vApo });
    physics.stars.push(s);
    physics.planets.push(p);
    lab.commit();

    const specific = () => {
      const r = hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y);
      return 0.5 * (p.vel.x ** 2 + p.vel.y ** 2) - (G * M) / r;
    };
    const E0 = specific();
    const per = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
    let worst = 0;
    lab.step(dt, Math.round((5 * per) / dt), () => {
      worst = Math.max(worst, Math.abs(specific() - E0) / Math.abs(E0));
    });
    errors.push(worst);
  }
  // Halving the step should halve the error for a first-order method.
  const ratio = (errors[0] / errors[1] + errors[1] / errors[2]) / 2;
  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'Energy error halves when the timestep halves',
    measured: ratio,
    expected: 2,
    unit: 'error ratio per halving',
    tolerance: 0.2,
    why: 'The convergence order of the scheme, measured. Symplectic Euler is first order, so the ratio must be 2. Getting this right is what licenses every other integration tolerance in this file to be quoted as "O(dt) at dt = 0.1": if the observed order were wrong, those numbers would be fitted rather than derived. A tolerance of 0.2 on the ratio distinguishes first order (2) from second order (4) with enormous margin.',
  });
}
