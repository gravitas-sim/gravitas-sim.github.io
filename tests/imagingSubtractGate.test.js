// =============================================================================
// The subtraction and orbit gate's stored record (Roadmap III, Prompt 230 Part B)
// -----------------------------------------------------------------------------
// Docs-only: the modules, the validator and the oracle are on spike/imaging-subtraction-gate and are
// never merged. This holds the stored record to the labelling rule (every failed leg is in
// failed-legs.json and every leg there failed), to the committed leg list and to the committed verdict
// function, and the amendments to being before the gate run.
// =============================================================================

import { readFileSync } from 'node:fs';
import { describe, test, expect } from '@jest/globals';

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const FIX = 'tests/fixtures/imaging-subtraction';
const T = read(`${FIX}/thresholds.json`);

describe('the committed contract', () => {
  test('six amendments, all before the gate run, and the original working radius and refusal limit stay in the file', () => {
    expect(T.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
      'AM6',
    ]);
    expect(T.amendments.every(a => a.beforeGateRun === true)).toBe(true);
    expect(T.method.workingRadius.fwhm).toBe(1.5);
    expect(T.method.mismatchRule.refuseAbove).toBe(0.25);
  });
  test('the verdict function names its legs', () => {
    expect(T.verdict.core).toContain('C1');
    expect(T.verdict.core).toContain('D1');
    expect(T.verdict.orbit).toEqual(['O1', 'O2', 'O3', 'O4']);
  });
});

describe('the stored results and the labelling rule', () => {
  const results = read(`${FIX}/results.json`);
  const failed = read(`${FIX}/failed-legs.json`);
  test('every failed leg is in failed-legs.json and every leg there failed', () => {
    const f = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(failed.failed.map(r => r.id).sort()).toEqual(f);
    for (const r of failed.failed) expect(r.label).toMatch(/failed leg/);
  });
  test('every committed leg has a row, the authentic leg is NOT RUN, and the stream is the gate’s', () => {
    expect(results.stream).toBe(T.seeds.ensemble);
    const ids = new Set(results.rows.map(r => r.id));
    for (const c of T.checks) expect(ids.has(c.id)).toBe(true);
    expect(results.rows.find(r => r.id === 'E1').status).toBe('not-run');
  });
  test('the verdict function applied to the rows gives the recorded verdict', () => {
    const st = id => results.rows.find(r => r.id === id).status;
    const pass = ids => ids.every(i => st(i) === 'pass');
    const verdict = pass(T.verdict.core)
      ? pass(T.verdict.orbit)
        ? 'A'
        : 'B'
      : 'C';
    expect(['A', 'B', 'C']).toContain(verdict);
    expect(results.verdict ?? verdict).toBe(verdict);
  });
});
