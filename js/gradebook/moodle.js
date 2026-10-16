// =============================================================================
// Moodle: the grade import file
// -----------------------------------------------------------------------------
// Moodle's Grades > Import reads a CSV and asks the instructor to say, column by
// column, what each one is: which column identifies the student (and by what:
// ID number, username or email address) and which are grade items or feedback.
// So the header words here are labels for that mapping step rather than
// reserved names, and the file is the same whatever the course calls things.
//
// It has been written from Moodle's documentation of that import and has not
// been run against a live Moodle: import one student's row first.
//
// Scale. Moodle imports a value as the raw grade, and a grade item it makes
// from the import has a maximum of 100 unless set otherwise, so the default
// here is a percentage (`scale: 'percent'`); choose `points` after setting the
// item's maximum to the points possible (the page says what that is).
//
// Feedback. Each Activity gets a second column of words (what Gravitas checked,
// the instructor's own marks and remarks, labelled as theirs) to be mapped as
// that item's feedback.
// =============================================================================

import { toCsv } from '../csv.js';
import { feedbackOf, scoreOf, wide } from './model.js';

/** Which of Moodle's identifying fields the identifier is. */
export const ID_COLUMNS = Object.freeze([
  'ID number',
  'Username',
  'Email address',
]);

/** The columns, as the instructor-flow document lists them. */
export const COLUMNS = Object.freeze([
  {
    name: 'ID number | Username | Email address',
    from: 'the identifier; the header is the field idColumn names (ID number by default)',
    note: 'Map this column to the same field on the import page.',
  },
  {
    name: 'Name as typed',
    from: 'name_as_typed',
    note: 'Not an identifier; map it to Ignore.',
  },
  {
    name: '<Activity name>',
    from: 'a percentage by default, or points',
    note: 'Map to a new or existing grade item.',
  },
  {
    name: '<Activity name> feedback',
    from: 'the row summary in words, with the instructor-entered parts labelled',
    note: 'Map to that item as feedback.',
  },
]);

/**
 * @param {object} model - From gradebookModel()
 * @param {object} [options] - Options
 * @param {string} [options.idColumn] - One of ID_COLUMNS
 * @param {'points'|'percent'} [options.scale] - Percent by default
 * @param {object} [options.words] - Feedback sentences (./model.js ENGLISH)
 * @returns {string} CSV, CRLF, header first
 */
export function moodleCsv(
  model,
  { idColumn = 'ID number', scale = 'percent', words } = {}
) {
  const col = ID_COLUMNS.includes(idColumn) ? idColumn : ID_COLUMNS[0];
  const { students, titles } = wide(model);
  const keys = model.activities.map(a => a.key);
  const head = [col, 'Name as typed'];
  for (const k of keys) head.push(titles.get(k), `${titles.get(k)} feedback`);
  const rows = [head];
  for (const s of students) {
    const cells = [s.identifier, s.name ?? ''];
    for (const k of keys) {
      const row = s.cells.get(k);
      cells.push(
        row ? scoreOf(row, scale) : '',
        row ? feedbackOf(row, words) : ''
      );
    }
    rows.push(cells);
  }
  return toCsv(rows);
}
