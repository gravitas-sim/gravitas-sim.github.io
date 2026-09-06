import {
  OUTCOME,
  EJECTION_RADIUS,
  ENERGY_DRIFT_LIMIT,
  criticalSemiMajorSType,
  criticalSemiMajorPType,
  boundaryVerdict,
  classifyRun,
  convergenceVerdict,
  outcomeMessage,
} from '../js/binaryStability.js';

// =============================================================================
// The boundary fits are transcribed from a paper, and a transcription error in
// a coefficient is invisible: the curve still looks like a curve. So they are
// checked against numbers published *outside* the fit - the widely quoted
// critical radii for equal-mass binaries, and two real systems whose planets
// are on the sides of the boundary the literature puts them on.
// =============================================================================

describe('the S-type (circumstellar) boundary', () => {
  test('an equal-mass circular binary gives the familiar 0.27 a_b', () => {
    // Holman & Wiegert 1999, section 3.1: for mu = 0.5, e = 0 the critical
    // semi-major axis is a little over a quarter of the binary separation.
    const { a } = criticalSemiMajorSType(0.5, 0);
    expect(a).toBeCloseTo(0.274, 3);
  });

  test('eccentricity shrinks the stable zone', () => {
    const circular = criticalSemiMajorSType(0.5, 0).a;
    const eccentric = criticalSemiMajorSType(0.5, 0.6).a;
    expect(eccentric).toBeLessThan(circular);
  });

  test('a heavier companion shrinks the stable zone', () => {
    expect(criticalSemiMajorSType(0.8, 0.2).a).toBeLessThan(
      criticalSemiMajorSType(0.2, 0.2).a
    );
  });

  test('alpha Centauri A reproduces the quoted ~2.8 AU', () => {
    // Masses 1.133 and 0.972 M_sun, a_b = 23.52 AU, e = 0.5179 (Pourbaix &
    // Boffin 2016). H&W applied to this pair is quoted at close to 3 AU; the
    // point of the check is the coefficients, not the third figure.
    const mu = 0.972 / (1.133 + 0.972);
    const { a } = criticalSemiMajorSType(mu, 0.5179);
    expect(a * 23.52).toBeGreaterThan(2.5);
    expect(a * 23.52).toBeLessThan(3.1);
  });

  test('the published validity range is reported rather than enforced', () => {
    // Extrapolation is allowed - the function still answers - but it says so,
    // because silently extending a fit past its data is the failure this flag
    // exists to prevent.
    expect(criticalSemiMajorSType(0.5, 0.9).inRange).toBe(false);
    expect(criticalSemiMajorSType(0.05, 0.3).inRange).toBe(false);
    expect(criticalSemiMajorSType(0.5, 0.3).inRange).toBe(true);
  });

  test('non-numeric input gets null rather than NaN', () => {
    expect(criticalSemiMajorSType(NaN, 0.2)).toBeNull();
    expect(criticalSemiMajorSType(0.5, undefined)).toBeNull();
  });
});

describe('the P-type (circumbinary) boundary', () => {
  test('an equal-mass circular binary gives the familiar ~2.4 a_b', () => {
    const { a } = criticalSemiMajorPType(0.5, 0);
    expect(a).toBeCloseTo(2.388, 3);
  });

  test('Kepler-16b sits outside its critical radius, as observed', () => {
    // Doyle et al. 2011, Science 333, 1602: M_A = 0.6897, M_B = 0.20255,
    // a_binary = 0.22431 AU, e = 0.15944, planet at 0.7048 AU. The planet is
    // famously just outside the stability boundary, which is the single best
    // check that these seven coefficients are the right seven numbers.
    const mu = 0.20255 / (0.6897 + 0.20255);
    const { a } = criticalSemiMajorPType(mu, 0.15944);
    const critical = a * 0.22431;
    expect(critical).toBeGreaterThan(0.6);
    expect(critical).toBeLessThan(0.7);
    expect(0.7048).toBeGreaterThan(critical);
  });

  test('eccentricity pushes the boundary outward', () => {
    expect(criticalSemiMajorPType(0.5, 0.5).a).toBeGreaterThan(
      criticalSemiMajorPType(0.5, 0).a
    );
  });

  test('the range stops at e = 0.7, not 0.8', () => {
    expect(criticalSemiMajorPType(0.5, 0.75).inRange).toBe(false);
    expect(criticalSemiMajorPType(0.5, 0.65).inRange).toBe(true);
  });
});

describe('boundaryVerdict', () => {
  const mu = 1 / 3;
  const e = 0.2;

  test('the S-type stable zone is inside the boundary', () => {
    const critical = criticalSemiMajorSType(mu, e).a;
    expect(boundaryVerdict('circumstellar', critical * 0.4, mu, e).side).toBe(
      'expectedSurvive'
    );
    expect(boundaryVerdict('circumstellar', critical * 1.8, mu, e).side).toBe(
      'expectedDisrupted'
    );
  });

  test('the P-type stable zone is outside the boundary - the sides swap', () => {
    const critical = criticalSemiMajorPType(mu, e).a;
    expect(boundaryVerdict('circumbinary', critical * 0.4, mu, e).side).toBe(
      'expectedDisrupted'
    );
    expect(boundaryVerdict('circumbinary', critical * 1.8, mu, e).side).toBe(
      'expectedSurvive'
    );
  });

  test('within the fit uncertainty it declines to answer', () => {
    const critical = criticalSemiMajorSType(mu, e).a;
    expect(boundaryVerdict('circumstellar', critical, mu, e).side).toBe(
      'tooCloseToCall'
    );
    expect(boundaryVerdict('circumstellar', critical + 0.01, mu, e).side).toBe(
      'tooCloseToCall'
    );
    // And the band is narrow: it does not swallow everything.
    expect(boundaryVerdict('circumstellar', critical + 0.05, mu, e).side).toBe(
      'expectedDisrupted'
    );
  });

  test('it carries the extrapolation flag through', () => {
    expect(boundaryVerdict('circumstellar', 0.1, 0.5, 0.95).inRange).toBe(
      false
    );
  });
});

describe('classifyRun', () => {
  const good = {
    alive: true,
    merged: false,
    maxDistance: 2,
    unbound: false,
    energyDrift: 1e-6,
    periodsDone: 10,
    periodsAsked: 10,
  };

  test('a quiet run that finished survived it', () => {
    expect(classifyRun(good).outcome).toBe(OUTCOME.SURVIVED);
    expect(classifyRun(good).trustworthy).toBe(true);
  });

  test('a run still in progress is running, not surviving', () => {
    expect(classifyRun({ ...good, periodsDone: 4 }).outcome).toBe(
      OUTCOME.RUNNING
    );
  });

  test('a merger is a collision', () => {
    expect(classifyRun({ ...good, merged: true, alive: false }).outcome).toBe(
      OUTCOME.COLLIDED
    );
  });

  test('ejection needs both unbound energy and distance', () => {
    const far = { ...good, maxDistance: EJECTION_RADIUS + 1 };
    // Unbound but never went anywhere: an encounter, not an ejection.
    expect(classifyRun({ ...good, unbound: true }).outcome).toBe(
      OUTCOME.SURVIVED
    );
    // Far out on a wide bound orbit is also not an ejection.
    expect(classifyRun(far).outcome).toBe(OUTCOME.SURVIVED);
    expect(classifyRun({ ...far, unbound: true }).outcome).toBe(
      OUTCOME.EJECTED
    );
  });

  test('energy drift outranks every physical outcome', () => {
    // This is the whole reason the function exists. A run that lost energy
    // conservation and then "ejected" the planet did not eject the planet.
    const drifted = { ...good, energyDrift: ENERGY_DRIFT_LIMIT * 2 };
    for (const extra of [
      { unbound: true, maxDistance: 50 },
      { merged: true, alive: false },
      {},
    ]) {
      const v = classifyRun({ ...drifted, ...extra });
      expect(v.outcome).toBe(OUTCOME.UNRELIABLE);
      expect(v.trustworthy).toBe(false);
      expect(v.reason).toBe('energyDrift');
    }
  });

  test('a planet that vanished without a merge is not a result', () => {
    const v = classifyRun({ ...good, alive: false });
    expect(v.outcome).toBe(OUTCOME.UNRELIABLE);
    expect(v.reason).toBe('vanished');
  });

  test('drift exactly at the limit is still trusted', () => {
    expect(
      classifyRun({ ...good, energyDrift: ENERGY_DRIFT_LIMIT }).outcome
    ).toBe(OUTCOME.SURVIVED);
  });

  test('the sign of the drift does not matter', () => {
    expect(
      classifyRun({ ...good, energyDrift: -ENERGY_DRIFT_LIMIT * 2 }).outcome
    ).toBe(OUTCOME.UNRELIABLE);
  });
});

describe('convergenceVerdict', () => {
  const at = (outcome, trustworthy = true) => ({ outcome, trustworthy });

  test('two trustworthy runs that agree license the outcome', () => {
    expect(
      convergenceVerdict(at(OUTCOME.EJECTED), at(OUTCOME.EJECTED))
    ).toEqual({ converged: true, outcome: OUTCOME.EJECTED, reason: null });
  });

  test('an outcome that flips with the timestep is not an outcome', () => {
    // The measured case this exists for: a planet at 0.25 binary separations
    // is ejected at dt = 1 and survives at dt = 0.25, with the energy drift
    // under the limit at both. Nothing about that is a result.
    const v = convergenceVerdict(at(OUTCOME.EJECTED), at(OUTCOME.SURVIVED));
    expect(v.converged).toBe(false);
    expect(v.outcome).toBeNull();
    expect(v.reason).toBe('outcomeChanged');
  });

  test('one untrustworthy run poisons the pair', () => {
    for (const pair of [
      [at(OUTCOME.EJECTED, false), at(OUTCOME.EJECTED)],
      [at(OUTCOME.EJECTED), at(OUTCOME.EJECTED, false)],
    ]) {
      const v = convergenceVerdict(...pair);
      expect(v.converged).toBe(false);
      expect(v.reason).toBe('unreliableRun');
    }
  });

  test('two runs that both agree they are unfinished have converged on nothing', () => {
    const v = convergenceVerdict(at(OUTCOME.RUNNING), at(OUTCOME.RUNNING));
    expect(v.converged).toBe(false);
    expect(v.reason).toBe('notFinished');
  });

  test('missing runs do not throw', () => {
    expect(convergenceVerdict(null, null).converged).toBe(false);
    expect(convergenceVerdict(undefined, at(OUTCOME.SURVIVED)).reason).toBe(
      'unreliableRun'
    );
  });
});

describe('outcomeMessage', () => {
  test('there is no key that says stable', () => {
    for (const outcome of Object.values(OUTCOME)) {
      const { key } = outcomeMessage({ outcome }, 10);
      expect(key).not.toMatch(/stable/i);
    }
  });

  test('the period count travels with the verdict', () => {
    expect(outcomeMessage({ outcome: OUTCOME.SURVIVED }, 30)).toEqual({
      key: 'binary.outcome.survived',
      periods: 30,
    });
  });
});
