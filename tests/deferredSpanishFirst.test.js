// =============================================================================
// One language on the wire: a reader whose stored language is Spanish
// -----------------------------------------------------------------------------
// Modules ask for the deferred strings while start-up is still applying the
// stored choice, when the active language is still English. The load has to
// follow the language the page is going to, or every returning Spanish reader
// fetches the English catalog as well. This file stores the choice before
// anything is imported, in a registry of its own.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

globalThis.localStorage.setItem('gravitas_locale', 'es');

const { getLocale, initI18n, intendedLocale, t } =
  await import('../js/i18n/index.js');
const { deferredMessagesReady, ensureDeferredMessages } =
  await import('../js/i18n/deferredMessages.js');
const { ES_DEFERRED } = await import('../js/i18n/es.deferred.js');

const KEY = 'cr3bp.title';

describe('a stored Spanish choice', () => {
  test('is the language a load before start-up finishes is made for', async () => {
    // Nothing has applied the choice yet: the active language is English.
    expect(getLocale()).toBe('en');
    expect(intendedLocale()).toBe('es');
    await ensureDeferredMessages();
    expect(deferredMessagesReady('es')).toBe(true);
    expect(deferredMessagesReady('en')).toBe(false);
  });

  test('applying it finds the catalog in place and loads nothing more', async () => {
    await initI18n();
    expect(getLocale()).toBe('es');
    expect(t(KEY)).toBe(ES_DEFERRED[KEY]);
    expect(deferredMessagesReady('en')).toBe(false);
  });
});
