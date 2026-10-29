#!/usr/bin/env node
// =============================================================================
// The exposure calculator against its committed thresholds (Prompt 210)
// -----------------------------------------------------------------------------
//   npm run exposure:validate                  print the table
//   npm run exposure:validate -- --json        print it as JSON
//   npm run exposure:validate -- --write-failed  rewrite tests/fixtures/exposure/failed-legs.json
//
// tests/fixtures/exposure/thresholds.json fixed every bound before the kernel's
// extension existed; this runs the checks against js/kernels/detector/snr.js,
// js/instruments/exposure.js and js/exposureField.js and judges them against
// the bounds read from that file. The oracle rows read the results pinned in
// tests/fixtures/exposure/oracle-results.json (tools/exposure-oracle/oracle.py:
// Python and scipy, no Gravitas code) and the published numbers in the thresholds
// file. C1 and C2 render seeded frames through the detector kernel and measure
// them with the existing photometry and detection. E1 is not measured and says
// so. A crossed bound is a failed row, left failing in
// tests/fixtures/exposure/failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/detector/snr.js';
import * as E from '../js/instruments/exposure.js';
import * as F from '../js/exposureField.js';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { detectIn } from '../js/measure/detect.js';
import { airmass as kastenYoung } from '../js/kernels/sky/moon.js';
import { InstrumentTableError } from '../js/instruments/index.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import { photonRate } from '../js/kernels/detector/bands.js';
import * as LAB from '../js/kernels/detector/lab.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/exposure/thresholds.json');
const ORA = read('tests/fixtures/exposure/oracle-results.json');
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const PUB = THR.published;
const rel = (a, b) => Math.abs(a / b - 1);
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });

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
const logU = (r, lo, hi) => 10 ** (lo + (hi - lo) * r());
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

/** A random parameter set spanning the three regimes. */
function randomSet(r) {
  return {
    rate: logU(r, -1, 3),
    skyRate: logU(r, -2, 2),
    darkRate: r() < 0.5 ? 0 : r(),
    readNoise: 1 + 14 * r(),
    npix: 3 + 197 * r(),
    nBackground: r() < 0.3 ? Infinity : 100 + 4900 * r(),
    nExp: 1 + Math.floor(10 * r()),
    snr: 3 + 197 * r(),
  };
}

// ---- (a) analytic ----------------------------------------------------------------

function a1() {
  const l = lim('A1.limits');
  const src = K.noiseTerms({ signal: 1e6, npix: 10, sky: 0, readNoise: 0 });
  const sky = K.noiseTerms({
    signal: 1,
    npix: 10,
    sky: 1e5,
    readNoise: 0,
    nBackground: 1e3,
  });
  const k = 1 + 10 / 1e3;
  const read = K.noiseTerms({
    signal: 1,
    npix: 10,
    sky: 0,
    readNoise: 1e5 ** 0.5,
  });
  const eSrc = rel(src.snr, Math.sqrt(1e6));
  const eSky = rel(sky.snr, 1 / Math.sqrt(10 * k * 1e5));
  const eRead = rel(read.snr, 1 / Math.sqrt(10 * 1e5));
  const dom = [
    K.dominantTerm({ rate: 1e6, skyRate: 0, readNoise: 0, npix: 10 }, 1),
    K.dominantTerm({ rate: 1, skyRate: 1e5, readNoise: 0, npix: 10 }, 1),
    K.dominantTerm({ rate: 1, skyRate: 0, readNoise: 1e3, npix: 10 }, 1),
  ];
  row(
    'A1.limits',
    eSrc <= l.relSource &&
      eSky <= l.relSky &&
      eRead <= l.relRead &&
      dom.join() === 'source,sky,read',
    { eSrc, eSky, eRead, dominant: dom }
  );
}

function a2() {
  const l = lim('A2.handWorked');
  const H = THR.handWorked;
  const one = K.noiseTerms({ ...H.inputs, nExp: 1 });
  const four = K.noiseTerms({ ...H.inputs, nExp: 4 });
  const errs = [
    rel(one.source, H.oneExposure.source),
    rel(one.sky, H.oneExposure.sky),
    rel(one.dark, H.oneExposure.dark),
    rel(one.read, H.oneExposure.read),
    rel(one.variance, H.oneExposure.variance),
    rel(one.noise, H.oneExposure.noise),
    rel(one.snr, H.oneExposure.snr),
    rel(four.read, H.fourExposures.read),
    rel(four.variance, H.fourExposures.variance),
    rel(four.noise, H.fourExposures.noise),
    rel(four.snr, H.fourExposures.snr),
  ];
  row('A2.handWorked', Math.max(...errs) <= l.relMax, {
    worstRel: Math.max(...errs),
  });
}

function a3() {
  const l = lim('A3.exposureInverse');
  const H = THR.handWorked.exposureForSnr;
  const hand = rel(K.exposureForSnr(H.inputs), H.seconds);
  const r = rngFor('A3');
  let worst = 0;
  for (let i = 0; i < l.sets; i++) {
    const s = randomSet(r);
    const t = K.exposureForSnr(s);
    worst = Math.max(worst, rel(K.snrAt({ ...s, rate: s.rate }, t), s.snr));
  }
  row('A3.exposureInverse', hand <= l.relHand && worst <= l.relInverse, {
    hand,
    worstInverse: worst,
  });
}

function a4() {
  const l = lim('A4.limitingMagnitudeInverse');
  const r = rngFor('A4');
  let worst = 0;
  let ok = true;
  for (let i = 0; i < l.sets; i++) {
    const s = randomSet(r);
    const zeroPoint = logU(r, 8, 11);
    const enclosed = 0.3 + 0.7 * r();
    const t = logU(r, 0, 3);
    const p = { ...s, zeroPoint, enclosed };
    const m = K.limitingMagnitude(p, t, s.snr);
    const rate = K.rateOfMagnitude(zeroPoint, m) * enclosed;
    worst = Math.max(worst, rel(K.snrAt({ ...p, rate }, t), s.snr));
    const m2 = K.limitingMagnitude(p, 2 * t, s.snr);
    const back = K.exposureForSnr({ ...p, rate, snr: s.snr });
    worst = Math.max(worst, rel(back, t));
    if (!(m2 > m)) ok = false;
  }
  row('A4.limitingMagnitudeInverse', worst <= l.relMax && ok, {
    worstRel: worst,
    fainterWithTime: ok,
  });
}

function a5() {
  const l = lim('A5.exposures');
  const base = {
    signal: 3e4,
    npix: 25,
    sky: 40,
    dark: 2,
    readNoise: 7,
    nBackground: 400,
  };
  const k = 1 + 25 / 400;
  let worst = 0;
  let mono = true;
  let last = Infinity;
  const one = K.noiseTerms({ ...base, nExp: 1 });
  for (let n = 1; n <= 10; n++) {
    const t = K.noiseTerms({ ...base, nExp: n });
    worst = Math.max(
      worst,
      rel(t.variance, one.variance + (n - 1) * 25 * k * 49)
    );
    if (t.snr > last) mono = false;
    last = t.snr;
  }
  row('A5.exposures', worst <= l.relMax && mono, {
    worstRel: worst,
    monotone: mono,
  });
}

function a6() {
  const l = lim('A6.scaling');
  const snr = (p, t) => K.snrAt(p, t);
  const srcP = { rate: 1e6, skyRate: 0, readNoise: 0, npix: 10 };
  const skyP = { rate: 1e-3, skyRate: 1e3, readNoise: 0, npix: 10 };
  const readP = { rate: 1e-3, skyRate: 0, readNoise: 10, npix: 10, nExp: 1 };
  const e1 = Math.abs(snr(srcP, 2) / snr(srcP, 1) / Math.SQRT2 - 1);
  const e2 = Math.abs(snr(skyP, 2) / snr(skyP, 1) / Math.SQRT2 - 1);
  const e3 = Math.abs(snr(readP, 2) / snr(readP, 1) / 2 - 1);
  row('A6.scaling', Math.max(e1, e2, e3) <= l.relMax, { e1, e2, e3 });
}

function a7() {
  const l = lim('A7.extended');
  const zp = 1e9;
  const mu = 20;
  const A = 25;
  const ext = K.extendedSourceRate(zp, mu, A);
  const pt = K.rateOfMagnitude(zp, mu - 2.5 * Math.log10(A));
  const e1 = rel(ext, pt);
  // A surface-brightness limit over the aperture's area is the point limit plus 2.5 log10 A.
  const p = {
    skyRate: 5,
    darkRate: 0.1,
    readNoise: 8,
    npix: 25,
    zeroPoint: zp,
  };
  const mTotal = K.limitingMagnitude(p, 100, 5);
  const plan = K.planExposure({
    zeroPoint: zp,
    source: {
      kind: 'extended',
      mu: mTotal + 2.5 * Math.log10(A),
      areaArcsec2: A,
    },
    pixelScale: 1,
    fwhm: 2,
    skyMag: K.magnitudeOfRate(zp, 5),
    readNoise: 8,
    darkRate: 0.1,
    targetSnr: 5,
  });
  const e2 = rel(plan.seconds, 100);
  row('A7.extended', e1 <= l.relMax && e2 <= 1e-9, {
    identity: e1,
    limitRoundTrip: e2,
  });
}

function a8() {
  const l = lim('A8.extinction');
  const zp = 2e9;
  const k = 0.2;
  const X = 1.7;
  const ext = K.extinctionMag(k, X);
  const rate = K.rateOfMagnitude(zp, 18 + ext);
  const e1 = rel(rate, K.rateOfMagnitude(zp, 18) * 10 ** (-0.4 * k * (X - 1)));
  const p = {
    skyRate: 3,
    darkRate: 0.1,
    readNoise: 8,
    npix: 20,
    zeroPoint: zp,
  };
  const d =
    K.limitingMagnitude(p, 60, 5) -
    K.limitingMagnitude({ ...p, extinction: ext }, 60, 5);
  const e2 = Math.abs(d - ext);
  const a90 = Math.abs(kastenYoung(90) - 1);
  const a30 = Math.abs(kastenYoung(30) - 1.99);
  row(
    'A8.extinction',
    e1 <= l.relMax &&
      e2 <= 1e-12 &&
      a90 <= l.airmassZenith &&
      a30 <= l.airmass30,
    { e1, e2, a90, a30 }
  );
}

function a9() {
  const l = lim('A9.noiseEquivalentArea');
  let worstN = 0;
  let worstE = 0;
  for (const [f, r] of [
    [2.8, 4.2],
    [4.15, 6.2],
  ]) {
    const sg = f / K.FWHM_PER_SIGMA;
    const h = 0.02;
    let s2 = 0;
    let enc = 0;
    const R = 8 * sg;
    for (let x = -R; x <= R; x += h)
      for (let y = -R; y <= R; y += h) {
        const pdf =
          Math.exp(-(x * x + y * y) / (2 * sg * sg)) / (2 * Math.PI * sg * sg);
        s2 += pdf * pdf * h * h;
        if (x * x + y * y <= r * r) enc += pdf * h * h;
      }
    const g = K.pointSourceGeometry({ fwhm: f, mode: 'optimal' });
    const a = K.pointSourceGeometry({ fwhm: f, radius: r });
    worstN = Math.max(worstN, rel(g.npix, 1 / s2));
    worstE = Math.max(worstE, Math.abs(a.enclosed - enc));
  }
  row(
    'A9.noiseEquivalentArea',
    worstN <= l.relNeff && worstE <= l.relEnclosed,
    {
      worstNeffRel: worstN,
      worstEnclosedAbs: worstE,
    }
  );
}

function a10() {
  const l = lim('A10.lessonArithmetic');
  const sg = LAB.LAB_DETECTOR.fwhm / K.FWHM_PER_SIGMA;
  let worst = 0;
  let n = 0;
  for (const exposure of [1, 10, 60, 300, 1200])
    for (const radius of [1, 3, 5, 10])
      for (let sky = 0; sky < 3; sky++) {
        const enclosed = 1 - Math.exp(-(radius * radius) / (2 * sg * sg));
        const npix = Math.PI * radius * radius;
        const rIn = radius + 3;
        const rOut = radius + 8;
        const p = {
          skyRate: LAB.skyRateFromMagnitude(LAB.SKY_CHOICES[sky].mag),
          darkRate: LAB.LAB_DETECTOR.darkRate,
          readNoise: LAB.LAB_DETECTOR.readNoise,
          npix,
          nBackground: Math.PI * (rOut * rOut - rIn * rIn),
        };
        // the instrument's former 60-step bisection on the magnitude
        let lo = 8;
        let hi = 30;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          if (
            K.snrAt(
              { ...p, rate: LAB.rateFromMagnitude(mid) * enclosed },
              exposure
            ) > 5
          )
            lo = mid;
          else hi = mid;
        }
        const closed = K.limitingMagnitude(
          { ...p, zeroPoint: LAB.ZERO_POINT_V, enclosed },
          exposure,
          5
        );
        worst = Math.max(worst, Math.abs(closed - lo));
        n++;
      }
  row(
    'A10.lessonArithmetic',
    worst <= l.absMax,
    { worstAbs: worst, points: n },
    'the graded answers are held by tests/calibrationLessons.test.js and the lesson goldens'
  );
}

// ---- (b) oracle ------------------------------------------------------------------

const PIX = PUB.pixelScaleArcsec;
const T_VIS = PUB.visit.exposures * PUB.visit.secondsEach;

/** The kernel's depth for a band at a zero point, for the oracle's conditions. */
function kDepth(
  zp,
  i,
  {
    dsky = 0,
    dtheta = 1,
    t = T_VIS,
    X = 1,
    read = PUB.visit.readNoiseElectrons,
  } = {}
) {
  const msky = PUB.msky[i] + dsky;
  const fwhm = (PUB.thetaEff[i] * dtheta * X ** 0.6) / PIX;
  const g = K.pointSourceGeometry({ fwhm, mode: 'optimal' });
  const p = {
    zeroPoint: zp,
    skyRate: K.skyRatePerPixel(zp, msky, PIX),
    darkRate: 0,
    readNoise: read,
    npix: g.npix,
    nBackground: Infinity,
    nExp: PUB.visit.exposures,
    enclosed: 1,
    extinction: K.extinctionMag(PUB.km[i], X),
  };
  return K.limitingMagnitude(p, t, 5);
}

function fitZeroPoint(i) {
  let lo = 5;
  let hi = 13;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (kDepth(10 ** mid, i) < PUB.m5[i]) lo = mid;
    else hi = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

const eq7 = (dinf, tau) =>
  dinf - 1.25 * Math.log10(1 + (10 ** (0.8 * dinf) - 1) / tau);

function bGroup() {
  const zps = PUB.bands.map((_, i) => fitZeroPoint(i));
  // B1: against the second implementation
  const l1 = lim('B1.implementation');
  let worstZp = 0;
  let worstM = 0;
  PUB.bands.forEach((b, i) => {
    const o = ORA.bands[i];
    worstZp = Math.max(worstZp, rel(zps[i], o.zeroPoint));
    worstM = Math.max(worstM, Math.abs(kDepth(zps[i], i) - o.m5Fiducial));
    const free = kDepth(zps[i], i, { read: 0 });
    worstM = Math.max(worstM, Math.abs(free - kDepth(zps[i], i) - o.readLoss));
    for (const tau of lim('B3.doubling').taus) {
      const d =
        kDepth(zps[i], i, { t: T_VIS * tau }) -
        kDepth(zps[i], i) -
        1.25 * Math.log10(tau);
      worstM = Math.max(worstM, Math.abs(d - o.doubling[tau]));
    }
    for (const c of o.conditions) {
      const kd = kDepth(zps[i], i, {
        dsky: c.overrides.dsky ?? 0,
        dtheta: c.overrides.dtheta ?? 1,
        t: c.overrides.t ?? T_VIS,
        X: c.overrides.X ?? 1,
      });
      worstM = Math.max(worstM, Math.abs(kd - c.implementation));
    }
    const x12 = kDepth(zps[i], i) - kDepth(zps[i], i, { X: 1.2 });
    worstM = Math.max(worstM, Math.abs(x12 - o.lossAtX1p2));
  });
  row('B1.implementation', worstZp <= l1.relZeroPoint && worstM <= l1.absMag, {
    worstZeroPointRel: worstZp,
    worstDepthAbs: worstM,
  });

  // B2: the read-noise loss against the published dCmInf
  const l2 = lim('B2.readNoiseLoss');
  const loss = PUB.bands.map(
    (_, i) => kDepth(zps[i], i, { read: 0 }) - kDepth(zps[i], i)
  );
  const diff2 = loss.map((v, i) => v - PUB.dCmInf[i]);
  const bad2 = PUB.bands.filter(
    (b, i) => Math.abs(diff2[i]) > (b === 'u' ? l2.absMaxU : l2.absMax)
  );
  row('B2.readNoiseLoss', bad2.length === 0, {
    kernel: loss.map(v => +v.toFixed(3)),
    published: PUB.dCmInf,
    difference: diff2.map(v => +v.toFixed(3)),
    failingBands: bad2,
  });

  // B3: the longer exposure
  const l3 = lim('B3.doubling');
  const bad3 = [];
  const worst3 = {};
  PUB.bands.forEach((b, i) => {
    for (const tau of l3.taus) {
      const k =
        kDepth(zps[i], i, { t: T_VIS * tau }) -
        kDepth(zps[i], i) -
        1.25 * Math.log10(tau);
      const ref = tau === 2 ? PUB.dCm2[i] : eq7(PUB.dCmInf[i], tau);
      const d = k - ref;
      worst3[`${b}@${tau}`] = +d.toFixed(3);
      if (Math.abs(d) > l3.absMax) bad3.push(`${b}@${tau}`);
    }
  });
  row('B3.doubling', bad3.length === 0, { difference: worst3, failing: bad3 });

  // B4: off-fiducial against equation 6 plus equation 7
  const l4 = lim('B4.offFiducial');
  const bad4 = [];
  const d4 = {};
  PUB.bands.forEach((b, i) => {
    for (const c of ORA.bands[i].conditions) {
      const kd = kDepth(zps[i], i, {
        dsky: c.overrides.dsky ?? 0,
        dtheta: c.overrides.dtheta ?? 1,
        t: c.overrides.t ?? T_VIS,
        X: c.overrides.X ?? 1,
      });
      const d = kd - c.equation6;
      d4[`${b} ${c.label}`] = +d.toFixed(3);
      if (Math.abs(d) > l4.absMax) bad4.push(`${b} ${c.label}`);
    }
  });
  row('B4.offFiducial', bad4.length === 0, { failing: bad4, difference: d4 });

  // B5: the loss at airmass 1.2
  const l5 = lim('B5.airmassLoss');
  const d5 = PUB.bands.map(
    (_, i) =>
      kDepth(zps[i], i) - kDepth(zps[i], i, { X: 1.2 }) - PUB.dm5AtX1p2[i]
  );
  row(
    'B5.airmassLoss',
    d5.every(v => Math.abs(v) <= l5.absMax),
    {
      difference: d5.map(v => +v.toFixed(3)),
    }
  );

  // B6: the implied throughput (SDSS passbands stand in for LSST's)
  const l6 = lim('B6.impliedThroughput');
  const { areaM2 } = E.areaOf('rubin');
  const thr = {};
  for (const b of ['u', 'g', 'r', 'i', 'z']) {
    const band = decodeBand(BANDS.find(x => x.id === b));
    thr[b] = zps[PUB.bands.indexOf(b)] / photonRate(band, 0, areaM2, 1);
  }
  row(
    'B6.impliedThroughput',
    Object.values(thr).every(v => v >= l6.min && v <= l6.max),
    {
      throughput: Object.fromEntries(
        Object.entries(thr).map(([k, v]) => [k, +v.toFixed(3)])
      ),
      areaM2,
    }
  );
}

function b7() {
  const bad = [];
  const rubin = E.exposureSetupOf('rubin', {
    band: 'r',
    zeroPoint: 1e11,
    darkRate: 0,
    airmass: 1.2,
  });
  const s = rubin.setup;
  if (s.pixelScale !== 0.2) bad.push('rubin pixelScale');
  if (s.readNoise !== 9) bad.push('rubin readNoise');
  if (s.skyMag !== PUB.msky[2]) bad.push('rubin sky');
  if (s.extinction !== PUB.km[2]) bad.push('rubin extinction');
  if (!rubin.from.zeroPoint.supplied || !rubin.from.darkRate.supplied)
    bad.push('supplied marks');
  if (rubin.from.pixelScale.source !== 'ivezic2019') bad.push('rubin source');
  const area = E.areaOf('rubin').areaM2;
  if (rel(area, (Math.PI / 4) * 6.5 * 6.5) > 1e-12) bad.push('rubin area');
  const lo = E.exposureSetupOf('lco-1m0', {
    band: 'V',
    zeroPoint: 1e9,
    range: 'lo',
  }).setup;
  const hi = E.exposureSetupOf('lco-1m0', {
    band: 'V',
    zeroPoint: 1e9,
    range: 'hi',
  }).setup;
  const mid = E.exposureSetupOf('lco-1m0', { band: 'V', zeroPoint: 1e9 }).setup;
  if (lo.readNoise !== 7.5 || hi.readNoise !== 8 || mid.readNoise !== 7.75)
    bad.push('lco range');
  if (mid.pixelScale !== 0.389 || mid.skyMag !== 22 || mid.darkRate !== 0.002)
    bad.push('lco values');
  const keys = Object.keys(rubin.setup).filter(k => k !== 'airmass');
  for (const k of keys) if (!rubin.from[k]) bad.push(`no provenance for ${k}`);
  row('B7.adapter', bad.length === 0, { failing: bad });
}

// ---- (c) coverage and detection ----------------------------------------------------

function c1() {
  const l = lim('C1.coverage');
  const ens = THR.ensemble;
  const out = {};
  let pass = true;
  for (const sc of ens.scenarios) {
    const setup = {
      pixelScale: 1,
      fwhm: ens.frame.fwhmPixels,
      readNoise: ens.frame.readNoise,
      darkRate: ens.frame.darkRate,
    };
    const plan = {
      rates: { total: sc.rate, sky: sc.sky },
      seconds: sc.exposure,
      exposures: 1,
    };
    const z = [];
    let regime = null;
    for (let i = 0; i < l.frames; i++) {
      const r = F.renderPlan({
        setup,
        plan,
        source: { kind: 'point' },
        seed: `${THR.seeds.ensemble}:${sc.id}:${i}`,
        detector: ens.frame.clean,
      });
      const m = F.measureRendered(r);
      const p = F.predictRendered(r);
      z.push((m.net - p.signal) / p.sigma);
      if (i === 0) {
        const t = p.terms;
        regime = ['source', 'sky', 'read'].sort((a, b) => t[b] - t[a])[0];
      }
    }
    const cov = z.filter(v => Math.abs(v) < 1.96).length / z.length;
    const s = sd(z);
    const mu = mean(z);
    const ok =
      cov >= l.coverage[0] &&
      cov <= l.coverage[1] &&
      s >= l.sd[0] &&
      s <= l.sd[1] &&
      Math.abs(mu) <= l.meanAbsMax &&
      regime === sc.regime;
    out[sc.id] = {
      coverage: cov,
      sd: +s.toFixed(3),
      mean: +mu.toFixed(3),
      regime,
    };
    if (!ok) pass = false;
  }
  row('C1.coverage', pass, out);
}

const phi = x => 0.5 * erfc(-x / Math.SQRT2);
function erfc(x) {
  // Numerical Recipes erfc (fractional error below 1.2e-7)
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? r : 2 - r;
}

function c2() {
  const l = lim('C2.detection');
  const size = 64;
  const fwhm = 2.8;
  const sky = 3;
  const dark = 0.1;
  const R = 8;
  const t = 60;
  const g = K.pointSourceGeometry({ fwhm, mode: 'optimal' });
  const p = {
    skyRate: sky,
    darkRate: dark,
    readNoise: R,
    npix: g.npix,
    nBackground: Infinity,
    enclosed: 1,
    zeroPoint: 1,
  };
  const free = K.noiseTerms({
    signal: 0,
    npix: g.npix,
    sky: sky * t,
    dark: dark * t,
    readNoise: R,
  });
  const sigmaM = Math.sqrt(free.variance);
  const run = shift => {
    const rate = K.limitingRate(p, t, 4) * 10 ** (-0.4 * shift);
    const S = rate * t;
    const pred = phi((S - 4 * sigmaM) / Math.sqrt(S + sigmaM * sigmaM));
    const r = rngFor(`C2:${shift}`);
    let hit = 0;
    for (let i = 0; i < l.frames; i++) {
      const x = 28 + 8 * r();
      const y = 28 + 8 * r();
      const f = simulateFrame({
        seed: `${THR.seeds.ensemble}:detect:${shift}:${i}`,
        kind: 'science',
        exposure: t,
        detector: {
          width: size,
          height: size,
          readNoise: R,
          darkRate: dark,
          fwhm,
          ...THR.ensemble.frame.clean,
        },
        scene: { sky, sources: [{ x, y, rate }] },
      });
      const d = f.truth.detector;
      const values = Float64Array.from(
        f.values,
        v => (v - d.biasLevel) * d.gain
      );
      const a = {
        route: 'ccd',
        unit: 'electron',
        exposure: t,
        readNoise: R,
        limit: Infinity,
        mask: null,
        variance: null,
        image: { width: size, height: size, exposure: t, values },
      };
      const det = detectIn(a, { fwhm, sigma: 4, minArea: 1, box: 16 });
      if (det.ok && det.sources.some(s => Math.hypot(s.x - x, s.y - y) <= 2))
        hit++;
    }
    return { predicted: pred, measured: hit / l.frames };
  };
  const at = run(0);
  const bright = run(-1);
  const faint = run(1);
  row(
    'C2.detection',
    Math.abs(at.measured - at.predicted) <= l.absMax &&
      bright.measured >= l.brighterMin &&
      faint.measured <= l.fainterMax,
    { atLimit: at, oneMagBrighter: bright, oneMagFainter: faint }
  );
}

// ---- (d) refusals and misspecified cases -----------------------------------------

const BASE = {
  zeroPoint: 1e9,
  pixelScale: 1,
  fwhm: 2.8,
  skyMag: 21,
  readNoise: 8,
  darkRate: 0.1,
  fullWell: 50000,
  nExp: 1,
  targetSnr: 20,
};

function d1() {
  const maxTotal = 3600;
  const NOWELL = { ...BASE, fullWell: undefined };
  const g = {
    zeroPoint: 1e9,
    npix: 100,
    skyRate: K.skyRatePerPixel(1e9, 21, 1),
    darkRate: 0.1,
    readNoise: 8,
    nExp: 1,
  };
  const muLimit = K.limitingMagnitude(g, maxTotal, 20) + 2.5 * Math.log10(100);
  const hard = K.planExposure({
    ...NOWELL,
    source: { kind: 'extended', mu: muLimit + 4, areaArcsec2: 100 },
    maxTotal,
  });
  const easy = K.planExposure({
    ...NOWELL,
    source: { kind: 'extended', mu: muLimit - 1, areaArcsec2: 100 },
    maxTotal,
  });
  const opened = K.planExposure({
    ...NOWELL,
    source: { kind: 'extended', mu: muLimit + 4, areaArcsec2: 100 },
    maxTotal: 1e9,
  });
  const pass =
    hard.status === 'not-reachable' &&
    hard.reason === 'exposure-limit' &&
    hard.reachedSnr < BASE.targetSnr &&
    Number.isFinite(hard.limitingMagnitude) &&
    hard.seconds === undefined &&
    easy.status === 'ok' &&
    opened.status === 'ok';
  row('D1.notReachable', pass, {
    hard: hard.status,
    reachedSnr: hard.reachedSnr,
    needed: hard.needed,
    easy: easy.status,
    opened: opened.status,
  });
}

function d2() {
  const a = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: Infinity },
  });
  const b = K.planExposure({ ...BASE, source: { kind: 'point', mag: NaN } });
  const c = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 20 },
    targetSnr: 0,
  });
  const d = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 20 },
    nExp: 0,
  });
  const codes = [a.reason, b.reason, c.reason, d.reason];
  row(
    'D2.noSignal',
    a.reason === 'no-signal' &&
      b.reason === 'no-signal' &&
      c.reason === 'bad-input' &&
      d.reason === 'bad-input' &&
      [a, b, c, d].every(r => r.seconds === undefined),
    { codes }
  );
}

function d3() {
  const l = lim('D3.belowHorizon');
  const below = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 20 },
    airmass: kastenYoung(-3),
    extinction: 0.2,
  });
  const low = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 18 },
    airmass: 6,
    extinction: 0.2,
  });
  const ok = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 18 },
    airmass: 1.5,
    extinction: 0.2,
  });
  row(
    'D3.belowHorizon',
    below.reason === 'below-horizon' &&
      low.warnings.some(w => w.code === 'low-altitude') &&
      l.warnAirmass === 5 &&
      !ok.warnings.some(w => w.code === 'low-altitude'),
    { below: below.reason, lowWarnings: low.warnings.map(w => w.code) }
  );
}

function d4() {
  const l = lim('D4.saturation');
  const bright = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 12 },
    targetSnr: 1000,
  });
  let pass =
    bright.reason === 'saturated' &&
    bright.suggestion &&
    bright.maxPerExposure > 0;
  let suggested = null;
  if (pass) {
    suggested = K.planExposure({
      ...BASE,
      source: { kind: 'point', mag: 12 },
      targetSnr: 1000,
      nExp: bright.suggestion.exposures,
    });
    pass =
      suggested.status === 'ok' &&
      suggested.perExposure <= bright.maxPerExposure * (1 + 1e-9);
  }
  // the peak pixel fraction against the frame model's own pixel integral
  const f = simulateFrame({
    seed: 'exposure-210:peak',
    kind: 'science',
    exposure: 1,
    detector: { width: 17, height: 17, fwhm: 2.8, ...THR.ensemble.frame.clean },
    scene: { sky: 0, sources: [{ x: 8, y: 8, rate: 1e6 }] },
  });
  const frac = f.truth.starElectrons[8 * 17 + 8] / 1e6;
  const e = rel(K.peakPixelFraction(2.8), frac);
  row('D4.saturation', pass && e <= l.relPeak, {
    reason: bright.reason,
    suggestion: bright.suggestion,
    maxPerExposure: bright.maxPerExposure,
    relPeak: e,
    suggestedStatus: suggested?.status,
  });
}

function d5() {
  const bad = [];
  const need = (fn, field, id) => {
    try {
      fn();
      bad.push(`${id} ${field}: no error`);
    } catch (e) {
      if (!(e instanceof InstrumentTableError) || e.field !== field)
        bad.push(`${id} ${field}: ${e.message}`);
    }
  };
  need(
    () => E.exposureSetupOf('rubin', { band: 'r', zeroPoint: 1e11 }),
    'darkRate',
    'rubin'
  );
  need(
    () => E.exposureSetupOf('lco-1m0', { band: 'V', darkRate: 0.002 }),
    'zeroPoint',
    'lco-1m0'
  );
  need(
    () => E.exposureSetupOf('lco-1m0', { band: 'B', zeroPoint: 1e9 }),
    'skyMag',
    'lco-1m0'
  );
  need(
    () =>
      E.exposureSetupOf('lco-1m0', { band: 'V', zeroPoint: 1e9, airmass: 1.3 }),
    'extinction',
    'lco-1m0'
  );
  need(
    () => E.exposureSetupOf('gbt', { band: 'r', zeroPoint: 1e9 }),
    undefined,
    'gbt'
  );
  need(() => E.exposureSetupOf('tess', { zeroPoint: 1e9 }), 'darkRate', 'tess');
  const ok = E.exposureSetupOf('lco-1m0', {
    band: 'B',
    zeroPoint: 1e9,
    skyMag: 21.5,
  });
  if (!ok.from.skyMag.supplied) bad.push('supplied not recorded');
  row('D5.adapterRefusals', bad.length === 0, { failing: bad });
}

function d6() {
  const l = lim('D6.flatFieldFloor');
  const ens = THR.ensemble;
  const high = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 15 },
    targetSnr: 150,
  });
  const normal = K.planExposure({
    ...BASE,
    source: { kind: 'point', mag: 17 },
    targetSnr: 50,
  });
  const flags =
    high.warnings.some(w => w.code === 'beyond-flat-field-accuracy') &&
    !normal.warnings.some(w => w.code === 'beyond-flat-field-accuracy') &&
    high.assumptions.includes('no-flat-field-error') &&
    normal.assumptions.includes('no-flat-field-error');
  const setup = {
    pixelScale: 1,
    fwhm: ens.frame.fwhmPixels,
    readNoise: ens.frame.readNoise,
    darkRate: ens.frame.darkRate,
  };
  const plan = { rates: { total: 3000, sky: 3 }, seconds: 250, exposures: 1 };
  const z = [];
  const unclean = {
    vignette: 0.3,
    dustCount: 3,
    dustDepth: 0.08,
    qeScatter: 0.01,
    hotFraction: 0,
    cosmicRate: 0,
    biasColumnSigma: 0,
  };
  for (let i = 0; i < l.frames; i++) {
    const r = F.renderPlan({
      setup,
      plan,
      source: { kind: 'point' },
      seed: `${THR.seeds.ensemble}:flat:${i}`,
      detector: unclean,
    });
    const m = F.measureRendered(r);
    const p = F.predictRendered(r);
    z.push((m.net - p.signal) / p.sigma);
  }
  const s = sd(z);
  row('D6.flatFieldFloor', flags && s > l.sdMin, {
    warnings: high.warnings.map(w => w.code),
    sd: +s.toFixed(2),
    predictedSnr: +(
      (plan.rates.total * 250) /
      Math.sqrt(plan.rates.total * 250)
    ).toFixed(0),
  });
}

function p1() {
  const l = lim('P1.speed');
  const s = E.exposureSetupOf('rubin', {
    band: 'r',
    zeroPoint: 1.665e11,
    darkRate: 0,
  }).setup;
  const t0 = performance.now();
  let acc = 0;
  for (let i = 0; i < l.plans; i++)
    acc +=
      K.planExposure({
        ...s,
        source: { kind: 'point', mag: 22 + (i % 20) / 10 },
        targetSnr: 20,
        nExp: 2,
      }).seconds ?? 0;
  const ms = performance.now() - t0;
  row('P1.speed', ms <= l.ms && acc > 0, { ms: +ms.toFixed(1) });
}

export function runAll() {
  rows.length = 0;
  a1();
  a2();
  a3();
  a4();
  a5();
  a6();
  a7();
  a8();
  a9();
  a10();
  bGroup();
  b7();
  c1();
  c2();
  d1();
  d2();
  d3();
  d4();
  d5();
  d6();
  notRun('E1.authentic', THR.authenticRequest.need);
  p1();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = runAll();
  if (process.argv.includes('--write-failed')) {
    const failed = out
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured }));
    const notMeasured = out
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, reason: r.note }));
    writeFileSync(
      path.join(ROOT, 'tests/fixtures/exposure/failed-legs.json'),
      `${JSON.stringify({ note: 'Legs of tests/fixtures/exposure/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).', failed, notMeasured }, null, 2)}\n`
    );
  }
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 2));
  else
    for (const r of out)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
  process.exitCode = out.some(r => r.status === 'fail') ? 1 : 0;
}
