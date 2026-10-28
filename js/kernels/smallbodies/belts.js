// =============================================================================
// The belts from a catalog (Prompt 198, SMALL_BODIES.md)
// -----------------------------------------------------------------------------
//   histogram        MEASURED: counts in equal bins of one orbital element
//   fitBaseline      DERIVED: the smooth distribution the gaps are measured
//                    against, a Poisson regression of the bin counts on a
//                    polynomial (log density), fitted ONLY outside every gap window
//   gapSurvey        DERIVED, under ASSUMPTIONS: each window's depletion
//                    D = 1 - N_obs / N_exp with a case-bootstrap percentile
//                    interval, a verdict (resolved or not resolved) and warnings
//   gapDepth         one window of the same
//   classifyOrbit,   MEASURED: orbit-class rules in (a, e, i) and their counts
//   countClasses
//
// What a depletion is, and is not. It is the shortfall of a window against a smooth
// curve drawn through the rest of the distribution: relative to that curve, in
// that window, in THIS catalog. It is not the fraction of bodies a resonance
// removed (the families, the belt's edges and the survey's selection all bend the
// smooth curve), and the numbered catalog is the objects found, not the objects
// there are (js/kernels/smallbodies/selection.js). A window on a steep part of the
// baseline, as the 2:1 gap is at the main belt's outer edge, says so and is not
// called resolved: either the fitted baseline changes steeply across it
// (steep-baseline) or the counts in the two flanks just outside the baseline's mask
// differ by more than a factor of e^steepLimit at three sigma (uneven-flanks, the
// second added after the first validation run showed that a polynomial bridged a
// masked cliff without its fitted slope giving it away). The depletion also carries
// a systematic from the baseline's shape that the bootstrap interval does not: on the
// synthetic belts of the validation it is up to +-0.05, about one standard error.
// =============================================================================

import { percentileInterval, caseBootstrap } from '../statistics/index.js';
import { refused } from '../statistics/check.js';
import { JUPITER_RESONANCES, NEPTUNE_RESONANCES } from './resonances.js';

const { Math, Number, Float64Array, Int32Array } = globalThis;

/** A value on a bin edge belongs to the bin above it; the nudge undoes the rounding of (a - lo) / width (2.5 gave 49.99999999999999). */
const EDGE = 1e-9;

/** Half-widths in a (AU) of the default windows: data-independent, stated before any catalog was seen. */
const WINDOW_HALF_WIDTH_AU = Object.freeze({
  '4:1': 0.015,
  '3:1': 0.025,
  '5:2': 0.025,
  '7:3': 0.02,
  '2:1': 0.04,
});

/** The five jovian gaps with their windows. */
export const DEFAULT_GAPS = Object.freeze(
  JUPITER_RESONANCES.filter(r => r.kind === 'gap').map(r =>
    Object.freeze({
      id: r.id,
      centerAu: r.aAu,
      halfWidthAu: WINDOW_HALF_WIDTH_AU[r.id],
    })
  )
);

/** The rules of the estimate (thresholds.json, rules, holds the same figures). */
export const BELT_DEFAULTS = Object.freeze({
  binWidthAu: 0.01,
  fitRangeAu: Object.freeze([2.0, 3.5]),
  baselineDegree: 4,
  baselineMarginAu: 0.01,
  minObjects: 30,
  minExpected: 10,
  steepLimit: 1.0,
  level: 0.95,
  draws: 400,
});

const ASSUMES = Object.freeze([
  'the catalog rows are independent draws from one population (they are the objects found, not the objects there are)',
  'a smooth polynomial in log density describes the distribution outside the windows and across them',
  'the window and the baseline are part of the estimate; a different window or degree is a different measurement',
  'the bootstrap interval covers the depletion relative to that baseline, not a dynamical clearing fraction',
  "the interval is sampling error only: the baseline's shape adds a systematic that, on the validation belts, reached about one standard error (SMALL_BODIES.md)",
]);

/**
 * Counts of `values` in equal bins [lo + k w, lo + (k + 1) w); values outside are
 * counted apart. NaN and infinities are refused, not dropped.
 */
export function histogram(values, { lo, hi, binWidth }) {
  if (!(binWidth > 0) || !(hi > lo))
    return refused('range', 'the range and the bin width must be positive');
  const nb = Math.round((hi - lo) / binWidth);
  const counts = new Float64Array(nb);
  let below = 0;
  let above = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v))
      return refused('non-finite', 'a value is NaN or infinite');
    if (v < lo) below++;
    else if (v >= hi) above++;
    else counts[Math.min(nb - 1, Math.floor((v - lo) / binWidth + EDGE))]++;
  }
  const centers = Float64Array.from(
    { length: nb },
    (_, k) => lo + (k + 0.5) * binWidth
  );
  return {
    status: 'ok',
    lo,
    hi,
    binWidth,
    counts,
    centers,
    below,
    above,
    n: values.length,
  };
}

// ---- the baseline ----------------------------------------------------------------

function solve(A, b, n) {
  const M = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) row[j] = A[i * n + j];
    row[n] = b[i];
    return row;
  });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 1e-300)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

const polyAt = (c, x) => {
  let s = 0;
  for (let k = c.length - 1; k >= 0; k--) s = s * x + c[k];
  return s;
};

/**
 * Poisson regression of bin counts on a polynomial in x = (a - mid) / half, by
 * iteratively reweighted least squares, over the bins whose centres lie outside
 * every window in `windows` ([lo, hi] pairs in a, already widened by the caller).
 * Counts may be non-integer (an expected-count input is an analytic test).
 * @returns {{status: 'ok', coefficients: Float64Array, mid: number, half: number,
 *   binsUsed: number, deviance: number, iterations: number, density: function}|object}
 */
export function fitBaseline(
  { counts, lo, binWidth },
  windows,
  { degree = BELT_DEFAULTS.baselineDegree } = {}
) {
  const nb = counts.length;
  const hi = lo + nb * binWidth;
  const mid = 0.5 * (lo + hi);
  const half = 0.5 * (hi - lo);
  const xs = [];
  const ys = [];
  for (let k = 0; k < nb; k++) {
    const a = lo + (k + 0.5) * binWidth;
    let out = true;
    for (const [w0, w1] of windows)
      if (a >= w0 && a <= w1) {
        out = false;
        break;
      }
    if (out) {
      xs.push((a - mid) / half);
      ys.push(counts[k]);
    }
  }
  const m = degree + 1;
  if (xs.length < degree + 3)
    return refused(
      'baseline',
      `${xs.length} bins are left outside the windows; a degree-${degree} baseline needs at least ${degree + 3}`
    );
  const n = xs.length;
  const X = xs.map(x => {
    const row = new Float64Array(m);
    row[0] = 1;
    for (let k = 1; k < m; k++) row[k] = row[k - 1] * x;
    return row;
  });
  const eta = Float64Array.from(ys, y => Math.log(y + 0.5));
  let coef = null;
  let dev = Infinity;
  let it = 0;
  for (; it < 50; it++) {
    const A = new Float64Array(m * m);
    const b = new Float64Array(m);
    for (let i = 0; i < n; i++) {
      const mu = Math.exp(Math.max(-30, Math.min(30, eta[i])));
      const z = eta[i] + (ys[i] - mu) / mu;
      for (let r = 0; r < m; r++) {
        b[r] += mu * X[i][r] * z;
        for (let c = r; c < m; c++) A[r * m + c] += mu * X[i][r] * X[i][c];
      }
    }
    for (let r = 0; r < m; r++)
      for (let c = 0; c < r; c++) A[r * m + c] = A[c * m + r];
    const next = solve(A, b, m);
    if (!next) return refused('baseline', 'the baseline system is singular');
    let step = 0;
    if (coef)
      for (let k = 0; k < m; k++)
        step = Math.max(step, Math.abs(next[k] - coef[k]));
    else step = Infinity;
    coef = next;
    let d = 0;
    for (let i = 0; i < n; i++) {
      eta[i] = polyAt(coef, xs[i]);
      const mu = Math.exp(Math.max(-30, Math.min(30, eta[i])));
      d += ys[i] > 0 ? ys[i] * Math.log(ys[i] / mu) - (ys[i] - mu) : mu;
    }
    d *= 2;
    // Stop on the coefficients, not the deviance: the deviance is quadratic at the
    // optimum, so a change of 1e-10 in it left the coefficients 1e-5 away on the
    // real catalog (a 3e-4 error in N_exp; found by the e1 oracle row).
    const done = step < 1e-10;
    dev = d;
    if (done) {
      it++;
      break;
    }
  }
  if (!Number.isFinite(dev))
    return refused(
      'baseline',
      'the baseline fit did not converge to a finite deviance'
    );
  return {
    status: 'ok',
    coefficients: coef,
    mid,
    half,
    binsUsed: n,
    deviance: dev,
    iterations: it,
    /** Fitted expected counts per bin at a. */
    density: a => Math.exp(polyAt(coef, (a - mid) / half)),
  };
}

/** The baseline's expected count over [a0, a1]: Simpson on exp(poly), in bins' units. */
function expectedIn(fit, a0, a1, binWidth) {
  const K = 100;
  const h = (a1 - a0) / (2 * K);
  let s = fit.density(a0) + fit.density(a1);
  for (let k = 1; k < 2 * K; k++)
    s += (k % 2 ? 4 : 2) * fit.density(a0 + k * h);
  return (s * h) / 3 / binWidth;
}

// ---- windows, validation ---------------------------------------------------------

function checkWindows(gaps, exclude, range) {
  const all = [...gaps, ...exclude];
  for (const g of all) {
    if (!(g.halfWidthAu > 0) || !Number.isFinite(g.centerAu))
      return refused(
        'window',
        `window ${g.id ?? ''} has no positive width or no centre`
      );
    if (
      g.centerAu - g.halfWidthAu < range[0] ||
      g.centerAu + g.halfWidthAu > range[1]
    )
      return refused(
        'window',
        `window ${g.id ?? g.centerAu} is not inside the fitted range ${range[0]} to ${range[1]} AU`
      );
  }
  const sorted = [...all].sort((p, q) => p.centerAu - q.centerAu);
  for (let k = 1; k < sorted.length; k++)
    if (
      sorted[k].centerAu - sorted[k - 1].centerAu <=
      sorted[k].halfWidthAu + sorted[k - 1].halfWidthAu
    )
      return refused(
        'window',
        `windows ${sorted[k - 1].id ?? ''} and ${sorted[k].id ?? ''} overlap`
      );
  return null;
}

/**
 * Every window's depletion against ONE baseline fitted outside all of them.
 * @param {ArrayLike<number>} values - semi-major axes (AU), one per object
 * @param {object} [opts] - gaps (default DEFAULT_GAPS), exclude (windows masked
 *   from the fit but not reported), binWidthAu, fitRangeAu, baselineDegree,
 *   baselineMarginAu, minObjects, minExpected, steepLimit, level, draws (0 for
 *   point estimates only), seed (required when draws > 0), label
 */
export function gapSurvey(values, opts = {}) {
  const o = { ...BELT_DEFAULTS, ...opts };
  const gaps = o.gaps ?? DEFAULT_GAPS;
  const exclude = o.exclude ?? [];
  const [lo, hi] = o.fitRangeAu;
  if (!(o.level > 0 && o.level < 1))
    return refused('level', 'the level is not between 0 and 1');
  if (!Number.isInteger(o.draws) || o.draws < 0)
    return refused(
      'draws',
      'the number of draws must be a whole number of at least 0'
    );
  const bad = checkWindows(gaps, exclude, [lo, hi]);
  if (bad) return bad;
  const inRange = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v))
      return refused('non-finite', 'a value is NaN or infinite');
    if (v >= lo && v < hi) inRange.push(v);
  }
  const v = Float64Array.from(inRange);
  const n = v.length;
  if (n < o.minObjects)
    return refused(
      'too-few',
      `${n} objects lie in ${lo} to ${hi} AU; at least ${o.minObjects} are needed`
    );
  const nb = Math.round((hi - lo) / o.binWidthAu);
  const masks = [...gaps, ...exclude].map(g => [
    g.centerAu - g.halfWidthAu - o.baselineMarginAu,
    g.centerAu + g.halfWidthAu + o.baselineMarginAu,
  ]);
  const measure = idx => {
    const counts = new Float64Array(nb);
    const obs = new Float64Array(gaps.length);
    const count = i => {
      const a = v[i];
      counts[Math.min(nb - 1, Math.floor((a - lo) / o.binWidthAu + EDGE))]++;
      for (let g = 0; g < gaps.length; g++)
        if (
          a >= gaps[g].centerAu - gaps[g].halfWidthAu &&
          a < gaps[g].centerAu + gaps[g].halfWidthAu
        )
          obs[g]++;
    };
    if (idx) for (let i = 0; i < idx.length; i++) count(idx[i]);
    else for (let i = 0; i < n; i++) count(i);
    const fit = fitBaseline({ counts, lo, binWidth: o.binWidthAu }, masks, {
      degree: o.baselineDegree,
    });
    return { fit, obs, counts };
  };
  const point = measure(null);
  if (point.fit.status !== 'ok') return point.fit;
  const nExp = gaps.map(g =>
    expectedIn(
      point.fit,
      g.centerAu - g.halfWidthAu,
      g.centerAu + g.halfWidthAu,
      o.binWidthAu
    )
  );
  const depletionOf = (fit, obs) =>
    gaps.map((g, k) => {
      const e = expectedIn(
        fit,
        g.centerAu - g.halfWidthAu,
        g.centerAu + g.halfWidthAu,
        o.binWidthAu
      );
      return e > 0 ? 1 - obs[k] / e : NaN;
    });
  const depletion = depletionOf(point.fit, point.obs);
  let intervals = null;
  let draws = 0;
  let stream = null;
  if (o.draws > 0) {
    let boot;
    try {
      boot = caseBootstrap({
        n,
        draws: o.draws,
        seed: o.seed,
        label: o.label ?? 'gap-survey',
        statistic: idx => {
          const r = measure(idx);
          return r.fit.status === 'ok'
            ? depletionOf(r.fit, r.obs)
            : gaps.map(() => NaN);
        },
      });
    } catch (e) {
      if (e.code) return refused(e.code, e.message);
      throw e;
    }
    if (boot.status !== 'ok') return boot;
    draws = boot.draws;
    stream = boot.stream;
    intervals = gaps.map((g, k) =>
      percentileInterval(
        Float64Array.from(boot.samples, row => row[k]),
        {
          level: o.level,
          method: 'case-bootstrap',
        }
      )
    );
  }
  const flank = g => {
    // Counts in the two flanks just outside the baseline's mask, each the window's width.
    const w = 2 * g.halfWidthAu;
    const edgeL = g.centerAu - g.halfWidthAu - o.baselineMarginAu;
    const edgeR = g.centerAu + g.halfWidthAu + o.baselineMarginAu;
    if (edgeL - w < lo || edgeR + w > hi) return null;
    let L = 0;
    let R = 0;
    for (let i = 0; i < n; i++) {
      if (v[i] >= edgeL - w && v[i] < edgeL) L++;
      else if (v[i] >= edgeR && v[i] < edgeR + w) R++;
    }
    const ratio = Math.log((L + 0.5) / (R + 0.5));
    const z = Math.abs(ratio) / Math.sqrt(1 / (L + 0.5) + 1 / (R + 0.5));
    return { left: L, right: R, logRatio: ratio, z };
  };
  const out = gaps.map((g, k) => {
    const logChange = Math.abs(
      Math.log(point.fit.density(g.centerAu + g.halfWidthAu)) -
        Math.log(point.fit.density(g.centerAu - g.halfWidthAu))
    );
    const warnings = [];
    if (logChange > o.steepLimit) warnings.push('steep-baseline');
    const fl = flank(g);
    if (fl && Math.abs(fl.logRatio) > o.steepLimit && fl.z > 3)
      warnings.push('uneven-flanks');
    if (
      g.centerAu - g.halfWidthAu - lo < 2 * g.halfWidthAu ||
      hi - g.centerAu - g.halfWidthAu < 2 * g.halfWidthAu
    )
      warnings.push('edge');
    const iv = intervals?.[k];
    let verdict = 'not assessed';
    let reason = 'draws is 0: no interval was made';
    if (iv && iv.status === 'ok') {
      if (warnings.includes('steep-baseline')) {
        verdict = 'not resolved';
        reason = 'steep-baseline';
      } else if (warnings.includes('uneven-flanks')) {
        verdict = 'not resolved';
        reason = 'uneven-flanks';
      } else if (!(nExp[k] >= o.minExpected)) {
        verdict = 'not resolved';
        reason = 'too-few-expected';
      } else if (!(iv.lo > 0)) {
        verdict = 'not resolved';
        reason = 'interval-includes-zero';
      } else {
        verdict = 'resolved';
        reason = null;
      }
    } else if (iv) {
      verdict = 'not resolved';
      reason = `interval-${iv.code}`;
    }
    return {
      id: g.id,
      centerAu: g.centerAu,
      halfWidthAu: g.halfWidthAu,
      nObs: point.obs[k],
      nExp: nExp[k],
      depletion: depletion[k],
      lo: iv && iv.status === 'ok' ? iv.lo : null,
      hi: iv && iv.status === 'ok' ? iv.hi : null,
      level: o.level,
      verdict,
      reason,
      resolved: verdict === 'resolved',
      warnings,
      logChange,
      flanks: fl,
    };
  });
  return {
    status: 'ok',
    method: 'case-bootstrap',
    level: o.level,
    draws,
    stream,
    n,
    fitRangeAu: [lo, hi],
    binWidthAu: o.binWidthAu,
    degree: o.baselineDegree,
    baseline: point.fit,
    gaps: out,
    assumes: ASSUMES,
  };
}

/** One window's depletion; `exclude` masks the other windows from the baseline. */
export function gapDepth(values, gap, opts = {}) {
  const r = gapSurvey(values, { ...opts, gaps: [gap] });
  if (r.status !== 'ok') return r;
  return { ...r, gap: r.gaps[0] };
}

// ---- orbit classes ----------------------------------------------------------------

const plutinoA = NEPTUNE_RESONANCES.find(r => r.name === 'the plutinos').aAu;
const twotinoA = NEPTUNE_RESONANCES.find(r => r.name === 'the twotinos').aAu;

/**
 * Orbit-class boxes (thresholds.json, rules.classes): half-open in a, closed in e
 * and i. The Kuiper belt's plutinos and twotinos are a-windows around the
 * resonance's location and so a PROXY for resonance, never a libration test.
 */
export const ORBIT_CLASSES = Object.freeze(
  [
    { id: 'innerMainBelt', a: [2.0, 2.5], e: [0, 0.4], i: [0, 30] },
    { id: 'middleMainBelt', a: [2.5, 2.82], e: [0, 0.4], i: [0, 30] },
    { id: 'outerMainBelt', a: [2.82, 3.27], e: [0, 0.4], i: [0, 30] },
    { id: 'hilda', a: [3.7, 4.2], e: [0, 0.3], i: [0, 20] },
    { id: 'trojan', a: [5.05, 5.4], e: [0, 0.3], i: [0, 40] },
    { id: 'kuiperClassical', a: [42.0, 47.0], e: [0, 0.25], i: [0, 40] },
    {
      id: 'plutino',
      a: [plutinoA - 0.5, plutinoA + 0.5],
      e: [0, 1],
      i: [0, 180],
    },
    {
      id: 'twotino',
      a: [twotinoA - 0.5, twotinoA + 0.5],
      e: [0, 1],
      i: [0, 180],
    },
  ].map(c => Object.freeze(c))
);

/** The class id of an orbit {a, e, i} (AU, 1, degrees), or 'other'; null if not finite. */
export function classifyOrbit({ a, e, i }) {
  if (![a, e, i].every(Number.isFinite)) return null;
  for (const c of ORBIT_CLASSES)
    if (
      a >= c.a[0] &&
      a < c.a[1] &&
      e >= c.e[0] &&
      e <= c.e[1] &&
      i >= c.i[0] &&
      i <= c.i[1]
    )
      return c.id;
  return 'other';
}

/** Counts per class over rows {a, e, i}; rows that are not finite are counted apart. */
export function countClasses(rows) {
  const counts = Object.fromEntries(
    [...ORBIT_CLASSES.map(c => c.id), 'other'].map(id => [id, 0])
  );
  let notFinite = 0;
  for (const r of rows) {
    const id = classifyOrbit(r);
    if (id === null) notFinite++;
    else counts[id]++;
  }
  return { counts, total: rows.length - notFinite, notFinite };
}

// ---- the retrieved catalog ---------------------------------------------------------

/**
 * A catalog pack (js/data/smallbodies/*.json, format gravitas.small-body-catalog/1)
 * as typed columns, with its selection statement carried beside the numbers: a
 * histogram of it is a histogram of what the cut keeps, never of the population.
 */
export function catalogFromPack(pack) {
  if (pack?.format !== 'gravitas.small-body-catalog/1')
    return refused('range', 'not a small-body catalog pack');
  const n = pack.n;
  const idCol = Array.isArray(pack.number) ? 'number' : 'name';
  for (const k of [idCol, 'a', 'e', 'i', 'H'])
    if (!Array.isArray(pack[k]) || pack[k].length !== n)
      return refused('range', `column ${k} does not have ${n} rows`);
  return {
    status: 'ok',
    id: pack.id,
    n,
    number: idCol === 'number' ? Int32Array.from(pack.number) : null,
    name: idCol === 'name' ? pack.name.slice() : null,
    a: Float64Array.from(pack.a),
    e: Float64Array.from(pack.e),
    i: Float64Array.from(pack.i),
    H: Float64Array.from(pack.H),
    selection: pack.selection,
    source: pack.source,
    credit: pack.credit,
    retrieved: pack.retrieved,
  };
}
