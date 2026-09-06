// =============================================================================
// Registering the deferred panels' strings
// -----------------------------------------------------------------------------
// One call, made by each bridge that loads a panel whose strings were split
// out of the main catalogue. Imported from inside those lazy chunks, so the
// prose travels with the code that uses it.
// =============================================================================

import { registerMessages, getLocale } from './index.js';

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
  // Nothing is repainted here. Every caller registers before it renders, and
  // a panel already on screen redraws on its own tick.
  void getLocale();
}
