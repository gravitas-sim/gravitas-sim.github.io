// =============================================================================
// How well is that period actually determined?
// -----------------------------------------------------------------------------
// A parametric Monte Carlo over the recorded epochs. The recipe is four lines
// long and every one of them matters:
//
//   1. take the fit the student has on screen;
//   2. at each recorded epoch, draw a new velocity from that model plus a
//      Gaussian of the epoch's own stated sigma;
//   3. refit the synthetic run with the SAME period search the student ran;
//   4. do that a bounded number of times and look at where the periods landed.
//
// What this is and is not
// -----------------------------------------------------------------------------
// It answers "if the noise had come out differently, how different an answer
// would I have got?" - which is a question about precision. It says nothing
// about whether the circular single-companion model is the right model, and a
// tight interval from a wrong model is a confident wrong answer. Every interval
// this module produces is stamped with the assumptions it is conditional on,
// and the panel prints them beside the numbers rather than in a footnote.
//
// Why the periods are not averaged
// -----------------------------------------------------------------------------
// On sparse data the periodogram has several troughs of similar depth, and
// which one wins is decided by the noise draw. So the recovered periods do not
// form a bell curve around one value: they form clumps, one per alias, and the
// mean of two clumps is a period that fits nothing. Reporting "3.5 +/- 1.7 d"
// there would be worse than reporting nothing.
//
// So the trials are grouped into alias families - clustered in FREQUENCY,
// which is where aliases are evenly spaced - and each family gets its own
// interval and its own share of the trials. A single interval is returned only
// when there is a single family, and the field is null otherwise, so a caller
// cannot accidentally print a symmetric error bar over a multimodal result.
//
// The simulation truth is not in here
// -----------------------------------------------------------------------------
// Not imported, not read, not passed in. The synthetic runs are generated from
// the student's own fit, because that is what a real observer would have to do,
// and an interval that quietly used the answer would be a demonstration of
// nothing. tests/rvUncertainty.test.js asserts this structurally as well.
//
// No second fitting implementation
// -----------------------------------------------------------------------------
// Every trial goes through periodSearch() and fitAtPeriod() from js/rvFit.js -
// the same functions, the same weighting, the same grid. A private copy of the
// arithmetic would drift from the one the student is looking at, and then the
// interval would be about a fit nobody ran.
// =============================================================================

import { mulberry32, normalizeSeed } from './rng.js';
import {
  fitAtPeriod,
  periodSearch,
  usablePoints,
  weightsFor,
  WEIGHTING,
} from './rvFit.js';

/** How many trials may be asked for, and what to ask for by default. */
export const MC_LIMITS = Object.freeze({
  minTrials: 50,
  maxTrials: 2000,
  defaultTrials: 400,
  /**
   * The most grid points one trial may use.
   *
   * A cap, not a target. Left to itself periodSearch picks about ten samples
   * across the narrowest peak the baseline can resolve, which is the right
   * number and is usually a few hundred; the student's own search may push
   * that to 20000, which is affordable once and not four hundred times. So
   * the Monte Carlo takes the natural resolution and caps it here, and the
   * report states the number it actually used.
   *
   * Forcing a fixed 1500 instead cost 15ms a trial on a fourteen-day baseline
   * for a grid eleven times finer than the data supports.
   */
  maxSamples: 2000,
  /** Trials per batch between yields. Small enough to keep a frame free. */
  batchSize: 12,
  /** The smallest run this is worth doing at all. */
  minPoints: 4,
});

/** What became of a whole run. */
export const OUTCOME = Object.freeze({
  /** Every requested trial ran and every one produced a fit. */
  COMPLETE: 'complete',
  /** The reader stopped it. */
  CANCELLED: 'cancelled',
  /** It ran to the end but some trials produced no fit. */
  PARTIAL: 'partial',
});

/** What became of one trial. */
export const TRIAL = Object.freeze({
  OK: 'ok',
  /** The period search found nothing: no grid point solved. */
  NO_SEARCH: 'noSearch',
  /** A solve returned a non-finite parameter. */
  NOT_FINITE: 'notFinite',
});

/** Why a run was not attempted. Each is a sentence the panel can say. */
export const REFUSED = Object.freeze({
  NO_FIT: 'noFit',
  TOO_FEW_POINTS: 'tooFewPoints',
  NO_UNCERTAINTIES: 'noUncertainties',
  BAD_BOUNDS: 'badBounds',
  BAD_TRIALS: 'badTrials',
});

/**
 * The assumptions every interval from here is conditional on.
 *
 * Message ids rather than prose: they are printed beside the numbers in both
 * languages, and a list of assumptions that only exists in English is an
 * assumption list for half the users.
 */
export const ASSUMPTIONS = Object.freeze([
  'rvfit.mc.assume.model',
  'rvfit.mc.assume.gaussian',
  'rvfit.mc.assume.independent',
  'rvfit.mc.assume.sigmas',
  'rvfit.mc.assume.precision',
]);

/**
 * A stream of standard normal draws from a seeded uniform stream.
 *
 * Box-Muller, keeping the second value of each pair rather than throwing it
 * away: two draws per two uniforms, so the stream advances predictably and a
 * given seed reproduces a given sequence exactly.
 *
 * The uniform is nudged off zero because log(0) is -Infinity and mulberry32
 * can return exactly 0.
 *
 * @param {string|number} seed - As typed, or a raw integer
 * @returns {Function} () => a standard normal deviate
 */
export function gaussianStream(seed) {
  const uniform = mulberry32(normalizeSeed(seed));
  let spare = null;
  return function normal() {
    if (spare !== null) {
      const out = spare;
      spare = null;
      return out;
    }
    const u1 = Math.max(uniform(), Number.MIN_VALUE);
    const u2 = uniform();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
}

/**
 * One synthetic observing run at the recorded epochs.
 *
 * The epochs and the sigmas are the real ones; only the velocities are new.
 * That is what makes this parametric rather than a bootstrap: the sampling is
 * exactly as sparse and exactly as uneven as it really was, which is the whole
 * reason the aliases show up.
 *
 * @param {Array<object>} points - Usable measurements
 * @param {Array<number>} model - The fitted model at those epochs
 * @param {Function} normal - From gaussianStream
 * @returns {Array<object>} A synthetic run, same length and epochs
 */
export function resampleAtEpochs(points, model, normal) {
  const out = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    out[i] = {
      day: p.day,
      rv: model[i] + p.sigma * normal(),
      sigma: p.sigma,
      quality: p.quality,
      missed: false,
    };
  }
  return out;
}

/** The golden ratio conjugate, for the section search below. */
const INV_PHI = (Math.sqrt(5) - 1) / 2;

/**
 * Find the bottom of a trough between two grid points, without leaving the range.
 *
 * Necessary, not a refinement for its own sake. The period grid is spaced for
 * *finding* a trough - ten samples across the natural peak width - and that is
 * far coarser than the width of the trough's own bottom. Without this step
 * every trial's best period snapped to the same grid point and the Monte Carlo
 * reported a zero-width interval: measured on a fourteen-day baseline, the grid
 * step was 0.055 d against a real period uncertainty of 0.011 d, so all four
 * hundred trials returned the identical number and the interval was a property
 * of the grid rather than of the data.
 *
 * Golden-section search on chi-square in FREQUENCY, bracketed by the grid
 * points either side of the best one. Frequency because that is what the grid
 * is uniform in, so the bracket is symmetric there and not in period.
 *
 * Clamped to the searched range, which is the whole point of taking `bounds`
 * -----------------------------------------------------------------------------
 * The first version bracketed `best +/- step` and stopped there, so a trough
 * whose lowest grid point was the first or last one had a bracket reaching
 * outside the range the reader asked for - and returned a period from outside
 * it. Reproduced with a 1.999-day sinusoid searched over 2 to 3 days: the grid
 * pinned to the 2-day edge, as it must, and refinement walked off to 1.99666.
 * A search told to consider only 2 to 3 days must not answer 1.997; the honest
 * answer at an edge is the edge, which is a reader's cue that the range is
 * wrong.
 *
 * So the bracket is intersected with the range. Where that leaves the best
 * point ON a boundary the bracket is one-sided, the boundary stays a candidate,
 * and golden-section converges onto it.
 *
 * Never returns something worse than what it was given: the caller's grid fit
 * is the floor, and a refinement that fails or lands higher is discarded.
 *
 * @param {Array<object>} points - The synthetic run
 * @param {number} bestFrequency - Lowest grid point, in cycles per day
 * @param {number} step - Grid spacing in frequency
 * @param {object} weights - From weightsFor, so every solve is weighted alike
 * @param {{fMin: number, fMax: number}} bounds - The searched range, in
 *   frequency. Refinement may not return anything outside it.
 * @returns {?object} A fit strictly inside the range, or null
 */
export function refineAtTrough(points, bestFrequency, step, weights, bounds) {
  const fMin = Number(bounds?.fMin);
  const fMax = Number(bounds?.fMax);
  if (!(fMin > 0) || !(fMax > fMin)) return null;

  // The bracket, intersected with the searched range. Math.max/min rather than
  // a refusal: a best point on a boundary is a normal outcome - it is what a
  // range that excludes the true period looks like - and it still has a trough
  // bottom worth locating on the inside.
  let lo = Math.max(fMin, bestFrequency - step);
  let hi = Math.min(fMax, bestFrequency + step);
  if (!(hi > lo)) return null;

  const chi2At = f => {
    // Belt and braces. Every f below comes from within [lo, hi] by
    // construction, and a future edit to the search must not be able to
    // silently reintroduce an out-of-range answer.
    if (f < fMin || f > fMax) return null;
    const fit = fitAtPeriod(points, 1 / f, { weights });
    return fit ? { chi2: fit.chi2, fit } : null;
  };

  // The boundary candidates themselves, so a trough whose bottom is the edge
  // of the range is represented rather than approached and missed.
  let best = null;
  const consider = candidate => {
    if (!candidate) return;
    if (!best || candidate.chi2 < best.chi2) best = candidate;
  };
  consider(chi2At(lo));
  consider(chi2At(hi));

  let c = hi - (hi - lo) * INV_PHI;
  let d = lo + (hi - lo) * INV_PHI;
  let fc = chi2At(c);
  let fd = chi2At(d);
  if (!fc || !fd) return best?.fit ?? null;
  consider(fc);
  consider(fd);

  // Twenty iterations narrows the bracket by a factor of about 15000, which
  // takes a 0.0045 grid step to 3e-7 in frequency - far below any interval this
  // data could support, and cheap enough not to think about again.
  for (let i = 0; i < 20; i++) {
    if (fc.chi2 < fd.chi2) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - (hi - lo) * INV_PHI;
      fc = chi2At(c);
      if (!fc) break;
      consider(fc);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + (hi - lo) * INV_PHI;
      fd = chi2At(d);
      if (!fd) break;
      consider(fd);
    }
  }
  return best?.fit ?? null;
}

/**
 * Refit one synthetic run.
 *
 * Through periodSearch, so the trial makes the same decision the student's
 * search made: scan the bounds, take the lowest trough. Nothing here knows
 * which trough is "right", which is the point. Then down to the bottom of
 * that trough, for the reason in refineAtTrough above.
 *
 * @param {Array<object>} synthetic - From resampleAtEpochs
 * @param {object} search - minPeriod, maxPeriod, samples
 * @returns {{status: string, period?: number, K?: number, chi2?: number}}
 */
export function refitTrial(synthetic, search) {
  const found = periodSearch(synthetic, search);
  if (!found?.best) return { status: TRIAL.NO_SEARCH };

  const fMin = 1 / search.maxPeriod;
  const fMax = 1 / search.minPeriod;
  const step = (fMax - fMin) / Math.max(1, (found.samples || 1) - 1);
  const candidate = refineAtTrough(
    synthetic,
    1 / found.bestPeriod,
    step,
    weightsFor(synthetic),
    { fMin, fMax }
  );

  // The grid's own answer is the floor. A refinement is only taken when it is
  // in range and no worse; otherwise the run keeps a result it already knows is
  // valid rather than trading it for one that is not.
  const inRange = fit =>
    fit &&
    Number.isFinite(fit.period) &&
    fit.period >= search.minPeriod - 1e-12 &&
    fit.period <= search.maxPeriod + 1e-12;
  const refined =
    inRange(candidate) && candidate.chi2 <= found.best.chi2
      ? candidate
      : found.best;

  const { period, K, gamma, phase, chi2 } = refined;
  if (![period, K, gamma, phase].every(Number.isFinite)) {
    return { status: TRIAL.NOT_FINITE };
  }
  return { status: TRIAL.OK, period, K, gamma, phase, chi2 };
}

/**
 * A percentile of an already-sorted array, interpolating between neighbours.
 *
 * @param {Array<number>} sorted - Ascending values
 * @param {number} p - In [0, 1]
 * @returns {?number} The value, or null when there is nothing to take
 */
export function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const at = p * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/** The 16th, 50th and 84th percentiles: a one-sigma span and a centre. */
function spread(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: percentile(sorted, 0.5),
    p16: percentile(sorted, 0.16),
    p84: percentile(sorted, 0.84),
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
  };
}

/**
 * Group recovered periods into alias families.
 *
 * Clustered in frequency, not in period. Aliases of a sampling pattern are
 * evenly spaced in frequency - 1/P, 1/P +/- 1/day, and so on - so in period
 * they crowd together at the short end and spread out at the long end, and a
 * fixed tolerance in period would merge the short ones and split the long
 * ones. In frequency one tolerance works everywhere.
 *
 * The tolerance is half the natural peak width, 1/(2 * baseline). Two
 * frequencies closer than that are not resolvable by this data set, so calling
 * them one family is the honest reading; a gap wider than that is a genuinely
 * different solution.
 *
 * @param {Array<object>} trials - Successful trials with period and K
 * @param {number} baseline - Days from first epoch to last
 * @returns {Array<object>} Families, most populated first
 */
export function aliasFamilies(trials, baseline) {
  if (!trials.length) return [];
  const tolerance = baseline > 0 ? 1 / (2 * baseline) : Infinity;
  const sorted = [...trials].sort((a, b) => 1 / a.period - 1 / b.period);

  const groups = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = 1 / sorted[i].period - 1 / sorted[i - 1].period;
    if (gap > tolerance) {
      groups.push(current);
      current = [];
    }
    current.push(sorted[i]);
  }
  groups.push(current);

  return (
    groups
      .map(group => ({
        count: group.length,
        fraction: group.length / trials.length,
        period: spread(group.map(t => t.period)),
        K: spread(group.map(t => t.K)),
        frequency: spread(group.map(t => 1 / t.period)),
      }))
      // Most populated first: the family that won most often is the one a reader
      // is going to quote, and it should be the one they read first. Ties broken
      // by period so the order is deterministic for a given seed.
      .sort((a, b) => b.count - a.count || a.period.median - b.period.median)
  );
}

/**
 * Whether a Monte Carlo can be run at all, and why not when it cannot.
 *
 * Every refusal is a named reason rather than a thrown error or a silently
 * degraded result: "there are no uncertainties to propagate" is a fact about
 * the data a student should be told, and it is the one case where returning a
 * zero-width interval would be actively misleading.
 *
 * @param {object} spec - points, params, bounds, trials
 * @returns {{ok: boolean, reason: string, detail: object}} Verdict
 */
export function validateSpec({ points, params, minPeriod, maxPeriod, trials }) {
  if (!params || !(params.period > 0)) {
    return { ok: false, reason: REFUSED.NO_FIT, detail: {} };
  }
  const usable = Array.isArray(points) ? points : [];
  if (usable.length < MC_LIMITS.minPoints) {
    return {
      ok: false,
      reason: REFUSED.TOO_FEW_POINTS,
      detail: { n: usable.length, need: MC_LIMITS.minPoints },
    };
  }
  // A parametric Monte Carlo propagates the stated uncertainties. With none
  // stated there is nothing to propagate, every synthetic run is identical to
  // the fit, and every trial returns the same period - which would print as a
  // perfectly determined answer. Refused, and named.
  const weighting = weightsFor(usable);
  if (weighting.mode !== WEIGHTING.INVERSE_VARIANCE) {
    return {
      ok: false,
      reason: REFUSED.NO_UNCERTAINTIES,
      detail: { why: weighting.reason },
    };
  }
  if (!(minPeriod > 0) || !(maxPeriod > minPeriod)) {
    return { ok: false, reason: REFUSED.BAD_BOUNDS, detail: {} };
  }
  const n = Number(trials);
  if (
    !Number.isFinite(n) ||
    n < MC_LIMITS.minTrials ||
    n > MC_LIMITS.maxTrials
  ) {
    return {
      ok: false,
      reason: REFUSED.BAD_TRIALS,
      detail: { min: MC_LIMITS.minTrials, max: MC_LIMITS.maxTrials },
    };
  }
  return { ok: true, reason: '', detail: {} };
}

/**
 * Assemble the report from finished trials.
 *
 * Separate from the runner so it can be tested on fixed trial lists, and so a
 * cancelled run is summarised by exactly the same code as a complete one - a
 * partial result is a real result with a smaller n, not a special case.
 *
 * @param {object} input - trials, failures, spec, requested, cancelled
 * @returns {object} The report
 */
export function summarise({
  trials,
  failures,
  spec,
  requested,
  cancelled = false,
  baseline,
}) {
  const ok = trials.filter(t => t.status === TRIAL.OK);
  const families = aliasFamilies(ok, baseline);
  const failed = Object.values(failures).reduce((a, b) => a + b, 0);

  // A safety net for a failure this module actually had: if the period search
  // is coarser than the uncertainty being measured, every trial snaps to the
  // same grid point and the interval comes out zero-width - an answer that
  // looks like an extraordinarily well determined period and is really a
  // picture of the grid. refineAtTrough exists to prevent that; this notices
  // if it ever stops working, and the panel says so rather than printing the
  // interval.
  const distinct = new Set(ok.map(t => t.period.toPrecision(12))).size;
  const gridLimited = ok.length >= 20 && distinct < 5;

  return {
    ok: true,
    // Everything needed to run this again and get these numbers. The export
    // carries this block verbatim; without the seed and the grid size a
    // reported interval is not reproducible.
    spec: {
      trials: requested,
      seed: spec.seed,
      seedNormalised: normalizeSeed(spec.seed),
      minPeriod: spec.minPeriod,
      maxPeriod: spec.maxPeriod,
      samples: spec.samples,
      epochs: spec.epochs,
      // In the exported block as well as at the top level, so a file on its
      // own is enough to tell whether the interval still describes the fit it
      // is filed beside.
      inputsKey: spec.inputsKey ?? null,
      baseline,
      model: 'circular-single',
      errors: 'independentGaussian',
      // Which model the synthetic runs were generated from. Named, because the
      // one thing that would invalidate the whole exercise is generating them
      // from the answer.
      resampledAbout: 'studentFit',
      fit: { ...spec.params },
    },
    requested,
    completed: trials.length,
    succeeded: ok.length,
    failures: { ...failures },
    failed,
    cancelled,
    /**
     * Whether every requested trial was attempted. A cancelled run and a run
     * with failed trials are both incomplete, and the panel says which.
     */
    complete: !cancelled && trials.length === requested && failed === 0,
    /**
     * The three things that can have happened, as one word.
     *
     * `complete` and `cancelled` were both booleans and a reader had to infer
     * the third state - ran to the end but lost trials to failed fits - from
     * their combination. Named, because "partial" and "cancelled" call for
     * different things from whoever reads the interval: one is a smaller
     * sample, the other is a sample the reader chose to stop.
     */
    outcome: cancelled
      ? OUTCOME.CANCELLED
      : trials.length === requested && failed === 0
        ? OUTCOME.COMPLETE
        : OUTCOME.PARTIAL,
    /**
     * The inputs this report describes, so a stale one can be recognised.
     *
     * An interval is about one recording, one fit and one search range. When
     * any of those move the interval is no longer about what is on screen, and
     * a panel with no way to tell would go on displaying it beside the new
     * numbers. Carried rather than recomputed: the report has to be checkable
     * after it has been exported and restored.
     */
    inputsKey: spec.inputsKey ?? null,
    families,
    multimodal: families.length > 1,
    /**
     * Binned, for drawing. The bins rather than the raw trials: forty numbers
     * per quantity instead of two thousand, so the report stays small enough
     * to sit in an export and a notebook entry, and the picture is identical.
     */
    histograms: {
      period: histogram(
        ok.map(t => t.period),
        48
      ),
      K: histogram(
        ok.map(t => t.K),
        48
      ),
    },
    /** How many different periods came back at all. See gridLimited. */
    distinctPeriods: distinct,
    gridLimited,
    /**
     * A single interval, and only when there is a single family.
     *
     * Null the moment the result is multimodal, so nothing downstream can
     * print a symmetric error bar across two aliases. That is the one place
     * this module refuses to be convenient.
     */
    period: families.length === 1 && !gridLimited ? families[0].period : null,
    K: families.length === 1 && !gridLimited ? families[0].K : null,
    assumptions: [...ASSUMPTIONS],
  };
}

/** A yield that gives the browser a frame, or a microtask outside one. */
const defaultYield = () =>
  typeof requestAnimationFrame === 'function'
    ? new Promise(resolve => requestAnimationFrame(() => resolve()))
    : Promise.resolve();

/**
 * Run the analysis in cancellable batches.
 *
 * Batches with a yield between them rather than a worker. The arithmetic never
 * touches the simulation or the DOM, so a worker would be defensible - but it
 * would also mean shipping a second copy of js/rvFit.js into a worker bundle,
 * and "reuse the same fitting implementation" is a stronger requirement than
 * "use a thread". Four hundred trials on a coarse grid is a couple of hundred
 * milliseconds of arithmetic spread across frames, and the cancel button works
 * on the next batch rather than the next trial, which is soon enough.
 *
 * @param {object} spec - points, params, minPeriod, maxPeriod, trials, seed
 * @param {object} [hooks] - onProgress, shouldCancel, yieldTo
 * @returns {Promise<object>} The report, or a refusal
 */
export async function runMonteCarlo(spec, hooks = {}) {
  const {
    onProgress = null,
    shouldCancel = () => false,
    yieldTo = defaultYield,
    batchSize = MC_LIMITS.batchSize,
  } = hooks;

  // The same split the workspace shows, so the Monte Carlo fits the same
  // points the student's own fit was made from.
  const { usable } = usablePoints(spec.points || []);
  const verdict = validateSpec({ ...spec, points: usable });
  if (!verdict.ok) {
    return {
      ok: false,
      reason: verdict.reason,
      detail: verdict.detail,
      assumptions: [...ASSUMPTIONS],
    };
  }

  const days = usable.map(p => p.day);
  const baseline = Math.max(...days) - Math.min(...days);
  const requested = Math.trunc(Number(spec.trials));
  // The same suggestion periodSearch would make, computed here so the report
  // can state the grid it used: ten samples across the natural peak width,
  // floored at 200 and capped by MC_LIMITS.
  const suggested =
    baseline > 0
      ? Math.ceil(10 * (1 / spec.minPeriod - 1 / spec.maxPeriod) * baseline)
      : 0;
  const samples = Math.min(
    MC_LIMITS.maxSamples,
    Math.max(200, Math.trunc(Number(spec.samples) || suggested))
  );
  const search = {
    minPeriod: spec.minPeriod,
    maxPeriod: spec.maxPeriod,
    samples,
  };

  // The model the synthetic runs are drawn around: the student's fit,
  // evaluated once at the recorded epochs.
  const model = usable.map(
    p =>
      spec.params.gamma +
      spec.params.K *
        Math.sin((2 * Math.PI * p.day) / spec.params.period + spec.params.phase)
  );

  // The inputs, frozen. Every value the run needs is copied out here and
  // nothing below reads `spec` again: the caller's object belongs to a panel
  // whose sliders keep moving, and a run that re-read it mid-flight would be
  // resampling around a model that is no longer the one it started from.
  const snapshot = Object.freeze({
    points: Object.freeze(usable.map(p => Object.freeze({ ...p }))),
    params: Object.freeze({ ...spec.params }),
    minPeriod: spec.minPeriod,
    maxPeriod: spec.maxPeriod,
    trials: requested,
    seed: spec.seed,
    samples,
    inputsKey: spec.inputsKey ?? null,
  });

  const normal = gaussianStream(snapshot.seed);
  const trials = [];
  const failures = { [TRIAL.NO_SEARCH]: 0, [TRIAL.NOT_FINITE]: 0 };
  let cancelled = false;

  for (let i = 0; i < requested; i++) {
    if (i > 0 && i % batchSize === 0) {
      await yieldTo();
      // Progress first, then the cancel check. The other order looks
      // equivalent and is not: a caller whose cancel predicate reads the
      // progress it was last told - which is the obvious way to write "stop
      // after n" - would be deciding on a count one batch out of date, and
      // the run would overshoot by a batch. Reporting first also means the
      // number on screen is current at the moment the run stops.
      onProgress?.({ done: i, total: requested });
      if (shouldCancel()) {
        cancelled = true;
        break;
      }
    }
    const trial = refitTrial(
      resampleAtEpochs(snapshot.points, model, normal),
      search
    );
    trials.push(trial);
    if (trial.status !== TRIAL.OK) failures[trial.status]++;
  }

  onProgress?.({ done: trials.length, total: requested });

  return summarise({
    trials,
    failures,
    spec: {
      ...snapshot,
      // The points themselves are not part of the exported block: they are
      // already in the recording the report sits beside, and a second copy
      // would be a second thing that could disagree with it.
      points: undefined,
      epochs: snapshot.points.length,
    },
    requested,
    cancelled,
    baseline,
  });
}

/**
 * A histogram of one quantity, for drawing.
 *
 * Bins in the quantity itself rather than in frequency: this is the picture a
 * reader looks at, and a period histogram with a frequency axis is a picture
 * nobody can read. The families are what carry the frequency reasoning.
 *
 * @param {Array<number>} values - The recovered values
 * @param {number} [bins] - How many bars
 * @returns {?object} lo, hi, width and counts, or null with nothing to bin
 */
export function histogram(values, bins = 40) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  if (!(hi > lo)) {
    // Every trial recovered the same value. A zero-width axis cannot be drawn,
    // so it is widened symmetrically and the single spike stays in the middle.
    const pad = Math.abs(lo) * 0.05 || 0.5;
    lo -= pad;
    hi += pad;
  }
  const width = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const v of finite) {
    const at = Math.min(bins - 1, Math.floor((v - lo) / width));
    counts[at]++;
  }
  return { lo, hi, width, counts, n: finite.length, peak: Math.max(...counts) };
}
