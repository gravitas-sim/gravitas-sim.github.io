// =============================================================================
// The SED validation contract and its pinned results (Prompt 245)
// -----------------------------------------------------------------------------
// tests/fixtures/sed/thresholds.json fixed every bound before the kernel existed (two
// amendments before the first validator run, a third after a partial one, all recorded with
// their reasons). tools/sed-validate.mjs judges the kernel against it (about 12 s of Node);
// this runs it once in a child process and holds the table against the pinned results.json
// and failed-legs.json. A leg that crosses its bound stays in failed-legs.json; only Carl
// resets a bound. The legs that wait for authentic files are NOT RUN and say so.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/sed/thresholds.json');
const RESULTS = read('tests/fixtures/sed/results.json');
const FAILED = read('tests/fixtures/sed/failed-legs.json');

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
  test('the legs that wait for an authentic file are not run, and nothing was fetched', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'B5.citedTool',
      'E0.rightsPerSource',
      'E1.authenticStar',
      'E3.catalogColoursVsSpectrum',
    ]);
    expect(RESULTS.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
  });
  test('the reported legs are the two that commit no bound', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'reported')
        .map(r => r.id)
        .sort()
    ).toEqual(['C4.unwidenedCoverage', 'E2.sdssSpectrumPhotometry']);
  });
  test('the gate verdict is the committed function of the rows', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p => RESULTS.rows.find(r => r.id.startsWith(`${p}.`)).status;
    const ok = list => list.every(p => st(p) === 'pass');
    const conv = ok(G.conversionLegs);
    expect(RESULTS.gate.kernelVerdict).toBe(
      conv ? (ok(G.fitLegs) && ok(G.luminosityLegs) ? 'A' : 'B') : 'C'
    );
    expect(RESULTS.gate.temperature === 'claimable').toBe(ok(G.fitLegs));
    expect(RESULTS.gate.conversions === 'claimable').toBe(conv);
  });
  test('the thresholds record their amendments with the reason and the time', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    for (const a of THR.amendments.slice(0, 2))
      expect(a.when).toMatch(/before any validator run/);
    expect(THR.amendments[2].when).toMatch(/after the first partial run/);
    expect(THR.amendments.map(a => a.boundMoved)).toEqual([false, true, false]);
  });
  test('the committed rule forbids typing published numbers and refuses unknown conventions', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/refused and never guessed/);
    expect(THR.rule).toMatch(/extrapolated/);
  });
  test('no catalogue file is in the tree', () => {
    expect(RESULTS.rows.find(r => r.id.startsWith('E1.')).note).toMatch(
      /was not supplied/
    );
  });
});

describe('the validator reproduces the pinned table', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(process.execPath, ['tools/sed-validate.mjs', '--json'], {
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
  test('the measured numbers of the pinned failing legs reproduce', () => {
    const r = run();
    for (const l of FAILED.legs)
      expect(r.rows.find(x => x.id === l.id).measured).toEqual(l.measured);
  }, 300000);
});
