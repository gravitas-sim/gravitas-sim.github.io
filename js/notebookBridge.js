// =============================================================================
// Loading the evidence notebook on demand
// -----------------------------------------------------------------------------
// The same shape as js/rvWorkspaceBridge.js and for the same reason: the panel,
// the PDF report and the capture helpers are only wanted by somebody who has
// taken a reading worth keeping, and most visitors never do.
//
// This module is the whole of what the start-up path sees. It is also where the
// live world is read: the capture helpers are pure and take provenance as data,
// so somebody has to stand at the boundary and ask the simulation what time it
// is. Doing that here rather than inside the helpers is what lets the helpers
// be tested against fixed inputs - and what makes it impossible for a stored
// entry to hold a reference to a body that is about to be rebuilt.
//
// What "at the moment of the click" means here
// -----------------------------------------------------------------------------
// A capture is atomic or it is a lie. The reader presses Keep at an instant,
// and the entry claims to describe that instant: this clock, this world
// generation, this observer geometry, this analysis. Everything on the path
// from the press to the snapshot therefore happens with no await in it -
// liveProvenance() is synchronous over statically imported modules, and the
// panel copies its own result with snapshot() before calling. Only after both
// are in hand does anything get fetched.
// =============================================================================

import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
// Statically imported, and that is the point of this module's existence.
//
// Everything the provenance is read from has to be readable WITHOUT an await,
// because the whole correctness argument below is that the reading happens in
// the same task as the click. A dynamic import cannot promise that: even a
// warm module cache resolves on a later microtask, and by then a running
// simulation has advanced. All eight of these are in the start-up graph
// already - the renderer, the controls and the inspector reach every one of
// them - so naming them here costs the initial download nothing.
import { getWorldGeneration, getInterventionEpoch } from './physics.js';
import { getSimClock } from './timeline.js';
import { qualityReport } from './quality.js';
import { frameMode, frameObjectId } from './referenceFrame.js';
import { observerGeometry } from './observerGeometry.js';
import { SETTINGS } from './appState.js';
import { timeUnitSeconds } from './units.js';
import { SECONDS_PER_DAY } from './constants.js';

import { setCaptureSink } from './widgetRuntime.js';

let loading = null;

/**
 * Load the notebook's modules and its panel.
 *
 * @returns {Promise<object>} The panel and capture modules
 */
export function ensureNotebook() {
  if (!loading) {
    loading = (async () => {
      await ensureDeferredMessages().catch(() => {});
      const [panel, capture] = await Promise.all([
        import('./notebookPanel.js'),
        import('./notebook/capture.js'),
      ]);
      panel.setRevisionSource(buildRevision);
      panel.ensurePanel();
      return { panel, capture };
    })();
  }
  return loading;
}

/** @returns {boolean} Whether the notebook has already been loaded */
export const notebookLoaded = () => loading !== null;

/**
 * Where the build identifier comes from, and whether it is real.
 *
 * Three cases, kept apart because a report that cannot tell them apart is a
 * report whose provenance cannot be audited:
 *
 *   deployed    the commit the live site was built from, stamped into the
 *               document by the deploy job. The only value that identifies
 *               this build to anybody else.
 *   stamped     some other build id on the document. Real, but local to
 *               whoever built it.
 *   unknown     a development server, which has neither. Recorded as unknown
 *               rather than as the string 'dev', because 'dev' reads like a
 *               version and is not one.
 *
 * Read from the document, not fetched. The first version asked the network for
 * deployed-revision.json, which the deploy job writes - and that file does not
 * exist anywhere else, so every development load and every browser test logged
 * a 404 for it. A missing marker is the ordinary case, not an error, and it
 * must not look like one. So the deploy job stamps the commit into index.html
 * instead and this only reads what is in front of it.
 *
 * @returns {{id: ?string, source: string}} The build
 */
const REVISION_SOURCE = Object.freeze({
  DEPLOYED: 'deployed',
  STAMPED: 'stamped',
  UNKNOWN: 'unknown',
});

export function buildRevision() {
  const meta = name =>
    document.querySelector(`meta[name="${name}"]`)?.content?.trim() || null;
  const deployed = meta('gravitas-revision');
  if (deployed) {
    return { id: deployed, source: REVISION_SOURCE.DEPLOYED };
  }
  const stamped =
    document.documentElement.dataset.build || meta('gravitas-build');
  return stamped
    ? { id: String(stamped), source: REVISION_SOURCE.STAMPED }
    : { id: null, source: REVISION_SOURCE.UNKNOWN };
}

/**
 * The scenario actually on screen.
 *
 * `SETTINGS.preset_scenario` is a request, not an answer: it holds the
 * sentinel 'None' whenever the world was built from a share link, a lesson's
 * own setup or a sandbox edit rather than from the gallery - see applyPreset in
 * js/scenarios.js, which returns early on it. The notebook was writing that
 * sentinel into an entry's provenance as though 'None' were the name of a
 * scenario. Where the sentinel is in force the scenario is unknown, and null
 * is how this codebase says unknown.
 *
 * @param {object} settings - SETTINGS
 * @returns {?string} The scenario, or null when there is not one
 */
export function resolveScenario(settings) {
  const preset = settings?.preset_scenario;
  if (!preset || preset === 'None') return null;
  return String(preset);
}

/**
 * Everything about the running simulation an entry should record.
 *
 * Synchronous, and that is the whole of its correctness. A reader presses Keep
 * at a moment; the entry has to describe that moment. This function contains
 * no await, reads only from modules that are already resolved, and is called
 * before anything else in the capture path yields - so between the click and
 * these reads the browser has run no other task and the world cannot have
 * moved.
 *
 * It used to await eight dynamic imports first. On a warm cache that is a
 * microtask or two, on a cold one it is a network fetch, and in both cases the
 * animation loop gets a turn: the clock, the world generation, the observer
 * geometry and the intervention epoch were all read from a world that had
 * carried on without the reader. The entry then described a moment nobody had
 * asked about, and nothing on it said so.
 *
 * On the clock
 * -----------------------------------------------------------------------------
 * getSimClock() returns simulation time UNITS, not seconds. One unit is
 * timeUnitSeconds() seconds - it depends on the gravitational constant, and is
 * about 1.84 days at the default setting. The first version stored the raw
 * clock under `simTimeSeconds` and divided it by 86400 for `simTimeDays`, which
 * mislabelled the unit and made the day figure wrong by a factor of 158810.
 * Everything here goes through the application's own conversion, the raw clock
 * keeps its real name, and the factor is recorded so a reader can redo it.
 *
 * @param {object} [extra] - Fields the caller knows and this cannot
 * @returns {object} Fields for provenanceOf()
 */
export function liveProvenance(extra = {}) {
  // --- One synchronous block. Nothing below awaits. -------------------------
  const settings = SETTINGS || {};
  const clockUnits = getSimClock();
  const unitSeconds = timeUnitSeconds();
  const geometry = observerGeometry();
  const worldGeneration = getWorldGeneration();
  const interventionEpoch = getInterventionEpoch?.() ?? null;
  const mode = frameMode();
  const frameObject = frameObjectId();
  const qualityNow = qualityReport();
  const revision = buildRevision();
  const scenario = resolveScenario(settings);
  const integrator = settings.integrator ?? null;
  const maxTimestep = settings.max_timestep || null;
  const simSpeed = settings.sim_speed ?? null;
  // --- End of the atomic block. --------------------------------------------

  const seconds = Number.isFinite(clockUnits) ? clockUnits * unitSeconds : null;

  return {
    scenario,
    /** The raw clock, under its real name. */
    simTimeUnits: Number.isFinite(clockUnits) ? clockUnits : null,
    simTimeSeconds: seconds,
    simTimeDays: seconds === null ? null : seconds / SECONDS_PER_DAY,
    /** So the conversion above can be checked, and redone. */
    timeUnitSeconds: unitSeconds,
    worldGeneration,
    interventionEpoch,
    revision: revision.id,
    revisionSource: revision.source,
    integrator,
    timestep: maxTimestep,
    simSpeed,
    // Mode plus the object it is centred on, because "object" alone does not
    // say which object and two readings taken in different object frames are
    // not comparable.
    referenceFrame: frameObject ? `${mode}:${frameObject}` : mode,
    observer: {
      positionAngleDeg: geometry.positionAngleDeg,
      inclinationDeg: geometry.inclinationDeg,
    },
    quality: qualityNow,
    ...extra,
  };
}

/**
 * A detached copy of whatever a panel is about to hand the notebook.
 *
 * The other half of the atomicity argument. Reading the provenance in the
 * click's own task is no use if the evidence beside it is a live object the
 * panel will overwrite while the notebook loads - a bench comparison, an RV
 * analysis, the sweep the reader is about to run again. Panels copy their
 * source here, at click time, and the copy is what the entry is built from.
 *
 * Written out rather than delegated to structuredClone or a JSON round trip,
 * and both alternatives were tried:
 *
 *   JSON turns Infinity and NaN into null and drops undefined. An uncertainty
 *   bound of Infinity is a real thing for a poorly constrained fit to report,
 *   and "null" is how this codebase says unknown - so the round trip quietly
 *   converts a measured non-finite result into a missing one.
 *
 *   structuredClone keeps those, and is not everywhere: it is absent from the
 *   test environment, so the code that ran under test was the fallback and the
 *   code that shipped was not. One implementation, exercised by both.
 *
 * Cycles are tracked because a report that contains one should be copied, not
 * hang. Functions are passed through by reference: nothing here puts one in a
 * snapshot, and a caller that needs to pass one - bench.metricLabel is the
 * case - passes it beside the snapshot rather than inside it.
 *
 * @template T
 * @param {T} value - The panel's own result
 * @param {WeakMap} [seen] - Internal, for cycles
 * @returns {T} A copy that nothing else holds
 */
export function snapshot(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) {
    const out = [];
    seen.set(value, out);
    for (const item of value) out.push(snapshot(item, seen));
    return out;
  }
  const out = {};
  seen.set(value, out);
  for (const [key, item] of Object.entries(value)) {
    out[key] = snapshot(item, seen);
  }
  return out;
}

/**
 * Open the notebook.
 *
 * @returns {Promise<void>}
 */
export async function openNotebook() {
  const { panel } = await ensureNotebook();
  panel.setNotebookEnabled(true);
}

/**
 * Wire the rail button. Called once from start-up.
 *
 * The whole feature is behind this: until somebody presses it or saves a
 * reading, nothing here beyond this module has been fetched.
 *
 * @returns {void}
 */
export function watchForNotebook() {
  const btn = document.getElementById('toggleNotebook');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { panel } = await ensureNotebook();
      const open = !panel.isNotebookEnabled();
      panel.setNotebookEnabled(open);
      btn.setAttribute('aria-pressed', open ? 'true' : 'false');
      btn.dataset.state = open ? 'on' : 'off';
    } catch (err) {
      console.error('The evidence notebook could not be loaded:', err);
      const { toast } = await import('./notify.js');
      toast(t('nb.error.load'));
    } finally {
      btn.disabled = false;
    }
  });
}

/**
 * Capture a reading and open the notebook on it.
 *
 * `make` receives the capture module and the live provenance and returns an
 * entry, or null when there is nothing to capture. Structured this way so the
 * caller - a panel that already holds its own analysis - decides what the
 * evidence is, and the bridge decides nothing except when to load.
 *
 * @param {Function} make - (capture, provenance) => entry|null
 * @returns {Promise<boolean>} Whether anything was captured
 */
export function captureToNotebook(make) {
  // Deliberately not an `async function`. Everything above the first await
  // runs in the caller's own task, which is the click's task, and the
  // provenance is read there - before the notebook chunk is fetched, before
  // the panel is mounted, and before the animation loop gets another turn.
  //
  // `make` is called afterwards, and that is safe on one condition the callers
  // meet: what it closes over has already been copied. See snapshot().
  const provenance = liveProvenance();
  return (async () => {
    const { panel, capture } = await ensureNotebook();
    const entry = make(capture, provenance);
    if (!entry) return false;
    panel.offerDraft(entry);
    return true;
  })();
}

// The widget families call js/notebookCapture.js rather than importing this
// module, because importing this module means importing js/physics.js and the
// authoring CLI reads those widgets in a process with no DOM. Installing the
// implementation here keeps the synchronous guarantee above: the seam calls
// straight through, so `liveProvenance()` still runs in the click's own task.
setCaptureSink(captureToNotebook);
