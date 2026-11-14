// =============================================================================
// Investigations that were merged into another or retired
// -----------------------------------------------------------------------------
// An investigation id that no longer resolves is not an error a student should
// meet: a link, a saved lesson, an assignment, a course pin or a report may
// still name it. This record says where each retired id went:
//
//   RETIRED_INVESTIGATIONS = {
//     'old-id': { to: 'new-id' | null, release: '3.1', reason: 'why' },
//   }
//
// `to` is the investigation that took its place (null: it was retired with no
// successor), `release` is the first release without it, and `reason` is one
// plain sentence for the instructor's change guide.
//
// It is separate from js/data/sequenceAliases.js, which holds sequence ids
// only and stays the authority for a sequence rename. Like that file it is read
// on demand, when an id fails to resolve, and by the generators, so no lesson
// route pays for it: import it with `import()` from a reader, never statically.
//
// Only the decision of the consolidation gate (Prompt 375, CONTRIBUTING_CONTENT.md)
// adds a row; no investigation has been retired yet.
// =============================================================================

/** @type {Record<string, {to: ?string, release: string, reason: string}>} */
export const RETIRED_INVESTIGATIONS = {};

const HOPS = 16;

/**
 * Where a retired investigation went.
 *
 * Follows a successor that was itself retired later; `to` is null when the id
 * has no successor or the chain does not end at a live id.
 *
 * @param {string} id - The id as it was written
 * @param {?Set<string>} [live] - The investigation ids that exist now
 * @param {object} [record] - The record (the tests pass their own)
 * @returns {?{id: string, to: ?string, release: string, reason: string}} Null
 *   when the id was never retired
 */
export function retiredInvestigation(
  id,
  live = null,
  record = RETIRED_INVESTIGATIONS
) {
  const first = Object.hasOwn(record, id) ? record[id] : null;
  if (!first) return null;
  let to = first.to ?? null;
  for (let i = 0; to && Object.hasOwn(record, to) && i < HOPS; i++)
    to = record[to].to ?? null;
  if (to && (Object.hasOwn(record, to) || (live && !live.has(to)))) to = null;
  return { id, to, release: first.release, reason: first.reason || '' };
}
