// =============================================================================
// The crossmatch gate's record (Prompt 263)
// -----------------------------------------------------------------------------
// Reads tests/fixtures/crossmatch/ and holds the pinned runs to the committed
// contract without re-running the ensembles (tools/crossmatch-validate.mjs and
// tools/clustering-validate.mjs do that): every committed check has one row, the
// failing rows are exactly the failed-legs file, the verdict is the function the
// thresholds state, the oracle was run against the thresholds file that is in
// the tree, and the clustering verdict follows its own function.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const read = name =>
  readFileSync(
    new URL(`./fixtures/crossmatch/${name}`, import.meta.url),
    'utf8'
  );
const json = name => JSON.parse(read(name));
const thresholds = json('thresholds.json');
const results = json('results.json');
const followUp = json('followup-results.json');
const failed = json('failed-legs.json');
const oracle = json('oracle-results.json');
const clThr = json('clustering-thresholds.json');
const clRes = json('clustering-results.json');

describe('the crossmatch kernel legs', () => {
  test('every committed check has exactly one row, and no row is uncommitted', () => {
    const ids = thresholds.checks.map(c => c.id).sort();
    expect(results.rows.map(r => r.id).sort()).toEqual(ids);
    expect(followUp.rows.map(r => r.id).sort()).toEqual(
      thresholds.followUp.checks.map(c => c.id).sort()
    );
  });

  test('the committed kind decides which statuses a row may have', () => {
    for (const c of [...thresholds.checks, ...thresholds.followUp.checks]) {
      const row = [...results.rows, ...followUp.rows].find(r => r.id === c.id);
      if (c.kind === 'bound') expect(['pass', 'fail']).toContain(row.status);
      if (c.kind === 'reported') expect(row.status).toBe('reported');
      if (c.kind === 'notrun') expect(row.status).toBe('not run');
    }
  });

  test('the failing rows are exactly the failed-legs file, and they stay failing', () => {
    const fails = results.rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failed.legs.map(l => l.id)).toEqual(fails);
    expect(fails).toEqual(['A6.largeShift', 'G2.coverage']);
    // the follow-up legs are new legs; they re-bound nothing
    expect(followUp.rows.every(r => r.status === 'pass')).toBe(true);
    expect(thresholds.amendments.map(a => a.movesNoBound)).toEqual([
      true,
      true,
    ]);
  });

  test('the verdict is the function the thresholds state', () => {
    const bounded = results.rows.filter(
      r => !['reported', 'not run'].includes(r.status)
    );
    const failedIds = bounded.filter(r => r.status === 'fail').map(r => r.id);
    expect(results.verdict).toBe(
      failedIds.length ? 'FAILED LEG(S)' : 'VALIDATED'
    );
    expect(results.failed).toEqual(failedIds);
    expect(results.counts).toEqual({
      pass: results.rows.filter(r => r.status === 'pass').length,
      fail: failedIds.length,
      reported: results.rows.filter(r => r.status === 'reported').length,
      'not run': results.rows.filter(r => r.status === 'not run').length,
    });
  });

  test('a few bounds applied to their measured numbers', () => {
    const row = id => results.rows.find(r => r.id === id);
    const L = id => thresholds.checks.find(c => c.id === id).limits;
    expect(row('B1.propagation').measured).toBeLessThanOrEqual(
      L('B1.propagation').maxSepArcsec
    );
    expect(row('E5.coverage').measured).toBeGreaterThanOrEqual(
      L('E5.coverage').minCoverage
    );
    expect(row('E8.naiveControl').measured).toBeLessThanOrEqual(
      L('E8.naiveControl').maxMean
    );
    expect(row('D1.packPairs').measured).toBe(0);
    // the failures are the two the contract names, with the measured values they had
    expect(row('G2.coverage').measured[5]).toBeLessThan(
      L('G2.coverage').minCoveragePerBin
    );
    expect(row('A6.largeShift').measured.poleRaMoved).toBe(0);
  });

  test('the oracle was run against the thresholds file that is in the tree, and no tool was downloaded', () => {
    expect(oracle.inputs.thresholdsSha256).toBe(
      createHash('sha256').update(read('thresholds.json')).digest('hex')
    );
    expect(oracle.tools.astropy).toBe('6.0.1');
    // the first run read the oracle pinned before AM2 (its numbers are identical); the follow-up read this one
    expect(followUp.thresholdsSha).toBe(oracle.inputs.thresholdsSha256);
    expect(results.thresholdsSha).toMatch(/^[0-9a-f]{64}$/);
  });

  test('the thresholds hold no absolute home path and the oracle no Gravitas code', () => {
    for (const name of ['thresholds.json', 'clustering-thresholds.json'])
      expect(read(name)).not.toMatch(/\/Users\/|\/home\//);
    const py = readFileSync(
      new URL('../tools/crossmatch-oracle/oracle.py', import.meta.url),
      'utf8'
    );
    expect(py).not.toMatch(
      /^\s*(from|import)\s+(js|tools|gravitas)\b|^\s*from\s+\./im
    );
  });
});

describe('the clustering gate', () => {
  const statusOf = id => clRes.rows.find(r => r.id === id)?.status;
  test('every committed check has exactly one row', () => {
    expect(clRes.rows.map(r => r.id).sort()).toEqual(
      clThr.checks.map(c => c.id).sort()
    );
  });

  test('the verdict is the committed function of the rows', () => {
    const K = [
      'B1.pairCounts',
      'B2.null',
      'B2b.nullBias',
      'B3.thomas',
      'B6.oracleLS',
      'B7.randoms',
    ];
    const S = ['B4.detectable', 'B5.cost'];
    const bad = [...K, ...S].filter(id => statusOf(id) !== 'pass');
    const a =
      statusOf('B9.authenticReference') === 'pass' &&
      clRes.rows.find(r => r.id === 'B8.strip').measured.detected;
    const verdict = bad.length ? 'C' : a ? 'A' : 'B';
    expect(clRes.verdict).toBe(verdict);
    expect(clRes.failed).toEqual(bad);
    // B9 is NOT RUN, so nothing better than B was possible
    expect(statusOf('B9.authenticReference')).toBe('not run');
    expect(['B', 'C']).toContain(clRes.verdict);
  });

  test('the thresholds recorded their amendments, none of which moves a bound', () => {
    expect(clThr.amendments.every(a => a.movesNoBound === true)).toBe(true);
  });
});
