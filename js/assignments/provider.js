// =============================================================================
// Which capability package a lesson comes from today, and at what version
// -----------------------------------------------------------------------------
// What an assignment pins when it is made, and what it is checked against when
// it is opened (./assignment.js packageBinding()). Read from the catalog the
// build generates (js/platform/catalog.generated.js), not from the resolver,
// whose import would install every packaged lesson's loaders on the way.
// =============================================================================

import { OWNERS, PACKAGES } from '../platform/catalog.generated.js';

/**
 * @param {string} lessonId - An investigation id
 * @returns {{id: string, version: string}|null} Null for a lesson built into
 *   the core rather than provided by a package
 */
export function lessonProvider(lessonId) {
  const id = OWNERS[`investigations:${lessonId}`];
  return id && PACKAGES[id] ? { id, version: PACKAGES[id][0] } : null;
}
