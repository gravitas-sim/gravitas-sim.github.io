import {
  geometryFor,
  lineOfSightDepth,
  projectPositionToSky,
  projectedSeparation,
  projectVelocityLOS,
  lineOfSightVector,
  EDGE_ON_DEG,
} from '../js/observerGeometry.js';
import {
  radialVelocitySemiAmplitude,
  stellarReflexSemimajorAxis,
  planetSemimajorAxisAboutBarycenter,
  astrometricSignature,
  chooseAngularUnit,
  halfRangeOfSeries,
  maxOffsetOfPath,
  planetBulkDensity,
  minimumPlanetMass,
  dopplerShiftNm,
} from '../js/exoplanetObservables.js';

// HD 209458, from the transit and radial-velocity literature. The same numbers
// the Transit Lab scenario is built from, so the two cannot drift apart.
const HD209458 = {
  starMassSolar: 1.148,
  planetMassJupiter: 0.69,
  periodDays: 3.5247,
  semiMajorAU: 0.04747,
  planetRadiusJupiter: 1.38,
  distancePc: 48.3,
};

describe('observer geometry: the inclination convention', () => {
  test('edge-on puts the line of sight in the orbital plane', () => {
    const n = lineOfSightVector(geometryFor(0, 90));
    expect(n.x).toBeCloseTo(1, 12);
    expect(n.z).toBeCloseTo(0, 12);
  });

  test('face-on puts the line of sight perpendicular to it', () => {
    const n = lineOfSightVector(geometryFor(0, 0));
    expect(n.x).toBeCloseTo(0, 12);
    expect(n.z).toBeCloseTo(1, 12);
  });

  test('the default is edge-on, which is what a transit needs', () => {
    expect(EDGE_ON_DEG).toBe(90);
  });
});

describe('observer geometry: projection', () => {
  test('edge-on reproduces the arithmetic the light curve already used', () => {
    // Before inclination existed, lightCurve.js computed
    //   losDepth = dx cosA + dy sinA
    //   sep      = |-dx sinA + dy cosA|
    // The generalized helpers must reduce to exactly that at i = 90, or the
    // refactor silently changes every existing transit result.
    const g = geometryFor(37, 90);
    const p = { x: 12.5, y: -4.25 };
    const A = (37 * Math.PI) / 180;
    expect(lineOfSightDepth(p, g)).toBeCloseTo(
      p.x * Math.cos(A) + p.y * Math.sin(A),
      12
    );
    expect(projectedSeparation(p, g)).toBeCloseTo(
      Math.abs(-p.x * Math.sin(A) + p.y * Math.cos(A)),
      12
    );
  });

  test('a circular orbit projects to a circle when seen face-on', () => {
    const g = geometryFor(0, 0);
    const radii = [0, 1, 2, 3, 4, 5].map(k => {
      const t = (k * Math.PI) / 3;
      const sky = projectPositionToSky({ x: Math.cos(t), y: Math.sin(t) }, g);
      return Math.hypot(sky.x, sky.y);
    });
    for (const r of radii) expect(r).toBeCloseTo(1, 12);
  });

  test('and collapses to a line when seen edge-on', () => {
    const g = geometryFor(0, 90);
    for (const k of [0, 1, 2, 3]) {
      const t = (k * Math.PI) / 4;
      const sky = projectPositionToSky({ x: Math.cos(t), y: Math.sin(t) }, g);
      expect(sky.y).toBeCloseTo(0, 12);
    }
  });

  test('an intermediate inclination gives an ellipse, squashed by cos i', () => {
    const g = geometryFor(0, 60);
    // The axis along e2 is foreshortened by cos i; the axis along e1 is not.
    const a = projectPositionToSky({ x: 0, y: 1 }, g); // along e1
    const b = projectPositionToSky({ x: 1, y: 0 }, g); // along e2
    expect(Math.hypot(a.x, a.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(b.x, b.y)).toBeCloseTo(Math.cos(Math.PI / 3), 12);
  });

  test('position angle rotates the projection without resizing it', () => {
    // Same physical orbit, two observers standing at different position
    // angles: the sky ellipse turns, its semi-axes do not change.
    const sample = phi => {
      const g = geometryFor(phi, 55);
      let max = 0;
      for (let k = 0; k < 720; k++) {
        const t = (k * Math.PI) / 360;
        const sky = projectPositionToSky({ x: Math.cos(t), y: Math.sin(t) }, g);
        max = Math.max(max, Math.hypot(sky.x, sky.y));
      }
      return max;
    };
    expect(sample(0)).toBeCloseTo(sample(140), 10);
  });
});

describe('observer geometry: radial velocity', () => {
  test('edge-on at quadrature sees the full orbital speed', () => {
    const g = geometryFor(0, 90);
    // Moving straight along the line of sight, toward the observer.
    expect(projectVelocityLOS({ x: 30, y: 0 }, g)).toBeCloseTo(-30, 12);
  });

  test('a planar orbit produces no radial velocity face-on', () => {
    const g = geometryFor(0, 0);
    for (const v of [
      { x: 30, y: 0 },
      { x: 0, y: 30 },
      { x: -12, y: 7 },
    ]) {
      expect(projectVelocityLOS(v, g)).toBeCloseTo(0, 12);
    }
  });

  test('amplitude scales as sin i between those two limits', () => {
    const v = { x: 25, y: 0 };
    for (const i of [90, 60, 30, 10]) {
      expect(projectVelocityLOS(v, geometryFor(0, i))).toBeCloseTo(
        -25 * Math.sin((i * Math.PI) / 180),
        12
      );
    }
  });

  test('receding is positive and approaching is negative', () => {
    const g = geometryFor(0, 90);
    // The line-of-sight vector points toward the observer, so +x is toward us.
    expect(projectVelocityLOS({ x: 10, y: 0 }, g)).toBeLessThan(0);
    expect(projectVelocityLOS({ x: -10, y: 0 }, g)).toBeGreaterThan(0);
  });
});

describe('radial-velocity semi-amplitude', () => {
  test('reproduces the measured K of HD 209458 b', () => {
    // The published semi-amplitude is about 84 m/s. This is the check that the
    // scenario parameters, the constants and the formula agree with reality
    // rather than merely with each other.
    const K = radialVelocitySemiAmplitude(HD209458);
    expect(K).toBeGreaterThan(80);
    expect(K).toBeLessThan(88);
  });

  test('reproduces the Sun pulled by Jupiter, about 12.5 m/s', () => {
    const K = radialVelocitySemiAmplitude({
      starMassSolar: 1,
      planetMassJupiter: 1,
      periodDays: 4332.59,
    });
    expect(K).toBeGreaterThan(12);
    expect(K).toBeLessThan(13);
  });

  test('scales linearly with sin i', () => {
    const at = i =>
      radialVelocitySemiAmplitude({ ...HD209458, inclinationDeg: i });
    const edge = at(90);
    expect(at(30) / edge).toBeCloseTo(Math.sin(Math.PI / 6), 10);
    expect(at(60) / edge).toBeCloseTo(Math.sin(Math.PI / 3), 10);
  });

  test('vanishes face-on', () => {
    expect(
      radialVelocitySemiAmplitude({ ...HD209458, inclinationDeg: 0 })
    ).toBeCloseTo(0, 10);
  });

  test('a heavier planet gives a bigger signal', () => {
    const light = radialVelocitySemiAmplitude({
      ...HD209458,
      planetMassJupiter: 0.5,
    });
    const heavy = radialVelocitySemiAmplitude({
      ...HD209458,
      planetMassJupiter: 2,
    });
    expect(heavy).toBeGreaterThan(light);
  });

  test('eccentricity applies the 1/sqrt(1 - e^2) factor', () => {
    const circular = radialVelocitySemiAmplitude(HD209458);
    const eccentric = radialVelocitySemiAmplitude({
      ...HD209458,
      eccentricity: 0.6,
    });
    expect(eccentric / circular).toBeCloseTo(1 / Math.sqrt(1 - 0.36), 10);
  });

  test('refuses unphysical input rather than returning a plausible number', () => {
    expect(
      radialVelocitySemiAmplitude({ ...HD209458, periodDays: 0 })
    ).toBeNaN();
    expect(
      radialVelocitySemiAmplitude({ ...HD209458, eccentricity: 1 })
    ).toBeNaN();
  });
});

describe('minimum mass, the quantity RV alone delivers', () => {
  test('inverts the forward calculation', () => {
    const K = radialVelocitySemiAmplitude(HD209458);
    const mSinI = minimumPlanetMass({
      semiAmplitudeMs: K,
      starMassSolar: HD209458.starMassSolar,
      periodDays: HD209458.periodDays,
    });
    expect(mSinI).toBeCloseTo(HD209458.planetMassJupiter, 4);
  });

  test('a face-on system reports a mass far below the truth', () => {
    // The whole point of M sin i: the same planet seen at 20 degrees returns a
    // minimum mass about sin(20) of its real one.
    const K = radialVelocitySemiAmplitude({ ...HD209458, inclinationDeg: 20 });
    const mSinI = minimumPlanetMass({
      semiAmplitudeMs: K,
      starMassSolar: HD209458.starMassSolar,
      periodDays: HD209458.periodDays,
    });
    expect(mSinI / HD209458.planetMassJupiter).toBeCloseTo(
      Math.sin((20 * Math.PI) / 180),
      3
    );
  });
});

describe('stellar reflex orbit', () => {
  test('splits the separation by the mass ratio', () => {
    const aStar = stellarReflexSemimajorAxis(HD209458);
    const aPlanet = planetSemimajorAxisAboutBarycenter(HD209458);
    expect(aStar + aPlanet).toBeCloseTo(HD209458.semiMajorAU, 12);
    expect(aStar).toBeLessThan(aPlanet);
  });

  test('the Sun orbits the barycenter of the Sun-Jupiter pair', () => {
    // About a thousandth of Jupiter's orbit, which is roughly one solar radius.
    const aStar = stellarReflexSemimajorAxis({
      semiMajorAU: 5.2028,
      starMassSolar: 1,
      planetMassJupiter: 1,
    });
    expect(aStar).toBeGreaterThan(0.004);
    expect(aStar).toBeLessThan(0.006);
  });
});

describe('astrometric signature', () => {
  test('one AU at one parsec is one arcsecond, by definition', () => {
    const sig = astrometricSignature({ starReflexAU: 1, distancePc: 1 });
    expect(sig.arcsec).toBeCloseTo(1, 12);
    expect(sig.mas).toBeCloseTo(1e3, 9);
    expect(sig.microarcsec).toBeCloseTo(1e6, 6);
  });

  test('doubling the distance halves the angle', () => {
    const near = astrometricSignature({ starReflexAU: 0.5, distancePc: 10 });
    const far = astrometricSignature({ starReflexAU: 0.5, distancePc: 20 });
    expect(far.arcsec).toBeCloseTo(near.arcsec / 2, 12);
  });

  test('HD 209458 b is a sub-microarcsecond target', () => {
    const aStar = stellarReflexSemimajorAxis(HD209458);
    const sig = astrometricSignature({
      starReflexAU: aStar,
      distancePc: HD209458.distancePc,
    });
    expect(sig.microarcsec).toBeGreaterThan(0.4);
    expect(sig.microarcsec).toBeLessThan(0.8);
  });

  test('Jupiter and the Sun at 10 pc are a thousand times easier', () => {
    const aStar = stellarReflexSemimajorAxis({
      semiMajorAU: 5.2028,
      starMassSolar: 1,
      planetMassJupiter: 1,
    });
    const sig = astrometricSignature({ starReflexAU: aStar, distancePc: 10 });
    expect(sig.microarcsec).toBeGreaterThan(400);
    expect(sig.microarcsec).toBeLessThan(600);
  });

  test('picks a unit that leaves a readable number', () => {
    expect(chooseAngularUnit(2.5).unit).toBe('arcsec');
    expect(chooseAngularUnit(0.0025).unit).toBe('mas');
    expect(chooseAngularUnit(6.3e-7).unit).toBe('µas');
    expect(chooseAngularUnit(6.3e-7).value).toBeCloseTo(0.63, 6);
  });
});

describe('bulk density', () => {
  test('one Earth mass in one Earth radius is Earth density', () => {
    const d = planetBulkDensity({ massEarth: 1, radiusEarth: 1 });
    expect(d.gramsPerCm3).toBeGreaterThan(5.4);
    expect(d.gramsPerCm3).toBeLessThan(5.6);
    expect(d.relativeToEarth).toBeCloseTo(1, 10);
  });

  test('doubling the radius at fixed mass divides density by eight', () => {
    const a = planetBulkDensity({ massEarth: 1, radiusEarth: 1 });
    const b = planetBulkDensity({ massEarth: 1, radiusEarth: 2 });
    expect(a.gramsPerCm3 / b.gramsPerCm3).toBeCloseTo(8, 9);
  });

  test('HD 209458 b comes out far less dense than water', () => {
    const d = planetBulkDensity({
      massJupiter: HD209458.planetMassJupiter,
      radiusJupiter: HD209458.planetRadiusJupiter,
    });
    expect(d.gramsPerCm3).toBeGreaterThan(0.2);
    expect(d.gramsPerCm3).toBeLessThan(0.5);
  });

  test('Jupiter itself lands near 1.3 g/cm3', () => {
    const d = planetBulkDensity({ massJupiter: 1, radiusJupiter: 1 });
    expect(d.gramsPerCm3).toBeGreaterThan(1.2);
    expect(d.gramsPerCm3).toBeLessThan(1.4);
  });
});

describe('Doppler shift', () => {
  test('a 100 m/s recession reddens a line by v/c of its wavelength', () => {
    const shift = dopplerShiftNm(100, 500);
    expect(shift).toBeCloseTo((500 * 100) / 299792458, 15);
    expect(shift).toBeGreaterThan(0);
  });

  test('approaching shifts the other way', () => {
    expect(dopplerShiftNm(-100, 500)).toBeLessThan(0);
  });

  test('the shift is far too small to change a star visible color', () => {
    // 84 m/s on a 500 nm line is under a thousandth of a nanometre. Worth
    // asserting, because the lesson must not draw a star turning blue.
    expect(Math.abs(dopplerShiftNm(84, 500))).toBeLessThan(1e-3);
  });
});

// =============================================================================
// What a live run has actually measured
// -----------------------------------------------------------------------------
// The two panels used to overstate what they had measured, in the same way and
// for the same reason: each reported a derived orbital element when what it
// held was a property of the samples.
//
// Radial velocity called (max - min) / 2 the semi-amplitude K and declared the
// run complete as soon as the samples included both a positive and a negative
// velocity. Astrometry called the largest offset from the barycenter the
// semi-major axis of the reflex orbit.
//
// These tests pin the three cases that separate the honest reading from the
// overstated one.
// =============================================================================

describe('the radial-velocity half-range and its coverage test', () => {
  /** A sinusoid, sampled over `cycles` periods starting at `phase`. */
  const sine = (n, { cycles = 1, phase = 0, K = 50, gamma = 0 } = {}) =>
    Array.from({ length: n }, (_, i) => ({
      x: i,
      y: gamma + K * Math.sin(phase + (2 * Math.PI * cycles * i) / (n - 1)),
    }));

  test('a short run through a zero crossing is not complete', () => {
    // The case the old test got wrong. Three per cent of a cycle centred on the
    // ascending node: the samples straddle zero, so "has visited both signs"
    // was satisfied, and the reported K was a twentieth of the truth.
    const run = sine(40, { cycles: 0.03, phase: -0.03 * Math.PI, K: 50 });
    const measured = halfRangeOfSeries(run);

    const sawBothSigns = measured.min < 0 && measured.max > 0;
    expect(sawBothSigns).toBe(true);

    expect(measured.complete).toBe(false);
    // And the number it does report is a small fraction of the real K, which is
    // exactly why calling it complete mattered.
    expect(measured.halfRange).toBeLessThan(50 * 0.1);
  });

  test('a fully sampled circular orbit is complete, and its half-range is K', () => {
    const run = sine(200, { cycles: 1, K: 84 });
    const measured = halfRangeOfSeries(run);

    expect(measured.complete).toBe(true);
    expect(measured.halfRange).toBeCloseTo(84, 1);
  });

  test('three quarters of a cycle covering both extremes is complete', () => {
    // Coverage is about having seen both extremes turn around, not about having
    // watched a whole period. This run starts below the maximum, rises over it,
    // falls through the minimum and climbs away again - less than a full cycle,
    // and enough to establish the range. It is also the case an earlier
    // "two midline crossings" rule rejected.
    const run = sine(120, { cycles: 0.75, phase: Math.PI / 2 - 0.5, K: 84 });
    const measured = halfRangeOfSeries(run);

    expect(measured.complete).toBe(true);
    expect(measured.halfRange).toBeCloseTo(84, 0);
  });

  test('a curve that never changes sign can still be complete', () => {
    // A system receding at 30 km/s never produces a negative radial velocity.
    // Under the old test its run could never be complete however long it was
    // watched; the sign of a radial velocity is a fact about the systemic
    // velocity, not about phase coverage.
    const run = sine(200, { cycles: 1, K: 84, gamma: 30000 });
    const measured = halfRangeOfSeries(run);

    expect(measured.min).toBeGreaterThan(0);
    expect(measured.complete).toBe(true);
    expect(measured.halfRange).toBeCloseTo(84, 1);
  });

  test('a monotonic arc is never complete, however many samples it has', () => {
    const climbing = Array.from({ length: 500 }, (_, i) => ({ x: i, y: i }));
    expect(halfRangeOfSeries(climbing).complete).toBe(false);
  });

  test('too few samples produce no reading at all', () => {
    expect(halfRangeOfSeries(sine(5))).toBeNull();
    expect(halfRangeOfSeries([])).toBeNull();
  });
});

describe('the astrometric maximum offset is not a semi-major axis', () => {
  /**
   * A star's path about the barycenter, which sits at a focus.
   *
   * Face-on, so the sky path is the true orbit: r = a(1 - e²)/(1 + e cos θ).
   */
  const focalOrbit = (a, e, n = 360) =>
    Array.from({ length: n }, (_, i) => {
      const theta = (2 * Math.PI * i) / n;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
      return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    });

  test('a face-on eccentric orbit with a = 1 AU and e = 0.5 reports 1.5, not 1', () => {
    // The measurement is the apoapsis distance a(1 + e). That is the correct
    // value for what the panel measures, and the reason the panel must not call
    // it a semi-major axis: presented as one it would claim a = 1.5 AU for an
    // orbit whose semi-major axis is 1.
    const path = focalOrbit(1, 0.5);
    const maxOffset = maxOffsetOfPath(path);

    expect(maxOffset).toBeCloseTo(1.5, 3);
    expect(maxOffset).not.toBeCloseTo(1.0, 1);

    // What a semi-major axis actually is, for contrast: half the long diameter,
    // which is the mean of periapsis and apoapsis.
    const distances = path.map(p => Math.hypot(p.x, p.y));
    const periapsis = Math.min(...distances);
    const semiMajor = (periapsis + maxOffset) / 2;
    expect(semiMajor).toBeCloseTo(1.0, 3);
  });

  test('a circular orbit is the case where the two coincide', () => {
    const path = focalOrbit(1, 0);
    expect(maxOffsetOfPath(path)).toBeCloseTo(1.0, 6);
  });

  test('too few points produce no reading at all', () => {
    expect(maxOffsetOfPath([{ x: 1, y: 0 }])).toBeNull();
    expect(maxOffsetOfPath([])).toBeNull();
  });
});
