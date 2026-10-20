// =============================================================================
// The numerical routines' validation group, and the promises around it
// (Prompt 152)
// -----------------------------------------------------------------------------
// tools/numeric-cases.mjs holds the cases (analytic, oracle, ensemble, negative,
// authentic); `npm run validate:numeric` prints them. This runs them in the
// suite, and holds NUMERICS.md and the install to what they say: the routine
// table has a row for every export, every case is in the validation table,
// the modules stay pure, and no shipped module imports one until the build has
// been told to install them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { CASES, runCase } from '../tools/numeric-cases.mjs';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

const doc = readFileSync('NUMERICS.md', 'utf8');
const block = name => {
  const a = doc.indexOf(`<!-- ${name}:begin -->`);
  const b = doc.indexOf(`<!-- ${name}:end -->`);
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  return doc.slice(a, b);
};
const modules = readdirSync('js/numeric').filter(f => f.endsWith('.js'));
const exportsOf = file =>
  [
    ...readFileSync(`js/numeric/${file}`, 'utf8').matchAll(
      /^export (?:async )?(?:function|const|class) (\w+)/gm
    ),
  ].map(m => m[1]);

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = path.posix.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });

describe('the validation group', () => {
  const results = CASES.map(runCase);

  test('holds the five kinds of case the validation contract asks for', () => {
    const kinds = new Set(CASES.map(c => c.kind));
    expect([...kinds].sort()).toEqual(
      ['analytic', 'authentic', 'ensemble', 'negative', 'oracle'].sort()
    );
    expect(new Set(CASES.map(c => c.id)).size).toBe(CASES.length);
    // Every routine family has at least one case of every kind.
    for (const family of new Set(CASES.map(c => c.family)))
      expect(
        new Set(CASES.filter(c => c.family === family).map(c => c.kind)).size
      ).toBe(5);
  });

  for (const c of results)
    test(`${c.id}: ${c.title}`, () => {
      for (const m of c.measures)
        expect([m.name, m.ok, m.value]).toEqual([m.name, true, m.value]);
    });

  test('every bit comparison counts differing bits against zero', () => {
    for (const c of results.filter(r => r.kind === 'oracle'))
      for (const m of c.measures.filter(x => /differing in a bit/.test(x.name)))
        expect([m.name, m.value, m.tolerance]).toEqual([m.name, 0, 0]);
  });
});

describe('the modules', () => {
  test('are the five the contract names', () => {
    expect(modules.sort()).toEqual([
      'interp.js',
      'linalg.js',
      'polyfit.js',
      'quadrature.js',
      'roots.js',
    ]);
  });

  test('import nothing, so a consumer pays for one file and no more', () => {
    for (const f of modules)
      expect(readFileSync(`js/numeric/${f}`, 'utf8')).not.toMatch(
        /^\s*import[\s{(]|\bimport\(/m
      );
  });

  test('draw no random number and read no clock', () => {
    for (const f of modules)
      expect(readFileSync(`js/numeric/${f}`, 'utf8')).not.toMatch(
        /Math\.random|Date\.now|performance\.now|new Date/
      );
  });
});

describe('NUMERICS.md', () => {
  test('the routine table has a row for every export, and only those', () => {
    const rows = block('numeric-routines')
      .split('\n')
      .filter(l => l.startsWith('| `'))
      .map(l => l.split('|').map(c => c.trim()));
    const listed = rows.map(
      r => `${r[1].replace(/`/g, '')}:${r[2].replace(/`/g, '')}`
    );
    const actual = modules.flatMap(f => exportsOf(f).map(e => `${f}:${e}`));
    expect(listed.sort()).toEqual(actual.sort());
    for (const r of rows) expect(r[4]).toMatch(/^\d{3}(, \d{3})*$/);
  });

  test('the validation table has a row for every case and measure, all passing', () => {
    const text = block('numeric-validation');
    for (const c of CASES) expect(text).toContain(`**${c.id}** ${c.title}`);
    const rows = text
      .split('\n')
      .filter(l => /^\| .* \| (pass|\*\*FAIL\*\*) \|$/.test(l));
    expect(rows.length).toBe(CASES.reduce((n, c) => n + c.run().length, 0));
    expect(rows.filter(l => /FAIL/.test(l))).toEqual([]);
  });
});

describe('the install', () => {
  const numeric = modules.map(f => `js/numeric/${f}`);

  test('does not list the routines while no shipped module imports one', async () => {
    for (const f of numeric)
      expect(NEVER_PRECACHED.some(re => re.test(f))).toBe(true);
    const { paths } = await buildManifest();
    expect(paths.filter(p => p.startsWith('js/numeric/'))).toEqual([]);
  });

  test('no shipped module imports one: the first consumer deletes the NEVER_PRECACHED line for js/numeric and this test with it', () => {
    // Modules a page can fetch. js/compute/ and js/validation/ are never
    // installed either, so they may import a routine without making one needed.
    const shipped = walk('js').filter(
      f =>
        !f.startsWith('js/numeric/') &&
        !NEVER_PRECACHED.some(re => re.test(f)) &&
        !f.startsWith('js/validation/')
    );
    const importing = shipped.filter(f =>
      /from\s+['"][./]*\/numeric\/|import\(\s*['"][./]*\/numeric\//.test(
        readFileSync(f, 'utf8')
      )
    );
    expect(importing).toEqual([]);
  });
});
