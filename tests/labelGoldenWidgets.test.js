import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WIDGET_COVERAGE_FILE,
  committedWidgets,
} from '../tools/label-golden.mjs';
import { LOCALES, num } from './labelGolden/record.mjs';
import { maskNoise, valueSets, widgetSites } from './labelGolden/widgets.mjs';
import { PARTS, familyModules } from './labelGolden/widgetParts.mjs';

// =============================================================================
// The label golden, instrument widgets (Roadmap III, Prompt 144): the guard
// -----------------------------------------------------------------------------
// Every number, unit and label the instrument widgets (js/*Widgets.js) print,
// in English and Spanish, recorded before any of them is moved onto
// js/format.js. A migration that changes what an instrument prints fails here
// with the family and the widget.
//
// The recording itself is in parts, one suite per group of families
// (tests/labelGoldenWidgets<Part>.test.js, the groups in PARTS in
// tests/labelGolden/widgetParts.mjs), because one suite took 250 to 450 seconds
// on CI and held the test job past its limit. Each part records its own
// families and checks them against the committed fixtures. This file makes the
// checks no part can make alone, and none of them records anything:
//
//   - the parts together are exactly the families there are (a new family
//     fails here until it is in a part, and a family in two parts fails here);
//   - the totals that were over the whole recording (how many widgets, "not
//     hollow", the widgets that threw, the call sites), made from the
//     committed fixtures, which every part proves are what the widgets print;
//   - the pure checks (the value sets, the noise floor).
//
// To accept a change on purpose: npm run label:golden -- --regenerate-label-golden
// (in its own commit, with the diff read). What is recorded and how is in
// tests/labelGolden/widgets.mjs and docs/LABEL_GOLDEN.md.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

let files;
let modules;
let recorded;
beforeAll(async () => {
  files = committedWidgets();
  modules = await familyModules();
  const { LAZY_FAMILIES } = await import('../js/widgets.js');
  // The committed fixtures, as the recording writes them: family -> widget ->
  // { en, es }, in the order the recording makes them in.
  recorded = {
    families: Object.fromEntries(
      Object.keys(LAZY_FAMILIES).map(f => [f, JSON.parse(files[f])])
    ),
    ids: Object.fromEntries(
      Object.entries(LAZY_FAMILIES).map(([f, e]) => [f, e.ids])
    ),
  };
});

const widgetsOf = rec =>
  Object.values(rec.families).flatMap(f => Object.entries(f));

describe('the parts of the recording', () => {
  test('every family is in exactly one part, and no part names a family that is gone', () => {
    const named = Object.values(PARTS).flat();
    const families = Object.keys(modules);
    expect({
      twice: named.filter((f, i) => named.indexOf(f) !== i),
      missing: families.filter(f => !named.includes(f)),
      gone: named.filter(f => !families.includes(f)),
      how: 'name the family in one part of PARTS in tests/labelGolden/widgetParts.mjs',
    }).toEqual({
      twice: [],
      missing: [],
      gone: [],
      how: 'name the family in one part of PARTS in tests/labelGolden/widgetParts.mjs',
    });
    expect([...named].sort()).toEqual([...families].sort());
    for (const [part, list] of Object.entries(PARTS))
      expect({ part, families: list.length > 0 }).toEqual({
        part,
        families: true,
      });
  });

  test('every instrument is in exactly one family, and each family has its own module', () => {
    const ids = Object.values(recorded.ids).flat();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(126);
    const paths = Object.values(modules);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('the suites are the parts: one file per part, and no other', () => {
    const suites = readdirSync(path.join(ROOT, 'tests'))
      .map(f => /^labelGoldenWidgets([A-Z]\w*)\.test\.js$/.exec(f)?.[1])
      .filter(Boolean)
      .map(n => n[0].toLowerCase() + n.slice(1))
      .sort();
    // The engine-Math proof is a suite of its own, not a part.
    expect(suites).toEqual([...Object.keys(PARTS), 'engineMath'].sort());
    for (const part of Object.keys(PARTS))
      expect(
        readFileSync(
          path.join(
            ROOT,
            `tests/labelGoldenWidgets${part[0].toUpperCase()}${part.slice(1)}.test.js`
          ),
          'utf8'
        )
      ).toContain(`describeWidgetPart('${part}')`);
  });
});

describe('the committed recording', () => {
  test('has a fixture for every family and none for a family that is gone', () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(modules).sort());
    expect(Object.keys(modules).length).toBe(34);
  });

  test('has every widget in both locales', () => {
    const widgets = widgetsOf(recorded);
    expect(widgets.length).toBe(124);
    for (const [, rec] of widgets) {
      expect(rec.en.frames).toBeGreaterThan(0);
      // Spanish is either the same recording or its own.
      expect(rec.es === 'same' || typeof rec.es === 'object').toBe(true);
    }
    expect(LOCALES).toEqual(['en', 'es']);
  });

  test('is not hollow: readouts, painted text and slider numbers are all there', () => {
    const widgets = widgetsOf(recorded).map(([, rec]) => rec.en);
    expect(widgets.reduce((n, w) => n + w.frames, 0)).toBeGreaterThan(5000);
    expect(widgets.filter(w => w.readout.distinct > 1).length).toBeGreaterThan(
      90
    );
    expect(widgets.filter(w => w.canvas.distinct > 1).length).toBeGreaterThan(
      80
    );
    expect(
      widgets.reduce((n, w) => n + w.static.controls.length, 0)
    ).toBeGreaterThan(150);
  });

  test('says where a widget threw, and the list is the one recorded', () => {
    // A widget that threw while it was read is a reading the golden cannot
    // vouch for, so the list is held and a new entry fails here (each part
    // holds its own widgets to the same list).
    const threw = widgetsOf(recorded)
      .filter(([, rec]) => /"threw"/.test(JSON.stringify(rec.en)))
      .map(([id]) => id);
    expect(threw).toEqual(readJson(WIDGET_COVERAGE_FILE).threw);
  });

  test('is deterministic: the values come from a seed keyed by the widget', () => {
    const widget = {
      id: 'a-widget',
      controls: [
        { id: 'x', min: 0, max: 10, step: 0.5, value: 2 },
        { id: 'y', min: -1, max: 1, step: 0.1, value: 0 },
      ],
    };
    const defaults = { x: 2, y: 0 };
    expect(valueSets(widget, {}, defaults)).toEqual(
      valueSets(widget, {}, defaults)
    );
    const sets = valueSets(widget, {}, defaults);
    // Both ends are in it, and a negative one.
    expect(sets.some(v => v.x === 0 && v.y === -1)).toBe(true);
    expect(sets.some(v => v.x === 10 && v.y === 1)).toBe(true);
    // Every value lies on its control's step grid and inside its range.
    for (const v of sets) {
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x).toBeLessThanOrEqual(10);
      expect(Math.abs(v.y)).toBeLessThanOrEqual(1);
    }
    expect(valueSets(widget, {}, defaults, false)).toHaveLength(4);
    expect(num(1 / 3)).toBe('0.333333333333');
  });
});

describe('the call-site coverage', () => {
  test('every call the recording cannot reach is listed, and nothing else', () => {
    // Each part holds the sites of its own families' modules to the record
    // (which it reaches and which it does not). Here: the record covers all
    // the sites, and the ones it says are reached lie in a family's module,
    // so the parts together reach exactly the sites the record says.
    const committed = readJson(WIDGET_COVERAGE_FILE);
    const sites = widgetSites();
    expect(committed.calls).toBe(sites.length);
    expect(committed.reached + committed.unreached.length).toBe(
      committed.calls
    );
    const unreached = new Set(committed.unreached);
    expect(committed.unreached.every(s => sites.includes(s))).toBe(true);
    const reached = sites.filter(s => !unreached.has(s));
    expect(reached.length).toBe(committed.reached);
    const owned = new Set(Object.values(modules));
    expect(reached.filter(s => !owned.has(s.split(':')[0]))).toEqual([]);
    // The list is the migration's boundary: a site that is not reached is a
    // site the golden cannot vouch for, so it is not moved.
  });

  test('is counted the way the ratchet counts the family', () => {
    const ratchet = readJson('tools/number-ratchet.json').formatting;
    const family = Object.entries(ratchet)
      .filter(([f]) => /^js\/[A-Za-z]+Widgets\.js$/.test(f))
      .reduce((n, [, c]) => n + c, 0);
    expect(widgetSites().length).toBe(family);
  });
});

describe('what the recording can tell apart', () => {
  // The proof that a naive swap of toFixed for format.fixed changes what the
  // widgets print and a wrapper does not runs in the part "rest"
  // (tests/labelGoldenWidgetsRest.test.js), and the proof that the power-law
  // recording does not depend on the engine's Math in the part "powerLaw".
  test('a number below the floor is written as a zero of the same shape, and nothing else moves', () => {
    expect(maskNoise('-0.00000 °', 1e-4)).toBe('0.00000 °');
    expect(maskNoise('0.00000 °', 1e-4)).toBe('0.00000 °');
    expect(maskNoise('3.79e-15 of total |p|', 1e-4)).toBe(
      '0.00e-N of total |p|'
    );
    expect(maskNoise('1.2e-5', 1e-4)).toBe('0.0e-N');
    expect(maskNoise('timestep 0.08', 1e-4)).toBe('timestep 0.08');
    expect(maskNoise('42.66711 °', 1e-4)).toBe('42.66711 °');
    expect(maskNoise('\u22120.00012', 1e-4)).toBe('\u22120.00012');
    // The decimals still show: a change from 5 places to 3 is a change.
    expect(maskNoise('0.00000', 1e-4)).not.toBe(maskNoise('0.000', 1e-4));
    expect(maskNoise('n = 2', 1e-4)).toBe('n = 2');
  });
});
