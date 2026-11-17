// An estimate, and the box where a prediction meets the student's own readings (fetched with a
// lesson that declares `evidence` or `kind: 'estimate'`). Held like a choice: nothing here compares
// or marks until the reveal step is reached; the readings themselves are the student's and stay open.

import { getLocale, registerMessages, t } from '../i18n/index.js';
import { EN_REVEAL } from '../i18n/en.reveal.js';
import { ES_REVEAL } from '../i18n/es.reveal.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import { announce } from '../notify.js';
import { recordAnswer, typedNumber } from '../answerParse.js';
import {
  estimateFor,
  estimateText,
  fellInside,
  readEstimate,
  readingsFor,
} from './evidence.js';
import { stepKey } from './progressSchema.js';

registerMessages('en', EN_REVEAL);
registerMessages('es', ES_REVEAL);

const attr = x => escape(x).replace(/"/g, '&quot;');
// What was typed and not yet committed, by step, so a redraw does not empty the boxes.
const draft = {};
let arrived = '';

/** The estimate boxes of a prediction step: committed values are shown and held, never marked. */
export function estimate(step, c) {
  const { id, saved, active, visited } = c;
  const done = typeof saved === 'string' && saved !== '';
  const held = done && !visited.has(step.reveal);
  const have = (done ? saved.split(';') : draft[id]) || [];
  const names = step.range ? ['low', 'high'] : ['value'];
  const unit = step.unit ? ` (${step.unit})` : '';
  const at = active?.steps.find(x => x.sid === step.reveal);
  const boxes = names
    .map(
      (n, i) =>
        `<label class="inv-field"><span class="inv-field-label">${escape(t(`reveal.est.${n}`))}${escape(unit)}</span><input type="text" inputmode="decimal" data-est="${n}" value="${attr(have[i] ?? '')}" ${done ? 'readonly' : ''} /></label>`
    )
    .join('');
  const note = held
    ? t('reveal.est.held', { title: at?.title || step.reveal })
    : done
      ? ''
      : t('reveal.est.first', { title: at?.title || step.reveal });
  return `<div data-estimate><p class="inv-prompt" id="invChoicePrompt">${prose(step.prompt)}</p><div class="inv-fields" role="group" aria-labelledby="invChoicePrompt">${boxes}</div>${
    done
      ? held
        ? `<p class="inv-held">${escape(note)}</p><button type="button" class="ui-button subtle" data-est-change>${escape(t('inv.answer.change'))}</button>`
        : ''
      : `<p class="inv-held" data-est-note>${escape(note)}</p><button type="button" class="ui-button" data-est-commit>${escape(t('reveal.est.commit'))}</button>`
  }</div>`;
}

/**
 * The box on the reveal step: what was predicted beside what the student read, and the author's
 * one sentence. A region with a heading, announced once when it arrives.
 * @param {Object} step - The reveal step
 * @param {Object} c - The step view's context
 * @param {?Object} predicted - The choice prediction's verdict, when one names this step
 * @returns {string} Markup, or '' when nothing was predicted here
 */
export function verdict(step, c, predicted) {
  const { active, responses } = c;
  const est = estimateFor(active.steps, step);
  const said = est && readEstimate(est, responses, stepKey(active.id, est.sid));
  if (!predicted && !est) return '';
  const readings = readingsFor(step, active.steps, responses, sid =>
    stepKey(active.id, sid)
  );
  const row = h => `<p class="inv-verdict-mark">${h}</p>`;
  const parts = [];
  if (predicted)
    parts.push(
      row(prose(t('inv.predict.youSaid', { choice: predicted.chose }))),
      row(
        prose(
          predicted.right
            ? t('inv.predict.right')
            : t('inv.predict.wrong', { answer: predicted.answer })
        )
      )
    );
  if (said)
    parts.push(
      row(
        escape(
          t('reveal.est.said', {
            value: estimateText(said, est.unit, t('reveal.range')),
          })
        )
      )
    );
  for (const r of readings) {
    const how = !r.how
      ? ''
      : r.how.k === 't'
        ? t('inv.take.typed')
        : r.how.l
          ? t('inv.take.from', { what: r.how.l })
          : '';
    parts.push(
      row(
        `${prose(
          t('reveal.reading', {
            what: r.field.label,
            value: r.text
              ? `${r.text}${r.field.unit ? ` ${r.field.unit}` : ''}`
              : t('reveal.none'),
          })
        )}${how ? ` <span class="inv-held">${escape(how)}</span>` : ''}`
      )
    );
  }
  // The first reading is the one the estimate is held against.
  const inside = said ? fellInside(said, readings[0]?.value) : null;
  if (inside !== null)
    parts.push(row(escape(t(inside ? 'reveal.inside' : 'reveal.outside'))));
  if (step.compare)
    parts.push(`<p class="inv-because">${prose(step.compare)}</p>`);
  return `<section class="inv-verdict ${predicted ? (predicted.right ? 'is-right' : 'is-wrong') : ''}" role="region" aria-labelledby="invVerdictHead" data-verdict><h4 class="inv-verdict-head" id="invVerdictHead">${escape(t('reveal.head'))}</h4>${parts.join('')}</section>`;
}

/** Wire the estimate boxes and say the verdict once, when the step is first drawn. */
export function bind(h, body) {
  const id = h.stepId();
  const box = body.querySelector('[data-estimate]');
  const shown = body.querySelector('[data-verdict]');
  if (!shown) arrived = '';
  else if (arrived !== id) {
    arrived = id;
    announce(shown.textContent);
  }
  if (!box) return;
  const boxes = [...box.querySelectorAll('[data-est]')];
  boxes.forEach(b =>
    b.addEventListener('input', () => {
      draft[id] = boxes.map(x => x.value);
    })
  );
  const commit = () => {
    const raw = boxes.map(b => b.value.trim());
    const locale = getLocale();
    const bad = raw.findIndex(v => !Number.isFinite(typedNumber(v, locale)));
    if (bad >= 0) {
      const note = box.querySelector('[data-est-note]');
      if (note) note.textContent = t('reveal.est.number');
      announce(t('reveal.est.number'));
      boxes[bad].focus();
      return;
    }
    const text = raw.join(';');
    h.responses()[`${id}:first`] ??= text;
    recordAnswer(h.responses(), id, text, locale);
    h.attempts()[id] = (h.attempts()[id] || 0) + 1;
    delete draft[id];
    h.save();
    h.renderStep();
    body.querySelector('[data-est-change]')?.focus();
    announce(body.querySelector('.inv-held')?.textContent ?? '');
  };
  box.querySelector('[data-est-commit]')?.addEventListener('click', commit);
  boxes.forEach(b =>
    b.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || b.readOnly) return;
      e.preventDefault();
      commit();
    })
  );
  box.querySelector('[data-est-change]')?.addEventListener('click', () => {
    const r = h.responses();
    draft[id] = String(r[id] ?? '').split(';');
    delete r[id];
    delete r[`${id}:locale`];
    h.save();
    h.renderStep();
    body.querySelector('[data-est]')?.focus();
    announce(t('inv.answer.changed'));
  });
}
