// =============================================================================
// The A/B Experiment Bench
// -----------------------------------------------------------------------------
// A controlled experiment is: fix everything, change one thing, measure the
// difference. The sandbox has always been able to do the "change one thing"
// part and has never been able to do the "fix everything" part, because
// returning to a start you have already run past is not something a person can
// do by hand. This is that missing half.
//
// The shape of a session:
//
//   capture   the world as it stands becomes the experiment's start, recorded
//             as the canonical share payload plus the extras in
//             canonicalState.js
//   select    which bodies, which quantities
//   run A     the simulation runs and is sampled on its own simulated clock
//   restore   back to the captured start, exactly - same seed, same clock,
//             same object ids
//   change    one independent variable
//   run B     sampled the same way
//   compare   aligned on simulated time, differenced, charted, tabled
//
// Why sequential runs and not two engines
// -----------------------------------------------------------------------------
// The obvious alternative is to instantiate the physics engine twice and run
// both arms at once. That is not available here, and the reason is structural
// rather than a matter of effort. js/physics.js keeps the world in module-level
// arrays - `bh_list`, `stars`, `planets` and the rest are exported bindings
// that every other module mutates in place - and its tuning lives in a
// module-level `physicsSettings` object written by updatePhysicsSettings().
// There is one world per loaded module, and no constructor that makes another.
//
// Getting isolated instances would mean turning those arrays and that settings
// object into instance state and threading a handle through physics.js,
// render.js, timeline.js, ui.js and every widget that reads a body list: a
// refactor of the engine's public surface, touching thousands of lines, to
// support one feature. It would also double the per-frame cost of the thing
// the application is for, and on a scenario that already runs at 22ms a frame
// that is a worse experiment, not a better one.
//
// Sequential paired runs cost the student the wall-clock time of two runs and
// nothing else. Because the restore is exact and the comparison is on
// simulated time, the result is identical to what two engines would have
// produced. If physics.js ever grows a real instance API, the change here is
// confined to runPhase() below.
//
// The force law is not duplicated anywhere in this directory. Energy and
// angular momentum come from physics.js:conservedQuantities(); drift comes from
// conservationDrift(). A bench that recomputed them could report a system as
// conserving while the engine that moved the bodies did something else.
// =============================================================================

import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  getSimulationTime,
  conservedQuantities,
  conservationDrift,
  resetConservationBaseline,
  updatePhysicsSettings,
  getWorldGeneration,
} from '../physics.js';
import { pristineSettingsFor } from '../shareState.js';
import { createPhaseSampler } from './phaseSampler.js';
import { timeUnitSeconds } from '../units.js';
import { t } from '../i18n/index.js';
import { toast } from '../controls.js';
import {
  hashState,
  parameterDiff,
  describeDiff,
  readExtras,
} from './canonicalState.js';
import {
  METRICS,
  METRIC_ARITY,
  METRIC_UNITS,
  SCALAR_METRICS,
  sampleFrame,
  reduceRun,
  compareRuns,
  series,
} from './metrics.js';
import { alignSeries, samplingStats } from './align.js';
import {
  SCHEMA_VERSION,
  FAILURE,
  listExperiments,
  loadExperiment,
  saveExperiment,
  deleteExperiment,
  duplicateRecord,
  newId,
  storageReport,
} from './store.js';
import {
  experimentCsv,
  experimentManifestJson,
  exportBasename,
  importManifest,
  reliabilityJson,
  sweepCsv,
} from './exports.js';
import {
  DEFAULT_TOLERANCE,
  explain,
  relativeChange,
  reliabilityReport,
  stepPlan,
} from './reliability.js';
import * as SWEEP from './sweep.js';
import { experimentBlock } from './shareExperiment.js';
import { perturb } from './perturbation.js';

/** How often to take a sample, in simulated seconds. */
const SAMPLE_INTERVAL_HINT = 0.05;
/** Hard cap on samples per run, so a forgotten run cannot fill the store. */
const MAX_SAMPLES = 6000;

/** Metrics offered, in the order they appear in the panel. */
export const OFFERED_METRICS = [
  METRICS.POSITION,
  METRICS.SEPARATION,
  METRICS.SPEED,
  METRICS.DISTANCE_TO_PRIMARY,
  METRICS.ORBITAL_PERIOD,
  METRICS.CLOSEST_APPROACH,
  METRICS.TOTAL_ENERGY,
  METRICS.ANGULAR_MOMENTUM,
  METRICS.ENERGY_DRIFT,
  METRICS.ANGULAR_DRIFT,
];

// --- Session state -------------------------------------------------------------

/** The experiment being worked on. Null until one is started. */
let current = null;
/** 'idle' | 'recording' */
let phase = 'idle';
/** Which run is being recorded. */
let recordingLabel = null;
/** rAF handle for the sampler. */
let sampler = 0;
/** Samples accumulating for the run in progress. */
let buffer = [];
/** Simulated clock at the last sample taken. */
let lastSampleAt = -Infinity;
/** Injected by init(), so this module never imports ui.js at load time. */
let host = null;

/**
 * Wire the bench to the application.
 *
 * The ui.js functions arrive as arguments rather than imports. ui.js is 9,000
 * lines that import half the application, and a static import here would drag
 * all of it into whatever chunk the bench lands in - which is the opposite of
 * lazy-loading the bench.
 *
 * @param {Object} api
 * @param {Function} api.captureShareState - From ui.js
 * @param {Function} api.applyShareState - From ui.js
 * @param {Function} api.getSettings - Returns the live SETTINGS object
 * @param {Function} api.getScenario - Returns the current scenario name
 * @param {Function} api.getState - Returns the live view state
 * @param {Function} api.getDefaults - Returns DEFAULT_SETTINGS
 * @param {Function} api.setFixedStep - Drive the loop deterministically
 */
export function initBench(api) {
  host = api;
  // A window handle, so a lesson widget can read the active experiment without
  // importing this module and dragging the bench into its chunk. Deliberately
  // read-only in practice: the only consumer is the chaos lesson's divergence
  // widget, which calls activeExperiment() and nothing else.
  if (typeof window !== 'undefined') {
    window.__gravitasBench = {
      activeExperiment,
      isRecording,
      sampleCount,
    };
  }
}

/**
 * The settings the experiment's scenario alone would produce.
 *
 * Used to fill in a parameter the student changed in one run and left at its
 * default in the other, which a payload does not carry because a payload only
 * records departures from the scenario.
 *
 * @returns {Object} Baseline settings, or an empty object if they cannot be had
 */
function scenarioBaseline() {
  try {
    return pristineSettingsFor(
      current?.provenance?.scenario,
      host.getDefaults()
    );
  } catch {
    return {};
  }
}

/** @returns {Array<Object>} Every body a student could select */
export function selectableBodies() {
  return [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...comets,
  ].filter(b => b && b.alive !== false);
}

/** @param {number} id - Object id @returns {Object|null} The body, if it exists */
function bodyById(id) {
  return selectableBodies().find(b => b.id === id) || null;
}

/**
 * Start a new experiment from the world as it stands.
 *
 * @param {string} name - What the student called it
 * @returns {Object} The new experiment record
 */
export function captureExperiment(name) {
  const payload = host.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });
  const settings = host.getSettings();
  const extras = readExtras(payload);

  current = {
    id: newId(),
    v: SCHEMA_VERSION,
    name: name || t('bench.untitled'),
    created: Date.now(),
    updated: Date.now(),
    initialState: payload,
    objects: [],
    primary: null,
    metrics: [METRICS.SEPARATION, METRICS.TOTAL_ENERGY, METRICS.ENERGY_DRIFT],
    runs: {},
    provenance: {
      scenario: payload.s,
      seed: payload.seed,
      integrator: settings.integrator,
      // The render loop's step is dt * sim_speed * 50 * DT; sim_speed is the
      // part a student controls, so both are recorded rather than one derived
      // number that hides which was changed.
      timestep: settings.max_timestep || null,
      simSpeed: settings.sim_speed,
      units: { length: 'AU', speed: 'km/s', time: 'days' },
      initialStateHash: hashState(payload),
      referenceFrame: extras.frame,
      observer: extras.observer,
    },
    diff: { variables: [], incidental: [], context: [], multivariable: false },
    multivariableConfirmed: false,
    // Set by the chaos lesson. A perturbation is not a settings change, so the
    // parameter diff cannot see it: it is a change to one coordinate of one
    // body inside the captured state, and it is recorded here so the widget,
    // the report and the exported manifest can all name it.
    perturbation: null,
    // Repeats of the same comparison under a smaller timestep or a different
    // integrator, each {label, tau, behaviour}. What turns "these runs
    // diverged" into "these runs diverged for physical reasons".
    numericalControls: [],
    recordBodies: false,
  };
  return current;
}

/**
 * Replace the experiment's captured start with a perturbed one.
 *
 * The perturbed payload becomes the state Run B is restored to, and the
 * description of what changed is kept beside it. Both runs still start from a
 * canonical captured state; they simply start from two of them, differing in
 * one number.
 *
 * @param {Object} payload - The perturbed initial state
 * @param {Object} applied - From perturbation.js:perturb()
 * @returns {Object|null} The experiment
 */
export function setPerturbedState(payload, applied) {
  if (!current) return null;
  current.initialState = payload;
  current.perturbation = applied;
  current.provenance.initialStateHash = hashState(payload);

  // Put the world into the perturbed state now, rather than leaving it for the
  // next run to pick up. Two reasons, and the second one is a bug this fixes:
  // the student should be able to see the start they are about to run from,
  // and startRun() only restores when the clock has moved off the captured
  // value - so a perturbation applied straight after a restore would have been
  // silently ignored, and Run B would have repeated Run A exactly.
  restoreInitialState({ keepSettings: true });
  return current;
}

/**
 * Apply a perturbation to the captured start, in kilometres.
 *
 * The student types a distance in kilometres because that is a distance they
 * can picture; the conversion to simulation units happens here, once, and the
 * applied change is stored in both.
 *
 * @param {Object} spec
 * @param {number} spec.bodyId - Which body
 * @param {'x'|'y'|'vx'|'vy'} spec.axis - Which coordinate
 * @param {number} spec.km - How much, in kilometres (or km/s for a velocity)
 * @returns {{ok:boolean, reason:string, applied:Object|null}} The outcome
 */
export function applyPerturbation({ bodyId, axis, km }) {
  if (!current?.initialState) {
    return { ok: false, reason: 'noExperiment', applied: null };
  }
  // 1 simulation length unit is 0.01 AU. A velocity in km/s converts through
  // the same length unit and the simulated second.
  const UNIT_KM = 1.495978707e6;
  const delta = km / UNIT_KM;
  const result = perturb(current.initialState, { bodyId, axis, delta });
  if (!result.ok) return { ok: false, reason: result.reason, applied: null };
  setPerturbedState(result.payload, { ...result.applied, km });
  return { ok: true, reason: '', applied: result.applied };
}

/**
 * Repeat the current comparison and file the answer as a numerical control.
 *
 * The label is built from the numerics in force, so two repeats under the same
 * settings replace each other rather than accumulating - a student who runs the
 * same control twice has one control, not two agreeing ones.
 *
 * @returns {Promise<{ok:boolean, label:string}>} The outcome
 */
export async function recordNumericalControl() {
  if (!current?.runs?.A || !current?.runs?.B) return { ok: false, label: '' };
  const { separationSeries, analyseDivergence } =
    await import('../chaos/divergence.js');
  const shape = run =>
    (run.samples || [])
      .filter(s => Array.isArray(s.__bodies))
      .map(s => ({ t: s.t, bodies: s.__bodies }));
  const a = shape(current.runs.A);
  const b = shape(current.runs.B);
  if (!a.length || !b.length) return { ok: false, label: '' };
  const { series } = separationSeries(a, b);
  const verdict = analyseDivergence(series);
  const settings = host.getSettings();
  const label = `${settings.integrator}, speed ${settings.sim_speed}`;
  addNumericalControl({
    label,
    tau: verdict.tau,
    behaviour: verdict.behaviour,
  });
  return { ok: true, label };
}

/**
 * Record the outcome of running the comparison again under different numerics.
 * @param {{label:string, tau:number|null, behaviour:string}} result - The repeat
 * @returns {Array} Every control recorded so far
 */
export function addNumericalControl(result) {
  if (!current) return [];
  current.numericalControls = [
    ...(current.numericalControls || []).filter(c => c.label !== result.label),
    result,
  ];
  return current.numericalControls;
}

/**
 * Ask the recorder to keep every body's position, for a divergence measurement.
 * @param {boolean} on - Whether to record them
 */
export function setRecordBodies(on) {
  if (current) current.recordBodies = Boolean(on);
}

/**
 * The scenario loaded right now.
 *
 * So the sweep panel can open on it when it is one that can be swept, rather
 * than making the reader pick a scenario they are already looking at.
 *
 * @returns {string} Scenario key
 */
export const currentScenarioName = () => host.getScenario?.() || '';

/** @returns {Object|null} The experiment being worked on */
export const activeExperiment = () => current;

/** @param {Object|null} exp - Replace the working experiment */
export function setActiveExperiment(exp) {
  current = exp;
}

// =============================================================================
// The numerical reliability check
// -----------------------------------------------------------------------------
// Everything above lets a student measure a difference. This asks whether the
// difference is about the system or about the timestep, by running the same
// captured start twice over the same simulated duration - once at the step the
// engine is already taking and once at half of it - and seeing which of the
// conclusions survive.
//
// Sequential, for the reason given at the top of this file: there is one world
// per loaded module and no constructor for another. Isolation is therefore
// achieved by restoring rather than by separation, and it is exact in both
// directions: each phase starts from the captured payload, and when the check
// finishes - or is cancelled, or throws - the world and every setting it
// touched are put back to what the student was looking at. Neither phase is
// written into Run A or Run B.
// =============================================================================

/** Default simulated span when there is no recorded run to match. */
const RELIABILITY_DEFAULT_DURATION = 40;

/** Set while a check is running, so it can be asked to stop. */
let reliabilityAbort = null;

/**
 * What is using the live world right now, if anything.
 *
 * A/B recording, the sweep and the reliability check all drive the same world:
 * they restore it, step it at a chosen rate and put it back. Two of them at
 * once interleave their restores, and each then measures a world the other is
 * moving - so the numbers describe neither.
 *
 * They each guarded against themselves and against recording, and against
 * nothing else: a sweep could start on top of a reliability check and either
 * could start on top of the other. One function answers for all three, so a
 * fourth operation cannot be added without confronting it.
 *
 * @returns {?string} A refusal reason, or null when the world is free
 */
export function liveWorldBusy() {
  if (phase === 'recording') return 'recording';
  if (reliabilityAbort) return 'checking';
  if (sweepAbort) return 'sweeping';
  return null;
}

/** @returns {boolean} Whether a reliability check is running */
export const isCheckingReliability = () => reliabilityAbort !== null;

/**
 * Ask a running check to stop at the next frame.
 *
 * The check restores the world in a finally block, so a cancelled run leaves
 * no more trace than a completed one.
 *
 * @returns {void}
 */
export function cancelReliabilityCheck() {
  if (reliabilityAbort) reliabilityAbort.cancelled = true;
}

/**
 * Run one phase to a simulated duration, sampling every frame.
 *
 * Every frame rather than on the interval the A/B recorder uses: the two
 * phases advance the clock by exactly the same amount per frame - the frame
 * advance is untouched, only the substep cap moves - so sampling per frame
 * puts both runs' samples on identical instants and the comparison needs no
 * interpolation.
 *
 * The frame count is fixed in advance rather than the loop stopping when the
 * clock passes a threshold. Both phases advance by the same amount per frame,
 * so a threshold leaves the last frame free to overshoot by a different amount
 * in each - and two runs whose durations differ by one frame fail the "same
 * simulated duration" gate and are reported as incomparable. Which they would
 * be: the gate is right, and the runner was giving it different lengths. A
 * fixed count makes both durations identical to the last bit.
 *
 * @param {object} cfg - maxTimestep, frames, abort, onProgress, phaseIndex
 * @returns {Promise<object>} The recorded phase
 */
async function runReliabilityPhase(cfg) {
  restoreInitialState({ keepSettings: true });

  const settings = host.getSettings();
  settings.max_timestep = cfg.maxTimestep;
  updatePhysicsSettings(settings);

  const state = host.getState?.();
  if (state) state.paused = false;
  host.setFixedStep?.(1 / 60);

  const startClock = getSimulationTime();
  const startedAt = performance.now();
  const samples = [];
  const baselineBodies = selectableBodies().length;

  /** One sample of the world as it stands. */
  const take = () => {
    const bodies = (current.objects || []).map(bodyById).filter(Boolean);
    const primary = current.primary !== null ? bodyById(current.primary) : null;
    samples.push(
      sampleFrame({
        t: getSimulationTime(),
        bodies,
        primary,
        conserved: conservedQuantities(),
        drift: conservationDrift(),
        secondsPerUnit: timeUnitSeconds(),
        metrics: current.metrics,
      })
    );
  };

  // What to sample and when to stop is a policy, and it is in
  // js/experiments/phaseSampler.js so it can be tested against a scripted
  // clock. All this loop does is read the clock and do as it is told.
  const sampler = createPhaseSampler({
    frames: cfg.frames,
    maxSamples: MAX_SAMPLES,
  });
  sampler.start(startClock);
  take();

  await new Promise(resolve => {
    const tick = () => {
      const step = sampler.tick(getSimulationTime(), cfg.abort.cancelled);
      if (step.sample) take();
      if (step.done) return resolve();
      cfg.onProgress?.({
        phase: cfg.phaseIndex,
        fraction: sampler.report().fraction,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const run = sampler.report();

  host.setFixedStep?.(0);
  if (state) state.paused = true;

  const drift = conservationDrift();
  const secondsPerDay = 86400 / timeUnitSeconds();
  return {
    step: cfg.step,
    substeps: cfg.substeps,
    duration: getSimulationTime() - startClock,
    /** What was asked for, beside what was achieved. */
    requestedFrames: cfg.frames,
    advancedFrames: run.advancedFrames,
    ticks: run.ticks,
    /** rAF ticks that moved no simulated time: a paused or throttled tab. */
    stalledFrames: run.stalledFrames,
    /** True when the sample cap ended the run before the duration did. */
    sampleCapHit: run.sampleCapHit,
    /**
     * True when the clock stopped advancing and the tick ceiling ended it.
     *
     * Kept apart from sampleCapHit because they used to be the same thing: a
     * stalled run sampled every tick, filled the buffer with repeats of one
     * instant, and was reported as having measured too much rather than as
     * having measured nothing.
     */
    stalledOut: run.stalledOut,
    /** complete | sampleCapped | stalled | cancelled. */
    outcome: run.outcome,
    /** Whether the phase covered the simulated time it was asked for. */
    complete: run.complete,
    samples,
    results: reduceRun(samples, current.metrics, secondsPerDay),
    wallMs: performance.now() - startedAt,
    energyDrift: drift.energyDrift,
    angularDrift: drift.angularDrift,
    caveats: drift.caveats || [],
    integrator: drift.integrator,
    bodyCount: selectableBodies().length,
    baselineBodyCount: baselineBodies,
    // Which world this was measured in. The engine bumps its generation on
    // every rebuild, so a result carrying an old one is a result about a scene
    // that is no longer on the canvas - which is the commonest way a sweep
    // quietly becomes a lie: the reader changes something, the numbers stay on
    // screen, and nothing says they are about the previous arrangement.
    worldGeneration: getWorldGeneration(),
    perturbed: Boolean(current.perturbation),
  };
}

/**
 * Repeat the captured experiment at the step and at half of it.
 *
 * @param {object} [opts] - duration, tolerance, onProgress
 * @returns {Promise<object>} The report, or a refusal with a reason
 */
export async function runReliabilityCheck(opts = {}) {
  if (!current?.initialState) return { ok: false, reason: 'noExperiment' };
  const busy = liveWorldBusy();
  if (busy) {
    return { ok: false, reason: busy === 'checking' ? 'alreadyRunning' : busy };
  }
  if (!current.metrics?.length) return { ok: false, reason: 'noMetrics' };

  const settings = host.getSettings();
  const dtSim = host.frameAdvance(1 / 60, settings.sim_speed);
  const live = host.substepPlan(dtSim, settings.max_timestep);
  const plan = stepPlan({
    dtSim,
    substeps: live.substeps,
    step: live.step,
    maxSubsteps: host.maxSubsteps,
  });
  if (!plan.ok) {
    return { ok: false, reason: plan.reason, substeps: plan.substeps };
  }

  // Match the run the student already recorded, so the check is of the thing
  // they measured rather than of some other stretch of the same scenario.
  const recorded = current.runs?.A?.samples;
  const duration =
    opts.duration ??
    (recorded?.length > 1
      ? recorded[recorded.length - 1].t - recorded[0].t
      : RELIABILITY_DEFAULT_DURATION);
  // Whole frames, and the same number for both phases.
  const frames = Math.max(2, Math.ceil(duration / dtSim));

  const abort = { cancelled: false };
  reliabilityAbort = abort;

  // Everything the check is about to change, so it can be handed back. The
  // world is restored from the captured payload; these are the dials.
  // The world as it is RIGHT NOW, not the experiment's captured start.
  //
  // The finally below restored the capture, so a student who captured a state,
  // let the world run on and then ran a check was thrown back to the capture
  // point rather than to where they had been - the check quietly rewound their
  // simulation. Saved with forExperiment so the clock and the open tools come
  // back too, and restored on every exit including cancellation and a throw.
  const savedWorld = host.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });
  const savedSettings = { ...settings };
  const savedPaused = host.getState?.()?.paused ?? false;
  const startedAt = performance.now();

  try {
    const coarse = await runReliabilityPhase({
      ...plan.coarse,
      frames,
      abort,
      onProgress: opts.onProgress,
      phaseIndex: 0,
    });
    if (abort.cancelled) return { ok: false, reason: 'cancelled' };

    const fine = await runReliabilityPhase({
      ...plan.fine,
      frames,
      abort,
      onProgress: opts.onProgress,
      phaseIndex: 1,
    });
    if (abort.cancelled) return { ok: false, reason: 'cancelled' };

    const report = buildReliabilityReport({
      coarse,
      fine,
      tolerance: opts.tolerance,
      wallMs: performance.now() - startedAt,
    });
    current.reliability = report;
    return report;
  } finally {
    reliabilityAbort = null;
    // Back to the world the student was looking at, whatever happened above -
    // which is the state saved before the phases, not the experiment's
    // captured start.
    host.applyShareState(JSON.parse(JSON.stringify(savedWorld)));
    Object.assign(host.getSettings(), savedSettings);
    updatePhysicsSettings(host.getSettings());
    host.setFixedStep?.(0);
    const state = host.getState?.();
    if (state) state.paused = savedPaused;
    refreshDiff();
  }
}

/**
 * Judge two completed phases.
 *
 * Split out from the runner so it can be tested without a browser.
 *
 * @param {object} input - coarse, fine, tolerance, wallMs
 * @returns {object} The student-facing report
 */
export function buildReliabilityReport(input) {
  const { coarse, fine } = input;
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE;
  const ids = current?.metrics || [];

  // Every tracked quantity, judged separately. A single verdict for a run is
  // not what a reader needs: some conclusions survive refinement and others do
  // not, and which is which is the useful output.
  const perMetric = ids.map(id => {
    const a = coarse.results?.[id]?.value ?? null;
    const b = fine.results?.[id]?.value ?? null;
    const change = relativeChange(a, b);
    return {
      metric: id,
      unit: metricUnit(id),
      coarse: a,
      fine: b,
      change,
      agrees: change === null ? null : change <= tolerance,
      kind: coarse.results?.[id]?.kind ?? null,
    };
  });

  // A path to compare early against late, which is what separates a chaotic
  // pair from a badly resolved one. The first tracked quantity that varies
  // sample by sample; the reductions above cannot show when two runs parted.
  const pathId = ids.find(id => !SCALAR_METRICS.has(id));
  let aligned = null;
  if (pathId) {
    const sa = series(coarse.samples, pathId);
    const sb = series(fine.samples, pathId);
    aligned = alignSeries(
      sa.map(p => ({ t: p.t, v: p.v })),
      sb.map(p => ({ t: p.t, v: p.v }))
    ).rows.map(r => ({ t: r.t, a: r.a, b: r.b }));
  }

  // The outcome the verdict is computed from: the first tracked quantity that
  // is not itself a conservation diagnostic. Judging convergence by the energy
  // drift would be exactly the inference this whole module refuses to make.
  const outcomeId =
    ids.find(
      id =>
        id !== METRICS.ENERGY_DRIFT &&
        id !== METRICS.ANGULAR_DRIFT &&
        id !== METRICS.TOTAL_ENERGY &&
        id !== METRICS.ANGULAR_MOMENTUM
    ) ?? null;

  const core = reliabilityReport({
    coarse,
    fine,
    aligned,
    outcomeCoarse: outcomeId
      ? (coarse.results?.[outcomeId]?.value ?? null)
      : null,
    outcomeFine: outcomeId ? (fine.results?.[outcomeId]?.value ?? null) : null,
    tolerance,
  });

  return {
    ok: true,
    ...core,
    outcomeMetric: outcomeId,
    pathMetric: pathId ?? null,
    metrics: perMetric,
    cost: {
      wallMs: input.wallMs ?? null,
      coarseMs: coarse.wallMs ?? null,
      fineMs: fine.wallMs ?? null,
      coarseSamples: coarse.samples.length,
      fineSamples: fine.samples.length,
      substeps: { coarse: coarse.substeps, fine: fine.substeps },
    },
    integrator: fine.integrator ?? coarse.integrator ?? null,
    explanation: explain(core),
    ranAt: new Date().toISOString(),
  };
}

// =============================================================================
// The parameter sweep
// -----------------------------------------------------------------------------
// One variable, several values, everything else held still. Each trial rebuilds
// the world from the scenario at a new value of the parameter and runs it for
// the same simulated duration, so what varies between trials is the parameter
// and the parameter alone: same seed, same integrator, same substep cap, same
// number of frames.
//
// Rebuilding rather than restoring, and that is the difference from every other
// run in this file. A captured state is a world that already exists; a sweep
// needs a world that would have existed had the parameter been different, and
// only the scenario builder can make one. js/scenarios.js carries the
// laboratory variables across a rebuild of the same scenario for exactly this
// reason - see LAB_VARIABLES there and the allowlist in ./sweep.js, which is
// that list plus the range in which each value still means something.
//
// Bodies are resolved by role after each build. Ids are not stable across a
// rebuild, and reusing the captured selection would measure whatever body
// happened to inherit the number.
//
// No second engine: the same physics.js, the same stepping from ./timestep.js
// through the host, the same sampleFrame and reduceRun as a recorded run.
// =============================================================================

/** Set while a sweep runs, so it can be asked to stop. */
let sweepAbort = null;

/** @returns {boolean} Whether a sweep is running */
export const isSweeping = () => sweepAbort !== null;

/** Ask a running sweep to stop after the trial in progress. @returns {void} */
export function cancelSweep() {
  if (sweepAbort) sweepAbort.cancelled = true;
}

/**
 * Find the bodies a scenario's measurements are about, in the world as built.
 *
 * @param {object} roles - From SWEEPABLE in ./sweep.js
 * @returns {{bodies: Array<object>, primary: ?object, ok: boolean}} What was found
 */
function resolveRoles(roles) {
  const all = selectableBodies();
  const pick = spec => {
    // 'planet' means the scenario's massive planet. In the assist labs the
    // spacecraft is also a Planet object, so it has to be excluded by name
    // before falling through to the gas giant.
    if (spec === 'planet') {
      return (
        planets.find(b => b.name !== 'Spacecraft') || gas_giants[0] || null
      );
    }
    return all.find(b => b.name === spec) || null;
  };
  const bodies = (roles.bodies || []).map(pick);
  const primary = roles.primary ? pick(roles.primary) : null;
  return {
    bodies: bodies.filter(Boolean),
    primary,
    ok: bodies.every(Boolean) && (!roles.primary || Boolean(primary)),
  };
}

/**
 * Run one value of the parameter.
 *
 * @param {object} cfg - value, spec, roles, frames, abort, onProgress, index
 * @returns {Promise<object>} The trial
 */
async function runSweepTrial(cfg) {
  const { spec, value } = cfg;
  const settings = host.getSettings();
  const startedAt = performance.now();

  const trial = {
    index: cfg.index,
    value,
    status: SWEEP.TRIAL_STATUS.OK,
    results: {},
    samples: 0,
    wallMs: 0,
    // Recorded per trial rather than once for the sweep: if a rebuild were
    // ever to change one of them, the file would show it rather than imply
    // that every trial ran under the header's numbers.
    numerics: null,
  };

  // Build the world at this value. applyPreset carries the parameter because
  // it is a LAB_VARIABLE of this scenario and the scenario is not changing.
  try {
    settings[spec.parameter] = value;
    host.initializeSimulation({ seed: spec.seed });
  } catch (err) {
    console.warn('Sweep trial failed to build:', err);
    trial.status = SWEEP.TRIAL_STATUS.BUILD_FAILED;
    trial.error = String(err?.message || err);
    return trial;
  }

  // The value has to have survived the rebuild. If a scenario ever stops
  // carrying it, every trial would silently run the same world and the sweep
  // would report a flat line - which is a believable result and a false one.
  const applied = settings[spec.parameter];
  if (!Number.isFinite(applied) || Math.abs(applied - value) > 1e-9) {
    trial.status = SWEEP.TRIAL_STATUS.BUILD_FAILED;
    trial.error = `parameter did not survive the rebuild: asked ${value}, got ${applied}`;
    return trial;
  }

  const found = resolveRoles(spec.roles);
  if (!found.ok) {
    trial.status = SWEEP.TRIAL_STATUS.BODIES_MISSING;
    return trial;
  }

  const dtSim = host.frameAdvance(1 / 60, settings.sim_speed);
  const stepping = host.substepPlan(dtSim, settings.max_timestep);
  trial.numerics = {
    integrator: settings.integrator,
    simSpeed: settings.sim_speed,
    maxTimestep: settings.max_timestep,
    step: stepping.step,
    substeps: stepping.substeps,
    frameAdvance: dtSim,
  };

  const state = host.getState?.();
  if (state) state.paused = false;
  // A fixed step, so the trial is the same calculation on a fast machine and a
  // slow one. Without it the number of integration steps in a trial depends on
  // how long frames happened to take, and the sweep would be measuring the
  // browser.
  host.setFixedStep?.(1 / 60);

  // An optional observer, for a sweep whose result is not a reduced metric.
  //
  // The binary lesson's sweep is the case this exists for: what it wants from
  // each trial is the physical outcome the binary watcher reports - survived,
  // ejected, collided - and a mean distance is no substitute for it. Rather
  // than a second runner, the caller supplies three functions and everything
  // else here is unchanged: the world is built the same way, progress is
  // measured on the same clock, and the same restoration puts it all back.
  cfg.observer?.arm?.({ value, settings, roles: found });

  const samples = [];
  const secondsPerDay = 86400 / timeUnitSeconds();
  const startClock = getSimulationTime();
  const take = () =>
    samples.push(
      sampleFrame({
        t: getSimulationTime(),
        bodies: found.bodies,
        primary: found.primary,
        conserved: conservedQuantities(),
        drift: conservationDrift(),
        secondsPerUnit: timeUnitSeconds(),
        metrics: spec.metrics,
      })
    );

  // The starting state, before anything has moved. Taken here rather than on
  // the first animation frame because the render loop advances the world on
  // its own frames: by the time a sampler scheduled with requestAnimationFrame
  // first runs, one frame has already been integrated and the initial
  // condition is gone. On a scenario whose frame covers 62.5 time units that
  // is not a rounding - it was the whole first sixtieth of a short trial.
  //
  // An observed trial samples nothing: its result is what the observer reports,
  // the metrics are not read, and a long window would otherwise fill the sample
  // buffer and stop the trial at the cap with its own answer half-collected.
  const sampling = !cfg.observer;
  if (sampling) take();

  // Progress is measured in SIMULATED time, not in animation frames.
  //
  // Counting every requestAnimationFrame callback measured the browser: a
  // paused world, a backgrounded tab or a frame the engine skipped all
  // advanced the count, so a trial could finish having integrated nothing and
  // report the duration it was asked for. The clock decides now, and a run
  // that stops advancing is stalled rather than complete.
  //
  // Two ceilings, because a clock that has stopped is not going to start
  // again on its own and waiting out a long trial to discover that helps
  // nobody: a run of consecutive non-advancing callbacks ends the trial
  // quickly, and an overall tick ceiling catches the slow-but-not-stopped case.
  let advanced = 0;
  let ticks = 0;
  let stalled = 0;
  let sinceAdvance = 0;
  let capped = false;
  /** Whether the observer said the trial had finished on its own terms. */
  let observed = false;
  let lastClock = startClock;
  const tickCeiling = cfg.frames * 10 + 120;
  const stallLimit = 120;
  await new Promise(resolve => {
    const tick = () => {
      if (cfg.abort.cancelled) return resolve();
      ticks++;
      const clock = getSimulationTime();
      if (clock > lastClock) {
        lastClock = clock;
        advanced++;
        sinceAdvance = 0;
        if (sampling) take();
      } else {
        stalled++;
        sinceAdvance++;
      }
      if (sampling && samples.length >= MAX_SAMPLES) {
        capped = true;
        return resolve();
      }
      // The observer's own finish line. A binary run ends when the watcher has
      // counted the periods it was asked for, which is not the same instant as
      // the frame budget expiring - and reaching it IS completion, not a
      // shortfall.
      if (cfg.observer?.done?.()) {
        observed = true;
        return resolve();
      }
      if (
        advanced >= cfg.frames ||
        ticks >= tickCeiling ||
        sinceAdvance >= stallLimit
      ) {
        return resolve();
      }
      cfg.onProgress?.({
        trial: cfg.index,
        total: cfg.total,
        fraction: advanced / cfg.frames,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  host.setFixedStep?.(0);
  if (state) state.paused = true;

  trial.wallMs = performance.now() - startedAt;
  trial.samples = samples.length;
  trial.duration = getSimulationTime() - startClock;

  // What was asked for beside what was achieved, in the same units, on every
  // trial. A reader comparing two trials of "the same" duration has to be able
  // to see that one of them stopped early.
  trial.requestedFrames = cfg.frames;
  trial.advancedFrames = advanced;
  trial.ticks = ticks;
  trial.stalledTicks = stalled;
  trial.sampleCapHit = capped;
  trial.requestedDuration = cfg.requestedDuration ?? null;
  // With an observer, "complete" is its verdict: the frame budget is a
  // backstop for a run that never reaches its own finish line, not the
  // definition of one.
  trial.complete = cfg.observer
    ? observed && !capped
    : !capped && advanced >= cfg.frames;
  if (cfg.observer) trial.observed = cfg.observer.read?.() ?? null;

  if (cfg.abort.cancelled) {
    trial.status = SWEEP.TRIAL_STATUS.CANCELLED;
    return trial;
  }

  // A body that died mid-trial makes every later sample a measurement of a
  // different system. Reported as its own outcome rather than as a number,
  // because a collision IS the result at that value and averaging through it
  // would hide the most interesting trial in the sweep.
  if (
    found.bodies.some(b => b.alive === false) ||
    !resolveRoles(spec.roles).ok
  ) {
    trial.status = SWEEP.TRIAL_STATUS.LOST_BODY;
    return trial;
  }

  const reduced = reduceRun(samples, spec.metrics, secondsPerDay);
  for (const id of spec.metrics) trial.results[id] = reduced[id]?.value ?? null;
  trial.kinds = Object.fromEntries(
    spec.metrics.map(id => [id, reduced[id]?.kind ?? null])
  );

  if (
    !cfg.observer &&
    !spec.metrics.some(id => Number.isFinite(trial.results[id]))
  ) {
    trial.status = SWEEP.TRIAL_STATUS.NOT_FINITE;
    return trial;
  }

  // It ran and it measured something, but it did not cover what it was asked
  // to. Said rather than rounded up to success: the numbers are kept, and the
  // summary leaves them out of a curve that claims a duration they do not
  // have.
  if (capped) trial.status = SWEEP.TRIAL_STATUS.CAPPED;
  else if (!cfg.observer && advanced < cfg.frames) {
    trial.status = SWEEP.TRIAL_STATUS.STALLED;
  } else if (cfg.observer && !observed) {
    // It ran out of budget before the watcher finished: an incomplete
    // observation, which the binary lesson reports as its own outcome rather
    // than as a survival.
    trial.status = SWEEP.TRIAL_STATUS.STALLED;
  }
  return trial;
}

/**
 * Sweep one parameter across a row of values.
 *
 * @param {object} spec - scenario, parameter, from, to, count, duration,
 *   metrics, seed
 * @param {object} [opts] - `onProgress`, `onTrial`
 * @returns {Promise<object>} The completed sweep, or a refusal
 */
export async function runSweep(spec, opts = {}) {
  // The bench is normally initialised by its bridge before anything can reach
  // this, but a direct import can get here first and a TypeError is a worse
  // answer than a refusal.
  if (!host) return { ok: false, reason: 'notReady' };
  const busy = liveWorldBusy();
  if (busy) {
    return { ok: false, reason: busy === 'sweeping' ? 'alreadyRunning' : busy };
  }

  const check = SWEEP.validateSweepSpec(spec);
  if (!check.ok) {
    return { ok: false, reason: check.reason, detail: check.detail };
  }

  const entry = SWEEP.SWEEPABLE[spec.scenario];
  const values = SWEEP.planValues(spec);
  const seed = spec.seed || 'sweep';
  const abort = { cancelled: false };
  sweepAbort = abort;

  // Everything the sweep is about to destroy. Each trial rebuilds the world,
  // so unlike the other runs here there is no captured start to return to -
  // the live world has to be photographed before the first build and put back
  // after the last, whether the sweep finished or was stopped.
  const settings = host.getSettings();
  const savedSettings = { ...settings };
  const savedWorld = host.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });
  const savedPaused = host.getState?.()?.paused ?? false;
  const startedAt = performance.now();

  const trials = [];
  try {
    // One build before the first trial, so that applyPreset has seen this
    // scenario. It carries the laboratory variables only when re-entering the
    // same scenario, so without this the first trial's value would be reset to
    // the scenario's own and the sweep would open with a duplicate point.
    settings.preset_scenario = spec.scenario;
    host.initializeSimulation({ seed });

    // Advances, not samples: there is one sample before the first advance and
    // one after each, so `frames` advances span frames * dtSim.
    //
    // Rounded rather than ceiled, and reported afterwards rather than assumed.
    // A frame is 62.5 time units in the binary labs, so the achievable
    // durations are multiples of that and a request for 40 cannot be honoured
    // - it becomes 62.5. Silently running longer than asked and labelling the
    // result with the request would misdescribe every short trial, so the
    // sweep carries both numbers and the panel shows the one that happened.
    const dtSim = host.frameAdvance(1 / 60, settings.sim_speed);
    const frames = Math.max(1, Math.round(spec.duration / dtSim));
    const achievedDuration = frames * dtSim;

    for (let i = 0; i < values.length; i++) {
      if (abort.cancelled) {
        // The values that never ran are in the results as cancelled, not
        // missing: a table that stopped at nine of twenty should say so.
        trials.push({
          index: i,
          value: values[i],
          status: SWEEP.TRIAL_STATUS.CANCELLED,
          results: {},
        });
        continue;
      }
      const trial = await runSweepTrial({
        spec: { ...spec, roles: entry.roles, seed },
        value: values[i],
        index: i,
        total: values.length,
        frames,
        requestedDuration: achievedDuration,
        observer: opts.observer ?? null,
        abort,
        onProgress: opts.onProgress,
      });
      trials.push(trial);
      opts.onTrial?.(trial);
    }

    const summaries = spec.metrics
      .map(id => SWEEP.summarise(trials, id))
      .filter(Boolean);

    const result = {
      ok: true,
      scenario: spec.scenario,
      parameter: spec.parameter,
      values,
      duration: achievedDuration,
      requestedDuration: spec.duration,
      frameAdvance: dtSim,
      framesPerTrial: frames,
      metrics: [...spec.metrics],
      seed,
      trials,
      summaries,
      counts: SWEEP.tally(trials),
      cancelled: abort.cancelled,
      wallMs: performance.now() - startedAt,
      numerics: trials.find(tr => tr.numerics)?.numerics ?? null,
      ranAt: new Date().toISOString(),
    };
    lastSweep = result;
    return result;
  } finally {
    sweepAbort = null;
    // The world the reader was looking at, whatever happened above.
    host.applyShareState(JSON.parse(JSON.stringify(savedWorld)));
    Object.assign(host.getSettings(), savedSettings);
    updatePhysicsSettings(host.getSettings());
    host.setFixedStep?.(0);
    resetConservationBaseline();
    const state = host.getState?.();
    if (state) state.paused = savedPaused;
  }
}

/** The most recent completed sweep, for the panel and the export. */
let lastSweep = null;

/** @returns {?object} The last sweep run in this session */
export const latestSweep = () => lastSweep;

/**
 * Put the world back to the experiment's captured start.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.keepSettings] - Leave the live settings alone and
 *   restore only the world. Used by the implicit restore at the start of a
 *   run, where the settings are the thing being varied.
 * @returns {{ok:boolean, hash:string, matches:boolean}} What was restored
 */
export function restoreInitialState({ keepSettings = false } = {}) {
  if (!current?.initialState) return { ok: false, hash: '', matches: false };

  // A deep copy, not the stored payload itself.
  //
  // Restoring assigns each packed body's `pos` and `vel` straight onto the
  // rebuilt object - `set_state` does `this.pos = s.pos` - so the live body
  // and the payload end up sharing one vector. The integrator then mutates it
  // in place, and the experiment's captured start quietly follows the
  // simulation around: restore twice and the second restore returns to
  // wherever the first run finished. Harmless for a share link, which is
  // discarded the moment it is applied; fatal here, where the payload is the
  // experiment's definition of "the start".
  // The settings a student has changed since the capture are the independent
  // variable, and the captured payload carries the settings as they were. So
  // an implicit restore puts the *world* back and hands the settings straight
  // back afterwards; without this, changing gravity and pressing Record would
  // silently revert the change and the bench would then report - correctly and
  // uselessly - that nothing differed between the runs.
  const keep = keepSettings ? { ...host.getSettings() } : null;
  host.applyShareState(JSON.parse(JSON.stringify(current.initialState)));
  if (keep) {
    Object.assign(host.getSettings(), keep);
    updatePhysicsSettings(host.getSettings());
  }
  // Hold there. Without this the world resumes the instant it is restored, so
  // by the time the student has changed a setting and reached for Record the
  // simulation has already run several frames past the start - and Run B
  // begins somewhere Run A never was. Pausing is also what a person means by
  // "return to the start": the state is the thing being returned to, not a
  // moment it passed through.
  const state = host.getState?.();
  if (state) state.paused = true;
  // The conservation baseline is what drift is measured against, and it is
  // stamped with the clock. Restoring a world without resetting it would have
  // Run B's drift measured from Run A's starting energy.
  resetConservationBaseline();
  const after = host.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });
  const hash = hashState(after);
  return {
    ok: true,
    hash,
    matches: hash === current.provenance.initialStateHash,
  };
}

// --- Recording -------------------------------------------------------------------

/**
 * Take one sample, if the clock has moved far enough since the last.
 *
 * Driven by requestAnimationFrame rather than by a hook in the render loop:
 * the bench is an optional panel and the render loop is the hottest code in
 * the application, so the coupling goes this way round. Sampling on the
 * simulated clock rather than on frames is what makes a run recorded on a
 * throttled laptop comparable with one recorded on a fast desktop.
 */
function takeSample() {
  const clock = getSimulationTime();
  if (clock - lastSampleAt < SAMPLE_INTERVAL_HINT) return;
  if (buffer.length >= MAX_SAMPLES) return;
  lastSampleAt = clock;

  const bodies = (current.objects || []).map(bodyById).filter(Boolean);
  const primary = current.primary !== null ? bodyById(current.primary) : null;
  const needsConserved = current.metrics.some(
    m =>
      m === METRICS.TOTAL_ENERGY ||
      m === METRICS.ANGULAR_MOMENTUM ||
      m === METRICS.ENERGY_DRIFT ||
      m === METRICS.ANGULAR_DRIFT
  );

  const sample = sampleFrame({
    t: clock,
    bodies,
    primary,
    conserved: needsConserved ? conservedQuantities() : null,
    drift: needsConserved ? conservationDrift() : null,
    secondsPerUnit: timeUnitSeconds(),
    metrics: current.metrics,
  });

  // Every body's position and velocity, when the experiment says it needs them.
  // The chaos lesson measures the separation between two whole configurations
  // rather than between two selected bodies, and it matches them by identity,
  // so it needs the ids too. Off by default: this is four numbers per body per
  // sample, which for a long run of a crowded scenario is the difference
  // between a stored experiment and a quota failure.
  if (current.recordBodies) {
    sample.__bodies = selectableBodies().map(b => ({
      id: b.id,
      x: b.pos.x,
      y: b.pos.y,
      vx: b.vel.x,
      vy: b.vel.y,
    }));
  }

  buffer.push(sample);
}

function loop() {
  if (phase !== 'recording') return;
  try {
    takeSample();
  } catch (err) {
    console.warn('Experiment sampling failed:', err);
  }
  sampler = requestAnimationFrame(loop);
}

/**
 * Begin recording a run.
 * @param {'A'|'B'} label - Which run
 * @returns {boolean} Whether recording started
 */
export function startRun(label) {
  // Refuses while a sweep or a reliability check has the world, for the reason
  // in liveWorldBusy(): both of those restore and re-step it underneath, and a
  // recording taken across that is a recording of two different worlds.
  if (!current || liveWorldBusy()) return false;

  // Both runs start from the captured state, not just Run B.
  //
  // Without this, a student who captures a start, spends twenty seconds
  // choosing bodies and then presses Record gets a Run A that begins wherever
  // the simulation had wandered to, while Run B - which follows an explicit
  // restore - begins at the capture. The two runs are then offset on the
  // shared time axis by however long the student took to click, and if that
  // offset exceeds the length of the runs they do not overlap at all and
  // nothing can be compared. Restoring here makes the two arms symmetric,
  // which is the premise of the whole feature.
  const clockNow = getSimulationTime();
  const captured = readExtras(current.initialState).clock;
  if (Math.abs(clockNow - captured) > 1e-9) {
    restoreInitialState({ keepSettings: true });
  }

  // Recording implies running: the restore leaves the world paused on the
  // captured start, and a student who presses Record means "go".
  const state = host.getState?.();
  if (state) state.paused = false;

  // A fixed step per frame for the duration of the recording. Without it the
  // two runs take different sequences of timesteps - because frames take
  // different amounts of real time - and are therefore not the same
  // calculation. See setFixedStep() in js/render.js.
  host.setFixedStep?.(1 / 60);

  recordingLabel = label;
  buffer = [];
  lastSampleAt = -Infinity;
  phase = 'recording';
  sampler = requestAnimationFrame(loop);
  return true;
}

/**
 * Stop recording and reduce what was captured.
 * @returns {Object|null} The stored run
 */
export function stopRun() {
  if (phase !== 'recording') return null;
  phase = 'idle';
  host.setFixedStep?.(0);
  if (sampler) cancelAnimationFrame(sampler);
  sampler = 0;

  const secondsPerDay = 86400 / timeUnitSeconds();
  const run = {
    samples: buffer,
    recordedAt: Date.now(),
    results: reduceRun(buffer, current.metrics, secondsPerDay),
    sampling: samplingStats(buffer),
    // The setup this run actually ran under, so the A/B difference is computed
    // from what happened rather than from what the panel currently shows.
    setup: host.captureShareState({
      kind: 'seeded',
      includeCamera: false,
      forExperiment: true,
    }),
  };
  current.runs[recordingLabel] = run;
  recordingLabel = null;
  buffer = [];
  refreshDiff();
  return run;
}

/** @returns {boolean} Whether a run is being recorded */
export const isRecording = () => phase === 'recording';

/** @returns {number} Samples taken so far in the run in progress */
export const sampleCount = () => buffer.length;

/**
 * Simulated seconds covered by the run in progress.
 *
 * Shown beside the sample count while recording, because the two are not
 * interchangeable: a scenario that substeps advances the clock several times
 * inside one animation frame, so twenty samples can be twenty simulated
 * seconds or two. The student comparing two runs needs the seconds, since
 * that is the axis the comparison is drawn on.
 *
 * @returns {number} Simulated seconds
 */
export const recordingSpan = () =>
  buffer.length < 2 ? 0 : buffer[buffer.length - 1].t - buffer[0].t;

/**
 * Recompute the parameter difference between the two runs' setups.
 * @returns {Object} The diff
 */
export function refreshDiff() {
  if (!current) return null;
  const a = current.runs?.A?.setup;
  const b = current.runs?.B?.setup;
  current.diff =
    a && b
      ? parameterDiff(a, b, scenarioBaseline())
      : { variables: [], incidental: [], context: [], multivariable: false };
  return current.diff;
}

/**
 * Compare the two runs.
 * @returns {Object|null} Table rows, aligned series and warnings
 */
export function compare() {
  if (!current?.runs?.A || !current?.runs?.B) return null;
  const metrics = current.metrics || [];
  const rows = compareRuns(
    current.runs.A.results,
    current.runs.B.results,
    metrics
  );

  const aligned = {};
  for (const m of metrics) {
    if (SCALAR_METRICS.has(m)) continue;
    aligned[m] = alignSeries(
      series(current.runs.A.samples, m),
      series(current.runs.B.samples, m)
    );
  }

  const diff = refreshDiff();
  const comparison = {
    rows,
    aligned,
    diff,
    warnings: warningsFor(current, aligned),
  };
  current.comparison = {
    rows,
    diff,
    warnings: comparison.warnings,
  };
  return comparison;
}

/**
 * Everything the student should be told before reading the numbers.
 * @param {Object} exp - The experiment
 * @param {Object} aligned - Aligned series by metric
 * @returns {Array<{level:string, message:string}>} Warnings
 */
export function warningsFor(exp, aligned) {
  const out = [];
  const diff = exp.diff || { variables: [] };

  if (!diff.variables.length) {
    out.push({ level: 'warn', message: t('bench.warn.noChange') });
  } else if (diff.multivariable && !exp.multivariableConfirmed) {
    out.push({
      level: 'warn',
      message: t('bench.warn.multivariable', {
        n: diff.variables.length,
        list: describeDiff(diff.variables),
      }),
    });
  }

  const hashA = exp.runs?.A?.setup ? hashState(exp.runs.A.setup) : null;
  const hashB = exp.runs?.B?.setup ? hashState(exp.runs.B.setup) : null;
  if (hashA && hashB && hashA === hashB && diff.variables.length === 0) {
    out.push({ level: 'info', message: t('bench.warn.identical') });
  }

  for (const [metric, a] of Object.entries(aligned || {})) {
    if (a.window.empty) {
      out.push({
        level: 'warn',
        message: t('bench.warn.noOverlap', { metric: metricLabel(metric) }),
      });
      break;
    }
  }

  const sa = exp.runs?.A?.sampling;
  const sb = exp.runs?.B?.sampling;
  for (const [label, s] of [
    ['A', sa],
    ['B', sb],
  ]) {
    if (s && s.ratio > 5) {
      out.push({
        level: 'info',
        message: t('bench.warn.uneven', {
          run: label,
          ratio: s.ratio.toFixed(1),
        }),
      });
    }
  }
  return out;
}

/** @param {string} id - Metric id @returns {string} Localized label */
export function metricLabel(id) {
  return t(`bench.metric.${id}`);
}

/** @param {string} id - Metric id @returns {string} Unit string */
export const metricUnit = id => METRIC_UNITS[id] || '';

/**
 * Whether the current selection can answer every chosen metric.
 * @returns {Array<string>} Metric ids that need more bodies selected
 */
export function unsatisfiedMetrics() {
  const n = (current?.objects || []).length;
  return (current?.metrics || []).filter(m => (METRIC_ARITY[m] || 0) > n);
}

// --- Persistence and export --------------------------------------------------------

/**
 * Save the working experiment, translating a failure into something actionable.
 * @returns {{ok:boolean, message:string}} Outcome
 */
export function persist() {
  if (!current) return { ok: false, message: '' };
  const result = saveExperiment(current);
  if (result.ok) return { ok: true, message: t('bench.saved') };

  const kb = n => Math.round(n / 1024);
  const message =
    {
      [FAILURE.TOO_LARGE]: t('bench.error.tooLarge', {
        size: kb(result.bytes),
        limit: kb(result.limit),
      }),
      [FAILURE.TOTAL_EXCEEDED]: t('bench.error.storeFull', {
        limit: kb(result.limit),
      }),
      [FAILURE.TOO_MANY]: t('bench.error.tooMany', { limit: result.limit }),
      [FAILURE.QUOTA]: t('bench.error.quota'),
      [FAILURE.UNAVAILABLE]: t('bench.error.unavailable'),
    }[result.reason] || t('bench.error.quota');
  return { ok: false, message };
}

/** @returns {Array<Object>} Saved experiments, newest first */
export const savedExperiments = () => listExperiments();

/** @returns {Object} How full the store is */
export const storage = () => storageReport();

/**
 * Open a saved experiment.
 * @param {string} id - Experiment id
 * @returns {{ok:boolean, message:string}} Outcome
 */
export function open(id) {
  const { ok, record, reason } = loadExperiment(id);
  if (!ok) return { ok: false, message: t('bench.error.open', { reason }) };
  current = record;
  return { ok: true, message: '' };
}

/**
 * Copy the working experiment under a new name.
 * @param {string} name - Name for the copy
 * @returns {Object} The copy
 */
export function duplicate(name) {
  current = duplicateRecord(current, name);
  return current;
}

/**
 * Delete a saved experiment.
 * @param {string} id - Experiment id
 * @returns {boolean} Whether it was removed
 */
export function remove(id) {
  if (current?.id === id) current = null;
  return deleteExperiment(id);
}

/** @param {string} name - New name */
export function rename(name) {
  if (current) current.name = name;
}

/**
 * The two export documents.
 * @param {string} appVersion - Build identifier for provenance
 * @returns {{csv:{name:string, text:string}, json:{name:string, text:string}}} Files
 */
export function exportFiles(appVersion) {
  const stem = exportBasename(current);
  return {
    csv: { name: `${stem}.csv`, text: experimentCsv(current).csv },
    json: {
      name: `${stem}.json`,
      text: experimentManifestJson(current, { appVersion }),
    },
    reliability: {
      name: `${stem}-reliability.json`,
      text: reliabilityJson(current, { appVersion }) ?? '',
    },
    sweep: {
      name: `${lastSweep ? `${lastSweep.scenario}-${lastSweep.parameter}` : stem}
        `
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .concat('-sweep.csv'),
      text: sweepCsv(lastSweep).csv,
    },
  };
}

/**
 * Reopen an experiment from an exported manifest.
 * @param {string} text - File contents
 * @returns {{ok:boolean, message:string}} Outcome
 */
export function importFrom(text) {
  const { ok, experiment, reason } = importManifest(text);
  if (!ok) return { ok: false, message: t('bench.error.import', { reason }) };
  current = { ...experiment, id: newId(), v: SCHEMA_VERSION };
  return { ok: true, message: t('bench.imported', { name: current.name }) };
}

/**
 * The block a share link carries for this experiment.
 * @returns {Object|null} The `xp` block
 */
export function linkBlock() {
  return experimentBlock(current);
}

/**
 * Adopt an experiment setup that arrived in a link.
 *
 * The world itself has already been rebuilt by applyShareState; this fills in
 * what was measured and what the A/B difference was, so the recipient sees the
 * experiment rather than just the scenario it started from.
 *
 * @param {Object} setup - From readExperimentBlock()
 * @param {Object} payload - The decoded share payload
 * @returns {Object} The adopted experiment
 */
export function adoptFromLink(setup, payload) {
  const settings = host.getSettings();
  const extras = readExtras(payload);
  current = {
    id: newId(),
    v: SCHEMA_VERSION,
    name: setup.name || t('bench.untitled'),
    created: Date.now(),
    updated: Date.now(),
    initialState: payload,
    objects: setup.objects || [],
    primary: setup.primary,
    metrics: setup.metrics?.length
      ? setup.metrics
      : [METRICS.SEPARATION, METRICS.TOTAL_ENERGY],
    runs: {},
    provenance: {
      scenario: payload.s,
      seed: payload.seed,
      integrator: settings.integrator,
      timestep: settings.max_timestep || null,
      simSpeed: settings.sim_speed,
      units: { length: 'AU', speed: 'km/s', time: 'days' },
      initialStateHash: hashState(payload),
      referenceFrame: extras.frame,
      observer: extras.observer,
    },
    diff: {
      variables: setup.variables || [],
      incidental: [],
      context: [],
      multivariable: (setup.variables || []).length > 1,
    },
    multivariableConfirmed: Boolean(setup.multivariable),
    fromLink: true,
  };
  return current;
}

/** Tell the student something went well or badly. @param {string} message - Text */
export function say(message) {
  if (message) toast(message);
}
