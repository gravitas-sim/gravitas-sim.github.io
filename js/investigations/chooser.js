// =============================================================================
// The lesson engine's door to the lesson browser
// -----------------------------------------------------------------------------
// js/investigations/browser.js draws the list of lessons: the cards, the
// filters, the curated sequences and the dialog that holds them. It brings the
// catalog of every lesson with it (the manifest, the browse and sequence data,
// the progress reader), which a student who opened one lesson by link never
// looks at. So the engine does not import it. It imports this, which keeps the
// few things the engine tells the browser - its elements, the listeners to wire
// - and hands them over when the browser is first opened.
//
// Until then there is no browser to be open, closed or repainted, and the
// wrappers say so. Opening it is the one thing that fetches it; a failed fetch
// offers the same retry as any other lazy load.
// =============================================================================

import { loadFailed } from '../notify.js';

let browser = null;
let pending = null;
let host = null;
let elements = {};
let wiring = null;

/**
 * Say what the browser needs of the engine. Called once, at import.
 * @param {object} engine - {openInvestigation, loadDialogs, dialogs}
 */
export const bindChooserHost = engine => void (host = engine);

/** Fetch the browser, hand it what it was told, and wire it. */
const load = () =>
  (pending ??= import('./browser.js')
    .then(b => {
      b.bindChooser(host);
      b.setChooserElements(elements);
      if (wiring) b.wireBrowserFilters(wiring);
      return (browser = b);
    })
    .catch(err => {
      pending = null;
      throw err;
    }));

/** The engine's elements, or an empty map on teardown. */
export const setChooserElements = next => {
  elements = next;
  browser?.setChooserElements(next);
};

/** Wire the filters, with the engine's listener options, once there are any. */
export const wireBrowserFilters = opts => {
  wiring = opts;
  browser?.wireBrowserFilters(opts);
};

export const isBrowserOpen = () => browser?.isBrowserOpen() ?? false;
export const closeBrowser = opts => browser?.closeBrowser(opts);
export const renderBrowser = () => browser?.renderBrowser();

/** Open the list of lessons, fetching it the first time. */
export const openBrowser = () =>
  load().then(
    b => b.openBrowser(),
    err => loadFailed(openBrowser, err)
  );
