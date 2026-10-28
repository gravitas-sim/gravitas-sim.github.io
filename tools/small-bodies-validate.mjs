#!/usr/bin/env node
// =============================================================================
// The small-body kernel against its committed thresholds (Prompt 198)
// -----------------------------------------------------------------------------
//   npm run small-bodies:validate              print the table
//   npm run small-bodies:validate -- --json    print it as JSON
//   npm run small-bodies:validate -- --record  also write tests/fixtures/small-bodies/record.json
//   npm run small-bodies:validate -- --group=belt   one group only (the groups
//                                              are what the parallel run splits)
//
// tests/fixtures/small-bodies/thresholds.json fixed every bound before
// js/kernels/smallbodies/ had been run (SMALL_BODIES.md, "The validation
// contract"). This runs the checks against the production modules and judges them
// against those bounds, read from the file and not copied. tests/smallBodies.test.js
// runs it in plain Node (Jest's VM makes Math reads about ten times slower, so an
// ensemble there would time the harness) and asserts every row.
//
// The oracle's rows read the results pinned in tests/fixtures/small-bodies/
// (numpy surface integral, astropy Lomb-Scargle, scipy Poisson fit: no Gravitas
// code). Tier e (a real catalog, a measured light curve) is reported NOT RUN. The
// ensembles draw from named streams of js/random/streams.js; nothing stores a
// value that passes through a trigonometric function.
//
// The run is split into groups that run in at most two child processes at once
// (the project's worker limit); the rows come back in the order of the committed
// check ids.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  BELT_DEFAULTS,
  DEFAULT_GAPS,
  JUPITER_RESONANCES,
  NEPTUNE_RESONANCES,
  ORBIT_CLASSES,
  PLANETS,
  amplitudeMag,
  axisRatioBound,
  catalogFromPack,
  classifyOrbit,
  countClasses,
  detectedFractionRatio,
  detectionLimitH,
  fitBaseline,
  gapSurvey,
  lightCurveMag,
  meanAxisDetected,
  nightlyTimes,
  periodRatioAtAxis,
  projectedArea,
  resonanceAxis,
  rotationFromLightCurve,
  synthLightCurve,
  syntheticBelt,
  syntheticPopulations,
  syntheticSurvey,
  validateBody,
} from '../js/kernels/smallbodies/index.js';
import { nearestRatio } from '../js/resonance/elements.js';
import { stream, gaussian } from '../js/random/streams.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/small-bodies');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const R = THRESHOLDS.rules;
const ORACLE = read('oracle-results.json');
const INPUTS = read('oracle-inputs.json');
const SEED = 'small-bodies-198';
const rng = (...labels) => stream('noise', SEED, ...labels);
const JUP = R.planets.jupiterAu;
const NEP = R.planets.neptuneAu;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const notRun = (id, note) =>
  rows.push({ id, measured: null, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const inBand = (id, measured, [lo, hi], note) =>
  row(id, measured, [lo, hi], measured >= lo && measured <= hi, note);
const atLeast = (id, measured, bound, note) =>
  row(id, measured, bound, measured >= bound, note);
const atMost = (id, measured, bound, note) =>
  row(id, measured, bound, measured <= bound, note);
const exact = (id, ok, note) => row(id, ok ? 1 : 0, 1, ok, note);
const reported = (id, measured, note) =>
  row(id, measured, 'reported', true, note);
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);

// The committed gaps: centres from the kernel's axes (corrections c1), windows and
// injections from the thresholds.
const GAPS = R.gaps.map(g => ({
  id: g.id,
  centerAu: resonanceAxis(JUP, { inner: g.inner, outer: g.outer }),
  halfWidthAu: g.halfWidthAu,
  dmax: g.dmax,
}));
const WINDOWS = GAPS.map(({ id, centerAu, halfWidthAu }) => ({
  id,
  centerAu,
  halfWidthAu,
}));
const idx = id => GAPS.findIndex(g => g.id === id);
const DRAWS = R.bootstrapDraws;

// ---- (a) analytic -----------------------------------------------------------------

function defaults() {
  const ok =
    JSON.stringify(DEFAULT_GAPS.map(g => [g.id, g.centerAu, g.halfWidthAu])) ===
      JSON.stringify(WINDOWS.map(g => [g.id, g.centerAu, g.halfWidthAu])) &&
    BELT_DEFAULTS.binWidthAu === R.binWidthAu &&
    BELT_DEFAULTS.baselineDegree === R.baselineDegree &&
    BELT_DEFAULTS.baselineMarginAu === R.baselineMarginAu &&
    BELT_DEFAULTS.minObjects === R.minObjects &&
    BELT_DEFAULTS.minExpected === R.minExpected &&
    BELT_DEFAULTS.steepLimit === R.steepLimit &&
    BELT_DEFAULTS.level === R.level &&
    BELT_DEFAULTS.fitRangeAu[0] === R.fitRangeAu[0] &&
    BELT_DEFAULTS.fitRangeAu[1] === R.fitRangeAu[1] &&
    PLANETS.jupiter.aAu === JUP &&
    PLANETS.neptune.aAu === NEP;
  exact(
    'a0.defaults',
    ok,
    "the kernel's windows, rules and planets are the committed ones"
  );
}

function axes() {
  const b = C['a1.resonance.axes'].bounds;
  let worst = 0;
  const entries = [
    ...JUPITER_RESONANCES.map(r => [r, JUP]),
    ...NEPTUNE_RESONANCES.map(r => [r, NEP]),
  ];
  for (const [r, aPl] of entries) {
    const ratio = r.body === 'inner' ? r.outer / r.inner : r.inner / r.outer;
    worst = Math.max(worst, rel(r.aAu, aPl * Math.pow(ratio, 2 / 3)));
  }
  within(
    'a1.entries',
    entries.length - 11,
    0,
    '7 Jupiter and 4 Neptune entries'
  );
  within('a1.relative', worst, b.relative);
  const three = JUPITER_RESONANCES.find(r => r.id === '3:1').aAu;
  within('a1.three.to.one', rel(three, JUP / Math.cbrt(9)), b.relative);
  within(
    'a1.trojans',
    rel(JUPITER_RESONANCES.find(r => r.id === '1:1').aAu, JUP),
    b.relative
  );
}

function roundTrip() {
  const b = C['a2.resonance.roundtrip'].bounds;
  let worst = 0;
  let wrong = 0;
  for (const [list, aPl] of [
    [JUPITER_RESONANCES, JUP],
    [NEPTUNE_RESONANCES, NEP],
  ]) {
    for (const r of list) {
      worst = Math.max(
        worst,
        rel(periodRatioAtAxis(aPl, r.aAu), r.periodRatio)
      );
      // The longer period over the shorter is inner:outer.
      const x = Math.max(r.periodRatio, 1 / r.periodRatio);
      const n = nearestRatio(x, 10);
      if (!(n.p === r.inner && n.q === r.outer)) wrong++;
    }
  }
  within('a2.periodRatio', worst, b.relative);
  within(
    'a2.nearestRatio.wrong',
    wrong,
    0,
    "js/resonance/elements.js returns each entry's whole numbers"
  );
}

function lightCurveClosed() {
  const b = C['a3.lightcurve.closed'].bounds.relative;
  const body = { a: 1.7, b: 1.1, c: 0.8 };
  const A = (th, ph) => projectedArea(body, th, ph);
  let worst = 0;
  worst = Math.max(worst, rel(A(90, 0), Math.PI * body.b * body.c));
  worst = Math.max(worst, rel(A(90, 90), Math.PI * body.a * body.c));
  worst = Math.max(worst, rel(A(0, 33), Math.PI * body.a * body.b));
  within('a3.areas', worst, b, 'pi b c, pi a c, pi a b');
  let sphere = 0;
  for (const th of [0, 10, 45, 90]) {
    const m = lightCurveMag(
      { a: 1, b: 1, c: 1 },
      th,
      Array.from({ length: 360 }, (_, k) => k)
    );
    sphere = Math.max(sphere, Math.max(...m) - Math.min(...m));
  }
  within('a3.sphere', sphere, b);
  const u = rng('a3');
  let pole = 0;
  let half = 0;
  let equator = 0;
  let zappala = 0;
  for (let k = 0; k < 60; k++) {
    const a = 1.1 + 1.4 * u();
    const bb = 1 + (a - 1) * u();
    const c = 0.5 + (bb - 0.5) * u();
    const bd = { a, b: bb, c };
    const phases = Array.from({ length: 720 }, (_, j) => j * 0.5);
    const mPole = lightCurveMag(bd, 0, phases);
    pole = Math.max(pole, Math.max(...mPole) - Math.min(...mPole));
    const th = 90 * u();
    const ph = 360 * u();
    half = Math.max(
      half,
      rel(projectedArea(bd, th, ph), projectedArea(bd, th, ph + 180))
    );
    equator = Math.max(
      equator,
      rel(amplitudeMag(bd, 90), 2.5 * Math.log10(a / bb))
    );
    const m = lightCurveMag(bd, th, phases);
    zappala = Math.max(
      zappala,
      rel(Math.max(...m) - Math.min(...m), amplitudeMag(bd, th))
    );
  }
  within('a3.poleOn', pole, b);
  within('a3.halfPeriod', half, b, 'the flux at phi and phi + 180 degrees');
  within('a3.equatorOn', equator, b);
  within(
    'a3.zappala',
    zappala,
    b,
    '60 bodies, the maximum minus the minimum of the curve'
  );
}

function boundIsABound() {
  const bd = C['a4.bound.is.a.bound'].bounds;
  const u = rng('a4');
  let over = 0;
  let equal = 0;
  let low = 0;
  let nLow = 0;
  for (let k = 0; k < 1000; k++) {
    const ab = 1.05 + 1.95 * u();
    const bc = 1 + u();
    const th =
      (Math.acos(u() * Math.cos((20 * Math.PI) / 180)) * 180) / Math.PI;
    const body = { a: ab, b: 1, c: 1 / bc };
    const bound = axisRatioBound(amplitudeMag(body, th));
    over = Math.max(over, bound / ab - 1);
    equal = Math.max(equal, rel(axisRatioBound(amplitudeMag(body, 90)), ab));
    if (th <= 60) {
      nLow++;
      if (bound < (1 - bd.slack) * ab) low++;
    }
  }
  atMost('a4.neverOver', over, bd.relative, '1000 bodies');
  within('a4.equalAtEquatorOn', equal, bd.relative);
  atLeast(
    'a4.notTheShape',
    low / nLow,
    bd.fractionBelow,
    `${nLow} bodies at theta <= 60`
  );
}

function baselineExact() {
  const bd = C['a5.baseline.exact'].bounds;
  const c = [4.2, 0.3, -0.5, 0.1, 0.2];
  const [lo, hi] = R.fitRangeAu;
  const bw = R.binWidthAu;
  const nb = Math.round((hi - lo) / bw);
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  const win = { id: 'test', centerAu: 2.5, halfWidthAu: 0.03 };
  const counts = new Float64Array(nb);
  let obs = 0;
  for (let k = 0; k < nb; k++) {
    const a = lo + (k + 0.5) * bw;
    const x = (a - mid) / half;
    let eta = 0;
    for (let j = c.length - 1; j >= 0; j--) eta = eta * x + c[j];
    counts[k] = Math.exp(eta);
    if (
      a > win.centerAu - win.halfWidthAu &&
      a < win.centerAu + win.halfWidthAu
    ) {
      counts[k] *= 0.5;
      obs += counts[k];
    }
  }
  const fit = fitBaseline({ counts, lo, binWidth: bw }, [
    [
      win.centerAu - win.halfWidthAu - R.baselineMarginAu,
      win.centerAu + win.halfWidthAu + R.baselineMarginAu,
    ],
  ]);
  let worst = 0;
  for (let j = 0; j < c.length; j++)
    worst = Math.max(
      worst,
      Math.abs(fit.coefficients[j] - c[j]) / Math.abs(c[j])
    );
  within(
    'a5.coefficients',
    worst,
    bd.coefficientRelative,
    `${fit.iterations} iterations`
  );
  // N_exp by the same Simpson as the kernel, here with its own loop.
  const K = 400;
  const h = (2 * win.halfWidthAu) / (2 * K);
  let s = 0;
  for (let k = 0; k <= 2 * K; k++) {
    const a = win.centerAu - win.halfWidthAu + k * h;
    s += (k === 0 || k === 2 * K ? 1 : k % 2 ? 4 : 2) * fit.density(a);
  }
  const nExp = (s * h) / 3 / bw;
  within(
    'a5.depletion',
    1 - obs / nExp - 0.5,
    bd.depletionAbsolute,
    'the midpoint rule of the bins, stated in c2'
  );
}

function selectionAnalytic() {
  const bd = C['a6.selection.analytic'].bounds;
  const S = R.selection;
  let worst = 0;
  for (const a of [2, 2.5, 3, 3.5])
    worst = Math.max(
      worst,
      Math.abs(
        detectionLimitH(a, S.vLim) - (S.vLim - 5 * Math.log10(a * (a - 1)))
      )
    );
  within('a6.detectionLimitH', worst, bd.closedForm);
  within(
    'a6.ratio',
    rel(
      detectedFractionRatio(2, 3.5, S.alpha),
      Math.pow((3.5 * 2.5) / (2 * 1), 5 * S.alpha)
    ),
    bd.closedForm,
    'a = 2 against 3.5'
  );
  reported(
    'a6.ratio.value',
    detectedFractionRatio(2, 3.5, S.alpha),
    'the inner belt is found this many times more completely than the outer edge'
  );
  const quad = meanAxisDetected({
    range: S.aRangeAu,
    alpha: S.alpha,
    vLim: S.vLim,
  });
  const means = [];
  for (let r = 0; r < 400; r++) {
    const sv = syntheticSurvey({
      n: 20000,
      seed: SEED,
      label: `a6-${r}`,
      range: S.aRangeAu,
      alpha: S.alpha,
      vLim: S.vLim,
    });
    let sum = 0;
    let n = 0;
    for (let k = 0; k < sv.a.length; k++)
      if (sv.found[k]) {
        sum += sv.a[k];
        n++;
      }
    means.push(sum / n);
  }
  const mean = means.reduce((x, y) => x + y, 0) / means.length;
  const sd = Math.sqrt(
    means.reduce((x, y) => x + (y - mean) ** 2, 0) / (means.length - 1)
  );
  const se = sd / Math.sqrt(means.length);
  atMost(
    'a6.meanDetected.sigmas',
    Math.abs(mean - quad) / se,
    bd.sigmas,
    `ensemble ${mean.toFixed(4)}, quadrature ${quad.toFixed(4)}`
  );
  atMost(
    'a6.biasInward',
    mean,
    (S.aRangeAu[0] + S.aRangeAu[1]) / 2,
    'the detected mean is below the true mean'
  );
}

function classPartition() {
  const u = rng('a7');
  let multi = 0;
  let misclass = 0;
  const rowsIn = [];
  const truth = [];
  for (let k = 0; k < 10000; k++) {
    const c = ORBIT_CLASSES[Math.floor(u() * ORBIT_CLASSES.length)];
    const o = {
      a: c.a[0] + (c.a[1] - c.a[0]) * u(),
      e: c.e[0] + (c.e[1] - c.e[0]) * u(),
      i: c.i[0] + (c.i[1] - c.i[0]) * u(),
    };
    rowsIn.push(o);
    truth.push(c.id);
    let inBoxes = 0;
    for (const b of ORBIT_CLASSES)
      if (
        o.a >= b.a[0] &&
        o.a < b.a[1] &&
        o.e >= b.e[0] &&
        o.e <= b.e[1] &&
        o.i >= b.i[0] &&
        o.i <= b.i[1]
      )
        inBoxes++;
    if (inBoxes > 1) multi++;
    if (classifyOrbit(o) !== c.id) misclass++;
  }
  const table = countClasses(rowsIn);
  const sum = Object.values(table.counts).reduce((x, y) => x + y, 0);
  const pl = ORBIT_CLASSES.find(c => c.id === 'plutino');
  const tw = ORBIT_CLASSES.find(c => c.id === 'twotino');
  const centred =
    Math.abs((pl.a[0] + pl.a[1]) / 2 - NEP * Math.pow(1.5, 2 / 3)) < 1e-12 &&
    Math.abs((tw.a[0] + tw.a[1]) / 2 - NEP * 2 ** (2 / 3)) < 1e-12;
  exact('a7.noOverlap', multi === 0, '10,000 orbits, none in two boxes');
  exact(
    'a7.classified',
    misclass === 0,
    'every orbit is the class it was drawn in'
  );
  exact(
    'a7.windowsCentred',
    centred,
    'plutino 1.5^(2/3), twotino 2^(2/3) times a_Neptune'
  );
  exact('a7.tableSums', sum === 10000 && table.total === 10000, `${sum}`);
}

// ---- (b) the oracle ---------------------------------------------------------------

function oracle() {
  const bd = C['b1.oracle.axes'].bounds;
  let worst = 0;
  for (const r of JUPITER_RESONANCES)
    worst = Math.max(worst, rel(r.aAu, ORACLE.b1.jupiter[r.id]));
  for (const r of NEPTUNE_RESONANCES)
    worst = Math.max(worst, rel(r.aAu, ORACLE.b1.neptune[r.id]));
  within('b1.axes', worst, bd.relative, '11 axes against numpy');
  const b2 = C['b2.oracle.projectedArea'].bounds.relative;
  let w2 = 0;
  INPUTS.b2.forEach((r, k) => {
    w2 = Math.max(
      w2,
      rel(projectedArea(r, r.thetaDeg, r.phiDeg), ORACLE.b2[k])
    );
  });
  within(
    'b2.projectedArea',
    w2,
    b2,
    `${INPUTS.b2.length} configurations against the surface integral`
  );
  const b3 = C['b3.oracle.period'].bounds.relative;
  let wp = 0;
  let wr = 0;
  INPUTS.b3.forEach((s, k) => {
    const out = rotationFromLightCurve(s.t, s.m, {
      seed: `b3-${k}`,
      bootstrapResamples: 0,
      amplitudeDraws: 0,
    });
    if (out.status !== 'ok' || !out.periodHours) {
      wp = Infinity;
      wr = Infinity;
      return;
    }
    wp = Math.max(wp, rel(out.peakPeriodHours, ORACLE.b3[k].peakPeriodHours));
    wr = Math.max(wr, rel(out.periodHours, ORACLE.b3[k].rotationPeriodHours));
  });
  within(
    'b3.peakPeriod',
    wp,
    b3,
    `${INPUTS.b3.length} series against astropy's peak`
  );
  within(
    'b3.rotationPeriod',
    wr,
    b3,
    "the refined period against astropy's 2 / f_peak"
  );
  let kt = 0;
  let ot = 0;
  INPUTS.b3.forEach((s, k) => {
    const out = rotationFromLightCurve(s.t, s.m, {
      seed: `b3-${k}`,
      bootstrapResamples: 0,
      amplitudeDraws: 0,
    });
    kt = Math.max(kt, rel(out.periodHours, s.periodHours));
    ot = Math.max(ot, rel(ORACLE.b3[k].rotationPeriodHours, s.periodHours));
  });
  reported(
    'b3.vsTruth.kernel',
    kt,
    "the kernel's rotation period against the truth that made each series, worst of six"
  );
  reported(
    'b3.vsTruth.oracle',
    ot,
    "astropy's 2 / f_peak against the same truth, worst of six"
  );
  const b4 = C['b4.oracle.depletion'].bounds.absolute;
  let w4 = 0;
  let nobs = 0;
  INPUTS.b4.catalogs.forEach((cat, k) => {
    const r = gapSurvey(Float64Array.from(cat.a), {
      gaps: INPUTS.b4.gaps,
      draws: 0,
    });
    ORACLE.b4[k].gaps.forEach((g, j) => {
      w4 = Math.max(w4, Math.abs(r.gaps[j].depletion - g.depletion));
      nobs += Math.abs(r.gaps[j].nObs - g.nObs);
    });
  });
  within('b4.depletion', w4, b4, '3 catalogs, 5 windows against the scipy fit');
  within('b4.counts', nobs, 0, 'the observed counts agree exactly');
}

// ---- (c) coverage, (d) negative: the belt -----------------------------------------

const survey = (a, label, extra = {}) =>
  gapSurvey(a, { gaps: WINDOWS, draws: DRAWS, seed: SEED, label, ...extra });

function beltEnsembles() {
  // c1, and the gapped n0 = 8000 catalogs d1 reads.
  const bd = C['c1.coverage.ensemble'].bounds.coverage;
  const hits = Object.fromEntries(R.coverageGaps.map(g => [g, 0]));
  let resolved31 = 0;
  let refusedN = 0;
  const N = R.ensembleCatalogs;
  for (let r = 0; r < N; r++) {
    const belt = syntheticBelt({
      n0: R.ensembleN0,
      seed: SEED,
      label: `c1-${r}`,
      gaps: GAPS,
    });
    const res = survey(belt.a, `c1b-${r}`);
    if (res.status !== 'ok') {
      refusedN++;
      continue;
    }
    for (const g of R.coverageGaps) {
      const t = belt.truth.gaps[idx(g)].truthDepletion;
      const o = res.gaps[idx(g)];
      if (o.lo !== null && o.lo <= t && t <= o.hi) hits[g]++;
    }
    if (res.gaps[idx('3:1')].resolved) resolved31++;
  }
  for (const g of R.coverageGaps)
    inBand(
      `c1.coverage.${g}`,
      hits[g] / N,
      bd,
      `${N} catalogs, ${DRAWS} draws`
    );
  within('c1.refused', refusedN, 0);

  // c2: the coverage of the estimator's own estimate on bootstrap resamples.
  const b2 = C['c2.coverage.bootstrap'].bounds.coverage;
  const base = syntheticBelt({
    n0: R.ensembleN0,
    seed: SEED,
    label: 'c2',
    gaps: GAPS,
  });
  const point = gapSurvey(base.a, { gaps: WINDOWS, draws: 0 });
  const dHat = point.gaps[idx('3:1')].depletion;
  const u = rng('c2-resample');
  let cover = 0;
  const n = base.a.length;
  for (let r = 0; r < 200; r++) {
    const re = new Float64Array(n);
    for (let k = 0; k < n; k++)
      re[k] = base.a[Math.min(n - 1, Math.floor(u() * n))];
    const res = survey(re, `c2-${r}`, { draws: 100 });
    const o = res.gaps?.[idx('3:1')];
    if (o && o.lo !== null && o.lo <= dHat && dHat <= o.hi) cover++;
  }
  inBand(
    'c2.coverage',
    cover / 200,
    b2,
    `D_hat ${dHat.toFixed(3)}, 200 resamples, 100 inner draws`
  );

  // d1
  const d1 = C['d1.cut.too.small'].bounds;
  const small = R.smallN0;
  let notResolved = 0;
  for (let r = 0; r < N; r++) {
    const belt = syntheticBelt({
      n0: small,
      seed: SEED,
      label: `d1s-${r}`,
      gaps: GAPS,
    });
    const res = survey(belt.a, `d1sb-${r}`);
    const g = res.status === 'ok' ? res.gaps[idx('3:1')] : null;
    if (!g || !g.resolved) notResolved++;
  }
  atLeast(
    'd1.notResolvedAtSmall',
    notResolved / N,
    d1.notResolvedAtSmall,
    `${N} catalogs at n0 = ${small}`
  );
  let fp = 0;
  let fpAll = 0;
  for (let r = 0; r < N; r++) {
    const belt = syntheticBelt({
      n0: R.ensembleN0,
      seed: SEED,
      label: `d1f-${r}`,
      gaps: [],
    });
    const res = survey(belt.a, `d1fb-${r}`);
    if (res.gaps[idx('3:1')].resolved) fp++;
    for (const g of res.gaps) if (g.resolved) fpAll++;
  }
  atMost(
    'd1.falsePositive',
    fp / N,
    d1.falsePositiveMax,
    `${N} gap-free catalogs, the 3:1 window`
  );
  reported(
    'd1.falsePositive.allWindows',
    fpAll / (N * GAPS.length),
    'resolved windows over all five windows of the gap-free catalogs'
  );
  atLeast(
    'd1.powerAtLarge',
    resolved31 / N,
    d1.powerAtLargeMin,
    `the c1 catalogs, n0 = ${R.ensembleN0}`
  );
  for (const n0 of [500, 1000, 2000]) {
    let ok = 0;
    for (let r = 0; r < 100; r++) {
      const belt = syntheticBelt({
        n0,
        seed: SEED,
        label: `d1p${n0}-${r}`,
        gaps: GAPS,
      });
      const res = survey(belt.a, `d1pb${n0}-${r}`);
      if (res.status === 'ok' && res.gaps[idx('3:1')].resolved) ok++;
    }
    reported(
      `d1.power.${n0}`,
      ok / 100,
      `fraction of 100 catalogs at n0 = ${n0} that resolve the 3:1 gap`
    );
  }

  // d3: a cliff
  const d3 = C['d3.steep.edge'].bounds;
  let warned = 0;
  let notRes = 0;
  const M = 100;
  for (let r = 0; r < M; r++) {
    const belt = syntheticBelt({
      n0: R.ensembleN0,
      seed: SEED,
      label: `d3-${r}`,
      gaps: [],
      cliff: true,
    });
    const res = survey(belt.a, `d3b-${r}`);
    const g = res.status === 'ok' ? res.gaps[idx('2:1')] : null;
    if (g && g.warnings.includes('steep-baseline')) warned++;
    if (!g || !g.resolved) notRes++;
  }
  atLeast(
    'd3.warned',
    warned / M,
    d3.warnedFraction,
    `${M} catalogs with a sharp outer edge, no gap`
  );
  atLeast('d3.notResolved', notRes / M, d3.notResolvedFraction);
  // ADDED after the first run showed the two rows above failing (SMALL_BODIES.md,
  // "Honest notes on order"): the same bounds, for the flank test the kernel then
  // gained, and a false-alarm figure for it on smooth belts.
  let flanked = 0;
  let flankedNotRes = 0;
  for (let r = 0; r < M; r++) {
    const belt = syntheticBelt({
      n0: R.ensembleN0,
      seed: SEED,
      label: `d3-${r}`,
      gaps: [],
      cliff: true,
    });
    const g = survey(belt.a, `d3b-${r}`).gaps[idx('2:1')];
    if (
      g.warnings.includes('steep-baseline') ||
      g.warnings.includes('uneven-flanks')
    )
      flanked++;
    if (!g.resolved) flankedNotRes++;
  }
  atLeast(
    'd3.warned.added',
    flanked / M,
    d3.warnedFraction,
    'steep-baseline or uneven-flanks'
  );
  atLeast('d3.notResolved.added', flankedNotRes / M, d3.notResolvedFraction);
  let flaggedClean = 0;
  for (let r = 0; r < 100; r++) {
    const belt = syntheticBelt({
      n0: R.ensembleN0,
      seed: SEED,
      label: `d1f-${r}`,
      gaps: [],
    });
    for (const g of survey(belt.a, `d1fb-${r}`).gaps)
      if (g.warnings.includes('uneven-flanks')) flaggedClean++;
  }
  atMost(
    'd3.cleanFlagged.added',
    flaggedClean / (100 * GAPS.length),
    0.02,
    'windows of 100 gap-free smooth belts flagged for uneven flanks (a figure reported against 2 percent)'
  );
}

// ---- (c3) the light-curve ensembles -------------------------------------------------

function curveEnsemble(noise) {
  const bd = C['c3.lightcurve.recovery'].bounds;
  const L = R.lightcurve;
  const tol = bd.periodRelativeByNoise[String(noise)];
  const N = L.ensembleCurves;
  let periodOk = 0;
  let ampOk = 0;
  let ampCover = 0;
  let boundOk = 0;
  let periodCover = 0;
  let failed = 0;
  // ADDED after the first run (SMALL_BODIES.md, "Honest notes on order"): the same
  // bounds over the curves the kernel itself called 'period' (not ambiguous) with
  // an amplitude returned, and how many it flagged.
  let verdictPeriod = 0;
  let flaggedAmbiguous = 0;
  let withheld = 0;
  let pOk2 = 0;
  let aOk2 = 0;
  let aCover2 = 0;
  let bOk2 = 0;
  let pCover2 = 0;
  for (let r = 0; r < N; r++) {
    const u = rng('c3', noise, r);
    const ab = 1.15 + 1.05 * u();
    const bc = 1 + 0.6 * u();
    const th = (Math.acos(u() * Math.cos(Math.PI / 6)) * 180) / Math.PI;
    const P = 2.5 * Math.pow(24 / 2.5, u());
    const body = { a: ab, b: 1, c: 1 / bc };
    const t = nightlyTimes({
      nights: 5,
      hoursPerNight: 7,
      pointsPerNight: 40,
      seed: SEED,
      label: `c3t-${noise}-${r}`,
    });
    const lc = synthLightCurve(
      { body, thetaDeg: th, periodHours: P, phase0Deg: 360 * u() },
      t,
      {
        noiseMag: noise,
        seed: SEED,
        label: `c3n-${noise}-${r}`,
      }
    );
    const rot = rotationFromLightCurve(lc.t, lc.m, {
      seed: `c3-${noise}-${r}`,
    });
    if (
      rot.status !== 'ok' ||
      !rot.periodHours ||
      rot.verdict === 'not-periodic'
    ) {
      failed++;
      continue;
    }
    const dm = lc.truth.amplitudeMag;
    const pOk = rel(rot.periodHours, P) <= tol;
    const hasAmp = rot.amplitudeMag !== null;
    const aOk =
      hasAmp && Math.abs(rot.amplitudeMag - dm) <= bd.amplitudeAbsolute;
    const ai = rot.amplitudeInterval;
    const aCov = !!ai && ai.lo <= dm && dm <= ai.hi;
    const bOk = !!rot.axisRatioBound && ab >= rot.axisRatioBound.value;
    const pCov = Math.abs(rot.periodHours - P) <= R.z * rot.sigmaHours;
    if (pOk) periodOk++;
    if (aOk) ampOk++;
    if (aCov) ampCover++;
    if (bOk) boundOk++;
    if (pCov) periodCover++;
    if (rot.verdict === 'ambiguous') flaggedAmbiguous++;
    if (!hasAmp) withheld++;
    if (rot.verdict === 'period' && hasAmp) {
      verdictPeriod++;
      if (pOk) pOk2++;
      if (aOk) aOk2++;
      if (aCov) aCover2++;
      if (bOk) bOk2++;
      if (pCov) pCover2++;
    }
  }
  const tag = `c3.noise${noise}`;
  atLeast(
    `${tag}.period`,
    periodOk / N,
    bd.periodFraction,
    `within ${tol} of the truth, ${N} curves`
  );
  atLeast(
    `${tag}.amplitude`,
    ampOk / N,
    bd.amplitudeFraction,
    `within ${bd.amplitudeAbsolute} mag`
  );
  inBand(`${tag}.amplitudeCoverage`, ampCover / N, bd.amplitudeCoverage);
  atLeast(
    `${tag}.boundHolds`,
    boundOk / N,
    bd.boundHolds,
    'a/b >= the bound, from the interval lower end'
  );
  inBand(
    `${tag}.periodCoverage`,
    periodCover / N,
    bd.periodCoverage,
    '1.96 sigma of the period bootstrap'
  );
  reported(
    `${tag}.noVerdict`,
    failed / N,
    'fraction returned as not periodic or refused (a signal under the noise)'
  );
  reported(
    `${tag}.ambiguous`,
    flaggedAmbiguous / N,
    'fraction the kernel called ambiguous'
  );
  reported(
    `${tag}.withheld`,
    withheld / N,
    'fraction whose amplitude was withheld (phase gap or ill-conditioned)'
  );
  const n2 = Math.max(1, verdictPeriod);
  atLeast(
    `${tag}.period.added`,
    pOk2 / n2,
    bd.periodFraction,
    `${verdictPeriod} curves called period with an amplitude`
  );
  atLeast(`${tag}.amplitude.added`, aOk2 / n2, bd.amplitudeFraction);
  inBand(`${tag}.amplitudeCoverage.added`, aCover2 / n2, bd.amplitudeCoverage);
  atLeast(`${tag}.boundHolds.added`, bOk2 / n2, bd.boundHolds);
  inBand(`${tag}.periodCoverage.added`, pCover2 / n2, bd.periodCoverage);
}

function negativeCurves() {
  const bd = C['d4.not.periodic'].bounds;
  const L = R.lightcurve;
  const none = { bootstrapResamples: 0, amplitudeDraws: 0 };
  const cad = { nights: 5, hoursPerNight: 7, pointsPerNight: 40 };
  let np = 0;
  const N = 300;
  for (let r = 0; r < N; r++) {
    const t = nightlyTimes({ ...cad, seed: SEED, label: `d4t-${r}` });
    const g = gaussian(rng('d4noise', r));
    const m = Float64Array.from(t, () => 0.03 * g());
    const out = rotationFromLightCurve(t, m, { ...none, seed: `d4-${r}` });
    if (out.verdict === 'not-periodic') np++;
  }
  atLeast(
    'd4.noiseNotPeriodic',
    np / N,
    bd.noiseNotPeriodic,
    `${N} noise series, false-alarm limit ${L.falseAlarmMax}`
  );
  let per = 0;
  for (let r = 0; r < N; r++) {
    const u = rng('d4sig', r);
    const P = 2.5 * Math.pow(24 / 2.5, u());
    const t = nightlyTimes({ ...cad, seed: SEED, label: `d4st-${r}` });
    const lc = synthLightCurve(
      {
        body: { a: Math.pow(10, 0.4 * 0.06), b: 1, c: 0.9 },
        thetaDeg: 90,
        periodHours: P,
        phase0Deg: 360 * u(),
      },
      t,
      { noiseMag: 0.03, seed: SEED, label: `d4sn-${r}` }
    );
    const out = rotationFromLightCurve(lc.t, lc.m, {
      ...none,
      seed: `d4s-${r}`,
    });
    if (out.status === 'ok' && out.verdict !== 'not-periodic') per++;
  }
  atLeast(
    'd4.signalPeriodic',
    per / N,
    bd.signalPeriodic,
    '0.06 mag two-maxima signal at 0.03 mag noise'
  );
  const body = { a: 1.6, b: 1, c: 0.8 };
  let flagged = 0;
  for (let r = 0; r < 100; r++) {
    const t = nightlyTimes({
      nights: 40,
      hoursPerNight: 0,
      pointsPerNight: 1,
      jitterDay: 0.02,
      seed: SEED,
      label: `d4n-${r}`,
    });
    const lc = synthLightCurve(
      { body, thetaDeg: 70, periodHours: 9, phase0Deg: 7 * r },
      t,
      { noiseMag: 0.01, seed: SEED, label: `d4nn-${r}` }
    );
    const out = rotationFromLightCurve(lc.t, lc.m, {
      ...none,
      seed: `d4n-${r}`,
    });
    if (
      out.verdict === 'ambiguous' ||
      (out.status === 'refused' && out.code === 'sampling')
    )
      flagged++;
  }
  atLeast(
    'd4.onceNightlyFlagged',
    flagged / 100,
    bd.onceNightlyFlagged,
    '40 nights, one point a night, 9.0 h'
  );
  let amb = 0;
  for (let r = 0; r < 100; r++) {
    const t = nightlyTimes({
      nights: 3,
      hoursPerNight: 8,
      pointsPerNight: 80,
      regular: true,
      seed: SEED,
      label: `d4d-${r}`,
    });
    const lc = synthLightCurve(
      { body, thetaDeg: 70, periodHours: 9, phase0Deg: 7 * r },
      t,
      { noiseMag: 0.01, seed: SEED, label: `d4dn-${r}` }
    );
    const out = rotationFromLightCurve(lc.t, lc.m, {
      ...none,
      seed: `d4d-${r}`,
    });
    if (out.verdict === 'ambiguous') amb++;
  }
  atMost(
    'd4.denseAmbiguous',
    amb / 100,
    bd.denseAmbiguousMax,
    'three 8-hour nights at 6 minutes'
  );
}

function oneMaximum() {
  const tol = C['d5.one.maximum'].bounds.relative;
  const t = nightlyTimes({
    nights: 5,
    hoursPerNight: 7,
    pointsPerNight: 40,
    seed: SEED,
    label: 'd5t',
  });
  const g = gaussian(rng('d5'));
  const P = 6.0;
  const m = Float64Array.from(
    t,
    x => 0.1 * Math.cos((2 * Math.PI * 24 * (x - t[0])) / P) + 0.01 * g()
  );
  const out = rotationFromLightCurve(t, m, {
    seed: 'd5',
    bootstrapResamples: 0,
    amplitudeDraws: 0,
  });
  within(
    'd5.primary',
    rel(out.periodHours, 2 * P),
    tol,
    `${out.periodHours?.toFixed(4)} h for a true ${P} h`
  );
  within(
    'd5.alternative',
    rel(out.alternative?.periodHours, P),
    tol,
    'the one-maximum period is listed'
  );
}

// ---- (c4), (d2) -------------------------------------------------------------------

function populationCounts() {
  const counts = {
    innerMainBelt: 400,
    middleMainBelt: 500,
    outerMainBelt: 300,
    hilda: 120,
    trojan: 200,
    kuiperClassical: 250,
    plutino: 90,
    twotino: 40,
  };
  const pop = syntheticPopulations({
    counts,
    other: 60,
    seed: SEED,
    label: 'c4',
  });
  const got = countClasses(pop.rows);
  let wrong = 0;
  pop.rows.forEach((r, k) => {
    if (classifyOrbit(r) !== pop.truth.members[k]) wrong++;
  });
  const sameTable = Object.entries(pop.truth.counts).every(
    ([id, n]) => got.counts[id] === n
  );
  exact('c4.membership', wrong === 0, `${pop.rows.length} synthetic orbits`);
  exact(
    'c4.table',
    sameTable && got.total === pop.rows.length,
    'the table equals the manifest'
  );
}

function refusals() {
  const ok = [];
  const code = (label, r, expected) => {
    ok.push([label, r?.status === 'refused' && r.code === expected, r?.code]);
  };
  const a = Float64Array.from(
    { length: 1000 },
    (_, k) => 2 + 1.5 * ((k * 0.618033988) % 1)
  );
  code('29 values', gapSurvey(a.slice(0, 29), { draws: 0 }), 'too-few');
  code(
    'window outside',
    gapSurvey(a, {
      gaps: [{ id: 'x', centerAu: 3.49, halfWidthAu: 0.04 }],
      draws: 0,
    }),
    'window'
  );
  code(
    'overlap',
    gapSurvey(a, {
      gaps: [
        { id: 'x', centerAu: 2.5, halfWidthAu: 0.05 },
        { id: 'y', centerAu: 2.56, halfWidthAu: 0.05 },
      ],
      draws: 0,
    }),
    'window'
  );
  code(
    'zero width',
    gapSurvey(a, {
      gaps: [{ id: 'x', centerAu: 2.5, halfWidthAu: 0 }],
      draws: 0,
    }),
    'window'
  );
  const bad = Float64Array.from(a);
  bad[10] = NaN;
  code('NaN', gapSurvey(bad, { draws: 0 }), 'non-finite');
  code('draws', gapSurvey(a, { draws: 2.5, seed: 'x' }), 'draws');
  code('level', gapSurvey(a, { level: 1, draws: 0 }), 'level');
  const t = Float64Array.from({ length: 10 }, (_, k) => k / 10);
  code('10 points', rotationFromLightCurve(t, t, {}), 'too-few');
  const t2 = Float64Array.from({ length: 30 }, (_, k) => k / 10);
  const t3 = Float64Array.from(t2);
  t3[4] = NaN;
  code('NaN time', rotationFromLightCurve(t3, t2, {}), 'non-finite');
  code(
    'negative sigma',
    synthLightCurve(
      { body: { a: 1.5, b: 1, c: 0.8 }, thetaDeg: 60, periodHours: 5 },
      t2,
      { noiseMag: -0.01, seed: 'x' }
    ),
    'sigma'
  );
  code(
    'c > b',
    synthLightCurve(
      { body: { a: 1.5, b: 0.8, c: 1 }, thetaDeg: 60, periodHours: 5 },
      t2,
      { seed: 'x' }
    ),
    'axes'
  );
  code('b > a', validateBody({ a: 1, b: 1.5, c: 0.8 }, 60), 'axes');
  code('aspect', validateBody({ a: 1.5, b: 1, c: 0.8 }, 95), 'aspect');
  const failed = ok
    .filter(([, pass]) => !pass)
    .map(([l, , c]) => `${l} (${c})`);
  exact(
    'd2.refusals',
    failed.length === 0,
    failed.length
      ? `not refused with the code: ${failed.join(', ')}`
      : `${ok.length} refusals`
  );
}

function notRuns() {
  notRun(
    'e1.cited',
    'no cited independent analysis of the same catalog cut was supplied: e1.oracle is an independent implementation of the same estimator, not a cited analysis'
  );
  notRun(
    'e2.lightcurve',
    'no measured asteroid light curve: the ALCDEF download is a form-based job and the PDS path returned 404 on 2026-10-27; nothing is simulated as authentic'
  );
}

// ---- (e1) the retrieved numbered H < 13 cut ---------------------------------------

function authentic() {
  const A = R.authentic;
  const bd = C['e1.catalog'].bounds;
  const pack = JSON.parse(
    readFileSync(path.join(HERE, '..', A.numbered.file), 'utf8')
  );
  const cat = catalogFromPack(pack);
  const [lo, hi] = R.fitRangeAu;
  let nIn = 0;
  for (const a of cat.a) if (a >= lo && a < hi) nIn++;
  atLeast(
    'e1.rows',
    nIn,
    A.numbered.rowsInFitRangeAtLeast,
    `${cat.n} rows in the pack, ${nIn} in ${lo} to ${hi} AU`
  );
  const res = gapSurvey(cat.a, {
    gaps: WINDOWS,
    draws: A.numbered.draws,
    seed: A.numbered.seed,
    label: 'e1',
  });
  for (const g of res.gaps) {
    const tag = `e1.window.${g.id}`;
    reported(
      tag,
      g.depletion,
      `depletion ${g.depletion.toFixed(3)}, interval ${g.lo?.toFixed(3)} to ${g.hi?.toFixed(3)}, ${g.nObs} found of ${g.nExp.toFixed(1)} expected, verdict ${g.verdict}${g.reason ? ` (${g.reason})` : ''}, warnings ${g.warnings.join(' ') || 'none'}`
    );
  }
  for (const id of bd.resolvedGaps) {
    const g = res.gaps[idx(id)];
    exact(`e1.verdict.${id}`, g.verdict === 'resolved', `verdict ${g.verdict}`);
    inBand(`e1.depth.${id}`, g.depletion, bd.depletionBand);
  }
  const ref = read('oracle-real-results.json');
  const point = gapSurvey(cat.a, { gaps: WINDOWS, draws: 0 });
  let worst = 0;
  let nobs = 0;
  ref.gaps.forEach((g, k) => {
    worst = Math.max(worst, Math.abs(point.gaps[k].depletion - g.depletion));
    nobs += Math.abs(point.gaps[k].nObs - g.nObs);
  });
  within(
    'e1.oracle',
    worst,
    bd.oracleAbsolute,
    'five windows against the scipy fit on the real cut'
  );
  within('e1.oracle.counts', nobs, 0);
  // the c2 form on the real cut
  const aIn = Float64Array.from(cat.a.filter(a => a >= lo && a < hi));
  const dHat = point.gaps[idx('3:1')].depletion;
  const u = rng('e1-resample');
  let cover = 0;
  for (let r = 0; r < bd.resamples; r++) {
    const re = new Float64Array(aIn.length);
    for (let k = 0; k < re.length; k++)
      re[k] = aIn[Math.min(re.length - 1, Math.floor(u() * re.length))];
    const o = survey(re, `e1c-${r}`, { draws: bd.innerDraws }).gaps?.[
      idx('3:1')
    ];
    if (o && o.lo !== null && o.lo <= dHat && dHat <= o.hi) cover++;
  }
  inBand(
    'e1.coverage',
    cover / bd.resamples,
    bd.bootstrapCoverage,
    `D_hat ${dHat.toFixed(3)}`
  );
  const rowsIn = Array.from(cat.a, (a, k) => ({ a, e: cat.e[k], i: cat.i[k] }));
  const table = countClasses(rowsIn);
  atLeast(
    'e1.populations.hilda',
    table.counts.hilda,
    bd.hildasAtLeast,
    'Hildas by the class rule (an a-e-i box, not a libration test)'
  );
  atLeast(
    'e1.populations.trojan',
    table.counts.trojan,
    bd.trojansAtLeast,
    'Jupiter Trojans by the class rule'
  );
  reported('e1.populations.table', table.total, JSON.stringify(table.counts));
  // The selection: the 3:1 depletion on the brighter H < 11 subset, reported.
  const bright = Float64Array.from(cat.a.filter((a, k) => cat.H[k] < 11));
  const rb = gapSurvey(bright, { gaps: WINDOWS, draws: 0 });
  reported(
    'e1.selection.H11',
    rb.status === 'ok' ? rb.gaps[idx('3:1')].depletion : NaN,
    `the 3:1 depletion on the ${bright.length} objects with H < 11 (the H < 13 cut gives ${dHat.toFixed(3)}): the same gap in a brighter cut`
  );
}

function kuiper() {
  const bd = C['e3.kuiper'].bounds;
  const pack = JSON.parse(
    readFileSync(path.join(HERE, '..', R.authentic.kuiper.file), 'utf8')
  );
  const cat = catalogFromPack(pack);
  atLeast('e3.rows', cat.n, bd.rowsAtLeast, `${cat.n} rows in the pack`);
  exact(
    'e3.wellObserved',
    pack.minDataArcDays > bd.dataArcDaysAbove,
    `the shortest data arc is ${pack.minDataArcDays} days`
  );
  const rowsIn = Array.from(cat.a, (a, k) => ({ a, e: cat.e[k], i: cat.i[k] }));
  const table = countClasses(rowsIn).counts;
  atLeast(
    'e3.plutino',
    table.plutino,
    bd.plutinoAtLeast,
    'objects in the plutino a-window (a proxy for the 3:2 resonance)'
  );
  atLeast(
    'e3.twotino',
    table.twotino,
    bd.twotinoAtLeast,
    'objects in the twotino a-window'
  );
  atLeast(
    'e3.classical',
    table.kuiperClassical,
    bd.classicalAtLeast,
    'objects in the classical box'
  );
  const aN = PLANETS.neptune.aAu;
  const win = c =>
    cat.a.filter(a => a >= c - bd.windowHalfAu && a < c + bd.windowHalfAu)
      .length;
  const span = (lo, hi) => cat.a.filter(a => a >= lo && a < hi).length;
  const conc = c => {
    const lo = c - bd.windowHalfAu;
    const hi = c + bd.windowHalfAu;
    const fl =
      (span(lo - bd.flankWidthAu, lo) + span(hi, hi + bd.flankWidthAu)) / 2;
    return { n: win(c), flank: fl, factor: win(c) / Math.max(fl, 0.5) };
  };
  const plu = conc(aN * Math.pow(1.5, 2 / 3));
  const two = conc(aN * Math.pow(2, 2 / 3));
  atLeast(
    'e3.concentration',
    plu.factor,
    bd.concentrationFactor,
    `plutino window ${plu.n} against a flank mean of ${plu.flank}`
  );
  reported(
    'e3.concentration.twotino',
    two.factor,
    `twotino window ${two.n} against a flank mean of ${two.flank}: reported, not bounded`
  );
  const ref = read('oracle-kuiper-results.json');
  const same =
    ref.n === cat.n &&
    ref.plutino === table.plutino &&
    ref.twotino === table.twotino &&
    ref.classical === table.kuiperClassical &&
    ref.plutinoFlankLow + ref.plutinoFlankHigh === 2 * plu.flank;
  exact(
    'e3.oracle',
    same,
    'the class counts and the plutino flanks against an independent numpy count of the same file'
  );
  reported('e3.table', cat.n, JSON.stringify(table));
}

// ---- the run ----------------------------------------------------------------------

const GROUPS = {
  fast: [
    defaults,
    axes,
    roundTrip,
    lightCurveClosed,
    boundIsABound,
    baselineExact,
    classPartition,
    oracle,
    populationCounts,
    refusals,
    selectionAnalytic,
    oneMaximum,
    negativeCurves,
  ],
  belt: [beltEnsembles],
  authentic: [authentic, kuiper],
  'curves-0.01': [() => curveEnsemble(0.01)],
  'curves-0.03': [() => curveEnsemble(0.03)],
};
const ORDER = ['fast', 'belt', 'curves-0.01', 'curves-0.03', 'authentic'];

/** The rows of one group (or all, serially), as the tests and the command line read them. */
export function runValidation(group = null) {
  rows.length = 0;
  for (const g of group ? [group] : ORDER) for (const fn of GROUPS[g]) fn();
  if (!group || group === 'fast') notRuns();
  return rows.slice();
}

/** Every group, two child processes at a time, the rows merged in the committed order. */
function runParallel() {
  const jobs = ORDER.map(g => ({ g, out: '', rows: [] }));
  // The slow groups first, the quick one last, two at a time.
  const queue = [
    ...jobs.filter(j => j.g !== 'fast'),
    ...jobs.filter(j => j.g === 'fast'),
  ];
  const run = job =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(import.meta.url), '--json', `--group=${job.g}`],
        {
          stdio: ['ignore', 'pipe', 'inherit'],
        }
      );
      child.stdout.on('data', d => (job.out += d));
      child.on('close', () => {
        try {
          job.rows = JSON.parse(job.out);
          resolve();
        } catch (e) {
          reject(new Error(`group ${job.g} failed: ${e.message}`));
        }
      });
    });
  const worker = async () => {
    while (queue.length) await run(queue.shift());
  };
  return Promise.all([worker(), worker()]).then(() =>
    jobs.flatMap(j => j.rows)
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const groupArg = process.argv.find(a => a.startsWith('--group='))?.slice(8);
  const out = groupArg ? runValidation(groupArg) : await runParallel();
  if (process.argv.includes('--record') && !groupArg)
    writeFileSync(
      path.join(FIX, 'record.json'),
      `${JSON.stringify({ format: 'gravitas.small-bodies-record/1', prompt: 198, what: 'The rows of the full run (npm run small-bodies:validate -- --record), including the ensembles the Jest suite does not rerun. tests/smallBodies.test.js reruns the fast and authentic groups live and holds them to these rows.', rows: out }, null, 1)}\n`
    );
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag = r.pass === null ? 'NOT RUN' : r.pass ? 'pass' : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(9)}${r.id.padEnd(34)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
