// =============================================================================
// Registering the deferred panels' strings
// -----------------------------------------------------------------------------
// One call, made by each bridge that loads a panel whose strings were split
// out of the main catalog. Imported from inside those lazy chunks, so the
// prose travels with the code that uses it.
// =============================================================================

import {
  getLocale,
  targetLocale,
  registerMessages,
  setLocalePreparer,
  settleDeferredMessages,
} from './index.js';
import { KEY_LOCALE } from '../names.js';
import { applyTranslations } from './dom.js';

// The panels' markup helpers (./dom.js), handed on from here, and imported from
// here by every module that mounts a fragment (INDEX_DECOMPOSITION.md). Not a
// nicety: this module and ./dom.js are one chunk of the bundle because every
// entry that reaches one reaches the other, and a lazy family importing
// ./dom.js on its own split them, which put a request on every lesson.
export {
  fragmentMounted,
  loadFragment,
  mountFragment,
  unmountFragment,
} from './dom.js';

/**
 * One catalog per language, each its own chunk, fetched when its language is the
 * one in use or about to be. A page used to fetch both so that a switch with a
 * panel open never showed ids, which cost every reader the catalog they could
 * not read (78 KB gzipped English, 90 KB Spanish). A switch now fetches the
 * other one itself and waits for it (setLocalePreparer below). English is not
 * fetched as Spanish's fallback: Spanish has every English key
 * (tests/deferredByLocale.test.js) and the English base catalog is bundled.
 */
const LOADERS = {
  en: () => import('./en.deferred.js').then(m => m.EN_DEFERRED),
  es: () => import('./es.deferred.js').then(m => m.ES_DEFERRED),
};

/**
 * Loads in flight or done, by locale; dropped on failure so the next caller
 * retries. A promise rather than a flag: a second caller arriving mid-load
 * must wait for the same work, not render against a catalog that has not come.
 *
 * @type {Map<string, Promise<void>>}
 */
const loading = new Map();

/** Locales whose strings are actually in the catalogs (not merely asked for). */
const registered_ = new Set();

/** Why the last attempt failed, for a caller that wants to say so. */
let lastFailure = null;

/** Load one language's deferred strings, once. */
function ensureFor(id) {
  if (!loading.has(id))
    loading.set(
      id,
      LOADERS[id]()
        .then(strings => {
          registerMessages(id, strings);
          registered_.add(id);
          lastFailure = null;
          // What the start-up sweep asked for and did not get is now resolved
          // or genuinely missing, and ./index.js says which.
          settleDeferredMessages(id);
          // Repaint the static markup: forty-one of these strings are
          // data-i18n attributes in index.html that the start-up sweep walked
          // past while the catalog was empty. Only the language on screen (a
          // switch in flight repaints when it lands), and not in the Node
          // authoring tools, which have no document and need only the
          // registration above.
          if (typeof document !== 'undefined' && getLocale() === id)
            applyTranslations(document);
        })
        .catch(err => {
          // Forget the attempt. A browser may record a module whose fetch
          // failed and reject every later import of the same specifier, so for
          // a genuine network failure the reader's recovery is a reload; this
          // does recover a throw from registerMessages or the repaint. Strings
          // render as ids (or English) and the application keeps working.
          loading.delete(id);
          lastFailure = err;
          settleDeferredMessages(id);
          console.warn('[i18n] deferred messages did not load:', err);
          throw err;
        })
    );
  return loading.get(id);
}

/**
 * The language the page is on or is about to be on. Start-up applies the stored
 * choice a moment after modules begin asking for strings, when the active
 * language is still English, so until the first change this is a guess from the
 * stored choice or the browser's language. Kept here, with the loaders that
 * validate it, rather than behind the catalog's list of locales: a page that
 * never loads these strings then carries none of it.
 *
 * @returns {string} A locale id with a deferred catalog
 */
export const intendedLocale = () => {
  let id = targetLocale;
  if (!id) {
    try {
      id = localStorage.getItem(KEY_LOCALE);
    } catch {
      /* no storage: the browser's language */
    }
    id ??= globalThis.navigator?.language;
  }
  id = String(id).slice(0, 2);
  return LOADERS[id] ? id : 'en';
};

/**
 * Add the deferred strings of the language in use to the catalogs, once. A
 * language switch loads the other catalog by itself, before it takes effect.
 *
 * @returns {Promise<void>} Resolves when the strings are usable
 */
export const ensureDeferredMessages = () => ensureFor(intendedLocale());

// A switch fetches the new language too once anything has asked.
setLocalePreparer(
  locale => loading.size && ensureFor(locale).catch(() => {}) // warned in ensureFor
);

/**
 * @param {string} [locale] - A language; default is the one in use
 * @returns {boolean} Whether its deferred strings are in the catalogs
 */
export const deferredMessagesReady = (locale = intendedLocale()) =>
  registered_.has(locale);

/** @returns {?Error} Why the last attempt failed, or null */
export const deferredMessagesFailure = () => lastFailure;

/**
 * The readiness boundary a consumer awaits before reading any deferred label.
 *
 * `ensureDeferredMessages()` rejects, which is right for a caller that wants to
 * know. This one never rejects: it reports whether the strings arrived, so a
 * renderer can decide what to draw instead of choosing between a crash and a
 * `.catch(() => {})` that hides every failure including the ones worth seeing.
 *
 * @returns {Promise<boolean>} True when the deferred strings are usable
 */
export async function awaitDeferredMessages() {
  try {
    await ensureFor(intendedLocale());
    return true;
  } catch {
    // Already reported once by ensureDeferredMessages, with the error.
    return false;
  }
}

/** Forget everything, so a test can exercise a failure and then a recovery. */
export function resetDeferredMessagesForTests() {
  loading.clear();
  registered_.clear();
  lastFailure = null;
}
