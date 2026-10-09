// =============================================================================
// An investigation pack inside a course item
// -----------------------------------------------------------------------------
// Prompt 78 (c), REMIX.md. A course item of kind `pack` carries the pack as
// its link (the fragment the Composer's Publish makes, js/composer/packLink.js):
// a remix as its difference from the faithful copy of its original, a pack
// written from scratch whole. Opening one here is what the application does
// when a student follows it: read the fragment, lay a difference over the
// original, judge the pack by the format and, for a remix, by the remix rules,
// compile it. What the review compares a pin with is the digest of that
// compiled lesson's steps (./api.js lessonFacts), so a pack that has moved, or
// whose original has, no longer matches. The expected values are never read
// from the pack here: a remix's questions are the original's, by reference.
//
// Lazy: only a course with a pack item loads this and what it reaches (the
// lesson registry and the composer's checks).
// =============================================================================

import { readPackFragment } from '../composer/packLink.js';
import { checkInvestigationPack } from '../composer/api.js';
import { remixBuiltin } from '../composer/remixApi.js';
import { applyDelta, remixLessonId } from '../platform/remix.js';

/**
 * The pack a link holds, whole, or why not.
 * @param {string} link - A fragment without its '#'
 * @returns {Promise<{ok: true, pack: object}|{ok: false, reason: string,
 *   message?: string}>}
 */
export async function packOfLink(link) {
  const read = await readPackFragment(`#${link}`);
  if (!read.ok) return { ok: false, reason: read.reason };
  // A package installed in one browser is not a course's to name.
  if (read.installed) return { ok: false, reason: 'installed' };
  if (read.pack) return { ok: true, pack: read.pack };
  const from = String(read.delta.from?.id);
  const base = await remixBuiltin(from, { id: 'base' });
  if (!base) return { ok: false, reason: 'noOriginal', message: from };
  const laid = applyDelta(read.delta, base.pack);
  return laid.ok
    ? { ok: true, pack: laid.pack }
    : { ok: false, reason: 'delta', message: `${laid.path} ${laid.message}` };
}

/**
 * The investigation a link holds, as the engine would run it.
 *
 * @param {string} link - A fragment without its '#'
 * @returns {Promise<{ok: true, lesson: object, pack: object}|
 *   {ok: false, reason: string, message?: string}>} The lesson has the id
 *   progress is kept under (`rx-<id>-<version>`)
 */
export async function openedLink(link) {
  let got;
  try {
    got = await packOfLink(link);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  if (!got.ok) return got;
  const { pack } = got;
  const checked = await checkInvestigationPack(pack);
  if (checked.errors.length)
    return {
      ok: false,
      reason: 'invalid',
      message: `${checked.errors[0].path} ${checked.errors[0].message}`,
    };
  const bad = checked.findings.find(f => f.level === 'error');
  if (bad) return { ok: false, reason: 'invalid', message: bad.message };
  const lesson = { ...checked.compiled.lesson, id: remixLessonId(pack) };
  return { ok: true, lesson, pack, compiled: checked.compiled };
}

/** An item's investigation: its link's, if the link is the pack the item names. */
export async function openedPack(item) {
  const got = await openedLink(item.link);
  if (
    got.ok &&
    (got.pack.id !== item.pack || got.pack.version !== item.version)
  )
    return {
      ok: false,
      reason: 'identity',
      message: `${got.pack.id} ${got.pack.version}`,
    };
  return got;
}
