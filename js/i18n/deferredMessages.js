// =============================================================================
// Registering the deferred panels' strings
// -----------------------------------------------------------------------------
// One call, made by each bridge that loads a panel whose strings were split
// out of the main catalogue. Imported from inside those lazy chunks, so the
// prose travels with the code that uses it.
// =============================================================================

import { registerMessages, settleDeferredMessages } from './index.js';
import { applyTranslations } from './dom.js';

/**
 * The load in flight, or the completed one. Null until somebody asks, and null
 * again after a failure so the next caller retries.
 *
 * A boolean was not enough. `done = true` was set before the awaits, so a
 * second caller arriving while the imports were still in the air returned
 * immediately and rendered against a catalogue that had not arrived - which is
 * the ordinary case, because a scenario that brings a panel and a lesson that
 * opens a tool ask within a frame of each other. Sharing the promise makes
 * every caller wait for the same work exactly once.
 *
 * @type {?Promise<void>}
 */
let loading = null;

/**
 * True once the strings are actually in the catalogues.
 *
 * Separate from `loading`, because they answer different questions and the
 * exported check used to answer the wrong one: `loading !== null` is true the
 * instant somebody asks, so a consumer testing readiness got `true` while the
 * two chunks were still in the air and rendered a screenful of message ids.
 */
let registered_ = false;

/** Why the last attempt failed, for a caller that wants to say so. */
let lastFailure = null;

/**
 * Add the deferred-panel strings to the catalogues, once.
 *
 * Both locales are registered rather than only the current one: the reader can
 * switch language with the panel open, and fetching a second small module at
 * that moment would show them a screenful of message ids while it arrived.
 *
 * @returns {Promise<void>} Resolves when the strings are usable
 */
export function ensureDeferredMessages() {
  if (loading) return loading;
  loading = (async () => {
    const [en, es] = await Promise.all([
      import('./en.deferred.js'),
      import('./es.deferred.js'),
    ]);
    registerMessages('en', en.EN_DEFERRED);
    registerMessages('es', es.ES_DEFERRED);
    registered_ = true;
    lastFailure = null;
    // Anything the start-up sweep asked for and did not get is now either
    // resolved or genuinely missing, and ./index.js says which. Held warnings
    // are released here rather than at a guessed interval, because this is the
    // moment the answer becomes knowable.
    settleDeferredMessages();

    // Repaint. This used to do nothing, on the reasoning that every caller
    // registers before it renders - which is true of the panels' own
    // JavaScript and false of their markup. Forty-one of these strings are
    // data-i18n attributes in index.html, and the start-up sweep in ./dom.js
    // had already walked past them while the catalogue had no such ids: every
    // slider label, every button and both panel hints were left showing a raw
    // message id.
    //
    // A whole-document sweep rather than a targeted one because the panels are
    // static markup that exists from the first paint, so there is no subtree to
    // scope this to, and re-translating an element to the string it already has
    // costs nothing.
    //
    // Skipped where there is no document, which is every Node authoring tool:
    // docs-facts.mjs, the manual builder and author-check all import modules
    // that reach this, and a bare `applyTranslations(document)` threw a
    // ReferenceError at them. The callers' answer was a blanket
    // `.catch(() => {})`, which swallowed that AND every genuine failure with
    // it. Registering the strings is the part a Node tool needs and it has
    // already happened above; repainting a page there is meaningless, so it is
    // declined explicitly rather than thrown and caught.
    if (typeof document !== 'undefined') applyTranslations(document);
  })().catch(err => {
    // Forget the attempt so the next caller can make a fresh one.
    //
    // How much this actually recovers is worth being precise about, because it
    // is less than it looks. A module whose fetch failed is recorded as failed
    // in the browser's module map, and every later import of the SAME specifier
    // is rejected from that record without another request - measured, not
    // assumed: after an aborted fetch, a re-import fails and only a distinct
    // URL succeeds. So a genuine network failure of these two chunks is not
    // recoverable inside the page, and the recovery a reader has is a reload.
    //
    // Retrying with a cache-busting query would work and would cost more than
    // it is worth: a computed specifier is not statically analysable, and these
    // two files are deliberately separate chunks. What this does recover is
    // everything else - a throw from registerMessages, a failure inside the
    // repaint - which would otherwise latch permanently the way the old boolean
    // did.
    //
    // Either way the application keeps working: affected strings render as
    // their ids, which is visible, reported, and not a blank screen.
    loading = null;
    lastFailure = err;
    // A failure settles the question too: whatever was being held for these
    // catalogues is not coming, the reader is looking at raw ids, and saying so
    // is the whole point of not having silenced it.
    settleDeferredMessages();
    console.warn('[i18n] deferred messages did not load:', err);
    throw err;
  });
  return loading;
}

/** @returns {boolean} Whether the deferred strings are in the catalogues */
export const deferredMessagesReady = () => registered_;

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
  if (registered_) return true;
  try {
    await ensureDeferredMessages();
    return registered_;
  } catch {
    // Already reported once by ensureDeferredMessages, with the error.
    return false;
  }
}

/** Forget everything, so a test can exercise a failure and then a recovery. */
export function resetDeferredMessagesForTests() {
  loading = null;
  registered_ = false;
  lastFailure = null;
}
