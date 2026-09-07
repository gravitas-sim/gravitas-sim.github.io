// =============================================================================
// Is this result about the system, or about the timestep?
// -----------------------------------------------------------------------------
// The check the A/B bench was missing. A student captures a start, changes one
// variable, records two runs and reads a difference off a chart - and nothing
// in that process asks whether the difference would survive integrating more
// finely. Often it would not.
//
// The method is the only one that actually answers the question: run the same
// experiment twice over the same simulated duration, once at the chosen step
// and once at half of it, and see whether the measured outcome moves. That is
// a convergence study, it is what a reviewer would ask for, and it is cheap
// here because the engine is deterministic under a fixed step.
//
// What this module refuses to do
// -----------------------------------------------------------------------------
// It will not infer accuracy from energy conservation. Energy is one number
// and a badly resolved encounter can go wrong in ways that do not disturb it;
// the binary-stars investigation ships a configuration that conserves energy to
// a part in a million at two different steps and gives two different answers.
// So the outcome verdict here is computed from the OUTCOME, and the
// conservation diagnostics are reported alongside as separate evidence that
// can support a doubt but can never license a conclusion.
//
// It also will not treat a drifting energy as a fault when the model is not
// supposed to conserve it. js/physics.js already knows when it is not a closed
// system - a static black hole holding position by fiat, one-way gravity,
// modified gravity, orbital decay, merging, tidal stripping - and reports those
// as caveats. Where one applies, the conservation half of the check says
// "not expected" rather than "failed", because a scenario that is deliberately
// nonconservative is not a broken integration and telling a student otherwise
// teaches them to distrust the wrong thing.
//
// Chaos gets its own answer
// -----------------------------------------------------------------------------
// Two runs of a chaotic system at different steps diverge in position almost
// immediately, and that is expected rather than a failure. What distinguishes
// chaos from a bad integration is WHEN they part: a chaotic pair agrees at the
// start and separates later, while a badly resolved pair is wrong from the
// first close approach. So a path-like measurement is compared over an early
// window as well as over the whole run, and a pair that agrees early and not
// late is reported as a diverged trajectory rather than an unresolved one -
// with the aggregate measurements, which are what such a system can actually
// support, judged separately.
// =============================================================================

/** What the comparison concluded about the measured outcome. */
export const VERDICT = Object.freeze({
  /** Halving the step left it alone. The result is about the system. */
  CONVERGING: 'converging',
  /** Halving the step moved it. The result is about the timestep. */
  UNRESOLVED: 'unresolved',
  /** The two runs are not measurements of the same thing. */
  INCOMPARABLE: 'incomparable',
  /**
   * The paths separated while the aggregates held.
   *
   * An observation, not a diagnosis. It is consistent with sensitive
   * dependence and equally consistent with a small systematic difference that
   * accumulates - a step size that shifts a period by a fraction of a percent
   * gives the same picture, as do two sinusoids of slightly different
   * frequency. Neither a pass nor a failure; the useful response is to stop
   * quoting positions and quote something the comparison does support.
   */
  DIVERGED: 'diverged',
});

/** Whether the model is one where conservation says anything. */
export const CONSERVATION = Object.freeze({
  EXPECTED: 'expected',
  NOT_EXPECTED: 'notExpected',
});

/** How closely two measurements must agree to count as unchanged. */
export const DEFAULT_TOLERANCE = 0.01;

/**
 * Fraction of a run treated as its early window.
 *
 * A third. Long enough to be a real comparison rather than the first few
 * samples, short enough that a chaotic pair has not yet separated - Lyapunov
 * times in the scenarios this bench is used on are a good fraction of a run,
 * not a small one.
 */
export const EARLY_FRACTION = 1 / 3;

/**
 * How to run the same experiment at the step and at half of it.
 *
 * The subtle part of the whole feature, and the one place it could quietly
 * become a lie. A convergence check is only a check if the second run is
 * genuinely more finely integrated than the first, and the obvious lever is
 * the wrong one: halving the frame advance also halves the simulated time each
 * frame covers, so the substep count falls with it and the actual integration
 * step barely moves. Measured on Kepler's 2nd Law, halving the frame advance
 * takes the substep from 0.0463 to 0.0417 - a tenth - while doubling the
 * number of frames needed to cover the same duration. A check built on that
 * would compare a run against a near-copy of itself and pronounce everything
 * converged.
 *
 * What actually refines the integration is the cap on the substep. Holding the
 * frame advance fixed and halving the cap doubles the substeps per frame and
 * halves the step exactly, and - because the frame advance is untouched - both
 * runs cover the same simulated duration in the same number of frames and land
 * their samples on the same instants. The comparison is then between two runs
 * of the same thing, sampled identically, which is what the method requires.
 *
 * The cap on substeps per frame is the one thing that can defeat this. Where
 * the coarse run is already taking more than half the maximum, the fine run
 * cannot take twice as many, and its step would be silently the same or barely
 * smaller. That is refused rather than reported.
 *
 * @param {object} input - dtSim, and the plan the engine is currently using
 * @param {number} input.dtSim - Simulated time per frame, from frameAdvance()
 * @param {number} input.substeps - Substeps per frame now, from substepPlan()
 * @param {number} input.step - The integration step now, from substepPlan()
 * @param {number} [input.maxSubsteps] - The engine's ceiling
 * @returns {object} The two settings to run under, or why it cannot be done
 */
export function stepPlan(input) {
  const { dtSim, substeps, step } = input || {};
  const ceiling = input?.maxSubsteps ?? 64;

  if (!(dtSim > 0) || !(step > 0) || !(substeps >= 1)) {
    return { ok: false, reason: 'noStep', coarse: null, fine: null };
  }
  if (substeps * 2 > ceiling) {
    // Already integrating as finely as the engine will allow in one frame.
    // Refusing is the honest answer: the alternative is a "fine" run at the
    // same step as the coarse one, which would agree with it perfectly and
    // mean nothing.
    return {
      ok: false,
      reason: 'substepCeiling',
      coarse: null,
      fine: null,
      substeps,
      ceiling,
    };
  }

  // The caps to run under. Setting the coarse cap to the step the engine is
  // already taking reproduces the current stepping exactly - ceil(dtSim/step)
  // is the substep count it already has - rather than approximating it.
  return {
    ok: true,
    reason: null,
    dtSim,
    coarse: { maxTimestep: step, substeps, step },
    fine: { maxTimestep: step / 2, substeps: substeps * 2, step: step / 2 },
  };
}

/**
 * Whether conservation is a meaningful diagnostic for this model at all.
 *
 * Reads the caveat list js/physics.js already produces rather than
 * re-deriving it. Every entry there names a way the scene is not a closed
 * Newtonian system, and any one of them means a nonzero energy drift is the
 * model working as designed.
 *
 * A change in body count is treated the same way and is worth calling out
 * separately: a merger removes kinetic and potential energy from the books in
 * one step, so a run that lost a body has a legitimate discontinuity in its
 * energy that has nothing to do with the integrator.
 *
 * @param {object} run - A recorded run
 * @returns {{status: string, reasons: Array<string>}} Whether to trust drift
 */
export function conservationExpectation(run) {
  const reasons = [...(run?.caveats || [])];
  if (
    Number.isFinite(run?.bodyCount) &&
    Number.isFinite(run?.baselineBodyCount) &&
    run.bodyCount !== run.baselineBodyCount
  ) {
    reasons.push('caveat.bodyCountChanged');
  }
  // An impulse applied by the student mid-run is an external force, and the
  // bench knows when it applied one.
  if (run?.perturbed) reasons.push('caveat.appliedImpulse');
  return {
    status: reasons.length ? CONSERVATION.NOT_EXPECTED : CONSERVATION.EXPECTED,
    reasons,
  };
}

/**
 * Whether two runs are measurements of the same experiment.
 *
 * Checked before anything is compared, because a difference between two runs
 * of different things is not a convergence result and reporting one would be
 * worse than reporting nothing.
 *
 * @param {object} coarse - The run at the chosen step
 * @param {object} fine - The run at half that step
 * @param {object} [opts] - `durationTolerance` as a fraction
 * @returns {{ok: boolean, reason: ?string}} Whether to proceed
 */
export function comparable(coarse, fine, opts = {}) {
  if (!coarse || !fine) return { ok: false, reason: 'missingRun' };
  const tol = opts.durationTolerance ?? 0.02;

  const a = coarse.duration;
  const b = fine.duration;
  if (!(a > 0) || !(b > 0)) return { ok: false, reason: 'noDuration' };
  if (Math.abs(a - b) / Math.max(a, b) > tol) {
    // The whole method rests on "the same experiment over the same simulated
    // duration". Two runs of different lengths are two experiments.
    return { ok: false, reason: 'differentDurations' };
  }

  // A merger in one run and not the other is the single most important case
  // to catch. The two runs then contain different numbers of bodies, so every
  // aggregate is of a different system and the comparison is meaningless -
  // which is itself a finding, and a much more interesting one than a number.
  if (
    Number.isFinite(coarse.bodyCount) &&
    Number.isFinite(fine.bodyCount) &&
    coarse.bodyCount !== fine.bodyCount
  ) {
    return { ok: false, reason: 'differentSystems' };
  }

  if (!(coarse.step > 0) || !(fine.step > 0)) {
    return { ok: false, reason: 'noStep' };
  }
  if (!(fine.step < coarse.step)) return { ok: false, reason: 'stepNotHalved' };

  return { ok: true, reason: null };
}

/**
 * The relative difference between two measurements of the same quantity.
 *
 * Scaled by the larger magnitude, with a floor, so a quantity that happens to
 * pass through zero does not report an infinite disagreement.
 *
 * @param {number} a - One measurement
 * @param {number} b - The other
 * @param {number} [floor] - Smallest scale worth dividing by
 * @returns {?number} The fractional difference
 */
export function relativeChange(a, b, floor = 1e-12) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const scale = Math.max(Math.abs(a), Math.abs(b), floor);
  return Math.abs(a - b) / scale;
}

/**
 * Compare a series measured in both runs, early and whole.
 *
 * Aligned on simulated time by the caller; this only judges. The early window
 * is what separates a chaotic pair from a broken one.
 *
 * @param {Array<{t: number, a: number, b: number}>} aligned - Paired samples
 * @param {object} [opts] - `tolerance` and `earlyFraction`
 * @returns {?object} Agreement early, late and overall
 */
export function compareSeries(aligned, opts = {}) {
  const rows = (aligned || []).filter(
    r => Number.isFinite(r.a) && Number.isFinite(r.b)
  );
  if (rows.length < 4) return null;
  const tol = opts.tolerance ?? DEFAULT_TOLERANCE;
  const cut = Math.max(
    2,
    Math.floor(rows.length * (opts.earlyFraction ?? EARLY_FRACTION))
  );

  // Scaled by the size of the series, not by each sample's own magnitude.
  //
  // This matters and is not a detail. A trajectory that oscillates through
  // zero - which is most of them, since positions and velocities are measured
  // about something - has samples arbitrarily close to zero, and a pointwise
  // relative comparison there reports an enormous disagreement from a tiny
  // absolute one. Two runs that track each other perfectly would then be
  // called unresolved because they both happened to pass through the origin.
  // The question a path comparison is actually asking is "have these separated
  // by much, compared with how far they travel", so the denominator is the
  // range of the series rather than the value at the instant.
  const values = rows.flatMap(r => [r.a, r.b]);
  const scale = Math.max(
    Math.max(...values) - Math.min(...values),
    Math.max(...values.map(Math.abs)),
    1e-12
  );
  const worst = slice =>
    slice.reduce((m, r) => Math.max(m, Math.abs(r.a - r.b) / scale), 0);

  const early = worst(rows.slice(0, cut));
  const whole = worst(rows);
  return {
    n: rows.length,
    earlySamples: cut,
    earlyWorst: early,
    worst: whole,
    scale,
    earlyAgrees: early <= tol,
    wholeAgrees: whole <= tol,
    tolerance: tol,
  };
}

/**
 * How the conservation diagnostics behaved when the step was halved.
 *
 * Reported, never used to decide the outcome. For a convergent scheme the
 * drift should fall - first order halves it, second order quarters it - and a
 * drift that does not fall says the step is not resolving something. That is a
 * reason to look harder, not a verdict.
 *
 * @param {object} coarse - Run at the chosen step
 * @param {object} fine - Run at half the step
 * @returns {object} What the diagnostics did
 */
export function conservationTrend(coarse, fine) {
  const expectation = conservationExpectation(fine);
  const e0 = Math.abs(coarse?.energyDrift ?? 0);
  const e1 = Math.abs(fine?.energyDrift ?? 0);
  const l0 = Math.abs(coarse?.angularDrift ?? 0);
  const l1 = Math.abs(fine?.angularDrift ?? 0);

  return {
    status: expectation.status,
    reasons: expectation.reasons,
    energy: { coarse: e0, fine: e1, ratio: e1 > 0 ? e0 / e1 : null },
    angular: { coarse: l0, fine: l1, ratio: l1 > 0 ? l0 / l1 : null },
    // Only meaningful where conservation is expected at all, and null rather
    // than false elsewhere so a caller cannot read "did not improve" off a
    // model that was never going to.
    improved: expectation.status === CONSERVATION.EXPECTED ? e1 <= e0 : null,
  };
}

/**
 * The whole check.
 *
 * @param {object} input - coarse, fine, and how to judge them
 * @param {object} input.coarse - Run at the chosen step
 * @param {object} input.fine - Run at half the step
 * @param {number} [input.outcomeCoarse] - The selected scientific outcome
 * @param {number} [input.outcomeFine] - The same outcome from the fine run
 * @param {Array} [input.aligned] - Paired series samples, if the outcome is a path
 * @param {number} [input.tolerance] - Agreement required
 * @returns {object} The verdict, the evidence, and why
 */
export function reliabilityReport(input) {
  const { coarse, fine, aligned } = input || {};
  const tolerance = input?.tolerance ?? DEFAULT_TOLERANCE;
  const gate = comparable(coarse, fine);
  const conservation = conservationTrend(coarse, fine);

  if (!gate.ok) {
    return {
      verdict: VERDICT.INCOMPARABLE,
      reason: gate.reason,
      tolerance,
      outcome: null,
      series: null,
      conservation,
      steps: { coarse: coarse?.step ?? null, fine: fine?.step ?? null },
    };
  }

  const outcomeChange = relativeChange(input.outcomeCoarse, input.outcomeFine);
  const series = aligned ? compareSeries(aligned, { tolerance }) : null;

  let verdict;
  let reason = null;
  if (outcomeChange === null && !series) {
    verdict = VERDICT.INCOMPARABLE;
    reason = 'noMeasurement';
  } else if (series && !series.wholeAgrees && series.earlyAgrees) {
    // Agreed at the start and parted later.
    //
    // This used to be called chaos. It is not: it is what chaos looks like AND
    // what a small systematic difference looks like. Two sinusoids whose
    // frequencies differ by a fraction of a percent agree early and separate
    // late in exactly this pattern, and a step size that shifts an orbital
    // period slightly produces precisely that. Early agreement rules out a
    // scheme that was wrong from the first close approach; it does not
    // distinguish sensitive dependence from an accumulating offset.
    //
    // So the verdict names the OBSERVATION - the paths separated while the
    // aggregates held - and the notes say what that supports and what it does
    // not. Diagnosing chaos needs evidence this comparison does not collect:
    // how the separation grows, and whether it does so from many starts.
    verdict = VERDICT.DIVERGED;
    reason = 'trajectoryDiverged';
  } else if (series && !series.earlyAgrees) {
    // Wrong from the beginning. Nothing chaotic about it.
    verdict = VERDICT.UNRESOLVED;
    reason = 'disagreedFromTheStart';
  } else if (outcomeChange !== null && outcomeChange > tolerance) {
    verdict = VERDICT.UNRESOLVED;
    reason = 'outcomeMoved';
  } else {
    verdict = VERDICT.CONVERGING;
  }

  // A diverged trajectory is only a usable answer if the aggregate held. When
  // both moved, there is nothing to fall back on and the run is unresolved.
  if (
    verdict === VERDICT.DIVERGED &&
    outcomeChange !== null &&
    outcomeChange > tolerance
  ) {
    verdict = VERDICT.UNRESOLVED;
    reason = 'aggregateMovedToo';
  }

  return {
    verdict,
    reason,
    tolerance,
    outcome: {
      coarse: input.outcomeCoarse ?? null,
      fine: input.outcomeFine ?? null,
      change: outcomeChange,
      agrees: outcomeChange === null ? null : outcomeChange <= tolerance,
    },
    series,
    conservation,
    steps: { coarse: coarse.step, fine: fine.step },
    duration: fine.duration,
  };
}

/**
 * The message keys a student-facing summary is built from.
 *
 * Keys rather than prose, so both languages say the same careful thing. There
 * is no key that means "accurate": the strongest available statement is that
 * halving the step did not move the answer, which is a much smaller claim and
 * the only one a convergence check supports.
 *
 * @param {object} report - From reliabilityReport
 * @returns {{headline: string, notes: Array<string>}} What to say
 */
export function explain(report) {
  const notes = [];
  const headline = `reliability.verdict.${report.verdict}`;

  if (report.reason) notes.push(`reliability.reason.${report.reason}`);

  if (report.conservation.status === CONSERVATION.NOT_EXPECTED) {
    notes.push('reliability.conservationNotExpected');
  }
  // Said every time the drift figures are shown, whatever they show and
  // whether or not they were expected to mean anything. A well-conserved run
  // is the most persuasive wrong answer this feature has to guard against:
  // energy is one number, and a close approach can be resolved far too
  // coarsely without disturbing it.
  notes.push('reliability.conservationIsNotAccuracy');
  if (
    report.conservation.status === CONSERVATION.EXPECTED &&
    report.conservation.improved === false
  ) {
    // Worth saying, and worth not overstating. A drift that failed to fall is
    // evidence that something is unresolved; it is not the verdict, and the
    // verdict was computed without it.
    notes.push('reliability.driftDidNotFall');
  }

  if (report.verdict === VERDICT.DIVERGED) {
    // What the comparison shows, then what it cannot decide, then what would.
    // Three notes rather than one, because collapsing them is how "the paths
    // separated" became "this system is chaotic".
    notes.push('reliability.divergenceObserved');
    notes.push('reliability.divergenceIsNotChaos');
    notes.push('reliability.divergenceNextStep');
    notes.push('reliability.quoteStatistics');
  }
  if (report.verdict === VERDICT.CONVERGING) {
    notes.push('reliability.stillNotProof');
  }
  return { headline, notes };
}
