// =============================================================================
// Source detection and the point-spread function (Prompt 183, DETECTION.md)
// -----------------------------------------------------------------------------
// A list of the sources in a frame - position, peak, flux (Prompt 180's
// aperture), shape moments and flags - and the PSF measured from the stars in
// it: a pixel-integrated Gaussian or Moffat fitted to each, their FWHMs
// combined with an uncertainty, and the stacked radial profile.
//
//   background   the clipped median and standard deviation of 16 pixel boxes,
//                bilinear between box centres (the outer intervals continued
//                linearly to the border)
//   detection    the background-subtracted image smoothed by a Gaussian of
//                the PSF's FWHM (edges repeated, masked pixels removed and the
//                weights renormalised), against sigma times the smoothed noise
//                computed from those same weights; 8-connected runs of at
//                least `minArea` pixels; no deblending
//   properties   photutils SourceCatalog's definitions on the unsmoothed
//                background-subtracted values of the segment
//   PSF          Levenberg-Marquardt on the pixels about each star with
//                Poisson weights, the covariance from the weighted normal
//                equations (js/numeric/linalg.js)
//
// Pixel (0, 0) is the centre of the first pixel, x along a row, as in
// js/measure/photometry.js, whose `adapt` supplies the electrons, the mask and
// the saturation limit, and whose `measure` is the flux. Every refusal is
// { ok: false, code } and carries no number. Pure; no DOM.
// =============================================================================

import { invertSpd, solveSpd } from '../numeric/linalg.js';
import { adapt, apertureFor, crowding, measure } from './photometry.js';

const { Math, Float64Array, Int32Array, Uint8Array } = globalThis;

export const VERSION = 1;
export const DEFAULTS = Object.freeze({
  box: 16,
  fwhm: 3,
  sigma: 4,
  minArea: 5,
  maxSources: 2000,
});
const CLIP_SIGMA = 3;
const CLIP_ITERATIONS = 10;
const SIGMA_PER_FWHM = 1 / (2 * Math.sqrt(2 * Math.LN2));
const SHARP = 0.5;
/** The thresholds the PSF selection and the model-limited label use (DETECTION.md). */
export const SELECT = Object.freeze({
  snr: 30,
  ellipticity: 0.3,
  stars: 25,
  chi2: 1.5,
});

const refuse = (code, extra = {}) => ({ ok: false, code, ...extra });

// ---- the background ------------------------------------------------------------

const medianOf = a => {
  const n = a.length;
  const s = Float64Array.from(a).sort();
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};

/** astropy's sigma_clip (3 sigma, median centre, std, 10 iterations) then median and std. */
function clipped(values) {
  const std = v => {
    let mean = 0;
    for (const x of v) mean += x;
    mean /= v.length;
    let s2 = 0;
    for (const x of v) s2 += (x - mean) * (x - mean);
    return Math.sqrt(s2 / v.length);
  };
  let v = values;
  for (let it = 0; it < CLIP_ITERATIONS && v.length > 1; it++) {
    const c = medianOf(v);
    const s = CLIP_SIGMA * std(v);
    const keep = v.filter(x => x >= c - s && x <= c + s);
    if (keep.length === v.length) break;
    v = keep;
  }
  return v.length ? { level: medianOf(v), noise: std(v), n: v.length } : null;
}

const edges = (n, box) =>
  Array.from({ length: Math.ceil(n / box) }, (_, k) => [
    k * box,
    Math.min(n, (k + 1) * box),
  ]);

/**
 * The mesh: one clipped median and standard deviation per box, over the pixels
 * that are finite, unmasked and below `limit`; a box with fewer than 10 takes
 * the mean of its neighbours' values.
 * @param {{width: number, height: number, values: ArrayLike<number>}} image
 */
export function backgroundMesh(image, { box, mask = null, limit = Infinity }) {
  const { width: W, height: H, values } = image;
  const xs = edges(W, box);
  const ys = edges(H, box);
  const nx = xs.length;
  const level = new Float64Array(nx * ys.length).fill(NaN);
  const noise = new Float64Array(nx * ys.length).fill(NaN);
  ys.forEach(([y0, y1], by) =>
    xs.forEach(([x0, x1], bx) => {
      const v = [];
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const p = y * W + x;
          if (!mask?.[p] && Number.isFinite(values[p]) && values[p] < limit)
            v.push(values[p]);
        }
      const c = v.length >= 10 ? clipped(v) : null;
      if (c) {
        level[by * nx + bx] = c.level;
        noise[by * nx + bx] = c.noise;
      }
    })
  );
  for (const m of [level, noise])
    for (let pass = 0; pass < nx + ys.length; pass++) {
      const next = m.slice();
      let open = 0;
      for (let i = 0; i < m.length; i++)
        if (Number.isNaN(m[i])) {
          const bx = i % nx;
          const by = (i - bx) / nx;
          const near = [
            bx > 0 ? m[i - 1] : NaN,
            bx < nx - 1 ? m[i + 1] : NaN,
            by > 0 ? m[i - nx] : NaN,
            by < ys.length - 1 ? m[i + nx] : NaN,
          ].filter(Number.isFinite);
          if (near.length)
            next[i] = near.reduce((s, q) => s + q, 0) / near.length;
          else open++;
        }
      m.set(next);
      if (!open) break;
    }
  const centre = list => list.map(([a, b]) => (a + b - 1) / 2);
  return {
    box,
    nx,
    ny: ys.length,
    cx: centre(xs),
    cy: centre(ys),
    level,
    noise,
  };
}

/** [cell, t] of a position along one axis of the mesh: bilinear, the outer intervals continued. */
function at(centres, p) {
  const k = centres.length;
  if (k === 1) return [0, 0];
  let c = 0;
  while (c < k - 2 && p > centres[c + 1]) c++;
  return [c, (p - centres[c]) / (centres[c + 1] - centres[c])];
}

const cellOf = (mesh, field) => (i, j) =>
  mesh[field][Math.min(j, mesh.ny - 1) * mesh.nx + Math.min(i, mesh.nx - 1)];

/** The value of a mesh field at a pixel (x, y), as the full map has it (the noise floored). */
export function meshAt(mesh, field, x, y) {
  const [cx, tx] = at(mesh.cx, x);
  const [cy, ty] = at(mesh.cy, y);
  const g = cellOf(mesh, field);
  const a = g(cx, cy) * (1 - tx) + g(cx + 1, cy) * tx;
  const b = g(cx, cy + 1) * (1 - tx) + g(cx + 1, cy + 1) * tx;
  const v = a * (1 - ty) + b * ty;
  return field === 'noise' ? Math.max(0.5 * Math.min(...mesh.noise), v) : v;
}

/** The mesh as a full map (Float64Array), the noise floored at half its smallest box. */
export function meshMap(mesh, field, W, H) {
  const floor = field === 'noise' ? 0.5 * Math.min(...mesh.noise) : -Infinity;
  const ax = Array.from({ length: W }, (_, p) => at(mesh.cx, p));
  const ay = Array.from({ length: H }, (_, p) => at(mesh.cy, p));
  const g = cellOf(mesh, field);
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    const [cy, ty] = ay[y];
    for (let x = 0; x < W; x++) {
      const [cx, tx] = ax[x];
      const a = g(cx, cy) * (1 - tx) + g(cx + 1, cy) * tx;
      const b = g(cx, cy + 1) * (1 - tx) + g(cx + 1, cy + 1) * tx;
      out[y * W + x] = Math.max(floor, a * (1 - ty) + b * ty);
    }
  }
  return out;
}

// ---- smoothing -----------------------------------------------------------------

/** The Gaussian's 1-D weights, summing to 1, truncated at 3 sigma. */
export function gaussianKernel(fwhm) {
  const s = fwhm * SIGMA_PER_FWHM;
  const radius = Math.ceil(3 * s);
  const k = Array.from({ length: 2 * radius + 1 }, (_, i) =>
    Math.exp(-0.5 * ((i - radius) / s) ** 2)
  );
  const sum = k.reduce((t, v) => t + v, 0);
  return { radius, k: k.map(v => v / sum) };
}

/** The weights as they land on each pixel along an axis of n: a repeated edge pixel counts where it is repeated. */
function landing(n, { radius, k }, square) {
  return Array.from({ length: n }, (_, i) => {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(n - 1, i + radius);
    const w = new Float64Array(hi - lo + 1);
    for (let d = -radius; d <= radius; d++) {
      const p = Math.min(Math.max(i + d, 0), n - 1);
      w[p - lo] += k[d + radius];
    }
    return { lo, w: square ? w.map(v => v * v) : w };
  });
}

/** Separable 2-D application of landing weights (rows then columns). */
function apply(src, W, H, wx, wy) {
  const tmp = new Float64Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const { lo, w } = wx[x];
      let s = 0;
      for (let q = 0; q < w.length; q++) s += w[q] * src[y * W + lo + q];
      tmp[y * W + x] = s;
    }
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    const { lo, w } = wy[y];
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let q = 0; q < w.length; q++) s += w[q] * tmp[(lo + q) * W + x];
      out[y * W + x] = s;
    }
  }
  return out;
}

/**
 * The smoothed image and its noise: sum(w v) / sum(w) over valid pixels, and
 * sqrt(sum(w^2 sigma^2)) / sum(w), w the weights as they land.
 */
export function smooth(sub, noise, valid, W, H, kernel) {
  const wx = landing(W, kernel, false);
  const wy = landing(H, kernel, false);
  const vx = landing(W, kernel, true);
  const vy = landing(H, kernel, true);
  const num = new Float64Array(W * H);
  const ok = new Float64Array(W * H);
  const var1 = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++)
    if (valid[i]) {
      num[i] = sub[i];
      ok[i] = 1;
      var1[i] = noise[i] * noise[i];
    }
  const S = apply(ok, W, H, wx, wy);
  const N = apply(num, W, H, wx, wy);
  const V = apply(var1, W, H, vx, vy);
  const value = new Float64Array(W * H);
  const sd = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++)
    if (S[i] > 0) {
      value[i] = N[i] / S[i];
      sd[i] = Math.sqrt(V[i]) / S[i];
    } else sd[i] = Infinity;
  return { value, sd };
}

// ---- segmentation ----------------------------------------------------------------

/**
 * The 8-connected runs of `above` with at least minArea pixels, labelled in
 * raster order of their first pixel: { labels: Int32Array (0 = none), pixels: number[][] }.
 */
export function segment(above, W, H, minArea) {
  const labels = new Int32Array(W * H);
  const pixels = [];
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!above[s] || seen[s]) continue;
    const run = [];
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop();
      run.push(p);
      const x = p % W;
      const y = (p - x) / W;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const q = yy * W + xx;
          if (above[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    if (run.length >= minArea) {
      pixels.push(run);
      for (const p of run) labels[p] = pixels.length;
    }
  }
  return { labels, pixels };
}

/** photutils SourceCatalog's moments of one segment of `sub` (negative values count as zero). */
export function moments(run, sub, W) {
  let m = 0;
  let mx = 0;
  let my = 0;
  let flux = 0;
  let peak = -Infinity;
  for (const p of run) {
    const v = sub[p];
    flux += v;
    if (v > peak) peak = v;
    const w = v > 0 ? v : 0;
    m += w;
    mx += w * (p % W);
    my += w * Math.floor(p / W);
  }
  const x = mx / m;
  const y = my / m;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of run) {
    const w = sub[p] > 0 ? sub[p] : 0;
    const dx = (p % W) - x;
    const dy = Math.floor(p / W) - y;
    sxx += w * dx * dx;
    syy += w * dy * dy;
    sxy += w * dx * dy;
  }
  let cxx = sxx / m;
  let cyy = syy / m;
  const cxy = sxy / m;
  let det = cxx * cyy - cxy * cxy;
  const pixel = 1 / 12;
  if (det < 0) return { x, y, flux, peak, area: run.length, shape: null };
  // SourceExtractor's rule: a segment too thin to have a shape gains 1/12 on the diagonal.
  while (det < pixel * pixel) {
    cxx += pixel;
    cyy += pixel;
    det = cxx * cyy - cxy * cxy;
  }
  const mean = 0.5 * (cxx + cyy);
  const half = Math.sqrt(0.25 * (cxx - cyy) ** 2 + cxy * cxy);
  const a = Math.sqrt(mean + half);
  const b = Math.sqrt(Math.max(0, mean - half));
  return {
    x,
    y,
    flux,
    peak,
    area: run.length,
    shape: {
      semimajor: a,
      semiminor: b,
      ellipticity: 1 - b / a,
      orientation: (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI,
      fwhm: 2 * Math.sqrt(Math.LN2 * (a * a + b * b)),
    },
  };
}

// ---- detection -------------------------------------------------------------------

/**
 * Detect the sources of an adapted frame (photometry.js `adapt`).
 * @param {object} a - adapt()'s result
 * @param {{fwhm?: number, sigma?: number, minArea?: number, box?: number, maxSources?: number}} [o]
 */
export function detectIn(a, o = {}) {
  const p = { ...DEFAULTS, ...o };
  if (!(p.fwhm >= 0.5 && p.fwhm <= 50))
    return refuse('bad-parameter', { name: 'fwhm' });
  if (!(p.sigma >= 2 && p.sigma <= 100))
    return refuse('bad-parameter', { name: 'sigma' });
  if (!(Number.isInteger(p.minArea) && p.minArea >= 1 && p.minArea <= 10000))
    return refuse('bad-parameter', { name: 'minArea' });
  if (!(Number.isInteger(p.box) && p.box >= 4 && p.box <= 256))
    return refuse('bad-parameter', { name: 'box' });
  const { width: W, height: H, values } = a.image;
  const mask = a.mask;
  const mesh = backgroundMesh(a.image, { box: p.box, mask, limit: a.limit });
  if (!mesh.level.every(Number.isFinite))
    return refuse('no-background', { reason: 'every box is masked' });
  const level = meshMap(mesh, 'level', W, H);
  const noise = meshMap(mesh, 'noise', W, H);
  const valid = new Uint8Array(W * H);
  const sub = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++)
    if (!mask?.[i] && Number.isFinite(values[i])) {
      valid[i] = 1;
      sub[i] = values[i] - level[i];
    }
  const sm = smooth(sub, noise, valid, W, H, gaussianKernel(p.fwhm));
  const above = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++)
    above[i] = valid[i] && sm.value[i] > p.sigma * sm.sd[i] ? 1 : 0;
  const { labels, pixels } = segment(above, W, H, p.minArea);
  const ap = apertureFor(p.fwhm);
  const list = [];
  pixels.forEach((run, k) => {
    const mo = moments(run, sub, W);
    let edge = false;
    let saturated = false;
    let masked = false;
    let top = 0;
    for (const q of run) {
      const x = q % W;
      const y = (q - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      if (values[q] >= a.limit) saturated = true;
      if (sub[q] > top) top = sub[q];
      if (mask && !masked)
        for (let dy = -1; dy <= 1 && !masked; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx])
              masked = true;
          }
    }
    list.push({
      id: `s${k + 1}`,
      x: mo.x,
      y: mo.y,
      area: mo.area,
      peak: mo.peak,
      segmentFlux: mo.flux,
      ...(mo.shape ?? {}),
      shape: Boolean(mo.shape),
      flags: [
        ...(saturated ? ['saturated'] : []),
        ...(edge ? ['edge'] : []),
        ...(masked ? ['masked'] : []),
        ...(mo.flux > 0 && top / mo.flux > SHARP ? ['sharp'] : []),
      ],
    });
  });
  const crowd = crowding(
    list.map(s => ({ id: s.id, x: s.x, y: s.y, r: ap.r, rOut: ap.rOut }))
  );
  const truncated = list.length > p.maxSources;
  const sources = list.slice(0, p.maxSources);
  sources.forEach((s, k) => {
    if (crowd[k].length) s.flags.push('crowded');
    s.crowdedWith = crowd[k];
    const m = crowd[k].length
      ? refuse('crowded', { with: crowd[k] })
      : measure(a, {
          id: s.id,
          x: s.x,
          y: s.y,
          r: ap.r,
          rIn: ap.rIn,
          rOut: ap.rOut,
        });
    Object.assign(
      s,
      m.ok
        ? {
            flux: m.net,
            fluxSigma: m.sigma,
            snr: m.snr,
            detected: m.detected,
            sky: m.sky,
          }
        : { flux: null, fluxSigma: null, snr: null, fluxCode: m.code }
    );
  });
  return {
    ok: true,
    version: VERSION,
    params: p,
    route: a.route,
    unit: a.unit,
    sources,
    truncated,
    mesh,
    labels,
    kernel: { radius: gaussianKernel(p.fwhm).radius },
  };
}

/** Detect the sources of a frame whose contract allows photometry (the refusals are Prompt 180's). */
export function detect(frame, check, o) {
  const a = adapt(frame, check);
  return a.ok ? { ...detectIn(a, o), a } : a;
}

// ---- the point-spread function: models --------------------------------------------

/** erfc to about 1e-13 relative: the Taylor series below 2, the continued fraction beyond. */
export function erfc(x) {
  const ax = Math.abs(x);
  let r;
  if (ax < 2) {
    let term = ax;
    let sum = ax;
    for (let n = 1; n < 100; n++) {
      term *= -(ax * ax) / n;
      const t = term / (2 * n + 1);
      sum += t;
      if (Math.abs(t) < 1e-17 * Math.abs(sum)) break;
    }
    r = 1 - (2 / Math.sqrt(Math.PI)) * sum;
  } else {
    let f = ax;
    for (let n = 80; n >= 1; n--) f = ax + n / 2 / f;
    r = Math.exp(-ax * ax) / (Math.sqrt(Math.PI) * f);
  }
  return x < 0 ? 2 - r : r;
}

const Q = u => 0.5 * erfc(u / Math.SQRT2);
const phi = u => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
/** The probability of a standard normal between a and b, without cancellation in the tails. */
const cell = (a, b) =>
  a >= 0 ? Q(a) - Q(b) : b <= 0 ? Q(-b) - Q(-a) : 1 - Q(b) - Q(-a);

/** FWHM of a Moffat of this alpha and beta, and alpha of a FWHM. */
export const moffatFwhm = (alpha, beta) =>
  2 * alpha * Math.sqrt(2 ** (1 / beta) - 1);
const moffatAlpha = (fwhm, beta) => fwhm / (2 * Math.sqrt(2 ** (1 / beta) - 1));
const SUB = 5;

/**
 * Model pixels and their derivatives for a square of pixels, parameters
 * [flux, x, y, fwhm] (Gaussian) or [flux, x, y, fwhm, beta] (Moffat).
 * @returns {{m: Float64Array, J: Float64Array[]}} the model and one column of derivatives per parameter
 */
export function modelPixels(kind, par, x0, y0, n) {
  const [F, cx, cy, fwhm] = par;
  const N = n * n;
  const m = new Float64Array(N);
  const J = par.map(() => new Float64Array(N));
  if (kind === 'gaussian') {
    const s = fwhm * SIGMA_PER_FWHM;
    const axis = (c, o) => {
      const g = new Float64Array(n);
      const dc = new Float64Array(n);
      const ds = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const lo = (o + i - 0.5 - c) / s;
        const hi = (o + i + 0.5 - c) / s;
        g[i] = cell(lo, hi);
        dc[i] = -(phi(hi) - phi(lo)) / s;
        ds[i] = -(hi * phi(hi) - lo * phi(lo)) / s;
      }
      return { g, dc, ds };
    };
    const X = axis(cx, x0);
    const Y = axis(cy, y0);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const gg = X.g[i] * Y.g[j];
        m[k] = F * gg;
        J[0][k] = gg;
        J[1][k] = F * X.dc[i] * Y.g[j];
        J[2][k] = F * X.g[i] * Y.dc[j];
        J[3][k] = F * (X.ds[i] * Y.g[j] + X.g[i] * Y.ds[j]) * SIGMA_PER_FWHM;
      }
    return { m, J };
  }
  const beta = par[4];
  const alpha = moffatAlpha(fwhm, beta);
  const norm = (beta - 1) / (Math.PI * alpha * alpha);
  const dAlphaDFwhm = alpha / fwhm;
  const t = 2 ** (1 / beta);
  const dAlphaDBeta = (alpha * Math.LN2 * t) / (2 * beta * beta * (t - 1));
  const h = 1 / SUB;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      let f = 0;
      let fx = 0;
      let fy = 0;
      let fa = 0;
      let fb = 0;
      for (let b = 0; b < SUB; b++)
        for (let q = 0; q < SUB; q++) {
          const dx = x0 + i - 0.5 + (q + 0.5) * h - cx;
          const dy = y0 + j - 0.5 + (b + 0.5) * h - cy;
          const rho = (dx * dx + dy * dy) / (alpha * alpha);
          const d = norm * (1 + rho) ** -beta;
          f += d;
          fx += (d * 2 * beta * dx) / (alpha * alpha * (1 + rho));
          fy += (d * 2 * beta * dy) / (alpha * alpha * (1 + rho));
          fa += d * (-2 / alpha + (2 * beta * rho) / (alpha * (1 + rho)));
          fb += d * (1 / (beta - 1) - Math.log(1 + rho));
        }
      const s = 1 / (SUB * SUB);
      m[k] = F * f * s;
      J[0][k] = f * s;
      J[1][k] = F * fx * s;
      J[2][k] = F * fy * s;
      J[3][k] = F * fa * s * dAlphaDFwhm;
      J[4][k] = F * s * (fb + fa * dAlphaDBeta);
    }
  return { m, J };
}

// ---- the point-spread function: one star -------------------------------------------

/**
 * Fit one star.
 * @param {object} a - adapt()'s result
 * @param {object} det - detectIn()'s result (its mesh gives the sky and the noise)
 * @param {{x: number, y: number, flux?: number, fwhm?: number}} star - pixels, 0-based
 * @param {{model?: 'gaussian'|'moffat', weights?: 'poisson'|'none', half?: number}} [o]
 */
export function fitStar(a, det, star, o = {}) {
  const model = o.model ?? 'gaussian';
  const weighted = (o.weights ?? 'poisson') !== 'none';
  const { width: W, height: H, values } = a.image;
  const fwhm0 = Math.min(Math.max(star.fwhm ?? det.params.fwhm, 1.5), 40);
  const R = o.half ?? Math.ceil(2.5 * Math.max(fwhm0, 2.5));
  const x0 = Math.round(star.x) - R;
  const y0 = Math.round(star.y) - R;
  const n = 2 * R + 1;
  if (x0 < 0 || y0 < 0 || x0 + n > W || y0 + n > H) return refuse('edge');
  const data = new Float64Array(n * n);
  const base = new Float64Array(n * n);
  const use = new Uint8Array(n * n);
  let masked = 0;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const p = (y0 + j) * W + x0 + i;
      const k = j * n + i;
      if (values[p] >= a.limit) return refuse('saturated');
      if (a.mask?.[p] || !Number.isFinite(values[p])) {
        masked++;
        continue;
      }
      use[k] = 1;
      data[k] = values[p] - meshAt(det.mesh, 'level', x0 + i, y0 + j);
      const sd = meshAt(det.mesh, 'noise', x0 + i, y0 + j);
      base[k] = a.route === 'variance' ? a.variance[p] : sd * sd;
    }
  if (masked > 0.2 * n * n) return refuse('masked', { pixels: masked });
  const np = model === 'moffat' ? 5 : 4;
  let flux0 = 0;
  for (let k = 0; k < n * n; k++) if (use[k]) flux0 += data[k];
  let par = [
    Number.isFinite(star.flux) && star.flux > 0
      ? star.flux
      : Math.max(flux0, 1),
    star.x,
    star.y,
    fwhm0,
    ...(np === 5 ? [3] : []),
  ];
  const lim = p => {
    const q = p.slice();
    q[3] = Math.min(Math.max(q[3], 0.4), 4 * R);
    if (np === 5) q[4] = Math.min(Math.max(q[4], 1.05), 50);
    return q;
  };
  const evaluate = p => {
    const { m, J } = modelPixels(model, p, x0, y0, n);
    const w = new Float64Array(n * n);
    let chi = 0;
    for (let k = 0; k < n * n; k++)
      if (use[k]) {
        w[k] = weighted
          ? 1 / (base[k] + (a.route === 'variance' ? 0 : Math.max(m[k], 0)))
          : 1;
        const r = data[k] - m[k];
        chi += w[k] * r * r;
      }
    return { m, J, w, chi };
  };
  let cur = evaluate(par);
  let lambda = 1e-3;
  let converged = false;
  let iterations = 0;
  for (; iterations < 200; iterations++) {
    const A = Array.from({ length: np }, () => new Array(np).fill(0));
    const g = new Array(np).fill(0);
    for (let k = 0; k < n * n; k++)
      if (use[k]) {
        const r = data[k] - cur.m[k];
        for (let i = 0; i < np; i++) {
          const wi = cur.w[k] * cur.J[i][k];
          g[i] += wi * r;
          for (let j = 0; j <= i; j++) A[i][j] += wi * cur.J[j][k];
        }
      }
    for (let i = 0; i < np; i++)
      for (let j = i + 1; j < np; j++) A[i][j] = A[j][i];
    let moved = false;
    for (let t = 0; t < 30 && !moved; t++) {
      const D = A.map((row, i) =>
        row.map((v, j) => (i === j ? v * (1 + lambda) : v))
      );
      const d = solveSpd(D, g);
      if (!d) {
        lambda *= 10;
        continue;
      }
      const next = lim(par.map((v, i) => v + d[i]));
      const trial = evaluate(next);
      if (trial.chi <= cur.chi) {
        const small = d.every(
          (v, i) => Math.abs(v) <= 1e-10 * (Math.abs(par[i]) + 1e-3)
        );
        const gain = cur.chi - trial.chi <= 1e-14 * cur.chi;
        par = next;
        cur = trial;
        lambda = Math.max(lambda / 10, 1e-12);
        moved = true;
        if (small || gain) converged = true;
      } else lambda *= 10;
    }
    if (!moved || converged) {
      converged = converged || !moved;
      break;
    }
  }
  if (
    !par.every(Number.isFinite) ||
    Math.abs(par[1] - star.x) > R ||
    Math.abs(par[2] - star.y) > R
  )
    return refuse('no-convergence');
  const A = Array.from({ length: np }, () => new Array(np).fill(0));
  for (let k = 0; k < n * n; k++)
    if (use[k])
      for (let i = 0; i < np; i++)
        for (let j = 0; j < np; j++)
          A[i][j] += cur.w[k] * cur.J[i][k] * cur.J[j][k];
  const C = invertSpd(A);
  if (!C) return refuse('not-constrained');
  const count = use.reduce((s, v) => s + v, 0);
  const dof = count - np;
  const sigma = C.map((r, i) => Math.sqrt(r[i]));
  const rms = Math.sqrt(
    cur.m.reduce((s, v, k) => s + (use[k] ? (data[k] - v) ** 2 : 0), 0) / count
  );
  const chi2red = weighted && dof > 0 ? cur.chi / dof : null;
  return {
    ok: true,
    model,
    weights: weighted ? 'poisson' : 'none',
    x: par[1],
    y: par[2],
    flux: par[0],
    fwhm: par[3],
    beta: np === 5 ? par[4] : null,
    sigma: {
      flux: sigma[0],
      x: sigma[1],
      y: sigma[2],
      fwhm: sigma[3],
      beta: np === 5 ? sigma[4] : null,
    },
    covariance: C,
    chi2: weighted ? cur.chi : null,
    dof,
    chi2red,
    modelLimited: chi2red !== null && chi2red > SELECT.chi2,
    pixels: count,
    half: R,
    residualRms: rms,
    converged,
    iterations: iterations + 1,
    start: { x: star.x, y: star.y, flux: star.flux, fwhm: star.fwhm },
  };
}

// ---- the point-spread function: stars, combination and profile ------------------------

/** The stars the PSF is measured from: unflagged, bright, round, the brightest first (DETECTION.md). */
export function selectStars(det, o = {}) {
  const c = { ...SELECT, ...o };
  return det.sources
    .filter(
      s =>
        !s.flags.length &&
        s.shape &&
        s.snr >= c.snr &&
        s.ellipticity <= c.ellipticity
    )
    .sort((p, q) => q.snr - p.snr)
    .slice(0, c.stars);
}

/** The inverse-variance mean of values with sigmas, its sigma scaled by sqrt(reduced chi-square) when that is above 1. */
export function combine(values, sigmas) {
  const w = sigmas.map(s => 1 / (s * s));
  const sw = w.reduce((t, v) => t + v, 0);
  const mean = values.reduce((t, v, i) => t + v * w[i], 0) / sw;
  const chi2 = values.reduce((t, v, i) => t + w[i] * (v - mean) ** 2, 0);
  const dof = values.length - 1;
  const red = dof > 0 ? chi2 / dof : null;
  const stat = 1 / Math.sqrt(sw);
  return {
    mean,
    sigma: stat * Math.sqrt(Math.max(1, red ?? 1)),
    sigmaStat: stat,
    chi2,
    dof,
    chi2red: red,
    scaled: red !== null && red > 1,
  };
}

const BIN = 0.5;
/** The radial profile of one star's cutout: per bin of 0.5 pixel the mean of value / flux and of the distance. */
export function radial(a, fit, f) {
  const { width: W, values } = a.image;
  const R = fit.half;
  const nb = Math.ceil((R + 1) / BIN);
  const sum = new Float64Array(nb);
  const dist = new Float64Array(nb);
  const cnt = new Int32Array(nb);
  const cx = Math.round(fit.x);
  const cy = Math.round(fit.y);
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++) {
      const p = (cy + j) * W + cx + i;
      if (a.mask?.[p] || !Number.isFinite(values[p])) continue;
      const r = Math.hypot(cx + i - fit.x, cy + j - fit.y);
      const b = Math.floor(r / BIN);
      if (b >= nb) continue;
      sum[b] += f(p, cx + i, cy + j) / fit.flux;
      dist[b] += r;
      cnt[b]++;
    }
  return { sum, dist, cnt, nb };
}

/** Stack per-star profiles: mean of the star means per bin, the standard error across stars, and the mean distance. */
export function stack(profiles) {
  const nb = Math.min(...profiles.map(p => p.nb));
  const bins = [];
  for (let b = 0; b < nb; b++) {
    const v = [];
    let r = 0;
    let n = 0;
    for (const p of profiles)
      if (p.cnt[b]) {
        v.push(p.sum[b] / p.cnt[b]);
        r += p.dist[b];
        n += p.cnt[b];
      }
    if (!v.length) continue;
    const mean = v.reduce((s, q) => s + q, 0) / v.length;
    const sem =
      v.length > 1
        ? Math.sqrt(
            v.reduce((s, q) => s + (q - mean) ** 2, 0) /
              (v.length - 1) /
              v.length
          )
        : null;
    bins.push({ r: r / n, value: mean, sem, stars: v.length, pixels: n });
  }
  return bins;
}

/** The half-maximum width of a radial profile, read by linear interpolation: 2 r where the value falls to half the first bin's. */
export function profileWidth(bins) {
  const half = bins[0].value / 2;
  for (let k = 1; k < bins.length; k++)
    if (bins[k].value <= half) {
      const t =
        (bins[k - 1].value - half) / (bins[k - 1].value - bins[k].value);
      return 2 * (bins[k - 1].r + t * (bins[k].r - bins[k - 1].r));
    }
  return null;
}

/**
 * The PSF from a list of stars: each fitted, the FWHM (and beta) combined, and
 * the stacked radial profile of the background-subtracted pixels.
 * @param {object} a - adapt()'s result
 * @param {object} det - detectIn()'s result
 * @param {Array<{id?: string, x: number, y: number, flux?: number, fwhm?: number}>} stars
 * @param {{model?: string, weights?: string}} [o]
 */
export function measurePsf(a, det, stars, o = {}) {
  const fits = [];
  const refused = [];
  for (const s of stars) {
    const f = fitStar(a, det, s, o);
    if (f.ok) fits.push({ id: s.id, ...f });
    else refused.push({ id: s.id, code: f.code });
  }
  if (!fits.length) return refuse('no-stars', { refused });
  const fwhm = combine(
    fits.map(f => f.fwhm),
    fits.map(f => f.sigma.fwhm)
  );
  const beta =
    fits[0].beta === null
      ? null
      : combine(
          fits.map(f => f.beta),
          fits.map(f => f.sigma.beta)
        );
  const profile = stack(
    fits.map(f =>
      radial(
        a,
        f,
        (p, x, y) => a.image.values[p] - meshAt(det.mesh, 'level', x, y)
      )
    )
  );
  const modelLimited =
    fits.filter(f => f.modelLimited).length > fits.length / 2;
  return {
    ok: true,
    version: VERSION,
    model: fits[0].model,
    weights: fits[0].weights,
    stars: fits,
    refused,
    fwhm,
    beta,
    profile,
    profileFwhm: profile.length ? profileWidth(profile) : null,
    modelLimited,
    chi2red: fits.every(f => f.chi2red !== null)
      ? fits.reduce((s, f) => s + f.chi2red, 0) / fits.length
      : null,
  };
}

// ---- the record, its replay, the list as CSV and as marks ---------------------------

export const STEP = 'image-psf';

/**
 * The PSF as the envelope's quantities and fit-result record (Prompt 150): the
 * combined FWHM (and beta) with the uncertainty the fits give it, labelled
 * model-limited, with a floor, when the reduced chi-square says the profile is
 * not the model's; and the combination as a model (an inverse-variance mean)
 * whose chi-square is the scatter of the stars about it.
 */
export function psfRecord(psf) {
  const parts = [
    ['psf.fwhm', 'PSF FWHM', 'pix', psf.fwhm, psf.stars.map(s => s.fwhm)],
  ];
  if (psf.beta)
    parts.push([
      'psf.beta',
      'Moffat beta',
      '',
      psf.beta,
      psf.stars.map(s => s.beta),
    ]);
  const quantities = parts.map(([id, label, unit, c]) => ({
    id,
    label,
    value: c.mean,
    unit,
    origin: 'fitted',
    uncertainty: psf.modelLimited
      ? {
          kind: 'model-limited',
          basis: 'scaled',
          sigma: c.sigma,
          floor: c.sigma * Math.sqrt(Math.max(1, psf.chi2red ?? 1)),
        }
      : { kind: 'sigma', basis: c.scaled ? 'scaled' : 'data', sigma: c.sigma },
  }));
  const order = parts.map(p => p[0]);
  const spread = parts[0][4];
  const m = parts[0][3].mean;
  return {
    quantities,
    fit: {
      model: { id: `psf-${psf.model}-mean`, version: '1' },
      parameters: order,
      covariance: {
        order,
        values: parts.map((p, i) =>
          parts.map((_, j) => (i === j ? p[3].sigma ** 2 : 0))
        ),
        units: parts.map(p => p[2]),
      },
      statistic: {
        name: 'chi2',
        value: parts[0][3].chi2,
        dof: Math.max(0, parts[0][3].dof),
      },
      residuals: {
        n: spread.length,
        rms: Math.sqrt(
          spread.reduce((s, v) => s + (v - m) ** 2, 0) / spread.length
        ),
      },
      convergence: { converged: psf.stars.every(s => s.converged) },
      rank: {
        free: order.length,
        rank: order.length,
        status: 'full',
        notConstrained: [],
      },
    },
  };
}

/** What lets a PSF be run again: the frame's identity, the detection's settings, the stars and the model. */
export function reductionOf(frame, digest, det, psf, o = {}) {
  return {
    step: STEP,
    version: VERSION,
    route: det.route,
    unit: det.unit,
    frame: { id: frame.id, width: frame.width, height: frame.height, digest },
    detection: det.params,
    model: psf.model,
    weights: psf.weights,
    stars: psf.stars.map(s => ({ id: s.id, ...s.start })),
    result: {
      fwhm: psf.fwhm.mean,
      sigma: psf.fwhm.sigma,
      ...(psf.beta ? { beta: psf.beta.mean } : {}),
    },
    ...o,
  };
}

/**
 * Run a record again on the frame now open: refuse if its pixels changed, then
 * detect, fit the same stars and say whether the FWHM is bit-identical or
 * within a part in 1e9 (another browser's Math.exp).
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
  const det = detectIn(a, red.detection);
  if (!det.ok) return det;
  const psf = measurePsf(a, det, red.stars, {
    model: red.model,
    weights: red.weights,
  });
  if (!psf.ok) return psf;
  const got = psf.fwhm.mean;
  const want = red.result.fwhm;
  return {
    ok: true,
    identical: Object.is(got, want),
    agrees: Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(want)),
  };
}

/** The source list as CSV rows through js/csv.js; the header is the reader's words. */
export function csvRows(det, header, num) {
  return [
    header,
    ...det.sources.map(s => [
      s.id,
      num(s.x + 1),
      num(s.y + 1),
      num(s.area),
      num(s.peak),
      num(s.flux ?? NaN),
      num(s.fluxSigma ?? NaN),
      num(s.snr ?? NaN),
      num(s.ellipticity ?? NaN),
      num(s.orientation ?? NaN),
      num(s.fwhm ?? NaN),
      s.flags.join(' '),
    ]),
  ];
}
