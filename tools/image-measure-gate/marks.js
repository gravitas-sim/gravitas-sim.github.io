// =============================================================================
// The marks instrument's core: marks, scale, refinement, undo, the record
// (Prompt 178 prototype; spike code, imported by no page)
// -----------------------------------------------------------------------------
// Pure and isomorphic. Coordinates are FITS's (1 is the centre of the first
// pixel, y up). A mark is {id, kind, frame, tag, pts, ...}: a point and a count
// have one control point, a segment, a reference pair and a circle (centre, then
// a point on the limb) two, a polygon three or more. A state is immutable and
// every operation returns the next one, so undo is a list of states.
//
// Refinement is deterministic arithmetic on the pixels, with no random start:
//   point   the windowed centroid (SExtractor's XWIN: a Gaussian window, the
//           centroid moved by twice the window-weighted offset until it stops),
//           the window sized from the source's own second moment, the sky from
//           an annulus median, the uncertainty propagated from the CCD's noise
//   circle  the edge along 72 rays (the steepest gradient, with a parabola for
//           the sub-sample), a circle fitted to the edge points (algebraic, then
//           Gauss-Newton on the geometric distance) with a robust rejection, the
//           uncertainty from the covariance of the fit
// Either refuses, saying why, rather than returning a position it cannot stand
// behind: too faint, too sharp to be a point source, not round, too near the
// frame edge, or moved farther than the capture radius allows.
// =============================================================================

import { artifact, validateArtifact } from '../../js/platform/artifact.js';
import { sha256Hex } from '../../js/hash.js';

export const CAPTURE = 3;
export const MIN_RADIUS = 15;
export const ARITY = {
  point: 1,
  count: 1,
  segment: 2,
  'reference-pair': 2,
  circle: 2,
  polygon: 3,
};
/** The standard uncertainty of a hand placement: a one-pixel step is uniform. */
export const PLACE_SIGMA = 1 / Math.sqrt(12);
export const REFINE_VERSION = 1;

const at = (f, x, y) => f.data[(y - 1) * f.width + (x - 1)];

/** The frame bilinearly interpolated at (x, y); NaN outside the frame. */
function sample(f, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 1 || yi < 1 || xi >= f.width || yi >= f.height) return NaN;
  const fx = x - xi;
  const fy = y - yi;
  const i = (yi - 1) * f.width + (xi - 1);
  const d = f.data;
  return (
    d[i] * (1 - fx) * (1 - fy) +
    d[i + 1] * fx * (1 - fy) +
    d[i + f.width] * (1 - fx) * fy +
    d[i + f.width + 1] * fx * fy
  );
}

const median = a => {
  const s = Float64Array.from(a).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};
const mad = (a, m) => 1.4826 * median(a.map(v => Math.abs(v - m)));
const refuse = (reason, extra) => ({ ok: false, reason, ...extra });

// ---- refinement: a point source ----------------------------------------------

/** One window pass: moves (xc, yc) to the windowed centroid; returns the sums. */
function windowPass(f, bg, xc, yc, sw, iterations) {
  const reach = Math.ceil(4 * sw);
  let sums;
  for (let it = 0; it < iterations; it++) {
    sums = { sw: 0, sx: 0, sy: 0, m2: 0, mxx: 0, myy: 0, mxy: 0 };
    const xa = Math.max(1, Math.floor(xc) - reach);
    const xb = Math.min(f.width, Math.ceil(xc) + reach);
    const ya = Math.max(1, Math.floor(yc) - reach);
    const yb = Math.min(f.height, Math.ceil(yc) + reach);
    const k = -1 / (2 * sw * sw);
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const dx = x - xc;
        const dy = y - yc;
        const wi = Math.exp(k * (dx * dx + dy * dy)) * (at(f, x, y) - bg);
        sums.sw += wi;
        sums.sx += wi * dx;
        sums.sy += wi * dy;
        sums.mxx += wi * dx * dx;
        sums.myy += wi * dy * dy;
        sums.mxy += wi * dx * dy;
      }
    if (!(sums.sw > 0)) return null;
    const mx = (2 * sums.sx) / sums.sw;
    const my = (2 * sums.sy) / sums.sw;
    xc += mx;
    yc += my;
    if (Math.hypot(mx, my) < 1e-4) break;
  }
  return { xc, yc, ...sums };
}

/**
 * Refine a click on a point source to its centroid.
 * @returns {{ok: true, x: number, y: number, sigma: number, fwhm: number, snr: number}|{ok: false, reason: string}}
 */
export function refinePoint(f, x0, y0, { capture = CAPTURE } = {}) {
  if (!(x0 >= 21 && y0 >= 21 && x0 <= f.width - 20 && y0 <= f.height - 20))
    return refuse('edge');
  const ring = [];
  for (let y = Math.round(y0) - 16; y <= Math.round(y0) + 16; y++)
    for (let x = Math.round(x0) - 16; x <= Math.round(x0) + 16; x++) {
      const r = Math.hypot(x - x0, y - y0);
      if (r >= 10 && r <= 16) ring.push(at(f, x, y));
    }
  const bg = median(ring);
  const noise = mad(ring, bg);
  if (!(noise > 0)) return refuse('flat');
  const first = windowPass(f, bg, x0, y0, 3, 40);
  if (!first) return refuse('no-flux');
  const smx = first.mxx / first.sw;
  const smy = first.myy / first.sw;
  const sm2 = 0.5 * (smx + smy);
  const lim = 9 * 0.98;
  const sp2 = sm2 > 0 && sm2 < lim ? 1 / (1 / sm2 - 1 / 9) : 9;
  const sp = Math.sqrt(sp2);
  if (sp < 0.8) return refuse('too-sharp');
  const sw = Math.min(4, Math.max(1.2, sp));
  const fin = windowPass(f, bg, first.xc, first.yc, sw, 40);
  if (!fin) return refuse('no-flux');
  if (Math.hypot(fin.xc - x0, fin.yc - y0) > 2 * capture)
    return refuse('moved-too-far');
  const a = fin.mxx / fin.sw;
  const b = fin.myy / fin.sw;
  const c = fin.mxy / fin.sw;
  const half = Math.hypot(0.5 * (a - b), c);
  const major = 0.5 * (a + b) + half;
  const minor = 0.5 * (a + b) - half;
  if (!(minor > 0) || Math.sqrt(major / minor) > 1.5)
    return refuse('not-round');
  const peak = (() => {
    let s = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++)
        s += at(f, Math.round(fin.xc) + i, Math.round(fin.yc) + j) - bg;
    return s / 9;
  })();
  const snr = peak / noise;
  if (snr < 10) return refuse('too-faint', { snr });
  // The uncertainty: the centroid is x_c + 2 sum(w I dx) / sum(w I), so its
  // variance is 4 sum(w^2 dx^2 var_i) / (sum w I)^2, var_i the pixel's CCD noise.
  const gain = f.gain ?? 1.5;
  const reach = Math.ceil(4 * sw);
  const k = -1 / (2 * sw * sw);
  let sv = 0;
  for (
    let y = Math.max(1, Math.floor(fin.yc) - reach);
    y <= Math.min(f.height, Math.ceil(fin.yc) + reach);
    y++
  )
    for (
      let x = Math.max(1, Math.floor(fin.xc) - reach);
      x <= Math.min(f.width, Math.ceil(fin.xc) + reach);
      x++
    ) {
      const dx = x - fin.xc;
      const dy = y - fin.yc;
      const w = Math.exp(k * (dx * dx + dy * dy));
      sv +=
        w *
        w *
        dx *
        dx *
        (noise * noise + Math.max(at(f, x, y) - bg, 0) / gain);
    }
  const sigma = (2 * Math.sqrt(sv)) / fin.sw;
  return {
    ok: true,
    x: fin.xc,
    y: fin.yc,
    sigma,
    fwhm: 2.354820045 * sp,
    snr,
    version: REFINE_VERSION,
  };
}

// ---- refinement: a circle ------------------------------------------------------

function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let j = i + 1; j < 3; j++)
      if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let j = i + 1; j < 3; j++) {
      const q = M[j][i] / M[i][i];
      for (let k = i; k < 4; k++) M[j][k] -= q * M[i][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = M[i][3];
    for (let k = i + 1; k < 3; k++) s -= M[i][k] * x[k];
    x[i] = s / M[i][i];
  }
  return x;
}

/** A circle through points: algebraic, then Gauss-Newton on the distance; with its covariance. */
export function fitCircle(pts, start) {
  const n = pts.length;
  let cx, cy, r;
  if (start) [cx, cy, r] = start;
  else {
    const { mx, my } = pts.reduce(
      (s, p) => ({ mx: s.mx + p[0] / n, my: s.my + p[1] / n }),
      { mx: 0, my: 0 }
    );
    let suu = 0,
      svv = 0,
      suv = 0,
      suuu = 0,
      svvv = 0,
      suvv = 0,
      svuu = 0;
    for (const [x, y] of pts) {
      const u = x - mx,
        v = y - my;
      suu += u * u;
      svv += v * v;
      suv += u * v;
      suuu += u * u * u;
      svvv += v * v * v;
      suvv += u * v * v;
      svuu += v * u * u;
    }
    const det = suu * svv - suv * suv;
    const uc = (0.5 * (suuu + suvv) * svv - 0.5 * (svvv + svuu) * suv) / det;
    const vc = (0.5 * (svvv + svuu) * suu - 0.5 * (suuu + suvv) * suv) / det;
    cx = mx + uc;
    cy = my + vc;
    r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  }
  let JtJ = null;
  let res = [];
  for (let it = 0; it < 8; it++) {
    const A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const g = [0, 0, 0];
    res = [];
    for (const [x, y] of pts) {
      const d = Math.hypot(x - cx, y - cy) || 1e-9;
      const j = [-(x - cx) / d, -(y - cy) / d, -1];
      const e = d - r;
      res.push(e);
      for (let a = 0; a < 3; a++) {
        g[a] -= j[a] * e;
        for (let b = 0; b < 3; b++) A[a][b] += j[a] * j[b];
      }
    }
    JtJ = A;
    const step = solve3(A, g);
    if (!step) break;
    cx += step[0];
    cy += step[1];
    r += step[2];
    if (Math.hypot(step[0], step[1], step[2]) < 1e-9) break;
  }
  const s2 = res.reduce((s, e) => s + e * e, 0) / Math.max(1, n - 3);
  const inv = [0, 1, 2].map(k =>
    solve3(
      JtJ,
      [0, 1, 2].map(i => (i === k ? 1 : 0))
    )
  );
  const cov = (a, b) => (inv[a] && inv[b] ? inv[b][a] * s2 : NaN);
  return {
    x: cx,
    y: cy,
    r,
    rms: Math.sqrt(s2),
    sigmaR: Math.sqrt(cov(2, 2)),
    sigmaXY: Math.sqrt(0.5 * (cov(0, 0) + cov(1, 1))),
  };
}

/** The frame's pixel noise: the robust spread of horizontal neighbours' differences over sqrt 2. */
export function frameNoise(f) {
  const d = [];
  for (let y = 1; y <= f.height; y += 5)
    for (let x = 1; x < f.width; x += 3) d.push(at(f, x + 1, y) - at(f, x, y));
  return mad(d, median(d)) / Math.SQRT2;
}

export function edgePoints(f, cx, cy, r, m, rays, noise = frameNoise(f)) {
  const out = [];
  const step = 0.5;
  const r0 = Math.max(1.5, r - m);
  const n = Math.floor((r + m - r0) / step) + 1;
  // The gradient is a difference of samples 2 pixels apart, so its noise is
  // about 0.7 of the pixel noise; an edge is a peak of at least three times it.
  const need = 3 * 0.7 * noise;
  for (let k = 0; k < rays; k++) {
    const th = (2 * Math.PI * k) / rays;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const v = new Float64Array(n);
    let bad = false;
    for (let j = 0; j < n; j++) {
      v[j] = sample(f, cx + (r0 + j * step) * c, cy + (r0 + j * step) * s);
      if (v[j] !== v[j]) bad = true;
    }
    if (bad) continue;
    const g = new Float64Array(n);
    let best = 2;
    for (let j = 2; j < n - 2; j++) {
      g[j] = (v[j + 2] - v[j - 2]) / (4 * step);
      if (Math.abs(g[j]) > Math.abs(g[best])) best = j;
    }
    if (!(Math.abs(g[best]) >= need) || best <= 2 || best >= n - 3) continue;
    const a = Math.abs(g[best - 1]);
    const b = Math.abs(g[best]);
    const d = Math.abs(g[best + 1]);
    const den = a - 2 * b + d;
    const delta = den !== 0 ? (0.5 * (a - d)) / den : 0;
    const rho = r0 + (best + delta) * step;
    out.push([cx + rho * c, cy + rho * s]);
  }
  return out;
}

/**
 * Refine a centre click and a limb click to the circle of the limb.
 * @returns {{ok: true, x, y, r, sigmaR, sigmaXY, n}|{ok: false, reason: string}}
 */
export function refineCircle(f, c0, l0, { capture = CAPTURE, rays = 72 } = {}) {
  let cx = c0[0],
    cy = c0[1];
  let r = Math.hypot(l0[0] - c0[0], l0[1] - c0[1]);
  if (!(r > 3)) return refuse('too-small');
  let fit = null;
  let used = 0;
  const noise = frameNoise(f);
  for (let pass = 0; pass < 3; pass++) {
    const m = pass === 0 ? 10 + 0.15 * r : 3 + 0.02 * r;
    let pts = edgePoints(f, cx, cy, r, m, rays, noise);
    if (pts.length < 0.7 * rays)
      return refuse('no-edge', { found: pts.length });
    fit = fitCircle(pts);
    for (let again = 0; again < 2; again++) {
      const d = pts.map(([x, y]) => Math.hypot(x - fit.x, y - fit.y) - fit.r);
      const sd = Math.max(0.05, mad(d, median(d)));
      const keep = pts.filter((_, i) => Math.abs(d[i]) <= 3 * sd);
      if (keep.length < 0.7 * rays) return refuse('not-circular');
      if (keep.length === pts.length) break;
      pts = keep;
      fit = fitCircle(pts, [fit.x, fit.y, fit.r]);
    }
    used = pts.length;
    cx = fit.x;
    cy = fit.y;
    r = fit.r;
  }
  if (!(r >= MIN_RADIUS)) return refuse('too-small');
  if (Math.hypot(cx - c0[0], cy - c0[1]) > 3 * capture)
    return refuse('moved-too-far');
  if (fit.rms > 1.5) return refuse('not-circular');
  return {
    ok: true,
    x: cx,
    y: cy,
    r,
    sigmaR: fit.sigmaR,
    sigmaXY: fit.sigmaXY,
    n: used,
    version: REFINE_VERSION,
  };
}

/** Refine a mark on a frame: the mark's new control points and uncertainty, or a refusal. */
export function refineMark(mark, f) {
  if (mark.kind === 'point' || mark.kind === 'count') {
    const r = refinePoint(f, mark.pts[0][0], mark.pts[0][1]);
    return r.ok
      ? { ok: true, pts: [[r.x, r.y]], sigma: r.sigma, detail: r }
      : r;
  }
  if (mark.kind === 'circle') {
    const r = refineCircle(f, mark.pts[0], mark.pts[1]);
    if (!r.ok) return r;
    const [lx, ly] = mark.pts[1];
    const th = Math.atan2(ly - mark.pts[0][1], lx - mark.pts[0][0]);
    return {
      ok: true,
      pts: [
        [r.x, r.y],
        [r.x + r.r * Math.cos(th), r.y + r.r * Math.sin(th)],
      ],
      sigma: r.sigmaXY,
      sigmaR: r.sigmaR,
      detail: r,
    };
  }
  return refuse('not-refinable');
}

// ---- marks and the store ---------------------------------------------------

export const emptyState = () => ({ marks: [], nextId: 1 });
const replaceMark = (s, id, fn) => ({
  ...s,
  marks: s.marks.map(m => (m.id === id ? fn(m) : m)),
});

/** A new mark. Polygons take any number of points of three or more. */
export function place(state, { kind, frame = 0, tag = '', pts, length }) {
  if (!ARITY[kind]) throw new Error(`unknown mark kind ${kind}`);
  if (kind === 'polygon' ? pts.length < 3 : pts.length !== ARITY[kind])
    throw new Error(`${kind} needs ${ARITY[kind]} points`);
  const mark = {
    id: `m${state.nextId}`,
    kind,
    frame,
    tag,
    pts: pts.map(p => [p[0], p[1]]),
    sigma: PLACE_SIGMA,
    refined: false,
    ...(length ? { length } : {}),
  };
  return { ...state, nextId: state.nextId + 1, marks: [...state.marks, mark] };
}

/** Move one control point by (dx, dy): a nudge. */
export const nudge = (state, id, handle, dx, dy) =>
  replaceMark(state, id, m => ({
    ...m,
    refined: false,
    sigma: PLACE_SIGMA,
    pts: m.pts.map((p, i) => (i === handle ? [p[0] + dx, p[1] + dy] : p)),
  }));

/** Set control point coordinates and/or the tag, as the table's cells do. */
export const edit = (state, id, { tag, handle = 0, x, y, length }) =>
  replaceMark(state, id, m => ({
    ...m,
    ...(tag !== undefined ? { tag } : {}),
    ...(length !== undefined ? { length } : {}),
    ...(x !== undefined || y !== undefined
      ? {
          refined: false,
          sigma: PLACE_SIGMA,
          pts: m.pts.map((p, i) => (i === handle ? [x ?? p[0], y ?? p[1]] : p)),
        }
      : {}),
  }));

export const remove = (state, id) => ({
  ...state,
  marks: state.marks.filter(m => m.id !== id),
});

/** Refine one mark on its frame; the refusal, if there is one, leaves the state as it was. */
export function refine(state, id, frames) {
  const mark = state.marks.find(m => m.id === id);
  const r = refineMark(mark, frames[mark.frame]);
  if (!r.ok) return { state, result: r };
  return {
    state: replaceMark(state, id, m => ({
      ...m,
      pts: r.pts,
      sigma: r.sigma,
      ...(r.sigmaR !== undefined ? { sigmaR: r.sigmaR } : {}),
      refined: true,
      placed: m.pts,
    })),
    result: r,
  };
}

/** Copy a mark to the next frame at the same place, under the same tag. */
export function copyForward(state, id, to) {
  const m = state.marks.find(k => k.id === id);
  return place(state, {
    kind: m.kind,
    frame: to,
    tag: m.tag,
    pts: m.pts,
    length: m.length,
  });
}

/** Marks of a frame; the tags with a mark in an earlier frame and none in this one. */
export const marksOf = (state, frame) =>
  state.marks.filter(m => m.frame === frame);
export function missingTags(state, frame) {
  const here = new Set(
    marksOf(state, frame)
      .map(m => m.tag)
      .filter(Boolean)
  );
  return [
    ...new Set(
      state.marks.filter(m => m.frame < frame && m.tag).map(m => m.tag)
    ),
  ].filter(t => !here.has(t));
}

/** Undo and redo as lists of states, and runs of nudges that count as one step. */
export function createStore(initial = emptyState()) {
  let present = initial;
  const past = [];
  let future = [];
  let key = null;
  const listeners = new Set();
  const emit = why => listeners.forEach(l => l(present, why));
  return {
    get state() {
      return present;
    },
    apply(next, runKey = null) {
      if (next === present) return;
      if (!(runKey && runKey === key)) past.push(present);
      key = runKey;
      present = next;
      future = [];
      emit('apply');
    },
    seal() {
      key = null;
    },
    undo() {
      if (!past.length) return false;
      future.push(present);
      present = past.pop();
      key = null;
      emit('undo');
      return true;
    },
    redo() {
      if (!future.length) return false;
      past.push(present);
      present = future.pop();
      key = null;
      emit('redo');
      return true;
    },
    get depth() {
      return { past: past.length, future: future.length };
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// ---- scale ---------------------------------------------------------------------

const pixelLength = m =>
  Math.hypot(m.pts[1][0] - m.pts[0][0], m.pts[1][1] - m.pts[0][1]);
/** The sigma of a segment's length from its two end points' sigmas (equal, independent axes). */
const lengthSigma = m => Math.SQRT2 * m.sigma;

/**
 * The scale: the sidecar's, or a reference pair's known length over its length
 * in pixels, with its uncertainty (the relative errors add in quadrature).
 */
export function scaleOf(state, sidecar = {}) {
  if (sidecar.arcsecPerPixel)
    return {
      value: sidecar.arcsecPerPixel,
      unit: 'arcsec/pix',
      sigma: 0,
      source: 'sidecar',
    };
  const pair = state.marks.find(m => m.kind === 'reference-pair' && m.length);
  if (!pair) return null;
  const p = pixelLength(pair);
  const sp = lengthSigma(pair);
  const L = pair.length.value;
  const sL = pair.length.sigma ?? 0;
  const value = L / p;
  return {
    value,
    unit: `${pair.length.unit}/pix`,
    sigma: value * Math.hypot(sL / L, sp / p),
    source: pair.id,
    pixels: p,
    pixelSigma: sp,
  };
}

// ---- the record ------------------------------------------------------------

export const digestFrame = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );

const sigmaQ = (sigma, refined) => ({
  kind: 'sigma',
  sigma,
  basis: refined ? 'data' : 'assumed',
});

/** The marks as the record's quantities, each with an uncertainty of Prompt 150's kinds. */
function quantitiesOf(state, frames, sidecar) {
  const q = [];
  const pix = (id, label, value, sigma, refined) =>
    q.push({
      id,
      label,
      value,
      unit: 'pix',
      origin: 'measured',
      uncertainty: sigmaQ(sigma, refined),
    });
  for (const m of state.marks) {
    const tag = m.tag ? ` (${m.tag})` : '';
    const names =
      m.kind === 'circle'
        ? ['centre x', 'centre y']
        : m.pts.length === 1
          ? ['x', 'y']
          : null;
    m.pts.forEach((p, i) => {
      const nm = names ? names[0] : `x${i + 1}`;
      const ny = names ? names[1] : `y${i + 1}`;
      if (m.kind === 'circle' && i === 1) return;
      pix(
        `${m.id}.${names ? 'x' : `x${i + 1}`}`,
        `${m.kind} ${m.id}${tag}: ${nm}, frame ${m.frame + 1}`,
        p[0],
        m.sigma,
        m.refined
      );
      pix(
        `${m.id}.${names ? 'y' : `y${i + 1}`}`,
        `${m.kind} ${m.id}${tag}: ${ny}, frame ${m.frame + 1}`,
        p[1],
        m.sigma,
        m.refined
      );
    });
    if (m.kind === 'circle')
      pix(
        `${m.id}.r`,
        `circle ${m.id}${tag}: radius, frame ${m.frame + 1}`,
        pixelLength(m),
        m.sigmaR ?? m.sigma,
        m.refined
      );
  }
  const sc = scaleOf(state, sidecar);
  if (sc && sc.source !== 'sidecar') {
    q.push({
      id: 'scale.length',
      label: 'known length of the reference pair',
      value: sidecar.knownLength.value,
      unit: sidecar.knownLength.unit,
      origin: 'assumed',
      uncertainty: { kind: 'assumed' },
    });
    pix(
      'scale.pixels',
      'length of the reference pair',
      sc.pixels,
      sc.pixelSigma,
      false
    );
    q.push({
      id: 'scale',
      label: `scale, ${sc.unit}`,
      value: sc.value,
      unit: null,
      origin: 'derived',
      uncertainty: { kind: 'sigma', sigma: sc.sigma, basis: 'derived' },
    });
  }
  frames.forEach((f, k) => {
    if (f.time)
      q.push({
        id: `frame${k + 1}.time`,
        label: `time of frame ${k + 1} (${f.time.scale})`,
        value: f.time.value,
        unit: 'd',
        origin: 'assumed',
        uncertainty: { kind: 'assumed' },
      });
  });
  return q;
}

/**
 * One gravitas.artifact/1 envelope with replay: the marks as quantities, the
 * scale, each frame's time and the image's identity (a SHA-256 of its pixels),
 * and in the provenance the marks as placed so that the refinement can be run
 * again on the same pixels.
 */
export async function writeRecord({ id, setId, frames, sidecar = {}, state }) {
  const digests = await Promise.all(frames.map(digestFrame));
  const used = [...new Set(state.marks.map(m => m.frame))];
  return artifact({
    id,
    source: {
      kind: 'observation',
      id: setId,
      digest: (await sha256Hex(digests.join(''))).slice(0, 64),
    },
    quantities: quantitiesOf(state, frames, sidecar),
    provenance: {
      reductions: [
        {
          step: 'image-marks',
          version: 1,
          refine: REFINE_VERSION,
          frames: frames.map((f, k) => ({
            id: f.id,
            width: f.width,
            height: f.height,
            digest: digests[k],
            ...(f.time ? { time: f.time } : {}),
            used: used.includes(k),
          })),
          knownLength: sidecar.knownLength ?? null,
          marks: state.marks.map(m => ({
            ...m,
            pts: m.refined ? m.placed : m.pts,
            result: m.refined
              ? { pts: m.pts, sigma: m.sigma, sigmaR: m.sigmaR ?? null }
              : null,
          })),
        },
      ],
    },
    made: { app: 'gravitas', prototype: 'image-measure-gate' },
  });
}

export class ReplayError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Reopen a record against the frames it was made on: refuse if a frame's pixels
 * changed, rebuild the marks as placed, refine again, and say whether every
 * refined coordinate is bit-identical to the one the record holds.
 */
export async function replay(record, frames) {
  const problems = validateArtifact(record);
  if (problems.length)
    throw new ReplayError(
      'invalid',
      `the record is not an envelope: ${problems[0].path} ${problems[0].message}`
    );
  const red = record.provenance.reductions.find(r => r.step === 'image-marks');
  for (const [k, spec] of red.frames.entries()) {
    const f = frames[k];
    if (
      !f ||
      f.width !== spec.width ||
      f.height !== spec.height ||
      (await digestFrame(f)) !== spec.digest
    )
      throw new ReplayError(
        'image-changed',
        `frame ${k + 1} (${spec.id}) is not the image this record was made on`
      );
  }
  let state = emptyState();
  const differ = [];
  for (const rec of red.marks) {
    state = {
      ...state,
      nextId: state.nextId + 1,
      marks: [
        ...state.marks,
        {
          id: rec.id,
          kind: rec.kind,
          frame: rec.frame,
          tag: rec.tag,
          pts: rec.pts,
          sigma: PLACE_SIGMA,
          refined: false,
          ...(rec.length ? { length: rec.length } : {}),
        },
      ],
    };
    if (rec.result) {
      const r = refine(state, rec.id, frames).state.marks.find(
        m => m.id === rec.id
      );
      const same =
        r.refined &&
        r.pts.every(
          (p, i) =>
            Object.is(p[0], rec.result.pts[i][0]) &&
            Object.is(p[1], rec.result.pts[i][1])
        ) &&
        Object.is(r.sigma, rec.result.sigma);
      if (!same) differ.push(rec.id);
      state = {
        ...state,
        marks: state.marks.map(m => (m.id === rec.id ? r : m)),
      };
    }
  }
  return { state, identical: differ.length === 0, differ };
}
