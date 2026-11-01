#!/usr/bin/env node
// =============================================================================
// The occurrence kernel against its committed thresholds (Prompt 229)
// -----------------------------------------------------------------------------
//   npm run occurrence:validate                    print the table
//   npm run occurrence:validate -- --json          print it as JSON
//   npm run occurrence:validate -- --write-failed  rewrite tests/fixtures/occurrence/failed-legs.json
//   npm run occurrence:validate -- --write-results rewrite tests/fixtures/occurrence/results.json
//   npm run occurrence:validate -- --only=A,B1     run the rows whose id starts with one of these
//   npm run occurrence:validate -- --workers=2     processes for the injection and coverage (default 2)
//
// tests/fixtures/occurrence/thresholds.json fixed every bound before any occurrence code existed; the
// oracle (tools/occurrence-oracle/oracle.py: numpy, scipy and batman, no Gravitas code) pinned its
// results in oracle-results.json before the kernel was judged. A crossed bound is a failed row, left
// failing in failed-legs.json; a leg whose data was never supplied is NOT RUN and says so.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CADENCE,
  THRESHOLD,
  PERIOD_EDGES,
  RADIUS_EDGES,
  analyticEfficiency,
  efficiencyAt,
  epochCount,
  finishInjection,
  geometricProbability,
  injectionRun,
  makeStars,
  rateOf,
  recover,
  recoverByPoints,
  redFactor,
  signalToNoise,
  simulatePopulation,
  singleBin,
  starsFrom,
  startInjection,
  stepInjection,
  transitSignal,
  truthRates,
  occurrenceGrid,
} from '../js/kernels/occurrence/index.js';
import { poissonInterval } from '../js/kernels/statistics/intervals.js';
import { normalCdf } from '../js/kernels/statistics/special.js';
import { stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/occurrence';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${DIR}/thresholds.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const NP = PERIOD_EDGES.length - 1;
const NR = RADIUS_EDGES.length - 1;
const FALSE_FRACTION =
  THR.systems.reliability.stated_false_fraction_by_period_bin;
const RELIABILITY = FALSE_FRACTION.map(f => 1 - f);
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const argValue = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const only = argValue('only', '').split(',').filter(Boolean);
const wanted = id => !only.length || only.some(p => id.startsWith(p));
const wantAny = ids => ids.some(wanted);
const WORKERS = Number(argValue('workers', '2'));
const ORACLE = () => read(`${DIR}/oracle-results.json`);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- injection in worker processes ---------------------------------------------------------------

function starsOf(spec) {
  if (spec.kind === 'oracle') {
    const o = ORACLE().stars;
    return starsFrom({ radius: o.Rs, sigma: o.sigma, span: o.span });
  }
  return makeStars({ seed: spec.seed, n: spec.n });
}

/** The raw arrays of a run over a range of stars, for the parent to sum. */
function jobRun(job) {
  const stars = starsOf(job.stars);
  const run = startInjection({
    stars,
    seed: job.seed,
    trials: job.trials,
    rho: job.rho ?? 0,
    range: job.range,
    only: job.only ?? null,
  });
  while (run.next < run.end) stepInjection(run, 50);
  return {
    E: Array.from(run.E),
    G: Array.from(run.G),
    E2: Array.from(run.E2),
    recovered: Array.from(run.recovered),
    injected: Array.from(run.injected),
    skipped: run.skipped,
    cn: Array.from(run.curve.n),
    ck: Array.from(run.curve.k),
  };
}

function runChild(job) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), `--job=${JSON.stringify(job)}`],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let out = '';
    child.stdout.on('data', d => (out += d));
    child.on('error', reject);
    child.on('close', code =>
      code === 0
        ? resolve(JSON.parse(out))
        : reject(new Error(`injection child exited ${code}`))
    );
  });
}

/** An injection run split over worker processes and summed. */
async function parallelInjection({
  stars: spec,
  seed,
  trials,
  rho = 0,
  only: bins = null,
}) {
  const stars = starsOf(spec);
  const cuts = Array.from({ length: WORKERS + 1 }, (_, i) =>
    Math.round((i * stars.n) / WORKERS)
  );
  const parts = await Promise.all(
    Array.from({ length: WORKERS }, (_, w) =>
      runChild({
        stars: spec,
        seed,
        trials,
        rho,
        only: bins,
        range: [cuts[w], cuts[w + 1]],
      })
    )
  );
  const sum = key =>
    parts.reduce(
      (a, p) => a.map((x, i) => x + p[key][i]),
      parts[0][key].map(() => 0)
    );
  const run = {
    stars,
    trials,
    rho,
    threshold: THRESHOLD,
    E: Float64Array.from(sum('E')),
    G: Float64Array.from(sum('G')),
    E2: Float64Array.from(sum('E2')),
    recovered: Int32Array.from(sum('recovered')),
    injected: Int32Array.from(sum('injected')),
    skipped: parts.reduce((a, p) => a + p.skipped, 0),
    curve: { n: Int32Array.from(sum('cn')), k: Int32Array.from(sum('ck')) },
    c: new Float32Array(0),
  };
  return finishInjection(run);
}

if (args.some(a => a.startsWith('--job='))) {
  const job = JSON.parse(args.find(a => a.startsWith('--job=')).slice(6));
  process.stdout.write(JSON.stringify(jobRun(job)));
  process.exit(0);
}

// ---- A: analytic -----------------------------------------------------------------------------------

function legA() {
  const O = ORACLE();
  if (wanted('A1')) {
    let worst = 0;
    for (const c of O.A1)
      worst = Math.max(
        worst,
        rel(geometricProbability(c.P, { radius: c.Rs, mass: c.Ms }), c.pgeo)
      );
    row('A1', worst <= lim('A1').relative, {
      cases: O.A1.length,
      worstRelative: worst,
    });
  }
  if (wanted('A2')) {
    let bad = 0;
    for (const c of O.A2) if (epochCount(c.P, c.span, c.t0) !== c.N) bad++;
    const draw = stream('forward', 'A2-mean');
    const means = [];
    let worst = 0;
    for (const [P, span] of [
      [7.3, 365],
      [50, 1460],
      [200, 90],
    ]) {
      let s = 0;
      for (let i = 0; i < 20000; i++) s += epochCount(P, span, draw() * P);
      const m = s / 20000;
      means.push(sig(m));
      worst = Math.max(worst, rel(m, span / P));
    }
    row('A2', bad === 0 && worst <= lim('A2').meanRelative, {
      mismatches: bad,
      cases: O.A2.length,
      means,
      worstMeanRelative: worst,
    });
  }
  if (wanted('A3')) {
    let worst = 0;
    for (const c of O.A3) {
      const star = { radius: c.Rs, mass: c.Ms, sigma: c.sigma, span: c.span };
      const s = transitSignal(
        { P: c.P, radiusEarth: c.Re, b: c.b },
        star,
        c.t0
      );
      if (s.N !== c.N) worst = Infinity;
      worst = Math.max(worst, rel(signalToNoise(s, star), c.S));
    }
    row('A3', worst <= lim('A3').relative, {
      cases: O.A3.length,
      worstRelative: worst,
    });
  }
  if (wanted('A4')) {
    const star0 = { radius: 1, mass: 1, sigma: 1e-4, span: 1460 };
    const planet = { P: 40, radiusEarth: 3, b: 0.3 };
    const sg = transitSignal(planet, star0, 0.37 * 40);
    const out = [];
    let worst = 0;
    O.A4.offsets.forEach((d, i) => {
      const star = { ...star0, sigma: Math.sqrt(sg.s2) / (THRESHOLD + d) };
      const draw = stream('noise', `A4:${d}`);
      let k = 0;
      for (let t = 0; t < 4000; t++) if (recover(sg, star, draw).detected) k++;
      const p = k / 4000;
      out.push(sig(p));
      worst = Math.max(
        worst,
        Math.abs(p - O.A4.phi[i]),
        Math.abs(p - analyticEfficiency(THRESHOLD + d))
      );
    });
    row('A4', worst <= lim('A4').absolute, {
      p: out,
      N: sg.N,
      worstAbsolute: worst,
    });
  }
  if (wanted('A5')) {
    const planet = { P: 80, radiusEarth: 3, b: 0.2 };
    const star0 = { radius: 1, mass: 1, sigma: 1e-4, span: 1460 };
    const sg = transitSignal(planet, star0, 0.4 * 80, { keepShapes: true });
    const out = [];
    let worst = 0;
    for (const d of [-1.5, -0.5, 0.5, 1.5]) {
      const star = { ...star0, sigma: Math.sqrt(sg.s2) / (THRESHOLD + d) };
      const a = stream('noise', `A5a:${d}`);
      const b = stream('noise', `A5b:${d}`);
      let ka = 0;
      let kb = 0;
      for (let t = 0; t < 2000; t++) {
        if (recover(sg, star, a).detected) ka++;
        if (recoverByPoints(sg, star, b).detected) kb++;
      }
      out.push([sig(ka / 2000), sig(kb / 2000)]);
      worst = Math.max(worst, Math.abs(ka - kb) / 2000);
    }
    row('A5', worst <= lim('A5').absolute, {
      N: sg.N,
      used: sg.used,
      pairs: out,
      worstAbsolute: worst,
    });
  }
  if (wanted('A6')) {
    const rho = O.A6[0].rho;
    const out = [];
    let worstRel = 0;
    let worstAbs = 0;
    O.A6.forEach((c, n) => {
      const star = { radius: c.Rs, mass: c.Ms, sigma: 1e-4, span: 0 };
      const t0 = 100.5 * CADENCE;
      // one epoch: the oracle's closed form for this shape
      const one = transitSignal(
        { P: c.P, radiusEarth: c.Re, b: c.b },
        { ...star, span: t0 + c.P / 2 },
        t0,
        { keepShapes: true }
      );
      const closed = redFactor(one, rho);
      // three epochs: the closed form against the std of point-by-point draws
      const sg = transitSignal(
        { P: c.P, radiusEarth: c.Re, b: c.b },
        { ...star, span: t0 + 2.5 * c.P },
        t0,
        { keepShapes: true }
      );
      const sEff = redFactor(sg, rho);
      const S = Math.sqrt(sg.s2) / 1e-4;
      const draw = stream('noise', `A6:${n}`);
      let s1 = 0;
      let s2 = 0;
      const M = 20000;
      for (let t = 0; t < M; t++) {
        const e =
          recoverByPoints(sg, { sigma: 1e-4 }, draw, { rho }).statistic - S;
        s1 += e;
        s2 += e * e;
      }
      const std = Math.sqrt(s2 / M - (s1 / M) ** 2);
      // efficiency at S = threshold + 1 by the reduced draw
      const starE = { sigma: Math.sqrt(sg.s2) / (THRESHOLD + 1) };
      const dr = stream('noise', `A6e:${n}`);
      let k = 0;
      for (let t = 0; t < M; t++)
        if (recover(sg, starE, dr, { rho }).detected) k++;
      const p = k / M;
      worstRel = Math.max(worstRel, rel(closed, c.sEff), rel(std, sEff));
      worstAbs = Math.max(worstAbs, Math.abs(p - normalCdf(1 / sEff)));
      out.push({
        closedOneEpoch: sig(closed),
        oracle: c.sEff,
        threeEpochStd: sig(std),
        threeEpochClosed: sig(sEff),
        efficiency: sig(p),
        expected: sig(normalCdf(1 / sEff)),
      });
    });
    row(
      'A6',
      worstRel <= lim('A6').relative && worstAbs <= lim('A6').absolute,
      { cases: out, worstRelative: worstRel, worstAbsolute: worstAbs }
    );
  }
  if (wanted('A7')) {
    let worst = 0;
    for (const c of O.A7) {
      const r = rateOf({
        n: c.n,
        completeness: 37.5,
        reliability: 0.9,
        level: c.level,
      });
      worst = Math.max(
        worst,
        rel(r.rate, c.rate),
        rel(r.lo, c.lo),
        rel(r.hi, c.hi)
      );
    }
    row('A7', worst <= lim('A7').relative, {
      cases: O.A7.length,
      worstRelative: worst,
    });
  }
}

// ---- A8: a single bin above one per star -----------------------------------------------------------

async function legA8() {
  if (!wanted('A8')) return;
  const spec = { kind: 'make', seed: 'occ-229-A8', n: 2000 };
  const stars = starsOf(spec);
  const [pj, rk] = [PERIOD_EDGES.indexOf(2), RADIUS_EDGES.indexOf(2)];
  const inj = await parallelInjection({
    stars: spec,
    seed: 'occ-229-A8',
    trials: 8,
    only: [pj * NR + rk],
  });
  const E = inj.E[pj][rk];
  const rates = singleBin(pj, rk, THR.systems.truth.dense_single_bin.rate);
  const est = [];
  for (let p = 0; p < 100; p++) {
    const pop = simulatePopulation({
      stars,
      rates,
      reliability: 1,
      completeness: inj.E,
      seed: `occ-229-A8:${p}`,
    });
    est.push((pop.listed[pj][rk] * 1) / E);
  }
  const mean = est.reduce((a, b) => a + b, 0) / est.length;
  row('A8', rel(mean, 1.5) <= lim('A8').meanRelative && est.every(x => x > 1), {
    E: sig(E),
    mean: sig(mean),
    min: sig(Math.min(...est)),
    max: sig(Math.max(...est)),
  });
}

// ---- B: the oracle's population -------------------------------------------------------------------

async function legB() {
  if (!wantAny(['B1', 'B2', 'B3', 'B4'])) return;
  const O = ORACLE();
  const inj = await parallelInjection({
    stars: { kind: 'oracle' },
    seed: 'occ-229-B',
    trials: THR.systems.injection.gate.trials_per_star_and_bin,
  });
  const out = { E: inj.E };
  if (wanted('B1')) {
    let worstRich = 0;
    let worstSparse = 0;
    let nRich = 0;
    let nSparse = 0;
    for (let j = 0; j < NP; j++)
      for (let k = 0; k < NR; k++) {
        const eo = O.E[j][k];
        const d = rel(inj.E[j][k], eo);
        if (eo >= 20) {
          nRich++;
          worstRich = Math.max(worstRich, d);
        } else if (eo >= 3) {
          nSparse++;
          worstSparse = Math.max(worstSparse, d);
        }
      }
    row('B1', worstRich <= lim('B1').rich && worstSparse <= lim('B1').sparse, {
      richBins: nRich,
      worstRich,
      sparseBins: nSparse,
      worstSparse,
      skipped: inj.skipped,
    });
  }
  const truth = O.truth;
  const listed = O.detections.listed;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let n2 = 0;
  let n3 = 0;
  for (let j = 0; j < NP; j++)
    for (let k = 0; k < NR; k++) {
      const n = listed[j][k];
      const f = FALSE_FRACTION[j];
      const r = rateOf({ n, completeness: inj.E[j][k], reliability: 1 - f });
      const o = O.rates.find(x => x.j === j && x.k === k);
      if (n >= 5 && r.status === 'ok') {
        n2++;
        b2 = Math.max(b2, rel(r.rate, o.rate));
        b4 = Math.max(b4, rel(r.lo, o.lo), rel(r.hi, o.hi));
      }
      const expected = (truth[j][k] * O.E[j][k]) / (1 - f);
      if (expected >= 10 && r.status === 'ok') {
        n3++;
        const half = Math.max(r.rate - r.lo, r.hi - r.rate);
        b3 = Math.max(b3, Math.abs(r.rate - truth[j][k]) / half);
      }
    }
  if (wanted('B2'))
    row('B2', b2 <= lim('B2').relative, { bins: n2, worstRelative: b2 });
  if (wanted('B3'))
    row('B3', b3 <= lim('B3').sigmas, { bins: n3, worstSigmas: b3 });
  if (wanted('B4'))
    row('B4', b4 <= lim('B4').relative, { bins: n2, worstRelative: b4 });
  return out;
}

/** The stored survey the lesson panels read: the ensemble's completeness, geometric sums and efficiency curve. */
function writeSurvey(inj, spec) {
  const r = (x, d = 6) =>
    x === null || !Number.isFinite(x) ? x : Number(x.toPrecision(d));
  const survey = {
    seed: spec.seed,
    stars: spec.n,
    injectionSeed: THR.seeds.ensemble,
    trials: inj.trials,
    threshold: inj.threshold,
    skipped: inj.skipped,
    injected: inj.injected,
    E: inj.E.map(row => row.map(x => r(x))),
    G: inj.G.map(row => row.map(x => r(x))),
    se: inj.se.map(row => row.map(x => r(x, 3))),
    efficiency: inj.efficiency.map(row => row.map(x => r(x, 4))),
    curve: inj.curve
      .filter(c => c.n > 0)
      .map(c => ({
        lo: c.lo,
        hi: c.hi === Infinity ? null : c.hi,
        n: c.n,
        recovered: c.recovered,
        p: r(c.p, 4),
        low: r(c.low, 4),
        high: r(c.high, 4),
      })),
  };
  writeFileSync(
    path.join(ROOT, 'js/data/occurrenceSurvey.js'),
    `// GENERATED by tools/occurrence-validate.mjs --write-survey from the coverage ensemble's injection run on the\n// synthetic survey of tests/fixtures/occurrence/thresholds.json; do not edit. The completeness of 2000 synthetic\n// stars in 40 bins of period and radius, measured by injection and recovery (OCCURRENCE_RATES.md).\nexport const SURVEY = ${JSON.stringify(survey)};\n`
  );
  // A generated file must be a Prettier fixed point.
  execFileSync(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/prettier/bin/prettier.cjs'),
      '--write',
      path.join(ROOT, 'js/data/occurrenceSurvey.js'),
    ],
    { stdio: 'ignore' }
  );
}

// ---- C: coverage ----------------------------------------------------------------------------------

async function legC() {
  if (!wantAny(['C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'])) return;
  const spec = {
    kind: 'make',
    seed: THR.seeds.survey,
    n: THR.ensembles.coverage.stars,
  };
  const stars = starsOf(spec);
  const inj = await parallelInjection({
    stars: spec,
    seed: THR.seeds.ensemble,
    trials: THR.systems.injection.ensemble.trials_per_star_and_bin,
  });
  const G = truthRates();
  const E = inj.E;
  if (flag('--write-survey')) writeSurvey(inj, spec);
  const P = THR.ensembles.coverage.populations;
  const hit = { 0.6827: [], 0.95: [] };
  for (const lv of [0.6827, 0.95])
    hit[lv] = Array.from({ length: NP }, () => new Array(NR).fill(0));
  const hitMisstated = Array.from({ length: NP }, () => new Array(NR).fill(0));
  const sum = Array.from({ length: NP }, () => new Array(NR).fill(0));
  const sum2 = Array.from({ length: NP }, () => new Array(NR).fill(0));
  let firstListed = null;
  for (let p = 0; p < P; p++) {
    const pop = simulatePopulation({
      stars,
      rates: G,
      reliability: RELIABILITY,
      completeness: E,
      seed: `${THR.seeds.ensemble}:${p}`,
    });
    if (p === 0) firstListed = pop.listed;
    for (let j = 0; j < NP; j++)
      for (let k = 0; k < NR; k++) {
        if (E[j][k] < 5) continue;
        const n = pop.listed[j][k];
        for (const lv of [0.6827, 0.95]) {
          const iv = poissonInterval([n], {
            exposure: E[j][k] / RELIABILITY[j],
            level: lv,
          });
          if (G[j][k] >= iv.lo && G[j][k] <= iv.hi) hit[lv][j][k]++;
        }
        const mis = poissonInterval([n], { exposure: E[j][k], level: 0.6827 });
        if (G[j][k] >= mis.lo && G[j][k] <= mis.hi) hitMisstated[j][k]++;
        const g = (n * RELIABILITY[j]) / E[j][k];
        sum[j][k] += g;
        sum2[j][k] += g * g;
      }
  }
  const rich = [];
  const sparse = [];
  const per = [];
  for (let j = 0; j < NP; j++)
    for (let k = 0; k < NR; k++) {
      if (E[j][k] < 5) continue;
      const expected = (G[j][k] * E[j][k]) / RELIABILITY[j];
      const cell = {
        j,
        k,
        expected: sig(expected),
        c68: hit[0.6827][j][k] / P,
        c95: hit[0.95][j][k] / P,
        missA: hitMisstated[j][k] / P,
      };
      const mean = sum[j][k] / P;
      const sd = Math.sqrt(Math.max(0, sum2[j][k] / P - mean * mean));
      cell.meanSigmas = sd > 0 ? (mean - G[j][k]) / (sd / Math.sqrt(P)) : 0;
      per.push(cell);
      if (expected >= 10) rich.push(cell);
      else if (expected >= 1) sparse.push(cell);
    }
  const pooled = (cells, key) =>
    cells.reduce((a, c) => a + c[key], 0) / Math.max(1, cells.length);
  if (wanted('C1')) {
    const worst = Math.min(...rich.map(c => c.c68));
    row('C1', worst >= lim('C1').perBinMin, {
      richBins: rich.length,
      worstCoverage: worst,
      populations: P,
    });
  }
  if (wanted('C2')) {
    const p68 = pooled(rich, 'c68');
    const p95 = pooled(rich, 'c95');
    const L = lim('C2');
    row(
      'C2',
      p68 >= L.pooled6827[0] &&
        p68 <= L.pooled6827[1] &&
        p95 >= L.pooled95[0] &&
        p95 <= L.pooled95[1],
      { pooled6827: sig(p68), pooled95: sig(p95), richBins: rich.length }
    );
  }
  if (wanted('C3')) {
    const worst = sparse.length ? Math.min(...sparse.map(c => c.c68)) : null;
    row('C3', worst === null || worst >= lim('C3').perBinMin, {
      sparseBins: sparse.length,
      worstCoverage: worst,
      bins: sparse.map(c => [c.j, c.k, c.expected, c.c68]),
    });
  }
  if (wanted('C4')) {
    const worst = Math.max(...rich.map(c => Math.abs(c.meanSigmas)));
    row('C4', worst <= lim('C4').sigmasOfMean, {
      richBins: rich.length,
      worstSigmasOfMean: worst,
    });
  }
  if (wanted('D2')) {
    const low = [];
    for (let j = 0; j < NP; j++)
      for (let k = 0; k < NR; k++) if (E[j][k] < 5) low.push([j, k]);
    const grid = occurrenceGrid({
      counts: firstListed,
      E,
      reliability: RELIABILITY,
    });
    const bad = low.filter(
      ([j, k]) =>
        grid[j][k].status !== 'not-constrained' ||
        'rate' in grid[j][k] ||
        'upperLimit' in grid[j][k]
    );
    row('D2', low.length > 0 && bad.length === 0, {
      bins: low.length,
      wrong: bad.length,
      E: low.map(([j, k]) => sig(E[j][k])),
    });
  }
  if (wanted('D4')) {
    // As committed: the rich bins of the high-period bins (j >= 5). None exists in this survey (the expected
    // listings there are below 10), so the leg is unmeasurable and fails on that (rule 7.5 item 4).
    const high = per.filter(c => c.j >= 5 && c.expected >= 10);
    const r = rateOf({ n: 20, completeness: 40, reliability: 1 });
    if (!high.length)
      row(
        'D4',
        false,
        { bins: 0, pooledCoverageMisstated: null },
        'unmeasurable as committed: no bin at 32 d or more holds 10 expected listings; amendment AM1 measures it as D4b'
      );
    else {
      const pooledMis = pooled(high, 'missA');
      row(
        'D4',
        pooledMis < lim('D4').pooledBelow && r.reliability === 1,
        {
          bins: high.length,
          pooledCoverageMisstated: sig(pooledMis),
          pooledCoverageStated: sig(pooled(high, 'c68')),
        },
        'a demonstration of the reliability term, kept as measured'
      );
    }
    // AM1 (after the first run found D4 unmeasurable): the same demonstration over the bins at 32 d or more that
    // are not under the floor and expect at least 3 listings. The bound (0.5) is unchanged.
    const sparseHigh = per.filter(c => c.j >= 5 && c.expected >= 3);
    const pm = pooled(sparseHigh, 'missA');
    row(
      'D4b',
      sparseHigh.length > 0 &&
        pm < lim('D4').pooledBelow &&
        r.reliability === 1,
      {
        bins: sparseHigh.length,
        pooledCoverageMisstated: sig(pm),
        pooledCoverageStated: sig(pooled(sparseHigh, 'c68')),
      },
      'AM1: D4 as committed was unmeasurable; same bound, bins with at least 3 expected listings'
    );
  }
}

// ---- D and R ---------------------------------------------------------------------------------------

function legD() {
  if (wanted('D1')) {
    const r = rateOf({ n: 0, completeness: 37.5, reliability: 0.9 });
    const ok =
      r.status === 'upper-limit' &&
      !('rate' in r) &&
      rel(r.upperLimit, -Math.log(0.05) / 37.5) <= lim('D1').relative;
    row('D1', ok, { status: r.status, upperLimit: r.upperLimit });
  }
  if (wanted('D3')) {
    const codes = [
      rateOf({ n: 3, completeness: 40 }).code,
      rateOf({ n: 2.5, completeness: 40, reliability: 0.9 }).code,
      rateOf({ n: 3, completeness: 40, reliability: 1.2 }).code,
    ];
    const stars = makeStars({ seed: 'D3', n: 20 });
    const res = injectionRun({ stars, seed: 'D3', trials: 1 });
    codes.push(efficiencyAt(res, 400).code);
    row('D3', JSON.stringify(codes) === JSON.stringify(lim('D3').codes), {
      codes,
    });
  }
  if (wanted('R1')) {
    const stars = makeStars({ seed: 'R1', n: 30 });
    const a = injectionRun({ stars, seed: 'R1', trials: 2 });
    const b = injectionRun({ stars, seed: 'R1', trials: 2 });
    const c = injectionRun({ stars, seed: 'R1b', trials: 2 });
    const same =
      JSON.stringify(a.E) === JSON.stringify(b.E) &&
      JSON.stringify(a.curve) === JSON.stringify(b.curve);
    const diff = JSON.stringify(a.E) !== JSON.stringify(c.E);
    const E = a.E;
    const p1 = simulatePopulation({
      stars,
      rates: truthRates(),
      reliability: RELIABILITY,
      completeness: E,
      seed: 'R1',
    });
    const p2 = simulatePopulation({
      stars,
      rates: truthRates(),
      reliability: RELIABILITY,
      completeness: E,
      seed: 'R1',
    });
    const p3 = simulatePopulation({
      stars,
      rates: truthRates(),
      reliability: RELIABILITY,
      completeness: E,
      seed: 'R1b',
    });
    const popSame = JSON.stringify(p1.listed) === JSON.stringify(p2.listed);
    const popDiff = JSON.stringify(p1.listed) !== JSON.stringify(p3.listed);
    row('R1', same && diff && popSame && popDiff, {
      injectionSame: same,
      injectionDiffers: diff,
      populationSame: popSame,
      populationDiffers: popDiff,
    });
  }
  if (wanted('E1'))
    notRun(
      'E1',
      'no authentic survey was supplied: needs a real stellar sample with its noise and span, a published injection-recovery completeness, its candidate list and a published occurrence calculation, each with a rights row'
    );
}

// ---- run -------------------------------------------------------------------------------------------

legA();
await legA8();
await legB();
await legC();
legD();

const order = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'B1',
  'B2',
  'B3',
  'B4',
  'C1',
  'C2',
  'C3',
  'C4',
  'D1',
  'D2',
  'D3',
  'D4',
  'D4b',
  'R1',
  'E1',
];
rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

function verdictOf() {
  const st = id => rows.find(r => r.id === id)?.status;
  const legs = [
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6',
    'A7',
    'A8',
    'B1',
    'B2',
    'B3',
    'B4',
    'C1',
    'C2',
    'C3',
    'C4',
    'D1',
    'D2',
    'D3',
    'R1',
  ];
  if (!legs.every(l => st(l))) return 'incomplete (not every leg was run)';
  if (['B1', 'B2', 'B4', 'C1', 'C2', 'C4'].some(l => st(l) === 'fail'))
    return 'C';
  const others = [
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6',
    'A7',
    'A8',
    'B3',
    'D1',
    'D2',
    'D3',
    'R1',
  ];
  if (others.some(l => st(l) === 'fail'))
    return 'C (an analytic, recovery or negative leg failed)';
  return st('C3') === 'fail' ? 'B' : 'A';
}
const verdict = verdictOf();

if (flag('--json')) console.log(JSON.stringify({ verdict, rows }, null, 2));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${r.id.padEnd(4)} ${JSON.stringify(r.measured)}${r.note ? ` (${r.note})` : ''}`
    );
  console.log(`verdict: ${verdict}`);
}
const failed = rows.filter(r => r.status === 'fail');
if (flag('--write-failed'))
  writeFileSync(
    path.join(ROOT, DIR, 'failed-legs.json'),
    JSON.stringify(
      {
        note: 'Legs of tests/fixtures/occurrence/thresholds.json that crossed their bound, kept failing. Only Carl resets a bound.',
        failed: failed.map(f => ({
          id: f.id,
          status: f.status,
          measured: f.measured,
          note: f.note,
        })),
      },
      null,
      2
    ) + '\n'
  );
if (flag('--write-results'))
  writeFileSync(
    path.join(ROOT, DIR, 'results.json'),
    JSON.stringify({ verdict, rows }, null, 2) + '\n'
  );
process.exit(failed.length ? 1 : 0);
