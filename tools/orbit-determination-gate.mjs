// The harness of the orbit-determination gate (Prompt 197, part A), spike code.
// node tools/orbit-determination-gate.mjs ORACLE.json OUT_RECORD.json
// Applies the committed legs (tests/fixtures/orbit-determination-gate/thresholds.json)
// to the oracle's output and writes the measured record. Nothing here moves a bound.
import { readFileSync, writeFileSync } from 'node:fs';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import * as od from './orbit-determination-gate-core.mjs';

const [, , ORACLE, OUT] = process.argv;
const TH = JSON.parse(readFileSync('tests/fixtures/orbit-determination-gate/thresholds.json', 'utf8'));
const ora = JSON.parse(readFileSync(ORACLE, 'utf8'));
const AU = TH.constants.auKm;
const eph = createEphemeris(PACK, DATA);
const earth = jd => eph.stateAt('earth', jd).r.map(v => v / AU);
const earthV = jd => eph.stateAt('earth', jd).v.map(v => (v * 86400) / AU);
const SIGMA = TH.noise.sigmaArcsec;
const SIG_RAD = SIGMA / od.ARCSEC;
const KAPPA = TH.determination.conditioning.threshold;
const CFG = { sigmaArcsec: SIGMA, kappaMax: KAPPA };
const DRAWS = TH.ensemble.draws;
const CDRAWS = TH.ensemble.coverageDraws;
const SEED = TH.ensemble.seeds.harnessNoise;
const objs = ora.objects;
const rows = [];
const detail = {};
const t0wall = Date.now();
const log = (...a) => console.error(((Date.now() - t0wall) / 1000).toFixed(0) + 's', ...a);

// ---------------------------------------------------------------- random numbers
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussStream(seed) {
  const u = mulberry32(seed);
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a = 0;
    while (a === 0) a = u();
    const b = u();
    const r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}
const median = a => {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};
const frac = (n, d) => (d ? n / d : null);

// ------------------------------------------------------------------ observations
const idx = (o, off) => o.offsets.indexOf(off);
function obsFor(o, offsets, source, gauss) {
  const src = o[source];
  return offsets.map(off => {
    const j = idx(o, off);
    let lam = src.lam[j];
    let bet = src.bet[j];
    if (gauss) {
      lam += (gauss() * SIG_RAD) / Math.cos(bet);
      bet += gauss() * SIG_RAD;
    }
    return { t: o.t2 + off, R: earth(o.t2 + off), lam, bet };
  });
}
const stateOf = o => ({ r: o.state.r, v: o.state.v });
function kappaAtTruth(o, offsets) {
  const obs = obsFor(o, offsets, 'twobody', null);
  const x = [...o.state.r, ...o.state.v];
  return od.kappaOf(od.jacobian(x, o.t2, obs));
}
function sigmaMajorAtTruth(o, offsets, W) {
  const obs = obsFor(o, offsets, 'twobody', null);
  const x = [...o.state.r, ...o.state.v];
  const C = od.covarianceOf(od.jacobian(x, o.t2, obs), SIG_RAD);
  return od.predictionOf(x, o.t2, o.t2 + W, earth(o.t2 + W), C).major;
}
function predictAt(o, res, W) {
  const tW = o.t2 + W;
  const RW = earth(tW);
  const m = od.observe({ r: res.x.slice(0, 3), v: res.x.slice(3) }, res.t0, tW, RW);
  const p = od.predictionOf(res.x, res.t0, tW, RW, res.cov);
  return { lam: m.lam, bet: m.bet, pred: p };
}
const counts = () => ({});
const tally = (c, k) => (c[k] = (c[k] || 0) + 1);
const add = (id, measured, bound, pass, extra) => rows.push({ id, measured, bound, pass, ...extra });
const arcsOf = T => [-T, 0, T];

// ====================================================================== F1 to F4
{
  let inv = 0;
  let rt = 0;
  for (const o of objs)
    for (const dt of [-120, -60, 61, 121, 260]) {
      const p = od.propagate(o.state.r, o.state.v, dt);
      const a = od.invariants(o.state.r, o.state.v);
      const b = od.invariants(p.r, p.v);
      inv = Math.max(inv, Math.abs(b.energy / a.energy - 1));
      for (let k = 0; k < 3; k++) inv = Math.max(inv, Math.abs(b.h[k] - a.h[k]) / Math.hypot(...a.h));
      const q = od.propagate(p.r, p.v, -dt);
      rt = Math.max(rt, Math.hypot(q.r[0] - o.state.r[0], q.r[1] - o.state.r[1], q.r[2] - o.state.r[2]));
    }
  add('F1.propagate', { relativeInvariant: inv, roundTripAu: rt }, TH.legs['F1.propagate'].bounds, inv <= 1e-11 && rt <= 1e-11);
  let f2 = 0;
  for (const o of objs)
    for (const [k, v] of Object.entries(o.f2)) {
      const p = od.propagate(o.state.r, o.state.v, +k);
      f2 = Math.max(f2, Math.hypot(p.r[0] - v[0], p.r[1] - v[1], p.r[2] - v[2]));
    }
  add('F2.oracle', f2, 1e-9, f2 <= 1e-9);
  let f3 = 0;
  for (const [jd, x, y, z] of ora.earth) {
    const e = earth(jd);
    f3 = Math.max(f3, Math.hypot(e[0] - x, e[1] - y, e[2] - z));
  }
  add('F3.observer', f3, 1e-9, f3 <= 1e-9);
  let f4 = 0;
  for (const o of objs)
    o.offsets.forEach((off, j) => {
      const m = od.observe(stateOf(o), o.t2, o.t2 + off, earth(o.t2 + off));
      f4 = Math.max(f4, od.sepArcsec(m.lam, m.bet, o.twobody.lam[j], o.twobody.bet[j]));
    });
  add('F4.forward', f4, 0.001, f4 <= 0.001);
  log('F1-F4 done');
}

// ====================================================================== F5, G2
const gaussRaw = [];
{
  let recovered = 0;
  let worst = 0;
  const per = [];
  for (const o of objs) {
    const r = od.determine(obsFor(o, [-60, 0, 60], 'twobody', null), { sigmaArcsec: SIGMA, kappaMax: 1e99 });
    const err = r.x ? Math.hypot(r.x[0] - o.state.r[0], r.x[1] - o.state.r[1], r.x[2] - o.state.r[2]) : null;
    const rawErr = r.raw ? Math.hypot(...[0, 1, 2].map(k => r.raw.state.r[k] - o.state.r[k])) : null;
    per.push({ id: o.id, status: r.status, roots: r.roots, candidates: r.candidates, errAu: err, rawGaussErrAu: rawErr });
    if (r.x && (r.status === 'ok' || r.status === 'illConditioned') && err <= 1e-8) recovered++;
    if (err !== null) worst = Math.max(worst, err);
    gaussRaw.push(rawErr);
  }
  detail.F5 = per;
  // the leg judges status ok under the real threshold: rerun with it
  let okAll = 0;
  for (const o of objs) {
    const r = od.determine(obsFor(o, [-60, 0, 60], 'twobody', null), CFG);
    if (r.status === 'ok') okAll++;
  }
  detail.F5.statusOkAtThreshold = okAll;
  add('F5.exact', { objectsRecoveredToBound: recovered, objectsStatusOk: okAll, maxPositionAu: worst }, TH.legs['F5.exact'].bounds, recovered === 12 && okAll === 12 && worst <= 1e-8);
  const kap = objs.map(o => kappaAtTruth(o, [-60, 0, 60]));
  detail.G2 = kap;
  const n = kap.filter(k => k <= KAPPA).length;
  add('G2.cond', { objectsAtOrBelow: n, kappa: kap }, TH.legs['G2.cond'].bounds, n >= 11);
  log('F5, G2 done');
}

// ====================================================================== G1, G3, G5
const curatedSigma = { Wn: [], Wf: [] };
{
  const stat = counts();
  let ok = 0;
  let total = 0;
  const a = { Wn: [0, 0], Wf: [0, 0] };
  const b = { Wn: [0, 0], Wf: [0, 0] };
  let useful = 0;
  let nearEarthMain = 0;
  const gaps = { Wn: [], Wf: [] };
  for (const o of objs) {
    const gs = gaussStream(SEED + 1e6 + o.id * 1e4);
    for (let d = 0; d < DRAWS; d++) {
      const res = od.determine(obsFor(o, [-60, 0, 60], 'nbody', gs), CFG);
      total++;
      tally(stat, res.status);
      if (res.status === 'nearEarth') nearEarthMain++;
      if (res.status !== 'ok') continue;
      ok++;
      for (const [name, W] of [['Wn', 61], ['Wf', 121]]) {
        const j = idx(o, W);
        const p = predictAt(o, res, W);
        curatedSigma[name].push(p.pred.major);
        const D = od.sepArcsec(p.lam, p.bet, o.twobody.lam[j], o.twobody.bet[j]);
        const Dt = od.sepArcsec(p.lam, p.bet, o.nbody.lam[j], o.nbody.bet[j]);
        const E = o.E[String(W)];
        const Ef = o.Efit_T60.atW[String(W)];
        const tol = E + Ef + 3.44 * p.pred.major;
        a[name][1]++;
        b[name][1]++;
        if (D <= tol) a[name][0]++;
        if (Dt <= Ef + 3.44 * p.pred.major) b[name][0]++;
        gaps[name].push({ D, tol, E, Ef, sigma: p.pred.major });
        if (name === 'Wn' && Math.sqrt(5.991) * p.pred.major <= 600) useful++;
      }
    }
  }
  detail.G1 = { statuses: stat, ok, total };
  add('G1.noisy', { okRate: ok / total, statuses: stat }, 0.95, ok / total >= 0.95);
  const rate = x => x[0] / x[1];
  const g3 = { aWn: rate(a.Wn), aWf: rate(a.Wf), bWn: rate(b.Wn), bWf: rate(b.Wf) };
  detail.G3 = { ...g3, medianD: { Wn: median(gaps.Wn.map(g => g.D)), Wf: median(gaps.Wf.map(g => g.D)) }, medianTol: { Wn: median(gaps.Wn.map(g => g.tol)), Wf: median(gaps.Wf.map(g => g.tol)) }, medianSigmaMajor: { Wn: median(curatedSigma.Wn), Wf: median(curatedSigma.Wf) }, medianE: { Wn: median(gaps.Wn.map(g => g.E)), Wf: median(gaps.Wf.map(g => g.E)) }, medianEfit: { Wn: median(gaps.Wn.map(g => g.Ef)), Wf: median(gaps.Wf.map(g => g.Ef)) } };
  add('G3.withheld', g3, 0.97, Object.values(g3).every(v => v >= 0.97));
  add('G5.useful', { rate: useful / a.Wn[1], medianSemiMajor95Arcsec: Math.sqrt(5.991) * median(curatedSigma.Wn) }, 0.9, useful / a.Wn[1] >= 0.9);
  detail.nearEarthOnMainBelt = nearEarthMain;
  log('G1 G3 G5 done', JSON.stringify(stat));
}

// ====================================================================== G4
{
  const cov = { Wn: [0, 0, 0], Wf: [0, 0, 0] };
  let ok = 0;
  let total = 0;
  for (const o of objs) {
    const gs = gaussStream(SEED + 2e6 + o.id * 1e4);
    for (let d = 0; d < CDRAWS; d++) {
      const res = od.determine(obsFor(o, [-60, 0, 60], 'twobody', gs), CFG);
      total++;
      if (res.status !== 'ok') continue;
      ok++;
      for (const [name, W] of [['Wn', 61], ['Wf', 121]]) {
        const j = idx(o, W);
        const p = predictAt(o, res, W);
        const lamErr = (((p.lam - o.twobody.lam[j] + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const e1 = lamErr * Math.cos(o.twobody.bet[j]);
        const e2 = p.bet - o.twobody.bet[j];
        const S = p.pred.S;
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
        const m2 = (S[1][1] * e1 * e1 - 2 * S[0][1] * e1 * e2 + S[0][0] * e2 * e2) / det;
        cov[name][2]++;
        if (m2 <= 5.991) cov[name][0]++;
        if (m2 <= 2.279) cov[name][1]++;
      }
    }
  }
  const m = {};
  for (const name of ['Wn', 'Wf']) {
    m[name] = { ellipse95: cov[name][0] / cov[name][2], ellipse68: cov[name][1] / cov[name][2], n: cov[name][2] };
  }
  detail.G4 = { ...m, okDraws: ok, draws: total };
  const pass = ['Wn', 'Wf'].every(n => m[n].ellipse95 >= 0.92 && m[n].ellipse95 <= 0.98 && m[n].ellipse68 >= 0.6 && m[n].ellipse68 <= 0.76);
  add('G4.coverage', m, TH.legs['G4.coverage'].bounds, pass);
  log('G4 done', JSON.stringify(m));
}

// ====================================================================== H1, H2
{
  const per = {};
  let okAll = 0;
  let totalAll = 0;
  let kappaBelow = 0;
  for (const T of [0.5, 1, 2]) {
    const stat = counts();
    for (const o of objs) {
      const kap = kappaAtTruth(o, arcsOf(T));
      if (!(kap > KAPPA)) kappaBelow++;
      const gs = gaussStream(SEED + 3e6 + T * 1e5 + o.id * 1e3);
      for (let d = 0; d < DRAWS; d++) {
        const res = od.determine(obsFor(o, arcsOf(T), 'nbody', gs), CFG);
        tally(stat, res.status);
        totalAll++;
        if (res.status === 'ok') okAll++;
      }
    }
    per['T' + T] = stat;
  }
  detail.H1 = { statuses: per, kappaNotAboveThreshold: kappaBelow };
  add('H1.refuse', { okRate: okAll / totalAll, okDraws: okAll, draws: totalAll, kappaNotAbove: kappaBelow }, TH.legs['H1.refuse'].bounds, okAll / totalAll <= 0.01 && kappaBelow === 0);
  const sweep = [];
  for (const T of TH.arcs.sweep.halfSpansDays) {
    const ks = objs.map(o => kappaAtTruth(o, arcsOf(T)));
    const ss = objs.map(o => sigmaMajorAtTruth(o, arcsOf(T), 61) * Math.sqrt(5.991));
    sweep.push({ T, medianKappa: median(ks), medianSemiMajor95NextNightArcsec: median(ss), kappaAboveThreshold: ks.filter(k => k > KAPPA).length });
  }
  detail.H2 = sweep;
  let viol = 0;
  for (let i = 1; i < sweep.length; i++) if (sweep[i].medianKappa > sweep[i - 1].medianKappa) viol++;
  add('H2.sweep', { violations: viol, sweep }, 0, viol === 0);
  log('H1 H2 done', JSON.stringify(per));
}

// ====================================================================== L1
{
  const stat = counts();
  let ok = 0;
  let total = 0;
  const a = { Wn: [0, 0], Wf: [0, 0] };
  const sig = { Wn: [], Wf: [] };
  const arc = TH.arcs.longer.epochsDaysFromT2;
  for (const o of objs) {
    const gs = gaussStream(SEED + 4e6 + o.id * 1e4);
    for (let d = 0; d < DRAWS; d++) {
      const res = od.determine(obsFor(o, arc, 'nbody', gs), CFG);
      total++;
      tally(stat, res.status);
      if (res.status !== 'ok') continue;
      ok++;
      for (const [name, W] of [['Wn', 61], ['Wf', 121]]) {
        const j = idx(o, W);
        const p = predictAt(o, res, W);
        sig[name].push(p.pred.major);
        const D = od.sepArcsec(p.lam, p.bet, o.twobody.lam[j], o.twobody.bet[j]);
        const tol = o.E[String(W)] + o.Efit_L240.atW[String(W)] + 3.44 * p.pred.major;
        a[name][1]++;
        if (D <= tol) a[name][0]++;
      }
    }
  }
  const ratio = median(sig.Wf) / median(curatedSigma.Wf);
  const m = { okRate: ok / total, statuses: stat, withinTolWn: a.Wn[0] / a.Wn[1], withinTolWf: a.Wf[0] / a.Wf[1], medianSigmaMajorWf: median(sig.Wf), curatedMedianSigmaMajorWf: median(curatedSigma.Wf), medianSigmaMajorWn: median(sig.Wn), semiMajorRatioWf: ratio };
  detail.L1 = m;
  add('L1.longer', m, TH.legs['L1.longer'].bounds, m.okRate >= 0.95 && m.withinTolWn >= 0.97 && m.withinTolWf >= 0.97 && ratio <= 1.0);
  log('L1 done', JSON.stringify(m));
}

// ====================================================================== N1
{
  const stat = counts();
  let total = 0;
  for (const n of ora.neos) {
    const gs = gaussStream(SEED + 5e6 + n.id * 1e4);
    for (let d = 0; d < DRAWS; d++) {
      const obs = [-5, 0, 5].map((off, j) => ({
        t: n.t2 + off,
        R: earth(n.t2 + off),
        lam: n.nbody.lam[j] + (gs() * SIG_RAD) / Math.cos(n.nbody.bet[j]),
        bet: n.nbody.bet[j] + gs() * SIG_RAD,
      }));
      const res = od.determine(obs, CFG);
      total++;
      tally(stat, res.status);
    }
  }
  const okN = stat.ok || 0;
  const near = ((stat.nearEarth || 0) + (stat.illConditioned || 0)) / total;
  detail.N1 = { statuses: stat, total, nearEarthOnMainBelt: detail.nearEarthOnMainBelt };
  add('N1.nearEarth', { okDraws: okN, nearEarthOrIllConditioned: near, mainBeltNearEarth: detail.nearEarthOnMainBelt, statuses: stat }, TH.legs['N1.nearEarth'].bounds, okN === 0 && near >= 0.9 && detail.nearEarthOnMainBelt === 0);
  log('N1 done', JSON.stringify(stat));
}

// ====================================================================== P1 (reported, never judged)
{
  const errs = { laplaceRaw: [], gaussRaw: [], polished: [] };
  let laplaceHas = 0;
  let laplacePolish = 0;
  let total = 0;
  for (const o of objs) {
    const gs = gaussStream(SEED + 6e6 + o.id * 1e4);
    for (let d = 0; d < 20; d++) {
      const obs = obsFor(o, [-60, 0, 60], 'nbody', gs);
      total++;
      const lap = od.laplace(obs, earthV(o.t2));
      const g = od.determine(obs, { sigmaArcsec: SIGMA, kappaMax: 1e99 });
      if (g.raw) errs.gaussRaw.push(Math.hypot(...[0, 1, 2].map(k => g.raw.state.r[k] - o.state.r[k])));
      if (g.x) errs.polished.push(Math.hypot(...[0, 1, 2].map(k => g.x[k] - o.state.r[k])));
      if (lap.length) {
        laplaceHas++;
        // the root closest to the Gauss polished distance stands for the solver's own choice
        const ref = g.x ? norm3(g.x.slice(0, 3)) : 2.5;
        const best = lap.sort((p, q) => Math.abs(p.r2 - ref) - Math.abs(q.r2 - ref))[0];
        errs.laplaceRaw.push(Math.hypot(...[0, 1, 2].map(k => best.state.r[k] - o.state.r[k])));
        const pol = od.polish(obs, best.state, o.t2);
        if (pol.converged) laplacePolish++;
      }
    }
  }
  detail.P1 = {
    reported: 'never judged',
    draws: total,
    laplaceRootsFound: laplaceHas,
    laplacePolishConverged: laplacePolish,
    medianPositionErrorAu: { laplaceRaw: median(errs.laplaceRaw), gaussRaw: median(errs.gaussRaw), gaussPolished: median(errs.polished) },
  };
  add('P1.laplace', detail.P1, 'reported, never judged', null);
  log('P1 done');
}
function norm3(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

// ====================================================================== the verdict
const pass = id => rows.find(r => r.id === id)?.pass === true;
const all = ids => ids.every(pass);
const F = ['F1.propagate', 'F2.oracle', 'F3.observer', 'F4.forward', 'F5.exact'];
const G = ['G1.noisy', 'G2.cond', 'G3.withheld', 'G4.coverage', 'G5.useful'];
const notRun = {
  'A1.authentic': 'needs R1, R2 and R3 (the MPC observations, the published orbit, the observatory parallax constants); nothing was downloaded, none is simulated',
  'A2.reference': 'as A1',
  'A3.observation': 'as A1',
  'A4.longer': 'as A1',
};
const syntheticA = all([...F, ...G, 'H1.refuse', 'H2.sweep', 'L1.longer', 'N1.nearEarth']);
const syntheticB = all([...F, 'H1.refuse', 'H2.sweep', 'L1.longer', 'N1.nearEarth']);
const record = {
  format: 'gravitas.orbit-determination-gate-record/1',
  prompt: '197',
  node: process.version,
  oracle: ora.versions,
  seconds: (Date.now() - t0wall) / 1000,
  rows,
  detail,
  notRun,
  syntheticLegs: { A: syntheticA, B: syntheticB },
};
writeFileSync(OUT, JSON.stringify(record, null, 1));
console.log(JSON.stringify(rows.map(r => [r.id, r.pass]), null, 0));
console.log('synthetic A', syntheticA, 'synthetic B', syntheticB);
