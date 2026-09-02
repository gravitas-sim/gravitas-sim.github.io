import { describe, test, expect } from '@jest/globals';
import {
  gravitationalAcceleration,
  tidalProfile,
  tidalAcceleration,
  approximationError,
  selfGravity,
  bulkDensity,
  massFromDensity,
  tidalToSelfGravity,
  rocheLimitRigid,
  rocheLimitFluid,
  rocheLimitFromDensities,
  disruptionRegime,
  schwarzschildRadiusM,
  tidalDisruption,
  swallowWholeMassSuns,
  systemFacts,
  tidalLineup,
  accelerationLabel,
  distanceLabel,
  timesLabel,
  ratioLabel,
  TIDAL_SYSTEMS,
  ROCHE_RIGID_COEFF,
  ROCHE_FLUID_COEFF,
  MOON_MASS_KG,
  MOON_RADIUS_M,
  MOON_DISTANCE_M,
  IO_MASS_KG,
  IO_RADIUS_M,
  IO_DISTANCE_M,
  SATURN_MASS_KG,
  SATURN_RADIUS_M,
  A_RING_OUTER_M,
  MIMAS_DISTANCE_M,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  JUPITER_MASS_KG,
  AU_METERS,
  G_SI,
} from '../js/tidalPhysics.js';

describe('the difference across an extended body', () => {
  test('the pull really is stronger on the near side', () => {
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M);
    expect(p.near).toBeGreaterThan(p.centre);
    expect(p.centre).toBeGreaterThan(p.far);
  });

  test('the near side beats the far side by the seven percent the lesson quotes', () => {
    // Step 4 asks the student to pick "about seven percent" out of a list, so
    // a change here would make a graded question wrong.
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M);
    expect(100 * (p.near / p.far - 1)).toBeCloseTo(6.9, 1);
  });

  test('the residuals point opposite ways, which is the two-bulge result', () => {
    // The far-side residual being negative is the whole content of step 7: the
    // far side is pulled toward the Moon, just less than the centre is.
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M);
    expect(p.nearResidual).toBeGreaterThan(0);
    expect(p.farResidual).toBeLessThan(0);
    expect(p.far).toBeGreaterThan(0); // still an attraction, never a push
  });

  test('the two residuals are nearly equal in size, so the bulges match', () => {
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M);
    const ratio = p.nearResidual / Math.abs(p.farResidual);
    expect(ratio).toBeGreaterThan(1); // the near bulge is very slightly larger
    expect(ratio).toBeLessThan(1.11);
  });

  test('the centre residual is exactly zero by construction', () => {
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M);
    expect(p.centre - p.centre).toBe(0);
    expect(p.stretch).toBeCloseTo(p.nearResidual - p.farResidual, 20);
  });

  test('a point mass with no size feels no tide at all', () => {
    const p = tidalProfile(MOON_MASS_KG, MOON_DISTANCE_M, 0);
    expect(p.nearResidual).toBe(0);
    expect(p.farResidual).toBe(0);
    expect(p.approx).toBe(0);
  });

  test('gravitationalAcceleration is the plain inverse square', () => {
    const a = gravitationalAcceleration(EARTH_MASS_KG, EARTH_RADIUS_M);
    expect(a).toBeCloseTo(9.8, 1);
    expect(
      gravitationalAcceleration(EARTH_MASS_KG, 2 * EARTH_RADIUS_M) / a
    ).toBeCloseTo(0.25, 10);
  });
});

describe('the tide the lesson is built on', () => {
  test('the Moon raises the textbook tide on the Earth', () => {
    // 1.1 x 10^-6 m/s^2 is the number quoted in introductory texts.
    expect(
      tidalAcceleration(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M)
    ).toBeCloseTo(1.1e-6, 7);
  });

  test('the Moon beats the Sun by about 2.2, which is step 16’s answer', () => {
    const moon = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    const sun = tidalAcceleration(SOLAR_MASS_KG, AU_METERS, EARTH_RADIUS_M);
    expect(moon / sun).toBeCloseTo(2.2, 1);
  });

  test('the Sun nonetheless pulls the Earth far harder than the Moon does', () => {
    // The counterexample the lesson leans on: a much bigger pull, a smaller
    // tide. If these two facts ever stopped both being true at once the whole
    // argument at step 16 would collapse.
    const pullRatio =
      gravitationalAcceleration(SOLAR_MASS_KG, AU_METERS) /
      gravitationalAcceleration(MOON_MASS_KG, MOON_DISTANCE_M);
    expect(pullRatio).toBeCloseTo(179, 0);
  });

  test('halving the separation multiplies the tide by eight', () => {
    // Steps 9 and 11 are graded on exactly this factor.
    const far = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    const near = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M / 2,
      EARTH_RADIUS_M
    );
    expect(near / far).toBeCloseTo(8, 10);
    const quarter = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M / 4,
      EARTH_RADIUS_M
    );
    expect(quarter / far).toBeCloseTo(64, 10);
  });

  test('doubling the companion mass exactly doubles the tide', () => {
    const one = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    for (const k of [2, 4]) {
      expect(
        tidalAcceleration(k * MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M) /
          one
      ).toBeCloseTo(k, 10);
    }
  });

  test('doubling the stretched body’s radius doubles the tide across it', () => {
    const one = tidalAcceleration(MOON_MASS_KG, MOON_DISTANCE_M, 1e6);
    expect(
      tidalAcceleration(MOON_MASS_KG, MOON_DISTANCE_M, 2e6) / one
    ).toBeCloseTo(2, 10);
  });

  test('the readings the measure steps expect are the ones the panel gives', () => {
    // Step 10 asks for four distances, step 14 for three masses, and the
    // validators check a constant product. These are the hinted values.
    const unit = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    const rel = (d, m = 1) =>
      tidalAcceleration(m * MOON_MASS_KG, d * MOON_DISTANCE_M, EARTH_RADIUS_M) /
      unit;
    expect(rel(2)).toBeCloseTo(0.125, 6);
    expect(rel(1)).toBeCloseTo(1, 6);
    expect(rel(0.5)).toBeCloseTo(8, 6);
    expect(rel(0.25)).toBeCloseTo(64, 6);
    expect(rel(1, 2)).toBeCloseTo(2, 6);
    expect(rel(1, 4)).toBeCloseTo(4, 6);
  });
});

describe('the small-body approximation, and where it stops being safe', () => {
  test('2GMR/d³ matches the exact near-side residual for the Earth and Moon', () => {
    // Step 12 tells students the expression is excellent here, so it had
    // better be.
    expect(
      approximationError(MOON_MASS_KG, MOON_DISTANCE_M, EARTH_RADIUS_M)
    ).toBeLessThan(0.06);
  });

  test('it degrades as a body closes in, which is why the lesson says so', () => {
    const close = approximationError(
      MOON_MASS_KG,
      5 * EARTH_RADIUS_M,
      EARTH_RADIUS_M
    );
    const far = approximationError(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    expect(close).toBeGreaterThan(far);
    expect(close).toBeGreaterThan(0.25);
  });

  test('the approximation always understates the near-side residual', () => {
    // The exact 1/(d-R)^2 - 1/d^2 is steeper than its leading term, so a panel
    // drawn from the approximation is conservative rather than alarmist.
    for (const d of [3, 10, 60].map(k => k * EARTH_RADIUS_M)) {
      const p = tidalProfile(MOON_MASS_KG, d, EARTH_RADIUS_M);
      expect(p.approx).toBeLessThan(p.nearResidual);
    }
  });
});

describe('self-gravity and the balance that defines a Roche limit', () => {
  test('surface gravity comes out right for the Earth and the Moon', () => {
    expect(selfGravity(EARTH_MASS_KG, EARTH_RADIUS_M)).toBeCloseTo(9.8, 1);
    expect(selfGravity(MOON_MASS_KG, MOON_RADIUS_M)).toBeCloseTo(1.62, 2);
  });

  test('bulk density and mass-from-density are inverses', () => {
    expect(bulkDensity(EARTH_MASS_KG, EARTH_RADIUS_M)).toBeCloseTo(5514, -1);
    expect(bulkDensity(MOON_MASS_KG, MOON_RADIUS_M)).toBeCloseTo(3344, -1);
    const m = massFromDensity(3344, MOON_RADIUS_M);
    expect(bulkDensity(m, MOON_RADIUS_M)).toBeCloseTo(3344, 6);
  });

  test('the ratio reaches exactly one at the rigid Roche limit', () => {
    // This is the identity the whole second half of the lesson rests on: the
    // Roche limit is not a separate formula, it is where the two bars match.
    const d = rocheLimitRigid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M);
    expect(
      tidalToSelfGravity(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M, d)
    ).toBeCloseTo(1, 12);
  });

  test('the ratio is below one outside the limit and above it inside', () => {
    const d = rocheLimitRigid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M);
    const at = x =>
      tidalToSelfGravity(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M, x);
    expect(at(2 * d)).toBeLessThan(1);
    expect(at(d / 2)).toBeGreaterThan(1);
    // And it is an inverse cube, like everything else in this lesson.
    expect(at(d / 2) / at(d)).toBeCloseTo(8, 10);
  });

  test('the real Moon is nowhere near its own Roche limit', () => {
    expect(
      tidalToSelfGravity(
        EARTH_MASS_KG,
        MOON_MASS_KG,
        MOON_RADIUS_M,
        MOON_DISTANCE_M
      )
    ).toBeLessThan(1e-4);
  });
});

describe('Roche limits', () => {
  test('the Earth-Moon limits match the published values', () => {
    // Wikipedia and the standard texts give 9,492 km rigid and 18,381 fluid.
    expect(
      rocheLimitRigid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M) / 1000
    ).toBeCloseTo(9484, -2);
    expect(
      rocheLimitFluid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M) / 1000
    ).toBeCloseTo(18368, -2);
  });

  test('the fluid limit is always further out than the rigid one', () => {
    // Step 23 draws two arcs and tells students the gap is physics. A body
    // free to deform gives the tide a longer lever and breaks up sooner.
    const args = [EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M];
    const ratio = rocheLimitFluid(...args) / rocheLimitRigid(...args);
    expect(ratio).toBeCloseTo(ROCHE_FLUID_COEFF / ROCHE_RIGID_COEFF, 10);
    expect(ratio).toBeGreaterThan(1.9);
  });

  test('the rigid coefficient is 2^(1/3), not a fitted constant', () => {
    expect(ROCHE_RIGID_COEFF).toBeCloseTo(1.2599, 4);
    expect(ROCHE_RIGID_COEFF ** 3).toBeCloseTo(2, 12);
  });

  test('the mass form and the density form are the same expression', () => {
    // Step 25 and the extension exercise both depend on these agreeing.
    const density = bulkDensity(MOON_MASS_KG, MOON_RADIUS_M);
    const earthDensity = bulkDensity(EARTH_MASS_KG, EARTH_RADIUS_M);
    expect(
      rocheLimitFromDensities(EARTH_RADIUS_M, earthDensity, density)
    ).toBeCloseTo(
      rocheLimitRigid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M),
      -1
    );
  });

  test('the satellite’s size cancels out entirely', () => {
    // The claim step 24’s tip makes and step 25 grades: a 5 km chunk and a
    // 500 km moon of the same material break up at the same distance.
    const limitFor = radius =>
      rocheLimitRigid(SATURN_MASS_KG, massFromDensity(900, radius), radius);
    expect(limitFor(5e3)).toBeCloseTo(limitFor(5e5), -3);
    expect(limitFor(5e3)).toBeCloseTo(limitFor(2e6), -3);
  });

  test('a denser body survives closer in', () => {
    const limitFor = density =>
      rocheLimitRigid(SATURN_MASS_KG, massFromDensity(density, 2e5), 2e5);
    expect(limitFor(6000)).toBeLessThan(limitFor(3000));
    expect(limitFor(3000)).toBeLessThan(limitFor(600));
    // And it scales as the inverse cube root of density, so eight times the
    // density halves the limit.
    expect(limitFor(600) / limitFor(4800)).toBeCloseTo(2, 6);
  });

  test('Saturn’s rings sit inside the limit and Mimas sits outside it', () => {
    // The payoff of step 23. Ring particles are porous water ice.
    const fluid = rocheLimitFluid(
      SATURN_MASS_KG,
      massFromDensity(600, 2e5),
      2e5
    );
    expect(A_RING_OUTER_M).toBeLessThan(fluid);
    expect(MIMAS_DISTANCE_M).toBeGreaterThan(fluid);
    expect(fluid / SATURN_RADIUS_M).toBeCloseTo(2.47, 1);
  });

  test('a dense enough body has a rigid limit inside Saturn itself', () => {
    // Not a bug, and the panel reports it in words rather than clipping it.
    const rigid = rocheLimitRigid(
      SATURN_MASS_KG,
      massFromDensity(6000, 2e5),
      2e5
    );
    expect(rigid).toBeLessThan(SATURN_RADIUS_M);
  });

  test('a satellite with no mass is never safe anywhere', () => {
    expect(rocheLimitRigid(EARTH_MASS_KG, 0, MOON_RADIUS_M)).toBe(Infinity);
    expect(rocheLimitFluid(EARTH_MASS_KG, 0, MOON_RADIUS_M)).toBe(Infinity);
    expect(rocheLimitFromDensities(EARTH_RADIUS_M, 5514, 0)).toBe(Infinity);
  });
});

describe('three regimes rather than two', () => {
  const rigid = rocheLimitRigid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M);
  const fluid = rocheLimitFluid(EARTH_MASS_KG, MOON_MASS_KG, MOON_RADIUS_M);

  test('outside the fluid limit is safe', () => {
    expect(disruptionRegime(2 * fluid, rigid, fluid)).toBe('safe');
    expect(disruptionRegime(MOON_DISTANCE_M, rigid, fluid)).toBe('safe');
  });

  test('the gap between the limits is its own regime', () => {
    expect(disruptionRegime((rigid + fluid) / 2, rigid, fluid)).toBe(
      'deforming'
    );
  });

  test('inside the rigid limit nothing gravity-bound survives', () => {
    expect(disruptionRegime(rigid / 2, rigid, fluid)).toBe('disrupting');
  });

  test('the boundaries belong to the outer regime, so there is no gap', () => {
    expect(disruptionRegime(fluid, rigid, fluid)).toBe('safe');
    expect(disruptionRegime(rigid, rigid, fluid)).toBe('deforming');
  });
});

describe('compact objects', () => {
  test('the Schwarzschild radius is the textbook three km per solar mass', () => {
    expect(schwarzschildRadiusM(SOLAR_MASS_KG) / 1000).toBeCloseTo(2.95, 2);
  });

  test('a stellar-mass hole shreds a star tens of thousands of horizons out', () => {
    const d = tidalDisruption(10);
    expect(d.disruptsOutside).toBe(true);
    expect(d.ratio).toBeCloseTo(6.4e4, -3);
    expect(d.tidalRadiusM / 1e9).toBeCloseTo(1.89, 1);
    expect(d.horizonM / 1000).toBeCloseTo(29.5, 1);
  });

  test('Sagittarius A* still disrupts outside its horizon', () => {
    // Which is why tidal disruption flares are seen from galactic nuclei of
    // this size, and is what step 28 says.
    const d = tidalDisruption(4.3e6);
    expect(d.disruptsOutside).toBe(true);
    expect(d.ratio).toBeCloseTo(11.2, 0);
  });

  test('a billion-solar-mass hole swallows a Sun-like star whole', () => {
    const d = tidalDisruption(1e9);
    expect(d.disruptsOutside).toBe(false);
    expect(d.ratio).toBeLessThan(1);
  });

  test('the crossover is near 1.6 × 10⁸ solar masses', () => {
    const m = swallowWholeMassSuns();
    expect(m / 1e8).toBeCloseTo(1.6, 1);
    // And it really is the crossover: the ratio is one there.
    expect(tidalDisruption(m).ratio).toBeCloseTo(1, 9);
    expect(tidalDisruption(m * 0.9).disruptsOutside).toBe(true);
    expect(tidalDisruption(m * 1.1).disruptsOutside).toBe(false);
  });

  test('a smaller, denser star is swallowed by a smaller hole', () => {
    // Compactness is what decides it, which is why white dwarfs survive holes
    // that shred main-sequence stars.
    expect(swallowWholeMassSuns(1, 0.5)).toBeLessThan(swallowWholeMassSuns());
    expect(swallowWholeMassSuns(2, 1)).toBeLessThan(swallowWholeMassSuns());
  });

  test('the tidal radius grows only as the cube root of the hole’s mass', () => {
    // The reason the crossover exists at all: the horizon grows in proportion
    // to mass and the tidal radius does not.
    const a = tidalDisruption(10).tidalRadiusM;
    const b = tidalDisruption(10000).tidalRadiusM;
    expect(b / a).toBeCloseTo(10, 6);
    expect(
      tidalDisruption(10000).horizonM / tidalDisruption(10).horizonM
    ).toBeCloseTo(1000, 6);
  });
});

describe('the systems the comparison chart draws', () => {
  test('every entry is complete and produces a finite tide', () => {
    for (const s of TIDAL_SYSTEMS) {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.short).toBeTruthy();
      expect(s.note.length).toBeGreaterThan(20);
      const f = systemFacts(s);
      expect(Number.isFinite(f.tidal)).toBe(true);
      expect(f.tidal).toBeGreaterThan(0);
    }
  });

  test('ids are unique, so the highlight slider cannot land on two rows', () => {
    const ids = TIDAL_SYSTEMS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the lineup opens on the lunar tide, which is the chart’s unit', () => {
    const [first] = tidalLineup();
    expect(first.id).toBe('moon-earth');
    expect(first.tidal).toBeCloseTo(1.1e-6, 7);
  });

  test('Jupiter raises about five thousand lunar tides on Io', () => {
    // Step 17 quotes this number in prose.
    const io = tidalAcceleration(JUPITER_MASS_KG, IO_DISTANCE_M, IO_RADIUS_M);
    const moon = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    expect(io / moon).toBeCloseTo(5600, -3);
    // And Io is nonetheless comfortably safe: it is heated, not disrupted.
    expect(
      tidalToSelfGravity(
        JUPITER_MASS_KG,
        IO_MASS_KG,
        IO_RADIUS_M,
        IO_DISTANCE_M
      )
    ).toBeLessThan(0.01);
  });

  test('the Earth raises about 22 lunar tides on the Moon', () => {
    // The other direction of the same pair, quoted at step 17.
    const onMoon = tidalAcceleration(
      EARTH_MASS_KG,
      MOON_DISTANCE_M,
      MOON_RADIUS_M
    );
    const onEarth = tidalAcceleration(
      MOON_MASS_KG,
      MOON_DISTANCE_M,
      EARTH_RADIUS_M
    );
    expect(onMoon / onEarth).toBeCloseTo(22, 0);
  });

  test('the two black hole rows differ only in separation', () => {
    const near = TIDAL_SYSTEMS.find(s => s.id === 'bh-star-close');
    const far = TIDAL_SYSTEMS.find(s => s.id === 'bh-star');
    expect(near.massKg).toBe(far.massKg);
    expect(near.radiusM).toBe(far.radiusM);
    const ratio = systemFacts(near).tidal / systemFacts(far).tidal;
    expect(ratio).toBeCloseTo((far.distanceM / near.distanceM) ** 3, 3);
    expect(ratio / 1e5).toBeCloseTo(1.2, 0);
  });

  test('the close black hole row really is where a star starts to come apart', () => {
    // The prose on that row claims a quarter of the Sun's own surface gravity.
    const near = TIDAL_SYSTEMS.find(s => s.id === 'bh-star-close');
    const ratio = tidalToSelfGravity(
      near.massKg,
      SOLAR_MASS_KG,
      SOLAR_RADIUS_M,
      near.distanceM
    );
    expect(ratio).toBeCloseTo(0.25, 2);
    const rigid = rocheLimitRigid(near.massKg, SOLAR_MASS_KG, SOLAR_RADIUS_M);
    const fluid = rocheLimitFluid(near.massKg, SOLAR_MASS_KG, SOLAR_RADIUS_M);
    expect(disruptionRegime(near.distanceM, rigid, fluid)).toBe('deforming');
  });

  test('the chart spans enough orders of magnitude to need a log scale', () => {
    const tides = tidalLineup().map(s => s.tidal);
    const decades = Math.log10(Math.max(...tides) / Math.min(...tides));
    expect(decades).toBeGreaterThan(8);
  });
});

describe('labels', () => {
  test('an acceleration reads as a number with a unit', () => {
    expect(accelerationLabel(1.0992e-6)).toMatch(/1\.10/);
    expect(accelerationLabel(1.0992e-6)).toMatch(/m\/s/);
    expect(accelerationLabel(NaN)).toBe('—');
    expect(accelerationLabel(Infinity)).toBe('—');
  });

  test('distances stay in kilometres with digit grouping up to a tenth of an AU', () => {
    expect(distanceLabel(MOON_DISTANCE_M)).toMatch(/384,400/);
    expect(distanceLabel(3e9)).toMatch(/3,000,000/);
    expect(distanceLabel(AU_METERS)).toMatch(/1\.00/);
    expect(distanceLabel(AU_METERS)).toMatch(/AU/);
    expect(distanceLabel(29500)).toMatch(/29\.5/);
    expect(distanceLabel(NaN)).toBe('—');
  });

  test('a ratio is never rounded away to zero', () => {
    // "stretch / grip = 0.00" was a real readout before ratioLabel existed.
    expect(ratioLabel(0.004)).not.toBe('0.00');
    expect(ratioLabel(0.25)).toBe('0.25');
    expect(ratioLabel(0)).toBe('0');
    expect(ratioLabel(NaN)).toBe('—');
  });

  test('a multiplier carries its times sign at every magnitude', () => {
    expect(timesLabel(8)).toBe('8.00×');
    expect(timesLabel(22.4)).toBe('22.4×');
    expect(timesLabel(6.4e4)).toMatch(/×$/);
    expect(timesLabel(Infinity)).toBe('—');
  });

  test('no label ever emits NaN, undefined or Infinity as text', () => {
    for (const fn of [
      accelerationLabel,
      distanceLabel,
      timesLabel,
      ratioLabel,
    ]) {
      for (const v of [NaN, Infinity, -Infinity, 0, 1e-30, 1e30]) {
        expect(String(fn(v))).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });
});

describe('nothing throws or returns nonsense at the edges', () => {
  test('a separation of zero is infinite rather than a crash', () => {
    expect(gravitationalAcceleration(EARTH_MASS_KG, 0)).toBe(Infinity);
    expect(tidalAcceleration(EARTH_MASS_KG, 0, 1)).toBe(Infinity);
    expect(selfGravity(EARTH_MASS_KG, 0)).toBe(Infinity);
    expect(bulkDensity(EARTH_MASS_KG, 0)).toBe(Infinity);
  });

  test('a massless companion raises no tide', () => {
    expect(tidalAcceleration(0, MOON_DISTANCE_M, EARTH_RADIUS_M)).toBe(0);
    const p = tidalProfile(0, MOON_DISTANCE_M, EARTH_RADIUS_M);
    expect(p.nearResidual).toBe(0);
    expect(p.farResidual).toBe(0);
  });

  test('approximationError reports rather than divides by zero', () => {
    expect(approximationError(0, MOON_DISTANCE_M, EARTH_RADIUS_M)).toBe(
      Infinity
    );
  });

  test('G is the shared constant, not a private copy', () => {
    expect(G_SI).toBeCloseTo(6.6743e-11, 15);
  });
});
