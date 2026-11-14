// =============================================================================
// One language on the wire
// -----------------------------------------------------------------------------
// A page used to fetch both deferred catalogs together. It fetches the one for
// the language in use; a language switch fetches the other and waits for it, so
// the listeners that repaint a panel always find the new language's strings.
//
// This file keeps its own module registry (one Jest file, one ESM graph) and
// reads the catalogs only through the public API, in the order that matters:
// English first, nothing asked for, then the switch.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  getLocale,
  intendedLocale,
  onLocaleChange,
  setLocale,
  t,
} from '../js/i18n/index.js';
import {
  deferredMessagesReady,
  ensureDeferredMessages,
} from '../js/i18n/deferredMessages.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

/** A key that only the deferred catalogs have. */
const KEY = 'cr3bp.title';

describe('the Spanish catalog stands on its own', () => {
  // The Spanish page does not fetch the English deferred catalog as a fallback.
  // That is only safe while Spanish carries every key English does.
  test('every English deferred key has a Spanish one', () => {
    const lacking = Object.keys(EN_DEFERRED).filter(k => !(k in ES_DEFERRED));
    expect(lacking).toEqual([]);
  });
});

describe('English first, then a switch', () => {
  test('a page reading English asks for English only', async () => {
    expect(intendedLocale()).toBe('en');
    expect(deferredMessagesReady('en')).toBe(false);
    await ensureDeferredMessages();
    expect(deferredMessagesReady('en')).toBe(true);
    expect(deferredMessagesReady('es')).toBe(false);
    expect(t(KEY)).toBe(EN_DEFERRED[KEY]);
  });

  test('the switch registers Spanish before anything repaints', async () => {
    const seen = [];
    const off = onLocaleChange(locale => {
      // What a panel's repaint would read at this moment.
      seen.push({
        locale,
        ready: deferredMessagesReady('es'),
        text: t(KEY),
      });
    });
    const switched = setLocale('es', { persist: false });
    // While the other catalog is in flight the old strings stay on screen.
    expect(getLocale()).toBe('en');
    expect(intendedLocale()).toBe('es');
    expect(t(KEY)).toBe(EN_DEFERRED[KEY]);
    await switched;
    off();

    expect(getLocale()).toBe('es');
    // Every repaint of the switch read Spanish text from a registered catalog,
    // never an id and never the English it replaced.
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) {
      expect(s.ready).toBe(true);
      expect(s.text).toBe(ES_DEFERRED[KEY]);
    }
  });

  test('switching back needs no second fetch and keeps English', async () => {
    await setLocale('en', { persist: false });
    expect(t(KEY)).toBe(EN_DEFERRED[KEY]);
    expect(deferredMessagesReady('en')).toBe(true);
    expect(deferredMessagesReady('es')).toBe(true);
  });
});
