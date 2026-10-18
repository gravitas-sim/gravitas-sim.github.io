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
 * English digits in a locale's convention. Spanish writes a decimal comma and,
 * as the SI and the RAE do, groups with a narrow no-break space from five
 * digits up: 12 345,6 but 1234,5. Derived here rather than asked of Intl,
 * whose Spanish grouping differs between browsers.
 * @param {string} text - As en-US writes it
 * @param {string} [locale] - 'en', 'es', …
 * @returns {string}
 */
function inLocale(text, locale) {
  if (!String(locale || '').startsWith('es')) return text;
  const [whole, frac] = text.split('.');
  const digits = whole.replace(/\D/g, '').length;
  const grouped = whole.replace(/,/g, digits > 4 ? '\u202f' : '');
  return frac === undefined ? grouped : `${grouped},${frac}`;
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
export function scientific(value, sig = 3, compact = false, locale) {
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
  mantissa = typesetMinus(inLocale(mantissa, locale));
  // A power of ten of zero is just the number.
  if (exp === 0) return mantissa;
  return `${mantissa}${NBSP}${TIMES}${NBSP}10${superscript(exp)}`;
}

/**
 * Write a value in plain decimal, rounded to significant figures and grouped.
 *
 * @param {number} value - Any finite number
 * @param {number} [sig] - Significant figures
 * @returns {string} e.g. "1,230"
 */
export function decimal(value, sig = 3, locale) {
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
    inLocale(
      rounded.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
      locale
    )
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
  const { sig = 3, sci, compact = false, locale } = options;
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  // Decided on the rounded value, not the raw one: 99999 to three figures is
  // 100000, which belongs on the other side of the threshold it just crossed.
  const magnitude = Math.abs(Number(value.toPrecision(Math.max(1, sig))));
  const useSci =
    sci === undefined ? magnitude >= SCI_UPPER || magnitude < SCI_LOWER : sci;
  return useSci
    ? scientific(value, sig, compact, locale)
    : decimal(value, sig, locale);
}

/**
 * A fixed number of decimals, for the few places the count is the point: a
 * lesson widget whose text names a precision, or a value written into a field
 * a student edits. Not grouped, so js/answerParse.js reads it back.
 * @param {number} value
 * @param {number} decimals
 * @param {string} [locale]
 * @returns {string} '' when not finite
 */
export function fixed(value, decimals, locale) {
  if (!Number.isFinite(value)) return '';
  const text = value.toFixed(Math.max(0, Math.min(20, decimals)));
  return typesetMinus(inLocale(text, locale).replace(/\u202f/g, ''));
}

/**
 * A number rounded to significant figures, as a number: the value a field or a
 * starting bound should hold, where `decimal()` would return grouped text.
 * @param {number} value
 * @param {number} [sig] - Significant figures, default 3
 * @returns {number} The value unchanged when it is not finite
 */
export function roundSig(value, sig = 3) {
  return Number.isFinite(value)
    ? Number(value.toPrecision(Math.max(1, Math.min(21, Math.round(sig)))))
    : value;
}

/**
 * A value and its uncertainty at the uncertainty's precision: "1.234 ± 0.012",
 * or, with `interval`, the range it spans, "[1.222, 1.246]" ("[1,222; 1,246]"
 * in Spanish, whose comma is taken). Which uncertainty it is - one sigma, a
 * 95% interval - is the caller's to say beside it.
 * @param {number} value
 * @param {number} sigma - Not negative
 * @param {{sig?: number, locale?: string, interval?: boolean}} [options] -
 *   `sig` is the uncertainty's significant figures, 2 by default
 * @returns {string}
 */
export function withUncertainty(value, sigma, options = {}) {
  const { sig = 2, locale, interval = false } = options;
  if (!Number.isFinite(value)) return '-';
  if (!(sigma > 0)) return formatNumber(value, { locale });
  const place = Math.floor(Math.log10(sigma)) - (sig - 1);
  const decimals = Math.max(0, -place);
  const round = x => Math.round(x / 10 ** place) * 10 ** place;
  const show = x => typesetMinus(inLocale(x.toFixed(decimals), locale));
  if (interval) {
    const sep = String(locale || '').startsWith('es') ? ';' : ',';
    return `[${show(round(value - sigma))}${sep} ${show(round(value + sigma))}]`;
  }
  return `${show(round(value))}${NBSP}±${NBSP}${show(round(sigma))}`;
}

/**
 * A quantity and its uncertainty as one string, the precision taken from the
 * uncertainty (Prompt 150): a sigma or the half-width of a symmetric interval
 * sets the decimals and the figures shown, an asymmetric interval writes
 * "v +p −m" at the smaller side's precision, a limit writes "< v" or "> v", a
 * model-limited value takes its floor as the sigma, and a value that carries
 * no uncertainty is written alone. A failed or unconstrained quantity is the
 * bare "-" of this module: the word for what it is belongs to the caller's
 * catalog. Which uncertainty it is (one sigma, a 68% interval) is the
 * caller's to say beside it, from `level` and `basis`.
 * @param {{value: number|null, uncertainty: object}} q - An envelope's quantity
 * @param {{sig?: number, locale?: string, method?: boolean}} [options] -
 *   `sig` is the uncertainty's significant figures, 2 by default; with
 *   `method` the result is {text, method}, where method is one of 'sigma',
 *   'half-width', 'asymmetric', 'limit', 'floor', 'exact' or the state's kind,
 *   so a caller can say how the figures were chosen
 * @returns {string|{text: string, method: string}}
 */
export function formatUncertain(q, options = {}) {
  const { sig = 2, locale, method = false } = options;
  const u = q?.uncertainty ?? { kind: 'none' };
  const value = q?.value;
  const out = (text, how) => (method ? { text, method: how } : text);
  if (!Number.isFinite(value)) return out('-', u.kind);
  if (u.kind === 'sigma' && u.sigma > 0)
    return out(withUncertainty(value, u.sigma, { sig, locale }), 'sigma');
  if (u.kind === 'model-limited' && u.floor > 0)
    return out(withUncertainty(value, u.floor, { sig, locale }), 'floor');
  if (u.kind === 'limit')
    return out(
      `${u.bound === 'lower' ? '>' : '<'}${NBSP}${formatNumber(value, { sig, locale })}`,
      'limit'
    );
  if (u.kind === 'interval' && u.hi > u.lo) {
    const plus = u.hi - value;
    const minus = value - u.lo;
    if (Math.abs(plus - minus) <= 1e-9 * (u.hi - u.lo))
      return out(
        withUncertainty(value, (u.hi - u.lo) / 2, { sig, locale }),
        'half-width'
      );
    const small = Math.min(plus, minus);
    if (small > 0) {
      const decimals = Math.max(
        0,
        -(Math.floor(Math.log10(small)) - (sig - 1))
      );
      const show = x => typesetMinus(inLocale(x.toFixed(decimals), locale));
      return out(
        `${show(value)}${NBSP}+${show(plus)}${NBSP}${MINUS}${show(minus)}`,
        'asymmetric'
      );
    }
  }
  return out(
    formatNumber(value, { locale }),
    u.kind === 'none' ? 'exact' : u.kind
  );
}

/**
 * A value typed with its uncertainty, as the envelope would hold it (Prompt
 * 150): "9.81 ± 0.02" (or "+/-"), "9.81(2)" with the last digits in
 * brackets, "1.23 +0.05 -0.03", "< 3.2" and "> 3.2"; a bare number has none.
 * Every number is read by the shared reader, so the locale's decimal mark
 * and its refusals are the ones a typed answer meets. The uncertainty is
 * `assumed` in basis: it was stated, not estimated.
 * @param {string} text
 * @param {(raw: string, locale?: string) => {ok: boolean, value?: number,
 *   rest?: string}} readNumber - js/answerParse.js parseNumber
 * @param {string} [locale]
 * @returns {?{value: number, uncertainty: object}} Null when it is not one
 */
export function parseUncertain(text, readNumber, locale = 'en') {
  const raw = String(text ?? '').trim();
  const num = s => {
    const r = readNumber(s, locale);
    return r.ok && !r.rest ? r.value : NaN;
  };
  const assumed = { basis: 'assumed' };
  const limit = /^([<>])\s*(.+)$/.exec(raw);
  if (limit) {
    const value = num(limit[2]);
    return Number.isFinite(value)
      ? {
          value,
          uncertainty: {
            kind: 'limit',
            bound: limit[1] === '<' ? 'upper' : 'lower',
            ...assumed,
          },
        }
      : null;
  }
  const concise = /^(.*?\d)\((\d+)\)(.*)$/.exec(raw);
  if (concise && !concise[3].trim()) {
    const value = num(concise[1]);
    const decimal = /[.,](\d+)(?:[eE][+-]?\d+)?$/.exec(concise[1]);
    const exp = /[eE]([+-]?\d+)$/.exec(concise[1]);
    const sigma =
      Number(concise[2]) *
      10 ** (Number(exp?.[1] ?? 0) - (decimal ? decimal[1].length : 0));
    return Number.isFinite(value) && Number.isFinite(sigma)
      ? { value, uncertainty: { kind: 'sigma', sigma, ...assumed } }
      : null;
  }
  const pm = /^(.*?)\s*(?:±|\+\/-|\+-)\s*(.+)$/.exec(raw);
  if (pm) {
    const [value, sigma] = [num(pm[1]), num(pm[2])];
    return Number.isFinite(value) && sigma >= 0
      ? { value, uncertainty: { kind: 'sigma', sigma, ...assumed } }
      : null;
  }
  const asym = /^(.*?)\s+\+\s*(\S+)\s+[-\u2212]\s*(\S+)$/.exec(raw);
  if (asym) {
    const [value, plus, minus] = [num(asym[1]), num(asym[2]), num(asym[3])];
    return Number.isFinite(value) && plus >= 0 && minus >= 0
      ? {
          value,
          uncertainty: {
            kind: 'interval',
            lo: value - minus,
            hi: value + plus,
            ...assumed,
          },
        }
      : null;
  }
  const value = num(raw);
  return Number.isFinite(value)
    ? { value, uncertainty: { kind: 'none' } }
    : null;
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

/**
 * A count with its noun, agreeing in number.
 *
 * "1 written answers" appeared sixteen times across the instructor guides,
 * "1 predictions" four times and "1 graded questions" twice, because every one
 * of those was a template literal with an "s" typed after it. The grammar is
 * one line; the problem was that it was one line in one module and nowhere
 * else, so every other place that counted something wrote it out again.
 *
 *   plural(1, 'written answer')          -> '1 written answer'
 *   plural(4, 'written answer')          -> '4 written answers'
 *   plural(2, 'analysis', 'analyses')    -> '2 analyses'
 *
 * @param {number} n - How many
 * @param {string} one - The singular noun
 * @param {string} [many] - The plural, when adding "s" is wrong
 * @returns {string} The count and the noun, separated by a space
 */
export function plural(n, one, many = `${one}s`) {
  const count = Number.isFinite(n) ? n : 0;
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}
