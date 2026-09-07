import { describe, test, expect } from '@jest/globals';
import {
  CAVEAT,
  CONTROL,
  aliasExplains,
  checkControls,
  compareSchedules,
  describeArm,
  periodResolution,
} from '../js/rvCompare.js';
import { SCHEDULE, planSchedule } from '../js/rvSchedule.js';
import { mulberry32, normalizeSeed } from '../js/rng.js';

const PERIOD = 2.7;
const K = 40;

/**
 * Observe a circular signal at a plan's epochs.
 *
 * Noise is keyed by the epoch index and the seed, exactly as the survey does
 * it, so two plans that share an index share that draw: the arms then differ
 * only in the times, which is the whole point of the comparison.
 */
const observe = (plan, { sigma = 5, seed = 'cmp', period = PERIOD } = {}) =>
  plan.epochs.map(e => {
    const rng = mulberry32(normalizeSeed(`${seed}:${e.index}`));
    const draw = (rng() + rng() + rng() + rng() - 2) * sigma;
    return {
      day: e.offset,
      rv: K * Math.sin((2 * Math.PI * e.offset) / period) + draw,
      sigma,
    };
  });

const BOUNDS = { minPeriod: 1.2, maxPeriod: 8 };

describe('the resolution a baseline buys', () => {
  test('it is P squared over the baseline', () => {
    expect(periodResolution(2, 40)).toBeCloseTo(0.1, 12);
  });

  test('nothing to resolve without a baseline', () => {
    expect(periodResolution(2, 0)).toBe(Infinity);
    expect(periodResolution(0, 40)).toBe(Infinity);
  });
});

describe('describing one arm', () => {
  const plan = planSchedule({
    kind: SCHEDULE.IRREGULAR,
    epochs: 24,
    baselineDays: 30,
    seed: 'arm',
  });

  test('it reports the schedule and what came back from it', () => {
    const arm = describeArm(
      { label: 'A', kind: plan.kind, plan, measurements: observe(plan) },
      BOUNDS
    );
    expect(arm.taken).toBe(24);
    expect(arm.planned).toBe(24);
    expect(arm.missed).toBe(0);
    expect(arm.fingerprint).toMatch(/^[0-9A-Z]{7}$/);
    expect(arm.spanDays).toBeCloseTo(30, 0);
    expect(arm.fit.periodDays).toBeGreaterThan(0);
  });

  test('a well sampled arm recovers the period it was given', () => {
    const arm = describeArm({ plan, measurements: observe(plan) }, BOUNDS);
    expect(arm.fit.periodDays).toBeCloseTo(PERIOD, 1);
  });

  test('three points are not a fit, and it says so rather than guessing', () => {
    const arm = describeArm(
      { plan, measurements: observe(plan).slice(0, 3) },
      BOUNDS
    );
    expect(arm.fit).toBe(null);
    expect(arm.coverage).toBe(null);
  });

  test('phase coverage is folded on the fit, never on the truth', () => {
    // The signature of folding on the fitted period: an arm fitted at some
    // other period would report a different coverage for the same times.
    const arm = describeArm({ plan, measurements: observe(plan) }, BOUNDS);
    expect(arm.coverage.n).toBe(24);
    expect(arm.coverage.largestGap).toBeGreaterThan(0);
    expect(arm.coverage.largestGap).toBeLessThan(1);
  });

  test('epochs the run never took are counted as missed', () => {
    const arm = describeArm(
      { plan, measurements: observe(plan).slice(0, 20) },
      BOUNDS
    );
    expect(arm.missed).toBe(4);
  });
});

describe('the controls', () => {
  const left = { taken: 20, spanDays: 30 };
  const right = { taken: 20, spanDays: 30 };

  test('equal counts, spans, noise and seed is a controlled comparison', () => {
    const out = checkControls(left, right, {
      sigmaMs: { a: 5, b: 5 },
      seed: { a: 's', b: 's' },
      system: { a: 'star-1', b: 'star-1' },
    });
    expect(out.controlled).toBe(true);
    expect(out.broken).toEqual([]);
  });

  test('a different count is a broken control, not a footnote', () => {
    const out = checkControls(left, { taken: 18, spanDays: 30 });
    expect(out.controlled).toBe(false);
    expect(out.broken[0].control).toBe(CONTROL.COUNT);
  });

  test('a different star is a broken control', () => {
    const out = checkControls(left, right, {
      system: { a: 'star-1', b: 'star-2' },
    });
    expect(out.broken.map(b => b.control)).toContain(CONTROL.SYSTEM);
  });

  test('a different noise level is a broken control', () => {
    const out = checkControls(left, right, { sigmaMs: { a: 5, b: 9 } });
    expect(out.broken.map(b => b.control)).toContain(CONTROL.SIGMA);
  });
});

describe('comparing two schedules', () => {
  const regular = planSchedule({
    kind: SCHEDULE.REGULAR,
    epochs: 24,
    baselineDays: 30,
  });
  const irregular = planSchedule({
    kind: SCHEDULE.IRREGULAR,
    epochs: 24,
    baselineDays: 30,
    seed: 'sch',
  });

  const armOf = plan => ({
    kind: plan.kind,
    plan,
    measurements: observe(plan),
  });

  test('it never claims a winner from one draw each', () => {
    const out = compareSchedules(armOf(regular), armOf(irregular), BOUNDS);
    expect(out.caveats).toContain(CAVEAT.SINGLE_REALISATION);
    expect(out).not.toHaveProperty('better');
    expect(out).not.toHaveProperty('winner');
  });

  test('two arms with the same times are called out as one schedule', () => {
    const out = compareSchedules(armOf(regular), armOf(regular), BOUNDS);
    expect(out.caveats).toContain(CAVEAT.IDENTICAL);
  });

  test('an uncontrolled comparison is not interpretable', () => {
    const short = { ...armOf(irregular) };
    short.measurements = short.measurements.slice(0, 15);
    const out = compareSchedules(armOf(regular), short, BOUNDS);
    expect(out.controls.controlled).toBe(false);
    expect(out.interpretable).toBe(false);
    expect(out.caveats).toContain(CAVEAT.INCOMPLETE);
  });

  test('agreement is judged against the resolution, not against equality', () => {
    const out = compareSchedules(armOf(regular), armOf(irregular), BOUNDS);
    expect(out.periods.toleranceDays).toBeGreaterThan(0);
    // Two fits of the same star at 24 points over 30 days: the difference is
    // allowed to be nonzero and still be the same answer.
    expect(out.periods.agree).toBe(
      out.periods.differenceDays <= out.periods.toleranceDays
    );
  });

  test('a comb that aliases the signal disagrees with a schedule that does not', () => {
    // One observation per period, so the regular comb cannot tell the true
    // period from the one-day-alias family; the irregular plan of the same
    // count over the same baseline can.
    const comb = planSchedule({
      kind: SCHEDULE.REGULAR,
      epochs: 24,
      baselineDays: 24 * PERIOD,
    });
    const spread = planSchedule({
      kind: SCHEDULE.IRREGULAR,
      epochs: 24,
      baselineDays: 24 * PERIOD,
      jitter: 0.45,
      seed: 'anti-alias',
    });
    const bounds = { minPeriod: 1.2, maxPeriod: 20 };
    const out = compareSchedules(
      { kind: comb.kind, plan: comb, measurements: observe(comb) },
      { kind: spread.kind, plan: spread, measurements: observe(spread) },
      bounds
    );
    expect(out.controls.controlled).toBe(true);
    expect(out.arms[1].fit.periodDays).toBeCloseTo(PERIOD, 1);
    // The comb reads the signal off one alias down; the spread does not, and
    // the difference between them lands on the comb's own window peak.
    expect(out.periods.agree).toBe(false);
    expect(out.arms[0].window.worstPeak).toBeGreaterThan(
      out.arms[1].window.worstPeak
    );
    expect(out.alias).not.toBe(null);
    expect(out.alias.side).toBe('a');
    expect(out.caveats).toContain(CAVEAT.ALIAS);
  });

  test('a fit pinned to the edge of the search is not a result', () => {
    // The signal is at 2.7 days and the search is confined to 3.2-6, which
    // holds neither it nor a harmonic of it. Both arms come back pinned near
    // an end of the range and would otherwise look like an agreement.
    const bounds = { minPeriod: 3.2, maxPeriod: 6 };
    const out = compareSchedules(armOf(regular), armOf(irregular), bounds);
    expect(out.arms[0].fit.atBound).toBe(true);
    expect(out.arms[1].fit.atBound).toBe(true);
    expect(out.caveats).toContain(CAVEAT.AT_BOUND);
    expect(out.interpretable).toBe(false);
    // A range that does hold the signal is interpretable again, so the flag
    // is about the fit and not about this pair of schedules.
    const honest = compareSchedules(armOf(regular), armOf(irregular), BOUNDS);
    expect(honest.interpretable).toBe(true);
  });

  test('a difference that lands on a window peak is named as an alias', () => {
    const verdict = {
      agree: false,
      frequencyDifference: 1 / 3,
    };
    const a = {
      spanDays: 30,
      window: { peaks: [{ frequency: 1 / 3, periodDays: 3, power: 0.8 }] },
    };
    const b = { spanDays: 30, window: { peaks: [] } };
    const alias = aliasExplains(verdict, a, b);
    expect(alias.side).toBe('a');
    expect(alias.periodDays).toBeCloseTo(3, 12);
  });

  test('two arms that agree are not offered an alias explanation', () => {
    expect(aliasExplains({ agree: true }, {}, {})).toBe(null);
  });
});
