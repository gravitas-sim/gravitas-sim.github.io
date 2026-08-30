import {
  superscript,
  scientific,
  decimal,
  formatNumber,
  tickLabel,
  withUnit,
  parseFormatted,
  NBSP,
  MINUS,
  TIMES,
} from '../js/format.js';

describe('superscript', () => {
  test('renders each digit', () => {
    expect(superscript(1234567890)).toBe('¹²³⁴⁵⁶⁷⁸⁹⁰');
  });

  test('renders a negative exponent with a superscript minus', () => {
    expect(superscript(-11)).toBe('⁻¹¹');
  });

  test('keeps multi-digit exponents together', () => {
    // The failure this guards is 10³⁰ rendering as 10^3^0, which reads as a
    // different number entirely.
    expect(superscript(30)).toBe('³⁰');
  });
});

describe('scientific', () => {
  test('writes a power of ten, not an e', () => {
    expect(scientific(1.989e30)).toBe(`1.99${NBSP}${TIMES}${NBSP}10³⁰`);
  });

  test('writes negative exponents', () => {
    expect(scientific(6.674e-11)).toBe(`6.67${NBSP}${TIMES}${NBSP}10⁻¹¹`);
  });

  test('uses a true minus sign for negative values', () => {
    expect(scientific(-4.2e8)).toBe(`${MINUS}4.20${NBSP}${TIMES}${NBSP}10⁸`);
  });

  test('honors the significant-figure count', () => {
    expect(scientific(1.23456e7, 2)).toBe(`1.2${NBSP}${TIMES}${NBSP}10⁷`);
    expect(scientific(1.23456e7, 5)).toBe(`1.2346${NBSP}${TIMES}${NBSP}10⁷`);
  });

  test('keeps a mantissa of one, so columns line up', () => {
    expect(scientific(1e6)).toBe(`1.00${NBSP}${TIMES}${NBSP}10⁶`);
  });

  test('drops it in compact mode, where nothing is being lined up', () => {
    expect(scientific(1e6, 3, true)).toBe('10⁶');
    expect(scientific(-1e6, 3, true)).toBe(`${MINUS}10⁶`);
  });

  test('an exponent of zero is just the number', () => {
    expect(scientific(3.14159)).toBe('3.14');
  });

  test('zero and non-finite values do not become 0.00 × 10⁰', () => {
    expect(scientific(0)).toBe('0');
    expect(scientific(NaN)).toBe('-');
    expect(scientific(Infinity)).toBe('-');
  });
});

describe('decimal', () => {
  test('groups thousands', () => {
    expect(decimal(1234)).toBe('1,230');
    expect(decimal(1234, 4)).toBe('1,234');
  });

  test('keeps significant trailing zeros, so columns share a decimal point', () => {
    expect(decimal(1)).toBe('1.00');
    expect(decimal(80)).toBe('80.0');
    expect(decimal(0.75)).toBe('0.750');
  });

  test('uses a true minus sign', () => {
    expect(decimal(-42.5)).toBe(`${MINUS}42.5`);
  });

  test('pads to significant figures, not to a fixed decimal count', () => {
    // Three figures, wherever the decimal point happens to fall.
    expect(decimal(0.5)).toBe('0.500');
    expect(decimal(12345)).toBe('12,300');
  });

  test('grouping does not re-round what precision decided', () => {
    expect(decimal(0.000123456, 3)).toBe('0.000123');
  });
});

describe('formatNumber', () => {
  test('switches to scientific notation for large magnitudes', () => {
    expect(formatNumber(100039.2)).toBe(`1.00${NBSP}${TIMES}${NBSP}10⁵`);
    // Rounded to three figures this is 100000, which is over the threshold it
    // was under before rounding.
    expect(formatNumber(99999)).toBe(`1.00${NBSP}${TIMES}${NBSP}10⁵`);
    expect(formatNumber(94321)).toBe('94,300');
  });

  test('switches to scientific notation for small magnitudes', () => {
    expect(formatNumber(0.00012345)).toBe(`1.23${NBSP}${TIMES}${NBSP}10⁻⁴`);
    expect(formatNumber(0.0123)).toBe('0.0123');
  });

  test('can be forced either way', () => {
    // Forced on, a value whose exponent is zero still comes back as itself
    // rather than as "5.00 × 10⁰".
    expect(formatNumber(5, { sci: true })).toBe('5.00');
    expect(formatNumber(1e9, { sci: false })).toBe('1,000,000,000');
  });

  test('never emits the exponent form a float prints', () => {
    for (const v of [1e21, 1.5e-9, -2.7e14, 6.022e23]) {
      expect(formatNumber(v)).not.toMatch(/e[+-]/);
    }
  });

  test('zero stays zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('tickLabel', () => {
  test('prefers the shortest readable form', () => {
    expect(tickLabel(1e-4)).toBe('10⁻⁴');
    expect(tickLabel(2.5e-4)).toBe(`2.5${NBSP}${TIMES}${NBSP}10⁻⁴`);
    expect(tickLabel(0.25)).toBe('0.25');
  });
});

describe('withUnit', () => {
  test('binds the value to its symbol with a non-breaking space', () => {
    expect(withUnit(1.989e30, 'kg')).toBe(
      `1.99${NBSP}${TIMES}${NBSP}10³⁰${NBSP}kg`
    );
  });

  test('accepts an already-formatted string', () => {
    expect(withUnit('12.5', 'AU')).toBe(`12.5${NBSP}AU`);
  });

  test('typesets a leading minus on a value the caller formatted', () => {
    // Lesson widgets keep their own decimal counts; they should still get the
    // typography.
    expect(withUnit('-41.6', 'MJ/kg')).toBe(`${MINUS}41.6${NBSP}MJ/kg`);
    expect(withUnit('-1,200', 'K')).toBe(`${MINUS}1,200${NBSP}K`);
  });

  test('leaves the no-value placeholder and ordinary words alone', () => {
    expect(withUnit('-', '')).toBe('-');
    expect(withUnit('unbound', 'yr')).toBe(`unbound${NBSP}yr`);
  });

  test('a missing symbol leaves the value alone', () => {
    expect(withUnit(5, '')).toBe('5.00');
    expect(withUnit('unbound', '')).toBe('unbound');
  });

  test('never separates a value from its unit with a breaking space', () => {
    expect(withUnit(3, 'M☉')).not.toContain(' M☉');
  });
});

describe('parseFormatted', () => {
  test('reads back what the module writes', () => {
    for (const v of [1.99e30, -4.2e8, 1230, 0.000123, 0.25]) {
      expect(parseFormatted(formatNumber(v, { sig: 6 }))).toBeCloseTo(v, 10);
    }
  });

  test('handles a value carrying no unit and a plain string', () => {
    expect(parseFormatted('1,000')).toBe(1000);
    expect(parseFormatted(null)).toBeNaN();
  });
});
