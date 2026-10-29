/* global process */
// =============================================================================
// Photometric calibration (Roadmap III, Prompt 212)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/photometric-calibration/thresholds.json,
// committed before the calibration module existed. Every leg runs live through
// tools/photometric-calibration-validate.mjs (in a child process: the ensembles are
// thousands of fits and a Jest VM runs them several times slower) against the
// independent oracle's pinned results (numpy, SciPy, Astropy). The four legs that
// cross their bounds are kept failing and labelled in failed-legs.json. The quick
// tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as K from '../js/kernels/detector/photcal.js';
import * as A from '../js/instruments/photcal.js';
import * as F from '../js/photcalField.js';
import { validateArtifact } from '../js/platform/artifact.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/photometric-calibration/thresholds.json');
const FAILED = read('tests/fixtures/photometric-calibration/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present and the amendments are recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.exact',
      'A2.closedForm.constant',
      'A3.closedForm.line',
      'A4.bouguer',
      'A5.conventions',
      'A6.airmass',
      'A7.colourEquation',
      'A8.propagation',
      'A9.assumed.sigmaC',
      'B1.parameters',
      'B2.covariance',
      'B3.calibrated',
      'B4.secondOrder',
      'P1.physical.colourTerm',
      'P2.physical.extinction',
      'P3.physical.limit',
      'C1.coverage',
      'C2.coverage.underestimated',
      'C3.coverage.falseAlarm',
      'D1.twoStandards',
      'D2.airmassLimit',
      'D3.extinctionNotConstrained',
      'D4.colourSpan',
      'D5.misspecified.secondOrder',
      'D6.refusals',
      'D7.unknownColour',
      'F1.frames',
      'R1.record',
      'R2.site',
      'E1.authentic',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
  });
  test('the limits the kernel exports are the committed constants', () => {
    const c = THR.constants;
    expect(K.LIMITS.airmass).toBe(c.airmassLimit);
    expect(K.LIMITS.standards).toBe(c.minimumStandards);
    expect(K.LIMITS.airmassSpan).toBe(c.minimumAirmassSpan);
    expect(K.LIMITS.colourSpan).toBe(c.minimumColourSpan);
    expect(K.LIMITS.secondOrderStandards).toBe(c.secondOrderMinimumStandards);
    expect(K.LIMITS.lackOfFitP).toBe(c.lackOfFitP);
    expect(K.LIMITS.unconstrainedColourSigma).toBe(c.unconstrainedColourSigma);
    expect(K.LIMITS.extinctionTolerance).toBe(
      c.extinctionNotConstrainedTolerance
    );
    expect(K.LEVELS).toEqual(c.intervalLevels);
  });
});

describe('the validation table', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/photometric-calibration-validate.mjs', '--json'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    rows = JSON.parse(out);
  }, 240000);
  test('every row passes except the ones recorded as failed legs', () => {
    const failing = rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failing).toEqual(FAILED.failed.map(f => f.id));
    expect(rows.filter(r => r.status === 'not-run')).toEqual([]);
    // every committed check has a row (B4 is reported as B4a and B4b)
    for (const c of THR.checks)
      expect(
        rows.some(r => r.id === c.id || r.id.startsWith(c.id.split('.')[0]))
      ).toBe(true);
  });
  test('the failed legs report what they measured', () => {
    const b4b = rows.find(r => r.id === 'B4b.firstOrder.lackOfFit');
    expect(b4b.measured.p).toBeGreaterThan(0.01);
    expect(b4b.measured.nestedTest.p).toBeLessThan(1e-6);
    const p3 = rows.find(r => r.id === 'P3.physical.limit');
    expect(Math.abs(p3.measured.firstOrderError)).toBeGreaterThan(0.005);
    expect(Math.abs(p3.measured.secondOrderError)).toBeLessThan(0.002);
    expect(p3.measured.coverFirst).toBeLessThan(p3.measured.coverSecond);
    const c2 = rows.find(r => r.id === 'C2.coverage.underestimated');
    expect(c2.measured.flagged).toBeGreaterThan(0.95);
    expect(c2.measured.flagged).toBeLessThan(0.99);
    const e1 = rows.find(r => r.id === 'E1.authentic');
    expect(e1.measured.c[0]).toBeGreaterThan(0.8);
    expect(e1.measured.holdout).toBeLessThan(0.9);
  });
  test('the independent oracle agrees with the kernel on the authentic cross-match', () => {
    const o = rows.find(r => r.id === 'E1.oracle');
    expect(o.status).toBe('pass');
    expect(o.measured.kernel.matched).toBe(o.measured.oracle.matched);
  });
});

describe('the kernel’s public contract', () => {
  const night = F.drawNight({ seed: 'unit' });
  test('a night is recovered and its calibrated magnitude covers the truth', () => {
    const s = K.solveNight(night.observations);
    expect(s.ok).toBe(true);
    expect(s.parameters.Z1.status).toBe('constrained');
    expect(Math.abs(s.parameters.Z1.value - night.truth.Z1)).toBeLessThan(
      4 * s.parameters.Z1.sigma
    );
    const t = F.drawTarget(night, {
      M: 13.2,
      C: 0.3,
      X: 1.9,
      sigma: 0.008,
      seed: 'unit',
    });
    const c = K.calibrate(s, t);
    expect(c.ok).toBe(true);
    expect(Math.abs(c.M - 13.2)).toBeLessThan(4 * c.sigma);
    expect(c.intervals[1].hi - c.intervals[1].lo).toBeGreaterThan(
      c.intervals[0].hi - c.intervals[0].lo
    );
  });
  test('a night is a pure function of its seed', () => {
    const again = F.drawNight({ seed: 'unit' });
    expect(again.observations.map(o => o.m)).toEqual(
      night.observations.map(o => o.m)
    );
    expect(F.drawNight({ seed: 'other' }).observations[0].m).not.toBe(
      night.observations[0].m
    );
  });
  test('the zero point is at unit airmass and the one outside the atmosphere differs by k', () => {
    const s = K.solveNight(night.observations);
    expect(s.parameters.Z0.value).toBeCloseTo(
      s.parameters.Z1.value - s.parameters.k.value,
      12
    );
  });
  test('a standard above the limit is excluded and named, a target above it is refused', () => {
    const hi = { ...night.observations[0], id: 'hi', X: 2.9 };
    const s = K.solveNight([...night.observations, hi]);
    expect(s.excluded).toEqual(['hi']);
    expect(s.flags).toContainEqual(
      expect.objectContaining({ code: 'airmass-above-limit', id: 'hi' })
    );
    expect(
      K.calibrate(s, { id: 't', m: 4, sigma: 0.01, X: 2.6, C: 0.3 })
    ).toEqual(
      expect.objectContaining({ ok: false, code: 'airmass-above-limit' })
    );
  });
  test('two standards leave the colour term not constrained, with no value', () => {
    const two = night.observations.filter(
      o => o.star === 's00' || o.star === 's13'
    );
    const s = K.solveNight(two);
    expect(s.parameters.c.status).toBe('not-constrained');
    expect(s.parameters.c.value).toBeNull();
  });
  test('a refusal carries a code and no number', () => {
    expect(K.instrumentalMagnitude({ counts: -1, seconds: 1 })).toEqual({
      ok: false,
      code: 'non-positive-counts',
    });
    expect(K.solveNight([])).toEqual({ ok: false, code: 'empty-night' });
  });
  test('the record validates and carries the not-constrained states', () => {
    const s = K.solveNight(night.observations);
    const cal = K.calibrate(s, { id: 'a', m: 4, sigma: 0.01, X: 1.4, C: 0.5 });
    const doc = A.calibrationRecord(s, [cal], {
      id: 'unit',
      source: { kind: 'forward-model', id: 'unit' },
    });
    expect(validateArtifact(doc)).toEqual([]);
    expect(doc.quantities.map(q => q.id)).toEqual(
      expect.arrayContaining([
        'zero-point',
        'extinction',
        'colour-term',
        'magnitude.a',
      ])
    );
  });
  test('the site adapter returns the library’s coefficient or nothing', () => {
    expect(A.siteExtinction('rubin', 'r').k).toBe(0.126);
    expect(A.siteExtinction('lco-1m0', 'V')).toBeNull();
  });
});
