// ===========================================================================
// 4. Conservation laws
// ===========================================================================

import {
  makeStar,
  hypot,
  momentum,
  angularMomentum,
  totalEnergy,
} from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const G = 1;
  const dt = 0.1;

  // A three-body system with unequal masses and a net drift, so nothing is
  // conserved by symmetry: if momentum comes out constant here it is because
  // the force law pairs correctly, not because the initial condition was
  // chosen kindly.
  lab.reset();
  const drift = { x: 0.7, y: -0.4 };
  const bodies = [
    makeStar(
      physics,
      { x: -120, y: 0 },
      { x: drift.x, y: drift.y - 2.0 },
      1400
    ),
    makeStar(
      physics,
      { x: 180, y: 40 },
      { x: drift.x - 0.3, y: drift.y + 1.6 },
      900
    ),
    makeStar(
      physics,
      { x: 20, y: -220 },
      { x: drift.x + 1.1, y: drift.y + 0.2 },
      500
    ),
  ];
  for (const b of bodies) physics.stars.push(b);
  lab.commit();

  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  const p0 = momentum(bodies);
  const com0 = {
    x: bodies.reduce((s, b) => s + b.mass * b.pos.x, 0) / totalMass,
    y: bodies.reduce((s, b) => s + b.mass * b.pos.y, 0) / totalMass,
  };
  const L0 = angularMomentum(bodies, com0);
  const E0 = totalEnergy(bodies, G);
  const pScale = bodies.reduce(
    (s, b) => s + b.mass * hypot(b.vel.x, b.vel.y),
    0
  );

  let maxMomentumError = 0;
  let closestApproach = Infinity;
  const steps = 40000;
  lab.step(dt, steps, () => {
    const p = momentum(bodies);
    maxMomentumError = Math.max(
      maxMomentumError,
      hypot(p.x - p0.x, p.y - p0.y) / pScale
    );
    for (let i2 = 0; i2 < bodies.length; i2++) {
      for (let j2 = i2 + 1; j2 < bodies.length; j2++) {
        closestApproach = Math.min(
          closestApproach,
          hypot(
            bodies[i2].pos.x - bodies[j2].pos.x,
            bodies[i2].pos.y - bodies[j2].pos.y
          )
        );
      }
    }
  });
  void L0;
  void E0;
  void com0;

  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'Linear momentum, three unequal masses, 40000 steps',
    measured: maxMomentumError,
    expected: 0,
    unit: 'fraction of total |p|',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'Not an approximation: the accelerations are computed pairwise from one snapshot of the positions, so the internal forces sum to zero identically and momentum is conserved to round-off no matter how inaccurate the trajectories are. That is what makes a chaotic three-body run with close encounters the *hardest* available test of the force pairing rather than an unfair one - the orbits here are wrong in detail and the momentum is still exact. The tolerance is floating point, and it is deliberately this tight because a loose one would have hidden a real bug: advancing bodies one at a time broke the pairing and let momentum drift by 1e-3 over this same run.',
  });

  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'The three-body run really does have close encounters',
    measured: closestApproach < 30,
    expected: true,
    why: 'A guard on the check above. Momentum conservation is only an interesting test if the configuration actually stresses the solver; if this system quietly settled into three well-separated circles the momentum result would be worth much less. The bodies start 200 to 300 units apart and pass within 30.',
  });
}
