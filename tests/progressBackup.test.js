import { describe, test, expect } from '@jest/globals';
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  backupFilename,
  buildBackup,
  restoreProgress,
  stepFingerprint,
  validateBackup,
} from '../js/investigations/progressBackup.js';

// =============================================================================
// Progress backups
// -----------------------------------------------------------------------------
// Progress lives in localStorage, which can refuse to write - private browsing,
// a full disk, a lab machine that clears site data - and a student who loses
// forty minutes of The Missing Mass to any of those has lost real work.
//
// The interesting part is not the round trip, which is easy. It is what happens
// when the lesson has changed since the backup was made, which over a term is
// the ordinary case: responses are keyed by *position*, and position is not
// identity.
// =============================================================================

/** A lesson whose steps carry the stable ids identity now depends on. */
const lesson = (...steps) => ({
  id: 'tides',
  title: 'Tides',
  steps: steps.map((s, i) => ({ sid: s.sid ?? `s${i}`, ...s })),
});

const read = (title, sid) => ({ sid, type: 'read', title });
const choice = (title, options = 4, sid) => ({
  sid,
  type: 'question',
  kind: 'choice',
  title,
  options: Array.from({ length: options }, (_, i) => `option ${i}`),
});
const measure = (title, ids, sid) => ({
  sid,
  type: 'measure',
  title,
  fields: ids.map(id => ({ id })),
});
const explore = (title, toolId, sid) => ({
  sid,
  type: 'explore',
  title,
  tool: { id: toolId },
});

const LESSON = lesson(
  read('Opening', 'opening'),
  measure('Four distances', ['d1', 't1'], 'four-distances'),
  choice('Which one', 3, 'which-one'),
  explore('Stretch against grip', 'tide-balance', 'stretch')
);

const progressFor = () => ({
  responses: {
    'tides:four-distances:d1': '2',
    'tides:four-distances:t1': '0.13',
    'tides:which-one': 1,
    'tides:stretch:shown': true,
  },
  attempts: { 'tides:which-one': 2 },
  visited: ['opening', 'four-distances', 'which-one', 'stretch'],
  stepSid: 'which-one',
  startedAt: '2026-09-01T10:00:00.000Z',
});

const backupOf = (les = LESSON) =>
  buildBackup({ lesson: les, ...progressFor(), studentName: 'A Student' });

describe('the fingerprint is now a cross-check, not an identity', () => {
  // Identity is the step's `sid`. The fingerprint survives only so a restore
  // from a pre-sid backup can notice that the lesson changed under a position,
  // and say so, instead of hunting for a step that merely looks the same.
  // tests/progressIdentity.test.js covers that behaviour end to end.

  test('it ignores the title, so it survives a translation', () => {
    const english = measure('Four distances', ['d1', 't1']);
    const spanish = measure('Cuatro distancias', ['d1', 't1']);
    expect(stepFingerprint(spanish)).toBe(stepFingerprint(english));
  });

  test('it cannot tell two same-shaped questions apart, which is why it is not an identity', () => {
    expect(stepFingerprint(choice('Which one', 4))).toBe(
      stepFingerprint(choice('A different question entirely', 4))
    );
  });

  test('it does notice a change of shape', () => {
    expect(stepFingerprint(LESSON.steps[1])).not.toBe(
      stepFingerprint(LESSON.steps[2])
    );
    expect(stepFingerprint(choice('a', 3))).not.toBe(
      stepFingerprint(choice('b', 4))
    );
  });

  test('it survives something that is not a step', () => {
    expect(stepFingerprint(null)).toBe('unknown');
  });
});

describe('a round trip through an unchanged lesson', () => {
  test('returns every answer, attempt, visit and the position', () => {
    const restored = restoreProgress(backupOf(), LESSON);
    expect(restored.responses).toEqual(progressFor().responses);
    expect(restored.attempts).toEqual(progressFor().attempts);
    expect([...restored.visited].sort()).toEqual([
      'four-distances',
      'opening',
      'stretch',
      'which-one',
    ]);
    expect(restored.stepIndex).toBe(2);
    expect(restored.startedAt).toBe('2026-09-01T10:00:00.000Z');
    expect(restored.moved).toEqual([]);
    expect(restored.dropped).toEqual([]);
  });

  test('the backup says what it is, and for which lesson', () => {
    const b = backupOf();
    expect(b.kind).toBe(BACKUP_KIND);
    expect(b.version).toBe(BACKUP_VERSION);
    expect(b.lesson.id).toBe('tides');
    expect(b.steps).toHaveLength(4);
    // Identity travels with the map, which is what makes a reorder recoverable.
    expect(b.steps.map(x => x.sid)).toEqual([
      'opening',
      'four-distances',
      'which-one',
      'stretch',
    ]);
    expect(b.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('the filename says what it is and when', () => {
    expect(backupFilename(LESSON, new Date('2026-09-05T12:00:00Z'))).toBe(
      'gravitas-tides-progress-2026-09-05.json'
    );
  });
});

describe('a backup with no usable step map', () => {
  // Hand-written, or from a build that stopped emitting one. Falling back to
  // position is better than refusing the file, and the fallback says it is one.
  test('falls back to positional restore and flags it', () => {
    const backup = { ...backupOf(), steps: [], version: 1 };
    backup.progress = {
      ...backup.progress,
      responses: { 'tides:1:d1': '2' },
      stepIndex: 1,
    };
    const restored = restoreProgress(backup, LESSON);

    expect(restored.byPosition).toBe(true);
    expect(restored.responses['tides:four-distances:d1']).toBe('2');
  });

  test('answers beyond the end of a shortened lesson are discarded', () => {
    const backup = backupOf();
    const restored = restoreProgress(
      backup,
      lesson(read('Opening', 'opening'))
    );

    expect(restored.stepIndex).toBe(0);
    expect(Object.keys(restored.responses)).toEqual([]);
    expect(restored.dropped.length).toBeGreaterThan(0);
  });
});

describe('validation refuses what it should', () => {
  const cases = [
    ['null', null, 'notAnObject'],
    ['an array', [1, 2], 'notAnObject'],
    ['a string', 'hello', 'notAnObject'],
    ['some other JSON file', { hello: 'world' }, 'notABackup'],
    ['a backup with no version', { kind: BACKUP_KIND }, 'noVersion'],
    [
      'a backup from a newer build',
      { kind: BACKUP_KIND, version: BACKUP_VERSION + 1 },
      'tooNew',
    ],
    [
      'a backup naming no lesson',
      { kind: BACKUP_KIND, version: 1 },
      'noLesson',
    ],
    [
      'a backup with no progress',
      { kind: BACKUP_KIND, version: 1, lesson: { id: 'tides' } },
      'noProgress',
    ],
    [
      'a backup whose answers are not an object',
      {
        kind: BACKUP_KIND,
        version: 1,
        lesson: { id: 'tides' },
        progress: { responses: 'nope' },
      },
      'badResponses',
    ],
  ];

  for (const [what, data, reason] of cases) {
    test(`${what} is rejected as "${reason}"`, () => {
      expect(validateBackup(data)).toEqual({ ok: false, reason });
    });
  }

  test('a real backup is accepted', () => {
    expect(validateBackup(backupOf())).toEqual({ ok: true });
  });

  test('the size limit is small enough to be meaningful', () => {
    // A whole lesson's progress is a few kilobytes; the cap exists so a
    // mis-picked video file is refused before it is parsed.
    const size = JSON.stringify(backupOf()).length;
    expect(size).toBeLessThan(MAX_BACKUP_BYTES / 10);
  });
});

describe('keys that do not belong are dropped rather than trusted', () => {
  test('a key for another lesson is discarded and counted', () => {
    const backup = backupOf();
    backup.progress.responses['someone-else:opening'] = 'x';
    backup.progress.responses['malformed'] = 'y';

    const restored = restoreProgress(backup, LESSON);
    expect(restored.discardedKeys).toBe(2);
    expect(restored.responses['someone-else:opening']).toBeUndefined();
    expect(restored.responses.malformed).toBeUndefined();
  });

  test('a backup made under one lesson id restores under the current one', () => {
    // The engine refuses a cross-lesson restore before reaching here, but the
    // rekeying must not silently mix the two ids if it ever did.
    const backup = backupOf();
    const restored = restoreProgress(backup, { ...LESSON, id: 'tides' });
    for (const key of Object.keys(restored.responses)) {
      expect(key.startsWith('tides:')).toBe(true);
    }
  });
});
