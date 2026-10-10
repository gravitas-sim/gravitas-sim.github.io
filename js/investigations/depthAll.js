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
});

/** A lesson with every depth laid in; one without deeper steps as it is. */
export const withAllDepths = inv =>
  DEEPER[inv.id] ? layDepth(inv, DEEPER[inv.id]) : inv;
