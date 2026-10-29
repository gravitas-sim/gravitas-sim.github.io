// =============================================================================
// Editorial time bands (Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// How long an investigation takes, as a band, authored by the project: short,
// medium or long, each with a range of minutes, for each investigation and each
// depth it offers. They are estimates reasoned from the lessons' declared
// durations and step counts; nobody timed a class with them, and every page that
// shows a band says so in the words of STATEMENT until the evidence-status record
// holds an observed value (the `timing-estimates` claim in
// tools/evidence-status.json; tests/timeBands.test.js holds OBSERVED to it). No
// median from an automated walk is used: a script clicks faster than a student
// reads.
//
// One table, read by the printable activity list (js/instructorPlan.js), the
// adoption pages and the Library's length facet (tools/build-adoption-pages.mjs,
// tools/build-library.mjs). The upper bounds are the lesson browser's own
// cut-offs (js/data/investigations/sequences.js, held equal by a test).
//
// How an entry was made, so a reviewer can redo it. The core depth takes the
// band of the upper bound of the minutes the lesson declares. A deeper depth
// adds its extra steps (the steps a reader sees at that depth, less the core's)
// at twice the core's average minutes a step, on top of that upper bound, takes
// the band of the total, and never sits below a shallower depth. The deeper
// steps are fits, uncertainties and predictions, which take longer than a
// reading step; "twice" is a judgement, not a measurement.
//
// Lives with the instructor modules (the idle precache group); no closure file
// of the instructor bundle imports it.
// =============================================================================

/** The bands, shortest first, with their ranges in minutes. */
export const BANDS = Object.freeze({
  short: Object.freeze({ lo: 5, hi: 25 }),
  medium: Object.freeze({ lo: 30, hi: 50 }),
  long: Object.freeze({ lo: 55, hi: 100 }),
});
export const BAND_ORDER = Object.freeze(['short', 'medium', 'long']);

/** The Library's length facet value for each band (js/data/investigations/sequences.js LENGTH). */
export const BAND_LENGTH = Object.freeze({
  short: 'demo',
  medium: 'period',
  long: 'long',
});

/** False until the evidence-status record's `timing-estimates` claim holds an observed value. */
export const OBSERVED = false;

/** What every page that shows a band says, in each language. */
export const STATEMENT = Object.freeze({
  en: 'Editorial estimate; no observed class data.',
  es: 'Estimación editorial; sin datos observados en clase.',
});

/** The band for a number of minutes (its upper bound, as the facet reads a range). */
export const bandOfMinutes = minutes =>
  minutes <= BANDS.short.hi
    ? 'short'
    : minutes <= BANDS.medium.hi
      ? 'medium'
      : 'long';

/**
 * Each investigation's band at each depth it offers (core always; quantitative
 * and advanced where the lesson has deeper steps, DEPTH.md).
 */
import { INSTRUCTOR as MEASUREMENT } from './investigations/depth/measurement-sequence.js';
import { INSTRUCTOR as SATELLITE } from './investigations/depth/satellite-sequence.js';
import { INSTRUCTOR as ATMOSPHERE } from './investigations/depth/atmosphere-sequence.js';
import { INSTRUCTOR as PLANETS } from './investigations/planets-sequence.js';
import { INSTRUCTOR as EXPOSURE } from './investigations/exposure-sequence.js';
import { INSTRUCTOR as STRATEGY } from './investigations/strategy-sequence.js';
import { INSTRUCTOR as TELESCOPE } from './investigations/telescope-sequence.js';
import { INSTRUCTOR as SPECTROGRAPH } from './investigations/spectrograph-sequence.js';
import { INSTRUCTOR as SATURATED_STAR } from './investigations/saturated-star-sequence.js';
import { INSTRUCTOR as PHOTCAL } from './investigations/photometric-calibration-sequence.js';
import { INSTRUCTOR as BINARIES } from './investigations/binaries-sequence.js';

export const LESSON_BANDS = Object.freeze({
  ...MEASUREMENT.bands,
  ...SATELLITE.bands,
  ...ATMOSPHERE.bands,
  ...PLANETS.bands,
  ...EXPOSURE.bands,
  ...STRATEGY.bands,
  ...TELESCOPE.bands,
  ...SPECTROGRAPH.bands,
  ...SATURATED_STAR.bands,
  ...PHOTCAL.bands,
  ...BINARIES.bands,
  'keplers-laws': { core: 'medium', quantitative: 'long', advanced: 'long' },
  'retrograde-motion': { core: 'medium' },
  'transit-photometry': {
    core: 'long',
    quantitative: 'long',
    advanced: 'long',
  },
  'orbital-energy': { core: 'medium' },
  'weighing-stars': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
  },
  'black-holes': { core: 'medium' },
  'radial-velocity': { core: 'long' },
  'goldilocks-question': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'missing-mass': { core: 'long', quantitative: 'long', advanced: 'long' },
  tides: { core: 'medium' },
  'butterfly-effect': { core: 'long' },
  'when-orbits-lock': { core: 'long' },
  'detect-this-planet': { core: 'medium' },
  'design-the-schedule': { core: 'medium', advanced: 'long' },
  'binary-star-planets': { core: 'medium' },
  'gravity-assist': { core: 'short' },
  'hohmann-transfer': { core: 'short' },
  'lagrange-points': { core: 'medium' },
  'what-is-a-gravitational-wave': { core: 'medium' },
  'listening-to-spacetime': { core: 'long' },
  'a-universe-of-stars': { core: 'long' },
  'lives-of-stars': { core: 'long' },
  'twelve-nights': { core: 'medium' },
  'power-law-gravity': { core: 'long' },
  'color-and-temperature': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'the-turning-sky': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'the-sun-through-the-year': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'phases-and-eclipses': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'wanderers-on-the-sky': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'plan-a-night': { core: 'short', quantitative: 'short', advanced: 'medium' },
  'lines-and-motion': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'long',
  },
  'what-a-spectrum-is-made-of': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'long',
  },
  'the-suns-motion': { core: 'medium', quantitative: 'long', advanced: 'long' },
  'the-rotating-disk': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'cluster-membership': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'inside-a-star': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'scaling-the-main-sequence': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'the-limit': { core: 'short', quantitative: 'medium', advanced: 'medium' },
  'the-expanding-universe': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'standard-candles': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'the-shape-of-expansion': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'where-galaxies-live': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'what-a-ccd-records': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'signal-noise-and-exposure': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'a-variable-star-from-frames': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'the-beat-of-a-star': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'leavitts-law': { core: 'short', quantitative: 'short', advanced: 'medium' },
  'the-first-rung': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'which-kind-of-variable': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'bending-light': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'einstein-rings-and-arcs': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
  },
  'a-lens-passing-by': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'who-gets-counted': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
  },
  'why-the-bright-ones-win': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'the-completeness-curve': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'integrators-in-practice': { core: 'medium' },
  'extending-an-experiment': { core: 'medium' },
  'refitting-a-transit': { core: 'medium' },
  'two-periodograms': { core: 'medium' },
  'sampling-a-posterior': { core: 'medium' },
});

const DEPTH_ORDER = ['core', 'quantitative', 'advanced'];

/**
 * An investigation's band at a depth: the deepest depth the lesson offers that
 * is no deeper than the one asked for.
 *
 * @param {string} id - Lesson id
 * @param {string} [depth] - 'core', 'quantitative' or 'advanced'
 * @returns {?string} 'short', 'medium' or 'long'; null for a lesson not in the table
 */
export function lessonBand(id, depth = 'core') {
  const row = LESSON_BANDS[id];
  if (!row) return null;
  for (let i = DEPTH_ORDER.indexOf(depth); i >= 0; i--)
    if (row[DEPTH_ORDER[i]]) return row[DEPTH_ORDER[i]];
  return row.core;
}

/**
 * The band of a share of an investigation (an assignment keeps some of a
 * lesson's steps): the band's own upper bound in proportion to the steps kept,
 * never under five minutes.
 *
 * @param {string} id - Lesson id
 * @param {string} depth - Depth read at
 * @param {number} share - Steps kept over steps in the lesson, 0 to 1
 * @returns {?string} A band
 */
export function shareBand(id, depth, share) {
  const whole = lessonBand(id, depth);
  if (!whole || share >= 1) return whole;
  return bandOfMinutes(Math.max(5, Math.round(BANDS[whole].hi * share)));
}
