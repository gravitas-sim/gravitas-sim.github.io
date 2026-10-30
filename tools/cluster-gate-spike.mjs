#!/usr/bin/env node
// =============================================================================
// SPIKE (Prompt 219 Part B gate): the four-parameter cluster fit, never merged
// -----------------------------------------------------------------------------
//   node tools/cluster-gate-spike.mjs [--only=G1,H1] [--cache=<dir>] [--json]
// Models, ensembles, bounds and the decision were committed in
// tests/fixtures/cluster-gate/thresholds.json before this file existed.
// =============================================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/clusters/index.js';
import { profileInterval } from '../js/kernels/statistics/intervals.js';
import { logisticCompleteness } from '../js/kernels/statistics/selection.js';
import { stream, gaussian } from '../js/random/streams.js';
import * as MIST from '../js/data/observations/mistSdssIsochrones.js';
import * as SEGUE from '../js/data/observations/sdssNgc2420Segue.js';
import { tableOf } from '../js/tableObservation.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const THR = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/fixtures/cluster-gate/thresholds.json'),
    'utf8'
  )
);
const lim = id => THR.checks.find(c => c.id === id).limits;
const args = process.argv.slice(2);
const only = args
  .find(a => a.startsWith('--only='))
  ?.slice(7)
  .split(',');
const cacheDir = args.find(a => a.startsWith('--cache='))?.slice(8);
const wanted = id => !only || only.some(p => id.startsWith(p));
const set = K.parseIsochrones(tableOf(MIST));
const { ROWS, COLS, WINDOW } = K;
const FB = 0.3;
const QS = [0.3875, 0.5625, 0.7375, 0.9125];
const ASSUMED_SEL = logisticCompleteness({ m50: 19.0, width: 0.5 });
const BOUNDS = { logAge: [9.0, 9.6], E: [0, 0.12], feh: [-0.5, 0] };
const fluxSum = (a, b) =>
  -2.5 * Math.log10(10 ** (-0.4 * a) + 10 ** (-0.4 * b));

// ---- the membership model -----------------------------------------------------------------
function membership(rv) {
  const n = rv.length;
  let pi = 0.6,
    m1 = 75,
    s1 = 4,
    m2 = 20,
    s2 = 60;
  const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / s;
  const p = new Float64Array(n);
  for (let it = 0; it < 100; it++) {
    let w1 = 0,
      w2 = 0,
      a1 = 0,
      a2 = 0,
      v1 = 0,
      v2 = 0;
    for (let i = 0; i < n; i++) {
      const a = pi * pdf(rv[i], m1, s1),
        b = (1 - pi) * pdf(rv[i], m2, s2);
      p[i] = a / (a + b || 1);
      w1 += p[i];
      w2 += 1 - p[i];
      a1 += p[i] * rv[i];
      a2 += (1 - p[i]) * rv[i];
    }
    m1 = a1 / w1;
    m2 = a2 / w2;
    for (let i = 0; i < n; i++) {
      v1 += p[i] * (rv[i] - m1) ** 2;
      v2 += (1 - p[i]) * (rv[i] - m2) ** 2;
    }
    s1 = Math.max(2, Math.sqrt(v1 / w1));
    s2 = Math.max(20, Math.sqrt(v2 / w2));
    pi = w1 / n;
  }
  return p;
}
function fieldTemplate(g, c, p) {
  const T = new Float64Array(ROWS * COLS);
  const idx = [];
  for (let i = 0; i < g.length; i++) if (p[i] < 0.2) idx.push(i);
  if (idx.length < 20) return T.fill(1 / (ROWS * COLS));
  const sg = 0.5,
    sc = 0.1;
  for (let j = 0; j < ROWS; j++)
    for (let k = 0; k < COLS; k++) {
      const gj = WINDOW.g[0] + (j + 0.5) * WINDOW.rowMag,
        ck = WINDOW.colour[0] + (k + 0.5) * WINDOW.colourWidth;
      let s = 0;
      for (const i of idx)
        s += Math.exp(
          -0.5 * (((g[i] - gj) / sg) ** 2 + ((c[i] - ck) / sc) ** 2)
        );
      T[j * COLS + k] = s + 1e-9;
    }
  const tot = T.reduce((a, b) => a + b, 0);
  for (let i = 0; i < T.length; i++) T[i] /= tot;
  return T;
}

// ---- the model: isochrone with binaries, selection, normalised over the window --------------
const cache = new Map();
function pieceSet(feh, logAge) {
  const key = `${Math.round(feh * 400)}|${Math.round(logAge * 200)}`;
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 4000) cache.clear();
  const iso = K.isochroneAt(set, feh, logAge);
  const p = K.pieces(iso, 0.02);
  const ms = K.mainSequenceOf(iso);
  const n = p.w.length;
  const c = [],
    g = [],
    w = [];
  for (let i = 0; i < n; i++) {
    c.push(p.c[i]);
    g.push(p.g[i]);
    w.push(p.w[i] * (1 - FB));
    const g1 = p.g[i],
      r1 = p.g[i] - p.c[i];
    for (const q of QS) {
      const s = ms(q * p.m[i]);
      if (!s) {
        c.push(p.c[i]);
        g.push(p.g[i]);
        w.push((p.w[i] * FB) / QS.length);
        continue;
      }
      const gt = fluxSum(g1, s.g),
        rt = fluxSum(r1, s.r);
      c.push(gt - rt);
      g.push(gt);
      w.push((p.w[i] * FB) / QS.length);
    }
  }
  const out = {
    c: Float64Array.from(c),
    g: Float64Array.from(g),
    w: Float64Array.from(w),
  };
  cache.set(key, out);
  return out;
}
function modelProbability(theta, selFn) {
  const [logAge, dm, E, feh] = theta;
  const h = K.hessOf(pieceSet(feh, logAge), { dm, E, R: K.EXTINCTION_RATIO });
  let tot = 0;
  for (let j = 0; j < ROWS; j++) {
    const cj = selFn(WINDOW.g[0] + (j + 0.5) * WINDOW.rowMag);
    for (let k = 0; k < COLS; k++) tot += h[j * COLS + k] *= cj;
  }
  if (!(tot > 0)) return null;
  for (let i = 0; i < h.length; i++) h[i] /= tot;
  return h;
}
function dataOf(g, c, rv, selFn) {
  const p = membership(rv);
  const F = fieldTemplate(g, c, p);
  const bins = [];
  for (let i = 0; i < g.length; i++) {
    const j = Math.floor((g[i] - WINDOW.g[0]) / WINDOW.rowMag);
    const k = Math.floor((c[i] - WINDOW.colour[0]) / WINDOW.colourWidth);
    if (j < 0 || j >= ROWS || k < 0 || k >= COLS) continue;
    bins.push([j * COLS + k, p[i]]);
  }
  return { bins, F, selFn, n: bins.length };
}
function deviance(theta, data) {
  const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
  let pen = 0;
  const t = [...theta];
  for (const [i, key] of [
    [0, 'logAge'],
    [2, 'E'],
    [3, 'feh'],
  ]) {
    const c = clamp(t[i], BOUNDS[key]);
    pen += 1e4 * (t[i] - c) ** 2;
    t[i] = c;
  }
  const m = modelProbability(t, data.selFn);
  if (!m) return 1e9;
  let d = 0;
  for (const [idx, p] of data.bins)
    d -= 2 * Math.log(p * m[idx] + (1 - p) * data.F[idx] + 1e-300);
  return d + pen;
}

// ---- Nelder-Mead --------------------------------------------------------------------------
function nelderMead(f, x0, steps, maxEval = 200, ftol = 0.02) {
  const n = x0.length;
  let pts = [
    x0,
    ...x0.map((_, i) => x0.map((v, j) => (j === i ? v + steps[i] : v))),
  ];
  let vals = pts.map(f);
  let evals = n + 1;
  while (evals < maxEval) {
    const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    pts = order.map(i => pts[i]);
    vals = order.map(i => vals[i]);
    if (Math.abs(vals[n] - vals[0]) < ftol) break;
    const cen = x0.map(
      (_, j) => pts.slice(0, n).reduce((s, p) => s + p[j], 0) / n
    );
    const at = t => cen.map((v, j) => v + t * (pts[n][j] - v));
    const xr = at(-1),
      fr = f(xr);
    evals++;
    if (fr < vals[0]) {
      const xe = at(-2),
        fe = f(xe);
      evals++;
      if (fe < fr) {
        pts[n] = xe;
        vals[n] = fe;
      } else {
        pts[n] = xr;
        vals[n] = fr;
      }
    } else if (fr < vals[n - 1]) {
      pts[n] = xr;
      vals[n] = fr;
    } else {
      const xc = fr < vals[n] ? at(-0.5) : at(0.5),
        fc = f(xc);
      evals++;
      if (fc < Math.min(fr, vals[n])) {
        pts[n] = xc;
        vals[n] = fc;
      } else
        for (let i = 1; i <= n; i++) {
          pts[i] = pts[i].map((v, j) => pts[0][j] + 0.5 * (v - pts[0][j]));
          vals[i] = f(pts[i]);
          evals += 1;
        }
    }
  }
  const k = vals.indexOf(Math.min(...vals));
  return { x: pts[k], f: vals[k], evals };
}

// ---- the fit with profile intervals ------------------------------------------------------
const NAMES = ['logAge', 'dm', 'E', 'feh'];
function fitGate(data, { threeParameter = false, dmCentre = 12.2 }) {
  const fehGrid = [-0.5, -0.375, -0.25, -0.125, 0];
  const full = th =>
    threeParameter
      ? Math.min(...fehGrid.map(f => deviance([th[0], th[1], th[2], f], data)))
      : deviance(th, data);
  const fullTheta = th => (threeParameter ? [th[0], th[1], th[2], th[3]] : th);
  // a start from Part A's fit at the assumed metallicity and reddening (floor 0.15)
  const stars = { g: [], c: [] };
  for (const [idx] of data.bins) {
    stars.g.push(WINDOW.g[0] + ((idx / COLS) | 0) * WINDOW.rowMag + 0.05);
    stars.c.push(WINDOW.colour[0] + (idx % COLS) * WINDOW.colourWidth + 0.02);
  }
  const a = K.fitCluster(set, stars.g, stars.c, {
    feh: -0.25,
    E: 0.042,
    dmRange: [dmCentre - 1.5, dmCentre + 1.5],
    eps: 0.3,
  });
  const start = a.best ?? { logAge: 9.3, dm: dmCentre };
  let best = null;
  let evals = 0;
  const starts = threeParameter
    ? [[0.03], [0.09]]
    : [
        [0.03, -0.45],
        [0.09, -0.45],
        [0.03, -0.05],
        [0.09, -0.05],
        [0.06, -0.25],
      ];
  for (const s of starts) {
    const x0 = threeParameter
      ? [start.logAge, start.dm, s[0], -0.25]
      : [start.logAge, start.dm, s[0], s[1]];
    const f = threeParameter ? x => full(x) : x => deviance(x, data);
    const r = nelderMead(
      f,
      threeParameter ? x0 : x0,
      [0.06, 0.15, 0.03, 0.12],
      260
    );
    evals += r.evals;
    if (!best || r.f < best.f) best = r;
  }
  const free = threeParameter ? [0, 1, 2] : [0, 1, 2, 3];
  const intervals = {};
  const grids = {
    logAge: Array.from({ length: 13 }, (_, i) => best.x[0] - 0.12 + i * 0.02),
    dm: Array.from({ length: 13 }, (_, i) => best.x[1] - 0.3 + i * 0.05),
    E: Array.from({ length: 13 }, (_, i) => i * 0.01),
    feh: Array.from({ length: 11 }, (_, i) => -0.5 + i * 0.05),
  };
  for (const k of free) {
    const name = NAMES[k];
    const pts = [];
    let warm = best.x;
    const lo = grids[name].filter(v => v <= best.x[k]).reverse();
    const hi = grids[name].filter(v => v > best.x[k]);
    const run = list => {
      warm = best.x;
      for (const v of list) {
        const others = free.filter(j => j !== k);
        const g = y => {
          const th = [...warm];
          th[k] = v;
          others.forEach((j, i) => (th[j] = y[i]));
          return th;
        };
        const r = nelderMead(
          y => full(g(y)),
          others.map(j => warm[j]),
          others.map(j => [0.04, 0.1, 0.03, 0.1][j]),
          90
        );
        evals += r.evals;
        warm = g(r.x);
        pts.push({ value: v, chi2: r.f });
      }
    };
    run(lo);
    run(hi);
    pts.push({ value: best.x[k], chi2: best.f });
    pts.sort((a, b) => a.value - b.value);
    const dMin = Math.min(best.f, ...pts.map(p => p.chi2));
    const iv = profileInterval(pts, dMin, { level: K.ONE_SIGMA });
    intervals[name] =
      iv.status === 'ok'
        ? { lo: iv.lo, hi: iv.hi, closed: iv.lo !== null && iv.hi !== null }
        : { lo: null, hi: null, closed: false };
  }
  return {
    best: Object.fromEntries(NAMES.map((n, i) => [n, best.x[i]])),
    deviance: best.f,
    intervals,
    evals,
  };
}

// ---- synthetic ensembles ---------------------------------------------------------------------
function drawGate(spec, seed, label) {
  const sel = spec.selection ?? { g50: 19.0, width: 0.5 };
  const d = K.drawCluster(
    set,
    {
      ...spec.truth,
      N: spec.N,
      epsTrue: spec.epsTrue,
      fb: spec.fb,
      selection: sel,
    },
    THR.seeds.ensemble,
    label,
    seed
  );
  const norm = gaussian(
    stream('forward', THR.seeds.ensemble, label, seed, 'rv')
  );
  const rv = Float64Array.from(
    d.member,
    m => (m ? 75 + 3 * norm() : 20 + 60 * norm()) + 3 * norm()
  );
  return { g: d.g, c: d.colour, rv, truth: spec.truth };
}
const ens = (name, extra = {}) => ({
  ...THR.synthetic.ensembles[name],
  ...extra,
});
function runEnsemble(name, spec, n, opts = {}) {
  n = +process.env.GATE_N || n;
  const file = cacheDir
    ? path.join(cacheDir, `${name}${opts.threeParameter ? '-3' : ''}.json`)
    : null;
  const out =
    file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  if (file) mkdirSync(cacheDir, { recursive: true });
  for (let i = out.length; i < n; i++) {
    const d = drawGate(spec, i, name);
    const selFn = logisticCompleteness({ m50: 19.0, width: 0.5 });
    const data = dataOf(d.g, d.c, d.rv, selFn);
    out.push(fitGate(data, { ...opts, dmCentre: spec.truth.dm }));
    if (file && (i % 5 === 4 || i === n - 1))
      writeFileSync(file, JSON.stringify(out));
    if (args.includes('--progress')) console.error(name, i + 1);
  }
  return out.slice(0, n);
}
const holds = (r, k, v) =>
  r.intervals[k]?.closed && r.intervals[k].lo <= v && v <= r.intervals[k].hi;
const rows = [];
const row = (id, pass, measured) => {
  rows.push({ id, status: pass ? 'pass' : 'fail', measured });
  console.error(id, pass ? 'pass' : 'FAIL');
};
const report = (id, measured) => {
  rows.push({ id, status: 'report', measured });
  console.error(id, 'report');
};
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1];

let well, interior;
if (wanted('G1') || wanted('G2')) {
  const L = lim('G1.coverage4');
  const e = THR.synthetic.ensembles.well;
  well = runEnsemble('well', e, L.n);
  const cov = Object.fromEntries(
    L.parameters.map(k => [
      k,
      well.filter(r => holds(r, k, e.truth[k])).length / well.length,
    ])
  );
  if (wanted('G1'))
    row(
      'G1.coverage4',
      L.parameters.every(k => cov[k] >= L.lo && cov[k] <= L.hi),
      {
        coverage: cov,
        band: [L.lo, L.hi],
        medianBias: Object.fromEntries(
          L.parameters.map(k => [
            k,
            median(well.map(r => r.best[k])) - e.truth[k],
          ])
        ),
      }
    );
  if (wanted('G2')) {
    const L2 = lim('G2.closed');
    const c =
      well.filter(r => NAMES.every(k => r.intervals[k].closed)).length /
      well.length;
    row('G2.closed', c >= L2.minClosed, {
      closed: c,
      perParameter: Object.fromEntries(
        NAMES.map(k => [
          k,
          well.filter(r => r.intervals[k].closed).length / well.length,
        ])
      ),
    });
  }
}
if (wanted('G3') || wanted('H1') || wanted('H2')) {
  const e = THR.synthetic.ensembles.interior;
  if (wanted('G3')) {
    const L = lim('G3.interior');
    interior = runEnsemble('interior', e, L.n);
    const cov = Object.fromEntries(
      L.parameters.map(k => [
        k,
        interior.filter(r => holds(r, k, e.truth[k])).length / interior.length,
      ])
    );
    row(
      'G3.interior',
      L.parameters.every(k => cov[k] >= L.lo && cov[k] <= L.hi),
      {
        coverage: cov,
        band: [L.lo, L.hi],
        medianBias: Object.fromEntries(
          NAMES.map(k => [k, median(interior.map(r => r.best[k])) - e.truth[k]])
        ),
      }
    );
  }
  if (wanted('H1') || wanted('H2')) {
    const L = lim('H1.coverage3');
    const three = runEnsemble('interior', e, L.n, { threeParameter: true });
    const cov = Object.fromEntries(
      L.parameters.map(k => [
        k,
        three.filter(r => holds(r, k, e.truth[k])).length / three.length,
      ])
    );
    if (wanted('H1'))
      row(
        'H1.coverage3',
        L.parameters.every(k => cov[k] >= L.lo && cov[k] <= L.hi),
        {
          coverage: cov,
          band: [L.lo, L.hi],
          medianBias: Object.fromEntries(
            L.parameters.map(k => [
              k,
              median(three.map(r => r.best[k])) - e.truth[k],
            ])
          ),
        }
      );
    if (wanted('H2')) {
      const L2 = lim('H2.closed3');
      const c =
        three.filter(r => L.parameters.every(k => r.intervals[k].closed))
          .length / three.length;
      row('H2.closed3', c >= L2.minClosed, { closed: c });
    }
  }
}
for (const [id, name] of [
  ['G5', 'binariesWrong'],
  ['G6', 'selectionWrong'],
])
  if (wanted(id)) {
    const e = THR.synthetic.ensembles[name];
    const r = runEnsemble(name, e, e.n);
    report(id === 'G5' ? 'G5.binariesWrong' : 'G6.selectionWrong', {
      coverage: Object.fromEntries(
        NAMES.map(k => [
          k,
          r.filter(x => holds(x, k, e.truth[k])).length / r.length,
        ])
      ),
      medianBias: Object.fromEntries(
        NAMES.map(k => [k, median(r.map(x => x.best[k])) - e.truth[k]])
      ),
    });
  }
if (wanted('G4') || wanted('H3')) {
  const t = tableOf(SEGUE);
  const c = id => t.columns.find(x => x.id === id).values;
  const g = [],
    col = [],
    rv = [];
  for (let i = 0; i < t.n; i++) {
    if (
      Number.isFinite(c('g')[i]) &&
      Number.isFinite(c('r')[i]) &&
      Number.isFinite(c('rv')[i]) &&
      c('g')[i] >= 14.5 &&
      c('g')[i] < 20.5
    ) {
      g.push(c('g')[i]);
      col.push(c('g')[i] - c('r')[i]);
      rv.push(c('rv')[i]);
    }
  }
  const data = dataOf(g, col, rv, ASSUMED_SEL);
  const ov = (iv, [a, b]) => iv.closed && iv.lo <= b && iv.hi >= a;
  const L = lim('G4.authentic');
  const age = x => 10 ** (x - 9);
  if (wanted('G4')) {
    const r = fitGate(data, { dmCentre: 12.2 });
    const a = r.intervals.logAge;
    row(
      'G4.authentic',
      NAMES.every(k => r.intervals[k].closed) &&
        a.closed &&
        age(a.lo) <= L.ageRangeGyr[1] &&
        age(a.hi) >= L.ageRangeGyr[0] &&
        ov(r.intervals.dm, L.dmRange) &&
        ov(r.intervals.feh, L.fehRange),
      {
        stars: data.n,
        best: r.best,
        intervals: r.intervals,
        ageGyr: a.closed ? [age(a.lo), age(r.best.logAge), age(a.hi)] : null,
      }
    );
  }
  if (wanted('H3')) {
    const r = fitGate(data, { threeParameter: true, dmCentre: 12.2 });
    const a = r.intervals.logAge;
    row(
      'H3.authentic',
      a.closed &&
        r.intervals.dm.closed &&
        age(a.lo) <= L.ageRangeGyr[1] &&
        age(a.hi) >= L.ageRangeGyr[0] &&
        ov(r.intervals.dm, L.dmRange),
      {
        stars: data.n,
        best: r.best,
        intervals: r.intervals,
        ageGyr: a.closed ? [age(a.lo), age(r.best.logAge), age(a.hi)] : null,
      }
    );
  }
}
const by = id => rows.find(r => r.id === id)?.status;
const A = ['G1.coverage4', 'G2.closed', 'G3.interior', 'G4.authentic'].every(
  id => by(id) === 'pass'
);
const B = ['H1.coverage3', 'H2.closed3', 'H3.authentic'].every(
  id => by(id) === 'pass'
);
const verdict = A ? 'A' : B ? 'B' : 'C';
if (args.includes('--json'))
  console.log(
    JSON.stringify(
      { node: process.version, rows, verdict: !only ? verdict : 'partial' },
      null,
      2
    )
  );
else {
  for (const r of rows)
    console.log(
      r.status.padEnd(7),
      r.id.padEnd(20),
      JSON.stringify(r.measured).slice(0, 260)
    );
  console.log('verdict', only ? 'partial run' : verdict);
}
