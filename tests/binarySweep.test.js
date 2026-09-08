import { describe, test, expect } from '@jest/globals';
import {
  CONFIGURATIONS,
  PARAMETER,
  TRIAL_OUTCOME,
  describeTrial,
  isValidValue,
  resolutionVerdict,
  sweepSpec,
} from '../js/experiments/binarySweep.js';
import { OUTCOME } from '../js/binaryStability.js';
import { parameterFor, validateSweepSpec } from '../js/experiments/sweep.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';

// The panel's prose is in the deferred half of the catalogue, which nothing
// loads in a unit test. Registered here so these assertions are about the
// sentences a reader sees rather than about message ids.
registerMessages('en', EN_DEFERRED);

/** A finished trial as the bench runner hands it over. */
const trial = ({ observed, ...over } = {}) => ({
  value: 0.15,
  status: 'ok',
  complete: true,
  ...over,
  observed: {
    alive: true,
    merged: false,
    unbound: false,
    maxDistance: 0.4,
    closestApproach: 0.09,
    encounters: 3,
    energyDrift: 1e-6,
    periodsDone: 20,
    periodsAsked: 20,
    steps: 40000,
    dtMax: 1,
    dtMean: 0.5,
    planetEccentricity: 0.2,
    planetMaxEccentricity: 0.31,
    ...(observed || {}),
  },
});

describe('what the lesson sweeps', () => {
  test('it varies the starting radius and nothing else', () => {
    expect(PARAMETER).toBe('binary_lab_planet_a');
    for (const key of Object.keys(CONFIGURATIONS)) {
      const spec = sweepSpec(key, { binaryPeriod: 1200 });
      expect(spec.parameter).toBe(PARAMETER);
      // One seed, one window, for every trial in the sweep.
      expect(typeof spec.seed).toBe('string');
      expect(spec.periods).toBeGreaterThan(0);
    }
  });

  test('roughly five values, inside the validated range, spanning the hand runs', () => {
    const circumstellar = CONFIGURATIONS.circumstellar;
    expect(circumstellar.values.length).toBeGreaterThanOrEqual(4);
    expect(circumstellar.values.length).toBeLessThanOrEqual(6);
    // The two the student ran by hand are in there, so the sweep extends what
    // they did rather than replacing it with something unrelated.
    expect(circumstellar.values).toContain(0.15);
    expect(circumstellar.values).toContain(0.3);
    // And the published critical radius for this system, 0.177, is inside.
    expect(Math.min(...circumstellar.values)).toBeLessThan(0.177);
    expect(Math.max(...circumstellar.values)).toBeGreaterThan(0.177);
    for (const v of circumstellar.values) {
      expect(isValidValue('circumstellar', v)).toBe(true);
    }
  });

  test('the circumbinary range brackets its own published boundary', () => {
    const values = CONFIGURATIONS.circumbinary.values;
    // 3.61 for this pair, from the second Holman & Wiegert formula.
    expect(Math.min(...values)).toBeLessThan(3.61);
    expect(Math.max(...values)).toBeGreaterThan(3.5);
    for (const v of values) expect(isValidValue('circumbinary', v)).toBe(true);
  });

  test('a value outside the scenario range is refused', () => {
    const def = parameterFor('Binary Planet Lab', PARAMETER);
    expect(isValidValue('circumstellar', def.max + 1)).toBe(false);
    expect(isValidValue('circumstellar', -1)).toBe(false);
  });

  test('the spec it builds is one the runner accepts', () => {
    for (const key of Object.keys(CONFIGURATIONS)) {
      const spec = sweepSpec(key, { binaryPeriod: 1200 });
      expect(validateSweepSpec(spec).ok).toBe(true);
      expect(spec.duration).toBeGreaterThan(spec.periods);
    }
  });
});

describe('what a trial says about the planet', () => {
  test('a completed run that held its planet survived the window', () => {
    const out = describeTrial(trial());
    expect(out.outcome).toBe(OUTCOME.SURVIVED);
    expect(out.trustworthy).toBe(true);
    expect(out.periodsDone).toBe(20);
    expect(out.periodsAsked).toBe(20);
  });

  test('an ejection is an ejection, not a large mean distance', () => {
    const out = describeTrial(
      trial({ observed: { unbound: true, maxDistance: 40 } })
    );
    expect(out.outcome).toBe(OUTCOME.EJECTED);
    expect(out.maxDistance).toBe(40);
  });

  test('a merger is a collision', () => {
    expect(describeTrial(trial({ observed: { merged: true } })).outcome).toBe(
      OUTCOME.COLLIDED
    );
  });

  test('energy drift too large is a numerical failure, not a result', () => {
    const out = describeTrial(trial({ observed: { energyDrift: 0.5 } }));
    expect(out.outcome).toBe(OUTCOME.UNRELIABLE);
    expect(out.trustworthy).toBe(false);
  });

  test('an unfinished window outranks survival', () => {
    // The planet was still there when the observation stopped, which is not
    // the same as it having lasted the window - and reading it as survival is
    // exactly the mistake this sweep exists to avoid.
    const out = describeTrial(
      trial({
        complete: false,
        status: 'stalled',
        observed: { periodsDone: 6 },
      })
    );
    expect(out.outcome).toBe(TRIAL_OUTCOME.INCOMPLETE);
    expect(out.trustworthy).toBe(false);
    expect(out.periodsDone).toBe(6);
    expect(out.reason).toBe('windowNotFinished');
  });

  test('a capped trial says so specifically', () => {
    const out = describeTrial(trial({ complete: false, status: 'capped' }));
    expect(out.outcome).toBe(TRIAL_OUTCOME.INCOMPLETE);
    expect(out.reason).toBe('sampleCap');
  });

  test('a trial that never ran is not an outcome about the planet', () => {
    const out = describeTrial({ value: 0.2, status: 'buildFailed' });
    expect(out.outcome).toBe(TRIAL_OUTCOME.NOT_RUN);
    expect(out.trustworthy).toBe(false);
  });

  test('an OK status is never on its own the evidence', () => {
    // Same status, four different things happened to the planet.
    const outcomes = [
      describeTrial(trial()).outcome,
      describeTrial(trial({ observed: { unbound: true, maxDistance: 40 } }))
        .outcome,
      describeTrial(trial({ observed: { merged: true } })).outcome,
      describeTrial(trial({ observed: { energyDrift: 0.5 } })).outcome,
    ];
    expect(new Set(outcomes).size).toBe(4);
  });

  test('the diagnostics the panel needs all come through', () => {
    const out = describeTrial(trial());
    for (const key of [
      'maxDistance',
      'closestApproach',
      'encounters',
      'energyDrift',
      'steps',
      'dtMax',
      'planetMaxEccentricity',
    ]) {
      expect(out[key]).not.toBe(null);
    }
  });
});

describe('rerunning a trial at a smaller step', () => {
  const survived = describeTrial(trial());
  const ejected = describeTrial(
    trial({ observed: { unbound: true, maxDistance: 40 } })
  );

  test('the same outcome at two steps is a resolved answer', () => {
    const v = resolutionVerdict(survived, survived);
    expect(v.converged).toBe(true);
    expect(v.outcome).toBe(OUTCOME.SURVIVED);
  });

  test('a different outcome is not', () => {
    const v = resolutionVerdict(survived, ejected);
    expect(v.converged).toBe(false);
    expect(v.reason).toBe('outcomeChanged');
  });

  test('an incomplete run resolves nothing', () => {
    const partial = describeTrial(trial({ complete: false }));
    expect(resolutionVerdict(survived, partial).converged).toBe(false);
  });

  test('even a converged verdict is about the window, not for ever', () => {
    // The published fit integrates ten thousand binary periods. This is
    // twenty, and the verdict says so whatever it concluded.
    const v = resolutionVerdict(survived, survived);
    expect(v.windowOnly).toBe(true);
    expect(v.periods).toBe(20);
  });
});

describe('what the notebook keeps', () => {
  const report = (over = {}) => ({
    kind: 'circumstellar',
    periods: 20,
    seed: 'binary',
    values: [0.12, 0.15, 0.18, 0.22, 0.3],
    held: {
      m1: 1,
      m2: 0.5,
      eccentricity: 0.4,
      integrator: 'Velocity Verlet',
      maxTimestep: 1,
      simSpeed: 750,
    },
    cancelled: false,
    trials: [
      { value: 0.12, outcome: 'survived', periodsDone: 20, periodsAsked: 20 },
      { value: 0.3, outcome: 'ejected', periodsDone: 5.1, periodsAsked: 20 },
    ],
    recheck: null,
    ...over,
  });

  test('it records outcomes, not an average of anything', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    const entry = fromBinarySweep({ report: report(), prediction: 'outward' });
    const labels = entry.snapshot.quantities.map(q => q.label);
    // The counts are of outcomes; there is no mean distance anywhere.
    expect(labels.join(' ')).toMatch(/still there/i);
    expect(labels.join(' ')).toMatch(/left the system/i);
    expect(JSON.stringify(entry)).not.toMatch(/mean distance/i);
  });

  test('the window is a quantity, with what it does not establish attached', () => {
    return import('../js/notebook/capture.js').then(({ fromBinarySweep }) => {
      const entry = fromBinarySweep({ report: report() });
      const window = entry.snapshot.quantities.find(q =>
        /window/i.test(q.label)
      );
      expect(window.value).toBe(20);
      expect(window.note).toMatch(/no longer|afterwards/i);
      expect(entry.prose.limitations).toMatch(/20 binary periods/);
    });
  });

  test('the prediction is kept beside the result', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    const entry = fromBinarySweep({
      report: report(),
      prediction: 'further out is safer',
    });
    expect(entry.prose.claim).toMatch(/further out is safer/);
  });

  test('the settings kept are the ones it actually ran at', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    const entry = fromBinarySweep({
      report: report(),
      provenance: { integrator: 'yoshida', timestep: 99 },
    });
    // The sweep's own record wins over whatever the panel is showing now.
    const p = entry.snapshot.provenance;
    expect(p.numerical.integrator).toBe('yoshida');
    expect(p.seed).toBe('binary');
  });

  test('without a recheck it says nothing has been resolved', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    const entry = fromBinarySweep({ report: report() });
    expect(entry.prose.limitations).toMatch(/no trial was re-run/i);
  });

  test('with one it says what that did and did not settle', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    const entry = fromBinarySweep({
      report: report({
        recheck: { value: 0.22, verdict: { converged: true } },
      }),
    });
    expect(entry.prose.limitations).toMatch(/0\.22/);
    expect(entry.prose.limitations).toMatch(/not an artefact/i);
  });

  test('an empty sweep produces no entry at all', async () => {
    const { fromBinarySweep } = await import('../js/notebook/capture.js');
    expect(fromBinarySweep({ report: { trials: [] } })).toBe(null);
  });
});
