// =============================================================================
// Submission results: one model, two exports
// -----------------------------------------------------------------------------
// The review page grades a pile of lab reports into one table on screen. An
// instructor also needs the pile as data - to put next to a gradebook, to hand
// to a teaching assistant, to keep - and that is this module: the graded record
// of every accepted submission, and the CSV and JSON written from it.
//
// It is one model on purpose. A CSV built by walking the screen table and a
// JSON built by walking the submissions would be two derivations that agree
// until the day they do not; here the summary rows, the question rows and the
// JSON document are all projections of the same records. An adapter for a
// particular gradebook, when one is written, reads that model or the JSON and
// never the screen.
//
// No DOM, no storage, no network. Everything here is a function of what was
// handed in, so the page, the tests and any future tool compute the same thing.
//
// What a record can and cannot say
// -----------------------------------------------------------------------------
// A token proves that a browser running Gravitas produced these answers to this
// lesson. It does not prove who. `name_as_typed` is what the student typed into
// the report and is exported as exactly that; `roster_id` is what the
// instructor's link or assignment put there. Neither is identity, and nothing
// here infers identity from anything else.
//
// So repeated attempts are grouped only where there is something to group by:
// the same roster id, assignment and lesson. Without a roster id there is no
// group, only a warning - two reports with the same typed name are two reports,
// and deciding otherwise would be guessing. And a group is never collapsed:
// every attempt keeps its row, numbered by when it was saved, and nothing here
// chooses a winner or combines a grade across attempts. That is a policy, and
// it belongs to the instructor.
//
// An exact duplicate - the same report dropped twice, or a PDF and the token
// pasted out of it - is recognised by comparing the submissions themselves,
// not a hash of them, and is kept and marked rather than dropped.
//
// Written answers
// -----------------------------------------------------------------------------
// A written answer is the one thing in a report that is the student's own
// prose, and it is excluded from both exports unless the instructor asks for
// it. Machine-checked answers - a number, a chosen option - are exported by
// default: they are what the verdict was reached from. Every question row says
// which it did, so a blank response is never ambiguous.
// =============================================================================

import { checkAnswer } from '../answerCheck.js';
import { toCsv } from '../csv.js';
import { gradedSteps } from '../data/investigations/catalog.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import { answersOf } from './submissionToken.js';

/** What the JSON export says it is. */
export const RESULTS_KIND = 'gravitas.submission-results';

/**
 * The export schema. Bump it when a column or field changes meaning or goes
 * away; adding a column at the end is not a change a reader must handle.
 */
export const RESULTS_VERSION = 1;

/** Written into the `schema` column of every CSV row. */
export const RESULTS_SCHEMA_ID = `${RESULTS_KIND}/${RESULTS_VERSION}`;

/** Verdicts a question row can carry. */
export const VERDICTS = Object.freeze([
  'correct',
  'incorrect',
  'unmarked',
  'incomplete',
  'stale',
]);

/** Warnings a summary row can carry, in the order they are listed. */
export const WARNINGS = Object.freeze([
  'noRosterId',
  'exactDuplicate',
  'repeatedAttempt',
  'changedSteps',
  'staleAnswers',
]);

/** One row per accepted submission. */
export const SUMMARY_COLUMNS = Object.freeze([
  'schema',
  'submission',
  'fingerprint',
  'source_kind',
  'source_label',
  'roster_id',
  'assignment_id',
  'name_as_typed',
  'lesson_id',
  'lesson_title',
  'lesson_version',
  'lesson_steps',
  'recorded_steps',
  'changed_steps',
  'submission_schema',
  'backup_version',
  'saved_at',
  'fallback_locale',
  'answer_locales',
  'visited_steps',
  'completion',
  'scorable',
  'correct',
  'incorrect',
  'unmarked',
  'incomplete',
  'stale',
  'duplicate_of',
  'attempt_group',
  'attempt_number',
  'attempts_in_group',
  'warnings',
]);

/** One row per graded step of every accepted submission. */
export const QUESTION_COLUMNS = Object.freeze([
  'schema',
  'submission',
  'roster_id',
  'assignment_id',
  'lesson_id',
  'step_number',
  'step_id',
  'step_type',
  'step_title',
  'verdict',
  'attempts',
  'answer_locale',
  'step_changed',
  'response_status',
  'response',
]);

/**
 * A string that is the same for the same data, whatever order its keys were
 * written in.
 *
 * @param {*} value - JSON-compatible value
 * @returns {string} Canonical JSON
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * A short label for a submission, for a person to match rows by.
 *
 * Not a security property and not what duplicates are decided by - that is an
 * exact comparison of the submissions. This is a 53-bit string hash (cyrb53),
 * which is plenty to tell thirty reports apart at a glance and says nothing
 * about who made them.
 *
 * @param {string} text - Canonical JSON of a submission
 * @returns {string} 14 hex digits
 */
export function fingerprintOf(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/**
 * Which version of a lesson a set of steps is.
 *
 * The same fingerprints the progress backup keeps per step, reduced to one
 * label. Two exports that show the same lesson_version graded against the same
 * questions; a different one means the lesson changed between them.
 *
 * @param {Array<object>} steps - Lesson steps
 * @returns {string} A 14-digit label
 */
export function lessonVersionOf(steps) {
  return fingerprintOf((steps || []).map(stepFingerprint).join('\n'));
}

/**
 * Grade one submission against the lesson it names.
 *
 * Every graded step of the lesson gets a row, answered or not, so "did not
 * answer" is a verdict (`incomplete`) rather than an absence. An answer to a
 * step the lesson no longer has is `stale`: the report is older than this
 * build, and that is not the student's fault. Each answer is checked under the
 * locale it was typed in, because a Spanish decimal comma is not an error.
 *
 * @param {object} submission - A validated submission payload
 * @param {object} lesson - The lesson it names
 * @param {object} source - Where it came from
 * @param {'token'|'pdf'|'backup'} source.kind - What was handed in
 * @param {string} source.label - The file name, or "pasted token"
 * @returns {object} The graded record
 */
export function gradeSubmission(submission, lesson, { kind, label }) {
  const backup = submission.b;
  const steps = lesson.steps || [];
  const graded = gradedSteps(lesson);
  const gradedIds = new Set(graded.map(s => s.sid));
  const answers = new Map(answersOf(submission).map(a => [a.sid, a]));
  const attempts = backup.progress?.attempts || {};

  // Which steps have been rewritten under their own id since the report was
  // saved. The backup keeps each step's fingerprint for exactly this.
  const recorded = new Map(
    (Array.isArray(backup.steps) ? backup.steps : [])
      .filter(s => s && s.sid)
      .map(s => [s.sid, s.fingerprint])
  );
  const changed = new Set(
    steps
      .filter(
        s => recorded.has(s.sid) && recorded.get(s.sid) !== stepFingerprint(s)
      )
      .map(s => s.sid)
  );

  const questions = [];
  for (const step of graded) {
    const answer = answers.get(step.sid);
    const has =
      answer &&
      answer.value !== undefined &&
      answer.value !== null &&
      String(answer.value).trim() !== '';
    let verdict = 'incomplete';
    if (has) {
      let ok = null;
      try {
        ok = checkAnswer(step, answer.value, { locale: answer.locale });
      } catch {
        ok = null;
      }
      // checkAnswer returns null for anything it cannot judge, which is most
      // written answers. Those are the instructor's to read.
      verdict =
        ok === true ? 'correct' : ok === false ? 'incorrect' : 'unmarked';
    }
    questions.push({
      stepNumber: steps.indexOf(step) + 1,
      sid: step.sid,
      type: step.type,
      title: step.title || step.sid,
      verdict,
      attempts: attempts[step.sid] ?? null,
      locale: has ? answer.locale : null,
      changed: changed.has(step.sid),
      response: has ? String(answer.value) : null,
    });
  }
  // Answers the lesson has no step for, after every step it does.
  for (const [sid, answer] of answers) {
    if (gradedIds.has(sid) || steps.some(s => s.sid === sid)) continue;
    questions.push({
      stepNumber: null,
      sid,
      type: null,
      title: sid,
      verdict: 'stale',
      attempts: attempts[sid] ?? null,
      locale: answer.locale,
      changed: false,
      response: String(answer.value ?? ''),
    });
  }

  const count = v => questions.filter(q => q.verdict === v).length;
  const visited = Array.isArray(backup.progress?.visited)
    ? new Set(backup.progress.visited).size
    : 0;
  const canonical = canonicalJson(submission);
  const locales = [
    ...new Set(questions.map(q => q.locale).filter(Boolean)),
  ].sort();

  return {
    canonical,
    fingerprint: fingerprintOf(canonical),
    source: { kind, label: String(label || '') },
    rosterId: submission.r || null,
    assignmentId: submission.a || null,
    nameAsTyped: backup.student || null,
    lessonId: lesson.id,
    lessonTitle: lesson.title || lesson.id,
    lessonVersion: lessonVersionOf(steps),
    lessonSteps: steps.length,
    recordedSteps: Number.isInteger(backup.lesson?.stepCount)
      ? backup.lesson.stepCount
      : null,
    changedSteps: changed.size,
    submissionSchema: kind === 'backup' ? null : submission.v,
    backupVersion: backup.version ?? null,
    savedAt: backup.savedAt || null,
    fallbackLocale: submission.fl || 'en',
    answerLocales: locales,
    visitedSteps: Math.min(visited, steps.length),
    completion: steps.length
      ? Math.min(visited, steps.length) / steps.length
      : 0,
    scorable: graded.length,
    correct: count('correct'),
    incorrect: count('incorrect'),
    unmarked: count('unmarked'),
    incomplete: count('incomplete'),
    stale: count('stale'),
    questions,
  };
}

/**
 * Number the records and relate them to one another.
 *
 * Adds `submission` (1-based, in the order accepted), `duplicateOf`, the
 * attempt group and its numbering, and `warnings`. Returns new objects; the
 * inputs are not touched, so re-annotating after another file arrives is safe.
 *
 * @param {Array<object>} records - From gradeSubmission(), in accepted order
 * @returns {Array<object>} Annotated records, same order
 */
export function annotate(records) {
  const out = records.map((r, i) => ({ ...r, submission: i + 1 }));

  const firstSeen = new Map();
  for (const r of out) {
    if (firstSeen.has(r.canonical)) r.duplicateOf = firstSeen.get(r.canonical);
    else {
      firstSeen.set(r.canonical, r.submission);
      r.duplicateOf = null;
    }
  }

  // Repeated attempts: same roster id, assignment and lesson, different
  // submissions. Exact duplicates are not attempts, so they take the number of
  // the submission they repeat rather than one of their own.
  const groups = new Map();
  for (const r of out) {
    if (!r.rosterId) continue;
    const key = JSON.stringify([r.rosterId, r.assignmentId, r.lessonId]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  let groupNumber = 0;
  for (const members of groups.values()) {
    const distinct = members.filter(r => r.duplicateOf === null);
    for (const r of members) {
      r.attemptGroup = null;
      r.attemptNumber = null;
      r.attemptsInGroup = null;
    }
    if (distinct.length < 2) continue;
    groupNumber++;
    // By when it was saved, then by when it was handed in. A report with no
    // saved time sorts last rather than being guessed into place.
    const ordered = [...distinct].sort(
      (a, b) =>
        (a.savedAt ? Date.parse(a.savedAt) : Infinity) -
          (b.savedAt ? Date.parse(b.savedAt) : Infinity) ||
        a.submission - b.submission
    );
    ordered.forEach((r, i) => {
      r.attemptNumber = i + 1;
    });
    for (const r of members) {
      r.attemptGroup = groupNumber;
      r.attemptsInGroup = distinct.length;
      if (r.duplicateOf !== null) {
        r.attemptNumber = out[r.duplicateOf - 1].attemptNumber;
      }
    }
  }

  for (const r of out) {
    r.attemptGroup ??= null;
    r.attemptNumber ??= null;
    r.attemptsInGroup ??= null;
    const w = [];
    if (!r.rosterId) w.push('noRosterId');
    if (r.duplicateOf !== null) w.push('exactDuplicate');
    if (r.attemptGroup !== null) w.push('repeatedAttempt');
    if (r.changedSteps > 0) w.push('changedSteps');
    if (r.stale > 0) w.push('staleAnswers');
    r.warnings = w;
  }
  return out;
}

/** A proportion as a plain decimal, the way a spreadsheet wants it. */
const ratio = v =>
  Number.isFinite(v) ? String(Math.round(v * 10000) / 10000) : '';

/**
 * The summary CSV.
 *
 * @param {Array<object>} records - From annotate()
 * @returns {string} CSV with CRLF line endings, header first
 */
export function summaryCsv(records) {
  const rows = [SUMMARY_COLUMNS];
  for (const r of records) {
    const cells = {
      schema: RESULTS_SCHEMA_ID,
      submission: r.submission,
      fingerprint: r.fingerprint,
      source_kind: r.source.kind,
      source_label: r.source.label,
      roster_id: r.rosterId,
      assignment_id: r.assignmentId,
      name_as_typed: r.nameAsTyped,
      lesson_id: r.lessonId,
      lesson_title: r.lessonTitle,
      lesson_version: r.lessonVersion,
      lesson_steps: r.lessonSteps,
      recorded_steps: r.recordedSteps,
      changed_steps: r.changedSteps,
      submission_schema: r.submissionSchema,
      backup_version: r.backupVersion,
      saved_at: r.savedAt,
      fallback_locale: r.fallbackLocale,
      answer_locales: r.answerLocales.join(' '),
      visited_steps: r.visitedSteps,
      completion: ratio(r.completion),
      scorable: r.scorable,
      correct: r.correct,
      incorrect: r.incorrect,
      unmarked: r.unmarked,
      incomplete: r.incomplete,
      stale: r.stale,
      duplicate_of: r.duplicateOf,
      attempt_group: r.attemptGroup,
      attempt_number: r.attemptNumber,
      attempts_in_group: r.attemptsInGroup,
      warnings: r.warnings.join(' '),
    };
    rows.push(SUMMARY_COLUMNS.map(c => cells[c]));
  }
  return toCsv(rows);
}

/**
 * What a question row may say about the response, and the response itself.
 *
 * @param {object} q - A question from gradeSubmission()
 * @param {boolean} includeWritten - Whether written answers were asked for
 * @returns {{status: string, text: ?string}} What to write
 */
function responseFor(q, includeWritten) {
  if (q.response === null) return { status: 'none', text: null };
  const machineChecked = q.verdict === 'correct' || q.verdict === 'incorrect';
  if (machineChecked || includeWritten) {
    return { status: machineChecked ? 'checked' : 'written', text: q.response };
  }
  return { status: 'withheld', text: null };
}

/**
 * The question-level CSV: one row per graded step of every submission.
 *
 * @param {Array<object>} records - From annotate()
 * @param {object} [options] - What to include
 * @param {boolean} [options.includeWritten] - Export written answers too
 * @returns {string} CSV with CRLF line endings, header first
 */
export function questionCsv(records, { includeWritten = false } = {}) {
  const rows = [QUESTION_COLUMNS];
  for (const r of records) {
    for (const q of r.questions) {
      const response = responseFor(q, includeWritten);
      const cells = {
        schema: RESULTS_SCHEMA_ID,
        submission: r.submission,
        roster_id: r.rosterId,
        assignment_id: r.assignmentId,
        lesson_id: r.lessonId,
        step_number: q.stepNumber,
        step_id: q.sid,
        step_type: q.type,
        step_title: q.title,
        verdict: q.verdict,
        attempts: q.attempts,
        answer_locale: q.locale,
        step_changed: q.changed ? 'yes' : 'no',
        response_status: response.status,
        response: response.text,
      };
      rows.push(QUESTION_COLUMNS.map(c => cells[c]));
    }
  }
  return toCsv(rows);
}

/**
 * The JSON export: every record with its questions, and everything refused.
 *
 * @param {Array<object>} records - From annotate()
 * @param {object} [options] - What to include
 * @param {boolean} [options.includeWritten] - Export written answers too
 * @param {Array<{label: string, reason: string}>} [options.refused] - Not read
 * @param {Date} [options.now] - For the timestamp; injectable for tests
 * @returns {string} Pretty-printed JSON with a trailing newline
 */
export function resultsJson(
  records,
  { includeWritten = false, refused = [], now = new Date() } = {}
) {
  const doc = {
    kind: RESULTS_KIND,
    version: RESULTS_VERSION,
    generatedAt: now.toISOString(),
    notice:
      'A submission token verifies answers and structure, not identity or ' +
      'authorship. name_as_typed is what the student typed; roster_id is ' +
      'what the assignment supplied.',
    options: { includeWritten },
    submissions: records.map(r => ({
      submission: r.submission,
      fingerprint: r.fingerprint,
      source: r.source,
      rosterId: r.rosterId,
      assignmentId: r.assignmentId,
      nameAsTyped: r.nameAsTyped,
      lesson: {
        id: r.lessonId,
        title: r.lessonTitle,
        version: r.lessonVersion,
        steps: r.lessonSteps,
        recordedSteps: r.recordedSteps,
        changedSteps: r.changedSteps,
      },
      submissionSchema: r.submissionSchema,
      backupVersion: r.backupVersion,
      savedAt: r.savedAt,
      fallbackLocale: r.fallbackLocale,
      answerLocales: r.answerLocales,
      visitedSteps: r.visitedSteps,
      completion: r.completion,
      counts: {
        scorable: r.scorable,
        correct: r.correct,
        incorrect: r.incorrect,
        unmarked: r.unmarked,
        incomplete: r.incomplete,
        stale: r.stale,
      },
      duplicateOf: r.duplicateOf,
      attempt:
        r.attemptGroup === null
          ? null
          : {
              group: r.attemptGroup,
              number: r.attemptNumber,
              of: r.attemptsInGroup,
            },
      warnings: r.warnings,
      questions: r.questions.map(q => {
        const response = responseFor(q, includeWritten);
        return {
          stepNumber: q.stepNumber,
          stepId: q.sid,
          stepType: q.type,
          stepTitle: q.title,
          verdict: q.verdict,
          attempts: q.attempts,
          answerLocale: q.locale,
          stepChanged: q.changed,
          responseStatus: response.status,
          response: response.text,
        };
      }),
    })),
    refused: refused.map(r => ({ label: r.label, reason: r.reason })),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}
