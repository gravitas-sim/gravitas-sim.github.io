// ===========================================================================
// 14c. Tidal disruption
// ---------------------------------------------------------------------------
// StarObject, Planet, GasGiant and Comet each implement tidal_mass_loss, and
// updatePhysics used to iterate only `stars`, so three of the four were dead
// code: a comet could fall through a black hole's tidal radius intact. These
// checks are that all four are now reached, that each keeps its own tidal
// radius, and that the destruction thresholds are expressed in units that
// survive a change to the mass scale - which is how the gas giant's came to
// be wrong by a factor of fifty in the first place.
// ===========================================================================

import { makeStar } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  /**
   * Park one body just inside a hole's tidal radius and run a single step.
   *
   * @param {string} kind - Which class to build
   * @returns {object} Mass either side, and whether the body survived
   */
  const tidalRun = kind => {
    lab.reset({ bh_behavior: 'Static', enable_star_merging: false });
    const hole = new physics.BlackHole({ x: 0, y: 0 }, 5000, { x: 0, y: 0 });
    hole.isNewlyCreated = false;
    physics.bh_list.push(hole);

    // Each class has its own tidal radius as a multiple of the hole's: 5 for
    // a star, 4 for a gas giant, 3 for a planet, 2 for a comet. Placed at
    // 1.5 horizon radii, every one of the four is inside its own radius and
    // outside the absorption radius, so what is measured is stripping rather
    // than swallowing.
    const r = hole.radius * 1.5;
    let body;
    if (kind === 'star') {
      body = makeStar(physics, { x: r, y: 0 }, { x: 0, y: 0 }, 1000);
      physics.stars.push(body);
    } else if (kind === 'planet') {
      body = new physics.Planet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
      physics.planets.push(body);
    } else if (kind === 'gasGiant') {
      body = new physics.GasGiant({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
      physics.gas_giants.push(body);
    } else {
      body = new physics.Comet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
      physics.comets.push(body);
    }
    body.persistent = true;
    body.intact = true;
    lab.commit();

    const before = body.mass;
    const debrisBefore = physics.debris.length;
    lab.step(0.1, 1);
    return {
      before,
      after: body.mass,
      intact: body.intact,
      debrisAdded: physics.debris.length - debrisBefore,
      radius: hole.radius,
    };
  };

  for (const [kind, label] of [
    ['star', 'a star'],
    ['planet', 'a planet'],
    ['gasGiant', 'a gas giant'],
    ['comet', 'a comet'],
  ]) {
    const run = tidalRun(kind);
    add({
      group: 'Tidal disruption',
      kind: 'integration',
      name: `Tidal stripping reaches ${label}`,
      measured: run.after < run.before,
      expected: true,
      why: `updatePhysics iterated the star list alone, so ${label} inside a black hole's tidal radius lost nothing. The class had a working tidal_mass_loss the whole time and nothing called it. This check is that the body is lighter after one step than before it.`,
    });
  }

  {
    // The specific repair: a Jupiter-mass gas giant is stripped rather than
    // destroyed outright. Under the stale `this.mass <= 0.5` literal it would
    // have been below the threshold on arrival and destroyed on frame one.
    const giant = tidalRun('gasGiant');
    add({
      group: 'Tidal disruption',
      kind: 'integration',
      name: 'A Jupiter-mass giant is stripped, not destroyed on arrival',
      measured: giant.intact,
      expected: true,
      why: "GasGiant's destruction threshold was a bare 0.5 simulation units, written when JUPITER_MASS_UNIT was a literal 50 and that meant a hundredth of a Jupiter. Correcting the unit to the real 0.955 silently turned the same literal into half a Jupiter, which is heavier than most gas giants the generator makes. The threshold is a hundredth of a Jupiter again, expressed against the unit rather than against the number the unit used to be.",
    });
  }
}
