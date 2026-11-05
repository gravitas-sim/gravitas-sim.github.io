// =============================================================================
// The Lensing II validation contract and its pinned results (Prompt 251)
// -----------------------------------------------------------------------------
// tests/fixtures/lensing2/thresholds.json and gate-thresholds.json fixed every bound before the kernel
// existed (two amendments before the first validator run, both recorded, no bound moved).
// tools/lensing2-validate.mjs judges the kernel against them (under a second of Node); this runs it
// once in a child process and holds the table against the pinned results.json and failed-legs.json.
// A leg that crosses its bound stays in failed-legs.json; only Carl resets a bound. The legs that wait
// for an authentic file or for a prototype are NOT RUN and say so.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/lensing2/thresholds.json');
const GATE = read('tests/fixtures/lensing2/gate-thresholds.json');
const RESULTS = read('tests/fixtures/lensing2/results.json');
const FAILED = read('tests/fixtures/lensing2/failed-legs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      [...THR.checks, ...GATE.checks].map(c => c.id).sort()
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
  test('the one failing leg is P2, on merged code, and it is left failing', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual(['P2.finiteSourcePointLimit']);
    expect(FAILED.legs[0].measured.worstRelLimit).toBeGreaterThan(
      GATE.checks.find(c => c.id.startsWith('P2.')).limits.maxRel
    );
  });
  test('the legs that wait for a file or a prototype are not run, and nothing was fetched', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'B6.citedTool',
      'E1.publishedCluster',
      'E2.imageArcRadius',
      'E3.dispersionVersusArc',
      'G1.sisDelayFermat',
      'G2.pointDelayFermat',
      'G3.sheetImagesInvariant',
      'G4.sheetDelayScales',
      'G5.hubbleRefusalAndCoverage',
      'G6.publishedDelay',
      'G7.finiteSourceFitCoverage',
      'G8.blendedBaselineDegeneracy',
      'G9.authenticEvent',
    ]);
    expect(
      existsSync(new URL('./fixtures/lensing2/authentic', import.meta.url))
    ).toBe(false);
    expect(RESULTS.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
  });
  test('the reported legs are the three that commit no bound', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status === 'reported')
        .map(r => r.id)
        .sort()
    ).toEqual([
      'C4.unwidenedCoverageOffset',
      'R1.cpuSeconds',
      'R2.solarMassConvention',
    ]);
  });
  test('the kernel verdict is the committed function of the rows, and Part B has no verdict', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p => RESULTS.rows.find(r => r.id.startsWith(`${p}.`)).status;
    const ok = list => list.every(p => st(p) === 'pass');
    const core =
      ok(G.closedLegs) &&
      ok(G.oracleLegs.filter(l => l !== 'B6')) &&
      ok(G.refusalCore);
    expect(core).toBe(true);
    expect(RESULTS.gate.kernelVerdict).toBe(
      ok(G.coverageLegs) && ok(G.refusalCoverage) ? 'A' : 'B'
    );
    expect(RESULTS.gate.partB.verdict).toBe('none');
    expect(GATE.verdicts.current).toMatch(/^no verdict/);
  });
  test('the thresholds record their amendments with the reason and the time, and no bound moved', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    for (const a of THR.amendments) {
      expect(a.when).toMatch(/before any validator run/);
      expect(a.boundMoved).toBe(false);
    }
    expect(GATE.amendments).toEqual([]);
  });
  test('the committed rule forbids typing published numbers and fetching', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/NOT RUN/);
    expect(GATE.rule).toMatch(
      /No Hubble constant is reported from a delay without the mass-sheet degeneracy statement/
    );
  });
  test('the oracle shares no code with the kernel', () => {
    const src = readFileSync(
      new URL('../tools/lensing2-oracle/oracle.py', import.meta.url),
      'utf8'
    );
    expect(
      src
        .split('\n')
        .filter(l => /^\s*(import|from)\s/.test(l))
        .join(' ')
    ).not.toMatch(/\bjs\b|kernel/);
  });
});

describe('the validator reproduces the pinned table', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/lensing2-validate.mjs', '--json'],
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
    expect(r.gate).toEqual(RESULTS.gate);
  }, 300000);
  test('the measured numbers of the pinned failing legs reproduce', () => {
    const r = run();
    for (const l of FAILED.legs)
      expect(r.rows.find(x => x.id === l.id).measured).toEqual(l.measured);
  }, 300000);
});
