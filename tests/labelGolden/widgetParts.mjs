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
} from '../../tools/label-golden.mjs';
import { LOCALES } from './record.mjs';
import { recordWidgets, widgetSites } from './widgets.mjs';

// =============================================================================
// The instrument-widget label golden, run in parts
// -----------------------------------------------------------------------------
// Recording all 27 widget families in one Jest suite took 250 to 450 seconds on
// CI, which held the whole test job past its time limit. The families do not
// depend on one another (every one of them reads the same as when it is
// recorded alone, which tests/labelGoldenWidgets.test.js's guard and each
// part's own match check both hold), so the recording is split by family into
// the parts below, one suite each, and Jest runs the suites side by side.
//
// Nothing is dropped by splitting:
//   - PARTS names every family exactly once, and the guard in
//     tests/labelGoldenWidgets.test.js fails when a family is in none of the
//     parts or in two of them. A new family fails that guard until it is added
//     to a part here.
//   - Each part makes every check the single suite made, about its own
//     families: the fixture match, both locales, the widgets that threw, the
//     call sites reached and not reached (in that family's own module), and the
//     precision findings. The checks that were over the whole recording (how
//     many widgets, the "not hollow" totals, the threw list as a whole) are
//     made in the guard from the committed fixtures, which each part proves
//     are what the widgets print.
// =============================================================================

/**
 * The parts, by family. Sized by the measured time of each family so the
 * suites are of similar length (seconds on a developer's Mac, 2026-10, with
 * the call-site report on): gw 35; survey 31; stellarEvolution 21 + stellar 11;
 * powerLaw 22 + lensing 7; detector 18 + sky 11; the other 19 families 28
 * together (and the toFixed swap test, 6). The engine-Math test (25) is a suite
 * of its own, tests/labelGoldenWidgetsEngineMath.test.js.
 */
export const PARTS = Object.freeze({
  gw: ['gw'],
  survey: [
    'survey',
    'claim',
    'imaging',
    'jovian',
    'atmosphere',
    'crater',
    'tides',
    'sun',
    'smallBodies',
  ],
  stellar: ['stellarEvolution', 'stellar'],
  powerLaw: ['powerLaw', 'lensing'],
  detector: [
    'detector',
    'sky',
    'telescope',
    'exposure',
    'effects',
    'strategy',
    'photcal',
    'surveyDesign',
    'spectrograph',
  ],
  rest: [
    'eclipse',
    'clusterFit',
    'masses',
    'activity',
    'remnants',
    'vetting',
    'directImaging',
    'ttv',
    'occurrence',
    'joint',
    'energy',
    'binary',
    'blackHole',
    'habitability',
    'habitabilityLimits',
    'exoplanet',
    'tidal',
    'darkMatter',
    'chaos',
    'resonance',
    'observing',
    'spectra',
    'transit',
    'light',
    'interiors',
    'variables',
    'variablesII',
    'galactic',
    'cosmology',
    'compare',
    'gwEvents',
  ],
});

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
export const readJson = rel =>
  JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

/** Every widget of a recording as `[id, record]`. */
export const widgetsOf = rec =>
  Object.values(rec.families).flatMap(f => Object.entries(f));

/** The module (as `js/xWidgets.js`) each family's instruments live in. */
export async function familyModules() {
  const { LAZY_FAMILIES } = await import('../../js/widgets.js');
  return Object.fromEntries(
    Object.entries(LAZY_FAMILIES).map(([family, entry]) => [
      family,
      `js/${entry.path.replace(/^\.\//, '')}`,
    ])
  );
}

/**
 * The checks of one part: the recording of `PARTS[name]`, against the fixtures
 * of those families.
 * @param {string} name - a key of PARTS
 */
export function describeWidgetPart(name) {
  const families = PARTS[name];
  let all;
  let files;
  let modules;
  beforeAll(async () => {
    all = await recordWidgets({ only: families });
    files = committedWidgets();
    modules = await familyModules();
  }, 600000);

  describe(`the recording, part "${name}"`, () => {
    test('recorded the families of the part, and only those', () => {
      expect(Object.keys(all.families)).toEqual(
        Object.keys(modules).filter(f => families.includes(f))
      );
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
      expect(widgets.length).toBeGreaterThan(0);
      for (const [, rec] of widgets) {
        expect(rec.en.frames).toBeGreaterThan(0);
        // Spanish is either the same recording or its own.
        expect(rec.es === 'same' || typeof rec.es === 'object').toBe(true);
      }
      expect(LOCALES).toEqual(['en', 'es']);
    });

    test('says where a widget threw, and the list is the one recorded', () => {
      // A widget that threw while it was read is a reading the golden cannot
      // vouch for, so the list is held and a new entry fails here.
      const mine = new Set(widgetsOf(all).map(([id]) => id));
      expect(widgetCoverageOf(all).threw).toEqual(
        readJson(WIDGET_COVERAGE_FILE).threw.filter(id => mine.has(id))
      );
    });

    test('reaches the call sites of its families that the record says it reaches, and no others', () => {
      // The sites are the lines of js/*Widgets.js that call toFixed or
      // toPrecision; a family reaches the ones in its own module. The record
      // lists the sites the whole recording cannot reach, so the sites this
      // part must reach are its modules' sites minus that list, and the
      // sites it must not are the list's entries in those modules.
      const committed = readJson(WIDGET_COVERAGE_FILE);
      const mine = new Set(families.map(f => modules[f]));
      const inPart = site => mine.has(site.split(':')[0]);
      const sites = widgetSites().filter(inPart);
      const unreached = new Set(committed.unreached);
      expect(all.reached).toEqual(sites.filter(s => !unreached.has(s)));
      expect(widgetCoverageOf(all).unreached.filter(inPart)).toEqual(
        committed.unreached.filter(inPart)
      );
    });

    test('precision against a stated uncertainty: the findings are the ones recorded', () => {
      const found = widgetsOf(all).flatMap(([id, rec]) =>
        rec.en.precision.map(p => ({ widget: id, ...p }))
      );
      const wrote = families.flatMap(family =>
        Object.entries(JSON.parse(files[family])).flatMap(([id, rec]) =>
          rec.en.precision.map(p => ({ widget: id, ...p }))
        )
      );
      const order = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
      expect([...found].sort(order)).toEqual([...wrote].sort(order));
    });
  });
}

/**
 * What the recording can tell apart: a naive swap of toFixed for
 * format.fixed changes what the energy budget, the dark-matter slope and the
 * detector time axis print, and a wrapper does not. (Three widgets keep state
 * between two recordings in one process, stellar-lab, stellar-evolution and
 * gw-lab, so the proof runs on families that do not.)
 */
export function describeToFixedSwap() {
  const SWAP = ['energy', 'darkMatter', 'gwEvents'];
  describe('what the recording can tell apart', () => {
    test('a naive swap of toFixed for format.fixed is not identity, and a wrapper is', async () => {
      const files = committedWidgets();
      const { fixed } = await import('../../js/format.js');
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
}

/**
 * The recording does not depend on the engine's Math. CI runs Node 20 and a
 * developer's machine a newer Node; V8's Math.pow, log and atan2 differ in the
 * last digit between them. The power-law instrument prints the precession of a
 * Newtonian ellipse, which is exactly zero, so what it prints is integration
 * noise: the recording writes a number below the family's noise floor as a zero
 * of the same shape (maskNoise). Here Math is made wrong in the last digit on
 * one call in sixteen, and the recording must not move from the fixture.
 */
export function describeEngineMath() {
  describe("the recording does not depend on the engine's Math", () => {
    test('the power-law family reads the same when pow, log, atan2 and hypot are a unit in the last place off', async () => {
      const files = committedWidgets();
      const lab = await import('../../js/powerLawLab.js');
      const names = ['pow', 'log', 'log10', 'atan2', 'hypot'];
      const original = Object.fromEntries(names.map(n => [n, Math[n]]));
      // Written for speed and not for looks: the recording makes some 770
      // million of these calls, and a rest-parameter wrapper that read the
      // global Math and Number on every one took 150 seconds under Jest. The
      // arity is kept, and the sequence of perturbed calls is the same.
      const { imul } = Math;
      const { EPSILON } = Number;
      let k = 0;
      const off = r => {
        k = imul(k + 1, 2654435761) >>> 0;
        return (k >>> 8) % 16 === 0
          ? r * (1 + ((k >>> 16) & 1 ? 1 : -1) * EPSILON)
          : r;
      };
      Math.pow = (a, b) => off(original.pow(a, b));
      Math.log = a => off(original.log(a));
      Math.log10 = a => off(original.log10(a));
      Math.atan2 = (a, b) => off(original.atan2(a, b));
      Math.hypot = function hypot(a, b, c) {
        const n = arguments.length;
        return off(
          n === 2
            ? original.hypot(a, b)
            : n === 1
              ? original.hypot(a)
              : n === 3
                ? original.hypot(a, b, c)
                : original.hypot.apply(null, arguments)
        );
      };
      let wrong;
      try {
        // The lab remembers a measurement by exponent: forget the ones made
        // with the engine's own Math, so these are made with the wrong one.
        lab.resetLabForTests();
        wrong = await recordWidgets({ coverage: false, only: ['powerLaw'] });
      } finally {
        for (const n of names) Math[n] = original[n];
        lab.resetLabForTests();
      }
      expect(k).toBeGreaterThan(1000);
      expect(serialize(wrong.families.powerLaw)).toBe(files.powerLaw);
    }, 600000);
  });
}
