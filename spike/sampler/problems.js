// Prototype (spike): the gate's problems G, B, P and T of THRESHOLDS.md, each
// with its truth (analytic, or a grid posterior on the same likelihood).

import { coreTarget } from './coreAdapter.js';
import { createRun } from './ensemble.js';
import { quantile } from './diagnostics.js';
import { fitOnce } from '../../js/inference/infer.js';
import { gaussian } from '../../js/inference/synthetic.js';
import { CASES, EXPOSURE } from '../../tools/inference-cases.mjs';

const { Math, Float64Array } = globalThis;

const normalQ = [0.16, 0.5, 0.84];

// --- G: correlated Gaussian ---------------------------------------------------
const G_SD = [1, 2, 0.5, 3, 1, 0.2];
const G_MEAN = [0, 1, -2, 5, 0.3, 10];

function cholesky(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j];
    }
  return L;
}

export function problemG() {
  const d = 6;
  const cov = G_SD.map((a, i) =>
    G_SD.map((b, j) => a * b * 0.9 ** Math.abs(i - j))
  );
  const L = cholesky(cov);
  const logProb = x => {
    // z = L^-1 (x - mean) by forward substitution; log p = -|z|^2 / 2
    const z = new Array(d);
    let q = 0;
    for (let i = 0; i < d; i++) {
      let s = x[i] - G_MEAN[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * z[k];
      z[i] = s / L[i][i];
      q += z[i] * z[i];
    }
    return -0.5 * q;
  };
  const sd = G_SD;
  return {
    id: 'G',
    d,
    names: G_SD.map((_, i) => `x${i + 1}`),
    logProb,
    center: G_MEAN.map((m, i) => m + 0.5 * G_SD[i]),
    scale: G_SD,
    steps: 6000,
    truth: {
      mean: G_MEAN,
      sd,
      quantiles: G_MEAN.map((m, i) =>
        normalQ.map(q => m + sd[i] * normalInv(q))
      ),
      corr: cov.map((r, i) => r.map((v, j) => v / (sd[i] * sd[j]))),
    },
  };
}

// --- B: twisted Gaussian (Haario banana) ----------------------------------------
const BANANA_B = 0.03;
export function problemB() {
  const logProb = x =>
    -(x[0] * x[0]) / 200 - 0.5 * (x[1] + BANANA_B * x[0] * x[0] - 3) ** 2;
  // x1 ~ N(0, 10^2); x2 = b (100 - x1^2) + N(0, 1)
  const sd2 = Math.sqrt(1 + BANANA_B ** 2 * 2 * 1e4);
  const q2 = normalQ.map(q => bananaX2Quantile(q));
  return {
    id: 'B',
    d: 2,
    names: ['x1', 'x2'],
    logProb,
    center: [3, 1],
    scale: [10, 4],
    steps: 8000,
    truth: {
      mean: [0, 0],
      sd: [10, sd2],
      quantiles: [normalQ.map(q => 10 * normalInv(q)), q2],
      slope: -BANANA_B,
    },
  };
}

/** x2's exact marginal: a mixture of N(b (100 - x1^2), 1) over x1 ~ N(0, 100). */
function bananaX2Quantile(q) {
  const cdf = y => {
    // integrate over x1 on a fine grid (Gauss-style midpoint, +-8 sd)
    const n = 4000;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const x1 = -80 + (160 * (i + 0.5)) / n;
      const w = Math.exp(-(x1 * x1) / 200) / (10 * Math.sqrt(2 * Math.PI));
      s += w * normalCdf(y - BANANA_B * (100 - x1 * x1)) * (160 / n);
    }
    return s;
  };
  let a = -40;
  let b = 40;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    if (cdf(m) < q) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

// --- P: a table model with normal priors, conjugate truth ---------------------------
export function problemP() {
  const n = 12;
  const g = gaussian('p103-P');
  const x = Float64Array.from({ length: n }, (_, i) => i + 1);
  const sig = 0.5;
  const trueC = [3, 0.8];
  const x0 = 6.5;
  const y = Float64Array.from(
    x,
    v => trueC[0] + trueC[1] * (v - x0) + sig * g()
  );
  const data = {
    x,
    y,
    sigma: new Float64Array(n).fill(sig),
    groups: null,
    rows: Array.from(x, (_, i) => i),
  };
  const prior = [
    { mean: 0, sd: 2 },
    { mean: 0, sd: 0.5 },
  ];
  const request = {
    model: { id: 'poly-1' },
    settings: { x0 },
    parameters: ['c0', 'c1'].map((name, j) => ({
      name,
      mode: 'fitted',
      value: 0,
      lo: -100,
      hi: 100,
      prior: { type: 'normal', ...prior[j] },
    })),
  };
  // conjugate normal posterior: precision A + diag(1/s^2)
  const A = [
    [0, 0],
    [0, 0],
  ];
  const bvec = [0, 0];
  for (let i = 0; i < n; i++) {
    const u = [1, x[i] - x0];
    for (let j = 0; j < 2; j++) {
      bvec[j] += (u[j] * y[i]) / sig ** 2;
      for (let k = 0; k < 2; k++) A[j][k] += (u[j] * u[k]) / sig ** 2;
    }
  }
  for (let j = 0; j < 2; j++) {
    A[j][j] += 1 / prior[j].sd ** 2;
    bvec[j] += prior[j].mean / prior[j].sd ** 2;
  }
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const cov = [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det],
  ];
  const mean = [
    cov[0][0] * bvec[0] + cov[0][1] * bvec[1],
    cov[1][0] * bvec[0] + cov[1][1] * bvec[1],
  ];
  const sd = [Math.sqrt(cov[0][0]), Math.sqrt(cov[1][1])];
  const target = coreTarget(request, data);
  return {
    id: 'P',
    d: 2,
    names: ['c0', 'c1'],
    logProb: target.logProb,
    center: mean.map((m, i) => m + 0.5 * sd[i]),
    scale: sd,
    steps: 2000,
    truth: {
      mean,
      sd,
      quantiles: mean.map((m, i) => normalQ.map(q => m + sd[i] * normalInv(q))),
    },
  };
}

// --- T: two-parameter transit -------------------------------------------------------
/**
 * @param {string} caseName - 'hd209458', 'shallow' or 'grazing'
 * @param {number} seed - the noise seed
 */
export function problemT(caseName, seed, { grid = 301 } = {}) {
  const c = CASES.find(x => x.name === caseName);
  const data = c.data(seed);
  const truth = c.truth;
  const fixedValues = {
    t0: truth.t0,
    P: truth.P,
    aRs: truth.aRs,
    q1: truth.q1,
    q2: truth.q2,
  };
  const parameters = ['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2'].map(name => {
    const spec = { name, mode: 'fixed', value: truth[name], lo: 0, hi: 1 };
    if (name === 'k')
      return { ...spec, mode: 'fitted', value: 0.1, lo: 0.005, hi: 0.5 };
    if (name === 'b')
      return { ...spec, mode: 'fitted', value: 0.4, lo: 0, hi: 1.5 };
    return { ...spec, lo: fixedValues[name], hi: fixedValues[name] };
  });
  const settings = { exposure: EXPOSURE, supersample: 5, annuli: 32 };
  const request = {
    model: { id: 'transit-quadratic' },
    settings,
    parameters: Object.fromEntries(
      parameters.map(p => [
        p.name,
        p.mode === 'fixed'
          ? { mode: 'fixed', value: p.value, lo: p.value, hi: p.value }
          : { mode: 'fitted', lo: p.lo, hi: p.hi, value: p.value },
      ])
    ),
  };
  const fit = fitOnce(request, data);
  const byName = Object.fromEntries(fit.parameters.map(p => [p.name, p]));
  const target = coreTarget(
    { model: request.model, settings, parameters },
    data
  );
  const center = [byName.k.value, byName.b.value];
  const scale = [
    byName.k.sigmaScaled ?? byName.k.sigma,
    byName.b.sigmaScaled ?? byName.b.sigma,
  ];
  return {
    id: `T-${caseName}`,
    d: 2,
    names: ['k', 'b'],
    logProb: target.logProb,
    lo: target.lo,
    hi: target.hi,
    center,
    scale,
    steps: 2000,
    request,
    data,
    fit,
    gridPosterior: () =>
      gridPosterior(target.logProb, center, scale, target.lo, target.hi, grid),
  };
}

/** A grid posterior over two parameters, the box doubled until the edge is quiet. */
export function gridPosterior(logProb, center, scale, lo, hi, n = 301) {
  let span = 8;
  for (let attempt = 0; attempt < 5; attempt++) {
    const ax = [0, 1].map(i => [
      Math.max(lo[i], center[i] - span * scale[i]),
      Math.min(hi[i], center[i] + span * scale[i]),
    ]);
    const xs = [0, 1].map(i =>
      Float64Array.from(
        { length: n },
        (_, j) => ax[i][0] + ((ax[i][1] - ax[i][0]) * j) / (n - 1)
      )
    );
    const lp = new Float64Array(n * n);
    let max = -Infinity;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = logProb([xs[0][i], xs[1][j]]);
        lp[i * n + j] = v;
        if (v > max) max = v;
      }
    const p = Float64Array.from(lp, v => Math.exp(v - max));
    let total = 0;
    let edge = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        total += p[i * n + j];
        if (i === 0 || j === 0 || i === n - 1 || j === n - 1)
          edge += p[i * n + j];
      }
    const sides = [lo, hi].map(() => 0);
    void sides;
    // An edge that is the prior's bound is not truncation.
    let truncated = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const onEdge = [
          i === 0 && xs[0][0] > lo[0] + 1e-12,
          i === n - 1 && xs[0][n - 1] < hi[0] - 1e-12,
          j === 0 && xs[1][0] > lo[1] + 1e-12,
          j === n - 1 && xs[1][n - 1] < hi[1] - 1e-12,
        ].some(Boolean);
        if (onEdge) truncated += p[i * n + j];
      }
    void edge;
    if (truncated / total < 1e-4 || attempt === 4) {
      const marg = [0, 1].map(axis => {
        const m = new Float64Array(n);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) m[axis === 0 ? i : j] += p[i * n + j];
        return m;
      });
      const out = marg.map((m, axis) => marginalStats(xs[axis], m));
      const cross = (() => {
        let sxy = 0;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            sxy +=
              (p[i * n + j] / total) *
              (xs[0][i] - out[0].mean) *
              (xs[1][j] - out[1].mean);
        return sxy / (out[0].sd * out[1].sd);
      })();
      return {
        n,
        span,
        edgeMass: truncated / total,
        parameters: out,
        correlation: cross,
        axes: xs,
        logProb: lp,
      };
    }
    span *= 2;
  }
  return null;
}

function marginalStats(x, m) {
  const n = x.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += m[i];
  let mean = 0;
  for (let i = 0; i < n; i++) mean += (m[i] / total) * x[i];
  let v = 0;
  for (let i = 0; i < n; i++) v += (m[i] / total) * (x[i] - mean) ** 2;
  // the cumulative distribution by the trapezoid rule of the mass in cells
  const cdf = new Float64Array(n);
  let c = 0;
  for (let i = 0; i < n; i++) {
    c += m[i] / total;
    cdf[i] = c - m[i] / total / 2;
  }
  const q = p => {
    if (p <= cdf[0]) return x[0];
    for (let i = 1; i < n; i++)
      if (cdf[i] >= p)
        return (
          x[i - 1] +
          ((x[i] - x[i - 1]) * (p - cdf[i - 1])) / (cdf[i] - cdf[i - 1])
        );
    return x[n - 1];
  };
  return { mean, sd: Math.sqrt(v), quantiles: normalQ.map(q) };
}

// --- special functions ---------------------------------------------------------------
export function normalCdf(x) {
  // Abramowitz-Stegun 7.1.26 on erf is too coarse; use a high-accuracy series/continued fraction
  return 0.5 * erfc(-x / Math.SQRT2);
}
function erfc(x) {
  // W. J. Cody-style rational approximation via complementary error function (Numerical Recipes erfccheb)
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11,
    2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17,
  ];
  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const r = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? r : 2 - r;
}
export function normalInv(p) {
  // Acklam's algorithm refined by one Halley step
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  let x;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - 0.02425) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

export { createRun, quantile };
