import { describe, test, expect } from '@jest/globals';
import {
  PARSE_FAILURE,
  UNITS,
  decimalSeparatorFor,
  lookupUnit,
  parseAnswer,
  parseNumber,
} from '../js/answerParse.js';
import {
  AU_METERS,
  EARTH_MASS_KG,
  JUPITER_MASS_KG,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from '../js/constants.js';

// =============================================================================
// Reading a number a student typed
// -----------------------------------------------------------------------------
// The five cases at the top are the ones the character-stripping parser got
// wrong. Each is a wrong answer presented as right, or a right answer presented
// as wrong, with nothing on screen to say which.
// =============================================================================

const value = (raw, locale) => {
  const out = parseNumber(raw, locale);
  return out.ok ? out.value : out.reason;
};

describe('what the old parser got wrong', () => {
  test('a decimal comma is a decimal point, not a deleted character', () => {
    // Stripping turned "1,5" into "15": ten times the answer, silently.
    expect(value('1,5', 'es')).toBe(1.5);
    expect(value('2,54', 'es')).toBe(2.54);
  });

  test('a Unicode minus is a minus, not a deleted character', () => {
    // Stripping turned "−5" into "5". The sign is the whole answer in half the
    // radial-velocity questions in the catalogue.
    expect(value('−5')).toBe(-5);
    expect(value('−0.5')).toBe(-0.5);
    // And the hyphens a word processor substitutes.
    expect(value('‐5')).toBe(-5);
    expect(value('‑5')).toBe(-5);
  });

  test('scientific notation written the way it is taught', () => {
    // Stripping turned "1.5 × 10^8" into 1.5108.
    expect(value('1.5 × 10^8')).toBeCloseTo(1.5e8, 0);
    expect(value('1.5x10^8')).toBeCloseTo(1.5e8, 0);
    expect(value('1.5*10^8')).toBeCloseTo(1.5e8, 0);
    expect(value('1.5·10^8')).toBeCloseTo(1.5e8, 0);
    // Superscripts, as they appear in a textbook.
    expect(value('1.5 × 10⁸')).toBeCloseTo(1.5e8, 0);
    expect(value('3 × 10⁻⁴')).toBeCloseTo(3e-4, 10);
    // And plain e-notation, which already worked.
    expect(value('3e5')).toBe(3e5);
    expect(value('3E5')).toBe(3e5);
    expect(value('3e-5')).toBe(3e-5);
  });

  test('a blank is not a zero', () => {
    // Stripping produced 0, so an empty box was a number - and a step whose
    // tolerance spanned zero would have marked it correct.
    expect(parseNumber('')).toEqual({ ok: false, reason: PARSE_FAILURE.BLANK });
    expect(parseNumber('   ')).toEqual({
      ok: false,
      reason: PARSE_FAILURE.BLANK,
    });
    expect(parseNumber(null)).toEqual({
      ok: false,
      reason: PARSE_FAILURE.BLANK,
    });
    expect(parseNumber(undefined).reason).toBe(PARSE_FAILURE.BLANK);
  });

  test('a unit spelled out does not poison the number', () => {
    // "5 metres" kept its two e's and became NaN, so the answer was wrong.
    expect(parseNumber('5 metres').value).toBe(5);
    expect(parseNumber('5 metres').rest).toBe('metres');
  });
});

describe('malformed input is refused, and named', () => {
  test.each([
    ['nonsense', 'hello'],
    ['a lone sign', '-'],
    ['a lone separator', '.'],
    ['a bare unit', 'km'],
  ])('%s is not a number', (_what, raw) => {
    const out = parseNumber(raw);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(PARSE_FAILURE.NOT_A_NUMBER);
  });

  test('two decimal points is ambiguous, not a number', () => {
    expect(parseNumber('12.3.4').reason).toBe(
      PARSE_FAILURE.AMBIGUOUS_SEPARATOR
    );
    expect(parseNumber('1,2,3', 'es').reason).toBe(
      PARSE_FAILURE.AMBIGUOUS_SEPARATOR
    );
  });

  test('a truncated exponent is a number with a stray letter after it', () => {
    // "5e" is not nonsense - it is five, mid-typing. parseNumber says so and
    // hands the caller the leftover, which parseAnswer then refuses because "e"
    // is not a unit any step accepts.
    const out = parseNumber('5e');
    expect(out.ok).toBe(true);
    expect(out.value).toBe(5);
    expect(out.rest).toBe('e');
    expect(parseAnswer('5e', { unit: 'd' }).reason).toBe(
      PARSE_FAILURE.TRAILING_TEXT
    );
  });

  test('a fraction is not silently multiplied out', () => {
    // Stripping turned "1/2" into 12. It is refused instead: the step asked for
    // a number and the student wrote an expression.
    const out = parseNumber('1/2');
    expect(out.ok).toBe(true);
    expect(out.value).toBe(1);
    // ...and the caller sees the rest, which is not a unit and will be refused.
    expect(out.rest).toBe('/2');
  });

  test('mis-grouped digits are ambiguous rather than guessed at', () => {
    expect(parseNumber('1,23,456').reason).toBe(
      PARSE_FAILURE.AMBIGUOUS_SEPARATOR
    );
  });
});

describe('decimal separators follow the locale', () => {
  test('the separator is chosen by language', () => {
    expect(decimalSeparatorFor('en')).toBe('.');
    expect(decimalSeparatorFor('es')).toBe(',');
    expect(decimalSeparatorFor('es-MX')).toBe(',');
    expect(decimalSeparatorFor(undefined)).toBe('.');
  });

  test('the same string means different things in the two locales', () => {
    // The case nothing in the string can settle, which is exactly why the
    // locale is threaded all the way into the digit reader.
    expect(value('1,234', 'en')).toBe(1234);
    expect(value('1,234', 'es')).toBe(1.234);
  });

  test('both separators together are read by position, not by locale', () => {
    // Nobody writes a thousands separator after a decimal point, so the last
    // separator is the decimal one whichever locale is in force.
    expect(value('1.234,5', 'es')).toBe(1234.5);
    expect(value('1,234.5', 'en')).toBe(1234.5);
    expect(value('1.234,5', 'en')).toBe(1234.5);
    expect(value('1,234.5', 'es')).toBe(1234.5);
  });

  test('a Spanish speaker typing an English decimal point is understood', () => {
    // 3.14 has too few trailing digits to be grouping, so it can only be a
    // decimal point, whatever the locale.
    expect(value('3.14', 'es')).toBe(3.14);
    expect(value('3,14', 'en')).toBe(3.14);
  });

  test('grouping in threes is grouping', () => {
    expect(value('1,234,567', 'en')).toBe(1234567);
    expect(value('1.234.567', 'es')).toBe(1234567);
  });

  test('spaces group digits, as they do in print', () => {
    expect(value('1 234 567')).toBe(1234567);
    expect(value('1 234')).toBe(1234);
  });
});

describe('units are converted only where a step says they may be', () => {
  const bare = { unit: 'd' };
  const withExpect = {
    unit: 'd',
    expect: { dimension: 'time', unit: 'd', accept: ['d', 'days', 'h', 'yr'] },
  };

  test('a bare number is always fine', () => {
    expect(parseAnswer('3.52', bare)).toEqual({
      ok: true,
      value: 3.52,
      unit: null,
      converted: false,
    });
  });

  test("a step's own unit is accepted without conversion", () => {
    const out = parseAnswer('3.52 d', bare);
    expect(out.ok).toBe(true);
    expect(out.value).toBe(3.52);
    expect(out.converted).toBe(false);
  });

  test('another unit, with no declared conversions, is refused rather than dropped', () => {
    // The old parser threw "km" away and graded the bare number, so "5 km"
    // where the answer is 5 AU was marked correct.
    const out = parseAnswer('84 h', bare);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(PARSE_FAILURE.UNIT_NOT_ALLOWED);
    expect(out.detail.expected).toBe('d');
  });

  test('a declared conversion is applied', () => {
    const out = parseAnswer('84.6 h', withExpect);
    expect(out.ok).toBe(true);
    expect(out.value).toBeCloseTo(3.525, 6);
    expect(out.converted).toBe(true);
  });

  test('the equivalent answer in every accepted unit agrees', () => {
    const days = parseAnswer('3.5247 d', withExpect).value;
    expect(parseAnswer('84.5928 h', withExpect).value).toBeCloseTo(days, 6);
    expect(parseAnswer(`${3.5247 / 365.25} yr`, withExpect).value).toBeCloseTo(
      days,
      6
    );
  });

  test('a unit of the wrong dimension is refused, and says which', () => {
    const out = parseAnswer('5 km', withExpect);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(PARSE_FAILURE.INCOMPATIBLE_UNIT);
    expect(out.detail).toMatchObject({ got: 'length', dimension: 'time' });
  });

  test('a unit nobody recognises is refused, and says so', () => {
    const out = parseAnswer('5 furlongs', withExpect);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(PARSE_FAILURE.UNKNOWN_UNIT);
    expect(out.detail.text).toBe('furlongs');
  });

  test('a right-dimension unit the step did not allow is refused', () => {
    const out = parseAnswer('300000 s', withExpect);
    expect(out.ok).toBe(false);
    expect(out.reason).toBe(PARSE_FAILURE.UNIT_NOT_ALLOWED);
    expect(out.detail.allowed).toEqual(['d', 'days', 'h', 'yr']);
  });

  test('units are matched whatever the case and spacing', () => {
    expect(parseAnswer('84.6H', withExpect).ok).toBe(true);
    expect(parseAnswer('84.6  h', withExpect).ok).toBe(true);
    expect(parseAnswer('3.52 DAYS', withExpect).ok).toBe(true);
  });

  test('trailing words that are not units are refused as text', () => {
    const out = parseAnswer('about 3.5', bare);
    expect(out.ok).toBe(false);
    // "about" precedes the number, so the number never parses.
    expect(out.reason).toBe(PARSE_FAILURE.NOT_A_NUMBER);

    const after = parseAnswer('3.5 or so', bare);
    expect(after.ok).toBe(false);
    expect(after.reason).toBe(PARSE_FAILURE.TRAILING_TEXT);
  });

  test('a decimal comma and a converted unit together', () => {
    // The two features at once, which is the Spanish student's ordinary case.
    const out = parseAnswer('84,6 h', withExpect, 'es');
    expect(out.ok).toBe(true);
    expect(out.value).toBeCloseTo(3.525, 6);
  });
});

describe('a unit spelled differently is not a conversion', () => {
  const step = {
    unit: 'g/cm³',
    answer: 0.33,
    expect: {
      dimension: 'density',
      unit: 'g/cm³',
      accept: ['g/cm³', 'g/cm3', 'kg/m³', 'kg/m3'],
    },
  };

  test('a superscript and a plain digit are the same unit', () => {
    const sup = parseAnswer('0.33 g/cm³', step);
    const plain = parseAnswer('0.33 g/cm3', step);
    expect(sup.value).toBe(0.33);
    expect(plain.value).toBe(0.33);
    // Neither moved the number, so neither is a conversion.
    expect(sup.converted).toBe(false);
    expect(plain.converted).toBe(false);
  });

  test('a genuine conversion is reported as one', () => {
    const out = parseAnswer('330 kg/m3', step);
    expect(out.value).toBeCloseTo(0.33, 12);
    expect(out.converted).toBe(true);
  });

  test('a decimal comma and a density unit together', () => {
    expect(parseAnswer('0,33 g/cm³', step, 'es').value).toBe(0.33);
  });
});

describe('the unit table agrees with the project constants', () => {
  // The table is written out rather than derived so this module stays
  // dependency-light, and this test is what stops it drifting.
  test('lengths', () => {
    expect(UNITS.length.m).toBeCloseTo(1 / AU_METERS, 20);
    expect(UNITS.length.km).toBeCloseTo(1000 / AU_METERS, 18);
    expect(UNITS.length.r_sun).toBeCloseTo(SOLAR_RADIUS_M / AU_METERS, 12);
  });

  test('masses', () => {
    expect(UNITS.mass.kg).toBeCloseTo(1 / SOLAR_MASS_KG, 40);
    expect(UNITS.mass.m_earth).toBeCloseTo(EARTH_MASS_KG / SOLAR_MASS_KG, 12);
    expect(UNITS.mass.m_jup).toBeCloseTo(JUPITER_MASS_KG / SOLAR_MASS_KG, 12);
  });

  test('every dimension has a unit whose factor is exactly one', () => {
    // The base unit, which is the one lesson answers are written in. Without
    // one, every answer in that dimension is converted through a factor.
    for (const [dimension, table] of Object.entries(UNITS)) {
      const ones = Object.values(table).filter(f => f === 1);
      expect(ones.length).toBeGreaterThan(0);
      void dimension;
    }
  });

  test('lookup finds a unit in any dimension, and refuses a stranger', () => {
    expect(lookupUnit('AU')).toEqual({ dimension: 'length', factor: 1 });
    expect(lookupUnit('km/s')).toEqual({ dimension: 'speed', factor: 1 });
    expect(lookupUnit('°')).toEqual({ dimension: 'angle', factor: 1 });
    expect(lookupUnit('parsnips')).toBeNull();
    expect(lookupUnit('')).toBeNull();
  });
});
