// =============================================================================
// The instructor bundle's freshness digest has to cover what it claims to
// -----------------------------------------------------------------------------
// `npm run instructors:check` answers "was the committed bundle built from the
// sources on disk?" without the passphrase and without rendering a page, by
// hashing the inputs and comparing against the record beside the ciphertext.
// The whole mechanism rests on one thing: that "the inputs" really is every
// input.
//
// It was not. The covered set was a hand-written list of eight files plus one
// directory, thirty-nine paths, maintained beside an import graph that had
// grown to forty-six modules. Fifteen files the build reads were outside the
// digest, and three of them are where the documents' words come from:
//
//   js/data/instructorContent.js   the prose of every instructor guide
//   js/data/activityTeaching.js    the teaching notes on every activity
//   js/authoring/instructorSchema.js  what a guide is allowed to contain
//
// Rewriting any of them changed every document in the bundle and left the
// recorded digest byte-identical. `instructors:check` reported a stale bundle
// as current, which is the one thing it exists not to do, and it did so
// silently on every branch that touched instructor content.
//
// These tests hold the repaired mechanism to the invariant:
//
//     If a tracked source file can change the plaintext instructor materials,
//     its change must alter the freshness digest.
//
// The first group proves the old list was broken, by reconstructing it and
// showing it does not move. The second proves the new one is complete, by
// running a real build under a module-load hook and comparing what Node
// actually read with what the digest covers.
// =============================================================================

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ENTRY_POINTS,
  digestOfSources,
  sourcePathsFor,
} from '../tools/instructor-freshness.mjs';
import { importClosure } from '../tools/source-closure.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * The covered set as it stood at 16d0f24, frozen on purpose.
 *
 * Kept as a literal rather than read from history so that the proof below is
 * a proof about a specific, stated list rather than about whatever git happens
 * to hold. If the old mechanism is ever proposed again, this is what it did.
 */
const HISTORICAL_SOURCE_FILES = [
  'tools/build-instructor-materials.js',
  'js/pdf.js',
  'js/instructorDocs.js',
  'js/activityDocs.js',
  'js/answerKey.js',
  'js/data/activities.js',
  'js/data/investigations.js',
  'js/i18n/en.teaching.js',
];
const HISTORICAL_SOURCE_DIRS = ['js/data/investigations'];

/** The historical list, expanded against the tree exactly as it was expanded. */
function historicalPaths() {
  const fromDirs = HISTORICAL_SOURCE_DIRS.flatMap(dir =>
    readdirSync(path.join(REPO, dir))
      .filter(name => name.endsWith('.js'))
      .map(name => `${dir}/${name}`)
  );
  return [...HISTORICAL_SOURCE_FILES, ...fromDirs].sort();
}

/** Path to hash, for a set of paths, reading the working tree. */
const hashesFor = paths =>
  Object.fromEntries(
    paths.map(p => [p, sha256(readFileSync(path.join(REPO, p)))])
  );

/**
 * Inputs the build reads that the old list did not name.
 *
 * Four of them, chosen because each reaches the documents by a different
 * route: the guide prose, the activity teaching notes, the activity catalog,
 * and the bridge that assembles an activity's steps.
 */
const REPRESENTATIVE_OMISSIONS = [
  'js/data/instructorContent.js',
  'js/data/activityTeaching.js',
  'js/activities/activityBridge.js',
  'js/activities/activities.js',
];

describe('the digest the old list produced', () => {
  const historical = historicalPaths();
  const current = sourcePathsFor(REPO);

  test('the old list really did leave these inputs out', () => {
    const covered = new Set(historical);
    for (const omitted of REPRESENTATIVE_OMISSIONS) {
      expect(covered.has(omitted)).toBe(false);
    }
  });

  test('and the build really does read them', () => {
    // Not asserted from the list under test: read the import graph directly.
    const reachable = new Set(
      importClosure({ root: REPO, entries: ENTRY_POINTS }).files
    );
    for (const omitted of REPRESENTATIVE_OMISSIONS) {
      expect(reachable.has(omitted)).toBe(true);
    }
  });

  test.each(REPRESENTATIVE_OMISSIONS)(
    'rewriting %s left the old digest identical and moves the new one',
    omitted => {
      // The substitution stands in for any edit to the file: a different set
      // of bytes at the same path. Nothing on disk is touched.
      const substitute = sha256(
        Buffer.concat([
          readFileSync(path.join(REPO, omitted)),
          Buffer.from('\n// an instructor-visible edit\n'),
        ])
      );

      const oldBefore = hashesFor(historical);
      const oldAfter = { ...oldBefore };
      if (omitted in oldAfter) oldAfter[omitted] = substitute;
      expect(digestOfSources(oldAfter)).toBe(digestOfSources(oldBefore));

      const newBefore = hashesFor(current);
      const newAfter = { ...newBefore, [omitted]: substitute };
      expect(digestOfSources(newAfter)).not.toBe(digestOfSources(newBefore));
    }
  );

  test('a lesson module moved the old digest, which is why nobody noticed', () => {
    // The old list was not useless - it covered the lessons, which is what
    // changes most often. That is exactly why fifteen years of edits to the
    // guide prose could sit behind it without anyone seeing a green check and
    // wondering.
    const lesson = 'js/data/investigations/keplers-laws.js';
    expect(historical).toContain(lesson);
    const before = hashesFor(historical);
    const after = { ...before, [lesson]: sha256(Buffer.from('different')) };
    expect(digestOfSources(after)).not.toBe(digestOfSources(before));
  });
});

describe('the digest the derived closure produces', () => {
  const current = sourcePathsFor(REPO);

  test('every representative omission is covered now', () => {
    for (const omitted of REPRESENTATIVE_OMISSIONS) {
      expect(current).toContain(omitted);
    }
  });

  test('it hashes no dependency, no vendored library and no ciphertext', () => {
    // Breadth is not the goal. A digest that covered node_modules, the
    // bundled copy of Three.js or the encrypted output itself would mark the
    // bundle stale on changes that cannot reach a document - and the first
    // time that happened to somebody it would be the last time they believed
    // the check.
    for (const covered of current) {
      expect(covered).not.toMatch(/(^|\/)node_modules\//);
      expect(covered).not.toMatch(/^vendor\//);
      expect(covered).not.toMatch(/^instructors\//);
    }
  });

  test('it does not reach the renderer through a lazy import', () => {
    // js/activities/activityBridge.js dynamically imports js/investigations.js,
    // which reaches js/render.js, js/view3d.js and vendor/three. Following
    // dynamic edges would put all of it in the digest - two hundred and fifty
    // files instead of forty-seven - and a change to how a star is drawn would
    // demand a bundle rebuild with the real passphrase.
    expect(current).not.toContain('js/render.js');
    expect(current).not.toContain('js/ui.js');
    // 80 before the expectations record became its own module (+ its reader and
    // platform/common.js, which the instructor bundle really does read); the
    // failure this guards against is the two-hundred-file closure above. 100
    // after the deeper steps (depthAll.js and its four ext files, Prompt 72).
    // 160 after the Spanish documents (Prompt 79): 24 lesson shadows, 4 deeper
    // shadows, the labels, the flow and the facts the guides read.
    // 274 after the three measurement investigations (Prompt 190, D-R10-67: Carl
    // raised the cap by four on 2026-10-24, for four files, one shared file for
    // each kind of file the three investigations need).
    // 278 after the Jupiter investigation (Prompt 193, D-R10-74: the cap raised
    // by four under Carl's standing words of 2026-10-24, for four files, one
    // satellite-sequence file for each kind of file the lesson needs, because the
    // measurement files are at their line ceilings); pending Carl's ratification.
    // 282 after the two atmosphere investigations (Prompt 200, D-R10-81: the cap
    // raised by four, to 282, on Carl's ruling of 2026-10-25, for four files, one
    // atmosphere-sequence file for each kind of file the lessons need).
    // 284 after the Goldilocks upper depth (Prompt 205 part B, D-R10-205-03: the cap
    // raised by two, to 284, on the coordinator's call under Carl's night delegation of
    // 2026-10-28, for two files, the lesson's deeper steps and their Spanish).
    // 285 after the planetary closeout (Prompt 206, D-R10-206-02): one file, planets-sequence.js, which holds three lessons, their Spanish and their guides; pending the coordinator's approval of the cap.
    // 287 after Plan an Exposure (Prompt 210, D-R10-210-02) over What a Telescope Resolves (Prompt 208): one file, exposure-sequence.js, which holds the lesson, its Spanish and its guide; approved by the coordinator under Carl's delegation of 2026-10-28.
    // 288 after The Saturated Star (Prompt 211, D-R10-211-01) over Plan an Exposure (Prompt 210): one file, saturated-star-sequence.js, which holds the lesson, its Spanish, its deeper steps and its guide; approved by the coordinator.
    // 289 after Why the Period Is Wrong (Prompt 214, D-R10-214-02) over The Saturated Star (Prompt 211): one file, strategy-sequence.js, which holds the lesson, its Spanish, its guide and the three advanced steps of Design the Schedule; approved by the coordinator under Carl's delegation of 2026-10-28.
    // 290 after Counts to Magnitudes (Prompt 212, D-R10-212-01) over Why the Period Is Wrong (Prompt 214): one file, photometric-calibration-sequence.js, which holds the lesson, its Spanish, its deeper steps and its guide; approved by the coordinator under Carl's delegation of 2026-10-28.
    // 291 after Why Two Lines Become One (Prompt 213, D-R10-213-02): one file, spectrograph-sequence.js, which holds the lesson, its Spanish, its guide and its deeper steps; approved by the coordinator under Carl's delegation of 2026-10-28. Stacked after Prompt 212's 289th this becomes 291 only if a second file is added, so the cap is re-checked at the merge of origin/v3.
    // 292 after the survey-design investigations (Prompt 215, D-R10-215-02) over Counts to Magnitudes (Prompt 212) stacked over Prompt 213 (v3 3165d8a4): one file, survey-sequence.js, which holds three lessons, their Spanish, their deeper steps and their guides; approved by the coordinator under Carl's delegation of 2026-10-28. Stacked over Prompt 213 the closure is 291 files and the cap below 292 (re-checked after the merge).
    // 293 after the observing closeout investigations (Prompt 216, D-R10-216-01) over Two Stars Eclipsing (Prompt 217, closure 292): one file, observing-sequence.js, which holds the five lessons, their Spanish, their guides and their deeper steps; approved by the coordinator (cap below 293 on this base; whichever of 216 and 217 merges second restacks to 294).
    // 294 after Weighing the Stars, for Real (Prompt 218, D-R10-218-02): one file, binary-masses-sequence.js, which holds the lesson, its Spanish, its guide and its deeper steps; approved by the coordinator for the one-new-closure-file-per-sequence term.
    // 295 after How Fast Does the Star Spin? and Flares (Prompt 220, D-R10-220-06): one file, stellar-activity-sequence.js, which holds the two lessons, their Spanish, their guides and their deeper steps; approved by the coordinator for the one new closure file (cap below 297 once Prompt 219 has landed).
    // 295 after Two Clusters, Two Ages (Prompt 219, D-R10-219-01): one file, cluster-sequence.js, which holds the lesson, its Spanish, its guide and its deeper steps; approved by the coordinator for the one-new-closure-file-per-sequence term.
    // 297 after How Old Is This White Dwarf? and From Star to Remnant (Prompt 222, D-R10-222-05) over v3 4e9bd42a (closure 296): one file, remnants-sequence.js, which holds the two lessons, their Spanish, their guides and their deeper steps; the one new closure file per sequence (T3), cap below 298, pending the coordinator's approval.
    // 298 after Planet or Not? (Prompt 228, D-R10-228-01): one file, vetting-sequence.js, which holds the lesson, its Spanish, its guide and its deeper steps; the one new closure file per sequence, pending the coordinator's approval of the cap.
    // 299 after The Metallicity Term (Prompt 223, D-R10-223-04) over v3 94ee7cd7 (closure 298): one file, variables-ii-sequence.js, which holds the lesson, its Spanish, its guide and its deeper steps; the one new closure file per sequence (T3), cap below 300, pending the coordinator's approval.
    expect(current.length).toBeLessThan(300);
    // 230 after the four variable-star investigations (Prompt 96): their shadows, deeper shadows and depth files;
    // 246 after the four cosmology investigations (Prompt 91).
    // 258 after the three calibration investigations (Prompt 86).
    // 202 after the three lensing investigations (Prompt 94): their shadows,
    // deeper shadows and guides.
    // 214 after the three stellar-interior investigations (Prompt 95), a count of files, flagged in the PR.
    // 199 at most after the three selection-effects investigations (Prompt
    // 93): their shadows, deeper shadows and guides.
    // 190 after the three galactic investigations (Prompt 92): their shadows,
    // deeper shadows and guides.
    // 175 after the five sky investigations (Prompt 89): their shadows,
    // deeper shadows and guides.
  });

  // The claim the static walk rests on, checked against a real run rather than
  // argued. This is what fails the day a document generator awaits a dynamic
  // import - the one way the static assumption can break.
  //
  // In a child process because the audit registers a module-load hook and Jest
  // refuses `module.register()`: its hooks would attach to the loader running
  // Jest rather than to the sandboxed one the test uses. Running the command
  // has the side benefit that what this asserts about is the command CI runs.
  test('a real build reads exactly the files the digest covers', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/instructor-digest-audit.mjs', '--json'],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    const verdict = JSON.parse(out);
    expect({
      uncovered: verdict.uncovered,
      unloaded: verdict.unloaded,
    }).toEqual({ uncovered: [], unloaded: [] });
    expect(verdict.sound).toBe(true);
    expect(verdict.loaded.length).toBe(verdict.covered.length);
    expect(verdict.loaded.length).toBeGreaterThan(40);
  }, 60000);
});
