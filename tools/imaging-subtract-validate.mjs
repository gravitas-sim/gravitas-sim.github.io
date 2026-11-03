#!/usr/bin/env node
// =============================================================================
// Reference-star subtraction and the orbit of an imaged planet against their committed
// thresholds (Prompt 230 Part B, IMAGING_SUBTRACTION_GATE.md)
// -----------------------------------------------------------------------------
//   npm run imaging-subtract:validate                    print the table
//   npm run imaging-subtract:validate -- --json
//   npm run imaging-subtract:validate -- --write-results rewrite results.json and failed-legs.json
//   npm run imaging-subtract:validate -- --only A,T      run the rows whose id starts with one of these
//   npm run imaging-subtract:validate -- --dev           the development stream (never read against a bound)
//   npm run imaging-subtract:validate -- --write-oracle-inputs
//
// tests/fixtures/imaging-subtraction/thresholds.json fixed every bound before the module
// existed; this reads the bounds from it. The B rows read oracle-results.json (numpy, scipy,
// no Gravitas code). A crossed bound is a failed row, left failing.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { stream } from '../js/random/streams.js';
import {
  DESIGN,
  NOT_MEASURABLE,
  detect,
  expectedMap,
  expectedSnr,
  fitPlanet,
  injectPlanet,
  localNoise,
  measureAt,
  referenceMismatch,
  findPlanet,
  sceneFrame,
  subtract,
} from '../js/kernels/imaging/subtract.js';
import {
  degeneracyMap,
  measureEpoch,
  seriesOf,
} from '../js/kernels/imaging/orbit.js';
import { CRITERION, fitOrbit } from '../js/measure/orbit-fit.js';
import { truePositions } from './orbit-fit-synth.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/imaging-subtraction';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const args = process.argv.slice(2);
const DEV = args.includes('--dev');
const SEED = DEV ? THRESHOLDS.seeds.development : THRESHOLDS.seeds.ensemble;
const only = (() => {
  const i = args.indexOf('--only');
  return i < 0 ? null : args[i + 1].split(',');
})();
const want = id => !only || only.some(p => id.startsWith(p));

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const report = (id, measured, note = '') =>
  rows.push({ id, status: 'report', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });

const D = DESIGN;
const C = D.detector.width / 2;
const FWHM = D.fwhm;
const F_STAR = D.starRate * D.exposure;
const contrastFlux = c => c * F_STAR;
const quant = (a, q) => {
  const s = Array.from(a).sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};
const median = a => quant(a, 0.5);

/** A target and reference pair of the committed scene. */
function pair(leg, cell, trial, o = {}) {
  const draw = stream('injection', SEED, leg, cell, trial);
  const mm = referenceMismatch(draw, {
    matched: o.matched,
    eps: o.eps,
    rateFactor: o.rateFactor,
  });
  const size = o.size ?? D.detector.width;
  const c = size / 2;
  const key = `${SEED}:${leg}:${cell}:${trial}`;
  let target = sceneFrame({ seed: key, label: 'target', size });
  let planet = null;
  if (o.sep !== undefined) {
    const phi = draw() * 2 * Math.PI;
    planet = {
      x: c + o.sep * FWHM * Math.cos(phi),
      y: c + o.sep * FWHM * Math.sin(phi),
      flux: o.flux,
    };
    target = injectPlanet(target, planet, SEED, [leg, cell, trial, 'inj']);
  }
  const reference = sceneFrame({
    seed: key,
    label: 'reference',
    size,
    fwhm: FWHM * (1 + mm.eps),
    starRate: D.starRate * mm.rateFactor,
    star: { x: c + mm.dx, y: c + mm.dy },
  });
  return { target, reference, planet, mm, draw };
}

// ---- noise-free frames -------------------------------------------------------------

function cleanFrame(w, h, star, planet) {
  const m = expectedMap(w, h, w / 2, h / 2, star.flux, { reach: 30 });
  const counts = new Float64Array(w * h);
  const P = planet
    ? expectedMap(w, h, planet.x, planet.y, planet.flux, { reach: 30 })
    : null;
  for (let i = 0; i < w * h; i++)
    counts[i] =
      D.detector.biasLevel +
      (m[i] + (P ? P[i] : 0) + D.sky * D.exposure) / D.detector.gain;
  return { width: w, height: h, counts, planetMap: P };
}

function legA() {
  const w = 64;
  if (want('A1')) {
    let worstK = 0;
    let worstRes = 0;
    for (const c of [0.37, 1, 2.9]) {
      const T = cleanFrame(w, w, { flux: F_STAR });
      const R = cleanFrame(w, w, { flux: F_STAR * c });
      const red = subtract(T, R, { fullWell: 1e9 });
      worstK = Math.max(worstK, Math.abs(red.k * c - 1));
      let peak = 0;
      for (let i = 0; i < red.target.length; i++)
        peak = Math.max(peak, red.target[i]);
      let res = 0;
      for (let i = 0; i < red.residual.length; i++)
        res = Math.max(res, Math.abs(red.residual[i]));
      worstRes = Math.max(worstRes, res / peak);
    }
    const L = lim('A1');
    row('A1', worstK <= L.maxRelErrK && worstRes <= L.maxAbsResidualOverPeak, {
      relErrK: worstK,
      residualOverPeak: worstRes,
    });
  }
  if (want('A2')) {
    const L = lim('A2');
    let worstTp = 0;
    let worstFlux = 0;
    let worstPos = 0;
    const cells = [];
    for (const sep of [2, 2.5, 3, 5, 8]) {
      const planet = {
        x: C + sep * FWHM * 0.8,
        y: C + sep * FWHM * 0.6,
        flux: 1000,
      };
      const T0 = cleanFrame(w, w, { flux: F_STAR });
      const T1 = cleanFrame(w, w, { flux: F_STAR }, planet);
      const Rf = cleanFrame(w, w, { flux: F_STAR });
      const r0 = subtract(T0, Rf);
      const r1 = subtract(T1, Rf);
      const rap = (1.5 * FWHM) ** 2;
      let sumP = 0;
      let sumR = 0;
      let nAp = 0;
      let measured = 0;
      const dS = r1.sky.target - r0.sky.target;
      let numK = 0;
      let denK = 0;
      for (let y = 0; y < w; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if ((x - planet.x) ** 2 + (y - planet.y) ** 2 <= rap) {
            sumP += T1.planetMap[i];
            sumR += r1.reference[i];
            nAp++;
            measured += r1.residual[i] - r0.residual[i];
          }
          if ((x - C) ** 2 + (y - C) ** 2 <= (D.fitFwhm * FWHM) ** 2) {
            numK += (T1.planetMap[i] - dS) * r1.reference[i];
            denK += r1.reference[i] ** 2;
          }
        }
      const dk = numK / denK;
      const closed = (sumP - dS * nAp - dk * sumR) / sumP;
      const tp = measured / sumP;
      // the fit on the noise-free residual
      const fit = fitPlanet(
        r1,
        { x: planet.x + 0.3, y: planet.y - 0.2, flux: 700 },
        1
      );
      const fluxErr = Math.abs(fit.flux / planet.flux - 1);
      const posErr = Math.hypot(fit.x - planet.x, fit.y - planet.y);
      if (sep < D.workingFwhm) {
        // inside the working radius (AM4): reported, not judged
        cells.push({
          sepFwhm: sep,
          insideWorkingRadius: true,
          throughput: tp,
          closedForm: closed,
          relFluxError: fluxErr,
          positionErrorPx: posErr,
        });
        continue;
      }
      worstTp = Math.max(worstTp, Math.abs(tp - closed));
      worstFlux = Math.max(worstFlux, fluxErr);
      worstPos = Math.max(worstPos, posErr);
      cells.push({
        sepFwhm: sep,
        throughput: tp,
        closedForm: closed,
        relFluxError: fluxErr,
        positionErrorPx: posErr,
      });
    }
    row(
      'A2',
      worstTp <= L.maxAbsErrThroughputVsClosedForm &&
        worstFlux <= L.maxRelErrFluxFitNoiseFree &&
        worstPos <= L.maxPosErrPxNoiseFree,
      {
        maxThroughputError: worstTp,
        maxRelFluxError: worstFlux,
        maxPositionErrorPx: worstPos,
        cells,
      }
    );
  }
  if (want('A3') || want('N1')) {
    const sig2 = D.sky * D.exposure + D.detector.readNoise ** 2;
    let num = 0;
    let den = 0;
    const rob = [];
    const n = lim('A3').pairs;
    for (let t = 0; t < n; t++) {
      const { target, reference } = pair('A3', 0, t, { matched: true });
      const red = subtract(target, reference);
      const vals = [];
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++)
          if (Math.hypot(x - C, y - C) >= 12) {
            const v = red.residual[y * 64 + x];
            num += v * v;
            vals.push(v);
          }
      den += vals.length * sig2 * (1 + red.k * red.k);
      const m = median(vals);
      const mad = median(vals.map(v => Math.abs(v - m)));
      rob.push((1.4826 * mad) / Math.sqrt(sig2 * (1 + red.k * red.k)));
    }
    const ratio = num / den;
    const L3 = lim('A3');
    if (want('A3'))
      row('A3', ratio >= L3.ratioLow && ratio <= L3.ratioHigh, {
        varianceRatio: ratio,
        pairs: n,
      });
    if (want('N1')) {
      const L1 = lim('N1');
      const m = rob.reduce((s, v) => s + v, 0) / rob.length;
      row('N1', m >= L1.ratioLow && m <= L1.ratioHigh, {
        robustRmsRatio: m,
        pairs: n,
      });
    }
  }
}

// ---- the oracle --------------------------------------------------------------------

const ORACLE_INPUTS = 'tools/imaging-subtract-oracle/inputs.json';
const CROP = 40;
const crop = (frame, x0, y0) => {
  const out = new Array(CROP * CROP);
  for (let y = 0; y < CROP; y++)
    for (let x = 0; x < CROP; x++)
      out[y * CROP + x] = Math.round(
        frame.counts[(y0 + y) * frame.width + x0 + x]
      );
  return out;
};
function oracleInputs() {
  const cases = [];
  for (let t = 0; t < 8; t++) {
    const sep = 3 + 1.5 * ((t * 0.37) % 1);
    const { target, reference, planet } = pair('B', 0, t, {
      sep,
      flux: contrastFlux(1e-2),
    });
    const x0 = 12;
    cases.push({
      id: `B${t}`,
      width: CROP,
      height: CROP,
      gain: D.detector.gain,
      bias: D.detector.biasLevel,
      fwhm: FWHM,
      beta: D.beta,
      target: crop(target, x0, x0),
      reference: crop(reference, x0, x0),
      truth: { x: planet.x - x0, y: planet.y - x0, flux: planet.flux },
      start: {
        x: planet.x - x0 + 0.3,
        y: planet.y - x0 - 0.2,
        flux: 0.8 * planet.flux,
      },
    });
  }
  return {
    format: 'gravitas.imaging-subtract-oracle-inputs/1',
    seed: SEED,
    cases,
  };
}

function legB() {
  const L = ['B1', 'B2', 'B3', 'B4'].map(lim);
  let inputs;
  let ora;
  try {
    inputs = read(ORACLE_INPUTS);
    ora = read(`${FIX}/oracle-results.json`);
  } catch {
    for (const id of ['B1', 'B2', 'B3', 'B4'])
      if (want(id)) notRun(id, 'the oracle inputs or results are not pinned');
    return;
  }
  let wk = 0;
  let wr = 0;
  let wf = 0;
  let ws = 0;
  for (const c of inputs.cases) {
    const o = ora.cases.find(q => q.id === c.id);
    const red = subtract(
      { width: c.width, height: c.height, counts: c.target },
      { width: c.width, height: c.height, counts: c.reference },
      { fwhm: c.fwhm, beta: c.beta }
    );
    wk = Math.max(wk, Math.abs(red.k - o.k) / Math.abs(o.k));
    for (let i = 0; i < o.residual.length; i++)
      wr = Math.max(wr, Math.abs(red.residual[i] - o.residual[i]));
    const m = measureAt(red, c.start.x, c.start.y, { flux: c.start.flux });
    wf = Math.max(
      wf,
      Math.abs(m.x - o.fit.x) / o.sigma.x,
      Math.abs(m.y - o.fit.y) / o.sigma.y,
      Math.abs(m.flux - o.fit.flux) / o.sigma.flux
    );
    ws = Math.max(
      ws,
      Math.abs(m.sigmaX - o.sigma.x) / o.sigma.x,
      Math.abs(m.sigmaY - o.sigma.y) / o.sigma.y,
      Math.abs(m.sigmaFlux - o.sigma.flux) / o.sigma.flux
    );
  }
  if (want('B1'))
    row('B1', wk <= L[0].maxRelErr, {
      maxRelErr: wk,
      pairs: inputs.cases.length,
    });
  if (want('B2')) row('B2', wr <= L[1].maxAbsErr, { maxAbsErr: wr });
  if (want('B3')) row('B3', wf <= L[2].maxSigma, { maxSigma: wf });
  if (want('B4')) row('B4', ws <= L[3].maxRelErr, { maxRelErr: ws });
}

// ---- injection legs ----------------------------------------------------------------

const T1_CELLS = [3, 5, 8].flatMap(s =>
  [3e-3, 1e-2, 3e-2].map(c => ({ sep: s, c }))
);
const T2_CELLS = [2.5].flatMap(s => [1e-2, 3e-2].map(c => ({ sep: s, c })));

function injectCell(leg, ci, cell, n, flux = contrastFlux(cell.c)) {
  const out = [];
  for (let t = 0; t < n; t++) {
    const { target, reference, planet } = pair(leg, ci, t, {
      sep: cell.sep,
      flux,
    });
    const r = findPlanet(target, reference);
    const hit =
      r.ok && r.detected && Math.hypot(r.x - planet.x, r.y - planet.y) <= 2;
    out.push({ hit, planet, r: hit ? r : null });
  }
  return out;
}

const pool = [];
function legT() {
  if (want('T1') || want('C')) {
    const L = lim('T1');
    const cells = [];
    let pass = true;
    T1_CELLS.forEach((cell, ci) => {
      const res = injectCell('T1', ci, cell, L.trialsPerCell);
      const hits = res.filter(q => q.hit);
      const ratios = hits.map(q => q.r.flux / q.planet.flux);
      const med = ratios.length ? median(ratios) : NaN;
      for (const q of hits) pool.push(q);
      if (!(med >= L.medianLow && med <= L.medianHigh)) pass = false;
      cells.push({
        sepFwhm: cell.sep,
        contrast: cell.c,
        detected: hits.length / res.length,
        median: med,
        p16: ratios.length ? quant(ratios, 0.16) : NaN,
        p84: ratios.length ? quant(ratios, 0.84) : NaN,
      });
    });
    if (want('T1')) row('T1', pass, { cells });
  }
  if (want('T2') || want('C')) {
    const L = lim('T2');
    const cells = [];
    let pass = true;
    T2_CELLS.forEach((cell, ci) => {
      const res = injectCell('T2', ci, cell, L.trialsPerCell);
      const hits = res.filter(q => q.hit);
      const ratios = hits.map(q => q.r.flux / q.planet.flux);
      const med = ratios.length ? median(ratios) : NaN;
      for (const q of hits) pool.push(q);
      if (!(med >= L.medianLow && med <= L.medianHigh)) pass = false;
      cells.push({
        sepFwhm: cell.sep,
        contrast: cell.c,
        detected: hits.length / res.length,
        median: med,
      });
    });
    if (want('T2')) row('T2', pass, { cells });
  }
  if (want('T3')) {
    const cells = [];
    [1, 1.5, 2].forEach((sep, si) =>
      [3e-3, 1e-2, 3e-2, 1e-1].forEach((c, ci) => {
        const ratios = [];
        for (let t = 0; t < 200; t++) {
          const { target, reference, planet } = pair('T3', si * 4 + ci, t, {
            sep,
            flux: contrastFlux(c),
          });
          const red = subtract(target, reference);
          if (!red.ok) continue;
          const noise = localNoise(red, planet.x, planet.y);
          const m = measureAt(red, planet.x, planet.y, { rMin: 0, noise });
          if (m.ok) ratios.push(m.flux / planet.flux);
        }
        cells.push({
          sepFwhm: sep,
          contrast: c,
          n: ratios.length,
          median: ratios.length ? median(ratios) : NaN,
          p16: ratios.length ? quant(ratios, 0.16) : NaN,
          p84: ratios.length ? quant(ratios, 0.84) : NaN,
        });
      })
    );
    report(
      'T3',
      { cells },
      'forced inside the working radius, started at the truth: what a user would get by overriding the refusal'
    );
  }
  if (want('C') && pool.length) {
    const cov = k => {
      const out = {};
      for (const [name, f] of [
        ['flux', q => [q.r.flux - q.planet.flux, q.r.sigmaFlux]],
        ['x', q => [q.r.x - q.planet.x, q.r.sigmaX]],
        ['y', q => [q.r.y - q.planet.y, q.r.sigmaY]],
      ]) {
        let n = 0;
        for (const q of pool) {
          const [e, s] = f(q);
          if (Math.abs(e) <= k * s) n++;
        }
        out[name] = n / pool.length;
      }
      return out;
    };
    const c68 = cov(1);
    const c95 = cov(1.96);
    const L1 = lim('C1');
    const L2 = lim('C2');
    row(
      'C1',
      Object.values(c68).every(v => v >= L1.low68 && v <= L1.high68),
      { ...c68, injections: pool.length }
    );
    row(
      'C2',
      Object.values(c95).every(v => v >= L2.low95 && v <= L2.high95),
      { ...c95, injections: pool.length }
    );
  }
}

function legN2() {
  if (!want('N2')) return;
  const L = lim('N2');
  const out = [];
  let pass = true;
  L.separationsFwhm.forEach((sep, si) => {
    const sig = [];
    for (let t = 0; t < 100; t++) {
      const { target, reference, draw } = pair('N2cal', si, t, {});
      const red = subtract(target, reference);
      const phi = draw() * 2 * Math.PI;
      sig.push(
        localNoise(
          red,
          C + sep * FWHM * Math.cos(phi),
          C + sep * FWHM * Math.sin(phi)
        )
      );
    }
    const noise = sig.reduce((s, v) => s + v, 0) / sig.length;
    const flux5 = (5 * noise) / expectedSnr(1, 1);
    const res = injectCell('N2', si, { sep }, L.trialsPerSeparation, flux5);
    const rate = res.filter(q => q.hit).length / res.length;
    if (!(rate >= L.rateLow && rate <= L.rateHigh)) pass = false;
    out.push({
      sepFwhm: sep,
      noise,
      flux5Sigma: flux5,
      contrast5Sigma: flux5 / F_STAR,
      rate,
    });
  });
  row('N2', pass, { separations: out });
}

// ---- refusals ----------------------------------------------------------------------

function legD() {
  if (want('D1')) {
    let ok = 0;
    const n = lim('D1').cases;
    for (let t = 0; t < n; t++) {
      const draw0 = stream('injection', SEED, 'D1sep', t);
      const sep = 0.5 + draw0() * 1.99;
      const { target, reference, planet } = pair('D1', 0, t, {
        sep,
        flux: contrastFlux(1e-1),
      });
      const red = subtract(target, reference);
      const m = red.ok ? measureAt(red, planet.x, planet.y) : red;
      if (
        !m.ok &&
        m.code === 'inside-working-region' &&
        m.message === NOT_MEASURABLE
      )
        ok++;
    }
    row('D1', ok / n >= lim('D1').rate, { rate: ok / n, cases: n });
  }
  if (want('D2')) {
    const n = lim('D2').cases;
    let refused = 0;
    let accepted = 0;
    for (let t = 0; t < n; t++) {
      const bad = pair('D2bad', 0, t, {
        eps: t % 2 ? 0.2 : -0.2,
        rateFactor: 0.6,
      });
      const r = subtract(bad.target, bad.reference);
      if (!r.ok && r.code === 'reference-mismatch') refused++;
      const nom = pair('D2ok', 0, t, {});
      if (subtract(nom.target, nom.reference).ok) accepted++;
    }
    const L = lim('D2');
    row('D2', refused / n >= L.refuseRate && accepted / n >= L.acceptRate, {
      refuseRate: refused / n,
      acceptRate: accepted / n,
      cases: n,
    });
  }
  if (want('D3')) {
    let ok = 0;
    for (let t = 0; t < 50; t++) {
      const { target, reference } = pair('D3', 0, t, {});
      const small = sceneFrame({
        seed: `${SEED}:D3:s:${t}`,
        label: 'small',
        size: 48,
      });
      const nan = { ...reference, counts: Float64Array.from(reference.counts) };
      nan.counts[100] = NaN;
      if (subtract(target, undefined).code === 'no-reference') ok++;
      if (subtract(target, small).code === 'size-mismatch') ok++;
      if (subtract(target, nan).code === 'non-finite') ok++;
      if (
        subtract(target, reference, { fwhm: t % 2 ? -1 : NaN }).code ===
        'bad-psf'
      )
        ok++;
    }
    row('D3', ok / 200 >= lim('D3').rate, { rate: ok / 200, cases: 200 });
  }
  if (want('D4')) {
    let n = 0;
    const N = lim('D4').cases;
    for (let t = 0; t < N; t++) {
      const { target, reference } = pair('D4', 0, t, {});
      const red = subtract(target, reference);
      if (red.ok && detect(red).detected) n++;
    }
    row('D4', n / N <= lim('D4').maxRate, { falseAlarmRate: n / N, cases: N });
  }
  if (want('D5')) {
    let ok = 0;
    for (let t = 0; t < 50; t++) {
      const { target, reference } = pair('D5', 0, t, {});
      const sat = { ...reference, counts: Float64Array.from(reference.counts) };
      sat.counts[C * 64 + C] =
        D.detector.biasLevel + (0.95 * D.detector.fullWell) / D.detector.gain;
      if (subtract(target, sat).code === 'saturated') ok++;
    }
    row('D5', ok / 50 >= lim('D5').rate, { rate: ok / 50 });
  }
}

// ---- the orbit ---------------------------------------------------------------------

const ARCS = [0.1, 0.3, 0.6, 1.1];
const orbitTrials = [];

function truthOrbit(draw, circular) {
  return {
    a: 1,
    P: 10,
    e: circular ? 0 : 0.1 + 0.5 * draw(),
    i: (Math.acos(-0.85 + 1.7 * draw()) * 180) / Math.PI,
    Omega: 360 * draw(),
    omega: 360 * draw(),
    T: -10 * draw(),
  };
}

function runOrbit() {
  const N = lim('O1').trials;
  for (const f of ARCS) {
    for (let t = 0; t < N; t++) {
      const draw = stream('injection', SEED, 'orbit', String(f), t);
      const truth = truthOrbit(draw, t % 2 === 0);
      const span = f * truth.P;
      const dt = span / 11;
      const years = [];
      for (let i = 0; i < 12; i++) {
        const jit = i === 0 || i === 11 ? 0 : (2 * draw() - 1) * 0.3 * dt;
        years.push(2000 + i * dt + jit);
      }
      const pos = truePositions({ ...truth, T: 2000 + truth.T }, years);
      const epochs = years.map((year, i) => ({
        year,
        ...measureEpoch({
          seed: SEED,
          label: ['orbit', String(f), t, i],
          truth: pos[i],
        }),
      }));
      const series = seriesOf(epochs);
      const kept = series.epochs.length;
      const fit = fitOrbit(series, { depth: 'elliptical' });
      orbitTrials.push({ f, t, truth, epochs, kept, fit, series });
    }
  }
}

function legO() {
  if (!orbitTrials.length) runOrbit();
  const N = lim('O1').trials;
  const byArc = f => orbitTrials.filter(q => q.f === f);
  const refuse = f => byArc(f).filter(q => !q.fit.ok).length / N;
  const accept = f => byArc(f).filter(q => q.fit.ok).length / N;
  const codes = f => {
    const o = {};
    for (const q of byArc(f)) {
      const k = q.fit.ok ? 'accepted' : q.fit.code;
      o[k] = (o[k] ?? 0) + 1;
    }
    return o;
  };
  const lost = f => byArc(f).reduce((s, q) => s + (12 - q.kept), 0) / N;
  if (want('O1'))
    row(
      'O1',
      refuse(0.1) >= lim('O1').refuse10 && refuse(0.3) >= lim('O1').refuse30,
      {
        refuse10: refuse(0.1),
        refuse30: refuse(0.3),
        codes10: codes(0.1),
        codes30: codes(0.3),
        meanLostEpochs: { 0.1: lost(0.1), 0.3: lost(0.3) },
      }
    );
  if (want('O2'))
    row('O2', accept(1.1) >= lim('O2').accept110, {
      accept110: accept(1.1),
      accept60: accept(0.6),
      codes60: codes(0.6),
      codes110: codes(1.1),
      meanLostEpochs110: lost(1.1),
    });
  if (want('O3')) {
    const L = lim('O3');
    const out = {};
    let pass = true;
    for (const f of [0.6, 1.1]) {
      const acc = byArc(f).filter(q => q.fit.ok);
      if (acc.length < L.minAccepted) {
        out[f] = {
          accepted: acc.length,
          note: 'fewer than the minimum: recorded, passes',
        };
        continue;
      }
      const cov = {};
      const inside = (lo, hi, v) => v >= lo && v <= hi;
      const sets = {
        P68: q => inside(...q.fit.elements.P.interval68, 10),
        P95: q =>
          q.fit.elements.P.interval95 &&
          inside(...q.fit.elements.P.interval95, 10),
        a68: q =>
          Math.abs(q.fit.elements.a.value - 1) <= q.fit.elements.a.sigma,
        a95: q =>
          Math.abs(q.fit.elements.a.value - 1) <= 1.96 * q.fit.elements.a.sigma,
      };
      for (const [k, fn] of Object.entries(sets))
        cov[k] = acc.filter(q => fn(q)).length / acc.length;
      for (const k of ['P68', 'a68'])
        if (!(cov[k] >= L.low68 && cov[k] <= L.high68)) pass = false;
      for (const k of ['P95', 'a95'])
        if (!(cov[k] >= L.low95 && cov[k] <= L.high95)) pass = false;
      out[f] = { accepted: acc.length, ...cov };
    }
    row('O3', pass, out);
  }
  if (want('O4')) {
    let bad = 0;
    let n = 0;
    for (const q of orbitTrials)
      if (q.fit.ok) {
        n++;
        const c = q.fit.criterion;
        const depth = q.fit.depth;
        if (!(
          q.fit.epochs >= CRITERION.minEpochs[depth] &&
          c.coverageLower >= CRITERION.coverageFraction[depth] &&
          c.condition <= CRITERION.maxConditionNumber
        ))
          bad++;
      }
    row('O4', bad === 0, { accepted: n, belowCriterion: bad });
  }
  if (want('O5')) {
    const acc = byArc(1.1)
      .filter(q => q.fit.ok)
      .slice(0, lim('O5').trials);
    let inside = 0;
    for (const q of acc) {
      const s = mapInput(q.series);
      const map = degeneracyMap(s);
      const [lo, hi] = map.periodRange(2.3);
      const step = 10 ** (1 / map.perDecade);
      const P = q.fit.elements.P.value;
      if (P >= lo / step && P <= hi * step) inside++;
    }
    row('O5', inside / acc.length >= lim('O5').inside68, {
      inside: inside / acc.length,
      trials: acc.length,
    });
  }
  if (want('O6')) {
    const all = byArc(0.3)
      .filter(q => q.kept >= 8)
      .slice(0, lim('O6').trials);
    let wide = 0;
    const factors = [];
    for (const q of all) {
      const map = degeneracyMap(mapInput(q.series));
      const [lo, hi] = map.periodRange(5.99);
      factors.push(hi / lo);
      if (hi / lo >= lim('O6').spanFactor) wide++;
    }
    row('O6', wide / all.length >= lim('O6').share, {
      share: wide / all.length,
      trials: all.length,
      medianSpanFactor: median(factors),
    });
  }
  report(
    'O7',
    {
      arcs: Object.fromEntries(
        ARCS.map(f => [
          f,
          {
            accepted: accept(f),
            refused: refuse(f),
            codes: codes(f),
            meanLostEpochs: lost(f),
          },
        ])
      ),
    },
    'every arc: the acceptance, the refusal codes and the epochs the pipeline lost'
  );
}

function mapInput(series) {
  return {
    years: series.epochs.map(e => e.time.value),
    x: series.epochs.map(e => e.x),
    y: series.epochs.map(e => e.y),
    sx: series.epochs.map(e => e.sx),
    sy: series.epochs.map(e => e.sy),
  };
}

// ---- main --------------------------------------------------------------------------

if (args.includes('--write-oracle-inputs')) {
  writeFileSync(path.join(ROOT, ORACLE_INPUTS), JSON.stringify(oracleInputs()));
  console.log(`wrote ${ORACLE_INPUTS}`);
  process.exit(0);
}

/** The committed verdict function: A when every core and orbit leg passed, B when only an orbit leg failed, C when a core leg failed. */
export function verdictOf(list) {
  const st = id => list.find(r => r.id === id)?.status;
  const pass = ids => ids.every(i => st(i) === 'pass');
  return pass(THRESHOLDS.verdict.core)
    ? pass(THRESHOLDS.verdict.orbit)
      ? 'A'
      : 'B'
    : 'C';
}

const t0 = Date.now();
legA();
legB();
legT();
legN2();
legD();
if (!only || only.some(p => p.startsWith('O'))) legO();
notRun(
  'E1',
  'no authentic reference-star pair or published astrometry was supplied; nothing was fetched'
);
rows.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else
  for (const r of rows)
    console.log(
      `${r.id.padEnd(4)} ${r.status.padEnd(7)} ${JSON.stringify(r.measured)}${r.note ? ` (${r.note})` : ''}`
    );
if (!only) console.log(`verdict ${verdictOf(rows)}`);
console.log(`seconds ${((Date.now() - t0) / 1000).toFixed(0)} stream ${SEED}`);

if (args.includes('--write-results')) {
  const failed = rows
    .filter(r => r.status === 'fail')
    .map(r => ({
      id: r.id,
      label: 'failed leg, kept failing',
      measured: r.measured,
    }));
  writeFileSync(
    path.join(ROOT, FIX, 'results.json'),
    JSON.stringify(
      {
        format: 'gravitas.imaging-subtraction-results/1',
        stream: SEED,
        node: process.version,
        verdict: verdictOf(rows),
        rows,
      },
      null,
      1
    ) + '\n'
  );
  writeFileSync(
    path.join(ROOT, FIX, 'failed-legs.json'),
    JSON.stringify(
      { format: 'gravitas.imaging-subtraction-failed-legs/1', failed },
      null,
      1
    ) + '\n'
  );
}
process.exit(rows.some(r => r.status === 'fail') ? 1 : 0);
