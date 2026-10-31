#!/usr/bin/env node
// =============================================================================
// The joint transit and radial-velocity model against its committed thresholds (Prompt 227)
// -----------------------------------------------------------------------------
//   npm run joint-inference:validate                    print the table
//   npm run joint-inference:validate -- --json          print it as JSON
//   npm run joint-inference:validate -- --write-failed  rewrite tests/fixtures/joint-inference/failed-legs.json
//   npm run joint-inference:validate -- --write-results rewrite tests/fixtures/joint-inference/results.json
//   npm run joint-inference:validate -- --only=A,B1     run the rows whose id starts with one of these
//   npm run joint-inference:validate -- --workers=2     processes for the coverage ensemble (default 2)
//
// tests/fixtures/joint-inference/thresholds.json fixed every bound before any of the joint
// model existed; the oracle (tools/joint-inference-oracle/oracle.py: numpy, scipy and batman, no
// Gravitas code) pinned its results in oracle-results.json before the model did. This runs the
// checks and judges them against the bounds read from that file. A crossed bound is a failed row,
// left failing in failed-legs.json; a leg whose data was never supplied is NOT RUN and says so.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { fitOnce } from '../js/inference/infer.js';
import { TRANSIT_RV_JOINT, refusalsFor } from '../js/inference/jointModel.js';
import {
  amplitude,
  bulkDensity,
  circularEquivalent,
  massFromAmplitude,
  planetOf,
  propagatePlanet,
  systemFromMass,
  RSUN_PER_RJUP,
} from '../js/inference/jointPlanet.js';
import { halfDuration, kippingQ } from '../js/inference/transit.js';
import { syntheticJoint } from '../js/inference/synthetic.js';
import { rvCurve } from '../js/inference/rv.js';
import { percentile } from '../js/inference/rvMonteCarlo.js';
import { percentileInterval } from '../js/kernels/statistics/intervals.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/joint-inference';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${DIR}/thresholds.json`);
const ORA = read(`${DIR}/oracle-results.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const SYS = THR.systems;
const ST = SYS.stellar;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rad = d => (d * Math.PI) / 180;

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const argValue = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const only = argValue('only', '').split(',').filter(Boolean);
const wanted = id => !only.length || only.some(p => id.startsWith(p));

const EXPOSURE = THR.sampling.ensembleLightCurve.exposure_d;
const FIT_SS = THR.sampling.ensembleLightCurve.fitSupersample;
const JBOUNDS = THR.sampling.fit.jitterBounds_ms;
const SIGMA_F = THR.sampling.ensembleLightCurve.sigma;
const SIGMA_RV = THR.sampling.oracleGrid.rv.sigma_ms;
const JITTER_RV = THR.sampling.oracleGrid.rv.jitter_ms;
const ZP = THR.sampling.oracleGrid.rv.zeroPoints_ms;

// ---- helpers ---------------------------------------------------------------------------

/** The stated star: a catalog-like entry with the stated sigmas and correlation. */
const statedStar = (Ms, Rs, source = 'stated for the validation') => ({
  mass: { value: Ms, sigma: Ms * ST.Ms.sigma_rel, source },
  radius: { value: Rs, sigma: Rs * ST.Rs.sigma_rel, source },
  correlation: ST.correlation,
});

/** A frame from the oracle's own data: flux group 0, velocities of instruments 1 and 2. */
function oracleFrame(name) {
  const d = ORA.systems[name].data;
  const x = Float64Array.from([...d.t_lc, ...d.t_rv]);
  return {
    x,
    y: Float64Array.from([...d.flux, ...d.rv]),
    sigma: Float64Array.from([
      ...d.t_lc.map(() => SIGMA_F),
      ...d.t_rv.map(() => SIGMA_RV),
    ]),
    groups: Int32Array.from([...d.t_lc.map(() => 0), ...d.inst.map(i => 1 + i)]),
    rows: Array.from(x, (_, i) => i),
    counts: { total: x.length, used: x.length, masked: 0, missing: 0, withoutUncertainty: 0 },
    columns: { x: 't', y: 'y', sigma: 's' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}

function request(S, { freeE, star, roles, jitterHi = JBOUNDS[1], t0Span = 0.3 }) {
  const parameters = {
    t0: { lo: S.t0 - t0Span, hi: S.t0 + t0Span },
    P: { lo: S.P - 0.05, hi: S.P + 0.05 },
    jitter: { lo: JBOUNDS[0], hi: jitterHi },
  };
  if (!freeE) {
    parameters.sqrtEcosw = { mode: 'fixed', value: 0 };
    parameters.sqrtEsinw = { mode: 'fixed', value: 0 };
  }
  return {
    model: { id: 'transit-rv-joint' },
    parameters,
    settings: {
      exposure: EXPOSURE,
      supersample: FIT_SS,
      annuli: 64,
      roles,
      ...(star ? { stellar: star } : {}),
    },
  };
}

const param = (fit, n) => fit.parameters.find(p => p.name === n);
const dv = (fit, n) => fit.derived.find(d => d.name === n);
const valuesOf = fit => Object.fromEntries(fit.parameters.map(p => [p.name, p.value]));

/** Truth of a system built from its mass and the true star. */
function truthOf(S, star = { Ms: S.Ms_Msun, Rs: S.Rs_Rsun }) {
  const w = rad(S.w_deg);
  const o = systemFromMass({ P: S.P, Mp: S.Mp_MJup, Ms: star.Ms, Rs: star.Rs, b: S.b, e: S.e, w });
  const { q1, q2 } = kippingQ(S.u1, S.u2);
  return {
    t0: S.t0,
    P: S.P,
    k: S.k,
    aRs: o.aRs,
    b: S.b,
    q1,
    q2,
    K: o.K,
    sqrtEcosw: Math.sqrt(S.e) * Math.cos(w),
    sqrtEsinw: Math.sqrt(S.e) * Math.sin(w),
    Mp: S.Mp_MJup,
    Rp: S.k * star.Rs * RSUN_PER_RJUP,
    rhoP: bulkDensity(S.Mp_MJup, S.k * star.Rs * RSUN_PER_RJUP),
  };
}

const EP = THR.sampling.ensembleLightCurve;
function lcTimes() {
  const out = [];
  for (let t = EP.start; t < EP.start + EP.days; t += EP.bin_d)
    if (!(t > EP.start + EP.gapAfter_d && t < EP.start + EP.gapAfter_d + EP.gapLength_d))
      out.push(t);
  return out;
}

function rvEpochs(seed, n = 30, span = 40) {
  const u = stream('noise', `${THR.seeds.ensemble}:${seed}:epochs`);
  const t = Array.from({ length: n }, () => u() * span).sort((a, b) => a - b);
  return { times: t, groups: t.map((_, i) => (i < n / 2 ? 0 : 1)) };
}

function synth(S, seed, { star, jitter = JITTER_RV, extra = 0, rvOnly = false, lcSigma = SIGMA_F } = {}) {
  const t = truthOf(S, star);
  const ep = rvEpochs(seed);
  const data = syntheticJoint({
    seed: `${THR.seeds.ensemble}:${seed}`,
    lc: { times: lcTimes(), sigma: lcSigma, exposure: EXPOSURE, supersample: 11 },
    rv: { times: ep.times, groups: ep.groups, sigma: SIGMA_RV, jitter, zeroPoints: ZP },
    truth: t,
  });
  if (extra) {
    // an unmodelled second planet in the velocities
    const nf = lcTimes().length;
    for (let j = nf; j < data.x.length; j++)
      data.y[j] += extra * Math.sin((2 * Math.PI * (data.x[j] - 1.7)) / 11.6);
  }
  return { data: rvOnly ? rvOnlyOf(data) : data, truth: t };
}

function rvOnlyOf(data) {
  const keep = [];
  data.groups.forEach((g, i) => {
    if (g > 0) keep.push(i);
  });
  const pick = a => (a ? Float64Array.from(keep, i => a[i]) : null);
  return {
    ...data,
    x: pick(data.x),
    y: pick(data.y),
    sigma: pick(data.sigma),
    groups: Int32Array.from(keep, i => data.groups[i] - 1),
    rows: keep,
    counts: { ...data.counts, total: keep.length, used: keep.length },
  };
}

const fit = (S, data, opts) => fitOnce(request(S, opts), data);

// ---- A: analytic ----------------------------------------------------------------------------

function groupA() {
  const A = ORA.analytic;
  if (wanted('A1')) {
    let worst = 0;
    for (const c of A.massFromK) {
      const g = massFromAmplitude({ K: c.K, P: c.P_d, e: c.e, sini: c.sini, Ms: c.Ms_Msun });
      worst = Math.max(worst, Math.abs(g - c.oracleMp) / c.oracleMp);
      // the round trip through the forward relation too
      const back = amplitude({ Mp: g, P: c.P_d, e: c.e, sini: c.sini, Ms: c.Ms_Msun });
      worst = Math.max(worst, Math.abs(back - c.K) / c.K);
    }
    row('A1', worst <= lim('A1').relative, { worstRelative: worst, cases: A.massFromK.length });
  }
  if (wanted('A2')) {
    const L = lim('A2');
    const K = amplitude({ Mp: 1, P: 4332.589, e: 0, sini: 1, Ms: 1 });
    const back = massFromAmplitude({ K, P: 4332.589, e: 0, sini: 1, Ms: 1 });
    row('A2', K >= L.Kmin_ms && K <= L.Kmax_ms && Math.abs(back - 1) <= L.massRelative, { K: sig(K, 6), oracleK: A.jupiter.K, back });
  }
  if (wanted('A3')) {
    const L = lim('A3');
    const mj = THR.constants.GM_earth_m3s2 / THR.constants.GM_jup_m3s2;
    const K = amplitude({ Mp: mj, P: 365.25636, e: 0, sini: 1, Ms: 1 });
    row('A3', K >= L.Kmin_ms && K <= L.Kmax_ms, { K: sig(K, 6), oracleK: A.earth.K });
  }
  if (wanted('A4')) {
    const g = bulkDensity(1, 1);
    const rel = Math.abs(g - A.densityJupiter_gcc) / A.densityJupiter_gcc;
    row('A4', rel <= lim('A4').relative, { value: sig(g, 10), oracle: A.densityJupiter_gcc, relative: rel });
  }
  if (wanted('A5')) {
    let worst = 0;
    for (const g of A.velocityGeometry) {
      const e = g.e;
      const w = rad(g.w_deg);
      const v = rvCurve(g.times, {
        P: 5,
        tc: 1,
        K: 1,
        sqrtEcosw: Math.sqrt(e) * Math.cos(w),
        sqrtEsinw: Math.sqrt(e) * Math.sin(w),
      });
      g.times.forEach((_, i) => (worst = Math.max(worst, Math.abs(v[i] - g.v_over_K[i]))));
    }
    const sign = A.circularSignAfterTransit;
    row('A5', worst <= lim('A5').maxAbsOverK && sign < 0, { maxAbsOverK: worst, signAfterTransit: sign });
  }
  if (wanted('A6')) {
    let worst = 0;
    const per = {};
    for (const c of A.durations) {
      const w = rad(c.w_deg);
      const aC = circularEquivalent(c.aRs_true, c.e, w);
      const T14 = 2 * halfDuration({ P: c.P, k: c.k, aRs: aC, b: c.b });
      const rel = Math.abs(T14 - c.T14) / c.T14;
      per[`e${c.e}w${c.w_deg}`] = sig(rel);
      worst = Math.max(worst, rel);
    }
    row('A6', worst <= lim('A6').relative, { worstRelative: sig(worst), per });
  }
}

// ---- B and the shared S1 fit -----------------------------------------------------------------

const oracleFit = (name, S, freeE) => {
  const star = statedStar(S.Ms_Msun, S.Rs_Rsun);
  const t0 = Date.now();
  const f = fit(S, oracleFrame(name), { freeE, star, roles: ['flux', 'rv', 'rv'] });
  return { f, star, ms: Date.now() - t0 };
};

function compareToOracle(name, f, names) {
  const o = ORA.systems[name].fit;
  const out = {};
  let worst = 0;
  const ratios = [];
  for (const n of names) {
    const i = o.names.indexOf(n);
    const g = param(f, n);
    const diff = Math.abs(g.value - o.value[i]) / o.sigma[i];
    const ratio = g.sigma / o.sigma[i];
    out[n] = { sigmas: sig(diff), sigmaRatio: sig(ratio) };
    worst = Math.max(worst, diff);
    ratios.push(ratio);
  }
  return { out, worst, ratios };
}

function planetIntervals(f, star, seed, extra = {}) {
  const names = ['P', 'k', 'aRs', 'b', 'K', ...(param(f, 'sqrtEcosw').mode === 'fitted' ? ['sqrtEcosw', 'sqrtEsinw'] : [])];
  const idx = names.map(n => f.free.indexOf(n));
  return propagatePlanet({
    names,
    mean: names.map(n => param(f, n).value),
    covariance: idx.map(i => idx.map(j => f.covariance[i][j])),
    star,
    seed,
    draws: 20000,
    ...extra,
  });
}

let S1RUN = null;
function groupB() {
  const S1 = SYS.S1;
  const S2 = SYS.S2;
  if (wanted('B1') || wanted('B2') || wanted('B5') || wanted('A7') || wanted('A8') || wanted('D3') || wanted('D4') || wanted('D5')) {
    S1RUN = oracleFit('S1', S1, false);
  }
  if (S1RUN && wanted('B1')) {
    const L = lim('B1');
    const c = compareToOracle('S1', S1RUN.f, ['t0', 'P', 'k', 'aRs', 'b', 'K']);
    row(
      'B1',
      c.worst <= L.worstSigmas && c.ratios.every(r => r >= L.sigmaRatioMin && r <= L.sigmaRatioMax),
      { worstSigmas: sig(c.worst), sigmaRatio: c.ratios.map(r => sig(r, 3)), detail: c.out, ms: S1RUN.ms },
      'joint fit against batman + scipy on the oracle’s own data (e held at 0 in both, AM1)'
    );
  }
  if (S1RUN && wanted('B2')) {
    const L = lim('B2');
    const o = ORA.systems.S1.derived;
    const f = S1RUN.f;
    const iv = planetIntervals(f, S1RUN.star, 'B2');
    const g = { Mp: dv(f, 'Mp').value, Rp: dv(f, 'Rp').value, rho: dv(f, 'rhoP').value };
    const rel = { Mp: Math.abs(g.Mp - o.Mp_MJup) / o.Mp_MJup, Rp: Math.abs(g.Rp - o.Rp_RJup) / o.Rp_RJup, rho: Math.abs(g.rho - o.rho_gcc) / o.rho_gcc };
    const srel = {
      Mp: Math.abs(iv.Mp.sigma - o.sigma.Mp) / o.sigma.Mp,
      Rp: Math.abs(iv.Rp.sigma - o.sigma.Rp) / o.sigma.Rp,
      rho: Math.abs(iv.rhoP.sigma - o.sigma.rho) / o.sigma.rho,
    };
    const ok = Object.values(rel).every(v => v <= L.valueRelative) && Object.values(srel).every(v => v <= L.sigmaRelative);
    row('B2', ok, { valueRelative: Object.fromEntries(Object.entries(rel).map(([k, v]) => [k, sig(v)])), sigmaRelative: Object.fromEntries(Object.entries(srel).map(([k, v]) => [k, sig(v)])), gravitas: { ...g, sigma: { Mp: sig(iv.Mp.sigma), Rp: sig(iv.Rp.sigma), rho: sig(iv.rhoP.sigma) } } });
  }
  if (S1RUN && wanted('B5')) {
    const j = S1RUN.f.nuisance.jitter.value;
    const o = ORA.systems.S1.fit.jitter;
    row('B5', Math.abs(j - o) <= lim('B5').absolute_ms, { gravitas: sig(j), oracle: o });
  }
  if (wanted('B3') || wanted('B4')) {
    const r = oracleFit('S2', S2, true);
    if (wanted('B3')) {
      const c = compareToOracle('S2', r.f, ['t0', 'P', 'k', 'aRs', 'b', 'K', 'sqrtEcosw', 'sqrtEsinw']);
      row('B3', c.worst <= lim('B3').worstSigmas, { worstSigmas: sig(c.worst), detail: c.out, ms: r.ms }, 'eccentric: batman exact orbit against the first-order mapping');
    }
    if (wanted('B4')) {
      const o = ORA.systems.S2.derived;
      const rel = {
        Mp: Math.abs(dv(r.f, 'Mp').value - o.Mp_MJup) / o.Mp_MJup,
        Rp: Math.abs(dv(r.f, 'Rp').value - o.Rp_RJup) / o.Rp_RJup,
        rho: Math.abs(dv(r.f, 'rhoP').value - o.rho_gcc) / o.rho_gcc,
      };
      row('B4', Object.values(rel).every(v => v <= lim('B4').valueRelative), { relative: Object.fromEntries(Object.entries(rel).map(([k, v]) => [k, sig(v)])) });
    }
  }
}

function groupA789() {
  if (!S1RUN) return;
  const f = S1RUN.f;
  const v = valuesOf(f);
  const S1 = SYS.S1;
  const settings = (star, extra = {}) => ({ ...request(S1, { freeE: false, star, roles: ['flux', 'rv', 'rv'] }).settings, perDay: 1, ...extra });
  if (wanted('A7')) {
    const L = lim('A7');
    const exact = statedStar(S1.Ms_Msun, S1.Rs_Rsun);
    exact.mass.sigma = 0;
    exact.radius.sigma = 0;
    const d0 = TRANSIT_RV_JOINT.derived(v, settings(exact));
    const closed = planetOf(
      { K: v.K, P: v.P, e: 0, w: Math.PI / 2, aRs: v.aRs, b: v.b, k: v.k },
      { Ms: S1.Ms_Msun, Rs: S1.Rs_Rsun },
      true
    );
    const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
    const v1 = Math.max(rel(d0.Mp.value, closed.Mp), rel(d0.Rp.value, closed.Rp), rel(d0.rhoP.value, closed.rhoP), rel(d0.MpSini.value, closed.MpSini));
    const ext0 = Math.max(d0.Mp.externalVariance, d0.Rp.externalVariance, d0.rhoP.externalVariance);
    // uncorrelated: the radius' external variance is (value * sigma_R / R)^2
    const unc = statedStar(S1.Ms_Msun, S1.Rs_Rsun);
    unc.correlation = 0;
    const d1 = TRANSIT_RV_JOINT.derived(v, settings(unc));
    const expect = (d1.Rp.value * unc.radius.sigma / unc.radius.value) ** 2;
    const v2 = rel(d1.Rp.externalVariance, expect);
    // the plumbing: the fit's own sigma squared is its fit-only sigma squared plus the star's variance
    const dStar = TRANSIT_RV_JOINT.derived(v, settings(S1RUN.star));
    const m = dv(f, 'Rp');
    const v3 = rel(m.sigma ** 2, m.stellar.sigmaFitOnly ** 2 + dStar.Rp.externalVariance);
    row('A7', v1 <= L.relative && ext0 === 0 && v2 <= L.relative && v3 <= L.relative, { closedFormRelative: v1, zeroSigmaExternalVariance: ext0, uncorrelatedRadiusRelative: v2, quadratureRelative: v3 });
  }
  if (wanted('A8')) {
    const L = lim('A8');
    const iv = planetIntervals(f, S1RUN.star, 'A8');
    const lin = { mass: dv(f, 'Mp').sigma, radius: dv(f, 'Rp').sigma, density: dv(f, 'rhoP').sigma };
    const rel = {
      mass: Math.abs(iv.Mp.sigma - lin.mass) / lin.mass,
      radius: Math.abs(iv.Rp.sigma - lin.radius) / lin.radius,
      density: Math.abs(iv.rhoP.sigma - lin.density) / lin.density,
    };
    row('A8', rel.mass <= L.mass && rel.radius <= L.radius && rel.density <= L.density, { relative: Object.fromEntries(Object.entries(rel).map(([k, v]) => [k, sig(v)])), linearized: lin, propagated: { Mp: sig(iv.Mp.sigma), Rp: sig(iv.Rp.sigma), rhoP: sig(iv.rhoP.sigma) } });
  }
}

function groupA9() {
  if (!wanted('A9')) return;
  const u = stream('noise', 'joint-227:a9');
  const a = Array.from({ length: 997 }, () => u() * 10 - 3);
  const sorted = [...a].sort((x, y) => x - y);
  const iv = percentileInterval(a, { level: 0.6827 });
  const d = Math.max(Math.abs(iv.lo - percentile(sorted, (1 - 0.6827) / 2)), Math.abs(iv.hi - percentile(sorted, (1 + 0.6827) / 2)), Math.abs(iv.value - percentile(sorted, 0.5)));
  row('A9', d <= lim('A9').absolute, { maxAbsDifference: d });
}

// ---- R: recovery ---------------------------------------------------------------------------------

function zScores(f, truth, names) {
  const out = {};
  let worst = 0;
  for (const n of names) {
    const p = param(f, n);
    const z = Math.abs(p.value - truth[n]) / p.sigma;
    out[n] = sig(z);
    worst = Math.max(worst, z);
  }
  return { out, worst };
}

function groupR() {
  const S1 = SYS.S1;
  if (wanted('R1')) {
    const { data, truth } = synth(S1, 'R1');
    const f = fit(S1, data, { freeE: false, star: statedStar(S1.Ms_Msun, S1.Rs_Rsun), roles: ['flux', 'rv', 'rv'] });
    const z = zScores(f, truth, ['t0', 'P', 'k', 'aRs', 'b', 'K']);
    const dz = {};
    for (const [n, name] of [['Mp', 'Mp'], ['Rp', 'Rp'], ['rhoP', 'rhoP']]) {
      const d = dv(f, name);
      dz[n] = sig(Math.abs(d.value - truth[n]) / d.sigma);
      z.worst = Math.max(z.worst, Math.abs(d.value - truth[n]) / d.sigma);
    }
    row('R1', z.worst <= lim('R1').worstSigmas, { worstSigmas: sig(z.worst), parameters: z.out, derived: dz });
  }
  if (wanted('R2')) {
    const S3 = SYS.S3;
    const { data, truth } = synth(S3, 'R2');
    const f = fit(S3, data, { freeE: false, star: statedStar(S3.Ms_Msun, S3.Rs_Rsun), roles: ['flux', 'rv', 'rv'] });
    const zK = zScores(f, truth, ['K']).worst;
    const m = dv(f, 'Mp');
    const zM = Math.abs(m.value - truth.Mp) / m.sigma;
    const rel = m.sigma / m.value;
    row('R2', Math.max(zK, zM) <= lim('R2').worstSigmas && rel >= lim('R2').sigmaOverValueMin, { zK: sig(zK), zMp: sig(zM), sigmaOverValue: sig(rel), K: sig(param(f, 'K').value), Ktrue: sig(truth.K) });
  }
  if (wanted('R3')) {
    const S2 = SYS.S2;
    const { data, truth } = synth(S2, 'R3');
    const f = fit(S2, data, { freeE: true, star: statedStar(S2.Ms_Msun, S2.Rs_Rsun), roles: ['flux', 'rv', 'rv'] });
    const z = zScores(f, truth, ['sqrtEcosw', 'sqrtEsinw', 'K']);
    const m = dv(f, 'Mp');
    const zM = Math.abs(m.value - truth.Mp) / m.sigma;
    row('R3', Math.max(z.worst, zM) <= lim('R3').worstSigmas, { parameters: z.out, zMp: sig(zM) });
  }
}

// ---- C: coverage ensemble -----------------------------------------------------------------------

/** One replicate: the true star is a draw from the stated one; the fit is handed the stated one. */
function replicate(i) {
  const S1 = SYS.S1;
  const u = stream('noise', `${THR.seeds.ensemble}:C:${i}:star`);
  const g = gaussian(u);
  const z1 = g();
  const z2 = g();
  const trueStar = {
    Ms: S1.Ms_Msun * (1 + ST.Ms.sigma_rel * z1),
    Rs: S1.Rs_Rsun * (1 + ST.Rs.sigma_rel * (ST.correlation * z1 + Math.sqrt(1 - ST.correlation ** 2) * z2)),
  };
  const { data, truth } = synth(S1, `C${i}`, { star: trueStar });
  const star = statedStar(S1.Ms_Msun, S1.Rs_Rsun);
  const f = fit(S1, data, { freeE: false, star, roles: ['flux', 'rv', 'rv'] });
  const hit = (est, sigma, t) => Math.abs(est - t) <= sigma;
  const out = { i };
  for (const [key, name] of [['Mp', 'Mp'], ['Rp', 'Rp'], ['rhoP', 'rhoP']]) {
    const d = dv(f, name);
    out[key] = hit(d.value, d.sigma, truth[key]);
    out[`${key}FitOnly`] = hit(d.value, d.stellar.sigmaFitOnly, truth[key]);
  }
  const k = param(f, 'K');
  out.K = hit(k.value, k.sigma, truth.K);
  out.tension = f.warnings.some(w => w.code === 'stellarDensityTension');
  return out;
}

async function runEnsemble(N, workers) {
  const chunks = [];
  const per = Math.ceil(N / workers);
  for (let a = 0; a < N; a += per) chunks.push([a, Math.min(N, a + per)]);
  const results = await Promise.all(
    chunks.map(
      ([a, b]) =>
        new Promise((resolve, reject) => {
          const p = spawn(process.execPath, [fileURLToPath(import.meta.url), `--chunk=${a},${b}`], { stdio: ['ignore', 'pipe', 'inherit'] });
          let buf = '';
          p.stdout.on('data', d => (buf += d));
          p.on('close', code => (code === 0 ? resolve(JSON.parse(buf)) : reject(new Error(`chunk ${a} exited ${code}`))));
        })
    )
  );
  return results.flat();
}

async function groupC() {
  if (!['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].some(wanted)) return;
  const N = Number(argValue('n', THR.ensembles.N));
  const reps = await runEnsemble(N, Number(argValue('workers', 2)));
  const rate = key => reps.filter(r => r[key]).length / reps.length;
  const r = { Mp: rate('Mp'), Rp: rate('Rp'), rhoP: rate('rhoP'), K: rate('K'), RpFitOnly: rate('RpFitOnly'), rhoPFitOnly: rate('rhoPFitOnly'), MpFitOnly: rate('MpFitOnly'), tension: rate('tension') };
  const inside = (id, v) => v >= lim(id).min && v <= lim(id).max;
  if (wanted('C1')) row('C1', inside('C1', r.Mp), { rate: r.Mp, N, fitOnly: r.MpFitOnly });
  if (wanted('C2')) row('C2', inside('C2', r.Rp), { rate: r.Rp, N });
  if (wanted('C3')) row('C3', inside('C3', r.rhoP), { rate: r.rhoP, N });
  if (wanted('C4')) row('C4', r.RpFitOnly <= lim('C4').radiusMax && r.rhoPFitOnly <= lim('C4').densityMax, { radiusFitOnly: r.RpFitOnly, densityFitOnly: r.rhoPFitOnly, N });
  if (wanted('C5')) row('C5', inside('C5', r.K), { rate: r.K, N });
  if (wanted('C6')) row('C6', r.tension <= lim('C6').max, { flagged: r.tension, N });
}

// ---- D: negative -----------------------------------------------------------------------------------

function groupD() {
  const S1 = SYS.S1;
  const star = statedStar(S1.Ms_Msun, S1.Rs_Rsun);
  if (wanted('D1')) {
    const { data } = synth(S1, 'D1', { rvOnly: true });
    const f = fit(S1, data, { freeE: false, star, roles: ['rv', 'rv'] });
    const names = f.derived.map(d => d.name);
    const L = lim('D1');
    const mins = f.derived.find(d => d.name === 'MpSini');
    const ok =
      L.mustHave.every(n => names.includes(n)) &&
      L.mustNotHave.every(n => !names.includes(n)) &&
      /MINIMUM/.test(mins?.label ?? '') &&
      f.refusals.some(r => r.code === 'noTransit' && r.quantity === 'Mp');
    row('D1', ok, { derived: names, label: mins?.label, MpSini: sig(mins?.value), sigma: sig(mins?.sigma), refusals: f.refusals.filter(r => r.code === 'noTransit').map(r => r.quantity) });
  }
  if (wanted('D2')) {
    const { data } = synth(S1, 'D2', { rvOnly: true, jitter: 40 });
    const f = fit(S1, data, { freeE: false, star, roles: ['rv', 'rv'], jitterHi: 20 });
    const flagged = f.warnings.some(w => w.code === lim('D2').flag);
    row('D2', flagged, { jitter: sig(f.nuisance.jitter.value), warnings: f.warnings.map(w => w.code) });
  }
  if (S1RUN && wanted('D3')) {
    const v = valuesOf(S1RUN.f);
    const base = request(S1, { freeE: false, star, roles: ['flux', 'rv', 'rv'] }).settings;
    const none = TRANSIT_RV_JOINT.derived(v, { ...base, stellar: undefined, perDay: 1 });
    const radiusOnly = TRANSIT_RV_JOINT.derived(v, { ...base, stellar: { radius: star.radius }, perDay: 1 });
    const massOnly = TRANSIT_RV_JOINT.derived(v, { ...base, stellar: { mass: star.mass }, perDay: 1 });
    const L = lim('D3');
    const ok =
      L.mustNotHaveWithoutMass.every(n => !(n in none) && !(n in radiusOnly)) &&
      'Rp' in radiusOnly &&
      !('Rp' in none) &&
      !('Rp' in massOnly) &&
      'Mp' in massOnly &&
      !('rhoP' in massOnly) &&
      'massFunction' in none &&
      refusalsFor({ stellar: undefined }, ['flux', 'rv']).some(r => r.code === 'stellarMassMissing');
    row('D3', ok, { none: Object.keys(none).filter(n => ['Mp', 'Rp', 'rhoP', 'MpSini', 'massFunction'].includes(n)), radiusOnly: Object.keys(radiusOnly).filter(n => ['Mp', 'Rp', 'rhoP', 'MpSini'].includes(n)), massOnly: Object.keys(massOnly).filter(n => ['Mp', 'Rp', 'rhoP', 'MpSini'].includes(n)) });
  }
  if (S1RUN && wanted('D4')) {
    const v = valuesOf(S1RUN.f);
    const base = request(S1, { freeE: false, star, roles: ['flux', 'rv', 'rv'] }).settings;
    const bare = { mass: { value: S1.Ms_Msun, source: 'test' }, radius: { value: S1.Rs_Rsun, source: 'test' } };
    const d = TRANSIT_RV_JOINT.derived(v, { ...base, stellar: bare, perDay: 1 });
    const refs = refusalsFor({ stellar: bare }, ['flux', 'rv']);
    const names = ['Mp', 'Rp', 'rhoP'];
    const ok = names.every(n => !(n in d) && refs.some(r => r.quantity === n && r.code === lim('D4').refusal));
    row('D4', ok, { reported: names.filter(n => n in d), refused: refs.filter(r => r.code === lim('D4').refusal).map(r => r.quantity) });
  }
  if (S1RUN && wanted('D5')) {
    const f = S1RUN.f;
    const v = valuesOf(f);
    const t = dv(f, 'rhoStar');
    // a star whose stated density is 5 sigma above the transit's, by its radius
    const target = t.value + 5 * Math.hypot(t.sigma, 0.1 * t.value);
    const Rs = (S1.Ms_Msun / ((target / dv(f, 'rhoStarStated').value) * S1.Ms_Msun / S1.Rs_Rsun ** 3)) ** (1 / 3);
    const odd = statedStar(S1.Ms_Msun, Rs);
    const base = request(S1, { freeE: false, star: odd, roles: ['flux', 'rv', 'rv'] }).settings;
    const d = TRANSIT_RV_JOINT.derived(v, { ...base, perDay: 1 });
    const out = {
      derived: [
        { name: 'rhoStar', value: t.value, sigma: t.sigma },
        { name: 'rhoStarStated', value: d.rhoStarStated.value, sigma: Math.sqrt(d.rhoStarStated.externalVariance) },
      ],
      nuisance: S1RUN.f.nuisance,
    };
    const w = TRANSIT_RV_JOINT.warnings(out, oracleFrame('S1'), request(S1, { freeE: false, star: odd, roles: ['flux', 'rv', 'rv'] }));
    const flag = w.find(x => x.code === 'stellarDensityTension');
    row('D5', Boolean(flag) && Math.abs(flag.z) >= lim('D5').minAbsZ, { z: sig(flag?.z), transit: sig(t.value), stated: sig(d.rhoStarStated.value) });
  }
  if (wanted('D6')) {
    const S4 = SYS.S4;
    const { data } = synth(S4, 'D6');
    const f = fit(S4, data, { freeE: false, star: statedStar(S4.Ms_Msun, S4.Rs_Rsun), roles: ['flux', 'rv', 'rv'] });
    const L = lim('D6');
    const sini = dv(f, 'sini');
    const sinRel = sini.sigma / sini.value;
    // D6 under the rule as first committed (b + sigma against 1 - k), and D6b under the rule
    // extended by AM4 (b on a bound); the same bounds, both rows kept.
    for (const [id, options, note] of [
      ['D6', { bBound: false }, 'the rule as first committed (Prompt 225\u2019s k-b check)'],
      ['D6b', {}, 'with b on a bound read as not constrained (AM4)'],
    ]) {
      const flagged = TRANSIT_RV_JOINT.identify(f, options).derived;
      const massFlagged = Boolean(flagged.Mp);
      const ok = L.notConstrained.every(n => flagged[n]?.status === 'not constrained') && (!massFlagged || sinRel > L.massFlaggedOnlyIfSinIRelSigmaAbove);
      row(id, ok, { flagged: Object.keys(flagged), massFlagged, sinIRelSigma: sig(sinRel), b: sig(param(f, 'b').value), k: sig(param(f, 'k').value), bAtBound: param(f, 'b').atBound, chi2: sig(f.chi2, 6) }, note);
    }
  }
  if (wanted('D7')) {
    const { data } = synth(S1, 'D7', { rvOnly: true, extra: 20, jitter: 0 });
    const f = fit(S1, data, { freeE: false, star, roles: ['rv', 'rv'] });
    const flag = f.warnings.find(w => w.code === lim('D7').flag);
    row('D7', Boolean(flag), { jitter: sig(f.nuisance.jitter.value), medianError: flag?.medianError });
  }
}

function groupE() {
  if (!wanted('E1')) return;
  notRun('E1', 'no public radial-velocity series for a transiting planet was supplied (the coordinator could not locate one by a verified identifier); the archive values for HD 209458 b (0.73 +/- 0.04 MJup, 1.39 +/- 0.02 RJup; the paper behind the archive default is not recorded) are not a velocity series and were not used to tune anything');
}

// ---- run ----------------------------------------------------------------------------------------------

async function main() {
  const chunk = argValue('chunk', '');
  if (chunk) {
    const [a, b] = chunk.split(',').map(Number);
    const out = [];
    for (let i = a; i < b; i++) out.push(replicate(i));
    process.stdout.write(JSON.stringify(out));
    return;
  }
  groupA();
  groupB();
  groupA789();
  groupA9();
  groupR();
  await groupC();
  groupD();
  groupE();
  const order = id => id.replace(/\d+/, m => m.padStart(3, '0'));
  rows.sort((x, y) => (order(x.id) < order(y.id) ? -1 : 1));
  const failed = rows.filter(r => r.status === 'fail');
  if (flag('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    for (const r of rows) console.log(`${r.status.padEnd(7)} ${r.id.padEnd(4)} ${JSON.stringify(r.measured)} ${r.note}`);
    console.log(`\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'not-run').length} not run`);
  }
  if (flag('--write-results'))
    writeFileSync(path.join(ROOT, `${DIR}/results.json`), `${JSON.stringify({ rows }, null, 2)}\n`);
  if (flag('--write-failed'))
    writeFileSync(
      path.join(ROOT, `${DIR}/failed-legs.json`),
      `${JSON.stringify({ note: 'Legs of tests/fixtures/joint-inference/thresholds.json that crossed their bound, kept failing. Only Carl resets a bound.', failed }, null, 2)}\n`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

export { synth, request, statedStar, truthOf };
