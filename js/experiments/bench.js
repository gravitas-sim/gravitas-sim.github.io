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
} from '../physics.js';
import { pristineSettingsFor } from '../shareState.js';
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
} from './exports.js';
import { experimentBlock } from './shareExperiment.js';

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
 */
export function initBench(api) {
  host = api;
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
  };
  return current;
}

/** @returns {Object|null} The experiment being worked on */
export const activeExperiment = () => current;

/** @param {Object|null} exp - Replace the working experiment */
export function setActiveExperiment(exp) {
  current = exp;
}

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

  buffer.push(
    sampleFrame({
      t: clock,
      bodies,
      primary,
      conserved: needsConserved ? conservedQuantities() : null,
      drift: needsConserved ? conservationDrift() : null,
      secondsPerUnit: timeUnitSeconds(),
      metrics: current.metrics,
    })
  );
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
  if (!current || phase === 'recording') return false;

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
