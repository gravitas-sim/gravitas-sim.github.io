// ===========================================================================
// 14. Mergers
// ===========================================================================

import { makeStar, hypot, momentum } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  lab.reset({ enable_star_merging: true });
  const a = makeStar(physics, { x: -3, y: 0 }, { x: 2.5, y: -1 }, 1200);
  const b = makeStar(physics, { x: 3, y: 0 }, { x: -0.5, y: 3 }, 400);
  a.radius = 6;
  b.radius = 6;
  physics.stars.push(a, b);
  lab.commit();

  const pBefore = momentum([a, b]);
  const mBefore = a.mass + b.mass;
  physics.handle_star_merging(physics.stars);
  const survivors = physics.stars.filter(s => s.alive);
  const pAfter = momentum(survivors);
  const mAfter = survivors.reduce((s, x) => s + x.mass, 0);

  add({
    group: 'Mergers',
    kind: 'integration',
    name: 'A merger conserves linear momentum',
    measured:
      hypot(pAfter.x - pBefore.x, pAfter.y - pBefore.y) /
      hypot(pBefore.x, pBefore.y),
    expected: 0,
    unit: 'relative',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'A perfectly inelastic collision: the product carries the mass-weighted mean velocity, so momentum is conserved exactly and kinetic energy is not. That is the model, and it is stated as such on the model page.',
  });

  add({
    group: 'Mergers',
    kind: 'approximation',
    name: 'A merger conserves mass exactly',
    measured: mAfter,
    expected: mBefore,
    unit: 'mass units',
    tolerance: 1e-12,
    why: 'Labeled an approximation because it is one, and in the direction the model page already declares: a real compact-object merger radiates several percent of the total mass away as gravitational waves. Gravitas radiates none. The check is that the code does what the documentation says it does.',
  });

  add({
    group: 'Mergers',
    kind: 'integration',
    name: 'Two stars merge into one',
    measured: survivors.length,
    expected: 1,
    unit: 'bodies',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'A guard on the two checks above: they compare momentum and mass before and after a merger, and would both pass trivially if no merger had happened.',
  });
}
