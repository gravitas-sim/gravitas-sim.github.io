// =============================================================================
// Registering the deferred panels' strings
// -----------------------------------------------------------------------------
// One call, made by each bridge that loads a panel whose strings were split
// out of the main catalogue. Imported from inside those lazy chunks, so the
// prose travels with the code that uses it.
// =============================================================================

import { registerMessages } from './index.js';
import { applyTranslations } from './dom.js';

let done = false;

/**
 * Add the deferred-panel strings to the catalogues, once.
 *
 * Both locales are registered rather than only the current one: the reader can
 * switch language with the panel open, and fetching a second small module at
 * that moment would show them a screenful of message ids while it arrived.
 *
 * @returns {Promise<void>}
 */
export async function ensureDeferredMessages() {
  if (done) return;
  done = true;
  const [en, es] = await Promise.all([
    import('./en.deferred.js'),
    import('./es.deferred.js'),
  ]);
  registerMessages('en', en.EN_DEFERRED);
  registerMessages('es', es.ES_DEFERRED);

  // Repaint. This used to do nothing, on the reasoning that every caller
  // registers before it renders - which is true of the panels' own JavaScript
  // and false of their markup. Forty-one of these strings are data-i18n
  // attributes in index.html, and the start-up sweep in ./dom.js had already
  // walked past them while the catalogue had no such ids: every slider label,
  // every button and both panel hints were left showing a raw message id.
  //
  // A whole-document sweep rather than a targeted one because the panels are
  // static markup that exists from the first paint, so there is no subtree to
  // scope this to, and re-translating an element to the string it already has
  // costs nothing.
  applyTranslations(document);
}
