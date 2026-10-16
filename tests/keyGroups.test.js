import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { factorSource } from '../tools/key-groups.mjs';
import { keyGroups } from '../js/i18n/keyGroups.js';

// The production build writes a shared key prefix once (tools/key-groups.mjs).
// It is a change to bytes and to nothing else, and this holds it to that: each
// catalog the plugin rewrites is built as the site is built and run, and every
// export must be the same object with the same keys in the same order.

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

describe('keyGroups', () => {
  test('rebuilds keys, order, strings, arrays and a spread', () => {
    const out = keyGroups([
      'a.',
      { x: '1', y: '2' },
      'b',
      'three',
      'c.d',
      [['q']],
      0,
      { z: 9 },
      'e.',
      { 5: 'late' },
    ]);
    expect(Object.entries(out)).toEqual([
      ['a.x', '1'],
      ['a.y', '2'],
      ['b', 'three'],
      ['c.d', ['q']],
      ['z', 9],
      ['e.5', 'late'],
    ]);
  });

  test('a run of neighbours becomes one group and an integer-like tail never joins one', () => {
    const src = `export const X = { 'alpha.beta.c': '1', 'alpha.beta.d': '2', 'alpha.beta.0': '3', 'alpha.beta.e': '4', 'z.q': '5', 'z.r': '6' };`;
    const out = factorSource(src);
    expect(out.objects).toBe(1);
    expect(out.code).toContain('__keyGroups(');
    expect(out.code).not.toContain('"0":');
  });

  test('a group of groups rebuilds the same keys in the same order', () => {
    const out = keyGroups([
      'a.',
      {
        0: [
          'x.',
          { p: '1', q: '2' },
          'lone',
          ['v'],
          'y.',
          { r: { one: 'o', other: 'n' } },
        ],
      },
      'b',
      'three',
    ]);
    expect(Object.entries(out)).toEqual([
      ['a.x.p', '1'],
      ['a.x.q', '2'],
      ['a.lone', 'v'],
      ['a.y.r', { one: 'o', other: 'n' }],
      ['b', 'three'],
    ]);
  });

  test('the build nests a group whose members run in prefixed neighbourhoods', () => {
    const src = `export const X = {
      'a.x.p': 'one', 'a.x.q': 'two', 'a.x.r': 'three', 'a.y.s': 'four',
      'a.y.t': 'five', 'a.y.u': 'six', 'a.z.v': 'seven', 'a.z.w': 'eight',
      'a.z.k': 'nine', 'b.c': 'ten' };`;
    const out = factorSource(src);
    expect(out.code).toContain('{0:[');
    const list = out.code.slice(
      out.code.indexOf('__keyGroups(') + 12,
      out.code.lastIndexOf(');')
    );
    const rebuilt = keyGroups(Function(`return ${list}`)());
    expect(Object.entries(rebuilt).map(([k]) => k)).toEqual([
      'a.x.p',
      'a.x.q',
      'a.x.r',
      'a.y.s',
      'a.y.t',
      'a.y.u',
      'a.z.v',
      'a.z.w',
      'a.z.k',
      'b.c',
    ]);
    expect(rebuilt['a.z.k']).toBe('nine');
  });

  test('a file it cannot prove safe is left alone', () => {
    expect(
      factorSource(
        `export const X = { 'a.b': 1, 'a.b': 2, 'a.c': 3, 'a.d': 4, 'a.e': 5 };`
      )
    ).toBeNull();
    expect(
      factorSource(
        `export const X = { ['a.b']: 1, 'a.c': 3, 'a.d': 4, 'a.e': 5, 'a.f': 6 };`
      )
    ).toBeNull();
    expect(
      factorSource(`export const X = { a: 1, b: 2, c: 3, d: 4, e: 5 };`)
    ).toBeNull();
  });

  test('every catalog, built as the site is built, is the object its source declares', () => {
    // In a child process: esbuild checks that its encoder's output is a
    // Uint8Array, and under jest's module realm it is one from another realm.
    const out = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "const m = await import('./tools/key-groups-check.mjs');" +
            'console.log(JSON.stringify(await m.checkKeyGroups()));',
        ],
        { cwd: ROOT, encoding: 'utf8' }
      )
    );
    expect(out.checked).toBeGreaterThan(50);
    expect(out.rewritten).toBeGreaterThan(50);
    expect(out.problems).toEqual([]);
  }, 120_000);
});
