// =============================================================================
// The chaos lesson's controlled pair, and its numerical controls
// -----------------------------------------------------------------------------
// The measurement the Butterfly Effect lesson is built on is a comparison
// between two runs that differ in one coordinate of one body. Getting the bench
// into a state where that comparison is possible takes nine steps - name it,
// capture, choose the bodies, choose the metrics, ask for body positions, record
// A, return to the start, perturb, record B - and none of those nine steps
// teaches anything about chaos. They are the apparatus, and a student who
// mis-clicks one of them gets a plausible wrong answer: two runs of different
// lengths that do not overlap, or a Run A that started wherever the simulation
// had drifted to while they were reading the instructions.
//
// So the apparatus is a button and the physics is not. What the lesson still
// asks a student to do is exactly what it asked before: predict, run, read the
// instrument, and say what the evidence supports.
//
// The two things this file exists to get right
// -----------------------------------------------------------------------------
// The same interval. Both runs are asked for the same simulated span, and both
// spans are reported, because the divergence analysis fits a straight line to
// their overlap and an overlap shorter than either run is a shorter fit than
// the reader thinks they asked for.
//
// The step that was actually taken. The lesson's numerical control used to say
// "halve the simulation speed, which halves the step the integrator takes".
// That is not reliably true. js/timestep.js splits a frame's advance into at
// most MAX_SUBSTEPS pieces no larger than max_timestep, so which of the two
// knobs binds depends on the scenario and on the frame rate - and where the
// substep cap binds, halving the speed halves the number of substeps and
// leaves their size alone. A control that assumes otherwise is a control that
// may have changed nothing. So the step is measured, per run, from the steps
// the engine actually took, and the control is labelled with what it did rather
// than with what was asked for.
// =============================================================================

import { refinementVerdict } from '../chaos/divergence.js';

/**
 * The two comparisons the lesson makes, and what each holds fixed.
 *
 * The binary is the counterexample and is kept: two nearly identical two-body
 * runs come apart too, linearly, and a lesson that only ever showed the
 * chaotic case would have taught that any growing separation is chaos.
 */
export const CONFIGURATIONS = Object.freeze({
  binary: Object.freeze({
    scenario: 'Binary Pair',
    seed: 'chaos-binary',
    /** The body to nudge, by the name the world builder gives it. */
    body: null,
    axis: 'x',
    km: 1500,
    /** How long to watch, in the pair's own orbits. */
    orbits: 4,
    /** What the lesson expects, so a wild answer can be recognised as one. */
    expect: 'linear',
  }),
  triple: Object.freeze({
    scenario: 'Three-Body Sensitivity Lab',
    seed: 'chaos-lab',
    body: 'Alpha',
    axis: 'x',
    km: 1500,
    /**
     * Simulated seconds rather than orbits: the triangle comes apart, so after
     * the first few rotations there is no orbit to count. Forty is what the
     * lesson has always asked for and what its quoted e-folding time was
     * measured over.
     */
    seconds: 40,
    expect: 'exponential',
  }),
});

/**
 * The numerical controls the lesson runs, and the setting each one changes.
 *
 * One at a time, and one thing each. `step` halves the largest step the
 * integrator may take, which is the knob that actually bounds the step;
 * `integrator` swaps the scheme for one of the application's own. Neither
 * touches the perturbation, the bodies or the span, so the repeat is the same
 * physical experiment computed differently - which is the only kind of repeat
 * that can tell physics from arithmetic.
 */
export const CONTROLS = Object.freeze([
  Object.freeze({ id: 'finerStep', setting: 'max_timestep', factor: 0.5 }),
  Object.freeze({
    id: 'altIntegrator',
    setting: 'integrator',
    // Velocity Verlet where the scenario ships Symplectic Euler, and RK4 where
    // it already ships Verlet, so the control always changes the scheme.
    value: { 'Symplectic Euler': 'Velocity Verlet', 'Velocity Verlet': 'RK4' },
    fallback: 'RK4',
  }),
]);

/** Every integrator the controls may select, for a caller that validates. */
export const SUPPORTED_INTEGRATORS = Object.freeze([
  'Symplectic Euler',
  'Velocity Verlet',
  'RK4',
]);

/**
 * Which integrator a control would switch to, from the one in force.
 *
 * @param {string} current - The integrator now
 * @returns {?string} The one to switch to, or null if there is nowhere to go
 */
export function alternateIntegrator(current) {
  const control = CONTROLS.find(c => c.id === 'altIntegrator');
  const wanted = control.value[current] ?? control.fallback;
  if (wanted === current || !SUPPORTED_INTEGRATORS.includes(wanted))
    return null;
  return wanted;
}

/**
 * What the engine actually did, from the steps it actually took.
 *
 * @param {Array<number>} steps - Every dt the engine reported during the run
 * @returns {object} The statistics, and null-ish when nothing was recorded
 */
export function stepStatistics(steps) {
  const dts = (steps || []).filter(dt => Number.isFinite(dt) && dt > 0);
  if (!dts.length) {
    return { steps: 0, span: 0, mean: null, min: null, max: null };
  }
  const span = dts.reduce((a, b) => a + b, 0);
  return {
    steps: dts.length,
    span,
    mean: span / dts.length,
    min: Math.min(...dts),
    max: Math.max(...dts),
  };
}

/**
 * Whether a repeat really was computed differently from the run it repeats.
 *
 * The check the old instruction could not make. A control whose measured mean
 * step is the same as the baseline's, and whose integrator is the same, has
 * repeated the experiment rather than controlled it - and reporting its
 * agreement as evidence of resolution would be reporting that a number agrees
 * with itself.
 *
 * @param {object} baseline - stepStatistics() of the original pair, plus
 *   `integrator`
 * @param {object} control - The same for the repeat
 * @param {number} [tolerance] - Fractional step change that counts as a change
 * @returns {object} Whether it differed, and in what
 */
export function controlDiffers(baseline, control, tolerance = 0.05) {
  const a = baseline?.mean;
  const b = control?.mean;
  const stepChange =
    Number.isFinite(a) && Number.isFinite(b) && a > 0 ? (b - a) / a : null;
  const schemeChanged =
    Boolean(baseline?.integrator) &&
    Boolean(control?.integrator) &&
    baseline.integrator !== control.integrator;
  const stepChanged =
    Number.isFinite(stepChange) && Math.abs(stepChange) > tolerance;
  return {
    stepChange,
    stepChanged,
    schemeChanged,
    differs: stepChanged || schemeChanged,
    reason: stepChanged || schemeChanged ? null : 'nothingChanged',
  };
}

/**
 * A label for a numerical control that says what it did.
 *
 * The bench's own label is the integrator and the playback speed, which is
 * what was asked for. This adds the mean step the engine actually took, which
 * is what happened.
 *
 * @param {object} spec - `integrator` and stepStatistics()
 * @returns {string} The label
 */
export function controlLabel({ integrator, mean, steps }) {
  const step = Number.isFinite(mean) ? mean.toPrecision(3) : '?';
  return `${integrator || '?'}, step ${step} x${steps ?? 0}`;
}

/**
 * Whether the divergence survived being computed differently.
 *
 * A thin wrapper over js/chaos/divergence.js so the lesson's vocabulary lives
 * in one place, plus the two things that wrapper cannot know: whether any of
 * the controls actually changed the arithmetic, and that an inadequate set of
 * controls is an UNRESOLVED result rather than a missing one.
 *
 * @param {Array<object>} controls - {label, tau, behaviour, differs}
 * @param {number} [tolerance] - Allowed fractional spread in tau
 * @returns {object} The verdict, and why
 */
export function refinementReport(controls, tolerance = 0.2) {
  const list = controls || [];
  const verdict = refinementVerdict(list, tolerance);
  const effective = list.filter(c => c?.differs !== false);
  if (effective.length < 2) {
    return {
      ...verdict,
      resolved: false,
      // Named separately from "need-two-estimates": two repeats that computed
      // the same arithmetic twice are two estimates and no control at all.
      reason: list.length >= 2 ? 'controlsIneffective' : verdict.reason,
      effective: effective.length,
      total: list.length,
      unresolved: true,
    };
  }
  return {
    ...verdict,
    effective: effective.length,
    total: list.length,
    /**
     * True whenever the evidence does not support "the divergence is
     * physical". The lesson prints this rather than a smaller number, because
     * an unresolved measurement reported as a result is the failure mode the
     * whole fourth act exists to prevent.
     */
    unresolved: !verdict.resolved,
  };
}

/**
 * Whether the two runs cover the same stretch of simulated time.
 *
 * @param {object} a - {span} of run A
 * @param {object} b - The same for run B
 * @param {number} [tolerance] - Allowed fractional difference
 * @returns {object} Whether they match, and the overlap they share
 */
export function sameInterval(a, b, tolerance = 0.05) {
  const sa = a?.span;
  const sb = b?.span;
  if (!(sa > 0) || !(sb > 0)) {
    return { ok: false, reason: 'missingRun', overlap: 0, mismatch: null };
  }
  const mismatch = Math.abs(sa - sb) / Math.max(sa, sb);
  return {
    ok: mismatch <= tolerance,
    reason: mismatch <= tolerance ? null : 'intervalsDiffer',
    overlap: Math.min(sa, sb),
    mismatch,
  };
}
