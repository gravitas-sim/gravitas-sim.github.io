// =============================================================================
// One fit, from observation to result: what runs inside an inference realm
// -----------------------------------------------------------------------------
// fitOnce() is the whole of a fit but its profiles:
//
//   1. the data: the observation's time, value and uncertainty columns, less
//      masked rows and missing values, each counted;
//   2. the grid (./fit.js step 1): box least squares over period and epoch for
//      a transit, a sinusoid periodogram for a radial-velocity orbit, when the
//      reader has left those free;
//   3. refinement from the grid's best and from several starts of the
//      parameters the grid does not search, keeping the lowest chi-square;
//   4. for a radial-velocity fit, jitter by a bounded golden-section search
//      around steps 2-3, since it is not a least-squares parameter;
//   5. the covariance, the derived quantities with linearized uncertainties,
//      and every warning the result has earned.
//
// profileTask() is one parameter's profile, for the scheduler to spread
// across realms (./run.js). Both are pure functions of their inputs; nothing
// here touches a page, and a Worker realm is where they are meant to run.
// =============================================================================

import { MODELS } from './models.js';
import {
  Canceled,
  covarianceAt,
  createProblem,
  crossing,
  profile,
  refine,
} from './fit.js';
import { halfDuration } from './transit.js';

/**
 * The observatory's time units (js/observatory/units.js), in seconds. A copy,
 * not an import: the fit panel must reach none of its page's modules
 * (js/observatory/fitPanel.js says why), and tests/inference.test.js holds
 * the two to agreement.
 */
export const TIME_UNIT_SECONDS = Object.freeze({
  s: 1,
  min: 60,
  h: 3600,
  d: 86400,
});

/**
 * How many of a column's time units make a day, or null when its unit - a
 * canonical id, perhaps after a power-of-ten scale - is not a time.
 * @param {string|null} unit
 */
export function perDayOf(unit) {
  const m = /^(?:(\S+)\s+)?(\S+)$/.exec(String(unit ?? '').trim());
  if (!m || !Object.hasOwn(TIME_UNIT_SECONDS, m[2])) return null;
  const scale = m[1] === undefined ? 1 : Number(m[1].replace(/^10\^/, '1e'));
  return scale > 0 ? 86400 / (scale * TIME_UNIT_SECONDS[m[2]]) : null;
}

/** The rows a fit uses, and how many it leaves out and why. */
export function dataFrom(observation, { x, y, sigma, group } = {}) {
  const col = id => observation.columns.find(c => c.id === id);
  const xs = col(x ?? observation.axes.x);
  const ys = col(y ?? observation.axes.y);
  const ss =
    sigma === null
      ? null
      : col(
          sigma ??
            observation.columns.find(
              c => c.role === 'uncertainty' && c.of === ys.id
            )?.id
        );
  const gs = group ? col(group) : null;
  const masked = new Set();
  for (const m of observation.masks || [])
    for (const r of m.rows) masked.add(r);
  const keep = [];
  let missing = 0;
  let badSigma = 0;
  for (let i = 0; i < xs.values.length; i++) {
    if (masked.has(i)) continue;
    const a = xs.values[i];
    const b = ys.values[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      missing++;
      continue;
    }
    if (ss && !(ss.values[i] > 0)) {
      badSigma++;
      continue;
    }
    keep.push(i);
  }
  const pick = c => Float64Array.from(keep, i => c.values[i]);
  // Numbered afresh for each dataset, in the order the instruments appear,
  // so the same data gives the same zero points whatever was fitted before.
  const groupNames = new Map();
  const groupIndex = v => {
    const key = String(v);
    if (!groupNames.has(key)) groupNames.set(key, groupNames.size);
    return groupNames.get(key);
  };
  const groups = gs
    ? Int32Array.from(keep, i => groupIndex(gs.values[i]))
    : null;
  // How many of the time column's units make a day. The models work in the
  // column's own unit; only the period search's trial durations are stated
  // in hours, and a light curve counted in hours must get them in hours.
  // Null when the column does not state a time unit.
  const perDay = perDayOf(xs.unit);
  return {
    x: pick(xs),
    y: pick(ys),
    sigma: ss ? pick(ss) : null,
    groups,
    rows: keep,
    counts: {
      total: xs.values.length,
      used: keep.length,
      masked: masked.size,
      missing,
      withoutUncertainty: badSigma,
    },
    columns: { x: xs.id, y: ys.id, sigma: ss?.id ?? null },
    units: { x: xs.unit, y: ys.unit },
    perDay,
  };
}

// --- The grid ----------------------------------------------------------------------

/**
 * Box least squares: for each trial period, the epoch and duration of the
 * deepest box, by folding and binning (Kovacs, Zucker & Mazeh 2002).
 */
export function boxSearch(
  data,
  { P: [Plo, Phi], t0: [t0lo], durations },
  hooks = {}
) {
  const x = data.x;
  const w = data.sigma
    ? Float64Array.from(data.sigma, s => 1 / (s * s))
    : new Float64Array(x.length).fill(1);
  const span = x[x.length - 1] - x[0] || 1;
  const dmin = Math.min(...durations);
  const cycles = span / Plo;
  const dP = Plo === Phi ? 1 : Math.max(1e-7, dmin / (4 * cycles));
  const trials = Plo === Phi ? 1 : Math.ceil((Phi - Plo) / dP) + 1;
  let best = null;
  let total = 0;
  let wsum = 0;
  for (let i = 0; i < x.length; i++) {
    total += w[i] * data.y[i];
    wsum += w[i];
  }
  const mean = total / wsum;
  for (let t = 0; t < trials; t++) {
    if (t % 64 === 0 && hooks.shouldStop?.()) throw new Canceled();
    const P = Math.min(Phi, Plo + t * dP);
    const nb = Math.max(8, Math.ceil(P / (dmin / 4)));
    const sw = new Float64Array(nb);
    const swy = new Float64Array(nb);
    for (let i = 0; i < x.length; i++) {
      const ph = ((((x[i] - t0lo) / P) % 1) + 1) % 1;
      const k = Math.min(nb - 1, Math.floor(ph * nb));
      sw[k] += w[i];
      swy[k] += w[i] * (data.y[i] - mean);
    }
    for (const D of durations) {
      const m = Math.max(1, Math.round((D / P) * nb));
      let a = 0;
      let c = 0;
      for (let k = 0; k < m; k++) {
        a += sw[k];
        c += swy[k];
      }
      for (let k = 0; k < nb; k++) {
        if (a > 0 && a < wsum) {
          // Signal residue (KZM eq. 5): the box's weighted depth, squared.
          const power = (c * c) / (a * (1 - a / wsum));
          if (c < 0 && (!best || power > best.power)) {
            const center = ((k + m / 2) / nb) * P + t0lo;
            best = { P, t0: center, D, depth: -c / a / (1 - a / wsum), power };
          }
        }
        a += sw[(k + m) % nb] - sw[k];
        c += swy[(k + m) % nb] - swy[k];
      }
    }
    if (t % 256 === 0) hooks.onProgress?.(0.3 * (t / trials));
  }
  return { best, trials, step: dP };
}

/**
 * A circular orbit's periodogram: for each trial period, the least-squares
 * sinusoid and zero point, keeping the lowest chi-square.
 */
export function sinusoidSearch(data, { P: [Plo, Phi] }, hooks = {}) {
  const x = data.x;
  const w = data.sigma
    ? Float64Array.from(data.sigma, s => 1 / (s * s))
    : new Float64Array(x.length).fill(1);
  const span = x[x.length - 1] - x[0] || 1;
  // Phase drift across the baseline of a tenth of a cycle per step.
  const trials =
    Plo === Phi ? 1 : Math.ceil(((1 / Plo - 1 / Phi) * span) / 0.1) + 1;
  let best = null;
  for (let t = 0; t < trials; t++) {
    if (t % 64 === 0 && hooks.shouldStop?.()) throw new Canceled();
    const f =
      trials === 1
        ? 1 / Plo
        : 1 / Phi + ((1 / Plo - 1 / Phi) * t) / (trials - 1);
    // Weighted normal equations for y = A sin + B cos + C.
    const M = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const v = [0, 0, 0];
    for (let i = 0; i < x.length; i++) {
      const ph = 2 * Math.PI * f * x[i];
      const row = [Math.sin(ph), Math.cos(ph), 1];
      for (let a = 0; a < 3; a++) {
        v[a] += w[i] * row[a] * data.y[i];
        for (let b = 0; b < 3; b++) M[a][b] += w[i] * row[a] * row[b];
      }
    }
    const sol = solve3(M, v);
    if (!sol) continue;
    let chi2 = 0;
    for (let i = 0; i < x.length; i++) {
      const ph = 2 * Math.PI * f * x[i];
      const r =
        data.y[i] - (sol[0] * Math.sin(ph) + sol[1] * Math.cos(ph) + sol[2]);
      chi2 += w[i] * r * r;
    }
    if (!best || chi2 < best.chi2)
      best = { P: 1 / f, A: sol[0], B: sol[1], C: sol[2], chi2 };
    if (t % 256 === 0) hooks.onProgress?.(0.3 * (t / trials));
  }
  if (!best) return { best: null, trials };
  // -K sin(2 pi (t - tc) / P) = A sin + B cos: K = hypot, and the phase of tc.
  const K = Math.hypot(best.A, best.B);
  const phc = Math.atan2(best.B, -best.A);
  return { best: { ...best, K, tc: (phc * best.P) / (2 * Math.PI) }, trials };
}

function solve3(M, v) {
  const [[a, b, c], [d, e, f], [g, h, i]] = M;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!(Math.abs(det) > 1e-300)) return null;
  const inv = [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
  return inv.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
}

// --- One fit -----------------------------------------------------------------------

/** The parameter list a problem needs, from the model and the request. */
function parameterList(model, request, starts) {
  return model.parameters.map(p => {
    const r = request.parameters?.[p.name] || {};
    const lo = r.lo ?? p.lo;
    const hi = r.hi ?? p.hi;
    const mode = r.mode || 'fitted';
    const value =
      r.value ??
      starts[p.name] ??
      p.start ??
      (Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : 0);
    return { name: p.name, mode, value, lo, hi };
  });
}

/** Starts for a transit from the box search, one per impact parameter. */
function transitStarts(request, data, hooks, search) {
  const P = request.parameters.P;
  const t0 = request.parameters.t0;
  const bFixed = request.parameters.b?.mode === 'fixed';
  const bStarts = bFixed
    ? [request.parameters.b.value]
    : (request.algorithm?.starts?.b ?? [0.1, 0.45, 0.75]);
  let grid = null;
  if (P.mode !== 'fixed' || t0.mode !== 'fixed') {
    const exposure = request.settings?.exposure || 0;
    const perDay = data.perDay ?? 1;
    const durations = [1, 1.5, 2, 3, 4.5, 6]
      .map(h => (h / 24) * perDay)
      .filter(d => d > exposure && d < P.lo / 4);
    grid = boxSearch(
      data,
      {
        P: P.mode === 'fixed' ? [P.value, P.value] : [P.lo, P.hi],
        t0: [t0.mode === 'fixed' ? t0.value : t0.lo],
        durations: durations.length
          ? durations
          : [Math.max(exposure * 2, P.lo / 20)],
      },
      hooks
    );
    search.grid = { trials: grid.trials, step: grid.step, best: grid.best };
  }
  const g = grid?.best;
  const Pv = P.mode === 'fixed' ? P.value : (g?.P ?? (P.lo + P.hi) / 2);
  let t0v = t0.mode === 'fixed' ? t0.value : (g?.t0 ?? t0.lo);
  // The epoch the grid found, moved into the reader's bounds by whole periods.
  if (t0.mode !== 'fixed') {
    while (t0v < t0.lo) t0v += Pv;
    while (t0v > t0.hi) t0v -= Pv;
  }
  const depth = Math.max(1e-5, g?.depth ?? 0.01);
  const k = Math.min(0.49, Math.sqrt(depth));
  const D = g?.D ?? 0.1;
  return bStarts.map(b => {
    const s = Math.sin((Math.PI * D) / Pv);
    const aRs =
      s > 0 ? Math.sqrt(Math.max(0.01, (1 + k) ** 2 - b * b)) / s : 10;
    return { t0: t0v, P: Pv, k, aRs: Math.min(150, Math.max(2, aRs)), b };
  });
}

function rvStarts(request, data, hooks, search) {
  const P = request.parameters.P;
  let g = null;
  if (P.mode !== 'fixed') {
    const out = sinusoidSearch(data, { P: [P.lo, P.hi] }, hooks);
    g = out.best;
    search.grid = {
      trials: out.trials,
      best: g && { P: g.P, K: g.K, tc: g.tc },
    };
  }
  const Pv = P.mode === 'fixed' ? P.value : (g?.P ?? (P.lo + P.hi) / 2);
  const tcReq = request.parameters.tc;
  let tc = tcReq?.mode === 'fixed' ? tcReq.value : (g?.tc ?? data.x[0]);
  if (tcReq?.lo !== undefined) {
    while (tc < tcReq.lo) tc += Pv;
    while (tc > tcReq.hi) tc -= Pv;
  }
  const K = g?.K ?? 50;
  return [
    { P: Pv, tc, K, sqrtEcosw: 0, sqrtEsinw: 0 },
    { P: Pv, tc, K, sqrtEcosw: 0.3, sqrtEsinw: 0.3 },
    { P: Pv, tc, K, sqrtEcosw: -0.3, sqrtEsinw: 0.3 },
  ];
}

/** The fit at one jitter: every start refined, the best kept. */
function fitAt(model, data, request, starts, jitter, hooks) {
  const d =
    jitter > 0 && data.sigma
      ? {
          ...data,
          sigma: Float64Array.from(data.sigma, s =>
            Math.sqrt(s * s + jitter * jitter)
          ),
        }
      : data;
  let best = null;
  let evaluations = 0;
  for (const s of starts) {
    const parameters = parameterList(model, request, s);
    const problem = createProblem(model, d, parameters, request.settings || {});
    if (!problem.free.length) {
      const r = problem.evaluate([]);
      evaluations += problem.evaluations();
      if (!best || r.chi2 < best.chi2)
        best = {
          problem,
          theta: [],
          chi2: r.chi2,
          result: r,
          iterations: 0,
          converged: true,
          why: 'nothing to fit',
        };
      continue;
    }
    const start = problem.free.map(p => p.value);
    const r = refine(problem, start, request.algorithm?.lm, hooks);
    evaluations += problem.evaluations();
    if (!best || r.best.chi2 < best.chi2)
      best = {
        problem,
        theta: r.theta,
        chi2: r.best.chi2,
        result: r.best,
        iterations: r.iterations,
        converged: r.converged,
        why: r.why,
      };
  }
  // -2 ln L, which is what jitter is chosen by; chi-square alone always
  // prefers more jitter.
  let logTerm = 0;
  if (d.sigma) for (const s of d.sigma) logTerm += Math.log(s * s);
  return { ...best, data: d, minus2lnL: best.chi2 + logTerm, evaluations };
}

/** Golden-section search for the jitter that minimizes -2 ln L. */
function jitterSearch(model, data, request, starts, hooks) {
  const n = model.nuisance?.[0];
  const req = request.parameters?.jitter || {};
  if (!n || req.mode === 'fixed' || !data.sigma) {
    const j = req.value ?? 0;
    return {
      jitter: j,
      fit: fitAt(model, data, request, starts, j, hooks),
      trials: 1,
    };
  }
  let lo = req.lo ?? n.lo;
  let hi = req.hi ?? n.hi;
  const g = (Math.sqrt(5) - 1) / 2;
  const at = new Map();
  const f = s => {
    if (!at.has(s)) at.set(s, fitAt(model, data, request, starts, s, hooks));
    return at.get(s).minus2lnL;
  };
  let a = hi - g * (hi - lo);
  let b = lo + g * (hi - lo);
  for (let it = 0; it < 30 && hi - lo > 1e-3 * (n.hi - n.lo + 1e-9); it++) {
    if (f(a) < f(b)) {
      hi = b;
      b = a;
      a = hi - g * (hi - lo);
    } else {
      lo = a;
      a = b;
      b = lo + g * (hi - lo);
    }
  }
  // The edge itself, since jitter is often truly zero.
  const candidates = [lo, hi, a, b, n.lo];
  let jitter = candidates[0];
  for (const c of candidates) if (f(c) < f(jitter)) jitter = c;
  return { jitter, fit: at.get(jitter), trials: at.size };
}

/**
 * The whole fit but its profiles.
 * @param {object} request - The inference manifest's model, parameters,
 *   settings and algorithm (./manifest.js)
 * @param {object} data - dataFrom()
 */
export function fitOnce(request, data, hooks = {}) {
  const model = MODELS[request.model.id];
  if (!model) throw new Error(`there is no model "${request.model.id}"`);
  if (data.x.length < 5) throw new Error('fewer than five rows to fit');
  const search = {};
  const starts =
    model === MODELS['transit-quadratic']
      ? transitStarts(request, data, hooks, search)
      : rvStarts(request, data, hooks, search);
  hooks.onProgress?.(0.35);
  const { jitter, fit, trials } = jitterSearch(
    model,
    data,
    request,
    starts,
    hooks
  );
  hooks.onProgress?.(0.8);
  const { problem, theta, result } = fit;
  const n = data.x.length;
  // Every number the data paid for: the fitted parameters, each linear one
  // as many times as it was solved (a zero point per instrument), and a
  // searched jitter.
  const linearCount = Object.values(result.linear || {}).reduce(
    (a, v) =>
      a + (v !== null && typeof v === 'object' ? Object.keys(v).length : 1),
    0
  );
  const searchedJitter =
    model.nuisance && request.parameters?.jitter?.mode !== 'fixed' && data.sigma
      ? 1
      : 0;
  const dof = Math.max(1, n - theta.length - linearCount - searchedJitter);
  const reducedChi2 = result.chi2 / dof;
  const cov = theta.length
    ? covarianceAt(problem, theta)
    : { covariance: null, sigma: [], correlation: null };
  // Unweighted, the residual scatter is the error bar: chi-square is a sum of
  // squared residuals in the data's unit, and dividing by dof gives variance.
  const scale = !problem.weighted
    ? reducedChi2
    : reducedChi2 > 1
      ? reducedChi2
      : 1;
  const values = result.values;
  const parameters = problem.parameters.map(p => {
    const i = problem.free.findIndex(f => f.name === p.name);
    const spec = model.parameters.find(m => m.name === p.name);
    const sigma =
      i >= 0 ? cov.sigma[i] * Math.sqrt(problem.weighted ? 1 : scale) : null;
    return {
      name: p.name,
      label: spec.label,
      unit: spec.unit,
      mode: p.mode,
      value: values[p.name],
      lo: p.lo,
      hi: p.hi,
      sigma,
      sigmaScaled:
        i >= 0 && problem.weighted && scale > 1
          ? cov.sigma[i] * Math.sqrt(scale)
          : null,
      atBound:
        i >= 0 &&
        (Math.abs(theta[i] - p.lo) < 1e-9 * (Math.abs(p.hi - p.lo) + 1) ||
          Math.abs(theta[i] - p.hi) < 1e-9 * (Math.abs(p.hi - p.lo) + 1)),
    };
  });
  const derived = derivedWithErrors(
    model,
    problem,
    theta,
    cov,
    request.settings || {},
    scale
  );
  const residuals = new Float64Array(n);
  let rss = 0;
  for (let i = 0; i < n; i++) {
    residuals[i] = fit.data.y[i] - result.fit[i];
    rss += residuals[i] ** 2;
  }
  const redNoise = timeCorrelated(fit.data, residuals, request);
  const out = {
    status: 'ok',
    model: { id: model.id, version: model.version },
    redNoise,
    parameters,
    linear: result.linear,
    nuisance: model.nuisance
      ? { jitter: { value: jitter, unit: model.nuisance[0].unit, trials } }
      : null,
    derived,
    chi2: result.chi2,
    dof,
    reducedChi2,
    n,
    weighted: problem.weighted,
    scaled: scale > 1 && problem.weighted,
    covariance: cov.covariance,
    correlation: cov.correlation,
    free: problem.free.map(p => p.name),
    residualRms: Math.sqrt(rss / n),
    residuals,
    fit: result.fit,
    rows: data.rows,
    converged: fit.converged,
    stoppedBecause: fit.why,
    iterations: fit.iterations,
    evaluations: fit.evaluations,
    search,
    notClaimed: model.notClaimed,
    assumptions: model.assumptions,
  };
  if (redNoise?.correlated) {
    for (const p of [...out.parameters, ...out.derived]) {
      const base = p.sigmaScaled ?? p.sigma;
      if (Number.isFinite(base)) p.sigmaRed = base * redNoise.beta;
    }
  }
  out.warnings = warningsFor(out, model, data, values, request);
  hooks.onProgress?.(1);
  return out;
}

/**
 * How much more the residuals scatter when averaged over time than white
 * noise would: the beta factor of Winn et al. (2008, ApJ 683, 1076). The
 * residuals are averaged in groups of N neighboring points, for N spanning
 * the timescale that matters - a transit's ingress, or an orbit's tenth -
 * and the scatter of the averages compared with sigma_1 / sqrt(N) * sqrt(M /
 * (M - 1)); beta is their mean ratio, and 1 for white noise. A result with
 * beta above 1 carries uncertainties inflated by it as well, and says so: the
 * scaled uncertainty assumes the noise is white, and beta measures that it
 * is not.
 */
function timeCorrelated(data, residuals, request) {
  const n = residuals.length;
  if (n < 30) return null;
  let s1 = 0;
  for (const r of residuals) s1 += r * r;
  s1 = Math.sqrt(s1 / n);
  const step = median(
    Array.from({ length: n - 1 }, (_, i) => data.x[i + 1] - data.x[i])
  );
  const scale =
    request.algorithm?.redNoiseTimescale ??
    (request.model.id === 'transit-quadratic'
      ? 30 / 1440
      : (request.parameters?.P?.lo ?? 1) / 10);
  const sizes = [];
  for (
    let N = 2;
    N <= Math.max(2, Math.round((3 * scale) / step)) && N <= n / 8;
    N++
  ) {
    if (N * step >= scale / 2) sizes.push(N);
  }
  if (!sizes.length) sizes.push(2);
  const ratios = sizes.map(N => {
    const M = Math.floor(n / N);
    let ss = 0;
    for (let m = 0; m < M; m++) {
      let a = 0;
      for (let j = 0; j < N; j++) a += residuals[m * N + j];
      ss += (a / N) ** 2;
    }
    const sN = Math.sqrt(ss / M);
    return sN / ((s1 / Math.sqrt(N)) * Math.sqrt(M / (M - 1)));
  });
  const beta = Math.max(1, ratios.reduce((a, b) => a + b, 0) / ratios.length);
  // What white noise gives by chance: each ratio scatters by about
  // 1 / sqrt(2 (M - 1)) for M bins, so beta is only evidence of correlated
  // noise beyond twice that, at the fewest bins used. A fixed 1.05 flagged a
  // fifth of forty-point velocity curves whose noise was white.
  const fewest = Math.floor(n / Math.max(...sizes));
  const threshold = 1 + 2 / Math.sqrt(2 * Math.max(1, fewest - 1));
  return {
    beta,
    sizes,
    ratios,
    timescale: scale,
    threshold,
    correlated: beta > threshold,
  };
}

function median(v) {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : NaN;
}

/** Derived values, and their uncertainties through the covariance. */
function derivedWithErrors(model, problem, theta, cov, settings, scale) {
  const at = t => model.derived(problem.full(t), settings);
  const base = at(theta);
  const out = [];
  for (const [name, d] of Object.entries(base)) {
    let variance = NaN;
    if (cov.covariance && Number.isFinite(d.value)) {
      const g = theta.map((v, j) => {
        const h = 1e-6 * (Math.abs(problem.hi[j] - problem.lo[j]) || 1);
        const up = theta.slice();
        const dn = theta.slice();
        up[j] = Math.min(problem.hi[j], v + h);
        dn[j] = Math.max(problem.lo[j], v - h);
        return (at(up)[name].value - at(dn)[name].value) / (up[j] - dn[j] || 1);
      });
      variance = 0;
      for (let a = 0; a < g.length; a++)
        for (let b = 0; b < g.length; b++)
          variance += g[a] * cov.covariance[a][b] * g[b];
    }
    // The same convention as the fitted parameters: `sigma` from the error
    // bars as given (or from the scatter, unweighted), `sigmaScaled` when a
    // reduced chi-square above 1 says they were too small. An external input's
    // own uncertainty adds in quadrature to both.
    const external = d.external?.stellarRadius?.sigma
      ? (d.value *
          (d.external.stellarRadius.sigma / d.external.stellarRadius.value)) **
        2
      : 0;
    const weighted = problem.weighted;
    out.push({
      name,
      label: d.label,
      unit: d.unit,
      mode: 'derived',
      value: d.value,
      sigma: Math.sqrt(
        Math.max(0, variance * (weighted ? 1 : scale) + external)
      ),
      sigmaScaled:
        weighted && scale > 1 && Number.isFinite(variance)
          ? Math.sqrt(Math.max(0, variance * scale + external))
          : null,
    });
  }
  return out;
}

/** Every reason to read the result with care. */
function warningsFor(out, model, data, values, request) {
  const w = [];
  if (!out.converged) w.push({ code: 'notConverged', why: out.stoppedBecause });
  for (const p of out.parameters) {
    if (p.atBound)
      w.push({ code: 'atBound', parameter: p.name, value: p.value });
  }
  if (!out.covariance && out.free.length) w.push({ code: 'singular' });
  if (out.correlation) {
    out.free.forEach((a, i) => {
      out.free.forEach((b, j) => {
        if (j > i && Math.abs(out.correlation[i][j]) > 0.95) {
          w.push({
            code: 'degenerate',
            parameters: [a, b],
            correlation: out.correlation[i][j],
          });
        }
      });
    });
  }
  if (!out.weighted) w.push({ code: 'unweighted' });
  if (out.scaled) w.push({ code: 'scaled', reducedChi2: out.reducedChi2 });
  if (out.redNoise?.correlated)
    w.push({ code: 'correlatedNoise', beta: out.redNoise.beta });
  if (data.counts.withoutUncertainty)
    w.push({
      code: 'droppedNoUncertainty',
      rows: data.counts.withoutUncertainty,
    });
  if (model.id === 'transit-quadratic') {
    // Detected at all? The depth against the noise of the points in transit.
    const half = halfDuration(values);
    let inTransit = 0;
    for (const t of data.x) {
      const c = (t - values.t0) / values.P;
      if (Math.abs((c - Math.round(c)) * values.P) < half) inTransit++;
    }
    const depth = out.derived.find(d => d.name === 'depth')?.value ?? 0;
    const noise = out.residualRms / Math.sqrt(Math.max(1, inTransit));
    if (!Number.isFinite(half) || inTransit < 3 || depth < 5 * noise) {
      w.push({ code: 'notDetected', inTransit, snr: depth / noise });
    }
    const exposure = request.settings?.exposure;
    if (!exposure) w.push({ code: 'noExposure' });
  }
  if (!data.perDay && request.parameters?.P?.mode !== 'fixed')
    w.push({ code: 'timeUnitAssumed' });
  return w;
}

/** Points a profile may add inside each side's crossing bracket. */
const REFINE_POINTS = 3;

/**
 * For each side whose bracket around the level ends past `far`, the value
 * where the bracket predicts the crossing (./fit.js crossing(), which
 * interpolates in the square root of Delta chi^2), kept between a fifth and
 * four fifths of the way across. A parabola's crossing is found at once, and
 * a profile that is flat and then steep cannot stall: points that all land
 * just inside the crossing would never bring the bracket's far end in.
 */
function bracketsToRefine(points, minimum, level, far) {
  const i0 = points.reduce((b, p, i) => (p.chi2 < points[b].chi2 ? i : b), 0);
  const out = [];
  for (const dir of [-1, 1]) {
    for (let i = i0; i + dir >= 0 && i + dir < points.length; i += dir) {
      const a = points[i];
      const b = points[i + dir];
      if (b.chi2 - minimum >= level) {
        if (b.chi2 - minimum > far) {
          const [lo, hi] = crossing(dir < 0 ? [b, a] : [a, b], minimum, level);
          const v = dir < 0 ? lo : hi;
          if (Number.isFinite(v)) {
            const t = (v - a.value) / (b.value - a.value);
            const safe = Math.min(0.8, Math.max(0.2, t));
            out.push(a.value + safe * (b.value - a.value));
          }
        }
        break;
      }
    }
  }
  return out;
}

/**
 * One parameter's profile and slice, re-fitting the others at each value.
 * @param {object} request
 * @param {object} data - dataFrom()
 * @param {object} fit - fitOnce()'s result
 * @param {string} name - A fitted parameter
 */
export function profileTask(request, data, fit, name, hooks = {}) {
  const model = MODELS[request.model.id];
  const d =
    fit.nuisance?.jitter?.value > 0 && data.sigma
      ? {
          ...data,
          sigma: Float64Array.from(data.sigma, s =>
            Math.sqrt(s * s + fit.nuisance.jitter.value ** 2)
          ),
        }
      : data;
  const parameters = fit.parameters.map(p => ({
    name: p.name,
    mode: p.mode,
    value: p.value,
    lo: p.lo,
    hi: p.hi,
  }));
  const problem = createProblem(model, d, parameters, request.settings || {});
  const j = problem.free.findIndex(p => p.name === name);
  if (j < 0) throw new Error(`${name} is not fitted`);
  const theta = problem.free.map(p => p.value);
  const p = fit.parameters.find(q => q.name === name);
  const settings = request.algorithm?.profile || {};
  const points = settings.points ?? 11;
  const span = settings.span ?? 4;
  // Across span sigmas each side, or the whole range where sigma is unknown,
  // and never past the bounds.
  const s =
    Number.isFinite(p.sigmaScaled ?? p.sigma) && (p.sigmaScaled ?? p.sigma) > 0
      ? (p.sigmaScaled ?? p.sigma)
      : (p.hi - p.lo) / 8;
  const lo = Math.max(p.lo, p.value - span * s);
  const hi = Math.min(p.hi, p.value + span * s);
  const values = Array.from(
    { length: points },
    (_, i) => lo + ((hi - lo) * i) / (points - 1)
  );
  if (!values.includes(p.value)) {
    values.push(p.value);
    values.sort((a, b) => a - b);
  }
  let done = 0;
  const planned = values.length + 2 * REFINE_POINTS;
  const lmOpts = {
    tolerance: 1e-8,
    profileIterations: 40,
    ...request.algorithm?.lm,
  };
  const sweep = vs =>
    profile(problem, theta, j, vs, lmOpts, {
      ...hooks,
      onProgress: () => hooks.onProgress?.(Math.min(1, ++done / planned)),
    });
  // With error bars scaled for a reduced chi-square above 1, the profile is
  // read on the same scale.
  const scale = fit.scaled
    ? fit.reducedChi2
    : fit.weighted
      ? 1
      : fit.reducedChi2;
  let pts = sweep(values);
  let minimum;
  const scaled = () => {
    minimum = Math.min(fit.chi2, ...pts.map(q => q.chi2));
    return pts.map(q => ({
      ...q,
      chi2: minimum + (q.chi2 - minimum) / scale,
      slice: minimum + (q.slice - minimum) / scale,
    }));
  };
  // The grid is spaced by the covariance's sigma, which a degeneracy can make
  // several times the interval's real width: the first point either side of
  // the best is then far past Delta chi^2 = 1, and even an exact
  // interpolation between two points so far apart is a guess. So each side
  // whose bracket ends past Delta chi^2 = 4 gets points re-fitted inside it,
  // at the crossing the bracket predicts, up to REFINE_POINTS a side.
  for (let round = 0; round < REFINE_POINTS; round++) {
    const sp = scaled();
    const more = bracketsToRefine(sp, minimum, 1, 4).filter(
      v => !pts.some(q => q.value === v)
    );
    if (!more.length) break;
    pts = [...pts, ...sweep(more)].sort((x, y) => x.value - y.value);
  }
  const scaledPts = scaled();
  const [a, b] = crossing(scaledPts, minimum, 1);
  return {
    status: 'ok',
    parameter: name,
    points: scaledPts.map(q => ({
      value: q.value,
      dchi2: q.chi2 - minimum,
      slice: q.slice - minimum,
    })),
    interval: [a, b],
    evaluations: problem.evaluations(),
    // A profile that finds a lower chi-square than the fit is a fit that
    // stopped in a local minimum; the result says so.
    lowerThanFit:
      Math.min(...pts.map(q => q.chi2)) <
      fit.chi2 - 1e-6 * Math.max(1, fit.chi2),
  };
}
