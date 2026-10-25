// ===========================================================================
// 14b. Absorption by a black hole
// ---------------------------------------------------------------------------
// Accretion used to add the mass and drop the momentum. These checks pin the
// three separate claims the fixed version makes: what it conserves exactly,
// what it cannot conserve and by how much, and that the two deliberate
// approximations still behave as documented.
// ===========================================================================

import { hypot, momentum, centerOf, angularMomentum } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  /**
   * One absorption, run through the engine, with the totals either side.
   *
   * @param {object} overrides - Settings for the lab world
   * @returns {object} Before/after totals and the hole
   */
  const absorptionRun = overrides => {
    lab.reset({ enable_star_merging: false, ...overrides });
    const hole = new physics.BlackHole(
      { x: 0, y: 0 },
      2000,
      { x: 1.5, y: -0.5 },
      false
    );
    // Not newly created, so `can_move` answers from the setting rather than
    // from the grace period a merger product gets.
    hole.isNewlyCreated = false;
    physics.bh_list.push(hole);

    // Placed inside the absorption radius so it is eaten on the first call,
    // with a velocity that is neither parallel nor antiparallel to its
    // offset: a radial infall would carry no angular momentum at all and
    // would make the spin check pass trivially.
    const prey = new physics.Planet(
      { x: hole.radius + 2, y: 0 },
      { x: -3, y: 7 },
      1
    );
    prey.mass = 300;
    prey.radius = 0.5;
    prey.persistent = true;
    physics.planets.push(prey);
    lab.commit();

    const before = {
      mass: hole.mass + prey.mass,
      p: momentum([hole, prey]),
      com: centerOf([hole, prey]),
      L: angularMomentum([hole, prey]),
    };
    const preyState = {
      mass: prey.mass,
      pos: { ...prey.pos },
      vel: { ...prey.vel },
    };
    const holeState = {
      mass: hole.mass,
      pos: { ...hole.pos },
      vel: { ...hole.vel },
    };

    const absorbed = prey.check_absorption(physics.bh_list);
    const survivors = [hole];

    return {
      absorbed,
      hole,
      before,
      preyState,
      holeState,
      after: {
        mass: hole.mass,
        p: momentum(survivors),
        com: centerOf(survivors),
        L: angularMomentum(survivors),
      },
    };
  };

  const moving = absorptionRun({ bh_behavior: 'Orbiting' });

  add({
    group: 'Absorption',
    kind: 'integration',
    name: 'A body inside the absorption radius is absorbed',
    measured: moving.absorbed,
    expected: true,
    why: 'A guard on every check below: they compare totals across an absorption event and would all pass trivially if nothing had been absorbed.',
  });

  add({
    group: 'Absorption',
    kind: 'integration',
    name: 'Absorption conserves mass exactly',
    measured: moving.after.mass,
    expected: moving.before.mass,
    unit: 'mass units',
    tolerance: 1e-12,
    why: 'Nothing is radiated away. The hole ends at the sum of the two masses, which is the same claim the merger group makes and the same approximation: a real accretion event radiates a few percent of the rest mass as light.',
  });

  add({
    group: 'Absorption',
    kind: 'integration',
    name: 'A moving hole absorbing a body conserves linear momentum',
    measured:
      hypot(
        moving.after.p.x - moving.before.p.x,
        moving.after.p.y - moving.before.p.y
      ) / hypot(moving.before.p.x, moving.before.p.y),
    expected: 0,
    unit: 'relative',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'This is the defect the check was written for. Absorption used to add the mass and leave the hole traveling at its old velocity, so every body eaten deposited its mass and threw its momentum away - the dominant term in the momentum drift the scenario probe reported for Star Cluster, Stellar Graveyard and Black Hole Billiards. The hole now takes the mass-weighted mean velocity, which is a perfectly inelastic collision and conserves momentum exactly.',
  });

  add({
    group: 'Absorption',
    kind: 'integration',
    name: "Absorption leaves the pair's center of mass where it was",
    measured: hypot(
      moving.after.com.x - moving.before.com.x,
      moving.after.com.y - moving.before.com.y
    ),
    expected: 0,
    unit: 'units',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: "The position update is the mass-weighted mean as well as the velocity update, so the merged hole sits exactly where the pair's center of mass was. Updating the velocity alone would have conserved momentum and still teleported the center of mass by the body's share of the separation.",
  });

  {
    // The spin term, computed here from the pre-absorption state rather than
    // read back from the engine, so the two have to agree.
    const { preyState: q, holeState: h } = moving;
    const mu = (h.mass * q.mass) / (h.mass + q.mass);
    const expectedSpin =
      mu *
      ((q.pos.x - h.pos.x) * (q.vel.y - h.vel.y) -
        (q.pos.y - h.pos.y) * (q.vel.x - h.vel.x));

    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'Angular momentum lost equals the banked spin term',
      measured: moving.before.L - moving.after.L,
      expected: expectedSpin,
      unit: 'mass * area / time',
      tolerance: 1e-9,
      why: "Total angular momentum splits into the motion of the center of mass and the pair's motion about it, L = L_com + mu (r_rel x v_rel). Collapsing the pair to one point mass keeps L_com exactly and discards the second term. That term is not physically lost - it is the spin the hole acquires, which is how real holes are spun up - but Gravitas models a hole as a point mass with no spin, so there is nowhere to put it. It is banked instead, and this check is that the amount banked is exactly the amount that went missing.",
    });

    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'The engine banks the spin it discarded',
      measured: physics.getAbsorbedSpinAngularMomentum(),
      expected: expectedSpin,
      unit: 'mass * area / time',
      tolerance: 1e-12,
      why: 'The running total the engine exposes, against the same quantity computed from the state before the event. A departure that is documented but not measured is a disclaimer; this makes it a number.',
    });

    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'The spin term is bounded by the absorption radius',
      measured: Math.abs(expectedSpin),
      expected:
        mu *
        (moving.hole.radius + physics.ABSORB_BUFFER) *
        hypot(q.vel.x - h.vel.x, q.vel.y - h.vel.y),
      unit: 'mass * area / time',
      tolerance: 0,
      toleranceKind: 'bound',
      why: 'The body is inside bh.radius + ABSORB_BUFFER when this runs, so |L_spin| <= mu * (r_horizon + buffer) * |v_rel|. The discarded term is therefore small and bounded rather than merely believed to be, and it shrinks as the hole grows because mu tends to the body mass while the horizon grows only as M^0.3.',
    });
  }

  {
    const stat = absorptionRun({ bh_behavior: 'Static' });
    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'A static hole does not recoil when it absorbs',
      measured: hypot(
        stat.hole.vel.x - stat.holeState.vel.x,
        stat.hole.vel.y - stat.holeState.vel.y
      ),
      expected: 0,
      unit: 'units per time',
      tolerance: 1e-15,
      toleranceKind: 'absolute',
      why: 'A static hole is a fixed potential well that pulls on everything and is pulled by nothing, which is a deliberate teaching object and is what conservationCaveats() reports. Giving it a recoil at the moment it swallows something would be the one instant in its life it responded to another body, and would nudge it off the mark the scenario placed it on. It still gains the mass; the momentum that goes nowhere is added to the discarded total instead of vanishing unrecorded.',
    });

    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'Momentum a static hole discards is accounted for',
      measured: hypot(
        physics.getDiscardedAbsorptionMomentum().x,
        physics.getDiscardedAbsorptionMomentum().y
      ),
      expected: hypot(
        stat.preyState.mass * stat.preyState.vel.x,
        stat.preyState.mass * stat.preyState.vel.y
      ),
      unit: 'mass * units per time',
      tolerance: 1e-12,
      why: 'The ledger the engine keeps for exactly this case, against the momentum the absorbed body was carrying. The static-hole approximation is allowed to break momentum conservation; it is not allowed to break it silently.',
    });
  }

  {
    const oneWay = absorptionRun({
      bh_behavior: 'Orbiting',
      mutual_gravity: false,
    });
    add({
      group: 'Absorption',
      kind: 'approximation',
      name: 'Under one-way gravity a hole does not recoil either',
      measured: hypot(
        oneWay.hole.vel.x - oneWay.holeState.vel.x,
        oneWay.hole.vel.y - oneWay.holeState.vel.y
      ),
      expected: 0,
      unit: 'units per time',
      tolerance: 1e-15,
      toleranceKind: 'absolute',
      why: 'One-way gravity makes the small bodies test particles with no dynamical influence, which is the second departure conservationCaveats() reports. Momentum a body never exerted through gravity should not suddenly appear at the moment it is eaten, so the transfer is suppressed there too and the configuration keeps the behavior it is documented as having.',
    });
  }

  // Left as the engine found it, so nothing downstream inherits the ledger.
  physics.resetAbsorptionAccounting();
}
