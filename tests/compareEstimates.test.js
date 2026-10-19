// Two estimates compared with their covariance (Prompt 151, part C).

import { describe, test, expect } from '@jest/globals';

import {
  compareEstimates,
  correlationBetween,
  describeComparison,
  erfc,
  sigmaOf,
  zForLevel,
} from '../js/compare/estimates.js';
import { EN_COMPARE } from '../js/i18n/en.compare.js';
import { ES_COMPARE } from '../js/i18n/es.compare.js';

const sigma = (value, s) => ({
  value,
  uncertainty: { kind: 'sigma', sigma: s },
});
const en = (id, vars = {}) =>
  (EN_COMPARE[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const es = (id, vars = {}) =>
  (ES_COMPARE[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

describe('the normal tail', () => {
  test('erfc agrees with published values on both sides of its switch', () => {
    expect(erfc(0)).toBe(1);
    expect(erfc(0.5)).toBeCloseTo(0.4795001221869535, 14);
    expect(erfc(1)).toBeCloseTo(0.15729920705028513, 13);
    expect(erfc(2)).toBeCloseTo(0.004677734981047266, 13);
    expect(erfc(3) / 2.209049699858544e-5).toBeCloseTo(1, 12);
    expect(erfc(5) / 1.5374597944280347e-12).toBeCloseTo(1, 12);
    expect(erfc(-1)).toBeCloseTo(2 - 0.15729920705028513, 13);
  });

  test('the interval multiplier matches the textbook values', () => {
    expect(zForLevel(0.6826894921370859)).toBeCloseTo(1, 9);
    expect(zForLevel(0.95)).toBeCloseTo(1.959963984540054, 9);
    expect(zForLevel(0.9973002039367398)).toBeCloseTo(3, 9);
  });
});

describe('Var(A - B) = Var(A) + Var(B) - 2 Cov(A, B)', () => {
  const a = sigma(10, 1);
  const b = sigma(12, 1);

  test('independent: the sum in quadrature, and it says it assumed that', () => {
    const r = compareEstimates(a, b);
    expect(r.ok).toBe(true);
    expect(r.difference).toBe(-2);
    expect(r.sigma).toBeCloseTo(Math.SQRT2, 14);
    expect(r.nSigma).toBeCloseTo(2 / Math.SQRT2, 14);
    expect(r.p).toBeCloseTo(0.15729920705028513, 12);
    expect(r.independent).toBe(true);
    expect(r.assumptions).toEqual(['gaussian', 'independent']);
  });

  test('a correlation coefficient shrinks the difference’s sigma', () => {
    const r = compareEstimates(a, b, { rho: 0.9 });
    expect(r.sigma).toBeCloseTo(Math.sqrt(2 - 2 * 0.9), 14);
    expect(r.nSigma).toBeGreaterThan(compareEstimates(a, b).nSigma);
    expect(r.independent).toBe(false);
    expect(r.assumptions).toEqual(['gaussian', 'covariance']);
  });

  test('a stated covariance wins over a coefficient, and anti-correlation widens', () => {
    expect(
      compareEstimates(a, b, { covariance: 0.5, rho: 0.9 }).covariance
    ).toBe(0.5);
    expect(compareEstimates(a, b, { rho: -0.5 }).sigma).toBeCloseTo(
      Math.sqrt(3),
      14
    );
  });

  test('perfectly correlated equal sigmas: the difference is exact', () => {
    const r = compareEstimates(a, b, { rho: 1 });
    expect(r.sigma).toBe(0);
    expect(r.nSigma).toBe(Infinity);
    expect(r.p).toBe(0);
    expect(compareEstimates(a, a, { rho: 1 }).nSigma).toBe(0);
  });

  test('known to share data with no coefficient: independent, and a louder caveat', () => {
    const r = compareEstimates(a, b, { shared: 'data' });
    expect(r.independent).toBe(true);
    expect(r.shared).toBe('data');
    expect(r.assumptions).toEqual(['gaussian', 'independent', 'sharedUnknown']);
    // With the coefficient given there is nothing left to caveat.
    expect(
      compareEstimates(a, b, { shared: 'data', rho: 0.5 }).assumptions
    ).toEqual(['gaussian', 'covariance']);
  });

  test('a covariance the uncertainties cannot allow is refused', () => {
    expect(compareEstimates(a, b, { covariance: 2 })).toEqual({
      ok: false,
      reason: 'covariance',
    });
    expect(compareEstimates(a, b, { rho: 1.5 }).reason).toBe('covariance');
  });
});

describe('what cannot be compared', () => {
  const ok = sigma(1, 0.1);
  test.each([
    ['none', { value: 1, uncertainty: { kind: 'none' } }],
    ['limit', { value: 1, uncertainty: { kind: 'limit', bound: 'upper' } }],
    ['failed', { value: 1, uncertainty: { kind: 'failed' } }],
    ['not-constrained', { value: 1, uncertainty: { kind: 'not-constrained' } }],
    [
      'asymmetric',
      { value: 1, uncertainty: { kind: 'interval', lo: 0.9, hi: 1.3 } },
    ],
    [
      'level',
      { value: 1, uncertainty: { kind: 'interval', lo: 0.9, hi: 1.1 } },
    ],
  ])('%s is refused, naming which', (reason, bad) => {
    expect(compareEstimates(ok, bad)).toEqual({
      ok: false,
      reason,
      which: 'b',
    });
    expect(compareEstimates(bad, ok)).toEqual({
      ok: false,
      reason,
      which: 'a',
    });
  });

  test('a missing value', () => {
    expect(compareEstimates({ value: null }, ok).reason).toBe('value');
  });
});

describe('the uncertainties it can use', () => {
  test('a symmetric interval with its level is a sigma', () => {
    const s = sigmaOf({
      value: 10,
      uncertainty: { kind: 'interval', lo: 8.04, hi: 11.96, level: 0.95 },
    });
    expect(s.sigma).toBeCloseTo(1, 3);
  });

  test('a model floor adds in quadrature with the statistical sigma', () => {
    expect(
      sigmaOf({
        value: 1,
        uncertainty: { kind: 'model-limited', floor: 0.3, sigma: 0.4 },
      }).sigma
    ).toBeCloseTo(0.5, 14);
  });

  test('an assumed value is exact', () => {
    expect(sigmaOf({ value: 1, uncertainty: { kind: 'assumed' } }).sigma).toBe(
      0
    );
  });
});

describe('the coefficient an envelope states', () => {
  const env = {
    quantities: [
      { id: 'a', correlatedWith: [{ id: 'b', rho: -0.6 }] },
      { id: 'b' },
      { id: 'c' },
    ],
  };
  test('is read from either side, or is null', () => {
    expect(correlationBetween(env, 'a', 'b')).toBe(-0.6);
    expect(correlationBetween(env, 'b', 'a')).toBe(-0.6);
    expect(correlationBetween(env, 'a', 'c')).toBeNull();
  });
});

describe('in words', () => {
  const a = sigma(10, 1);
  const b = sigma(12, 1);
  test('the difference, its significance and every assumption, in both languages', () => {
    for (const t of [en, es]) {
      const s = describeComparison(
        compareEstimates(a, b, { shared: 'data' }),
        t,
        {
          unit: 'm',
        }
      );
      expect(s).not.toMatch(/compareW\./);
      expect(s).toMatch(/1\.41/);
    }
    const english = describeComparison(compareEstimates(a, b), en);
    expect(english).toMatch(/independent/);
    expect(english).toMatch(/Gaussian/);
  });

  test('a refusal names which estimate', () => {
    const text = describeComparison(
      compareEstimates(a, { value: 1, uncertainty: { kind: 'none' } }),
      en
    );
    expect(text).toBe(
      'The second estimate states no uncertainty, so the two cannot be compared.'
    );
  });

  test('every message the module can ask for exists in both languages', () => {
    const reasons = [
      'value',
      'none',
      'asymmetric',
      'level',
      'limit',
      'failed',
      'not-constrained',
      'covariance',
    ];
    for (const id of [
      'compareW.est.result',
      'compareW.est.which.a',
      'compareW.est.which.b',
      'compareW.est.assume.gaussian',
      'compareW.est.assume.independent',
      'compareW.est.assume.covariance',
      'compareW.est.assume.sharedUnknown',
      ...reasons.map(r => `compareW.est.refused.${r}`),
    ]) {
      expect(EN_COMPARE[id]).toBeTruthy();
      expect(ES_COMPARE[id]).toBeTruthy();
    }
  });
});
