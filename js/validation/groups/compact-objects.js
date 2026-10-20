// ===========================================================================
// 13. Compact objects
// ===========================================================================

import { REF } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ constants, blackHole, add }) {
  const solar = blackHole.blackHoleFacts(1);

  add({
    group: 'Compact objects',
    kind: 'data',
    name: 'Schwarzschild radius of one solar mass',
    measured: solar.rsKm,
    expected: REF.schwarzschildSolarKm,
    unit: 'km',
    tolerance: 3e-3,
    why: 'R_s = 2GM/c^2. The standard quoted value is 2.95 km to three figures; the exact evaluation with CODATA G and the IAU solar mass gives 2.954 km. 0.3% is the rounding in the reference.',
    source:
      'Schwarzschild (1916); value as standardly quoted, e.g. Misner, Thorne & Wheeler, Gravitation',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Schwarzschild radius is linear in mass',
    measured:
      blackHole.schwarzschildRadiusM(10 * constants.SOLAR_MASS_KG) /
      blackHole.schwarzschildRadiusM(constants.SOLAR_MASS_KG),
    expected: 10,
    unit: '',
    tolerance: 1e-14,
    why: 'The trend the "Black Holes by the Numbers" investigation asks a student to discover first.',
  });

  add({
    group: 'Compact objects',
    kind: 'data',
    name: 'Schwarzschild radius of Sagittarius A*',
    measured: blackHole.blackHoleFacts(REF.sgrAMassSuns).rsM,
    expected: REF.sgrARsMeters,
    unit: 'm',
    tolerance: 3e-3,
    source: 'GRAVITY Collaboration (2019) A&A 625, L10',
    why: 'A real object at the other end of the mass range from the solar-mass case, so the check spans seven decades. The measured mass is quoted to four figures; 0.3% is the rounding in the horizon radius derived from it.',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Newtonian escape speed at the horizon is exactly c',
    measured:
      blackHole.newtonianEscapeSpeed(constants.SOLAR_MASS_KG, solar.rsM) /
      REF.c,
    expected: 1,
    unit: '',
    tolerance: 1e-14,
    why: 'The pedagogical squeeze-the-Sun panel gets the right radius for the wrong reason: sqrt(2GM/r) = c at r = 2GM/c^2 identically. The investigation makes that point explicitly rather than letting a student think Newtonian gravity predicts event horizons, and this check confirms the arithmetic the point rests on.',
  });

  add({
    group: 'Compact objects',
    kind: 'data',
    name: 'Hawking temperature of one solar mass',
    measured: solar.temperature,
    expected: REF.hawkingSolarK,
    unit: 'K',
    tolerance: 3e-3,
    why: 'T = hbar c^3 / (8 pi G M k_B). Quoted to three figures as 6.17e-8 K.',
    source: 'Hawking (1974) Nature 248, 30',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Hawking temperature is inversely proportional to mass',
    measured:
      blackHole.blackHoleFacts(1).temperature /
      blackHole.blackHoleFacts(100).temperature,
    expected: 100,
    unit: '',
    tolerance: 1e-12,
    why: 'The counterintuitive scaling the investigation is built around: bigger holes are colder.',
  });

  add({
    group: 'Compact objects',
    kind: 'data',
    name: 'Evaporation lifetime of one solar mass',
    measured: solar.lifetimeYears,
    expected: REF.evaporationSolarYears,
    unit: 'years',
    tolerance: 2e-2,
    why: 't = 5120 pi G^2 M^3 / (hbar c^4). The commonly quoted figure is "about 2.1e67 years", stated to two figures; 2% is finer than that. The coefficient assumes emission of massless species only, which is the version the investigation states.',
    source: 'Page (1976) Phys. Rev. D 13, 198',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Evaporation lifetime scales as the cube of the mass',
    measured:
      blackHole.blackHoleFacts(10).lifetimeYears /
      blackHole.blackHoleFacts(1).lifetimeYears,
    expected: 1000,
    unit: '',
    tolerance: 1e-12,
    why: 'The M^3 in the Hawking lifetime, isolated. Ten times the mass, a thousand times the wait: the scaling the investigation asks a student to find and the reason no stellar-mass hole has evaporated.',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Average density falls as the inverse square of mass',
    measured:
      blackHole.blackHoleFacts(1).density /
      blackHole.blackHoleFacts(1000).density,
    expected: 1e6,
    unit: '',
    tolerance: 1e-9,
    why: 'M / R_s^3 with R_s linear in M. The reason a supermassive hole can be less dense than water, which is the single most surprising number in the investigation.',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'A supermassive hole is less dense than water',
    measured: blackHole.blackHoleFacts(1e9).density < 1000,
    expected: true,
    why: 'The consequence of the scaling above, stated as the claim the investigation actually makes.',
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'ISCO sits at three Schwarzschild radii',
    measured: (() => {
      const f = blackHole.blackHoleFacts(10);
      // The stored ISCO period is Keplerian at r = 3 R_s; invert it.
      const rIsco = Math.cbrt(
        (constants.G_SI * f.massKg * f.iscoPeriodSeconds ** 2) /
          (4 * Math.PI ** 2)
      );
      return rIsco / f.rsM;
    })(),
    expected: 3,
    unit: 'R_s',
    tolerance: 1e-9,
    why: "r_ISCO = 6GM/c^2 for a Schwarzschild hole. Recovered by inverting the stored orbital period rather than read back from the same expression that produced it, so the two have to agree. Kepler's third law happens to hold exactly in Schwarzschild coordinates for circular orbits, which is why a Newtonian period is the right thing to quote here.",
  });

  add({
    group: 'Compact objects',
    kind: 'analytic',
    name: 'Mass categories fall on their stated boundaries',
    measured: [
      blackHole.blackHoleCategory(1),
      blackHole.blackHoleCategory(10),
      blackHole.blackHoleCategory(1e3),
      blackHole.blackHoleCategory(4e6),
    ].join('|'),
    expected: 'Primordial|Stellar-Mass|Intermediate|Supermassive',
    why: 'Conventions rather than physics, and the investigation says so, but they still have to be the conventions the investigation states.',
  });
}
