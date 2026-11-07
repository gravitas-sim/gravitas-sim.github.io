#!/usr/bin/env node
// =============================================================================
// SPIKE, never merged: the clustering gate's stream (Prompt 263 Part B)
// -----------------------------------------------------------------------------
//   node tools/clustering-validate.mjs [--json] [--write-results] [--only=B2,B4]
// Reads tests/fixtures/crossmatch/clustering-thresholds.json (every bound was
// committed before this file existed) and the oracle's pinned output
// (tests/fixtures/crossmatch/oracle-results.json, O4). Node, not Jest.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as C from '../js/kernels/crossmatch/clustering.js';
import {
  separationArcsec,
  unitVectors,
} from '../js/kernels/crossmatch/geometry.js';
import { chi2Quantile, chi2Sf } from '../js/kernels/statistics/special.js';
import { stream, gaussian } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK as SLICE } from '../js/data/observations/sdssDr18RedshiftSlice.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/crossmatch';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${DIR}/clustering-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const O4 = ORACLE.O4;
const BINS = [0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28];
const SBINS = [2, 3, 4.5, 7, 10, 14, 20];
const ARC = Math.PI / 648000;
const RHO_P = 5;
const SIG_C = 0.1;

const check = id => THR.checks.find(c => c.id === id);
const rows = [];
const add = (id, status, measured, note = null) =>
  rows.push({ id, status, measured, bound: check(id)?.limits ?? null, note });
const bound = (id, ok, measured, note) =>
  add(id, ok ? 'pass' : 'fail', measured, note);

// ---- geometry of the worlds --------------------------------------------------

/** Tangent-plane offsets in arcsec (x east, y north) about (ra0, dec0) to (ra, dec). */
function planeToSky(x, y, ra0, dec0) {
  const X_ = x * ARC;
  const Y_ = y * ARC;
  const a0 = (ra0 * Math.PI) / 180;
  const d0 = (dec0 * Math.PI) / 180;
  const rho = Math.hypot(X_, Y_);
  const c = Math.atan(rho);
  const sd =
    Math.cos(c) * Math.sin(d0) +
    (rho > 0 ? (Y_ * Math.sin(c) * Math.cos(d0)) / rho : 0);
  const ra =
    a0 +
    Math.atan2(
      X_ * Math.sin(c),
      rho * Math.cos(d0) * Math.cos(c) - Y_ * Math.sin(d0) * Math.sin(c)
    );
  return [
    ((((ra * 180) / Math.PI) % 360) + 360) % 360,
    (Math.asin(Math.max(-1, Math.min(1, sd))) * 180) / Math.PI,
  ];
}

/** Forward gnomonic projection about (150, 0): (x, y) in degrees. */
function skyToPlane(ra, dec) {
  const a = ((ra - 150) * Math.PI) / 180;
  const d = (dec * Math.PI) / 180;
  const cc = Math.cos(d) * Math.cos(a);
  return [
    ((Math.cos(d) * Math.sin(a)) / cc) * (180 / Math.PI),
    (Math.sin(d) / cc) * (180 / Math.PI),
  ];
}

const poisson = (mean, u) => {
  const L = Math.exp(-mean);
  let k = 0;
  let p = L;
  let s = L;
  const x = u();
  while (x > s && k < 2000) {
    k++;
    p *= mean / k;
    s += p;
  }
  return k;
};

const toVectors = pts => {
  const ra = [];
  const dec = [];
  for (const [x, y] of pts) {
    const [r, d] = planeToSky(x * 3600, y * 3600, 150, 0);
    ra.push(r);
    dec.push(d);
  }
  return { ra, dec, U: C.vectors(ra, dec) };
};

const nullWorld = (leg, i, N = 1000) => {
  const u = stream('noise', 'p263', leg, i);
  return toVectors(Array.from({ length: N }, () => [4 * u() - 2, 4 * u() - 2]));
};

const thomasWorld = (leg, i, m) => {
  const u = stream('noise', 'p263', leg, i);
  const g = gaussian(u);
  const pts = [];
  const npar = poisson(RHO_P * 25, u);
  for (let p = 0; p < npar; p++) {
    const px = 5 * u() - 2.5;
    const py = 5 * u() - 2.5;
    const k = poisson(m, u);
    for (let j = 0; j < k; j++) {
      const x = px + SIG_C * g();
      const y = py + SIG_C * g();
      if (Math.abs(x) <= 2 && Math.abs(y) <= 2) pts.push([x, y]);
    }
  }
  return toVectors(pts);
};

const randomsBox = (key, n) => {
  const u = stream('injection', 'p263', 'B:randoms', key);
  const pts = Array.from({ length: n }, () => [4 * u() - 2, 4 * u() - 2]);
  return { ...toVectors(pts), pts };
};

const wExact = BINS.slice(0, -1).map((a, k) => {
  const b = BINS[k + 1];
  return (
    (Math.exp(-(a * a) / (4 * SIG_C * SIG_C)) -
      Math.exp(-(b * b) / (4 * SIG_C * SIG_C))) /
    (Math.PI * RHO_P * (b * b - a * a))
  );
});

/** The full Landy-Szalay result of data vectors against randoms. */
function ls(D, R, edges = BINS) {
  const DD = C.pairCounts(D, null, edges);
  const DR = C.pairCounts(D, R, edges);
  const RR = C.pairCounts(R, null, edges);
  const nD = D.length / 3;
  const nR = R.length / 3;
  const w = C.landySzalay({ DD, DR, RR, nD, nR });
  const sigma = C.poissonSigma(w, DD);
  return { DD, DR, RR, w, sigma, ...C.statisticT(w, sigma, DD) };
}

const detected = r => r.df > 0 && r.T > chi2Quantile(0.99, r.df);

// ---- the legs ----------------------------------------------------------------

function legB1() {
  // brute force, exact, on 300 random points of the sphere
  const u = stream('noise', 'p263', 'B1', 0);
  const ra = Array.from({ length: 300 }, () => 360 * u());
  const dec = Array.from(
    { length: 300 },
    () => (Math.asin(2 * u() - 1) * 180) / Math.PI
  );
  const U = C.vectors(ra, dec);
  const edges = [5, 10, 20, 40];
  const got = C.pairCounts(U, null, edges);
  const brute = new Array(3).fill(0);
  const V = unitVectors(ra, dec);
  for (let i = 0; i < 300; i++)
    for (let j = i + 1; j < 300; j++) {
      const t = separationArcsec(V, i, V, j) / 3600;
      for (let k = 0; k < 3; k++)
        if (t >= edges[k] && t < edges[k + 1]) brute[k]++;
    }
  const exact = brute.every((v, k) => v === got[k]);
  // the oracle's counts
  const d1 = C.vectors(O4.data.ra, O4.data.dec);
  const g1 = C.pairCounts(d1, null, BINS);
  const sl = O4.strip;
  const slice = readFileSync(
    path.join(ROOT, 'cosmology/sdss-dr18-redshift-slice.json'),
    'utf8'
  );
  const raS = tableOf({ PACK: SLICE, SERIES: JSON.parse(slice) }).columns.find(
    c => c.id === 'ra'
  ).values;
  const g2 = C.pairCounts(
    C.vectors(raS, new Array(raS.length).fill(0.25)),
    null,
    SBINS
  );
  const okOr = (a, o) =>
    a.every((v, k) => Math.abs(v - o[k]) <= Math.max(2, 1e-4 * o[k]));
  const t1 = okOr(Array.from(g1), O4.DD);
  const t2 = okOr(Array.from(g2), sl.DD);
  bound('B1.pairCounts', exact && t1 && t2, {
    bruteForce: { got: Array.from(got), brute },
    thomasMaxDiff: Math.max(
      ...Array.from(g1, (v, k) => Math.abs(v - O4.DD[k]))
    ),
    stripMaxDiff: Math.max(...Array.from(g2, (v, k) => Math.abs(v - sl.DD[k]))),
  });
  return { raS };
}

function legB2B3B4() {
  // B2 and B2b
  const W = 200;
  const q = chi2Quantile(0.99, 6);
  let fp = 0;
  const sums = new Array(6).fill(0);
  const sq = new Array(6).fill(0);
  for (let i = 0; i < W; i++) {
    const d = nullWorld('B2', i);
    const r = randomsBox(`B2:${i}`, 10000);
    const res = ls(d.U, r.U);
    if (detected(res)) fp++;
    res.w.forEach((v, k) => {
      sums[k] += v;
      sq[k] += v * v;
    });
  }
  const meanW = sums.map(s => s / W);
  const se = sq.map((s, k) =>
    Math.sqrt(Math.max(0, s / W - meanW[k] ** 2) / (W - 1))
  );
  bound(
    'B2.null',
    fp / W <= check('B2.null').limits.maxFalsePositive,
    fp / W,
    `${W} worlds; calibrated would be 0.01; chi2(6) 0.99 quantile ${q.toFixed(3)}`
  );
  const ok2b = meanW.every((m, k) => Math.abs(m) <= 3 * se[k] + 0.003);
  bound('B2b.nullBias', ok2b, {
    meanW: meanW.map(v => Number(v.toFixed(5))),
    se: se.map(v => Number(v.toFixed(5))),
  });
  // B3
  const M = 100;
  const s3 = new Array(6).fill(0);
  const q3 = new Array(6).fill(0);
  let nTot = 0;
  for (let i = 0; i < M; i++) {
    const d = thomasWorld('B3', i, 12.5);
    nTot += d.ra.length;
    const r = randomsBox(`B3:${i}`, 10 * d.ra.length);
    const res = ls(d.U, r.U);
    res.w.forEach((v, k) => {
      s3[k] += v;
      q3[k] += v * v;
    });
  }
  const mean3 = s3.map(s => s / M);
  const se3 = q3.map((s, k) =>
    Math.sqrt(Math.max(0, s / M - mean3[k] ** 2) / (M - 1))
  );
  const ok3 = mean3.every(
    (m, k) =>
      Math.abs(m - wExact[k]) <= Math.max(0.03, 0.1 * wExact[k]) + 3 * se3[k]
  );
  bound('B3.thomas', ok3, {
    meanN: nTot / M,
    mean: mean3.map(v => Number(v.toFixed(4))),
    exact: wExact.map(v => Number(v.toFixed(4))),
    se: se3.map(v => Number(v.toFixed(4))),
  });
  // B4
  const rates = {};
  for (const m of [1.25, 2.5, 5, 10, 20]) {
    let hit = 0;
    let n = 0;
    for (let i = 0; i < 100; i++) {
      const d = thomasWorld(`B4:${m}`, i, m);
      n += d.ra.length;
      const r = randomsBox(`B4:${m}:${i}`, 10 * d.ra.length);
      if (detected(ls(d.U, r.U))) hit++;
    }
    rates[80 * m] = { meanN: n / 100, rate: hit / 100 };
  }
  const nmin = Object.keys(rates)
    .map(Number)
    .find(n => rates[n].rate >= 0.9);
  bound(
    'B4.detectable',
    nmin !== undefined && nmin <= check('B4.detectable').limits.maxDetectableN,
    { detectableN: nmin ?? null, rates }
  );
}

function legB5B6B7B8(raS) {
  // B5: cost on the strip's geometry
  const n = raS.length;
  const D = C.vectors(raS, new Array(n).fill(0.25));
  const us = stream('injection', 'p263', 'B:randoms', 'cost');
  const Rra = Array.from({ length: 10 * n }, () => 120 + 120 * us());
  const R = C.vectors(Rra, new Array(10 * n).fill(0.25));
  const rss0 = process.memoryUsage().rss;
  let peak = 0;
  const c0 = process.cpuUsage();
  const DD = C.pairCounts(D, null, SBINS);
  peak = Math.max(peak, process.memoryUsage().rss - rss0);
  const DR = C.pairCounts(D, R, SBINS);
  peak = Math.max(peak, process.memoryUsage().rss - rss0);
  const RR = C.pairCounts(R, null, SBINS);
  peak = Math.max(peak, process.memoryUsage().rss - rss0);
  const cpu = (process.cpuUsage(c0).user + process.cpuUsage(c0).system) / 1e6;
  const L5 = check('B5.cost').limits;
  bound(
    'B5.cost',
    peak <= L5.maxResidentGrowthBytes && cpu <= L5.maxCpuSeconds,
    {
      residentGrowthBytes: peak,
      cpuSeconds: Number(cpu.toFixed(2)),
      pairsRR: (10 * n * (10 * n - 1)) / 2,
      DDTotal: DD.reduce((a, b) => a + b, 0),
      RRTotal: RR.reduce((a, b) => a + b, 0),
    }
  );
  void DR;
  // B6: oracle Thomas sample, kernel's own randoms
  const d = C.vectors(O4.data.ra, O4.data.dec);
  const r = randomsBox('oracle', 10 * O4.n);
  const mine = ls(d, r.U);
  const sigO = C.poissonSigma(O4.w, O4.DD);
  let worst = 0;
  mine.w.forEach((v, k) => {
    worst = Math.max(
      worst,
      Math.abs(v - O4.w[k]) / Math.sqrt(mine.sigma[k] ** 2 + sigO[k] ** 2)
    );
  });
  bound('B6.oracleLS', worst <= check('B6.oracleLS').limits.maxSigmas, {
    maxSigmas: worst,
    w: Array.from(mine.w, v => Number(v.toFixed(4))),
    oracleW: O4.w,
  });
  // B7: randoms
  const a = randomsBox('B7', 5000);
  const b = randomsBox('B7', 5000);
  const same = a.pts.every(
    (p, i) => p[0] === b.pts[i][0] && p[1] === b.pts[i][1]
  );
  const inside = a.ra.every((ra, i) => {
    const [x, y] = skyToPlane(ra, a.dec[i]);
    return Math.abs(x) <= 2 + 1e-9 && Math.abs(y) <= 2 + 1e-9;
  });
  const cells = new Array(64).fill(0);
  for (const [x, y] of a.pts)
    cells[
      Math.min(7, Math.floor((x + 2) * 2)) * 8 +
        Math.min(7, Math.floor((y + 2) * 2))
    ]++;
  const expect = 5000 / 64;
  const chi = cells.reduce((s, c) => s + (c - expect) ** 2 / expect, 0);
  const p = chi2Sf(chi, 63);
  bound('B7.randoms', same && inside && p >= check('B7.randoms').limits.minP, {
    identical: same,
    inside,
    chi2: chi,
    p,
  });
  // B8 and B8b: the strip with a jackknife over 12 blocks of 10 degrees
  const blockOf = ra => Math.max(0, Math.min(11, Math.floor((ra - 120) / 10)));
  const strip = (Rr, key) => {
    const Dv = C.vectors(raS, new Array(n).fill(0.25));
    const Rv = C.vectors(Rr, new Array(Rr.length).fill(0.25));
    const res = C.landySzalayJackknife(Dv, Rv, SBINS, {
      blockD: Int32Array.from(raS, blockOf),
      blockR: Int32Array.from(Rr, blockOf),
      blocks: 12,
    });
    const T = C.statisticT(res.w, res.sigma, res.DD);
    return {
      key,
      w: res.w.map(v => Number(v.toFixed(5))),
      sigmaJackknife: res.sigma.map(v => Number(v.toFixed(5))),
      T: Number(T.T.toFixed(2)),
      df: T.df,
      quantile: Number(chi2Quantile(0.99, T.df || 1).toFixed(3)),
      detected: T.df > 0 && T.T > chi2Quantile(0.99, T.df),
    };
  };
  const us8 = stream('injection', 'p263', 'B:randoms', 'strip');
  const nominal = strip(
    Array.from({ length: 10 * n }, () => 120 + 120 * us8()),
    'nominal 120-240'
  );
  add(
    'B8.strip',
    'reported',
    nominal,
    `${n} galaxies, declination assumed 0.25 degree, no mask`
  );
  const lo = Math.min(...raS);
  const hi = Math.max(...raS);
  const us8b = stream('injection', 'p263', 'B:randoms', 'strip-extent');
  const extent = strip(
    Array.from({ length: 10 * n }, () => lo + (hi - lo) * us8b()),
    `data extent ${lo.toFixed(2)}-${hi.toFixed(2)}`
  );
  add('B8b.stripExtent', 'reported', extent, 'AM1');
  add(
    'B9.authenticReference',
    'not run',
    null,
    'needs R4 (the strip with declination and the footprint) and R5 (a published correlation); neither was fetched'
  );
  return { nominal, extent };
}

function verdict() {
  const K = [
    'B1.pairCounts',
    'B2.null',
    'B2b.nullBias',
    'B3.thomas',
    'B6.oracleLS',
    'B7.randoms',
  ];
  const S = ['B4.detectable', 'B5.cost'];
  const status = id => rows.find(r => r.id === id)?.status;
  const failed = [...K, ...S].filter(id => status(id) !== 'pass');
  if (failed.length) return { verdict: 'C', failed };
  const b8 = rows.find(r => r.id === 'B8.strip')?.measured;
  const a = status('B9.authenticReference') === 'pass' && b8?.detected;
  return { verdict: a ? 'A' : 'B', failed: [] };
}

async function main() {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const t0 = process.cpuUsage();
  const { raS } = legB1();
  legB2B3B4();
  legB5B6B7B8(raS);
  const cpu = process.cpuUsage(t0);
  rows.sort((p, q) => p.id.localeCompare(q.id, 'en', { numeric: true }));
  const out = {
    format: 'gravitas.clustering-gate-results/1',
    node: process.version,
    cpuSeconds: Number(((cpu.user + cpu.system) / 1e6).toFixed(1)),
    ...verdict(),
    counts: Object.fromEntries(
      ['pass', 'fail', 'reported', 'not run'].map(s => [
        s,
        rows.filter(r => r.status === s).length,
      ])
    ),
    rows: only.length
      ? rows.filter(r => only.some(p => r.id.startsWith(p)))
      : rows,
  };
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else {
    for (const r of out.rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(24)} ${JSON.stringify(r.measured)?.slice(0, 220)}${r.note ? '  # ' + r.note : ''}`
      );
    console.log(
      `\nverdict ${out.verdict} ${JSON.stringify(out.counts)} failed ${JSON.stringify(out.failed)} cpu ${out.cpuSeconds}s`
    );
  }
  if (args.includes('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, 'clustering-results.json'),
      JSON.stringify(out, null, 1) + '\n'
    );
}

main();
void separationArcsec;
