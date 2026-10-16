// =============================================================================
// The instructor results export: one model, graded honestly, exported safely
// -----------------------------------------------------------------------------
// js/submission/results.js is what the review page's CSV and JSON downloads are
// written from. These tests use a real lesson and real backups, so a verdict
// here is the verdict the page would reach.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import {
  QUESTION_COLUMNS,
  RESULTS_KIND,
  RESULTS_SCHEMA_ID,
  RESULTS_VERSION,
  SUMMARY_COLUMNS,
  annotate,
  canonicalJson,
  evidenceCsv,
  fingerprintOf,
  gradeSubmission,
  questionCsv,
  readResults,
  resultsJson,
  summaryCsv,
} from '../js/submission/results.js';
import {
  buildSubmission,
  encodeSubmission,
  readSubmissionToken,
} from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import { LOCALE_SUFFIX, recordAnswer } from '../js/answerParse.js';
import { fromCsv } from '../js/csv.js';

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default || Object.values(m)[0]
);
const tides = await import('../js/data/investigations/tides.js').then(
  m => m.default || Object.values(m)[0]
);
const goldilocks =
  await import('../js/data/investigations/goldilocks-question.js').then(
    m => m.default || Object.values(m)[0]
  );

/** The answers a careful student gives. */
const RIGHT = {
  'where-is-the-star': '1',
  'what-sits-at-the-other': '2',
  'use-the-law': '8',
  'weighing-another-star': '0.91',
  'where-kepler-s-version-breaks': '2',
};

/**
 * A submission as a student's browser would make it.
 *
 * Answers are given here by sid, to be readable, and stored the way the lesson
 * engine stores them: under stepKey(), with a measure step's fields and an
 * answer's locale hanging off it. These fixtures once stored them by bare sid,
 * which is the one spelling the engine never writes, and every test here passed
 * while the review page graded every real report as unanswered.
 *
 * @returns {object} A validated submission payload
 */
function submission({
  lesson = kepler,
  responses = RIGHT,
  fields = {},
  locales = {},
  visited = lesson.steps.slice(0, 5).map(s => s.sid),
  name = 'Ada',
  roster = null,
  assignment = null,
  savedAt = null,
  attempts = {},
} = {}) {
  const key = sid => stepKey(lesson.id, sid);
  const stored = {};
  for (const [sid, value] of Object.entries(responses)) {
    stored[key(sid)] = value;
  }
  for (const [sid, values] of Object.entries(fields)) {
    for (const [id, value] of Object.entries(values)) {
      stored[`${key(sid)}:${id}`] = value;
    }
  }
  for (const [sid, loc] of Object.entries(locales)) {
    stored[`${key(sid)}${LOCALE_SUFFIX}`] = loc;
  }
  const backup = buildBackup({
    lesson,
    responses: stored,
    attempts: Object.fromEntries(
      Object.entries(attempts).map(([sid, n]) => [key(sid), n])
    ),
    visited,
    stepSid: visited.at(-1),
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: name,
  });
  if (savedAt) backup.savedAt = savedAt;
  return buildSubmission({
    backup,
    assignmentId: assignment,
    rosterId: roster,
  });
}

const grade = (sub, lesson = kepler, label = 'report.pdf', evidence = null) =>
  gradeSubmission(sub, lesson, { kind: 'pdf', label, evidence });

describe('grading one submission', () => {
  test('counts every graded step, answered or not', () => {
    const r = grade(
      submission({
        responses: {
          ...RIGHT,
          'use-the-law': '5',
          'why-the-speed-changes': 'Because it is closer to the star.',
        },
        fields: { 'measure-the-two-orbits': { circ_e: '0', ecc_e: '0.5' } },
      })
    );
    // Thirteen steps ask for input; nine were answered.
    expect(r.scorable).toBe(13);
    expect(r.correct).toBe(4);
    expect(r.incorrect).toBe(1);
    // A written answer and a live measurement are the instructor's to judge.
    expect(r.unmarked).toBe(2);
    expect(r.incomplete).toBe(6);
    expect(r.questions).toHaveLength(13);
    const verdict = sid => r.questions.find(q => q.sid === sid).verdict;
    expect(verdict('use-the-law')).toBe('incorrect');
    expect(verdict('why-the-speed-changes')).toBe('unmarked');
    expect(verdict('fast-and-slow-in-numbers')).toBe('incomplete');
  });

  test('grades each answer under the language it was typed in', () => {
    const r = grade(
      submission({
        responses: { 'weighing-another-star': '0,91' },
        locales: { 'weighing-another-star': 'es' },
      })
    );
    const q = r.questions.find(x => x.sid === 'weighing-another-star');
    expect(q.verdict).toBe('correct');
    expect(q.locale).toBe('es');
    expect(r.answerLocales).toEqual(['es']);
  });

  test('completion is the share of the lesson the student visited', () => {
    const r = grade(submission({ visited: kepler.steps.map(s => s.sid) }));
    expect(r.visitedSteps).toBe(kepler.steps.length);
    expect(r.completion).toBe(1);
    const half = grade(submission({ visited: [kepler.steps[0].sid] }));
    expect(half.completion).toBeCloseTo(1 / kepler.steps.length);
  });

  test('an answer to a step the lesson no longer has is stale, not wrong', () => {
    const r = grade(
      submission({ responses: { ...RIGHT, 'a-removed-step': '3' } })
    );
    expect(r.stale).toBe(1);
    expect(r.incorrect).toBe(0);
    expect(r.questions.at(-1)).toMatchObject({
      sid: 'a-removed-step',
      verdict: 'stale',
    });
  });

  test('a step rewritten since the report was saved is flagged', () => {
    const sub = submission();
    sub.b.steps.find(s => s.sid === 'use-the-law').fingerprint =
      'an-older-text';
    const r = grade(sub);
    expect(r.changedSteps).toBe(1);
    expect(r.questions.find(q => q.sid === 'use-the-law').changed).toBe(true);
  });

  test('records what it was graded against, and what it was handed', () => {
    const r = grade(submission({ roster: 'S-104', assignment: 'week-3' }));
    expect(r).toMatchObject({
      rosterId: 'S-104',
      assignmentId: 'week-3',
      nameAsTyped: 'Ada',
      lessonId: 'keplers-laws',
      lessonSteps: kepler.steps.length,
      recordedSteps: kepler.steps.length,
      submissionSchema: 2,
      source: { kind: 'pdf', label: 'report.pdf' },
    });
    expect(r.lessonVersion).toMatch(/^[0-9a-f]{14}$/);
    // A bare backup has no submission schema of its own.
    expect(
      gradeSubmission(submission(), kepler, { kind: 'backup', label: 'b.json' })
        .submissionSchema
    ).toBeNull();
  });
});

describe('what the lesson engine actually stores', () => {
  /**
   * A token made the way js/investigations.js makes one.
   *
   * Every write below is one the engine makes, spelled the way it spells it:
   * the option index a click stores, recordAnswer() for a checked number, the
   * first number tried, the hints taken, the model answer shown, the ellipse
   * slider, the checklist ticks and one sub-key per measure field, the derived
   * one included. The token is then built by the three calls the report
   * download makes, and read back the way the review page reads a pasted one.
   *
   * @returns {Promise<object>} The submission the review page would grade
   */
  async function engineSubmission() {
    const active = kepler;
    const id = sid => stepKey(active.id, sid);
    const responses = {};
    const attempts = {};
    const choose = (sid, option) => {
      responses[id(sid)] = option;
      attempts[id(sid)] = (attempts[id(sid)] || 0) + 1;
    };

    choose('where-is-the-star', 1);
    responses[`${id('change-the-shape')}:e`] = '0.6';
    choose('what-sits-at-the-other', 2);
    const orbit = id('measure-the-two-orbits');
    responses[`${orbit}:circ_e`] = '0';
    responses[`${orbit}:ecc_e`] = '0.6';
    responses[`${orbit}:ecc_peri`] = '0.4';
    responses[`${orbit}:ecc_apo`] = '1.6';
    responses[`${orbit}:ecc_a`] = '1.00';
    for (let i = 0; i < 4; i++) {
      responses[`${id('watch-it-happen')}:check:${i}`] = true;
    }
    responses[id('why-the-speed-changes')] = 'Closer to the star, so faster.';
    responses[`${id('why-the-speed-changes')}:shown`] = true;
    responses[`${id('use-the-law')}:help`] = 'concept,method';
    responses[`${id('use-the-law')}:first`] = '7';
    recordAnswer(responses, id('use-the-law'), '7', 'en');
    attempts[id('use-the-law')] = 1;
    recordAnswer(responses, id('use-the-law'), '8', 'en');
    attempts[id('use-the-law')] += 1;
    recordAnswer(responses, id('weighing-another-star'), '0,91', 'es');
    attempts[id('weighing-another-star')] = 1;
    choose('where-kepler-s-version-breaks', 0);

    const visited = new Set(active.steps.map(s => s.sid));
    const stepIndex = active.steps.length - 1;
    const encoded = await encodeSubmission(
      buildSubmission({
        backup: buildBackup({
          lesson: active,
          responses,
          attempts,
          visited,
          stepSid: active.steps[stepIndex]?.sid ?? null,
          startedAt: '2026-09-01T10:00:00.000Z',
          studentName: 'Ada',
        }),
        assignmentId: 'week-3',
        rosterId: 'S-1',
        fallbackLocale: 'en',
      })
    );
    const read = await readSubmissionToken(encoded.token);
    expect(read.ok).toBe(true);
    return read.submission;
  }

  test('a real report is graded, not marked unanswered', async () => {
    const sub = await engineSubmission();
    // The regression itself: every stored key starts with the lesson id.
    expect(
      Object.keys(sub.b.progress.responses).every(k =>
        k.startsWith(`${kepler.id}:`)
      )
    ).toBe(true);

    const r = grade(sub);
    expect(r).toMatchObject({
      scorable: 13,
      correct: 4,
      incorrect: 1,
      unmarked: 2,
      incomplete: 6,
      stale: 0,
    });
    // One row per question the lesson asks. Not one per thing stored.
    expect(r.questions).toHaveLength(13);
    expect(r.questions.every(q => !q.sid.includes(':'))).toBe(true);

    const q = sid => r.questions.find(x => x.sid === sid);
    expect(q('where-is-the-star')).toMatchObject({
      verdict: 'correct',
      attempts: 1,
      response: '1',
    });
    expect(q('where-kepler-s-version-breaks').verdict).toBe('incorrect');
    // The answer, not the first number tried, and every try counted.
    expect(q('use-the-law')).toMatchObject({
      verdict: 'correct',
      attempts: 2,
      response: '8',
      locale: 'en',
    });
    expect(q('weighing-another-star')).toMatchObject({
      verdict: 'correct',
      locale: 'es',
    });
    expect(q('measure-the-two-orbits')).toMatchObject({
      verdict: 'unmarked',
      response: 'circ_e=0; ecc_e=0.6; ecc_peri=0.4; ecc_apo=1.6; ecc_a=1.00',
    });
    expect(q('why-the-speed-changes').verdict).toBe('unmarked');
    expect(annotate([r])[0].warnings).toEqual([]);
  });

  test('a measure step is answered by the fields it declares, whatever they are called', () => {
    // goldilocks-question has a field called `e`, which is also the sub-key
    // the ellipse step keeps its slider in, and a tool whose control is
    // stored beside the fields on the same step.
    const sid = 'take-the-readings-yourself';
    const id = stepKey(goldilocks.id, sid);
    const r = grade(
      buildSubmission({
        backup: buildBackup({
          lesson: goldilocks,
          responses: {
            [`${id}:tool:model`]: '1',
            [`${id}:e`]: '0.029',
            [`${id}:inner`]: '0.024',
            [`${id}:outer`]: '',
          },
          attempts: {},
          visited: [sid],
          stepSid: sid,
          startedAt: null,
        }),
      }),
      goldilocks
    );
    expect(r.questions.find(q => q.sid === sid)).toMatchObject({
      verdict: 'unmarked',
      response: 'e=0.029; inner=0.024',
    });
    expect(r.stale).toBe(0);
  });

  test('what hangs off a step is not an answer to it', () => {
    const r = grade(
      submission({
        responses: {},
        fields: {
          'why-the-speed-changes': { shown: true, help: 'concept' },
          'use-the-law': { first: '7', locale: 'en' },
          'a-removed-step': { shown: true },
        },
      })
    );
    expect(
      r.questions.find(q => q.sid === 'why-the-speed-changes').verdict
    ).toBe('incomplete');
    expect(r.questions.find(q => q.sid === 'use-the-law').verdict).toBe(
      'incomplete'
    );
    // Nor is it a stale answer when the step has gone: which sub-keys were
    // answers, the lesson no longer says.
    expect(r.stale).toBe(0);
    expect(r.questions).toHaveLength(13);
  });
});

describe('a pile of submissions', () => {
  test('an exact duplicate is kept, marked, and not counted as an attempt', () => {
    const one = submission({ roster: 'S-1', assignment: 'a' });
    // The same submission with its keys in another order - a PDF and the
    // token pasted out of it decode to the same data, not the same bytes.
    const again = JSON.parse(JSON.stringify(one));
    const reordered = Object.fromEntries(Object.entries(again).reverse());
    const rows = annotate([
      grade(one),
      grade(reordered, kepler, 'pasted token'),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].duplicateOf).toBe(1);
    expect(rows[1].warnings).toContain('exactDuplicate');
    expect(rows[0].attemptGroup).toBeNull();
    expect(rows[1].fingerprint).toBe(rows[0].fingerprint);
  });

  test('repeated attempts are grouped and numbered by when they were saved, never merged', () => {
    const late = submission({
      roster: 'S-1',
      assignment: 'a',
      savedAt: '2026-09-03T10:00:00.000Z',
    });
    const early = submission({
      roster: 'S-1',
      assignment: 'a',
      responses: { ...RIGHT, 'use-the-law': '5' },
      savedAt: '2026-09-02T10:00:00.000Z',
    });
    const rows = annotate([grade(late), grade(early)]);
    expect(rows.map(r => r.submission)).toEqual([1, 2]);
    expect(rows.map(r => r.attemptGroup)).toEqual([1, 1]);
    expect(rows.map(r => r.attemptNumber)).toEqual([2, 1]);
    expect(rows.map(r => r.attemptsInGroup)).toEqual([2, 2]);
    // Both keep their own grade; nothing chose between them.
    expect(rows.map(r => r.incorrect)).toEqual([0, 1]);
    for (const r of rows) expect(r.warnings).toContain('repeatedAttempt');
  });

  test('without a roster id nothing is grouped, whatever the typed name says', () => {
    const rows = annotate([
      grade(submission({ name: 'Ada' })),
      grade(submission({ name: 'Ada', responses: { 'use-the-law': '5' } })),
    ]);
    expect(rows.map(r => r.attemptGroup)).toEqual([null, null]);
    for (const r of rows) expect(r.warnings).toContain('noRosterId');
  });

  test('the same roster id on two different lessons is two things, not two attempts', () => {
    const rows = annotate([
      grade(submission({ roster: 'S-1' })),
      grade(submission({ roster: 'S-1', lesson: tides, responses: {} }), tides),
    ]);
    expect(rows.map(r => r.attemptGroup)).toEqual([null, null]);
    expect(rows.map(r => r.lessonId)).toEqual(['keplers-laws', 'tides']);
  });

  test('annotating twice gives the same answer and leaves the input alone', () => {
    const graded = [grade(submission({ roster: 'S-1' }))];
    const first = annotate(graded);
    expect(annotate(graded)).toEqual(first);
    expect(graded[0].submission).toBeUndefined();
  });
});

describe('the CSV exports', () => {
  const rows = annotate([
    grade(
      submission({
        roster: 'S-1',
        assignment: 'week-3',
        responses: { ...RIGHT, 'why-the-speed-changes': 'Closer, so faster.' },
      })
    ),
  ]);

  test('the headers are the documented, stable columns', () => {
    const summary = fromCsv(summaryCsv(rows));
    expect(summary[0]).toEqual([...SUMMARY_COLUMNS]);
    const questions = fromCsv(questionCsv(rows));
    expect(questions[0]).toEqual([...QUESTION_COLUMNS]);
    // Written down here, so a change to either list is a visible decision.
    expect(SUMMARY_COLUMNS.slice(0, 9)).toEqual([
      'schema',
      'submission',
      'fingerprint',
      'source_kind',
      'source_label',
      'roster_id',
      'assignment_id',
      'name_as_typed',
      'lesson_id',
    ]);
    expect(RESULTS_SCHEMA_ID).toBe(`${RESULTS_KIND}/${RESULTS_VERSION}`);
  });

  test('one summary row per submission, one question row per graded step', () => {
    const summary = fromCsv(summaryCsv(rows));
    expect(summary).toHaveLength(2);
    const at = col => summary[1][SUMMARY_COLUMNS.indexOf(col)];
    expect(at('schema')).toBe(RESULTS_SCHEMA_ID);
    expect(at('roster_id')).toBe('S-1');
    expect(at('scorable')).toBe('13');
    expect(at('correct')).toBe('5');
    expect(at('warnings')).toBe('');
    expect(fromCsv(questionCsv(rows))).toHaveLength(1 + 13);
  });

  test('written answers are withheld unless asked for; checked answers are not', () => {
    const col = (csv, sid, name) => {
      const parsed = fromCsv(csv);
      const row = parsed.find(
        r => r[QUESTION_COLUMNS.indexOf('step_id')] === sid
      );
      return row[QUESTION_COLUMNS.indexOf(name)];
    };
    const plain = questionCsv(rows);
    expect(col(plain, 'why-the-speed-changes', 'response')).toBe('');
    expect(col(plain, 'why-the-speed-changes', 'response_status')).toBe(
      'withheld'
    );
    expect(col(plain, 'use-the-law', 'response')).toBe('8');
    expect(col(plain, 'use-the-law', 'response_status')).toBe('checked');
    expect(col(plain, 'fast-and-slow-in-numbers', 'response_status')).toBe(
      'none'
    );
    const opted = questionCsv(rows, { includeWritten: true });
    expect(col(opted, 'why-the-speed-changes', 'response')).toBe(
      'Closer, so faster.'
    );
    expect(col(opted, 'why-the-speed-changes', 'response_status')).toBe(
      'written'
    );
  });

  test('no cell a student or an assignment link supplied can run in a spreadsheet', () => {
    const hostile = annotate([
      grade(
        submission({
          name: '=HYPERLINK("http://example.invalid","click")',
          roster: ' @SUM(A1)',
          assignment: '\t+cmd',
          responses: {
            ...RIGHT,
            'why-the-speed-changes': ' -2+3',
          },
        }),
        kepler,
        '=file.pdf'
      ),
    ]);
    const files = [
      summaryCsv(hostile),
      questionCsv(hostile, { includeWritten: true }),
    ];
    // What a spreadsheet sees: the fields with CSV's quoting removed and
    // nothing else - in particular not the apostrophe that disarms a cell,
    // which fromCsv() takes back off and a spreadsheet does not.
    const asSeen = csv => {
      const cells = [];
      let field = '';
      let quoted = false;
      for (let i = 0; i < csv.length; i++) {
        const c = csv[i];
        if (quoted) {
          if (c === '"' && csv[i + 1] === '"') {
            field += '"';
            i++;
          } else if (c === '"') quoted = false;
          else field += c;
        } else if (c === '"' && field === '') quoted = true;
        else if (c === ',' || c === '\r' || c === '\n') {
          if (c !== '\n' || csv[i - 1] !== '\r') cells.push(field);
          field = '';
        } else field += c;
      }
      return cells;
    };
    for (const csv of files) {
      for (const cell of asSeen(csv)) {
        const lead = cell.replace(/^[\s\u0000-\u001f\u00a0\ufeff]+/, '');
        if (/^[=+\-@]/.test(lead)) {
          // A formula character may lead only behind the apostrophe that makes
          // the cell text, or as a plain number.
          expect({
            cell,
            safe: cell.startsWith("'") || Number.isFinite(Number(cell)),
          }).toEqual({ cell, safe: true });
        }
      }
    }
    // And reading the file back returns exactly what was handed in.
    const summary = fromCsv(files[0]);
    expect(summary[1][SUMMARY_COLUMNS.indexOf('name_as_typed')]).toBe(
      '=HYPERLINK("http://example.invalid","click")'
    );
    expect(summary[1][SUMMARY_COLUMNS.indexOf('source_label')]).toBe(
      '=file.pdf'
    );
    expect(summary[1][SUMMARY_COLUMNS.indexOf('roster_id')]).toBe(' @SUM(A1)');
    expect(asSeen(files[0])).toContain(
      '\'=HYPERLINK("http://example.invalid","click")'
    );
  });
});

describe('the JSON export', () => {
  const rows = annotate([
    grade(
      submission({
        roster: 'S-1',
        responses: { ...RIGHT, 'why-the-speed-changes': 'Closer.' },
      })
    ),
  ]);
  const now = new Date('2026-09-23T12:00:00.000Z');

  test('says what it is, what it cannot say, and what was not read', () => {
    const doc = JSON.parse(
      resultsJson(rows, {
        now,
        refused: [{ label: 'bad.txt', reason: 'not JSON and not a token' }],
      })
    );
    expect(doc).toMatchObject({
      kind: RESULTS_KIND,
      version: RESULTS_VERSION,
      generatedAt: '2026-09-23T12:00:00.000Z',
      options: { includeWritten: false },
      refused: [{ label: 'bad.txt', reason: 'not JSON and not a token' }],
    });
    expect(doc.notice).toMatch(/not identity or authorship/);
    expect(doc.submissions[0].counts).toEqual({
      scorable: 13,
      correct: 5,
      incorrect: 0,
      unmarked: 1,
      incomplete: 7,
      stale: 0,
      // One point a question, as the Composer counts: five right, and the
      // written answer's point waiting for the instructor rather than lost.
      points: 5,
      pointsPossible: 13,
      pointsUnmarked: 1,
      // Help taken is a fact beside the answers; this fixture took none.
      hintsTaken: 0,
      workedShown: 0,
    });
  });

  test('counts points per question: earned, zero, or not yet marked', () => {
    const qs = JSON.parse(resultsJson(rows, { now })).submissions[0].questions;
    for (const q of qs) {
      expect(q.pointsPossible).toBe(1);
      expect(q.points).toBe(
        q.verdict === 'correct' ? 1 : q.verdict === 'unmarked' ? null : 0
      );
    }
  });

  test('a step that declares its points is worth them', () => {
    const lesson = {
      ...kepler,
      steps: kepler.steps.map(s =>
        s.sid === 'where-is-the-star' ? { ...s, points: 3 } : s
      ),
    };
    const one = grade(submission({ responses: RIGHT }), lesson);
    const q = one.questions.find(x => x.sid === 'where-is-the-star');
    expect(q.pointsPossible).toBe(3);
    expect(one.pointsPossible).toBe(15);
  });

  test('the CSVs end with the points columns, after everything version 1 had', () => {
    // The evidence columns came after, at the end, as additions do.
    // The hint columns came after the evidence ones, at the end.
    expect(SUMMARY_COLUMNS.slice(-8)).toEqual([
      'points',
      'points_possible',
      'points_unmarked',
      'evidence_state',
      'evidence_rows',
      'evidence_digest',
      'hints_taken',
      'worked_shown',
    ]);
    expect(QUESTION_COLUMNS.slice(-5)).toEqual([
      'points',
      'points_possible',
      'unit',
      'hints_taken',
      'worked_shown',
    ]);
  });

  test('evidence: a verified, a tampered and an absent ledger are told apart in every export', () => {
    const row = [
      'e1',
      'period',
      3.52,
      'd',
      0.01,
      'measured',
      'pipeline',
      'box',
      'abcd',
    ];
    const ev = state => ({
      state,
      digest: 'f'.repeat(64),
      total: 1,
      ids: ['e1'],
      rows: [row],
    });
    const records = annotate([
      grade(submission(), kepler, 'a.pdf', ev('verified')),
      grade(submission({ roster: 'x2' }), kepler, 'b.pdf', ev('mismatch')),
      grade(submission({ roster: 'x3' })),
    ]);
    expect(records.map(r => r.evidence.state)).toEqual([
      'verified',
      'mismatch',
      'none',
    ]);
    expect(records[1].warnings).toContain('evidenceMismatch');
    expect(records[0].warnings).not.toContain('evidenceMismatch');
    const lines = evidenceCsv(records).trim().split('\r\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('unit,unit_id,uncertainty');
    expect(lines[1]).toContain('verified');
    expect(lines[2]).toContain('mismatch');
    expect(lines[1]).toMatch(/3\.52,d,d,0\.01,measured,pipeline,box,abcd/);
    const json = JSON.parse(resultsJson(records));
    expect(json.submissions[1].evidence.state).toBe('mismatch');
    expect(json.submissions[2].evidence.rows).toEqual([]);
  });

  test('a numeric step’s unit travels with its answer, in both exports', () => {
    const records = annotate([grade(submission())]);
    const q = sid => records[0].questions.find(x => x.sid === sid);
    expect(q('use-the-law').unit).toBe('years');
    expect(q('weighing-another-star').unit).toBe('M_sun');
    expect(q('where-is-the-star').unit).toBeNull();
    const csv = fromCsv(questionCsv(records));
    const col = csv[0].indexOf('unit');
    // Then the two help columns, added after it.
    expect(col).toBe(csv[0].length - 3);
    const row = sid => csv.find(r => r[csv[0].indexOf('step_id')] === sid);
    expect(row('use-the-law')[col]).toBe('years');
    expect(row('where-is-the-star')[col]).toBe('');
    const json = JSON.parse(resultsJson(records, { now }));
    expect(
      json.submissions[0].questions.find(x => x.stepId === 'use-the-law').unit
    ).toBe('years');
    // A version 2 file written before the column reads as it was.
    for (const sub of json.submissions)
      for (const x of sub.questions) delete x.unit;
    expect(readResults(json)).toEqual({ ok: true, doc: json });
  });

  test('a version 1 file is still read, with points it never had as null', () => {
    const v2 = JSON.parse(resultsJson(rows, { now }));
    // The same document as a version 1 build wrote it: no points anywhere.
    const v1 = JSON.parse(JSON.stringify(v2));
    v1.version = 1;
    for (const sub of v1.submissions) {
      for (const k of ['points', 'pointsPossible', 'pointsUnmarked'])
        delete sub.counts[k];
      for (const q of sub.questions) {
        delete q.points;
        delete q.pointsPossible;
      }
    }
    const read = readResults(JSON.stringify(v1));
    expect(read.ok).toBe(true);
    expect(read.doc.version).toBe(RESULTS_VERSION);
    expect(read.doc.submissions[0].counts.points).toBeNull();
    expect(read.doc.submissions[0].questions[0].pointsPossible).toBeNull();
    expect(readResults(v2)).toEqual({ ok: true, doc: v2 });
    expect(readResults('{').reason).toBe('notJson');
    expect(readResults({ kind: 'other', version: 2 }).reason).toBe('wrongKind');
    expect(readResults({ ...v2, version: 9 }).reason).toBe('unknownVersion');
  });

  test('withholds written answers by default, like the CSV', () => {
    const find = doc =>
      JSON.parse(doc).submissions[0].questions.find(
        q => q.stepId === 'why-the-speed-changes'
      );
    expect(find(resultsJson(rows, { now }))).toMatchObject({
      responseStatus: 'withheld',
      response: null,
    });
    expect(
      find(resultsJson(rows, { now, includeWritten: true }))
    ).toMatchObject({
      responseStatus: 'written',
      response: 'Closer.',
    });
  });

  test('is the same document for the same input', () => {
    expect(resultsJson(rows, { now })).toBe(resultsJson(rows, { now }));
  });
});

describe('what reaches the model', () => {
  test('a newer or malformed token is refused before it is graded', async () => {
    const newer = { ...submission(), v: 99 };
    const { token } = await encodeSubmission(submission());
    expect((await readSubmissionToken(token)).ok).toBe(true);
    expect((await readSubmissionToken(`${token.slice(0, -12)}`)).ok).toBe(
      false
    );
    expect((await readSubmissionToken('s1 not—a—token')).reason).toBe(
      'mangled'
    );
    const { token: future } = await encodeSubmission(newer);
    expect((await readSubmissionToken(future)).reason).toBe('newerVersion');
  });

  test('the fingerprint depends on the content, not the key order', () => {
    const a = { x: 1, y: [1, { b: 2, a: 1 }] };
    const b = { y: [1, { a: 1, b: 2 }], x: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(fingerprintOf(canonicalJson(a))).toBe(
      fingerprintOf(canonicalJson(b))
    );
    expect(fingerprintOf('a')).not.toBe(fingerprintOf('b'));
  });
});
