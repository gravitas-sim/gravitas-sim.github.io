// =============================================================================
// Aliases and the verdict on a cadence (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
//   COMBS            the sampling combs a night's observing imposes: the sidereal day,
//                    the solar day, the year, the synodic month
//   predictAliases   DERIVED: |f0 + sum k_i f_i| for the combs, by order, never the
//                    identity
//   judgeCadence     DERIVED, under ASSUMPTIONS: resolved, ambiguous, not-constrained
//                    or refused for a sinusoid of a given amplitude to noise ratio
//   periodUncertainty DERIVED: the Cramer-Rao bound on a sinusoid's frequency, from
//                    the epochs themselves
//
// One visit a night from one site recurs at the SIDEREAL day, not the solar day: the
// target's window opens 0.9972696 d later each night, a comb at 1.0027379 cycles per
// solar day. For a sinusoid of amplitude A in white noise sigma, the chi-square
// advantage of the true frequency over an alias whose response power is p_a is
// N (A / sigma)^2 (1 - p_a) / 2; below 9 (three sigma) the cadence cannot say which
// one it is. The verdict is a sinusoid's: harmonics, red noise and a Moon comb that
// is not in the epochs are not read.
// =============================================================================

import { sinusoidResponse, spectralWindow, baselineOf } from './window.js';

const { Math, Float64Array, Set, Number } = globalThis;

/** Solar days in a sidereal day. */
export const SIDEREAL_DAY = 0.9972695663;
/** Cycles per solar day of the sidereal-day comb: 1 + 1 / 365.2422. */
export const SIDEREAL_FREQUENCY = 1 / SIDEREAL_DAY;

/** The combs a ground-based campaign meets, with their frequencies in cycles per day. */
export const COMBS = Object.freeze({
  siderealDay: Object.freeze({
    id: 'siderealDay',
    frequency: SIDEREAL_FREQUENCY,
  }),
  solarDay: Object.freeze({ id: 'solarDay', frequency: 1 }),
  year: Object.freeze({ id: 'year', frequency: 1 / 365.256363004 }),
  month: Object.freeze({ id: 'month', frequency: 1 / 29.530588853 }),
});

/** The reasons a verdict is refused or not constrained. */
export const REASONS = Object.freeze({
  tooFewTimes: 'too-few-times',
  badPeriod: 'bad-period',
  nonFiniteTime: 'non-finite-time',
  badSnr: 'bad-snr',
  baseline: 'baseline',
});

/** Chi-square advantage below which a cadence is ambiguous: a three sigma preference. */
export const DCHI2_MIN = 9;
/** Cycles of the period the baseline must hold to constrain it at all. */
export const MIN_CYCLES = 2;

/**
 * The aliases of a frequency: |f0 + sum k_i f_i| over integer vectors of total
 * order at most `order`, not all zero, merged where equal.
 * @param {number} f0
 * @param {{id: string, frequency: number}[]} combs
 * @param {{order?: number, fMin?: number, fMax?: number}} [opts]
 * @returns {{kinds: Object<string, number>, k: number, order: number,
 *   offset: number, frequency: number, period: number}[]} lowest order first;
 *   `offset` is the signed shift sum(k_i f_i) from the true frequency (or from
 *   its negative image when f0 + offset is below zero), which is where the
 *   window is read
 */
export function predictAliases(
  f0,
  combs,
  { order = 2, fMin = 0, fMax = Infinity } = {}
) {
  const out = [];
  const seen = new Set();
  const vec = new Array(combs.length).fill(0);
  const walk = (i, used) => {
    if (i === combs.length) {
      if (used === 0) return;
      let offset = 0;
      for (let j = 0; j < combs.length; j++)
        offset += vec[j] * combs[j].frequency;
      const f = Math.abs(f0 + offset);
      if (!(f > Math.max(fMin, 1e-9)) || f > fMax) return;
      const key = Math.round(f * 1e10);
      if (seen.has(key)) return;
      seen.add(key);
      const kinds = {};
      combs.forEach((c, j) => {
        if (vec[j]) kinds[c.id] = vec[j];
      });
      out.push({
        kinds,
        k: combs.length ? vec[0] : 0,
        order: used,
        offset,
        frequency: f,
        period: 1 / f,
      });
      return;
    }
    for (let k = -(order - used); k <= order - used; k++) {
      vec[i] = k;
      walk(i + 1, used + Math.abs(k));
    }
    vec[i] = 0;
  };
  walk(0, 0);
  return out.sort(
    (a, b) =>
      a.order - b.order ||
      Math.abs(a.frequency - f0) - Math.abs(b.frequency - f0)
  );
}

/**
 * The Cramer-Rao bound on the frequency of a sinusoid of amplitude A in white
 * noise sigma observed at `times`: sigma / (pi A sqrt(2 sum (t - tbar)^2)).
 * For N regular epochs it is sqrt(6 / N) sigma / (pi T A) (Montgomery and
 * O'Donoghue 1999).
 */
export function periodUncertainty(times, period, amplitude, sigma) {
  let tbar = 0;
  for (let i = 0; i < times.length; i++) tbar += times[i];
  tbar /= times.length;
  let s = 0;
  for (let i = 0; i < times.length; i++) s += (times[i] - tbar) ** 2;
  const sigmaF = sigma / (Math.PI * amplitude * Math.sqrt(2 * s));
  return { sigmaF, sigmaPeriod: sigmaF * period * period };
}

const distinctCount = times => {
  const s = Float64Array.from(times).sort();
  let n = 0;
  for (let i = 0; i < s.length; i++) if (i === 0 || s[i] - s[i - 1] > 1e-9) n++;
  return n;
};

/**
 * Whether a cadence can tell a period from its aliases.
 *
 * @param {ArrayLike<number>} times - epochs in days
 * @param {number} period - the period to judge, in days
 * @param {object} opts
 * @param {number} opts.snr - amplitude over the noise of one point
 * @param {{id: string, frequency: number}[]} [opts.combs]
 * @param {number} [opts.order] - alias order
 * @param {{minPeriod?: number, maxPeriod?: number}} [opts.band] - the periods the search covers
 * @param {number} [opts.dchi2Min]
 * @returns {{verdict: 'resolved'|'ambiguous'|'not-constrained'|'refused',
 *   reason?: string, aliases: object[], period?: number, frequency?: number,
 *   baseline?: number, resolution?: number, worst?: object}}
 */
export function judgeCadence(
  times,
  period,
  {
    snr,
    combs = [COMBS.siderealDay],
    order = null,
    band = {},
    dchi2Min = DCHI2_MIN,
  } = {}
) {
  const refuse = reason => ({ verdict: 'refused', reason, aliases: [] });
  for (let i = 0; i < times.length; i++)
    if (!Number.isFinite(times[i])) return refuse(REASONS.nonFiniteTime);
  if (!(distinctCount(times) >= 3)) return refuse(REASONS.tooFewTimes);
  if (!(Number.isFinite(period) && period > 0))
    return refuse(REASONS.badPeriod);
  if (!(Number.isFinite(snr) && snr > 0)) return refuse(REASONS.badSnr);
  const n = times.length;
  const T = baselineOf(times);
  const f0 = 1 / period;
  const base = {
    period,
    frequency: f0,
    baseline: T,
    resolution: 1 / T,
    n,
    snr,
  };
  if (T < MIN_CYCLES * period)
    return {
      ...base,
      verdict: 'not-constrained',
      reason: REASONS.baseline,
      aliases: [],
    };
  const fMin = band.maxPeriod ? 1 / band.maxPeriod : 0;
  const fMax = band.minPeriod ? 1 / band.minPeriod : Infinity;
  // Every alias the search band can hold, unless the caller fixes the order: a
  // band to 4 cycles a day holds aliases of order 4 of a one-cycle-a-day comb.
  const top = Math.max(...combs.map(c => c.frequency));
  const orderUsed =
    order ??
    (Number.isFinite(fMax)
      ? Math.min(combs.length > 1 ? 4 : 12, Math.ceil((fMax + f0) / top))
      : 2);
  const list = predictAliases(f0, combs, { order: orderUsed, fMin, fMax });
  const aliases = [];
  const merged = [];
  const t = Float64Array.from(times);
  for (const a of list) {
    if (Math.abs(a.frequency - f0) < 1 / T) {
      merged.push(a);
      continue;
    }
    // The alias peak sits at the predicted frequency for an ideal comb and
    // within a fraction of a resolution element of it for a real pattern.
    const probe = Float64Array.from(
      { length: 9 },
      (_, i) => a.frequency + ((i - 4) * 0.25) / (4 * T)
    );
    const response = sinusoidResponse(
      t,
      f0,
      probe.filter(f => f > 0)
    );
    let p = 0;
    for (const v of response) if (v > p) p = v;
    p = Math.min(1, p);
    const dchi2 = (n * snr * snr * (1 - p)) / 2;
    aliases.push({
      ...a,
      power: p,
      window: spectralWindow(t, [a.offset])[0],
      dchi2,
    });
  }
  aliases.sort((a, b) => a.dchi2 - b.dchi2);
  const worst = aliases[0] ?? null;
  const verdict = worst && worst.dchi2 < dchi2Min ? 'ambiguous' : 'resolved';
  return {
    ...base,
    verdict,
    aliases,
    merged,
    worst,
    dchi2Min,
    order: orderUsed,
  };
}
