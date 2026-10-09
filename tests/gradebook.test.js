// =============================================================================
// The gradebook model and its three adapters
// -----------------------------------------------------------------------------
// One canonical result model and a golden file for each projection of it, so a
// change to a column shows up as a diff a person reads. The goldens are in
// tests/fixtures/gradebook/; UPDATE_GOLDEN=1 rewrites them for review.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { fromCsv } from '../js/csv.js';
import {
  gradebookModel,
  feedbackOf,
  ENGLISH,
  wide,
} from '../js/gradebook/model.js';
import { canvasCsv, COLUMNS as CANVAS } from '../js/gradebook/canvas.js';
import { moodleCsv, COLUMNS as MOODLE } from '../js/gradebook/moodle.js';
import { d2lCsv, COLUMNS as D2L } from '../js/gradebook/d2l.js';
import {
  MARK_COLUMNS,
  MARKS_SCHEMA,
  marksCsv,
  marksIndex,
  markKey,
  needsJudgment,
  readMarksCsv,
  setMark,
} from '../js/gradebook/marks.js';
import { WRITTEN_SID, pile } from './gradebookFixtures.js';

const DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'fixtures',
  'gradebook'
);

function golden(name, actual) {
  const file = path.join(DIR, name);
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, actual);
  }
  expect(existsSync(file)).toBe(true);
  expect(actual).toBe(readFileSync(file, 'utf8'));
}

const records = pile();
const activities = new Map([
  ['wk3', { title: 'Week 3: Kepler' }],
  ['wk4', { title: 'Week 4' }],
]);

/** Marks the instructor entered for Ada's and Cleo's written answers. */
function marks() {
  const m = marksIndex();
  const [ada, , , cleo2] = records;
  setMark(m, ada.fingerprint, WRITTEN_SID, {
    points: 1,
    comment: 'Names the speed-up.',
  });
  setMark(m, cleo2.fingerprint, WRITTEN_SID, {
    points: 0.5,
    comment: '=Needs the second law',
  });
  return m;
}

describe('the canonical model', () => {
  const model = gradebookModel(records, { identifier: 'roster', activities });

  test('one row per student per Activity, an Activity per column', () => {
    expect(model.rows.map(r => [r.identifier, r.activityKey])).toEqual([
      ['S-1', 'a:wk3'],
      ['S-2', 'a:wk3'],
      ['S-3', 'a:wk3'],
      ['S-1', 'a:wk4'],
    ]);
    expect(model.activities.map(a => a.title)).toEqual([
      'Week 3: Kepler',
      'Week 4',
    ]);
  });

  test('a report with no identifier is listed as skipped, never guessed at', () => {
    expect(model.skipped).toEqual([
      { submission: 5, name: 'Dev', activity: 'Week 3: Kepler' },
    ]);
  });

  test('two attempts give one row, and the row says which counted', () => {
    const cleo = model.rows.find(r => r.identifier === 'S-3');
    expect(cleo.attemptsConsidered).toBe(2);
    expect(cleo.attemptUsed).toBe(2);
    const first = gradebookModel(records, { policy: 'first' }).rows.find(
      r => r.identifier === 'S-3'
    );
    expect(first.attemptUsed).toBe(1);
    expect(first.points).toBeLessThan(cleo.points);
    const best = gradebookModel(records, { policy: 'best' }).rows.find(
      r => r.identifier === 'S-3'
    );
    expect(best.points).toBe(cleo.points);
  });

  test('a written answer without a mark is counted as awaiting, not as zero', () => {
    const ada = model.rows.find(
      r => r.identifier === 'S-1' && r.activityKey === 'a:wk3'
    );
    expect(ada.awaiting).toBe(1);
    expect(ada.instructorPoints).toBeNull();
    expect(ada.points).toBe(ada.autoPoints);
    expect(feedbackOf(ada)).toContain(
      'still without a mark: 1; this score is partial'
    );
  });

  test('instructor marks are added, bounded, and labelled as the instructor’s', () => {
    const m = gradebookModel(records, { activities, marks: marks() });
    const ada = m.rows.find(
      r => r.identifier === 'S-1' && r.activityKey === 'a:wk3'
    );
    expect(ada.instructorPoints).toBe(1);
    expect(ada.points).toBe(ada.autoPoints + 1);
    expect(ada.awaiting).toBe(0);
    expect(feedbackOf(ada)).toContain(
      'Written answers marked by the instructor: 1, 1 points'
    );
    expect(feedbackOf(ada)).toContain(
      'Instructor comment: Names the speed-up.'
    );
    const over = marksIndex();
    expect(setMark(over, 'x', 'y', { points: 5 }, 1)).toBe(false);
    expect(setMark(over, 'x', 'y', { points: -1 })).toBe(false);
    expect(over.size).toBe(0);
  });

  test('the name the student typed can be the identifier, grouped exactly', () => {
    const m = gradebookModel(records, { identifier: 'name', activities });
    expect(
      m.rows.filter(r => r.activityKey === 'a:wk3').map(r => r.identifier)
    ).toEqual([
      '=HYPERLINK("http://example.invalid","x")',
      'Ada Lovelace',
      'Cleo',
      'Dev',
    ]);
    expect(m.skipped).toEqual([]);
  });

  test('an exact duplicate is one report', () => {
    const doubled = pile();
    const again = { ...doubled[0], submission: 7, duplicateOf: 1 };
    const m = gradebookModel([...doubled, again], { activities });
    expect(
      m.rows.find(r => r.identifier === 'S-1' && r.activityKey === 'a:wk3')
        .attemptsConsidered
    ).toBe(1);
  });

  test('the model matches its golden file', () => {
    golden(
      'model.json',
      `${JSON.stringify(gradebookModel(records, { activities, marks: marks() }), null, 2)}\n`
    );
  });
});

describe('the adapters', () => {
  const model = gradebookModel(records, { activities, marks: marks() });

  test('Canvas', () => {
    golden('canvas.csv', canvasCsv(model));
    golden(
      'canvas-id.csv',
      canvasCsv(model, { idColumn: 'ID', scale: 'percent' })
    );
  });
  test('Moodle', () => {
    golden('moodle.csv', moodleCsv(model));
    golden(
      'moodle-points.csv',
      moodleCsv(model, { idColumn: 'Username', scale: 'points' })
    );
  });
  test('D2L', () => {
    golden('d2l.csv', d2lCsv(model));
  });

  test('every adapter is a projection of the same rows: the same score for the same cell', () => {
    const score = new Map(
      model.rows.map(r => [`${r.identifier}|${r.activity}`, r.points])
    );
    const canvas = fromCsv(canvasCsv(model));
    const d2l = fromCsv(d2lCsv(model));
    const moodle = fromCsv(moodleCsv(model, { scale: 'points' }));
    const check = (rows, idCol, titleOf) => {
      for (const line of rows.slice(canvas === rows ? 2 : 1)) {
        model.activities.forEach(a => {
          const cell = line[rows[0].indexOf(titleOf(a.title))];
          const expected = score.get(`${line[idCol]}|${a.title}`);
          expect(cell === '' ? undefined : Number(cell)).toBe(expected);
        });
      }
    };
    check(canvas, 3, t => t);
    check(d2l, 0, t => `${t} Points Grade`);
    check(moodle, 0, t => t);
  });

  test('a name that starts like a formula is disarmed in every file', () => {
    const m = gradebookModel(records, { identifier: 'name', activities });
    for (const text of [canvasCsv(m), moodleCsv(m), d2lCsv(m)]) {
      expect(text).toContain(`"'=HYPERLINK(`);
      expect(text).not.toMatch(/(^|,|\r\n)=HYPERLINK/);
    }
  });

  test('a student with no report for an Activity gets an empty cell, not a zero', () => {
    const rows = fromCsv(d2lCsv(model));
    const s2 = rows.find(r => r[0] === 'S-2');
    expect(s2[2]).toBe('');
    expect(
      rows.every(r => r.at(-1) === '#' || r.at(-1) === 'End-of-Line Indicator')
    ).toBe(true);
  });

  test('two Activities with one name get distinct columns', () => {
    const same = gradebookModel(records, {
      activities: new Map([
        ['wk3', { title: 'Lab' }],
        ['wk4', { title: 'Lab' }],
      ]),
    });
    expect([...wide(same).titles.values()]).toEqual(['Lab', 'Lab (2)']);
  });

  test('Moodle feedback is in the words it is given', () => {
    const es = { ...ENGLISH, awaiting: '{n} respuestas escritas sin nota.' };
    const csv = moodleCsv(model, { words: es });
    expect(csv).toContain('Instructor comment');
    const m2 = gradebookModel(records, { activities });
    expect(moodleCsv(m2, { words: es })).toContain(
      'respuestas escritas sin nota'
    );
  });
});

describe('the documented columns are the written columns', () => {
  const doc = readFileSync(
    path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      'INSTRUCTOR_FLOW.md'
    ),
    'utf8'
  );
  test.each([
    ['Canvas', CANVAS],
    ['Moodle', MOODLE],
    ['D2L', D2L],
  ])('%s: every column has its row in INSTRUCTOR_FLOW.md', (_, columns) => {
    for (const c of columns) expect(doc).toContain(`| \`${c.name}\` |`);
  });
  test('the marks file’s columns are listed', () => {
    for (const c of MARK_COLUMNS) expect(doc).toContain(`\`${c}\``);
  });
});

describe('instructor marks', () => {
  test('the file lists exactly the written answers, with the marks entered', () => {
    expect(needsJudgment(records).map(x => x.question.sid)).toEqual(
      Array(2).fill(WRITTEN_SID)
    );
    const text = marksCsv(records, marks());
    golden('marks.csv', text);
    const rows = fromCsv(text);
    expect(rows[0]).toEqual([...MARK_COLUMNS]);
    expect(
      rows
        .slice(1)
        .every(r => r[rows[0].indexOf('entered_by')] === 'instructor')
    ).toBe(true);
    // Written answers stay out unless asked for.
    expect(text).not.toContain('speeds up near the star');
    expect(marksCsv(records, marks(), { includeWritten: true })).toContain(
      'speeds up near the star'
    );
  });

  test('a saved file reads back to the same marks, even a comment that was disarmed', () => {
    const m = marks();
    const back = readMarksCsv(marksCsv(records, m));
    expect(back.ok).toBe(true);
    expect(back.read).toBe(2);
    expect(
      back.marks.get(markKey(records[3].fingerprint, WRITTEN_SID))
    ).toEqual({
      points: 0.5,
      comment: '=Needs the second law',
    });
  });

  test('refuses what is not a marks file, and a file from another schema', () => {
    expect(readMarksCsv('a,b\r\n1,2\r\n').reason).toBe('notMarks');
    const wrong = marksCsv(records, marks()).replace(
      MARKS_SCHEMA,
      'gravitas.instructor-marks/9'
    );
    expect(readMarksCsv(wrong).reason).toBe('wrongSchema');
  });

  test('a mark above the points possible is skipped, not clamped silently', () => {
    const text = marksCsv(records, marks()).replace(',0.5,', ',99,');
    const back = readMarksCsv(text);
    expect(back.skipped).toBe(1);
    expect(back.read).toBe(1);
  });
});
