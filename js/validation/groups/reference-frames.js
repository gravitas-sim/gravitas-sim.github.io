// Galilean invariance: boost the whole system and the internal motion must be
// untouched. This tests the integrator's frame handling, not a formula.

import { makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const dt = 0.05;
  const build = boost => {
    lab.reset();
    const a = makeStar(
      physics,
      { x: -80, y: 0 },
      { x: boost.x, y: boost.y - 2.5 },
      1000
    );
    const b = makeStar(
      physics,
      { x: 80, y: 0 },
      { x: boost.x, y: boost.y + 2.5 },
      1000
    );
    physics.stars.push(a, b);
    lab.commit();
    lab.step(dt, 6000);
    return hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
  };
  const rest = build({ x: 0, y: 0 });
  const moving = build({ x: 5, y: -3 });
  add({
    group: 'Reference frames',
    kind: 'integration',
    name: 'Galilean invariance: separation after a boost',
    measured: moving,
    expected: rest,
    unit: 'units',
    tolerance: 1e-10,
    why: 'Boosting every body by a constant velocity must leave the relative motion identical, because gravity depends only on separations. The tolerance is round-off: the two runs execute the same arithmetic on numbers that differ by a constant, so they agree to nearly full precision but not bit for bit.',
  });
}
