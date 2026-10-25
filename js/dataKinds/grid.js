// =============================================================================
// A precomputed grid, read and interpolated within its domain (Prompt 157)
// -----------------------------------------------------------------------------
// A grid is a table indexed by named parameters (gravitas.grid, ./contract.js):
// a dense one stores one value per cell of the product of its axes, output by
// output, the last axis varying fastest; a keyed one leaves its rows in a pack's
// table and says which cells they fill. `interpolate` is multilinear inside the
// axes and refuses outside them: a grid is never extrapolated. The size is
// checked against the declared axes before the values are decoded.
// =============================================================================

import { DataKindError } from './limits.js';
import { ENCODINGS, validateGrid } from './contract.js';

function bytesOfBase64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function checked(doc) {
  const v = validateGrid(doc);
  if (!v.ok)
    throw new DataKindError(
      v.problems[0].code,
      `${v.problems[0].path} ${v.problems[0].message}`
    );
  return v;
}

/**
 * A dense grid's values.
 * @param {object} doc - A gravitas.grid, layout dense
 * @param {Uint8Array} [bytes] - The values, when the document names a part
 * @returns {{axes: object[], outputs: object[], shape: number[], cells: number,
 *   values: Float64Array, at: Function, interpolate: Function}}
 * @throws {DataKindError}
 */
export function readGrid(doc, bytes) {
  const v = checked(doc);
  if (doc.layout !== 'dense')
    throw new DataKindError(
      'layout',
      'this reads a dense grid; a keyed grid is read with readKeyedGrid'
    );
  const { shape, cells } = v;
  const size = ENCODINGS[doc.storage.encoding];
  const need = cells * doc.outputs.length * size;
  const raw =
    doc.storage.data !== undefined ? bytesOfBase64(doc.storage.data) : bytes;
  if (!(raw instanceof Uint8Array) || raw.length !== need)
    throw new DataKindError(
      'bad-size',
      `the grid needs ${need} bytes; this holds ${raw?.length}`
    );
  const view = new DataView(raw.buffer, raw.byteOffset, raw.length);
  const values = new Float64Array(need / size);
  const f32 = doc.storage.encoding === 'float32-le';
  for (let i = 0, o = 0; i < values.length; i++, o += size)
    values[i] = f32 ? view.getFloat32(o, true) : view.getFloat64(o, true);
  const axes = doc.axes.map(a => ({
    name: a.name,
    unit: a.unit,
    values: Float64Array.from(a.values),
  }));
  const strides = shape.map((_, i) =>
    shape.slice(i + 1).reduce((a, b) => a * b, 1)
  );
  const outputIndex = name => {
    const k =
      name === undefined ? 0 : doc.outputs.findIndex(o => o.name === name);
    if (k < 0)
      throw new DataKindError(
        'no-output',
        `the grid has no output called ${name}`
      );
    return k;
  };
  return {
    axes,
    outputs: doc.outputs,
    shape,
    cells,
    values,
    /** The stored value at one cell: an index along each axis. */
    at(indices, output) {
      if (
        !Array.isArray(indices) ||
        indices.length !== shape.length ||
        indices.some((x, i) => !Number.isInteger(x) || x < 0 || x >= shape[i])
      )
        throw new DataKindError(
          'outside-domain',
          'an index is outside the grid'
        );
      return values[
        outputIndex(output) * cells +
          indices.reduce((s, x, i) => s + x * strides[i], 0)
      ];
    },
    /** Multilinear interpolation at a point (a value along each axis); no extrapolation. */
    interpolate(point, output) {
      if (
        !Array.isArray(point) ||
        point.length !== shape.length ||
        !point.every(Number.isFinite)
      )
        throw new DataKindError(
          'not-a-number',
          'a point needs a finite value along every axis'
        );
      const base = outputIndex(output) * cells;
      const lo = [];
      const w = [];
      for (let i = 0; i < shape.length; i++) {
        const a = axes[i].values;
        const x = point[i];
        if (x < a[0] || x > a[a.length - 1])
          throw new DataKindError(
            'outside-domain',
            `${axes[i].name} = ${x} is outside the grid (${a[0]} to ${a[a.length - 1]})`
          );
        if (a.length === 1) {
          lo.push(0);
          w.push(0);
          continue;
        }
        let l = 0;
        let h = a.length - 1;
        while (h - l > 1) {
          const m = (l + h) >> 1;
          if (a[m] <= x) l = m;
          else h = m;
        }
        lo.push(l);
        w.push((x - a[l]) / (a[l + 1] - a[l]));
      }
      let sum = 0;
      for (let corner = 0; corner < 1 << shape.length; corner++) {
        let weight = 1;
        let at = 0;
        for (let i = 0; i < shape.length; i++) {
          const up = (corner >> i) & 1;
          weight *= up ? w[i] : 1 - w[i];
          at += (lo[i] + up) * strides[i];
        }
        if (weight !== 0) sum += weight * values[base + at];
      }
      return sum;
    },
  };
}

/**
 * The cells a keyed grid's rows fall in, checked against the document.
 * @param {object} doc - A gravitas.grid, layout keyed
 * @param {{n: number, columns: Array<{id: string, values: ArrayLike<number>}>}} table
 *   A pack's table (js/tableObservation.js tableOf)
 * @returns {{rows: number, cells: Array<{index: number[], start: number, count: number}>,
 *   find: (at: number[]) => object|null}}
 * @throws {DataKindError}
 */
export function readKeyedGrid(doc, table) {
  checked(doc);
  if (doc.layout !== 'keyed')
    throw new DataKindError('layout', 'this reads a keyed grid');
  if (table?.n !== doc.rows)
    throw new DataKindError(
      'bad-size',
      `the document covers ${doc.rows} rows; the table has ${table?.n}`
    );
  const cols = doc.keys.map(k => table.columns.find(c => c.id === k));
  if (cols.some(c => !c))
    throw new DataKindError(
      'no-column',
      'the table lacks a key column the grid names'
    );
  const lookups = doc.axes.map(a => new Map(a.values.map((x, i) => [x, i])));
  const cells = [];
  const seen = new Set();
  let current = null;
  for (let r = 0; r < table.n; r++) {
    const index = cols.map((c, i) => lookups[i].get(c.values[r]));
    if (index.some(x => x === undefined))
      throw new DataKindError(
        'not-on-axis',
        `row ${r + 1} has a key that is not a value of its axis`
      );
    const key = index.join(',');
    if (current && current.key === key) current.count++;
    else {
      if (seen.has(key))
        throw new DataKindError(
          'not-contiguous',
          `the rows of cell ${key} are not together (row ${r + 1})`
        );
      seen.add(key);
      current = { key, index, start: r, count: 1 };
      cells.push(current);
    }
  }
  const out = cells.map(({ index, start, count }) => ({ index, start, count }));
  const declared = doc.cells;
  if (declared.length !== out.length)
    throw new DataKindError(
      'cells-differ',
      `the document lists ${declared.length} cells; the table fills ${out.length}`
    );
  out.forEach((c, i) => {
    const d = declared[i];
    const same =
      Array.isArray(d.at) &&
      d.at.length === c.index.length &&
      d.at.every((x, k) => x === doc.axes[k].values[c.index[k]]) &&
      d.count === c.count;
    if (!same)
      throw new DataKindError(
        'cells-differ',
        `cell ${i + 1} of the document is not the table's`
      );
  });
  const byKey = new Map(out.map(c => [c.index.join(','), c]));
  return {
    rows: table.n,
    cells: out,
    find: at => {
      const k = at.map((x, i) => lookups[i].get(x));
      return k.some(x => x === undefined)
        ? null
        : (byKey.get(k.join(',')) ?? null);
    },
  };
}
