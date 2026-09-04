import { describe, test, expect } from '@jest/globals';
import {
  A0_SI,
  A0_GALACTIC,
  GALACTIC_ACCEL_IN_SI,
  muSimple,
  muStandard,
  nuSimple,
  nuStandard,
  mondBoost,
  mondAccel,
  mondCircularSpeed,
  asymptoticSpeed,
  a0InSimUnits,
  mondVector,
  INTERPOLATIONS,
  DEFAULT_INTERPOLATION,
  MOND_LIMITATIONS,
  simSpeedToKmS,
  mondCurveAt,
  mondResidual,
} from '../js/mond.js';
import { G_GALACTIC, galaxyCurveAt, curveResidual } from '../js/darkMatter.js';

// =============================================================================
// The constant and its units
// =============================================================================
describe('a0 is one number, converted rather than retyped', () => {
  test('a0 is the published 1.2e-10 m/s^2', () => {
    expect(A0_SI).toBeCloseTo(1.2e-10, 22);
  });

  test('one (km/s)^2/kpc is 3.24e-14 m/s^2', () => {
    // (1000 m/s)^2 / 3.0857e19 m. Checked by hand rather than against the code.
    expect(GALACTIC_ACCEL_IN_SI).toBeCloseTo(3.2408e-14, 18);
  });

  test('a0 in galactic units is about 3700 (km/s)^2/kpc', () => {
    expect(A0_GALACTIC).toBeGreaterThan(3690);
    expect(A0_GALACTIC).toBeLessThan(3715);
    // And it is genuinely derived: converting back returns the SI value.
    expect(A0_GALACTIC * GALACTIC_ACCEL_IN_SI).toBeCloseTo(A0_SI, 22);
  });
});

// =============================================================================
// The two limits, which are the whole definition
// =============================================================================
describe('the Newtonian limit: g >> a0', () => {
  test('the boost approaches 1 from above as gN/a0 grows', () => {
    let previous = Infinity;
    for (const y of [10, 1e2, 1e4, 1e6, 1e9, 1e12]) {
      const boost = mondBoost(y * A0_GALACTIC, A0_GALACTIC);
      expect(boost).toBeGreaterThanOrEqual(1);
      expect(boost).toBeLessThan(previous);
      previous = boost;
    }
    expect(mondBoost(1e12 * A0_GALACTIC, A0_GALACTIC)).toBeCloseTo(1, 10);
  });

  test('at Earth-surface accelerations MOND is unobservable', () => {
    // 9.8 m/s^2 is 3e11 a0. The departure must be far below anything any
    // laboratory could see, or the theory would already be dead.
    const gEarth = 9.8 / GALACTIC_ACCEL_IN_SI; // in (km/s)^2/kpc
    const boost = mondBoost(gEarth, A0_GALACTIC);
    expect(boost - 1).toBeLessThan(1e-10);
  });

  test('both prescriptions agree in the Newtonian limit', () => {
    const y = 1e6;
    expect(nuSimple(y)).toBeCloseTo(1, 5);
    expect(nuStandard(y)).toBeCloseTo(1, 5);
  });

  test('the large-y series does not lose the correction to floating point', () => {
    // nu - 1 ~ 1/y for the simple form. Computed naively as
    // (1 + sqrt(1 + 4/y))/2 this underflows to exactly 1 and the correction
    // vanishes; the branch in nuSimple exists to stop that.
    const y = 1e10;
    expect(nuSimple(y) - 1).toBeGreaterThan(0);
    expect(nuSimple(y) - 1).toBeCloseTo(1 / y, 15);
  });
});

describe('the deep-MOND limit: g << a0', () => {
  test('g approaches sqrt(gN a0)', () => {
    for (const y of [1e-3, 1e-5, 1e-8]) {
      const gN = y * A0_GALACTIC;
      const g = mondAccel(gN, A0_GALACTIC);
      const deep = Math.sqrt(gN * A0_GALACTIC);
      // Fractional agreement improves as y falls, which is the statement.
      expect(Math.abs(g / deep - 1)).toBeLessThan(Math.sqrt(y));
    }
  });

  test('the agreement tightens as the field weakens', () => {
    const err = y => {
      const gN = y * A0_GALACTIC;
      return Math.abs(
        mondAccel(gN, A0_GALACTIC) / Math.sqrt(gN * A0_GALACTIC) - 1
      );
    };
    expect(err(1e-8)).toBeLessThan(err(1e-5));
    expect(err(1e-5)).toBeLessThan(err(1e-2));
  });

  test('both prescriptions share the deep limit', () => {
    const y = 1e-8;
    // nu -> 1/sqrt(y) for both, since that is what makes g -> sqrt(gN a0).
    expect(nuSimple(y) * Math.sqrt(y)).toBeCloseTo(1, 3);
    expect(nuStandard(y) * Math.sqrt(y)).toBeCloseTo(1, 3);
  });
});

// =============================================================================
// The asymptotic relation, which is the observable claim
// =============================================================================
describe('v^4 = G M a0', () => {
  test('a point mass rotation curve flattens at the predicted speed', () => {
    const M = 3.35e10; // NGC 3198's baryons, solar masses
    const predicted = asymptoticSpeed(M, A0_GALACTIC, G_GALACTIC);

    // Far outside the mass, the MOND circular speed must approach it.
    for (const r of [200, 1000, 5000]) {
      const vN = Math.sqrt((G_GALACTIC * M) / r);
      const v = mondCircularSpeed(r, vN, A0_GALACTIC);
      expect(Math.abs(v / predicted - 1)).toBeLessThan(0.05);
    }
    // And it really is flat: two decades of radius, same speed.
    const at = r =>
      mondCircularSpeed(r, Math.sqrt((G_GALACTIC * M) / r), A0_GALACTIC);
    expect(Math.abs(at(5000) / at(200) - 1)).toBeLessThan(0.05);
  });

  test('the predicted speed satisfies v^4 = G M a0 exactly', () => {
    const M = 5e10;
    const v = asymptoticSpeed(M, A0_GALACTIC, G_GALACTIC);
    expect(v ** 4).toBeCloseTo(G_GALACTIC * M * A0_GALACTIC, 0);
  });

  test('it reproduces the baryonic Tully-Fisher normalisation', () => {
    // The observed BTFR is M ~ 47 v^4 with M in solar masses and v in km/s
    // (McGaugh 2012). MOND's prediction is M = v^4/(G a0), so the coefficient
    // 1/(G a0) has to land near 47 or the theory is not describing real
    // galaxies. This is the one test here that compares against observation
    // rather than against the code's own algebra.
    const coefficient = 1 / (G_GALACTIC * A0_GALACTIC);
    expect(coefficient).toBeGreaterThan(40);
    expect(coefficient).toBeLessThan(75);
  });

  test('NGC 3198 comes out near its measured asymptote with nothing fitted', () => {
    // The widget's synthetic curve flattens at 150 km/s, which is NGC 3198's
    // published value. MOND gets there from the baryonic mass alone.
    const v = asymptoticSpeed(3.35e10, A0_GALACTIC, G_GALACTIC);
    expect(v).toBeGreaterThan(140);
    expect(v).toBeLessThan(165);
  });
});

// =============================================================================
// Continuity, finiteness and units across the transition
// =============================================================================
describe('the transition is smooth and finite', () => {
  test('the boost is continuous across nine decades', () => {
    const ys = [];
    for (let e = -6; e <= 6; e += 0.1) ys.push(10 ** e);
    let previous = mondBoost(ys[0] * A0_GALACTIC, A0_GALACTIC);
    for (const y of ys.slice(1)) {
      const boost = mondBoost(y * A0_GALACTIC, A0_GALACTIC);
      expect(Number.isFinite(boost)).toBe(true);
      // Monotone decreasing, and never by more than the step in y can justify.
      expect(boost).toBeLessThanOrEqual(previous * (1 + 1e-12));
      expect(boost / previous).toBeGreaterThan(0.8);
      previous = boost;
    }
  });

  test('no input produces NaN, Infinity or a boost below 1', () => {
    const inputs = [0, -1, NaN, Infinity, -Infinity, 1e-300, 1e300];
    for (const gN of inputs) {
      for (const a0 of inputs) {
        const boost = mondBoost(gN, a0);
        expect(Number.isFinite(boost)).toBe(true);
        expect(boost).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('mondAccel is monotone in gN', () => {
    let previous = 0;
    for (let e = -8; e <= 8; e += 0.25) {
      const g = mondAccel(10 ** e * A0_GALACTIC, A0_GALACTIC);
      expect(g).toBeGreaterThan(previous);
      previous = g;
    }
  });

  test('the vector form scales without turning the field', () => {
    const { ax, ay, boost } = mondVector(3, 4, A0_GALACTIC);
    expect(boost).toBeGreaterThan(1);
    // Same direction: the cross product with the input stays zero.
    expect(3 * ay - 4 * ax).toBeCloseTo(0, 9);
    expect(Math.hypot(ax, ay)).toBeCloseTo(5 * boost, 9);
  });

  test('a zero field is left alone rather than divided by', () => {
    const z = mondVector(0, 0, A0_GALACTIC);
    expect(z).toEqual({ ax: 0, ay: 0, boost: 1 });
  });

  test('units are consistent: the same physics in SI and in galactic units', () => {
    // A boost is dimensionless, so computing it in either unit system with a
    // consistently converted a0 has to give the same number.
    const gGalactic = 500; // (km/s)^2/kpc
    const gSI = gGalactic * GALACTIC_ACCEL_IN_SI;
    expect(mondBoost(gGalactic, A0_GALACTIC)).toBeCloseTo(
      mondBoost(gSI, A0_SI),
      12
    );
  });
});

// =============================================================================
// Simulation units
// =============================================================================
describe('carrying a0 into simulation units', () => {
  // The mapping the galaxy scenarios declare.
  const SCALE = { kpcPerUnit: 1 / 30, solarMassPerUnit: 9.604e5 };

  test('a scenario with no declared scale gets no MOND', () => {
    expect(a0InSimUnits(null, 1)).toBe(0);
    expect(a0InSimUnits({}, 1)).toBe(0);
    expect(a0InSimUnits({ kpcPerUnit: 1 / 30 }, 1)).toBe(0);
    expect(a0InSimUnits({ solarMassPerUnit: 1e6 }, 1)).toBe(0);
    expect(a0InSimUnits(SCALE, 0)).toBe(0);
  });

  test('the declared galaxy scale puts a0 near one simulation unit', () => {
    const a0 = a0InSimUnits(SCALE, 1);
    expect(a0).toBeGreaterThan(0.9);
    expect(a0).toBeLessThan(1.1);
  });

  test('the sim-unit asymptote matches the scenario’s flat curve', () => {
    // The disc scenario carries 14700 mass units of visible matter and its
    // observed curve is flat at 11 units of speed. MOND has to land there from
    // the mass alone, or the scale mapping is wrong.
    const a0 = a0InSimUnits(SCALE, 1);
    const v = asymptoticSpeed(14700, a0, 1);
    expect(v).toBeGreaterThan(10.5);
    expect(v).toBeLessThan(11.5);
  });

  test('the mapping is self-consistent: same galaxy, both unit systems', () => {
    // 14700 sim mass units at 9.604e5 M_sun each, and 11 sim speed units.
    const a0sim = a0InSimUnits(SCALE, 1);
    const vSim = asymptoticSpeed(14700, a0sim, 1);

    const massPhys = 14700 * SCALE.solarMassPerUnit;
    const vPhys = asymptoticSpeed(massPhys, A0_GALACTIC, G_GALACTIC);

    // The velocity scale implied by the mapping: V^2 = G_phys M / (G_sim L).
    const V = Math.sqrt(
      (G_GALACTIC * SCALE.solarMassPerUnit) / (1 * SCALE.kpcPerUnit)
    );
    expect(vSim * V).toBeCloseTo(vPhys, 6);
  });

  test('the implied galaxy is a real one, not an arbitrary toy', () => {
    // 1.4e10 solar masses of baryons rotating at about 120 km/s. That is an
    // ordinary spiral and it sits on the observed Tully-Fisher relation, which
    // is why this scale was chosen. The check matters because a scale picked to
    // make MOND come out right would be circular; this one has to describe a
    // galaxy that exists.
    const massPhys = 14700 * SCALE.solarMassPerUnit;
    expect(massPhys).toBeGreaterThan(8e9);
    expect(massPhys).toBeLessThan(3e10);

    const vPhys = asymptoticSpeed(massPhys, A0_GALACTIC, G_GALACTIC);
    expect(vPhys).toBeGreaterThan(100);
    expect(vPhys).toBeLessThan(150);

    // On the BTFR: M = 47 v^4 to within the relation's own scatter.
    const btfr = 47 * vPhys ** 4;
    expect(massPhys / btfr).toBeGreaterThan(0.5);
    expect(massPhys / btfr).toBeLessThan(2);
  });
});

// =============================================================================
// The prescriptions themselves
// =============================================================================
describe('the interpolating functions are inverses of each other', () => {
  for (const [name, { mu, nu }] of Object.entries(INTERPOLATIONS)) {
    test(`${name}: mu(g/a0) g = gN round-trips`, () => {
      for (const y of [1e-4, 0.01, 0.5, 1, 3, 100, 1e4]) {
        const gN = y * A0_GALACTIC;
        const g = gN * nu(y);
        // By definition mu(g/a0) * g = gN.
        expect(mu(g / A0_GALACTIC) * g).toBeCloseTo(gN, 6);
      }
    });

    test(`${name}: mu is monotone and bounded by 1`, () => {
      let previous = -1;
      for (let e = -6; e <= 6; e += 0.5) {
        const m = mu(10 ** e);
        expect(m).toBeGreaterThan(previous);
        expect(m).toBeLessThan(1);
        previous = m;
      }
    });
  }

  test('the default prescription is named and present', () => {
    expect(INTERPOLATIONS[DEFAULT_INTERPOLATION]).toBeDefined();
    expect(DEFAULT_INTERPOLATION).toBe('simple');
  });

  test('an unknown prescription falls back rather than throwing', () => {
    expect(mondBoost(A0_GALACTIC, A0_GALACTIC, 'nonsense')).toBeCloseTo(
      mondBoost(A0_GALACTIC, A0_GALACTIC, DEFAULT_INTERPOLATION),
      12
    );
  });

  test('the standard form transitions more slowly than the simple one', () => {
    // The known difference between them, and the reason Solar System bounds
    // prefer the simple form: at the same y the standard nu is larger.
    for (const y of [10, 100, 1000]) {
      expect(nuStandard(y) - 1).toBeLessThan(nuSimple(y) - 1);
    }
  });
});

describe('the limitations are carried with the code', () => {
  test('every limitation is a translatable key', () => {
    expect(MOND_LIMITATIONS.length).toBeGreaterThanOrEqual(5);
    for (const key of MOND_LIMITATIONS) {
      expect(key).toMatch(/^mond\.limitation\.[a-z]+$/);
    }
  });
});

describe('the galaxy mapping also fixes the speed scale', () => {
  const SCALE = { kpcPerUnit: 1 / 30, solarMassPerUnit: 9.604e5 };

  test('no scale, no conversion', () => {
    expect(simSpeedToKmS(null, 1)).toBe(0);
    expect(simSpeedToKmS({ kpcPerUnit: 1 / 30 }, 1)).toBe(0);
    expect(simSpeedToKmS(SCALE, 0)).toBe(0);
  });

  test('the scale model’s flat curve is a realistic galactic speed', () => {
    const V = simSpeedToKmS(SCALE, 1);
    // 11 simulation units is the flat speed the disc scenario shows.
    expect(11 * V).toBeGreaterThan(110);
    expect(11 * V).toBeLessThan(135);
  });

  test('it disagrees with the simulation’s own AU-based reading, as it must', () => {
    // The trap this function exists to avoid. A scale model is a different
    // object from a solar system and the two conversions are not the same
    // number; quoting a galactic speed through the wrong one is wrong by about
    // a fifth.
    const V = simSpeedToKmS(SCALE, 1);
    expect(V).toBeGreaterThan(10);
    expect(V).toBeLessThan(13);
    // The simulation's own velocity unit at G = 1 is about 9.4 km/s.
    expect(Math.abs(V - 9.42)).toBeGreaterThan(1);
  });

  test('speed and acceleration scales are consistent with each other', () => {
    // a = v^2 / r must hold in both systems, so the acceleration scale implied
    // by the speed scale has to be the one a0InSimUnits used.
    const V = simSpeedToKmS(SCALE, 1);
    const impliedAccelScale = (V * V) / SCALE.kpcPerUnit; // (km/s)^2/kpc per sim
    const a0sim = a0InSimUnits(SCALE, 1);
    expect(A0_GALACTIC / impliedAccelScale).toBeCloseTo(a0sim, 10);
  });
});

describe('a MOND curve for a model galaxy', () => {
  const NGC3198 = {
    bulgeMass: 0.05e10,
    discMass: 3.3e10,
    discScale: 2.6,
    haloVFlat: 150,
    haloCore: 6,
  };

  test('the halo parameters are ignored, because under MOND there is no halo', () => {
    const withHalo = mondCurveAt(20, NGC3198);
    const without = mondCurveAt(20, { ...NGC3198, haloVFlat: 0, haloCore: 1 });
    expect(withHalo.total).toBeCloseTo(without.total, 10);
    expect(withHalo.visible).toBeCloseTo(without.visible, 10);
  });

  test('the curve is boosted above the visible-matter one, more so further out', () => {
    const inner = mondCurveAt(2, NGC3198);
    const outer = mondCurveAt(28, NGC3198);
    expect(inner.total).toBeGreaterThan(inner.visible);
    expect(outer.total).toBeGreaterThan(outer.visible);
    expect(outer.boost).toBeGreaterThan(inner.boost);
  });

  // The comparison the lesson is built on, and it is worth being exact about
  // what it does and does not show.
  //
  // The synthetic curve is generated from the halo decomposition, so the halo
  // reproduces it exactly - it is the answer key. MOND has no halo, so its only
  // freedom is the disc mass, and with the disc mass the halo fit assigned it
  // overshoots by about 15%. Lower the disc to 2.1e10 and MOND matches the same
  // curve to 2 km/s, inside the error bars, using one fitted number where the
  // halo used three.
  //
  // That is the real disc-halo degeneracy rather than a contrivance: a rotation
  // curve does not measure the stellar mass-to-light ratio, so "how heavy is
  // the disc" is a free parameter in both pictures, and the two pictures want
  // different answers for it. Neither is thereby established.
  const observed = [1, 2, 3, 4, 6, 8, 11, 14, 18, 22, 26, 30].map(r => ({
    r,
    v: galaxyCurveAt(r, NGC3198).total,
  }));

  test('with the halo fit’s disc mass, MOND overshoots', () => {
    const mond = mondResidual(observed, NGC3198);
    expect(mond.n).toBe(observed.length);
    expect(mond.rms).toBeGreaterThan(10);
    // Too fast, not too slow: the boost is doing more than the curve needs.
    expect(mond.worst).toBeGreaterThan(0);
  });

  test('with a lighter disc, MOND matches to within the error bars', () => {
    const lighter = { ...NGC3198, discMass: 2.1e10 };
    const mond = mondResidual(observed, lighter);
    expect(mond.rms).toBeLessThan(4);
  });

  test('MOND needs one fitted number where the halo needs three', () => {
    // Scored the same way, so the two are comparable. The halo reproduces its
    // own answer key exactly; MOND gets within the measurement error. The point
    // is the parameter count, not the residual.
    const haloExact = curveResidual(observed, NGC3198);
    const mondBest = mondResidual(observed, { ...NGC3198, discMass: 2.1e10 });
    expect(haloExact.rms).toBeLessThan(1e-9);
    expect(mondBest.rms).toBeLessThan(4);
    // And they disagree about the disc, which is the degeneracy itself.
    expect(2.1e10 / NGC3198.discMass).toBeLessThan(0.8);
  });

  test('an empty data set reports no fit rather than a fake one', () => {
    const r = mondResidual([], NGC3198);
    expect(r.n).toBe(0);
    expect(Number.isNaN(r.rms)).toBe(true);
  });
});
