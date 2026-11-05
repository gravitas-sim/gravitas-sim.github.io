#!/usr/bin/env node
// =============================================================================
// The ISM kernel against its committed thresholds (Prompt 247, Part A)
// -----------------------------------------------------------------------------
//   npm run ism:validate                     print the table
//   npm run ism:validate -- --json           print it as JSON
//   npm run ism:validate -- --write-results  rewrite tests/fixtures/ism/results.json
//   npm run ism:validate -- --write-failed   rewrite tests/fixtures/ism/failed-legs.json
//   --only=A1,B1                             run the legs whose id starts with these
//
// tests/fixtures/ism/thresholds.json fixed every bound before the kernel existed (ISM.md,
// "Validation contract"); this reads the bounds from that file, not from copies. The B rows read
// tests/fixtures/ism/oracle-results.json, which tools/ism-oracle/oracle.py wrote (numpy, scipy,
// astropy; no Gravitas code). A leg whose authentic file, atomic datum or tool was never supplied is
// NOT RUN and says why. The plasma-diagnostics gate (PLASMA_DIAGNOSTICS_GATE.md) has no leg here:
// every one of its legs is NOT RUN.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/ism/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW } from '../js/data/radiation/extinction.js';
import { extinctionRatio } from '../js/kernels/radiation/extinction.js';
import { velocityFromWavelengths } from '../js/kernels/radiation/doppler.js';
import { C_LIGHT } from '../js/kernels/radiation/constants.js';
import {
  FWHM_PER_SIGMA,
  pairDip,
  samplingOnLogGrid,
  judgeSampling,
} from '../js/kernels/spectrograph/lsf.js';
import { mediaOffsetKmS } from '../js/kernels/spectrograph/measure.js';
import {
  SPECTRA,
  SPECTRUM_IDS,
  decodeSpectrum,
  wavelengths,
} from '../js/data/spectra/sdssSpectra.js';
import { stream } from '../js/random/streams.js';
import { windowsFor } from './ism-oracle/make-inputs.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/ism';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const CONSTANTS = read(`${DIR}/constants-source.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEEDS = THRESHOLDS.seeds;
const C_KM_S = C_LIGHT / 1000;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const line = id => LINES.find(l => l.id === id);
const vacuum = id => line(id).vacuum;
const lsfKmS = R => C_KM_S / R / FWHM_PER_SIGMA;

/** A spectrum object from an oracle-inputs case. */
const specOf = c => ({
  lambdaNm: Float64Array.from(c.lambdaNm),
  flux: Float64Array.from(c.flux),
  sigma: c.sigma ? Float64Array.from(c.sigma) : null,
  medium: 'vacuum',
  resolvingPower: c.resolvingPower,
});

/** The observed Gaussian sigma of a star-world line in nm, from the world's truth. */
const starSigmaNm = (t, R) =>
  (t.observedNm * Math.hypot(t.sigmaIntrinsicKmS, lsfKmS(R))) / C_KM_S;

/** A Gaussian-fit flux of one nebular line (guess at its rest wavelength). */
const fluxOf = (w, id) => {
  const f = K.fitGaussianLine(w, { guessNm: vacuum(id) * 1.0 });
  return f;
};

/** The decrement of a nebula world through H-alpha and H-beta (the analysis' RV and intrinsic ratio as given). */
function decrementOf(w, { RV = 3.1, ratio = 3.0 } = {}) {
  const a = fluxOf(w, 'h-alpha');
  const b = fluxOf(w, 'h-beta');
  if (a.status !== 'ok' || b.status !== 'ok')
    return { status: 'refused', code: 'fit-failed' };
  return K.balmerDecrement({
    numerator: {
      lambdaNm: vacuum('h-alpha'),
      flux: a.flux,
      sigma: a.sigmaFlux,
    },
    denominator: {
      lambdaNm: vacuum('h-beta'),
      flux: b.flux,
      sigma: b.sigmaFlux,
    },
    intrinsic: {
      ratio,
      source: 'the synthetic world (invented)',
      conditions: 'invented',
    },
    RV,
    law: LAW,
  });
}

const throwsCode = fn => {
  try {
    const r = fn();
    return r?.status === 'refused' ? r.code : null;
  } catch (e) {
    return e?.code ?? 'threw-without-code';
  }
};

/** Coverage and normalised-error statistics of a list of {value, sigma, truth}. */
function coverage(list) {
  const z = list.map(r => (r.value - r.truth) / r.sigma);
  return {
    n: list.length,
    coverage:
      list.filter(r => Math.abs(r.value - r.truth) <= r.sigma).length /
      list.length,
    meanZ: mean(z),
    sdZ: sd(z),
  };
}

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();

  // ---- A1: the electron radius ---------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.electronRadius');
    const { alpha, h, m_e: me, c, e, eps0 } = CONSTANTS;
    const re =
      ((alpha.value * h.value) / (2 * Math.PI * me.value * c.value)) * 100;
    const re2 =
      (e.value ** 2 / (4 * Math.PI * eps0.value * me.value * c.value ** 2)) *
      100;
    const derivation = rel(K.ELECTRON_RADIUS_CM, re);
    const consistency = rel(K.ELECTRON_RADIUS_CM, re2);
    const inputsEqual =
      K.ALPHA_FS === alpha.value && K.M_ELECTRON_KG === me.value;
    const N = K.columnFromWidth(0.1, 589, 1);
    const Nexpected = (0.1 / 589 ** 2 / (Math.PI * re)) * 1e7;
    const formula = rel(N, Nexpected);
    row(
      'A1.electronRadius',
      derivation <= L.maxRelativeDerivation &&
        consistency <= L.maxRelativeConsistency &&
        inputsEqual &&
        formula <= 1e-14,
      {
        derivation,
        consistency,
        inputsEqual,
        formula,
        electronRadiusCm: K.ELECTRON_RADIUS_CM,
      }
    );
  }

  // ---- A2: the curve of growth ---------------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.curveOfGrowth');
    const series = tau => {
      let s = 0;
      let f = 1;
      for (let n = 1; n <= 40; n++) {
        f *= n;
        s += (-tau) ** (n - 1) / (f * Math.sqrt(n));
      }
      return s;
    };
    const per = L.tau0.map(t => ({
      tau0: t,
      ratio: K.linearRegimeRatio(t),
      series: series(t),
    }));
    const worst = Math.max(...per.map(p => rel(p.ratio, p.series)));
    const atCut = per.find(p => p.tau0 === 0.3).ratio;
    row(
      'A2.curveOfGrowth',
      worst <= L.maxRelative && inRange(atCut, L.ratioAtCutRange),
      {
        worstRelative: worst,
        atCut,
        per: per.map(p => ({ ...p, ratio: sig(p.ratio, 8) })),
      }
    );
  }

  // ---- A3: noise-free velocity -------------------------------------------------------------------

  if (wanted('A3.')) {
    const L = lim('A3.noiseFreeVelocity');
    let worstV = 0;
    let worstS = 0;
    const per = [];
    for (const v of L.velocitiesKmS) {
      const w = K.generateNebula({
        lines: LINES,
        law: LAW,
        velocityKmS: v,
        hbetaPeak: 2,
        noise: false,
      });
      const r = K.lineVelocity(w, {
        restNm: vacuum('h-alpha'),
        restMedium: 'vacuum',
      });
      if (r.status !== 'ok') {
        worstV = Infinity;
        per.push({ v, status: r.status, code: r.code });
        continue;
      }
      const truthSigma = w.truth.lines.find(l => l.id === 'h-alpha').sigmaNm;
      worstV = Math.max(worstV, Math.abs(r.velocityKmS - v));
      worstS = Math.max(worstS, rel(r.fit.sigmaNm, truthSigma));
      per.push({ v, error: sig(r.velocityKmS - v) });
    }
    row(
      'A3.noiseFreeVelocity',
      worstV <= L.maxVelocityErrorKmS && worstS <= L.maxSigmaRelative,
      { worstVelocityErrorKmS: worstV, worstSigmaRelative: worstS, per }
    );
  }

  // ---- A4: noise-free equivalent width ---------------------------------------------------------------

  if (wanted('A4.')) {
    const L = lim('A4.noiseFreeEquivalentWidth');
    let worstDirect = 0;
    let worstGauss = 0;
    const per = [];
    for (const [sv, off] of [
      [-60, 90],
      [30, -110],
      [80, 70],
    ]) {
      const w = K.generateStar({
        lines: LINES,
        stellarVelocityKmS: sv,
        ismVelocityKmS: sv + off,
        noise: false,
      });
      for (const id of ['h-beta', 'ca2-k']) {
        const t = w.truth.lines.find(l => l.id === id);
        const sg = starSigmaNm(t, w.resolvingPower);
        const win = windowsFor(t.observedNm, sg);
        const d = K.equivalentWidth(w, win);
        const pxKmS = C_KM_S * Math.LN10 * 1e-4;
        const half =
          id === 'h-beta'
            ? Math.ceil((5 * Math.hypot(500, lsfKmS(w.resolvingPower))) / pxKmS)
            : undefined;
        const g = K.fitGaussianLine(w, {
          guessNm: t.observedNm,
          halfWidthPx: half,
        });
        const eD =
          d.status === 'ok' ? rel(d.widthNm, t.equivalentWidthNm) : Infinity;
        const eG =
          g.status === 'ok' ? rel(g.widthNm, t.equivalentWidthNm) : Infinity;
        worstDirect = Math.max(worstDirect, eD);
        worstGauss = Math.max(worstGauss, eG);
        per.push({ id, direct: sig(eD), gauss: sig(eG) });
      }
    }
    // the continuum systematic with asymmetric windows (AM3)
    const w = K.generateStar({
      lines: LINES,
      stellarVelocityKmS: 0,
      ismVelocityKmS: 100,
      noise: false,
    });
    const t = w.truth.lines.find(l => l.id === 'h-beta');
    const sg = starSigmaNm(t, w.resolvingPower);
    const win = {
      lineWindow: [t.observedNm - 5 * sg, t.observedNm + 5 * sg],
      continuumWindows: [
        [t.observedNm - 12 * sg, t.observedNm - 6 * sg],
        [t.observedNm + 20 * sg, t.observedNm + 26 * sg],
      ],
    };
    const e = K.equivalentWidth(w, win);
    const cont = l =>
      w.truth.continuum.c0 * (1 + (w.truth.continuum.slope * (l - 550)) / 550);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < w.lambdaNm.length; i++)
      for (const [lo, hi] of win.continuumWindows)
        if (w.lambdaNm[i] >= lo && w.lambdaNm[i] <= hi) {
          sum += w.lambdaNm[i];
          n++;
        }
    const Cbar = cont(sum / n);
    const Cline = cont(t.observedNm);
    const Lw = win.lineWindow[1] - win.lineWindow[0];
    const predictedConst =
      t.equivalentWidthNm * (Cline / Cbar) + Lw * (1 - Cline / Cbar);
    const predictedDiff = predictedConst - t.equivalentWidthNm;
    const measuredDiff = e.constantContinuum.widthNm - e.widthNm;
    const sameSign =
      Math.sign(predictedDiff) === Math.sign(measuredDiff) &&
      predictedDiff !== 0;
    const diffErr =
      Math.abs(measuredDiff - predictedDiff) / Math.abs(predictedDiff);
    row(
      'A4.noiseFreeEquivalentWidth',
      worstDirect <= L.maxRelativeDirect &&
        worstGauss <= L.maxRelativeGaussian &&
        sameSign &&
        diffErr <= 0.05,
      {
        worstDirect,
        worstGauss,
        continuumSystematic: {
          predictedDiffNm: predictedDiff,
          measuredDiffNm: measuredDiff,
          relativeError: diffErr,
          sameSign,
        },
        per,
      }
    );
  }

  // ---- A5, A6, A7: the colour excess -----------------------------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.noiseFreeColourExcess');
    const per = [0.1, 0.5, 1.0, 1.5].map(ebv => {
      const w = K.generateNebula({
        lines: LINES,
        law: LAW,
        ebv,
        hbetaPeak: 2,
        noise: false,
      });
      const r = decrementOf(w);
      return {
        ebv,
        error: r.status === 'ok' ? r.ebv - ebv : Infinity,
        code: r.code,
      };
    });
    const worst = Math.max(...per.map(p => Math.abs(p.error)));
    row('A5.noiseFreeColourExcess', worst <= L.maxErrorMag, {
      worstErrorMag: worst,
      per: per.map(p => ({ ...p, error: sig(p.error) })),
    });
  }
  if (wanted('A6.')) {
    const L = lim('A6.noReddening');
    const dk = { lambdaNm: vacuum('h-alpha'), flux: 9, sigma: 0.05 };
    const db = { lambdaNm: vacuum('h-beta'), flux: 3, sigma: 0.05 };
    const base = {
      intrinsic: { ratio: 3, source: 'invented' },
      RV: 3.1,
      law: LAW,
    };
    const zero = K.balmerDecrement({ numerator: dk, denominator: db, ...base });
    const below = K.balmerDecrement({
      numerator: { ...dk, flux: 9 * (1 - L.belowFraction) },
      denominator: db,
      ...base,
    });
    const noisy = K.balmerDecrement({
      numerator: {
        lambdaNm: dk.lambdaNm,
        flux: 9 * (1 - L.belowFraction),
        sigma: 1.3,
      },
      denominator: { lambdaNm: db.lambdaNm, flux: 3, sigma: 0.55 },
      ...base,
    });
    const ok =
      Math.abs(zero.ebv) <= L.maxErrorMag &&
      zero.flags.length === 0 &&
      below.ebv < 0 &&
      below.flags.includes('below-intrinsic') &&
      !below.noReddeningDetected &&
      noisy.flags.includes('below-intrinsic') &&
      noisy.noReddeningDetected &&
      /no reddening detected/.test(noisy.note);
    row('A6.noReddening', ok, {
      zero: zero.ebv,
      below: below.ebv,
      belowFlags: below.flags,
      noisyEbv: noisy.ebv,
      noisyInterval: [noisy.interval.lo, noisy.interval.hi],
      noisyNote: noisy.note,
    });
  }
  if (wanted('A7.')) {
    const L = lim('A7.dereddening');
    const w = K.generateNebula({
      lines: LINES,
      law: LAW,
      ebv: 0.5,
      hbetaPeak: 2,
      noise: false,
    });
    const d = decrementOf(w);
    const g = fluxOf(w, 'h-gamma');
    const b = fluxOf(w, 'h-beta');
    const cg = K.deredden({
      flux: g.flux,
      lambdaNm: vacuum('h-gamma'),
      ebv: d.ebv,
      RV: 3.1,
      law: LAW,
    });
    const cb = K.deredden({
      flux: b.flux,
      lambdaNm: vacuum('h-beta'),
      ebv: d.ebv,
      RV: 3.1,
      law: LAW,
    });
    const ratio = cg.flux / cb.flux;
    row('A7.dereddening', rel(ratio, 0.5) <= L.maxRelative, {
      recovered: ratio,
      truth: 0.5,
      relative: rel(ratio, 0.5),
    });
  }

  // ---- A8: the medium convention -----------------------------------------------------------------------

  if (wanted('A8.')) {
    const L = lim('A8.mediumConvention');
    const air = K.generateNebula({
      lines: LINES,
      law: LAW,
      medium: 'air',
      velocityKmS: 100,
      hbetaPeak: 2,
      noise: false,
    });
    const vac = K.generateNebula({
      lines: LINES,
      law: LAW,
      medium: 'vacuum',
      velocityKmS: 100,
      hbetaPeak: 2,
      noise: false,
    });
    const mismatch = K.lineVelocity(air, {
      restNm: vacuum('h-alpha'),
      restMedium: 'vacuum',
    });
    const noMedium = K.lineVelocity(
      { ...air, medium: undefined },
      { restNm: line('h-alpha').air, restMedium: 'air' }
    );
    const va = K.lineVelocity(air, {
      restNm: line('h-alpha').air,
      restMedium: 'air',
    });
    const vv = K.lineVelocity(vac, {
      restNm: vacuum('h-alpha'),
      restMedium: 'vacuum',
    });
    const offset = mediaOffsetKmS(line('h-alpha'));
    const offsetCheck = rel(
      offset,
      C_KM_S * (line('h-alpha').vacuum / line('h-alpha').air - 1)
    );
    const wrong =
      velocityFromWavelengths(va.fit.centreNm, vacuum('h-alpha')) -
      va.velocityKmS;
    row(
      'A8.mediumConvention',
      mismatch.code === 'medium-mismatch' &&
        noMedium.code === 'medium-missing' &&
        Math.abs(va.velocityKmS - vv.velocityKmS) <= L.maxAgreementKmS &&
        offsetCheck <= L.maxRelative,
      {
        mismatch: mismatch.code,
        noMedium: noMedium.code,
        airMinusVacuumKmS: va.velocityKmS - vv.velocityKmS,
        offsetKmS: offset,
        offsetCheck,
        wrongMediumMovesVelocityByKmS: wrong,
      }
    );
  }

  // ---- A9: pair resolution --------------------------------------------------------------------------------

  if (wanted('A9.')) {
    const L = lim('A9.pairResolution');
    const f = 1;
    const unresolved = K.pairResolved(0.5 * f, f);
    const resolved = K.pairResolved(3 * f, f);
    const sep = Math.abs(vacuum('na1-d2') - vacuum('na1-d1'));
    const naD = L.resolvingPowers.map(R => ({
      R,
      ...K.pairResolved(sep, vacuum('na1-d1') / R),
    }));
    row(
      'A9.pairResolution',
      !unresolved.resolved &&
        resolved.resolved &&
        unresolved.dipCut === L.dipCut &&
        Math.abs(pairDip(0.5)) === 0,
      {
        halfFwhmDip: unresolved.dip,
        threeFwhmDip: resolved.dip,
        sodiumSeparationNm: sep,
        sodiumDoublet: naD.map(x => ({
          R: x.R,
          separationFwhm: sig(x.separationFwhm),
          dip: sig(x.dip),
          resolved: x.resolved,
        })),
      }
    );
  }

  // ---- A10: sampling ---------------------------------------------------------------------------------------------

  if (wanted('A10.')) {
    const L = lim('A10.sampling');
    const R = 1800;
    const verdicts = L.steps.map(s => judgeSampling(samplingOnLogGrid(R, s)));
    const formula = rel(samplingOnLogGrid(R, 1e-4), 1 / (R * 1e-4 * Math.LN10));
    const binned = K.generateNebula({
      lines: LINES,
      law: LAW,
      log10Step: 3e-4,
      samples: 1280,
      hbetaPeak: 2,
      noise: false,
    });
    const fit = K.fitGaussianLine(binned, { guessNm: vacuum('h-alpha') });
    row(
      'A10.sampling',
      formula <= L.maxRelative &&
        verdicts[0] === 'ok' &&
        verdicts[1] === 'undersampled' &&
        verdicts[2] === 'severely-undersampled' &&
        fit.status === 'not-constrained',
      {
        pixelsPerFwhm: L.steps.map(s => sig(samplingOnLogGrid(R, s))),
        verdicts,
        formula,
        binnedFit: { status: fit.status, code: fit.code },
      }
    );
  }

  // ---- A11: identification ---------------------------------------------------------------------------------------

  if (wanted('A11.')) {
    const L = lim('A11.identification');
    const r1 = 1 + L.redshift;
    const v = (C_KM_S * (r1 * r1 - 1)) / (r1 * r1 + 1);
    const intrinsic = {
      'h-alpha': 3,
      'h-gamma': 0.5,
      'h-delta': 0.3,
      'he1-5876': 0.2,
      'he1-4472': 0.1,
      'he2-4686': 0.1,
      'ca2-k': 0.4,
      'ca2-h': 0.3,
      'na1-d2': 0.25,
    };
    const w = K.generateNebula({
      lines: LINES,
      law: LAW,
      ebv: 0.3,
      hbetaPeak: 3,
      intrinsic,
      velocityKmS: v,
      noise: false,
    });
    const det = K.detectFeatures(w);
    const ident = K.identifyFeatures(det.features, LINES, {
      medium: 'vacuum',
      z: L.redshift,
      pixelNm: 0.1,
    });
    const labels = ident.features.map(f => f.label);
    const names = ident.features.map(f => f.line?.id).sort();
    const expected = ['h-beta', ...Object.keys(intrinsic)].sort();
    const red = K.solveRedshift(det.features, LINES, {
      medium: 'vacuum',
      z0: L.redshift,
      pixelNm: 0.1,
    });
    row(
      'A11.identification',
      det.features.length === 10 &&
        labels.every(l => l === 'identified') &&
        JSON.stringify(names) === JSON.stringify(expected) &&
        red.status === 'ok' &&
        Math.abs(red.z - L.redshift) <= L.maxRedshiftError,
      {
        detected: det.features.length,
        labels: [...new Set(labels)],
        names,
        redshiftError: red.status === 'ok' ? red.z - L.redshift : null,
        matched: red.matched,
      }
    );
  }

  // ---- B1, B2: against the independent implementation --------------------------------------------------------------

  if (wanted('B1.') || wanted('B2.')) {
    const L1 = lim('B1.equivalentWidthVsIndependent');
    const L2 = lim('B2.gaussianCentreVsScipy');
    let w1 = 0;
    let s1 = 0;
    let c1 = 0;
    let cen = 0;
    let flx = 0;
    let sgm = 0;
    let failed = 0;
    INPUTS.cases.forEach((c, i) => {
      const spec = specOf(c);
      const o = ORACLE.b12[i];
      const e = K.equivalentWidth(spec, {
        continuumWindows: c.continuumWindows,
        lineWindow: c.lineWindow,
      });
      const co = K.fitContinuum(spec, c.continuumWindows, { order: 1 });
      const g = K.fitGaussianLine(spec, {
        guessNm: c.centreNm,
        halfWidthPx: c.halfWidthPx,
      });
      if (e.status !== 'ok' || g.status !== 'ok') {
        failed++;
        return;
      }
      w1 = Math.max(w1, rel(e.widthNm, o.width.widthNm));
      s1 = Math.max(s1, rel(e.sigmaNm, o.width.sigmaNm));
      c1 = Math.max(
        c1,
        ...co.coefficients.map((v, k) => rel(v, o.width.coefficients[k]))
      );
      cen = Math.max(
        cen,
        Math.abs(g.centreNm - o.gauss.centreNm) / g.sigmaCentreNm
      );
      flx = Math.max(flx, Math.abs(g.flux - o.gauss.flux) / g.sigmaFlux);
      sgm = Math.max(
        sgm,
        rel(g.sigmaCentreNm, o.gauss.sigmaCentreNm),
        rel(g.sigmaFlux, o.gauss.sigmaFlux)
      );
    });
    if (wanted('B1.'))
      row(
        'B1.equivalentWidthVsIndependent',
        failed === 0 &&
          Math.max(w1, s1) <= L1.maxRelativeWidth &&
          c1 <= L1.maxRelativeContinuum,
        {
          n: INPUTS.cases.length,
          failed,
          worstWidthRelative: w1,
          worstSigmaRelative: s1,
          worstContinuumRelative: c1,
        }
      );
    if (wanted('B2.'))
      row(
        'B2.gaussianCentreVsScipy',
        failed === 0 &&
          cen <= L2.maxCentreInSigma &&
          flx <= L2.maxFluxInSigma &&
          sgm <= L2.maxSigmaRelative,
        {
          n: INPUTS.cases.length,
          failed,
          worstCentreInSigma: cen,
          worstFluxInSigma: flx,
          worstUncertaintyRelative: sgm,
        }
      );
  }

  // ---- B3: extinction ---------------------------------------------------------------------------------------------------

  if (wanted('B3.')) {
    const L = lim('B3.extinctionVsIndependent');
    let worstK = 0;
    let worstE = 0;
    INPUTS.ebv.cases.forEach((c, i) => {
      const o = ORACLE.b3[i];
      worstK = Math.max(
        worstK,
        rel(extinctionRatio(c.numerator.lambdaNm, c.RV, LAW), o.ratioNum),
        rel(extinctionRatio(c.denominator.lambdaNm, c.RV, LAW), o.ratioDen)
      );
      const r = K.balmerDecrement({
        numerator: c.numerator,
        denominator: c.denominator,
        intrinsic: { ratio: c.intrinsicRatio, source: 'invented' },
        RV: c.RV,
        law: LAW,
      });
      worstE = Math.max(
        worstE,
        r.status === 'ok' ? Math.abs(r.ebv - o.ebv) : Infinity
      );
    });
    row(
      'B3.extinctionVsIndependent',
      worstK <= L.maxRelative && worstE <= L.maxColourExcessMag,
      {
        worstRatioRelative: worstK,
        worstColourExcessMag: worstE,
        limitation: L.limitation,
      }
    );
  }

  // ---- B4: column density ---------------------------------------------------------------------------------------

  if (wanted('B4.')) {
    const L = lim('B4.columnVsAstropy');
    const worst = Math.max(
      ...INPUTS.columns.map((c, i) =>
        rel(
          K.columnFromWidth(c.widthNm, c.lambdaNm, c.f),
          ORACLE.b4[i].columnCm2
        )
      )
    );
    row('B4.columnVsAstropy', worst <= L.maxRelative, {
      n: INPUTS.columns.length,
      worstRelative: worst,
      electronRadiusRatio: K.ELECTRON_RADIUS_M / ORACLE.electronRadiusM,
    });
  }

  // ---- B5: the authentic A star ------------------------------------------------------------------------------------

  if (wanted('B5.')) {
    const L = lim('B5.authenticEquivalentWidthVsIndependent');
    const A = INPUTS.authentic;
    const spec = {
      lambdaNm: Float64Array.from(A.lambdaNm),
      flux: Float64Array.from(A.flux),
      sigma: null,
      medium: A.medium,
      resolvingPower: 1,
    };
    let worst = 0;
    const per = A.lines.map((l, i) => {
      const e = K.equivalentWidth(spec, {
        continuumWindows: l.continuumWindows,
        lineWindow: l.lineWindow,
      });
      const o = ORACLE.b5[i];
      const r =
        e.status === 'ok'
          ? Math.max(rel(e.widthNm, o.widthNm), rel(e.sigmaNm, o.sigmaNm))
          : Infinity;
      worst = Math.max(worst, r);
      return {
        id: l.id,
        widthNm: e.widthNm,
        sigmaNm: e.sigmaNm,
        relativeToOracle: r,
      };
    });
    row('B5.authenticEquivalentWidthVsIndependent', worst <= L.maxRelative, {
      worstRelative: worst,
      per,
    });
  }
  if (wanted('B6.'))
    notRun(
      'B6.toolkit',
      'No cited independent spectral tool is installed and installing one is a download; the oracle of B1 to B5 is an independent implementation by the same author, not a cited tool. The request is in ISM.md.'
    );

  // ---- C1: velocity coverage -------------------------------------------------------------------------------------------

  if (wanted('C1.')) {
    const L = lim('C1.velocityCoverage');
    const draw = stream('forward', SEEDS.ensembleVelocity, 'c1');
    const u = (a, b) => a + (b - a) * draw();
    const list = [];
    let failed = 0;
    for (let i = 0; i < L.n; i++) {
      const v = u(-300, 300);
      const w = K.generateNebula({
        lines: LINES,
        law: LAW,
        seed: `c1-${i}`,
        velocityKmS: v,
        hbetaPeak: u(0.5, 2),
        ebv: u(0.2, 1),
      });
      const r = K.lineVelocity(w, {
        restNm: vacuum('h-alpha'),
        restMedium: 'vacuum',
      });
      if (r.status !== 'ok') {
        failed++;
        list.push({ value: NaN, sigma: 1, truth: v });
        continue;
      }
      list.push({ value: r.velocityKmS, sigma: r.sigmaKmS, truth: v });
    }
    const c = coverage(list);
    row(
      'C1.velocityCoverage',
      failed === 0 &&
        inRange(c.coverage, L.coverageRange) &&
        Math.abs(c.meanZ) <= L.maxMeanZ &&
        inRange(c.sdZ, L.sdZRange),
      { ...c, failedFits: failed }
    );
  }

  // ---- C2: colour-excess coverage ----------------------------------------------------------------------------------------

  if (wanted('C2.')) {
    const L = lim('C2.colourExcessCoverage');
    const draw = stream('forward', SEEDS.ensembleEbv, 'c2');
    const u = (a, b) => a + (b - a) * draw();
    const list = [];
    let refused = 0;
    for (let i = 0; i < L.n; i++) {
      const ebv = u(0.2, 1);
      const w = K.generateNebula({
        lines: LINES,
        law: LAW,
        seed: `c2-${i}`,
        velocityKmS: u(-300, 300),
        hbetaPeak: u(0.5, 2),
        ebv,
      });
      const r = decrementOf(w);
      if (r.status !== 'ok') {
        refused++;
        continue;
      }
      list.push({ value: r.ebv, sigma: r.sigma, truth: ebv });
    }
    const c = coverage(list);
    row(
      'C2.colourExcessCoverage',
      refused === 0 &&
        inRange(c.coverage, L.coverageRange) &&
        inRange(c.sdZ, L.sdZRange),
      { ...c, refused }
    );
  }

  // ---- C3: equivalent-width coverage ----------------------------------------------------------------------------------------

  if (wanted('C3.')) {
    const L = lim('C3.equivalentWidthCoverage');
    const draw = stream('forward', SEEDS.ensembleEw, 'c3');
    const u = (a, b) => a + (b - a) * draw();
    const direct = [];
    const gauss = [];
    let failed = 0;
    for (let i = 0; i < L.n; i++) {
      const sv = u(-100, 100);
      const off = (draw() < 0.5 ? -1 : 1) * u(60, 120);
      const w = K.generateStar({
        lines: LINES,
        seed: `c3-${i}`,
        stellarVelocityKmS: sv,
        ismVelocityKmS: sv + off,
      });
      const tb = w.truth.lines.find(l => l.id === 'h-beta');
      const tk = w.truth.lines.find(l => l.id === 'ca2-k');
      const e = K.equivalentWidth(
        w,
        windowsFor(tb.observedNm, starSigmaNm(tb, w.resolvingPower))
      );
      const g = K.fitGaussianLine(w, { guessNm: tk.observedNm });
      if (e.status !== 'ok' || g.status !== 'ok') {
        failed++;
        continue;
      }
      direct.push({
        value: e.widthNm,
        sigma: e.sigmaNm,
        truth: tb.equivalentWidthNm,
      });
      gauss.push({
        value: g.widthNm,
        sigma: g.sigmaWidthNm,
        truth: tk.equivalentWidthNm,
      });
    }
    const a = coverage(direct);
    const b = coverage(gauss);
    row(
      'C3.equivalentWidthCoverage',
      failed === 0 &&
        inRange(a.coverage, L.coverageRange) &&
        inRange(b.coverage, L.coverageRange),
      { direct: a, gaussian: b, failed }
    );
  }

  // ---- C4: column-density coverage ------------------------------------------------------------------------------------------------

  const f = { 'na1-d1': 0.2, 'na1-d2': 0.45 };
  const sodiumWindows = w => {
    const out = {};
    for (const t of w.truth.lines) {
      const s =
        (t.observedNm *
          Math.hypot(w.truth.intrinsicSigmaKmS, lsfKmS(w.resolvingPower))) /
        C_KM_S;
      out[t.id] = windowsFor(t.observedNm, s);
    }
    return out;
  };
  const sodiumColumn = w => {
    const win = sodiumWindows(w);
    const lines = w.truth.lines.map(t => {
      const e = K.equivalentWidth(w, win[t.id]);
      const g = K.fitGaussianLine(w, { guessNm: t.observedNm });
      return {
        id: t.id,
        lambdaNm: t.restNm,
        f: f[t.id],
        fSource: 'invented (the synthetic world)',
        width:
          e.status === 'ok'
            ? { widthNm: e.widthNm, sigmaNm: e.sigmaNm }
            : { widthNm: NaN, sigmaNm: NaN },
        fit: g,
      };
    });
    return { lines, column: K.columnDensity({ lines }) };
  };
  if (wanted('C4.')) {
    const L = lim('C4.columnCoverage');
    const draw = stream('forward', SEEDS.ensembleColumn, 'c4');
    const u = (a, b) => a + (b - a) * draw();
    const list = [];
    const bias = [];
    let passed = 0;
    const codes = {};
    for (let i = 0; i < L.n; i++) {
      const w = K.generateSodium({
        lines: LINES,
        f,
        seed: `c4-${i}`,
        tau0: u(0.05, 0.08),
        velocityKmS: u(-40, 40),
      });
      const { column } = sodiumColumn(w);
      if (column.status !== 'ok') {
        codes[column.code] = (codes[column.code] ?? 0) + 1;
        continue;
      }
      passed++;
      list.push({
        value: column.columnCm2,
        sigma: column.sigmaCm2,
        truth: w.truth.columnCm2,
      });
      bias.push((column.columnCm2 - w.truth.columnCm2) / w.truth.columnCm2);
    }
    const c = coverage(list);
    const passRate = passed / L.n;
    row(
      'C4.columnCoverage',
      inRange(c.coverage, L.coverageRange) &&
        passRate >= L.minPassRate &&
        Math.abs(mean(bias)) <= L.maxMeanBias,
      { ...c, passRate, meanFractionalBias: mean(bias), refusalCodes: codes }
    );
  }

  // ---- C5: classification --------------------------------------------------------------------------------------------------------------

  const classifyWorld = w => {
    const R = K.stellarVelocity(w, {
      lines: ['h-gamma', 'h-delta'].map(id => ({
        restNm: vacuum(id),
        restMedium: 'vacuum',
      })),
      broadSigmaKmS: 500,
    });
    if (R.status !== 'ok') return { status: 'failed', stage: 'star' };
    const ca = K.lineVelocity(w, {
      restNm: vacuum('ca2-k'),
      restMedium: 'vacuum',
    });
    const pxKmS = C_KM_S * Math.LN10 * 1e-4;
    const hb = K.lineVelocity(w, {
      restNm: vacuum('h-beta'),
      restMedium: 'vacuum',
      halfWidthPx: Math.ceil((5 * 500) / pxKmS),
    });
    const star = {
      velocityKmS: R.velocityKmS,
      sigmaKmS: R.sigmaKmS,
      sigmaRefKmS: R.sigmaRefKmS,
    };
    return {
      status: 'ok',
      interstellar:
        ca.status === 'ok'
          ? K.classifyAbsorption(w, ca, star)
          : { status: 'failed' },
      stellar:
        hb.status === 'ok'
          ? K.classifyAbsorption(w, hb, star)
          : { status: 'failed' },
    };
  };
  if (wanted('C5.')) {
    const L = lim('C5.classification');
    const draw = stream('forward', SEEDS.classification, 'c5');
    const u = (a, b) => a + (b - a) * draw();
    const iss = {};
    const stl = {};
    const bump = (o, k) => (o[k] = (o[k] ?? 0) + 1);
    for (let i = 0; i < L.n; i++) {
      const sv = u(-100, 100);
      const off = (draw() < 0.5 ? -1 : 1) * u(60, 120);
      const w = K.generateStar({
        lines: LINES,
        seed: `c5-${i}`,
        stellarVelocityKmS: sv,
        ismVelocityKmS: sv + off,
      });
      const r = classifyWorld(w);
      if (r.status !== 'ok') {
        bump(iss, 'failed');
        bump(stl, 'failed');
        continue;
      }
      bump(iss, r.interstellar.class ?? 'failed');
      bump(stl, r.stellar.class ?? 'failed');
    }
    const n = L.n;
    const iRate = (iss['interstellar-candidate'] ?? 0) / n;
    const sRate = (stl.stellar ?? 0) / n;
    row(
      'C5.classification',
      iRate >= L.minInterstellarRate &&
        (iss.stellar ?? 0) / n <= L.maxInterstellarAsStellar &&
        sRate >= L.minStellarRate &&
        (stl['interstellar-candidate'] ?? 0) / n <= L.maxStellarAsInterstellar,
      {
        n,
        narrowOffsetLines: iss,
        stellarLines: stl,
        interstellarRate: iRate,
        stellarRate: sRate,
      }
    );
  }

  // ---- D1: saturation ---------------------------------------------------------------------------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.saturatedLine');
    const w = K.generateSodium({
      lines: LINES,
      f,
      seed: 'd1-saturated',
      tau0: L.tau0,
      velocityKmS: 10,
      noise: true,
    });
    const { lines, column } = sodiumColumn(w);
    const strong = lines.find(l => l.id === 'na1-d2');
    const single = K.columnDensity({ lines: [strong] });
    const unresolved = K.generateStar({
      lines: LINES,
      seed: 'd1-unresolved',
      stellarVelocityKmS: 0,
      ismVelocityKmS: 100,
      noise: true,
    });
    const ca = K.fitGaussianLine(unresolved, {
      guessNm: unresolved.truth.lines.find(l => l.id === 'ca2-k').observedNm,
    });
    const un = K.columnDensity({
      lines: [
        {
          id: 'ca2-k',
          lambdaNm: vacuum('ca2-k'),
          f: 0.3,
          fSource: 'invented (the synthetic world)',
          width: { widthNm: ca.widthNm, sigmaNm: ca.sigmaWidthNm },
          fit: ca,
        },
      ],
    });
    const noNumber = r => r.status === 'refused' && r.columnCm2 === undefined;
    row(
      'D1.saturatedLine',
      column.status === 'refused' &&
        column.code === 'saturated' &&
        noNumber(column) &&
        noNumber(single) &&
        un.code === 'linear-regime-untested' &&
        noNumber(un),
      {
        doublet: {
          code: column.code,
          ratio: column.regime?.ratio,
          ratioLinear: column.regime?.ratioLinear,
        },
        singleSaturated: { code: single.code, regime: single.regime },
        singleUnresolved: { code: un.code },
      }
    );
  }

  // ---- D2: blends -----------------------------------------------------------------------------------------------------------------------------

  if (wanted('D2.')) {
    const L = lim('D2.blendFlagged');
    const ha = vacuum('h-alpha');
    const fwhm = ha / 1800;
    const make = (sepFwhm, seed) =>
      K.generateNebula({
        lines: LINES,
        law: LAW,
        seed,
        hbetaPeak: 3,
        extraLines: [
          {
            id: 'invented-second-line',
            restNm: ha + sepFwhm * fwhm,
            flux: 1.2,
          },
        ],
      });
    const blend = make(L.separationFwhm[0], 'd2-blend');
    const fb = K.fitGaussianLine(blend, { guessNm: ha });
    const far = make(L.separationFwhm[1], 'd2-far');
    const ff = K.fitGaussianLine(far, { guessNm: ha, halfWidthPx: 4 });
    const pb = K.pairResolved(L.separationFwhm[0] * fwhm, fwhm);
    const pf = K.pairResolved(L.separationFwhm[1] * fwhm, fwhm);
    row(
      'D2.blendFlagged',
      fb.status === 'ok' &&
        fb.broadened &&
        !pb.resolved &&
        ff.status === 'ok' &&
        !ff.broadened &&
        pf.resolved,
      {
        blend: {
          status: fb.status,
          broadened: fb.broadened,
          widthExcess: fb.widthExcess,
          resolvedByPairRule: pb.resolved,
        },
        far: {
          status: ff.status,
          broadened: ff.broadened,
          widthExcess: ff.widthExcess,
          resolvedByPairRule: pf.resolved,
        },
      }
    );
  }

  // ---- D3: medium refusals ----------------------------------------------------------------------------------------------------------------------

  if (wanted('D3.')) {
    const air = K.generateNebula({
      lines: LINES,
      law: LAW,
      medium: 'air',
      noise: false,
    });
    const codes = {
      missingSpectrumMedium: K.lineVelocity(
        { ...air, medium: undefined },
        { restNm: line('h-alpha').air, restMedium: 'air' }
      ).code,
      missingRestMedium: K.lineVelocity(air, { restNm: line('h-alpha').air })
        .code,
      mismatch: K.lineVelocity(air, {
        restNm: vacuum('h-alpha'),
        restMedium: 'vacuum',
      }).code,
      noRestWavelength: K.restOf({ id: 'x', vacuum: 500 }, 'air').code,
    };
    row(
      'D3.mediumRefusals',
      codes.missingSpectrumMedium === 'medium-missing' &&
        codes.missingRestMedium === 'medium-missing' &&
        codes.mismatch === 'medium-mismatch' &&
        codes.noRestWavelength === 'no-rest-wavelength',
      codes
    );
  }

  // ---- D4: decrement refusals -------------------------------------------------------------------------------------------------------------------------

  if (wanted('D4.')) {
    const a = { lambdaNm: vacuum('h-alpha'), flux: 9, sigma: 0.1 };
    const b = { lambdaNm: vacuum('h-beta'), flux: 3, sigma: 0.1 };
    const ok = {
      numerator: a,
      denominator: b,
      intrinsic: { ratio: 3, source: 'invented' },
      RV: 3.1,
      law: LAW,
    };
    const codes = {
      missingIntrinsic: K.balmerDecrement({ ...ok, intrinsic: undefined }).code,
      missingSource: K.balmerDecrement({ ...ok, intrinsic: { ratio: 3 } }).code,
      missingRV: K.balmerDecrement({ ...ok, RV: undefined }).code,
      lowSignal: K.balmerDecrement({ ...ok, numerator: { ...a, sigma: 3 } })
        .code,
      outsideLaw: K.balmerDecrement({
        ...ok,
        numerator: { ...a, lambdaNm: 5000 },
      }).code,
      badFlux: K.balmerDecrement({ ...ok, numerator: { ...a, flux: -1 } }).code,
    };
    const below = K.balmerDecrement({ ...ok, numerator: { ...a, flux: 7.2 } });
    const draw = stream('noise', SEEDS.report, 'd4');
    const nz = K.balmerDecrement({
      ...ok,
      numerator: { ...a, flux: 9 + 0.1 * (draw() - 0.5), sigma: 1.6 },
      denominator: { ...b, flux: 3, sigma: 0.55 },
    });
    row(
      'D4.decrementRefusals',
      codes.missingIntrinsic === 'missing-intrinsic-ratio' &&
        codes.missingSource === 'missing-source' &&
        codes.missingRV === 'missing-RV' &&
        codes.lowSignal === 'low-signal' &&
        codes.outsideLaw === 'outside-law' &&
        codes.badFlux === 'bad-flux' &&
        below.flags.includes('below-intrinsic') &&
        nz.noReddeningDetected,
      { codes, belowFlags: below.flags, noisyNote: nz.note }
    );
  }

  // ---- D5: undersampling ---------------------------------------------------------------------------------------------------------------------------------

  if (wanted('D5.')) {
    const binned = K.generateNebula({
      lines: LINES,
      law: LAW,
      log10Step: 3e-4,
      samples: 1280,
      hbetaPeak: 2,
      noise: false,
    });
    const fit = K.fitGaussianLine(binned, { guessNm: vacuum('h-alpha') });
    const col = K.columnDensity({
      lines: [
        {
          lambdaNm: vacuum('h-alpha'),
          f: 0.5,
          fSource: 'invented',
          width: { widthNm: 0.02, sigmaNm: 0.002 },
          fit,
        },
      ],
    });
    const R15 = 1 / (1.5 * 1e-4 * Math.LN10);
    const under = K.generateNebula({
      lines: LINES,
      law: LAW,
      resolvingPower: R15,
      hbetaPeak: 3,
      noise: true,
      seed: 'd5-under',
    });
    const fu = K.fitGaussianLine(under, { guessNm: vacuum('h-alpha') });
    row(
      'D5.undersampledRefused',
      fit.status === 'not-constrained' &&
        fit.code === 'severely-undersampled' &&
        col.status === 'refused' &&
        fu.status === 'ok' &&
        fu.samplingVerdict === 'undersampled',
      {
        binned: { status: fit.status, code: fit.code },
        column: col.code,
        onePointFivePixels: {
          status: fu.status,
          verdict: fu.samplingVerdict,
          pixelsPerFwhm: fu.lsfFwhmPx,
        },
      }
    );
  }

  // ---- D6: classification ambiguity ------------------------------------------------------------------------------------------------------------------------

  if (wanted('D6.')) {
    const w = K.generateStar({
      lines: LINES,
      seed: 'd6',
      stellarVelocityKmS: 40,
      ismVelocityKmS: 40,
    });
    const R = K.stellarVelocity(w, {
      lines: ['h-beta', 'h-gamma', 'h-delta'].map(id => ({
        restNm: vacuum(id),
        restMedium: 'vacuum',
      })),
      broadSigmaKmS: 500,
    });
    const star = {
      velocityKmS: R.velocityKmS,
      sigmaKmS: R.sigmaKmS,
      sigmaRefKmS: R.sigmaRefKmS,
    };
    const ca = K.lineVelocity(w, {
      restNm: vacuum('ca2-k'),
      restMedium: 'vacuum',
    });
    const narrowAtStar = K.classifyAbsorption(w, ca, star);
    const pxKmS = C_KM_S * Math.LN10 * 1e-4;
    const hb = K.lineVelocity(w, {
      restNm: vacuum('h-beta'),
      restMedium: 'vacuum',
      halfWidthPx: Math.ceil((5 * 500) / pxKmS),
    });
    const broadOffset = K.classifyAbsorption(w, hb, {
      ...star,
      velocityKmS: star.velocityKmS + 300,
    });
    row(
      'D6.classificationAmbiguity',
      narrowAtStar.class === 'ambiguous' &&
        broadOffset.class === 'ambiguous' &&
        /not a proof|never a proof/.test(narrowAtStar.note),
      {
        narrowAtStar: narrowAtStar.class,
        broadOffset: broadOffset.class,
        note: narrowAtStar.note,
      }
    );
  }

  // ---- D7: identification refusals ------------------------------------------------------------------------------------------------------------------------------

  if (wanted('D7.')) {
    const invented = [
      { id: 'invented-a', vacuum: 500.0 },
      { id: 'invented-b', vacuum: 500.1 },
      { id: 'invented-c', vacuum: 550.0 },
      { id: 'invented-d', vacuum: 600.0 },
      { id: 'invented-e', vacuum: 660.0 },
    ];
    const feat = (c, s = 0.05) => ({ centreNm: c, sigmaCentreNm: s });
    const amb = K.identifyFeatures([feat(500.05)], invented.slice(0, 2), {
      medium: 'vacuum',
    });
    const un = K.identifyFeatures([feat(530)], invented, { medium: 'vacuum' });
    const bands = [{ id: 'invented-band', centreNm: 555, widthNm: 1 }];
    const band = K.identifyFeatures([feat(555.2)], invented.slice(0, 2), {
      medium: 'vacuum',
      bands,
      bandsSource: 'invented for this test',
    });
    const noSource = K.identifyFeatures([feat(555.2)], invented, {
      medium: 'vacuum',
      bands,
    });
    const lines = [invented[0], invented[3], invented[2], invented[4]];
    const tie = K.solveRedshift([feat(505.0), feat(606.0)], lines, {
      medium: 'vacuum',
      zRange: { min: -0.1, max: 0.05, step: 5e-5 },
      pixelNm: 0.05,
    });
    row(
      'D7.identificationRefusals',
      amb.features[0].label === 'ambiguous' &&
        amb.features[0].candidates.length === 2 &&
        un.features[0].label === 'unidentified' &&
        band.features[0].label === 'unidentified diffuse band' &&
        noSource.code === 'missing-source' &&
        tie.code === 'redshift-tie',
      {
        ambiguous: amb.features[0].candidates.map(c => c.id),
        unidentified: un.features[0].label,
        band: band.features[0].label,
        noSource: noSource.code,
        tie: tie.code,
        tieCandidates: tie.candidates,
      }
    );
  }

  // ---- D8: noise only -------------------------------------------------------------------------------------------------------------------------------------------------------

  if (wanted('D8.')) {
    const L = lim('D8.noiseOnly');
    let found = 0;
    for (let i = 0; i < L.n; i++) {
      const w = K.generateNebula({
        lines: LINES,
        law: LAW,
        seed: `d8-${SEEDS.noiseOnly}-${i}`,
        hbetaPeak: 0,
        noise: true,
      });
      found += K.detectFeatures(w).features.length;
    }
    row('D8.noiseOnly', found <= L.maxFeatures, {
      n: L.n,
      featuresFound: found,
    });
  }

  // ---- D9: bad inputs -----------------------------------------------------------------------------------------------------------------------------------------------------------

  if (wanted('D9.')) {
    const w = K.generateNebula({ lines: LINES, law: LAW, noise: false });
    const win = windowsFor(vacuum('h-alpha'), 0.17);
    const bad = { ...w, lambdaNm: Float64Array.from(w.lambdaNm).reverse() };
    const nan = {
      ...w,
      flux: Float64Array.from(w.flux, (v, i) => (i === 5 ? NaN : v)),
    };
    const short = {
      ...w,
      lambdaNm: w.lambdaNm.slice(0, 10),
      flux: w.flux.slice(0, 10),
      sigma: null,
    };
    const codes = {
      notIncreasing: throwsCode(() => K.equivalentWidth(bad, win)),
      notFinite: throwsCode(() => K.equivalentWidth(nan, win)),
      tooFew: throwsCode(() => K.equivalentWidth(short, win)),
      tooFewContinuum: throwsCode(() =>
        K.equivalentWidth(w, {
          continuumWindows: [
            [300, 300.01],
            [301, 301.01],
          ],
          lineWindow: win.lineWindow,
        })
      ),
      emptyWindow: throwsCode(() =>
        K.equivalentWidth(w, {
          continuumWindows: win.continuumWindows,
          lineWindow: [700.0, 700.001],
        })
      ),
      badF: throwsCode(() =>
        K.columnDensity({
          lines: [
            {
              lambdaNm: 589,
              f: -1,
              fSource: 'x',
              width: { widthNm: 1, sigmaNm: 0.1 },
            },
          ],
        })
      ),
      missingSourceF: throwsCode(() =>
        K.columnDensity({
          lines: [
            { lambdaNm: 589, f: 0.5, width: { widthNm: 1, sigmaNm: 0.1 } },
          ],
        })
      ),
      missingSourceIntrinsic: throwsCode(() =>
        K.balmerDecrement({
          numerator: { lambdaNm: 656, flux: 9, sigma: 0.1 },
          denominator: { lambdaNm: 486, flux: 3, sigma: 0.1 },
          intrinsic: { ratio: 3 },
          RV: 3.1,
          law: LAW,
        })
      ),
      missingSourceBands: throwsCode(() =>
        K.identifyFeatures([], LINES, { medium: 'vacuum', bands: [] })
      ),
    };
    const want = {
      notIncreasing: 'not-increasing',
      notFinite: 'not-finite',
      tooFew: 'too-few-samples',
      tooFewContinuum: 'too-few-continuum-samples',
      emptyWindow: 'empty-window',
      badF: 'bad-oscillator-strength',
      missingSourceF: 'missing-source',
      missingSourceIntrinsic: 'missing-source',
      missingSourceBands: 'missing-source',
    };
    row(
      'D9.badInputs',
      Object.keys(want).every(k => codes[k] === want[k]),
      codes
    );
  }

  // ---- D10: label and manifest -------------------------------------------------------------------------------------------------------------------------------------------------------

  if (wanted('D10.')) {
    const n = K.generateNebula({ lines: LINES, law: LAW, seed: 'd10' });
    const n2 = K.generateNebula({ lines: LINES, law: LAW, seed: 'd10' });
    const s = K.generateStar({ lines: LINES, seed: 'd10' });
    const d = K.generateSodium({ lines: LINES, f, seed: 'd10', tau0: 0.05 });
    const labelled = [n, s, d].every(
      x =>
        x.label.startsWith('SYNTHETIC ISM SPECTRUM') &&
        x.label === K.ISM_SYNTHETIC_LABEL
    );
    const manifest = [n, s, d].every(
      x =>
        x.truth &&
        x.truth.seed === 'd10' &&
        Array.isArray(x.truth.lines) &&
        x.truth.lines.length > 0 &&
        Number.isFinite(x.truth.sigmaPixel) &&
        x.truth.resolvingPower > 0
    );
    const keys =
      n.truth.ebv !== undefined &&
      n.truth.RV !== undefined &&
      d.truth.columnCm2 > 0 &&
      d.truth.lines.every(l => l.f > 0 && l.tau0 > 0) &&
      s.truth.stellarVelocityKmS !== undefined;
    const same = n.flux.every((v, i) => v === n2.flux[i]);
    row(
      'D10.labelAndManifest',
      labelled &&
        manifest &&
        keys &&
        same &&
        THRESHOLDS.worlds.label.startsWith(K.ISM_SYNTHETIC_LABEL),
      { labelled, manifest, keys, deterministic: same }
    );
  }

  // ---- E: authentic data ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  if (wanted('E1.'))
    notRun(
      'E1.authenticNebula',
      'No SDSS H II region spectrum is in the tree and none was fetched; the exact request, with the published decrement the contract needs, is in ISM.md (Rights and the authentic legs).'
    );
  if (wanted('E2.'))
    notRun(
      'E2.authenticStarSodium',
      'No SDSS stellar spectrum with a published interstellar sodium measurement is in the tree and none was fetched; the request is in ISM.md.'
    );
  if (wanted('E3.')) {
    const L = lim('E3.inTreeStars');
    const Rsdss = 1 / (2.2 * 1e-4 * Math.LN10);
    const lam = Array.from(wavelengths(), x => x / 10);
    const stars = SPECTRUM_IDS.map(id => {
      const d = decodeSpectrum(id);
      const spec = {
        lambdaNm: Float64Array.from(lam),
        flux: d.flux,
        sigma: null,
        medium: 'vacuum',
        resolvingPower: Rsdss,
      };
      const z = SPECTRA[id].z;
      const lines = L.lines.map(lid => {
        const c = vacuum(lid) * (1 + z);
        const h = L.lineWindowHalfWidthAngstrom / 10;
        const [[a0, a1], [b0, b1]] = L.continuumWindowsAngstrom;
        const e = K.equivalentWidth(spec, {
          lineWindow: [c - h, c + h],
          continuumWindows: [
            [c + a0 / 10, c + a1 / 10],
            [c + b0 / 10, c + b1 / 10],
          ],
        });
        return {
          id: lid,
          status: e.status,
          code: e.code,
          widthNm: e.widthNm !== undefined ? sig(e.widthNm, 5) : null,
          sigmaNm: e.sigmaNm !== undefined ? sig(e.sigmaNm, 5) : null,
          constantContinuumSystematicNm:
            e.continuumSystematicNm !== undefined
              ? sig(e.continuumSystematicNm, 3)
              : null,
        };
      });
      const mid = 0.5 * (vacuum('na1-d1') + vacuum('na1-d2')) * (1 + z);
      const fit = K.fitGaussianLine(spec, {
        guessNm: vacuum('na1-d2') * (1 + z),
      });
      const col = K.columnDensity({
        lines: [
          {
            id: 'na1-d2',
            lambdaNm: vacuum('na1-d2'),
            f: 0.3,
            fSource:
              'a placeholder to reach the regime test; the kernel never reports it as a measurement',
            width: { widthNm: 0.01, sigmaNm: 0.001 },
            fit,
          },
        ],
      });
      return {
        star: id,
        z,
        lines,
        sodium: {
          pixelsPerFwhm: sig(samplingOnLogGrid(Rsdss, 0.0003)),
          verdict: judgeSampling(samplingOnLogGrid(Rsdss, 0.0003)),
          fit: { status: fit.status, code: fit.code },
          columnDensity: { status: col.status, code: col.code },
          pairMidpointNm: sig(mid, 6),
        },
      };
    });
    reported(
      'E3.inTreeStars',
      { resolvingPowerDerivedFromPack: sig(Rsdss), stars },
      "The resolving power is derived from the pack record's statement that SDSS resolves about 2.2 samples of its native 1e-4 dex step; the pack's own 3-sample binning (step 3e-4 dex) gives 0.73 pixels per FWHM at that resolving power, so no sodium line can be fitted on it."
    );
  }

  // ---- R: reported ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  if (wanted('R1.')) {
    const L = lim('R1.decrementMisspecification');
    const draw = stream('forward', SEEDS.report, 'r1');
    const u = (a, b) => a + (b - a) * draw();
    const acc = { base: [], rv25: [], rv40: [], ratio5: [], absorption5: [] };
    for (let i = 0; i < L.n; i++) {
      const ebv = u(0.2, 1);
      const p = {
        seed: `r1-${i}`,
        velocityKmS: u(-300, 300),
        hbetaPeak: u(0.8, 2),
        ebv,
      };
      const w = K.generateNebula({ lines: LINES, law: LAW, ...p });
      const wa = K.generateNebula({
        lines: LINES,
        law: LAW,
        ...p,
        stellarAbsorptionFraction: L.stellarAbsorptionFraction,
      });
      const push = (k, r) => {
        if (r.status === 'ok') acc[k].push(r.ebv - ebv);
      };
      push('base', decrementOf(w));
      push('rv25', decrementOf(w, { RV: L.analysisRV[0] }));
      push('rv40', decrementOf(w, { RV: L.analysisRV[1] }));
      push(
        'ratio5',
        decrementOf(w, { ratio: 3 * (1 + L.intrinsicRatioOffset) })
      );
      push('absorption5', decrementOf(wa));
    }
    reported(
      'R1.decrementMisspecification',
      Object.fromEntries(
        Object.entries(acc).map(([k, v]) => [
          k,
          { n: v.length, meanBiasMag: sig(mean(v)), sdMag: sig(sd(v)) },
        ])
      ),
      'The bias in mag of E(B-V) when the analysis takes a wrong R_V, an intrinsic ratio 5 percent off, or the world carries stellar absorption equal to 5 percent of the H-beta flux.'
    );
  }
  if (wanted('R2.')) {
    const L = lim('R2.continuumSystematic');
    const draw = stream('forward', SEEDS.report, 'r2');
    const u = (a, b) => a + (b - a) * draw();
    const biasDirect = [];
    const sys = [];
    for (let i = 0; i < L.n; i++) {
      const sv = u(-100, 100);
      const base = K.generateStar({
        lines: LINES,
        noise: false,
        stellarVelocityKmS: sv,
        ismVelocityKmS: sv + 90,
      });
      const t0 = base.truth.lines.find(l => l.id === 'h-beta');
      const sg = starSigmaNm(t0, base.resolvingPower);
      const w = K.generateStar({
        lines: LINES,
        seed: `r2-${i}`,
        stellarVelocityKmS: sv,
        ismVelocityKmS: sv + 90,
        continuum: {
          c0: 1,
          slope: 0.2,
          curvature: L.curvature,
          curvatureCentre: t0.observedNm,
          curvatureHalf: 12 * sg,
        },
      });
      const e = K.equivalentWidth(w, windowsFor(t0.observedNm, sg));
      if (e.status !== 'ok') continue;
      biasDirect.push(e.widthNm - t0.equivalentWidthNm);
      sys.push(e.constantContinuum.widthNm - e.widthNm);
    }
    reported(
      'R2.continuumSystematic',
      {
        n: biasDirect.length,
        meanDirectBiasNm: sig(mean(biasDirect)),
        sdDirectBiasNm: sig(sd(biasDirect)),
        meanConstantMinusLinearNm: sig(mean(sys)),
      },
      'A quadratic term of 2 percent at 12 sigma_obs the linear side-window continuum does not follow; the bias is in nm of equivalent width.'
    );
  }

  const cpu = process.cpuUsage(cpu0);
  rows.push({
    id: '_cpu',
    status: 'info',
    measured: { cpuSeconds: sig((cpu.user + cpu.system) / 1e6, 3) },
    note: 'recorded, not compared',
  });
  return rows;
}

// ---- command line ---------------------------------------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const all = runValidation({ only });
  const rows = all.filter(r => r.id !== '_cpu');
  const sorted = [...rows].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(all)}\n`);
  } else {
    for (const r of sorted)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(40)} ${JSON.stringify(r.measured)}`
      );
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported, ${count('not-run')} not run`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.ism-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.ism-failed-legs/1',
          label:
            'These legs crossed a committed bound and stay failing; only Carl resets one.',
          legs: sorted
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        2
      )}\n`
    );
  process.exitCode = rows.some(r => r.status === 'fail') ? 1 : 0;
}
