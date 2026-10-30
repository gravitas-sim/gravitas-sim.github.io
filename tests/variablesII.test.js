// =============================================================================
// Variables II: the features, the metallicity term, the refusals (Prompt 223 Part A)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/variables-ii/thresholds.json is run by
// tools/variables-ii-validate.mjs (an oracle row reads the astropy pin); this holds
// the kernel to the pieces that must not drift, holds the cited constants equal to
// the file that carries their place in each paper, and holds the committed results
// to the committed thresholds.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lightCurveFeatures,
  harmonicFit,
  makeSample,
  classifyLeaveOneOut,
  classifyWithAmbiguity,
  confusion,
  FEATURE_SETS,
  ladderDistance,
  ladderWithMetallicity,
  wesenheitAbsolute,
  distanceFactor,
  largestPhaseGap,
} from '../js/kernels/variables/index.js';
import { CITED_PLZ } from '../js/kernels/variables/plzCited.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tests/fixtures/variables-ii');
const read = f => JSON.parse(readFileSync(path.join(FIX, f), 'utf8'));
const TAU = 2 * Math.PI;

const curve = (t, P) =>
  t.map(
    x =>
      0.2 * Math.cos((TAU * x) / P + 0.3) +
      0.07 * Math.cos((2 * TAU * x) / P + 1.1) +
      0.02 * Math.cos((3 * TAU * x) / P + 0.5)
  );
const times = (n, span) =>
  Array.from({ length: n }, (_, i) => (i * 0.6180339887 * span) % span).sort(
    (a, b) => a - b
  );

describe('the cited numbers', () => {
  const c = read('citations.json');
  test('the kernel holds the numbers the citations file carries', () => {
    expect(CITED_PLZ.riess2022.gamma).toBe(c.riess2022.gamma);
    expect(CITED_PLZ.riess2022.sigma).toBe(c.riess2022.sigma);
    expect(CITED_PLZ.riess2022.zRef).toBe(c.riess2022.zRef);
    expect(CITED_PLZ.breuval2022.gamma).toBe(c.breuval2022.gamma);
    expect(CITED_PLZ.breuval2022.sigma).toBe(c.breuval2022.sigma);
    for (const k of ['lmc', 'n4258', 'm101']) {
      expect(CITED_PLZ.hosts[k].value).toBe(c.hosts[k].value);
      expect(CITED_PLZ.hosts[k].sigma).toBe(c.hosts[k].sigma);
    }
    expect([...CITED_PLZ.range]).toEqual(c.range);
  });
  test('the coefficients are negative: a metal-rich Cepheid is brighter', () => {
    expect(CITED_PLZ.riess2022.gamma).toBeLessThan(0);
    expect(CITED_PLZ.breuval2022.gamma).toBeLessThan(0);
  });
});

describe('the committed validation', () => {
  const thresholds = read('thresholds.json');
  const results = read('results.json');
  const failed = read('failed-legs.json');
  test('every committed leg has a result, and a leg that crossed its bound is in failed-legs.json', () => {
    const ids = thresholds.checks.map(c => c.id).sort();
    expect(results.rows.map(r => r.id).sort()).toEqual(ids);
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(failed.failed.map(r => r.id).sort()).toEqual(failing);
    expect(
      results.rows.every(r => r.status === 'pass' || r.status === 'fail')
    ).toBe(true);
  });
  test('the oracle was run at the kernel’s period', () => {
    const o = read('oracle-results.json');
    expect(o.tool).toMatch(/astropy 6\./);
    expect(o.kernelPeriod).toBeGreaterThan(0.66);
    expect(o.atKernelPeriod.amplitude).toBeGreaterThan(0.6);
  });
});

describe('the features', () => {
  const P = 7.3;
  test('a noise-free three-harmonic curve gives its parameters back', () => {
    const t = times(240, 9 * P);
    const f = lightCurveFeatures(t, curve(t, P), P);
    expect(f.status).toBe('ok');
    expect(f.fourier.r21.value).toBeCloseTo(0.35, 9);
    expect(f.fourier.r31.value).toBeCloseTo(0.1, 9);
    expect(f.harmonics.every(h => h.detected)).toBe(true);
  });
  test('fewer than three cycles withdraws every shape number and says why', () => {
    const t = times(120, 1.5 * P);
    const f = lightCurveFeatures(t, curve(t, P), P);
    expect(f.status).toBe('not-constrained');
    expect(f.reason).toBe('cycles');
    expect(f.fourier).toBeNull();
    expect(f.amplitude).toBeNull();
    expect(f.mean).not.toBeNull();
  });
  test('a gap of more than a third of the phases withdraws them too', () => {
    const t = times(300, 6 * P).map(x => Math.floor(x / P) * P + (x % P) * 0.5);
    expect(largestPhaseGap(t, P)).toBeGreaterThan(0.35);
    expect(lightCurveFeatures(t, curve(t, P), P).reason).toBe('phase-gap');
  });
  test('a refused period or harmonic count is a reason, not a throw', () => {
    const t = times(100, 9 * P);
    expect(lightCurveFeatures(t, curve(t, P), -1).reason).toBe('period');
    expect(lightCurveFeatures(t, curve(t, P), P, { K: 2 }).reason).toBe(
      'harmonics'
    );
    expect(lightCurveFeatures([1, 2, 3], [1, 2, 3], P).reason).toBe('points');
  });
  test('harmonicFit gained fields and lost none', () => {
    const t = times(100, 9 * P);
    const fit = harmonicFit(t, curve(t, P), P, 3);
    expect(fit.coefficients).toHaveLength(7);
    expect(fit.covariance).toHaveLength(7);
    expect(fit.harmonics).toHaveLength(3);
    expect(typeof fit.at).toBe('function');
  });
});

describe('the metallicity term', () => {
  const g = CITED_PLZ.riess2022;
  const mk = (n, mu, shift, b = -3.3) => ({
    periods: Array.from({ length: n }, (_, i) => 6 + 3 * i),
    mags: Array.from(
      { length: n },
      (_, i) =>
        mu + b * (Math.log10(6 + 3 * i) - 1) + shift + 0.01 * Math.sin(i * 2.1)
    ),
  });
  const anchor = mk(40, 18.5, 0);
  const host = mk(15, 29.4, 0.0);
  const quoted = { mu: 18.477, sigma: 0.026 };
  test('the relation is the anchor’s at the reference metallicity and shifts by gamma per dex', () => {
    const rel = { M0: -5.9, b: -3.3, gamma: g.gamma, zRef: 0 };
    expect(wesenheitAbsolute(rel, 10, 0)).toBe(-5.9);
    expect(
      wesenheitAbsolute(rel, 10, 0.4) - wesenheitAbsolute(rel, 10, 0)
    ).toBeCloseTo(g.gamma * 0.4, 12);
  });
  test('a metal-richer host is moved farther; the factor is ten to the gamma dZ over five', () => {
    const meta = {
      gamma: g.gamma,
      sigmaGamma: g.sigma,
      host: -0.1,
      anchor: -0.29,
      sigmaHost: 0.05,
      sigmaAnchor: 0.02,
    };
    const base = ladderDistance(host, anchor, quoted, {});
    const r = ladderWithMetallicity(host, anchor, quoted, meta, {});
    expect(r.mu - base.mu).toBeCloseTo(-g.gamma * 0.19, 12);
    expect(r.mu).toBeGreaterThan(base.mu);
    expect(r.sigma).toBeGreaterThan(base.sigma);
    expect(r.metallicity.factor * distanceFactor(g.gamma, 0.19)).toBeCloseTo(
      1,
      12
    );
  });
  test('no metallicity gives the uncorrected modulus and says so; outside the range is flagged', () => {
    const base = ladderDistance(host, anchor, quoted, {});
    const miss = ladderWithMetallicity(
      host,
      anchor,
      quoted,
      { gamma: g.gamma, host: NaN, anchor: -0.29 },
      {}
    );
    expect(miss.mu).toBe(base.mu);
    expect(miss.metallicity.status).toBe('missing');
    expect(
      ladderWithMetallicity(host, anchor, quoted, null, {}).metallicity.applied
    ).toBe(false);
    const out = ladderWithMetallicity(
      host,
      anchor,
      quoted,
      {
        gamma: g.gamma,
        host: -0.9,
        anchor: -0.29,
        range: [...CITED_PLZ.range],
      },
      {}
    );
    expect(out.metallicity.status).toBe('outside-range');
  });
});

describe('the classification exercise with a refusal', () => {
  const rows = makeSample();
  test('the plain vote is unchanged: period only is 83.3 percent', () => {
    expect(
      confusion(rows, classifyLeaveOneOut(rows, FEATURE_SETS.period)).accuracy
    ).toBeCloseTo(100 / 120, 12);
  });
  test('a star with fewer than four votes of five is given no class and lists its candidates', () => {
    const v = classifyWithAmbiguity(rows, FEATURE_SETS.periodAmplitude);
    expect(v.filter(a => a.cls === null).length).toBe(11);
    expect(v.every(a => (a.cls === null) === a.votes < 4)).toBe(true);
    expect(
      v.filter(a => a.cls === null).every(a => a.candidates.length >= 1)
    ).toBe(true);
    const strict = classifyWithAmbiguity(rows, FEATURE_SETS.periodAmplitude, {
      minVotes: 5,
    });
    expect(strict.filter(a => a.cls === null).length).toBeGreaterThan(11);
  });
});
