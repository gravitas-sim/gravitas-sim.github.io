#!/usr/bin/env node
// =============================================================================
// The model-comparison kernel against its committed thresholds (Prompt 261)
// -----------------------------------------------------------------------------
//   npm run modelcompare:validate                      print the table
//   npm run modelcompare:validate -- --json            print it as JSON
//   npm run modelcompare:validate -- --write-results   rewrite tests/fixtures/model-comparison/results.json
//   npm run modelcompare:validate -- --write-failed    rewrite tests/fixtures/model-comparison/failed-legs.json
//   --only=A1,C2                                       run the legs whose id starts with these
//
// tests/fixtures/model-comparison/thresholds.json fixed every bound before
// js/kernels/statistics/modelcompare.js existed; this reads the bounds from that
// file, not from copies. The A, B and C3 rows read oracle-results.json, which
// tools/model-comparison-oracle/oracle.py wrote (numpy, scipy, astropy; no
// Gravitas code). A leg that cannot be measured is NOT RUN and says why. The
// verdict is computed from the rows by the function committed in the thresholds.
// Node, not Jest: Jest's module VM is far slower at arithmetic.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as S0 from '../js/kernels/statistics/index.js';
import * as M from '../js/kernels/statistics/modelcompare.js';

const S = { ...S0, ...M };
import { periodogram, periodGrid } from '../js/kernels/variables/period.js';
import { mulberry32 } from '../js/rng.js';
import { gaussian } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK } from '../js/data/observations/tessEtaAqlS81.js';
import { ANSCOMBE } from './statistics-cases.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/model-comparison';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);

const lim = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const fullId = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).id;
const sig = (v, d = 5) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const REGULAR = { nested: true, boundary: false, searched: false };
const SEARCHED = { nested: true, boundary: false, searched: true };

// ---------------------------------------------------------------------------
// Small tools the legs share (none of them is the kernel)
// ---------------------------------------------------------------------------

/** Least squares by modified Gram-Schmidt on the columns of the design (rows x p). */
function lsq(D, y) {
  const n = D.length;
  const p = D[0].length;
  const cols = Array.from({ length: p }, (_, j) =>
    Float64Array.from({ length: n }, (_, i) => D[i][j])
  );
  const Q = [];
  const R = Array.from({ length: p }, () => new Float64Array(p));
  for (let j = 0; j < p; j++) {
    const v = Float64Array.from(cols[j]);
    for (let k = 0; k < j; k++) {
      let d = 0;
      for (let i = 0; i < n; i++) d += Q[k][i] * v[i];
      R[k][j] = d;
      for (let i = 0; i < n; i++) v[i] -= d * Q[k][i];
    }
    let nrm = 0;
    for (let i = 0; i < n; i++) nrm += v[i] * v[i];
    nrm = Math.sqrt(nrm);
    R[j][j] = nrm;
    for (let i = 0; i < n; i++) v[i] /= nrm;
    Q.push(v);
  }
  const qty = Q.map(q => q.reduce((s, v, i) => s + v * y[i], 0));
  const coef = new Float64Array(p);
  for (let j = p - 1; j >= 0; j--) {
    let s = qty[j];
    for (let k = j + 1; k < p; k++) s -= R[j][k] * coef[k];
    coef[j] = s / R[j][j];
  }
  const fitted = Float64Array.from({ length: n }, (_, i) =>
    D[i].reduce((s, v, j) => s + v * coef[j], 0)
  );
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (y[i] - fitted[i]) ** 2;
  return { coef, fitted, rss };
}

const designOf = (xs, fns) => xs.map(x => fns.map(f => f(x)));
const ONE = () => 1;

/** fitPredict of a least-squares model: fit on the training rows, predict one row. */
const lsPredictor = (D, y) => (train, i) => {
  const sub = Array.from(train, j => D[j]);
  const { coef } = lsq(
    sub,
    Array.from(train, j => y[j])
  );
  return D[i].reduce((s, v, j) => s + v * coef[j], 0);
};

/** Standard normals from a mulberry32 uniform stream. */
const normals = u => gaussian(u);

function meanSd(y) {
  const n = y.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += y[i];
  m /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (y[i] - m) ** 2;
  return { mean: m, rss: v, sd: Math.sqrt(v / (n - 1)) };
}

const seriesTime = () =>
  Float64Array.from(
    { length: 40 },
    (_, i) => i + 0.5 * (((7 * i) % 11) / 10 - 0.5)
  );
const T_SERIES = seriesTime();

function gridFor(t, minPeriod = 2, maxPeriod = 40, oversample = 4) {
  return periodGrid(minPeriod, maxPeriod, t[t.length - 1] - t[0], oversample);
}
const maxPower = (t, y, grid) => {
  const pw = periodogram(t, y, grid);
  let m = 0;
  for (let k = 0; k < pw.length; k++) if (pw[k] > m) m = pw[k];
  return m;
};

/** The calibration of the world 'series': constant mean, sigma_hat from n - 1. */
function calibrate(t, y, grid, seed, draws, level) {
  const { mean, sd } = meanSd(y);
  const n = y.length;
  const observed = maxPower(t, y, grid);
  const ystar = new Float64Array(n);
  const simulate = u => {
    const g = normals(u);
    for (let i = 0; i < n; i++) ystar[i] = mean + sd * g();
    return maxPower(t, ystar, grid);
  };
  return {
    observed,
    ...S.calibratedSignificance({ observed, simulate, seed, draws, level }),
  };
}

const band = (rate, N) => Math.sqrt((rate * (1 - rate)) / N);

// ---------------------------------------------------------------------------
// The legs
// ---------------------------------------------------------------------------

/** Run the legs. @returns {Promise<object[]>} rows {id, status, measured, note} */
export async function runValidation({ only = [] } = {}) {
  const rows = [];
  const want = id => !only.length || only.some(o => id.startsWith(o));
  const add = (id, status, measured, note = null) =>
    rows.push({ id: fullId(id), leg: null, status, measured, note });
  const check = (id, ok, measured, note) =>
    add(id, ok ? 'pass' : 'fail', measured, note);

  const x30 = Array.from({ length: 30 }, (_, i) => i);

  if (want('A1')) {
    const L = lim('A1');
    let worstF = 0;
    let ok = true;
    const per = [];
    for (const set of ORACLE.A1) {
      const y = set.y;
      const rss0 = lsq(designOf(x30, [ONE]), y).rss;
      const rss1 = lsq(designOf(x30, [ONE, x => x]), y).rss;
      const r = S.compareModels({
        pair: REGULAR,
        n: 30,
        models: [
          { name: 'constant', k: 1, rss: rss0 },
          { name: 'line', k: 2, rss: rss1 },
        ],
      });
      ok &&= r.class === 'nested-regular' && r.status === 'ok';
      const eF = rel(r.result.F, set.F_t2);
      const eP = Math.abs(r.result.p - set.p_linregress);
      const eRP = eP / set.p_linregress;
      worstF = Math.max(worstF, eF);
      ok &&= eRP <= L.maxRelP || eP <= L.maxAbsP;
      per.push({ name: set.name, relF: sig(eF), relP: sig(eRP) });
    }
    check('A1', ok && worstF <= L.maxRelF, { per });
  }

  if (want('A2')) {
    const L = lim('A2');
    const A = ORACLE.A2;
    const D = designOf(x30, [
      ONE,
      x => Math.cos((2 * Math.PI * x) / 12),
      x => Math.sin((2 * Math.PI * x) / 12),
    ]);
    const rss0 = lsq(designOf(x30, [ONE]), A.y).rss;
    const rss1 = lsq(D, A.y).rss;
    const r = S.compareModels({
      pair: REGULAR,
      n: 30,
      models: [
        { name: 'constant', k: 1, rss: rss0 },
        { name: 'sinusoid at 12', k: 3, rss: rss1 },
      ],
    });
    const eF = rel(r.result.F, A.ftest.F);
    const eP = rel(r.result.p, A.ftest.p);
    check('A2', eF <= L.maxRelF && eP <= L.maxRelP && r.result.d1 === 2, {
      relF: sig(eF),
      relP: sig(eP),
      d1: r.result.d1,
      d2: r.result.d2,
    });
  }

  if (want('A3')) {
    const L = lim('A3');
    const x = ORACLE.A3.x;
    const y = ORACLE.A3.y;
    const n = x.length;
    const fit = D => lsq(D, y).rss;
    const pairModels = [
      { name: 'line', k: 2, rss: fit(designOf(x, [ONE, v => v])) },
      {
        name: 'log+inverse',
        k: 3,
        rss: fit(designOf(x, [ONE, v => Math.log(v), v => 1 / v])),
      },
    ];
    const ladderModels = [0, 1, 2, 3].map(deg => ({
      name: `degree ${deg}`,
      k: deg + 1,
      rss: fit(
        designOf(
          x,
          Array.from({ length: deg + 1 }, (_, j) => v => v ** j)
        )
      ),
    }));
    let worst = 0;
    const cmp = (kernelRows, oracleRows) => {
      for (let i = 0; i < oracleRows.length; i++)
        for (const key of ['aic', 'aicc', 'bic'])
          worst = Math.max(
            worst,
            Math.abs(kernelRows[i][key] - oracleRows[i][key])
          );
    };
    const kp = S.informationCriteria({ n, models: pairModels });
    const kl = S.informationCriteria({ n, models: ladderModels });
    cmp(kp.rows, ORACLE.A3.pair);
    cmp(kl.rows, ORACLE.A3.ladder);
    const idx = (res, key) =>
      res.rows.findIndex(r => r.name === res.preferred[key]);
    const prefOk = ['aic', 'aicc', 'bic'].every(
      k =>
        idx(kp, k) === ORACLE.A3.preferred.pair[k] &&
        idx(kl, k) === ORACLE.A3.preferred.ladder[k]
    );
    const H = ORACLE.A3.hand;
    const kh = S.informationCriteria({
      n: H.n,
      models: H.models.map(m => ({ k: m.k, rss: m.rss })),
    });
    let worstHand = 0;
    for (let i = 0; i < H.models.length; i++)
      for (const key of ['aic', 'aicc', 'bic'])
        worstHand = Math.max(
          worstHand,
          Math.abs(kh.rows[i][key] - H.models[i][key])
        );
    check('A3', worst <= L.maxAbs && worstHand <= L.maxAbs && prefOk, {
      worstAbs: sig(worst),
      worstHandAbs: sig(worstHand),
      preferredAgree: prefOk,
      disagree: { pair: kp.disagree, ladder: kl.disagree },
    });
  }

  if (want('A4')) {
    const expect = (n, b, s) =>
      !n ? 'non-nested' : b || s ? 'nested-nonregular' : 'nested-regular';
    let ok = true;
    const table = [];
    for (const nested of [true, false])
      for (const boundary of [true, false])
        for (const searched of [true, false]) {
          const r = S.classifyPair({ nested, boundary, searched });
          const want2 = expect(nested, boundary, searched);
          const refusedCode = r.refused[0]?.code ?? null;
          const wantCode =
            want2 === 'non-nested'
              ? 'not-nested'
              : want2 === 'nested-nonregular'
                ? searched
                  ? 'searched'
                  : 'boundary'
                : null;
          const row =
            r.status === 'ok' &&
            r.class === want2 &&
            r.primary === S.PAIR_CLASSES[want2].primary &&
            refusedCode === wantCode;
          ok &&= row;
          table.push([nested, boundary, searched, r.class, refusedCode]);
        }
    const undeclared = [
      { nested: true, boundary: false },
      { nested: true, boundary: null, searched: false },
      { nested: 'yes', boundary: false, searched: false },
      undefined,
    ].map(f => S.classifyPair(f));
    const undOk = undeclared.every(
      r => r.status === 'refused' && r.code === 'undeclared'
    );
    check('A4', ok && undOk, { rows: table.length, undeclaredRefused: undOk });
  }

  if (want('A5')) {
    const L = lim('A5');
    let worstScore = 0;
    let worstRes = 0;
    let bitwise = true;
    const cases = [
      ['null_constant', x30.map(() => 0), ORACLE.A1[1].y, [ONE], x30],
      ['null_line', null, ORACLE.A1[1].y, [ONE, v => v], x30],
      ['crit_line', null, ORACLE.A3.y, [ONE, v => v], ORACLE.A3.x],
      [
        'crit_loginv',
        null,
        ORACLE.A3.y,
        [ONE, v => Math.log(v), v => 1 / v],
        ORACLE.A3.x,
      ],
    ];
    for (const [key, , y, fns, xs] of cases) {
      const D = designOf(xs, fns);
      const run = () =>
        S.leaveOneOut({
          y,
          models: [{ name: key, fitPredict: lsPredictor(D, y) }],
        });
      const a = run();
      const b = run();
      const o = ORACLE.A5[key];
      worstScore = Math.max(worstScore, rel(a.models[0].score, o.press_over_n));
      for (let i = 0; i < y.length; i++) {
        worstRes = Math.max(
          worstRes,
          Math.abs(a.models[0].residuals[i] - o.residuals[i])
        );
        if (a.models[0].residuals[i] !== b.models[0].residuals[i])
          bitwise = false;
      }
    }
    check(
      'A5',
      worstScore <= L.maxRelScore && worstRes <= L.maxAbsResidual && bitwise,
      {
        worstRelScore: sig(worstScore),
        worstAbsResidual: sig(worstRes),
        repeatBitIdentical: bitwise,
      }
    );
  }

  if (want('A6')) {
    const simulate = u => u() + u();
    const args = { simulate, seed: 'p261:A6', label: 'x' };
    const serial = S.calibrationDraws({ ...args, to: 999 });
    const again = S.calibrationDraws({ ...args, to: 999 });
    const c1 = S.calibrationDraws({ ...args, from: 0, to: 300 });
    const c2 = S.calibrationDraws({ ...args, from: 300, to: 999 });
    const merged = Float64Array.from([...c1.draws, ...c2.draws]);
    const other = S.calibrationDraws({ ...args, seed: 'p261:A6b', to: 999 });
    const same = (a, b) =>
      a.length === b.length && a.every((v, i) => v === b[i]);
    const differs = !same(serial.draws, other.draws);
    check(
      'A6',
      same(serial.draws, merged) &&
        same(serial.draws, again.draws) &&
        differs &&
        serial.stream.id === 'noise',
      {
        chunkedEqualsSerial: same(serial.draws, merged),
        repeatEqual: same(serial.draws, again.draws),
        otherSeedDiffers: differs,
        stream: serial.stream,
      }
    );
  }

  if (want('A7')) {
    const u = S.calibratedSignificance({
      observed: 0.9,
      simulate: v => v(),
      seed: 'p261:A7',
      draws: 999,
    });
    const tol = 4 * Math.sqrt((0.1 * 0.9) / 999);
    const above = S.calibratedSignificance({
      observed: 2,
      simulate: v => v(),
      seed: 'p261:A7',
      draws: 999,
    });
    const below = S.calibratedSignificance({
      observed: -1,
      simulate: v => v(),
      seed: 'p261:A7',
      draws: 999,
    });
    const tie = S.calibratedSignificance({
      observed: 0.5,
      simulate: () => 0.5,
      seed: 'p261:A7',
      draws: 999,
    });
    const lvlOk = S.calibratedSignificance({
      observed: 2,
      simulate: v => v(),
      seed: 'p261:A7',
      draws: 999,
      level: 0.001,
    });
    const lvlBad = S.calibratedSignificance({
      observed: 2,
      simulate: v => v(),
      seed: 'p261:A7',
      draws: 999,
      level: 0.0009,
    });
    const ok =
      Math.abs(u.p - 0.1) <= tol &&
      above.p === 1 / 1000 &&
      above.atFloor === true &&
      below.p === 1 &&
      below.atFloor === false &&
      tie.p === 1 &&
      lvlOk.status === 'ok' &&
      lvlOk.significant === true &&
      lvlBad.status === 'refused' &&
      lvlBad.code === 'too-few-draws';
    check('A7', ok, {
      pUniform: sig(u.p),
      bound: sig(tol),
      floorP: above.p,
      tieP: tie.p,
      level0_001: lvlOk.status,
      level0_0009: lvlBad.code,
    });
  }

  if (want('A8')) {
    const L = lim('A8');
    const y = ANSCOMBE.y1;
    const x = ANSCOMBE.x;
    const rss0 = lsq(designOf(x, [ONE]), y).rss;
    const rss1 = lsq(designOf(x, [ONE, v => v]), y).rss;
    const r = S.compareModels({
      pair: REGULAR,
      n: 11,
      models: [
        { name: 'constant', k: 1, rss: rss0 },
        { name: 'line', k: 2, rss: rss1 },
      ],
    });
    const r2 = 1 - rss1 / rss0;
    const F = r.result.F;
    const pT = 2 * S.tSf(Math.sqrt(F), 9);
    const ok =
      Math.abs(r2 - 0.6665) <= L.r2HalfUnit &&
      rel(F, (9 * r2) / (1 - r2)) <= 1e-12 &&
      r.result.d1 === 1 &&
      r.result.d2 === 9 &&
      rel(r.result.p, pT) <= L.maxRelPvsT;
    check('A8', ok, {
      r2: sig(r2),
      F: sig(F),
      p: sig(r.result.p),
      pFromT: sig(pT),
    });
  }

  const S0 = ORACLE.searched;
  const tOr = Float64Array.from(S0.t);
  const yOr = Float64Array.from(S0.y);
  const gridOr = gridFor(tOr);

  if (want('B1')) {
    const L = lim('B1');
    const stat = maxPower(tOr, yOr, gridOr);
    let gridWorst = 0;
    for (let k = 0; k < gridOr.length; k++)
      gridWorst = Math.max(gridWorst, rel(1 / gridOr[k], S0.freqs[k]));
    check(
      'B1',
      rel(stat, S0.astropyObserved) <= L.maxRel && gridOr.length === S0.nGrid,
      {
        relVsAstropy: sig(rel(stat, S0.astropyObserved)),
        nGrid: gridOr.length,
        worstRelFrequency: sig(gridWorst),
      }
    );
  }

  if (want('B2')) {
    const L = lim('B2');
    const r = calibrate(tOr, yOr, gridOr, 'p261:B2', 999);
    const p = S0.p2611;
    const bound = L.sigmas * Math.sqrt(p * (1 - p) * (1 / 1000 + 1 / 20001));
    check('B2', Math.abs(r.p - p) <= bound, {
      pKernel: r.p,
      pOracle: p,
      absDifference: sig(Math.abs(r.p - p)),
      bound: sig(bound),
      kernelSe: sig(r.se),
    });
  }

  if (want('B3')) {
    const L = lim('B3');
    const pm = (S0.p2611 + S0.p2612) / 2;
    const bound = L.sigmas * Math.sqrt((2 * pm * (1 - pm)) / 20001);
    const d = Math.abs(S0.p2611 - S0.p2612);
    check('B3', d <= bound, {
      p2611: S0.p2611,
      p2612: S0.p2612,
      absDifference: sig(d),
      bound: sig(bound),
    });
  }

  if (want('B4')) {
    add(
      'B4',
      'reported',
      {
        falseAlarmBaluevAstropy: sig(S0.falseAlarmBaluev),
        simulatedPOracle: S0.pMean,
        nullQuantiles: S0.nullStatQuantiles,
      },
      'an analytic upper bound on the maximum over frequencies, beside the simulation'
    );
  }

  if (want('C1')) {
    const L = lim('C1');
    let hits = 0;
    for (let i = 0; i < L.series; i++) {
      const g = normals(mulberry32(2610000 + 1000 * 1 + i));
      const y = Array.from({ length: 30 }, () => g());
      const rss0 = meanSd(y).rss;
      const rss1 = lsq(designOf(x30, [ONE, v => v]), y).rss;
      const r = S.compareModels({
        pair: REGULAR,
        n: 30,
        models: [
          { name: 'c', k: 1, rss: rss0 },
          { name: 'l', k: 2, rss: rss1 },
        ],
      });
      if (r.result.p < L.alpha) hits++;
    }
    const rate = hits / L.series;
    const bound = L.binomialSigmas * band(L.alpha, L.series);
    check('C1', Math.abs(rate - L.alpha) <= bound, {
      rate,
      expected: L.alpha,
      bound: sig(bound),
      series: L.series,
    });
  }

  let nullStats = null;
  if (want('C2') || want('C4')) {
    // C2 and C4 share their 800 series
    const L = lim('C2');
    const grid = gridFor(T_SERIES);
    let hits = 0;
    let naive = 0;
    let aic = 0;
    const naiveAlpha = 0.05;
    for (let i = 0; i < L.series; i++) {
      const g = normals(mulberry32(2610000 + 1000 * 2 + i));
      const y = Float64Array.from({ length: 40 }, () => g());
      const r = calibrate(T_SERIES, y, grid, `p261:C2:${i}`, L.draws);
      if (r.p <= L.alpha) hits++;
      const z = r.observed;
      const F = z / 2 / ((1 - z) / (40 - 3));
      if (S.fSf(F, 2, 37) < naiveAlpha) naive++;
      const rss0 = meanSd(y).rss;
      const ic = S.informationCriteria({
        n: 40,
        models: [
          { name: 'constant', k: 1, rss: rss0 },
          { name: 'sinusoid', k: 4, rss: (1 - z) * rss0, searched: true },
        ],
      });
      if (ic.preferred.aic === 'sinusoid') aic++;
    }
    nullStats = {
      rate: hits / L.series,
      naive: naive / L.series,
      aic: aic / L.series,
    };
    if (want('C2')) {
      const bound = L.binomialSigmas * band(L.expected, L.series);
      check('C2', Math.abs(nullStats.rate - L.expected) <= bound, {
        rate: nullStats.rate,
        expected: L.expected,
        bound: sig(bound),
        series: L.series,
        draws: L.draws,
      });
    }
    if (want('C4')) {
      const M = lim('C4');
      check(
        'C4',
        nullStats.naive >= M.minNaiveRate &&
          nullStats.aic >= M.minAicSearchedRate,
        {
          naiveFRate: nullStats.naive,
          aicSearchedRate: nullStats.aic,
          minNaive: M.minNaiveRate,
          minAic: M.minAicSearchedRate,
        }
      );
    }
  }

  if (want('C3')) {
    const L = lim('C3');
    let aic = 0;
    let bic = 0;
    for (let i = 0; i < L.series; i++) {
      const g = normals(mulberry32(2610000 + 1000 * 3 + i));
      const y = Array.from({ length: 30 }, () => g());
      const rss0 = meanSd(y).rss;
      const rss1 = lsq(designOf(x30, [ONE, v => v]), y).rss;
      const ic = S.informationCriteria({
        n: 30,
        models: [
          { name: 'c', k: 1, rss: rss0 },
          { name: 'l', k: 2, rss: rss1 },
        ],
      });
      if (ic.preferred.aic === 'l') aic++;
      if (ic.preferred.bic === 'l') bic++;
    }
    const ra = aic / L.series;
    const rb = bic / L.series;
    const ea = ORACLE.C3.expectedAic;
    const eb = ORACLE.C3.expectedBic;
    const ba = L.binomialSigmas * band(ea, L.series);
    const bb = L.binomialSigmas * band(eb, L.series);
    check('C3', Math.abs(ra - ea) <= ba && Math.abs(rb - eb) <= bb, {
      aic: { rate: ra, expected: sig(ea), bound: sig(ba) },
      bic: { rate: rb, expected: sig(eb), bound: sig(bb) },
      series: L.series,
    });
  }

  if (want('C5')) {
    const grid = gridFor(T_SERIES);
    let line = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const g = normals(mulberry32(2610000 + 1000 * 5 + i));
      const y = Array.from({ length: 30 }, () => g());
      const Dc = designOf(x30, [ONE]);
      const Dl = designOf(x30, [ONE, v => v]);
      const r = S.leaveOneOut({
        y,
        models: [
          { name: 'constant', fitPredict: lsPredictor(Dc, y) },
          { name: 'line', fitPredict: lsPredictor(Dl, y) },
        ],
      });
      if (r.best === 'line') line++;
    }
    let rej = 0;
    const NP = 200;
    for (let i = 0; i < NP; i++) {
      const u = mulberry32(2610000 + 1000 * 6 + i);
      const phase = 2 * Math.PI * u();
      const g = normals(u);
      const y = Float64Array.from(
        { length: 40 },
        (_, j) => 0.8 * Math.sin((2 * Math.PI * T_SERIES[j]) / 9 + phase) + g()
      );
      if (calibrate(T_SERIES, y, grid, `p261:C5:${i}`, 99).p <= 0.05) rej++;
    }
    add('C5', 'reported', {
      looPrefersLineUnderConstant: line / N,
      series: N,
      calibratedPowerAt0_05: rej / NP,
      powerSeries: NP,
    });
  }

  if (want('D1')) {
    const D = designOf(x30, [ONE]);
    const y = ORACLE.A1[1].y;
    const m = [
      { name: 'c', k: 1, rss: lsq(D, y).rss },
      { name: 'f', k: 4, rss: 0.5 * lsq(D, y).rss },
    ];
    const code = flags => {
      const r = S.compareModels({ pair: flags, n: 30, models: m });
      return {
        class: r.class,
        refused: r.refusedMethods?.[0]?.code,
        valid: r.primary,
        status: r.status,
        code: r.code,
      };
    };
    const s = code(SEARCHED);
    const b = code({ nested: true, boundary: true, searched: false });
    const nn = code({ nested: false, boundary: false, searched: false });
    const direct = S.fTest({
      rssReduced: 10,
      pReduced: 1,
      rssFull: 5,
      pFull: 4,
      n: 30,
      searched: true,
    });
    const ok =
      s.class === 'nested-nonregular' &&
      s.refused === 'searched' &&
      s.valid === 'simulation-calibrated' &&
      s.code === 'needs-simulation' &&
      b.refused === 'boundary' &&
      b.valid === 'simulation-calibrated' &&
      nn.class === 'non-nested' &&
      nn.refused === 'not-nested' &&
      nn.valid === 'information-criteria' &&
      nn.status === 'ok' &&
      direct.status === 'refused' &&
      direct.code === 'searched';
    const cl = S.classifyPair({
      nested: true,
      boundary: true,
      searched: false,
    });
    const notOffered = cl.notOffered.map(o => o.method);
    check('D1', ok && notOffered.includes('information-criteria'), {
      searched: s,
      boundary: b,
      nonNested: nn,
      directFTest: direct.code,
      notOfferedForBoundary: notOffered,
    });
  }

  if (want('D2')) {
    const mk = (n, models) => S.informationCriteria({ n, models });
    const r19 = mk(19, [
      { k: 1, rss: 5 },
      { k: 2, rss: 4 },
    ]);
    const r24 = mk(24, [
      { k: 1, rss: 5 },
      { k: 5, rss: 4 },
    ]);
    const r20 = mk(20, [
      { k: 1, rss: 5 },
      { k: 3, rss: 4 },
    ]);
    const nan = mk(40, [
      { k: 1, rss: NaN },
      { k: 2, rss: 4 },
    ]);
    const neg = mk(40, [
      { k: 1, rss: -1 },
      { k: 2, rss: 4 },
    ]);
    const zero = mk(40, [
      { k: 1, rss: 0 },
      { k: 2, rss: 4 },
    ]);
    const frac = mk(40.5, [
      { k: 1, rss: 5 },
      { k: 2, rss: 4 },
    ]);
    const one = mk(40, [{ k: 1, rss: 5 }]);
    const ok =
      r19.code === 'sample-size' &&
      r24.code === 'sample-size' &&
      r20.status === 'ok' &&
      nan.code === 'input' &&
      neg.code === 'input' &&
      zero.code === 'zero-rss' &&
      frac.code === 'counts' &&
      one.code === 'models';
    check('D2', ok, {
      n19: r19.code,
      n24k5: r24.code,
      n20K4: r20.status,
      nan: nan.code,
      negative: neg.code,
      zero: zero.code,
      fractional: frac.code,
      oneModel: one.code,
    });
  }

  if (want('D3')) {
    const sim = u => u();
    const trap = f => {
      try {
        f();
        return null;
      } catch (e) {
        return e.code ?? e.message;
      }
    };
    const budget = trap(() =>
      S.calibratedSignificance({
        observed: 1,
        simulate: sim,
        seed: 's',
        draws: 20001,
      })
    );
    const noSeed = trap(() =>
      S.calibratedSignificance({ observed: 1, simulate: sim, draws: 99 })
    );
    const frac = trap(() =>
      S.calibratedSignificance({
        observed: 1,
        simulate: sim,
        seed: 's',
        draws: 2.5,
      })
    );
    const low = S.calibratedSignificance({
      observed: 1,
      simulate: sim,
      seed: 's',
      draws: 999,
      level: 0.0009,
    });
    let calls = 0;
    const nanSim = u => (++calls === 7 ? NaN : u());
    const nan = S.calibratedSignificance({
      observed: 0.5,
      simulate: nanSim,
      seed: 's',
      draws: 99,
    });
    const obsNan = S.calibratedSignificance({
      observed: NaN,
      simulate: sim,
      seed: 's',
      draws: 99,
    });
    const needs = S.compareModels({
      pair: SEARCHED,
      n: 40,
      models: [
        { k: 1, rss: 5 },
        { k: 4, rss: 4 },
      ],
    });
    const ok =
      budget === 'budget' &&
      noSeed === 'seed' &&
      frac === 'draws' &&
      low.code === 'too-few-draws' &&
      nan.status === 'refused' &&
      nan.code === 'non-finite-draws' &&
      nan.nonFinite === 1 &&
      nan.p === undefined &&
      obsNan.code === 'input' &&
      needs.status === 'refused' &&
      needs.code === 'needs-simulation' &&
      needs.class === 'nested-nonregular';
    check('D3', ok, {
      budget,
      noSeed,
      fractional: frac,
      tooFew: low.code,
      nanDraw: nan.code,
      observedNan: obsNan.code,
      needsSimulation: needs.code,
    });
  }

  if (want('D4')) {
    const y = Array.from({ length: 30 }, (_, i) => Math.sin(i));
    const mean = (train, i) => {
      void i;
      return train.reduce((s, j) => s + y[j], 0) / train.length;
    };
    const m = [{ name: 'mean', fitPredict: mean }];
    const four = S.leaveOneOut({ y: y.slice(0, 4), models: m });
    let big = null;
    try {
      S.leaveOneOut({ y: new Array(501).fill(1), models: m });
    } catch (e) {
      big = e.code;
    }
    const pred = S.leaveOneOut({
      y: y.slice(0, 8),
      models: [{ name: 'nan', fitPredict: () => NaN }],
    });
    const obs = S.leaveOneOut({ y: [1, 2, NaN, 4, 5, 6], models: m });
    const five = S.leaveOneOut({ y: y.slice(0, 5), models: m });
    const ok =
      four.code === 'sample-size' &&
      big === 'budget' &&
      pred.code === 'non-finite' &&
      obs.code === 'non-finite' &&
      five.status === 'ok';
    check('D4', ok, {
      n4: four.code,
      n501: big,
      nanPrediction: pred.code,
      nanObservation: obs.code,
      n5: five.status,
    });
  }

  if (want('E1')) {
    const grid = gridFor(T_SERIES);
    const N = 400;
    let hits = 0;
    for (let i = 0; i < N; i++) {
      const g = normals(mulberry32(2610000 + 1000 * 7 + i));
      const y = Float64Array.from(
        { length: 40 },
        (_, j) => (1 + (4 * j) / 39) * g()
      );
      if (calibrate(T_SERIES, y, grid, `p261:E1:${i}`, 99).p <= 0.05) hits++;
    }
    add(
      'E1',
      'reported',
      { rateAt0_05: hits / N, series: N, statedLevel: 0.05 },
      'the stated null is homoscedastic and the truth is not'
    );
  }

  let etaT = null;
  let etaY = null;
  let etaGrid = null;
  if (want('F1') || want('F2')) {
    const sidecar = read('variables/tess-eta-aql-s81.json');
    const tab = tableOf({ PACK, SERIES: sidecar });
    const col = id => tab.columns.find(c => c.id === id).values;
    const time = col('time');
    const flux = col('flux');
    const L = lim('F1');
    const idx = [];
    for (let i = 0; i < time.length; i += L.everyKth) idx.push(i);
    etaT = Float64Array.from(idx, i => time[i]);
    etaY = Float64Array.from(idx, i => flux[i]);
    etaGrid = periodGrid(
      L.minPeriod,
      L.maxPeriod,
      etaT[etaT.length - 1] - etaT[0],
      L.oversample
    );
    const allFinite =
      etaT.every(Number.isFinite) && etaY.every(Number.isFinite);
    if (!allFinite) {
      if (want('F1'))
        add('F1', 'notrun', { reason: 'a missing value in the subsample' });
      if (want('F2'))
        add('F2', 'notrun', { reason: 'a missing value in the subsample' });
      etaT = null;
    }
  }
  if (etaT && want('F1')) {
    const L = lim('F1');
    const r = calibrate(etaT, etaY, etaGrid, 'p261:F1', L.draws);
    const pw = periodogram(etaT, etaY, etaGrid);
    let kb = 0;
    for (let k = 1; k < pw.length; k++) if (pw[k] > pw[kb]) kb = k;
    const packed = JSON.parse(
      readFileSync(path.join(ROOT, 'data-packs/tess-eta-aql-s81.json'), 'utf8')
    );
    check('F1', r.atFloor === true && r.p <= L.maxP, {
      points: etaT.length,
      p: r.p,
      atFloor: r.atFloor,
      bestPeriod: sig(etaGrid[kb]),
      peakPower: sig(r.observed),
      packRecordedPublishedPeriodReportedOnly:
        packed.validation.against[0].value,
    });
  }
  if (etaT && want('F2')) {
    const L = lim('F2');
    let rej = 0;
    for (let k = 0; k < L.permutations; k++) {
      const u = mulberry32(2615000 + k);
      const y = Float64Array.from(etaY);
      for (let i = y.length - 1; i > 0; i--) {
        const j = Math.floor(u() * (i + 1));
        [y[i], y[j]] = [y[j], y[i]];
      }
      if (calibrate(etaT, y, etaGrid, `p261:F2:${k}`, L.draws).p <= L.alpha)
        rej++;
    }
    check('F2', rej <= L.maxRejections, {
      rejections: rej,
      of: L.permutations,
      maxAllowed: L.maxRejections,
    });
  }

  for (const n of THRESHOLDS.notRun)
    if (want(n.id.split('.')[0]) || !only.length)
      rows.push({
        id: n.id,
        leg: n.leg,
        status: 'notrun',
        measured: {
          reason: 'the file was not supplied; nothing is fetched by an agent',
        },
        note: n.request,
      });
  for (const r of rows) {
    const t = THRESHOLDS.checks.find(c => c.id === r.id);
    if (t) r.leg = t.leg;
  }
  return rows;
}

/** The verdict, computed from the rows by the function committed in the thresholds. */
export function verdictFrom(rows) {
  const judged = rows.filter(r => r.status === 'pass' || r.status === 'fail');
  const failing = judged.filter(r => r.status === 'fail').map(r => r.id);
  const committed = THRESHOLDS.checks
    .filter(c => !c.limits.reported)
    .map(c => c.id);
  const missing = committed.filter(id => !judged.some(r => r.id === id));
  return {
    verdict:
      failing.length || missing.length
        ? 'FAILED LEG(S)'
        : 'VALIDATED (V-internal)',
    failing,
    notJudged: missing,
    notRun: rows.filter(r => r.status === 'notrun').map(r => r.id),
    consumers: 'panel and investigations not built (consumers rule)',
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const t0 = Date.now();
  const rows = await runValidation({ only });
  const gate = verdictFrom(rows);
  const result = {
    format: 'gravitas.model-comparison-results/1',
    rows,
    verdict: gate,
    meta: {
      node: process.version,
      oracle: ORACLE.versions,
      seconds: Math.round((Date.now() - t0) / 1000),
    },
  };
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(9)} ${r.id.padEnd(34)} ${JSON.stringify(r.measured)}`
      );
    console.log(
      `\n${gate.verdict}; failing: ${gate.failing.join(', ') || 'none'}; not run: ${gate.notRun.join(', ')}`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
  if (args.includes('--write-failed') && !only.length) {
    const legs = rows
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured, note: r.note }));
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify({ format: 'gravitas.model-comparison-failed-legs/1', note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound', legs }, null, 1)}\n`
    );
  }
  process.exitCode = 0;
}
