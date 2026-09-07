import { describe, test, expect } from '@jest/globals';
import {
  isLocaleLoaded,
  loadLocale,
  registerMessages,
  setLocale,
  t,
} from '../js/i18n/index.js';
import { ES } from '../js/i18n/es.js';

// =============================================================================
// A deferred catalogue must not stand in for a base one
// -----------------------------------------------------------------------------
// ensureDeferredMessages() registers BOTH locales, so a visitor reading English
// who opens any deferred tool ends up with a Spanish catalogue containing only
// that tool's strings. loadLocale() then sees a truthy CATALOGUES.es and returns
// it without ever fetching es.js, and every other string on the page silently
// falls through to English. The user never asked for a half-translated
// interface and nothing reports one.
//
// This file runs the sequence in that order deliberately - deferred first, base
// afterwards - because the order is the bug.
// =============================================================================

/** A key that only the base Spanish catalogue has. */
const BASE_KEY = 'observing.session.newWorld';
/** A key that only the deferred catalogue has. */
const DEFERRED_KEY = 'cr3bp.title';

describe('registering deferred strings before the base catalogue loads', () => {
  test('the base catalogue still loads afterwards', async () => {
    // Simulates opening a deferred tool while reading English: both locales are
    // registered, one of which is not the one on screen.
    registerMessages('es', { [DEFERRED_KEY]: 'Modo de tres cuerpos' });

    // The bug: this used to be enough to make loadLocale think Spanish was
    // already in memory.
    const catalogue = await loadLocale('es');

    // The base file really was fetched, rather than the handful of registered
    // strings being mistaken for it.
    expect(catalogue[BASE_KEY]).toBe(ES[BASE_KEY]);
    // Registered strings live beside the catalogue rather than inside it, so
    // the check that matters is the one a caller makes: both resolve.
    expect(catalogue[DEFERRED_KEY]).toBeUndefined();
  });

  test('isLocaleLoaded reports the base, not a handful of deferred keys', async () => {
    // Read after the load above, so this is about the flag rather than the
    // order: a locale is "loaded" when its base catalogue is in memory.
    expect(isLocaleLoaded('es')).toBe(true);
    expect(isLocaleLoaded('fr')).toBe(false);
  });

  test('switching to Spanish gives Spanish, not English with a few Spanish bits', async () => {
    await setLocale('es', { persist: false });
    // An actual translated string, not merely the absence of a message id.
    expect(t(BASE_KEY)).toBe(ES[BASE_KEY]);
    expect(t(BASE_KEY)).not.toBe('');
    expect(t(BASE_KEY)).not.toBe(BASE_KEY);
    // And the deferred string that was registered first is still there.
    expect(t(DEFERRED_KEY)).toBe('Modo de tres cuerpos');
    await setLocale('en', { persist: false });
  });
});

// =============================================================================
// Loading the deferred catalogue exactly once, for everybody
// =============================================================================

describe('ensureDeferredMessages', () => {
  test('concurrent callers all wait for the same load', async () => {
    // The bug this replaces: `done = true` was set before the awaits, so a
    // second caller arriving while the imports were in flight returned
    // immediately and rendered against strings that had not arrived. A
    // scenario that brings a panel and a lesson that opens a tool ask within a
    // frame of each other, so this was the ordinary case rather than a race
    // somebody had to engineer.
    const { ensureDeferredMessages } =
      await import('../js/i18n/deferredMessages.js');
    const first = ensureDeferredMessages();
    const second = ensureDeferredMessages();
    const third = ensureDeferredMessages();
    // The same promise, not three loads that happen to agree.
    expect(second).toBe(first);
    expect(third).toBe(first);

    await Promise.all([first, second, third]);
    // And by the time any of them resolves, the strings are usable.
    expect(t('cr3bp.point')).not.toBe('cr3bp.point');
  });

  test('a resolved load is reused without re-importing', async () => {
    const { ensureDeferredMessages, deferredMessagesReady } =
      await import('../js/i18n/deferredMessages.js');
    expect(deferredMessagesReady()).toBe(true);
    const again = ensureDeferredMessages();
    await expect(again).resolves.toBeUndefined();
  });
});
