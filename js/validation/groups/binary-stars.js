// ===========================================================================
// 5. Binary stars, barycenter and mass ratio
// ===========================================================================

import { REF, makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  constants,
  physics,
  frames,
  binaryWidgets,
  exoSystems,
  add,
  lab,
}) {
  const G = 1;
  const dt = 0.05;
  const m1 = 1500;
  const m2 = 500; // a 3:1 mass ratio, so the two distances are visibly unequal
  const sep = 240;

  lab.reset();
  const vRel = Math.sqrt((G * (m1 + m2)) / sep);
  const r1 = (sep * m2) / (m1 + m2);
  const r2 = (sep * m1) / (m1 + m2);
  const A = makeStar(
    physics,
    { x: -r1, y: 0 },
    { x: 0, y: (-vRel * m2) / (m1 + m2) },
    m1
  );
  const B = makeStar(
    physics,
    { x: r2, y: 0 },
    { x: 0, y: (vRel * m1) / (m1 + m2) },
    m2
  );
  physics.stars.push(A, B);
  lab.commit();

  const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (m1 + m2)));
  let sumR1 = 0;
  let sumR2 = 0;
  let n = 0;
  lab.step(dt, Math.round((6 * period) / dt), () => {
    const bary = frames.systemBarycenter([A, B]);
    sumR1 += hypot(A.pos.x - bary.x, A.pos.y - bary.y);
    sumR2 += hypot(B.pos.x - bary.x, B.pos.y - bary.y);
    n++;
  });

  add({
    group: 'Binary stars',
    kind: 'integration',
    name: 'Distances from the barycenter are inversely as the masses',
    measured: sumR2 / sumR1,
    expected: m1 / m2,
    unit: 'r2/r1',
    tolerance: 1e-9,
    why: 'The defining property of a center of mass, and it holds instant by instant regardless of integration error, because both distances are measured from the same computed barycenter. The tolerance is arithmetic round-off over 30000 accumulated samples.',
  });

  add({
    group: 'Binary stars',
    kind: 'integration',
    name: 'Separation is the sum of the two orbital radii',
    measured: (sumR1 + sumR2) / n,
    expected: sep,
    unit: 'units',
    tolerance: 3e-3,
    why: 'A circular binary at dt = 0.05 against a period of 265 units, so the same O(dt/P) spurious eccentricity as the single-planet case. 0.3% is that bound.',
  });

  const facts = binaryWidgets.binaryFacts(1.5, 0.5, 2.4);
  add({
    group: 'Binary stars',
    kind: 'analytic',
    name: "Investigation widget: Kepler's third law in AU, years and solar masses",
    measured: facts.period,
    expected: Math.sqrt(2.4 ** 3 / 2.0),
    unit: 'years',
    tolerance: 1e-12,
    why: 'a^3 = P^2 M is exact in these units by construction; the check is that the widget the "Weighing the Stars" investigation uses implements it and not something else.',
  });

  add({
    group: 'Binary stars',
    kind: 'analytic',
    name: 'Investigation widget: barycenter distances match the mass ratio',
    measured: facts.r1 / facts.r2,
    expected: facts.m2 / facts.m1,
    unit: '',
    tolerance: 1e-12,
    why: 'The relation the investigation asks a student to discover, checked in the instrument that shows it to them.',
  });

  // The Sun and Jupiter, as the archetype: the barycenter is outside the Sun.
  const sunJupiterBaryAU =
    (exoSystems.SUN_JUPITER.planet.semiMajorAU * constants.JUPITER_MASS_KG) /
    (constants.SOLAR_MASS_KG + constants.JUPITER_MASS_KG);
  add({
    group: 'Binary stars',
    kind: 'data',
    name: 'Sun-Jupiter barycenter distance from the solar center',
    measured: (sunJupiterBaryAU * constants.AU_METERS) / 1000,
    expected: REF.sunJupiterBarycenterKm,
    unit: 'km',
    tolerance: 5e-3,
    why: 'Computed from the stored semi-major axis and the two masses. The textbook figure is quoted to two significant figures as 742000 km, so 0.5% is finer than the number it is being compared against.',
    source: 'Murray & Dermott, Solar System Dynamics',
  });
}
