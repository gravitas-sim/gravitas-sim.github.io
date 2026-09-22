// =============================================================================
// Two things a reader could not do without a pointer or without sight
// -----------------------------------------------------------------------------
// ACCESSIBILITY.md listed both as honest limitations: building an arbitrary
// system by hand was not a keyboard task, and the numbers behind the plotted
// measurements were only available by reading a chart. This file checks the
// parts of both fixes that can be checked without a browser - the schema, the
// validation, the CSV round-trip and the sampling - and holds the wiring that
// makes them the same data as the plot and the same creation path as a click.
//
// The browser half is e2e/accessibilityParity.spec.js. Neither is sufficient:
// this file cannot tell whether the form is operable and that one cannot tell
// whether a blank mass really reaches the constructor as null.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  LIMITS,
  MASS_FIELD,
  PLACEABLE_TYPES,
  STATE_FIELDS,
  TYPE_NAME_KEY,
  simToAu,
  validatePlacement,
} from '../js/place/preciseFields.js';
import { toCsv, fromCsv } from '../js/csv.js';
import {
  buildSeriesTable,
  describeTable,
  headingFor,
  sampleRows,
  MAX_ROWS,
} from '../js/seriesTable.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = f => readFileSync(path.join(root, f), 'utf8');

describe('the precise-placement schema', () => {
  test('it covers exactly the eight types placeBody() builds', () => {
    // The list in js/ui.js is the authority. A ninth type added there and not
    // here would be placeable by pointer and not by keyboard, which is the
    // asymmetry this whole slice exists to remove.
    const ui = read('js/ui.js');
    const built = [...ui.matchAll(/type === '(\w+)'\) \{?\s*obj = new/g)].map(
      m => m[1]
    );
    for (const type of built) expect(PLACEABLE_TYPES).toContain(type);
    expect(PLACEABLE_TYPES).toHaveLength(8);
  });

  test('every type names a mass unit and a plausible range', () => {
    for (const type of PLACEABLE_TYPES) {
      const spec = MASS_FIELD[type];
      expect(spec.unit).toBeTruthy();
      expect(spec.min).toBeGreaterThan(0);
      expect(spec.max).toBeGreaterThan(spec.min);
      // The suggested value has to be inside the range it is suggested from.
      expect(spec.placeholder).toBeGreaterThanOrEqual(spec.min);
      expect(spec.placeholder).toBeLessThanOrEqual(spec.max);
      expect(TYPE_NAME_KEY[type]).toMatch(/^objectName\./);
    }
  });

  test('a white dwarf cannot be asked for above the Chandrasekhar limit', () => {
    // Not arbitrary bounds: this one is physics, and a form that accepts a
    // 3-solar-mass white dwarf is teaching something false before the body
    // even exists.
    expect(MASS_FIELD.WhiteDwarf.max).toBeCloseTo(1.44, 2);
    expect(validatePlacement('WhiteDwarf', { mass: '2' }).ok).toBe(false);
    expect(validatePlacement('WhiteDwarf', { mass: '0.6' }).ok).toBe(true);
  });

  test('a filled-in form becomes placeBody arguments', () => {
    const v = validatePlacement('Star', {
      x: '100',
      y: '-50',
      vx: '0',
      vy: '4.47',
      mass: '1',
    });
    expect(v.ok).toBe(true);
    expect(v.at).toEqual({ x: 100, y: -50 });
    expect(v.vel).toEqual({ x: 0, y: 4.47 });
    expect(v.mass).toBe(1);
  });

  test('a blank mass is null, not zero', () => {
    // The difference between "whatever a click would have chosen" and a
    // zero-mass star. placeBody hands null to the constructor, which
    // randomizes exactly as the pointer path does.
    const v = validatePlacement('Star', { x: '0', y: '0' });
    expect(v.ok).toBe(true);
    expect(v.mass).toBeNull();
    // And a blank position is the origin, a blank velocity is at rest.
    expect(v.at).toEqual({ x: 0, y: 0 });
    expect(v.vel).toEqual({ x: 0, y: 0 });
  });

  test('a blank field and a typo are told apart', () => {
    expect(validatePlacement('Star', { x: '' }).ok).toBe(true);
    const bad = validatePlacement('Star', { x: 'abc' });
    expect(bad.ok).toBe(false);
    expect(bad.errors).toEqual([
      { field: 'x', key: 'place.precise.error.number', vars: {} },
    ]);
  });

  test('every error names the field it is about', () => {
    const v = validatePlacement('Star', {
      x: 'abc',
      y: '1e99',
      vx: 'oops',
      mass: '-4',
    });
    expect(v.ok).toBe(false);
    // Four problems, four fields, each addressable - which is what lets the
    // dialog attach each message to its own input instead of piling them into
    // a summary a reader has to match up by hand.
    expect(v.errors.map(e => e.field).sort()).toEqual(['mass', 'vx', 'x', 'y']);
    for (const e of v.errors) expect(e.key).toMatch(/^place\.precise\.error\./);
  });

  test('nothing is returned when anything is wrong', () => {
    // A partially valid form must not place a body at the fields that parsed.
    const v = validatePlacement('Star', { x: '10', y: 'abc' });
    expect(v.at).toBeNull();
    expect(v.vel).toBeNull();
    expect(v.mass).toBeNull();
  });

  test('an unknown type is refused rather than defaulted', () => {
    const v = validatePlacement('Spaceship', { x: '0' });
    expect(v.ok).toBe(false);
    expect(v.errors[0].field).toBe('type');
  });

  test('the bounds are enforced in both directions', () => {
    for (const { key, kind } of STATE_FIELDS) {
      const limit = LIMITS[kind];
      expect(validatePlacement('Star', { [key]: String(limit) }).ok).toBe(true);
      expect(validatePlacement('Star', { [key]: String(limit * 1.1) }).ok).toBe(
        false
      );
      expect(
        validatePlacement('Star', { [key]: String(-limit * 1.1) }).ok
      ).toBe(false);
    }
  });

  test('100 simulation units is 1 AU', () => {
    expect(simToAu(100)).toBe(1);
    expect(simToAu(-250)).toBe(-2.5);
  });
});

describe('the precise form and the pointer path are one path', () => {
  const ui = read('js/ui.js');
  const dialog = read('js/precisePlacement.js');

  test('the dialog calls placeBody and constructs nothing itself', () => {
    expect(dialog).toMatch(
      /placeBody\(verdict\.at, verdict\.vel, type, mass\)/
    );
    // The failure this guards: somebody "simplifies" the dialog by newing up a
    // Planet directly, and a hand-typed body stops going through the list
    // dispatch, the undo stack and the placement event.
    expect(dialog).not.toMatch(/new (Planet|StarObject|BlackHole|Comet)\(/);
  });

  test('it does not import the coordinator it is called from', () => {
    // placeBody is handed down. A feature module importing js/ui.js back is,
    // in tools/check-architecture.mjs's words, the same tangle with an extra
    // file - and it would close a cycle.
    expect(dialog).not.toMatch(/from '\.\/ui\.js'/);
    expect(dialog).toMatch(/openPrecisePlacement\(\{ placeBody, trigger \}/);
  });

  test('placeBody defaults its mass to null, so a click is unchanged', () => {
    expect(ui).toMatch(/export function placeBody\([\s\S]{0,160}mass = null/);
    // Asteroid's own third argument defaults to 1.0 rather than null, so
    // passing null would change what a click builds. It is the one branch that
    // must not receive it.
    expect(ui).toMatch(
      /m === null \? new Asteroid\(at, vel\) : new Asteroid\(at, vel, m\)/
    );
  });

  test('the placement event still fires, so undo still works', () => {
    // The undo stack listens for this and nothing else. A body added by the
    // form that skipped it would be unremovable by the undo button, which is
    // the "preserve history behaviour" requirement in one assertion.
    expect(ui).toMatch(/new CustomEvent\('gravitasObjectPlaced'/);
    expect(read('js/controls.js')).toMatch(
      /addEventListener\('gravitasObjectPlaced'/
    );
  });
});

describe('a table and its download are the same bytes', () => {
  test('fromCsv is the exact inverse of toCsv', () => {
    const rows = [
      ['t_days', 'flux_relative', 'note'],
      ['0', '1', 'plain'],
      ['0.5', '0.991', 'has,comma'],
      ['1', '1', 'has"quote'],
      ['1.5', '1', 'has\nnewline'],
      ['2', '1', '=formula'],
      ['2.5', '1', ''],
    ];
    expect(fromCsv(toCsv(rows))).toEqual(rows);
  });

  test('an empty document is no rows rather than one blank one', () => {
    expect(fromCsv('')).toEqual([]);
  });

  test('CRLF is one terminator, not two', () => {
    expect(fromCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  test('the table is built from the exported CSV and matches it row for row', () => {
    const rows = [['t_days', 'flux_relative']];
    for (let i = 0; i < 12; i++) rows.push([String(i), String(1 - i / 1000)]);
    const built = buildSeriesTable(toCsv(rows));
    expect(built.rows).toBe(12);
    expect(built.shown).toBe(12);
    expect(built.sampled).toBe(false);
    const cells = [...built.table.querySelectorAll('tbody tr')].map(tr =>
      [...tr.children].map(c => c.textContent)
    );
    expect(cells).toEqual(rows.slice(1));
  });

  test('the first column is a row header, so a reading says what it is about', () => {
    const built = buildSeriesTable(
      toCsv([
        ['t_days', 'flux_relative'],
        ['3.2', '0.991'],
      ])
    );
    const cells = built.table.querySelectorAll('tbody tr > *');
    expect(cells[0].tagName).toBe('TH');
    expect(cells[0].getAttribute('scope')).toBe('row');
    expect(cells[1].tagName).toBe('TD');
    for (const th of built.table.querySelectorAll('thead th')) {
      expect(th.getAttribute('scope')).toBe('col');
    }
  });

  test('a column name carries its unit into the heading', () => {
    // The unit is split off the column name here, not translated: `t_days` is
    // days in every language. These run without a catalog, so `label` is the
    // fallback - the column's own words - and the catalog half is the test
    // below.
    expect(headingFor('t_days').unit).toBe('days');
    expect(headingFor('r_au').unit).toBe('AU');
    expect(headingFor('v_kms').unit).toBe('km/s');
    expect(headingFor('rv_ms').unit).toBe('m/s');
    expect(headingFor('mass_solar').unit).toBe('solar masses');
  });

  test('both catalogs name every column the exporters write', () => {
    // The fallback turns `t_days` into "t", which is a legible last resort and
    // not a heading anybody should see. The catalog is what makes it "Time",
    // so a column without an entry is a real gap even though nothing throws.
    const en = read('js/i18n/en.placement.js');
    const es = read('js/i18n/es.placement.js');
    const dataExport = read('js/dataExport.js');
    const columns = [...dataExport.matchAll(/^\s*'([a-z0-9_]+)',$/gm)].map(
      m => m[1]
    );
    const named = new Set(
      [...en.matchAll(/'series\.column\.([a-z0-9_]+)'/g)].map(m => m[1])
    );
    expect(columns.length).toBeGreaterThan(8);
    for (const column of columns) {
      if (!named.has(column)) continue; // not every column is table-facing
      expect(es).toContain(`'series.column.${column}'`);
    }
    // The ones the three instructional plots put on screen must all be there.
    for (const column of [
      't_days',
      'flux_relative',
      'rv_ms',
      'r_au',
      'v_kms',
    ]) {
      expect({ column, named: named.has(column) }).toEqual({
        column,
        named: true,
      });
      expect(es).toContain(`'series.column.${column}'`);
    }
  });

  test('an unknown column falls back to its own words, not to a guess', () => {
    // A column added to an exporter tomorrow gets a readable heading rather
    // than an untranslated message id - and never an invented unit.
    expect(headingFor('wobble_factor')).toEqual({
      label: 'wobble factor',
      unit: '',
    });
  });
});

describe('a long series is sampled, not dumped', () => {
  test('a short series is left alone', () => {
    const rows = Array.from({ length: 10 }, (_, i) => [String(i)]);
    expect(sampleRows(rows)).toEqual({ rows, stride: 1, sampled: false });
  });

  test('a long one is thinned and says so', () => {
    const rows = Array.from({ length: 4000 }, (_, i) => [String(i)]);
    const out = sampleRows(rows);
    expect(out.sampled).toBe(true);
    expect(out.rows.length).toBeLessThanOrEqual(MAX_ROWS + 1);
    // The ends are what tell a reader the span they are looking at, so an even
    // stride that dropped the last row would understate it.
    expect(out.rows[0]).toEqual(['0']);
    expect(out.rows[out.rows.length - 1]).toEqual(['3999']);
  });

  test('the caption reports the sampling rather than hiding it', () => {
    // A table that silently showed 200 of 1000 rows would be a worse lie than
    // no table at all: a reader would conclude the run was 200 samples long.
    // Without a catalog t() answers with the key, so what is checked here is
    // that the sampled key is the one chosen - and, below, that the string
    // behind it carries the numbers.
    const rows = [['t_days']];
    for (let i = 0; i < 1000; i++) rows.push([String(i)]);
    const built = buildSeriesTable(toCsv(rows));
    expect(built.sampled).toBe(true);
    expect(describeTable('Light curve', built)).toBe('series.table.sampled');

    const en = read('js/i18n/en.placement.js');
    // Read across the wrap: prettier puts a long catalog value on its own
    // line, so a single-line lookup finds the key and none of the string.
    const at = en.indexOf("'series.table.sampled'");
    const entry = en.slice(at, en.indexOf('\n', en.indexOf("',", at)));
    for (const slot of ['{name}', '{shown}', '{rows}', '{stride}']) {
      expect({ slot, present: entry.includes(slot) }).toEqual({
        slot,
        present: true,
      });
    }
  });

  test('an empty series says it is empty rather than rendering a bare header', () => {
    const built = buildSeriesTable(toCsv([['t_days', 'flux_relative']]));
    expect(built.rows).toBe(0);
    expect(describeTable('Light curve', built)).toBe('series.table.empty');
    expect(read('js/i18n/en.placement.js')).toMatch(
      /'series\.table\.empty': '\{name\}: nothing recorded/
    );
  });
});

describe('the plot tables come from the plots', () => {
  const exportDialog = read('js/exportDialog.js');
  const dataExport = read('js/dataExport.js');

  test('the table renders what the download writes', () => {
    // One build() call feeds both. The alternative is two row-builders that
    // agree until one is changed.
    expect(exportDialog).toMatch(/buildSeriesTable\(row\.build\(\)\.csv\)/);
  });

  test('the rotation curve export reads the state the plot draws', () => {
    expect(dataExport).toMatch(/const snap = rotationCurveState\(\);/);
    // point.speed is what js/rotationCurve.js puts on the vertical axis.
    // Exporting the tangential component under the same name would produce a
    // file that quietly disagrees with the picture.
    expect(dataExport).toMatch(/num\(toKms\(p\.speed\)\)/);
    expect(read('js/rotationCurve.js')).toMatch(/Y\(p\.speed\)/);
  });

  test('every plot a graded investigation reads has an export row', () => {
    for (const key of [
      'lightcurve',
      'radialvelocity',
      'rotationcurve',
      'transits',
      'trajectories',
    ]) {
      expect(exportDialog).toContain(`key: '${key}'`);
    }
  });

  test('the renderer is loaded on demand', () => {
    // The deferred bundle has very little room. A reader who only downloads
    // files should not pay for the table renderer.
    expect(exportDialog).toMatch(/await import\('\.\/seriesTable\.js'\)/);
    expect(read('js/ui.js')).toMatch(
      /await import\('\.\/precisePlacement\.js'\)/
    );
  });
});

describe('ACCESSIBILITY.md narrowed only what was fixed', () => {
  // The same arrangement that holds the PDF section honest in
  // tests/instructorMaterials.test.js. A limitations section is the easiest
  // kind of prose to let rot: nothing breaks when it becomes wrong, it just
  // goes on describing software that no longer exists - or, worse, claims a
  // gap was closed that was not.
  const doc = read('ACCESSIBILITY.md');

  test('it claims a keyboard path, and there is one', () => {
    expect(doc).toMatch(/Precise placement/);
    expect(doc).toMatch(/same `placeBody\(\)` the canvas does/);
    expect(() => read('js/precisePlacement.js')).not.toThrow();
    expect(read('index.html')).toContain('id="precisePlaceBtn"');
  });

  test('it claims a table for each plotted series, and there is one', () => {
    expect(doc).toMatch(/offers each series as a\s*\n?table/);
    expect(() => read('js/seriesTable.js')).not.toThrow();
    expect(read('js/exportDialog.js')).toMatch(/buildSeriesTable/);
  });

  test('it still says the curve shape is not narrated', () => {
    // The limitation that was NOT solved, and must not quietly disappear the
    // next time somebody tidies this section. There is no narration and there
    // is not going to be a heuristic one.
    expect(doc).toMatch(/shape of a curve is not narrated/i);
    expect(doc).toMatch(/heuristic guess/);
  });

  test('it still says the drag gesture has no equivalent', () => {
    expect(doc).toMatch(/Dragging to \*feel\* how fast a throw is/);
  });

  test('it does not claim the old limitations are gone', () => {
    // The sentences that were true before this branch and would be false now.
    expect(doc).not.toMatch(
      /building\s+an arbitrary system by hand is not currently a keyboard task/
    );
    expect(doc).not.toMatch(/Direct manipulation has no keyboard equivalent/);
  });

  test('it does not overclaim that any of this was tested with a reader', () => {
    // Same rule as everywhere else in this project: tools existing is not
    // evidence that anybody can use them.
    const forbidden =
      /\b(accessible|usable) (to|for|by) (blind|visually impaired|low.vision|screen.reader)/i;
    for (const file of ['README.md', 'ACCESSIBILITY.md', 'index.html']) {
      expect({ file, claim: forbidden.test(read(file)) }).toEqual({
        file,
        claim: false,
      });
    }
    expect(doc).toMatch(/nothing here\s*\n?substitutes for testing with one/);
  });
});
