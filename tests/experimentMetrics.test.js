import { describe, test, expect } from '@jest/globals';
import {
  METRICS,
  METRIC_ARITY,
  METRIC_UNITS,
  sampleFrame,
  series,
  orbitalPeriod,
  closestApproach,
  reduceRun,
  compareRuns,
  UNITS_PER_AU,
} from '../js/experiments/metrics.js';

// The metrics are the experiment's output, so these check the arithmetic
// against hand-computed values rather than against the implementation.

const body = (id, x, y, vx = 0, vy = 0, mass = 1) => ({
  id,
  pos: { x, y },
  vel: { x: vx, y: vy },
  mass,
});

describe('sampling one frame', () => {
  test('separation is a distance in AU, not in simulation units', () => {
    // 300 units apart on x, and a unit is a hundredth of an AU.
    const s = sampleFrame({
      t: 1,
      bodies: [body(1, 0, 0), body(2, 300, 0)],
      metrics: [METRICS.SEPARATION],
    });
    expect(s[METRICS.SEPARATION]).toBeCloseTo(3, 9);
    expect(UNITS_PER_AU).toBe(100);
  });

  test('position carries its components as well as its magnitude', () => {
    const s = sampleFrame({
      t: 0,
      bodies: [body(1, 300, 400)],
      metrics: [METRICS.POSITION],
    });
    expect(s.position_x).toBeCloseTo(3, 9);
    expect(s.position_y).toBeCloseTo(4, 9);
    expect(s[METRICS.POSITION]).toBeCloseTo(5, 9);
  });

  test('distance from a primary is measured from that body, not the origin', () => {
    const s = sampleFrame({
      t: 0,
      bodies: [body(1, 500, 0)],
      primary: body(9, 200, 0),
      metrics: [METRICS.DISTANCE_TO_PRIMARY],
    });
    expect(s[METRICS.DISTANCE_TO_PRIMARY]).toBeCloseTo(3, 9);
  });

  test('a body is not its own primary', () => {
    const one = body(1, 500, 0);
    const s = sampleFrame({
      t: 0,
      bodies: [one],
      primary: one,
      metrics: [METRICS.DISTANCE_TO_PRIMARY],
    });
    expect(s[METRICS.DISTANCE_TO_PRIMARY]).toBeUndefined();
  });

  test('energy and angular momentum come from the engine, not from here', () => {
    const s = sampleFrame({
      t: 2,
      bodies: [body(1, 0, 0)],
      conserved: { energy: -12.5, angular: 3.25 },
      drift: { energy: -0.0004, angular: 0.0001 },
      metrics: [
        METRICS.TOTAL_ENERGY,
        METRICS.ANGULAR_MOMENTUM,
        METRICS.ENERGY_DRIFT,
        METRICS.ANGULAR_DRIFT,
      ],
    });
    expect(s[METRICS.TOTAL_ENERGY]).toBe(-12.5);
    expect(s[METRICS.ANGULAR_MOMENTUM]).toBe(3.25);
    // Drift is a fraction at the source and a percentage on screen.
    expect(s[METRICS.ENERGY_DRIFT]).toBeCloseTo(-0.04, 9);
    expect(s[METRICS.ANGULAR_DRIFT]).toBeCloseTo(0.01, 9);
  });

  test('separation and radius are always recorded, so a minimum can be found later', () => {
    const s = sampleFrame({
      t: 0,
      bodies: [body(1, 0, 0), body(2, 100, 0)],
      primary: body(9, 300, 0),
      metrics: [METRICS.SPEED],
    });
    expect(s.__separation).toBeCloseTo(1, 9);
    expect(s.__radius).toBeCloseTo(3, 9);
  });

  test('every offered metric declares an arity and a unit', () => {
    for (const id of Object.values(METRICS)) {
      expect(METRIC_ARITY[id]).toBeDefined();
      expect(METRIC_UNITS[id]).toBeTruthy();
    }
  });
});

describe('orbital period', () => {
  test('is the mean interval between periapsis passages', () => {
    // A radius that dips at t=1, 3 and 5: two intervals of 2.
    const samples = [0, 1, 2, 3, 4, 5, 6].map(t => ({
      t,
      __radius: t % 2 === 1 ? 1 : 2,
    }));
    const { period, passages } = orbitalPeriod(samples);
    expect(passages).toBe(3);
    expect(period).toBeCloseTo(2, 9);
  });

  test('is unknown from a single passage rather than guessed', () => {
    const samples = [
      { t: 0, __radius: 2 },
      { t: 1, __radius: 1 },
      { t: 2, __radius: 2 },
    ];
    expect(orbitalPeriod(samples).period).toBeNull();
  });

  test('a body at a constant radius never fires a passage', () => {
    const samples = [0, 1, 2, 3].map(t => ({ t, __radius: 5 }));
    expect(orbitalPeriod(samples).passages).toBe(0);
  });
});

describe('closest approach', () => {
  test('is the minimum over the run, with the time it happened', () => {
    const samples = [
      { t: 0, __separation: 5 },
      { t: 1, __separation: 2 },
      { t: 2, __separation: 3 },
    ];
    expect(closestApproach(samples)).toEqual({ distance: 2, t: 1 });
  });

  test('is null when nothing was recorded', () => {
    expect(closestApproach([{ t: 0 }])).toEqual({ distance: null, t: null });
  });
});

describe('reducing a run to one number per metric', () => {
  const samples = [
    { t: 0, separation: 2, energy_drift: 0, __separation: 2 },
    { t: 1, separation: 4, energy_drift: 0.1, __separation: 4 },
    { t: 2, separation: 6, energy_drift: 0.5, __separation: 1 },
  ];

  test('an oscillating quantity is summarised by its mean', () => {
    const out = reduceRun(samples, [METRICS.SEPARATION]);
    expect(out[METRICS.SEPARATION]).toMatchObject({ value: 4, kind: 'mean' });
  });

  test('an accumulating quantity is summarised by its final value', () => {
    const out = reduceRun(samples, [METRICS.ENERGY_DRIFT]);
    expect(out[METRICS.ENERGY_DRIFT]).toMatchObject({
      value: 0.5,
      kind: 'final',
    });
  });

  test('closest approach is the minimum, not the mean or the last', () => {
    const out = reduceRun(samples, [METRICS.CLOSEST_APPROACH]);
    expect(out[METRICS.CLOSEST_APPROACH].value).toBe(1);
  });

  test('a metric with no samples reduces to null rather than to zero', () => {
    const out = reduceRun([], [METRICS.SPEED]);
    expect(out[METRICS.SPEED]).toEqual({ value: null, kind: 'none' });
  });

  test('a period is converted from simulated seconds to days', () => {
    const orbit = [0, 1, 2, 3, 4, 5, 6].map(t => ({
      t: t * 86400,
      __radius: t % 2 === 1 ? 1 : 2,
    }));
    const out = reduceRun(orbit, [METRICS.ORBITAL_PERIOD], 86400);
    expect(out[METRICS.ORBITAL_PERIOD].value).toBeCloseTo(2, 6);
  });
});

describe('comparing two reduced runs', () => {
  test('gives the absolute and fractional difference', () => {
    const a = { separation: { value: 4, kind: 'mean' } };
    const b = { separation: { value: 5, kind: 'mean' } };
    const [row] = compareRuns(a, b, [METRICS.SEPARATION]);
    expect(row.delta).toBe(1);
    expect(row.fraction).toBeCloseTo(0.25, 9);
    expect(row.unit).toBe('AU');
  });

  test('reports no difference rather than a wrong one when a value is missing', () => {
    const [row] = compareRuns(
      { separation: { value: null } },
      { separation: { value: 5 } },
      [METRICS.SEPARATION]
    );
    expect(row.delta).toBeNull();
    expect(row.fraction).toBeNull();
  });

  test('leaves the fraction null against a zero baseline', () => {
    const [row] = compareRuns(
      { total_energy: { value: 0 } },
      { total_energy: { value: -3 } },
      [METRICS.TOTAL_ENERGY]
    );
    expect(row.delta).toBe(-3);
    expect(row.fraction).toBeNull();
  });
});

describe('pulling a series out of the samples', () => {
  test('drops gaps rather than treating them as zero', () => {
    const s = series(
      [{ t: 0, speed: 1 }, { t: 1 }, { t: 2, speed: 3 }],
      'speed'
    );
    expect(s).toEqual([
      { t: 0, v: 1 },
      { t: 2, v: 3 },
    ]);
  });
});
