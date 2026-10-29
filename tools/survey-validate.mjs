#!/usr/bin/env node
// =============================================================================
// The survey-design kernel against its committed thresholds (Prompt 215)
// -----------------------------------------------------------------------------
//   npm run survey:validate                    print the table
//   npm run survey:validate -- --json          print it as JSON
//   npm run survey:validate -- --write-failed  rewrite tests/fixtures/survey/failed-legs.json
//   npm run survey:validate -- --only=A1,B1    run the rows whose id starts with one of these
//
// tests/fixtures/survey/thresholds.json fixed every bound before js/kernels/survey/
// existed; this runs the checks against the kernel, the adapter and the existing
// authorities (js/kernels/detector/snr.js, Prompt 184's injection) and judges them
// against the bounds read from that file. The oracle rows read the results pinned in
// tests/fixtures/survey/oracle-results.json (tools/survey-oracle/oracle.py: NumPy,
// SciPy and Astropy, no Gravitas code). A crossed bound is a failed row, left failing
// in tests/fixtures/survey/failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/survey/index.js';
import {
  limitingMagnitude,
  skyRatePerPixel,
} from '../js/kernels/detector/snr.js';
import { surveySetupOf } from '../js/instruments/survey.js';
import { permits } from '../js/dataKinds/contract.js';
import { adapt } from '../js/measure/photometry.js';
import {
  run as injectRun,
  magnitudeOf,
  fluxForSnr,
} from '../js/measure/inject.js';
import { makeFrame } from './detection-synth.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/survey/thresholds.json');
const ORA = read('tests/fixtures/survey/oracle-results.json');
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const SET = THR.setups;
const CLS = THR.classes;
const NIGHT = THR.night;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = tag =>
  mulberry32(
    THR.seeds.harness + [...tag].reduce((s, c) => s + c.charCodeAt(0), 0)
  );

/** A Poisson draw: inversion below 12, Hoermann's transformed rejection (PTRS) above. */
function poisson(lambda, rng) {
  if (lambda < 12) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    return k - 1;
  }
  const b = 0.931 + 2.53 * Math.sqrt(lambda);
  const a = -0.059 + 0.02483 * b;
  const invAlpha = 1.1239 + 1.1328 / (b - 3.4);
  const vr = 0.9277 - 3.6224 / (b - 2);
  for (;;) {
    const u = rng() - 0.5;
    const v = rng();
    const us = 0.5 - Math.abs(u);
    const k = Math.floor(((2 * a) / us + b) * u + lambda + 0.43);
    if (us >= 0.07 && v <= vr) return k;
    if (k < 0 || (us < 0.013 && v > us)) continue;
    if (
      Math.log(v) + Math.log(invAlpha) - Math.log(a / (us * us) + b) <=
      -lambda + k * Math.log(lambda) - K.lnGamma(k + 1)
    )
      return k;
  }
}

const classOf = (name, extra = {}) => ({ id: name, ...CLS[name], ...extra });
const galaxies = () => ({
  ...CLS['galaxies-local'],
  ...K.CLASSES['galaxies-local'],
});

// ---- (a) analytic ----------------------------------------------------------------

function a1() {
  const l = lim('A1.euclid');
  const sch = CLS['galaxies-local'].schechter;
  let worst = 0;
  for (const m of l.magnitudes)
    worst = Math.max(
      worst,
      rel(K.euclidSchechterCount(m, sch), ORA.A1[String(m)])
    );
  const c = K.CLASSES['galaxies-local'];
  const slope = Math.log10(K.cumulative(c, 15) / K.cumulative(c, 14));
  row(
    'A1.euclid',
    worst <= l.maxRel && Math.abs(slope - l.slope) <= l.slopeTol,
    { worstRel: worst, slope }
  );
}

function a2() {
  const l = lim('A2.probit');
  let worst = 0;
  for (const alpha of l.alphas)
    for (const w of l.widths) {
      const cls = { n0: 1000, m0: 20, alpha, mMax: 99 };
      const a = alpha * Math.LN10;
      const f = m => K.normalCdf((l.mc - m) / w) * K.differential(cls, m);
      const q = K.integrate(f, l.mc - 40, l.mc + 8 * w + a * w * w + 2, 48);
      const closed = K.cumulative(cls, l.mc) * Math.exp((a * w) ** 2 / 2);
      worst = Math.max(worst, rel(q, closed));
    }
  row('A2.probit', worst <= l.maxRel, { worstRel: worst, cases: 9 });
}

const SKY = () => K.normalizeSetup(SET.skyLimited).setup;

function a3() {
  const l = lim('A3.skyLimited');
  const s = SKY();
  const gains = l.times.map(
    t => K.depthOf(s, 10 * t, 1, 5) - K.depthOf(s, t, 1, 5)
  );
  const worst = Math.max(...gains.map(g => Math.abs(g - l.gain)));
  row(
    'A3.skyLimited',
    worst <= l.tol,
    { gains, worst },
    'the gain approaches 1.25 from above as the sky takes over: 0.013 off at 400 s (the source shot noise is 3 percent of the sky variance at that depth), 0.004 at 4000 s'
  );
}

function a4() {
  const l = lim('A4.optimum');
  const setup = SET.skyLimited;
  const T = 30;
  const grid = Array.from(
    { length: 400 },
    (_, i) => 4 * (20000 / 4) ** (i / 399)
  );
  const out = [];
  let pass = true;
  for (const alpha of l.alphas) {
    const cls = { n0: 1000, m0: 20, alpha, mMax: 99 };
    // continuous pointings (T / cycle): the integer floor of the plan's arithmetic (A8) would jitter the analytic maximum (AM6)
    const seconds = T * NIGHT.hoursPerNight * 3600 * NIGHT.clearFraction;
    const counts = grid.map(t => {
      const r = K.evaluate({
        setup,
        plan: { exposure: t, visits: 1, nights: T },
        cls,
      });
      return (
        r.counts.perDeg2.sharp *
        (seconds / (t + setup.overhead)) *
        setup.fovDeg2
      );
    });
    let imax = 0;
    counts.forEach((c, i) => {
      if (c > counts[imax]) imax = i;
    });
    const predicted = K.optimumExposure(alpha, setup.overhead);
    if (Number.isFinite(predicted)) {
      const r = rel(grid[imax], predicted);
      out.push({ alpha, found: grid[imax], predicted, rel: r });
      if (r > l.maxRel) pass = false;
    } else {
      const rising = counts.every(
        (c, i) => i === 0 || c >= counts[i - 1] * (1 - 1e-12)
      );
      out.push({ alpha, interior: imax < 399, rising });
      if (!rising) pass = false;
    }
  }
  row(
    'A4.optimum',
    pass,
    out,
    'the closed form is the sky-limited limit: the real maximum is 15 and 19 percent above it for alpha 0.4 and 0.6 (AM6); A4b holds the kernel to the oracle'
  );
}

const SETB = () => ({
  ...SET.skyLimited,
  zeroPoint: SET.skyLimited.zeroPoint * 4,
  fwhm: SET.skyLimited.fwhm * 0.75,
});

function a5() {
  const l = lim('A5.timeRatio');
  const A = K.normalizeSetup(SET.skyLimited).setup;
  const B = K.normalizeSetup(SETB()).setup;
  const tA = K.exposureForDepth(A, 1, l.depth, 5);
  const tB = K.exposureForDepth(B, 1, l.depth, 5);
  const measured = tB / tA;
  const closed = K.skyLimitedRatio(A, B);
  const g = { zeroPoint: 1, ...SET.skyLimited };
  const goal = { depth: l.depth, areaDeg2: A.fovDeg2 };
  const r = K.timeToGoal({ setup: A, goal, exposure: tA });
  const rateOk =
    rel(r.ratePerHour, (A.fovDeg2 / (r.visits * (tA + A.overhead))) * 3600) <
    1e-12;
  row(
    'A5.timeRatio',
    rel(measured, closed) <= l.maxRel && rateOk,
    {
      kernelRatio: measured,
      closedForm: closed,
      rel: rel(measured, closed),
      rateOk,
    },
    'the closed form is the sky-limited limit (AM4); A5b is the exact one'
  );
  void g;
}

function a5b() {
  const l = lim('A5b.timeExact');
  const l5 = lim('A5.timeRatio');
  let worst = 0;
  const out = {};
  for (const [name, S, oracleT] of [
    ['A', SET.skyLimited, ORA.A5.tA],
    ['B', SETB(), ORA.A5.tB],
  ]) {
    const s = K.normalizeSetup(S).setup;
    const m = l5.depth;
    const F = s.zeroPoint * 10 ** (-0.4 * m);
    const V =
      K.matchedPixels(s) * skyRatePerPixel(s.zeroPoint, s.skyMag, s.pixelScale);
    const exact = (25 * (F + V)) / (F * F);
    const kernel = K.exposureForDepth(s, 1, m, 5);
    worst = Math.max(worst, rel(exact, oracleT), rel(kernel, oracleT));
    out[name] = { exact, oracle: oracleT, kernel };
  }
  row('A5b.timeExact', worst <= l.maxRel, { worstRel: worst, ...out });
}

function a6() {
  const l = lim('A6.falseRate');
  let worst = 0;
  for (const t of l.thetas)
    worst = Math.max(worst, rel(K.falseRate(t), ORA.A6[String(t)]));
  const s = K.normalizeSetup(SET.lcoLike).setup;
  const sig = s.fwhm / (2 * Math.sqrt(2 * Math.LN2));
  const elements = rel(
    K.elementsPerDeg2(s),
    3600 ** 2 / (4 * Math.PI * sig * sig)
  );
  row('A6.falseRate', worst <= l.maxRel && elements <= 1e-12, {
    worst,
    elements,
  });
}

function a7() {
  const l = lim('A7.poisson');
  let never = true;
  let exact = true;
  const excess = { 0.6827: [], 0.9545: [] };
  for (const lam of l.means)
    for (const level of l.levels) {
      const iv = K.poissonInterval(lam, level);
      const o = ORA.A7[`${lam}|${level}`];
      if (iv.lo !== o.lo || iv.hi !== o.hi) exact = false;
      if (iv.coverage < level - 1e-9) never = false;
      if (lam >= 12) excess[level].push(iv.coverage - level);
    }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const m = [0.6827, 0.9545].map(k => mean(excess[k]));
  row('A7.poisson', never && exact && m.every(v => v <= l.meanExcess), {
    neverBelow: never,
    equalsOracle: exact,
    meanExcess: m,
  });
}

function a8() {
  const g = THR.grids.b1;
  let exact = true;
  let worst = 0;
  const { hoursPerNight, clearFraction, threshold } = NIGHT;
  for (const s of g.setups)
    for (const t of g.exposures)
      for (const v of g.visits) {
        const S = SET[s];
        const r = K.evaluate({
          setup: S,
          plan: { exposure: t, visits: v, nights: g.nights },
          cls: classOf(g.class),
        });
        const pts = Math.floor(
          (g.nights * hoursPerNight * 3600 * clearFraction) /
            (v * (t + S.overhead))
        );
        if (r.pointings !== pts || r.areaDeg2 !== pts * S.fovDeg2)
          exact = false;
        const sn = K.normalizeSetup(S).setup;
        const p = {
          zeroPoint: sn.zeroPoint,
          npix: K.matchedPixels(sn),
          skyRate: skyRatePerPixel(sn.zeroPoint, sn.skyMag, sn.pixelScale),
          darkRate: sn.darkRate,
          readNoise: sn.readNoise,
          nExp: v,
        };
        worst = Math.max(
          worst,
          Math.abs(r.depth - limitingMagnitude(p, v * t, threshold))
        );
      }
  const l = lim('A8.area');
  row('A8.area', exact && worst <= l.depthTol, { exact, worstDepth: worst });
}

// ---- (b) the oracle ---------------------------------------------------------------

function a4b() {
  const l = lim('A4b.optimumOracle');
  const setup = SET.skyLimited;
  const grid = Array.from(
    { length: 400 },
    (_, i) => 4 * (20000 / 4) ** (i / 399)
  );
  const seconds = 30 * NIGHT.hoursPerNight * 3600 * NIGHT.clearFraction;
  const out = [];
  let pass = true;
  for (const alpha of lim('A4.optimum').alphas) {
    const cls = { n0: 1000, m0: 20, alpha, mMax: 99 };
    const counts = grid.map(t => {
      const r = K.evaluate({
        setup,
        plan: { exposure: t, visits: 1, nights: 30 },
        cls,
      });
      return (
        r.counts.perDeg2.sharp *
        (seconds / (t + setup.overhead)) *
        setup.fovDeg2
      );
    });
    let imax = 0;
    counts.forEach((c, i) => {
      if (c > counts[imax]) imax = i;
    });
    const o = ORA.A4b[alpha.toFixed(1)];
    const steps = Math.abs(imax - o.index);
    const rising = counts.every(
      (c, i) => i === 0 || c >= counts[i - 1] * (1 - 1e-12)
    );
    out.push({
      alpha,
      kernelIndex: imax,
      oracleIndex: o.index,
      steps,
      rising,
      oracleRising: o.rising,
    });
    if (steps > l.gridSteps || rising !== o.rising) pass = false;
  }
  row('A4b.optimumOracle', pass, out);
}

function b1() {
  const l = lim('B1.oracle');
  let dA = 0;
  let cR = 0;
  let fR = 0;
  ORA.B1.forEach(o => {
    const r = K.evaluate({
      setup: SET[o.setup],
      plan: {
        exposure: o.exposure,
        visits: o.visits,
        nights: THR.grids.b1.nights,
      },
      cls: classOf('test-power-law'),
    });
    dA = Math.max(dA, Math.abs(r.depth - o.depth));
    cR = Math.max(
      cR,
      rel(r.counts.detected, o.detected),
      rel(r.counts.sharp, o.sharp)
    );
    fR = Math.max(fR, rel(r.counts.falsePositives, o.falsePositives));
  });
  row('B1.oracle', dA <= l.depthAbs && cR <= l.countsRel && fR <= l.falseRel, {
    depthAbs: dA,
    countsRel: cR,
    falseRel: fR,
    plans: ORA.B1.length,
  });
}

function b2() {
  const l = lim('B2.cosmology');
  const sch = CLS['galaxies-local'].schechter;
  const ratios = l.magnitudes.map(
    m => K.euclidSchechterCount(m, sch) / ORA.B2[String(m)].lcdm
  );
  const per = l.magnitudes.map((m, i) => ({
    m,
    ratio: ratios[i],
    ok: ratios[i] >= l.ratioMin && ratios[i] <= l.ratioMax,
  }));
  row(
    'B2.cosmology',
    per.every(p => p.ok),
    per,
    'fails at 16.5; the class is reduced to mMax 15 (AM5)'
  );
}

function b3() {
  const l = lim('B3.injection');
  const FWHM = 3;
  const E = 30;
  const noise = Math.sqrt(90 + 64 + (1.5 * 1.5) / 12);
  const frame = makeFrame({
    seed: 'injection-184-survey-215',
    stars: [],
    detector: {},
  });
  const a = adapt(frame, permits);
  if (!a.ok) return notRun('B3.injection', `frame refused: ${a.code}`);
  const sc =
    4 *
    Math.exp(5 / (4 * Math.PI * (FWHM / (2 * Math.sqrt(2 * Math.LN2))) ** 2));
  const magOf = s => magnitudeOf(fluxForSnr(s, FWHM, noise), E);
  const r = injectRun(a, {
    seed: 'survey-215',
    count: 20,
    trials: 50,
    fwhm: FWHM,
    magnitude: { min: magOf(9), max: magOf(3) },
    binWidth: 0.25,
  });
  if (!r.ok) return notRun('B3.injection', `injection refused: ${r.code}`);
  const setup = {
    zeroPoint: 1,
    pixelScale: 1,
    fwhm: FWHM,
    skyMag: -2.5 * Math.log10(90 / E),
    readNoise: Math.sqrt(64 + (1.5 * 1.5) / 12),
    darkRate: 0,
    fullWell: 1e12,
    fovDeg2: 1,
    overhead: 0,
  };
  const s = K.normalizeSetup(setup).setup;
  const kernelM50 = K.magnitudeAtSnr(s, E, 1, sc);
  const injectionM50 = r.curve.m50.m;
  const diff = Math.abs(injectionM50 - kernelM50);
  row('B3.injection', diff <= l.m50Abs, { injectionM50, kernelM50, diff, sc });
}

function b4() {
  const l = lim('B4.density');
  const n = K.euclidSchechterCount(17.77, CLS['galaxies-local'].schechter);
  row('B4.density', n <= l.target * l.factor && n >= l.target / l.factor, {
    n,
  });
}

// ---- (c) ensemble -------------------------------------------------------------------

function c1() {
  const l = lim('C1.coverage');
  const plans = [
    ['skyLimited', 300, 1],
    ['lcoLike', 300, 1],
    ['rubinLike', 300, 1],
    ['lcoLike', 30, 4],
  ];
  const out = [];
  let pass = true;
  for (const [sname, t, v] of plans) {
    const setup = K.normalizeSetup(SET[sname]).setup;
    const cls = classOf('uniform-euclidean');
    const ev = K.evaluate({
      setup: SET[sname],
      plan: { exposure: t, visits: v, nights: 3 },
      cls,
    });
    const theta = NIGHT.threshold;
    const m = ev.counts.magnitudes;
    const mA = m.bright;
    const mEnd = m.faint;
    const nb = Math.ceil((mEnd - mA) / 0.005);
    const dm = (mEnd - mA) / nb;
    const bins = [];
    for (let i = 0; i < nb; i++) {
      const mid = mA + (i + 0.5) * dm;
      const C = K.completeness(K.snrOfMagnitude(setup, t, v, mid), theta);
      bins.push(K.differential(cls, mid) * dm * ev.areaDeg2 * C);
    }
    const brightN = K.cumulative(cls, mA) * ev.areaDeg2;
    const lambda = ev.counts.detected;
    const rng = rngFor(`C1-${sname}-${t}-${v}`);
    const draws = [];
    let c68 = 0;
    let c95 = 0;
    for (let i = 0; i < l.surveys; i++) {
      let k = poisson(brightN, rng);
      for (const b of bins) k += poisson(b, rng);
      draws.push(k);
      if (k >= ev.counts.interval68.lo && k <= ev.counts.interval68.hi) c68++;
      if (k >= ev.counts.interval95.lo && k <= ev.counts.interval95.hi) c95++;
    }
    const mean = draws.reduce((s, x) => s + x, 0) / draws.length;
    const se = Math.sqrt(lambda / l.surveys);
    const z = (mean - lambda) / se;
    const r = {
      plan: `${sname} ${t}s x${v}`,
      lambda,
      mean,
      z,
      cover68: c68 / l.surveys,
      cover95: c95 / l.surveys,
    };
    out.push(r);
    if (!(
      r.cover95 >= l.cover95Min &&
      r.cover68 >= l.cover68Min &&
      r.cover68 <= l.cover68Max &&
      Math.abs(z) <= l.meanSE
    ))
      pass = false;
  }
  row('C1.coverage', pass, out);
}

// ---- (d) misspecified and negative cases ---------------------------------------------

function d1() {
  const cls = classOf('test-power-law');
  let ok = 0;
  const bad = [];
  for (const o of ORA.D1) {
    const r = K.evaluate({
      setup: SET[o.setup],
      plan: { exposure: o.exposure, visits: 1, nights: o.nights },
      cls,
    });
    const v = K.assess(r, { depth: o.goalDepth, areaDeg2: o.goalArea });
    const same =
      v.feasible === o.feasible &&
      JSON.stringify([...v.reasons].sort()) === JSON.stringify(o.reasons);
    if (same) ok++;
    else
      bad.push({ setup: o.setup, name: o.name, kernel: v, oracle: o.reasons });
  }
  row('D1.feasible', ok === ORA.D1.length && ORA.D1.length === 10, {
    agree: ok,
    of: ORA.D1.length,
    bad,
  });
}

function d2() {
  const cases = [
    ['skyLimited', 300],
    ['lcoLike', 300],
    ['rubinLike', 300],
    ['lcoLike', 30],
  ];
  let ok = 0;
  for (const [s, t] of cases) {
    const r = K.evaluate({
      setup: SET[s],
      plan: { exposure: t, visits: 1, nights: 10 },
      cls: galaxies(),
    });
    if (
      r.status === 'outside-count-model' &&
      r.counts === null &&
      r.code === 'outside-count-model'
    )
      ok++;
  }
  row('D2.outsideModel', ok === 4, { ok });
}

function d3() {
  const base = {
    setup: SET.lcoLike,
    plan: { exposure: 300, visits: 1, nights: 10 },
    cls: classOf('steep'),
  };
  const cases = [
    ['exposure0', { plan: { ...base.plan, exposure: 0 } }, 'bad-exposure'],
    ['exposureNeg', { plan: { ...base.plan, exposure: -5 } }, 'bad-exposure'],
    ['threshold0', { plan: { ...base.plan, threshold: 0 } }, 'bad-threshold'],
    ['nights0', { plan: { ...base.plan, nights: 0 } }, 'bad-nights'],
    ['visits0', { plan: { ...base.plan, visits: 0 } }, 'bad-visits'],
    ['clear', { plan: { ...base.plan, clearFraction: 1.5 } }, 'bad-clear'],
    ['class', { cls: 'nonsense' }, 'unknown-class'],
  ];
  const out = {};
  let ok = 0;
  for (const [name, patch, code] of cases) {
    const r = K.evaluate({ ...base, ...patch });
    const clean =
      !r.ok && r.code === code && !JSON.stringify(r).includes('NaN');
    out[name] = clean;
    if (clean) ok++;
  }
  // the adapter's two: a facility that is not an imager, and a band the facility does not state
  let adapter = 0;
  try {
    surveySetupOf('gbt');
  } catch (e) {
    if (e.name === 'InstrumentTableError') adapter++;
  }
  try {
    surveySetupOf('rubin', { band: 'q', darkRate: 0.01 });
  } catch (e) {
    if (e.name === 'InstrumentTableError') adapter++;
  }
  const l = lim('D3.refusals');
  row('D3.refusals', ok + adapter >= l.cases && ok === 7 && adapter === 2, {
    kernel: out,
    adapter,
  });
}

function d4() {
  const l = lim('D4.reliability');
  const run = (list, name) => {
    let worstRel = 0;
    let flags = true;
    list.forEach(o => {
      const r = K.evaluate({
        setup: SET[o.setup],
        plan: {
          exposure: o.exposure,
          visits: 1,
          nights: 10,
          threshold: o.threshold,
        },
        cls: classOf(o.cls),
      });
      worstRel = Math.max(worstRel, rel(r.counts.reliability, o.reliability));
      if (r.counts.unreliable !== o.unreliable) flags = false;
    });
    return { name, worstRel, flags, n: list.length };
  };
  const a = run(ORA.D4, 'D4');
  row(
    'D4.reliability',
    a.flags && a.worstRel <= l.relTol && a.n === l.cases,
    a
  );
  const lb = lim('D4b.reliabilityRare');
  const b = run(ORA.D4b, 'D4b');
  row(
    'D4b.reliabilityRare',
    b.flags &&
      b.worstRel <= lb.relTol &&
      b.n === lb.cases &&
      ORA.D4b.some(o => o.unreliable),
    b
  );
}

function e1() {
  notRun(
    'E1.authentic',
    'the repository holds no real catalogue with a stated completeness and none is downloaded here'
  );
}

const ALL = [
  a1,
  a2,
  a3,
  a4,
  a5,
  a5b,
  a6,
  a7,
  a8,
  a4b,
  b1,
  b2,
  b3,
  b4,
  c1,
  d1,
  d2,
  d3,
  d4,
  e1,
];

export function runAll(only = null) {
  rows.length = 0;
  for (const f of ALL) f();
  return only
    ? rows.filter(r => only.some(p => r.id.startsWith(p)))
    : rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.slice(7);
  const out = runAll(onlyArg ? onlyArg.split(',') : null);
  if (process.argv.includes('--write-failed')) {
    const failed = out
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured, note: r.note }));
    const notMeasured = out
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, reason: r.note }));
    writeFileSync(
      path.join(ROOT, 'tests/fixtures/survey/failed-legs.json'),
      `${JSON.stringify({ note: 'Legs of tests/fixtures/survey/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).', failed, notMeasured }, null, 2)}\n`
    );
  }
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 2));
  else
    for (const r of out)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
  let recorded = [];
  try {
    recorded = read('tests/fixtures/survey/failed-legs.json').failed.map(
      f => f.id
    );
  } catch {
    // no record yet: every failure is new
  }
  process.exitCode = out.some(
    r => r.status === 'fail' && !recorded.includes(r.id)
  )
    ? 1
    : 0;
}
