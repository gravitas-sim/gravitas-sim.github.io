// =============================================================================
// The measurement and claim instruments
// -----------------------------------------------------------------------------
// Three instruments for the three investigations that teach what a measurement
// is, what a stated uncertainty claims and when a method must say "not
// constrained" (Prompt 190, MEASUREMENT_CLAIMS.md):
//
//   frame-marks       a star on a synthetic frame, marked again and again: the
//                     spread of the marks, the mean and its standard error, and
//                     (once the reader has predicted) the true position
//   coverage-repeats  a seeded ensemble of repeats of one measurement: how often
//                     the stated interval holds the truth, for a symmetric
//                     interval, a biased instrument, an asymmetric interval and
//                     an upper limit
//   profile-refusal   a two-parameter fit whose data fix one combination, and a
//                     straight line fitted to data that are not straight
//
// Everything is synthetic and the truth is known. Every number a lesson asks
// for is a row of the readout under the picture, and the picture is never the
// only place a value is. The sequences are fixed (seeds below), so the numbers a
// lesson states are the numbers every student sees; tests/claimInvestigations
// .test.js recomputes each of them from the functions exported here. The
// generator is a small seeded stream, not the statistics kernel, because the
// kernel has no first adopter yet and an import would install it for everyone.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_CLAIM } from './i18n/en.claim.js';
import { ES_CLAIM } from './i18n/es.claim.js';
import { withUnit } from './format.js';
import { mulberry32 } from './rng.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';

registerMessages('en', EN_CLAIM);
registerMessages('es', ES_CLAIM);

const fix = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '-');
const isOn = x => x >= 0.5;

// -----------------------------------------------------------------------------
// A fixed stream of normal and uniform draws
// -----------------------------------------------------------------------------

/** FNV-1a, 32 bits: a string seed to a number. */
function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** `count` uniforms in (0, 1) from a string seed. */
export function uniforms(seed, count) {
  const next = mulberry32(hashSeed(seed));
  return Float64Array.from({ length: count }, () => next() || 1e-12);
}

/** `count` standard normals (Box-Muller) from a string seed. */
export function normals(seed, count) {
  const u = uniforms(seed, count + (count % 2));
  const z = new Float64Array(u.length);
  for (let i = 0; i < u.length; i += 2) {
    const r = Math.sqrt(-2 * Math.log(u[i]));
    z[i] = r * Math.cos(2 * Math.PI * u[i + 1]);
    z[i + 1] = r * Math.sin(2 * Math.PI * u[i + 1]);
  }
  return z.subarray(0, count);
}

// -----------------------------------------------------------------------------
// Marking a star
// -----------------------------------------------------------------------------

/** The frame, in pixels, and where its star really is. */
export const FRAME = Object.freeze({
  size: 64,
  truth: Object.freeze({ x: 31.4, y: 27.9 }),
  /** The scatter of one mark, in pixels, per pixel of the star's width (FWHM). */
  scatterPerFwhm: 0.2,
  maxMarks: 30,
});
const MARK_Z = normals('claim-marks-151', 2 * FRAME.maxMarks);

/** The k-th mark: the truth, a pointing error that scales with the star's width, and any offset. */
export function mark(k, fwhm = 4, offset = 0) {
  const s = FRAME.scatterPerFwhm * fwhm;
  return {
    x: FRAME.truth.x + s * MARK_Z[2 * k] + offset,
    y: FRAME.truth.y + s * MARK_Z[2 * k + 1],
  };
}

const meanOf = a => a.reduce((s, x) => s + x, 0) / a.length;
const sdOf = a => {
  if (a.length < 2) return NaN;
  const m = meanOf(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

/** The marks so far and what is read from them. */
export function marksView(v) {
  const n = Math.max(1, Math.min(FRAME.maxMarks, Math.round(v.n ?? 5)));
  const fwhm = v.blur ?? 4;
  const offset = v.offset ?? 0;
  const marks = Array.from({ length: n }, (_, k) => mark(k, fwhm, offset));
  const xs = marks.map(m => m.x);
  const ys = marks.map(m => m.y);
  const sdX = sdOf(xs);
  const sdY = sdOf(ys);
  const meanX = meanOf(xs);
  const meanY = meanOf(ys);
  const seX = sdX / Math.sqrt(n);
  const seY = sdY / Math.sqrt(n);
  const errX = meanX - FRAME.truth.x;
  return {
    n,
    fwhm,
    marks,
    meanX,
    meanY,
    sdX,
    sdY,
    seX,
    seY,
    errX,
    errY: meanY - FRAME.truth.y,
    errInSe: errX / seX,
    showTruth: isOn(v.truth ?? 0),
  };
}

function drawFrame(canvas, v) {
  const f = marksView(v);
  const colors = palette();
  const side = Math.min(responsiveHeight(300, 220), canvas.clientWidth || 300);
  const { ctx: g, w } = surface(canvas, side);
  const S = FRAME.size;
  const k = side / S;
  const ox = Math.max(0, (w - side) / 2);
  const X = x => ox + x * k;
  const Y = y => y * k;
  g.fillStyle = '#0b0e16';
  g.fillRect(ox, 0, side, side);
  // The star, blurred, with a fixed speckle of sky noise.
  const sigma = f.fwhm / 2.355;
  const cx = FRAME.truth.x;
  const cy = FRAME.truth.y;
  const noise = uniforms('claim-frame-noise', S * S);
  for (let j = 0; j < S; j += 1) {
    for (let i = 0; i < S; i += 1) {
      const r2 = (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2;
      const a = Math.min(
        1,
        0.9 * Math.exp(-r2 / (2 * sigma * sigma)) + 0.08 * noise[j * S + i]
      );
      g.fillStyle = `rgba(235,240,255,${a.toFixed(3)})`;
      g.fillRect(X(i), Y(j), k + 0.5, k + 0.5);
    }
  }
  // The marks: a cross each, numbered by order; the mean as a ring.
  g.lineWidth = 1.5;
  g.strokeStyle = colors.accent;
  g.fillStyle = colors.accent;
  g.font = typeAt(TYPE.TICK);
  g.textBaseline = 'middle';
  f.marks.forEach((m, i) => {
    const x = X(m.x);
    const y = Y(m.y);
    g.beginPath();
    g.moveTo(x - 4, y);
    g.lineTo(x + 4, y);
    g.moveTo(x, y - 4);
    g.lineTo(x, y + 4);
    g.stroke();
    if (f.n <= 10) g.fillText(String(i + 1), x + 6, y - 6);
  });
  g.strokeStyle = colors.good;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(X(f.meanX), Y(f.meanY), 7, 0, 2 * Math.PI);
  g.stroke();
  if (f.showTruth) {
    g.strokeStyle = colors.warn;
    g.setLineDash([4, 3]);
    g.beginPath();
    g.arc(X(cx), Y(cy), 11, 0, 2 * Math.PI);
    g.stroke();
    g.setLineDash([]);
  }
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(t('claimW.m.legend'), ox + 6, 6);
}

const FRAME_MARKS = {
  id: 'frame-marks',
  get title() {
    return t('claimW.m.title');
  },
  get note() {
    return t('claimW.m.note');
  },
  animated: false,
  controls: [
    {
      id: 'n',
      get label() {
        return t('claimW.m.control.n');
      },
      min: 1,
      max: FRAME.maxMarks,
      step: 1,
      value: 5,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
    {
      id: 'blur',
      get label() {
        return t('claimW.m.control.blur');
      },
      min: 2,
      max: 8,
      step: 1,
      value: 4,
      decimals: 0,
      format: v => withUnit(String(Math.round(v)), 'px'),
    },
    {
      id: 'offset',
      get label() {
        return t('claimW.m.control.offset');
      },
      min: 0,
      max: 1.5,
      step: 0.1,
      value: 0,
      decimals: 1,
      format: v => withUnit(fix(v, 1), 'px'),
    },
    {
      id: 'truth',
      get label() {
        return t('claimW.m.control.truth');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        t(isOn(v) ? 'claimW.m.truth.shown' : 'claimW.m.truth.hidden'),
    },
  ],
  presets: [
    {
      values: { n: 5, blur: 4, offset: 0 },
      get label() {
        return t('claimW.m.preset.five');
      },
    },
    {
      values: { n: 20, blur: 4, offset: 0 },
      get label() {
        return t('claimW.m.preset.twenty');
      },
    },
  ],
  draw: drawFrame,
  readout(v) {
    const f = marksView(v);
    const px = x => withUnit(fix(x, 2), 'px');
    const rows = [
      {
        label: t('claimW.row.source'),
        value: t('claimW.m.value.source'),
        emphasis: true,
      },
      { label: t('claimW.m.row.n'), value: String(f.n) },
      {
        label: t('claimW.m.row.marks'),
        value: f.marks.map(m => `(${fix(m.x, 1)}, ${fix(m.y, 1)})`).join('  '),
      },
      { label: t('claimW.m.row.meanX'), value: px(f.meanX), emphasis: true },
      { label: t('claimW.m.row.meanY'), value: px(f.meanY) },
      { label: t('claimW.m.row.sdX'), value: px(f.sdX), emphasis: true },
      { label: t('claimW.m.row.sdY'), value: px(f.sdY) },
      { label: t('claimW.m.row.seX'), value: px(f.seX), emphasis: true },
      { label: t('claimW.m.row.seY'), value: px(f.seY) },
    ];
    if (f.showTruth) {
      rows.push(
        {
          label: t('claimW.m.row.truth'),
          value: `(${fix(FRAME.truth.x, 1)}, ${fix(FRAME.truth.y, 1)}) px`,
          emphasis: true,
        },
        { label: t('claimW.m.row.errX'), value: px(f.errX), emphasis: true },
        { label: t('claimW.m.row.errSe'), value: fix(f.errInSe, 2) }
      );
    }
    rows.push({
      label: t('claimW.row.how'),
      value: t('claimW.m.value.how'),
    });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// Coverage by repeats
// -----------------------------------------------------------------------------

/** The cases, with the truth each one measures and the claim it states. */
export const CASES = Object.freeze({
  symmetric: Object.freeze({ truth: 10, scatter: 1, stated: 1 }),
  biased: Object.freeze({ truth: 10, scatter: 0.3, stated: 0.3, bias: 0.4 }),
  parallax: Object.freeze({ truthMas: 3, sigmaMas: 0.9 }),
  upper: Object.freeze({ level: 0.95 }),
});
export const REPEATS_MAX = 4000;
const ENS_Z = normals('claim-ensemble-1', REPEATS_MAX);
const ENS_U = uniforms('claim-ensemble-2', REPEATS_MAX);
const CASE_IDS = ['symmetric', 'biased', 'parallax', 'upper'];

/** A Poisson draw by inversion from one uniform, so a larger rate never reorders the repeats. */
export function poissonFrom(u, lambda) {
  let k = 0;
  let p = Math.exp(-lambda);
  let c = p;
  while (u > c && k < 200) {
    k += 1;
    p *= lambda / k;
    c += p;
  }
  return k;
}

/** P(X <= k) for a Poisson mean `lambda`. */
export function poissonCdf(k, lambda) {
  let p = Math.exp(-lambda);
  let c = p;
  for (let i = 1; i <= k; i++) {
    p *= lambda / i;
    c += p;
  }
  return c;
}

/** The one-sided upper limit at `level` for `n` counts: the rate for which seeing n or fewer has chance 1 - level. */
export function upperLimit(n, level = 0.95) {
  let lo = 0;
  let hi = 10 + 3 * n;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (poissonCdf(n, mid) > 1 - level) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The ensemble the readout and the picture read. */
export function coverageView(v) {
  const kind = CASE_IDS[Math.max(0, Math.min(3, Math.round(v.case ?? 0)))];
  const M = Math.max(100, Math.min(REPEATS_MAX, Math.round(v.repeats ?? 2000)));
  const k = v.k ?? 1;
  const rows = [];
  let hits = 0;
  let unbounded = 0;
  let truth = 0;
  let sumStated = 0;
  if (kind === 'symmetric' || kind === 'biased') {
    const c = CASES[kind];
    truth = c.truth;
    for (let i = 0; i < M; i++) {
      const est = c.truth + (c.bias ?? 0) + c.scatter * ENS_Z[i];
      const half = k * c.stated;
      const lo = est - half;
      const hi = est + half;
      rows.push({ est, lo, hi, hit: lo <= truth && truth <= hi });
      sumStated += c.stated;
    }
  } else if (kind === 'parallax') {
    const c = CASES.parallax;
    truth = 1000 / c.truthMas;
    const symmetric = isOn(v.form ?? 0);
    for (let i = 0; i < M; i++) {
      const p = c.truthMas + c.sigmaMas * ENS_Z[i];
      const est = p > 0 ? 1000 / p : Infinity;
      let lo;
      let hi;
      if (symmetric) {
        const half = (k * c.sigmaMas * 1000) / (p * p);
        lo = est - half;
        hi = est + half;
      } else {
        lo = 1000 / (p + k * c.sigmaMas);
        hi = p - k * c.sigmaMas > 0 ? 1000 / (p - k * c.sigmaMas) : Infinity;
      }
      if (!Number.isFinite(hi)) unbounded += 1;
      rows.push({ est, lo, hi, hit: lo <= truth && truth <= hi });
    }
  } else {
    const c = CASES.upper;
    truth = v.rate ?? 3;
    for (let i = 0; i < M; i++) {
      const n = poissonFrom(ENS_U[i], truth);
      const hi = upperLimit(n, c.level);
      rows.push({ est: n, lo: 0, hi, hit: truth <= hi });
    }
  }
  hits = rows.filter(r => r.hit).length;
  const frac = hits / M;
  return {
    kind,
    M,
    k,
    truth,
    rows,
    hits,
    frac,
    se: Math.sqrt((frac * (1 - frac)) / M),
    unbounded,
    meanStated: kind === 'upper' ? NaN : sumStated / M,
    symmetric: isOn(v.form ?? 0),
  };
}

function drawCoverage(canvas, v) {
  const f = coverageView(v);
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(280, 220));
  const shown = f.rows.slice(0, 40);
  const finite = shown
    .flatMap(r => [r.lo, r.hi, r.est])
    .filter(Number.isFinite);
  const cap = f.kind === 'parallax' ? 1500 : Infinity;
  let lo = Math.min(...finite, f.truth);
  let hi = Math.min(Math.max(...finite, f.truth), cap);
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad;
  hi += pad;
  const r = { x: 14, y: 12, w: w - 28, h: h - 40 };
  const X = x => r.x + ((Math.min(Math.max(x, lo), hi) - lo) / (hi - lo)) * r.w;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  const step = r.h / shown.length;
  shown.forEach((row, i) => {
    const y = r.y + step * (i + 0.5);
    g.strokeStyle = row.hit ? colors.accent : colors.warn;
    g.lineWidth = row.hit ? 1.5 : 2.5;
    g.setLineDash(row.hit ? [] : [5, 3]);
    g.beginPath();
    g.moveTo(X(row.lo), y);
    g.lineTo(X(Math.min(row.hi, hi)), y);
    g.stroke();
    if (!Number.isFinite(row.hi) || row.hi > hi) {
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(X(hi) - 5, y - 3);
      g.lineTo(X(hi), y);
      g.lineTo(X(hi) - 5, y + 3);
      g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = row.hit ? colors.accent : colors.warn;
    g.fillRect(X(row.est) - 2, y - 2, 4, 4);
  });
  g.setLineDash([]);
  g.strokeStyle = colors.ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(X(f.truth), r.y);
  g.lineTo(X(f.truth), r.y + r.h);
  g.stroke();
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText(t('claimW.c.legend'), r.x, r.y + r.h + 6);
}

const COVERAGE = {
  id: 'coverage-repeats',
  get title() {
    return t('claimW.c.title');
  },
  get note() {
    return t('claimW.c.note');
  },
  animated: false,
  controls: [
    {
      id: 'case',
      get label() {
        return t('claimW.c.control.case');
      },
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`claimW.c.case.${CASE_IDS[Math.round(v)]}`),
    },
    {
      id: 'k',
      get label() {
        return t('claimW.c.control.k');
      },
      min: 0.5,
      max: 3,
      step: 0.5,
      value: 1,
      decimals: 1,
      format: v => `±${fix(v, 1)} σ`,
    },
    {
      id: 'repeats',
      get label() {
        return t('claimW.c.control.repeats');
      },
      min: 100,
      max: REPEATS_MAX,
      step: 100,
      value: 2000,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
    {
      id: 'form',
      get label() {
        return t('claimW.c.control.form');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v =>
        t(isOn(v) ? 'claimW.c.form.symmetric' : 'claimW.c.form.asymmetric'),
    },
    {
      id: 'rate',
      get label() {
        return t('claimW.c.control.rate');
      },
      min: 0.5,
      max: 8,
      step: 0.5,
      value: 3,
      decimals: 1,
      format: v => fix(v, 1),
    },
  ],
  draw: drawCoverage,
  readout(v) {
    const f = coverageView(v);
    const pct = x => `${fix(100 * x, 1)} %`;
    const rows = [
      {
        label: t('claimW.row.source'),
        value: t('claimW.c.value.source'),
        emphasis: true,
      },
      { label: t('claimW.c.row.case'), value: t(`claimW.c.case.${f.kind}`) },
      { label: t('claimW.c.row.repeats'), value: String(f.M) },
      {
        label: t('claimW.c.row.truth'),
        value: fix(f.truth, f.kind === 'parallax' ? 1 : 2),
      },
    ];
    if (f.kind !== 'upper')
      rows.push({
        label: t('claimW.c.row.interval'),
        value: t('claimW.c.value.interval', { k: fix(f.k, 1) }),
      });
    else
      rows.push({
        label: t('claimW.c.row.interval'),
        value: t('claimW.c.value.upper'),
      });
    rows.push(
      { label: t('claimW.c.row.hits'), value: String(f.hits), emphasis: true },
      { label: t('claimW.c.row.coverage'), value: pct(f.frac), emphasis: true },
      { label: t('claimW.c.row.coverageSe'), value: pct(f.se) }
    );
    if (f.kind === 'parallax')
      rows.push({
        label: t('claimW.c.row.unbounded'),
        value: String(f.unbounded),
      });
    rows.push(
      {
        label: t('claimW.c.row.first'),
        value: f.rows
          .slice(0, 5)
          .map(r =>
            f.kind === 'upper'
              ? `${r.est} → < ${fix(r.hi, 2)}`
              : `${fix(r.est, 2)} [${fix(r.lo, 2)}, ${Number.isFinite(r.hi) ? fix(r.hi, 2) : '∞'}]`
          )
          .join('   '),
      },
      { label: t('claimW.row.how'), value: t('claimW.c.value.how') }
    );
    return rows;
  },
};

// -----------------------------------------------------------------------------
// A fit that cannot fix both parameters, and a line fitted to a curve
// -----------------------------------------------------------------------------

/** The data fix the product of a mass and the sine of an inclination, and nothing else. */
export const PRODUCT = Object.freeze({ q: 0.85, sigma: 0.06 });

/**
 * The profile of the mass: for each trial mass the best inclination sine (never more than 1) and what it costs.
 *
 * @param {number} m - A trial mass in Jupiter masses
 * @returns {{m: number, s: number, chi2: number}} The best sine and the chi-square at that mass
 */
export function profileAt(m) {
  const s = Math.min(1, PRODUCT.q / m);
  return { m, s, chi2: ((m * s - PRODUCT.q) / PRODUCT.sigma) ** 2 };
}

/** The smallest mass inside a chi-square rise of `rise` over the best fit (no largest exists). */
export const lowerMass = rise => PRODUCT.q - Math.sqrt(rise) * PRODUCT.sigma;

/** The six points of the line case: x, y and one sigma each. */
export const LINE = Object.freeze({
  x: [1, 2, 3, 4, 5, 6],
  sigma: 0.1,
  curvature: 0.08,
});
const LINE_Z = normals('claim-line-1', 6);
export const lineData = () =>
  LINE.x.map((x, i) => ({
    x,
    sigma: LINE.sigma,
    y: 0.5 + 0.45 * x + LINE.curvature * x * x + LINE.sigma * LINE_Z[i],
  }));

/** Solve a small linear system by Gauss-Jordan with partial pivoting. */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** The inverse of a small matrix, by solving for each column. */
const inverse = A =>
  A.map((_, j) =>
    solve(
      A,
      A.map((__, i) => (i === j ? 1 : 0))
    )
  ).map((_, i, cols) => cols.map(col => col[i]));

/** Chi-square survival function for an integer number of degrees of freedom. */
export function chi2Sf(x, dof) {
  if (x <= 0) return 1;
  if (dof % 2 === 0) {
    let term = 1;
    let sum = 1;
    for (let i = 1; i < dof / 2; i++) {
      term *= x / 2 / i;
      sum += term;
    }
    return Math.exp(-x / 2) * sum;
  }
  // Odd: erfc(sqrt(x / 2)) plus the finite series (Abramowitz and Stegun 7.1.26 for erfc).
  const z = Math.sqrt(x / 2);
  const tt = 1 / (1 + 0.3275911 * z);
  const erfc =
    tt *
    (0.254829592 +
      tt *
        (-0.284496736 +
          tt * (1.421413741 + tt * (-1.453152027 + tt * 1.061405429)))) *
    Math.exp(-z * z);
  if (dof === 1) return erfc;
  let term = Math.sqrt((2 * x) / Math.PI) * Math.exp(-x / 2);
  let sum = term;
  for (let i = 3; i < dof - 1; i += 2) {
    term *= x / i;
    sum += term;
  }
  return erfc + sum;
}

/** A weighted polynomial fit of `terms` coefficients (2 is a line, 3 a parabola) to the line case. */
export function lineFit(terms = 2) {
  const d = lineData();
  const p = terms;
  const A = Array.from({ length: p }, () => new Array(p).fill(0));
  const b = new Array(p).fill(0);
  for (const { x, y, sigma } of d) {
    const w = 1 / (sigma * sigma);
    for (let i = 0; i < p; i++) {
      b[i] += w * y * x ** i;
      for (let j = 0; j < p; j++) A[i][j] += w * x ** (i + j);
    }
  }
  const beta = solve(A, b);
  const cov = inverse(A);
  let chi2 = 0;
  for (const { x, y, sigma } of d) {
    const model = beta.reduce((s, c, i) => s + c * x ** i, 0);
    chi2 += ((y - model) / sigma) ** 2;
  }
  const dof = d.length - p;
  return {
    terms: p,
    beta,
    sigma: cov.map((row, i) => Math.sqrt(row[i])),
    chi2,
    dof,
    reduced: chi2 / dof,
    p: chi2Sf(chi2, dof),
  };
}

function drawProfile(canvas, v) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(280, 220));
  const r = { x: 48, y: 12, w: w - 62, h: h - 44 };
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  g.textBaseline = 'top';
  if (Math.round(v.case ?? 0) === 0) {
    const m0 = 0.4;
    const m1 = 10;
    const X = m =>
      r.x +
      ((Math.log(m) - Math.log(m0)) / (Math.log(m1) - Math.log(m0))) * r.w;
    const top = 10;
    const Y = c => r.y + r.h - (Math.min(c, top) / top) * r.h;
    for (const [rise, label] of [
      [1, '1'],
      [3.84, '3.84'],
    ]) {
      g.strokeStyle = colors.grid;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.moveTo(r.x, Y(rise));
      g.lineTo(r.x + r.w, Y(rise));
      g.stroke();
      g.setLineDash([]);
      g.textAlign = 'right';
      g.fillText(label, r.x - 5, Y(rise) - 6);
    }
    g.strokeStyle = colors.accent;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const m = m0 * (m1 / m0) ** (i / 200);
      const { chi2 } = profileAt(m);
      if (i === 0) g.moveTo(X(m), Y(chi2));
      else g.lineTo(X(m), Y(chi2));
    }
    g.stroke();
    const trial = profileAt(v.mass ?? 2);
    g.fillStyle = colors.warn;
    g.beginPath();
    g.arc(X(trial.m), Y(trial.chi2), 5, 0, 2 * Math.PI);
    g.fill();
    g.fillStyle = colors.muted;
    g.textAlign = 'left';
    g.fillText(t('claimW.p.axisM'), r.x, r.y + r.h + 6);
    g.textAlign = 'right';
    g.fillText(t('claimW.p.axisChi'), r.x + r.w, r.y + 2);
    return;
  }
  const d = lineData();
  const fit = lineFit(Math.round(v.terms ?? 2));
  const ys = d.map(p => p.y);
  const lo = Math.min(...ys) - 0.4;
  const hi = Math.max(...ys) + 0.4;
  const X = x => r.x + ((x - 0.5) / 6) * r.w;
  const Y = y => r.y + r.h - ((y - lo) / (hi - lo)) * r.h;
  g.strokeStyle = colors.accent;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = 0.5 + (6 * i) / 60;
    const y = fit.beta.reduce((s, c, j) => s + c * x ** j, 0);
    if (i === 0) g.moveTo(X(x), Y(y));
    else g.lineTo(X(x), Y(y));
  }
  g.stroke();
  g.strokeStyle = colors.ink;
  g.fillStyle = colors.ink;
  g.lineWidth = 1.5;
  for (const p of d) {
    g.beginPath();
    g.moveTo(X(p.x), Y(p.y - p.sigma));
    g.lineTo(X(p.x), Y(p.y + p.sigma));
    g.stroke();
    g.beginPath();
    g.arc(X(p.x), Y(p.y), 3.5, 0, 2 * Math.PI);
    g.fill();
  }
  g.fillStyle = colors.muted;
  g.textAlign = 'left';
  g.fillText(t('claimW.p.axisX'), r.x, r.y + r.h + 6);
}

const PROFILE = {
  id: 'profile-refusal',
  get title() {
    return t('claimW.p.title');
  },
  get note() {
    return t('claimW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'case',
      get label() {
        return t('claimW.p.control.case');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'claimW.p.case.line' : 'claimW.p.case.product'),
    },
    {
      id: 'mass',
      get label() {
        return t('claimW.p.control.mass');
      },
      min: 0.5,
      max: 10,
      step: 0.5,
      value: 2,
      decimals: 1,
      format: v => withUnit(fix(v, 1), 'M_J'),
    },
    {
      id: 'terms',
      get label() {
        return t('claimW.p.control.terms');
      },
      min: 2,
      max: 3,
      step: 1,
      value: 2,
      decimals: 0,
      format: v =>
        t(
          Math.round(v) === 3
            ? 'claimW.p.terms.parabola'
            : 'claimW.p.terms.line'
        ),
    },
  ],
  draw: drawProfile,
  readout(v) {
    const rows = [
      {
        label: t('claimW.row.source'),
        value: t('claimW.p.value.source'),
        emphasis: true,
      },
    ];
    if (Math.round(v.case ?? 0) === 0) {
      const at = profileAt(v.mass ?? 2);
      rows.push(
        {
          label: t('claimW.p.row.product'),
          value: `${fix(PRODUCT.q, 2)} ± ${fix(PRODUCT.sigma, 2)} M_J`,
          emphasis: true,
        },
        { label: t('claimW.p.row.s'), value: fix(at.s, 3), emphasis: true },
        {
          label: t('claimW.p.row.chi'),
          value: fix(at.chi2, 2),
          emphasis: true,
        },
        {
          label: t('claimW.p.row.low1'),
          value: t('claimW.p.value.lower', { m: fix(lowerMass(1), 2) }),
          emphasis: true,
        },
        {
          label: t('claimW.p.row.low2'),
          value: t('claimW.p.value.lower', { m: fix(lowerMass(3.84), 2) }),
        },
        {
          label: t('claimW.p.row.high'),
          value: t('claimW.p.value.none'),
          emphasis: true,
        }
      );
    } else {
      const f = lineFit(Math.round(v.terms ?? 2));
      rows.push(
        { label: t('claimW.p.row.points'), value: String(LINE.x.length) },
        { label: t('claimW.p.row.dof'), value: String(f.dof) },
        f.terms === 2
          ? {
              label: t('claimW.p.row.slope'),
              value: `${fix(f.beta[1], 3)} ± ${fix(f.sigma[1], 3)}`,
              emphasis: true,
            }
          : {
              label: t('claimW.p.row.curve'),
              value: `${fix(f.beta[2], 3)} ± ${fix(f.sigma[2], 3)}`,
              emphasis: true,
            },
        {
          label: t('claimW.p.row.chi2'),
          value: fix(f.chi2, 1),
          emphasis: true,
        },
        {
          label: t('claimW.p.row.reduced'),
          value: fix(f.reduced, 2),
          emphasis: true,
        },
        {
          label: t('claimW.p.row.pvalue'),
          value: f.p < 0.001 ? '< 0.001' : fix(f.p, 3),
          emphasis: true,
        }
      );
    }
    rows.push({ label: t('claimW.row.how'), value: t('claimW.p.value.how') });
    return rows;
  },
};

export const CLAIM_WIDGETS = [FRAME_MARKS, COVERAGE, PROFILE];
