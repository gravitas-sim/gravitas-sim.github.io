// =============================================================================
// What an experiment's result says, and how sure it is
// -----------------------------------------------------------------------------
// Reads a gravitas.experiment-result/1 (js/experimentsPage.js writes it) and
// answers four questions, each with its uncertainty and its caveats:
//
//   1. At each setting, what did the trials give? Mean with a Student t
//      interval, median with a bootstrap interval, the 16-84% range, and
//      how many trials did not finish.
//   2. How strongly does the measurement follow the setting? Local slopes by
//      finite differences with their standard errors, and elasticities; a
//      weighted straight-line trend; Spearman's rho with a bootstrap interval.
//   3. How much of the scatter is the setting, and how much the seed? The
//      share eta², and a permutation test of "the setting makes no
//      difference". A two-setting grid splits the share between the two
//      settings and their interaction.
//   4. What should a reader not conclude? The warnings: a rising-and-falling
//      measurement cannot be read back to one setting, a flat stretch does
//      not identify the setting there, survivors' means are biased, an
//      extremum at the edge may lie outside the range, one seed measures no
//      scatter at all.
//
// Nothing here is a posterior probability, and nothing here says so. The
// intervals are frequentist, at 95%, and ANALYSIS_LAB.md says what each
// assumes and how the validation found they behave.
//
// Every random draw comes from one stream seeded by the analysis's own seed,
// so the same result and seed give the same numbers, bit for bit. The work is
// counted before it starts (planSweepAnalysis), refused past the device's
// limit, and yields to the page every 12 ms, so it can be canceled.
// =============================================================================

// A trial that finished with its value, in the result format's own word
// (js/experiments/status.js STATUS.OK). Not imported: this module runs in a
// lazy chunk of a page that loads the status module at start, and sharing it
// would split it into a chunk of its own (see ./stats.js).
const OK = 'ok';
import { canonicalJson, fnvHex8 } from '../hash.js';
import {
  LEVEL,
  bootstrap,
  describe,
  histogram,
  median,
  meanInterval,
  permutationTest,
  quantile,
  sortedFinite,
  spearman,
  stream,
  varianceShare,
} from './stats.js';

export const ANALYSIS_FORMAT = 'gravitas.analysis';
export const ANALYSIS_VERSION = 1;
export const SWEEP_ANALYSIS = { id: 'sweep-analysis', version: '1.0.0' };

/**
 * How much resampling an analysis may do. `draws` is the total number of
 * random draws, the unit the work is priced in: a bootstrap of n values costs
 * n draws a resample, a permutation of n values n.
 */
export const LIMITS = Object.freeze({
  resamples: { min: 200, max: 10_000, default: 1000 },
  permutations: { min: 199, max: 9999, default: 999 },
  draws: { 'low-end': 5_000_000, desktop: 20_000_000 },
});

/** A result's design: its axes, and whether their values were a grid. */
export function designOf(result) {
  const m = result?.manifest;
  if (!m || !Array.isArray(m.vary) || !m.vary.length) return null;
  const axes = m.vary.map(v => {
    const values = [
      ...new Set(
        (result.trials || [])
          .map(tr => tr.params?.[v.parameter])
          .filter(x => Number.isFinite(x))
      ),
    ].sort((a, b) => a - b);
    return {
      parameter: v.parameter,
      sampled: Boolean(v.distribution),
      values,
    };
  });
  const sampled = axes.some(a => a.sampled);
  const kind = sampled ? 'sampled' : axes.length === 2 ? 'grid-2d' : 'grid-1d';
  return { kind, axes };
}

const okValue = (tr, metric) =>
  tr.status === OK && Number.isFinite(tr.results?.[metric])
    ? tr.results[metric]
    : null;

/**
 * The work an analysis would do, and whether to refuse it.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {{metric?: string, resamples?: number, permutations?: number,
 *   profile?: 'low-end'|'desktop', rate?: number}} [o] `rate` is draws per
 *   millisecond on this device, measured by calibrate(); without it the time
 *   is not forecast
 * @returns {{metric: string|null, trials: number, ok: number, cells: number,
 *   draws: number, ms: number|null, refusals: Array<{reason: string, detail: object}>}}
 */
export function planSweepAnalysis(result, o = {}) {
  const refusals = [];
  const design = designOf(result);
  const metrics = result?.manifest?.observables?.metrics || [];
  const metric = o.metric ?? metrics[0] ?? null;
  const out = {
    metric,
    trials: result?.trials?.length || 0,
    ok: 0,
    cells: 0,
    draws: 0,
    ms: null,
    refusals,
  };
  if (!design || !Array.isArray(result?.trials)) {
    refusals.push({ reason: 'notAResult', detail: {} });
    return out;
  }
  if (!metrics.includes(metric)) {
    refusals.push({ reason: 'noMetric', detail: { metric } });
    return out;
  }
  const B = clamp(o.resamples ?? LIMITS.resamples.default, LIMITS.resamples);
  const P = clamp(
    o.permutations ?? LIMITS.permutations.default,
    LIMITS.permutations
  );
  const ok = result.trials.filter(tr => okValue(tr, metric) !== null).length;
  const cells = new Set(result.trials.map(tr => JSON.stringify(tr.params)))
    .size;
  out.ok = ok;
  out.cells = cells;
  // At most: a median interval per cell (B draws of its n), the rank
  // correlation's interval (B draws of every trial), and the permutation
  // test (P shuffles of every trial).
  out.draws = B * ok + B * ok + P * ok;
  if (o.rate > 0) out.ms = Math.ceil(out.draws / o.rate);
  if (!ok) refusals.push({ reason: 'noTrials', detail: {} });
  const max = LIMITS.draws[o.profile === 'low-end' ? 'low-end' : 'desktop'];
  if (out.draws > max)
    refusals.push({
      reason: 'tooManyDraws',
      detail: { draws: out.draws, max },
    });
  return out;
}

function clamp(v, { min, max }) {
  return Math.max(min, Math.min(max, Math.round(Number(v) || min)));
}

/**
 * Draws a millisecond on this device: a short timed burst of the same kind of
 * work the analysis does. Timed with the page's clock, and never under 1.
 * @param {() => number} [now]
 */
export function calibrate(now = () => performance.now()) {
  const next = stream('calibrate');
  const xs = Float64Array.from({ length: 200 }, () => next());
  const t0 = now();
  let draws = 0;
  while (now() - t0 < 8) {
    bootstrap(xs, median, { resamples: 20, next });
    draws += 20 * xs.length;
  }
  return Math.max(1, draws / Math.max(1, now() - t0));
}

/** A cooperative yield every ~12 ms, and a check for cancellation. */
function pacer(signal, now) {
  let last = now();
  return async () => {
    if (signal?.aborted) throw abortError();
    if (now() - last < 12) return;
    await new Promise(r => setTimeout(r, 0));
    last = now();
    if (signal?.aborted) throw abortError();
  };
}

function abortError() {
  const e = new Error('canceled');
  e.name = 'AbortError';
  return e;
}

/**
 * The analysis.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {{metric?: string, resamples?: number, permutations?: number,
 *   seed?: string, signal?: AbortSignal, onProgress?: (f: number) => void,
 *   now?: () => number, profile?: string}} [o]
 * @returns {Promise<object>} See ANALYSIS_LAB.md for every field
 */
export async function analyzeSweep(result, o = {}) {
  const plan = planSweepAnalysis(result, o);
  if (plan.refusals.length) {
    const e = new Error(plan.refusals[0].reason);
    e.name = 'AnalysisRefused';
    e.refusals = plan.refusals;
    throw e;
  }
  const now = o.now ?? (() => performance.now());
  const pace = pacer(o.signal, now);
  const metric = plan.metric;
  const design = designOf(result);
  const B = clamp(o.resamples ?? LIMITS.resamples.default, LIMITS.resamples);
  const P = clamp(
    o.permutations ?? LIMITS.permutations.default,
    LIMITS.permutations
  );
  const seed = String(o.seed ?? 'analysis');
  const next = stream(seed);
  const keys = design.axes.map(a => a.parameter);

  // --- 1. Each setting ---------------------------------------------------------
  const byCell = new Map();
  for (const tr of result.trials) {
    const id = keys.map(k => tr.params?.[k]).join('|');
    if (!byCell.has(id))
      byCell.set(id, {
        params: Object.fromEntries(keys.map(k => [k, tr.params?.[k]])),
        values: [],
        statuses: {},
      });
    const cell = byCell.get(id);
    cell.statuses[tr.status] = (cell.statuses[tr.status] || 0) + 1;
    const v = okValue(tr, metric);
    if (v !== null) cell.values.push(v);
  }
  const cells = [];
  const done = { n: 0 };
  const total = byCell.size + 3;
  for (const c of [...byCell.values()].sort((a, b) => order(a, b, keys))) {
    const d = describe(c.values);
    const trials = Object.values(c.statuses).reduce((a, b) => a + b, 0);
    // Seeds that all gave the same number measured no scatter: an interval
    // of width zero would claim a precision the integration does not have.
    const identical = d.n >= 2 && d.max === d.min;
    cells.push({
      params: c.params,
      trials,
      n: d.n,
      left: trials - d.n,
      statuses: c.statuses,
      identical,
      ...pick(d),
      se: identical ? null : d.se,
      meanInterval: identical ? null : meanInterval(d),
      medianInterval:
        d.n >= 5 && !identical
          ? interval(bootstrap(c.values, median, { resamples: B, next }))
          : null,
    });
    await pace();
    o.onProgress?.(++done.n / total);
  }

  // --- The pool: every finished trial -------------------------------------------
  const pooledValues = cells.flatMap(c => byCell.get(cellId(c, keys)).values);
  const sorted = sortedFinite(pooledValues);
  const pooled = {
    ...pick(describe(sorted)),
    q025: quantile(sorted, 0.025),
    q975: quantile(sorted, 0.975),
    histogram: histogram(sorted),
  };

  // --- 2. Sensitivity -------------------------------------------------------------
  const pairs = result.trials
    .map(tr => [tr.params?.[keys[0]], okValue(tr, metric)])
    .filter(([x, v]) => Number.isFinite(x) && v !== null);
  let sensitivity;
  if (design.kind === 'grid-2d') sensitivity = gridSensitivity2d(cells, keys);
  else sensitivity = gridSensitivity1d(cells, keys[0], design.kind, pairs);
  sensitivity.spearman = rankCorrelation(pairs, B, next);
  await pace();
  o.onProgress?.(++done.n / total);

  // --- 3. Setting against seed ------------------------------------------------------
  const groups = cells
    .map(c => byCell.get(cellId(c, keys)).values)
    .filter(g => g.length);
  const share = varianceShare(groups);
  // What the repeats at one setting measured: nothing (one trial each), no
  // scatter (every seed the same number, as in the bench's laboratory
  // scenarios), or a scatter. Only a scatter can be tested against: without
  // one every shuffle ties, and a test would say nothing.
  const repeated = cells.filter(c => c.n >= 2);
  const replicates = !repeated.length
    ? 'none'
    : repeated.every(c => c.identical)
      ? 'identical'
      : 'scatter';
  const test =
    design.kind === 'sampled' || replicates !== 'scatter'
      ? null
      : permutationTest(groups, { permutations: P, next });
  const shares = {
    eta2:
      replicates === 'scatter' || design.kind === 'sampled'
        ? (share?.eta2 ?? null)
        : null,
    p: test?.p ?? null,
    permutations: test ? P : 0,
    replicates,
  };
  // A grid of two settings divides its scatter between them and their
  // interaction whether or not the seeds add any: for a model that ignores
  // the seed it is a decomposition of the function over the grid, with the
  // seeds' share exactly zero.
  if (design.kind === 'grid-2d')
    Object.assign(shares, twoWayShares(cells, byCell, keys));

  // --- Numerical uncertainty: the same experiment at another step ----------------
  const numerical = o.reference
    ? stepComparison(result, o.reference, metric, keys, cells)
    : null;
  if (numerical?.comparable && design.kind === 'grid-1d')
    applyNumerical(sensitivity, numerical, keys[0]);
  await pace();
  o.onProgress?.(++done.n / total);

  // --- 4. What not to conclude ---------------------------------------------------------
  const warnings = warningsFor({
    design,
    cells,
    sensitivity,
    shares,
    pooled,
    numerical,
  });
  o.onProgress?.(1);

  return {
    format: ANALYSIS_FORMAT,
    formatVersion: ANALYSIS_VERSION,
    kind: 'sweep',
    tool: SWEEP_ANALYSIS,
    options: { metric, resamples: B, permutations: P, seed, level: LEVEL },
    design: {
      kind: design.kind,
      axes: design.axes.map(a => ({
        parameter: a.parameter,
        sampled: a.sampled,
        values: a.values,
      })),
    },
    source: sourceOf(result),
    // The engine, and a digest of the trials read (the hash covers the manifest).
    engine: result.engine ?? null,
    consumed: [
      {
        kind: 'experiment-result',
        id: result.hash,
        digest: fnvHex8(canonicalJson(result.trials ?? [])),
      },
    ],
    cells,
    pooled,
    sensitivity,
    shares,
    numerical,
    warnings,
    work: { draws: plan.draws },
  };
}

const cellId = (c, keys) => keys.map(k => c.params[k]).join('|');
const cellKey = params => JSON.stringify(params);

function order(a, b, keys) {
  for (const k of keys)
    if (a.params[k] !== b.params[k]) return a.params[k] - b.params[k];
  return 0;
}

const pick = d => ({
  mean: d.mean,
  sd: d.sd,
  se: d.se,
  min: d.min,
  q16: d.q16,
  median: d.median,
  q84: d.q84,
  max: d.max,
});

const interval = b => (b ? { lo: b.lo, hi: b.hi } : null);

/** The source, whole: its manifest is how anyone reruns it. */
export function sourceOf(result) {
  return {
    format: result.format,
    formatVersion: result.formatVersion,
    hash: result.hash,
    manifest: result.manifest,
    engine: result.engine ?? null,
    environment: result.environment ?? null,
    status: result.status ?? null,
    finishedAt: result.finishedAt ?? null,
  };
}

/**
 * The experiment's manifest without what may differ between two runs of the
 * same experiment: its step, its title and this device's limits.
 */
export function sameExperiment(a, b) {
  const strip = m => {
    const rest = { ...(m || {}) };
    const sampleEvery = rest.numerics?.sampleEvery ?? null;
    for (const k of ['numerics', 'limits', 'title']) delete rest[k];
    return JSON.stringify({ ...rest, sampleEvery });
  };
  return strip(a) === strip(b);
}

/**
 * Two runs of one experiment at different integration steps: how much each
 * setting's value moves when the step changes. For a method of order q the
 * error of the coarser run is about the difference times 2^q / (2^q - 1), so
 * the difference is the scale of the numerical error, not an upper bound;
 * ANALYSIS_LAB.md says so, and why a halved step is the test to run.
 */
export function stepComparison(result, reference, metric, keys, cells) {
  const fa = result.manifest?.numerics?.frameSeconds ?? null;
  const fb = reference?.manifest?.numerics?.frameSeconds ?? null;
  if (
    !reference?.manifest ||
    !sameExperiment(result.manifest, reference.manifest)
  )
    return { comparable: false, reason: 'otherExperiment' };
  if (!(fa > 0 && fb > 0) || fa === fb)
    return { comparable: false, reason: 'sameStep' };
  const other = new Map();
  for (const tr of reference.trials || []) {
    const v = okValue(tr, metric);
    if (v === null) continue;
    const id = keys.map(k => tr.params?.[k]).join('|');
    if (!other.has(id)) other.set(id, []);
    other.get(id).push(v);
  }
  let maxRel = 0;
  const rows = cells.map(c => {
    const vs = other.get(cellId(c, keys));
    const b = vs?.length ? vs.reduce((x, y) => x + y, 0) / vs.length : null;
    const diff = c.mean !== null && b !== null ? c.mean - b : null;
    const rel = diff !== null && c.mean !== 0 ? Math.abs(diff / c.mean) : null;
    if (rel !== null) maxRel = Math.max(maxRel, rel);
    return { params: c.params, value: c.mean, other: b, diff, rel };
  });
  return { comparable: true, frameSeconds: [fa, fb], cells: rows, maxRel };
}

/** Slopes judged against the numerical error, where the seeds give none. */
function applyNumerical(sensitivity, numerical, key) {
  const diff = new Map(numerical.cells.map(r => [r.params[key], r.diff]));
  const xs = sensitivity.local.map(s => s.at);
  sensitivity.local.forEach((s, j) => {
    const a = xs[Math.max(0, j - 1)];
    const b = xs[Math.min(xs.length - 1, j + 1)];
    const da = diff.get(a);
    const db = diff.get(b);
    if (
      s.slope === null ||
      da === null ||
      db === null ||
      da === undefined ||
      db === undefined
    )
      return;
    s.numericalError = Math.hypot(da, db) / Math.abs(b - a);
    if (s.se === null) s.resolved = Math.abs(s.slope) > 2 * s.numericalError;
  });
}

/**
 * Local slopes along one setting: a central difference at interior cells, a
 * one-sided one at the ends, each with its standard error from the two
 * cells' standard errors (independent trials, so their variances add). A
 * slope is `resolved` when it is more than twice its error. The elasticity
 * (d ln y / d ln x) is the slope scaled to x / y: a 1% change of the setting
 * changes the measurement by that many percent.
 */
function gridSensitivity1d(cells, key, kind, pairs) {
  const pts = cells
    .filter(c => c.n > 0)
    .map(c => ({ x: c.params[key], m: c.mean, se: c.se }));
  const local = pts.map((p, j) => {
    const a = pts[Math.max(0, j - 1)];
    const b = pts[Math.min(pts.length - 1, j + 1)];
    if (a === b || b.x === a.x)
      return {
        at: p.x,
        slope: null,
        se: null,
        elasticity: null,
        resolved: null,
        numericalError: null,
      };
    const slope = (b.m - a.m) / (b.x - a.x);
    const se =
      a.se !== null && b.se !== null
        ? Math.hypot(a.se, b.se) / Math.abs(b.x - a.x)
        : null;
    const elasticity = p.m !== 0 && p.x !== 0 ? (slope * p.x) / p.m : null;
    return {
      at: p.x,
      slope,
      se,
      elasticity,
      resolved: se === null ? null : Math.abs(slope) > 2 * se,
      numericalError: null,
    };
  });
  return {
    kind,
    parameter: key,
    local: kind === 'sampled' ? [] : local,
    trend: trendOf(
      kind === 'sampled' ? pairs.map(([x, m]) => ({ x, m, se: null })) : pts
    ),
    bins: kind === 'sampled' ? binsOf(pairs) : null,
  };
}

/**
 * A straight line through the cell means, by ordinary least squares, its
 * slope's standard error from their scatter about the line (Student's, with
 * points - 2 degrees of freedom). Not weighted by the cells' own errors:
 * weights from estimated variances favor the cells whose scatter happened to
 * come out small, and the validation measured the bias and the overconfidence
 * that gives (ANALYSIS_LAB.md). A curved relation makes the error larger,
 * which is the honest direction.
 */
function trendOf(pts) {
  const use = pts.filter(p => Number.isFinite(p.m));
  const n = use.length;
  if (n < 3) return null;
  const mx = use.reduce((a, p) => a + p.x, 0) / n;
  const my = use.reduce((a, p) => a + p.m, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of use) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.m - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let rss = 0;
  for (const p of use) rss += (p.m - intercept - slope * p.x) ** 2;
  return { slope, intercept, se: Math.sqrt(rss / (n - 2) / sxx), points: n };
}

/**
 * A sampled design rarely repeats a setting, so its trend is also read in
 * bins: the trials sorted by the setting and cut into three to eight groups
 * of equal size, each described.
 */
function binsOf(pairs) {
  if (pairs.length < 10) return null;
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const k = Math.min(8, Math.max(3, Math.floor(sorted.length / 5)));
  const out = [];
  for (let b = 0; b < k; b++) {
    const part = sorted.slice(
      Math.floor((b * sorted.length) / k),
      Math.floor(((b + 1) * sorted.length) / k)
    );
    const d = describe(part.map(p => p[1]));
    out.push({
      lo: part[0][0],
      hi: part[part.length - 1][0],
      n: d.n,
      mean: d.mean,
      se: d.se,
    });
  }
  return out;
}

function rankCorrelation(pairs, B, next) {
  if (pairs.length < 5) return null;
  const x = Float64Array.from(pairs, p => p[0]);
  const y = Float64Array.from(pairs, p => p[1]);
  const rho = spearman(x, y);
  if (rho === null) return { rho: null, lo: null, hi: null };
  const n = pairs.length;
  const got = new Float64Array(B);
  const bx = new Float64Array(n);
  const by = new Float64Array(n);
  let kept = 0;
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < n; i++) {
      const j = Math.floor(next() * n);
      bx[i] = x[j];
      by[i] = y[j];
    }
    const r = spearman(bx, by);
    if (r !== null) got[kept++] = r;
  }
  const s = got.subarray(0, kept).sort();
  return {
    rho,
    lo: quantile(s, 0.025),
    hi: quantile(s, 0.975),
    resamples: kept,
  };
}

/**
 * Two settings. The main effect of each is its mean over the other; a slope
 * along each is fitted to those means. The shares split the total sum of
 * squares into each setting, their interaction and the seeds, from the cell
 * means with every cell weighted by its trials. They add to one exactly when
 * every cell has the same number of trials, and nearly otherwise.
 */
function gridSensitivity2d(cells, keys) {
  const main = keys.map((k, axis) => {
    const levels = [...new Set(cells.map(c => c.params[k]))].sort(
      (a, b) => a - b
    );
    const effects = levels.map(v => {
      const ms = cells
        .filter(c => c.params[k] === v && c.n > 0)
        .map(c => c.mean);
      const d = describe(ms);
      return { value: v, mean: d.mean, se: d.se, cells: d.n };
    });
    return {
      parameter: k,
      axis,
      effects,
      trend: trendOf(
        effects
          .filter(e => e.mean !== null)
          .map(e => ({ x: e.value, m: e.mean, se: e.se }))
      ),
    };
  });
  return { kind: 'grid-2d', parameters: keys, main };
}

function twoWayShares(cells, byCell, keys) {
  const full = cells.filter(c => c.n > 0);
  const grand = full.reduce((a, c) => a + c.mean, 0) / full.length;
  const rowMean = new Map();
  const colMean = new Map();
  for (const [map, k] of [
    [rowMean, keys[0]],
    [colMean, keys[1]],
  ]) {
    const by = new Map();
    for (const c of full) {
      const v = c.params[k];
      if (!by.has(v)) by.set(v, []);
      by.get(v).push(c.mean);
    }
    for (const [v, ms] of by)
      map.set(v, ms.reduce((a, b) => a + b, 0) / ms.length);
  }
  let a = 0;
  let b = 0;
  let ab = 0;
  let within = 0;
  for (const c of full) {
    const r = rowMean.get(c.params[keys[0]]) - grand;
    const q = colMean.get(c.params[keys[1]]) - grand;
    const i =
      c.mean -
      rowMean.get(c.params[keys[0]]) -
      colMean.get(c.params[keys[1]]) +
      grand;
    a += c.n * r * r;
    b += c.n * q * q;
    ab += c.n * i * i;
    for (const v of byCell.get(cellId(c, keys)).values)
      within += (v - c.mean) ** 2;
  }
  const total = a + b + ab + within;
  const f = x => (total > 0 ? x / total : null);
  const complete =
    full.length === cells.length && new Set(full.map(c => c.n)).size === 1;
  return {
    split: {
      [keys[0]]: f(a),
      [keys[1]]: f(b),
      interaction: f(ab),
      seeds: f(within),
    },
    balanced: complete,
  };
}

/** The caveats, as codes with the numbers each message needs. */
function warningsFor({
  design,
  cells,
  sensitivity,
  shares,
  pooled,
  numerical,
}) {
  const w = [];
  const withN = cells.filter(c => c.n > 0);
  const step = numerical?.comparable ? numerical : null;
  if (shares.replicates === 'none' && design.kind !== 'sampled')
    w.push({ code: step ? 'oneSeedStepped' : 'oneSeed', detail: {} });
  else if (shares.replicates === 'identical')
    w.push({
      code: step ? 'deterministicStepped' : 'deterministic',
      detail: {},
    });
  else {
    const few = withN.filter(c => c.n >= 2 && c.n < 5).length;
    if (few) w.push({ code: 'fewTrials', detail: { cells: few } });
  }
  const empty = cells.filter(c => c.n === 0).length;
  if (empty) w.push({ code: 'emptyCells', detail: { cells: empty } });
  const left = cells.reduce((a, c) => a + c.left, 0);
  if (left) {
    const statuses = {};
    for (const c of cells)
      for (const [s, k] of Object.entries(c.statuses))
        if (s !== OK) statuses[s] = (statuses[s] || 0) + k;
    w.push({
      code: 'survivors',
      detail: { trials: left, statuses: Object.keys(statuses).join(', ') },
    });
  }
  if (shares.p !== null && shares.p > 0.05)
    w.push({ code: 'notResolved', detail: { p: shares.p } });
  const rho = sensitivity.spearman;
  if (
    design.kind === 'sampled' &&
    rho?.lo !== null &&
    rho?.lo !== undefined &&
    rho.lo <= 0 &&
    rho.hi >= 0
  )
    w.push({ code: 'noTrend', detail: { lo: rho.lo, hi: rho.hi } });
  if (step && step.maxRel > 0.01)
    w.push({
      code: 'stepSensitive',
      detail: {
        rel: step.maxRel,
        a: step.frameSeconds[0],
        b: step.frameSeconds[1],
      },
    });
  if (numerical && !numerical.comparable)
    w.push({ code: `reference.${numerical.reason}`, detail: {} });
  if (
    shares.replicates === 'scatter' &&
    shares.eta2 !== null &&
    shares.eta2 < 0.5
  )
    w.push({ code: 'seedsDominate', detail: { share: 1 - shares.eta2 } });
  if (design.kind === 'grid-1d') {
    const pts = withN.map(c => c);
    // Direction changes that the errors resolve.
    // A step between neighbors counts when it exceeds twice its error: the
    // seeds' where they scatter, the step comparison's where it was run, and
    // otherwise a millionth of the range, so rounding is not a turn.
    let turns = 0;
    let last = 0;
    const means = pts.map(c => c.mean);
    const span = Math.max(...means) - Math.min(...means);
    const numDiff = new Map(
      (step?.cells || []).map(r => [cellKey(r.params), r.diff])
    );
    for (let j = 1; j < pts.length; j++) {
      const d = pts[j].mean - pts[j - 1].mean;
      let err = null;
      if (pts[j].se !== null && pts[j - 1].se !== null)
        err = Math.hypot(pts[j].se, pts[j - 1].se);
      else if (step) {
        const x = numDiff.get(cellKey(pts[j].params));
        const y = numDiff.get(cellKey(pts[j - 1].params));
        if (Number.isFinite(x) && Number.isFinite(y)) err = Math.hypot(x, y);
      } else if (shares.replicates !== 'scatter') err = 5e-7 * span;
      if (err === null || Math.abs(d) <= 2 * err) continue;
      const sign = Math.sign(d);
      if (last && sign !== last) turns++;
      last = sign;
    }
    if (turns) w.push({ code: 'nonMonotonic', detail: { turns } });
    // A stretch of three or more unresolved slopes.
    const local = sensitivity.local;
    let run = [];
    let longest = [];
    for (const s of local) {
      if (s.resolved === false) run.push(s.at);
      else run = [];
      if (run.length > longest.length) longest = [...run];
    }
    if (longest.length >= 3)
      w.push({
        code: 'flat',
        detail: { from: longest[0], to: longest[longest.length - 1] },
      });
    if (pts.length >= 3) {
      const means = pts.map(c => c.mean);
      const hi = means.indexOf(Math.max(...means));
      const lo = means.indexOf(Math.min(...means));
      // Both extremes at the ends is a trend, and says nothing about beyond
      // the range. One extreme inside and the other at an end is a peak or a
      // trough that may continue past it.
      const end = i => i === 0 || i === means.length - 1;
      const at = i => pts[i].params[design.axes[0].parameter];
      if (end(hi) && !end(lo))
        w.push({ code: 'edgeMax', detail: { at: at(hi) } });
      if (end(lo) && !end(hi))
        w.push({ code: 'edgeMin', detail: { at: at(lo) } });
    }
  }
  if (design.kind === 'grid-2d' && shares.balanced === false)
    w.push({ code: 'unbalanced', detail: {} });
  if (pooled.min > 0 && pooled.max / pooled.min > 100)
    w.push({ code: 'wideRange', detail: { ratio: pooled.max / pooled.min } });
  return w;
}
