// =============================================================================
// Detector effects II (Roadmap III, Prompt 211)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/detector-effects/thresholds.json,
// committed before the effects module existed. (a) to (d) and F1 run live through
// tools/detector-effects-validate.mjs (in a child process: the ensembles are many
// frames and a Jest VM runs them an order of magnitude slower) against the
// independent oracle's pinned results; (e), authentic data, is not measured and
// says so. The quick tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as E from '../js/kernels/detector/effects.js';
import { samplingOf } from '../js/kernels/detector/sampling.js';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { effectsFrame, measureEffects } from '../js/effectsField.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/detector-effects/thresholds.json');
const FAILED = read('tests/fixtures/detector-effects/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present and the amendments are recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.response.curve',
      'A2.response.limit',
      'A3.saturation.frame',
      'A4.nonlinearity.frame',
      'A5.cosmic.track',
      'A6.cosmic.rate',
      'A7.cosmic.morphology',
      'A8.bleed.conservation',
      'A9.bleed.trail',
      'A10.bleed.frame',
      'A11.sampling.phase',
      'A12.sampling.trend',
      'A13.flags',
      'B1.cosmic.internal',
      'B2.cosmic.oracle',
      'B3.cosmic.agreement',
      'C1.coverage',
      'D1.refusals',
      'D3.cosmic.unflagged',
      'D2.sidecar',
      'F1.frame.identity',
      'P1.speed',
      'E1.authentic',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
  });
  test('the baseline hash of the frame model is the one recorded before the prompt', () => {
    expect(
      read('tests/fixtures/detector-effects/frame-baseline.json').sha256
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the validation table', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/detector-effects-validate.mjs', '--json'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
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
  test('the failed legs report what they measured', () => {
    const b1 = rows.find(r => r.id === 'B1.cosmic.internal');
    expect(b1.measured.recall).toBeLessThan(0.9);
    expect(b1.measured.falsePositives).toBe(0);
    const d1 = rows.find(r => r.id === 'D1.refusals');
    expect(d1.measured.trailStarsWithMask).toEqual(['masked', 'masked']);
    expect(d1.measured.trailUnflaggedNotRefused).toBe(false);
  });
});

describe('the kernel’s public contract', () => {
  test('the response is the identity to the knee and rolls off above it', () => {
    expect(E.responseCurve(30000, 50000, 0.8)).toBe(30000);
    expect(E.responseCurve(50000, 50000, 0.8)).toBeLessThan(50000);
    expect(E.responseCurve(50000, 50000, 0.8)).toBeCloseTo(
      40000 + 10000 * Math.tanh(1),
      9
    );
  });
  test('a bad knee, deviation or effects object is refused', () => {
    expect(() => E.responseCurve(1, 50000, 1)).toThrow();
    expect(() => E.linearLimit(0, 50000, 0.8)).toThrow();
    expect(() =>
      E.normalizeEffects({ nonlinearity: { kneeFraction: 2 } })
    ).toThrow();
    expect(() => E.normalizeEffects({ bleed: { maxLengthPx: 0 } })).toThrow();
    expect(() => E.normalizeEffects(5)).toThrow();
  });
  test('an absent cosmic key keeps the legacy rays, false removes them, true is the track model', () => {
    expect(E.normalizeEffects({}).cosmic).toBe('legacy');
    expect(E.normalizeEffects({ cosmic: false }).cosmic).toBeNull();
    expect(E.normalizeEffects({ cosmic: true }).cosmic.dedxPerPixel).toBe(1200);
  });
  test('the regime follows the cutoffs and a non-positive width is refused', () => {
    expect(samplingOf(1.5).regime).toBe('under');
    expect(samplingOf(3).regime).toBe('adequate');
    expect(samplingOf(5).regime).toBe('over');
    expect(() => samplingOf(0)).toThrow();
  });
  test('a frame with effects is a pure function of its spec and says which effects it applied', () => {
    const spec = {
      seed: 'unit',
      exposure: 30,
      detector: { width: 32, height: 32 },
      scene: { sky: 3, sources: [{ x: 16, y: 16, rate: 1e5 }] },
      effects: { nonlinearity: true, cosmic: true, bleed: true },
    };
    const a = simulateFrame(spec);
    const b = simulateFrame(spec);
    expect(Array.from(a.values)).toEqual(Array.from(b.values));
    expect(a.truth.effects.applied.bleed).not.toBeNull();
    expect(a.truth.effects.bits.map(x => x.value)).toEqual([1, 2, 4, 8]);
    expect(a.truth.effects.linearLimitElectrons).toBeGreaterThan(40000);
  });
  test('a bad scene config is refused', () => {
    expect(() => effectsFrame({ brightMag: 1 })).toThrow();
    expect(() => effectsFrame({ exposureS: 0 })).toThrow();
    expect(() => effectsFrame({ fwhmPx: 20 })).toThrow();
  });
  test('the tool refuses the saturated star and measures a clean one within its error', () => {
    const m = measureEffects({});
    const s = m.rows.find(r => r.id === 'S');
    const c = m.rows.find(r => r.id === 'C');
    expect(s.code).toBe('saturated');
    expect(Math.abs(c.pull)).toBeLessThan(3);
    expect(s.ignored.ratio).toBeLessThan(0.5);
  });
});
