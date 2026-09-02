// =============================================================================
// Pure catalogue helpers
// -----------------------------------------------------------------------------
// Two functions that are facts about a lesson and about catalogue order, and
// nothing else. They live apart from both doors into the lessons because both
// doors want them and neither should have to import the other:
//
//   ./registry.js       binds them to MANIFEST, for the running application
//   ../investigations.js  binds them to INVESTIGATIONS, for the build and tests
//
// One implementation, two bindings. The alternative - a copy on each side -
// would be two definitions of "second of three" that could disagree.
//
// This module imports nothing, which is also what lets the manifest generator
// use it while the manifest it generates does not yet exist.
// =============================================================================

/**
 * Steps in an investigation that ask the student for something.
 * @param {Object} inv - Investigation
 * @returns {Array} Steps carrying student input
 */
export const gradedSteps = inv =>
  (inv?.steps || []).filter(s =>
    ['predict', 'measure', 'question'].includes(s.type)
  );

/**
 * Where a lesson sits in its series, if it belongs to one.
 *
 * Derived rather than stored: the three exoplanet lessons are not adjacent in
 * the catalogue, and writing "2 of 3" into the data would go stale the moment a
 * fourth was added or the order changed.
 *
 * Members are matched by id rather than by object identity, so this answers the
 * same for a manifest entry as for the lesson it describes. The browser holds
 * the former and the open panel holds the latter, and "2 of 3" has to be the
 * same sentence in both.
 *
 * @param {Array<Object>} list - The catalogue, in order
 * @param {Object} inv - Investigation or manifest entry
 * @returns {{label: string, index: number, of: number}|null} Position, or null
 */
export function positionIn(list, inv) {
  if (!inv?.series) return null;
  const siblings = list.filter(m => m.series === inv.series);
  const index = siblings.findIndex(m => m.id === inv.id);
  if (index < 0) return null;
  return { label: inv.series, index: index + 1, of: siblings.length };
}
