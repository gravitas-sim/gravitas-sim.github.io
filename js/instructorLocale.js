// =============================================================================
// Every lesson in Spanish, at once, for the documents
// -----------------------------------------------------------------------------
// Prompt 79. The Spanish guides and keys read the lesson as a Spanish student
// does: the lesson's shadow (data/investigations/es) laid over the English by
// mergeTranslation, and the deeper steps (data/investigations/depth) laid in
// with their own shadow (depth/es). The application loads these one at a time
// and on demand (registry.js, depth.js); the documents want all of them and
// cannot await anything, so this is the static door, as depthAll.js is for the
// English deeper steps. Static imports, so the digest of what a build was made
// from (tools/instructor-freshness.mjs) follows every file.
//
// Not imported by any route: the build and the tests read it.
// =============================================================================
import {
  mergeTranslation,
  translationCoverage,
} from './data/investigations/i18n.js';
import { DEEPER } from './investigations/depthAll.js';
import { layDepth, overlay } from './investigations/depthPure.js';
import A_UNIVERSE_OF_STARS from './data/investigations/es/a-universe-of-stars.js';
import BINARY_STAR_PLANETS from './data/investigations/es/binary-star-planets.js';
import BLACK_HOLES from './data/investigations/es/black-holes.js';
import BUTTERFLY_EFFECT from './data/investigations/es/butterfly-effect.js';
import COLOR_AND_TEMPERATURE from './data/investigations/es/color-and-temperature.js';
import THE_TURNING_SKY from './data/investigations/es/the-turning-sky.js';
import THE_SUN_THROUGH_THE_YEAR from './data/investigations/es/the-sun-through-the-year.js';
import PHASES_AND_ECLIPSES from './data/investigations/es/phases-and-eclipses.js';
import WANDERERS_ON_THE_SKY from './data/investigations/es/wanderers-on-the-sky.js';
import PLAN_A_NIGHT from './data/investigations/es/plan-a-night.js';
import LINES_AND_MOTION from './data/investigations/es/lines-and-motion.js';
import WHAT_A_SPECTRUM_IS_MADE_OF from './data/investigations/es/what-a-spectrum-is-made-of.js';
import THE_SUNS_MOTION from './data/investigations/es/the-suns-motion.js';
import THE_ROTATING_DISK from './data/investigations/es/the-rotating-disk.js';
import CLUSTER_MEMBERSHIP from './data/investigations/es/cluster-membership.js';
import INSIDE_A_STAR from './data/investigations/es/inside-a-star.js';
import SCALING_THE_MAIN_SEQUENCE from './data/investigations/es/scaling-the-main-sequence.js';
import THE_LIMIT from './data/investigations/es/the-limit.js';
import THE_EXPANDING_UNIVERSE from './data/investigations/es/the-expanding-universe.js';
import STANDARD_CANDLES from './data/investigations/es/standard-candles.js';
import THE_SHAPE_OF_EXPANSION from './data/investigations/es/the-shape-of-expansion.js';
import WHERE_GALAXIES_LIVE from './data/investigations/es/where-galaxies-live.js';
import WHAT_A_CCD_RECORDS from './data/investigations/es/what-a-ccd-records.js';
import SIGNAL_NOISE_AND_EXPOSURE from './data/investigations/es/signal-noise-and-exposure.js';
import A_VARIABLE_STAR_FROM_FRAMES from './data/investigations/es/a-variable-star-from-frames.js';
import THE_BEAT_OF_A_STAR from './data/investigations/es/the-beat-of-a-star.js';
import LEAVITTS_LAW from './data/investigations/es/leavitts-law.js';
import THE_FIRST_RUNG from './data/investigations/es/the-first-rung.js';
import WHICH_KIND_OF_VARIABLE from './data/investigations/es/which-kind-of-variable.js';
import BENDING_LIGHT from './data/investigations/es/bending-light.js';
import EINSTEIN_RINGS_AND_ARCS from './data/investigations/es/einstein-rings-and-arcs.js';
import A_LENS_PASSING_BY from './data/investigations/es/a-lens-passing-by.js';
import DESIGN_THE_SCHEDULE from './data/investigations/es/design-the-schedule.js';
import DETECT_THIS_PLANET from './data/investigations/es/detect-this-planet.js';
import GOLDILOCKS_QUESTION from './data/investigations/es/goldilocks-question.js';
import GRAVITY_ASSIST from './data/investigations/es/gravity-assist.js';
import HOHMANN_TRANSFER from './data/investigations/es/hohmann-transfer.js';
import KEPLERS_LAWS from './data/investigations/es/keplers-laws.js';
import LAGRANGE_POINTS from './data/investigations/es/lagrange-points.js';
import LISTENING_TO_SPACETIME from './data/investigations/es/listening-to-spacetime.js';
import LIVES_OF_STARS from './data/investigations/es/lives-of-stars.js';
import MISSING_MASS from './data/investigations/es/missing-mass.js';
import ORBITAL_ENERGY from './data/investigations/es/orbital-energy.js';
import POWER_LAW_GRAVITY from './data/investigations/es/power-law-gravity.js';
import RADIAL_VELOCITY from './data/investigations/es/radial-velocity.js';
import RETROGRADE_MOTION from './data/investigations/es/retrograde-motion.js';
import TIDES from './data/investigations/es/tides.js';
import TRANSIT_PHOTOMETRY from './data/investigations/es/transit-photometry.js';
import TWELVE_NIGHTS from './data/investigations/es/twelve-nights.js';
import WEIGHING_STARS from './data/investigations/es/weighing-stars.js';
import WHAT_IS_A_GRAVITATIONAL_WAVE from './data/investigations/es/what-is-a-gravitational-wave.js';
import WHEN_ORBITS_LOCK from './data/investigations/es/when-orbits-lock.js';
import COLOR_AND_TEMPERATURE_DEEPER from './data/investigations/depth/es/color-and-temperature.js';
import THE_TURNING_SKY_DEEPER from './data/investigations/depth/es/the-turning-sky.js';
import THE_SUN_THROUGH_THE_YEAR_DEEPER from './data/investigations/depth/es/the-sun-through-the-year.js';
import PHASES_AND_ECLIPSES_DEEPER from './data/investigations/depth/es/phases-and-eclipses.js';
import WANDERERS_ON_THE_SKY_DEEPER from './data/investigations/depth/es/wanderers-on-the-sky.js';
import PLAN_A_NIGHT_DEEPER from './data/investigations/depth/es/plan-a-night.js';
import LINES_AND_MOTION_DEEPER from './data/investigations/depth/es/lines-and-motion.js';
import WHAT_A_SPECTRUM_IS_MADE_OF_DEEPER from './data/investigations/depth/es/what-a-spectrum-is-made-of.js';
import THE_SUNS_MOTION_DEEPER from './data/investigations/depth/es/the-suns-motion.js';
import THE_ROTATING_DISK_DEEPER from './data/investigations/depth/es/the-rotating-disk.js';
import CLUSTER_MEMBERSHIP_DEEPER from './data/investigations/depth/es/cluster-membership.js';
import INSIDE_A_STAR_DEEPER from './data/investigations/depth/es/inside-a-star.js';
import SCALING_THE_MAIN_SEQUENCE_DEEPER from './data/investigations/depth/es/scaling-the-main-sequence.js';
import THE_LIMIT_DEEPER from './data/investigations/depth/es/the-limit.js';
import THE_EXPANDING_UNIVERSE_DEEPER from './data/investigations/depth/es/the-expanding-universe.js';
import STANDARD_CANDLES_DEEPER from './data/investigations/depth/es/standard-candles.js';
import THE_SHAPE_OF_EXPANSION_DEEPER from './data/investigations/depth/es/the-shape-of-expansion.js';
import WHERE_GALAXIES_LIVE_DEEPER from './data/investigations/depth/es/where-galaxies-live.js';
import WHAT_A_CCD_RECORDS_DEEPER from './data/investigations/depth/es/what-a-ccd-records.js';
import SIGNAL_NOISE_AND_EXPOSURE_DEEPER from './data/investigations/depth/es/signal-noise-and-exposure.js';
import A_VARIABLE_STAR_FROM_FRAMES_DEEPER from './data/investigations/depth/es/a-variable-star-from-frames.js';
import THE_BEAT_OF_A_STAR_DEEPER from './data/investigations/depth/es/the-beat-of-a-star.js';
import LEAVITTS_LAW_DEEPER from './data/investigations/depth/es/leavitts-law.js';
import THE_FIRST_RUNG_DEEPER from './data/investigations/depth/es/the-first-rung.js';
import WHICH_KIND_OF_VARIABLE_DEEPER from './data/investigations/depth/es/which-kind-of-variable.js';
import BENDING_LIGHT_DEEPER from './data/investigations/depth/es/bending-light.js';
import EINSTEIN_RINGS_AND_ARCS_DEEPER from './data/investigations/depth/es/einstein-rings-and-arcs.js';
import A_LENS_PASSING_BY_DEEPER from './data/investigations/depth/es/a-lens-passing-by.js';
import KEPLERS_LAWS_DEEPER from './data/investigations/depth/es/keplers-laws.js';
import MISSING_MASS_DEEPER from './data/investigations/depth/es/missing-mass.js';
import TRANSIT_PHOTOMETRY_DEEPER from './data/investigations/depth/es/transit-photometry.js';
import WEIGHING_STARS_DEEPER from './data/investigations/depth/es/weighing-stars.js';
import WHO_GETS_COUNTED_DEEPER from './data/investigations/depth/es/who-gets-counted.js';
import WHY_THE_BRIGHT_ONES_WIN_DEEPER from './data/investigations/depth/es/why-the-bright-ones-win.js';
import THE_COMPLETENESS_CURVE_DEEPER from './data/investigations/depth/es/the-completeness-curve.js';
import WHO_GETS_COUNTED from './data/investigations/es/who-gets-counted.js';
import WHY_THE_BRIGHT_ONES_WIN from './data/investigations/es/why-the-bright-ones-win.js';
import THE_COMPLETENESS_CURVE from './data/investigations/es/the-completeness-curve.js';
import INTEGRATORS_IN_PRACTICE from './data/investigations/es/integrators-in-practice.js';
import EXTENDING_AN_EXPERIMENT from './data/investigations/es/extending-an-experiment.js';
import REFITTING_A_TRANSIT from './data/investigations/es/refitting-a-transit.js';
import TWO_PERIODOGRAMS from './data/investigations/es/two-periodograms.js';
import SAMPLING_A_POSTERIOR from './data/investigations/es/sampling-a-posterior.js';

/** The Spanish shadow of each lesson, by lesson id. */
export const SHADOWS = Object.freeze({
  'a-universe-of-stars': A_UNIVERSE_OF_STARS,
  'binary-star-planets': BINARY_STAR_PLANETS,
  'black-holes': BLACK_HOLES,
  'butterfly-effect': BUTTERFLY_EFFECT,
  'color-and-temperature': COLOR_AND_TEMPERATURE,
  'the-turning-sky': THE_TURNING_SKY,
  'the-sun-through-the-year': THE_SUN_THROUGH_THE_YEAR,
  'phases-and-eclipses': PHASES_AND_ECLIPSES,
  'wanderers-on-the-sky': WANDERERS_ON_THE_SKY,
  'plan-a-night': PLAN_A_NIGHT,
  'lines-and-motion': LINES_AND_MOTION,
  'what-a-spectrum-is-made-of': WHAT_A_SPECTRUM_IS_MADE_OF,
  'the-suns-motion': THE_SUNS_MOTION,
  'the-rotating-disk': THE_ROTATING_DISK,
  'cluster-membership': CLUSTER_MEMBERSHIP,
  'inside-a-star': INSIDE_A_STAR,
  'scaling-the-main-sequence': SCALING_THE_MAIN_SEQUENCE,
  'the-limit': THE_LIMIT,
  'the-expanding-universe': THE_EXPANDING_UNIVERSE,
  'standard-candles': STANDARD_CANDLES,
  'the-shape-of-expansion': THE_SHAPE_OF_EXPANSION,
  'where-galaxies-live': WHERE_GALAXIES_LIVE,
  'what-a-ccd-records': WHAT_A_CCD_RECORDS,
  'signal-noise-and-exposure': SIGNAL_NOISE_AND_EXPOSURE,
  'a-variable-star-from-frames': A_VARIABLE_STAR_FROM_FRAMES,
  'the-beat-of-a-star': THE_BEAT_OF_A_STAR,
  'leavitts-law': LEAVITTS_LAW,
  'the-first-rung': THE_FIRST_RUNG,
  'which-kind-of-variable': WHICH_KIND_OF_VARIABLE,
  'bending-light': BENDING_LIGHT,
  'einstein-rings-and-arcs': EINSTEIN_RINGS_AND_ARCS,
  'a-lens-passing-by': A_LENS_PASSING_BY,
  'who-gets-counted': WHO_GETS_COUNTED,
  'why-the-bright-ones-win': WHY_THE_BRIGHT_ONES_WIN,
  'the-completeness-curve': THE_COMPLETENESS_CURVE,
  'integrators-in-practice': INTEGRATORS_IN_PRACTICE,
  'extending-an-experiment': EXTENDING_AN_EXPERIMENT,
  'refitting-a-transit': REFITTING_A_TRANSIT,
  'two-periodograms': TWO_PERIODOGRAMS,
  'sampling-a-posterior': SAMPLING_A_POSTERIOR,
  'design-the-schedule': DESIGN_THE_SCHEDULE,
  'detect-this-planet': DETECT_THIS_PLANET,
  'goldilocks-question': GOLDILOCKS_QUESTION,
  'gravity-assist': GRAVITY_ASSIST,
  'hohmann-transfer': HOHMANN_TRANSFER,
  'keplers-laws': KEPLERS_LAWS,
  'lagrange-points': LAGRANGE_POINTS,
  'listening-to-spacetime': LISTENING_TO_SPACETIME,
  'lives-of-stars': LIVES_OF_STARS,
  'missing-mass': MISSING_MASS,
  'orbital-energy': ORBITAL_ENERGY,
  'power-law-gravity': POWER_LAW_GRAVITY,
  'radial-velocity': RADIAL_VELOCITY,
  'retrograde-motion': RETROGRADE_MOTION,
  tides: TIDES,
  'transit-photometry': TRANSIT_PHOTOMETRY,
  'twelve-nights': TWELVE_NIGHTS,
  'weighing-stars': WEIGHING_STARS,
  'what-is-a-gravitational-wave': WHAT_IS_A_GRAVITATIONAL_WAVE,
  'when-orbits-lock': WHEN_ORBITS_LOCK,
});

/** The Spanish shadow of each lesson's deeper steps, by lesson id. */
export const DEEPER_SHADOWS = Object.freeze({
  'color-and-temperature': COLOR_AND_TEMPERATURE_DEEPER,
  'the-turning-sky': THE_TURNING_SKY_DEEPER,
  'the-sun-through-the-year': THE_SUN_THROUGH_THE_YEAR_DEEPER,
  'phases-and-eclipses': PHASES_AND_ECLIPSES_DEEPER,
  'wanderers-on-the-sky': WANDERERS_ON_THE_SKY_DEEPER,
  'plan-a-night': PLAN_A_NIGHT_DEEPER,
  'lines-and-motion': LINES_AND_MOTION_DEEPER,
  'what-a-spectrum-is-made-of': WHAT_A_SPECTRUM_IS_MADE_OF_DEEPER,
  'the-suns-motion': THE_SUNS_MOTION_DEEPER,
  'the-rotating-disk': THE_ROTATING_DISK_DEEPER,
  'cluster-membership': CLUSTER_MEMBERSHIP_DEEPER,
  'inside-a-star': INSIDE_A_STAR_DEEPER,
  'scaling-the-main-sequence': SCALING_THE_MAIN_SEQUENCE_DEEPER,
  'the-limit': THE_LIMIT_DEEPER,
  'the-expanding-universe': THE_EXPANDING_UNIVERSE_DEEPER,
  'standard-candles': STANDARD_CANDLES_DEEPER,
  'the-shape-of-expansion': THE_SHAPE_OF_EXPANSION_DEEPER,
  'where-galaxies-live': WHERE_GALAXIES_LIVE_DEEPER,
  'what-a-ccd-records': WHAT_A_CCD_RECORDS_DEEPER,
  'signal-noise-and-exposure': SIGNAL_NOISE_AND_EXPOSURE_DEEPER,
  'a-variable-star-from-frames': A_VARIABLE_STAR_FROM_FRAMES_DEEPER,
  'the-beat-of-a-star': THE_BEAT_OF_A_STAR_DEEPER,
  'leavitts-law': LEAVITTS_LAW_DEEPER,
  'the-first-rung': THE_FIRST_RUNG_DEEPER,
  'which-kind-of-variable': WHICH_KIND_OF_VARIABLE_DEEPER,
  'bending-light': BENDING_LIGHT_DEEPER,
  'einstein-rings-and-arcs': EINSTEIN_RINGS_AND_ARCS_DEEPER,
  'a-lens-passing-by': A_LENS_PASSING_BY_DEEPER,
  'who-gets-counted': WHO_GETS_COUNTED_DEEPER,
  'why-the-bright-ones-win': WHY_THE_BRIGHT_ONES_WIN_DEEPER,
  'the-completeness-curve': THE_COMPLETENESS_CURVE_DEEPER,
  'keplers-laws': KEPLERS_LAWS_DEEPER,
  'missing-mass': MISSING_MASS_DEEPER,
  'transit-photometry': TRANSIT_PHOTOMETRY_DEEPER,
  'weighing-stars': WEIGHING_STARS_DEEPER,
});

/**
 * The mark spanishLesson() puts in front of every string a shadow supplied,
 * when asked to. A string that does not start with it is the English that
 * stands in for a Spanish text nobody has written.
 */
export const SHADOW_MARK = '\u0001';

/** A shadow with every string marked: the same shape, so the same merge. */
const marked = value =>
  typeof value === 'string'
    ? SHADOW_MARK + value
    : Array.isArray(value)
      ? value.map(marked)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, marked(v)])
          )
        : value;

/**
 * A lesson as a Spanish student reads it, every depth laid in.
 * @param {id: string} inv - The English lesson (core steps)
 * @param {boolean} [withDepths] - Lay the deeper steps in (default)
 * @param {boolean} [mark] - Put SHADOW_MARK before each string a shadow
 *   supplied, so a caller can say which words are Spanish and which are not.
 *   For the structured notes; the guides and keys never ask.
 * @returns <class 'object'> The Spanish lesson; the English one where there is no shadow
 */
export function spanishLesson(inv, withDepths = true, mark = false) {
  const given = shadow => (mark && shadow ? marked(shadow) : shadow);
  const shadow = given(SHADOWS[inv.id]);
  const base = shadow ? mergeTranslation(inv, shadow) : inv;
  const deeper = DEEPER[inv.id];
  if (!deeper || !withDepths) return base;
  const words = given(DEEPER_SHADOWS[inv.id]);
  return layDepth(base, words ? overlay(deeper, words.steps) : deeper);
}

/**
 * How much of a lesson's own words are in Spanish: the prose a key prints,
 * counted as strings (data/investigations/i18n.js translationCoverage).
 * @param {id: string} inv - The English lesson
 * @returns {{translated: number, total: number}}
 */
export function lessonCoverage(inv) {
  const shadow = SHADOWS[inv.id];
  const { translated, total } = translationCoverage(inv, shadow);
  const deeper = DEEPER[inv.id];
  if (!deeper) return { translated, total };
  const words = DEEPER_SHADOWS[inv.id];
  const extra = translationCoverage(deeper, words?.steps);
  return {
    translated: translated + extra.translated,
    total: total + extra.total,
  };
}
