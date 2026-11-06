// =============================================================================
// The galaxy-cluster validation contract and its pinned results (Prompt 250)
// -----------------------------------------------------------------------------
// tests/fixtures/clusters/thresholds.json fixed every bound before the kernel existed (two amendments
// before the first validator run, both recorded, no bound moved). tools/clusters-validate.mjs judges the
// kernel against them; this runs it once in a child process and holds the table against the pinned
// results.json and failed-legs.json. A leg that crosses its bound stays in failed-legs.json; only Carl
// resets a bound. The legs that wait for an authentic table are NOT RUN and say so.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/clusters/thresholds.json');
const RESULTS = read('tests/fixtures/clusters/results.json');
const FAILED = read('tests/fixtures/clusters/failed-legs.json');
const RUN1 = read('tests/fixtures/clusters/run1-results.json');

const lim = id => THR.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const row = id => RESULTS.rows.find(r => r.id.startsWith(`${id}.`));

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
  test('the three failing legs are left failing and each crosses its committed bound', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual([
      'C1b.dispersionBootstrapCoverage',
      'C4.lightCoverage',
      'D3.contaminationFlag',
    ]);
    const c1b = FAILED.legs[0].measured;
    expect(
      c1b.cover68 < lim('C1b').cover68[0] || c1b.cover95 < lim('C1b').cover95[0]
    ).toBe(true);
    const c4 = FAILED.legs[1].measured;
    expect(c4.cover68).toBeLessThan(lim('C4').cover68[0]);
    expect(c4.cover95).toBeLessThan(lim('C4').cover95[0]);
    expect(FAILED.legs[2].measured.flaggedShare).toBeLessThan(
      lim('D3').flaggedMin
    );
  });
  test('the legs that wait for a table are not run, and nothing was fetched', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'E1.comaPublished',
      'E2.independentAnalysis',
      'E3.morphologyDensityAuthentic',
      'E4.massToLightAuthentic',
    ]);
    expect(
      existsSync(new URL('./fixtures/clusters/authentic', import.meta.url))
    ).toBe(false);
    expect(RESULTS.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
    expect(RESULTS.gate.consumers).toMatch(/unmet/);
  });
  test('the reported legs are the eight that commit no bound', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'reported')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'R1.cpuSeconds',
      'R2.solarMassConvention',
      'R3.gravitationalConstantConvention',
      'R4.contaminationLadder',
      'R5.truncationCorrectionEffect',
      'R6.fieldWithoutCluster',
      'R7.mismodelledMass',
      'R8.biweightVersusPlain',
    ]);
  });
  test('the kernel verdict is the committed function of the rows', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p =>
      RESULTS.rows.filter(r => r.id.startsWith(`${p}.`)).map(r => r.status);
    const ok = list => list.every(p => st(p).every(s => s === 'pass'));
    const core = ok(G.closedLegs) && ok(G.oracleLegs) && ok(G.refusalCore);
    expect(core).toBe(true);
    expect(RESULTS.gate.kernelVerdict).toBe(
      ok(G.flagLegs) && ok(G.coverageLegs) ? 'A' : 'B'
    );
    expect(RESULTS.gate.kernelVerdict).toBe('B');
  });
  test('the contaminated-flag and truncation findings are in the pinned numbers', () => {
    const ladder = row('R4').measured;
    expect(ladder['0.5'].flaggedContaminated).toBeGreaterThan(0.5);
    expect(ladder['0.1'].flaggedContaminated).toBe(0);
    expect(row('R6').measured.statuses.ok).toBe(100);
    expect(row('R5').measured.rawMeanBias).toBeLessThan(
      row('R5').measured.correctedMeanBias
    );
  });
  test('run 1 is kept: A4 failed against the committed formula and was repaired, no bound moved', () => {
    expect(RUN1.rows.filter(r => r.status === 'fail').map(r => r.id)).toEqual([
      'A4.errorSubtraction',
      'C1b.dispersionBootstrapCoverage',
      'C4.lightCoverage',
      'D3.contaminationFlag',
    ]);
    expect(RUN1.note).toMatch(/no bound moved/);
    expect(RUN1.note).toMatch(/oracle/);
  });
  test('the thresholds record their amendments with the reason and the time, and no bound moved', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    for (const a of THR.amendments) {
      expect(a.when).toMatch(/before any validator run/);
      expect(a.boundMoved).toBe(false);
    }
  });
  test('the committed rule forbids typing published numbers and fetching', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/NOT RUN/);
    expect(THR.rule).toMatch(/nothing is fetched/);
  });
  test('the oracle shares no code with the kernel', () => {
    const src = readFileSync(
      new URL('../tools/clusters-oracle/oracle.py', import.meta.url),
      'utf8'
    );
    expect(
      src
        .split('\n')
        .filter(l => /^\s*(import|from)\s/.test(l))
        .join(' ')
    ).not.toMatch(/\bjs\b|kernel|gravitas/i);
  });
});

describe('the validator reproduces the pinned table', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/clusters-validate.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    ));
  test('every status equals its pinned status and the verdicts are the pinned ones (CPU time is recorded, not compared)', () => {
    const r = run();
    expect(r.rows.map(x => `${x.id}:${x.status}`)).toEqual(
      RESULTS.rows.map(x => `${x.id}:${x.status}`)
    );
    expect(r.verdict).toEqual(RESULTS.gate);
  }, 300000);
  test('the measured numbers of the pinned failing legs reproduce', () => {
    const r = run();
    for (const l of FAILED.legs)
      expect(r.rows.find(x => x.id === l.id).measured).toEqual(l.measured);
  }, 300000);
});
