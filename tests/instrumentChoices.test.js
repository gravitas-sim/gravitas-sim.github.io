// =============================================================================
// No instrument offers a choice that throws
// -----------------------------------------------------------------------------
// The exposure planner offered "Rubin, g" and "Rubin, i" for as long as it has
// existed, and reading either threw an InstrumentTableError because the
// instrument table held a Rubin seeing for r only. Nothing noticed: the lessons
// use the other three choices, and the label golden records a throw without
// failing on it (its "threw" list is held, not empty).
//
// This reads every instrument the registry has (allWidgets(), 170 of them) at
// every position of every choice it offers, in both languages, and requires that
// the readout does not throw. A choice is a control that moves in whole steps
// through a short list: an integer step and at most CHOICE_MAX positions. (A
// count that runs from 1 to 20 is a number, not a choice.) Only a throw that the
// choice causes is held against the instrument: the readout of the same
// instrument at its defaults, in the same context, must not throw.
//
// A live instrument reads the lesson's world through a context; the synthetic
// contexts of the label golden stand for it, as there.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { syntheticContexts, outcome } from './labelGolden/record.mjs';

/** The most positions a control may have and still be a choice. */
const CHOICE_MAX = 12;

const isChoice = c =>
  Number.isInteger(c.min) &&
  Number.isInteger(c.max) &&
  (c.step || 1) >= 1 &&
  Number.isInteger(c.step || 1) &&
  c.max > c.min &&
  (c.max - c.min) / (c.step || 1) + 1 <= CHOICE_MAX;

const positions = c => {
  const out = [];
  for (let x = c.min; x <= c.max; x += c.step || 1) out.push(x);
  return out;
};

let widgets;
let contexts;
const failures = [];
const covered = { instruments: 0, choices: 0, readings: 0, skipped: [] };

beforeAll(async () => {
  widgets = await import('../js/widgets.js');
  const i18n = await import('../js/i18n/index.js');
  const deferred = await import('../js/i18n/deferredMessages.js');
  await widgets.whenWidgetsReady();
  contexts = await syntheticContexts();
  for (const locale of ['en', 'es']) {
    await i18n.setLocale(locale, { persist: false });
    await deferred.awaitDeferredMessages();
    for (const widget of widgets.allWidgets()) {
      const spec = { id: widget.id };
      const choices = (widget.controls || []).filter(isChoice);
      if (locale === 'en') covered.instruments++;
      const defaults = widgets.widgetDefaults(widget, undefined);
      for (const ctx of widget.live ? contexts : [undefined]) {
        const base = outcome(() => widget.readout(defaults, ctx, spec));
        if (base && base.threw) {
          // The instrument cannot be read here at all (no such world in the
          // synthetic context): not a choice's doing.
          if (locale === 'en' && ctx === contexts?.[0])
            covered.skipped.push(widget.id);
          continue;
        }
        for (const c of choices) {
          if (
            locale === 'en' &&
            ctx === (widget.live ? contexts[0] : undefined)
          )
            covered.choices++;
          for (const x of positions(c)) {
            covered.readings++;
            const r = outcome(() =>
              widget.readout({ ...defaults, [c.id]: x }, ctx, spec)
            );
            if (r && r.threw)
              failures.push(
                `${widget.id} ${c.id}=${x} (${locale}): ${r.threw}`
              );
          }
        }
      }
    }
  }
}, 600000);

describe('every choice an instrument offers can be read', () => {
  test('the registry holds the 170 instruments and the sweep reached choices in them', () => {
    expect(covered.instruments).toBe(170);
    expect(covered.choices).toBeGreaterThan(100);
  });

  test('no choice makes its instrument throw, in either language', () => {
    expect(failures).toEqual([]);
  });

  test('the exposure planner offers five setups and reads every one', () => {
    const planner = widgets.getWidget('exposure-planner');
    const setup = planner.controls.find(c => c.id === 'setup');
    expect(positions(setup)).toEqual([0, 1, 2, 3, 4]);
    for (const x of positions(setup)) {
      const rows = planner.readout(
        widgets.widgetDefaults(planner, { setup: x }),
        undefined,
        { id: 'exposure-planner' }
      );
      expect(rows.length).toBeGreaterThan(3);
    }
  });
});
