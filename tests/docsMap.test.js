// The documents map holds every root document, and the table cannot drift.
import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  MAP_BUILT,
  archiveProblems,
  derive,
  onboardingText,
  problems,
  render,
  rowProblems,
  readTable,
} from '../tools/docs-map.mjs';
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

  test('MAINTAINER_ONBOARDING.md carries the map block exactly as it is written', () => {
    expect(readFileSync('MAINTAINER_ONBOARDING.md', 'utf8')).toBe(
      onboardingText()
    );
    expect(derive()['MAINTAINER_ONBOARDING.md'].how).toBe('regions');
  });

  test('a document added after the map names its owner prompt and a real purpose', () => {
    const late = readTable().documents.filter(r => r.added > MAP_BUILT);
    expect(late.length).toBeGreaterThan(50);
    for (const r of late) {
      expect([r.file, Number.isInteger(r.owner)]).toEqual([r.file, true]);
      expect([r.file, r.purpose.length >= 35]).toEqual([r.file, true]);
    }
  });

  test('a row without a date is refused, and so is a late one without an owner', () => {
    const row = readTable().documents.find(r => r.owner === 127);
    expect(rowProblems(row)).toEqual([]);
    expect(rowProblems({ ...row, added: undefined })).toHaveLength(1);
    expect(rowProblems({ ...row, added: '2026-11-01', owner: null })).toEqual([
      expect.stringContaining('names no owner prompt'),
    ]);
    // Before the map, an owner may be unknown; a thin purpose never passes.
    expect(rowProblems({ ...row, added: '2026-09-01', owner: null })).toEqual(
      []
    );
    expect(rowProblems({ ...row, purpose: 'The thing.' })).toHaveLength(1);
  });

  test('the archive holds exactly what the table says, each under its dated header', () => {
    expect(archiveProblems()).toEqual([]);
    const listed = readTable()
      .archive.map(a => a.file)
      .sort();
    const there = readdirSync('docs/archive')
      .filter(f => f.endsWith('.md'))
      .sort();
    expect(there).toEqual(listed);
    // Moved, never left behind: nothing archived is still at the root.
    for (const f of listed) expect(existsSync(f)).toBe(false);
  });

  test('every root document in the repository is in the map (Prompt 289 acceptance)', () => {
    const rows = new Set(readTable().documents.map(r => r.file));
    for (const f of readdirSync('.').filter(f => f.endsWith('.md')))
      expect([f, rows.has(f)]).toEqual([f, true]);
  });

  test('the conformance report is a node of the generation graph', () => {
    const node = GRAPH.find(n => n.id === 'conformance');
    expect(node.outputs).toEqual(['ACCESSIBILITY_CONFORMANCE.md']);
    expect(derive()['ACCESSIBILITY_CONFORMANCE.md'].how).toBe('generated');
  });
});
