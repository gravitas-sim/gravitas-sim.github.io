// =============================================================================
// Exposure planning (Roadmap III, Prompt 210)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/exposure/thresholds.json, committed
// before the kernel's extension existed. The legs run live through
// tools/exposure-validate.mjs (in a child process: the ensembles are 400 frames
// and a Jest VM runs them an order of magnitude slower) against the independent
// oracle's pinned results. A leg that crossed its bound stays failing and
// labelled in tests/fixtures/exposure/failed-legs.json: this test holds that the
// recorded legs still fail and that nothing else does. The quick tests hold the
// kernel's public contract: the equation of the existing calculator is
// unchanged for one exposure, refusals are coded, a plan states its assumptions.
// =============================================================================

/* global process */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as K from '../js/kernels/detector/snr.js';
import * as E from '../js/instruments/exposure.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/exposure/thresholds.json');
const FAILED = read('tests/fixtures/exposure/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present, and the amendment is recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.limits',
      'A2.handWorked',
      'A3.exposureInverse',
      'A4.limitingMagnitudeInverse',
      'A5.exposures',
      'A6.scaling',
      'A7.extended',
      'A8.extinction',
      'A9.noiseEquivalentArea',
      'A10.lessonArithmetic',
      'B1.implementation',
      'B2.readNoiseLoss',
      'B3.doubling',
      'B4.offFiducial',
      'B5.airmassLoss',
      'B6.impliedThroughput',
      'B7.adapter',
      'C1.coverage',
      'C2.detection',
      'D1.notReachable',
      'D2.noSignal',
      'D3.belowHorizon',
      'D4.saturation',
      'D5.adapterRefusals',
      'D6.flatFieldFloor',
      'E1.authentic',
      'P1.speed',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
  });
});

describe('the validation table (tools/exposure-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/exposure-validate.mjs', '--json'],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    rows = JSON.parse(out);
  }, 280_000);

  test('every leg of the contract has a row', () => {
    expect(rows.map(r => r.id)).toEqual(
      expect.arrayContaining(THR.checks.map(c => c.id))
    );
  });
  test('only the recorded legs fail, and each still fails', () => {
    const failing = rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failing.sort()).toEqual(FAILED.failed.map(f => f.id).sort());
  });
  test('the legs that were passing still pass (analytic, oracle, coverage, refusals)', () => {
    for (const r of rows)
      if (!FAILED.failed.some(f => f.id === r.id) && r.status !== 'not-run')
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
  test('authentic data is not measured and says so', () => {
    const e1 = rows.find(r => r.id === 'E1.authentic');
    expect(e1.status).toBe('not-run');
    expect(FAILED.notMeasured.map(n => n.id)).toContain('E1.authentic');
  });
});

describe('the extension keeps the existing calculator', () => {
  const p = { rate: 40, skyRate: 5, darkRate: 0.1, readNoise: 8, npix: 25 };
  test('one exposure is the equation as it was', () => {
    const a = K.snrAt(p, 100);
    const sig = p.rate * 100;
    const v =
      sig + 25 * (p.skyRate * 100 + p.darkRate * 100 + p.readNoise ** 2);
    expect(a).toBeCloseTo(sig / Math.sqrt(v), 12);
    expect(K.snrAt({ ...p, nExp: 1 }, 100)).toBe(a);
  });
  test('more exposures cost read noise and only that', () => {
    expect(K.snrAt({ ...p, nExp: 4 }, 100)).toBeLessThan(K.snrAt(p, 100));
    expect(K.exposureForSnr({ ...p, snr: 50, nExp: 4 })).toBeGreaterThan(
      K.exposureForSnr({ ...p, snr: 50 })
    );
  });
});

describe('planExposure', () => {
  const base = {
    zeroPoint: 1e9,
    pixelScale: 1,
    fwhm: 2.8,
    skyMag: 21,
    readNoise: 8,
    darkRate: 0.1,
    nExp: 1,
    targetSnr: 20,
    source: { kind: 'point', mag: 16 },
  };
  test('a plan carries its budget, its regime and its assumptions', () => {
    const r = K.planExposure(base);
    expect(r.status).toBe('ok');
    expect(r.snr).toBeCloseTo(20, 9);
    expect(r.budget.map(b => b.term)).toEqual([
      'source',
      'sky',
      'dark',
      'read',
    ]);
    expect(r.budget.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 12);
    expect(r.assumptions).toContain('no-flat-field-error');
    expect(['source', 'sky', 'dark', 'read']).toContain(r.dominant);
  });
  test('every refusal has a code and no time', () => {
    for (const [over, reason] of [
      [{ source: { kind: 'point', mag: NaN } }, 'no-signal'],
      [{ targetSnr: 0 }, 'bad-input'],
      [{ airmass: Infinity }, 'below-horizon'],
      [{ nExp: 0 }, 'bad-input'],
    ]) {
      const r = K.planExposure({ ...base, ...over });
      expect(r.reason).toBe(reason);
      expect(r.seconds).toBeUndefined();
    }
  });
  test('a target beyond the exposure limit is not reachable, with the SNR reached', () => {
    const r = K.planExposure({
      ...base,
      source: { kind: 'point', mag: 26 },
      maxTotal: 600,
    });
    expect(r.status).toBe('not-reachable');
    expect(r.reason).toBe('exposure-limit');
    expect(r.reachedSnr).toBeLessThan(20);
  });
});

describe('the facility adapter', () => {
  test('a value the table lacks is an error, never a default', () => {
    expect(() =>
      E.exposureSetupOf('rubin', { band: 'r', zeroPoint: 1e11 })
    ).toThrow(/no darkCurrent/);
    expect(() =>
      E.exposureSetupOf('lco-1m0', { band: 'V', darkRate: 0.002 })
    ).toThrow(/no zero point/);
  });
  test('what the caller supplies is recorded as supplied', () => {
    const r = E.exposureSetupOf('rubin', {
      band: 'r',
      zeroPoint: 1e11,
      darkRate: 0,
    });
    expect(r.from.zeroPoint).toEqual({ supplied: true });
    expect(r.from.readNoise.source).toBe('ivezic2019');
  });
});
