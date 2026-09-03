import { describe, test, expect } from '@jest/globals';
import {
  alignSeries,
  overlapWindow,
  sampleAt,
  samplingStats,
  seriesSpan,
  indexAtOrBefore,
} from '../js/experiments/align.js';

// Two runs are never sampled at the same instants, because the render loop
// does not tick evenly. Everything here is about refusing to pretend otherwise.

const at = (...pairs) => pairs.map(([t, v]) => ({ t, v }));

describe('finding a sample', () => {
  const s = at([0, 0], [1, 10], [2, 20], [3, 30]);

  test('lands on an exact time', () => {
    expect(sampleAt(s, 2)).toBe(20);
  });

  test('interpolates between two samples', () => {
    expect(sampleAt(s, 1.5)).toBeCloseTo(15, 9);
  });

  test('refuses to extrapolate past either end', () => {
    expect(sampleAt(s, -0.5)).toBeNull();
    expect(sampleAt(s, 3.5)).toBeNull();
  });

  test('an empty series has no value anywhere', () => {
    expect(sampleAt([], 1)).toBeNull();
  });

  test('the binary search agrees with a linear scan', () => {
    for (let t = -1; t <= 4; t += 0.25) {
      const linear = s.reduce((best, p, i) => (p.t <= t ? i : best), -1);
      expect(indexAtOrBefore(s, t)).toBe(linear);
    }
  });
});

describe('the shared window', () => {
  test('is the intersection of the two runs', () => {
    const w = overlapWindow(at([0, 1], [10, 2]), at([4, 1], [14, 2]));
    expect(w).toMatchObject({ start: 4, end: 10, empty: false });
    expect(w.span).toBe(6);
  });

  test('is empty when the runs do not overlap at all', () => {
    expect(overlapWindow(at([0, 1], [3, 2]), at([5, 1], [9, 2])).empty).toBe(
      true
    );
  });

  test('is empty when either run is', () => {
    expect(overlapWindow([], at([0, 1])).empty).toBe(true);
  });
});

describe('aligning two runs', () => {
  test('compares like with like when the sample times differ', () => {
    // A sampled every 1s, B every 0.5s and offset. Index-by-index zipping
    // would compare A at t=2 with B at t=1, which is the bug this prevents.
    const a = at([0, 0], [1, 1], [2, 2], [3, 3]);
    const b = at([0, 0], [0.5, 1], [1, 2], [1.5, 3], [2, 4], [2.5, 5], [3, 6]);
    const { rows, interpolated } = alignSeries(a, b);
    expect(interpolated).toBe('B');
    for (const row of rows) {
      // B is exactly twice A at every t, by construction.
      expect(row.b).toBeCloseTo(row.a * 2, 9);
    }
  });

  test('the grid comes from the sparser run', () => {
    const dense = Array.from({ length: 40 }, (_, i) => ({ t: i * 0.1, v: i }));
    const sparse = at([0, 0], [1, 1], [2, 2], [3, 3]);
    expect(alignSeries(sparse, dense).rows.length).toBe(4);
    expect(alignSeries(dense, sparse).rows.length).toBe(4);
  });

  test('reports the absolute and the fractional difference', () => {
    const a = at([0, 10], [1, 10]);
    const b = at([0, 12], [1, 12]);
    const { rows } = alignSeries(a, b);
    expect(rows[0].delta).toBe(2);
    expect(rows[0].fraction).toBeCloseTo(0.2, 9);
  });

  test('leaves the fraction null against a zero baseline', () => {
    const { rows } = alignSeries(at([0, 0], [1, 0]), at([0, 5], [1, 5]));
    expect(rows[0].delta).toBe(5);
    expect(rows[0].fraction).toBeNull();
  });

  test('says how much of each run went unused', () => {
    const a = at([0, 1], [10, 1]);
    const b = at([0, 1], [4, 1]);
    const result = alignSeries(a, b);
    expect(result.window.end).toBe(4);
    expect(result.unusedA).toBeCloseTo(6, 9);
    expect(result.unusedB).toBeCloseTo(0, 9);
  });

  test('produces nothing rather than something wrong when there is no overlap', () => {
    const result = alignSeries(at([0, 1], [1, 1]), at([5, 1], [6, 1]));
    expect(result.rows).toEqual([]);
    expect(result.window.empty).toBe(true);
  });

  test('respects a row cap without distorting the window', () => {
    const long = Array.from({ length: 5000 }, (_, i) => ({
      t: i * 0.01,
      v: i,
    }));
    const result = alignSeries(long, long, { maxRows: 100 });
    expect(result.rows.length).toBeLessThanOrEqual(100);
    expect(result.window.start).toBe(0);
    expect(result.window.end).toBeCloseTo(49.99, 6);
  });
});

describe('how evenly a run was sampled', () => {
  test('an even run has a ratio of one', () => {
    const s = at([0, 1], [1, 1], [2, 1], [3, 1]);
    const stats = samplingStats(s);
    expect(stats.ratio).toBeCloseTo(1, 9);
    expect(stats.mean).toBeCloseTo(1, 9);
  });

  test('a stuttering run reports it rather than hiding it', () => {
    const s = at([0, 1], [0.1, 1], [0.2, 1], [2.2, 1]);
    expect(samplingStats(s).ratio).toBeCloseTo(20, 6);
  });

  test('a run of one sample has no intervals to describe', () => {
    expect(samplingStats(at([0, 1]))).toMatchObject({ count: 1, ratio: 1 });
  });

  test('span is the simulated time covered', () => {
    expect(seriesSpan(at([2, 1], [7, 1]))).toBe(5);
    expect(seriesSpan(at([2, 1]))).toBe(0);
  });
});
