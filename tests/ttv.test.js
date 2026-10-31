// =============================================================================
// Transit timing variations (Roadmap III, Prompt 226)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/ttv/thresholds.json, committed before the
// kernel existed. The quick legs (A, B: the engine and the kernel against the cited
// relations and the independent oracle's pinned scipy results) run live through
// tools/ttv-validate.mjs in a child process. The ensemble legs (C, D) take several CPU
// minutes, so their table is pinned in tests/fixtures/ttv/results.json by
// `npm run ttv:validate -- --write-results` and held here against failed-legs.json: a leg
// that crossed its bound is recorded there and this test holds that it still fails and that
// nothing else does. The other tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import {
  analyseTransitTimes,
  deltaOf,
  fgCoefficients,
  laplaceB,
  linearEphemeris,
  measureTransitTime,
  nearestFirstOrder,
  relationDomain,
  superPeriod,
  transitWindow,
  ttvAmplitudes,
  ttvSignal,
} from '../js/kernels/ttv/index.js';
import { gaussian, stream } from '../js/random/streams.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/ttv/thresholds.json');
const RESULTS = read('tests/fixtures/ttv/results.json');
const FAILED = read('tests/fixtures/ttv/failed-legs.json');
const ORA = read('tests/fixtures/ttv/oracle-results.json');
const range = n => Array.from({ length: n }, (_, i) => i);

describe('the linear ephemeris and the verdict', () => {
  test('a straight clock is recovered exactly and has no O-C', () => {
    const n = range(30);
    const t = n.map(i => 5 + 3.25 * i);
    const e = linearEphemeris(
      n,
      t,
      n.map(() => 1e-3)
    );
    expect(e.T0).toBeCloseTo(5, 10);
    expect(e.P).toBeCloseTo(3.25, 10);
    expect(Math.max(...e.oc.map(Math.abs))).toBeLessThan(1e-10);
    expect(e.dof).toBe(28);
  });
  test('refuses fewer than three transits and degenerate epochs', () => {
    expect(linearEphemeris([0, 1], [0, 1]).status).toBe('refused');
    expect(linearEphemeris([2, 2, 2], [0, 1, 2]).reason).toBe(
      'degenerate-epochs'
    );
    expect(linearEphemeris([0, 1, 2], [0, NaN, 2]).reason).toBe('not-finite');
  });
  test('white noise about a clock is no signal; a wave is', () => {
    const n = range(80);
    const norm = gaussian(stream('noise', 'ttv-test'));
    const noisy = n.map(i => 2 * i + 0.001 * norm());
    const sig = n.map(() => 0.001);
    expect(ttvSignal(linearEphemeris(n, noisy, sig), sig).verdict).toBe(
      'no-signal'
    );
    const wavy = n.map(
      i => 2 * i + 0.01 * Math.sin((2 * Math.PI * i) / 40) + 0.001 * norm()
    );
    expect(ttvSignal(linearEphemeris(n, wavy, sig), sig).verdict).toBe(
      'signal'
    );
    expect(ttvSignal(linearEphemeris(n, wavy, null), null).verdict).toBe(
      'unknown'
    );
  });
});

describe('the super-period and the amplitudes', () => {
  test('the super-period is one over the beat of the two clocks', () => {
    expect(superPeriod(10, 20.6, 2)).toBeCloseTo(1 / (1 / 10 - 2 / 20.6), 9);
    expect(superPeriod(10, 20, 2)).toBeNull();
  });
  test('the nearest first-order resonance and the distance from it', () => {
    expect(nearestFirstOrder(10, 20.6).j).toBe(2);
    expect(nearestFirstOrder(10, 15.45).j).toBe(3);
    expect(deltaOf(10, 20.6, 2)).toBeCloseTo(0.03, 12);
  });
  test('f and g at exact resonance match the published values', () => {
    const a = fgCoefficients(2, 2 ** (-2 / 3));
    expect(a.f).toBeCloseTo(-1.190454, 3);
    expect(a.g).toBeCloseTo(0.428383, 3);
    const b = fgCoefficients(3, (2 / 3) ** (2 / 3));
    expect(b.f).toBeCloseTo(-2.025222, 4);
    expect(b.g).toBeCloseTo(2.484005, 4);
    expect(laplaceB(0.5, 0, 0)).toBeCloseTo(2, 12);
  });
  test('the relation refuses far from resonance and inside its width, and says why', () => {
    expect(
      relationDomain({ P1: 10, P2: 27, mu1: 3e-5, mu2: 3e-5 }).reason
    ).toBe('far-from-resonance');
    expect(
      relationDomain({ P1: 10, P2: 20.01, mu1: 3e-5, mu2: 3e-5, j: 2 }).reason
    ).toBe('inside-resonance-width');
    expect(
      relationDomain({ P1: 20, P2: 10, mu1: 3e-5, mu2: 3e-5 }).reason
    ).toBe('order');
    expect(
      relationDomain({ P1: 10, P2: 20.6, mu1: -1, mu2: 3e-5 }).reason
    ).toBe('invalid');
    expect(ttvAmplitudes({ P1: 10, P2: 27, mu1: 3e-5, mu2: 3e-5 }).status).toBe(
      'refused'
    );
  });
  test('the amplitude scales with the perturber mass and the free eccentricity changes it', () => {
    const base = { P1: 10, P2: 20.6, mu1: 3e-5, mu2: 4.5e-5, j: 2 };
    const a = ttvAmplitudes(base);
    const b = ttvAmplitudes({ ...base, mu2: 9e-5 });
    expect(b.inner.amplitude / a.inner.amplitude).toBeCloseTo(2, 10);
    const ecc = ttvAmplitudes({ ...base, Z: { re: 0.01, im: 0 } });
    expect(ecc.inner.amplitude).not.toBeCloseTo(a.inner.amplitude, 4);
    expect(a.superPeriod).toBeCloseTo(superPeriod(10, 20.6, 2), 9);
  });
});

describe('the analysis of a record', () => {
  const P1 = 10;
  const P2 = 20.6;
  const ps = superPeriod(P1, P2, 2);
  const make = (cycles, amp) => {
    const n = range(Math.round((cycles * ps) / P1));
    return {
      n,
      t: n.map(
        i =>
          7 + P1 * i + amp * Math.sin((2 * Math.PI * (7 + P1 * i)) / ps + 0.4)
      ),
    };
  };
  test('finds the period of a wave in a long record and reports it resolved', () => {
    const { n, t } = make(3.2, 0.003);
    const a = analyseTransitTimes({
      epochs: n,
      times: t,
      sigmas: t.map(() => 5e-4),
      expectedPeriod: ps,
    });
    expect(a.status).toBe('ok');
    expect(Math.abs(a.superPeriod.value / ps - 1)).toBeLessThan(0.02);
    expect(a.amplitude).toBeCloseTo(0.003, 3);
  });
  test('says unresolved when the record covers fewer than 1.5 cycles', () => {
    const { n, t } = make(0.7, 0.003);
    const a = analyseTransitTimes({
      epochs: n,
      times: t,
      sigmas: t.map(() => 5e-4),
      expectedPeriod: ps,
    });
    expect(a.status).toBe('unresolved');
    expect(a.superPeriod).toBeUndefined();
  });
  test('says no signal for a straight clock with honest error bars', () => {
    const n = range(60);
    const norm = gaussian(stream('noise', 'ttv-test-2'));
    const a = analyseTransitTimes({
      epochs: n,
      times: n.map(i => 3 * i + 5e-4 * norm()),
      sigmas: n.map(() => 5e-4),
    });
    expect(a.status).toBe('no-signal');
  });
});

describe('measuring one transit time', () => {
  const lc = THR.lightCurve;
  const tpl = { P: 10, k: lc.k, aRs: lc.aRs, b: lc.b, q1: lc.q1, q2: lc.q2 };
  const window = (trueTime, sigma, label) =>
    transitWindow({
      trueTime,
      center: 100.002,
      template: tpl,
      sigma,
      cadence: lc.cadence_d,
      halfWidth: lc.window_halfwidth_d,
      seed: 'ttv-test',
      labels: [label],
    });
  test('recovers the time within a few sigma and flags nothing for an honest window', () => {
    const w = window(100.0123, 4e-4, 1);
    expect(w.synthetic).toBe(true);
    const m = measureTransitTime({
      t: w.t,
      flux: w.flux,
      sigma: w.sigma,
      template: tpl,
      guess: 100.002,
    });
    expect(m.status).toBe('ok');
    expect(Math.abs(m.time - 100.0123)).toBeLessThan(5 * m.sigma);
    expect(m.sigma).toBeGreaterThan(1e-4);
    expect(m.sigma).toBeLessThan(5e-3);
    expect(m.flagged).toBe(false);
  });
  test('flags a window whose stated sigma is too small', () => {
    const w = window(100.0123, 4e-4, 2);
    const m = measureTransitTime({
      t: w.t,
      flux: w.flux,
      sigma: 1e-4,
      template: tpl,
      guess: 100.002,
    });
    expect(m.flagged).toBe(true);
  });
  test('refuses what it cannot fit', () => {
    expect(
      measureTransitTime({
        t: [1, 2],
        flux: [1, 1],
        sigma: 1e-3,
        template: tpl,
        guess: 1,
      }).status
    ).toBe('refused');
    const w = window(100, 4e-4, 3);
    expect(
      measureTransitTime({
        t: w.t,
        flux: w.flux,
        sigma: 0,
        template: tpl,
        guess: 100,
      }).reason
    ).toBe('not-finite');
  });
  test('the same seed makes the same window', () => {
    expect(Array.from(window(100, 4e-4, 9).flux)).toEqual(
      Array.from(window(100, 4e-4, 9).flux)
    );
  });
});

describe('the validation contract', () => {
  test('the thresholds file names every leg once, with its limits', () => {
    const ids = THR.checks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of THR.checks) expect(c.limits).toBeTruthy();
  });
  test('the oracle used the committed systems and agrees with itself', () => {
    for (const id of ['S1', 'S2', 'S3']) {
      expect(ORA.systems[id].selfCheckMaxAbsDiff_d).toBeLessThanOrEqual(
        THR.checks.find(c => c.id === 'B2').limits.maxAbsDiff_d
      );
    }
    expect(ORA.laplace['2:1'][0]).toBeCloseTo(-1.190454, 3);
  });
  test('the pinned table is the table of this contract', () => {
    const ids = RESULTS.rows.map(r => r.id);
    expect(ids).toEqual(expect.arrayContaining(THR.checks.map(c => c.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('failed legs are exactly the legs that crossed a bound, and they are labeled', () => {
    const failing = RESULTS.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(failing);
    expect(FAILED.label).toMatch(/stay failing/);
  });
  test('E1 is NOT RUN, with its reason, and nothing was simulated in its place', () => {
    const e1 = RESULTS.rows.find(r => r.id === 'E1');
    expect(e1.status).toBe('not-run');
    expect(e1.note).toMatch(/Nothing was simulated/);
  });
  test('the live legs A and B (the engine against the relations and the oracle) hold their bounds', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/ttv-validate.mjs', '--only=A,B', '--json'],
      {
        cwd: new URL('..', import.meta.url).pathname,
        encoding: 'utf8',
        maxBuffer: 1 << 24,
      }
    );
    const rows = JSON.parse(out);
    expect(rows.map(r => r.id).sort()).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'B1',
      'B2',
      'B3',
      'B4',
    ]);
    for (const r of rows) {
      const pinned = RESULTS.rows.find(p => p.id === r.id);
      expect([r.id, r.status]).toEqual([r.id, pinned.status]);
    }
  }, 120000);
});
