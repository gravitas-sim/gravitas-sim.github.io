// =============================================================================
// The Cosmology II validation contract and its pinned results (Prompt 255)
// -----------------------------------------------------------------------------
// tests/fixtures/cosmology2/thresholds.json fixed every bound before the kernel existed (two amendments
// before any validator row was seen, both recorded, no bound moved). tools/cosmology2-validate.mjs judges the
// kernel against them; this runs it once in a child process and holds the table against the pinned
// results.json and failed-legs.json. A leg that crosses its bound stays in failed-legs.json; only Carl resets a
// bound. The leg that waited for an authentic file is NOT RUN in this pinned table; it is judged afterwards
// by tools/cosmology2-b6.mjs under b6-thresholds.json (tests/cosmology2B6.test.js).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/cosmology2/thresholds.json');
const RESULTS = read('tests/fixtures/cosmology2/results.json');
const FAILED = read('tests/fixtures/cosmology2/failed-legs.json');
const FIRST = read('tests/fixtures/cosmology2/first-run.json');

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
  test('the four failing legs are left failing: a formula sign in A7, astropy age(z) at z >= 100 in B1 and B3, the 1 percent step in F3', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual([
      'A7.matterOnlyNotFlat',
      'B1.astropyTenSets',
      'B3.oracleAgreesWithItself',
      'F3.hubbleScaling',
    ]);
    const m = id => FAILED.legs.find(l => l.id === id).measured;
    const L = id => THR.checks.find(c => c.id === id).limits;
    expect(m('A7.matterOnlyNotFlat').worstRelAge).toBeGreaterThan(
      L('A7.matterOnlyNotFlat').maxRel
    );
    // the committed open-universe age had the wrong sign: negated it agrees to rounding
    expect(m('A7.matterOnlyNotFlat').diagnosticOpenFormNegated).toBeLessThan(
      1e-14
    );
    expect(m('B1.astropyTenSets').quantitiesOverBound).toEqual(['ageAtZ']);
    expect(m('B3.oracleAgreesWithItself').quantitiesOverBound).toEqual([
      'ageAtZ',
    ]);
    expect(Math.abs(m('F3.hubbleScaling').dLnDdLnH0 + 1)).toBeGreaterThan(
      L('F3.hubbleScaling').maxAbsLogSlope
    );
  });
  test('the first complete run is kept: five failures, one of them (the not-finite message) fixed in the kernel with its bound unchanged', () => {
    const failed = FIRST.rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failed).toEqual([
      'A7.matterOnlyNotFlat',
      'B1.astropyTenSets',
      'B3.oracleAgreesWithItself',
      'D7.refusalsAreExplained',
      'F3.hubbleScaling',
    ]);
    expect(RESULTS.rows.find(r => r.id.startsWith('D7.')).status).toBe('pass');
  });
  test('the first gate pinned B6 as NOT RUN (no file had been supplied then); the published data arrived afterwards and are judged by the B6 gate, not by this table', () => {
    expect(
      RESULTS.rows.filter(r => r.status === 'not-run').map(r => r.id)
    ).toEqual(['B6.publishedTable']);
    expect(RESULTS.rows.find(r => r.id === 'B6.publishedTable').note).toMatch(
      /was not supplied/
    );
    expect(RESULTS.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
    expect(RESULTS.gate.consumers).toMatch(/^unmet/);
    // the data that arrived later are the only authentic files, and are judged in tests/cosmology2B6.test.js
    expect(
      readdirSync(new URL('./fixtures/cosmology2/authentic', import.meta.url))
        .sort()
        .join(',')
    ).toBe('SOURCES.json,published-table.json');
  });
  test('the reported leg is CPU time, which commits no bound', () => {
    expect(
      RESULTS.rows.filter(r => r.status === 'reported').map(r => r.id)
    ).toEqual(['R1.cpuTime']);
  });
  test('the kernel verdict is the committed function of the rows', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p => RESULTS.rows.find(r => r.id.startsWith(`${p}.`)).status;
    const ok = list => list.every(p => st(p) === 'pass');
    const core = ok(G.closedLegs) && ok(G.oracleLegs) && ok(G.refusalCore);
    const all =
      core &&
      ok(G.coverageLegs) &&
      ok(G.refusalCoverage) &&
      ok(G.degeneracyLegs);
    expect(RESULTS.gate.kernelVerdict).toBe(all ? 'A' : core ? 'B' : 'C');
    expect(RESULTS.gate.kernelVerdict).toBe('C');
  });
  test('the thresholds record their amendments with the reason and the time, and no bound moved', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    for (const a of THR.amendments) {
      expect(a.when).toMatch(
        /before any (kernel code and any validator run|validator row was seen)/
      );
      expect(a.boundMoved).toBe(false);
    }
  });
  test('the committed rule forbids typing published numbers and fetching', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/NOT RUN/);
    expect(THR.analysisRule.R11).toMatch(/consumers clause/);
  });
  test('the oracle shares no code with the kernel', () => {
    const src = readFileSync(
      new URL('../tools/cosmology2-oracle/oracle.py', import.meta.url),
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
        ['tools/cosmology2-validate.mjs', '--json'],
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
