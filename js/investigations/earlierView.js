// =============================================================================
// Answers from an earlier version of a lesson, shown beside the lesson
// -----------------------------------------------------------------------------
// Loaded on demand by the lesson panel, only when a student's saved work holds
// answers to steps the lesson no longer has (a step revised under the
// task-change contract, js/investigations/revisions.js). Each is shown with
// what the old step asked and the words "answered in an earlier version", and
// is never marked: the old answer belongs to the old question.
// =============================================================================

import { getLocale, t } from '../i18n/index.js';
import { earlierAnswers, wasIn } from './revisions.js';

/**
 * One earlier answer as a sentence.
 *
 * @param {object} e - From earlierAnswers()
 * @param {?object} lesson - The lesson, for the successor's title
 * @returns {string} The sentence, in the reader's language
 */
export function earlierLine(e, lesson) {
  const was = wasIn(e.was, getLocale());
  const head = was
    ? t('rev.earlier.item', {
        was,
        text: e.text,
        release: e.release,
      })
    : t('rev.earlier.unknown', { text: e.text });
  if (!e.known) return head;
  const next = lesson?.steps?.find(s => s.sid === e.to);
  return `${head} ${next ? t('rev.earlier.now', { title: next.title }) : t('rev.earlier.gone')}`;
}

/**
 * List the earlier answers under the lesson's progress notice.
 *
 * @param {HTMLElement} host - The notice element
 * @param {object} lesson - The merged lesson
 * @param {{responses: object}} earlier - What readProgress set aside
 */
export function showEarlier(host, lesson, earlier) {
  host.querySelector('details.earlier-answers')?.remove();
  const rows = earlierAnswers(lesson, earlier.responses);
  if (!rows.length) return;
  const box = document.createElement('details');
  box.className = 'earlier-answers';
  const head = document.createElement('summary');
  head.textContent = t('rev.earlier.heading', { n: rows.length });
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
