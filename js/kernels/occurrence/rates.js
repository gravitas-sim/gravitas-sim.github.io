// =============================================================================
// Completeness by injection and the occurrence rate of a bin (Prompt 229)
// -----------------------------------------------------------------------------
// The completeness of a target in a bin of period and radius is the expected
// number of planets of unit rate that the survey lists from it,
//
//   c = mean over the draws of the bin of p_geo(P) * recovered
//
// (the periods and radii log-uniform in the bin, the impact parameter uniform,
// the epoch of the first transit uniform): the geometric probability times the
// recovery of an injected transit, the number of transits the target's span
// holds entering through the epochs. E = sum over the targets of c. A bin's
// listed detections are Poisson with mean Gamma * E / r (r the stated
// reliability: the probability a listing is a planet), so
//
//   Gamma_hat = n r / E,   its interval Prompt 154's Poisson procedure
//   n = 0                  a one-sided upper limit -ln(1 - level) / E, no rate
//   E < floor              not constrained: no rate and no limit
//
// A rate is the expected number of planets per star in the bin and may exceed
// one. The reliability is a stated input, never computed here; a bin without
// one is refused. Pure; no DOM.
// =============================================================================

import { stream } from '../../random/streams.js';
import { poissonInterval } from '../statistics/intervals.js';
import { selection } from '../statistics/selection.js';
import { isCount, refused } from '../statistics/check.js';
import {
  MIN_TRANSITS,
  PERIOD_EDGES,
  R_EARTH,
  R_SUN,
  RADIUS_EDGES,
  THRESHOLD,
  geometricProbability,
  epochCount,
  starAt,
} from './survey.js';
import { recover, signalToNoise, transitSignal } from './injection.js';

const { Math, Float64Array, Int32Array } = globalThis;

export const LEVEL = 0.6827;
export const LIMIT_LEVEL = 0.95;
export const FLOOR = 5;
export const N_MIN = 10;
export const CURVE = Object.freeze({ width: 1, bins: 40 });
const HOPELESS = 8;

const NP = PERIOD_EDGES.length - 1;
const NR = RADIUS_EDGES.length - 1;
const LN_P = PERIOD_EDGES.map(Math.log);
const LN_R = RADIUS_EDGES.map(Math.log);

/** The bin of each axis, from a flat index j * NR + k. */
export const binOf = idx => ({ j: Math.floor(idx / NR), k: idx % NR });

/** A sampled planet of a bin: period, radius, impact parameter, epoch of the first transit. */
export function drawPlanet(draw, j, k) {
  const P = Math.exp(LN_P[j] + draw() * (LN_P[j + 1] - LN_P[j]));
  const radiusEarth = Math.exp(LN_R[k] + draw() * (LN_R[k + 1] - LN_R[k]));
  const b = draw();
  const t0 = draw() * P;
  return { P, radiusEarth, b, t0 };
}

/**
 * An injection run over a survey, resumable: start, step (a few stars at a
 * time, so the page keeps drawing) and finish. Each star has a stream of its
 * own, so a run does not depend on how it was cut into steps.
 */
export function startInjection({
  stars,
  seed = 'occ',
  trials = 4,
  rho = 0,
  threshold = THRESHOLD,
  range = null,
  only = null,
}) {
  if (!Number.isInteger(trials) || trials < 1 || trials > 64)
    throw new RangeError(
      'trials per star and bin: a whole number from 1 to 64'
    );
  return {
    stars,
    seed,
    trials,
    rho,
    threshold,
    next: range ? range[0] : 0,
    end: range ? Math.min(stars.n, range[1]) : stars.n,
    only: only ? new Set(only) : null,
    E: new Float64Array(NP * NR),
    G: new Float64Array(NP * NR),
    E2: new Float64Array(NP * NR),
    recovered: new Int32Array(NP * NR),
    injected: new Int32Array(NP * NR),
    skipped: 0,
    curve: {
      n: new Int32Array(CURVE.bins + 1),
      k: new Int32Array(CURVE.bins + 1),
    },
    c: new Float32Array(stars.n * NP * NR),
  };
}

/** Advance the run by up to `count` stars; returns the share done, 0 to 1. */
export function stepInjection(run, count = 50) {
  const { stars, trials, rho, threshold } = run;
  const end = Math.min(run.end, run.next + count);
  for (let i = run.next; i < end; i++) {
    const star = starAt(stars, i);
    const draw = stream('injection', run.seed, 'star', i);
    for (let j = 0; j < NP; j++) {
      for (let k = 0; k < NR; k++) {
        const bin = j * NR + k;
        if (run.only && !run.only.has(bin)) continue;
        let acc = 0;
        for (let t = 0; t < trials; t++) {
          const planet = drawPlanet(draw, j, k);
          const pg = geometricProbability(planet.P, star);
          const N = epochCount(planet.P, star.span, planet.t0);
          run.injected[bin]++;
          let hit = false;
          if (N >= MIN_TRANSITS) {
            // A planet whose deepest possible deficit cannot reach the threshold even by
            // HOPELESS sigma of noise is a miss without the light curve.
            const kk = (planet.radiusEarth * R_EARTH) / (star.radius * R_SUN);
            const dmax = Math.min(1, 1.3 * kk * kk);
            const sMax =
              (dmax * Math.sqrt(N * maxPoints(planet.P, star))) / star.sigma;
            if (sMax + HOPELESS < threshold) run.skipped++;
            else {
              const sig = transitSignal(planet, star, planet.t0, {
                keepShapes: rho > 0,
              });
              const r = recover(sig, star, draw, { threshold, rho });
              hit = r.detected;
              const S = signalToNoise(sig, star);
              const cb = Math.min(
                CURVE.bins,
                Math.max(0, Math.floor(S / CURVE.width))
              );
              run.curve.n[cb]++;
              if (hit) run.curve.k[cb]++;
            }
          }
          const term = hit ? pg : 0;
          acc += term;
          run.E[bin] += term / trials;
          run.E2[bin] += (term * term) / trials;
          run.G[bin] += pg / trials;
          if (hit) run.recovered[bin]++;
        }
        run.c[i * NP * NR + bin] = acc / trials;
      }
    }
  }
  run.next = end;
  return run.end ? end / run.end : 1;
}

/** An upper bound on the cadence points of one transit: T14 <= P / pi * asin((1 + k) / aRs) with 1 + k below 1.5. */
function maxPoints(P, star) {
  const aRs = 1 / geometricProbability(P, star);
  const T = (P / Math.PI) * Math.asin(Math.min(1, 1.5 / aRs));
  return T * 48 + 2;
}

/** Everything a finished run says: E, the geometric sum, the Monte Carlo error and the efficiency curve. */
export function finishInjection(run) {
  const E = Array.from({ length: NP }, (_, j) =>
    Array.from(run.E.subarray(j * NR, (j + 1) * NR))
  );
  const G = Array.from({ length: NP }, (_, j) =>
    Array.from(run.G.subarray(j * NR, (j + 1) * NR))
  );
  // The Monte Carlo error of E: the sum of the independent draws' squares over the trials squared
  // (it leaves out the subtraction of the mean, so it is a little conservative).
  const se = Array.from({ length: NP }, (_, j) =>
    Array.from({ length: NR }, (_, k) =>
      Math.sqrt(run.E2[j * NR + k] / run.trials)
    )
  );
  const curve = [];
  for (let c = 0; c <= CURVE.bins; c++) {
    const n = run.curve.n[c];
    const k = run.curve.k[c];
    const [lo, hi] = wilson(k, n);
    curve.push({
      lo: c * CURVE.width,
      hi: c === CURVE.bins ? Infinity : (c + 1) * CURVE.width,
      n,
      recovered: k,
      p: n ? k / n : null,
      low: lo,
      high: hi,
    });
  }
  return {
    status: 'ok',
    stars: run.stars.n,
    trials: run.trials,
    threshold: run.threshold,
    rho: run.rho,
    E,
    G,
    efficiency: E.map((row, j) =>
      row.map((e, k) => (G[j][k] > 0 ? e / G[j][k] : null))
    ),
    se,
    skipped: run.skipped,
    injected: run.injected.reduce((a, b) => a + b, 0),
    curve,
    perStar: run.c,
  };
}

/** The injection run in one call. */
export function injectionRun(spec) {
  const run = startInjection(spec);
  while (run.next < run.end) stepInjection(run, 100);
  return finishInjection(run);
}

/** The Wilson score interval of k of n at about one sigma (z = 1). */
export function wilson(k, n, z = 1) {
  if (!n) return [null, null];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

// ---- the rate of one bin ---------------------------------------------------------------------

/**
 * The occurrence rate of one bin from its listed detections.
 * @param {{n: number, completeness: number, reliability: number, level?: number,
 *   limitLevel?: number, floor?: number, minCount?: number|null}} spec
 *   `completeness` is E, the summed completeness of the targets; `reliability`
 *   is the stated probability a listing is a planet; `minCount` (a B verdict)
 *   turns a bin with fewer listings into an upper limit.
 */
export function rateOf({
  n,
  completeness,
  reliability,
  level = LEVEL,
  limitLevel = LIMIT_LEVEL,
  floor = FLOOR,
  minCount = null,
}) {
  if (!(Number.isFinite(reliability) && reliability > 0 && reliability <= 1))
    return refused(
      'reliability',
      'a rate needs the stated reliability of the listings, a probability above 0 and at most 1'
    );
  if (!isCount(n))
    return refused('count', 'a count is a whole number of at least 0');
  if (!(Number.isFinite(completeness) && completeness >= 0))
    return refused(
      'completeness',
      'the summed completeness is not a number of at least 0'
    );
  const base = { n, completeness, reliability };
  if (completeness < floor)
    return {
      status: 'not-constrained',
      ...base,
      floor,
      why: `the searched population holds ${completeness.toPrecision(2)} planets of unit rate, below ${floor}: it cannot constrain this bin`,
    };
  const limit = -Math.log(1 - limitLevel) / completeness;
  if (n === 0)
    return {
      status: 'upper-limit',
      ...base,
      level: limitLevel,
      upperLimit: limit,
    };
  if (minCount !== null && n < minCount)
    return {
      status: 'upper-limit',
      ...base,
      level: limitLevel,
      upperLimit: poissonInterval([n], {
        exposure: completeness / reliability,
        level: limitLevel,
      }).hi,
      limited: true,
      why: `fewer than ${minCount} listings: carried as a limit, not a rate`,
    };
  const iv = poissonInterval([n], {
    exposure: completeness / reliability,
    level,
  });
  return {
    status: 'ok',
    ...base,
    rate: iv.rate,
    lo: iv.lo,
    hi: iv.hi,
    level,
    method: iv.method,
    assumes: iv.assumes,
  };
}

/**
 * The grid of rates: counts[j][k], E[j][k] and a reliability per period bin (or
 * one number, or a matrix).
 */
export function occurrenceGrid({
  counts,
  E,
  reliability,
  level,
  limitLevel,
  floor,
  minCount,
}) {
  const rel = (j, k) =>
    Array.isArray(reliability)
      ? Array.isArray(reliability[j])
        ? reliability[j][k]
        : reliability[j]
      : reliability;
  return counts.map((row, j) =>
    row.map((n, k) =>
      rateOf({
        n,
        completeness: E[j][k],
        reliability: rel(j, k),
        level,
        limitLevel,
        floor,
        minCount,
      })
    )
  );
}

// ---- the measured efficiency curve ------------------------------------------------------------

/** The share of injected transits recovered at a signal to noise, from the run's curve; refused outside the injected range. */
export function efficiencyAt(result, S, { minTrials = 20 } = {}) {
  const bins = result.curve;
  const c = bins.find(b => S >= b.lo && S < b.hi);
  if (!(S >= 0) || !c || c.hi === Infinity || c.n < minTrials)
    return refused(
      'range',
      `no injection at a signal to noise of ${Number.isFinite(S) ? S.toFixed(1) : S}: the curve is not extrapolated`
    );
  return { status: 'ok', S, p: c.p, low: c.low, high: c.high, n: c.n };
}

/**
 * The measured curve as a selection of Prompt 154's object: a transit at a signal to noise inside
 * the injected range is recovered with the measured share; outside it, the object includes nothing
 * (it does not extrapolate). Built from the bins the injection filled.
 */
export function measuredRecovery(result, { minTrials = 20 } = {}) {
  const ok = result.curve.filter(b => b.n >= minTrials);
  if (!ok.length) return null;
  const lo = ok[0].lo;
  const hi =
    ok[ok.length - 1].hi === Infinity
      ? ok[ok.length - 1].lo + CURVE.width
      : ok[ok.length - 1].hi;
  return selection({
    name: 'measured recovery',
    observable: 'snr',
    cut: { min: lo, max: hi },
    probability: s => {
      const c = ok.find(b => s >= b.lo && s < b.hi) ?? ok[ok.length - 1];
      return c.p;
    },
  });
}
