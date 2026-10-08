import { describe, test, expect, beforeAll } from '@jest/globals';

import {
  annotate,
  gradeSubmission,
  questionCsv,
  resultsJson,
  summaryCsv,
} from '../js/submission/results.js';
import {
  buildSubmission,
  encodeSubmission,
  helpOf,
  readSubmissionToken,
} from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { fromCsv } from '../js/csv.js';
import { buildLabReport } from '../js/labReport.js';
import { helpStages, helpTaken } from '../js/answerFeedback.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { checkAnswer } from '../js/answerCheck.js';

// =============================================================================
// Hint counts reach the token, the review page and the report (Prompt 71)
// -----------------------------------------------------------------------------
// Help taken is a fact beside an answer: recorded by the engine under the
// step's `:help` key, carried in the submission token with the rest of the
// progress, counted by the review page and printed in the student's report.
// None of it changes a grade.
// =============================================================================

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default
);
const key = sid => stepKey(kepler.id, sid);

function submission(help) {
  const responses = {
    [key('use-the-law')]: '8',
    [key('weighing-another-star')]: '0.91',
    ...help,
  };
  const backup = buildBackup({
    lesson: kepler,
    responses,
    attempts: {},
    visited: kepler.steps.slice(0, 5).map(s => s.sid),
    stepSid: kepler.steps[4].sid,
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: 'Ada',
  });
  return buildSubmission({ backup, assignmentId: null, rosterId: null });
}

const tokenRoundTrip = async sub =>
  (await readSubmissionToken((await encodeSubmission(sub)).token)).submission;

describe('the token carries hint counts', () => {
  let read;
  let none;
  beforeAll(async () => {
    read = await tokenRoundTrip(
      submission({
        [`${key('use-the-law')}:help`]: 'concept,method,reveal',
        [`${key('weighing-another-star')}:help`]: 'concept',
      })
    );
    none = await tokenRoundTrip(submission({}));
  });

  test('read back from the token, per step, as facts', () => {
    const help = helpOf(read);
    expect(help.get('use-the-law')).toEqual({ hints: 2, revealed: true });
    expect(help.get('weighing-another-star')).toEqual({
      hints: 1,
      revealed: false,
    });
    expect(help.has('where-is-the-star')).toBe(false);
  });

  test('a report from before hints existed has none, and reads as before', () => {
    expect(helpOf(none).size).toBe(0);
  });

  test('the ladder’s own ids count the same way', async () => {
    const s = await tokenRoundTrip(
      submission({ [`${key('use-the-law')}:help`]: 'h1,h2,h3' })
    );
    expect(helpOf(s).get('use-the-law').hints).toBe(3);
  });
});

describe('the review page counts them and does not mark them', () => {
  let graded;
  let plain;
  beforeAll(async () => {
    const opts = { kind: 'token', label: 'pasted token' };
    graded = gradeSubmission(
      await tokenRoundTrip(
        submission({
          [`${key('use-the-law')}:help`]: 'concept,method,reveal',
          [`${key('weighing-another-star')}:help`]: 'concept',
        })
      ),
      kepler,
      opts
    );
    plain = gradeSubmission(await tokenRoundTrip(submission({})), kepler, opts);
  });

  test('per question and in total', () => {
    const q = id => graded.questions.find(x => x.sid === id);
    expect(q('use-the-law')).toMatchObject({ hints: 2, workedShown: true });
    expect(q('weighing-another-star')).toMatchObject({
      hints: 1,
      workedShown: false,
    });
    expect(graded.hintsTaken).toBe(3);
    expect(graded.workedShown).toBe(1);
  });

  test('the grade is the same with and without help', () => {
    expect(graded.correct).toBe(plain.correct);
    expect(graded.points).toBe(plain.points);
  });

  test('both CSVs and the JSON export say so', () => {
    const records = annotate([graded]);
    const q = fromCsv(questionCsv(records));
    const col = q[0].indexOf('hints_taken');
    const row = q.find(r => r[q[0].indexOf('step_id')] === 'use-the-law');
    expect(row[col]).toBe('2');
    expect(row[q[0].indexOf('worked_shown')]).toBe('yes');
    const s = fromCsv(summaryCsv(records));
    expect(s[1][s[0].indexOf('hints_taken')]).toBe('3');
    const json = JSON.parse(resultsJson(records, { now: new Date(0) }));
    expect(json.submissions[0].counts.hintsTaken).toBe(3);
    expect(
      json.submissions[0].questions.find(x => x.stepId === 'use-the-law')
        .hintsTaken
    ).toBe(2);
  });
});

describe('the student’s report prints help taken', () => {
  const build = (locale, t, helpFor) =>
    buildLabReport({
      investigation: kepler,
      name: 'Ada',
      responses: { [key('use-the-law')]: '8' },
      attempts: {},
      visited: new Set(kepler.steps.slice(0, 20).map(s => s.sid)),
      startedAt: '2026-09-01T10:00:00.000Z',
      stepIdFor: i => key(kepler.steps[i].sid),
      checkAnswer: (step, value) => checkAnswer(step, value),
      decodeEntities,
      t,
      locale,
      helpFor,
    });
  const tr = table => (id, vars) =>
    String(table[id] ?? id).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');
  const text = bytes => Buffer.from(bytes).toString('latin1');
  const taken = id =>
    helpTaken(
      helpStages(id === key('use-the-law') ? 'concept,method,reveal' : '')
    );

  test('in English, with the number and the worked answer', () => {
    const pdf = text(build('en', tr(EN_REPORT), taken));
    expect(pdf).toContain('Help taken');
    // PDF strings escape their parentheses.
    expect(pdf).toContain('2 hint\\(s\\)');
    expect(pdf).toContain('worked answer shown');
  });

  test('in Spanish', () => {
    const pdf = text(build('es', tr(ES_REPORT), taken));
    expect(pdf).toContain('Ayuda usada');
    expect(pdf).toContain('2 pista\\(s\\)');
    expect(pdf).toContain('respuesta resuelta mostrada');
  });

  test('and says nothing when none was taken', () => {
    const pdf = text(build('en', tr(EN_REPORT), () => helpTaken([])));
    expect(pdf).not.toContain('Help taken');
  });
});
