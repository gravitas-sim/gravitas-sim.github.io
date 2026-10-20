// =========================================================================
// MOND
// -------------------------------------------------------------------------
// Milgrom's law is a second explanation for the same flat curves the halo
// above accounts for, and the project offers it as an alternative rather than
// as an answer. These checks are about the arithmetic and the wiring: that
// the two limits are the ones the theory defines, that the asymptotic
// relation is the observed one, and that the modification cannot escape into
// scenarios it has no business in.
// =========================================================================

import { makeTracer, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, darkMatter, mond, add, lab }) {
  const a0g = mond.A0_GALACTIC;
  const Gg = darkMatter.G_GALACTIC;

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'a0 converts from SI to galactic units',
    measured: a0g * mond.GALACTIC_ACCEL_IN_SI,
    expected: mond.A0_SI,
    unit: 'm/s^2',
    tolerance: 1e-9,
    why: 'One constant, quoted in SI where it was published and converted once. This is the round trip: 1.2e-10 m/s^2 is about 3703 (km/s)^2/kpc, and converting back has to return what went in. Everything else in this group depends on it.',
    source: 'Begeman, Broeils & Sanders 1991; Famaey & McGaugh 2012',
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'Newtonian limit: no departure at Solar System accelerations',
    measured: mond.mondBoost(9.8 / mond.GALACTIC_ACCEL_IN_SI, a0g) - 1,
    expected: 0,
    unit: 'fractional boost',
    tolerance: 1e-10,
    toleranceKind: 'absolute',
    why: "Earth's surface gravity is about 3e11 a0. If MOND altered anything measurable there the theory would have been dead on arrival, so this is the check that the interpolating function really does switch itself off. The simple form gives a departure of order 1/y, which at this y is 3e-12.",
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'Deep-MOND limit: g approaches sqrt(gN a0)',
    measured: (() => {
      const gN = 1e-8 * a0g;
      return mond.mondAccel(gN, a0g) / Math.sqrt(gN * a0g);
    })(),
    expected: 1,
    unit: 'ratio',
    tolerance: 2e-4,
    toleranceKind: 'absolute',
    why: 'The other defining limit, and the one that produces flat rotation curves. Eight decades below a0 the modified acceleration has to be the geometric mean of the Newtonian field and a0 to within 1e-4; the residual is the next term in the expansion, of order sqrt(y).',
    source: 'Milgrom 1983',
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'The asymptotic relation is v^4 = G M a0',
    measured: (() => {
      const M = 3.35e10;
      const v = mond.asymptoticSpeed(M, a0g, Gg);
      return v ** 4 / (Gg * M * a0g);
    })(),
    expected: 1,
    unit: 'ratio',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'Definitional, and worth pinning because every claim the investigation makes about MOND predicting a flat speed from the visible mass reduces to it.',
  });

  add({
    group: 'MOND',
    kind: 'empirical',
    name: 'The predicted Tully-Fisher coefficient matches the observed one',
    measured: 1 / (Gg * a0g),
    expected: 47,
    unit: 'M_sun per (km/s)^4',
    tolerance: 0.5,
    why: 'The one check in this group that compares against the sky rather than against the code. MOND predicts M = v^4/(G a0); the observed baryonic Tully-Fisher relation has M = A v^4 with A near 47 solar masses per (km/s)^4. The two agree to well inside the relation’s own scatter, which is why MOND is taken seriously for rotation curves at all. A 50% tolerance is wide because the observed coefficient itself is quoted between about 30 and 80 depending on the sample and the gas correction.',
    source: 'McGaugh 2012, AJ 143, 40',
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'NGC 3198 asymptote from its baryons alone',
    measured: mond.asymptoticSpeed(3.35e10, a0g, Gg),
    expected: 150,
    unit: 'km/s',
    tolerance: 0.1,
    why: "The investigation's synthetic curve flattens at 150 km/s, which is NGC 3198's published asymptotic speed, and the halo decomposition needs two fitted parameters to put it there. MOND gets 152 from the baryonic mass with nothing fitted. That agreement is the reason the comparison is worth making; it is not evidence that MOND is correct, and neither the investigation nor this suite says it is.",
    source: 'Begeman 1989, A&A 223, 47',
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'The boost is finite and at least 1 across sixteen decades',
    measured: (() => {
      let worst = 0;
      for (let e = -8; e <= 8; e += 0.05) {
        const b = mond.mondBoost(10 ** e * a0g, a0g);
        if (!Number.isFinite(b) || b < 1) return -1;
        worst = Math.max(worst, b < 1 ? 1 - b : 0);
      }
      return worst;
    })(),
    expected: 0,
    unit: 'worst violation',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'A force law that returned NaN or a boost below one anywhere would break the integrator or make gravity weaker than Newton, which MOND never does. Swept at twenty points per decade across the whole range a simulation could reach.',
  });

  // The scale mapping, and the guard that keeps MOND inside it.
  const scale = { kpcPerUnit: 1 / 30, solarMassPerUnit: 9.604e5 };
  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'The galaxy scale model lands on the Tully-Fisher relation',
    measured: (() => {
      const massPhys = 14700 * scale.solarMassPerUnit;
      const v = mond.asymptoticSpeed(massPhys, a0g, Gg);
      return massPhys / (47 * v ** 4);
    })(),
    expected: 1,
    unit: 'ratio to observed BTFR',
    tolerance: 0.5,
    why: 'The galaxy scenarios are scale models, so a0 has to be carried into simulation units through a declared mapping, and the mapping was chosen so the model galaxy is a real one: 14,700 mass units of visible matter becomes 1.4e10 solar masses rotating at about 122 km/s. This check is what stops that choice from being arbitrary - the implied galaxy has to sit on the observed relation. It is not evidence for MOND, and the scenario comments say so.',
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'a0 in simulation units reproduces the scenario flat curve',
    measured: mond.asymptoticSpeed(14700, mond.a0InSimUnits(scale, 1), 1),
    expected: 11,
    unit: 'simulation speed units',
    tolerance: 0.05,
    why: "The disc scenarios show a curve flat at 11 units. Converting a0 through the declared scale and applying v^4 = G M a0 to the scenario's own visible mass has to return that number, or the mapping and the scenario disagree about what galaxy this is.",
  });

  add({
    group: 'MOND',
    kind: 'analytic',
    name: 'A scenario with no declared scale gets no MOND',
    measured: mond.a0InSimUnits({ kpcPerUnit: 0, solarMassPerUnit: 0 }, 1),
    expected: 0,
    unit: 'a0 in sim units',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'The guard that keeps a galactic acceleration constant out of the Solar System and the black-hole scenarios. Zero here means the force law leaves those worlds exactly Newtonian however the mode is set.',
  });

  // MOND inside the real integrator.
  {
    const dt = 0.05;
    const r = 700;
    const M = 14.7;
    const a0sim = mond.a0InSimUnits(scale, 1);
    // The circular speed at *this* radius, not the asymptotic one. They are
    // not the same until the orbit is well outside the transition region: at
    // r = 700 the Newtonian field is still 0.03 a0, so the circular speed is
    // 11.5 where the asymptote is 11.0. Launching at the asymptote gives a
    // visibly eccentric orbit - a true statement about MOND and a poor test
    // of the integrator.
    const vNewton = Math.sqrt((1 * M * physics.SOLAR_MASS_UNIT) / r);
    const vFlatSim = mond.mondCircularSpeed(r, vNewton, a0sim);
    lab.reset({
      galaxy_gravity: 'mond',
      galaxy_kpc_per_unit: scale.kpcPerUnit,
      galaxy_msun_per_unit: scale.solarMassPerUnit,
      gravitational_constant: 1,
      mutual_gravity: false,
    });
    const center = new physics.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, M);
    center.isCentralBody = true;
    center.persistent = true;
    physics.stars.push(center);
    const p = makeTracer(physics, { x: r, y: 0 }, { x: 0, y: vFlatSim });
    physics.planets.push(p);
    lab.commit();

    const period = (2 * Math.PI * r) / vFlatSim;
    let minR = r;
    let maxR = r;
    lab.step(dt, Math.round((4 * period) / dt), () => {
      const rr = hypot(p.pos.x, p.pos.y);
      minR = Math.min(minR, rr);
      maxR = Math.max(maxR, rr);
    });
    add({
      group: 'MOND',
      kind: 'integration',
      name: 'A MOND circular orbit stays circular in the integrator',
      measured: (maxR - minR) / r,
      expected: 0,
      unit: 'fractional range',
      tolerance: 6e-3,
      toleranceKind: 'absolute',
      why: 'MOND is applied to the summed field rather than added as a separate term, so this is the check that the rescaling in the integrator agrees with the curve the panel draws. The tracer is launched at the MOND circular speed at its own radius - 11.5 units, where the asymptote is 11.0, because at r = 700 the field is still 0.03 a0 and the two have not converged. Same O(dt/P) bound as the halo equivalent: 4 orbits at dt = 0.05.',
    });
  }
}
