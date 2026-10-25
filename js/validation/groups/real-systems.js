// ===========================================================================
// 16. Stored parameters for real systems
// ===========================================================================

import { REF, k2Percent } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  constants,
  observables,
  trappist,
  exoSystems,
  add,
}) {
  const star = trappist.TRAPPIST1_STAR;
  add({
    group: 'Real systems',
    kind: 'data',
    name: 'TRAPPIST-1 stellar mass',
    measured: star.massInSuns,
    expected: REF.trappist1MassSuns,
    unit: 'M_sun',
    tolerance: 1e-9,
    source: 'Agol et al. (2021) PSJ 2, 1',
    why: 'A stored parameter checked against its published source. Tolerance is essentially exact because the stored value should be a transcription, not a derivation.',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'TRAPPIST-1 stellar radius',
    measured: star.radiusInSuns,
    expected: REF.trappist1RadiusSuns,
    unit: 'R_sun',
    tolerance: 1e-9,
    source: 'Agol et al. (2021) PSJ 2, 1',
    why: 'A transcription, so it is checked essentially exactly. The stellar radius sets every transit depth in this system, so an error here would propagate into seven light curves.',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'TRAPPIST-1 luminosity',
    measured: star.luminosityInSuns,
    expected: REF.trappist1LuminositySuns,
    unit: 'L_sun',
    tolerance: 2e-3,
    source: 'Ducrot et al. (2020) A&A 640, A112',
    why: 'Stored as 5.53e-4. This is the value that must be measured rather than derived: a main-sequence mass-luminosity relation puts this star out by more than an order of magnitude and its habitable zone out by a factor of four.',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'TRAPPIST-1 effective temperature',
    measured: star.temperatureK,
    expected: REF.trappist1TeffK,
    unit: 'K',
    tolerance: 1e-9,
    source: 'Agol et al. (2021) PSJ 2, 1',
    why: 'A transcription. This is the value fed to the habitable-zone polynomial, and it is also the value that falls below the range that polynomial was fitted over - which the model reports rather than hides.',
  });

  // Every planet, against Kepler's third law with the stored stellar mass.
  // This is the strongest single consistency test on a stored system: seven
  // independent (a, P) pairs that must all imply the same central mass.
  const implied = trappist.TRAPPIST1_PLANETS.map(
    p => p.a ** 3 / (p.periodDays / 365.25) ** 2
  );
  const worst = Math.max(
    ...implied.map(m => Math.abs(m - star.massInSuns) / star.massInSuns)
  );
  add({
    group: 'Real systems',
    kind: 'data',
    name: 'All seven TRAPPIST-1 planets imply the stored stellar mass',
    measured: worst,
    expected: 0,
    unit: 'worst relative deviation',
    tolerance: 1.5e-2,
    toleranceKind: 'absolute',
    why: 'a^3/P^2 must equal M* in AU, years and solar masses, for every planet. The stored semi-major axes are quoted to three figures and the periods to five, so the ratio inherits roughly a 1% rounding uncertainty from the axes alone; 1.5% is that, and it would still catch a transposed digit or a wrong unit anywhere in the table.',
    source: 'Agol et al. (2021) PSJ 2, 1',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'TRAPPIST-1 planets are ordered by distance',
    measured: trappist.TRAPPIST1_PLANETS.every(
      (p, i) => i === 0 || p.a > trappist.TRAPPIST1_PLANETS[i - 1].a
    ),
    expected: true,
    why: 'b through h, in order. A table that had drifted out of order would still pass every arithmetic check above, and the investigation names the planets by letter.',
    source: 'Agol et al. (2021) PSJ 2, 1',
  });

  // HD 209458.
  const hd = exoSystems.HD209458;
  const hdImplied =
    hd.planet.semiMajorAU ** 3 / (hd.planet.periodDays / 365.25) ** 2;
  add({
    group: 'Real systems',
    kind: 'data',
    name: "HD 209458's a and P imply its stored stellar mass",
    measured: hdImplied,
    expected: hd.star.massSolar,
    unit: 'M_sun',
    tolerance: 5e-3,
    why: 'Same test as TRAPPIST-1, on the system the transit investigation uses. The stored axis carries four figures, so half a percent is the rounding it inherits.',
    source: 'Torres, Winn & Holman (2008) ApJ 677, 1324',
  });

  const kHd =
    (hd.planet.radiusJupiter * constants.JUPITER_RADIUS_M) /
    (hd.star.radiusSolar * constants.SOLAR_RADIUS_M);
  add({
    group: 'Real systems',
    kind: 'data',
    name: 'HD 209458 b transit depth from the stored radii',
    measured: k2Percent(kHd),
    expected: REF.hd209458DepthPercent,
    unit: '%',
    tolerance: 3e-2,
    why: 'The geometric depth (Rp/Rs)^2, computed from the stored planet and stellar radii, against the measured depth the investigation quotes. They agree to 0.5%, which is the point: a student who measures 1.5% and solves for a radius gets the stored radius back. 3% is the spread in published depths across instruments and bandpasses.',
    source: 'Charbonneau et al. (2000) ApJ 529, L45',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'HD 209458 b is a hot Jupiter by bulk density',
    measured: observables.planetBulkDensity({
      massJupiter: hd.planet.massJupiter,
      radiusJupiter: hd.planet.radiusJupiter,
    }).gramsPerCm3,
    expected: 0.33,
    unit: 'g/cm^3',
    tolerance: 3e-2,
    why: 'The inflated-radius result the system is famous for: less than a third the density of water. Computed from the stored mass and radius; the published value is 0.33 to two figures.',
    source: 'Southworth (2010) MNRAS 408, 1689',
  });

  const sunJup = exoSystems.SUN_JUPITER;
  add({
    group: 'Real systems',
    kind: 'data',
    name: "Jupiter's a and P imply one solar mass",
    measured:
      sunJup.planet.semiMajorAU ** 3 / (sunJup.planet.periodDays / 365.25) ** 2,
    expected: 1,
    unit: 'M_sun',
    tolerance: 3e-3,
    why: "Kepler's third law in the units it was written for, on the pair that defined them. Any error in the stored axis or period shows up here immediately. The 0.09% residual is real and not rounding: the stored period is Jupiter's sidereal period and the stored axis its mean semi-major axis, and the two-body relation neglects the rest of the Solar System, chiefly Saturn.",
    source: 'JPL Horizons mean orbital elements',
  });

  add({
    group: 'Real systems',
    kind: 'data',
    name: 'Earth bulk density from stored constants',
    measured: observables.planetBulkDensity({ massEarth: 1, radiusEarth: 1 })
      .gramsPerCm3,
    expected: 5.51,
    unit: 'g/cm^3',
    tolerance: 5e-3,
    source: 'NASA Earth fact sheet',
    why: 'Uses the equatorial radius, which is what the stored constant is; the published 5.514 g/cm^3 uses the volumetric mean radius, and the two differ by about 0.3%.',
  });
}
