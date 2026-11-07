// The gate stream of Prompt 259 Part A (spike only; never merged).
// node tools/growth-validate.mjs <thresholds.json> <oracle-results.json> <planck-best-fit.json> <eh98-formulas.json> <sources.json> <out-results.json> <out-failed.json>
// Judges every leg of thresholds.json against its committed bound. Nothing is tuned; a failed leg stays failed.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  solveGrowth,
  cptGrowthFit,
  omegaMatter,
  transferZeroBaryon,
  makeTransfer,
  makeSigma,
  varianceIntegral,
  checkGrowthParameters,
  jeansWavenumber,
  jeansScaleFactor,
  checkJeans,
  GrowthDomainError,
} from '../js/kernels/cosmology/growth/growth.js';

const [thrP, oraP, plkP, ehP, srcP, outP, failP] = process.argv.slice(2);
const thrBytes = readFileSync(thrP);
const thr = JSON.parse(thrBytes);
const ora = JSON.parse(readFileSync(oraP));
const plk = JSON.parse(readFileSync(plkP));
const eh = JSON.parse(readFileSync(ehP));
const src = JSON.parse(readFileSync(srcP));
const sha = b => createHash('sha256').update(b).digest('hex');
const TOL = thr.tolerance;
const GRID = ora.grid.a;
const SETS = Object.fromEntries(thr.parameterSets.growth.map(s => [s.id, s]));
const rows = [];
const push = (id, status, measured, extra = {}) => {
  const leg = thr.checks.find(c => c.id === id);
  rows.push({ id, group: leg.group, status, bound: leg.bound, measured, ...extra });
};
const relMax = (x, y) => Math.max(...x.map((v, i) => Math.abs(v / y[i] - 1)));
const absMax = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
const nan = v => (v === 'NaN' ? NaN : v);
const fix = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, nan(v)]));

// ------------------------------------------------------------- integrity
{
  const thrSha = sha(thrBytes);
  const sameInputs = ora.thresholdsSha256 === thrSha;
  push('I2.inputs', sameInputs ? 'pass' : 'fail', { thresholdsSha256: thrSha, oracleRecorded: ora.thresholdsSha256 });
  const srcOk = eh.source.savedTextSha256 === src.sources[0].savedTextSha256 && plk.source.savedTextSha256 === src.sources[1].savedTextSha256;
  const SAVED = process.env.GROWTH_EH98_TEXT;
  let tokens = { checked: 0, found: 0, textPresent: false, textSha256Equal: null };
  if (SAVED && existsSync(SAVED)) {
    const raw = readFileSync(SAVED);
    tokens.textPresent = true;
    tokens.textSha256Equal = sha(raw) === eh.source.savedTextSha256;
    const lines = raw.toString('utf8').split('\n').map(l => l.normalize('NFKC'));
    for (const e of Object.values(eh.equations))
      for (const t of e.tokens) {
        tokens.checked++;
        if (lines[t.line - 1] && lines[t.line - 1].includes(t.token)) tokens.found++;
      }
  }
  const ok = srcOk && tokens.textPresent && tokens.textSha256Equal && tokens.checked === tokens.found && tokens.checked > 0;
  push('I1.sources', ok ? 'pass' : 'fail', { recordsAgree: srcOk, ...tokens });
}

// ------------------------------------------------------------ closed forms
const kernel = {};
const t0 = performance.now();
for (const s of thr.parameterSets.growth) kernel[s.id] = solveGrowth({ Om: s.Om, Ode: s.Ode, w: s.w }, GRID);
const msGrowth = (performance.now() - t0) / thr.parameterSets.growth.length;
{
  const r = kernel.S1;
  const mD = relMax(r.D, ora.closedForms.eds.D);
  const mF = absMax(r.f, ora.closedForms.eds.f);
  push('G1.eds', mD <= TOL.closedForm && mF <= TOL.closedForm ? 'pass' : 'fail', { maxRelD: mD, maxAbsF: mF });
}
function closedLeg(id, entries) {
  let mD = 0;
  let mF = 0;
  const per = {};
  for (const [name, params, cf] of entries) {
    const r = solveGrowth({ ...params, w: -1 }, GRID);
    const d = relMax(r.D, cf.D);
    const f = absMax(r.f, cf.f);
    per[name] = { maxRelD: d, maxAbsF: f };
    mD = Math.max(mD, d);
    mF = Math.max(mF, f);
  }
  push(id, mD <= TOL.closedForm && mF <= TOL.closedForm ? 'pass' : 'fail', { maxRelD: mD, maxAbsF: mF, per });
}
closedLeg('G2.openMatterOnly', Object.entries(ora.closedForms.open).map(([om, cf]) => [om, { Om: Number(om), Ode: 0 }, cf]));
closedLeg('G3.flatLambda', Object.entries(ora.closedForms.flat).map(([om, cf]) => [om, { Om: Number(om), Ode: 1 - Number(om) }, cf]));
closedLeg('G4.heathCurved', Object.entries(ora.closedForms.heath).map(([name, cf]) => [name, { Om: cf.Om, Ode: cf.Ode }, cf]));

// ------------------------------------------------------------------ oracle
{
  let mD = 0;
  let mF = 0;
  let pts = 0;
  let covered = 0;
  const per = {};
  for (const s of thr.parameterSets.growth) {
    const k = kernel[s.id];
    const o = ora.growth[s.id];
    const d = relMax(k.D, o.D);
    const f = absMax(k.f, o.f);
    per[s.id] = { maxRelD: d, maxAbsF: f, carriedErrorMax: Math.max(...k.error), steps: k.steps };
    mD = Math.max(mD, d);
    mF = Math.max(mF, f);
    k.D.forEach((v, i) => {
      pts++;
      if (Math.abs(v / o.D[i] - 1) <= TOL.errorEstimateFactor * k.error[i] + TOL.errorEstimateFloor) covered++;
    });
  }
  push('O1.dop853', mD <= TOL.oracle && mF <= TOL.oracle ? 'pass' : 'fail', { maxRelD: mD, maxAbsF: mF, per });
  push('O2.errorCoverage', covered === pts ? 'pass' : 'fail', { points: pts, covered, fraction: covered / pts });
}

// ------------------------------------------------------------------- cited
{
  let worst = 0;
  let identity = 0;
  const per = {};
  for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']) {
    const s = SETS[id];
    const fit = GRID.map(a => cptGrowthFit(s, a));
    const d = relMax(fit, kernel[id].D);
    per[id] = d;
    worst = Math.max(worst, d);
    identity = Math.max(identity, relMax(fit, ora.cptFit[id]));
  }
  push('C1.cptFit', worst <= TOL.cptFit ? 'pass' : 'fail', { maxRelativeDeviation: worst, perSet: per, fitVsOracleImplementation: identity });
  push('C2.publishedTable', 'not-run', { request: 'C2' });
  push('C3.citedCode', 'not-run', { request: 'C3' });
}

// ------------------------------------------------------------------- power
const shapeSets = thr.parameterSets.shape;
{
  const m = Math.max(...ora.shape.q.map((q, i) => Math.abs(transferZeroBaryon(q) / ora.shape.T0[i] - 1)));
  push('P1.zeroBaryon', m <= TOL.transferZeroBaryon ? 'pass' : 'fail', { maxRelative: m, points: ora.shape.q.length });
}
{
  let m = 0;
  for (const t of shapeSets) {
    const T = makeTransfer(t);
    m = Math.max(m, Math.max(...ora.shape.k.map((k, i) => Math.abs(T(k) / ora.shape.T[t.id][i] - 1))));
  }
  push('P2.effectiveShape', m <= TOL.transferShape ? 'pass' : 'fail', { maxRelative: m });
}
{
  const out = {};
  let m = 0;
  for (const [R, v] of Object.entries(ora.sigmaPowerLaw)) {
    const r = varianceIntegral(Number(R), k => k / (2 * Math.PI ** 2), { kmin: 1e-9, kmax: 1e4 });
    const d = Math.abs(r.value / v.closedForm - 1);
    out[R] = { relative: d, converged: r.converged };
    m = Math.max(m, d);
  }
  push('P3.sigmaPowerLaw', m <= TOL.sigmaPowerLaw ? 'pass' : 'fail', { maxRelative: m, perRadius: out });
}
let tSigma = 0;
{
  let m = 0;
  const per = {};
  for (const t of shapeSets) {
    const t1 = performance.now();
    const sigma = makeSigma({ Om: t.Om, Ob: t.Ob, h: t.h, ns: 1, sigma8: 0.8 });
    tSigma = Math.max(tSigma, performance.now() - t1);
    per[t.id] = {};
    for (const R of [1, 8, 30, 100]) {
      const d = Math.abs(sigma(R) / ora.shape.sigma[t.id][String(R).includes('.') ? String(R) : R.toFixed(1)] - 1);
      per[t.id][R] = d;
      m = Math.max(m, d);
    }
  }
  push('P4.sigmaOracle', m <= TOL.sigmaOracle ? 'pass' : 'fail', { maxRelative: m, perSet: per });
}
{
  const t = shapeSets[0];
  const sigma = makeSigma({ Om: t.Om, Ob: t.Ob, h: t.h, ns: 1, sigma8: 0.8 });
  const norm = Math.abs(sigma(8) / 0.8 - 1);
  const D = kernel.S4.D;
  const D1 = D[D.length - 1];
  let sc = 0;
  const s1 = sigma(8, 1);
  D.forEach(d => {
    sc = Math.max(sc, Math.abs(sigma(8, d / D1) / s1 / (d / D1) - 1));
  });
  push('P5.normalisation', norm <= TOL.normalisation && sc <= TOL.scaling ? 'pass' : 'fail', { normalisationRelative: norm, scalingRelative: sc });
  push('P6.numericalTransfer', 'not-run', { request: 'P6' });
}

// --------------------------------------------------------------- authentic
{
  const v = Object.fromEntries(Object.entries(plk.values).map(([k, x]) => [k, Number(x)]));
  const h = v.H0 / 100;
  const Om = (v.omegaBh2 + v.omegaCh2) / (h * h);
  const Ob = v.omegaBh2 / (h * h);
  const D1 = solveGrowth({ Om, Ode: 1 - Om, w: -1 }, [1]).D[0];
  const T = makeTransfer({ Om, Ob, h, ns: v.ns, sigma8: 0.8 });
  const As = Math.exp(v.lnAs1e10) * 1e-10;
  const k0 = v.k0PerMpc / h;
  const d2 = k => (4 / 25) * (2997.92458 * k) ** 4 / (Om * Om) * D1 * D1 * T(k) ** 2 * As * (k / k0) ** (v.ns - 1);
  const s8 = Math.sqrt(varianceIntegral(8, d2).value);
  const dev = s8 / v.sigma8 - 1;
  push('X1.planckSigma8', Math.abs(dev) <= TOL.planckSigma8 ? 'pass' : 'fail', {
    sigma8Model: s8,
    sigma8Printed: v.sigma8,
    relativeDeviation: dev,
    D1,
    Om,
    OmPrinted: v.Om,
    oracleSigma8Model: ora.planck.sigma8Model,
    kernelVsOracleModel: s8 / ora.planck.sigma8Model - 1,
  });
}

// ------------------------------------------------------------------- Jeans
{
  let m = 0;
  for (const id of ['S1', 'S4']) {
    const s = SETS[id];
    for (const [cs, arr] of Object.entries(ora.jeansWavenumber.values[id])) {
      const mine = GRID.map(a => jeansWavenumber({ Om: s.Om, Ode: s.Ode, w: s.w }, a, Number(cs), ora.jeansWavenumber.H0));
      m = Math.max(m, relMax(mine, arr));
    }
  }
  push('J1.jeansWavenumber', m <= TOL.jeansAlgebra ? 'pass' : 'fail', { maxRelative: m });
}
{
  let m = 0;
  const per = {};
  for (const id of ['S1', 'S4']) {
    const s = SETS[id];
    for (const [kap, o] of Object.entries(ora.jeansPressure[id])) {
      const r = solveGrowth({ Om: s.Om, Ode: s.Ode, w: s.w }, GRID, { pressure: { kappa: Number(kap) } });
      const sc = Math.max(...o.D.map(Math.abs));
      const scp = Math.max(...o.Dprime.map(Math.abs));
      const d = Math.max(absMax(r.D, o.D) / sc, absMax(r.dD, o.Dprime) / scp);
      per[`${id}/${kap}`] = d;
      m = Math.max(m, d);
    }
  }
  push('J2.pressureOde', m <= TOL.jeansOde ? 'pass' : 'fail', { maxRelativeToMax: m, perCase: per });
}
{
  let exact = true;
  for (const id of ['S1', 'S4']) {
    const s = SETS[id];
    const a = solveGrowth({ Om: s.Om, Ode: s.Ode, w: s.w }, GRID);
    const b = solveGrowth({ Om: s.Om, Ode: s.Ode, w: s.w }, GRID, { pressure: { kappa: 0 } });
    exact = exact && a.D.every((v, i) => v === b.D[i]) && a.f.every((v, i) => v === b.f[i]);
  }
  push('J3.zeroPressure', exact ? 'pass' : 'fail', { bitForBit: exact });
}
{
  let m = 0;
  const per = {};
  for (const [kap, a] of Object.entries(ora.jeansEdsCrossing)) {
    const root = jeansScaleFactor({ Om: 1, Ode: 0, w: -1 }, { cs: Number(kap), k: 1, H0: 1 });
    per[kap] = Math.abs(root / a - 1);
    m = Math.max(m, per[kap]);
  }
  push('J4.edsCrossing', m <= TOL.crossing ? 'pass' : 'fail', { maxRelative: m, perKappa: per });
}

// ---------------------------------------------------------------- refusals
const codeOf = fn => {
  try {
    const out = fn();
    return { code: null, value: out === undefined ? null : 'returned' };
  } catch (e) {
    if (e instanceof GrowthDomainError) return { code: e.code, value: null };
    return { code: 'unexpected:' + e.message, value: null };
  }
};
{
  const res = thr.refusals.growth.map(c => ({
    id: c.id,
    expected: c.code,
    got: codeOf(() => solveGrowth(fix(c.input), (c.a ?? [1]).map(nan))).code,
  }));
  push('R1.growthRefusals', res.every(r => r.expected === r.got) ? 'pass' : 'fail', { cases: res });
}
{
  let refused = 0;
  let total = 0;
  const first = [];
  for (let i = 0; i < 25; i++)
    for (let j = 0; j < 25; j++)
      for (let k = 0; k < 11; k++) {
        const p = { Om: 0.1 + (0.9 * i) / 24, Ode: (1.2 * j) / 24, w: -1.5 + k / 10 };
        total++;
        const r = codeOf(() => checkGrowthParameters(p));
        if (r.code) {
          refused++;
          if (first.length < 5) first.push({ ...p, code: r.code });
        }
      }
  push('R2.growthAccepted', refused === 0 ? 'pass' : 'fail', { sets: total, refused, firstRefused: first });
}
{
  const res = thr.refusals.shape.map(c => {
    const input = fix(c.input);
    let got;
    if (c.k !== undefined) got = codeOf(() => makeTransfer(input)(c.k)).code;
    else if (c.R !== undefined) got = codeOf(() => makeSigma(input)(c.R)).code;
    else got = codeOf(() => makeTransfer(input)).code;
    return { id: c.id, expected: c.code, got };
  });
  push('R3.shapeRefusals', res.every(r => r.expected === r.got) ? 'pass' : 'fail', { cases: res });
}
{
  const res = thr.refusals.jeans.map(c => ({ id: c.id, expected: c.code, got: codeOf(() => checkJeans(fix(c.input))).code }));
  push('R4.jeansRefusals', res.every(r => r.expected === r.got) ? 'pass' : 'fail', { cases: res });
}

// ------------------------------------------------------------- claim rule
{
  const A = ['sandbox', 'n-body', 'rescaled'];
  const B = ['structure formation', 'cosmological simulation', 'cosmic web', 'formacion de estructuras', 'simulacion cosmologica'];
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const files = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = d + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.js')) files.push(p);
    }
  };
  for (const f of readdirSync('js/i18n')) if (f.endsWith('.js')) files.push('js/i18n/' + f);
  walk('js/data');
  files.push('library/library.json');
  for (const f of readdirSync('.')) if (f.endsWith('.html')) files.push(f);
  const hits = [];
  for (const f of files) {
    const t = fold(readFileSync(f, 'utf8'));
    for (const b of B) {
      let i = t.indexOf(b);
      while (i >= 0) {
        const win = t.slice(Math.max(0, i - 300), i + b.length + 300);
        if (A.some(a => win.includes(a))) hits.push({ file: f, phrase: b });
        i = t.indexOf(b, i + 1);
      }
    }
  }
  push('Q1.claimRule', hits.length === 0 ? 'pass' : 'fail', { filesScanned: files.length, matches: hits.length, hits: hits.slice(0, 10) });
}

// ---------------------------------------------------------------- reported
{
  const out = {};
  for (const om of [0.25, 0.3, 0.35]) {
    const p = { Om: om, Ode: 1 - om, w: -1 };
    const idx = GRID.map((a, i) => i).filter(i => GRID[i] >= 0.3);
    const r = solveGrowth(p, idx.map(i => GRID[i]));
    let num = 0;
    let den = 0;
    r.f.forEach((f, i) => {
      const lo = Math.log(omegaMatter(p, r.a[i]));
      num += Math.log(f) * lo;
      den += lo * lo;
    });
    out[om] = num / den;
  }
  push('W1.growthIndex', 'reported', { gammaLeastSquares: out, comparison: 'NOT RUN (no published value in the saved texts)' });
  push('W2.radiation', 'reported', { oracle: ora.radiationSensitivity, kernelRefusesRadiation: codeOf(() => solveGrowth({ Om: 0.3, Ode: 0.69, w: -1, Or: 8.5e-5 }, [1])).code });
  push('W3.cpu', 'reported', { msPerGrowthSolve41Points: msGrowth, msPerSigmaNormalisation: tSigma, node: process.version });
  rows.push({ id: 'W4.imageryDecision', group: 'reported', status: 'omitted', bound: 'not applicable', measured: { imagery: 'none' } });
}

const count = s => rows.filter(r => r.status === s).length;
const failedKernel = rows.filter(r => r.status === 'fail' && r.id !== 'X1.planckSigma8').map(r => r.id);
const x1 = rows.find(r => r.id === 'X1.planckSigma8').status;
const verdict = failedKernel.length ? 'C' : x1 === 'pass' ? 'B' : 'B2';
const results = {
  format: 'gravitas.growth-results/1',
  thresholdsSha256: sha(thrBytes),
  oracleSha256: sha(readFileSync(oraP)),
  environment: { node: process.version, platform: process.platform },
  counts: { rows: rows.length, pass: count('pass'), fail: count('fail'), reported: count('reported'), notRun: count('not-run'), omitted: count('omitted') },
  kernel: failedKernel.length ? 'KERNEL FAIL' : 'KERNEL PASS',
  failedKernelLegs: failedKernel,
  verdict,
  rows,
};
writeFileSync(outP, JSON.stringify(results, null, 1) + '\n');
writeFileSync(
  failP,
  JSON.stringify({ format: 'gravitas.growth-failed-legs/1', note: 'Every failing row of results.json and nothing else; left failing.', legs: rows.filter(r => r.status === 'fail') }, null, 1) + '\n'
);
console.log(JSON.stringify({ counts: results.counts, kernel: results.kernel, verdict, failed: rows.filter(r => r.status === 'fail').map(r => r.id) }));
