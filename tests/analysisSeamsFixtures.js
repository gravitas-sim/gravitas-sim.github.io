// Fixtures for the seam tests: an experiment result as
// js/experimentsPage.js writes it, and a fit of a synthetic orbit as the fit
// panel exports it.
import { fitOnce } from '../js/inference/infer.js';
import * as IM from '../js/inference/manifest.js';
import { syntheticRv } from '../js/inference/synthetic.js';

export const clone = v => JSON.parse(JSON.stringify(v));

/** A result as js/experimentsPage.js writes it: two metrics over a setting. */
export function result({ fail = () => false, two = false } = {}) {
  const trials = [];
  const xs = [1, 2, 3, 4, 5];
  const qs = two ? [10, 20] : [null];
  for (const x of xs)
    for (const q of qs)
      for (let s = 0; s < 5; s++) {
        const bad = fail(x, s);
        const params = two ? { a: x, b: q } : { a: x };
        trials.push({
          index: trials.length,
          params,
          seed: `s${s}`,
          status: bad ? 'lostBody' : 'ok',
          results: bad
            ? { orbital_period: null, closest_approach: null }
            : {
                orbital_period: 365.25 * x ** 1.5 + 0.7 * Math.sin(7 * s + x),
                closest_approach: 0.9 * x + 0.01 * s,
              },
        });
      }
  return {
    format: 'gravitas.experiment-result',
    formatVersion: 1,
    hash: '3f2a1c9b',
    manifest: {
      format: 'gravitas.experiment',
      formatVersion: 1,
      title: 'Kepler check',
      vary: [
        { parameter: 'a', from: 1, to: 5, count: 5 },
        ...(two ? [{ parameter: 'b', from: 10, to: 20, count: 2 }] : []),
      ],
      seeds: ['s0', 's1', 's2', 's3', 's4'],
      observables: { metrics: ['orbital_period', 'closest_approach'] },
      numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    },
    engine: { fingerprint: 'aaaa0000', app: 'test' },
    finishedAt: '2026-10-07T12:00:00.000Z',
    trials,
  };
}

/** A fit document and the rows it read. */
export function fitDocument() {
  const truth = { P: 4.2308, tc: 100.3, K: 25, sqrtEcosw: 0, sqrtEsinw: 0 };
  const times = Array.from({ length: 40 }, (_, i) => 100 + i * 0.61);
  const data = syntheticRv({ seed: 'seam', times, sigma: 5, gamma: 3, truth });
  const request = {
    model: { id: 'rv-keplerian' },
    parameters: {
      P: { mode: 'fitted', lo: 4.1, hi: 4.4 },
      tc: { mode: 'fitted', lo: 99.5, hi: 101.5 },
      K: { mode: 'fitted' },
      sqrtEcosw: { mode: 'fixed', value: 0 },
      sqrtEsinw: { mode: 'fixed', value: 0 },
      jitter: { mode: 'fixed', value: 0 },
    },
    settings: {},
    algorithm: { profile: { points: 11 } },
  };
  const fit = fitOnce(request, data);
  const d = {
    ...data,
    counts: {
      total: 40,
      used: 40,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'rv', sigma: 'sigma' },
    units: { x: 'd', y: 'm/s' },
    perDay: 1,
  };
  const m = clone(
    IM.inferenceManifest(
      {
        id: 'synthetic:rv',
        title: 't',
        source: { kind: 'builtin', id: 's', version: null },
      },
      d,
      request,
      {
        concurrency: 2,
        trialTimeoutMs: 1,
        totalTimeoutMs: 1,
        maxResultBytes: 1,
      }
    )
  );
  const f = fit;
  const doc = clone({
    ...m,
    results: {
      fit: {
        ...f,
        residuals: undefined,
        fit: undefined,
        rows: undefined,
        residualCount: 40,
      },
      profiles: [],
    },
  });
  return { doc, data };
}
