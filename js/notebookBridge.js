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
// =============================================================================

import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

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
 * Atomic, and that is why it is shaped this way. The first version awaited six
 * dynamic imports and *then* read the clock, the world generation and the
 * geometry - so on a cold cache the world advanced by however long the imports
 * took between the reader pressing save and the numbers being read, and the
 * entry recorded a moment that was not the moment. The imports resolve first;
 * every read below happens in one synchronous block with no await in it.
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
 * @returns {Promise<object>} Fields for provenanceOf()
 */
export async function liveProvenance(extra = {}) {
  const [physics, timeline, quality, frame, observer, state, units, constants] =
    await Promise.all([
      import('./physics.js'),
      import('./timeline.js'),
      import('./quality.js'),
      import('./referenceFrame.js'),
      import('./observerGeometry.js'),
      import('./appState.js'),
      import('./units.js'),
      import('./constants.js'),
    ]);

  // --- One synchronous block. Nothing below awaits. -------------------------
  const settings = state.SETTINGS || {};
  const clockUnits = timeline.getSimClock();
  const unitSeconds = units.timeUnitSeconds();
  const geometry = observer.observerGeometry();
  const worldGeneration = physics.getWorldGeneration();
  const interventionEpoch = physics.getInterventionEpoch?.() ?? null;
  const frameMode = frame.frameMode();
  const frameObject = frame.frameObjectId();
  const qualityNow = quality.qualityReport();
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
    simTimeDays: seconds === null ? null : seconds / constants.SECONDS_PER_DAY,
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
    referenceFrame: frameObject ? `${frameMode}:${frameObject}` : frameMode,
    observer: {
      positionAngleDeg: geometry.positionAngleDeg,
      inclinationDeg: geometry.inclinationDeg,
    },
    quality: qualityNow,
    ...extra,
  };
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
export async function captureToNotebook(make) {
  const { panel, capture } = await ensureNotebook();
  const provenance = await liveProvenance();
  const entry = make(capture, provenance);
  if (!entry) return false;
  panel.offerDraft(entry);
  return true;
}
