// =============================================================================
// Instructor marks: judgment, kept beside the automatic verdicts
// -----------------------------------------------------------------------------
// A written answer is the one thing a report holds that Gravitas cannot grade,
// and reading it is the part of marking that stays with a person. This is the
// record of that reading: a mark and a comment per written answer, entered by
// the instructor on the review page, exported in a file of its own whose every
// row says `entered_by: instructor`, and added to a gradebook score only by the
// adapters' model (./model.js), where it is labelled as theirs.
//
// Marks are never stored in the browser: a page that kept thirty students'
// prose and a marker's remarks between visits would be a database of student
// work nobody asked for. They live in the page while it is open and leave as a
// CSV the instructor saves and, a day later, drops back on the page. The row's
// key is the report's own fingerprint (js/submission/results.js) and the step's
// id, so the file finds its reports again whatever order they are handed in.
//
// The CSV passes through the same writer as every other export, so a comment
// that starts with `=` is disarmed like any field (js/csv.js).
// =============================================================================

import { fromCsv, num, toCsv } from '../csv.js';

/** What the marks file says it is, in its `schema` column. */
export const MARKS_SCHEMA = 'gravitas.instructor-marks/1';

/** The columns, in order. */
export const MARK_COLUMNS = Object.freeze([
  'schema',
  'submission',
  'fingerprint',
  'roster_id',
  'assignment_id',
  'name_as_typed',
  'lesson_id',
  'step_id',
  'step_title',
  'auto_verdict',
  'entered_by',
  'mark',
  'points_possible',
  'comment',
  'response_status',
  'response',
]);

/** The longest comment kept. */
export const MAX_COMMENT = 500;

/** The key of one mark: a report and a step. */
export const markKey = (fingerprint, sid) => `${fingerprint}\u0000${sid}`;

/**
 * Put a mark in. A mark with no points and no comment removes the entry.
 * @param {Map<string, object>} marks - From marksIndex()
 * @param {string} fingerprint - The report's
 * @param {string} sid - The step's
 * @param {{points: ?number, comment: ?string}} value - What was entered
 * @param {number} [possible] - The most the step is worth, when known
 * @returns {boolean} Whether the mark was kept (a bad number is not)
 */
export function setMark(marks, fingerprint, sid, value, possible = Infinity) {
  const points =
    value.points === null || value.points === undefined || value.points === ''
      ? null
      : Number(value.points);
  if (
    points !== null &&
    (!Number.isFinite(points) || points < 0 || points > possible)
  )
    return false;
  const comment = String(value.comment ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_COMMENT);
  const key = markKey(fingerprint, sid);
  if (points === null && !comment) marks.delete(key);
  else marks.set(key, { points, comment });
  return true;
}

/**
 * Whether a question is a written answer an instructor has to read and mark.
 *
 * checkAnswer() returns null for anything that is not a choice or a number, so
 * "unmarked" also covers a measure step, whose answer is a row of fields such
 * as `circ_e=1.5; ...`. That is a record of what the student measured, not
 * prose to mark, and counting it overstated the marking load (P81 R-2). A
 * record that does not say what kind of step it came from (older fixtures) is
 * a written answer unless its step type is `measure`.
 *
 * @param {object} q - A question from gradeSubmission()
 * @returns {boolean} Whether to ask the instructor for a mark
 */
export const isWrittenAnswer = q =>
  q.verdict === 'unmarked' &&
  q.response !== null &&
  (q.kind ? q.kind === 'short' : q.type !== 'measure');

/**
 * The written answers a person has to read: every question the machine could
 * not judge and that has an answer.
 * @param {Array<object>} records - From annotate()
 * @returns {Array<{record: object, question: object}>}
 */
export const needsJudgment = records =>
  records
    .filter(r => r.duplicateOf === null || r.duplicateOf === undefined)
    .flatMap(record =>
      record.questions
        .filter(isWrittenAnswer)
        .map(question => ({ record, question }))
    );

/**
 * The marks file: a row for every written answer, with its mark if it has one.
 *
 * @param {Array<object>} records - From annotate()
 * @param {Map<string, object>} marks - Marks entered so far
 * @param {object} [options] - Options
 * @param {boolean} [options.includeWritten] - Write the answers too (opt-in)
 * @returns {string} CSV, CRLF, header first
 */
export function marksCsv(records, marks, { includeWritten = false } = {}) {
  const rows = [MARK_COLUMNS];
  for (const { record: r, question: q } of needsJudgment(records)) {
    const m = marks.get(markKey(r.fingerprint, q.sid));
    const cells = {
      schema: MARKS_SCHEMA,
      submission: r.submission,
      fingerprint: r.fingerprint,
      roster_id: r.rosterId,
      assignment_id: r.assignmentId,
      name_as_typed: r.nameAsTyped,
      lesson_id: r.lessonId,
      step_id: q.sid,
      step_title: q.title,
      auto_verdict: q.verdict,
      entered_by: 'instructor',
      mark: m && m.points !== null ? num(m.points, 6) : '',
      points_possible: q.pointsPossible,
      comment: m?.comment ?? '',
      response_status: includeWritten ? 'written' : 'withheld',
      response: includeWritten ? q.response : null,
    };
    rows.push(MARK_COLUMNS.map(c => cells[c]));
  }
  return toCsv(rows);
}

/**
 * Read marks back from a file this page wrote.
 *
 * @param {string} text - The CSV
 * @param {Map<string, object>} [into] - Marks to add to
 * @returns {{ok: boolean, reason: ?string, read: number, skipped: number,
 *   marks: Map<string, object>}} How many rows were taken and how many not
 */
export function readMarksCsv(text, into = new Map()) {
  const rows = fromCsv(String(text ?? ''));
  const head = rows[0] || [];
  if (!head.includes('schema') || !head.includes('fingerprint'))
    return { ok: false, reason: 'notMarks', read: 0, skipped: 0, marks: into };
  const at = Object.fromEntries(head.map((c, i) => [c, i]));
  let read = 0;
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.length === 1 && row[0] === '') continue;
    if (row[at.schema] !== MARKS_SCHEMA) {
      return {
        ok: false,
        reason: 'wrongSchema',
        read: 0,
        skipped: 0,
        marks: into,
      };
    }
    const fingerprint = row[at.fingerprint];
    const sid = row[at.step_id];
    const raw = row[at.mark] ?? '';
    const possible = Number(row[at.points_possible]);
    if (
      !fingerprint ||
      !sid ||
      !setMark(
        into,
        fingerprint,
        sid,
        { points: raw === '' ? null : raw, comment: row[at.comment] },
        Number.isFinite(possible) ? possible : Infinity
      )
    ) {
      skipped++;
      continue;
    }
    read++;
  }
  return { ok: true, reason: null, read, skipped, marks: into };
}

/** A fresh index. */
export const marksIndex = () => new Map();
