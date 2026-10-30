#!/usr/bin/env node
// =============================================================================
// The variables-II kernel against its committed thresholds (Prompt 223 Part A)
// -----------------------------------------------------------------------------
//   node tools/variables-ii-validate.mjs                   print the table
//   node tools/variables-ii-validate.mjs --json            print it as JSON
//   node tools/variables-ii-validate.mjs --write-results   rewrite results.json and failed-legs.json
//   node tools/variables-ii-validate.mjs --only A1,C1      run the rows whose id starts with one of these
//
// tests/fixtures/variables-ii/thresholds.json fixed every bound before
// js/kernels/variables/features.js and plz.js existed. The oracle rows read
// oracle-results.json (tools/variables-ii-oracle/oracle.py: astropy's
// LombScargle, no Gravitas code). The cited coefficients are read from
// citations.json. A crossed bound is a failed row, left failing.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/variables/index.js';
import { loadVariablesData, ANCHORS } from '../js/variablesData.js';
import { propagate } from '../js/kernels/statistics/resample.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/variables-ii';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const ORA = read(`${FIX}/oracle-results.json`);
const CITED = existsSync(path.join(ROOT, FIX, 'citations.json'))
  ? read(`${FIX}/citations.json`)
  : null;
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEED = THRESHOLDS.seeds.ensemble;
const TWO_PI = 2 * Math.PI;

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });
const draw = (tag, i = 0) => stream('injection', SEED, tag, i);
const normal = (tag, i = 0) => gaussian(stream('noise', SEED, tag, i));
const wrapDiff = (a, b) => {
  const d = (((a - b) % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.min(d, TWO_PI - d);
};
const range = (rand, a, b) => a + (b - a) * rand();

const fetchImpl = async url => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(path.join(ROOT, url), 'utf8')),
});
const DATA = await loadVariablesData(fetchImpl);

// A three-harmonic curve of the contract (A1 0.2, A2 0.07, A3 0.02; phases in degrees).
const HARM = [
  { a: 0.2, phi: 10 },
  { a: 0.07, phi: 150 },
  { a: 0.02, phi: 60 },
];
const curve = (t, t0, P, h = HARM, sign = 1) =>
  t.map(x => {
    let y = 0;
    h.forEach((c, k) => {
      y +=
        c.a *
        Math.cos(
          (k + 1) * ((TWO_PI * (x - t0)) / P) + (sign * c.phi * Math.PI) / 180
        );
    });
    return y;
  });
const irregular = (rand, n, span) =>
  Array.from({ length: n }, () => rand() * span).sort((a, b) => a - b);

// -- A: analytic ---------------------------------------------------------------
function legA() {
  const P = 7.3;
  const t = irregular(draw('A1'), 240, 9 * P);
  const y = curve(t, t[0], P);
  const f = K.lightCurveFeatures(t, y, P);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < 100000; i++) {
    const v = curve([t[0] + (i / 100000) * P], t[0], P)[0];
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const L = lim('A1.noiseFreeFeatures');
  const m = {
    status: f.status,
    amplitude: Math.abs(f.amplitude - (hi - lo)),
    r21: Math.abs(f.fourier.r21.value - 0.35),
    r31: Math.abs(f.fourier.r31.value - 0.1),
    phi21: wrapDiff(f.fourier.phi21.value, (130 * Math.PI) / 180),
    phi31: wrapDiff(f.fourier.phi31.value, (30 * Math.PI) / 180),
  };
  row(
    'A1.noiseFreeFeatures',
    f.status === 'ok' &&
      m.amplitude <= L.amplitude &&
      m.r21 <= L.ratio &&
      m.r31 <= L.ratio &&
      m.phi21 <= L.phaseRad &&
      m.phi31 <= L.phaseRad,
    m
  );

  const ts = irregular(draw('A2'), 300, 9 * P);
  const sin = K.lightCurveFeatures(
    ts,
    curve(ts, ts[0], P, [{ a: 0.2, phi: 0 }]),
    P
  );
  const fwd = K.lightCurveFeatures(t, y, P);
  const rev = K.lightCurveFeatures(t, curve(t, t[0], P, HARM, -1), P);
  const L2 = lim('A2.skewAndRise');
  const m2 = {
    skew: Math.abs(sin.skewness),
    rise: Math.abs(sin.riseFraction - 0.5),
    reversed: Math.abs(rev.riseFraction - (1 - fwd.riseFraction)),
    forwardRise: fwd.riseFraction,
  };
  row(
    'A2.skewAndRise',
    m2.skew <= L2.skew && m2.rise <= L2.rise && m2.reversed <= L2.reversed,
    m2
  );

  if (!CITED) {
    for (const id of [
      'A3.plAtTheCitedPoints',
      'A4.ladderClosedForm',
      'A5.distanceFactor',
      'A6.propagationAgrees',
    ])
      notRun(id, 'citations.json (the cited gamma) is not in the tree');
    return;
  }
  const g = CITED.riess2022;
  const cal = K.fitLeavitt(DATA.cepheids.lmc.periods, DATA.cepheids.lmc.mags);
  const rel = { M0: cal.a, b: cal.b, gamma: g.gamma, zRef: g.zRef ?? 0 };
  const M = (P1, z) => K.wesenheitAbsolute(rel, P1, z);
  const m3 = {
    atTen: Math.abs(M(10, rel.zRef) - rel.M0),
    slope: Math.abs(M(100, 0.1) - M(10, 0.1) - rel.b),
    shift: Math.abs(M(30, 0.25) - M(30, -0.15) - g.gamma * 0.4),
  };
  row(
    'A3.plAtTheCitedPoints',
    Math.max(...Object.values(m3)) <= lim('A3.plAtTheCitedPoints').absMag,
    m3
  );

  const host = DATA.cepheids.n4258;
  const anchor = DATA.cepheids.lmc;
  const base = K.ladderDistance(host, anchor, ANCHORS.lmc, {});
  const Z = CITED.hosts;
  const meta = {
    gamma: g.gamma,
    sigmaGamma: g.sigma,
    host: Z.n4258.value,
    anchor: Z.lmc.value,
    sigmaHost: Z.n4258.sigma,
    sigmaAnchor: Z.lmc.sigma,
  };
  const withZ = K.ladderWithMetallicity(host, anchor, ANCHORS.lmc, meta, {});
  const dZ = meta.host - meta.anchor;
  const term = id => withZ.budget.find(b => b.id === id).sigma;
  const none = K.ladderWithMetallicity(
    host,
    anchor,
    ANCHORS.lmc,
    { gamma: g.gamma, sigmaGamma: 0, host: 0, anchor: 0 },
    {}
  );
  const m4 = {
    mu: Math.abs(withZ.mu - (base.mu - g.gamma * dZ)),
    gammaTerm: Math.abs(term('gamma') - Math.abs(dZ) * g.sigma),
    hostTerm: Math.abs(
      term('hostMetallicity') - Math.abs(g.gamma) * meta.sigmaHost
    ),
    anchorTerm: Math.abs(
      term('anchorMetallicity') - Math.abs(g.gamma) * meta.sigmaAnchor
    ),
    regressionMu: Math.abs(none.mu - base.mu),
    regressionSigma: Math.abs(none.sigma - base.sigma),
  };
  const L4 = lim('A4.ladderClosedForm');
  row(
    'A4.ladderClosedForm',
    m4.mu <= L4.mu &&
      Math.max(m4.gammaTerm, m4.hostTerm, m4.anchorTerm) <= L4.budget &&
      m4.regressionMu <= L4.regression &&
      m4.regressionSigma <= L4.regression,
    m4
  );

  const m5 = [-0.4, -0.1, 0.2].map(d => {
    const mu0 = 29;
    const ignored = 10 ** (mu0 / 5 + 1);
    const truth = 10 ** ((mu0 - g.gamma * d) / 5 + 1);
    return Math.abs(ignored / truth / K.distanceFactor(g.gamma, d) - 1);
  });
  row(
    'A5.distanceFactor',
    Math.max(...m5) <= lim('A5.distanceFactor').relative,
    { worst: Math.max(...m5) }
  );

  const L6 = lim('A6.propagationAgrees');
  const mc = propagate({
    mean: [base.mu, g.gamma, meta.host, meta.anchor],
    covariance: [
      [base.sigma ** 2, 0, 0, 0],
      [0, g.sigma ** 2, 0, 0],
      [0, 0, meta.sigmaHost ** 2, 0],
      [0, 0, 0, meta.sigmaAnchor ** 2],
    ],
    fn: th => th[0] - th[1] * (th[2] - th[3]),
    draws: L6.draws,
    seed: `${SEED}:A6`,
    label: 'A6',
  });
  const s = mc.samples;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(
    s.reduce((a, b) => a + (b - mean) ** 2, 0) / (s.length - 1)
  );
  const m6 = {
    linear: withZ.sigma,
    monteCarlo: sd,
    relative: Math.abs(sd - withZ.sigma) / withZ.sigma,
  };
  row(
    'A6.propagationAgrees',
    mc.status === 'ok' && m6.relative <= L6.relativeSigma,
    m6
  );
}

// -- B: the oracle -------------------------------------------------------------
function legB() {
  const lc = DATA.suDra;
  const t = Array.from(lc.t);
  const y = Array.from(lc.mag);
  const found = K.findPeriod(t, y, {
    minPeriod: 0.3,
    maxPeriod: 1.2,
    oversample: 4,
  });
  const P = K.refinePeriod(t, y, found.period, 3, 0.3 * found.width).period;
  const o = ORA.atOraclePeriod;
  const fit = K.harmonicFit(t, y, ORA.period, 3, { t0: t[0] });
  const dc = fit.coefficients
    .slice(1)
    .map((v, i) =>
      Math.abs(
        v -
          (i % 2 === 0
            ? o.coefficients[i >> 1].cos
            : o.coefficients[i >> 1].sin)
      )
    );
  const L1 = lim('B1.fixedPeriodCoefficients');
  row('B1.fixedPeriodCoefficients', Math.max(...dc) <= L1.coefficient, {
    worst: Math.max(...dc),
  });
  const m2 = {
    kernel: P,
    oracle: ORA.period,
    relative: Math.abs(P - ORA.period) / ORA.period,
  };
  row('B2.periodAgrees', m2.relative <= lim('B2.periodAgrees').relative, m2);
  if (!ORA.atKernelPeriod || Math.abs(ORA.kernelPeriod - P) > 1e-12) {
    notRun(
      'B3.featuresAgree',
      `oracle-results.json holds no run at the kernel's period ${P}; run oracle.py ${P}`
    );
    return P;
  }
  const f = K.lightCurveFeatures(t, y, P, { K: 3 });
  const q = ORA.atKernelPeriod;
  const L3 = lim('B3.featuresAgree');
  const m3 = {
    status: f.status,
    amplitude: Math.abs(f.amplitude - q.amplitude),
    r21: Math.abs(f.fourier.r21.value - q.r21),
    r31: Math.abs(f.fourier.r31.value - q.r31),
    phi21: wrapDiff(f.fourier.phi21.value, q.phi21),
    phi31: wrapDiff(f.fourier.phi31.value, q.phi31),
  };
  row(
    'B3.featuresAgree',
    f.status === 'ok' &&
      m3.amplitude <= L3.amplitude &&
      m3.r21 <= L3.r21 &&
      m3.r31 <= L3.r31 &&
      m3.phi21 <= L3.phaseRad &&
      m3.phi31 <= L3.phaseRad,
    m3
  );
  return P;
}

// -- C: ensembles --------------------------------------------------------------
function legC1C2() {
  if (!CITED) {
    notRun('C1.distanceCoverage', 'citations.json is not in the tree');
    notRun('C2.biasOfIgnoring', 'citations.json is not in the tree');
    return;
  }
  const g = CITED.riess2022;
  const Za = CITED.hosts.lmc.value;
  const SIG = { host: 0.1, anchor: 0.05 };
  const M0 = -5.9;
  const b = -3.29;
  const SCATTER = 0.08;
  let in1 = 0;
  let in2 = 0;
  let sumIgn = 0;
  let sumTrueShift = 0;
  let sumCorr = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const r = draw('C1', i);
    const z = normal('C1', i);
    const muHost = range(r, 28, 31);
    const muAnchorTrue = ANCHORS.lmc.mu;
    const dZ = range(r, -0.5, 0.2);
    const gammaTrue = g.gamma + g.sigma * z();
    const sample = (n, mu, zz) => {
      const periods = [];
      const mags = [];
      for (let j = 0; j < n; j++) {
        const x = range(r, 0.7, 1.8) - 1;
        periods.push(10 ** (x + 1));
        mags.push(mu + M0 + b * x + gammaTrue * (zz - Za) + SCATTER * z());
      }
      return { periods, mags };
    };
    const anchor = sample(60, muAnchorTrue, Za);
    const nHost = 8 + Math.floor(r() * 23);
    const host = sample(nHost, muHost, Za + dZ);
    const quotedAnchor = {
      mu: muAnchorTrue + ANCHORS.lmc.sigma * z(),
      sigma: ANCHORS.lmc.sigma,
    };
    const meta = {
      gamma: g.gamma,
      sigmaGamma: g.sigma,
      host: Za + dZ + SIG.host * z(),
      anchor: Za + SIG.anchor * z(),
      sigmaHost: SIG.host,
      sigmaAnchor: SIG.anchor,
    };
    const res = K.ladderWithMetallicity(host, anchor, quotedAnchor, meta, {});
    const err = res.mu - muHost;
    if (Math.abs(err) <= res.sigma) in1++;
    if (Math.abs(err) <= 2 * res.sigma) in2++;
    sumCorr += err;
    sumIgn += res.uncorrectedMu - muHost;
    sumTrueShift += gammaTrue * dZ;
  }
  const L1 = lim('C1.distanceCoverage');
  const m1 = { n: N, within1: in1 / N, within2: in2 / N };
  row(
    'C1.distanceCoverage',
    m1.within1 >= L1.within1Min &&
      m1.within1 <= L1.within1Max &&
      m1.within2 >= L1.within2Min &&
      m1.within2 <= L1.within2Max,
    m1
  );
  const L2 = lim('C2.biasOfIgnoring');
  const m2 = {
    meanIgnoring: sumIgn / N,
    meanGammaDZ: sumTrueShift / N,
    ignoringVsAnalytic: Math.abs(sumIgn / N - sumTrueShift / N),
    correctedBias: Math.abs(sumCorr / N),
  };
  row(
    'C2.biasOfIgnoring',
    m2.ignoringVsAnalytic <= L2.ignoringVsAnalytic &&
      m2.correctedBias <= L2.correctedBias,
    m2
  );
}

function legC3() {
  const P = 7.3;
  const N = 400;
  let in21 = 0;
  let inPhi = 0;
  for (let i = 0; i < N; i++) {
    const r = draw('C3', i);
    const z = normal('C3', i);
    const t = irregular(r, 240, 9 * P);
    const y = curve(t, t[0], P).map(v => v + 0.01 * z());
    const f = K.lightCurveFeatures(t, y, P);
    if (f.status !== 'ok') continue;
    if (Math.abs(f.fourier.r21.value - 0.35) <= 2 * f.fourier.r21.sigma) in21++;
    if (
      wrapDiff(f.fourier.phi21.value, (130 * Math.PI) / 180) <=
      2 * f.fourier.phi21.sigma
    )
      inPhi++;
  }
  const L = lim('C3.fourierCoverage');
  const m = { n: N, r21Within2: in21 / N, phi21Within2: inPhi / N };
  row(
    'C3.fourierCoverage',
    m.r21Within2 >= L.within2Min &&
      m.r21Within2 <= L.within2Max &&
      m.phi21Within2 >= L.within2Min &&
      m.phi21Within2 <= L.within2Max,
    m
  );
}

// -- D: refusals ---------------------------------------------------------------
function legD() {
  const P = 7.3;
  const short = irregular(draw('D1'), 120, 1.5 * P);
  const f1 = K.lightCurveFeatures(short, curve(short, short[0], P), P);
  const m1 = {
    status: f1.status,
    reason: f1.reason,
    fourierNull: f1.fourier === null && f1.amplitude === null,
    mean: f1.mean !== null,
    cycles: f1.cycles,
  };
  row(
    'D1.tooFewCycles',
    m1.status === 'not-constrained' && m1.fourierNull && m1.mean && !!m1.reason,
    m1
  );
  const rand = draw('D2');
  const clumped = Array.from({ length: 200 }, () => {
    const cyc = Math.floor(rand() * 6);
    return (cyc + rand() * 0.5) * P;
  }).sort((a, b) => a - b);
  const f2 = K.lightCurveFeatures(clumped, curve(clumped, clumped[0], P), P);
  row('D2.phaseGap', f2.status === 'not-constrained', {
    status: f2.status,
    reason: f2.reason,
    phaseGap: f2.phaseGap,
  });
  const N = 400;
  let false2 = 0;
  let false3 = 0;
  let n = 0;
  for (let i = 0; i < N; i++) {
    const t = irregular(draw('D3', i), 240, 9 * P);
    const z = normal('D3', i);
    const f = K.lightCurveFeatures(
      t,
      t.map(() => 0.01 * z()),
      P
    );
    if (f.status !== 'ok') continue;
    n++;
    if (f.harmonics[1].detected) false2++;
    if (f.harmonics[2].detected) false3++;
  }
  const m3 = { n, falseSecond: false2 / n, falseThird: false3 / n };
  row(
    'D3.noSignalNoHarmonic',
    Math.max(m3.falseSecond, m3.falseThird) <=
      lim('D3.noSignalNoHarmonic').falseRate,
    m3
  );
  const host = DATA.cepheids.n4258;
  const anchor = DATA.cepheids.lmc;
  const miss = K.ladderWithMetallicity(
    host,
    anchor,
    ANCHORS.lmc,
    { gamma: -0.2, host: NaN, anchor: -0.3 },
    {}
  );
  const base = K.ladderDistance(host, anchor, ANCHORS.lmc, {});
  const out = K.ladderWithMetallicity(
    host,
    anchor,
    ANCHORS.lmc,
    {
      gamma: -0.2,
      sigmaGamma: 0.05,
      host: 0.9,
      anchor: -0.3,
      range: [-0.7, 0.3],
    },
    {}
  );
  const m4 = {
    missing: miss.metallicity.status,
    missingMu: miss.mu === base.mu,
    outside: out.metallicity.status,
  };
  row(
    'D4.missingMetallicity',
    m4.missing === 'missing' && m4.missingMu && m4.outside === 'outside-range',
    m4
  );
  const set = K.FEATURE_SETS.periodAmplitude;
  const sample = DATA.sample;
  const amb = K.classifyWithAmbiguity(sample, set);
  const called = amb.map((a, i) => ({ a, i })).filter(x => x.a.cls !== null);
  const calledOk = called.filter(x => x.a.cls === sample[x.i].cls).length;
  const m5 = {
    stars: sample.length,
    called: called.length,
    unresolved: sample.length - called.length,
    calledAccuracy: calledOk / called.length,
    splitCalled: amb.filter(a => a.votes < 4 && a.cls !== null).length,
    strongUnresolved: amb.filter(a => a.votes >= 4 && a.cls === null).length,
  };
  row(
    'D5.ambiguousRule',
    m5.splitCalled === 0 &&
      m5.strongUnresolved === 0 &&
      m5.calledAccuracy >= lim('D5.ambiguousRule').calledAccuracyMin,
    m5
  );
}

// -- E: authentic --------------------------------------------------------------
function legE(P) {
  const L1 = lim('E1.suDraPeriod');
  const m1 = {
    kernel: P,
    published: 0.66042001,
    relative: Math.abs(P - 0.66042001) / 0.66042001,
  };
  row('E1.suDraPeriod', m1.relative <= L1.relative, m1);
  if (!CITED) {
    notRun('E2.n4258WithTerm', 'citations.json is not in the tree');
    notRun('E3.citedGammaAgree', 'citations.json is not in the tree');
    return;
  }
  const g = CITED.riess2022;
  const Z = CITED.hosts;
  const r = K.ladderWithMetallicity(
    DATA.cepheids.n4258,
    DATA.cepheids.lmc,
    ANCHORS.lmc,
    {
      gamma: g.gamma,
      sigmaGamma: g.sigma,
      host: Z.n4258.value,
      anchor: Z.lmc.value,
      sigmaHost: Z.n4258.sigma,
      sigmaAnchor: Z.lmc.sigma,
      range: CITED.range,
    },
    {}
  );
  const L2 = lim('E2.n4258WithTerm');
  const diff = r.mu - L2.maserMu;
  const m2 = {
    mu: r.mu,
    sigma: r.sigma,
    uncorrectedMu: r.uncorrectedMu,
    shift: r.metallicity.shift,
    status: r.metallicity.status,
    sigmas: diff / Math.hypot(r.sigma, L2.maserSigma),
  };
  row(
    'E2.n4258WithTerm',
    Math.abs(m2.sigmas) <= L2.sigmas && r.metallicity.status === 'applied',
    m2
  );
  if (!CITED.breuval2022) {
    notRun(
      'E3.citedGammaAgree',
      'the second cited coefficient is not in citations.json'
    );
    return;
  }
  const b = CITED.breuval2022;
  const s = (g.gamma - b.gamma) / Math.hypot(g.sigma, b.sigma);
  row('E3.citedGammaAgree', Math.abs(s) <= lim('E3.citedGammaAgree').sigmas, {
    riess: g.gamma,
    breuval: b.gamma,
    sigmas: s,
  });
}

const argv = process.argv.slice(2);
const only = argv.includes('--only')
  ? argv[argv.indexOf('--only') + 1].split(',')
  : null;
const want = id => !only || only.some(o => id.startsWith(o));
const on = name =>
  !only || only.some(o => name.startsWith(o) || o.startsWith(name));
let P = null;
if (on('A')) legA();
if (on('B') || on('E')) P = legB();
if (on('C1') || on('C2')) legC1C2();
if (on('C3')) legC3();
if (on('D')) legD();
if (on('E')) legE(P);
const shown = rows.filter(r => want(r.id));
if (argv.includes('--json')) console.log(JSON.stringify(shown, null, 2));
else
  for (const r of shown)
    console.log(
      `${r.status.padEnd(8)} ${r.id.padEnd(26)} ${JSON.stringify(r.measured).slice(0, 230)}${r.note ? ' ' + r.note : ''}`
    );
const REASONS = {};
if (argv.includes('--write-results')) {
  writeFileSync(
    path.join(ROOT, FIX, 'failed-legs.json'),
    `${JSON.stringify(
      {
        note: 'Legs of tests/fixtures/variables-ii/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).',
        failed: shown
          .filter(r => r.status === 'fail')
          .map(r => ({ ...r, reason: REASONS[r.id] ?? null })),
        notRun: shown.filter(r => r.status === 'not-run'),
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    path.join(ROOT, FIX, 'results.json'),
    `${JSON.stringify({ format: 'gravitas.variables-ii-results/1', rows: shown }, null, 2)}\n`
  );
}
process.exitCode = shown.some(r => r.status === 'fail') ? 1 : 0;
