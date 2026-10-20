// ===========================================================================
// Gravity assist
// ---------------------------------------------------------------------------
// A flyby is a two-body scattering problem with a known closed-form answer,
// which makes it one of the few things in this suite where the simulation can
// be checked against theory rather than against itself. Three claims are
// worth pinning, and they are pinned separately because they can fail
// separately:
//
//   the turn      the deflection matches tan(delta/2) = mu / (b vInf^2)
//   the speed     the spacecraft leaves at exactly the speed it arrived,
//                 relative to the planet - the statement the whole lesson
//                 rests on, and the one a bad integrator would break first
//   the ledger    the planet loses the momentum the spacecraft gains
//
// The reversed encounter is here for the same reason the lesson has one: a
// gravity assist that could only add energy would be a perpetual motion
// machine, and showing the same geometry taking energy away is what makes it
// a frame effect rather than a magic trick.
// ===========================================================================

import { hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  constants,
  physics,
  gravityAssist,
  add,
  lab,
}) {
  const G = 1;
  const AU = 100;
  // The scenario's own configuration: five Jupiter masses, drifting at 0.3.
  const planetMass =
    constants.SOLAR_MASS_UNIT * (5 / constants.JUPITER_MASSES_PER_SOLAR_MASS);
  const mu = G * planetMass;
  const V_PLANET = 0.3;
  const V_INF = 0.461;
  const APPROACH = 130.6;
  const GATE = 40 * AU;
  const probeMass = planetMass * 1e-6;

  /**
   * Fly one encounter through the real engine.
   *
   * @param {number} b - Signed impact parameter
   * @param {number} dt - Integration step
   * @returns {object} What the flyby did
   */
  const flyby = (b, dt) => {
    lab.reset({
      integrator: 'Velocity Verlet',
      min_interaction_distance: 0.01,
    });
    const state = gravityAssist.encounterState({
      mu,
      b,
      vInf: V_INF,
      distance: GATE,
      approachDeg: APPROACH,
    });

    const planet = new physics.GasGiant({ x: 0, y: 0 }, { x: V_PLANET, y: 0 });
    planet.mass = planetMass;
    planet.radius = 2;
    planet.persistent = true;
    const probe = new physics.Planet(
      { ...state.pos },
      { x: V_PLANET + state.vel.x, y: state.vel.y },
      1
    );
    probe.mass = probeMass;
    probe.radius = 0.4;
    probe.persistent = true;
    physics.gas_giants.push(planet);
    physics.planets.push(probe);
    lab.commit();

    const rel = () => ({
      x: probe.vel.x - planet.vel.x,
      y: probe.vel.y - planet.vel.y,
    });
    const sep = () =>
      hypot(probe.pos.x - planet.pos.x, probe.pos.y - planet.pos.y);
    const asymptotic = () =>
      gravityAssist.asymptoticSpeed(hypot(rel().x, rel().y), sep(), mu);

    const relIn = rel();
    const vInfIn = asymptotic();
    const speedIn = hypot(probe.vel.x, probe.vel.y);
    const p0 = {
      x: planet.mass * planet.vel.x + probe.mass * probe.vel.x,
      y: planet.mass * planet.vel.y + probe.mass * probe.vel.y,
    };
    const planetVel0 = { ...planet.vel };

    let steps = 0;
    let closest = Infinity;
    let closing = true;
    while (steps < 400000) {
      physics.updatePhysics(dt);
      steps++;
      const r = sep();
      if (r < closest) closest = r;
      if (closing && r > closest + Math.max(1, closest * 0.02)) {
        closing = false;
      }
      if (!closing && r >= GATE) break;
    }

    const relOut = rel();
    const p1 = {
      x: planet.mass * planet.vel.x + probe.mass * probe.vel.x,
      y: planet.mass * planet.vel.y + probe.mass * probe.vel.y,
    };
    return {
      steps,
      closest,
      vInfIn,
      vInfOut: asymptotic(),
      speedIn,
      speedOut: hypot(probe.vel.x, probe.vel.y),
      deflection: gravityAssist.measuredDeflection(relIn, relOut),
      predicted: gravityAssist.deflectionAngle(mu, b, vInfIn),
      probeDeltaP: hypot(
        probe.mass * (probe.vel.x - (relIn.x + V_PLANET)),
        probe.mass * (probe.vel.y - relIn.y)
      ),
      planetDeltaP: hypot(
        planet.mass * (planet.vel.x - planetVel0.x),
        planet.mass * (planet.vel.y - planetVel0.y)
      ),
      momentumError: hypot(p1.x - p0.x, p1.y - p0.y) / hypot(p0.x, p0.y),
    };
  };

  const gaining = flyby(40, 0.5);
  const losing = flyby(-40, 0.5);

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'Deflection matches the two-body scattering formula',
    measured: Math.abs((gaining.deflection * 180) / Math.PI),
    expected: (gaining.predicted * 180) / Math.PI,
    unit: 'degrees',
    tolerance: 1e-3,
    why: 'tan(delta/2) = mu / (b vInf^2) is exact for a two-body encounter, and this is a two-body encounter, so the only thing between the formula and the run is the integrator. 0.1% is about twenty times the discrepancy actually measured (0.004 degrees out of 58.6) and would catch a scheme change or a mis-signed term while leaving room for the finite gate distance.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'The spacecraft leaves at the speed it arrived, in the planet frame',
    measured: Math.abs(gaining.vInfOut - gaining.vInfIn) / gaining.vInfIn,
    expected: 1e-7,
    unit: 'fractional change',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'The claim the entire investigation rests on: with no star present the planet frame is inertial and the encounter can only turn the velocity, not lengthen it. Measured at 3e-12, which is round-off. The bound is at 1e-7 - five orders above what is measured and five below the 0.34% residual the heliocentric version legitimately shows - so this fails on a real regression and not on noise, and it cannot be passed by a run that has quietly acquired a third body.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'Passing behind the planet gains speed in the inertial frame',
    measured: gaining.speedOut > gaining.speedIn,
    expected: true,
    unit: 'gain',
    why: 'The sign of the whole effect, and the thing a student predicts at the third screen of the investigation. Compared exactly because it is a direction rather than a quantity. If this ever flips, the impact parameter convention has been inverted and the investigation is teaching the wrong side.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'The same geometry reversed loses speed instead',
    measured: losing.speedOut < losing.speedIn,
    expected: true,
    unit: 'loss',
    why: 'A gravity assist that could only add energy would be a perpetual motion machine. Running the mirror-image pass and finding it takes energy away is what makes the effect a frame change rather than a source: same planet, same approach, same closest approach distance, opposite sign.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'Both passes deflect by the same angle',
    measured: Math.abs(losing.deflection),
    expected: Math.abs(gaining.deflection),
    unit: 'radians',
    tolerance: 1e-6,
    why: 'The deflection depends on the magnitude of the impact parameter and not its sign, so the mirror pass must turn by the same amount in the other direction. This is what rules out the explanation students reach for when they see the gain and the loss differ in size - that one pass came closer than the other.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'The gain and the loss are not the same size',
    measured:
      Math.abs(
        Math.abs(gaining.speedOut - gaining.speedIn) -
          Math.abs(losing.speedOut - losing.speedIn)
      ) > 0.01,
    expected: true,
    unit: 'asymmetry',
    why: 'Not a defect: speed is the length of a vector sum, and adding a fixed-length vector at two different angles does not change that length symmetrically. Checked because the investigation makes the claim explicitly and a student is entitled to expect the suite to have verified it. Measured at 2.57 units of gain against 1.68 of loss.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'The planet loses the momentum the spacecraft gains',
    measured:
      Math.abs(gaining.planetDeltaP - gaining.probeDeltaP) /
      gaining.probeDeltaP,
    expected: 1e-5,
    unit: 'fractional mismatch',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'The answer to "where did the energy come from", and the reason the investigation can rule out numerical error as the source: at the fixed step this harness uses the two momentum changes agree to about a part in 10^9. A bound at 1e-5 is four orders looser than that and still far tighter than any accumulated drift could sneak through. In the browser the figure is larger - the application sizes its step from the frame rate, and on a loaded machine the encounter is integrated in steps three times this one - which is why the investigation quotes a bound rather than a digit.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'Total momentum is conserved across the encounter',
    measured: gaining.momentumError,
    expected: 1e-12,
    unit: 'fraction of initial momentum',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'Separate from the check above, which compares two changes; this one compares the system total before and after and would catch a body being silently added, removed or reweighted mid-encounter. Measured at 1e-14.',
  });

  add({
    group: 'Gravity assist',
    kind: 'integration',
    name: 'The pass is distant: closest approach is many planet radii out',
    measured: gaining.closest / 2,
    expected: 10,
    unit: 'planet radii',
    tolerance: 0.3,
    why: 'A check on the scenario rather than on the physics. js/physics.js collides on the drawn radius, and the planet here is drawn about forty times larger than life so it can be seen at all; the encounter therefore has to stay far enough out that the exaggeration cannot reach it. Twelve radii, against a collision at one.',
  });

  add({
    group: 'Gravity assist',
    kind: 'analytic',
    name: 'No flyby can change the velocity by more than twice the approach speed',
    measured: gravityAssist.maximumDeltaV(V_INF),
    expected: 2 * V_INF,
    unit: 'simulation speed',
    tolerance: 1e-12,
    why: 'The ceiling the investigation asks students to compute. Trivial arithmetic, checked because the claim it encodes is not trivial: the limit is set by the approach speed and not by the planet mass, which is the single most counter-intuitive consequence of the vector picture.',
  });
}
