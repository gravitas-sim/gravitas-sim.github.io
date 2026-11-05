// =============================================================================
// The pulsar kernel's public contract (Roadmap III, Prompt 242, Part A)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/pulsars/thresholds.json, run by
// tools/pulsar-validate.mjs and held in tests/pulsarResults.test.js. These tests hold
// the contracts a caller relies on: the dispersion law and its derived constant, the
// generator's label, truth manifest and determinism, de-dispersion and folding on
// hand-built series, the arrival-phase matched filter, the DM and period with their
// intervals, the refusals by code, and the labelled DM distance.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as K from '../js/kernels/radio/index.js';
import { gaussian, stream } from '../js/random/streams.js';
import { PC_M } from '../js/kernels/radiation/constants.js';

const CONSTANTS = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/pulsars/constants-source.json', import.meta.url),
    'utf8'
  )
);

const bright = (o = {}) =>
  K.generateDynamicSpectrum({
    period: 0.2373,
    dm: 60,
    phase0: 0.3,
    amplitude: 1,
    subchannels: 4,
    seed: 'kernel-test',
    ...o,
  });

describe('the dispersion constant and the delay law', () => {
  test('the constant is derived from alpha, h and m_e copied from the pinned reading, not typed', () => {
    expect(K.ALPHA_FS).toBe(CONSTANTS.alpha.value);
    expect(K.M_ELECTRON_KG).toBe(CONSTANTS.m_e.value);
    const k =
      (((CONSTANTS.alpha.value * 6.62607015e-34) /
        (4 * Math.PI * Math.PI * CONSTANTS.m_e.value)) *
        PC_M *
        1e6) /
      1e12;
    expect(K.DISPERSION_CONSTANT / k).toBeCloseTo(1, 14);
    expect(K.DISPERSION.status).toMatch(/constants-source\.json/);
    expect(K.DISPERSION.status).toMatch(/not verified by a fetch/);
    expect(Object.isFrozen(K.DISPERSION)).toBe(true);
  });
  test('the pinned reading names the library, its edition and uncertainty, and was not fetched', () => {
    expect(CONSTANTS.reader).toMatch(/offline/);
    expect(CONSTANTS.alpha.reference).toMatch(/CODATA/);
    expect(CONSTANTS.m_e.uncertainty).toBeGreaterThan(0);
  });
  test('delay goes as 1 / f^2 and as DM, the lower frequency arrives later, units agree', () => {
    expect(
      K.dispersionDelay(700, 40) / K.dispersionDelay(1400, 40)
    ).toBeCloseTo(4, 12);
    expect(
      K.dispersionDelay(1400, 120) / K.dispersionDelay(1400, 40)
    ).toBeCloseTo(3, 12);
    expect(K.dispersionSweep(1200, 1500, 30)).toBeGreaterThan(0);
    expect(K.dispersionSweep(1500, 1200, 30)).toBeLessThan(0);
    expect(K.dispersionDelay(1.4, 40, { unit: 'GHz' })).toBeCloseTo(
      K.dispersionDelay(1400, 40),
      12
    );
    expect(K.dispersionDelay(1.4e9, 40, { unit: 'Hz' })).toBeCloseTo(
      K.dispersionDelay(1400, 40),
      12
    );
  });
  test('a sweep gives the DM back; equal frequencies cannot', () => {
    const sw = K.dispersionSweep(1200, 1500, 77.7);
    expect(K.dmFromSweep(1200, 1500, sw)).toBeCloseTo(77.7, 10);
    expect(() => K.dmFromSweep(1400, 1400, 0.1)).toThrow(
      expect.objectContaining({ code: 'not-constrained' })
    );
  });
  test('smearing across a channel is 2 K DM df / f^3 to leading order', () => {
    const s = K.smearing(1350, 18.75, 60);
    expect(s.leading / s.exact).toBeCloseTo(1, 3);
    expect(s.leading).toBeCloseTo(
      (2 * K.DISPERSION_CONSTANT * 60 * 18.75) / 1350 ** 3,
      15
    );
  });
  test('a caller can pass its own (rounded) constant and every delay follows it', () => {
    expect(K.dispersionDelay(1400, 10, { constant: 4000 })).toBeCloseTo(
      (4000 * 10) / 1400 ** 2,
      15
    );
  });
  test('bad arguments are refused by code, never a number', () => {
    for (const f of [
      () => K.dispersionDelay(0, 10),
      () => K.dispersionDelay(-5, 10),
      () => K.dispersionDelay(1400, -1),
      () => K.dispersionDelay(NaN, 10),
      () => K.dispersionDelay(1400, 10, { unit: 'THz' }),
    ])
      expect(f).toThrow(expect.objectContaining({ code: 'bad-argument' }));
  });
});

describe('the synthetic generator', () => {
  test('it carries the label and a complete truth manifest', () => {
    const s = bright();
    expect(s.label).toBe(K.PULSAR_SYNTHETIC_LABEL);
    expect(s.label).toMatch(/SYNTHETIC/);
    expect(s.truth.label).toBe(s.label);
    for (const k of [
      'period',
      'dm',
      'phase0',
      'constant',
      'subchannels',
      'noiseSigma',
      'seed',
      'delaysS',
      'smearingS',
      'sweepS',
      'sweepTurns',
      'components',
      'expectedChannelSnr',
    ])
      expect(s.truth[k]).toBeDefined();
    expect(s.truth.sweepS).toBeCloseTo(
      K.dispersionSweep(s.frequencyMHz[0], s.frequencyMHz[s.nchan - 1], 60),
      12
    );
    expect(s.frequencyMHz[0]).toBeCloseTo(1200 + 18.75 / 2, 10);
  });
  test('the noise is a named stream: the same seed repeats, another differs', () => {
    expect(bright().data).toEqual(bright().data);
    expect(bright({ seed: 'other' }).data).not.toEqual(bright().data);
  });
  test('with no noise the series is the pulse train alone and repeats at the period', () => {
    const s = bright({
      noiseSigma: 0,
      subchannels: 1,
      dt: 0.001,
      samples: 4000,
      period: 0.25,
    });
    const c = 5 * s.nsamp;
    // one period is 250 samples, and the dispersion delay moves the whole train rigidly
    for (const j of [300, 777, 1500])
      expect(s.data[c + j]).toBeCloseTo(s.data[c + j + 250], 12);
  });
  test('it refuses a negative or non-finite DM, a non-positive period, a negative noise, a descending band', () => {
    for (const o of [
      { dm: -1 },
      { dm: NaN },
      { period: 0 },
      { noiseSigma: -1 },
      { bandMHz: [1500, 1200] },
    ])
      expect(() =>
        K.generateDynamicSpectrum({ period: 0.25, dm: 10, ...o })
      ).toThrow(expect.objectContaining({ code: 'bad-argument' }));
  });
  test('a catalogue row gives its period (1 / F0) and DM and nothing else', () => {
    expect(K.pulsarFromRow({ name: 'x', f0Hz: 200, dmPcCm3: 12.5 })).toEqual({
      name: 'x',
      period: 0.005,
      dm: 12.5,
    });
    expect(() => K.pulsarFromRow({ f0Hz: 0, dmPcCm3: 3 })).toThrow();
  });
});

describe('de-dispersion and folding', () => {
  const impulses = (period, dm, freqs, dt, n) => {
    const data = new Float64Array(freqs.length * n);
    freqs.forEach((f, c) => {
      const d = Math.round(K.dispersionDelay(f, dm) / dt);
      for (let t = d + 20; t < n; t += period) data[c * n + t] = 1;
    });
    return { frequencyMHz: freqs, dt, nsamp: n, nchan: freqs.length, data };
  };
  test('integer-sample delays are removed exactly: the aligned sum is the impulse train', () => {
    const freqs = [1200, 1300, 1400, 1500];
    const dyn = impulses(100, 20, freqs, 0.001, 3000);
    const r = K.dedisperse(dyn, 20, { method: 'nearest' });
    const top = Math.round(K.dispersionDelay(1500, 20) / dyn.dt);
    // after alignment the pulses sit where the top channel's are, every 100 samples, full height
    let hits = 0;
    for (let j = 0; j < r.length; j++)
      if (r.series[j] > 0.999) {
        hits++;
        expect((((j - top - 20) % 100) + 100) % 100).toBe(0);
      }
    expect(hits).toBeGreaterThan(20);
    expect(r.droppedSamples).toBeGreaterThan(0);
    expect(r.referenceMHz).toBe(1500);
  });
  test('linear and nearest give series of the stated lengths and never wrap', () => {
    const dyn = bright({ noiseSigma: 0 });
    const n = K.dedisperse(dyn, 80, { method: 'nearest' });
    const l = K.dedisperse(dyn, 80, { method: 'linear' });
    expect(n.length).toBe(dyn.nsamp - n.droppedSamples);
    expect(l.length).toBe(dyn.nsamp - l.droppedSamples);
    expect(n.series).toHaveLength(n.length);
    expect(() => K.dedisperse(dyn, 80, { method: 'cubic' })).toThrow(
      expect.objectContaining({ code: 'bad-argument' })
    );
    expect(() => K.dedisperse(dyn, -1)).toThrow(
      expect.objectContaining({ code: 'bad-argument' })
    );
  });
  test('folding conserves the sum and counts every sample once', () => {
    const y = Float64Array.from(
      { length: 1000 },
      (_, i) => Math.sin(i / 7) + 2
    );
    const f = K.foldSeries(y, 0.002, 0.1313, 32);
    expect(f.counts.reduce((a, b) => a + b, 0)).toBe(1000);
    let s = 0;
    for (let b = 0; b < 32; b++) s += f.counts[b] * f.profile[b];
    expect(s).toBeCloseTo(f.total, 9);
  });
  test('the white noise sigma comes from the differences and is not fooled by a pulse train', () => {
    const draw = gaussian(stream('noise', 7, 'sigma-test'));
    const y = Float64Array.from(
      { length: 8000 },
      (_, i) => 3 * draw() + (i % 100 < 5 ? 40 : 0)
    );
    expect(K.noiseSigma(y)).toBeGreaterThan(2.8);
    expect(K.noiseSigma(y)).toBeLessThan(3.2);
  });
  test('the fold statistic of white noise is chi-square with nbin - 1 degrees of freedom', () => {
    const draw = gaussian(stream('noise', 8, 'chi-test'));
    let sum = 0;
    const n = 60;
    for (let i = 0; i < n; i++) {
      const y = Float64Array.from({ length: 4000 }, () => draw());
      sum += K.foldStatistic(K.foldSeries(y, 0.002, 0.1731, 32), 1).chi2;
    }
    expect(sum / n / 31).toBeGreaterThan(0.9);
    expect(sum / n / 31).toBeLessThan(1.1);
  });
  test('the trial correction multiplies by the trials, caps at one and never lowers p', () => {
    expect(K.trialCorrected(1e-5, 1000)).toBeCloseTo(1e-2, 12);
    expect(K.trialCorrected(0.4, 1e6)).toBe(1);
    expect(K.trialCorrected(0.3, 1)).toBe(0.3);
  });
  test('the period search finds a noise-free period on its grid and carries its trial count and range', () => {
    const dyn = bright({ noiseSigma: 0, subchannels: 1, period: 0.261803 });
    const dd = K.dedisperse(dyn, 60, { method: 'nearest' });
    const s = K.searchPeriod(dd.series, dyn.dt, {
      pMin: 0.15,
      pMax: 0.35,
      sigma: 1e-3,
    });
    expect(Math.abs(s.period / 0.261803 - 1)).toBeLessThan(1e-4);
    expect(s.trials).toBe(s.gridSize);
    expect(s.range).toEqual([0.15, 0.35]);
    expect(s.atRangeEdge).toBe(false);
    expect(s.doublePeriodChi2).toBeLessThan(s.chi2 * 1.0001);
  });
  test('a period of more than a third of the series, or an inverted range, is refused', () => {
    const y = new Float64Array(1000);
    expect(() =>
      K.searchPeriod(y, 0.002, { pMin: 0.1, pMax: 0.9, sigma: 1 })
    ).toThrow(expect.objectContaining({ code: 'bad-argument' }));
    expect(() =>
      K.searchPeriod(y, 0.002, { pMin: 0.3, pMax: 0.2, sigma: 1 })
    ).toThrow(expect.objectContaining({ code: 'bad-range' }));
  });
});

describe('the arrival-phase matched filter', () => {
  const shape = n =>
    Float64Array.from({ length: n }, (_, b) => {
      const d = (b + 0.5) / n - 0.5;
      return (
        Math.exp(-0.5 * (d / 0.04) ** 2) +
        0.4 * Math.exp(-0.5 * ((d - 0.15) / 0.03) ** 2)
      );
    });
  test('a profile shifted by a known phase is recovered, with the sign of a later arrival positive', () => {
    const n = 64;
    const T = K.harmonics(shape(n));
    T.varBin = 1e-8;
    for (const phi of [-0.31, -0.07, 0, 0.02, 0.2, 0.44]) {
      const P = K.rotate(T, -phi);
      P.varBin = 1e-8;
      const m = K.matchTemplate(P, T);
      expect(m.usable).toBe(true);
      expect(m.phase).toBeCloseTo(phi, 6);
      expect(m.amplitude).toBeCloseTo(1, 6);
    }
  });
  test('a profile of noise alone is not usable and says why', () => {
    const draw = gaussian(stream('noise', 3, 'match-test'));
    const n = 64;
    const T = K.harmonics(shape(n));
    T.varBin = 1e-4;
    const noise = K.harmonics(Float64Array.from({ length: n }, () => draw()));
    noise.varBin = 1;
    const m = K.matchTemplate(noise, T);
    expect(m.usable).toBe(false);
  });
  test('combining profiles averages them by inverse variance and reports the variance of the mean', () => {
    const a = {
      nbin: 8,
      re: Float64Array.of(1, 2, 3, 4),
      im: new Float64Array(4),
      varBin: 1,
    };
    const b = {
      nbin: 8,
      re: Float64Array.of(3, 4, 5, 6),
      im: new Float64Array(4),
      varBin: 3,
    };
    const c = K.combine([a, b]);
    expect(c.re[0]).toBeCloseTo((1 * 1 + 3 * (1 / 3)) / (1 + 1 / 3), 12);
    expect(c.varBin).toBeCloseTo(1 / (1 + 1 / 3), 12);
    expect(K.combine([a, b], 1).re[1]).toBe(2);
  });
});

describe('the dispersion measure and the period of a bright synthetic pulsar', () => {
  const dyn = bright({ dm: 72.5, period: 0.2412, phase0: 0.61, seed: 'kt-1' });
  const r = K.analyzePulsar(dyn, {
    dmRange: [10, 140],
    periodRange: [0.15, 0.35],
  });
  test('the analysis returns both, each inside its 95 percent interval of the truth, with the constant named', () => {
    expect(r.status).toBe('ok');
    expect(r.dm.interval95.lo).toBeLessThan(72.5);
    expect(r.dm.interval95.hi).toBeGreaterThan(72.5);
    expect(r.period.interval95.lo).toBeLessThan(0.2412);
    expect(r.period.interval95.hi).toBeGreaterThan(0.2412);
    expect(r.constant).toBe(K.DISPERSION_CONSTANT);
    expect(r.dm.constant).toBe(K.DISPERSION_CONSTANT);
    expect(r.dm.interval68.level).toBeCloseTo(0.6827, 3);
    expect(r.dm.sigma).toBeGreaterThan(0);
  });
  test('the detection carries its trial count, the range searched and a trial-corrected probability', () => {
    expect(r.detection.trials).toBeGreaterThan(1000);
    expect(r.detection.range).toEqual([0.15, 0.35]);
    expect(r.detection.pCorrected).toBeLessThan(1e-3);
  });
  test('the folded profile for a panel is returned with its counts', () => {
    expect(r.profile.values).toHaveLength(64);
    expect(r.profile.counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(5000);
  });
  test('the existing periodogram agrees with the fold within its own resolution', () => {
    const dd = K.dedisperse(dyn, r.dm.dm, { method: 'nearest' });
    const ls = K.periodFromPeriodogram(dd.series, dyn.dt, {
      pMin: 0.15,
      pMax: 0.35,
    });
    expect(Math.abs(ls.period - r.period.period)).toBeLessThan(
      2 * ls.resolution
    );
    expect(ls.width).toBeGreaterThan(0);
    expect(ls.method).toMatch(/Lomb-Scargle/);
  });
});

describe('what the analysis refuses', () => {
  test('noise alone is "no-pulsar", with no period and no DM', () => {
    const s = bright({ amplitude: 0, seed: 'noise-only-test' });
    const r = K.analyzePulsar(s, {
      dmRange: [10, 140],
      periodRange: [0.15, 0.35],
    });
    expect(r).toMatchObject({ status: 'refused', code: 'no-pulsar' });
    expect(r.period).toBeUndefined();
    expect(r.dm).toBeUndefined();
  });
  test('one frequency gives the period and refuses the DM as not constrained', () => {
    const s = bright({
      channels: 1,
      bandMHz: [1350, 1351],
      amplitude: 3,
      seed: 'one-ch',
    });
    const r = K.analyzePulsar(s, {
      dmRange: [0, 200],
      periodRange: [0.15, 0.35],
    });
    expect(r.status).toBe('partial');
    expect(r.dm).toMatchObject({ status: 'refused', code: 'not-constrained' });
    expect(r.dm.dm).toBeUndefined();
    expect(r.period.status).toBe('ok');
  });
  test('a band too narrow for the range is refused before any search', () => {
    const s = bright({ channels: 4, bandMHz: [1350, 1351], seed: 'narrow' });
    const r = K.analyzePulsar(s, {
      dmRange: [0, 200],
      periodRange: [0.15, 0.35],
    });
    expect(r).toMatchObject({ status: 'refused', code: 'not-constrained' });
  });
  test('a DM outside the range is refused by code, never a confident number', () => {
    const s = bright({ dm: 400, seed: 'out' });
    const r = K.analyzePulsar(s, {
      dmRange: [0, 200],
      periodRange: [0.15, 0.35],
    });
    expect(r.status).toBe('refused');
    expect(r.dm?.dm).toBeUndefined();
  });
  test('a period 3 percent wrong smears the fold and is refused', () => {
    const s = bright();
    const r = K.refineDm(s, { period: 0.2373 * 1.03, dm0: 60 });
    expect(r.status).toBe('refused');
    expect(['no-pulsar', 'too-few-channels']).toContain(r.code);
  });
  test('bad inputs are refused by code', () => {
    const s = bright();
    const run = f => {
      try {
        const out = f();
        return out?.code ?? 'returned';
      } catch (e) {
        return e.code;
      }
    };
    const range = { dmRange: [10, 140], periodRange: [0.15, 0.35] };
    expect(run(() => K.analyzePulsar({ ...s, dt: 0 }, range))).toBe(
      'bad-argument'
    );
    expect(
      run(() =>
        K.analyzePulsar(
          { ...s, frequencyMHz: [...s.frequencyMHz].reverse() },
          range
        )
      )
    ).toBe('bad-frequencies');
    expect(
      run(() => K.analyzePulsar(s, { ...range, dmRange: [140, 10] }))
    ).toBe('bad-range');
    expect(
      run(() => K.analyzePulsar(s, { ...range, dmRange: [-1, 140] }))
    ).toBe('bad-range');
    expect(
      run(() => K.analyzePulsar({ ...s, data: s.data.subarray(5) }, range))
    ).toBe('bad-argument');
    expect(run(() => K.refineDm(s, { period: 0.2373, dm0: 60, nbin: 4 }))).toBe(
      'bad-argument'
    );
  });
});

describe('the crude distance from a dispersion measure', () => {
  const src = 'the density a caller cites';
  test('it is DM / n_e, labelled, with the density and its source in the result', () => {
    const r = K.dmDistance({ dm: 30, density: { value: 0.03, source: src } });
    expect(r.distancePc).toBeCloseTo(1000, 9);
    expect(r.label).toBe('crude; assumes this electron density');
    expect(r.statement).toContain(K.DM_DISTANCE_LABEL);
    expect(r.statement).toContain(src);
    expect(r.limits).toMatch(/not a pulsar distance/);
  });
  test('a density range gives a distance range, the label stays', () => {
    const r = K.dmDistance({
      dm: 30,
      density: { value: 0.03, source: src, range: [0.02, 0.06] },
    });
    expect(r.range.distancePc).toEqual([500, 1500]);
    expect(r.label).toBe(K.DM_DISTANCE_LABEL);
  });
  test('there is no default density: a missing, zero, negative or uncited one is refused', () => {
    for (const d of [
      undefined,
      { value: 0, source: src },
      { value: -1, source: src },
      { value: 0.03 },
    ]) {
      const r = K.dmDistance({ dm: 30, density: d });
      expect(r).toMatchObject({ status: 'refused', code: 'missing-density' });
      expect(r.distancePc).toBeUndefined();
    }
    expect(
      K.dmDistance({ dm: -3, density: { value: 0.03, source: src } }).code
    ).toBe('bad-argument');
  });
});
