import {
  haloCircularSpeed,
  haloAcceleration,
  haloEnclosedMass,
  massCenter,
  enclosedVisibleMass,
  keplerianSpeed,
  totalCircularSpeed,
  rotationCurvePoints,
  fitPowerLaw,
  velocityDispersion,
  virialMass,
  losToMeanSquare,
  massDiscrepancy,
  besselI0,
  besselI1,
  besselK0,
  besselK1,
  pointMassSpeed,
  uniformSphereSpeed,
  exponentialDiscSpeed,
  galaxyCurveAt,
  galaxyCurve,
  enclosedMassFromSpeed,
  curveResidual,
  G_GALACTIC,
} from '../js/darkMatter.js';

const body = (x, y, mass = 1, vx = 0, vy = 0) => ({
  pos: { x, y },
  vel: { x: vx, y: vy },
  mass,
});

describe('the halo profile', () => {
  const V = 40;
  const RC = 200;

  test('the speed approaches the asymptote from below and never exceeds it', () => {
    // The flat part is the entire pedagogical point: a curve that kept rising
    // would be a different and wrong claim about galaxies. The approach is
    // slow on purpose - the shortfall goes as pi*r_c/(4r) - so a curve that
    // snapped to the asymptote would be the wrong profile, not a better one.
    for (const r of [1, 50, 200, 1000, 1e4, 1e6]) {
      expect(haloCircularSpeed(r, V, RC)).toBeLessThan(V);
    }
    expect(haloCircularSpeed(1e5, V, RC) / V).toBeCloseTo(0.9984, 4);
    expect(haloCircularSpeed(1e9, V, RC) / V).toBeCloseTo(1, 6);
  });

  test('the speed rises monotonically with radius', () => {
    let prev = 0;
    for (let r = 1; r < 5000; r *= 1.3) {
      const v = haloCircularSpeed(r, V, RC);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  test('the center is a solid-body rise, not a cusp', () => {
    // Near r = 0 the profile goes as v = v_flat * r / (sqrt(3) * r_c). A cuspy
    // profile would put a singularity in the middle of a scenario students fly
    // through.
    const r = RC / 1e6;
    expect(haloCircularSpeed(r, V, RC)).toBeCloseTo(
      (V * r) / (Math.sqrt(3) * RC),
      15
    );
  });

  test('the small-radius series matches the closed form where they meet', () => {
    // Either side of the 1e-3 cutoff the two branches must agree, or the curve
    // has a step in it exactly where nobody would look for one.
    const rc = 1000;
    const below = haloCircularSpeed(0.999e-3 * rc, V, rc);
    const above = haloCircularSpeed(1.001e-3 * rc, V, rc);
    expect(above / below).toBeCloseTo(1.002, 4);
  });

  test('a zero or negative parameter yields no halo rather than a NaN', () => {
    expect(haloCircularSpeed(0, V, RC)).toBe(0);
    expect(haloCircularSpeed(-5, V, RC)).toBe(0);
    expect(haloCircularSpeed(100, 0, RC)).toBe(0);
    expect(haloCircularSpeed(100, V, 0)).toBe(0);
  });

  test('acceleration points at the halo center', () => {
    const halo = { vFlat: V, coreRadius: RC };
    const a = haloAcceleration({ x: 300, y: 0 }, halo);
    expect(a.ax).toBeLessThan(0);
    expect(a.ay).toBeCloseTo(0, 12);

    const b = haloAcceleration({ x: 0, y: -300 }, halo);
    expect(b.ay).toBeGreaterThan(0);
    expect(b.ax).toBeCloseTo(0, 12);
  });

  test('acceleration is exactly what a circular orbit at that radius needs', () => {
    const halo = { vFlat: V, coreRadius: RC };
    const r = 640;
    const a = haloAcceleration({ x: r, y: 0 }, halo);
    const v = haloCircularSpeed(r, V, RC);
    expect(Math.hypot(a.ax, a.ay)).toBeCloseTo((v * v) / r, 12);
  });

  test('an offset center moves the whole field with it', () => {
    const halo = { vFlat: V, coreRadius: RC, center: { x: 500, y: -200 } };
    expect(haloAcceleration({ x: 500, y: -200 }, halo)).toEqual({
      ax: 0,
      ay: 0,
    });
    const a = haloAcceleration({ x: 900, y: -200 }, halo);
    expect(a.ax).toBeLessThan(0);
  });

  test('enclosed halo mass grows without limit, roughly linearly far out', () => {
    // This is the structural claim behind a flat curve: M(<r) proportional to r
    // is exactly what keeps v constant.
    // Well outside the core, where v has settled, doubling the radius doubles
    // the enclosed mass. Closer in it grows faster than that, which is the part
    // of the curve that is still rising.
    const halo = { vFlat: V, coreRadius: RC };
    const far = haloEnclosedMass(2e6, halo, 1) / haloEnclosedMass(1e6, halo, 1);
    expect(far).toBeCloseTo(2, 3);
    const near =
      haloEnclosedMass(400, halo, 1) / haloEnclosedMass(200, halo, 1);
    expect(near).toBeGreaterThan(2.5);
  });
});

describe('measuring the simulated system', () => {
  test('the mass center is weighted, not averaged', () => {
    const c = massCenter([body(0, 0, 900), body(100, 0, 100)]);
    expect(c.x).toBeCloseTo(10, 12);
    expect(c.mass).toBe(1000);
  });

  test('massless and broken bodies are skipped rather than poisoning the sum', () => {
    const c = massCenter([
      body(0, 0, 1000),
      body(1e6, 0, 0),
      { pos: { x: 5, y: 5 }, mass: NaN },
    ]);
    expect(c.x).toBe(0);
    expect(c.mass).toBe(1000);
  });

  test('an empty set has a center rather than a NaN', () => {
    expect(massCenter([])).toEqual({ x: 0, y: 0, mass: 0 });
  });

  test('enclosed mass counts what is inside and not what is outside', () => {
    const bodies = [body(0, 0, 500), body(50, 0, 100), body(500, 0, 300)];
    const c = { x: 0, y: 0 };
    expect(enclosedVisibleMass(bodies, c, 10)).toBe(500);
    expect(enclosedVisibleMass(bodies, c, 100)).toBe(600);
    expect(enclosedVisibleMass(bodies, c, 1000)).toBe(900);
  });

  test('the Keplerian prediction is the textbook square root', () => {
    const bodies = [body(0, 0, 1000)];
    const v = keplerianSpeed(bodies, { x: 0, y: 0 }, 100, 1);
    expect(v).toBeCloseTo(Math.sqrt(1000 / 100), 12);
  });

  test('a point mass gives a curve falling as r to the minus a half', () => {
    // The Solar System's behaviour, and the prediction the flat curve refutes.
    const bodies = [body(0, 0, 1000)];
    const c = { x: 0, y: 0 };
    const pts = [200, 400, 800, 1600].map(r => ({
      r,
      speed: keplerianSpeed(bodies, c, r, 1),
    }));
    expect(fitPowerLaw(pts).exponent).toBeCloseTo(-0.5, 9);
  });

  test('speeds from separate mass components add in quadrature', () => {
    const bodies = [body(0, 0, 1000)];
    const c = { x: 0, y: 0 };
    const halo = { vFlat: 5, coreRadius: 100 };
    const vb = keplerianSpeed(bodies, c, 400, 1);
    const vh = haloCircularSpeed(400, halo.vFlat, halo.coreRadius);
    expect(totalCircularSpeed(bodies, c, 400, 1, halo)).toBeCloseTo(
      Math.hypot(vb, vh),
      12
    );
  });

  test('no halo means the visible mass alone', () => {
    const bodies = [body(0, 0, 1000)];
    const c = { x: 0, y: 0 };
    expect(totalCircularSpeed(bodies, c, 400, 1, null)).toBe(
      keplerianSpeed(bodies, c, 400, 1)
    );
  });
});

describe('rotation curve points', () => {
  test('a circular orbiter has all its speed in the tangential component', () => {
    const pts = rotationCurvePoints([body(100, 0, 1, 0, 3)], { x: 0, y: 0 });
    expect(pts[0].r).toBe(100);
    expect(pts[0].speed).toBe(3);
    expect(pts[0].tangential).toBeCloseTo(3, 12);
  });

  test('a body falling straight in has none of it', () => {
    const pts = rotationCurvePoints([body(100, 0, 1, -3, 0)], { x: 0, y: 0 });
    expect(pts[0].speed).toBe(3);
    expect(pts[0].tangential).toBeCloseTo(0, 12);
  });

  test('the center s own motion is subtracted', () => {
    // A galaxy drifting across the screen would otherwise add its drift to
    // every point on its own rotation curve.
    const drift = { x: 10, y: 0 };
    const pts = rotationCurvePoints(
      [body(100, 0, 1, 10, 3)],
      { x: 0, y: 0 },
      drift
    );
    expect(pts[0].speed).toBeCloseTo(3, 12);
  });

  test('points come back sorted by radius', () => {
    const pts = rotationCurvePoints(
      [body(300, 0), body(100, 0), body(200, 0)],
      { x: 0, y: 0 }
    );
    expect(pts.map(p => p.r)).toEqual([100, 200, 300]);
  });

  test('a body sitting on the center is left out rather than dividing by zero', () => {
    const pts = rotationCurvePoints([body(0, 0, 1000)], { x: 0, y: 0 });
    expect(pts).toHaveLength(0);
  });
});

describe('fitting the exponent', () => {
  test('a flat curve reads as zero', () => {
    const pts = [100, 200, 400, 800].map(r => ({ r, speed: 42 }));
    expect(fitPowerLaw(pts).exponent).toBeCloseTo(0, 12);
  });

  test('the inner region can be excluded', () => {
    // Inside the bulge the curve rises, and including that part would drag a
    // genuinely Keplerian outer fit towards zero.
    const pts = [
      { r: 10, speed: 1 },
      { r: 20, speed: 2 },
      { r: 200, speed: Math.sqrt(1000 / 200) },
      { r: 400, speed: Math.sqrt(1000 / 400) },
      { r: 800, speed: Math.sqrt(1000 / 800) },
    ];
    expect(fitPowerLaw(pts, 100).exponent).toBeCloseTo(-0.5, 9);
    expect(fitPowerLaw(pts, 100).count).toBe(3);
  });

  test('too few points is null, not a fit nobody should trust', () => {
    expect(fitPowerLaw([{ r: 1, speed: 1 }])).toBeNull();
    expect(fitPowerLaw([])).toBeNull();
  });

  test('points all at one radius give null rather than infinity', () => {
    const pts = [1, 2, 3].map(s => ({ r: 100, speed: s }));
    expect(fitPowerLaw(pts)).toBeNull();
  });

  test('zero and negative speeds are dropped, since their logs do not exist', () => {
    const pts = [
      { r: 100, speed: 0 },
      { r: 200, speed: 10 },
      { r: 400, speed: 10 },
      { r: 800, speed: 10 },
    ];
    const fit = fitPowerLaw(pts);
    expect(fit.count).toBe(3);
    expect(fit.exponent).toBeCloseTo(0, 12);
  });
});

describe("Zwicky's estimate", () => {
  test('dispersion is measured about the mean motion, not about zero', () => {
    // A cluster as a whole is receding. That common motion is not evidence
    // about how much mass holds it together.
    const bodies = [
      body(0, 0, 1, 1000, 0),
      body(0, 0, 1, 1002, 0),
      body(0, 0, 1, 998, 0),
    ];
    const d = velocityDispersion(bodies);
    expect(d.sigma).toBeCloseTo(Math.sqrt(8 / 3), 12);
    expect(d.count).toBe(3);
  });

  test('one body has no dispersion to speak of', () => {
    expect(velocityDispersion([body(0, 0, 1, 5, 5)]).sigma).toBe(0);
    expect(velocityDispersion([]).count).toBe(0);
  });

  test('the virial mass is the textbook five thirds R v-squared over G', () => {
    expect(virialMass(400, 3000, 1)).toBeCloseTo((5 / 3) * 400 * 3000, 9);
  });

  test('a cluster that is not moving has no virial mass to report', () => {
    expect(virialMass(0, 3000, 1)).toBe(0);
    expect(virialMass(400, 0, 1)).toBe(0);
  });

  test('the projection factor is three in space and two in a plane', () => {
    // Getting this factor wrong is the classic error in the calculation, so it
    // is a parameter the caller has to choose rather than a constant hidden
    // inside the estimator.
    expect(losToMeanSquare(10)).toBe(300);
    expect(losToMeanSquare(10, 2)).toBe(200);
  });

  test('a virial mass recovers a known mass for a system in equilibrium', () => {
    // Twelve bodies on circular orbits of radius R about a central mass M have
    // <v^2> = GM/R, so the estimator should return (5/3) M. The factor is the
    // uniform-sphere approximation showing its working: the estimator is good
    // to a factor of order unity by construction, and the lesson says so rather
    // than pretending it is exact.
    const M = 1200;
    const R = 400;
    const G = 1;
    const v = Math.sqrt((G * M) / R);
    const members = Array.from({ length: 12 }, (_, i) => {
      const t = (i / 12) * 2 * Math.PI;
      return body(
        R * Math.cos(t),
        R * Math.sin(t),
        1,
        -v * Math.sin(t),
        v * Math.cos(t)
      );
    });
    const est = virialMass(velocityDispersion(members).meanSquare, R, G);
    expect(est / M).toBeCloseTo(5 / 3, 6);
  });

  test('the discrepancy is a ratio, and undefined when nothing is visible', () => {
    expect(massDiscrepancy(400, 1)).toBe(400);
    expect(massDiscrepancy(400, 0)).toBeNull();
  });
});

describe('the halo as the integrator actually applies it', () => {
  // physics.js adds the halo as a velocity kick before the existing gravity
  // step, which is an operator split rather than a single combined force. The
  // question that matters is whether that split holds a circular orbit
  // circular, so this reproduces the same scheme and checks.
  const halo = { vFlat: 6, coreRadius: 300 };

  // Integrate a whole number of orbits rather than a fixed step count: the
  // period varies by a factor of ten across the radii checked below, and a
  // fixed count would compare a full orbit against a fraction of one.
  const orbit = (r, dt, orbits = 3) => {
    const v = haloCircularSpeed(r, halo.vFlat, halo.coreRadius);
    const steps = Math.ceil((orbits * ((2 * Math.PI * r) / v)) / dt);
    const pos = { x: r, y: 0 };
    const vel = { x: 0, y: v };
    let rMin = Infinity;
    let rMax = 0;
    for (let i = 0; i < steps; i++) {
      const a = haloAcceleration(pos, halo);
      vel.x += a.ax * dt;
      vel.y += a.ay * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      const rr = Math.hypot(pos.x, pos.y);
      rMin = Math.min(rMin, rr);
      rMax = Math.max(rMax, rr);
    }
    return { rMin, rMax, period: (2 * Math.PI * r) / v };
  };

  test('a circular orbit in the halo stays circular', () => {
    const r = 800;
    const { rMin, rMax } = orbit(r, 0.005, 3);
    // A radius that drifted would show up on screen as a spiral rather than a
    // circle, which is the failure a student would notice first.
    expect((rMax - rMin) / r).toBeLessThan(0.01);
  });

  test('the orbit holds at radii from inside the core to well outside it', () => {
    for (const r of [100, 300, 900, 2400]) {
      const { rMin, rMax } = orbit(r, 0.005, 2);
      expect((rMax - rMin) / r).toBeLessThan(0.02);
    }
  });

  test('halving the timestep shrinks the error, so this is convergence and not luck', () => {
    const coarse = orbit(800, 0.08);
    const fine = orbit(800, 0.04);
    const spread = o => (o.rMax - o.rMin) / 800;
    expect(spread(fine)).toBeLessThan(spread(coarse));
  });
});

// =============================================================================
// Mass components: predicting a rotation curve rather than measuring one
// =============================================================================

describe('modified Bessel functions', () => {
  // Standard tabulated values. These exist here for one reason: the thin
  // exponential disc below is the only place in the project that needs them,
  // and a disc curve with a subtly wrong Bessel function looks entirely
  // plausible while putting the peak in the wrong place - which in a fitting
  // exercise would be absorbed into the halo, and the halo is what is being
  // measured.
  const CASES = [
    [
      'I0',
      besselI0,
      [
        [0.5, 1.0634833707],
        [1, 1.2660658778],
        [2, 2.2795853023],
        [3, 4.8807925858],
        [5, 27.239871824],
        [10, 2815.7166284],
      ],
    ],
    [
      'I1',
      besselI1,
      [
        [0.5, 0.2578943054],
        [1, 0.565159104],
        [2, 1.5906368546],
        [3, 3.9533702174],
        [5, 24.335642142],
        [10, 2670.9883037],
      ],
    ],
    [
      'K0',
      besselK0,
      [
        [0.5, 0.9244190712],
        [1, 0.4210244382],
        [2, 0.1138938727],
        [3, 0.0347395044],
        [5, 3.6910983e-3],
        [10, 1.7780062e-5],
      ],
    ],
    [
      'K1',
      besselK1,
      [
        [0.5, 1.65644112],
        [1, 0.6019072302],
        [2, 0.1398658818],
        [3, 0.0401564311],
        [5, 4.0446134e-3],
        [10, 1.8648773e-5],
      ],
    ],
  ];

  for (const [name, fn, cases] of CASES) {
    test(`${name} matches tabulated values across both polynomial branches`, () => {
      for (const [x, want] of cases) {
        // The Abramowitz & Stegun approximations claim about 1e-7 relative and
        // deliver it; 2e-7 leaves room for the rounding in the reference.
        expect(Math.abs(fn(x) - want) / want).toBeLessThan(2e-7);
      }
    });
  }

  test('the branch switch at x = 2 and x = 3.75 introduces no step', () => {
    for (const [fn, edge] of [
      [besselI0, 3.75],
      [besselI1, 3.75],
      [besselK0, 2],
      [besselK1, 2],
    ]) {
      const lo = fn(edge * 0.9999);
      const hi = fn(edge * 1.0001);
      expect(Math.abs(hi - lo) / Math.abs(lo)).toBeLessThan(1e-3);
    }
  });

  test('I1 is odd and I0 is even', () => {
    expect(besselI1(-2)).toBeCloseTo(-besselI1(2), 10);
    expect(besselI0(-2)).toBeCloseTo(besselI0(2), 10);
  });

  test('K diverges at the origin rather than returning a number', () => {
    expect(besselK0(0)).toBe(Infinity);
    expect(besselK1(0)).toBe(Infinity);
  });
});

describe('component rotation curves', () => {
  test('a point mass gives exactly the Keplerian speed', () => {
    const M = 1e11;
    expect(pointMassSpeed(10, M)).toBeCloseTo(
      Math.sqrt((G_GALACTIC * M) / 10),
      10
    );
  });

  test('a uniform sphere rises linearly inside and falls as r^-1/2 outside', () => {
    const M = 1e10;
    const R = 5;
    // Inside: v proportional to r.
    expect(
      uniformSphereSpeed(2, M, R) / uniformSphereSpeed(1, M, R)
    ).toBeCloseTo(2, 9);
    // Outside: v proportional to 1/sqrt(r), so the peak is at the surface.
    expect(
      uniformSphereSpeed(R, M, R) / uniformSphereSpeed(4 * R, M, R)
    ).toBeCloseTo(2, 9);
    // And the peak really is at the surface, not somewhere else.
    let best = 0;
    let bestR = 0;
    for (let r = 0.1; r < 20; r += 0.01) {
      const v = uniformSphereSpeed(r, M, R);
      if (v > best) {
        best = v;
        bestR = r;
      }
    }
    expect(bestR).toBeCloseTo(R, 1);
  });

  test('the exponential disc peaks at 2.15 scale lengths', () => {
    // Freeman (1970). The peak location is a pure number, independent of the
    // disc's mass and scale length, which makes it the sharpest available check
    // that the Bessel combination is the right one.
    const Rd = 3;
    let best = 0;
    let bestR = 0;
    for (let r = 0.02; r < 12 * Rd; r += 0.005) {
      const v = exponentialDiscSpeed(r, 1e10, Rd);
      if (v > best) {
        best = v;
        bestR = r;
      }
    }
    expect(bestR / Rd).toBeCloseTo(2.15, 2);
  });

  test('the disc peak scales with mass and scale length as the algebra says', () => {
    // v^2 goes as G M / Rd at fixed r/Rd, so quadrupling the mass doubles the
    // peak speed and quadrupling the scale length halves it.
    const peak = (M, Rd) => {
      let best = 0;
      for (let x = 0.05; x < 12; x += 0.01) {
        best = Math.max(best, exponentialDiscSpeed(x * Rd, M, Rd));
      }
      return best;
    };
    expect(peak(4e10, 3) / peak(1e10, 3)).toBeCloseTo(2, 3);
    expect(peak(1e10, 12) / peak(1e10, 3)).toBeCloseTo(0.5, 3);
  });

  test('far outside the disc the curve becomes Keplerian', () => {
    // The bracket I0K0 - I1K1 tends to 1/(4y^3), which turns the Freeman
    // expression into exactly GM/r. A disc seen from far enough away is a point
    // mass, and if it were not this function would be wrong.
    const M = 1e10;
    const Rd = 2;
    const r = 300;
    const disc = exponentialDiscSpeed(r, M, Rd);
    expect(disc / pointMassSpeed(r, M)).toBeCloseTo(1, 2);
  });

  test('in the plane of a disc the speed exceeds the spherical equivalent', () => {
    // Not a bug, and the reason this function uses Bessel functions rather than
    // an enclosed mass. Material at larger radius than the orbit still pulls
    // inward when it lies in the same plane, so a disc spins faster than a
    // sphere holding the same mass inside the same radius. Treating a disc as a
    // sphere understates its contribution by about 15% near the peak, and in a
    // decomposition that shortfall lands on the halo - which is the quantity
    // being measured.
    const M = 1e10;
    const Rd = 3;
    const r = 2.15 * Rd;
    // Mass inside r for an exponential disc: M[1 - (1 + r/Rd) exp(-r/Rd)].
    const x = r / Rd;
    const enclosed = M * (1 - (1 + x) * Math.exp(-x));
    const ratio = exponentialDiscSpeed(r, M, Rd) / pointMassSpeed(r, enclosed);
    expect(ratio).toBeGreaterThan(1.1);
    expect(ratio).toBeLessThan(1.25);
  });

  test('a component with no mass contributes no speed', () => {
    expect(exponentialDiscSpeed(5, 0, 3)).toBe(0);
    expect(pointMassSpeed(5, 0)).toBe(0);
    expect(uniformSphereSpeed(5, 1e10, 0)).toBe(0);
  });
});

describe('a decomposed galaxy curve', () => {
  const MODEL = {
    bulgeMass: 1e10,
    discMass: 4e10,
    discScale: 2.6,
    haloVFlat: 150,
    haloCore: 8,
  };

  test('components add in quadrature, not linearly', () => {
    const c = galaxyCurveAt(10, MODEL);
    expect(c.visible).toBeCloseTo(Math.hypot(c.bulge, c.disc), 9);
    expect(c.total).toBeCloseTo(Math.hypot(c.bulge, c.disc, c.halo), 9);
    // Linear addition would give a visibly different and larger number, which is
    // the classic mistake here.
    expect(c.total).toBeLessThan(c.bulge + c.disc + c.halo);
  });

  test('with no halo the total is the visible curve', () => {
    const c = galaxyCurveAt(10, { ...MODEL, haloVFlat: 0 });
    expect(c.halo).toBe(0);
    expect(c.total).toBeCloseTo(c.visible, 9);
  });

  test('the visible-only curve falls at large radius and the total does not', () => {
    const far = galaxyCurve(MODEL, 40, 40);
    const a = far[far.length - 8];
    const b = far[far.length - 1];
    const visibleOnly = { ...MODEL, haloVFlat: 0 };
    const va = galaxyCurveAt(a.r, visibleOnly).total;
    const vb = galaxyCurveAt(b.r, visibleOnly).total;
    // Without a halo, going out costs speed.
    expect(vb).toBeLessThan(va);
    // With one, it barely changes: that difference is the whole lesson.
    expect(Math.abs(b.total - a.total) / a.total).toBeLessThan(0.1);
  });

  test('galaxyCurve samples from just off zero out to rMax', () => {
    const pts = galaxyCurve(MODEL, 30, 60);
    expect(pts).toHaveLength(60);
    expect(pts[0].r).toBeCloseTo(0.5, 9);
    expect(pts[pts.length - 1].r).toBeCloseTo(30, 9);
    for (const p of pts) expect(Number.isFinite(p.total)).toBe(true);
  });
});

describe('inferring mass from a speed', () => {
  test('enclosedMassFromSpeed inverts the circular-speed relation', () => {
    const M = 7.3e10;
    const r = 14;
    expect(enclosedMassFromSpeed(r, pointMassSpeed(r, M))).toBeCloseTo(M, -3);
  });

  test('a flat curve implies an enclosed mass proportional to radius', () => {
    // The single inference the lesson turns on. Hold v constant and double r:
    // the enclosed mass must double.
    const v = 200;
    const m1 = enclosedMassFromSpeed(10, v);
    const m2 = enclosedMassFromSpeed(20, v);
    expect(m2 / m1).toBeCloseTo(2, 9);
  });

  test('a Keplerian curve implies an enclosed mass that stops growing', () => {
    const M = 5e10;
    const a = enclosedMassFromSpeed(10, pointMassSpeed(10, M));
    const b = enclosedMassFromSpeed(30, pointMassSpeed(30, M));
    expect(b / a).toBeCloseTo(1, 6);
  });
});

describe('fit quality against observed points', () => {
  const MODEL = {
    bulgeMass: 1e10,
    discMass: 3e10,
    discScale: 2.6,
    haloVFlat: 150,
    haloCore: 8,
  };

  test('a model measured against its own curve has zero residual', () => {
    const observed = galaxyCurve(MODEL, 30, 12).map(p => ({
      r: p.r,
      v: p.total,
    }));
    const fit = curveResidual(observed, MODEL);
    expect(fit.rms).toBeLessThan(1e-9);
    expect(fit.n).toBe(12);
  });

  test('a worse model has a larger residual, and the worst point is named', () => {
    const observed = galaxyCurve(MODEL, 30, 12).map(p => ({
      r: p.r,
      v: p.total,
    }));
    const stripped = { ...MODEL, haloVFlat: 0 };
    const fit = curveResidual(observed, stripped);
    const good = curveResidual(observed, MODEL);
    // The absolute size is not the claim; the claim is that the residual goes
    // from nothing to tens of km/s, which is far above the uncertainty on any
    // real rotation curve.
    expect(fit.rms).toBeGreaterThan(30);
    expect(fit.rms).toBeGreaterThan(good.rms + 30);
    // Removing the halo hurts most where the halo was doing most of the work,
    // which is the outer curve.
    expect(fit.worstR).toBeGreaterThan(15);
    expect(fit.worst).toBeLessThan(0);
  });

  test('unusable points are skipped rather than poisoning the mean', () => {
    const fit = curveResidual(
      [
        { r: 10, v: NaN },
        { r: 0, v: 100 },
        { r: 10, v: galaxyCurveAt(10, MODEL).total },
      ],
      MODEL
    );
    expect(fit.n).toBe(1);
    expect(fit.rms).toBeLessThan(1e-9);
  });

  test('no usable points reports NaN rather than zero', () => {
    expect(curveResidual([], MODEL).rms).toBeNaN();
  });
});
