// =============================================================================
// What an experiment measures
// -----------------------------------------------------------------------------
// One metric is one question a student can ask of a run: how far apart were
// these two bodies, how fast was this one going, how much energy did the
// integrator lose. Each is declared once here - its id, its unit, how to
// sample it from a frame, and how to reduce a whole run to a single number -
// and the bench, the chart, the results table and the CSV all read the same
// declaration. A metric added here appears in all four without any of them
// being edited, which is the only way four surfaces stay in agreement.
//
// On units
// -----------------------------------------------------------------------------
// Everything is sampled in simulation units and converted once, here, at the
// point where a number becomes something a person reads. The alternative -
// converting in the chart and again in the CSV - is how two exports of one run
// come to disagree in the third decimal place. The conversions are the ones
// js/dataExport.js already uses, for the same reason: a student who exports a
// trajectory and an experiment should be able to plot them on one axis.
//
// On energy and momentum
// -----------------------------------------------------------------------------
// Total energy, angular momentum and their drifts come from
// physics.js:conservedQuantities() and conservationDrift(). This file does not
// re-derive them. Re-implementing the force law to measure it would mean the
// bench could report a system as conserving beautifully while the engine that
// actually moved the bodies did something else.
// =============================================================================

/** Metric ids, so callers do not pass raw strings around. */
export const METRICS = {
  POSITION: 'position',
  SEPARATION: 'separation',
  SPEED: 'speed',
  VELOCITY_X: 'velocity_x',
  VELOCITY_Y: 'velocity_y',
  DISTANCE_TO_PRIMARY: 'distance_to_primary',
  ORBITAL_PERIOD: 'orbital_period',
  CLOSEST_APPROACH: 'closest_approach',
  TOTAL_ENERGY: 'total_energy',
  ANGULAR_MOMENTUM: 'angular_momentum',
  ENERGY_DRIFT: 'energy_drift',
  ANGULAR_DRIFT: 'angular_drift',
};

/**
 * How many bodies a metric needs selected before it means anything.
 *
 * Enforced by the bench rather than guessed at: "separation" with one body
 * selected is not a measurement with a missing argument, it is a question that
 * has not been asked yet, and the interface should say so before the run
 * rather than produce a column of nulls after it.
 */
export const METRIC_ARITY = {
  [METRICS.POSITION]: 1,
  [METRICS.SEPARATION]: 2,
  [METRICS.SPEED]: 1,
  [METRICS.VELOCITY_X]: 1,
  [METRICS.VELOCITY_Y]: 1,
  [METRICS.DISTANCE_TO_PRIMARY]: 1,
  [METRICS.ORBITAL_PERIOD]: 1,
  [METRICS.CLOSEST_APPROACH]: 2,
  [METRICS.TOTAL_ENERGY]: 0,
  [METRICS.ANGULAR_MOMENTUM]: 0,
  [METRICS.ENERGY_DRIFT]: 0,
  [METRICS.ANGULAR_DRIFT]: 0,
};

/** Unit strings, used in the CSV header and beside every number on screen. */
export const METRIC_UNITS = {
  [METRICS.POSITION]: 'AU',
  [METRICS.SEPARATION]: 'AU',
  [METRICS.SPEED]: 'km/s',
  [METRICS.VELOCITY_X]: 'km/s',
  [METRICS.VELOCITY_Y]: 'km/s',
  [METRICS.DISTANCE_TO_PRIMARY]: 'AU',
  [METRICS.ORBITAL_PERIOD]: 'days',
  [METRICS.CLOSEST_APPROACH]: 'AU',
  [METRICS.TOTAL_ENERGY]: 'sim',
  [METRICS.ANGULAR_MOMENTUM]: 'sim',
  [METRICS.ENERGY_DRIFT]: '%',
  [METRICS.ANGULAR_DRIFT]: '%',
};

/**
 * Metrics whose answer is one number for the whole run rather than a series.
 *
 * A period is not a function of time; neither is the closest the two bodies
 * ever came. They are still sampled every frame - that is how they are found -
 * but the thing worth comparing is the scalar at the end.
 */
export const SCALAR_METRICS = new Set([
  METRICS.ORBITAL_PERIOD,
  METRICS.CLOSEST_APPROACH,
]);

/** Simulation lengths are hundredths of an AU. */
export const UNITS_PER_AU = 100;

/**
 * Sample every selected metric from the current frame.
 *
 * Called once per recorded sample by the bench. Kept free of any dependency on
 * physics.js so it can be tested with plain objects: the caller passes in the
 * bodies it already has and the conserved quantities it already computed.
 *
 * @param {Object} ctx
 * @param {number} ctx.t - Simulated seconds
 * @param {Array<Object>} ctx.bodies - Selected bodies, {id, pos, vel, mass}
 * @param {Object|null} ctx.primary - The body distances are measured from
 * @param {Object|null} ctx.conserved - {energy, angular} in simulation units
 * @param {Object|null} ctx.drift - {energy, angular} as fractions
 * @param {number} ctx.secondsPerUnit - Simulated seconds in one time unit
 * @param {Array<string>} ctx.metrics - Metric ids to sample
 * @returns {Object} metric id -> number, and `t`
 */
export function sampleFrame({
  t,
  bodies = [],
  primary = null,
  conserved = null,
  drift = null,
  secondsPerUnit = 1,
  metrics = [],
}) {
  const out = { t };
  const kmPerSecond = UNITS_PER_AU_M / UNITS_PER_AU / secondsPerUnit / 1000;
  const first = bodies[0] || null;
  const second = bodies[1] || null;

  for (const id of metrics) {
    switch (id) {
      case METRICS.POSITION:
        if (first) {
          out[`${METRICS.POSITION}_x`] = first.pos.x / UNITS_PER_AU;
          out[`${METRICS.POSITION}_y`] = first.pos.y / UNITS_PER_AU;
          out[METRICS.POSITION] =
            Math.hypot(first.pos.x, first.pos.y) / UNITS_PER_AU;
        }
        break;
      case METRICS.SEPARATION:
        if (first && second) {
          out[id] =
            Math.hypot(first.pos.x - second.pos.x, first.pos.y - second.pos.y) /
            UNITS_PER_AU;
        }
        break;
      case METRICS.SPEED:
        if (first) {
          out[id] = Math.hypot(first.vel.x, first.vel.y) * kmPerSecond;
        }
        break;
      case METRICS.VELOCITY_X:
        if (first) out[id] = first.vel.x * kmPerSecond;
        break;
      case METRICS.VELOCITY_Y:
        if (first) out[id] = first.vel.y * kmPerSecond;
        break;
      case METRICS.DISTANCE_TO_PRIMARY:
        if (first && primary && primary.id !== first.id) {
          out[id] =
            Math.hypot(
              first.pos.x - primary.pos.x,
              first.pos.y - primary.pos.y
            ) / UNITS_PER_AU;
        }
        break;
      case METRICS.TOTAL_ENERGY:
        if (conserved) out[id] = conserved.energy;
        break;
      case METRICS.ANGULAR_MOMENTUM:
        if (conserved) out[id] = conserved.angular;
        break;
      case METRICS.ENERGY_DRIFT:
        if (drift) out[id] = (drift.energy ?? 0) * 100;
        break;
      case METRICS.ANGULAR_DRIFT:
        if (drift) out[id] = (drift.angular ?? 0) * 100;
        break;
      // Period and closest approach are derived from the whole series; see
      // reduceRun(). Nothing to sample here beyond what the others already
      // recorded.
      default:
        break;
    }
  }

  // Always recorded when two bodies are selected, because closest approach is
  // a minimum over the run and cannot be recovered from a sparse table later.
  if (first && second) {
    out.__separation =
      Math.hypot(first.pos.x - second.pos.x, first.pos.y - second.pos.y) /
      UNITS_PER_AU;
  }
  if (first && primary && primary.id !== first.id) {
    out.__radius =
      Math.hypot(first.pos.x - primary.pos.x, first.pos.y - primary.pos.y) /
      UNITS_PER_AU;
  }
  return out;
}

/** One AU in metres, so speeds come out in km/s. */
const UNITS_PER_AU_M = 1.495978707e11;

/**
 * Pull one named series out of a run's samples.
 * @param {Array<Object>} samples - From sampleFrame
 * @param {string} key - Metric id, or a suffixed component like position_x
 * @returns {Array<{t:number, v:number}>} Ascending series, gaps dropped
 */
export function series(samples, key) {
  const out = [];
  for (const s of samples || []) {
    const v = s[key];
    if (Number.isFinite(v)) out.push({ t: s.t, v });
  }
  return out;
}

/**
 * The orbital period, measured the way the stopwatch measures it.
 *
 * Successive minima in the distance to the primary are periapsis passages, and
 * the time between them is one orbit. Three consecutive samples make a
 * minimum; nothing here assumes the orbit is closed, or elliptical, or that
 * the student picked a sensible primary.
 *
 * Returns the mean of the intervals found, because one interval on a perturbed
 * orbit is noisy and the mean of several is the number a student would quote.
 *
 * @param {Array<Object>} samples - From sampleFrame, needing __radius
 * @returns {{period:number|null, passages:number}} Period in simulated seconds
 */
export function orbitalPeriod(samples) {
  const times = [];
  for (let i = 1; i < (samples?.length || 0) - 1; i++) {
    const prev = samples[i - 1].__radius;
    const here = samples[i].__radius;
    const next = samples[i + 1].__radius;
    if (
      !Number.isFinite(prev) ||
      !Number.isFinite(here) ||
      !Number.isFinite(next)
    ) {
      continue;
    }
    if (here < prev && here <= next) times.push(samples[i].t);
  }
  if (times.length < 2) return { period: null, passages: times.length };
  let total = 0;
  for (let i = 1; i < times.length; i++) total += times[i] - times[i - 1];
  return { period: total / (times.length - 1), passages: times.length };
}

/**
 * The closest the two selected bodies came, over the whole run.
 * @param {Array<Object>} samples - From sampleFrame, needing __separation
 * @returns {{distance:number|null, t:number|null}} Minimum and when it happened
 */
export function closestApproach(samples) {
  let best = null;
  let at = null;
  for (const s of samples || []) {
    const d = s.__separation;
    if (!Number.isFinite(d)) continue;
    if (best === null || d < best) {
      best = d;
      at = s.t;
    }
  }
  return { distance: best, t: at };
}

/**
 * Reduce a run to one number per metric, for the results table.
 *
 * A time series has to become a scalar before two runs can be put in a table,
 * and *which* scalar is a judgement per metric rather than a default. The
 * final value is right for a drift, which accumulates. The mean is right for a
 * separation, which oscillates and whose last sample is an accident of when
 * the student stopped the run.
 *
 * @param {Array<Object>} samples - From sampleFrame
 * @param {Array<string>} metrics - Metric ids
 * @param {number} secondsPerDay - Simulated seconds in a day, for periods
 * @returns {Object} metric id -> {value, kind}
 */
export function reduceRun(samples, metrics, secondsPerDay = 86400) {
  const out = {};
  for (const id of metrics) {
    if (id === METRICS.ORBITAL_PERIOD) {
      const { period, passages } = orbitalPeriod(samples);
      out[id] = {
        value: period === null ? null : period / secondsPerDay,
        kind: 'mean-of-intervals',
        passages,
      };
      continue;
    }
    if (id === METRICS.CLOSEST_APPROACH) {
      const { distance, t } = closestApproach(samples);
      out[id] = { value: distance, kind: 'minimum', at: t };
      continue;
    }
    const s = series(samples, id);
    if (!s.length) {
      out[id] = { value: null, kind: 'none' };
      continue;
    }
    if (id === METRICS.ENERGY_DRIFT || id === METRICS.ANGULAR_DRIFT) {
      out[id] = { value: s[s.length - 1].v, kind: 'final' };
      continue;
    }
    if (id === METRICS.TOTAL_ENERGY || id === METRICS.ANGULAR_MOMENTUM) {
      out[id] = { value: s[s.length - 1].v, kind: 'final' };
      continue;
    }
    const mean = s.reduce((sum, p) => sum + p.v, 0) / s.length;
    out[id] = { value: mean, kind: 'mean' };
  }
  return out;
}

/**
 * Absolute and fractional difference between two reduced runs.
 *
 * The fractional difference is left null against a zero baseline rather than
 * reported as infinity: "the energy changed by ∞%" is not a result, it is a
 * division nobody should have done.
 *
 * @param {Object} a - reduceRun output for Run A
 * @param {Object} b - reduceRun output for Run B
 * @param {Array<string>} metrics - Metric ids
 * @returns {Array<{metric:string, unit:string, a:number|null, b:number|null,
 *   delta:number|null, fraction:number|null, kind:string}>} Table rows
 */
export function compareRuns(a, b, metrics) {
  return metrics.map(id => {
    const va = a?.[id]?.value ?? null;
    const vb = b?.[id]?.value ?? null;
    const both = Number.isFinite(va) && Number.isFinite(vb);
    const delta = both ? vb - va : null;
    return {
      metric: id,
      unit: METRIC_UNITS[id] || '',
      a: va,
      b: vb,
      delta,
      fraction: both && va !== 0 ? delta / Math.abs(va) : null,
      kind: a?.[id]?.kind || b?.[id]?.kind || 'none',
    };
  });
}
