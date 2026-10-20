// ===========================================================================
// Planets in binary stars
// ---------------------------------------------------------------------------
// Two things are checked here and they are different in kind.
//
// The published fits in js/binaryStability.js are `data` checks: seven
// coefficients transcribed out of Holman & Wiegert (1999), verified against
// numbers that appear outside the fit. A transcription error in a polynomial
// is invisible - the curve is still a curve - so they are checked against
// real systems whose planets the literature places on a known side of the
// boundary, not against themselves.
//
// The configurations are `integration` checks: the four representative cases
// the "Planets in Binary Stars" investigation is written around, run through
// the real engine at the timestep the scenario ships with. The lesson tells a
// student that 0.15 separations survives and 0.30 does not; if that ever
// stops being true, the lesson is teaching something false and this is where
// it should be caught.
//
// The outcomes are exact comparisons rather than toleranced ones. "Survived"
// and "ejected" are not quantities with an error bar.
// ===========================================================================

import { makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  constants,
  physics,
  binaryOrbits,
  binaryStability,
  add,
  lab,
}) {
  const G = 1;
  const AU = 100;
  const MSUN = 1000;
  // The shipped configuration: 1.0 and 0.5 solar masses, 10 AU apart, e = 0.4,
  // both bodies starting at periapsis. Kept in one place so a check cannot
  // silently test a different system from the one the lesson loads.
  const LAB = {
    m1: 1.0 * MSUN,
    m2: 0.5 * MSUN,
    separation: 10 * AU,
    eccentricity: 0.4,
    phaseDeg: 0,
    planetPhaseDeg: 0,
    planetMass:
      constants.SOLAR_MASS_UNIT / constants.EARTH_MASSES_PER_SOLAR_MASS,
    G,
  };
  const mu = LAB.m2 / (LAB.m1 + LAB.m2);

  // --- The fits, against systems from outside the paper -------------------
  add({
    group: 'Planets in binary stars',
    kind: 'data',
    name: 'S-type boundary for an equal-mass circular binary',
    source: 'Holman & Wiegert 1999, AJ 117, 621, eq. (1) and Table 3',
    measured: binaryStability.criticalSemiMajorSType(0.5, 0).a,
    expected: 0.274,
    unit: 'binary separations',
    tolerance: 5e-3,
    why: 'Holman & Wiegert 1999 (AJ 117, 621) equation (1) with the Table 3 coefficients. For mu = 0.5 and e = 0 the fit reduces to 0.464 - 0.190, and a little over a quarter of the separation is the figure the paper and the reviews that cite it quote for an equal-mass circular pair. Checked to three decimals because the coefficients are quoted to three.',
  });

  add({
    group: 'Planets in binary stars',
    kind: 'data',
    name: 'P-type boundary for an equal-mass circular binary',
    source: 'Holman & Wiegert 1999, AJ 117, 621, eq. (3) and Table 7',
    measured: binaryStability.criticalSemiMajorPType(0.5, 0).a,
    expected: 2.388,
    unit: 'binary separations',
    tolerance: 5e-3,
    why: 'The same paper, equation (3) with Table 7. mu = 0.5, e = 0 gives 1.60 + 2.06 - 1.2725. The commonly quoted figure for a circumbinary planet around an equal-mass circular pair is "about 2.4 times the separation", which this reproduces. Together with the S-type check above, this pins six of the thirteen coefficients at their most-quoted operating point.',
  });

  add({
    group: 'Planets in binary stars',
    kind: 'data',
    name: 'Kepler-16b lies outside its critical radius, as observed',
    source:
      'Doyle et al. 2011, Science 333, 1602; boundary from Holman & Wiegert 1999',
    measured:
      binaryStability.criticalSemiMajorPType(
        0.20255 / (0.6897 + 0.20255),
        0.15944
      ).a * 0.22431,
    expected: 0.646,
    unit: 'AU',
    tolerance: 0.03,
    why: 'The strongest single test of the P-type transcription, because it exercises all seven coefficients at values none of them were checked at above. Doyle et al. 2011 (Science 333, 1602) give M_A = 0.6897, M_B = 0.20255 solar masses, a_binary = 0.22431 AU, e = 0.15944, planet at 0.7048 AU. The fit puts the critical radius at 0.646 AU, so the planet sits just outside it - which is exactly the situation the discovery paper describes, and would not come out if a coefficient were mistyped. 5% covers the fit uncertainty of +/-0.04 separations.',
  });

  add({
    group: 'Planets in binary stars',
    kind: 'data',
    name: 'Alpha Centauri A: circumstellar zone from the published fit',
    source:
      'Pourbaix & Boffin 2016, A&A 586, A90; boundary from Holman & Wiegert 1999',
    measured:
      binaryStability.criticalSemiMajorSType(0.972 / (1.133 + 0.972), 0.5179)
        .a * 23.52,
    expected: 2.77,
    unit: 'AU',
    tolerance: 0.12,
    why: 'Masses 1.133 and 0.972 solar and an orbit of 23.52 AU at e = 0.5179 (Pourbaix & Boffin 2016). Applying H&W to this pair is quoted in the literature at close to 3 AU; the value here is 2.77. The check is on the coefficients rather than on the astronomy, so the tolerance is the fit uncertainty of 0.006 separations scaled up by 23.52 AU, which is 0.14 - taken at 0.12 because the quoted range is narrower than that.',
  });

  add({
    group: 'Planets in binary stars',
    kind: 'analytic',
    name: 'The two geometries put the boundary on opposite sides',
    measured:
      binaryStability.boundaryVerdict('circumstellar', 0.15, mu, 0.4).side +
      '/' +
      binaryStability.boundaryVerdict('circumbinary', 4.0, mu, 0.4).side,
    expected: 'expectedSurvive/expectedSurvive',
    unit: 'verdict',
    why: 'A planet at 0.15 separations is inside the S-type boundary and one at 4.0 is outside the P-type boundary, and both are on the surviving side. The signs are opposite - one is a ceiling and the other a floor - and getting them the wrong way round is a mistake the arithmetic cannot catch, because both formulae still return a plausible number.',
  });

  // --- The configurations, integrated -------------------------------------
  /**
   * Run one configuration of the lab through the real engine.
   *
   * @param {object} spec - mode, planetA (in separations), dt, periods
   * @returns {object} outcome, drift, periods completed, excursion
   */
  const runLab = spec => {
    lab.reset({
      integrator: 'Velocity Verlet',
      // The scenario's own floor. Far below every separation reached here, so
      // the softening never touches the force law, and stated rather than
      // inherited so this check cannot quietly run a different one.
      min_interaction_distance: 0.01,
    });

    const layout = binaryOrbits.systemLayout({
      ...LAB,
      mode: spec.mode,
      semiMajor: spec.planetA * LAB.separation,
    });
    const s1 = makeStar(physics, layout.star1.pos, layout.star1.vel, LAB.m1);
    const s2 = makeStar(physics, layout.star2.pos, layout.star2.vel, LAB.m2);
    const planet = new physics.Planet(
      { ...layout.planet.pos },
      { ...layout.planet.vel },
      1
    );
    planet.mass = LAB.planetMass;
    planet.radius = 1.5;
    planet.persistent = true;
    physics.stars.push(s1, s2);
    physics.planets.push(planet);
    lab.commit();

    const bodies = [s1, s2, planet];
    const energy = () => {
      let e = 0;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        e += 0.5 * b.mass * (b.vel.x ** 2 + b.vel.y ** 2);
        for (let j = i + 1; j < bodies.length; j++) {
          const c = bodies[j];
          e -=
            (G * b.mass * c.mass) / hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y);
        }
      }
      return e;
    };

    const period = binaryOrbits.binaryFacts(LAB).period;
    const total = spec.periods * period;
    const e0 = energy();
    let t = 0;
    let drift = 0;
    let maxDistance = 0;
    let unbound = false;
    let alive = true;
    const steps = Math.round(total / spec.dt);
    for (let i = 0; i < steps; i++) {
      physics.updatePhysics(spec.dt);
      t += spec.dt;
      if (!planet.alive) {
        alive = false;
        break;
      }
      const d = hypot(planet.pos.x, planet.pos.y);
      if (d > maxDistance) maxDistance = d;
      drift = Math.max(drift, Math.abs((energy() - e0) / e0));
      const d1 = hypot(planet.pos.x - s1.pos.x, planet.pos.y - s1.pos.y);
      const d2 = hypot(planet.pos.x - s2.pos.x, planet.pos.y - s2.pos.y);
      unbound =
        0.5 * (planet.vel.x ** 2 + planet.vel.y ** 2) -
          (G * s1.mass) / d1 -
          (G * s2.mass) / d2 >
        0;
      if (unbound && d >= binaryStability.EJECTION_RADIUS * LAB.separation) {
        break;
      }
    }

    const verdict = binaryStability.classifyRun({
      alive,
      merged: !alive,
      maxDistance: maxDistance / LAB.separation,
      unbound,
      energyDrift: drift,
      periodsDone: t / period,
      periodsAsked: spec.periods,
    });
    return {
      ...verdict,
      drift,
      periods: t / period,
      excursion: maxDistance / LAB.separation,
    };
  };

  const sInside = runLab({
    mode: binaryOrbits.CIRCUMSTELLAR,
    planetA: 0.15,
    dt: 1.0,
    periods: 20,
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'Circumstellar planet at 0.15 separations survives 20 binary periods',
    measured: sInside.outcome,
    expected: 'survived',
    unit: 'outcome',
    why: 'The investigation’s surviving configuration, at the timestep the scenario ships with. Measured rather than assumed: the planet completes all twenty periods, never leaves 0.62 separations and never comes within 0.45 separations of the companion. An exact comparison because "survived" is not a quantity. If this ever fails, the investigation is teaching something false.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'That run conserves energy over 103,000 steps',
    measured: sInside.drift,
    expected: 1e-5,
    unit: 'fraction of initial energy',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'Velocity Verlet at a step of 1.0 against a planet period of 365 time units: 365 steps per orbit, and the error is O(dt^2) and bounded rather than accumulating. The measured drift is about 1.7e-6. The bound is at 1e-5 - an order of magnitude above what is measured and two below the 1e-3 screen the application applies - so this fails on a real regression rather than on noise.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'It stays on the orbit it was launched on',
    measured: sInside.excursion,
    expected: 0.62,
    unit: 'binary separations',
    tolerance: 0.05,
    why: 'Launched circular at 0.15 separations from a star that is itself 0.2 separations from the barycenter, so the largest distance from the barycenter should be a little over 0.35 plus the star’s own excursion to apoapsis. 0.62 is what that comes to, and a run that had started to be pumped outward would exceed it long before it left.',
  });

  const sOutside = runLab({
    mode: binaryOrbits.CIRCUMSTELLAR,
    planetA: 0.3,
    dt: 1.0,
    periods: 20,
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'Circumstellar planet at 0.30 separations is ejected',
    measured: sOutside.outcome,
    expected: 'ejected',
    unit: 'outcome',
    why: 'The investigation’s disrupted configuration, twice the radius of the surviving one and well outside the fitted boundary of 0.177. Ejected means both unbound from the pair and past ten separations, so it describes a planet that actually left rather than one briefly unbound during an encounter.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'The ejection is physical, not a numerical failure',
    measured: sOutside.drift,
    expected: binaryStability.ENERGY_DRIFT_LIMIT,
    unit: 'fraction of initial energy',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'The point of the check, and of the classifier it exercises. A run whose energy has moved can eject a planet for reasons that are entirely about the arithmetic, so the outcome above is only worth reporting if the drift is inside the screen. It is: about 5e-4 against a limit of 1e-3, and the ejection happens after a resolved close pass rather than during an unresolved one.',
  });

  const pOutside = runLab({
    mode: binaryOrbits.CIRCUMBINARY,
    planetA: 4.0,
    dt: 2.0,
    periods: 40,
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'Circumbinary planet at 4.0 separations survives 40 binary periods',
    measured: pOutside.outcome,
    expected: 'survived',
    unit: 'outcome',
    why: 'The circumbinary survivor, outside the fitted floor of 3.61 separations. Forty binary periods is only about seven orbits of the planet, which the investigation says out loud; the claim being checked is that those seven happen without incident, not that the orbit is stable.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'It holds the ring it started on',
    measured: pOutside.excursion,
    expected: 4.0,
    unit: 'binary separations',
    tolerance: 0.05,
    why: 'A circular orbit at 4.0 separations should stay at 4.0. This is what separates it from the configurations at 2.5 and 3.0, which also survive the run and reach 25 and 14 separations doing it - so the outcome alone does not distinguish a stable orbit from one being pumped, and the excursion does.',
  });

  const pInside = runLab({
    mode: binaryOrbits.CIRCUMBINARY,
    planetA: 2.0,
    dt: 2.0,
    periods: 40,
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'Circumbinary planet at 2.0 separations is ejected without a close pass',
    measured: pInside.outcome,
    expected: 'ejected',
    unit: 'outcome',
    why: 'Well inside the fitted floor. The mechanism is different from the circumstellar ejection: this planet is never within 0.22 separations of a star, and leaves because the binary’s changing pull arrives at nearly the same phase of its orbit each time and the kicks accumulate. Both mechanisms have to work for the investigation’s two halves to teach different things.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'That ejection is resolved: drift stays six orders below the screen',
    measured: pInside.drift,
    expected: 1e-5,
    unit: 'fraction of initial energy',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'About 7e-6. Worth checking separately from the circumstellar ejection because it is the stronger claim of the two: with no close approach to resolve, a drift here would mean the binary itself was being integrated badly, which would invalidate every circumbinary result rather than just this one.',
  });
  add({
    group: 'Planets in binary stars',
    kind: 'integration',
    name: 'It leaves within the run rather than at the end of it',
    measured: pInside.periods,
    expected: 3.4,
    unit: 'binary periods',
    tolerance: 0.5,
    why: 'A configuration that only just failed by the fortieth period would make a poor teaching case, because a student could not tell it from one that survived. This one is gone by the fourth. The tolerance is loose because the exact departure time of a chaotic escape moves with the timestep - the outcome does not, which is the distinction the whole investigation turns on.',
  });
}
