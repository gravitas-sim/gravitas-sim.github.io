// =============================================================================
// The units registry: its values, and every table that must agree with it
// -----------------------------------------------------------------------------
// js/units/registry.js is the one list of units. Two tables keep a copy for a
// stated reason, and this is what holds each copy to the registry:
//   - js/answerParse.js reads what a student typed, with the simulation's own
//     constants, so an answer read off a readout converts back to exactly the
//     simulation's number; its spellings and dimensions are the registry's,
//     and its factors differ from the nominal ones by the model's rounding;
//   - js/inference/infer.js keeps the time units (tests/inference.test.js).
// The experiments' metric units name registry units by one of their spellings.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import {
  ALIASES,
  UNITS,
  conversionFactor,
  spellingsOf,
  symbolOf,
  unitIdOf,
} from '../js/units/registry.js';
import { UNITS as ANSWER_UNITS, lookupUnit } from '../js/answerParse.js';
import { METRIC_UNITS } from '../js/experiments/metrics.js';
import {
  AU_METERS,
  EARTH_MASS_KG,
  JUPITER_MASS_KG,
  PARSEC_M,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from '../js/constants.js';

const u = id => ({ id, scale: 1 });

describe('the registry', () => {
  test('every unit has a dimension, a factor or none, and a symbol', () => {
    for (const [id, unit] of Object.entries(UNITS)) {
      expect({ id, dim: typeof unit.dim }).toEqual({ id, dim: 'string' });
      expect(unit.factor === null || unit.factor > 0).toBe(true);
      expect(typeof unit.symbol).toBe('string');
    }
  });

  test('every alias names a unit, and is written as it is matched', () => {
    for (const [alias, id] of ALIASES) {
      expect({ alias, known: Object.hasOwn(UNITS, id) }).toEqual({
        alias,
        known: true,
      });
      expect(alias).toBe(alias.toLowerCase());
    }
  });

  test('a spelling is never two units', () => {
    // An alias that is also, in lower case, a different id would make the
    // unit a column names depend on how the table happened to be searched.
    for (const id of Object.keys(UNITS)) {
      const alias = ALIASES.get(id.toLowerCase());
      if (alias !== undefined && id.length >= 3) expect(alias).toBe(id);
    }
  });

  test('conversions within a dimension go there and back', () => {
    const byDim = new Map();
    for (const [id, unit] of Object.entries(UNITS)) {
      if (unit.factor === null) continue;
      byDim.set(unit.dim, [...(byDim.get(unit.dim) || []), id]);
    }
    for (const ids of byDim.values()) {
      for (const a of ids) {
        for (const b of ids) {
          const there = conversionFactor(u(a), u(b));
          const back = conversionFactor(u(b), u(a));
          expect(there * back).toBeCloseTo(1, 12);
        }
      }
    }
  });

  test('what has no factor converts only to itself', () => {
    expect(conversionFactor(u('mag'), u('mag'))).toBe(1);
    expect(() => conversionFactor(u('mag'), u('Jy'))).toThrow(/zero point/);
    expect(() => conversionFactor(u('sim'), u('m'))).toThrow(/cannot become/);
    expect(() => conversionFactor(u('Jy'), u('W/m2/nm'))).toThrow(
      /per wavelength and a flux per frequency/
    );
  });

  test('the defined values are the definitions', () => {
    // IAU 2012 resolution B2.
    expect(UNITS.AU.factor).toBe(149597870700);
    // IAU 2015 resolution B2: a parsec is 648000/pi AU.
    expect(UNITS.pc.factor).toBeCloseTo((648000 / Math.PI) * 149597870700, 0);
    // The Julian year, and a light year in it.
    expect(UNITS.yr.factor).toBe(365.25 * 86400);
    expect(UNITS.ly.factor).toBe(299792458 * 365.25 * 86400);
    // IAU 2015 nominal solar mass parameter over CODATA 2018 G.
    expect(UNITS.Msun.factor).toBeCloseTo(1.3271244e20 / 6.6743e-11, -20);
  });

  test("the simulation's model constants agree with it to 3e-4", () => {
    // Rounded model values, not errors: the physics validation and every
    // golden are measured with them (js/constants.js).
    const close = (model, nominal) =>
      expect(Math.abs(model / nominal - 1)).toBeLessThan(3e-4);
    close(AU_METERS, UNITS.AU.factor);
    close(SOLAR_MASS_KG, UNITS.Msun.factor);
    close(SOLAR_RADIUS_M, UNITS.Rsun.factor);
    close(EARTH_MASS_KG, UNITS.Mearth.factor);
    close(JUPITER_MASS_KG, UNITS.MJup.factor);
    close(PARSEC_M, UNITS.pc.factor);
  });

  test('a unit is written in the reader’s language where it differs', () => {
    expect(symbolOf('AU')).toBe('AU');
    expect(symbolOf('AU', 'es')).toBe('ua');
    expect(symbolOf('km', 'es')).toBe('km');
    expect(symbolOf('not a unit')).toBe('not a unit');
  });
});

describe("a student's answer reads units the registry knows", () => {
  // answerParse's dimensions, and the unit each is written in.
  const BASES = {
    time: ['time', 'd'],
    length: ['length', 'AU'],
    speed: ['velocity', 'km/s'],
    mass: ['mass', 'Msun'],
    density: ['density', 'g/cm3'],
    angle: ['angle', 'deg'],
  };

  test('every dimension of the answer table is one of the registry’s', () => {
    expect(Object.keys(ANSWER_UNITS).sort()).toEqual(Object.keys(BASES).sort());
  });

  test('every spelling a student may type is a registry unit of that dimension, at its factor', () => {
    for (const [dimension, table] of Object.entries(ANSWER_UNITS)) {
      const [dim, base] = BASES[dimension];
      const nominal = spellingsOf(dim, base);
      for (const [spelling, factor] of Object.entries(table)) {
        const id = unitIdOf(spelling);
        expect({ spelling, dim: UNITS[id]?.dim }).toEqual({ spelling, dim });
        // The answer table uses the simulation's constants; the registry the
        // nominal values. They differ by the model's rounding and no more.
        const reference = nominal.get(spelling) ?? nominal.get(id);
        expect(Math.abs(factor / reference - 1)).toBeLessThan(5e-4);
      }
    }
  });

  test('its lookup is the same as before for every spelling', () => {
    expect(lookupUnit('KM')).toEqual({
      dimension: 'length',
      factor: ANSWER_UNITS.length.km,
    });
    expect(lookupUnit('Gyr')).toBe(null);
  });
});

test('every metric unit of the experiments is a registry unit', () => {
  for (const [metric, unit] of Object.entries(METRIC_UNITS)) {
    expect({ metric, id: unitIdOf(unit) !== undefined }).toEqual({
      metric,
      id: true,
    });
  }
});
