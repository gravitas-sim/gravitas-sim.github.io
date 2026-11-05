// =============================================================================
// The X-ray counts validation contract and its pinned results (Prompt 243)
// -----------------------------------------------------------------------------
// tests/fixtures/xray/thresholds.json fixed every bound before the kernel existed.
// tools/xray-validate.mjs judges the kernel against it (about 40 s of Node); this runs it
// once in a child process and holds the table against the pinned results.json and
// failed-legs.json. A leg that crosses its bound stays in failed-legs.json; only Carl
// resets a bound. The legs that wait for authentic files are NOT RUN and say so.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/xray/thresholds.json');
const RESULTS = read('tests/fixtures/xray/results.json');
const FAILED = read('tests/fixtures/xray/failed-legs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      THR.checks.map(c => c.id).sort()
    );
  });
  test('the failed-legs file is exactly the failing rows', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RESULTS.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
  });
  test('the legs that wait for an authentic product are not run, and nothing was fetched', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'B7.timingPackage',
      'E0.productFillsContract',
      'E1.pulsarCatalogue',
      'E2.transientOutburst',
    ]);
    expect(RESULTS.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
  });
  test('the gate verdict is the committed function of the rows', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p => RESULTS.rows.find(r => r.id.startsWith(`${p}.`)).status;
    const nonPeriodOk = G.nonPeriodLegs.every(p => st(p) === 'pass');
    const periodOk = G.periodLegs.every(p => st(p) === 'pass');
    expect(RESULTS.gate.kernelVerdict).toBe(
      nonPeriodOk ? (periodOk ? 'A' : 'B') : 'C'
    );
    const netOk = G.netFormLegs.every(p => st(p) === 'pass');
    expect(/^claimable/.test(RESULTS.gate.netForms)).toBe(netOk);
  });
  test('the thresholds record their amendments with the reason, before any validator run', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    for (const a of THR.amendments)
      expect(a.when).toMatch(/before any validator run/);
  });
  test('the committed rule forbids typing published numbers and Gaussian errors on counts', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/never a Gaussian one/);
    expect(THR.rule).toMatch(/barycentric/);
  });
});

describe('the validator reproduces the pinned table', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(process.execPath, ['tools/xray-validate.mjs', '--json'], {
        cwd: new URL('..', import.meta.url).pathname,
        encoding: 'utf8',
        maxBuffer: 1 << 26,
      })
    ));
  test('every status equals its pinned status and the verdicts are the pinned ones (CPU time is recorded, not compared)', () => {
    const r = run();
    expect(r.rows.map(x => `${x.id}:${x.status}`)).toEqual(
      RESULTS.rows.map(x => `${x.id}:${x.status}`)
    );
    expect(r.gate).toEqual(RESULTS.gate);
  }, 300000);
  test('the failing legs are the pinned failing legs, no more', () => {
    expect(
      run()
        .rows.filter(x => x.status === 'fail')
        .map(x => x.id)
    ).toEqual(FAILED.legs.map(l => l.id));
  }, 300000);
});
