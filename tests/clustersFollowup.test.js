// =============================================================================
// The galaxy-cluster follow-up (Prompt 250, 250b): the new terms, the new legs and their pinned results
// -----------------------------------------------------------------------------
// tests/fixtures/clusters/followup-thresholds.json fixed every bound before the code existed. The first
// gate's legs C1b, C4 and D3 stay failing and bit-identical (tests/clustersResults.test.js re-runs that
// validator; leg X1 repeats it). A new leg that crosses its bound stays in followup-failed-legs.json.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import * as K from '../js/kernels/galaxy/clusters/index.js';
import { createCosmology } from '../js/kernels/cosmology/flrw.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/clusters/followup-thresholds.json');
const RESULTS = read('tests/fixtures/clusters/followup-results.json');
const FAILED = read('tests/fixtures/clusters/followup-failed-legs.json');
const OLD_FAILED = read('tests/fixtures/clusters/failed-legs.json');
const cosmology = { H0: 70, Om: 0.3, OL: 0.7 };
const factor = () => ({
  value: K.kPhys(),
  sigma: 0,
  source: 'invented for the test',
  radiusKind: 'half-number',
});
const analyse = (w, extra = {}) =>
  K.analyseCluster({ ...w, cosmology, factor: factor(), draws: 20, ...extra });
const row = id => RESULTS.rows.find(r => r.id.startsWith(`${id}.`));

describe('the opt-in terms', () => {
  test('d ln D_L / dz is the closed form, positive, and the redshift error is sd / sqrt(n)', () => {
    const c = createCosmology(cosmology);
    const z = 0.05;
    const h = 1e-5 * z;
    const fd =
      (Math.log(c.luminosityDistance(z + h)) -
        Math.log(c.luminosityDistance(z - h))) /
      (2 * h);
    expect(Math.abs(K.dlnLuminosityDistanceDz(c, z) - fd) / fd).toBeLessThan(
      1e-6
    );
    expect(K.clusterRedshiftSigma([1, 2, 3, 4, 5])).toBeCloseTo(
      Math.sqrt(2.5) / Math.sqrt(5),
      14
    );
    expect(K.distanceRelSigma(c, z, 1e-4)).toBeCloseTo(
      2 * K.dlnLuminosityDistanceDz(c, z) * 1e-4,
      14
    );
  });

  test('the expected bias is N_b / n at kappa 3 and the flag threshold is half the analytic error', () => {
    expect(K.expectedBias(7, 40, 3)).toBeCloseTo(7 / 40, 14);
    expect(K.expectedBias(10, 80, 4)).toBeCloseTo(
      0.5 * (10 / 80) * (16 / 3 - 1),
      14
    );
    expect(K.biasFlagThreshold(51)).toBeCloseTo(1 / (2 * Math.sqrt(100)), 14);
  });

  test('the Poisson tail is exact and the test needs an extent', () => {
    expect(K.poissonUpperTail(3, 1)).toBeCloseTo(1 - 2.5 / Math.E, 12);
    expect(K.poissonUpperTail(0, 3)).toBe(1);
    expect(
      K.overdensityTest({ nIn: 5, nPre: 9, halfWidthKms: 10, extentKms: null })
        .status
    ).toBe('unknown');
    const field = K.overdensityTest({
      nIn: 100,
      nPre: 100,
      halfWidthKms: 9000,
      extentKms: 8000,
    });
    expect(field.refuse).toBe(true);
    expect(K.OVERDENSITY_P_MAX).toBe(0.001);
  });

  test("every default is the first gate's behaviour", () => {
    const w = K.clusterWorld({
      seed: 'fu',
      index: 1,
      cosmology,
      light: true,
      interloperFraction: 0.5,
    });
    const a = analyse(w, { light: w.light });
    expect(a.light.terms.distance).toBe(0);
    expect(a.light.relSigma).toBe(a.light.terms.photometric);
    expect(a.flags.includes('contaminated-bias')).toBe(false);
    const b = analyse(w, { light: { ...w.light, distanceTerm: true } });
    expect(b.light.terms.distance).toBeGreaterThan(0);
    expect(b.light.relSigma).toBeGreaterThan(a.light.relSigma);
    expect(b.mass.kg).toBe(a.mass.kg);
    expect(analyse(w, { contaminationRule: 'odd' }).code).toBe(
      'bad-contamination-rule'
    );
  });

  test('a field is answered by default and refused with the option, a real cluster is not', () => {
    const f = K.clusterWorld({
      seed: 'fu',
      index: 2,
      cosmology,
      kind: 'field',
      N: 100,
      rt: 1.5,
    });
    expect(analyse(f).status).toBe('ok');
    const r = analyse(f, { requireOverdensity: true });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('no-overdensity');
    const c = K.clusterWorld({
      seed: 'fu',
      index: 3,
      cosmology,
      N: 80,
      sigma: 700,
      zc: 0.05,
      rt: 1.5,
    });
    expect(analyse(c, { requireOverdensity: true }).status).toBe('ok');
  });

  test('the truth manifest gained one field and no world changed', () => {
    const w = K.clusterWorld({
      seed: 'fu',
      index: 4,
      cosmology,
      interloperFraction: 0.5,
      N: 100,
      sigma: 800,
    });
    expect(w.truth.interlopersInsideWindow3Sigma).toBeGreaterThan(0);
    expect(w.truth.interlopersInsideWindow3Sigma).toBeLessThanOrEqual(
      w.truth.interlopers
    );
  });
});

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      THR.checks.map(c => c.id).sort()
    );
  });
  test('the follow-up failing legs are exactly C4b and D3b, left failing', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual([
      'C4b.lightCoverageWithDistance',
      'D3b.contaminationBiasFlag',
    ]);
    expect(
      RESULTS.rows.filter(r => r.status === 'fail').map(r => r.id)
    ).toEqual(FAILED.legs.map(l => l.id));
  });
  test('C4b misses only the 95 percent band; D3b misses only its calibration at 0.5', () => {
    const c = row('C4b').measured;
    const cl = THR.checks.find(x => x.id.startsWith('C4b.')).limits;
    expect(c.cover68).toBeGreaterThanOrEqual(cl.cover68[0]);
    expect(c.cover95).toBeLessThan(cl.cover95[0]);
    const d = row('D3b').measured;
    const dl = THR.checks.find(x => x.id.startsWith('D3b.')).limits;
    expect(d.calibration['0.5'].ratio).toBeLessThan(dl.ratioBand[0]);
    expect(d.calibration['0.1'].ratio).toBeGreaterThanOrEqual(dl.ratioBand[0]);
    expect(d.calibration['0.2'].ratio).toBeGreaterThanOrEqual(dl.ratioBand[0]);
    expect(d.flaggedShare).toBeGreaterThanOrEqual(dl.flaggedMin);
    expect(d.falseFlagShare).toBeLessThanOrEqual(dl.falseFlagMax);
    expect(d.biasedWorlds).toBeGreaterThanOrEqual(dl.classMin);
    expect(d.fineWorlds).toBeGreaterThanOrEqual(dl.classMin);
  });
  test("the closed-form legs, the oracle leg, the refusal and the old legs' check pass", () => {
    for (const id of ['A15', 'A16', 'A17', 'B6', 'R6b', 'X1'])
      expect(row(id).status).toBe('pass');
    expect(row('R6b').measured.fieldRefused).toBe(100);
    expect(row('X1').measured.differences).toEqual([]);
    expect(row('X1').measured.failing).toEqual(OLD_FAILED.legs.map(l => l.id));
  });
  test('the follow-up verdict is the committed function of the rows', () => {
    const G = THR.gate.verdictFunction.kernelLegGroups;
    const st = p =>
      RESULTS.rows.filter(r => r.id.startsWith(`${p}.`)).map(r => r.status);
    const ok = list => list.every(p => st(p).every(s => s === 'pass'));
    expect(ok(G.closedLegs) && ok(G.oracleLegs)).toBe(true);
    expect(RESULTS.gate.followupVerdict).toBe(ok(G.newLegs) ? 'A' : 'B');
    expect(RESULTS.gate.followupVerdict).toBe('B');
    expect(RESULTS.gate.consumers).toMatch(/unmet/);
  });
  test('the thresholds carry no amendment and forbid typing numbers and a background correction', () => {
    expect(THR.amendments).toEqual([]);
    expect(THR.rule).toMatch(/bit-identical/);
    expect(THR.rule).toMatch(/No background-corrected dispersion/);
    expect(THR.committed).toMatch(/not edited/);
  });
  test('the weak-cluster price is reported and the solar-mass difference is stated', () => {
    expect(row('R11').status).toBe('reported');
    expect(row('R9').measured.treeOverAstropy_minus1).toBeCloseTo(3.0e-4, 5);
    expect(THR.analysisRule.R19).toMatch(/3\.0e-4/);
  });
  test('the oracle shares no code with the kernel', () => {
    const src = readFileSync(
      new URL('../tools/clusters-oracle/oracle-followup.py', import.meta.url),
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
  test('every status and the measured numbers equal the pinned ones', () => {
    const r = JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/clusters-followup-validate.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    );
    expect(r.rows.map(x => `${x.id}:${x.status}`)).toEqual(
      RESULTS.rows.map(x => `${x.id}:${x.status}`)
    );
    for (const x of r.rows)
      expect(x.measured).toEqual(
        RESULTS.rows.find(y => y.id === x.id).measured
      );
    expect(r.verdict).toEqual(RESULTS.gate);
  }, 600000);
});
