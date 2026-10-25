// =============================================================================
// Visual-binary orbit fitting with identifiability (Prompt 187, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// Relative astrometry of a secondary about its primary (north and east offsets,
// or separation and position angle) at several epochs, fitted by a Keplerian
// apparent orbit at two depths, and ONLY when the arc can support it:
//
//   circular     a circular true orbit seen obliquely: 5 parameters, the period
//                and a 2 by 2 matrix (the Thiele-Innes constants of a circle)
//   elliptical   the Thiele-Innes model: the period, the eccentricity vector
//                (h, k) = e (cos w, sin w) and the same matrix: 7 parameters
//
// Both are weighted least squares with the stated per-epoch covariance. Given
// the nonlinear parameters (ln P, h, k) the model is linear in the matrix, so the
// search is variable projection: a frequency scan for the circular model, then
// Levenberg-Marquardt from several starts for the eccentric one. The (h, k) form
// is smooth at e = 0, where the periastron is undefined and (e, T) is singular.
//
// A fit returns elements only if the committed criterion holds (ORBIT_FIT_GATE.md):
// enough epochs, a coverage of the period at the upper end of its two-sigma
// range, a normal matrix that is not near singular, a period whose chi-square
// profile interval is closed, and residuals consistent with the stated errors.
// Otherwise it returns { ok: false, status: 'not-constrained', code, message,
// data } and no elements. Astrometry alone cannot tell the ascending node from
// the descending one: the node is given in [0, 180) degrees.
//
// Pure: no DOM, no clock, no network. The Kepler solver is the repository's one
// (js/orbital.js). Positions in arcseconds, epochs in Julian years, angles in
// degrees at the edge and radians inside.
// =============================================================================

import { solveKepler } from '../orbital.js';
import { solveSpd, invertSpd, eigenSymmetric } from '../numeric/linalg.js';
import { chi2Survival } from './astrometry.js';
import { profileInterval } from '../kernels/statistics/intervals.js';
import { stream, gaussian } from '../random/streams.js';
import { fixed } from '../format.js';
import {
  angle,
  dimensionless,
  elementsToState,
  gm,
  instant,
  keplerElements,
  length,
  simulationUnits,
} from '../orbital/layer.js';

const { Math, Number } = globalThis;
const TAU = 2 * Math.PI;
const RAD = Math.PI / 180;
const finite = Number.isFinite;

export const VERSION = 1;
export const STEP = 'image-orbit';
export const DEPTHS = Object.freeze(['circular', 'elliptical']);
export const FIT_KINDS = Object.freeze([
  'circular-apparent-orbit',
  'thiele-innes-orbit',
]);

/** The criterion and its search, fixed before any measurement (tests hold them equal to gate-thresholds.json). */
export const CRITERION = Object.freeze({
  minEpochs: Object.freeze({ circular: 6, elliptical: 8 }),
  coverageFraction: Object.freeze({ circular: 0.4, elliptical: 0.5 }),
  coverageSigmas: 2,
  maxConditionNumber: 1e6,
  periodLow: 0.05,
  periodHigh: 100,
  profileDeltaChi2: 1,
  consistentPValue: 0.001,
  eccentricityDeltaChi2: 11.83,
});
/** Bounds the module keeps: epochs, offsets, the eccentricity the search allows. */
export const LIMITS = Object.freeze({
  maxEpochs: 2000,
  maxOffsetArcsec: 3600,
  maxEccentricity: 0.97,
  minSpanDays: 1,
});
export const LEVELS = Object.freeze([0.6827, 0.95]);
/** Part B's rules (tests hold them equal to thresholds.json): stricter than the gate's criterion, not part of its measurement. */
export const RULES = Object.freeze({
  ambiguityDeltaChi2: 4,
  ambiguityMinLogPeriodGap: 0.02,
  ambiguitySigmas: 6,
  massMinSnr: 3,
  massDraws: 20000,
});
const DELTA95 = 3.841458820694124;

/** Solar masses from (a / parallax)^3 / P^2 with a and the parallax in one unit and P in Julian years. */
const GM_SUN = 1.3271244e20;
const AU = 149597870700;
const JULIAN_YEAR_S = 365.25 * 86400;
export const KEPLER_K =
  (TAU * TAU * AU * AU * AU) / (GM_SUN * JULIAN_YEAR_S * JULIAN_YEAR_S);

/** A refusal: the code and English message are the kernel's; `data` is what a page needs to say it in another language. */
const refuse = (code, message, data = {}) => ({
  ok: false,
  status: 'not-constrained',
  code,
  message,
  data,
});

// ---- the series ------------------------------------------------------------------

/** An epoch as decimal Julian years: year, byear (Besselian), jd or mjd. */
export function epochYear(time) {
  const format = String(time?.format ?? 'year').toLowerCase();
  const v = time?.value;
  if (!finite(v)) return null;
  switch (format) {
    case 'year':
      return v;
    case 'byear':
      return (
        2000 + (2415020.31352 + (v - 1900) * 365.242198781 - 2451545.0) / 365.25
      );
    case 'jd':
      return 2000 + (v - 2451545.0) / 365.25;
    case 'mjd':
      return 2000 + (v + 2400000.5 - 2451545.0) / 365.25;
    default:
      return null;
  }
}

/**
 * Check a series and make it ready: epochs in years sorted, positions as east and
 * north offsets, and each epoch's whitening matrix from its covariance.
 * An epoch is { time: {value, format}, x, y, sigma | sx, sy } (x north, y east,
 * arcseconds) or { time, rho, theta, sigmaRho, sigmaTheta } (arcseconds, degrees
 * from north through east), the second kind with its covariance made exactly.
 */
export function prepare(series) {
  const eps = series?.epochs;
  if (!Array.isArray(eps) || eps.length === 0)
    return refuse('bad-series', 'the series needs a list of epochs', {});
  if (eps.length > LIMITS.maxEpochs)
    return refuse('bad-series', `at most ${LIMITS.maxEpochs} epochs`, {
      limit: LIMITS.maxEpochs,
    });
  const rows = [];
  for (let i = 0; i < eps.length; i++) {
    const e = eps[i];
    const year = epochYear(e?.time);
    if (year === null)
      return refuse('bad-epoch', `epoch ${i + 1} has no usable time`, {
        row: i + 1,
      });
    let x;
    let y;
    let sxx;
    let sxy;
    let syy;
    if (e.rho !== undefined || e.theta !== undefined) {
      const rho = Number(e.rho);
      const th = Number(e.theta) * RAD;
      const sr = Number(e.sigmaRho);
      const st = Number(e.sigmaTheta) * RAD;
      if (![rho, th, sr, st].every(finite) || !(rho > 0))
        return refuse(
          'bad-position',
          `epoch ${i + 1} has no usable separation and angle`,
          { row: i + 1 }
        );
      if (!(sr > 0 && st > 0))
        return refuse(
          'bad-sigma',
          `epoch ${i + 1} needs positive uncertainties`,
          { row: i + 1 }
        );
      const c = Math.cos(th);
      const s = Math.sin(th);
      x = rho * c;
      y = rho * s;
      const vr = sr * sr;
      const vt = rho * rho * st * st;
      sxx = vr * c * c + vt * s * s;
      syy = vr * s * s + vt * c * c;
      sxy = (vr - vt) * c * s;
    } else {
      x = Number(e?.x);
      y = Number(e?.y);
      const sx = Number(e?.sx ?? e?.sigma);
      const sy = Number(e?.sy ?? e?.sigma);
      if (![x, y].every(finite))
        return refuse('bad-position', `epoch ${i + 1} has no usable position`, {
          row: i + 1,
        });
      if (!(sx > 0 && sy > 0 && finite(sx) && finite(sy)))
        return refuse(
          'bad-sigma',
          `epoch ${i + 1} needs positive uncertainties`,
          { row: i + 1 }
        );
      const rxy = Number(e?.rxy ?? 0);
      if (!(finite(rxy) && Math.abs(rxy) < 1))
        return refuse(
          'bad-sigma',
          `epoch ${i + 1} has a correlation that is not between -1 and 1`,
          { row: i + 1 }
        );
      sxx = sx * sx;
      syy = sy * sy;
      sxy = rxy * sx * sy;
    }
    if (Math.hypot(x, y) > LIMITS.maxOffsetArcsec)
      return refuse(
        'bad-position',
        `epoch ${i + 1} is more than ${LIMITS.maxOffsetArcsec} arcseconds out`,
        { row: i + 1 }
      );
    const l11 = Math.sqrt(sxx);
    const l21 = sxy / l11;
    const l22sq = syy - l21 * l21;
    if (!(l22sq > 0))
      return refuse('bad-sigma', `epoch ${i + 1} has a degenerate covariance`, {
        row: i + 1,
      });
    const l22 = Math.sqrt(l22sq);
    rows.push({
      year,
      x,
      y,
      w11: 1 / l11,
      w21: -l21 / (l11 * l22),
      w22: 1 / l22,
      sx: Math.sqrt(sxx),
      sy: Math.sqrt(syy),
      src: i,
    });
  }
  rows.sort((a, b) => a.year - b.year);
  const span = rows[rows.length - 1].year - rows[0].year;
  if (!(span * 365.25 >= LIMITS.minSpanDays))
    return refuse('span', 'the epochs must span at least one day', {
      days: span * 365.25,
    });
  let wsum = 0;
  let tw = 0;
  for (const r of rows) {
    const w = 1 / (r.sx * r.sy);
    wsum += w;
    tw += w * r.year;
  }
  const tRef = tw / wsum;
  const n = rows.length;
  return {
    ok: true,
    n,
    span,
    tRef,
    first: rows[0].year,
    last: rows[n - 1].year,
    t: Float64Array.from(rows, r => r.year - tRef),
    year: Float64Array.from(rows, r => r.year),
    x: Float64Array.from(rows, r => r.x),
    y: Float64Array.from(rows, r => r.y),
    w11: Float64Array.from(rows, r => r.w11),
    w21: Float64Array.from(rows, r => r.w21),
    w22: Float64Array.from(rows, r => r.w22),
    sx: Float64Array.from(rows, r => r.sx),
    sy: Float64Array.from(rows, r => r.sy),
    src: rows.map(r => r.src),
  };
}

// ---- the model -------------------------------------------------------------------

/**
 * The shape functions (r/a) cos(theta) and (r/a) sin(theta) at each epoch for
 * ln P and the eccentricity vector (h, k); theta = nu + w, the true longitude.
 */
function shape(S, lnP, h, k, c, s) {
  const nmot = TAU / Math.exp(lnP);
  const e = Math.hypot(h, k);
  const w = e > 0 ? Math.atan2(k, h) : 0;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const q = Math.sqrt(1 - e * e);
  for (let i = 0; i < S.n; i++) {
    const E = e > 0 ? solveKepler(nmot * S.t[i] - w, e) : nmot * S.t[i];
    const X = Math.cos(E) - e;
    const Y = q * Math.sin(E);
    c[i] = X * cw - Y * sw;
    s[i] = X * sw + Y * cw;
  }
}

/** Linear least squares for u = (alpha1, alpha2, beta1, beta2) given the shape; null when singular. */
function solveLinear(S, c, s) {
  const N = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const g = [0, 0, 0, 0];
  for (let i = 0; i < S.n; i++) {
    const w11 = S.w11[i];
    const w21 = S.w21[i];
    const w22 = S.w22[i];
    const b1 = w11 * S.x[i];
    const b2 = w21 * S.x[i] + w22 * S.y[i];
    // row 1: [w11 c, w11 s, 0, 0]; row 2: [w21 c, w21 s, w22 c, w22 s]
    const r1 = [w11 * c[i], w11 * s[i], 0, 0];
    const r2 = [w21 * c[i], w21 * s[i], w22 * c[i], w22 * s[i]];
    for (let p = 0; p < 4; p++) {
      g[p] += r1[p] * b1 + r2[p] * b2;
      for (let q = p; q < 4; q++) N[p][q] += r1[p] * r1[q] + r2[p] * r2[q];
    }
  }
  for (let p = 0; p < 4; p++) for (let q = 0; q < p; q++) N[p][q] = N[q][p];
  return solveSpd(N, g);
}

/** The whitened residual vector (length 2n) and chi-squared for a matrix u and shape. */
function residualsOf(S, c, s, u, out) {
  let chi2 = 0;
  for (let i = 0; i < S.n; i++) {
    const mx = u[0] * c[i] + u[1] * s[i];
    const my = u[2] * c[i] + u[3] * s[i];
    const dx = S.x[i] - mx;
    const dy = S.y[i] - my;
    const z1 = S.w11[i] * dx;
    const z2 = S.w21[i] * dx + S.w22[i] * dy;
    out[2 * i] = z1;
    out[2 * i + 1] = z2;
    chi2 += z1 * z1 + z2 * z2;
  }
  return chi2;
}

/** The projected residual at the nonlinear parameters x = [lnP] or [lnP, h, k]; null when it cannot be formed. */
function projected(S, x) {
  const c = new Float64Array(S.n);
  const s = new Float64Array(S.n);
  shape(S, x[0], x.length > 1 ? x[1] : 0, x.length > 1 ? x[2] : 0, c, s);
  const u = solveLinear(S, c, s);
  if (!u) return null;
  const r = new Float64Array(2 * S.n);
  const chi2 = residualsOf(S, c, s, u, r);
  return finite(chi2) ? { x: x.slice(), u, r, chi2, c, s } : null;
}

const lnBounds = S => [
  Math.log(Math.max(S.span * CRITERION.periodLow, 1e-9)),
  Math.log(S.span * CRITERION.periodHigh),
];
/** Keep the nonlinear parameters inside the searched range. */
function clampX(S, x) {
  const [lo, hi] = lnBounds(S);
  const out = x.slice();
  out[0] = Math.min(hi, Math.max(lo, out[0]));
  if (out.length > 1) {
    const e = Math.hypot(out[1], out[2]);
    if (e > LIMITS.maxEccentricity) {
      out[1] *= LIMITS.maxEccentricity / e;
      out[2] *= LIMITS.maxEccentricity / e;
    }
  }
  return out;
}

/** Levenberg-Marquardt on the projected residual over the `free` indices of x. */
function lm(S, x0, free, { maxIter = 60 } = {}) {
  let x = clampX(S, x0);
  let cur = projected(S, x);
  if (!cur) return null;
  let lam = 1e-3;
  const nf = free.length;
  if (nf === 0) return cur;
  for (let it = 0; it < maxIter; it++) {
    const m = 2 * S.n;
    const J = free.map(j => {
      const xp = x.slice();
      const step = 1e-7 * (j === 0 ? 1 : 1);
      xp[j] += step;
      const pr = projected(S, xp);
      if (!pr) return null;
      const col = new Float64Array(m);
      for (let i = 0; i < m; i++) col[i] = (pr.r[i] - cur.r[i]) / step;
      return col;
    });
    if (J.some(c => c === null)) break;
    const A = free.map((_, p) =>
      free.map((__, q) => {
        let acc = 0;
        for (let i = 0; i < m; i++) acc += J[p][i] * J[q][i];
        return acc;
      })
    );
    const gv = free.map((_, p) => {
      let acc = 0;
      for (let i = 0; i < m; i++) acc += J[p][i] * cur.r[i];
      return -acc;
    });
    let accepted = false;
    for (let tries = 0; tries < 10; tries++) {
      const Ad = A.map((row, p) =>
        row.map((v, q) => (p === q ? v * (1 + lam) + 1e-300 : v))
      );
      const d = solveSpd(Ad, gv);
      if (!d) {
        lam *= 10;
        continue;
      }
      const xn = x.slice();
      free.forEach((j, p) => (xn[j] += d[p]));
      const trial = projected(S, clampX(S, xn));
      if (trial && trial.chi2 < cur.chi2) {
        const gain = cur.chi2 - trial.chi2;
        x = trial.x;
        cur = trial;
        lam = Math.max(lam / 3, 1e-12);
        accepted = true;
        if (gain <= 1e-12 * (1 + cur.chi2)) return cur;
        break;
      }
      lam *= 4;
    }
    if (!accepted) break;
  }
  return cur;
}

// ---- the search ------------------------------------------------------------------

/** chi-squared of the circular model on a grid of frequencies, and its local minima. */
function circularScan(S) {
  const lo = 1 / (S.span * CRITERION.periodHigh);
  const hi = 1 / (S.span * CRITERION.periodLow);
  const dnu = 0.06 / S.span;
  const nodes = [];
  for (let nu = lo; nu <= hi; nu += dnu) {
    const p = projected(S, [-Math.log(nu)]);
    nodes.push({ nu, chi2: p ? p.chi2 : Infinity });
  }
  const minima = [];
  for (let j = 1; j < nodes.length - 1; j++)
    if (nodes[j].chi2 < nodes[j - 1].chi2 && nodes[j].chi2 <= nodes[j + 1].chi2)
      minima.push(j);
  minima.sort((a, b) => nodes[a].chi2 - nodes[b].chi2);
  const refined = minima.slice(0, 8).map(j => {
    let a = nodes[j - 1].nu;
    let b = nodes[j + 1].nu;
    const f = nu => projected(S, [-Math.log(nu)])?.chi2 ?? Infinity;
    const g = 0.6180339887498949;
    let c = b - g * (b - a);
    let d = a + g * (b - a);
    let fc = f(c);
    let fd = f(d);
    for (let k = 0; k < 60; k++) {
      if (fc < fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - g * (b - a);
        fc = f(c);
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + g * (b - a);
        fd = f(d);
      }
    }
    const nu = (a + b) / 2;
    return { lnP: -Math.log(nu), chi2: f(nu) };
  });
  refined.sort((p, q) => p.chi2 - q.chi2);
  return refined;
}

const THOROUGH_SEEDS = [[0, 0]];
for (const e of [0.25, 0.55, 0.85])
  for (let q = 0; q < 8; q++)
    THOROUGH_SEEDS.push([
      e * Math.cos((q * Math.PI) / 4),
      e * Math.sin((q * Math.PI) / 4),
    ]);
const SEEDS = [[0, 0]];
for (const e of [0.4, 0.8])
  for (let q = 0; q < 6; q++)
    SEEDS.push([
      e * Math.cos((q * Math.PI) / 3),
      e * Math.sin((q * Math.PI) / 3),
    ]);

/**
 * Chi-squared over frequency, the best of thirteen eccentricity-vector seeds at
 * each frequency, and the local minima of that envelope (the best `count`).
 */
function eccentricScan(S, count = 8, thorough = false) {
  const seeds = thorough ? THOROUGH_SEEDS : SEEDS;
  const lo = 1 / (S.span * CRITERION.periodHigh);
  const hi = 1 / (S.span * CRITERION.periodLow);
  const dnu = (thorough ? 0.04 : 0.1) / S.span;
  const nodes = [];
  for (let nu = lo; nu <= hi; nu += dnu) {
    let best = { chi2: Infinity, seed: seeds[0] };
    for (const seed of seeds) {
      const p = projected(S, [-Math.log(nu), seed[0], seed[1]]);
      if (p && p.chi2 < best.chi2) best = { chi2: p.chi2, seed };
    }
    nodes.push({ nu, ...best });
  }
  const mins = [];
  for (let j = 1; j < nodes.length - 1; j++)
    if (nodes[j].chi2 < nodes[j - 1].chi2 && nodes[j].chi2 <= nodes[j + 1].chi2)
      mins.push({
        x: [-Math.log(nodes[j].nu), nodes[j].seed[0], nodes[j].seed[1]],
        chi2: nodes[j].chi2,
      });
  mins.sort((a, b) => a.chi2 - b.chi2);
  return mins.slice(0, count);
}

/**
 * The best circular fit and, for the eccentric depth, the best eccentric one.
 * The circular scan's minima are polished by Levenberg-Marquardt; the eccentric
 * depth scans frequency again with thirteen eccentricity vectors (a harmonic of
 * the period can fit an eccentric orbit better, as a circle, than its own period
 * does) and polishes the eight best minima of the envelope.
 */
function search(S, depth, thorough = false) {
  const minima = circularScan(S);
  if (!minima.length) return null;
  const circ = lm(S, [minima[0].lnP], [0]);
  const circular = minima.map(m => ({ lnP: m.lnP, chi2: m.chi2 }));
  if (depth === 'circular')
    return {
      fit: circ,
      circular: circ,
      candidates: circular,
      circularCandidates: circular,
    };
  let best = null;
  const candidates = [];
  const take = r => {
    if (!r) return;
    candidates.push({ lnP: r.x[0], chi2: r.chi2 });
    if (!best || r.chi2 < best.chi2) best = r;
  };
  for (const m of minima.slice(0, 2)) take(lm(S, [m.lnP, 0, 0], [0, 1, 2]));
  for (const start of eccentricScan(S, thorough ? 20 : 8, thorough))
    take(lm(S, start.x, [0, 1, 2]));
  return {
    fit: best,
    circular: circ,
    candidates,
    circularCandidates: circular,
  };
}

// ---- covariance, conditioning, derived elements ----------------------------------

/** The whitened Jacobian (2n by p) at a fit, parameters [lnP, (h, k,) alpha1, alpha2, beta1, beta2]. */
function jacobian(S, fit) {
  const nl = fit.x.length;
  const m = 2 * S.n;
  const cols = [];
  const model = (x, u) => {
    const c = new Float64Array(S.n);
    const s = new Float64Array(S.n);
    shape(S, x[0], nl > 1 ? x[1] : 0, nl > 1 ? x[2] : 0, c, s);
    const out = new Float64Array(m);
    for (let i = 0; i < S.n; i++) {
      const mx = u[0] * c[i] + u[1] * s[i];
      const my = u[2] * c[i] + u[3] * s[i];
      out[2 * i] = S.w11[i] * mx;
      out[2 * i + 1] = S.w21[i] * mx + S.w22[i] * my;
    }
    return out;
  };
  for (let j = 0; j < nl; j++) {
    const step = 1e-6;
    const xp = fit.x.slice();
    const xm = fit.x.slice();
    xp[j] += step;
    xm[j] -= step;
    const a = model(xp, fit.u);
    const b = model(xm, fit.u);
    const col = new Float64Array(m);
    for (let i = 0; i < m; i++) col[i] = (a[i] - b[i]) / (2 * step);
    cols.push(col);
  }
  const c = fit.c;
  const s = fit.s;
  for (let q = 0; q < 4; q++) {
    const col = new Float64Array(m);
    for (let i = 0; i < S.n; i++) {
      const b = q < 2 ? c[i] * (q === 0 ? 1 : 0) + s[i] * (q === 1 ? 1 : 0) : 0;
      const d =
        q >= 2 ? c[i] * (q === 2 ? 1 : 0) + s[i] * (q === 3 ? 1 : 0) : 0;
      col[2 * i] = S.w11[i] * b;
      col[2 * i + 1] = S.w21[i] * b + S.w22[i] * d;
    }
    cols.push(col);
  }
  return cols;
}

/** Normal matrix, covariance and the condition number of the column-scaled normal matrix. */
function covarianceOf(S, fit) {
  const cols = jacobian(S, fit);
  const p = cols.length;
  const m = 2 * S.n;
  const N = cols.map(a =>
    cols.map(b => {
      let acc = 0;
      for (let q = 0; q < m; q++) acc += a[q] * b[q];
      return acc;
    })
  );
  const d = N.map((r, i) => 1 / Math.sqrt(r[i]));
  const scaled = N.map((r, i) => r.map((v, j) => v * d[i] * d[j]));
  let kappa = Infinity;
  if (d.every(v => finite(v) && v > 0)) {
    const ev = eigenSymmetric(scaled);
    const big = ev[0].value;
    const small = ev[ev.length - 1].value;
    kappa = small > 0 ? big / small : Infinity;
  }
  const cov = invertSpd(N);
  return { p, N, cov, kappa };
}

const wrapPi = a => a - TAU * Math.round(a / TAU);

/** Elements from the parameter vector v = [lnP, (h, k,) alpha1, alpha2, beta1, beta2]. */
function elementsOf(v, nl, tRef) {
  const P = Math.exp(v[0]);
  const h = nl > 1 ? v[1] : 0;
  const k = nl > 1 ? v[2] : 0;
  const [a1, a2, b1, b2] = v.slice(nl);
  const e = Math.hypot(h, k);
  const w = e > 0 ? Math.atan2(k, h) : 0;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const A = a1 * cw + a2 * sw;
  const F = -a1 * sw + a2 * cw;
  const B = b1 * cw + b2 * sw;
  const G = -b1 * sw + b2 * cw;
  const pp = Math.hypot(A + G, B - F);
  const qq = Math.hypot(A - G, B + F);
  const a = (pp + qq) / 2;
  const cosI = (pp - qq) / (pp + qq);
  const sumA = Math.atan2(B - F, A + G); // omega + Omega
  const difA = Math.atan2(-(B + F), A - G); // omega - Omega
  const half = (sumA - difA) / 2; // Omega modulo pi
  const Omega = ((half % Math.PI) + Math.PI) % Math.PI;
  const omega = sumA - Omega;
  return {
    P,
    a,
    i: Math.acos(Math.max(-1, Math.min(1, cosI))),
    Omega,
    omega: ((omega % TAU) + TAU) % TAU,
    e,
    w,
    T: tRef + (w / TAU) * P,
    lnK3: 3 * Math.log(a) - 2 * Math.log(P),
    A,
    B,
    F,
    G,
  };
}

/** The Thiele-Innes constants (A, B, F, G) of elements a (arcsec), i, Omega, omega (degrees). */
export function thieleInnesOf(el) {
  const [i, O, w] = [el.i * RAD, el.Omega * RAD, el.omega * RAD];
  const a = el.a;
  return {
    A:
      a * (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)),
    B:
      a * (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)),
    F:
      a *
      (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)),
    G:
      a *
      (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)),
  };
}

/**
 * The elements the constants give, the node in [0, 180) degrees and omega shifted
 * to match (astrometry alone cannot tell the node from the opposite one):
 * a (1 + cos i) = hypot(A + G, B - F), a (1 - cos i) = hypot(A - G, B + F).
 */
export function elementsFromThieleInnes({ A, B, F, G }) {
  const pp = Math.hypot(A + G, B - F);
  const qq = Math.hypot(A - G, B + F);
  const sumA = Math.atan2(B - F, A + G);
  const difA = Math.atan2(-(B + F), A - G);
  const Omega = ((((sumA - difA) / 2) % Math.PI) + Math.PI) % Math.PI;
  return {
    a: (pp + qq) / 2,
    i: Math.acos(Math.max(-1, Math.min(1, (pp - qq) / (pp + qq)))) / RAD,
    Omega: Omega / RAD,
    omega: ((((sumA - Omega) / RAD) % 360) + 360) % 360,
  };
}

const DERIVED = ['P', 'a', 'i', 'Omega', 'omega', 'e', 'T', 'lnK3'];
const ANGLES = new Set(['i', 'Omega', 'omega']);
/** Standard deviations of the derived elements by central differences through the covariance. */
function derivedSigmas(v, nl, tRef, cov, P) {
  const out = {};
  const grads = {};
  for (const name of DERIVED) grads[name] = new Array(v.length).fill(0);
  for (let j = 0; j < v.length; j++) {
    const step = 1e-6 * Math.max(Math.abs(v[j]), 1e-3);
    const vp = v.slice();
    const vm = v.slice();
    vp[j] += step;
    vm[j] -= step;
    const ep = elementsOf(vp, nl, tRef);
    const em = elementsOf(vm, nl, tRef);
    for (const name of DERIVED) {
      let d = ep[name] - em[name];
      if (ANGLES.has(name)) d = wrapPi(d);
      if (name === 'Omega')
        d = ((((d + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
      if (name === 'T') d -= P * Math.round(d / P);
      grads[name][j] = d / (2 * step);
    }
  }
  const covariance = {};
  for (const x of DERIVED) {
    covariance[x] = {};
    for (const y of DERIVED) {
      let acc = 0;
      for (let p = 0; p < v.length; p++)
        for (let q = 0; q < v.length; q++)
          acc += grads[x][p] * cov[p][q] * grads[y][q];
      covariance[x][y] = acc;
    }
    out[x] = Math.sqrt(Math.max(covariance[x][x], 0));
  }
  return { sigmas: out, grads, covariance };
}

// ---- the profile of the period -----------------------------------------------------

/** chi-squared profile of the period: other parameters refitted at each; points sorted by P. */
function periodProfile(S, fit, sigmaLn) {
  const [lo, hi] = lnBounds(S);
  const nl = fit.x.length;
  const free = nl > 1 ? [1, 2] : [];
  const pts = [{ value: Math.exp(fit.x[0]), chi2: fit.chi2 }];
  const walk = dir => {
    let step = Math.max(0.25 * sigmaLn, 1e-7);
    let x = fit.x.slice();
    let off = 0;
    for (let n = 0; n < 40; n++) {
      off += step;
      const lnP = fit.x[0] + dir * off;
      if (lnP < lo || lnP > hi) return;
      x = x.slice();
      x[0] = lnP;
      const r = lm(S, x, free, { maxIter: 25 });
      if (!r) return;
      x = r.x;
      pts.push({ value: Math.exp(lnP), chi2: Math.max(r.chi2, fit.chi2) });
      if (r.chi2 - fit.chi2 > 8) return;
      step *= 1.3;
    }
  };
  walk(+1);
  walk(-1);
  pts.sort((a, b) => a.value - b.value);
  return pts;
}

// ---- the fit ---------------------------------------------------------------------

/**
 * Fit a visual binary's apparent orbit.
 * @param {object} series - see `prepare`
 * @param {{depth?: 'circular'|'elliptical'}} [opts]
 * @returns the fit with elements and intervals, or a refusal that carries the code and the numbers
 */
export function fitOrbit(series, opts = {}) {
  const depth = opts.depth ?? 'elliptical';
  if (!DEPTHS.includes(depth))
    return refuse('depth', 'the depth is circular or elliptical', { depth });
  const S = series?.t ? series : prepare(series);
  if (!S.ok) return S;
  const need = CRITERION.minEpochs[depth];
  if (S.n < need)
    return refuse(
      'epochs',
      `a ${depth} orbit needs at least ${need} epochs; ${S.n} given`,
      { epochs: S.n, need, depth }
    );
  let found = search(S, depth);
  // A fit the data reject may be a poor local minimum (a nearly edge-on, very
  // eccentric orbit hides its basin from a coarse scan): search again, finer.
  if (depth === 'elliptical' && found?.fit) {
    const pFit = chi2Survival(found.fit.chi2, 2 * S.n - 7);
    if (!(pFit >= CRITERION.consistentPValue)) {
      const again = search(S, depth, true);
      if (again?.fit && again.fit.chi2 < found.fit.chi2) found = again;
    }
  }
  if (!found || !found.fit)
    return refuse('conditioning', 'no orbit could be fitted to these epochs', {
      depth,
    });
  let result = assess(S, found.fit, depth, found.candidates);
  // The eccentric depth: an eccentricity not detected is the circular orbit, said so.
  if (depth === 'elliptical' && result.ok) {
    const delta = found.circular.chi2 - found.fit.chi2;
    result.eccentricity = {
      detected: delta >= CRITERION.eccentricityDeltaChi2,
      deltaChi2: delta,
    };
    if (!result.eccentricity.detected) {
      const circ = assess(
        S,
        found.circular,
        'circular',
        found.circularCandidates
      );
      if (!circ.ok) return circ;
      circ.eccentricity = {
        detected: false,
        deltaChi2: delta,
        upper95: eccentricityUpper(S, found.fit),
      };
      circ.requested = 'elliptical';
      return circ;
    }
  }
  return result;
}

/** The farthest point of the 95 percent confidence ellipse of (h, k) from the origin: an upper limit on e. */
function eccentricityUpper(S, fit) {
  const { cov } = covarianceOf(S, fit);
  if (!cov) return null;
  const sub = [
    [cov[1][1], cov[1][2]],
    [cov[2][1], cov[2][2]],
  ];
  const ev = eigenSymmetric(sub);
  const mid = [fit.x[1], fit.x[2]];
  let best = 0;
  const r = Math.sqrt(5.991464547107979);
  for (let t = 0; t < 360; t++) {
    const a = t * RAD;
    const u = [
      Math.cos(a) * Math.sqrt(Math.max(ev[0].value, 0)) * r,
      Math.sin(a) * Math.sqrt(Math.max(ev[1].value, 0)) * r,
    ];
    const px = mid[0] + ev[0].vector[0] * u[0] + ev[1].vector[0] * u[1];
    const py = mid[1] + ev[0].vector[1] * u[0] + ev[1].vector[1] * u[1];
    best = Math.max(best, Math.hypot(px, py));
  }
  return Math.min(best, LIMITS.maxEccentricity);
}

/** Apply the criterion to a fit and, when it holds, build the result. */
function assess(S, fit, depth, candidates) {
  const nl = fit.x.length;
  const P = Math.exp(fit.x[0]);
  const params = nl > 1 ? 7 : 5;
  const info = { depth, epochs: S.n, span: S.span, params };
  const cv = covarianceOf(S, fit);
  const sigmaLnP = cv.cov ? Math.sqrt(Math.max(cv.cov[0][0], 0)) : Infinity;
  const sigmaP = P * sigmaLnP;
  const need = CRITERION.coverageFraction[depth];
  const lower = cv.cov ? S.span / (P + CRITERION.coverageSigmas * sigmaP) : 0;
  Object.assign(info, {
    period: P,
    periodSigma: sigmaP,
    coverage: S.span / P,
    coverageLower: lower,
    coverageNeeded: need,
    condition: cv.kappa,
    conditionMax: CRITERION.maxConditionNumber,
  });
  if (!cv.cov || !(lower >= need))
    return refuse(
      'coverage',
      `the arc covers too little of the period: the period's upper two-sigma value leaves ${fixedNum(lower, 2)} of a period covered, and a ${depth} orbit needs ${need}`,
      info
    );
  if (!(cv.kappa <= CRITERION.maxConditionNumber))
    return refuse(
      'conditioning',
      'the parameters are nearly degenerate over this arc (the normal matrix is nearly singular)',
      info
    );
  const pts = periodProfile(S, fit, sigmaLnP);
  const i68 = profileInterval(pts, fit.chi2, { deltaChi2: 1 });
  const i95 = profileInterval(pts, fit.chi2, { deltaChi2: DELTA95 });
  info.periodInterval = i68.status === 'ok' ? [i68.lo, i68.hi] : null;
  if (i68.status !== 'ok' || i68.lo === null || i68.hi === null)
    return refuse(
      'period-unbounded',
      'the period is not bounded on both sides by the data',
      info
    );
  // Part B's rule: another period that fits as well means the data cannot choose.
  const gap = Math.max(
    RULES.ambiguityMinLogPeriodGap,
    RULES.ambiguitySigmas * sigmaLnP
  );
  const other = (candidates ?? []).find(
    c =>
      Math.abs(c.lnP - fit.x[0]) > gap &&
      c.chi2 - fit.chi2 < RULES.ambiguityDeltaChi2
  );
  if (other) {
    info.alternatePeriod = Math.exp(other.lnP);
    info.alternateDeltaChi2 = other.chi2 - fit.chi2;
    return refuse(
      'period-ambiguous',
      `another period, ${fixedNum(Math.exp(other.lnP), 3)} years, fits the epochs as well: the data cannot choose between them`,
      info
    );
  }
  const dof = 2 * S.n - params;
  const pValue = dof >= 1 ? chi2Survival(fit.chi2, dof) : 0;
  info.chi2 = fit.chi2;
  info.dof = dof;
  info.pValue = pValue;
  if (!(dof >= 1 && pValue >= CRITERION.consistentPValue))
    return refuse(
      'inconsistent',
      'the residuals are not consistent with the stated uncertainties: the model does not describe the data, or the uncertainties are too small',
      info
    );
  const v = [...fit.x, ...fit.u];
  const el = elementsOf(v, nl, S.tRef);
  const { sigmas, grads, covariance } = derivedSigmas(v, nl, S.tRef, cv.cov, P);
  const eccentric = nl > 1;
  const q = (value, sigma, extra = {}) => ({ value, sigma, ...extra });
  const elements = {
    P: q(P, sigmas.P, {
      interval68: [i68.lo, i68.hi],
      interval95: i95.status === 'ok' ? [i95.lo, i95.hi] : null,
    }),
    a: q(el.a, sigmas.a),
    i: q(el.i / RAD, sigmas.i / RAD),
    Omega: q(el.Omega / RAD, sigmas.Omega / RAD),
    e: q(eccentric ? el.e : 0, eccentric ? sigmas.e : 0),
    omega: q(el.omega / RAD, sigmas.omega / RAD, {
      meaning: eccentric ? 'periastron' : 'latitude-at-reference',
    }),
    T: eccentric ? q(el.T, sigmas.T) : null,
    tRef: S.tRef,
  };
  const residuals = [];
  const r = fit.r;
  for (let i = 0; i < S.n; i++) {
    const mx = fit.u[0] * fit.c[i] + fit.u[1] * fit.s[i];
    const my = fit.u[2] * fit.c[i] + fit.u[3] * fit.s[i];
    residuals.push({
      i,
      year: S.year[i],
      x: S.x[i],
      y: S.y[i],
      mx,
      my,
      dx: S.x[i] - mx,
      dy: S.y[i] - my,
      zx: r[2 * i],
      zy: r[2 * i + 1],
    });
  }
  return {
    ok: true,
    kind: eccentric ? 'thiele-innes-orbit' : 'circular-apparent-orbit',
    depth: eccentric ? 'elliptical' : 'circular',
    epochs: S.n,
    span: S.span,
    chi2: fit.chi2,
    dof,
    pValue,
    rms: Math.sqrt(
      residuals.reduce((s, q2) => s + q2.dx * q2.dx + q2.dy * q2.dy, 0) /
        (2 * S.n)
    ),
    elements,
    thieleInnes: { A: el.A * 1, B: el.B, F: el.F, G: el.G },
    nodeAmbiguity: true,
    criterion: info,
    order: eccentric
      ? ['lnP', 'h', 'k', 'alpha1', 'alpha2', 'beta1', 'beta2']
      : ['lnP', 'alpha1', 'alpha2', 'beta1', 'beta2'],
    values: v,
    covariance: cv.cov,
    gradients: { lnK3: grads.lnK3, sigmaLnK3: sigmas.lnK3 },
    derivedCovariance: covariance,
    residuals,
    prepared: S,
    fitState: { x: fit.x, u: fit.u },
  };
}

const fixedNum = (v, d) => (finite(v) ? fixed(v, d) : 'n/a');

// ---- predicting ----------------------------------------------------------------------

/** Predicted offsets (north, east) at decimal years for a fit's own parameters. */
export function predict(fit, years) {
  const S = fit.prepared;
  const nl = fit.fitState.x.length;
  const pseudo = {
    n: years.length,
    t: Float64Array.from(years, y => y - S.tRef),
  };
  const c = new Float64Array(pseudo.n);
  const s = new Float64Array(pseudo.n);
  shape(
    pseudo,
    fit.fitState.x[0],
    nl > 1 ? fit.fitState.x[1] : 0,
    nl > 1 ? fit.fitState.x[2] : 0,
    c,
    s
  );
  const u = fit.fitState.u;
  return Array.from(years, (_, i) => ({
    x: u[0] * c[i] + u[1] * s[i],
    y: u[2] * c[i] + u[3] * s[i],
  }));
}

/**
 * Offsets (north, east) at decimal years from Thiele-Innes elements, closed form
 * (the model the fit uses, written out): `el` has a (arcsec), e, i, Omega, omega
 * (degrees), P (years) and T (year of periastron).
 */
export function positionsFromElements(el, years) {
  const [i, O, w] = [el.i * RAD, el.Omega * RAD, el.omega * RAD];
  const A =
    el.a *
    (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i));
  const B =
    el.a *
    (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i));
  const F =
    el.a *
    (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i));
  const G =
    el.a *
    (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i));
  const q = Math.sqrt(1 - el.e * el.e);
  return Array.from(years, t => {
    const E = solveKepler((TAU * (t - el.T)) / el.P, el.e);
    const X = Math.cos(E) - el.e;
    const Y = q * Math.sin(E);
    return { x: A * X + F * Y, y: B * X + G * Y };
  });
}

// ---- the mass sum ------------------------------------------------------------------

/** What a mass sum from a relative or absolute parallax inherits, as a code and the English words. */
export const FRAME_STATEMENT = Object.freeze({
  relative:
    'the parallax is relative to the reference stars of its frame, which is smaller than the absolute parallax by their mean parallax: the distance and the mass sum read high by that much',
  absolute:
    'the parallax is absolute (corrected to the stated source); the correction and its uncertainty are in the parallax given',
});

/**
 * The mass sum in solar masses by Kepler's third law, M = (a / parallax)^3 / P^2,
 * with the parallax's uncertainty and the orbit's covariance propagated (a seeded
 * Monte Carlo of 20,000 draws: the parallax a truncated normal, the orbit's
 * a^3 / P^2 a log-normal from its covariance), and the frame statement attached.
 * @param {object} fit - a fit from fitOrbit
 * @param {{value: number, sigma: number, unit?: 'mas'|'arcsec', frame: 'relative'|'absolute', source?: string}} parallax
 */
export function massSum(fit, parallax) {
  if (!fit?.ok)
    return refuse('no-orbit', 'there is no orbit to give a mass sum', {});
  const unit = parallax?.unit ?? 'mas';
  const scale = unit === 'arcsec' ? 1 : unit === 'mas' ? 1e-3 : null;
  const p0 = parallax?.value * (scale ?? NaN);
  const sp = Number(parallax?.sigma) * (scale ?? NaN);
  if (!finite(p0) || !finite(sp) || !(p0 > 0) || !(sp > 0))
    return refuse(
      'parallax',
      'the mass sum needs a positive parallax and its uncertainty',
      {}
    );
  if (!['relative', 'absolute'].includes(parallax?.frame))
    return refuse(
      'frame',
      'the parallax needs its reference-frame statement: relative or absolute',
      {}
    );
  if (parallax.frame === 'absolute' && !parallax.source)
    return refuse(
      'frame',
      'an absolute parallax needs the source of its correction',
      {}
    );
  const snr = p0 / sp;
  if (snr < RULES.massMinSnr)
    return refuse(
      'parallax-weak',
      `the parallax is only ${fixedNum(snr, 1)} times its uncertainty; the mass sum needs at least ${RULES.massMinSnr}`,
      { snr, need: RULES.massMinSnr }
    );
  const a = fit.elements.a.value;
  const P = fit.elements.P.value;
  const lnK3 = 3 * Math.log(a) - 2 * Math.log(P);
  const sL = fit.gradients.sigmaLnK3;
  const g = gaussian(stream('noise', 'orbit-fit-mass-sum'));
  const draws = [];
  for (let i = 0; i < RULES.massDraws; i++) {
    let plx;
    do plx = p0 + sp * g();
    while (!(plx > 0));
    draws.push(Math.exp(lnK3 + sL * g()) / (plx * plx * plx));
  }
  draws.sort((x, y) => x - y);
  const at = f =>
    draws[Math.min(draws.length - 1, Math.floor(f * draws.length))];
  const plug = (KEPLER_K * Math.exp(lnK3)) / (p0 * p0 * p0);
  const intervals = LEVELS.map(level => ({
    level,
    lo: KEPLER_K * at((1 - level) / 2),
    hi: KEPLER_K * at((1 + level) / 2),
  }));
  return {
    ok: true,
    value: plug,
    unit: 'solar masses',
    intervals,
    parallax: {
      value: p0,
      sigma: sp,
      frame: parallax.frame,
      source: parallax.source ?? null,
      snr,
    },
    frameStatement: FRAME_STATEMENT[parallax.frame],
    method: 'seeded Monte Carlo, 20,000 draws',
    K: KEPLER_K,
  };
}

// ---- through Prompt 148's layer ---------------------------------------------------

/** The sky unit system of the layer: lengths in arcseconds, time in Julian years (G is part of its identity and 1 here). */
const SKY = simulationUnits(1, 'sky');

/**
 * The offsets (north, east) at decimal years from elements, by the orbital
 * layer: `keplerElements` and `elementsToState` (3-D, mu = 4 pi^2 a^3 / P^2), the
 * layer's x and y being north and east. `el` has a (arcsec), e, i, Omega, omega
 * (degrees), P (years) and T (the year of periastron).
 */
export function positionsViaLayer(el, years) {
  const mu = (TAU * TAU * el.a ** 3) / el.P ** 2;
  const elements = keplerElements({
    dimension: 3,
    a: length(el.a, SKY),
    e: dimensionless(el.e),
    i: angle(el.i * RAD),
    Omega: angle(el.Omega * RAD),
    omega: angle(el.omega * RAD),
    anomaly: { type: 'mean', value: angle((-TAU * el.T) / el.P) },
    epoch: instant(0, SKY, 'elapsed'),
    mu: gm(mu, SKY),
  });
  return Array.from(years, t => {
    const state = elementsToState(elements, instant(t, SKY, 'elapsed'));
    return { x: state.r.value[0], y: state.r.value[1] };
  });
}

/** The fit's elements in the form `positionsViaLayer` and `positionsFromElements` take. */
export function elementsFor(fit) {
  const e = fit.elements;
  const eccentric = fit.kind === 'thiele-innes-orbit';
  return {
    a: e.a.value,
    e: e.e.value,
    i: e.i.value,
    Omega: e.Omega.value,
    omega: e.omega.value,
    P: e.P.value,
    T: eccentric ? e.T.value : e.tRef,
  };
}

/** The closed apparent orbit of a fit, n points over one period, by the layer. */
export function orbitCurve(fit, n = 120) {
  const el = fit.elements;
  const P = el.P.value;
  const years = Array.from({ length: n + 1 }, (_, k) => el.tRef + (P * k) / n);
  try {
    return positionsViaLayer(elementsFor(fit), years);
  } catch {
    return predict(fit, years);
  }
}

// ---- quantities, the record, replay, CSV ---------------------------------------------

const MAS = 1000;

/**
 * The fit as the envelope's quantities (Prompt 150's uncertainty kinds): the
 * period with its profile interval, the semi-major axis, the eccentricity (or its
 * upper limit when it is not detected), the angles, and for the eccentric orbit
 * the periastron epoch; the mass sum as an interval when given.
 */
export function quantitiesOf(fit, mass = null) {
  const out = [];
  const sigma = (id, label, value, unit, s) =>
    out.push({
      id,
      label,
      value,
      unit,
      origin: 'fitted',
      uncertainty: { kind: 'sigma', basis: 'data', sigma: s },
    });
  const el = fit.elements;
  const P = el.P;
  out.push({
    id: 'orbit.P',
    label: 'period',
    value: P.value,
    unit: 'yr',
    origin: 'fitted',
    uncertainty: {
      kind: 'interval',
      basis: 'profile',
      level: LEVELS[0],
      lo: P.interval68[0],
      hi: P.interval68[1],
    },
  });
  sigma(
    'orbit.a',
    'semi-major axis',
    el.a.value * MAS,
    'mas',
    el.a.sigma * MAS
  );
  const detected = fit.eccentricity ? fit.eccentricity.detected : false;
  if (fit.kind === 'thiele-innes-orbit' && detected)
    sigma('orbit.e', 'eccentricity', el.e.value, '', el.e.sigma);
  else if (fit.eccentricity && fit.eccentricity.upper95 !== null)
    out.push({
      id: 'orbit.e',
      label: 'eccentricity (upper limit)',
      value: fit.eccentricity.upper95,
      unit: '',
      origin: 'fitted',
      uncertainty: {
        kind: 'limit',
        bound: 'upper',
        basis: 'profile',
        level: LEVELS[1],
      },
    });
  sigma('orbit.i', 'inclination', el.i.value, 'deg', el.i.sigma);
  sigma('orbit.Omega', 'node (mod 180)', el.Omega.value, 'deg', el.Omega.sigma);
  if (fit.kind !== 'thiele-innes-orbit' || !detected)
    sigma(
      'orbit.omega',
      'argument of latitude at the reference epoch',
      el.omega.value,
      'deg',
      el.omega.sigma
    );
  if (fit.kind === 'thiele-innes-orbit' && detected) {
    sigma(
      'orbit.omega',
      'argument of periastron',
      el.omega.value,
      'deg',
      el.omega.sigma
    );
    sigma('orbit.T', 'periastron epoch', el.T.value, 'yr', el.T.sigma);
  }
  if (mass && mass.ok) {
    const i68 = mass.intervals[0];
    out.push({
      id: 'orbit.mass',
      label: 'mass sum',
      value: mass.value,
      unit: 'Msun',
      origin: 'derived',
      uncertainty: {
        kind: 'interval',
        basis: 'derived',
        level: i68.level,
        lo: i68.lo,
        hi: i68.hi,
      },
    });
  }
  return out;
}

/** The reported elements of a fit, in the order of its quantities (ids without the prefix). */
const reportedIds = fit =>
  fit.kind === 'thiele-innes-orbit' && fit.eccentricity?.detected
    ? ['P', 'a', 'e', 'i', 'Omega', 'omega', 'T']
    : ['P', 'a', 'i', 'Omega', 'omega'];
/** Reporting units of each element against the module's own: arcsec to mas, radians to degrees. */
const REPORT_SCALE = {
  P: 1,
  a: MAS,
  e: 1,
  i: 1 / RAD,
  Omega: 1 / RAD,
  omega: 1 / RAD,
  T: 1,
};
const REPORT_UNITS = {
  P: 'yr',
  a: 'mas',
  e: '',
  i: 'deg',
  Omega: 'deg',
  omega: 'deg',
  T: 'yr',
};

/**
 * The Prompt 150 fit-result record: the reported elements as the parameters, with
 * their covariance (propagated from the fit's own parameters), the statistic and
 * the residuals.
 */
export function fitRecordOf(fit) {
  const names = reportedIds(fit);
  const ids = names.map(n => `orbit.${n}`);
  const c = fit.derivedCovariance;
  return {
    model: {
      id:
        fit.kind === 'thiele-innes-orbit'
          ? 'visual-binary-thiele-innes'
          : 'visual-binary-circular',
      version: String(VERSION),
    },
    parameters: ids,
    covariance: {
      order: ids,
      values: names.map(x =>
        names.map(y => c[x][y] * REPORT_SCALE[x] * REPORT_SCALE[y])
      ),
      units: names.map(n => REPORT_UNITS[n]),
    },
    statistic: { name: 'chi2', value: fit.chi2, dof: Math.max(0, fit.dof) },
    residuals: { n: fit.epochs * 2, rms: fit.rms * MAS },
    convergence: { converged: true },
    rank: {
      free: ids.length,
      rank: ids.length,
      status: 'full',
      notConstrained: [],
    },
  };
}

/** What lets a fit be made again: the series as given, the depth and the numbers it gave. */
export function reductionOf(series, fit, opts = {}) {
  return {
    step: STEP,
    version: VERSION,
    kind: fit.kind,
    depth: opts.depth ?? fit.depth,
    series: { epochs: series.epochs.map(e => ({ ...e, time: { ...e.time } })) },
    result: {
      P: fit.elements.P.value,
      a: fit.elements.a.value,
      chi2: fit.chi2,
      dof: fit.dof,
    },
  };
}

/** Run a record again: refit the stored series and say whether the numbers are the same (relative agreement 1e-6). */
export function replay(red) {
  if (red?.step !== STEP || red.version !== VERSION)
    return refuse('record', 'this is not a record of this tool', {});
  const fit = fitOrbit(red.series, { depth: red.depth });
  if (!fit.ok) return fit;
  const same = (a, b) =>
    Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return {
    ok: true,
    agrees:
      same(fit.elements.P.value, red.result.P) &&
      same(fit.elements.a.value, red.result.a),
    fit,
  };
}

/** The epochs and residuals as CSV rows (header supplied by the page, in the reader's words). */
export function csvRows(fit, header, num) {
  return [
    header,
    ...fit.residuals.map(r => [
      String(r.i + 1),
      num(r.year),
      num(r.x),
      num(r.y),
      num(r.dx),
      num(r.dy),
      num(r.zx),
      num(r.zy),
    ]),
  ];
}
