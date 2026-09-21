// =============================================================================
// Submission review
// -----------------------------------------------------------------------------
// The other end of the return channel, and deliberately the smallest thing that
// closes it.
//
// An instructor drops a pile of lab reports, backups or pasted tokens on this
// page and gets one table: which question the class got wrong, and how often.
// That is the whole feature. There is no roster, no gradebook, no export, and
// nothing survives a reload - every one of those is a product decision nobody
// has made yet, and building them here would be deciding by accident.
//
// It is a separate esbuild entry so that none of it reaches the application's
// start-up download. What it imports is the answer checker and the lesson data,
// which is what grading requires and is loaded per lesson on demand.
//
// On what it can and cannot tell you: it verifies answers, not identity. A
// token is computed in a browser and whoever controls the browser can forge
// one. What it removes is transcription, not dishonesty.
// =============================================================================

import { checkAnswer } from './answerCheck.js';
import {
  answersOf,
  isSubmissionToken,
  readSubmissionToken,
} from './submission/submissionToken.js';
import { validateBackup } from './investigations/progressBackup.js';
import { MANIFEST } from './data/investigations/manifest.js';

const $ = id => document.getElementById(id);

/** Submissions accepted this session. Not persisted, on purpose. */
const accepted = [];
/** Anything refused, with the reason, so a pile of thirty can be reconciled. */
const refused = [];
/** Lesson bodies, loaded once each. */
const lessons = new Map();

const REASONS = {
  empty: 'nothing to read',
  wrongKind: 'not a Gravitas submission token',
  newerVersion: 'made by a newer version of Gravitas',
  corrupt: 'truncated or altered in transit',
  mangled:
    'characters were changed in transit - a rich-text box turns "--" into a ' +
    'dash. Paste into a plain-text field, or drop the PDF instead.',
  notAnObject: 'not a submission',
  noVersion: 'no schema version',
  noBackup: 'no answers inside',
  noLesson: 'does not say which investigation',
  noResponses: 'no answers inside',
  noSteps: 'no step list to check against',
  notABackup: 'not a Gravitas progress backup',
  unknownLesson: 'names an investigation this build does not have',
};

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
    lesson = null;
  }
  lessons.set(id, lesson);
  return lesson;
}

/**
 * Grade one submission against the lesson it names.
 *
 * Every answer is checked under the locale it was typed in, which the backup
 * carries per answer. Grading a whole submission under one locale is how a
 * Spanish decimal comma becomes a wrong answer.
 *
 * @param {object} submission - A validated payload
 * @returns {Promise<?object>} A graded record, or null if the lesson is unknown
 */
async function grade(submission) {
  const lessonId = submission.b.lesson.id;
  const lesson = await lessonById(lessonId);
  if (!lesson) return null;
  const byId = new Map((lesson.steps || []).map(s => [s.sid, s]));
  const results = [];
  for (const { sid, value, locale } of answersOf(submission)) {
    const step = byId.get(sid);
    // A step the lesson no longer has: the submission is older than this build.
    // Counted as stale rather than wrong, because it is not the student's fault.
    if (!step) {
      results.push({ sid, title: sid, verdict: 'stale', locale });
      continue;
    }
    let ok = null;
    try {
      ok = checkAnswer(step, value, { locale });
    } catch {
      ok = null;
    }
    results.push({
      sid,
      title: step.title || sid,
      // checkAnswer returns null for anything it cannot judge, which is most
      // written answers. Those are the instructor's to read, and counting them
      // as failures would put the written half of every lesson at 100% wrong.
      verdict: ok === true ? 'right' : ok === false ? 'wrong' : 'unmarked',
      locale,
      attempts: submission.b.progress.attempts?.[sid] ?? null,
    });
  }
  return {
    student: submission.b.student || '(no name)',
    lessonId,
    lessonTitle: lesson.title || lessonId,
    assignment: submission.a,
    roster: submission.r,
    savedAt: submission.b.savedAt,
    results,
  };
}

/**
 * Take one thing a person handed over, whatever it is.
 * @param {string} label - What to call it if it fails
 * @param {object|string} thing - A parsed backup, or text to read as a token
 * @returns {Promise<void>}
 */
async function accept(label, thing) {
  let submission = null;
  if (typeof thing === 'string') {
    const read = await readSubmissionToken(thing);
    if (!read.ok) {
      refused.push({ label, reason: REASONS[read.reason] || read.reason });
      return render();
    }
    submission = read.submission;
  } else {
    // A bare backup file: the same answers without the assignment, roster or
    // fallback locale a token carries. Wrapped so everything downstream sees
    // one shape.
    const check = validateBackup(thing);
    if (!check.ok) {
      refused.push({ label, reason: REASONS[check.reason] || check.reason });
      return render();
    }
    submission = { v: 1, a: null, r: null, fl: 'en', b: thing };
  }
  const graded = await grade(submission);
  if (!graded) {
    refused.push({ label, reason: REASONS.unknownLesson });
    return render();
  }
  accepted.push(graded);
  render();
}

/** @param {File} file - A dropped file @returns {Promise<void>} */
async function takeFile(file) {
  const name = file.name || 'file';
  if (/\.pdf$/i.test(name)) {
    // The token rides in the PDF's /Keywords entry, which is why it is there:
    // reading the bytes cannot be mangled the way copying text off a page can.
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const match = /\/Keywords\s*\(([^)]*)\)/.exec(text);
    if (!match) {
      refused.push({ label: name, reason: 'no token in this PDF' });
      return render();
    }
    return accept(name, match[1]);
  }
  const text = await file.text();
  if (isSubmissionToken(text.trim())) return accept(name, text.trim());
  try {
    return accept(name, JSON.parse(text));
  } catch {
    refused.push({ label: name, reason: 'not JSON and not a token' });
    render();
  }
}

/**
 * Per-question failure rate across everything accepted.
 * @returns {Array<object>} One row per question, hardest first
 */
function failureRates() {
  const rows = new Map();
  for (const sub of accepted) {
    for (const r of sub.results) {
      // A pair, stringified: two lessons can use the same sid and a naive
      // join would merge their rows.
      const key = JSON.stringify([sub.lessonId, r.sid]);
      if (!rows.has(key)) {
        rows.set(key, {
          lesson: sub.lessonTitle,
          sid: r.sid,
          title: r.title,
          right: 0,
          wrong: 0,
          unmarked: 0,
          stale: 0,
        });
      }
      rows.get(key)[r.verdict]++;
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
const esc = t =>
  String(t).replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

function render() {
  const rates = failureRates();
  $('count').textContent = accepted.length
    ? `${accepted.length} submission${accepted.length === 1 ? '' : 's'}`
    : 'nothing yet';

  $('rates').innerHTML = rates.length
    ? `<table class="sr-table"><thead><tr>
         <th scope="col">Question</th><th scope="col">Investigation</th>
         <th scope="col">Wrong</th><th scope="col">Marked</th>
         <th scope="col">Failure rate</th><th scope="col">Unmarkable</th>
       </tr></thead><tbody>${rates
         .map(
           r => `<tr${r.rate !== null && r.rate >= 0.5 ? ' class="sr-hot"' : ''}>
             <td>${esc(r.title)}</td><td>${esc(r.lesson)}</td>
             <td>${r.wrong}</td><td>${r.marked}</td>
             <td>${pct(r.rate)}</td><td>${r.unmarked}</td></tr>`
         )
         .join('')}</tbody></table>`
    : '<p class="sr-empty">Drop reports, backups or tokens above.</p>';

  $('who').innerHTML = accepted.length
    ? `<ul class="sr-who">${accepted
        .map(
          s =>
            `<li>${esc(s.student)} &mdash; ${esc(s.lessonTitle)}${
              s.roster ? ` &mdash; ${esc(s.roster)}` : ''
            }${s.assignment ? ` &mdash; ${esc(s.assignment)}` : ''}</li>`
        )
        .join('')}</ul>`
    : '';

  $('refused').innerHTML = refused.length
    ? `<h2>Not read</h2><ul class="sr-refused">${refused
        .map(r => `<li>${esc(r.label)}: ${esc(r.reason)}</li>`)
        .join('')}</ul>`
    : '';
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
    await accept('pasted token', text);
    $('paste').value = '';
  });
  $('clear').addEventListener('click', () => {
    accepted.length = 0;
    refused.length = 0;
    render();
  });
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
