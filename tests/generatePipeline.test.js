// The generate graph (tools/generate-graph.mjs), its orchestrator
// (tools/generate.mjs) and the merge tripwire (tools/generated-tripwire.mjs).
import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRAPH, order } from '../tools/generate-graph.mjs';
import { stale } from '../tools/generate.mjs';
import { dropped, handWritten, WATCHED } from '../tools/generated-tripwire.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ids = order().map(n => n.id);
const before = (a, b) => ids.indexOf(a) < ids.indexOf(b);

describe('the generate graph', () => {
  test('every node is named once, and every committed output exists', () => {
    expect(new Set(GRAPH.map(n => n.id)).size).toBe(GRAPH.length);
    for (const n of GRAPH.filter(x => !x.uncommitted))
      for (const out of n.outputs)
        expect({ out, exists: existsSync(path.join(ROOT, out)) }).toEqual({
          out,
          exists: true,
        });
  });

  test('keeps the order the artifacts need', () => {
    expect(before('capabilities', 'catalog')).toBe(true);
    expect(before('manifest', 'cards')).toBe(true);
    expect(before('build', 'docs')).toBe(true);
    // Everything that rewrites a precached file comes before its manifest.
    for (const id of [
      'capabilities',
      'catalog',
      'manifest',
      'cards',
      'teaching',
      'thumbnails',
      'scene',
      'irreversible',
      'validation-data',
    ])
      expect([id, before(id, 'sw')]).toEqual([id, true]);
  });

  test('a cycle, or an after that names nothing, is refused', () => {
    expect(() =>
      order([
        { id: 'a', after: ['b'] },
        { id: 'b', after: ['a'] },
      ])
    ).toThrow(/cycle/);
    expect(() => order([{ id: 'a', after: ['x'] }])).toThrow(/not a node/);
  });

  test('a node without a generator says what it needs, and one without a check names its test', () => {
    for (const n of GRAPH) {
      if (!n.generate) expect(typeof n.needs).toBe('string');
      if (!n.check && n.testedBy)
        expect(existsSync(path.join(ROOT, n.testedBy))).toBe(true);
    }
  });

  test('the npm checks of its nodes run through the orchestrator', () => {
    const scripts = JSON.parse(
      readFileSync(path.join(ROOT, 'package.json'), 'utf8')
    ).scripts;
    const routed = Object.values(scripts).filter(s =>
      s.startsWith('node tools/generate.mjs --check --only ')
    );
    const only = routed.map(s => s.split(' ').pop());
    for (const id of only) expect(ids).toContain(id);
    expect(only.length).toBeGreaterThanOrEqual(10);
  });
});

describe('what is stale', () => {
  const g = [
    { id: 'a', after: [] },
    { id: 'b', after: ['a'] },
    { id: 'c', after: [] },
  ];
  const digest = d => n => d[n.id];
  test('a changed input makes a node stale, and everything after it', () => {
    const now = { a: '2', b: '1', c: '1' };
    expect(
      [...stale(g, { a: '1', b: '1', c: '1' }, digest(now))].sort()
    ).toEqual(['a', 'b']);
  });
  test('nothing recorded is everything stale; nothing changed is nothing', () => {
    const now = { a: '1', b: '1', c: '1' };
    expect(stale(g, {}, digest(now)).size).toBe(3);
    expect(stale(g, now, digest(now)).size).toBe(0);
  });
});

describe('the merge tripwire', () => {
  const base = 'A\nB\nC\n';
  test('taking one side of a file loses what the other side added', () => {
    const ours = `${base}ours 1\nours 2\n`;
    const theirs = `${base}theirs 1\ntheirs 2\ntheirs 3\ntheirs 4\n`;
    const lost = dropped({ base, sides: [ours, theirs], merged: ours });
    expect(lost).toHaveLength(1);
    expect(lost[0].side).toBe(1);
    expect(lost[0].missing).toEqual([
      'theirs 1',
      'theirs 2',
      'theirs 3',
      'theirs 4',
    ]);
  });
  test('a deletion on one side, or a line reworded in resolving, is not a loss', () => {
    const ours = 'A\nC\n';
    const theirs = `${base}t1\nt2\nt3\nt4\nt5\nt6\nt7\nt8\nt9\nt10\nt11\n`;
    const merged =
      'A\nC\nt1\nt2\nt3\nt4\nt5\nt6\nt7\nt8\nt9\nt10\nt11, reworded\n';
    expect(dropped({ base, sides: [ours, theirs], merged })).toEqual([]);
  });
  test('generated regions do not count', () => {
    const m = handWritten(
      'keep\n<!--fact-block:x-->\nrow 1\nrow 2\n<!--/fact-block-->\nsaid <!--fact:n-->3<!--/fact--> times\n'
    );
    expect([...m.keys()]).toEqual(['keep', 'said  times']);
  });
  test('it watches the files the history named', () => {
    for (const f of [
      'README.md',
      'PHYSICS_VALIDATION.md',
      'model/index.html',
      'ACCESSIBILITY.md',
      'paper.md',
      'index.html',
      'js/i18n/en.js',
      'js/i18n/es.js',
    ])
      expect(WATCHED).toContain(f);
  });
});
