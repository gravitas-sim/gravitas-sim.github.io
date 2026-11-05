// =============================================================================
// Galaxy morphology kernel: the frame, the sky and the start (S0 to S2 of MORPH-RULE-1)
// -----------------------------------------------------------------------------
// A frame is { width, height, values, variance }: values in electrons (or any linear unit) and variance the
// true variance of each pixel in the square of that unit. Pixel (0, 0) is the centre of the first pixel, x runs
// along a row, y down the rows; a position angle is counter-clockwise from +x in these array coordinates.
// Every refusal is { status: 'refused', code, why } and carries no number. Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../../statistics/check.js';
import { RULE, FWHM_PER_SIGMA } from './constants.js';

const { Math, Float64Array, Uint8Array, Int32Array } = globalThis;

/** A refusal if the frame or the PSF width is unusable, else null. */
export function checkFrame(image, psfFwhm) {
  const ok =
    image &&
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.values &&
    image.variance &&
    image.values.length === image.width * image.height &&
    image.variance.length === image.values.length;
  if (!ok)
    return refused(
      'not-a-frame',
      'a frame is {width, height, values, variance} with one value and one variance per pixel'
    );
  if (image.width < RULE.minFrame || image.height < RULE.minFrame)
    return refused(
      'not-a-frame',
      `the frame is smaller than ${RULE.minFrame} pixels on a side`
    );
  for (let i = 0; i < image.values.length; i++)
    if (!(Number.isFinite(image.values[i]) && image.variance[i] > 0))
      return refused(
        'not-a-frame',
        'every value must be finite and every variance finite and positive; mask a bad pixel by giving it the sky and a large variance'
      );
  if (!(psfFwhm >= 1.5 && psfFwhm <= 10))
    return refused(
      'not-a-frame',
      'the PSF FWHM must be declared, between 1.5 and 10 pixels'
    );
  return null;
}

export const rimWidth = (W, H) =>
  Math.max(RULE.rimMin, Math.round(RULE.rimFraction * Math.min(W, H)));

/**
 * The sky: the clipped mean of the rim, its error, and a flatness test between the four strips.
 * @returns {{level: number, sigma: number, rim: number}|object} a refusal on a rim that is unusable
 */
export function skyOf(image) {
  const { width: W, height: H, values, variance } = image;
  const rim = rimWidth(W, H);
  const idx = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (x < rim || y < rim || x >= W - rim || y >= H - rim)
        idx.push(y * W + x);
  let mean = 0;
  for (const k of idx) mean += values[k];
  mean /= idx.length;
  let kept = idx;
  for (let pass = 0; pass < RULE.clipPasses; pass++) {
    const next = [];
    for (const k of idx)
      if (Math.abs(values[k] - mean) <= RULE.clipSigma * Math.sqrt(variance[k]))
        next.push(k);
    if (next.length === kept.length && pass > 0) break;
    kept = next;
    if (kept.length < RULE.minRimPixels) break;
    let s = 0;
    for (const k of kept) s += values[k];
    mean = s / kept.length;
  }
  if (kept.length < RULE.minRimPixels)
    return refused('no-sky', 'the frame rim has too few usable pixels');
  let v = 0;
  for (const k of kept) v += variance[k];
  const sigma = Math.sqrt(v) / kept.length;
  // four strips, corners excluded
  const strips = [
    (x, y) => y < rim && x >= rim && x < W - rim,
    (x, y) => y >= H - rim && x >= rim && x < W - rim,
    (x, y) => x < rim && y >= rim && y < H - rim,
    (x, y) => x >= W - rim && y >= rim && y < H - rim,
  ].map(inside => {
    let s = 0;
    let vv = 0;
    let n = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (inside(x, y)) {
          const k = y * W + x;
          if (
            Math.abs(values[k] - mean) <=
            RULE.clipSigma * Math.sqrt(variance[k])
          ) {
            s += values[k];
            vv += variance[k];
            n++;
          }
        }
    return n ? { m: s / n, se: Math.sqrt(vv) / n } : null;
  });
  if (strips.some(s => !s))
    return refused('no-sky', 'a rim strip has no usable pixels');
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      const d = Math.abs(strips[i].m - strips[j].m);
      const e = Math.sqrt(strips[i].se ** 2 + strips[j].se ** 2);
      if (d > RULE.flatSigma * e)
        return refused(
          'sky-not-flat',
          'the rim strips differ by more than the flatness test allows: a gradient, a neighbour or an unmodelled background'
        );
    }
  return { level: mean, sigma, rim };
}

/** A Gaussian smoothing (separable, zero padded) of a field with weights w (power 1) or w squared (power 2) along each axis. */
function smooth(field, W, H, w, half, power) {
  const wp = power === 1 ? w : w.map(x => x * x);
  const tmp = new Float64Array(field.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let d = -half; d <= half; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W) s += wp[d + half] * field[y * W + xx];
      }
      tmp[y * W + x] = s;
    }
  const out = new Float64Array(field.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let d = -half; d <= half; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H) s += wp[d + half] * tmp[yy * W + x];
      }
      out[y * W + x] = s;
    }
  return out;
}

/**
 * S2: the connected region of the smoothed, sky-subtracted frame above 3 smoothed-noise units that holds
 * the brightest smoothed pixel of the central box, and its moments.
 * @param {Float64Array} sub sky-subtracted values
 * @returns {{x: number, y: number, q: number, pa: number, pixels: number}|object}
 */
export function startOf(sub, variance, W, H, psfFwhm) {
  const sigmaK = psfFwhm / FWHM_PER_SIGMA;
  const half = Math.ceil(4 * sigmaK);
  const w = new Float64Array(2 * half + 1);
  let sum = 0;
  for (let d = -half; d <= half; d++) {
    w[d + half] = Math.exp(-(d * d) / (2 * sigmaK * sigmaK));
    sum += w[d + half];
  }
  for (let k = 0; k < w.length; k++) w[k] /= sum;
  const sm = smooth(sub, W, H, w, half, 1);
  const sv = smooth(variance, W, H, w, half, 2);
  let best = -1;
  let bestVal = -Infinity;
  for (let y = Math.floor(H / 4); y < Math.ceil((3 * H) / 4); y++)
    for (let x = Math.floor(W / 4); x < Math.ceil((3 * W) / 4); x++) {
      const k = y * W + x;
      if (sm[k] > bestVal) {
        bestVal = sm[k];
        best = k;
      }
    }
  const above = k => sm[k] > RULE.startSigma * Math.sqrt(sv[k]);
  if (best < 0 || !above(best))
    return refused(
      'no-source',
      'no pixel of the central box is above the detection level'
    );
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let top = 0;
  stack[top++] = best;
  seen[best] = 1;
  const region = [];
  while (top) {
    const k = stack[--top];
    region.push(k);
    const x = k % W;
    const y = (k - x) / W;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const kk = yy * W + xx;
        if (!seen[kk] && above(kk)) {
          seen[kk] = 1;
          stack[top++] = kk;
        }
      }
  }
  if (region.length < RULE.minSourcePixels)
    return refused('no-source', 'the source region has too few pixels');
  let sw = 0;
  let sx = 0;
  let sy = 0;
  for (const k of region) {
    const v = Math.max(sub[k], 0);
    sw += v;
    sx += v * (k % W);
    sy += v * Math.floor(k / W);
  }
  if (!(sw > 0))
    return refused('no-source', 'the source region carries no flux');
  const x = sx / sw;
  const y = sy / sw;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const k of region) {
    const v = Math.max(sub[k], 0);
    const dx = (k % W) - x;
    const dy = Math.floor(k / W) - y;
    sxx += v * dx * dx;
    sxy += v * dx * dy;
    syy += v * dy * dy;
  }
  sxx /= sw;
  sxy /= sw;
  syy /= sw;
  const shape = eigenShape(sxx, sxy, syy);
  return {
    x,
    y,
    q: Math.max(shape.q, 0.2),
    pa: shape.pa,
    pixels: region.length,
  };
}

/** Axis ratio and major-axis angle (radians, [0, pi)) of a 2 by 2 second-moment matrix. */
export function eigenShape(sxx, sxy, syy) {
  const m = 0.5 * (sxx + syy);
  const d = Math.sqrt(Math.max(0, (0.5 * (sxx - syy)) ** 2 + sxy * sxy));
  const l1 = m + d;
  const l2 = m - d;
  if (!(l1 > 0) || !(l2 > 0)) return { q: NaN, pa: NaN };
  let pa = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  if (pa < 0) pa += Math.PI;
  return { q: Math.sqrt(l2 / l1), pa };
}
