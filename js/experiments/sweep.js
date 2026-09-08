// =============================================================================
// One variable, several values, everything else held still
// -----------------------------------------------------------------------------
// The bench can already do "change one thing and compare two runs". A sweep is
// the same question asked across a row of values: how does the measured
// outcome move as the parameter moves? It is the difference between knowing
// that a planet at 0.15 separations survives and 0.30 does not, and seeing
// where between them the answer turns over.
//
// Everything here is arithmetic and description. The running is in bench.js,
// which owns the world; this file exists so the parts that decide what a valid
// sweep is, and what a finished one means, can be tested without a browser.
//
// Why an allowlist and not "any setting"
// -----------------------------------------------------------------------------
// Most of the settings object cannot be swept, and offering it would produce
// an interface that mostly does not work. Two reasons, and the second is the
// one that bites:
//
//   A rebuild re-stamps the scenario's own settings block. js/scenarios.js
//   applies the preset on every initialize_simulation, so a value written just
//   before a rebuild is usually erased by it. The exception is LAB_VARIABLES
//   there: a short list per laboratory scenario that applyPreset deliberately
//   carries across a rebuild of the same scenario, precisely because changing
//   one and rebuilding IS the experiment. Those are the settings a sweep can
//   actually vary, so those are the ones offered.
//
//   A parameter also has to have a range in which the scenario still means
//   something. An impact parameter of zero is a collision, not a flyby; a
//   circumstellar orbit at 0.9 binary separations is inside the other star.
//   The bounds below are part of the definition rather than left to the
//   reader, and a trial outside them is not offered rather than run and
//   explained afterwards.
//
// Bodies are resolved by role, not by the ids a captured state holds: every
// trial rebuilds the world, and an id from the previous build names nothing or
// names something else. The casts here are fixed and named by js/world/
// build.js, which is what makes that resolution safe.
// =============================================================================

/** How a single trial ended. */
export const TRIAL_STATUS = Object.freeze({
  /** Ran, and produced a finite measurement. */
  OK: 'ok',
  /** The world did not build at this value. */
  BUILD_FAILED: 'buildFailed',
  /** The world built but the bodies the metric needs were not in it. */
  BODIES_MISSING: 'bodiesMissing',
  /** It ran and the number came out non-finite. */
  NOT_FINITE: 'notFinite',
  /** A body was destroyed or merged, so later samples are of another system. */
  LOST_BODY: 'lostBody',
  /** The reader stopped the sweep before this trial ran. */
  CANCELLED: 'cancelled',
  /**
   * The simulation stopped advancing while the trial was waiting for it.
   *
   * A paused world, a backgrounded tab, a scenario that froze. The trial holds
   * whatever it managed and says it did not cover what it was asked to.
   */
  STALLED: 'stalled',
  /**
   * It hit the sample ceiling before covering the duration asked for.
   *
   * The evidence it did gather is kept and reported as partial; what it must
   * not do is look like a trial that ran to completion, which is exactly what
   * a shortened run labelled `ok` looked like.
   */
  CAPPED: 'capped',
});

/** A trial that did not produce a usable number. */
export const FAILED_STATUSES = Object.freeze([
  TRIAL_STATUS.BUILD_FAILED,
  TRIAL_STATUS.BODIES_MISSING,
  TRIAL_STATUS.NOT_FINITE,
  TRIAL_STATUS.LOST_BODY,
]);

/**
 * A trial that ran but did not cover what it was asked to.
 *
 * Not a failure - it has real samples and real numbers, and they are kept and
 * plotted - but not a trial of the duration the sweep claims either. A summary
 * that averaged these in would be describing an experiment nobody ran.
 */
export const PARTIAL_STATUSES = Object.freeze([
  TRIAL_STATUS.STALLED,
  TRIAL_STATUS.CAPPED,
]);

/**
 * How many values a sweep may have.
 *
 * Three because two values is the A/B comparison the bench already does and
 * calling it a sweep would add nothing; twenty because each value is a whole
 * run of the simulation and a reader who asks for a hundred has asked for
 * something they will cancel.
 */
export const MIN_VALUES = 3;
export const MAX_VALUES = 20;

/**
 * Simulated duration a sweep may cover, per trial.
 *
 * The ceiling is generous because these scenarios move fast: a frame of the
 * binary labs covers 62.5 time units, and a binary period is thousands, so a
 * trial that shows anything at all needs a duration in the thousands. The real
 * limit on a long sweep is the sample cap in bench.js and the reader's
 * patience, both of which announce themselves.
 */
export const MIN_DURATION = 1;
export const MAX_DURATION = 200000;

/**
 * The parameters a sweep may vary, per scenario.
 *
 * Every entry is a member of LAB_VARIABLES in js/scenarios.js - which is what
 * makes it survive the rebuild - with a range in which the scenario still
 * describes what it claims to describe.
 *
 * `roles` names the bodies a measurement needs, in the order the bench's
 * metrics want them: the first is the moving body a single-body metric reads,
 * and `primary` is what a distance-to-primary is measured against.
 */
export const SWEEPABLE = Object.freeze({
  'Binary Planet Lab': {
    roles: { bodies: ['planet'], primary: 'Star A' },
    parameters: [
      {
        key: 'binary_lab_planet_a',
        labelKey: 'sweep.param.planetA',
        unitKey: 'sweep.unit.separations',
        // Circumstellar. Below 0.02 the planet is inside Star A at this mass
        // ratio; above 0.45 it is not orbiting one star any more, which is a
        // different scenario rather than a further value of this one.
        min: 0.02,
        max: 0.45,
        decimals: 3,
      },
    ],
  },
  'Circumbinary Planet Lab': {
    roles: { bodies: ['planet'], primary: 'Star A' },
    parameters: [
      {
        key: 'binary_lab_planet_a',
        labelKey: 'sweep.param.planetA',
        unitKey: 'sweep.unit.separations',
        // Circumbinary, so the interesting range is outside the pair. Below
        // 1.5 the orbit crosses the stars; beyond 10 the binary is a point
        // mass and nothing further happens.
        min: 1.5,
        max: 10,
        decimals: 3,
      },
    ],
  },
  'Gravity Assist Lab': {
    roles: { bodies: ['Spacecraft'], primary: 'planet' },
    parameters: [
      {
        key: 'assist_impact_parameter',
        labelKey: 'sweep.param.impact',
        unitKey: 'sweep.unit.simUnits',
        // Signed: the sign is which side of the planet the probe passes, and
        // it is the whole lesson, so both halves are offered. Zero and its
        // neighbourhood are excluded because they are a collision.
        min: -400,
        max: 400,
        exclude: { from: -8, to: 8 },
        decimals: 1,
      },
      {
        key: 'assist_v_infinity',
        labelKey: 'sweep.param.vInfinity',
        unitKey: 'sweep.unit.simVelocity',
        // Below 0.05 the encounter is a capture rather than a flyby; above 3
        // the deflection is too small to read against the gate distance.
        min: 0.05,
        max: 3,
        decimals: 3,
      },
    ],
  },
  'Gravity Assist: Heliocentric': {
    roles: { bodies: ['Spacecraft'], primary: 'planet' },
    parameters: [
      {
        key: 'assist_impact_parameter',
        labelKey: 'sweep.param.impact',
        unitKey: 'sweep.unit.simUnits',
        min: -400,
        max: 400,
        exclude: { from: -8, to: 8 },
        decimals: 1,
      },
      {
        key: 'assist_v_infinity',
        labelKey: 'sweep.param.vInfinity',
        unitKey: 'sweep.unit.simVelocity',
        min: 0.05,
        max: 3,
        decimals: 3,
      },
    ],
  },
});

/** @returns {Array<string>} Scenarios a sweep can run in */
export const sweepableScenarios = () => Object.keys(SWEEPABLE);

/**
 * The definition of one sweepable parameter.
 *
 * @param {string} scenario - Scenario key
 * @param {string} key - Setting name
 * @returns {?object} The definition, or null if it is not sweepable here
 */
export function parameterFor(scenario, key) {
  const entry = SWEEPABLE[scenario];
  if (!entry) return null;
  return entry.parameters.find(p => p.key === key) || null;
}

/**
 * Evenly spaced values across a range.
 *
 * Inclusive of both ends, because the ends are usually the interesting part -
 * a reader sweeping a stability boundary wants the value they believe is safe
 * and the value they believe is not, not two points near them.
 *
 * @param {object} spec - from, to, count
 * @returns {Array<number>} The values, ascending or descending as given
 */
export function planValues({ from, to, count }) {
  const n = Math.round(count);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  if (!(n >= 2)) return [];
  if (n === 2) return [from, to];
  const step = (to - from) / (n - 1);
  return Array.from({ length: n }, (_, i) =>
    // Recomputed from the index rather than accumulated, so the last value is
    // exactly `to` and not `to` plus n roundings.
    i === n - 1 ? to : from + step * i
  );
}

/**
 * Whether a sweep is one this bench can actually run.
 *
 * Refusing up front rather than producing a row of failed trials: a range that
 * leaves the parameter's validated bounds is a mistake in the request, and
 * running it would bury that among results.
 *
 * @param {object} spec - scenario, parameter, from, to, count, duration, metrics
 * @returns {{ok: boolean, reason: ?string, detail: ?object}} Whether to run
 */
export function validateSweepSpec(spec) {
  const fail = (reason, detail = null) => ({ ok: false, reason, detail });
  if (!spec) return fail('noSpec');

  const def = parameterFor(spec.scenario, spec.parameter);
  if (!def) return fail('parameterNotSweepable');

  const count = Math.round(spec.count);
  if (!(count >= MIN_VALUES) || !(count <= MAX_VALUES)) {
    return fail('valueCount', { min: MIN_VALUES, max: MAX_VALUES });
  }
  if (!Number.isFinite(spec.from) || !Number.isFinite(spec.to)) {
    return fail('rangeNotNumeric');
  }
  if (spec.from === spec.to) return fail('rangeEmpty');

  const lo = Math.min(spec.from, spec.to);
  const hi = Math.max(spec.from, spec.to);
  if (lo < def.min || hi > def.max) {
    return fail('outOfRange', { min: def.min, max: def.max });
  }
  if (def.exclude && lo < def.exclude.to && hi > def.exclude.from) {
    return fail('crossesExcluded', def.exclude);
  }
  if (!(spec.duration >= MIN_DURATION) || !(spec.duration <= MAX_DURATION)) {
    return fail('duration', { min: MIN_DURATION, max: MAX_DURATION });
  }
  if (!Array.isArray(spec.metrics) || !spec.metrics.length) {
    return fail('noMetrics');
  }
  return { ok: true, reason: null, detail: null };
}

/**
 * What one metric did across the sweep.
 *
 * Deliberately modest. It reports the span the measurement covered and whether
 * it moved monotonically, and it does not fit anything: a straight line
 * through five points of a threshold problem is a worse description than the
 * five points, and the reader has the plot.
 *
 * `changed` is against the measurement's own span rather than an absolute
 * figure, because these metrics are in wildly different units.
 *
 * @param {Array<object>} trials - Completed trials
 * @param {string} metric - Metric id
 * @param {object} [opts] - `tolerance` for "did not move", as a fraction
 * @returns {?object} The summary, or null with fewer than two usable trials
 */
export function summarise(trials, metric, opts = {}) {
  // Complete trials only. A trial that stalled or hit the sample cap covered
  // less of the run than the sweep says it did, and averaging it in with the
  // rest produces a curve of a duration that was never swept. Its numbers are
  // still kept, reported and plotted - see PARTIAL_STATUSES - they are just
  // not evidence about the experiment as described.
  const usable = (trials || []).filter(
    tr => tr.status === TRIAL_STATUS.OK && Number.isFinite(tr.results?.[metric])
  );
  const partial = (trials || []).filter(
    tr =>
      PARTIAL_STATUSES.includes(tr.status) &&
      Number.isFinite(tr.results?.[metric])
  );
  if (usable.length < 2) return null;

  const values = usable.map(tr => tr.results[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scale = Math.max(Math.abs(min), Math.abs(max), 1e-12);
  const tolerance = opts.tolerance ?? 0.01;

  // Monotone against the parameter, which is what a reader is looking for
  // when they ask how the outcome depends on it. Ties count as neither
  // direction, so a flat run is not called monotone in both.
  const byParam = [...usable].sort((a, b) => a.value - b.value);
  let up = 0;
  let down = 0;
  for (let i = 1; i < byParam.length; i++) {
    const d = byParam[i].results[metric] - byParam[i - 1].results[metric];
    if (d > 0) up++;
    else if (d < 0) down++;
  }

  return {
    metric,
    n: usable.length,
    min,
    max,
    span: max - min,
    changed: (max - min) / scale > tolerance,
    monotonic: (up === 0 || down === 0) && up + down > 0,
    direction: up > down ? 'increasing' : down > up ? 'decreasing' : 'flat',
    firstValue: byParam[0].value,
    lastValue: byParam[byParam.length - 1].value,
    /** Trials with numbers that are not part of the summary, and why. */
    partial: partial.length,
    partialStatuses: [...new Set(partial.map(tr => tr.status))].sort(),
  };
}

/**
 * A tally of how the sweep went, for a reader deciding whether to trust it.
 *
 * Failed trials are counted and named rather than dropped. A sweep in which
 * the last four values failed to build is not a sweep of the range that was
 * asked for, and a summary that silently reported the first six would be
 * describing a different experiment.
 *
 * @param {Array<object>} trials - Every trial, including the failures
 * @returns {object} Counts by status
 */
export function tally(trials) {
  const counts = { total: (trials || []).length, failed: 0 };
  for (const status of Object.values(TRIAL_STATUS)) counts[status] = 0;
  for (const tr of trials || []) {
    // One increment per trial. `ok` is the OK status's own tally rather than a
    // second counter beside it, which is what made it count twice.
    counts[tr.status] = (counts[tr.status] || 0) + 1;
  }
  // Derived, so it cannot drift from the statuses it sums. A cancelled trial
  // is not a failure: nobody ran it.
  counts.failed = FAILED_STATUSES.reduce((n, st) => n + counts[st], 0);
  counts.partial = PARTIAL_STATUSES.reduce((n, st) => n + counts[st], 0);
  return counts;
}
