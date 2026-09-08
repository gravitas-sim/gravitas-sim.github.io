// =============================================================================
// The gravity-assist lesson's comparison and its sweep
// -----------------------------------------------------------------------------
// Two things the lesson used to ask a student to do from memory.
//
// The first is the comparison. "Fly it at +40, write four numbers down, press
// Other side, fly it at -40, and now compare" asks somebody to hold eight
// figures in their head while the second encounter overwrites the panel that
// held the first four. What they are being asked to notice - that the velocity
// CHANGE is the same size both ways and the SPEED change is not - is a
// comparison between numbers that were never on screen together. So both
// passes are run and both are kept, and the table puts them side by side.
//
// The second is the sweep: five impact parameters on one side of the planet,
// which is a thing to look at rather than a thing to remember, and which the
// lesson labels optional because the core argument does not need it.
//
// It is deliberately not a general framework. js/experiments/sweep.js and the
// bench runner already are one, and this reuses both - the validation, the
// value planning, the world capture and restoration, the cancellation, the
// simulated-progress measurement - and supplies the one thing generic
// machinery cannot: what the encounter did.
//
// One definition of an encounter, in one place
// -----------------------------------------------------------------------------
// Every measurement here comes from js/assistWatch.js, which is what the panel
// reads and what the notebook and the exports record. The bench's own metrics
// are time averages over a run, and a time-averaged speed is not a before and
// an after: it is a number that would happily report a flyby that never
// happened. So the trials here are observed, not sampled, and what they
// observe is the same matched pair of readings - inbound gate, outbound gate,
// same distance both sides - that the panel shows.
// =============================================================================

import { deflectionAngle, periapsisDistance } from '../gravityAssist.js';
import { currentAssist, PHASE } from '../assistWatch.js';
import * as SWEEP from './sweep.js';

/** The parameter both experiments vary, and the only one either varies. */
export const PARAMETER = 'assist_impact_parameter';

/**
 * The isolated lab's own configuration, restated.
 *
 * Restated rather than read off whatever the panel happens to be showing,
 * because the comparison's claim is that A and B differ in one number. A
 * student who has been playing with the approach speed and then runs the
 * comparison would otherwise get two passes that agree with each other and
 * disagree with everything the lesson says about them.
 *
 * These are the values in js/scenarios.js for 'Gravity Assist Lab'. The
 * scenario re-stamps most of them on every rebuild; the two that survive a
 * rebuild - the impact parameter and the approach speed, both LAB_VARIABLES -
 * are the two that have to be set deliberately here.
 */
export const BASELINE = Object.freeze({
  scenario: 'Gravity Assist Lab',
  seed: 'assist',
  /** Speed relative to the planet, far away. Held across every trial. */
  vInfinity: 0.461,
  /** Where before and after are read, on both legs. Not a lab variable. */
  gate: 4000,
  approachDeg: 130.6,
  planetMassJupiters: 5,
  planetSpeed: 0.3,
  probeMassRatio: 1e-6,
  integrator: 'Velocity Verlet',
  maxTimestep: 0.5,
});

/**
 * The two arms of the comparison.
 *
 * Same magnitude, opposite sign, which is the whole experiment: the sign is
 * which side of the planet the spacecraft passes, and it is the one thing that
 * differs between A and B.
 */
export const COMPARISON = Object.freeze({
  /** Behind the planet, on its trailing side. The gaining pass. */
  gaining: 40,
  /** In front of it, on its leading side. The losing one. */
  losing: -40,
});

/**
 * Five impact parameters on the gaining side, and why these five.
 *
 * All positive: the sweep is about how much the encounter does, not about
 * which way, and mixing the sides would put two different questions on one
 * plot. 40 is in the list because it is the pass the student has already flown
 * twice, so the sweep has an anchor they can recognise.
 *
 * The floor is set by the planet, not by taste. Periapsis falls with the
 * impact parameter, and js/physics.js merges bodies whose centres come within
 * the sum of their drawn radii - 2.4 units here. At 20 the spacecraft passes
 * 7.6 units out, three and a half times that; at 10 it would pass 2.1 units
 * out and be swallowed. A sweep that quietly included a collision would report
 * it as a flyby with no outgoing reading.
 *
 * The ceiling is set by there being nothing to see: by 90 the turn is under
 * thirty degrees and each further step buys less than the one before.
 */
export const SWEEP_VALUES = Object.freeze([20, 30, 40, 60, 90]);

/**
 * How much longer than the encounter the frame budget is.
 *
 * The trial's real finish line is the spacecraft crossing the outbound gate;
 * this is only the backstop for one that never gets there. Half again over the
 * straight-line crossing time is generous - gravity makes the real crossing
 * quicker, not slower - and short enough that a stuck trial is not waited on.
 */
export const WINDOW_MARGIN = 1.5;

/**
 * What an encounter did, as distinct from how the trial ran.
 *
 * A trial has a STATUS - did the run happen - and an encounter has an OUTCOME.
 * Conflating them is how `ok` comes to be read as "this is a measured flyby",
 * so they are kept apart all the way to the panel and the notebook.
 */
export const ENCOUNTER = Object.freeze({
  /** Read in, read out, spacecraft intact. The only one that is evidence. */
  COMPLETE: 'complete',
  /** It never came back out past the gate inside the budget. */
  INCOMPLETE: 'incomplete',
  /** It began inside the gate, so there is no inbound reading to compare to. */
  NO_BEFORE: 'noBefore',
  /** It hit the planet, or was otherwise lost mid-encounter. */
  LOST: 'lost',
  /** The world would not build, or the recorder never armed. */
  NOT_RUN: 'notRun',
});

/** Radians to degrees, since the panel and the lesson both work in degrees. */
const deg = r => (r === null || r === undefined ? null : (r * 180) / Math.PI);

/**
 * Read one finished trial into the record the lesson reports.
 *
 * Everything here comes from the watcher's summary. Nothing is recomputed from
 * the bodies, because by the time this is read the world has been rebuilt for
 * the next trial and the bodies it would recompute from are somebody else's.
 *
 * @param {object} trial - From the bench runner, with `observed` set
 * @returns {object} The encounter, and the diagnostics behind it
 */
export function describeEncounter(trial) {
  const run = trial?.observed ?? null;
  const base = {
    value: trial?.value ?? null,
    status: trial?.status ?? null,
    side: run?.side ?? null,
    gate: run?.gate ?? null,
    closest: run?.closest ?? null,
    deflectionDeg: deg(run?.deflection ?? null),
    relBefore: run?.vInfBefore ?? null,
    relAfter: run?.vInfAfter ?? null,
    relativeResidual: run?.relativeResidual ?? null,
    inertBefore: run?.inertialBefore ?? null,
    inertAfter: run?.inertialAfter ?? null,
    speedChange: run?.speedChange ?? null,
    deltaVMagnitude: run?.deltaVMagnitude ?? null,
    planetRecoil: run?.planetDeltaVMagnitude ?? null,
    ledgerMismatch: run?.ledgerMismatch ?? null,
    massRatio: run?.massRatio ?? null,
    elapsed: run?.elapsed ?? null,
    steps: run?.steps ?? null,
  };

  if (!run) return { ...base, outcome: ENCOUNTER.NOT_RUN, usable: false };
  if (run.lost) return { ...base, outcome: ENCOUNTER.LOST, usable: false };
  if (run.startedInside) {
    return { ...base, outcome: ENCOUNTER.NO_BEFORE, usable: false };
  }
  // An encounter with no outgoing reading is not half an encounter, it is no
  // measurement at all: the whole comparison is between two readings taken at
  // the same distance, and one of them is missing.
  if (!run.complete || run.phase !== PHASE.DONE || !trial.complete) {
    return { ...base, outcome: ENCOUNTER.INCOMPLETE, usable: false };
  }
  return { ...base, outcome: ENCOUNTER.COMPLETE, usable: true };
}

/**
 * An observer the bench runner can drive, wrapping the assist watcher.
 *
 * `arm` is called once the world for a trial is built; `done` is the trial's
 * real finish line - the spacecraft back out past the gate, or lost - and
 * `read` hands back the encounter.
 *
 * @param {object} deps - {armRun} the panel's own arming function
 * @returns {object} The observer
 */
export function assistObserver(deps) {
  return {
    arm() {
      deps.armRun();
    },
    done() {
      return currentAssist()?.phase === PHASE.DONE;
    },
    read() {
      const run = currentAssist();
      return run ? { ...run } : null;
    },
  };
}

/**
 * How long one encounter needs, as a frame budget.
 *
 * Gate to gate at the approach speed, half again for luck. The spacecraft is
 * faster than that everywhere - it is falling towards a planet for the first
 * half - so this over-estimates, which is the direction to be wrong in when
 * the alternative is reporting a completed encounter as incomplete.
 *
 * The runner budgets frames as duration/dtSim, where dtSim is what a frame is
 * SUPPOSED to advance. What the engine actually advances is a different number
 * in some scenarios, so the caller measures the real rate and passes it in.
 *
 * @param {object} [over] - `gate`, `vInf` and the measured `frameRatio`
 * @returns {number} Simulated time units
 */
export function encounterDuration(over = {}) {
  const gate = Number.isFinite(over.gate) ? over.gate : BASELINE.gate;
  const vInf = Number.isFinite(over.vInf) ? over.vInf : BASELINE.vInfinity;
  const ratio =
    Number.isFinite(over.frameRatio) && over.frameRatio > 0
      ? over.frameRatio
      : 1;
  return ((2 * gate) / vInf) * WINDOW_MARGIN * ratio;
}

/**
 * The spec the bench runner is given, for either experiment.
 *
 * @param {Array<number>} values - The impact parameters to run, signed
 * @param {object} [over] - `gate`, `vInf`, `frameRatio`
 * @returns {object} A spec for runSweep()
 */
export function specFor(values, over = {}) {
  const list = [...values];
  return {
    scenario: BASELINE.scenario,
    parameter: PARAMETER,
    // Explicit values rather than a range: these are the passes the lesson has
    // reasons for, and dividing a range evenly would put none of them where
    // the lesson has already been.
    values: list,
    from: Math.min(...list),
    to: Math.max(...list),
    count: list.length,
    duration: encounterDuration(over),
    seed: BASELINE.seed,
    // The runner still wants a metric list. These are not the result - the
    // observer's encounter is - and nothing in this file reads them.
    metrics: ['distance_to_primary'],
  };
}

/** The comparison's spec: two passes, same magnitude, opposite sides. */
export const comparisonSpec = (over = {}) =>
  specFor([COMPARISON.gaining, COMPARISON.losing], over);

/** The sweep's spec: five magnitudes, all on the gaining side. */
export const sweepSpec = (over = {}) =>
  specFor(over.values ?? [...SWEEP_VALUES], over);

/**
 * Whether a value is one these experiments will run.
 *
 * Two tests, and the second is the one that matters here. The allowlist in
 * js/experiments/sweep.js keeps the impact parameter inside the range where
 * the scenario still describes a flyby; this also asks whether the spacecraft
 * would clear the planet, which the allowlist cannot know because it depends
 * on the planet's mass and the approach speed.
 *
 * @param {number} value - Signed impact parameter
 * @param {object} [over] - `mu`, `vInf` and the `collisionRadius` to clear
 * @returns {{ok: boolean, reason: ?string, periapsis: ?number}} The verdict
 */
export function isSafeValue(value, over = {}) {
  const def = SWEEP.parameterFor(BASELINE.scenario, PARAMETER);
  if (!def || !Number.isFinite(value)) {
    return { ok: false, reason: 'notNumeric', periapsis: null };
  }
  if (value < def.min || value > def.max) {
    return { ok: false, reason: 'outOfRange', periapsis: null };
  }
  if (def.exclude && value > def.exclude.from && value < def.exclude.to) {
    return { ok: false, reason: 'excluded', periapsis: null };
  }
  const mu = Number.isFinite(over.mu) ? over.mu : defaultMu();
  const vInf = Number.isFinite(over.vInf) ? over.vInf : BASELINE.vInfinity;
  const clear = Number.isFinite(over.collisionRadius)
    ? over.collisionRadius
    : COLLISION_RADIUS;
  const periapsis = periapsisDistance(mu, value, vInf);
  if (periapsis === null || periapsis <= clear) {
    return { ok: false, reason: 'wouldCollide', periapsis };
  }
  return { ok: true, reason: null, periapsis };
}

/**
 * The distance at which the engine stops calling it a flyby.
 *
 * js/physics.js merges two bodies when their centres come within the sum of
 * their drawn radii. In this scenario the planet is drawn at 2 units and the
 * spacecraft at 0.4, both stated in js/world/build.js.
 */
export const COLLISION_RADIUS = 2.4;

/** G times the planet's mass, for the isolated lab as js/scenarios.js sets it. */
export function defaultMu() {
  // G is 1.0 in both assist scenarios, and the planet is five Jupiters against
  // a solar mass of 1000 units. Spelled out rather than imported so that this
  // module stays a description of the experiment and not a second consumer of
  // the settings object.
  const JUPITER_MASSES_PER_SOLAR_MASS = 1047.348644;
  const planetMass =
    (BASELINE.planetMassJupiters / JUPITER_MASSES_PER_SOLAR_MASS) * 1000;
  return 1.0 * planetMass;
}

/**
 * What the two passes together do and do not establish.
 *
 * The comparison's one real trap is the expectation that a gain on one side
 * must be matched by an equal loss on the other. It is a good expectation and
 * it is wrong, and the two numbers that show why are both in here: the change
 * in VELOCITY is the same size on both sides, because it is the same rotation
 * of the same-length vector; the change in SPEED is not, because speed is the
 * length of a sum and lengths do not add and subtract symmetrically.
 *
 * @param {object} gaining - describeEncounter() of the positive pass
 * @param {object} losing - describeEncounter() of the negative pass
 * @returns {?object} The comparison, or null unless both are usable
 */
export function compareSides(gaining, losing) {
  if (!gaining?.usable || !losing?.usable) return null;
  const gv = gaining.deltaVMagnitude;
  const lv = losing.deltaVMagnitude;
  const scale = Math.max(Math.abs(gv), Math.abs(lv));
  return {
    /** How closely the two velocity changes agree. They should, to the
     *  integrator's accuracy: same turn, same length, opposite sense. */
    deltaVMismatch: scale > 0 ? Math.abs(gv - lv) / scale : null,
    /** How closely the two SPEED changes agree. They need not, at all. */
    speedChangeRatio:
      gaining.speedChange !== 0
        ? Math.abs(losing.speedChange / gaining.speedChange)
        : null,
    gain: gaining.speedChange,
    loss: losing.speedChange,
    /**
     * Explicitly false in this geometry, and recorded rather than assumed.
     *
     * Nothing in the physics requires it to be false either: at other approach
     * angles the two changes can come out very nearly equal. What is never
     * required is that they match, which is why this is measured and reported
     * instead of being stated as a rule.
     */
    symmetric:
      scale > 0 &&
      Math.abs(Math.abs(losing.speedChange) - Math.abs(gaining.speedChange)) /
        Math.max(Math.abs(gaining.speedChange), 1e-12) <
        0.01,
    /** Same deflection, opposite sense: the geometry really is mirrored. */
    deflectionMismatch:
      gaining.deflectionDeg && losing.deflectionDeg
        ? Math.abs(
            Math.abs(gaining.deflectionDeg) - Math.abs(losing.deflectionDeg)
          ) / Math.abs(gaining.deflectionDeg)
        : null,
    /** And the same closest approach, which rules out "it just went closer". */
    closestMismatch:
      gaining.closest && losing.closest
        ? Math.abs(gaining.closest - losing.closest) / gaining.closest
        : null,
  };
}

/**
 * What the finite spacecraft mass does to the story the lesson tells.
 *
 * The lesson says the speed relative to the planet is unchanged, and it is -
 * exactly, for two bodies of any masses, because the relative motion is a
 * Kepler problem and it returns to the same separation with the same relative
 * speed. That is not the approximation.
 *
 * The approximation is the phrase "the planet's frame". The planet recoils, so
 * there is one planet frame before the encounter and a slightly different one
 * after, and they are not the same inertial frame. The size of the difference
 * is the recoil, and momentum conservation fixes it exactly: the planet's
 * velocity change is the spacecraft's, scaled by the mass ratio. Checking that
 * ratio against the masses is the audit, and it is the cleanest statement in
 * the lesson of what IS conserved when the speed is not.
 *
 * @param {object} enc - describeEncounter() of a usable encounter
 * @returns {?object} The audit, or null if there is nothing to audit
 */
export function frameAudit(enc) {
  if (!enc?.usable || !enc.deltaVMagnitude) return null;
  const recoilRatio = enc.planetRecoil / enc.deltaVMagnitude;
  const massRatio = enc.massRatio;
  return {
    massRatio,
    planetRecoil: enc.planetRecoil,
    /** Should equal the mass ratio. Momentum conservation, as a division. */
    recoilRatio,
    recoilMatchesMass:
      Number.isFinite(massRatio) && massRatio > 0
        ? Math.abs(recoilRatio - massRatio) / massRatio < 0.01
        : false,
    /** How far the planet frame moved between the two readings, against the
     *  approach speed: how non-inertial "the planet's frame" actually is. */
    frameShift: enc.relBefore > 0 ? enc.planetRecoil / enc.relBefore : null,
    /** And what the relative speed did anyway, which is the point: nothing. */
    relativeResidual: enc.relativeResidual,
    ledgerMismatch: enc.ledgerMismatch,
  };
}

/**
 * The two-body prediction for one of these passes, for a reader to check
 * their measurement against rather than take on trust.
 *
 * @param {number} value - Signed impact parameter
 * @param {object} [over] - `mu` and `vInf`
 * @returns {?object} Deflection in degrees and periapsis, or null
 */
export function predictFor(value, over = {}) {
  const mu = Number.isFinite(over.mu) ? over.mu : defaultMu();
  const vInf = Number.isFinite(over.vInf) ? over.vInf : BASELINE.vInfinity;
  const delta = deflectionAngle(mu, value, vInf);
  if (delta === null) return null;
  return {
    deflectionDeg: deg(delta),
    periapsis: periapsisDistance(mu, value, vInf),
  };
}

/**
 * Whether the biggest turn in a set of encounters also gained the most speed.
 *
 * The question the sweep exists to ask, answered from the reader's own trials
 * rather than from a rule. In this lab, over every pass the planet survives,
 * the answer comes out yes - and that is a fact about this geometry, not a
 * law. Turning the relative velocity helps only until it points along the
 * planet's own motion; past that, more turn is worse. Here that optimum needs
 * a turn of about 131 degrees and the closest survivable pass manages 97, so
 * the sweep never reaches the far side of the hill.
 *
 * @param {Array<object>} encounters - describeEncounter() results
 * @returns {?object} Which trial turned most, which gained most, and whether
 *   they are the same one
 */
export function strongestTurnGainsMost(encounters) {
  const usable = (encounters || []).filter(
    e =>
      e.usable &&
      Number.isFinite(e.deflectionDeg) &&
      Number.isFinite(e.speedChange)
  );
  if (usable.length < 2) return null;
  const byTurn = [...usable].sort(
    (a, b) => Math.abs(b.deflectionDeg) - Math.abs(a.deflectionDeg)
  );
  const byGain = [...usable].sort((a, b) => b.speedChange - a.speedChange);
  return {
    n: usable.length,
    mostTurned: byTurn[0].value,
    mostGained: byGain[0].value,
    same: byTurn[0].value === byGain[0].value,
    /** Whether gain rises all the way as the turn does, across these trials. */
    monotonic: byTurn.every(
      (e, i) => i === 0 || e.speedChange <= byTurn[i - 1].speedChange + 1e-12
    ),
  };
}
