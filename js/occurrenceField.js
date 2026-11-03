// =============================================================================
// The views of the occurrence panels (Prompt 229, OCCURRENCE_RATES.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/occurrenceWidgets.js and
// tests/occurrenceLessons.test.js (which recomputes every number a lesson states from them).
// Nothing is calculated here that the occurrence kernel does not: the rates, intervals, limits
// and floors are js/kernels/occurrence/rates.js's.
//
// The survey is SYNTHETIC and says so: 2000 stars with their own noise and span, a population of
// planets whose rates are known laid on them, and the completeness of every bin measured once by
// injection and recovery (js/data/occurrenceSurvey.js, the validator's own ensemble). A reader
// chooses the seed of the population (which planets happen to be listed), never the survey.
//
// Pure: no DOM, no clock.
// =============================================================================

import { SURVEY } from './data/occurrenceSurvey.js';
import {
  FLOOR,
  LEVEL,
  LIMIT_LEVEL,
  MIN_TRANSITS,
  N_MIN,
  PERIOD_EDGES,
  RADIUS_EDGES,
  THRESHOLD,
  analyticEfficiency,
  makeStars,
  rateOf,
  simulatePopulation,
  truthRates,
} from './kernels/occurrence/index.js';

const { Math } = globalThis;

export { FLOOR, MIN_TRANSITS, N_MIN, THRESHOLD, LIMIT_LEVEL, SURVEY };
export const PERIODS = PERIOD_EDGES.length - 1;
export const RADII = RADIUS_EDGES.length - 1;
export const SEEDS = 12;
/** The stated false fraction of the listings of each period bin (an input, never computed). */
export const FALSE_FRACTION = Object.freeze([
  0.02, 0.02, 0.03, 0.05, 0.08, 0.12, 0.2, 0.3,
]);
/** Reliability modes of the grid panel: none stated (taken as 1), the stated one, twice the false fraction. */
export const MODES = Object.freeze(['none', 'stated', 'doubled']);

const clampInt = (x, lo, hi) => Math.max(lo, Math.min(hi, Math.round(x ?? lo)));
export const periodBin = x => clampInt(x, 0, PERIODS - 1);
export const radiusBin = x => clampInt(x, 0, RADII - 1);
export const seedOf = x => clampInt(x, 1, SEEDS);
export const modeOf = x => MODES[clampInt(x, 0, 2)];
export const levelOf = x => (Math.round(x ?? 0) >= 1 ? 0.95 : LEVEL);

export const periodRange = j => [PERIOD_EDGES[j], PERIOD_EDGES[j + 1]];
export const radiusRange = k => [RADIUS_EDGES[k], RADIUS_EDGES[k + 1]];
export const periodMid = j => Math.sqrt(PERIOD_EDGES[j] * PERIOD_EDGES[j + 1]);
export const radiusMid = k => Math.sqrt(RADIUS_EDGES[k] * RADIUS_EDGES[k + 1]);

/** The survey's stars, built once. */
let starsCache = null;
export const stars = () =>
  (starsCache ??= makeStars({ seed: SURVEY.seed, n: SURVEY.stars }));

export const truth = () => truthRates();

const popCache = new Map();
/** The population of one seed: which planets the survey lists (a few tenths of a second, kept). */
export function population(seed) {
  const s = seedOf(seed);
  if (!popCache.has(s))
    popCache.set(
      s,
      simulatePopulation({
        stars: stars(),
        rates: truthRates(),
        reliability: FALSE_FRACTION.map(f => 1 - f),
        completeness: SURVEY.E,
        seed: `occ-ui:${s}`,
      })
    );
  return popCache.get(s);
}

/** The reliability a mode states for a period bin. */
export const reliabilityOf = (mode, j) =>
  mode === 'none'
    ? 1
    : mode === 'doubled'
      ? 1 - Math.min(0.9, 2 * FALSE_FRACTION[j])
      : 1 - FALSE_FRACTION[j];

/** The record of one bin: the rate or limit, with everything the readout states. */
export function binRecord({
  seed = 1,
  j = 0,
  k = 0,
  level = LEVEL,
  mode = 'stated',
  minCount = null,
}) {
  const pop = population(seed);
  const E = SURVEY.E[j][k];
  const rec = rateOf({
    n: pop.listed[j][k],
    completeness: E,
    reliability: reliabilityOf(mode, j),
    level,
    minCount,
  });
  return {
    ...rec,
    j,
    k,
    E,
    G: SURVEY.G[j][k],
    efficiency: SURVEY.efficiency[j][k],
    listed: pop.listed[j][k],
    real: pop.real[j][k],
    falseListings: pop.false[j][k],
    truth: truthRates()[j][k],
  };
}

/** Every period bin of one radius bin. */
export const radiusRow = (opts, k) =>
  Array.from({ length: PERIODS }, (_, j) => binRecord({ ...opts, j, k }));

/** The sum of the rates of a radius bin over the bins that returned one, and how many did not. */
export function radiusSum(records) {
  let sum = 0;
  let rates = 0;
  let limits = 0;
  let open = 0;
  for (const r of records) {
    if (r.status === 'ok') {
      sum += r.rate;
      rates++;
    } else if (r.status === 'upper-limit') limits++;
    else open++;
  }
  return { sum, rates, limits, unconstrained: open };
}

/** The efficiency (the probability a transiting planet is recovered) of every period bin of a radius bin. */
export const efficiencyRow = k => SURVEY.efficiency.map(row => row[k]);

/** The measured curve of the injection run, with the analytic form beside it. */
export function curvePoints() {
  return SURVEY.curve
    .filter(c => c.n >= 20 && c.hi !== null)
    .map(c => ({
      s: (c.lo + c.hi) / 2,
      p: c.p,
      low: c.low,
      high: c.high,
      n: c.n,
      analytic: analyticEfficiency((c.lo + c.hi) / 2),
    }));
}

/** How many stars hold at least MIN_TRANSITS epochs at the middle of a period bin, among the survey. */
export function starsWithEpochs(j) {
  const st = stars();
  const P = periodMid(j);
  let n = 0;
  for (let i = 0; i < st.n; i++) if (st.span[i] / P >= MIN_TRANSITS) n++;
  return n;
}
