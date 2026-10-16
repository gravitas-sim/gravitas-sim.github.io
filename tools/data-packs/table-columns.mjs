// =============================================================================
// A table of sources, encoded as `table-columns/1`
// -----------------------------------------------------------------------------
// Pure: rows in, the encoded SERIES and a record of the rounding out. The
// decoder is js/tableObservation.js, which says what the encoding is.
//
// Each column is given a step - the rounding it can stand, which the pack's
// definition states - and stored as the nearest whole number of steps from an
// offset (the middle of its range, so small numbers of steps suffice). The
// integer is int16 when the range fits and int32 when it does not; a value
// that is missing is stored as the type's most negative integer. The record
// says, per column, the type, the step, and the largest rounding error the
// encoding introduced, so a manifest states exactly what was lost.
// =============================================================================

import { Buffer } from 'node:buffer';

export const TABLE_VERSION = '1.0.0';
export const ENCODING = 'table-columns/1';

const LIMIT = { int16: 32767, int32: 2147483647 };
const MISSING = { int16: -32768, int32: -2147483648 };

/**
 * @param {Array<Record<string, number|null>>} rows
 * @param {Array<{id: string, step: number}>} columns - In PACK.columns order
 * @returns {{series: object, record: Array<object>}}
 */
export function encodeTable(rows, columns) {
  const n = rows.length;
  if (!n) throw new Error('a table needs a row');
  const record = [];
  const series = {
    encoding: ENCODING,
    n,
    columns: columns.map(({ id, step }) => {
      if (!(step > 0)) throw new Error(`${id} needs a positive step`);
      const values = rows.map(r => r[id]);
      const finite = values.filter(v => Number.isFinite(v));
      if (!finite.length) throw new Error(`${id} has no values`);
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of finite) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      // An offset on the grid of the step, so a value that is a whole number
      // of steps (a magnitude to the millimag) survives exactly.
      const offset = Math.round((lo + hi) / 2 / step) * step;
      const span = Math.max(
        Math.abs(Math.round((hi - offset) / step)),
        Math.abs(Math.round((lo - offset) / step))
      );
      const type = span <= LIMIT.int16 ? 'int16' : 'int32';
      if (span > LIMIT.int32)
        throw new Error(`${id} spans more than an int32 of steps`);
      const size = type === 'int16' ? 2 : 4;
      const buf = Buffer.alloc(size * n);
      let worst = 0;
      values.forEach((v, i) => {
        let k;
        if (!Number.isFinite(v)) k = MISSING[type];
        else {
          k = Math.round((v - offset) / step);
          worst = Math.max(worst, Math.abs(offset + k * step - v));
        }
        if (type === 'int16') buf.writeInt16LE(k, 2 * i);
        else buf.writeInt32LE(k, 4 * i);
      });
      record.push({
        id,
        type,
        step,
        missing: values.length - finite.length,
        maxRounding: Number(worst.toPrecision(3)),
      });
      return {
        type,
        offset: Number(offset.toPrecision(12)),
        step,
        data: buf.toString('base64'),
      };
    }),
  };
  return { series, record };
}

/**
 * A comma-separated table with one header row (after any `#` lines, which
 * SkyServer begins its answers with), as rows of numbers by column name.
 * @param {Uint8Array} bytes
 * @returns {Array<Record<string, number|string>>}
 */
export function readCsv(bytes) {
  const lines = Buffer.from(bytes)
    .toString('utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    if (cells.length !== head.length)
      throw new Error(`a row has ${cells.length} cells, not ${head.length}`);
    return Object.fromEntries(
      head.map((h, i) => {
        const v = cells[i];
        const x = Number(v);
        return [h, v !== '' && Number.isFinite(x) ? x : v];
      })
    );
  });
}
