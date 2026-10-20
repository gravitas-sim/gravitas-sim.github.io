// ===========================================================================
// 11. Habitable zone and insolation
// ===========================================================================

import { REF } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ habitability, trappist, add }) {
  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Earth receives one Earth insolation at 1 AU',
    measured: habitability.relativeInsolation(1, 1),
    expected: 1,
    unit: 'Earth units',
    tolerance: 0,
    why: 'A definition. The check is that the inverse-square law is what is implemented.',
  });

  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'Solar constant at 1 AU',
    measured: habitability.insolationWm2(1, 1),
    expected: REF.solarConstantWm2,
    unit: 'W/m^2',
    tolerance: 1e-3,
    source: 'TSIS-1 / IPCC AR6',
    why: 'Total solar irradiance is measured to better than 0.1%; the value stored is the standard rounded one.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Insolation falls as the inverse square of distance',
    measured:
      habitability.relativeInsolation(1, 2) /
      habitability.relativeInsolation(1, 1),
    expected: 0.25,
    unit: '',
    tolerance: 1e-15,
    why: 'Twice as far, a quarter as much. Machine precision, because it is one division.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'distanceForInsolation inverts relativeInsolation',
    measured: habitability.distanceForInsolation(
      0.5,
      habitability.relativeInsolation(0.5, 3.3)
    ),
    expected: 3.3,
    unit: 'AU',
    tolerance: 1e-12,
    why: 'A round trip. The habitable-zone edges are computed by inverting the insolation relation, so the two directions have to agree; the tolerance is the round-off of a square root.',
  });

  // The published polynomial must reproduce its own solar anchor.
  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Runaway-greenhouse flux at the solar temperature',
    measured: habitability.effectiveFluxAt(
      'runawayGreenhouse',
      habitability.SUN_TEFF_K
    ),
    expected: 1.0385,
    unit: 'S_eff',
    tolerance: 1e-12,
    why: 'At T_eff = 5780 K every term of the quartic vanishes and only the constant survives, so this checks the tabulated coefficient against the published one exactly.',
    source: 'Kopparapu et al. (2014) ApJ 787, L29 (erratum)',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Maximum-greenhouse flux at the solar temperature',
    measured: habitability.effectiveFluxAt(
      'maximumGreenhouse',
      habitability.SUN_TEFF_K
    ),
    expected: 0.3507,
    unit: 'S_eff',
    tolerance: 1e-12,
    source: 'Kopparapu et al. (2014) ApJ 787, L29 (erratum)',
    why: 'As for the inner edge: at T_eff = 5780 K the quartic collapses to its constant term, so this compares the stored coefficient directly against the published one.',
  });

  const sunHz = habitability.habitableZoneBounds(
    { luminositySolar: 1, teffK: habitability.SUN_TEFF_K },
    'conservative'
  );
  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'Conservative habitable zone of the Sun, inner edge',
    measured: sunHz.innerAU,
    expected: REF.sunHzInnerAU,
    unit: 'AU',
    tolerance: 2e-2,
    why: 'The prescription is usually quoted for the Sun as 0.99 to 1.70 AU, rounded to two figures. Evaluating the erratum coefficients exactly gives 0.981 AU, 1% below the rounded quote; 2% accommodates that without accommodating a wrong coefficient, which would move the edge by tens of percent.',
    source: 'Kopparapu et al. (2013, 2014)',
  });

  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'Conservative habitable zone of the Sun, outer edge',
    measured: sunHz.outerAU,
    expected: REF.sunHzOuterAU,
    unit: 'AU',
    tolerance: 2e-2,
    source: 'Kopparapu et al. (2013, 2014)',
    why: 'As above; the exact evaluation gives 1.689 AU against the quoted 1.70.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Earth is inside the conservative zone',
    measured: habitability.habitableZoneStatus(1, sunHz).status === 'inside',
    expected: true,
    why: 'The sanity check the whole prescription has to pass before it is worth using on anything else.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: "Mars's orbit is inside the conservative zone, and Venus's is not",
    measured:
      habitability.habitableZoneStatus(1.524, sunHz).status +
      '/' +
      habitability.habitableZoneStatus(0.723, sunHz).status,
    expected: 'inside/inner',
    why: "The result that makes the investigation worth teaching, and the one that catches an outer edge placed by intuition rather than by the model. Kopparapu's maximum-greenhouse edge is at 1.69 AU, beyond Mars: by insolation alone Mars is in the habitable zone. It is not habitable, and the reason has nothing to do with how much sunlight it gets. Venus, at 0.723 AU, is inside the inner edge - which is the half of the Solar System comparison the intuition does get right.",
    source: 'Kopparapu et al. (2013, 2014)',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'The optimistic zone contains the conservative one',
    measured: (() => {
      const opt = habitability.habitableZoneBounds(
        { luminositySolar: 1, teffK: habitability.SUN_TEFF_K },
        'optimistic'
      );
      return opt.innerAU < sunHz.innerAU && opt.outerAU > sunHz.outerAU;
    })(),
    expected: true,
    why: 'Recent Venus is hotter than the runaway greenhouse and Early Mars is colder than the maximum greenhouse, so the optimistic edges must bracket the conservative ones. An ordering mistake in the boundary table would show up here and nowhere else.',
  });

  // TRAPPIST-1, the system the Goldilocks lesson is built on.
  const t1 = habitability.habitableZoneBounds(
    {
      luminositySolar: trappist.TRAPPIST1_STAR.luminosityInSuns,
      teffK: trappist.TRAPPIST1_STAR.temperatureK,
    },
    'conservative'
  );

  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'TRAPPIST-1 conservative zone, inner edge',
    measured: t1.innerAU,
    expected: REF.trappist1HzInnerAU,
    unit: 'AU',
    tolerance: 8e-2,
    why: 'The published zone is quoted to two figures as 0.024 to 0.049 AU. The star is also 34 K below the temperature range the Kopparapu fit was calibrated over, so the model clamps to 2600 K rather than extrapolating a quartic; the code reports that it did (extrapolated = true) and this tolerance carries it. 8% is what that clamp costs and is still an order of magnitude tighter than the mass-luminosity fallback this model replaced, which put the zone out by a factor of four.',
    source: 'Gillon et al. (2017) Nature 542, 456',
  });

  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'TRAPPIST-1 conservative zone, outer edge',
    measured: t1.outerAU,
    expected: REF.trappist1HzOuterAU,
    unit: 'AU',
    tolerance: 8e-2,
    source: 'Gillon et al. (2017) Nature 542, 456',
    why: 'As above.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: "TRAPPIST-1 is flagged as outside the fit's calibrated range",
    measured: t1.extrapolated,
    expected: true,
    why: 'The star is at 2566 K and the published fit covers 2600 to 7200 K. Reporting that honestly, rather than quoting an extrapolated quartic as a measurement, is the behavior under test.',
  });

  add({
    group: 'Habitable zone',
    kind: 'data',
    name: 'TRAPPIST-1 e, f and g are the planets in the conservative zone',
    measured: trappist.TRAPPIST1_PLANETS.filter(
      p => p.a >= t1.innerAU && p.a <= t1.outerAU
    )
      .map(p => p.name)
      .join(''),
    expected: 'efg',
    why: "The result the literature reports for this system, reproduced from the stored semi-major axes and the model's own zone rather than asserted. This is the single claim the Goldilocks investigation rests on.",
    source: 'Gillon et al. (2017) Nature 542, 456',
  });

  add({
    group: 'Habitable zone',
    kind: 'approximation',
    name: 'Mass-luminosity fallback returns 1 L_sun for 1 M_sun',
    measured: habitability.estimateLuminosityFromMass(1),
    expected: 1,
    unit: 'L_sun',
    tolerance: 0,
    why: "A labeled approximation, validated only against its own anchor. The relation is a broken power law good to a factor of order two at the bottom of the main sequence, and it is used only for stars a user invented. Any star carrying a measured luminosity uses that instead - which is the fix that moved TRAPPIST-1's zone by a factor of four.",
  });

  // An eccentric orbit spends more of its year far from the star than near
  // it, which is the point of the eccentricity part of the lesson.
  const eccOrbit = { semiMajorAU: 1, eccentricity: 0.4, luminositySolar: 1 };
  const extremes = habitability.orbitExtremes(eccOrbit);
  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'Periapsis and apoapsis insolation ratio is ((1+e)/(1-e))^2',
    measured: extremes.periapsisInsolation / extremes.apoapsisInsolation,
    expected: ((1 + 0.4) / (1 - 0.4)) ** 2,
    unit: '',
    tolerance: 1e-12,
    why: 'The inverse-square law applied at the two turning points. At e = 0.4 that is a factor of 5.4 between the hottest and coldest part of the year, which is the number the eccentricity part of the investigation turns on.',
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: "Kepler's equation solver reproduces the apoapsis distance",
    measured: habitability.orbitalStateAt(eccOrbit, 0.5).distanceAU,
    expected: 1.4,
    unit: 'AU',
    tolerance: 1e-9,
    why: "Half a period after periapsis is apoapsis exactly, at a(1+e). Newton's method on Kepler's equation converges to 1e-12 here; the tolerance is three orders looser than that and still pins the solver.",
  });

  add({
    group: 'Habitable zone',
    kind: 'analytic',
    name: 'More than half the year is spent beyond the semi-major axis',
    measured: (() => {
      let outside = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) {
        if (
          habitability.orbitalStateAt(eccOrbit, (i + 0.5) / n).distanceAU > 1
        ) {
          outside++;
        }
      }
      return outside / n;
    })(),
    expected: 0.6,
    unit: 'fraction of the year',
    tolerance: 5e-2,
    why: "Kepler's second law, in the form the investigation uses it: a planet dawdles through the cold outer half of an eccentric orbit and rushes through the hot inner half. Sampling evenly in mean anomaly samples evenly in time, which is the step that makes this a statement about the year rather than about the path. The exact figure for e = 0.4 is 0.632; 5% covers the sampling.",
  });
}
