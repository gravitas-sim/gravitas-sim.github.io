#!/usr/bin/env node
// =============================================================================
// The cluster fit against its committed thresholds (Prompt 219 Part A)
// -----------------------------------------------------------------------------
//   node tools/cluster-fit-validate.mjs                      print the table
//   node tools/cluster-fit-validate.mjs --json               print it as JSON
//   node tools/cluster-fit-validate.mjs --write-results      rewrite tests/fixtures/cluster-fit/results.json
//   node tools/cluster-fit-validate.mjs --write-failed       rewrite tests/fixtures/cluster-fit/failed-legs.json
//   node tools/cluster-fit-validate.mjs --only=A1,C1         run the legs whose id starts with one of these
//   node tools/cluster-fit-validate.mjs --cache=<dir>        keep each ensemble's fits there and resume from them
//   node tools/cluster-fit-validate.mjs --progress           print each leg as it finishes
//   node tools/cluster-fit-validate.mjs --export-oracle-input <dir>   write what tools/cluster-fit-oracle/oracle.py reads
//
// tests/fixtures/cluster-fit/thresholds.json fixed every bound before js/kernels/clusters/
// existed. The oracle rows read the results pinned in oracle-results.json (numpy, scipy and
// emcee; no Gravitas code). A crossed bound is a failed row, left failing in failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/clusters/index.js';
import { imfDensity } from '../js/kernels/clusters/imf.js';
import { normalCdfExact } from '../js/kernels/clusters/hess.js';
import * as MIST from '../js/data/observations/mistSdssIsochrones.js';
import * as SEGUE from '../js/data/observations/sdssNgc2420Segue.js';
import * as PHOT from '../js/data/observations/sdssNgc2420Photometry.js';
import { tableOf } from '../js/tableObservation.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/cluster-fit';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THR = read(`${FIX}/thresholds.json`);
const lim = id => THR.checks.find(c => c.id === id).limits;
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => args.find(a => a.startsWith(`${n}=`))?.slice(n.length + 1);
const only = opt('--only')?.split(',');
const cacheDir = opt('--cache');
const wanted = id => !only || only.some(p => id.startsWith(p));
const rows = [];
const row = (id, pass, measured, note = '') => {
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  if (flag('--progress')) console.error(`${id} ${pass ? 'pass' : 'FAIL'}`);
};
const report = (id, measured, note = '') => {
  rows.push({ id, status: 'report', measured, note });
  if (flag('--progress')) console.error(`${id} report`);
};
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });

const set = K.parseIsochrones(tableOf(MIST));
const quantile = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const median = a => quantile(a, 0.5);
const key = x => Math.round(x * 1000);
const SYS = THR.synthetic.systems;
const seedOf = i => THR.seeds.datasets[i];

// ---- the datasets the oracle and the legs share --------------------------------------------
function datasets() {
  return Object.fromEntries(
    Object.keys(SYS).map((name, i) => {
      const d = K.drawCluster(set, SYS[name], seedOf(i));
      return [name, d];
    })
  );
}
const testPoints = t => [
  [t.logAge, t.dm],
  [t.logAge + 0.04, t.dm + 0.1],
  [t.logAge - 0.04, t.dm - 0.1],
  [t.logAge + 0.04, t.dm - 0.1],
  [t.logAge - 0.04, t.dm + 0.1],
];

if (flag('--export-oracle-input')) {
  const dir = args[args.indexOf('--export-oracle-input') + 1];
  mkdirSync(dir, { recursive: true });
  const t = tableOf(MIST);
  const col = id => Array.from(t.columns.find(c => c.id === id).values);
  const ds = datasets();
  const out = {
    iso: Object.fromEntries(
      ['feh', 'logAge', 'phase', 'mass', 'g', 'r'].map(id => [id, col(id)])
    ),
    constants: {
      window: K.WINDOW,
      eps: K.DEFAULT_CONTAMINATION,
      R: K.EXTINCTION_RATIO,
      errorModel: K.ERROR_MODEL,
      bridge: 0.5,
      draws: 400000,
      emceeSteps: 400,
      emceeBurn: 150,
    },
    datasets: Object.fromEntries(
      Object.entries(ds).map(([name, d]) => [
        name,
        {
          g: Array.from(d.g),
          colour: Array.from(d.colour),
          truth: d.truth,
          testPoints: testPoints(SYS[name]),
        },
      ])
    ),
  };
  writeFileSync(path.join(dir, 'oracle-input.json'), JSON.stringify(out));
  writeFileSync(
    path.join(ROOT, FIX, 'datasets.json'),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(ds).map(([n, d]) => [
          n,
          {
            origin: 'synthetic',
            truth: d.truth,
            g: Array.from(d.g, x => +x.toFixed(5)),
            colour: Array.from(d.colour, x => +x.toFixed(5)),
          },
        ])
      )
    )
  );
  console.error(`wrote ${dir}/oracle-input.json`);
  process.exit(0);
}

// ---- ensembles, cached ----------------------------------------------------------------------
const compact = r => ({
  status: r.status,
  reason: r.reason ?? null,
  members: r.members,
  best: r.best ?? null,
  age: r.intervals
    ? [r.intervals.logAge.lo, r.intervals.logAge.hi, r.intervals.logAge.status]
    : null,
  dm: r.intervals
    ? [r.intervals.dm.lo, r.intervals.dm.hi, r.intervals.dm.status]
    : null,
  correlation: r.correlation ?? null,
  warnings: r.warnings ?? [],
  deviance: r.deviance ?? null,
});
function ensemble(name, spec, n, fitOpts = {}) {
  const file = cacheDir ? path.join(cacheDir, `${name}.json`) : null;
  let out =
    file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  if (file) mkdirSync(cacheDir, { recursive: true });
  for (let i = out.length; i < n; i++) {
    const d = K.drawCluster(set, spec, THR.seeds.ensemble, name, i);
    const r = K.fitCluster(set, d.g, d.colour, { feh: -0.25, ...fitOpts });
    out.push({ ...compact(r), truthMembers: d.truth.members });
    if (file && (i % 10 === 9 || i === n - 1))
      writeFileSync(file, JSON.stringify(out));
  }
  return out.slice(0, n);
}
const ens = (name, extra = {}) => ({
  ...SYS[THR.synthetic.ensembles[name].system],
  ...extra,
});
const holds = (iv, v) => iv && iv[2] === 'ok' && iv[0] <= v && v <= iv[1];
const wellRuns = () =>
  ensemble('wellSpecified', ens('wellSpecified'), lim('C1.coverageAge').n);

// ---- (a) analytic ---------------------------------------------------------------------------
if (wanted('A1')) {
  const L = lim('A1.imf');
  const a1 = 1.3,
    a2 = 2.3,
    mb = 0.5,
    k2 = mb ** (a2 - a1);
  const exact = (x, y) => {
    let w = 0;
    const p = (s, a, b) => (b ** (1 - s) - a ** (1 - s)) / (1 - s);
    if (x < mb) w += p(a1, Math.max(x, 0.08), Math.min(y, mb));
    if (y > mb) w += k2 * p(a2, Math.max(x, mb), y);
    return w;
  };
  let worst = 0;
  for (const [x, y] of L.cases)
    worst = Math.max(worst, Math.abs(K.imfWeight(x, y) / exact(x, y) - 1));
  // numerical (Simpson) check across the break, and additivity
  const simpson = (f, a, b, n = 20000) => {
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  };
  const numeric = Math.abs(
    simpson(imfDensity, 0.2, 3.0) / K.imfWeight(0.2, 3.0) - 1
  );
  const add = Math.abs(
    (K.imfWeight(0.2, 0.7) + K.imfWeight(0.7, 3.0)) / K.imfWeight(0.2, 3.0) - 1
  );
  row('A1.imf', worst <= L.maxRel && add <= 1e-12 && numeric <= 1e-8, {
    maxRel: worst,
    additivity: add,
    simpsonRel: numeric,
  });
}
if (wanted('A2')) {
  const L = lim('A2.colourRow');
  const c = [];
  const g = [];
  for (let x = 16.0025; x < 19; x += 0.005) {
    c.push(0.5);
    g.push(x);
  }
  const pcs = {
    c: Float64Array.from(c),
    g: Float64Array.from(g),
    w: new Float64Array(c.length).fill(1),
  };
  const h = K.hessOf(pcs, { dm: 0, E: 0, R: 3.245, constantSigma: 0.05 });
  const sd = Math.hypot(0.05, 0.05);
  let worst = 0;
  for (let j = 0; j < K.ROWS; j++) {
    const g0 = K.WINDOW.g[0] + j * K.WINDOW.rowMag;
    if (g0 < 16.3 || g0 > 18.6) continue;
    let s = 0;
    for (let k = 0; k < K.COLS; k++) s += h[j * K.COLS + k];
    for (let k = 0; k < K.COLS; k++) {
      const lo = K.WINDOW.colour[0] + k * K.WINDOW.colourWidth;
      const p =
        normalCdfExact((lo + K.WINDOW.colourWidth - 0.5) / sd) -
        normalCdfExact((lo - 0.5) / sd);
      worst = Math.max(worst, Math.abs(h[j * K.COLS + k] / s - p));
    }
  }
  row('A2.colourRow', worst <= L.maxAbsProbability, {
    maxAbsProbability: worst,
  });
}
const someHess = () => {
  const iso = K.isochroneAt(set, -0.25, 9.3);
  return K.hessOf(K.pieces(iso, 0.01), { dm: 12.3, E: 0.042, R: 3.245 });
};
if (wanted('A3')) {
  const L = lim('A3.normalisation');
  const eps = 0.15;
  const p = K.probabilities(someHess(), eps);
  let rowSum = 0;
  let minP = Infinity;
  for (let j = 0; j < K.ROWS; j++) {
    let s = 0;
    for (let k = 0; k < K.COLS; k++) {
      s += p[j * K.COLS + k];
      minP = Math.min(minP, p[j * K.COLS + k]);
    }
    rowSum = Math.max(rowSum, Math.abs(s - 1));
  }
  const penalty = Math.abs((-2 * Math.log(minP)) / K.maxPenalty(eps) - 1);
  row(
    'A3.normalisation',
    rowSum <= L.rowSumMaxAbs &&
      minP >= (eps / K.COLS) * (1 - 1e-12) &&
      penalty <= L.penaltyMaxRel,
    {
      rowSumMaxAbs: rowSum,
      minProbability: minP,
      floor: eps / K.COLS,
      penaltyRel: penalty,
    }
  );
}
if (wanted('A4')) {
  const L = lim('A4.deviance');
  // counts in two rows
  const g = [14.55, 14.55, 14.55, 14.65, 14.65];
  const colour = [0.01, 0.01, 0.05, 0.01, 0.09];
  const data = K.binStars(g, colour);
  const own = new Float64Array(K.ROWS * K.COLS);
  for (let i = 0; i < data.cells.length; i++)
    own[data.cells[i]] = data.counts[i];
  const zero = K.deviance(own, data, 0);
  // against other probabilities, by hand: rows 0 and 1, columns of the stars
  const other = new Float64Array(K.ROWS * K.COLS);
  other.fill(1);
  const eps = 0.2;
  const d = K.deviance(other, data, eps);
  const u = 1 / K.COLS;
  const p = (1 - eps) / K.COLS + eps * u; // each row sums to COLS * 1 = COLS: m / M = 1/COLS
  const sat =
    2 *
    (2 * Math.log(2 / 3) +
      1 * Math.log(1 / 3) +
      1 * Math.log(1 / 2) +
      1 * Math.log(1 / 2));
  const hand = -2 * 5 * Math.log(p) + sat;
  const rnd = new Float64Array(K.ROWS * K.COLS);
  for (let i = 0; i < rnd.length; i++)
    rnd[i] = Math.abs(Math.sin(i * 12.9898)) + 0.01;
  const nonneg = K.deviance(rnd, data, 0.1);
  row(
    'A4.deviance',
    Math.abs(zero) <= L.maxAbs && Math.abs(d - hand) <= 1e-9 && nonneg >= 0,
    { own: zero, handDifference: d - hand, otherProbabilities: nonneg }
  );
}
if (wanted('A5')) {
  const L = lim('A5.shiftLaws');
  const iso = K.isochroneAt(set, -0.25, 9.3);
  const pcs = K.pieces(iso, 0.01);
  const sg = { constantSigma: 0.04 };
  const h0 = K.hessOf(pcs, { dm: 12.3, E: 0, R: 3.245, ...sg });
  const h1 = K.hessOf(pcs, { dm: 12.5, E: 0, R: 3.245, ...sg });
  let worstRow = 0;
  for (let j = 0; j + 2 < K.ROWS; j++)
    for (let k = 0; k < K.COLS; k++)
      worstRow = Math.max(
        worstRow,
        Math.abs(h1[(j + 2) * K.COLS + k] - h0[j * K.COLS + k])
      );
  const e0 = K.hessOf(pcs, { dm: 12.3, E: 0, R: 2.5, ...sg });
  const e1 = K.hessOf(pcs, { dm: 12.3, E: 0.08, R: 2.5, ...sg }); // colour + 0.08 (2 columns), g + 0.2 (2 rows)
  let worstE = 0;
  for (let j = 0; j + 2 < K.ROWS; j++)
    for (let k = 0; k + 2 < K.COLS; k++)
      worstE = Math.max(
        worstE,
        Math.abs(e1[(j + 2) * K.COLS + k + 2] - e0[j * K.COLS + k])
      );
  row('A5.shiftLaws', worstRow <= L.maxAbs && worstE <= L.maxAbs, {
    distanceModulus: worstRow,
    reddening: worstE,
  });
}
const nearestScaled = (pts, segs) => {
  // distance, in the scaled units, of each point to the nearest of the segments
  const [sc, sg] = K.CURVE_SCALE;
  return pts.map(([px, py]) => {
    let best = Infinity;
    for (const [ax, ay, bx, by] of segs) {
      const dx = (bx - ax) / sc;
      const dy = (by - ay) / sg;
      const len2 = dx * dx + dy * dy;
      const qx = (px - ax) / sc;
      const qy = (py - ay) / sg;
      const t =
        len2 > 0 ? Math.max(0, Math.min(1, (qx * dx + qy * dy) / len2)) : 0;
      best = Math.min(best, Math.hypot(qx - t * dx, qy - t * dy));
    }
    return best;
  });
};
const segmentsOf = iso => {
  const segs = [];
  let prev = null;
  for (const p of iso.phases) {
    const pt = i => [p.g[i] - p.r[i], p.g[i]];
    if (prev) segs.push([...prev, ...pt(0)]);
    for (let i = 0; i + 1 < p.g.length; i++)
      segs.push([...pt(i), ...pt(i + 1)]);
    prev = pt(p.g.length - 1);
  }
  return segs;
};
const dense = (iso, step = 0.01) => {
  const pts = [];
  for (const p of iso.phases)
    for (let i = 0; i + 1 < p.g.length; i++) {
      const c0 = p.g[i] - p.r[i];
      const c1 = p.g[i + 1] - p.r[i + 1];
      const n = Math.max(
        1,
        Math.ceil(
          Math.max(Math.abs(c1 - c0), Math.abs(p.g[i + 1] - p.g[i])) / step
        )
      );
      for (let s = 0; s < n; s++)
        pts.push([
          c0 + ((c1 - c0) * s) / n,
          p.g[i] + ((p.g[i + 1] - p.g[i]) * s) / n,
        ]);
    }
  return pts;
};
if (wanted('A6')) {
  const L = lim('A6.interpolationExact');
  let worst = 0;
  for (const feh of set.fehs)
    for (const age of set.logAges) {
      const a = K.isochroneAt(set, feh, age);
      const g = set.cells.get(`${key(feh)}|${key(age)}`);
      for (let p = 0; p < g.phases.length; p++)
        for (let i = 0; i < g.phases[p].g.length; i++)
          worst = Math.max(
            worst,
            Math.abs(a.phases[p].g[i] - g.phases[p].g[i]),
            Math.abs(a.phases[p].r[i] - g.phases[p].r[i]),
            Math.abs(a.phases[p].m[i] - g.phases[p].m[i])
          );
    }
  // the morph's end weights, reported
  const A = set.cells.get(`${key(-0.25)}|${key(9.3)}`);
  const B = set.cells.get(`${key(-0.25)}|${key(9.4)}`);
  const d0 = Math.max(...nearestScaled(dense(K.morph(A, B, 0)), segmentsOf(A)));
  const d1 = Math.max(...nearestScaled(dense(K.morph(A, B, 1)), segmentsOf(B)));
  row('A6.interpolationExact', worst <= L.maxAbsMag, {
    gridMaxAbs: worst,
    morphAtZeroScaled: d0,
    morphAtOneScaled: d1,
    note: 'the morph resamples each phase at equal arc length, so at weight 0 or 1 it lies within the resampling chord of its parent (scaled units), reported not bounded',
  });
}
if (wanted('A7')) {
  const L = lim('A7.interpolationLOO');
  const all = [];
  const per = [];
  for (const feh of set.fehs)
    for (const age of [9.1, 9.2, 9.3, 9.4, 9.5]) {
      const A = set.cells.get(`${key(feh)}|${key(age - 0.1)}`);
      const B = set.cells.get(`${key(feh)}|${key(age + 0.1)}`);
      const T = set.cells.get(`${key(feh)}|${key(age)}`);
      const M = K.morph(A, B, 0.5);
      const d = nearestScaled(dense(T), segmentsOf(M));
      all.push(...d);
      per.push({ feh, logAge: age, median: median(d), p95: quantile(d, 0.95) });
    }
  const med = median(all);
  const p95 = quantile(all, 0.95);
  row('A7.interpolationLOO', med <= L.medianScaled && p95 <= L.p95Scaled, {
    medianScaled: med,
    p95Scaled: p95,
    worstCase: per.sort((a, b) => b.p95 - a.p95)[0],
    cases: per.length,
  });
}
if (wanted('A8')) {
  const L = lim('A8.syntheticTruth');
  const spec = {
    logAge: 9.3,
    dm: 12.06,
    feh: -0.25,
    E: 0.042,
    N: 5000,
    epsTrue: 0,
    fb: 0,
    noise: false,
    selection: null,
  };
  const d = K.drawCluster(set, spec, 'A8');
  const iso = K.isochroneAt(set, -0.25, 9.3);
  const shift = spec.dm + 3.245 * spec.E;
  const pts = Array.from(d.g, (g, i) => [d.colour[i] - spec.E, g - shift]);
  const dist = nearestScaled(pts.slice(0, 600), segmentsOf(iso));
  // scaled distance 1e-9 -> mag
  const maxDistance = Math.max(...dist) * K.CURVE_SCALE[1];
  // the pieces inside the window give the expected mass distribution
  const pcs = K.pieces(iso, 0.01);
  const inside = [];
  for (let i = 0; i < pcs.w.length; i++) {
    const gApp = pcs.g[i] + shift;
    const cApp = pcs.c[i] + spec.E;
    if (
      gApp >= K.WINDOW.g[0] &&
      gApp < K.WINDOW.g[1] &&
      cApp >= K.WINDOW.colour[0] &&
      cApp < K.WINDOW.colour[1]
    )
      inside.push([pcs.m[i], pcs.w[i]]);
  }
  inside.sort((a, b) => a[0] - b[0]);
  const total = inside.reduce((s, p) => s + p[1], 0);
  const cdf = [];
  let acc = 0;
  for (const [m, w] of inside) cdf.push([m, (acc += w) / total]);
  const masses = Array.from(d.mass).sort((a, b) => a - b);
  let ks = 0;
  let ptr = 0;
  masses.forEach((m, i) => {
    while (ptr < cdf.length - 1 && cdf[ptr][0] < m) ptr++;
    const F = cdf[ptr][1];
    ks = Math.max(
      ks,
      Math.abs(F - (i + 1) / masses.length),
      Math.abs(F - i / masses.length)
    );
  });
  row('A8.syntheticTruth', maxDistance <= L.maxDistance && ks <= L.ksMax, {
    maxDistanceMag: maxDistance,
    ks,
    stars: masses.length,
  });
}

// ---- (b) the independent oracle ------------------------------------------------------------
const oraclePath = path.join(ROOT, FIX, 'oracle-results.json');
const ORA = existsSync(oraclePath) ? read(`${FIX}/oracle-results.json`) : null;
if (wanted('B')) {
  if (!ORA) {
    for (const id of ['B1.binnedAgreement', 'B2.unbinned', 'B3.posteriorWidth'])
      if (wanted(id))
        notRun(
          id,
          'tests/fixtures/cluster-fit/oracle-results.json is absent: run tools/cluster-fit-oracle/oracle.py (see its header)'
        );
  } else {
    const ds = datasets();
    const fits = {};
    for (const name of Object.keys(ds)) {
      const d = ds[name];
      const fit = K.fitCluster(set, d.g, d.colour, { feh: d.truth.feh });
      fits[name] = fit;
    }
    const L1 = lim('B1.binnedAgreement');
    const m1 = {};
    let ok1 = true;
    for (const name of Object.keys(ds)) {
      const d = ds[name];
      const data = K.binStars(d.g, d.colour);
      const ev = K.evaluator(set, data, { feh: d.truth.feh, E: d.truth.E });
      const o = ORA.sets[name];
      const diffs = o.test.map(tp => {
        const mine = ev.dev(tp.logAge, tp.dm);
        const lim = Math.max(L1.deviance.abs, L1.deviance.rel * Math.abs(mine));
        return {
          logAge: tp.logAge,
          dm: tp.dm,
          kernel: mine,
          oracle: tp.binned,
          diff: mine - tp.binned,
          within: Math.abs(mine - tp.binned) <= lim,
        };
      });
      const dAge = Math.abs(fits[name].best.logAge - o.binnedBest.logAge);
      const dDm = Math.abs(fits[name].best.dm - o.binnedBest.dm);
      const ok =
        diffs.every(x => x.within) && dAge <= L1.bestLogAge && dDm <= L1.bestDm;
      ok1 &&= ok;
      m1[name] = {
        diffs: diffs.map(x => ({
          kernel: +x.kernel.toFixed(2),
          oracle: +x.oracle.toFixed(2),
          within: x.within,
        })),
        bestLogAgeDiff: dAge,
        bestDmDiff: dDm,
      };
    }
    row('B1.binnedAgreement', ok1, m1);
    const L2 = lim('B2.unbinned');
    const m2 = {};
    let ok2 = true;
    for (const name of Object.keys(ds)) {
      const o = ORA.sets[name].unbinnedBest;
      const dA = Math.abs(fits[name].best.logAge - o.logAge);
      const dD = Math.abs(fits[name].best.dm - o.dm);
      ok2 &&= dA <= L2.bestLogAge && dD <= L2.bestDm;
      m2[name] = { logAgeDiff: dA, dmDiff: dD };
    }
    row('B2.unbinned', ok2, m2);
    const L3 = lim('B3.posteriorWidth');
    const m3 = {};
    let ok3 = true;
    for (const name of Object.keys(ds)) {
      const iv = fits[name].intervals;
      const p = ORA.sets[name].posterior;
      const rA = p.logAgeSd / ((iv.logAge.hi - iv.logAge.lo) / 2);
      const rD = p.dmSd / ((iv.dm.hi - iv.dm.lo) / 2);
      ok3 &&=
        rA >= L3.ratioLo &&
        rA <= L3.ratioHi &&
        rD >= L3.ratioLo &&
        rD <= L3.ratioHi;
      m3[name] = { logAgeRatio: rA, dmRatio: rD };
    }
    row('B3.posteriorWidth', ok3, m3);
  }
}

// ---- (c) coverage --------------------------------------------------------------------------
const S2 = SYS.S2;
if (
  wanted('C1') ||
  wanted('C2') ||
  wanted('C4') ||
  wanted('C5') ||
  wanted('D1')
) {
  const runs = wellRuns();
  const closed = runs.filter(r => r.age);
  const covA = runs.filter(r => holds(r.age, S2.logAge)).length / runs.length;
  const covD = runs.filter(r => holds(r.dm, S2.dm)).length / runs.length;
  const L1 = lim('C1.coverageAge');
  const L2 = lim('C2.coverageDm');
  if (wanted('C1'))
    row('C1.coverageAge', covA >= L1.lo && covA <= L1.hi, {
      n: runs.length,
      coverage: covA,
      band: [L1.lo, L1.hi],
    });
  if (wanted('C2'))
    row('C2.coverageDm', covD >= L2.lo && covD <= L2.hi, {
      n: runs.length,
      coverage: covD,
      band: [L2.lo, L2.hi],
    });
  if (wanted('C4')) {
    const L = lim('C4.recovery');
    const ok = runs.filter(
      r => r.best && r.age?.[2] === 'ok' && r.dm?.[2] === 'ok'
    );
    const hwA = median(ok.map(r => (r.age[1] - r.age[0]) / 2));
    const hwD = median(ok.map(r => (r.dm[1] - r.dm[0]) / 2));
    const biasA = median(ok.map(r => r.best.logAge)) - S2.logAge;
    const biasD = median(ok.map(r => r.best.dm)) - S2.dm;
    const lA = (L.nSigma * hwA) / Math.sqrt(ok.length);
    const lD = (L.nSigma * hwD) / Math.sqrt(ok.length);
    row('C4.recovery', Math.abs(biasA) <= lA && Math.abs(biasD) <= lD, {
      medianBiasLogAge: biasA,
      limitLogAge: lA,
      medianBiasDm: biasD,
      limitDm: lD,
      medianHalfWidths: [hwA, hwD],
      n: ok.length,
    });
  }
  if (wanted('C5')) {
    const L = lim('C5.valley');
    const rho = closed.map(r => r.correlation).filter(x => x !== null);
    const negative = rho.filter(x => x < 0).length / runs.length;
    const med = median(rho);
    row(
      'C5.valley',
      negative >= L.minNegative && med >= L.medianLo && med <= L.medianHi,
      { negativeShare: negative, medianCorrelation: med, n: rho.length }
    );
  }
  if (wanted('D1')) {
    const L = lim('D1.tooFew');
    const few = ensemble('tooFew', ens('tooFew', { N: 30 }), L.n);
    const flagged =
      few.filter(r => r.status === 'not-constrained' && r.reason === 'members')
        .length / L.n;
    const ctl =
      runs.slice(0, L.controlN).filter(r => r.status === 'not-constrained')
        .length / L.controlN;
    row('D1.tooFew', flagged >= L.minFlagged && ctl <= L.maxControlFlagged, {
      flagged,
      controlFlagged: ctl,
    });
  }
}
if (wanted('C3')) {
  const L = lim('C3.coverageBinaries');
  const b = ensemble('binaries', ens('binaries', { fb: 0.3 }), L.n);
  const ok = b.filter(r => r.best);
  report('C3.coverageBinaries', {
    n: b.length,
    coverageAge: b.filter(r => holds(r.age, S2.logAge)).length / b.length,
    coverageDm: b.filter(r => holds(r.dm, S2.dm)).length / b.length,
    medianBiasLogAge: median(ok.map(r => r.best.logAge)) - S2.logAge,
    medianBiasDm: median(ok.map(r => r.best.dm)) - S2.dm,
    notConstrained: b.filter(r => r.status !== 'ok').length,
  });
}

// ---- (d) misspecified and negative ---------------------------------------------------------
if (wanted('D2')) {
  const L = lim('D2.fieldOnly');
  const f = ensemble('fieldOnly', ens('fieldOnly', { epsTrue: 1 }), L.n);
  const flagged = f.filter(r => r.status === 'not-constrained').length / L.n;
  const gaveAge = f.filter(r => r.status === 'ok').length;
  row('D2.fieldOnly', flagged >= L.minFlagged && gaveAge === 0, {
    flagged,
    gaveAnAge: gaveAge,
    reasons: [...new Set(f.map(r => r.reason))],
  });
}
if (wanted('D3')) {
  const L = lim('D3.wrongMetallicity');
  const w = ensemble(
    'wrongMetallicity',
    ens('wrongMetallicity', { feh: -0.5 }),
    L.n
  );
  const excl =
    w.filter(
      r => r.age && r.dm && (!holds(r.age, S2.logAge) || !holds(r.dm, S2.dm))
    ).length / L.n;
  row('D3.wrongMetallicity', excl >= L.minExcluded, {
    excluded: excl,
    medianBiasLogAge:
      median(w.filter(r => r.best).map(r => r.best.logAge)) - S2.logAge,
    medianBiasDm: median(w.filter(r => r.best).map(r => r.best.dm)) - S2.dm,
  });
}
if (wanted('D4')) {
  const L = lim('D4.wrongReddening');
  const w = ensemble('wrongReddening', ens('wrongReddening', { E: 0.1 }), L.n);
  const ok = w.filter(r => r.best);
  report('D4.wrongReddening', {
    n: w.length,
    medianBiasLogAge: median(ok.map(r => r.best.logAge)) - S2.logAge,
    medianBiasDm: median(ok.map(r => r.best.dm)) - S2.dm,
    excluded:
      w.filter(
        r => r.age && r.dm && (!holds(r.age, S2.logAge) || !holds(r.dm, S2.dm))
      ).length / w.length,
  });
}
if (wanted('D5')) {
  const L = lim('D5.wrongContamination');
  const out = {};
  for (const e of THR.synthetic.ensembles.wrongContamination.epsTrue) {
    const w = ensemble(
      `wrongContamination-${e}`,
      ens('wrongContamination', { epsTrue: e }),
      L.n
    );
    const ok = w.filter(r => r.best);
    out[e] = {
      coverageAge: w.filter(r => holds(r.age, S2.logAge)).length / w.length,
      coverageDm: w.filter(r => holds(r.dm, S2.dm)).length / w.length,
      medianBiasLogAge: median(ok.map(r => r.best.logAge)) - S2.logAge,
      medianBiasDm: median(ok.map(r => r.best.dm)) - S2.dm,
    };
  }
  report('D5.wrongContamination', out);
}
if (wanted('D6')) {
  const L = lim('D6.edge');
  const e = ensemble('edge', { ...S2, logAge: 9.6 }, L.n);
  const bad = e.filter(r => {
    if (!r.best) return false;
    const closedInside =
      r.status === 'ok' && r.best.logAge < 9.58 && r.age[1] <= 9.6;
    const flagged =
      r.warnings.includes('ageAtOldEdge') &&
      (r.status === 'open' || r.age?.[1] === null);
    return !(closedInside || flagged);
  }).length;
  row('D6.edge', bad === 0, {
    n: e.length,
    violations: bad,
    flaggedAtEdge: e.filter(r => r.warnings.includes('ageAtOldEdge')).length,
  });
}

// ---- (e) authentic -------------------------------------------------------------------------
if (wanted('E1')) {
  const L = lim('E1.ngc2420');
  const t = tableOf(SEGUE);
  const c = id => t.columns.find(x => x.id === id).values;
  const g = [];
  const col = [];
  for (let i = 0; i < t.n; i++) {
    const rv = c('rv')[i];
    if (
      rv >= 65 &&
      rv <= 85 &&
      Number.isFinite(c('g')[i]) &&
      Number.isFinite(c('r')[i])
    ) {
      g.push(c('g')[i]);
      col.push(c('g')[i] - c('r')[i]);
    }
  }
  const r = K.fitCluster(set, g, col, { feh: -0.25, E: 0.042, eps: 0.2 });
  const ageG = x => 10 ** (x - 9);
  let pass = false;
  let measured = {
    stars: g.length,
    status: r.status,
    reason: r.reason ?? null,
  };
  if (r.intervals) {
    const a = r.intervals.logAge;
    const d = r.intervals.dm;
    const aLo = a.lo === null ? -Infinity : ageG(a.lo);
    const aHi = a.hi === null ? Infinity : ageG(a.hi);
    const dLo = d.lo === null ? -Infinity : d.lo;
    const dHi = d.hi === null ? Infinity : d.hi;
    const ageOverlap = aLo <= L.ageRangeGyr[1] && aHi >= L.ageRangeGyr[0];
    const dmOverlap = dLo <= L.dmRange[1] && dHi >= L.dmRange[0];
    pass = r.status !== 'not-constrained' && ageOverlap && dmOverlap;
    measured = {
      ...measured,
      best: r.best,
      ageGyr: [aLo, ageG(r.best.logAge), aHi],
      dm: [dLo, r.best.dm, dHi],
      ageOverlap,
      dmOverlap,
      distancePc: 10 ** (r.best.dm / 5 + 1),
      correlation: r.correlation,
      intervalStatus: [a.status, d.status],
      warnings: r.warnings,
    };
  }
  row('E1.ngc2420', pass, measured);
}
if (wanted('E2')) {
  const L = lim('E2.errorModel');
  const t = tableOf(PHOT);
  const c = id => t.columns.find(x => x.id === id).values;
  const out = [];
  let ok = true;
  for (const [a, b] of L.bins) {
    const e = [];
    const m = [];
    for (let i = 0; i < t.n; i++)
      if (c('g')[i] >= a && c('g')[i] < b) {
        e.push(c('g_err')[i]);
        m.push(K.sigmaAt(c('g')[i]));
      }
    const ratio = median(e) / median(m);
    ok &&= ratio >= L.lo && ratio <= L.hi;
    out.push({ bin: [a, b], n: e.length, ratio });
  }
  row('E2.errorModel', ok, { bins: out });
}
if (wanted('P1')) {
  const L = lim('P1.speed');
  const d = K.drawCluster(set, S2, 'P1');
  const t0 = process.cpuUsage();
  const r = K.fitCluster(set, d.g, d.colour, { feh: -0.25 });
  const u = process.cpuUsage(t0);
  const s = (u.user + u.system) / 1e6;
  row('P1.speed', s <= L.maxSeconds, {
    cpuSeconds: s,
    evaluations: r.evaluations,
  });
}

// ---- output -------------------------------------------------------------------------------
const order = THR.checks.map(c => c.id);
rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
const failed = rows.filter(r => r.status === 'fail');
const tail = { node: process.version, date: '2026-10-29' };
if (flag('--write-results'))
  writeFileSync(
    path.join(ROOT, FIX, 'results.json'),
    JSON.stringify(
      {
        note: 'The validation table of tools/cluster-fit-validate.mjs as last measured; tests/clusterFit.test.js holds the quick legs and failed-legs.json to it.',
        ...tail,
        rows,
      },
      null,
      2
    ) + '\n'
  );
if (flag('--write-failed'))
  writeFileSync(
    path.join(ROOT, FIX, 'failed-legs.json'),
    JSON.stringify(
      {
        note: 'Legs of tests/fixtures/cluster-fit/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).',
        failed: failed.map(f => ({
          id: f.id,
          measured: f.measured,
          why: f.note,
        })),
      },
      null,
      2
    ) + '\n'
  );
if (flag('--json')) console.log(JSON.stringify({ ...tail, rows }, null, 2));
else {
  for (const r of rows)
    console.log(
      `${r.status.padEnd(7)} ${r.id.padEnd(24)} ${JSON.stringify(r.measured).slice(0, 220)}${r.note ? ' ' + r.note : ''}`
    );
  console.log(
    `\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'report').length} reported, ${rows.filter(r => r.status === 'not-run').length} not run`
  );
}
process.exitCode = failed.length ? 1 : 0;
