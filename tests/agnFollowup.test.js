// =============================================================================
// The AGN follow-up (Prompt 252b): the new legs, their thresholds and the three rules they test
// -----------------------------------------------------------------------------
// tests/fixtures/agn/followup-thresholds.json fixed the bounds of the new legs A7b, B3b, C1b, C1c and D2b before
// the code existed; tools/agn-followup-validate.mjs judges the kernel against them and the pinned
// followup-results.json and followup-failed-legs.json hold the verdicts. The old legs (A7, B3, C1, D2, B6) are
// pinned by agnResults.test.js and are untouched. This file also holds the three rules: the non-harmonic world,
// the floor of the redshift and the mapping of a failed line fit.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import * as A from '../js/kernels/agn/index.js';
import { LINES } from '../js/data/radiation/lines.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/agn/thresholds.json');
const FU = read('tests/fixtures/agn/followup-thresholds.json');
const RES = read('tests/fixtures/agn/followup-results.json');
const FAILED = read('tests/fixtures/agn/followup-failed-legs.json');
const INPUTS = read('tests/fixtures/agn/oracle-inputs-followup.json');
const ORACLE = read('tests/fixtures/agn/oracle-results-followup.json');
const OLD_FAILED = read('tests/fixtures/agn/failed-legs.json');

const chk = (T, id) => T.checks.find(c => c.id.startsWith(id));
const lim = (T, id) => {
  const c = chk(T, id);
  const out = { ...c.limits };
  for (const a of T.amendments)
    for (const o of a.overrides ?? [])
      if (c.id === o.check) out[o.limit] = o.value;
  return out;
};

describe('the follow-up thresholds', () => {
  test('five new legs, no amendment, each naming the old leg it leaves failing', () => {
    expect(FU.checks.map(c => c.id.split('.')[0])).toEqual([
      'A7b',
      'B3b',
      'C1b',
      'C1c',
      'D2b',
    ]);
    expect(FU.amendments).toEqual([]);
    for (const c of FU.checks) expect(c.replaces).toMatch(/stays failing/);
  });
  test('every bound is the old leg’s (the same question, a different world or rule), none looser', () => {
    const a = lim(FU, 'A7b');
    const a0 = lim(THR, 'A7.');
    expect(a).toEqual(a0);
    const b = lim(FU, 'B3b');
    const b0 = lim(THR, 'B3.');
    for (const k of Object.keys(b0)) expect(b[k]).toEqual(b0[k]);
    const c0 = lim(THR, 'C1.');
    expect(lim(FU, 'C1b')).toEqual(c0);
    expect(lim(FU, 'C1c')).toEqual(c0);
    expect(lim(FU, 'D2b').minRefused).toBe(lim(THR, 'D2.').minRefused);
    expect(lim(FU, 'D2b').blendSeparationNm).toBe(
      lim(THR, 'D2.').blendSeparationNm
    );
    expect(lim(FU, 'D2b').oFraction).toBe(lim(THR, 'D2.').oFraction);
  });
  test('the seeds are new and the file says it came before the code', () => {
    const old = Object.values(THR.seeds).filter(v => typeof v === 'number');
    for (const k of ['ensembleRedshift', 'oracleInputs', 'refusals'])
      expect(old).not.toContain(FU.seeds[k]);
    expect(FU.committed).toMatch(/before any follow-up code/);
    expect(FU.rule).toMatch(/stay failing and labelled/);
  });
  test('the old failed legs are exactly as before: five, none moved', () => {
    expect(OLD_FAILED.legs.map(l => l.id).sort()).toEqual([
      'A7.quasarShift',
      'B3.redshiftOracle',
      'B6.lineFluxOracle',
      'C1.redshiftCoverage',
      'D2.undetectedAndBlended',
    ]);
  });
});

describe('the pinned follow-up results', () => {
  test('one row per committed leg plus the two reported counts', () => {
    expect(RES.rows.map(r => r.id).sort()).toEqual(
      [
        ...FU.checks.map(c => c.id),
        'C1c.coverageAtTwoSigma',
        'D2b.reachedThroughFitFailure',
      ].sort()
    );
    expect(
      RES.rows
        .filter(r => r.status === 'reported')
        .map(r => r.id)
        .sort()
    ).toEqual(['C1c.coverageAtTwoSigma', 'D2b.reachedThroughFitFailure']);
  });
  test('the failed-legs file is exactly the failing rows, each with its reason', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RES.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
    for (const l of FAILED.legs) expect(l.note.length).toBeGreaterThan(120);
  });
  test('the verdicts as recorded: all five new legs cross a bound and stay failing', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual([
      'A7b.quasarShiftNonHarmonic',
      'B3b.redshiftOracleNonHarmonic',
      'C1b.redshiftCoverageNonHarmonic',
      'C1c.redshiftCoverageWithFloor',
      'D2b.failedFitIsNondetection',
    ]);
  });
  test('the oracle inputs hold forward-model data only and the oracle read all eight cases', () => {
    expect(INPUTS.note).toMatch(/no analysis output/);
    expect(INPUTS.quasars).toHaveLength(8);
    expect(ORACLE.b3).toHaveLength(8);
    expect(ORACLE.b3fft).toHaveLength(4);
    expect(ORACLE.note).toMatch(/no Gravitas code/);
    const text = JSON.stringify(INPUTS.quasars[0]).replace(/forwardZ/g, '');
    expect(text).not.toMatch(/"sigmaZ"|"significance"|"redshift"/);
  });
  test('the validator reproduces every pinned row', () => {
    let out;
    try {
      out = execFileSync(
        process.execPath,
        ['tools/agn-followup-validate.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      );
    } catch (e) {
      out = e.stdout; // exits 1 while a leg fails (left failing, labelled)
    }
    const live = JSON.parse(out);
    expect(live).toEqual(RES.rows);
  }, 120000);
});

describe('W1: the non-harmonic world', () => {
  const six = f => [
    ...['h-alpha', 'h-beta', 'h-gamma'].map(
      id => LINES.find(l => l.id === id).vacuum
    ),
    ...Object.values(f).map(
      x => x * LINES.find(l => l.id === 'h-alpha').vacuum
    ),
  ];
  test('the harmonic set stays the default and the factors are the committed ones', () => {
    expect(A.QUASAR_LINE_SETS.harmonic).toEqual({
      'invented-A': 0.2,
      'invented-B': 0.3,
      'invented-C': 0.4,
    });
    expect(A.NON_HARMONIC_FACTORS).toEqual(FU.worlds.inventedFactors);
    const d = A.generateQuasar({ lines: LINES, z: 0.3, noise: false });
    expect(d.truth.lineSet).toBe('harmonic');
    const ha = LINES.find(l => l.id === 'h-alpha').vacuum;
    expect(d.truth.lines.find(l => l.id === 'invented-A').restNm).toBeCloseTo(
      0.2 * ha,
      9
    );
    const n = A.generateQuasar({
      lines: LINES,
      z: 0.3,
      noise: false,
      lineSet: 'non-harmonic',
    });
    expect(n.truth.lines.find(l => l.id === 'invented-A').restNm).toBeCloseTo(
      0.175 * ha,
      9
    );
    expect(() => A.quasarLineList({ lines: LINES, lineSet: 'x' })).toThrow(
      /no line set/
    );
  });
  test('the factor rule holds: separation at the committed value, and two lines in the window at every z', () => {
    const sep = rest => {
      const L = rest.map(Math.log10);
      const d = [];
      for (let i = 0; i < L.length; i++)
        for (let j = i + 1; j < L.length; j++) d.push(Math.abs(L[i] - L[j]));
      let s = Math.min(...d);
      for (let i = 0; i < d.length; i++)
        for (let j = i + 1; j < d.length; j++)
          s = Math.min(s, Math.abs(d[i] - d[j]));
      return s;
    };
    expect(sep(six(A.NON_HARMONIC_FACTORS))).toBeGreaterThan(0.0245);
    expect(sep(six(A.QUASAR_LINE_SETS.harmonic))).toBeLessThan(0.004);
    const lo = 380;
    const hi = 10 ** (Math.log10(380) + 0.0002 * 2100);
    for (let z = 0.1; z <= 2.4001; z += 0.01) {
      const n = six(A.NON_HARMONIC_FACTORS).filter(
        r => r * (1 + z) >= lo * 1.03 && r * (1 + z) <= hi / 1.03
      ).length;
      expect(n).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('R2: the redshift’s default model-limited floor', () => {
  const tpl = A.quasarTemplate({ lines: LINES, lineSet: 'non-harmonic' });
  const zr = { min: 0, max: 2.6 };
  const w = A.generateQuasar({
    lines: LINES,
    z: 0.3,
    snr: 15,
    seed: 'floor',
    lineSet: 'non-harmonic',
  });
  test('the floor is c ln(10) step / sqrt(12), from the spectrum’s own step', () => {
    const v = A.gridFloorKmS(w);
    expect(v / ((299792.458 * Math.LN10 * 2e-4) / Math.sqrt(12))).toBeCloseTo(
      1,
      12
    );
    expect(v).toBeGreaterThan(39);
    expect(v).toBeLessThan(41);
  });
  test('the total interval is the quadrature sum, the noise-only sigmaZ is unchanged and the rule is stated', () => {
    const r = A.quasarRedshift(w, tpl, { zRange: zr });
    expect(r.status).toBe('ok');
    expect(r.modelSigmaZ).toBeCloseTo(
      ((1 + r.z) * (Math.LN10 * 2e-4)) / Math.sqrt(12),
      12
    );
    expect(r.sigmaZTotal).toBeCloseTo(Math.hypot(r.sigmaZ, r.modelSigmaZ), 14);
    expect(r.modelTerm.kind).toBe('grid-floor');
    expect(r.modelTerm.rule).toMatch(/a floor, not an estimate/);
    const noFloor = A.quasarRedshift(w, tpl, {
      zRange: zr,
      keepProfile: false,
    });
    expect(noFloor.sigmaZ).toBe(r.sigmaZ);
  });
  test('a caller’s systematic replaces the floor', () => {
    const r = A.quasarRedshift(w, tpl, { zRange: zr, systematicKmS: 300 });
    expect(r.modelSigmaZ).toBeCloseTo(((1 + r.z) * 300) / 299792.458, 12);
    expect(r.modelTerm.kind).toBe('caller-systematic');
  });
  test('a refused result carries no model term', () => {
    const f = A.generateQuasar({
      lines: LINES,
      z: 0.3,
      featureless: true,
      snr: 5,
    });
    const r = A.quasarRedshift(f, tpl, { zRange: zr });
    expect(r.status).not.toBe('ok');
    expect(r.modelSigmaZ).toBeUndefined();
    expect(r.sigmaZTotal).toBeUndefined();
  });
});

describe('F1: a failed fit at the expected position is a non-detection', () => {
  // the 27th world of D2b's weak-line set: the fit of the invented O line is singular
  const w = A.generateNarrowLines({
    lines: LINES,
    z: 0.1,
    x: -0.5,
    y: Math.log10(0.005),
    hAlphaFlux: 3,
    snr: 10,
    seed: 'fd2a-26',
  });
  const args = { z: 0.1, rest: w.truth.restNm, sources: w.truth.sources };
  test('by default: not-constrained, line-not-detected, naming the line, flagged as a fit failure, with the reason', () => {
    const m = A.measureBptLines(w, args);
    expect(m.status).toBe('not-constrained');
    expect(m.code).toBe('line-not-detected');
    expect(m.fitFailed).toBe(true);
    expect(m.lines).toEqual(['o']);
    expect(m.failedFits).toEqual([{ line: 'o', reason: 'singular' }]);
    expect(m.why).toMatch(/not a statement that it is absent/);
    expect(m.flux).toBeUndefined();
  });
  test('the committed rule of Prompt 252 is kept as an option so the old D2 replays', () => {
    const m = A.measureBptLines(w, {
      ...args,
      fitFailureCode: 'line-fit-failed',
    });
    expect(m.code).toBe('line-fit-failed');
    expect(m.fitFailed).toBeUndefined();
  });
  test('a measurable world is unaffected by the option', () => {
    const s = A.generateNarrowLines({
      lines: LINES,
      z: 0.1,
      seed: 'f1-ok',
      snr: 30,
      hAlphaFlux: 6,
    });
    const a = A.measureBptLines(s, {
      z: 0.1,
      rest: s.truth.restNm,
      sources: s.truth.sources,
    });
    const b = A.measureBptLines(s, {
      z: 0.1,
      rest: s.truth.restNm,
      sources: s.truth.sources,
      fitFailureCode: 'line-fit-failed',
    });
    expect(a.status).toBe('ok');
    expect(a).toEqual(b);
  });
});
