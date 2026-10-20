// ===========================================================================
// 1. Unit system
// ---------------------------------------------------------------------------
// Everything downstream inherits these three anchors, so they are checked
// first and against the outside world rather than against each other.
// ===========================================================================

import { REF } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ constants, physics, units, add }) {
  const G = 1;
  const secondsPerUnit = units.timeUnitSeconds();
  // A body on a circular orbit at 100 units (= 1 AU) about 1000 units
  // (= 1 solar mass) must take one year. Nothing in the code asserts this;
  // it falls out of the mass, length and time anchors being mutually
  // consistent, which is exactly why it is worth measuring.
  const periodUnits = 2 * Math.PI * Math.sqrt(100 ** 3 / (G * 1000));
  const periodDays = (periodUnits * secondsPerUnit) / 86400;

  add({
    group: 'Unit system',
    kind: 'analytic',
    name: 'One AU about one solar mass takes one year',
    measured: periodDays,
    expected: REF.earthSiderealYearDays,
    unit: 'days',
    tolerance: 2e-3,
    why: 'Pure arithmetic over the unit anchors, so the only error is in the constants themselves. G and the solar mass are known to five figures; 0.2% is a loose bound on their combined effect and would still catch any scale mistake, which are all factors of 10 or more.',
    source: 'IAU 2015 nominal values',
  });

  const earthSpeedKms =
    (Math.sqrt((G * 1000) / 100) * units.velocityUnitToMs()) / 1000;
  add({
    group: 'Unit system',
    kind: 'analytic',
    name: "Earth's circular speed at 1 AU",
    measured: earthSpeedKms,
    expected: REF.earthOrbitalSpeedKms,
    unit: 'km/s',
    tolerance: 2e-3,
    why: "Same anchors as above, read out through velocityUnitToMs(). The published 29.78 km/s is Earth's mean orbital speed on a slightly eccentric orbit; 0.2% covers that difference.",
    source: 'NASA Earth fact sheet',
  });

  add({
    group: 'Unit system',
    kind: 'analytic',
    name: 'Solar mass anchor',
    measured: physics.SOLAR_MASS_UNIT,
    expected: 1000,
    unit: 'units',
    tolerance: 0,
    why: 'The anchor is a definition, so it is checked exactly. Every other mass unit is derived from it.',
  });

  add({
    group: 'Unit system',
    kind: 'analytic',
    name: 'Earth mass unit is the solar mass over the measured mass ratio',
    measured: physics.EARTH_MASS_UNIT * constants.EARTH_MASSES_PER_SOLAR_MASS,
    expected: physics.SOLAR_MASS_UNIT,
    unit: 'units',
    tolerance: 1e-12,
    why: 'A derived constant must reproduce its own definition to machine precision. This constant was a literal 3 - a factor of 1000 too heavy - and nothing caught it, because the inspector divided by the same wrong number to print the mass back.',
  });

  add({
    group: 'Unit system',
    kind: 'analytic',
    name: 'Jupiter mass unit is the solar mass over the measured mass ratio',
    measured:
      physics.JUPITER_MASS_UNIT * constants.JUPITER_MASSES_PER_SOLAR_MASS,
    expected: physics.SOLAR_MASS_UNIT,
    unit: 'units',
    tolerance: 1e-12,
    why: 'As above. This one sat at 50 rather than 0.955 for a long time, a factor of 52.',
  });

  add({
    group: 'Unit system',
    kind: 'analytic',
    name: 'One AU is 100 simulation length units',
    measured: units.auToSim(1),
    expected: 100,
    unit: 'units',
    tolerance: 0,
    why: 'A definition, checked exactly. The habitable-zone renderer once carried a private copy of this set to 160.',
  });
}
