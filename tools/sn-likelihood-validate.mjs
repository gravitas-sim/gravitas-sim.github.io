#!/usr/bin/env node
// SPIKE (Prompt 256 Part A): the gate stream. Never merged.
// Reads every bound from tests/fixtures/supernova-likelihood/thresholds.json
// (its legs and the verdict function), the oracle's pinned output, and the
// pack of the tree; runs the prototype once; writes results.json and
// failed-legs.json.   node tools/sn-likelihood-validate.mjs <outdir> [--only id,id]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadPantheonPlus } from '../js/cosmologyData.js';
import { createFriedmann } from '../js/kernels/cosmology/late/index.js';
import { invertSpd } from '../js/numeric/linalg.js';
import { gaussLegendre } from '../js/numeric/quadrature.js';
import { stream, gaussian } from '../js/random/streams.js';
import { chi2Quantile, profileInterval } from '../js/kernels/statistics/index.js';
import {
  TAU,
  OFFSET,
  PK,
  PLANES,
  deltaOf,
  sampleOf,
  subset,
  muTheory,
  paramsOf,
  nodeDomain,
  makeTreatment,
  chi2Whitened,
  chi2Resid,
  evaluator,
  nelderMead,
  golden,
  edgesOf,
  regionClosed,
  sliceCrossings,
  conditionEstimate,
} from '../js/kernels/cosmology/likelihood/snLikelihood.js';

const OUT = process.argv[2];
if (!OUT) throw new Error('usage: sn-likelihood-validate.mjs <outdir>');
mkdirSync(OUT, { recursive: true });
const FIX = 'tests/fixtures/supernova-likelihood';
const thrText = readFileSync(`${FIX}/thresholds.json`);
const THR = JSON.parse(thrText);
const THR_SHA = createHash('sha256').update(thrText).digest('hex');
const ORACLE_PATH = process.env.ORACLE ?? `${FIX}/oracle-results.json`;
const ORACLE_SHA = createHash('sha256').update(readFileSync(ORACLE_PATH)).digest('hex');
const O = JSON.parse(readFileSync(ORACLE_PATH, 'utf8'));
const log = (...a) => console.error(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const T0 = Date.now();
const cpu = () => {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
};

if (O.thresholdsSha256 !== THR_SHA)
  throw new Error(`the oracle was run against a different thresholds file: ${O.thresholdsSha256} vs ${THR_SHA}`);

const fetchFile = async url => {
  const text = readFileSync(url.replace(/^\//, ''), 'utf8');
  return { ok: true, json: async () => JSON.parse(text) };
};
const pp = await loadPantheonPlus(fetchFile);
const packRecord = JSON.parse(readFileSync('data-packs/pantheon-plus-hd.json', 'utf8'));
const S = sampleOf(pp);
const N = S.n;
const zmax = S.z[N - 1];
const ALL = Array.from({ length: N }, (_, i) => i);

// -------------------------------------------------------------- rows
const rows = [];
const checkOf = Object.fromEntries(THR.checks.map(c => [c.id, c]));
function push(id, treat, status, measured, bound) {
  const c = checkOf[id];
  const rid = treat ? `${id}.${treat}` : id;
  rows.push({
    id: rid,
    base: id,
    set: c.set,
    group: treat ?? null,
    status,
    measured,
    bound: bound ?? c.bound,
  });
  log(`${rid}: ${status}`);
}
const verdictOf = ok => (ok ? 'pass' : 'fail');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const want = id => ONLY.length === 0 || ONLY.includes(id);
const relDiff = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const maxAbs = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

// -------------------------------------------------------------- node tables and treatments
const TREATS = ['diag', 'cov'];
const treatmentOf = {};
for (const t of TREATS) {
  treatmentOf[t] = makeTreatment(t, S, { timing: false });
  log(`treatment ${t}: ${treatmentOf[t].status} factor ${treatmentOf[t].factorSeconds?.toFixed(2)} cpu s`);
}

const tables = {};
function nodeTable(kind) {
  if (tables[kind]) return tables[kind];
  const a = PLANES[kind].a;
  const b = PLANES[kind].b;
  const n2 = b ? b.length : 1;
  const n1 = a.length;
  const accepted = new Uint8Array(n1 * n2);
  const raw = new Uint8Array(n1 * n2);
  const marginal = new Uint8Array(n1 * n2);
  const mu = new Array(n1 * n2).fill(null);
  for (let i = 0; i < n1; i++)
    for (let j = 0; j < n2; j++) {
      const k = i * n2 + j;
      const d = nodeDomain(kind, a[i], b ? b[j] : null, zmax);
      raw[k] = d.raw ? 1 : 0;
      marginal[k] = d.marginal ? 1 : 0;
      accepted[k] = d.refused ? 0 : 1;
      if (accepted[k]) {
        const [Om, Ode, w] = paramsOf(kind, a[i], b ? b[j] : null);
        mu[k] = muTheory(S.z, Om, Ode, w);
      }
    }
  tables[kind] = { n1, n2, accepted, raw, marginal, mu };
  log(`node table ${kind}: ${accepted.reduce((s, v) => s + v, 0)} of ${n1 * n2} accepted`);
  return tables[kind];
}
const refusedString = tb => Array.from(tb.accepted, v => (v ? '0' : '1')).join('');

/** A dataset: rows of S, observed mu aligned with the rows. */
function analyse(name, rowsIdx, muData, T, kinds, { slices = true } = {}) {
  const out = {};
  const ev = evaluator(T, S, rowsIdx, muData);
  const u = T.whiten(muData);
  const whitenNode = m => T.whiten(Float64Array.from(rowsIdx, i => m[i]));
  for (const kind of kinds) {
    const tb = nodeTable(kind);
    const V = tb.mu.map(m => (m ? whitenNode(m) : null));
    const chi = new Float64Array(tb.n1 * tb.n2).fill(Infinity);
    for (let k = 0; k < chi.length; k++) if (V[k]) chi[k] = chi2Whitened(T, u, V[k]);
    let kbest = 0;
    for (let k = 1; k < chi.length; k++) if (chi[k] < chi[kbest]) kbest = k;
    if (kind === 'L1') {
      const a = PLANES.L1.a;
      const lo = a[Math.max(kbest - 1, 0)];
      const hi = a[Math.min(kbest + 1, a.length - 1)];
      const g = golden(x => ev('L1', x, null), lo, hi, 1e-12);
      const best = Math.min(g.fun, chi[kbest]);
      const position = g.fun <= chi[kbest] ? g.x : a[kbest];
      const f = x => ev('L1', x, null);
      const scanVals = Array.from({ length: 401 }, (_, i) => f(i / 400));
      const intervals = {};
      for (const [lv, d] of [
        ['d1', 1],
        ['d4', 4],
        ['d9', 9],
      ]) {
        const L = best + d;
        const crossings = sliceCrossings(f, 0, 1, [L])[0];
        intervals[lv] = {
          crossings,
          lowerOpen: !(Number.isFinite(scanVals[0]) && scanVals[0] > L),
          upperOpen: !(Number.isFinite(scanVals[400]) && scanVals[400] > L),
        };
      }
      const edges = [1, 4].map(d =>
        edgesOf(chi, tb.accepted, tb.n1, 1, best + d).map(([i, j, dir, fr]) => [i, j, dir, fr])
      );
      out.L1 = { chi, best, position, intervals, edges };
    } else {
      const a = PLANES[kind].a;
      const b = PLANES[kind].b;
      const i0 = Math.floor(kbest / tb.n2);
      const j0 = kbest % tb.n2;
      const ha = i0 + 1 < tb.n1 ? a[1] - a[0] : -(a[1] - a[0]);
      const hb = j0 + 1 < tb.n2 ? b[1] - b[0] : -(b[1] - b[0]);
      const x0 = [a[i0], b[j0]];
      const res = nelderMead(th => ev(kind, th[0], th[1]), [x0, [x0[0] + ha, x0[1]], [x0[0], x0[1] + hb]]);
      const best = Math.min(res.fun, chi[kbest]);
      const position = res.fun <= chi[kbest] ? res.x : x0;
      const levels = [0, 1, 2].map(k => best + deltaOf(PK[k], 2));
      const edges = levels.map(L => edgesOf(chi, tb.accepted, tb.n1, tb.n2, L));
      const closed = levels.map(L => regionClosed(chi, tb.accepted, tb.n1, tb.n2, L));
      const rec = { chi, best, position, edges, closed, nfev: res.nfev };
      if (slices) {
        const specs =
          kind === 'P1'
            ? [
                { key: 'Om=0.3', fixed: 0.3, vary: 1, lo: 0, hi: 1.5 },
                { key: 'Ode=0.7', fixed: 0.7, vary: 0, lo: 0, hi: 1 },
              ]
            : [
                { key: 'Om=0.3', fixed: 0.3, vary: 1, lo: -3, hi: 0 },
                { key: 'w=-1', fixed: -1, vary: 0, lo: 0, hi: 1 },
              ];
        rec.slices = specs.map(sp => {
          const f = x => (sp.vary === 1 ? ev(kind, sp.fixed, x) : ev(kind, x, sp.fixed));
          return { key: sp.key, crossings: sliceCrossings(f, sp.lo, sp.hi, levels.slice(0, 2)) };
        });
      }
      out[kind] = rec;
    }
  }
  return out;
}

// -------------------------------------------------------------- comparisons with the oracle
function compareAnalysis(mine, theirs, kinds, { tolChi = 1e-6, tolF = 1e-4, tolX = 1e-6 } = {}) {
  const m = {
    chiMax: 0,
    nodes: 0,
    setMismatch: 0,
    minDiff: 0,
    edgeSets: true,
    edgeFMax: 0,
    sliceCountOk: true,
    sliceMax: 0,
    closedEqual: true,
    notes: [],
  };
  for (const kind of kinds) {
    const mi = mine[kind];
    const th = theirs[kind];
    const tb = nodeTable(kind);
    for (let k = 0; k < mi.chi.length; k++) {
      const oc = th.chi2[k];
      const jsAcc = tb.accepted[k] === 1;
      if (jsAcc !== (oc !== null)) {
        m.setMismatch++;
        continue;
      }
      if (jsAcc) {
        m.nodes++;
        m.chiMax = Math.max(m.chiMax, Math.abs(mi.chi[k] - oc));
      }
    }
    m.minDiff = Math.max(m.minDiff, Math.abs(mi.best - th.best));
    const edgeLists = kind === 'L1' ? [mi.edges, th.edges] : [mi.edges, th.edges];
    edgeLists[0].forEach((mine_, lv) => {
      const A = new Map(mine_.map(([i, j, d, f]) => [`${i},${j},${d}`, f]));
      const B = new Map(edgeLists[1][lv].map(([i, j, d, f]) => [`${i},${j},${d}`, f]));
      if (A.size !== B.size || [...A.keys()].some(k => !B.has(k))) {
        m.edgeSets = false;
        m.notes.push(`${kind} level ${lv}: ${A.size} vs ${B.size} edges`);
      } else for (const [k, f] of A) m.edgeFMax = Math.max(m.edgeFMax, Math.abs(f - B.get(k)));
    });
    if (kind !== 'L1') {
      for (let lv = 0; lv < 3; lv++) if (mi.closed[lv] !== th.closed[lv]) m.closedEqual = false;
      if (mi.slices && th.slices)
        mi.slices.forEach((sl, s) =>
          sl.crossings.forEach((cr, lv) => {
            const oc = th.slices[s].crossings[lv];
            if (cr.length !== oc.length) m.sliceCountOk = false;
            else cr.forEach((x, q) => (m.sliceMax = Math.max(m.sliceMax, Math.abs(x - oc[q]))));
          })
        );
    } else {
      for (const lv of ['d1', 'd4']) {
        const a = mi.intervals[lv];
        const b = th.intervals[lv];
        if (a.crossings.length !== b.crossings.length || a.lowerOpen !== b.lowerOpen || a.upperOpen !== b.upperOpen)
          m.sliceCountOk = false;
        else a.crossings.forEach((x, q) => (m.sliceMax = Math.max(m.sliceMax, Math.abs(x - b.crossings[q]))));
      }
    }
  }
  m.pass = {
    chi: m.chiMax <= tolChi && m.setMismatch === 0,
    minimum: m.minDiff <= tolChi,
    crossings: m.edgeSets && m.edgeFMax <= tolF && m.closedEqual,
    slices: m.sliceCountOk && m.sliceMax <= tolX,
  };
  return m;
}

// -------------------------------------------------------------- the legs
const PARAM_SETS = [
  ['flat 0.3/0.7', 'P1', 0.3, 0.7],
  ['flat Om 0.1', 'P1', 0.1, 0.9],
  ['open 0.3/0', 'P1', 0.3, 0.0],
  ['closed 0.3/1.1', 'P1', 0.3, 1.1],
  ['w -0.7', 'P2', 0.3, -0.7],
  ['w -1.5', 'P2', 0.3, -1.5],
];
const setModel = (kind, a, b) => {
  const [Om, Ode, w] = paramsOf(kind, a, b);
  return muTheory(S.z, Om, Ode, w);
};

// ---- M0.data
if (want('M0.data')) {
  const raw = readFileSync('tools/data-packs/cosmology/Pantheon+SH0ES.dat');
  const rawSha = createHash('sha256').update(raw).digest('hex');
  const rec = packRecord.raw[0].sha256;
  let dz = 0;
  let dmu = 0;
  let derr = 0;
  let flags = 0;
  const so = O.sample;
  if (so.z.length !== N) flags++;
  for (let i = 0; i < Math.min(N, so.z.length); i++) {
    dz = Math.max(dz, Math.abs(S.z[i] - so.z[i]));
    dmu = Math.max(dmu, Math.abs(S.mu[i] - so.mu[i]));
    derr = Math.max(derr, Math.abs(S.sigma[i] - so.err[i]));
    if (S.survey[i] !== so.survey[i]) flags++;
  }
  const ok = dz <= 0.5e-5 + 1e-12 && dmu <= 0.5e-4 + 1e-12 && derr <= 0.5e-6 + 1e-12 && flags === 0 && rawSha === rec && rawSha === O.data.rawSha256 && N >= 1000;
  push('M0.data', 'diag', verdictOf(ok), { N, dz, dmu, derr, flags, rawSha256: rawSha, packRecordSha256: rec, oracleSha256: O.data.rawSha256, calibratorsInRaw: O.data.calibrators, rawRows: O.data.rawRows, minSigma: O.data.minSigma });
}

// ---- A1, A2
if (want('A1.eds')) {
  const zs = Array.from({ length: 40 }, (_, i) => 0.01 + ((2.3 - 0.01) * i) / 39);
  const mu = muTheory(Float64Array.from(zs), 1, 0, -1);
  let worst = 0;
  zs.forEach((z, i) => {
    const dl = Math.pow(10, (mu[i] - 25) / 5);
    const exact = ((2 * 299792.458) / 70) * (1 + z) * (1 - 1 / Math.sqrt(1 + z));
    worst = Math.max(worst, Math.abs(dl - exact) / exact);
  });
  push('A1.eds', 'diag', verdictOf(worst <= 1e-10), { maxRelative: worst });
}
if (want('A2.kernel')) {
  let worst = 0;
  for (const [name, kind, a, b] of PARAM_SETS) {
    const [Om, Ode, w] = paramsOf(kind, a, b);
    const c = createFriedmann({ H0: 70, Om, Ode, w });
    const mu = muTheory(S.z, Om, Ode, w);
    for (let i = 0; i < N; i++) {
      const dl = c.luminosityDistance(S.z[i]);
      worst = Math.max(worst, Math.abs(mu[i] - (5 * Math.log10(dl) + 25)));
    }
  }
  push('A2.kernel', 'diag', verdictOf(worst <= 1e-9), { maxAbsMag: worst, sets: PARAM_SETS.length });
}
if (want('B1.dist')) {
  let worst = 0;
  PARAM_SETS.forEach(([name, kind, a, b], s) => {
    const mu = setModel(kind, a, b);
    const om = O.distanceSets[s].mu;
    for (let i = 0; i < N; i++) worst = Math.max(worst, Math.abs(mu[i] - om[i]));
  });
  push('B1.dist', 'diag', verdictOf(worst <= 1e-8), { maxAbsMag: worst });
}

// ---- A3, A4, A5, A11 (both treatments)
const thetas = (() => {
  const draw = stream('noise', 256001, 'theta');
  const list = [];
  let guard = 0;
  while (list.length < 10 && guard++ < 200) {
    const Om = 0.1 + 0.5 * draw();
    const Ode = 0.3 + 0.7 * draw();
    if (!nodeDomain('P1', Om, Ode, zmax).refused) list.push([Om, Ode]);
  }
  return list;
})();
for (const t of TREATS) {
  const T = treatmentOf[t];
  if (T.status !== 'ok') continue;
  const u = T.whiten(S.mu);
  if (want('A3.marg')) {
    let worst = 0;
    for (const [Om, Ode] of thetas) {
      const m = setModel('P1', Om, Ode);
      const r = Float64Array.from(S.mu, (v, i) => v - m[i]);
      const closed = chi2Resid(T, r);
      const ur = T.whiten(r);
      const f = D => {
        let s = 0;
        for (let i = 0; i < ur.length; i++) s += (ur[i] - D * T.e[i]) ** 2;
        return s;
      };
      const mean = r.reduce((s, v) => s + v, 0) / N;
      const g = golden(f, mean - 1, mean + 1, 1e-13);
      worst = Math.max(worst, relDiff(closed, g.fun));
    }
    push('A3.marg', t, verdictOf(worst <= 1e-9), { maxRelative: worst, thetas: thetas.length });
  }
  if (want('A4.shift')) {
    let worst = 0;
    for (const [Om, Ode] of thetas.slice(0, 3)) {
      const m = setModel('P1', Om, Ode);
      const base = chi2Resid(T, Float64Array.from(S.mu, (v, i) => v - m[i]));
      const shifted = chi2Resid(T, Float64Array.from(S.mu, (v, i) => v + 0.5 - m[i]));
      const h0 = chi2Resid(T, Float64Array.from(S.mu, (v, i) => v - (m[i] - 5 * Math.log10(73 / 70))));
      worst = Math.max(worst, relDiff(shifted, base), relDiff(h0, base));
    }
    push('A4.shift', t, verdictOf(worst <= 1e-10), { maxRelative: worst });
  }
  if (want('A5.perfect')) {
    const m = setModel('P1', 0.3, 0.7);
    const perfect = Float64Array.from(m, v => v + OFFSET);
    const Tt = t === 'diag' ? treatmentOf.diag : treatmentOf.cov;
    const c0 = chi2Resid(Tt, Float64Array.from(perfect, (v, i) => v - m[i]));
    const m2 = setModel('P1', 0.35, 0.7);
    const c1 = chi2Resid(Tt, Float64Array.from(perfect, (v, i) => v - m2[i]));
    push('A5.perfect', t, verdictOf(Math.abs(c0) <= 1e-9 && c1 >= 1), { chi2AtTruth: c0, chi2AtOm035: c1 });
  }
  if (want('A11.constant')) {
    const m = setModel('P1', 0.3, 0.7);
    const r = Float64Array.from(S.mu, (v, i) => v - m[i]);
    const marg = chi2Resid(T, r);
    const ur = T.whiten(r);
    let eu = 0;
    for (let i = 0; i < ur.length; i++) eu += T.e[i] * ur[i];
    const dstar = eu / T.ee;
    const half = 14 / Math.sqrt(T.ee);
    const integrand = D => {
      let s = 0;
      for (let i = 0; i < ur.length; i++) s += (ur[i] - D * T.e[i]) ** 2;
      return Math.exp(-(s - marg) / 2);
    };
    const val = gaussLegendre(integrand, dstar - half, dstar + half, 40);
    const exact = Math.sqrt((2 * Math.PI) / T.ee);
    push('A11.constant', t, verdictOf(Math.abs(val - exact) / exact <= 1e-8), { integral: val, closedForm: exact, relative: Math.abs(val - exact) / exact });
  }
}

// ---- A6 levels
if (want('A6.levels')) {
  let worst = 0;
  const rep = [];
  for (let k = 1; k <= 3; k++) {
    const p = PK[k - 1];
    const d2 = deltaOf(p, 2);
    const d1 = deltaOf(p, 1);
    worst = Math.max(
      worst,
      relDiff(d2, -2 * Math.log(1 - p)),
      relDiff(d2, O.levels.d2Scipy[k - 1]),
      relDiff(d1, k * k),
      relDiff(d1, O.levels.d1Scipy[k - 1]),
      relDiff(p, O.levels.pk[k - 1])
    );
    rep.push({ k, p, d2, d1 });
  }
  push('A6.levels', 'diag', verdictOf(worst <= 1e-9), { maxRelative: worst, levels: rep });
}

// ---- A7, A8, A9, A10, A12 (cov)
const woodburyChi2 = (T, r) => {
  const n = T.n;
  const s2 = T.sigma;
  const t2 = T.tau * T.tau;
  const Dp = Float64Array.from(s2, (s, i) => s * s);
  for (const g of T.groups) for (const i of g) Dp[i] = s2[i] * s2[i] - t2;
  const inGroup = new Array(n).fill(-1);
  T.groups.forEach((g, q) => g.forEach(i => (inGroup[i] = q)));
  const apply = v => {
    const x = Float64Array.from(v, (val, i) => val / Dp[i]);
    T.groups.forEach(g => {
      let sg = 0;
      let sv = 0;
      for (const i of g) {
        sg += 1 / Dp[i];
        sv += v[i] / Dp[i];
      }
      const c = t2 / (1 + t2 * sg);
      for (const i of g) x[i] -= (c * sv) / Dp[i];
    });
    return x;
  };
  const ones = new Float64Array(n).fill(1);
  const Cr = apply(r);
  const C1 = apply(ones);
  let rCr = 0;
  let oCr = 0;
  let oC1 = 0;
  for (let i = 0; i < n; i++) {
    rCr += r[i] * Cr[i];
    oCr += Cr[i];
    oC1 += C1[i];
  }
  return rCr - (oCr * oCr) / oC1;
};

if (treatmentOf.cov.status === 'ok') {
  const Tc = treatmentOf.cov;
  if (want('A7.small')) {
    const idx = Array.from({ length: 30 }, (_, i) => i * Math.floor(N / 30));
    const sub = subset(S, idx);
    const T30 = makeTreatment('cov', sub, { timing: true });
    let worst = 0;
    for (const [Om, Ode] of thetas.slice(0, 3)) {
      const m = setModel('P1', Om, Ode);
      const r = Float64Array.from(idx, i => S.mu[i] - m[i]);
      const a = chi2Resid(T30, r);
      const inv = invertSpd(T30.A);
      const Cir = inv.map(row => row.reduce((s, v, j) => s + v * r[j], 0));
      const Ci1 = inv.map(row => row.reduce((s, v) => s + v, 0));
      let rCr = 0;
      let oCr = 0;
      let oC1 = 0;
      for (let i = 0; i < 30; i++) {
        rCr += r[i] * Cir[i];
        oCr += Cir[i];
        oC1 += Ci1[i];
      }
      const b = rCr - (oCr * oCr) / oC1;
      const c = woodburyChi2(T30, r);
      worst = Math.max(worst, relDiff(a, b), relDiff(a, c));
    }
    push('A7.small', 'cov', verdictOf(worst <= 1e-10), { maxRelative: worst, groups: T30.groups.length });
  }
  if (want('A8.woodbury')) {
    let worst = 0;
    for (const [name, kind, a, b] of PARAM_SETS.slice(0, 5)) {
      const m = setModel(kind, a, b);
      const r = Float64Array.from(S.mu, (v, i) => v - m[i]);
      worst = Math.max(worst, relDiff(chi2Resid(Tc, r), woodburyChi2(Tc, r)));
    }
    push('A8.woodbury', 'cov', verdictOf(worst <= 1e-9), { maxRelative: worst });
  }
  if (want('A9.pd')) {
    const minSigmaInGroups = Math.min(...Tc.groups.flatMap(g => g.map(i => S.sigma[i])));
    const draw = stream('noise', 256002, 'rows');
    const n = N;
    const groupOf = new Map();
    Tc.groups.forEach((g, q) => g.forEach(i => groupOf.set(i, q)));
    let worst = 0;
    for (let q = 0; q < 200; q++) {
      const i = Math.floor(draw() * n);
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let k = 0; k <= Math.min(i, j); k++) s += Tc.L[i * n + k] * Tc.L[j * n + k];
        const c = i === j ? S.sigma[i] ** 2 : groupOf.has(i) && groupOf.get(i) === groupOf.get(j) ? TAU * TAU : 0;
        worst = Math.max(worst, Math.abs(s - c));
      }
    }
    push('A9.pd', 'cov', verdictOf(minSigmaInGroups > TAU && worst <= 1e-12), { minSigmaInGroups, tau: TAU, maxResidual: worst, groups: Tc.groups.length });
  }
  if (want('A10.condition')) {
    const draw = stream('noise', 256003, 'start');
    const start = Float64Array.from({ length: N }, () => 0.5 + draw());
    const est = conditionEstimate(Tc, start);
    const estD = conditionEstimate(treatmentOf.diag, start);
    const rel = Math.abs(est.cond / O.condition.cov.cond - 1);
    push('A10.condition', 'cov', verdictOf(rel <= 0.01 && O.condition.cov.cond <= 1e6 && est.cond <= 1e6), {
      estimate: est,
      oracle: O.condition.cov,
      relative: rel,
      diagEstimate: estD.cond,
      diagOracle: O.condition.diag.cond,
    });
  }
  if (want('A12.factor')) {
    push('A12.factor', 'cov', verdictOf(Tc.factorSeconds <= 30), { factorCpuSeconds: Tc.factorSeconds, n: N }, 'at most 30 CPU seconds');
  }
  if (want('S1.size')) {
    push('S1.size', 'cov', verdictOf(Tc.status === 'ok'), { addedDataBytes: 0, constants: 2, note: 'the survey code is a pack column; tau and the rule are the only constants' });
  }
}

// ---- B2..B8 on the real sample
const realAnalysis = {};
const KINDS = ['L1', 'P1', 'P2'];
for (const t of TREATS) {
  const T = treatmentOf[t];
  if (T.status !== 'ok') continue;
  if (!['B2.nodes', 'B3.domain', 'B4.minimum', 'B5.crossings', 'B6.slices', 'B7.profile', 'E1.realConstrained', 'D2.contourOpen', 'E2.real', 'E5.chi2dof', 'P1.time', 'C1.coverL1', 'C2.coverP1', 'C3.coverP2'].some(want)) continue;
  const t1 = cpu();
  realAnalysis[t] = analyse('real', ALL, S.mu, T, KINDS);
  realAnalysis[t].cpuSeconds = cpu() - t1;
  log(`real analysis ${t}: ${realAnalysis[t].cpuSeconds.toFixed(1)} cpu s`);
}
const realCmp = {};
for (const t of Object.keys(realAnalysis)) realCmp[t] = compareAnalysis(realAnalysis[t], O.analyses[`real.${t}`], KINDS);

if (want('B3.domain')) {
  const det = {};
  let disagreements = 0;
  for (const kind of ['P1', 'P2']) {
    const tb = nodeTable(kind);
    const oracleRaw = O.planes[kind].rawRefused;
    const oracleFinal = O.planes[kind].refused;
    const marg = new Set([...O.planes[kind].marginalNodes, ...O.planes[kind].nonFiniteNodes]);
    let dis = 0;
    let excluded = 0;
    for (let k = 0; k < tb.accepted.length; k++) {
      if (marg.has(k) || tb.marginal[k]) {
        excluded++;
        continue;
      }
      const kernelRefused = tb.raw[k] === 1;
      if (kernelRefused !== (oracleRaw[k] === '1')) dis++;
    }
    let finalDis = 0;
    for (let k = 0; k < tb.accepted.length; k++) if ((tb.accepted[k] === 0) !== (oracleFinal[k] === '1')) finalDis++;
    det[kind] = { rawDisagreements: dis, finalDisagreements: finalDis, marginalOrNonFinite: excluded };
    disagreements += dis + finalDis;
  }
  push('B3.domain', 'diag', verdictOf(disagreements === 0), det);
}
for (const t of Object.keys(realCmp)) {
  const c = realCmp[t];
  const brief = { nodes: c.nodes, chiMax: c.chiMax, setMismatch: c.setMismatch, minDiff: c.minDiff, edgeFMax: c.edgeFMax, edgeSets: c.edgeSets, closedEqual: c.closedEqual, sliceMax: c.sliceMax, sliceCountOk: c.sliceCountOk, notes: c.notes };
  if (want('B2.nodes')) push('B2.nodes', t, verdictOf(c.pass.chi), brief);
  if (want('B4.minimum'))
    push('B4.minimum', t, verdictOf(c.pass.minimum), {
      minDiff: c.minDiff,
      best: Object.fromEntries(KINDS.map(k => [k, realAnalysis[t][k].best])),
      oracleBest: Object.fromEntries(KINDS.map(k => [k, O.analyses[`real.${t}`][k].best])),
      position: Object.fromEntries(KINDS.map(k => [k, realAnalysis[t][k].position])),
      oraclePosition: Object.fromEntries(KINDS.map(k => [k, O.analyses[`real.${t}`][k].position])),
    });
  if (want('B5.crossings')) push('B5.crossings', t, verdictOf(c.pass.crossings), brief);
  if (want('B6.slices')) push('B6.slices', t, verdictOf(c.pass.slices), { sliceMax: c.sliceMax, sliceCountOk: c.sliceCountOk });
  if (want('B7.profile')) {
    const a = realAnalysis[t].L1;
    const b = O.analyses[`real.${t}`].L1;
    let worst = Math.abs(a.position - b.position) < 1 ? 0 : 1;
    let ok = true;
    for (const lv of ['d1', 'd4']) {
      const x = a.intervals[lv];
      const y = b.intervals[lv];
      if (x.crossings.length !== y.crossings.length) ok = false;
      else x.crossings.forEach((v, q) => (worst = Math.max(worst, Math.abs(v - y.crossings[q]))));
    }
    push('B7.profile', t, verdictOf(ok && worst <= 1e-6 && Math.abs(a.best - b.best) <= 1e-6), {
      positionDiff: Math.abs(a.position - b.position),
      maxCrossingDiff: worst,
      best: a.best,
      oracleBest: b.best,
      intervals: { d1: a.intervals.d1, d4: a.intervals.d4 },
    });
  }
  if (want('E1.realConstrained')) {
    const L1 = realAnalysis[t].L1;
    const d4 = L1.intervals.d4;
    const oL1 = O.analyses[`real.${t}`].L1.intervals.d4;
    const closedL1 = !d4.lowerOpen && !d4.upperOpen && d4.crossings.length === 2;
    const oClosed = !oL1.lowerOpen && !oL1.upperOpen && oL1.crossings.length === 2;
    const p1 = realAnalysis[t].P1.closed[0];
    const op1 = O.analyses[`real.${t}`].P1.closed[0];
    push('E1.realConstrained', t, verdictOf(closedL1 && oClosed && p1 && op1), { L1Closed: closedL1, oracleL1Closed: oClosed, P1_68_closed: p1, oracleP1_68_closed: op1, P1closedAllLevels: realAnalysis[t].P1.closed, P2closedAllLevels: realAnalysis[t].P2.closed });
  }
  if (want('D2.contourOpen')) {
    c.statuses = [];
  }
}

// ---- B8 synthetic, D1, D2
const synAnalysis = {};
for (const name of ['SYN300a', 'SYN300b', 'SYN300c', 'SYN12']) {
  if (!['B8.synthetic', 'D1.notConstrained', 'D2.contourOpen'].some(want)) break;
  const syn = O.synthetic[name];
  const rowsIdx = syn.rows;
  const mu = Float64Array.from(syn.mu);
  for (const t of TREATS) {
    const sub = subset(S, rowsIdx);
    const T = makeTreatment(t, sub);
    const kinds = name === 'SYN12' ? ['L1', 'P1'] : KINDS;
    const rec = analyse(name, rowsIdx, mu, T, kinds, { slices: name !== 'SYN12' });
    synAnalysis[`${name}.${t}`] = rec;
    log(`synthetic ${name}.${t} analysed`);
  }
}
if (want('B8.synthetic'))
  for (const t of TREATS) {
    let worst = { chi: 0, minimum: 0, edgeF: 0, slice: 0 };
    let ok = true;
    const notes = [];
    for (const name of ['SYN300a', 'SYN300b', 'SYN300c']) {
      const c = compareAnalysis(synAnalysis[`${name}.${t}`], O.analyses[`${name}.${t}`], KINDS);
      worst.chi = Math.max(worst.chi, c.chiMax);
      worst.minimum = Math.max(worst.minimum, c.minDiff);
      worst.edgeF = Math.max(worst.edgeF, c.edgeFMax);
      worst.slice = Math.max(worst.slice, c.sliceMax);
      if (!(c.pass.chi && c.pass.minimum && c.pass.crossings && c.pass.slices)) {
        ok = false;
        notes.push({ name, ...c.pass, setMismatch: c.setMismatch, notes: c.notes });
      }
    }
    push('B8.synthetic', t, verdictOf(ok), { worst, notes });
  }
const statusOfL1 = (rec, d = 'd4') => !(rec.intervals[d].lowerOpen || rec.intervals[d].upperOpen) && rec.intervals[d].crossings.length === 2;
if (want('D1.notConstrained'))
  for (const t of TREATS) {
    const s12 = synAnalysis[`SYN12.${t}`];
    const o12 = O.analyses[`SYN12.${t}`];
    const l1Open = !statusOfL1(s12.L1);
    const ol1Open = !statusOfL1(o12.L1);
    const p1Open = !s12.P1.closed[1];
    const op1Open = !o12.P1.closed[1];
    const s3 = synAnalysis[`SYN300a.${t}`];
    const o3 = O.analyses[`SYN300a.${t}`];
    let ok = l1Open && ol1Open && p1Open && op1Open;
    let worst = 0;
    for (const lv of ['d1', 'd4']) {
      const a = s3.L1.intervals[lv];
      const b = o3.L1.intervals[lv];
      if (a.lowerOpen !== b.lowerOpen || a.upperOpen !== b.upperOpen || a.crossings.length !== b.crossings.length) ok = false;
      else a.crossings.forEach((x, q) => (worst = Math.max(worst, Math.abs(x - b.crossings[q]))));
    }
    for (let lv = 0; lv < 3; lv++) if (s3.P1.closed[lv] !== o3.P1.closed[lv]) ok = false;
    push('D1.notConstrained', t, verdictOf(ok && worst <= 1e-6), { SYN12: { L1open: l1Open, oracleL1open: ol1Open, P1_95open: p1Open, oracleP1_95open: op1Open }, SYN300a: { maxCrossingDiff: worst, P1closed: s3.P1.closed, oracleP1closed: o3.P1.closed } });
  }
if (want('D2.contourOpen'))
  for (const t of TREATS) {
    let dis = 0;
    const table = {};
    const sets = [
      ['SYN12', synAnalysis[`SYN12.${t}`], O.analyses[`SYN12.${t}`]],
      ['SYN300a', synAnalysis[`SYN300a.${t}`], O.analyses[`SYN300a.${t}`]],
      ['real', realAnalysis[t], O.analyses[`real.${t}`]],
    ];
    for (const [name, a, b] of sets) {
      table[name] = { prototype: a.P1.closed, oracle: b.P1.closed };
      for (let lv = 0; lv < 3; lv++) if (a.P1.closed[lv] !== b.P1.closed[lv]) dis++;
    }
    push('D2.contourOpen', t, verdictOf(dis === 0), { disagreements: dis, table });
  }

// ---- ensembles (C1..C3, D3)
function ensembleTools(t) {
  const T = treatmentOf[t];
  const n = N;
  const trueModel = setModel('P1', 0.3, 0.7);
  const vt = T.whiten(trueModel);
  const draws = (seed, label, scale = 1) => {
    const g = gaussian(stream('noise', seed, label));
    return () => {
      const eps = Float64Array.from({ length: n }, g);
      const noise = new Float64Array(n);
      if (t === 'diag') for (let i = 0; i < n; i++) noise[i] = S.sigma[i] * eps[i];
      else
        for (let i = 0; i < n; i++) {
          let s = 0;
          const row = i * n;
          for (let k = 0; k <= i; k++) s += T.L[row + k] * eps[k];
          noise[i] = s;
        }
      return Float64Array.from(trueModel, (m, i) => m + OFFSET + scale * noise[i]);
    };
  };
  return { T, vt, draws };
}
const planeV = {};
function planeVectors(t, kind) {
  const key = `${t}.${kind}`;
  if (planeV[key]) return planeV[key];
  const tb = nodeTable(kind);
  const T = treatmentOf[t];
  const V = tb.mu.map(m => (m ? T.whiten(m) : null));
  planeV[key] = V;
  return V;
}
for (const t of TREATS) {
  if (treatmentOf[t].status !== 'ok') continue;
  const { T, vt, draws } = ensembleTools(t);
  const seedBase = t === 'cov' ? 2 : 1;
  if (want('C1.coverL1')) {
    const V = planeVectors(t, 'L1');
    const a = PLANES.L1.a;
    const next = draws(256100 + seedBase, 'L1');
    const cover = [0, 0];
    const widths = [];
    for (let rep = 0; rep < 200; rep++) {
      const d = next();
      const u = T.whiten(d);
      const chi = V.map(v => chi2Whitened(T, u, v));
      const pts = a.map((value, i) => ({ value, chi2: chi[i] }));
      const min = Math.min(...chi);
      [1, 4].forEach((D, lv) => {
        const r = profileInterval(pts, min, { deltaChi2: D });
        if (r.status !== 'ok') throw new Error(`profileInterval refused: ${r.code}`);
        if ((r.lo === null || r.lo <= 0.3) && (r.hi === null || r.hi >= 0.3)) cover[lv]++;
        if (lv === 0 && r.lo !== null && r.hi !== null) widths.push(r.hi - r.lo);
      });
    }
    const c = cover.map(v => v / 200);
    push('C1.coverL1', t, verdictOf(c[0] >= 0.58 && c[0] <= 0.78 && c[1] >= 0.9 && c[1] <= 0.99), { coverage68: c[0], coverage95: c[1], draws: 200, meanWidth68: widths.reduce((s, v) => s + v, 0) / Math.max(1, widths.length) });
  }
  for (const [id, kind, seed, truthSecond] of [
    ['C2.coverP1', 'P1', 256200 + seedBase, null],
    ['C3.coverP2', 'P2', 256300 + seedBase, null],
  ]) {
    if (!want(id)) continue;
    const V = planeVectors(t, kind);
    const next = draws(seed, kind);
    const cover = [0, 0];
    for (let rep = 0; rep < 100; rep++) {
      const d = next();
      const u = T.whiten(d);
      let min = Infinity;
      for (const v of V) if (v) min = Math.min(min, chi2Whitened(T, u, v));
      const dmin = chi2Whitened(T, u, vt) - min;
      [0, 1].forEach(lv => {
        if (dmin <= deltaOf(PK[lv], 2)) cover[lv]++;
      });
    }
    const c = cover.map(v => v / 100);
    push(id, t, verdictOf(c[0] >= 0.55 && c[0] <= 0.81 && c[1] >= 0.88 && c[1] <= 1.0), { coverage68: c[0], coverage95: c[1], draws: 100 });
  }
  if (want('D3.gof')) {
    const V = planeVectors(t, 'L1');
    const thr = chi2Quantile(0.999, N - 2);
    const rate = (seed, scale) => {
      const next = draws(seed, 'gof', scale);
      let flagged = 0;
      for (let rep = 0; rep < 200; rep++) {
        const u = T.whiten(next());
        let min = Infinity;
        for (const v of V) min = Math.min(min, chi2Whitened(T, u, v));
        if (min > thr) flagged++;
      }
      return flagged / 200;
    };
    const seeds = t === 'cov' ? [256401, 256402] : [256403, 256404];
    const falseAlarm = rate(seeds[0], 1);
    const detect = rate(seeds[1], 1.5);
    push('D3.gof', t, verdictOf(falseAlarm <= 0.01 && detect >= 0.99), { threshold: thr, falseAlarmRate: falseAlarm, detectionRate: detect });
  }
  if (want('C4.coverOracle')) {
    const l1 = O.ensembles[`L1.${t}`];
    const p1 = O.ensembles[`P1.${t}`];
    const ok = l1[0] >= 0.58 && l1[0] <= 0.78 && l1[1] >= 0.9 && l1[1] <= 0.99 && p1[0] >= 0.55 && p1[0] <= 0.81 && p1[1] >= 0.88 && p1[1] <= 1.0;
    push('C4.coverOracle', t, verdictOf(ok), { L1: l1, P1: p1 });
  }
}

// ---- D4, D5
if (want('D4.nonpd')) {
  const n = 12;
  const data = { n, sigma: new Float64Array(n).fill(0.05), survey: new Array(n).fill(7) };
  const bad = makeTreatment('cov', data, { tau: 0.08 });
  const good = makeTreatment('cov', data, { tau: 0.02 });
  push('D4.nonpd', 'cov', verdictOf(bad.status === 'refused' && bad.code === 'not-positive-definite' && good.status === 'ok'), { bad: { status: bad.status, code: bad.code }, good: { status: good.status } });
}
if (want('D5.inputs')) {
  const ok8 = i => Float64Array.from({ length: 8 }, () => 0.1 + i * 0);
  const cases = [
    ['non-finite', { n: 8, sigma: ok8(0), survey: new Array(8).fill(1), mu: Float64Array.from([1, 2, NaN, 4, 5, 6, 7, 8]) }],
    ['mismatch', { n: 8, sigma: ok8(0), survey: new Array(7).fill(1) }],
    ['too-few', { n: 7, sigma: ok8(0).slice(0, 7), survey: new Array(7).fill(1) }],
    ['bad-sigma', { n: 8, sigma: Float64Array.from([0.1, 0.1, 0, 0.1, 0.1, 0.1, 0.1, 0.1]), survey: new Array(8).fill(1) }],
  ];
  const got = cases.map(([code, data]) => {
    const r = makeTreatment('diag', data);
    return { want: code, code: r.code, status: r.status, hasNumber: r.chi2 !== undefined };
  });
  push('D5.inputs', 'diag', verdictOf(got.every(g => g.status === 'refused' && g.code === g.want && !g.hasNumber)), { cases: got });
}

// ---- reported legs
const published = packRecord.validation?.against?.[0] ?? null;
if (want('E2.real') && realAnalysis.diag && realAnalysis.cov) {
  const rep = {};
  for (const t of TREATS) {
    const L = realAnalysis[t].L1;
    rep[t] = {
      OmBest: L.position,
      chi2Min: L.best,
      interval68: [L.intervals.d1.lowerOpen ? null : L.intervals.d1.crossings[0], L.intervals.d1.upperOpen ? null : L.intervals.d1.crossings.at(-1)],
      interval95: [L.intervals.d4.lowerOpen ? null : L.intervals.d4.crossings[0], L.intervals.d4.upperOpen ? null : L.intervals.d4.crossings.at(-1)],
      P1best: realAnalysis[t].P1.position,
      P1chi2: realAnalysis[t].P1.best,
      P2best: realAnalysis[t].P2.position,
      P2chi2: realAnalysis[t].P2.best,
      P1closed: realAnalysis[t].P1.closed,
      P2closed: realAnalysis[t].P2.closed,
    };
  }
  const width = r => (r.interval68[0] !== null && r.interval68[1] !== null ? r.interval68[1] - r.interval68[0] : null);
  const out = { treatments: rep, widthRatioCovOverDiag: width(rep.cov) / width(rep.diag), packPublishedComparison: published };
  if (published) {
    const half = t => width(rep[t]) / 2;
    out.differenceInHalfWidths = Object.fromEntries(TREATS.map(t => [t, (rep[t].OmBest - published.value) / half(t)]));
  }
  push('E2.real', null, 'reported', out);
}
if (want('E5.chi2dof') && realAnalysis.diag && realAnalysis.cov) {
  push('E5.chi2dof', null, 'reported', Object.fromEntries(TREATS.map(t => [t, { chi2: realAnalysis[t].L1.best, dof: N - 2, perDof: realAnalysis[t].L1.best / (N - 2) }])));
}
if (want('E4.duplicates')) {
  const cid = O.sample.cid;
  const keep = new Map();
  for (let i = 0; i < N; i++) if (!keep.has(cid[i]) || S.sigma[i] < S.sigma[keep.get(cid[i])]) keep.set(cid[i], i);
  const unique = [...keep.values()].sort((a, b) => a - b);
  const out = { N, unique: unique.length, oracle: O.duplicates };
  for (const t of TREATS) {
    for (const [label, idx] of [
      ['all', ALL],
      ['unique', unique],
    ]) {
      const T = makeTreatment(t, subset(S, idx));
      const rec = analyse('dup', idx, Float64Array.from(idx, i => S.mu[i]), T, ['L1'], { slices: false });
      const L = rec.L1;
      out[`${t}.${label}`] = { position: L.position, d1: L.intervals.d1.crossings, d4: L.intervals.d4.crossings, best: L.best };
    }
    const a = out[`${t}.all`];
    const u = out[`${t}.unique`];
    const half = (a.d1[1] - a.d1[0]) / 2;
    out[`${t}.shiftInHalfWidths`] = (u.position - a.position) / half;
  }
  push('E4.duplicates', null, 'reported', out);
}
if (want('S2.alternatives')) {
  const budget = JSON.parse(readFileSync('tools/data-budget.json', 'utf8')).ceilings;
  const ceil = Object.fromEntries(budget.filter(c => ['packBytes', 'packGzipBytes', 'precacheFirstVisitGzipBytes', 'indexedDbAndCacheBytes'].includes(c.key)).map(c => [c.key, c.ceiling]));
  const t1 = n => (4 * n * (n + 1)) / 2;
  const t2 = (k, n) => 4 * (k * n + n);
  push('S2.alternatives', null, 'reported', {
    N,
    ceilings: ceil,
    T1: Object.fromEntries([N, 300, 100].map(n => [`n=${n}`, t1(n)])),
    T2: Object.fromEntries([10, 30, 100].map(k => [`k=${k}`, t2(k, N)])),
    fullLowerTriangleFloat32OfTheRelease: t1(1701),
    note: 'the pack ceilings have 0 B of room (packBytes and packGzipBytes at their measured values per tools/data-budget.json)',
  });
}
if (want('P1.time')) {
  const out = {};
  for (const t of TREATS) {
    const T = treatmentOf[t];
    const ev = evaluator(T, S, ALL, S.mu);
    const t0 = cpu();
    for (let q = 0; q < 50; q++) ev('P1', 0.3 + 0.001 * q, 0.7);
    out[t] = { factorCpuSeconds: T.factorSeconds, perNodeMs: ((cpu() - t0) / 50) * 1000, planeAnalysisCpuSeconds: realAnalysis[t]?.cpuSeconds ?? null };
  }
  push('P1.time', null, 'reported', out);
}
for (const id of ['B10.cited', 'E3.published', 'X3.fullCovariance'])
  if (want(id)) push(id, null, 'not-run', { request: id === 'B10.cited' ? THR.externalRequests.X1 : id === 'E3.published' ? THR.externalRequests.X2 : THR.externalRequests.X3 });

// -------------------------------------------------------------- verdict
const A = rows.filter(r => r.set);
const diagFail = A.filter(r => r.group === 'diag' && r.status === 'fail');
const covFail = A.filter(r => r.group === 'cov' && r.status === 'fail');
const verdict = diagFail.length ? 'C' : covFail.length ? 'B' : 'A';
const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
const results = {
  format: 'gravitas.supernova-likelihood-results/1',
  thresholdsSha256: THR_SHA,
  oracleThresholdsSha256: O.thresholdsSha256,
  oracleFileSha256: ORACLE_SHA,
  spikeCommit: process.env.SPIKE_COMMIT ?? null,
  node: process.version,
  N,
  rows,
  counts: { rows: rows.length, ...counts },
  verdict,
  diagFailing: diagFail.map(r => r.id),
  covFailing: covFail.map(r => r.id),
};
const failed = {
  format: 'gravitas.supernova-likelihood-failed-legs/1',
  note: 'Every failing leg of the gate stream, each labelled and left failing. Only Carl resets a bound; a corrected method may enter only as new legs with thresholds committed first.',
  thresholdsSha256: THR_SHA,
  legs: rows.filter(r => r.status === 'fail').map(r => ({ id: r.id, label: 'FAILED', measured: r.measured, bound: r.bound })),
};
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1) + '\n');
writeFileSync(`${OUT}/failed-legs.json`, JSON.stringify(failed, null, 1) + '\n');
log(`verdict ${verdict}; ${JSON.stringify(results.counts)}`);
