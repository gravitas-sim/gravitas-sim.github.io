// An estimate prediction and the box where a prediction meets the student's own readings, fetched with a
// lesson that declares `evidence` or `kind: 'estimate'`. Nothing here compares or marks before the reveal step.

import { getLocale, registerMessages, t } from '../i18n/index.js';
import { EN_REVEAL } from '../i18n/en.reveal.js';
import { ES_REVEAL } from '../i18n/es.reveal.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import {
  setKit as evidenceKit,
  estimateFor,
  estimateText,
  fellInside,
  readEstimate,
  readingsFor,
} from './evidence.js';

registerMessages('en', EN_REVEAL);
registerMessages('es', ES_REVEAL);

// The engine's own functions, handed over by stepView.js (`revealModule`): importing them here would split a shared
// chunk and add a request on every lesson route.
let kit = {};
export const setKit = k => {
  kit = k;
  evidenceKit(k);
};

// Typed and not yet committed, by step, so a redraw does not empty the boxes; and the step whose box was last announced.
const draft = {};
let arrived = '';

/** The estimate boxes: committed values are shown, held and never marked. */
export function estimate(step, c) {
  const { id, saved, active, visited } = c;
  const done = typeof saved === 'string' && saved !== '';
  const held = done && !visited.has(step.reveal);
  const have = (done ? saved.split(';') : draft[id]) || [];
  const title = active?.steps.find(x => x.sid === step.reveal)?.title;
  const boxes = (step.range ? ['low', 'high'] : ['value'])
    .map(
      (n, i) =>
        `<label class="inv-field"><span class="inv-field-label">${escape(t(`reveal.est.${n}`))}${escape(step.unit ? ` (${step.unit})` : '')}</span><input type="text" inputmode="decimal" data-est="${n}" value="${escape(have[i] ?? '').replace(/"/g, '&quot;')}"${done ? ' readonly' : ''} /></label>`
    )
    .join('');
  const note = t(held ? 'reveal.est.held' : 'reveal.est.first', {
    title: title || step.reveal,
  });
  const after = !done
    ? `<p class="inv-held" data-est-note>${escape(note)}</p><button type="button" class="ui-button" data-est-commit>${escape(t('reveal.est.commit'))}</button>`
    : held
      ? `<p class="inv-held">${escape(note)}</p><button type="button" class="ui-button subtle" data-est-change>${escape(t('inv.answer.change'))}</button>`
      : '';
  return `<div data-estimate><p class="inv-prompt" id="invChoicePrompt">${prose(step.prompt)}</p><div class="inv-fields" role="group" aria-labelledby="invChoicePrompt">${boxes}</div>${after}</div>`;
}

/**
 * The box on the reveal step: the prediction beside the student's readings and the author's one sentence, a
 * region with a heading. `predicted` is the choice prediction's verdict, when one names this step.
 * @returns {string} Markup, or '' when nothing was predicted here
 */
export function verdict(step, c, predicted) {
  const { active, responses } = c;
  const est = estimateFor(active.steps, step);
  if (!predicted && !est) return '';
  const said =
    est && readEstimate(est, responses, kit.stepKey(active.id, est.sid));
  const readings = readingsFor(step, active.steps, responses, sid =>
    kit.stepKey(active.id, sid)
  );
  const row = h => `<p class="inv-verdict-mark">${h}</p>`;
  const rows = [];
  if (predicted)
    rows.push(
      prose(t('inv.predict.youSaid', { choice: predicted.chose })),
      prose(
        predicted.right
          ? t('inv.predict.right')
          : t('inv.predict.wrong', { answer: predicted.answer })
      )
    );
  if (said)
    rows.push(
      escape(
        t('reveal.est.said', {
          value: estimateText(said, est.unit, t('reveal.range')),
        })
      )
    );
  for (const { field, text, how } of readings) {
    const noted = !how
      ? ''
      : how.k === 't'
        ? t('inv.take.typed')
        : how.l && t('inv.take.from', { what: how.l });
    rows.push(
      prose(
        t('reveal.reading', {
          what: field.label,
          value: text
            ? `${text}${field.unit ? ` ${field.unit}` : ''}`
            : t('reveal.none'),
        })
      ) + (noted ? ` <span class="inv-held">${escape(noted)}</span>` : '')
    );
  }
  // The estimate is held against the first reading.
  const inside = said ? fellInside(said, readings[0]?.value) : null;
  if (inside !== null)
    rows.push(escape(t(inside ? 'reveal.inside' : 'reveal.outside')));
  return `<section class="inv-verdict ${predicted ? (predicted.right ? 'is-right' : 'is-wrong') : ''}" role="region" aria-labelledby="invVerdictHead" data-verdict><h4 class="inv-verdict-head" id="invVerdictHead">${escape(t('reveal.head'))}</h4>${rows.map(row).join('')}${step.compare ? `<p class="inv-because">${prose(step.compare)}</p>` : ''}</section>`;
}

/** Wire the estimate boxes, and say the verdict once when its step is first drawn. */
export function bind(h, body) {
  const id = h.stepId();
  const shown = body.querySelector('[data-verdict]');
  if (!shown) arrived = '';
  else if (arrived !== id) {
    arrived = id;
    kit.announce(shown.textContent);
  }
  const box = body.querySelector('[data-estimate]');
  if (!box) return;
  const boxes = [...box.querySelectorAll('[data-est]')];
  const commit = () => {
    const raw = boxes.map(b => b.value.trim());
    const bad = raw.findIndex(
      v => !Number.isFinite(kit.typedNumber(v, getLocale()))
    );
    if (bad >= 0) {
      const note = box.querySelector('[data-est-note]');
      if (note) note.textContent = t('reveal.est.number');
      kit.announce(t('reveal.est.number'));
      return boxes[bad].focus();
    }
    const text = raw.join(';');
    h.responses()[`${id}:first`] ??= text;
    kit.recordAnswer(h.responses(), id, text, getLocale());
    h.attempts()[id] = (h.attempts()[id] || 0) + 1;
    delete draft[id];
    h.save();
    h.renderStep();
    body.querySelector('[data-est-change]')?.focus();
    kit.announce(body.querySelector('.inv-held')?.textContent ?? '');
  };
  for (const b of boxes) {
    b.addEventListener('input', () => (draft[id] = boxes.map(x => x.value)));
    b.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || b.readOnly) return;
      e.preventDefault();
      commit();
    });
  }
  box.querySelector('[data-est-commit]')?.addEventListener('click', commit);
  box.querySelector('[data-est-change]')?.addEventListener('click', () => {
    const r = h.responses();
    draft[id] = String(r[id] ?? '').split(';');
    delete r[id];
    delete r[`${id}:locale`];
    h.save();
    h.renderStep();
    body.querySelector('[data-est]')?.focus();
    kit.announce(t('inv.answer.changed'));
  });
}
