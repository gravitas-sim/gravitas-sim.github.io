// Prompt 273: the resonance kernel's validation group (RESONANCES_II.md). The kernel is
// js/lab3d/libration.js; the committed thresholds, the pinned results and the pinned
// JUP365 argument are in tests/fixtures/resonances-ii/. Run `node tools/resonances-ii-validate.mjs run`
// (with the downloaded Horizons files) to reproduce the pinned results.
import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  laplaceCoefficient,
  measureLibration,
  resonantArgumentSeries,
  secularRate,
  secularRateFirstOrder,
} from '../js/lab3d/libration.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = f =>
  JSON.parse(
    fs.readFileSync(path.join(here, 'fixtures', 'resonances-ii', f), 'utf8')
  );
const thresholds = fx('thresholds.json');
const results = fx('results.json');

const sine = (periodsSeen, period = 1000, amp = 5, centre = 180, dt = 5) => {
  const n = Math.round((periodsSeen * period) / dt) + 1;
  const times = Array.from({ length: n }, (_, i) => i * dt);
  const phi = times.map(
    t => centre + amp * Math.sin((2 * Math.PI * t) / period + 1)
  );
  return { times, phi };
};

describe('measureLibration', () => {
  test('a window of four periods measures the period with an uncertainty', () => {
    const { times, phi } = sine(4);
    const m = measureLibration({
      times,
      phi,
      referencePeriod: 20,
      floorDeg: 0.01,
    });
    expect(m.state).toBe('libration');
    expect(Math.abs(m.period - 1000) / 1000).toBeLessThan(0.02);
    expect(m.amplitude).toBeGreaterThan(4.5);
    expect(m.periodSigma).toBeGreaterThanOrEqual(0);
  });
  test('windows shorter than three periods return not-constrained and no number', () => {
    for (const f of [0.5, 1, 2]) {
      const { times, phi } = sine(f);
      const m = measureLibration({
        times,
        phi,
        referencePeriod: 20,
        floorDeg: 0.01,
      });
      expect(m.state).toBe('not-constrained');
      expect(m.period).toBeNull();
      expect(m.amplitude).toBeNull();
      expect(m.center).toBeNull();
    }
  });
  test('a circulating argument is circulation, never a libration period', () => {
    const times = Array.from({ length: 800 }, (_, i) => i * 5);
    const phi = times.map(t => (t * 0.2) % 360);
    const m = measureLibration({
      times,
      phi,
      referencePeriod: 20,
      floorDeg: 0.01,
    });
    expect(m.state).toBe('circulation');
  });
});

describe('the resonant argument and the secular rate', () => {
  test('coefficients that do not sum to zero are refused', () => {
    expect(
      resonantArgumentSeries([
        { lambda: [10], coefficient: 1 },
        { lambda: [20], coefficient: -2 },
      ])
    ).toBeNull();
    const a = resonantArgumentSeries([
      { lambda: [10, 400], coefficient: 1 },
      { lambda: [20, 20], coefficient: -3 },
      { lambda: [30, 30], coefficient: 2 },
    ]);
    expect(a[0]).toBeCloseTo(10 - 60 + 60, 9);
    expect(a[1]).toBeCloseTo(40, 9);
  });
  test('a line turning four times gives its slope; two turns are refused', () => {
    const times = Array.from({ length: 401 }, (_, i) => i * 10);
    const ang = t => 30 + 0.36 * t + 2 * Math.sin(t / 7);
    const four = secularRate({ times, angleDeg: times.map(ang) });
    expect(four.state).toBe('measured');
    expect(four.rate).toBeCloseTo(0.36, 2);
    const two = secularRate({
      times: times.slice(0, 201),
      angleDeg: times.slice(0, 201).map(ang),
    });
    expect(two.state).toBe('not-constrained');
    expect(two.rate).toBeNull();
  });
  test('the first-order rate tends to the quadrupole limit at small alpha', () => {
    const alpha = 0.02;
    const A = secularRateFirstOrder({ n: 1, massRatio: 1, alpha });
    expect(Math.abs(A / (0.75 * alpha ** 3) - 1)).toBeLessThan(0.01);
    expect(laplaceCoefficient(1.5, 0, 0)).toBeCloseTo(2, 9);
  });
});

describe('the pinned validation record', () => {
  test('every committed leg has a result and the verdict is the committed function of them', () => {
    const ids = thresholds.legs.map(l => l.id);
    expect(results.legs.map(l => l.id).sort()).toEqual(ids.slice().sort());
    const st = id => results.legs.find(l => l.id === id).status;
    const all = list => list.every(i => st(i) === 'PASS');
    const A = all([
      'R1',
      'R2',
      'R3',
      'L1',
      'L2',
      'L3',
      'L3c',
      'L4',
      'P1',
      'P2',
      'P3',
      'S1',
      'S2',
      'C1',
      'D1',
      'D2',
      'D3',
    ]);
    const B = all(['R1', 'R2', 'R3', 'L4', 'P3', 'D1', 'D2', 'D3']);
    expect(results.verdict).toBe(A ? 'A' : B ? 'B' : 'C');
  });
  test('the pinned argument carries the digests of the downloaded files and the window length', () => {
    const pinned = fx('jup365-laplace-argument.json');
    expect(pinned.sha256).toEqual(thresholds.data.sha256);
    expect(pinned.phi).toHaveLength(thresholds.window.laplace_days + 1);
  });
  test('the pinned argument measured by the committed estimator reproduces the L1 record', () => {
    const pinned = fx('jup365-laplace-argument.json');
    const m = measureLibration({
      times: pinned.phi.map((_, i) => i),
      phi: pinned.phi,
      referencePeriod: 3.5249,
      floorDeg: 0.002,
      stationaryDeg: 0.002,
      samplingFloor: 1,
    });
    const rec = results.legs.find(l => l.id === 'L1').values;
    expect(m.state).toBe(rec.state);
    if (rec.period === null) expect(m.period).toBeNull();
    else expect(m.period).toBeCloseTo(rec.period, 6);
  });
  test('no failing leg is unlabelled and no home path is in the record', () => {
    const text = JSON.stringify(results) + JSON.stringify(thresholds);
    expect(text).not.toMatch(/\/Users\//);
    for (const l of results.legs)
      expect(['PASS', 'FAIL', 'REPORTED', 'NOT RUN']).toContain(l.status);
  });
});
