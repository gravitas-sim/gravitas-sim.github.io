// =============================================================================
// Fitting a circular orbit to radial velocities
// -----------------------------------------------------------------------------
// The other half of the observing mode. js/rvSurvey.js produces measurements
// with error bars and gaps; this turns a set of them into a period, an
// amplitude, a phase and a systemic velocity, and - more importantly - into an
// honest account of how well those are determined.
//
// The model, and why only this one
// -----------------------------------------------------------------------------
//   v(t) = gamma + K sin(2 pi t / P + phi)
//
// A circular orbit, one component, four parameters. Nothing eccentric, nothing
// multiple, no trend. That is a real limitation and it is deliberate: a student
// who fits an eccentric model to twelve noisy points will always get a better
// chi-square and will have learned nothing except that more parameters fit
// better. The circular model is restrictive enough that when it fails, the
// failure is visible in the residuals rather than absorbed into a parameter,
// which is the whole pedagogical point.
//
// Why there is no optimiser in here
// -----------------------------------------------------------------------------
// At a FIXED period the model is linear in its other three parameters:
//
//   v = gamma + A cos(wt) + B sin(wt),   K = sqrt(A^2 + B^2)
//
// so the best gamma, A and B at that period come from a 3x3 weighted normal
// equation solved exactly, in closed form, with no iteration and no starting
// guess to get wrong. The period is then handled by scanning a bounded grid and
// solving that 3x3 at each point. This is the classic floating-mean
// least-squares periodogram, it is about forty lines of arithmetic, and it is
// why this file has no dependencies.
//
// What it refuses to tell you
// -----------------------------------------------------------------------------
// It will not call anything a detection. It reports chi-square, it reports the
// other minima it found and how much worse they are, and it stops. The lowest
// point on a periodogram of sparse data is very often an alias of the true
// period or of the sampling, and a tool that printed "period found" over the
// deepest trough would be teaching students to trust the one thing least worth
// trusting. Every alternative minimum is kept and returned for exactly that
// reason.
// =============================================================================

/** How many parameters the circular model has: gamma, K, phase, period. */
export const MODEL_PARAMETERS = 4;

/** What a fit did about the error bars it was given. */
export const WEIGHTING = Object.freeze({
  /** Inverse-variance, the usual case. */
  INVERSE_VARIANCE: 'inverseVariance',
  /**
   * Every point counted equally, because none of them had a usable
   * uncertainty. Reported rather than silently assumed: with no error bars
   * there is no chi-square worth printing, and a reduced chi-square of 1.0
   * computed from invented weights is a lie with a decimal point in it.
   */
  UNIFORM: 'uniform',
});

/** Why a measurement was left out of a fit. */
export const EXCLUDED = Object.freeze({
  MISSED: 'missed',
  NOT_FINITE: 'notFinite',
  BAD_SIGMA: 'badSigma',
  DEGRADED: 'degraded',
});

/**
 * Split a recording into the points a fit can use and the ones it cannot.
 *
 * A missed epoch is not a measurement of zero and a degraded one is partly a
 * measurement of the simulation's frame rate; neither belongs in a fit, and
 * both belong in the report of what was excluded, because a student who
 * exports twelve planned epochs and fits nine should be able to see where the
 * other three went.
 *
 * Degraded points are DROPPED by default. They used to be kept by default, on
 * the reasoning that they are real readings with a stated interpolation error
 * and that dropping them silently was its own dishonesty. That reasoning was
 * half right: the answer to a silent drop is a reported one, not a silent
 * keep. A degraded reading's error is known to exceed the tolerance, so it
 * carries an error the stated sigma does not describe, and leaving it in a
 * weighted fit at its face-value sigma overweights the worst point in the run.
 * Every count is returned either way, and the panel and the exports print it.
 *
 * A caller that wants them back passes `keepDegraded`, and then gets them with
 * their sigma widened to sqrt(sigma^2 + interpolationError^2) - including them
 * at face value would be the overweighting this exists to avoid. Unverified
 * points are kept: their error is unknown, not known to be large, and there is
 * nothing to widen a sigma by. They are counted so the disclosure can say so.
 *
 * @param {Array<object>} points - Measurements from js/rvSurvey.js
 * @param {object} [opts] - `keepDegraded` to fit flagged readings too
 * @returns {{usable: Array<object>, excluded: Array<object>, counts: object}}
 */
export function usablePoints(points, opts = {}) {
  const usable = [];
  const excluded = [];
  const counts = {
    missed: 0,
    notFinite: 0,
    badSigma: 0,
    degraded: 0,
    unverified: 0,
    degradedKept: 0,
  };

  for (const p of points || []) {
    if (!p) continue;
    if (p.missed || p.quality === 'missed' || p.rv === null) {
      counts.missed++;
      excluded.push({ point: p, reason: EXCLUDED.MISSED });
      continue;
    }
    if (!Number.isFinite(p.rv) || !Number.isFinite(p.day)) {
      counts.notFinite++;
      excluded.push({ point: p, reason: EXCLUDED.NOT_FINITE });
      continue;
    }
    // A negative or non-finite sigma is not a usable uncertainty. Zero is:
    // it means "no stated uncertainty", which the weighting decides about
    // rather than the filter.
    if (p.sigma !== null && (!Number.isFinite(p.sigma) || p.sigma < 0)) {
      counts.badSigma++;
      excluded.push({ point: p, reason: EXCLUDED.BAD_SIGMA });
      continue;
    }
    if (p.quality === 'unverified') counts.unverified++;

    if (p.quality === 'degraded') {
      counts.degraded++;
      if (!opts.keepDegraded) {
        excluded.push({ point: p, reason: EXCLUDED.DEGRADED });
        continue;
      }
      counts.degradedKept++;
      // In quadrature, because the interpolation error and the observing noise
      // are independent. A degraded point kept at its face-value sigma would
      // be trusted most precisely where it is least trustworthy.
      const err = Number.isFinite(p.interpolationError)
        ? p.interpolationError
        : 0;
      usable.push(
        Number.isFinite(p.sigma) && err > 0
          ? { ...p, sigma: Math.hypot(p.sigma, err), sigmaWidened: true }
          : p
      );
      continue;
    }
    usable.push(p);
  }
  return { usable, excluded, counts };
}

/**
 * Decide how to weight a set of points, and say so.
 *
 * The zero-uncertainty case is handled here rather than left to divide by
 * zero. Noiseless data is a real thing a student will generate - the observing
 * mode lets the uncertainty be set to zero, and doing so is a good exercise -
 * and the right response is to fit it unweighted and refuse to quote a
 * chi-square, not to produce an infinity.
 *
 * @param {Array<object>} points - Usable measurements
 * @returns {{mode: string, weights: Array<number>, reason: ?string}}
 */
export function weightsFor(points) {
  const positive = points.filter(p => Number.isFinite(p.sigma) && p.sigma > 0);
  if (positive.length === points.length && points.length > 0) {
    return {
      mode: WEIGHTING.INVERSE_VARIANCE,
      weights: points.map(p => 1 / (p.sigma * p.sigma)),
      reason: null,
    };
  }
  return {
    mode: WEIGHTING.UNIFORM,
    weights: points.map(() => 1),
    reason: positive.length === 0 ? 'noUncertainties' : 'mixedUncertainties',
  };
}

/**
 * Solve a symmetric 3x3 system by Gaussian elimination with partial pivoting.
 *
 * Written out rather than imported. It is thirty lines, it is the only linear
 * algebra this file needs, and a dependency for it would be larger than the
 * rest of the module.
 *
 * @param {Array<Array<number>>} a - The 3x3 matrix, modified in place
 * @param {Array<number>} b - The right-hand side, modified in place
 * @returns {?Array<number>} The solution, or null if the system is singular
 */
function solve3(a, b) {
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (!(Math.abs(a[pivot][col]) > 1e-14)) return null;
    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
    }
    for (let row = col + 1; row < 3; row++) {
      const f = a[row][col] / a[col][col];
      if (f === 0) continue;
      for (let k = col; k < 3; k++) a[row][k] -= f * a[col][k];
      b[row] -= f * b[col];
    }
  }
  const x = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    let s = b[row];
    for (let k = row + 1; k < 3; k++) s -= a[row][k] * x[k];
    x[row] = s / a[row][row];
  }
  return x.every(Number.isFinite) ? x : null;
}

/**
 * The velocity the model predicts at a set of times.
 *
 * @param {object} params - gamma, K, period (days), phase (radians)
 * @param {Array<number>} days - Times
 * @returns {Array<number>} Predicted velocities
 */
export function modelCurve(params, days) {
  const { gamma = 0, K = 0, period, phase = 0 } = params || {};
  if (!(period > 0)) return days.map(() => gamma);
  const w = (2 * Math.PI) / period;
  return days.map(t => gamma + K * Math.sin(w * t + phase));
}

/**
 * Score a model exactly as supplied, optimising nothing.
 *
 * The counterpart to fitAtPeriod, and the distinction is not cosmetic. When a
 * student drags a slider, the number under the plot has to describe the curve
 * on the plot. fitAtPeriod re-derives the best amplitude, phase and offset at
 * whatever period it is given, so using it to "score" a hand-set model reports
 * how good the model COULD have been - a student could set the amplitude to
 * zero and watch the goodness-of-fit refuse to move.
 *
 * Degrees of freedom
 * -----------------------------------------------------------------------------
 * A chi-square per degree of freedom needs a count of parameters that were
 * estimated FROM THIS DATA, and that count depends on how the model arrived
 * rather than on the model. So the caller states it:
 *
 *   evaluated by hand   nothing was estimated from the data, so dof = n. The
 *                       default, because a slider position is not a fit.
 *   fitted at a period  three linear parameters came out of these points, and
 *                       the period was chosen against them too, so dof = n - 4.
 *
 * A student who eyeballs a curve has in some sense used the data, but not in a
 * way with a defined parameter count, and inventing one would be worse than
 * stating the convention. The report says which convention it used.
 *
 * @param {Array<object>} points - Usable measurements
 * @param {object} params - period, K, phase, gamma, exactly as they are
 * @param {object} [opts] - `estimatedParameters`, `weights`
 * @returns {?object} The score, or null when there is nothing to score
 */
export function evaluateModel(points, params, opts = {}) {
  if (!Array.isArray(points) || !points.length) return null;
  if (!params || !(params.period > 0)) return null;

  const weighting = opts.weights || weightsFor(points);
  const w = weighting.weights;
  const predicted = modelCurve(
    params,
    points.map(p => p.day)
  );

  let chi2 = 0;
  let sumSq = 0;
  for (let i = 0; i < points.length; i++) {
    const r = points[i].rv - predicted[i];
    if (!Number.isFinite(r)) return null;
    chi2 += w[i] * r * r;
    sumSq += r * r;
  }

  const estimated = Number.isFinite(opts.estimatedParameters)
    ? opts.estimatedParameters
    : 0;
  const dof = points.length - estimated;

  return {
    period: params.period,
    K: params.K,
    phase: params.phase,
    gamma: params.gamma,
    chi2,
    dof,
    // Null rather than a number in the two cases where the quotient would be
    // meaningless: nothing left to divide by, and weights that were invented
    // because the data carried no usable uncertainties.
    reducedChi2:
      dof > 0 && weighting.mode === WEIGHTING.INVERSE_VARIANCE
        ? chi2 / dof
        : null,
    rms: Math.sqrt(sumSq / points.length),
    weighting: weighting.mode,
    weightingReason: weighting.reason,
    n: points.length,
    estimatedParameters: estimated,
    // So a reader can tell a scored model from a fitted one without guessing
    // from the dof.
    optimised: false,
  };
}

/**
 * The best circular fit at one fixed period, in closed form.
 *
 * Linear in gamma, A and B, so this is one 3x3 solve and no iteration. The
 * period is the only parameter that has to be searched, which is what makes
 * the search cheap enough to do on a grid and honest enough to show whole.
 *
 * @param {Array<object>} points - Usable measurements
 * @param {number} periodDays - The period to fit at
 * @param {object} [opts] - `weights` to reuse a decision already made
 * @returns {?object} The fit, or null if it cannot be done
 */
export function fitAtPeriod(points, periodDays, opts = {}) {
  if (!Array.isArray(points) || !(periodDays > 0)) return null;
  // Three free parameters at fixed period, so three points can be fitted
  // exactly and fewer cannot be fitted at all.
  if (points.length < 3) return null;

  const weighting = opts.weights || weightsFor(points);
  const w = weighting.weights;
  const omega = (2 * Math.PI) / periodDays;

  // Normal equations for [gamma, A, B] against basis [1, cos, sin].
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rhs = [0, 0, 0];
  for (let i = 0; i < points.length; i++) {
    const t = points[i].day;
    const y = points[i].rv;
    const wi = w[i];
    const basis = [1, Math.cos(omega * t), Math.sin(omega * t)];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) m[r][c] += wi * basis[r] * basis[c];
      rhs[r] += wi * basis[r] * y;
    }
  }

  const beta = solve3(m, rhs);
  if (!beta) return null;
  const [gamma, A, B] = beta;

  // K sin(wt + phi) = A cos(wt) + B sin(wt), so K = hypot(A, B) and the phase
  // is the angle that puts A on the cosine. Negative K is the same curve half
  // a cycle over; normalising keeps the reported amplitude positive so two
  // students comparing answers are comparing the same number.
  let K = Math.hypot(A, B);
  let phase = Math.atan2(A, B);
  if (K < 0) {
    K = -K;
    phase += Math.PI;
  }
  phase = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  const params = { gamma, K, period: periodDays, phase };
  const predicted = modelCurve(
    params,
    points.map(p => p.day)
  );
  let chi2 = 0;
  let sumSq = 0;
  for (let i = 0; i < points.length; i++) {
    const r = points[i].rv - predicted[i];
    chi2 += w[i] * r * r;
    sumSq += r * r;
  }

  const dof = points.length - MODEL_PARAMETERS;
  return {
    ...params,
    chi2,
    dof,
    // Null rather than a number when there is nothing to divide by, and null
    // rather than a number when the weights were invented. A reduced
    // chi-square computed from uniform weights is not a reduced chi-square.
    reducedChi2:
      dof > 0 && weighting.mode === WEIGHTING.INVERSE_VARIANCE
        ? chi2 / dof
        : null,
    rms: Math.sqrt(sumSq / points.length),
    weighting: weighting.mode,
    weightingReason: weighting.reason,
    n: points.length,
    // Three linear parameters came out of these points and the period was
    // chosen against them, so four were estimated from the data. See
    // evaluateModel for why the convention is stated rather than assumed.
    estimatedParameters: MODEL_PARAMETERS,
    optimised: true,
  };
}

/**
 * Scan a bounded range of periods, and keep the whole curve.
 *
 * Sampled uniformly in FREQUENCY rather than in period, which is the right
 * thing and not a detail: a grid uniform in period spends most of its points
 * on long periods where the model barely changes and skips straight over the
 * narrow minima at short ones. The peak spacing in frequency is roughly
 * 1/baseline, so the default sampling puts about ten grid points across the
 * narrowest feature the data can resolve.
 *
 * The whole curve comes back, not just its lowest point. That is the feature:
 * sparse sampling produces several minima of similar depth, and a student who
 * can see them has learned something a single reported period would have
 * hidden.
 *
 * @param {Array<object>} points - Usable measurements
 * @param {object} opts - minPeriod, maxPeriod (days), and optional samples
 * @returns {?object} The grid, the best fit, and the other minima
 */
export function periodSearch(points, opts = {}) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const minPeriod = Number(opts.minPeriod);
  const maxPeriod = Number(opts.maxPeriod);
  if (!(minPeriod > 0) || !(maxPeriod > minPeriod)) return null;

  const days = points.map(p => p.day);
  const baseline = Math.max(...days) - Math.min(...days);
  const fMin = 1 / maxPeriod;
  const fMax = 1 / minPeriod;
  // Ten samples across the natural peak width, bounded so a huge range on a
  // short baseline cannot ask for a million solves.
  const suggested = baseline > 0 ? Math.ceil(10 * (fMax - fMin) * baseline) : 0;
  const samples = Math.min(
    20000,
    Math.max(200, Number(opts.samples) || suggested)
  );

  const weighting = weightsFor(points);
  const grid = [];
  for (let i = 0; i < samples; i++) {
    const f = fMin + ((fMax - fMin) * i) / (samples - 1);
    const period = 1 / f;
    const fit = fitAtPeriod(points, period, { weights: weighting });
    if (fit) grid.push({ period, frequency: f, chi2: fit.chi2, K: fit.K });
  }
  if (!grid.length) return null;

  const best = grid.reduce((a, b) => (b.chi2 < a.chi2 ? b : a));
  return {
    grid,
    weighting: weighting.mode,
    weightingReason: weighting.reason,
    baseline,
    samples: grid.length,
    bestPeriod: best.period,
    best: fitAtPeriod(points, best.period, { weights: weighting }),
    minima: localMinima(grid, best.chi2),
    bounds: { minPeriod, maxPeriod },
  };
}

/**
 * The distinct troughs in a periodogram, ranked, with how much worse they are.
 *
 * Kept because they are the point. On twelve points spread over a month there
 * are usually three or four periods that fit almost equally well, and which
 * one comes out lowest is decided by the noise draw as much as by the planet.
 * Reporting delta chi-square rather than a probability is deliberate: turning
 * it into a significance would need assumptions about the number of
 * independent frequencies searched that this tool has no business pretending
 * to.
 *
 * @param {Array<object>} grid - The scanned curve
 * @param {number} bestChi2 - The lowest value found
 * @returns {Array<object>} Minima, deepest first
 */
export function localMinima(grid, bestChi2) {
  const found = [];
  for (let i = 1; i < grid.length - 1; i++) {
    if (grid[i].chi2 <= grid[i - 1].chi2 && grid[i].chi2 < grid[i + 1].chi2) {
      found.push({
        period: grid[i].period,
        chi2: grid[i].chi2,
        deltaChi2: grid[i].chi2 - bestChi2,
        K: grid[i].K,
      });
    }
  }
  found.sort((a, b) => a.chi2 - b.chi2);
  return found;
}

/**
 * Where each measurement falls in the cycle, and what the model says there.
 *
 * @param {Array<object>} points - Usable measurements
 * @param {object} params - A fit
 * @returns {Array<object>} Phase in [0,1), the reading, and the residual
 */
export function foldOnPeriod(points, params) {
  const period = params?.period;
  if (!(period > 0)) return [];
  const predicted = modelCurve(
    params,
    points.map(p => p.day)
  );
  return points.map((p, i) => {
    let phase = (p.day / period) % 1;
    if (phase < 0) phase += 1;
    return {
      phase,
      day: p.day,
      rv: p.rv,
      sigma: p.sigma,
      model: predicted[i],
      residual: p.rv - predicted[i],
      quality: p.quality,
    };
  });
}

/**
 * Whether the residuals still have a shape in them.
 *
 * The diagnostic that makes a restrictive model worth using. A circular fit to
 * an eccentric orbit gets the period about right and leaves a residual curve
 * that is obviously not noise - it runs positive for a stretch of phase and
 * negative for another - and no amount of staring at chi-square will say so as
 * clearly as counting the runs.
 *
 * Two statistics, both descriptive:
 *
 *   runs   how many times the residuals change sign when sorted by phase,
 *          against how many a random sequence of the same signs would average.
 *          Far too few means neighbouring points agree, which is structure.
 *
 *   lag1   the correlation between each phase-sorted residual and the next.
 *          Positive means the same thing from a different direction.
 *
 * Neither is turned into a p-value. The honest statement is "these residuals
 * are not scattered independently with phase", and what to do about it is the
 * student's problem, which is where it belongs.
 *
 * @param {Array<object>} folded - From foldOnPeriod
 * @returns {?object} The statistics, or null with too little to say
 */
export function residualStructure(folded) {
  const rows = (folded || [])
    .filter(r => Number.isFinite(r.residual))
    .slice()
    .sort((a, b) => a.phase - b.phase);
  if (rows.length < 6) return null;

  const signs = rows.map(r => (r.residual >= 0 ? 1 : -1));
  let runs = 1;
  for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) runs++;
  const pos = signs.filter(s => s > 0).length;
  const neg = signs.length - pos;
  // The mean number of runs for a random arrangement of the same signs.
  const expectedRuns =
    pos && neg ? (2 * pos * neg) / (pos + neg) + 1 : signs.length;

  const values = rows.map(r => r.residual);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean;
    den += d * d;
    if (i + 1 < values.length) num += d * (values[i + 1] - mean);
  }
  const lag1 = den > 0 ? num / den : 0;

  return {
    n: rows.length,
    runs,
    expectedRuns,
    // Below one means fewer sign changes than chance: neighbouring residuals
    // agree, which is what a systematic looks like.
    runsRatio: expectedRuns > 0 ? runs / expectedRuns : null,
    lag1,
    positive: pos,
    negative: neg,
  };
}

/**
 * Everything a fit should say about itself, in one object.
 *
 * Assembled here rather than in the panel so the export and the screen cannot
 * disagree, and so the assumptions travel with the numbers instead of being
 * printed once in a heading somebody might not read.
 *
 * @param {Array<object>} points - The whole recording, gaps included
 * @param {object} params - The fit being described
 * @param {object} [opts] - `search` to attach a periodogram summary
 * @returns {?object} The report
 */
export function fitReport(points, params, opts = {}) {
  const { usable, counts } = usablePoints(points, opts);
  if (!usable.length || !params?.period) return null;
  const folded = foldOnPeriod(usable, params);
  // Scored, not refitted. The residuals below are of `params`; a chi-square
  // from fitAtPeriod would be of a different model and the two would disagree
  // in the same file.
  const scored = evaluateModel(usable, params, {
    estimatedParameters: opts.estimatedParameters ?? 0,
  });

  return {
    model: 'circular-single',
    assumptions: [
      'A single companion on a circular orbit',
      'No long-term trend in the systemic velocity',
      'Uncertainties independent and Gaussian',
      'Only the line-of-sight component is measured, so K gives M sin i',
    ],
    parameters: {
      period: params.period,
      K: params.K,
      phase: params.phase,
      gamma: params.gamma,
    },
    fit: scored,
    excluded: counts,
    used: usable.length,
    planned: (points || []).length,
    residuals: folded.map(r => ({
      day: r.day,
      phase: r.phase,
      rv: r.rv,
      sigma: r.sigma,
      model: r.model,
      residual: r.residual,
      quality: r.quality,
    })),
    structure: residualStructure(folded),
    search: opts.search
      ? {
          bounds: opts.search.bounds,
          samples: opts.search.samples,
          bestPeriod: opts.search.bestPeriod,
          // Only the leading few: the whole grid belongs in a plot, not in a
          // parameter block.
          minima: opts.search.minima.slice(0, 5),
        }
      : null,
  };
}
