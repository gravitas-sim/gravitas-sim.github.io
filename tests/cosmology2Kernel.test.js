// =============================================================================
// The late-time FLRW kernel (Prompt 255, COSMOLOGY_II.md)
// -----------------------------------------------------------------------------
// Unit tests of the pure modules in js/kernels/cosmology/late/. The contract's legs against the
// independent oracle, the seeded ensemble and the degeneracy contours are tools/cosmology2-validate.mjs,
// held by tests/cosmology2Results.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as cosmology from '../js/kernels/cosmology/index.js';
import * as K from '../js/kernels/cosmology/late/index.js';
import { NEVER_PRECACHED } from '../tools/build-service-worker.mjs';
import { C_KMS, GYR_PER_INV_H0 } from '../js/kernels/cosmology/flrw.js';

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const codeOf = fn => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof K.FriedmannDomainError ? e.code : `other:${e.message}`;
  }
};

describe('the Friedmann equation and its closed forms', () => {
  test('Einstein-de Sitter: distance, lookback time and age have their elementary forms', () => {
    const c = K.createFriedmann({ H0: 70, Om: 1, Ode: 0 });
    const dh = C_KMS / 70;
    expect(rel(c.comovingDistance(3), 2 * dh * (1 - 1 / 2))).toBeLessThan(
      1e-12
    );
    expect(rel(c.age(), (2 / 3) * (GYR_PER_INV_H0 / 70))).toBeLessThan(1e-12);
    expect(c.decelerationParameter(5)).toBeCloseTo(0.5, 14);
    expect(c.transitionRedshift()).toEqual({
      z: null,
      reason: 'decelerating-today',
    });
    expect(c.geometry).toBe('flat');
  });
  test('an omitted Ode means flat; Ok is the closure; a closed set is accepted with sin geometry', () => {
    const flat = K.createFriedmann({ H0: 70, Om: 0.3 });
    expect(flat.Ode).toBeCloseTo(0.7, 15);
    expect(flat.geometry).toBe('flat');
    const closed = K.createFriedmann({ H0: 60, Om: 1.5, Ode: 0 });
    expect(closed.Ok).toBeCloseTo(-0.5, 15);
    expect(closed.geometry).toBe('closed');
    const dm = closed.transverseComovingDistance(2);
    const dc = closed.comovingDistance(2);
    const dh = C_KMS / 60;
    const s = Math.sqrt(0.5);
    expect(rel(dm, (dh / s) * Math.sin((s * dc) / dh))).toBeLessThan(1e-14);
  });
  test('radiation changes the early universe and leaves today alone: E(0) = 1 and q(z) rises toward 1 at high z', () => {
    const c = K.createFriedmann({ H0: 67, Om: 0.31, Or: 9e-5 });
    expect(Math.abs(c.E(0) - 1)).toBeLessThan(1e-15);
    const f = c.densityFractions(1e4);
    expect(f.radiation).toBeGreaterThan(0.7);
    expect(c.decelerationParameter(1e4)).toBeCloseTo(
      0.5 * (f.matter + 2 * f.radiation - 2 * f.darkEnergy),
      14
    );
    expect(c.decelerationParameter(1e4)).toBeGreaterThan(
      c.decelerationParameter(10)
    );
  });
  test('w = -1/3 dark energy has the same E(z) as curvature but does not bend the light', () => {
    const a = K.createFriedmann({ H0: 70, Om: 0.3, Ode: 0.5, w: -1 / 3 });
    const b = K.createFriedmann({ H0: 70, Om: 0.3, Ode: 0 });
    expect(rel(a.E(2), b.E(2))).toBeLessThan(1e-14);
    expect(a.comovingDistance(2)).toBeCloseTo(b.comovingDistance(2), 8);
    expect(
      Math.abs(
        a.transverseComovingDistance(2) - b.transverseComovingDistance(2)
      )
    ).toBeGreaterThan(1);
  });
  test('the error estimate rides beside every integral and is small', () => {
    const c = K.createFriedmann({ H0: 70, Om: 0.3 });
    for (const name of ['comoving', 'luminosity', 'lookback', 'ageAt', 'age']) {
      const q = c.quantity(name, 2);
      expect(Number.isFinite(q.error)).toBe(true);
      expect(q.error).toBeGreaterThan(0);
      expect(q.error / q.value).toBeLessThan(1e-9);
    }
    expect(c.quantity('comoving', 0)).toEqual({ value: 0, error: 0 });
  });
  test('the history table is consistent: fractions sum to 1, lookback plus age is the age', () => {
    const c = K.createFriedmann({ H0: 70, Om: 0.3, Or: 1e-4 });
    for (const row of c.history([0, 0.5, 2, 10])) {
      const f = row.fractions;
      expect(
        Math.abs(f.matter + f.radiation + f.curvature + f.darkEnergy - 1)
      ).toBeLessThan(1e-14);
      expect(rel(row.lookback + row.age, c.age())).toBeLessThan(1e-10);
    }
  });
  test('inputs are not changed and repeated calls are identical', () => {
    const p = Object.freeze({ H0: 70, Om: 0.3, Ode: 0.7, w: -0.9 });
    const a = K.createFriedmann(p).luminosityDistance(1.3);
    expect(K.createFriedmann(p).luminosityDistance(1.3)).toBe(a);
    expect(p).toEqual({ H0: 70, Om: 0.3, Ode: 0.7, w: -0.9 });
  });
});

describe('the domain and its refusals', () => {
  test('each refusal has its own code and an explanation', () => {
    const cases = [
      [{ H0: 70, Om: 0.05, Ode: 1.6 }, 'bounce'],
      [{ H0: 70, Om: -0.1, Ode: 0.7 }, 'negative-density'],
      [{ H0: 70, Om: 11, Ode: 0 }, 'density-out-of-domain'],
      [{ H0: 70, Om: 0.3, w: -3.1 }, 'w-out-of-domain'],
      [{ H0: 0, Om: 0.3 }, 'bad-H0'],
      [{ H0: 70, Om: NaN }, 'not-finite'],
      [{ H0: 70 }, 'bad-argument'],
    ];
    for (const [p, code] of cases) {
      let err = null;
      try {
        K.createFriedmann(p);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(K.FriedmannDomainError);
      expect(err.code).toBe(code);
      expect(K.REFUSAL_CODES).toContain(err.code);
      expect(err.message.length).toBeGreaterThanOrEqual(30);
    }
  });
  test('the order of codes: a set that breaks several rules gets the first in REFUSAL_CODES', () => {
    expect(
      codeOf(() => K.createFriedmann({ H0: 70, Om: 0.05, Ode: 1.6, w: -4 }))
    ).toBe('w-out-of-domain');
    expect(codeOf(() => K.createFriedmann({ H0: -1, Om: -1 }))).toBe('bad-H0');
  });
  test('redshift, antipode and age refusals happen at the call, not at construction', () => {
    const c = K.createFriedmann({ H0: 70, Om: 0.3 });
    expect(codeOf(() => c.luminosityDistance(-1))).toBe('z-out-of-domain');
    expect(codeOf(() => c.distanceModulus(0))).toBe('z-out-of-domain');
    const a = K.createFriedmann({ H0: 70, Om: 0.3, Ode: 1.4 });
    expect(Number.isFinite(a.luminosityDistance(1))).toBe(true);
    expect(codeOf(() => a.luminosityDistance(10000))).toBe('beyond-antipode');
    const ds = K.createFriedmann({ H0: 70, Om: 0, Or: 0, Ode: 1 });
    expect(codeOf(() => ds.age())).toBe('age-unbounded');
    expect(Number.isFinite(ds.lookbackTime(1))).toBe(true);
  });
  test('the transition redshift says why it is null', () => {
    expect(
      K.createFriedmann({ H0: 70, Om: 0, Or: 0, Ode: 1 }).transitionRedshift()
        .reason
    ).toBe('always-accelerating');
    expect(
      K.createFriedmann({ H0: 70, Om: 1, Ode: 0 }).transitionRedshift().reason
    ).toBe('decelerating-today');
    const t = K.createFriedmann({
      H0: 70,
      Om: 0.3,
      Ode: 0.7,
      w: -0.8,
    }).transitionRedshift();
    expect(t.z).toBeGreaterThan(0.3);
  });
});

describe('the degeneracy tool', () => {
  const base = { H0: 70, Om: 0.3, w: -0.9, flat: true };
  test('a contour reproduces its target and the direction is perpendicular to the gradient', () => {
    const c = K.distanceContour({
      base,
      z: 0.5,
      quantity: 'luminosity',
      x: { name: 'Om', min: 0.2, max: 0.4, n: 5 },
      y: { name: 'w', min: -3, max: 0 },
    });
    expect(c.points).toHaveLength(5);
    for (const p of c.points)
      expect(
        rel(
          K.quantityAt(base, { Om: p.x, w: p.y }, 0.5, 'luminosity'),
          c.target
        )
      ).toBeLessThan(1e-9);
    const d = K.degeneracyDirection({
      base,
      z: 0.5,
      quantity: 'luminosity',
      x: 'Om',
      y: 'w',
    });
    expect(
      Math.abs(d.tangent.x * d.gradient.dx + d.tangent.y * d.gradient.dy)
    ).toBeLessThan(1e-9);
    expect(d.slope).toBeLessThan(0);
  });
  test('an axis that is not allowed, and a target out of reach, are said, not guessed', () => {
    expect(
      codeOf(() =>
        K.degeneracyDirection({
          base,
          z: 1,
          quantity: 'luminosity',
          x: 'Om',
          y: 'Ode',
        })
      )
    ).toBe('bad-argument');
    expect(
      codeOf(() =>
        K.degeneracyDirection({ base, z: 1, quantity: 'nope', x: 'Om', y: 'w' })
      )
    ).toBe('bad-argument');
    const c = K.distanceContour({
      base,
      z: 0.5,
      quantity: 'luminosity',
      x: { name: 'Om', min: 0.2, max: 0.4, n: 3 },
      y: { name: 'w', min: -3, max: -2.5 },
    });
    expect(c.points).toHaveLength(0);
    expect(c.skipped.map(s => s.code)).toEqual([
      'no-root',
      'no-root',
      'no-root',
    ]);
  });
});

describe('the extension is held out of the shipped tree', () => {
  test('the cosmology index does not re-export it', () => {
    expect(cosmology.createCosmology).toBeDefined();
    expect(cosmology.createFriedmann).toBeUndefined();
    expect(cosmology.distanceContour).toBeUndefined();
  });
  test('NEVER_PRECACHED matches its files and its validation group', () => {
    const hit = p => NEVER_PRECACHED.some(re => re.test(p));
    expect(hit('js/kernels/cosmology/late/friedmann.js')).toBe(true);
    expect(hit('js/kernels/cosmology/late/degeneracy.js')).toBe(true);
    expect(hit('js/validation/groups/cosmology2.js')).toBe(true);
    expect(hit('js/kernels/cosmology/flrw.js')).toBe(false);
  });
});
