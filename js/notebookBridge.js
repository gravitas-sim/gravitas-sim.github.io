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
 * A build identifier for an entry's provenance.
 *
 * The production build stamps one onto the document; a development server has
 * none, and 'dev' is the honest answer rather than a fabricated version. The
 * same function the bench's manifest uses, restated here so the notebook does
 * not have to import the bench to record which build took a reading.
 *
 * @returns {string} Build identifier
 */
export function buildRevision() {
  return (
    document.documentElement.dataset.build ||
    document.querySelector('meta[name="gravitas-build"]')?.content ||
    'dev'
  );
}

/**
 * Everything about the running simulation an entry should record.
 *
 * Read once, here, at the moment of capture. Every value is copied out as a
 * number or a string - nothing that follows is a live reference - which is
 * what makes the resulting snapshot immune to the next rebuild.
 *
 * @param {object} [extra] - Fields the caller knows and this cannot
 * @returns {Promise<object>} Fields for provenanceOf()
 */
export async function liveProvenance(extra = {}) {
  const [physics, timeline, quality, frame, observer, state] =
    await Promise.all([
      import('./physics.js'),
      import('./timeline.js'),
      import('./quality.js'),
      import('./referenceFrame.js'),
      import('./observerGeometry.js'),
      import('./appState.js'),
    ]);

  const settings = state.SETTINGS || {};
  const seconds = timeline.getSimClock();
  const geometry = observer.observerGeometry();

  return {
    scenario: settings.preset_scenario ?? null,
    simTimeSeconds: seconds,
    // Days as well as seconds: a reader wants days and anybody reproducing the
    // reading wants the raw clock, and converting between them needs a
    // constant this block would not otherwise carry.
    simTimeDays: Number.isFinite(seconds) ? seconds / 86400 : null,
    worldGeneration: physics.getWorldGeneration(),
    interventionEpoch: physics.getInterventionEpoch?.() ?? null,
    revision: buildRevision(),
    integrator: settings.integrator ?? null,
    timestep: settings.max_timestep || null,
    simSpeed: settings.sim_speed ?? null,
    // Mode plus the object it is centred on, because "object" alone does not
    // say which object and two readings taken in different object frames are
    // not comparable.
    referenceFrame: frame.frameObjectId()
      ? `${frame.frameMode()}:${frame.frameObjectId()}`
      : frame.frameMode(),
    observer: {
      positionAngleDeg: geometry.positionAngleDeg,
      inclinationDeg: geometry.inclinationDeg,
    },
    quality: quality.qualityReport(),
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
