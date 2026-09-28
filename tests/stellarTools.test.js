/**
 * The general measurement primitives the stellar-populations suite added to
 * the Observatory (STELLAR_POPULATIONS.md), tested on their own:
 *
 *   bandIndex      a band's mean flux over a reference window's: synthetic
 *                  bands of known depth, and TiO5 as the stellar lesson has it
 *   curveCompare   points against shifted model curves: a known curve and
 *                  shift recovered through noise and field stars, and the
 *                  degeneracy, edge and limit warnings
 *   describe       a column's count, median, mean, spread and extremes
 *   derive         new columns: sums with errors in quadrature, and the
 *                  distance on the sky from a position
 *   presetWindows  the line tool's Balmer windows
 *   table packs    `table-columns/1`, encoded and decoded
 *   checks         the guides' `changed` check and dotted parameters
 */

import { describe, test, expect } from '@jest/globals';

// One at a time: several import()s linking the same module at once can lose
// it (the jest concurrent import race).
const B = await import('../js/measure/bandIndex.js');
const K = await import('../js/measure/curveCompare.js');
const D = await import('../js/measure/describe.js');
const L = await import('../js/measure/spectrumLine.js');
const P = await import('../js/measure/pipeline.js');
const T = await import('../js/observatory/transforms.js');
const TO = await import('../js/tableObservation.js');
const TC = await import('../tools/data-packs/table-columns.mjs');
const C = await import('../js/observatory/guides/core.js');
const SI = await import('../js/stellar/spectrumIndex.js');
const SD = await import('../js/data/spectra/sdssSpectra.js');
const F = await import('../js/observatory/fixtures.js');

/** A seeded normal stream (mulberry32 and Box-Muller). */
function normal(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
}

/** A flat spectrum in vacuum Angstroms with a band cut into it. */
function banded({ depth = 0.4, from = 7120, to = 7140, noise = 0, seed = 1 }) {
  const n = normal(seed);
  const x = [];
  const y = [];
  const dy = [];
  for (let w = 6900; w <= 7300; w += 1.5) {
    x.push(w);
    y.push((w >= from && w <= to ? 1 - depth : 1) + noise * n());
    dy.push(noise || 1e-6);
  }
  return { x, y, dy };
}

describe('the band index', () => {
  test('a band of known depth, in vacuum windows, is recovered exactly', () => {
    const r = B.measureBand(banded({}), {
      band: [7126, 7135],
      reference: [[7042, 7046]],
      medium: 'vacuum',
      spectrumMedium: 'vacuum',
    });
    expect(r.index).toBeCloseTo(0.6, 12);
    expect(r.depth).toBeCloseTo(0.4, 12);
  });

  test('air windows move redward onto a vacuum spectrum, by the refractive index', () => {
    const r = B.measureBand(banded({}), {
      band: [7126, 7135],
      reference: [[7042, 7046]],
      medium: 'air',
      spectrumMedium: 'vacuum',
    });
    expect(r.windows.band[0]).toBeCloseTo(SI.airToVacuum(7126), 9);
    expect(r.windows.band[0] - 7126).toBeGreaterThan(1.9);
    expect(r.windows.band[0] - 7126).toBeLessThan(2.1);
  });

  test('with errors, the index is within its stated error of the truth, seed after seed', () => {
    let within = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = B.measureBand(banded({ noise: 0.02, seed }), {
        band: [7126, 7135],
        reference: [[7042, 7046]],
      });
      if (Math.abs(r.index - 0.6) <= r.error) within++;
    }
    // One standard error holds about 68% of the time.
    expect(within).toBeGreaterThan(120);
    expect(within).toBeLessThan(155);
  });

  test('without errors it measures the scatter, and says so', () => {
    const s = banded({ noise: 0.02 });
    const r = B.measureBand(
      { x: s.x, y: s.y, dy: null },
      { band: [7126, 7135], reference: [[7042, 7046]] }
    );
    expect(r.warnings).toContainEqual({ code: 'errorsFromScatter' });
    expect(r.error).toBeGreaterThan(0);
  });

  test('a window without two samples in it, or backwards, is refused', () => {
    const s = banded({});
    expect(() =>
      B.measureBand(s, { band: [7126, 7126.5], reference: [[7042, 7046]] })
    ).toThrow(expect.objectContaining({ code: 'window' }));
    expect(() =>
      B.measureBand(s, { band: [7135, 7126], reference: [[7042, 7046]] })
    ).toThrow(expect.objectContaining({ code: 'windows' }));
  });

  test("TiO5 on the four SDSS spectra is the stellar lesson's, to 1e-4", async () => {
    const p = B.BAND_PRESETS.tio5;
    for (const id of SD.SPECTRUM_IDS) {
      const o = await F.openFixture(`sdss-${id}`);
      const node = await P.TOOLS.band.run(o, {
        band: p.band,
        reference: p.reference,
        medium: p.medium,
      });
      const mine = node.quantities.find(q => q.id === 'index').value;
      const lesson = SI.tioFiveIndex(SD.decodeSpectrum(id));
      expect({ id, off: Math.abs(mine - lesson) < 1e-4 }).toEqual({
        id,
        off: true,
      });
    }
  });
});

// --- The curve comparison ------------------------------------------------------

/** A family of curves, an "isochrone" per key, in (color, magnitude). */
function family(keys = [1, 2, 3]) {
  return keys.map(key => {
    const main = [];
    for (let c = 0.2; c <= 1.2 + 1e-9; c += 0.02)
      main.push([c, 2 + 6 * (c - 0.2) + 0.4 * key * (c - 0.2) ** 2]);
    // A turnoff that moves with the key, as an age's does.
    const off = [
      [0.2, 2],
      [0.3 + 0.05 * key, 1 - 0.5 * key],
    ];
    return { key, segments: [main, off] };
  });
}

/** Points on one member of the family, shifted, with noise and field. */
function cluster({ key = 2, dm = 10.5, E = 0.1, R = 3, field = 0, seed = 7 }) {
  const n = normal(seed);
  const m = family().find(f => f.key === key);
  const x = [];
  const y = [];
  for (const [c, M] of m.segments[0].filter((_, i) => i % 1 === 0)) {
    x.push(c + E + 0.01 * n());
    y.push(M + dm + R * E + 0.03 * n());
  }
  // Field stars spread over the diagram.
  for (let i = 0; i < field; i++) {
    x.push(0.3 + Math.abs(n()) * 0.8);
    y.push(12 + Math.abs(n()) * 6);
  }
  return { x, y };
}

describe('the curve comparison', () => {
  const grid = { dm: [9, 12, 0.02], E: [0, 0.3, 0.005], R: 3 };

  test('recovers the curve and the shift it was drawn from', async () => {
    const r = await K.compareCurves(cluster({}), family(), grid);
    expect(r.best.key).toBe(2);
    expect(Math.abs(r.best.dm - 10.5)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(r.best.E - 0.1)).toBeLessThanOrEqual(0.01);
  });

  test('field stars, capped, do not move the answer', async () => {
    const r = await K.compareCurves(cluster({ field: 25 }), family(), grid);
    expect(r.best.key).toBe(2);
    expect(Math.abs(r.best.dm - 10.5)).toBeLessThanOrEqual(0.06);
  });

  test('two curves the points cannot tell apart are reported alike', async () => {
    const same = family([2]);
    const twins = [same[0], { ...same[0], key: 5 }];
    const r = await K.compareCurves(cluster({}), twins, grid);
    expect(r.alike).toHaveLength(2);
    expect(r.warnings).toContainEqual({ code: 'notUnique', n: 2 });
  });

  test('a best shift or model at the edge of what was searched is flagged', async () => {
    // Three comparisons, so a coarser grid than the others': at theirs this one
    // ran past Jest's 5 s on a loaded machine. It still holds the true shift,
    // (10.5, 0.1), and 12.4 is still beyond it.
    const coarse = { ...grid, dm: [9, 12, 0.1], E: [0, 0.3, 0.02] };
    const r = await K.compareCurves(cluster({ dm: 12.4 }), family(), coarse);
    expect(r.warnings).toContainEqual({ code: 'dmAtEdge' });
    const e = await K.compareCurves(cluster({ key: 3 }), family(), coarse);
    expect(e.best.key).toBe(3);
    expect(e.warnings).toContainEqual({ code: 'modelAtEdge' });
    const mid = await K.compareCurves(cluster({ key: 2 }), family(), coarse);
    expect(mid.warnings).not.toContainEqual({ code: 'modelAtEdge' });
    expect(mid.warnings).not.toContainEqual({ code: 'dmAtEdge' });
  });

  test('refuses too few points, too many shifts and too much work, with a code', async () => {
    const few = { x: [0.5, 0.6], y: [12, 13] };
    await expect(K.compareCurves(few, family(), grid)).rejects.toMatchObject({
      code: 'tooFew',
    });
    await expect(
      K.compareCurves(cluster({}), family(), { ...grid, dm: [0, 100, 0.001] })
    ).rejects.toMatchObject({ code: 'shifts' });
    const many = { x: [], y: [] };
    for (let i = 0; i < 19000; i++) {
      many.x.push(0.5 + (i % 100) / 200);
      many.y.push(13 + (i % 37) / 10);
    }
    await expect(
      K.compareCurves(many, family(), { ...grid, dm: [9, 12, 0.005] })
    ).rejects.toMatchObject({ code: 'work' });
  });

  test('stops when asked to', async () => {
    const stop = new globalThis.AbortController();
    stop.abort();
    await expect(
      K.compareCurves(cluster({}), family(), { ...grid, signal: stop.signal })
    ).rejects.toMatchObject({ code: 'canceled' });
  });
});

// --- Describing a column ---------------------------------------------------------

describe('describe', () => {
  test('count, median, mean, standard deviation and extremes', () => {
    const r = D.describeColumn([4, 1, 3, 2]);
    expect(r).toMatchObject({ n: 4, median: 2.5, mean: 2.5, min: 1, max: 4 });
    expect(r.sd).toBeCloseTo(Math.sqrt(5 / 3), 12);
    expect(D.describeColumn([5, 1, 3]).median).toBe(3);
    expect(D.describeColumn([7]).sd).toBeNull();
  });

  test('leaves out the missing and the masked, and counts them', () => {
    const r = D.describeColumn([1, NaN, 100, 3], { skip: new Set([2]) });
    expect(r).toMatchObject({ n: 2, missing: 1, skipped: 1, median: 2 });
    expect(() => D.describeColumn([NaN])).toThrow(
      expect.objectContaining({ code: 'empty' })
    );
  });

  test('as a tool, on a table with a mask: its quantities have the column’s unit', async () => {
    const o = {
      kind: 'table',
      columns: [
        {
          id: 'rv',
          name: 'rv',
          unit: 'km/s',
          role: 'value',
          values: [70, 75, 80, 300],
        },
      ],
      masks: [{ id: 'm', rows: [3] }],
      axes: { x: 'rv', y: 'rv' },
    };
    const r = await P.TOOLS.describe.run(o, { column: 'rv' });
    const q = id => r.quantities.find(x => x.id === id);
    expect(q('median')).toMatchObject({ value: 75, unit: 'km/s' });
    expect(q('n').value).toBe(3);
    expect(r.warnings).toContainEqual({ code: 'maskedLeftOut', n: 1 });
    await expect(
      P.TOOLS.describe.run(o, { column: 'none' })
    ).rejects.toMatchObject({
      code: 'columns',
    });
  });
});

// --- New columns ------------------------------------------------------------------

describe('derived columns', () => {
  const table = () => ({
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'table',
    id: 'test:t',
    title: 't',
    masks: [],
    annotations: [],
    axes: { x: 'ra', y: 'g' },
    columns: [
      {
        id: 'ra',
        name: 'ra',
        unit: 'deg',
        role: 'value',
        values: Float64Array.from([10, 10, 10]),
      },
      {
        id: 'dec',
        name: 'dec',
        unit: 'deg',
        role: 'value',
        values: Float64Array.from([20, 20 + 1 / 60, 21]),
      },
      {
        id: 'g',
        name: 'g',
        unit: 'mag',
        role: 'value',
        values: Float64Array.from([15, 16, 17]),
      },
      {
        id: 'g_err',
        name: 'g error',
        unit: 'mag',
        role: 'uncertainty',
        of: 'g',
        values: Float64Array.from([0.03, 0.04, 0.05]),
      },
      {
        id: 'r',
        name: 'r',
        unit: 'mag',
        role: 'value',
        values: Float64Array.from([14.5, 15.2, 16.9]),
      },
      {
        id: 'r_err',
        name: 'r error',
        unit: 'mag',
        role: 'uncertainty',
        of: 'r',
        values: Float64Array.from([0.04, 0.03, 0.12]),
      },
    ],
  });

  test('a color: the difference, and its error the two in quadrature', () => {
    const { o, notes } = T.replay(table(), [
      {
        op: 'derive',
        id: 'gr',
        name: 'g - r',
        terms: [
          { column: 'g', factor: 1 },
          { column: 'r', factor: -1 },
        ],
      },
    ]);
    const col = id => o.columns.find(c => c.id === id);
    expect(Array.from(col('gr').values)).toEqual([
      15 - 14.5,
      16 - 15.2,
      17 - 16.9,
    ]);
    expect(col('gr').unit).toBe('mag');
    expect(col('gr-err').of).toBe('gr');
    expect(col('gr-err').values[0]).toBeCloseTo(0.05, 12);
    expect(col('gr-err').values[2]).toBeCloseTo(Math.hypot(0.05, 0.12), 12);
    expect(notes.at(-1)).toMatchObject({
      key: 'deriveSumError',
      vars: { formula: 'g − r' },
    });
  });

  test('a sum of different kinds of quantity is refused', () => {
    expect(
      T.OPS.derive.check(table(), {
        id: 'x',
        name: 'x',
        terms: [
          { column: 'g', factor: 1 },
          { column: 'ra', factor: 1 },
        ],
      })
    ).toMatch(/same kind of quantity/);
  });

  test('a distance on the sky, in arcminutes, from a position', () => {
    const { o } = T.replay(table(), [
      {
        op: 'derive',
        id: 'd',
        name: 'distance',
        separation: { ra: 'ra', dec: 'dec', center: [10, 20] },
      },
    ]);
    const d = o.columns.find(c => c.id === 'd');
    expect(d.unit).toBe('arcmin');
    expect(d.values[0]).toBeCloseTo(0, 12);
    expect(d.values[1]).toBeCloseTo(1, 9);
    expect(d.values[2]).toBeCloseTo(60, 9);
    expect(
      T.OPS.derive.check(table(), {
        id: 'e',
        name: 'e',
        separation: { ra: 'g', dec: 'dec', center: [10, 20] },
      })
    ).toMatch(/not in degrees/);
  });
});

describe("the line tool's presets", () => {
  test('H-alpha: its windows about the rest wavelength, moved to the redshift', () => {
    const ha = L.LINES.find(l => l.id === 'ha');
    expect(L.presetWindows(ha, 'vacuum', 0)).toEqual({
      line: [6544.61, 6584.61],
      blue: [6499.61, 6539.61],
      red: [6589.61, 6629.61],
      rest: 6564.61,
    });
    const moved = L.presetWindows(ha, 'air', 0.001);
    expect(moved.rest).toBe(6562.8);
    expect(moved.line[0]).toBeCloseTo(6562.8 * 1.001 - 20, 2);
  });
});

// --- Table packs ------------------------------------------------------------------

describe('table packs, table-columns/1', () => {
  const pack = (rows, columns) => {
    const { series } = TC.encodeTable(rows, columns);
    return {
      PACK: {
        id: 'x',
        version: '1.0.0',
        credit: 'test',
        columns: columns.map(c => ({
          id: c.id,
          name: c.name ?? c.id,
          unit: c.unit ?? '',
          uncertaintyOf: c.of,
        })),
      },
      SERIES: series,
    };
  };

  test('a round trip keeps every value to half its step, and a missing one missing', () => {
    const rows = [
      { ra: 114.60213, g: 15.123, e: 0.0314 },
      { ra: 114.9, g: null, e: 0.05 },
      { ra: 114.1, g: 22.5, e: 0.2 },
    ];
    const cols = [
      { id: 'ra', step: 1e-5 },
      { id: 'g', step: 0.001, unit: 'mag' },
      { id: 'e', step: 0.0005, unit: 'mag', of: 'g' },
    ];
    const t = TO.tableOf(pack(rows, cols));
    expect(TO.checkTable(t)).toEqual([]);
    const v = id => t.columns.find(c => c.id === id).values;
    rows.forEach((r, i) => {
      for (const c of cols) {
        if (r[c.id] === null) expect(v(c.id)[i]).toBeNaN();
        else
          expect(Math.abs(v(c.id)[i] - r[c.id])).toBeLessThanOrEqual(
            c.step / 2 + 1e-12
          );
      }
    });
    // A magnitude to the millimag survives exactly.
    expect(v('g')[0]).toBeCloseTo(15.123, 9);
    expect(t.columns.find(c => c.id === 'e').uncertaintyOf).toBe('g');
  });

  test('a column too wide for 16 bits is stored in 32', () => {
    const { series, record } = TC.encodeTable(
      [{ ra: 0 }, { ra: 360 }],
      [{ id: 'ra', step: 1e-5 }]
    );
    expect(series.columns[0].type).toBe('int32');
    expect(record[0].type).toBe('int32');
    // Whole steps from the offset: nothing lost beyond floating point.
    expect(record[0].maxRounding).toBeLessThan(1e-9);
  });

  test('a table that is not what it says is refused, with the reason', () => {
    const good = pack([{ a: 1 }, { a: 2 }], [{ id: 'a', step: 1 }]);
    expect(() =>
      TO.tableOf({ ...good, SERIES: { ...good.SERIES, encoding: 'x/1' } })
    ).toThrow(/not a table pack/);
    expect(() =>
      TO.tableOf({ ...good, SERIES: { ...good.SERIES, n: 3 } })
    ).toThrow(/holds 2 values, not 3/);
    expect(() =>
      TO.tableOf({
        ...good,
        PACK: { ...good.PACK, columns: [...good.PACK.columns, { id: 'b' }] },
      })
    ).toThrow(/encodes 1 columns and describes 2/);
    const t = TO.tableOf(good);
    expect(
      TO.checkTable({ ...t, columns: [...t.columns, { ...t.columns[0] }] })
    ).toEqual(['two columns are called a']);
  });

  test('CSV with the comment lines SkyServer begins with', () => {
    const rows = TC.readCsv(
      new globalThis.TextEncoder().encode(
        '#Table1\nra,g,name\n1.5,15,x\n2,,y\n'
      )
    );
    expect(rows).toEqual([
      { ra: 1.5, g: 15, name: 'x' },
      { ra: 2, g: '', name: 'y' },
    ]);
  });
});

// --- The guides' new checks -------------------------------------------------------------

describe("the guides' checks of changes and settings", () => {
  const targets = { t: { observation: 'test:t' } };
  const w = changes => ({ source: { id: 'test:t' }, changes });

  test('a crop of the column named, with each end in its range', () => {
    const check = {
      kind: 'changed',
      target: 't',
      op: 'crop',
      column: 'rv',
      min: [55, 72],
      max: [78, 95],
    };
    const crop = (column, min, max) => ({ op: 'crop', column, min, max });
    expect(C.evaluateCheck(check, w([crop('rv', 65, 85)]), targets).ok).toBe(
      true
    );
    expect(C.evaluateCheck(check, w([crop('rv', 40, 85)]), targets).why).toBe(
      'noChange'
    );
    expect(C.evaluateCheck(check, w([crop('feh', 65, 85)]), targets).why).toBe(
      'noChange'
    );
    expect(
      C.evaluateCheck(check, { source: { id: 'other' }, changes: [] }, targets)
        .why
    ).toBe('notOpened');
  });

  test('a derived sum of exactly the columns named, in either order', () => {
    const check = {
      kind: 'changed',
      target: 't',
      op: 'derive',
      terms: [
        ['g', 1],
        ['r', -1],
      ],
    };
    const derive = terms => ({
      op: 'derive',
      id: 'c',
      name: 'c',
      terms: terms.map(([column, factor]) => ({ column, factor })),
    });
    for (const [terms, ok] of [
      [
        [
          ['g', 1],
          ['r', -1],
        ],
        true,
      ],
      [
        [
          ['r', -1],
          ['g', 1],
        ],
        true,
      ],
      [
        [
          ['g', 1],
          ['r', 1],
        ],
        false,
      ],
      [[['g', 1]], false],
    ])
      expect(C.evaluateCheck(check, w([derive(terms)]), targets).ok).toBe(ok);
  });

  test("a measured check's settings are dotted paths into the node's", () => {
    const check = {
      kind: 'measured',
      target: 't',
      tool: 'curve',
      params: { 'model.where.feh': -0.25, 'E.0': 0 },
      quantity: 'logAge',
      within: [9, 9.6],
    };
    const node = (feh, E) => ({
      tool: 'curve',
      status: 'current',
      input: { observation: 'test:t' },
      params: { model: { where: { feh } }, E },
      quantities: [{ id: 'logAge', value: 9.5 }],
    });
    expect(
      C.evaluateCheck(check, { nodes: [node(-0.25, [0, 0.3, 0.005])] }, targets)
        .ok
    ).toBe(true);
    expect(
      C.evaluateCheck(check, { nodes: [node(0, [0, 0.3, 0.005])] }, targets).why
    ).toBe('noMeasurement');
    expect(
      C.evaluateCheck(
        check,
        { nodes: [node(-0.25, [0.042, 0.042, 0.005])] },
        targets
      ).why
    ).toBe('noMeasurement');
  });

  test("a later answer reads a crop's ends as it reads a measurement's numbers", () => {
    const crop = { op: 'crop', column: 'rv', min: 65, max: 85 };
    const c = C.answerContext({
      evidence: id => (id === 'crop' ? crop : null),
      observation: () => null,
    });
    expect(c.quantity('crop', 'min')).toBe(65);
    expect(c.quantity('crop', 'column')).toBeNull();
    // After a reload the change itself is gone, and its numbers are kept.
    const reloaded = C.answerContext({
      evidence: () => null,
      observation: () => null,
      values: id => (id === 'crop' ? { min: 65, max: 85 } : null),
    });
    expect(reloaded.quantity('crop', 'max')).toBe(85);
  });
});
