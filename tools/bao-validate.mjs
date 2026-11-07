// The BAO gate validator (Prompt 257 Part A). SPIKE ONLY, never merged.
// Judges the prototype (js/kernels/cosmology/bao/bao.js) against tests/fixtures/bao/thresholds.json and the
// oracle's pinned output, row by row, and gives the verdict by the committed function.
//
//   node tools/bao-validate.mjs <thresholds.json> <oracle-results.json> <sidecar.json> <pack.json> <out dir> [planck-table1.json]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stream, gaussian } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { createFriedmann } from '../js/kernels/cosmology/late/index.js';
import { C_KMS } from '../js/kernels/cosmology/flrw.js';
import * as bao from '../js/kernels/cosmology/bao/bao.js';

const [thrPath, oraclePath, sidecarPath, packPath, outDir, planckPath] = process.argv.slice(2);
const T0 = Date.now();
const thrBytes = readFileSync(thrPath);
const T = JSON.parse(thrBytes);
const O = JSON.parse(readFileSync(oraclePath));
const sidecarBytes = readFileSync(sidecarPath);
const SERIES = JSON.parse(sidecarBytes);
const PACK = JSON.parse(readFileSync(packPath));
const sha = b => createHash('sha256').update(b).digest('hex');

const rows = [];
const row = (id, status, measured, bound, note) => rows.push({ id, status, measured, bound, ...(note ? { note } : {}) });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const maxOf = xs => xs.reduce((m, v) => Math.max(m, v), 0);
const checkOf = id => T.checks.find(c => c.id === id);
const TOL = T.tolerance;
const ZS8 = T.worlds.redshifts;
const G = O.constants.G_SI;
const TCMB = O.constants.Tcmb0;

const radFor = Neff => bao.radiation({ T: TCMB, Neff, G });
const kernelParams = (W, Or) => {
  const p = { H0: W.H0, Om: W.Om, Or, w: W.w };
  if (W.Ode !== 'flat') p.Ode = W.Ode;
  return p;
};
const rsParams = (W, Neff) => {
  const r = radFor(Neff);
  const h = W.H0 / 100;
  return { H0: W.H0, Om: W.Om, Or: r.omegaRad / (h * h), Ode: W.Ode, w: W.w, omegaB: W.omegaB, omegaGamma: r.omegaGamma, zd: W.zd };
};
const dropFlat = p => (p.Ode === 'flat' ? { ...p, Ode: undefined } : p);

// ------------------------------------------------------------------ I: integrity
{
  const tab = tableOf({ PACK, SERIES });
  const ra = tab.columns[0].values;
  const zg = tab.columns[1].values;
  const shaOk = sha(sidecarBytes) === PACK.derived.sidecar.sha256;
  row('I1.pack', shaOk && tab.n === 2911 && O.data.sidecarSha256 === PACK.derived.sidecar.sha256 ? 'pass' : 'fail',
    { sha256: sha(sidecarBytes), rows: tab.n, oracleSha256: O.data.sidecarSha256 }, 'exact');
  let sorted = true;
  for (let i = 1; i < ra.length; i++) if (ra[i] < ra[i - 1]) sorted = false;
  const sumRa = ra.reduce((s, v) => s + v, 0);
  const sumZ = zg.reduce((s, v) => s + v, 0);
  const sane = sorted && ra[0] >= 120 && ra[ra.length - 1] < 240 && Math.min(...zg) >= 0.01 && Math.max(...zg) <= 0.12 &&
    ra.every(Number.isFinite) && zg.every(Number.isFinite);
  const dSum = Math.max(rel(sumRa, O.data.raSum), rel(sumZ, O.data.zSum));
  const dFirst = maxOf([...ra.slice(0, 5)].map((v, i) => Math.abs(v - O.data.raFirst[i])).concat([...zg.slice(0, 5)].map((v, i) => Math.abs(v - O.data.zFirst[i]))));
  row('I2.decode', sane && dSum <= 1e-12 && dFirst <= 1e-12 ? 'pass' : 'fail',
    { sane, relativeDifferenceOfSums: dSum, firstFiveDifference: dFirst, raMin: ra[0], raMax: ra[ra.length - 1] }, 'sums 1e-12, first five 1e-12, sane');
}

// ------------------------------------------------------------------ G: the standard-ruler relation
{
  const H0 = 70;
  const dh = C_KMS / H0;
  const eds = createFriedmann({ H0, Om: 1, Or: 0, Ode: 0 });
  const e1 = ZS8.map(z => {
    const k = bao.distances(eds, z);
    const dm = 2 * dh * (1 - 1 / Math.sqrt(1 + z));
    const dH = dh / Math.pow(1 + z, 1.5);
    const dv = Math.cbrt(z * dH * dm * dm);
    return maxOf([rel(k.DM, dm), rel(k.DH, dH), rel(k.DV, dv)]);
  });
  row('G1.edsClosedForm', maxOf(e1) <= TOL.closedFormDistance ? 'pass' : 'fail', { maxRelative: maxOf(e1) }, TOL.closedFormDistance);
  const emp = createFriedmann({ H0, Om: 0, Or: 0, Ode: 0 });
  const e2 = ZS8.map(z => {
    const k = bao.distances(emp, z);
    const dm = dh * Math.sinh(Math.log(1 + z));
    const dH = dh / (1 + z);
    const dv = Math.cbrt(z * dH * dm * dm);
    return maxOf([rel(k.DM, dm), rel(k.DH, dH), rel(k.DV, dv)]);
  });
  row('G2.emptyClosedForm', maxOf(e2) <= TOL.closedFormDistance ? 'pass' : 'fail', { maxRelative: maxOf(e2) }, TOL.closedFormDistance);

  const e3 = [];
  const e4 = [];
  const e5 = [];
  const e6 = [];
  for (const W of O.worlds) {
    const flat = T.worlds.list.find(w => w.id === W.id).Ode === 'flat';
    const F = createFriedmann(kernelParams({ ...W, Ode: flat ? 'flat' : W.Ode }, W.astropyOr));
    ZS8.forEach((z, i) => {
      const k = bao.distances(F, z);
      e3.push(maxOf([rel(k.DM, W.astropy.DM[i]), rel(k.DH, W.astropy.DH[i]), rel(k.DV, W.astropy.DV[i])]));
      const dv3 = (C_KMS * z * (1 + z) ** 2 * F.angularDiameterDistance(z) ** 2) / F.hubbleParameter(z);
      e4.push(rel(k.DV ** 3, dv3));
      for (const lam of [0.5, 1.7, 3]) {
        const Fl = createFriedmann({ ...kernelParams({ ...W, Ode: flat ? 'flat' : W.Ode }, W.astropyOr), H0: W.H0 * lam });
        const kl = bao.distances(Fl, z);
        const rd = 147.3;
        const rdl = rd / lam;
        e5.push(maxOf([rel(kl.DM / rdl, k.DM / rd), rel(kl.DH / rdl, k.DH / rd), rel(kl.DV / rdl, k.DV / rd)]));
      }
    });
    const zl = 1e-4;
    const kl = bao.distances(F, zl);
    e6.push(Math.abs((kl.DV * W.H0) / (C_KMS * zl) - 1));
  }
  row('G3.astropy', maxOf(e3) <= TOL.distance ? 'pass' : 'fail', { maxRelative: maxOf(e3), cases: e3.length }, TOL.distance);
  row('G4.identityDV', maxOf(e4) <= TOL.identity ? 'pass' : 'fail', { maxRelative: maxOf(e4), cases: e4.length }, TOL.identity);
  row('G5.scaling', maxOf(e5) <= TOL.scaling ? 'pass' : 'fail', { maxRelative: maxOf(e5), cases: e5.length }, TOL.scaling);
  row('G6.lowRedshift', maxOf(e6) <= TOL.lowRedshift ? 'pass' : 'fail', { maxDeviation: maxOf(e6) }, TOL.lowRedshift);
}

// ------------------------------------------------------------------ R: the sound horizon
{
  const e1 = O.radiation.map(r => {
    const mine = radFor(r.Neff);
    return maxOf([rel(mine.omegaGamma, r.astropyOmegaGammaH2), rel(mine.omegaRad, r.astropyRadiationH2)]);
  });
  row('R1.radiation', maxOf(e1) <= TOL.radiation ? 'pass' : 'fail', { maxRelative: maxOf(e1), Neff: O.radiation.map(r => r.Neff) }, TOL.radiation);

  const e2 = O.closedForms.map(c => {
    const r = radFor(c.Neff);
    const Or = r.omegaRad / 0.49;
    const v = bao.soundHorizon({ H0: 70, Om: 1 - Or, Or, Ode: 0, w: -1, omegaB: c.omegaB, omegaGamma: r.omegaGamma, zd: 1060 });
    return rel(v.value, c.closedForm);
  });
  row('R2.closedForm', maxOf(e2) <= TOL.soundHorizonVsClosedForm ? 'pass' : 'fail', { perSet: e2 }, TOL.soundHorizonVsClosedForm);

  const e3 = [];
  const e6 = [];
  const reported = [];
  for (const W of O.worlds) {
    const cw = T.worlds.list.find(w => w.id === W.id);
    const v = bao.soundHorizon(rsParams(cw, cw.Neff));
    e3.push(Math.max(rel(v.value, W.rsOwn), rel(v.value, W.rsAstropyH)));
    e6.push(Math.abs(v.value - W.rsOwn) <= Math.max(v.error, 4e-16 * v.value));
    reported.push({ id: W.id, prototype: v.value, oracleOwn: W.rsOwn, oracleAstropyH: W.rsAstropyH, error: v.error });
  }
  row('R3.quadrature', maxOf(e3) <= TOL.soundHorizonVsQuad ? 'pass' : 'fail', { perWorld: e3 }, TOL.soundHorizonVsQuad);
  {
    const r = radFor(3.046);
    const Or = r.omegaRad / 0.49;
    const v = bao.soundHorizon({ H0: 70, Om: 1 - Or, Or, Ode: 0, w: -1, omegaB: 1e-8, omegaGamma: r.omegaGamma, zd: 1060 });
    const d = rel(v.value, O.baryonFree.closedForm);
    row('R4.baryonFree', d <= TOL.baryonFree ? 'pass' : 'fail', { relative: d }, TOL.baryonFree);
  }
  {
    const w1 = T.worlds.list[0];
    const base = rsParams(w1, w1.Neff);
    const steps = [];
    const sweep = (name, values, make) => {
      const v = values.map(x => bao.soundHorizon(make(x)).value);
      let ok = 0;
      for (let i = 1; i < v.length; i++) if (v[i] < v[i - 1]) ok++;
      steps.push({ name, steps: v.length - 1, decreasing: ok });
    };
    const grid = (a, b) => Array.from({ length: 21 }, (_, i) => a + ((b - a) * i) / 20);
    sweep('zd', grid(500, 3000), x => ({ ...base, zd: x }));
    sweep('omegaB', grid(0.01, 0.04), x => ({ ...base, omegaB: x }));
    sweep('Om', grid(0.15, 0.6), x => {
      const h = w1.H0 / 100;
      return { ...base, Om: x, Ode: 'flat', Or: base.Or };
    });
    sweep('Neff', grid(1, 6), x => {
      const r = radFor(x);
      return { ...base, Or: r.omegaRad / 0.49, omegaGamma: r.omegaGamma };
    });
    row('R5.monotone', steps.every(s => s.decreasing === s.steps) ? 'pass' : 'fail', steps, 'every step in every direction');
  }
  row('R6.errorCover', e6.every(Boolean) ? 'pass' : 'fail', { covered: e6.filter(Boolean).length, of: e6.length }, '10 of 10');
  row('X1.reportedRs', 'reported', reported, 'REPORTED');
}

// ------------------------------------------------------------------ P: the published comparison
let planck = null;
if (planckPath && existsSync(planckPath)) planck = JSON.parse(readFileSync(planckPath));
{
  row('P1.plankRdrag', 'not-run', null, 'as publishedComparison.pass', "AM2: Table 1's best-fit column prints no z_drag; see P1b");
  if (!planck || planck.ambiguous) {
    row('P1b.plankRdragT2', 'not-run', null, 'r_drag in [r_lo - u, r_hi + u]', planck ? planck.reason : 'no extraction fixture supplied');
    row('X2.reportedBracket', 'not-run', null, 'REPORTED', 'needs the P1b extraction');
  } else {
    const V = planck.values;
    const num = k => Number(V[k]);
    const unit = k => Math.pow(10, -((String(V[k]).split('.')[1] || '').length));
    const h = num('H0') / 100;
    const mnu = num('neutrinoMassEv');
    const cases = (wb, wc, H0, zd) => {
      const hh = H0 / 100;
      const rL = radFor(3.046);
      const L = bao.soundHorizon({ H0, Om: (wb + wc) / (hh * hh), Or: rL.omegaRad / (hh * hh), Ode: 'flat', w: -1, omegaB: wb, omegaGamma: rL.omegaGamma, zd });
      const wn = mnu / 93.14;
      const Om = (wb + wc + wn) / (hh * hh);
      const Or = (rL.omegaGamma * (1 + bao.NU_FACTOR * 3.046 * (2 / 3))) / (hh * hh);
      const H = bao.soundHorizon({ H0, Om, Or, Ode: 'flat', w: -1, omegaB: wb, omegaGamma: rL.omegaGamma, zd });
      return { L: L.value, H: H.value };
    };
    const base = cases(num('omegaB'), num('omegaC'), num('H0'), num('zdrag'));
    const lo = Math.min(base.L, base.H);
    const hi = Math.max(base.L, base.H);
    const names = ['omegaB', 'omegaC', 'H0', 'zdrag'];
    let prop = 0;
    for (const nm of names) {
      const x = num(nm);
      const args = [num('omegaB'), num('omegaC'), num('H0'), num('zdrag')];
      const idx = names.indexOf(nm);
      const up = args.slice();
      const dn = args.slice();
      up[idx] = x * (1 + 1e-4);
      dn[idx] = x * (1 - 1e-4);
      const a = cases(...up);
      const b = cases(...dn);
      const dL = Math.abs(a.L - b.L) / (2 * x * 1e-4);
      const dH = Math.abs(a.H - b.H) / (2 * x * 1e-4);
      prop += Math.max(dL, dH) * (nm === 'zdrag' ? Number(V.zdragSigma) + 0.5 * unit(nm) : 0.5 * unit(nm));
    }
    const u = unit('rdrag') + prop;
    const r = num('rdrag');
    const pass = r >= lo - u && r <= hi + u;
    row('P1b.plankRdragT2', pass ? 'pass' : 'fail', { rdragPrinted: r, rL: base.L, rH: base.H, u, interval: [lo - u, hi + u] }, 'rdrag in [r_lo - u, r_hi + u]');
    row('X2.reportedBracket', 'reported', { fractionBetween: (r - lo) / (hi - lo), outsideInUnitsOfU: r < lo ? (lo - r) / u : r > hi ? (r - hi) / u : 0 }, 'REPORTED');
  }
  row('P2.plankZdrag', 'not-run', null, 'needs F1', 'F1: no fitting formula fetched, none typed');
}

// ------------------------------------------------------------------ E and K: the profile likelihood
const SE = T.syntheticEnsemble;
const THETA = SE.truth.theta;
const zsE = SE.redshifts;
const meanE = bao.basisFlat(SE.truth.Om, zsE).map(v => THETA * v);
const fracE = zsE.flatMap(() => [0.02, 0.04]);
const covE = bao.designCovariance(meanE, fracE);
const profE = bao.createProfile({ zs: zsE, covariance: covE });
const band = p => [p - 3 * Math.sqrt((p * (1 - p)) / SE.draws), p + 3 * Math.sqrt((p * (1 - p)) / SE.draws)];
const B68 = band(0.6827);
const B95 = band(0.9545);
const inBand = (v, b) => v >= b[0] && v <= b[1];
{
  const gauss = gaussian(stream('noise', '257:bao:ensemble'));
  const e = bao.runEnsemble(profE, meanE, covE, gauss, SE.draws, SE.truth.Om);
  const o = O.ensemble;
  row('E1.coverage68', inBand(e.cover68, B68) && inBand(o.cover68, B68) ? 'pass' : 'fail', { prototype: e.cover68, oracle: o.cover68, draws: SE.draws }, B68);
  row('E2.coverage95', inBand(e.cover95, B95) && inBand(o.cover95, B95) ? 'pass' : 'fail', { prototype: e.cover95, oracle: o.cover95, draws: SE.draws }, B95);

  // E3 pinned
  const diffs = [];
  O.pinned.forEach(pin => {
    const f = profE.fit(pin.data);
    const num = (a, b, tol, relative) => diffs.push(relative ? rel(a, b) / tol : Math.abs(a - b) / tol);
    num(f.chi2min, pin.chi2min, TOL.chi2, true);
    diffs.push(Math.abs(f.bestOm - pin.bestOm) / TOL.interval);
    num(f.theta, pin.theta, TOL.chi2, true);
    num(f.p, pin.p, TOL.chi2, true);
    for (const k of ['lo68', 'hi68', 'lo95', 'hi95']) {
      if ((f[k] === null) !== (pin[k] === null)) diffs.push(Infinity);
      else if (f[k] !== null) diffs.push(Math.abs(f[k] - pin[k]) / TOL.interval);
    }
  });
  row('E3.pinned', Math.max(...diffs) <= 1 ? 'pass' : 'fail', { worstOverBound: Math.max(...diffs), vectors: O.pinned.length }, 'each quantity within its tolerance');

  // E4 not constrained
  const nc = SE.notConstrained;
  const covNC = bao.designCovariance(meanE, meanE.map(() => nc.fractionalSigma));
  const profNC = bao.createProfile({ zs: zsE, covariance: covNC });
  const eNC = bao.runEnsemble(profNC, meanE, covNC, gaussian(stream('noise', '257:bao:notconstrained')), nc.draws, SE.truth.Om);
  const oNC = O.notConstrained;
  row('E4.notConstrained', eNC.openFraction >= 0.95 && oNC.openFraction >= 0.95 && !eNC.violation && !oNC.violation ? 'pass' : 'fail',
    { prototypeOpen: eNC.openFraction, oracleOpen: oNC.openFraction, violationPrototype: eNC.violation, violationOracle: oNC.violation }, '>= 0.95 and no violation');

  // E5 misspecified
  const ms = SE.misspecified;
  const Fo = createFriedmann({ H0: 100, Om: 0.3, Or: 0, Ode: 0 });
  const meanMS = zsE.flatMap(z => [(THETA * Fo.transverseComovingDistance(z) * 100) / C_KMS, THETA / Fo.E(z)]);
  const covMS = bao.designCovariance(meanMS, meanMS.map(() => 0.01));
  const profMS = bao.createProfile({ zs: zsE, covariance: covMS });
  const eMS = bao.runEnsemble(profMS, meanMS, covMS, gaussian(stream('noise', '257:bao:misspecified')), ms.draws, SE.truth.Om);
  const oMS = O.misspecified;
  row('E5.misspecified', eMS.poorFitFraction >= 0.8 && oMS.poorFitFraction >= 0.8 ? 'pass' : 'fail',
    { prototypePoorFit: eMS.poorFitFraction, oraclePoorFit: oMS.poorFitFraction, truthVectorDifference: maxOf(meanMS.map((v, i) => rel(v, oMS.truthVector[i]))) }, '>= 0.80 each');

  // K1 the product
  const other = o => ((o - 0.28) / 0.03) ** 2;
  const d0 = O.pinned[0].data;
  const j = profE.joint(d0, other);
  const P = O.product;
  const sumDiff = maxOf(j.sum.map((s, i) => Math.abs(s - (j.bao[i] + other(bao.NODES[i])))));
  const atNodes = P.nodes.map((n, i) => rel(profE.chi2At(d0, n) + other(n), P.jointAtNodes[i]));
  const between = j.bestOm >= Math.min(P.bestOmBao, 0.28) && j.bestOm <= Math.max(P.bestOmBao, 0.28);
  const k1 = sumDiff <= 1e-12 && maxOf(atNodes) <= TOL.chi2 && Math.abs(j.bestOm - P.bestOm) <= TOL.interval && rel(j.chi2min, P.chi2min) <= TOL.chi2 &&
    Math.abs(j.lo68 - P.lo68) <= TOL.interval && Math.abs(j.hi68 - P.hi68) <= TOL.interval && between;
  row('K1.product', k1 ? 'pass' : 'fail', { sumDifference: sumDiff, atNodes: maxOf(atNodes), bestOm: j.bestOm, interval68: [j.lo68, j.hi68], between }, 'as stated');
}
row('X4.reportedCombination', 'omitted', null, 'OMITTED', "Appendix C: 256's verdict is FC; nothing computed");

// ------------------------------------------------------------------ Z: refusals
{
  let disagree = 0;
  const acc = [];
  const counts = {};
  for (const d of O.refusalEnsemble.draws) {
    let dec = 'accept';
    let value = null;
    try {
      value = bao.soundHorizon(d.p).value;
    } catch (e) {
      dec = e.code ?? `EXC:${e.message}`;
    }
    counts[dec] = (counts[dec] || 0) + 1;
    if (dec !== d.decision) disagree++;
    else if (dec === 'accept') acc.push(rel(value, d.rs));
  }
  row('Z1.refusalEnsemble', disagree === 0 && maxOf(acc) <= 1e-9 ? 'pass' : 'fail',
    { draws: O.refusalEnsemble.draws.length, disagreements: disagree, accepted: acc.length, worstRsRelative: maxOf(acc), counts }, '0 disagreements, 1e-9');

  const ds = O.pinned[0].data;
  const C = covE;
  const asym = C.map(r => r.slice());
  asym[0][1] += 1e-3 * Math.max(...C.flat().map(Math.abs));
  const nonpd = C.map(r => r.slice());
  nonpd[2][2] = -Math.abs(nonpd[2][2]);
  const nan = ds.slice();
  nan[3] = NaN;
  const cases = [
    ['1-datum', bao.checkInputs(ds.slice(0, 1), [[C[0][0]]])],
    ['2-data', bao.checkInputs(ds.slice(0, 2), C.slice(0, 2).map(r => r.slice(0, 2)))],
    ['asymmetric', bao.checkInputs(ds, asym)],
    ['not-positive-definite', bao.checkInputs(ds, nonpd)],
    ['nan-datum', bao.checkInputs(nan, C)],
    ['dimension-mismatch', bao.checkInputs(ds, C.slice(0, 5).map(r => r.slice(0, 5)))],
  ];
  const mine = cases.filter(([k, v], i) => v === O.inputRefusals[i].decision && k === O.inputRefusals[i].case).length;
  const refusedAll = cases.every(([, v]) => v !== null);
  row('Z2.inputRefusals', mine === 6 && refusedAll ? 'pass' : 'fail', { prototype: cases.map(([k, v]) => `${k}:${v}`), agreeWithOracle: mine }, '6 of 6 each');
}

// ------------------------------------------------------------------ F and O: not run
for (const id of ['F1.zdFormula', 'F2.rdFormulaVsIntegral', 'F3.rdFormulaVsPublished', 'F4.formulaDomain', 'F5.statedError'])
  row(id, 'not-run', null, checkOf(id).bound, 'request F1: the source text of the cited fitting formulas; no coefficient typed');
for (const id of ['O1.tableIntegrity', 'O2.printedFit', 'O3.fiducialRescale'])
  row(id, 'not-run', null, checkOf(id).bound, "request O1: a BAO release's table, covariance and fiducial cosmology; none fetched");

// ------------------------------------------------------------------ D: the demonstration
let detectable = null;
{
  const tab = tableOf({ PACK, SERIES });
  const ra = Array.from(tab.columns[0].values);
  const zg = Array.from(tab.columns[1].values);
  const Nd = ra.length;
  const Nr = 10 * Nd;
  const fid = createFriedmann({ H0: 70, Om: 0.3 });
  const distG = zg.map(z => fid.comovingDistance(z));
  const hFid = 0.7;
  const DEC = 0.25;

  // D1 stream
  const sh = vals => createHash('sha256').update(Buffer.from(new Float64Array(vals).buffer)).digest('hex');
  const sd = [];
  for (const key of ['257:bao:randoms', '257:bao:null:0', 257]) {
    const g = stream('injection', key);
    const vals = Array.from({ length: 1000 }, () => g());
    const o = O.stream[String(key)];
    let sum = 0;
    for (const v of vals) sum += v;
    sd.push({ key: String(key), firstEqual: vals.slice(0, 5).every((v, i) => v === o.first[i]), lastEqual: vals[999] === o.last, sumEqual: sum === o.sum, hashEqual: sh(vals) === o.hash });
  }
  row('D1.stream', sd.every(s => s.firstEqual && s.lastEqual && s.sumEqual && s.hashEqual) ? 'pass' : 'fail', sd, '0 differences');

  const catalog = (seedText, n, raFrom, raSpan) => {
    const g = stream('injection', seedText);
    const r = new Array(n);
    const di = new Array(n);
    for (let i = 0; i < n; i++) {
      const u1 = g();
      const u2 = g();
      r[i] = raFrom + raSpan * u1;
      di[i] = distG[Math.floor(u2 * Nd)];
    }
    return { ra: r, dist: di };
  };
  const mk = c => ({ P: bao.positions(c.ra, c.dist, hFid, DEC), blk: bao.blockOf(c.ra) });
  const blockCounts = blk => {
    const c = new Array(bao.NB).fill(0);
    blk.forEach(b => c[b]++);
    return c;
  };
  const Dc = mk({ ra, dist: distG });
  const randoms = mk(catalog('257:bao:randoms', Nr, 120, 120));
  const DDc = bao.pairsSelf(Dc.P, Dc.blk);
  const RRc = bao.pairsSelf(randoms.P, randoms.blk);
  const DRc = bao.pairsCross(Dc.P, Dc.blk, randoms.P, randoms.blk);
  const res = bao.correlation({ DDc, DRc, RRc, nd: Nd, nr: Nr, ndBlock: blockCounts(Dc.blk), nrBlock: blockCounts(randoms.blk) });
  const op = O.pairs;
  const cmpCounts = (a, b) => maxOf(a.map((v, i) => Math.abs(v - b[i]) / Math.max(2, 1e-4 * b[i])));
  const wc = Math.max(cmpCounts(res.DD, op.DD), cmpCounts(res.DR, op.DR), cmpCounts(res.RR, op.RR));
  row('D2.counts', wc <= 1 ? 'pass' : 'fail', { worstOverTolerance: wc, DD: res.DD }, 'max(2, 1e-4 x count) per bin');
  const dx = maxOf(res.xi.map((v, i) => Math.abs(v - op.xi[i])));
  row('D3.estimator', dx <= TOL.xi ? 'pass' : 'fail', { maxAbsolute: dx }, TOL.xi);
  const dj = maxOf(res.sigma.map((v, i) => rel(v, op.sigmaJackknife[i])));
  row('D4.jackknife', dj <= TOL.jackknifeSigma ? 'pass' : 'fail', { maxRelative: dj }, TOL.jackknifeSigma);

  // D5 null ensemble
  const nulls = [];
  for (let k = 0; k < 16; k++) {
    const nc = mk(catalog(`257:bao:null:${k}`, Nd, 120, 120));
    const dd = bao.pairsSelf(nc.P, nc.blk);
    const dr = bao.pairsCross(nc.P, nc.blk, randoms.P, randoms.blk);
    const tot = c => {
      const t = new Array(bao.NBINS).fill(0);
      for (let q = 0; q < bao.NB * bao.NB; q++) for (let b = 0; b < bao.NBINS; b++) t[b] += c[q * bao.NBINS + b];
      return t;
    };
    nulls.push(bao.landySzalay(tot(dd), tot(dr), res.RR, Nd, Nr));
  }
  const mean = Array.from({ length: bao.NBINS }, (_, b) => nulls.reduce((s, x) => s + x[b], 0) / nulls.length);
  const sdm = mean.map((m, b) => Math.sqrt(nulls.reduce((s, x) => s + (x[b] - m) ** 2, 0) / (nulls.length - 1)) / Math.sqrt(nulls.length));
  const pass = mean.filter((m, b) => Math.abs(m) <= 3 * sdm[b] + 0.001).length;
  const oNull = O.nullEnsemble;
  const nullDiff = maxOf(nulls.map((x, k) => maxOf(x.map((v, b) => Math.abs(v - oNull.xi[k][b])))));
  row('D5.nullEnsemble', pass >= 11 && oNull.passBins >= 11 ? 'pass' : 'fail', { prototypePassBins: pass, oraclePassBins: oNull.passBins, worstDifferenceFromOracle: nullDiff }, '>= 11 of 12 each');

  // D6 detectability (the committed footprint)
  const sig = bao.peakSignificance(res.xi, res.sigma);
  detectable = !sig.refused && sig.maxWindowSN >= 4 && O.pairs.maxWindowSN >= 4;
  const agree = !sig.refused && Math.abs(sig.maxWindowSN - O.pairs.maxWindowSN) <= 1e-2;
  row('D6.detectable', detectable ? 'pass' : 'fail', { prototypeMaxWindowSN: sig.maxWindowSN, oracleMaxWindowSN: O.pairs.maxWindowSN, agree, refused: sig.refused }, 'max S/N >= 4',
    detectable ? 'detectable' : 'NOT detectable at this size (a measurement, not a defect of the kernel; the demonstration is not built)');
  row('X3.reportedPairs', 'reported', { DD: res.DD, xi: res.xi, sigmaJackknife: res.sigma, smoothFit: sig.fit, sn: sig.sn }, 'REPORTED');

  // X5 AM1: the data's own RA extent
  const raMin = Math.min(...ra);
  const rext = mk(catalog('257:bao:randoms-extent', Nr, raMin, 240 - raMin));
  const RRe = bao.pairsSelf(rext.P, rext.blk);
  const DRe = bao.pairsCross(Dc.P, Dc.blk, rext.P, rext.blk);
  const re = bao.correlation({ DDc, DRc: DRe, RRc: RRe, nd: Nd, nr: Nr, ndBlock: blockCounts(Dc.blk), nrBlock: blockCounts(rext.blk) });
  const se = bao.peakSignificance(re.xi, re.sigma);
  row('X5.reportedExtent', 'reported', { prototypeMaxWindowSN: se.maxWindowSN, oracleMaxWindowSN: O.pairsExtent.maxWindowSN, xi: re.xi, sigmaJackknife: re.sigma, sn: se.sn }, 'REPORTED');
}

// ------------------------------------------------------------------ the verdict, by the committed function
const by = id => rows.find(r => r.id === id);
const group = g => T.checks.filter(c => c.group === g).map(c => by(c.id));
const kernelGroups = ['integrity', 'ruler', 'ensemble', 'combination', 'refusals'];
const kernelRows = kernelGroups.flatMap(group);
const p1 = by('P1b.plankRdragT2');
const demoRows = ['D1.stream', 'D2.counts', 'D3.estimator', 'D4.jackknife', 'D5.nullEnsemble'].map(by);
const kernelPass = kernelRows.every(r => r.status === 'pass') && (p1.status === 'pass' || p1.status === 'not-run') &&
  (!detectable || demoRows.every(r => r.status === 'pass'));
const fRows = group('formula');
const oRows = group('observable');
let verdict;
if (!kernelPass) verdict = 'C';
else if (fRows.some(r => r.status === 'fail')) verdict = 'C';
else if (fRows.some(r => r.status === 'not-run')) verdict = 'NOT ESTABLISHED';
else if (oRows.every(r => r.status === 'pass')) verdict = 'A';
else verdict = 'B';
const failing = rows.filter(r => r.status === 'fail');
const tally = {};
for (const r of rows) tally[r.status] = (tally[r.status] || 0) + 1;
const results = {
  format: 'gravitas.bao-gate-results/1',
  thresholdsSha256: sha(thrBytes),
  oracleSha256: sha(readFileSync(oraclePath)),
  planckExtractionSha256: planck ? sha(readFileSync(planckPath)) : null,
  node: process.version,
  seconds: Math.round((Date.now() - T0) / 100) / 10,
  counts: { rows: rows.length, ...tally },
  verdict: {
    kernel: kernelPass ? 'KERNEL PASS' : 'KERNEL FAIL',
    product: verdict,
    consumersClause: verdict === 'A' || verdict === 'B' ? 'met' : 'unmet',
    demonstration: detectable ? 'detectable: may be built (Part B)' : 'not detectable at this size: not built',
    combinationWith256: 'omitted (256 verdict FC)',
  },
  rows,
};
writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 1) + '\n');
writeFileSync(`${outDir}/failed-legs.json`, JSON.stringify({ format: 'gravitas.bao-failed-legs/1', note: 'every row that crossed its committed bound, left failing', failed: failing.map(r => ({ id: r.id, measured: r.measured, bound: r.bound, note: r.note ?? null })) }, null, 1) + '\n');
console.log(JSON.stringify({ counts: results.counts, verdict: results.verdict, failing: failing.map(r => r.id), seconds: results.seconds }));
