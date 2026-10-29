// =============================================================================
// Observing strategy (Roadmap III, Prompt 214)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/strategy/thresholds.json, committed
// before the kernel existed. The legs run live through tools/strategy-validate.mjs
// (in a child process: the ensembles are 300 series each and a Jest VM runs them an
// order of magnitude slower) against the independent oracle's pinned results
// (Astropy's LombScargle and a numpy window). No leg crossed its bound, so
// tests/fixtures/strategy/failed-legs.json is empty; if one ever does, it is
// recorded there and this test holds that it still fails and that nothing else
// does. The quick tests hold the kernel's public contract.
// =============================================================================

/* global process */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as K from '../js/kernels/strategy/index.js';
import { nightsFor, planStrategy } from '../js/instruments/strategy.js';
import { julianDate } from '../js/observingWindow.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/strategy/thresholds.json');
const FAILED = read('tests/fixtures/strategy/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present, and the amendments are recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.dirichlet',
      'A2.nested',
      'A3.comb',
      'A4.existingWindow',
      'A5.aliasPositions',
      'A6.exactComb',
      'A7.aliasHeights',
      'A8.phaseRational',
      'A9.costHandWorked',
      'A10.planConstraints',
      'A11.targetHours',
      'A12.weatherStationary',
      'B1.lombScargle',
      'B2.windowDirect',
      'B3.aliasPeaks',
      'C1.periodCoverage',
      'C2.verdictReliability',
      'C3.aliasListCovers',
      'C4.weatherLoss',
      'D1.ambiguousComb',
      'D2.brokenComb',
      'D3.refusals',
      'D4.baseline',
      'D5.noWindow',
      'D6.visitDoesNotFit',
      'E1.authentic',
      'P1.speed',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
  });
});

describe('the validation table (tools/strategy-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/strategy-validate.mjs', '--json'],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    rows = JSON.parse(out);
  }, 280_000);

  test('every leg of the contract has a row', () => {
    expect(rows.map(r => r.id)).toEqual(
      expect.arrayContaining(THR.checks.map(c => c.id))
    );
  });
  test('only the recorded legs fail, and each still fails', () => {
    const failing = rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failing.sort()).toEqual(FAILED.failed.map(f => f.id).sort());
  });
  test('the legs that were passing still pass (analytic, oracle, coverage, refusals, authentic)', () => {
    for (const r of rows)
      if (!FAILED.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
  test('the ensembles hold their stated rates', () => {
    const c1 = rows.find(r => r.id === 'C1.periodCoverage').measured;
    expect(c1.coverage).toBeGreaterThan(0.91);
    expect(c1.coverage).toBeLessThan(0.99);
    expect(
      rows.find(r => r.id === 'C3.aliasListCovers').measured.listCoverage
    ).toBeGreaterThan(0.95);
  });
});

describe('the kernel', () => {
  const sid = 0.9972695663;
  const nightly = Float64Array.from({ length: 40 }, (_, n) => n * sid);

  test('the window of one night per sidereal day is a comb at the sidereal frequency', () => {
    const f = 1 / sid;
    const w = K.spectralWindow(nightly, [0, f, 2 * f, 0.5 * f]);
    expect(w[0]).toBeCloseTo(1, 14);
    expect(w[1]).toBeCloseTo(1, 12);
    expect(w[2]).toBeCloseTo(1, 12);
    expect(w[3]).toBeLessThan(1e-3);
  });

  test("the verdict is a sinusoid's and is refused, not guessed, on bad input", () => {
    expect(K.judgeCadence([0, 1], 1, { snr: 5 }).verdict).toBe('refused');
    expect(
      K.judgeCadence(nightly, 1, { snr: 5 }).aliases.length
    ).toBeGreaterThan(0);
    expect(K.judgeCadence(nightly, 100, { snr: 5 }).verdict).toBe(
      'not-constrained'
    );
  });

  test('a visit longer than the window is dropped, never truncated', () => {
    const iv = { startJd: 10, endJd: 10.01 };
    const placed = K.placeVisits(iv, { perNight: 2, visitDays: 0.02 });
    expect(placed.starts).toEqual([]);
    expect(placed.dropped).toBe(2);
    expect(placed.reason).toBe('visit-longer-than-window');
  });

  test('the weather loss is a function of the seed and nothing else', () => {
    const a = K.weatherMask({
      nights: 30,
      pClear: 0.5,
      persistence: 0.3,
      seed: 's',
    });
    const b = K.weatherMask({
      nights: 30,
      pClear: 0.5,
      persistence: 0.3,
      seed: 's',
    });
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(() => K.weatherMask({ nights: 3, pClear: 1.2 })).toThrow(RangeError);
    expect(() =>
      K.weatherMask({ nights: 3, pClear: 0.5, persistence: 1 })
    ).toThrow(RangeError);
    expect(Array.from(K.weatherMask({ nights: 8, pClear: 1 }))).toEqual(
      new Array(8).fill(1)
    );
    expect(Array.from(K.weatherMask({ nights: 8, pClear: 0 }))).toEqual(
      new Array(8).fill(0)
    );
  });

  test('the planner extension reads the observing-window planner unchanged', async () => {
    const { observingRun, localMidnight } =
      await import('../js/observingWindow.js');
    const { siteOf } = await import('../js/instruments/index.js');
    const target = { raDeg: 180, decDeg: -30 };
    const startJd = julianDate(2026, 3, 14, 12);
    const mine = nightsFor({ facility: 'lco-1m0', target, startJd, nights: 2 });
    const site = siteOf('lco-1m0');
    const theirs = observingRun({
      site,
      target,
      firstMidnightJd: localMidnight(startJd, site.longitudeDeg),
      nights: 2,
    });
    expect(JSON.stringify(mine)).toBe(JSON.stringify(theirs));
  });

  test('a plan has times only for nights that were observed, and its cost adds up', () => {
    const p = planStrategy({
      facility: 'lco-1m0',
      target: { raDeg: 180, decDeg: -30 },
      startJd: julianDate(2026, 3, 14, 12),
      nights: 8,
      cadence: { perNight: 2, spacingHours: 2 },
      exposureSeconds: 300,
      overheadSeconds: 60,
      weather: { pClear: 0.5, persistence: 0.4, seed: 'plan' },
    });
    const c = p.cost;
    expect(c.requestedHours).toBeCloseTo(c.executedHours + c.lostHours, 12);
    expect(p.times.length).toBe(c.visitsExecuted);
    for (const v of p.visits) expect(v.executed).toBe(p.clear[v.night] === 1);
  });
});
