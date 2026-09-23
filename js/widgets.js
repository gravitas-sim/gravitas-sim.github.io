// =============================================================================
// The lesson instrument registry
// -----------------------------------------------------------------------------
// A widget is a canvas, some controls and a readout. Lessons name one by id and
// the engine in investigations.js renders it; this file is the single place
// that knows which ones exist, so a lesson never imports a widget directly.
//
// The shape a widget can take:
//
//   controls    sliders, each {id, label, unit, min, max, step, value, decimals}
//   presets     buttons that set several controls at once, with a note
//   actions     buttons that do something: {id, label}, handled by act()
//   compute(v)  derived quantities, shared by draw and readout
//   draw(canvas, v, ctx)     paint it
//   readout(v, ctx)          the rows under the canvas
//   animated    true if it needs a repaint every frame
//   step(v, dt) advance an animation, called once per frame when animated
//   reset(v)    put the animation back to its start
//   act(id, v)  handle an action button
//
// `ctx` is the live simulation context a probe gets, and is only passed to
// widgets that ask for it by declaring `live: true`. Everything else is a
// self-contained model that runs whether or not a simulation is loaded.
// =============================================================================

import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import { ENERGY_WIDGETS } from './energyWidgets.js';
import { BINARY_WIDGETS } from './binaryWidgets.js';
import { BLACK_HOLE_WIDGETS } from './blackHoleWidgets.js';
import { HABITABILITY_WIDGETS } from './habitabilityWidgets.js';
import { EXOPLANET_WIDGETS } from './exoplanetWidgets.js';
import { TIDAL_WIDGETS, messagesReady as tidalReady } from './tidalWidgets.js';
import {
  DARK_MATTER_WIDGETS,
  messagesReady as darkMatterReady,
} from './darkMatterWidgets.js';
import { CHAOS_WIDGETS } from './chaosWidgets.js';
import { RESONANCE_WIDGETS } from './resonanceWidgets.js';
import { GW_WIDGETS } from './gwWidgets.js';
import { STELLAR_WIDGETS } from './stellarWidgets.js';
import { STELLAR_EVOLUTION_WIDGETS } from './stellarEvolutionWidgets.js';
import { OBSERVING_WIDGETS } from './observingWidgets.js';
import { SPECTRA_WIDGETS, spectraReady } from './stellarSpectraWidgets.js';

// Every widget family's prose lives in the deferred half of the catalog,
// because nothing in the start-up path can reach one: this registry is
// imported only by the lazy js/investigations.js. That is what keeps eleven
// kilobytes of instrument labels out of everybody's first download.
//
// Registered here rather than left to whoever opened the widget, for the same
// reason js/rvWorkspacePanel.js registers its own: the lesson loader does call
// ensureDeferredMessages() first on the normal path, and a share link, an
// authoring preview or a test that imports a widget module directly does not.
// A readout that prints `resW.row.frame` because of who called it is a bug in
// the widget, not in the caller - which is exactly what happened when these
// families were moved, and what e2e/resonance.spec.js caught.
//
// Fire-and-forget: the registry is data, it has no async entry point, and a
// draw that lands in the same tick as the import still repaints on the next
// frame with the strings in place. Failure is swallowed because a missing
// translation must degrade to an English label rather than break the panel.
ensureDeferredMessages().catch(() => {});

const WIDGETS = [
  ...ENERGY_WIDGETS,
  ...BINARY_WIDGETS,
  ...BLACK_HOLE_WIDGETS,
  ...HABITABILITY_WIDGETS,
  ...EXOPLANET_WIDGETS,
  ...TIDAL_WIDGETS,
  ...DARK_MATTER_WIDGETS,
  ...CHAOS_WIDGETS,
  ...RESONANCE_WIDGETS,
  ...GW_WIDGETS,
  ...STELLAR_WIDGETS,
  ...STELLAR_EVOLUTION_WIDGETS,
  ...OBSERVING_WIDGETS,
  ...SPECTRA_WIDGETS,
];

// -----------------------------------------------------------------------------
// SPIKE (spike/lazy-capabilities-gate): two families loaded on demand.
//
// The manifest is the small synchronous half - which ids a family owns and how
// to fetch it. The implementation is a dynamic import, so esbuild gives each
// family a chunk of its own and a lesson that never names one of its ids never
// downloads it. tests/lazyWidgets.test.js holds the id lists to the modules.
// -----------------------------------------------------------------------------
export const LAZY_FAMILIES = Object.freeze({
  transit: {
    ids: ['depth-size', 'geometry', 'spectrum', 'dilution', 'resolve'],
    // The literal import is what a bundler can see and chunk; a retry goes
    // through retryImport() below.
    load: () => import('./transitWidgets.js'),
    path: './transitWidgets.js',
    pick: m => m.TRANSIT_WIDGETS,
  },
  powerLaw: {
    ids: [
      'power-law-precession',
      'power-law-refinement',
      'power-law-kepler',
      'power-law-conservation',
    ],
    load: () => import('./powerLawWidgets.js'),
    path: './powerLawWidgets.js',
    pick: m => m.POWER_LAW_WIDGETS,
  },
});

/** The family that owns an id, if it is a lazy one. */
const lazyFamilyOf = id =>
  Object.keys(LAZY_FAMILIES).find(f => LAZY_FAMILIES[f].ids.includes(id)) ||
  null;
const loadedFamilies = new Set();
const inFlight = new Map();
const attempts = new Map();

/**
 * A second try at a module whose first fetch failed.
 *
 * A browser caches a failed module fetch for the life of the page, so
 * importing the same URL again rejects at once without touching the network -
 * measured in Chromium, and it is what the HTML module map specifies. A new
 * query string is a new URL. This rescues a family module that failed; it
 * cannot rescue one whose own import failed, because that URL is cached too,
 * and it only works where the module is served at its source path - a bundled
 * build's chunk names are fixed at build time. Both are recorded in the gate.
 */
const retryImport = (path, n) =>
  import(new URL(`${path}?retry=${n}`, import.meta.url).href);

/** A family that could not be fetched, named so a reader can be told which. */
export class WidgetLoadError extends Error {
  constructor(family, cause) {
    super(`The ${family} instruments could not be loaded.`);
    this.name = 'WidgetLoadError';
    this.family = family;
    this.cause = cause;
  }
}

/**
 * Fetch one lazy family, once. Concurrent callers share the same import; a
 * failed one is forgotten, so the next call retries rather than replaying the
 * failure.
 * @param {string} family - A LAZY_FAMILIES key
 * @returns {Promise<void>}
 */
function loadFamily(family) {
  if (loadedFamilies.has(family)) return Promise.resolve();
  if (!inFlight.has(family)) {
    const spec = LAZY_FAMILIES[family];
    const n = attempts.get(family) || 0;
    attempts.set(family, n + 1);
    const pending = (n === 0 ? spec.load() : retryImport(spec.path, n))
      .then(spec.pick)
      .then(widgets => {
        for (const w of widgets) if (!getWidget(w.id)) WIDGETS.push(w);
        loadedFamilies.add(family);
        inFlight.delete(family);
      })
      .catch(err => {
        inFlight.delete(family);
        throw new WidgetLoadError(family, err);
      });
    inFlight.set(family, pending);
  }
  return inFlight.get(family);
}

/** Whether an id names a widget that has to be fetched before it can be drawn. */
export const needsLoading = id => {
  const family = lazyFamilyOf(id);
  return Boolean(family) && !loadedFamilies.has(family);
};

/**
 * The widget, loading its family first if it has to.
 * @param {string} id - Widget id from a lesson step
 * @returns {Promise<Object|null>} The widget, or null for an unknown id
 */
export async function ensureWidget(id) {
  const family = lazyFamilyOf(id);
  if (family) await loadFamily(family);
  return getWidget(id);
}

/**
 * Look up a widget by id.
 * @param {string} id - Widget id from a lesson step
 * @returns {Object|null} The widget, or null
 */
export const getWidget = id => WIDGETS.find(w => w.id === id) || null;

/** @returns {Array} Every registered widget */
export const allWidgets = () => [...WIDGETS];

/**
 * Wait until every widget in the registry can name itself.
 *
 * Two of them - the tidal panel and the dark-matter panel - keep their prose in
 * the deferred catalog, and a label read before that catalog arrives comes
 * back as its own message id. Both modules used to start the load and abandon
 * it, so whether a caller saw "Moon on Earth" or "tideP.moonOnEarth" depended
 * on how many microtasks had run since the import. `npm run audit:scene`
 * printed eleven of those ids on every run.
 *
 * Awaited by anything that reads a widget's labels: the authoring preview, the
 * scene audit, and the lesson engine when it opens a panel. Resolves to false
 * rather than rejecting when the catalog could not be fetched, so a caller
 * can say so instead of choosing between a crash and silence -
 * deferredMessagesFailure() carries the reason.
 *
 * @returns {Promise<boolean>} True when every widget's strings are usable
 */
export async function whenWidgetsReady() {
  // spectraReady is here for the same reason as the other two and with one
  // difference worth stating: it is not a catalog of words but thirteen
  // kilobytes of flux behind a dynamic import. The lesson engine does not
  // await this function, so no lesson waits for it; the scene audit and the
  // tests do, because a spectrum widget that cannot reach its data draws a
  // waiting state and reports no measurements, and an audit that accepted
  // that would be auditing the waiting state.
  // SPIKE: every consumer that reads the whole catalog already awaits this,
  // so it is where the lazy families are fetched for them.
  await Promise.all(Object.keys(LAZY_FAMILIES).map(loadFamily));
  const results = await Promise.all([
    tidalReady,
    darkMatterReady,
    spectraReady,
  ]);
  return results.every(Boolean);
}

/**
 * Starting values for a widget's controls, with a step's overrides applied.
 * @param {Object} widget - A widget definition
 * @param {Object} [overrides] - Values from the lesson step
 * @returns {Object} control id -> number
 */
export function widgetDefaults(widget, overrides = {}) {
  const out = {};
  for (const c of widget.controls) out[c.id] = c.value;
  for (const key of Object.keys(overrides)) {
    if (key in out) out[key] = Number(overrides[key]);
  }
  return out;
}
