// ===========================================================================
// Numerical integrators
// ---------------------------------------------------------------------------
// Three schemes are selectable, and each one makes a different promise. These
// checks are what turn those promises into measurements, on physically
// meaningful problems rather than on cases fitted to the implementations: a
// bound eccentric Kepler orbit run for whole numbers of periods, which is the
// problem the application is actually integrating.
//
// The promises:
//
//   Symplectic Euler   first order, symplectic. Energy error bounded and
//                      oscillating, not accumulating. The default, and the
//                      scheme every shipped scenario was tuned against.
//   Velocity Verlet    second order, symplectic. Same bounded behavior, with
//                      a bound smaller by a factor of the timestep.
//   RK4                fourth order, NOT symplectic. Far more accurate over a
//                      few orbits, and losing energy steadily over many,
//                      because nothing holds it to a nearby Hamiltonian. That
//                      contrast is the reason the setting exists.
// ===========================================================================

import {
  makeTracer,
  makeStar,
  hypot,
  centerOf,
  angularMomentum,
} from '../harness.js';

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
  const period = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));

  /**
   * Integrate one eccentric orbit under a named scheme.
   *
   * The step count is exact rather than rounded, because the whole
   * measurement is a position at a fixed time: rounding the count leaves a
   * fraction of a step of error, which at these speeds is larger than
   * anything the schemes differ by and would make all three look identical.
   *
   * @param {string} scheme - Integrator label
   * @param {number} steps - Steps to take
   * @param {number} T - Physical time to cover
   * @returns {{pos: object, worstEnergy: number, worstAngular: number}} Result
   */
  const integrate = (scheme, steps, T) => {
    lab.reset({ integrator: scheme });
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
    // The pair's angular momentum about its own center of mass, which is the
    // quantity that is actually conserved. The tracer's angular momentum
    // about the origin is not: it pulls back on the primary hard enough to
    // move it, and a fixed origin then drifts away from the center of mass.
    const angular = () => angularMomentum([s, p], centerOf([s, p]));
    const E0 = specific();
    const L0 = angular();
    let worstEnergy = 0;
    let worstAngular = 0;
    const dt = T / steps;
    for (let i = 0; i < steps; i++) {
      physics.updatePhysics(dt);
      worstEnergy = Math.max(
        worstEnergy,
        Math.abs(specific() - E0) / Math.abs(E0)
      );
      worstAngular = Math.max(
        worstAngular,
        Math.abs(angular() - L0) / Math.abs(L0)
      );
    }
    return { pos: { x: p.pos.x, y: p.pos.y }, worstEnergy, worstAngular };
  };

  // The default must be the default. This is the check that would fail if a
  // refactor ever quietly promoted one of the more accurate schemes: the
  // scenarios are laid out against symplectic Euler's particular error and
  // several of them cap their timestep because of it.
  lab.reset();
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Symplectic Euler is the default scheme',
    measured: physics.activeIntegrator(),
    expected: 'Symplectic Euler',
    unit: 'scheme',
    why: 'The three schemes give measurably different trajectories, and every shipped scenario was laid out, timed and tuned against this one. Changing the default would change the dynamics of the whole catalog at once, silently, and this is the only place that would notice.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'analytic',
    name: 'An unrecognized scheme falls back to the default',
    measured: (() => {
      lab.reset({ integrator: 'Ludicrous Speed' });
      const got = physics.activeIntegrator();
      lab.reset();
      return got;
    })(),
    expected: 'Symplectic Euler',
    unit: 'scheme',
    why: 'A shared link or a saved scenario naming a scheme that no longer exists has to load into the default rather than into a broken simulation, so the selector resolves anything it does not recognize rather than throwing.',
  });

  // Convergence order, measured as the global position error at a fixed
  // physical time against a reference fine enough to be exact at this
  // precision. Measured at 1.37 periods rather than at a whole number of
  // them: sampled at the same orbital phase, symplectic Euler is conjugate to
  // leapfrog through a half-step shift and reports second order, which is a
  // true statement about that particular sample and not the order of the
  // scheme.
  const T = 1.37 * period;
  const reference = integrate('RK4', 65536, T).pos;
  const orderOf = (scheme, steps) => {
    const errs = steps.map(n => {
      const r = integrate(scheme, n, T).pos;
      return hypot(r.x - reference.x, r.y - reference.y);
    });
    const orders = [];
    for (let i = 0; i < errs.length - 1; i++) {
      orders.push(Math.log2(errs[i] / errs[i + 1]));
    }
    return {
      order: orders.reduce((x, y) => x + y, 0) / orders.length,
      errors: errs,
    };
  };

  const euler = orderOf('Symplectic Euler', [2048, 4096, 8192, 16384]);
  const verlet = orderOf('Velocity Verlet', [2048, 4096, 8192, 16384]);
  // Coarser steps for RK4, and deliberately so: at the step counts the other
  // two need, RK4's error is already down at double-precision round-off and
  // the measured order becomes a measurement of the floating-point noise.
  const rk4 = orderOf('RK4', [512, 1024, 2048, 4096]);

  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Symplectic Euler converges at first order',
    measured: euler.order,
    expected: 1,
    unit: 'order in dt',
    tolerance: 0.15,
    toleranceKind: 'absolute',
    why: 'Position error against a converged reference, halving the step three times. First order means the error halves with the step, which is a doubling per halving and so an order of 1. The tolerance separates 1 from 2 with a factor of six of margin.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Velocity Verlet converges at second order',
    measured: verlet.order,
    expected: 2,
    unit: 'order in dt',
    tolerance: 0.15,
    toleranceKind: 'absolute',
    why: 'The same measurement on the same orbit. Second order is the defining property of the scheme, and it is what buys the accuracy in the check below: at a given step Verlet is about a hundred times more accurate than the default here, which is roughly the timestep expressed as a fraction of an orbit.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'RK4 converges at fourth order',
    measured: rk4.order,
    expected: 4,
    unit: 'order in dt',
    tolerance: 0.6,
    toleranceKind: 'absolute',
    why: 'Fourth order, approached from above: on an eccentric orbit the higher terms in the local error are still contributing at the coarse steps this has to be measured at, so the observed order runs a little over 4 and falls toward it as the step shrinks. The tolerance is wide enough for that and nowhere near wide enough to admit a third-order or fifth-order scheme.',
  });

  // Accuracy at a common timestep. The orders above say how each scheme
  // improves; this says what that is worth on the same problem, which is the
  // thing a student changing the setting actually sees.
  const common = 4096;
  const errEuler = hypot(
    integrate('Symplectic Euler', common, T).pos.x - reference.x,
    integrate('Symplectic Euler', common, T).pos.y - reference.y
  );
  const errVerlet = hypot(
    integrate('Velocity Verlet', common, T).pos.x - reference.x,
    integrate('Velocity Verlet', common, T).pos.y - reference.y
  );
  const errRk4 = hypot(
    integrate('RK4', common, T).pos.x - reference.x,
    integrate('RK4', common, T).pos.y - reference.y
  );

  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Velocity Verlet beats symplectic Euler at the same timestep',
    measured: Math.log10(errEuler / errVerlet),
    expected: 2.4,
    unit: 'orders of magnitude',
    tolerance: 0.5,
    toleranceKind: 'absolute',
    why: 'Two schemes differing only in order have to differ in accuracy by about one power of the number of steps per orbit for each order of difference. At roughly 3000 steps per orbit that is two and a half decades, and measuring it is what shows the two implementations are genuinely different schemes rather than the same loop behind two labels.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'RK4 beats Velocity Verlet at the same timestep',
    measured: Math.log10(errVerlet / errRk4),
    expected: 4.8,
    unit: 'orders of magnitude',
    tolerance: 1.2,
    toleranceKind: 'absolute',
    why: 'The same argument two orders further along, and the reason the tolerance is wider: RK4 at this step is close enough to round-off that the ratio is partly a measurement of the reference. The claim being checked is that the gap is several decades, not that it is exactly this many.',
  });

  // Bounded versus secular. The single most important distinction between the
  // schemes, and the one a numerical-methods investigation is for.
  const orbits = n => {
    // A step small enough that each scheme is well inside its asymptotic
    // regime, and coarse enough for RK4 that its drift is above round-off.
    const runFor = (scheme, count, steps) =>
      integrate(scheme, steps * count, count * period).worstEnergy;
    return runFor(n.scheme, n.count, n.stepsPerOrbit);
  };
  const eulerShort = orbits({
    scheme: 'Symplectic Euler',
    count: 6,
    stepsPerOrbit: 2600,
  });
  const eulerLong = orbits({
    scheme: 'Symplectic Euler',
    count: 60,
    stepsPerOrbit: 2600,
  });
  const verletShort = orbits({
    scheme: 'Velocity Verlet',
    count: 6,
    stepsPerOrbit: 2600,
  });
  const verletLong = orbits({
    scheme: 'Velocity Verlet',
    count: 60,
    stepsPerOrbit: 2600,
  });
  const rkShort = orbits({ scheme: 'RK4', count: 6, stepsPerOrbit: 220 });
  const rkLong = orbits({ scheme: 'RK4', count: 60, stepsPerOrbit: 220 });

  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Symplectic Euler: energy error is bounded, not secular',
    measured: eulerLong / eulerShort,
    expected: 1,
    unit: 'ratio of worst errors, 60 orbits to 6',
    tolerance: 0.05,
    why: 'The defining property of a symplectic scheme, and the reason the default is a first-order method rather than an embarrassment: its energy error oscillates about a fixed value instead of accumulating, so an orbit left running overnight is still the orbit it started as. Ten times the run length must give the same worst error, not ten times as much.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Velocity Verlet: energy error is bounded, not secular',
    measured: verletLong / verletShort,
    expected: 1,
    unit: 'ratio of worst errors, 60 orbits to 6',
    tolerance: 0.05,
    why: 'Verlet is symplectic too, so it makes the same promise as the default and keeps it for the same reason. What it buys over the default is the size of the bound, not its existence.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'RK4: energy error accumulates with run length',
    measured: rkLong / rkShort,
    expected: 10,
    unit: 'ratio of worst errors, 60 orbits to 6',
    tolerance: 0.25,
    why: 'The other half of the investigation, and the reason the most accurate scheme in the list is not the default. RK4 is not symplectic: its energy error grows linearly with the number of steps rather than oscillating, so ten times the run gives ten times the error. Over a few orbits it is by far the most accurate of the three; over a few thousand it is the only one that is still getting worse.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'Velocity Verlet conserves angular momentum to round-off',
    measured: integrate('Velocity Verlet', 6000, 2 * period).worstAngular,
    expected: 0,
    unit: 'relative',
    tolerance: 1e-11,
    toleranceKind: 'absolute',
    why: 'Like the default, and for the same reason: every kick is along the line joining the bodies, so the torque on the pair is exactly zero however large the step is. This is not an approximation that gets better as the step shrinks, and a Verlet implementation that got it wrong would have the kick and drift out of order.',
  });
  add({
    group: 'Numerical integrators',
    kind: 'integration',
    name: 'RK4 conserves angular momentum only approximately',
    measured: integrate('RK4', 6000, 2 * period).worstAngular,
    expected: 0,
    unit: 'relative',
    tolerance: 1e-8,
    toleranceKind: 'absolute',
    why: 'The contrast that makes the two checks above mean something. RK4 mixes four stages evaluated at four different positions, so its velocity change is not along any one line joining the bodies and the torque does not cancel exactly. The error is tiny - this is a fourth-order scheme - but it is a truncation error that shrinks with the step rather than a cancellation that holds at any step, which is a different kind of claim and worth being able to point at.',
  });

  lab.reset();
}
