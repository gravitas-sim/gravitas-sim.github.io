// =============================================================================
// withWorld: does swapping the module-level variables actually isolate a world?
// -----------------------------------------------------------------------------
// e2e/worldIsolation.spec.js is the real proof - it builds all 59 scenarios in
// interleaved pairs and matches the committed golden. This file covers the
// three things that test cannot see, because a browser test that passes tells
// you the fields it happened to exercise were handled:
//
//   1. the three field lists in physics.js agree with each other
//   2. the restore happens even when fn throws
//   3. the fields that are NOT arrays - the id counter especially - are swapped
//
// (1) is the one worth having. captureWorld() and installWorld() list their
// fields by hand, because you cannot assign to a module-level `let` through a
// computed name, and a field added to one and not the other would leak silently
// between worlds.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  createWorld,
  captureWorld,
  withWorld,
  inWorld,
  WORLD_LISTS,
  StarObject,
  stars,
  bh_list,
} from '../js/physics.js';

describe('the shape of a World', () => {
  test('captureWorld returns every list WORLD_LISTS names', () => {
    const snapshot = captureWorld();
    for (const name of WORLD_LISTS) {
      expect(Array.isArray(snapshot[name])).toBe(true);
    }
  });

  test('createWorld and captureWorld carry the same field set', () => {
    // The drift guard. If somebody adds a field to createWorld() and forgets
    // captureWorld(), a world starts with that field and loses it the first
    // time it is installed and restored.
    expect(Object.keys(createWorld()).sort()).toEqual(
      Object.keys(captureWorld()).sort()
    );
  });

  test('a fresh world is empty and starts its ids at zero', () => {
    const w = createWorld();
    for (const name of WORLD_LISTS) expect(w[name]).toHaveLength(0);
    expect(w.idCounter).toBe(0);
    expect(w.simulationTime).toBe(0);
  });

  test('two fresh worlds share no array', () => {
    const a = createWorld();
    const b = createWorld();
    for (const name of WORLD_LISTS) expect(a[name]).not.toBe(b[name]);
    expect(a.physicsSettings).not.toBe(b.physicsSettings);
  });
});

describe('running inside a world', () => {
  test('bodies made inside one are not visible outside it', () => {
    const before = stars.length;
    const w = createWorld();
    withWorld(w, () => {
      // `stars` here is the imported live binding, which withWorld reassigned.
      // That it works at all is the whole mechanism.
      stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1));
      expect(stars).toHaveLength(1);
    });
    expect(stars.length).toBe(before);
    expect(w.stars).toHaveLength(1);
  });

  test('two worlds keep their own bodies across an interleave', () => {
    const a = createWorld();
    const b = createWorld();
    withWorld(a, () =>
      stars.push(new StarObject({ x: 1, y: 0 }, { x: 0, y: 0 }, 1))
    );
    withWorld(b, () => {
      stars.push(new StarObject({ x: 2, y: 0 }, { x: 0, y: 0 }, 2));
      stars.push(new StarObject({ x: 3, y: 0 }, { x: 0, y: 0 }, 3));
    });
    // A is read only after B was built, which is the point.
    withWorld(a, () => {
      expect(stars).toHaveLength(1);
      expect(stars[0].pos.x).toBe(1);
    });
    withWorld(b, () => expect(stars).toHaveLength(2));
  });

  test('the id counter is per world, so ids do not continue from the other one', () => {
    const a = createWorld();
    const b = createWorld();
    const idsIn = w =>
      withWorld(w, () => {
        stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1));
        stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1));
        return stars.map(s => s.id);
      });
    expect(idsIn(a)).toEqual([0, 1]);
    // Without the counter in the World this would be [2, 3] and the golden
    // would move for every scenario built after the first.
    expect(idsIn(b)).toEqual([0, 1]);
  });

  test('settings changed inside one world do not reach the other', () => {
    const a = createWorld();
    const b = createWorld();
    a.physicsSettings = { ...a.physicsSettings, gravitational_constant: 99 };
    withWorld(a, () => {});
    expect(b.physicsSettings.gravitational_constant).not.toBe(99);
  });
});

describe('restoring', () => {
  test('the previous world comes back even when fn throws', () => {
    const before = captureWorld();
    const w = createWorld();
    expect(() =>
      withWorld(w, () => {
        throw new Error('boom');
      })
    ).toThrow('boom');
    const after = captureWorld();
    for (const name of WORLD_LISTS) expect(after[name]).toBe(before[name]);
    expect(after.idCounter).toBe(before.idCounter);
    expect(inWorld()).toBe(false);
  });

  test('work done inside a world persists in it', () => {
    const w = createWorld();
    withWorld(w, () =>
      stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1))
    );
    expect(w.stars).toHaveLength(1);
    expect(w.idCounter).toBeGreaterThan(0);
  });

  test('nesting restores in the right order', () => {
    const outer = createWorld();
    const inner = createWorld();
    withWorld(outer, () => {
      bh_list.push({ marker: 'outer' });
      withWorld(inner, () => {
        expect(bh_list).toHaveLength(0);
        bh_list.push({ marker: 'inner' });
      });
      expect(bh_list).toHaveLength(1);
      expect(bh_list[0].marker).toBe('outer');
    });
    expect(inWorld()).toBe(false);
  });

  test('it refuses something that is not a World', () => {
    expect(() => withWorld(null, () => 1)).toThrow(TypeError);
  });
});
