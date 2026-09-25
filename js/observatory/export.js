// =============================================================================
// What the workspace writes, the same every time
// -----------------------------------------------------------------------------
// Two files, and both deterministic: the same source and the same list of
// changes give the same bytes, on any machine, in any language.
//
// - JSON is a gravitas.observation/1 (./schema.js) - the observation as the
//   reader sees it, every row, masked ones included - with a `workspace`
//   block: where it was opened from, the changes made to it in order, and,
//   when there are changes, the observation as it was opened. ./import.js
//   reads it back by making the changes again to that, so the file restores
//   the whole session, undo included, and checks that it gives the same
//   observation it holds.
//   Keys are written in a fixed order, numbers as JavaScript writes them
//   (the shortest string that reads back to the same double), a missing
//   value as null, and nothing about when or where it was made: no clock, no
//   locale, no screen.
// - CSV is the rows as they stand, every column with its unit in the header
//   as the registry spells it (so the import reads it back as a suggestion),
//   a `masked` column saying which rows the views leave out, and a missing
//   value as an empty field. Written through js/csv.js, so a text value that
//   looks like a spreadsheet formula is disarmed.
// =============================================================================

import { toCsv } from '../csv.js';
import { FORMAT, FORMAT_VERSION, maskedRows, rowCount } from './schema.js';

const numberOrNull = v =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** A plain object with its keys in the order given. */
const ordered = (o, keys) =>
  Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

const COLUMN_KEYS = ['id', 'name', 'unit', 'role', 'of', 'level', 'bits'];
const OBSERVATION_KEYS = [
  'kind',
  'id',
  'title',
  'object',
  'facility',
  'origin',
  'source',
  'credit',
  'license',
  'retrieved',
  'citations',
  'reductions',
  'axes',
  'time',
  'spectral',
  'image',
];

/**
 * The observation as it stands, with how it got there.
 * @param {object} o - After the changes (transforms.replay)
 * @param {{source: object, changes: object[]}} workspace - What it was opened
 *   as, and the changes, in order
 * @returns {string} JSON, two-space indented, with a final newline
 */
export function observationJson(o, { source, changes }) {
  const doc = {
    ...plain(o),
    workspace: {
      openedFrom: ordered(source.source || {}, [
        'kind',
        'id',
        'version',
        'file',
      ]),
      openedAs: source.id,
      changes: changes.map(ch => ({ ...ch })),
      // The observation as it was opened, so the file replays: read back,
      // the changes are made again to this, and give the observation above.
      source: changes.length ? plain(source) : null,
    },
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** An observation as JSON writes one, in the same key order as the top. */
function plain(o) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    ...ordered(o, OBSERVATION_KEYS),
    columns: o.columns.map(c => ({
      ...ordered(c, COLUMN_KEYS),
      values:
        c.role === 'label'
          ? Array.from(c.values, v => (v === undefined ? null : v))
          : Array.from(c.values, numberOrNull),
    })),
    masks: (o.masks || []).map(m =>
      ordered(m, ['id', 'label', 'source', 'rows'])
    ),
    annotations: (o.annotations || []).map(a =>
      ordered(a, ['id', 'rows', 'text'])
    ),
  };
}

/**
 * Whether two observations hold the same thing, as a save would write it:
 * the same columns, values, masks and notes. What read-back compares a
 * replayed session with.
 */
export const sameObservation = (a, b) =>
  JSON.stringify(plain(a)) === JSON.stringify(plain(b));

/** A column's header: its name and, where it has one, its unit. */
const heading = c => {
  if (c.role === 'label') return c.name;
  if (c.unit === null) return `${c.name} (unit not stated)`;
  return c.unit === '' ? c.name : `${c.name} (${c.unit})`;
};

/**
 * The rows as they stand, as CSV.
 * @param {object} o - After the changes
 * @returns {string} CRLF-terminated CSV
 */
export function observationCsv(o) {
  const masked = maskedRows(o);
  const n = rowCount(o);
  const rows = [[...o.columns.map(heading), 'masked']];
  for (let i = 0; i < n; i++) {
    rows.push([
      ...o.columns.map(c => {
        const v = c.values[i];
        if (c.role === 'label') return v ?? '';
        return Number.isFinite(v) ? v : '';
      }),
      masked.has(i) ? 1 : 0,
    ]);
  }
  return toCsv(rows);
}

/** A file name for an export: the observation's id, safe for a file system. */
export function exportName(o, ext) {
  const base = String(o.id)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'observation'}.${ext}`;
}
