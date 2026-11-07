// SPIKE (Roadmap III, Prompt 262 Part A): the gate stream. Never merged.
//   node tools/censoring-validate.mjs <thresholds.json> <oracle-results.json> <out.json>
// Every leg of the committed thresholds file, measured on the prototype in js/kernels/statistics/
// (censoring.js, truncation.js, vmax.js) against the pinned oracle. The bound of each leg is the
// committed one; the status is computed here from the measured numbers and the bound.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { kmLeft, independenceCheck } from '../js/kernels/statistics/censoring.js';
import { lyndenBell } from '../js/kernels/statistics/truncation.js';
import {
  vmaxStats,
  effectiveVolume,
  spaceDensity,
} from '../js/kernels/statistics/vmax.js';
import { stream, gaussian } from '../js/random/streams.js';
import { normalCdf, normalQuantile } from '../js/kernels/statistics/special.js';

const [thrPath, oraclePath, outPath] = process.argv.slice(2);
const thrBytes = readFileSync(thrPath);
const thr = JSON.parse(thrBytes);
const oracleBytes = readFileSync(oraclePath);
const oracle = JSON.parse(oracleBytes);
const sha = b => createHash('sha256').update(b).digest('hex');
const TOL = thr.tolerance;
const CONST = thr.constants;
const SC = thr.scenarios;
const Z975 = normalQuantile(0.975);
const CMAX = { K1: 0.8, K2: 2.5, K3: 5 };
const t0 = process.hrtime.bigint();

const results = [];
const checks = Object.fromEntries(thr.checks.map(c => [c.id, c]));
function leg(id, status, measured) {
  const c = checks[id];
  results.push({
    id,
    group: c.group,
    estimator: c.estimator,
    tier: c.tier,
    status,
    bound: c.bound,
    measured,
  });
}

const rel = (a, b) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b));
const close = (a, b, tol = TOL.closedForm) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const inRange = (v, lo, hi) => v >= lo && v <= hi;

// ----------------------------------------------------------------------------
// random helpers (the Gravitas named stream 'noise')
// ----------------------------------------------------------------------------
function rngFor(seed, label) {
  const draw = stream('noise', seed, label);
  const u01 = () => {
    let a;
    do a = draw();
    while (a <= 0);
    return a;
  };
  return { draw, u01, gauss: gaussian(draw) };
}
const gamma2 = u01 => -Math.log(u01()) - Math.log(u01());
const gammaCdf2 = x => (x <= 0 ? 0 : 1 - Math.exp(-x) * (1 + x));

function censoredRows(seed, label, n, cmax, withLimit) {
  const { u01, draw } = rngFor(seed, label);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const x = gamma2(u01);
    const c = cmax * draw();
    const det = x >= c;
    const row = { value: det ? x : c, censored: !det };
    if (withLimit) row.limit = c;
    rows.push(row);
  }
  return rows;
}

function dependentRows(seed, label, n, rho) {
  const { gauss } = rngFor(seed, label);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const za = gauss();
    const zb = gauss();
    const zn = gauss();
    const x =
      -Math.log(Math.max(normalCdf(za), 1e-300)) -
      Math.log(Math.max(normalCdf(zb), 1e-300));
    const zc =
      (rho * (za + zb)) / Math.SQRT2 + Math.sqrt(1 - rho * rho) * zn;
    const c = 2.5 * normalCdf(zc);
    const det = x >= c;
    rows.push({ value: det ? x : c, censored: !det, limit: c });
  }
  return rows;
}

function truncatedRows(seed, label, N) {
  const { draw, gauss } = rngFor(seed, label);
  const rows = [];
  while (rows.length < N) {
    const x = gauss();
    let d = Math.cbrt(draw());
    if (d <= 0) d = 1e-300;
    const u = 0.5 + 2 * Math.log10(d);
    if (x >= u) rows.push({ x, u });
  }
  return rows;
}

const phi = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
const truthCM = from => phi(from) / (1 - normalCdf(from));

function poisson(draw, mean) {
  const L = Math.exp(-mean);
  let p = 1;
  let k = 0;
  do {
    k++;
    p *= draw();
  } while (p > L);
  return k - 1;
}
const LAMBDA = 60;
const VOL1 = (4 * Math.PI) / 3;

function vmaxPopulation(seed, label, { evolving = false, ramp = false }) {
  const { draw, gauss } = rngFor(seed, label);
  const N = poisson(draw, LAMBDA * VOL1);
  const out = [];
  for (let i = 0; i < N; i++) {
    const u = draw();
    const d = evolving ? Math.pow(u, 1 / 5) : Math.cbrt(u);
    const Z = gauss();
    const L = Math.pow(10, 0.5 * Z);
    const dmax = 0.8 * Math.sqrt(L);
    let seen;
    if (ramp) seen = draw() < 1 / (1 + Math.pow(d / dmax, 8));
    else seen = d <= dmax;
    if (seen && d > 0) out.push({ d, dmax, Z });
  }
  return out;
}

// ----------------------------------------------------------------------------
// I1 integrity
// ----------------------------------------------------------------------------
{
  const mine = sha(thrBytes);
  const ok = oracle.thresholdsSha256 === mine;
  leg('I1.inputs', ok ? 'pass' : 'fail', {
    thresholdsSha256: mine,
    oracleRecorded: oracle.thresholdsSha256,
    oracleOutputSha256: sha(oracleBytes),
  });
}

// ----------------------------------------------------------------------------
// O the oracle's internal legs (read from its pinned output)
// ----------------------------------------------------------------------------
{
  const s = oracle.summary;
  leg('O0.kmInternal', s.kmVsScipyMaxAbs <= TOL.oracleMass ? 'pass' : 'fail', {
    maxAbs: s.kmVsScipyMaxAbs,
  });
  leg(
    'O1.cmInternal',
    s.cmClosedVsFixedPointMaxAbs <= TOL.emAlgorithm ? 'pass' : 'fail',
    {
      maxAbs: s.cmClosedVsFixedPointMaxAbs,
      iterations: oracle.truncated.map(t => [t.id, t.fixedPoint.iterations]),
    }
  );
  leg('O2.hand', oracle.hand.agrees ? 'pass' : 'fail', { agrees: oracle.hand.agrees });
  leg(
    'O3.logrankInternal',
    s.maxLogrankZRel <= TOL.logrank ? 'pass' : 'fail',
    {
      maxZRel: s.maxLogrankZRel,
      maxPRel: s.maxLogrankPRel,
      checkedSamples: oracle.logrankDiffs.length,
    }
  );
}

// ----------------------------------------------------------------------------
// A the analytic legs
// ----------------------------------------------------------------------------
{
  const he = thr.handExamples;
  // A1
  const a1rows = [3, 1, 4, 1.5, 9].map(v => ({ value: v, censored: false }));
  const a1 = kmLeft(a1rows, { floor: 0, check: false });
  leg(
    'A1.kmUncensored',
    a1.status === 'complete' &&
      close(a1.mean, 3.7) &&
      close(a1.variance, 1.632)
      ? 'pass'
      : 'fail',
    { status: a1.status, mean: a1.mean, variance: a1.variance }
  );
  // A2
  const a2 = kmLeft(he.A2.rows, { floor: 0, check: false, minDetections: 1 });
  const m2 = Object.fromEntries(a2.support.map(s => [String(s.value), s.mass]));
  const e2 = he.A2.expected;
  const a2ok =
    a2.status === 'complete' &&
    close(a2.mean, e2.mean) &&
    close(a2.variance, e2.variance) &&
    Object.keys(e2.masses).every(k => close(m2[k], e2.masses[k])) &&
    close(a2.tailMass, 0);
  leg('A2.kmHand', a2ok ? 'pass' : 'fail', {
    status: a2.status,
    mean: a2.mean,
    variance: a2.variance,
    masses: m2,
  });
  // A3
  const a3 = kmLeft(he.A3.rows, { floor: he.A3.floor, check: false, minDetections: 1 });
  const a3n = kmLeft(he.A3.rows, { check: false, minDetections: 1 });
  const e3 = he.A3.expected;
  const m3 = Object.fromEntries(a3.support.map(s => [String(s.value), s.mass]));
  const a3ok =
    a3.status === 'bounded' &&
    a3.mean === null &&
    close(a3.meanLow, e3.meanLow) &&
    close(a3.meanHigh, e3.meanHigh) &&
    close(a3.variance, e3.variance) &&
    close(a3.tailMass, e3.tailMass) &&
    Object.keys(e3.masses).every(k => close(m3[k], e3.masses[k])) &&
    a3n.status === 'refused' &&
    a3n.code === 'unbounded-tail';
  leg('A3.kmBounded', a3ok ? 'pass' : 'fail', {
    status: a3.status,
    meanLow: a3.meanLow,
    meanHigh: a3.meanHigh,
    variance: a3.variance,
    tailMass: a3.tailMass,
    noFloor: a3n.code,
  });
  // A4
  const a4 = lyndenBell(he.A4.rows, he.A4.options);
  const e4 = he.A4.expected;
  const sets = Object.fromEntries(a4.associatedSets.map(s => [String(s.value), s.n]));
  const m4 = Object.fromEntries(a4.support.map(s => [String(s.value), s.mass]));
  const a4ok =
    Object.keys(e4.associatedSets).every(k => sets[k] === e4.associatedSets[k]) &&
    Object.keys(e4.masses).every(k => close(m4[k], e4.masses[k])) &&
    close(a4.mean, e4.mean) &&
    close(a4.variance, e4.variance);
  leg('A4.cmHand', a4ok ? 'pass' : 'fail', {
    sets,
    masses: m4,
    mean: a4.mean,
    variance: a4.variance,
  });
  // A5
  const a5rows = [3, 1, 4, 1.5, 9].map(x => ({ x, u: -1e9 }));
  const a5 = lyndenBell(a5rows, { from: 1, minRisk: 1 });
  const a5ok =
    a5.support.length === 5 &&
    a5.support.every(s => close(s.mass, 0.2)) &&
    close(a5.mean, 3.7) &&
    close(a5.variance, 1.632);
  leg('A5.cmNoTruncation', a5ok ? 'pass' : 'fail', {
    masses: a5.support.map(s => s.mass),
    mean: a5.mean,
    variance: a5.variance,
  });
  // A6
  const a6 = vmaxStats(
    [
      { d: 0.5, dmax: 1 },
      { d: 1, dmax: 2 },
      { d: 2, dmax: 2 },
    ],
    { volume: 'unit', D: Infinity, minObjects: 1 }
  );
  const e6 = he.A6.expected;
  leg(
    'A6.vmaxHand',
    close(a6.meanVOverVmax, e6.meanVOverVmax) &&
      close(a6.z, e6.z) &&
      close(a6.sumInverseVmax, e6.sumInverseVmax) &&
      close(a6.variance, e6.variance)
      ? 'pass'
      : 'fail',
    a6
  );
  // A7
  const step = d => (d <= 1 ? 1 : d <= 2 ? 0.5 : 0);
  const v7 = effectiveVolume({ D: 5, completeness: step, volume: 'unit', breaks: [1, 2] });
  leg(
    'A7.vmaxEffective',
    close(v7, 4.5) && close(1 / v7, 0.2222222222222222) ? 'pass' : 'fail',
    { veff: v7, inverseVeff: 1 / v7 }
  );
}

// ----------------------------------------------------------------------------
// R the reference legs
// ----------------------------------------------------------------------------
{
  const per = [];
  let worstMass = 0;
  let worstRel = 0;
  let allExact = true;
  for (const o of oracle.censored) {
    const r = kmLeft(o.rows, { floor: o.floor, check: false });
    const rec = { id: o.id, ok: true, notes: [] };
    if (r.status === 'refused') {
      rec.ok = false;
      rec.notes.push(`refused ${r.code}`);
    } else {
      if (r.status !== o.km.status) {
        rec.ok = false;
        rec.notes.push(`status ${r.status} vs ${o.km.status}`);
      }
      if (r.support.length !== o.km.support.length) {
        rec.ok = false;
        rec.notes.push('support length');
      } else {
        for (let k = 0; k < r.support.length; k++) {
          if (r.support[k].value !== o.km.support[k][0]) {
            rec.ok = false;
            allExact = false;
            rec.notes.push(`support value ${k}`);
          }
          worstMass = Math.max(worstMass, Math.abs(r.support[k].mass - o.km.support[k][1]));
        }
      }
      worstMass = Math.max(worstMass, Math.abs(r.tailMass - o.km.tailMass));
      for (const [a, b] of [
        [r.meanHigh, o.km.meanHigh],
        [r.meanLow, o.km.meanLow],
        [r.variance, o.km.variance],
      ]) {
        const e = rel(a, b);
        worstRel = Math.max(worstRel, e);
      }
      if (r.status === 'complete' && rel(r.mean, o.km.mean) > TOL.oracle) rec.ok = false;
    }
    per.push(rec);
  }
  const ok =
    allExact &&
    per.every(p => p.ok) &&
    worstMass <= TOL.oracleMass &&
    worstRel <= TOL.oracle;
  leg('R1.kmReference', ok ? 'pass' : 'fail', {
    samples: per.length,
    worstMassAbs: worstMass,
    worstRelative: worstRel,
    notes: per.filter(p => !p.ok),
  });
}
{
  let worstMass = 0;
  let worstRel = 0;
  let setsExact = true;
  const bad = [];
  for (const o of oracle.truncated) {
    const r = lyndenBell(o.rows, { from: o.from, minRisk: o.minRisk });
    if (r.status === 'refused') {
      bad.push([o.id, r.code]);
      continue;
    }
    if (r.support.length !== o.cm.support.length) {
      bad.push([o.id, 'support length']);
      continue;
    }
    for (let k = 0; k < r.support.length; k++) {
      if (r.support[k].value !== o.cm.support[k][0]) bad.push([o.id, `value ${k}`]);
      if (r.associatedSets[k].n !== o.cm.associatedSets[k][1]) setsExact = false;
      worstMass = Math.max(worstMass, Math.abs(r.support[k].mass - o.cm.support[k][1]));
    }
    worstRel = Math.max(worstRel, rel(r.mean, o.cm.mean), rel(r.variance, o.cm.variance));
  }
  leg(
    'R2.cmReference',
    bad.length === 0 && setsExact && worstMass <= TOL.oracleMass && worstRel <= TOL.oracle
      ? 'pass'
      : 'fail',
    { samples: oracle.truncated.length, worstMassAbs: worstMass, worstRelative: worstRel, setsExact, bad }
  );
}
{
  let worstZ = 0;
  let worstP = 0;
  const bad = [];
  let checked = 0;
  for (const o of oracle.censored) {
    const r = independenceCheck(o.rows, { alpha: CONST.independenceAlpha });
    const e = o.logrank;
    if (r.checked !== e.checked || r.reason !== e.reason) {
      bad.push([o.id, 'checked/reason']);
      continue;
    }
    if (!r.checked) continue;
    checked++;
    if (r.n1 !== e.n1 || r.n2 !== e.n2 || r.det1 !== e.det1 || r.det2 !== e.det2)
      bad.push([o.id, 'group sizes']);
    if (r.flag !== e.flag) bad.push([o.id, 'flag']);
    worstZ = Math.max(worstZ, rel(r.z, e.scipyZ));
    worstP = Math.max(
      worstP,
      e.scipyP < 1e-12 ? Math.abs(r.p - e.scipyP) / 1e-12 : rel(r.p, e.scipyP)
    );
  }
  leg(
    'R3.logrankReference',
    bad.length === 0 && worstZ <= TOL.logrank && worstP <= TOL.logrank ? 'pass' : 'fail',
    { samples: oracle.censored.length, checked, worstZRel: worstZ, worstPRel: worstP, bad }
  );
}
{
  let worst = 0;
  for (const o of oracle.veff) {
    const v = effectiveVolume({
      D: o.D,
      completeness: d => 1 / (1 + Math.pow(d / o.dmax, 8)),
      volume: 'euclid',
    });
    worst = Math.max(worst, rel(v, o.veff));
  }
  leg('R4.veffReference', worst <= TOL.quadrature ? 'pass' : 'fail', {
    pairs: oracle.veff.length,
    worstRelative: worst,
  });
}

// ----------------------------------------------------------------------------
// L the large-sample accuracy legs
// ----------------------------------------------------------------------------
{
  const sc = SC.large.kmLarge;
  const rows = censoredRows(sc.seed, 'kmLarge', sc.n, CMAX.K2, false);
  const r = kmLeft(rows, { floor: 0, check: false });
  let sup = 0;
  if (r.status !== 'refused') {
    const s = [...r.support].sort((a, b) => a.value - b.value);
    let cum = 0;
    for (const p of s) {
      const F = gammaCdf2(p.value);
      for (const c of [cum, cum + p.mass])
        for (const add of [0, r.tailMass]) sup = Math.max(sup, Math.abs(c + add - F));
      cum += p.mass;
    }
  }
  const mean =
    r.status === 'refused'
      ? NaN
      : r.status === 'complete'
        ? r.mean
        : 0.5 * (r.meanLow + r.meanHigh);
  leg('L1.kmLarge', r.status !== 'refused' && sup <= 0.04 && Math.abs(mean - 2) <= 0.06 ? 'pass' : 'fail', {
    n: sc.n,
    status: r.status,
    supDistance: sup,
    mean,
    tailMass: r.tailMass,
  });
}
{
  const sc = SC.large.cmLarge;
  const rows = truncatedRows(sc.seed, 'cmLarge', sc.N);
  const r = lyndenBell(rows, { from: sc.from });
  let sup = NaN;
  let mean = NaN;
  if (r.status !== 'refused') {
    sup = 0;
    const base = normalCdf(sc.from);
    let cum = 0;
    for (const p of r.support) {
      const F = (normalCdf(p.value) - base) / (1 - base);
      for (const c of [cum, cum + p.mass]) sup = Math.max(sup, Math.abs(c - F));
      cum += p.mass;
    }
    mean = r.mean;
  }
  const truth = truthCM(sc.from);
  leg('L2.cmLarge', r.status !== 'refused' && sup <= 0.05 && Math.abs(mean - truth) <= 0.05 ? 'pass' : 'fail', {
    N: sc.N,
    riskAtFrom: r.riskAtFrom,
    supDistance: sup,
    mean,
    truth,
  });
}

// ----------------------------------------------------------------------------
// C the coverage ensembles
// ----------------------------------------------------------------------------
const covK = {};
for (const name of ['K1', 'K2', 'K3']) {
  const sc = SC.censoringK[name];
  let hit = 0;
  let refusedN = 0;
  let bounded = 0;
  for (let r = 0; r < sc.replicates; r++) {
    const rows = censoredRows(sc.baseSeed + r, `km-${name}`, sc.n, CMAX[name], false);
    const res = kmLeft(rows, { floor: 0, check: false });
    if (res.status === 'refused') {
      refusedN++;
      continue;
    }
    if (res.status === 'bounded') bounded++;
    if (res.interval[0] <= 2 && 2 <= res.interval[1]) hit++;
  }
  covK[name] = { coverage: hit / sc.replicates, refused: refusedN, bounded: bounded / sc.replicates, replicates: sc.replicates };
}
leg('C1a.kmCoverageK1', inRange(covK.K1.coverage, 0.92, 0.98) ? 'pass' : 'fail', covK.K1);
leg('C1b.kmCoverageK2', inRange(covK.K2.coverage, 0.92, 0.98) ? 'pass' : 'fail', covK.K2);
leg('C1c.kmCoverageK3', inRange(covK.K3.coverage, 0.92, 0.98) ? 'pass' : 'fail', covK.K3);
{
  const o = oracle.coverage;
  const okAll = ['K1', 'K2', 'K3'].every(k => inRange(o[k].coverage, 0.92, 0.98));
  leg('C1o.kmCoverageOracle', okAll ? 'pass' : 'fail', {
    K1: o.K1.coverage,
    K2: o.K2.coverage,
    K3: o.K3.coverage,
  });
}

const covT = {};
let d5 = null;
for (const name of ['T1', 'T2', 'T3']) {
  const sc = SC.truncationT[name];
  const truth = truthCM(sc.from);
  let hit = 0;
  let refusedN = 0;
  let naiveErrSum = 0;
  let cmErrSum = 0;
  let naiveBeyond2 = 0;
  let cmBeyond2 = 0;
  let nUsed = 0;
  const risks = [];
  const reps = sc.replicates;
  for (let r = 0; r < reps; r++) {
    const rows = truncatedRows(sc.baseSeed + r, `cm-${name}`, sc.N);
    const res = lyndenBell(rows, { from: sc.from });
    if (res.status === 'refused') {
      refusedN++;
      continue;
    }
    risks.push(res.riskAtFrom);
    if (res.interval[0] <= truth && truth <= res.interval[1]) hit++;
    if (name === 'T1') {
      const kept = rows.filter(q => q.x >= sc.from);
      const naive = kept.reduce((a, q) => a + q.x, 0) / kept.length;
      naiveErrSum += naive - truth;
      cmErrSum += res.mean - truth;
      if (Math.abs(naive - truth) > 2 * res.se) naiveBeyond2++;
      if (Math.abs(res.mean - truth) > 2 * res.se) cmBeyond2++;
      nUsed++;
    }
  }
  risks.sort((a, b) => a - b);
  covT[name] = {
    coverage: hit / reps,
    coverageOfNotRefused: reps - refusedN > 0 ? hit / (reps - refusedN) : null,
    refused: refusedN,
    replicates: reps,
    truth,
    medianRiskAtFrom: risks.length ? risks[Math.floor(risks.length / 2)] : null,
  };
  if (name === 'T1')
    d5 = {
      replicates: nUsed,
      meanNaiveBias: naiveErrSum / nUsed,
      meanEstimatorBias: cmErrSum / nUsed,
      fractionNaiveBeyond2se: naiveBeyond2 / nUsed,
      fractionEstimatorBeyond2se: cmBeyond2 / nUsed,
    };
}
leg('C2a.cmCoverageT1', inRange(covT.T1.coverage, 0.92, 0.98) ? 'pass' : 'fail', covT.T1);
leg('C2b.cmCoverageT2', inRange(covT.T2.coverage, 0.92, 0.98) ? 'pass' : 'fail', covT.T2);
{
  const o = oracle.coverage;
  leg(
    'C2o.cmCoverageOracle',
    ['T1', 'T2'].every(k => inRange(o[k].coverage, 0.92, 0.98)) ? 'pass' : 'fail',
    { T1: o.T1.coverage, T2: o.T2.coverage, T1refused: o.T1.refused, T2refused: o.T2.refused }
  );
}
leg('T3.cmThinRisk', 'reported', covT.T3);
leg('D5.naiveBias', 'reported', d5);

// ----------------------------------------------------------------------------
// D the misspecified and negative cases
// ----------------------------------------------------------------------------
function flaggedFraction(sc, make) {
  let flagged = 0;
  let unchecked = 0;
  let refusedN = 0;
  for (let r = 0; r < sc.replicates; r++) {
    const res = kmLeft(make(sc.baseSeed + r), { floor: 0 });
    if (res.status === 'refused') {
      refusedN++;
      continue;
    }
    if (res.status === 'dependent') {
      flagged++;
      if (res.interval !== null) refusedN += 1e6;
    }
    if (!res.independence.checked) unchecked++;
  }
  return { fraction: flagged / sc.replicates, flagged, unchecked, refused: refusedN, replicates: sc.replicates };
}
{
  const sc = SC.dependence.D1;
  const m = flaggedFraction(sc, seed => dependentRows(seed, 'dep-D1', sc.n, sc.rho));
  leg('D1.dependenceFlag', m.fraction >= 0.9 && m.refused < 1e6 ? 'pass' : 'fail', m);
}
{
  const sc = SC.dependence.D1b;
  const m = flaggedFraction(sc, seed => dependentRows(seed, 'dep-D1b', sc.n, sc.rho));
  leg('D1b.dependenceWeak', 'reported', m);
}
{
  const sc = SC.dependence.D2;
  const m = flaggedFraction(sc, seed => censoredRows(seed, 'dep-D2', sc.n, 2.5, true));
  leg('D2.falseAlarm', m.fraction <= 0.02 ? 'pass' : 'fail', m);
}
{
  const base = oracle.censored[11].rows.map(r => ({ value: r.value, censored: r.censored }));
  const cases = [];
  const tryCode = (name, want, res) => cases.push({ name, want, got: res.status === 'refused' ? res.code : res.status, ok: res.status === 'refused' && res.code === want });
  tryCode('four detections', 'too-few-detections', kmLeft([{ value: 1, censored: false }, { value: 2, censored: false }, { value: 3, censored: false }, { value: 4, censored: false }, { value: 0.5, censored: true }], { floor: 0, check: false }));
  tryCode('no floor', 'unbounded-tail', kmLeft(thr.handExamples.A3.rows, { check: false, minDetections: 1 }));
  tryCode('truncation bound on a row', 'truncated-input', kmLeft(base.map((r, i) => (i === 0 ? { ...r, u: 0 } : r)), { floor: 0, check: false }));
  tryCode('truncated sample', 'truncated-input', kmLeft(oracle.truncated[7].rows, { floor: 0 }));
  tryCode('NaN value', 'non-finite', kmLeft(base.map((r, i) => (i === 3 ? { ...r, value: NaN } : r)), { floor: 0, check: false }));
  tryCode('flag not boolean', 'bad-flag', kmLeft(base.map((r, i) => (i === 3 ? { ...r, censored: 'yes' } : r)), { floor: 0, check: false }));
  tryCode('level 1.5', 'level', kmLeft(base, { floor: 0, check: false, level: 1.5 }));
  leg('D3.kmRefusals', cases.every(c => c.ok) ? 'pass' : 'fail', { cases });
}
{
  const U = oracle.truncated[7].rows;
  const good = Array.from({ length: 12 }, (_, i) => ({ x: i + 1, u: i + 1 }));
  const cases = [];
  const tryCode = (name, want, res) => cases.push({ name, want, got: res.status === 'refused' ? res.code : res.status, ok: res.status === 'refused' && res.code === want });
  tryCode('associated set of 1 at from', 'thin-risk-set', lyndenBell(good, { from: 1 }));
  tryCode('row without a bound', 'missing-truncation-bound', lyndenBell(U.map((r, i) => (i === 2 ? { x: r.x } : r)), { from: -0.5 }));
  tryCode('a censored sample', 'censored-input', lyndenBell(oracle.censored[11].rows, { from: 0 }));
  tryCode('row flagged censored', 'censored-input', lyndenBell(U.map((r, i) => (i === 0 ? { ...r, censored: true } : r)), { from: -0.5 }));
  tryCode('u above x', 'bound-above-value', lyndenBell(U.map((r, i) => (i === 1 ? { x: r.x, u: r.x + 1 } : r)), { from: -0.5 }));
  tryCode('NaN x', 'non-finite', lyndenBell(U.map((r, i) => (i === 1 ? { x: NaN, u: r.u } : r)), { from: -0.5 }));
  tryCode('level 0', 'level', lyndenBell(U, { from: -0.5, level: 0 }));
  leg('D4.cmRefusals', cases.every(c => c.ok) ? 'pass' : 'fail', { cases });
}
{
  const rows5 = Array.from({ length: 5 }, (_, i) => ({ d: 0.1 * (i + 1), dmax: 0.9 }));
  const cases = [];
  const tryCode = (name, want, res) => cases.push({ name, want, got: res.status === 'refused' ? res.code : res.status, ok: res.status === 'refused' && res.code === want });
  tryCode('four objects', 'too-few-objects', vmaxStats(rows5.slice(0, 4), { D: 1 }));
  tryCode('zero distance', 'bad-distance', vmaxStats(rows5.map((r, i) => (i === 0 ? { ...r, d: 0 } : r)), { D: 1 }));
  tryCode('NaN', 'non-finite', vmaxStats(rows5.map((r, i) => (i === 0 ? { ...r, dmax: NaN } : r)), { D: 1 }));
  tryCode('completeness 1.2', 'bad-completeness', effectiveVolume({ D: 1, completeness: () => 1.2 }));
  tryCode('increasing completeness', 'bad-completeness', effectiveVolume({ D: 1, completeness: d => d }));
  const empty = spaceDensity([], { veffReference: 2 });
  cases.push({ name: 'empty bin', want: 'upper-limit and no density', got: `${empty.status} ${empty.density}`, ok: empty.status === 'upper-limit' && empty.density === null });
  leg('D6.vmaxRefusals', cases.every(c => c.ok) ? 'pass' : 'fail', { cases });
}

// ----------------------------------------------------------------------------
// V the V/Vmax ensembles
// ----------------------------------------------------------------------------
{
  const sc = SC.vmaxV.V1;
  let rej = 0;
  let refusedN = 0;
  let nSum = 0;
  let zSum = 0;
  let z2 = 0;
  for (let r = 0; r < sc.replicates; r++) {
    const pop = vmaxPopulation(sc.baseSeed + r, 'V1', {});
    const s = vmaxStats(pop, { D: 1 });
    if (s.status === 'refused') {
      refusedN++;
      continue;
    }
    nSum += s.n;
    zSum += s.z;
    z2 += s.z * s.z;
    if (Math.abs(s.z) > Z975) rej++;
  }
  const used = sc.replicates - refusedN;
  leg('V1.vmaxNull', inRange(rej / sc.replicates, 0.035, 0.065) ? 'pass' : 'fail', {
    rejectionRate: rej / sc.replicates,
    refused: refusedN,
    meanN: nSum / used,
    meanZ: zSum / used,
    varZ: z2 / used - (zSum / used) ** 2,
  });
}
{
  const sc = SC.vmaxV.V1n;
  let rej = 0;
  let refusedN = 0;
  for (let r = 0; r < sc.replicates; r++) {
    const pop = vmaxPopulation(sc.baseSeed + r, 'V1n', { evolving: true });
    const s = vmaxStats(pop, { D: 1 });
    if (s.status === 'refused') {
      refusedN++;
      continue;
    }
    if (Math.abs(s.z) > Z975) rej++;
  }
  leg('V1n.vmaxEvolution', rej / sc.replicates >= 0.95 ? 'pass' : 'fail', {
    rejectionRate: rej / sc.replicates,
    refused: refusedN,
  });
}
{
  const truth = LAMBDA * (2 * normalCdf(0.5) - 1);
  for (const [id, key, ramp] of [
    ['C4.densityCoverage', 'C4', false],
    ['C4b.rampCoverage', 'C4b', true],
  ]) {
    const sc = SC.vmaxV[key];
    let hit = 0;
    let empty = 0;
    let countSum = 0;
    for (let r = 0; r < sc.replicates; r++) {
      const pop = vmaxPopulation(sc.baseSeed + r, key, { ramp });
      const bin = pop.filter(p => Math.abs(p.Z) < 0.5);
      const veffs = bin.map(p =>
        ramp
          ? effectiveVolume({ D: 1, completeness: d => 1 / (1 + Math.pow(d / p.dmax, 8)) })
          : VOL1 * Math.min(p.dmax, 1) ** 3
      );
      const res = spaceDensity(veffs);
      if (res.status !== 'ok') {
        empty++;
        continue;
      }
      countSum += bin.length;
      if (res.interval[0] <= truth && truth <= res.interval[1]) hit++;
    }
    leg(id, inRange(hit / sc.replicates, 0.92, 0.98) ? 'pass' : 'fail', {
      coverage: hit / sc.replicates,
      emptyBins: empty,
      meanBinCount: countSum / (sc.replicates - empty),
      truth,
      replicates: sc.replicates,
    });
  }
}

// ----------------------------------------------------------------------------
// X the authentic legs: NOT RUN
// ----------------------------------------------------------------------------
for (const id of ['X1.kmAuthentic', 'X2.cmAuthentic', 'X3.vmaxAuthentic', 'X4.citedForms'])
  leg(id, 'not-run', { request: checks[id].request });

// ----------------------------------------------------------------------------
// the verdict, by the committed function
// ----------------------------------------------------------------------------
const JUDGED = new Set(['integrity', 'oracle', 'analytic', 'reference', 'accuracy', 'coverage', 'misspecified', 'refusals']);
const passAll = est =>
  results
    .filter(r => (r.estimator === est || r.estimator === 'all') && JUDGED.has(r.group))
    .every(r => r.status === 'pass');
const km = passAll('km');
const cm = passAll('cm');
const vm = results
  .filter(r => r.estimator === 'vmax' && JUDGED.has(r.group))
  .every(r => r.status === 'pass');
const letter = km && cm ? 'A' : km || cm ? 'B' : 'C';
const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
const out = {
  format: 'gravitas.censoring-truncation-gate-results/1',
  environment: { node: process.version, thresholdsSha256: sha(thrBytes), oracleSha256: sha(oracleBytes) },
  rows: results,
  counts,
  verdict: {
    km,
    cm,
    vmaxAdmitted: vm,
    letter,
    slice: letter === 'B' ? (km ? 'B-KM' : 'B-CM') : null,
  },
  cpuSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
};
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ counts, verdict: out.verdict, cpuSeconds: out.cpuSeconds }));
for (const r of results) console.log(r.status.padEnd(9), r.id);
