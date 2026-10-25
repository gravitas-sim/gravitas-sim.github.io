// =============================================================================
// The orbital layer's validation group, and the promises around it (Prompt 148)
// -----------------------------------------------------------------------------
// tools/orbital-cases.mjs holds the cases (analytic, oracle, ensemble, negative,
// authentic); `npm run validate:orbital` prints them. This runs them in the
// suite, and holds ORBITAL_LAYER.md to what it says: the table has a row for
// every measure, the consumer table matches what the modules import, and the
// layer stays out of the instructor bundle's source list until the 3-D
// kernel's element readout moves onto it (that move is an instructor rebuild).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { CASES, runCase, KERNEL_CORPUS } from '../tools/orbital-cases.mjs';
import { REFERENCES } from '../js/lab3d/references.js';
import { sourcePathsFor } from '../tools/instructor-freshness.mjs';

const doc = readFileSync('ORBITAL_LAYER.md', 'utf8');
const block = name => {
  const a = doc.indexOf(`<!-- ${name}:begin -->`);
  const b = doc.indexOf(`<!-- ${name}:end -->`);
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  return doc.slice(a, b);
};
const cells = line =>
  line.split(/ \| /).map(c => c.replace(/^\|\s*|\s*\|\s*$/g, '').trim());

describe('the validation group', () => {
  const results = CASES.map(runCase);

  test('holds the five kinds of case the validation contract asks for', () => {
    const kinds = new Set(CASES.map(c => c.kind));
    expect([...kinds].sort()).toEqual(
      ['analytic', 'authentic', 'ensemble', 'negative', 'oracle'].sort()
    );
    expect(new Set(CASES.map(c => c.id)).size).toBe(CASES.length);
  });

  for (const c of results)
    test(`${c.id}: ${c.title}`, () => {
      for (const m of c.measures)
        expect([m.name, m.ok, m.value]).toEqual([m.name, true, m.value]);
    });

  test('every oracle that is a bit comparison counts differing bits against zero', () => {
    for (const c of results.filter(r => r.kind === 'oracle'))
      for (const m of c.measures.filter(x => /bits/.test(x.name)))
        expect([m.name, m.value, m.tolerance]).toEqual([m.name, 0, 0]);
  });

  test('the kernel corpus table is the one references.js builds from', () => {
    // The corpus is transcribed; O2 rebuilds the bodies of R1, R2, R6 and R7
    // from it. Here, that the references it names still exist.
    const ids = new Set(REFERENCES.map(r => r.id));
    for (const c of KERNEL_CORPUS)
      expect(ids.has(c.id.split(' ')[0])).toBe(true);
  });
});

describe('ORBITAL_LAYER.md', () => {
  test('the validation table has a row for every measure, with its bound, and all pass', () => {
    const rows = block('orbital-validation')
      .split('\n')
      .filter(l => l.startsWith('|'))
      .slice(2)
      .map(cells);
    const measures = CASES.flatMap(c => runCase(c).measures);
    expect(rows).toHaveLength(measures.length);
    rows.forEach((row, k) => {
      expect(row[2]).toContain(measures[k].name);
      expect(row[5]).toBe('pass');
    });
    for (const c of CASES) expect(doc).toContain(`**${c.id}** ${c.title}`);
  });

  test('the consumer table says what the modules do', () => {
    const rows = block('orbital-consumers')
      .split('\n')
      .filter(l => l.startsWith('|'))
      .slice(2)
      .map(cells);
    expect(rows.length).toBeGreaterThan(8);
    let adopted = 0;
    for (const [who, state] of rows) {
      const files = [...who.matchAll(/`(js\/[\w/.]+\.js)`/g)].map(m => m[1]);
      for (const f of files) {
        const imports = /from '(?:\.\.?\/)+orbital\/layer\.js'/.test(
          readFileSync(f, 'utf8')
        );
        if (state.includes('adopted')) {
          adopted++;
          expect([f, imports]).toEqual([f, true]);
        } else expect([f, imports]).toEqual([f, false]);
      }
    }
    expect(adopted).toBeGreaterThan(0);
  });
});

describe('the layer stays where it was put', () => {
  const source = readFileSync('js/orbital/layer.js', 'utf8');

  test('imports js/orbital.js and nothing else, and touches no DOM', () => {
    const specs = [...source.matchAll(/^import[^;]*?from '([^']+)'/gm)].map(
      m => m[1]
    );
    expect(specs).toEqual(['../orbital.js']);
    expect(source).not.toMatch(/\b(document|window|localStorage)\b/);
  });

  test('is outside the instructor bundle until js/lab3d/elements.js moves onto it', () => {
    const closure = new Set(sourcePathsFor('.'));
    expect(closure.has('js/lab3d/elements.js')).toBe(true);
    for (const f of [
      'js/orbital/layer.js',
      'js/orbital.js',
      'js/forward/system.js',
      'js/systemSpec.js',
    ])
      expect([f, closure.has(f)]).toEqual([f, false]);
  });
});
