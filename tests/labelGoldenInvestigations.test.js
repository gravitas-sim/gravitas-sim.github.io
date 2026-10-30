import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAG, serialize } from '../tools/label-golden.mjs';
import {
  COVERAGE_FILE,
  committed,
  coverageOf,
} from '../tools/label-golden-investigations.mjs';
import { fixed, roundSig } from '../js/format.js';
import { LOCALES } from './labelGolden/record.mjs';
import {
  familySites,
  recordInvestigations,
} from './labelGolden/investigations.mjs';

// =============================================================================
// The label golden, third family (Roadmap III, Prompt 144)
// -----------------------------------------------------------------------------
// What the lesson engine's figures (js/investigations/*, js/lesson/*) and the
// Observatory (js/observatory/**, js/observatoryPage.js) print, in English and
// Spanish, recorded before any of it is moved onto js/format.js. A migration
// that changes what a figure or a panel prints fails here with the surface.
//
// To accept a change on purpose:
//   npm run label:golden:investigations -- --regenerate-label-golden
// (in its own commit, with the diff read). What is recorded and how is in
// tests/labelGolden/investigations.mjs and docs/LABEL_GOLDEN.md.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

let all;
let files;
beforeAll(async () => {
  all = await recordInvestigations();
  files = committed();
}, 600000);

/** The calls no recording reaches, and why each one cannot be reached here. */
const UNREACHED = {
  'js/observatory/fitPanel.js:711':
    'the seconds a fit took, read from the clock when the run ends',
  'js/observatory/guidePanel.js:330':
    'a rounding inside the guide panel, which needs a mounted observation',
  'js/observatory/measurePanel.js:491':
    'a rounding inside the measure panel, which needs a mounted pipeline',
  'js/observatoryPage.js:542':
    "an imported file's size, written by the page's own script",
};
const lineOf = site => site.replace(/:\d+$/, '');

describe('the recording', () => {
  test('has a fixture for every surface and none for a surface that is gone', () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(all.surfaces).sort());
    expect(Object.keys(all.surfaces).sort()).toEqual([
      'aladin',
      'archive',
      'ellipse',
      'fieldNumbers',
      'fixtures',
      'plots',
      'rounded',
    ]);
  });

  test('matches every surface as it prints now', () => {
    const wrong = Object.entries(all.surfaces)
      .filter(([name, rec]) => files[name] !== serialize(rec))
      .map(([name]) => name);
    expect({
      wrong,
      how: `npm run label:golden:investigations -- ${FLAG}`,
    }).toEqual({
      wrong: [],
      how: `npm run label:golden:investigations -- ${FLAG}`,
    });
  });

  test('records both locales for every surface', () => {
    for (const rec of Object.values(all.surfaces)) {
      expect(Object.keys(rec)).toEqual(['en', 'es']);
      expect(rec.es === 'same' || typeof rec.es === 'object').toBe(true);
    }
    expect(LOCALES).toEqual(['en', 'es']);
    // The Spanish decimal comma is a decision of Prompt 282's; until it lands,
    // a computed field is the one place Spanish writes it, and a figure's ticks
    // and tables are the same in both languages.
    expect(all.surfaces.fieldNumbers.es).not.toBe('same');
    expect(all.surfaces.plots.es).toBe('same');
    expect(all.surfaces.fieldNumbers.es[2][2][1]).toBe('1,00');
  });

  test('is not hollow: every figure, every plot, every position, every pack', () => {
    const { ellipse, plots, archive, fixtures, rounded, aladin } = all.surfaces;
    expect(ellipse.en.positions).toBe(981);
    expect(ellipse.en.all.distinct).toBe(981);
    const steps = Object.values(plots.en).flatMap(l => Object.values(l));
    expect(steps.length).toBe(6);
    expect(steps.flatMap(s => Object.keys(s.variants)).length).toBeGreaterThan(
      14
    );
    for (const s of steps)
      for (const v of Object.values(s.variants))
        expect(v.calls).toBeGreaterThan(100);
    expect(archive.en).toHaveLength(6);
    expect(aladin.en.length).toBeGreaterThanOrEqual(10);
    expect(rounded.en.length).toBeGreaterThan(10);
    expect(Object.keys(fixtures.en.crowded)).toHaveLength(7);
    expect(fixtures.en.crowded['0.9923/0.8641']).toEqual([
      "crowding: the pipeline gives 99.2% of the aperture's light to this star (CROWDSAP 0.9923), and the aperture holds 86.4% of the star's light (FLFRCSAP 0.8641)",
    ]);
  });
});

describe('coverage', () => {
  test('every toFixed and toPrecision call in the family ran, or is listed with its reason', () => {
    expect(all.sites).toEqual(familySites());
    expect(all.sites).toHaveLength(12);
    const reached = new Set(all.reached);
    const unreached = all.sites.filter(s => !reached.has(s));
    expect(unreached.map(lineOf).sort()).toEqual(Object.keys(UNREACHED).sort());
    expect(readJson(COVERAGE_FILE)).toEqual(coverageOf(all));
    expect(coverageOf(all)).toMatchObject({ calls: 12, reached: 8 });
  });

  test('nothing is counted that is not in the family', () => {
    for (const s of all.reached)
      expect(s).toMatch(
        /^js\/(investigations\/|lesson\/|observatory\/|observatoryPage\.js)/
      );
  });
});

// What a swap of toFixed for js/format.js's fixed() would do, where fixed() is
// toFixed with U+2212 for a hyphen and '' for a value that is not finite. The
// stand-in below is that rule on the engine's own toFixed (fixed() itself calls
// it, so it cannot be swapped in); the test first shows it IS fixed().
const ladder = [
  0,
  -0,
  1,
  -1,
  0.5,
  -0.5,
  0.0004,
  -0.0004,
  12.3456,
  -12.3456,
  1e-7,
  -1e-7,
  1234.5678,
  99.9996,
  1e21,
  Number.NaN,
  Infinity,
  -Infinity,
];
const originalToFixed = Number.prototype.toFixed;
function swapped(digits) {
  const x = Number(this);
  if (!Number.isFinite(x)) return '';
  const text = originalToFixed.call(x, digits);
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
}

describe('what the recording can tell apart', () => {
  test('the stand-in for a naive swap is fixed(), digit for digit', () => {
    for (const x of ladder)
      for (const d of [0, 1, 3, 5])
        expect(swapped.call(x, d)).toBe(fixed(x, d));
  });

  test('a naive swap changes the plots and the computed fields and nothing else; that is why the sites move one by one', async () => {
    Number.prototype.toFixed = swapped;
    let moved;
    try {
      moved = await recordInvestigations({ coverage: false });
    } finally {
      Number.prototype.toFixed = originalToFixed;
    }
    const changed = Object.keys(all.surfaces).filter(
      name => serialize(moved.surfaces[name]) !== serialize(all.surfaces[name])
    );
    // stepView.js 643 (the plot table: a negative point, and Infinity), 801
    // (the slope) and 1194 (the field text) write a hyphen or a "NaN" a swap
    // would change; the ellipse readout, the archive label and the crowding
    // note never see a negative or a non-finite number and print the same.
    expect(changed).toEqual(['plots', 'fieldNumbers']);
  }, 600000);

  test('the sites that stay do see a hyphen or a non-finite number', () => {
    const cells = Object.values(all.surfaces.plots.en)
      .flatMap(l => Object.values(l))
      .flatMap(s => Object.values(s.variants))
      .flatMap(v => v.samples)
      .flatMap(sample => sample.table);
    expect(cells.some(c => c.startsWith('-'))).toBe(true);
    const slopes = Object.values(all.surfaces.plots.en)
      .flatMap(l => Object.values(l))
      .flatMap(s => Object.values(s.variants))
      .flatMap(v => v.samples)
      .flatMap(sample => sample.slope)
      .filter(x => x.startsWith('slope'));
    expect(slopes.some(x => x.startsWith('slope -'))).toBe(true);
    const fields = all.surfaces.fieldNumbers.en[2];
    expect(fields.some(([, out]) => out.startsWith('-'))).toBe(true);
    expect(fields.find(([x]) => x === 'NaN')[1]).toBe('');
  });

  test('per site: the sites that stayed wrote a hyphen, or are machine text, or are not reached', () => {
    // Recorded on the tree before the move: the four calls that moved
    // (stepView.js 541 and 544, archivePanel.js 257 and 258) wrote no hyphen
    // and were handed no number that is not finite, on every reading of their
    // surfaces. The two in fixtures.js are as eligible and wait for a request
    // (js/format.js is not loaded by /observatory/ at start).
    const at = site => all.hazards[site] ?? { hyphen: false, nonFinite: false };
    for (const site of [
      'js/investigations/stepView.js:643:11',
      'js/investigations/stepView.js:801:35',
      'js/investigations/stepView.js:1194:13',
      'js/observatory/guides/core.js:320:27',
    ])
      expect(at(site).hyphen).toBe(true);
    // The archive panel's link is a URL, which wants a hyphen: it stays.
    for (const site of [
      'js/observatory/fixtures.js:143:73',
      'js/observatory/fixtures.js:143:211',
      'js/observatory/archivePanel.js:94:24',
      'js/observatory/archivePanel.js:94:59',
    ])
      expect(at(site)).toEqual({ hyphen: false, nonFinite: false });
  });

  test('the four sites that moved now call fixed()', () => {
    const lines = (file, ...numbers) =>
      readFileSync(path.join(ROOT, file), 'utf8')
        .split('\n')
        .filter((_, i) => numbers.includes(i + 1));
    for (const line of [
      ...lines('js/investigations/stepView.js', 541, 544),
      ...lines('js/observatory/archivePanel.js', 258, 259),
    ])
      expect(line).toMatch(/fixed\(/);
  });

  test('the sites that move never see either: eccentricity is the slider, a position is Sesame within range, a crowding fraction is in (0, 1]', () => {
    const e = all.surfaces.ellipse.en.all;
    expect(
      e.samples.every(s => !/[-−]|NaN|Infinity/.test(JSON.stringify(s)))
    ).toBe(true);
    for (const row of all.surfaces.ellipse.en.rows)
      expect(JSON.stringify(row.read)).not.toMatch(/[-−]|NaN/);
    for (const pos of all.surfaces.archive.en)
      expect(pos.position).toMatch(/RA \d+\.\d{5}°, Dec [+−]\d+\.\d{5}°/);
    for (const note of Object.values(all.surfaces.fixtures.en.crowded))
      expect(note[0]).toMatch(/gives \d+\.\d% of .* holds \d+\.\d% of/);
  });
});

describe('Node 20 and Node 24 differ in the last place of some Math functions', () => {
  // The figures take Math.log10 (log axes, the tick step) and Math.pow (the
  // step's size); the lesson world takes atan2, exp and log. CI is Node 20 and
  // the recording was made on Node 24, and a stored value that passes through
  // one of them unmasked failed CI once (Prompt 144's widget golden). Every
  // sixteenth call to each is one unit in the last place wrong, and nothing
  // recorded moves: what is stored is rounded far above that noise, masked
  // (maskNoise) or not stored (the tick labels, whose step is a logarithm at a
  // whole number: perturbing log10 once moved "10" to "10.0").
  const wrong = new Float64Array(1);
  const bits = new BigUint64Array(wrong.buffer);
  const nudge = (x, up) => {
    if (!Number.isFinite(x) || x === 0) return x;
    wrong[0] = x;
    bits[0] += x > 0 === up ? 1n : -1n;
    return wrong[0];
  };
  test('one unit in the last place on one call in sixteen moves no surface', async () => {
    const names = ['log10', 'pow', 'log', 'exp', 'atan2'];
    const originals = Object.fromEntries(names.map(n => [n, Math[n]]));
    let calls = 0;
    for (const n of names)
      Math[n] = function perturbed(...args) {
        const v = originals[n].apply(Math, args);
        calls++;
        return calls % 16 === 0 ? nudge(v, calls % 32 === 0) : v;
      };
    let moved;
    try {
      moved = await recordInvestigations({ coverage: false });
    } finally {
      for (const n of names) Math[n] = originals[n];
    }
    expect(calls).toBeGreaterThan(10000);
    const changed = Object.keys(all.surfaces).filter(
      name => serialize(moved.surfaces[name]) !== serialize(all.surfaces[name])
    );
    expect(changed).toEqual([]);
  }, 600000);
});

describe('roundSig, which the waiting sites will use', () => {
  // js/observatory/guides/core.js (a bundle source), guidePanel.js and
  // measurePanel.js round with Number(x.toPrecision(n)). roundSig is that
  // expression, so the move is identical on every input, including the ones
  // the recording would not visit; the sites wait for a place to be recorded
  // (core.js is recorded, and is an instructor-bundle source).
  const values = [
    0,
    -0,
    1,
    -1,
    0.1,
    0.123456789,
    1234.56789,
    1234567.891,
    -0.000123456789,
    6.0221409e23,
    1e-9,
    2.99792458e8,
    1e21,
    5e-324,
    Number.NaN,
    Infinity,
    -Infinity,
  ];
  test('is Number(x.toPrecision(n)) for every value, with the same bits', () => {
    for (const x of values)
      for (const n of [3, 6])
        expect(Object.is(roundSig(x, n), Number(x.toPrecision(n)))).toBe(true);
  });
  test('is +x.toPrecision(3) too', () => {
    for (const x of values)
      expect(Object.is(roundSig(x, 3), +x.toPrecision(3))).toBe(true);
  });
});
