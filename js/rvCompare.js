// =============================================================================
// Comparing two observing schedules on the same star
// =============================================================================
//
// The question this exists to answer is the one a reader asks after their first
// aliased fit: "would observing at different times have got a different
// answer?" It can only be answered by a controlled comparison - the same star,
// the same number of observations, the same baseline, the same noise model and
// the same seed, with nothing different but WHEN the telescope looked.
//
// So this module compares, and refuses to pretend. Everything that is supposed
// to be held constant is checked rather than assumed, and anything that came
// out unequal is reported as a broken control rather than quietly folded into
// the result. A comparison in which one arm lost three observations to a gap is
// still worth looking at; it is not a comparison of scheduling alone, and the
// reader has to be told which one they are holding.
//
// What it deliberately does NOT do:
//
//   - decide which schedule is better. Each arm is one realisation of one
//     noise draw. A schedule that recovered the period here can miss it on the
//     next seed, and a comparison of two single runs cannot tell a property of
//     the schedule from a property of the draw. Saying which arm won this run
//     is a fact; saying which schedule is better is a claim this evidence
//     cannot carry, and the caveats travel with the report so a lesson cannot
//     print the second while quoting the first.
//   - use the simulation's true period for anything. The fits are fits, and
//     the phase coverage is folded on what was FITTED. Folding on the truth
//     would show the reader a coverage they could not have computed.
// =============================================================================

import { periodSearch } from './rvFit.js';
import {
  phaseCoverageDetail,
  scheduleFingerprint,
  spectralWindow,
} from './rvSchedule.js';

/** What a comparison can be wrong about, as message-id suffixes. */
export const CONTROL = Object.freeze({
  COUNT: 'count',
  BASELINE: 'baseline',
  SIGMA: 'sigma',
  SEED: 'seed',
  SYSTEM: 'system',
  NOISE_MODEL: 'noiseModel',
});

/** Things the reader has to be told about any result this produces. */
export const CAVEAT = Object.freeze({
  /** One draw each. */
  SINGLE_REALISATION: 'singleRealisation',
  /** The two plans observe at the same instants. */
  IDENTICAL: 'identicalSchedules',
  /** An arm has too few measurements to fit at all. */
  UNFITTABLE: 'unfittable',
  /** An arm did not complete its plan. */
  INCOMPLETE: 'incomplete',
  /** The arms disagree, and the disagreement sits on a window peak. */
  ALIAS: 'aliasDifference',
});

const days = measurements =>
  (measurements || []).map(m => Number(m.day)).filter(Number.isFinite);

const spacingsOf = list => {
  const sorted = [...list].sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < sorted.length; i++) out.push(sorted[i] - sorted[i - 1]);
  return out;
};

const median = list => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * How finely a run of this baseline can place a period.
 *
 * The peak in a periodogram has a width of about one over the baseline in
 * frequency, which is P^2/T in period. Two fits that differ by less than that
 * are the same fit read off two grids, and calling them a disagreement would
 * manufacture a difference out of the resolution.
 *
 * @param {number} periodDays - The period in question
 * @param {number} baselineDays - First to last observation
 * @returns {number} Half-width, in days
 */
export function periodResolution(periodDays, baselineDays) {
  if (!(periodDays > 0) || !(baselineDays > 0)) return Infinity;
  return (periodDays * periodDays) / baselineDays;
}

/**
 * Measure one arm of the comparison.
 *
 * @param {object} arm - {label, kind, plan, measurements}
 * @param {object} opts - {minPeriod, maxPeriod, samples}
 * @returns {object} The arm's report
 */
export function describeArm(arm, opts = {}) {
  const measurements = Array.isArray(arm?.measurements) ? arm.measurements : [];
  const times = days(measurements);
  const spacings = spacingsOf(times);
  const span = times.length ? Math.max(...times) - Math.min(...times) : 0;

  const search =
    measurements.length >= 4
      ? periodSearch(measurements, {
          minPeriod: opts.minPeriod,
          maxPeriod: opts.maxPeriod,
          samples: opts.samples,
        })
      : null;

  // The runner-up matters more than the winner. A search whose second-best
  // minimum is nearly as good has not identified a period; it has identified
  // two, and the reader should see that rather than a single number.
  let runnerUp = null;
  if (search?.minima?.length > 1) {
    const others = search.minima
      .filter(m => Math.abs(m.period - search.bestPeriod) > 1e-12)
      .sort((a, b) => a.chi2 - b.chi2);
    if (others.length) {
      runnerUp = {
        periodDays: others[0].period,
        chi2Ratio: search.best?.chi2 ? others[0].chi2 / search.best.chi2 : null,
      };
    }
  }

  const window = spectralWindow(times);
  const fitted = search?.bestPeriod ?? null;

  return {
    label: arm?.label ?? null,
    kind: arm?.kind ?? arm?.plan?.kind ?? null,
    fingerprint: arm?.plan ? scheduleFingerprint(arm.plan) : null,
    planned: Number.isFinite(arm?.plan?.planned) ? arm.plan.planned : null,
    taken: measurements.length,
    missed:
      Number.isFinite(arm?.plan?.planned) &&
      arm.plan.planned >= measurements.length
        ? arm.plan.planned - measurements.length
        : 0,
    droppedToGaps: Number.isFinite(arm?.plan?.dropped) ? arm.plan.dropped : 0,
    spanDays: span,
    minSpacingDays: spacings.length ? Math.min(...spacings) : 0,
    medianSpacingDays: median(spacings),
    maxSpacingDays: spacings.length ? Math.max(...spacings) : 0,
    fit: search
      ? {
          periodDays: search.bestPeriod,
          amplitudeMs: search.best?.K ?? null,
          chi2: search.best?.chi2 ?? null,
          minima: search.minima?.length ?? 0,
          resolutionDays: periodResolution(search.bestPeriod, search.baseline),
          runnerUp,
        }
      : null,
    // Folded on the fitted period, never on the truth. Without a fit there is
    // no period to fold on and the honest answer is that we cannot say.
    coverage: fitted ? phaseCoverageDetail(times, fitted) : null,
    window: window
      ? {
          worstPeak: window.worstPeak,
          peaks: window.peaks.slice(0, 3).map(p => ({
            frequency: p.frequency,
            periodDays: p.period,
            power: p.power,
          })),
        }
      : null,
  };
}

/**
 * Check that the two arms differ only in their times.
 *
 * @param {object} a - First arm
 * @param {object} b - Second arm
 * @param {object} held - What the caller says it held: {sigmaMs, seed, system,
 *   noiseModel} for each arm as {a, b}
 * @returns {{controlled: boolean, broken: Array<object>}} What held and what did not
 */
export function checkControls(a, b, held = {}) {
  const broken = [];
  const note = (control, left, right) => broken.push({ control, left, right });

  if (a.taken !== b.taken) note(CONTROL.COUNT, a.taken, b.taken);

  // Baselines are compared on what was actually observed rather than on what
  // was planned, and loosely: two schedules of the same span place their last
  // epoch at the same instant only if both got to take it.
  const spanTol = Math.max(1e-9, 0.02 * Math.max(a.spanDays, b.spanDays));
  if (Math.abs(a.spanDays - b.spanDays) > spanTol)
    note(CONTROL.BASELINE, a.spanDays, b.spanDays);

  for (const [key, control] of [
    ['sigmaMs', CONTROL.SIGMA],
    ['seed', CONTROL.SEED],
    ['system', CONTROL.SYSTEM],
    ['noiseModel', CONTROL.NOISE_MODEL],
  ]) {
    const pair = held[key];
    if (!pair) continue;
    if (pair.a !== pair.b) note(control, pair.a, pair.b);
  }

  return { controlled: broken.length === 0, broken };
}

/**
 * Whether two fitted periods are the same answer.
 *
 * @param {?object} a - First arm's fit
 * @param {?object} b - Second arm's fit
 * @returns {?object} The verdict, or null if either arm has no fit
 */
export function comparePeriods(a, b) {
  if (!a?.fit || !b?.fit) return null;
  const pa = a.fit.periodDays;
  const pb = b.fit.periodDays;
  const tolerance = Math.max(a.fit.resolutionDays, b.fit.resolutionDays);
  const differenceDays = Math.abs(pa - pb);
  return {
    a: pa,
    b: pb,
    differenceDays,
    toleranceDays: tolerance,
    agree: differenceDays <= tolerance,
    // In frequency, because that is where a schedule's ambiguities live.
    frequencyDifference: Math.abs(1 / pa - 1 / pb),
  };
}

/**
 * Whether a disagreement sits where one of the schedules cannot see.
 *
 * If the two fits differ by exactly the frequency of a window peak, the arms
 * have not measured two different stars; one of them has read the signal off
 * by one alias. That is the single most useful thing this comparison can point
 * at, and it is a check rather than a guess: the frequency difference either
 * lands on a peak or it does not.
 *
 * @param {object} verdict - From comparePeriods
 * @param {object} a - First arm's report
 * @param {object} b - Second arm's report
 * @returns {?object} The peak it matches, or null
 */
export function aliasExplains(verdict, a, b) {
  if (!verdict || verdict.agree) return null;
  const df = verdict.frequencyDifference;
  if (!(df > 0)) return null;
  // A frequency tolerance of one over the baseline: the same resolution the
  // period comparison uses, expressed where the peaks are.
  const spans = [a.spanDays, b.spanDays].filter(s => s > 0);
  if (!spans.length) return null;
  const tol = 1 / Math.min(...spans);

  for (const [side, arm] of [
    ['a', a],
    ['b', b],
  ]) {
    for (const peak of arm.window?.peaks || []) {
      if (Math.abs(peak.frequency - df) <= tol) {
        return {
          side,
          frequency: peak.frequency,
          periodDays: peak.periodDays,
          power: peak.power,
          toleranceCyclesPerDay: tol,
        };
      }
    }
  }
  return null;
}

/**
 * Compare two arms.
 *
 * @param {object} armA - {label, kind, plan, measurements}
 * @param {object} armB - The other one
 * @param {object} [opts] - {minPeriod, maxPeriod, samples, held}
 * @returns {object} The comparison
 */
export function compareSchedules(armA, armB, opts = {}) {
  const a = describeArm(armA, opts);
  const b = describeArm(armB, opts);
  const controls = checkControls(a, b, opts.held || {});
  const periods = comparePeriods(a, b);
  const alias = aliasExplains(periods, a, b);

  const caveats = [CAVEAT.SINGLE_REALISATION];
  if (a.fingerprint && a.fingerprint === b.fingerprint)
    caveats.push(CAVEAT.IDENTICAL);
  if (!a.fit || !b.fit) caveats.push(CAVEAT.UNFITTABLE);
  if (a.missed > 0 || b.missed > 0) caveats.push(CAVEAT.INCOMPLETE);
  if (alias) caveats.push(CAVEAT.ALIAS);

  return {
    arms: [a, b],
    controls,
    periods,
    alias,
    caveats,
    /** True only when the comparison isolates scheduling and both arms fit. */
    interpretable: controls.controlled && Boolean(a.fit && b.fit),
  };
}
