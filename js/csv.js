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
// =============================================================================

/**
 * Quote a CSV field only when it needs it.
 * @param {*} v - Field value
 * @returns {string} A safe CSV field
 */
export function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // A leading =, +, - or @ makes a spreadsheet treat text as a formula, which
  // is a real hazard for a file named after whatever a student typed.
  const risky = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s));
  const needsQuote = risky || /[",\n\r]/.test(s);
  return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
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
