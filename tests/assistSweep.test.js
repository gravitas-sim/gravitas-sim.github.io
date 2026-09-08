import { describe, test, expect } from '@jest/globals';
import {
  BASELINE,
  COLLISION_RADIUS,
  COMPARISON,
  ENCOUNTER,
  PARAMETER,
  SWEEP_VALUES,
  comparisonSpec,
  compareSides,
  defaultMu,
  describeEncounter,
  encounterDuration,
  frameAudit,
  isSafeValue,
  predictFor,
  strongestTurnGainsMost,
  sweepSpec,
} from '../js/experiments/assistSweep.js';
import { parameterFor, validateSweepSpec } from '../js/experiments/sweep.js';
import { periapsisDistance } from '../js/gravityAssist.js';
import {
  fromAssistComparison,
  fromAssistSweep,
} from '../js/notebook/capture.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';

// The panel's prose is in the deferred half of the catalogue, which nothing
// loads in a unit test. Registered here so these assertions are about the
// sentences a reader sees rather than about message ids.
registerMessages('en', EN_DEFERRED);

/** A finished trial as the bench runner hands it over, observer and all. */
const trial = ({ observed, ...over } = {}) => ({
  value: 40,
  status: 'ok',
  complete: true,
  ...over,
  observed:
    observed === null
      ? null
      : {
          phase: 'done',
          lost: false,
          startedInside: false,
          complete: true,
          gate: 4000,
          closest: 23.4,
          deflection: (58.6 * Math.PI) / 180,
          vInfBefore: 0.461,
          vInfAfter: 0.461,
          inertialBefore: 0.35,
          inertialAfter: 0.623,
          speedChange: 0.273,
          deltaVMagnitude: 0.4515,
          relativeResidual: -3.3e-14,
          planetDeltaVMagnitude: 4.515e-7,
          ledgerMismatch: 1e-10,
          massRatio: 1e-6,
          side: 'trailing',
          elapsed: 17000,
          steps: 34000,
          ...(observed || {}),
        },
});

describe('what the experiments vary, and what they hold', () => {
  test('one parameter, and it is the one the allowlist offers', () => {
    expect(PARAMETER).toBe('assist_impact_parameter');
    expect(parameterFor(BASELINE.scenario, PARAMETER)).toBeTruthy();
  });

  test('the comparison is the same magnitude on both sides', () => {
    expect(COMPARISON.gaining).toBe(-COMPARISON.losing);
    expect(COMPARISON.gaining).toBeGreaterThan(0);
  });

  test('the sweep is all on one side, and includes the pass already flown', () => {
    expect(SWEEP_VALUES.every(v => v > 0)).toBe(true);
    expect(SWEEP_VALUES).toContain(COMPARISON.gaining);
    expect([...SWEEP_VALUES].sort((a, b) => a - b)).toEqual([...SWEEP_VALUES]);
  });

  test('both specs are ones the bench will actually run', () => {
    for (const spec of [
      comparisonSpec({ frameRatio: 1 }),
      sweepSpec({ frameRatio: 1 }),
    ]) {
      expect(validateSweepSpec(spec)).toMatchObject({ ok: true });
      expect(spec.seed).toBe(BASELINE.seed);
      expect(spec.scenario).toBe(BASELINE.scenario);
    }
  });

  test('the comparison spans the excluded neighbourhood without entering it', () => {
    // +40 and -40 are both flybys; everything between -8 and +8 is a
    // collision. A span check would refuse the pair, which is why the
    // validator checks explicit values one at a time.
    const def = parameterFor(BASELINE.scenario, PARAMETER);
    const spec = comparisonSpec({ frameRatio: 1 });
    expect(Math.min(...spec.values)).toBeLessThan(def.exclude.from);
    expect(Math.max(...spec.values)).toBeGreaterThan(def.exclude.to);
    expect(validateSweepSpec(spec).ok).toBe(true);
  });

  test('a value inside the excluded neighbourhood is refused, listed by name', () => {
    const spec = { ...comparisonSpec({ frameRatio: 1 }), values: [40, 0, -40] };
    expect(validateSweepSpec(spec)).toMatchObject({
      ok: false,
      reason: 'valueExcluded',
    });
    expect(validateSweepSpec(spec).detail.inside).toEqual([0]);
  });

  test('the frame budget scales with the measured slowdown', () => {
    const plain = encounterDuration({ frameRatio: 1 });
    expect(plain).toBeGreaterThan((2 * BASELINE.gate) / BASELINE.vInfinity);
    expect(encounterDuration({ frameRatio: 4 })).toBeCloseTo(plain * 4, 6);
    // A caller with no measurement still gets a budget rather than a NaN.
    expect(encounterDuration({})).toBe(plain);
  });
});

describe('choosing values that are flybys', () => {
  test('every swept value clears the planet by a wide margin', () => {
    for (const b of SWEEP_VALUES) {
      const verdict = isSafeValue(b);
      expect(verdict.ok).toBe(true);
      expect(verdict.periapsis).toBeGreaterThan(COLLISION_RADIUS * 3);
    }
  });

  test('a pass that would hit the planet is refused, and named as such', () => {
    // 10 is inside the allowlist and outside the excluded band, so only the
    // periapsis check can catch it.
    const def = parameterFor(BASELINE.scenario, PARAMETER);
    expect(10).toBeGreaterThan(def.exclude.to);
    expect(periapsisDistance(defaultMu(), 10, BASELINE.vInfinity)).toBeLessThan(
      COLLISION_RADIUS
    );
    expect(isSafeValue(10)).toMatchObject({
      ok: false,
      reason: 'wouldCollide',
    });
  });

  test('the allowlist still applies', () => {
    expect(isSafeValue(4)).toMatchObject({ ok: false, reason: 'excluded' });
    expect(isSafeValue(9000)).toMatchObject({
      ok: false,
      reason: 'outOfRange',
    });
    expect(isSafeValue(NaN)).toMatchObject({ ok: false, reason: 'notNumeric' });
  });

  test('the two-body prediction agrees with the lesson at the pass it quotes', () => {
    const predicted = predictFor(40);
    expect(predicted.deflectionDeg).toBeCloseTo(58.64, 1);
    expect(predicted.periapsis).toBeCloseTo(23.41, 1);
  });
});

describe('reading an encounter', () => {
  test('a complete one is the only usable one', () => {
    const enc = describeEncounter(trial());
    expect(enc.outcome).toBe(ENCOUNTER.COMPLETE);
    expect(enc.usable).toBe(true);
    // Every quantity the panel and the notebook show comes off the watcher.
    expect(enc.relBefore).toBe(0.461);
    expect(enc.inertAfter).toBe(0.623);
    expect(enc.speedChange).toBe(0.273);
    expect(enc.deltaVMagnitude).toBe(0.4515);
    expect(enc.deflectionDeg).toBeCloseTo(58.6, 6);
    expect(enc.closest).toBe(23.4);
    expect(enc.gate).toBe(4000);
  });

  test('a trial that never came back out is incomplete, not a flyby', () => {
    const enc = describeEncounter(
      trial({
        complete: false,
        status: 'stalled',
        observed: { complete: false },
      })
    );
    expect(enc.outcome).toBe(ENCOUNTER.INCOMPLETE);
    expect(enc.usable).toBe(false);
  });

  test('a run whose budget expired at the gate is still incomplete', () => {
    // The watcher never reached 'done', so there is no outgoing reading even
    // though the trial itself thinks it finished.
    const enc = describeEncounter(trial({ observed: { phase: 'outbound' } }));
    expect(enc.outcome).toBe(ENCOUNTER.INCOMPLETE);
    expect(enc.usable).toBe(false);
  });

  test('a spacecraft placed inside the gate has no before to compare to', () => {
    const enc = describeEncounter(trial({ observed: { startedInside: true } }));
    expect(enc.outcome).toBe(ENCOUNTER.NO_BEFORE);
    expect(enc.usable).toBe(false);
  });

  test('a lost spacecraft is reported as lost', () => {
    const enc = describeEncounter(trial({ observed: { lost: true } }));
    expect(enc.outcome).toBe(ENCOUNTER.LOST);
    expect(enc.usable).toBe(false);
  });

  test('a trial that never ran says so rather than reading as empty', () => {
    const enc = describeEncounter({
      value: 40,
      status: 'cancelled',
      observed: null,
    });
    expect(enc.outcome).toBe(ENCOUNTER.NOT_RUN);
    expect(enc.usable).toBe(false);
    expect(enc.speedChange).toBeNull();
  });

  test('no outcome is ever an execution status', () => {
    const outcomes = Object.values(ENCOUNTER);
    for (const status of ['ok', 'stalled', 'capped', 'buildFailed']) {
      expect(outcomes).not.toContain(status);
    }
  });
});

describe('comparing the two sides', () => {
  const gaining = describeEncounter(trial({ value: 40 }));
  const losing = describeEncounter(
    trial({
      value: -40,
      observed: {
        side: 'leading',
        inertialAfter: 0.1718,
        speedChange: -0.1782,
        deflection: (-58.6 * Math.PI) / 180,
      },
    })
  );

  test('the velocity change is the same on both sides', () => {
    const sides = compareSides(gaining, losing);
    expect(sides.deltaVMismatch).toBeLessThan(1e-9);
    expect(sides.deflectionMismatch).toBeLessThan(1e-9);
    expect(sides.closestMismatch).toBeLessThan(1e-9);
  });

  test('the speed changes are not, and it does not claim they are', () => {
    const sides = compareSides(gaining, losing);
    expect(sides.gain).toBeGreaterThan(0);
    expect(sides.loss).toBeLessThan(0);
    expect(sides.symmetric).toBe(false);
    expect(sides.speedChangeRatio).toBeCloseTo(0.1782 / 0.273, 6);
  });

  test('a pass that produced no encounter produces no comparison', () => {
    const broken = describeEncounter(trial({ value: -40, observed: null }));
    expect(compareSides(gaining, broken)).toBeNull();
    expect(compareSides(broken, losing)).toBeNull();
  });
});

describe('the finite spacecraft, and what is conserved', () => {
  test('the recoil is the mass ratio, which is momentum conservation', () => {
    const audit = frameAudit(describeEncounter(trial()));
    expect(audit.massRatio).toBe(1e-6);
    expect(audit.recoilRatio).toBeCloseTo(1e-6, 12);
    expect(audit.recoilMatchesMass).toBe(true);
  });

  test('it says how non-inertial the planet frame is, and separately what held', () => {
    const audit = frameAudit(describeEncounter(trial()));
    // The frame moved between the two readings...
    expect(audit.frameShift).toBeGreaterThan(0);
    // ...and the speed relative to the planet did not change anyway.
    expect(Math.abs(audit.relativeResidual)).toBeLessThan(1e-9);
    expect(Math.abs(audit.ledgerMismatch)).toBeLessThan(1e-6);
  });

  test('a recoil that does not match the masses is not waved through', () => {
    const audit = frameAudit(
      describeEncounter(trial({ observed: { planetDeltaVMagnitude: 1e-3 } }))
    );
    expect(audit.recoilMatchesMass).toBe(false);
  });

  test('there is nothing to audit without a complete encounter', () => {
    expect(frameAudit(describeEncounter(trial({ observed: null })))).toBeNull();
  });
});

describe('what the sweep is asked about', () => {
  /** A sweep of five, with the turn and the gain both falling with b. */
  const spread = [
    [20, 96.6, 0.379],
    [30, 73.7, 0.323],
    [40, 58.6, 0.273],
    [60, 41.1, 0.202],
    [90, 28.0, 0.142],
  ].map(([b, turn, gain]) =>
    describeEncounter(
      trial({
        value: b,
        observed: {
          deflection: (turn * Math.PI) / 180,
          speedChange: gain,
        },
      })
    )
  );

  test('the strongest turn and the largest gain are read off the trials', () => {
    const verdict = strongestTurnGainsMost(spread);
    expect(verdict.n).toBe(5);
    expect(verdict.mostTurned).toBe(20);
    expect(verdict.mostGained).toBe(20);
    expect(verdict.same).toBe(true);
    expect(verdict.monotonic).toBe(true);
  });

  test('it reports a disagreement rather than assuming there is none', () => {
    // The same five with the closest pass overshooting the optimum, which is
    // what happens at other approach angles and is why this is measured.
    const overshot = [...spread];
    overshot[0] = describeEncounter(
      trial({
        value: 20,
        observed: {
          deflection: (96.6 * Math.PI) / 180,
          speedChange: 0.2,
        },
      })
    );
    const verdict = strongestTurnGainsMost(overshot);
    expect(verdict.mostTurned).toBe(20);
    expect(verdict.mostGained).toBe(30);
    expect(verdict.same).toBe(false);
    expect(verdict.monotonic).toBe(false);
  });

  test('unusable trials are left out of the verdict, not counted in it', () => {
    const withBroken = [
      ...spread,
      describeEncounter(trial({ value: 15, observed: null })),
    ];
    expect(strongestTurnGainsMost(withBroken).n).toBe(5);
  });

  test('fewer than two usable trials establish nothing', () => {
    expect(strongestTurnGainsMost([spread[0]])).toBeNull();
    expect(strongestTurnGainsMost([])).toBeNull();
  });
});

describe('what goes into the notebook', () => {
  const held = {
    vInfinity: 0.461,
    gate: 4000,
    integrator: 'Velocity Verlet',
    maxTimestep: 0.5,
    simSpeed: 400,
  };
  const gaining = describeEncounter(trial({ value: 40 }));
  const losing = describeEncounter(
    trial({
      value: -40,
      observed: {
        side: 'leading',
        inertialAfter: 0.1718,
        speedChange: -0.1782,
        deflection: (-58.6 * Math.PI) / 180,
      },
    })
  );
  const comparison = {
    kind: 'comparison',
    seed: 'assist',
    gate: 4000,
    held,
    numerics: { step: 0.5, substeps: 8 },
    gaining,
    losing,
    sides: compareSides(gaining, losing),
    audit: frameAudit(gaining),
  };

  test('the comparison keeps both speed changes and one velocity change', () => {
    const entry = fromAssistComparison({ report: comparison });
    const labels = entry.snapshot.quantities.map(q => q.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Speed change, passing behind',
        'Speed change, passing in front',
        'Velocity change, either side',
      ])
    );
    // One velocity change, because there is one: saying it twice would be two
    // numbers where the finding is that there is one.
    expect(
      labels.filter(l => l === 'Velocity change, either side')
    ).toHaveLength(1);
  });

  test('it records what was held and what it was integrated at', () => {
    const entry = fromAssistComparison({ report: comparison });
    expect(entry.snapshot.provenance.seed).toBe('assist');
    expect(entry.snapshot.provenance.numerical.integrator).toBe(
      'Velocity Verlet'
    );
    // The step the trials were actually integrated at, from the sweep's own
    // record, not the panel's setting.
    expect(entry.snapshot.provenance.numerical.maxTimestep).toBe(0.5);
    expect(entry.snapshot.provenance.numerical.substeps).toBe(8);
    expect(entry.prose.limitations).toMatch(/0\.461/);
    expect(entry.prose.limitations).toMatch(/4000/);
  });

  test('it says the two passes are not mirror images, with the ratio', () => {
    const entry = fromAssistComparison({ report: comparison });
    expect(entry.prose.limitations).toMatch(/not the same size/i);
    expect(entry.prose.limitations).toMatch(/0\.65/);
  });

  test('it says the spacecraft has a mass and the planet recoils', () => {
    const entry = fromAssistComparison({ report: comparison });
    expect(entry.prose.limitations).toMatch(/recoil/i);
    expect(entry.prose.limitations).toMatch(/total momentum/i);
  });

  test('a prediction is kept as the claim when there is one', () => {
    const entry = fromAssistComparison({
      report: comparison,
      prediction: 'behind gains',
    });
    expect(entry.prose.claim).toMatch(/behind gains/);
    expect(fromAssistComparison({ report: comparison }).prose.claim).toBe('');
  });

  test('an incomplete pass is counted and flagged, not dropped', () => {
    const broken = describeEncounter(trial({ value: -40, observed: null }));
    const entry = fromAssistComparison({
      report: { ...comparison, losing: broken, sides: null, audit: null },
    });
    expect(entry.snapshot.quantities.map(q => q.label)).toContain(
      'Passes with no complete encounter'
    );
    expect(entry.snapshot.provenance.flags).toContain('failed-trials');
    expect(entry.prose.limitations).toMatch(/no complete encounter/i);
  });

  test('nothing at all produces no entry', () => {
    expect(
      fromAssistComparison({ report: { gaining: null, losing: null } })
    ).toBeNull();
    expect(fromAssistSweep({ report: { encounters: [] } })).toBeNull();
  });

  const sweepReport = {
    kind: 'sweep',
    seed: 'assist',
    gate: 4000,
    held,
    numerics: { step: 0.5, substeps: 8 },
    encounters: [20, 30, 40, 60, 90].map(b =>
      describeEncounter(trial({ value: b }))
    ),
    verdict: {
      n: 5,
      mostTurned: 20,
      mostGained: 20,
      same: true,
      monotonic: true,
    },
  };

  test('the sweep plots points and fits nothing', () => {
    const entry = fromAssistSweep({ report: sweepReport });
    expect(entry.snapshot.figure.series).toHaveLength(2);
    for (const series of entry.snapshot.figure.series) {
      expect(series.style).toBe('points');
      expect(series.points).toHaveLength(5);
    }
  });

  test('the sweep says its answer is not a law, and only one side', () => {
    const entry = fromAssistSweep({ report: sweepReport });
    expect(entry.prose.limitations).toMatch(/not a rule/i);
    expect(entry.prose.limitations).toMatch(/gaining side/i);
  });

  test('a cancelled sweep is flagged as one', () => {
    const entry = fromAssistSweep({
      report: { ...sweepReport, cancelled: true },
    });
    expect(entry.snapshot.provenance.flags).toContain('cancelled');
    expect(entry.prose.limitations).toMatch(/stopped before it finished/i);
  });
});
