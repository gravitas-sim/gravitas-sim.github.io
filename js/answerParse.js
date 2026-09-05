// =============================================================================
// Reading a number a student typed
// -----------------------------------------------------------------------------
// This replaces one line:
//
//   Number(String(value).replace(/[^0-9eE+\-.]/g, ''))
//
// which threw away every character it did not recognise and then hoped. What
// that actually did, measured against real input:
//
//   "1,5"           -> 15          a decimal comma multiplied the answer by ten
//   "−5"            -> 5           a Unicode minus silently flipped the sign
//   "1.5 × 10^8"    -> 1.5108      scientific notation became a different number
//   "5 metres"      -> NaN         the 'e' survived; the answer was marked wrong
//   ""              -> 0           a blank answer became a number
//
// Three of those are wrong answers presented as right or right answers presented
// as wrong, with nothing on screen to say so. The last is the worst: a blank is
// not a zero, and a step whose tolerance happens to span zero would have marked
// an empty box correct.
//
// So this parses rather than strips. Anything it cannot read, it says it cannot
// read and why - a student who typed something reasonable gets told what the
// step wanted, and a student who typed nonsense is not quietly given a number
// they did not write.
//
// Kept free of everything but js/constants.js, which is itself pure, because
// this runs in the browser and again in Node when the instructor answer keys
// are generated. The site and the key have to disagree about nothing.
// =============================================================================

import {
  AU_METERS,
  EARTH_MASS_KG,
  JUPITER_MASS_KG,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from './constants.js';

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

/**
 * Units, by dimension, as multiples of that dimension's base unit.
 *
 * The base is whatever the lessons already quote answers in, so the common case
 * is a conversion factor of exactly 1 and no arithmetic at all.
 *
 * Aliases are spelled out rather than derived, because a student writes "days"
 * and "day" and "d" and all three have to work, and a rule that lowercases and
 * strips a trailing 's' would also turn "s" (seconds) into "" and "Ms" into "M".
 */
export const UNITS = Object.freeze({
  // Base: days.
  time: {
    s: 1 / 86400,
    sec: 1 / 86400,
    secs: 1 / 86400,
    second: 1 / 86400,
    seconds: 1 / 86400,
    min: 1 / 1440,
    mins: 1 / 1440,
    minute: 1 / 1440,
    minutes: 1 / 1440,
    h: 1 / 24,
    hr: 1 / 24,
    hrs: 1 / 24,
    hour: 1 / 24,
    hours: 1 / 24,
    d: 1,
    day: 1,
    days: 1,
    yr: 365.25,
    yrs: 365.25,
    year: 365.25,
    years: 365.25,
  },
  // Base: astronomical units.
  length: {
    m: 1 / AU_METERS,
    metre: 1 / AU_METERS,
    metres: 1 / AU_METERS,
    meter: 1 / AU_METERS,
    meters: 1 / AU_METERS,
    km: 1000 / AU_METERS,
    au: 1,
    r_sun: SOLAR_RADIUS_M / AU_METERS,
    rsun: SOLAR_RADIUS_M / AU_METERS,
  },
  // Base: kilometres per second.
  speed: {
    'm/s': 1e-3,
    'km/s': 1,
    'km/h': 1 / 3600,
    'au/yr': AU_METERS / 1000 / (365.25 * 86400),
  },
  // Base: solar masses.
  mass: {
    kg: 1 / SOLAR_MASS_KG,
    m_sun: 1,
    msun: 1,
    m_earth: EARTH_MASS_KG / SOLAR_MASS_KG,
    mearth: EARTH_MASS_KG / SOLAR_MASS_KG,
    m_jup: JUPITER_MASS_KG / SOLAR_MASS_KG,
    mjup: JUPITER_MASS_KG / SOLAR_MASS_KG,
  },
  // Base: degrees.
  angle: {
    deg: 1,
    degree: 1,
    degrees: 1,
    '°': 1,
    rad: 180 / Math.PI,
    radian: 180 / Math.PI,
    radians: 180 / Math.PI,
    arcsec: 1 / 3600,
    mas: 1 / 3.6e6,
  },
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

  // Normalise the characters that mean something we understand, and only those.
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

/** Normalise a unit token for lookup: case and spacing, nothing else. */
const normaliseUnit = u =>
  String(u || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/µ/g, 'u');

/**
 * Which dimension a unit token belongs to, if any.
 *
 * @param {string} token - As typed
 * @returns {?{dimension: string, factor: number}} The unit, or null
 */
export function lookupUnit(token) {
  const key = normaliseUnit(token);
  if (!key) return null;
  for (const [dimension, table] of Object.entries(UNITS)) {
    if (Object.hasOwn(table, key)) {
      return { dimension, factor: table[key] };
    }
  }
  return null;
}

/**
 * Read a student's answer, converting units only where the step allows it.
 *
 * A step that declares nothing about units gets the old behaviour made safe: a
 * bare number is fine, and so is the step's own display unit written after it,
 * because that is what the box is labelled with. Any *other* unit is refused
 * rather than dropped - "5 km" where the answer is in AU is not an answer of
 * five, and silently treating it as one is how a student comes to believe a
 * wrong thing about their own arithmetic.
 *
 * A step that declares `expect` gets conversions: any unit it lists is accepted
 * and converted into the unit `answer` is written in.
 *
 * @param {string} raw - What the student typed
 * @param {object} [step] - The step, for `unit` and `expect`
 * @param {string} [locale] - For the decimal separator
 * @returns {{ok: true, value: number, unit: ?string, converted: boolean}
 *   |{ok: false, reason: string, detail?: object}}
 */
export function parseAnswer(raw, step = {}, locale = 'en') {
  const number = parseNumber(raw, locale);
  if (!number.ok) return number;

  const rest = number.rest;
  if (!rest)
    return { ok: true, value: number.value, unit: null, converted: false };

  const expect = step.expect || null;

  if (!expect) {
    // No declared dimension, so nothing can be converted. The step's own label
    // is the one unit that means "the number as asked for".
    const declared = normaliseUnit(step.unit);
    if (declared && normaliseUnit(rest) === declared) {
      return { ok: true, value: number.value, unit: rest, converted: false };
    }
    const known = lookupUnit(rest);
    return {
      ok: false,
      reason: known
        ? PARSE_FAILURE.UNIT_NOT_ALLOWED
        : PARSE_FAILURE.TRAILING_TEXT,
      detail: { text: rest, expected: step.unit ?? null },
    };
  }

  const known = lookupUnit(rest);
  if (!known) {
    return {
      ok: false,
      reason: PARSE_FAILURE.UNKNOWN_UNIT,
      detail: { text: rest, dimension: expect.dimension },
    };
  }
  if (known.dimension !== expect.dimension) {
    return {
      ok: false,
      reason: PARSE_FAILURE.INCOMPATIBLE_UNIT,
      detail: {
        text: rest,
        got: known.dimension,
        dimension: expect.dimension,
      },
    };
  }

  const allowed = (expect.accept || []).map(normaliseUnit);
  if (allowed.length && !allowed.includes(normaliseUnit(rest))) {
    return {
      ok: false,
      reason: PARSE_FAILURE.UNIT_NOT_ALLOWED,
      detail: { text: rest, allowed: expect.accept },
    };
  }

  // Into the unit the step's own `answer` is written in.
  const target = lookupUnit(expect.unit);
  if (!target || target.dimension !== expect.dimension) {
    // An authoring mistake rather than a student one; author:check catches it.
    return { ok: true, value: number.value, unit: rest, converted: false };
  }
  return {
    ok: true,
    value: (number.value * known.factor) / target.factor,
    unit: rest,
    converted: normaliseUnit(rest) !== normaliseUnit(expect.unit),
  };
}
