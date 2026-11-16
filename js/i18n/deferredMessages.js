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
 * One catalog per language, each its own chunk, fetched when its language is in
 * use or about to be; a switch fetches the other (setLocalePreparer below).
 * English is not Spanish's fallback: Spanish has every key
 * (tests/deferredByLocale.test.js).
 */
const LOADERS = {
  en: () => import('./en.deferred.js').then(m => m.EN_DEFERRED),
  es: () => import('./es.deferred.js').then(m => m.ES_DEFERRED),
};

/**
 * Loads in flight or done, by locale; dropped on failure so the next caller
 * retries. A promise, so a second caller mid-load waits for the same work.
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
      Promise.resolve()
        .then(() => LOADERS[id]())
        .then(strings => {
          registerMessages(id, strings);
          registered_.add(id);
          lastFailure = null;
          settleDeferredMessages(id);
          // Repaint the static markup the start-up sweep walked past, for the
          // language on screen only (not in Node, which has no document).
          if (typeof document !== 'undefined' && getLocale() === id)
            applyTranslations(document);
        })
        .catch(async err => {
          // Forget the attempt (a failed fetch may stay failed until reload).
          loading.delete(id);
          settleDeferredMessages(id);
          console.warn('[i18n] deferred messages did not load:', err);
          // Last resort: English, so panels read words, not ids.
          if (id !== 'en') await ensureFor('en').catch(() => {});
          lastFailure = err;
          throw err;
        })
    );
  return loading.get(id);
}

/**
 * The language the page is on or about to be on. Until the first change this is
 * a guess from the stored choice or the browser's language, because start-up
 * applies the stored choice after modules begin asking.
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
 * The readiness boundary a consumer awaits before reading a deferred label.
 * Unlike `ensureDeferredMessages()` it never rejects: it reports whether the
 * strings arrived, so a renderer can decide what to draw.
 *
 * @returns {Promise<boolean>} True when the deferred strings are usable
 */
export async function awaitDeferredMessages() {
  try {
    await ensureFor(intendedLocale());
    return true;
  } catch {
    return false;
  }
}

/** Forget everything, so a test can exercise a failure and then a recovery. */
export function resetDeferredMessagesForTests() {
  loading.clear();
  registered_.clear();
  lastFailure = null;
}
