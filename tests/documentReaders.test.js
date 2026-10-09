import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// =============================================================================
// Every reader of a saved document goes through the shared rules, or says why
// -----------------------------------------------------------------------------
// Roadmap II Prompts 61 and 67 put two rules on every reader of a document a
// student or an instructor opens: a file, a link or a copy in storage is
// parsed as plain, bounded data (parseDocument, or plainDataProblem after a
// parse), and a version it cannot read is refused by readVersioned, not by a
// block of its own. Both were repaired reader by reader (R-F, R-H) and both
// drifted back whenever a new reader was written, because nothing failed.
//
// This reads js/ and fails when a reader bypasses either rule without being
// named here. It is the smallest structural guard: a table of the exceptions,
// each with its reason, that can only shrink. A reader moved onto the rule
// must leave the table (the second half of each test), so the table cannot go
// stale either. The `route room` entries are the ones R-B3 (spare requests on
// the studio, composer, course-builder, experiments and lab3d routes) unblocks:
// the shared helpers are 6 KB and one request on a route that does not load
// them yet, and those ceilings are full.
// =============================================================================

const JS = 'js';
const files = (dir => {
  const out = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (p !== path.join(JS, 'i18n')) walk(p);
      } else if (p.endsWith('.js')) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
})(JS);

/** The lines of a source that are code: no comment-only line. */
const code = text =>
  text
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
const sources = new Map(files.map(f => [f, code(readFileSync(f, 'utf8'))]));
const count = (src, re) => (src.match(re) || []).length;

// ---------------------------------------------------------------------------
// 1. Plain, bounded data
// ---------------------------------------------------------------------------

/** A JSON.parse that is not the clone idiom. */
const PARSE = /JSON\.parse\((?!JSON\.stringify\()/g;

const OWN = 'its own copy in localStorage, written by this build';
/**
 * file: [JSON.parse calls, guard, reason]. A guard of parseDocument or
 * plainDataProblem must appear in the file; 'none' needs a reason.
 */
const PARSES = {
  // The guards themselves.
  'js/platform/common.js': [1, 'definition', 'parseDocument'],
  'js/shareState.js': [1, 'definition', 'parseDocument, the start-up copy'],
  // Guarded readers that parse here (the others call parseDocument).
  'js/observatory/import.js': [1, 'plainDataProblem'],
  'js/experiments/exports.js': [2, 'plainDataProblem'],
  'js/submission/results.js': [1, 'plainDataProblem'],
  'js/measure/pipeline.js': [2, 'plainDataProblem'],
  // Not a document anyone opens.
  'js/lecture.js': [1, 'none', OWN],
  'js/ui.js': [2, 'none', OWN],
  'js/controls.js': [1, 'none', OWN],
  'js/welcome.js': [1, 'none', OWN],
  'js/evaluationKit.js': [1, 'none', OWN],
  'js/investigations/next.js': [1, 'none', OWN],
  'js/myWork/made.js': [1, 'none', OWN + '; readMade checks it'],
  'js/library/progress.js': [1, 'none', OWN],
  'js/platform/resolver.js': [1, 'none', OWN],
  'js/authoring/preview.js': [1, 'none', OWN],
  'js/experimentsPage.js': [
    2,
    'none',
    OWN + ' (one), and the check box, route room (one)',
  ],
  'js/storage/index.js': [
    3,
    'none',
    'the storage layer, behind its own migrate',
  ],
  'js/storage/local.js': [1, 'none', 'the storage layer'],
  'js/experiments/store.js': [2, 'none', OWN + '; migrate checks it'],
  'js/investigations.js': [2, 'none', OWN + ' (progress, twice)'],
  'js/studio/model.js': [
    5,
    'none',
    'the editor re-reading its own JSON string',
  ],
  'js/studioPage.js': [1, 'none', 'a setting value the form wrote'],
  'js/myWorkPage.js': [
    2,
    'none',
    'a dataset attribute the page wrote (one); a backup file, route room (one)',
  ],
  'js/observatory/measurePanel.js': [1, 'none', 'its own serialisation'],
  'js/instructorPortal.js': [1, 'none', 'decrypted with the passphrase first'],
  // A file a student opens, not yet behind parseDocument: route room.
  'js/composerPage.js': [2, 'none', 'route room: a file and the raw box'],
  'js/lab3dPage.js': [1, 'none', 'route room: a system file'],
  'js/lab3dLab.js': [1, 'none', 'route room: a system file'],
  'js/experiments/analysisPanel.js': [2, 'none', 'route room: a result file'],
  'js/catalog/install.js': [
    5,
    'none',
    'route room: an archive already checked against its digest and validated (three, one of them with a reviver that refuses a prototype key); a record written after install (one)',
  ],
  'js/catalog/installed.js': [1, 'none', 'a record written after install'],
  'js/catalogPage.js': [1, 'none', 'a record written after install'],
};

describe('a saved document is parsed as plain, bounded data', () => {
  test('every JSON.parse is guarded, or named with its reason', () => {
    const found = {};
    for (const [file, src] of sources) {
      const n = count(src, PARSE);
      if (n) found[file] = n;
    }
    // A scan that found nothing would pass everything.
    expect(Object.keys(found).length).toBeGreaterThan(25);
    expect(found).toEqual(
      Object.fromEntries(Object.entries(PARSES).map(([file, [n]]) => [file, n]))
    );
  });

  test('a guarded reader names its guard, and an unguarded one its reason', () => {
    for (const [file, [, guard, why]] of Object.entries(PARSES)) {
      if (guard === 'definition') continue;
      if (guard === 'none')
        expect([file, typeof why]).toEqual([file, 'string']);
      else
        expect([file, sources.get(file).includes(guard)]).toEqual([file, true]);
    }
  });

  test('the readers the recheck asked about hold the guard', () => {
    const uses = (file, name) => sources.get(file).includes(name);
    // Assignments (a file or a link), the course page, the system builder,
    // the studio, the course home, the notebook and the lesson backup.
    for (const file of [
      'js/assignments/assignmentLink.js',
      'js/coursePage.js',
      'js/systemBuilder.js',
      'js/studioPage.js',
      'js/courseHome.js',
      'js/notebookPanel.js',
      'js/notebook/store.js',
      'js/investigations.js',
      'js/submissionReview.js',
    ])
      expect([file, uses(file, 'parseDocument(')]).toEqual([file, true]);
  });
});

// ---------------------------------------------------------------------------
// 2. One refusal for a version a reader cannot read
// ---------------------------------------------------------------------------

/** A hand-written comparison of a document's version with the newest it reads. */
const NEWER = /[^=-]>\s*[A-Z_]*(?:VERSION|SCHEMA|maxVersion)\b/g;

/**
 * Readers that still refuse a newer version in a block of their own. Each moves
 * onto readVersioned when its route can pay for js/platform/common.js (6 KB and
 * a request where it is not already loaded), and then leaves this table.
 */
const OWN_REFUSAL = {
  'js/coursePage.js':
    'route room (course-builder); a missing version still opens',
  'js/shareState.js': 'link prefixes, on every start-up path, not documents',
  'js/systemSpec.js': 'route room (studio)',
  'js/investigations/progressBackup.js':
    'route room (every lesson); v1 is read as it is, which needs a migration entry',
  'js/myWork/made.js': 'a record with version 0 is still read',
  'js/investigations/progressSchema.js':
    'keeps the payload and says so, as notes',
  'js/assignments/assignment.js': 'route room (every lesson, course home)',
  'js/lab3d/state.js': 'route room (lab3d, lab3d-lab)',
  'js/experiments/exports.js': 'two ids for one format (the retired name)',
  'js/experiments/experimentManifest.js':
    'two ids for one format; notes the retired id',
  'js/experiments/store.js': 'a record with no version is version 1',
  'js/platform/investigation.js': 'route room (composer)',
  'js/platform/scenario.js': 'route room (studio)',
  'js/notebook/store.js': 'a store with no version is read',
  'js/notebook/entry.js': 'a snapshot with no version is read',
};

describe('a version a reader cannot read is refused by readVersioned', () => {
  test('a hand-written refusal is in the table, and the table has no stale row', () => {
    const found = [...sources]
      .filter(([, src]) => count(src, NEWER))
      .map(([file]) => file)
      .sort();
    expect(found).toEqual(Object.keys(OWN_REFUSAL).sort());
  });

  test('the readers moved onto it still call it', () => {
    for (const file of [
      'js/notebook/notebook.js',
      'js/submission/submissionToken.js',
      'js/measure/pipeline.js',
    ])
      expect([file, sources.get(file).includes('readVersioned(')]).toEqual([
        file,
        true,
      ]);
  });
});
