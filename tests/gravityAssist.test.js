import {
  deflectionAngle,
  encounterEccentricity,
  periapsisDistance,
  passSide,
  outgoingRelative,
  assistOutcome,
  maximumDeltaV,
  asymptoticSpeed,
  encounterState,
  measuredDeflection,
} from '../js/gravityAssist.js';

const DEG = Math.PI / 180;
const deg = r => (r * 180) / Math.PI;

// The lab's own configuration: a five-Jupiter planet (mu = 5 in simulation
// units, G = 1) crossed by a probe at 0.461 units with an impact parameter of
// 40. Every number below that is not obviously arithmetic came out of running
// this through the integrator; see tools/physics-checks.mjs.
const MU = 5;
const V_INF = 0.461;
const B = 40;

describe('the deflection formula', () => {
  test('is tan(delta/2) = mu / (b vInf^2)', () => {
    const d = deflectionAngle(MU, B, V_INF);
    expect(Math.tan(d / 2)).toBeCloseTo(MU / (B * V_INF * V_INF), 12);
  });

  test('the lab configuration turns the probe by about 61 degrees', () => {
    expect(deg(deflectionAngle(MU, B, V_INF))).toBeCloseTo(60.9, 1);
  });

  test('the sign of the impact parameter does not change how far it turns', () => {
    expect(deflectionAngle(MU, -B, V_INF)).toBe(deflectionAngle(MU, B, V_INF));
  });

  test('a closer pass turns it further, and a grazing one reverses it', () => {
    expect(deflectionAngle(MU, 10, V_INF)).toBeGreaterThan(
      deflectionAngle(MU, 100, V_INF)
    );
    expect(deg(deflectionAngle(MU, 0, V_INF))).toBe(180);
  });

  test('speed matters more than mass, because it enters squared', () => {
    // Doubling the planet's mass doubles tan(delta/2); halving the approach
    // speed quadruples it. This is why assists are worth so much in the outer
    // solar system and so little at Mercury.
    const base = Math.tan(deflectionAngle(MU, B, V_INF) / 2);
    expect(Math.tan(deflectionAngle(2 * MU, B, V_INF) / 2)).toBeCloseTo(
      2 * base,
      12
    );
    expect(Math.tan(deflectionAngle(MU, B, V_INF / 2) / 2)).toBeCloseTo(
      4 * base,
      12
    );
  });

  test('unusable inputs give null rather than NaN', () => {
    expect(deflectionAngle(0, B, V_INF)).toBeNull();
    expect(deflectionAngle(MU, B, 0)).toBeNull();
    expect(deflectionAngle(MU, NaN, V_INF)).toBeNull();
  });
});

describe('the encounter hyperbola', () => {
  test('is always a hyperbola: e > 1', () => {
    for (const b of [1, 40, 1000]) {
      expect(encounterEccentricity(MU, b, V_INF)).toBeGreaterThan(1);
    }
  });

  test('eccentricity and deflection are the same statement', () => {
    // sin(delta/2) = 1/e is the standard relation, and it is a genuinely
    // independent route to the deflection: if either formula were mistyped
    // this would not hold.
    for (const b of [5, 40, 250]) {
      const e = encounterEccentricity(MU, b, V_INF);
      const d = deflectionAngle(MU, b, V_INF);
      expect(Math.sin(d / 2)).toBeCloseTo(1 / e, 12);
    }
  });

  test('periapsis is where the lab says it is', () => {
    // 22.9 units against a planet drawn at 2: distant, and resolved.
    expect(periapsisDistance(MU, B, V_INF)).toBeCloseTo(22.9, 1);
  });

  test('periapsis is always inside the impact parameter', () => {
    // Gravity focuses: the pass is closer than the aim. Only just, for a fast
    // distant flyby, and dramatically for a slow close one.
    for (const b of [10, 40, 400]) {
      expect(periapsisDistance(MU, b, V_INF)).toBeLessThan(b);
    }
  });
});

describe('which side, and what it costs', () => {
  const planetVel = { x: 0.3, y: 0 };
  const vInfIn = {
    x: V_INF * Math.cos(130.6 * DEG),
    y: V_INF * Math.sin(130.6 * DEG),
  };
  const delta = deflectionAngle(MU, B, V_INF);

  test('passing behind the planet gains speed', () => {
    const r = assistOutcome({ planetVel, vInfIn, delta, b: B });
    expect(r.side).toBe('trailing');
    expect(r.speedChange).toBeGreaterThan(0);
    // Measured against the integrator: 0.350 in, 0.631 out.
    expect(r.speedBefore).toBeCloseTo(0.35, 2);
    expect(r.speedAfter).toBeCloseTo(0.631, 2);
  });

  test('passing in front loses it', () => {
    const r = assistOutcome({ planetVel, vInfIn, delta, b: -B });
    expect(r.side).toBe('leading');
    expect(r.speedChange).toBeLessThan(0);
    expect(r.speedAfter).toBeCloseTo(0.177, 2);
  });

  test('the two sides are not mirror images of each other in speed', () => {
    // A common and reasonable wrong expectation. The gain and the loss are
    // both real but they are different sizes, because the speed is the length
    // of a vector sum and not a signed scalar.
    const gain = assistOutcome({ planetVel, vInfIn, delta, b: B });
    const loss = assistOutcome({ planetVel, vInfIn, delta, b: -B });
    expect(Math.abs(gain.speedChange)).not.toBeCloseTo(
      Math.abs(loss.speedChange),
      2
    );
  });

  test('the speed relative to the planet is untouched either way', () => {
    // The central fact of the whole investigation.
    for (const b of [B, -B, 5, -500]) {
      const r = assistOutcome({
        planetVel,
        vInfIn,
        delta: deflectionAngle(MU, b, V_INF),
        b,
      });
      expect(r.relativeSpeedAfter).toBeCloseTo(r.relativeSpeedBefore, 12);
    }
  });

  test('the change in velocity is the same vector in every inertial frame', () => {
    // Boost the whole encounter and the speeds all change; the delta-v does
    // not. Worth a test because the lesson makes the claim in as many words.
    const boosted = { x: planetVel.x + 7, y: planetVel.y - 3 };
    const a = assistOutcome({ planetVel, vInfIn, delta, b: B });
    const c = assistOutcome({ planetVel: boosted, vInfIn, delta, b: B });
    expect(c.deltaV.x).toBeCloseTo(a.deltaV.x, 12);
    expect(c.deltaV.y).toBeCloseTo(a.deltaV.y, 12);
    expect(c.speedAfter).not.toBeCloseTo(a.speedAfter, 3);
  });

  test('no assist can change the speed by more than twice the approach speed', () => {
    for (const b of [0.5, 5, 40, 500]) {
      const r = assistOutcome({
        planetVel,
        vInfIn,
        delta: deflectionAngle(MU, b, V_INF),
        b,
      });
      expect(r.deltaVMagnitude).toBeLessThanOrEqual(
        maximumDeltaV(V_INF) + 1e-12
      );
    }
    // And the ceiling is approached only by a reversal.
    const grazing = assistOutcome({ planetVel, vInfIn, delta: Math.PI, b: 1 });
    expect(grazing.deltaVMagnitude).toBeCloseTo(maximumDeltaV(V_INF), 6);
  });

  test('passSide is about the planet direction, not about the screen', () => {
    expect(passSide({ x: 1, y: 0 }, { x: 3, y: 9 })).toBe('leading');
    expect(passSide({ x: 1, y: 0 }, { x: -3, y: 9 })).toBe('trailing');
    // A pass square on to the motion is neither.
    expect(passSide({ x: 1, y: 0 }, { x: 0, y: 9 })).toBeNull();
  });
});

describe('reading a speed at infinity from a finite distance', () => {
  test('it undoes the potential exactly', () => {
    const vInf = 0.461;
    const r = 4000;
    const local = Math.sqrt(vInf * vInf + (2 * MU) / r);
    expect(asymptoticSpeed(local, r, MU)).toBeCloseTo(vInf, 12);
  });

  test('the correction is worth making at the distances the lab uses', () => {
    // 0.6% at 4000 units, which is ten times the accuracy everything else here
    // works to. This is the number that justifies the function existing.
    const vInf = 0.461;
    const local = Math.sqrt(vInf * vInf + (2 * MU) / 4000);
    expect(local / vInf).toBeGreaterThan(1.005);
  });

  test('a bound state has no speed at infinity, and says so', () => {
    expect(asymptoticSpeed(0.01, 100, MU)).toBeNull();
  });
});

describe('laying the encounter out', () => {
  const cfg = { mu: MU, b: B, vInf: V_INF, distance: 4000, approachDeg: 130.6 };

  test('the state it produces has the elements it was asked for', () => {
    const s = encounterState(cfg);
    const r = Math.hypot(s.pos.x, s.pos.y);
    const v = Math.hypot(s.vel.x, s.vel.y);
    expect(r).toBeCloseTo(4000, 9);
    // Angular momentum is b * vInf, which is the definition of b.
    expect(Math.abs(s.angularMomentum)).toBeCloseTo(Math.abs(B) * V_INF, 6);
    // And the speed is on the hyperbola, not at its asymptote.
    expect(asymptoticSpeed(v, r, MU)).toBeCloseTo(V_INF, 9);
  });

  test('it starts inbound', () => {
    const s = encounterState(cfg);
    // Radial velocity negative: the distance is decreasing.
    expect(s.pos.x * s.vel.x + s.pos.y * s.vel.y).toBeLessThan(0);
  });

  test('the two signs are mirror images with the same closest approach', () => {
    const plus = encounterState(cfg);
    const minus = encounterState({ ...cfg, b: -B });
    expect(minus.periapsis).toBeCloseTo(plus.periapsis, 12);
    expect(minus.angularMomentum).toBeCloseTo(-plus.angularMomentum, 9);
    expect(Math.hypot(minus.vel.x, minus.vel.y)).toBeCloseTo(
      Math.hypot(plus.vel.x, plus.vel.y),
      12
    );
  });

  test('the approach direction is the one asked for', () => {
    // At 4000 units the velocity is within a degree of its asymptote, which is
    // what makes "start it here and it will come in along this line" true.
    for (const approachDeg of [0, 90, 130.6, -47]) {
      const s = encounterState({ ...cfg, approachDeg });
      const heading = deg(Math.atan2(s.vel.y, s.vel.x));
      const diff = ((heading - approachDeg + 540) % 360) - 180;
      expect(Math.abs(diff)).toBeLessThan(1.2);
    }
  });

  test('it refuses to start inside periapsis rather than returning nonsense', () => {
    expect(encounterState({ ...cfg, distance: 1 })).toBeNull();
    expect(encounterState({ ...cfg, distance: 0 })).toBeNull();
  });

  test('the layout and the formula agree about the turn', () => {
    // The layout is built from the elements and the formula from mu, b and
    // vInf, by different routes. They must land on the same angle.
    const s = encounterState(cfg);
    expect(s.deflection).toBeCloseTo(deflectionAngle(MU, B, V_INF), 12);
  });
});

describe('measuring a deflection after the fact', () => {
  test('it recovers the angle between two velocities, with a sign', () => {
    const a = { x: 1, y: 0 };
    expect(deg(measuredDeflection(a, { x: 0, y: 1 }))).toBeCloseTo(90, 9);
    expect(deg(measuredDeflection(a, { x: 0, y: -1 }))).toBeCloseTo(-90, 9);
    expect(deg(measuredDeflection(a, { x: -1, y: 0 }))).toBeCloseTo(180, 9);
  });

  test('it agrees with outgoingRelative, which is how a run is checked', () => {
    const vInfIn = { x: -0.3, y: 0.35 };
    for (const b of [B, -B]) {
      const delta = deflectionAngle(MU, b, V_INF);
      const out = outgoingRelative(vInfIn, delta, b);
      expect(Math.abs(measuredDeflection(vInfIn, out))).toBeCloseTo(delta, 12);
    }
  });

  test('a zero velocity has no direction and gets null', () => {
    expect(measuredDeflection({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});
