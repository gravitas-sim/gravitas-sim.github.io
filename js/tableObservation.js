// =============================================================================
// A catalog pack's table, as the Observatory reads it
// -----------------------------------------------------------------------------
// A data pack whose data is a table of sources - a cluster's photometry, a
// survey's spectroscopic parameters, a model grid - rather than a series or an
// image. Its SERIES is `table-columns/1`:
//
//   { encoding: 'table-columns/1', n,
//     columns: [{ type: 'int16' | 'int32', offset, step, data }] }
//
// one entry per column of PACK.columns, in the same order: each value is
// `offset + step * k` for the little-endian integer k, and the integer's most
// negative value means the value is missing. The builder chooses the type and
// the step (tools/data-packs/table-columns.mjs), and the manifest records both,
// so the rounding every column carries is stated rather than hidden.
//
// Its own module, not js/observation.js: that one loads with the catalog page,
// whose every byte is budgeted, and no catalog pack is a table. The
// Observatory imports this only when it opens a table pack.
//
// Pure: no DOM, no state, no imports. Browser and Node alike.
// =============================================================================

export const TABLE_ENCODING = 'table-columns/1';

const SIZE = { int16: 2, int32: 4 };
const MISSING = { int16: -32768, int32: -2147483648 };

/** Base64 to bytes, without Buffer. */
function bytesOf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * The table a pack module holds.
 * @param {{PACK: object, SERIES: object}} pack
 * @returns {{columns: Array<{id: string, name: string, unit: string,
 *   uncertaintyOf: string|null, description: string, values: Float64Array}>,
 *   n: number, source: object}}
 */
export function tableOf(pack) {
  const { PACK, SERIES } = pack || {};
  if (SERIES?.encoding !== TABLE_ENCODING)
    throw new Error(
      `not a table pack this build can read (${SERIES?.encoding ?? 'no encoding'})`
    );
  const n = SERIES.n;
  if (!(Number.isInteger(n) && n > 0))
    throw new Error('the table promises no rows');
  if (SERIES.columns.length !== PACK.columns.length)
    throw new Error(
      `the table encodes ${SERIES.columns.length} columns and describes ${PACK.columns.length}`
    );
  const columns = SERIES.columns.map((c, j) => {
    const size = SIZE[c.type];
    if (!size)
      throw new Error(`column ${j + 1} is of no type this build reads`);
    if (!(c.step > 0)) throw new Error(`column ${j + 1} has no step`);
    const bytes = bytesOf(c.data);
    if (bytes.length !== size * n)
      throw new Error(
        `column ${j + 1} holds ${bytes.length / size} values, not ${n}`
      );
    const view = new DataView(bytes.buffer);
    const values = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const k =
        size === 2 ? view.getInt16(2 * i, true) : view.getInt32(4 * i, true);
      values[i] = k === MISSING[c.type] ? NaN : c.offset + c.step * k;
    }
    const d = PACK.columns[j];
    return {
      id: d.id,
      name: d.name,
      unit: d.unit ?? '',
      // The manifest names the column an uncertainty belongs to; the table
      // says which, by id.
      uncertaintyOf: d.uncertaintyOf
        ? (PACK.columns.find(x => x.name === d.uncertaintyOf)?.id ?? null)
        : null,
      description: d.description ?? '',
      values,
    };
  });
  return {
    columns,
    n,
    source: {
      kind: 'pack',
      id: PACK.id,
      version: PACK.version,
      credit: PACK.credit,
    },
  };
}

/**
 * Whether a table can be read: every column the same length, and every value
 * a number or missing.
 * @returns {string[]} Problems, empty when there are none
 */
export function checkTable(t) {
  if (!t?.columns?.length) return ['it has no columns'];
  const ids = new Set();
  for (const c of t.columns) {
    if (!c.id) return [`column ${c.name} has no id`];
    if (ids.has(c.id)) return [`two columns are called ${c.id}`];
    ids.add(c.id);
    if (c.values.length !== t.n) return [`${c.id} has ${c.values.length} rows`];
    if (c.uncertaintyOf && !t.columns.some(x => x.id === c.uncertaintyOf))
      return [`${c.id} is the uncertainty of a column there is not`];
  }
  return [];
}
