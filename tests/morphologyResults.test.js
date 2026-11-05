// =============================================================================
// The galaxy-morphology validation contract and its pinned results (Prompt 249, Part A)
// -----------------------------------------------------------------------------
// tests/fixtures/morphology/thresholds.json fixed every bound before the kernel existed. tools/morphology-validate.mjs
// judges the kernel against it (the whole table takes several minutes); this holds the pinned results.json and
// failed-legs.json against the thresholds file and re-runs the cheap analytic, oracle and classification legs in a
// child process to hold their statuses. A leg that crosses its bound stays in failed-legs.json; only Carl resets a
// bound. The authentic legs (E1 to E3) and Part B's gate (G1 to G7) are NOT RUN.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/morphology/thresholds.json');
const GATE = read('tests/fixtures/morphology/gate-thresholds.json');
const RESULTS = read('tests/fixtures/morphology/results.json');
const FAILED = read('tests/fixtures/morphology/failed-legs.json');
const ORACLE = read('tests/fixtures/morphology/oracle-results.json');
const INPUTS = read('tests/fixtures/morphology/oracle-inputs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
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
  test('only the legs the thresholds call reported or that wait for a file or a fitter are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'E1.authenticSdssProfile:not-run',
      'E2.authenticClassification:not-run',
      'E3.quantitativeContract:not-run',
      'G1.sersicRecovery:not-run',
      'G2.independentFit:not-run',
      'G3.degeneracy:not-run',
      'G4.twoComponent:not-run',
      'G5.psfMismatch:not-run',
      'G6.tullyFisherData:not-run',
      'G7.cost:not-run',
      'R1.psfBias:reported',
      'R2.totalFraction:reported',
      'R3.standInClassification:reported',
    ]);
  });
  test('every not-run row says why', () => {
    for (const r of RESULTS.rows.filter(x => x.status === 'not-run'))
      expect(r.note.length).toBeGreaterThan(40);
  });
  test('the thresholds file records every amendment in order, each with its reason, and none moves a bound', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(
      Array.from({ length: THR.amendments.length }, (_, i) => `AM${i + 1}`)
    );
    for (const a of THR.amendments) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.why.length).toBeGreaterThan(80);
      expect(a.why).toMatch(/No bound moved|no bound moved/);
      expect(a.why).toMatch(/Recorded (before|after)/);
    }
  });
  test('the committed rule forbids typed published numbers and says a size is a size as observed', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/DERIVED/);
    expect(THR.rule).toMatch(/no default/);
    expect(THR.rule).toMatch(/INVENTED/);
    expect(THR.rule).toMatch(/as observed/);
    expect(THR.scope.notRun).toMatch(/E1/);
  });
  test('the gate commits its thresholds and its verdict function, and no verdict', () => {
    expect(GATE.committed).toMatch(/before any kernel/);
    expect(GATE.verdicts.current).toMatch(/no verdict/);
    expect(GATE.verdicts.B).toMatch(/no Tully-Fisher/);
    expect(GATE.rule).toMatch(/Nothing is fitted without the PSF/);
    expect(GATE.checks.map(c => c.id)).toEqual([
      'G1.sersicRecovery',
      'G2.independentFit',
      'G3.degeneracy',
      'G4.twoComponent',
      'G5.psfMismatch',
      'G6.tullyFisherData',
      'G7.cost',
    ]);
  });
  test("the committed worlds and constants are the kernel's", async () => {
    const M = await import('../js/kernels/galaxy/morphology/index.js');
    expect(
      THR.worlds.label.startsWith(M.MORPHOLOGY_SYNTHETIC_LABEL.slice(0, 40))
    ).toBe(true);
    expect(THR.worlds.frame.width).toBe(M.MORPHOLOGY_WORLD.width);
    expect(THR.worlds.sky.electronsPerPixel).toBe(
      M.MORPHOLOGY_WORLD.skyElectrons
    );
    expect(THR.worlds.sky.readNoiseElectrons).toBe(
      M.MORPHOLOGY_WORLD.readNoise
    );
    expect(THR.worlds.psf.fwhmPixels).toBe(M.MORPHOLOGY_WORLD.psfFwhm);
    expect(THR.worlds.zeroPoint.mag).toBe(M.MORPHOLOGY_WORLD.zeroPoint);
    const c = THR.analysisRule.constants;
    expect(c.petrosianEta).toBe(M.RULE.petrosianEta);
    expect(c.annulusFactors).toEqual([...M.RULE.annulusFactors]);
    expect(c.totalRadiusFactor).toBe(M.RULE.totalRadiusFactor);
    expect(c.radiusGridRatio).toBe(M.RULE.radiusGridRatio);
    expect(c.subSamples).toBe(M.RULE.subSamples);
    expect(c.binPixels).toBe(M.RULE.binPixels);
    expect(c.profileAnnuli).toBe(M.RULE.profileAnnuli);
    expect(c.isophoteAnnuli).toBe(M.RULE.isophoteAnnuli);
    expect(c.noiseDraws).toBe(M.RULE.noiseDraws);
    expect(c.minDraws).toBe(M.RULE.minDraws);
    expect(c.minSignalToNoise).toBe(M.RULE.minSignalToNoise);
    expect(c.unresolvedFactor).toBe(M.RULE.unresolvedFactor);
    expect(THR.worlds.standInRule.name).toMatch(/INVENTED/);
  });
});

describe('the oracle inputs and results', () => {
  test('the oracle read its inputs file: same case counts, versions recorded', () => {
    expect(ORACLE.cases).toHaveLength(8);
    expect(INPUTS.cases).toHaveLength(8);
    expect(ORACLE.ensemble).toHaveLength(INPUTS.ensemble.length);
    expect(INPUTS.ensemble).toHaveLength(
      THR.checks.find(c => c.id === 'C1.sizeCoverage').limits.n
    );
    expect(ORACLE.versions).toMatchObject({
      numpy: expect.any(String),
      scipy: expect.any(String),
    });
    expect(ORACLE.note).toMatch(/no Gravitas code/);
    expect(ORACLE.note).toMatch(/not a cited photometry pipeline/);
  });
  test('the inputs hold forward-model manifests and no kernel output', () => {
    expect(INPUTS.format).toBe('gravitas.morphology-oracle-inputs/1');
    expect(INPUTS.note).toMatch(/no analysis output/);
    const text = JSON.stringify(INPUTS.cases[0]);
    expect(text).not.toMatch(/"rPetrosian"|"r50"|"concentration"|"asymmetry"/);
  });
});

describe('the validator reproduces the pinned statuses of its cheap legs', () => {
  const run = only =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/morphology-validate.mjs', '--json', `--only=${only}`],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    ).rows;
  test('A1, A4, A4b, A5, A6, B1 and D5 give their pinned statuses and measured numbers', () => {
    const rows = run('A1,A4,A5,A6,B1,D5');
    expect(rows.length).toBeGreaterThanOrEqual(7);
    for (const r of rows) {
      const pinned = RESULTS.rows.find(p => p.id === r.id);
      expect(r.status).toBe(pinned.status);
      expect(JSON.stringify(r.measured)).toBe(JSON.stringify(pinned.measured));
    }
  }, 120000);
});
