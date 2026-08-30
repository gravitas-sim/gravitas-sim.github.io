// =============================================================================
// Number typography
// -----------------------------------------------------------------------------
// One place that decides how a number looks, so that the same quantity reads
// the same way in the inspector, on a canvas label, in a widget readout, on a
// chart axis and in an exported PDF.
//
// The rules it applies:
//
//   - Scientific notation is written the way it is written on a blackboard,
//     1.99 x 10^30, not the way a language prints a float, 1.99e+30. The
//     exponent uses Unicode superscript digits rather than markup, so the same
//     string works in HTML, in canvas fillText, and in a PDF, and there is only
//     one implementation to keep correct.
//   - Significant figures, not decimal places. Three by default. A fixed number
//     of decimals is wrong at both ends: it prints 0.00 for a small planet and
//     100039.2 for a black hole.
//   - A real multiplication sign and a real minus sign, not the letter x and
//     the hyphen.
//   - A non-breaking space between a value and its unit, so "1.23 x 10^6 M" is
//     never split across a line from its own symbol.
//
// Nothing here parses. Display strings contain typographic characters that
// Number() will not read back, which is safe because no code path turns
// displayed text into a number again. Machine-readable output - the CSV export
// in particular - deliberately does not come through this module.
// =============================================================================

/** Non-breaking space: binds a value to its unit. Written as an escape so it
 * survives a copy-paste and is visible to anyone reading the source. */
export const NBSP = '\u00a0';
/** True minus sign (U+2212), not the hyphen-minus. */
export const MINUS = '\u2212';
/** True multiplication sign (U+00D7), not the letter x. */
export const TIMES = '\u00d7';

const SUPERSCRIPTS = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
  '-': '\u207b',
};

// Outside this range a number is written as a power of ten. The lower bound is
// where leading zeros start to outnumber digits; the upper is where a grouped
// integer stops being readable at a glance. Both are conventional, and this is
// a tool whose subject matter is measured in powers of ten.
const SCI_UPPER = 1e5;
const SCI_LOWER = 1e-3;

/**
 * Render an integer as Unicode superscript digits.
 *
 * @param {number} n - Integer exponent, may be negative
 * @returns {string} e.g. 30 -> "³⁰", -11 -> "⁻¹¹"
 */
export function superscript(n) {
  return String(Math.trunc(n))
    .split('')
    .map(ch => SUPERSCRIPTS[ch] ?? '')
    .join('');
}

/**
 * Replace a leading hyphen-minus with a true minus sign.
 *
 * @param {string} s - Formatted number
 * @returns {string} The same string, typeset
 */
function typesetMinus(s) {
  return s.startsWith('-') ? MINUS + s.slice(1) : s;
}

/**
 * Write a value as a power of ten.
 *
 * The mantissa is always shown, including when it rounds to 1. "1.00 x 10^6"
 * next to "2.50 x 10^6" lines up as a column; a bare "10^6" does not, and
 * columns are the reason this module exists.
 *
 * @param {number} value - Any finite number
 * @param {number} [sig] - Significant figures
 * @param {boolean} [compact] - Drop a mantissa of exactly 1, and trailing
 *   zeros, for places where width matters more than alignment: axis ticks.
 * @returns {string} e.g. "1.99 × 10³⁰"
 */
export function scientific(value, sig = 3, compact = false) {
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  const digits = Math.max(1, Math.min(20, Math.round(sig)));
  const [mantissaText, exponent] = value.toExponential(digits - 1).split('e');
  const exp = Number(exponent);
  let mantissa = mantissaText;
  if (compact) {
    // 1.0 -> 1, 2.50 -> 2.5. Only safe where nothing is being lined up.
    mantissa = String(Number(mantissa));
    if (mantissa === '1') return `10${superscript(exp)}`;
    if (mantissa === '-1') return `${MINUS}10${superscript(exp)}`;
  }
  // A power of ten of zero is just the number.
  if (exp === 0) return typesetMinus(mantissa);
  return `${typesetMinus(mantissa)}${NBSP}${TIMES}${NBSP}10${superscript(exp)}`;
}

/**
 * Write a value in plain decimal, rounded to significant figures and grouped.
 *
 * @param {number} value - Any finite number
 * @param {number} [sig] - Significant figures
 * @returns {string} e.g. "1,230"
 */
export function decimal(value, sig = 3) {
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  const digits = Math.max(1, Math.min(21, Math.round(sig)));
  const rounded = Number(value.toPrecision(digits));
  // Trailing zeros are kept, because that is what a significant figure is: 1
  // solar mass measured to three figures is 1.00, not 1. Dropping them also
  // breaks the column - "1", "0.75" and "80" share no decimal point to line up
  // on, while "1.00", "0.750" and "80.0" do.
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  const decimals = Math.max(0, Math.min(20, digits - 1 - exponent));
  return typesetMinus(
    rounded.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/**
 * Format a number for display, choosing decimal or scientific notation.
 *
 * @param {number} value - Any number
 * @param {object} [options] - Formatting options
 * @param {number} [options.sig] - Significant figures, default 3
 * @param {boolean} [options.sci] - Force scientific notation on or off
 * @param {boolean} [options.compact] - Shortest readable form, for axis ticks
 * @returns {string} Formatted number, with no unit attached
 */
export function formatNumber(value, options = {}) {
  const { sig = 3, sci, compact = false } = options;
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  // Decided on the rounded value, not the raw one: 99999 to three figures is
  // 100000, which belongs on the other side of the threshold it just crossed.
  const magnitude = Math.abs(Number(value.toPrecision(Math.max(1, sig))));
  const useSci =
    sci === undefined ? magnitude >= SCI_UPPER || magnitude < SCI_LOWER : sci;
  return useSci ? scientific(value, sig, compact) : decimal(value, sig);
}

/**
 * Format a number as short as it can be while staying readable.
 *
 * For chart axes, where a dozen labels compete for room and nothing is being
 * compared digit by digit.
 *
 * @param {number} value - Any number
 * @param {number} [sig] - Significant figures
 * @returns {string} e.g. "10³", "2.5 × 10⁻⁴", "0.25"
 */
export function tickLabel(value, sig = 2) {
  return formatNumber(value, { sig, compact: true });
}

/**
 * Join a formatted value to its unit symbol so the two cannot be separated.
 *
 * @param {string|number} value - Formatted value, or a number to format
 * @param {string} symbol - Unit symbol, e.g. "M☉"
 * @param {object} [options] - Passed to formatNumber when value is a number
 * @returns {string} e.g. "1.99 × 10³⁰ kg"
 */
export function withUnit(value, symbol, options) {
  let text = typeof value === 'number' ? formatNumber(value, options) : value;
  // A caller that formatted its own value - a lesson widget holding on to a
  // decimal count the lesson text depends on - still gets the typography. Only
  // a hyphen in front of something that reads as a number is a minus sign; the
  // bare '-' this module uses for "no value" is left alone.
  if (typeof text === 'string' && text.startsWith('-')) {
    const rest = text.slice(1).replace(/,/g, '');
    if (rest !== '' && Number.isFinite(Number(rest))) {
      text = MINUS + text.slice(1);
    }
  }
  if (!symbol) return text;
  return `${text}${NBSP}${symbol}`;
}

/**
 * Strip typographic characters back to something a machine can parse.
 *
 * Not used for display. It exists so that a test, or any future consumer that
 * needs the value rather than the picture of it, has one obvious way back
 * rather than inventing its own regular expression.
 *
 * @param {string} text - A string produced by this module
 * @returns {number} The value, or NaN
 */
export function parseFormatted(text) {
  if (typeof text !== 'string') return NaN;
  const superToDigit = Object.fromEntries(
    Object.entries(SUPERSCRIPTS).map(([k, v]) => [v, k])
  );
  const normalized = text
    .replace(/[⁰¹²³⁴-⁹⁻]/g, ch => String(superToDigit[ch] ?? ''))
    .replace(new RegExp(MINUS, 'g'), '-')
    .replace(new RegExp(`\\s*${TIMES}\\s*10`, 'g'), 'e')
    .replace(/[\s\u00a0,]/g, '');
  return Number(normalized);
}
