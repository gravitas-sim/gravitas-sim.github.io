// =============================================================================
// The AGN validation contract and its pinned results (Prompt 252)
// -----------------------------------------------------------------------------
// tests/fixtures/agn/thresholds.json fixed every bound before the kernel existed, and gate-thresholds.json fixed the
// luminosity-function gate's. tools/agn-validate.mjs judges the kernel against them; the whole table takes about
// twenty seconds, and this holds the pinned results.json and failed-legs.json against the thresholds files and
// re-runs the analytic, oracle, refusal, authentic-file and gate legs in a child process to hold their statuses. A
// leg that crosses its bound stays in failed-legs.json; only Carl resets a bound. The authentic legs (E1 to E4,
// B7) and every gate leg are NOT RUN until a file is supplied.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/agn/thresholds.json');
const GATE = read('tests/fixtures/agn/gate-thresholds.json');
const RESULTS = read('tests/fixtures/agn/results.json');
const FAILED = read('tests/fixtures/agn/failed-legs.json');
const ORACLE = read('tests/fixtures/agn/oracle-results.json');
const INPUTS = read('tests/fixtures/agn/oracle-inputs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check and gate leg has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      [...THR.checks, ...GATE.checks].map(c => c.id).sort()
    );
  });
  test('the failed-legs file is exactly the failing rows, each with its reason', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RESULTS.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
    for (const l of FAILED.legs) expect(l.note.length).toBeGreaterThan(80);
  });
  test('only the legs the thresholds call reported or that wait for a file are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'B7.sdssPipelineOracle:not-run',
      'E1.sdssQuasarPack:not-run',
      'E2.bptPublished:not-run',
      'E3.measuredLightCurve:not-run',
      'E4.bolometricLiterature:not-run',
      'G1.sampleRights:not-run',
      'G2.completenessDocumented:not-run',
      'G3.kCorrectionSource:not-run',
      'G4.vmaxVsOracle:not-run',
      'G5.binIntervals:not-run',
      'G6.noOmission:not-run',
      'G7.malmquistDemonstration:not-run',
      'R1.templateMismatch:reported',
      'R2.lineShiftSystematic:reported',
      'R3.kCorrectionAbsence:reported',
      'R4.dividingCurveSensitivity:reported',
    ]);
  });
  test('every not-run row says why', () => {
    for (const r of RESULTS.rows.filter(x => x.status === 'not-run'))
      expect(r.note.length).toBeGreaterThan(60);
  });
  test('the five failed legs are the ones this PR reports, and none was removed or reworded as a pass', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual([
      'A7.quasarShift',
      'B3.redshiftOracle',
      'B6.lineFluxOracle',
      'C1.redshiftCoverage',
      'D2.undetectedAndBlended',
    ]);
  });
});

describe('the contract', () => {
  test('the thresholds file records every amendment with its reason, in order', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(
      Array.from({ length: THR.amendments.length }, (_, i) => `AM${i + 1}`)
    );
    for (const a of THR.amendments) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.why.length).toBeGreaterThan(80);
      expect(a.why).toMatch(/Recorded (before|AFTER|after)/);
      expect(a.why).toMatch(
        /no bound moved|No bound moved|bound .* unchanged|not amended|NOT amended|not a bound|untouched/i
      );
    }
  });
  test('AM6 says it was recorded after run 1 and amends nothing but a validator expression', () => {
    const am6 = THR.amendments.find(a => a.id === 'AM6');
    expect(am6.why).toMatch(/AFTER the first validator run/);
    expect(am6.why).toMatch(/NOT amended/);
    expect(am6.overrides).toBeUndefined();
  });
  test('the committed rule forbids typed published numbers and names the missing defaults', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/DERIVED/);
    expect(THR.rule).toMatch(/no default/);
    expect(THR.rule).toMatch(/dividing curves/);
    expect(THR.scope.notBuilt).toMatch(/luminosity function/);
    expect(GATE.rule).toMatch(/never presented without its completeness/);
  });
  test('the gate has no verdict, builds nothing within it and takes the C alternative', () => {
    expect(GATE.verdictRule.notDecided).toMatch(/no verdict/);
    expect(GATE.verdictRule.notDecided).toMatch(
      /effective state for consumers is C/
    );
    expect(GATE.committed).toMatch(
      /Nothing of the catalogue has been read, typed or fetched/
    );
    expect(GATE.amendments).toEqual([]);
  });
  test("the committed worlds and rule are the kernel's", async () => {
    const A = await import('../js/kernels/agn/index.js');
    const w = THR.worlds;
    expect(w.label.startsWith(A.QUASAR_SYNTHETIC_LABEL)).toBe(true);
    expect(w.quasar.grid.log10Step).toBe(A.QUASAR_WORLD.log10Step);
    expect(w.quasar.grid.samples).toBe(A.QUASAR_WORLD.samples);
    expect(w.quasar.grid.resolvingPower).toBe(A.QUASAR_WORLD.resolvingPower);
    expect(w.quasar.templateGrid.samples).toBe(A.QUASAR_WORLD.templateSamples);
    expect(w.quasar.broadLines.intrinsicSigmaKmS).toBe(
      A.QUASAR_WORLD.broadSigmaKmS
    );
    expect(w.quasar.broadLines.peakOverContinuum).toEqual({
      ...A.QUASAR_WORLD.peak,
    });
    expect(w.quasar.inventedLines.factorsOfHAlpha).toEqual({
      ...A.QUASAR_WORLD.inventedFactors,
    });
    expect(w.narrowLine.grid.log10Step).toBe(A.NARROW_WORLD.log10Step);
    expect(w.narrowLine.grid.samples).toBe(A.NARROW_WORLD.samples);
    expect(w.narrowLine.intrinsicSigmaKmS).toBe(
      A.NARROW_WORLD.intrinsicSigmaKmS
    );
    expect(w.dividingCurves.invented.starForming).toEqual({
      ...A.INVENTED_BPT_CURVES.curves.starForming,
    });
    expect(w.dividingCurves.invented.agn).toEqual({
      ...A.INVENTED_BPT_CURVES.curves.agn,
    });
    expect(w.bolometric.invented.factor).toBe(A.INVENTED_BC.value);
    expect(w.bolometric.invented.scatterDex).toBe(A.INVENTED_BC.scatterDex);
    expect(w.bolometric.invented.restBandNm).toBe(A.INVENTED_BC.restNm);
    expect(w.bolometric.invented.toleranceFraction).toBe(
      A.INVENTED_BC.toleranceFraction
    );
  });
  test('the thresholds file was committed with the gate before any kernel existed', () => {
    expect(THR.committed).toMatch(/before js\/kernels\/agn\//);
    expect(THR.committed).toMatch(
      /no flux value of any in-tree spectrum was opened/
    );
  });
});

describe('the oracle inputs and results', () => {
  test('the oracle read its inputs file: same case counts, versions recorded', () => {
    expect(ORACLE.b3).toHaveLength(INPUTS.quasars.length);
    expect(ORACLE.b3fft).toHaveLength(4);
    expect(ORACLE.b4.ratios).toHaveLength(INPUTS.bpt.fluxSets.length);
    expect(ORACLE.b4.classes).toHaveLength(INPUTS.bpt.points.length);
    expect(ORACLE.b5).toHaveLength(INPUTS.curves.length);
    expect(ORACLE.b6).toHaveLength(INPUTS.narrow.length);
    expect(INPUTS.quasars).toHaveLength(8);
    expect(ORACLE.versions).toMatchObject({
      numpy: expect.any(String),
      scipy: expect.any(String),
      astropy: expect.any(String),
    });
    expect(ORACLE.note).toMatch(/no Gravitas code/);
    expect(ORACLE.note).toMatch(/not a cited tool/);
  });
  test('the inputs hold forward-model data and no kernel output', () => {
    expect(INPUTS.format).toBe('gravitas.agn-oracle-inputs/1');
    expect(INPUTS.note).toMatch(/no analysis output/);
    const text = JSON.stringify(INPUTS.quasars[0]).replace(/forwardZ/g, '');
    expect(text).not.toMatch(
      /"sigmaZ"|"significance"|"redshift"|"class"|"tau"/
    );
  });
  test('the oracle’s pair cut is the amended one', () => {
    expect(INPUTS.timescale.nSigma).toBe(5);
    expect(INPUTS.timescale.kGuard).toBe(3);
  });
});

describe('the validator reproduces the pinned statuses of its cheap legs', () => {
  const run = () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/agn-validate.mjs', '--json', '--only=A,B,D,E,G,R3'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      )
    );
  const live = (() => {
    try {
      return run();
    } catch (e) {
      // the validator exits 1 while a leg fails (left failing, labelled); its output is still the table
      return JSON.parse(e.stdout);
    }
  })();
  const pinned = RESULTS.rows.filter(r => /^(A|B|D|E|G|R3)/.test(r.id));
  test('every status equals its pinned status', () => {
    expect(live.map(r => `${r.id}:${r.status}`).sort()).toEqual(
      pinned.map(r => `${r.id}:${r.status}`).sort()
    );
  });
  test('the measured values are the pinned ones for the deterministic legs', () => {
    for (const r of live)
      expect(r.measured).toEqual(pinned.find(x => x.id === r.id).measured);
  });
});
