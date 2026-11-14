import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import path from 'node:path';
import { REPO, V3_COMMIT, OLD_COMMIT, archiveOld, run } from './harness.js';
import { EDITS, editedLesson } from './kinds/_lesson.mjs';
import {
  readProgress,
  writeProgress,
} from '../../js/investigations/progressSchema.js';

// =============================================================================
// The task-change contract against the archived readers
// -----------------------------------------------------------------------------
// A record is built by an old build (2.0.0, and the 3.0 tag) from the lesson as
// it shipped, and read by the current code under the lesson after an author
// reworded, revised, inserted into or removed a step. Then the current writer's
// record is read by each old build. tests/compat/revisions/records.mjs is the
// spec; _lesson.mjs has the four edits.
// =============================================================================

const DIR = path.join(REPO, 'tests', 'compat', 'revisions');
const read = (tree, record, doc, edit) =>
  run(
    tree,
    'records',
    'read',
    { record, doc, lesson: editedLesson(edit) },
    DIR
  );

const BUILDS = [
  ['2.0.0', OLD_COMMIT],
  ['3.0', V3_COMMIT],
];

describe.each(BUILDS)('records made by %s, read now', (name, commit) => {
  let old;
  let made;
  beforeAll(() => {
    old = archiveOld(commit);
    const m = run(old.tree, 'records', 'make', undefined, DIR);
    expect(m.ok).toBe(true);
    made = m.value;
  });
  afterAll(() => old?.cleanup());
  const now = (record, doc, edit) => {
    const r = read(REPO, record, doc, edit);
    expect(r.ok).toBe(true);
    return r.value;
  };

  test('progress: reword and insert change nothing; revise and remove keep the answer as an earlier version', () => {
    const base = now('progress', made.progress, 'none');
    expect(now('progress', made.progress, 'reword')).toEqual(base);
    expect(now('progress', made.progress, 'insert').responses).toEqual(
      base.responses
    );
    const revised = now('progress', made.progress, 'revise');
    expect(revised.responses['tides:guess']).toBeUndefined();
    expect(revised.earlier).toEqual(['tides:guess']);
    const removed = now('progress', made.progress, 'remove');
    expect(removed.earlier).toEqual(['tides:measure:d']);
    expect(removed.responses['tides:measure:d']).toBeUndefined();
  });

  test('assignment link: a revised or removed step reports why, and a reword is silent', () => {
    const b = edit => now('assignment', made.fragment, edit);
    const ok = [
      'build-a:present',
      'guess:present',
      'measure:present',
      'ask:present',
    ];
    expect(b('reword').status).toEqual(ok);
    expect(b('insert').status).toEqual(ok);
    expect(b('revise').status).toEqual([
      'build-a:present',
      'guess:missing',
      'measure:present',
      'ask:present',
    ]);
    expect(b('revise').retired).toEqual(['guess-2']);
    expect(b('remove').status).toContain('measure:missing');
    expect(b('remove').retired).toEqual([null]);
  });

  test('submission token: an earlier answer is marked and never marked against the new step', () => {
    const t = edit => now('token', made.token, edit);
    expect(t('reword').stale).toEqual([]);
    expect(t('insert').stale).toEqual([]);
    expect(t('revise').stale).toEqual(['guess']);
    expect(t('revise').earlier).toEqual(['guess']);
    expect(t('revise').answered).not.toContain('guess-2');
  });

  test('course pin: a revised assigned step names its successor', () => {
    const p = edit => now('pin', made.pin, edit);
    expect(p('reword')).toEqual({ missing: [], changed: [], revised: [] });
    expect(p('insert')).toEqual({ missing: [], changed: [], revised: [] });
    expect(p('revise').revised).toEqual(['guess>guess-2']);
    expect(p('remove').revised).toEqual(['measure>null']);
  });
});

describe.each(BUILDS)(
  'what %s makes of a record the current writer made',
  (name, commit) => {
    let old;
    beforeAll(() => {
      old = archiveOld(commit);
    });
    afterAll(() => old?.cleanup());

    test.each(['revise', 'remove'])(
      'progress after a %s: the old reader reads what it read before, and refuses nothing',
      edit => {
        const m = run(old.tree, 'records', 'make', undefined, DIR).value;
        const lesson = editedLesson(edit);
        const r = readProgress(m.progress, lesson);
        const rewritten = writeProgress({ lesson, ...r });
        const before = read(old.tree, 'progress', m.progress, edit);
        const after = read(old.tree, 'progress', rewritten, edit);
        expect(after.ok).toBe(true);
        expect(after.value).toEqual(before.value);
      }
    );
  }
);

describe('the edits', () => {
  test('are the four the author rule names', () => {
    expect(EDITS).toEqual(['reword', 'revise', 'insert', 'remove']);
  });
});
