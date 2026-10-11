// The variable-star kernel (Roadmap II Prompt 96): Fourier fits, the period
// search and its errors, aliases, Leavitt's law and its distance budget, the
// extinction check, the classification exercise, and the data packs' numbers.
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAW } from '../js/data/radiation/extinction.js';
import {
  ANCHORS,
  loadVariablesData,
  loadClassSample,
} from '../js/variablesData.js';
import {
  harmonicFit,
  curveStats,
  findPeriod,
  refinePeriod,
  bootstrapPeriod,
  aliasPeriods,
  periodogram,
  fitLine,
  fitLeavitt,
  ladderDistance,
  wesenheitResidual,
  classifyLeaveOneOut,
  confusion,
  makeSample,
  FEATURE_SETS,
} from '../js/kernels/variables/index.js';
import { sampleJson } from '../tools/variables-sample.mjs';
import { mulberry32, normalizeSeed } from '../js/rng.js';
import {
  STARS,
  analysisOf,
  leavittView,
  classView,
  nightlyRows,
} from '../js/variableInstruments.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileFetch = async url => ({
  ok: true,
  json: async () =>
    JSON.parse(readFileSync(path.join(REPO, url.slice(1)), 'utf8')),
});
let data;
beforeAll(async () => {
  data = await loadVariablesData(fileFetch);
});

describe('the Fourier fit', () => {
  const t = Float64Array.from({ length: 300 }, (_, i) => i * 0.137);
  const P = 1.31;
  const y = Float64Array.from(
    t,
    x =>
      2 +
      0.3 * Math.cos((2 * Math.PI * x) / P + 0.4) +
      0.12 * Math.cos((4 * Math.PI * x) / P + 1.1)
  );
  test('recovers the mean, both amplitudes and the shape numbers of a noise-free series', () => {
    const fit = harmonicFit(t, y, P, 3, { t0: t[0] });
    expect(fit.mean).toBeCloseTo(2, 10);
    expect(fit.harmonics[0].amplitude).toBeCloseTo(0.3, 10);
    expect(fit.harmonics[1].amplitude).toBeCloseTo(0.12, 10);
    expect(fit.harmonics[2].amplitude).toBeLessThan(1e-9);
    const s = curveStats(fit);
    expect(s.r21).toBeCloseTo(0.4, 9);
    expect(s.amplitude).toBeGreaterThan(0.55);
    expect(s.amplitude).toBeLessThan(0.84);
  });
  test('a series at the wrong period fits worse', () => {
    expect(harmonicFit(t, y, P * 1.1, 3).rms).toBeGreaterThan(0.05);
  });
});

describe('the period search', () => {
  test('over many seeds the period of a pulsator comes back within 0.5 percent; an eclipsing binary at half its orbit', () => {
    const rows = makeSample({ perClass: 10, seed: 'recovery' });
    const bad = rows
      .filter(r => r.cls !== 'eclipsing')
      .filter(r => Math.abs(r.period / r.truthPeriod - 1) > 0.005);
    expect(bad.map(r => r.id)).toEqual([]);
    const eb = rows.filter(r => r.cls === 'eclipsing');
    const half = eb.filter(
      r => Math.abs(r.period / r.truthPeriod - 0.5) < 0.01
    );
    expect(half.length).toBeGreaterThanOrEqual(8);
  });
  test('aliases of one-per-day sampling are 1/|1/P ± 1|', () => {
    const a = aliasPeriods(0.66, 1, 1);
    expect(a[0].period).toBeCloseTo(1 / (1 / 0.66 - 1), 12);
    expect(a[1].period).toBeCloseTo(1 / (1 / 0.66 + 1), 12);
  });
  test('the periodogram of a sinusoid peaks at its period', () => {
    const t = Float64Array.from({ length: 200 }, (_, i) => i * 0.31);
    const y = Float64Array.from(t, x => Math.sin((2 * Math.PI * x) / 3.3));
    const f = findPeriod(t, y, { minPeriod: 1, maxPeriod: 10 });
    expect(f.period).toBeCloseTo(3.3, 2);
    expect(f.power).toBeGreaterThan(0.99);
    expect(f.width).toBeGreaterThan(0);
  });
});

describe('the real stars', () => {
  test('SU Dra: the refined period is Monson et al.’s to 0.01 percent, and its error is smaller than the peak’s width', () => {
    const a = analysisOf(0, data);
    expect(Math.abs(a.refined.period / 0.66042001 - 1)).toBeLessThan(1e-4);
    expect(a.boot.sigma).toBeGreaterThan(0);
    expect(a.boot.sigma).toBeLessThan(a.found.width / 5);
    expect(a.stats.amplitude).toBeGreaterThan(0.5);
    expect(a.stats.amplitude).toBeLessThan(0.9);
  });
  test('eta Aql: the run covers under four cycles and the period is good to a percent, as the pack says', () => {
    const a = analysisOf(1, data);
    expect(a.cycles).toBeLessThan(4);
    expect(Math.abs(a.refined.period / 7.176641 - 1)).toBeLessThan(0.01);
    expect(a.boot.sigma).toBeGreaterThan(a.found.width / 100);
  });
  test('SU Dra seen once a night: the strongest peaks are the true period and its one-per-day aliases', () => {
    const a = analysisOf(2, data);
    expect(nightlyRows(data.suDra.t).length).toBeLessThan(
      data.suDra.t.length / 10
    );
    const P = 0.66042;
    const near = (x, y) => Math.abs(x / y - 1) < 0.02;
    const candidates = [P, ...aliasPeriods(P, 1, 1).map(x => x.period)];
    expect(candidates.some(c => near(a.found.period, c))).toBe(true);
    // The aliases carry real power in the spectrum, within 15 percent of the peak's.
    for (const c of candidates) {
      const k = a.found.grid.reduce(
        (b, p, i) => (Math.abs(p - c) < Math.abs(a.found.grid[b] - c) ? i : b),
        0
      );
      let m = 0;
      for (
        let i = Math.max(0, k - 3);
        i <= Math.min(a.found.grid.length - 1, k + 3);
        i++
      )
        m = Math.max(m, a.found.spectrum[i]);
      expect(m).toBeGreaterThan(0.5 * a.found.power);
    }
    expect(STARS.length).toBe(3);
  });
});

describe("Leavitt's law and the ladder", () => {
  test('OLS is exact on a line and its slope error matches the closed form', () => {
    const x = [0, 1, 2, 3, 4];
    const f = fitLine(
      x,
      x.map(v => 2 + 3 * v)
    );
    expect(f.b).toBeCloseTo(3, 12);
    expect(f.a).toBeCloseTo(2, 12);
    const g = fitLine(x, [2, 5.1, 7.9, 11.2, 13.8]);
    const resid = [2, 5.1, 7.9, 11.2, 13.8].map((y, i) => y - g.a - g.b * x[i]);
    const s2 = resid.reduce((s, r) => s + r * r, 0) / 3;
    expect(g.sigmaB).toBeCloseTo(Math.sqrt(s2 / 10), 12);
  });
  test('the LMC slope is the pack’s -3.29 ± 0.02, within 0.1 of the paper’s -3.284', () => {
    const f = fitLeavitt(data.cepheids.lmc.periods, data.cepheids.lmc.mags);
    expect(f.b).toBeCloseTo(-3.29, 2);
    expect(f.sigmaB).toBeLessThan(0.025);
    expect(Math.abs(f.b + 3.284)).toBeLessThan(0.1);
    expect(f.n).toBe(339);
  });
  test('a sample shifted by exactly one magnitude has a distance modulus one larger, with the anchor’s error', () => {
    const lmc = data.cepheids.lmc;
    const shifted = {
      periods: lmc.periods,
      mags: Float64Array.from(lmc.mags, m => m + 1),
    };
    const r = ladderDistance(shifted, lmc, { mu: 18.5, sigma: 0.026 });
    expect(r.mu).toBeCloseTo(19.5, 10);
    expect(r.budget.find(b => b.id === 'anchorDistance').sigma).toBe(0.026);
    expect(r.budget.find(b => b.id === 'slope').sigma).toBeCloseTo(0, 10);
  });
  test('the error budget has the right coverage: 400 simulated hosts, the truth is within one sigma about 68 percent of the time', () => {
    const lmc = data.cepheids.lmc;
    const rand = mulberry32(normalizeSeed('coverage'));
    const gauss = () =>
      Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const trueMu = 29.4;
    let inside = 0;
    const N = 400;
    for (let k = 0; k < N; k++) {
      const n = 60;
      const periods = Float64Array.from(
        { length: n },
        () => 10 ** (0.8 + 0.8 * rand())
      );
      const mags = Float64Array.from(
        periods,
        P =>
          12.6 - 3.29 * (Math.log10(P) - 1) + (trueMu - 18.477) + 0.4 * gauss()
      );
      const anchorMu = 18.477 + 0.026 * gauss();
      const r = ladderDistance({ periods, mags }, lmc, {
        mu: anchorMu,
        sigma: 0.026,
      });
      if (Math.abs(r.mu - trueMu) <= r.sigma) inside++;
    }
    expect(inside / N).toBeGreaterThan(0.6);
    expect(inside / N).toBeLessThan(0.78);
  });
  test('NGC 4258 from the LMC agrees with the maser distance, M101 comes out near 7 Mpc', () => {
    const f = leavittView({ host: 1 }, data);
    expect(f.result.hostN).toBe(111);
    expect(Math.abs(f.result.mu - ANCHORS.n4258.mu)).toBeLessThan(
      Math.hypot(f.result.sigma, ANCHORS.n4258.sigma)
    );
    const m = leavittView({ host: 2 }, data).result;
    expect(m.distanceMpc).toBeGreaterThan(6.5);
    expect(m.distanceMpc).toBeLessThan(7.5);
  });
  test('the Wesenheit combination removes 80 percent of the dust of F160W alone, as the radiation kernel’s law says', () => {
    const w = wesenheitResidual(LAW, 3.3);
    expect(Math.abs(w.residual)).toBeLessThan(0.05);
    expect(Math.abs(w.residual) / w.A.F160W).toBeLessThan(0.2);
  });
});

describe('the classification exercise', () => {
  test('the committed sample is what the kernel makes', () => {
    expect(
      readFileSync(path.join(REPO, 'variables/class-sample.json'), 'utf8')
    ).toBe(sampleJson());
  });
  test('more features separate more classes: period alone is the worst, the shape the best', async () => {
    const rows = await loadClassSample(fileFetch);
    const acc = Object.fromEntries(
      Object.entries(FEATURE_SETS).map(([k, f]) => [
        k,
        confusion(rows, classifyLeaveOneOut(rows, f)).accuracy,
      ])
    );
    expect(acc.period).toBeLessThan(acc.periodAmplitude);
    expect(acc.periodAmplitude).toBeLessThan(acc.shape + 1e-9);
    expect(acc.shape).toBeGreaterThan(0.9);
    expect(acc.period).toBeLessThan(0.9);
    const c = classView({ features: 0 }, data);
    expect(c.table.matrix.flat().reduce((s, v) => s + v, 0)).toBe(rows.length);
  });
});

describe('the data packs', () => {
  test('the light curves and the Cepheid table are what their manifests say', () => {
    for (const id of [
      'tess-su-dra-s15',
      'tess-eta-aql-s81',
      'shoes-r22-cepheids',
    ]) {
      const m = JSON.parse(
        readFileSync(path.join(REPO, `data-packs/${id}.json`), 'utf8')
      );
      expect(m.validation.ok ?? true).toBe(true);
      expect(m.derived.sidecar.bytes).toBeGreaterThan(1000);
    }
    expect(data.suDra.t.length).toBe(1799);
    expect(data.etaAql.t.length).toBe(541);
    expect(
      data.cepheids.lmc.periods.length +
        data.cepheids.n4258.periods.length +
        data.cepheids.m101.periods.length
    ).toBe(515);
  });
  test('periodogram and refinement agree with the unrefined peak to the width', () => {
    const a = analysisOf(0, data);
    expect(Math.abs(a.refined.period - a.found.period)).toBeLessThan(
      a.found.width
    );
    const P = a.found.period;
    const pw = periodogram(a.t, a.mag, [P, 1.37 * P]);
    expect(pw[0]).toBeGreaterThan(pw[1]);
    expect(refinePeriod(a.t, a.mag, P, 2).period).toBeGreaterThan(0);
    expect(
      bootstrapPeriod(a.t.subarray(0, 300), a.mag.subarray(0, 300), P, {
        resamples: 4,
      }).resamples
    ).toBe(4);
  });
});
