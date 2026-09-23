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
// Still no roster, no gradebook and nothing that survives a reload. The export
// was decided on; those have not been, and building them here would be deciding
// by accident. Nothing leaves the browser.
//
// It is a separate esbuild entry so that none of it reaches the application's
// start-up download. What it imports is the answer checker, the lesson data,
// which is loaded per lesson on demand, and its own small catalog.
//
// On what it can and cannot tell you: it verifies answers, not identity. A
// token is computed in a browser and whoever controls the browser can forge
// one. What it removes is transcription, not dishonesty.
// =============================================================================

import {
  isSubmissionToken,
  readSubmissionToken,
} from './submission/submissionToken.js';
import {
  annotate,
  gradeSubmission,
  questionCsv,
  resultsJson,
  summaryCsv,
} from './submission/results.js';
import {
  LANGUAGES,
  applyTranslations,
  has,
  language,
  preferred,
  setLanguage,
  t,
} from './submission/i18n.js';
import { validateBackup } from './investigations/progressBackup.js';
import { MANIFEST } from './data/investigations/manifest.js';

const $ = id => document.getElementById(id);

/** Graded records, in the order accepted. Not persisted, on purpose. */
const graded = [];
/** Anything refused, with the reason code, so a pile of thirty reconciles. */
const refused = [];
/** Lesson bodies, loaded once each. */
const lessons = new Map();

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
  const lesson = await lessonById(submission.b.lesson.id);
  if (!lesson) return refuse(label, 'unknownLesson');
  graded.push(gradeSubmission(submission, lesson, { kind, label }));
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
    if (!match) return refuse(name, 'noTokenInPdf');
    return accept(name, match[1], 'pdf');
  }
  const text = await file.text();
  if (isSubmissionToken(text.trim())) return accept(name, text.trim(), 'token');
  let parsed;
  try {
    parsed = JSON.parse(text);
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
    ? `<table class="sr-table"><thead><tr>
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
         .join('')}</tbody></table>`
    : `<p class="sr-empty">${esc(t('sub.rates.empty'))}</p>`;

  $('who').innerHTML = n
    ? `<ol class="sr-who">${records
        .map(s => {
          const notes = [
            s.rosterId,
            s.assignmentId,
            s.duplicateOf !== null
              ? t('sub.read.duplicate', { n: s.duplicateOf })
              : null,
            s.attemptNumber !== null
              ? t('sub.read.attempt', {
                  n: s.attemptNumber,
                  of: s.attemptsInGroup,
                })
              : null,
          ].filter(Boolean);
          return `<li>${esc(s.nameAsTyped || t('sub.read.noName'))} &mdash; ${esc(
            s.lessonTitle
          )}${notes.map(x => ` &mdash; ${esc(x)}`).join('')}</li>`;
        })
        .join('')}</ol>`
    : '';

  $('refused').innerHTML = refused.length
    ? `<h2>${esc(t('sub.refused.title'))}</h2><ul class="sr-refused">${refused
        .map(r => `<li>${esc(r.label)}: ${esc(reasonText(r.reason))}</li>`)
        .join('')}</ul>`
    : '';

  // The downloads exist only when there is something to download, and say why
  // when there is not rather than producing a file of headers.
  for (const id of ['exportSummary', 'exportQuestions', 'exportJson']) {
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
 * @param {'summary'|'questions'|'json'} which - Which file
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

/** Build the language switch and put every string in the chosen language. */
function applyLanguage() {
  document.title = t('sub.doc.title');
  applyTranslations();
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.lang === language())
    );
  }
  render();
}

function wireLanguage() {
  const host = $('langSwitch');
  if (!host) return;
  for (const lang of LANGUAGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-button';
    button.dataset.lang = lang.id;
    button.lang = lang.id;
    button.textContent = lang.endonym;
    button.addEventListener('click', () => {
      setLanguage(lang.id);
      applyLanguage();
    });
    host.append(button);
  }
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
    await accept(t('sub.paste.source'), text, 'token');
    $('paste').value = '';
  });
  $('clear').addEventListener('click', () => {
    graded.length = 0;
    refused.length = 0;
    say('');
    render();
  });
  $('exportSummary')?.addEventListener('click', () => exportResults('summary'));
  $('exportQuestions')?.addEventListener('click', () =>
    exportResults('questions')
  );
  $('exportJson')?.addEventListener('click', () => exportResults('json'));

  wireLanguage();
  setLanguage(preferred());
  applyLanguage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
