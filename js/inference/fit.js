// =============================================================================
// Weighted least squares, bounded and transparent
// -----------------------------------------------------------------------------
// A fit here is three steps, each of which a reader could do by hand:
//
//   1. **A bounded grid.** The parameters a curve is most sensitive to, a
//      transit's period and epoch, are searched on a grid across their bounds,
//      fine enough that no transit falls between two trials. For a transit that
//      is box least squares: fold on each trial period, bin, slide a box the
//      length of a transit, keep the deepest.
//   2. **Levenberg-Marquardt refinement**, from the grid's best and from a few
//      starting points of the parameters the grid does not search, keeping every
//      trial point inside its bounds; a parameter on its bound is held there
//      while the descent points past it. A parameter that is linear in the model -
//      a baseline flux, a velocity zero point - is solved for exactly at every
//      step rather than searched.
//   3. **Uncertainty, three ways, kept apart.**
//      - The covariance of the linearized fit, (J^T W J)^-1 at the best fit:
//        one standard deviation per parameter, correct only as far as the
//        model is linear there and the error bars are right.
//      - A profile of chi-square for each parameter, re-fitting all the others
//        at each value: its Delta chi^2 = 1 interval is a 68% interval under
//        the same two conditions, and is honest about asymmetry and bounds.
//      - A slice, chi-square with the others held at the best fit: a
//        diagnostic of the objective's shape, never an interval.
//      Whether either interval holds 68% of the truth in practice is measured,
//      not asserted: tools/inference-validate.mjs injects signals over many
//      seeds and counts (INFERENCE_CORE.md).
//
// The error bars are the data's. When the fit's reduced chi-square is above 1
// the uncertainties are also given scaled by its square root, and the result
// says so; when the data has no error bars, the fit is unweighted and the
// scatter of the residuals stands in for them, and the result says that too.
//
// Deterministic: no randomness, no clock, the same answer on every machine for
// the same inputs (to the floating-point summation order, which is fixed).
// Cancellable and reporting progress through `hooks`.
// =============================================================================

/** Thrown when hooks.shouldStop() says to stop. */
export class Canceled extends Error {
  constructor() {
    super('canceled');
    this.name = 'Canceled';
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Solve A x = b for a small symmetric positive-definite A (Cholesky). */
export function solveSpd(A, b) {
  const n = b.length;
  const L = A.map(r => r.slice());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = L[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0)) return null;
        L[i][i] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
    for (let j = i + 1; j < n; j++) L[i][j] = 0;
  }
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/** The inverse of a small symmetric positive-definite matrix, or null. */
export function invertSpd(A) {
  const n = A.length;
  const out = [];
  for (let j = 0; j < n; j++) {
    const e = new Array(n).fill(0);
    e[j] = 1;
    const col = solveSpd(A, e);
    if (!col) return null;
    out.push(col);
  }
  return out[0].map((_, i) => out.map(col => col[i]));
}

/**
 * A problem: the model, the data, and which parameters are free.
 *
 * @param {object} model - One of ./models.js MODELS
 * @param {{x: Float64Array, y: Float64Array, sigma: Float64Array|null,
 *   groups?: Int32Array}} data - Rows already cleaned of masks and gaps
 * @param {Array<{name: string, mode: 'fitted'|'fixed', value: number,
 *   lo: number, hi: number}>} parameters - Every model parameter
 * @param {object} settings - The model's settings (exposure, supersample...)
 */
export function createProblem(model, data, parameters, settings = {}) {
  const free = parameters.filter(p => p.mode === 'fitted');
  const weighted = Boolean(data.sigma);
  const w = new Float64Array(data.y.length);
  for (let i = 0; i < w.length; i++) {
    w[i] = weighted ? 1 / (data.sigma[i] * data.sigma[i]) : 1;
  }
  let evaluations = 0;
  const full = theta => {
    const all = {};
    for (const p of parameters) all[p.name] = p.value;
    free.forEach((p, i) => (all[p.name] = theta[i]));
    return all;
  };
  /** Residuals divided by their errors, with the linear parameters solved. */
  const evaluate = theta => {
    evaluations++;
    const values = full(theta);
    const shape = model.predict(values, data.x, settings);
    const { fit, linear } = model.solveLinear(data, w, shape, values);
    const r = new Float64Array(data.y.length);
    let chi2 = 0;
    for (let i = 0; i < r.length; i++) {
      r[i] = (data.y[i] - fit[i]) * Math.sqrt(w[i]);
      chi2 += r[i] * r[i];
    }
    return { r, chi2, fit, linear, values };
  };
  return {
    model,
    data,
    parameters,
    settings,
    free,
    weighted,
    lo: free.map(p => p.lo),
    hi: free.map(p => p.hi),
    evaluate,
    full,
    project: theta => model.project?.(theta, free) ?? theta,
    evaluations: () => evaluations,
  };
}

/** Central differences, one-sided at a bound. */
function jacobian(problem, theta, base) {
  const m = base.r.length;
  const n = theta.length;
  const J = Array.from({ length: n }, () => new Float64Array(m));
  for (let j = 0; j < n; j++) {
    const span = problem.hi[j] - problem.lo[j];
    const h = Math.max(
      1e-10,
      1e-6 * (Number.isFinite(span) ? span : Math.abs(theta[j]) || 1)
    );
    const up = theta.slice();
    const dn = theta.slice();
    up[j] = Math.min(problem.hi[j], theta[j] + h);
    dn[j] = Math.max(problem.lo[j], theta[j] - h);
    const width = up[j] - dn[j];
    if (!(width > 0)) continue;
    const a = up[j] === theta[j] ? base : problem.evaluate(up);
    const b = dn[j] === theta[j] ? base : problem.evaluate(dn);
    for (let i = 0; i < m; i++) J[j][i] = (a.r[i] - b.r[i]) / width;
  }
  return J;
}

/**
 * Bounded Levenberg-Marquardt from a start.
 * @returns {{theta: number[], best: object, iterations: number,
 *   converged: boolean, why: string}}
 */
export function refine(problem, start, opts = {}, hooks = {}) {
  const { maxIterations = 200, tolerance = 1e-10 } = opts;
  let theta = problem.project(
    start.map((v, i) => clamp(v, problem.lo[i], problem.hi[i]))
  );
  let best = problem.evaluate(theta);
  let lambda = 1e-3;
  let why = 'the iteration limit';
  let k = 0;
  // Converged after three accepted steps in a row that each lower chi-square
  // by less than the tolerance: one small step alone is how a fit crawling
  // along a narrow, correlated valley looks, not how a finished one does.
  let small = 0;
  for (; k < maxIterations; k++) {
    if (hooks.shouldStop?.()) throw new Canceled();
    const J = jacobian(problem, theta, best);
    const n = theta.length;
    const JTJ = Array.from({ length: n }, (_, a) =>
      Array.from({ length: n }, (_, b) => {
        let s = 0;
        for (let i = 0; i < best.r.length; i++) s += J[a][i] * J[b][i];
        return s;
      })
    );
    const g = Array.from({ length: n }, (_, a) => {
      let s = 0;
      for (let i = 0; i < best.r.length; i++) s += J[a][i] * best.r[i];
      return -s;
    });
    // A parameter on its bound, with the descent pointing past it, is held
    // there for this step and the others are solved for without it. Solving
    // for all of them and clamping afterwards bends every other parameter's
    // step by the one that could not move, and a fit whose minimum is on a
    // bound - a limb-darkening coefficient at 1 - zigzags along it until the
    // iteration limit (an active-set Levenberg-Marquardt).
    const held = theta.map(
      (v, i) =>
        (v <= problem.lo[i] && g[i] < 0) || (v >= problem.hi[i] && g[i] > 0)
    );
    const moving = held.flatMap((h, i) => (h ? [] : [i]));
    let improved = false;
    for (let tries = 0; tries < 12 && moving.length; tries++) {
      const A = moving.map(a =>
        moving.map(b =>
          a === b ? JTJ[a][a] * (1 + lambda) + 1e-30 : JTJ[a][b]
        )
      );
      const reduced = solveSpd(
        A,
        moving.map(a => g[a])
      );
      if (!reduced) {
        lambda *= 10;
        continue;
      }
      const step = new Array(n).fill(0);
      moving.forEach((a, j) => (step[a] = reduced[j]));
      const next = problem.project(
        theta.map((v, i) => clamp(v + step[i], problem.lo[i], problem.hi[i]))
      );
      const trial = problem.evaluate(next);
      if (trial.chi2 < best.chi2) {
        const gain = (best.chi2 - trial.chi2) / Math.max(best.chi2, 1e-300);
        const moved = next.some((v, i) => v !== theta[i]);
        theta = next;
        best = trial;
        lambda = Math.max(1e-12, lambda / 3);
        improved = true;
        small = gain < tolerance ? small + 1 : 0;
        if (small >= 3 || !moved) {
          why = 'chi-square stopped falling';
          return { theta, best, iterations: k + 1, converged: true, why };
        }
        break;
      }
      lambda *= 5;
    }
    if (!improved) {
      why = 'no step lowers chi-square';
      return { theta, best, iterations: k + 1, converged: true, why };
    }
  }
  return { theta, best, iterations: k, converged: false, why };
}

/**
 * The covariance of the free parameters at a point, from J^T W J.
 * @returns {{covariance: number[][]|null, sigma: number[], correlation:
 *   number[][]|null}}
 */
export function covarianceAt(problem, theta) {
  const base = problem.evaluate(theta);
  const J = jacobian(problem, theta, base);
  const n = theta.length;
  const F = Array.from({ length: n }, (_, a) =>
    Array.from({ length: n }, (_, b) => {
      let s = 0;
      for (let i = 0; i < base.r.length; i++) s += J[a][i] * J[b][i];
      return s;
    })
  );
  const C = invertSpd(F);
  if (!C)
    return { covariance: null, sigma: theta.map(() => NaN), correlation: null };
  const sigma = C.map((row, i) => Math.sqrt(Math.max(0, row[i])));
  const correlation = C.map((row, i) =>
    row.map((v, j) => v / (sigma[i] * sigma[j] || 1))
  );
  return { covariance: C, sigma, correlation };
}

/**
 * Chi-square along one parameter: profiled (the others re-fitted at every
 * value) and sliced (the others held at the best fit).
 */
export function profile(problem, bestTheta, j, values, opts = {}, hooks = {}) {
  const others = problem.free.map((_, i) => i).filter(i => i !== j);
  const fixedAt = (t, v) => {
    const full = new Array(problem.free.length);
    others.forEach((i, k) => (full[i] = t[k]));
    full[j] = v;
    return full;
  };
  const subAt = v => ({
    ...problem,
    free: others.map(i => problem.free[i]),
    lo: others.map(i => problem.lo[i]),
    hi: others.map(i => problem.hi[i]),
    evaluate: t => problem.evaluate(fixedAt(t, v)),
    project: t => {
      const p = problem.project(fixedAt(t, v));
      return others.map(i => p[i]);
    },
  });
  const bestOthers = others.map(i => bestTheta[i]);
  const run = (v, start) =>
    refine(
      subAt(v),
      start,
      { ...opts, maxIterations: opts.profileIterations ?? 60 },
      hooks
    );
  const at = new Map();
  const point = (v, carried) => {
    if (hooks.shouldStop?.()) throw new Canceled();
    const sliceTheta = bestTheta.slice();
    sliceTheta[j] = v;
    const slice = problem.evaluate(problem.project(sliceTheta)).chi2;
    // Two starts: the neighbor's solution, carried outward, and the best fit's
    // own, so a profile that wandered into a side valley is pulled back.
    let r = run(v, carried);
    if (carried !== bestOthers) {
      const fromBest = run(v, bestOthers);
      if (fromBest.best.chi2 < r.best.chi2) r = fromBest;
    }
    at.set(v, { value: v, chi2: r.best.chi2, slice });
    hooks.onProgress?.();
    return r.theta;
  };
  // Outward from the value nearest the best fit, each way.
  const sorted = [...values].sort((a, b) => a - b);
  const c = sorted.reduce(
    (bi, v, i) =>
      Math.abs(v - bestTheta[j]) < Math.abs(sorted[bi] - bestTheta[j]) ? i : bi,
    0
  );
  let carried = point(sorted[c], bestOthers);
  for (let i = c - 1; i >= 0; i--) carried = point(sorted[i], carried);
  carried = at.size ? bestOthers : carried;
  for (let i = c + 1; i < sorted.length; i++)
    carried = point(sorted[i], carried);
  return sorted.map(v => at.get(v));
}

/**
 * Where a profile crosses a level above its minimum, each side; open (null)
 * on a side it never reaches within the values.
 *
 * Interpolated in the square root of Delta chi^2, which is linear in the
 * distance from the minimum for a parabola, so the crossing is exact for one
 * however far apart its two points are. Linear interpolation in Delta chi^2
 * itself puts it too close to the minimum by up to the ratio of the outer
 * point's Delta chi^2 to the level's square root: between a best fit and a
 * point at Delta chi^2 = 9.9, a third of the way.
 */
export function crossing(points, minimum, level = 1) {
  const i0 = points.reduce((b, p, i) => (p.chi2 < points[b].chi2 ? i : b), 0);
  const root = p => Math.sqrt(Math.max(0, p.chi2 - minimum));
  const side = dir => {
    for (let i = i0; i + dir >= 0 && i + dir < points.length; i += dir) {
      const a = points[i];
      const b = points[i + dir];
      if (b.chi2 - minimum >= level) {
        const ra = root(a);
        const rb = root(b);
        return (
          a.value +
          ((Math.sqrt(level) - ra) / (rb - ra || 1)) * (b.value - a.value)
        );
      }
    }
    return null;
  };
  return [side(-1), side(1)];
}
