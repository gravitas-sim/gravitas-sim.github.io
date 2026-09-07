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

import { MODEL_PARAMETERS, periodSearch, usablePoints } from './rvFit.js';
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
  /** An arm did not complete its plan, or lost points from it. */
  INCOMPLETE: 'incomplete',
  /** The arms disagree, and the disagreement sits on a window peak. */
  ALIAS: 'aliasDifference',
  /**
   * A best fit sitting on the edge of the search.
   *
   * The search returns the best period IN RANGE, and a signal whose period is
   * outside the range comes back pinned to whichever end is nearest. Two arms
   * pinned to the same end agree perfectly and mean nothing, which is the one
   * way this comparison could quietly mislead: it looks like a result.
   */
  AT_BOUND: 'atBound',
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
 * Whether a fit came back pinned to the edge of its search range.
 *
 * Within one resolution element of either end. Anything closer than that to a
 * bound is a fit the range decided rather than the data.
 *
 * @param {object} search - From periodSearch
 * @param {object} opts - The bounds the search was given
 * @returns {boolean} Whether it is on the edge
 */
function atSearchBound(search, opts) {
  const p = search?.bestPeriod;
  if (!Number.isFinite(p)) return false;
  const width = periodResolution(p, search.baseline);
  const lo = Number(opts.minPeriod);
  const hi = Number(opts.maxPeriod);
  if (Number.isFinite(lo) && p - lo <= width) return true;
  if (Number.isFinite(hi) && hi - p <= width) return true;
  return false;
}

/**
 * Measure one arm of the comparison.
 *
 * Five different counts live in here and they are not interchangeable, which
 * is the whole reason this used to lie. A schedule PLANS epochs; a run ATTEMPTS
 * them and returns a row for each, including the ones it MISSED, which carry no
 * velocity at all; of the rows that do carry one, some are EXCLUDED by the
 * fitting policy - unreadable, no usable uncertainty, or degraded; and what is
 * left is what was USED. Reporting the row count as "measurements taken" and
 * handing the rows straight to the fitter counted a missed epoch as an
 * observation and let its null velocity into the arithmetic as a zero, so an
 * arm that lost half its nights to weather reported a full run and a confident
 * period.
 *
 * @param {object} arm - {label, kind, plan, measurements}
 * @param {object} opts - {minPeriod, maxPeriod, samples, keepDegraded}
 * @returns {object} The arm's report
 */
export function describeArm(arm, opts = {}) {
  const measurements = Array.isArray(arm?.measurements) ? arm.measurements : [];

  // The same filter the workspace fits through. Sharing it is the point: an
  // arm scored under one policy and read under another is not evidence about
  // either.
  const { usable, counts } = usablePoints(measurements, {
    keepDegraded: Boolean(opts.keepDegraded),
  });

  const usedTimes = days(usable);
  const spacings = spacingsOf(usedTimes);
  const span = usedTimes.length
    ? Math.max(...usedTimes) - Math.min(...usedTimes)
    : 0;
  // What the run attempted, as opposed to what it came back with. A gap in the
  // middle leaves the attempted span intact and the observed span shorter only
  // if the loss was at an end, and the difference between those two numbers is
  // itself worth seeing.
  const attemptedTimes = days(measurements);
  const attemptedSpan = attemptedTimes.length
    ? Math.max(...attemptedTimes) - Math.min(...attemptedTimes)
    : 0;

  // A fit needs more points than it has parameters. Four points and four
  // parameters is not a measurement, it is an interpolation, so the floor is
  // one clear of the model.
  const search =
    usable.length > MODEL_PARAMETERS
      ? periodSearch(usable, {
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

  // Two windows, and they answer two questions. The planned one is a property
  // of the schedule and can be computed before observing anything, which is
  // what makes it worth arguing a proposal from. The observed one is the
  // window of the data that was actually fitted, and it is the one that
  // explains the fit in hand. They are the same only when nothing was lost.
  const plannedTimes = (arm?.plan?.epochs || [])
    .map(e => Number(e.offset))
    .filter(Number.isFinite);
  const plannedWindow = spectralWindow(plannedTimes);
  const window = spectralWindow(usedTimes);
  const fitted = search?.bestPeriod ?? null;

  const planned = Number.isFinite(arm?.plan?.planned) ? arm.plan.planned : null;
  const summarise = w =>
    w
      ? {
          worstPeak: w.worstPeak,
          peaks: w.peaks.slice(0, 3).map(p => ({
            frequency: p.frequency,
            periodDays: p.period,
            power: p.power,
          })),
        }
      : null;

  return {
    label: arm?.label ?? null,
    kind: arm?.kind ?? arm?.plan?.kind ?? null,
    fingerprint: arm?.plan ? scheduleFingerprint(arm.plan) : null,
    /** Epochs the schedule asked for, after its own gaps. */
    planned,
    /** Rows the run produced, missed epochs included. */
    attempted: measurements.length,
    /** Rows carrying a velocity, before the fitting policy is applied. */
    taken: measurements.length - counts.missed,
    /** Rows carrying no velocity at all. */
    missed: counts.missed,
    /** Epochs the run never reached, as opposed to reached and lost. */
    notReached:
      planned !== null && planned > measurements.length
        ? planned - measurements.length
        : 0,
    droppedToGaps: Number.isFinite(arm?.plan?.dropped) ? arm.plan.dropped : 0,
    /** What the fit was computed from. */
    used: usable.length,
    /** Why the rest were left out. */
    excluded: {
      missed: counts.missed,
      notFinite: counts.notFinite,
      badSigma: counts.badSigma,
      degraded: counts.degraded,
      degradedKept: counts.degradedKept,
    },
    /** First to last of the points that were fitted. */
    spanDays: span,
    /** First to last of everything the run attempted. */
    attemptedSpanDays: attemptedSpan,
    minSpacingDays: spacings.length ? Math.min(...spacings) : 0,
    medianSpacingDays: median(spacings),
    maxSpacingDays: spacings.length ? Math.max(...spacings) : 0,
    fit: search
      ? {
          periodDays: search.bestPeriod,
          atBound: atSearchBound(search, opts),
          amplitudeMs: search.best?.K ?? null,
          chi2: search.best?.chi2 ?? null,
          minima: search.minima?.length ?? 0,
          resolutionDays: periodResolution(search.bestPeriod, search.baseline),
          runnerUp,
        }
      : null,
    // Folded on the fitted period, never on the truth, and over the points
    // that were fitted rather than over the epochs that were planned. Without
    // a fit there is no period to fold on and the honest answer is that we
    // cannot say.
    coverage: fitted ? phaseCoverageDetail(usedTimes, fitted) : null,
    window: summarise(window),
    plannedWindow: summarise(plannedWindow),
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

  // Compared on the points that were FITTED, not on the rows that came back.
  // Two arms with the same number of rows are not a controlled comparison if
  // one of them lost half its velocities: the fits then differ in how much
  // data went into them as well as in when it was taken, and no difference in
  // the answers can be attributed to either.
  if (a.used !== b.used) note(CONTROL.COUNT, a.used, b.used);

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
  // Anything that means an arm was fitted on less than it planned: epochs it
  // never reached, epochs it reached and missed, and points the fitting policy
  // held out.
  const short = arm =>
    arm.notReached > 0 || arm.missed > 0 || arm.used < arm.taken;
  if (short(a) || short(b)) caveats.push(CAVEAT.INCOMPLETE);
  if (a.fit?.atBound || b.fit?.atBound) caveats.push(CAVEAT.AT_BOUND);
  if (alias) caveats.push(CAVEAT.ALIAS);

  return {
    arms: [a, b],
    controls,
    periods,
    alias,
    caveats,
    /**
     * True only when the comparison isolates scheduling, both arms fitted, and
     * neither fit is the search range's own edge reported as a period.
     */
    interpretable:
      controls.controlled &&
      Boolean(a.fit && b.fit) &&
      !a.fit?.atBound &&
      !b.fit?.atBound,
  };
}
