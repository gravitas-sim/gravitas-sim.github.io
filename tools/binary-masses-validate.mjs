#!/usr/bin/env node
// =============================================================================
// Binary masses and radii against their committed thresholds (Prompt 218)
// -----------------------------------------------------------------------------
//   npm run binary-masses:validate                    print the table
//   npm run binary-masses:validate -- --json          print it as JSON
//   npm run binary-masses:validate -- --write-failed  rewrite tests/fixtures/binary-masses/failed-legs.json
//   npm run binary-masses:validate -- --write-results rewrite tests/fixtures/binary-masses/results.json
//   npm run binary-masses:validate -- --only=A1,B1    run the rows whose id starts with one of these
//   npm run binary-masses:validate -- --fits=<path>   the V505 Per light curve for E1 (else NOT RUN)
//   npm run binary-masses:validate -- --progress=<file> [--resume]   keep each finished group
//
// tests/fixtures/binary-masses/thresholds.json fixed every bound before any of the code
// existed; the oracle (tools/binary-masses-oracle/oracle.py: numpy, scipy and batman, no
// Gravitas code) pinned its results in oracle-results.json before the kernel did. This
// runs the checks against the kernel and the models and judges them against the bounds
// read from that file. A crossed bound is a failed row, left failing in failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  absoluteProperties,
  companionMinimumMass,
  elementsOf,
  LOGG_SUN,
  logg,
  massFunction,
  minimumMasses,
  rvPair,
  AU,
  DAY,
  GM_SUN,
  R_SUN,
} from '../js/inference/binaryMasses.js';
import { contacts, eclipseFlux } from '../js/inference/binaries.js';
import { fitOnce } from '../js/inference/infer.js';
import { syntheticSb2 } from '../js/inference/synthetic.js';
import { readFits } from './data-packs/fits.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const DIR = 'tests/fixtures/binary-masses';
const THR = read(`${DIR}/thresholds.json`);
const ORA = read(`${DIR}/oracle-results.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const sys = name => THR.systems[name];
const SMP = THR.sampling;

/** The observable elements and the eclipse model's parameter set of a named system. */
function truthOf(name, over = {}) {
  const s = { ...sys(name), ...over };
  const el = elementsOf(s);
  const e = Math.hypot(el.ecosw, el.esinw);
  const sin = Math.sin((s.inc * Math.PI) / 180);
  const M = s.M1 + s.M2;
  return {
    s,
    el,
    params: {
      tc: s.tc,
      P: s.P,
      rsum: el.rsum,
      k: el.k,
      inc: s.inc,
      J: s.J,
      ecosw: el.ecosw,
      esinw: el.esinw,
      ldA: s.ldA,
      ldB: s.ldB,
      thirdLight: 0,
      K1: el.K1,
      K2: el.K2,
      annuli: 64,
    },
    quantities: {
      M1: s.M1,
      M2: s.M2,
      R1: s.R1,
      R2: s.R2,
      a: el.a,
      inc: s.inc,
      K1: el.K1,
      K2: el.K2,
      P: s.P,
      ecosw: el.ecosw,
      esinw: el.esinw,
      q: s.M2 / s.M1,
      asini: el.a * sin,
      m1sin3i: s.M1 * sin ** 3,
      m2sin3i: s.M2 * sin ** 3,
      e,
      M,
    },
  };
}

// ---- (a) analytic ---------------------------------------------------------------------

function a1() {
  const l = lim('A1.massChain');
  const Ps = 2 * Math.PI * Math.sqrt(AU ** 3 / (2 * GM_SUN));
  const K = (Math.PI * AU) / Ps / 1e3;
  const p = absoluteProperties({
    K1: K,
    K2: K,
    P: Ps / DAY,
    e: 0,
    inc: 90,
    rsum: 0.1,
    k: 1,
  });
  const closed = Math.max(
    rel(p.M1, 1),
    rel(p.M2, 1),
    rel(p.a, AU / R_SUN),
    rel(p.q, 1)
  );
  let trip = 0;
  const per = {};
  for (const n of ['X1', 'X2', 'X3']) {
    const t = truthOf(n);
    const e = t.quantities.e;
    const r = absoluteProperties({
      K1: t.el.K1,
      K2: t.el.K2,
      P: t.s.P,
      e,
      inc: t.s.inc,
      rsum: t.el.rsum,
      k: t.el.k,
    });
    const d = Math.max(
      rel(r.M1, t.s.M1),
      rel(r.M2, t.s.M2),
      rel(r.R1, t.s.R1),
      rel(r.R2, t.s.R2),
      rel(r.a, t.el.a)
    );
    per[n] = d;
    trip = Math.max(trip, d);
  }
  row(
    'A1.massChain',
    closed <= l.closedRelative && trip <= l.roundTripRelative,
    {
      closedRelative: closed,
      roundTripRelative: trip,
      perSystem: per,
    }
  );
}

function a2() {
  const l = lim('A2.inclinationScaling');
  let worst = 0;
  for (const inc of [60, 75, 89.2]) {
    const t = truthOf('X1', { inc });
    const m = minimumMasses({
      K1: t.el.K1,
      K2: t.el.K2,
      P: t.s.P,
      e: 0,
    });
    const sin = Math.sin((inc * Math.PI) / 180);
    worst = Math.max(
      worst,
      rel(m.m1sin3i, t.s.M1 * sin ** 3),
      rel(m.m2sin3i, t.s.M2 * sin ** 3),
      rel(m.asini, t.el.a * sin),
      rel(m.m1sin3i / sin ** 3, t.s.M1)
    );
  }
  row('A2.inclinationScaling', worst <= l.relative, { maxRelative: worst });
}

function a3() {
  const l = lim('A3.massFunction');
  let worst = 0;
  let eq = 0;
  let ok = true;
  for (const n of ['X1', 'X2', 'X3']) {
    const t = truthOf(n);
    const sin = Math.sin((t.s.inc * Math.PI) / 180);
    const f = massFunction(t.el.K1, t.s.P, t.quantities.e);
    const truth = (t.s.M2 ** 3 * sin ** 3) / (t.s.M1 + t.s.M2) ** 2;
    worst = Math.max(worst, rel(f, truth));
    const m2 = companionMinimumMass(f, t.s.M1);
    eq = Math.max(eq, rel(m2 ** 3, f * (t.s.M1 + m2) ** 2));
    if (m2 > t.s.M2) ok = false;
  }
  row(
    'A3.massFunction',
    ok && worst <= l.relative && eq <= l.equationRelative,
    {
      maxRelative: worst,
      equationRelative: eq,
      minimumAtMostTrue: ok,
    }
  );
}

function a4() {
  const l = lim('A4.rvExtrema');
  const t = truthOf('X2');
  const n = 20000;
  const times = Float64Array.from(
    { length: n },
    (_, j) => t.s.tc + (t.s.P * j) / n
  );
  const { v1, v2 } = rvPair(times, { ...t.params });
  const w = (t.s.w * Math.PI) / 180;
  const e = t.quantities.e;
  const hi = t.el.K1 * (1 + e * Math.cos(w));
  const lo = t.el.K1 * (-1 + e * Math.cos(w));
  let mx = -Infinity;
  let mn = Infinity;
  let ratio = 0;
  for (let i = 0; i < n; i++) {
    mx = Math.max(mx, v1[i]);
    mn = Math.min(mn, v1[i]);
    if (Math.abs(v1[i]) > 1e-3)
      ratio = Math.max(ratio, rel(v2[i] / v1[i], -t.el.K2 / t.el.K1));
  }
  const ext = Math.max(Math.abs(mx - hi), Math.abs(mn - lo)) / t.el.K1;
  row('A4.rvExtrema', ext <= l.extremaRelative && ratio <= l.ratioRelative, {
    extremaRelative: ext,
    ratioRelative: ratio,
  });
}

function a5() {
  const l = lim('A5.conjunctionSign');
  const t = truthOf('X1');
  const P = t.s.P;
  const at = rvPair([t.s.tc, t.s.tc - P / 100, t.s.tc + P / 100], t.params);
  const cross = Math.max(Math.abs(at.v1[0]), Math.abs(at.v2[0]));
  const ok = at.v1[1] > 0 && at.v1[2] < 0 && at.v2[1] < 0 && at.v2[2] > 0;
  row('A5.conjunctionSign', ok && cross <= l.crossingAbs, {
    crossing: cross,
    star1Before: at.v1[1],
    star1After: at.v1[2],
  });
}

function a6() {
  const l = lim('A6.surfaceGravity');
  const sun = Math.abs(LOGG_SUN - 4.438);
  const scale = Math.abs(logg(1, 2) - logg(1, 1) + Math.log10(4));
  row('A6.surfaceGravity', sun <= l.sunAbs && scale <= l.scalingAbs, {
    loggSun: LOGG_SUN,
    scalingAbs: scale,
  });
}

// ---- (b) oracle -------------------------------------------------------------------------

function b1() {
  const l = lim('B1.twoBodyRv');
  let worst = 0;
  const per = {};
  for (const n of ['X1', 'X2', 'X3']) {
    const t = truthOf(n);
    const o = ORA.twoBody[n];
    const times = Float64Array.from(
      { length: o.phase },
      (_, j) => t.s.tc + (t.s.P * j) / o.phase
    );
    const { v1, v2 } = rvPair(times, t.params);
    let d = 0;
    for (let i = 0; i < o.phase; i++)
      d = Math.max(d, Math.abs(v1[i] - o.v1[i]), Math.abs(v2[i] - o.v2[i]));
    d = Math.max(d, Math.abs(t.el.K1 - o.K1), Math.abs(t.el.K2 - o.K2));
    per[n] = d;
    worst = Math.max(worst, d);
  }
  row('B1.twoBodyRv', worst <= l.maxAbsKmS, {
    maxAbsKmS: worst,
    perSystem: per,
  });
}

const FREE_BOUNDS = (s, over = {}) => ({
  tc: { mode: 'fitted', lo: s.tc - 0.1 * s.P, hi: s.tc + 0.1 * s.P },
  P: { mode: 'fitted', lo: s.P * 0.985, hi: s.P * 1.015 },
  ...over,
});

function jointRequest(s, { over = {}, settings = {} } = {}) {
  return {
    model: { id: 'eclipsing-sb2', version: '1.0.0' },
    parameters: FREE_BOUNDS(s, over),
    settings: { ldA: s.ldA, ldB: s.ldB, thirdLight: 0, ...settings },
    algorithm: {},
  };
}

const sig = q => q.sigmaScaled ?? q.sigma;
const quantity = (fit, name) =>
  fit.parameters.find(p => p.name === name) ||
  fit.derived.find(d => d.name === name);

function tableOfOracle(o) {
  const nf = o.data.tFlux.length;
  const nr = o.data.tRv.length;
  const x = [...o.data.tFlux, ...o.data.tRv, ...o.data.tRv];
  const y = [...o.data.flux, ...o.data.rv1, ...o.data.rv2];
  const sigma = [
    ...new Array(nf).fill(o.data.sigmaFlux),
    ...new Array(2 * nr).fill(o.data.sigmaRv),
  ];
  const groups = [
    ...new Array(nf).fill(0),
    ...new Array(nr).fill(1),
    ...new Array(nr).fill(2),
  ];
  return tableFrom(x, y, sigma, groups);
}

function tableFrom(x, y, sigma, groups) {
  return {
    x: Float64Array.from(x),
    y: Float64Array.from(y),
    sigma: Float64Array.from(sigma),
    groups: Int32Array.from(groups),
    rows: x.map((_, i) => i),
    counts: {
      total: x.length,
      used: x.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'value', sigma: 'error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}

function b2b3() {
  const l = lim('B2.jointOracle');
  const l3 = lim('B3.oracleSelf');
  const per = {};
  let ok = true;
  let ok3 = true;
  const self = {};
  for (const n of ['X1', 'X2']) {
    const o = ORA.systems[n];
    const s = sys(n);
    const fit = fitOnce(jointRequest(s), tableOfOracle(o));
    per[n] = {};
    for (const q of l.quantities) {
      const mine = quantity(fit, q);
      const orSigma = o.fit.sigmaQ[q];
      const dv = Math.abs(mine.value - o.fit.quantities[q]) / orSigma;
      const ratio = sig(mine) / orSigma;
      per[n][q] = { valueSigma: dv, sigmaRatio: ratio };
      if (dv > l.valueSigma || Math.abs(ratio - 1) > l.sigmaRelative)
        ok = false;
    }
    self[n] = {};
    for (const q of ['M1', 'M2', 'R1', 'R2']) {
      const d = Math.abs(o.fit.quantities[q] - o.truth[q]) / o.fit.sigmaQ[q];
      self[n][q] = d;
      if (d > l3.nSigma) ok3 = false;
    }
  }
  row('B2.jointOracle', ok, per);
  row('B3.oracleSelf', ok3, self);
}

// ---- (c), (d) ensembles ---------------------------------------------------------------

const ENS = THR.ensembles;
const tcOf = s => s.tc - 0.15 * s.P;

function dataOf(name, tag, i, o = {}) {
  const t = truthOf(name, o.over);
  const s = t.s;
  const t0 = tcOf(s);
  const n = Math.round(4 * s.P * 48);
  return syntheticSb2({
    seed: `${THR.seeds.ensemble}-${tag}-${i}`,
    truth: t.params,
    fluxTimes: o.noFlux
      ? null
      : Float64Array.from({ length: n }, (_, j) => t0 + j / 48),
    sigmaFlux: s.sigmaFlux,
    span: [t0, t0 + 4 * s.P],
    nRv: 20,
    sigmaRv: SMP.sigmaRv,
    gamma: SMP.gammaTrue,
    singleLined: o.singleLined,
    swap: o.swap,
  });
}

const memo = new Map();
function ensemble(tag, name, n, make, request) {
  const key = `${tag}:${name}:${n}`;
  if (memo.has(key)) return memo.get(key);
  const out = [];
  for (let i = 0; i < n; i++) {
    let fit = null;
    let error = null;
    const data = make(i);
    try {
      fit = fitOnce(request, data);
    } catch (e) {
      error = e.message;
    }
    out.push({ fit, error });
  }
  memo.set(key, out);
  return out;
}

function coverage(fits, names, truth) {
  const out = {};
  for (const q of names) {
    let hit = 0;
    let n = 0;
    for (const { fit } of fits) {
      if (!fit) continue;
      const p = quantity(fit, q);
      if (!p || !Number.isFinite(sig(p))) continue;
      n++;
      if (Math.abs(p.value - truth[q]) <= sig(p)) hit++;
    }
    out[q] = { rate: n ? hit / n : NaN, n };
  }
  return out;
}

const sb2Request = s => ({
  model: { id: 'sb2-orbit', version: '1.0.0' },
  parameters: FREE_BOUNDS(s),
  settings: {},
  algorithm: {},
});

function c1() {
  const l = lim('C1.coverageSb2');
  const name = ENS.sb2Only.system;
  const t = truthOf(name);
  const fits = ensemble(
    'sb2',
    name,
    l.n,
    i => dataOf(name, 'sb2', i, { noFlux: true }),
    sb2Request(t.s)
  );
  const cov = coverage(fits, l.quantities, t.quantities);
  const ok = l.quantities.every(
    q => cov[q].rate >= l.lo && cov[q].rate <= l.hi
  );
  row('C1.coverageSb2', ok, {
    coverage: cov,
    failures: fits.filter(f => f.error).length,
  });
}

function jointFits(name, tag, n) {
  const t = truthOf(name);
  return {
    t,
    fits: ensemble(tag, name, n, i => dataOf(name, tag, i), jointRequest(t.s)),
  };
}

function c2() {
  const l = lim('C2.coverageJointCircular');
  const { t, fits } = jointFits(ENS.circular.system, 'joint', l.n);
  const cov = coverage(fits, l.quantities, t.quantities);
  const ok = l.quantities.every(
    q => cov[q].rate >= l.lo && cov[q].rate <= l.hi
  );
  row('C2.coverageJointCircular', ok, {
    coverage: cov,
    failures: fits.filter(f => f.error).length,
  });
}

function c3() {
  const l = lim('C3.coverageJointEccentric');
  const { t, fits } = jointFits(ENS.eccentric.system, 'jointE', l.n);
  const cov = coverage(fits, l.quantities, t.quantities);
  const ok = l.quantities.every(
    q => cov[q].rate >= l.lo && cov[q].rate <= l.hi
  );
  row('C3.coverageJointEccentric', ok, {
    coverage: cov,
    failures: fits.filter(f => f.error).length,
  });
}

const median = v => {
  const s = [...v].sort((a, b) => a - b);
  return s[s.length >> 1];
};

function c4() {
  const l = lim('C4.recovery');
  const { t, fits } = jointFits(
    ENS.circular.system,
    'joint',
    lim('C2.coverageJointCircular').n
  );
  const out = {};
  let ok = true;
  for (const q of ['M1', 'M2', 'R1', 'R2']) {
    const ps = fits.filter(f => f.fit).map(f => quantity(f.fit, q));
    const bias = median(ps.map(p => p.value)) - t.quantities[q];
    const bound = (l.nSigma * median(ps.map(sig))) / Math.sqrt(ps.length);
    out[q] = { bias, bound };
    if (Math.abs(bias) > bound) ok = false;
  }
  row('C4.recovery', ok, out);
}

const labelOk = d => /minimum|mass function/i.test(d.label);
const massLike = fit => fit.derived.filter(d => d.unit === 'Msun');

function d1() {
  const l = lim('D1.singleLined');
  const t = truthOf('X1');
  let labelled = 0;
  let absolute = 0;
  for (let i = 0; i < l.n; i++) {
    const data = dataOf('X1', 'sb1', i, { singleLined: true });
    const fit = fitOnce(
      jointRequest(t.s, { settings: { assumedM1: t.s.M1 } }),
      data
    );
    const m = massLike(fit);
    const names = fit.derived.map(d => d.name);
    if (names.some(n => ['M1', 'M2', 'R1', 'R2', 'a'].includes(n))) absolute++;
    if (
      m.length > 0 &&
      m.every(d => ['massFunction', 'm2min'].includes(d.name) && labelOk(d))
    )
      labelled++;
  }
  row('D1.singleLined', labelled / l.n >= l.minLabelled && absolute === 0, {
    labelled: labelled / l.n,
    seedsWithAnAbsoluteQuantity: absolute,
  });
}

function d2() {
  const l = lim('D2.nonEclipsing');
  const over = { inc: 60 };
  const t = truthOf('X1', over);
  const flat = Math.max(
    ...eclipseFlux(
      Float64Array.from({ length: 400 }, (_, j) => t.s.tc + (t.s.P * j) / 400),
      t.params
    ).map(v => Math.abs(v - 1))
  );
  let labelled = 0;
  let refused = 0;
  for (let i = 0; i < l.n; i++) {
    const rvOnly = dataOf('X1', 'ne', i, { over, noFlux: true });
    const fit = fitOnce(sb2Request(t.s), rvOnly);
    const m = massLike(fit);
    if (
      m.length === 2 &&
      m.every(d => /sin3i$/.test(d.name) && /minimum/i.test(d.label))
    )
      labelled++;
    const withFlat = dataOf('X1', 'ne', i, { over });
    try {
      fitOnce(jointRequest(t.s), withFlat);
    } catch (e) {
      if (/no eclipse/i.test(e.message)) refused++;
    }
  }
  row(
    'D2.nonEclipsing',
    flat === 0 &&
      labelled / l.n >= l.minLabelled &&
      refused / l.n >= l.minRefused,
    { fluxDeviation: flat, labelled: labelled / l.n, refused: refused / l.n }
  );
}

function d3() {
  const l = lim('D3.circularAssumed');
  const name = 'X2';
  const t = truthOf(name);
  const circular = {
    ...sb2Request(t.s),
    parameters: FREE_BOUNDS(t.s, {
      ecosw: { mode: 'fixed', value: 0 },
      esinw: { mode: 'fixed', value: 0 },
    }),
  };
  let fail = 0;
  for (let i = 0; i < l.n; i++) {
    const fit = fitOnce(circular, dataOf(name, 'sb2', i, { noFlux: true }));
    if (fit.reducedChi2 > l.reducedChi2) fail++;
  }
  const correct = ensemble(
    'sb2',
    name,
    lim('C1.coverageSb2').n,
    i => dataOf(name, 'sb2', i, { noFlux: true }),
    sb2Request(t.s)
  )
    .slice(0, l.controlN)
    .filter(f => f.fit);
  const control = correct.filter(f => f.fit.reducedChi2 > l.reducedChi2).length;
  row(
    'D3.circularAssumed',
    fail / l.n >= l.minFail && control / correct.length <= l.maxControlFail,
    { failRate: fail / l.n, controlRate: control / correct.length }
  );
}

function d4() {
  const l = lim('D4.grazing');
  const t = truthOf('G1');
  const fits = ensemble(
    'graz',
    'G1',
    l.n,
    i => dataOf('G1', 'graz', i),
    jointRequest(t.s)
  );
  const flagged = f =>
    f.fit &&
    f.fit.identifiability.parameters.k?.status === 'not constrained' &&
    ['R1', 'R2'].every(
      n => f.fit.derived.find(d => d.name === n)?.notConstrained
    );
  const rate = fits.filter(flagged).length / l.n;
  const { fits: control } = jointFits(
    ENS.circular.system,
    'joint',
    lim('C2.coverageJointCircular').n
  );
  const ctl = control
    .slice(0, l.controlN)
    .filter(
      f => f.fit?.identifiability.parameters.k?.status === 'not constrained'
    ).length;
  row(
    'D4.grazing',
    rate >= l.minFlagged && ctl / l.controlN <= l.maxControlFlagged,
    {
      flagged: rate,
      controlFlagged: ctl / l.controlN,
      failures: fits.filter(f => f.error).length,
    }
  );
}

function d5() {
  const l = lim('D5.swappedStars');
  const t = truthOf('X1');
  let fail = 0;
  for (let i = 0; i < l.n; i++) {
    let bad = false;
    try {
      const fit = fitOnce(
        jointRequest(t.s),
        dataOf('X1', 'swap', i, { swap: true })
      );
      bad =
        fit.reducedChi2 > l.reducedChi2 ||
        ['K1', 'K2'].some(n => quantity(fit, n).atBound);
    } catch {
      bad = true;
    }
    if (bad) fail++;
  }
  row('D5.swappedStars', fail / l.n >= l.minFail, { failRate: fail / l.n });
}

// ---- (e) the authentic double-lined eclipsing binary -----------------------------------

/** The delta method through the covariance of the named fitted parameters. */
function propagate(fit, names, extra, f) {
  const idx = names.map(n => fit.free.indexOf(n));
  const scale = fit.scaled ? fit.reducedChi2 : 1;
  const x0 = [
    ...names.map(n => fit.parameters.find(p => p.name === n).value),
    ...extra.map(e => e.value),
  ];
  const cov = x0.map(() => x0.map(() => 0));
  idx.forEach((a, i) =>
    idx.forEach((b, j) => (cov[i][j] = fit.covariance[a][b] * scale))
  );
  extra.forEach(
    (e, k) => (cov[names.length + k][names.length + k] = e.sigma ** 2)
  );
  const base = f(x0);
  const out = {};
  for (const key of Object.keys(base)) {
    const g = x0.map((v, j) => {
      const h = 1e-6 * (Math.abs(v) || 1);
      const up = x0.slice();
      const dn = x0.slice();
      up[j] += h;
      dn[j] -= h;
      return (f(up)[key] - f(dn)[key]) / (2 * h);
    });
    let v = 0;
    for (let a = 0; a < g.length; a++)
      for (let b = 0; b < g.length; b++) v += g[a] * cov[a][b] * g[b];
    out[key] = { value: base[key], sigma: Math.sqrt(v) };
  }
  return out;
}

function e1() {
  const l = lim('E1.authentic');
  const arg = process.argv.find(a => a.startsWith('--fits='))?.slice(7);
  const prov = read('tests/fixtures/binaries/oracle-provenance.json').authentic;
  const file =
    arg ||
    process.env.BINARIES_FITS ||
    (prov?.relativePath && path.resolve(ROOT, prov.relativePath));
  if (!file || !existsSync(file))
    return notRun(
      'E1.authentic',
      'the TESS Sector 18 light curve of V505 Per is not in the repository and no --fits path was given'
    );
  const bytes = readFileSync(file);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (prov?.sha256 && sha !== prov.sha256)
    return notRun(
      'E1.authentic',
      `the file's SHA-256 ${sha} is not the pinned ${prov.sha256}`
    );
  const lc = readFits(new Uint8Array(bytes)).find(
    u => u.cards.EXTNAME === 'LIGHTCURVE'
  );
  const col = n => lc.columns[n].values;
  const TIME = col('TIME');
  const SAP_FLUX = col('SAP_FLUX');
  const QUALITY = col('QUALITY');
  const t14 = read('tests/fixtures/binaries/thresholds.json').checks.find(
    c => c.id === 'E1.authentic'
  ).limits.paper;
  const T0 = 2458798;
  const paper = {
    tc: t14.tc_BJD - T0,
    P: t14.P,
    rsum: t14.rsum,
    k: t14.k,
    inc: t14.inc,
    J: t14.J,
    ecosw: 0,
    esinw: 0,
    ldA: [0.261, 0.23],
    ldB: [0.261, 0.23],
    thirdLight: 0,
  };
  const T14 = contacts(paper, 'primary').duration;
  const xs = [];
  const ys = [];
  const base = [];
  for (let n = -4; n <= 6; n++) {
    for (const mid of [
      paper.tc + n * paper.P,
      paper.tc + (n + 0.5) * paper.P,
    ]) {
      const w = [];
      for (let i = 0; i < TIME.length; i++) {
        const t = TIME[i] + 2457000 - T0;
        if (
          QUALITY[i] !== 0 ||
          !Number.isFinite(t) ||
          !Number.isFinite(SAP_FLUX[i])
        )
          continue;
        if (Math.abs(t - mid) <= T14) w.push([t, SAP_FLUX[i]]);
      }
      const oob = w.filter(([t]) => Math.abs(t - mid) >= 0.55 * T14);
      if (oob.length < 20 || w.length < 100) continue;
      const m = oob.length;
      const sx = oob.reduce((a, [t]) => a + (t - mid), 0);
      const sy = oob.reduce((a, [, y]) => a + y, 0);
      const sxx = oob.reduce((a, [t]) => a + (t - mid) ** 2, 0);
      const sxy = oob.reduce((a, [t, y]) => a + (t - mid) * y, 0);
      const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
      const icpt = (sy - slope * sx) / m;
      for (const [t, y] of w) {
        xs.push(t);
        ys.push(y / (icpt + slope * (t - mid)));
      }
      for (const [t, y] of oob) base.push(y / (icpt + slope * (t - mid)) - 1);
    }
  }
  const rms = Math.sqrt(base.reduce((a, v) => a + v * v, 0) / base.length);
  const data = {
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    sigma: new Float64Array(xs.length).fill(rms),
    groups: null,
    rows: xs.map((_, i) => i),
    counts: {
      total: xs.length,
      used: xs.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'flux', sigma: 'flux-error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
  const fit = fitOnce(
    {
      model: { id: 'eclipsing-binary', version: '1.0.0' },
      parameters: {
        tc: { mode: 'fitted', lo: paper.tc - 0.1, hi: paper.tc + 0.1 },
        P: { mode: 'fitted', lo: paper.P - 0.01, hi: paper.P + 0.01 },
        rsum: { mode: 'fitted' },
        k: { mode: 'fitted' },
        inc: { mode: 'fitted' },
        J: { mode: 'fitted' },
        ecosw: { mode: 'fixed', value: 0 },
        esinw: { mode: 'fixed', value: 0 },
      },
      settings: {
        ldA: paper.ldA,
        ldB: paper.ldB,
        thirdLight: 0,
        exposure: 120 / 86400,
        supersample: 3,
      },
      algorithm: {},
    },
    data
  );
  const pp = l.paper;
  const res = propagate(
    fit,
    ['rsum', 'k', 'inc', 'P'],
    [
      { value: pp.K_A, sigma: pp.K_A_sigma },
      { value: pp.K_B, sigma: pp.K_B_sigma },
    ],
    ([rsum, k, inc, P, K1, K2]) => {
      const p = absoluteProperties({ K1, K2, P, e: 0, inc, rsum, k });
      return { M_A: p.M1, M_B: p.M2, R_A: p.R1, R_B: p.R2, a: p.a };
    }
  );
  const got = {};
  let ok = true;
  for (const n of l.parameters) {
    const d = Math.abs(res[n].value - pp[n]);
    got[n] = {
      ours: res[n].value,
      ourSigma: res[n].sigma,
      paper: pp[n],
      paperSigma: pp[`${n}_sigma`],
      deltaOverPaperSigma: d / pp[`${n}_sigma`],
    };
    if (d > l.nPaperSigma * pp[`${n}_sigma`]) ok = false;
  }
  row('E1.authentic', ok, {
    ...got,
    geometry: Object.fromEntries(
      ['rsum', 'k', 'inc', 'P'].map(n => [
        n,
        fit.parameters.find(p => p.name === n).value,
      ])
    ),
  });
}

function p1() {
  const l = lim('P1.speed');
  const t = truthOf('X1');
  const data = dataOf('X1', 'joint', 0);
  const t0 = process.cpuUsage();
  fitOnce(jointRequest(t.s), data);
  const u = process.cpuUsage(t0);
  const s = (u.user + u.system) / 1e6;
  row('P1.speed', s <= l.maxSeconds, { cpuSeconds: s, rows: data.x.length });
}

const ALL = [
  a1,
  a2,
  a3,
  a4,
  a5,
  a6,
  b1,
  b2b3,
  c1,
  c2,
  c3,
  c4,
  d1,
  d2,
  d3,
  d4,
  d5,
  e1,
  p1,
];

const PROGRESS = process.argv.find(a => a.startsWith('--progress='))?.slice(11);
const progress = (() => {
  try {
    return PROGRESS && process.argv.includes('--resume')
      ? JSON.parse(readFileSync(PROGRESS, 'utf8'))
      : {};
  } catch {
    return {};
  }
})();

const KEY = { b2b3: ['B2', 'B3'] };

export function runAll(only = null) {
  rows.length = 0;
  for (const f of ALL) {
    const keys = KEY[f.name] || [f.name.toUpperCase()];
    const wanted =
      !only ||
      only.some(p => keys.some(k => p.startsWith(k) || k.startsWith(p)));
    if (!wanted) continue;
    if (progress[f.name]) {
      rows.push(...progress[f.name]);
      continue;
    }
    const before = rows.length;
    f();
    if (PROGRESS) {
      progress[f.name] = rows.slice(before);
      writeFileSync(PROGRESS, JSON.stringify(progress));
    }
  }
  return only
    ? rows.filter(r => only.some(p => r.id.startsWith(p)))
    : rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.slice(7);
  const out = runAll(onlyArg ? onlyArg.split(',') : null);
  const failedPath = `${DIR}/failed-legs.json`;
  const previousWhy = id => {
    try {
      return read(failedPath).failed.find(f => f.id === id)?.why;
    } catch {
      return undefined;
    }
  };
  if (process.argv.includes('--write-failed')) {
    const failed = out
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured, why: previousWhy(r.id) }));
    const notMeasured = out
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, reason: r.note }));
    writeFileSync(
      path.join(ROOT, failedPath),
      `${JSON.stringify({ note: 'Legs of tests/fixtures/binary-masses/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).', failed, notMeasured }, null, 2)}\n`
    );
  }
  if (process.argv.includes('--write-results'))
    writeFileSync(
      path.join(ROOT, `${DIR}/results.json`),
      `${JSON.stringify({ note: 'The validation table of tools/binary-masses-validate.mjs as last measured (Node 22.23.4); the Jest group reruns the quick legs and holds these against failed-legs.json.', rows: out }, null, 2)}\n`
    );
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 2));
  else
    for (const r of out)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
  let recorded = [];
  try {
    recorded = read(failedPath).failed.map(f => f.id);
  } catch {
    // no record yet: every failure is new
  }
  process.exitCode = out.some(
    r => r.status === 'fail' && !recorded.includes(r.id)
  )
    ? 1
    : 0;
}
