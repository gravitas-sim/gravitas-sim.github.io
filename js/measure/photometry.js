// =============================================================================
// Photometry on any quantitative frame: adapters over the existing reduction
// -----------------------------------------------------------------------------
// js/kernels/detector/reduce.js holds the photometry (the clipped annulus
// background, the CCD equation, the aperture sum); this module does not repeat
// it. It adapts a frame of the data kinds (js/dataKinds/contract.js: pixel
// units, gain, read noise, saturation, mask, variance) to the kernel's inputs,
// and adds what the kernel lacks: sub-pixel aperture edges, a local plane
// background, a weighted centroid, a batch over a marks table, the curve of
// growth and the record. PHOTOMETRY.md has the equations and the limits; no PSF
// is fitted and no neighbour is deblended.
//
// Coordinates here are the kernel's: pixel (0, 0) is the centre of the first
// pixel, x runs along a row (the panel converts from FITS, which starts at 1).
// A frame is { width, height, data, sidecar?, mask?, variance?, id }.
//
// Every refusal is { ok: false, code, ... } and carries no number: a frame that
// is not light, a saturated or masked aperture, a crowded neighbour, an edge.
// Pure; async only to give the page a turn between sources of a batch.
// =============================================================================

import { num } from '../csv.js';
import {
  VERSION as KERNEL_VERSION,
  aperturePhotometry,
  aperturePixels,
  estimateBackground,
  median,
} from '../kernels/detector/reduce.js';

const { Math, Float64Array } = globalThis;

export const VERSION = 1;
/** The ratios the lessons and the tests use, in FWHM: aperture, annulus. */
export const FWHM_RATIOS = Object.freeze({ r: 1.5, rIn: 3, rOut: 5 });
/** A Gaussian's sigma over its FWHM, and the centroid weight's width over FWHM. */
const SIGMA_PER_FWHM = 1 / (2 * Math.sqrt(2 * Math.LN2));
export const SIGMA_DETECT = 3;
/** astropy's mad_std: 1.4826 to nine digits (the kernel's own clip uses 1.4826). */
const MAD_STD = 1.482602218505602;

/** Aperture radii and centroid window for a PSF of this FWHM, pixels. */
export const apertureFor = fwhm => ({
  r: FWHM_RATIOS.r * fwhm,
  rIn: FWHM_RATIOS.rIn * fwhm,
  rOut: FWHM_RATIOS.rOut * fwhm,
  half: Math.ceil(4 * SIGMA_PER_FWHM * fwhm),
  sigmaW: SIGMA_PER_FWHM * fwhm,
});

const refuse = (code, extra = {}) => ({ ok: false, code, ...extra });

// ---- the contract -> the kernel's inputs --------------------------------------

/** Working units: the factor from the data's unit to electrons, or null if gain is needed and absent. */
function toElectrons(side, gain) {
  const u = side.pixels.unit;
  const t = side.exposure?.seconds ?? 1;
  const f = { adu: gain, 'adu/s': gain * t, electron: 1, 'electron/s': t };
  return u in f ? f[u] : u === 'count/s' ? t : 1;
}

/**
 * What the kernel needs from a frame, or why not.
 * @param {object} frame
 * @param {(sidecar: object, op: string) => {ok: boolean, code?: string, missing?: string[]}} check
 *   js/dataKinds/contract.js permits, passed in (the instrument holds the one copy)
 * @returns {{ok: true, image: object, readNoise: number, limit: number, mask: ?ArrayLike, variance: ?Float64Array, route: string, unit: string, exposure: number}|{ok: false, code: string}}
 */
export function adapt(frame, check) {
  const side = frame.sidecar;
  if (!side) return refuse('no-contract');
  const ok = check(side, 'photometry');
  if (!ok.ok) return refuse(ok.code, ok.missing ? { missing: ok.missing } : {});
  if (side.calibration.state === 'raw') return refuse('raw-frame');
  const p = side.pixels;
  const route = frame.variance && side.planes?.variance ? 'variance' : 'ccd';
  if (route === 'ccd' && !(p.gain && p.readNoise))
    return refuse('incomplete-contract', { missing: ['planes.variance'] });
  const seconds = side.exposure.seconds;
  // The variance route stays in the data's own unit; the CCD route needs electrons.
  const f = route === 'ccd' ? toElectrons(side, p.gain?.value) : 1;
  const limits = [p.linearity.limit, p.saturation.level].filter(
    Number.isFinite
  );
  const limit = Math.min(...limits, Infinity) * f;
  return {
    ok: true,
    route,
    exposure: seconds,
    readNoise: p.readNoise?.value ?? 0,
    unit: route === 'ccd' ? 'electron' : p.unit,
    limit,
    mask: frame.mask ?? null,
    variance: route === 'variance' ? frame.variance : null,
    image: {
      width: frame.width,
      height: frame.height,
      exposure: seconds,
      values: f === 1 ? frame.data : Float64Array.from(frame.data, v => v * f),
    },
  };
}

// ---- geometry ---------------------------------------------------------------------

/** ∫ sqrt(r² - u²) du from 0 to x, for |x| <= r. */
const disc = (x, r) =>
  0.5 * (x * Math.sqrt(Math.max(0, r * r - x * x)) + r * r * Math.asin(x / r));

/** Area of a disc of radius r about the origin inside [x0, x1] x [y0, y1]. */
function overlap(x0, x1, y0, y1, r) {
  const cuts = [Math.max(x0, -r), Math.min(x1, r)];
  if (cuts[0] >= cuts[1]) return 0;
  for (const y of [y0, y1])
    if (Math.abs(y) < r) {
      const u = Math.sqrt(r * r - y * y);
      for (const c of [-u, u]) if (c > cuts[0] && c < cuts[1]) cuts.push(c);
    }
  cuts.sort((a, b) => a - b);
  let area = 0;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const a = cuts[k];
    const b = cuts[k + 1];
    const s = Math.sqrt(Math.max(0, r * r - (0.5 * (a + b)) ** 2));
    const top = Math.min(y1, s);
    const bottom = Math.max(y0, -s);
    if (top <= bottom) continue;
    const g = disc(b, r) - disc(a, r);
    area += (s < y1 ? g : y1 * (b - a)) - (-s > y0 ? -g : y0 * (b - a));
  }
  return area;
}

/**
 * The fraction of each pixel inside a circle, exactly: [index, fraction] for
 * every pixel the circle touches, in row order. Pixels are unit squares about
 * integer centres; those off the frame are left out.
 */
export function exactWeights(width, height, x, y, r) {
  const out = [];
  const j0 = Math.max(0, Math.floor(y - r - 0.5));
  const j1 = Math.min(height - 1, Math.ceil(y + r + 0.5));
  const i0 = Math.max(0, Math.floor(x - r - 0.5));
  const i1 = Math.min(width - 1, Math.ceil(x + r + 0.5));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const dx = Math.abs(i - x);
      const dy = Math.abs(j - y);
      if (Math.hypot(dx + 0.5, dy + 0.5) <= r) {
        out.push([j * width + i, 1]);
        continue;
      }
      if (Math.hypot(Math.max(0, dx - 0.5), Math.max(0, dy - 0.5)) >= r)
        continue;
      const w = overlap(i - x - 0.5, i - x + 0.5, j - y - 0.5, j - y + 0.5, r);
      if (w > 0) out.push([j * width + i, w]);
    }
  return out;
}

/** The annulus' pixels as [index, dx, dy], the kernel's rule: rIn < d <= rOut, unmasked. */
function annulus(img, x, y, rIn, rOut, mask) {
  const { width: W, height: H } = img;
  const out = [];
  for (
    let j = Math.max(0, Math.floor(y - rOut));
    j <= Math.min(H - 1, Math.ceil(y + rOut));
    j++
  )
    for (
      let i = Math.max(0, Math.floor(x - rOut));
      i <= Math.min(W - 1, Math.ceil(x + rOut));
      i++
    ) {
      const d = Math.hypot(i - x, j - y);
      const k = j * W + i;
      if (
        d > rIn &&
        d <= rOut &&
        !(mask && mask[k]) &&
        Number.isFinite(img.values[k])
      )
        out.push([k, i - x, j - y]);
    }
  return out;
}

// ---- the local plane background -----------------------------------------------------

/** Solve the 3 x 3 system A c = b (A symmetric positive definite) by Cramer's rule; null if singular. */
function solve3(A, b) {
  const det = m =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (!(Math.abs(d) > 0)) return null;
  return [0, 1, 2].map(
    c => det(A.map((row, i) => row.map((v, j) => (j === c ? b[i] : v)))) / d
  );
}

/**
 * A plane through the annulus: z = a + b dx + c dy about the aperture's centre,
 * by least squares with the clip astropy's FittingWithOutlierRemoval applies
 * (median centre, mad_std, 3 sigma, the clipped pixels kept out, at most four
 * rounds). Gives the plane summed under a set of weights and what it costs in
 * noise, as `n`, the number of annulus pixels that would give the same
 * uncertainty to a flat sky (what the CCD equation's n_background means).
 * @returns {?{level: number, n: number, scatter: number, pixels: number, intercept: number, slope: number[]}}
 */
export function planeBackground(
  img,
  { x, y, rIn, rOut, mask = null, weights }
) {
  const pts = annulus(img, x, y, rIn, rOut, mask);
  if (pts.length < 12) return null;
  const z = pts.map(p => img.values[p[0]]);
  let keep = pts.map(() => true);
  let c = null;
  const fit = () => {
    const A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const b = [0, 0, 0];
    pts.forEach((p, i) => {
      if (!keep[i]) return;
      const t = [1, p[1], p[2]];
      for (let m = 0; m < 3; m++) {
        b[m] += t[m] * z[i];
        for (let n = 0; n < 3; n++) A[m][n] += t[m] * t[n];
      }
    });
    return { A, c: solve3(A, b) };
  };
  let f = fit();
  if (!f.c) return null;
  for (let it = 0; it < 4; it++) {
    const res = pts.map(
      (p, i) => z[i] - (f.c[0] + f.c[1] * p[1] + f.c[2] * p[2])
    );
    const live = res.filter((_, i) => keep[i]);
    const m = median(live);
    const s = MAD_STD * median(live.map(v => Math.abs(v - m)));
    let changed = false;
    res.forEach((v, i) => {
      if (keep[i] && Math.abs(v - m) > 3 * s) {
        keep[i] = false;
        changed = true;
      }
    });
    if (!changed) break;
    f = fit();
    if (!f.c) return null;
    c = f.c;
  }
  c = f.c;
  const n = keep.filter(Boolean).length;
  let rss = 0;
  pts.forEach((p, i) => {
    if (keep[i]) rss += (z[i] - (c[0] + c[1] * p[1] + c[2] * p[2])) ** 2;
  });
  const scatter = Math.sqrt(rss / (n - 3));
  // The plane summed under the weights: a . c, with a = sum of w (1, dx, dy).
  const a = [0, 0, 0];
  let area = 0;
  for (const [k, w] of weights) {
    a[0] += w;
    a[1] += w * ((k % img.width) - x);
    a[2] += w * (Math.floor(k / img.width) - y);
    area += w;
  }
  const level = (a[0] * c[0] + a[1] * c[1] + a[2] * c[2]) / area;
  // Var(a . c) = s2 a' (X'X)^-1 a: solve (X'X) u = a, then a . u.
  const u = solve3(f.A, a);
  const quad = u ? a[0] * u[0] + a[1] * u[1] + a[2] * u[2] : NaN;
  return {
    level,
    n: (area * area) / quad,
    scatter,
    pixels: n,
    intercept: c[0],
    slope: [c[1], c[2]],
  };
}

// ---- the weighted centroid -------------------------------------------------------------

/**
 * A centroid of the light in a window, the window moved to the rounded position
 * until it stops. `sigmaW` 0 weights each pixel by its flux above the sky (the
 * centre of mass photutils' centroid_com computes); with `sigmaW` the flux is
 * also weighted by a Gaussian about the current position, iterated to a fixed
 * point (a windowed centroid in the manner of SExtractor's XWIN). The
 * uncertainty is first-order from the pixels' variance, weights held fixed.
 * @param {{width, height, values}} img
 * @param {{x: number, y: number, half: number, sigmaW?: number, sky?: number,
 *   readNoise?: number, variance?: ArrayLike, mask?: ArrayLike}} o
 * @returns {{ok: true, x, y, sigmaX, sigmaY, iterations, window: number[]}|{ok: false, code: string}}
 */
export function centroid(img, o) {
  const { width: W, height: H, values } = img;
  const {
    half,
    sigmaW = 0,
    sky = 0,
    readNoise = 0,
    variance = null,
    mask = null,
  } = o;
  let cx = o.x;
  let cy = o.y;
  const k = sigmaW > 0 ? -1 / (2 * sigmaW * sigmaW) : 0;
  const seen = new Set();
  for (let it = 1; it <= (k ? 500 : 50); it++) {
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    if (ix - half < 0 || iy - half < 0 || ix + half >= W || iy + half >= H)
      return refuse('edge');
    seen.add(`${ix},${iy}`);
    let s = 0;
    let sx = 0;
    let sy = 0;
    for (let j = iy - half; j <= iy + half; j++)
      for (let i = ix - half; i <= ix + half; i++) {
        const p = j * W + i;
        if (mask?.[p] || !Number.isFinite(values[p])) continue;
        const w = k
          ? (values[p] - sky) * Math.exp(k * ((i - cx) ** 2 + (j - cy) ** 2))
          : values[p] - sky;
        s += w;
        sx += w * i;
        sy += w * j;
      }
    if (!(s > 0)) return refuse('no-flux');
    const nx = sx / s;
    const ny = sy / s;
    const moved = Math.hypot(nx - cx, ny - cy);
    cx = nx;
    cy = ny;
    const next = `${Math.round(cx)},${Math.round(cy)}`;
    // Flux weights settle when the window stays; a centroid on the edge between
    // two windows gives each a position on the other's side, and the loop would
    // go on for ever: it stops on the first window it has been in, and says so.
    const tie = !k && next !== `${ix},${iy}` && seen.has(next);
    if (k ? moved < 1e-7 : next === `${ix},${iy}` || tie) {
      // The estimate solves sum g I (x - c) = 0 about the fixed weights' own
      // centre, so its error is J^-1 S J^-T: S the pixels' variance, J the
      // equation's slope in c (the weights move with c: the 1 - dx^2/sigma_w^2).
      const q = -2 * k;
      let [sxx, sxy, syy, dxx, dxy, dyy] = [0, 0, 0, 0, 0, 0];
      for (let j = iy - half; j <= iy + half; j++)
        for (let i = ix - half; i <= ix + half; i++) {
          const p = j * W + i;
          if (mask?.[p] || !Number.isFinite(values[p])) continue;
          const dx = i - cx;
          const dy = j - cy;
          const g = k ? Math.exp(k * (dx * dx + dy * dy)) : 1;
          const v = variance
            ? variance[p]
            : Math.max(values[p], 0) + readNoise * readNoise;
          const gI = g * (values[p] - sky);
          sxx += g * g * v * dx * dx;
          sxy += g * g * v * dx * dy;
          syy += g * g * v * dy * dy;
          dxx += gI * (1 - q * dx * dx);
          dyy += gI * (1 - q * dy * dy);
          dxy -= gI * q * dx * dy;
        }
      const det = dxx * dyy - dxy * dxy;
      const out = {
        ok: true,
        x: cx,
        y: cy,
        sigmaX: Math.sqrt(
          (dyy * dyy * sxx - 2 * dyy * dxy * sxy + dxy * dxy * syy) /
            (det * det)
        ),
        sigmaY: Math.sqrt(
          (dxy * dxy * sxx - 2 * dxy * dxx * sxy + dxx * dxx * syy) /
            (det * det)
        ),
        iterations: it,
        window: [ix, iy],
      };
      if (tie) out.tie = true;
      return out;
    }
  }
  return refuse('not-converged');
}

// ---- one source, a batch, the curve of growth ------------------------------------------

/**
 * Photometry of one source through the kernel.
 * @param {object} a - adapt()'s result
 * @param {{x: number, y: number, r: number, rIn: number, rOut: number,
 *   weighting?: 'exact'|'center', background?: 'annulus'|'plane',
 *   recentre?: {half: number, sigmaW?: number}}} s - Pixels, 0-based
 */
export function measure(a, s) {
  const { image } = a;
  const { width: W, height: H } = image;
  const weighting = s.weighting ?? 'exact';
  const out = {
    ok: true,
    version: VERSION,
    weighting,
    background: s.background ?? 'annulus',
    warnings: [],
  };
  let { x, y } = s;
  if (s.recentre) {
    const sky = estimateBackground(image, {
      x,
      y,
      rIn: s.rIn,
      rOut: s.rOut,
      mask: a.mask,
    });
    if (!(sky.n >= 20)) return refuse('annulus', { pixels: sky.n });
    const c = centroid(image, {
      ...s.recentre,
      x,
      y,
      sky: sky.level,
      readNoise: a.readNoise,
      variance: a.variance,
      mask: a.mask,
    });
    if (!c.ok) return refuse('centroid', { reason: c.code });
    out.centroid = c;
    ({ x, y } = c);
  }
  if (
    x - s.r < -0.5 ||
    y - s.r < -0.5 ||
    x + s.r > W - 0.5 ||
    y + s.r > H - 0.5
  )
    return refuse('edge');
  const cover =
    weighting === 'exact'
      ? exactWeights(W, H, x, y, s.r)
      : aperturePixels(image, x, y, s.r).map(i => [i, 1]);
  let masked = 0;
  let hot = 0;
  for (const [i] of cover) {
    if (a.mask?.[i] || !Number.isFinite(image.values[i])) masked++;
    else if (image.values[i] >= a.limit) hot++;
  }
  // A caller that has repaired its masked pixels (Prompt 185's cosmic-ray
  // replacement) may measure through them and be told how many there were.
  if (masked && !s.maskedOk) return refuse('masked', { pixels: masked });
  if (hot) return refuse('saturated', { pixels: hot });
  let plane = null;
  if (out.background === 'plane') {
    plane = planeBackground(image, {
      x,
      y,
      rIn: s.rIn,
      rOut: s.rOut,
      mask: a.mask,
      weights: cover,
    });
    if (!plane) return refuse('annulus', { pixels: 0 });
  }
  const p = aperturePhotometry(image, {
    x,
    y,
    r: s.r,
    rIn: s.rIn,
    rOut: s.rOut,
    readNoise: a.readNoise,
    mask: a.mask,
    weights: cover,
    background: plane,
    darkPerPixel: s.darkPerPixel,
    extraVariance: s.extraVariance,
  });
  const bg = p.background;
  if (!(bg.n >= 20)) return refuse('annulus', { pixels: bg.n });
  let sigma = p.sigma;
  if (a.route === 'variance') {
    // Noise from the variance plane: the aperture's pixels (area weighted, as
    // photutils does), and the sky's estimate over the pixels that made it.
    let v = 0;
    for (const [i, w] of cover) v += w * a.variance[i];
    const ring = annulus(image, x, y, s.rIn, s.rOut, a.mask);
    const mean = ring.reduce((t, q) => t + a.variance[q[0]], 0) / ring.length;
    out.sourceVariance = v;
    sigma = Math.sqrt(v + (p.npix * p.npix * mean) / bg.n);
  }
  const snr = p.net / sigma;
  const detected = snr >= SIGMA_DETECT;
  Object.assign(out, {
    x,
    y,
    r: s.r,
    rIn: s.rIn,
    rOut: s.rOut,
    net: p.net,
    sigma,
    snr,
    sky: p.sky,
    skySigma: bg.scatter / Math.sqrt(bg.n),
    skyScatter: bg.scatter,
    skyPixels: bg.n,
    maskedPixels: masked,
    area: p.npix,
    terms: p.terms,
    detected,
    upperLimit: detected ? null : SIGMA_DETECT * sigma,
    unit: a.unit,
    exposure: a.exposure,
    node: p.node,
  });
  // The instrumental magnitude, -2.5 log10 of the rate in electrons a second;
  // a nondetection has the magnitude of its limit instead.
  if (detected) {
    out.mag = -2.5 * Math.log10(p.net / a.exposure);
    out.magSigma = (2.5 / Math.LN10) * (sigma / p.net);
  } else out.magLimit = -2.5 * Math.log10((SIGMA_DETECT * sigma) / a.exposure);
  return out;
}

/**
 * The sources whose apertures reach another's annulus: for each, the ids that
 * make it crowded. Two sources are crowded when the distance between them is
 * less than one's outer annulus radius plus the other's aperture radius.
 */
export function crowding(sources) {
  return sources.map(s =>
    sources
      .filter(o => o !== s && Math.hypot(o.x - s.x, o.y - s.y) < s.rOut + o.r)
      .map(o => o.id)
  );
}

/**
 * A batch over a marks table: each source measured (centred first, when it asks)
 * or refused, in order, and the page given a turn every `chunk` sources. A
 * crowded source is flagged and not measured. Ten sources take milliseconds; a
 * thousand on a large frame a second or two, which is why the loop gives way
 * and can be cancelled rather than running in a Worker (the pool's adoption
 * waits for room in the install: D-R10-30).
 * @param {object} frame
 * @param {Array<{id: string, x: number, y: number, r: number, rIn: number, rOut: number}>} sources
 * @param {{check: Function, chunk?: number, signal?: {aborted: boolean},
 *   onProgress?: (done: number, total: number) => void, yieldNow?: () => Promise<void>}} o
 */
export async function measureBatch(frame, sources, o) {
  const a = adapt(frame, o.check);
  if (!a.ok) return { ...a, results: [] };
  const crowd = crowding(sources);
  const results = [];
  const turn = o.yieldNow ?? (() => new Promise(r => setTimeout(r, 0)));
  for (let k = 0; k < sources.length; k++) {
    if (o.signal?.aborted) return { ok: true, cancelled: true, results };
    const s = sources[k];
    results.push({
      id: s.id,
      request: s,
      ...(crowd[k].length
        ? refuse('crowded', { with: crowd[k] })
        : measure(a, s)),
    });
    o.onProgress?.(k + 1, sources.length);
    if ((k + 1) % (o.chunk ?? 25) === 0) await turn();
  }
  return { ok: true, cancelled: false, results, route: a.route };
}

/**
 * The curve of growth: the net flux inside each radius with the sky held at the
 * one value of an annulus beyond the largest, and the radius at which the curve
 * stops rising by more than its own error.
 * @returns {{ok: true, radii: number[], net: number[], sigma: number[], plateau: number}|{ok: false, code: string}}
 */
export function curveOfGrowth(a, s, radii) {
  const rIn = Math.max(s.rIn, ...radii);
  const rOut = Math.max(s.rOut, rIn + 2);
  const net = [];
  const sigma = [];
  for (const r of radii) {
    const m = measure(a, { ...s, r, rIn, rOut });
    if (!m.ok) return m;
    net.push(m.net);
    sigma.push(m.sigma);
  }
  const top = net[net.length - 1];
  const k = net.findIndex((v, i) => Math.abs(top - v) <= sigma[i]);
  return { ok: true, radii, net, sigma, plateau: radii[k] };
}

// ---- the record, its replay and the table as CSV ----------------------------------

export const STEP = 'image-photometry';
/** The one-sided probability of a 3 sigma upper limit. */
const LIMIT_LEVEL = 0.99865;

/**
 * The results as the envelope's quantities (Prompt 150's uncertainty kinds):
 * a measured source gives a flux with its sigma, a nondetection an upper limit,
 * a refused source a failed flux that says why. Positions are FITS (from 1).
 * @param {Array<object>} results - measureBatch's results
 * @param {{unit: string}} o - The working unit of the frame ('electron' is `count`)
 */
export function quantitiesOf(results, o) {
  const count = o.unit === 'electron' ? 'count' : null;
  const out = [];
  const q = (id, label, value, unit, origin, uncertainty) =>
    out.push({ id, label, value, unit, origin, uncertainty });
  for (const r of results) {
    const head = `${r.id}: `;
    if (!r.ok) {
      q(`${r.id}.net`, `${head}net flux`, null, count, 'measured', {
        kind: 'failed',
        reason: r.code,
      });
      continue;
    }
    const at = r.centroid
      ? { kind: 'sigma', basis: 'data' }
      : { kind: 'assumed' };
    const pos = (axis, v, sigma) =>
      q(
        `${r.id}.${axis}`,
        `${head}${axis}`,
        v + 1,
        'pix',
        r.centroid ? 'measured' : 'assumed',
        r.centroid ? { ...at, sigma } : at
      );
    pos('x', r.x, r.centroid?.sigmaX);
    pos('y', r.y, r.centroid?.sigmaY);
    q(
      `${r.id}.net`,
      `${head}net flux`,
      r.detected ? r.net : r.upperLimit,
      count,
      'measured',
      r.detected
        ? { kind: 'sigma', sigma: r.sigma, basis: 'derived' }
        : {
            kind: 'limit',
            bound: 'upper',
            basis: 'derived',
            level: LIMIT_LEVEL,
          }
    );
    q(`${r.id}.snr`, `${head}signal to noise`, r.snr, null, 'derived', {
      kind: 'none',
    });
    q(`${r.id}.sky`, `${head}sky per pixel`, r.sky, count, 'measured', {
      kind: 'sigma',
      sigma: r.skySigma,
      basis: 'data',
    });
    if (r.detected)
      q(
        `${r.id}.mag`,
        `${head}instrumental magnitude`,
        r.mag,
        'mag',
        'derived',
        {
          kind: 'sigma',
          sigma: r.magSigma,
          basis: 'derived',
        }
      );
    else
      q(`${r.id}.mag`, `${head}magnitude limit`, r.magLimit, 'mag', 'derived', {
        kind: 'limit',
        bound: 'lower',
        basis: 'derived',
        level: LIMIT_LEVEL,
      });
  }
  return out;
}

/**
 * What lets a record be run again: the frame's identity, the route the noise
 * took, and each source's request (where it was clicked, the radii, the
 * weighting, the background, the centring) with what came out.
 */
export function reductionOf(frame, digest, a, results) {
  return {
    step: STEP,
    version: VERSION,
    kernel: { tool: 'aperturePhotometry', version: KERNEL_VERSION },
    route: a.route,
    unit: a.unit,
    exposure: a.exposure,
    frame: { id: frame.id, width: frame.width, height: frame.height, digest },
    sources: results.map(r => ({
      id: r.id,
      request: r.request,
      result: r.ok
        ? { x: r.x, y: r.y, net: r.net, sigma: r.sigma, detected: r.detected }
        : { code: r.code },
    })),
  };
}

/**
 * Run a record again on the frame now open: refuse if its pixels changed, then
 * measure each request and say whether every result is bit-identical or within
 * a part in 1e9 (another browser's Math.exp and asin).
 * @param {object} red - A reduction of reductionOf
 * @returns {Promise<{ok: false, code: string}|{ok: true, identical: boolean, agrees: boolean, differ: string[]}>}
 */
export async function replay(red, frame, { check, digest }) {
  if (
    frame.width !== red.frame.width ||
    frame.height !== red.frame.height ||
    (await digest(frame)) !== red.frame.digest
  )
    return refuse('image-changed');
  const a = adapt(frame, check);
  if (!a.ok) return a;
  const differ = [];
  let agrees = true;
  for (const s of red.sources) {
    const m = measure(a, s.request);
    const want = s.result;
    const same = m.ok
      ? ['x', 'y', 'net', 'sigma'].every(k => Object.is(m[k], want[k]))
      : m.code === want.code;
    const close = m.ok
      ? ['x', 'y', 'net', 'sigma'].every(
          k => Math.abs(m[k] - want[k]) <= 1e-9 * Math.max(1, Math.abs(want[k]))
        )
      : same;
    if (!same) differ.push(s.id);
    if (!close) agrees = false;
  }
  return { ok: true, identical: !differ.length, agrees, differ };
}

/** The results table as CSV rows through js/csv.js; the header is the reader's words. */
export function csvRows(results, header) {
  return [
    header,
    ...results.map(r =>
      r.ok
        ? [
            r.id,
            num(r.x + 1),
            num(r.y + 1),
            num(r.detected ? r.net : r.upperLimit),
            num(r.sigma),
            num(r.snr),
            num(r.sky),
            num(r.skySigma),
            num(r.detected ? r.mag : r.magLimit),
            num(r.detected ? r.magSigma : NaN),
            r.detected ? 'measured' : 'upper limit',
          ]
        : [r.id, '', '', '', '', '', '', '', '', '', r.code]
    ),
  ];
}
