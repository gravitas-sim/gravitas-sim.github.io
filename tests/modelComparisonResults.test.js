// =============================================================================
// The model-comparison validation contract and its pinned results (Prompt 261)
// -----------------------------------------------------------------------------
// tests/fixtures/model-comparison/thresholds.json fixed every bound before
// js/kernels/statistics/modelcompare.js existed (and no amendment followed).
// tools/model-comparison-validate.mjs judges the kernel against them; this holds
// the pinned results.json and failed-legs.json to the thresholds and re-runs the
// fast legs (A, B, D: closed forms, the independent oracle, refusals) in a child
// process. The ensemble legs (C, E) and the authentic star (F) take about
// sixteen seconds and are re-run with `npm run modelcompare:validate`; their
// pinned rates are held here to the committed bands. A failed leg stays failing:
// only Carl resets a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/model-comparison/thresholds.json');
const RESULTS = read('tests/fixtures/model-comparison/results.json');
const FAILED = read('tests/fixtures/model-comparison/failed-legs.json');
const ORACLE = read('tests/fixtures/model-comparison/oracle-results.json');
const DIAG = read('tests/fixtures/model-comparison/diagnostic-f1.json');
const row = id => RESULTS.rows.find(r => r.id.startsWith(`${id}.`));
const band = (p, N, k = 4) => k * Math.sqrt((p * (1 - p)) / N);

describe('the committed legs and their pinned results', () => {
  test('every committed check and every NOT RUN request has a row, and nothing else has', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      [...THR.checks.map(c => c.id), ...THR.notRun.map(n => n.id)].sort()
    );
  });
  test('no amendment was made: the bounds are the ones committed before the kernel', () => {
    expect(THR.amendments).toEqual([]);
    expect(THR.committed).toMatch(
      /before js\/kernels\/statistics\/modelcompare/
    );
  });
  test('the failed-legs file is exactly the failing rows: one, the authentic Cepheid at the floor', () => {
    expect(FAILED.legs.map(l => l.id)).toEqual(
      RESULTS.rows.filter(r => r.status === 'fail').map(r => r.id)
    );
    expect(FAILED.legs.map(l => l.id)).toEqual(['F1.authenticCepheid']);
    const m = FAILED.legs[0].measured;
    const L = THR.checks.find(c => c.id.startsWith('F1.')).limits;
    expect(m.atFloor).toBe(false);
    expect(m.p).toBeGreaterThan(L.maxP);
    // not an error of the kernel: the oracle's own numpy search on the same 55 points gives
    // the same p within the Monte Carlo error of the two (999 and 20000 draws)
    const bound =
      4 *
      Math.sqrt(DIAG.p * (1 - DIAG.p) * (1 / (1 + L.draws) + 1 / (1 + DIAG.B)));
    expect(DIAG.n).toBe(m.points);
    expect(Math.abs(DIAG.p - m.p)).toBeLessThanOrEqual(bound);
  });
  test('the verdict is the committed function: FAILED LEG(S), no leg unjudged, three legs NOT RUN', () => {
    expect(RESULTS.verdict.verdict).toBe('FAILED LEG(S)');
    expect(RESULTS.verdict.failing).toEqual(['F1.authenticCepheid']);
    expect(RESULTS.verdict.notJudged).toEqual([]);
    expect(RESULTS.verdict.notRun).toEqual(THR.notRun.map(n => n.id));
    for (const n of THR.notRun) expect(n.request).toMatch(/scratch-data/);
    expect(THR.verdict.consumers).toMatch(/not built/);
  });
  test('every other judged leg passes, and the three reported legs commit no bound', () => {
    const reported = THR.checks.filter(c => c.limits.reported).map(c => c.id);
    expect(reported).toEqual([
      'B4.baluevReported',
      'C5.leaveOneOutReported',
      'E1.misspecifiedNullReported',
    ]);
    for (const r of RESULTS.rows)
      if (reported.includes(r.id)) expect(r.status).toBe('reported');
      else if (r.status !== 'notrun' && r.id !== 'F1.authenticCepheid')
        expect([r.id, r.status]).toEqual([r.id, 'pass']);
  });
  test('the pinned ensemble rates sit inside the committed bands', () => {
    const L = id => THR.checks.find(c => c.id.startsWith(`${id}.`)).limits;
    const c1 = row('C1').measured;
    expect(Math.abs(c1.rate - L('C1').alpha)).toBeLessThanOrEqual(
      band(L('C1').alpha, L('C1').series, L('C1').binomialSigmas)
    );
    const c2 = row('C2').measured;
    expect(Math.abs(c2.rate - L('C2').expected)).toBeLessThanOrEqual(
      band(L('C2').expected, L('C2').series, L('C2').binomialSigmas)
    );
    const c3 = row('C3').measured;
    expect(c3.aic.expected).toBeCloseTo(ORACLE.C3.expectedAic, 4);
    expect(Math.abs(c3.aic.rate - ORACLE.C3.expectedAic)).toBeLessThanOrEqual(
      band(ORACLE.C3.expectedAic, L('C3').series)
    );
    expect(Math.abs(c3.bic.rate - ORACLE.C3.expectedBic)).toBeLessThanOrEqual(
      band(ORACLE.C3.expectedBic, L('C3').series)
    );
    const c4 = row('C4').measured;
    expect(c4.naiveFRate).toBeGreaterThanOrEqual(L('C4').minNaiveRate);
    expect(c4.aicSearchedRate).toBeGreaterThanOrEqual(
      L('C4').minAicSearchedRate
    );
    // what the refusals protect against: the naive test on a search flags nearly every series
    expect(c4.naiveFRate).toBeGreaterThan(10 * L('C2').alpha);
  });
  test('the searched case and its oracle are the first candidate, from two independent ensembles', () => {
    const s = ORACLE.searched;
    expect(s.candidatesTried).toBe(1);
    expect(s.B).toBe(20000);
    expect(s.p2611).toBeGreaterThan(0.02);
    expect(s.p2611).toBeLessThan(0.3);
    expect(ORACLE.versions.astropy).toBeDefined();
    expect(Math.abs(s.observed - s.astropyObserved) / s.observed).toBeLessThan(
      1e-9
    );
  });
  test('the oracle shares no code with the kernel and reads no Gravitas file', () => {
    for (const f of ['oracle.py', 'diagnostic_f1.py']) {
      const src = readFileSync(
        new URL(`../tools/model-comparison-oracle/${f}`, import.meta.url),
        'utf8'
      );
      const imports = src
        .split('\n')
        .filter(l => /^\s*(import|from)\s/.test(l))
        .join(' ');
      expect(imports).not.toMatch(/\bjs\b|kernel|gravitas/i);
      expect(src).not.toMatch(/\/Users\/|open\('js|open\("js/);
    }
  });
  test('the committed rule forbids typing published numbers and fetching', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/NOT RUN/);
    expect(THR.rule).toMatch(/nothing is fetched by any agent/);
  });
});

describe('the validator reproduces the pinned fast legs', () => {
  let live;
  const run = () =>
    (live ??= JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/model-comparison-validate.mjs', '--only=A,B,D', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    ));
  test('every status equals its pinned status', () => {
    const r = run();
    expect(r.rows.map(x => `${x.id}:${x.status}`)).toEqual(
      RESULTS.rows
        .filter(x => /^[ABD]\d/.test(x.id))
        .map(x => `${x.id}:${x.status}`)
    );
  });
  test('the oracle-judged numbers agree with the pinned run to their stated bounds', () => {
    const r = run();
    const m = id => r.rows.find(x => x.id.startsWith(`${id}.`)).measured;
    expect(m('A8').F).toBeCloseTo(row('A8').measured.F, 4);
    expect(m('B2').pOracle).toBe(ORACLE.searched.p2611);
    expect(Math.abs(m('B2').pKernel - row('B2').measured.pKernel)).toBeLessThan(
      0.02
    );
  });
});
