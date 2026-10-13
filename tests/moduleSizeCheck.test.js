/**
 * The module-size rule in tools/check-architecture.mjs (Prompt 107, step 4):
 * a ceiling per module, a default for modules without one, a ratchet that makes
 * the big modules fall with each slice, and the recorded file itself.
 */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  findSizeProblems,
  DEFAULT_SIZE_CEILING,
  SIZE_CEILINGS_FILE,
  buildGraph,
  moduleSizes,
} from '../tools/check-architecture.mjs';

const BIG = DEFAULT_SIZE_CEILING + 500;

describe('findSizeProblems', () => {
  test('a module at or under its ceiling is fine', () => {
    expect(
      findSizeProblems(new Map([['js/a.js', 100]]), { 'js/a.js': 100 })
    ).toEqual([]);
    expect(
      findSizeProblems(new Map([['js/a.js', 90]]), { 'js/a.js': 100 })
    ).toEqual([]);
  });

  test('growing past the ceiling fails', () => {
    const p = findSizeProblems(new Map([['js/a.js', 101]]), { 'js/a.js': 100 });
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(
      /grew past its ceiling: js\/a\.js has 101 lines, ceiling 100/
    );
  });

  test('a module without an entry is held to the default', () => {
    expect(
      findSizeProblems(new Map([['js/new.js', DEFAULT_SIZE_CEILING]]), {})
    ).toEqual([]);
    const p = findSizeProblems(
      new Map([['js/new.js', DEFAULT_SIZE_CEILING + 1]]),
      {}
    );
    expect(p[0]).toMatch(/Module too large: js\/new\.js/);
  });

  test('a big module must sit exactly at its ceiling, so each slice lowers it', () => {
    const p = findSizeProblems(new Map([['js/big.js', BIG - 10]]), {
      'js/big.js': BIG,
    });
    expect(p[0]).toMatch(/Ceiling not lowered/);
    expect(
      findSizeProblems(new Map([['js/big.js', BIG]]), { 'js/big.js': BIG })
    ).toEqual([]);
  });

  test('an entry for a module that is gone is stale', () => {
    const p = findSizeProblems(new Map(), { 'js/gone.js': 10 });
    expect(p[0]).toMatch(/Stale ceiling: js\/gone\.js/);
  });
});

describe('the recorded ceilings', () => {
  test('hold today: no module over its ceiling, the big ones exactly at it', async () => {
    const { ceilings } = JSON.parse(readFileSync(SIZE_CEILINGS_FILE, 'utf8'));
    const sizes = await moduleSizes(await buildGraph());
    expect(findSizeProblems(sizes, ceilings)).toEqual([]);
  });

  test('js/ui.js has a ceiling and it is below slice 3 (7,867 lines)', () => {
    const { ceilings } = JSON.parse(readFileSync(SIZE_CEILINGS_FILE, 'utf8'));
    expect(ceilings['js/ui.js']).toBeLessThan(7867);
  });
});
