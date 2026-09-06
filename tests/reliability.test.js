import {
  VERDICT,
  CONSERVATION,
  DEFAULT_TOLERANCE,
  conservationExpectation,
  comparable,
  relativeChange,
  compareSeries,
  conservationTrend,
  reliabilityReport,
  explain,
} from '../js/experiments/reliability.js';

/** A recorded run in the shape the bench hands over. */
const run = (over = {}) => ({
  step: 0.1,
  duration: 100,
  energyDrift: 1e-6,
  angularDrift: 1e-12,
  caveats: [],
  bodyCount: 3,
  baselineBodyCount: 3,
  perturbed: false,
  ...over,
});

/** Paired samples of a series, from a generator of (t) -> [a, b]. */
const pairs = (n, fn) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const [a, b] = fn(t);
    return { t, a, b };
  });

describe('when conservation means anything', () => {
  test('a closed Newtonian scene expects it', () => {
    const e = conservationExpectation(run());
    expect(e.status).toBe(CONSERVATION.EXPECTED);
    expect(e.reasons).toEqual([]);
  });

  test('the caveats physics.js already reports are carried through', () => {
    // Not re-derived here. Every entry in that list names a way the scene is
    // not closed, and any one of them makes a drifting energy the model
    // working as designed rather than a broken integration.
    for (const caveat of [
      'caveat.merging',
      'caveat.staticBlackHole',
      'caveat.oneWayGravity',
      'caveat.orbitDecay',
      'caveat.tidalDisruption',
      'caveat.mond',
      'caveat.halo',
    ]) {
      const e = conservationExpectation(run({ caveats: [caveat] }));
      expect(e.status).toBe(CONSERVATION.NOT_EXPECTED);
      expect(e.reasons).toContain(caveat);
    }
  });

  test('a merger mid-run is a legitimate discontinuity, not a failure', () => {
    const e = conservationExpectation(run({ bodyCount: 2, baselineBodyCount: 3 }));
    expect(e.status).toBe(CONSERVATION.NOT_EXPECTED);
    expect(e.reasons).toContain('caveat.bodyCountChanged');
  });

  test('an impulse the student applied is an external force', () => {
    const e = conservationExpectation(run({ perturbed: true }));
    expect(e.status).toBe(CONSERVATION.NOT_EXPECTED);
    expect(e.reasons).toContain('caveat.appliedImpulse');
  });
});

describe('whether two runs can be compared at all', () => {
  test('the same experiment at two steps can', () => {
    expect(comparable(run(), run({ step: 0.05 })).ok).toBe(true);
  });

  test('different durations cannot', () => {
    const r = comparable(run(), run({ step: 0.05, duration: 160 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('differentDurations');
  });

  test('a merger in one run and not the other cannot', () => {
    // The most important case to catch. Two runs containing different numbers
    // of bodies are measurements of different systems, and the mismatch is a
    // more interesting finding than any number the comparison would produce.
    const r = comparable(run(), run({ step: 0.05, bodyCount: 2 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('differentSystems');
  });

  test('a fine run that is not finer cannot', () => {
    expect(comparable(run(), run({ step: 0.1 })).reason).toBe('stepNotHalved');
    expect(comparable(run(), run({ step: 0.2 })).reason).toBe('stepNotHalved');
  });

  test('a missing run is refused rather than guessed at', () => {
    expect(comparable(null, run()).ok).toBe(false);
    expect(comparable(run(), run({ duration: 0 })).reason).toBe('noDuration');
  });
});

describe('relative change', () => {
  test('it scales by the larger magnitude', () => {
    expect(relativeChange(100, 101)).toBeCloseTo(1 / 101, 9);
    expect(relativeChange(-4, -4)).toBe(0);
  });

  test('a quantity passing through zero does not report infinity', () => {
    expect(Number.isFinite(relativeChange(0, 0))).toBe(true);
    expect(relativeChange(0, 0)).toBe(0);
  });

  test('a non-number gives null rather than NaN', () => {
    expect(relativeChange(NaN, 1)).toBeNull();
    expect(relativeChange(1, undefined)).toBeNull();
  });
});

describe('a well-resolved two-body orbit', () => {
  // The case that should pass cleanly: halving the step changes nothing that
  // matters, energy drift falls, and the answer is about the system.
  const coarse = run({ step: 0.1, energyDrift: 4e-6 });
  const fine = run({ step: 0.05, energyDrift: 1e-6 });

  test('the outcome is reported as converging', () => {
    const r = reliabilityReport({
      coarse,
      fine,
      outcomeCoarse: 198.72,
      outcomeFine: 198.71,
    });
    expect(r.verdict).toBe(VERDICT.CONVERGING);
    expect(r.outcome.agrees).toBe(true);
    expect(r.outcome.change).toBeLessThan(DEFAULT_TOLERANCE);
  });

  test('the drift fell, and that is reported separately from the verdict', () => {
    const t = conservationTrend(coarse, fine);
    expect(t.status).toBe(CONSERVATION.EXPECTED);
    expect(t.improved).toBe(true);
    // Quartered, which is what a second-order scheme does. Reported as an
    // observed ratio rather than asserted as an order.
    expect(t.energy.ratio).toBeCloseTo(4, 5);
  });

  test('a converging verdict still does not claim the answer is right', () => {
    const r = reliabilityReport({
      coarse,
      fine,
      outcomeCoarse: 198.72,
      outcomeFine: 198.71,
    });
    const said = explain(r);
    expect(said.headline).toBe('reliability.verdict.converging');
    expect(said.notes).toContain('reliability.stillNotProof');
    expect(JSON.stringify(said)).not.toMatch(/accurate|correct|proven/i);
  });
});

describe('an under-resolved encounter', () => {
  test('an outcome that moves when the step is halved is unresolved', () => {
    const r = reliabilityReport({
      coarse: run({ step: 1, energyDrift: 9e-3 }),
      fine: run({ step: 0.5, energyDrift: 2e-5 }),
      outcomeCoarse: 20,
      outcomeFine: 13.03,
    });
    expect(r.verdict).toBe(VERDICT.UNRESOLVED);
    expect(r.reason).toBe('outcomeMoved');
    expect(r.outcome.change).toBeGreaterThan(0.3);
  });

  test('a series wrong from the first samples is unresolved, not chaotic', () => {
    // The discriminator. A badly resolved integration is wrong immediately;
    // a chaotic one agrees at the start.
    const aligned = pairs(30, t => [Math.sin(t * 6), Math.sin(t * 6) + 0.5]);
    const r = reliabilityReport({
      coarse: run({ step: 1 }),
      fine: run({ step: 0.5 }),
      aligned,
    });
    expect(r.verdict).toBe(VERDICT.UNRESOLVED);
    expect(r.reason).toBe('disagreedFromTheStart');
    expect(r.series.earlyAgrees).toBe(false);
  });

  test('energy conservation alone cannot rescue it', () => {
    // The case the binary-stars investigation ships: both runs conserve energy
    // beautifully and give different answers. The verdict must come from the
    // outcome, and it does.
    const r = reliabilityReport({
      coarse: run({ step: 1, energyDrift: 1.8e-6 }),
      fine: run({ step: 0.5, energyDrift: 9.6e-7 }),
      outcomeCoarse: 20,
      outcomeFine: 13,
    });
    expect(r.conservation.status).toBe(CONSERVATION.EXPECTED);
    expect(r.conservation.improved).toBe(true);
    expect(r.verdict).toBe(VERDICT.UNRESOLVED);
  });

  test('a drift that failed to fall is said, but is not the verdict', () => {
    const r = reliabilityReport({
      coarse: run({ step: 1, energyDrift: 1e-5 }),
      fine: run({ step: 0.5, energyDrift: 4e-5 }),
      outcomeCoarse: 10,
      outcomeFine: 10.001,
    });
    // The outcome held, so the verdict is converging...
    expect(r.verdict).toBe(VERDICT.CONVERGING);
    // ...and the diagnostic that did not behave is reported alongside it.
    expect(r.conservation.improved).toBe(false);
    expect(explain(r).notes).toContain('reliability.driftDidNotFall');
  });
});

describe('legitimate nonconservative behaviour', () => {
  test('a merging scenario is not judged on its energy', () => {
    const coarse = run({ step: 0.1, caveats: ['caveat.merging'], energyDrift: 0.4 });
    const fine = run({ step: 0.05, caveats: ['caveat.merging'], energyDrift: 0.4 });
    const r = reliabilityReport({
      coarse,
      fine,
      outcomeCoarse: 5.2,
      outcomeFine: 5.19,
    });
    // Forty per cent energy drift, and the outcome still converged. Both of
    // those are true and the panel must say both.
    expect(r.verdict).toBe(VERDICT.CONVERGING);
    expect(r.conservation.status).toBe(CONSERVATION.NOT_EXPECTED);
    expect(r.conservation.improved).toBeNull();
    expect(explain(r).notes).toContain('reliability.conservationNotExpected');
    expect(explain(r).notes).not.toContain('reliability.driftDidNotFall');
  });

  test('a static black hole is a fixed body, and fixed bodies do work', () => {
    const t = conservationTrend(
      run({ caveats: ['caveat.staticBlackHole'], energyDrift: 0.2 }),
      run({ step: 0.05, caveats: ['caveat.staticBlackHole'], energyDrift: 0.2 })
    );
    expect(t.status).toBe(CONSERVATION.NOT_EXPECTED);
    expect(t.reasons).toContain('caveat.staticBlackHole');
  });

  test('orbital decay is nonconservative on purpose', () => {
    const r = reliabilityReport({
      coarse: run({ caveats: ['caveat.orbitDecay'], energyDrift: 0.05 }),
      fine: run({ step: 0.05, caveats: ['caveat.orbitDecay'], energyDrift: 0.05 }),
      outcomeCoarse: 1.5,
      outcomeFine: 1.5,
    });
    expect(r.verdict).toBe(VERDICT.CONVERGING);
    expect(r.conservation.reasons).toContain('caveat.orbitDecay');
  });
});

describe('chaos', () => {
  test('a path that agrees early and parts late is diverged, not unresolved', () => {
    // Exponential separation from a common start: the signature of chaos, and
    // not a reason to distrust the integration.
    const aligned = pairs(60, t => [
      Math.sin(t * 8),
      Math.sin(t * 8) + 1e-6 * Math.exp(14 * t),
    ]);
    const r = reliabilityReport({
      coarse: run({ step: 0.1 }),
      fine: run({ step: 0.05 }),
      aligned,
      outcomeCoarse: 3.14,
      outcomeFine: 3.141,
    });
    expect(r.verdict).toBe(VERDICT.DIVERGED);
    expect(r.reason).toBe('trajectoryDiverged');
    expect(r.series.earlyAgrees).toBe(true);
    expect(r.series.wholeAgrees).toBe(false);
    // And the advice that follows from it.
    expect(explain(r).notes).toContain('reliability.quoteStatistics');
  });

  test('a diverged path whose aggregate also moved is just unresolved', () => {
    // Chaos is only a usable answer if something survived it. When the
    // statistic moved too, there is nothing left to quote.
    const aligned = pairs(60, t => [
      Math.sin(t * 8),
      Math.sin(t * 8) + 1e-6 * Math.exp(14 * t),
    ]);
    const r = reliabilityReport({
      coarse: run({ step: 0.1 }),
      fine: run({ step: 0.05 }),
      aligned,
      outcomeCoarse: 3.14,
      outcomeFine: 4.9,
    });
    expect(r.verdict).toBe(VERDICT.UNRESOLVED);
    expect(r.reason).toBe('aggregateMovedToo');
  });

  test('the early window is a third of the run, not a handful of samples', () => {
    const aligned = pairs(30, () => [1, 1]);
    const s = compareSeries(aligned);
    expect(s.earlySamples).toBe(10);
    expect(s.n).toBe(30);
  });

  test('too short a series is refused rather than judged', () => {
    expect(compareSeries(pairs(3, () => [1, 1]))).toBeNull();
    expect(compareSeries([])).toBeNull();
  });
});

describe('the report as a whole', () => {
  test('an incomparable pair says so and judges nothing', () => {
    const r = reliabilityReport({
      coarse: run(),
      fine: run({ step: 0.05, bodyCount: 2 }),
      outcomeCoarse: 1,
      outcomeFine: 99,
    });
    expect(r.verdict).toBe(VERDICT.INCOMPARABLE);
    expect(r.reason).toBe('differentSystems');
    expect(r.outcome).toBeNull();
  });

  test('nothing measured at all is incomparable rather than converging', () => {
    // The failure mode worth guarding: two runs with no measurement agree
    // perfectly, and calling that convergence would be the worst possible bug.
    const r = reliabilityReport({ coarse: run(), fine: run({ step: 0.05 }) });
    expect(r.verdict).toBe(VERDICT.INCOMPARABLE);
    expect(r.reason).toBe('noMeasurement');
  });

  test('it carries the steps and the duration it judged', () => {
    const r = reliabilityReport({
      coarse: run({ step: 0.4 }),
      fine: run({ step: 0.2 }),
      outcomeCoarse: 2,
      outcomeFine: 2,
    });
    expect(r.steps).toEqual({ coarse: 0.4, fine: 0.2 });
    expect(r.duration).toBe(100);
  });

  test('no verdict claims accuracy in any language it speaks', () => {
    for (const v of Object.values(VERDICT)) {
      expect(`reliability.verdict.${v}`).not.toMatch(/accurate|correct|valid/i);
    }
  });
});
