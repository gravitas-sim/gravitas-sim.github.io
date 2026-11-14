// =============================================================================
// Course items that name something revised or retired (lazy)
// -----------------------------------------------------------------------------
// Loaded by ./api.js only when a course names an investigation the build no
// longer has: js/data/retiredInvestigations.js says where it went.
// =============================================================================

import { retiredInvestigation } from '../data/retiredInvestigations.js';

/**
 * Where each missing investigation went; a live successor's facts are loaded
 * into `lessons` too, so a reviewed upgrade can follow it.
 *
 * @returns {Promise<Map<string, object>>} By the id the course names
 */
export async function retiredFacts(ids, have, lessons, known, load, factsOf) {
  const out = new Map();
  for (const id of ids) {
    const r = have.has(id) ? null : retiredInvestigation(id, have);
    if (!r) continue;
    out.set(id, r);
    if (r.to && !lessons.has(r.to)) {
      if (!known.has(r.to)) known.set(r.to, factsOf(await load(r.to)));
      lessons.set(r.to, known.get(r.to));
    }
  }
  return out;
}
