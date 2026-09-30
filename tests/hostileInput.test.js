// =============================================================================
// What a hostile file is refused for (Roadmap II, Prompt 67)
// -----------------------------------------------------------------------------
// The structural guard every JSON reader can call, and the pipeline reader,
// which recomputes from what a saved node says: a prototype key, a document
// nested or listed without end, a text the size of a file, and something that
// is not plain data are each refused with where they were found.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import { plainDataProblem } from '../js/platform/common.js';
import { readPipeline } from '../js/measure/pipeline.js';

describe('plain, bounded data', () => {
  test('what a saved document holds is plain', () => {
    expect(
      plainDataProblem({ a: 1, b: [1, 2, { c: 'x' }], d: null, e: true })
    ).toBe(null);
  });

  test('a prototype key is refused wherever it is, as JSON.parse makes one', () => {
    expect(plainDataProblem(JSON.parse('{"__proto__": {"x": 1}}'))).toBe(
      '__proto__: a prototype key'
    );
    expect(
      plainDataProblem(JSON.parse('{"a": [{"constructor": {}}]}'), {}, 'params')
    ).toBe('params.a[0].constructor: a prototype key');
  });

  test('without end is refused', () => {
    let deep = 1;
    for (let i = 0; i < 10; i++) deep = [deep];
    expect(plainDataProblem(deep)).toMatch(/nested too deep/);
    expect(plainDataProblem(new Array(5000).fill(0))).toMatch(
      /more than 1000 items/
    );
    expect(plainDataProblem('x'.repeat(2000))).toMatch(/longer than 1000/);
  });

  test('what is not data is refused', () => {
    expect(plainDataProblem(Infinity)).toMatch(/finite/);
    expect(plainDataProblem(new Date())).toMatch(/not plain data/);
    expect(plainDataProblem(() => 1)).toMatch(/not plain data/);
  });
});

describe('a saved pipeline', () => {
  const doc = params =>
    JSON.stringify({
      format: 'gravitas.pipeline',
      formatVersion: 1,
      workspace: {},
      nodes: [{ id: 'm1', tool: 'period', at: 0, params }],
    });

  test('opens when its parameters are plain', () => {
    expect(readPipeline(doc({ minPeriod: 0.3, maxPeriod: 1.2 })).ok).toBe(true);
  });

  test('is refused when a node’s parameters are not, with where', () => {
    const bad = readPipeline(
      doc({ minPeriod: 0.3, __proto__x: 1 }).replace('__proto__x', '__proto__')
    );
    expect(bad).toMatchObject({
      ok: false,
      code: 'badNode',
      detail: { id: 'm1', why: 'params.__proto__: a prototype key' },
    });
    expect(readPipeline(doc('everything')).detail.why).toBe(
      'params: not an object'
    );
  });
});
