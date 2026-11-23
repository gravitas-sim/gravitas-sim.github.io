// The student's own readings and revealed predictions beside a written answer. Fetched by reveal.js with the first
// short-answer step, so a lesson without one pays nothing for it. Words: the `tray.*` keys of en.reveal.js.

import { registerMessages, t } from '../i18n/index.js';
import { EN_TRAY } from '../i18n/en.tray.js';
import { ES_TRAY } from '../i18n/es.tray.js';
import { CITES } from './trayCites.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import {
  citable,
  estimateText,
  fellInside,
  readEstimate,
  readingsFor,
} from './evidence.js';

registerMessages('en', EN_TRAY);
registerMessages('es', ES_TRAY);

// Whether the tray beside a written answer was left open or shut, by step; unset, it is shut on a phone.
const left = {};

/**
 * The student's own readings and revealed predictions beside a written answer, as a disclosure to cite from: read-only,
 * nothing placed in the box, nothing required. A prediction appears only once its reveal step has been reached, and
 * only as the student said it and how it compared: the author's key is never printed.
 * @returns {string} Markup, or '' when the lesson gives this step nothing to cite
 */
export function tray(step, c, kit) {
  const { id, active, responses, visited } = c;
  const steps = active?.steps;
  const { readings, predictions } = steps
    ? citable(steps, step, CITES[active.id]?.[step.sid])
    : { readings: [], predictions: [] };
  if (!readings.length && !predictions.length) return '';
  const key = sid => kit.stepKey(active.id, sid);
  const title = sid => steps.find(s => s.sid === sid)?.title || sid;
  const rows = [];
  const add = (sid, what, how) => {
    const n = `${id}-${rows.length}`.replace(/[^\w-]/g, '_');
    rows.push({
      at: steps.findIndex(s => s.sid === sid),
      html: `<li class="inv-tray-row"><span class="inv-tray-what" id="invTrayWhat-${n}">${what}</span> <span class="inv-tray-how">${escape([...how, t('tray.in', { title: title(sid) })].filter(Boolean).join(' '))}</span> <button type="button" class="inv-import-btn" data-cite id="invTrayCite-${n}" aria-labelledby="invTrayCite-${n} invTrayWhat-${n}">${escape(t('tray.cite'))}</button></li>`,
    });
  };
  readingsFor({ evidence: readings }, steps, responses, key).forEach(
    ({ field, text, how }, i) => {
      if (!text) return;
      add(
        readings[i].step,
        prose(
          t('reveal.reading', {
            what: field.label,
            value: `${text}${field.unit ? ` ${field.unit}` : ''}`,
          })
        ),
        how && how.k !== 't'
          ? [
              t('inv.take.from', { what: how.l }),
              how.b && t('tray.of', { body: how.b }),
              Number.isFinite(how.t) &&
                t('tray.clock', { time: kit.formatTime(how.t) }),
            ]
          : [t('inv.take.typed')]
      );
    }
  );
  for (const p of predictions) {
    if (!visited.has(p.reveal)) continue;
    const from = steps.find(s => s.sid === p.step);
    const saved = responses?.[key(p.step)];
    if (from.kind === 'estimate') {
      const said = readEstimate(from, responses, key(p.step));
      if (!said) continue;
      const own = readingsFor(
        steps.find(s => s.sid === p.reveal),
        steps,
        responses,
        key
      )[0]?.value;
      const inside = fellInside(said, own);
      add(
        p.step,
        escape(
          t('reveal.est.said', {
            value: estimateText(said, from.unit, t('reveal.range')),
          })
        ),
        [inside !== null && t(inside ? 'reveal.inside' : 'reveal.outside')]
      );
    } else if (from.options[Number(saved)] != null) {
      add(
        p.step,
        prose(
          t('inv.predict.youSaid', { choice: from.options[Number(saved)] })
        ),
        [
          from.answer !== undefined &&
            t(
              Number(saved) === from.answer
                ? 'inv.predict.right'
                : 'tray.differed'
            ),
        ]
      );
    }
  }
  rows.sort((a, b) => a.at - b.at);
  const open =
    left[id] ?? !globalThis.matchMedia?.('(max-width: 900px)').matches;
  return `<details class="inv-tray inv-verdict" data-tray${open ? ' open' : ''}><summary>${escape(t('tray.head', { n: rows.length }))}</summary><p class="inv-verdict-head">${escape(t('tray.note'))}</p>${rows.length ? `<ul class="inv-tray-list">${rows.map(r => r.html).join('')}</ul>` : `<p class="inv-verdict-head">${escape(t('tray.empty'))}</p>`}</details>`;
}

/** Remember the student's open or shut choice, and make Cite go to the box without placing anything in it. */
export function bind(h, body, kit) {
  const id = h.stepId();
  const shut = body.querySelector('[data-tray]');
  shut?.addEventListener('toggle', () => (left[id] = shut.open));
  shut?.querySelectorAll('[data-cite]').forEach(b =>
    b.addEventListener('click', () => {
      body.querySelector('[data-answer]')?.focus();
      kit.announce(
        t('tray.cited', {
          what: b.closest('li').querySelector('.inv-tray-what').textContent,
        })
      );
    })
  );
}
