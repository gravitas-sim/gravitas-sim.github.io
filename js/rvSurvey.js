// =============================================================================
// Synthetic observing runs
// -----------------------------------------------------------------------------
// The radial-velocity panel draws the star's velocity continuously, sixteen
// times a second, with no error bars. That is a good instrument for learning
// what a reflex curve looks like and a bad model of how anyone found a planet:
// nobody has ever had a continuous, noiseless velocity record of a star.
//
// A real programme gets a handful of numbers. Each one costs an hour on a
// telescope, arrives when the target is up and the weather holds, and carries
// an uncertainty. What a survey can conclude is decided long before the data
// are analysed, by three choices: how often to look, for how long, and how
// precisely.
//
// This module is that: an opt-in layer over the same simulated star, which
// keeps only the measurements a stated schedule would actually have produced.
//
// Three properties it has to have, and how each is arranged
// -----------------------------------------------------------------------------
// Reproducible. Two students given the same seed must see the same scatter, or
// they cannot compare answers. The noise therefore comes from a generator of
// this module's own, seeded here and never from Math.random. It deliberately
// does not use withSeed() from js/rng.js: that swaps Math.random globally so a
// world can be rebuilt deterministically, and reaching for it here would put
// the observing noise into the same stream as the world's own draws, where
// taking one measurement would change the next planet the sandbox generates.
// The dynamics are not touched at all - the star moves the same way whether
// anyone is observing it or not, which is also true of stars.
//
// Independent of the frame rate. A measurement is dated in *simulated days*,
// and its value is read at that instant by interpolating between the two
// render frames that bracket it. A student on a slow laptop and a student on a
// fast one get the same 12 numbers, because the schedule is in the simulation's
// time and not the browser's. Where the frames are too far apart for that
// interpolation to mean anything the measurement says so rather than pretending
// otherwise: see `gapDays` below.
//
// Honest about gaps. Nothing is recorded between epochs. An unobserved night
// is unobserved - no interpolated point, no smoothed line, nothing that a
// student could mistake for data. Drawing the connecting line between two
// measurements a month apart is the single most effective way to teach that a
// survey saw something it did not see, so the survey series is points, and the
// underlying curve is available separately and labelled as a teaching overlay.
// =============================================================================

import { mulberry32, normalizeSeed } from './rng.js';

/**
 * What a run looks like before anyone changes it.
 *
 * Twelve measurements over roughly one period of a hot Jupiter, at a precision
 * comparable to the instruments that found the first ones. Chosen so the
 * default run detects the default planet: a student's first survey should
 * work, and the interesting failures should be ones they caused.
 */
export const SURVEY_DEFAULTS = Object.freeze({
  cadenceDays: 0.32,
  baselineDays: 3.52,
  sigmaMs: 8,
  seed: 'survey-1',
});

/** Nothing below this is a cadence; it is a continuous recording. */
const MIN_CADENCE_DAYS = 1e-3;

/** A run longer than this is a mistake in a text field, not a plan. */
const MAX_EPOCHS = 2000;

/**
 * A measurement whose bracketing frames are further apart than this fraction
 * of the cadence is flagged.
 *
 * The value read at an epoch comes from interpolating between two render
 * frames. That is exact for a signal the frames resolve and meaningless for one
 * they do not: at 60x speed with a 3.5-day period, consecutive frames can be a
 * quarter of a cycle apart, and a straight line between them cuts the corner
 * off every peak. The measurement is still recorded - it is what the simulation
 * can say - and it is marked, so the panel can tell the reader to slow down
 * rather than quietly handing them flattened extremes.
 */
const GAP_WARN_FRACTION = 0.5;

/**
 * Turn whatever a control or a lesson supplied into a usable configuration.
 *
 * Clamped rather than rejected: a slider cannot produce a bad value, but a
 * share link, a lesson step and a hand-typed seed all can, and a survey that
 * refuses to start is less useful than one that starts sensibly.
 *
 * @param {object} [cfg] - Partial configuration
 * @returns {{cadenceDays: number, baselineDays: number, sigmaMs: number,
 *   seed: string, seedValue: number}} A complete, valid configuration
 */
export function normalizeSurveyConfig(cfg = {}) {
  const cadenceDays = Math.max(
    MIN_CADENCE_DAYS,
    Number(cfg.cadenceDays ?? SURVEY_DEFAULTS.cadenceDays) ||
      SURVEY_DEFAULTS.cadenceDays
  );
  const baselineDays = Math.max(
    0,
    Number(cfg.baselineDays ?? SURVEY_DEFAULTS.baselineDays) || 0
  );
  // Zero is meaningful and must survive: a noiseless run is how a student sees
  // what the schedule alone does to the answer, with nothing else in the way.
  const rawSigma = Number(cfg.sigmaMs ?? SURVEY_DEFAULTS.sigmaMs);
  const sigmaMs = Number.isFinite(rawSigma) && rawSigma > 0 ? rawSigma : 0;
  const seed = String(cfg.seed ?? SURVEY_DEFAULTS.seed);
  return {
    cadenceDays,
    baselineDays,
    sigmaMs,
    seed,
    seedValue: normalizeSeed(seed),
  };
}

/**
 * How many measurements a schedule produces.
 *
 * The first is taken at the moment the run starts, so a baseline of exactly one
 * cadence yields two measurements, not one. Off-by-one here would put every
 * "same number of measurements" comparison in the lesson out by one point.
 *
 * @param {{cadenceDays: number, baselineDays: number}} cfg - The schedule
 * @returns {number} Count of scheduled epochs
 */
export function epochCount(cfg) {
  const { cadenceDays, baselineDays } = normalizeSurveyConfig(cfg);
  // A hair of slack, so a baseline a reader entered as 3.52 with a cadence of
  // 0.32 gives the 12 points they counted on rather than 11 because the two
  // numbers do not divide exactly in binary floating point.
  const n = Math.floor(baselineDays / cadenceDays + 1e-9) + 1;
  return Math.min(MAX_EPOCHS, Math.max(1, n));
}

/**
 * Scramble a seed and an epoch index into a starting state.
 *
 * A finalizer with good avalanche, so epoch 7 and epoch 8 are not neighbours in
 * the output. Indexing the noise by epoch rather than drawing it sequentially
 * is what makes a measurement's value a property of *when it was scheduled*
 * rather than of when the browser happened to compute it: rewind the timeline
 * and re-run, and measurement 7 is the same number it was before.
 *
 * @param {number} seed - Unsigned 32-bit seed
 * @param {number} index - Epoch index
 * @returns {number} Unsigned 32-bit state
 */
function mixSeed(seed, index) {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15;
  h = Math.imul(h, 0x735a2d97);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * A standard normal deviate for one epoch of one run.
 *
 * Box-Muller over the dedicated stream. The polar form would avoid the two
 * transcendentals; at a dozen draws per run that is not a cost worth the extra
 * rejection loop, and the closed form is the one a student can look up.
 *
 * @param {number|string} seed - Run seed, raw or as typed
 * @param {number} index - Epoch index
 * @returns {number} A draw from N(0, 1)
 */
export function gaussianAt(seed, index) {
  const gen = mulberry32(mixSeed(normalizeSeed(seed), index));
  let u1 = gen();
  // log(0) is -Infinity. mulberry32 can return exactly 0.
  while (u1 <= Number.EPSILON) u1 = gen();
  const u2 = gen();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Begin an observing run.
 *
 * The run is driven by whoever has the signal: call `observe()` with the
 * simulation clock and the star's true radial velocity as often as convenient,
 * and it decides which of those instants the schedule actually wanted.
 *
 * @param {object} [config] - Partial configuration; see normalizeSurveyConfig
 * @returns {object} The run
 */
export function createSurvey(config = {}) {
  const cfg = normalizeSurveyConfig(config);
  const total = epochCount(cfg);

  /** @type {Array<object>} The measurements, in the order the schedule wanted them */
  let taken = [];
  /** The epoch the run is waiting for. */
  let next = 0;
  /** When the run started, in simulated days. Set by the first observation. */
  let startDay = null;
  /** The previous continuous reading, for interpolating onto an epoch. */
  let previous = null;

  /** @param {number} k - Epoch index @returns {number} Its scheduled time */
  const epochTime = k => startDay + k * cfg.cadenceDays;

  return {
    config: cfg,
    /** @returns {number} How many measurements the schedule will produce */
    get plannedCount() {
      return total;
    },

    /**
     * Offer the run a continuous reading of the signal.
     *
     * @param {number} simDay - The simulation clock, in days
     * @param {number} trueRv - The star's radial velocity now, in m/s
     * @returns {Array<object>} Measurements taken as a result of this reading
     */
    observe(simDay, trueRv) {
      if (!Number.isFinite(simDay) || !Number.isFinite(trueRv)) return [];

      if (startDay === null) startDay = simDay;

      const added = [];
      while (next < total) {
        const when = epochTime(next);
        // Not yet. The reading is kept as the left bracket for whenever the
        // epoch does arrive.
        if (when > simDay) break;

        // Where the signal was at `when`. With no earlier reading - the first
        // epoch, which falls on the first call - there is nothing to
        // interpolate and the reading is the value.
        let truth = trueRv;
        let gapDays = 0;
        if (previous && previous.day < when) {
          const span = simDay - previous.day;
          gapDays = span;
          const f = span > 0 ? (when - previous.day) / span : 0;
          truth = previous.rv + (trueRv - previous.rv) * f;
        }

        const noise =
          cfg.sigmaMs > 0 ? cfg.sigmaMs * gaussianAt(cfg.seedValue, next) : 0;
        const m = {
          index: next,
          day: when,
          rv: truth + noise,
          sigma: cfg.sigmaMs,
          truth,
          gapDays,
          // A measurement the frames could not resolve. Recorded and marked,
          // not silently dropped and not silently trusted.
          coarse: gapDays > cfg.cadenceDays * GAP_WARN_FRACTION,
        };
        taken.push(m);
        added.push(m);
        next++;
      }

      previous = { day: simDay, rv: trueRv };
      return added;
    },

    /** @returns {Array<object>} A copy of the measurements */
    measurements: () => taken.map(m => ({ ...m })),
    /** @returns {boolean} Whether the schedule has run its course */
    isComplete: () => next >= total,
    /** @returns {number} Measurements taken so far */
    count: () => taken.length,
    /** @returns {?number} When the run started, in simulated days */
    startedAt: () => startDay,
    /** @returns {?number} When the last scheduled measurement falls due */
    endsAt: () => (startDay === null ? null : epochTime(total - 1)),
    /** @returns {boolean} Whether any measurement outran the frame rate */
    anyCoarse: () => taken.some(m => m.coarse),

    /** Throw the run away and wait for a new first reading. */
    reset() {
      taken = [];
      next = 0;
      startDay = null;
      previous = null;
    },
  };
}

// --- Describing a run without overclaiming -----------------------------------
// Everything below is descriptive. None of it fits a model, and none of it is
// allowed to return the word "detected": what a dozen points can support is a
// statement about whether the velocity was constant, and that is a different
// claim from the presence of a planet. The lesson makes the distinction; these
// functions are careful not to blur it in passing.

/**
 * Chi-square of the measurements about their own mean.
 *
 * The question it answers, and the only one: how surprising is this much
 * scatter, if the star's velocity never changed and the only thing moving the
 * points is the stated measurement error?
 *
 * Reduced by the degrees of freedom, so 1 is "exactly as scattered as the error
 * bars predict" whatever the number of points. The mean is estimated from the
 * data, which costs one degree of freedom.
 *
 * @param {Array<{rv: number, sigma: number}>} points - The measurements
 * @returns {?{chi2: number, dof: number, reduced: number, mean: number}} Null below two points
 */
export function constantVelocityChiSquare(points) {
  const usable = points.filter(
    p => Number.isFinite(p.rv) && Number.isFinite(p.sigma) && p.sigma > 0
  );
  if (usable.length < 2) return null;
  const mean = usable.reduce((s, p) => s + p.rv, 0) / usable.length;
  const chi2 = usable.reduce((s, p) => s + ((p.rv - mean) / p.sigma) ** 2, 0);
  const dof = usable.length - 1;
  return { chi2, dof, reduced: chi2 / dof, mean };
}

/**
 * How much of an orbit's phase the schedule actually looked at.
 *
 * The statistic that separates the two runs in the lesson. Twelve measurements
 * spread across a cycle constrain its shape; twelve taken one period apart all
 * land on the same phase and constrain nothing, however long the programme ran
 * and however good the error bars were.
 *
 * Reported as the fraction of ten phase bins that hold at least one point:
 * coarse on purpose, because it is meant to be read off a plot and checked by
 * eye rather than believed to three figures.
 *
 * @param {Array<number>} days - Measurement times
 * @param {number} periodDays - The period being folded on
 * @param {number} [bins] - How finely to divide the cycle
 * @returns {?{covered: number, bins: number, fraction: number}} Null without a period
 */
export function phaseCoverage(days, periodDays, bins = 10) {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return null;
  const times = days.filter(Number.isFinite);
  if (!times.length) return null;
  const hit = new Set();
  for (const t of times) {
    let phase = (t / periodDays) % 1;
    if (phase < 0) phase += 1;
    hit.add(Math.min(bins - 1, Math.floor(phase * bins)));
  }
  return { covered: hit.size, bins, fraction: hit.size / bins };
}

/**
 * The plain description of a run: what was taken, and how much it scatters.
 *
 * `halfRange` is half the peak-to-peak spread of the measurements. It is not K,
 * it is not a fitted amplitude, and with noise on a handful of points it is
 * biased upward - two unlucky draws in opposite directions are enough. It is
 * here because it is what a student reads off the plot, and naming it honestly
 * is better than leaving them to call it K.
 *
 * @param {Array<object>} points - Measurements from a run
 * @param {object} [opts] - `periodDays` to include phase coverage
 * @returns {?object} The description, or null with nothing to describe
 */
export function surveyStats(points, opts = {}) {
  const usable = points.filter(p => Number.isFinite(p.rv));
  if (!usable.length) return null;

  const values = usable.map(p => p.rv);
  const days = usable.map(p => p.day);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const rms =
    values.length > 1
      ? Math.sqrt(
          values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
        )
      : 0;
  const sigmas = usable.map(p => p.sigma).filter(s => Number.isFinite(s));
  const sigma = sigmas.length
    ? sigmas.reduce((s, v) => s + v, 0) / sigmas.length
    : 0;

  return {
    n: usable.length,
    firstDay: Math.min(...days),
    lastDay: Math.max(...days),
    baselineDays: Math.max(...days) - Math.min(...days),
    mean,
    min,
    max,
    halfRange: (max - min) / 2,
    rms,
    sigma,
    chi: constantVelocityChiSquare(usable),
    coverage: phaseCoverage(days, opts.periodDays),
    coarse: usable.some(p => p.coarse),
  };
}
