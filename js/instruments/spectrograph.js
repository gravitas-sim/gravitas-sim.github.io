// =============================================================================
// The spectrograph panels' telescope, from the instrument library (Prompt 213)
// -----------------------------------------------------------------------------
// Prompt 209's library lists no spectrograph and nothing is typed from memory: a
// spectrograph's resolving power, slit, throughput and dispersion are the panel's
// (teaching values, labelled). What the library does state is the telescope in front
// of it, its collecting area and where that number came from; this reads those and
// keeps the library's rule that a value says its source.
//
// Pure: no DOM. A lazy module: the table import makes it so.
// =============================================================================

import { getFacility } from './index.js';
import { areaOf } from './exposure.js';

/** The collecting area of a facility's telescope, its name and the table's source for the aperture. */
export function telescopeOf(id) {
  const f = getFacility(id);
  const a = areaOf(id);
  return { id, name: f.name, areaM2: a.areaM2, from: a.from };
}
