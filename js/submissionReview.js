// =============================================================================
// Submission review
// -----------------------------------------------------------------------------
// The other end of the return channel.
//
// An instructor drops a pile of lab reports, backups or pasted tokens on this
// page and gets one table: which question the class got wrong, and how often.
// The same pile can be downloaded - a summary row per report, a row per
// question, or everything as JSON - so the reading does not have to be done
// twice to reach a spreadsheet. All three, and the table, are projections of
// one graded record per report, built in js/submission/results.js; this file is
// only the page around it.
//
// Still no roster, no accounts and nothing that survives a reload. What it adds
// to the CSV and JSON (INSTRUCTOR_FLOW.md) is the instructor's side of the flow:
// the Activity or Course the reports belong to, named from a file or a link the
// instructor opens here; a view of the written answers in which the instructor
// enters a mark and a comment, kept in the page and saved only as a file; and
// gradebook files for Canvas, Moodle and D2L Brightspace, one score per student
// per Activity from one canonical model (js/gradebook/). Nothing leaves the
// browser.
//
// It is a separate esbuild entry so that none of it reaches the application's
// start-up download. What it imports is the answer checker, the lesson data,
// which is loaded per lesson on demand, and its own small catalog.
//
// On what it can and cannot tell you: it verifies answers, not identity. A
// token is computed in a browser and whoever controls the browser can forge
// one. What it removes is transcription, not dishonesty.
// =============================================================================

import { parseDocument } from './platform/common.js';
import {
  isSubmissionToken,
  readSubmissionToken,
} from './submission/submissionToken.js';
import { checkEvidence } from './submission/ledgerDigest.js';
import {
  annotate,
  evidenceCsv,
  gradeSubmission,
  questionCsv,
  resultsJson,
  summaryCsv,
} from './submission/results.js';
import {
  applyTranslations,
  has,
  preferred,
  language,
  setLanguage,
  t,
} from './submission/i18n.js';
import { validateBackup } from './investigations/progressBackup.js';
import { activitiesOf, fragmentOf, readSource } from './teach/activity.js';
import { gradebookModel, rosterMerges } from './gradebook/model.js';
import { ADAPTERS } from './gradebook/index.js';
import {
  marksCsv,
  marksIndex,
  markKey,
  needsJudgment,
  readMarksCsv,
  setMark,
} from './gradebook/marks.js';
import { MANIFEST } from './data/investigations/manifest.js';
import { decodeEntities } from './lessonMarkup.js';
import { layDepth } from './investigations/depthPure.js';

// The deeper steps by lesson, English only: grading never needs the Spanish.
const DEEPER = {
  'keplers-laws': () => import('./data/investigations/depth/keplers-laws.js'),
  'transit-photometry': () =>
    import('./data/investigations/depth/transit-photometry.js'),
  'weighing-stars': () =>
    import('./data/investigations/depth/weighing-stars.js'),
  'missing-mass': () => import('./data/investigations/depth/missing-mass.js'),
  'color-and-temperature': () =>
    import('./data/investigations/depth/color-and-temperature.js'),
  'lines-and-motion': () =>
    import('./data/investigations/depth/lines-and-motion.js'),
  'what-a-spectrum-is-made-of': () =>
    import('./data/investigations/depth/what-a-spectrum-is-made-of.js'),
};
const deepen = async lesson =>
  lesson.depthLaid || !DEEPER[lesson.id]
    ? lesson
    : layDepth(lesson, (await DEEPER[lesson.id]()).default.steps);
import { mountShell } from './shell.js';

const $ = id => document.getElementById(id);

/** Graded records, in the order accepted. Not persisted, on purpose. */
const graded = [];
/** Anything refused, with the reason code, so a pile of thirty reconciles. */
const refused = [];
/** Lesson bodies, loaded once each. */
const lessons = new Map();
/** Activities named by a file or link the instructor opened, by activity code. */
const context = new Map();
/** What was opened to name them, for the list on the page. */
const contexts = [];
/** Marks the instructor entered, by report and step. Never stored. */
const marks = marksIndex();
/** Whether the instructor has picked how to match students (then it is theirs). */
let identifierChosen = false;

/** Whether the written answers are open for marking (an opt-in, per visit). */
let judging = false;

/**
 * Load a lesson body by id, once.
 * @param {string} id - Investigation id
 * @returns {Promise<?object>} The lesson, or null if this build lacks it
 */
async function lessonById(id) {
  if (lessons.has(id)) return lessons.get(id);
  if (!MANIFEST.some(l => l.id === id)) {
    lessons.set(id, null);
    return null;
  }
  let lesson = null;
  try {
    const mod = await import(`./data/investigations/${id}.js`);
    lesson = mod.default || mod[Object.keys(mod)[0]] || null;
  } catch {
    // Not remembered, and not "this build lacks it": adding the file again retries.
    return undefined;
  }
  lessons.set(id, lesson);
  return lesson;
}

/**
 * Record a refusal. The reason is a code, translated when it is shown, so
 * switching language re-renders the list rather than leaving it in English.
 * @param {string} label - What was handed in
 * @param {string} reason - A `sub.reason.*` suffix
 */
function refuse(label, reason) {
  refused.push({ label, reason });
  render();
}

/**
 * Take one thing a person handed over, whatever it is.
 * @param {string} label - What to call it if it fails
 * @param {object|string} thing - A parsed backup, or text to read as a token
 * @param {'token'|'pdf'|'backup'} kind - What it was
 * @returns {Promise<void>}
 */
async function accept(label, thing, kind) {
  let submission = null;
  if (typeof thing === 'string') {
    const read = await readSubmissionToken(thing);
    if (!read.ok) return refuse(label, read.reason);
    submission = read.submission;
  } else {
    // A bare backup file: the same answers without the assignment, roster or
    // fallback locale a token carries. Wrapped so everything downstream sees
    // one shape.
    const check = validateBackup(thing);
    if (!check.ok) return refuse(label, check.reason);
    submission = { v: 1, a: null, r: null, fl: 'en', b: thing };
  }
  let lesson = await lessonById(submission.b.lesson.id);
  if (lesson === undefined) return refuse(label, 'lessonLoad');
  if (!lesson && submission.b.lesson.pack) {
    // An instructor's version of an investigation (Prompt 78): its questions
    // are the original's, so it is graded against the original by reference
    // (js/remix/grade.js); one written from scratch is named, not graded.
    const k = submission.b.lesson.pack;
    const raw = k.from ? await lessonById(k.from.id) : null;
    const view = await (
      await import('./remix/grade.js')
    ).remixLesson(submission.b, raw);
    if (!view.ok) {
      refused.push({
        label,
        reason: view.reason,
        detail: {
          message: `${k.id} ${k.version}${k.from ? `, ${k.from.id} ${k.from.version}` : ''}`,
        },
      });
      return render();
    }
    lesson = view.lesson;
  }
  if (!lesson) return refuse(label, 'unknownLesson');
  // Read at a deeper depth: its steps are laid in, or their answers are stale.
  if (lesson.depths && submission.dp && submission.dp !== 'core')
    lesson = await deepen(lesson);
  // The evidence behind the answers, checked against its digest here: the
  // table in front of the instructor is recomputed, not taken as stated.
  const evidence = await checkEvidence(submission.ev);
  graded.push(gradeSubmission(submission, lesson, { kind, label, evidence }));
  render();
}

/**
 * Whether text names an Activity or a Course rather than holding a report: a
 * link to one, or the file the builder saved.
 * @param {string} text - Trimmed text
 * @returns {boolean}
 */
const isContext = text =>
  /^#[ac]\d+[zr]/.test(fragmentOf(text)) ||
  /"(?:k|format)"\s*:\s*"gravitas\.(?:assignment|course-pack)"/.test(text);

/**
 * Name the activities from an Activity file, a Course file or a link to one.
 * Reports carry an activity code and nothing else, so this is where the code
 * gets the name the instructor gave it.
 * @param {string} label - What was handed in
 * @param {string} text - The link or the file's text
 * @returns {Promise<void>}
 */
async function takeContext(label, text) {
  const source = await readSource(text);
  if (!source.ok) {
    refused.push({
      label,
      reason: `ctx.${source.reason}`,
      detail: source.detail,
    });
    return render();
  }
  const found = activitiesOf(source, language());
  for (const a of found) context.set(a.id, a);
  contexts.push({
    label,
    kind: source.kind,
    n: found.length,
    title:
      source.kind === 'course'
        ? found[0]?.course || source.pack.id
        : found[0]?.title || label,
  });
  render();
}

/** @param {File} file - A dropped file @returns {Promise<void>} */
async function takeFile(file) {
  const name = file.name || 'file';
  if (/\.pdf$/i.test(name)) {
    // The token rides in the PDF's /Keywords entry, which is why it is there:
    // reading the bytes cannot be mangled the way copying text off a page can.
    const text = new TextDecoder('latin1').decode(
      await file.arrayBuffer().catch(() => '')
    );
    const match = /\/Keywords\s*\(([^)]*)\)/.exec(text);
    if (!match) return refuse(name, 'noTokenInPdf');
    return accept(name, match[1], 'pdf');
  }
  const text = await file.text().catch(() => null);
  if (text === null) return refuse(name, 'unreadable');
  if (isSubmissionToken(text.trim())) return accept(name, text.trim(), 'token');
  if (isContext(text.trim())) return takeContext(name, text.trim());
  let parsed;
  try {
    parsed = parseDocument(text);
  } catch {
    return refuse(name, 'notJson');
  }
  return accept(name, parsed, 'backup');
}

/**
 * Per-question failure rate across everything accepted, each report once.
 *
 * An exact duplicate is left out here - dropping the same report twice should
 * not make its wrong answers count double - but it stays in every export,
 * marked. Repeated attempts are different answers and both count.
 *
 * @param {Array<object>} records - Annotated records
 * @returns {Array<object>} One row per question, hardest first
 */
function failureRates(records) {
  const rows = new Map();
  for (const sub of records) {
    if (sub.duplicateOf !== null) continue;
    for (const q of sub.questions) {
      if (q.verdict === 'incomplete') continue;
      // A pair, stringified: two lessons can use the same sid and a naive
      // join would merge their rows.
      const key = JSON.stringify([sub.lessonId, q.sid]);
      if (!rows.has(key)) {
        rows.set(key, {
          lesson: sub.lessonTitle,
          title: q.title,
          wrong: 0,
          right: 0,
          unmarked: 0,
        });
      }
      const row = rows.get(key);
      if (q.verdict === 'correct') row.right++;
      else if (q.verdict === 'incorrect') row.wrong++;
      else row.unmarked++;
    }
  }
  return (
    [...rows.values()]
      .map(r => {
        const marked = r.right + r.wrong;
        return { ...r, marked, rate: marked ? r.wrong / marked : null };
      })
      // Hardest first: that is the question the next class needs more time on.
      // Unmarkable questions sort last rather than as zero, because "no wrong
      // answers" and "no answers anyone can mark" are different statements.
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))
  );
}

const pct = v => (v === null ? '-' : `${Math.round(v * 100)}%`);
const esc = s =>
  String(s).replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/** A step's rubric criteria as a list (Prompt 79), or '' when it has none. */
const criteriaHtml = step =>
  Array.isArray(step?.rubricCriteria) && step.rubricCriteria.length
    ? `<ul class="sr-criteria">${step.rubricCriteria
        .map(
          c =>
            `<li>${esc(plain(c.name))}: ${(c.levels || [])
              .map(
                l =>
                  `${esc(plain(l.label))}${Number.isFinite(l.points) ? ` (${l.points})` : ''} ${esc(plain(l.text))}`
              )
              .join(' / ')}</li>`
        )
        .join('')}</ul>`
    : '';

/** Lesson prose as text: its markup dropped and its entities read. */
const plain = s => decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ''));

/**
 * One submission's written answers, each beside its rubric where the lesson
 * has one. They were read and counted as unmarkable but never shown, so an
 * instructor had to open every PDF to read them.
 *
 * @param {object} s - An annotated record
 * @returns {string} A disclosure, or '' when there is nothing written
 */
function writtenAnswers(s) {
  const steps = new Map(
    (lessons.get(s.lessonId)?.steps || []).map(x => [x.sid, x])
  );
  const written = s.questions.filter(
    q => q.response !== null && steps.get(q.sid)?.kind === 'short'
  );
  if (!written.length) return '';
  return `<details class="ui-disclosure sr-written"><summary>${esc(
    t('sub.written.summary', { n: written.length })
  )}</summary><dl>${written
    .map(q => {
      const rubric = steps.get(q.sid).rubric;
      return `<dt>${esc(plain(q.title))}</dt><dd>${esc(q.response)}</dd>${
        rubric
          ? `<dd class="sr-rubric">${esc(t('sub.written.rubric'))}: ${esc(plain(rubric))}</dd>`
          : ''
      }${criteriaHtml(steps.get(q.sid)) && `<dd>${criteriaHtml(steps.get(q.sid))}</dd>`}`;
    })
    .join('')}</dl></details>`;
}

/** A number for reading, in the page's language, to six figures. */
const num = v =>
  v === null
    ? '-'
    : v.toLocaleString(language(), { maximumSignificantDigits: 6 });

/**
 * Each report's evidence table, with the verdict of its check against the
 * digest the token states. A table that does not match is open and says so in
 * words; a match says what it does not show.
 *
 * @param {Array<object>} records - Annotated records
 * @returns {string} Disclosures, or '' when nothing was read
 */
function evidenceSections(records) {
  if (!records.length) return '';
  const word = (kind, id) =>
    has(`sub.evidence.${kind}.${id}`) ? t(`sub.evidence.${kind}.${id}`) : id;
  return `<h2>${esc(t('sub.evidence.title'))}</h2><p class="ui-note">${esc(
    t('sub.evidence.note')
  )}</p>${records
    .map(s => {
      const e = s.evidence;
      const name = s.nameAsTyped || t('sub.read.noName');
      const said =
        e.state === 'none'
          ? t('sub.evidence.none')
          : t(`sub.evidence.${e.state}`, {
              digest: String(e.digest ?? '').slice(0, 16),
              n: e.rows.length,
              total: e.total,
            });
      const table = e.rows.length
        ? `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(
            t('sub.evidence.caption', { name })
          )}"><table class="ui-table sr-table"><thead><tr>${[
            'envelope',
            'quantity',
            'value',
            'unit',
            'uncertainty',
            'origin',
            'source',
          ]
            .map(c => `<th scope="col">${esc(t(`sub.evidence.col.${c}`))}</th>`)
            .join('')}</tr></thead><tbody>${e.rows
            .map(
              r => `<tr><td>${esc(r.envelope)}</td><td>${esc(r.quantity)}</td>
                <td>${esc(num(r.value))}</td><td>${esc(r.unit)}</td>
                <td>${esc(num(r.half))}</td><td>${esc(word('origin', r.origin))}</td>
                <td>${esc(`${r.sourceKind} ${r.sourceId}${r.sourceDigest ? ` ${r.sourceDigest}` : ''}`)}</td></tr>`
            )
            .join('')}</tbody></table></div>`
        : '';
      return `<details class="ui-disclosure sr-evidence"${
        e.state === 'mismatch' ? ' open' : ''
      }><summary>${esc(
        t('sub.evidence.summary', {
          name,
          state: t(`sub.evidence.state.${e.state}`),
          n: e.rows.length,
        })
      )}</summary><p${
        e.state === 'mismatch' ? ' class="ui-state is-error" role="alert"' : ''
      }>${esc(said)}</p>${table}</details>`;
    })
    .join('')}`;
}

/**
 * What each report handed in alongside its evidence: scenarios and experiments,
 * with the scenario they were made from, the build and the engine, and the
 * link that opens the same world. A link is followed only if it is a world
 * link's own characters; a long one was handed in as a file.
 *
 * @param {Array<object>} records - Annotated records
 * @returns {string} A table per report that has any, or ''
 */
function systemSections(records) {
  const shown = records.filter(r => r.systems?.length);
  if (!shown.length) return '';
  const none = t('sub.systems.none');
  return `<h2>${esc(t('sub.systems.title'))}</h2><p class="ui-note">${esc(
    t('sub.systems.note')
  )}</p>${shown
    .map(r => {
      const name = r.nameAsTyped || t('sub.read.noName');
      const rows = r.systems
        .map(x => {
          const link =
            typeof x.l === 'string' && /^[0-9][A-Za-z0-9_-]{0,1500}$/.test(x.l)
              ? `<a href="/#${esc(x.l)}">${esc(t('sub.systems.open'))}</a>`
              : esc(t('sub.systems.file'));
          return `<tr><td>${esc(x.n)}</td><td>${esc(t(`sub.systems.kind.${x.k}`))}</td><td>${esc(x.s ?? none)}</td><td>${esc(Array.isArray(x.p) ? x.p.join(' ') : none)}</td><td>${esc(x.a ?? none)}</td><td>${esc(x.f ?? none)}</td><td>${esc(x.h ?? '')}</td><td>${link}</td></tr>`;
        })
        .join('');
      return `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(
        t('sub.systems.caption', { name })
      )}"><table class="ui-table sr-table"><thead><tr>${[
        'name',
        'kind',
        'seed',
        'from',
        'build',
        'engine',
        'digest',
        'open',
      ]
        .map(c => `<th scope="col">${esc(t(`sub.systems.col.${c}`))}</th>`)
        .join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    .join('')}`;
}

/** Announce something to a screen reader and show it. */
function say(message) {
  const status = $('exportStatus');
  if (status) status.textContent = message;
}

/**
 * A refusal in words. A reason code with no message of its own still says what
 * it is rather than rendering a bare id.
 * @param {string} code - The reason code
 * @returns {string} The sentence
 */
const reasonText = code =>
  has(`sub.reason.${code}`)
    ? t(`sub.reason.${code}`)
    : t('sub.reason.other', { code });

/** An activity's name: the one the instructor gave it, else its code. */
const activityName = id =>
  id ? (context.get(id)?.title ?? id) : t('sub.act.none');

/**
 * What was opened to name the activities, and what could not be read.
 * @returns {string} A list, or ''
 */
function contextList() {
  if (!contexts.length) return '';
  return `<p class="ui-note">${esc(t('sub.ctx.title'))}</p><ul class="ui-note">${contexts
    .map(c =>
      esc(
        t(c.kind === 'course' ? 'sub.ctx.course' : 'sub.ctx.activity', {
          name: c.title,
          n: c.n,
        })
      )
    )
    .map(x => `<li>${x}</li>`)
    .join('')}</ul>`;
}

/**
 * One row per activity: how many reports, how many students, how they did and
 * which question was hardest. The activity is whatever code the link carried;
 * its name and its course are the instructor's own, from a file they opened.
 *
 * @param {Array<object>} records - Annotated records
 * @returns {string} A table, or '' when nothing was read
 */
function byActivity(records) {
  if (!records.length) return '';
  const groups = new Map();
  for (const r of records) {
    const key = r.assignmentId || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const rows = [...groups].map(([id, list]) => {
    const own = list.filter(r => r.duplicateOf === null);
    const people = new Set(
      own.map(r => r.rosterId || r.nameAsTyped || `#${r.submission}`)
    );
    const ratios = own
      .filter(r => r.pointsPossible > 0)
      .map(r => r.points / r.pointsPossible);
    const mean = ratios.length
      ? ratios.reduce((a, b) => a + b, 0) / ratios.length
      : null;
    const hardest = failureRates(own).find(x => x.rate !== null);
    const fact = id ? context.get(id) : null;
    return `<tr><th scope="row">${esc(activityName(id))}</th>
      <td>${esc([fact?.course, fact?.unit].filter(Boolean).join(' · ') || '-')}</td>
      <td>${own.length}</td><td>${people.size}</td><td>${pct(mean)}</td>
      <td>${hardest ? `${esc(plain(hardest.title))} (${pct(hardest.rate)})` : '-'}</td></tr>`;
  });
  return `<h2>${esc(t('sub.act.title'))}</h2><p class="ui-note">${esc(
    t('sub.act.note')
  )}</p><div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(
    t('sub.act.title')
  )}"><table class="ui-table sr-table"><thead><tr>${[
    'activity',
    'course',
    'reports',
    'students',
    'mean',
    'hardest',
  ]
    .map(c => `<th scope="col">${esc(t(`sub.act.col.${c}`))}</th>`)
    .join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

/** How many written answers have a mark, of how many there are. */
const judgedCount = records => {
  const items = needsJudgment(records);
  return {
    n: items.length,
    marked: items.filter(
      ({ record, question }) =>
        marks.get(markKey(record.fingerprint, question.sid))?.points != null
    ).length,
  };
};

/**
 * The instructor's side of a written answer: the words, the rubric where the
 * investigation has one, a mark and a comment. Opened only when asked: the
 * students' prose is on screen because the instructor chose to read it, and
 * closing it takes it off again. Marks are kept in the page, never stored.
 *
 * @param {Array<object>} records - Annotated records
 * @returns {string} The section, or '' when nothing was read
 */
function judgmentSection(records) {
  if (!records.length) return '';
  const head = `<h2>${esc(t('sub.judge.title'))}</h2><p class="ui-note">${esc(
    t('sub.judge.note')
  )}</p><p><button id="judgeToggle" type="button" class="ui-button" aria-expanded="${judging}" aria-controls="judgeBody">${esc(
    t(judging ? 'sub.judge.close' : 'sub.judge.open')
  )}</button></p>`;
  if (!judging) return head;
  const items = needsJudgment(records);
  if (!items.length)
    return `${head}<p class="ui-state is-empty" id="judgeBody">${esc(t('sub.judge.none'))}</p>`;
  const { n, marked } = judgedCount(records);
  return `${head}<div id="judgeBody"><p class="ui-note" id="judgeSummary" role="status">${esc(
    t('sub.judge.summary', { marked, n })
  )}</p>${items
    .map(({ record: r, question: q }, i) => {
      const step = lessons.get(r.lessonId)?.steps?.find(x => x.sid === q.sid);
      const m = marks.get(markKey(r.fingerprint, q.sid));
      const who = r.nameAsTyped || t('sub.read.noName');
      const data = `data-fp="${esc(r.fingerprint)}" data-sid="${esc(q.sid)}"`;
      return `<fieldset class="sr-mark"><legend>${esc(
        t('sub.judge.report', {
          name: who,
          activity: activityName(r.assignmentId),
        })
      )}: ${esc(plain(q.title))}</legend>
        <p class="sr-response">${esc(q.response)}</p>${
          step?.rubric
            ? `<p class="sr-rubric">${esc(t('sub.written.rubric'))}: ${esc(plain(step.rubric))}</p>`
            : ''
        }${criteriaHtml(step)}
        <label for="mk-${i}">${esc(t('sub.judge.mark', { max: q.pointsPossible }))}</label>
        <input id="mk-${i}" class="ui-input is-compact" type="number" min="0" max="${q.pointsPossible}" step="0.5" ${data} data-field="mark" value="${esc(m?.points ?? '')}" />
        <label for="mc-${i}">${esc(t('sub.judge.comment'))}</label>
        <input id="mc-${i}" class="ui-input" type="text" maxlength="500" ${data} data-field="comment" value="${esc(m?.comment ?? '')}" />
      </fieldset>`;
    })
    .join('')}</div>`;
}

/** The words a gradebook's feedback is written in, from this page's catalog. */
const feedbackWords = () => ({
  auto: t('sub.gb.fb.auto'),
  written: t('sub.gb.fb.written'),
  awaiting: t('sub.gb.fb.awaiting'),
  attempts: t('sub.gb.fb.attempts'),
  comment: t('sub.gb.fb.comment'),
  changed: t('sub.gb.fb.changed'),
  evidence: t('sub.gb.fb.evidence'),
});

/** The canonical gradebook rows for the choices on the page now. */
function gradebook(records) {
  return gradebookModel(records, {
    identifier: $('gbIdentifier')?.value === 'name' ? 'name' : 'roster',
    policy: $('gbPolicy')?.value || 'latest',
    marks,
    activities: context,
  });
}

/** Say what the gradebook files will hold, while the instructor can still change it. */
function renderGradebook(records) {
  // One class code on every link is what the builder asks for, and matching on
  // it would merge the class into a single grade row. Until the instructor
  // chooses, the page matches on the typed name whenever a roster id covers
  // more than one name, and says so; once they choose, it keeps their choice
  // and warns instead (P81 R-1).
  const merges = rosterMerges(records);
  const picker = $('gbIdentifier');
  if (picker && !identifierChosen)
    picker.value = merges.length ? 'name' : 'roster';
  const model = gradebook(records);
  const students = new Set(model.rows.map(r => r.identifier)).size;
  const awaiting = model.rows.reduce((a, r) => a + r.awaiting, 0);
  const lines = [];
  if (records.length) {
    lines.push(
      t('sub.gb.summary', {
        students,
        activities: model.activities.length,
        rows: model.rows.length,
      })
    );
    if (model.skipped.length)
      lines.push(
        t('sub.gb.skipped', {
          n: model.skipped.length,
          list: model.skipped
            .map(x => x.name || `#${x.submission}`)
            .slice(0, 12)
            .join(', '),
        })
      );
    if (awaiting) lines.push(t('sub.gb.partial', { n: awaiting }));
    if (merges.length) {
      const worst = merges.reduce((a, m) =>
        m.names.length > a.names.length ? m : a
      );
      lines.push(
        t(picker?.value === 'roster' ? 'sub.gb.merged' : 'sub.gb.autoName', {
          id: worst.rosterId,
          n: worst.names.length,
        })
      );
    }
  }
  $('gbSummary').textContent = lines.join(' ');
  $('gbPossible').innerHTML = model.activities.length
    ? `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(
        t('sub.gb.possible.title')
      )}"><table class="ui-table sr-table"><caption>${esc(
        t('sub.gb.possible.title')
      )}</caption><thead><tr><th scope="col">${esc(
        t('sub.act.col.activity')
      )}</th><th scope="col">${esc(t('sub.gb.possible.col'))}</th></tr></thead><tbody>${model.activities
        .map(
          a =>
            `<tr><th scope="row">${esc(a.title)}</th><td>${a.pointsPossible}</td></tr>`
        )
        .join('')}</tbody></table></div>`
    : '';
  for (const id of ['exportCanvas', 'exportMoodle', 'exportD2l', 'marksSave']) {
    const button = $(id);
    if (button) button.disabled = records.length === 0;
  }
}

function render() {
  const records = annotate(graded);
  const n = records.length;
  $('count').textContent =
    n === 0
      ? t('sub.count.none')
      : n === 1
        ? t('sub.count.one')
        : t('sub.count.many', { n });

  const rates = failureRates(records);
  $('rates').innerHTML = rates.length
    ? `<div class="ui-table-wrap" tabindex="0" role="region" aria-label="${esc(
        t('sub.rates.title')
      )}"><table class="ui-table sr-table"><thead><tr>
         <th scope="col">${esc(t('sub.col.question'))}</th>
         <th scope="col">${esc(t('sub.col.lesson'))}</th>
         <th scope="col">${esc(t('sub.col.wrong'))}</th>
         <th scope="col">${esc(t('sub.col.marked'))}</th>
         <th scope="col">${esc(t('sub.col.rate'))}</th>
         <th scope="col">${esc(t('sub.col.unmarkable'))}</th>
       </tr></thead><tbody>${rates
         .map(
           r => `<tr${r.rate !== null && r.rate >= 0.5 ? ' class="sr-hot"' : ''}>
             <td>${esc(r.title)}</td><td>${esc(r.lesson)}</td>
             <td>${r.wrong}</td><td>${r.marked}</td>
             <td>${pct(r.rate)}</td><td>${r.unmarked}</td></tr>`
         )
         .join('')}</tbody></table></div>`
    : `<p class="ui-state is-empty">${esc(t('sub.rates.empty'))}</p>`;

  $('who').innerHTML = n
    ? `<ol class="ui-note">${records
        .map(s => {
          const notes = [
            s.rosterId,
            s.assignmentId ? activityName(s.assignmentId) : null,
            s.depth ? t(`sub.depth.${s.depth}`) : null,
            s.evidence.state === 'mismatch'
              ? t('sub.evidence.mismatchNote')
              : null,
            s.duplicateOf !== null
              ? t('sub.read.duplicate', { n: s.duplicateOf })
              : null,
            s.attemptNumber !== null
              ? t('sub.read.attempt', {
                  n: s.attemptNumber,
                  of: s.attemptsInGroup,
                })
              : null,
            s.hintsTaken > 0 || s.workedShown > 0
              ? t('sub.read.help', {
                  hints: s.hintsTaken,
                  shown: s.workedShown,
                })
              : null,
          ].filter(Boolean);
          return `<li value="${s.submission}">${esc(s.nameAsTyped || t('sub.read.noName'))} &mdash; ${esc(
            s.lessonTitle
          )}${notes.map(x => ` &mdash; ${esc(x)}`).join('')}${writtenAnswers(s)}</li>`;
        })
        .join('')}</ol>`
    : '';

  $('evidence').innerHTML = evidenceSections(records) + systemSections(records);
  $('context').innerHTML = contextList();
  $('byActivity').innerHTML = byActivity(records);
  $('judge').innerHTML = judgmentSection(records);
  renderGradebook(records);

  $('refused').innerHTML = refused.length
    ? `<h2>${esc(t('sub.refused.title'))}</h2><ul class="ui-note">${refused
        .map(
          r =>
            `<li>${esc(r.label)}: ${esc(reasonText(r.reason))}${
              r.detail?.message ? ` (${esc(r.detail.message)})` : ''
            }</li>`
        )
        .join('')}</ul>`
    : '';

  // The downloads exist only when there is something to download, and say why
  // when there is not rather than producing a file of headers.
  for (const id of [
    'exportSummary',
    'exportQuestions',
    'exportEvidence',
    'exportJson',
  ]) {
    const button = $(id);
    if (button) button.disabled = n === 0;
  }
  const empty = $('exportEmpty');
  if (empty) empty.hidden = n > 0;
}

/**
 * Hand the browser a file to save.
 * @param {string} text - Contents
 * @param {string} filename - Suggested name
 * @param {string} type - MIME type
 */
function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Today's date for a file name, in the reader's own time zone. */
function stamp(now = new Date()) {
  const pad = v => String(v).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Build one export and save it.
 * @param {'summary'|'questions'|'evidence'|'json'} which - Which file
 */
function exportResults(which) {
  const records = annotate(graded);
  if (!records.length) return say(t('sub.export.empty'));
  const includeWritten = Boolean($('includeWritten')?.checked);
  const day = stamp();
  try {
    let file;
    if (which === 'summary') {
      file = `gravitas-results-summary-${day}.csv`;
      download(summaryCsv(records), file, 'text/csv;charset=utf-8');
    } else if (which === 'questions') {
      file = `gravitas-results-questions-${day}.csv`;
      download(
        questionCsv(records, { includeWritten }),
        file,
        'text/csv;charset=utf-8'
      );
    } else if (which === 'evidence') {
      file = `gravitas-results-evidence-${day}.csv`;
      download(evidenceCsv(records), file, 'text/csv;charset=utf-8');
    } else {
      file = `gravitas-results-${day}.json`;
      download(
        resultsJson(records, {
          includeWritten,
          refused: refused.map(r => ({
            label: r.label,
            reason: r.reason,
          })),
        }),
        file,
        'application/json'
      );
    }
    say(t('sub.export.done', { file }));
  } catch (err) {
    say(t('sub.export.failed', { reason: err?.message || String(err) }));
  }
}

/**
 * Build a gradebook file for one platform and save it.
 * @param {'canvas'|'moodle'|'d2l'} which - The platform
 * @returns {Promise<void>}
 */
async function exportGradebook(which) {
  const records = annotate(graded);
  if (!records.length) return say(t('sub.gb.empty'));
  try {
    const adapter = await ADAPTERS[which].load();
    const model = gradebook(records);
    const pick = id => $(id)?.value;
    const csv =
      which === 'canvas'
        ? adapter.write(model, {
            idColumn: pick('gbCanvasId'),
            scale: pick('gbCanvasScale'),
          })
        : which === 'moodle'
          ? adapter.write(model, {
              idColumn: pick('gbMoodleId'),
              scale: pick('gbMoodleScale'),
              words: feedbackWords(),
            })
          : adapter.write(model, { idColumn: pick('gbD2lId') });
    const file = `gravitas-gradebook-${which}-${stamp()}.csv`;
    download(csv, file, 'text/csv;charset=utf-8');
    say(t('sub.export.done', { file }));
  } catch (err) {
    say(t('sub.export.failed', { reason: err?.message || String(err) }));
  }
}

/** Save the instructor's marks as a file of their own. */
function saveMarks() {
  const records = annotate(graded);
  if (!records.length) return say(t('sub.gb.empty'));
  const file = `gravitas-results-marks-${stamp()}.csv`;
  download(
    marksCsv(records, marks, {
      includeWritten: Boolean($('includeWritten')?.checked),
    }),
    file,
    'text/csv;charset=utf-8'
  );
  say(t('sub.export.done', { file }));
}

/** Read a marks file this page saved, into the marks held now. */
async function openMarks(file) {
  const text = await file.text().catch(() => null);
  if (text === null) return say(t('sub.reason.unreadable'));
  const r = readMarksCsv(text, marks);
  say(
    r.ok
      ? t('sub.judge.loaded', {
          read: r.read,
          skipped: r.skipped,
          file: file.name,
        })
      : `${file.name}: ${t(`sub.judge.reason.${r.reason}`)}`
  );
  render();
}

/** A mark or a comment changed on the written answers. */
function judged(e) {
  const el = e.target;
  const { fp, sid, field } = el.dataset || {};
  if (!field) return;
  const current = marks.get(markKey(fp, sid)) || { points: null, comment: '' };
  const next =
    field === 'mark'
      ? { ...current, points: el.value }
      : { ...current, comment: el.value };
  const ok = setMark(marks, fp, sid, next, Number(el.max) || Infinity);
  el.setAttribute('aria-invalid', String(!ok));
  if (!ok) {
    say(t('sub.judge.badMark', { max: el.max }));
    return;
  }
  say('');
  const records = annotate(graded);
  const summary = $('judgeSummary');
  if (summary)
    summary.textContent = t('sub.judge.summary', judgedCount(records));
  renderGradebook(records);
}

/** Put every string in the chosen language. */
function applyLanguage() {
  document.title = t('sub.doc.title');
  applyTranslations();
  render();
}

function wire() {
  const drop = $('drop');
  const stop = e => {
    e.preventDefault();
    e.stopPropagation();
  };
  for (const type of ['dragenter', 'dragover']) {
    drop.addEventListener(type, e => {
      stop(e);
      drop.classList.add('sr-over');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    drop.addEventListener(type, e => {
      stop(e);
      drop.classList.remove('sr-over');
    });
  }
  drop.addEventListener('drop', async e => {
    for (const file of e.dataTransfer?.files || []) await takeFile(file);
  });
  $('picker').addEventListener('change', async e => {
    for (const file of e.target.files || []) await takeFile(file);
    e.target.value = '';
  });
  $('paste-go').addEventListener('click', async () => {
    const text = $('paste').value;
    if (!text.trim()) return;
    if (isContext(text.trim()))
      await takeContext(t('sub.paste.source'), text.trim());
    else await accept(t('sub.paste.source'), text, 'token');
    $('paste').value = '';
  });
  $('clear').addEventListener('click', () => {
    graded.length = 0;
    refused.length = 0;
    context.clear();
    contexts.length = 0;
    marks.clear();
    judging = false;
    say('');
    render();
  });
  $('exportSummary')?.addEventListener('click', () => exportResults('summary'));
  $('exportQuestions')?.addEventListener('click', () =>
    exportResults('questions')
  );
  $('exportEvidence')?.addEventListener('click', () =>
    exportResults('evidence')
  );
  $('exportJson')?.addEventListener('click', () => exportResults('json'));
  $('exportCanvas')?.addEventListener('click', () => exportGradebook('canvas'));
  $('exportMoodle')?.addEventListener('click', () => exportGradebook('moodle'));
  $('exportD2l')?.addEventListener('click', () => exportGradebook('d2l'));
  $('marksSave')?.addEventListener('click', saveMarks);
  $('marksOpen')?.addEventListener('change', async e => {
    for (const file of e.target.files || []) await openMarks(file);
    e.target.value = '';
  });
  for (const id of ['gbIdentifier', 'gbPolicy'])
    $(id)?.addEventListener('change', () => {
      if (id === 'gbIdentifier') identifierChosen = true;
      renderGradebook(annotate(graded));
    });
  $('judge')?.addEventListener('change', judged);
  $('judge')?.addEventListener('click', e => {
    if (!e.target.closest?.('#judgeToggle')) return;
    judging = !judging;
    render();
    $('judgeToggle')?.focus();
  });

  setLanguage(preferred());
  applyLanguage();
  mountShell({
    onLanguage: id => {
      setLanguage(id);
      applyLanguage();
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
