import { describe, test, expect } from '@jest/globals';
import { createDocument, textWidth, wrapText, toWinAnsi } from '../js/pdf.js';

const asText = bytes => Buffer.from(bytes).toString('latin1');

/**
 * Walk the cross-reference table and confirm every offset lands on its object.
 * This is the failure that makes a PDF unopenable, and it is invisible in the
 * generated text: a reader just refuses the file.
 */
function xrefIsSound(bytes) {
  const text = asText(bytes);
  const start = /startxref\s+(\d+)/.exec(text);
  if (!start) return false;
  const offsets = [
    ...text.slice(Number(start[1])).matchAll(/^(\d{10}) 00000 n/gm),
  ];
  if (!offsets.length) return false;
  return offsets.every((m, i) =>
    text.slice(Number(m[1])).startsWith(`${i + 1} 0 obj`)
  );
}

describe('text measurement', () => {
  test('wider strings measure wider', () => {
    expect(textWidth('W', 10)).toBeGreaterThan(textWidth('i', 10));
  });

  test('width scales with font size', () => {
    expect(textWidth('hello', 20)).toBeCloseTo(textWidth('hello', 10) * 2, 6);
  });

  test('bold is wider than regular for the same text', () => {
    expect(textWidth('mass', 10, true)).toBeGreaterThan(
      textWidth('mass', 10, false)
    );
  });

  test('an empty string has no width', () => {
    expect(textWidth('', 10)).toBe(0);
  });
});

describe('wrapText', () => {
  test('every line fits the requested width', () => {
    const text =
      'Angular momentum is conserved because gravity acts along the line to ' +
      'the star and exerts no torque, so as the separation falls the speed rises.';
    const lines = wrapText(text, 200, 10);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines)
      expect(textWidth(line, 10)).toBeLessThanOrEqual(200);
  });

  test('keeps every word', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    expect(wrapText(text, 60, 10).join(' ').split(/\s+/)).toEqual(
      text.split(' ')
    );
  });

  test('a word longer than the line still gets emitted', () => {
    // Otherwise a long URL or a chemical name silently disappears.
    const lines = wrapText('supercalifragilistic', 10, 10);
    expect(lines.join('')).toContain('supercalifragilistic');
  });

  test('respects explicit line breaks', () => {
    expect(wrapText('one\ntwo', 500, 10)).toEqual(['one', 'two']);
  });
});

describe('toWinAnsi', () => {
  test('leaves plain ASCII alone', () => {
    expect(toWinAnsi('Kepler 1571-1630')).toBe('Kepler 1571-1630');
  });

  test('keeps superscripts distinguishable from digits', () => {
    // "10²" collapsing to "102" would silently change a number in a graded
    // document, which is the worst kind of formatting bug.
    expect(toWinAnsi('10²')).toBe('10^2');
    expect(toWinAnsi('a³')).toBe('a^3');
  });

  test('keeps a multi-digit exponent as one number', () => {
    // The black hole lesson is full of these. Mapping each superscript on its
    // own turns 10^67 into "10^6^7", which in a document about how many zeros
    // a number has is worse than printing nothing.
    expect(toWinAnsi('2.1 × 10⁶⁷ years')).toBe('2.1 x 10^67 years');
    expect(toWinAnsi('1.4 × 10⁻¹⁴ K')).toBe('1.4 x 10^-14 K');
    expect(toWinAnsi('10²⁰ kg/m³')).toBe('10^20 kg/m^3');
  });

  test('renders a multiplication dot as multiplication', () => {
    expect(toWinAnsi('m·v·r')).toBe('m*v*r');
  });

  test('spells out symbols that have no glyph', () => {
    expect(toWinAnsi('P² ∝ a³')).toContain('proportional to');
    expect(toWinAnsi('√2')).toBe('sqrt2');
    expect(toWinAnsi('M ≫ m')).toContain('>>');
  });

  test('preserves newlines for the wrapper to act on', () => {
    expect(toWinAnsi('a\nb')).toBe('a\nb');
  });

  test('handles missing input', () => {
    expect(toWinAnsi(null)).toBe('');
    expect(toWinAnsi(undefined)).toBe('');
  });

  test('writes microns as um rather than mum', () => {
    // mu maps to "mu" because it is the reduced-mass symbol, which would turn
    // a wavelength into "1.4 mum".
    expect(toWinAnsi('1.4 \u03bcm')).toBe('1.4 um');
    expect(toWinAnsi('reduced mass \u03bc')).toBe('reduced mass mu');
  });

  test('joins a subscript marker to a symbol name with one underscore', () => {
    // "R<sub>*</sub>" arrives as "R_" plus a star that spells itself "_star".
    expect(toWinAnsi('R_\u2605')).toBe('R_star');
    expect(toWinAnsi('R_\u2609 and R_\u2295')).toBe('R_sun and R_earth');
  });

  test('keeps the dash characters mapped', () => {
    // These have twice been flattened by an automated dash pass, which turned
    // the map into duplicate keys and let every one reach the page as '?'.
    for (const dash of ['\u2014', '\u2013', '\u2011', '\u2212']) {
      expect(toWinAnsi(`a${dash}b`)).toBe('a-b');
    }
  });
});

describe('createDocument', () => {
  test('produces a structurally valid PDF', () => {
    const bytes = createDocument({ title: 'Test' })
      .heading('Hello')
      .paragraph('Some body text.')
      .build();
    const text = asText(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(xrefIsSound(bytes)).toBe(true);
  });

  test('escapes parentheses instead of truncating the file', () => {
    // An unescaped ')' ends the string early and corrupts every later offset.
    const bytes = createDocument({ title: 'Parens' })
      .paragraph('Speed (km/s) and mass (kg) with a stray \\ backslash')
      .build();
    expect(xrefIsSound(bytes)).toBe(true);
    expect(asText(bytes)).toContain('\\(km/s\\)');
  });

  test('breaks into more pages as content grows', () => {
    const pageCount = bytes =>
      (asText(bytes).match(/\/Type \/Page /g) || []).length;
    const short = createDocument({}).paragraph('one line').build();
    const doc = createDocument({});
    for (let i = 0; i < 120; i++) doc.paragraph(`Measurement row number ${i}.`);
    expect(pageCount(short)).toBe(1);
    expect(pageCount(doc.build())).toBeGreaterThan(1);
  });

  test('stays valid across a page break', () => {
    const doc = createDocument({ title: 'Long' });
    for (let i = 0; i < 200; i++) doc.row(`Row ${i}`, `${i}`);
    expect(xrefIsSound(doc.build())).toBe(true);
  });

  test('records link annotations', () => {
    const bytes = createDocument({})
      .link('Open the simulation', 'https://gravitas-sim.online/#1rABC')
      .build();
    const text = asText(bytes);
    expect(text).toContain('/Subtype /Link');
    expect(text).toContain('https://gravitas-sim.online/#1rABC');
    expect(xrefIsSound(bytes)).toBe(true);
  });

  test('marks an unanswered field rather than leaving a blank', () => {
    const text = asText(createDocument({}).field('Question', '').build());
    expect(text).toContain('no answer given');
  });

  test('emits single-byte characters only', () => {
    // The xref offsets are byte counts; a multi-byte encoding would desync them.
    const bytes = createDocument({ title: 'Unicode: “test” ½ M☉' })
      .heading('Kepler’s Laws: π and μ')
      .paragraph('Δv ≈ 5 km/s at 30° … done')
      .build();
    expect(bytes.every(b => b >= 0 && b <= 255)).toBe(true);
    expect(xrefIsSound(bytes)).toBe(true);
  });

  test('the declared stream length matches the actual stream', () => {
    // A wrong /Length makes readers stop mid-page or reject the file.
    const bytes = createDocument({})
      .heading('Heading')
      .paragraph('Body text with (parens) and a dash - here.')
      .build();
    const text = asText(bytes);
    for (const m of text.matchAll(
      /<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g
    )) {
      expect(m[2].length).toBe(Number(m[1]));
    }
  });
});
