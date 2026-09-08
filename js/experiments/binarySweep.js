// =============================================================================
// The binary lesson's sweep
// -----------------------------------------------------------------------------
// One parameter, five values, and a physical outcome for each. It exists to
// replace the part of "Planets in Binary Stars" that was repetitive rather than
// instructive: a student who has run 0.15 and 0.30 by hand and understood the
// panel's diagnostics learns nothing further from typing 0.20, 0.22 and 0.25
// and copying four numbers out each time.
//
// It is deliberately not a general sweep framework. js/experiments/sweep.js and
// the bench runner already are one, and this reuses both - the validation, the
// value planning, the world save and restore, the cancellation, the
// simulated-progress measurement - and adds exactly the thing that generic
// machinery cannot supply: what happened to the planet.
//
// That distinction is the whole point. The generic sweep reduces each trial to
// a metric like mean distance, and a mean distance says nothing about whether a
// planet survived: a run that ejected its planet on the third period and a run
// that held it for twenty can produce the same average. So each trial here is
// watched by js/binaryWatch.js and classified by js/binaryStability.js, and the
// result carries the outcome, the periods actually completed, the largest
// distance reached, the encounter count and the energy drift.
//
// Five outcomes, and none of them is "ok":
//
//   survived    it was still there, on a closed orbit, at the end of the window
//   ejected     it left, with the energy and the distance to prove it
//   collided    it merged with a star
//   incomplete  the window was not finished, so nothing is established
//   unreliable  the energy drift is too large to draw any conclusion from
//
// The last two are not failures of the sweep. They are results, and they are
// reported rather than dropped, because a reader who cannot see them will read
// the other three as a stability boundary.
// =============================================================================

import {
  OUTCOME,
  classifyRun,
  convergenceVerdict,
} from '../binaryStability.js';
import { currentRun } from '../binaryWatch.js';
import * as SWEEP from './sweep.js';

/** The parameter this sweep varies, and the only one it varies. */
export const PARAMETER = 'binary_lab_planet_a';

/**
 * How much longer than the window the frame budget is.
 *
 * The trial's real finish line is the watcher counting out its periods; this
 * is only the backstop for a run that never gets there. A tenth over is enough
 * that rounding cannot cut a completed window short, and small enough that a
 * genuinely stuck trial is not waited on for long.
 */
export const WINDOW_MARGIN = 1.1;

/**
 * The two configurations the lesson offers, and their validated ranges.
 *
 * Both are narrower than the general sweepable range in js/experiments/sweep.js
 * because these are the values the lesson has already shown are worth looking
 * at, on either side of the published boundary it has already quoted.
 */
export const CONFIGURATIONS = Object.freeze({
  circumstellar: {
    scenario: 'Binary Planet Lab',
    // Spanning the two the student ran by hand - 0.15 survived, 0.30 did not -
    // with the published critical radius for this system, 0.177, inside it.
    values: [0.12, 0.15, 0.18, 0.22, 0.3],
    periods: 20,
    seed: 'binary',
  },
  circumbinary: {
    scenario: 'Circumbinary Planet Lab',
    // The optional extension. 4.0 and 2.0 are the two the lesson runs by hand,
    // and the published boundary for this pair is 3.61, so the range brackets
    // it from both sides. Forty periods because a circumbinary planet is slow.
    values: [2.0, 2.5, 3.0, 3.5, 4.0],
    periods: 40,
    seed: 'binary',
  },
});

/**
 * What a trial says about the planet, distinct from how the trial ran.
 *
 * A sweep trial has a STATUS - did the run happen - and an OUTCOME - what
 * happened to the planet. Conflating them is how "ok" comes to be read as
 * "stable", so they are kept apart all the way to the panel.
 */
export const TRIAL_OUTCOME = Object.freeze({
  SURVIVED: OUTCOME.SURVIVED,
  EJECTED: OUTCOME.EJECTED,
  COLLIDED: OUTCOME.COLLIDED,
  UNRELIABLE: OUTCOME.UNRELIABLE,
  /** The observation window was not completed, so nothing is established. */
  INCOMPLETE: 'incomplete',
  /** The world would not build, or the watcher never armed. */
  NOT_RUN: 'notRun',
});

/**
 * Read one finished trial into the record the lesson reports.
 *
 * @param {object} trial - From the bench runner
 * @returns {object} The physical result, and the diagnostics behind it
 */
export function describeTrial(trial) {
  const run = trial?.observed ?? null;
  const base = {
    value: trial?.value ?? null,
    status: trial?.status ?? null,
    /** Binary periods asked for, and the ones actually integrated. */
    periodsAsked: run?.periodsAsked ?? null,
    periodsDone: run?.periodsDone ?? null,
    maxDistance: run?.maxDistance ?? null,
    closestApproach: run?.closestApproach ?? null,
    encounters: run?.encounters ?? null,
    energyDrift: run?.energyDrift ?? null,
    steps: run?.steps ?? null,
    dtMax: run?.dtMax ?? null,
    dtMean: run?.dtMean ?? null,
    planetEccentricity: run?.planetEccentricity ?? null,
    planetMaxEccentricity: run?.planetMaxEccentricity ?? null,
  };

  // No run at all: the world did not build, or the bodies were not there.
  if (!run) {
    return { ...base, outcome: TRIAL_OUTCOME.NOT_RUN, trustworthy: false };
  }

  const verdict = classifyRun(run);

  // An unfinished window is its own answer and outranks "survived": a planet
  // that was still there when the observation stopped early has not survived
  // the window, it has been watched for less of it.
  if (!trial.complete || verdict.outcome === OUTCOME.RUNNING) {
    return {
      ...base,
      outcome: TRIAL_OUTCOME.INCOMPLETE,
      trustworthy: false,
      reason: trial.status === 'capped' ? 'sampleCap' : 'windowNotFinished',
    };
  }

  return {
    ...base,
    outcome: verdict.outcome,
    trustworthy: verdict.trustworthy,
    reason: verdict.reason,
  };
}

/**
 * An observer the bench runner can drive, wrapping the binary watcher.
 *
 * `arm` is called once the world for a trial is built; `done` is the trial's
 * real finish line - the watcher counting out the periods it was asked for -
 * and `read` hands back the run for classification.
 *
 * @param {object} deps - {armRun} the panel's own arming function
 * @returns {object} The observer
 */
export function binaryObserver(deps) {
  return {
    arm() {
      deps.armRun();
    },
    done() {
      return Boolean(currentRun()?.finished);
    },
    read() {
      const run = currentRun();
      return run ? { ...run } : null;
    },
  };
}

/**
 * Whether two runs of one configuration at different steps agree.
 *
 * The same check the lesson already makes by hand, applied to a sweep trial and
 * its rerun. Agreement is on the OUTCOME, not on the numbers: two runs of a
 * chaotic system at different steps will not agree about when a planet left,
 * and they do not have to.
 *
 * @param {object} coarse - describeTrial() of the run at the larger step
 * @param {object} fine - describeTrial() of the run at the smaller step
 * @returns {object} The verdict, with the caveat that outlives it
 */
export function resolutionVerdict(coarse, fine) {
  const asClassified = trial => ({
    outcome:
      trial.outcome === TRIAL_OUTCOME.INCOMPLETE
        ? OUTCOME.RUNNING
        : trial.outcome,
    trustworthy: trial.trustworthy,
  });
  const verdict = convergenceVerdict(asClassified(coarse), asClassified(fine));
  return {
    ...verdict,
    /**
     * True of every verdict this can return, including the converged one.
     *
     * Two steps agreeing over twenty binary periods says the answer is not an
     * artefact of the step. It does not say the planet is stable: ten thousand
     * periods is what the published fit is based on, and this is twenty.
     */
    windowOnly: true,
    periods: fine.periodsDone ?? null,
  };
}

/**
 * The spec the bench runner is given for one of these sweeps.
 *
 * Every value the lesson holds fixed is fixed here rather than left to whatever
 * the panel happens to be showing: the masses, the eccentricity, the seed and
 * the number of periods. The only thing that varies is the starting radius.
 *
 * The observation window is stated in binary periods, which is the unit the
 * lesson thinks in, and converted here to the simulated duration the runner
 * budgets frames from. The budget carries a margin: a trial ends when the
 * WATCHER has counted its periods, and a frame budget that was exactly the
 * expected length would cut some runs off a fraction short of their own finish
 * line and report them as incomplete.
 *
 * The runner budgets frames as `duration / dtSim`, where dtSim is what one
 * frame is SUPPOSED to advance by. What the engine actually advances by is a
 * different number - the binary labs run about four times slower than that -
 * and a budget computed from the supposed rate cuts every trial off a fifth of
 * the way through its window. So the caller measures the real rate and passes
 * it in, and the duration asked for is the window scaled by how much slower
 * the world is than the arithmetic says.
 *
 * @param {string} which - A key of CONFIGURATIONS
 * @param {object} [over] - `values`, `periods`, the pair's `binaryPeriod`, and
 *   `frameRatio`, the measured slowdown
 * @returns {?object} A spec for runSweep()
 */
export function sweepSpec(which, over = {}) {
  const cfg = CONFIGURATIONS[which];
  if (!cfg) return null;
  const values = over.values ?? cfg.values;
  const periods = over.periods ?? cfg.periods;
  const binaryPeriod = Number(over.binaryPeriod);
  // One unless measured otherwise, so a caller that cannot measure still gets
  // a budget rather than a NaN.
  const ratio =
    Number.isFinite(over.frameRatio) && over.frameRatio > 0
      ? over.frameRatio
      : 1;
  return {
    scenario: cfg.scenario,
    parameter: PARAMETER,
    // Explicit values rather than a range and a count: these are the radii the
    // lesson has reasons for, not five points spread evenly through a slider.
    values: [...values],
    from: Math.min(...values),
    to: Math.max(...values),
    count: values.length,
    // The observation window, in binary periods, identical for every trial.
    periods,
    // The same window as a frame budget, with room for the watcher to reach
    // its own finish line inside it.
    duration: Number.isFinite(binaryPeriod)
      ? periods * binaryPeriod * ratio * WINDOW_MARGIN
      : periods,
    seed: cfg.seed,
    // The runner still wants a metric list; these are diagnostics beside the
    // outcome rather than the result, and the panel labels them that way.
    metrics: ['distance_to_primary'],
  };
}

/**
 * Whether a value is one this sweep will run.
 *
 * @param {string} which - A key of CONFIGURATIONS
 * @param {number} value - Starting radius, in binary separations
 * @returns {boolean} Whether it is inside the validated range
 */
export function isValidValue(which, value) {
  const cfg = CONFIGURATIONS[which];
  if (!cfg) return false;
  const def = SWEEP.parameterFor(cfg.scenario, PARAMETER);
  if (!def) return false;
  return Number.isFinite(value) && value >= def.min && value <= def.max;
}
