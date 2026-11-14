// =============================================================================
// The rule id/retired: a lesson's `retired` map (js/investigations/revisions.js)
// -----------------------------------------------------------------------------
// Node-side, handed in through tools/authoring/inputs.mjs like cueRules.mjs; the
// Composer route carries none of it. Each entry is a step revised under the
// task-change contract (CONTRIBUTING_CONTENT.md):
//
//   - the key is a well-formed sid the lesson does not have (a retired id is
//     never reused);
//   - `to` is a step the lesson has now, or null (removed); never another
//     retired id, so a reader looks it up directly;
//   - `release` is a version such as 3.1 or 3.1.2;
//   - `was` says what the step asked, in both languages.
// =============================================================================

import { isValidSid } from '../../js/investigations/progressSchema.js';

/**
 * What is wrong with a lesson's retired map.
 *
 * @param {object} lesson - A lesson
 * @returns {Array<string>} One message per problem
 */
export function retiredFindings(lesson) {
  const r = lesson?.retired;
  if (r === undefined) return [];
  if (!r || typeof r !== 'object' || Array.isArray(r))
    return ['`retired` must be an object keyed by the old step id'];
  const live = new Set((lesson.steps || []).map(s => s?.sid));
  const out = [];
  for (const [id, e] of Object.entries(r)) {
    const at = `retired "${id}"`;
    if (!isValidSid(id)) out.push(`${at}: the key is not a usable step id`);
    if (live.has(id)) out.push(`${at}: the lesson has a step with this id`);
    if (!e || typeof e !== 'object') {
      out.push(`${at}: the entry must be an object`);
      continue;
    }
    if (e.to !== null && !live.has(e.to))
      out.push(`${at}: \`to\` must be a step the lesson has, or null`);
    if (!/^\d+\.\d+(\.\d+)?$/.test(e.release ?? ''))
      out.push(`${at}: \`release\` must be a version such as 3.1`);
    for (const l of ['en', 'es'])
      if (typeof e.was?.[l] !== 'string' || !e.was[l].trim())
        out.push(`${at}: \`was.${l}\` says what the step asked`);
  }
  return out;
}
