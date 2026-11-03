// The occurrence kernel (Prompt 229): the definitions, the refusals, the determinism, and the committed
// thresholds file's shape. The validation table itself is tools/occurrence-validate.mjs; its pinned results
// are tests/fixtures/occurrence/results.json (checked in tests/occurrenceResults.test.js).
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  CADENCE,
  FLOOR,
  MIN_TRANSITS,
  THRESHOLD,
  aOverR,
  analyticEfficiency,
  detectionSelection,
  efficiencyAt,
  epochCount,
  geometricProbability,
  injectionRun,
  makeStars,
  occurrenceGrid,
  poisson,
  rateOf,
  recover,
  recoverByPoints,
  redFactor,
  signalToNoise,
  simulatePopulation,
  singleBin,
  transitSignal,
  truthRates,
} from '../js/kernels/occurrence/index.js';
import { stream } from '../js/random/streams.js';

const sun = { radius: 1, mass: 1, sigma: 1e-4, span: 1460 };

describe('definitions', () => {
  test('the geometric probability of the Earth around the Sun is R*/a', () => {
    expect(geometricProbability(365.25, sun)).toBeCloseTo(0.00465, 5);
    expect(aOverR(365.25, sun)).toBeGreaterThan(214);
  });
  test('epochs: ceil((span - t0) / P), none when the first transit is after the span', () => {
    expect(epochCount(10, 100, 0.5)).toBe(10);
    expect(epochCount(10, 100, 9.5)).toBe(10);
    expect(epochCount(200, 90, 100)).toBe(0);
    expect(epochCount(200, 90, 50)).toBe(1);
  });
  test('the survey is synthetic, seeded and reproducible', () => {
    const a = makeStars({ seed: 'x', n: 50 });
    const b = makeStars({ seed: 'x', n: 50 });
    const c = makeStars({ seed: 'y', n: 50 });
    expect(a.synthetic).toBe(true);
    expect(Array.from(a.radius)).toEqual(Array.from(b.radius));
    expect(Array.from(a.radius)).not.toEqual(Array.from(c.radius));
    expect(Math.min(...a.sigma)).toBeGreaterThanOrEqual(40e-6);
  });
  test('a poisson draw has the mean and variance of its parameter, also in the thousands', () => {
    const d = stream('forward', 'poisson');
    for (const lam of [3, 250, 3200]) {
      const xs = Array.from({ length: 2000 }, () => poisson(d, lam));
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      expect(Math.abs(m - lam) / lam).toBeLessThan(0.05);
    }
  });
});

describe('injection and recovery', () => {
  const planet = { P: 40, radiusEarth: 3, b: 0.3 };
  test('the efficiency at S = threshold is one half and follows Phi(S - threshold)', () => {
    const sg = transitSignal(planet, sun, 14);
    expect(sg.N).toBe(37);
    const S0 = signalToNoise(sg, sun);
    for (const d of [-1, 0, 1]) {
      const star = { ...sun, sigma: Math.sqrt(sg.s2) / (THRESHOLD + d) };
      const draw = stream('noise', `t${d}`);
      let k = 0;
      for (let i = 0; i < 3000; i++) if (recover(sg, star, draw).detected) k++;
      expect(
        Math.abs(k / 3000 - analyticEfficiency(THRESHOLD + d))
      ).toBeLessThan(0.035);
    }
    expect(S0).toBeGreaterThan(0);
  });
  test('fewer than the least number of transits is never recovered', () => {
    const sg = transitSignal(
      { P: 600, radiusEarth: 16, b: 0 },
      { ...sun, span: 1000 },
      100
    );
    expect(sg.N).toBeLessThan(MIN_TRANSITS);
    expect(
      recover(sg, { ...sun, sigma: 1e-9 }, stream('noise', 'n')).detected
    ).toBe(false);
  });
  test('the point-by-point draw agrees with the one-draw reduction', () => {
    const sg = transitSignal({ P: 80, radiusEarth: 3, b: 0.2 }, sun, 32, {
      keepShapes: true,
    });
    const star = { ...sun, sigma: Math.sqrt(sg.s2) / THRESHOLD };
    const a = stream('noise', 'a');
    const b = stream('noise', 'b');
    let ka = 0;
    let kb = 0;
    for (let i = 0; i < 1500; i++) {
      if (recover(sg, star, a).detected) ka++;
      if (recoverByPoints(sg, star, b).detected) kb++;
    }
    expect(Math.abs(ka - kb) / 1500).toBeLessThan(0.07);
  });
  test('red noise widens the statistic by the closed form, and white noise by one', () => {
    const t0 = 100.5 * CADENCE;
    const sg = transitSignal(
      { P: 20, radiusEarth: 4, b: 0.6 },
      { ...sun, span: t0 + 50 },
      t0,
      { keepShapes: true }
    );
    expect(redFactor(sg, 0)).toBe(1);
    expect(redFactor(sg, 0.7)).toBeGreaterThan(1.5);
  });
  test('a run is a pure function of its seed', () => {
    const stars = makeStars({ seed: 'r', n: 12 });
    const a = injectionRun({ stars, seed: 's', trials: 1 });
    const b = injectionRun({ stars, seed: 's', trials: 1 });
    const c = injectionRun({ stars, seed: 't', trials: 1 });
    expect(a.E).toEqual(b.E);
    expect(a.E).not.toEqual(c.E);
  }, 60000);
  test('the efficiency is not extrapolated outside the injected range', () => {
    const stars = makeStars({ seed: 'r', n: 12 });
    const res = injectionRun({ stars, seed: 's', trials: 1 });
    expect(efficiencyAt(res, 5000)).toMatchObject({
      status: 'refused',
      code: 'range',
    });
    expect(efficiencyAt(res, -1)).toMatchObject({
      status: 'refused',
      code: 'range',
    });
  }, 60000);
});

describe('the rate of a bin', () => {
  test('a rate is n r / E with the interval of the statistics kernel', () => {
    const r = rateOf({ n: 12, completeness: 30, reliability: 0.9 });
    expect(r.status).toBe('ok');
    expect(r.rate).toBeCloseTo((12 * 0.9) / 30, 12);
    expect(r.lo).toBeLessThan(r.rate);
    expect(r.hi).toBeGreaterThan(r.rate);
    expect(r.method).toBe('poisson-garwood');
  });
  test('a rate may exceed one planet per star', () => {
    expect(
      rateOf({ n: 90, completeness: 40, reliability: 1 }).rate
    ).toBeGreaterThan(2);
  });
  test('no listings: an upper limit, no rate; floor: not constrained, no number', () => {
    const z = rateOf({ n: 0, completeness: 37.5, reliability: 0.9 });
    expect(z.status).toBe('upper-limit');
    expect(z.upperLimit).toBeCloseTo(-Math.log(0.05) / 37.5, 12);
    expect('rate' in z).toBe(false);
    const f = rateOf({ n: 3, completeness: FLOOR - 0.01, reliability: 1 });
    expect(f.status).toBe('not-constrained');
    expect('rate' in f || 'upperLimit' in f).toBe(false);
  });
  test('refusals: reliability, count, completeness', () => {
    expect(rateOf({ n: 3, completeness: 40 }).code).toBe('reliability');
    expect(rateOf({ n: 3, completeness: 40, reliability: 0 }).code).toBe(
      'reliability'
    );
    expect(rateOf({ n: 3, completeness: 40, reliability: 1.1 }).code).toBe(
      'reliability'
    );
    expect(rateOf({ n: 2.5, completeness: 40, reliability: 1 }).code).toBe(
      'count'
    );
    expect(rateOf({ n: 3, completeness: NaN, reliability: 1 }).code).toBe(
      'completeness'
    );
  });
  test('a B verdict: a bin under the committed count is a limit, not a rate', () => {
    const r = rateOf({ n: 4, completeness: 40, reliability: 1, minCount: 10 });
    expect(r.status).toBe('upper-limit');
    expect(r.limited).toBe(true);
  });
  test('a grid takes a reliability per period bin', () => {
    const g = occurrenceGrid({
      counts: [
        [5, 0],
        [3, 8],
      ],
      E: [
        [50, 50],
        [2, 40],
      ],
      reliability: [0.9, 0.8],
    });
    expect(g[0][0].status).toBe('ok');
    expect(g[0][1].status).toBe('upper-limit');
    expect(g[1][0].status).toBe('not-constrained');
    expect(g[1][1].rate).toBeCloseTo((8 * 0.8) / 40, 12);
  });
});

describe('a population whose rates are known', () => {
  test('the selection of the detection is a cut on epochs and Phi(S - threshold)', () => {
    const sel = detectionSelection();
    expect(sel.inclusion({ epochs: 2, snr: 100 })).toBe(0);
    expect(sel.inclusion({ epochs: 5, snr: THRESHOLD })).toBeCloseTo(0.5, 6);
  });
  test('the truth sums to the stated totals and one bin can hold more than one planet per star', () => {
    const g = truthRates();
    const totals = [0, 1, 2, 3, 4].map(k =>
      g.reduce((a, row) => a + row[k], 0)
    );
    expect(totals.map(x => Number(x.toFixed(6)))).toEqual([
      1.6, 1, 0.6, 0.1, 0.03,
    ]);
    expect(singleBin(1, 2, 1.5)[1][2]).toBe(1.5);
  });
  test('the same seed lists the same planets', () => {
    const stars = makeStars({ seed: 'p', n: 150 });
    const E = Array.from({ length: 8 }, () => new Array(5).fill(10));
    const spec = {
      stars,
      rates: truthRates(),
      reliability: 0.9,
      completeness: E,
      seed: 'a',
    };
    const a = simulatePopulation(spec);
    expect(simulatePopulation(spec).listed).toEqual(a.listed);
    expect(simulatePopulation({ ...spec, seed: 'b' }).listed).not.toEqual(
      a.listed
    );
    expect(a.transiting).toBeLessThan(a.planets);
  }, 60000);
});

describe('the committed contract', () => {
  const thr = JSON.parse(
    readFileSync(
      new URL('./fixtures/occurrence/thresholds.json', import.meta.url),
      'utf8'
    )
  );
  test('it fixes the detection, the bins and the coverage test before any result', () => {
    expect(thr.systems.detection.threshold_sigma).toBe(THRESHOLD);
    expect(thr.systems.detection.min_transits).toBe(MIN_TRANSITS);
    expect(thr.ensembles.coverage.populations).toBe(400);
    expect(thr.checks.map(c => c.id)).toContain('E1');
  });
});
