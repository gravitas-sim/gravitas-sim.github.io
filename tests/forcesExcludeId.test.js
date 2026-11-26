// =============================================================================
// Summing the gravity of every source but one, without copying the list
// -----------------------------------------------------------------------------
// With mutual gravity on, computeAccelerations used to build
// `cachedMajorSources.filter(s => s.id !== obj.id)` for every body on every
// force evaluation, an array per body per step, only to hand it to
// gravitational_acceleration. gravitational_acceleration_excluding skips the
// body's own entry inside the sum instead. It visits the remaining sources in
// the same order, so the floating-point sum is the same one, bit for bit.
//
// Bit for bit is the claim, so every comparison here is Object.is on the two
// components, never a tolerance.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  cachedMajorSources,
  computeAccelerations,
  gravitational_acceleration,
  gravitational_acceleration_excluding,
} from '../js/engine/forces.js';
import { physicsSettings, updatePhysicsSettings } from '../js/engine/state.js';

/** A small deterministic generator, so the sky of sources is the same each run. */
const lcg = seed => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const makeSources = (n, rand) =>
  Array.from({ length: n }, (_, i) => ({
    id: `body-${i}`,
    pos: { x: (rand() - 0.5) * 2000, y: (rand() - 0.5) * 2000 },
    mass: 1 + rand() * 1e4,
    alive: true,
  }));

const sameBits = (a, b) => {
  expect(Object.is(a.ax, b.ax)).toBe(true);
  expect(Object.is(a.ay, b.ay)).toBe(true);
};

describe('gravitational_acceleration_excluding', () => {
  test('equals the filtered-array sum bit for bit', () => {
    const rand = lcg(7);
    const sources = makeSources(40, rand);
    for (let i = 0; i < sources.length; i++) {
      const target = sources[i];
      const viaFilter = gravitational_acceleration(
        target.pos,
        sources.filter(s => s.id !== target.id)
      );
      const viaSkip = gravitational_acceleration_excluding(
        target.pos,
        sources,
        target.id
      );
      sameBits(viaSkip, viaFilter);
    }
  });

  test('equals it for a target that is not in the list at all', () => {
    const sources = makeSources(25, lcg(11));
    const pos = { x: 13.37, y: -420.5 };
    sameBits(
      gravitational_acceleration_excluding(pos, sources, 'nobody'),
      gravitational_acceleration(
        pos,
        sources.filter(s => s.id !== 'nobody')
      )
    );
  });

  test('skips every source sharing the id, as the filter did', () => {
    const sources = makeSources(12, lcg(3));
    sources[5].id = sources[2].id;
    const pos = { x: 1, y: 2 };
    sameBits(
      gravitational_acceleration_excluding(pos, sources, sources[2].id),
      gravitational_acceleration(
        pos,
        sources.filter(s => s.id !== sources[2].id)
      )
    );
  });

  test('an undefined id excludes the sources that have none, as the filter did', () => {
    const sources = makeSources(10, lcg(5));
    delete sources[4].id;
    delete sources[8].id;
    const pos = { x: -50, y: 75 };
    const viaFilter = gravitational_acceleration(
      pos,
      sources.filter(s => s.id !== undefined)
    );
    sameBits(
      gravitational_acceleration_excluding(pos, sources, undefined),
      viaFilter
    );
    // ...which is not what the plain sum does with them.
    const plain = gravitational_acceleration(pos, sources);
    expect(Object.is(plain.ax, viaFilter.ax)).toBe(false);
  });

  test('keeps the guards: a non-finite mass and a coincident source are skipped', () => {
    const sources = makeSources(8, lcg(9));
    sources[1].mass = NaN;
    sources[3].pos = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    sameBits(
      gravitational_acceleration_excluding(pos, sources, 'body-6'),
      gravitational_acceleration(
        pos,
        sources.filter(s => s.id !== 'body-6')
      )
    );
  });

  test('the two-argument call is the plain sum', () => {
    const sources = makeSources(9, lcg(2));
    const pos = { x: 9, y: 9 };
    const a = gravitational_acceleration(pos, sources);
    expect(Number.isFinite(a.ax) && Number.isFinite(a.ay)).toBe(true);
    sameBits(gravitational_acceleration_excluding(pos, sources, 'absent'), a);
  });
});

describe('computeAccelerations with mutual gravity', () => {
  const saved = {};
  beforeEach(() => {
    saved.mutual = physicsSettings.mutual_gravity;
    saved.sources = cachedMajorSources.slice();
    updatePhysicsSettings({ mutual_gravity: true });
  });
  afterEach(() => {
    updatePhysicsSettings({ mutual_gravity: saved.mutual });
    cachedMajorSources.length = 0;
    cachedMajorSources.push(...saved.sources);
  });

  test('gives every body the filtered-array answer, bit for bit', () => {
    const rand = lcg(21);
    const bodies = makeSources(30, rand);
    bodies[7].alive = false;
    cachedMajorSources.length = 0;
    cachedMajorSources.push(...bodies);
    const n = bodies.length;
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    computeAccelerations(bodies, n, null, false, ax, ay);
    for (let i = 0; i < n; i++) {
      if (!bodies[i].alive) {
        expect(ax[i]).toBe(0);
        continue;
      }
      const ref = gravitational_acceleration(
        bodies[i].pos,
        bodies.filter(s => s.id !== bodies[i].id)
      );
      expect(Object.is(ax[i], 0 + ref.ax)).toBe(true);
      expect(Object.is(ay[i], 0 + ref.ay)).toBe(true);
    }
  });
});
