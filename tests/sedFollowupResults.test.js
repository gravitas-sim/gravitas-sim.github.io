// =============================================================================
// The SED follow-up contract and its pinned results (Prompt 245, follow-up)
// -----------------------------------------------------------------------------
// tests/fixtures/sed/followup/thresholds.json was committed before any code of the follow-up
// ran; tools/sed-followup-validate.mjs judges the new legs (about 20 s of Node) and this holds
// its table against the pinned results.json and failed-legs.json. The first gate's legs and its
// verdict (kernel C) are not touched; the follow-up verdict is computed beside them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/sed/followup/thresholds.json');
const RESULTS = read('tests/fixtures/sed/followup/results.json');
const FAILED = read('tests/fixtures/sed/followup/failed-legs.json');
const FIRST = read('tests/fixtures/sed/results.json');

describe('the follow-up legs and their pinned results', () => {
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
  test('the first gate is untouched: its failed legs and its verdict stay on record', () => {
    for (const id of [
      'B1.astropyConversions',
      'B2.bandMeanOracle',
      'C2.coverageLuminosity',
      'D3.rayleighJeansOnly',
    ])
      expect(FIRST.rows.find(r => r.id === id).status).toBe('fail');
    expect(FIRST.gate.kernelVerdict).toBe('C');
    expect(RESULTS.gate.firstGateKernelVerdict).toBe('C');
  });
  test('the follow-up verdict is the committed function of the recorded statuses', () => {
    const G = THR.gate.followUpVerdictFunction.kernelLegGroups;
    const st = p =>
      (
        RESULTS.rows.find(r => r.id.startsWith(`${p}.`)) ??
        FIRST.rows.find(r => r.id.startsWith(`${p}.`))
      ).status;
    const ok = list => list.every(p => st(p) === 'pass');
    const conv = ok(G.conversionLegs);
    expect(RESULTS.gate.followUpKernelVerdict).toBe(
      conv ? (ok(G.fitLegs) && ok(G.luminosityLegs) ? 'A' : 'B') : 'C'
    );
    expect(RESULTS.gate.temperature === 'claimable').toBe(ok(G.fitLegs));
    expect(RESULTS.gate.D3).toBeUndefined();
    expect(G.fitLegs).toContain('D3');
  });
  test('E1b judges nothing and the authentic row is not run', () => {
    const e = RESULTS.rows.find(r => r.id.startsWith('E1b.'));
    expect(e.status).toBe('reported');
    expect(e.measured.authentic).toMatch(/NOT RUN/);
    expect(
      e.measured.inTreeStandIn.every(r => r.labelStatesColourTemperature)
    ).toBe(true);
  });
  test('the thresholds committed no amendment and no moved bound', () => {
    expect(THR.amendments).toEqual([]);
    expect(THR.rule).toMatch(/No bound of any first-gate leg moves/);
  });
  test('the new bounds are not the first gate bounds moved', () => {
    const b = THR.checks.find(c => c.id.startsWith('B1b.')).limits.maxRel;
    expect(b).toBe(1e-12);
    const c = THR.checks.find(c => c.id.startsWith('C2b.')).limits.bands;
    const old = read('tests/fixtures/sed/thresholds.json').checks.find(x =>
      x.id.startsWith('C2.')
    ).limits.bands;
    expect(c).toEqual(old);
  });
});

describe('the follow-up validator reproduces the pinned table', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/sed-followup-validate.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    ));
  test('every status equals its pinned status and the verdicts are the pinned ones', () => {
    const r = run();
    expect(r.rows.map(x => `${x.id}:${x.status}`)).toEqual(
      RESULTS.rows.map(x => `${x.id}:${x.status}`)
    );
    expect(r.gate).toEqual(RESULTS.gate);
  }, 300000);
  test('the measured numbers of every row reproduce', () => {
    const r = run();
    for (const x of RESULTS.rows)
      expect(r.rows.find(y => y.id === x.id).measured).toEqual(x.measured);
  }, 300000);
});
