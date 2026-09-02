import { describe, test, expect } from '@jest/globals';
import {
  GasGiant,
  Planet,
  StarObject,
  SOLAR_MASS_UNIT,
  JUPITER_MASS_UNIT,
  EARTH_MASS_UNIT,
} from '../js/physics.js';
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  EARTH_MASSES_PER_JUPITER_MASS,
  EARTH_MASSES_PER_SOLAR_MASS,
} from '../js/constants.js';

// The simulation has one mass anchor: 1000 units is a solar mass. Every other
// mass unit is a statement about how that anchor divides up, and a wrong one is
// invisible in the display -- the inspector reads back whatever the constructor
// put in, so both halves agree while both are wrong. Only a comparison against
// the anchor catches it. JUPITER_MASS_UNIT sat at 50 rather than 0.955 for a
// long time for exactly that reason: nothing here was checking.

const ORIGIN = { x: 0, y: 0 };

describe('mass scale', () => {
  test('a solar mass is the anchor', () => {
    expect(SOLAR_MASS_UNIT).toBe(1000);
  });

  test('Jupiter mass unit is the solar mass over the mass ratio', () => {
    expect(JUPITER_MASS_UNIT).toBeCloseTo(0.9547919, 7);
    expect(JUPITER_MASS_UNIT * JUPITER_MASSES_PER_SOLAR_MASS).toBeCloseTo(
      SOLAR_MASS_UNIT,
      9
    );
  });

  test('1047 Jupiters weigh one Sun, in simulation units', () => {
    const jupiters = JUPITER_MASSES_PER_SOLAR_MASS * JUPITER_MASS_UNIT;
    expect(jupiters / SOLAR_MASS_UNIT).toBeCloseTo(1.0, 9);
  });
});

describe('GasGiant mass', () => {
  test('gravitational mass matches the mass it reports', () => {
    const giant = new GasGiant(ORIGIN, ORIGIN, 1.0);
    expect(giant.massInJupiters).toBeCloseTo(1.0, 9);
    // The number the inspector shows and the number gravity uses are the same
    // physical mass, expressed in two units.
    expect(giant.mass / JUPITER_MASS_UNIT).toBeCloseTo(giant.massInJupiters, 9);
  });

  test('a Jupiter is about a thousandth of a solar mass', () => {
    const giant = new GasGiant(ORIGIN, ORIGIN, 1.0);
    expect(giant.mass / SOLAR_MASS_UNIT).toBeCloseTo(1 / 1047.348644, 9);
  });

  test('mass is linear in Jupiter masses', () => {
    const one = new GasGiant(ORIGIN, ORIGIN, 1.0);
    const ten = new GasGiant(ORIGIN, ORIGIN, 10.0);
    expect(ten.mass / one.mass).toBeCloseTo(10, 9);
  });

  test('a brown dwarf stays below the hydrogen burning limit in mass', () => {
    // 80 M_J is the threshold the merge code uses to make a star. A giant just
    // under it must weigh less than the least massive star, or the threshold is
    // decorative.
    const giant = new GasGiant(ORIGIN, ORIGIN, 79.0);
    expect(giant.mass / SOLAR_MASS_UNIT).toBeLessThan(0.08);
  });

  test('randomly generated giants are sub-stellar', () => {
    for (let i = 0; i < 200; i++) {
      const giant = new GasGiant(ORIGIN, ORIGIN);
      expect(giant.mass / SOLAR_MASS_UNIT).toBeLessThan(0.08);
    }
  });
});

describe('gas giant to star conversion', () => {
  test('conserves gravitational mass', () => {
    // The path the inspector's mass slider and the merge code both take:
    // Jupiter masses -> solar masses -> simulation units. A round trip that
    // does not come back to where it started is mass appearing or vanishing.
    const giant = new GasGiant(ORIGIN, ORIGIN, 85.0);
    const massInSolarMasses =
      giant.massInJupiters / JUPITER_MASSES_PER_SOLAR_MASS;
    const star = new StarObject(ORIGIN, ORIGIN, massInSolarMasses);
    expect(star.mass).toBeCloseTo(giant.mass, 6);
  });
});

describe('Earth/Jupiter ratio', () => {
  test('is the accepted value', () => {
    expect(EARTH_MASSES_PER_JUPITER_MASS).toBeCloseTo(317.828, 3);
  });
});

describe('Earth mass unit', () => {
  test('is the solar mass over the mass ratio, like the Jupiter one', () => {
    // This was a literal 3, which is 1000x too heavy. It went unnoticed for the
    // same reason JUPITER_MASS_UNIT's error did: the display divided by the
    // same wrong constant the constructor multiplied by, so the readout agreed
    // with itself. Only the anchor catches it.
    expect(EARTH_MASS_UNIT).toBeCloseTo(0.0030034896, 10);
    expect(EARTH_MASS_UNIT * EARTH_MASSES_PER_SOLAR_MASS).toBeCloseTo(
      SOLAR_MASS_UNIT,
      9
    );
  });

  test('an Earth is three millionths of a Sun', () => {
    expect(EARTH_MASS_UNIT / SOLAR_MASS_UNIT).toBeCloseTo(1 / 332946.0487, 12);
  });

  test('the Earth and Jupiter units agree with each other', () => {
    // Two independently quoted ratios have two chances to disagree. Jupiter is
    // 317.8 Earths whichever way the units are reached.
    expect(JUPITER_MASS_UNIT / EARTH_MASS_UNIT).toBeCloseTo(
      EARTH_MASSES_PER_JUPITER_MASS,
      0
    );
  });
});

describe('Planet mass', () => {
  test('gravitational mass matches the mass it reports', () => {
    // The conversion was simply absent from the Planet constructor: the number
    // of Earth masses was stored straight into the simulation mass, so a body
    // asked for as one Earth arrived weighing 333 of them.
    const planet = new Planet(ORIGIN, ORIGIN, 1.0);
    expect(planet.massInEarths).toBeCloseTo(1.0, 9);
    expect(planet.mass / EARTH_MASS_UNIT).toBeCloseTo(planet.massInEarths, 9);
  });

  test('an Earth-mass planet is three millionths of a solar mass', () => {
    const planet = new Planet(ORIGIN, ORIGIN, 1.0);
    expect(planet.mass / SOLAR_MASS_UNIT).toBeCloseTo(1 / 332946.0487, 12);
  });

  test('mass is linear in Earth masses', () => {
    const one = new Planet(ORIGIN, ORIGIN, 1.0);
    const ten = new Planet(ORIGIN, ORIGIN, 10.0);
    expect(ten.mass / one.mass).toBeCloseTo(10, 9);
  });

  test('randomly generated planets stay planet-sized', () => {
    // The generator draws 0.1 to 1.6 Earth masses. None of them should come out
    // anywhere near a brown dwarf, which is what the missing conversion did.
    for (let i = 0; i < 200; i++) {
      const planet = new Planet(ORIGIN, ORIGIN);
      expect(planet.mass / SOLAR_MASS_UNIT).toBeLessThan(1e-4);
      expect(planet.mass / EARTH_MASS_UNIT).toBeCloseTo(planet.massInEarths, 9);
    }
  });
});

describe('a planet and a gas giant reach the same scale', () => {
  test('one Jupiter equals 317.8 Earths in simulation units', () => {
    // The two constructors take different units and must land on one physical
    // mass scale. They were off from each other by a factor of 333.
    const jupiter = new GasGiant(ORIGIN, ORIGIN, 1.0);
    const earths = new Planet(ORIGIN, ORIGIN, EARTH_MASSES_PER_JUPITER_MASS);
    expect(earths.mass / jupiter.mass).toBeCloseTo(1.0, 3);
  });
});
