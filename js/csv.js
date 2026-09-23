// =============================================================================
// CSV, the boring parts
// -----------------------------------------------------------------------------
// Quoting and number formatting for every file the application writes. A leaf
// module with no imports, which is the point: the trajectory export, the light
// curve and the experiment bench all write CSV, and the alternative to sharing
// this is three implementations that disagree about the one thing that
// actually matters here.
//
// That one thing is the leading `=`, `+`, `-` or `@`. A spreadsheet reads a
// field starting with any of them as a formula, so a student who names an
// experiment "=A1+1" produces a file that executes when opened. Escaping it is
// two lines and forgetting it is a vulnerability in a file format nobody
// thinks of as code.
//
// Quoting is not escaping. This used to wrap such a field in double quotes and
// call it defused, but the quotes are CSV syntax: the reader strips them and
// the cell is `=A1+1` again, and Excel evaluates it. What a spreadsheet does
// not evaluate is a cell that begins with an apostrophe, so that is what a
// risky field now gets, inside the quotes. And "begins with" is measured after
// any leading whitespace or control characters, and counts the full-width
// forms of the four characters, because more than one spreadsheet trims the
// first and folds the second before it decides.
// =============================================================================

/** The characters that make a spreadsheet start a formula, and their full-width forms. */
const FORMULA_CHARS = new Set([
  '=',
  '+',
  '-',
  '@',
  '\uff1d',
  '\uff0b',
  '\uff0d',
  '\uff20',
]);

/**
 * The first character a spreadsheet will look at, once it has skipped what it
 * skips: spaces and other whitespace, control characters, a no-break space, a
 * zero-width space and a byte-order mark.
 * @param {string} s - Field text
 * @returns {string} That character, or ''
 */
function firstSignificant(s) {
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    const skipped =
      c <= 0x20 || c === 0x7f || c === 0xa0 || c === 0x200b || c === 0xfeff;
    if (!skipped) break;
    i++;
  }
  return s.charAt(i);
}

/**
 * Quote a CSV field only when it needs it, and disarm one that a spreadsheet
 * would run.
 *
 * A plain finite number - `-3.5`, `+2`, `1e-9` - is a number and is left
 * alone, so a column of values stays a column of values.
 *
 * @param {*} v - Field value
 * @returns {string} A safe CSV field
 */
export function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const number = s.trim() !== '' && Number.isFinite(Number(s));
  const risky =
    !number && (FORMULA_CHARS.has(firstSignificant(s)) || /^[\t\r]/.test(s));
  const text = risky ? `'${s}` : s;
  const needsQuote = risky || /[",\n\r]/.test(text);
  return needsQuote ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A number written for a file rather than a screen: enough digits to fit a
 * curve to, none of the noise beyond that, and never an empty cell for a
 * value that exists.
 * @param {number} v - The value
 * @param {number} [sig] - Significant digits
 * @returns {string} Formatted number, or '' when there is no value
 */
export function num(v, sig = 8) {
  if (!Number.isFinite(v)) return '';
  if (v === 0) return '0';
  const out = Number(v.toPrecision(sig));
  // toPrecision on a large number gives exponent form, which every reader
  // parses; what matters is that we never emit '1.0000000e+2' style noise.
  return String(out);
}

/**
 * Assemble rows into a CSV document with CRLF line endings.
 * @param {Array<Array<*>>} rows - Header row first
 * @returns {string} The document
 */
export const toCsv = rows =>
  `${rows.map(r => r.map(csvField).join(',')).join('\r\n')}\r\n`;

/**
 * Read back what toCsv wrote.
 *
 * The exact inverse, and it exists so that a table on screen and the file a
 * reader downloads cannot be two different derivations of the same data. The
 * accessible plot tables render whatever the exporter produced rather than
 * building rows of their own; the alternative is two row-builders that agree
 * today, which is the arrangement every other part of this project has been
 * bitten by.
 *
 * Handles what csvField emits and nothing more: quoted fields, doubled quotes
 * inside them, and CRLF or LF between records. A field csvField disarmed is
 * returned as written, apostrophe and all - the prefix that stops a spreadsheet
 * running it is a property of the file, not of the value, and a reader of this
 * output is shown what a spreadsheet would be shown. Guessing which leading
 * apostrophes to take back off would be the caller's surprise rather than its
 * convenience.
 *
 * @param {string} text - A CSV document
 * @returns {Array<Array<string>>} Rows of fields, header first, no trailing blank
 */
export function fromCsv(text) {
  if (typeof text !== 'string' || text === '') return [];
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        // A doubled quote is one literal quote; a lone one closes the field.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === '') {
      quoted = true;
      i++;
      continue;
    }
    if (c === ',') {
      endField();
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      endRow();
      // CRLF is one terminator, not two empty rows.
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += c;
    i++;
  }
  // toCsv always ends with a terminator, so anything left is a final record
  // written by something else; keeping it is more useful than dropping it.
  if (field !== '' || row.length) endRow();
  return rows;
}
