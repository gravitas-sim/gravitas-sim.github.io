// =============================================================================
// Numbers through the formatter and units through the registry, one way only
// -----------------------------------------------------------------------------
// tools/number-ratchet.mjs holds each file under js/ to its recorded count of
// toFixed/toPrecision calls and of unit literals js/units/registry.js does not
// know. This runs it, and holds the counting rules themselves.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import {
  check,
  countFormatting,
  countRawParsing,
  countUnknownUnits,
} from '../tools/number-ratchet.mjs';

test('no file has more than its record, and none has fewer unrecorded', () => {
  expect(check()).toEqual([]);
});

describe('what is counted', () => {
  test('a call, not a comment', () => {
    expect(countFormatting('a.toFixed(2); // b.toFixed(1)')).toBe(1);
    expect(countFormatting('x.toPrecision (3) + y.toFixed(0)')).toBe(2);
  });

  test('a unit the registry does not know, not one it does', () => {
    expect(countUnknownUnits("{ unit: 'AU' }, { unit: 'km/s' }")).toBe(0);
    expect(countUnknownUnits("{ unit: 'days' }, { unit: '' }")).toBe(0);
    expect(countUnknownUnits("{ unit: '1e-17 erg/s/cm2/Angstrom' }")).toBe(0);
    expect(countUnknownUnits('{ unit: \'furlongs\' }, { unit: "x" }')).toBe(2);
  });

  test('a typed number read raw, or its comma swapped once, not one read by the parser', () => {
    expect(countRawParsing('Number(field.value)')).toBe(1);
    expect(
      countRawParsing('parseFloat(el.value.trim()) + parseInt(n.value, 10)')
    ).toBe(2);
    expect(countRawParsing("Number(s.replace(',', '.'))")).toBe(1);
    expect(countRawParsing('parseNumber(field.value, locale)')).toBe(0);
    expect(countRawParsing('// Number(field.value)')).toBe(0);
    expect(countRawParsing('Number(row.mass)')).toBe(0);
  });

  test('a file over or under its record is reported, and which', () => {
    const record = { formatting: { 'a.js': 2 }, units: {} };
    expect(check({ formatting: { 'a.js': 3 }, units: {} }, record)).toEqual([
      expect.stringContaining('a.js: 3 toFixed/toPrecision calls, over its 2'),
    ]);
    expect(check({ formatting: { 'a.js': 1 }, units: {} }, record)).toEqual([
      expect.stringContaining('under its 2. Lower it'),
    ]);
    expect(
      check(
        { formatting: {}, units: { 'b.js': 1 } },
        { ...record, formatting: {} }
      )
    ).toEqual([expect.stringContaining('b.js: 1 unit literals')]);
  });
});
