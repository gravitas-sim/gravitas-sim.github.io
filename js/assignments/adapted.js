// =============================================================================
// An adapted or out-of-date activity, as the page that opens it shows it
// -----------------------------------------------------------------------------
// Prompt 175. Loaded by ./assignmentBridge.js only when the link carries an
// instructor's words (`x`, `u`) or the lesson has moved under it, so a plain
// activity costs nothing more than it did.
//
// Three things on the open panel:
//
//   a due line under the title, as the instructor wrote it;
//   the instructor's sentence on a step, under that step's title, in the
//     reader's language else the other;
//   a report when the lesson has changed since the link was made: the steps
//     rewritten (their digest no longer matches), the steps gone, what the
//     lesson now needs that the activity does not give it, and the package pin,
//     with two ways forward - keep it as it was made, or update it, which is a
//     new activity with its own id (./adapt.js repin).
//
// The engine has no hook for a step's words, and js/investigations.js and its
// step view are at their size ceilings, so the sentence is placed by one
// observer on the panel body. It is wired once, for the page, and reads the
// current activity through accessors, so no earlier activity's scope is held
// (e2e/lessonPerformance.spec.js counts what a rebuilt panel leaves behind).
// =============================================================================

import { getLocale, t } from '../i18n/index.js';
import { loadInvestigation } from '../data/investigations/registry.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import { stepBindings } from './assignment.js';
import { assignmentLink } from './assignmentLink.js';
import { noteFor, readAdaptation, repin, whatChanged } from './adapt.js';
import { ensureAdaptMessages } from './adaptText.js';
import { packageBinding } from './pinning.js';
import { lessonProvider } from './provider.js';

/** What the page is showing now: set by show(), read by the one observer. */
const now = { id: null, x: {}, binding: () => null, active: () => null };
let observer = null;

const $ = id => document.getElementById(id);

/** Take away what an earlier activity put on the panel. */
function clear() {
  $('adaptDue')?.remove();
  $('adaptReport')?.remove();
  document.querySelectorAll('.adapt-note').forEach(n => n.remove());
}

/** Put the instructor's sentence under the title of the step on screen. */
function place() {
  const body = $('investigationBody');
  if (!body) return;
  if (now.active()?.i !== now.id) {
    observer?.disconnect();
    observer = null;
    clear();
    return;
  }
  const title = body.querySelector('.inv-step-title');
  if (!title || title.nextElementSibling?.classList.contains('adapt-note'))
    return;
  const n = Number(
    body.querySelector('.inv-step-count')?.textContent.match(/\d+/)?.[0]
  );
  const sid = now.binding()?.steps?.[n - 1]?.sid;
  const text = noteFor(now.x, sid, getLocale());
  if (!text) return;
  const note = document.createElement('p');
  note.className = 'ui-note adapt-note';
  const from = document.createElement('strong');
  from.textContent = `${t('adapt.note.from')}: `;
  note.append(from, text);
  title.after(note);
}

/** The lesson as the report must read it: laid at the depth the link names. */
async function lessonFor(assignment) {
  const lesson = await loadInvestigation(assignment.l);
  if (lesson?.depths && assignment.d && assignment.d !== 'core') {
    const m = await import('../investigations/depth.js');
    return m.withDepth(lesson, getLocale());
  }
  return lesson;
}

/** A line of text and a heading for the report's list. */
const para = (text, tag = 'p') => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};

/** The report, or null when the lesson has not moved under the activity. */
async function report(assignment, lesson) {
  const resolution = stepBindings(assignment, lesson, stepFingerprint);
  const pin = packageBinding(assignment, lessonProvider(assignment.l));
  const changes = whatChanged(assignment, lesson, resolution, pin);
  if (!changes.any) return null;

  const box = document.createElement('section');
  box.id = 'adaptReport';
  box.className = 'ui-note';
  box.setAttribute('aria-labelledby', 'adaptReportTitle');
  const head = para(t('adapt.report.title'), 'h3');
  head.id = 'adaptReportTitle';
  box.append(head);
  if (changes.changed.length)
    box.append(
      para(t('adapt.report.rewritten', { steps: changes.changed.join('; ') }))
    );
  if (changes.missing.length)
    box.append(
      para(t('adapt.report.removed', { steps: changes.missingSids.join('; ') }))
    );
  if (pin.status === 'major' || pin.status === 'moved')
    box.append(
      para(
        t(`assign.notice.${pin.status}`, {
          pinned: pin.pinned ? `${pin.pinned.id} ${pin.pinned.version}` : '',
          current: pin.current
            ? `${pin.current.id} ${pin.current.version}`
            : '',
        })
      )
    );

  const row = document.createElement('div');
  row.className = 'assignment-row';
  const keep = para(t('adapt.report.keep'), 'button');
  keep.type = 'button';
  keep.className = 'ui-button';
  const update = para(t('adapt.report.repin'), 'button');
  update.type = 'button';
  update.className = 'ui-button';
  row.append(keep, update);
  const said = para('', 'p');
  said.setAttribute('role', 'status');
  said.setAttribute('aria-live', 'polite');
  const result = document.createElement('div');
  result.hidden = true;
  box.append(row, said, result);

  keep.onclick = () => {
    row.hidden = true;
    result.hidden = true;
    said.textContent = t('adapt.report.kept');
    $('investigationTitle')?.focus?.();
    setTimeout(() => box.remove(), 4000);
  };
  update.onclick = async () => {
    const fresh = repin(
      assignment,
      lesson,
      stepFingerprint,
      lessonProvider(assignment.l)
    );
    const link = await assignmentLink(fresh);
    const field = document.createElement('input');
    field.type = 'text';
    field.readOnly = true;
    field.value = link.url;
    field.setAttribute('aria-label', t('adapt.report.link'));
    const open = para(t('adapt.report.open'), 'a');
    open.className = 'ui-button';
    open.href = link.url;
    result.replaceChildren(para(t('adapt.report.repinned')), field, open);
    result.hidden = false;
    said.textContent = '';
    field.select();
  };
  return box;
}

/**
 * Show what an opened activity carries and what has changed under it.
 *
 * @param {object} o
 * @param {object} o.assignment - The validated payload that was opened
 * @param {() => ?object} o.active - investigations.activeAssignment
 * @param {() => ?object} o.binding - investigations.activeAssignmentBinding
 * @returns {Promise<void>} Settles when the panel has what it should show
 */
export async function showAdapted({ assignment, active, binding }) {
  await ensureAdaptMessages().catch(() => {});
  clear();
  const { x, u } = readAdaptation(assignment);
  Object.assign(now, { id: assignment.i, x, binding, active });

  const header = $('investigationSubtitle');
  if (u && header) {
    const due = para(t('adapt.due.shown', { due: u }));
    due.id = 'adaptDue';
    header.after(due);
  }
  const body = $('investigationBody');
  if (!body) return;
  if (Object.keys(x).length) {
    observer ??= new MutationObserver(place);
    observer.disconnect();
    observer.observe(body, { childList: true, subtree: true });
    place();
  }
  const lesson = await lessonFor(assignment);
  if (!lesson || active()?.i !== assignment.i) return;
  const box = await report(assignment, lesson);
  if (box && active()?.i === assignment.i) body.before(box);
}
