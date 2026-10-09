import { describe, test, expect } from '@jest/globals';
import { checkInvestigationPack } from '../js/composer/api.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { remixLesson } from '../js/remix/grade.js';
import { gradeSubmission } from '../js/submission/results.js';
import {
  buildSubmission,
  readSubmissionToken,
  encodeSubmission,
} from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { EN_SUBMISSIONS } from '../js/i18n/en.submissions.js';
import { ES_SUBMISSIONS } from '../js/i18n/es.submissions.js';

// =============================================================================
// The review page grades a remixed report against the original, by reference
// (Prompt 78): its code and expected values, never anything from the pack
// =============================================================================

const raw = async id =>
  (await import(`../js/data/investigations/${id}.js`)).default;

/** A report a student of the remix would hand in. */
async function report(id, { drop = [], extra = [], responses }) {
  const { pack } = await remixBuiltin(id, { id: `my-${id}` });
  const { compiled } = await checkInvestigationPack(pack);
  const lesson = { ...compiled.lesson };
  lesson.steps = lesson.steps
    .filter(s => !drop.includes(s.sid))
    .concat(extra.map(sid => ({ sid, type: 'read', title: sid })));
  const stored = Object.fromEntries(
    Object.entries(responses).map(([sid, v]) => [stepKey(lesson.id, sid), v])
  );
  const backup = buildBackup({
    lesson,
    responses: stored,
    attempts: {},
    visited: lesson.steps.slice(0, 5).map(s => s.sid),
    stepSid: lesson.steps[0].sid,
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: 'Ada',
  });
  return { backup, lesson, submission: buildSubmission({ backup }) };
}

const RIGHT = {
  'where-is-the-star': '1',
  'what-sits-at-the-other': '2',
  'use-the-law': '8',
};

describe('grading a remix against its original', () => {
  test('uses the original’s own expected values', async () => {
    const { backup, submission, lesson } = await report('keplers-laws', {
      responses: { ...RIGHT, 'use-the-law': '5' },
    });
    expect(backup.lesson.pack.from.id).toBe('keplers-laws');
    const view = await remixLesson(backup, await raw('keplers-laws'));
    expect(view.ok).toBe(true);
    expect(view.lesson.id).toBe(lesson.id);
    const r = gradeSubmission(submission, view.lesson, {
      kind: 'backup',
      label: 'x',
    });
    const v = sid => r.questions.find(q => q.sid === sid).verdict;
    expect(v('where-is-the-star')).toBe('correct');
    expect(v('what-sits-at-the-other')).toBe('correct');
    expect(v('use-the-law')).toBe('incorrect');
    expect(r.lessonTitle).toContain('keplers-laws');
    // The questions are the original's, at every depth the report lists.
    expect(r.scorable).toBe(18);
  });

  test('grades only the questions the student was asked, and lists what the instructor added', async () => {
    const { backup, submission } = await report('keplers-laws', {
      drop: ['use-the-law'],
      extra: ['instructor-extra'],
      responses: {
        'where-is-the-star': '1',
        'what-sits-at-the-other': '2',
      },
    });
    const view = await remixLesson(backup, await raw('keplers-laws'));
    expect(view.ok).toBe(true);
    expect(view.added).toEqual(['instructor-extra']);
    expect(view.lesson.steps.some(s => s.sid === 'use-the-law')).toBe(false);
    const r = gradeSubmission(submission, view.lesson, {
      kind: 'backup',
      label: 'x',
    });
    expect(r.scorable).toBe(17);
    expect(r.questions.some(q => q.sid === 'use-the-law')).toBe(false);
  });

  test('survives the submission token', async () => {
    const { submission } = await report('tides', { responses: {} });
    const { token } = await encodeSubmission(submission);
    const read = await readSubmissionToken(token);
    expect(read.ok).toBe(true);
    expect(read.submission.b.lesson.pack.from.id).toBe('tides');
  });

  test('refuses when the original has moved since (its digest), or names nothing', async () => {
    const { backup } = await report('tides', { responses: {} });
    const moved = JSON.parse(JSON.stringify(backup));
    moved.lesson.pack.from.digest = '00000000';
    expect((await remixLesson(moved, await raw('tides'))).reason).toBe(
      'remixChanged'
    );
    const scratch = JSON.parse(JSON.stringify(backup));
    delete scratch.lesson.pack.from;
    expect((await remixLesson(scratch, null)).reason).toBe('remix');
    expect((await remixLesson(backup, await raw('keplers-laws'))).reason).toBe(
      'remix'
    );
  });

  test.each(MANIFEST.map(m => m.id))(
    '%s: a faithful remix’s digest is the original’s',
    async id => {
      const { backup } = await report(id, { responses: {} });
      expect((await remixLesson(backup, await raw(id))).ok).toBe(true);
    }
  );
});

describe('the words', () => {
  test('both reasons are said in both languages', () => {
    for (const T of [EN_SUBMISSIONS, ES_SUBMISSIONS])
      for (const k of ['sub.reason.remix', 'sub.reason.remixChanged'])
        expect(T[k]).toEqual(expect.any(String));
  });
});
