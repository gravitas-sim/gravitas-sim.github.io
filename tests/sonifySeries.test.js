import { describe, test, expect, jest } from '@jest/globals';
import {
  explain,
  LOW_HZ,
  mapSeries,
  NOTES,
  OCTAVES,
  renderSeries,
  SECONDS,
  TICK_HZ,
} from '../js/sonify/series.js';
import { endSource, makeSource } from '../js/sonify/buffer.js';
import { periodToCents, DISTINGUISHABLE_CENTS } from '../js/sonify/law.js';

// =============================================================================
// The series sound: one documented, deterministic mapping (Prompt 280)
// -----------------------------------------------------------------------------
// Pitch for value, time for time, a tick for a gap, a stated range; the same
// arrays give the same notes and the same samples; the notes can be read back
// from the samples. Nothing here establishes that anyone heard anything, and
// the text it prints says so.
// =============================================================================

const X = Array.from({ length: 120 }, (_, i) => i / 10);
const RAMP = X.map(x => 3 + x);
const SINE = X.map(x => Math.sin(x));

describe('the mapping', () => {
  test('pitch is value, linear in cents, over a stated range', () => {
    const { notes, mapping } = mapSeries(X, RAMP, { count: 40 });
    expect(notes).toHaveLength(40);
    expect(notes[0].hz).toBeCloseTo(LOW_HZ, 9);
    expect(notes.at(-1).hz).toBeCloseTo(LOW_HZ * 2 ** OCTAVES, 9);
    expect(mapping.lowHz).toBe(220);
    expect(mapping.highHz).toBe(880);
    // Equal steps in value are equal intervals: a ramp is a run of equal cents.
    const cents = notes.map(n => periodToCents(n.hz, LOW_HZ));
    const steps = cents.slice(1).map((c, i) => c - cents[i]);
    for (const s of steps) expect(s).toBeCloseTo(steps[0], 6);
    // Higher value, higher pitch, everywhere.
    for (let i = 1; i < notes.length; i++)
      expect(notes[i].hz).toBeGreaterThan(notes[i - 1].hz);
  });

  test('time is x: equal slices of the range, SECONDS in all', () => {
    const { notes, mapping } = mapSeries(X, SINE);
    expect(mapping.seconds).toBe(SECONDS);
    expect(notes[0].t).toBe(0);
    expect(notes.at(-1).t + SECONDS / notes.length).toBeCloseTo(SECONDS, 9);
    expect(notes[0].from).toBe(X[0]);
    expect(notes.at(-1).to).toBeCloseTo(X.at(-1), 9);
    expect(mapping.x0).toBe(0);
    expect(mapping.x1).toBe(11.9);
  });

  test('the number of notes is bounded by the tier and by the points', () => {
    expect(mapSeries(X, SINE, { count: NOTES.low }).notes).toHaveLength(24);
    expect(mapSeries(X.slice(0, 9), SINE.slice(0, 9)).notes).toHaveLength(9);
    expect(NOTES.low).toBeLessThan(NOTES.full);
  });

  test('a gap is a tick, never a held note', () => {
    const x = [...X.slice(0, 40), ...X.slice(80)];
    const y = [...SINE.slice(0, 40), ...SINE.slice(80)];
    const { notes, mapping } = mapSeries(x, y, { count: 24 });
    expect(mapping.gaps).toBeGreaterThan(0);
    const ticks = notes.filter(n => n.hz === null);
    expect(ticks).toHaveLength(mapping.gaps);
    for (const t of ticks) {
      expect(t.value).toBeNull();
      expect(t.dur).toBeLessThan(0.02);
    }
    expect(explain(mapping)).toMatch(
      /empty slices? (is|are) ticks?, never a held note/
    );
  });

  test('a flat series sounds at the middle pitch, and says so', () => {
    const { notes, mapping } = mapSeries(
      X,
      X.map(() => 4)
    );
    expect(mapping.flat).toBe(true);
    expect(mapping.resolution).toBeNull();
    for (const n of notes) expect(n.hz).toBeCloseTo(440, 9);
    expect(explain(mapping)).toMatch(
      /every value is 4, so every note is the middle pitch/
    );
  });

  test('refuses what cannot be played: fewer than two finite points, or no span', () => {
    expect(mapSeries([1], [1])).toBeNull();
    expect(mapSeries([1, 2, NaN], [NaN, NaN, 3])).toBeNull();
    expect(mapSeries([2, 2, 2], [1, 2, 3])).toBeNull();
  });

  test('deterministic, and independent of the order of the points', () => {
    const a = mapSeries(X, SINE);
    const b = mapSeries([...X].reverse(), [...SINE].reverse());
    expect(b).toEqual(a);
    expect(mapSeries(X, SINE)).toEqual(a);
  });

  test("the resolution is the law's floor in value, and a working figure", () => {
    const { mapping } = mapSeries(X, RAMP);
    const span = mapping.valueHigh - mapping.valueLow;
    expect(mapping.resolution).toBeCloseTo(
      (span * DISTINGUISHABLE_CENTS) / (OCTAVES * 1200),
      12
    );
    expect(explain(mapping)).toMatch(/not a measurement of any listener/);
  });
});

describe('the text equivalent', () => {
  test("states the time, the pitch range, the unit and that the range is the chart's own", () => {
    const t = explain(mapSeries(X, RAMP).mapping);
    expect(t).toMatch(
      /Time is x: 6 seconds cover x from 0 to 11.9 in 48 slices/
    );
    expect(t).toMatch(
      /lowest mean, 3.1, is 220 Hz; the highest, 14.8, is 880 Hz/
    );
    expect(t).toMatch(/Equal steps in value are equal musical intervals/);
    expect(t).toMatch(/two charts cannot be compared by pitch/);
  });

  test('Spanish has the same statements', () => {
    const t = explain(mapSeries(X, RAMP).mapping, { lang: 'es' });
    expect(t).toMatch(
      /El tiempo es x: 6 segundos cubren x de 0 a 11.9 en 48 intervalos/
    );
    expect(t).toMatch(/220 Hz.*880 Hz/);
    expect(t).toMatch(
      /Pasos iguales de valor son intervalos musicales iguales/
    );
  });

  test('a spectrum is the same map, read left to right', () => {
    const t = explain(mapSeries(X, SINE, { kind: 'spectrum' }).mapping);
    expect(t).toMatch(/read left to right/);
  });
});

describe('the samples', () => {
  const RATE = 8000;
  const map = mapSeries(X, RAMP, { count: 12 });
  const out = renderSeries(map, RATE);

  test('the right length, finite, within the gain, the same every time', () => {
    expect(out).toBeInstanceOf(Float32Array);
    expect(out).toHaveLength(SECONDS * RATE);
    let peak = 0;
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeLessThanOrEqual(0.3 + 1e-6);
    expect(peak).toBeGreaterThan(0.25);
    expect(renderSeries(map, RATE)).toEqual(out);
    expect(
      Math.max(...renderSeries(map, RATE, { gain: 0.1 }))
    ).toBeLessThanOrEqual(0.1 + 1e-6);
  });

  test('the pitch of each note can be read back from the samples', () => {
    const slice = (SECONDS * RATE) / map.notes.length;
    map.notes.forEach((n, k) => {
      const from = Math.round(k * slice + slice * 0.1);
      const to = Math.round(k * slice + slice * 0.7);
      let crossings = 0;
      for (let i = from + 1; i < to; i++)
        if (out[i - 1] <= 0 && out[i] > 0) crossings++;
      const hz = crossings / ((to - from) / RATE);
      expect(Math.abs(hz - n.hz) / n.hz).toBeLessThan(0.08);
    });
  });

  test('a gap is a click above every note of the map', () => {
    const gap = mapSeries([0, 1, 2, 9, 10, 11], [1, 2, 3, 4, 5, 6], {
      count: 6,
    });
    expect(gap.notes.some(n => n.hz === null)).toBe(true);
    expect(TICK_HZ).toBeGreaterThan(gap.mapping.highHz);
    const samples = renderSeries(gap, RATE);
    const k = gap.notes.findIndex(n => n.hz === null);
    const start = Math.round(gap.notes[k].t * RATE);
    expect(Math.abs(samples[start + 3])).toBeGreaterThan(0);
    // ...and then silence until the next slice.
    expect(samples[start + Math.round(0.05 * RATE)]).toBe(0);
  });
});

describe('the buffer the gravitational-wave audio shares', () => {
  const ctx = () => {
    const source = {
      connect: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      onended: () => {},
    };
    const copy = jest.fn();
    return {
      sampleRate: 8000,
      createBuffer: jest.fn(() => ({ copyToChannel: copy })),
      createBufferSource: jest.fn(() => source),
      source,
      copy,
    };
  };

  test('makeSource fills one mono buffer and connects it, unstarted', () => {
    const c = ctx();
    const dest = {};
    const samples = new Float32Array(10);
    const { source, buffer } = makeSource(c, dest, samples);
    expect(c.createBuffer).toHaveBeenCalledWith(1, 10, 8000);
    expect(c.copy).toHaveBeenCalledWith(samples, 0);
    expect(source.buffer).toBe(buffer);
    expect(source.connect).toHaveBeenCalledWith(dest);
  });

  test('makeSource falls back to the channel data', () => {
    const c = ctx();
    const data = new Float32Array(4);
    c.createBuffer = () => ({ getChannelData: () => data });
    makeSource(c, {}, Float32Array.of(1, 2, 3, 4));
    expect(Array.from(data)).toEqual([1, 2, 3, 4]);
  });

  test('endSource stops and disconnects, survives a stopped source, and ignores null', () => {
    const c = ctx();
    const { source } = makeSource(c, {}, new Float32Array(1));
    source.onended = () => {};
    endSource(source);
    expect(source.onended).toBeNull();
    expect(source.stop).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalled();
    source.stop.mockImplementation(() => {
      throw new Error('already stopped');
    });
    source.disconnect.mockImplementation(() => {
      throw new Error('already disconnected');
    });
    expect(() => endSource(source)).not.toThrow();
    expect(() => endSource(null)).not.toThrow();
  });
});
