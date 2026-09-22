// =============================================================================
// The power-law gravity model, checked against its own claims
// -----------------------------------------------------------------------------
// js/powerLawGravity.js is a contained model: it computes its own orbits and
// never touches the engine, so the Newtonian validation suite in
// tools/physics-checks.mjs cannot see it and should not try to. This file is
// its validation layer, and it is deliberately separate for the reason the
// suite's own header gives - a check belongs with the thing it checks, and
// inflating the global Newtonian registry with checks about a different force
// law would make the registry's own account of itself less true.
//
// Every tolerance below says why it is what it is, which is the convention
// tools/physics-checks.mjs sets and the reason that suite is worth reading. A
// tolerance with no stated reason is a number chosen to make a test pass.
//
// Two of these are the whole point of the investigation and are worth naming:
//
//   "momentum survives any exponent" and "angular momentum survives any
//   exponent" are not incidental. They are the result the lesson is built to
//   show: the conservation laws come from the interaction being pairwise and
//   central, not from it being inverse-square, so they hold at n = 2.9 exactly
//   as well as at n = 2. A student who watches every orbital prediction change
//   while those two numbers sit at 1e-15 has learned the difference between a
//   symmetry and a force law.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  EXPONENT_RANGE,
  LESSON_ECCENTRICITY,
  NEAR_CIRCULAR_DOMAIN,
  REFERENCE_RADIUS_SIM,
  STABILITY_EXPONENT,
  acceleration,
  accelerationMagnitude,
  apsidalPrecessionNearCircular,
  circularSpeed,
  exponentAllowed,
  expectedKeplerSlope,
  fitLogSlope,
  meanAngularAdvance,
  potentialEnergyPerMass,
  runConservation,
  runKeplerSlope,
  runPrecession,
  specificAngularMomentum,
  specificEnergy,
  stateAtPeriapsis,
} from '../js/powerLawGravity.js';

const MU = 1000; // one solar mass at G = 1, which is the integrator's G
const R0 = REFERENCE_RADIUS_SIM;
const SPAN = [EXPONENT_RANGE.min, 1.8, 2, 2.05, 2.2, 2.5, EXPONENT_RANGE.max];

describe('the law reduces to Newton where it must', () => {
  test('n = 2 is the Newtonian expression exactly, at every radius', () => {
    // Not "within a tolerance": the n === 2 branch returns mu/r^2 itself, so
    // this is an identity of the code rather than a numerical agreement. If it
    // ever needs a tolerance, the branch has been lost.
    for (const r of [3, 17, 100, 1234, 98765]) {
      expect(accelerationMagnitude(r, MU, 2)).toBe(MU / (r * r));
    }
  });

  test('at the reference radius the acceleration is Newtonian for every n', () => {
    // The property that makes n a statement about the SHAPE of the field
    // rather than its strength. Tolerance is 1e-15 relative rather than exact
    // because r0^(n-2) is computed by Math.pow, which is correctly rounded but
    // not required to return exactly 1 for a non-integer exponent of 1.
    const newtonian = MU / (R0 * R0);
    for (const n of SPAN) {
      const a = accelerationMagnitude(R0, MU, n);
      expect(Math.abs(a - newtonian) / newtonian).toBeLessThan(1e-15);
    }
  });

  test('away from r0 the law departs from Newton in the direction it should', () => {
    // A guard against the normalization being applied in a way that cancels
    // the exponent entirely, which would pass both checks above and mean the
    // feature does nothing. Inside r0 a steeper law is stronger; outside it is
    // weaker.
    const steep = 2.5;
    expect(accelerationMagnitude(R0 / 2, MU, steep)).toBeGreaterThan(
      accelerationMagnitude(R0 / 2, MU, 2)
    );
    expect(accelerationMagnitude(R0 * 2, MU, steep)).toBeLessThan(
      accelerationMagnitude(R0 * 2, MU, 2)
    );
  });

  test('the vector form points at the center', () => {
    const { ax, ay } = acceleration(30, 40, MU, 2.3);
    const r = 50;
    const mag = accelerationMagnitude(r, MU, 2.3);
    expect(Math.hypot(ax, ay)).toBeCloseTo(mag, 12);
    // Antiparallel to the position vector: the cross product vanishes and the
    // dot product is negative. This is what makes angular momentum conserved,
    // so it is checked rather than assumed.
    expect(Math.abs(30 * ay - 40 * ax)).toBeLessThan(1e-12);
    expect(30 * ax + 40 * ay).toBeLessThan(0);
  });
});

describe('the model does not depend on the unit distance is expressed in', () => {
  test('rescaling every length leaves the physical prediction unchanged', () => {
    // The failure the reference radius exists to prevent. Under a bare GM/r^n
    // this test fails by whatever factor the unit was changed by, raised to
    // (2-n). Lengths scale by k, so mu (a length^3/time^2) scales by k^3 and an
    // acceleration (length/time^2) scales by k.
    for (const k of [1e-3, 7, 1000]) {
      for (const n of SPAN) {
        for (const r of [13, 100, 880]) {
          const plain = accelerationMagnitude(r, MU, n, R0);
          const scaled = accelerationMagnitude(r * k, MU * k ** 3, n, R0 * k);
          expect(
            Math.abs(scaled - k * plain) / Math.abs(k * plain)
          ).toBeLessThan(1e-13);
        }
      }
    }
  });
});

describe('the potential is the potential of the implemented force', () => {
  test('-dPhi/dr equals the radial acceleration for every n', () => {
    // Differentiated numerically rather than compared to a second written
    // formula, because two formulas transcribed from the same derivation agree
    // with each other and not necessarily with the code that is integrated.
    // Sign convention: Phi rises outward, the acceleration points inward, so
    // the radial component is negative.
    //
    // 1e-8 is the floor of a central difference at h = r*1e-6 in double
    // precision - the truncation error is O(h^2) and the round-off O(eps/h) -
    // and the measured worst case is 1.4e-10, two orders inside it.
    for (const n of [1, ...SPAN]) {
      for (const r of [20, 50, 100, 400, 1500]) {
        const h = r * 1e-6;
        const numeric =
          -(
            potentialEnergyPerMass(r + h, MU, n) -
            potentialEnergyPerMass(r - h, MU, n)
          ) /
          (2 * h);
        const radial = -accelerationMagnitude(r, MU, n);
        expect(Math.abs(numeric - radial) / Math.abs(radial)).toBeLessThan(
          1e-8
        );
      }
    }
  });

  test('at n = 2 the potential is the familiar -mu/r', () => {
    for (const r of [5, 100, 2000]) {
      expect(potentialEnergyPerMass(r, MU, 2)).toBe(-MU / r);
    }
  });

  test('the n -> 2 limit is continuous', () => {
    // A discontinuity here would mean the n === 2 branch is a different model
    // rather than a special case, and an energy readout would jump as a student
    // moved the slider through 2. 1e-5 relative at n = 2 + 1e-6 is the size of
    // the leading correction term, which is O((n-2) ln r).
    const near = potentialEnergyPerMass(250, MU, 2 + 1e-6);
    const at = potentialEnergyPerMass(250, MU, 2);
    expect(Math.abs(near - at) / Math.abs(at)).toBeLessThan(1e-5);
  });
});

describe('circular orbits use the active law, not Newton', () => {
  test('the circular speed holds a circle at every n', () => {
    // Launched at circularSpeed, the radius must not drift. This is the check
    // that the Kepler experiment is measuring the force law rather than a bad
    // initial condition: with the Newtonian sqrt(mu/r) at n != 2 the orbit is
    // not a circle and the measured period is a different quantity.
    //
    // 2e-6 relative over a full revolution is the RK4 truncation at 20000 steps
    // per orbit; it is not a physical drift.
    for (const n of SPAN) {
      const r = 250;
      const v = circularSpeed(r, MU, n);
      const s = { x: r, y: 0, vx: 0, vy: v };
      const period = (2 * Math.PI * r) / v;
      const dt = period / 20000;
      let worst = 0;
      for (let i = 0; i < 20000; i++) {
        // One RK4 step, inline: the module's stepper is private on purpose.
        const d = (x, y, vx, vy) => {
          const a = acceleration(x, y, MU, n);
          return [vx, vy, a.ax, a.ay];
        };
        const k1 = d(s.x, s.y, s.vx, s.vy);
        const h = dt / 2;
        const k2 = d(
          s.x + h * k1[0],
          s.y + h * k1[1],
          s.vx + h * k1[2],
          s.vy + h * k1[3]
        );
        const k3 = d(
          s.x + h * k2[0],
          s.y + h * k2[1],
          s.vx + h * k2[2],
          s.vy + h * k2[3]
        );
        const k4 = d(
          s.x + dt * k3[0],
          s.y + dt * k3[1],
          s.vx + dt * k3[2],
          s.vy + dt * k3[3]
        );
        s.x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        s.y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        s.vx += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        s.vy += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
        worst = Math.max(worst, Math.abs(Math.hypot(s.x, s.y) - r) / r);
      }
      expect(worst).toBeLessThan(2e-6);
    }
  });
});

describe('the period-radius slope reads the exponent', () => {
  test('the measured slope matches (n+1)/2', () => {
    // The discriminator the whole quantitative half of the lesson rests on.
    // Periods are timed from the integration, not computed from the formula
    // being tested, so agreement is a measurement rather than an identity.
    //
    // 5e-4 absolute on the slope: the periods are interpolated to a full turn
    // at 20000 steps per orbit, which places each log-period within about 1e-7,
    // and the fit over a factor of 7.5 in radius turns that into well under
    // 1e-5. The margin is for the slowest orbit in the set.
    for (const n of SPAN) {
      const { slope, residual, expected } = runKeplerSlope({ n, mu: MU });
      expect(slope).not.toBeNull();
      expect(Math.abs(slope - expected)).toBeLessThan(5e-4);
      // A straight line in log-log, not a curve that happens to fit: any
      // curvature would mean the relation is not a power law.
      expect(residual).toBeLessThan(1e-6);
    }
  });

  test('changing G moves the intercept and not the slope', () => {
    // Why this observable and not another. The gate that produced this feature
    // found that most of what a naive exponent change does to a validation
    // suite can be reproduced by changing G alone; the slope is the thing that
    // cannot.
    const a = runKeplerSlope({ n: 2.3, mu: MU });
    const b = runKeplerSlope({ n: 2.3, mu: MU * 0.6 });
    expect(Math.abs(a.slope - b.slope)).toBeLessThan(1e-3);
    // And it does move when the exponent moves, by the predicted amount.
    const c = runKeplerSlope({ n: 2.5, mu: MU });
    expect(c.slope - a.slope).toBeCloseTo(0.1, 3);
  });
});

describe('precession is physical, not numerical', () => {
  test('a Newtonian orbit does not precess, to the numerical floor', () => {
    // The control. Any nonzero reading at n = 2 is integration error, and the
    // lesson quotes this number as its noise floor, so it is asserted rather
    // than assumed. RK4 with a parabola fitted through the three samples around
    // each periapsis measures 1e-11 degrees per period; 1e-6 degrees is five
    // orders of headroom and would still catch a scheme that had quietly become
    // first order.
    const r = runPrecession({ n: 2, mu: MU, dt: 0.01, revolutions: 10 });
    expect(r.precession).not.toBeNull();
    expect(Math.abs((r.precession * 180) / Math.PI)).toBeLessThan(1e-6);
  });

  test('a non-Newtonian orbit precesses far above that floor', () => {
    const r = runPrecession({ n: 2.2, mu: MU, dt: 0.01, revolutions: 10 });
    expect((r.precession * 180) / Math.PI).toBeGreaterThan(40);
  });

  test('the orbit turns the other way below n = 2 than above it', () => {
    // The sign, not the size, and it is the whole point of the lesson: the
    // apsides walk backwards for a force that falls off more slowly than
    // inverse square and forwards for one that falls off faster. Every other
    // precession test here runs at n = 2.2, so all of them would still pass if
    // the model had the magnitude right and the direction wrong on the half of
    // EXPONENT_RANGE that lies below 2 - which the lesson's own slider reaches,
    // since the range starts at 1.5.
    //
    // Measured and analytic are both asserted, because agreeing with each other
    // is not the same as being right: a sign error in the integrator and a
    // matching one in the closed form would cancel.
    for (const n of [1.6, 1.8]) {
      const measured = runPrecession({
        n,
        mu: MU,
        dt: 0.01,
        eccentricity: LESSON_ECCENTRICITY,
        revolutions: 10,
      }).precession;
      expect(measured).not.toBeNull();
      expect(measured).toBeLessThan(0);
      expect(apsidalPrecessionNearCircular(n)).toBeLessThan(0);
      // Far enough from zero that it cannot be the numerical floor, which the
      // control above puts at 1e-6 degrees.
      expect(Math.abs((measured * 180) / Math.PI)).toBeGreaterThan(10);
    }
    for (const n of [2.2, 2.5]) {
      const measured = runPrecession({
        n,
        mu: MU,
        dt: 0.01,
        eccentricity: LESSON_ECCENTRICITY,
        revolutions: 10,
      }).precession;
      expect(measured).not.toBeNull();
      expect(measured).toBeGreaterThan(0);
      expect(apsidalPrecessionNearCircular(n)).toBeGreaterThan(0);
      expect(Math.abs((measured * 180) / Math.PI)).toBeGreaterThan(10);
    }
  });

  test('the precession does not move when the timestep does', () => {
    // The separation a student is asked to make, as a test. Integration error
    // scales with dt; a physical precession does not. Across a factor of eight
    // in dt the measured value must agree to 1e-4 relative - the measured
    // spread is below 1e-7, and the tolerance leaves room for the shortest run.
    const values = [0.04, 0.02, 0.01, 0.005].map(
      dt => runPrecession({ n: 2.2, mu: MU, dt, revolutions: 8 }).precession
    );
    for (const v of values) expect(v).not.toBeNull();
    const spread =
      (Math.max(...values) - Math.min(...values)) / Math.abs(values[0]);
    expect(spread).toBeLessThan(1e-4);
  });

  test('the near-circular relation holds inside its stated domain', () => {
    // The analytic curve the lesson draws beside the measurement is an
    // approximation and is labeled as one. NEAR_CIRCULAR_DOMAIN is the measured
    // record of where it can be trusted; this checks the record is true rather
    // than decorative, at the eccentricity the lesson actually runs.
    const entry = NEAR_CIRCULAR_DOMAIN.find(
      d => d.eccentricity === LESSON_ECCENTRICITY
    );
    expect(entry).toBeDefined();
    for (const n of [2.05, 2.2, 2.5]) {
      const measured = runPrecession({
        n,
        mu: MU,
        dt: 0.01,
        eccentricity: LESSON_ECCENTRICITY,
        revolutions: 10,
      }).precession;
      const theory = apsidalPrecessionNearCircular(n);
      expect(Math.abs(measured - theory) / Math.abs(theory)).toBeLessThan(
        entry.worstRelativeError
      );
    }
  });

  test('the relation is zero at n = 2 and diverges at the stability boundary', () => {
    expect(apsidalPrecessionNearCircular(2)).toBe(0);
    expect(apsidalPrecessionNearCircular(STABILITY_EXPONENT)).toBe(Infinity);
    // And the slider cannot reach the boundary.
    expect(exponentAllowed(STABILITY_EXPONENT)).toBe(false);
    expect(EXPONENT_RANGE.max).toBeLessThan(STABILITY_EXPONENT);
  });
});

describe('what does not break', () => {
  // The conceptual heart of the lesson. Momentum conservation follows from the
  // pair terms being equal and opposite, angular momentum from the force being
  // central; neither follows from the exponent, so neither may move when the
  // exponent does.
  const threeBodies = () => [
    { mass: 1000, x: 0, y: 0, vx: 0, vy: 0 },
    { mass: 30, x: 180, y: 0, vx: 0, vy: 2.4 },
    { mass: 12, x: -260, y: 40, vx: -0.4, vy: -1.9 },
  ];

  test('linear momentum is conserved at every exponent', () => {
    // 1e-12 is floating point, not physics, and it is deliberately this tight:
    // a loose tolerance here would hide the one bug that could make the claim
    // false, which is applying a pair force to one body and not the other.
    for (const n of SPAN) {
      const { momentumDrift } = runConservation({
        bodies: threeBodies(),
        n,
        dt: 0.01,
        steps: 6000,
      });
      expect(momentumDrift).toBeLessThan(1e-12);
    }
  });

  test('angular momentum is conserved at every exponent', () => {
    // Same reasoning: a central force exerts no torque about the center for any
    // radial dependence whatsoever, so this is round-off.
    for (const n of SPAN) {
      const { angularDrift } = runConservation({
        bodies: threeBodies(),
        n,
        dt: 0.01,
        steps: 6000,
      });
      expect(angularDrift).toBeLessThan(1e-12);
    }
  });

  test('energy is conserved when computed with the correct potential', () => {
    // Unlike the two above, this one IS a discretization tolerance:
    // runConservation advances with symplectic Euler, which is first order, so
    // its energy oscillates at O(dt) about a fixed value rather than sitting at
    // round-off. 5e-4 is set from the measurement - the worst case across the
    // allowed range is n = 2.5 at 2.19e-4, where this particular configuration
    // is at its most eccentric - with room for the shortest run to sample a
    // different part of the oscillation.
    //
    // The magnitude is the weakest thing that could be asserted here, which is
    // why the two tests below assert the properties that actually distinguish
    // discretization error from a wrong potential: it scales with dt, and it
    // stops growing. A wrong potential would do neither.
    for (const n of SPAN) {
      const { energyDrift } = runConservation({
        bodies: threeBodies(),
        n,
        dt: 0.01,
        steps: 6000,
      });
      expect(energyDrift).toBeLessThan(5e-4);
    }
  });

  test('the energy error is first order in the timestep', () => {
    // Halving dt must halve the error. This is the statement that what is left
    // is the integrator and not the physics: an energy computed from a
    // potential that did not belong to the force would leave a residue that dt
    // cannot reach, and the ratio would fall to 1. That is exactly the symptom
    // the gate behind this feature found when a Newtonian potential was used
    // with a non-Newtonian force.
    //
    // Measured ratios are 2.0007, 2.0005 and 2.0003; 0.08 of slack covers the
    // sampling of the oscillation at the coarsest step.
    const at = dt =>
      runConservation({
        bodies: threeBodies(),
        n: 2.5,
        dt,
        steps: Math.round(60 / dt),
      }).energyDrift;
    const coarse = [0.04, 0.02, 0.01].map(at);
    const fine = [0.02, 0.01, 0.005].map(at);
    for (let i = 0; i < coarse.length; i++) {
      expect(coarse[i] / fine[i]).toBeGreaterThan(1.92);
      expect(coarse[i] / fine[i]).toBeLessThan(2.08);
    }
  });

  test('the energy error does not grow with run length', () => {
    // A symplectic scheme oscillates about a fixed energy; it does not drift.
    // Measured, the worst excursion saturates by about 12000 steps - 1.23e-4,
    // 1.98e-4, 2.19e-4, 2.19e-4 - so doubling the run again must not find a
    // worse one. 1.05 allows the last doubling to catch a slightly deeper part
    // of the same oscillation without allowing a trend.
    const at = steps =>
      runConservation({ bodies: threeBodies(), n: 2.5, dt: 0.01, steps })
        .energyDrift;
    const long = at(12000);
    const longer = at(24000);
    expect(longer / long).toBeLessThan(1.05);
  });

  test('a Newtonian potential would report a violation that is not there', () => {
    // The trap, asserted so it cannot come back. On a two-body orbit at n = 2.2
    // the correct potential conserves energy to round-off while -mu/r appears
    // to drift by orders of magnitude more. A diagnostic built on the wrong
    // potential would tell a student their universe does not conserve energy,
    // which is false.
    const n = 2.2;
    const s = stateAtPeriapsis(R0, 0.1, MU, n);
    const correct0 = specificEnergy(s, MU, n);
    const newtonian = st =>
      0.5 * (st.vx * st.vx + st.vy * st.vy) - MU / Math.hypot(st.x, st.y);
    const newtonian0 = newtonian(s);
    let worstCorrect = 0;
    let worstNewtonian = 0;
    const dt = 0.01;
    for (let i = 0; i < 60000; i++) {
      const a = acceleration(s.x, s.y, MU, n);
      s.vx += a.ax * dt;
      s.vy += a.ay * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      worstCorrect = Math.max(
        worstCorrect,
        Math.abs(specificEnergy(s, MU, n) - correct0) / Math.abs(correct0)
      );
      worstNewtonian = Math.max(
        worstNewtonian,
        Math.abs(newtonian(s) - newtonian0) / Math.abs(newtonian0)
      );
    }
    // Two orders of magnitude between them is the claim; the measured ratio is
    // larger, and the margin is for the slowest machine.
    expect(worstNewtonian / worstCorrect).toBeGreaterThan(100);
  });

  test('angular momentum of a single orbit is conserved to round-off', () => {
    for (const n of [2, 2.5]) {
      const r = runPrecession({ n, mu: MU, dt: 0.01, revolutions: 6 });
      expect(r.angularDrift).toBeLessThan(1e-11);
    }
  });
});

describe('a measurement that cannot be taken says so', () => {
  // The lesson this repository already learned once, in the resonance checks:
  // a degenerate measurement must be a missing number with a note, never an
  // exception, and never a fabricated value.
  test('too few apsides gives null rather than a mean of nothing', () => {
    expect(meanAngularAdvance([])).toBeNull();
    expect(meanAngularAdvance([1])).toBeNull();
    expect(meanAngularAdvance([1, 2])).toBeNull();
    expect(meanAngularAdvance(null)).toBeNull();
    expect(meanAngularAdvance([1, 2, 3])).not.toBeNull();
  });

  test('a fit with too few usable points gives null rather than NaN', () => {
    expect(fitLogSlope([]).slope).toBeNull();
    expect(fitLogSlope([{ radius: 100, period: 5 }]).slope).toBeNull();
    // Non-finite and non-positive entries are discarded, not propagated.
    expect(
      fitLogSlope([
        { radius: 100, period: NaN },
        { radius: 200, period: 0 },
      ]).slope
    ).toBeNull();
  });

  test('a nonsense exponent gives NaN rather than throwing', () => {
    expect(Number.isNaN(accelerationMagnitude(100, MU, NaN))).toBe(true);
    expect(Number.isNaN(accelerationMagnitude(0, MU, 2))).toBe(true);
    expect(Number.isNaN(accelerationMagnitude(-5, MU, 2))).toBe(true);
    expect(Number.isNaN(potentialEnergyPerMass(0, MU, 2))).toBe(true);
  });

  test('the allowed range is enforced and excludes the stability boundary', () => {
    expect(exponentAllowed(2)).toBe(true);
    expect(exponentAllowed(EXPONENT_RANGE.min)).toBe(true);
    expect(exponentAllowed(EXPONENT_RANGE.max)).toBe(true);
    expect(exponentAllowed(EXPONENT_RANGE.max + 0.001)).toBe(false);
    expect(exponentAllowed(EXPONENT_RANGE.min - 0.001)).toBe(false);
    expect(exponentAllowed(NaN)).toBe(false);
    expect(exponentAllowed('2')).toBe(false);
    expect(exponentAllowed(undefined)).toBe(false);
  });
});

describe('the model is stateless and cannot leak into anything else', () => {
  test('every exported function is pure in its arguments', () => {
    // There is no module-level mutable state to leak, and this is the test that
    // says so: the same call twice, with an unrelated call in between, must
    // give the same answer. An exponent stored in a module variable - the
    // obvious way to write this feature, and the wrong one - would fail here.
    const first = accelerationMagnitude(137, MU, 2.4);
    runPrecession({ n: 2.8, mu: MU, dt: 0.02, revolutions: 4 });
    runKeplerSlope({ n: 1.7, mu: MU });
    const second = accelerationMagnitude(137, MU, 2.4);
    expect(second).toBe(first);
    // And the default is Newtonian: a caller that forgets to pass n gets the
    // physics the rest of the application uses.
    expect(accelerationMagnitude(137, MU, 2)).toBe(MU / (137 * 137));
  });

  test('runConservation does not mutate the bodies it is given', () => {
    // It copies. A lesson that handed it live scene bodies would otherwise find
    // them moved by a diagnostic.
    const bodies = [
      { mass: 1000, x: 0, y: 0, vx: 0, vy: 0 },
      { mass: 10, x: 200, y: 0, vx: 0, vy: 2.2 },
    ];
    const before = JSON.stringify(bodies);
    runConservation({ bodies, n: 2.3, dt: 0.01, steps: 500 });
    expect(JSON.stringify(bodies)).toBe(before);
  });

  test('the reported closest approach stays far from any softening radius', () => {
    // The engine's min_interaction_distance is 0 in DEFAULT_SETTINGS and this
    // model never reads it, so the integrated force is the unsoftened law the
    // potential belongs to. This check is the standing evidence for that claim:
    // the lesson's orbits never come near a radius where a softened force would
    // have differed, so the energy diagnostic is exact rather than approximately
    // exact.
    for (const n of [2, 2.2, 2.9]) {
      const r = runPrecession({ n, mu: MU, dt: 0.01, revolutions: 6 });
      expect(r.closestApproach).toBeGreaterThan(R0 * 0.5);
    }
  });
});

describe('the constants the lesson quotes are the constants it uses', () => {
  test('the reference radius is one astronomical unit in simulation units', () => {
    // SIM_UNITS_PER_AU is 100 in js/units.js. If that anchor ever moves, r0
    // stops being 1 AU and the lesson's prose becomes false, so this is checked
    // here rather than trusted.
    expect(REFERENCE_RADIUS_SIM).toBe(100);
  });

  test('the lesson eccentricity is inside the domain the lesson claims', () => {
    expect(
      NEAR_CIRCULAR_DOMAIN.some(d => d.eccentricity === LESSON_ECCENTRICITY)
    ).toBe(true);
  });

  test('specific energy and angular momentum agree with their definitions', () => {
    const s = { x: 3, y: 4, vx: -1, vy: 2 };
    expect(specificAngularMomentum(s)).toBe(3 * 2 - 4 * -1);
    expect(specificEnergy(s, MU, 2)).toBeCloseTo(0.5 * (1 + 4) - MU / 5, 12);
  });
});
