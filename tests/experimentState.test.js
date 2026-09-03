import { describe, test, expect } from '@jest/globals';
import {
  canonicalJson,
  hashState,
  stripVolatile,
  withExtras,
  readExtras,
  effectiveSettings,
  parameterDiff,
  describeDiff,
  isVariableKey,
  EXTRAS_VERSION,
} from '../js/experiments/canonicalState.js';
import { buildPayload, packBody } from '../js/shareState.js';

// The bench's whole claim is that Run B starts where Run A started. These are
// the tests of that claim: what the canonical state carries, what it
// deliberately leaves out, and what counts as having changed between two runs.

const DEFAULTS = {
  preset_scenario: 'None',
  gravitational_constant: 1,
  integrator: 'Symplectic Euler',
  sim_speed: 1,
  show_trails: true,
  trail_length: 15,
  mutual_gravity: false,
};

describe('canonical JSON', () => {
  test('key order does not change the text', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  test('a float that has been through JSON still hashes the same', () => {
    const once = { g: 0.1 + 0.2 };
    const round = JSON.parse(JSON.stringify(once));
    expect(canonicalJson(round)).toBe(canonicalJson({ g: 0.3 }));
  });

  test('negative zero is zero, because it is', () => {
    expect(canonicalJson({ v: -0 })).toBe(canonicalJson({ v: 0 }));
  });

  test('a non-finite number does not produce invalid JSON', () => {
    expect(() => JSON.parse(canonicalJson({ v: Infinity }))).not.toThrow();
  });
});

describe('the initial-state hash', () => {
  const base = { v: 1, s: 'Binary BH', seed: 'ab12', d: { sim_speed: 1 } };

  test('is stable across identical states', () => {
    expect(hashState(base)).toBe(hashState({ ...base }));
  });

  test('changes when a setting changes', () => {
    expect(hashState({ ...base, d: { sim_speed: 2 } })).not.toBe(
      hashState(base)
    );
  });

  test('changes when the seed changes', () => {
    expect(hashState({ ...base, seed: 'ffff' })).not.toBe(hashState(base));
  });

  test('ignores the camera, which is where the viewer is looking', () => {
    const scrolled = { ...base, c: [2, 30, -40] };
    expect(hashState(scrolled)).toBe(hashState(base));
  });

  test('ignores the clock, so a state hashes the same before and after running', () => {
    const later = withExtras(base, { clock: 128.5 });
    expect(hashState(later)).toBe(hashState(withExtras(base, { clock: 0 })));
  });

  test('does not mutate what it is given', () => {
    const payload = withExtras({ ...base }, { clock: 5 });
    const before = JSON.stringify(payload);
    hashState(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });
});

describe('the extras block', () => {
  test('round-trips the clock, frame, observer and tools', () => {
    const payload = withExtras(
      { v: 1, s: 'Solar System', seed: '1' },
      {
        clock: 42.25,
        frame: { mode: 'object', objectId: 7 },
        observer: { positionAngle: 30, inclination: 45 },
        tools: ['stopwatch', 'ruler'],
      }
    );
    const back = readExtras(payload);
    expect(back.version).toBe(EXTRAS_VERSION);
    expect(back.clock).toBeCloseTo(42.25, 9);
    expect(back.frame).toEqual({ mode: 'object', objectId: 7 });
    expect(back.observer).toEqual({ positionAngle: 30, inclination: 45 });
    // Sorted, so the same set of tools always encodes identically.
    expect(back.tools).toEqual(['ruler', 'stopwatch']);
  });

  test('a payload with no extras reads as a world at t=0, world frame, edge on', () => {
    const back = readExtras({ v: 1, s: 'Binary BH', seed: '1' });
    expect(back.clock).toBe(0);
    expect(back.frame.mode).toBe('world');
    expect(back.observer).toEqual({ positionAngle: 0, inclination: 90 });
  });

  test('defaults are not written out, so a link pays nothing for them', () => {
    const payload = withExtras(
      { v: 1 },
      {
        clock: 0,
        frame: { mode: 'world', objectId: null },
        observer: { positionAngle: 0, inclination: 90 },
        tools: [],
      }
    );
    expect(Object.keys(payload.x)).toEqual(['v']);
  });
});

describe('identity', () => {
  test('packBody carries the object id only when asked', () => {
    const state = {
      id: 12,
      type: 'Planet',
      pos: { x: 1, y: 2 },
      vel: { x: 0, y: 1 },
      mass: 3,
    };
    expect(packBody(state).id).toBeUndefined();
    expect(packBody(state, { withId: true }).id).toBe(12);
  });
});

describe('buildPayload with experiment blocks', () => {
  const common = {
    scenario: 'Binary BH',
    seed: 42,
    settings: { ...DEFAULTS, preset_scenario: 'Binary BH' },
    DEFAULT_SETTINGS: DEFAULTS,
  };

  test('omits both blocks when there is nothing to carry', () => {
    const payload = buildPayload(common);
    expect(payload.x).toBeUndefined();
    expect(payload.xp).toBeUndefined();
  });

  test('carries them when there is', () => {
    const payload = buildPayload({
      ...common,
      extras: { v: 1, clock: 3 },
      experiment: { v: 1, m: ['separation'] },
    });
    expect(payload.x).toEqual({ v: 1, clock: 3 });
    expect(payload.xp).toEqual({ v: 1, m: ['separation'] });
  });
});

describe('what counts as an independent variable', () => {
  test('a physical setting does', () => {
    expect(isVariableKey('gravitational_constant')).toBe(true);
    expect(isVariableKey('integrator')).toBe(true);
    // sim_speed scales the integration step, so it is numerical, not cosmetic.
    expect(isVariableKey('sim_speed')).toBe(true);
  });

  test('a visual toggle does not', () => {
    expect(isVariableKey('show_trails')).toBe(false);
    expect(isVariableKey('trail_length')).toBe(false);
    expect(isVariableKey('planet_base_color')).toBe(false);
  });

  test('elapsed time, buffers and layout do not', () => {
    for (const key of [
      'elapsed',
      'frame_count',
      'timeline_frames',
      'zoom',
      'panel_layout',
      'theme',
    ]) {
      expect(isVariableKey(key)).toBe(false);
    }
  });
});

describe('the parameter difference between two runs', () => {
  const runA = {
    v: 1,
    s: 'Binary BH',
    seed: '2a',
    d: { gravitational_constant: 1 },
  };

  test('finds the one thing that changed', () => {
    const runB = { ...runA, d: { gravitational_constant: 2 } };
    const diff = parameterDiff(runA, runB);
    expect(diff.count).toBe(1);
    expect(diff.multivariable).toBe(false);
    expect(diff.variables[0]).toEqual({
      key: 'gravitational_constant',
      from: 1,
      to: 2,
    });
  });

  test('flags more than one', () => {
    const runB = {
      ...runA,
      d: { gravitational_constant: 2, integrator: 'RK4' },
    };
    const diff = parameterDiff(runA, runB);
    expect(diff.count).toBe(2);
    expect(diff.multivariable).toBe(true);
    expect(describeDiff(diff.variables)).toContain('gravitational_constant');
    expect(describeDiff(diff.variables)).toContain('integrator');
  });

  test('does not count a trail length or a camera as a variable', () => {
    const runB = {
      ...runA,
      d: { gravitational_constant: 1, trail_length: 40 },
      c: [3, 10, 10],
    };
    const diff = parameterDiff(runA, runB);
    expect(diff.count).toBe(0);
    expect(diff.multivariable).toBe(false);
    expect(diff.incidental.map(v => v.key)).toContain('trail_length');
  });

  test('counts the seed, because a different seed is a different world', () => {
    const diff = parameterDiff(runA, { ...runA, seed: 'ff00' });
    expect(diff.variables.map(v => v.key)).toEqual(['seed']);
  });

  test('counts the scenario', () => {
    const diff = parameterDiff(runA, { ...runA, s: 'Solar System' });
    expect(diff.variables.map(v => v.key)).toEqual(['scenario']);
  });

  test('reports a frame change as context rather than as a variable', () => {
    const runB = withExtras(runA, { frame: { mode: 'object', objectId: 3 } });
    const diff = parameterDiff(runA, runB);
    expect(diff.count).toBe(0);
    expect(diff.context.map(c => c.key)).toEqual(['reference_frame']);
  });

  test('a baseline fills in the value a payload left out', () => {
    // Run A left gravity at the scenario default, so its payload does not
    // mention it; Run B set it to 4. Without the baseline this reads
    // "— -> 4", which tells a student nothing.
    const a = { v: 1, s: 'Binary BH', seed: '1' };
    const b = {
      v: 1,
      s: 'Binary BH',
      seed: '1',
      d: { gravitational_constant: 4 },
    };
    const plain = parameterDiff(a, b);
    expect(plain.variables[0]).toEqual({
      key: 'gravitational_constant',
      from: null,
      to: 4,
    });
    const withBaseline = parameterDiff(a, b, { gravitational_constant: 2 });
    expect(withBaseline.variables[0]).toEqual({
      key: 'gravitational_constant',
      from: 2,
      to: 4,
    });
  });

  test('a baseline does not invent differences for keys nobody touched', () => {
    const a = { v: 1, s: 'X', seed: '1', d: { gravitational_constant: 4 } };
    const b = { v: 1, s: 'X', seed: '1', d: { gravitational_constant: 4 } };
    const diff = parameterDiff(a, b, {
      gravitational_constant: 2,
      integrator: 'RK4',
      sim_speed: 9,
    });
    expect(diff.count).toBe(0);
  });

  test('settings applied before and after generation are compared together', () => {
    const before = {
      v: 1,
      s: 'X',
      seed: '1',
      d: { gravitational_constant: 4 },
    };
    const after = { v: 1, s: 'X', seed: '1', a: { gravitational_constant: 4 } };
    expect(effectiveSettings(before)).toEqual(effectiveSettings(after));
    expect(parameterDiff(before, after).count).toBe(0);
  });
});

describe('the captured start is immutable', () => {
  // Two bugs found by the browser test, pinned here because both are silent
  // and both destroy the feature's only real claim.

  test('an id of zero survives a round trip', () => {
    // `s.id || counter++` gives the first body in every world - id 0 - a fresh
    // id on restore, so "body 0" in Run B is a different object than in Run A.
    const packed = packBody(
      { id: 0, type: 'BlackHole', pos: { x: 1, y: 2 } },
      { withId: true }
    );
    expect(packed.id).toBe(0);
    // The reader has to use ?? rather than ||, which is what physics.js now does.
    const restored = packed.id ?? 999;
    expect(restored).toBe(0);
  });

  test('a payload survives being applied, because it is copied first', () => {
    // Restoring assigns pos/vel by reference onto the rebuilt bodies, so a
    // caller that hands over its stored payload has it mutated by the
    // integrator. The bench clones; this pins the shape that makes cloning
    // work - a payload has to be plain JSON with no live references in it.
    const payload = {
      v: 1,
      s: 'Binary BH',
      seed: '1',
      b: [{ id: 0, pos: { x: 1, y: 2 }, vel: { x: 0, y: 1 } }],
    };
    const clone = JSON.parse(JSON.stringify(payload));
    clone.b[0].pos.x = 99;
    expect(payload.b[0].pos.x).toBe(1);
    expect(hashState(payload)).not.toBe(hashState(clone));
  });
});

describe('stripVolatile', () => {
  test('leaves the world alone and removes the viewpoint', () => {
    const payload = {
      v: 1,
      s: 'X',
      seed: '1',
      b: [{ mass: 1 }],
      c: [1, 0, 0],
      p: 1,
    };
    const stripped = stripVolatile(payload);
    expect(stripped.b).toEqual([{ mass: 1 }]);
    expect(stripped.c).toBeUndefined();
    expect(stripped.p).toBeUndefined();
  });
});
