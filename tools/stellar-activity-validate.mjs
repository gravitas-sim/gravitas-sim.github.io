#!/usr/bin/env node
// =============================================================================
// The stellar activity kernel against its committed thresholds (Prompt 220)
// -----------------------------------------------------------------------------
//   npm run activity:validate                    print the table
//   npm run activity:validate -- --json          print it as JSON
//   npm run activity:validate -- --write-failed  rewrite tests/fixtures/stellar-activity/failed-legs.json
//   npm run activity:validate -- --only A1,C1    run the rows whose id starts with one of these
//
// tests/fixtures/stellar-activity/thresholds.json fixed every bound before js/kernels/activity/
// existed; this runs the checks against the kernel and judges them against the bounds read
// from that file. The oracle rows read the results pinned in oracle-results.json
// (tools/stellar-activity-oracle/oracle.py: a pixel sum, Astropy's LombScargle and a numpy
// flare rule, no Gravitas code). A crossed bound is a failed row, left failing in
// failed-legs.json. The authentic rows (E) read the packs of AU Mic and EK Draconis and are
// NOT RUN when a pack is absent.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/activity/index.js';
import { findPeriod, periodogram } from '../js/kernels/variables/period.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/stellar-activity';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const ORA = read(`${FIX}/oracle-results.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEED = THRESHOLDS.seeds.ensemble;
const DEG = Math.PI / 180;

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });

const draw = (tag, i) => stream('injection', SEED, tag, i);
const noiseOf = (tag, i) => gaussian(stream('noise', SEED, tag, i));
const uni = (r, a, b) => a + (b - a) * r();
const grid = (T, minutes, t0 = 0) =>
  Float64Array.from({ length: Math.floor((T * 1440) / minutes) }, (_, i) => t0 + (i * minutes) / 1440);
const withNoise = (flux, sigma, noise) => Float64Array.from(flux, v => v + sigma * noise());
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- (a) analytic ----------------------------------------------------------------

function legA() {
  // A1: the centre of the disc, closed form
  {
    let worst = 0;
    for (const [u1, u2] of [[0, 0], [0.4, 0.22], [0.7, 0.1]])
      for (const rho of [5, 10, 20, 40, 60, 85]) {
        const c0 = 1 - u1 - u2;
        const c1 = u1 + 2 * u2;
        const c2 = -u2;
        const G = x => (c0 * x * x) / 2 + (c1 * x ** 3) / 3 + (c2 * x ** 4) / 4;
        const exact = (2 * Math.PI * (G(1) - G(Math.cos(rho * DEG)))) / K.discLight(u1, u2);
        worst = Math.max(worst, rel(K.spotDeficit(0, rho * DEG, u1, u2), exact));
      }
    row('A1.centre', worst <= lim('A1.centre').maxRelativeError, { maxRelativeError: worst });
  }
  // A2: a hemisphere-sized spot
  {
    let worst = 0;
    for (const [u] of [[[0, 0]], [[0.4, 0.22]]])
      for (const c of [0, 0.3, 0.8]) {
        const f = K.spottedFlux([0], { period: 3, inc: 90, u, spots: [{ lat: 0, lon: 0, radius: 90, contrast: c }] });
        worst = Math.max(worst, Math.abs(f[0] - c));
      }
    row('A2.full', worst <= lim('A2.full').maxAbsError, { maxAbsError: worst });
  }
  // A3: hidden and continuous
  {
    const hidden = K.spotDeficit(100 * DEG, 8 * DEG);
    const centre = K.spotDeficit(0, 15 * DEG);
    let jump = 0;
    let prev = K.spotDeficit(60 * DEG, 15 * DEG);
    for (let g = 60.01; g <= 120; g += 0.01) {
      const d = K.spotDeficit(g * DEG, 15 * DEG);
      jump = Math.max(jump, Math.abs(d - prev));
      prev = d;
    }
    const L = lim('A3.hidden');
    row('A3.hidden', hidden === L.hiddenAbsError && jump / centre <= L.maxStepRelative, {
      hidden,
      maxStepRelative: jump / centre,
    });
  }
  // A4: periodic and mirror-symmetric
  {
    const P = 3.7;
    const spec = { period: P, inc: 90, spots: [{ lat: 0, lon: 0, radius: 15, contrast: 0.4 }] };
    const t = Float64Array.from({ length: 200 }, (_, i) => (i * 0.37) % P);
    const a = K.spottedFlux(t, spec);
    const b = K.spottedFlux(Float64Array.from(t, v => v + P), spec);
    const c = K.spottedFlux(Float64Array.from(t, v => P - v), spec);
    let w = 0;
    for (let i = 0; i < t.length; i++) w = Math.max(w, Math.abs(a[i] - b[i]), Math.abs(a[i] - c[i]));
    row('A4.periodic', w <= lim('A4.periodic').maxAbsError, { maxAbsError: w });
  }
  // A5: antipodal spots
  {
    const P = 2.5;
    const spec = {
      period: P,
      inc: 90,
      spots: [
        { lat: 0, lon: 0, radius: 12, contrast: 0.5 },
        { lat: 0, lon: 180, radius: 12, contrast: 0.5 },
      ],
    };
    const t = Float64Array.from({ length: 200 }, (_, i) => i * 0.0917);
    const a = K.spottedFlux(t, spec);
    const b = K.spottedFlux(Float64Array.from(t, v => v + P / 2), spec);
    let w = 0;
    for (let i = 0; i < t.length; i++) w = Math.max(w, Math.abs(a[i] - b[i]));
    const tt = Float64Array.from({ length: 400 }, (_, i) => (8 * P * i) / 400);
    const ff = K.spottedFlux(tt, spec);
    const pk = findPeriod(tt, ff, { minPeriod: 0.5, maxPeriod: 6 });
    const L = lim('A5.antipodal');
    row('A5.antipodal', w <= L.maxAbsError && rel(pk.period, P / 2) <= L.peakRelativeError, {
      maxAbsError: w,
      peakRelativeError: rel(pk.period, P / 2),
    });
  }
  // A6: shear
  {
    const Peq = 3;
    const k = 0.2;
    const Plat = Peq / (1 - k * Math.sin(50 * DEG) ** 2);
    const spec = { period: Peq, shear: k, inc: 70, spots: [{ lat: 50, lon: 10, radius: 14, contrast: 0.5 }] };
    const t = Float64Array.from({ length: 200 }, (_, i) => i * 0.0431);
    const a = K.spottedFlux(t, spec);
    const b = K.spottedFlux(Float64Array.from(t, v => v + Plat), spec);
    let w = 0;
    for (let i = 0; i < t.length; i++) w = Math.max(w, Math.abs(a[i] - b[i]));
    row('A6.shear', w <= lim('A6.shear').maxAbsError, { maxAbsError: w, Plat });
  }
  // A7: the template's integral and its exposure integration
  {
    const L = lim('A7.template');
    let num = 0;
    const h = 1e-4;
    for (let x = -1; x < 80; x += h) num += K.flareTemplate(x + h / 2) * h;
    const analytic = rel(K.TEMPLATE_INTEGRAL, 1.827046);
    const numeric = rel(num, K.TEMPLATE_INTEGRAL);
    let worst = 0;
    for (const th of [10, 30, 90]) {
      const cadence = 2 / 1440;
      const lead = Math.ceil((1.5 * th) / 2);
      const t = Float64Array.from({ length: Math.ceil((60 * th) / 2) + lead + 20 }, (_, i) => (i - lead) * cadence);
      const prof = K.flareProfile(t, { tPeak: 0, tHalf: th / 1440, amp: 1 }, cadence, 30);
      let sum = 0;
      for (const v of prof) sum += v;
      const ed = sum * cadence;
      worst = Math.max(worst, rel(ed / (th / 1440), 1.827046));
    }
    row('A7.template', Math.max(analytic, numeric) <= L.analyticRelative && worst <= L.sampledRelative, {
      analyticRelative: analytic,
      numericRelative: numeric,
      sampledRelative: worst,
    });
  }
  // A8: a boxcar
  {
    const dt = 0.5 / 1440;
    const n = 400;
    const t = Float64Array.from({ length: n }, (_, i) => i * dt);
    const f = new Float64Array(n).fill(1);
    const a = 100;
    const b = a + 39;
    for (let i = a; i <= b; i++) f[i] = 1.02;
    const q = new Float64Array(n).fill(1);
    const ed = K.equivalentDuration(t, f, q, a, b);
    const truth = 0.02 * 20 * 60;
    row('A8.edBox', rel(ed, truth) <= lim('A8.edBox').maxRelative, { ed, truth, relative: rel(ed, truth) });
  }
  // A9: the slope
  {
    const L = lim('A9.slope');
    const s3 = K.powerLawSlope([1, 2, 4], 1);
    const s7 = K.powerLawSlope([1, 2, 4, 8, 16, 32, 64], 1);
    const a = Math.abs(s3.alpha - (1 + 3 / Math.log(8)));
    const S = 21 * Math.log(2);
    const lo = 1 + 5.629 / (2 * S);
    const hi = 1 + 26.119 / (2 * S);
    const iv = Math.max(Math.abs(s7.interval[0] - lo), Math.abs(s7.interval[1] - hi));
    row('A9.slope', a <= L.alphaAbsError && iv <= L.intervalAbsError, { alphaAbsError: a, intervalAbsError: iv, interval: s7.interval });
  }
}

// ---- (b) oracle -------------------------------------------------------------------

function legB() {
  {
    const L = lim('B1.spotOracle');
    let worst = 0;
    let worstAbs = 0;
    let fails = 0;
    for (const { config: [g, r, u1, u2], deficit } of ORA.spotDeficits) {
      const k = K.spotDeficit(g * DEG, r * DEG, u1, u2);
      const d = Math.abs(k - deficit);
      const ok = d <= L.orAbsolute || d <= L.maxRelativeDeficit * deficit;
      if (!ok) fails++;
      worst = Math.max(worst, deficit > 0 ? d / deficit : 0);
      worstAbs = Math.max(worstAbs, d);
    }
    row('B1.spotOracle', fails === 0, { configs: ORA.spotDeficits.length, failures: fails, maxRelative: worst, maxAbsolute: worstAbs });
  }
  const t = Float64Array.from({ length: 600 }, (_, i) => (24 * i) / 600);
  const pinned = THRESHOLDS.oracle.curves.pinnedPeriods;
  {
    const L = lim('B2.periodogram');
    let peak = 0;
    let pw = 0;
    for (const c of ORA.curves) {
      const y = Float64Array.from(c.flux);
      const found = findPeriod(t, y, { minPeriod: 0.5, maxPeriod: 12, oversample: 8 });
      peak = Math.max(peak, rel(found.period, c.peakPeriod));
      const p = periodogram(t, y, pinned);
      pinned.forEach((P, j) => {
        pw = Math.max(pw, Math.abs(p[j] - c.powerAt[String(P)]));
      });
    }
    row('B2.periodogram', peak <= L.peakRelative && pw <= L.powerAbs, { peakRelative: peak, maxPowerDifference: pw });
  }
  {
    const L = lim('B3.flareOracle');
    const fc = read(`${FIX}/flare-curve.json`);
    const n = fc.flux.length;
    const tt = Float64Array.from({ length: n }, (_, i) => fc.t0 + i * fc.cadenceDays);
    const kern = K.detectFlares(tt, Float64Array.from(fc.flux), 1e-3, { period: fc.period });
    const cmp = compareFlares(kern.flares, ORA.flareCurve.flares, fc.cadenceDays);
    row('B3.flareOracle', cmp.fracKernel >= L.minMatchedFraction && cmp.fracOracle >= L.minMatchedFraction && cmp.medianEd <= L.maxMedianEdDifference, {
      kernel: kern.flares.length,
      oracle: ORA.flareCurve.flares.length,
      ...cmp,
    });
  }
  {
    const L = lim('B4.periodOracle');
    let worst = 0;
    ORA.curves.forEach(c => {
      const r = K.rotationPeriod(t, Float64Array.from(c.flux), { minPeriod: 0.5, maxPeriod: 12 });
      const p = r.period ?? r.peak?.period;
      worst = Math.max(worst, rel(p, c.peakPeriod));
    });
    row('B4.periodOracle', worst <= L.maxRelative, { maxRelative: worst });
  }
  {
    const L = lim('B5.harmonicOracle');
    let worst = 0;
    ORA.curves.forEach(c => {
      const r = K.rotationPeriod(t, Float64Array.from(c.flux), { minPeriod: 0.5, maxPeriod: 12 });
      worst = Math.max(worst, rel(r.period, c.harmonicPeriod));
    });
    row('B5.harmonicOracle', worst <= L.maxRelative, { maxRelative: worst, scope: 'the three curves (the authentic series are in E1 and E3)' });
  }
}

function compareFlares(a, b, cadence) {
  const tol = 3 * cadence;
  let ma = 0;
  const eds = [];
  for (const x of a) {
    const y = b.find(o => Math.abs(o.tPeak - x.tPeak) <= tol);
    if (y) {
      ma++;
      eds.push(Math.abs(x.edWindow - y.edSeconds) / y.edSeconds);
    }
  }
  let mb = 0;
  for (const y of b) if (a.some(x => Math.abs(x.tPeak - y.tPeak) <= tol)) mb++;
  eds.sort((p, q) => p - q);
  return {
    fracKernel: a.length ? ma / a.length : 0,
    fracOracle: b.length ? mb / b.length : 0,
    medianEd: eds.length ? eds[eds.length >> 1] : NaN,
  };
}

// ---- (c) coverage -------------------------------------------------------------------

const spotStar = (r, twoSpots) => {
  const P = uni(r, 0.8, 12);
  const inc = uni(r, 50, 90);
  const lat1 = uni(r, -60, 60);
  const spots = [{ lat: lat1, lon: uni(r, 0, 360), radius: uni(r, 6, 15), contrast: 0.6 }];
  if (twoSpots) {
    const sep = uni(r, 60, 120);
    spots.push({ lat: uni(r, -60, 60), lon: spots[0].lon + sep, radius: uni(r, 6, 15), contrast: 0.6 });
  }
  return { P, inc, spots };
};

function legC1() {
  const n = lim('C1.periodCoverage').n;
  let answered = 0;
  let covered = 0;
  const verdicts = {};
  for (let i = 0; i < n; i++) {
    const r = draw('C1', i);
    const { P, inc, spots } = spotStar(r, i % 3 === 1);
    const sigma = i % 2 ? 3e-3 : 1e-3;
    const t = grid(27, 30);
    const y = withNoise(K.spottedFlux(t, { period: P, inc, spots }), sigma, noiseOf('C1', i));
    const res = K.rotationPeriod(t, y, { minPeriod: 0.5, maxPeriod: 14 });
    verdicts[res.verdict] = (verdicts[res.verdict] ?? 0) + 1;
    if (res.period !== null && res.interval) {
      answered++;
      if (P >= res.interval[0] && P <= res.interval[1]) covered++;
    }
  }
  const cov = answered ? covered / answered : 0;
  row('C1.periodCoverage', cov >= lim('C1.periodCoverage').minCoverage, { coverage: cov, answered, n, verdicts });
}

const flareCurve = (r, noise, nFlares, T = 3, sigma = 1e-3) => {
  const cad = 2 / 1440;
  const n = Math.floor(T / cad);
  const t = Float64Array.from({ length: n }, (_, i) => i * cad);
  const f = new Float64Array(n).fill(1);
  const truth = [];
  for (let k = 0; k < nFlares; k++) {
    const tPeak = ((k + 0.5) / nFlares) * T * 0.9 + 0.2 + 0.1 * r();
    const amp = uni(r, 12, 40) * sigma;
    const tHalf = uni(r, 8, 40) / 1440;
    const prof = K.flareProfile(t, { tPeak, tHalf, amp }, cad);
    for (let i = 0; i < n; i++) f[i] += prof[i];
    truth.push({ tPeak, amp, tHalf, ed: amp * tHalf * K.TEMPLATE_INTEGRAL * 86400 });
  }
  for (let i = 0; i < n; i++) f[i] += sigma * noise();
  return { t, f, truth, cad };
};

function legC2() {
  const L = lim('C2.edCoverage');
  let injected = 0;
  let detected = 0;
  let covered = 0;
  for (let i = 0; injected < 300; i++) {
    const r = draw('C2', i);
    const nF = 1 + Math.floor(r() * 3);
    const { t, f, truth, cad } = flareCurve(r, noiseOf('C2', i), nF);
    const res = K.detectFlares(t, f, 1e-3, {});
    for (const x of truth) {
      injected++;
      const m = res.flares.find(d => Math.abs(d.tPeak - x.tPeak) <= 3 * cad);
      if (m) {
        detected++;
        if (Math.abs(m.ed - x.ed) <= 1.96 * m.edSigma) covered++;
      }
    }
  }
  const cov = detected ? covered / detected : 0;
  row('C2.edCoverage', cov >= L.minCoverage && detected / injected >= L.minDetectedFraction, { coverage: cov, detectedFraction: detected / injected, injected });
}

function legC3() {
  const L = lim('C3.slopeCoverage');
  let hit = 0;
  for (let i = 0; i < L.n; i++) {
    const r = draw('C3', i);
    const xs = Array.from({ length: 50 }, () => (1 - r()) ** (-1 / 0.8));
    const s = K.powerLawSlope(xs, 1);
    if (s.interval[0] <= 1.8 && 1.8 <= s.interval[1]) hit++;
  }
  row('C3.slopeCoverage', hit / L.n >= L.minCoverage, { coverage: hit / L.n, n: L.n });
}

function legC4() {
  const L = lim('C4.completeness');
  const cad = 2 / 1440;
  const n = 3000;
  const sigma = 1e-3;
  const table = [];
  const graded = [
    [8, 30],
    [12, 10],
    [12, 30],
    [20, 10],
    [20, 30],
  ];
  let allOk = true;
  for (const a of [5, 8, 12, 20])
    for (const h of [4, 10, 30]) {
      let inj = 0;
      let rec = 0;
      for (let c = 0; c < 20; c++) {
        const r = draw('C4', `${a}-${h}-${c}`);
        const noise = noiseOf('C4', `${a}-${h}-${c}`);
        const t = Float64Array.from({ length: n }, (_, i) => i * cad);
        const f = new Float64Array(n).fill(1);
        const truth = [];
        for (let k = 0; k < 10; k++) {
          const tPeak = 0.4 + k * (n * cad - 0.8) / 10 + 0.1 * r();
          const prof = K.flareProfile(t, { tPeak, tHalf: h / 1440, amp: a * sigma }, cad);
          for (let i = 0; i < n; i++) f[i] += prof[i];
          truth.push(tPeak);
        }
        for (let i = 0; i < n; i++) f[i] += sigma * noise();
        const res = K.detectFlares(t, f, sigma, {});
        for (const tp of truth) {
          inj++;
          if (res.flares.some(d => Math.abs(d.tPeak - tp) <= 3 * cad)) rec++;
        }
      }
      const c = rec / inj;
      table.push({ ampSigma: a, tHalfMin: h, completeness: c, n: inj });
      if (graded.some(([ga, gh]) => ga === a && gh === h) && c < L.minCompletenessGraded) allOk = false;
    }
  let fp = 0;
  for (let c = 0; c < 40; c++) {
    const noise = noiseOf('C4fp', c);
    const t = Float64Array.from({ length: n }, (_, i) => i * cad);
    const f = Float64Array.from(t, () => 1 + sigma * noise());
    fp += K.detectFlares(t, f, sigma, {}).flares.length;
  }
  const fpRate = (fp / (40 * n)) * 1000;
  row('C4.completeness', allOk && fpRate <= L.maxFalsePerThousandPoints, { table, falsePerThousandPoints: fpRate, falseTotal: fp });
}

// ---- (d) misspecified and negative -----------------------------------------------------

function legD() {
  {
    const L = lim('D1.noise');
    let none = 0;
    for (let i = 0; i < 200; i++) {
      const noise = noiseOf('D1', i);
      const t = Float64Array.from({ length: 400 }, (_, j) => (27 * j) / 400);
      const y = Float64Array.from(t, () => 1 + 1e-3 * noise());
      if (K.rotationPeriod(t, y, { minPeriod: 0.5, maxPeriod: 13.5 }).verdict === 'no-signal') none++;
    }
    row('D1.noise', none / 200 >= L.minNoSignalFraction, { fraction: none / 200 });
  }
  {
    let ok = 0;
    for (let i = 0; i < 50; i++) {
      const r = draw('D2', i);
      const t = grid(15, 30);
      const y = withNoise(
        K.spottedFlux(t, { period: 12, inc: 70, spots: [{ lat: uni(r, 10, 50), lon: uni(r, 0, 360), radius: 12, contrast: 0.6 }] }),
        1e-3,
        noiseOf('D2', i)
      );
      const res = K.rotationPeriod(t, y, { minPeriod: 0.5, maxPeriod: 15 });
      if (res.verdict === 'not-constrained' && res.period === null) ok++;
    }
    row('D2.shortBaseline', ok / 50 >= lim('D2.shortBaseline').minFraction, { fraction: ok / 50 });
  }
  const antipodal = (tag, radii, n) => {
    let pairOk = 0;
    let primaryOk = 0;
    let peakOk = 0;
    let excluded = 0;
    for (let i = 0; i < n; i++) {
      const r = draw(tag, i);
      const P = uni(r, 2, 9);
      const t = grid(27, 30);
      const y = withNoise(
        K.spottedFlux(t, {
          period: P,
          inc: 90,
          spots: [
            { lat: 0, lon: 0, radius: radii[0], contrast: 0.6 },
            { lat: 0, lon: 180, radius: radii[1], contrast: 0.6 },
          ],
        }),
        1e-3,
        noiseOf(tag, i)
      );
      const res = K.rotationPeriod(t, y, { minPeriod: 0.5, maxPeriod: 13.5 });
      if (res.peak && rel(res.peak.period, P / 2) < 0.02) peakOk++;
      if (res.candidates.some(c => rel(c.period, P) < 0.01) && res.candidates.length >= 2) pairOk++;
      if (res.period !== null && rel(res.period, P) < 0.01) primaryOk++;
      if (res.verdict === 'double-period') excluded++;
    }
    return { pairOk, primaryOk, peakOk, excluded, n };
  };
  {
    const m = antipodal('D3', [12, 12], 100);
    row('D3.doubleDipEqual', m.pairOk / m.n >= lim('D3.doubleDipEqual').minFraction && m.peakOk === m.n, m);
  }
  {
    const m = antipodal('D4', [16, 9], 100);
    row('D4.doubleDipUnequal', m.primaryOk / m.n >= lim('D4.doubleDipUnequal').minFraction && m.excluded / m.n >= 0.95, m);
    const m2 = antipodal('D4b', [12, 10.5], 100);
    const f = lim('D4b.doubleDipSlightlyUnequal').minFraction;
    row('D4b.doubleDipSlightlyUnequal', m2.primaryOk / m2.n >= f && m2.excluded / m2.n >= f && m2.peakOk / m2.n >= f, m2);
  }
  {
    const L = lim('D5.evolving');
    const widen = evolving => {
      const w = [];
      for (let i = 0; i < 100; i++) {
        const r = draw(evolving ? 'D5e' : 'D5s', i);
        const P = uni(r, 2, 8);
        const t = grid(27, 30);
        const spot = { lat: uni(r, 10, 50), lon: uni(r, 0, 360), radius: uni(r, 10, 16), contrast: 0 };
        const D = K.spottedFlux(t, { period: P, inc: uni(r, 60, 90), spots: [spot] }).map(v => 1 - v);
        const y = Float64Array.from(t, (tt, j) => {
          const c = evolving ? 0.55 + 0.4 * (tt / 27) : 0.75;
          return 1 - (1 - c) * D[j];
        });
        const noisy = withNoise(y, 3e-3, noiseOf(evolving ? 'D5e' : 'D5s', i));
        w.push(K.rotationPeriod(t, noisy, { minPeriod: 0.5, maxPeriod: 14 }).widening);
      }
      return w.sort((a, b) => a - b);
    };
    const e = widen(true);
    const s = widen(false);
    const med = e[e.length >> 1];
    const p95 = s[Math.floor(0.95 * s.length)];
    row('D5.evolving', med >= L.minMedianWideningEvolving && p95 <= L.maxP95WideningStationary, { medianEvolving: med, p95Stationary: p95 });
  }
  {
    const L = lim('D6.spotsNotFlares');
    let clean = 0;
    let counted = 0;
    const found = [];
    for (let i = 0; counted < 50; i++) {
      const r = draw('D6', i);
      const P = uni(r, 0.6, 3);
      const spot = { lat: uni(r, 0, 50), lon: uni(r, 0, 360), radius: uni(r, 10, 22), contrast: 0.5 };
      const inc = uni(r, 60, 90);
      const t = grid(8, 2);
      const f0 = K.spottedFlux(t, { period: P, inc, spots: [spot] });
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of f0) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      const amp = hi - lo;
      if (amp < 0.03 || amp > 0.06) continue;
      counted++;
      const y = withNoise(f0, 1e-3, noiseOf('D6', i));
      const { rotation } = K.rotationFromLightCurve(t, y, { minPeriod: 0.3, maxPeriod: 8 });
      const res = K.detectFlares(t, y, 1e-3, { period: rotation.period });
      found.push(res.flares.length);
      if (res.flares.length === 0) clean++;
    }
    row('D6.spotsNotFlares', clean / 50 >= L.minFractionWithNoFlare, { fraction: clean / 50, flaresFound: found.filter(v => v).length });
  }
}

// ---- (e) authentic data -----------------------------------------------------------------

function loadPack(id) {
  const p = path.join(ROOT, 'data-packs', `${id}.json`);
  if (!existsSync(p)) return null;
  return null;
}

function legE() {
  const why = 'the authentic packs are not built yet (tools/data-packs/activity.mjs)';
  for (const id of ['E1.auMicPeriod', 'E2.auMicFlares', 'E3.ekDraPeriod', 'E4.auMicFfd']) notRun(id, why);
  void loadPack;
}

// ---- run ------------------------------------------------------------------------------------

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
const want = id => !only || only.some(o => id.startsWith(o));

const legs = [
  ['A', legA],
  ['B', legB],
  ['C1', legC1],
  ['C2', legC2],
  ['C3', legC3],
  ['C4', legC4],
  ['D', legD],
  ['E', legE],
];
for (const [name, fn] of legs) {
  if (only && !only.some(o => name.startsWith(o) || o.startsWith(name))) continue;
  const t0 = Date.now();
  fn();
  if (!argv.includes('--json')) process.stderr.write(`leg ${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
}
const shown = rows.filter(r => want(r.id));
if (argv.includes('--json')) console.log(JSON.stringify(shown, null, 2));
else
  for (const r of shown)
    console.log(`${r.status.padEnd(8)} ${r.id.padEnd(22)} ${JSON.stringify(r.measured)}${r.note ? ' ' + r.note : ''}`);
if (argv.includes('--write-failed')) {
  const failed = shown.filter(r => r.status === 'fail');
  writeFileSync(
    path.join(ROOT, FIX, 'failed-legs.json'),
    JSON.stringify({ format: 'gravitas.stellar-activity-failed-legs/1', failed }, null, 2) + '\n'
  );
}
process.exitCode = shown.some(r => r.status === 'fail') ? 1 : 0;
