/**
 * The module-size rule in tools/check-architecture.mjs (Prompt 107, step 4;
 * model changed by D-DECOMP-22): a module of 1,500 lines or fewer needs no
 * entry and may grow freely; a module over 1,500 must be listed, exactly at its
 * ceiling, so each slice of the decomposition lowers it; --record-sizes only
 * lowers and removes.
 */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  findSizeProblems,
  recordSizes,
  DEFAULT_SIZE_CEILING,
  SIZE_CEILINGS_FILE,
  buildGraph,
  moduleSizes,
} from '../tools/check-architecture.mjs';

const LIMIT = DEFAULT_SIZE_CEILING;
const BIG = LIMIT + 500;

describe('findSizeProblems', () => {
  test('the limit is 1,500 lines', () => {
    expect(LIMIT).toBe(1500);
  });

  test('a small module needs no entry and may grow up to the limit', () => {
    for (const lines of [10, 179, 1499, LIMIT]) {
      expect(findSizeProblems(new Map([['js/small.js', lines]]), {})).toEqual(
        []
      );
    }
  });

  test('a small module can grow without a ceiling edit', () => {
    // Before and after one slice adds forty lines: same (empty) ceilings.
    expect(findSizeProblems(new Map([['js/small.js', 200]]), {})).toEqual([]);
    expect(findSizeProblems(new Map([['js/small.js', 240]]), {})).toEqual([]);
  });

  test('a module that crosses the limit without an entry fails, with what to do', () => {
    const p = findSizeProblems(new Map([['js/new.js', LIMIT + 1]]), {});
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/Module crossed 1,500 lines: js\/new\.js has 1501/);
    expect(p[0]).toMatch(/Split it, or add an entry/);
    expect(p[0]).toMatch(/DECISION_REGISTER row/);
  });

  test('a listed module over the limit, exactly at its ceiling, is fine', () => {
    expect(
      findSizeProblems(new Map([['js/big.js', BIG]]), { 'js/big.js': BIG })
    ).toEqual([]);
  });

  test('a listed module may not grow past its ceiling', () => {
    const p = findSizeProblems(new Map([['js/big.js', BIG + 1]]), {
      'js/big.js': BIG,
    });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(
      /grew past its ceiling: js\/big\.js has 2001 lines, ceiling 2000/
    );
  });

  test('a listed module must sit exactly at its ceiling, so each slice lowers it', () => {
    const p = findSizeProblems(new Map([['js/big.js', BIG - 10]]), {
      'js/big.js': BIG,
    });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/Ceiling not lowered/);
    expect(p[0]).toMatch(/--record-sizes/);
  });

  test('an entry for a module that fell to the limit or below is stale', () => {
    for (const lines of [LIMIT, LIMIT - 300]) {
      const p = findSizeProblems(new Map([['js/was-big.js', lines]]), {
        'js/was-big.js': BIG,
      });
      expect(p).toHaveLength(1);
      expect(p[0]).toMatch(/Stale ceiling: js\/was-big\.js/);
      expect(p[0]).toMatch(/--record-sizes/);
    }
  });

  test('an entry at or under the limit is stale even for a small module', () => {
    const p = findSizeProblems(new Map([['js/small.js', 100]]), {
      'js/small.js': 100,
    });
    expect(p[0]).toMatch(/Stale ceiling: js\/small\.js/);
  });

  test('an entry for a module that is gone is stale', () => {
    const p = findSizeProblems(new Map(), { 'js/gone.js': BIG });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/Stale ceiling: js\/gone\.js/);
    expect(p[0]).toMatch(/not a module any more/);
  });
});

describe('recordSizes (--record-sizes)', () => {
  test('lowers a listed module to its size', () => {
    const r = recordSizes(new Map([['js/big.js', BIG - 40]]), {
      'js/big.js': BIG,
    });
    expect(r.next).toEqual({ 'js/big.js': BIG - 40 });
    expect(r.lowered).toEqual(['js/big.js']);
    expect(r.removed).toEqual([]);
    expect(r.over).toEqual([]);
  });

  test('removes the entry of a module that fell to the limit, or is gone', () => {
    const r = recordSizes(
      new Map([
        ['js/was-big.js', LIMIT],
        ['js/still-big.js', BIG],
      ]),
      { 'js/was-big.js': BIG, 'js/gone.js': BIG, 'js/still-big.js': BIG }
    );
    expect(r.next).toEqual({ 'js/still-big.js': BIG });
    expect(r.removed.sort()).toEqual(['js/gone.js', 'js/was-big.js']);
  });

  test('never raises a ceiling: a module that grew is reported', () => {
    const r = recordSizes(new Map([['js/big.js', BIG + 25]]), {
      'js/big.js': BIG,
    });
    expect(r.next).toEqual({ 'js/big.js': BIG });
    expect(r.over).toEqual(['js/big.js']);
  });

  test('never adds an entry: a module that crossed the limit is reported', () => {
    const r = recordSizes(
      new Map([
        ['js/new.js', LIMIT + 1],
        ['js/small.js', 50],
      ]),
      {}
    );
    expect(r.next).toEqual({});
    expect(r.unlisted).toEqual(['js/new.js']);
  });

  test('its output always satisfies the check, apart from a crossing or a growth', () => {
    const sizes = new Map([
      ['js/a.js', BIG - 5],
      ['js/b.js', 40],
      ['js/c.js', LIMIT - 1],
    ]);
    const { next } = recordSizes(sizes, {
      'js/a.js': BIG,
      'js/b.js': 40,
      'js/c.js': BIG,
    });
    expect(findSizeProblems(sizes, next)).toEqual([]);
  });
});

describe('the recorded ceilings', () => {
  const read = () => JSON.parse(readFileSync(SIZE_CEILINGS_FILE, 'utf8'));

  test('hold today: no module over 1,500 unlisted, each listed one exactly at its ceiling', async () => {
    const sizes = await moduleSizes(await buildGraph());
    expect(findSizeProblems(sizes, read().ceilings)).toEqual([]);
  });

  test('the file lists only modules over the limit', () => {
    for (const [file, ceiling] of Object.entries(read().ceilings)) {
      expect([file, ceiling > LIMIT]).toEqual([file, true]);
    }
  });

  test('js/ui.js is under the limit and so has no entry', async () => {
    const { ceilings } = read();
    const sizes = await moduleSizes(await buildGraph());
    expect(ceilings['js/ui.js']).toBeUndefined();
    expect(sizes.get('js/ui.js')).toBeLessThanOrEqual(LIMIT);
  });
});
