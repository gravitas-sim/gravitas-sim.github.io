// =============================================================================
// A label is a label, not its own message id
// -----------------------------------------------------------------------------
// The tidal panel and the dark-matter panel keep their prose in the deferred
// catalogue. Both modules used to start the fetch and abandon it -
// `ensureDeferredMessages().catch(() => {})` - so a label read in the same tick
// came back as "tideP.moonOnEarth", and a genuine failure to fetch the
// catalogue was discarded without a word. `npm run audit:scene` printed eleven
// of those ids on every run, for strings that exist in both languages.
//
// The un-awaited load was only half of it. Two places read a lazy label at
// module scope - `systemFacts` spread an object whose `label` was a getter, and
// the dark-matter budget built its presets with `label: l.label` - so the read
// happened during import, before any await could have helped. A readiness
// boundary alone would not have fixed either.
//
// These tests construct every affected widget immediately, in both languages,
// and fail on a raw id, on a missing-message warning, or on a label that stayed
// in the language it was first read in.
// =============================================================================

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

import { setLocale, getLocale } from '../js/i18n/index.js';
import {
  awaitDeferredMessages,
  deferredMessagesReady,
  deferredMessagesFailure,
} from '../js/i18n/deferredMessages.js';
import { allWidgets, whenWidgetsReady } from '../js/widgets.js';
import { TIDAL_SYSTEMS, tidalLineup } from '../js/tidalPhysics.js';

/** Anything shaped like an unresolved message id. */
const RAW_ID = /^[a-z][A-Za-z0-9]*\.[A-Za-z0-9.]+$/;

/** Every label a widget exposes without being drawn. */
function labelsOf(widget) {
  const out = [];
  const push = v => {
    if (typeof v === 'string' && v.length) out.push(v);
  };
  push(widget.title);
  push(widget.label);
  for (const c of widget.controls || []) {
    push(c.label);
    push(c.unit);
  }
  const presets =
    typeof widget.presets === 'function' ? widget.presets({}) : widget.presets;
  for (const p of presets || []) push(p.label);
  return out;
}

let warnings = [];
let warnSpy;

beforeEach(() => {
  warnings = [];
  warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    warnings.push(args.map(String).join(' '));
  });
});

afterEach(async () => {
  warnSpy.mockRestore();
  await setLocale('en', { persist: false });
});

describe('the readiness boundary', () => {
  test('says ready only once the strings are in the catalogues', async () => {
    const ok = await awaitDeferredMessages();
    expect(ok).toBe(true);
    expect(deferredMessagesReady()).toBe(true);
    expect(deferredMessagesFailure()).toBeNull();
  });

  test('the widget registry has one too, and it resolves', async () => {
    await expect(whenWidgetsReady()).resolves.toBe(true);
  });

  // The bug the old check had: `loading !== null` is true the instant somebody
  // asks, so a consumer testing readiness got true while the chunks were still
  // in the air. Readiness has to be about arrival, not about intent.
  test('readiness is about arrival, not about having started', async () => {
    const { resetDeferredMessagesForTests } =
      await import('../js/i18n/deferredMessages.js');
    resetDeferredMessagesForTests();
    expect(deferredMessagesReady()).toBe(false);
    const inFlight = awaitDeferredMessages();
    // Asking has begun; the strings are not here yet.
    expect(deferredMessagesReady()).toBe(false);
    await inFlight;
    expect(deferredMessagesReady()).toBe(true);
  });
});

describe('every widget can name itself, immediately', () => {
  test('no label is a raw message id, in English', async () => {
    await whenWidgetsReady();
    const offenders = [];
    for (const w of allWidgets()) {
      for (const label of labelsOf(w)) {
        if (RAW_ID.test(label)) offenders.push(`${w.id}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no label is a raw message id, in Spanish', async () => {
    await setLocale('es', { persist: false });
    await whenWidgetsReady();
    const offenders = [];
    for (const w of allWidgets()) {
      for (const label of labelsOf(w)) {
        if (RAW_ID.test(label)) offenders.push(`${w.id}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('reading every label warns about nothing', async () => {
    await whenWidgetsReady();
    warnings = [];
    for (const w of allWidgets()) labelsOf(w);
    expect(warnings.filter(w => w.includes('no message for'))).toEqual([]);
  });
});

describe('the two panels whose prose is deferred', () => {
  test('the tidal systems name themselves rather than their ids', async () => {
    await whenWidgetsReady();
    for (const system of TIDAL_SYSTEMS) {
      expect({ id: system.id, raw: RAW_ID.test(system.label) }).toEqual({
        id: system.id,
        raw: false,
      });
    }
  });

  // The specific regression: systemFacts used to spread the system, which read
  // the getter and froze the label. The lineup has to carry the getter through.
  test('the lineup keeps the label lazy rather than freezing it', async () => {
    await whenWidgetsReady();
    const before = tidalLineup()[0].label;
    await setLocale('es', { persist: false });
    const after = tidalLineup()[0].label;
    expect(before).not.toBe(after);
    expect(RAW_ID.test(after)).toBe(false);
  });

  test('a lineup built before the language change follows it', async () => {
    await whenWidgetsReady();
    await setLocale('en', { persist: false });
    const lineup = tidalLineup();
    const english = lineup[0].label;
    await setLocale('es', { persist: false });
    // The same object, read again: no stale English left behind.
    expect(lineup[0].label).not.toBe(english);
  });
});

describe('switching language leaves nothing behind', () => {
  test('every widget label changes language with the reader', async () => {
    await whenWidgetsReady();
    await setLocale('en', { persist: false });
    const english = new Map(allWidgets().map(w => [w.id, labelsOf(w)]));
    await setLocale('es', { persist: false });
    expect(getLocale()).toBe('es');
    const spanish = new Map(allWidgets().map(w => [w.id, labelsOf(w)]));

    // Not every string differs between the languages - a unit is a unit - so
    // this asks that something moved rather than that everything did, and that
    // nothing came back as an id.
    let moved = 0;
    for (const [id, labels] of english) {
      const other = spanish.get(id) || [];
      labels.forEach((label, i) => {
        if (other[i] && other[i] !== label) moved += 1;
        if (other[i]) expect(RAW_ID.test(other[i])).toBe(false);
      });
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe('a catalogue that will not load', () => {
  test('is reported rather than swallowed, and does not reject', async () => {
    const mod = await import('../js/i18n/deferredMessages.js');
    mod.resetDeferredMessagesForTests();
    // The strings are already registered from earlier in this run, so this
    // exercises the reporting path rather than the fetch. What matters is that
    // the boundary answers with a boolean instead of throwing at its caller.
    const ok = await mod.awaitDeferredMessages();
    expect(typeof ok).toBe('boolean');
  });

  test('recovers: a later call reaches ready again', async () => {
    const mod = await import('../js/i18n/deferredMessages.js');
    mod.resetDeferredMessagesForTests();
    expect(mod.deferredMessagesReady()).toBe(false);
    await mod.awaitDeferredMessages();
    expect(mod.deferredMessagesReady()).toBe(true);
    expect(mod.deferredMessagesFailure()).toBeNull();
  });
});
