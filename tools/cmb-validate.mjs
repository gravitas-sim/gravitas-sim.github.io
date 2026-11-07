// The CMB angular-scale gate validator (Prompt 258 Part A). SPIKE ONLY, never merged.
// Judges the prototype (js/kernels/cosmology/cmb/cmb.js) against tests/fixtures/cmb-scale/thresholds.json and the
// oracle's pinned output, row by row, and gives the verdict by the committed function.
//
//   node tools/cmb-validate.mjs <thresholds.json> <oracle-results.json> <planck-cmb.json> <tree root to scan> <out dir>

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { stream, gaussian } from '../js/random/streams.js';
import { createFriedmann } from '../js/kernels/cosmology/late/index.js';
import { C_KMS } from '../js/kernels/cosmology/flrw.js';
import { readGrid } from '../js/dataKinds/grid.js';
import * as cmb from '../js/kernels/cosmology/cmb/cmb.js';

const [thrPath, oraclePath, planckPath, scanRoot, outDir] = process.argv.slice(2);
const T0 = Date.now();
const thrBytes = readFileSync(thrPath);
const T = JSON.parse(thrBytes);
const oracleBytes = readFileSync(oraclePath);
const O = JSON.parse(oracleBytes);
const plBytes = readFileSync(planckPath);
const PLK = JSON.parse(plBytes);
const sha = b => createHash('sha256').update(b).digest('hex');

const rows = [];
const row = (id, status, measured, bound, note) => rows.push({ id, status, measured, bound, ...(note ? { note } : {}) });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const maxOf = xs => xs.reduce((m, v) => Math.max(m, v), 0);
const TOL = T.tolerance;
const G = O.constants.G_SI;
const TCMB = O.constants.Tcmb0;
const WORLDS = T.worlds.list;
const PHI = T.worlds.designOffset;
const radFor = Neff => cmb.radiation({ T: TCMB, Neff, G });
const worldParams = (w, over = {}) => {
  const r = radFor(w.Neff);
  const h = w.H0 / 100;
  const p = { H0: w.H0, Om: w.Om, Or: r.omegaRad / (h * h), Ode: w.Ode, w: w.w, omegaB: w.omegaB, omegaGamma: r.omegaGamma, zstar: w.zstar };
  return { ...p, ...over };
};

// ------------------------------------------------------------------ I: integrity
{
  const s = stream('noise', '258:cmb:peak:E1');
  const u = Array.from({ length: 1000 }, () => s());
  const first5Diff = maxOf(u.slice(0, 5).map((v, i) => Math.abs(v - O.streamCheck.first5[i])));
  const sumDiff = Math.abs(u.reduce((a, b) => a + b, 0) - O.streamCheck.sum1000);
  const shaOk = O.thresholdsSha256 === sha(thrBytes) && O.planckExtractionSha256 === sha(plBytes);
  row('I1.fixtures', shaOk && first5Diff === 0 && sumDiff <= 1e-12 ? 'pass' : 'fail', { thresholdsSha256: sha(thrBytes), planckSha256: sha(plBytes), shaMatch: shaOk, streamFirstFiveDiff: first5Diff, streamSumDiff: sumDiff }, 'exact');
  const have = Object.keys(cmb).sort();
  const want = [...T.apiSurface.exports].sort();
  row('I2.surface', JSON.stringify(have) === JSON.stringify(want) ? 'pass' : 'fail', { exports: have }, 'exact');
}

// ------------------------------------------------------------------ A: relation, closed forms and identities
{
  const e = [];
  for (const H0 of [50, 70]) {
    const eds = createFriedmann({ H0, Om: 1, Or: 0, Ode: 0 });
    for (const z of [800, 1090, 1500]) e.push(rel(eds.transverseComovingDistance(z), 2 * (C_KMS / H0) * (1 - 1 / Math.sqrt(1 + z))));
  }
  row('A1.edsDistance', maxOf(e) <= TOL.closedFormDistance ? 'pass' : 'fail', { maxRelative: maxOf(e) }, TOL.closedFormDistance);
}
{
  const e = O.closedForm.map(c => {
    const r = radFor(c.Neff);
    const h = c.H0 / 100;
    const Or = r.omegaRad / (h * h);
    const v = cmb.soundHorizon({ H0: c.H0, Om: 1 - Or, Or, Ode: 0, w: -1, omegaB: c.omegaB, omegaGamma: r.omegaGamma, zstar: c.zstar }).value;
    return rel(v, c.rs);
  });
  row('A2.soundHorizonClosedForm', maxOf(e) <= TOL.soundHorizonVsClosedForm ? 'pass' : 'fail', { maxRelative: maxOf(e), sets: O.closedForm.length }, TOL.soundHorizonVsClosedForm);
}
{
  const e = [];
  for (const w of WORLDS) {
    const p = worldParams(w);
    const t0 = cmb.acousticScale(p).theta;
    for (const lam of [0.5, 2, 3.7]) e.push(rel(cmb.acousticScale({ ...p, H0: w.H0 * lam }).theta, t0));
  }
  row('A3.scaleInvariance', maxOf(e) <= TOL.scaleInvariance ? 'pass' : 'fail', { maxRelative: maxOf(e), cases: e.length }, TOL.scaleInvariance);
}
{
  const e = [];
  for (const w of WORLDS) {
    const a = cmb.acousticScale(worldParams(w));
    for (const phi of T.worlds.offsets) {
      const l1 = cmb.peakMultipole({ theta: a.theta, phi });
      e.push(rel(cmb.thetaFromPeak({ ell1: l1, phi }), a.theta), rel(a.ellA * (1 - phi), l1), rel(a.ellA * a.theta, Math.PI));
    }
  }
  row('A4.peakRelation', maxOf(e) <= TOL.relationRoundTrip ? 'pass' : 'fail', { maxRelative: maxOf(e), cases: e.length }, TOL.relationRoundTrip);
}
let dirTheta;
{
  const w = WORLDS[0];
  const base = worldParams(w);
  const ths = [];
  const oks = [];
  for (let k = 0; k <= 20; k++) {
    const Ok = -0.05 + 0.005 * k;
    oks.push(Ok);
    ths.push(cmb.acousticScale({ ...base, Ode: 1 - base.Om - base.Or - Ok }).theta);
  }
  const up = ths.every((v, i) => i === 0 || v > ths[i - 1]);
  const down = ths.every((v, i) => i === 0 || v < ths[i - 1]);
  const th0 = cmb.acousticScale({ ...base, Ode: 'flat' }).theta;
  const cont = maxOf([1e-9, -1e-9].map(d => rel(cmb.acousticScale({ ...base, Ode: 1 - base.Om - base.Or - d }).theta, th0)));
  dirTheta = up ? 'theta_star increases with Ok (more open)' : down ? 'theta_star decreases with Ok (more open)' : 'not monotone';
  row('A5.curvature', (up || down) && cont <= TOL.curvatureContinuity ? 'pass' : 'fail', { direction: dirTheta, continuityRelative: cont, theta100AtMinus0p05: 100 * ths[0], theta100AtPlus0p05: 100 * ths[20] }, 'strict monotone; 1e-7');
}

// ------------------------------------------------------------------ B: the oracle
const WT = WORLDS.map((w, i) => ({ w, a: cmb.acousticScale(worldParams(w, { phi: PHI })), p: worldParams(w), o: O.worlds[i] }));
{
  const e = WT.map(({ a, o }) => rel(a.DM, o.DM_astropy));
  row('B1.distance', maxOf(e) <= TOL.distance ? 'pass' : 'fail', { maxRelative: maxOf(e), perWorld: e }, TOL.distance);
  const e1 = WT.map(({ a, o }) => rel(a.rs, o.rs_own));
  const e2 = WT.map(({ a, o }) => rel(a.rs, o.rs_astropyH));
  row('B2.soundHorizon', Math.max(maxOf(e1), maxOf(e2)) <= TOL.soundHorizonVsQuad ? 'pass' : 'fail', { maxRelativeOwnE: maxOf(e1), maxRelativeAstropyH: maxOf(e2) }, TOL.soundHorizonVsQuad);
  const e3 = WT.map(({ a, o }) => Math.max(rel(a.theta, o.theta), rel(a.ellA, o.ellA), rel(a.ell1, o.ell1)));
  row('B3.theta', maxOf(e3) <= TOL.theta ? 'pass' : 'fail', { maxRelative: maxOf(e3) }, TOL.theta);
  const e4 = WORLDS.map((w, i) => {
    const r = radFor(w.Neff);
    const h = w.H0 / 100;
    const o = O.worlds[i];
    return Math.max(rel(r.omegaGamma, O.constants.omegaGammaH2), rel(r.omegaRad / (h * h), o.astropyOgamma0 + o.astropyOnu0), rel(r.omegaGamma / (h * h), o.astropyOgamma0));
  });
  row('B4.radiation', maxOf(e4) <= TOL.radiation ? 'pass' : 'fail', { maxRelative: maxOf(e4) }, TOL.radiation);
}
{
  const w = WORLDS[0];
  const base = worldParams(w);
  const sweep = (xs, f) => xs.map(f);
  const lin = (a, b) => Array.from({ length: 21 }, (_, k) => a + ((b - a) * k) / 20);
  const rsB = sweep(lin(0.018, 0.028), x => cmb.soundHorizon({ ...base, omegaB: x }).value);
  const rsM = sweep(lin(0.2, 0.4), x => cmb.soundHorizon({ ...base, Om: x, Ode: 'flat' }).value);
  const rsZ = sweep(lin(900, 1300), x => cmb.soundHorizon({ ...base, zstar: x }).value);
  const dmZ = sweep(lin(900, 1300), x => cmb.comovingDistance({ ...base, zstar: x }).value);
  const steps = (xs, up) => xs.slice(1).filter((v, i) => (up ? v > xs[i] : v < xs[i])).length;
  const comp = { rsDecreasesWithOmegaB: steps(rsB, false), rsDecreasesWithOm: steps(rsM, false), rsIncreasesWithZstar_asCommitted: steps(rsZ, true), DMIncreasesWithZstar: steps(dmZ, true) };
  const ok = Object.values(comp).every(v => v === 20) && O.directions.rs_vs_omegaB && O.directions.rs_vs_Om && O.directions.rs_vs_zstar && O.directions.DM_vs_zstar;
  row('B5.directions', ok ? 'pass' : 'fail', { stepsOf20: comp, oracle: { rs_vs_omegaB: O.directions.rs_vs_omegaB, rs_vs_Om: O.directions.rs_vs_Om, rs_vs_zstar: O.directions.rs_vs_zstar, DM_vs_zstar: O.directions.DM_vs_zstar } }, '20 of 20 each',
    ok ? undefined : 'the committed direction of r_s with z_star (increasing) is wrong physics (AM4); left failing, B5b carries the corrected direction');
  const dec = steps(rsZ, false);
  row('B5b.directionOfRsWithZstar', dec === 20 && O.directions.rs_decreases_with_zstar ? 'pass' : 'fail', { prototypeStepsOf20: dec, oracle: O.directions.rs_decreases_with_zstar }, '20 of 20', 'NEW leg (AM4), NOT BLIND, outside the verdict function');
}
{
  const cover = WT.filter(({ a, o, p }) => Math.abs(a.rs - o.rs_own) <= cmb.soundHorizon(p).error).length;
  row('B6.errorCovers', cover === 10 ? 'pass' : 'fail', { covered: cover, of: 10 }, '10 of 10');
}
row('C1.citedCode', 'not-run', null, 'pinned by request X1', 'needs a Boltzmann code run in Carl\'s environment: request X1');

// ------------------------------------------------------------------ E: the peak fit and its ensembles
const SP = T.syntheticPeak;
const TR = SP.truth;
const dTrue = (ell, symmetric = false) => {
  const w = ell < TR.ell0 ? TR.widthBelow : symmetric ? TR.widthBelow : TR.widthAbove;
  return TR.base + TR.amplitude * Math.exp(-((ell - TR.ell0) ** 2) / (2 * w * w));
};
const centres = (width, u) => {
  const c = [];
  for (let k = 0; k <= Math.floor(720 / width) + 1; k++) {
    const x = u + width * k;
    if (x >= 20 && x <= 700) c.push(x);
  }
  return c;
};
const binSet = (width, u, { gauss = null, perturb = null, flat = null, symmetric = false }) => {
  const ell = centres(width, u);
  const D0 = ell.map(x => (flat === null ? dTrue(x, symmetric) : flat));
  const sigma = D0.map(v => 0.015 * v);
  const D = D0.map((v, i) => (perturb !== null ? v + 0.01 * v * Math.sin(i * (perturb + 1) + 0.3) : v + sigma[i] * gauss()));
  return { ell, D, sigma };
};
const runEnsemble = (leg, width, n, { level = 1, flat = null, symmetric = false } = {}) => {
  const draw = stream('noise', `258:cmb:peak:${leg}`);
  const gauss = gaussian(draw);
  let covered = 0;
  const codes = {};
  const sigmas = [];
  const errs = [];
  let apexReported = 0;
  for (let i = 0; i < n; i++) {
    const u = draw() * width;
    const r = cmb.fitPeak(binSet(width, u, { gauss, flat, symmetric }));
    const code = r.constrained ? 'ok' : r.code;
    codes[code] = (codes[code] || 0) + 1;
    if (!r.constrained && (r.apex !== undefined || r.sigma !== undefined)) apexReported++;
    if (r.constrained) {
      sigmas.push(r.sigma);
      errs.push(r.apex - TR.ell0);
      if (Math.abs(r.apex - TR.ell0) <= level * r.sigma) covered++;
    }
  }
  sigmas.sort((a, b) => a - b);
  return { n, covered, rate: covered / n, codes, apexReported, medianSigma: sigmas.length ? sigmas[Math.floor(sigmas.length / 2)] : null, meanApexError: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null };
};
const band = (p, n) => 3 * Math.sqrt((p * (1 - p)) / n);
const covRow = (id, mine, theirs, p, note) => {
  const b = band(p, mine.n);
  const okP = Math.abs(mine.rate - p) <= b;
  const okO = Math.abs(theirs.rate - p) <= band(p, theirs.n);
  row(id, okP && okO ? 'pass' : 'fail', { prototype: { rate: mine.rate, covered: mine.covered, medianSigma: mine.medianSigma, meanApexError: mine.meanApexError, codes: mine.codes }, oracle: { rate: theirs.rate, covered: theirs.covered, medianSigma: theirs.medianSigma, meanApexError: theirs.meanApexError, codes: theirs.codes }, band: [p - b, p + b] }, `|rate - ${p}| <= 3 sigma binomial`, note);
};
const E1 = runEnsemble('E1', 30, SP.draws.E1, { level: 1 });
const E2 = runEnsemble('E2', 30, SP.draws.E2, { level: 2 });
covRow('E1.coverage68', E1, O.E1, 0.6827, 'the quadratic apex is biased by the DESIGN peak\'s skew (X3): a stated systematic, not noise');
covRow('E2.coverage95', E2, O.E2, 0.9545, 'as E1');
{
  const e = [];
  const info = [];
  T.pinnedVectors.tolerance;
  O.E3.forEach((v, k) => {
    const b = binSet(30, v.phase, { perturb: k });
    const r = cmb.fitPeak(b);
    const o = v.result;
    const d0 = rel(b.D[0], v.first3[0]);
    const diffs = r.constrained && o.code === 'ok' ? [Math.abs(r.apex - o.apex), Math.abs(r.sigma - o.sigma), Math.abs(r.curvatureSigma - o.curvatureSigma), Math.abs(r.bins - o.n), d0] : [Infinity];
    e.push(maxOf(diffs));
    info.push({ k, apex: r.apex, sigma: r.sigma, curvatureSigma: r.curvatureSigma, bins: r.bins, oracleApex: o.apex, diffs });
  });
  row('E3.pinned', maxOf(e) <= T.pinnedVectors.tolerance ? 'pass' : 'fail', { maxAbsoluteDifference: maxOf(e), vectors: info }, T.pinnedVectors.tolerance);
}
{
  const E4 = runEnsemble('E4', SP.widths.coarse, SP.draws.E4);
  const okP = E4.codes['too-few-bins'] === SP.draws.E4 && E4.apexReported === 0;
  const okO = O.E4.codes['too-few-bins'] === SP.draws.E4;
  row('E4.coarse', okP && okO ? 'pass' : 'fail', { prototypeCodes: E4.codes, oracleCodes: O.E4.codes, apexOrIntervalReported: E4.apexReported }, '500 of 500');
  const E5 = runEnsemble('E5', 30, SP.draws.E5, { flat: 3000 });
  const nc = E5.n - (E5.codes.ok || 0);
  const ncO = O.E5.n - (O.E5.codes.ok || 0);
  row('E5.noPeak', nc / E5.n >= 0.95 && ncO / O.E5.n >= 0.95 ? 'pass' : 'fail', { prototypeNotConstrained: nc / E5.n, oracleNotConstrained: ncO / O.E5.n, prototypeCodes: E5.codes, oracleCodes: O.E5.codes }, 'at least 0.95 each');
}
{
  const a = runEnsemble('E6a', 30, SP.symmetricTruth.draws.E6a, { level: 1, symmetric: true });
  const b = runEnsemble('E6b', 30, SP.symmetricTruth.draws.E6b, { level: 2, symmetric: true });
  covRow('E6a.coverage68Symmetric', a, O.E6a, 0.6827, 'NEW leg (AM4), NOT BLIND, outside the verdict function');
  covRow('E6b.coverage95Symmetric', b, O.E6b, 0.9545, 'NEW leg (AM4), NOT BLIND, outside the verdict function');
}

// ------------------------------------------------------------------ Z: refusals
{
  let disagree = 0;
  let accepted = 0;
  let maxQ = 0;
  const first = [];
  for (const d of O.refusals.draws) {
    const p = { ...d.p };
    let code = 'accept';
    let a = null;
    try {
      a = cmb.acousticScale(p);
    } catch (e) {
      code = e && e.code ? e.code : `THROW:${e && e.message}`;
    }
    if (code !== d.code) {
      disagree++;
      if (first.length < 5) first.push({ oracle: d.code, prototype: code });
    } else if (code === 'accept') {
      accepted++;
      maxQ = Math.max(maxQ, rel(a.rs, d.rs), rel(a.DM, d.DM), rel(a.theta, d.theta));
    }
  }
  row('Z1.refusals', disagree === 0 && maxQ <= TOL.refusalAcceptedQuantity ? 'pass' : 'fail', { draws: O.refusals.draws.length, disagreements: disagree, accepted, maxRelativeOfAccepted: maxQ, byCode: O.refusals.byCode, firstDisagreements: first }, '0 disagreements; 1e-9');
}
{
  const ell = [100, 130, 160, 190, 220, 250, 280];
  const D = [1, 2, 3, 4, 3, 2, 1];
  const s = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
  const inputs = [
    { ell, D: [1, 2, NaN, 4, 3, 2, 1], sigma: s },
    { ell, D, sigma: [0.1, 0.1, 0, 0.1, 0.1, 0.1, 0.1] },
    { ell: [100, 130, 120, 190, 220, 250, 280], D, sigma: s },
    { ell, D: D.slice(0, 6), sigma: s },
    { ell: [], D: [], sigma: [] },
    { ell: [220], D: [3], sigma: [0.1] },
  ];
  const got = inputs.map(i => {
    try {
      cmb.fitPeak(i);
      return 'accepted';
    } catch (e) {
      return e.code ?? 'THROW';
    }
  });
  const want = T.refusals.peakFitInputs;
  const ok = JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(O.Z2) === JSON.stringify(want);
  row('Z2.peakInputs', ok ? 'pass' : 'fail', { prototype: got, oracle: O.Z2, committed: want }, '6 of 6');
}

// ------------------------------------------------------------------ K: the claim rule
{
  const CR = T.claimRule;
  const v = CR.violating.map(s => cmb.claimViolations(s).length > 0);
  const c = CR.clean.map(s => cmb.claimViolations(s).length > 0);
  const agree = v.every((x, i) => x === O.claimRule.violating[i]) && c.every((x, i) => x === O.claimRule.clean[i]);
  const ok = v.every(Boolean) && c.every(x => !x) && agree;
  // a probe, reported and not a condition: every GRID x READ pair is flagged and every NEG makes it clean
  let probeMiss = 0;
  let probeN = 0;
  for (const g of O.claimRule.grid) for (const r of O.claimRule.read) {
    probeN++;
    if (cmb.claimViolations(`the ${g} gives ${r}`).length !== 1) probeMiss++;
    if (cmb.claimViolations(`the ${g} never gives ${r}`).length !== 0) probeMiss++;
  }
  row('K1.claimRule', ok ? 'pass' : 'fail', { violatingFlagged: v.filter(Boolean).length, cleanFlagged: c.filter(Boolean).length, agreeWithOracleOn: 24, probePairs: probeN, probeMisses: probeMiss }, '12 of 12 each; agree on all 24');
}
{
  const CTX = /(?<![\p{L}\p{N}_])(?:CMB|microwave background|cosmic microwave|acoustic scale|acoustic peak|fondo cosmico de microondas|fondo cósmico de microondas|escala acustica|escala acústica|pico acustico|pico acústico)(?![\p{L}\p{N}_])/iu;
  const SKIP = new Set(['node_modules', 'dist', 'tests', 'worktrees', '.git', 'playwright-report', 'test-results', 'coverage']);
  let files = 0;
  let context = 0;
  const hits = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(js|mjs|json|html)$/.test(name) && st.size < 8e6) {
        files++;
        const text = readFileSync(full, 'utf8');
        for (const sentence of text.split(/[.!?;\n]+/)) {
          if (!CTX.test(sentence)) continue;
          context++;
          if (cmb.claimViolations(sentence).length) hits.push({ file: full.slice(scanRoot.length + 1), sentence: sentence.trim().slice(0, 120) });
        }
      }
    }
  };
  walk(scanRoot);
  row('K2.tree', hits.length === 0 ? 'pass' : 'fail', { filesScanned: files, contextSentences: context, violations: hits.length, first: hits.slice(0, 5) }, '0');
}

// ------------------------------------------------------------------ G: the grid's mechanics
{
  const SG = T.syntheticGrid;
  const ax = SG.axes;
  const f = (wb, wc, h) => 3 + 100 * wb - 40 * wc + 0.2 * h;
  const buf = new DataView(new ArrayBuffer(8 * 4 * 3 * 5));
  let i = 0;
  for (const a of ax[0].values) for (const b of ax[1].values) for (const c of ax[2].values) buf.setFloat64(8 * i++, f(a, b, c), true);
  const doc = {
    format: 'gravitas.grid', formatVersion: 1, id: 'cmb-gate-synthetic-grid', title: 'A synthetic linear grid (gate mechanics only)',
    axes: ax.map(a => ({ name: a.name, unit: 'dimensionless', values: a.values })),
    outputs: [{ name: 'y', unit: 'dimensionless' }], layout: 'dense',
    storage: { encoding: 'float64-le', data: Buffer.from(buf.buffer).toString('base64') },
    generator: { name: 'a linear function in the gate validator', version: '1.0.0', tool: 'cmb-validate', inputs: { formula: SG.output } },
  };
  let grid;
  let readErr = null;
  try {
    grid = readGrid(doc);
  } catch (e) {
    readErr = `${e.code}: ${e.message}`;
  }
  if (readErr) {
    row('G2.linear', 'fail', { readError: readErr }, '1e-12; 6 of 6');
    row('G3.nearest', 'fail', { readError: readErr }, '200 of 200');
  } else {
    const draw = stream('injection', '258:cmb:grid');
    const pts = Array.from({ length: SG.points }, () => ax.map(a => a.values[0] + (a.values[a.values.length - 1] - a.values[0]) * draw()));
    const dPts = maxOf(pts.map((p, k) => maxOf(p.map((x, j) => Math.abs(x - O.grid.points[k][j])))));
    let eMax = 0;
    for (const p of pts) eMax = Math.max(eMax, rel(grid.interpolate(p), f(...p)));
    const outside = [];
    ax.forEach((a, j) => {
      const mid = ax.map(b => b.values[Math.floor(b.values.length / 2)]);
      const r = a.values[a.values.length - 1] - a.values[0];
      const lo = [...mid];
      lo[j] = a.values[0] - 0.01 * r;
      const hi = [...mid];
      hi[j] = a.values[a.values.length - 1] + 0.01 * r;
      outside.push(lo, hi);
    });
    const refused = outside.filter(p => {
      try {
        grid.interpolate(p);
        return false;
      } catch (e) {
        return e.code === 'outside-domain';
      }
    }).length;
    row('G2.linear', eMax <= TOL.gridLinear && refused === 6 && dPts === 0 ? 'pass' : 'fail', { maxRelative: eMax, outsideRefused: refused, pointsDifferFromOracleStream: dPts }, '1e-12; 6 of 6');
    let same = 0;
    pts.forEach((p, k) => {
      if (JSON.stringify(cmb.nearestNode(grid.axes, p)) === JSON.stringify(O.grid.nearest[k])) same++;
    });
    const ties = [[0.022, 0.12, 62.5], [0.022, 0.12, 67.5], [0.022, 0.12, 77.5]].map(p => cmb.nearestNode(grid.axes, p)[2]);
    const tieOk = JSON.stringify(ties) === JSON.stringify([0, 1, 3]);
    const outRefused = outside.filter(p => {
      try {
        cmb.nearestNode(grid.axes, p);
        return false;
      } catch (e) {
        return e.code === 'outside-domain';
      }
    }).length;
    row('G3.nearest', same === SG.points && tieOk && outRefused === 6 ? 'pass' : 'fail', { sameNodeAsOracle: same, of: SG.points, tieNodes: ties, tiesExpected: [0, 1, 3], outsideRefused: outRefused }, '200 of 200');
  }
}
row('G1.provenance', 'not-run', null, 'pinned by request G1', 'the grid file, its generator and its rights decision: request G1 (NOT DECIDED)');

// ------------------------------------------------------------------ P: the published comparison (NOT BLIND)
{
  const pv = PLK.values;
  const num = k => Number(pv[k]);
  const run = (over = {}) => cmb.massiveNuModel({ wb: num('omegaB'), wc: num('omegaC'), H0: num('H0'), zstar: num('zstar'), mnuEv: num('neutrinoMassEv'), T: TCMB, Neff: 3.046, G, ...over });
  const m = run();
  const printedTheta = num('theta100Table1Best');
  const printedR = num('rstar');
  const dT = rel(m.theta100, printedTheta);
  const dR = rel(m.rs, printedR);
  row('P1.thetaPlanck', dT <= 5e-4 ? 'pass' : 'fail', { theta100: m.theta100, printed: printedTheta, relativeDifference: dT, sigmaPrintedRelative: num('theta100Table2Sigma') / num('theta100Table2') }, '5e-4 relative', 'NOT BLIND: the printed numbers were seen before the thresholds were committed');
  row('P2.rstarPlanck', dR <= 1e-3 ? 'pass' : 'fail', { rs: m.rs, printed: printedR, relativeDifference: dR, sigmaPrintedRelative: num('rstarSigma') / printedR }, '1e-3 relative', 'NOT BLIND, as P1; the columns are mixed (best-fit parameters, marginalised-mean z_star)');
  const om = O.planck.model;
  const d3 = Math.max(rel(m.rs, om.rs), rel(m.DM, om.DM), rel(m.theta, om.theta));
  row('P3.oracleAtPlanck', d3 <= 1e-9 ? 'pass' : 'fail', { maxRelative: d3, prototype: { rs: m.rs, DM: m.DM, theta100: m.theta100 }, oracle: { rs: om.rs, DM: om.DM, theta100: om.theta100 } }, '1e-9');
  // X2: sensitivity, and the massless 255-style value
  const sens = {};
  for (const [k, over] of [['zstarPlusSigma', { zstar: num('zstar') + num('zstarSigma') }], ['zstarMinusSigma', { zstar: num('zstar') - num('zstarSigma') }], ['Neff3.044', { Neff: 3.044 }], ['Neff3.05', { Neff: 3.05 }]]) {
    const s = run(over);
    sens[k] = { theta100: s.theta100, relThetaVsPrinted: rel(s.theta100, printedTheta), relRsVsPrinted: rel(s.rs, printedR), oracleTheta100: O.planckSensitivity[k].theta100 };
  }
  const h = num('H0') / 100;
  const r3 = radFor(3.046);
  const ml = cmb.acousticScale({ H0: num('H0'), Om: (num('omegaB') + num('omegaC')) / (h * h), Or: r3.omegaRad / (h * h), Ode: 'flat', w: -1, omegaB: num('omegaB'), omegaGamma: r3.omegaGamma, zstar: num('zstar') });
  row('X2.reportedPlanckSensitivity', 'reported', { sensitivity: sens, massless255Style: { theta100: 100 * ml.theta, relativeToMassiveNu: rel(100 * ml.theta, m.theta100), relativeToPrinted: rel(100 * ml.theta, printedTheta), rs: ml.rs, DM: ml.DM, oracleTheta100: O.planckMassless.theta100 }, y0: m.y0 }, 'REPORTED');
}
row('F1.zstarFormula', 'not-run', null, 'pinned by request F1', 'the source text of the fitting formula for z_star: request F1');
row('F2.peakOffset', 'not-run', null, 'pinned by request F2', 'the source text of the peak-offset formula: request F2');
row('S1.spectrumIntegrity', 'not-run', null, 'pinned by request S1', 'no binned spectrum and no rights decision (NOT DECIDED): request S1');
row('S2.peakFromSpectrum', 'not-run', null, 'relative 5 percent; 1e-9', 'needs S1 and F2');
row('S3.coarseRebin', 'not-run', null, 'pinned by request S1', 'needs S1');
row('S4.rights', 'not-run', null, 'NOT DECIDED', 'needs S1 and G1: no rights decision is recorded and no byte is shipped');

// ------------------------------------------------------------------ X: reported
row('X1.reportedWorlds', 'reported', WT.map(({ w, a, o }) => ({ id: w.id, rs: a.rs, DM: a.DM, theta100: 100 * a.theta, ellA: a.ellA, ell1: a.ell1, oracleTheta100: 100 * o.theta })), 'REPORTED');
{
  const bias = {};
  for (const width of [10, 30, 50]) {
    const errs = [];
    for (let j = 0; j < 20; j++) {
      const u = (width * j) / 20;
      const ell = centres(width, u);
      const r = cmb.fitPeak({ ell, D: ell.map(x => dTrue(x)), sigma: ell.map(x => 0.015 * dTrue(x)) });
      if (r.constrained) errs.push(r.apex - TR.ell0);
    }
    bias[`width${width}`] = { fits: errs.length, minError: Math.min(...errs), maxError: Math.max(...errs), meanError: errs.reduce((a, b) => a + b, 0) / errs.length };
  }
  row('X3.reportedApexBias', 'reported', { noiseFreeApexBias: bias, E1MedianSigma: E1.medianSigma, E1MeanApexError: E1.meanApexError }, 'REPORTED');
}
{
  const base = worldParams(WORLDS[0]);
  const th = Ok => cmb.acousticScale({ ...base, Ode: 1 - base.Om - base.Or - Ok }).theta;
  const dl = (Math.log(th(0.001)) - Math.log(th(-0.001))) / 0.002;
  const l1 = Ok => cmb.peakMultipole({ theta: th(Ok), phi: PHI });
  row('X4.reportedCurvature', 'reported', { dLnThetaDOk: dl, ell1AtMinus0p05: l1(-0.05), ell1AtZero: l1(0), ell1AtPlus0p05: l1(0.05), designOffset: PHI }, 'REPORTED');
}

// ------------------------------------------------------------------ the verdict, by the committed function
const by = id => rows.find(r => r.id === id);
const missing = T.checks.filter(c => !by(c.id)).map(c => c.id);
const extra = rows.filter(r => !T.checks.some(c => c.id === r.id)).map(r => r.id);
const isNew = id => T.checks.find(c => c.id === id)?.new === true;
const grp = id => T.checks.find(c => c.id === id).group;
const kernelGroups = new Set(['integrity', 'relation', 'oracle', 'ensemble', 'refusals', 'claim']);
const kernelIds = T.checks.filter(c => !c.new && (kernelGroups.has(c.group) || c.id === 'G2.linear' || c.id === 'G3.nearest')).map(c => c.id);
const kernelRows = kernelIds.map(by);
const pRows = ['P1.thetaPlanck', 'P2.rstarPlanck', 'P3.oracleAtPlanck'].map(by);
const kernelPass = kernelRows.every(r => r.status === 'pass') && pRows.every(r => r.status === 'pass' || r.status === 'not-run');
const sRows = ['S1.spectrumIntegrity', 'S2.peakFromSpectrum', 'S3.coarseRebin', 'S4.rights'].map(by);
const aRows = [...sRows, by('G1.provenance'), by('C1.citedCode'), by('F1.zstarFormula'), by('F2.peakOffset')];
const bRows = [...sRows, by('F2.peakOffset')];
let verdict;
let verdictWhy;
if (!kernelPass) {
  verdict = 'C';
  verdictWhy = 'KERNEL FAIL';
} else if (sRows.some(r => r.status === 'fail')) {
  verdict = 'C';
  verdictWhy = 'an S leg failed';
} else if (sRows.some(r => r.status === 'not-run')) {
  verdict = 'C';
  verdictWhy = 'C by absence: an S leg is NOT RUN (NOT ESTABLISHED for A and B)';
} else if (aRows.every(r => r.status === 'pass')) {
  verdict = 'A';
  verdictWhy = 'all legs ran and passed';
} else if (bRows.every(r => r.status === 'pass')) {
  verdict = 'B';
  verdictWhy = 'the spectrum without the grid';
} else {
  verdict = 'C';
  verdictWhy = 'an F2 leg did not pass';
}
const failing = rows.filter(r => r.status === 'fail');
const tally = {};
for (const r of rows) tally[r.status] = (tally[r.status] || 0) + 1;
const results = {
  format: 'gravitas.cmb-scale-gate-results/1',
  thresholdsSha256: sha(thrBytes),
  oracleSha256: sha(oracleBytes),
  planckExtractionSha256: sha(plBytes),
  node: process.version,
  seconds: Math.round((Date.now() - T0) / 100) / 10,
  counts: { rows: rows.length, ...tally },
  rowsNotInThresholds: extra,
  thresholdLegsWithoutRow: missing,
  verdict: {
    kernel: kernelPass ? 'KERNEL PASS' : 'KERNEL FAIL',
    kernelFailingRows: kernelRows.filter(r => r.status !== 'pass').map(r => r.id),
    product: verdict,
    why: verdictWhy,
    consumersClause: verdict === 'A' || verdict === 'B' ? 'met' : 'unmet',
    newLegsOutsideTheFunction: T.checks.filter(c => c.new).map(c => c.id),
  },
  rows,
};
void isNew;
void grp;
void bRows;
writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 1) + '\n');
writeFileSync(`${outDir}/failed-legs.json`, JSON.stringify({ format: 'gravitas.cmb-scale-failed-legs/1', note: 'every row that crossed its committed bound, left failing', failed: failing.map(r => ({ id: r.id, measured: r.measured, bound: r.bound, note: r.note ?? null })) }, null, 1) + '\n');
console.log(JSON.stringify({ counts: results.counts, verdict: results.verdict, failing: failing.map(r => r.id), extra, missing, seconds: results.seconds }));
