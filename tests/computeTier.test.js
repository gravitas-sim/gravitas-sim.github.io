import { describe, test, expect, beforeEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  COMPUTE_TIERS,
  applyTierRequest,
  computeNote,
  computeTier,
  computeValue,
  qualityReport,
  resetSamples,
  sampleFrame,
  setTier,
} from '../js/quality.js';
import { caseBootstrap } from '../js/kernels/statistics/resample.js';
import { fitOrbit, massSum } from '../js/measure/orbit-fit.js';
import { fitOnce, profileTask } from '../js/inference/infer.js';
import { syntheticTransit, tessLikeTimes } from '../js/inference/synthetic.js';
import { ensembleManifest } from '../js/experiments/ensemble/record.js';
import { createLedger } from '../js/workers/pool.js';
import { jitteredYears, makeOrbitSeries } from '../tools/orbit-fit-synth.mjs';
import { stream } from '../js/random/streams.js';

// =============================================================================
// Reduced computation modes (Prompt 285)
// -----------------------------------------------------------------------------
// The tier's sizes live in tools/perf-thresholds.json and are mirrored in
// js/quality.js. This holds the two equal, holds every key to a file that reads
// it, and runs the kernels at both tiers' sizes: the low tier's result is the
// same computation at a smaller size, and within the tolerance the file states
// (stated before these ran, in the same file as the sizes).
// =============================================================================

const FILE = JSON.parse(
  readFileSync(new URL('../tools/perf-thresholds.json', import.meta.url))
);
const COMPUTATION = FILE.computation;

beforeEach(() => {
  setTier('auto');
  setTier('full');
  setTier('auto');
  resetSamples();
});

describe('the table and the file that holds the numbers', () => {
  test('js/quality.js mirrors tools/perf-thresholds.json exactly', () => {
    expect(COMPUTE_TIERS).toEqual(COMPUTATION.tiers);
  });

  test('every key has a tolerance and one adopter that reads it', () => {
    const keys = Object.keys(COMPUTATION.tiers.full);
    expect(Object.keys(COMPUTATION.tiers.low)).toEqual(keys);
    expect(Object.keys(COMPUTATION.tolerance)).toEqual(keys);
    expect(Object.keys(COMPUTATION.adopters)).toEqual(keys);
    for (const key of keys) {
      const source = readFileSync(
        new URL(`../${COMPUTATION.adopters[key]}`, import.meta.url),
        'utf8'
      );
      expect([key, source]).toEqual([
        key,
        expect.stringContaining(`computeValue('${key}')`),
      ]);
    }
  });

  test('the low tier never asks for more than the full tier, and never nothing', () => {
    for (const key of Object.keys(COMPUTE_TIERS.full)) {
      expect(COMPUTE_TIERS.low[key]).toBeGreaterThan(0);
      expect(COMPUTE_TIERS.low[key]).toBeLessThanOrEqual(
        COMPUTE_TIERS.full[key]
      );
    }
    // Each reduced count stays above what its consumer refuses below.
    expect(COMPUTE_TIERS.low.bootstrapDraws).toBeGreaterThanOrEqual(100);
    expect(COMPUTE_TIERS.low.profilePoints).toBeGreaterThanOrEqual(5);
  });

  test('the worker caps equal the data budget and the experiment profiles', () => {
    const budget = JSON.parse(
      readFileSync(new URL('../tools/data-budget.json', import.meta.url))
    ).ceilings;
    const of = k => budget.find(c => c.key === k).ceiling;
    expect(COMPUTE_TIERS.low.workerConcurrency).toBe(
      of('workerConcurrencyLowEnd')
    );
    expect(COMPUTE_TIERS.low.workerMemoryBytes).toBe(
      of('workerMemoryBytesLowEnd')
    );
  });
});

describe('which tier computes', () => {
  test('the quality tier decides, and ultra is the full tier', () => {
    expect(computeTier()).toBe('full');
    setTier('low');
    expect(computeTier()).toBe('low');
    expect(computeValue('bootstrapDraws')).toBe(300);
    setTier('ultra');
    expect(computeTier()).toBe('full');
    expect(computeValue('bootstrapDraws')).toBe(1000);
  });

  test('a result computed at the full tier carries no note; a low one says what changed', () => {
    expect(computeNote(['profilePoints'])).toBeNull();
    setTier('low');
    expect(computeNote(['profilePoints', 'bootstrapDraws'])).toEqual({
      tier: 'low',
      reduced: {
        profilePoints: { used: 7, full: 11 },
        bootstrapDraws: { used: 300, full: 1000 },
      },
    });
  });

  test('the reader can force the full tier, on a slow machine, and it holds', () => {
    for (let i = 0; i < 400; i++) sampleFrame(1000 + i * 100);
    expect(computeTier()).toBe('low');
    setTier('full');
    for (let i = 0; i < 400; i++) sampleFrame(100000 + i * 100);
    expect(computeTier()).toBe('full');
  });

  test('?quality= forces for a page that never renders; anything else leaves it alone', () => {
    expect(applyTierRequest('?quality=low')).toBe('low');
    expect(computeTier()).toBe('low');
    expect(applyTierRequest('?quality=full')).toBe('full');
    expect(computeTier()).toBe('full');
    expect(applyTierRequest('?quality=ultra')).toBeNull();
    expect(applyTierRequest('')).toBeNull();
    expect(computeTier()).toBe('full');
  });
});

describe('the classifier never ran', () => {
  test('a page that renders no frames reports it has not decided, and computes at the full tier', () => {
    const r = qualityReport();
    expect(r.decided).toBe(false);
    expect(r.fps).toBeNull();
    expect(r.framesSeen).toBe(0);
    expect(computeTier()).toBe('full');
    expect(computeNote(['bootstrapDraws'])).toBeNull();
  });

  test('frames that are all inside the warm-up decide nothing', () => {
    for (let i = 0; i < 20; i++) sampleFrame(1000 + i * 50);
    expect(qualityReport().decided).toBe(false);
    expect(computeTier()).toBe('full');
  });

  test('it decides on a slow machine and on a very fast one (the old gate never let the fast one)', () => {
    for (let i = 0; i < 300; i++) sampleFrame(1000 + i * 100);
    expect(qualityReport().decided).toBe(true);
    expect(computeTier()).toBe('low');
    setTier('auto');
    resetSamples();
    setTier('full');
    setTier('auto');
    expect(qualityReport().decided).toBe(false);
    for (let i = 0; i < 400; i++) sampleFrame(1000 + (i * 1000) / 150);
    expect(qualityReport().decided).toBe(true);
    expect(computeTier()).toBe('full');
  });

  test('the sampler is forgotten with everything else on a reset', () => {
    for (let i = 0; i < 300; i++) sampleFrame(1000 + i * 100);
    expect(qualityReport().decided).toBe(true);
    resetSamples();
    expect(qualityReport().decided).toBe(false);
  });
});

describe('the kernels at both tiers: the low tier is within its stated tolerance', () => {
  test('a bootstrap standard error from 300 draws is within 15 percent of 1000 draws', () => {
    // Twelve fixed seeds over one fixed sample: the standard error of the mean.
    const values = Array.from(
      { length: 40 },
      (_, i) => Math.sin(i * 1.7) * 3 + (i % 7)
    );
    const se = (draws, seed) => {
      const r = caseBootstrap({
        n: values.length,
        draws,
        seed,
        statistic: idx => {
          let sum = 0;
          for (const k of idx) sum += values[k];
          return sum / idx.length;
        },
      });
      const m = r.samples.reduce((a, b) => a + b, 0) / r.samples.length;
      return Math.sqrt(
        r.samples.reduce((a, b) => a + (b - m) ** 2, 0) / (r.samples.length - 1)
      );
    };
    for (let s = 1; s <= 12; s++) {
      const full = se(COMPUTE_TIERS.full.bootstrapDraws, `tier-${s}`);
      const low = se(COMPUTE_TIERS.low.bootstrapDraws, `tier-${s}`);
      expect(Math.abs(low - full) / full).toBeLessThan(0.15);
    }
  });

  test('the mass sum from 5000 draws has interval ends within 3 percent of the width of 20000', () => {
    const circ = { a: 1, e: 0, i: 50, Omega: 100, omega: 60, P: 8, T: 2000 };
    const fit = fitOrbit(
      makeOrbitSeries(
        circ,
        jitteredYears(2000, 9, 12, stream('noise', 'orbit-fit-test', 'm')),
        { sigma: 0.02, seed: 'mass', label: 'orbit-fit-test' }
      ),
      { depth: 'circular' }
    );
    const parallax = { value: 100, sigma: 5, unit: 'mas', frame: 'relative' };
    const full = massSum(fit, parallax, {
      draws: COMPUTE_TIERS.full.monteCarloDraws,
    });
    const low = massSum(fit, parallax, {
      draws: COMPUTE_TIERS.low.monteCarloDraws,
    });
    expect(full.ok && low.ok).toBe(true);
    // The full tier's call is the default call, unchanged: same keys, same words.
    expect(full).toEqual(massSum(fit, parallax));
    expect(full.method).toBe('seeded Monte Carlo, 20,000 draws');
    expect(full.draws).toBeUndefined();
    // The low tier says how many it drew.
    expect(low.method).toBe('seeded Monte Carlo, 5,000 draws');
    expect(low.draws).toBe(5000);
    expect(low.value).toBe(full.value);
    low.intervals.forEach((iv, k) => {
      const width = full.intervals[k].hi - full.intervals[k].lo;
      expect(Math.abs(iv.lo - full.intervals[k].lo) / width).toBeLessThan(0.03);
      expect(Math.abs(iv.hi - full.intervals[k].hi) / width).toBeLessThan(0.03);
    });
  });

  test('a profile interval from 7 points is within 5 percent of its half-width of 11 points', () => {
    const times = tessLikeTimes();
    const data = syntheticTransit({
      seed: 'tier-profile',
      times,
      sigma: 213e-6,
      truth: {
        t0: 2826.782,
        P: 3.5247486,
        k: 0.1209,
        aRs: 8.76,
        b: 0.503,
        q1: 0.36,
        q2: 0.3,
      },
      exposure: 20 / 1440,
    });
    const request = points => ({
      model: { id: 'transit-quadratic' },
      parameters: {
        t0: { lo: times[0], hi: times[0] + 3.6 },
        P: { lo: 3.4, hi: 3.65 },
      },
      settings: { exposure: 20 / 1440, supersample: 5, annuli: 32 },
      algorithm: { profile: { points } },
    });
    const fit = fitOnce(request(11), data);
    const at = points => profileTask(request(points), data, fit, 'k');
    const full = at(COMPUTE_TIERS.full.profilePoints);
    const low = at(COMPUTE_TIERS.low.profilePoints);
    const half = (full.interval[1] - full.interval[0]) / 2;
    expect(low.points.length).toBeLessThan(full.points.length + 7);
    expect(Math.abs(low.interval[0] - full.interval[0]) / half).toBeLessThan(
      0.05
    );
    expect(Math.abs(low.interval[1] - full.interval[1]) / half).toBeLessThan(
      0.05
    );
  });
});

describe('the adopters read the tier', () => {
  test('an ensemble record states the draws it was made with', () => {
    const made = () =>
      ensembleManifest({
        kind: 'sweep',
        seed: 's',
        sweep: {
          format: 'gravitas.experiment/1',
          formatVersion: 1,
          title: 't',
          model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
          initial: { settings: {} },
          seeds: ['a'],
          vary: [
            { parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 2 },
          ],
          observables: { metrics: ['distance_to_primary'], roles: {} },
          stop: { duration: 100, events: [] },
          numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
          limits: {},
          summaries: [],
        },
      });
    expect(made().ensemble.summary.draws).toBe(1000);
    setTier('low');
    expect(made().ensemble.summary.draws).toBe(300);
  });

  test('the page ledger can be given the tier’s caps, and then refuses past them', () => {
    const book = createLedger();
    book.configure({
      memoryBytes: COMPUTE_TIERS.low.workerMemoryBytes,
      realms: COMPUTE_TIERS.low.workerConcurrency,
    });
    expect(book.fits(100_000_000)).toBe(true);
    book.hold('a', 200_000_000);
    expect(book.fits(100_000_000)).toBe(false);
    expect(book.possible(300_000_000)).toBe(false);
  });
});
