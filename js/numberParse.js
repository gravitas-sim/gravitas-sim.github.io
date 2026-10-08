// =============================================================================
// Reading a typed number: the leaf under js/answerParse.js
// -----------------------------------------------------------------------------
// parseNumber, typedNumber and decimalSeparatorFor live here, with no imports,
// so a page that only needs a text field read as a number (the mission pages,
// the 3-D lab, the course builder) does not carry the unit tables and the
// constants answerParse.js needs. answerParse.js re-exports all of it; that is
// still the module everything else imports.
// =============================================================================

/** Why a value could not be read. Each is a distinct thing to tell a student. */
export const PARSE_FAILURE = Object.freeze({
  BLANK: 'blank',
  NOT_A_NUMBER: 'notANumber',
  AMBIGUOUS_SEPARATOR: 'ambiguousSeparator',
  TRAILING_TEXT: 'trailingText',
  UNKNOWN_UNIT: 'unknownUnit',
  INCOMPATIBLE_UNIT: 'incompatibleUnit',
  UNIT_NOT_ALLOWED: 'unitNotAllowed',
});

/** Characters a student might type meaning "minus". */
const MINUS = /[−‐‑]/g;

/** Unicode superscript digits, for "10⁸". */
const SUPERSCRIPT = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
  '⁺': '+',
};

/** Spaces that can appear inside a grouped number. */
const SPACES = /[\u0020\u00a0\u2007\u202f]/g;

/**
 * Which character separates the decimal part, in this locale.
 *
 * @param {string} locale - 'en', 'es', …
 * @returns {string} '.' or ','
 */
export function decimalSeparatorFor(locale) {
  // Spanish writes 3,14. English writes 3.14. Anything unrecognised gets the
  // English convention, which is also what the lesson data is written in.
  return String(locale || '').startsWith('es') ? ',' : '.';
}

/**
 * A typed number as a plain number, or NaN: the whole text read by
 * parseNumber under the locale's decimal mark, nothing left over, ambiguous
 * input refused. The one reader for a text field that holds only a number.
 *
 * @param {string} raw - What was typed
 * @param {string} [locale] - For the decimal separator
 * @returns {number} The value, or NaN
 */
export function typedNumber(raw, locale = 'en') {
  const r = parseNumber(raw, locale);
  return r.ok && !r.rest ? r.value : NaN;
}

/**
 * Read the numeric part of a string.
 *
 * Returns the number and whatever text followed it, so the caller can decide
 * what a trailing unit means - which depends on the step, not on the number.
 *
 * @param {string} raw - What the student typed
 * @param {string} [locale] - For the decimal separator
 * @returns {{ok: true, value: number, rest: string}|{ok: false, reason: string, detail?: object}}
 */
export function parseNumber(raw, locale = 'en') {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, reason: PARSE_FAILURE.BLANK };

  // Normalize the characters that mean something we understand, and only those.
  let s = text.replace(MINUS, '-');
  s = s.replace(/[⁰¹²³⁴-⁹⁺⁻]/g, c => SUPERSCRIPT[c] ?? c);
  // "×10^8", "x10^8", "*10^8", "·10^8" all mean the same exponent.
  s = s.replace(/\s*[×x*·]\s*10\s*\^?\s*(-?\+?\d+)/i, 'e$1');
  // "10^8" on its own, with no mantissa written.
  s = s.replace(/^10\s*\^\s*(-?\+?\d+)/, '1e$1');

  const decimal = decimalSeparatorFor(locale);
  const grouping = decimal === '.' ? ',' : '.';

  // Pull off the numeric head: sign, digits with separators, optional exponent.
  const match = s.match(
    /^([+-]?)((?:\d[\d.,\u0020\u00a0\u2007\u202f]*)?\d|\d)(?:[eE]([+-]?\d+))?(.*)$/s
  );
  if (!match) return { ok: false, reason: PARSE_FAILURE.NOT_A_NUMBER };

  const [, sign, digitsRaw, exponent, restRaw] = match;
  const rest = String(restRaw || '').trim();

  const digits = digitsRaw.replace(SPACES, '');
  const parsed = readGroupedDigits(digits, decimal, grouping);
  if (!parsed.ok) return parsed;

  // One literal, parsed once. Reading the mantissa and then multiplying by a
  // power of ten rounds twice: 3 * 1e-5 is 3.0000000000000004e-5, and a student
  // who typed 3e-5 wrote a number JavaScript can represent exactly.
  const literal = `${sign === '-' ? '-' : ''}${parsed.canonical}${
    exponent === undefined ? '' : `e${exponent}`
  }`;
  const value = Number(literal);
  if (!Number.isFinite(value))
    return { ok: false, reason: PARSE_FAILURE.NOT_A_NUMBER };

  return { ok: true, value, rest };
}

/**
 * Turn a run of digits and separators into a number.
 *
 * The awkward case is a single separator with exactly three digits after it:
 * "1,234" is one thousand two hundred and thirty-four to an English reader and
 * one point two three four to a Spanish one, and nothing in the string settles
 * it. The locale settles it, which is why it is threaded all the way down here
 * rather than guessed at.
 *
 * @param {string} digits - Digits and separators, no spaces
 * @param {string} decimal - The locale's decimal separator
 * @param {string} grouping - The other one
 */
function readGroupedDigits(digits, decimal, grouping) {
  const hasDecimal = digits.includes(decimal);
  const hasGrouping = digits.includes(grouping);

  if (!hasDecimal && !hasGrouping) {
    return { ok: true, canonical: digits };
  }

  if (hasDecimal && hasGrouping) {
    // Both present: the last one to appear is the decimal point, whatever the
    // locale says, because nobody writes a thousands separator after a decimal
    // point. "1.234,5" and "1,234.5" are both 1234.5.
    const lastDecimal = digits.lastIndexOf(decimal);
    const lastGrouping = digits.lastIndexOf(grouping);
    const point = lastDecimal > lastGrouping ? decimal : grouping;
    const group = point === decimal ? grouping : decimal;
    if (digits.split(point).length > 2) {
      return { ok: false, reason: PARSE_FAILURE.AMBIGUOUS_SEPARATOR };
    }
    const [whole, frac] = digits.split(point);
    if (!isWellGrouped(whole, group)) {
      return { ok: false, reason: PARSE_FAILURE.AMBIGUOUS_SEPARATOR };
    }
    return {
      ok: true,
      canonical: `${whole.split(group).join('')}.${frac}`,
    };
  }

  const sep = hasDecimal ? decimal : grouping;
  const parts = digits.split(sep);

  if (sep === decimal) {
    // The locale's own decimal separator, used more than once, is not a number.
    if (parts.length > 2)
      return { ok: false, reason: PARSE_FAILURE.AMBIGUOUS_SEPARATOR };
    return { ok: true, canonical: `${parts[0] || '0'}.${parts[1]}` };
  }

  // The other separator. Well-formed grouping is grouping; anything else is a
  // decimal point written in the other convention, which is worth accepting -
  // a Spanish speaker typing 3.14 into an English interface means pi.
  if (isWellGrouped(digits, sep)) {
    return { ok: true, canonical: parts.join('') };
  }
  if (parts.length > 2)
    return { ok: false, reason: PARSE_FAILURE.AMBIGUOUS_SEPARATOR };
  return { ok: true, canonical: `${parts[0] || '0'}.${parts[1]}` };
}

/** Whether a digit string is grouped in threes: 1,234,567 but not 12,34. */
function isWellGrouped(digits, sep) {
  if (!digits.includes(sep)) return true;
  const parts = digits.split(sep);
  if (parts.length < 2) return false;
  if (!/^\d{1,3}$/.test(parts[0])) return false;
  return parts.slice(1).every(p => /^\d{3}$/.test(p));
}
