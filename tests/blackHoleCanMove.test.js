import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  updatePhysics,
  updatePhysicsSettings,
  setStateReference,
  resetSimulationTime,
  setSimulationTime,
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

  // The old test of this name pinned the wall-clock window: at 45 simulated
  // units the 60 fps machine (9.0 s of wall clock) answered true and the 15 fps
  // machine (12.0 s) answered false, and its hole had travelled 37.25 units
  // against 45. Both machines now give the same answers.
  test('the same simulated moment answers the same on two machines', () => {
    const fast = drive(60, [45, 70]);
    const slow = drive(15, [45, 70]);
    // 45 simulated units: 9.0 s of wall clock at 60 fps, 12.0 s at 15 fps.
    expect(fast[0].wall).toBeCloseTo(9.0, 3);
    expect(slow[0].wall).toBeCloseTo(12.0, 3);
    expect(fast[0].canMove).toBe(true);
    expect(slow[0].canMove).toBe(true);
    expect(fast[0].x).toBeCloseTo(45, 6);
    expect(slow[0].x).toBeCloseTo(45, 6);
    // Past 50 units both are static, and each stopped within one frame's
    // advance of the same place (the grace is tested once per step).
    expect(fast[1].canMove).toBe(false);
    expect(slow[1].canMove).toBe(false);
    expect(Math.abs(fast[1].x - slow[1].x)).toBeLessThan(0.25 + 1e-9);
    expect(fast[1].x).toBeGreaterThan(49.5);
    expect(slow[1].x).toBeGreaterThan(49.5);
  });

  test('the wall clock is not consulted: a day passing between frames changes nothing', () => {
    const plain = drive(60, [45, 70]);
    let wall = START_WALL;
    Date.now = () => (wall += 86400e3);
    resetSimulationTime();
    bh_list.length = 0;
    const hole = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, true);
    bh_list.push(hole);
    const advance = frameAdvance(1 / 60, 1, DT);
    while (getSimulationTime() < 45 - 1e-9) updatePhysics(advance);
    expect(hole.can_move()).toBe(plain[0].canMove);
    expect(hole.pos.x).toBeCloseTo(plain[0].x, 9);
    while (getSimulationTime() < 70 - 1e-9) updatePhysics(advance);
    expect(hole.can_move()).toBe(plain[1].canMove);
    expect(hole.pos.x).toBeCloseTo(plain[1].x, 9);
  });

  test('the window is a function of the simulated clock, and rewinds with it', () => {
    resetSimulationTime();
    const hole = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, true);
    // Ten seconds of play at 1x, which is 50 simulated units (5 per second).
    expect(hole.movementGracePeriod).toBe(10);
    // The stamp is not an own enumerable key, so the world goldens, which
    // serialize every own key, are unchanged by this.
    expect(Object.keys(hole)).not.toContain('creationSimTime');
    setSimulationTime(49.99);
    expect(hole.can_move()).toBe(true);
    setSimulationTime(50);
    expect(hole.can_move()).toBe(false);
    setSimulationTime(10);
    expect(hole.can_move()).toBe(true);
  });

  test('a hole made later on the clock gets its own full window', () => {
    resetSimulationTime();
    setSimulationTime(1000);
    const hole = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, true);
    setSimulationTime(1049);
    expect(hole.can_move()).toBe(true);
    setSimulationTime(1051);
    expect(hole.can_move()).toBe(false);
  });

  test('a hole that was not newly made never moves in a Static world, and an Orbiting world always moves', () => {
    resetSimulationTime();
    const old = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, false);
    expect(old.can_move()).toBe(false);
    const fresh = new BlackHole({ x: 0, y: 0 }, 100, { x: 1, y: 0 }, true);
    setSimulationTime(5000);
    expect(fresh.can_move()).toBe(false);
    updatePhysicsSettings({ bh_behavior: 'Orbiting' });
    expect(old.can_move()).toBe(true);
    expect(fresh.can_move()).toBe(true);
  });
});
