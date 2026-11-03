// The pinned validation table of Prompt 229 (tests/fixtures/occurrence/results.json, from
// `npm run occurrence:validate -- --write-results`) held against the committed thresholds and the
// labelled failed legs: a leg that crossed its bound stays failing and recorded, nothing else fails,
// and the authentic leg is NOT RUN. The live legs are quick ones re-run in tests/occurrenceKernel.test.js.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

const read = name =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/occurrence/${name}.json`, import.meta.url),
      'utf8'
    )
  );
const thr = read('thresholds');
const res = read('results');
const failed = read('failed-legs');

describe('the pinned validation table', () => {
  test('every committed leg has a row, in order, and the verdict is the one the rule gives', () => {
    const ids = new Set(res.rows.map(r => r.id));
    for (const c of thr.checks) expect(ids.has(c.id)).toBe(true);
    expect(res.verdict).toBe('A');
  });
  test('the legs that crossed their bound are labelled and nothing else failed', () => {
    const fails = res.rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(fails).toEqual(failed.failed.map(f => f.id));
    expect(fails).toEqual(['D4', 'D4b']);
    for (const f of failed.failed) expect(f.note).toMatch(/\S/);
  });
  test('the amendment is recorded and the original stays failing', () => {
    expect(thr.amendments.map(a => a.id)).toEqual(['AM1']);
    expect(res.rows.find(r => r.id === 'D4').status).toBe('fail');
  });
  test('the authentic leg was not run and says why', () => {
    const e1 = res.rows.find(r => r.id === 'E1');
    expect(e1.status).toBe('not-run');
    expect(e1.note).toMatch(/supplied/);
  });
  test('the oracle legs agree to the bounds the file committed', () => {
    const row = id => res.rows.find(r => r.id === id).measured;
    expect(row('B1').worstRich).toBeLessThanOrEqual(
      thr.checks.find(c => c.id === 'B1').limits.rich
    );
    expect(row('B1').worstSparse).toBeLessThanOrEqual(
      thr.checks.find(c => c.id === 'B1').limits.sparse
    );
    expect(row('B2').worstRelative).toBeLessThanOrEqual(0.1);
    expect(row('C1').populations).toBe(400);
  });
});
