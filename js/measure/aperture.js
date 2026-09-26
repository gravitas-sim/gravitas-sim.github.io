// =============================================================================
// An aperture on an image: what is inside it, and where its middle is
// -----------------------------------------------------------------------------
// Two measurements, for the two kinds of image the Observatory holds:
//
//   flux    a circle of radius r, a background annulus rIn..rOut. Pixels on
//           the circle's edge count by the fraction of them inside it
//           (8 x 8 sub-samples). Reported:
//             sum, area               MEASURED
//             background, its scatter MEASURED (median and 1.4826 MAD of the
//                                     annulus pixels)
//             net = sum - area bg     DERIVED
//             net error               DERIVED, under an ASSUMED noise model:
//                                     background-limited, sigma^2 = area s^2 +
//                                     area^2 (pi/2) s^2 / N_annulus (the
//                                     median's error), plus net / gain when a
//                                     gain is given (Poisson)
//             centroid                MEASURED, the first moment of
//                                     (value - bg) inside the circle
//
//   bits    a flag image (a mask): the pixels inside the circle (or the whole
//           image) with a given bit set. Reported: their count, the centroid
//           of their centers, and - with a world coordinate system - its sky
//           position and the area on the sky (MEASURED count; DERIVED sky).
//
// Pixel (0, 0) is the center of the first pixel, as ./image.js draws it; x
// runs along a row. The image is { width, height, values } of
// gravitas.observation/1.
// =============================================================================

export const VERSION = '1.0.0';
const SUB = 8;

export class ApertureError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ApertureError';
    this.code = code;
    this.detail = detail;
  }
}

/** The fraction of pixel (i, j) inside the circle, by sub-sampling its edge. */
function covered(i, j, x, y, r) {
  const dx = Math.abs(i - x);
  const dy = Math.abs(j - y);
  const near = Math.hypot(Math.max(0, dx - 0.5), Math.max(0, dy - 0.5));
  const far = Math.hypot(dx + 0.5, dy + 0.5);
  if (far <= r) return 1;
  if (near > r) return 0;
  let n = 0;
  for (let a = 0; a < SUB; a++) {
    for (let b = 0; b < SUB; b++) {
      const u = i - 0.5 + (a + 0.5) / SUB;
      const v = j - 0.5 + (b + 0.5) / SUB;
      if ((u - x) ** 2 + (v - y) ** 2 <= r * r) n++;
    }
  }
  return n / (SUB * SUB);
}

function median(a) {
  const s = Float64Array.from(a).sort();
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

function check(image, { x, y, r }) {
  const { width: W, height: H, values } = image;
  if (!(W > 0 && H > 0) || values?.length !== W * H)
    throw new ApertureError(
      'image',
      'the image does not hold width x height pixels'
    );
  if (![x, y, r].every(Number.isFinite) || !(r > 0))
    throw new ApertureError(
      'aperture',
      'the aperture needs a center and a positive radius'
    );
  if (x < -0.5 || y < -0.5 || x > W - 0.5 || y > H - 0.5)
    throw new ApertureError('outside', 'the aperture center is off the image');
}

/**
 * @param {{width: number, height: number, values: ArrayLike<number>}} image
 * @param {{x: number, y: number, r: number, rIn: number, rOut: number,
 *   gain?: number|null}} a - Pixels; gain in electrons per unit, if known
 */
export function measureFlux(image, a) {
  check(image, a);
  const { x, y, r, rIn, rOut, gain = null } = a;
  if (!(rIn >= r && rOut > rIn))
    throw new ApertureError(
      'annulus',
      'the annulus must lie outside the aperture: r <= rIn < rOut'
    );
  const { width: W, height: H, values } = image;
  const annulus = [];
  let sum = 0;
  let area = 0;
  let edge = false;
  const inside = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = values[j * W + i];
      if (!Number.isFinite(v)) continue;
      const d = Math.hypot(i - x, j - y);
      if (d >= rIn && d <= rOut) annulus.push(v);
      const f = covered(i, j, x, y, r);
      if (f > 0) {
        sum += f * v;
        area += f;
        inside.push([i, j, f, v]);
      }
    }
  }
  // The circle cut by the image's edge measures less than a circle.
  const full = Math.PI * r * r;
  if (area < full * 0.999) edge = true;
  if (annulus.length < 8)
    throw new ApertureError(
      'annulusPixels',
      `the annulus holds ${annulus.length} pixels; it needs at least 8`,
      { n: annulus.length }
    );
  const bg = median(annulus);
  const mad = median(annulus.map(v => Math.abs(v - bg)));
  const s = 1.4826 * mad;
  const net = sum - area * bg;
  let variance =
    area * s * s + (area * area * (Math.PI / 2) * (s * s)) / annulus.length;
  if (gain > 0 && net > 0) variance += net / gain;
  let mx = 0;
  let my = 0;
  let w = 0;
  let vx = 0;
  let vy = 0;
  for (const [i, j, f, v] of inside) {
    const q = f * (v - bg);
    mx += q * i;
    my += q * j;
    w += q;
  }
  let cx = null;
  let cy = null;
  if (w > 0) {
    cx = mx / w;
    cy = my / w;
    for (const [i, j, f] of inside) {
      vx += (f * s * (i - cx)) ** 2;
      vy += (f * s * (j - cy)) ** 2;
    }
  }
  const warnings = [{ code: 'noiseModelAssumed', gain: gain ?? null }];
  if (edge) warnings.push({ code: 'apertureCut' });
  if (!(net > 0)) warnings.push({ code: 'noSource' });
  return {
    version: VERSION,
    mode: 'flux',
    sum,
    area,
    background: bg,
    backgroundScatter: s,
    annulusPixels: annulus.length,
    net,
    netError: Math.sqrt(variance),
    centroid:
      cx === null
        ? null
        : {
            x: cx,
            y: cy,
            xError: Math.sqrt(vx) / w,
            yError: Math.sqrt(vy) / w,
          },
    warnings,
  };
}

/**
 * @param {{width: number, height: number, values: ArrayLike<number>}} image
 * @param {{bit: number, x?: number, y?: number, r?: number}} a - A bit value
 *   (1, 2, 4...); no circle means the whole image
 * @param {{skyOf?: (x: number, y: number) => {ra: number, dec: number},
 *   pixelArea?: number}} [wcs] - skyOf takes this module's pixel indices;
 *   pixelArea is square arcseconds a pixel
 */
export function measureBits(image, a, wcs = {}) {
  const { width: W, height: H, values } = image;
  if (!(W > 0 && H > 0) || values?.length !== W * H)
    throw new ApertureError(
      'image',
      'the image does not hold width x height pixels'
    );
  if (!(Number.isInteger(a.bit) && a.bit > 0 && (a.bit & (a.bit - 1)) === 0))
    throw new ApertureError('bit', 'a bit is a power of two');
  const circle = a.r !== undefined;
  if (circle) check(image, a);
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (!(values[j * W + i] & a.bit)) continue;
      if (circle && Math.hypot(i - a.x, j - a.y) > a.r) continue;
      n++;
      sx += i;
      sy += j;
    }
  }
  const centroid = n ? { x: sx / n, y: sy / n } : null;
  const sky = centroid && wcs.skyOf ? wcs.skyOf(centroid.x, centroid.y) : null;
  const skyArea = wcs.pixelArea ? n * wcs.pixelArea : null;
  return {
    version: VERSION,
    mode: 'bits',
    bit: a.bit,
    count: n,
    centroid,
    sky,
    skyArea,
    warnings: n ? [] : [{ code: 'noPixels' }],
  };
}
