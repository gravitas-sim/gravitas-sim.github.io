// =============================================================================
// The ensemble runner's validation contract and its pinned results (Prompt 265)
// -----------------------------------------------------------------------------
// tests/fixtures/experiments-ensemble/thresholds.json fixed every bound before any
// ensemble code existed; amendments.json records four amendments, each before the
// run it concerns and none moving a bound; tools/experiment-ensemble-validate.mjs
// judges the runner against them. This holds the pinned results.json and
// failed-legs.json to the thresholds and re-runs the validator in a child
// process. A failed leg stays failing: only Carl resets a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

const file = rel => new URL(`../${rel}`, import.meta.url);
const read = rel => JSON.parse(readFileSync(file(rel), 'utf8'));
const sha = rel =>
  createHash('sha256')
    .update(readFileSync(file(rel)))
    .digest('hex');
const DIR = 'tests/fixtures/experiments-ensemble';
const THR = read(`${DIR}/thresholds.json`);
const AMEND = read(`${DIR}/amendments.json`);
const RESULTS = read(`${DIR}/results.json`);
const FIRST = read(`${DIR}/first-run-results.json`);
const FAILED = read(`${DIR}/failed-legs.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row, and the only rows added are named by an amendment or a note', () => {
    const ids = RESULTS.checks.map(r => r.id);
    for (const c of THR.checks) expect(ids).toContain(c.id);
    expect(ids.filter(id => !THR.checks.some(c => c.id === id)).sort()).toEqual(
      ['A8b.regressionContextLab', 'B0.drawsAgree']
    );
  });

  test('the results and the oracle were made against these thresholds and amendments', () => {
    expect(RESULTS.thresholdsSha256).toBe(sha(`${DIR}/thresholds.json`));
    expect(RESULTS.amendmentsSha256).toBe(sha(`${DIR}/amendments.json`));
    expect(RESULTS.oracleSha256).toBe(sha(`${DIR}/oracle-results.json`));
    expect(ORACLE.thresholdsSha256).toBe(sha(`${DIR}/thresholds.json`));
    expect(ORACLE.noGravitasCode).toBe(true);
  });

  test('every amendment names its time and none moves a bound', () => {
    expect(AMEND.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
    ]);
    for (const a of AMEND.amendments) {
      expect(a.recordedBefore).toBeTruthy();
      expect(a.weakens).toBe(false);
    }
  });

  test('the first run is pinned beside the second, and the second differs only where AM4 says', () => {
    expect(FIRST.counts).toEqual({
      pass: 20,
      fail: 3,
      'not-applicable': 1,
      'not-run': 1,
    });
    const failedFirst = FIRST.checks
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failedFirst).toEqual([
      'A8.regressionContext',
      'A8b.regressionContextLab',
      'C3.injectionRecovery',
    ]);
    const changed = RESULTS.checks
      .filter(r => FIRST.checks.find(f => f.id === r.id)?.status !== r.status)
      .map(r => r.id);
    expect(changed).toEqual([
      'A8b.regressionContextLab',
      'C3.injectionRecovery',
    ]);
  });

  test('exactly one leg fails, it stays failing, and it is the one amendment AM3 said would', () => {
    expect(RESULTS.counts).toEqual({
      pass: 22,
      fail: 1,
      'not-applicable': 1,
      'not-run': 1,
    });
    expect(FAILED.failed.map(f => f.id)).toEqual(['A8.regressionContext']);
    const a8 = RESULTS.checks.find(r => r.id === 'A8.regressionContext');
    expect(a8.measured.relP90).toBeGreaterThan(
      THR.checks.find(c => c.id === 'A8.regressionContext').limits
        .maxRelDifference
    );
    expect(a8.measured.withinCommittedBound).toBe(true);
  });

  test('the legs that cannot be measured here are not passes', () => {
    expect(RESULTS.checks.find(r => r.id === 'F1.authenticData').status).toBe(
      'not-applicable'
    );
    expect(RESULTS.checks.find(r => r.id === 'F2.otherEngines').status).toBe(
      'not-run'
    );
  });

  test('the bounds that decide the legs are the committed ones', () => {
    for (const r of RESULTS.checks) {
      const c =
        THR.checks.find(x => x.id === r.id) ??
        THR.checks.find(x => x.id === 'A8.regressionContext');
      if (r.limit !== undefined && !r.id.startsWith('B0'))
        expect(r.limit).toEqual(c.limits);
    }
  });
});

describe('the validator, run again in a child process', () => {
  test('reproduces every status and the failing leg (about ten seconds)', () => {
    const out = execFileSync(
      process.execPath,
      [file('tools/experiment-ensemble-validate.mjs').pathname],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
      }
    );
    const rows = out
      .split('\n')
      .filter(l => /^(PASS|FAIL|NOT-RUN|NOT-APPLICABLE)\s/.test(l));
    const got = Object.fromEntries(
      rows.map(l => [
        l.trim().split(/\s+/)[1],
        l.trim().split(/\s+/)[0].toLowerCase(),
      ])
    );
    for (const r of RESULTS.checks) expect(got[r.id]).toBe(r.status);
  }, 180000);
});
