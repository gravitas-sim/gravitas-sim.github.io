import { describe, test, expect } from '@jest/globals';
import {
  AXES,
  perturb,
  systemExtent,
  describePerturbation,
  differencesBetween,
} from '../js/experiments/perturbation.js';
import { hashState } from '../js/experiments/canonicalState.js';

// A perturbation has to be exactly one number, applied to a copy, and
// reportable afterwards. Each of those is a test.

const state = () => ({
  v: 1,
  s: 'Three-Body Sensitivity Lab',
  seed: 'chaos-lab',
  b: [
    { id: 0, name: 'Alpha', pos: { x: 50, y: 0 }, vel: { x: 0, y: 11.8 } },
    {
      id: 1,
      name: 'Beta',
      pos: { x: -25, y: 43.3 },
      vel: { x: -10.2, y: -5.9 },
    },
    {
      id: 2,
      name: 'Gamma',
      pos: { x: -25, y: -43.3 },
      vel: { x: 10.2, y: -5.9 },
    },
  ],
});

describe('applying a perturbation', () => {
  test('changes exactly one number', () => {
    const before = state();
    const { ok, payload, applied } = perturb(before, {
      bodyId: 0,
      axis: 'x',
      delta: 1e-3,
    });
    expect(ok).toBe(true);
    expect(payload.b[0].pos.x).toBeCloseTo(50.001, 12);
    expect(applied).toMatchObject({
      bodyId: 0,
      bodyName: 'Alpha',
      axis: 'x',
      delta: 1e-3,
      before: 50,
    });
    const diff = differencesBetween(before, payload);
    expect(diff.ok).toBe(true);
    expect(diff.differences.length).toBe(1);
  });

  test('does not touch the state it was given', () => {
    const original = state();
    const snapshot = JSON.stringify(original);
    perturb(original, { bodyId: 0, axis: 'x', delta: 5 });
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  test('gives the perturbed state a different hash', () => {
    const before = state();
    const { payload } = perturb(before, { bodyId: 1, axis: 'vy', delta: 1e-4 });
    expect(hashState(payload)).not.toBe(hashState(before));
  });

  test('works on every axis it advertises', () => {
    for (const axis of AXES) {
      const { ok, applied } = perturb(state(), { bodyId: 2, axis, delta: 0.5 });
      expect(ok).toBe(true);
      expect(applied.after - applied.before).toBeCloseTo(0.5, 12);
    }
  });

  test('refuses a body that is not there', () => {
    expect(perturb(state(), { bodyId: 99, axis: 'x', delta: 1 }).reason).toBe(
      'no-such-body'
    );
  });

  test('refuses an axis that is not a coordinate', () => {
    expect(perturb(state(), { bodyId: 0, axis: 'mass', delta: 1 }).reason).toBe(
      'bad-axis'
    );
  });

  test('refuses a perturbation of zero, which is not an experiment', () => {
    expect(perturb(state(), { bodyId: 0, axis: 'x', delta: 0 }).reason).toBe(
      'bad-delta'
    );
    expect(perturb(state(), { bodyId: 0, axis: 'x', delta: NaN }).reason).toBe(
      'bad-delta'
    );
  });

  test('refuses a state with no bodies in it', () => {
    expect(
      perturb({ v: 1, s: 'X' }, { bodyId: 0, axis: 'x', delta: 1 }).reason
    ).toBe('no-bodies');
  });
});

describe('describing it', () => {
  test('reports the size in kilometres and as a fraction of the system', () => {
    const s = state();
    const { applied } = perturb(s, { bodyId: 0, axis: 'x', delta: 1e-3 });
    const extent = systemExtent(s);
    const d = describePerturbation(applied, extent);
    // 1e-3 simulation units is 1e-5 AU, about 1,496 km.
    expect(d.km).toBeCloseTo(1495.98, 1);
    expect(d.axisLabel).toBe('x position');
    // The triangle is 86.6 units on a side.
    expect(extent).toBeCloseTo(86.6, 1);
    expect(d.fraction).toBeCloseTo(1.155e-5, 8);
  });

  test('has no fraction to report when the system has no extent', () => {
    expect(
      describePerturbation({ delta: 1, axis: 'x' }, 0).fraction
    ).toBeNull();
  });
});

describe('checking that a comparison is controlled', () => {
  test('one changed coordinate is a valid experiment', () => {
    const a = state();
    const { payload } = perturb(a, { bodyId: 0, axis: 'x', delta: 1e-3 });
    expect(differencesBetween(a, payload).ok).toBe(true);
  });

  test('two changed coordinates is not', () => {
    const a = state();
    const one = perturb(a, { bodyId: 0, axis: 'x', delta: 1e-3 }).payload;
    const two = perturb(one, { bodyId: 1, axis: 'y', delta: 1e-3 }).payload;
    const check = differencesBetween(a, two);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('more-than-one-coordinate');
    expect(check.differences.length).toBe(2);
  });

  test('no change at all is reported as identical, not as valid', () => {
    const a = state();
    const check = differencesBetween(a, state());
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('identical');
  });

  test('a different set of bodies is not a comparison', () => {
    const a = state();
    const b = state();
    b.b.pop();
    expect(differencesBetween(a, b).reason).toBe('different-body-counts');
  });
});
