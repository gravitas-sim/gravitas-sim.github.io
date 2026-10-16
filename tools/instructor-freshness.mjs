// =============================================================================
// Was the committed instructor bundle built from these sources?
// -----------------------------------------------------------------------------
// The ciphertext cannot answer that question about itself. Every build derives
// a fresh salt and IV, so two encryptions of identical material differ in every
// byte; `git status` reports a change whenever the builder runs and the change
// carries no information. Re-encrypting and comparing would need the
// passphrase, which CI does not have and must not have.
//
// So the answer comes from a digest of the inputs, written in the clear beside
// the ciphertext. Anyone can hash the same files and compare: no secret, no
// decryption, milliseconds.
//
// Its own module, separate from the builder, because two things ask the
// question and only one of them wants the fifty modules of lesson data that
// rendering needs:
//
//   tools/build-instructor-materials.js --check   the development answer
//   tools/verify-release.mjs                      the answer the deploy obeys
//
// The second is the one that matters. verify-release.mjs already refused a
// tree whose bundle was built with a throwaway CI key; it had nothing to say
// about a bundle that is real and six weeks out of date, which is the failure
// that actually ships wrong answer keys to a classroom.
// =============================================================================

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { importClosure } from './source-closure.mjs';

/**
 * Where the dependency walk starts.
 *
 * One entry point covers everything: every document the bundle can contain -
 * the adopters guide, the curriculum map, each activity guide and worksheet,
 * each instructor guide and answer key - is rendered from a function
 * tools/build-instructor-materials.js imports. There is no second program that
 * writes a page of it.
 */
export const ENTRY_POINTS = ['tools/build-instructor-materials.js'];

/** Where the record of what the bundle was built from lives. */
export const MANIFEST_PATH = 'instructors/materials.manifest.json';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * Every input that decides what the materials say, for a tree.
 *
 * @param {string} root - Repository root
 * @returns {string[]} Repo-relative paths, sorted
 */
export function sourcePathsFor(root) {
  return importClosure({ root, entries: ENTRY_POINTS }).files;
}

/**
 * One scalar from a map of input path to input hash.
 *
 * Pure, and exported, so a test can ask what a different set of inputs would
 * have produced without touching the working tree. A test that reimplemented
 * this arithmetic could agree with itself while disagreeing with the tool that
 * writes the manifest.
 *
 * @param {Record<string, string>} sources - Repo-relative path to sha256
 * @returns {string} The digest recorded in the manifest
 */
export function digestOfSources(sources) {
  return sha256(
    Object.keys(sources)
      .sort()
      .map(rel => `${rel}:${sources[rel]}`)
      .join('\n')
  );
}

/**
 * The digest, and each input's own hash, for a tree.
 *
 * The path is hashed with the bytes, so moving a lesson to a new file is a
 * change even when its text is identical.
 *
 * @param {string} root - Repository root
 * @returns {{digest: string, files: number, sources: Record<string, string>}} The record
 */
export function sourceDigestFor(root) {
  const paths = sourcePathsFor(root);
  const sources = {};
  for (const rel of paths) {
    const full = path.join(root, rel);
    if (!existsSync(full)) {
      throw new Error(`Instructor source is missing: ${rel}`);
    }
    sources[rel] = sha256(readFileSync(full));
  }
  return { digest: digestOfSources(sources), files: paths.length, sources };
}

/**
 * What moved between the recorded inputs and the ones on disk, in words.
 *
 * A scalar that does not match says the bundle is stale and nothing else. The
 * per-file map lets the failure name the file, which is the difference between
 * a gate somebody acts on and a gate somebody reruns hoping it was flaky.
 *
 * @param {Record<string, string>} recorded - Path to hash, from the manifest
 * @param {Record<string, string>} current - Path to hash, from the tree
 * @returns {string[]} One line per difference, empty when the map is absent
 */
export function describeDrift(recorded, current) {
  if (!recorded || typeof recorded !== 'object') return [];
  const lines = [];
  for (const file of Object.keys(current)) {
    if (!(file in recorded)) lines.push(`  new input   ${file}`);
    else if (recorded[file] !== current[file]) {
      lines.push(`  changed     ${file}`);
    }
  }
  for (const file of Object.keys(recorded)) {
    if (!(file in current)) lines.push(`  no longer an input  ${file}`);
  }
  return lines.sort();
}

/**
 * Whether a tree's committed bundle was built from the sources beside it.
 *
 * Returns a verdict rather than exiting, so the deploy gate can fold it in with
 * everything else it is refusing for.
 *
 * @param {string} root - Repository root
 * @returns {{ok: boolean, problems: string[], digest: string, files: number,
 *   recorded: object|null}} The verdict
 */
export function checkFreshnessAt(root) {
  const manifest = path.join(root, MANIFEST_PATH);
  const { digest, files, sources } = sourceDigestFor(root);
  if (!existsSync(manifest)) {
    return {
      ok: false,
      digest,
      files,
      recorded: null,
      problems: [
        `No ${MANIFEST_PATH}. Run \`npm run build:instructors\` to build the ` +
          'bundle and write the record of what it was built from.',
      ],
    };
  }
  const recorded = JSON.parse(readFileSync(manifest, 'utf8'));
  if (recorded.sourceDigest === digest) {
    return { ok: true, problems: [], digest, files, recorded };
  }
  const drift = describeDrift(recorded.sources, sources);
  return {
    ok: false,
    digest,
    files,
    recorded,
    problems: [
      [
        'The instructor bundle is stale.',
        `  recorded: ${recorded.sourceDigest}`,
        `  on disk:  ${digest}  (${files} source files)`,
        ...(drift.length
          ? ['', 'What moved:', ...drift]
          : [
              '',
              'The manifest predates the per-file record, so which input moved',
              'cannot be named. The next rebuild writes one.',
            ]),
        '',
        'Instructional content changed after the bundle was built. Rebuild it',
        'with `npm run build:instructors` - which needs the real passphrase -',
        'and commit the bundle and the manifest together.',
      ].join('\n'),
    ],
  };
}
