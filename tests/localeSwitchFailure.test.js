// =============================================================================
// A language change that fails, or is overtaken, leaves a coherent page
// -----------------------------------------------------------------------------
// The language catalogs are fetched on demand. When the fetch fails the page
// stays in the language it was in (and asks for that language's deferred
// strings, not the one that failed); when two changes overlap the later one
// wins whichever fetch comes back first; and a language without a deferred
// catalog entry cannot throw out of setLocale.
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';

jest.unstable_mockModule('../js/i18n/es.deferred.js', () => {
  throw new Error('offline');
});

const index = await import('../js/i18n/index.js');
const deferred = await import('../js/i18n/deferredMessages.js');
const { LOCALES, setLocale, getLocale } = index;
const es = LOCALES.find(l => l.id === 'es');
const realLoad = es.load;
const quiet = () => jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('a language that will not load', () => {
  test('is not applied, is not the target, and the deferred strings come in English', async () => {
    const warn = quiet();
    es.load = () => Promise.reject(new Error('offline'));
    await expect(setLocale('es', { persist: false })).resolves.toBe('en');
    expect(getLocale()).toBe('en');
    expect(index.targetLocale).toBe('en');
    expect(deferred.intendedLocale()).toBe('en');
    await deferred.ensureDeferredMessages();
    expect(deferred.deferredMessagesReady('en')).toBe(true);
    warn.mockRestore();
  });
});

describe('a language whose deferred strings will not load', () => {
  test('the English strings are fetched as a last resort', async () => {
    const warn = quiet();
    deferred.resetDeferredMessagesForTests();
    es.load = realLoad;
    await setLocale('es', { persist: false });
    expect(getLocale()).toBe('es');
    expect(await deferred.awaitDeferredMessages()).toBe(false);
    expect(deferred.deferredMessagesReady('en')).toBe(true);
    expect(deferred.deferredMessagesFailure()).toBeTruthy();
    warn.mockRestore();
    await setLocale('en', { persist: false });
  });
});

describe('a language with no deferred catalog', () => {
  test('is applied without throwing out of setLocale', async () => {
    const warn = quiet();
    await deferred.ensureDeferredMessages().catch(() => {});
    LOCALES.push({ id: 'xx', load: () => Promise.resolve({}) });
    await expect(setLocale('xx', { persist: false })).resolves.toBe('xx');
    LOCALES.pop();
    warn.mockRestore();
    await setLocale('en', { persist: false });
  });
});

describe('two changes in quick succession', () => {
  test('end on the later one, whichever fetch returns last', async () => {
    let release;
    const gate = new Promise(r => (release = r));
    LOCALES.push({ id: 'f2', load: () => gate.then(() => ({})) });
    const first = setLocale('f2', { persist: false });
    const second = setLocale('en', { persist: false });
    await expect(second).resolves.toBe('en');
    release();
    await expect(first).resolves.toBe('en');
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    LOCALES.pop();
  });
});
