import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { loadRecord, render, OUT } from '../tools/evidence-status.mjs';

const record = loadRecord();
const CLASSES = ['S', 'V-internal', 'V-external', 'A', 'L'];
const STATUSES = ['established', 'partial', 'UNKNOWN'];

describe('the evidence-status record', () => {
  test('every record is complete, with a valid class and status', () => {
    const ids = record.claims.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of record.claims) {
      for (const k of ['claim', 'scope', 'version', 'method', 'evaluator', 'limitations', 'date'])
        expect([c.id, k, typeof c[k] === 'string' && c[k].length > 0]).toEqual([c.id, k, true]);
      expect(CLASSES).toContain(c.class);
      expect(STATUSES).toContain(c.status);
      expect(c.anchors.length).toBeGreaterThan(0);
    }
  });

  test('a non-software claim is never marked established without an artifact', () => {
    for (const c of record.claims.filter(x => x.class !== 'S' && x.class !== 'V-internal'))
      if (c.status !== 'UNKNOWN') expect([c.id, c.artifact.length > 0]).toEqual([c.id, true]);
  });

  test('every anchor is a line a public page still carries', () => {
    for (const c of record.claims)
      for (const a of c.anchors)
        expect([c.id, a.file, readFileSync(a.file, 'utf8').includes(a.text)]).toEqual([c.id, a.file, true]);
  });

  test('a claim-bearing line on a public page without a record fails', () => {
    const re = new RegExp(record.scan.patterns.join('|'), 'i');
    const anchors = record.claims.flatMap(c => c.anchors);
    const missing = [];
    for (const file of record.scan.files) {
      let text = readFileSync(file, 'utf8');
      const start = record.scan.section[file];
      if (start) {
        const i = text.indexOf(start);
        const j = text.indexOf('\n## [', i + 1);
        text = text.slice(i, j < 0 ? undefined : j);
      }
      text.split('\n').forEach((line, n) => {
        if (!re.test(line)) return;
        const covered = anchors.some(
          a => a.file === file && (line.includes(a.text) || a.text.includes(line.trim()))
        );
        if (!covered) missing.push(`${file}: ${line.trim()}`);
      });
    }
    expect(missing).toEqual([]);
  });

  test('docs/evidence-status.md is generated from the record', () => {
    expect(readFileSync(OUT, 'utf8')).toBe(render(record));
  });

  test('the four-column statement lists every class and every UNKNOWN', () => {
    const text = render(record);
    for (const h of ['Software works', 'Science valid', 'Adopted', 'Learning measured'])
      expect(text).toContain(h);
    for (const c of record.claims) expect(text).toContain(c.claim);
  });
});
