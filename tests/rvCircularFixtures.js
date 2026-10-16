// The radial-velocity fixtures the circular fitter and its Monte Carlo are held
// to, bit for bit, across the move into the inference core (Prompt 66 step 3).
// tests/fixtures/rvCircularGolden.json was written by the code as it stood in
// js/rvFit.js and js/rvUncertainty.js before the move; it pins a SHA-256 of
// every result, serialized with every digit (and the sign of zero), so a
// changed last bit anywhere fails it. Imports only js/rng.js, so it can drive
// either implementation.

import { createHash } from 'node:crypto';
import { mulberry32, normalizeSeed } from '../js/rng.js';

/** Standard normal draws, from the same seeded uniform stream the app uses. */
function normals(seed) {
  const u = mulberry32(normalizeSeed(seed));
  return () => {
    const a = Math.max(u(), 1e-12);
    const b = u();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  };
}

const rec = ({ truth, days, sigma, seed }) => {
  const g = normals(seed);
  return days.map(day => ({
    day,
    rv:
      truth.gamma +
      truth.K * Math.sin((2 * Math.PI * day) / truth.period + truth.phase) +
      (sigma ? sigma * g() : 0),
    sigma,
    quality: 'ok',
    missed: false,
  }));
};
const evenly = (n, step) => Array.from({ length: n }, (_, i) => i * step);

export const CASES = [
  {
    name: 'well sampled, forty epochs over a fortnight',
    points: rec({
      truth: { period: 3.5, K: 40, gamma: -3, phase: 1.1 },
      days: evenly(40, 0.37),
      sigma: 4,
      seed: 'data',
    }),
    bounds: { minPeriod: 1, maxPeriod: 10 },
    samples: 3000,
    at: 3.5,
  },
  {
    name: 'the workspace recording, 24 epochs at 0.37 d',
    points: rec({
      truth: { period: 3.2, K: 45, gamma: 5, phase: 0 },
      days: evenly(24, 0.37),
      sigma: 2,
      seed: 'workspace',
    }),
    bounds: { minPeriod: 1.5, maxPeriod: 8 },
    at: 3.2,
  },
  {
    name: 'twelve sparse epochs, aliases',
    points: rec({
      truth: { period: 4.7, K: 25, gamma: 0, phase: 2 },
      days: [0, 1.3, 2.9, 4.1, 6.6, 7.2, 9.9, 12.4, 13.1, 16.8, 19.5, 21.7],
      sigma: 5,
      seed: 'sparse',
    }),
    bounds: { minPeriod: 1, maxPeriod: 15 },
    at: 4.7,
  },
  {
    name: 'no uncertainties, uniform weights',
    points: rec({
      truth: { period: 2.2, K: 30, gamma: 1, phase: 0.4 },
      days: evenly(20, 0.5),
      sigma: 0,
      seed: 'flat',
    }),
    bounds: { minPeriod: 1, maxPeriod: 6 },
    at: 2.2,
    noMonteCarlo: true,
  },
  {
    name: 'with a missed epoch and a degraded one',
    points: [
      ...rec({
        truth: { period: 6.1, K: 18, gamma: -8, phase: 5 },
        days: evenly(18, 0.9),
        sigma: 3,
        seed: 'gappy',
      }),
      { day: 20, rv: null, sigma: null, quality: 'missed', missed: true },
      { day: 21, rv: 3, sigma: 3, quality: 'degraded', missed: false },
    ],
    bounds: { minPeriod: 2, maxPeriod: 12 },
    at: 6.1,
  },
];

const replacer = (k, v) => (Object.is(v, -0) ? '-0' : v);
export const digest = value =>
  createHash('sha256').update(JSON.stringify(value, replacer)).digest('hex');

/**
 * Every result for every case, as one digest each.
 *
 * @param {{usablePoints, periodSearch, fitAtPeriod, runMonteCarlo}} api
 */
export async function measure(api) {
  const out = {};
  for (const c of CASES) {
    const { usable } = api.usablePoints(c.points);
    const search = await api.periodSearch(usable, {
      ...c.bounds,
      samples: c.samples,
    });
    const at = await api.fitAtPeriod(usable, c.at);
    out[c.name] = {
      search: digest(search),
      fitAtPeriod: digest(at),
      // Readable, so a failure says which number moved.
      bestPeriod: search.bestPeriod,
      bestChi2: search.best.chi2,
    };
    if (c.noMonteCarlo) continue;
    const mc = await api.runMonteCarlo({
      points: c.points,
      params: search.best,
      ...c.bounds,
      trials: 60,
      seed: 'mc-1',
    });
    out[c.name].monteCarlo = digest(mc);
    out[c.name].mcOutcome = mc.outcome;
  }
  return out;
}
