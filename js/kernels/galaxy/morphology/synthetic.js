// =============================================================================
// Galaxy morphology kernel: the labelled synthetic image generator (Prompt 249)
// -----------------------------------------------------------------------------
// SYNTHETIC GALAXY IMAGES: every parameter is invented for the test, every image has a truth manifest,
// none is a model of a real galaxy. The forward model is the one written in the committed contract
// (tests/fixtures/morphology/thresholds.json, worlds): a pixel is the mean of the elliptical Sersic (or
// Gaussian) surface brightness over a 5 by 5 grid of sub-pixel centres (15 by 15 within 4 pixels of the
// model centre), the image is convolved with the effective Gaussian PSF (separable weights
// exp(-d^2 / (2 sigma^2)) over |d| <= ceil(4 sigma), normalised, zero padded), the sky is added, and the
// noise is Gaussian with the true variance (model + sky + read noise squared). Pure: no DOM, no clock.
// =============================================================================

import { stream, gaussian } from '../../../random/streams.js';
import { sersicB, sersicFluxFactor } from './analytic.js';
import { FWHM_PER_SIGMA } from './constants.js';

const { Math, Float64Array } = globalThis;

export const MORPHOLOGY_SYNTHETIC_LABEL =
  'SYNTHETIC GALAXY IMAGES: every parameter is invented for the test, every image has a truth manifest, none is a model of a real galaxy.';

export const MORPHOLOGY_WORLD = Object.freeze({
  width: 160,
  height: 160,
  skyElectrons: 100,
  readNoise: 5,
  psfFwhm: 3.0,
  zeroPoint: 25.0,
  subSamples: 5,
  coreSubSamples: 15,
  coreRadius: 4,
});

/** The discrete PSF weights, normalised to a sum of 1. */
export function psfWeights(fwhm) {
  const sigma = fwhm / FWHM_PER_SIGMA;
  const half = Math.ceil(4 * sigma);
  const w = new Float64Array(2 * half + 1);
  let sum = 0;
  for (let d = -half; d <= half; d++) {
    w[d + half] = Math.exp(-(d * d) / (2 * sigma * sigma));
    sum += w[d + half];
  }
  for (let k = 0; k < w.length; k++) w[k] /= sum;
  return { w, half, sigma };
}

/** Convolve a width by height image with the separable PSF, zero padded. */
export function convolve(values, width, height, fwhm) {
  if (!(fwhm > 0)) return Float64Array.from(values);
  const { w, half } = psfWeights(fwhm);
  const tmp = new Float64Array(values.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let d = -half; d <= half; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < width) s += w[d + half] * values[y * width + xx];
      }
      tmp[y * width + x] = s;
    }
  const out = new Float64Array(values.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let d = -half; d <= half; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < height) s += w[d + half] * tmp[yy * width + x];
      }
      out[y * width + x] = s;
    }
  return out;
}

/** The surface-brightness function of the model (a closure over its parameters). */
function surfaceBrightness(p) {
  const th = (p.paDeg * Math.PI) / 180;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const q = p.q;
  if (p.kind === 'gaussian') {
    const amp = p.flux / (2 * Math.PI * q * p.sigma * p.sigma);
    const k = 1 / (2 * p.sigma * p.sigma);
    return (x, y) => {
      const dx = x - p.x0;
      const dy = y - p.y0;
      const u = dx * c + dy * s;
      const v = -dx * s + dy * c;
      return amp * Math.exp(-k * (u * u + (v / q) * (v / q)));
    };
  }
  const f = p.clump ? 1 - p.clump.fraction : 1;
  const b = sersicB(p.n);
  const ie = (f * p.flux) / (sersicFluxFactor(p.n) * p.re * p.re * q);
  const inv = 1 / p.n;
  const sersic = (x, y) => {
    const dx = x - p.x0;
    const dy = y - p.y0;
    const u = dx * c + dy * s;
    const v = -dx * s + dy * c;
    const r = Math.sqrt(u * u + (v / q) * (v / q));
    return ie * Math.exp(-b * ((r / p.re) ** inv - 1));
  };
  if (!p.clump) return sersic;
  const sc = 0.25 * p.re;
  const cx = p.x0 + 1.5 * p.re * c;
  const cy = p.y0 + 1.5 * p.re * s;
  const amp = (p.clump.fraction * p.flux) / (2 * Math.PI * sc * sc);
  const k = 1 / (2 * sc * sc);
  return (x, y) =>
    sersic(x, y) + amp * Math.exp(-k * ((x - cx) ** 2 + (y - cy) ** 2));
}

/** The noise-free model image (pixel means, then the PSF), no sky. */
export function modelImage(p) {
  const W = p.width ?? MORPHOLOGY_WORLD.width;
  const H = p.height ?? MORPHOLOGY_WORLD.height;
  const fn = surfaceBrightness(p);
  const raw = new Float64Array(W * H);
  const S = MORPHOLOGY_WORLD;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const near = Math.hypot(i - p.x0, j - p.y0) <= S.coreRadius;
      const s = near ? S.coreSubSamples : S.subSamples;
      let sum = 0;
      for (let b = 0; b < s; b++) {
        const y = j + (b + 0.5) / s - 0.5;
        for (let a = 0; a < s; a++) sum += fn(i + (a + 0.5) / s - 0.5, y);
      }
      raw[j * W + i] = sum / (s * s);
    }
  return { values: convolve(raw, W, H, p.psfFwhm ?? 0), width: W, height: H };
}

/** A point source: the Gaussian PSF itself, pixel-integrated by the sub-pixel rule. */
function pointImage(p) {
  const W = p.width ?? MORPHOLOGY_WORLD.width;
  const H = p.height ?? MORPHOLOGY_WORLD.height;
  const sigma = p.psfFwhm / FWHM_PER_SIGMA;
  const g = surfaceBrightness({
    kind: 'gaussian',
    sigma,
    q: 1,
    paDeg: 0,
    flux: p.flux,
    x0: p.x0,
    y0: p.y0,
  });
  const out = new Float64Array(W * H);
  const s = MORPHOLOGY_WORLD.subSamples;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let sum = 0;
      for (let b = 0; b < s; b++)
        for (let a = 0; a < s; a++)
          sum += g(i + (a + 0.5) / s - 0.5, j + (b + 0.5) / s - 0.5);
      out[j * W + i] = sum / (s * s);
    }
  return { values: out, width: W, height: H };
}

/**
 * One synthetic galaxy image with its variance map and truth manifest.
 * @param {object} p kind ('sersic'|'gaussian'|'point'), n, re, sigma, q, paDeg, x0, y0, flux, psfFwhm, width,
 *   height, sky, readNoise, noise (default true), seed, label, gradientPeakToPeak, clump {fraction}, bandScale
 * @returns {{image: {width, height, values, variance}, truth: object, label: string}}
 */
export function generateGalaxyImage(p) {
  const W = p.width ?? MORPHOLOGY_WORLD.width;
  const H = p.height ?? MORPHOLOGY_WORLD.height;
  const full = {
    q: 1,
    paDeg: 0,
    x0: (W - 1) / 2,
    y0: (H - 1) / 2,
    psfFwhm: MORPHOLOGY_WORLD.psfFwhm,
    sky: MORPHOLOGY_WORLD.skyElectrons,
    readNoise: MORPHOLOGY_WORLD.readNoise,
    noise: true,
    ...p,
  };
  const model = full.kind === 'point' ? pointImage(full) : modelImage(full);
  const scale = full.bandScale ?? 1;
  const values = new Float64Array(W * H);
  const variance = new Float64Array(W * H);
  const draw = full.noise
    ? gaussian(
        stream('noise', full.seed ?? 0, 'galaxy-image', full.label ?? '')
      )
    : null;
  const pp = full.gradientPeakToPeak ?? 0;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const sky = full.sky + pp * (i / (W - 1) - 0.5);
      const mean = scale * model.values[k] + sky;
      const v = mean + full.readNoise * full.readNoise;
      variance[k] = v;
      values[k] = mean + (draw ? Math.sqrt(v) * draw() : 0);
    }
  return {
    image: { width: W, height: H, values, variance },
    truth: { ...full, bandScale: scale, zeroPoint: MORPHOLOGY_WORLD.zeroPoint },
    label: MORPHOLOGY_SYNTHETIC_LABEL,
  };
}

/** The 8 cases the independent oracle re-implements (B1, B2): noise-free, PSF-convolved, flux 200000. */
export const MORPHOLOGY_ORACLE_CASES = Object.freeze(
  [
    {
      id: 'b1',
      kind: 'sersic',
      n: 1,
      q: 0.5,
      paDeg: 30,
      re: 9,
      x0: 79.8,
      y0: 79.2,
    },
    {
      id: 'b2',
      kind: 'sersic',
      n: 2,
      q: 0.9,
      paDeg: 100,
      re: 9,
      x0: 79.1,
      y0: 80.3,
    },
    {
      id: 'b3',
      kind: 'sersic',
      n: 4,
      q: 0.7,
      paDeg: 150,
      re: 8,
      x0: 80.4,
      y0: 79.7,
    },
    {
      id: 'b4',
      kind: 'sersic',
      n: 1,
      q: 0.4,
      paDeg: 60,
      re: 10,
      x0: 79.5,
      y0: 79.5,
    },
    {
      id: 'b5',
      kind: 'sersic',
      n: 3,
      q: 0.6,
      paDeg: 0,
      re: 9,
      x0: 78.9,
      y0: 80.1,
    },
    {
      id: 'b6',
      kind: 'sersic',
      n: 0.8,
      q: 0.95,
      paDeg: 45,
      re: 10,
      x0: 80.2,
      y0: 79.0,
    },
    {
      id: 'b7',
      kind: 'sersic',
      n: 1,
      q: 0.7,
      paDeg: 40,
      re: 9,
      x0: 79.6,
      y0: 79.4,
      clump: { fraction: 0.15 },
    },
    {
      id: 'b8',
      kind: 'sersic',
      n: 2,
      q: 0.5,
      paDeg: 120,
      re: 9,
      x0: 79.3,
      y0: 80.0,
      clump: { fraction: 0.3 },
    },
  ].map(c => Object.freeze({ flux: 200000, psfFwhm: 3, noise: false, ...c }))
);

/** The 48 pixels at which B1 compares the oracle's forward model with the generator's: an 8 by 6 grid of 9-pixel spacing. */
export const ORACLE_SAMPLE_PIXELS = Object.freeze(
  Array.from({ length: 48 }, (_, i) => [
    Math.floor(79.5 + ((i % 8) - 3.5) * 9),
    Math.floor(79.5 + (Math.floor(i / 8) - 2.5) * 9),
  ])
);

/**
 * The seeded main ensemble of the coverage legs (C1 to C3): the manifests only (parameters), drawn uniformly
 * from the contract's intervals, the flux log-uniform.
 */
export function morphologyEnsemble(n, seed) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const u = stream('forward', seed, 'ensemble', k);
    const r = [];
    for (let i = 0; i < 7; i++) r.push(u());
    const lo = Math.log10(15000);
    const hi = Math.log10(200000);
    out.push({
      id: `e${k}`,
      kind: 'sersic',
      n: 0.8 + 3.7 * r[0],
      q: 0.4 + 0.6 * r[1],
      re: 7 + 4 * r[2],
      paDeg: 180 * r[3],
      x0: 79.5 - 1 + 2 * r[4],
      y0: 79.5 - 1 + 2 * r[5],
      flux: 10 ** (lo + (hi - lo) * r[6]),
      psfFwhm: MORPHOLOGY_WORLD.psfFwhm,
    });
  }
  return out;
}
