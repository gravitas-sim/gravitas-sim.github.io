#!/usr/bin/env node
// =============================================================================
// The AGN kernel against its committed thresholds (Prompt 252)
// -----------------------------------------------------------------------------
//   npm run agn:validate                     print the table
//   npm run agn:validate -- --json           print it as JSON
//   npm run agn:validate -- --write-results  rewrite tests/fixtures/agn/results.json
//   npm run agn:validate -- --write-failed   rewrite tests/fixtures/agn/failed-legs.json
//   --only=A1,B1                             run the legs whose id starts with these
//
// tests/fixtures/agn/thresholds.json fixed every bound before the kernel existed (AGN.md, "Validation contract");
// this reads the bounds from that file, not from copies, and applies the `overrides` of the recorded amendments.
// The B rows read tests/fixtures/agn/oracle-results.json, which tools/agn-oracle/oracle.py wrote (numpy, scipy,
// astropy.constants; no Gravitas code). The Part B gate rows (G1 to G7) read gate-thresholds.json. A leg whose
// authentic file, cited template or tool was never supplied is NOT RUN and says why.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as A from '../js/kernels/agn/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { createCosmology } from '../js/kernels/cosmology/index.js';
import { C_LIGHT, PC_M } from '../js/kernels/radiation/constants.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/agn';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
export const GATE = read(`${DIR}/gate-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const CONSTANTS = read(`${DIR}/constants-source.json`);
const SEEDS = THRESHOLDS.seeds;
const OVERRIDES = THRESHOLDS.amendments.flatMap(a => a.overrides ?? []);
/** The limits of a committed check with the recorded amendments' overrides applied. */
const lim = id => {
  const base = THRESHOLDS.checks.find(c => c.id === id).limits;
  const out = { ...base };
  for (const o of OVERRIDES) if (o.check === id) out[o.limit] = o.value;
  return out;
};
const ZRQ = THRESHOLDS.worlds.quasar.zRange;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : 0.5 * (s[h - 1] + s[h]);
};
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const MPC_M = PC_M * 1e6;
const STEP = A.QUASAR_WORLD.log10Step;
const COSMO = THRESHOLDS.worlds.cosmologies[0];
const cosmology = createCosmology(COSMO);
const BC = A.INVENTED_BC;
const CURVES = A.INVENTED_BPT_CURVES;

const TPL = A.quasarTemplate({ lines: LINES });
const qworld = (z, extra = {}) =>
  A.generateQuasar({ lines: LINES, z, ...extra });
const xcq = (w, extra = {}) =>
  A.quasarRedshift(w, TPL, { zRange: ZRQ, ...extra });
const nworld = (extra = {}) =>
  A.generateNarrowLines({ lines: LINES, ...extra });
const measure = (w, z = w.truth.z) =>
  A.measureBptLines(w, {
    z,
    rest: w.truth.restNm,
    sources: w.truth.sources,
  });
const zOfLag = k => 10 ** (k * STEP) - 1;

/**
 * Why each failing leg fails, written after the first run and left with the leg (nothing here moves a bound).
 * The causes named are the evidence's, with the ones not isolated by an experiment said so.
 */
const WHY = {
  'A7.quasarShift':
    'Nine noise-free cases: four are recovered inside the bound or near it (k = 500 at 1.7e-7 and z = 0.1234 at 1.1e-7 pass; z = 1.0777 reads 2.2e-5, k = 2000 reads 1.9e-6), k = 1500 reads 1.3e-4 against 1e-6, z = 1.9999 reads 4.4e-4 against 5e-5, and three (k = 2500, z = 0.5555, z = 2.3456) are refused ambiguous-peak. The refusal is the galaxy kernel\u2019s committed 0.8 rule doing its work: the world\u2019s three invented ultraviolet lines sit at 0.2, 0.3 and 0.4 of H-alpha, a 2:3:4 spacing under which the template shifted by a modest factor lines up with itself, so a second correlation peak reaches 0.8 of the best. Where a case is recovered the departure is a systematic floor of 1e-6 to 4e-4 in z, which we attribute (not isolated by an experiment) to the high-pass filter\u2019s edge effects at the spectrum\u2019s cut at 1000 nm with a 401-sample window and to the template\u2019s different extent. Left failing as committed; a world whose invented lines are not harmonic, and a leg that expects a refusal where the world is ambiguous, are questions for Carl in AGN.md.',
  'B3.redshiftOracle':
    'Five of the eight noisy worlds are refused ambiguous-peak by the kernel (the oracle has no ambiguity rule and returns a redshift for all eight), so the leg, which requires status ok on every case, fails on the committed text. On the three recovered worlds the kernel and the independent implementation agree to 8.6e-9 in z, 8.0e-9 relative in sigma, 6.3e-14 relative in q and 4.4e-15 of the profile maximum, far inside the bounds. The cause of the refusals is the harmonic spacing of the invented lines named under A7. Left failing as committed.',
  'B6.lineFluxOracle':
    'The kernel\u2019s fit and scipy\u2019s curve_fit on the same window and model differ by up to 1.08 of a sigma in the flux (bound 0.25) and by up to 48 percent in the reported sigma (bound 5 percent). The windows are 7 pixels half-width for the two lines near their neighbour and 10 for the others, a five-parameter fit in 15 to 23 pixels of a line about 2 pixels wide, so the two optimisers settle at different points of a poorly conditioned surface; the kernel\u2019s fit errors are larger than scipy\u2019s in 23 of 24 lines, by 1 to 48 percent. Not isolated further. C5 shows the kernel\u2019s own intervals cover (x 0.63, y 0.72), so the consequence is a disagreement between two fits, not a measured miscalibration. Left failing as committed.',
  'C1.redshiftCoverage':
    '134 of 300 worlds are refused ambiguous-peak (the harmonic spacing named under A7), so the ok share is 0.553 against the committed 0.95. Among the 166 answered, the coverage of the one-sigma interval is 0.446 (band 0.602 to 0.763) and the standard deviation of the normalised error is 16.5 (band 0.85 to 1.15): the median absolute error 6.1e-5 is close to the median sigma 5.3e-5, so the failure is in the tail (a few answers with errors of 1e-3 and sigmas of 1e-5, where the systematic floor named under A7 exceeds the noise at high signal to noise). No catastrophic answer. The interval carries noise only, as the kernel states. Left failing as committed.',
  'D2.undetectedAndBlended':
    'The blend half passes (50 of 50 unresolved-blend). In the weak-line half 48 of 50 worlds return line-not-detected for the invented O line as committed, and 2 return line-fit-failed: the fit of a line that is not there did not converge, which the committed rule does not treat as a non-detection. Left failing as committed; mapping a failed fit at the expected position to line-not-detected is a question for Carl.',
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

const drawsOf = (seed, label) => {
  const d = stream('forward', seed, label);
  return { u: (a, b) => a + (b - a) * d(), d, n: gaussian(d) };
};

/** A spectrum, or the template, from the oracle's inputs. */
const specOf = (flux, sigmaPixel) => {
  const g = INPUTS.grid;
  const lambda = new Float64Array(g.samples);
  for (let i = 0; i < g.samples; i++)
    lambda[i] = 10 ** (g.log10Start + i * g.log10Step);
  return {
    lambdaNm: lambda,
    flux: Float64Array.from(flux),
    sigma: new Float64Array(g.samples).fill(sigmaPixel),
    medium: 'vacuum',
    resolvingPower: g.resolvingPower,
    fluxKind: 'f-lambda',
  };
};
const narrowSpecOf = (flux, sigmaPixel) => {
  const g = INPUTS.narrowGrid;
  const lambda = new Float64Array(g.samples);
  for (let i = 0; i < g.samples; i++)
    lambda[i] = 10 ** (g.log10Start + i * g.log10Step);
  return {
    lambdaNm: lambda,
    flux: Float64Array.from(flux),
    sigma: new Float64Array(g.samples).fill(sigmaPixel),
    medium: 'vacuum',
    resolvingPower: g.resolvingPower,
    fluxKind: 'f-lambda',
  };
};
const bptLines = (x, y, relErr = 1e-6) => ({
  ha: { flux: 1, sigma: relErr },
  hb: { flux: 1, sigma: relErr },
  n: { flux: 10 ** x, sigma: relErr * 10 ** x },
  o: { flux: 10 ** y, sigma: relErr * 10 ** y },
});
const curveY = (c, x) => c.a / (x - c.b) + c.c;
const trueClass = (x, y) => A.bptClass(x, y, CURVES);

/** Band luminosity of a flux at the band whose rest wavelength is the invented factor's. */
const bandAt = (z, value, sigma, cos = cosmology) =>
  A.bandLuminosity({
    observedNm: BC.restNm * (1 + z),
    nuFnu: { value, sigma },
    z,
    cosmology: cos,
  });

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      id,
      status: pass ? 'pass' : 'fail',
      measured,
      note: pass ? '' : (WHY[id] ?? note),
    });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));

  // ---- A1: the Eddington luminosity against its closed form -----------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.eddingtonClosedForm');
    const GM = CONSTANTS.GM_sun.value;
    const mp = CONSTANTS.m_p.value;
    const sT = CONSTANTS.sigma_T.value;
    let worstCf = 0;
    let worstInv = 0;
    let worstRatio = 0;
    for (const M of L.masses) {
      const k = A.eddingtonLuminosity(M).luminosityW;
      const cf = (4 * Math.PI * (GM * M) * mp * C_LIGHT) / sT;
      worstCf = Math.max(worstCf, rel(k, cf));
      const b = A.eddingtonMassBound({ luminosityW: k });
      worstInv = Math.max(worstInv, rel(b.massBoundSolar, M));
      worstRatio = Math.max(
        worstRatio,
        Math.abs(A.eddingtonRatio({ luminosityW: k, massSolar: M }).ratio - 1)
      );
    }
    const lin = rel(
      A.eddingtonLuminosity(2e6).luminosityW /
        A.eddingtonLuminosity(1e6).luminosityW,
      2
    );
    row(
      'A1.eddingtonClosedForm',
      worstCf <= L.maxRelativeClosedForm &&
        lin <= L.maxRelativeLinearity &&
        worstInv <= L.maxRelativeInverse &&
        worstRatio <= L.maxRelativeInverse,
      {
        closedForm: worstCf,
        linearity: lin,
        inverse: worstInv,
        ratio: worstRatio,
      }
    );
  }

  // ---- A2: luminosity scaling -----------------------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.luminosityScaling');
    const fl = 3.3e-17;
    const lamNm = 550;
    const fNu = (fl * lamNm * lamNm) / (C_LIGHT * 1e9);
    const e1 = rel(A.nuFnuFromFnu(lamNm, fNu), A.nuFnuFromFlambda(lamNm, fl));
    const F = 1e-13;
    const lo = bandAt(L.zLow, F, 0);
    const dh = ((C_LIGHT / 1000) * L.zLow) / COSMO.H0;
    const e2 = rel(lo.luminosityW, 4 * Math.PI * (dh * MPC_M) ** 2 * F);
    const a = bandAt(0.5, F, 0);
    const b = bandAt(1.5, F, 0);
    const e3 = rel(
      b.luminosityW / a.luminosityW,
      (cosmology.luminosityDistance(1.5) / cosmology.luminosityDistance(0.5)) **
        2
    );
    const e4 = Math.abs(a.restNm - a.observedNm / (1 + a.z));
    const e5 = rel(bandAt(0.5, 2 * F, 0).luminosityW / a.luminosityW, 2);
    row(
      'A2.luminosityScaling',
      e1 <= L.maxRelativeNuFnu &&
        e2 <= L.maxRelativeLowZ &&
        e3 <= L.maxRelativeRatio &&
        e4 === 0 &&
        e5 <= 1e-15,
      { nuFnu: e1, lowZ: e2, ratio: e3, restWavelengthError: e4, doubling: e5 }
    );
  }

  // ---- A3: the bolometric terms ---------------------------------------------------------------------

  if (wanted('A3.')) {
    const L = lim('A3.bolometricTerms');
    const F = 1e-13;
    const z = 0.7;
    const per = [];
    let ok = true;
    let worstCentral = 0;
    let worstHalf = 0;
    let worstQuad = 0;
    for (const [stat, scatter] of L.cases) {
      const band = bandAt(z, F, stat * Math.LN10 * F);
      const bol = A.bolometricLuminosity({
        band,
        bc: { ...BC, scatterDex: scatter },
      });
      worstCentral = Math.max(
        worstCentral,
        rel(bol.luminosityW, band.luminosityW * BC.value)
      );
      worstQuad = Math.max(
        worstQuad,
        rel(bol.sigmaTotal ** 2, bol.sigmaStat ** 2 + bol.sigmaModel ** 2)
      );
      const expectLimited = scatter > stat * (1 + 1e-9);
      if (bol.modelLimited !== expectLimited) ok = false;
      per.push({ stat, scatter, modelLimited: bol.modelLimited });
    }
    {
      const band = bandAt(z, F, 0);
      const bol = A.bolometricLuminosity({
        band,
        bc: { ...BC, scatterDex: 0.2 },
      });
      worstHalf = Math.max(
        worstHalf,
        rel(
          0.5 * (Math.log10(bol.interval.hi) - Math.log10(bol.interval.lo)),
          0.2
        )
      );
      const band2 = bandAt(z, F, 0.05 * Math.LN10 * F);
      const bol2 = A.bolometricLuminosity({
        band: band2,
        bc: { ...BC, scatterDex: 0 },
      });
      worstHalf = Math.max(
        worstHalf,
        rel(
          0.5 * (Math.log10(bol2.interval.hi) - Math.log10(bol2.interval.lo)),
          0.05
        )
      );
    }
    row(
      'A3.bolometricTerms',
      ok &&
        worstCentral <= L.maxRelativeCentral &&
        worstHalf <= L.maxRelativeHalfWidth &&
        worstQuad <= L.maxRelativeQuadrature,
      {
        central: worstCentral,
        halfWidth: worstHalf,
        quadrature: worstQuad,
        per,
      }
    );
  }

  // ---- A4: the size bound ---------------------------------------------------------------------------

  if (wanted('A4.')) {
    const L = lim('A4.sizeBound');
    let worst = 0;
    for (const [tau, z, delta] of L.cases) {
      const r = A.sizeBound({ tauDays: tau, z, delta });
      worst = Math.max(
        worst,
        rel(r.sizeM, (C_LIGHT * tau * 86400 * delta) / (1 + z))
      );
    }
    row('A4.sizeBound', worst <= L.maxRelative, { worstRelative: worst });
  }

  // ---- A5: the sinusoid's fastest time scale --------------------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.sinusoidTimescale');
    const per = [];
    let ok = true;
    for (const amp of L.amplitudes) {
      const c = A.generateSinusoidCurve({
        amplitude: amp,
        periodDays: L.periodDays,
        epochs: L.epochs,
        relativeError: L.relativeError,
        noise: false,
      });
      const r = A.fastestTimescale(c);
      const tmin = c.truth.tauMinDays;
      const ratio = r.status === 'ok' ? r.tauDays / tmin : NaN;
      if (!(ratio >= 1 - L.lowerSlack && ratio <= L.upperRatio)) ok = false;
      per.push({
        amplitude: amp,
        tauMinDays: sig(tmin, 6),
        ratio: sig(ratio, 8),
      });
    }
    row('A5.sinusoidTimescale', ok, { per });
  }

  // ---- A6: known BPT points -------------------------------------------------------------------------

  if (wanted('A6.')) {
    const L = lim('A6.bptKnownPoints');
    const cases = [];
    for (const x of L.xs) {
      const fs = curveY(CURVES.curves.starForming, x);
      const fa = curveY(CURVES.curves.agn, x);
      cases.push([x, fs - L.offsetDex, 'star-forming']);
      cases.push([x, 0.5 * (fs + fa), 'composite']);
      cases.push([x, fa + L.offsetDex, 'agn']);
    }
    for (const [x, y, c] of L.rightOfAsymptotes) cases.push([x, y, c]);
    let correct = 0;
    const per = [];
    for (const [x, y, c] of cases) {
      const r = A.classifyBpt({
        lines: bptLines(x, y, L.fluxRelativeError),
        definition: CURVES,
      });
      const good = r.status === 'ok' && r.class === c;
      if (good) correct++;
      per.push({ x, y: sig(y, 5), expected: c, got: r.class ?? r.code });
    }
    row('A6.bptKnownPoints', correct / cases.length >= L.minCorrect, {
      correct,
      of: cases.length,
      per,
    });
  }

  // ---- A7: the quasar redshift of shifted templates -----------------------------------------------

  if (wanted('A7.')) {
    const L = lim('A7.quasarShift');
    let worstLag = 0;
    let worstSub = 0;
    let allOk = true;
    const per = [];
    for (const k of L.lags) {
      const z = zOfLag(k);
      const r = xcq(qworld(z, { noise: false, snr: 20 }));
      const e = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
      if (r.status !== 'ok') allOk = false;
      worstLag = Math.max(worstLag, e);
      per.push({
        k,
        z: sig(z, 6),
        error: sig(e),
        status: r.status,
        code: r.code ?? null,
      });
    }
    for (const z of L.zs) {
      const r = xcq(qworld(z, { noise: false, snr: 20 }));
      const e = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
      if (r.status !== 'ok') allOk = false;
      worstSub = Math.max(worstSub, e);
      per.push({ z, error: sig(e), status: r.status, code: r.code ?? null });
    }
    row(
      'A7.quasarShift',
      allOk && worstLag <= L.maxAbsoluteZLag && worstSub <= L.maxAbsoluteZSub,
      { worstLag, worstSub, per }
    );
  }

  // ---- B1 to B6: the independent implementation -----------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1.eddingtonOracle');
    const o = ORACLE.b1;
    let worst = rel(A.L_EDD_PER_MSUN_W, o.perSolarMass);
    INPUTS.eddington.massesSolar.forEach((M, i) => {
      worst = Math.max(
        worst,
        rel(A.eddingtonLuminosity(M).luminosityW, o.luminosityW[i])
      );
    });
    INPUTS.eddington.luminositiesW.forEach((Lw, i) => {
      worst = Math.max(
        worst,
        rel(
          A.eddingtonMassBound({ luminosityW: Lw }).massBoundSolar,
          o.massBound[i]
        )
      );
    });
    row('B1.eddingtonOracle', worst <= L.maxRelative, {
      worstRelative: worst,
      note: 'the oracle reads the same installed astropy constants as the pinned file: this checks the arithmetic and the units, not the constants',
    });
  }

  if (wanted('B2.')) {
    const L = lim('B2.distanceOracle');
    let worstD = 0;
    let worstL = 0;
    for (const block of ORACLE.b2) {
      const cos = createCosmology(block.cosmology);
      for (const r of block.rows) {
        worstD = Math.max(worstD, rel(cos.luminosityDistance(r.z), r.dLMpc));
        const b = A.bandLuminosity({
          observedNm: 550,
          nuFnu: { value: INPUTS.fluxWM2, sigma: 0 },
          z: r.z,
          cosmology: cos,
        });
        worstL = Math.max(worstL, rel(b.luminosityW, r.luminosityW));
      }
    }
    row(
      'B2.distanceOracle',
      worstD <= L.maxRelative && worstL <= L.maxRelative,
      {
        distance: worstD,
        luminosity: worstL,
      }
    );
  }

  if (wanted('B3.')) {
    const L = lim('B3.redshiftOracle');
    let worstZ = 0;
    let worstS = 0;
    let worstQ = 0;
    let worstP = 0;
    let allOk = true;
    const codes = [];
    const tpl = {
      ...TPL,
      flux: Float64Array.from(INPUTS.template.flux),
    };
    INPUTS.quasars.forEach((c, i) => {
      const spec = specOf(c.flux, c.sigmaPixel);
      const r = A.quasarRedshift(spec, tpl, {
        zRange: INPUTS.zRange,
        keepProfile: true,
      });
      const o = ORACLE.b3[i];
      codes.push(r.status === 'ok' ? 'ok' : (r.code ?? r.status));
      if (r.status !== 'ok') {
        allOk = false;
        return;
      }
      worstZ = Math.max(worstZ, Math.abs(r.z - o.z));
      worstS = Math.max(worstS, rel(r.sigmaZ, o.sigmaZ));
      worstQ = Math.max(worstQ, rel(r.q, o.q));
      if (i < L.profileCases) {
        const of = ORACLE.b3fft[i];
        const qmax = Math.max(...of.q.map(Math.abs));
        let w = 0;
        r.profile.q.forEach((v, j) => {
          w = Math.max(w, Math.abs(v - of.q[j]) / qmax);
        });
        if (r.profile.lag0 !== of.lag0 || r.profile.q.length !== of.q.length)
          allOk = false;
        worstP = Math.max(worstP, w);
      }
    });
    row(
      'B3.redshiftOracle',
      allOk &&
        worstZ <= L.maxAbsoluteZ &&
        worstS <= L.maxRelativeSigma &&
        worstQ <= L.maxRelativeQ &&
        worstP <= L.maxRelativeProfile,
      { worstZ, worstSigma: worstS, worstQ, worstProfile: worstP, codes }
    );
  }

  if (wanted('B4.')) {
    const L = lim('B4.bptOracle');
    let worst = 0;
    INPUTS.bpt.fluxSets.forEach((s, i) => {
      const r = A.bptRatios(s);
      const o = ORACLE.b4.ratios[i];
      worst = Math.max(
        worst,
        rel(r.x, o[0]),
        rel(r.y, o[1]),
        rel(r.sigmaX, o[2]),
        rel(r.sigmaY, o[3])
      );
    });
    let same = 0;
    INPUTS.bpt.points.forEach(([x, y], i) => {
      if (A.bptClass(x, y, CURVES) === ORACLE.b4.classes[i]) same++;
    });
    const frac = same / INPUTS.bpt.points.length;
    row('B4.bptOracle', worst <= L.maxRelative && frac >= L.minIdentical, {
      worstRelative: worst,
      identicalClasses: same,
      of: INPUTS.bpt.points.length,
    });
  }

  if (wanted('B5.')) {
    const L = lim('B5.timescaleOracle');
    let worst = 0;
    let pairsSame = true;
    INPUTS.curves.forEach((c, i) => {
      const r = A.fastestTimescale({
        t: c.t,
        flux: c.flux,
        sigma: c.sigma,
      });
      const o = ORACLE.b5[i];
      if (r.status !== 'ok' || o.tau === null) {
        pairsSame = pairsSame && r.status !== 'ok' && o.tau === null;
        return;
      }
      worst = Math.max(worst, rel(r.tauDays, o.tau), rel(r.tauUpDays, o.tauUp));
      if (
        r.pair[0] !== o.pair[0] ||
        r.pair[1] !== o.pair[1] ||
        r.pairUp[0] !== o.pairUp[0] ||
        r.pairUp[1] !== o.pairUp[1]
      )
        pairsSame = false;
    });
    row('B5.timescaleOracle', pairsSame && worst <= L.maxRelative, {
      worstRelative: worst,
      samePairs: pairsSame,
    });
  }

  if (wanted('B6.')) {
    const L = lim('B6.lineFluxOracle');
    let worstSigmas = 0;
    let worstSigma = 0;
    let allOk = true;
    INPUTS.narrow.forEach((c, i) => {
      const spec = narrowSpecOf(c.flux, c.sigmaPixel);
      const r = A.measureBptLines(spec, {
        z: c.z,
        rest: c.restNm,
        sources: { n: 'invented', o: 'invented' },
      });
      if (r.status !== 'ok') {
        allOk = false;
        return;
      }
      for (const k of ['ha', 'hb', 'n', 'o']) {
        const o = ORACLE.b6[i].lines[k];
        worstSigmas = Math.max(
          worstSigmas,
          Math.abs(r.lines[k].flux - o.flux) / o.sigma
        );
        worstSigma = Math.max(worstSigma, rel(r.lines[k].sigma, o.sigma));
      }
    });
    row(
      'B6.lineFluxOracle',
      allOk && worstSigmas <= L.maxSigmas && worstSigma <= L.maxRelativeSigma,
      { worstFluxSigmas: worstSigmas, worstRelativeSigma: worstSigma }
    );
  }

  if (wanted('B7.'))
    notRun(
      'B7.sdssPipelineOracle',
      'No SDSS quasar spectrum and no pipeline redshift or line ratio for one is in the tree, and nothing is fetched. AGN.md ("Files requested from Carl") names the spectra, the pipeline products and the terms pages to save; the bound when run is fixed in thresholds.json.'
    );

  // ---- C1: the redshift's coverage ------------------------------------------------------------------

  if (wanted('C1.')) {
    const L = lim('C1.redshiftCoverage');
    const { u } = drawsOf(SEEDS.ensembleRedshift, 'params');
    const list = [];
    let ok = 0;
    let catastrophic = 0;
    const status = {};
    const errs = [];
    for (let i = 0; i < L.n; i++) {
      const z = u(L.zRange[0], L.zRange[1]);
      const snr = u(L.snrRange[0], L.snrRange[1]);
      const r = xcq(qworld(z, { seed: `c1-${i}`, snr }));
      const key = r.status === 'ok' ? 'ok' : (r.code ?? r.status);
      status[key] = (status[key] ?? 0) + 1;
      if (r.status === 'ok') {
        errs.push(Math.abs(r.z - z));
        ok++;
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
      }
      if (r.z !== undefined && Math.abs(r.z - z) > 0.01) catastrophic++;
    }
    const c = coverage(list);
    row(
      'C1.redshiftCoverage',
      inRange(c.coverage, L.coverageBand) &&
        inRange(c.sdZ, L.sdBand) &&
        ok / L.n >= L.minOkFraction &&
        catastrophic / L.n <= L.maxCatastrophic,
      {
        ...c,
        okFraction: ok / L.n,
        catastrophic: catastrophic / L.n,
        status,
        medianAbsErrorZ: sig(median(errs), 3),
        medianSigmaZ: sig(median(list.map(r => r.sigma)), 3),
      }
    );
  }

  // ---- C2 and C3: the luminosity interval and the Eddington bound ------------------------------------

  const luminosityWorld = (u, n, L, withMass) => {
    const z = u(0.1, 2);
    let fTrue;
    let bcTrue;
    let mTrue = null;
    const dL = cosmology.luminosityDistance(z) * MPC_M;
    const area = 4 * Math.PI * dL * dL;
    bcTrue = BC.value * 10 ** (BC.scatterDex * n());
    if (withMass) {
      mTrue = 10 ** u(Math.log10(L.massRange[0]), Math.log10(L.massRange[1]));
      const ratio =
        10 ** u(Math.log10(L.ratioRange[0]), Math.log10(L.ratioRange[1]));
      const lbol = ratio * mTrue * A.L_EDD_PER_MSUN_W;
      fTrue = lbol / bcTrue / area;
    } else fTrue = 10 ** u(-15, -11);
    const eps = u(0.02, 0.1);
    const fMeas = fTrue * (1 + eps * n());
    return { z, fTrue, fMeas, eps, bcTrue, mTrue, area };
  };

  if (wanted('C2.')) {
    const L = lim('C2.luminosityCoverage');
    const { u, n } = drawsOf(SEEDS.ensembleLuminosity, 'params');
    let in1 = 0;
    let in2 = 0;
    let statIn = 0;
    for (let i = 0; i < L.n; i++) {
      const w = luminosityWorld(u, n, L, false);
      const truth = w.area * w.fTrue * w.bcTrue;
      const band = bandAt(w.z, w.fMeas, w.eps * w.fMeas);
      const b1 = A.bolometricLuminosity({ band, bc: BC });
      const b2 = A.bolometricLuminosity({ band, bc: BC, level: 0.9545 });
      if (truth >= b1.interval.lo && truth <= b1.interval.hi) in1++;
      if (truth >= b2.interval.lo && truth <= b2.interval.hi) in2++;
      if (truth >= b1.intervalStatOnly.lo && truth <= b1.intervalStatOnly.hi)
        statIn++;
    }
    const c1 = in1 / L.n;
    const c2 = in2 / L.n;
    const cs = statIn / L.n;
    row(
      'C2.luminosityCoverage',
      inRange(c1, L.coverage1Band) &&
        inRange(c2, L.coverage2Band) &&
        cs <= L.statOnlyMax,
      { n: L.n, coverage1: c1, coverage2: c2, statOnlyCoverage1: cs }
    );
  }

  if (wanted('C3.')) {
    const L = lim('C3.eddingtonBoundCoverage');
    const { u, n } = drawsOf(SEEDS.ensembleEddington, 'params');
    let holds = 0;
    for (let i = 0; i < L.n; i++) {
      const w = luminosityWorld(u, n, L, true);
      const band = bandAt(w.z, w.fMeas, w.eps * w.fMeas);
      const bol = A.bolometricLuminosity({ band, bc: BC });
      const b = A.eddingtonMassBound({ bolometric: bol });
      if (b.massBoundLower95Solar <= w.mTrue) holds++;
    }
    row('C3.eddingtonBoundCoverage', holds / L.n >= L.minHolds, {
      n: L.n,
      holds: holds / L.n,
    });
  }

  // ---- C4: the size bound holds ---------------------------------------------------------------------

  if (wanted('C4.')) {
    const L = lim('C4.sizeBoundHolds');
    const { u } = drawsOf(SEEDS.ensembleVariability, 'params');
    let answered = 0;
    let holds = 0;
    const ratios = [];
    for (let i = 0; i < L.n; i++) {
      const amp = u(L.amplitudeRange[0], L.amplitudeRange[1]);
      const period =
        10 **
        u(Math.log10(L.periodRangeDays[0]), Math.log10(L.periodRangeDays[1]));
      const err = u(L.errorRange[0], L.errorRange[1]);
      const z = u(L.zRange[0], L.zRange[1]);
      const phase = u(0, 2 * Math.PI);
      const c = A.generateSinusoidCurve({
        amplitude: amp,
        periodDays: period,
        epochs: L.epochs,
        relativeError: err,
        seed: `c4-${i}`,
        phase,
      });
      const r = A.fastestTimescale(c);
      if (r.status !== 'ok') continue;
      answered++;
      const rTrue = (C_LIGHT * c.truth.tauMinDays * 86400) / (1 + z);
      const bound = A.sizeBound({ tauDays: r.tauUpDays, z }).sizeM;
      if (rTrue <= bound) holds++;
      ratios.push(r.tauUpDays / c.truth.tauMinDays);
    }
    row(
      'C4.sizeBoundHolds',
      answered > 0 &&
        holds / answered >= L.minHolds &&
        answered / L.n >= L.minAnswered &&
        median(ratios) <= L.maxMedianRatio,
      {
        n: L.n,
        answeredFraction: answered / L.n,
        holdsFraction: holds / Math.max(1, answered),
        medianTauUpOverTauMin: median(ratios),
      }
    );
  }

  // ---- C5: the BPT ensemble ---------------------------------------------------------------------------

  if (wanted('C5.')) {
    const L = lim('C5.bptEnsemble');
    const { u } = drawsOf(SEEDS.ensembleBpt, 'params');
    const xl = [];
    const yl = [];
    let classed = 0;
    let correct = 0;
    let measured = 0;
    let ambiguous = 0;
    let refusedLine = 0;
    for (let i = 0; i < L.nWorlds && measured < L.nJudged; i++) {
      const z = u(L.zRange[0], L.zRange[1]);
      const x = u(L.xRange[0], L.xRange[1]);
      const y = u(L.yRange[0], L.yRange[1]);
      const w = nworld({
        z,
        x,
        y,
        hAlphaFlux: u(L.hAlphaFluxRange[0], L.hAlphaFluxRange[1]),
        snr: u(L.snrRange[0], L.snrRange[1]),
        seed: `c5-${i}`,
      });
      const m = measure(w);
      if (m.status !== 'ok') {
        refusedLine++;
        continue;
      }
      const c = A.classifyBpt({
        lines: m.lines,
        definition: CURVES,
        seed: `c5-${i}`,
      });
      if (c.code === 'line-not-detected') continue;
      measured++;
      xl.push({ value: c.x, sigma: c.sigmaX, truth: x });
      yl.push({ value: c.y, sigma: c.sigmaY, truth: y });
      if (c.status === 'ok') {
        classed++;
        if (c.class === trueClass(x, y)) correct++;
      } else if (c.code === 'class-ambiguous') ambiguous++;
    }
    const cx = coverage(xl);
    const cy = coverage(yl);
    row(
      'C5.bptEnsemble',
      measured >= L.nJudged &&
        inRange(cx.coverage, L.coverageBand) &&
        inRange(cy.coverage, L.coverageBand) &&
        classed > 0 &&
        correct / classed >= L.minCorrect,
      {
        measuredWorlds: measured,
        x: cx,
        y: cy,
        classed,
        correctFraction: correct / Math.max(1, classed),
        ambiguous,
        refusedBeforeRatios: refusedLine,
      }
    );
  }

  // ---- D: refusals and misspecified worlds ---------------------------------------------------------

  if (wanted('D1.')) {
    const L = lim('D1.linesOutsideCoverage');
    let refused = 0;
    let total = 0;
    const codes = {};
    for (const z of L.zs)
      for (let s = 0; s < L.seeds; s++) {
        const w = nworld({ z, x: -0.5, y: 0.2, seed: `d1-${z}-${s}` });
        const m = measure(w);
        total++;
        codes[m.code ?? m.status] = (codes[m.code ?? m.status] ?? 0) + 1;
        if (
          m.status === 'not-constrained' &&
          m.code === 'line-outside-coverage' &&
          m.x === undefined
        )
          refused++;
      }
    row('D1.linesOutsideCoverage', refused / total >= L.minRefused, {
      refused,
      of: total,
      codes,
    });
  }

  if (wanted('D2.')) {
    const L = lim('D2.undetectedAndBlended');
    let weakOk = 0;
    let blendOk = 0;
    const codes = {};
    for (let i = 0; i < L.n; i++) {
      const w = nworld({
        z: 0.1,
        x: -0.5,
        y: Math.log10(L.oFraction),
        hAlphaFlux: 3,
        snr: 10,
        seed: `d2a-${i}`,
      });
      const m = measure(w);
      const c =
        m.status === 'ok'
          ? A.classifyBpt({ lines: m.lines, definition: CURVES })
          : m;
      codes[c.code ?? c.status] = (codes[c.code ?? c.status] ?? 0) + 1;
      if (
        c.status === 'not-constrained' &&
        c.code === 'line-not-detected' &&
        c.lines.includes('o')
      )
        weakOk++;
      const w2 = nworld({
        z: 0.1,
        x: -0.5,
        y: 0.2,
        hAlphaFlux: 3,
        snr: 10,
        restSeparationNm: L.blendSeparationNm,
        seed: `d2b-${i}`,
      });
      const m2 = measure(w2);
      codes[`blend:${m2.code ?? m2.status}`] =
        (codes[`blend:${m2.code ?? m2.status}`] ?? 0) + 1;
      if (m2.status === 'not-constrained' && m2.code === 'unresolved-blend')
        blendOk++;
    }
    row(
      'D2.undetectedAndBlended',
      weakOk / L.n >= L.minRefused && blendOk / L.n >= L.minRefused,
      { weakRefused: weakOk, blendRefused: blendOk, of: L.n, codes }
    );
  }

  if (wanted('D3.')) {
    const L = lim('D3.bandMismatch');
    const F = 1e-13;
    const refusedBand = A.bolometricLuminosity({
      band: A.bandLuminosity({
        observedNm: L.observedNm,
        nuFnu: { value: F, sigma: 0 },
        z: L.zRefused,
        cosmology,
      }),
      bc: BC,
    });
    const accepted = A.bolometricLuminosity({
      band: A.bandLuminosity({
        observedNm: L.observedNm,
        nuFnu: { value: F, sigma: 0 },
        z: L.zAccepted,
        cosmology,
      }),
      bc: BC,
    });
    const band = bandAt(0.3, F, 0);
    const noSource = A.bolometricLuminosity({
      band,
      bc: { ...BC, source: '' },
    });
    const noScatter = A.bolometricLuminosity({
      band,
      bc: { ...BC, scatterDex: undefined },
    });
    const noBand = A.bolometricLuminosity({
      band,
      bc: { ...BC, restNm: undefined },
    });
    const good =
      refusedBand.status === 'refused' &&
      refusedBand.code === 'band-mismatch' &&
      refusedBand.luminosityW === undefined &&
      accepted.status === 'ok' &&
      noSource.code === 'no-source' &&
      noScatter.code === 'bad-scatter' &&
      noBand.code === 'no-band';
    row('D3.bandMismatch', good, {
      refused: refusedBand.code,
      accepted: accepted.status,
      noSource: noSource.code,
      noScatter: noScatter.code,
      noBand: noBand.code,
    });
  }

  if (wanted('D4.')) {
    const band = bandAt(0.3, 1e-13, 0.05e-13);
    const bol = A.bolometricLuminosity({ band, bc: BC });
    const b = A.eddingtonMassBound({ bolometric: bol });
    const text = b.assumes.join(' ').toLowerCase();
    const labelOk =
      b.kind === 'lower-bound' &&
      b.sign === 'M >=' &&
      b.assumes.length > 0 &&
      ['electron scattering', 'steady', 'spherical', 'ionised hydrogen'].every(
        s => text.includes(s)
      );
    const refusals = [
      A.eddingtonMassBound({ luminosityW: -1 }).code === 'bad-luminosity',
      A.eddingtonMassBound({ luminosityW: 0 }).code === 'bad-luminosity',
      A.bolometricLuminosity({ band, bc: { ...BC, source: undefined } })
        .code === 'no-source',
      A.bolometricLuminosity({ band, bc: { ...BC, scatterDex: -0.1 } }).code ===
        'bad-scatter',
    ];
    const weak = A.eddingtonMassBound({ luminosityW: 1e36, sigmaW: 1e36 });
    const weakOk =
      weak.status === 'not-constrained' && weak.massBoundSolar === undefined;
    row(
      'D4.boundLabelAndInputs',
      labelOk && refusals.every(Boolean) && weakOk,
      {
        labelOk,
        refusals,
        weak: weak.code,
      }
    );
  }

  if (wanted('D5.')) {
    const L = lim('D5.lightCurveRefusals');
    let nc = 0;
    for (let i = 0; i < L.n; i++) {
      const c = A.generateSinusoidCurve({
        amplitude: 0,
        periodDays: 100,
        epochs: L.epochs,
        relativeError: L.relativeError,
        seed: `d5-${i}`,
      });
      const r = A.fastestTimescale(c);
      if (r.status === 'not-constrained' && r.code === 'no-significant-pair')
        nc++;
    }
    const t = [0, 1, 2, 3, 4, 5];
    const f = [1, 1, 1, 1, 1, 1];
    const s = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    const checks = {
      nonIncreasing:
        A.fastestTimescale({ t: [0, 1, 1, 3, 4, 5], flux: f, sigma: s })
          .code === 'times-not-increasing',
      fewEpochs:
        A.fastestTimescale({
          t: [0, 1, 2],
          flux: [1, 1, 1],
          sigma: [0.1, 0.1, 0.1],
        }).code === 'too-few-epochs',
      badError:
        A.fastestTimescale({ t, flux: f, sigma: [0.1, 0.1, 0, 0.1, 0.1, 0.1] })
          .code === 'bad-error',
      mismatch:
        A.fastestTimescale({ t, flux: f.slice(1), sigma: s }).code ===
        'length-mismatch',
    };
    row(
      'D5.lightCurveRefusals',
      nc / L.n >= L.minNotConstrained && Object.values(checks).every(Boolean),
      { notConstrained: nc, of: L.n, checks }
    );
  }

  if (wanted('D6.')) {
    const L = lim('D6.featurelessSpectrum');
    const { u } = drawsOf(SEEDS.featureless, 'params');
    let ok = 0;
    const status = {};
    let maxQ = 0;
    for (let i = 0; i < L.n; i++) {
      const r = xcq(
        qworld(0, {
          featureless: true,
          seed: `d6-${i}`,
          snr: u(L.snrRange[0], L.snrRange[1]),
        })
      );
      const k = r.status === 'refused' ? `refused:${r.code}` : r.status;
      status[k] = (status[k] ?? 0) + 1;
      if (r.status === 'ok') ok++;
      if (r.q !== undefined) maxQ = Math.max(maxQ, r.q);
    }
    row('D6.featurelessSpectrum', ok / L.n <= L.maxOkFraction, {
      okFraction: ok / L.n,
      status,
      maxQ: sig(maxQ),
    });
  }

  if (wanted('D7.')) {
    const L = lim('D7.bptAmbiguous');
    const relErr = (L.errorDex / Math.SQRT2) * Math.LN10;
    let ambiguous = 0;
    let assigned = 0;
    const xs = Array.from(
      { length: L.n / 2 },
      (_, i) => -1.6 + (1.4 * i) / (L.n / 2 - 1)
    );
    let i = 0;
    for (const c of ['starForming', 'agn'])
      for (const x of xs) {
        const y = curveY(CURVES.curves[c], x);
        const lines = {
          ha: { flux: 1, sigma: relErr },
          hb: { flux: 1, sigma: relErr },
          n: { flux: 10 ** x, sigma: relErr * 10 ** x },
          o: { flux: 10 ** y, sigma: relErr * 10 ** y },
        };
        const r = A.classifyBpt({
          lines,
          definition: CURVES,
          seed: `d7-${i++}`,
        });
        if (
          r.status === 'not-constrained' &&
          r.code === 'class-ambiguous' &&
          r.probability
        )
          ambiguous++;
        if (r.status === 'ok') assigned++;
      }
    row(
      'D7.bptAmbiguous',
      ambiguous / L.n >= L.minAmbiguous && assigned === 0,
      {
        ambiguous,
        assigned,
        of: L.n,
      }
    );
  }

  // ---- E: authentic data ----------------------------------------------------------------------------

  if (wanted('E1.'))
    notRun(
      'E1.sdssQuasarPack',
      'No SDSS quasar spectrum at any redshift and no pipeline value for one is in the tree, and nothing is fetched. AGN.md ("Files requested from Carl") names the three objects to choose, the products, the fields and the terms pages to save; the bound when run is fixed in thresholds.json.'
    );
  if (wanted('E2.'))
    notRun(
      'E2.bptPublished',
      'No published BPT dividing line and no published line ratio for a named object is in the tree, and nothing is fetched or typed. AGN.md names the papers and the numbers Carl reads from them; the bound when run is fixed in thresholds.json.'
    );
  if (wanted('E3.'))
    notRun(
      'E3.measuredLightCurve',
      'No measured AGN light curve with a published time scale is in the tree, and nothing is fetched. AGN.md names the product and the fields to save.'
    );
  if (wanted('E4.'))
    notRun(
      'E4.bolometricLiterature',
      'No cited bolometric correction, its scatter and rest band, and no published Eddington ratio of a named object is in the tree; none is typed from memory. AGN.md names the values to read from the paper and the source string to save.'
    );

  // ---- R: reported, not judged ---------------------------------------------------------------------

  if (wanted('R1.')) {
    const L = lim('R1.templateMismatch');
    const { u, n } = drawsOf(SEEDS.systematics, 'r1');
    const ids = Object.keys(A.QUASAR_WORLD.peak);
    const list = [];
    const status = {};
    for (let i = 0; i < L.n; i++) {
      const z = u(0.1, 2.4);
      const strength = {};
      const widthScale = {};
      const shiftKmS = {};
      for (const id of ids) {
        strength[id] = u(L.strengthRange[0], L.strengthRange[1]);
        widthScale[id] = u(L.widthRange[0], L.widthRange[1]);
        shiftKmS[id] = L.lineShiftKmS * n();
      }
      const r = xcq(
        qworld(z, {
          seed: `r1-${i}`,
          snr: u(8, 20),
          strength,
          widthScale,
          shiftKmS,
        })
      );
      const k = r.status === 'refused' ? `refused:${r.code}` : r.status;
      status[k] = (status[k] ?? 0) + 1;
      if (r.sigmaZ !== undefined)
        list.push({ value: r.z, sigma: r.sigmaZ, truth: z });
    }
    reported(
      'R1.templateMismatch',
      {
        ...coverage(list),
        status,
        meanKmS: sig(
          mean(
            list.map(r => ((r.value - r.truth) / (1 + r.truth)) * 299792.458)
          ),
          3
        ),
      },
      'A template that is not the object, and lines that do not share one redshift, give an interval that undercovers: the cost is on the page.'
    );
  }

  if (wanted('R2.')) {
    const L = lim('R2.lineShiftSystematic');
    const { u } = drawsOf(SEEDS.systematics, 'r2');
    const out = {};
    for (const v of L.shiftsKmS) {
      const bias = [];
      for (let i = 0; i < L.n; i++) {
        const z = u(0.3, 1.2);
        const r = xcq(
          qworld(z, {
            seed: `r2-${v}-${i}`,
            snr: 14,
            shiftKmS: { 'invented-A': v, 'invented-B': v, 'invented-C': v },
          })
        );
        if (r.status === 'ok') bias.push(((r.z - z) / (1 + z)) * 299792.458);
      }
      out[v] = { meanBiasKmS: sig(mean(bias), 3), n: bias.length };
    }
    reported(
      'R2.lineShiftSystematic',
      out,
      'The redshift moves by a fraction of the offset between line families; the interval does not contain it (the caller’s systematicKmS adds it as a model-limited term).'
    );
  }

  if (wanted('R3.')) {
    const L = lim('R3.kCorrectionAbsence');
    const out = {};
    const F0 = 1e-13;
    for (const alpha of L.alphas)
      for (const z of L.zs) {
        // the observed spectrum F_lambda proportional to lambda^alpha: nu F_nu at 550 nm and at 550 (1 + z) nm
        const at = lam => F0 * (lam / 550) ** (alpha + 1);
        const obs = A.bandLuminosity({
          observedNm: 550,
          nuFnu: { value: at(550) },
          z,
          cosmology,
        });
        const shifted = A.bandLuminosity({
          observedNm: 550 * (1 + z),
          nuFnu: { value: at(550 * (1 + z)) },
          z,
          cosmology,
        });
        out[`alpha=${alpha},z=${z}`] = sig(
          shifted.luminosityW / obs.luminosityW,
          6
        );
      }
    reported(
      'R3.kCorrectionAbsence',
      out,
      'The luminosity at a fixed rest wavelength over the observed-band luminosity at the same redshift, for a power-law continuum: (1 + z)^(alpha + 1), the cost of the K-correction the kernel does not apply.'
    );
  }

  if (wanted('R4.')) {
    const L = lim('R4.dividingCurveSensitivity');
    const { u } = drawsOf(SEEDS.systematics, 'r4');
    const pts = Array.from({ length: L.n }, () => [u(-2, 0.9), u(-1.5, 1.2)]);
    const variant = (which, key, f) => {
      const c = JSON.parse(JSON.stringify(CURVES));
      c.curves[which][key] = f(c.curves[which][key]);
      return c;
    };
    const share = def =>
      pts.filter(([x, y]) => A.bptClass(x, y, def) !== trueClass(x, y)).length /
      pts.length;
    const out = {};
    for (const which of ['starForming', 'agn']) {
      for (const d of L.dc)
        out[`${which}.c${d > 0 ? '+' : ''}${d}`] = sig(
          share(variant(which, 'c', v => v + d)),
          3
        );
      out[`${which}.a*${1 + L.dA}`] = sig(
        share(variant(which, 'a', v => v * (1 + L.dA))),
        3
      );
    }
    reported(
      'R4.dividingCurveSensitivity',
      out,
      'The share of random (x, y) points whose class changes when a dividing curve moves: the boundary is a definition and the number says how much of the plane it decides.'
    );
  }

  // ---- G: the Part B luminosity-function gate (gate-thresholds.json) -------------------------------

  for (const g of GATE.checks)
    if (wanted(g.id.split('.')[0] + '.') || wanted(g.id))
      notRun(
        g.id,
        `NOT RUN: the gate's files are not in the tree and nothing is fetched or typed (AGN_LUMINOSITY_FUNCTION_GATE.md, "Files requested from Carl"). No verdict, nothing is built within the gate, and the consumers take the C alternative (a reading step). Threshold fixed in gate-thresholds.json.`
      );

  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const rows = runValidation({ only });
  const sorted = [...rows].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(sorted)}\n`);
  } else {
    for (const r of sorted)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(40)} ${JSON.stringify(r.measured).slice(0, 400)}`
      );
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported, ${count('not-run')} not run`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.agn-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.agn-failed-legs/1',
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
