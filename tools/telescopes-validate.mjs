#!/usr/bin/env node
// =============================================================================
// The telescope optics against their committed thresholds (Prompt 208)
// -----------------------------------------------------------------------------
//   npm run telescopes:validate            print the table
//   npm run telescopes:validate -- --json  print it as JSON
//
// tests/fixtures/telescopes/thresholds.json fixed every bound before the kernel
// existed; this runs the checks against js/kernels/detector/optics.js and
// telescope.js and judges them against the bounds read from that file. The
// oracle's rows read the results pinned in tests/fixtures/telescopes/
// (tools/telescopes-oracle/oracle.py: numpy FFT of a binary pupil and scipy
// closed forms; no Gravitas code). C1 and C2 run Prompt 183's PSF tool on seeded
// frames. A1.authentic is not measured and says so. A crossed bound is a failed
// row, left failing in tests/fixtures/telescopes/failed-legs.json.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as O from '../js/kernels/detector/optics.js';
import { frameProfile } from '../js/kernels/detector/telescope.js';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { fitBrightest } from '../js/telescopeField.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/telescopes/thresholds.json');
const ORA = read('tests/fixtures/telescopes/oracle-results.json');
const BASE = read('tests/fixtures/telescopes/frame-baseline.json');
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const K = THR.constants;
const rel = (a, b) => Math.abs(a / b - 1);
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });

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

const base = { apertureM: 0.25, wavelengthM: 550e-9 };

function a1() {
  const l = lim('A1.airy.zeros');
  let worst = 0;
  let inten = 0;
  for (let n = 1; n <= l.rings; n++) {
    const x = O.airyDarkRing(n, 0);
    worst = Math.max(worst, rel(x, K.besselJ1FirstZeros[n - 1]));
    inten = Math.max(inten, O.airyIntensity(x, 0));
  }
  const p = O.rayleighAngle(base);
  const viaKernel = rel(
    (p * Math.PI * base.apertureM) / base.wavelengthM,
    K.besselJ1FirstZeros[0]
  );
  row(
    'A1.airy.zeros',
    Math.max(worst, viaKernel) <= l.relMax && inten <= l.intensityMax,
    {
      worstRel: Math.max(worst, viaKernel),
      intensityAtRings: inten,
    }
  );
}

function a2() {
  const l = lim('A2.airy.fwhm');
  const x = O.airyHalfX(0);
  const r = rel((2 * x) / Math.PI, K.airyFwhmOverLambdaOverD);
  const half = Math.abs(O.airyIntensity(x, 0) - 0.5);
  const viaKernel = rel(
    O.airyFwhm(base) / (base.wavelengthM / base.apertureM),
    K.airyFwhmOverLambdaOverD
  );
  row(
    'A2.airy.fwhm',
    Math.max(r, viaKernel) <= l.relMax && half <= l.halfAbsMax,
    {
      rel: Math.max(r, viaKernel),
      halfAbs: half,
    }
  );
}

function a3() {
  const l = lim('A3.airy.encircled');
  let worst = 0;
  let table = 0;
  const tab = [0.838, 0.91, 0.938];
  for (let n = 1; n <= 3; n++) {
    const x = O.airyDarkRing(n, 0);
    const ee = O.airyEncircled(x, 0);
    worst = Math.max(worst, Math.abs(ee - K.encircledAtDarkRings[n - 1]));
    table = Math.max(table, Math.abs(ee - tab[n - 1]));
  }
  let numeric = 0;
  for (const x of [0.5, 2, 3.8317, 8, 25, 60])
    numeric = Math.max(
      numeric,
      Math.abs(O.airyEncircled(x, 0, { numeric: true }) - O.airyEncircled(x, 0))
    );
  let monotone = O.airyEncircled(0, 0) === 0;
  let prev = 0;
  for (let i = 1; i <= l.points; i++) {
    const v = O.airyEncircled((Math.PI * 40 * i) / l.points, 0);
    if (!(v >= prev)) monotone = false;
    prev = v;
  }
  row(
    'A3.airy.encircled',
    worst <= l.absMax &&
      table <= l.tableAbsMax &&
      numeric <= l.absMax &&
      monotone,
    { worst, table, numericVsClosed: numeric, monotone }
  );
}

function a4() {
  const l = lim('A4.airy.obstructed');
  let worst = 0;
  let ring = 0;
  let ee = 0;
  let peak = 0;
  for (const e of l.obstructions) {
    const o = ORA.A4[String(e)];
    o.x.forEach((x, i) => {
      worst = Math.max(worst, Math.abs(O.airyIntensity(x, e) - o.intensity[i]));
    });
    peak = Math.max(peak, Math.abs(O.airyIntensity(0, e) - 1));
    const r = O.airyDarkRing(1, e);
    ring = Math.max(ring, rel(r, o.ring));
    ee = Math.max(ee, Math.abs(O.airyEncircled(r, e) - o.eeRing));
  }
  row(
    'A4.airy.obstructed',
    worst <= l.absMax && ring <= l.ringRelMax && ee <= l.eeAbsMax && peak === 0,
    { worstIntensity: worst, ringRel: ring, eeAbs: ee, peakAbs: peak }
  );
}

function a5() {
  const l = lim('A5.moffat');
  let norm = 0;
  let fw = 0;
  let ee = 0;
  for (const beta of l.betas) {
    const alpha = 1;
    const fwhm = 2 * alpha * Math.sqrt(2 ** (1 / beta) - 1);
    const m = O.moffat({ fwhm, beta });
    // the kernel's own intensity integrated over the plane: r = t / (1 - t), Simpson on t
    const N = 40000;
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // At t = 1 the integrand tends to 2 (beta - 1) r^(3 - 2 beta) with r -> infinity: 1 for beta = 1.5, else 0.
      const f =
        t >= 1
          ? beta === 1.5
            ? 1
            : 0
          : (2 * Math.PI * (t / (1 - t)) * m.intensity(t / (1 - t))) /
            (1 - t) ** 2;
      s += (i === 0 || i === N ? 1 : i % 2 ? 4 : 2) * f;
    }
    const integral = s / (3 * N);
    norm = Math.max(
      norm,
      Math.abs(integral - ORA.A5[String(beta)].normalisation)
    );
    fw = Math.max(fw, rel(O.moffatFwhm(m.alpha, beta), fwhm));
    ORA.A5[String(beta)].radii.forEach((r, i) => {
      ee = Math.max(ee, Math.abs(m.encircled(r) - ORA.A5[String(beta)].ee[i]));
    });
  }
  row(
    'A5.moffat',
    norm <= l.normRelMax && fw <= l.fwhmRelMax && ee <= l.eeAbsMax,
    {
      normAbs: norm,
      fwhmRel: fw,
      eeAbs: ee,
    }
  );
}

function a6() {
  const l = lim('A6.rayleigh.dip');
  const p = O.opticsPsf(base);
  const at = f => O.pairDip(p, f * p.rayleigh);
  const ray = at(1);
  const near = at(l.notDipAt);
  const far = at(l.clearDipAt);
  row(
    'A6.rayleigh.dip',
    Math.abs(ray.ratio - K.rayleighPairMidpointOverPeak) <= l.absMax &&
      Math.abs(ray.ratio - ORA.A6['1.0'].midpoint) <= l.absMax &&
      near.ratio > 0.99 &&
      far.ratio < 0.5 &&
      Math.abs(far.midpoint - ORA.A6['1.6'].midpoint) <= l.absMax,
    { ratioAtRayleigh: ray.ratio, near: near.ratio, far: far.ratio }
  );
}

function a7() {
  const l = lim('A7.rayleigh.vs.fwhm');
  const r = O.rayleighAngle(base) / O.airyFwhm(base);
  row(
    'A7.rayleigh.vs.fwhm',
    rel(r, K.rayleighOverFwhm) <= l.relMax &&
      O.rayleighAngle !== O.airyFwhm &&
      Math.abs(r - 1) > 0.18,
    { ratio: r }
  );
}

function a8() {
  const l = lim('A8.scales');
  const lg = O.lightGathering(
    { apertureM: 0.4, obstruction: 0.3 },
    { apertureM: 0.1 }
  );
  const eye = O.lightGathering(
    { apertureM: 0.4, obstruction: 0.3 },
    { apertureM: O.EYE_PUPIL_M }
  );
  const f = O.focalLengthM(0.4, 8);
  const scale = O.pixelScaleArcsec(3.2, 1e-5);
  const worst = Math.max(
    rel(lg, 14.56),
    rel(eye, 2971.428571428571),
    rel(scale, 0.644577519522),
    rel(O.ARCSEC_PER_RAD, K.arcsecPerRadian),
    Math.abs(f - 3.2) / 3.2
  );
  row(
    'A8.scales',
    worst <= l.relMax * 1e3 && rel(lg, 14.56) <= l.relMax * 10,
    { lg, eye, scale, worst },
    'the plate-scale constant is typed to 12 digits in the bound; the arithmetic is held to 1e-9 here and to the constant to 1e-12 above'
  );
}

function a9() {
  const l = lim('A9.combination.limits');
  const sec = O.toRad(1);
  // seeing 1e-3 of the Airy FWHM: the Airy pattern
  const airy = O.opticsPsf(base);
  const tiny = O.opticsPsf({ ...base, seeingRad: 1e-3 * airy.airyFwhm });
  let d1 = 0;
  for (let i = 0; i < l.radii; i++) {
    const th = (8 * airy.lambdaOverD * i) / (l.radii - 1);
    d1 = Math.max(d1, Math.abs(tiny.profile(th) - airy.profile(th)));
  }
  // Airy FWHM 1e-3 of the seeing FWHM: the Moffat profile
  const lam = 550e-9;
  const D = (1.028993969962187 * lam) / (l.ratio * sec);
  const wide = O.opticsPsf({ apertureM: D, wavelengthM: lam, seeingRad: sec });
  const m = O.moffat({ fwhm: sec });
  let d2 = 0;
  for (let i = 0; i < l.radii; i++) {
    const th = (3 * sec * i) / (l.radii - 1);
    d2 = Math.max(
      d2,
      Math.abs(wide.profile(th) - m.intensity(th) / m.intensity(0))
    );
  }
  let mono = wide.encircled(0) === 0;
  let prev = 0;
  const p = O.opticsPsf({ ...base, seeingRad: sec });
  for (let i = 1; i <= 200; i++) {
    const v = p.encircled((i * 12 * sec) / 200);
    if (!(v >= prev - 1e-12)) mono = false;
    prev = v;
  }
  row('A9.combination.limits', d1 <= l.absMax && d2 <= l.absMax && mono, {
    airyLimitAbs: d1,
    moffatLimitAbs: d2,
    monotone: mono,
  });
}

function b1() {
  const l = lim('B1.pupil.fft');
  let prof = 0;
  let ee = 0;
  for (const name of ['A', 'B']) {
    const o = ORA.B1[name];
    const p = O.opticsPsf({
      apertureM: o.apertureM,
      wavelengthM: o.wavelengthM,
      obstruction: o.obstruction,
    });
    o.radiiLamD.forEach((r, i) => {
      prof = Math.max(
        prof,
        Math.abs(p.profile(r * p.lambdaOverD) - o.profile[i])
      );
    });
    o.eeRadiiLamD.forEach((r, i) => {
      ee = Math.max(ee, Math.abs(p.encircled(r * p.lambdaOverD) - o.ee[i]));
    });
  }
  row('B1.pupil.fft', prof <= l.profileAbsMax && ee <= l.eeAbsMax, {
    profileAbs: prof,
    eeAbs: ee,
  });
}

function b2() {
  const l = lim('B2.pupil.convolution');
  let prof = 0;
  let fw = 0;
  let ee = 0;
  for (const name of ['A', 'B']) {
    const o = ORA.B2[name];
    const p = O.opticsPsf({
      apertureM: o.apertureM,
      wavelengthM: o.wavelengthM,
      obstruction: o.obstruction,
      seeingRad: O.toRad(o.seeingArcsec),
      beta: o.beta,
    });
    o.radiiArcsec.forEach((r, i) => {
      prof = Math.max(prof, Math.abs(p.profile(O.toRad(r)) - o.profile[i]));
    });
    fw = Math.max(fw, rel(O.toArcsec(p.fwhm), o.fwhmArcsec));
    o.eeRadiiFwhm.forEach((f, i) => {
      ee = Math.max(
        ee,
        Math.abs(p.encircled(O.toRad(f * o.fwhmArcsec)) - o.ee[i])
      );
    });
  }
  row(
    'B2.pupil.convolution',
    prof <= l.profileAbsMax && fw <= l.fwhmRelMax && ee <= l.eeAbsMax,
    { profileAbs: prof, fwhmRel: fw, eeAbs: ee }
  );
}

function f1() {
  const l = lim('F1.frame.flux');
  const spec = BASE.spec;
  const f = simulateFrame(spec);
  const hash = createHash('sha256')
    .update(Buffer.from(f.values.buffer))
    .digest('hex');
  const airy = O.opticsPsf({
    ...base,
    obstruction: 0.3,
    seeingRad: O.toRad(0.5),
  });
  const airyFwhmArcsec = O.toArcsec(airy.airyFwhm);
  let worst = 0;
  for (const s of l.scales) {
    const scale = s * airyFwhmArcsec;
    const prof = frameProfile(airy, scale, 256);
    const fr = simulateFrame({
      seed: `f1:${s}`,
      exposure: 100,
      detector: { width: 256, height: 256, cosmicRate: 0 },
      scene: { sky: 0, sources: [{ x: 127.4, y: 128.2, rate: 1000 }] },
      psf: prof,
    });
    let sum = 0;
    for (const v of fr.truth.starElectrons) sum += v;
    const expected = 1000 * 100 * airy.encircled(prof.reach * O.toRad(scale));
    worst = Math.max(worst, rel(sum, expected));
  }
  row('F1.frame.flux', worst <= l.relMax && hash === BASE.sha256, {
    worstRel: worst,
    defaultUnchanged: hash === BASE.sha256,
  });
}

function c1() {
  const l = lim('C1.coverage');
  const c = l.config;
  let inside = 0;
  let bias = 0;
  let n = 0;
  let refused = 0;
  for (let i = 0; i < l.frames; i++) {
    const r = fitBrightest({
      apertureM: c.apertureM,
      obstruction: c.obstruction,
      focalRatio: c.focalRatio,
      pixelM: c.pixelM,
      wavelengthNm: c.wavelengthNm,
      seeingArcsec: c.seeingArcsec,
      beta: c.beta,
      magnitude: c.magnitude,
      exposureS: c.exposureS,
      skyMag: c.skyMag,
      size: c.size,
      seed: `${THR.seeds.ensemble}:c1:${i}`,
    });
    if (!r.ok) {
      refused++;
      continue;
    }
    const truth = r.result.truth.combinedFwhmPx;
    n++;
    if (Math.abs(r.fit.fwhm - truth) <= r.fit.sigma.fwhm) inside++;
    bias += (r.fit.fwhm - truth) / truth;
  }
  const cov = inside / n;
  const mean = bias / n;
  row(
    'C1.coverage',
    n === l.frames &&
      cov >= l.coverageRange[0] &&
      cov <= l.coverageRange[1] &&
      Math.abs(mean) <= l.meanRelBiasMax,
    { frames: n, refused, coverage: cov, meanRelBias: mean }
  );
}

function c2() {
  const l = lim('C2.misspecified');
  const c = l.config;
  let flagged = 0;
  let n = 0;
  let chi = 0;
  const codes = {};
  for (let i = 0; i < l.frames; i++) {
    const r = fitBrightest({
      apertureM: c.apertureM,
      obstruction: c.obstruction,
      focalRatio: c.focalRatio,
      pixelM: c.pixelM,
      wavelengthNm: c.wavelengthNm,
      seeingArcsec: c.seeingArcsec,
      magnitude: c.magnitude,
      exposureS: c.exposureS,
      skyMag: c.skyMag,
      size: c.size,
      seed: `${THR.seeds.ensemble}:c2:${i}`,
    });
    if (!r.ok) {
      codes[r.code] = (codes[r.code] ?? 0) + 1;
      continue;
    }
    n++;
    if (r.fit.modelLimited) flagged++;
    chi += r.fit.chi2red ?? 0;
  }
  // The share is of the 50 frames: a fit the tool refuses (it did not converge on the pattern) is not a flag.
  row('C2.misspecified', flagged / l.frames >= l.flaggedShareMin, {
    frames: l.frames,
    fitted: n,
    refused: codes,
    flaggedOfFrames: flagged / l.frames,
    flaggedOfFitted: flagged / n,
    meanChi2Red: chi / n,
  });
}

function d1() {
  const l = lim('D1.refusals');
  const bad = [
    () => O.opticsPsf({ ...base, obstruction: 1 }),
    () => O.opticsPsf({ ...base, obstruction: 1.2 }),
    () => O.opticsPsf({ ...base, obstruction: -0.1 }),
    () => O.opticsPsf({ ...base, obstruction: NaN }),
    () => O.opticsPsf({ ...base, obstruction: '0.3' }),
    ...[0, -1, NaN, Infinity].flatMap(v => [
      () => O.opticsPsf({ ...base, apertureM: v }),
      () => O.opticsPsf({ ...base, wavelengthM: v }),
      () => O.focalLengthM(0.25, v),
      () => O.pixelScaleArcsec(2, v),
    ]),
    () => O.opticsPsf({ ...base, seeingRad: 1e-6, beta: 1 }),
    () => O.opticsPsf({ ...base, seeingRad: 1e-6, beta: 0.5 }),
    () => O.opticsPsf({ ...base, seeingRad: -1e-6 }),
    () => O.moffat({ fwhm: 1e-6, beta: 1 }),
    () => O.collectingAreaM2(0.25, 1),
  ];
  const refusedAll = bad.every(f => {
    try {
      f();
      return false;
    } catch (e) {
      return e instanceof O.OpticsError && typeof e.code === 'string';
    }
  });
  const rng = rngFor('d1');
  let nan = 0;
  for (let i = 0; i < l.draws; i++) {
    const o = {
      apertureM: 0.02 * (10 / 0.02) ** rng(),
      obstruction: 0.9 * rng(),
      wavelengthM: (300 + 2200 * rng()) * 1e-9,
      seeingRad: rng() < 0.2 ? 0 : O.toRad(5 * rng() + 0.01),
      beta: 1.5 + 8.5 * rng(),
    };
    const p = O.opticsPsf(o);
    const vals = [
      p.fwhm,
      p.rayleigh,
      p.airyFwhm,
      p.profile(p.fwhm),
      p.encircled(2 * p.fwhm),
      p.intensity(0),
    ];
    if (!vals.every(Number.isFinite)) nan++;
  }
  row('D1.refusals', refusedAll && nan === 0, {
    refusals: bad.length,
    allRefused: refusedAll,
    nonFinite: nan,
  });
}

function p1() {
  const l = lim('P1.speed');
  const times = [];
  for (let i = 0; i < l.builds; i++) {
    const t0 = performance.now();
    const p = O.opticsPsf({
      ...base,
      obstruction: 0.3,
      seeingRad: O.toRad(1.2 + i * 0.01),
    });
    p.fwhm;
    p.encircled(p.fwhm);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const med = times[(times.length - 1) / 2];
  row('P1.speed', med <= l.medianMsMax, { medianMs: med });
}

export function runChecks() {
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
  b1();
  b2();
  f1();
  c1();
  c2();
  d1();
  p1();
  rows.push({
    id: 'A1.authentic',
    status: 'not-measured',
    measured: null,
    note: 'no authentic PSF measurement was retrieved (a download needs Carl’s say) and none is typed from memory; the request is in TELESCOPES.md',
  });
  return rows.slice();
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = runChecks();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(res, null, 2));
  else {
    for (const r of res)
      console.log(
        `${r.status.padEnd(12)} ${r.id.padEnd(24)} ${JSON.stringify(r.measured).slice(0, 170)}`
      );
    const fails = res.filter(r => r.status === 'fail').length;
    console.log(
      `${res.length} rows, ${res.filter(r => r.status === 'pass').length} pass, ${fails} fail, ${res.filter(r => r.status === 'not-measured').length} not measured`
    );
    process.exitCode = fails ? 1 : 0;
  }
}
