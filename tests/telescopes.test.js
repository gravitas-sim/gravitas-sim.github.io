// =============================================================================
// Telescopes and resolution over the existing PSF (Roadmap III, Prompt 208)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/telescopes/thresholds.json, committed
// before the kernel existed. (a) to (d) run live through tools/telescopes-validate.mjs
// (in a child process: the ensembles are 250 frames and a Jest VM runs them an
// order of magnitude slower) against the independent oracle's pinned results;
// (e), authentic data, is not measured and says so. The quick tests below hold the
// kernel's public contract: the two widths are different functions, refusals are
// coded, a frame is a pure function of its config, and a synthetic frame says so.
// =============================================================================

/* global process */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as O from '../js/kernels/detector/optics.js';
import {
  telescopeFrame,
  normalizeTelescope,
} from '../js/kernels/detector/telescope.js';
import { measureTelescope } from '../js/telescopeField.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/telescopes/thresholds.json');
const FAILED = read('tests/fixtures/telescopes/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present, and the one amendment is recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.airy.zeros',
      'A2.airy.fwhm',
      'A3.airy.encircled',
      'A4.airy.obstructed',
      'A5.moffat',
      'A6.rayleigh.dip',
      'A7.rayleigh.vs.fwhm',
      'A8.scales',
      'A9.combination.limits',
      'B1.pupil.fft',
      'B2.pupil.convolution',
      'F1.frame.flux',
      'C1.coverage',
      'C2.misspecified',
      'D1.refusals',
      'P1.speed',
      'A1.authentic',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1']);
    expect(
      THR.checks.find(c => c.id === 'C1.coverage').limits.coverageRange
    ).toEqual([0.6, 0.76]);
  });
  test('the baseline hash of the frame model is the one recorded before the prompt', () => {
    expect(
      read('tests/fixtures/telescopes/frame-baseline.json').sha256
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the validation table', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/telescopes-validate.mjs', '--json'],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }
    );
    rows = JSON.parse(out);
  }, 240000);
  test('every row passes except the ones recorded as failed legs, and authentic data is not measured', () => {
    const failing = rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failing).toEqual(FAILED.failed.map(f => f.id));
    expect(
      rows.filter(r => r.status === 'not-measured').map(r => r.id)
    ).toEqual(FAILED.notMeasured.map(f => f.id));
    expect(rows.length).toBe(THR.checks.length);
  });
  test('the ensemble rows report what they measured', () => {
    const c1 = rows.find(r => r.id === 'C1.coverage');
    expect(c1.measured.frames).toBe(200);
    expect(c1.measured.coverage).toBeGreaterThanOrEqual(0.6);
    expect(c1.measured.coverage).toBeLessThanOrEqual(0.76);
    const c2 = rows.find(r => r.id === 'C2.misspecified');
    expect(c2.measured.flaggedOfFrames).toBeGreaterThanOrEqual(0.9);
  });
});

describe('the kernel’s public contract', () => {
  const base = { apertureM: 0.25, wavelengthM: 550e-9 };
  test('the Rayleigh angle and the FWHM are different quantities, even with no atmosphere', () => {
    const r = O.rayleighAngle(base);
    const w = O.airyFwhm(base);
    expect(r / w).toBeCloseTo(1.1853032446, 9);
    expect(r).not.toBe(w);
  });
  test('an obstruction as large as the aperture, or a bad input, is refused with a code', () => {
    for (const bad of [
      () => O.rayleighAngle({ ...base, obstruction: 1 }),
      () => O.opticsPsf({ ...base, obstruction: 1.5 }),
      () => O.opticsPsf({ ...base, apertureM: 0 }),
      () => O.opticsPsf({ ...base, seeingRad: 1e-6, beta: 1 }),
    ])
      expect(bad).toThrow(O.OpticsError);
    try {
      O.rayleighAngle({ ...base, obstruction: 1.2 });
    } catch (e) {
      expect(e.code).toBe('obstruction');
    }
  });
  test('a larger aperture gathers light as the area and narrows the pattern as 1/D', () => {
    const g = O.lightGathering({ apertureM: 0.4 }, { apertureM: 0.1 });
    expect(g).toBeCloseTo(16, 12);
    expect(
      O.airyFwhm({ ...base, apertureM: 0.5 }) / O.airyFwhm(base)
    ).toBeCloseTo(0.5, 12);
  });
  test('seeing sets a floor: a bigger ground telescope stops narrowing the profile', () => {
    const w = d =>
      O.toArcsec(
        O.opticsPsf({
          apertureM: d,
          wavelengthM: 550e-9,
          seeingRad: O.toRad(1),
        }).fwhm
      );
    expect(w(0.1)).toBeGreaterThan(w(0.4));
    expect(w(0.4) - w(2)).toBeLessThan(w(0.1) - w(0.4));
    expect(w(8)).toBeGreaterThan(0.98);
  });
});

describe('the telescope frame', () => {
  const cfg = {
    apertureM: 0.3,
    seeingArcsec: 0.8,
    focalRatio: 10,
    separationArcsec: 1,
    seed: 'unit',
  };
  test('a frame is a pure function of its config and says it is synthetic', () => {
    const a = telescopeFrame(cfg);
    const b = telescopeFrame(cfg);
    expect(Array.from(a.frame.values)).toEqual(Array.from(b.frame.values));
    expect(a.truth.synthetic).toBe(true);
    expect(a.config.pixelScaleArcsec).toBeCloseTo(0.6875, 3);
  });
  test('a bad config is refused', () => {
    expect(() => normalizeTelescope({ scene: 'nope' })).toThrow(O.OpticsError);
    expect(() => normalizeTelescope({ size: 8 })).toThrow(O.OpticsError);
    expect(() => normalizeTelescope({ exposureS: 0 })).toThrow(O.OpticsError);
  });
  test('the tool measures a width near the profile’s, and the two numbers are kept apart', () => {
    const m = measureTelescope(cfg);
    expect(m.ok).toBe(true);
    expect(m.measuredFwhmArcsec / m.truthFwhmArcsec).toBeGreaterThan(0.94);
    expect(m.measuredFwhmArcsec / m.truthFwhmArcsec).toBeLessThan(1.06);
    expect(m.rayleighArcsec).not.toBeCloseTo(m.measuredFwhmArcsec, 2);
    expect(m.synthetic).toBe(true);
  });
});
