#!/usr/bin/env node
// =============================================================================
// Photometry against its committed thresholds (Prompt 180)
// -----------------------------------------------------------------------------
//   npm run photometry:validate              print the table
//   npm run photometry:validate -- --json    print it as JSON
//
// tests/fixtures/photometry/thresholds.json fixed every bound before
// js/measure/photometry.js existed (PHOTOMETRY.md, "The validation contract").
// This runs the checks against the production modules and judges them against
// those bounds, read from the file and not copied. tests/photometry.test.js runs
// it in plain Node (Jest's VM makes Math and Float64Array reads about ten times
// slower, so an ensemble there would time the harness) and asserts every row.
//
// The ensembles are the detector kernel's frames (js/kernels/detector/frame.js,
// a clean detector) with their truth; the oracle's rows read the frames and the
// photutils results pinned in tests/fixtures/photometry/. Nothing here stores a
// value that passes through exp, log or a trigonometric function: bands, counts
// and tolerances are judged (Node 20, 22 and 24 differ in the last bits).
// Check e2.authentic is reported as not run: it needs Prompt 189's frame.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { mulberry32 } from '../js/rng.js';
import { permits, validateImage } from '../js/dataKinds/contract.js';
import {
  adapt,
  apertureFor,
  centroid,
  curveOfGrowth,
  exactWeights,
  measure,
  measureBatch,
  planeBackground,
} from '../js/measure/photometry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/photometry');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
// Legs that fail as committed, recorded with their cause (failed-legs.json).
const RECORDED = read('failed-legs.json').legs;
const S = THRESHOLDS.scene;
const C = THRESHOLDS.checks;
const SIGMA_PSF = S.detector.fwhm / (2 * Math.sqrt(2 * Math.LN2));
const AP = apertureFor(S.detector.fwhm);
const EE = r => 1 - Math.exp(-(r * r) / (2 * SIGMA_PSF * SIGMA_PSF));
const check = permits;

/** The sidecar of a synthetic frame: the contract the thresholds name. */
export function sidecar(over = {}, pixels = {}) {
  const c = S.contract;
  return {
    format: 'gravitas.image',
    formatVersion: 1,
    id: 'photometry-180-synthetic',
    use: 'quantitative',
    width: over.width ?? S.detector.width,
    height: over.height ?? S.detector.height,
    planes: { data: { encoding: 'float64-le' } },
    pixels: {
      unit: c.unit,
      linearity: {
        status: 'linear',
        limit: c.linearLimitAdu,
        source: 'the forward model has no nonlinearity below full well',
      },
      saturation: {
        level: c.saturationAdu,
        source: 'full well over the gain',
      },
      gain: { value: c.gain, unit: 'electron/adu', source: 'header' },
      readNoise: { value: c.readNoise, unit: 'electron', source: 'header' },
      ...pixels,
    },
    time: {
      value: '2026-01-01T00:00:00Z',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: S.exposure, kind: 'effective' },
    calibration: { state: c.calibration },
    history: [],
    source: {
      kind: 'synthetic',
      model: {
        name: 'detector-kernel frame (js/kernels/detector/frame.js)',
        parameters: S.detector,
      },
    },
    ...over,
  };
}

/** A synthetic frame in bias-subtracted ADU, and its truth manifest. */
export function syntheticFrame({
  seed,
  sources = [],
  detector = {},
  sky = S.skyRate,
  plane = null,
  mask = null,
}) {
  const d = { ...S.detector, ...detector };
  const f = simulateFrame({
    seed,
    exposure: S.exposure,
    detector: d,
    scene: { sky, sources },
  });
  const W = f.width;
  const data = Float64Array.from(f.values, v => v - d.biasLevel);
  if (plane)
    for (let j = 0; j < f.height; j++)
      for (let i = 0; i < W; i++)
        data[j * W + i] += plane.x * (i - 31.5) + plane.y * (j - 31.5);
  return {
    id: seed,
    width: W,
    height: f.height,
    data,
    mask,
    sidecar: sidecar({ width: W, height: f.height }),
    truth: { detector: d, sources, sky, plane },
  };
}

const rows = [];
const add = (id, measured, ok, extra = {}) =>
  rows.push({ id, measured, pass: Boolean(ok), ...extra });
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const rms = a => Math.sqrt(mean(a.map(v => v * v)));
const frac = (a, k) => a.filter(v => Math.abs(v) <= k).length / a.length;
const rand = (seed, n = 0) => mulberry32(seed + n);
const here = (u, [lo, hi]) => lo + u * (hi - lo);
const disc = (u, r) => {
  const t = 2 * Math.PI * u();
  const q = r * Math.sqrt(u());
  return [q * Math.cos(t), q * Math.sin(t)];
};
const aperture = { ...AP, weighting: 'exact' };

// ---- (a) and (c): the ensemble --------------------------------------------------

function ensemble() {
  for (const [level, F] of Object.entries(S.levels)) {
    const u = rand(180_000, F);
    const z = [];
    const ex = [];
    const ey = [];
    const zx = [];
    const zy = [];
    for (let k = 0; k < S.trials; k++) {
      const x = here(u(), S.positionRange);
      const y = here(u(), S.positionRange);
      const f = syntheticFrame({
        seed: `${S.seedPrefix}-${level}-${k}`,
        sources: [{ x, y, rate: F / S.exposure }],
      });
      const a = adapt(f, check);
      const m = measure(a, { ...aperture, x, y });
      z.push((m.net - F * EE(AP.r)) / m.sigma);
      const [dx, dy] = disc(u, 1.5);
      const c = measure(a, {
        ...aperture,
        x: x + dx,
        y: y + dy,
        recentre: { half: AP.half, sigmaW: AP.sigmaW },
      });
      if (c.ok) {
        ex.push(c.centroid.x - x);
        ey.push(c.centroid.y - y);
        zx.push((c.centroid.x - x) / c.centroid.sigmaX);
        zy.push((c.centroid.y - y) / c.centroid.sigmaY);
      }
    }
    const pooled = [...zx, ...zy];
    add(
      `a1.fluxBias.${level}`,
      mean(z),
      Math.abs(mean(z)) <= C['a1.fluxBias'].bound,
      {
        bound: C['a1.fluxBias'].bound,
      }
    );
    add(`a1.fluxRms.${level}`, rms(z), within(rms(z), C['a1.fluxRms'].bounds), {
      bound: C['a1.fluxRms'].bounds,
    });
    add(
      `c1.coverage68.${level}`,
      frac(z, 1),
      within(frac(z, 1), C['c1.coverage68'].bounds),
      {
        bound: C['c1.coverage68'].bounds,
      }
    );
    add(
      `c1.coverage95.${level}`,
      frac(z, 1.96),
      within(frac(z, 1.96), C['c1.coverage95'].bounds),
      {
        bound: C['c1.coverage95'].bounds,
      }
    );
    const cb = C['a4.centroidBias'].bounds[level];
    add(
      `a4.centroidBias.${level}`,
      Math.max(Math.abs(mean(ex)), Math.abs(mean(ey))),
      Math.abs(mean(ex)) <= cb && Math.abs(mean(ey)) <= cb,
      {
        bound: cb,
        n: ex.length,
      }
    );
    add(
      `c2.centroidCoverage68.${level}`,
      frac(pooled, 1),
      within(frac(pooled, 1), C['c2.centroidCoverage68'].bounds),
      {
        bound: C['c2.centroidCoverage68'].bounds,
      }
    );
    add(
      `c2.centroidCoverage95.${level}`,
      frac(pooled, 1.96),
      within(frac(pooled, 1.96), C['c2.centroidCoverage95'].bounds),
      {
        bound: C['c2.centroidCoverage95'].bounds,
      }
    );
  }
}

// ---- (a2): the sky on a gradient -------------------------------------------------

function sky() {
  const plane = { x: 0.5, y: -0.3 };
  const skyAdu = (S.skyRate * S.exposure) / S.detector.gain;
  const truth = (x, y) =>
    S.detector.gain * (skyAdu + plane.x * (x - 31.5) + plane.y * (y - 31.5));
  const u = rand(181_000);
  const z = { annulus: [], plane: [], half: [] };
  for (let k = 0; k < C['a2.skyBiasGradient'].frames; k++) {
    const x = here(u(), S.positionRange);
    const y = here(u(), S.positionRange);
    const f = syntheticFrame({ seed: `${S.seedPrefix}-gradient-${k}`, plane });
    const a = adapt(f, check);
    for (const background of ['annulus', 'plane']) {
      const m = measure(a, { ...aperture, x, y, background });
      z[background].push((m.sky - truth(x, y)) / m.skySigma);
    }
    // Half the annulus masked: the pixels to the right of the star, outside it.
    const mask = new Uint8Array(f.width * f.height);
    for (let j = 0; j < f.height; j++)
      for (let i = 0; i < f.width; i++)
        if (i > x && Math.hypot(i - x, j - y) > AP.rIn)
          mask[j * f.width + i] = 1;
    const b = adapt({ ...f, mask }, check);
    const m = measure(b, { ...aperture, x, y, background: 'plane' });
    z.half.push((m.sky - truth(x, y)) / m.skySigma);
  }
  const bound = C['a2.skyBiasGradient'].bound;
  add(
    'a2.skyBiasGradient.annulus',
    mean(z.annulus),
    Math.abs(mean(z.annulus)) <= bound,
    { bound }
  );
  add(
    'a2.skyBiasGradient.plane',
    mean(z.plane),
    Math.abs(mean(z.plane)) <= bound,
    { bound }
  );
  add(
    'a2.skyBiasHalfMasked.plane',
    mean(z.half),
    Math.abs(mean(z.half)) <= C['a2.skyBiasHalfMasked'].bound,
    {
      bound: C['a2.skyBiasHalfMasked'].bound,
    }
  );
}

// ---- (a3): the curve of growth against the encircled energy ----------------------

function growth() {
  const F = 1e9;
  const radii = Array.from({ length: 12 }, (_, i) => (i + 1) * 0.5 * SIGMA_PSF);
  const u = rand(182_000);
  let worst = 0;
  let worstCenter = 0;
  for (let k = 0; k < 6; k++) {
    const x = here(u(), S.positionRange);
    const y = here(u(), S.positionRange);
    const f = syntheticFrame({
      seed: `${S.seedPrefix}-growth-${k}`,
      sources: [{ x, y, rate: F / S.exposure }],
      sky: 0,
      detector: { readNoise: 0, fullWell: 1e13, adcMax: 1e13 },
    });
    f.sidecar = sidecar(
      {},
      {
        linearity: { status: 'linear', limit: 1e12, source: 'no nonlinearity' },
        saturation: { level: 1e12, source: 'none reached' },
      }
    );
    const a = adapt(f, check);
    const s = { x, y, rIn: 8, rOut: 14 };
    const g = curveOfGrowth(a, s, radii);
    const c = curveOfGrowth(a, { ...s, weighting: 'center' }, radii);
    radii.forEach((r, i) => {
      worst = Math.max(worst, Math.abs(g.net[i] / F - EE(r)));
      worstCenter = Math.max(worstCenter, Math.abs(c.net[i] / F - EE(r)));
    });
  }
  add('a3.curveOfGrowth', worst, worst <= C['a3.curveOfGrowth'].bound, {
    bound: C['a3.curveOfGrowth'].bound,
    note: `centre-in-pixel weights, for comparison: ${worstCenter.toFixed(4)}`,
  });
}

// ---- (b): the oracle --------------------------------------------------------------

function oracle() {
  const inputs = read('oracle-inputs.json');
  const res = read('oracle-results.json');
  const { gain, readNoise } = inputs;
  const frames = {};
  for (const f of inputs.frames) {
    const adu = new Int16Array(
      Uint8Array.from(Buffer.from(f.adu, 'base64')).buffer
    );
    const e = Float64Array.from(adu, v => v * gain);
    frames[f.id] = {
      width: f.width,
      height: f.height,
      values: e,
      variance: Float64Array.from(
        e,
        v => Math.max(v, 0) + readNoise * readNoise
      ),
    };
  }
  // The oracle's frames are in electrons with a variance plane: the contract's
  // second noise route, so the whole public path (adapt, measure) is what runs.
  const side = sidecar(
    {
      planes: {
        data: { encoding: 'float64-le' },
        variance: {
          encoding: 'float64-le',
          unit: 'electron^2',
          source: 'max(e, 0) + readNoise^2',
        },
      },
    },
    { unit: 'electron', gain: undefined, readNoise: undefined }
  );
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
  const w = {
    exact: 0,
    center: 0,
    level: 0,
    scatter: 0,
    n: 0,
    plane: 0,
    planeSum: 0,
    vExact: 0,
    vCenter: 0,
  };
  for (const o of res.apertures) {
    const { x, y, r, rIn, rOut } = o.case;
    const img = frames[o.case.frame];
    const a = adapt({ ...img, data: img.values, sidecar: side }, check);
    const s = { x, y, r, rIn, rOut };
    const mc = measure(a, { ...s, weighting: 'center' });
    const me = measure(a, { ...s, weighting: 'exact' });
    w.exact = Math.max(w.exact, rel(me.net + me.area * me.sky, o.sum_exact));
    w.center = Math.max(w.center, rel(mc.net + mc.area * mc.sky, o.sum_center));
    w.vExact = Math.max(w.vExact, rel(me.sourceVariance, o.err_exact ** 2));
    w.vCenter = Math.max(w.vCenter, rel(mc.sourceVariance, o.err_center ** 2));
    w.level = Math.max(w.level, rel(mc.sky, o.annulus.level));
    w.scatter = Math.max(w.scatter, rel(mc.skyScatter, o.annulus.scatter));
    w.n = Math.max(w.n, Math.abs(mc.skyPixels - o.annulus.n));
    const wts = exactWeights(img.width, img.height, x, y, r);
    const pl = planeBackground(img, { x, y, rIn, rOut, weights: wts });
    const sky = o.annulus.level;
    w.plane = Math.max(
      w.plane,
      Math.abs(pl.intercept - o.plane.intercept) / sky,
      Math.abs(pl.slope[0] - o.plane.slope_x) / sky,
      Math.abs(pl.slope[1] - o.plane.slope_y) / sky
    );
    const area = wts.reduce((t, q) => t + q[1], 0);
    w.planeSum = Math.max(
      w.planeSum,
      Math.abs(pl.level * area - o.plane.sum_under_exact) /
        (sky * o.plane.area_exact)
    );
    if (pl.pixels !== o.plane.n) w.planeSum = Infinity;
  }
  const n = res.apertures.length;
  const T = k => C[k].bound ?? C[k].boundRelative;
  const put = (id, v, key) => add(id, v, v <= T(key), { bound: T(key), n });
  put('b1.apertureSumExact', w.exact, 'b1.apertureSumExact');
  put('b1.apertureSumCenter', w.center, 'b1.apertureSumCenter');
  put('b2.backgroundMean.level', w.level, 'b2.backgroundMean');
  put('b2.backgroundMean.scatter', w.scatter, 'b2.backgroundMean');
  add('b2.backgroundMean.pixels', w.n, w.n === 0, { bound: 0, n });
  put('b3.backgroundPlane.coefficients', w.plane, 'b3.backgroundPlane');
  put('b3.backgroundPlane.sumUnderAperture', w.planeSum, 'b3.backgroundPlane');
  put('b5.sourceVariance.exact', w.vExact, 'b5.sourceVariance');
  put('b5.sourceVariance.center', w.vCenter, 'b5.sourceVariance');
  let cf = 0;
  let cg = 0;
  let disagree = 0;
  for (const o of res.centroids) {
    const c = o.case;
    const img = frames[c.frame];
    const f = centroid(img, {
      x: c.x0,
      y: c.y0,
      half: c.half,
      sky: o.background,
    });
    const g = centroid(img, {
      x: c.x0,
      y: c.y0,
      half: c.half,
      sigmaW: c.sigmaW,
      sky: o.background,
    });
    cf = Math.max(cf, Math.hypot(f.x - o.flux.x, f.y - o.flux.y));
    cg = Math.max(cg, Math.hypot(g.x - o.gaussian.x, g.y - o.gaussian.y));
    // Where the oracle's own window loop did not settle, so does this one.
    if (Boolean(f.tie) === o.flux.settled) disagree++;
  }
  const B = C['b4.centroid'];
  const n4 = res.centroids.length;
  add('b4.centroid.flux', cf, cf <= B.boundPixelsFlux, {
    bound: B.boundPixelsFlux,
    n: n4,
  });
  add('b4.centroid.gaussian', cg, cg <= B.boundPixelsGaussian, {
    bound: B.boundPixelsGaussian,
    n: n4,
  });
  add('b4.centroid.windowTies', disagree, disagree === 0, {
    bound: 0,
    note: `${res.centroids.filter(o => !o.flux.settled).length} of ${n4} cases sit on the edge between two windows`,
  });
}

// ---- (d): refusals ------------------------------------------------------------------

async function refusals() {
  const u = rand(183_000);
  const place1 = () => [here(u(), S.positionRange), here(u(), S.positionRange)];
  // saturated
  let n = 0;
  for (let k = 0; k < C['d1.saturated'].trials; k++) {
    const [x, y] = place1();
    const f = syntheticFrame({
      seed: `${S.seedPrefix}-sat-${k}`,
      sources: [{ x, y, rate: 1.2e6 / S.exposure }],
    });
    const m = measure(adapt(f, check), { ...aperture, x, y });
    if (!m.ok && m.code === 'saturated' && m.net === undefined) n++;
  }
  add('d1.saturated', n, n === C['d1.saturated'].trials, {
    bound: C['d1.saturated'].trials,
  });
  // masked
  let inAp = 0;
  let inRing = 0;
  for (let k = 0; k < C['d2.masked'].trials; k++) {
    const [x, y] = place1();
    const f = syntheticFrame({
      seed: `${S.seedPrefix}-mask-${k}`,
      sources: [{ x, y, rate: S.levels.mid / S.exposure }],
    });
    const W = f.width;
    const maskAt = (dx, dy) => {
      const m = new Uint8Array(W * f.height);
      m[(Math.round(y) + dy) * W + Math.round(x) + dx] = 1;
      return m;
    };
    const a = measure(adapt({ ...f, mask: maskAt(1, 1) }, check), {
      ...aperture,
      x,
      y,
    });
    if (!a.ok && a.code === 'masked' && a.net === undefined) inAp++;
    const full = measure(adapt(f, check), { ...aperture, x, y });
    const b = measure(adapt({ ...f, mask: maskAt(11, 0) }, check), {
      ...aperture,
      x,
      y,
    });
    if (b.ok && full.ok) inRing++;
  }
  add('d2.masked.aperture', inAp, inAp === C['d2.masked'].trials, {
    bound: C['d2.masked'].trials,
  });
  add('d2.masked.annulus', inRing, inRing === C['d2.masked'].trials, {
    bound: C['d2.masked'].trials,
  });
  // crowded
  const rate = S.levels.mid / S.exposure;
  const sep = C['d3.crowded'].separationPixels;
  const f = syntheticFrame({
    seed: `${S.seedPrefix}-crowd`,
    detector: { width: 96, height: 96 },
    sources: [
      { x: 20, y: 40, rate },
      { x: 20 + sep, y: 40, rate },
      { x: 70, y: 60, rate },
    ],
  });
  f.sidecar = sidecar({ width: 96, height: 96 });
  const src = [
    [20, 40],
    [20 + sep, 40],
    [70, 60],
  ].map(([x, y], i) => ({ id: `s${i}`, x, y, ...aperture }));
  const b = await measureBatch(f, src, { check, yieldNow: async () => {} });
  const [p, q, far] = b.results;
  const ok =
    p.code === 'crowded' &&
    q.code === 'crowded' &&
    p.net === undefined &&
    q.net === undefined &&
    far.ok;
  add('d3.crowded', ok ? 1 : 0, ok, {
    bound: 1,
    note: `separation ${sep} px; the far star ${far.ok ? 'measured' : far.code}`,
  });
  contract();
}

function contract() {
  const f = syntheticFrame({ seed: `${S.seedPrefix}-contract`, sources: [] });
  const base = f.sidecar;
  const cases = {
    'display-only': { ...base, use: 'display-only' },
    'no-contract': null,
    'not-flux': { ...base, pixels: { ...base.pixels, unit: 'unknown' } },
    'incomplete-contract': {
      ...base,
      pixels: { ...base.pixels, saturation: undefined, linearity: undefined },
    },
    'raw-frame': { ...base, calibration: { state: 'raw' } },
    'lossy-history': {
      ...base,
      history: [{ step: 'stretch', tool: 'viewer', version: '1', lossy: true }],
    },
  };
  let all = true;
  const got = {};
  for (const code of C['d4.contract'].codes) {
    const side = cases[code];
    const frame = { ...f, sidecar: side ?? undefined };
    const a = adapt(frame, check);
    got[code] = a.code;
    if (!(a.ok === false && a.code === code && a.image === undefined))
      all = false;
  }
  add('d4.contract', all ? C['d4.contract'].codes.length : 0, all, {
    bound: C['d4.contract'].codes.length,
    note: JSON.stringify(got),
  });
  // the base is itself valid
  add(
    'd4.baseContractValid',
    validateImage(base).ok ? 1 : 0,
    validateImage(base).ok,
    { bound: 1 }
  );
}

function blank() {
  const u = rand(184_000);
  let none = 0;
  let upper = 0;
  const N = C['d5.nondetection'].trials;
  for (let k = 0; k < N; k++) {
    const f = syntheticFrame({ seed: `${S.seedPrefix}-blank-${k}` });
    const m = measure(adapt(f, check), {
      ...aperture,
      x: here(u(), S.positionRange),
      y: here(u(), S.positionRange),
    });
    if (m.ok && !m.detected) {
      none++;
      if (m.upperLimit > 0 && m.magLimit !== undefined) upper++;
    }
  }
  add(
    'd5.nondetection',
    none / N,
    none / N >= C['d5.nondetection'].bound && upper === none,
    {
      bound: C['d5.nondetection'].bound,
      n: N,
    }
  );
}

// ---- the batch of ten ---------------------------------------------------------------

async function batchOfTen() {
  const u = rand(185_000);
  const stars = [];
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) cells.push([c, r]);
  for (let k = 0; k < C['e1.batchOfTen'].stars; k++) {
    const [c, r] = cells[k];
    stars.push({
      x: 16 + 32 * c + here(u(), [-4, 4]),
      y: 21 + 42.7 * r + here(u(), [-4, 4]),
      flux: 3000 * 20 ** u(),
    });
  }
  const f = syntheticFrame({
    seed: `${S.seedPrefix}-batch`,
    detector: { width: 128, height: 128 },
    sources: stars.map(s => ({ x: s.x, y: s.y, rate: s.flux / S.exposure })),
  });
  f.sidecar = sidecar({ width: 128, height: 128 });
  const src = stars.map((s, i) => {
    const [dx, dy] = disc(u, 1.5);
    return {
      id: `star${i + 1}`,
      x: s.x + dx,
      y: s.y + dy,
      ...aperture,
      recentre: { half: AP.half, sigmaW: AP.sigmaW },
    };
  });
  const b = await measureBatch(f, src, { check, yieldNow: async () => {} });
  let zMax = 0;
  let pMax = 0;
  let refused = 0;
  b.results.forEach((m, i) => {
    if (!m.ok) return refused++;
    zMax = Math.max(
      zMax,
      Math.abs((m.net - stars[i].flux * EE(AP.r)) / m.sigma)
    );
    pMax = Math.max(
      pMax,
      Math.abs(m.centroid.x - stars[i].x) / m.centroid.sigmaX,
      Math.abs(m.centroid.y - stars[i].y) / m.centroid.sigmaY
    );
  });
  const T = C['e1.batchOfTen'];
  add('e1.batchOfTen.z', zMax, refused === 0 && zMax <= T.zBound, {
    bound: T.zBound,
    note: `${refused} refused`,
  });
  add(
    'e1.batchOfTen.position',
    pMax,
    refused === 0 && pMax <= T.positionSigmas,
    { bound: T.positionSigmas }
  );
}

/** Every row, as the tests and the command line read them. */
export async function runValidation() {
  rows.length = 0;
  ensemble();
  sky();
  growth();
  oracle();
  await refusals();
  blank();
  await batchOfTen();
  rows.push({
    id: 'e2.authentic',
    measured: null,
    pass: null,
    note: C['e2.authentic'].status,
  });
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = await runValidation();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 1));
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag =
        r.pass === null
          ? 'NOT RUN'
          : r.pass
            ? 'pass'
            : RECORDED[r.id]
              ? 'FAIL*'
              : 'FAIL';
      console.log(
        `${tag.padEnd(8)}${r.id.padEnd(40)}${v.padEnd(12)}${b} ${r.note ?? ''}`
      );
    }
    console.log(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms`
    );
  }
  process.exit(out.some(r => r.pass === false && !RECORDED[r.id]) ? 1 : 0);
}
