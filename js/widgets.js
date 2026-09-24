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
import { currentTier, prefersReducedMotion } from './quality.js';
// For the bundle's sake, not for anything they export: what reaches this
// registry reaches all thirteen start-up modules the families share, as it did
// when the families were imported here (js/instrumentStartup.js says why). The
// same list as that module's, imported here directly rather than through it: a
// module with no code of its own is still a file of its own, and every lesson
// would fetch it. tests/onDemandFamilies.test.js holds the two lists equal.
import './bodyVisuals.js';
import './darkMatter.js';
import './mond.js';
import './data/exoplanetSystems.js';
import './data/trappist1.js';
import './habitability.js';
import './instruments.js';
import './lesson/evolutionScene.js';
import './quality.js';
import './resonance/systems.js';
import './stellar/geometry.js';
import './stellar/mainSequence.js';
import './stellar/state.js';
import { loadBuiltin } from './platform/resolver.js';
import { FAMILIES } from './platform/catalog.generated.js';

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

// -----------------------------------------------------------------------------
// Every family is loaded on demand
//
// A lesson names at most two instrument families and most name one or none,
// but every lesson used to load all sixteen: the engine imports this registry
// statically and the registry imported every family. LAZY_FAMILIES is the
// whole catalog now (LAZY_CAPABILITIES.md). Each entry is the small
// synchronous half - which ids a family owns, a literal import() a bundler can
// chunk, and the module path a retry needs - and the implementation is fetched
// only when a step names one of its ids. tests/lazyWidgets.test.js holds the
// id lists to the modules, and holds the engine and start-up to importing no
// family at all.
// -----------------------------------------------------------------------------
/** A LAZY_FAMILIES entry read from the family's capability package. */
function fromPackage(familyId, path) {
  const [entry, pick, ids] = FAMILIES[familyId];
  return { ids, load: () => loadBuiltin(entry), path, pick: m => m[pick] };
}

/**
 * One family's entry. `load` is a literal import() so that a bundler can see
 * it and give the family a chunk of its own; `path` is the same module for a
 * retry (retryImport() below); `exportName` is the array of instruments it
 * exports, and `ready`, for a family whose instruments need something more
 * than the module - their prose, or data behind a second import - the promise
 * whenWidgetsReady() waits for.
 */
const familyEntry = (load, path, exportName, ids, ready) => ({
  ids,
  load,
  path,
  pick: m => m[exportName],
  ready: ready && (m => m[ready]),
});

export const LAZY_FAMILIES = Object.freeze({
  energy: familyEntry(
    () => import('./energyWidgets.js'),
    './energyWidgets.js',
    'ENERGY_WIDGETS',
    ['launch', 'live-energy', 'escape-compare', 'shapes']
  ),
  binary: familyEntry(
    () => import('./binaryWidgets.js'),
    './binaryWidgets.js',
    'BINARY_WIDGETS',
    ['binary', 'binary-compare', 'balance', 'visual-binary']
  ),
  blackHole: familyEntry(
    () => import('./blackHoleWidgets.js'),
    './blackHoleWidgets.js',
    'BLACK_HOLE_WIDGETS',
    [
      'bh-horizon',
      'bh-scaling',
      'bh-escape',
      'bh-density',
      'bh-blocks',
      'bh-thermo',
      'bh-lifetime',
      'bh-lineup',
    ]
  ),
  habitability: familyEntry(
    () => import('./habitabilityWidgets.js'),
    './habitabilityWidgets.js',
    'HABITABILITY_WIDGETS',
    [
      'hz-insolation',
      'hz-spreading',
      'hz-star',
      'hz-boundaries',
      'hz-orbit',
      'hz-trappist',
      'hz-candidates',
    ]
  ),
  exoplanet: familyEntry(
    () => import('./exoplanetWidgets.js'),
    './exoplanetWidgets.js',
    'EXOPLANET_WIDGETS',
    [
      'reflex-motion',
      'rv-observer',
      'rv-mass',
      'rv-inclination',
      'astrometry-signature',
      'method-comparison',
      'planet-characterization',
      'survey-schedule',
      'transit-noise',
    ]
  ),
  // Its prose is in the deferred catalog, and its labels are only right once
  // that has arrived; whenWidgetsReady() waits for it (see below).
  tidal: familyEntry(
    () => import('./tidalWidgets.js'),
    './tidalWidgets.js',
    'TIDAL_WIDGETS',
    [
      'tide-vectors',
      'tide-strength',
      'tide-compare',
      'tide-balance',
      'roche-model',
      'tide-disrupt',
    ],
    'messagesReady'
  ),
  darkMatter: familyEntry(
    () => import('./darkMatterWidgets.js'),
    './darkMatterWidgets.js',
    'DARK_MATTER_WIDGETS',
    [
      'dm-shapes',
      'dm-enclosed',
      'dm-fit',
      'dm-flyby',
      'dm-virial',
      'dm-budget',
      'dm-mond',
    ],
    'messagesReady'
  ),
  chaos: familyEntry(
    () => import('./chaosWidgets.js'),
    './chaosWidgets.js',
    'CHAOS_WIDGETS',
    ['chaos-divergence']
  ),
  resonance: familyEntry(
    () => import('./resonanceWidgets.js'),
    './resonanceWidgets.js',
    'RESONANCE_WIDGETS',
    [
      'resonance-periods',
      'resonance-angle',
      'resonance-conjunctions',
      'resonance-frame',
    ]
  ),
  stellar: familyEntry(
    () => import('./stellarWidgets.js'),
    './stellarWidgets.js',
    'STELLAR_WIDGETS',
    ['stellar-lab', 'stellar-compare', 'stellar-population']
  ),
  stellarEvolution: familyEntry(
    () => import('./stellarEvolutionWidgets.js'),
    './stellarEvolutionWidgets.js',
    'STELLAR_EVOLUTION_WIDGETS',
    ['stellar-evolution']
  ),
  observing: familyEntry(
    () => import('./observingWidgets.js'),
    './observingWidgets.js',
    'OBSERVING_WIDGETS',
    ['observing-planner']
  ),
  // Its observed flux arrives behind a second import, through the SDSS data
  // package; whenWidgetsReady() waits for it.
  spectra: familyEntry(
    () => import('./stellarSpectraWidgets.js'),
    './stellarSpectraWidgets.js',
    'SPECTRA_WIDGETS',
    ['spectra-compare', 'spectra-identify'],
    'spectraReady'
  ),
  transit: familyEntry(
    () => import('./transitWidgets.js'),
    './transitWidgets.js',
    'TRANSIT_WIDGETS',
    ['depth-size', 'geometry', 'spectrum', 'dilution', 'resolve']
  ),
  // Declared by its capability package (capabilities/power-law-instruments.json)
  // and loaded through the resolver - the platform package gate's prototype.
  powerLaw: fromPackage('power-law', './powerLawWidgets.js'),
  gw: familyEntry(
    () => import('./gwWidgets.js'),
    './gwWidgets.js',
    'GW_WIDGETS',
    ['gw-lab', 'gw-real']
  ),
  // Its strain arrives behind a second import, like the spectra's flux.
  gwEvents: familyEntry(
    () => import('./gwEventWidgets.js'),
    './gwEventWidgets.js',
    'GW_EVENT_WIDGETS',
    ['gw-events'],
    'eventsReady'
  ),
});

/** The family that owns an id. */
const lazyFamilyOf = id =>
  Object.keys(LAZY_FAMILIES).find(f => LAZY_FAMILIES[f].ids.includes(id)) ||
  null;
/** Each fetched family's instruments, by family. */
const loaded = new Map();
const inFlight = new Map();
const attempts = new Map();
/** A loaded family's own readiness, for a family that declares one. */
const familyReady = new Map();

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

/**
 * A family that could not be fetched, named so a reader can be told which.
 *
 * `retryable` says whether asking again can help. The first failure can be
 * retried under a new URL; if that fails too, the module or one of its own
 * imports is cached as failed for the life of the page and only a reload
 * clears it, so the reader should be told to reload rather than offered a
 * button that cannot work.
 */
export class WidgetLoadError extends Error {
  constructor(family, cause, retryable) {
    super(`The ${family} instruments could not be loaded.`);
    this.name = 'WidgetLoadError';
    this.family = family;
    this.cause = cause;
    this.retryable = retryable;
  }
}

/** How many more tries at a family can still succeed without a reload. */
const RETRIES = 1;

/**
 * Fetch one lazy family, once. Concurrent callers share the same import; a
 * failed one is forgotten, so the next call retries rather than replaying the
 * failure.
 * @param {string} family - A LAZY_FAMILIES key
 * @returns {Promise<void>}
 */
function loadFamily(family) {
  if (loaded.has(family)) return Promise.resolve();
  if (!inFlight.has(family)) {
    const spec = LAZY_FAMILIES[family];
    const n = attempts.get(family) || 0;
    attempts.set(family, n + 1);
    const pending = (n === 0 ? spec.load() : retryImport(spec.path, n))
      .then(m => {
        // A family that needs engine state is handed it here rather than
        // importing it: a lazily loaded family that reaches a module start-up
        // shares makes the bundler split that module out, adding a request
        // to every page (js/quality.js would be one; LAZY_CAPABILITIES.md).
        m.bindServices?.({ currentTier, prefersReducedMotion });
        // A family whose instruments need more than their module - the
        // spectra's flux, the GWOSC strain, the prose two families keep in
        // the deferred catalog - is not ready to draw until that has settled
        // too, so the panel's loading state lasts until it has. Drawn before,
        // an instrument showed its own waiting state and nothing repainted it
        // when the data came; while the families were part of the engine the
        // data had always long arrived. A readiness that fails still settles
        // (false), and the instrument then says it could not load its data.
        const ready = spec.ready ? spec.ready(m) : null;
        if (ready) familyReady.set(family, ready);
        return Promise.resolve(ready)
          .catch(() => false)
          .then(() => spec.pick(m));
      })
      .then(widgets => {
        loaded.set(family, widgets);
        inFlight.delete(family);
      })
      .catch(err => {
        inFlight.delete(family);
        throw new WidgetLoadError(family, err, n < RETRIES);
      });
    inFlight.set(family, pending);
  }
  return inFlight.get(family);
}

/** Whether an id names a widget that has to be fetched before it can be drawn. */
export const needsLoading = id => {
  const family = lazyFamilyOf(id);
  return Boolean(family) && !loaded.has(family);
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
export function getWidget(id) {
  for (const widgets of loaded.values()) {
    const widget = widgets.find(w => w.id === id);
    if (widget) return widget;
  }
  return null;
}

/**
 * Every widget fetched so far, in the manifest's order whatever order the
 * fetches finished in, so that a reader of the whole catalog - the authoring
 * checks, the scene audit - sees the same list on every run.
 * @returns {Array} The widgets
 */
export const allWidgets = () =>
  Object.keys(LAZY_FAMILIES).flatMap(f => loaded.get(f) || []);

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
  // Every consumer that reads the whole catalog already awaits this, so it is
  // where the families are fetched for them - all of them, since none is part
  // of the engine any more - and where each family's own readiness is waited
  // for. The spectra's is there for the same reason as the tidal and
  // dark-matter prose, with one difference worth stating: it is not a catalog
  // of words but thirteen kilobytes of flux behind a dynamic import. The
  // lesson engine does not await this function, so no lesson waits for it;
  // the scene audit and the tests do, because a spectrum widget that cannot
  // reach its data draws a waiting state and reports no measurements, and an
  // audit that accepted that would be auditing the waiting state.
  //
  // The start-up module list that seven families import is linked first, on
  // its own. Fetched by all seven at once, it failed under jest, whose module
  // linker (the tests run the sources through node:vm) loses a module that
  // several concurrent dynamic imports ask for together - "request for
  // './bodyVisuals.js' is not in cache" - where a browser does not. It costs a
  // reader of the whole catalog nothing: every one of them fetches it anyway.
  await import('./instrumentStartup.js');
  await Promise.all(Object.keys(LAZY_FAMILIES).map(loadFamily));
  const results = await Promise.all([...familyReady.values()]);
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
