// =============================================================================
// Refinement: a click becomes a centroid or a limb (Prompt 179)
// -----------------------------------------------------------------------------
// Ported from the gate's prototype (IMAGE_MEASUREMENT_GATE.md, D-R10-48) with its
// arithmetic unchanged, so the gate's thresholds hold as regression tests.
// Pure. FITS coordinates (1 is the centre of the first pixel, y up); a frame is
// {width, height, data, gain?}, row by row. Deterministic, no random start:
//   point   windowed centroid (SExtractor's XWIN), sky from an annulus median,
//           uncertainty from the CCD's noise
//   circle  steepest-gradient edge along 72 rays, a circle fitted to it
//           (algebraic, then Gauss-Newton) with robust rejection
// Either refuses, saying why, rather than return a position it cannot stand
// behind. A limb leaving the frame refines from the rays that stay in it if at
// least 70% do, and is refused as `touches-frame` otherwise.
// =============================================================================

export const CAPTURE = 3;
export const MIN_RADIUS = 15;
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
  out.dropped = 0;
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
    if (bad) {
      out.dropped++;
      continue;
    }
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
      return refuse(pts.dropped > 0.3 * rays ? 'touches-frame' : 'no-edge', {
        found: pts.length,
      });
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
