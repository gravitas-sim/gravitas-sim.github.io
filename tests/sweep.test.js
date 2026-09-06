import { describe, test, expect } from '@jest/globals';
import {
  MAX_VALUES,
  MIN_VALUES,
  SWEEPABLE,
  TRIAL_STATUS,
  parameterFor,
  planValues,
  summarise,
  sweepableScenarios,
  tally,
  validateSweepSpec,
} from '../js/experiments/sweep.js';

/** A valid request, which each test then breaks in one way. */
const spec = (over = {}) => ({
  scenario: 'Binary Planet Lab',
  parameter: 'binary_lab_planet_a',
  from: 0.05,
  to: 0.4,
  count: 8,
  duration: 50,
  metrics: ['separation'],
  ...over,
});

const trial = (value, results, status = TRIAL_STATUS.OK) => ({
  value,
  status,
  results,
});

describe('the allowlist', () => {
  test('every sweepable parameter is one a rebuild actually carries', () => {
    // The allowlist must be a subset of LAB_VARIABLES in js/scenarios.js.
    // Anything else is reset by applyPreset before the world is built, so a
    // sweep of it would run the same world at every value and draw a flat
    // line - a believable result and a false one.
    const LAB_VARIABLES = {
      'Binary Planet Lab': [
        'binary_lab_planet_a',
        'binary_lab_periods',
        'max_timestep',
      ],
      'Circumbinary Planet Lab': [
        'binary_lab_planet_a',
        'binary_lab_periods',
        'max_timestep',
      ],
      'Gravity Assist Lab': [
        'assist_impact_parameter',
        'assist_v_infinity',
        'max_timestep',
      ],
      'Gravity Assist: Heliocentric': [
        'assist_impact_parameter',
        'assist_v_infinity',
        'max_timestep',
      ],
    };
    for (const name of sweepableScenarios()) {
      expect(LAB_VARIABLES[name]).toBeDefined();
      for (const p of SWEEPABLE[name].parameters) {
        expect(LAB_VARIABLES[name]).toContain(p.key);
      }
    }
  });

  test('every parameter carries a usable range and a label', () => {
    for (const name of sweepableScenarios()) {
      for (const p of SWEEPABLE[name].parameters) {
        expect(p.max).toBeGreaterThan(p.min);
        expect(p.labelKey).toMatch(/^sweep\./);
        expect(p.unitKey).toMatch(/^sweep\./);
      }
    }
  });

  test('every scenario says which bodies its measurements are about', () => {
    for (const name of sweepableScenarios()) {
      expect(SWEEPABLE[name].roles.bodies.length).toBeGreaterThan(0);
    }
  });

  test('a setting that is not on the list is not sweepable', () => {
    expect(parameterFor('Binary Planet Lab', 'gravitational_constant')).toBe(
      null
    );
    expect(parameterFor('Solar System', 'binary_lab_planet_a')).toBe(null);
  });
});

describe('planning the values', () => {
  test('both ends are included, exactly', () => {
    const v = planValues({ from: 0.05, to: 0.4, count: 8 });
    expect(v).toHaveLength(8);
    expect(v[0]).toBe(0.05);
    // Exactly the endpoint, not the endpoint plus seven roundings.
    expect(v[7]).toBe(0.4);
  });

  test('the spacing is even', () => {
    const v = planValues({ from: 0, to: 10, count: 6 });
    expect(v).toEqual([0, 2, 4, 6, 8, 10]);
  });

  test('a descending range descends', () => {
    const v = planValues({ from: 10, to: 0, count: 3 });
    expect(v).toEqual([10, 5, 0]);
  });

  test('a nonsense request plans nothing', () => {
    expect(planValues({ from: NaN, to: 1, count: 5 })).toEqual([]);
    expect(planValues({ from: 0, to: 1, count: 1 })).toEqual([]);
  });
});

describe('refusing a sweep that cannot mean anything', () => {
  test('a valid request is accepted', () => {
    expect(validateSweepSpec(spec()).ok).toBe(true);
  });

  test('two values is the comparison the bench already does', () => {
    expect(validateSweepSpec(spec({ count: 2 })).reason).toBe('valueCount');
    expect(validateSweepSpec(spec({ count: MIN_VALUES })).ok).toBe(true);
    expect(validateSweepSpec(spec({ count: MAX_VALUES })).ok).toBe(true);
    expect(validateSweepSpec(spec({ count: MAX_VALUES + 1 })).reason).toBe(
      'valueCount'
    );
  });

  test('a range outside the parameter is refused up front, not run', () => {
    // Running it would produce a row of failed trials and bury the actual
    // mistake, which is in the request.
    const out = validateSweepSpec(spec({ from: 0.05, to: 0.9 }));
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('outOfRange');
    expect(out.detail).toEqual({ min: 0.02, max: 0.45 });
  });

  test('a range that crosses an excluded band is refused', () => {
    // An impact parameter of zero is a collision, not a flyby, so a sweep from
    // -100 to +100 would pass through values the scenario cannot represent.
    const out = validateSweepSpec(
      spec({
        scenario: 'Gravity Assist Lab',
        parameter: 'assist_impact_parameter',
        from: -100,
        to: 100,
      })
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('crossesExcluded');

    // One side of it is fine, and both sides are offered because the sign is
    // the lesson.
    expect(
      validateSweepSpec(
        spec({
          scenario: 'Gravity Assist Lab',
          parameter: 'assist_impact_parameter',
          from: 10,
          to: 100,
        })
      ).ok
    ).toBe(true);
    expect(
      validateSweepSpec(
        spec({
          scenario: 'Gravity Assist Lab',
          parameter: 'assist_impact_parameter',
          from: -100,
          to: -10,
        })
      ).ok
    ).toBe(true);
  });

  test('a zero-width range, no metrics, and a silly duration are all refused', () => {
    expect(validateSweepSpec(spec({ from: 0.1, to: 0.1 })).reason).toBe(
      'rangeEmpty'
    );
    expect(validateSweepSpec(spec({ metrics: [] })).reason).toBe('noMetrics');
    expect(validateSweepSpec(spec({ duration: 0 })).reason).toBe('duration');
    expect(validateSweepSpec(spec({ duration: 1e9 })).reason).toBe('duration');
  });

  test('a parameter from another scenario is refused', () => {
    expect(
      validateSweepSpec(spec({ parameter: 'assist_v_infinity' })).reason
    ).toBe('parameterNotSweepable');
  });
});

describe('reading a finished sweep', () => {
  test('a measurement that moves monotonically is reported as such', () => {
    const trials = [
      trial(1, { separation: 10 }),
      trial(2, { separation: 20 }),
      trial(3, { separation: 31 }),
    ];
    const s = summarise(trials, 'separation');
    expect(s.changed).toBe(true);
    expect(s.monotonic).toBe(true);
    expect(s.direction).toBe('increasing');
    expect(s.span).toBe(21);
  });

  test('a measurement that does not move is not called a trend', () => {
    const trials = [
      trial(1, { separation: 10 }),
      trial(2, { separation: 10.00001 }),
      trial(3, { separation: 10 }),
    ];
    const s = summarise(trials, 'separation');
    expect(s.changed).toBe(false);
    expect(s.monotonic).toBe(false);
  });

  test('a measurement that turns over is not called monotonic', () => {
    const trials = [
      trial(1, { separation: 10 }),
      trial(2, { separation: 30 }),
      trial(3, { separation: 12 }),
    ];
    expect(summarise(trials, 'separation').monotonic).toBe(false);
  });

  test('failed trials are excluded from the summary and counted separately', () => {
    const trials = [
      trial(1, { separation: 10 }),
      trial(2, {}, TRIAL_STATUS.LOST_BODY),
      trial(3, { separation: 30 }),
      trial(4, {}, TRIAL_STATUS.BUILD_FAILED),
      trial(5, {}, TRIAL_STATUS.CANCELLED),
    ];
    const s = summarise(trials, 'separation');
    expect(s.n).toBe(2);

    const counts = tally(trials);
    expect(counts.total).toBe(5);
    expect(counts.ok).toBe(2);
    // A cancelled trial did not fail: nobody ran it.
    expect(counts.failed).toBe(2);
    expect(counts.cancelled).toBe(1);
    expect(counts.lostBody).toBe(1);
  });

  test('a sweep with nothing measurable summarises to nothing', () => {
    expect(summarise([trial(1, {}, TRIAL_STATUS.BUILD_FAILED)], 'x')).toBe(
      null
    );
    expect(summarise([], 'x')).toBe(null);
    expect(summarise([trial(1, { x: 5 })], 'x')).toBe(null);
  });

  test('a non-finite measurement is not treated as a value', () => {
    const trials = [
      trial(1, { separation: 10 }),
      trial(2, { separation: NaN }),
      trial(3, { separation: 30 }),
    ];
    expect(summarise(trials, 'separation').n).toBe(2);
  });
});
