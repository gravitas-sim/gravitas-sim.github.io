// =============================================================================
// Cutting an assignment out of a lesson
// -----------------------------------------------------------------------------
// The instructor's half. Lazy, and reached from ?assign=<lesson>, because this
// is machinery for the person setting the work and not for the fifty people
// doing it - the same boundary the authoring preview already uses.
//
// What the interface has to get right is the prerequisite conversation. An
// instructor ticks the four questions they want and the honest answer is "and
// these two, because your questions are about worlds those steps build". So
// the additions are shown, in place, with the step that needed them named -
// not appended silently, and not refused with a rule to look up.
//
// No answer key leaves here. The link and the file carry step ids and hashes;
// the printable page carries titles and the instructor's own words. Both are
// built from the same payload, so there is one thing to check rather than two.
// =============================================================================

import { t } from '../i18n/index.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import {
  MAX_INTRO,
  MAX_TITLE,
  buildAssignment,
  resolveSelection,
  validateSelection,
} from './assignment.js';
import { assignmentLink } from './assignmentLink.js';

let root = null;
let lesson = null;
let chosen = new Set();
let built = null;
/** The encoded link for the assignment just built, for the printable page. */
let builtLink = null;

const esc = text =>
  String(text ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );

const $ = id => root?.querySelector(`#${id}`);

/**
 * Open the builder over a lesson.
 *
 * @param {object} loaded - The merged lesson
 * @returns {void}
 */
export function openBuilder(loaded) {
  lesson = loaded;
  chosen = new Set();
  built = null;
  builtLink = null;
  mount();
  render();
}

/** Build the panel once. */
function mount() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'assignmentBuilder';
  root.className = 'assignment-builder';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-labelledby', 'assignTitle');
  root.innerHTML = `
    <div class="assignment-inner">
      <div class="assignment-head">
        <h2 id="assignTitle">${esc(t('assign.title'))}</h2>
        <button id="assignClose" class="ui-button" title="${esc(t('assign.close'))}">✕</button>
      </div>
      <p class="assignment-hint">${esc(t('assign.hint'))}</p>

      <label class="assignment-field">
        <span>${esc(t('assign.name'))}</span>
        <input id="assignName" type="text" maxlength="${MAX_TITLE}" />
      </label>
      <label class="assignment-field">
        <span>${esc(t('assign.intro'))}</span>
        <textarea id="assignIntro" rows="3" maxlength="${MAX_INTRO}"></textarea>
      </label>

      <div class="assignment-row">
        <button id="assignAll" class="ui-button">${esc(t('assign.selectAll'))}</button>
        <button id="assignNone" class="ui-button">${esc(t('assign.selectNone'))}</button>
        <span id="assignCount" class="assignment-hint"></span>
      </div>

      <ol id="assignSteps" class="assignment-steps"></ol>

      <div id="assignAdded" class="assignment-added"></div>
      <p id="assignProblem" class="assignment-problem" role="status" aria-live="polite"></p>

      <div class="assignment-row">
        <button id="assignBuild" class="ui-button">${esc(t('assign.build'))}</button>
        <button id="assignPrint" class="ui-button" disabled>${esc(t('assign.print'))}</button>
        <button id="assignDownload" class="ui-button" disabled>${esc(t('assign.download'))}</button>
      </div>
      <div id="assignResult" class="assignment-result" hidden>
        <label class="assignment-field">
          <span>${esc(t('assign.link'))}</span>
          <input id="assignLink" type="text" readonly />
        </label>
        <p id="assignLinkNote" class="assignment-hint"></p>
      </div>
    </div>`;
  document.body.appendChild(root);

  $('assignClose').onclick = () => close();
  $('assignAll').onclick = () => {
    chosen = new Set(lesson.steps.map(s => s.sid));
    render();
  };
  $('assignNone').onclick = () => {
    chosen = new Set();
    render();
  };
  $('assignBuild').onclick = () => build();
  $('assignPrint').onclick = () => printInstructions();
  $('assignDownload').onclick = () => downloadAssignment();
}

/** Take the builder off the screen. @returns {void} */
export function close() {
  root?.remove();
  root = null;
}

/** Redraw the list, the additions and the counts. */
function render() {
  if (!root) return;
  const resolved = resolveSelection(lesson, [...chosen]);
  const included = new Set(resolved.sids);
  const addedFor = new Map(resolved.added.map(a => [a.sid, a]));

  const list = $('assignSteps');
  list.innerHTML = '';
  lesson.steps.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'assignment-step';
    if (included.has(step.sid)) li.dataset.included = 'true';

    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = chosen.has(step.sid);
    box.dataset.sid = step.sid;
    box.onchange = () => {
      if (box.checked) chosen.add(step.sid);
      else chosen.delete(step.sid);
      render();
    };
    const text = document.createElement('span');
    text.textContent = `${i + 1}. ${step.title || step.sid}`;
    label.append(box, text);
    li.appendChild(label);

    const kind = document.createElement('span');
    kind.className = 'assignment-kind';
    kind.textContent = step.type + (step.kind ? `/${step.kind}` : '');
    li.appendChild(kind);

    // The conversation this interface exists to have. A step that arrived
    // because something else needs it says so, on its own line, naming the
    // step that needs it.
    const why = addedFor.get(step.sid);
    if (why) {
      const note = document.createElement('span');
      note.className = 'assignment-why';
      const needer = lesson.steps.find(s => s.sid === why.forSid);
      // Two different reasons and they are not interchangeable. A setup step
      // builds the world a later step is about; a declared dependency is a
      // measurement, a prediction or an action that a later step reads. Saying
      // "this builds the world" of a step that builds nothing would tell an
      // instructor something false about their own assignment.
      note.textContent =
        why.reason === 'requires'
          ? t('assign.added.requires', {
              step: needer?.title || why.forSid,
            })
          : t('assign.added.setup', {
              scenario: why.scenario || '—',
              step: needer?.title || why.forSid,
            });
      li.appendChild(note);
    }
    list.appendChild(li);
  });

  $('assignCount').textContent = t('assign.count', {
    chosen: chosen.size,
    included: resolved.sids.length,
    total: lesson.steps.length,
  });

  const added = $('assignAdded');
  added.textContent = resolved.added.length
    ? t('assign.added.summary', { n: resolved.added.length })
    : '';

  const check = validateSelection(lesson, {
    chosen: [...chosen],
    title: $('assignName').value,
    intro: $('assignIntro').value,
  });
  $('assignProblem').textContent = check.ok
    ? ''
    : t(`assign.error.${check.reason}`, check.detail || {});
  $('assignBuild').disabled = !check.ok;
}

/** Turn the selection into a payload and a link. */
async function build() {
  const check = validateSelection(lesson, {
    chosen: [...chosen],
    title: $('assignName').value,
    intro: $('assignIntro').value,
  });
  if (!check.ok) return;

  // Clear the previous link before making the next one. Encoding is async, so
  // leaving the old URL in the box means there is a window - short, but real -
  // in which the field shows a link to the previous selection while the button
  // says the new one is being built. Copying during it hands out the wrong
  // assignment, and nothing about the screen would say so.
  built = null;
  builtLink = null;
  $('assignLink').value = '';
  $('assignLinkNote').textContent = '';
  $('assignPrint').disabled = true;
  $('assignDownload').disabled = true;

  built = buildAssignment({
    lesson,
    chosen: [...chosen],
    title: $('assignName').value,
    intro: $('assignIntro').value,
    fingerprint: stepFingerprint,
  });

  const link = await assignmentLink(built);
  builtLink = link;
  $('assignResult').hidden = false;
  $('assignLink').value = link.url;
  // Said while the instructor can still act on it. A link that a mail client
  // wraps fails at the student's end, where nobody can fix it.
  $('assignLinkNote').textContent = link.comfortable
    ? t('assign.link.ok', { n: link.length })
    : t('assign.link.long', { n: link.length, limit: link.limit });
  $('assignLinkNote').dataset.state = link.comfortable ? 'ok' : 'long';
  $('assignPrint').disabled = false;
  $('assignDownload').disabled = false;
  $('assignLink').select?.();
}

/**
 * The printable page.
 *
 * Titles and the instructor's own words, and nothing from the answer side of
 * the lesson: no expected values, no worked solutions, no hints. Built from
 * the payload that was just made rather than from the selection, so what is
 * printed is what was issued.
 *
 * @returns {void}
 */
function printInstructions() {
  if (!built) return;
  const byId = new Map(lesson.steps.map(s => [s.sid, s]));
  const rows = built.s
    .map(sid => {
      const step = byId.get(sid);
      return `<li><strong>${esc(step?.title || sid)}</strong>
        <span class="t">${esc(step?.type || '')}</span></li>`;
    })
    .join('');

  // No 'noopener': it makes window.open return null, and this needs the handle
  // to write the page into. The window is one this code fills itself, so there
  // is no untrusted document on the other end of the reference.
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>${esc(built.t || t('assign.title'))}</title>
    <style>
      body { font: 13px/1.5 system-ui, sans-serif; margin: 2.5cm 2cm; color: #111; }
      h1 { font-size: 19px; margin: 0 0 2px; }
      .sub { color: #555; margin: 0 0 14px; }
      ol { padding-left: 20px; }
      li { margin: 3px 0; }
      .t { color: #666; font-size: 11px; margin-left: 6px; }
      .meta { border-top: 1px solid #ccc; margin-top: 18px; padding-top: 8px;
              color: #555; font-size: 11px; }
      code { word-break: break-all; font-size: 10px; }
    </style></head><body>
    <h1>${esc(built.t || t('assign.title'))}</h1>
    <p class="sub">${esc(lesson.title)} — ${esc(t('assign.print.steps', { n: built.s.length }))}</p>
    ${built.n ? `<p>${esc(built.n)}</p>` : ''}
    <ol>${rows}</ol>
    <div class="meta">
      <p>${esc(t('assign.print.open'))}</p>
      <p><code>${esc(builtLink?.url || '')}</code></p>
      <p>${esc(t('assign.print.id', { id: built.i, date: built.c }))}</p>
    </div></body></html>`);
  win.document.close();
  win.focus();
  // After the document has been committed, and never fatally: a browser that
  // refuses to open a print dialog should still leave the instructor with a
  // printable page they can print themselves.
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* the page is there; printing it is the browser's business */
    }
  }, 0);
}

/** Save the assignment as a file, for an instructor who would rather not link. */
function downloadAssignment() {
  if (!built) return;
  const blob = new Blob([`${JSON.stringify(built, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${built.l}-${built.i}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
