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

import { closeDialog, openDialog, releaseDialog } from '../dialog.js';
import { getLocale, t } from '../i18n/index.js';
import {
  hasInvestigation,
  loadInvestigation,
} from '../data/investigations/registry.js';
import { loadFailed, toast } from '../notify.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import {
  MAX_INTRO,
  MAX_TITLE,
  buildAssignment,
  resolveSelection,
  validateSelection,
} from './assignment.js';
import {
  MAX_DUE,
  MAX_NOTE,
  applyAdaptation,
  checkAdaptation,
  lessonOrder,
  mergeOrder,
  moveStep,
  noteFor,
} from './adapt.js';
import { ensureAdaptMessages, problemText } from './adaptText.js';
import { lessonProvider } from './provider.js';
import { shortRoute } from './shortRoute.js';
import { assignmentLink } from './assignmentLink.js';

let root = null;
let lesson = null;
/** The depth being set, or null for a lesson with one. */
let depth = null;
let chosen = new Set();
let built = null;
/** The order the steps come in, once the instructor has chosen one. */
let order = [];
/** The instructor's words per step, {sid: [en, es]}. */
let notes = {};
/** What the order list was last drawn from, so typing never redraws it. */
let drawn = '';
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

const RANK = ['core', 'quantitative', 'advanced'];
const inDepth = (s, d = 'core') =>
  Math.max(0, RANK.indexOf(s.depth)) <= RANK.indexOf(d);

/** The steps at the depth being set: all of them for a lesson with one depth. */
const shown = () => lesson.steps.filter(s => inDepth(s, depth ?? undefined));

const $ = id => root?.querySelector(`#${id}`);

/**
 * Open the builder for the lesson `?assign=` names. The engine calls this only
 * when the URL carries it.
 *
 * @param {string} lessonId - The lesson the instructor is setting work from
 * @returns {Promise<void>} Settles when the builder is open, or the failure
 *   has been shown
 */
export async function bootBuilder(lessonId) {
  if (!hasInvestigation(lessonId)) {
    toast(t('inv.link.unknown'));
    return;
  }
  try {
    const [loaded] = await Promise.all([
      loadInvestigation(lessonId),
      import('../i18n/deferredMessages.js').then(m =>
        m.ensureDeferredMessages().catch(() => {})
      ),
    ]);
    if (loaded) await openBuilder(loaded);
  } catch {
    loadFailed(() => location.reload());
  }
}

/**
 * Open the builder over a lesson.
 *
 * @param {object} loaded - The merged lesson
 * @returns {void}
 */
export async function openBuilder(loaded) {
  // A lesson with deeper steps is set at one depth: they are laid in so the
  // instructor sees what each depth adds.
  depth = null;
  if (loaded.depths) {
    const m = await import('../investigations/depth.js');
    [lesson] = await Promise.all([
      m.withDepth(loaded, getLocale()),
      m.messages(),
    ]);
    depth = 'core';
  } else lesson = loaded;
  chosen = new Set();
  order = [];
  notes = {};
  drawn = '';
  // ?route=short starts from the derived short route (./shortRoute.js).
  if (/[?&]route=short\b/.test(location.search))
    chosen = new Set(shortRoute(lesson).chosen);
  built = null;
  builtLink = null;
  await ensureAdaptMessages().catch(() => {});
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
  // Hidden until the shared dialog opens it: openDialog() does nothing for a
  // panel that is already shown.
  root.hidden = true;
  root.innerHTML = `
    <div class="assignment-inner">
      <div class="assignment-head">
        <h2 id="assignTitle">${esc(t('assign.title'))}</h2>
        <button id="assignClose" class="ui-button" title="${esc(t('assign.close'))}" aria-label="${esc(t('assign.close'))}">✕</button>
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
      <label class="assignment-field" id="assignDepthRow" hidden>
        <span>${esc(t('assign.depth'))}</span>
        <select id="assignDepth"></select>
      </label>
      <label class="assignment-field">
        <span>${esc(t('assign.roster'))}</span>
        <input id="assignRoster" type="text" maxlength="120" aria-describedby="assignRosterHelp" />
      </label>
      <p id="assignRosterHelp" class="assignment-hint">${esc(t('assign.roster.help'))}</p>

      <div class="assignment-row">
        <button id="assignAll" class="ui-button">${esc(t('assign.selectAll'))}</button>
        <button id="assignNone" class="ui-button">${esc(t('assign.selectNone'))}</button>
        <span id="assignCount" class="assignment-hint"></span>
      </div>

      <ol id="assignSteps" class="assignment-steps"></ol>

      <section class="assignment-adapt" aria-labelledby="adaptTitle">
        <h3 id="adaptTitle">${esc(t('adapt.title'))}</h3>
        <p class="assignment-hint">${esc(t('adapt.hint'))}</p>
        <label class="assignment-field">
          <span>${esc(t('adapt.due'))}</span>
          <input id="assignDue" type="text" maxlength="${MAX_DUE}" aria-describedby="assignDueHelp" />
        </label>
        <p id="assignDueHelp" class="assignment-hint">${esc(t('adapt.due.help'))}</p>
        <label class="assignment-row">
          <input id="assignMarking" type="checkbox" />
          <span>${esc(t('adapt.marking'))}</span>
        </label>
        <label class="assignment-field">
          <span>${esc(t('adapt.more'))}</span>
          <select id="assignMore">
            <option value="">${esc(t('adapt.more.depth'))}</option>
            <option value="open">${esc(t('adapt.more.open'))}</option>
            <option value="shut">${esc(t('adapt.more.shut'))}</option>
          </select>
        </label>
        <h4 id="adaptOrderTitle">${esc(t('adapt.order'))}</h4>
        <ol id="adaptOrder" class="assignment-steps" aria-labelledby="adaptOrderTitle"></ol>
        <p id="adaptStatus" class="assignment-hint" role="status" aria-live="polite"></p>
      </section>

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
        <div class="assignment-row">
          <a id="assignKit" class="ui-button" target="_blank" rel="noopener">${esc(t('assign.kit'))}</a>
          <a id="assignPreview" class="ui-button" target="_blank" rel="noopener">${esc(t('assign.preview'))}</a>
          <a id="assignCourse" class="ui-button" target="_blank" rel="noopener">${esc(t('assign.addCourse'))}</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  // The shared dialog behaviour (js/dialog.js): focus moves to the name field,
  // Tab stays inside, Escape closes, the page behind is inert, and focus goes
  // back to what opened it. The builder used to open behind a focus that
  // stayed on the page, so a keyboard or screen-reader instructor worked in a
  // dialog they were never moved into (P81 K-1).
  openDialog(root, {
    initialFocus: '#assignName',
    isolate: true,
    onClose: () => {
      const gone = root;
      root = null;
      if (gone) releaseDialog(gone);
      gone?.remove();
    },
  });

  $('assignClose').onclick = () => close();
  $('assignDepth').onchange = e => {
    depth = e.target.value;
    chosen = new Set(
      [...chosen].filter(sid => shown().some(s => s.sid === sid))
    );
    render();
  };
  $('assignAll').onclick = () => {
    chosen = new Set(shown().map(s => s.sid));
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
  if (root) closeDialog(root, 'close');
}

/** Redraw the list, the additions and the counts. */
function render() {
  if (!root) return;
  const picker = $('assignDepth');
  $('assignDepthRow').hidden = !depth;
  if (depth && picker.value !== depth) {
    picker.innerHTML = lesson.depths
      .map(d => `<option value="${d}">${esc(t(`inv.depth.${d}`))}</option>`)
      .join('');
    picker.value = depth;
  }
  const resolved = resolveSelection(lesson, [...chosen], depth ?? undefined);
  const included = new Set(resolved.sids);
  const addedFor = new Map(resolved.added.map(a => [a.sid, a]));

  const list = $('assignSteps');
  list.innerHTML = '';
  shown().forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'assignment-step';
    if (included.has(step.sid)) li.dataset.included = 'true';

    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = chosen.has(step.sid);
    box.dataset.sid = step.sid;
    box.onchange = () => {
      $('adaptStatus').textContent = '';
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

  const opts = () => ({ depth: depth ?? undefined });
  order = mergeOrder(lesson, order, resolved.sids, opts());
  renderOrder();

  $('assignCount').textContent = t('assign.count', {
    chosen: chosen.size,
    included: resolved.sids.length,
    total: shown().length,
  });

  const added = $('assignAdded');
  added.textContent = resolved.added.length
    ? t('assign.added.summary', { n: resolved.added.length })
    : '';

  const check = validateSelection(lesson, {
    chosen: [...chosen],
    depth: depth ?? undefined,
    title: $('assignName').value,
    intro: $('assignIntro').value,
  });
  $('assignProblem').textContent = check.ok
    ? ''
    : t(`assign.error.${check.reason}`, check.detail || {});
  $('assignBuild').disabled = !check.ok;
}

const titleOf = sid => lesson.steps.find(s => s.sid === sid)?.title || sid;

/** Say what was done, or why it was not. @param {?Array} problems */
function say(done, problems) {
  $('adaptStatus').textContent = problems?.length
    ? t('adapt.refused', { why: problemText(problems[0], titleOf) })
    : done;
}

/** Move a step a place; the graph decides. */
function move(sid, by, act) {
  const o = { depth: depth ?? undefined, base: lessonOrder(lesson, order) };
  const got = moveStep(lesson, order, sid, by, o);
  if (got.problems.length) return say('', got.problems);
  order = got.list;
  refocus = { sid, act };
  render();
  say(t('adapt.moved', { step: titleOf(sid) }));
}

/**
 * Take a step out of the activity, or refuse naming what needs it: a step
 * another step reads, reveals through or stands under cannot go, and one the
 * selection would bring straight back is refused with the reason it gave.
 */
function removeStep(sid) {
  const without = order.filter(x => x !== sid);
  const o = { depth: depth ?? undefined, base: order };
  const check = checkAdaptation(lesson, without, o);
  if (!check.ok) return say('', check.problems);
  const rest = [...chosen].filter(x => x !== sid);
  const again = resolveSelection(lesson, rest, depth ?? undefined);
  const why = again.added.find(a => a.sid === sid);
  if (why) {
    const needer = lesson.steps.find(s => s.sid === why.forSid);
    const key =
      why.reason === 'requires'
        ? 'assign.added.requires'
        : 'assign.added.setup';
    $('adaptStatus').textContent = t('adapt.refused', {
      why: t(key, {
        scenario: why.scenario || '—',
        step: needer?.title || why.forSid,
      }),
    });
    return;
  }
  chosen = new Set(rest);
  refocus = { sid: without[0] ?? null, act: 'remove' };
  render();
  say(t('adapt.removed', { step: titleOf(sid) }));
}

/** Where focus goes after a redraw, so a keyboard instructor keeps their place. */
let refocus = null;

/** Draw the order list, unless it is already what is on screen. */
function renderOrder() {
  const list = $('adaptOrder');
  const signature = `${order.join('|')}#${depth}`;
  if (signature !== drawn) {
    drawn = signature;
    list.innerHTML = '';
    if (!order.length) {
      const li = document.createElement('li');
      li.className = 'assignment-step assignment-hint';
      li.textContent = t('adapt.order.empty');
      list.appendChild(li);
    }
    order.forEach((sid, i) => {
      const li = document.createElement('li');
      li.className = 'assignment-step';
      li.dataset.sid = sid;
      const name = document.createElement('span');
      name.style.flex = '1 1 12em';
      name.textContent = `${i + 1}. ${titleOf(sid)}`;
      li.appendChild(name);
      const button = (act, by, disabled) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-button';
        b.dataset.act = act;
        b.disabled = disabled;
        b.textContent = t(`adapt.${act}`);
        b.setAttribute(
          'aria-label',
          t(`adapt.${act}.label`, { step: titleOf(sid) })
        );
        b.onclick = () =>
          act === 'remove' ? removeStep(sid) : move(sid, by, act);
        li.appendChild(b);
      };
      button('up', -1, i === 0);
      button('down', 1, i === order.length - 1);
      button('remove', 0, false);
      const more = document.createElement('details');
      more.style.flexBasis = '100%';
      const sum = document.createElement('summary');
      sum.textContent = t('adapt.note');
      more.appendChild(sum);
      ['en', 'es'].forEach((lang, k) => {
        const field = document.createElement('label');
        field.className = 'assignment-field';
        const cap = document.createElement('span');
        cap.textContent = t(`adapt.note.${lang}`);
        const area = document.createElement('textarea');
        area.rows = 2;
        area.maxLength = MAX_NOTE;
        area.lang = lang;
        area.value = notes[sid]?.[k] ?? '';
        area.oninput = () => {
          const pair = notes[sid] || ['', ''];
          pair[k] = area.value;
          notes[sid] = pair;
        };
        field.append(cap, area);
        more.appendChild(field);
      });
      if (notes[sid]?.some(Boolean)) more.open = true;
      li.appendChild(more);
      list.appendChild(li);
    });
  }
  if (refocus) {
    const row =
      refocus.sid && list.querySelector(`li[data-sid="${refocus.sid}"]`);
    const pick = a => row?.querySelector(`[data-act="${a}"]:not(:disabled)`);
    (
      pick(refocus.act) ||
      pick('down') ||
      pick('up') ||
      row?.querySelector('button')
    )?.focus();
    refocus = null;
  }
}

/** Turn the selection into a payload and a link. */
async function build() {
  const check = validateSelection(lesson, {
    chosen: [...chosen],
    depth: depth ?? undefined,
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

  // The order is proved against the step graph before anything is written.
  const graph = checkAdaptation(lesson, order, {
    depth: depth ?? undefined,
    base: lessonOrder(lesson, order),
  });
  if (!graph.ok) return say('', graph.problems);

  built = applyAdaptation(
    buildAssignment({
      lesson,
      chosen: [...chosen],
      title: $('assignName').value,
      intro: $('assignIntro').value,
      fingerprint: stepFingerprint,
      provider: lessonProvider(lesson.id),
      depth,
      markingNote: $('assignMarking').checked,
      more: $('assignMore').value || null,
    }),
    {
      lesson,
      order,
      notes,
      due: $('assignDue').value,
      fingerprint: stepFingerprint,
    }
  );

  const link = await assignmentLink(built);
  // The class code rides on the query string, where the lesson puts it in
  // the submission token, so the review page can sort by it.
  const roster = $('assignRoster').value.trim();
  if (roster) {
    const u = new URL(link.url);
    u.searchParams.set('roster', roster);
    link.url = u.href;
    link.length = link.url.length;
    link.comfortable = link.length <= link.limit;
  }
  builtLink = link;
  // What to do with the link: the kit that hands it out, the student's view of
  // it, and the course builder with this activity already in it.
  const kit = new URL('/teaching/kit/', location.origin);
  if (roster) kit.searchParams.set('roster', roster);
  kit.hash = link.fragment;
  $('assignKit').href = kit.href;
  // Progress-free: the page reads none of the saved record and writes none.
  const preview = new URL(link.url);
  preview.searchParams.set('preview', 'student');
  $('assignPreview').href = preview.href;
  const course = new URL('/studio/course/', location.origin);
  course.searchParams.set('activity', link.fragment);
  $('assignCourse').href = course.href;
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
  const roster = builtLink && new URL(builtLink.url).searchParams.get('roster');
  const byId = new Map(lesson.steps.map(s => [s.sid, s]));
  const rows = built.s
    .map(sid => {
      const step = byId.get(sid);
      const note = noteFor(built.x, sid, getLocale());
      return `<li><strong>${esc(step?.title || sid)}</strong>
        <span class="t">${esc(step?.type || '')}</span>${note ? `<br><em>${esc(note)}</em>` : ''}</li>`;
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
    <p class="sub">${esc(lesson.title)} — ${esc(t('assign.print.steps', { n: built.s.length }))}${built.d ? ` — ${esc(t('inv.depth.state', { depth: t(`inv.depth.${built.d}`) }))}` : ''}</p>
    ${built.n ? `<p>${esc(built.n)}</p>` : ''}
    ${built.u ? `<p><strong>${esc(t('adapt.due.shown', { due: built.u }))}</strong></p>` : ''}
    <ol>${rows}</ol>
    <div class="meta">
      <p>${esc(t('assign.print.open'))}</p>
      <p><code>${esc(builtLink?.url || '')}</code></p>
      <p>${esc(t('assign.print.id', { id: built.i, date: built.c }))}</p>
      ${roster ? `<p>${esc(t('assign.print.roster', { code: roster }))}</p>` : ''}
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
