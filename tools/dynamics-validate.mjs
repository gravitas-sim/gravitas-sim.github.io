#!/usr/bin/env node
// =============================================================================
// The dynamics kernel and the engine's cluster runs against their committed thresholds (Prompt 237)
// -----------------------------------------------------------------------------
//   npm run dynamics:validate                    print the table
//   npm run dynamics:validate -- --json          print it as JSON
//   npm run dynamics:validate -- --write-results rewrite tests/fixtures/dynamics/results.json and failed-legs.json
//   npm run dynamics:validate -- --only=A,O1     run the rows whose id starts with one of these
//
// tests/fixtures/dynamics/thresholds.json fixed every bound before any module under js/kernels/dynamics/
// existed. The oracle (tools/dynamics-oracle/oracle.py, numpy and scipy, no Gravitas code) pinned its closed
// forms in oracle-results.json, the independent reference (tools/dynamics-oracle/reference.py and hermite.c)
// pinned its runs in reference-runs.json, and the engine's runs (tools/dynamics-runs.mjs) are in
// engine-runs.json. A crossed bound is a failed row, left failing in failed-legs.json; a leg whose data was
// never supplied is NOT RUN and says so. The verdict is the rule thresholds.json writes.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/dynamics/index.js';
import { sigmaOfLevel } from '../js/kernels/statistics/intervals.js';
import { readGrid } from '../js/dataKinds/grid.js';
import { measureCluster, measureSatellite } from './dynamics-measure.mjs';
import { stream } from '../js/random/streams.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tests/fixtures/dynamics');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const maybe = name => (existsSync(path.join(FIX, name)) ? read(name) : null);

const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const only = (argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const wanted = id => only.length === 0 || only.some(p => id.startsWith(p));

const thr = read('thresholds.json');
const oracle = read('oracle-results.json');
const reference = maybe('reference-runs.json');
const engine = maybe('engine-runs.json');
const published = maybe('published-relaxation-times.json');
const lim = id => thr.checks.find(c => c.id === id).limits;

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const rows = [];
const row = (id, status, measured, note = '') => {
  const c = thr.checks.find(x => x.id === id);
  rows.push({ id, group: c.group, status, measured, note });
};
const judge = (id, pass, measured, note = '') => row(id, pass ? 'pass' : 'fail', measured, note);
const notRun = (id, why) => row(id, 'not-run', null, why);
const value = r => (r.status === 'ok' ? r.value : NaN);

// --- A -----------------------------------------------------------------------------------------------------
function legA() {
  if (wanted('A1')) {
    let worst = 0;
    for (const c of oracle.A1) {
      worst = Math.max(
        worst,
        rel(value(K.dynamicalTime({ radius: c.R_pc, mass: c.M_sun })), c.tDyn_Myr),
        rel(value(K.crossingTime({ radius: c.R_pc, speed: c.v_kms })), c.tCross_Myr)
      );
    }
    judge('A1', worst <= lim('A1').relative, { worstRelative: worst, cases: oracle.A1.length });
  }
  if (wanted('A2')) {
    let worst = 0;
    let ident = 0;
    for (const c of oracle.A2) {
      const t = value(K.halfMassRelaxationTime({ N: c.N, halfMassRadius: c.rh_pc, meanMass: c.m_sun, gamma: c.gamma }));
      worst = Math.max(worst, rel(t, c.tRh_Myr));
      const td = value(K.dynamicalTime({ radius: c.rh_pc, mass: c.N * c.m_sun }));
      ident = Math.max(ident, rel(t, (K.CITED.spitzerRelaxation.value * c.N * td) / Math.log(c.gamma * c.N)));
    }
    judge('A2', worst <= lim('A2').relative && ident <= lim('A2').identityRelative, { worstRelative: worst, worstIdentity: ident, cases: oracle.A2.length });
  }
  if (wanted('A3')) {
    const a = oracle.A3;
    const eta = rel(K.VIRIAL.eta, a.eta);
    const mass = rel(K.VIRIAL.eta * a.sigmaLos2 * a.projectedHalfMassRadius, a.mass);
    judge('A3', eta <= lim('A3').etaRelative && mass <= lim('A3').massRelative, { etaRelative: eta, massRelative: mass, etaKernel: K.VIRIAL.eta, etaOracle: a.eta });
  }
  if (wanted('A4')) {
    let worst = 0;
    for (const c of oracle.A4.f) worst = Math.max(worst, Math.abs(K.frictionFunction(c.X) - c.f));
    const small = rel(K.frictionFunction(oracle.A4.smallX.X), oracle.A4.smallX.limit);
    const large = Math.abs(K.frictionFunction(oracle.A4.largeX.X) - 1);
    judge('A4', worst <= lim('A4').absolute && small <= lim('A4').smallXRelative && large <= lim('A4').largeXAbsolute, { worstAbsolute: worst, smallXRelative: small, largeXAbsolute: large });
  }
  if (wanted('A5')) {
    const a = oracle.A5;
    const radius = 1; // pc
    const vc = 10; // km/s: the physics is scale free, G v_c r = fixed by the ratio
    const mass = a.massRatio * ((vc * vc * radius) / K.G_PC_KMS2_MSUN);
    const t = K.sinkingTimeIsothermal({ radius, circularSpeed: vc, mass, lnLambda: a.lnLambda, finalRadius: a.rFinal * radius });
    const unit = (radius / vc) * K.PC_PER_KMS_MYR;
    const r = rel(value(t), a.tNumeric * unit);
    judge('A5', r <= lim('A5').relative, { relative: r, kernelMyr: value(t), integratedMyr: a.tNumeric * unit });
  }
  if (wanted('A6')) {
    let worst = 0;
    for (const c of oracle.A6) worst = Math.max(worst, Math.abs(value(K.coulombLogarithm({ bmax: c.bmax, bmin: c.bmin })) - c.lnLambda));
    const refusals = [
      K.coulombLogarithm({ bmax: 1, bmin: 2 }),
      K.coulombLogarithm({ bmax: 2, bmin: 2 }),
      K.coulombLogarithm({ bmax: 2, bmin: 0 }),
      K.coulombLogarithm({ bmax: -1, bmin: -2 }),
    ].filter(r => r.status === 'refused').length;
    judge('A6', worst <= lim('A6').absolute && refusals === lim('A6').refusals, { worstAbsolute: worst, refusals });
  }
  if (wanted('A7')) {
    let worst = 0;
    for (const c of oracle.A7)
      worst = Math.max(worst, rel(value(K.localRelaxationTime({ speed: c.v_kms, massDensity: c.rho_Msun_pc3, mass: c.m_sun, lnLambda: c.lnLambda })), c.tRelax_Myr));
    // an equal-mass Plummer model of 1e5 stars of 0.5 solar masses, scale radius 2 pc, at its half-mass radius
    const N = 1e5;
    const m = 0.5;
    const a = 2;
    const rh = 1.30478 * a;
    const M = N * m;
    const rho = ((3 * M) / (4 * Math.PI * a ** 3)) * (1 + (rh / a) ** 2) ** -2.5;
    const sigma2 = ((K.G_PC_KMS2_MSUN * M) / (6 * a)) * (1 + (rh / a) ** 2) ** -0.5;
    const gamma = 0.11;
    const lnL = Math.log(gamma * N);
    const local = value(K.localRelaxationTime({ speed: Math.sqrt(3 * sigma2), massDensity: rho, mass: m, lnLambda: lnL }));
    const half = value(K.halfMassRelaxationTime({ N, halfMassRadius: rh, meanMass: m, gamma }));
    const factor = Math.max(half / local, local / half);
    judge('A7', worst <= lim('A7').relative && factor <= lim('A7').consistencyFactor, { worstRelative: worst, halfMassOverLocal: half / local, factor });
  }
}

// --- O1 ----------------------------------------------------------------------------------------------------
function legO() {
  if (!wanted('O1')) return;
  let worst = 0;
  let classes = true;
  for (const c of oracle.O1) {
    const g = c.gamma;
    const dyn = value(K.dynamicalTime({ radius: c.rh_pc, mass: c.N * c.mMean_sun }));
    const rh = value(K.halfMassRelaxationTime({ N: c.N, halfMassRadius: c.rh_pc, meanMass: c.mMean_sun, gamma: g }));
    const seg = value(K.segregationTime({ halfMassRelaxation: rh, meanMass: c.mMean_sun, mass: c.mStar_sun }));
    const ev = value(K.evaporationTime({ halfMassRelaxation: rh }));
    const sink = value(K.sinkingTimeIsothermal({ radius: c.r_pc, circularSpeed: c.vc_kms, mass: c.M_sun, lnLambda: c.lnLambda }));
    worst = Math.max(worst, rel(dyn, c.tDyn_Myr), rel(rh, c.tRh_Myr), rel(seg, c.tSeg_Myr), rel(ev, c.tEv_Myr), rel(sink, c.tSink_Myr));
    if (K.criterion({ time: c.T_Myr, halfMassRelaxation: rh }).kind !== c.class) classes = false;
  }
  judge('O1', worst <= lim('O1').relative && classes, { worstRelative: worst, classesEqual: classes, cases: oracle.O1.length });
}

// --- B1 ----------------------------------------------------------------------------------------------------
function legB() {
  if (!wanted('B1')) return;
  if (!published) {
    notRun('B1', 'no published table of relaxation times was supplied (tests/fixtures/dynamics/published-relaxation-times.json); only Carl can fetch one (thresholds.json, supply.B1)');
    return;
  }
  const L = lim('B1');
  const errs = [];
  for (const c of published.clusters) {
    const N = Math.round(c.mass / L.m_mean);
    const t = value(K.halfMassRelaxationTime({ N, halfMassRadius: c.halfMassRadius, meanMass: L.m_mean, gamma: L.gamma }));
    errs.push({ name: c.name, dex: Math.abs(Math.log10(t * 1e6) - c.logTrhYears) });
  }
  const worst = Math.max(...errs.map(e => e.dex));
  judge('B1', published.clusters.length >= L.clusters && worst <= L.dex, { clusters: published.clusters.length, worstDex: worst, errs });
}

// --- C and D -----------------------------------------------------------------------------------------------
function legC() {
  if (!['C1', 'C2', 'C3'].some(wanted)) return;
  const u = stream('noise', thr.seeds.coverage, 'members');
  let n = 0;
  let c68 = 0;
  let c95 = 0;
  let b68 = 0;
  let b95 = 0;
  const ratios = [];
  let notConstrained = 0;
  const M = 1e5;
  for (let k = 0; k < lim('C1').ensemble; k++) {
    const members = 25 + Math.floor(u() * 126);
    const c = K.plummerCluster({ members, scaleRadius: 3, mass: M, errorFraction: 0.1, seed: `${thr.seeds.coverage}:${k}` });
    const r = K.virialMass({ x: c.x, y: c.y, v: c.v, e: c.e, seed: `${thr.seeds.coverage}:boot:${k}` });
    if (r.status !== 'ok') {
      notConstrained++;
      continue;
    }
    n++;
    if (r.lo <= M && M <= r.hi) c68++;
    const z = sigmaOfLevel(0.95);
    const total = Math.hypot(r.parts.bootstrapSigmaLn, r.parts.structureSigmaLn);
    if (r.mass * Math.exp(-z * total) <= M && M <= r.mass * Math.exp(z * total)) c95++;
    const zb = sigmaOfLevel(0.6827);
    const sb = r.parts.bootstrapSigmaLn;
    if (r.mass * Math.exp(-zb * sb) <= M && M <= r.mass * Math.exp(zb * sb)) b68++;
    if (r.mass * Math.exp(-z * sb) <= M && M <= r.mass * Math.exp(z * sb)) b95++;
    ratios.push(r.mass / M);
  }
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const cover68 = c68 / n;
  const cover95 = c95 / n;
  if (wanted('C1')) judge('C1', cover68 >= lim('C1').min && cover68 <= lim('C1').max, { coverage: cover68, estimates: n, notConstrained, level: 0.6827, informationOnlyWithoutStructureTerm: b68 / n });
  if (wanted('C2')) judge('C2', cover95 >= lim('C2').min && cover95 <= lim('C2').max, { coverage: cover95, estimates: n, level: 0.95, informationOnlyWithoutStructureTerm: b95 / n });
  if (wanted('C3')) judge('C3', median >= lim('C3').min && median <= lim('C3').max, { medianRatio: median, estimates: n });
}

function legD() {
  if (wanted('D1')) {
    const a = K.plummerCluster({ members: 19, scaleRadius: 3, mass: 1e5, errorFraction: 0.1, seed: 'd1-19' });
    const b = K.plummerCluster({ members: 20, scaleRadius: 3, mass: 1e5, errorFraction: 0.1, seed: 'd1-20' });
    const ra = K.virialMass({ x: a.x, y: a.y, v: a.v, e: a.e, seed: 'd1' });
    const rb = K.virialMass({ x: b.x, y: b.y, v: b.v, e: b.e, seed: 'd1' });
    judge('D1', ra.status === 'not-constrained' && ra.code === 'members' && ra.members === 19 && rb.status === 'ok', { at19: ra.status, at20: rb.status });
  }
  if (wanted('D2')) {
    const L = lim('D2');
    let unresolved = 0;
    let resolved = 0;
    for (let k = 0; k < L.draws; k++) {
      const a = K.plummerCluster({ members: 60, scaleRadius: 3, mass: 1e5, errorFraction: 2, seed: `${thr.seeds.refusal}:u:${k}` });
      if (K.virialMass({ x: a.x, y: a.y, v: a.v, e: a.e, seed: 'd2', draws: 100 }).status === 'not-constrained') unresolved++;
      const b = K.plummerCluster({ members: 60, scaleRadius: 3, mass: 1e5, errorFraction: 0.1, seed: `${thr.seeds.refusal}:r:${k}` });
      if (K.virialMass({ x: b.x, y: b.y, v: b.v, e: b.e, seed: 'd2', draws: 100 }).status === 'ok') resolved++;
    }
    judge('D2', unresolved / L.draws >= L.unresolvedNotConstrainedMin && resolved / L.draws >= L.resolvedEstimateMin, { unresolvedNotConstrained: unresolved / L.draws, resolvedEstimate: resolved / L.draws });
  }
  if (wanted('D3')) {
    const c = K.plummerCluster({ members: 40, scaleRadius: 3, mass: 1e5, errorFraction: 0.1, seed: 'd3' });
    const with_ = patch => K.virialMass({ x: c.x, y: c.y, v: c.v, e: c.e, seed: 'd3', ...patch });
    const bad = (arr, i, val) => {
      const a = Float64Array.from(arr);
      a[i] = val;
      return a;
    };
    const results = [
      with_({ v: bad(c.v, 3, NaN) }),
      with_({ e: bad(c.e, 3, 0) }),
      with_({ x: bad(c.x, 3, Infinity) }),
      with_({ y: c.y.slice(0, 39) }),
      with_({ x: new Float64Array(40), y: new Float64Array(40) }),
    ];
    judge('D3', results.every(r => r.status === 'refused'), { codes: results.map(r => r.code) });
  }
  if (wanted('D4')) {
    const results = [
      K.criterion({ time: 0, halfMassRelaxation: 1 }),
      K.criterion({ time: 1, halfMassRelaxation: 0 }),
      K.halfMassRelaxationTime({ N: 0, halfMassRadius: 1, meanMass: 1, gamma: 0.11 }),
      K.halfMassRelaxationTime({ N: 1000, halfMassRadius: -1, meanMass: 1, gamma: 0.11 }),
      K.halfMassRelaxationTime({ N: 1000, halfMassRadius: 1, meanMass: 0, gamma: 0.11 }),
      K.halfMassRelaxationTime({ N: 10, halfMassRadius: 1, meanMass: 1, gamma: 0.11 }),
      K.frictionDeceleration({ mass: 1, speed: 1, density: 1, sigma: 1 }),
      K.sinkingTimeIsothermal({ radius: 1, circularSpeed: 1, mass: 1 }),
    ];
    judge('D4', results.every(r => r.status === 'refused'), { codes: results.map(r => r.code) });
  }
}

// --- R and G -----------------------------------------------------------------------------------------------
function legR() {
  const ids = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
  if (!reference) {
    for (const id of ids) if (wanted(id)) notRun(id, 'the reference runs were not pinned (tests/fixtures/dynamics/reference-runs.json)');
    return;
  }
  const cons = [...reference.S.conservation, ...reference.D.conservation];
  if (wanted('R1')) {
    const worst = Math.max(...cons.map(c => c.energyRelative));
    judge('R1', worst <= lim('R1').max, { worst, runs: cons.length });
  }
  if (wanted('R2')) {
    const p = Math.max(...cons.map(c => c.momentum));
    const l = Math.max(...cons.map(c => c.angularMomentum));
    judge('R2', p <= lim('R2').momentum && l <= lim('R2').angularMomentum, { momentum: p, angularMomentum: l });
  }
  if (wanted('R3')) {
    const t = reference.R3;
    const L = lim('R3');
    judge('R3', t.periodRelative <= L.periodRelative && t.energyRelative <= L.energyRelative && t.angularMomentumRelative <= L.angularMomentumRelative, { periodRelative: t.periodRelative, energyRelative: t.energyRelative, angularMomentumRelative: t.angularMomentumRelative });
  }
  if (wanted('R4')) {
    let worst = 0;
    let count = 0;
    for (const fam of ['S', 'D'])
      for (const seed of Object.keys(reference.snapshots[fam]))
        for (const [k, snap] of Object.entries(reference.snapshots[fam][seed])) {
          const mine = fam === 'S' ? measureCluster(snap) : { rs: measureSatellite(snap) };
          for (const key of Object.keys(snap.observables)) {
            worst = Math.max(worst, rel(mine[key], snap.observables[key]));
            count++;
          }
        }
    judge('R4', worst <= lim('R4').relative, { worstRelative: worst, comparisons: count });
  }
  if (wanted('R5')) judge('R5', reference.R5.relative <= lim('R5').relative, { relative: reference.R5.relative });
  if (wanted('R6')) {
    const p = reference.R6;
    const L = lim('R6');
    judge('R6', p.mass <= L.mass && p.centre <= L.centre && p.momentum <= L.centre && p.virial <= L.virial && p.radius <= L.radius, p);
  }
  if (wanted('R7')) judge('R7', reference.R7.positionAbsolute <= lim('R7').positionAbsolute, { positionAbsolute: reference.R7.positionAbsolute, time: reference.R7.time });
}

const stats = list => {
  const n = list.length;
  const mean = list.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(list.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  return { mean, sd, n };
};

function compare(engineSeries, referenceSeries, { relative, absolute = 0, sigmas }) {
  const e = stats(engineSeries);
  const r = stats(referenceSeries);
  const se = Math.sqrt(e.sd ** 2 / e.n + r.sd ** 2 / r.n);
  const bound = (relative ? relative * Math.abs(r.mean) : 0) + absolute + sigmas * se;
  return { engine: e.mean, reference: r.mean, difference: e.mean - r.mean, bound, se, pass: Math.abs(e.mean - r.mean) <= bound };
}

function legG() {
  const ids = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
  if (!engine || !reference) {
    for (const id of ids) if (wanted(id)) notRun(id, 'the engine runs (tests/fixtures/dynamics/engine-runs.json) or the reference runs are not pinned');
    return;
  }
  const gs = readGrid(engine.S);
  const gd = readGrid(engine.D);
  const so = engine.S.outputs.map(o => o.name);
  const seedsS = engine.S.axes[0].values;
  const nT = engine.S.axes[1].values.length;
  const eng = (name, seed, k) => gs.values[(so.indexOf(name) * seedsS.length + seedsS.indexOf(seed)) * nT + k];
  const legsS = [
    ['G1', 'r50', { relative: lim('G1').relative }],
    ['G2', 'r10', { relative: lim('G2').relative }],
    ['G3', 'r90', { relative: lim('G3').relative }],
    ['G4', 'seg', { relative: lim('G4').relative }],
    ['G5', 'esc', { absolute: lim('G5').absolute }],
  ];
  for (const [id, name, tol] of legsS) {
    if (!wanted(id)) continue;
    const L = lim(id);
    const per = [];
    for (let k = 1; k <= L.times; k++) {
      const e = seedsS.map(s => eng(name, s, k));
      const r = reference.S.seeds.map((_, i) => reference.S[name][i][k]);
      per.push({ k, ...compare(e, r, { ...tol, sigmas: L.sigmas }) });
    }
    const passing = per.filter(p => p.pass).length;
    judge(id, passing >= L.minimumPassing && (!L.lastMustPass || per[per.length - 1].pass), { observable: name, passing, of: L.times, last: per[per.length - 1].pass, perTime: per.map(p => ({ k: p.k, engine: +p.engine.toFixed(4), reference: +p.reference.toFixed(4), bound: +p.bound.toFixed(4), pass: p.pass })) });
  }
  const seedsD = engine.D.axes[0].values;
  const nD = engine.D.axes[1].values.length;
  for (const id of ['G6', 'G7']) {
    if (!wanted(id)) continue;
    const L = lim(id);
    const windowMean = (get, s) => {
      let t = 0;
      for (let j = L.window[0]; j <= L.window[1]; j++) t += get(s, j);
      return t / (L.window[1] - L.window[0] + 1);
    };
    const e = seedsD.map(s => windowMean((q, j) => gd.values[seedsD.indexOf(q) * nD + j], s));
    const r = reference.D.seeds.map((_, i) => windowMean((q, j) => reference.D.rs[i][j], i));
    const c = compare(e, r, { relative: L.relative, sigmas: L.sigmas });
    judge(id, c.pass, { engine: c.engine, reference: c.reference, difference: c.difference, bound: c.bound, standardError: c.se });
  }
}

legA();
legO();
legB();
legC();
legD();
legR();
legG();

const order = thr.checks.map(c => c.id);
rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

function verdictOf() {
  const get = id => rows.find(r => r.id === id)?.status;
  const refOk = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].every(id => get(id) === 'pass');
  const gate = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
  if (!refOk || gate.some(id => !['pass', 'fail'].includes(get(id)))) return 'C';
  return gate.every(id => get(id) === 'pass') ? 'A' : 'B';
}

const complete = only.length === 0;
const out = { format: 'gravitas.dynamics-results/1', node: process.version, verdict: complete ? verdictOf() : null, rows };

if (flag('--write-results')) {
  if (!complete) {
    console.error('--write-results needs every row: do not pass --only');
    process.exit(2);
  }
  writeFileSync(path.join(FIX, 'results.json'), `${JSON.stringify(out, null, 2)}\n`);
  const failed = rows.filter(r => r.status !== 'pass').map(r => ({ id: r.id, status: r.status, measured: r.measured, note: r.note || (r.status === 'fail' ? 'crossed the bound committed in thresholds.json; left failing' : '') }));
  writeFileSync(
    path.join(FIX, 'failed-legs.json'),
    `${JSON.stringify({ note: 'Legs of tests/fixtures/dynamics/thresholds.json that crossed their bound or were not run, kept as measured. Only Carl resets a bound.', failed }, null, 2)}\n`
  );
}
if (flag('--json')) console.log(JSON.stringify(out, null, 2));
else {
  for (const r of rows) console.log(`${r.id.padEnd(4)} ${r.status.toUpperCase().padEnd(8)} ${r.note || JSON.stringify(r.measured).slice(0, 150)}`);
  if (complete) console.log(`verdict ${out.verdict}`);
}
process.exit(rows.some(r => r.status === 'fail') ? 1 : 0);
