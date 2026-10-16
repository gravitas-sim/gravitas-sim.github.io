// =============================================================================
// The gradebook result: one model, three adapters
// -----------------------------------------------------------------------------
// The review page grades a pile of reports into annotated records
// (js/submission/results.js). A gradebook wants something narrower: one score
// per student per Activity. This module is that reduction and nothing else; the
// Canvas, Moodle and D2L adapters (./canvas.js, ./moodle.js, ./d2l.js) are
// projections of what it returns, so the three files cannot disagree about a
// student's score, and none of them reads the screen.
//
// What it decides, and says it decided
// -----------------------------------------------------------------------------
// Three things a record does not settle, each one a policy that belongs to the
// instructor and is therefore a named option rather than a default buried here:
//
//   Who a row is.  A token proves a browser produced these answers, not who
//     typed them. `roster` takes the id the link carried (right when each
//     student has a link of their own); `name` takes the name the student
//     typed into the report (right when one class code covers everyone and the
//     students were asked to type their login or student number there). Rows
//     are grouped on exactly that text, trimmed; nothing is matched loosely,
//     and a row with no text is listed as skipped rather than guessed at.
//
//   Which attempt.  One score a student: the `latest` saved attempt, the
//     `best` by points or the `first`. A gradebook has no column for "two
//     attempts"; the number of attempts and the one used are carried in the
//     row so a file never hides that it chose.
//
//   Written answers.  They are the instructor's to read. A score counts them
//     only through marks the instructor entered (./marks.js), and the row says
//     how many are still unmarked; a score with unmarked written answers is
//     partial and is labelled so, never silently low.
//
// No DOM, no storage, no network.
// =============================================================================

import { isWrittenAnswer, markKey } from './marks.js';

/** What the canonical rows say they are. */
export const GRADEBOOK_SCHEMA = 'gravitas.gradebook-result/1';

/** Where a row's identifier is read from. */
export const IDENTIFIERS = Object.freeze(['roster', 'name']);

/** Which attempt a student's one score is. */
export const POLICIES = Object.freeze(['latest', 'best', 'first']);

/**
 * The words feedback is written in. The review page passes its own catalog's;
 * these are the English the tests and the golden files use.
 */
export const ENGLISH = Object.freeze({
  auto: 'Gravitas checked {checked} answers and {correct} were correct ({points} of {possible} points).',
  written:
    'Written answers marked by the instructor: {n}, {points} points (entered by the instructor, not checked by Gravitas).',
  awaiting: 'Written answers still without a mark: {n}; this score is partial.',
  attempts: 'Attempt {used} of {n} counted.',
  comment: 'Instructor comment: {text}',
  changed: 'Some steps changed after this report was saved.',
  evidence: 'The evidence table did not match its digest.',
});

/**
 * The roster ids that more than one typed name sits under.
 *
 * The activity builder asks for a class code, and every student of the class
 * then carries the same one. Matching on it merges the class into a single
 * grade row, the worst outcome of the flow (P81 R-1). So before an export the
 * page asks whether any roster id covers more than one name, and defaults to
 * the typed name when it does. Names compare as the gradebook compares them,
 * trimmed, and ignoring case here only so "Ada" and "ada" are not called two
 * people; an exact-text match is still what the export uses.
 *
 * @param {Array<object>} records - From annotate()
 * @returns {Array<{rosterId: string, names: string[]}>} Ids with several names
 */
export function rosterMerges(records) {
  const byRoster = new Map();
  for (const r of records) {
    if (r.duplicateOf !== null && r.duplicateOf !== undefined) continue;
    const id = String(r.rosterId ?? '').trim();
    const name = String(r.nameAsTyped ?? '').trim();
    if (!id || !name) continue;
    if (!byRoster.has(id)) byRoster.set(id, new Map());
    byRoster.get(id).set(name.toLowerCase(), name);
  }
  return [...byRoster]
    .filter(([, names]) => names.size > 1)
    .map(([rosterId, names]) => ({ rosterId, names: [...names.values()] }));
}

const fill = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (whole, k) =>
    Object.hasOwn(vars, k) ? String(vars[k]) : whole
  );

/**
 * Reduce annotated records to one canonical row per student per Activity.
 *
 * @param {Array<object>} records - From annotate()
 * @param {object} [options] - How to reduce them
 * @param {'roster'|'name'} [options.identifier] - Where the id comes from
 * @param {'latest'|'best'|'first'} [options.policy] - Which attempt
 * @param {Map<string, object>} [options.marks] - From ./marks.js marksIndex()
 * @param {Map<string, {title: string}>} [options.activities] - Names by
 *   assignment id, from the Activity or Course the instructor loaded
 * @returns {{schema: string, identifier: string, policy: string,
 *   activities: Array<{key: string, id: ?string, title: string,
 *   pointsPossible: number}>, rows: Array<object>,
 *   skipped: Array<{submission: number, name: ?string, activity: string}>}}
 */
export function gradebookModel(
  records,
  {
    identifier = 'roster',
    policy = 'latest',
    marks = new Map(),
    activities = new Map(),
  } = {}
) {
  const idOf = r =>
    String((identifier === 'name' ? r.nameAsTyped : r.rosterId) ?? '').trim();
  const keyOf = r =>
    r.assignmentId ? `a:${r.assignmentId}` : `l:${r.lessonId}`;

  const columns = new Map();
  const skipped = [];
  const groups = new Map();
  for (const r of records) {
    // The same report handed in twice is one report.
    if (r.duplicateOf !== null && r.duplicateOf !== undefined) continue;
    const key = keyOf(r);
    if (!columns.has(key)) {
      columns.set(key, {
        key,
        id: r.assignmentId || null,
        title:
          (r.assignmentId && activities.get(r.assignmentId)?.title) ||
          (r.assignmentId ? r.assignmentId : r.lessonTitle),
        pointsPossible: r.pointsPossible,
      });
    } else {
      // The most any report of this Activity could earn: a student who was
      // shown a changed lesson may have fewer questions than another.
      const c = columns.get(key);
      c.pointsPossible = Math.max(c.pointsPossible, r.pointsPossible);
    }
    const who = idOf(r);
    if (!who) {
      skipped.push({
        submission: r.submission,
        name: r.nameAsTyped ?? null,
        activity: columns.get(key).title,
      });
      continue;
    }
    const gk = JSON.stringify([who, key]);
    if (!groups.has(gk)) groups.set(gk, { who, key, list: [] });
    groups.get(gk).list.push(r);
  }

  const scored = r => {
    let manual = 0;
    let marked = 0;
    let awaiting = 0;
    const comments = [];
    for (const q of r.questions) {
      if (!isWrittenAnswer(q)) continue;
      const m = marks.get(markKey(r.fingerprint, q.sid));
      if (m && m.points !== null) {
        manual += Math.min(Math.max(m.points, 0), q.pointsPossible ?? m.points);
        marked++;
      } else awaiting++;
      if (m?.comment) comments.push(m.comment);
    }
    const auto = r.points ?? 0;
    return { auto, manual, marked, awaiting, comments, points: auto + manual };
  };

  const rows = [];
  for (const { who, key, list } of groups.values()) {
    const ordered = [...list].sort(
      (a, b) =>
        (a.savedAt ? Date.parse(a.savedAt) : Infinity) -
          (b.savedAt ? Date.parse(b.savedAt) : Infinity) ||
        a.submission - b.submission
    );
    const withScore = ordered.map(r => ({ r, s: scored(r) }));
    let pick = withScore.at(-1);
    if (policy === 'first') pick = withScore[0];
    if (policy === 'best')
      pick = withScore.reduce((a, b) => (b.s.points >= a.s.points ? b : a));
    const { r, s } = pick;
    const column = columns.get(key);
    rows.push({
      identifier: who,
      nameAsTyped: r.nameAsTyped ?? null,
      rosterId: r.rosterId ?? null,
      activityKey: key,
      activity: column.title,
      lessonId: r.lessonId,
      submission: r.submission,
      fingerprint: r.fingerprint,
      savedAt: r.savedAt ?? null,
      attemptsConsidered: ordered.length,
      attemptUsed: ordered.indexOf(r) + 1,
      checked: r.correct + r.incorrect,
      correct: r.correct,
      autoPoints: s.auto,
      instructorPoints: s.marked ? s.manual : null,
      instructorMarked: s.marked,
      awaiting: s.awaiting,
      instructorComments: s.comments,
      points: s.points,
      pointsPossible: r.pointsPossible,
      percent: r.pointsPossible > 0 ? s.points / r.pointsPossible : null,
      completion: r.completion,
      changedSteps: r.changedSteps,
      evidenceMismatch: r.evidence?.state === 'mismatch',
    });
  }
  // A stable order: by Activity as first met, then by the identifier as text.
  const order = [...columns.keys()];
  rows.sort(
    (a, b) =>
      order.indexOf(a.activityKey) - order.indexOf(b.activityKey) ||
      (a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0)
  );
  return {
    schema: GRADEBOOK_SCHEMA,
    identifier,
    policy,
    activities: [...columns.values()],
    rows,
    skipped,
  };
}

/**
 * The feedback a row carries into a gradebook that has a place for words.
 * Instructor-entered text is labelled as such and Gravitas's own is not.
 *
 * @param {object} row - From gradebookModel()
 * @param {object} [words] - The sentences, {name} placeholders; English default
 * @returns {string} One paragraph
 */
export function feedbackOf(row, words = ENGLISH) {
  const w = { ...ENGLISH, ...words };
  const parts = [
    fill(w.auto, {
      correct: row.correct,
      checked: row.checked,
      points: round(row.autoPoints),
      possible: round(row.pointsPossible),
    }),
  ];
  if (row.instructorMarked)
    parts.push(
      fill(w.written, {
        n: row.instructorMarked,
        points: round(row.instructorPoints),
      })
    );
  if (row.awaiting) parts.push(fill(w.awaiting, { n: row.awaiting }));
  if (row.attemptsConsidered > 1)
    parts.push(
      fill(w.attempts, { used: row.attemptUsed, n: row.attemptsConsidered })
    );
  for (const c of row.instructorComments)
    parts.push(fill(w.comment, { text: c }));
  if (row.changedSteps) parts.push(w.changed);
  if (row.evidenceMismatch) parts.push(w.evidence);
  return parts.join(' ');
}

/** A score for a file: at most two decimals, never a trailing zero. */
export const round = v => (Number.isFinite(v) ? Math.round(v * 100) / 100 : '');

/** A score as a percentage with two decimals. */
export const percentOf = row =>
  row.percent === null ? '' : Math.round(row.percent * 10000) / 100;

/**
 * Put a row's score where a gradebook wants it.
 * @param {object} row - From gradebookModel()
 * @param {'points'|'percent'} scale - Points earned, or a percentage
 * @returns {number|string} The value, or '' when there is none to give
 */
export const scoreOf = (row, scale) =>
  scale === 'percent' ? percentOf(row) : round(row.points);

/**
 * The rows laid out the way every gradebook wants them: a line per student and
 * a column per Activity, a cell empty where that student has no report.
 *
 * @param {object} model - From gradebookModel()
 * @returns {{students: Array<{identifier: string, name: ?string,
 *   cells: Map<string, object>}>, titles: Map<string, string>}} `titles` are
 *   the Activities' column names, made distinct where two share a title
 */
export function wide(model) {
  const students = new Map();
  for (const row of model.rows) {
    if (!students.has(row.identifier))
      students.set(row.identifier, {
        identifier: row.identifier,
        name: row.nameAsTyped,
        cells: new Map(),
      });
    students.get(row.identifier).cells.set(row.activityKey, row);
  }
  const used = new Map();
  const titles = new Map();
  for (const a of model.activities) {
    const n = (used.get(a.title) ?? 0) + 1;
    used.set(a.title, n);
    titles.set(a.key, n === 1 ? a.title : `${a.title} (${n})`);
  }
  return { students: [...students.values()], titles };
}
