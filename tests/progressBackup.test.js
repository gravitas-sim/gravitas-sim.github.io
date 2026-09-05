import { describe, test, expect } from '@jest/globals';
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  backupFilename,
  buildBackup,
  remapSteps,
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

/** A lesson whose steps are distinguishable by structure alone. */
const lesson = (...steps) => ({
  id: 'tides',
  title: 'Tides',
  steps,
});

const read = title => ({ type: 'read', title });
const choice = (title, options = 4) => ({
  type: 'question',
  kind: 'choice',
  title,
  options: Array.from({ length: options }, (_, i) => `option ${i}`),
});
const measure = (title, ids) => ({
  type: 'measure',
  title,
  fields: ids.map(id => ({ id })),
});
const explore = (title, toolId) => ({
  type: 'explore',
  title,
  tool: { id: toolId },
});

const LESSON = lesson(
  read('Opening'),
  measure('Four distances', ['d1', 't1']),
  choice('Which one', 3),
  explore('Stretch against grip', 'tide-balance')
);

const progressFor = () => ({
  responses: {
    'tides:1:d1': '2',
    'tides:1:t1': '0.13',
    'tides:2': 1,
    'tides:3:shown': true,
  },
  attempts: { 'tides:2': 2 },
  visited: [0, 1, 2, 3],
  stepIndex: 2,
  startedAt: '2026-09-01T10:00:00.000Z',
});

const backupOf = (les = LESSON) =>
  buildBackup({ lesson: les, ...progressFor(), studentName: 'A Student' });

describe('the fingerprint is what makes a step identifiable', () => {
  test('it ignores the title, so it survives a translation', () => {
    // The merged lesson carries translated prose. A fingerprint built from the
    // title would change the moment a reader switched to Spanish, and every
    // answer would be orphaned by a language toggle.
    const english = measure('Four distances', ['d1', 't1']);
    const spanish = measure('Cuatro distancias', ['d1', 't1']);
    expect(stepFingerprint(spanish)).toBe(stepFingerprint(english));
  });

  test('it tells different steps apart', () => {
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
    expect([...restored.visited].sort()).toEqual([0, 1, 2, 3]);
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
    expect(b.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('the filename says what it is and when', () => {
    expect(backupFilename(LESSON, new Date('2026-09-05T12:00:00Z'))).toBe(
      'gravitas-tides-progress-2026-09-05.json'
    );
  });
});

describe('a lesson that has changed since the backup', () => {
  test('a step inserted at the top moves every answer down with its step', () => {
    // The defect this whole mechanism exists to prevent. Positionally, every
    // answer would now belong to the question above the one it answers.
    const backup = backupOf();
    const updated = lesson(read('A new opening'), ...LESSON.steps);

    const restored = restoreProgress(backup, updated);
    expect(restored.responses['tides:2:d1']).toBe('2');
    expect(restored.responses['tides:3']).toBe(1);
    expect(restored.responses['tides:1:d1']).toBeUndefined();
    expect(restored.moved).toEqual([1, 2, 3]);
    expect(restored.dropped).toEqual([]);
    // Where the reader was follows its step.
    expect(restored.stepIndex).toBe(3);
  });

  test('reordered steps keep their own answers', () => {
    const backup = backupOf();
    const updated = lesson(
      LESSON.steps[0],
      LESSON.steps[2],
      LESSON.steps[1],
      LESSON.steps[3]
    );

    const restored = restoreProgress(backup, updated);
    // The measure step is now at index 2; its fields go with it.
    expect(restored.responses['tides:2:d1']).toBe('2');
    expect(restored.responses['tides:2:t1']).toBe('0.13');
    // The choice moved to index 1, taking its answer and its attempt count.
    expect(restored.responses['tides:1']).toBe(1);
    expect(restored.attempts['tides:1']).toBe(2);
  });

  test('a removed step drops its answers and says so', () => {
    const backup = backupOf();
    const updated = lesson(LESSON.steps[0], LESSON.steps[2], LESSON.steps[3]);

    const restored = restoreProgress(backup, updated);
    expect(restored.dropped).toEqual([1]);
    // The measure step is gone, so its fields are not carried anywhere.
    expect(
      Object.keys(restored.responses).filter(k => k.includes('d1'))
    ).toEqual([]);
    // Everything else still lands correctly.
    expect(restored.responses['tides:1']).toBe(1);
  });

  test('two identical steps that swap places keep one answer each', () => {
    // Greedy left-to-right matching. Without the "already taken" check both
    // answers would collapse onto the first match.
    const twin = choice('Same shape', 3);
    const les = lesson(read('x'), twin, twin);
    const backup = buildBackup({
      lesson: les,
      responses: { 'tides:1': 'first', 'tides:2': 'second' },
      attempts: {},
      visited: [1, 2],
      stepIndex: 1,
      startedAt: null,
    });

    const restored = restoreProgress(backup, les);
    expect(restored.responses['tides:1']).toBe('first');
    expect(restored.responses['tides:2']).toBe('second');
  });

  test('a backup with no step map falls back to positional restore', () => {
    // Hand-written, or from a build that stopped emitting one. Better than
    // refusing the file.
    const backup = { ...backupOf(), steps: [] };
    const restored = restoreProgress(backup, LESSON);
    expect(restored.responses['tides:1:d1']).toBe('2');
  });

  test('answers beyond the end of a shortened lesson are discarded', () => {
    const backup = backupOf();
    const restored = restoreProgress(backup, lesson(LESSON.steps[0]));
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
    backup.progress.responses['someone-else:0'] = 'x';
    backup.progress.responses['malformed'] = 'y';

    const restored = restoreProgress(backup, LESSON);
    expect(restored.discardedKeys).toBe(2);
    expect(restored.responses['someone-else:0']).toBeUndefined();
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
