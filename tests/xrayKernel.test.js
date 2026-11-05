// =============================================================================
// The X-ray counts kernel's public contract (Roadmap III, Prompt 243)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/xray/thresholds.json, run by
// tools/xray-validate.mjs and held in tests/xrayResults.test.js. These tests hold the
// contracts a caller relies on: what the counts-series contract refuses, the exact
// Poisson sampler, intervals that are never Gaussian, the hardness ratio's limits,
// binning's conservation, the outburst rule and its refusal, the period search's
// reproducibility and its simulated (never asymptotic) significance, and that a synthetic
// series stays labelled through every record.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as K from '../js/kernels/xray/index.js';
import { stream } from '../js/random/streams.js';

const gtis = [...Array(6).keys()].map(k => [k * 3000, k * 3000 + 600]);
const make = (extra = {}) =>
  K.makeSyntheticSeries({
    seed: 7,
    label: 't',
    layout: { kind: 'segments', gtis, binSeconds: 20 },
    deadFraction: 0.1,
    netRates: { S: 0.6, H: 0.4 },
    background: { rates: { S: 0.1, H: 0.1 }, areaRatio: 0.25 },
    ...extra,
  });

describe('the counts-series contract', () => {
  const { series } = make();
  test('a generated series is accepted and its view is normalised', () => {
    const v = K.validateSeries(series);
    expect(v.status).toBe('ok');
    expect(v.nLive).toBe(series.start.length);
    expect(v.synthetic).toBe(true);
  });
  test.each([
    [
      'noGti',
      s => {
        s.gti = [];
      },
    ],
    [
      'gtiInvalid',
      s => {
        s.gti[1][0] = 100;
      },
    ],
    [
      'timeSystem',
      s => {
        s.time.barycentric = undefined;
      },
    ],
    [
      'counts',
      s => {
        s.counts.S[0] = 1.5;
      },
    ],
    [
      'exposure',
      s => {
        s.exposure = undefined;
      },
    ],
    [
      'bands',
      s => {
        s.bands[1].lo = 0.5;
      },
    ],
    [
      'deadTime',
      s => {
        s.deadTime = undefined;
      },
    ],
    [
      'background',
      s => {
        s.background = { kind: 'none' };
      },
    ],
  ])('a series with %s wrong is refused with that code', (code, edit) => {
    const bad = JSON.parse(JSON.stringify(series));
    edit(bad);
    const r = K.validateSeries(bad);
    expect(r.status).toBe('refused');
    expect(r.code).toBe(code);
    expect(K.REFUSAL_CODES).toContain(code);
  });
  test('a bin with zero exposure must have zero counts and is not live', () => {
    const s = JSON.parse(JSON.stringify(series));
    s.exposure[2] = 0;
    s.counts.S[2] = 0;
    s.counts.H[2] = 0;
    s.background.counts.S[2] = 0;
    s.background.counts.H[2] = 0;
    s.deadTime.fraction[2] = 0;
    const v = K.validateSeries(s);
    expect(v.status).toBe('ok');
    expect(v.live[2]).toBe(0);
    expect(v.nLive).toBe(s.start.length - 1);
  });
});

describe('the exact Poisson sampler', () => {
  test.each([0.3, 4, 19.9, 20, 55, 400])(
    'mean %s: the sample matches the distribution (chi-square on the pmf)',
    mu => {
      const draw = stream('noise', 11, `mu${mu}`);
      const n = 60000;
      const seen = new Map();
      for (let i = 0; i < n; i++) {
        const k = K.poissonDraw(draw, mu);
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      let chi = 0;
      let cells = 0;
      let tail = 0;
      let tailObs = 0;
      let lg = 0;
      for (let k = 0; k < mu * 3 + 40; k++) {
        lg += k === 0 ? 0 : Math.log(k);
        const p = Math.exp(k * Math.log(mu) - mu - lg);
        const e = p * n;
        if (e < 5) {
          tail += e;
          tailObs += seen.get(k) ?? 0;
          continue;
        }
        chi += ((seen.get(k) ?? 0) - e) ** 2 / e;
        cells++;
      }
      if (tail > 5) {
        chi += (tailObs - tail) ** 2 / tail;
        cells++;
      }
      // chi-square on (cells - 1) dof: mean cells - 1, sd sqrt(2 (cells - 1)); five sd is a loose bound for a fixed seed
      expect(chi).toBeLessThan(cells - 1 + 5 * Math.sqrt(2 * (cells - 1)));
    }
  );
  test('zero and negative means give 0', () => {
    expect(K.poissonDraw(() => 0.5, 0)).toBe(0);
    expect(K.poissonDraw(() => 0.5, -3)).toBe(0);
  });
});

describe('rates, hardness and binning', () => {
  const { series } = make();
  test('a rate is counts over exposure with a Poisson interval that is not zero at no counts', () => {
    const s = JSON.parse(JSON.stringify(series));
    s.counts.S[0] = 0;
    s.counts.H[0] = 0;
    const r = K.rate(s);
    expect(r.method).toBe('poisson-garwood');
    expect(r.rate[0]).toBe(0);
    expect(r.lo[0]).toBe(0);
    expect(r.hi[0]).toBeGreaterThan(0.05);
    expect(r.pooled.rate).toBeCloseTo(r.pooled.counts / r.pooled.exposure, 12);
  });
  test('the net rate is refused without a background region and constrained to 0 or more', () => {
    const none = JSON.parse(JSON.stringify(series));
    none.background = { kind: 'none', negligible: true };
    expect(K.netRate(none).code).toBe('background');
    const r = K.netRateInterval({
      counts: 1,
      exposure: 10,
      bkgCounts: 40,
      areaRatio: 1,
    });
    expect(r.rawEstimate).toBeLessThan(0);
    expect(r.rate).toBe(0);
    expect(r.lo).toBe(0);
    expect(r.hi).toBeGreaterThan(0);
  });
  test('a hardness needs two different ordered bands', () => {
    expect(K.hardness(series, { soft: 'S', hard: 'S' }).code).toBe(
      'bandsNeeded'
    );
    expect(K.hardness(series, { soft: 'H', hard: 'S' }).code).toBe(
      'bandsNeeded'
    );
    expect(K.hardness(series, { soft: 'S', hard: 'nope' }).code).toBe(
      'bandsNeeded'
    );
    const h = K.hardness(series, { soft: 'S', hard: 'H' });
    expect(h.status).toBe('ok');
    expect(h.pooled.lo).toBeLessThan(h.pooled.hr);
    expect(h.pooled.hr).toBeLessThan(h.pooled.hi);
  });
  test('the net hardness needs a background region and is inside [-1, 1]', () => {
    const net = K.hardness(series, { soft: 'S', hard: 'H', mode: 'net' });
    expect(net.status).toBe('ok');
    expect(net.pooled.lo).toBeGreaterThanOrEqual(-1);
    expect(net.pooled.hi).toBeLessThanOrEqual(1);
    const none = JSON.parse(JSON.stringify(series));
    none.background = { kind: 'none', negligible: true };
    expect(K.hardness(none, { soft: 'S', hard: 'H', mode: 'net' }).code).toBe(
      'background'
    );
  });
  test('binning by counts conserves counts, keeps the short tail, and carries the background region', () => {
    const b = K.binByCounts(series, {
      band: ['S', 'H'],
      minCounts: 30,
      maxGap: 25,
    });
    expect(b.status).toBe('ok');
    const v = K.validateSeries(b.series);
    expect(v.status).toBe('ok');
    const sum = (s, id) => s.counts[id].reduce((a, c) => a + c, 0);
    expect(sum(b.series, 'S')).toBe(sum(series, 'S'));
    expect(sum(b.series.background, 'H')).toBe(sum(series.background, 'H'));
    expect(K.binByCounts(series, { minCounts: 0 }).code).toBe('counts');
  });
  test('the hardness-intensity points are in time order and the track names no state', () => {
    const p = K.hardnessIntensity(series, {
      soft: 'S',
      hard: 'H',
      minCounts: 40,
    });
    expect(p.status).toBe('ok');
    for (let i = 1; i < p.points.length; i++)
      expect(p.points[i].t).toBeGreaterThan(p.points[i - 1].t);
    expect(JSON.stringify(p)).not.toMatch(/\bstate\b/i);
  });
});

describe('outbursts', () => {
  test('a constant series has none, and a bright-most-of-the-time series is refused', () => {
    const quiet = K.makeSyntheticSeries({
      seed: 3,
      layout: { kind: 'segments', gtis: [[0, 20000]], binSeconds: 100 },
      netRates: { S: 1.2, H: 0.8 },
    }).series;
    const q = K.detectOutbursts(quiet);
    expect(q.status).toBe('ok');
    expect(q.runs).toEqual([]);
    const high = K.makeSyntheticSeries({
      seed: 3,
      layout: { kind: 'segments', gtis: [[0, 20000]], binSeconds: 100 },
      netRates: { S: 1.2, H: 0.8 },
      step: { from: 8000, to: 20000, factor: 6 },
    }).series;
    expect(K.detectOutbursts(high).code).toBe('noQuietLevel');
  });
});

describe('the period search', () => {
  const sinus = (extra = {}) =>
    K.makeSyntheticSeries({
      seed: 21,
      label: 'p',
      layout: { kind: 'segments', gtis: [[0, 12000]], binSeconds: 30 },
      netRates: { S: 0.9, H: 0.6 },
      modulation: { period: 410, fractionalSemiAmplitude: 0.4 },
      ...extra,
    });
  const opts = { minPeriod: 100, maxPeriod: 1200, nSim: 99, seed: 5 };
  test('it recovers the period, reports a simulated significance and is reproducible', () => {
    const { series } = sinus();
    const a = K.searchPeriod(series, opts);
    const b = K.searchPeriod(series, opts);
    expect(a.status).toBe('ok');
    expect(Math.abs(a.period - 410)).toBeLessThan(5);
    expect(a.significance.method).toBe('simulation');
    expect(a.significance.p).toBe(0.01);
    expect(a.significance.trials).toBe(a.grid.frequencies);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect('falseAlarm' in a).toBe(false);
  });
  test('a different seed changes the simulations and not the periodogram', () => {
    const { series } = sinus({
      modulation: { period: 410, fractionalSemiAmplitude: 0.02 },
    });
    const a = K.searchPeriod(series, opts);
    const b = K.searchPeriod(series, { ...opts, seed: 6 });
    expect(a.period).toBe(b.period);
    expect(a.significance.p).toBeGreaterThan(0.01);
  });
  test('it refuses non-barycentric times, too few simulations and a period shorter than two bins', () => {
    const { series } = sinus({ barycentric: false });
    expect(K.searchPeriod(series, opts).code).toBe('notBarycentric');
    const ok = sinus().series;
    expect(K.searchPeriod(ok, { ...opts, nSim: 98 }).code).toBe('simulations');
    expect(K.searchPeriod(ok, { ...opts, seed: undefined }).code).toBe(
      'simulations'
    );
    expect(K.searchPeriod(ok, { ...opts, minPeriod: 50 }).code).toBe(
      'undersampled'
    );
  });
  test('the period interval brackets the recovered period', () => {
    const { series } = sinus();
    const pk = K.peakFrequency(series, opts);
    const pi = K.periodInterval(series, {
      frequency: pk.frequency,
      seed: 9,
      nBoot: 100,
    });
    expect(pi.periodLo).toBeLessThan(pi.period);
    expect(pi.period).toBeLessThan(pi.periodHi);
    expect(pi.periodHi - pi.periodLo).toBeLessThan(10);
  });
});

describe('synthetic series', () => {
  test('are deterministic in the seed and label, and labelled with their truth', () => {
    const a = make();
    const b = make();
    expect(JSON.stringify(a.series)).toBe(JSON.stringify(b.series));
    expect(make({ seed: 8 }).series.counts.S).not.toEqual(a.series.counts.S);
    expect(a.series.label).toMatch(/^SYNTHETIC COUNT SERIES/);
    expect(a.truth.synthetic).toBe(true);
    expect(a.truth.spec.netRates).toEqual({ S: 0.6, H: 0.4 });
  });
  test('every record from a synthetic series says so, and a plain one does not', () => {
    const { series } = make();
    for (const r of [
      K.rate(series),
      K.netRate(series),
      K.hardness(series, { soft: 'S', hard: 'H' }),
      K.binByCounts(series, { minCounts: 30 }),
    ]) {
      expect(r.synthetic).toBe(true);
      expect(r.label).toMatch(/^SYNTHETIC/);
    }
    expect('synthetic' in K.rate(make({ synthetic: false }).series)).toBe(
      false
    );
  });
});
