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

/**
 * The same file with a row per rubric criterion (Prompt 172). A file is /2 only
 * when it has such rows, so a class with no rubric criteria still writes the
 * /1 file byte for byte. A 2.0.0 reader says "a marks file of a different
 * version" to /2 and reads nothing, rather than reading the criterion rows as
 * if they were marks of the whole answer (tests/rubricSemantics.test.js runs
 * the 2.0.0 reader on one).
 */
export const MARKS_SCHEMA_RUBRIC = 'gravitas.instructor-marks/2';

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

/** The /2 file's columns: the /1 columns, then the criterion's. */
export const MARK_COLUMNS_RUBRIC = Object.freeze([
  ...MARK_COLUMNS,
  'criterion',
  'criterion_name',
  'criterion_kind',
  'criterion_weight',
]);

/**
 * What a rubric criterion claims (Prompt 172), the `kind` of a criterion:
 *   completion   an answer is there and speaks to the question
 *   correctness  the answer agrees with the key within the step's stated
 *                tolerance (the instructor judges it; a written answer has no
 *                machine verdict)
 *   reasoning    the explanation is present and sound, judged by the instructor
 *   uncertainty  the answer says how well the quantity is known
 * A criterion with no `kind` is `reasoning`: every criterion written before the
 * field existed was levels an instructor reads and judges. The list is held
 * equal to js/platform/questionBank.js's by tests/rubricSemantics.test.js (this
 * file cannot import it: the review page has no request to spare).
 */
export const CRITERION_KINDS = Object.freeze([
  'completion',
  'correctness',
  'reasoning',
  'uncertainty',
]);
export const DEFAULT_CRITERION_KIND = 'reasoning';

/** Depths, shallowest first (js/investigations/depthPure.js). */
const DEPTH_ORDER = ['core', 'quantitative', 'advanced'];
const depthRank = d => Math.max(0, DEPTH_ORDER.indexOf(d));

/**
 * A step's rubric criteria with their semantics filled in, those marked at
 * `depth`: a criterion with a `depth` is marked from that depth deeper, one
 * without is marked at every depth. `n` is the criterion's place among all the
 * step's criteria, whatever the depth, so a mark keeps meaning when a class
 * reads at another depth. Points possible is the best level's points, or 1 when
 * the levels carry none; `weight` is the criterion's relative share of the
 * step's rubric fraction (rubricFraction) and defaults to 1.
 *
 * Names are the lesson's text, not plain text: the caller plains them.
 *
 * @param {object} step - A step with `rubricCriteria`
 * @param {?string} [depth] - The depth the report was read at; every
 *   criterion when omitted
 * @returns {Array<{n: number, name: string, kind: string, weight: number,
 *   depth: ?string, possible: number}>}
 */
export function criteriaPlan(step, depth = null) {
  const list = Array.isArray(step?.rubricCriteria) ? step.rubricCriteria : [];
  return list
    .map((c, i) => {
      const points = (Array.isArray(c?.levels) ? c.levels : [])
        .map(l => l?.points)
        .filter(Number.isFinite);
      return {
        n: i + 1,
        name: c?.name,
        kind: CRITERION_KINDS.includes(c?.kind)
          ? c.kind
          : DEFAULT_CRITERION_KIND,
        weight: Number.isFinite(c?.weight) && c.weight > 0 ? c.weight : 1,
        depth: DEPTH_ORDER.includes(c?.depth) ? c.depth : null,
        possible: points.length ? Math.max(...points) : 1,
      };
    })
    .filter(c => !depth || depthRank(c.depth) <= depthRank(depth));
}

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

/** The key of one criterion's mark: a report, a step and a criterion's place. */
export const criterionKey = (fingerprint, sid, n) =>
  markKey(fingerprint, `${sid}\u0000c${n}`);

/**
 * Put a criterion's mark in; the same rules as setMark, kept apart from the
 * step's own mark so a criterion never changes what a written answer scores.
 * @param {Map<string, object>} marks - From marksIndex()
 * @param {string} fingerprint - The report's
 * @param {string} sid - The step's
 * @param {number} n - The criterion's place (criteriaPlan's `n`)
 * @param {{points: ?number, comment: ?string}} value - What was entered
 * @param {number} [possible] - The most the criterion is worth
 * @returns {boolean} Whether the mark was kept
 */
export const setCriterionMark = (
  marks,
  fingerprint,
  sid,
  n,
  value,
  possible = Infinity
) => setMark(marks, fingerprint, `${sid}\u0000c${n}`, value, possible);

/**
 * The step's rubric as one fraction, from the criteria marks entered: the
 * weighted mean of each marked criterion's mark over its points possible.
 * `fraction` is null until every criterion in `plan` has a mark, so a rubric
 * with a criterion unread is partial and says so, never silently low. It
 * is a summary for a class view (Prompt 173) and is not added to the step's
 * score: the step's own mark stays the instructor's.
 *
 * @param {Map<string, object>} marks - From marksIndex()
 * @param {string} fingerprint - The report's
 * @param {string} sid - The step's
 * @param {Array<object>} plan - From criteriaPlan()
 * @returns {{fraction: ?number, marked: number, of: number,
 *   byKind: Object<string, ?number>}} `byKind` is the same fraction for the
 *   criteria of each kind present, null while one of them is unmarked
 */
export function rubricFraction(marks, fingerprint, sid, plan) {
  const part = list => {
    let top = 0;
    let marked = 0;
    for (const c of list) {
      const m = marks.get(criterionKey(fingerprint, sid, c.n));
      if (!m || m.points === null) continue;
      marked++;
      top += c.weight * (Math.min(m.points, c.possible) / c.possible);
    }
    const total = list.reduce((a, c) => a + c.weight, 0);
    return {
      marked,
      fraction: marked === list.length && list.length ? top / total : null,
    };
  };
  const all = part(plan);
  const byKind = {};
  for (const k of new Set(plan.map(c => c.kind)))
    byKind[k] = part(plan.filter(c => c.kind === k)).fraction;
  return {
    fraction: all.fraction,
    marked: all.marked,
    of: plan.length,
    byKind,
  };
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
 * A written answer whose step has rubric criteria is followed by a row for each
 * criterion marked at the report's depth (Prompt 172): the row names the
 * criterion, its kind and its weight, and its mark and comment are the
 * criterion's own. A file with such rows is /2; a file without any is /1.
 *
 * @param {Array<object>} records - From annotate()
 * @param {Map<string, object>} marks - Marks entered so far
 * @param {object} [options] - Options
 * @param {boolean} [options.includeWritten] - Write the answers too (opt-in)
 * @param {(record: object, question: object) => Array<object>} [options.criteriaOf] -
 *   The step's criteria at the report's depth, criteriaPlan()'s entries with
 *   the name as plain text; none when omitted
 * @returns {string} CSV, CRLF, header first
 */
export function marksCsv(
  records,
  marks,
  { includeWritten = false, criteriaOf = () => [] } = {}
) {
  const items = needsJudgment(records).map(({ record, question }) => ({
    record,
    question,
    plan: criteriaOf(record, question) || [],
  }));
  const rubric = items.some(i => i.plan.length);
  const columns = rubric ? MARK_COLUMNS_RUBRIC : MARK_COLUMNS;
  const rows = [columns];
  for (const { record: r, question: q, plan } of items) {
    const base = {
      schema: rubric ? MARKS_SCHEMA_RUBRIC : MARKS_SCHEMA,
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
      response_status: includeWritten ? 'written' : 'withheld',
      response: includeWritten ? q.response : null,
    };
    const m = marks.get(markKey(r.fingerprint, q.sid));
    const put = cells => rows.push(columns.map(c => cells[c] ?? ''));
    put({
      ...base,
      mark: m && m.points !== null ? num(m.points, 6) : '',
      points_possible: q.pointsPossible,
      comment: m?.comment ?? '',
      response: base.response,
    });
    for (const c of plan) {
      const cm = marks.get(criterionKey(r.fingerprint, q.sid, c.n));
      put({
        ...base,
        mark: cm && cm.points !== null ? num(cm.points, 6) : '',
        points_possible: c.possible,
        comment: cm?.comment ?? '',
        response: null,
        criterion: `c${c.n}`,
        criterion_name: c.name,
        criterion_kind: c.kind,
        criterion_weight: c.weight,
      });
    }
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
    if (
      row[at.schema] !== MARKS_SCHEMA &&
      row[at.schema] !== MARKS_SCHEMA_RUBRIC
    ) {
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
    const entered = {
      points: raw === '' ? null : raw,
      comment: row[at.comment],
    };
    const room = Number.isFinite(possible) ? possible : Infinity;
    // A /2 row with a criterion is that criterion's mark; any other row is the
    // answer's own, as in /1.
    const place = /^c(\d+)$/.exec(row[at.criterion] ?? '');
    if (
      !fingerprint ||
      !sid ||
      !(place
        ? setCriterionMark(
            into,
            fingerprint,
            sid,
            Number(place[1]),
            entered,
            room
          )
        : setMark(into, fingerprint, sid, entered, room))
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
