#!/usr/bin/env node
// =============================================================================
// The visual-binary gate against its committed thresholds (Prompt 218 Part B)
// -----------------------------------------------------------------------------
//   npm run visual-binary:validate                      print the table and the verdict
//   npm run visual-binary:validate -- --json            print it as JSON
//   npm run visual-binary:validate -- --write-results   rewrite tests/fixtures/visual-binary/results.json
//   npm run visual-binary:validate -- --write-failed    rewrite tests/fixtures/visual-binary/failed-legs.json
//   npm run visual-binary:validate -- --write-oracle-inputs   rewrite tools/visual-binary-oracle/oracle-inputs.json
//   npm run visual-binary:validate -- --only=A1,C1      run the rows whose id starts with one of these
//
// tests/fixtures/visual-binary/thresholds.json fixed every bound, the systems, the seeds and
// the verdict rule before the kernel (js/measure/visualBinary.js) existed; the oracle
// (tools/visual-binary-oracle/oracle.py: numpy and scipy, no Gravitas code) pinned its
// results in oracle-results.json. A crossed bound is a failed row, left failing in
// failed-legs.json; the verdict is read mechanically from the rows.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { KEPLER_K, thieleInnesOf } from '../js/measure/orbit-fit.js';
import {
  companionRoots,
  massSumOf,
  photocentreFactor,
  photocentreFunction,
  photocentreOffsets,
  plugInSum,
  solvePhotocentre,
  solveResolved,
} from '../js/measure/visualBinary.js';
import { fitOrbit } from '../js/measure/orbit-fit.js';
import { gaussian, stream } from '../js/random/streams.js';
import { evenYears, jitteredYears, truePositions } from './orbit-fit-synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests/fixtures/visual-binary');
const THR = JSON.parse(readFileSync(path.join(FIX, 'thresholds.json'), 'utf8'));
const PREFIX = THR.seeds.ensemble;
const argv = process.argv.slice(2);
const flag = n => argv.includes(`--${n}`);
const only = (argv.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id => only.length === 0 || only.some(o => id.startsWith(o));

const RAD = Math.PI / 180;
const Z68 = 0.6827;

// ---- systems and series -----------------------------------------------------------

/** Elements in arcseconds, degrees and years from a system's masses, period and parallax. */
function elementsOf(s) {
  const aAu = Math.cbrt(((s.MA + s.MB) * s.P * s.P) / KEPLER_K);
  return {
    a: (aAu * s.parallaxMas) / 1000,
    e: s.e,
    i: s.i,
    Omega: s.Omega,
    omega: s.omega,
    P: s.P,
    T: s.T,
  };
}
const fractionOf = s => s.MB / (s.MA + s.MB);

const noiseOf = (label, seed) => gaussian(stream('noise', PREFIX, label, seed));
const timeOf = y => ({ value: y, format: 'year' });
const BARY = THR.sampling.barycentreNuisance;

/** A system's series. `kind`: components, relative or photocentre. */
function series(s, seed, { kind, spanFraction = 1.1, n = 16, swap = false } = {}) {
  const el = elementsOf(s);
  const B = fractionOf(s);
  const u = stream('experiments', PREFIX, 'epochs', s.name ?? 'sys', seed);
  const years = jitteredYears(s.start, spanFraction * s.P, n, u, 0.3);
  const rel = truePositions(el, years);
  const g = noiseOf(`${kind}-${s.name ?? 'sys'}`, seed);
  const sigma = 0.01 * (kind === 'photocentre' ? Math.abs(s.lB - B) * el.a : el.a);
  const sig = kind === 'photocentre' && !(sigma > 0) ? 0.01 * el.a : sigma;
  const epochs = years.map((y, k) => {
    const time = timeOf(y);
    const r = rel[k];
    if (kind === 'photocentre') {
      const f = photocentreFactor(B, s.lB);
      return {
        time,
        x: f * r.x + sig * g(),
        y: f * r.y + sig * g(),
        sigma: sig,
      };
    }
    const tau = y - s.start;
    const bx = BARY.offsetArcsec[0] + BARY.properMotionArcsecPerYear[0] * tau;
    const by = BARY.offsetArcsec[1] + BARY.properMotionArcsecPerYear[1] * tau;
    const A = {
      x: bx - B * r.x + sig * g(),
      y: by - B * r.y + sig * g(),
      sigma: sig,
    };
    const Bc = {
      x: bx + (1 - B) * r.x + sig * g(),
      y: by + (1 - B) * r.y + sig * g(),
      sigma: sig,
    };
    if (kind === 'relative')
      return {
        time,
        x: Bc.x - A.x,
        y: Bc.y - A.y,
        sigma: Math.hypot(A.sigma, Bc.sigma),
      };
    return swap ? { time, A: Bc, B: A } : { time, A, B: Bc };
  });
  return { epochs, truth: { ...s, el, B, sigma: sig } };
}

/** A parallax as observed at a signal-to-noise: the truth scaled by (1 + g / snr), the stated sigma truth / snr. */
function parallaxOf(s, snr, label, seed, extra = {}) {
  const g = noiseOf(`plx-${label}`, seed);
  const truth = s.parallaxMas;
  return {
    value: truth * (1 + g() / snr),
    sigma: truth / snr,
    unit: 'mas',
    frame: 'absolute',
    source: 'the synthetic truth, scaled by the stated signal-to-noise',
    ...extra,
  };
}

/** A random system of an ensemble's distribution. */
function draw(kind, k) {
  const u = stream('experiments', PREFIX, 'ensemble', kind, k);
  const lerp = (lo, hi) => lo + (hi - lo) * u();
  const MA = lerp(0.6, 1.4);
  const q = kind === 'photocentre' ? lerp(0.4, 0.8) : lerp(0.4, 0.95);
  const P = lerp(6, 25);
  const s = {
    name: `${kind}${k}`,
    MA,
    MB: q * MA,
    P,
    parallaxMas: lerp(40, 120),
    e: lerp(0.1, 0.7),
    i: Math.acos(lerp(-0.85, 0.85)) / RAD,
    Omega: 360 * u(),
    omega: 360 * u(),
    T: 2000 + P * u(),
    start: 2000,
    lB: q ** 4 / (1 + q ** 4),
  };
  return s;
}

const sys = name => ({ name, ...THR.systems[name] });
const V = { V1: sys('V1'), V2: sys('V2'), V3: sys('V3') };

// ---- rows -------------------------------------------------------------------------

const rows = [];
const add = (id, leg, group, pass, measured, bound, note = '') =>
  rows.push({ id, leg, group, pass, measured, bound, note });
const notRun = (id, leg, group, why) =>
  rows.push({ id, leg, group, pass: null, measured: null, bound: null, note: why });

const maxAbs = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const ci = (iv, level) => iv.find(x => x.level === level);

// ---- A: analytic ----------------------------------------------------------------

function groupA() {
  if (wanted('A1')) {
    const lim = THR.checks.find(c => c.id === 'A1.keplerClosed').limits;
    const GM = THR.constants.GM_sun_m3s2;
    const AU = THR.constants.au_m;
    const Y = THR.constants.julianYear_s;
    const expect = (4 * Math.PI ** 2 * AU ** 3) / (GM * Y * Y);
    const got = plugInSum(0.1, 1, 0.1);
    const rel = Math.abs(got / expect - 1);
    const near = Math.abs(got - 1);
    add('A1.keplerClosed', 'a', 'sum', rel <= lim.rel && near <= lim.nearOne, { rel, nearOne: near, value: got }, lim);
  }
  if (wanted('A2')) {
    const lim = THR.checks.find(c => c.id === 'A2.photocentreIdentities').limits;
    const f = Math.max(
      Math.abs(photocentreFactor(0.3, 0) + 0.3),
      Math.abs(photocentreFactor(0.3, 1) - 0.7),
      Math.abs(photocentreFactor(0.3, 0.3))
    );
    let worst = 0;
    for (const s of Object.values(V)) {
      const el = elementsOf(s);
      const B = fractionOf(s);
      const years = evenYears(s.start, 1.3 * s.P, 40);
      const rel = truePositions(el, years);
      const ph = photocentreOffsets(rel, B, s.lB);
      years.forEach((_, k) => {
        const xa = [-B * rel[k].x, -B * rel[k].y];
        const xb = [(1 - B) * rel[k].x, (1 - B) * rel[k].y];
        const wx = (1 - s.lB) * xa[0] + s.lB * xb[0];
        const wy = (1 - s.lB) * xa[1] + s.lB * xb[1];
        const scale = Math.hypot(rel[k].x, rel[k].y);
        worst = Math.max(worst, Math.hypot(wx - ph[k].x, wy - ph[k].y) / scale);
      });
    }
    add('A2.photocentreIdentities', 'a', 'fraction', f <= lim.factor && worst <= lim.rel, { factor: f, rel: worst }, lim);
  }
  if (wanted('A3')) {
    const lim = THR.checks.find(c => c.id === 'A3.massFunctionRoundTrip').limits;
    const u = stream('experiments', PREFIX, 'a3');
    // l = 0 equals the astrometric mass function
    const m1 = 0.9;
    const m2 = 0.6;
    const dark = photocentreFunction(m1, m2, 0);
    const relDark = Math.abs(dark / (m2 ** 3 / (m1 + m2) ** 2) - 1);
    let worst = 0;
    let missing = 0;
    for (let k = 0; k < lim.n; k++) {
      const M1 = 0.5 + u();
      const B = 0.1 + 0.8 * u();
      const l = 0.99 * u();
      const f = (M1 / (1 - B)) * Math.abs(B - l) ** 3;
      const roots = companionRoots(f, M1, l);
      const hit = roots.find(r => Math.abs(r.B - B) <= 1e-6) ?? null;
      if (!hit) {
        missing++;
        continue;
      }
      worst = Math.max(worst, Math.abs(hit.B / B - 1));
    }
    add('A3.massFunctionRoundTrip', 'a', 'photocentre', relDark <= lim.rel && worst <= lim.root && missing === 0, { relDark, root: worst, missing }, lim);
  }
  if (wanted('A4')) {
    const lim = THR.checks.find(c => c.id === 'A4.frameFactor').limits;
    const s = V.V1;
    const ser = series(s, 1, { kind: 'relative' });
    const fit = fitOrbit(ser);
    const abs = massSumOf(fit, { value: 50, sigma: 2, unit: 'mas', frame: 'absolute', source: 'test' });
    const rel = massSumOf(fit, { value: 50 - lim.referenceMas, sigma: 2, unit: 'mas', frame: 'relative' });
    const ratio = rel.ok && abs.ok ? rel.value / abs.value : NaN;
    const want = (50 / (50 - lim.referenceMas)) ** 3;
    const diff = Math.abs(ratio / want - 1);
    add('A4.frameFactor', 'a', 'sum', fit.ok && diff <= lim.rel && typeof rel.frameStatement === 'string' && rel.frameStatement.length > 20, { diff, ratio, want }, lim);
  }
}

// ---- B: against the oracle ------------------------------------------------------

function oracleInputs() {
  const out = {};
  for (const [name, s] of Object.entries(V)) {
    const ser = series(s, 1, { kind: 'components' });
    const t = ser.truth;
    const tInner = thieleInnesOf(t.el);
    out[name] = {
      truth: {
        P: s.P,
        e: s.e,
        T: s.T,
        thieleInnes: [tInner.A, tInner.B, tInner.F, tInner.G],
        aArcsec: t.el.a,
        B: t.B,
      },
      epochs: ser.epochs.map(e => ({
        t: e.time.value,
        xA: e.A.x,
        yA: e.A.y,
        sA: e.A.sigma,
        xB: e.B.x,
        yB: e.B.y,
        sB: e.B.sigma,
      })),
    };
  }
  return out;
}

function groupB() {
  const file = path.join(FIX, 'oracle-results.json');
  if (!existsSync(file)) {
    for (const id of ['B1.twoBodyPhotocentre', 'B2.sum', 'B2.fraction', 'B3.oracleSelf'])
      if (wanted(id.slice(0, 2)))
        notRun(id, 'b', id.startsWith('B2.f') ? 'fraction' : 'sum', 'oracle-results.json is missing: run the oracle first');
    return;
  }
  const oracle = JSON.parse(readFileSync(file, 'utf8'));
  if (wanted('B1')) {
    const lim = THR.checks.find(c => c.id === 'B1.twoBodyPhotocentre').limits;
    const per = {};
    for (const [name, s] of Object.entries(V)) {
      const o = oracle.b1[name];
      const el = elementsOf(s);
      const ph = photocentreOffsets(truePositions(el, o.years), fractionOf(s), s.lB);
      per[name] = maxAbs(ph.flatMap((p, k) => [p.x - o.x[k], p.y - o.y[k]]));
    }
    const worst = maxAbs(Object.values(per));
    add('B1.twoBodyPhotocentre', 'b', 'sum', worst <= lim.maxAbsArcsec, { perSystem: per, maxAbsArcsec: worst }, lim);
  }
  if (wanted('B2') || wanted('B3')) {
    const lim = THR.checks.find(c => c.id === 'B2.oracleSolution').limits;
    const lim3 = THR.checks.find(c => c.id === 'B3.oracleSelf').limits;
    const per = {};
    let passSum = true;
    let passFrac = true;
    let self = true;
    for (const [name, s] of Object.entries(V)) {
      const ser = series(s, 1, { kind: 'components' });
      const res = solveResolved(ser, parallaxOf(s, 10, name, 1));
      const o = oracle.b2[name];
      if (!res.ok || !res.fraction.ok) {
        per[name] = { refused: res.code ?? res.fraction?.code };
        passSum = passFrac = false;
        continue;
      }
      const lnK3 = 3 * Math.log(res.orbit.elements.a.value) - 2 * Math.log(res.orbit.elements.P.value);
      const sLn = res.orbit.gradients.sigmaLnK3;
      const dSum = Math.abs(lnK3 - o.lnK3) / sLn;
      const dFrac = Math.abs(res.fraction.value - o.B) / res.fraction.sigma;
      const sRatio = Math.abs(res.fraction.sigma / o.sigmaB - 1);
      per[name] = { dSum, dFrac, sigmaRatio: sRatio, zOracleLnK3: o.zLnK3, zOracleB: o.zB };
      if (!(dSum <= lim.sumSigmas)) passSum = false;
      if (!(dFrac <= lim.fractionSigmas && sRatio <= lim.sigmaRatio)) passFrac = false;
      if (!(Math.abs(o.zLnK3) <= lim3.nSigma && Math.abs(o.zB) <= lim3.nSigma)) self = false;
    }
    if (wanted('B2')) {
      add('B2.sum', 'b', 'sum', passSum, per, { sumSigmas: lim.sumSigmas });
      add('B2.fraction', 'b', 'fraction', passFrac, per, { fractionSigmas: lim.fractionSigmas, sigmaRatio: lim.sigmaRatio });
    }
    if (wanted('B3')) add('B3.oracleSelf', 'b', 'sum-and-fraction', self, per, lim3);
  }
}

// ---- C: coverage ----------------------------------------------------------------

function groupC() {
  const need = ['C1', 'C2', 'C3', 'C5'].some(wanted);
  if (need) {
    const L = THR.checks.find(c => c.id === 'C1.coverageSum').limits;
    const n = L.n;
    const hit = { sum68: 0, sum95: 0, B68: 0, B95: 0, m1_68: 0, m1_95: 0, m2_68: 0, m2_95: 0 };
    let returned = 0;
    const logRatios = [];
    const sigmas = [];
    for (let k = 0; k < n; k++) {
      const s = draw('resolved', k);
      const ser = series(s, 1, { kind: 'components' });
      const res = solveResolved(ser, parallaxOf(s, 10, `r${k}`, 1));
      if (!res.ok || !res.sum.ok || !res.fraction.ok || !res.masses) continue;
      returned++;
      const M = s.MA + s.MB;
      const B = fractionOf(s);
      const within = (iv, t) => t >= iv.lo && t <= iv.hi;
      if (within(ci(res.sum.intervals, Z68), M)) hit.sum68++;
      if (within(ci(res.sum.intervals, 0.95), M)) hit.sum95++;
      if (within(ci(res.fraction.intervals, Z68), B)) hit.B68++;
      if (within(ci(res.fraction.intervals, 0.95), B)) hit.B95++;
      if (within(ci(res.masses.M1.intervals, Z68), s.MA)) hit.m1_68++;
      if (within(ci(res.masses.M1.intervals, 0.95), s.MA)) hit.m1_95++;
      if (within(ci(res.masses.M2.intervals, Z68), s.MB)) hit.m2_68++;
      if (within(ci(res.masses.M2.intervals, 0.95), s.MB)) hit.m2_95++;
      logRatios.push(Math.log(res.sum.value / M));
      const iv = ci(res.sum.intervals, Z68);
      sigmas.push(0.5 * Math.log(iv.hi / iv.lo));
    }
    const r = v => (returned ? v / returned : NaN);
    const rate = {
      sum68: r(hit.sum68), sum95: r(hit.sum95), B68: r(hit.B68), B95: r(hit.B95),
      m1_68: r(hit.m1_68), m1_95: r(hit.m1_95), m2_68: r(hit.m2_68), m2_95: r(hit.m2_95),
    };
    const returnedRate = returned / n;
    const meas = { n, returned, returnedRate, ...rate };
    if (wanted('C1'))
      add('C1.coverageSum', 'c', 'sum',
        returnedRate >= L.minReturned && inRange(rate.sum68, L.level68) && inRange(rate.sum95, L.level95),
        { returned, returnedRate, sum68: rate.sum68, sum95: rate.sum95 }, L);
    if (wanted('C2')) {
      const l2 = THR.checks.find(c => c.id === 'C2.coverageFraction').limits;
      add('C2.coverageFraction', 'c', 'fraction',
        inRange(rate.B68, l2.level68) && inRange(rate.B95, l2.level95),
        { returned, B68: rate.B68, B95: rate.B95 }, l2);
    }
    if (wanted('C3')) {
      const l3 = THR.checks.find(c => c.id === 'C3.coverageMasses').limits;
      add('C3.coverageMasses', 'c', 'fraction',
        [rate.m1_68, rate.m2_68].every(v => inRange(v, l3.level68)) &&
          [rate.m1_95, rate.m2_95].every(v => inRange(v, l3.level95)),
        { returned, M1_68: rate.m1_68, M1_95: rate.m1_95, M2_68: rate.m2_68, M2_95: rate.m2_95 }, l3);
    }
    if (wanted('C5')) {
      const l5 = THR.checks.find(c => c.id === 'C5.sumBias').limits;
      const med = median(logRatios);
      const bound = (l5.nSigma * median(sigmas) * l5.medianFactor) / Math.sqrt(logRatios.length);
      add('C5.sumBias', 'c', 'sum', Math.abs(med) <= bound,
        { medianLogRatio: med, bound, medianSigmaLn: median(sigmas), n: logRatios.length }, l5);
    }
    rows.meas = meas;
  }
  if (wanted('C4') || wanted('D10')) {
    const L = THR.checks.find(c => c.id === 'C4.coveragePhotocentreCompanion').limits;
    const n = L.n;
    let returned = 0;
    let h68 = 0;
    let h95 = 0;
    const naive = [];
    for (let k = 0; k < n; k++) {
      const s = draw('photocentre', k);
      const ser = series(s, 1, { kind: 'photocentre' });
      const g = noiseOf(`given${k}`, 1);
      const l = { value: s.lB * (1 + 0.05 * g()), sigma: 0.05 * s.lB };
      const m1 = { value: s.MA * (1 + 0.05 * g()), sigma: 0.05 * s.MA };
      const res = solvePhotocentre(ser, parallaxOf(s, 10, `p${k}`, 1), { lightFraction: l, primaryMass: m1 });
      if (!res.ok || !res.massFunction.ok) continue;
      naive.push(res.massFunction.value / (s.MA + s.MB));
      if (!res.companion?.ok) continue;
      returned++;
      const root = res.companion.roots[0];
      const i68 = ci(root.intervals, Z68);
      const i95 = ci(root.intervals, 0.95);
      if (s.MB >= i68.lo && s.MB <= i68.hi) h68++;
      if (s.MB >= i95.lo && s.MB <= i95.hi) h95++;
    }
    const rate68 = returned ? h68 / returned : NaN;
    const rate95 = returned ? h95 / returned : NaN;
    if (wanted('C4'))
      add('C4.coveragePhotocentreCompanion', 'c', 'photocentre',
        returned / n >= L.minReturned && inRange(rate68, L.level68) && inRange(rate95, L.level95),
        { returned, returnedRate: returned / n, rate68, rate95 }, L);
    if (wanted('D10')) {
      const l10 = THR.checks.find(c => c.id === 'D10.naivePhotocentre').limits;
      const med = median(naive);
      add('D10.naivePhotocentre', 'd', 'photocentre', med < l10.medianBelow, { medianNaiveOverTrue: med, n: naive.length }, l10);
    }
  }
}

// ---- D: refusals and misspecification --------------------------------------------

const seeds = n => Array.from({ length: n }, (_, k) => k + 1);

function groupD() {
  const cnt = id => THR.checks.find(c => c.id === id).limits;
  if (wanted('D1')) {
    const lim = cnt('D1.noParallax');
    let ok = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'components' });
      const bad = [
        undefined,
        { value: 0, sigma: 1, frame: 'absolute', source: 'x' },
        { value: -5, sigma: 1, frame: 'absolute', source: 'x' },
        { value: 50, frame: 'absolute', source: 'x' },
      ];
      const codes = bad.map(p => solveResolved(ser, p).sum?.code);
      if (codes.every(c => c === 'parallax')) ok++;
    }
    add('D1.noParallax', 'd', 'sum', ok / lim.n >= lim.rate, { rate: ok / lim.n, n: lim.n }, lim);
  }
  if (wanted('D2')) {
    const lim = cnt('D2.noFrame');
    let ok = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'components' });
      const codes = [
        { value: 50, sigma: 2, unit: 'mas' },
        { value: 50, sigma: 2, unit: 'mas', frame: 'absolute' },
        { value: 50, sigma: 2, unit: 'mas', frame: 'absolute', literature: true },
      ].map(p => solveResolved(ser, p).sum?.code);
      if (codes.every(c => c === 'frame')) ok++;
    }
    add('D2.noFrame', 'd', 'sum', ok / lim.n >= lim.rate, { rate: ok / lim.n, n: lim.n }, lim);
  }
  if (wanted('D3')) {
    const lim = cnt('D3.weakParallax');
    let weak = 0;
    let strong = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'components' });
      const w = solveResolved(ser, { value: 50, sigma: 50 / 2.5, unit: 'mas', frame: 'absolute', source: 'x' });
      const g = solveResolved(ser, { value: 50, sigma: 50 / 3.5, unit: 'mas', frame: 'absolute', source: 'x' });
      if (w.sum?.code === 'parallax-weak') weak++;
      if (g.sum?.ok) strong++;
    }
    add('D3.weakParallax', 'd', 'sum', weak / lim.n >= lim.rate && strong === lim.n, { weakRefused: weak / lim.n, at35Returned: strong / lim.n }, lim);
  }
  if (wanted('D4')) {
    const lim = cnt('D4.shortArc');
    let ok = 0;
    for (const k of seeds(lim.n)) {
      const ser = series(V.V1, k, { kind: 'components', spanFraction: lim.arcFraction });
      const res = solveResolved(ser, parallaxOf(V.V1, 10, `d4${k}`, k));
      if (!res.ok && !res.sum && !res.fraction && !res.masses) ok++;
    }
    add('D4.shortArc', 'd', 'sum', ok / lim.n >= lim.rate, { rate: ok / lim.n, n: lim.n }, lim);
  }
  if (wanted('D5')) {
    const lim = cnt('D5.oneComponent');
    let ok = 0;
    for (const k of seeds(lim.n)) {
      const rel = series(V.V1, k, { kind: 'relative' });
      const r = solveResolved(rel, parallaxOf(V.V1, 10, `d5${k}`, k));
      const comp = series(V.V1, k, { kind: 'components' });
      const one = { epochs: comp.epochs.map(e => ({ time: e.time, A: e.A })) };
      const o = solveResolved(one, parallaxOf(V.V1, 10, `d5b${k}`, k));
      if (r.ok && r.sum?.ok && r.fraction?.code === 'needs-each-component' && !r.masses && !o.ok && o.code === 'needs-each-component') ok++;
    }
    add('D5.oneComponent', 'd', 'fraction', ok / lim.n >= lim.rate, { rate: ok / lim.n, n: lim.n }, lim);
  }
  if (wanted('D6')) {
    const lim = cnt('D6.badFraction');
    let ok = 0;
    let counted = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'components', swap: true });
      const res = solveResolved(ser, parallaxOf(s, 10, `d6${k}`, k));
      counted++;
      if (res.ok && res.fraction.ok && Math.abs(res.fraction.value - (1 - fractionOf(s))) <= lim.nSigma * res.fraction.sigma) ok++;
    }
    add('D6.badFraction', 'd', 'fraction', ok / counted >= lim.rate, { rate: ok / counted, n: counted }, lim);
  }
  if (wanted('D7')) {
    const lim = cnt('D7.noLight');
    let ok = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'photocentre' });
      const noL = solvePhotocentre(ser, parallaxOf(s, 10, `d7${k}`, k), { primaryMass: { value: s.MA, sigma: 0.05 * s.MA } });
      const a = noL.ok && noL.companion?.code === 'light-fraction';
      // l = B exactly: the photocentre does not move; the series is noise with the relative axis's 1 percent
      const v2 = { ...V.V2, lB: fractionOf(V.V2) };
      const flat = series(v2, k, { kind: 'photocentre' });
      const noise = gaussian(stream('noise', PREFIX, 'd7flat', k));
      const el = elementsOf(v2);
      const flatSeries = {
        epochs: flat.epochs.map(e => ({ time: e.time, x: 0.01 * el.a * noise(), y: 0.01 * el.a * noise(), sigma: 0.01 * el.a })),
      };
      const given = { lightFraction: { value: v2.lB, sigma: 0.05 * v2.lB }, primaryMass: { value: v2.MA, sigma: 0.05 * v2.MA } };
      const f = solvePhotocentre(flatSeries, parallaxOf(v2, 10, `d7f${k}`, k), given);
      const b = !f.ok || !f.companion?.ok;
      if (a && b) ok++;
    }
    add('D7.noLight', 'd', 'photocentre', ok / lim.n >= lim.rate, { rate: ok / lim.n, n: lim.n }, lim);
  }
  if (wanted('D8')) {
    const lim = cnt('D8.bothRoots');
    const heavy = { name: 'D8', MA: 1.0, MB: 0.5, P: 10, parallaxMas: 60, e: 0.3, i: 55, Omega: 80, omega: 120, T: 2002.5, start: 2000, lB: 0.6 };
    let both = 0;
    let truthHit = 0;
    let oneRoot = 0;
    for (const k of seeds(lim.n)) {
      const ser = series(heavy, k, { kind: 'photocentre' });
      const res = solvePhotocentre(ser, parallaxOf(heavy, 50, `d8${k}`, k), {
        lightFraction: { value: 0.6, sigma: 0.03 },
        primaryMass: { value: 1.0, sigma: 0.05 },
      });
      if (res.ok && res.companion?.ok && res.companion.roots.length === 2 && res.companion.roots[1].flag === 'ambiguous-root') {
        both++;
        const hit = res.companion.roots.some(r => {
          const iv = ci(r.intervals, Z68);
          return Math.abs(r.M2 - heavy.MB) <= 3 * 0.5 * (iv.hi - iv.lo);
        });
        if (hit) truthHit++;
      }
      const one = series(V.V3, k, { kind: 'photocentre' });
      const r1 = solvePhotocentre(one, parallaxOf(V.V3, 20, `d8b${k}`, k), {
        lightFraction: { value: V.V3.lB, sigma: 0.05 * V.V3.lB },
        primaryMass: { value: V.V3.MA, sigma: 0.05 * V.V3.MA },
      });
      if (r1.ok && r1.companion?.ok && r1.companion.roots.length === 1) oneRoot++;
    }
    add('D8.bothRoots', 'd', 'photocentre', both / lim.n >= lim.rate && truthHit / lim.n >= lim.rate && oneRoot / lim.n >= lim.rate,
      { bothListed: both / lim.n, truthWithin3Sigma: truthHit / lim.n, singleRootCase: oneRoot / lim.n, n: lim.n }, lim);
  }
  if (wanted('D9')) {
    const lim = cnt('D9.relativeParallax');
    const ratios = [];
    let stated = 0;
    for (const k of seeds(lim.n)) {
      const s = V.V1;
      const ser = series(s, k, { kind: 'components' });
      const g = noiseOf(`d9${k}`, k);
      const rel = { value: (s.parallaxMas - 3) * (1 + g() / 20), sigma: (s.parallaxMas - 3) / 20, unit: 'mas', frame: 'relative' };
      const res = solveResolved(ser, rel);
      if (res.ok && res.sum.ok) {
        ratios.push(res.sum.value / (s.MA + s.MB));
        if (typeof res.frameStatement === 'string' && res.frameStatement.includes('relative')) stated++;
      }
    }
    const want = (50 / 47) ** 3;
    const med = median(ratios);
    add('D9.relativeParallax', 'd', 'sum', Math.abs(med / want - 1) <= lim.tolerance && stated === ratios.length && ratios.length === lim.n,
      { medianRatio: med, predicted: want, statements: stated, n: ratios.length }, lim);
  }
}

// ---- E and P ------------------------------------------------------------------------

function groupEP() {
  if (wanted('E1'))
    notRun('E1.authentic', 'e', 'authentic', 'no published table of orbital elements and parallax (or of positions) was supplied; the source and terms are named in VISUAL_BINARY_GATE.md');
  if (wanted('P1')) {
    const s = V.V1;
    const ser = series(s, 1, { kind: 'components' });
    const t0 = process.cpuUsage();
    const res = solveResolved(ser, parallaxOf(s, 10, 'p1', 1));
    const t = process.cpuUsage(t0);
    add('P1.speed', 'p', 'record', res.ok, { cpuSeconds: (t.user + t.system) / 1e6 }, THR.checks.find(c => c.id === 'P1.speed').limits, 'recorded, not a physics bound');
  }
}

// ---- verdict ------------------------------------------------------------------------

const SUM_LEGS = ['A1', 'A4', 'B1', 'B2.sum', 'C1', 'C5', 'D1', 'D2', 'D3', 'D4', 'D9'];
const FRACTION_LEGS = ['A2', 'B2.fraction', 'C2', 'C3', 'D6'];
const A_REQUIRED = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2.sum', 'B2.fraction', 'B3', 'C1', 'C2', 'C3', 'C5', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
const PHOTOCENTRE_LEGS = ['A3', 'C4', 'D7', 'D8'];

function verdictOf() {
  const pass = id => {
    const r = rows.find(x => x.id === id || (!id.includes('.') && x.id.startsWith(`${id}.`)));
    return r ? r.pass === true : false;
  };
  const sum = SUM_LEGS.every(pass);
  const frac = FRACTION_LEGS.every(pass);
  const all = A_REQUIRED.every(pass);
  const phot = PHOTOCENTRE_LEGS.every(pass);
  const letter = all ? 'A' : sum ? 'B' : 'C';
  return {
    verdict: letter,
    massSumLegsPass: sum,
    massFractionLegsPass: frac,
    allRequiredPass: all,
    photocentreCompanionOffered: phot && letter !== 'C',
    reading:
      letter === 'A'
        ? 'the mass sum and, from the series of each component, the mass fraction and the two masses' + (phot ? ', and the photocentre companion mass' : '; the photocentre companion mass is not offered (f_ph only)')
        : letter === 'B'
          ? 'the mass sum only'
          : 'the visual branch is a reading step',
  };
}

// ---- run ----------------------------------------------------------------------------

if (flag('write-oracle-inputs')) {
  writeFileSync(path.join(ROOT, 'tools/visual-binary-oracle/oracle-inputs.json'), `${JSON.stringify(oracleInputs())}\n`);
  console.log('wrote tools/visual-binary-oracle/oracle-inputs.json');
  process.exit(0);
}

groupA();
groupB();
groupC();
groupD();
groupEP();
const verdict = only.length ? null : verdictOf();

const failed = rows.filter(r => r.pass === false);
if (flag('json')) console.log(JSON.stringify({ rows, verdict }, null, 1));
else {
  for (const r of rows) {
    const s = r.pass === null ? 'NOT RUN' : r.pass ? 'pass' : 'FAIL';
    console.log(`${s.padEnd(8)} ${r.id.padEnd(34)} ${JSON.stringify(r.measured)?.slice(0, 160) ?? ''}`);
  }
  if (verdict) console.log(`\nVerdict ${verdict.verdict}: ${verdict.reading}\n${JSON.stringify(verdict)}`);
  console.log(`\n${rows.filter(r => r.pass).length} pass, ${failed.length} fail, ${rows.filter(r => r.pass === null).length} not run`);
}
if (flag('write-results') && !only.length)
  writeFileSync(path.join(FIX, 'results.json'), `${JSON.stringify({ format: 'gravitas.visual-binary-results/1', node: process.version, verdict, rows }, null, 1)}\n`);
if (flag('write-failed') && !only.length)
  writeFileSync(
    path.join(FIX, 'failed-legs.json'),
    `${JSON.stringify(
      {
        note: 'Legs of tests/fixtures/visual-binary/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound); NOT RUN legs say why.',
        failed: failed.map(r => ({ id: r.id, measured: r.measured, bound: r.bound, why: r.note })),
        notRun: rows.filter(r => r.pass === null).map(r => ({ id: r.id, why: r.note })),
      },
      null,
      2
    )}\n`
  );
process.exit(failed.length ? 1 : 0);
