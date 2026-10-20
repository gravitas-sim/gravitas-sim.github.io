// ===========================================================================
// 14c. The Three-Body Sensitivity Lab
// ---------------------------------------------------------------------------
// The chaos investigation asks a student to draw a physical conclusion from
// a computed divergence, which is only legitimate if the divergence is a
// property of the system rather than of the timestep. These checks are the
// evidence for that, and they are here rather than in a browser test because
// they are numbers rather than pixels.
//
// The configuration is Lagrange's equilateral solution with three equal
// masses: an exact solution of the three-body problem, linearly unstable by
// Gascheau's criterion 27(m1m2+m2m3+m3m1) < (m1+m2+m3)^2, which for equal
// masses reads 81m^2 < 9m^2 and fails by a factor of nine.
// ===========================================================================

import { hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, chaos, add, lab }) {
  const G = 2;
  const MASS = 6 * physics.SOLAR_MASS_UNIT;
  const R = 50;
  const SIDE = R * Math.sqrt(3);
  const OMEGA = Math.sqrt((G * 3 * MASS) / SIDE ** 3);
  // The perturbation the lesson applies: 1e-3 simulation units on one
  // coordinate, which is 1,496 km.
  const NUDGE = 1e-3;
  // The lesson's own run length, in simulated seconds.
  const RUN = 200;

  /** Build the lab's three stars. */
  const build = () => {
    for (let i = 0; i < 3; i++) {
      const th = (i * 2 * Math.PI) / 3;
      const x = R * Math.cos(th);
      const y = R * Math.sin(th);
      const star = new physics.StarObject(
        { x, y },
        { x: -OMEGA * y, y: OMEGA * x },
        1
      );
      star.mass = MASS;
      star.name = ['Alpha', 'Beta', 'Gamma'][i];
      star.radius = 8;
      star.persistent = true;
      physics.stars.push(star);
    }
  };

  /** Run the lab and sample it. */
  const runLab = ({ nudge = 0, dt, integrator }) => {
    lab.reset({
      gravitational_constant: G,
      mutual_gravity: true,
      star_only_gravity: false,
      enable_star_merging: false,
      integrator,
    });
    // makeLab's reset does not touch the simulated clock, and these two runs
    // are compared on it: without this the second run's samples start where
    // the first run's ended and the two never overlap.
    physics.resetSimulationTime();
    build();
    if (nudge) physics.stars[0].pos.x += nudge;
    lab.commit();
    const before = physics.conservedQuantities();
    const samples = [];
    let minSeparation = Infinity;
    const steps = Math.round(RUN / dt);
    const every = Math.max(1, Math.round(0.5 / dt));
    for (let i = 0; i < steps; i++) {
      physics.updatePhysics(dt);
      if (i % every) continue;
      const alive = physics.stars.filter(b => b.alive !== false);
      samples.push({
        t: physics.getSimulationTime(),
        bodies: alive.map(b => ({
          id: b.id,
          x: b.pos.x,
          y: b.pos.y,
          vx: b.vel.x,
          vy: b.vel.y,
        })),
      });
      for (let a = 0; a < alive.length; a++) {
        for (let b = a + 1; b < alive.length; b++) {
          minSeparation = Math.min(
            minSeparation,
            hypot(
              alive[a].pos.x - alive[b].pos.x,
              alive[a].pos.y - alive[b].pos.y
            )
          );
        }
      }
    }
    const after = physics.conservedQuantities();
    return {
      samples,
      minSeparation,
      survivors: physics.stars.filter(b => b.alive !== false).length,
      energyDrift: Math.abs((after.energy - before.energy) / before.energy),
      angularDrift: Math.abs((after.angular - before.angular) / before.angular),
    };
  };

  const pair = ({ dt, integrator }) => {
    const a = runLab({ dt, integrator });
    const b = runLab({ nudge: NUDGE, dt, integrator });
    const { series } = chaos.separationSeries(a.samples, b.samples);
    return { a, b, series, verdict: chaos.analyzeDivergence(series) };
  };

  const base = pair({ dt: 0.1, integrator: 'Symplectic Euler' });
  const fine = pair({ dt: 0.025, integrator: 'Symplectic Euler' });
  const verlet = pair({ dt: 0.1, integrator: 'Velocity Verlet' });

  // 1. Determinism. Two runs from identical starts, bit for bit.
  {
    const twin = runLab({ dt: 0.1, integrator: 'Symplectic Euler' });
    const { series } = chaos.separationSeries(base.a.samples, twin.samples);
    const worst = Math.max(...series.map(p => p.d));
    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'Two identical runs stay identical',
      measured: worst,
      expected: 0,
      unit: 'length units',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'Exactly zero, not approximately: the engine is deterministic, so the same initial numbers integrated by the same code give the same trajectory. The chaos investigation rests on this - it is what lets a student attribute a later divergence to the perturbation rather than to the machine - and the investigation opens by having them measure it.',
    });
  }

  // 2. The two-body control. Regular, and not exponential.
  {
    const runBinary = nudge => {
      lab.reset({
        gravitational_constant: G,
        mutual_gravity: true,
        star_only_gravity: false,
        enable_star_merging: false,
        integrator: 'Symplectic Euler',
      });
      physics.resetSimulationTime();
      const a = 100;
      const v = Math.sqrt((G * MASS) / (2 * a));
      for (const [sx, sv, name] of [
        [-a / 2, -v, 'Alpha'],
        [a / 2, v, 'Beta'],
      ]) {
        const star = new physics.StarObject(
          { x: sx, y: 0 },
          { x: 0, y: sv },
          1
        );
        star.mass = MASS;
        star.name = name;
        star.persistent = true;
        physics.stars.push(star);
      }
      if (nudge) physics.stars[0].pos.x += nudge;
      lab.commit();
      const samples = [];
      for (let i = 0; i < RUN / 0.1; i++) {
        physics.updatePhysics(0.1);
        if (i % 5) continue;
        samples.push({
          t: physics.getSimulationTime(),
          bodies: physics.stars.map(b => ({
            id: b.id,
            x: b.pos.x,
            y: b.pos.y,
            vx: b.vel.x,
            vy: b.vel.y,
          })),
        });
      }
      return samples;
    };
    const { series } = chaos.separationSeries(runBinary(0), runBinary(NUDGE));
    const verdict = chaos.analyzeDivergence(series);

    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'The two-body control drifts linearly, not exponentially',
      measured: verdict.linearR2,
      expected: 1,
      unit: 'r-squared',
      tolerance: 0.02,
      toleranceKind: 'absolute',
      why: 'The same perturbation applied to a two-body orbit separates the two runs in proportion to elapsed time, because a slightly displaced star has a slightly different period and the two runs drift out of phase. A straight line fits it to better than r-squared 0.98. This is the control that stops the investigation mistaking any divergence for chaos.',
    });

    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'The two-body control is refused a Lyapunov timescale',
      measured: verdict.tau === null ? 0 : 1,
      expected: 0,
      unit: 'estimates produced',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'A log-linear fit can be forced through any increasing series and will produce a confident number with units of time. The analysis in js/chaos/divergence.js refuses, because the growth is not exponential and a straight line fits better. If this ever starts producing a number, the investigation is teaching that ordinary phase drift is chaos.',
    });
  }

  // 3. The three-body pair diverges, exponentially, during the lesson.
  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'The three-body pair diverges exponentially',
    measured: base.verdict.r2,
    expected: 1,
    unit: 'r-squared of the log-linear fit',
    tolerance: 0.02,
    toleranceKind: 'absolute',
    why: 'Over the investigation\u2019s own 200 simulated seconds, the separation between the perturbed and unperturbed runs grows by seven orders of magnitude, and the logarithm of it is a straight line in time to better than r-squared 0.98. That is what sensitive dependence looks like when it is measured rather than asserted.',
  });

  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'The e-folding time is close to the unstable eigenvalue',
    measured: base.verdict.tau,
    expected: Math.SQRT2 / OMEGA,
    unit: 'simulated seconds',
    tolerance: 0.25,
    why: 'Linear stability analysis of the equilateral solution gives a growth rate of n/sqrt(2) for equal masses, so the e-folding time should be sqrt(2)/n = 6.0 s. The measured value is about 15% longer, which is expected: the fit covers a finite window, the perturbation is finite rather than infinitesimal, and the unstable eigenvalue is complex, so an oscillation rides on the growth. A tolerance of 25% asks the measurement to agree with theory to within that finite-amplitude correction and no more; anything outside it would mean the configuration or the force law had changed.',
  });

  // 4. Refinement. The conclusion has to survive better numerics.
  {
    const verdict = chaos.refinementVerdict([
      { tau: base.verdict.tau, behavior: base.verdict.behavior },
      { tau: fine.verdict.tau, behavior: fine.verdict.behavior },
      { tau: verlet.verdict.tau, behavior: verlet.verdict.behavior },
    ]);
    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'The divergence survives a quarter timestep and another integrator',
      measured: verdict.spread,
      expected: 0,
      unit: 'fractional spread in the e-folding time',
      tolerance: 0.2,
      toleranceKind: 'absolute',
      why: 'The investigation\u2019s conclusion is that the divergence is physical, and the only evidence for that is refinement. Symplectic Euler at dt = 0.1 and at dt = 0.025, and Velocity Verlet at dt = 0.1, must agree about the e-folding time. Twenty per cent is the same threshold the widget uses to tell a student their result is resolved, so this check and the classroom verdict cannot disagree.',
    });
  }

  // 5. Conservation, on the run the lesson actually uses.
  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'Energy drift over the investigation run',
    measured: base.a.energyDrift,
    expected: 0,
    unit: 'relative',
    tolerance: 2e-3,
    toleranceKind: 'absolute',
    why: 'Symplectic Euler at dt = 0.1 over 200 simulated seconds, which is what a student runs. The bound is set by the measured drift of 5e-4 with room for the close passages that appear once the triangle breaks up, and it is two thousand times smaller than the divergence signal the investigation measures - so the conclusion cannot be an artifact of energy leaking out of the integrator.',
  });

  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'Angular momentum drift over the investigation run',
    measured: base.a.angularDrift,
    expected: 0,
    unit: 'relative',
    tolerance: 1e-10,
    toleranceKind: 'absolute',
    why: 'A symplectic integrator conserves angular momentum to round-off for a rotationally symmetric force law, and this configuration is a clean test of that: the measured drift is at 1e-15. A bound of 1e-10 is far above the noise and far below anything that would matter, and it would catch a force law that had stopped being central.',
  });

  // 6. No merger, and nothing close to one.
  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'All three stars survive the investigation run',
    measured: base.a.survivors,
    expected: 3,
    unit: 'bodies',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'The divergence measure matches bodies by identity, so a merger part-way through would silently change what is being compared. This configuration was chosen partly because it never brings two stars close: the Pythagorean three-body problem, the obvious alternative, merges under every integrator in this engine.',
  });

  add({
    group: 'Three-body sensitivity',
    kind: 'integration',
    name: 'Closest approach stays far outside the collision radius',
    measured: base.a.minSeparation,
    expected: SIDE,
    unit: 'length units',
    tolerance: 0.6,
    why: 'Two stars of drawn radius 8 collide inside 16 units. The closest the three ever come during the investigation run is about 80, five times that, so no collision rule fires and the result does not depend on the merger settings. The tolerance is wide because the closest approach is a chaotic quantity; what matters is the order of magnitude, and the check would fail loudly if the configuration ever started grazing.',
  });
}
