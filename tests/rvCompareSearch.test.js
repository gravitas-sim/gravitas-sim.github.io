// Prompt 112 part 2: the schedule comparison's two period searches run in the
// inference Worker, and the comparison reads the same as when it searched on
// the page (a long run's search was seconds of the page's time).

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { installRealm, uninstallRealm } from './rvRealm.js';
import { setRvSpawn } from '../js/inference/rvClient.js';
import { searchArms } from '../js/rvCompareSearch.js';
import { compareSchedules } from '../js/rvCompare.js';
import { buildComparison } from '../js/rvScheduleControls.js';
import { SCHEDULE, planSchedule } from '../js/rvSchedule.js';
import { mulberry32, normalizeSeed } from '../js/rng.js';

beforeAll(installRealm);
afterAll(uninstallRealm);

const observe = (plan, sigma = 5) =>
  plan.epochs.map(e => {
    const rng = mulberry32(normalizeSeed(`cmp:${e.index}`));
    const draw = (rng() + rng() + rng() + rng() - 2) * sigma;
    return {
      day: e.offset,
      rv: 40 * Math.sin((2 * Math.PI * e.offset) / 2.7) + draw,
      sigma,
    };
  });

const plans = [
  planSchedule({ kind: SCHEDULE.REGULAR, epochs: 24, baselineDays: 30 }),
  planSchedule({
    kind: SCHEDULE.IRREGULAR,
    epochs: 24,
    baselineDays: 30,
    seed: 'arm',
  }),
];
const BOUNDS = { minPeriod: 1.2, maxPeriod: 8 };
const arms = plans.map((plan, i) => ({
  label: 'AB'[i],
  kind: plan.kind,
  plan,
  measurements: observe(plan),
}));
const held = {
  sigmaMs: { a: 5, b: 5 },
  seed: { a: 'x', b: 'x' },
  system: { a: 1, b: 1 },
};

describe('the comparison with its searches run in the Worker', () => {
  test('is identical, to the last digit, to searching on the page', async () => {
    const searches = await searchArms(arms, BOUNDS);
    expect(searches).toHaveLength(2);
    const here = compareSchedules(arms[0], arms[1], { ...BOUNDS, held });
    const worker = compareSchedules(arms[0], arms[1], {
      ...BOUNDS,
      held,
      searches,
    });
    expect(JSON.stringify(worker)).toBe(JSON.stringify(here));
    expect(worker.arms[0].fit.periodDays).toBeGreaterThan(0);
  });

  test('an arm with too few usable points is null without asking a realm', async () => {
    const few = { ...arms[0], measurements: arms[0].measurements.slice(0, 3) };
    const out = await searchArms([few, arms[1]], BOUNDS);
    expect(out[0]).toBeNull();
    expect(out[1]).not.toBeNull();
  });

  test('buildComparison answers the same as the page-side comparison', async () => {
    const lib = await import('../js/rvCompare.js');
    const survey = (plan, i) => ({
      config: { kind: plan.kind, plan, sigmaMs: 5, seed: 'x' },
      measurements: () => arms[i].measurements,
    });
    const got = await buildComparison({
      lib,
      armA: survey(plans[0], 0),
      armB: survey(plans[1], 1),
      bounds: BOUNDS,
      target: 1,
    });
    const here = compareSchedules(arms[0], arms[1], { ...BOUNDS, held });
    expect(JSON.stringify(got)).toBe(JSON.stringify(here));
  });

  test('a realm that fails leaves the comparison searched on the page', async () => {
    setRvSpawn(() => {
      throw new Error('no Worker here');
    });
    try {
      const lib = await import('../js/rvCompare.js');
      const survey = (plan, i) => ({
        config: { kind: plan.kind, plan, sigmaMs: 5, seed: 'x' },
        measurements: () => arms[i].measurements,
      });
      const got = await buildComparison({
        lib,
        armA: survey(plans[0], 0),
        armB: survey(plans[1], 1),
        bounds: BOUNDS,
        target: 1,
      });
      expect(got.arms[0].fit.periodDays).toBeGreaterThan(0);
      expect(got.arms[1].fit.periodDays).toBeGreaterThan(0);
    } finally {
      await installRealm();
    }
  });
});
