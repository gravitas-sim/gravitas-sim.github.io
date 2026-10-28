// =============================================================================
// Every lesson's deeper steps at once, for the build, the checks and the tests
// -----------------------------------------------------------------------------
// Not part of ../investigations.js: that barrel is imported by several pages
// (the composer, the course builder), and the deeper steps are lazy content
// that must reach a reader only when they read at a deeper depth.
// =============================================================================

import { layDepth } from './depthPure.js';
import KEPLER_DEEPER from '../data/investigations/depth/keplers-laws.js';
import TRANSIT_DEEPER from '../data/investigations/depth/transit-photometry.js';
import WEIGHING_DEEPER from '../data/investigations/depth/weighing-stars.js';
import COLOR_DEEPER from '../data/investigations/depth/color-and-temperature.js';
import MOTION_DEEPER from '../data/investigations/depth/lines-and-motion.js';
import MADE_OF_DEEPER from '../data/investigations/depth/what-a-spectrum-is-made-of.js';
import THE_SUNS_MOTION_DEEPER from '../data/investigations/depth/the-suns-motion.js';
import THE_ROTATING_DISK_DEEPER from '../data/investigations/depth/the-rotating-disk.js';
import CLUSTER_MEMBERSHIP_DEEPER from '../data/investigations/depth/cluster-membership.js';
import INSIDE_A_STAR_DEEPER from '../data/investigations/depth/inside-a-star.js';
import SCALING_THE_MAIN_SEQUENCE_DEEPER from '../data/investigations/depth/scaling-the-main-sequence.js';
import THE_LIMIT_DEEPER from '../data/investigations/depth/the-limit.js';
import THE_EXPANDING_UNIVERSE_DEEPER from '../data/investigations/depth/the-expanding-universe.js';
import STANDARD_CANDLES_DEEPER from '../data/investigations/depth/standard-candles.js';
import THE_SHAPE_OF_EXPANSION_DEEPER from '../data/investigations/depth/the-shape-of-expansion.js';
import WHERE_GALAXIES_LIVE_DEEPER from '../data/investigations/depth/where-galaxies-live.js';
import WHAT_A_CCD_RECORDS_DEEPER from '../data/investigations/depth/what-a-ccd-records.js';
import SIGNAL_NOISE_AND_EXPOSURE_DEEPER from '../data/investigations/depth/signal-noise-and-exposure.js';
import A_VARIABLE_STAR_FROM_FRAMES_DEEPER from '../data/investigations/depth/a-variable-star-from-frames.js';
import THE_BEAT_OF_A_STAR_DEEPER from '../data/investigations/depth/the-beat-of-a-star.js';
import LEAVITTS_LAW_DEEPER from '../data/investigations/depth/leavitts-law.js';
import THE_FIRST_RUNG_DEEPER from '../data/investigations/depth/the-first-rung.js';
import WHICH_KIND_OF_VARIABLE_DEEPER from '../data/investigations/depth/which-kind-of-variable.js';
import BENDING_LIGHT_DEEPER from '../data/investigations/depth/bending-light.js';
import EINSTEIN_RINGS_AND_ARCS_DEEPER from '../data/investigations/depth/einstein-rings-and-arcs.js';
import A_LENS_PASSING_BY_DEEPER from '../data/investigations/depth/a-lens-passing-by.js';
import WHO_GETS_COUNTED_DEEPER from '../data/investigations/depth/who-gets-counted.js';
import WHY_THE_BRIGHT_ONES_WIN_DEEPER from '../data/investigations/depth/why-the-bright-ones-win.js';
import THE_COMPLETENESS_CURVE_DEEPER from '../data/investigations/depth/the-completeness-curve.js';
import MEASUREMENT_DEEPER from '../data/investigations/depth/measurement-sequence.js';
import SATELLITE_DEEPER from '../data/investigations/depth/satellite-sequence.js';
import ATMOSPHERE_DEEPER from '../data/investigations/depth/atmosphere-sequence.js';
import MISSING_MASS_DEEPER from '../data/investigations/depth/missing-mass.js';
import THE_TURNING_SKY_DEEPER from '../data/investigations/depth/the-turning-sky.js';
import THE_SUN_THROUGH_THE_YEAR_DEEPER from '../data/investigations/depth/the-sun-through-the-year.js';
import PHASES_AND_ECLIPSES_DEEPER from '../data/investigations/depth/phases-and-eclipses.js';
import WANDERERS_ON_THE_SKY_DEEPER from '../data/investigations/depth/wanderers-on-the-sky.js';
import PLAN_A_NIGHT_DEEPER from '../data/investigations/depth/plan-a-night.js';
import GOLDILOCKS_DEEPER from '../data/investigations/depth/goldilocks-question.js';

/** The deeper steps of the lessons that have them, by lesson id (DEPTH.md). */
export const DEEPER = Object.freeze({
  [KEPLER_DEEPER.id]: KEPLER_DEEPER.steps,
  [TRANSIT_DEEPER.id]: TRANSIT_DEEPER.steps,
  [WEIGHING_DEEPER.id]: WEIGHING_DEEPER.steps,
  [MISSING_MASS_DEEPER.id]: MISSING_MASS_DEEPER.steps,
  [COLOR_DEEPER.id]: COLOR_DEEPER.steps,
  [THE_TURNING_SKY_DEEPER.id]: THE_TURNING_SKY_DEEPER.steps,
  [THE_SUN_THROUGH_THE_YEAR_DEEPER.id]: THE_SUN_THROUGH_THE_YEAR_DEEPER.steps,
  [PHASES_AND_ECLIPSES_DEEPER.id]: PHASES_AND_ECLIPSES_DEEPER.steps,
  [WANDERERS_ON_THE_SKY_DEEPER.id]: WANDERERS_ON_THE_SKY_DEEPER.steps,
  [PLAN_A_NIGHT_DEEPER.id]: PLAN_A_NIGHT_DEEPER.steps,
  [GOLDILOCKS_DEEPER.id]: GOLDILOCKS_DEEPER.steps,
  [MOTION_DEEPER.id]: MOTION_DEEPER.steps,
  [MADE_OF_DEEPER.id]: MADE_OF_DEEPER.steps,
  [THE_SUNS_MOTION_DEEPER.id]: THE_SUNS_MOTION_DEEPER.steps,
  [THE_ROTATING_DISK_DEEPER.id]: THE_ROTATING_DISK_DEEPER.steps,
  [CLUSTER_MEMBERSHIP_DEEPER.id]: CLUSTER_MEMBERSHIP_DEEPER.steps,
  [INSIDE_A_STAR_DEEPER.id]: INSIDE_A_STAR_DEEPER.steps,
  [SCALING_THE_MAIN_SEQUENCE_DEEPER.id]: SCALING_THE_MAIN_SEQUENCE_DEEPER.steps,
  [THE_LIMIT_DEEPER.id]: THE_LIMIT_DEEPER.steps,
  [THE_EXPANDING_UNIVERSE_DEEPER.id]: THE_EXPANDING_UNIVERSE_DEEPER.steps,
  [STANDARD_CANDLES_DEEPER.id]: STANDARD_CANDLES_DEEPER.steps,
  [THE_SHAPE_OF_EXPANSION_DEEPER.id]: THE_SHAPE_OF_EXPANSION_DEEPER.steps,
  [WHERE_GALAXIES_LIVE_DEEPER.id]: WHERE_GALAXIES_LIVE_DEEPER.steps,
  [WHAT_A_CCD_RECORDS_DEEPER.id]: WHAT_A_CCD_RECORDS_DEEPER.steps,
  [SIGNAL_NOISE_AND_EXPOSURE_DEEPER.id]: SIGNAL_NOISE_AND_EXPOSURE_DEEPER.steps,
  [A_VARIABLE_STAR_FROM_FRAMES_DEEPER.id]:
    A_VARIABLE_STAR_FROM_FRAMES_DEEPER.steps,
  [THE_BEAT_OF_A_STAR_DEEPER.id]: THE_BEAT_OF_A_STAR_DEEPER.steps,
  [LEAVITTS_LAW_DEEPER.id]: LEAVITTS_LAW_DEEPER.steps,
  [THE_FIRST_RUNG_DEEPER.id]: THE_FIRST_RUNG_DEEPER.steps,
  [WHICH_KIND_OF_VARIABLE_DEEPER.id]: WHICH_KIND_OF_VARIABLE_DEEPER.steps,
  [BENDING_LIGHT_DEEPER.id]: BENDING_LIGHT_DEEPER.steps,
  [EINSTEIN_RINGS_AND_ARCS_DEEPER.id]: EINSTEIN_RINGS_AND_ARCS_DEEPER.steps,
  [A_LENS_PASSING_BY_DEEPER.id]: A_LENS_PASSING_BY_DEEPER.steps,
  [WHO_GETS_COUNTED_DEEPER.id]: WHO_GETS_COUNTED_DEEPER.steps,
  [WHY_THE_BRIGHT_ONES_WIN_DEEPER.id]: WHY_THE_BRIGHT_ONES_WIN_DEEPER.steps,
  [THE_COMPLETENESS_CURVE_DEEPER.id]: THE_COMPLETENESS_CURVE_DEEPER.steps,
  ...MEASUREMENT_DEEPER,
  ...SATELLITE_DEEPER,
  ...ATMOSPHERE_DEEPER,
});

/** A lesson with every depth laid in; one without deeper steps as it is. */
export const withAllDepths = inv =>
  DEEPER[inv.id] ? layDepth(inv, DEEPER[inv.id]) : inv;
