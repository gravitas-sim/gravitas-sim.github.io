import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  updatePhysics,
  updatePhysicsSettings,
  setStateReference,
  resetSimulationTime,
  getSimulationTime,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
  BlackHole,
} from '../js/physics.js';
import { frameAdvance } from '../js/timestep.js';
import '../js/bodyEffects.js';

// BlackHole.can_move: when a newly made hole in a Static world is allowed to
// move. D-R7-03.
//
// The grace period used to be a wall-clock window (Date.now against the hole's
// creation time), so how far a new hole travelled depended on how many frames
// the machine drew in those seconds. This file drives the same world on two
// simulated machines - a 60 fps one and a 15 fps one, the integration step
// following the frame as js/timestep.js frameAdvance does - and pins what
// can_move answers at fixed points of simulated time.

const DT = 0.1; // the engine's DT; frameAdvance takes it as an argument
const START_WALL = 1.7e12;
const realNow = Date.now;

/**
 * Drive one hole from creation until simulated time reaches each checkpoint.
 *
 * @param {number} fps - Frames the machine draws per real second
 * @param {number[]} checkpoints - Simulated times to sample at, ascending
 * @returns {Array<{sim: number, wall: number, canMove: boolean, x: number}>}
 */
function drive(fps, checkpoints) {
  let wall = START_WALL;
  Date.now = () => wall;
  resetSimulationTime();
  bh_list.length = 0;
  const hole = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, true);
  bh_list.push(hole);
  const advance = frameAdvance(1 / fps, 1, DT);
  const out = [];
  let next = 0;
  while (next < checkpoints.length) {
    wall += 1000 / fps;
    updatePhysics(advance);
    if (getSimulationTime() >= checkpoints[next] - 1e-9) {
      out.push({
        sim: getSimulationTime(),
        wall: (wall - START_WALL) / 1000,
        canMove: hole.can_move(),
        x: hole.pos.x,
      });
      next++;
    }
  }
  return out;
}

describe('BlackHole.can_move grace period', () => {
  beforeEach(() => {
    for (const list of [
      bh_list,
      planets,
      stars,
      gas_giants,
      asteroids,
      debris,
      particles,
      neutron_stars,
      white_dwarfs,
    ]) {
      list.length = 0;
    }
    updatePhysicsSettings({
      gravitational_constant: 1.0,
      mutual_gravity: false,
      bh_behavior: 'Static',
      orbit_decay_rate: 0,
      max_timestep: 0,
    });
    setStateReference({
      frame_count: 0,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      paused: false,
    });
  });

  afterEach(() => {
    Date.now = realNow;
    bh_list.length = 0;
  });

  // PINS THE OLD BEHAVIOR (wall clock). Rewritten with the change below.
  test('wall clock: the same simulated moment answers differently on two machines', () => {
    const fast = drive(60, [45, 70]);
    const slow = drive(15, [45, 70]);
    // 45 simulated units: 9.0 s of wall clock at 60 fps, 12.0 s at 15 fps.
    expect(fast[0].wall).toBeCloseTo(9.0, 3);
    expect(slow[0].wall).toBeCloseTo(12.0, 3);
    expect(fast[0].canMove).toBe(true);
    expect(slow[0].canMove).toBe(false);
    // The fast machine's hole has moved the whole 45 units; the slow
    // machine's stopped after 10 s of wall clock, which was 37.25 units.
    expect(fast[0].x).toBeCloseTo(45, 6);
    expect(slow[0].x).toBeCloseTo(37.25, 6);
    // Past the window both are static.
    expect(fast[1].canMove).toBe(false);
    expect(slow[1].canMove).toBe(false);
  });
});
