// ===========================================================================
// 15. Orbital resonance
// ---------------------------------------------------------------------------
// The When Orbits Lock investigation asks a student to conclude that three
// systems are resonant and two others are not, on the strength of what an
// angle does over a few minutes of watching. That conclusion is only worth
// anything if the angle is doing what the physics says rather than what the
// integrator says, so these checks measure the same quantities the lesson
// does, from the same parameter tables, and hold them to published values.
//
// Everything here reads js/resonance/systems.js, which is what the scenarios
// in js/ui.js are built from. There is no second copy of a moon's period.
//
// Three sorts of check:
//
//   the resonance is reproduced   libration centers, amplitudes and periods
//                                 against Lieske, Williams & Benson and the
//                                 linearised tadpole formula
//   the controls behave           the detuned moons and the non-resonant
//                                 bodies circulate, and the unstable
//                                 equilibrium departs
//   it is physics, not arithmetic conservation, no contacts, and the
//                                 classification unchanged under refinement
// ===========================================================================

import { REF, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, resonance, systems, add, lab }) {
  const G = 2;

  /**
   * Install a system from js/resonance/systems.js into the engine.
   * @param {object} spec - {primary, bodies}
   * @param {object} settings - Overrides, chiefly the softening floor
   * @returns {Map<string, object>} The live bodies, by name
   */
  const install = (spec, settings) => {
    lab.reset({
      gravitational_constant: G,
      mutual_gravity: true,
      star_only_gravity: false,
      enable_star_merging: false,
      dynamic_object_properties: false,
      integrator: 'Velocity Verlet',
      show_trails: false,
      ...settings,
    });
    physics.resetSimulationTime();
    const made = new Map();
    for (const d of [spec.primary, ...spec.bodies]) {
      let body;
      if (d.kind === 'star') {
        body = new physics.StarObject(
          { ...d.pos },
          { ...d.vel },
          d.mass / 1000
        );
        body.intact = true;
        physics.stars.push(body);
      } else if (d.kind === 'gasGiant') {
        body = new physics.GasGiant({ ...d.pos }, { ...d.vel }, 1);
        physics.gas_giants.push(body);
      } else {
        body = new physics.Planet({ ...d.pos }, { ...d.vel }, 1);
        physics.planets.push(body);
      }
      body.mass = d.mass;
      body.name = d.name;
      body.radius = d.radius;
      body.persistent = true;
      made.set(d.name, body);
    }
    lab.commit();
    return made;
  };

  /**
   * Run and sample. Returns the elements of every body at every sample, plus
   * the conservation drift and the closest approach between any two bodies.
   */
  const integrate = (made, primaryName, { dt, total, every }) => {
    const before = physics.conservedQuantities();
    const names = [...made.keys()].filter(n => n !== primaryName);
    const primary = made.get(primaryName);
    const rows = [];
    const closest = new Map();
    const steps = Math.round(total / dt);
    const stride = Math.max(1, Math.round(every / dt));
    let contacts = 0;
    for (let i = 0; i < steps; i++) {
      physics.updatePhysics(dt);
      if (i % stride) continue;
      const el = {};
      for (const n of names) {
        const e = resonance.resonanceElements(made.get(n), primary, G);
        if (e) el[n] = e;
      }
      rows.push({ t: physics.getSimulationTime(), el });
      const all = [primaryName, ...names];
      for (let a = 0; a < all.length; a++) {
        for (let b = a + 1; b < all.length; b++) {
          const A = made.get(all[a]);
          const B = made.get(all[b]);
          const d = hypot(A.pos.x - B.pos.x, A.pos.y - B.pos.y);
          const key = `${all[a]}|${all[b]}`;
          if (!closest.has(key) || d < closest.get(key)) closest.set(key, d);
          if (d < A.radius + B.radius) contacts++;
        }
      }
    }
    const after = physics.conservedQuantities();
    return {
      rows,
      closest,
      contacts,
      survivors: physics.planets.length + physics.gas_giants.length,
      energyDrift: Math.abs((after.energy - before.energy) / before.energy),
      angularDrift: Math.abs((after.angular - before.angular) / before.angular),
    };
  };

  /** Mean measured period of a body over the whole record. */
  const meanPeriod = (rows, name) => {
    let sum = 0;
    let n = 0;
    for (const r of rows) {
      const p = r.el[name]?.period;
      if (Number.isFinite(p) && p > 0) {
        sum += p;
        n++;
      }
    }
    return n ? sum / n : NaN;
  };

  const synodic = (a, b) => Math.abs(1 / (1 / a - 1 / b));

  // --- The Galilean moons ------------------------------------------------
  //
  // Run to 1,400 Io orbits, which is a little over one Laplace libration.
  // A step of 1.0 is 680 substeps per Io orbit, and the refinement check
  // below shows the answer is converged there.
  const galileanRun = ({ dt = 1, detune = 1, orbits = 1400 } = {}) => {
    const spec = systems.galileanBodies(G, { detune });
    systems.balance([spec.primary, ...spec.bodies]);
    const made = install(spec, { min_interaction_distance: 0.05 });
    const run = integrate(made, 'Jupiter', {
      dt,
      total: orbits * spec.periodIo,
      every: 0.1 * spec.periodIo,
    });
    const pIo = meanPeriod(run.rows, 'Io');
    const pEu = meanPeriod(run.rows, 'Europa');
    const laplace = run.rows.map(r => ({
      t: r.t,
      phi: resonance.laplaceArgument(
        r.el.Io?.lambda,
        r.el.Europa?.lambda,
        r.el.Ganymede?.lambda
      ),
    }));
    return {
      ...run,
      spec,
      periodIo: pIo,
      verdict: resonance.classifyAngle(laplace, {
        referencePeriod: synodic(pIo, pEu),
      }),
    };
  };

  const galilean = galileanRun();

  // 1. The period ratios are the published ones.
  {
    const pairs = [
      ['Europa', 'Io', systems.GALILEAN.published.ratioEuropaIo],
      ['Ganymede', 'Europa', systems.GALILEAN.published.ratioGanymedeEuropa],
      ['Ganymede', 'Io', systems.GALILEAN.published.ratioGanymedeIo],
      ['Callisto', 'Ganymede', REF.ganymedeCallistoRatio],
    ];
    for (const [outer, inner, expected] of pairs) {
      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: `${outer} over ${inner} matches the published period ratio`,
        measured:
          meanPeriod(galilean.rows, outer) / meanPeriod(galilean.rows, inner),
        expected,
        tolerance: 1e-3,
        why: "The moons are placed from their published periods, so a ratio that came out wrong would mean the mutual perturbations had moved a mean motion rather than that the table was misread. A tenth of a percent is well inside the two-tenths the resonance itself permits, and is the width of the investigation's own claim that the ratios are near but not equal to 2:1.",
        source: 'JPL Solar System Dynamics satellite mean elements',
      });
    }
  }

  // 2. The Laplace argument librates about 180 degrees.
  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The Laplace argument librates rather than circulating',
    measured: galilean.verdict.state === resonance.ANGLE_STATE.LIBRATION,
    expected: true,
    why: 'The claim the whole investigation turns on. Over 1,400 Io orbits the argument must be seen to turn back and return, which is the only evidence that separates a resonance from a near-commensurate pair. A run of 300 orbits is deliberately not enough and the classifier says so; this one is.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The Laplace libration is centered on 180 degrees',
    measured: galilean.verdict.center,
    expected: REF.laplaceCenterDeg,
    unit: 'degrees',
    tolerance: 3,
    toleranceKind: 'absolute',
    why: 'Exactly 180 is the analytic value, and it is what makes the three moons unable to meet. Three degrees is the width of the numerical wobble at this step; anything larger would mean the equilibrium had moved, which is a different system.',
    source: 'Murray & Dermott, Solar System Dynamics (1999) §8.9',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The Laplace libration period matches the observed one',
    measured: systems.simSecondsToDays(
      galilean.verdict.period,
      systems.TIME_SCALE_JOVIAN
    ),
    expected: REF.laplacePeriodDays,
    unit: 'days',
    tolerance: 0.08,
    why: 'The strongest single result in this group: a libration period computed by the engine from published orbital elements, against one measured from the real moons. Eight percent covers the finite-amplitude correction - this model librates at 26 degrees where the real system librates at 0.064, and the period of a pendulum grows with amplitude - plus the couple of percent the timestep contributes.',
    source:
      'Lieske (1998) A&AS 129, 205; Musotto et al. (2002) Icarus 159, 500',
  });

  // 3. Conservation, and nothing touching anything.
  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Energy is conserved across the Galilean run',
    measured: galilean.energyDrift,
    expected: 0,
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'Velocity Verlet is symplectic, so the energy error over 950,000 steps is bounded rather than accumulating. A part in a million is two orders of magnitude below the fractional change that would move the measured libration period by its own tolerance.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Angular momentum is conserved across the Galilean run',
    measured: galilean.angularDrift,
    expected: 0,
    tolerance: 1e-11,
    toleranceKind: 'absolute',
    why: 'Angular momentum is exact for a central-force integrator up to rounding, so this is a floating-point bound rather than a physical one. It is here because a body silently removed or added mid-run would break it long before it broke the energy.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'No two Galilean bodies ever touch',
    measured: galilean.contacts,
    expected: 0,
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'The moons are drawn twenty times life size so they can be seen at all, and js/physics.js runs a contact test on planets that separates an overlapping pair, exchanges momentum between them and above 15 units per second of relative speed makes debris with Math.random(). One contact would destroy both the orbit and the reproducibility. The margin is a factor of three on every pair, and this is the check that says the enlargement stayed cosmetic.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'All four moons survive the Galilean run',
    measured: galilean.survivors,
    expected: 4,
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'Every measurement in the investigation matches bodies between samples by name, so a body removed by a merge or a cull would not produce a wrong answer - it would produce no answer, silently, part way through.',
  });

  // 4. Refinement: the classification must not be the integrator's.
  {
    const fine = galileanRun({ dt: 0.5 });
    const coarse = galileanRun({ dt: 2 });
    const period = v =>
      systems.simSecondsToDays(v.period, systems.TIME_SCALE_JOVIAN);

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The Laplace verdict survives halving the timestep',
      measured:
        fine.verdict.state === galilean.verdict.state &&
        coarse.verdict.state === galilean.verdict.state,
      expected: true,
      why: 'Qualitative agreement first: a conclusion that changed from libration to circulation when the step changed would be a statement about the integrator. Steps of 2, 1 and 0.5 all report libration.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The Laplace libration period survives halving the timestep',
      measured: Math.abs(period(fine.verdict) - period(galilean.verdict)),
      expected: 0,
      unit: 'days',
      tolerance: 120,
      toleranceKind: 'absolute',
      why: 'Quantitative agreement second, and to a looser bound: 120 days is six percent of the period, which is smaller than the eight percent the published comparison is allowed and therefore cannot be what makes that check pass. Symplectic Euler at the same step gets this wrong by a factor of four, which is why these scenarios do not use it.',
    });
  }

  // 5. The control: one percent out and the lock is gone.
  {
    const broken = galileanRun({
      detune: systems.GALILEAN.detune,
      orbits: 300,
    });
    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Moving Europa one percent out makes the argument circulate',
      measured: broken.verdict.state === resonance.ANGLE_STATE.CIRCULATION,
      expected: true,
      why: 'The paired control the investigation runs. Without it a librating angle could be an artifact of the instrument; with it, the same instrument on the same system with one number changed reports the opposite. The resonance holds Europa to about a part in a thousand, so one part in a hundred is ten times outside it.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The broken resonance circulates fast enough to watch',
      measured: broken.verdict.period / broken.periodIo,
      expected: 47,
      unit: 'Io orbits',
      tolerance: 0.25,
      why: 'An investigation claim rather than a physical constant: the contrast is only useful if the student sees a completed circuit in the first few seconds. Forty-seven Io orbits is about nine seconds at the scenario speed. The tolerance is wide because the number is a property of how far out of resonance the control was put, which was a choice.',
    });
  }

  // --- Pluto and Neptune --------------------------------------------------
  const plutoRun = ({ dt = 60, cycles = 3 } = {}) => {
    const spec = systems.plutoBodies(G);
    systems.balance([spec.primary, ...spec.bodies]);
    const made = install(spec, { min_interaction_distance: 1 });
    const pN = 2 * Math.PI * Math.sqrt(spec.semiMajorNeptune ** 3 / (G * 1000));
    const run = integrate(made, 'Sun', {
      dt,
      total: cycles * 119 * pN,
      every: 0.05 * pN,
    });
    const periodN = meanPeriod(run.rows, 'Neptune');
    const periodP = meanPeriod(run.rows, 'Pluto');
    const ref = synodic(periodN, periodP);
    const argument = name =>
      run.rows.map(r => ({
        t: r.t,
        phi: resonance.plutoArgument(
          r.el[name]?.lambda,
          r.el.Neptune?.lambda,
          r.el[name]?.varpi
        ),
      }));
    // Where Pluto sits on its own orbit at each conjunction. A true anomaly
    // of 180 degrees is aphelion, which is the protection mechanism.
    const events = resonance.conjunctions(
      run.rows.map(r => ({
        t: r.t,
        inner: r.el.Neptune?.lambda,
        outer: r.el.Pluto?.lambda,
      }))
    );
    const anomalies = [];
    let cursor = 0;
    for (const e of events) {
      while (cursor < run.rows.length - 1 && run.rows[cursor + 1].t <= e.t)
        cursor++;
      const f = run.rows[cursor]?.el.Pluto?.trueAnomaly;
      if (Number.isFinite(f)) anomalies.push({ longitude: f });
    }
    return {
      ...run,
      periodN,
      periodP,
      verdict: resonance.classifyAngle(argument('Pluto'), {
        referencePeriod: ref,
      }),
      rogue: resonance.classifyAngle(argument('Unbound Wanderer'), {
        referencePeriod: ref,
      }),
      atConjunction: resonance.conjunctionCluster(anomalies),
    };
  };

  const pluto = plutoRun();

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The integrated periods hold the 3:2',
    measured: pluto.periodP / pluto.periodN,
    expected: 1.5,
    tolerance: 2e-3,
    why: "Both periods are the mean osculating period over the whole run, so this is the engine holding Kepler's third law on a commensurability nothing told it about - not a stored ratio. Pluto is placed at a_Neptune (3/2)^(2/3) rather than at its observed 39.482 AU, because the 0.2% difference between the two is taken up in the real system by the precession of Pluto's perihelion, which a point-mass model does not reproduce at the right rate. That the placement itself is exact is a separate claim and is checked to ten decimal places in tests/resonance.test.js; what this measures is that three libration cycles of mutual perturbation at dt = 60 leave the ratio where it started. The residual is 2e-4 and is the Neptune-Pluto interaction plus the osculating-element average rather than the placement; 2e-3 is ten times that, and still an order of magnitude inside the drift a Pluto falling out of the commensurability would show. No source, deliberately: the expected 1.5 is the exact commensurability the scenario is built on, not a measurement of the solar system, and leaving 'NASA planetary fact sheets' on the row - as the first draft of this fix did - would have said this project compared itself against a published period ratio when it did not. The comparison with the observed 1.5046 belongs to the investigation.",
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: "Pluto's 3:2 argument librates",
    measured: pluto.verdict.state === resonance.ANGLE_STATE.LIBRATION,
    expected: true,
    why: 'Cohen and Hubbard found this in 1965 by integrating the orbit forward, and it is the reason a body whose orbit crosses Neptune has survived for the age of the Solar System.',
    source: 'Cohen & Hubbard (1965) AJ 70, 10',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: "Pluto's libration is centered on 180 degrees",
    measured: pluto.verdict.center,
    expected: REF.plutoCenterDeg,
    unit: 'degrees',
    tolerance: 2,
    toleranceKind: 'absolute',
    why: "One line of algebra makes this the whole protection mechanism: at a conjunction the two mean longitudes cancel and the argument becomes the conjunction longitude minus Pluto's perihelion, so a center of 180 degrees says every conjunction happens at aphelion.",
    source: 'Williams & Benson (1971) AJ 76, 167',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: "Pluto's libration amplitude matches the observed one",
    measured: pluto.verdict.amplitude,
    expected: REF.plutoLibrationAmplitudeDeg,
    unit: 'degrees',
    tolerance: 0.06,
    why: 'The amplitude is set by the starting offset, which was chosen as 80 degrees from the center to reproduce the observed libration; this checks that the planar model then holds it there rather than drifting off it over three full cycles. Six percent is the spread across the timesteps tried.',
    source: 'Williams & Benson (1971) AJ 76, 167',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: "Pluto's libration period matches the observed one",
    measured: systems.simSecondsToYears(pluto.verdict.period),
    expected: REF.plutoLibrationYears,
    unit: 'years',
    tolerance: 0.03,
    why: "A twenty-thousand-year period recovered from published orbital elements by an engine that knows nothing about the resonance. Three percent covers the planar approximation - the real libration is coupled to Pluto's 17 degree inclination, which this model projects away - and leaves no room for a timestep artifact.",
    source: 'Williams & Benson (1971) AJ 76, 167; Malhotra & Williams (1997)',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Every Pluto-Neptune conjunction happens near Pluto’s aphelion',
    // conjunctionCluster returns null when the run produced no conjunctions
    // at all. That is a degenerate result rather than an impossible one - a
    // Pluto that has left the resonance may never line up with Neptune
    // inside the window - and reaching through it took the whole 243-check
    // suite down with a TypeError instead of failing this one row. NaN is
    // scored as a failure with a note, which is what a missing measurement
    // is.
    measured: pluto.atConjunction ? pluto.atConjunction.mean : NaN,
    expected: 180,
    unit: 'degrees of true anomaly',
    tolerance: 10,
    toleranceKind: 'absolute',
    why: 'The consequence of the libration, measured independently of it: over a hundred and twenty conjunctions, the mean position of Pluto on its own orbit at the moment of line-up. A true anomaly of 180 degrees is aphelion, 49 AU out. The check is deliberately of the conjunctions rather than of the angle, because a student is asked to read this off a different instrument. No conjunctions at all is a failure of this check rather than of the suite.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Pluto never comes close to Neptune',
    measured: pluto.closest.get('Neptune|Pluto') / 100,
    expected: REF.plutoNeptuneMinimumAU,
    unit: 'AU',
    tolerance: 0.12,
    why: "The observed minimum separation is 17.2 AU. This model gives about 16.6, and the difference is the inclination: Pluto's orbit is tilted 17 degrees and Gravitas is two-dimensional, so the projection removes the vertical separation that keeps the real minimum higher. Twelve percent bounds that projection error; the check exists to catch a Pluto that wandered out of the resonance, which would bring the figure down by a factor of three.",
    source: 'Cohen & Hubbard (1965) AJ 70, 10',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The unprotected body on the same orbit does come close',
    measured: pluto.closest.get('Neptune|Unbound Wanderer') / 100 < 8,
    expected: true,
    why: 'The control for the check above. A body four percent further out - same eccentricity, same perihelion direction, outside the resonance - passes within about 5 AU of Neptune and has its orbit changed. Without it, "Pluto stays 17 AU away" could just be a fact about crossing orbits rather than about the resonance.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: "The unprotected body's argument circulates",
    measured: pluto.rogue.state === resonance.ANGLE_STATE.CIRCULATION,
    expected: true,
    why: 'And it circulates while Pluto librates, in the same run, under the same integrator, measured by the same code. That is what makes the libration a property of the resonance rather than of the instrument.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Energy is conserved across the Pluto run',
    measured: pluto.energyDrift,
    expected: 0,
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'Sixty thousand years of integration at 390 steps per Neptune orbit. The bound is the same as for the moons because the same integrator is doing the same job; the run is longer and the eccentricity higher, and it still holds.',
  });

  {
    const fine = plutoRun({ dt: 30, cycles: 1.6 });
    const coarse = plutoRun({ dt: 120, cycles: 1.6 });
    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "Pluto's libration period survives quartering the timestep",
      measured:
        Math.abs(
          systems.simSecondsToYears(fine.verdict.period) -
            systems.simSecondsToYears(coarse.verdict.period)
        ) / systems.simSecondsToYears(fine.verdict.period),
      expected: 0,
      tolerance: 0.01,
      toleranceKind: 'absolute',
      why: 'Steps of 120, 60 and 30 simulated seconds - 195, 390 and 780 per Neptune orbit - agree on the libration period to under one percent, which is well inside the three percent the published comparison allows. The scenario runs at 60.',
    });
  }

  // --- Jupiter's Trojans ---------------------------------------------------
  const trojanRun = ({ dt = 4, orbits = 40 } = {}) => {
    const spec = systems.trojanBodies(G);
    const made = install(spec, { min_interaction_distance: 0.5 });
    const run = integrate(made, 'Sun', {
      dt,
      total: orbits * spec.period,
      every: 0.04 * spec.period,
    });
    const sun = made.get('Sun');
    const jupiter = made.get('Jupiter');
    const classify = name =>
      resonance.classifyAngle(
        run.rows.map(r => {
          const e = r.el[name];
          const j = r.el.Jupiter;
          return {
            t: r.t,
            phi:
              e && j
                ? resonance.wrap360(e.trueLongitude - j.trueLongitude)
                : NaN,
          };
        }),
        { referencePeriod: spec.period }
      );
    return { ...run, spec, sun, jupiter, classify };
  };

  const trojans = trojanRun();

  add({
    group: 'Orbital resonance',
    kind: 'analytic',
    name: 'Gascheau’s criterion is satisfied for the Sun and Jupiter',
    measured: (1 - trojans.spec.massRatio) / trojans.spec.massRatio,
    expected: 1047.3486,
    tolerance: 1e-6,
    why: 'The triangular points are stable when the primary exceeds 24.96 times the secondary, which Gascheau proved in 1843. The Sun is 1,047 times Jupiter, so they are, and every check below depends on it. If this ratio were under 25 the Trojans would not exist and the scenario would be showing something else.',
    source: 'Gascheau (1843); Routh (1875)',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'A body placed exactly at L4 stays there',
    measured: trojans.classify('L4 probe').span,
    expected: 0,
    unit: 'degrees',
    tolerance: 0.25,
    toleranceKind: 'absolute',
    why: "Lagrange's 1772 result, as a measurement: at the far vertex of an equilateral triangle with the Sun and Jupiter, the net force is exactly the centripetal one the body needs, so it does not move in the rotating frame at all. A quarter of a degree over forty Jupiter years is the numerical floor, and it is also the threshold the classifier uses to call an angle stationary rather than slowly librating.",
    source: 'Lagrange (1772)',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Patroclus librates about L5 rather than about anything else',
    measured: resonance.wrap180(trojans.classify('Patroclus').center + 60),
    expected: 0,
    unit: 'degrees from L5',
    tolerance: 8,
    toleranceKind: 'absolute',
    why: 'L5 is 60 degrees behind Jupiter, so a libration center of -60 is the whole claim. It is not exactly -60: a finite-amplitude tadpole is not symmetric about the point it encircles, and the center of a 24 degree libration sits a few degrees inside it. Eight degrees bounds that asymmetry.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The tadpole period matches the linearised prediction',
    measured: trojans.classify('Patroclus').period / trojans.spec.period,
    expected: REF.tadpolePeriodJupiterYears,
    unit: 'Jupiter years',
    tolerance: 0.07,
    why: 'The small-amplitude formula is P / sqrt(27 mu / 4) from the linearised restricted three-body problem, which gives 12.47 Jupiter years. This libration has an amplitude of 24 degrees, which is not small, and a finite-amplitude libration is slower than the linear one - seven percent covers that, and the L4 probe above confirms the linear limit separately.',
    source: 'Murray & Dermott, Solar System Dynamics (1999) §3.9',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'A probe one degree from L3 does not stay there',
    measured: trojans.classify('L3 probe').span > 100,
    expected: true,
    why: "L3 is an equilibrium and an unstable one: the linearised growth time is about 3.2 Jupiter years, so a one degree displacement reaches a hundred and eighty in roughly twenty-five. The contrast with the L4 probe - identical construction, identical integrator, one of them motionless and the other gone - is what the investigation uses to separate 'equilibrium' from 'stable'.",
    source: 'Murray & Dermott, Solar System Dynamics (1999) §3.8',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'The wide probe is not co-orbital and circulates',
    measured:
      trojans.classify('Wide orbit probe').state ===
      resonance.ANGLE_STATE.CIRCULATION,
    expected: true,
    why: "A body on an ordinary circular orbit a quarter again as wide. Its period ratio with Jupiter is 1.4036, which is a quarter of a percent from 7:5 - closer to a small-integer ratio than Pluto is to 3:2 - and it is in no resonance at all. It is the investigation's sharpest example of why the ratio is not the evidence.",
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'No two Trojan bodies ever touch',
    measured: trojans.contacts,
    expected: 0,
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'The tightest geometric constraint in the three scenarios. The L3 probe leaves its equilibrium into a horseshoe that carries it past both triangular points at nearly the same distance from the Sun, and the closest it comes to Patroclus is about twenty length units. The probes are drawn at four, so the margin is two and a half - which is why they are not drawn larger.',
  });

  add({
    group: 'Orbital resonance',
    kind: 'integration',
    name: 'Energy is conserved across the Trojan run',
    measured: trojans.energyDrift,
    expected: 0,
    tolerance: 1e-7,
    toleranceKind: 'absolute',
    why: 'Tighter than the other two because the geometry is easier: near-circular orbits, no close approaches, and 420 substeps per Jupiter orbit.',
  });

  {
    const fine = trojanRun({ dt: 2 });
    const coarse = trojanRun({ dt: 8 });
    const same = name =>
      fine.classify(name).state === trojans.classify(name).state &&
      coarse.classify(name).state === trojans.classify(name).state;
    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Every Trojan classification survives a factor of four in timestep',
      measured: ['L4 probe', 'Patroclus', 'Wide orbit probe'].every(same),
      expected: true,
      why: 'The equilibrium stays an equilibrium, the tadpole stays a tadpole and the wide probe keeps circulating at steps of 2, 4 and 8. The L3 probe is deliberately excluded: it is exponentially unstable by construction, so where it has got to after forty Jupiter years is genuinely timestep-dependent, and the check above asks only that it has left.',
    });
  }
}
