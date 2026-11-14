// =============================================================================
// Answers from an earlier version, and links to what was retired (lazy)
// -----------------------------------------------------------------------------
// One lazy module for the words and the views of the task-change contract
// (js/investigations/revisions.js): the lesson panel's list of answers to steps
// the lesson no longer has, the sentences for the lab report and an assignment
// notice, and the follow-through for `#investigation=<retired id>`. The strings
// are inline, English and Spanish, so nothing else is fetched.
// =============================================================================

import { getLocale, t } from '../i18n/index.js';
import { toast } from '../notify.js';
import {
  investigationIds,
  investigationMeta,
} from '../data/investigations/registry.js';
import { retiredInvestigation } from '../data/retiredInvestigations.js';
import { readJson } from '../storage/local.js';
import { KEY_INVESTIGATION_PREFIX } from '../names.js';
import { earlierAnswers, retiredAnswers, wasIn } from './revisions.js';

const W = {
  en: {
    head: 'Answers from an earlier version ({n})',
    item: '"{was}": {text} (answered in an earlier version, before {release}; not marked)',
    unknown:
      '{text} (a step this lesson no longer has; answered in an earlier version; not marked)',
    now: 'Now: {title}.',
    replaced: '"{was}" was replaced in release {release} by "{title}".',
    removed: '"{was}" was removed in release {release}.',
    moved: 'Replaced in release {release} by "{title}", open now.',
    retired: 'Retired in release {release}.',
  },
  es: {
    head: 'Respuestas de una versión anterior ({n})',
    item: '"{was}": {text} (respondida en una versión anterior, antes de la {release}; no se corrige)',
    unknown:
      '{text} (un paso que esta lección ya no tiene; respondida en una versión anterior; no se corrige)',
    now: 'Ahora: {title}.',
    replaced: '"{was}" se sustituyó en la versión {release} por "{title}".',
    removed: '"{was}" se quitó en la versión {release}.',
    moved: 'Sustituida en la versión {release} por "{title}", abierta ahora.',
    retired: 'Retirada en la versión {release}.',
  },
};
const say = (id, vars = {}) =>
  (W[getLocale()] ?? W.en)[id].replace(/\{(\w+)\}/g, (_, k) => vars[k]);

/** One earlier answer as a sentence (`e` from earlierAnswers()). */
export function earlierLine(e, lesson) {
  const was = wasIn(e.was, getLocale());
  const head = was
    ? say('item', { was, text: e.text, release: e.release })
    : say('unknown', { text: e.text });
  if (!e.known) return head;
  const next = lesson?.steps?.find(s => s.sid === e.to);
  return next ? `${head} ${say('now', { title: next.title })}` : head;
}

/** What happened to a retired step, in a sentence (`entry` from a retired map). */
export function revisionLine(entry, lesson) {
  const was = wasIn(entry.was, getLocale());
  const next = lesson?.steps?.find(s => s.sid === entry.to);
  return next
    ? say('replaced', { was, release: entry.release, title: next.title })
    : say('removed', { was, release: entry.release });
}

/** List earlier answers under the lesson's progress notice. */
export function listEarlier(host, lesson, rows) {
  if (!host || !rows.length) return;
  host.querySelector('details.earlier-answers')?.remove();
  const box = document.createElement('details');
  box.className = 'earlier-answers';
  const head = document.createElement('summary');
  head.textContent = say('head', { n: rows.length });
  const list = document.createElement('ul');
  for (const e of rows) {
    const li = document.createElement('li');
    li.textContent = earlierLine(e, lesson);
    list.append(li);
  }
  box.append(head, list);
  host.append(box);
  host.hidden = false;
}

/** The answers a lesson holds to steps it no longer has (`earlier` from readProgress). */
export const showEarlier = (host, lesson, earlier) =>
  listEarlier(host, lesson, earlierAnswers(lesson, earlier.responses));

/** The earlier answers as sentences, for the report. */
export const earlierLines = (lesson, earlier) =>
  earlierAnswers(lesson, earlier.responses).map(e => earlierLine(e, lesson));

/**
 * What an unresolved `#investigation=<id>` turns into: the successor opens with
 * a notice, or the student is told the lesson was retired.
 *
 * @param {string} id - The id in the address bar
 * @param {?string} depth - The depth the link asked for
 * @param {Function} open - openInvestigation of js/investigations.js
 * @param {object} [record] - The retired record (tests pass their own)
 * @returns {Promise<{status: 'unknown'|'moved'|'retired', to: ?string}>}
 */
export async function openRetired(id, depth, open, record) {
  const r = retiredInvestigation(id, new Set(investigationIds()), record);
  if (!r) {
    toast(t('inv.link.unknown'));
    return { status: 'unknown', to: null };
  }
  if (!r.to) {
    toast(say('retired', { release: r.release }));
    return { status: 'retired', to: null };
  }
  toast(
    say('moved', {
      release: r.release,
      title: investigationMeta(r.to)?.title || r.to,
    })
  );
  await Promise.resolve(open(r.to, { depth })).catch(() => {});
  const saved = readJson(`${KEY_INVESTIGATION_PREFIX}${id}`);
  listEarlier(
    document.getElementById('investigationProgressNotice'),
    null,
    retiredAnswers(id, saved?.responses, r)
  );
  return { status: 'moved', to: r.to };
}
