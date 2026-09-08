import { describe, test, expect } from '@jest/globals';
import {
  LAGRANGE_NAMES,
  MAX_ECCENTRICITY,
  REGIME,
  ROUTH_MU,
  VIOLATION,
  forceLawViolations,
  assumptionsHold,
  collinearPoints,
  effectivePotential,
  energeticallyAccessible,
  jacobiConstant,
  lagrangePoints,
  massRatio,
  potentialField,
  potentialGradient,
  regimeFor,
  speedAt,
} from '../js/cr3bp.js';

/** Earth-Moon, the system every textbook quotes. */
const EARTH_MOON = 0.0121505856;
/** Sun-Earth, where the collinear points sit very close to the secondary. */
const SUN_EARTH = 3.0034805e-6;

describe('the mass parameter', () => {
  test('is always the lighter body’s share, whichever order they arrive in', () => {
    expect(massRatio(10, 1)).toBeCloseTo(1 / 11, 12);
    expect(massRatio(1, 10)).toBeCloseTo(1 / 11, 12);
    // Equal masses is the maximum the problem admits.
    expect(massRatio(1, 1)).toBe(0.5);
  });

  test('refuses masses that are not masses', () => {
    expect(massRatio(0, 1)).toBeNull();
    expect(massRatio(-1, 1)).toBeNull();
    expect(massRatio(NaN, 1)).toBeNull();
  });
});

describe('the equilibria', () => {
  // The real test, and much better than comparing against remembered
  // decimals: an equilibrium is a place where the gradient of the effective
  // potential vanishes, so check that it does.
  test.each([
    ['Earth-Moon', EARTH_MOON],
    ['Sun-Earth', SUN_EARTH],
    ['equal masses', 0.5],
    ['a tenth', 0.1],
  ])('every point of %s is a stationary point of Omega', (_name, mu) => {
    for (const p of lagrangePoints(mu)) {
      const g = potentialGradient(p.x, p.y, mu);
      expect(Math.hypot(g.x, g.y)).toBeLessThan(1e-9);
    }
  });

  test('there are five of them, named and ordered', () => {
    expect(lagrangePoints(EARTH_MOON).map(p => p.name)).toEqual(LAGRANGE_NAMES);
  });

  test('L4 and L5 make equilateral triangles with the two bodies', () => {
    const mu = 0.2;
    const [, , , L4, L5] = lagrangePoints(mu);
    // Distance to each massive body is exactly one separation - that is what
    // an equilateral triangle means here, and it is a theorem rather than a
    // numerical result.
    for (const p of [L4, L5]) {
      expect(Math.hypot(p.x + mu, p.y)).toBeCloseTo(1, 12);
      expect(Math.hypot(p.x - (1 - mu), p.y)).toBeCloseTo(1, 12);
    }
    expect(L4.y).toBeCloseTo(-L5.y, 12);
  });

  test('the collinear points sit where they should relative to the bodies', () => {
    const mu = EARTH_MOON;
    const { L1, L2, L3 } = collinearPoints(mu);
    // L1 between them, L2 beyond the secondary, L3 beyond the primary.
    expect(L1).toBeGreaterThan(-mu);
    expect(L1).toBeLessThan(1 - mu);
    expect(L2).toBeGreaterThan(1 - mu);
    expect(L3).toBeLessThan(-mu);
  });

  test('Earth-Moon L1 and L2 agree with the published values', () => {
    // A cross-check against numbers from outside this file, so a sign error
    // that still produced a stationary point would be caught. The Earth-Moon
    // collinear points are conventionally quoted as distances from the Moon
    // of about 0.1509 and 0.1678 separations.
    const { L1, L2 } = collinearPoints(EARTH_MOON);
    const moon = 1 - EARTH_MOON;
    expect(moon - L1).toBeCloseTo(0.1509, 3);
    expect(L2 - moon).toBeCloseTo(0.1678, 3);
  });

  test('for a tiny mass ratio the collinear points approach the Hill radius', () => {
    // L1 and L2 sit about (mu/3)^(1/3) either side of the secondary as mu goes
    // to zero. For the Sun and the Earth that is about 0.01 AU, which is the
    // number every mission designer quotes.
    const hill = Math.cbrt(SUN_EARTH / 3);
    const { L1, L2 } = collinearPoints(SUN_EARTH);
    const secondary = 1 - SUN_EARTH;
    expect((secondary - L1) / hill).toBeCloseTo(1, 1);
    expect((L2 - secondary) / hill).toBeCloseTo(1, 1);
  });

  test('L4 and L5 are stable only below Routh’s ratio, and the others never', () => {
    expect(ROUTH_MU).toBeCloseTo(0.0385208965, 9);
    const stableCase = lagrangePoints(0.01);
    expect(stableCase.filter(p => p.linearlyStable).map(p => p.name)).toEqual([
      'L4',
      'L5',
    ]);
    // Above Routh's value nothing is stable - which is why the Sun-Jupiter
    // Trojans exist and an equal-mass binary has no such swarms.
    const unstableCase = lagrangePoints(0.2);
    expect(unstableCase.some(p => p.linearlyStable)).toBe(false);
  });

  test('an impossible mass parameter gets no points', () => {
    expect(lagrangePoints(0)).toBeNull();
    expect(lagrangePoints(0.7)).toBeNull();
    expect(lagrangePoints(NaN)).toBeNull();
  });
});

describe('the Jacobi constant', () => {
  test('is 2*Omega for a tracer at rest', () => {
    const mu = EARTH_MOON;
    const C = jacobiConstant({ x: 0.5, y: 0.3, vx: 0, vy: 0 }, mu);
    expect(C).toBeCloseTo(2 * effectivePotential(0.5, 0.3, mu), 12);
  });

  test('falls as the tracer speeds up, which is the sign convention', () => {
    // Stated in the module header and checked here, because it is backwards
    // from every other energy in the application: more speed, smaller C.
    const mu = EARTH_MOON;
    const slow = jacobiConstant({ x: 0.5, y: 0, vx: 0.1, vy: 0 }, mu);
    const fast = jacobiConstant({ x: 0.5, y: 0, vx: 0.9, vy: 0 }, mu);
    expect(fast).toBeLessThan(slow);
  });

  test('is conserved along a trajectory integrated in the rotating frame', () => {
    // The defining property, and the one worth integrating for. The equations
    // of motion in the rotating frame are
    //   x'' = 2y' + dOmega/dx,  y'' = -2x' + dOmega/dy
    // and C = 2*Omega - v^2 is their integral.
    const mu = EARTH_MOON;
    // Started near L4, where the potential is smooth and the trajectory stays
    // far from both singularities. A path that grazes a massive body needs a
    // step size chosen for the encounter, and the resulting truncation error
    // would be a statement about the integrator rather than about the Jacobi
    // constant.
    let x = 0.5 - mu + 0.02;
    let y = Math.sqrt(3) / 2 - 0.01;
    let vx = 0.03;
    let vy = -0.02;
    const C0 = jacobiConstant({ x, y, vx, vy }, mu);

    // Fourth-order Runge-Kutta rather than Verlet. The Coriolis term makes the
    // acceleration depend on the velocity, and plain velocity Verlet is not
    // built for that - it held the constant only to a part in a thousand here,
    // which says nothing about the dynamics and a good deal about the scheme.
    const deriv = ([px, py, pvx, pvy]) => {
      const g = potentialGradient(px, py, mu);
      return [pvx, pvy, 2 * pvy + g.x, -2 * pvx + g.y];
    };
    const add = (a, b, h) => a.map((v, i) => v + b[i] * h);

    let y0 = [x, y, vx, vy];
    const dt = 1e-3;
    for (let i = 0; i < 2000; i++) {
      const k1 = deriv(y0);
      const k2 = deriv(add(y0, k1, dt / 2));
      const k3 = deriv(add(y0, k2, dt / 2));
      const k4 = deriv(add(y0, k3, dt));
      y0 = y0.map(
        (v, j) => v + ((k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * dt) / 6
      );
    }
    [x, y, vx, vy] = y0;

    const C1 = jacobiConstant({ x, y, vx, vy }, mu);
    // Two time units - about a third of an orbit of the pair - and the
    // constant holds to a part in ten billion, which is the integrator's
    // truncation error rather than anything about the constant.
    expect(Math.abs(C1 - C0) / Math.abs(C0)).toBeLessThan(1e-10);
  });

  test('gives no value for a state that is not one', () => {
    expect(jacobiConstant(null, 0.1)).toBeNull();
    expect(jacobiConstant({ x: NaN, y: 0 }, 0.1)).toBeNull();
    // On top of a massive body the potential is infinite, which is physically
    // right and not a number to hand anybody.
    expect(jacobiConstant({ x: 1 - 0.1, y: 0, vx: 0, vy: 0 }, 0.1)).toBeNull();
  });
});

describe('what the energy permits', () => {
  const mu = EARTH_MOON;

  test('a point is accessible exactly when a real speed exists there', () => {
    const C = 3.17;
    for (const [x, y] of [
      [0.5, 0],
      [1.2, 0.4],
      [-0.9, 0.2],
      [0.83, 0],
    ]) {
      const open = energeticallyAccessible(x, y, mu, C);
      expect(open).toBe(speedAt(x, y, mu, C) !== null);
    }
  });

  test('the tracer’s own position is always accessible to it', () => {
    // Tautologically: C was computed there, so 2*Omega - C is its own speed
    // squared, which is not negative.
    const state = { x: 0.7, y: 0.25, vx: 0.3, vy: 0.1 };
    const C = jacobiConstant(state, mu);
    expect(energeticallyAccessible(state.x, state.y, mu, C)).toBe(true);
    expect(speedAt(state.x, state.y, mu, C)).toBeCloseTo(
      Math.hypot(state.vx, state.vy),
      10
    );
  });

  test('raising C shrinks the accessible region, never grows it', () => {
    // At the triangular point, where 2*Omega is at its smallest away from the
    // masses - so it is the first place to become forbidden as C rises and the
    // sharpest test of the direction.
    const L4 = lagrangePoints(mu).find(p => p.name === 'L4');
    expect(energeticallyAccessible(L4.x, L4.y, mu, L4.C - 0.01)).toBe(true);
    expect(energeticallyAccessible(L4.x, L4.y, mu, L4.C + 0.01)).toBe(false);
  });
});

describe('access opening and closing at the critical values', () => {
  const mu = EARTH_MOON;
  const points = Object.fromEntries(lagrangePoints(mu).map(p => [p.name, p.C]));

  test('the critical values are ordered C1 > C2 > C3 > C4 = C5', () => {
    expect(points.L1).toBeGreaterThan(points.L2);
    expect(points.L2).toBeGreaterThan(points.L3);
    expect(points.L3).toBeGreaterThan(points.L4);
    expect(points.L4).toBeCloseTo(points.L5, 12);
    // C4 = 3 - mu + mu^2 under this file's convention, which omits the
    // mu*(1-mu)/2 constant some texts add to Omega. Worth pinning: the
    // textbook value of 3 - mu differs in the fourth decimal and would look
    // like an error to anybody checking.
    expect(points.L4).toBeCloseTo(3 - mu + mu * mu, 10);
  });

  test('the L1 neck opens as C falls through C1, and not before', () => {
    // The claim the lesson makes, checked either side of the threshold by a
    // hair rather than by a wide margin.
    const justAbove = regimeFor(points.L1 + 1e-9, mu);
    const justBelow = regimeFor(points.L1 - 1e-9, mu);
    expect(justAbove.l1Open).toBe(false);
    expect(justAbove.regime).toBe(REGIME.SEPARATED);
    expect(justBelow.l1Open).toBe(true);
    expect(justBelow.regime).toBe(REGIME.L1_OPEN);
  });

  test('the L2 gate opens later, at a lower C', () => {
    const between = regimeFor((points.L1 + points.L2) / 2, mu);
    expect(between.l1Open).toBe(true);
    expect(between.l2Open).toBe(false);

    const below = regimeFor(points.L2 - 1e-9, mu);
    expect(below.l2Open).toBe(true);
    expect(below.regime).toBe(REGIME.L2_OPEN);
  });

  test('the point just inside the L1 neck is accessible only once it is open', () => {
    // Not a statement about the regime label but about the geometry: sample
    // the saddle itself, which is the last place to open.
    const l1 = lagrangePoints(mu).find(p => p.name === 'L1');
    expect(energeticallyAccessible(l1.x, 0, mu, l1.C + 1e-6)).toBe(false);
    expect(energeticallyAccessible(l1.x, 0, mu, l1.C - 1e-6)).toBe(true);
  });

  test('below C4 nothing anywhere is forbidden', () => {
    const open = regimeFor(points.L4 - 0.01, mu);
    expect(open.regime).toBe(REGIME.UNRESTRICTED);
    for (const [x, y] of [
      [0, 0],
      [1.5, 1.5],
      [-1.4, 0.8],
      [0.5, Math.sqrt(3) / 2],
    ]) {
      expect(energeticallyAccessible(x, y, mu, points.L4 - 0.01)).toBe(true);
    }
  });

  test('how far the tracer is from the next gate is reported', () => {
    const r = regimeFor(points.L1 + 0.05, mu);
    expect(r.toL1).toBeCloseTo(-0.05, 10);
    expect(r.thresholds.L1).toBeCloseTo(points.L1, 12);
  });
});

describe('the field the overlay draws from', () => {
  test('samples 2*Omega on the grid it was asked for', () => {
    const mu = 0.1;
    const bounds = { minX: -1.5, maxX: 1.5, minY: -1.5, maxY: 1.5 };
    const out = potentialField({ mu, bounds, width: 5, height: 5 });
    expect(out.width).toBe(5);
    expect(out.field).toHaveLength(25);
    // The corner sample is 2*Omega at that corner.
    expect(out.field[0]).toBeCloseTo(
      2 * effectivePotential(-1.5, -1.5, mu),
      12
    );
  });

  test('holds the potential, not a mask, so a new C costs one comparison', () => {
    // The property that keeps the overlay off the frame budget: the expensive
    // half depends on mu and the bounds, which change rarely, and the
    // per-frame half is a threshold against a number that changes constantly.
    const mu = 0.1;
    const bounds = { minX: -2, maxX: 2, minY: -2, maxY: 2 };
    const out = potentialField({ mu, bounds, width: 8, height: 8 });
    const forbiddenAt = C => out.field.filter(v => v < C).length;
    expect(forbiddenAt(3.9)).toBeGreaterThan(forbiddenAt(3.0));
  });

  test('refuses a grid it cannot fill', () => {
    expect(
      potentialField({ mu: 0.1, bounds: null, width: 4, height: 4 })
    ).toBeNull();
    expect(
      potentialField({
        mu: 0.1,
        bounds: { minX: 1, maxX: 1, minY: 0, maxY: 1 },
        width: 4,
        height: 4,
      })
    ).toBeNull();
  });
});

describe('whether the claims apply at all', () => {
  const pair = [{ mass: 100 }, { mass: 1 }];
  const tracer = { mass: 1e-9 };

  test('two massive bodies, a light tracer and a circular orbit is the valid case', () => {
    const out = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0.001,
    });
    expect(out.ok).toBe(true);
    expect(out.violations).toEqual([]);
    expect(out.mu).toBeCloseTo(1 / 101, 12);
  });

  test('a third massive body invalidates it', () => {
    const out = assumptionsHold({
      massive: [...pair, { mass: 5 }],
      tracer,
      eccentricity: 0,
    });
    expect(out.ok).toBe(false);
    expect(out.violations).toContain(VIOLATION.BODY_COUNT);
  });

  test('an eccentric pair invalidates it', () => {
    const out = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: MAX_ECCENTRICITY * 2,
    });
    expect(out.ok).toBe(false);
    expect(out.violations).toContain(VIOLATION.ECCENTRIC);
    // And the boundary is inclusive rather than a surprise.
    expect(
      assumptionsHold({ massive: pair, tracer, eccentricity: MAX_ECCENTRICITY })
        .ok
    ).toBe(true);
  });

  test('a tracer heavy enough to matter invalidates it', () => {
    const out = assumptionsHold({
      massive: pair,
      tracer: { mass: 1 },
      eccentricity: 0,
    });
    expect(out.ok).toBe(false);
    expect(out.violations).toContain(VIOLATION.TRACER_TOO_HEAVY);
  });

  test('no tracer at all invalidates it', () => {
    const out = assumptionsHold({ massive: pair, tracer: null });
    expect(out.ok).toBe(false);
    expect(out.violations).toContain(VIOLATION.NO_TRACER);
  });
});

describe('the assumptions are checked before anything is claimed', () => {
  const pair = [{ mass: 1 }, { mass: 0.1 }];
  const tracer = { mass: 1e-9 };

  test('an eccentricity nobody could compute is not "circular"', () => {
    // The defect: the guard was `isFinite(e) && e > MAX`, so a null or a NaN -
    // which is what an unbound, degenerate or unreadable pair produces -
    // skipped the check and the system passed as circular. Silence about an
    // orbit is not evidence that it is round.
    for (const e of [null, undefined, NaN, Infinity]) {
      const verdict = assumptionsHold({
        massive: pair,
        tracer,
        eccentricity: e,
      });
      expect(verdict.ok).toBe(false);
      expect(verdict.violations).toContain(VIOLATION.ECCENTRICITY_UNKNOWN);
    }
    // A real, small eccentricity still passes.
    expect(
      assumptionsHold({ massive: pair, tracer, eccentricity: 0.001 }).ok
    ).toBe(true);
  });

  test('an eccentric pair is still refused, and named separately', () => {
    const verdict = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0.2,
    });
    expect(verdict.violations).toContain(VIOLATION.ECCENTRIC);
    expect(verdict.violations).not.toContain(VIOLATION.ECCENTRICITY_UNKNOWN);
  });

  test('extra massive bodies are counted, not ignored', () => {
    // The overlay took the first light body as the tracer and said nothing
    // about the rest, so a system with four more planets was presented as a
    // restricted three-body problem. It is their COMBINED pull the restriction
    // assumes away, so it is the total that is judged.
    const heavy = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0.001,
      others: [{ mass: 0.01 }],
    });
    expect(heavy.ok).toBe(false);
    expect(heavy.violations).toContain(VIOLATION.THIRD_MASS);

    // Individually negligible, collectively not.
    const many = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0.001,
      others: Array.from({ length: 40 }, () => ({ mass: 1e-7 })),
    });
    expect(many.violations).toContain(VIOLATION.THIRD_MASS);

    // Genuinely negligible dust does not trip it.
    expect(
      assumptionsHold({
        massive: pair,
        tracer,
        eccentricity: 0.001,
        others: [{ mass: 1e-12 }, { mass: 1e-12 }],
      }).ok
    ).toBe(true);
  });

  test('an unbound pair has no rotating frame and is refused', () => {
    const verdict = assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0.001,
      bound: false,
    });
    expect(verdict.violations).toContain(VIOLATION.UNBOUND);
  });

  test('every violation the module can raise has a name in both languages', async () => {
    const { EN_DEFERRED } = await import('../js/i18n/en.deferred.js');
    const { ES_DEFERRED } = await import('../js/i18n/es.deferred.js');
    for (const v of Object.values(VIOLATION)) {
      expect(typeof EN_DEFERRED[`cr3bp.invalid.${v}`]).toBe('string');
      expect(typeof ES_DEFERRED[`cr3bp.invalid.${v}`]).toBe('string');
    }
  });
});
describe('the force law has to be the one the model describes', () => {
  const pair = [{ mass: 10 }, { mass: 1 }];
  const tracer = { mass: 1e-6 };
  const hold = forceLaw =>
    assumptionsHold({
      massive: pair,
      tracer,
      eccentricity: 0,
      forceLaw,
    });

  test('nothing but Newtonian gravity is nothing to report', () => {
    expect(
      hold({ extraPotential: null, softening: 5, minDistance: 400 }).ok
    ).toBe(true);
  });

  test('a halo in force is refused', () => {
    const out = hold({
      extraPotential: 'halo',
      softening: 5,
      minDistance: 400,
    });
    expect(out.ok).toBe(false);
    expect(out.violations).toContain(VIOLATION.EXTRA_POTENTIAL);
  });

  test('MOND in force is refused', () => {
    expect(
      hold({ extraPotential: 'mond', softening: 5, minDistance: 400 })
        .violations
    ).toContain(VIOLATION.EXTRA_POTENTIAL);
  });

  test('a softening floor nothing is inside is not a modification', () => {
    // The engine clamps the separation used in the force calculation; outside
    // that radius the law is exactly the inverse square. Refusing a floor that
    // nothing comes near would be refusing a dormant setting.
    expect(forceLawViolations({ softening: 5, minDistance: 400 })).toEqual([]);
  });

  test('bodies inside the floor are being integrated under another law', () => {
    expect(forceLawViolations({ softening: 50, minDistance: 40 })).toContain(
      VIOLATION.SOFTENED
    );
  });

  test('a hair outside the floor counts too', () => {
    // A tracer three per cent clear of the clamp will cross it as it moves.
    expect(forceLawViolations({ softening: 100, minDistance: 103 })).toContain(
      VIOLATION.SOFTENED
    );
    expect(forceLawViolations({ softening: 100, minDistance: 130 })).toEqual(
      []
    );
  });

  test('no force law given is no claim either way', () => {
    // Callers that predate this - and the pure tests above - are unaffected.
    expect(forceLawViolations(null)).toEqual([]);
    expect(assumptionsHold({ massive: pair, tracer, eccentricity: 0 }).ok).toBe(
      true
    );
  });
});

describe('both directions of revolution are handled', () => {
  /**
   * The Jacobi constant is invariant under reflecting the system.
   *
   * The frame was assumed to rotate counter-clockwise, so a clockwise pair had
   * every frame-rotation term with the wrong sign - and the Jacobi constant,
   * the Lagrange points and the zero-velocity curves came out mirrored. The
   * restricted problem is invariant under (y, vy) -> (-y, -vy) together with
   * reversing the rotation, so a clockwise system maps exactly onto the
   * standard convention and both can be supported rather than one declined.
   */
  test('a reflected state has the same Jacobi constant', () => {
    const mu = 0.2;
    const state = { x: 0.4, y: 0.3, vx: -0.15, vy: 0.22 };
    const reflected = { x: state.x, y: -state.y, vx: state.vx, vy: -state.vy };
    expect(jacobiConstant(reflected, mu)).toBeCloseTo(
      jacobiConstant(state, mu),
      12
    );
  });

  test('the effective potential is symmetric about the line of centres', () => {
    // Which is why the reflection is exact rather than an approximation.
    const mu = 0.3;
    for (const [x, y] of [
      [0.1, 0.5],
      [-0.7, 0.2],
      [1.3, 0.9],
    ]) {
      expect(effectivePotential(x, -y, mu)).toBeCloseTo(
        effectivePotential(x, y, mu),
        12
      );
    }
  });

  test('the Lagrange points reflect with the system', () => {
    const points = lagrangePoints(0.15);
    const l4 = points.find(p => p.name === 'L4');
    const l5 = points.find(p => p.name === 'L5');
    // L4 and L5 are each other's reflection, so a mirrored frame swaps which
    // one a reader is looking at rather than moving either.
    expect(l5.x).toBeCloseTo(l4.x, 12);
    expect(l5.y).toBeCloseTo(-l4.y, 12);
  });
});
