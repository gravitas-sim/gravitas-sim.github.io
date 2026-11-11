// =============================================================================
// The decimal comma (Prompt 282, D-R10-282-01)
// -----------------------------------------------------------------------------
// Spanish shows the decimal comma and, from five digits, the narrow no-break
// space between thousands. A caller that names no locale follows the page's
// own `lang`, so a page in Spanish prints the comma without 1,200 call sites
// each learning to ask. What stays machine-readable is untouched: a CSV, a
// saved record and a link never come through js/format.js, and what a student
// types is read by js/answerParse.js, which accepts both marks and says why when
// the mark is ambiguous.
// =============================================================================

import {
  decimal,
  fixed,
  formatNumber,
  parseFormatted,
  plural,
  scientific,
  withUncertainty,
} from '../js/format.js';
import { decimalSeparatorFor, parseNumber } from '../js/answerParse.js';

const NNBSP = ' ';

const setLang = lang => {
  document.documentElement.lang = lang;
};

afterEach(() => setLang(''));

describe('a page with no language, or in English', () => {
  test.each(['', 'en'])('writes the point (lang %p)', lang => {
    setLang(lang);
    expect(formatNumber(1234.5)).toBe('1,230');
    expect(formatNumber(0.914, { sig: 2 })).toBe('0.91');
    expect(fixed(0.914, 2)).toBe('0.91');
  });
});

describe('a page in Spanish', () => {
  beforeEach(() => setLang('es'));

  test('a caller that names no locale writes the comma', () => {
    expect(formatNumber(0.914, { sig: 2 })).toBe('0,91');
    expect(decimal(12345.678, 7)).toBe(`12${NNBSP}345,68`);
    expect(scientific(1.99e30)).toBe(`1,99 × 10³⁰`);
    expect(fixed(-0.914, 2)).toBe('−0,91');
    expect(withUncertainty(1.2341, 0.0123)).toBe('1,234 ± 0,012');
  });

  test('four digits are not grouped, five are (the SI and the RAE)', () => {
    expect(decimal(1234, 4)).toBe('1234');
    expect(decimal(12345, 5)).toBe(`12${NNBSP}345`);
  });

  test('a caller that names English gets English, whatever the page says', () => {
    expect(formatNumber(0.914, { sig: 2, locale: 'en' })).toBe('0.91');
    expect(fixed(1234.5, 1, 'en')).toBe('1234.5');
  });

  test('a count keeps the same grouping rule', () => {
    expect(plural(1234, 'prueba')).toBe('1234 pruebas');
    expect(plural(12345, 'prueba')).toBe(`12${NNBSP}345 pruebas`);
  });

  test('parseFormatted reads the comma back as a decimal mark', () => {
    for (const v of [0.914, 12345.678, -5.5, 1.99e30, 0.00123]) {
      const text = formatNumber(v, { sig: 6 });
      expect(parseFormatted(text)).toBeCloseTo(
        Number(v.toPrecision(6)),
        12 - Math.max(0, Math.floor(Math.log10(Math.abs(v))))
      );
    }
  });
});

describe('what a student types is read in both marks', () => {
  test('Spanish accepts the comma, the point and the thin-space grouping', () => {
    expect(decimalSeparatorFor('es')).toBe(',');
    expect(parseNumber('0,91', 'es').value).toBe(0.91);
    expect(parseNumber('0.91', 'es').value).toBe(0.91);
    expect(parseNumber('12 345,6', 'es').value).toBe(12345.6);
    expect(parseNumber(`12${NNBSP}345,6`, 'es').value).toBe(12345.6);
    expect(parseNumber('1.234,5', 'es').value).toBe(1234.5);
  });

  test('the same keystrokes mean different things where the marks differ', () => {
    // "0,910" is 0.91 in Spanish and nine hundred and ten in English, which
    // is why the locale an answer was typed in is recorded with it.
    expect(parseNumber('0,910', 'es').value).toBe(0.91);
    expect(parseNumber('0,910', 'en').value).toBe(910);
  });

  test('what the formatter writes in a locale the parser reads back', () => {
    for (const locale of ['en', 'es']) {
      for (const v of [0.914, 1234.5, -7.25, 123456.789]) {
        const shown = fixed(v, 2, locale);
        expect(parseNumber(shown, locale).value).toBeCloseTo(v, 1);
      }
    }
  });
});
