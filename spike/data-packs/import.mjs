// Spike: a student's own CSV or JSON file, read into the same observation a
// curated pack decodes to (./observation.mjs). Production import - the mapping
// interface, remembered choices, migration - is Prompt 15's; this is the
// parser and the rules, to measure and to test.
//
// What it accepts
//   Delimited text: comma, tab, semicolon or runs of spaces, found by which
//   one gives every row the same number of fields. `#` and `%` lines are
//   comments. A first row with a word in it is a header, and a header may
//   carry units as "time (d)" or "flux [e-/s]". With semicolons, a decimal
//   comma is read as a point, which is how a European spreadsheet exports.
//   JSON: an array of row objects, an object of equal-length column arrays,
//   or an observation this code wrote.
//
// What it will not do
//   Guess silently. Every row it drops, every reordering and every column it
//   chose without being told is returned as a note, so the interface can show
//   the student what was read, not only what was drawn.

import { checkObservation } from './observation.mjs';

export const LIMITS = { bytes: 5_000_000, rows: 100_000 };
const X_NAMES = /^(time|t|bjd|btjd|hjd|jd|mjd|date|phase)\b/i;
const Y_NAMES = /(flux|rv|velocity|mag|brightness|signal)/i;
const E_NAMES = /(err|error|sigma|unc|uncert)/i;

/**
 * @param {string} text - The file's contents
 * @param {{name?: string, mapping?: {x?: string|number, y?: string|number, err?: string|number|null}, units?: {x?: string, y?: string}}} [opts]
 * @returns {{observation: object|null, errors: string[], notes: string[]}}
 */
export function importObservation(text, opts = {}) {
  const errors = [];
  const notes = [];
  const fail = message => ({ observation: null, errors: [...errors, message], notes });
  if (typeof text !== 'string' || !text.trim()) return fail('The file is empty.');
  if (text.length > LIMITS.bytes) return fail(`The file is over ${LIMITS.bytes / 1e6} MB.`);
  const body = text.replace(/^\uFEFF/, '');
  const trimmed = body.trimStart();

  let table;
  let format;
  if (trimmed[0] === '{' || trimmed[0] === '[') {
    format = 'json';
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      return fail(`The file is not valid JSON (${err.message}).`);
    }
    if (parsed && parsed.x?.values && parsed.y?.values) parsed = fromObservation(parsed);
    table = tableFromJson(parsed);
  } else {
    format = 'delimited';
    table = tableFromText(body);
  }
  if (typeof table === 'string') return fail(table);
  if (table.rows.length > LIMITS.rows) return fail(`The file has more than ${LIMITS.rows} rows.`);
  if (table.columns.length < 2) return fail('A series needs at least two columns: a time and a value.');
  if (table.guessedDelimiter) notes.push(`Read as ${table.guessedDelimiter}-separated.`);
  if (table.decimalComma) notes.push('Commas inside numbers were read as decimal points.');

  const pick = (want, pattern, fallback, role) => {
    if (want !== undefined && want !== null) {
      const i = typeof want === 'number' ? want : table.columns.findIndex(c => c.name === want);
      if (i < 0 || i >= table.columns.length) {
        errors.push(`There is no column "${want}" for the ${role}.`);
        return -1;
      }
      return i;
    }
    if (want === null) return -1;
    let i = table.columns.findIndex(c => pattern.test(c.name));
    if (i < 0) i = fallback < table.columns.length ? fallback : -1;
    if (i >= 0) notes.push(`Used "${table.columns[i].name}" as the ${role}.`);
    return i;
  };
  const m = opts.mapping || {};
  const xi = pick(m.x, X_NAMES, 0, 'time');
  const yi = pick(m.y, Y_NAMES, xi === 0 ? 1 : 0, 'value');
  // An uncertainty is taken by position only from a file with no header:
  // a third named column that does not look like an error is not one.
  let ei = pick(m.err, E_NAMES, table.headerless ? 2 : Infinity, 'uncertainty');
  if (errors.length) return { observation: null, errors, notes };
  if (xi === yi) return fail('The time and the value are the same column.');
  if (ei === xi || ei === yi) ei = -1;

  // Rows that are not all numbers are dropped, and counted.
  const rows = [];
  let dropped = 0;
  for (const r of table.rows) {
    const x = r[xi];
    const y = r[yi];
    const e = ei >= 0 ? r[ei] : 1;
    if (Number.isFinite(x) && Number.isFinite(y) && (ei < 0 || (Number.isFinite(e) && e > 0))) rows.push([x, y, e]);
    else dropped++;
  }
  if (!rows.length) return fail('No row has numbers in every column that was used.');
  if (dropped > rows.length) return fail(`${dropped} of ${dropped + rows.length} rows are not numbers; is this the right file?`);
  if (dropped) notes.push(`${dropped} row${dropped === 1 ? ' was' : 's were'} not numbers and ${dropped === 1 ? 'was' : 'were'} left out.`);
  let sorted = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] < rows[i - 1][0]) {
      sorted = true;
      break;
    }
  }
  if (sorted) {
    rows.sort((a, b) => a[0] - b[0]);
    notes.push('The rows were not in time order, and were sorted.');
  }
  if (ei < 0) notes.push('No uncertainty column: the points have no error bars.');

  const col = (i, role) => ({
    name: table.columns[i].name,
    unit: opts.units?.[role] ?? table.columns[i].unit ?? '',
  });
  const observation = {
    quantity: guessQuantity(table.columns[yi].name),
    x: { ...col(xi, 'x'), values: Float64Array.from(rows, r => r[0]) },
    y: { ...col(yi, 'y'), values: Float64Array.from(rows, r => r[1]) },
    err: ei >= 0 ? Float64Array.from(rows, r => r[2]) : null,
    source: { kind: 'student-file', name: opts.name || 'file', bytes: text.length, format, dropped, sorted },
  };
  const problems = checkObservation(observation);
  if (problems.length) return fail(problems[0]);
  return { observation, errors, notes };
}

function guessQuantity(name) {
  if (/rv|velocity/i.test(name)) return 'radial-velocity';
  if (/mag/i.test(name)) return 'magnitude';
  if (/flux|brightness/i.test(name)) return 'relative-flux';
  return 'value';
}

/** "flux (e-/s)" -> { name: 'flux', unit: 'e-/s' } */
function header(cell) {
  const m = /^(.*?)\s*[([]\s*([^)\]]*)\s*[)\]]\s*$/.exec(cell);
  return m ? { name: m[1].trim(), unit: m[2].trim() } : { name: cell.trim(), unit: null };
}

// Semicolon before comma: in "1,5;2,3" the commas are decimal points.
const DELIMITERS = [
  ['tab', /\t/],
  ['semicolon', /;/],
  ['comma', /,/],
  ['space', /\s+/],
];

function tableFromText(text) {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('%'));
  if (!lines.length) return 'The file has no data lines.';
  const sample = lines.slice(0, 20);
  let chosen = null;
  for (const [label, re] of DELIMITERS) {
    const counts = sample.map(l => l.split(re).length);
    if (counts[0] > 1 && counts.every(c => c === counts[0])) {
      chosen = [label, re];
      break;
    }
  }
  if (!chosen) return 'The columns could not be told apart: no separator gives every row the same number of fields.';
  const [label, re] = chosen;
  const split = l => l.split(re).map(c => c.trim().replace(/^"(.*)"$/, '$1'));
  const decimalComma = label === 'semicolon' && sample.some(l => /\d,\d/.test(l));
  const num = c => (c === '' ? NaN : Number(decimalComma ? c.replace(',', '.') : c));
  const first = split(lines[0]);
  const isHeader = first.some(c => c !== '' && Number.isNaN(num(c)));
  const columns = isHeader ? first.map(header) : first.map((_, i) => ({ name: `column ${i + 1}`, unit: null }));
  const rows = (isHeader ? lines.slice(1) : lines).map(l => split(l).map(num));
  return { columns, rows, guessedDelimiter: label, decimalComma, headerless: !isHeader };
}

function tableFromJson(v) {
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (Array.isArray(v)) {
    if (!v.length || typeof v[0] !== 'object' || v[0] === null) return 'The JSON array does not hold rows.';
    const names = Object.keys(v[0]);
    return {
      columns: names.map(header),
      rows: v.map(r => names.map(k => (r && own(r, k) ? Number(r[k]) : NaN))),
    };
  }
  if (v && typeof v === 'object') {
    const names = Object.keys(v).filter(k => Array.isArray(v[k]));
    if (names.length < 2) return 'The JSON object needs at least two arrays of numbers.';
    const n = v[names[0]].length;
    if (names.some(k => v[k].length !== n)) return 'The JSON columns are not the same length.';
    return {
      columns: names.map(header),
      rows: Array.from({ length: n }, (_, i) => names.map(k => Number(v[k][i]))),
    };
  }
  return 'The JSON is neither rows nor columns.';
}

/** An observation written out by exportJson, read back as columns. */
function fromObservation(o) {
  const label = c => (c.unit ? `${c.name} (${c.unit})` : c.name);
  const out = { [label(o.x)]: Array.from(o.x.values), [label(o.y)]: Array.from(o.y.values) };
  if (Array.isArray(o.err)) out[`${o.y.name}_err`] = o.err;
  return out;
}

/** An observation as JSON: typed arrays written as plain arrays. */
export function exportJson(o) {
  const col = c => ({ ...c, values: Array.from(c.values) });
  return JSON.stringify({ quantity: o.quantity, x: col(o.x), y: col(o.y), err: o.err ? Array.from(o.err) : null });
}

/** An observation as CSV a spreadsheet opens, and this module reads back. */
export function exportCsv(o) {
  const label = c => (c.unit ? `${c.name} (${c.unit})` : c.name);
  const head = [label(o.x), label(o.y), ...(o.err ? [`${o.y.name}_err`] : [])];
  const lines = [head.join(',')];
  for (let i = 0; i < o.x.values.length; i++) {
    lines.push([o.x.values[i], o.y.values[i], ...(o.err ? [o.err[i]] : [])].join(','));
  }
  return `${lines.join('\n')}\n`;
}
