// ===========================================================================
// 2. Circular two-body orbit, integrated
// ===========================================================================

import { makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, orbital, add, lab }) {
  const G = 1;
  const M = 1000; // one solar mass
  const m = 0.003; // roughly one Earth mass
  const r = 100; // one AU
  const dt = 0.1; // the application's own DT

  lab.reset();
  const star = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
  const planet = new physics.Planet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
  planet.mass = m;
  planet.radius = 1;
  // Circular about the barycenter of the pair, not about the star: with a
  // finite secondary the star moves too, and an initial condition that
  // ignored that would start the orbit slightly eccentric.
  const vRel = Math.sqrt((G * (M + m)) / r);
  star.vel.y = (-vRel * m) / (M + m);
  planet.vel.y = (vRel * M) / (M + m);
  // Put the pair's barycenter at rest at the origin.
  const bx = (star.pos.x * M + planet.pos.x * m) / (M + m);
  star.pos.x -= bx;
  planet.pos.x -= bx;

  physics.stars.push(star);
  physics.planets.push(planet);
  lab.commit();

  const analyticPeriod = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (M + m)));
  const orbits = 20;
  const steps = Math.round((orbits * analyticPeriod) / dt);

  const timer = orbital.createPeriodTimer();
  let minR = Infinity;
  let maxR = -Infinity;
  let t = 0;
  let maxBary = 0;
  lab.step(dt, steps, () => {
    t += dt;
    const sep = hypot(planet.pos.x - star.pos.x, planet.pos.y - star.pos.y);
    minR = Math.min(minR, sep);
    maxR = Math.max(maxR, sep);
    timer.sample(sep, t);
    maxBary = Math.max(
      maxBary,
      hypot(
        (star.pos.x * M + planet.pos.x * m) / (M + m),
        (star.pos.y * M + planet.pos.y * m) / (M + m)
      )
    );
  });

  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Radial excursion equals the predicted discretization error',
    measured: (maxR - minR) / r,
    // Symplectic Euler drifts the position with the post-kick velocity, so a
    // circular orbit's radius wobbles by exactly one drift step: v*dt/r,
    // which is 2*pi*dt/P.
    expected: (2 * Math.PI * dt) / analyticPeriod,
    unit: 'fractional range',
    tolerance: 1e-2,
    why: 'Not "the radius is roughly constant" but "the radius wobbles by exactly the amount the scheme predicts". Symplectic Euler drifts with the post-kick velocity, so the radius oscillates by one drift step, v*dt/r = 2*pi*dt/P = 3.16e-3 here. Measuring against that rather than against zero turns a loose bound into a statement about the integrator, and it is why this check would fail if the scheme were quietly changed. The error is bounded, not accumulating: 20 orbits and 200 give the same figure.',
  });

  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Measured period matches 2*pi*sqrt(a^3/mu)',
    measured: timer.mean(),
    expected: analyticPeriod,
    unit: 'time units',
    tolerance: 2e-3,
    why: 'Periapsis timing has a resolution of one timestep, dt/P = 5e-4, and symplectic Euler shifts the mean motion by O(dt^2/P^2). 0.2% is a few times the timing resolution and would not hide a wrong mu.',
  });

  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Number of periapsis passages timed',
    measured: timer.count(),
    expected: orbits - 1,
    unit: 'orbits',
    tolerance: 1,
    toleranceKind: 'absolute',
    why: 'The timer needs one passage to start its clock, so it closes one fewer period than the number of orbits run. Allowing +/-1 covers the phase the run happens to end on.',
  });

  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Barycenter of an isolated pair stays put',
    measured: maxBary / r,
    expected: 0,
    unit: 'fraction of separation',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'With no external force and equal-and-opposite internal ones, the barycenter of an isolated pair started at rest cannot move at all. This is exact arithmetic, not an approximation, so the tolerance is floating-point round-off. Before the integrator was changed to compute all accelerations before moving anything, this failed outright.',
  });

  const elements = orbital.orbitalElements(planet, star, G);
  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Recovered eccentricity of a circular orbit',
    measured: elements.e,
    expected: 0,
    unit: '',
    tolerance: 3e-3,
    toleranceKind: 'absolute',
    why: 'The same spurious eccentricity the radius check measures, read out through the orbital-elements solver instead of by watching the separation. Two independent routes to the same number.',
  });

  add({
    group: 'Circular two-body orbit',
    kind: 'integration',
    name: 'Orbit is still bound after 20 orbits',
    measured: elements.bound,
    expected: true,
    why: 'Specific orbital energy must stay negative. A sign flip here is the failure mode that used to send TRAPPIST-1 planets out of the system.',
  });
}
