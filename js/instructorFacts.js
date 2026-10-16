// =============================================================================
// What the guides say about an investigation that no one writes by hand
// -----------------------------------------------------------------------------
// Prompt 79. Course level, textbook chapter, the mathematics a student is asked
// for and the prerequisites are the Library's own facts about a lesson
// (data/investigations/discovery.js, written by tools/build-investigation-
// manifest.js from the lesson files); the version is the digest the course
// packs pin (course/review.js lessonDigest over the steps' fingerprints), so
// "the guide for version a1b2c3d4" and "the pin on a course" are one number.
// Reading them here rather than copying them is what lets the adopter's guide
// and the curriculum map regenerate from the Library and Teach data instead of
// from prose.
//
// Not imported by any route; the build and the tests read it.
// =============================================================================
import { DISCOVERY } from './data/investigations/discovery.js';
import { lessonDigest, shortHash } from './course/review.js';
import { stepFingerprint } from './investigations/progressBackup.js';
import { depthsOf } from './investigations/depthPure.js';
import { withAllDepths } from './investigations/depthAll.js';

/**
 * The version of an investigation, as a course pin would name it.
 * @param {{steps: Array<{sid: string}>}} inv - The English lesson, core steps
 * @returns {string} A short digest of every step's id and fingerprint
 */
export const lessonVersion = inv =>
  lessonDigest(inv.steps.map(s => [s.sid, shortHash(stepFingerprint(s))]));

/**
 * The facts a guide prints about one investigation.
 * @param {{id: string, steps: object[]}} inv - The English lesson
 * @param {(id: string) => string} titleOf - A lesson's title in the document's language
 * @returns {{courseLevel: ?string, textbook: ?object, mathematics: ?string,
 *   prerequisites: string[], depths: string[], version: string}}
 */
export function lessonFacts(inv, titleOf) {
  const d = DISCOVERY[inv.id] ?? {};
  return {
    courseLevel: d.courseLevel ?? null,
    textbook: d.textbook ?? null,
    mathematics: d.mathematics ?? null,
    prerequisites: (d.prerequisites ?? []).map(titleOf),
    depths: depthsOf(withAllDepths(inv)),
    version: lessonVersion(inv),
  };
}
