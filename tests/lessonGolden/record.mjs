// =============================================================================
// The Node half of the lesson-engine golden
// -----------------------------------------------------------------------------
// Records, for each investigation and activity cut that
// tools/lesson-coverage.mjs says is needed, in English and Spanish:
//
//   grading   a fixed answer set run through js/answerCheck.js, the grader the
//             panel, the report and the answer key all call
//   progress  the saved record writeProgress() makes for a fixed set of
//             answers, and what readProgress() makes of it when read back
//   backup    buildBackup() of the same, and what restoreProgress() makes of it
//   ledger    the evidence rows and record one fixed notebook entry produces
//             in the lesson's context
//   token     the submission token for the backup (plain, with an assignment
//             and a roster id, with evidence, with a depth), decoded
//   assignment the cut an activity format builds, and how each pin status reads
//
// Nothing here is a copy of engine logic: every value is an engine function's
// own output. The DOM half (e2e/lessonGolden.spec.js) records what the panel
// draws. Clocks are fixed and randomness is absent, so the result is the same
// on every machine; deflate bytes are the one thing that differs between Node
// versions, which is why a token is recorded decoded.
// =============================================================================

import { webcrypto } from 'node:crypto';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
}

export const FIXED = Object.freeze({
  startedAt: '2026-01-02T03:04:05.000Z',
  savedAt: '2026-01-02T04:05:06.000Z',
  capturedAt: 1_800_000_000_000,
  assignmentDate: new Date('2026-01-02T00:00:00.000Z'),
  spent: 600,
  roster: 'roster-1',
  assignment: 'golden-assignment',
});

export const LOCALES = Object.freeze(['en', 'es']);

const sha = value =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/** The answers a numeric step is graded against, in the locale's own form. */
function numericProbes(step, locale) {
  const tol = Math.abs(step.tolerance ?? Math.abs(step.answer) * 0.05);
  const fmt = n => {
    const s = String(Number(n.toPrecision(6)));
    return locale === 'es' ? s.replace('.', ',') : s;
  };
  const unit = step.unit ? ` ${step.unit}` : '';
  return [
    fmt(step.answer),
    fmt(step.answer + tol * 0.5),
    fmt(step.answer + tol * 3),
    fmt(step.answer) + unit,
    'not a number',
    '',
  ];
}

export function gradeStep(
  step,
  locale,
  checkAnswer,
  gradeAnswer,
  toleranceFor
) {
  const base = { sid: step.sid, type: step.type, kind: step.kind ?? null };
  if (step.kind === 'choice' || step.type === 'predict') {
    const n = Array.isArray(step.options) ? step.options.length : 0;
    return {
      ...base,
      grades: Array.from({ length: n }, (_, i) => [
        i,
        checkAnswer(step, i, { locale }),
        gradeAnswer(step, i, { locale }).status,
      ]),
    };
  }
  if (step.kind === 'numeric') {
    const graded = Number.isFinite(step.answer);
    return {
      ...base,
      tolerance: graded ? toleranceFor(step) : null,
      grades: graded
        ? numericProbes(step, locale).map(text => {
            const g = gradeAnswer(step, text, { locale });
            return [
              text,
              checkAnswer(step, text, { locale }),
              g.status,
              g.value,
              g.unit,
              g.converted,
              g.reason,
            ];
          })
        : [['formula-expected', checkAnswer(step, '1', { locale })]],
    };
  }
  return {
    ...base,
    grades: [['ungraded', checkAnswer(step, 'x', { locale })]],
  };
}

/** The fixed responses a student who answered every graded step right gave. */
export function fixedResponses(lesson, locale, recordAnswer) {
  const responses = {};
  const attempts = {};
  for (const s of lesson.steps) {
    const id = `${lesson.id}:${s.sid}`;
    if (s.type === 'question' && s.kind === 'numeric') {
      if (Number.isFinite(s.answer)) {
        recordAnswer(
          responses,
          id,
          locale === 'es'
            ? String(s.answer).replace('.', ',')
            : String(s.answer),
          locale
        );
        attempts[id] = 1;
      }
    } else if (s.kind === 'choice' || s.type === 'predict') {
      if (typeof s.answer === 'number') {
        responses[id] = s.answer;
        attempts[id] = 1;
      }
    } else if (s.type === 'question' && s.kind === 'short') {
      responses[id] = 'A fixed sentence for the golden.';
    }
  }
  return { responses, attempts };
}

export async function recordLesson(id, locale, mods) {
  const {
    reg,
    withDepth,
    depthPure,
    schema,
    backupMod,
    tokenMod,
    answerCheck,
    answerParse,
    ledgerMod,
    entryMod,
  } = mods;
  await reg.setLessonLocale(locale);
  const lesson = await withDepth(await reg.loadInvestigation(id), locale);
  const depths = depthPure.depthsOf(lesson);
  const sids = lesson.steps.map(s => s.sid);
  const { responses, attempts } = fixedResponses(
    lesson,
    locale,
    answerParse.recordAnswer
  );
  const deepest = depths.at(-1);

  const grading = lesson.steps
    .filter(
      s =>
        s.kind === 'choice' ||
        s.kind === 'numeric' ||
        s.type === 'predict' ||
        s.kind === 'short'
    )
    .map(s =>
      gradeStep(
        s,
        locale,
        answerCheck.checkAnswer,
        answerCheck.gradeAnswer,
        answerCheck.toleranceFor
      )
    );

  const state = {
    lesson,
    responses,
    attempts,
    visited: sids,
    stepSid: sids.at(-1),
    startedAt: FIXED.startedAt,
    depth: deepest,
    deepest,
    spent: FIXED.spent,
  };
  const record = schema.writeProgress(state);
  const read = schema.readProgress(JSON.parse(JSON.stringify(record)), lesson);

  const backup = backupMod.buildBackup({
    lesson,
    responses,
    attempts,
    visited: sids,
    stepSid: sids.at(-1),
    startedAt: FIXED.startedAt,
    studentName: null,
  });
  backup.savedAt = FIXED.savedAt;
  const verdict = backupMod.validateBackup(JSON.parse(JSON.stringify(backup)));
  const restored = backupMod.restoreProgress(
    JSON.parse(JSON.stringify(backup)),
    lesson
  );

  const entry = entryMod.buildEntry({
    source: entryMod.SOURCES[0],
    title: 'Golden measurement',
    capturedAt: FIXED.capturedAt,
    id: `golden-${id}`,
    context: { lesson: id, step: sids[0], assignment: FIXED.assignment },
    quantities: [
      entryMod.quantity({
        label: 'Period',
        value: 3.5247,
        unit: 'd',
        uncertainty: 0.0012,
      }),
    ],
  });
  const ledger = ledgerMod.ledgerRecord([entry]);
  const digest = await ledgerMod.ledgerDigest(ledger);

  const tokenOf = async args => {
    const submission = tokenMod.buildSubmission({
      backup,
      fallbackLocale: locale,
      ...args,
    });
    const { token, comfortable } = await tokenMod.encodeSubmission(submission);
    const read = await tokenMod.readSubmissionToken(token);
    const { b, ...rest } = read.ok
      ? (read.payload ?? read.submission ?? {})
      : {};
    return {
      comfortable,
      ok: read.ok,
      reason: read.ok ? null : read.reason,
      backupIntact: sha(b) === sha(backup),
      payload: rest,
      answers: read.ok
        ? tokenMod.answersOf(read.payload ?? read.submission, lesson)
        : null,
    };
  };
  const tokens = {
    plain: await tokenOf({}),
    assignment: await tokenOf({
      assignmentId: FIXED.assignment,
      rosterId: FIXED.roster,
    }),
    evidence: await tokenOf({ record: ledger, digest }),
    depth: await tokenOf({ depth: deepest }),
  };

  return {
    id,
    locale,
    title: lesson.title,
    steps: lesson.steps.length,
    depths: depths.map(d => [d, depthPure.lessonAt(lesson, d).steps.length]),
    grading,
    progress: { record, read: serializable(read) },
    backup: { backup, verdict, restored: serializable(restored) },
    ledger: { entry: entry.id, record: ledger, digest },
    tokens,
  };
}

/** Sets become arrays, so a result can be written as JSON. */
function serializable(value) {
  return JSON.parse(
    JSON.stringify(value, (k, v) => (v instanceof Set ? [...v].sort() : v))
  );
}

export async function recordActivity(cut, mods) {
  const { reg, withDepth, actMod, actData, assignMod, pinning } = mods;
  await reg.setLessonLocale('en');
  const activity = actData.activityById(cut.activity);
  const format = actData.formatById(activity, cut.format);
  const lesson = await withDepth(await reg.loadInvestigation(activity.lesson));
  const made = actMod.assignmentForFormat(
    lesson,
    activity,
    format,
    activity.id,
    'Golden intro',
    { id: 'golden-pack', version: '1.2.0' }
  );
  const resolved = actMod.resolvedSteps(lesson, format);
  const assignment = made.ok ? { ...made.assignment, c: '2026-01-02' } : null;
  const current = v => (v ? { id: 'golden-pack', version: v } : null);
  const base = { ...(assignment ?? {}), p: undefined };
  delete base.p;
  const pins = {
    none: pinning.packageBinding(base, null).status,
    same: pinning.packageBinding(assignment, current('1.2.0')).status,
    compatible: pinning.packageBinding(assignment, current('1.9.0')).status,
    major: pinning.packageBinding(assignment, current('2.0.0')).status,
    moved: pinning.packageBinding(assignment, {
      id: 'other-pack',
      version: '1.2.0',
    }).status,
    unpinned: pinning.packageBinding(base, current('1.0.0')).status,
  };
  return {
    cut: `${cut.activity}/${cut.format}`,
    lesson: activity.lesson,
    ok: made.ok,
    reason: made.reason ?? null,
    assignment,
    sids: resolved.sids,
    added: (made.added ?? []).map(s => s.sid ?? s),
    unknown: made.unknown ?? [],
    valid: assignment ? assignMod.validateAssignment(assignment).ok : null,
    pins,
  };
}

/** One at a time: Jest's VM loses a module several import()s link at once. */
const inOrder = async loaders => {
  const out = [];
  for (const go of loaders) out.push(await go());
  return out;
};

export async function loadMods() {
  const [
    reg,
    depth,
    depthPure,
    schema,
    backupMod,
    tokenMod,
    answerCheck,
    answerParse,
    ledgerMod,
    entryMod,
    actMod,
    actData,
    assignMod,
    pinning,
  ] = await inOrder([
    () => load('js/data/investigations/registry.js'),
    () => load('js/investigations/depth.js'),
    () => load('js/investigations/depthPure.js'),
    () => load('js/investigations/progressSchema.js'),
    () => load('js/investigations/progressBackup.js'),
    () => load('js/submission/submissionToken.js'),
    () => load('js/answerCheck.js'),
    () => load('js/answerParse.js'),
    () => load('js/notebook/ledger.js'),
    () => load('js/notebook/entry.js'),
    () => load('js/activities/activities.js'),
    () => load('js/data/activities.js'),
    () => load('js/assignments/assignment.js'),
    () => load('js/assignments/pinning.js'),
  ]);
  return {
    reg,
    withDepth: depth.withDepth,
    depthPure,
    schema,
    backupMod,
    tokenMod,
    answerCheck,
    answerParse,
    ledgerMod,
    entryMod,
    actMod,
    actData,
    assignMod,
    pinning,
  };
}

/** The whole Node golden, for the coverage the file names. */
export async function recordAll(coverage) {
  const mods = await loadMods();
  const lessons = {};
  for (const id of coverage.lessons) {
    for (const locale of LOCALES) {
      lessons[`${id}:${locale}`] = await recordLesson(id, locale, mods);
    }
  }
  const activities = {};
  for (const cut of coverage.activities) {
    const [activity, format] = cut.split('/');
    activities[cut] = await recordActivity({ activity, format }, mods);
  }
  return { lessons, activities };
}
