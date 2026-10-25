// The documents map holds every root document, and the table cannot drift.
import { readFileSync } from 'node:fs';
import { derive, problems, render, readTable } from '../tools/docs-map.mjs';
import { GRAPH } from '../tools/generate-graph.mjs';

describe('DOCUMENTS.md', () => {
  test('the table, the root and the derived facts agree', () => {
    expect(problems()).toEqual([]);
  });

  test('the committed map is what the table and the tree render', () => {
    expect(readFileSync('DOCUMENTS.md', 'utf8')).toBe(render());
  });

  test('it lists every generated artifact node', () => {
    const text = readFileSync('DOCUMENTS.md', 'utf8');
    for (const n of GRAPH) expect(text).toContain(`| ${n.id} |`);
  });

  test('a document that carries generated regions says which generator', () => {
    const d = derive();
    for (const [file, i] of Object.entries(d))
      if (i.how !== 'written')
        expect([file, typeof i.generator]).toEqual([file, 'string']);
    expect(d['DOCUMENTS.md'].how).toBe('generated');
  });

  test('every row names a purpose of a sentence or less and a known owner shape', () => {
    for (const r of readTable().documents) {
      expect(r.purpose.length).toBeLessThan(200);
      expect(r.owner === null || Number.isInteger(r.owner)).toBe(true);
    }
  });
});
