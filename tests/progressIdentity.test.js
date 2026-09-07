import { describe, test, expect } from '@jest/globals';
import DETECT from '../js/data/investigations/detect-this-planet.js';
import ES_DETECT from '../js/data/investigations/es/detect-this-planet.js';
import {
  mergeTranslation,
  STRUCTURAL,
} from '../js/data/investigations/i18n.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  buildBackup,
  restoreProgress,
  stepFingerprint,
} from '../js/investigations/progressBackup.js';
import {
  PROGRESS_SCHEMA,
  isValidSid,
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';

// =============================================================================
// A step's identity
// -----------------------------------------------------------------------------
// Two identities were tried before this one and both were wrong in the same
// way: they were derived from something that changes.
//
//   position   insert a step and every answer below it moves onto the wrong
//              question
//   structure  two four-option predict steps have the same fingerprint, so
//              swapping them moves one answer onto the other's question - and
//              reports that nothing moved
//
// The reproduction below is the second of those, with the exact steps named in
// the report. Everything after it is the fix: an opaque `sid` that is derived
// from nothing.
// =============================================================================

const LESSON_ID = 'detect-this-planet';
const key = (sid, suffix = '') => `${LESSON_ID}:${sid}${suffix}`;

/** The lesson with two steps exchanged. */
const swap = (lesson, a, b) => ({
  ...lesson,
  steps: lesson.steps.map((s, i) =>
    i === a ? lesson.steps[b] : i === b ? lesson.steps[a] : s
  ),
});

describe('the defect this replaces', () => {
  test('a fingerprint is not an identity, and never can be', () => {
    // The reason sids exist. A fingerprint describes a step's SHAPE, and two
    // different questions can have the same shape - so it can say "this step
    // was rewritten" and can never say "this is that step".
    //
    // Steps 1 and 5 used to be the illustration here. They no longer collide,
    // because the fingerprint now includes where the correct option sits and
    // those two differ - which is the strengthening that stopped a same-length
    // option reorder from silently keeping a binding valid. The property being
    // documented is unchanged, so it is shown with a pair that still collides:
    // same type, same option count, same correct answer, different question.
    const a = {
      sid: 'one',
      type: 'predict',
      options: ['w', 'x', 'y', 'z'],
      answer: 2,
      title: 'Which way does it move first?',
    };
    const b = {
      sid: 'two',
      type: 'predict',
      options: ['p', 'q', 'r', 's'],
      answer: 2,
      title: 'Which curve is the deeper one?',
    };
    expect(stepFingerprint(a)).toBe(stepFingerprint(b));
    expect(a.title).not.toBe(b.title);
    expect(a.sid).not.toBe(b.sid);

    // And it still happens in a real lesson: detect-this-planet contains
    // colliding pairs among its explores, which carry no answer at all.
    const prints = DETECT.steps.map(stepFingerprint);
    expect(new Set(prints).size).toBeLessThan(prints.length);
  });

  test('their sids are different, which is the whole point', () => {
    expect(DETECT.steps[1].sid).not.toBe(DETECT.steps[5].sid);
  });
});

describe('every lesson step has a usable stable id', () => {
  test.each(Object.values(INVESTIGATIONS).map(l => [l.id, l]))(
    '%s',
    (id, lesson) => {
      const sids = lesson.steps.map(s => s.sid);
      for (const sid of sids) expect(isValidSid(sid)).toBe(true);
      // Unique within the lesson, or two steps share a key.
      expect(new Set(sids).size).toBe(sids.length);
    }
  );

  test('a sid can never be mistaken for a v1 index', () => {
    // The migration tells the two formats apart by whether the step head parses
    // as an integer, so a numeric sid would make an old save unreadable.
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        expect(/^\d+$/.test(step.sid)).toBe(false);
        expect(step.sid).not.toContain(':');
      }
    }
  });

  test('a translation cannot supply one', () => {
    expect(STRUCTURAL.has('sid')).toBe(true);
    const spanish = mergeTranslation(DETECT, ES_DETECT);
    spanish.steps.forEach((step, i) => {
      expect(step.sid).toBe(DETECT.steps[i].sid);
    });
    // ...and the words really did change, so the merge did happen.
    expect(spanish.steps[0].title).not.toBe(DETECT.steps[0].title);
  });
});

describe('a backup survives the edits that used to break it', () => {
  const answers = () => ({
    [key(DETECT.steps[1].sid)]: 0,
    [key(DETECT.steps[5].sid)]: 2,
    [key(DETECT.steps[3].sid, ':coverageA')]: '10',
    [key(DETECT.steps[8].sid)]: '1',
  });

  const backupOf = (lesson = DETECT) =>
    buildBackup({
      lesson,
      responses: answers(),
      attempts: { [key(DETECT.steps[4].sid)]: 2 },
      visited: [DETECT.steps[1].sid, DETECT.steps[5].sid],
      stepSid: DETECT.steps[5].sid,
      startedAt: '2026-09-01T10:00:00.000Z',
    });

  test('the reproduction: swapping the two predicts keeps each answer', () => {
    // The exact case from the report. Under fingerprint matching both answers
    // stayed at their old positions and were silently attached to the other
    // question; `moved` was empty, so nothing was reported either.
    const restored = restoreProgress(backupOf(), swap(DETECT, 1, 5));

    expect(restored.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(restored.responses[key(DETECT.steps[5].sid)]).toBe(2);
    // Both moved, and the restore says so.
    expect(restored.moved).toEqual(
      expect.arrayContaining([DETECT.steps[1].sid, DETECT.steps[5].sid])
    );
    expect(restored.uncertain).toBe(0);
  });

  test('a step inserted at the top moves nothing onto the wrong question', () => {
    const updated = {
      ...DETECT,
      steps: [
        { sid: 'brand-new', type: 'read', title: 'New' },
        ...DETECT.steps,
      ],
    };
    const restored = restoreProgress(backupOf(), updated);

    expect(restored.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(restored.responses[key(DETECT.steps[5].sid)]).toBe(2);
    expect(restored.responses[key(DETECT.steps[3].sid, ':coverageA')]).toBe(
      '10'
    );
  });

  test('a removed step drops only its own answer, and names it', () => {
    const goneSid = DETECT.steps[3].sid;
    const updated = {
      ...DETECT,
      steps: DETECT.steps.filter((_, i) => i !== 3),
    };
    const restored = restoreProgress(backupOf(), updated);

    expect(restored.dropped).toContain(goneSid);
    expect(restored.responses[key(goneSid, ':coverageA')]).toBeUndefined();
    // Everything else is untouched.
    expect(restored.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(restored.responses[key(DETECT.steps[5].sid)]).toBe(2);
  });

  test('the reader lands on the step they were on, wherever it moved to', () => {
    const restored = restoreProgress(backupOf(), swap(DETECT, 1, 5));
    expect(restored.stepIndex).toBe(1);
    expect(restored.visited.has(DETECT.steps[1].sid)).toBe(true);
    expect(restored.visited.has(DETECT.steps[5].sid)).toBe(true);
  });

  test('switching language changes nothing about where answers land', () => {
    const spanish = mergeTranslation(DETECT, ES_DETECT);
    const restored = restoreProgress(backupOf(), spanish);

    expect(restored.responses).toEqual(answers());
    expect(restored.uncertain).toBe(0);
    expect(restored.dropped).toEqual([]);
  });

  test('a backup taken in Spanish restores into English identically', () => {
    const spanish = mergeTranslation(DETECT, ES_DETECT);
    const fromSpanish = buildBackup({
      lesson: spanish,
      responses: answers(),
      attempts: {},
      visited: [],
      stepSid: spanish.steps[5].sid,
      startedAt: null,
    });
    expect(restoreProgress(fromSpanish, DETECT).responses).toEqual(answers());
  });
});

describe('an answer whose options changed is set aside, not mis-scored', () => {
  test('a reordered option list quarantines the stored index', () => {
    // The stored value is an index into a list that no longer exists. Applying
    // it would score a different option; dropping it would lose the work.
    const choiceSid = DETECT.steps[4].sid;
    const backup = buildBackup({
      lesson: DETECT,
      responses: { [key(choiceSid)]: 2 },
      attempts: {},
      visited: [],
      stepSid: null,
      startedAt: null,
    });

    const shortened = {
      ...DETECT,
      steps: DETECT.steps.map((s, i) =>
        i === 4 ? { ...s, options: s.options.slice(0, 3) } : s
      ),
    };
    const restored = restoreProgress(backup, shortened);

    expect(restored.responses[key(choiceSid)]).toBeUndefined();
    expect(restored.uncertain).toBe(1);
    // Recoverable, not destroyed.
    expect(restored.quarantined[key(choiceSid)]).toBe(2);
  });
});

describe('an old backup is restored by position, and says so', () => {
  /** A v1 backup: index-keyed, fingerprints, no sids. */
  const v1 = (lesson = DETECT) => ({
    kind: 'gravitas.investigation.progress',
    version: 1,
    savedAt: '2026-09-01T10:00:00.000Z',
    lesson: {
      id: LESSON_ID,
      title: lesson.title,
      stepCount: lesson.steps.length,
    },
    progress: {
      stepIndex: 5,
      startedAt: null,
      visited: [1, 5],
      responses: { [`${LESSON_ID}:1`]: 0, [`${LESSON_ID}:5`]: 2 },
      attempts: {},
    },
    steps: lesson.steps.map((step, index) => ({
      index,
      fingerprint: stepFingerprint(step),
    })),
  });

  test('an unchanged lesson restores every answer onto its own step', () => {
    const restored = restoreProgress(v1(), DETECT);
    expect(restored.byPosition).toBe(true);
    expect(restored.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(restored.responses[key(DETECT.steps[5].sid)]).toBe(2);
    expect(restored.uncertain).toBe(0);
  });

  test('where the lesson changed under a position, the answer is set aside', () => {
    // Replace step 5 with something structurally different. Position says the
    // answer belongs there; the fingerprint says the step is not the one that
    // was answered. The old code would have gone hunting for another
    // four-option predict and found step 1's - confidently, and wrongly.
    const updated = {
      ...DETECT,
      steps: DETECT.steps.map((s, i) =>
        i === 5 ? { sid: 'replaced', type: 'read', title: 'Something else' } : s
      ),
    };
    const restored = restoreProgress(v1(), updated);

    expect(restored.uncertain).toBe(1);
    expect(restored.quarantined[`${LESSON_ID}:5`]).toBe(2);
    // It did not migrate onto step 1, which is the bug being fixed.
    expect(restored.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(restored.responses[key('replaced')]).toBeUndefined();
  });
});

describe('stored progress carries a schema, and older stores migrate', () => {
  test('what is written names its version and keys by sid', () => {
    const out = writeProgress({
      lesson: DETECT,
      responses: { [key(DETECT.steps[1].sid)]: 0 },
      attempts: {},
      visited: new Set([DETECT.steps[1].sid]),
      stepSid: DETECT.steps[1].sid,
      startedAt: null,
    });
    expect(out.schema).toBe(PROGRESS_SCHEMA);
    expect(out.stepSid).toBe(DETECT.steps[1].sid);
    expect(out.visited).toEqual([DETECT.steps[1].sid]);
  });

  test('a v1 store is re-keyed by position and reports that it was', () => {
    const legacy = {
      stepIndex: 5,
      responses: { [`${LESSON_ID}:1`]: 0, [`${LESSON_ID}:5`]: 2 },
      attempts: { [`${LESSON_ID}:4`]: 3 },
      visited: [1, 5],
      startedAt: '2026-09-01T10:00:00.000Z',
    };
    const out = readProgress(legacy, DETECT);

    expect(out.migrated).toBe(true);
    expect(out.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(out.responses[key(DETECT.steps[5].sid)]).toBe(2);
    expect(out.attempts[key(DETECT.steps[4].sid)]).toBe(3);
    expect(out.stepSid).toBe(DETECT.steps[5].sid);
    expect(out.visited.has(DETECT.steps[1].sid)).toBe(true);

    // The uncertainty is stated rather than hidden: position is all a v1 store
    // supports, and nothing in it says whether the lesson has been reordered.
    const note = out.notes.find(n => n.code === 'migratedByPosition');
    expect(note).toBeTruthy();
    expect(note.certain).toBe(false);
    expect(note.carried).toBe(2);
  });

  test('a v2 store round-trips exactly', () => {
    const written = writeProgress({
      lesson: DETECT,
      responses: { [key(DETECT.steps[2].sid, ':tool:cadence')]: '0.32' },
      attempts: {},
      visited: new Set([DETECT.steps[2].sid]),
      stepSid: DETECT.steps[2].sid,
      startedAt: '2026-09-01T10:00:00.000Z',
    });
    const back = readProgress(JSON.parse(JSON.stringify(written)), DETECT);

    expect(back.migrated).toBe(false);
    expect(back.responses[key(DETECT.steps[2].sid, ':tool:cadence')]).toBe(
      '0.32'
    );
    expect(back.stepSid).toBe(DETECT.steps[2].sid);
    expect(back.notes).toEqual([]);
  });

  test('answers for steps the lesson no longer has are dropped and counted', () => {
    const written = writeProgress({
      lesson: DETECT,
      responses: {
        [key(DETECT.steps[1].sid)]: 0,
        [key('a-step-that-was-deleted')]: 'x',
      },
      attempts: {},
      visited: new Set(),
      stepSid: null,
      startedAt: null,
    });
    const back = readProgress(written, DETECT);

    expect(back.responses[key(DETECT.steps[1].sid)]).toBe(0);
    expect(back.responses[key('a-step-that-was-deleted')]).toBeUndefined();
    expect(back.notes.find(n => n.code === 'removedSteps')?.dropped).toBe(1);
  });

  test('a payload from a newer build is read as empty and flagged', () => {
    const future = { schema: PROGRESS_SCHEMA + 1, responses: { anything: 1 } };
    const back = readProgress(future, DETECT);

    expect(back.responses).toEqual({});
    expect(back.notes.find(n => n.code === 'schemaTooNew')).toBeTruthy();
  });

  test('garbage produces empty progress rather than an exception', () => {
    for (const junk of [null, undefined, 42, 'text', [], { responses: 'no' }]) {
      expect(() => readProgress(junk, DETECT)).not.toThrow();
      expect(readProgress(junk, DETECT).responses).toEqual({});
    }
  });
});
