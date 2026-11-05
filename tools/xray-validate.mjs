#!/usr/bin/env node
// =============================================================================
// The X-ray counts kernel against its committed thresholds (Prompt 243)
// -----------------------------------------------------------------------------
//   npm run xray:validate                    print the table
//   npm run xray:validate -- --json          print it as JSON
//   npm run xray:validate -- --write-results rewrite tests/fixtures/xray/results.json
//   npm run xray:validate -- --write-failed  rewrite tests/fixtures/xray/failed-legs.json
//   --only=A1,B1                             run the legs whose id starts with these
//
// tests/fixtures/xray/thresholds.json fixed every bound before js/kernels/xray existed
// (HIGH_ENERGY.md and X_RAY_COUNTS_GATE.md). This reads the bounds from that file, not from
// copies. The B rows read tests/fixtures/xray/oracle-results.json, which
// tools/xray-oracle/oracle.py wrote (numpy, scipy, astropy; no Gravitas code). A leg whose
// authentic file was never supplied is NOT RUN and says why. The gate's verdicts are
// computed from the rows by the function committed in the thresholds, not read by eye.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as K from '../js/kernels/xray/index.js';
import { lnGamma } from '../js/kernels/statistics/special.js';
import { stream } from '../js/random/streams.js';
import { searchPeriod as existingSearch } from '../js/measure/periodogram.js';
import {
  DIR,
  THRESHOLDS,
  dwell,
  dwellSearch,
  hardnessScene,
  limits as lim,
  orbit,
  orbitSearch,
  outburst,
  unevenNull,
  unevenSearch,
} from './xray-scenes.mjs';
import { searchArrays } from './xray-oracle/make-inputs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const ORACLE = read(`${DIR}/oracle-results.json`);
const AUTH_DIR = path.join(ROOT, DIR, 'authentic');
const SCENES = THRESHOLDS.synthetic.scenes;

export { THRESHOLDS };

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
};

/** One count in one bin of S, an exposure of `T` s: the smallest valid series. */
const mini = (counts, T, hard = 0) => ({
  format: 'gravitas.counts-series/1',
  time: { system: 'TDB', barycentric: true },
  start: [0],
  stop: [T],
  exposure: [T],
  bands: [
    { id: 'S', lo: 1, hi: 3, unit: 'keV' },
    { id: 'H', lo: 3, hi: 10, unit: 'keV' },
  ],
  counts: { S: [counts], H: [hard] },
  background: { kind: 'none', negligible: true },
  deadTime: { kind: 'in-exposure' },
  gti: [[0, T]],
});

const pmfPoisson = (n, mu) =>
  mu === 0
    ? n === 0
      ? 1
      : 0
    : Math.exp(n * Math.log(mu) - mu - lnGamma(n + 1));
const pmfBinomial = (N, H, p) =>
  Math.exp(
    lnGamma(N + 1) -
      lnGamma(H + 1) -
      lnGamma(N - H + 1) +
      (H === 0 ? 0 : H * Math.log(p)) +
      (N - H === 0 ? 0 : (N - H) * Math.log(1 - p))
  );

const clone = o => JSON.parse(JSON.stringify(o));

/**
 * Run the legs.
 * @param {{only?: string[], authDir?: string}} [opts]
 * @returns {Promise<object[]>} rows {id, status, measured, note}
 */
export async function runValidation({ only = [], authDir = AUTH_DIR } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();

  // ---- A: analytic and synthetic recovery ------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.garwoodClosed');
    const errs = [];
    for (const c of L.cases) {
      const r = K.rate(mini(c.counts, c.exposure), { level: c.level });
      const p = r.pooled;
      if (c.lo !== undefined)
        errs.push(
          c.lo === 0
            ? Math.abs(p.lo) / L.maxAbsZero
            : rel(p.lo, c.lo) / L.maxRel
        );
      if (c.hi !== undefined) errs.push(rel(p.hi, c.hi) / L.maxRel);
    }
    const r = K.rate(mini(7, 3.5));
    const exact =
      r.pooled.rate === 7 / 3.5 && r.pooled.lo <= 2 && r.pooled.hi >= 2;
    const label = r.method === L.methodLabel;
    const bad = [
      K.rate({ ...mini(1, 1), counts: { S: [2.5], H: [0] } }),
      K.rate({ ...mini(1, 1), counts: { S: [-1], H: [0] } }),
      K.rate({ ...mini(1, 1), exposure: undefined }),
    ].map(x => x.code);
    const refusalsOk =
      bad[0] === 'counts' && bad[1] === 'counts' && bad[2] === 'exposure';
    row('A1.garwoodClosed', maxOf(errs) <= 1 && exact && label && refusalsOk, {
      worstErrorInBounds: sig(maxOf(errs), 3),
      exactRate: exact,
      label: r.method,
      refusals: bad,
    });
  }

  if (wanted('A2.')) {
    const L = lim('A2.hardnessClosed');
    let worst = 0;
    let ok = true;
    const detail = [];
    for (const c of L.cases) {
      const r = K.hardnessCounts({
        hard: c.hard,
        soft: c.soft,
        level: c.level,
      });
      if (c.hr !== undefined)
        worst = Math.max(worst, Math.abs(r.hr - c.hr) / L.maxAbsHr);
      if (c.lo !== undefined)
        worst = Math.max(worst, Math.abs(r.lo - c.lo) / L.maxAbsEnd);
      if (c.hi !== undefined)
        worst = Math.max(worst, Math.abs(r.hi - c.hi) / L.maxAbsEnd);
      detail.push({ hard: c.hard, soft: c.soft, hr: r.hr, lo: r.lo, hi: r.hi });
      if (!(r.lo >= -1 && r.hi <= 1 && r.lo <= r.hr && r.hr <= r.hi))
        ok = false;
    }
    let mirror = 0;
    for (const [h, s] of [
      [30, 10],
      [3, 17],
      [0, 5],
      [12, 12],
      [1, 100],
    ]) {
      const a = K.hardnessCounts({ hard: h, soft: s, level: 0.95 });
      const b = K.hardnessCounts({ hard: s, soft: h, level: 0.95 });
      mirror = Math.max(
        mirror,
        Math.abs(a.hr + b.hr),
        Math.abs(a.lo + b.hi),
        Math.abs(a.hi + b.lo)
      );
    }
    const zero = K.hardnessCounts({ hard: 0, soft: 0 });
    const zeroOk = zero.status === 'refused' && zero.code === 'noCounts';
    row(
      'A2.hardnessClosed',
      worst <= 1 && mirror <= L.maxMirror && ok && zeroOk,
      {
        worstInBounds: sig(worst, 3),
        mirror,
        refusedNoCounts: zeroOk,
        cases: detail,
      }
    );
  }

  if (wanted('A3.')) {
    const L = lim('A3.binConservation');
    const { series } = orbit(L.seed, L.label);
    const view = K.validateSeries(series);
    const out = K.binByCounts(series, {
      band: ['S', 'H'],
      minCounts: L.minCounts,
      maxGap: L.maxGapSeconds,
    });
    const checks = {};
    const sumOf = (v, ids) =>
      ids.reduce((a, id) => a + v.counts[id].reduce((x, y) => x + y, 0), 0);
    const merged = K.validateSeries(out.series);
    checks.valid = merged.status === 'ok';
    checks.counts =
      merged.status === 'ok' &&
      sumOf(merged, ['S', 'H']) === sumOf(view, ['S', 'H']);
    const eIn = view.exposure.reduce((a, b) => a + b, 0);
    const eOut =
      merged.status === 'ok' ? merged.exposure.reduce((a, b) => a + b, 0) : NaN;
    checks.exposure = rel(eOut, eIn) <= L.maxExposureRel;
    let consecutive = true;
    let gaps = true;
    let minimal = true;
    let shortRule = true;
    let nShort = 0;
    const live = [];
    for (let i = 0; i < view.n; i++) if (view.live[i]) live.push(i);
    const pos = new Map(live.map((v, k) => [v, k]));
    for (const g of out.groups) {
      const m = g.members;
      for (let k = 1; k < m.length; k++) {
        if (pos.get(m[k]) !== pos.get(m[k - 1]) + 1) consecutive = false;
        if (view.start[m[k]] - view.stop[m[k - 1]] > L.maxGapSeconds)
          gaps = false;
      }
      const cnt = i => view.counts.S[i] + view.counts.H[i];
      const total = m.reduce((a, i) => a + cnt(i), 0);
      if (g.short) {
        nShort++;
        if (!(total < L.minCounts)) shortRule = false;
      } else {
        if (!(total >= L.minCounts)) shortRule = false;
        if (m.length > 1 && !(total - cnt(m[m.length - 1]) < L.minCounts))
          minimal = false;
      }
    }
    Object.assign(checks, { consecutive, gaps, minimal, shortRule });
    row('A3.binConservation', Object.values(checks).every(Boolean), {
      groups: out.groups.length,
      short: nShort,
      binsIn: view.nLive,
      ...checks,
    });
  }

  if (wanted('A4.')) {
    const L = lim('A4.periodRecovery');
    const f0 = 1 / SCENES.orbit.truePeriodSeconds;
    let good = 0;
    const fails = [];
    let noFalseAlarm = true;
    for (let k = 0; k < L.seeds; k++) {
      const seed = L.seedBase + k;
      const { series } = orbit(seed, L.label, {
        amplitude: SCENES.orbit.fractionalSemiAmplitude,
      });
      const r = K.searchPeriod(series, {
        ...orbitSearch(),
        nSim: L.nSim,
        seed,
        label: L.label,
        keepGrid: true,
      });
      const errRes = Math.abs(r.frequency - f0) / r.grid.resolution;
      if ('falseAlarm' in r || 'falseAlarm' in r.significance)
        noFalseAlarm = false;
      const ok =
        errRes <= L.maxFreqErrorInResolutions &&
        r.significance.p <= L.maxP &&
        r.significance.method === 'simulation' &&
        r.significance.nSim === L.nSim;
      if (ok) good++;
      else
        fails.push({
          seed,
          period: sig(r.period, 6),
          errorInResolutions: sig(errRes, 3),
          p: r.significance.p,
          flags: r.flags.map(f => f.code),
          // diagnostic only: the highest power within one resolution of the true frequency, over the highest overall
          truePeakOverTop: sig(
            maxOf(
              r.powerGrid.filter(
                (_, k) =>
                  Math.abs(r.grid.fmin + k * r.grid.df - f0) <=
                  r.grid.resolution
              )
            ) / r.power,
            3
          ),
        });
    }
    row('A4.periodRecovery', good === L.seeds && noFalseAlarm, {
      recovered: `${good} of ${L.seeds}`,
      noFalseAlarmField: noFalseAlarm,
      failing: fails,
    });
  }

  if (wanted('A5.')) {
    const L = lim('A5.hardnessRecovery');
    const truth = SCENES.hardness.trueHardness;
    let inside = 0;
    let worstHalf = 0;
    let agree = 0;
    const per = [];
    for (const seed of L.seeds) {
      const { series } = hardnessScene(seed, L.label);
      const h = K.hardness(series, {
        soft: 'S',
        hard: 'H',
        level: L.level,
      }).pooled;
      if (h.lo <= truth && truth <= h.hi) inside++;
      worstHalf = Math.max(worstHalf, (h.hi - h.lo) / 2);
      const hid = K.hardnessIntensity(series, {
        soft: 'S',
        hard: 'H',
        minCounts: h.hardCounts + h.softCounts,
        level: L.level,
      });
      agree = Math.max(
        agree,
        hid.status === 'ok' && hid.points.length === 1
          ? Math.abs(hid.points[0].hr - h.hr)
          : Infinity
      );
      per.push({ seed, hr: sig(h.hr, 4), lo: sig(h.lo, 4), hi: sig(h.hi, 4) });
    }
    row(
      'A5.hardnessRecovery',
      inside === L.seeds.length &&
        worstHalf <= L.maxHalfWidth &&
        agree <= L.pooledAgreement,
      {
        inside: `${inside} of ${L.seeds.length}`,
        worstHalfWidth: sig(worstHalf, 3),
        pooledAgreement: agree,
        per,
      }
    );
  }

  if (wanted('A6.')) {
    const L = lim('A6.outburstRecovery');
    const { series } = outburst(L.seed, L.label);
    const r = K.detectOutbursts(series);
    const run = r.runs?.[0];
    const found =
      r.status === 'ok' &&
      r.runs.length === 1 &&
      Math.abs(run.tStart - SCENES.outburst.startSeconds) <=
        L.startToleranceSeconds &&
      Math.abs(run.tStop - L.stopTruthSeconds) <= L.stopToleranceSeconds &&
      Math.abs(run.peakBin - run.firstBin) <= 1;
    let falseRuns = 0;
    let quietRefused = 0;
    for (let k = 0; k < L.quietSeeds; k++) {
      const q = K.detectOutbursts(
        outburst(L.quietSeedBase + k, 'quiet', { quiet: true }).series
      );
      if (q.status !== 'ok') quietRefused++;
      else falseRuns += q.runs.length;
    }
    const high = K.detectOutbursts(
      outburst(L.seed, 'high', {
        step: { from: L.highFrom, to: L.highTo, factor: L.highFactor },
      }).series
    );
    const highRefused =
      high.status === 'refused' && high.code === 'noQuietLevel';
    row(
      'A6.outburstRecovery',
      found && falseRuns === 0 && quietRefused === 0 && highRefused,
      {
        runs: r.runs?.map(x => ({
          tStart: x.tStart,
          tStop: x.tStop,
          peakBin: x.peakBin,
          bins: x.bins,
        })),
        quietRate: sig(r.quietRate, 4),
        falseRunsInQuietSeries: falseRuns,
        quietRefused,
        highCase: highRefused
          ? 'refused noQuietLevel'
          : (high.code ?? `ok, ${high.runs?.length} runs`),
      }
    );
  }

  // ---- B: the independent oracle ---------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1.garwoodOracle');
    let worst = 0;
    let n = 0;
    for (const o of ORACLE.garwood) {
      const p = K.rate(mini(o.counts, o.exposure), { level: o.level }).pooled;
      const e = [
        o.lo === 0
          ? Math.abs(p.lo) / (L.maxAbsZero / L.maxRel)
          : rel(p.lo, o.lo),
        rel(p.hi, o.hi),
      ];
      worst = Math.max(worst, ...e);
      n++;
    }
    row('B1.garwoodOracle', worst <= L.maxRel, {
      intervals: n,
      worstRelative: sig(worst, 3),
    });
  }

  if (wanted('B2.')) {
    const L = lim('B2.clopperPearsonOracle');
    let worst = 0;
    for (const o of ORACLE.clopper) {
      const r = K.hardnessCounts({
        hard: o.H,
        soft: o.N - o.H,
        level: o.level,
      });
      worst = Math.max(worst, Math.abs(r.lo - o.lo), Math.abs(r.hi - o.hi));
    }
    row('B2.clopperPearsonOracle', worst <= L.maxAbs, {
      intervals: ORACLE.clopper.length,
      worstAbsolute: sig(worst, 3),
    });
  }

  if (wanted('B3.')) {
    const L = lim('B3.glsOracle');
    const { series } = orbit(L.seed, L.label, {
      amplitude: SCENES.orbit.fractionalSemiAmplitude,
    });
    const a = searchArrays(series);
    const lam =
      a.counts.reduce((s, c) => s + c, 0) / a.expo.reduce((s, e) => s + e, 0);
    const pk = K.peakFrequency(series, orbitSearch());
    let worstPow = 0;
    for (let k = 0; k < L.frequencies; k++)
      worstPow = Math.max(
        worstPow,
        Math.abs(pk.powerGrid[k] - ORACLE.gls.power[k])
      );
    // the existing module, on the same times, rates and errors
    const y = a.counts.map((c, i) => c / a.expo[i]);
    const dy = a.expo.map(e => Math.sqrt(lam / e));
    const ex = await existingSearch(
      {
        t: Float64Array.from(a.t),
        y: Float64Array.from(y),
        dy: Float64Array.from(dy),
      },
      {
        minPeriod: orbitSearch().minPeriod,
        maxPeriod: orbitSearch().maxPeriod,
        oversample: orbitSearch().oversample,
      }
    );
    const gridOk =
      pk.grid.frequencies === ex.grid.periods.length &&
      rel(pk.grid.fmin, 1 / ex.grid.periods[0]) < 1e-12 &&
      rel(
        pk.grid.fmin + (pk.grid.frequencies - 1) * pk.grid.df,
        1 / ex.grid.periods[ex.grid.periods.length - 1]
      ) < 1e-9 &&
      pk.grid.frequencies === ORACLE.gls.m &&
      rel(pk.grid.df, ORACLE.gls.df) < 1e-12;
    const peakDiff = Math.abs(pk.frequency - ex.frequency) / pk.grid.df;
    row(
      'B3.glsOracle',
      worstPow <= L.maxAbsPower &&
        gridOk &&
        peakDiff <= L.maxPeakFrequencyStepFraction,
      {
        worstPowerDifference: worstPow,
        gridEqualsExistingModuleAndOracle: gridOk,
        peakDifferenceInGridSteps: peakDiff,
        existingModulePeriod: ex.period,
        kernelPeriod: pk.period,
      }
    );
  }

  if (wanted('B4.')) {
    const L = lim('B4.significanceOracle');
    const per = [];
    let allOk = true;
    L.seeds.forEach((seed, k) => {
      const { series } = orbit(seed, L.label, { amplitude: L.amplitudes[k] });
      const r = K.searchPeriod(series, {
        ...orbitSearch(),
        nSim: L.nSimKernel,
        seed,
        label: L.label,
      });
      const o = ORACLE.significance[k];
      const pbar = 0.5 * (r.significance.p + o.p);
      const tol =
        L.sigmas *
          Math.sqrt(pbar * (1 - pbar) * (1 / L.nSimKernel + 1 / L.nSimOracle)) +
        1 / L.nSimKernel;
      const diff = Math.abs(r.significance.p - o.p);
      if (!(diff <= tol)) allOk = false;
      per.push({
        seed,
        kernelP: r.significance.p,
        oracleP: o.p,
        difference: sig(diff, 3),
        tolerance: sig(tol, 3),
        observedMaxPowerDifference: Math.abs(r.power - o.maxPower),
      });
    });
    row('B4.significanceOracle', allOk, { series: per });
  }

  if (wanted('B5.')) {
    const L = lim('B5.netRateOracle');
    let worst = 0;
    for (const o of ORACLE.net) {
      const [Ns, Nb, T, Tb, r] = o.case;
      const k = K.netRateInterval({
        counts: Ns,
        exposure: T,
        bkgCounts: Nb,
        bkgExposure: Tb,
        areaRatio: r,
        level: o.level,
      });
      worst = Math.max(
        worst,
        o.lo === 0 ? Math.abs(k.lo) * 1e6 : rel(k.lo, o.lo),
        rel(k.hi, o.hi)
      );
    }
    row('B5.netRateOracle', worst <= L.maxRel, {
      intervals: ORACLE.net.length,
      worstRelative: sig(worst, 3),
    });
  }

  if (wanted('B6.')) {
    const L = lim('B6.netHardnessOracle');
    let worst = 0;
    let worstDefined = 0;
    const per = [];
    for (const o of ORACLE.nethardness) {
      const [Nss, Nbs, Nsh, Nbh] = o.case;
      const k = K.netHardnessInterval({
        soft: { counts: Nss, bkgCounts: Nbs },
        hard: { counts: Nsh, bkgCounts: Nbh },
        exposure: L.T,
        areaRatio: L.r,
        level: L.level,
      });
      const defined = k.status === 'ok';
      const d = defined
        ? Math.max(
            Math.abs(k.lo - o.lo),
            Math.abs(k.hi - o.hi),
            Math.abs(k.hr - o.hr)
          )
        : Infinity;
      worst = Math.max(worst, d);
      if (defined) worstDefined = Math.max(worstDefined, d);
      per.push(
        defined
          ? {
              case: o.case,
              kernel: [sig(k.lo, 5), sig(k.hi, 5)],
              oracle: [sig(o.lo, 5), sig(o.hi, 5)],
            }
          : {
              case: o.case,
              kernel: `refused ${k.code}`,
              oracle: [sig(o.lo, 5), sig(o.hi, 5)],
            }
      );
    }
    row(
      'B6.netHardnessOracle',
      worst <= L.maxAbs,
      {
        worstAbsolute: Number.isFinite(worst)
          ? sig(worst, 3)
          : 'a case the kernel refuses',
        worstOverTheCasesTheKernelAnswers: sig(worstDefined, 3),
        cases: per,
      },
      'a case with no net counts in either band is refused by the kernel (the hardness is not defined there)'
    );
  }

  if (wanted('B7.')) {
    notRun(
      'B7.timingPackage',
      existsSync(path.join(authDir, 'timing-package.json'))
        ? 'authentic/timing-package.json is present but no product-to-contract mapping is committed with it yet: the comparison is written after the file forms are known (X_RAY_COUNTS_GATE.md)'
        : 'authentic/timing-package.json was not supplied'
    );
  }

  // ---- C: coverage -----------------------------------------------------------------

  if (wanted('C1.')) {
    const L = lim('C1.hardnessCoverage');
    let minSlack = Infinity;
    let excess = 0;
    let points = 0;
    for (const level of L.levels) {
      for (const N of L.N) {
        const cis = [];
        for (let H = 0; H <= N; H++)
          cis.push(K.hardnessCounts({ hard: H, soft: N - H, level }));
        for (const p of L.p) {
          let cov = 0;
          for (let H = 0; H <= N; H++) {
            const truth = 2 * p - 1;
            if (cis[H].lo <= truth && truth <= cis[H].hi)
              cov += pmfBinomial(N, H, p);
          }
          minSlack = Math.min(minSlack, cov - level);
          excess += cov - level;
          points++;
        }
      }
    }
    row('C1.hardnessCoverage', minSlack >= -L.minSlack, {
      points,
      minimumCoverageMinusLevel: minSlack,
      meanExcess: sig(excess / points, 3),
    });
  }

  if (wanted('C1b.')) {
    const L = lim('C1b.hardnessCoverageEndToEnd');
    const truth = SCENES.hardness.trueHardness;
    const per = [];
    let allOk = true;
    for (const target of L.targetCounts) {
      const seconds =
        target / (SCENES.hardness.netRates.S + SCENES.hardness.netRates.H);
      let cov = 0;
      let none = 0;
      for (let k = 0; k < L.draws; k++) {
        const { series } = hardnessScene(L.seedBase + k, L.label, {
          seconds,
          oneBin: true,
        });
        const h = K.hardness(series, { soft: 'S', hard: 'H', level: L.level });
        if (h.status !== 'ok') {
          none++;
          continue;
        }
        if (h.pooled.lo <= truth && truth <= h.pooled.hi) cov++;
      }
      const c = cov / L.draws;
      if (!(c >= L.minCoverage)) allOk = false;
      per.push({ targetCounts: target, coverage: sig(c, 4), noCounts: none });
    }
    row('C1b.hardnessCoverageEndToEnd', allOk, { per });
  }

  if (wanted('C2.')) {
    const L = lim('C2.rateCoverage');
    let minSlack = Infinity;
    let points = 0;
    for (const level of L.levels) {
      const cache = new Map();
      const ci = n => {
        if (!cache.has(n)) cache.set(n, K.rate(mini(n, 1), { level }).pooled);
        return cache.get(n);
      };
      for (const mu of L.means) {
        const nmax = Math.ceil(mu + 12 * Math.sqrt(mu) + 40);
        let cov = 0;
        for (let n = 0; n <= nmax; n++) {
          const c = ci(n);
          if (c.lo <= mu && mu <= c.hi) cov += pmfPoisson(n, mu);
        }
        minSlack = Math.min(minSlack, cov - level);
        points++;
      }
    }
    row('C2.rateCoverage', minSlack >= -L.minSlack, {
      points,
      minimumCoverageMinusLevel: minSlack,
    });
  }

  if (wanted('C3.')) {
    const L = lim('C3.netRateCoverage');
    const cache = new Map();
    const ci = (Ns, Nb) => {
      const key = `${Ns},${Nb}`;
      if (!cache.has(key))
        cache.set(
          key,
          K.netRateInterval({
            counts: Ns,
            exposure: 1,
            bkgCounts: Nb,
            areaRatio: L.r,
            level: L.level,
          })
        );
      return cache.get(key);
    };
    let minCov = Infinity;
    let sum = 0;
    let points = 0;
    const per = [];
    for (const S of L.S)
      for (const B of L.B) {
        const mus = S + L.r * B;
        const mub = B;
        const ns = Math.ceil(mus + 12 * Math.sqrt(mus) + 40);
        const nb = Math.ceil(mub + 12 * Math.sqrt(mub) + 40);
        let cov = 0;
        for (let Nb = 0; Nb <= nb; Nb++) {
          const pb = pmfPoisson(Nb, mub);
          for (let Ns = 0; Ns <= ns; Ns++) {
            const c = ci(Ns, Nb);
            if (c.lo <= S && S <= c.hi) cov += pb * pmfPoisson(Ns, mus);
          }
        }
        minCov = Math.min(minCov, cov);
        sum += cov;
        points++;
        per.push({ S, B, coverage: sig(cov, 4) });
      }
    row('C3.netRateCoverage', minCov >= L.minCoverage, {
      minimum: sig(minCov, 4),
      mean: sig(sum / points, 4),
      per,
    });
  }

  if (wanted('C3b.')) {
    const L = lim('C3b.netHardnessCoverage');
    const per = [];
    let allOk = true;
    L.net.forEach(([ns, nh], pt) => {
      const truth = (nh - ns) / (nh + ns);
      let cov = 0;
      for (let k = 0; k < L.draws; k++) {
        const draw = stream('noise', L.seedBase + k, L.label, pt);
        const mean = [ns + L.r * L.background[0], nh + L.r * L.background[1]];
        const Ns = K.poissonDraw(draw, mean[0]);
        const Nh = K.poissonDraw(draw, mean[1]);
        const Bs = K.poissonDraw(draw, L.background[0]);
        const Bh = K.poissonDraw(draw, L.background[1]);
        const r = K.netHardnessInterval({
          soft: { counts: Ns, bkgCounts: Bs },
          hard: { counts: Nh, bkgCounts: Bh },
          exposure: 1,
          areaRatio: L.r,
          level: L.level,
        });
        if (r.status === 'ok' && r.lo <= truth && truth <= r.hi) cov++;
      }
      const c = cov / L.draws;
      if (!(c >= L.minCoverage)) allOk = false;
      per.push({ net: [ns, nh], truth, coverage: sig(c, 4) });
    });
    row('C3b.netHardnessCoverage', allOk, { per });
  }

  if (wanted('C4.')) {
    const L = lim('C4.significanceCalibration');
    let at05 = 0;
    let at01 = 0;
    const ps = [];
    for (let k = 0; k < L.series; k++) {
      const seed = L.seedBase + k;
      const { series } = unevenNull(seed, L.label);
      const r = K.searchPeriod(series, {
        ...unevenSearch(),
        nSim: L.nSim,
        seed,
        label: L.label,
      });
      ps.push(r.significance.p);
      if (r.significance.p <= 0.05) at05++;
      if (r.significance.p <= 0.01) at01++;
    }
    const f05 = at05 / L.series;
    const f01 = at01 / L.series;
    row(
      'C4.significanceCalibration',
      f05 >= L.bandAt05[0] && f05 <= L.bandAt05[1] && f01 <= L.maxAt01,
      {
        fractionAt05: f05,
        fractionAt01: f01,
        medianP: sig(median(ps), 3),
      }
    );
  }

  if (wanted('C5.')) {
    const L = lim('C5.periodIntervalCoverage');
    const P0 = SCENES.orbit.truePeriodSeconds;
    let inside = 0;
    const half = [];
    for (let k = 0; k < L.seeds; k++) {
      const seed = L.seedBase + k;
      const { series } = orbit(seed, L.label, { amplitude: L.amplitude });
      const pk = K.peakFrequency(series, orbitSearch());
      const pi = K.periodInterval(series, {
        frequency: pk.frequency,
        seed,
        label: `${L.label}-boot`,
        level: L.level,
        ...orbitSearch(),
      });
      if (pi.status === 'ok') {
        if (pi.periodLo <= P0 && P0 <= pi.periodHi) inside++;
        half.push((pi.periodHi - pi.periodLo) / 2);
      }
    }
    const cov = inside / L.seeds;
    row('C5.periodIntervalCoverage', cov >= L.band[0] && cov <= L.band[1], {
      coverage: cov,
      medianHalfWidthSeconds: sig(median(half), 3),
    });
  }

  // ---- D: refusals and negative cases ------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.noGtiRefused');
    const { series } = orbit(243001, 'd1');
    const variants = [
      { ...series, gti: undefined },
      { ...series, gti: [] },
    ];
    const call = {
      validate: s => K.validateSeries(s),
      rate: s => K.rate(s),
      netRate: s => K.netRate(s),
      hardness: s => K.hardness(s, { soft: 'S', hard: 'H' }),
      binByCounts: s => K.binByCounts(s, { minCounts: 50 }),
      hardnessIntensity: s =>
        K.hardnessIntensity(s, { soft: 'S', hard: 'H', minCounts: 50 }),
      detectOutbursts: s => K.detectOutbursts(s),
      searchPeriod: s =>
        K.searchPeriod(s, { ...orbitSearch(), nSim: 99, seed: 1 }),
    };
    const bad = [];
    for (const name of L.entryPoints)
      for (const v of variants) {
        const r = call[name](v);
        if (!(r.status === 'refused' && r.code === 'noGti'))
          bad.push(`${name}:${r.code ?? r.status}`);
      }
    const noExp = K.validateSeries({ ...series, exposure: undefined });
    const expOk = noExp.status === 'refused' && noExp.code === 'exposure';
    row('D1.noGtiRefused', bad.length === 0 && expOk, {
      entryPointsChecked: L.entryPoints.length * 2,
      wrong: bad,
      missingExposureCode: noExp.code,
    });
  }

  if (wanted('D2.')) {
    const L = lim('D2.contractRefusals');
    const base = orbit(243001, 'd2').series;
    const v = (code, edit) => ({
      code,
      series: (() => {
        const s = clone(base);
        edit(s);
        return s;
      })(),
    });
    const variants = [
      v('format', s => {
        s.format = 'other/1';
      }),
      v('gtiInvalid', s => {
        s.gti[1][0] = s.gti[0][1] - 10;
      }),
      v('binOutsideGti', s => {
        s.gti.shift();
      }),
      v('exposureBeyondGti', s => {
        s.exposure[0] = s.stop[0] - s.start[0] + 1;
      }),
      v('deadTime', s => {
        s.deadTime.fraction = s.deadTime.fraction.map(() => 0.2);
      }),
      v('counts', s => {
        s.counts.S[3] = 2.5;
      }),
      v('counts', s => {
        s.counts.H[3] = -1;
      }),
      v('timeSystem', s => {
        delete s.time.system;
      }),
      v('timeSystem', s => {
        s.time.barycentric = 'yes';
      }),
      v('bands', s => {
        s.bands[1].lo = 2;
      }),
      v('bins', s => {
        s.start[1] = s.start[0] + 1;
      }),
      v('bins', s => {
        s.exposure.pop();
      }),
      v('background', s => {
        s.background.areaRatio = 0;
      }),
      v('exposure', s => {
        s.exposure[4] = 0;
        s.counts.S[4] = 3;
      }),
    ];
    const wrong = [];
    variants.forEach((x, i) => {
      const r = K.validateSeries(x.series);
      if (!(r.status === 'refused' && r.code === x.code))
        wrong.push({
          variant: i + 1,
          expected: x.code,
          got: r.code ?? r.status,
        });
    });
    const clean = K.validateSeries(base).status === 'ok';
    row(
      'D2.contractRefusals',
      wrong.length === 0 && clean && variants.length === L.variants,
      { variants: variants.length, wrong, unmodifiedAccepted: clean }
    );
  }

  if (wanted('D3.')) {
    const { series } = orbit(243001, 'd3', {
      amplitude: 0.3,
      barycentric: false,
    });
    const p = K.searchPeriod(series, { ...orbitSearch(), nSim: 99, seed: 1 });
    const r = K.rate(series);
    const h = K.hardness(series, { soft: 'S', hard: 'H' });
    const ok =
      p.status === 'refused' &&
      p.code === 'notBarycentric' &&
      /barycentre/.test(p.why) &&
      r.status === 'ok' &&
      h.status === 'ok';
    row('D3.nonBarycentricPeriod', ok, {
      searchCode: p.code,
      rateStatus: r.status,
      hardnessStatus: h.status,
    });
  }

  if (wanted('D4.')) {
    const L = lim('D4.searchRules');
    const { series } = orbit(L.seed, 'd4', { amplitude: 0.3 });
    const under = K.searchPeriod(series, {
      minPeriod: 60,
      maxPeriod: 1500,
      nSim: 99,
      seed: 1,
    });
    const few = K.searchPeriod(series, { ...orbitSearch(), nSim: 50, seed: 1 });
    const ok99 = K.searchPeriod(series, {
      ...orbitSearch(),
      nSim: L.minNSim,
      seed: 1,
    });
    const zero = clone(series);
    zero.counts.S = zero.counts.S.map(() => 0);
    zero.counts.H = zero.counts.H.map(() => 0);
    zero.background = { kind: 'none', negligible: true };
    const noCounts = K.searchPeriod(zero, {
      ...orbitSearch(),
      nSim: 99,
      seed: 1,
    });
    const tiny = K.searchPeriod(mini(5, 100), {
      minPeriod: 300,
      maxPeriod: 900,
      nSim: 99,
      seed: 1,
    });
    const m =
      Math.floor(
        (1 / orbitSearch().minPeriod - 1 / orbitSearch().maxPeriod) /
          ok99.grid.df
      ) + 1;
    const ok =
      under.code === 'undersampled' &&
      few.code === 'simulations' &&
      ok99.significance.smallestP === 0.01 &&
      ok99.significance.p >= 0.01 &&
      ok99.significance.trials === m &&
      !('falseAlarm' in ok99) &&
      !('falseAlarm' in ok99.significance) &&
      noCounts.code === 'noCounts' &&
      tiny.code === 'tooFew';
    row('D4.searchRules', ok, {
      undersampled: under.code,
      fewSimulations: few.code,
      smallestP: ok99.significance.smallestP,
      trials: ok99.significance.trials,
      noCounts: noCounts.code,
      oneBin: tiny.code,
    });
  }

  if (wanted('D5.')) {
    const L = lim('D5.aliasFlags');
    const T = SCENES.dwell.dwells * SCENES.dwell.spacingSeconds;
    const flagged = r =>
      r.flags.some(f => f.code === 'aliasPair' || f.code === 'atSampling');
    // (i) 0.007: any alias |k/100 +/- 0.007| within two grid steps (AM2)
    const a = dwell(243001, 'alias', L.freqs[0]);
    const ra = K.searchPeriod(a.series, {
      ...dwellSearch(),
      nSim: L.nSim,
      seed: 243001,
      label: 'alias',
    });
    const aliases = [];
    for (let k = 0; k <= 5; k++) {
      aliases.push(Math.abs(k / 100 - L.freqs[0]), k / 100 + L.freqs[0]);
    }
    const nearAlias = aliases.some(
      f => Math.abs(ra.frequency - f) <= 2 * ra.grid.df
    );
    const iOk = nearAlias && flagged(ra) && !ra.clean;
    // (ii) 0.00999
    const b = dwell(243001, 'atfs', L.freqs[1]);
    const rb = K.searchPeriod(b.series, {
      ...dwellSearch(),
      nSim: L.nSim,
      seed: 243001,
      label: 'atfs',
    });
    const iiOk = rb.flags.some(f => f.code === 'atSampling');
    // (iii) jitter
    let flaggedJit = 0;
    let found = 0;
    for (let k = 0; k < L.jitterSeeds; k++) {
      const seed = L.jitterSeedBase + k;
      const j = dwell(seed, 'jit', L.freqs[0], { jitter: true });
      const r = K.searchPeriod(j.series, {
        ...dwellSearch(),
        nSim: L.nSim,
        seed,
        label: 'jit',
      });
      if (Math.abs(r.frequency - L.freqs[0]) <= 2 / T) found++;
      if (flagged(r)) flaggedJit++;
    }
    row('D5.aliasFlags', iOk && iiOk && flaggedJit <= L.maxFlaggedJitter, {
      regular: {
        frequency: sig(ra.frequency, 5),
        flags: ra.flags.map(f => f.code),
        nearAlias,
      },
      atSamplingCase: {
        frequency: sig(rb.frequency, 5),
        flags: rb.flags.map(f => f.code),
      },
      jitter: {
        foundNear0_007: `${found} of ${L.jitterSeeds}`,
        flagged: `${flaggedJit} of ${L.jitterSeeds}`,
      },
    });
  }

  if (wanted('D6.')) {
    const L = lim('D6.backgroundPeriodic');
    let hit = 0;
    let control = 0;
    const per = [];
    const half = L.backgroundRate / 2;
    for (const seed of L.seeds) {
      const bg = orbit(seed, L.label, {
        areaRatio: L.areaRatio,
        backgroundRates: { S: half, H: half },
        backgroundModulation: {
          period: SCENES.orbit.truePeriodSeconds,
          fractionalSemiAmplitude: L.backgroundFractionalAmplitude,
        },
      });
      const r = K.searchPeriod(bg.series, {
        ...orbitSearch(),
        nSim: 199,
        seed,
        label: L.label,
      });
      const found = r.significance.p <= 0.01;
      const flag = r.flags.some(f => f.code === 'backgroundPeriodic');
      if (found && flag) hit++;
      const ctl = orbit(seed, `${L.label}-control`, {
        amplitude: SCENES.orbit.fractionalSemiAmplitude,
        areaRatio: L.areaRatio,
        backgroundRates: { S: half, H: half },
      });
      const rc = K.searchPeriod(ctl.series, {
        ...orbitSearch(),
        nSim: 199,
        seed,
        label: `${L.label}-control`,
      });
      const cflag = rc.flags.some(f => f.code === 'backgroundPeriodic');
      if (cflag) control++;
      per.push({
        seed,
        backgroundCase: { p: r.significance.p, flagged: flag },
        controlFlagged: cflag,
        controlP: rc.significance.p,
      });
    }
    row(
      'D6.backgroundPeriodic',
      hit >= L.minFlagged && control <= L.maxControlFlagged,
      { foundAndFlagged: `${hit} of 5`, controlFlagged: `${control} of 5`, per }
    );
  }

  if (wanted('D7.')) {
    const L = lim('D7.syntheticLabel');
    const { series, truth } = orbit(L.seed, 'd7', { amplitude: 0.3 });
    const view = K.validateSeries(series);
    const calls = {
      rate: K.rate(view),
      netRate: K.netRate(view),
      hardness: K.hardness(view, { soft: 'S', hard: 'H' }),
      binByCounts: K.binByCounts(view, { minCounts: 50 }),
      hardnessIntensity: K.hardnessIntensity(view, {
        soft: 'S',
        hard: 'H',
        minCounts: 50,
      }),
      detectOutbursts: K.detectOutbursts(view),
      searchPeriod: K.searchPeriod(view, {
        ...orbitSearch(),
        nSim: 99,
        seed: 1,
      }),
    };
    const missing = Object.entries(calls)
      .filter(
        ([, r]) =>
          !(
            r.status === 'ok' &&
            r.synthetic === true &&
            /^SYNTHETIC/.test(r.label)
          )
      )
      .map(([k]) => k);
    const plain = orbit(L.seed, 'd7', {
      amplitude: 0.3,
      synthetic: false,
    }).series;
    const pv = K.validateSeries(plain);
    const leaked = ['rate', 'hardness'].filter(
      k =>
        'synthetic' in
        (k === 'rate' ? K.rate(pv) : K.hardness(pv, { soft: 'S', hard: 'H' }))
    );
    const manifest =
      truth.synthetic === true &&
      truth.seed === L.seed &&
      truth.spec &&
      /^SYNTHETIC/.test(truth.label);
    row(
      'D7.syntheticLabel',
      missing.length === 0 &&
        leaked.length === 0 &&
        manifest &&
        /^SYNTHETIC/.test(series.label),
      { unlabelled: missing, flagOnControl: leaked, manifest }
    );
  }

  // ---- E: authentic products ---------------------------------------------------------

  const haveAuth = existsSync(path.join(authDir, 'SOURCES.json'));
  const authNote = file =>
    haveAuth
      ? `${file} is not in authentic/ (SOURCES.json lists what was supplied); a mapping of each product to the contract is committed with the first file`
      : 'no authentic product was supplied (nothing was fetched): tests/fixtures/xray/authentic/ does not exist';
  if (wanted('E0.')) notRun('E0.productFillsContract', authNote('a product'));
  if (wanted('E1.')) notRun('E1.pulsarCatalogue', authNote('catalogue.json'));
  if (wanted('E2.'))
    notRun(
      'E2.transientOutburst',
      authNote('the transient and the persistent products')
    );

  if (wanted('P1.')) {
    const L = lim('P1.speed');
    const cpu = process.cpuUsage(cpu0);
    const secs = (cpu.user + cpu.system) / 1e6;
    row(
      'P1.speed',
      secs <= L.maxCpuSeconds,
      { cpuSeconds: sig(secs, 3) },
      'recorded, not a physics bound'
    );
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

/**
 * The verdicts of the gate, computed from the rows by the function committed in the
 * thresholds (gate.verdictFunction). Never read by eye.
 */
export function gateVerdict(rows) {
  const G = THRESHOLDS.gate.verdictFunction;
  const status = prefix =>
    rows.find(r => r.id.startsWith(`${prefix}.`))?.status ?? 'missing';
  const passes = list => list.every(p => status(p) === 'pass');
  const nonPeriod = G.kernelLegGroups.nonPeriodLegs;
  const period = G.kernelLegGroups.periodLegs;
  const net = G.kernelLegGroups.netFormLegs;
  const failing = list => list.filter(p => status(p) !== 'pass');
  let kernel = 'C';
  if (passes(nonPeriod)) kernel = passes(period) ? 'A' : 'B';
  const products = ['E0', 'E1', 'E2'].map(p => `${p}:${status(p)}`);
  const anyProduct = ['E0', 'E1', 'E2'].some(
    p => status(p) !== 'not-run' && status(p) !== 'missing'
  );
  return {
    kernelVerdict: kernel,
    failingNonPeriodLegs: failing(nonPeriod),
    failingPeriodLegs: failing(period),
    netForms: passes(net)
      ? 'claimable'
      : `total forms only (not passing: ${failing(net).join(', ')})`,
    productVerdict: anyProduct
      ? 'to be computed from the supplied products'
      : 'NOT ESTABLISHED: no authentic product was supplied; treated as C for any statement about a real source',
    productLegs: products,
  };
}

// ---- command line --------------------------------------------------------------------

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const flag = f => args.includes(f);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const rows = await runValidation({ only });
  const failed = rows.filter(r => r.status === 'fail');
  const gate = gateVerdict(rows);
  if (flag('--json')) console.log(JSON.stringify({ rows, gate }, null, 2));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(34)} ${JSON.stringify(r.measured)} ${r.note}`
      );
    console.log(
      `\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'reported').length} reported, ${rows.filter(r => r.status === 'not-run').length} not run`
    );
    console.log(
      `kernel verdict ${gate.kernelVerdict}; net forms ${gate.netForms}; product verdict ${gate.productVerdict}`
    );
  }
  if (flag('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      JSON.stringify(
        { format: 'gravitas.xray-results/1', rows, gate },
        null,
        2
      ) + '\n'
    );
  if (flag('--write-failed'))
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.xray-failed-legs/1',
          label:
            'These legs crossed a committed bound and stay failing; only Carl resets one.',
          legs: failed.map(r => ({ id: r.id, measured: r.measured })),
        },
        null,
        2
      ) + '\n'
    );
}
