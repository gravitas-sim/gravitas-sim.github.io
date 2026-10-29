// =============================================================================
// The survey-design kernel (Roadmap III, Prompt 215): the validation group
// -----------------------------------------------------------------------------
// tools/survey-validate.mjs runs every committed check (tests/fixtures/survey/
// thresholds.json) against the kernel, the adapter and the oracle's pinned results.
// Every row must pass except the four that crossed their bounds, which are recorded
// in failed-legs.json and stay failing (only Carl resets a bound), and E1, which is
// not run. A bound is never edited to make a row pass.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as K from '../js/kernels/survey/index.js';
import { runAll, THRESHOLDS } from '../tools/survey-validate.mjs';

const failed = JSON.parse(
  readFileSync(
    new URL('./fixtures/survey/failed-legs.json', import.meta.url),
    'utf8'
  )
);

describe('the committed checks', () => {
  const rows = runAll();
  test('every check has a row and the thresholds were committed with amendments recorded', () => {
    const ids = new Set(rows.map(r => r.id));
    for (const c of THRESHOLDS.checks) expect(ids.has(c.id)).toBe(true);
    for (const a of THRESHOLDS.amendments) expect(a.boundMoved).toBe(false);
  });
  test('the rows that fail are exactly the recorded failed legs', () => {
    const fail = rows.filter(r => r.status === 'fail').map(r => r.id).sort();
    expect(fail).toEqual(failed.failed.map(f => f.id).sort());
    expect(fail).toEqual(['A3.skyLimited', 'A4.optimum', 'A5.timeRatio', 'B2.cosmology']);
  });
  test('every other row passes and E1 is not run', () => {
    for (const r of rows) {
      if (r.id === 'E1.authentic') expect(r.status).toBe('not-run');
      else if (!failed.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({ id: r.id, status: 'pass' });
    }
  });
});

describe('the kernel', () => {
  const setup = THRESHOLDS.setups.lcoLike;
  const plan = { exposure: 300, visits: 1, nights: 10 };
  test('a plan is exact arithmetic and deterministic', () => {
    const a = K.evaluate({ setup, plan, cls: 'uniform-euclidean' });
    const b = K.evaluate({ setup, plan, cls: 'uniform-euclidean' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.pointings).toBe(Math.floor(172800 / 328));
    expect(a.areaDeg2).toBeCloseTo(a.pointings * setup.fovDeg2, 9);
  });
  test('a goal the plan cannot meet is not feasible, with every reason', () => {
    const r = K.evaluate({ setup, plan, cls: 'uniform-euclidean' });
    const v = K.assess(r, { depth: r.depth + 1, areaDeg2: r.areaDeg2 * 2 });
    expect(v.feasible).toBe(false);
    expect(v.reasons.sort()).toEqual(['area', 'depth']);
  });
  test('counts beyond a class’s range are refused, never extrapolated', () => {
    const r = K.evaluate({ setup, plan, cls: 'galaxies-local' });
    expect(r.status).toBe('outside-count-model');
    expect(r.counts).toBe(null);
  });
  test('the Euclidean slope is 0.6 and the break-even for deep against wide is 0.8', () => {
    expect(K.CLASSES['uniform-euclidean'].alpha).toBe(0.6);
    expect(K.optimumExposure(0.8, 20)).toBe(Infinity);
    expect(K.optimumExposure(0.6, 20)).toBeCloseTo(60, 9);
  });
  test('malformed input is a refusal with a code', () => {
    for (const bad of [
      { exposure: 0 },
      { visits: 0 },
      { nights: -1 },
      { threshold: 0 },
      { clearFraction: 2 },
    ]) {
      const r = K.evaluate({ setup, plan: { ...plan, ...bad }, cls: 'steep' });
      expect(r.ok).toBe(false);
      expect(typeof r.code).toBe('string');
    }
  });
});
