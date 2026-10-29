#!/usr/bin/env node
// =============================================================================
// The spectrograph kernel against its committed thresholds (Prompt 213)
// -----------------------------------------------------------------------------
//   npm run spectrograph:validate            print the table
//   npm run spectrograph:validate -- --json  print it as JSON
//
// tests/fixtures/spectrograph/thresholds.json fixed every bound before the kernel
// existed; this runs the checks against js/kernels/spectrograph/ and judges them
// against the bounds read from that file. The oracle's rows read the results pinned in
// tests/fixtures/spectrograph/ (tools/spectrograph-oracle/oracle.py: numpy, scipy and
// astropy, no Gravitas code). C and D run seeded ensembles. E1 and E2 use the SDSS
// spectra already in the repository (no download). A crossed bound is a failed row,
// left failing in tests/fixtures/spectrograph/failed-legs.json.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/spectrograph/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { planckLambda } from '../js/kernels/radiation/planck.js';
import {
  GRID,
  SPECTRA,
  decodeSpectrum,
  wavelengthAt,
} from '../js/data/spectra/sdssSpectra.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/spectrograph/thresholds.json');
const ORA = read('tests/fixtures/spectrograph/oracle-results.json');
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const KC = THR.constants;
const rel = (a, b) => Math.abs(a / b - 1);
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const SEED = THR.seeds.ensemble;
const C_KM_S = 299792.458;

const byId = id => LINES.find(l => l.id === id);
const REF = K.REFERENCE;
const range = (n, f = i => i) => Array.from({ length: n }, (_, i) => f(i));
const sdOf = a => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

// ----------------------------------------------------------------------------- a
function a1() {
  const l = lim('A1.lsf');
  let worst = 0;
  let half = 0;
  for (const R of [50, 500, 1500, 50000])
    for (const lam of [380, 656.279, 1000]) {
      const fwhm = K.fwhmFromResolvingPower(lam, R);
      const sigma = K.sigmaFromFwhm(fwhm);
      const back = K.resolvingPower(lam, K.fwhmFromSigma(sigma));
      worst = Math.max(worst, rel(back, R), rel(K.fwhmFromSigma(sigma), fwhm));
      half = Math.max(
        half,
        rel(
          K.gaussianDensity(fwhm / 2, sigma) / K.gaussianDensity(0, sigma),
          0.5
        )
      );
    }
  row(
    'A1.lsf',
    worst <= l.relMax &&
      half <= l.halfRelMax &&
      rel(K.FWHM_PER_SIGMA, KC.fwhmPerSigma) < 1e-15,
    { roundTripRel: worst, halfPowerRel: half }
  );
}

function a2() {
  const l = lim('A2.pixel.integral');
  let abs = 0;
  let tail = 0;
  for (const c of ORA.a2.cases) {
    const v = K.gaussianArea(c.mu, c.sigma, c.a, c.b);
    abs = Math.max(abs, Math.abs(v - c.value));
  }
  for (const c of ORA.a2.tail) {
    const v = K.gaussianArea(c.mu, c.sigma, c.a, c.b);
    tail = Math.max(tail, rel(v, c.value));
  }
  let sumErr = 0;
  for (const sg of [0.2, 1, 2.5]) {
    let s = 0;
    for (let i = -Math.ceil(10 * sg) - 1; i <= Math.ceil(10 * sg) + 1; i++)
      s += K.gaussianArea(0.123, sg, i - 0.5, i + 0.5);
    sumErr = Math.max(sumErr, Math.abs(s - 1));
  }
  // the integral over minus 10 to plus 10 sigma is 1 less 1.5e-23: the pixels cover more, so the sum is 1
  row(
    'A2.pixel.integral',
    abs <= l.absMax &&
      tail <= l.tailRelMax &&
      sumErr <= l.sumAbsMax &&
      ORA.a2.cases.length === l.cases,
    {
      absMax: abs,
      tailRelMax: tail,
      sumAbsErr: sumErr,
      cases: ORA.a2.cases.length,
    }
  );
}

function a3() {
  const l = lim('A3.sampling');
  const spec = K.referenceSpectrograph();
  const [, c1, c2, c3] = REF.coefficients;
  let worst = 0;
  for (const x of [0, 200, 1000, 1500, 2047]) {
    const d = c1 + 2 * c2 * x + 3 * c3 * x * x;
    worst = Math.max(worst, rel(spec.samplingAt(x), REF.lsfFwhmNm / d));
  }
  const v = s => K.judgeSampling(s);
  const verdicts = [1.99, 2, 2.01, 3, 0.5].map(v);
  const want = ['undersampled', 'ok', 'ok', 'ok', 'severely-undersampled'];
  const at0 = spec.samplingAt(0);
  row(
    'A3.sampling',
    worst <= l.relMax &&
      verdicts.every((x, i) => x === want[i]) &&
      Math.abs(at0 - 2.857) < 0.001 &&
      K.SAMPLING_CRITERION === l.criterionPixels,
    { relErr: worst, verdicts, samplingAt380: at0 }
  );
}

function a4() {
  const l = lim('A4.line.flux');
  let worst = 0;
  let centre = 0;
  for (const s of l.samplings) {
    const d = REF.lsfFwhmNm / s;
    const spec = K.makeSpectrograph({
      coefficients: [450 - 200 * d, d],
      nPixels: 400,
      lsfFwhmNm: REF.lsfFwhmNm,
    });
    const F = 1e5;
    const ex = K.expectedCounts(spec, {
      continuum: K.flatContinuum(0),
      lines: [K.emissionLine({ centreNm: 450 + 0.3 * d, fluxE: F })],
    });
    const sum = ex.reduce((a, b) => a + b, 0);
    worst = Math.max(worst, rel(sum, F));
    const o = ORA.a4.find(c => c.sampling === s);
    const spec2 = K.makeSpectrograph({
      coefficients: [o.pixelCentreNm - 10 * o.dispersionNm, o.dispersionNm],
      nPixels: 40,
      lsfFwhmNm: REF.lsfFwhmNm,
    });
    const e2 = K.expectedCounts(spec2, {
      continuum: K.flatContinuum(0),
      lines: [K.emissionLine({ centreNm: o.centreNm, fluxE: 1 })],
    });
    centre = Math.max(centre, rel(e2[10], o.area));
  }
  row('A4.line.flux', worst <= l.relMax && centre <= l.relMax, {
    fluxRel: worst,
    centrePixelRel: centre,
  });
}

function a5() {
  const l = lim('A5.absorption');
  let profile = 0;
  let ewErr = 0;
  let ewBb = 0;
  for (const R of l.resolvingPowers) {
    const fwhm = 500 / R;
    const d = fwhm / 2.5;
    const spec = K.makeSpectrograph({
      coefficients: [500 - 300 * d, d],
      nPixels: 600,
      lsfFwhmNm: fwhm,
    });
    const line = K.absorptionLine({
      centreNm: 500 + 0.37 * d,
      sigmaIntNm: 0.05,
      depth: 0.4,
    });
    const C = 1e6;
    const flat = K.flatContinuum(C);
    const ex = K.expectedCounts(spec, { continuum: flat, lines: [line] });
    const ew = K.equivalentWidthOf(0.4, 0.05);
    const sig = Math.hypot(0.05, spec.lsfSigmaNm);
    // the closed form of the removal in each pixel: C EW area(sigma_total); and the profile function's identities
    const prof = K.observedLineProfile(line, spec.lsfSigmaNm);
    profile = Math.max(
      profile,
      rel(prof.sigmaNm, sig),
      rel(prof.depth, (0.4 * 0.05) / sig)
    );
    let sumEw = 0;
    for (let i = 0; i < 600; i++) {
      const a = spec.edges[i];
      const b = spec.edges[i + 1];
      const want =
        C * (b - a) - C * ew * K.gaussianArea(line.centreNm, sig, a, b);
      profile = Math.max(profile, Math.abs(ex[i] - want) / (C * d));
      if (Math.abs(spec.centreNm(i) - line.centreNm) <= 12 * sig)
        sumEw += (1 - ex[i] / (C * (b - a))) * (b - a);
    }
    ewErr = Math.max(ewErr, rel(sumEw, ew));
    // the same on a blackbody continuum: the equivalent width against the continuum at the line
    const bb = K.blackbodyContinuum({
      temperatureK: 6000,
      densityAt500PerNm: 1e6,
    });
    const eb = K.expectedCounts(spec, { continuum: bb, lines: [line] });
    const cont = K.expectedCounts(spec, { continuum: bb, lines: [] });
    let s2 = 0;
    for (let i = 0; i < 600; i++)
      if (Math.abs(spec.centreNm(i) - line.centreNm) <= 12 * sig)
        s2 += (1 - eb[i] / cont[i]) * (spec.edges[i + 1] - spec.edges[i]);
    ewBb = Math.max(ewBb, rel(s2, ew));
  }
  row(
    'A5.absorption',
    profile <= l.profileRelMax && ewErr <= l.ewRelMax,
    {
      profileMax: profile,
      equivalentWidthRelFlat: ewErr,
      equivalentWidthRelBlackbody: ewBb,
    },
    // C in the contract's (1 - F / C) is a constant: the flat continuum is the row. The blackbody figure is measured as well and
    // reported, not judged: it is the neglected second-order curvature of the continuum, which B1 bounds against the oracle.
    'the blackbody figure is informational: the continuum\u2019s curvature beyond the first order is not modelled'
  );
}

function a6() {
  const l = lim('A6.continuum');
  let worst = 0;
  for (const c of ORA.a6) {
    const v =
      K.integrateOverPixel(lam => planckLambda(lam * 1e-9, c.T), c.aNm, c.bNm) *
      1e-9;
    worst = Math.max(worst, rel(v, c.value));
  }
  // the continuum helper agrees with the Planck function up to its scale
  const bb = K.blackbodyContinuum({ temperatureK: 5800, densityAt500PerNm: 1 });
  const scaleErr = rel(
    bb.density(600) / bb.density(450),
    planckLambda(600e-9, 5800) / planckLambda(450e-9, 5800)
  );
  row('A6.continuum', worst <= l.relMax && scaleErr < 1e-14, {
    relMax: worst,
    cases: ORA.a6.length,
  });
}

function a7() {
  const l = lim('A7.doppler.media');
  const ha = byId('h-alpha');
  let rt = 0;
  let wl = 0;
  for (const c of ORA.a7.cases) {
    const star = K.starTemplate({
      lines: [ha],
      medium: 'air',
      velocityKmS: c.v,
    });
    wl = Math.max(wl, rel(star.lines[0].centreNm, c.obsAirNm));
    const r = K.radialVelocity({
      observedNm: star.lines[0].centreNm,
      restNm: ha.air,
      observedMedium: 'air',
      restMedium: 'air',
    });
    rt = Math.max(
      rt,
      c.v === 0 ? Math.abs(r.velocityKmS) : rel(r.velocityKmS, c.v)
    );
  }
  const off = K.mediaOffsetKmS(ha);
  const offErr = rel(off, ORA.a7.mediaOffsetKmS);
  const mism = K.radialVelocity({
    observedNm: 656.5,
    restNm: ha.air,
    observedMedium: 'vacuum',
    restMedium: 'air',
  });
  const miss = K.radialVelocity({
    observedNm: 656.5,
    restNm: ha.air,
    restMedium: 'air',
  });
  row(
    'A7.doppler.media',
    wl <= l.relMax &&
      rt <= 1e-12 &&
      offErr <= l.relMax &&
      mism.status === 'refused' &&
      mism.reason === 'medium-mismatch' &&
      miss.status === 'refused' &&
      miss.reason === 'medium-missing',
    {
      wavelengthRel: wl,
      roundTrip: rt,
      offsetKmS: off,
      offsetRel: offErr,
      mismatch: mism.reason,
      missing: miss.reason,
    }
  );
}

// ----------------------------------------------------------------------------- the arc, shared
const XS = Float64Array.from({ length: REF.nPixels }, (_, i) => i);
const isolatedOf = spec => {
  const ids = K.isolatedLines(spec, LINES, 'air')
    .filter(l => l.air >= spec.rangeNm[0] && l.air <= spec.rangeNm[1] - 1)
    .map(l => l.id);
  return ids.map(byId);
};

/** fit every isolated line of an exposure; the guess is the pixel nearest the truth (a student's mark) */
function fitArc(spec, expo, lines, half = 12) {
  return lines.map(l => {
    const tx = spec.pixelOf(l.air);
    const fit = K.fitLine(XS, expo.counts, expo.sigma, {
      guess: Math.round(tx),
      halfWidth: half,
      lsfFwhmPx: spec.fwhmPxAt(tx),
    });
    return { line: l, truthPx: tx, fit };
  });
}
const solutionOf = (fits, degree) =>
  K.fitSolution(
    fits
      .filter(f => f.fit.status === 'ok')
      .map(f => ({
        x: f.fit.centrePx,
        sigmaX: f.fit.sigmaCentrePx,
        wavelengthNm: f.line.air,
        id: f.line.id,
      })),
    degree,
    { medium: 'air' }
  );

function a8() {
  const l = lim('A8.recovery.noise-free');
  const spec = K.referenceSpectrograph();
  const lamp = K.arcLamp(spec, LINES, 'air');
  const expo = K.exposure(spec, lamp);
  const fits = fitArc(spec, expo, isolatedOf(spec));
  const sol = solutionOf(fits, 3);
  let cMax = 0;
  let rMax = 0;
  for (const f of fits) {
    cMax = Math.max(cMax, Math.abs(sol.at(f.fit.centrePx) - f.line.air));
    const rr = K.resolvingPowerFromFit(f.fit, sol);
    rMax = Math.max(rMax, rel(rr.R, f.line.air / REF.lsfFwhmNm));
  }
  row(
    'A8.recovery.noise-free',
    cMax <= l.centreAbsMaxNm && rMax <= l.resolvingPowerRelMax,
    {
      lines: fits.length,
      centreAbsMaxNm: cMax,
      resolvingPowerRelMax: rMax,
    }
  );
}

// ----------------------------------------------------------------------------- b
function b1() {
  const l = lim('B1.convolution');
  const ids = ['h-beta', 'h-gamma', 'h-delta', 'h-epsilon'];
  let worst = 0;
  const per = [];
  for (const c of ORA.b1.cases) {
    const spec = K.makeSpectrograph({
      coefficients: [ORA.b1.pixelCentre0Nm, ORA.b1.pixelNm],
      nPixels: ORA.b1.nPixels,
      lsfFwhmNm: ORA.b1.refNm / c.R,
    });
    const star = K.starTemplate({
      lines: ids.map(byId),
      medium: 'air',
      velocityKmS: 0,
      temperatureK: 6000,
      densityAt500PerNm: 1e5,
      sigmaIntNm: 0.1,
      depth: 0.4,
    });
    const ex = K.expectedCounts(spec, star);
    const cont = K.expectedCounts(spec, {
      continuum: star.continuum,
      lines: [],
    });
    let m = 0;
    for (let i = 0; i < ex.length; i++)
      m = Math.max(m, Math.abs(ex[i] - c.counts[i]) / cont[i]);
    per.push({ R: c.R, maxOfContinuum: m });
    worst = Math.max(worst, m);
  }
  row('B1.convolution', worst <= l.absOfContinuumMax, { worst, per });
}

const oracleFits = () => ORA.arc.fits;
function b2() {
  const l = lim('B2.line.fit');
  const spec = K.referenceSpectrograph();
  const counts = Float64Array.from(ORA.arc.arc.counts);
  const sigma = Float64Array.from(ORA.arc.arc.sigma);
  let c = 0;
  let cs = 0;
  let w = 0;
  let ap = 0;
  for (const of of oracleFits()) {
    const fit = K.fitLine(XS, counts, sigma, {
      guess: of.guess,
      halfWidth: ORA.arc.windowHalf,
      lsfFwhmPx: spec.fwhmPxAt(of.guess),
    });
    if (fit.status !== 'ok') {
      row('B2.line.fit', false, { failedLine: of.id, status: fit.status });
      return;
    }
    c = Math.max(c, Math.abs(fit.centrePx - of.mu));
    cs = Math.max(
      cs,
      rel(fit.sigmaCentrePx / Math.sqrt(fit.scale), of.sigmaMu)
    );
    w = Math.max(w, rel(fit.sigmaPx, of.s));
    ap = Math.max(ap, Math.abs(fit.centrePx - of.astropyMu));
  }
  row(
    'B2.line.fit',
    c <= l.centrePxMax &&
      cs <= l.centreSigmaRelMax &&
      w <= l.widthRelMax &&
      ap <= l.astropyCentrePxMax,
    {
      lines: oracleFits().length,
      centrePx: c,
      centreSigmaRel: cs,
      widthRel: w,
      astropyCentrePx: ap,
    }
  );
}

function b3() {
  const l = lim('B3.solution.pinned');
  const lines = oracleFits().map(f => ({
    x: f.mu,
    sigmaX: f.sigmaMu,
    wavelengthNm: f.air,
    id: f.id,
  }));
  const px = ORA.arc.pixels50;
  const out = [];
  let ok = true;
  for (const o of ORA.arc.solutions) {
    const sol = K.fitSolution(lines, o.degree, { medium: 'air' });
    let wv = 0;
    let sg = 0;
    let res = 0;
    let sl = 0;
    let ac = 0;
    px.forEach((x, i) => {
      wv = Math.max(wv, Math.abs(sol.at(x) - o.wavelength50[i]));
      sg = Math.max(
        sg,
        rel(sol.sigmaAt(x) / Math.sqrt(sol.scale), o.sigma50[i])
      );
      ac = Math.max(ac, Math.abs(sol.at(x) - o.astropyWavelength50[i]));
    });
    sol.residualsNm.forEach(
      (r, i) => (res = Math.max(res, Math.abs(r - o.residualsNm[i])))
    );
    sol.sigmaLamNm.forEach(
      (s, i) => (sl = Math.max(sl, rel(s, o.sigmaLamNm[i])))
    );
    const c2 = rel(sol.chi2, o.chi2);
    const good =
      wv <= l.wavelengthNmMax &&
      sg <= l.sigmaRelMax &&
      c2 <= l.chi2RelMax &&
      res <= l.residualNmMax &&
      ac <= l.wavelengthNmMax &&
      sol.dof === o.dof &&
      sl <= 1e-8;
    ok = ok && good;
    out.push({
      degree: o.degree,
      wavelengthNm: wv,
      sigmaRel: sg,
      chi2Rel: c2,
      residualNm: res,
      astropyNm: ac,
      sigmaLamRel: sl,
    });
  }
  row('B3.solution.pinned', ok, out);
}

function b4() {
  const l = lim('B4.pipeline');
  const spec = K.referenceSpectrograph();
  const counts = Float64Array.from(ORA.arc.arc.counts);
  const sigma = Float64Array.from(ORA.arc.arc.sigma);
  const fits = oracleFits().map(of => {
    const fit = K.fitLine(XS, counts, sigma, {
      guess: of.guess,
      halfWidth: ORA.arc.windowHalf,
      lsfFwhmPx: spec.fwhmPxAt(of.guess),
    });
    return { fit, line: byId(of.id) };
  });
  const sol = solutionOf(fits, 3);
  const o = ORA.arc.solutions.find(s => s.degree === 3);
  let wv = 0;
  let sg = 0;
  ORA.arc.pixels50.forEach((x, i) => {
    wv = Math.max(wv, Math.abs(sol.at(x) - o.wavelength50[i]));
    sg = Math.max(sg, rel(sol.sigmaAt(x) / Math.sqrt(sol.scale), o.sigma50[i]));
  });
  row('B4.pipeline', wv <= l.wavelengthNmMax && sg <= l.sigmaRelMax, {
    wavelengthNm: wv,
    sigmaRel: sg,
  });
}

// ----------------------------------------------------------------------------- c
const pooled = (zs, lo, hi) => {
  const within = k => zs.filter(z => Math.abs(z) <= k).length / zs.length;
  return {
    one: within(1),
    two: within(2),
    n: zs.length,
    ok1: within(1) >= lo[0] && within(1) <= lo[1],
    hi,
  };
};

function arcEnsemble(n, label) {
  const spec = K.referenceSpectrograph();
  const lamp = K.arcLamp(spec, LINES, 'air');
  const expected = K.expectedCounts(spec, lamp);
  const lines = isolatedOf(spec);
  const out = [];
  for (let k = 0; k < n; k++) {
    const { counts, sigma } = K.addNoise(
      expected,
      spec.readNoiseE,
      K.normalStream(SEED, label, k)
    );
    out.push({ spec, fits: fitArc(spec, { counts, sigma }, lines) });
  }
  return out;
}

function c1c4() {
  const l1 = lim('C1.centre.coverage');
  const l4 = lim('C4.resolving.power.coverage');
  const ens = arcEnsemble(l1.arcs, 'C1');
  const zs = [];
  const zr = [];
  let bad = 0;
  for (const { spec, fits } of ens)
    for (const f of fits) {
      if (f.fit.status !== 'ok') {
        bad++;
        continue;
      }
      zs.push((f.fit.centrePx - f.truthPx) / f.fit.sigmaCentrePx);
      const rr = K.resolvingPowerFromFit(f.fit, {
        at: spec.truth.at,
        dispersionAt: spec.truth.slope,
      });
      zr.push((rr.R - f.line.air / REF.lsfFwhmNm) / rr.sigmaR);
    }
  const a = pooled(zs, l1.oneSigma);
  const two = a.two >= l1.twoSigma[0] && a.two <= l1.twoSigma[1];
  row('C1.centre.coverage', a.ok1 && two && bad === 0, {
    oneSigma: a.one,
    twoSigma: a.two,
    n: a.n,
    failedFits: bad,
  });
  const b = pooled(zr, l4.oneSigma);
  row('C4.resolving.power.coverage', b.ok1, {
    oneSigma: b.one,
    twoSigma: b.two,
    n: b.n,
  });
}

function c2c3() {
  const l2 = lim('C2.solution.coverage');
  const l3 = lim('C3.velocity.coverage');
  const spec = K.referenceSpectrograph();
  const lamp = K.arcLamp(spec, LINES, 'air');
  const expArc = K.expectedCounts(spec, lamp);
  const lines = isolatedOf(spec);
  const balmer = ['h-beta', 'h-gamma', 'h-delta', 'h-epsilon'].map(byId);
  const star = K.starTemplate({
    lines: balmer,
    medium: 'air',
    velocityKmS: THR.reference.science.velocityKmS,
    temperatureK: 6000,
    densityAt500PerNm: 1e4 / spec.dispersionAt(spec.pixelOf(500)),
    sigmaIntNm: 0.1,
    depth: 0.4,
  });
  const expSci = K.expectedCounts(spec, star);
  const z2 = [];
  const z3 = [];
  let refused = 0;
  for (let k = 0; k < l2.arcs; k++) {
    const a = K.addNoise(
      expArc,
      spec.readNoiseE,
      K.normalStream(SEED, 'C2', k)
    );
    const fits = fitArc(spec, a, lines);
    const sol = solutionOf(fits, 3);
    if (sol.status !== 'constrained') {
      refused++;
      continue;
    }
    for (const x of l2.pixels)
      z2.push((sol.at(x) - spec.truth.at(x)) / sol.sigmaAt(x));
    const s = K.addNoise(
      expSci,
      spec.readNoiseE,
      K.normalStream(SEED, 'C3', k)
    );
    for (const ln of star.lines) {
      const tx = spec.pixelOf(ln.centreNm);
      const f = K.fitLine(XS, s.counts, s.sigma, {
        guess: Math.round(tx),
        halfWidth: 12,
        lsfFwhmPx: spec.fwhmPxAt(tx),
      });
      if (f.status !== 'ok') {
        refused++;
        continue;
      }
      const w = sol.wavelengthOf(f.centrePx, f.sigmaCentrePx);
      const v = K.radialVelocity({
        observedNm: w.nm,
        sigmaNm: w.sigmaNm,
        restNm: byId(ln.id).air,
        observedMedium: 'air',
        restMedium: 'air',
      });
      z3.push((v.velocityKmS - THR.reference.science.velocityKmS) / v.sigmaKmS);
    }
  }
  const a = pooled(z2, l2.oneSigma);
  row(
    'C2.solution.coverage',
    a.ok1 &&
      a.two >= l2.twoSigma[0] &&
      a.two <= l2.twoSigma[1] &&
      refused === 0,
    { oneSigma: a.one, twoSigma: a.two, n: a.n, refused }
  );
  const b = pooled(z3, l3.oneSigma);
  row(
    'C3.velocity.coverage',
    b.ok1 && b.two >= l3.twoSigma[0] && b.two <= l3.twoSigma[1],
    { oneSigma: b.one, twoSigma: b.two, n: b.n }
  );
}

function c5() {
  const l = lim('C5.misspecified');
  const spec = K.referenceSpectrograph({
    coefficients: [380, 0.105, 0, 2.4e-10],
  });
  const lamp = K.arcLamp(spec, LINES, 'air');
  const exp = K.expectedCounts(spec, lamp);
  const lines = isolatedOf(spec);
  let flagLine = 0;
  let flagCubic = 0;
  for (let k = 0; k < l.arcs; k++) {
    const a = K.addNoise(exp, spec.readNoiseE, K.normalStream(SEED, 'C5', k));
    const fits = fitArc(spec, a, lines);
    if (solutionOf(fits, 1).flagged) flagLine++;
    if (solutionOf(fits, 3).flagged) flagCubic++;
  }
  row(
    'C5.misspecified',
    flagLine / l.arcs >= l.minFlagged && flagCubic / l.arcs <= l.maxFalseFlag,
    {
      lineFlagged: flagLine / l.arcs,
      cubicFlagged: flagCubic / l.arcs,
    }
  );
}

// ----------------------------------------------------------------------------- d
function d1() {
  const l = lim('D1.not.constrained');
  const truth = K.truthSolution(REF.coefficients);
  const mk = xs =>
    xs.map(x => ({ x, sigmaX: 0.01, wavelengthNm: truth.at(x) }));
  const L5 = mk([100, 400, 900, 1400, 1900]);
  const r = (n, d) => K.fitSolution(L5.slice(0, n), d);
  const ncs = [r(2, 3), r(3, 3), r(1, 1)];
  const ex = r(4, 3);
  const con = r(5, 3);
  const two = r(2, 1);
  const dup = K.fitSolution(
    [...L5.slice(0, 2), { ...L5[0], wavelengthNm: 500 }],
    1
  );
  const nan = K.fitSolution(
    [{ x: NaN, sigmaX: 1, wavelengthNm: 400 }, L5[1]],
    1
  );
  const neg = K.fitSolution([{ ...L5[0], sigmaX: 0 }, L5[1]], 1);
  const hi = r(5, l.maxDegree + 1);
  let exactErr = 0;
  for (const x of [0, 700, 1500, 2047])
    exactErr = Math.max(exactErr, Math.abs(ex.at(x) - truth.at(x)));
  const pass =
    ncs.every(
      s =>
        s.status === 'not-constrained' && s.coefficients === null && s.message
    ) &&
    ex.status === 'exactly-determined' &&
    /no residual/.test(ex.message) &&
    ex.dof === 0 &&
    ex.sigmaAt(1000) > 0 &&
    exactErr < 1e-8 &&
    con.status === 'constrained' &&
    con.dof >= 1 &&
    two.status === 'exactly-determined' &&
    dup.reason === 'duplicate-pixel' &&
    nan.reason === 'not-finite' &&
    neg.reason === 'bad-error' &&
    hi.reason === 'bad-degree' &&
    con.extrapolated(3000) === true &&
    con.extrapolated(500) === false;
  row('D1.not.constrained', pass, {
    states: [ncs.map(s => s.status), ex.status, con.status, two.status],
    refusals: [dup.reason, nan.reason, neg.reason, hi.reason],
    exactErr,
  });
}

function d2() {
  const l = lim('D2.blend');
  const fw = REF.lsfFwhmNm;
  const d = 0.105;
  const spec = K.makeSpectrograph({
    coefficients: [500, d],
    nPixels: 200,
    lsfFwhmNm: fw,
    readNoiseE: 5,
  });
  const xsL = Float64Array.from({ length: 200 }, (_, i) => i);
  const sigNm = spec.lsfSigmaNm;
  const flux = (1e4 * sigNm * Math.sqrt(2 * Math.PI)) / d;
  const centre = 500 + 100.3 * d;
  const run = sep => {
    const lines =
      sep === null
        ? [centre]
        : [centre - (sep * fw) / 2, centre + (sep * fw) / 2];
    const exp = K.expectedCounts(spec, {
      continuum: { perPixel: 20, density: () => 0, slope: () => 0 },
      lines: lines.map(c => K.emissionLine({ centreNm: c, fluxE: flux })),
    });
    let flagged = 0;
    for (let k = 0; k < l.trials; k++) {
      const a = K.addNoise(exp, 5, K.normalStream(SEED, 'D2', String(sep), k));
      const f = K.fitLine(xsL, a.counts, a.sigma, {
        guess: 100,
        halfWidth: 12,
        lsfFwhmPx: spec.fwhmPxAt(100),
      });
      if (f.status === 'ok' && f.broadened) flagged++;
    }
    return flagged / l.trials;
  };
  const per = Object.fromEntries(l.separationsFwhm.map(s => [s, run(s)]));
  const single = run(null);
  const near = run(0.15);
  const pass =
    l.separationsFwhm.every(s => per[s] >= l.minFlagged) &&
    single <= l.maxFalseFlag;
  row('D2.blend', pass, {
    flaggedBySeparation: per,
    singleLine: single,
    pairAt015: near,
  });
}

function d3() {
  const l = lim('D3.undersampled');
  const mk = c1 =>
    K.makeSpectrograph({
      coefficients: [500, c1],
      nPixels: 300,
      lsfFwhmNm: 0.3,
    });
  const run = (spec, window) => {
    const ex = K.expectedCounts(spec, {
      continuum: { perPixel: 100, density: () => 0, slope: () => 0 },
      lines: [K.emissionLine({ centreNm: spec.truth.at(150.2), fluxE: 2e4 })],
    });
    const xs = Float64Array.from({ length: 300 }, (_, i) => i);
    const sg = Float64Array.from(ex, v => Math.sqrt(v + 25));
    return { xs, ex, sg, spec, ...(window ?? {}) };
  };
  const u = run(mk(0.2));
  const fu = K.fitLine(u.xs, u.ex, u.sg, {
    guess: 150,
    halfWidth: 8,
    lsfFwhmPx: u.spec.fwhmPxAt(150),
  });
  const s = run(mk(0.6));
  const fs = K.fitLine(s.xs, s.ex, s.sg, {
    guess: 150,
    halfWidth: 8,
    lsfFwhmPx: s.spec.fwhmPxAt(150),
  });
  const few = K.fitLine(
    u.xs.slice(148, 153),
    u.ex.slice(148, 153),
    u.sg.slice(148, 153),
    { guess: 150, halfWidth: 8, lsfFwhmPx: 3 }
  );
  const badSigma = Float64Array.from(u.sg);
  badSigma[150] = 0;
  const fb = K.fitLine(u.xs, u.ex, badSigma, {
    guess: 150,
    halfWidth: 8,
    lsfFwhmPx: 3,
  });
  const mask = new Uint8Array(300);
  mask[152] = 1;
  const fm = K.fitLine(u.xs, u.ex, u.sg, {
    guess: 150,
    halfWidth: 8,
    lsfFwhmPx: 3,
    mask,
  });
  const pass =
    fu.status === 'ok' &&
    fu.samplingVerdict === 'undersampled' &&
    Math.abs(fu.sampling - l.undersampledAt) < 0.01 &&
    fs.status === 'not-constrained' &&
    few.reason === 'too-few-pixels' &&
    fb.reason === 'bad-error' &&
    fm.reason === 'masked-pixel';
  row('D3.undersampled', pass, {
    atOnePointFive: fu.status + ':' + fu.samplingVerdict,
    atHalf: fs.status + ':' + fs.reason,
    refusals: [few.reason, fb.reason, fm.reason],
  });
}

// ----------------------------------------------------------------------------- f
function f1() {
  const l = lim('F1.line.snr');
  let disc = 0;
  let cont = 0;
  for (const c of ORA.f1) {
    const s = K.ewSigma({
      sigmaObsNm: c.sigmaObsNm,
      continuumPerNm: c.continuumPerNm,
      pixelNm: c.pixelNm,
      readNoiseE: c.readNoiseE,
      centreOffsetPx: c.centreOffsetPx,
    });
    disc = Math.max(disc, rel(s, c.sigmaEw));
    if (c.continuous !== null) {
      const fwhmPx = (c.sigmaObsNm * K.FWHM_PER_SIGMA) / c.pixelNm;
      if (fwhmPx >= 2.5)
        cont = Math.max(
          cont,
          rel(c.sigmaEw, K.ewSigmaContinuous(c.sigmaObsNm, c.continuumPerNm))
        );
    }
  }
  // the ensemble: an amplitude-only weighted fit of a weak line of known shape on a known continuum
  const d = 0.105;
  const sigLsf = 0.1414;
  const sigInt = 0.05;
  const sigObs = Math.hypot(sigInt, sigLsf);
  const ew = 0.01;
  const Sc = 1e5;
  const spec = K.makeSpectrograph({
    coefficients: [500, d],
    nPixels: 64,
    lsfFwhmNm: sigLsf * K.FWHM_PER_SIGMA,
    readNoiseE: 5,
  });
  const centre = 500 + 32.31 * d;
  const depth = ew / (sigInt * Math.sqrt(2 * Math.PI));
  const exp = K.expectedCounts(spec, {
    continuum: K.flatContinuum(Sc),
    lines: [K.absorptionLine({ centreNm: centre, sigmaIntNm: sigInt, depth })],
  });
  const P = range(64, i =>
    K.gaussianArea(centre, sigObs, spec.edges[i], spec.edges[i + 1])
  );
  const est = [];
  for (let k = 0; k < l.trials; k++) {
    const a = K.addNoise(exp, 5, K.normalStream(SEED, 'F1', k));
    let num = 0;
    let den = 0;
    for (let i = 0; i < 64; i++) {
      const w = 1 / a.sigma[i] ** 2;
      num +=
        w *
        Sc *
        P[i] *
        (Sc * (spec.edges[i + 1] - spec.edges[i]) - a.counts[i]);
      den += w * Sc * Sc * P[i] * P[i];
    }
    est.push(num / den);
  }
  const ens = sdOf(est);
  const analytic = K.ewSigma({
    sigmaObsNm: sigObs,
    continuumPerNm: Sc,
    pixelNm: d,
    readNoiseE: 5,
    centreOffsetPx: 0.31,
  });
  const ensRel = rel(ens, analytic);
  const mean = est.reduce((a, b) => a + b, 0) / est.length;
  row(
    'F1.line.snr',
    disc <= l.discreteRelMax &&
      cont <= l.continuousRelMax &&
      ensRel <= l.ensembleRelMax,
    {
      discreteRel: disc,
      continuousRel: cont,
      ensembleSdOverAnalytic: ens / analytic,
      meanEw: mean,
      trials: l.trials,
    }
  );
}

function f2() {
  const l = lim('F2.slit.throughput');
  let worst = 0;
  for (const c of ORA.f2) {
    worst = Math.max(
      worst,
      Math.abs(K.slitThroughput(c.ratio, 1) - c.throughput)
    );
    worst = Math.max(
      worst,
      Math.abs(K.slitThroughput(c.ratio * 2.7, 2.7) - c.throughput)
    );
  }
  const atRs = K.throughputAtR(3000, 3000);
  const consist = Math.abs(
    K.throughputAtR(1234, 3000) -
      K.slitThroughput(K.slitWidthFor(1234, 3000, 0.9), 0.9)
  );
  row(
    'F2.slit.throughput',
    worst <= l.absMax &&
      rel(atRs, 0.760968108) <= l.atRsRelMax &&
      consist < 1e-12,
    { absMax: worst, atRs, consistency: consist }
  );
}

function f3() {
  const l = lim('F3.trade');
  const Rs = 3000;
  const lam = 500;
  let mono = 0;
  let prev = -Infinity;
  for (let i = 0; i < 400; i++) {
    const R = (Rs / 20) * 800 ** (i / 399);
    const v = K.lineObjective(R, { Rs, lambdaNm: lam, sigmaIntNm: 0 });
    mono = Math.max(mono, (prev - v) / v);
    prev = v;
  }
  const limit =
    ((2 / Math.sqrt(Math.PI)) * Math.sqrt(Math.LN2) * Rs * K.FWHM_PER_SIGMA) /
    lam;
  const atRs =
    K.lineObjective(Rs, { Rs, lambdaNm: lam, sigmaIntNm: 0 }) / limit;
  const per = [];
  let opt = 0;
  for (const c of ORA.f3.cases) {
    const o = K.optimumResolvingPower({
      Rs,
      lambdaNm: lam,
      sigmaIntNm: c.sigmaIntNm,
    });
    opt = Math.max(opt, rel(o.R, c.RsStar));
    per.push({
      sigmaInt: c.sigmaIntNm,
      R: o.R,
      oracle: c.RsStar,
      interior: !o.atBound,
    });
  }
  row(
    'F3.trade',
    Math.max(0, mono) <= l.monotoneRelMax &&
      rel(atRs, KC.slitAtUnitRatio) <= l.atRsRelMax &&
      opt <= l.optimumRelMax &&
      per.every(p => p.interior),
    { monotoneViolation: mono, atRsOverLimit: atRs, optimumRel: opt, per }
  );
}

// ----------------------------------------------------------------------------- e
function e1() {
  const l = lim('E1.authentic.sdss');
  const per = [];
  let passing = 0;
  for (const star of l.stars) {
    const sp = decodeSpectrum(star);
    const pubV = C_KM_S * SPECTRA[star].z;
    for (const id of l.lines) {
      const rest = byId(id).vacuum;
      const pixNm = rest * Math.LN10 * GRID.logStep;
      const half = Math.round(l.windowNm / pixNm);
      const guess = Math.round(
        (Math.log10(rest * 10) - GRID.logStart) / GRID.logStep
      );
      const xs = Float64Array.from({ length: sp.flux.length }, (_, i) => i);
      const f = K.fitLine(xs, sp.flux, null, { guess, halfWidth: half });
      if (f.status !== 'ok') {
        per.push({ star, line: id, status: f.status });
        continue;
      }
      const obsNm = wavelengthAt(f.centrePx) / 10;
      const sigNm = obsNm * Math.LN10 * GRID.logStep * f.sigmaCentrePx;
      const v = K.radialVelocity({
        observedNm: obsNm,
        sigmaNm: sigNm,
        restNm: rest,
        observedMedium: 'vacuum',
        restMedium: 'vacuum',
      });
      const diff = v.velocityKmS - pubV;
      const bound = Math.max(l.sigmas * v.sigmaKmS, l.floorKmS);
      const ok = Math.abs(diff) <= bound;
      if (ok) passing++;
      per.push({
        star,
        line: id,
        kmS: +v.velocityKmS.toFixed(1),
        sigmaKmS: +v.sigmaKmS.toFixed(1),
        publishedKmS: +pubV.toFixed(1),
        diffKmS: +diff.toFixed(1),
        bound: +bound.toFixed(1),
        ok,
      });
    }
  }
  row('E1.authentic.sdss', passing >= l.minPassing, {
    passing,
    of: per.length,
    per,
  });
}

function e2() {
  const l = lim('E2.authentic.sampling');
  const s1 = K.samplingOnLogGrid(l.resolvingPower, l.logStep);
  const s3 = K.samplingOnLogGrid(l.resolvingPower, 3e-4);
  row(
    'E2.authentic.sampling',
    Math.abs(s1 - l.expected) <= l.absMax &&
      K.judgeSampling(s3) !== 'ok' &&
      Math.abs(s3 - 0.72) < 0.01,
    { archiveStep: s1, thinnedStep: s3, thinnedVerdict: K.judgeSampling(s3) },
    // below one pixel per FWHM the kernel's verdict is the stronger 'severely-undersampled'; the contract's 'flagged undersampled' holds for both
    'the pack\u2019s 0.72 is under the floor of 1, so the verdict is severely-undersampled'
  );
}

// ----------------------------------------------------------------------------- p
function p1() {
  const l = lim('P1.speed');
  const spec = K.referenceSpectrograph();
  const t0 = process.hrtime.bigint();
  const lamp = K.arcLamp(spec, LINES, 'air');
  const expo = K.exposure(spec, lamp, { seed: 'P1' });
  const fits = fitArc(spec, expo, isolatedOf(spec));
  solutionOf(fits, 3);
  const arcS = Number(process.hrtime.bigint() - t0) / 1e9;
  const t1 = process.hrtime.bigint();
  const star = K.starTemplate({
    lines: ['h-beta', 'h-gamma', 'h-delta', 'h-epsilon'].map(byId),
    medium: 'air',
    velocityKmS: 120,
  });
  K.exposure(spec, star, { seed: 'P1s' });
  const sciMs = Number(process.hrtime.bigint() - t1) / 1e6;
  row('P1.speed', arcS <= l.arcSolutionSecondsMax && sciMs <= l.scienceMsMax, {
    arcSolutionSeconds: arcS,
    scienceMs: sciMs,
  });
}

export function runChecks({ only = null } = {}) {
  rows.length = 0;
  const steps = {
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    b1,
    b2,
    b3,
    b4,
    c1c4,
    c2c3,
    c5,
    d1,
    d2,
    d3,
    f1,
    f2,
    f3,
    e1,
    e2,
    p1,
  };
  for (const [k, fn] of Object.entries(steps))
    if (!only || only.includes(k)) fn();
  return rows.slice();
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const res = runChecks({ only: onlyArg ? onlyArg.slice(7).split(',') : null });
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(res, null, 2));
  else {
    for (const r of res)
      console.log(
        `${r.status.padEnd(12)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured).slice(0, 220)}`
      );
    const fails = res.filter(r => r.status === 'fail').length;
    console.log(
      `${res.length} rows, ${res.filter(r => r.status === 'pass').length} pass, ${fails} fail`
    );
    process.exitCode = fails ? 1 : 0;
  }
}
