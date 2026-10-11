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
import BENDING_LIGHT_DEEPER from '../data/investigations/depth/bending-light.js';
import EINSTEIN_RINGS_AND_ARCS_DEEPER from '../data/investigations/depth/einstein-rings-and-arcs.js';
import A_LENS_PASSING_BY_DEEPER from '../data/investigations/depth/a-lens-passing-by.js';
import WHO_GETS_COUNTED_DEEPER from '../data/investigations/depth/who-gets-counted.js';
import WHY_THE_BRIGHT_ONES_WIN_DEEPER from '../data/investigations/depth/why-the-bright-ones-win.js';
import THE_COMPLETENESS_CURVE_DEEPER from '../data/investigations/depth/the-completeness-curve.js';
import MISSING_MASS_DEEPER from '../data/investigations/depth/missing-mass.js';
import THE_TURNING_SKY_DEEPER from '../data/investigations/depth/the-turning-sky.js';
import THE_SUN_THROUGH_THE_YEAR_DEEPER from '../data/investigations/depth/the-sun-through-the-year.js';
import PHASES_AND_ECLIPSES_DEEPER from '../data/investigations/depth/phases-and-eclipses.js';
import WANDERERS_ON_THE_SKY_DEEPER from '../data/investigations/depth/wanderers-on-the-sky.js';
import PLAN_A_NIGHT_DEEPER from '../data/investigations/depth/plan-a-night.js';

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
  [MOTION_DEEPER.id]: MOTION_DEEPER.steps,
  [MADE_OF_DEEPER.id]: MADE_OF_DEEPER.steps,
  [THE_SUNS_MOTION_DEEPER.id]: THE_SUNS_MOTION_DEEPER.steps,
  [THE_ROTATING_DISK_DEEPER.id]: THE_ROTATING_DISK_DEEPER.steps,
  [CLUSTER_MEMBERSHIP_DEEPER.id]: CLUSTER_MEMBERSHIP_DEEPER.steps,
  [INSIDE_A_STAR_DEEPER.id]: INSIDE_A_STAR_DEEPER.steps,
  [SCALING_THE_MAIN_SEQUENCE_DEEPER.id]: SCALING_THE_MAIN_SEQUENCE_DEEPER.steps,
  [THE_LIMIT_DEEPER.id]: THE_LIMIT_DEEPER.steps,
  [BENDING_LIGHT_DEEPER.id]: BENDING_LIGHT_DEEPER.steps,
  [EINSTEIN_RINGS_AND_ARCS_DEEPER.id]: EINSTEIN_RINGS_AND_ARCS_DEEPER.steps,
  [A_LENS_PASSING_BY_DEEPER.id]: A_LENS_PASSING_BY_DEEPER.steps,
  [WHO_GETS_COUNTED_DEEPER.id]: WHO_GETS_COUNTED_DEEPER.steps,
  [WHY_THE_BRIGHT_ONES_WIN_DEEPER.id]: WHY_THE_BRIGHT_ONES_WIN_DEEPER.steps,
  [THE_COMPLETENESS_CURVE_DEEPER.id]: THE_COMPLETENESS_CURVE_DEEPER.steps,
});

/** A lesson with every depth laid in; one without deeper steps as it is. */
export const withAllDepths = inv =>
  DEEPER[inv.id] ? layDepth(inv, DEEPER[inv.id]) : inv;
