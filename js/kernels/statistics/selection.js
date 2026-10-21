// =============================================================================
// The selection function as an object, and the biases it leaves (Prompt 154)
// -----------------------------------------------------------------------------
// A survey does not see the population: it sees the part of it that passed a
// cut on some observable and was then detected with some probability. That is
// a selection function, and it is built here as a first-class value:
//
//   selection({ name, observable, cut: {min, max}, probability: v => p })
//     .inclusion(row)         the probability a row is in the sample (0 below a cut)
//     .apply(rows, uniformFor)  who is in, by the draws uniformFor(i) gives
//   all(a, b, ...)            independent selections in series: the product
//   either(a, b, ...)         independent channels: 1 - the product of (1 - p)
//
// `apply` returns every object's probability, the included indices and their
// weights 1/p, which is what a completeness correction needs. The draw for row
// i is made by the caller (`uniformFor(i)`), so a keyed stream and a sequential
// one both work, and a row is drawn for only when its probability lies strictly
// between 0 and 1.
//
// The biases are measured differences and closed forms to compare them with:
// Eddington (a noisy measurement of a quantity that falls with its value, so
// the true value of what is seen is lower than seen), Malmquist (a flux-limited
// sample of scattered standard candles is brighter on average than the
// population), and the completeness correction n / c with the sampling error
// carried. Each closed form is exact for the model stated; none is a claim
// about a real survey, whose selection and population must be modelled.
// =============================================================================

import { normalCdf } from './special.js';
import { StatisticsError } from './resample.js';

const { Math, Number, Float64Array, Int32Array, Uint8Array } = globalThis;

const refused = (code, why) => ({ status: 'refused', code, why });
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const pdf = z => Math.exp(-0.5 * z * z) / SQRT_2PI;

function build(name, observables, inclusion) {
  const sel = {
    name,
    observables,
    inclusion,
    apply(rows, uniformFor) {
      const n = rows.length;
      const flags = new Uint8Array(n);
      const probabilities = new Float64Array(n);
      const included = [];
      let expected = 0;
      for (let i = 0; i < n; i++) {
        const p = inclusion(rows[i]);
        probabilities[i] = p;
        expected += p;
        if (p >= 1 || (p > 0 && uniformFor(i) < p)) {
          flags[i] = 1;
          included.push(i);
        }
      }
      const weights = Float64Array.from(included, i => 1 / probabilities[i]);
      return {
        status: 'ok',
        name,
        n,
        flags,
        probabilities,
        included: Int32Array.from(included),
        weights,
        expected,
      };
    },
  };
  return Object.freeze(sel);
}

/**
 * One selection: a cut and/or an inclusion probability on one observable.
 * @param {{name?: string, observable?: string|null, cut?: {min?: number, max?: number}|null,
 *   probability?: function(number): number|null}} spec - A row is an object
 *   keyed by `observable`, or the number itself when there is no observable.
 *   The cut's bounds are inclusive.
 */
export function selection({
  name = 'selection',
  observable = null,
  cut = null,
  probability = null,
} = {}) {
  const valueOf = row =>
    observable !== null && typeof row === 'object' ? row[observable] : row;
  const inclusion = row => {
    const v = valueOf(row);
    if (cut) {
      if (!Number.isFinite(v)) return 0;
      if (
        (cut.min !== undefined && v < cut.min) ||
        (cut.max !== undefined && v > cut.max)
      )
        return 0;
    }
    if (!probability) return 1;
    const p = probability(v);
    if (!(p >= 0 && p <= 1))
      throw new StatisticsError(
        'probability',
        `the inclusion probability ${p} of selection "${name}" is not in [0, 1]`
      );
    return p;
  };
  return build(name, observable === null ? [] : [observable], inclusion);
}

const union = sels => [...new Set(sels.flatMap(s => s.observables))];

/** Independent selections in series: a row must pass every one. */
export function all(...sels) {
  return build(sels.map(s => s.name).join(' and '), union(sels), row => {
    let p = 1;
    for (const s of sels) p *= s.inclusion(row);
    return p;
  });
}

/** Independent channels in parallel: a row is in if any one takes it. */
export function either(...sels) {
  return build(sels.map(s => s.name).join(' or '), union(sels), row => {
    let q = 1;
    for (const s of sels) q *= 1 - s.inclusion(row);
    return 1 - q;
  });
}

/** A logistic completeness curve 1 / (1 + e^((m - m50) / width)): the survey suite's. */
export const logisticCompleteness =
  ({ m50, width }) =>
  m =>
    1 / (1 + Math.exp((m - m50) / width));

/**
 * Correct binned counts for a known completeness: n / c, with its sampling
 * error. The population is "poisson" (a rate: variance n / c^2) or "fixed" (a
 * known finite population thinned by detection: variance n (1 - c) / c^2). A bin
 * whose completeness is below `minCompleteness` is refused, not corrected: it
 * would multiply a handful of objects by a large number and call it a count.
 */
export function completenessCorrect({
  observed,
  completeness,
  population = 'poisson',
  minCompleteness = 0.1,
}) {
  if (!observed?.length || observed.length !== completeness?.length)
    throw new StatisticsError(
      'length',
      'counts and completenesses must be lists of the same, non-zero length'
    );
  if (population !== 'poisson' && population !== 'fixed')
    throw new StatisticsError(
      'population',
      'the population is "poisson" or "fixed"'
    );
  const bins = observed.map((n, i) => {
    const c = completeness[i];
    if (!(c >= minCompleteness && c <= 1) || !(n >= 0))
      return {
        observed: n,
        completeness: c,
        corrected: null,
        sigma: null,
        status: 'refused',
        code: 'completeness',
      };
    const variance = population === 'poisson' ? n : n * (1 - c);
    return {
      observed: n,
      completeness: c,
      corrected: n / c,
      sigma: Math.sqrt(variance) / c,
      status: 'ok',
    };
  });
  return {
    status: 'ok',
    method: 'completeness-correction',
    population,
    minCompleteness,
    bins,
  };
}

/**
 * Eddington bias, exact for an exponential population: for true values with
 * density proportional to exp(-S / scale) on S >= 0, observed with Gaussian
 * noise sigma, the mean of the true value given the observed one is that of a
 * Gaussian N(observed - sigma^2 / scale, sigma^2) truncated to S >= 0. Returns
 * that mean minus the observed value (negative: what is seen is brighter than
 * what is there). NaN for a non-positive sigma or scale.
 */
export function eddingtonShift({ observed, sigma, scale }) {
  if (!(sigma > 0) || !(scale > 0) || !Number.isFinite(observed)) return NaN;
  const mu = observed - (sigma * sigma) / scale;
  const t = mu / sigma;
  const tail = normalCdf(t);
  if (!(tail > 0)) return NaN;
  return mu + (sigma * pdf(t)) / tail - observed;
}

/**
 * Malmquist bias at a fixed apparent magnitude, exact for Gaussian absolute
 * magnitudes of scatter sigma and number counts that grow as 10^(slope m): the
 * mean absolute magnitude of the objects seen is lower (brighter) than the
 * population's by slope ln(10) sigma^2. `slope` 0.6 is a uniform density in
 * Euclidean space.
 */
export const malmquistShift = ({ sigma, slope = 0.6 }) =>
  -slope * Math.LN10 * sigma * sigma;

/**
 * The shift of the mean of a Gaussian population cut at z sigma above its mean
 * (objects with M <= mean + z sigma kept), as at a fixed distance in a
 * flux-limited sample: -sigma phi(z) / Phi(z).
 */
export const malmquistCutShift = ({ sigma, z }) =>
  (-sigma * pdf(z)) / normalCdf(z);

/**
 * A bias measured on a synthetic population: the mean of the selected values
 * minus the reference value, with the standard error of that mean.
 */
export function measuredShift(values, reference) {
  const n = values?.length ?? 0;
  if (n < 2)
    return refused('samples', 'a shift needs at least two selected values');
  let m = 0;
  for (let i = 0; i < n; i++) m += values[i];
  m /= n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (values[i] - m) ** 2;
  return {
    status: 'ok',
    n,
    shift: m - reference,
    se: Math.sqrt(ss / (n - 1) / n),
  };
}

/**
 * Eddington bias as a measured difference: in bins of the OBSERVED value, the
 * mean true value minus the mean observed one (bins [lo, hi) between
 * consecutive edges), with the standard error of the difference's mean.
 */
export function binnedMeanShift({ observed, truth, edges }) {
  const bins = [];
  for (let b = 0; b + 1 < edges.length; b++) {
    const lo = edges[b];
    const hi = edges[b + 1];
    let n = 0;
    let so = 0;
    let st = 0;
    let sd = 0;
    for (let i = 0; i < observed.length; i++) {
      if (observed[i] >= lo && observed[i] < hi) {
        n++;
        so += observed[i];
        st += truth[i];
        sd += (truth[i] - observed[i]) ** 2;
      }
    }
    const shift = n ? (st - so) / n : NaN;
    const se =
      n > 1 ? Math.sqrt(Math.max(0, sd / n - shift * shift) / (n - 1)) : NaN;
    bins.push({
      lo,
      hi,
      n,
      meanObserved: n ? so / n : NaN,
      meanTruth: n ? st / n : NaN,
      shift,
      se,
    });
  }
  return bins;
}
