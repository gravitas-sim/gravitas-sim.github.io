import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLAG,
  WIDGET_COVERAGE_FILE,
  committedWidgets,
  serialize,
  widgetCoverageOf,
} from '../tools/label-golden.mjs';
import { LOCALES, num } from './labelGolden/record.mjs';
import {
  maskNoise,
  recordWidgets,
  valueSets,
  widgetSites,
} from './labelGolden/widgets.mjs';

// =============================================================================
// The label golden, instrument widgets (Roadmap III, Prompt 144)
// -----------------------------------------------------------------------------
// Every number, unit and label the instrument widgets (js/*Widgets.js) print,
// in English and Spanish, recorded before any of them is moved onto
// js/format.js. A migration that changes what an instrument prints fails here
// with the family and the widget.
//
// To accept a change on purpose: npm run label:golden -- --regenerate-label-golden
// (in its own commit, with the diff read). What is recorded and how is in
// tests/labelGolden/widgets.mjs and docs/LABEL_GOLDEN.md.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

let all;
let files;
beforeAll(async () => {
  all = await recordWidgets();
  files = committedWidgets();
}, 600000);

const widgetsOf = rec =>
  Object.values(rec.families).flatMap(f => Object.entries(f));

describe('the recording', () => {
  test('has a fixture for every family and none for a family that is gone', () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(all.families).sort());
    expect(Object.keys(all.families).length).toBe(27);
  });

  test('matches every family as it prints now', () => {
    const wrong = Object.entries(all.families)
      .filter(([family, rec]) => files[family] !== serialize(rec))
      .map(([family]) => family);
    expect({ wrong, how: `npm run label:golden -- ${FLAG}` }).toEqual({
      wrong: [],
      how: `npm run label:golden -- ${FLAG}`,
    });
  });

  test('records every widget in both locales', () => {
    const widgets = widgetsOf(all);
    expect(widgets.length).toBe(100);
    for (const [, rec] of widgets) {
      expect(rec.en.frames).toBeGreaterThan(0);
      // Spanish is either the same recording or its own.
      expect(rec.es === 'same' || typeof rec.es === 'object').toBe(true);
    }
    expect(LOCALES).toEqual(['en', 'es']);
  });

  test('is not hollow: readouts, painted text and slider numbers are all there', () => {
    const widgets = widgetsOf(all).map(([, rec]) => rec.en);
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
    // vouch for, so the list is held and a new entry fails here.
    expect(widgetCoverageOf(all).threw).toEqual(
      readJson(WIDGET_COVERAGE_FILE).threw
    );
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
    const coverage = widgetCoverageOf(all);
    const committed = readJson(WIDGET_COVERAGE_FILE);
    expect(coverage.calls).toBe(committed.calls);
    expect(coverage.reached).toBe(committed.reached);
    expect(coverage.unreached).toEqual(committed.unreached);
    // The list is the migration's boundary: a site that is not reached is a
    // site the golden cannot vouch for, so it is not moved.
    expect(committed.reached + committed.unreached.length).toBe(
      committed.calls
    );
  });

  test('is counted the way the ratchet counts the family', () => {
    const ratchet = readJson('tools/number-ratchet.json').formatting;
    const family = Object.entries(ratchet)
      .filter(([f]) => /^js\/[A-Za-z]+Widgets\.js$/.test(f))
      .reduce((n, [, c]) => n + c, 0);
    expect(all.sites.length).toBe(family);
    expect(widgetSites()).toEqual(all.sites);
  });
});

describe('what the recording can tell apart', () => {
  // The families where a recorded call writes a negative number (the energy
  // budget, the dark-matter slope, the detector time
  // axis). Three widgets keep state between two recordings in one process
  // (stellar-lab, stellar-evolution, gw-lab), so the proof runs on families
  // that do not.
  const SWAP = ['energy', 'darkMatter', 'gwEvents'];

  test('a naive swap of toFixed for format.fixed is not identity, and a wrapper is', async () => {
    const { fixed } = await import('../js/format.js');
    const original = Number.prototype.toFixed;
    function naive(digits) {
      Number.prototype.toFixed = original;
      try {
        return fixed(Number(this), digits);
      } finally {
        Number.prototype.toFixed = naive;
      }
    }
    const options = { coverage: false, only: SWAP };
    const control = await recordWidgets({
      ...options,
      toFixed(digits) {
        return original.call(this, digits);
      },
    });
    const swapped = await recordWidgets({ ...options, toFixed: naive });
    const before = await recordWidgets(options);
    const differing = widgetsOf(swapped)
      .filter(
        ([id, rec]) =>
          JSON.stringify(rec) !==
          JSON.stringify(widgetsOf(before).find(([i]) => i === id)[1])
      )
      .map(([id]) => id);
    // fixed() writes a true minus where toFixed writes a hyphen, and an empty
    // string where toFixed writes "NaN": a widget that prints a negative or a
    // missing value changes, so each site needs its own decision.
    expect(differing.length).toBeGreaterThan(0);
    expect(Number.prototype.toFixed).toBe(original);
    expect(JSON.stringify(control.families)).toBe(
      JSON.stringify(before.families)
    );
    // And what is recorded for those families is what the fixtures hold.
    for (const family of SWAP)
      expect(serialize(before.families[family])).toBe(files[family]);
  }, 900000);
});

describe("the recording does not depend on the engine's Math", () => {
  // CI runs Node 20 and a developer's machine a newer Node; V8's Math.pow, log
  // and atan2 differ in the last digit between them. The power-law instrument
  // prints the precession of a Newtonian ellipse, which is exactly zero, so what
  // it prints is integration noise: the recording writes a number below the
  // family's noise floor as a zero of the same shape (maskNoise). Here Math is
  // made wrong in the last digit on one call in sixteen, and the recording must
  // not move from the fixture.
  test('the power-law family reads the same when pow, log, atan2 and hypot are a unit in the last place off', async () => {
    const lab = await import('../js/powerLawLab.js');
    const names = ['pow', 'log', 'log10', 'atan2', 'hypot'];
    const original = Object.fromEntries(names.map(n => [n, Math[n]]));
    let k = 0;
    for (const n of names)
      Math[n] = (...x) => {
        k = Math.imul(k + 1, 2654435761) >>> 0;
        const r = original[n](...x);
        return (k >>> 8) % 16 === 0
          ? r * (1 + ((k >>> 16) & 1 ? 1 : -1) * Number.EPSILON)
          : r;
      };
    let wrong;
    try {
      // The lab remembers a measurement by exponent: forget the ones made with
      // the engine's own Math, so these are made with the wrong one.
      lab.resetLabForTests();
      wrong = await recordWidgets({ coverage: false, only: ['powerLaw'] });
    } finally {
      for (const n of names) Math[n] = original[n];
      lab.resetLabForTests();
    }
    expect(k).toBeGreaterThan(1000);
    expect(serialize(wrong.families.powerLaw)).toBe(files.powerLaw);
  }, 600000);

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

describe('precision against a stated uncertainty (listed, not fixed)', () => {
  test('the findings are the ones recorded', () => {
    const found = widgetsOf(all).flatMap(([id, rec]) =>
      rec.en.precision.map(p => ({ widget: id, ...p }))
    );
    const wrote = Object.values(files).flatMap(text =>
      Object.entries(JSON.parse(text)).flatMap(([id, rec]) =>
        rec.en.precision.map(p => ({ widget: id, ...p }))
      )
    );
    const order = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
    expect([...found].sort(order)).toEqual([...wrote].sort(order));
  });
});
