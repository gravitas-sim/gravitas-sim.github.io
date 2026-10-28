// =============================================================================
// The observing-window planner, reading a facility's site from the library
// -----------------------------------------------------------------------------
// js/observingWindow.js takes a site as numbers; this takes a facility's id and
// reads the cited latitude and longitude from the instrument library. The
// planner itself is unchanged: the result of observingNightAt(id, ...) is
// exactly observingNight({ site: siteOf(id), ... }).
//
// Pure: no DOM, no clock (the planner takes a Julian Date, never a reading).
// =============================================================================

import { observingNight, observingRun } from '../observingWindow.js';
import { siteOf } from './index.js';

/** One night's window for a target from a facility's site. */
export const observingNightAt = (id, args) =>
  observingNight({ ...args, site: siteOf(id) });

/** A run of nights from a facility's site. */
export const observingRunAt = (id, args) =>
  observingRun({ ...args, site: siteOf(id) });
