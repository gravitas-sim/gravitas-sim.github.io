// =============================================================================
// The orbital layer's contract (Prompt 148)
// -----------------------------------------------------------------------------
// js/orbital/layer.js converts elements to a state vector and back, in two
// dimensions and three, and refuses a mismatch of dimension, unit system, frame
// or time scale. The validation group (tools/orbital-cases.mjs, run by
// tests/orbitalLayerValidation.test.js) holds its numbers; this holds its
// shape: what a quantity is, what is frozen, how the pieces compose.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as L from '../js/orbital/layer.js';
import { solveKepler } from '../js/orbital.js';

const SIM = L.simulationUnits(2);
const AUD = L.PHYSICAL_UNITS['AU-day'];

const planar = (over = {}) =>
  L.keplerElements({
    dimension: 2,
    a: L.length(100, SIM),
    e: L.dimensionless(0.4),
    omega: L.degrees(30),
    anomaly: { type: 'mean', value: L.degrees(70) },
    epoch: L.instant(0, SIM, 'simulation'),
    mu: L.gm(2000, SIM),
    ...over,
  });

describe('typed quantities', () => {
  test('a quantity is frozen and says what it is', () => {
    const q = L.length(3, SIM);
    expect(q).toEqual({ value: 3, dim: 'length', units: SIM });
    expect(Object.isFrozen(q)).toBe(true);
    expect(L.degrees(180).value).toBe(Math.PI);
    expect(L.degrees(180).units).toBeNull();
  });

  test('the same simulation units are one object, and G is part of them', () => {
    expect(L.simulationUnits(2)).toBe(L.simulationUnits(2));
    expect(L.simulationUnits(2)).not.toBe(L.simulationUnits(9000));
    expect(L.simulationUnits(2).id).not.toBe(L.simulationUnits(null).id);
    expect(L.simulationUnits(1, 'code').length).toBe('code length');
    expect(() => L.simulationUnits(-1)).toThrow(L.OrbitalLayerError);
  });

  test('the enumerations are small and frozen', () => {
    expect(L.FRAMES).toEqual(['perifocal', 'primary-reference']);
    expect(L.TIME_SCALES).toEqual([
      'simulation',
      'code',
      'elapsed',
      'TT',
      'TDB',
      'UTC',
    ]);
    for (const list of [L.FRAMES, L.TIME_SCALES, L.DIMENSIONS, L.ANOMALY_TYPES])
      expect(Object.isFrozen(list)).toBe(true);
  });

  test('a refusal is an OrbitalLayerError with a code', () => {
    try {
      L.elementsToState(planar(), L.instant(1, SIM, 'TDB'));
    } catch (err) {
      expect(err).toBeInstanceOf(L.OrbitalLayerError);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('timeScale');
      return;
    }
    throw new Error('not refused');
  });

  test('principalAngle reduces to (-pi, pi]', () => {
    const p = x => L.principalAngle(L.angle(x)).value;
    expect(p(0)).toBe(0);
    expect(p(Math.PI)).toBe(Math.PI);
    expect(p(-Math.PI)).toBe(Math.PI);
    expect(p(3 * Math.PI + 0.5)).toBeCloseTo(-Math.PI + 0.5, 12);
    expect(p(-7)).toBeCloseTo(-7 + 2 * Math.PI, 12);
  });
});

describe('elements and states', () => {
  test('elements keep the unit system and the clock they were made in', () => {
    const el = planar();
    expect(el.units).toBe(SIM);
    expect(el.epoch.scale).toBe('simulation');
    expect(el.frame).toBe('primary-reference');
    expect(Object.isFrozen(el)).toBe(true);
    const s = L.elementsToState(el);
    expect(s.frame).toBe('primary-reference');
    expect(s.epoch).toBe(el.epoch);
    expect(s.r.units).toBe(SIM);
    expect(s.r.value).toHaveLength(2);
  });

  test('the state at the epoch is the state at t = epoch', () => {
    const el = planar({ epoch: L.instant(5, SIM, 'simulation') });
    const a = L.elementsToState(el);
    const b = L.elementsToState(el, L.instant(5, SIM, 'simulation'));
    expect(b.r.value).toEqual(a.r.value);
    expect(b.v.value).toEqual(a.v.value);
  });

  test('the perifocal state turned by toReferenceFrame is elementsToState, in both dimensions', () => {
    const kernel = L.keplerElements({
      dimension: 3,
      a: L.length(1.3, L.simulationUnits(1, 'code')),
      e: L.dimensionless(0.35),
      i: L.degrees(40),
      Omega: L.degrees(30),
      omega: L.degrees(60),
      anomaly: { type: 'mean', value: L.angle(1.1) },
      epoch: L.instant(0, L.simulationUnits(1, 'code'), 'code'),
      mu: L.gm(1.001, L.simulationUnits(1, 'code')),
    });
    for (const el of [planar(), kernel]) {
      const peri = L.perifocalState(el);
      expect(peri.frame).toBe('perifocal');
      const turned = L.toReferenceFrame(peri, el);
      const direct = L.elementsToState(el);
      expect(turned.r.value).toEqual(direct.r.value);
      expect(turned.v.value).toEqual(direct.v.value);
    }
  });

  test('perifocal: periapsis on x, motion along +y, z along the angular momentum', () => {
    const el = L.keplerElements({
      dimension: 3,
      a: L.length(2, SIM),
      e: L.dimensionless(0.5),
      i: L.degrees(70),
      Omega: L.degrees(20),
      omega: L.degrees(50),
      anomaly: { type: 'mean', value: L.angle(0) },
      epoch: L.instant(0, SIM, 'simulation'),
      mu: L.gm(3, SIM),
    });
    const p = L.perifocalState(el);
    expect(p.r.value[0]).toBeCloseTo(1, 14);
    expect(p.r.value[1]).toBe(0);
    expect(p.v.value[0]).toBeCloseTo(0, 14);
    expect(p.v.value[1]).toBeGreaterThan(0);
    expect(p.r.value[2]).toBe(0);
  });

  test('a clockwise planar orbit is the mirror image, and reads back as sense -1', () => {
    const pro = L.elementsToState(planar());
    const retro = L.elementsToState(planar({ sense: -1 }));
    const h = s => s.r.value[0] * s.v.value[1] - s.r.value[1] * s.v.value[0];
    expect(h(pro)).toBeGreaterThan(0);
    expect(h(retro)).toBeLessThan(0);
    expect(h(retro)).toBeCloseTo(-h(pro), 9);
    const back = L.stateToElements(retro, L.gm(2000, SIM));
    expect(back.sense).toBe(-1);
    expect(back.e.value).toBeCloseTo(0.4, 12);
    expect(back.a.value).toBeCloseTo(100, 9);
  });

  test('a period can stand in for mu, and advances the clock by it', () => {
    const P = 25;
    const el = L.keplerElements({
      dimension: 2,
      a: L.length(0.1, AUD),
      e: L.dimensionless(0.3),
      omega: L.angle(1),
      anomaly: { type: 'mean', value: L.angle(0.4) },
      epoch: L.instant(10, AUD, 'elapsed'),
      period: L.time(P, AUD),
    });
    expect(L.meanMotion(el)).toEqual(L.rate((2 * Math.PI) / P, AUD));
    expect(L.meanAnomalyAt(el).value).toBe(0.4);
    expect(
      L.meanAnomalyAt(el, L.instant(10 + P / 4, AUD, 'elapsed')).value
    ).toBeCloseTo(0.4 + Math.PI / 2, 12);
  });

  test('mu and a period together must agree; either alone is enough', () => {
    const spec = extra => ({
      dimension: 2,
      a: L.length(0.1, AUD),
      e: L.dimensionless(0.3),
      omega: L.angle(1),
      anomaly: { type: 'mean', value: L.angle(0.4) },
      epoch: L.instant(0, AUD, 'elapsed'),
      ...extra,
    });
    const mu = (4 * Math.PI ** 2 * 0.1 ** 3) / 25 ** 2;
    expect(() =>
      L.keplerElements(spec({ mu: L.gm(mu, AUD), period: L.time(25, AUD) }))
    ).not.toThrow();
    for (const [m, P] of [
      [mu, 26],
      [mu * 2, 25],
    ]) {
      try {
        L.keplerElements(spec({ mu: L.gm(m, AUD), period: L.time(P, AUD) }));
        throw new Error('not refused');
      } catch (err) {
        expect(err).toBeInstanceOf(L.OrbitalLayerError);
        expect(err.code).toBe('domain');
        expect(err.message).toMatch(/disagree/);
      }
    }
  });

  test('e, the period, the axis and mu refuse NaN and out-of-range values with code domain', () => {
    const code = over => {
      try {
        planar(over);
      } catch (err) {
        return err instanceof L.OrbitalLayerError ? err.code : 'other';
      }
      return 'not refused';
    };
    for (const e of [NaN, 1, 1.5, -0.1, Infinity])
      expect(code({ e: L.dimensionless(e) })).toBe('domain');
    expect(code({ a: L.length(NaN, SIM) })).toBe('domain');
    expect(code({ a: L.length(-1, SIM) })).toBe('domain');
    expect(code({ mu: L.gm(0, SIM) })).toBe('domain');
    expect(code({ mu: L.gm(-1, SIM) })).toBe('domain');
    expect(code({ mu: L.gm(NaN, SIM) })).toBe('domain');
    expect(code({ mu: undefined, period: L.time(NaN, SIM) })).toBe('domain');
    expect(code({ mu: undefined, period: L.time(-3, SIM) })).toBe('domain');
    expect(code({ e: L.dimensionless(1 - 1e-12) })).toBe('not refused');
  });

  test('the unit-system cache is bounded, and a system rebuilt after it is still compatible', () => {
    const first = L.simulationUnits(1.5);
    for (let k = 0; k < 200; k++) L.simulationUnits(10 + k);
    const again = L.simulationUnits(1.5);
    expect(again.id).toBe(first.id);
    expect(() => L.length(1, again)).not.toThrow();
    expect(L.simulationUnits(1.5)).toBe(again);
  });

  test('a state of an elements set is the state of its true anomaly', () => {
    const asTrue = L.convertAnomaly(
      { type: 'mean', value: L.degrees(70) },
      'true',
      L.dimensionless(0.4)
    );
    const a = L.elementsToState(planar());
    const b = L.elementsToState(planar({ anomaly: asTrue }));
    for (let k = 0; k < 2; k++) {
      expect(b.r.value[k]).toBeCloseTo(a.r.value[k], 10);
      expect(b.v.value[k]).toBeCloseTo(a.v.value[k], 12);
    }
  });
});

describe('anomalies', () => {
  const e = L.dimensionless(0.7);
  const mean = L.angle(2.2);

  test('mean to eccentric is js/orbital.js solveKepler, on the same turn', () => {
    const E = L.convertAnomaly({ type: 'mean', value: mean }, 'eccentric', e);
    expect(E.type).toBe('eccentric');
    expect(E.value.value).toBe(solveKepler(2.2, 0.7));
    const far = L.convertAnomaly(
      { type: 'mean', value: L.angle(2.2 + 4 * Math.PI) },
      'eccentric',
      e
    );
    expect(far.value.value - E.value.value).toBeCloseTo(4 * Math.PI, 12);
  });

  test('a conversion to the same kind returns the angle itself', () => {
    const same = L.convertAnomaly({ type: 'true', value: mean }, 'true', e);
    expect(same.value.value).toBe(2.2);
  });

  test('true, eccentric and mean agree around the orbit, ellipse and hyperbola', () => {
    for (const ecc of [0.2, 0.95, 1.7]) {
      for (const M of [-2.5, -0.3, 0.1, 1.9]) {
        const ee = L.dimensionless(ecc);
        const nu = L.convertAnomaly(
          { type: 'mean', value: L.angle(M) },
          'true',
          ee
        );
        const back = L.convertAnomaly(nu, 'mean', ee);
        expect(back.value.value).toBeCloseTo(M, 11);
      }
    }
  });

  test('the principal turn comes out of true anomalies', () => {
    const nu = L.convertAnomaly(
      { type: 'mean', value: L.angle(2.2 + 6 * Math.PI) },
      'true',
      e
    );
    expect(Math.abs(nu.value.value)).toBeLessThanOrEqual(Math.PI);
  });
});

describe('states back to elements', () => {
  test('the 3-D conventions: a hyperbola has a negative axis, a flat orbit has no node', () => {
    const U = L.simulationUnits(1, 'code');
    const hyper = L.keplerElements({
      dimension: 3,
      a: L.length(-2, U),
      e: L.dimensionless(1.8),
      i: L.angle(0),
      Omega: L.angle(0.5),
      omega: L.angle(0.7),
      anomaly: { type: 'mean', value: L.angle(0.3) },
      epoch: L.instant(0, U, 'code'),
      mu: L.gm(1, U),
    });
    expect(hyper.shape).toBe('hyperbola');
    const back = L.stateToElements(L.elementsToState(hyper), L.gm(1, U));
    expect(back.a.value).toBeCloseTo(-2, 12);
    expect(back.e.value).toBeCloseTo(1.8, 12);
    // Flat: the node is undefined and the kernel gives it to omega.
    expect(back.Omega.value).toBe(0);
    expect(back.omega.value).toBeCloseTo(1.2, 12);
    expect(back.trueAnomaly.value).toBeCloseTo(
      L.convertAnomaly(hyper.anomaly, 'true', hyper.e).value.value - 0,
      10
    );
  });

  test('a circular orbit has no periapsis: omega is 0 and the phase runs from the node', () => {
    const U = L.simulationUnits(1, 'code');
    const circ = L.keplerElements({
      dimension: 3,
      a: L.length(1, U),
      e: L.dimensionless(0),
      i: L.degrees(30),
      Omega: L.degrees(40),
      omega: L.degrees(10),
      anomaly: { type: 'mean', value: L.angle(1) },
      epoch: L.instant(0, U, 'code'),
      mu: L.gm(1, U),
    });
    const back = L.stateToElements(L.elementsToState(circ), L.gm(1, U));
    expect(back.omega.value).toBe(0);
    expect(back.Omega.value).toBeCloseTo(L.degrees(40).value, 12);
    expect(back.anomaly.value.value).toBeCloseTo(1 + L.degrees(10).value, 12);
  });

  test('planar elements read back carry the period, as the forward models need it', () => {
    const s = L.elementsToState(planar());
    const back = L.stateToElements(s, L.gm(2000, SIM));
    expect(back.period.value).toBeCloseTo(
      2 * Math.PI * Math.sqrt(100 ** 3 / 2000),
      9
    );
    expect(back.period.units).toBe(SIM);
    expect(back.epoch).toBe(s.epoch);
  });
});
