// An estimate prediction and the box where a prediction meets the student's own readings, fetched with a
// lesson that declares `evidence` or `kind: 'estimate'`. Nothing here compares or marks before the reveal step.

import { getLocale, registerMessages, t } from '../i18n/index.js';
import { formatTime } from '../units.js';
import { EN_REVEAL } from '../i18n/en.reveal.js';
import { ES_REVEAL } from '../i18n/es.reveal.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import {
  setKit as evidenceKit,
  citable,
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
// Whether the tray beside a written answer was left open or shut, by step; unset, it is shut on a phone.
const left = {};

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

/**
 * The student's own readings and revealed predictions beside a written answer, as a disclosure to cite from: read-only,
 * nothing placed in the box, nothing required. A prediction appears only once its reveal step has been reached, and
 * only as the student said it and how it compared: the author's key is never printed.
 * @returns {string} Markup, or '' when the lesson gives this step nothing to cite
 */
export function tray(step, c) {
  const { id, active, responses, visited } = c;
  const steps = active?.steps;
  const { readings, predictions } = steps
    ? citable(steps, step, active.id)
    : { readings: [], predictions: [] };
  if (!readings.length && !predictions.length) return '';
  const key = sid => kit.stepKey(active.id, sid);
  const title = sid => steps.find(s => s.sid === sid)?.title || sid;
  const rows = [];
  const add = (sid, what, how) => {
    const n = `${id}-${rows.length}`.replace(/[^\w-]/g, '_');
    rows.push({
      at: steps.findIndex(s => s.sid === sid),
      html: `<li class="inv-tray-row"><span class="inv-tray-what" id="invTrayWhat-${n}">${what}</span> <span class="inv-tray-how">${escape([...how, t('tray.in', { title: title(sid) })].filter(Boolean).join(' '))}</span> <button type="button" class="ui-button subtle" data-cite id="invTrayCite-${n}" aria-labelledby="invTrayCite-${n} invTrayWhat-${n}">${escape(t('tray.cite'))}</button></li>`,
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
                t('tray.clock', { time: formatTime(how.t) }),
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
  return `<details class="inv-tray" data-tray${open ? ' open' : ''}><summary>${escape(t('tray.head', { n: rows.length }))}</summary><p class="inv-tray-note">${escape(t('tray.note'))}</p>${rows.length ? `<ul class="inv-tray-list">${rows.map(r => r.html).join('')}</ul>` : `<p class="inv-tray-note">${escape(t('tray.empty'))}</p>`}</details>`;
}

/** Wire the estimate boxes, and say the verdict once when its step is first drawn. */
export function bind(h, body) {
  const id = h.stepId();
  const shut = body.querySelector('[data-tray]');
  shut?.addEventListener('toggle', () => (left[id] = shut.open));
  shut?.querySelectorAll('[data-cite]').forEach(b =>
    b.addEventListener('click', () => {
      // Nothing is placed in the answer: the student is taken to it, and told so.
      body.querySelector('[data-answer]')?.focus();
      kit.announce(
        t('tray.cited', {
          what: b.closest('li').querySelector('.inv-tray-what').textContent,
        })
      );
    })
  );
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
