// Correlated inputs in the formula engine (Prompt 151, part D): the cross terms
// 2 rho gj gk sj sk are added when coefficients are given and used, the rule
// says so, and with none given the inputs are independent, as they were.

import { describe, test, expect } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';

import { evaluate, RULE } from '../js/formula/engine.js';
import { FormulaError, useNumberReader } from '../js/formula/parse.js';
import {
  RULE_CORRELATED,
  checkCorrelations,
  derivationEnvelope,
} from '../js/formula/evidence.js';
import { correlationsOf } from '../js/notebook/derivedEntry.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { parseNumber } from '../js/answerParse.js';
import { EN_FORMULA } from '../js/i18n/en.formula.js';
import { ES_FORMULA } from '../js/i18n/es.formula.js';

useNumberReader(parseNumber);
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.TextEncoder ??= TextEncoder;

const inputs = {
  x: { value: 3, unit: 'm', sigma: 0.1, uncertainty: 'sigma' },
  y: { value: 4, unit: 'm', sigma: 0.2, uncertainty: 'sigma' },
  z: { value: 1, unit: 'm', sigma: 0.1, uncertainty: 'sigma' },
};
const rho = (a, b, r) => ({ a, b, rho: r });
const refused = (src, correlations) => {
  try {
    const r = evaluate(src, inputs, { correlations });
    checkCorrelations(correlations, r.info.inputs);
  } catch (e) {
    if (e instanceof FormulaError) return e.code;
    throw e;
  }
  return null;
};

describe('the cross terms', () => {
  test('no coefficient is the independent case, unchanged', () => {
    const r = evaluate('x + y', inputs);
    expect(r.sigma).toBeCloseTo(Math.hypot(0.1, 0.2), 12);
    expect(r.info.rule).toBe('first-order');
    expect(evaluate('x + y', inputs, { correlations: [] }).info.rule).toBe(
      'first-order'
    );
  });

  test('a sum of positively correlated inputs widens, a difference narrows', () => {
    const sum = evaluate('x + y', inputs, { correlations: [rho('x', 'y', 1)] });
    expect(sum.sigma).toBeCloseTo(0.3, 12);
    expect(sum.info.correlated).toBe(true);
    expect(
      evaluate('x - y', inputs, { correlations: [rho('x', 'y', 1)] }).sigma
    ).toBeCloseTo(0.1, 12);
    expect(
      evaluate('x + y', inputs, { correlations: [rho('x', 'y', -1)] }).sigma
    ).toBeCloseTo(0.1, 12);
  });

  test('an intermediate coefficient is the textbook covariance', () => {
    const r = evaluate('x + y', inputs, { correlations: [rho('x', 'y', 0.5)] });
    expect(r.sigma).toBeCloseTo(Math.sqrt(0.01 + 0.04 + 0.02), 12);
  });

  test('the order of the pair does not matter', () => {
    const a = evaluate('x * y', inputs, { correlations: [rho('x', 'y', 0.3)] });
    const b = evaluate('x * y', inputs, { correlations: [rho('y', 'x', 0.3)] });
    expect(a.sigma).toBeCloseTo(b.sigma, 14);
  });

  test('a coefficient for an input the formula does not read changes nothing', () => {
    const r = evaluate('x + y', inputs, { correlations: [rho('x', 'z', 0.9)] });
    expect(r.info.correlated).toBe(false);
    expect(r.sigma).toBeCloseTo(Math.hypot(0.1, 0.2), 12);
  });

  test('a zero coefficient is independence', () => {
    expect(
      evaluate('x + y', inputs, { correlations: [rho('x', 'y', 0)] }).info.rule
    ).toBe('first-order');
  });

  test('a quantity used twice is still differentiated once', () => {
    // x - x is exactly zero whatever the coefficients are.
    const r = evaluate('x - x', inputs, { correlations: [rho('x', 'y', 0.5)] });
    expect(r.sigma).toBe(0);
  });
});

describe('what it refuses', () => {
  test('a coefficient outside -1 to 1, or an input with itself', () => {
    expect(refused('x + y', [rho('x', 'y', 1.5)])).toBe('correlation');
    expect(refused('x + y', [rho('x', 'x', 0.5)])).toBe('correlation');
  });

  test('two different values for one pair', () => {
    expect(refused('x + y', [rho('x', 'y', 0.2), rho('y', 'x', 0.4)])).toBe(
      'correlation'
    );
  });

  test('a valid set passes', () => {
    expect(
      refused('x + y + z', [rho('x', 'y', 0.5), rho('y', 'z', 0.5)])
    ).toBeNull();
  });

  test('a set that is not a correlation matrix', () => {
    expect(
      refused('x + y + z', [
        rho('x', 'y', 1),
        rho('y', 'z', 1),
        rho('x', 'z', -1),
      ])
    ).toBe('correlation');
    expect(
      refused('x + y + z', [
        rho('x', 'y', 0.9),
        rho('y', 'z', 0.9),
        rho('x', 'z', -0.9),
      ])
    ).toBe('correlation');
  });

  test('both languages say it', () => {
    expect(EN_FORMULA['formula.err.correlation']).toBeTruthy();
    expect(ES_FORMULA['formula.err.correlation']).toBeTruthy();
    expect(EN_FORMULA['obs.formula.why.first-order-correlated']).toBeTruthy();
    expect(ES_FORMULA['obs.formula.why.first-order-correlated']).toBeTruthy();
  });
});

describe('the envelope and the entry', () => {
  const read = [
    { name: 'x', id: 'e1#0', value: 3, unit: 'm', sigma: 0.1 },
    { name: 'y', id: 'e1#1', value: 4, unit: 'm', sigma: 0.2 },
  ];

  test('records the coefficients it used, by input id, and the rule', async () => {
    const correlations = [rho('x', 'y', 0.5)];
    const result = evaluate('x + y', inputs, { correlations });
    const env = await derivationEnvelope({
      id: 'derived:sum',
      formula: 'x + y',
      result,
      inputs: read,
      correlations,
    });
    expect(validateArtifact(env)).toEqual([]);
    const d = env.provenance.derivation;
    expect(d.rule).toBe(RULE_CORRELATED);
    expect(d.correlations).toEqual([{ a: 'e1#0', b: 'e1#1', rho: 0.5 }]);
  });

  test('without coefficients the record and its digest are what they were', async () => {
    const result = evaluate('x + y', inputs);
    const plain = await derivationEnvelope({
      id: 'derived:sum',
      formula: 'x + y',
      result,
      inputs: read,
    });
    const empty = await derivationEnvelope({
      id: 'derived:sum',
      formula: 'x + y',
      result,
      inputs: read,
      correlations: [],
    });
    expect(plain.provenance.derivation.rule).toBe(RULE);
    expect(plain.provenance.derivation.correlations).toBeUndefined();
    expect(plain.source.digest).toBe(empty.source.digest);
  });

  test('the coefficients are part of what the result was made of', async () => {
    const make = async rhoValue => {
      const correlations = [rho('x', 'y', rhoValue)];
      return derivationEnvelope({
        id: 'd',
        formula: 'x + y',
        result: evaluate('x + y', inputs, { correlations }),
        inputs: read,
        correlations,
      });
    };
    expect((await make(0.5)).source.digest).not.toBe(
      (await make(0.6)).source.digest
    );
  });

  test('correlationsOf reads an envelope’s coefficients within one entry only', () => {
    const e1 = {};
    const e2 = {};
    const qs = [
      {
        name: 'q1',
        entry: e1,
        envId: 'a',
        correlatedWith: [{ id: 'b', rho: 0.4 }],
      },
      { name: 'q2', entry: e1, envId: 'b', correlatedWith: [] },
      { name: 'q3', entry: e2, envId: 'b', correlatedWith: [] },
    ];
    expect(correlationsOf(qs)).toEqual([rho('q1', 'q2', 0.4)]);
  });
});

describe('through the notebook', () => {
  test('a derived quantity from two correlated results of one fit uses their coefficient', async () => {
    const { artifactEntry } = await import('../js/notebook/artifactEntry.js');
    const { derivedEntry, namedQuantities } =
      await import('../js/notebook/derivedEntry.js');
    const { artifact } = await import('../js/platform/artifact.js');
    const sigma = s => ({ kind: 'sigma', sigma: s, basis: 'data' });
    const env = artifact({
      id: 'fit:one',
      source: { kind: 'inference', id: 'fit', digest: 'f'.repeat(64) },
      quantities: [
        {
          id: 'a',
          value: 3,
          unit: 'm',
          uncertainty: sigma(0.1),
          origin: 'fitted',
          correlatedWith: [{ id: 'b', rho: -1, basis: 'fit' }],
        },
        {
          id: 'b',
          value: 4,
          unit: 'm',
          uncertainty: sigma(0.1),
          origin: 'fitted',
          correlatedWith: [{ id: 'a', rho: -1, basis: 'fit' }],
        },
      ],
    });
    const entry = artifactEntry({
      source: 'inference-fit',
      envelope: env,
      title: 'a fit',
    });
    const qs = namedQuantities([entry]);
    expect(correlationsOf(qs)).toEqual([rho('q1', 'q2', -1)]);
    const sum = await derivedEntry({
      formula: 'q1 + q2',
      title: 'the sum',
      quantities: qs,
    });
    // Perfectly anti-correlated: the sum has no uncertainty left.
    expect(sum.snapshot.artifact.quantities[0].uncertainty.sigma).toBeCloseTo(
      0,
      12
    );
    expect(sum.snapshot.artifact.provenance.derivation.rule).toBe(
      RULE_CORRELATED
    );
  });
});
