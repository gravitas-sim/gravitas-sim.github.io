// =============================================================================
// How a lesson ends: back to its question, with the student's own work
// -----------------------------------------------------------------------------
// Lazy: fetched when the finish dialog opens (openFinish in
// js/investigations.js), in place of next.js, which it then calls. For a lesson
// that states its `question` (js/lesson/opening.js), the dialog's section above
// the name field shows the question and, in lesson order, the student's own
// answers and readings, each reading with how it was taken (typed, or taken
// from a readout). Nothing here is a key, a `want` or a mark: what the student
// entered is all it reads, and a multiple-choice check is left to the report.
// A lesson without a question keeps the dialog as it was. The words are the
// fragment's (js/fragments/lesson-finish.html), as "What next" does, so the
// catalog carries none.
// =============================================================================

import { endingRows, plain } from '../lesson/opening.js';
import { handInName } from '../handInName.js';
import { whatNext } from './next.js';

const fill = (pattern, values) =>
  pattern.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');

/** One row of the list, as words. */
export function rowText(row, words, take) {
  const unit = row.unit ? ` ${row.unit}` : '';
  const said = fill(words(row.kind), {
    text: `${row.text}${unit}`,
    label: row.label ?? '',
  });
  const how = row.how ? take(row.how) : '';
  return `${row.title} — ${said}${how ? ` (${how.replace(/\.$/, '')})` : ''}`;
}

/** Say what the files will be called, now and each time the name changes. */
export function fileLine(host) {
  const line = document.getElementById('investigationFinishFile');
  const input = document.getElementById('investigationName');
  if (!line || !input) return;
  const draw = () => {
    const { active } = host.state();
    const es = host.lib.getLocale() === 'es';
    const name = input.value.trim() || (es ? 'tu nombre' : 'your name');
    line.textContent = fill(
      line.getAttribute(`data-file-${es ? 'es' : 'en'}`) || '',
      {
        pdf: handInName(name, active.id, 'pdf'),
        html: handInName(name, active.id, 'html'),
      }
    );
  };
  draw();
  if (!line.dataset.live) {
    line.dataset.live = '1';
    input.addEventListener('input', draw);
  }
}

/**
 * Draw the ending, then what comes next.
 * @param {import('./finish.js').FinishHost} host - The lesson's finish host
 * @param {Array<object>} steps - The steps the student was shown
 * @param {{id: string, deeper: ?string, onDeeper: Function}} ctx - For next.js
 */
export function ending(host, steps, ctx) {
  const box = document.getElementById('investigationEnding');
  fileLine(host);
  const { active, responses } = host.state();
  const { t, getLocale } = host.lib;
  if (box) {
    const question = active?.question;
    box.hidden = !question;
    if (question) {
      const lang = getLocale() === 'es' ? 'es' : 'en';
      const words = kind => box.getAttribute(`data-${kind}-${lang}`) || '';
      const take = how =>
        how.k === 't'
          ? t('inv.take.typed')
          : how.l
            ? t('inv.take.from', { what: how.l })
            : '';
      const rows = endingRows(steps, responses, s =>
        host.stepId(active.steps.indexOf(s))
      );
      document.getElementById('investigationEndingQuestion').textContent =
        plain(question);
      const list = document.getElementById('investigationEndingList');
      list.replaceChildren(
        ...rows.map(r => {
          const li = document.createElement('li');
          li.textContent = rowText(r, words, take);
          return li;
        })
      );
      list.hidden = !rows.length;
      document.getElementById('investigationEndingNone').hidden =
        rows.length > 0;
    }
  }
  return whatNext(document.getElementById('investigationNextList'), ctx);
}
