// =============================================================================
// Synthetic frames for the detection checks (Prompt 183, DETECTION.md)
// -----------------------------------------------------------------------------
// The detector kernel's frames (js/kernels/detector/frame.js: a clean detector,
// whole ADU, bias subtracted) carrying stars at known positions and fluxes, and
// the stars that kernel cannot draw - an elliptical Gaussian and a Moffat -
// added to a kernel frame's sky and noise, each integrated over its pixels on
// a grid of sub-pixels and given its own shot noise (a normal draw of the
// Poisson mean, which is exact enough above about 25 electrons a pixel and is
// stated in the manifest). Everything is seeded; `truth` is the manifest.
// Imported by tools/detection-validate.mjs, tools/detection-oracle/make-inputs.mjs
// and tests/detection.test.js; it reads the committed scene from
// tests/fixtures/detection/thresholds.json.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { mulberry32 } from '../js/rng.js';
import { sidecar as baseSidecar } from './photometry-validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const THRESHOLDS = JSON.parse(
  readFileSync(
    path.join(HERE, '../tests/fixtures/detection/thresholds.json'),
    'utf8'
  )
);
export const SCENE = THRESHOLDS.scene;
export const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/** A 32-bit seed from any parts: a fixed hash, so a seed is the same everywhere. */
export function seedOf(...parts) {
  let h = 2166136261;
  for (const ch of parts.join(':')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seeded generator. */
export const rngOf = (...parts) =>
  mulberry32(seedOf(SCENE.seedPrefix, ...parts));

/** A standard normal from a generator (Box-Muller). */
export function normal(rng) {
  let u = rng();
  while (u <= Number.EPSILON) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * Twelve positions, one in each cell of the scene's grid (DETECTION.md): no
 * two within 24 pixels, none within 12 of an edge.
 */
export function gridStars(rng) {
  const out = [];
  for (let j = 0; j < SCENE.grid.cellsY; j++)
    for (let i = 0; i < SCENE.grid.cellsX; i++)
      out.push({
        x: 32 * i + 12 + 8 * rng(),
        y: 42 * j + 12 + 18 * rng(),
      });
  return out;
}

const moffatAlpha = (fwhm, beta) => fwhm / (2 * Math.sqrt(2 ** (1 / beta) - 1));

/** The unit-flux surface density of a star at (dx, dy) from its centre. */
function density(psf, dx, dy) {
  if (psf.kind === 'moffat') {
    const a = moffatAlpha(psf.fwhm, psf.beta);
    return (
      ((psf.beta - 1) / (Math.PI * a * a)) *
      (1 + (dx * dx + dy * dy) / (a * a)) ** -psf.beta
    );
  }
  const t = ((psf.thetaDeg ?? 0) * Math.PI) / 180;
  const u = dx * Math.cos(t) + dy * Math.sin(t);
  const v = -dx * Math.sin(t) + dy * Math.cos(t);
  return (
    Math.exp(-0.5 * ((u / psf.sigmaA) ** 2 + (v / psf.sigmaB) ** 2)) /
    (2 * Math.PI * psf.sigmaA * psf.sigmaB)
  );
}

/** Electrons per pixel of one analytic star: each pixel on n by n sub-pixel midpoints. */
export function starMap(width, height, star, into = null) {
  const out = into ?? new Float64Array(width * height);
  const n = star.psf.kind === 'moffat' ? 15 : 9;
  const reach =
    star.psf.kind === 'moffat'
      ? Math.ceil(10 * star.psf.fwhm)
      : Math.ceil(6 * Math.max(star.psf.sigmaA, star.psf.sigmaB)) + 1;
  const x0 = Math.max(0, Math.floor(star.x) - reach);
  const x1 = Math.min(width - 1, Math.ceil(star.x) + reach);
  const y0 = Math.max(0, Math.floor(star.y) - reach);
  const y1 = Math.min(height - 1, Math.ceil(star.y) + reach);
  const h = 1 / n;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      let s = 0;
      for (let b = 0; b < n; b++)
        for (let a = 0; a < n; a++)
          s += density(
            star.psf,
            x - 0.5 + (a + 0.5) * h - star.x,
            y - 0.5 + (b + 0.5) * h - star.y
          );
      out[y * width + x] += (star.flux * s) / (n * n);
    }
  return out;
}

/** The sidecar the committed contract names, for a frame of this size. */
export function sidecar(width, height, id) {
  return { ...baseSidecar({ width, height }), id };
}

/**
 * One science frame in bias-subtracted ADU with its manifest.
 * @param {object} o
 * @param {string} o.seed
 * @param {Array<{x: number, y: number, flux: number, psf?: object}>} [o.stars] - psf absent: the detector kernel's own
 * @param {object} [o.detector] - overrides of the scene's detector
 * @param {{x: number, y: number}} [o.plane] - ADU per pixel, about the frame's centre
 * @param {Uint8Array} [o.mask]
 * @param {Array<{x: number, y: number, adu: number}>} [o.hot] - single-pixel events, ADU
 * @param {boolean} [o.rounded] - round to whole ADU (the oracle's pixels)
 */
export function makeFrame({
  seed,
  stars = [],
  detector = {},
  plane = null,
  mask = null,
  hot = [],
  rounded = false,
}) {
  const d = { ...SCENE.detector, ...detector };
  const kernelStars = stars.filter(s => !s.psf);
  const analytic = stars.filter(s => s.psf);
  const f = simulateFrame({
    seed,
    exposure: SCENE.exposure,
    detector: d,
    scene: {
      sky: SCENE.skyRate,
      sources: kernelStars.map(s => ({
        x: s.x,
        y: s.y,
        rate: s.flux / SCENE.exposure,
      })),
    },
  });
  const W = f.width;
  const H = f.height;
  const data = Float64Array.from(f.values, v => v - d.biasLevel);
  const signal = Float64Array.from(
    f.truth.starElectrons ?? new Float64Array(W * H)
  );
  if (analytic.length) {
    const rng = rngOf('shot', seed);
    const extra = new Float64Array(W * H);
    for (const s of analytic) starMap(W, H, s, extra);
    for (let i = 0; i < W * H; i++)
      if (extra[i] > 0) {
        signal[i] += extra[i];
        data[i] += (extra[i] + Math.sqrt(extra[i]) * normal(rng)) / d.gain;
      }
  }
  if (plane)
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++)
        data[j * W + i] +=
          plane.x * (i - (W - 1) / 2) + plane.y * (j - (H - 1) / 2);
  for (const h of hot) data[Math.round(h.y) * W + Math.round(h.x)] += h.adu;
  if (rounded)
    for (let i = 0; i < data.length; i++) data[i] = Math.round(data[i]);
  return {
    id: seed,
    width: W,
    height: H,
    data,
    mask,
    sidecar: sidecar(W, H, seed),
    truth: { detector: d, stars, plane, hot, signal, gain: d.gain },
  };
}
