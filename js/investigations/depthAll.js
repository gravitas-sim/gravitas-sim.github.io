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
import MISSING_MASS_DEEPER from '../data/investigations/depth/missing-mass.js';

/** The deeper steps of the lessons that have them, by lesson id (DEPTH.md). */
export const DEEPER = Object.freeze({
  [KEPLER_DEEPER.id]: KEPLER_DEEPER.steps,
  [TRANSIT_DEEPER.id]: TRANSIT_DEEPER.steps,
  [WEIGHING_DEEPER.id]: WEIGHING_DEEPER.steps,
  [MISSING_MASS_DEEPER.id]: MISSING_MASS_DEEPER.steps,
  [COLOR_DEEPER.id]: COLOR_DEEPER.steps,
  [MOTION_DEEPER.id]: MOTION_DEEPER.steps,
  [MADE_OF_DEEPER.id]: MADE_OF_DEEPER.steps,
});

/** A lesson with every depth laid in; one without deeper steps as it is. */
export const withAllDepths = inv =>
  DEEPER[inv.id] ? layDepth(inv, DEEPER[inv.id]) : inv;
