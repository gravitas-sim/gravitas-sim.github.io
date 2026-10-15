import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// BlackHole.can_move after the clock is written (D-R7-03, D-CANMOVE-01).
//
// A restored world builds every hole as newly made (js/world.js
// rebuildWorldFromStates) and only then sets the simulation clock to the
// saved one (applyShareState). A grace period stamped on the clock at
// construction would be measured from the clock as it was before the restore:
// an earlier saved clock would stretch it, a later one would erase it, and
// resetSimulationTime after a merger would do the same. The window is counted
// in integrated time instead, so each case below gets the whole of it, from
// the restore, on any clock.

let world;
let physics;

beforeAll(async () => {
  // world.js pulls in the renderer, which wants its canvases at import time.
  const find = globalThis.document.getElementById.bind(globalThis.document);
  globalThis.document.getElementById = id => {
    let el = find(id);
    if (!el) {
      el = globalThis.document.createElement(
        /canvas/i.test(id) ? 'canvas' : 'div'
      );
      el.id = id;
      globalThis.document.body.appendChild(el);
    }
    return el;
  };
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
  world = await import('../js/world.js');
  physics = await import('../js/physics.js');
  await import('../js/bodyEffects.js');
});

/** One hole as a share link carries it. */
const linkedHole = () => {
  const hole = new physics.BlackHole(
    { x: 0, y: 0 },
    100,
    { x: 1, y: 0 },
    false
  );
  return { ...hole.get_state(), type: 'BlackHole' };
};

/** Step the world and report can_move after each whole simulated unit. */
const stepUnits = (hole, units) => {
  const seen = [];
  for (let i = 0; i < units; i++) {
    physics.updatePhysics(1);
    seen.push(hole.can_move());
  }
  return seen;
};

describe('can_move across a clock write', () => {
  beforeEach(() => {
    physics.updatePhysicsSettings({ bh_behavior: 'Static' });
  });

  test.each([
    ['an earlier clock than the current one', 400, 100],
    ['a later clock than the current one', 100, 400],
  ])(
    'applyShareState with %s: the window is 50 units from the restore',
    (_, before, saved) => {
      physics.setSimulationTime(before);
      world.applyShareState({
        s: 'None',
        b: [linkedHole()],
        x: { v: 1, clock: saved },
        p: 1,
      });
      expect(physics.getSimulationTime()).toBe(saved);
      expect(physics.bh_list).toHaveLength(1);
      const hole = physics.bh_list[0];
      expect(hole.isNewlyCreated).toBe(true);
      expect(physics.bh_list[0].can_move()).toBe(true);
      const seen = stepUnits(hole, 60);
      // Still moving after 49 units, held still after 51.
      expect(seen[48]).toBe(true);
      expect(seen[50]).toBe(false);
      expect(seen.indexOf(false)).toBeGreaterThanOrEqual(49);
      expect(seen.indexOf(false)).toBeLessThanOrEqual(50);
    }
  );

  test('resetSimulationTime after a merger hole exists leaves its window whole', () => {
    physics.resetSimulationTime();
    physics.setSimulationTime(300);
    // What a merger makes: a newly created hole, mid-world.
    const hole = new physics.BlackHole(
      { x: 0, y: 0 },
      100,
      { x: 1, y: 0 },
      true
    );
    physics.bh_list.length = 0;
    physics.bh_list.push(hole);
    physics.resetSimulationTime();
    expect(hole.can_move()).toBe(true);
    const seen = stepUnits(hole, 60);
    expect(seen[48]).toBe(true);
    expect(seen[50]).toBe(false);
  });
});
