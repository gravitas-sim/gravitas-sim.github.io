import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The observation workspace's contracts, without a page
// -----------------------------------------------------------------------------
// OBSERVATORY_WORKSPACE_DESIGN.md describes them. What these hold:
//   - units: what converts, what is refused and why, and that a unit is
//     never guessed;
//   - the schema: every fixture is valid, and each broken contract is named;
//   - changes: each transformation, replayed, gives the right numbers, a
//     change that cannot be made is refused before it is kept, and undo and
//     redo walk the list;
//   - the selection is shared, and a view is told who changed it;
//   - import: CSV, TSV, semicolons, comments, missing values, malformed files,
//     JSON rows, columns and a round trip;
//   - export: the same changes give the same bytes, and a CSV disarms text;
//   - world coordinates: two independent formulations of TAN agree;
//   - the fixtures are authentic: every number copied from a provenance
//     record is that record's.
// =============================================================================

import {
  cannotConvert,
  cannotConvertTime,
  conversionFactor,
  formatUnit,
  parseUnit,
  timeOffset,
} from '../js/observatory/units.js';
import {
  columnOf,
  maskedRows,
  missingCount,
  rowCount,
  validateObservation,
} from '../js/observatory/schema.js';
import { OPS, replay, whyNot } from '../js/observatory/transforms.js';
import { createHistory } from '../js/observatory/history.js';
import { createSelection } from '../js/observatory/selection.js';
import { build, read, LIMITS } from '../js/observatory/import.js';
import {
  observationCsv,
  observationJson,
  sameObservation,
} from '../js/observatory/export.js';
import { separation, skyOf, unusableWcs } from '../js/observatory/wcs.js';
import {
  FIXTURES,
  GWOSC_CATALOGS,
  SDSS_STARS,
  openFixture,
} from '../js/observatory/fixtures.js';
import { fromCsv } from '../js/csv.js';
import { RECORDS as SDSS_RECORDS } from '../js/data/spectra/sdssSpectraProvenance.js';
import { PROVENANCE as GWOSC_PROVENANCE } from '../js/data/gw/gwoscEventsProvenance.js';

const unit = s => parseUnit(s).unit;

/** A small time series, built by hand, for the transformations. */
function series() {
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'time-series',
    id: 'test:series',
    title: 'test',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'test', version: null },
    credit: 'test',
    license: { status: 'cc0' },
    retrieved: null,
    citations: [],
    reductions: [],
    columns: [
      {
        id: 't',
        name: 'time',
        unit: 'd',
        role: 'x',
        values: Float64Array.from([0, 1, 2, 3, 4, 5]),
      },
      {
        id: 'f',
        name: 'flux',
        unit: 'ppm',
        role: 'value',
        values: Float64Array.from([10, 12, NaN, 14, 16, 18]),
      },
      {
        id: 'e',
        name: 'error',
        unit: 'ppm',
        role: 'uncertainty',
        of: 'f',
        values: Float64Array.from([1, 1, 1, 1, 1, 1]),
      },
    ],
    axes: { x: 't', y: 'f' },
    time: { column: 't', format: 'BTJD', scale: 'TDB' },
    masks: [],
    annotations: [],
  };
}

describe('units', () => {
  test('are read as the data spells them, scale and medium included', () => {
    expect(parseUnit('1e-17 erg / s / cm^2 / Angstrom')).toEqual({
      ok: true,
      unit: { id: 'erg/s/cm2/Angstrom', scale: 1e-17 },
    });
    expect(parseUnit('Angstrom, vacuum')).toEqual({
      ok: true,
      unit: { id: 'Angstrom', scale: 1 },
      medium: 'vacuum',
    });
    expect(parseUnit('M_sun').unit.id).toBe('Msun');
    expect(parseUnit('MPC').unit.id).toBe('Mpc');
  });

  test('not stated is its own answer, and never a guess', () => {
    expect(parseUnit(null)).toEqual({ ok: true, unit: null });
    expect(parseUnit('')).toEqual({ ok: true, unit: { id: '', scale: 1 } });
    // Short ids need their case: M is not a metre, S is not a second.
    expect(parseUnit('M').ok).toBe(false);
    expect(parseUnit('S').ok).toBe(false);
    expect(parseUnit('furlongs').reason).toMatch(
      /not a unit this workspace knows/
    );
    expect(formatUnit(null)).toBe('unit not stated');
    expect(formatUnit(unit('1e-17 erg/s/cm2/Angstrom'))).toBe(
      '10^-17 erg s⁻¹ cm⁻² Å⁻¹'
    );
  });

  test('convert within a dimension by the right factor', () => {
    expect(conversionFactor(unit('Angstrom'), unit('nm'))).toBeCloseTo(0.1, 15);
    expect(conversionFactor(unit('d'), unit('h'))).toBe(24);
    expect(conversionFactor(unit('ppm'), unit(''))).toBe(1e-6);
    // One W m^-2 nm^-1 is a hundred erg s^-1 cm^-2 Angstrom^-1, absolutely.
    expect(conversionFactor(unit('W/m2/nm'), unit('erg/s/cm2/Angstrom'))).toBe(
      100
    );
    expect(conversionFactor(unit('Mpc'), unit('pc'))).toBeCloseTo(1e6, 6);
  });

  test('refuse, with the reason, what a factor cannot do', () => {
    expect(cannotConvert(unit('erg/s/cm2/Angstrom'), unit('Jy'))).toMatch(
      /wavelength of each sample/
    );
    expect(cannotConvert(unit('mag'), unit(''))).toMatch(/logarithmic/);
    expect(cannotConvert(null, unit('nm'))).toMatch(/not stated/);
    expect(cannotConvert(unit('d'), unit('nm'))).toMatch(
      /time cannot become length/
    );
    expect(() => conversionFactor(unit('mag'), unit('Jy'))).toThrow(
      /zero point/
    );
  });

  test('time formats convert exactly within a time system, and not across one', () => {
    expect(timeOffset('BTJD', 'BJD')).toBe(2457000);
    expect(timeOffset('JD', 'MJD')).toBe(-2400000.5);
    expect(cannotConvertTime('JD', 'BJD')).toMatch(/light travel time/);
    expect(cannotConvertTime('relative', 'JD')).toMatch(/no epoch/);
  });
});

describe('the schema', () => {
  test('every fixture is a valid observation, authentic and credited', async () => {
    for (const f of FIXTURES) {
      const o = await openFixture(f.id);
      expect([f.id, validateObservation(o)]).toEqual([f.id, []]);
      expect(o.kind).toBe(f.kind);
      expect(o.origin).not.toBe('imported');
      expect(o.credit).toBeTruthy();
      expect(o.license.status).toBeTruthy();
      expect(o.reductions.length).toBeGreaterThan(0);
    }
  });

  test('names each broken contract', () => {
    const o = series();
    const at = x => validateObservation(x).map(p => p.path);
    expect(at({ ...o, kind: 'movie' })).toContain('kind');
    expect(at({ ...o, credit: '' })).toContain('credit');
    const badUnit = {
      ...o,
      columns: [
        { ...o.columns[0] },
        { ...o.columns[1], unit: 'furlongs' },
        o.columns[2],
      ],
    };
    expect(at(badUnit)).toContain('columns[1].unit');
    const orphan = {
      ...o,
      columns: [...o.columns.slice(0, 2), { ...o.columns[2], of: 'nope' }],
    };
    expect(at(orphan)).toContain('columns[2].of');
    const short = {
      ...o,
      columns: [
        o.columns[0],
        { ...o.columns[1], values: Float64Array.from([1]) },
        o.columns[2],
      ],
    };
    expect(at(short)).toContain('columns[1].values');
    expect(at({ ...o, time: { ...o.time, format: 'Stardate' } })).toContain(
      'time.format'
    );
    // BTJD counts in days; a time series in hours cannot claim it.
    const hours = {
      ...o,
      columns: [{ ...o.columns[0], unit: 'h' }, ...o.columns.slice(1)],
    };
    expect(at(hours)).toContain('time.column');
    expect(
      at({ ...o, masks: [{ id: 'm', source: 'reader', rows: [99] }] })
    ).toContain('masks[0].rows');
  });

  test('counts missing values rather than hiding them', () => {
    const o = series();
    expect(missingCount(columnOf(o, 'f'))).toBe(1);
    expect(rowCount(o)).toBe(6);
  });
});

describe('changes', () => {
  test('convert a unit, and the uncertainty with it', () => {
    const { o } = replay(series(), [{ op: 'convert', column: 'f', to: '' }]);
    expect(columnOf(o, 'f').unit).toBe('');
    expect(columnOf(o, 'f').values[0]).toBeCloseTo(1e-5, 18);
    expect(columnOf(o, 'e').values[0]).toBeCloseTo(1e-6, 18);
    expect(whyNot(series(), { op: 'convert', column: 'f', to: 'nm' })).toMatch(
      /ratio cannot become length/
    );
    expect(whyNot(series(), { op: 'convert', column: 't', to: 'h' })).toMatch(
      /format, not its unit/
    );
  });

  test('change a time format by the exact offset, and refuse a change of system', () => {
    const { o } = replay(series(), [{ op: 'timeFormat', to: 'BJD' }]);
    expect(columnOf(o, 't').values[1]).toBe(2457001);
    expect(o.time.format).toBe('BJD');
    expect(whyNot(series(), { op: 'timeFormat', to: 'MJD' })).toMatch(
      /barycentric/
    );
  });

  test('normalise by the median of what is there, ignoring masked and missing rows', () => {
    const { o, notes } = replay(series(), [
      { op: 'mask', id: 'm1', rows: [5], label: 'outlier' },
      { op: 'normalize', column: 'f' },
    ]);
    // Median of 10, 12, 14, 16: 13. Row 5 is masked; row 2 is missing.
    expect(columnOf(o, 'f').values[0]).toBeCloseTo(10 / 13, 15);
    expect(columnOf(o, 'e').values[0]).toBeCloseTo(1 / 13, 15);
    expect(columnOf(o, 'f').unit).toBe('');
    expect(notes.find(n => n.key === 'normalize').vars.median).toBe(13);
  });

  test('crop keeps rows in range and carries the masks and notes along', () => {
    const { o, notes } = replay(series(), [
      { op: 'mask', id: 'm1', rows: [4], label: '' },
      { op: 'annotate', id: 'a1', rows: [3, 4], text: 'kept' },
      { op: 'annotate', id: 'a2', rows: [0, 1], text: 'cut' },
      { op: 'crop', column: 't', min: 2, max: 5 },
    ]);
    expect([...columnOf(o, 't').values]).toEqual([2, 3, 4, 5]);
    expect(o.masks[0].rows).toEqual([2]);
    expect(o.annotations).toEqual([{ id: 'a1', rows: [1, 2], text: 'kept' }]);
    expect(notes.find(n => n.key === 'crop').vars).toMatchObject({
      kept: 4,
      of: 6,
      droppedAnnotations: 1,
    });
  });

  test('fold puts every time in one period, from the epoch', () => {
    const { o } = replay(series(), [{ op: 'fold', period: 2, epoch: 0.5 }]);
    expect(o.axes.x).toBe('phase');
    const phase = [...columnOf(o, 'phase').values];
    expect(phase.map(p => Number(p.toFixed(6)))).toEqual([
      -0.25, 0.25, -0.25, 0.25, -0.25, 0.25,
    ]);
    expect(phase.every(p => p >= -0.5 && p < 0.5)).toBe(true);
  });

  test('bin averages, propagates the uncertainty, and says it did', () => {
    const { o, notes } = replay(series(), [{ op: 'bin', width: 2 }]);
    // Bins [0,2): 10 and 12; [2,4): 14 (the NaN is left out); [4,6): 16, 18.
    expect([...columnOf(o, 't').values]).toEqual([1, 3, 5]);
    expect([...columnOf(o, 'f').values]).toEqual([11, 14, 17]);
    expect([...columnOf(o, 'bin-count').values]).toEqual([2, 1, 2]);
    // Two points of sigma 1: sqrt(2)/2.
    expect(columnOf(o, 'f-bin-error').values[0]).toBeCloseTo(
      Math.SQRT2 / 2,
      15
    );
    expect(notes.at(-1)).toMatchObject({
      key: 'bin',
      vars: { bins: 3, rows: 5 },
    });
  });

  test('bin without uncertainties uses the scatter, and says that instead', () => {
    const s = series();
    s.columns = s.columns.slice(0, 2);
    const { o, notes } = replay(s, [{ op: 'bin', width: 2 }]);
    expect(columnOf(o, 'f-bin-error').values[0]).toBeCloseTo(
      Math.SQRT2 / Math.SQRT2,
      15
    );
    expect(Number.isNaN(columnOf(o, 'f-bin-error').values[1])).toBe(true);
    expect(notes.at(-1).key).toBe('binScatter');
  });

  test('a rest-frame shift divides by 1 + z, once', async () => {
    const g = await openFixture('sdss-g');
    const z = g.spectral.redshift;
    const { o } = replay(g, [{ op: 'restFrame', z }]);
    const before = columnOf(g, 'wavelength').values[100];
    expect(columnOf(o, 'wavelength').values[100]).toBeCloseTo(
      before / (1 + z),
      9
    );
    expect(o.spectral.frame).toBe('rest');
    expect(whyNot(o, { op: 'restFrame', z })).toMatch(/already/);
  });

  test('a change that cannot be made is refused before it is kept', () => {
    expect(whyNot(series(), { op: 'restFrame', z: 0 })).toMatch(
      /cannot be changed that way/
    );
    expect(whyNot(series(), { op: 'nope' })).toMatch(/not a change/);
    expect(() =>
      replay(series(), [{ op: 'crop', column: 't', min: 3, max: 1 }])
    ).toThrow(/change 1 \(crop\)/);
    expect(whyNot(series(), { op: 'unmask', id: 'x' })).toMatch(/no such mask/);
  });

  test('every change is defined for the kinds it claims, and only them', () => {
    for (const [name, op] of Object.entries(OPS)) {
      expect([
        name,
        op.kinds.every(k =>
          ['time-series', 'spectrum', 'image', 'table'].includes(k)
        ),
      ]).toEqual([name, true]);
    }
  });

  test('undo and redo walk the list, and a new change drops what was ahead', () => {
    const h = createHistory({ limit: 3 });
    h.push({ op: 'a' });
    h.push({ op: 'b' });
    expect(h.undo()).toEqual({ op: 'b' });
    expect(h.changes()).toEqual([{ op: 'a' }]);
    expect(h.canRedo()).toBe(true);
    expect(h.redo()).toEqual({ op: 'b' });
    h.undo();
    h.push({ op: 'c' });
    expect(h.changes()).toEqual([{ op: 'a' }, { op: 'c' }]);
    expect(h.canRedo()).toBe(false);
    h.push({ op: 'd' });
    h.push({ op: 'e' });
    expect(h.changes()).toEqual([{ op: 'c' }, { op: 'd' }, { op: 'e' }]);
    expect(h.undo()).toEqual({ op: 'e' });
    expect(h.undo()).toEqual({ op: 'd' });
    expect(h.undo()).toEqual({ op: 'c' });
    expect(h.undo()).toBe(null);
  });

  test('replaying the same changes gives the same observation, and undoing one restores the last', () => {
    const changes = [
      { op: 'mask', id: 'm1', rows: [1] },
      { op: 'normalize', column: 'f' },
      { op: 'bin', width: 2 },
    ];
    const a = replay(series(), changes).o;
    const b = replay(series(), changes).o;
    expect(observationJson(a, { source: series(), changes })).toBe(
      observationJson(b, { source: series(), changes })
    );
    const undone = replay(series(), changes.slice(0, 2)).o;
    expect(rowCount(undone)).toBe(6);
    expect(maskedRows(undone).has(1)).toBe(true);
  });
});

describe('the selection', () => {
  test('is one set of rows, and each view is told who changed it', () => {
    const s = createSelection(10);
    const heard = [];
    s.subscribe(e => heard.push(e.source));
    s.range(7, 3, 'plot');
    expect([...s.rows()]).toEqual([3, 4, 5, 6, 7]);
    expect(s.bounds()).toEqual([3, 7]);
    s.toggle(5, 'table');
    expect(s.has(5)).toBe(false);
    s.moveFocus(8, 'table', { extend: true });
    expect([...s.rows()]).toEqual([5, 6, 7, 8]);
    s.moveFocus(20, 'table');
    expect(s.focus).toBe(9);
    s.set([1, 2, 99, -1, 2.5], 'image');
    expect([...s.rows()]).toEqual([1, 2]);
    s.clear('table');
    expect(s.size).toBe(0);
    expect(heard).toEqual([
      'plot',
      'table',
      'table',
      'table',
      'image',
      'table',
    ]);
  });

  test('holds a large selection without overflowing the stack', () => {
    const s = createSelection(300000);
    s.set(
      Array.from({ length: 300000 }, (_, i) => i),
      'plot'
    );
    expect(s.size).toBe(300000);
  });
});

describe('importing a reader’s file', () => {
  const csv = [
    '# made in a spreadsheet',
    'time (d),flux (ppm),flux error (ppm),note',
    '1.0,100,5,first',
    '2.0,NaN,5,',
    '3.0,110,5,"with, comma"',
    '',
  ].join('\n');

  test('describes the file without deciding anything', () => {
    const r = read(csv, { name: 'mine.csv' });
    expect(r.ok).toBe(true);
    const t = r.table;
    expect(t.delimiter).toBe(',');
    expect(t.comments).toEqual(['made in a spreadsheet']);
    expect(t.header).toEqual([
      'time (d)',
      'flux (ppm)',
      'flux error (ppm)',
      'note',
    ]);
    expect(t.rows[2][3]).toBe('with, comma');
    expect(t.columns[1]).toMatchObject({
      numbers: 2,
      missing: 1,
      missingTokens: ['NaN'],
      numeric: true,
    });
    // Offered from the header, not applied.
    expect(t.columns[0].suggestion.unit).toEqual({ id: 'd', scale: 1 });
    expect(t.columns[3].numeric).toBe(false);
  });

  const mapping = over => ({
    kind: 'time-series',
    title: 'mine',
    columns: [
      { use: 'x', unit: 'd' },
      { use: 'value', unit: 'ppm' },
      { use: 'uncertainty', unit: 'ppm', of: 1 },
      { use: 'label' },
    ],
    time: { format: 'relative', scale: 'unknown' },
    ...over,
  });

  test('builds an observation from the reader’s mapping, missing values kept as missing', () => {
    const r = build(read(csv, { name: 'mine.csv' }).table, mapping());
    expect(r.ok).toBe(true);
    const o = r.observation;
    expect(validateObservation(o)).toEqual([]);
    expect(o.origin).toBe('imported');
    expect(o.source.file.name).toBe('mine.csv');
    expect(Number.isNaN(columnOf(o, 'flux-ppm').values[1])).toBe(true);
    expect(columnOf(o, 'flux-error-ppm').of).toBe('flux-ppm');
    expect(o.time).toEqual({
      column: 'time-d',
      format: 'relative',
      scale: 'unknown',
    });
  });

  test('will not guess a unit the reader has not chosen', () => {
    const m = mapping();
    delete m.columns[1].unit;
    const r = build(read(csv).table, m);
    expect(r.ok).toBe(false);
    expect(r.problems[0].message).toMatch(/choose a unit for "flux \(ppm\)"/);
    // "Not stated" is a choice, and it is accepted as one.
    const stated = mapping();
    stated.columns[1].unit = null;
    stated.columns[2].unit = null;
    expect(build(read(csv).table, stated).ok).toBe(true);
  });

  test('refuses a time format that does not fit, a missing scale, and an orphan uncertainty', () => {
    const bad = build(read(csv).table, mapping({ time: { format: 'BJD' } }));
    expect(bad.problems.map(p => p.message).join(' | ')).toMatch(
      /choose the time scale/
    );
    const hours = mapping({ time: { format: 'BJD', scale: 'TDB' } });
    hours.columns[0].unit = 'h';
    expect(build(read(csv).table, hours).problems[0].message).toMatch(
      /counts in days/
    );
    const orphan = mapping();
    orphan.columns[2].of = 3;
    expect(build(read(csv).table, orphan).problems[0].message).toMatch(
      /choose the column it is the uncertainty of/
    );
  });

  test('names the lines of text where a number should be, and offers the decimal comma', () => {
    const text = 'x;y\n1;2,5\n2;3,5\n3;oops\n';
    const r = read(text);
    expect(r.table.delimiter).toBe(';');
    const cols = [
      { use: 'x', unit: '' },
      { use: 'value', unit: '' },
    ];
    const out = build(r.table, { kind: 'table', columns: cols });
    expect(out.problems[0].message).toMatch(/decimal comma/);
    const withCommas = build(read(text, { decimalComma: true }).table, {
      kind: 'table',
      columns: cols,
    });
    expect(withCommas.problems[0].message).toMatch(
      /text where a number should be, on line 4/
    );
    expect(withCommas.problems[0].lines).toEqual([4]);
  });

  test('refuses a malformed file with the line, and a file past the limits', () => {
    const ragged = read('a,b\n1,2\n3\n4,5,6\n');
    expect(ragged.ok).toBe(false);
    expect(ragged.problems.map(p => p.line)).toEqual([3, 4]);
    expect(read('a,b\n"1,2\n').problems[0].message).toMatch(/never closed/);
    expect(read('a,a\n1,2\n').problems[0].message).toMatch(/names two columns/);
    expect(read('').problems[0].message).toMatch(/empty/);
    expect(read('a,b\n').problems[0].message).toMatch(/a header and no rows/);
    expect(read('x', { bytes: LIMITS.bytes + 1 }).problems[0].message).toMatch(
      /up to 5 MB/
    );
    expect(read('{"a": [1,2], "b": [1]}').problems[0].message).toMatch(
      /not all the same length/
    );
    expect(read('{nope').problems[0].message).toBe(
      'the file starts like JSON and is not valid JSON'
    );
    expect(read('[1, 2]').problems[0].message).toMatch(/list of rows/);
  });

  test('reads a file with no header, tab-separated, and names its columns', () => {
    const r = read('1\t2\n3\t4\n');
    expect(r.table.headerRow).toBe(false);
    expect(r.table.header).toEqual(['column 1', 'column 2']);
    expect(r.table.delimiter).toBe('\t');
  });

  test('reads JSON rows and columns into the same mapping', () => {
    const rows = read(
      JSON.stringify([
        { t: 1, f: 2 },
        { t: 2, f: null },
      ])
    );
    expect(rows.table.columns[1]).toMatchObject({ numbers: 1, missing: 1 });
    const cols = read(JSON.stringify({ t: [1, 2], f: [3, 4] }));
    expect(cols.table.rows).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  test('reads back a session it saved: the source, the changes made again, the same observation', async () => {
    const lc = await openFixture('tess-light-curve');
    const changes = [
      { op: 'mask', id: 'm1', rows: [3, 4] },
      { op: 'annotate', id: 'a1', rows: [10, 12], text: 'a dip?' },
      { op: 'fold', period: 3.52474859, epoch: 2826.1 },
      { op: 'bin', width: 0.01 },
    ];
    const { o } = replay(lc, changes);
    // Folded and binned, a time series has phase along its axis and no time
    // column left, and is still a valid observation.
    expect(validateObservation(o)).toEqual([]);
    const text = observationJson(o, { source: lc, changes });
    const back = read(text);
    expect(back.ok).toBe(true);
    expect(back.changes).toEqual(changes);
    // What comes back to open is the observation as it was opened ...
    expect(rowCount(back.observation)).toBe(1882);
    expect(back.observation.masks).toEqual([]);
    // ... and the changes, made again, give what the file holds, byte for byte.
    const again = replay(back.observation, back.changes).o;
    expect(sameObservation(again, back.expected)).toBe(true);
    expect(observationJson(again, { source: back.observation, changes })).toBe(
      text
    );
  });

  test('reads back a save with no changes as the observation itself', async () => {
    const lc = await openFixture('tess-light-curve');
    const text = observationJson(lc, { source: lc, changes: [] });
    expect(JSON.parse(text).workspace.source).toBe(null);
    const back = read(text);
    expect(back.changes).toEqual([]);
    expect(sameObservation(back.observation, lc)).toBe(true);
  });
});

describe('exports', () => {
  test('are the same bytes for the same source and changes', async () => {
    const lc = await openFixture('tess-light-curve');
    const changes = [
      { op: 'fold', period: 3.52474859, epoch: 2826.1 },
      { op: 'bin', width: 0.01 },
    ];
    const one = observationJson(replay(lc, changes).o, { source: lc, changes });
    const two = observationJson(
      replay(await openFixture('tess-light-curve'), changes).o,
      { source: lc, changes }
    );
    expect(one).toBe(two);
    expect(one).not.toMatch(/"exported"|Date|T\d\d:\d\d/);
    const doc = JSON.parse(one);
    expect(doc.workspace.openedAs).toBe('pack:tess-hd209458-s56-lc@1.0.0');
    expect(doc.workspace.changes).toEqual(changes);
  });

  test('write CSV with units in the header, a masked column, and disarmed text', () => {
    const s = series();
    s.kind = 'table';
    delete s.time;
    s.columns.push({
      id: 'n',
      name: 'note',
      unit: null,
      role: 'label',
      values: ['=1+1', 'ok', null, 'x', 'y', 'z'],
    });
    const { o } = replay(s, [{ op: 'mask', id: 'm', rows: [0] }]);
    const rows = fromCsv(observationCsv(o));
    expect(rows[0]).toEqual([
      'time (d)',
      'flux (ppm)',
      'error (ppm)',
      'note',
      'masked',
    ]);
    expect(rows[1]).toEqual(['0', '10', '1', '=1+1', '1']);
    expect(observationCsv(o)).toContain(`"'=1+1"`);
    expect(rows[3][1]).toBe('');
  });
});

describe('world coordinates', () => {
  const wcs = {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [6.25, 6.5],
    crval: [330.79508, 18.8842],
    cdelt: [-0.0054, 0.0054],
    pc: [
      [0.85, -0.46],
      [-0.52, -0.89],
    ],
  };

  /** The general spherical rotation of Calabretta & Greisen, for comparison. */
  function generalForm(w, x, y) {
    const R = Math.PI / 180;
    const dx = x - w.crpix[0];
    const dy = y - w.crpix[1];
    const xi = w.cdelt[0] * (w.pc[0][0] * dx + w.pc[0][1] * dy);
    const eta = w.cdelt[1] * (w.pc[1][0] * dx + w.pc[1][1] * dy);
    const r = Math.hypot(xi, eta);
    const phi = Math.atan2(xi, -eta);
    const theta = Math.atan2(180 / Math.PI, r);
    const d0 = w.crval[1] * R;
    const dphi = phi - Math.PI;
    const ra =
      w.crval[0] * R +
      Math.atan2(
        -Math.cos(theta) * Math.sin(dphi),
        Math.sin(theta) * Math.cos(d0) -
          Math.cos(theta) * Math.sin(d0) * Math.cos(dphi)
      );
    const dec = Math.asin(
      Math.sin(theta) * Math.sin(d0) +
        Math.cos(theta) * Math.cos(d0) * Math.cos(dphi)
    );
    return { ra: (((ra / R) % 360) + 360) % 360, dec: dec / R };
  }

  test('the gnomonic formulae agree with the general rotation to a milliarcsecond', () => {
    for (const [x, y] of [
      [1, 1],
      [11, 13],
      [6.25, 6.5],
      [3, 10],
    ]) {
      const a = skyOf(wcs, x, y);
      const b = generalForm(wcs, x, y);
      expect(separation(a, b) * 3600).toBeLessThan(1e-3);
    }
    const ref = skyOf(wcs, 6.25, 6.5);
    expect(ref.ra).toBeCloseTo(330.79508, 12);
    expect(ref.dec).toBeCloseTo(18.8842, 12);
  });

  test('a projection it does not read has no sky position here', () => {
    expect(unusableWcs({ ...wcs, ctype: ['RA---SIN', 'DEC--SIN'] })).toMatch(
      /only TAN/
    );
    expect(skyOf({ ...wcs, ctype: ['GLON-CAR', 'GLAT-CAR'] }, 1, 1)).toBe(null);
  });
});

describe('the fixtures are the data they say they are', () => {
  test('every SDSS position and redshift is the provenance record’s', async () => {
    for (const [id, star] of Object.entries(SDSS_STARS)) {
      const r = SDSS_RECORDS[id];
      expect([id, star]).toEqual([id, { ra: r.ra, dec: r.dec, z: r.z }]);
      const o = await openFixture(`sdss-${id}`);
      expect(o.object.ra).toBe(r.ra);
      expect(o.title).toContain(r.subClass);
    }
  });

  test('every GWOSC citation and the licence are the provenance record’s', async () => {
    const catalogs = GWOSC_PROVENANCE.archive.catalogs;
    for (const [id, c] of Object.entries(GWOSC_CATALOGS)) {
      expect(c).toEqual({ text: catalogs[id].paper, url: catalogs[id].doi });
    }
    const o = await openFixture('gwosc-events');
    expect(GWOSC_PROVENANCE.archive.license).toContain('CC BY 4.0');
    expect(o.license.status).toBe('cc-by-4.0');
    // The first row is GW150914, 34.6 (-2.6, +4.4) solar masses, as GWOSC has it.
    expect(columnOf(o, 'event').values[0]).toBe('GW150914');
    expect(columnOf(o, 'mass_1_source').values[0]).toBe(34.6);
    expect(columnOf(o, 'mass_1_source-lower').values[0]).toBe(-2.6);
    expect(columnOf(o, 'mass_1_source-upper').values[0]).toBe(4.4);
    expect(columnOf(o, 'mass_1_source-lower').level).toBe(0.9);
  });

  test('the light curve and the aperture are the packs, decoded', async () => {
    const lc = await openFixture('tess-light-curve');
    expect(rowCount(lc)).toBe(1882);
    expect(lc.time).toEqual({ column: 'time', format: 'BTJD', scale: 'TDB' });
    expect(lc.reductions.join(' ')).toMatch(/20-minute bins/);
    const ap = await openFixture('tess-aperture');
    expect(ap.image.width * ap.image.height).toBe(rowCount(ap));
    expect(columnOf(ap, 'flags').bits.find(b => b.value === 2).meaning).toMatch(
      /optimal aperture/
    );
    // Pixel (1, 1) is the first value, and its sky position is the WCS's.
    const first = skyOf(ap.image.wcs, 1, 1);
    expect(columnOf(ap, 'ra').values[0]).toBe(first.ra);
  });
});
