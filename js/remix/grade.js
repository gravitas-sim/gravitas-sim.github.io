// =============================================================================
// Grading a submission made on an instructor's version of an investigation
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md). The review page grades a report against the lesson it
// names. A remix's lesson is not in this build, but its questions are the
// original's: a remix may not change an expected value (js/platform/remix.js),
// so the answers are graded with the original's own code and expected values,
// by reference, for every step the report lists that the original has. Nothing
// is read from the pack: the report carries only who the remix came from (the
// original, its version and the digest of its steps), and the report's own
// list of steps says which of the original's questions the student was asked.
//
// Refused, with a reason the page names: the original's steps are no longer
// the ones the remix was made from (its digest moved), which could mean an
// expected value moved too. Steps the instructor added are not graded: they
// have no expected value in this build, and the page lists them as the
// instructor's to read.
//
// Loaded by js/submissionReview.js only for such a report.
// =============================================================================

import { withDepth } from '../investigations/depth.js';
import { originalDigest } from '../platform/remix.js';

/**
 * The lesson to grade a remix's report against.
 *
 * @param {object} backup - The report's progress backup (lesson.pack, steps)
 * @param {?object} raw - The built-in the remix names, as the registry holds it
 * @returns {Promise<{ok: true, lesson: object, added: string[]}|
 *   {ok: false, reason: string}>} The reason is remix (nothing to grade
 *   against) or remixChanged
 */
export async function remixLesson(backup, raw) {
  const k = backup?.lesson?.pack;
  if (!raw || !k?.from || k.from.id !== raw.id) return fail('remix');
  const original = await withDepth(raw, 'en');
  if (originalDigest(original) !== k.from.digest) return fail('remixChanged');
  const byId = new Map(original.steps.map(s => [s.sid, s]));
  const listed = (Array.isArray(backup.steps) ? backup.steps : []).map(
    s => s?.sid
  );
  const steps = listed.filter(sid => byId.has(sid)).map(sid => byId.get(sid));
  if (!steps.length) return fail('remix');
  const lesson = {
    ...original,
    id: backup.lesson.id,
    title: `${k.id} (${k.from.id})`,
    steps,
    depthLaid: true,
  };
  delete lesson.depths;
  return {
    ok: true,
    lesson,
    added: listed.filter(sid => sid && !byId.has(sid)),
  };
}

const fail = reason => ({ ok: false, reason });
