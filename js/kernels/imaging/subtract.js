// =============================================================================
// Reference-star subtraction on the detector kernel's frames (Prompt 230 Part B)
// -----------------------------------------------------------------------------
// IMAGING_SUBTRACTION_GATE.md fixed the method (M1 to M8), every default and every
// bound in tests/fixtures/imaging-subtraction/thresholds.json before this file existed.
//
//   electrons from counts; the sky removed; the reference scaled to the target by
//   least squares inside 2 FWHM of the star; the residual D = T - kR; the planet's
//   flux and position by a fit of the known Moffat profile to D; the noise from the
//   robust rms of D around the candidate; detection by the matched filter; the
//   throughput by injection into the target frame.
//
// Not a coronagraph, not angular or spectral differential imaging (their
// self-subtraction is not modeled), and the point-spread function has no rings or
// speckle: the mismatch of the two stars' profiles is the only systematic. The
// radius below which the pipeline refuses (1.5 FWHM) belongs to this method on these
// frames; it is not lambda/D and not an instrument's inner working angle.
//
// Pure: no DOM. Frames are Float64Array or arrays of detector counts, width * height.
// =============================================================================

import { stream, gaussian } from '../../random/streams.js';
import { moffat } from '../detector/optics.js';
import { simulateFrame } from '../detector/frame.js';
import { ImagingError } from './constants.js';

const { Math, Float64Array } = globalThis;

export const SUBTRACTION_VERSION = '1.0.0';

/** The committed design (tests hold these equal to thresholds.json). */
export const DESIGN = Object.freeze({
  detector: Object.freeze({
    width: 64,
    height: 64,
    gain: 1.5,
    readNoise: 8,
    biasLevel: 500,
    biasColumnSigma: 0,
    darkRate: 0,
    hotFraction: 0,
    qeScatter: 0,
    vignette: 0,
    dustCount: 0,
    cosmicRate: 0,
    fullWell: 50000,
    adcMax: 65535,
  }),
  orbitFrame: 96,
  exposure: 30,
  sky: 3,
  starRate: 10000,
  fwhm: 3,
  beta: 4.765,
  table: Object.freeze({ step: 0.05, reach: 30, subsamples: 5 }),
  referenceRateLog: Object.freeze([0.6, 1.6]),
  fwhmMismatch: 0.03,
  centroidSigma: 0.03,
  fitFwhm: 2,
  workingFwhm: 2.5,
  skyRadiusFraction: 0.69,
  mismatchDepth: 0.1,
  searchRadiusFraction: 0.8,
  detectSnr: 5,
  saturationFraction: 0.9,
  maxIterations: 30,
  annulusHalfWidth: 1.5,
});

export const NOT_MEASURABLE =
  "not measurable behind the star's residual with this subtraction";

const refuse = (code, message, extra = {}) => ({
  ok: false,
  status: 'refused',
  code,
  message,
  ...extra,
});

// ---- the profile -----------------------------------------------------------------

const tableCache = new Map();
/** The detector kernel's profile table of a Moffat star: intensity per square pixel, unit flux. */
export function moffatTable(fwhm = DESIGN.fwhm, beta = DESIGN.beta) {
  const key = `${fwhm}:${beta}`;
  let t = tableCache.get(key);
  if (!t) {
    const m = moffat({ fwhm, beta });
    const { step, reach, subsamples } = DESIGN.table;
    const n = Math.round(reach / step) + 1;
    const values = new Float64Array(n);
    for (let i = 0; i < n; i++) values[i] = m.intensity(i * step);
    t = { step, reach, subsamples, values, alpha: m.alpha };
    tableCache.set(key, t);
  }
  return t;
}

/** Moffat intensity per square pixel (unit flux) at squared radius r2. */
const intensity = (r2, alpha, beta) =>
  ((beta - 1) / (Math.PI * alpha * alpha)) *
  (1 + r2 / (alpha * alpha)) ** -beta;

/** Expected electrons per pixel of a unit-flux Moffat source at (x, y), integrated over each pixel on an n by n grid, inside a radius. */
export function expectedMap(w, h, x, y, flux, o = {}) {
  const fwhm = o.fwhm ?? DESIGN.fwhm;
  const beta = o.beta ?? DESIGN.beta;
  const n = o.subsamples ?? 5;
  const reach = o.reach ?? 15;
  const alpha = moffat({ fwhm, beta }).alpha;
  const out = new Float64Array(w * h);
  const x0 = Math.max(0, Math.floor(x - reach));
  const x1 = Math.min(w - 1, Math.ceil(x + reach));
  const y0 = Math.max(0, Math.floor(y - reach));
  const y1 = Math.min(h - 1, Math.ceil(y + reach));
  for (let py = y0; py <= y1; py++)
    for (let px = x0; px <= x1; px++) {
      let acc = 0;
      for (let j = 0; j < n; j++) {
        const dy = py + (j + 0.5) / n - 0.5 - y;
        for (let i = 0; i < n; i++) {
          const dx = px + (i + 0.5) / n - 0.5 - x;
          acc += intensity(dx * dx + dy * dy, alpha, beta);
        }
      }
      out[py * w + px] = (flux * acc) / (n * n);
    }
  return out;
}

// ---- frames from the detector kernel ----------------------------------------------

/**
 * One frame of the committed scene: the star at the centre, planets, sky, the detector kernel's noise.
 * @param {{seed: string, label?: string, size?: number, fwhm?: number, starRate?: number, star?: {x: number, y: number},
 *   planets?: Array<{x: number, y: number, flux: number}>, exposure?: number, sky?: number}} o
 */
export function sceneFrame(o) {
  const size = o.size ?? DESIGN.detector.width;
  const fwhm = o.fwhm ?? DESIGN.fwhm;
  const exposure = o.exposure ?? DESIGN.exposure;
  const c = size / 2;
  const sources = [
    {
      x: o.star?.x ?? c,
      y: o.star?.y ?? c,
      rate: o.starRate ?? DESIGN.starRate,
    },
    ...(o.planets ?? []).map(p => ({
      x: p.x,
      y: p.y,
      rate: p.flux / exposure,
    })),
  ];
  const f = simulateFrame({
    seed: o.seed,
    kind: 'science',
    label: o.label ?? 'scene',
    exposure,
    detector: { ...DESIGN.detector, width: size, height: size },
    scene: { sky: o.sky ?? DESIGN.sky, sources },
    psf: moffatTable(fwhm, o.beta ?? DESIGN.beta),
    cosmicRays: false,
  });
  return { width: size, height: size, counts: f.values, truth: f.truth };
}

/** A reference frame with the nominal (or stated) mismatch: another star's rate, a width and a centroid offset, each drawn. */
export function referenceMismatch(draw, o = {}) {
  const g = gaussian(draw);
  const [lo, hi] = DESIGN.referenceRateLog;
  const eps = o.eps ?? (o.matched ? 0 : (2 * draw() - 1) * DESIGN.fwhmMismatch);
  const sig = o.matched ? 0 : DESIGN.centroidSigma;
  return {
    rateFactor:
      o.rateFactor !== undefined
        ? (draw(), o.rateFactor)
        : Math.exp(Math.log(lo) + draw() * (Math.log(hi) - Math.log(lo))),
    eps,
    dx: sig * g(),
    dy: sig * g(),
  };
}

// ---- injection (Prompt 184's pattern) ---------------------------------------------

function poisson(draw, g, mean) {
  if (!(mean > 0)) return 0;
  if (mean < 30) {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= draw();
    } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * g()));
}

/** Add a planet's expected map with its own shot noise to a copy of a counts frame; returns the copy. */
export function injectPlanet(frame, planet, seed, label, o = {}) {
  const { width: w, height: h } = frame;
  const gain = o.gain ?? DESIGN.detector.gain;
  const mean = expectedMap(w, h, planet.x, planet.y, planet.flux, o);
  const draw = stream('injection', seed, ...label);
  const g = gaussian(draw);
  const counts = Float64Array.from(frame.counts);
  let added = 0;
  for (let i = 0; i < mean.length; i++)
    if (mean[i] > 1e-6) {
      const e = poisson(draw, g, mean[i]);
      added += e;
      counts[i] += e / gain;
    }
  return { ...frame, counts, injected: added, expected: planet.flux };
}

// ---- the pipeline ------------------------------------------------------------------

const median = a => {
  const s = Array.from(a).sort((p, q) => p - q);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};
const robustRms = a => {
  if (a.length < 8) return NaN;
  const m = median(a);
  return 1.4826 * median(a.map(v => Math.abs(v - m)));
};

/**
 * M1 to M4 with the refusals: electrons, sky, the least-squares scale, the residual.
 * @param {{width: number, height: number, counts: ArrayLike<number>}} target
 * @param {{width: number, height: number, counts: ArrayLike<number>}} reference
 */
export function subtract(target, reference, o = {}) {
  const d = DESIGN;
  const fwhm = o.fwhm ?? d.fwhm;
  const beta = o.beta ?? d.beta;
  if (!(fwhm > 0) || !(beta > 1) || !Number.isFinite(fwhm + beta))
    return refuse(
      'bad-psf',
      'the profile needs a FWHM above 0 and beta above 1'
    );
  if (!reference?.counts)
    return refuse('no-reference', 'a reference frame is needed');
  const w = target.width;
  const h = target.height;
  if (
    reference.width !== w ||
    reference.height !== h ||
    target.counts.length !== w * h ||
    reference.counts.length !== w * h
  )
    return refuse('size-mismatch', 'the two frames must have the same size');
  const gain = o.gain ?? d.detector.gain;
  const bias = o.bias ?? d.detector.biasLevel;
  const well = o.fullWell ?? d.detector.fullWell;
  const n = w * h;
  const T = new Float64Array(n);
  const R = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    T[i] = (target.counts[i] - bias) * gain;
    R[i] = (reference.counts[i] - bias) * gain;
    if (!Number.isFinite(T[i] + R[i]))
      return refuse('non-finite', 'a pixel is not a finite number');
  }
  let peakT = 0;
  let peakR = 0;
  for (let i = 0; i < n; i++) {
    if (T[i] > peakT) peakT = T[i];
    if (R[i] > peakR) peakR = R[i];
  }
  if (Math.max(peakT, peakR) > d.saturationFraction * well)
    return refuse('saturated', 'a pixel is above 0.9 of the full well', {
      peak: Math.max(peakT, peakR),
    });
  const cx = o.center?.x ?? w / 2;
  const cy = o.center?.y ?? h / 2;
  const skyR = d.skyRadiusFraction * (Math.min(w, h) / 2);
  const skyT = [];
  const skyR_ = [];
  const disc = [];
  const rFit2 = (d.fitFwhm * fwhm) ** 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r2 = (x - cx) ** 2 + (y - cy) ** 2;
      const i = y * w + x;
      if (r2 >= skyR * skyR) {
        skyT.push(T[i]);
        skyR_.push(R[i]);
      }
      if (r2 <= rFit2) disc.push(i);
    }
  const sT = median(skyT);
  const sR = median(skyR_);
  for (let i = 0; i < n; i++) {
    T[i] -= sT;
    R[i] -= sR;
  }
  let num = 0;
  let den = 0;
  for (const i of disc) {
    num += T[i] * R[i];
    den += R[i] * R[i];
  }
  if (!(den > 0))
    return refuse('no-star', 'the reference holds no light at the star');
  const k = num / den;
  const D = new Float64Array(n);
  for (let i = 0; i < n; i++) D[i] = T[i] - k * R[i];
  let sd = 0;
  let st = 0;
  for (const i of disc) {
    sd += D[i] * D[i];
    st += T[i] * T[i];
  }
  const depth = Math.sqrt(sd / st);
  const out = {
    ok: true,
    width: w,
    height: h,
    cx,
    cy,
    k,
    depth,
    sky: { target: sT, reference: sR },
    residual: D,
    target: T,
    reference: R,
    fwhm,
    beta,
    gain,
  };
  if (!(depth <= d.mismatchDepth))
    return {
      ...refuse(
        'reference-mismatch',
        'the reference does not match the target star: the subtraction leaves too much of it',
        { depth, limit: d.mismatchDepth }
      ),
      k,
    };
  return out;
}

/** Robust local noise of the residual around (x, y): the annulus of the candidate's radius, the candidate's neighbourhood left out. */
export function localNoise(red, x, y) {
  const d = DESIGN;
  const { width: w, height: h, cx, cy, residual: D, fwhm } = red;
  const r0 = Math.hypot(x - cx, y - cy);
  const ex2 = (d.fitFwhm * fwhm) ** 2;
  const vals = [];
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const r = Math.hypot(px - cx, py - cy);
      if (Math.abs(r - r0) > d.annulusHalfWidth) continue;
      if ((px - x) ** 2 + (py - y) ** 2 <= ex2) continue;
      vals.push(D[py * w + px]);
    }
  return robustRms(vals);
}

const SUB = 5;
/** The model of a unit-flux planet over a window, pixel-integrated on SUB by SUB, with derivatives in x and y. */
function modelAt(x, y, px, py, alpha, beta) {
  let m = 0;
  let mx = 0;
  let my = 0;
  for (let j = 0; j < SUB; j++) {
    const dy = py + (j + 0.5) / SUB - 0.5 - y;
    for (let i = 0; i < SUB; i++) {
      const dx = px + (i + 0.5) / SUB - 0.5 - x;
      const r2 = dx * dx + dy * dy;
      const I = intensity(r2, alpha, beta);
      const f = (2 * beta) / (alpha * alpha + r2);
      m += I;
      mx += I * f * dx;
      my += I * f * dy;
    }
  }
  const s = 1 / (SUB * SUB);
  return [m * s, mx * s, my * s];
}

/**
 * M6: the fit of the known Moffat profile to the residual around a starting point.
 * Gauss-Newton on the pixels within 2 FWHM of the start, weights 1 / sigma^2.
 */
export function fitPlanet(red, start, sigma) {
  const d = DESIGN;
  const { width: w, height: h, residual: D, fwhm, beta } = red;
  const alpha = moffat({ fwhm, beta }).alpha;
  const rad = d.fitFwhm * fwhm;
  const px0 = Math.max(0, Math.floor(start.x - rad));
  const px1 = Math.min(w - 1, Math.ceil(start.x + rad));
  const py0 = Math.max(0, Math.floor(start.y - rad));
  const py1 = Math.min(h - 1, Math.ceil(start.y + rad));
  const win = [];
  for (let py = py0; py <= py1; py++)
    for (let px = px0; px <= px1; px++)
      if ((px - start.x) ** 2 + (py - start.y) ** 2 <= rad * rad)
        win.push([px, py, D[py * w + px]]);
  let x = start.x;
  let y = start.y;
  let F = start.flux ?? 1;
  let cov = null;
  let converged = false;
  let it = 0;
  for (; it < d.maxIterations; it++) {
    // linear in F: solve it with the geometry, Gauss-Newton on (x, y, F)
    const A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0];
    for (const [px, py, v] of win) {
      const [m, mx, my] = modelAt(x, y, px, py, alpha, beta);
      const J = [F * mx, F * my, m];
      const r = v - F * m;
      for (let a = 0; a < 3; a++) {
        b[a] += J[a] * r;
        for (let c = 0; c < 3; c++) A[3 * a + c] += J[a] * J[c];
      }
    }
    const inv = inv3(A);
    if (!inv) return refuse('fit', 'the fit is singular here');
    const step = [0, 1, 2].map(
      a => inv[3 * a] * b[0] + inv[3 * a + 1] * b[1] + inv[3 * a + 2] * b[2]
    );
    const lim = 0.5 * fwhm;
    x += Math.max(-lim, Math.min(lim, step[0]));
    y += Math.max(-lim, Math.min(lim, step[1]));
    F += step[2];
    cov = inv;
    if (
      Math.abs(step[0]) < 1e-7 &&
      Math.abs(step[1]) < 1e-7 &&
      Math.abs(step[2]) < 1e-7 * Math.max(1, Math.abs(F))
    ) {
      converged = true;
      break;
    }
  }
  // formal covariance at the solution
  const A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const [px, py] of win) {
    const [m, mx, my] = modelAt(x, y, px, py, alpha, beta);
    const J = [F * mx, F * my, m];
    for (let a = 0; a < 3; a++)
      for (let c = 0; c < 3; c++) A[3 * a + c] += J[a] * J[c];
  }
  cov = inv3(A);
  if (!cov) return refuse('fit', 'the fit is singular here');
  const s2 = sigma * sigma;
  return {
    ok: true,
    x,
    y,
    flux: F,
    sigmaX: Math.sqrt(cov[0] * s2),
    sigmaY: Math.sqrt(cov[4] * s2),
    sigmaFlux: Math.sqrt(cov[8] * s2),
    covariance: cov.map(v => v * s2),
    pixels: win.length,
    iterations: it + 1,
    converged,
    noise: sigma,
  };
}

function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!(Math.abs(det) > 1e-300) || !Number.isFinite(det)) return null;
  return [
    A / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    B / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ];
}

const templateCache = new Map();
/** The unit-flux template (integer offsets within 2 FWHM) and its sum of squares. */
function template(fwhm, beta) {
  const key = `${fwhm}:${beta}`;
  let t = templateCache.get(key);
  if (t) return t;
  const alpha = moffat({ fwhm, beta }).alpha;
  const r = Math.ceil(DESIGN.fitFwhm * fwhm);
  const taps = [];
  let s2 = 0;
  for (let v = -r; v <= r; v++)
    for (let u = -r; u <= r; u++)
      if (u * u + v * v <= (DESIGN.fitFwhm * fwhm) ** 2) {
        const [m] = modelAt(0, 0, u, v, alpha, beta);
        taps.push([u, v, m]);
        s2 += m * m;
      }
  t = { taps, s2, sqrtS2: Math.sqrt(s2) };
  templateCache.set(key, t);
  return t;
}

/** The S/N a planet of this flux would have where the noise is sigma (matched filter of M7). */
export function expectedSnr(
  flux,
  sigma,
  fwhm = DESIGN.fwhm,
  beta = DESIGN.beta
) {
  return (flux * template(fwhm, beta).sqrtS2) / sigma;
}

/**
 * M7: the matched filter over the search annulus; the best candidate and its S/N, with M5's noise.
 * Returns { ok, snr, x, y, flux, noise, detected }.
 */
export function detect(red, o = {}) {
  const d = DESIGN;
  const { width: w, height: h, cx, cy, residual: D, fwhm, beta } = red;
  const t = template(fwhm, beta);
  const rMin = (o.rMin ?? d.workingFwhm) * fwhm;
  const rMax = o.rMax ?? d.searchRadiusFraction * (Math.min(w, h) / 2);
  // the annulus noise per integer radius, without exclusion (the peak search needs no candidate)
  const bins = new Map();
  const nb = Math.ceil(rMax) + 2;
  for (let b = 0; b <= nb; b++) bins.set(b, []);
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const r = Math.hypot(px - cx, py - cy);
      const lo = Math.max(0, Math.ceil(r - d.annulusHalfWidth));
      const hi = Math.min(nb, Math.floor(r + d.annulusHalfWidth));
      const v = D[py * w + px];
      for (let b = lo; b <= hi; b++) bins.get(b).push(v);
    }
  const sig = [];
  for (let b = 0; b <= nb; b++) sig[b] = robustRms(bins.get(b));
  let best = null;
  const edge = Math.ceil(d.fitFwhm * fwhm);
  for (let py = edge; py < h - edge; py++)
    for (let px = edge; px < w - edge; px++) {
      const r = Math.hypot(px - cx, py - cy);
      if (r < rMin || r > rMax) continue;
      let acc = 0;
      for (const [u, v, m] of t.taps) acc += D[(py + v) * w + px + u] * m;
      const flux = acc / t.s2;
      const s = sig[Math.round(r)];
      const snr = (flux * t.sqrtS2) / s;
      if (Number.isFinite(snr) && (!best || snr > best.snr))
        best = { snr, x: px, y: py, flux };
    }
  if (!best) return { ok: true, detected: false, snr: -Infinity };
  const noise = localNoise(red, best.x, best.y);
  const snr = (best.flux * t.sqrtS2) / noise;
  return {
    ok: true,
    detected: snr >= d.detectSnr,
    snr,
    x: best.x,
    y: best.y,
    flux: best.flux,
    noise,
  };
}

/** Measure a planet near (x, y): the working-radius refusal, M5's noise, the fit, the S/N. */
export function measureAt(red, x, y, o = {}) {
  const d = DESIGN;
  const r = Math.hypot(x - red.cx, y - red.cy);
  if (r < (o.rMin ?? d.workingFwhm) * red.fwhm)
    return refuse('inside-working-region', NOT_MEASURABLE, {
      separationFwhm: r / red.fwhm,
    });
  const noise = o.noise ?? localNoise(red, x, y);
  if (!(noise > 0))
    return refuse('no-noise', 'the local noise could not be measured');
  const t = template(red.fwhm, red.beta);
  let start = o.flux;
  if (start === undefined) {
    let acc = 0;
    for (const [u, v, m] of t.taps) {
      const px = Math.round(x) + u;
      const py = Math.round(y) + v;
      if (px >= 0 && px < red.width && py >= 0 && py < red.height)
        acc += red.residual[py * red.width + px] * m;
    }
    start = acc / t.s2;
  }
  const fit = fitPlanet(red, { x, y, flux: start }, noise);
  if (!fit.ok) return fit;
  return {
    ...fit,
    snr: fit.flux / fit.sigmaFlux,
    separation: Math.hypot(fit.x - red.cx, fit.y - red.cy),
  };
}

/** The whole pipeline: subtract, detect, measure the best candidate. */
export function findPlanet(target, reference, o = {}) {
  const red = subtract(target, reference, o);
  if (!red.ok) return red;
  const det = detect(red, o);
  if (!det.detected)
    return { ok: true, detected: false, snr: det.snr, reduction: red };
  const m = measureAt(red, det.x, det.y, {
    ...o,
    flux: det.flux,
    noise: det.noise,
  });
  if (!m.ok) return { ...m, reduction: red };
  return { ...m, detected: true, matchedSnr: det.snr, reduction: red };
}

export { ImagingError };
