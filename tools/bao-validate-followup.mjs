// The BAO gate follow-up validator (Prompt 257, the authentic legs). SPIKE ONLY, never merged.
// Judges the prototype (js/kernels/cosmology/bao/bao.js and formulas.js) against tests/fixtures/bao/thresholds-followup.json
// and the second oracle's pinned output, row by row, then applies the parent's verdict function.
//
//   node tools/bao-validate-followup.mjs <thresholds-followup.json> <thresholds.json> <results.json (parent)> <oracle-followup.json> <authentic dir> <out dir>

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { stream, gaussian } from '../js/random/streams.js';
import { createFriedmann } from '../js/kernels/cosmology/late/index.js';
import { C_KMS } from '../js/kernels/cosmology/flrw.js';
import { invertSpd, cholesky, eigenSymmetric } from '../js/numeric/linalg.js';
import { brent } from '../js/numeric/roots.js';
import { gammaQ } from '../js/kernels/statistics/special.js';
import * as bao from '../js/kernels/cosmology/bao/bao.js';
import { createFormulas, halfUnit, unitOf, paperIntegral, soundHorizonMassiveNu } from '../js/kernels/cosmology/bao/formulas.js';

const [fuPath, parentPath, parentResultsPath, oraclePath, authDir, outDir] = process.argv.slice(2);
const T0 = Date.now();
const fuBytes = readFileSync(fuPath);
const FU = JSON.parse(fuBytes);
const PARENT = JSON.parse(readFileSync(parentPath));
const PR = JSON.parse(readFileSync(parentResultsPath));
const oracleBytes = readFileSync(oraclePath);
const O = JSON.parse(oracleBytes);
const sha = b => createHash('sha256').update(b).digest('hex');
const auth = f => readFileSync(join(authDir, f));
const jauth = f => JSON.parse(auth(f));

const rows = [];
const row = (id, status, measured, bound, note) => rows.push({ id, status, measured, bound, ...(note ? { note } : {}) });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const maxOf = xs => xs.reduce((m, v) => Math.max(m, v), 0);
const checkOf = id => FU.checks.find(c => c.id === id);
const AG = FU.conventions.agreement;
const G = FU.conventions.constants.G_SI;
const consts = FU.conventions.constants;

const FF = jauth('fitting-formulas.json').coefficients;
const F = createFormulas(FF);
const PL = jauth('planck-table1.json').values;
const pnum = k => Number(PL[k]);
const w0P = pnum('omegaB') + pnum('omegaC');

// ------------------------------------------------------------------ the 23-node grid: F2, F5, F6
const GRID = [];
for (let k = 0; k < 6; k++) {
  const w0 = 0.025 * Math.pow(20, k / 5);
  for (let j = 0; j < 4; j++) {
    const wb = 0.0125 + ((0.03 - 0.0125) * j) / 3;
    if (wb < w0) GRID.push([w0, wb]);
  }
}
const HALF = { aR: halfUnit(FF['R.a'].token), mz: halfUnit(FF['zeq.mantissa'].token), mk: halfUnit(FF['keq.mantissa'].token) };
const nodes = [];
let refused = 0;
for (const [w0, wb] of GRID) {
  try {
    const zd = F.zd(w0, wb);
    const r = paperIntegral(w0, wb, zd, G, consts.Tcmb_ehPaper);
    const s26 = F.s26(w0, wb);
    const s6 = F.s6(w0, wb, zd);
    let u = 0;
    for (const [key, c] of [['aR', F.V('R.a')], ['mz', F.V('zeq.mantissa')], ['mk', F.V('keq.mantissa')]]) {
      const h = 1e-4;
      const up = F.s6(w0, wb, zd, { [key]: c * (1 + h) }).value;
      const dn = F.s6(w0, wb, zd, { [key]: c * (1 - h) }).value;
      u += (Math.abs(Math.log(up) - Math.log(dn)) / (2 * h)) * (HALF[key] / c);
    }
    u += 1 / s6.zeq;
    nodes.push({ w0, wb, zd, integral: r, s26, s6: s6.value, errS26: Math.abs(s26 / r - 1), errS6: Math.abs(s6.value / r - 1), u });
  } catch (e) {
    refused++;
    nodes.push({ w0, wb, refused: e.code ?? String(e) });
  }
}
const okNodes = nodes.filter(n => !n.refused);
const oG = O.grid;

// ------------------------------------------------------------------ F: the formulas
{
  const zd = F.zd(w0P, pnum('omegaB'));
  const rdPrinted = pnum('rdrag');
  const s26P = F.s26(w0P, pnum('omegaB'));
  const s6P = F.s6(w0P, pnum('omegaB'), zd).value;
  const zdDiff = zd / pnum('zdrag') - 1;
  row('F1.zdFormula', 'fail', { zdEq4: zd, zdPrinted: pnum('zdrag'), relative: zdDiff, inUnitsOfPrintedSigma: (zd - pnum('zdrag')) / Number(PL.zdragSigma), statedAccuracy: null }, checkOf('F1.zdFormula').bound,
    'AM3: the source states no accuracy for equation (4); the committed threshold is unmeasurable and fails by the committed rule');
  row('F1b.zdDesign', Math.abs(zdDiff) <= 0.02 ? 'pass' : 'fail', { zdEq4: zd, zdPrinted: pnum('zdrag'), relative: zdDiff, inUnitsOfPrintedSigma: (zd - pnum('zdrag')) / Number(PL.zdragSigma) }, '|relative| <= 0.02 (design)');

  const maxErr = maxOf(okNodes.map(n => n.errS26));
  const worst = okNodes.reduce((a, b) => (b.errS26 > a.errS26 ? b : a));
  row('F2.rdFormulaVsIntegral', refused === 0 && maxErr <= 0.02 ? 'pass' : 'fail',
    { nodes: nodes.length, refused, maxRelative: maxErr, worstNode: { omega0: worst.w0, omegaB: worst.wb, zd: worst.zd }, nodesOver2Percent: okNodes.filter(n => n.errS26 > 0.02).length, neutrinoTerm: 0 }, '<= 0.02 at every node');

  const s26Rel = Math.abs(s26P / rdPrinted - 1);
  const tolF3 = 0.02 + 0.5 * unitOf(PL.rdrag) / rdPrinted;
  row('F3.rdFormulaVsPublished', s26Rel <= tolF3 ? 'pass' : 'fail', { s26: s26P, rdragPrinted: rdPrinted, relative: s26Rel, bound: tolF3, omega0: w0P }, `<= ${tolF3}`);

  const outside = [[0.02475, 0.0224], [0.0125, 0.0224], [0.0025, 0.0224], [0.505, 0.0224], [1.0, 0.0224], [5.0, 0.0224], [0.14, 0.012375], [0.14, 0.00625], [0.14, 0.00125], [0.14, 0.0303], [0.14, 0.06], [0.14, 0.3]];
  const inside = [[0.025, 0.0125], [0.5, 0.03], [0.14, 0.0224]];
  const expected = ['omega0-below-domain', 'omega0-below-domain', 'omega0-below-domain', 'omega0-above-domain', 'omega0-above-domain', 'omega0-above-domain', 'omegab-below-domain', 'omegab-below-domain', 'omegab-below-domain', 'omegab-above-domain', 'omegab-above-domain', 'omegab-above-domain'];
  const tryZd = (a, b) => {
    try {
      const v = F.zd(a, b);
      const s = F.s26(a, b);
      return Number.isFinite(v) && Number.isFinite(s) ? 'accepted' : 'non-finite';
    } catch (e) {
      return e.code ?? String(e);
    }
  };
  const gotOut = outside.map(([a, b]) => tryZd(a, b));
  const gotIn = inside.map(([a, b]) => tryZd(a, b));
  const protoOut = gotOut.filter((c, i) => c === expected[i]).length;
  const protoIn = gotIn.filter(c => c === 'accepted').length;
  const orOut = O.domain.outside.filter((x, i) => x.code === expected[i]).length;
  const orIn = O.domain.inside.filter(x => x.code === null).length;
  row('F4.formulaDomain', protoOut === 12 && protoIn === 3 && orOut === 12 && orIn === 3 ? 'pass' : 'fail', { prototype: { refusedAsExpected: protoOut, accepted: protoIn }, oracle: { refusedAsExpected: orOut, accepted: orIn }, codes: gotOut }, '12 of 12 refused with the expected code, 3 of 3 accepted, both');

  // F5: the oracle's error, and agreement
  const agreeS26 = maxOf(nodes.map((n, i) => (n.refused ? Infinity : rel(n.s26, oG[i].s26))));
  const agreeInt = maxOf(nodes.map((n, i) => (n.refused ? Infinity : rel(n.integral, oG[i].integral))));
  const agreeZd = maxOf(nodes.map((n, i) => (n.refused ? Infinity : rel(n.zd, oG[i].zd))));
  row('F5.statedError', O.gridMaxErrS26 <= 0.02 && agreeS26 <= AG.formulaValue && agreeInt <= AG.distanceOrIntegral ? 'pass' : 'fail',
    { oracleMaxRelative: O.gridMaxErrS26, prototypeMaxRelative: maxErr, s26Agreement: agreeS26, integralAgreement: agreeInt, zdAgreement: agreeZd }, '<= 0.02; 1e-12; 1e-9');

  // F6
  const within = okNodes.every(n => n.errS6 <= n.u) && refused === 0;
  const oWithin = O.gridS6AllWithinU;
  const agreeS6 = maxOf(nodes.map((n, i) => (n.refused ? Infinity : rel(n.s6, oG[i].s6))));
  row('F6.eq6VsIntegral', within && oWithin && agreeS6 <= AG.formulaValue ? 'pass' : 'fail',
    { prototypeWorstOverU: maxOf(okNodes.map(n => n.errS6 / n.u)), oracleWorstOverU: O.gridWorstS6OverU, maxRelativeError: maxOf(okNodes.map(n => n.errS6)), s6Agreement: agreeS6 }, 'every node within u');

  row('P2.plankZdrag', 'fail', { zdEq4: zd, zdPrinted: pnum('zdrag'), relative: zdDiff, statedAccuracy: null }, checkOf('P2.plankZdrag').bound, 'AM3: as F1');

  // X8
  const iAt = paperIntegral(w0P, pnum('omegaB'), zd, G, consts.Tcmb_ehPaper);
  row('X8.reportedFormulaValues', 'reported', { zdEq4: zd, s26: s26P, s6: s6P, integralPaperModelAtEq4Zd: iAt, rdragPrinted: rdPrinted, zdragPrinted: pnum('zdrag'),
    oracleAgreement: { zd: rel(zd, O.planckFormulas.zdEq4), s26: rel(s26P, O.planckFormulas.s26), s6: rel(s6P, O.planckFormulas.s6), integral: rel(iAt, O.planckFormulas.integralPaperModelAtEq4Zd) } }, 'REPORTED');
}

// ------------------------------------------------------------------ P1c
{
  const base = { wb: pnum('omegaB'), wc: pnum('omegaC'), H0: pnum('H0'), zd: pnum('zdrag'), mnuEv: pnum('neutrinoMassEv'), T: consts.Tcmb0_planckRow, Neff: consts.Neff_standard, G };
  const r0 = soundHorizonMassiveNu(base).value;
  const keys = [['wb', 'omegaB'], ['wc', 'omegaC'], ['H0', 'H0'], ['zd', 'zdrag']];
  let prop = 0;
  for (const [nm, key] of keys) {
    const x = base[nm];
    const up = soundHorizonMassiveNu({ ...base, [nm]: x * (1 + 1e-4) }).value;
    const dn = soundHorizonMassiveNu({ ...base, [nm]: x * (1 - 1e-4) }).value;
    const d = Math.abs(up - dn) / (2 * x * 1e-4);
    prop += d * (halfUnit(PL[key]) + (nm === 'zd' ? Number(PL.zdragSigma) : 0));
  }
  const u = unitOf(PL.rdrag) + prop;
  const r = pnum('rdrag');
  const agree = rel(r0, O.p1c.rP1c);
  row('P1c.plankMassiveNu', Math.abs(r - r0) <= u && agree <= AG.distanceOrIntegral ? 'pass' : 'fail',
    { rdragPrinted: r, rP1c: r0, u, difference: r - r0, differenceOverU: (r - r0) / u, oracleRP1c: O.p1c.rP1c, oracleU: O.p1c.u, agreement: agree, notBlind: true }, '|printed - r_P1c| <= u; agreement 1e-9');
}

// ------------------------------------------------------------------ E6: the calibration of the poor-fit flag
{
  const SE = PARENT.syntheticEnsemble;
  const THETA = SE.truth.theta;
  const zs = SE.redshifts;
  const DRAWS = FU.seeds.E6.draws;
  const Fo = createFriedmann({ H0: 100, Om: 0.3, Or: 0, Ode: 0 });
  const misMean = zs.flatMap(z => [(THETA * Fo.transverseComovingDistance(z) * 100) / C_KMS, THETA / Fo.E(z)]);
  const flatMean = bao.basisFlat(SE.truth.Om, zs).map(v => THETA * v);
  const q = brent(x => gammaQ(2, x / 2) - 0.0027, 5, 40, { xTol: 1e-13 }).x;
  const ncx2sf = (x, k, lam) => {
    // sum_j Poisson(j; lam/2) Q((k + 2j)/2, x/2)
    const m = lam / 2;
    let w = Math.exp(-m);
    let s = 0;
    const jmax = Math.ceil(m + 12 * Math.sqrt(m + 1) + 40);
    for (let j = 0; j <= jmax; j++) {
      if (j > 0) w *= m / j;
      s += w * gammaQ(k / 2 + j, x / 2);
    }
    return s;
  };
  const run = (mean, label) => {
    const cov = bao.designCovariance(mean, mean.map(() => 0.01));
    const prof = bao.createProfile({ zs, covariance: cov });
    const lam = Math.min(...prof.chi2Nodes(mean).ch);
    const e = bao.runEnsemble(prof, mean, cov, gaussian(stream('noise', `257:bao:flagcal:${label}`)), DRAWS, SE.truth.Om);
    return { lambda: lam, observed: e.poorFitFraction };
  };
  const mis = run(misMean, 'misspecified');
  const nul = run(flatMean, 'null');
  const pPredMis = ncx2sf(q, 4, mis.lambda);
  const pPredNull = ncx2sf(q, 4, Math.max(nul.lambda, 0));
  const band = p => [Math.max(0, p - 3 * Math.sqrt((p * (1 - p)) / DRAWS)), p + 3 * Math.sqrt((p * (1 - p)) / DRAWS)];
  const inBand = (v, b) => v >= b[0] && v <= b[1];
  const bMis = band(O.e6.misfit.pPred);
  const bMisP = band(pPredMis);
  const bNull = band(0.0027);
  const a = inBand(mis.observed, bMisP) && inBand(O.e6.misfit.observed, bMis);
  const b = inBand(nul.observed, bNull) && inBand(O.e6.noMisfit.observed, bNull);
  const c = rel(mis.lambda, O.e6.misfit.lambda_) <= 1e-9 && rel(pPredMis, O.e6.misfit.pPred) <= 1e-9 && Math.abs(nul.lambda - O.e6.noMisfit.lambda_) <= 1e-9 && rel(pPredNull, O.e6.nullPPred) <= 1e-9;
  row('E6.flagCalibration', a && b && c ? 'pass' : 'fail',
    { draws: DRAWS, q, misfit: { lambdaPrototype: mis.lambda, lambdaOracle: O.e6.misfit.lambda_, pPredPrototype: pPredMis, pPredOracle: O.e6.misfit.pPred, observedPrototype: mis.observed, observedOracle: O.e6.misfit.observed, bandPrototype: bMisP, bandOracle: bMis },
      noMisfit: { lambdaPrototype: nul.lambda, lambdaOracle: O.e6.noMisfit.lambda_, observedPrototype: nul.observed, observedOracle: O.e6.noMisfit.observed, band: bNull, pPredNullPrototype: pPredNull },
      parts: { a, b, c } }, '(a), (b) and (c)');
}

// ------------------------------------------------------------------ O: the release
{
  const RES_B = auth('BAO_consensus_results_dM_Hz.txt');
  const COV_B = auth('BAO_consensus_covtot_dM_Hz.txt');
  const REL = jauth('published-release.json');
  const vals = [];
  const zsR = [];
  const labels = [];
  for (const ln of RES_B.toString('utf8').split('\n')) {
    if (!ln.trim() || ln.startsWith('#')) continue;
    const [z, lab, v] = ln.trim().split(/\s+/);
    zsR.push(Number(z));
    labels.push(lab);
    vals.push(Number(v));
  }
  const Cr = COV_B.toString('utf8').split('\n').filter(l => l.trim()).map(l => l.trim().split(/\s+/).map(Number));
  const n = vals.length;
  let big = 0;
  let asym = 0;
  for (let i = 0; i < Cr.length; i++) for (let j = 0; j < Cr.length; j++) {
    big = Math.max(big, Math.abs(Cr[i][j]));
    asym = Math.max(asym, Math.abs(Cr[i][j] - Cr[j][i]));
  }
  const zeff = [...new Set(zsR)].sort((a, b) => a - b);
  const orderOk = labels.join() === ['dM(rsfid/rs)', 'Hz(rs/rsfid)', 'dM(rsfid/rs)', 'Hz(rs/rsfid)', 'dM(rsfid/rs)', 'Hz(rs/rsfid)'].join() && zsR.join() === zeff.flatMap(z => [z, z]).join();
  const dfiles = FU.inputs.dataFiles;
  const shaOk = sha(RES_B) === dfiles.results.sha256 && sha(COV_B) === dfiles.covariance.sha256;
  const bytesOk = RES_B.length === dfiles.results.bytes && COV_B.length === dfiles.covariance.bytes;
  const pd = cholesky(Cr) !== null;
  const eig = Math.min(...eigenSymmetric(Cr).map(e => e.value));
  const o1 = shaOk && bytesOk && asym <= 1e-9 * big && pd && Cr.length === 6 && n === 6 && zeff.length === 3 && orderOk && O.o1.shaOk && O.o1.cholesky && O.o1.orderOk && O.o1.dimension === 6;
  row('O1.tableIntegrity', o1 ? 'pass' : 'fail', { shaOk, bytesOk, asymmetry: asym / big, cholesky: pd, minEigenvalue: eig, dimension: Cr.length, ratios: n, redshifts: zeff, orderOk, oracle: { shaOk: O.o1.shaOk, cholesky: O.o1.cholesky, dimension: O.o1.dimension, orderOk: O.o1.orderOk } }, 'as stated');

  // O1b
  const pr = REL.measurements_BAO_only_consensus.printed_Table7_rounded;
  const mi = [];
  const sg = [];
  for (let k = 0; k < 3; k++) {
    for (const [pstr, idx] of [[pr.DM[k], 2 * k], [pr.H[k], 2 * k + 1]]) {
      const m = /^([0-9.]+)±([0-9.]+)±([0-9.]+)$/.exec(pstr);
      const cen = m[1];
      const s = Number(m[2]);
      const t = Number(m[3]);
      const un = unitOf(cen);
      mi.push(Math.abs(Math.round(vals[idx] / un) * un - Number(cen)) < un * 1e-6);
      const lo = Math.sqrt((s - 0.5 * un) ** 2 + (t - 0.5 * un) ** 2);
      const hi = Math.sqrt((s + 0.5 * un) ** 2 + (t + 0.5 * un) ** 2);
      const sd = Math.sqrt(Cr[idx][idx]);
      sg.push(sd >= lo && sd <= hi);
    }
  }
  const o1b = mi.every(Boolean) && sg.every(Boolean) && O.o1b.valuesMatchPrinted.every(Boolean) && O.o1b.sigmaInRange.every(Boolean);
  row('O1b.printedConsistency', o1b ? 'pass' : 'fail', { valuesMatchPrinted: mi, sigmaInRange: sg, oracle: O.o1b }, 'as stated');

  row('O2.printedFit', 'not-run', null, checkOf('O2.printedFit').bound, 'AM4: the paper prints no BAO-alone flat Lambda-CDM matter density (Table 10 has no row for BAO alone)');
  row('O3.fiducialRescale', 'not-run', null, checkOf('O3.fiducialRescale').bound, 'AM4: the paper prints no alphas for the consensus, only D_M and H (Table 7)');

  // O2b
  const RDF = REL.fiducial.rd_fid_Mpc;
  const d = [];
  const Jd = Array.from({ length: 6 }, () => new Array(6).fill(0));
  for (let k = 0; k < 3; k++) {
    d.push(vals[2 * k] / RDF, C_KMS / (vals[2 * k + 1] * RDF));
    Jd[2 * k][2 * k] = 1 / RDF;
    Jd[2 * k + 1][2 * k + 1] = -C_KMS / (vals[2 * k + 1] ** 2 * RDF);
  }
  const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, i) => s + v * B[i][j], 0)));
  const tr = M => M[0].map((_, j) => M.map(r => r[j]));
  const Cd = matmul(matmul(Jd, Cr), tr(Jd));
  const prof = bao.createProfile({ zs: zeff, covariance: Cd });
  const fit = prof.fit(d);
  const A = jauth('alam-printed.json').entries;
  const omPC = A['table10.planckPlusBao.omegaM'].value;
  const omP = A['table10.planck.omegaM'].value;
  const d309 = prof.chi2At(d, omPC) - fit.chi2min;
  const d317 = prof.chi2At(d, omP) - fit.chi2min;
  const oo = O.o2b;
  const agree = Math.abs(fit.bestOm - oo.bestOm) <= 1e-8 && rel(fit.chi2min, oo.chi2min) <= AG.chi2 &&
    ['lo68', 'hi68', 'lo95', 'hi95'].every(k => (fit[k] === null) === (oo[k] === null) && (fit[k] === null || Math.abs(fit[k] - oo[k]) <= AG.interval));
  const o2b = d309 <= 4 && d317 <= 4 && fit.p >= 0.0027 && oo.dChi2At0309 <= 4 && oo.dChi2At0317 <= 4 && oo.p >= 0.0027 && agree;
  row('O2b.bandConsistency', o2b ? 'pass' : 'fail', { bestOm: fit.bestOm, interval68: [fit.lo68, fit.hi68], interval95: [fit.lo95, fit.hi95], chi2min: fit.chi2min, p: fit.p, theta: fit.theta, H0rd_kms: C_KMS / fit.theta,
    dChi2At0309: d309, dChi2At0317: d317, printed: { planckPlusBao: omPC, planck: omP }, oracle: { bestOm: oo.bestOm, interval95: [oo.lo95, oo.hi95], chi2min: oo.chi2min, dChi2At0309: oo.dChi2At0309, dChi2At0317: oo.dChi2At0317, p: oo.p }, agreement: agree }, 'as stated');

  row('X6.reportedNonlinearProfile', 'reported', { oracleOnly: O.x6, deltaMethodPrototype: { bestOm: fit.bestOm, interval68: [fit.lo68, fit.hi68], interval95: [fit.lo95, fit.hi95], chi2min: fit.chi2min } }, 'REPORTED');

  // O3b
  const h = REL.fiducial.h;
  const rad = bao.radiation({ T: consts.Tcmb0_planckRow, Neff: consts.Neff_standard, G });
  const fidOf = Or => {
    const Fd = createFriedmann({ H0: h * 100, Om: REL.fiducial.Om, Or });
    return zeff.flatMap(z => [Fd.transverseComovingDistance(z), Fd.hubbleParameter(z)]);
  };
  const fid = fidOf(rad.omegaRad / (h * h));
  const fid0 = fidOf(0);
  const res = vals.map((v, i) => v - fid[i]);
  const Ci = invertSpd(Cr);
  const chi2j = res.reduce((s, ri, i) => s + ri * Ci[i].reduce((t, c, j) => t + c * res[j], 0), 0);
  const pj = gammaQ(3, chi2j / 2);
  const within3 = res.map((r, i) => Math.abs(r) <= 3 * Math.sqrt(Cr[i][i]));
  const fidAgree = maxOf(fid.map((v, i) => rel(v, O.o3b.fiducial[i])));
  const o3b = within3.every(Boolean) && pj >= 0.0027 && fidAgree <= AG.distanceOrIntegral && O.o3b.componentsWithin3.every(Boolean) && O.o3b.p >= 0.0027;
  row('O3b.fiducialAlphas', o3b ? 'pass' : 'fail', { fiducial: fid, alpha: vals.map((v, i) => v / fid[i]), residualOverSigma: res.map((r, i) => r / Math.sqrt(Cr[i][i])), chi2: chi2j, p: pj, componentsWithin3: within3, fiducialAgreementWithOracle: fidAgree, oracleChi2: O.o3b.chi2 }, 'as stated');
  row('X7.reportedAlphaWithoutRadiation', 'reported', { alphaWithoutRadiation: vals.map((v, i) => v / fid0[i]), largestChange: maxOf(vals.map((v, i) => Math.abs(fid[i] / fid0[i] - 1))), oracleLargestChange: O.x7.largestAlphaChange }, 'REPORTED');
}

// ------------------------------------------------------------------ order, counts and the verdict
const order = FU.checks.map(c => c.id);
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
for (const id of order) if (!byId[id]) throw new Error(`no row for ${id}`);
const out = order.map(id => byId[id]);
const counts = {};
for (const r of out) counts[r.status] = (counts[r.status] ?? 0) + 1;

// the parent's function over the parent's rows with this follow-up's statuses for F1-F5, P2, O1-O3
const pRows = Object.fromEntries(PR.rows.map(r => [r.id, { ...r }]));
for (const id of ['F1.zdFormula', 'F2.rdFormulaVsIntegral', 'F3.rdFormulaVsPublished', 'F4.formulaDomain', 'F5.statedError', 'P2.plankZdrag', 'O1.tableIntegrity', 'O2.printedFit', 'O3.fiducialRescale'])
  pRows[id] = { ...pRows[id], status: byId[id].status };
const grp = g => PARENT.checks.filter(c => c.group === g).map(c => pRows[c.id]);
const verdictOf = rowsK => {
  const p1b = pRows['P1b.plankRdragT2'];
  const detectable = pRows['D6.detectable'].status === 'pass';
  const demo = ['D1.stream', 'D2.counts', 'D3.estimator', 'D4.jackknife', 'D5.nullEnsemble'].map(id => pRows[id]);
  const kernel = rowsK.every(r => r.status === 'pass') && ['pass', 'not-run'].includes(p1b.status) && (!detectable || demo.every(r => r.status === 'pass'));
  const f = grp('formula');
  const o = grp('observable');
  if (!kernel) return 'C';
  if (f.some(r => r.status === 'fail')) return 'C';
  if (f.some(r => r.status === 'not-run')) return 'NOT ESTABLISHED';
  return o.every(r => r.status === 'pass') ? 'A' : 'B';
};
const kernelRows = ['integrity', 'ruler', 'ensemble', 'combination', 'refusals'].flatMap(grp);
const product = verdictOf(kernelRows);
const e5Reset = kernelRows.map(r => (r.id === 'E5.misspecified' ? { ...r, status: 'pass' } : r));
const conditionalIfE5Reset = verdictOf(e5Reset);
const savedF1 = pRows['F1.zdFormula'].status;
const savedP2 = pRows['P2.plankZdrag'].status;
pRows['F1.zdFormula'].status = 'not-run';
pRows['P2.plankZdrag'].status = 'not-run';
const conditionalIfE5ResetAndF1NotRun = verdictOf(e5Reset);
pRows['F1.zdFormula'].status = savedF1;
pRows['P2.plankZdrag'].status = savedP2;

const result = {
  format: 'gravitas.bao-followup-results/1',
  thresholdsFollowupSha256: sha(fuBytes),
  parentThresholdsSha256: sha(readFileSync(parentPath)),
  parentResultsSha256: sha(readFileSync(parentResultsPath)),
  oracleSha256: sha(oracleBytes),
  node: process.version,
  seconds: Math.round((Date.now() - T0) / 100) / 10,
  counts: { rows: out.length, ...counts },
  verdict: { product, kernel: kernelRows.every(r => r.status === 'pass') ? 'KERNEL PASS' : 'KERNEL FAIL', conditionalIfE5Reset, conditionalIfE5ResetAndF1AndP2NotRun: conditionalIfE5ResetAndF1NotRun,
    failingKernelRows: kernelRows.filter(r => r.status !== 'pass').map(r => r.id), consumersClause: product === 'A' || product === 'B' ? 'met' : 'unmet' },
  rows: out,
};
writeFileSync(join(outDir, 'results-followup.json'), JSON.stringify(result, null, 1) + '\n');
const failed = out.filter(r => r.status === 'fail').map(r => ({ id: r.id, measured: r.measured, bound: r.bound, note: r.note ?? null }));
writeFileSync(join(outDir, 'failed-legs-followup.json'), JSON.stringify({ format: 'gravitas.bao-followup-failed-legs/1', note: 'every follow-up row that crossed its committed bound (or was decided failing by the committed rule), left failing', failed }, null, 1) + '\n');
console.log(JSON.stringify({ counts: result.counts, verdict: result.verdict }, null, 1));
for (const r of out) console.log(r.status.padEnd(9), r.id);
