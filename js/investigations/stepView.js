// =============================================================================
// What a step looks like: its markup
// -----------------------------------------------------------------------------
// The part of renderStep that only reads: the step and the reader's state (in
// `c`) in, the panel's markup out as strings. Below it: the saved record's
// persistence and the answer boxes' listeners. Pure to import (no canvas, no
// simulation), and folded in here to keep the lesson routes' request count.
// =============================================================================

import { formatNumber } from '../format.js';
import { evidenceFrom } from '../data/investigations/provenance.js';
import { getLocale, t } from '../i18n/index.js';
import { markHeld } from '../lesson/held.js';
import {
  decodeEntities,
  escapeHtml as escape,
  prose,
} from '../lessonMarkup.js';
import { announce } from '../notify.js';
import { formatTime } from '../units.js';
import { checkAnswer, gradeAnswer, toleranceFor } from '../answerCheck.js';
import {
  decimalSeparatorFor,
  localeOfAnswer,
  parseNumber,
  recordAnswer,
} from '../answerParse.js';
import {
  answerClass,
  feedbackFor,
  helpStages,
  helpTaken,
  hintsFor,
  matchMisconception,
  nextHintStage,
} from '../answerFeedback.js';
import { command, state } from '../appState.js';
import { drop, get, noteLesson, put } from '../storage/local.js';
import { migrateSavedProgress } from '../platform/resolver.js';
import { assignmentStorageKey, shortHash } from '../assignments/assignment.js';
import {
  classifyStorageError,
  readProgress,
  writeProgress,
} from './progressSchema.js';
import { KEY_INVESTIGATION_PREFIX } from '../names.js';
const getAreaSweepWedges = command('getAreaSweepWedges');

/** Escape for use inside a double-quoted attribute. */
export const attr = text => escape(text).replace(/"/g, '&quot;');

/** The words for a matched misconception: the author's, or the standard one. */
export const misconceptionText = missed =>
  missed.message || t(`inv.misconception.${missed.id}`);

// How much a student has to write on a short-answer step before the model
// answer unlocks. Long enough to require a real sentence, short enough that a
// correct terse answer is not held hostage.
export const SHORT_ANSWER_MIN = 40;

/**
 * Five places a lazy module adds to a step (an empty slot is the step as it was),
 * filled when a lesson opens: field (importFromSelection, source, take, span),
 * reveal, time, canvas, feedback.
 */
export const slots = {
  field: null,
  reveal: null,
  time: null,
  canvas: null,
  feedback: null,
};

/**
 * The markup of one step, as the parts renderStep joins.
 *
 * @param {Object} step - The step definition
 * @param {Object} c - What the markup depends on
 * @param {string} c.id - The step's response-key prefix
 * @param {*} c.saved - The reader's saved response to it
 * @param {?Object} c.active - The open investigation
 * @param {Object} c.responses - Every saved response
 * @param {Set<string>} c.visited - Step sids reached so far
 * @param {() => Object[]} c.shown - The steps at this depth
 * @param {Function} c.predictionAnsweredHere - Whether a held prediction is answered
 * @param {Function} c.recomputeFields - Derived measure fields
 * @returns {string[]} Markup parts, in order
 */
export function stepMarkup(step, c) {
  const {
    id,
    saved,
    active,
    responses,
    visited,
    shown,
    predictionAnsweredHere,
    recomputeFields,
  } = c;
  const parts = [
    `<p class="inv-step-count">${escape(
      t('inv.step.counter', {
        n: shown().indexOf(step) + 1,
        total: shown().length,
      })
    )}
       <span class="inv-step-kind">${escape(t(`inv.step.kind.${step.type}`))}</span></p>`,
    `<h3 class="inv-step-title">${markHeld(active?.steps, step, visited)}${escape(step.title)}</h3>`,
    `<div class="inv-step-body"><p>${prose(step.body)}</p></div>`,
  ];

  if (step.type === 'wedges') {
    const n = getAreaSweepWedges();
    parts.push(
      `<div class="inv-wedge-control">
         <label class="inv-ecc-row" for="invWedgeCount">
           <span>Slices</span>
           <input type="range" id="invWedgeCount" data-wedges min="3" max="16"
                  step="1" value="${n}" />
           <output data-wedges-out>${n}</output>
         </label>
         <p class="inv-wedge-readout" data-wedges-readout></p>
       </div>`
    );
  }

  if (step.figure) {
    const f = step.figure;
    // Credit is part of the block rather than a footnote: these are other
    // people's photographs, used under licenses that require naming them.
    const credit = [
      f.author
        ? `<a href="${attr(f.source)}" target="_blank" rel="noopener noreferrer">${escape(f.author)}</a>`
        : '',
      f.license
        ? `<a href="${attr(f.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(f.license)}</a>`
        : '',
      f.changes ? escape(f.changes) : '',
    ]
      .filter(Boolean)
      .join(', ');
    parts.push(
      `<figure class="inv-figure">
         <img src="${attr(f.src)}" alt="${attr(f.alt)}" loading="lazy" decoding="async" />
         <figcaption>
           <span class="inv-figure-caption">${prose(f.caption)}</span>
           ${credit ? `<span class="inv-figure-credit">${credit}</span>` : ''}
         </figcaption>
       </figure>`
    );
  }

  if (step.quote) {
    parts.push(
      `<figure class="inv-quote">
         <blockquote>${prose(step.quote.text)}</blockquote>
         <figcaption>${escape(step.quote.by)}</figcaption>
       </figure>`
    );
  }

  if (step.tip) {
    parts.push(
      `<p class="inv-tip"><span aria-hidden="true">💡</span> ${prose(step.tip)}</p>`
    );
  }

  if (step.type === 'explore' && step.checklist) {
    parts.push(
      `<ul class="inv-checklist">${step.checklist
        .map((c, i) => {
          const key = `${id}:check:${i}`;
          const on = responses[key] ? 'checked' : '';
          return `<li><label><input type="checkbox" data-check="${attr(key)}" ${on} /> <span>${prose(c)}</span></label></li>`;
        })
        .join('')}</ul>`
    );
  }

  if (step.type === 'predict' || step.kind === 'choice') {
    const locked = saved !== undefined;
    // A step that names `reveal` holds the marking and the explanation until
    // the reader reaches the step where the result arrives: marked the instant
    // it is committed, a prediction has not been tested by anything.
    const held = locked && Boolean(step.reveal) && !visited.has(step.reveal);
    const marked = locked && !held;
    // Named by the prompt on screen rather than a copy of it in an attribute,
    // where its entities and markup would be read out as written.
    parts.push(
      `<p class="inv-prompt" id="invChoicePrompt">${prose(step.prompt)}</p>`
    );
    parts.push(
      `<div class="inv-options" role="radiogroup" aria-labelledby="invChoicePrompt">${step.options
        .map((opt, i) => {
          const chosen = Number(saved) === i;
          const correct = marked && i === step.answer;
          const wrongPick = marked && chosen && i !== step.answer;
          const cls = [
            'inv-option',
            chosen ? 'is-chosen' : '',
            held && chosen ? 'is-held' : '',
            correct ? 'is-correct' : '',
            wrongPick ? 'is-wrong' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<button type="button" class="${cls}" data-option="${i}" role="radio"
                    aria-checked="${chosen}" ${locked ? 'disabled' : ''}>
                    <span class="inv-option-mark">${String.fromCharCode(65 + i)}</span>
                    <span>${prose(opt)}</span></button>`;
        })
        .join('')}</div>`
    );
    if (held) {
      const at = active?.steps.find(x => x.sid === step.reveal);
      parts.push(
        `<p class="inv-held">${escape(
          t('inv.predict.held', { title: at?.title || step.reveal })
        )}</p>`
      );
    }
    // A wrong option the author bound to a named mistake says which one.
    const missed = marked ? matchMisconception(step, Number(saved), 0) : null;
    if (missed) {
      parts.push(
        `<p class="inv-feedback is-wrong"><em class="inv-misconception">${prose(misconceptionText(missed))}</em></p>`
      );
    }
    if (marked && step.because) {
      parts.push(`<p class="inv-because">${prose(step.because)}</p>`);
    }
    // A graded choice can be revised, as a number can; a prediction only
    // until its verdict is shown. The first answer and the count are kept.
    if (locked && (step.kind === 'choice' || held)) {
      parts.push(
        `<button type="button" class="ui-button subtle" data-change>${escape(t('inv.answer.change'))}</button>`
      );
    }
  }

  // The other half of a held prediction: the step where the result arrives
  // says what was predicted and how it turned out. Without this the verdict
  // would sit on a screen the reader has already left.
  const predicted = predictionAnsweredHere(step);
  if (predicted) {
    parts.push(
      `<div class="inv-verdict ${predicted.right ? 'is-right' : 'is-wrong'}">
         <p class="inv-verdict-head">${prose(
           t('inv.predict.youSaid', { choice: predicted.chose })
         )}</p>
         <p class="inv-verdict-mark">${prose(
           predicted.right
             ? t('inv.predict.right')
             : t('inv.predict.wrong', { answer: predicted.answer })
         )}</p>
         ${predicted.because ? `<p class="inv-because">${prose(predicted.because)}</p>` : ''}
       </div>`
    );
  }

  if (step.kind === 'short') {
    parts.push(`<p class="inv-prompt">${prose(step.prompt)}</p>`);
    // A reflection is kept with the student's work and read by a person; it
    // has no model answer and nothing marks it, and it says so.
    if (step.reflect) {
      parts.push(
        `<p class="inv-reflect-note">${escape(t('inv.reflect.note'))}</p>`
      );
    }
    // Where the number came from: a closed-form panel is not the integrator,
    // and a reader who thinks it was simulated has learned something false.
    // Shown only where the step asks for an interpretation
    // (js/data/investigations/provenance.js).
    const from = active ? evidenceFrom(active.id) : null;
    if (from) {
      parts.push(
        `<p class="inv-evidence-from">${escape(t(`inv.evidenceFrom.${from}`))}</p>`
      );
    }
    parts.push(
      `<textarea class="inv-answer" data-answer="${attr(id)}" rows="4"
         aria-describedby="invAnswerNote"
         placeholder="${escape(t('inv.answer.placeholder'))}">${escape(saved || '')}</textarea>`
    );
    // Shown only once something typed is not an answer.
    const empty =
      String(saved || '').trim().length > 0 && !isWrittenAnswer(saved);
    parts.push(
      `<p class="inv-answer-note" id="invAnswerNote" role="status"
          ${empty ? '' : 'hidden'}>${escape(t('inv.answer.saysNothing'))}</p>`
    );
    // The model answer is offered only once the student has written enough to
    // have committed to something: read first, the step is a copying task.
    if (step.because) {
      const shown = responses[`${id}:shown`] === true;
      const ready = String(saved || '').trim().length >= SHORT_ANSWER_MIN;
      parts.push(
        `<div class="inv-short-reveal">
           <button type="button" class="ui-button" data-reveal="${attr(id)}"
                   ${shown ? 'hidden' : ''} ${ready ? '' : 'disabled'}>
             ${escape(t('inv.model.compare'))}
           </button>
           <span class="inv-short-hint" data-reveal-hint ${shown || ready ? 'hidden' : ''}>
             ${escape(t('inv.model.writeFirst'))}
           </span>
           <div class="inv-because is-model" data-reveal-body ${shown ? '' : 'hidden'}>
             <strong>${escape(t('inv.answer.oneGood'))}</strong> ${prose(step.because)}
           </div>
         </div>`
      );
    }
  }

  if (step.kind === 'numeric') {
    const locked = saved !== undefined && saved !== '';
    const graded = locked
      ? gradeAnswer(step, saved, {
          locale: localeOfAnswer(responses, id, getLocale()),
        })
      : null;
    parts.push(`<p class="inv-prompt">${prose(step.prompt)}</p>`);
    if (step.formula && !Number.isFinite(step.answer))
      parts.push(`<p class="inv-hint">${escape(t('inv.formula.needs'))}</p>`);
    parts.push(
      `<div class="inv-numeric">
         <input type="text" inputmode="decimal" class="inv-answer-num" data-numeric="${attr(id)}"
                value="${attr(typed[id] ?? saved ?? '')}" placeholder="${attr(numericPlaceholder(step))}" />
         ${step.unit ? `<span class="inv-unit">${escape(step.unit)}</span>` : ''}
         <button type="button" class="ui-button" data-check-numeric="${attr(id)}">${escape(t('inv.answer.check'))}</button>
       </div>`
    );

    if (graded?.status === 'unreadable') {
      // Not "wrong". The student answered something the step cannot read, and
      // which of the several reasons that is decides what is worth saying.
      const unit = feedbackFor(step, answerClass(step, graded));
      parts.push(
        `<p class="inv-feedback is-unreadable">${escape(unreadableMessage(step, graded))}${unit ? ` ${prose(unit)}` : ''}</p>`
      );
    } else if (graded?.correct === true) {
      const note = graded.converted
        ? ` ${escape(t('inv.answer.converted', { unit: graded.unit, value: formatNumber(graded.value, { sig: 4 }), target: step.unit ?? '' }))}`
        : '';
      parts.push(
        `<p class="inv-feedback is-right">${escape(t('inv.answer.matches'))}${note} ${prose(step.because || '')} ${prose(feedbackFor(step, 'correct') || '')}</p>`
      );
    } else if (graded?.correct === false) {
      // A named misconception, and only a named one; failing that, what the
      // author wrote for this kind of miss. Everything else is simply not the
      // right number, which is what it says.
      const tol = toleranceFor(step);
      const missed = matchMisconception(step, graded.value, tol);
      const said = missed
        ? misconceptionText(missed)
        : feedbackFor(step, answerClass(step, graded, tol));
      // A named mistake and the author's words for a kind of miss are different
      // claims, and are told apart: only the first says what the student did.
      const named = said
        ? `<br /><em class="${missed ? 'inv-misconception' : 'inv-class'}">${prose(said)}</em>`
        : '';
      parts.push(
        `<p class="inv-feedback is-wrong">${escape(t('inv.answer.notYet'))}${named}</p><div class="inv-recover" data-recover hidden></div>`
      );
    }

    parts.push(hintBlock(step, id, responses));
  } else if (step.kind !== 'short' || !step.reflect) {
    // A choice, a prediction or a measurement can carry a ladder too; a
    // reflection has no right answer to be helped towards.
    parts.push(hintBlock(step, id, responses));
  }

  if (step.type === 'measure' && step.fields) {
    recomputeFields(step, id);
    if (step.importFromSelection && slots.field)
      parts.push(slots.field.importRow(step));
    parts.push(
      `<div class="inv-fields">${step.fields
        .map(f => {
          const key = `${id}:${f.id}`;
          const derived = Boolean(f.compute);
          return `<label class="inv-field${derived ? ' is-derived' : ''}">
              <span class="inv-field-label">${prose(f.label)}${f.unit ? ` <span class="inv-field-unit">(${escape(f.unit)})</span>` : ''}${derived ? ` <span class="inv-field-auto">${escape(t('inv.field.auto'))}</span>` : ''}</span>
              <input type="text" ${f.kind === 'text' ? '' : 'inputmode="decimal"'}
                     data-field="${attr(key)}" value="${attr(responses[key] ?? '')}"
                     ${derived ? 'readonly tabindex="-1"' : ''}
                     placeholder="${escape(cueText(f.hint))}" />
            </label>${slots.field?.takeRow(step, f, c) ?? ''}`;
        })
        .join('')}</div>`
    );
    parts.push(slots.field?.spanGroups(step, c) ?? '');
    parts.push('<div class="inv-check" data-check-slot></div>');
  }
  return parts;
}

// --- Written answers ----------------------------------------------------------

/**
 * Whether a written answer is a written answer. Not marking: it refuses only the null response (empty, a space, "...").
 *
 * @param {string} value - What the reader typed
 * @returns {boolean} True when there is something there
 */
export function isWrittenAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  // Two letters or digits anywhere, in any script - not two in a row, which
  // would reject "a = 1.5", terse but an answer.
  const content = text.match(/[\p{L}\p{N}]/gu);
  return (content?.length ?? 0) >= 2;
}

// --- Answer controls ----------------------------------------------------------

/**
 * The cue an empty box may show (Prompt 299, rule L1): words that name a form, never a value.
 * A numeral in any script hides it, so a pack or an unmigrated file cannot leak a reading.
 * @param {*} cue - A field's `hint` or a numeric step's `placeholder`
 * @returns {string} The cue to render, possibly empty
 */
export const cueText = cue => {
  const text = typeof cue === 'string' ? cue.trim() : '';
  return /[\p{Nd}\p{No}\p{Nl}]/u.test(text) ? '' : text;
};

/** The placeholder of a numeric box: the step's own cue, else only the unit. */
const numericPlaceholder = step =>
  cueText(step.placeholder) ||
  (step.unit
    ? t('inv.answer.placeholderUnit', { unit: step.unit })
    : t('inv.answer.placeholder'));

/**
 * Why a typed answer could not be read, in words a student can act on.
 *
 * Each refusal names a different thing to do about it.
 *
 * @param {Object} step - Step definition
 * @param {Object} graded - From gradeAnswer()
 * @returns {string} The sentence
 */
function unreadableMessage(step, graded) {
  const d = graded.detail || {};
  const allowed = (step.expect?.accept || []).join(', ');
  switch (graded.reason) {
    case 'blank':
      return t('inv.answer.blank');
    case 'ambiguousSeparator':
      return t('inv.answer.ambiguous');
    case 'incompatibleUnit':
      return t('inv.answer.wrongDimension', {
        unit: d.text || '',
        got: t(`inv.dimension.${d.got}`),
        want: t(`inv.dimension.${d.dimension}`),
      });
    case 'unknownUnit':
      return t('inv.answer.unknownUnit', { unit: d.text || '' });
    case 'unitNotAllowed':
      return allowed
        ? t('inv.answer.unitNotAllowed', { unit: d.text || '', allowed })
        : t('inv.answer.unitExpected', {
            unit: d.text || '',
            expected: d.expected || step.unit || '',
          });
    case 'trailingText':
      return t('inv.answer.trailingText', { text: d.text || '' });
    case 'needsUncertainty':
      return t('inv.answer.needsUncertainty');
    default:
      return t('inv.answer.notANumber');
  }
}

/**
 * The hint controls, and whatever the student has already asked for.
 *
 * Nothing appears unbidden: each stage is a button, and the worked
 * explanation is behind one more press than the hints are.
 *
 * @param {Object} step - Step definition
 * @param {string} id - Response-key prefix
 * @param {Object} responses - Every saved response
 * @returns {string} Markup, or empty when the step offers no help
 */
function hintBlock(step, id, responses) {
  const hints = hintsFor(step);
  if (!hints) return '';

  const used = helpStages(responses[`${id}:help`]);
  const total = hints.ladder.length;
  const shown = [];
  hints.ladder.forEach((h, i) => {
    if (!used.includes(h.id)) return;
    const label =
      h.id === 'concept' || h.id === 'method'
        ? t(`inv.hint.${h.id}`)
        : t('inv.hint.n', { n: i + 1, total });
    shown.push(
      `<p class="inv-hint" data-stage="${h.id}" tabindex="-1"><strong>${escape(label)}</strong> ${prose(h.text)}</p>`
    );
  });
  if (used.includes('reveal') && hints.worked) {
    shown.push(
      `<div class="inv-hint is-worked" data-stage="reveal" tabindex="-1"><strong>${escape(t('inv.hint.worked'))}</strong> ${prose(hints.worked)}</div>`
    );
  }

  const next = nextHintStage(step, used);
  const button = next
    ? `<button type="button" class="ui-button subtle inv-hint-btn" data-hint="${next}">
         ${escape(t(next === 'reveal' ? 'inv.hint.reveal' : 'inv.hint.ask'))}
       </button>`
    : '';

  const taken = helpTaken(used);
  // Said plainly, because the report says it too and a student should not find
  // out afterwards that it was recorded. It is a record, not a penalty.
  const tally = taken.stages.length
    ? `<span class="inv-hint-tally">${escape(
        taken.revealed
          ? t('inv.hint.takenRevealed', { n: taken.hints })
          : t('inv.hint.taken', { n: taken.hints })
      )}</span>`
    : '';

  return `<div class="inv-hints">${shown.join('')}<div class="inv-hint-row">${button}${tally}</div></div>`;
}

/** Text as it is read aloud: the markup lesson prose carries taken out. */
const spoken = text =>
  decodeEntities(String(text ?? '').replace(/<\/?(strong|em|sub|sup)>/g, ''));

const setAreaSweepWedges = command('setAreaSweepWedges');

/**
 * Wire the step's answer controls: choices, written and numeric answers, hints,
 * measure fields, the wedge slider and the import button. Each handler writes
 * the reader's answer to the saved record through the host and re-renders.
 *
 * @param {Object} h - What the lesson offers: els, h.responses(), h.attempts(),
 *   stepId, currentStep, save, renderStep, refreshMeasurements,
 *   importSelection
 */
export function bindStepInputs(h) {
  const els = h.els();
  const id = h.stepId();

  els.body.querySelector('[data-change]')?.addEventListener('click', () => {
    delete h.responses()[id];
    h.save();
    h.renderStep();
    els.body.querySelector('[data-option]')?.focus();
    announce(t('inv.answer.changed'));
  });

  els.body.querySelectorAll('[data-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = Number(btn.dataset.option);
      h.responses()[`${id}:first`] ??= choice;
      h.responses()[id] = choice;
      h.attempts()[id] = (h.attempts()[id] || 0) + 1;
      h.save();
      h.renderStep();
      const step = h.currentStep();
      // A held prediction has no verdict yet, on screen or off it: what is
      // announced is the note h.renderStep() has just drawn, not a grade.
      announce(
        els.body.querySelector('.inv-held')?.textContent ||
          (checkAnswer(step, choice)
            ? t('inv.answer.correct')
            : [
                t('inv.answer.recorded'),
                spoken(
                  matchMisconception(step, choice, 0) &&
                    misconceptionText(matchMisconception(step, choice, 0))
                ),
                spoken(step.because),
              ]
                .filter(Boolean)
                .join(' '))
      );
    });
  });

  els.body.querySelectorAll('[data-answer]').forEach(area => {
    area.addEventListener('input', () => {
      h.responses()[id] = area.value;
      h.save();
      const btn = els.body.querySelector('[data-reveal]');
      if (btn && !btn.hidden) {
        const ready = area.value.trim().length >= SHORT_ANSWER_MIN;
        btn.disabled = !ready;
        const hint = els.body.querySelector('[data-reveal-hint]');
        if (hint) hint.hidden = ready;
      }
      // Whitespace or punctuation is not an answer: say so beside the box.
      const note = els.body.querySelector('#invAnswerNote');
      if (note) {
        // Raw length: a box of spaces is typed and not an answer.
        note.hidden = area.value.length === 0 || isWrittenAnswer(area.value);
      }
    });
  });

  // Staged hints. Each press records the stage and re-renders; nothing is shown
  // that was not asked for, and taking help is recorded rather than charged for
  // - see helpTaken() in js/answerFeedback.js.
  els.body.querySelectorAll('[data-hint]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = `${h.stepId()}:help`;
      const used = helpStages(h.responses()[key]);
      const stage = btn.dataset.hint;
      if (!used.includes(stage)) used.push(stage);
      h.responses()[key] = used.join(',');
      h.save();
      h.renderStep();
      // Said aloud in full, and the reader's place kept: the step is drawn
      // again, so focus is put on the hint just shown (the next press is one
      // Tab away) rather than left on a button that no longer exists.
      const shown = els.body.querySelector(`[data-stage="${stage}"]`);
      shown?.focus();
      announce(
        `${t(stage === 'reveal' ? 'inv.hint.revealed' : 'inv.hint.given')} ${shown?.textContent ?? ''}`
      );
    });
  });

  els.body.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.addEventListener('click', () => {
      h.responses()[`${btn.dataset.reveal}:shown`] = true;
      h.save();
      btn.hidden = true;
      const hint = els.body.querySelector('[data-reveal-hint]');
      if (hint) hint.hidden = true;
      const body = els.body.querySelector('[data-reveal-body]');
      if (body) {
        body.hidden = false;
        announce(t('inv.answer.model'));
      }
    });
  });

  els.body.querySelectorAll('[data-field]').forEach(input => {
    if (input.hasAttribute('readonly')) return;
    input.addEventListener('input', () => {
      recordAnswer(
        h.responses(),
        input.dataset.field,
        input.value,
        getLocale()
      );
      slots.field?.typed(h.responses(), input.dataset.field, els.body);
      h.save();
      h.refreshMeasurements();
    });
  });

  const wedgeSlider = els.body.querySelector('[data-wedges]');
  if (wedgeSlider) {
    const out = els.body.querySelector('[data-wedges-out]');
    const readout = els.body.querySelector('[data-wedges-readout]');
    const apply = () => {
      const n = wedgeSlider.valueAsNumber;
      out.textContent = String(n);
      setAreaSweepWedges(n);
      const ov = state.areaSweepOverlay;
      if (readout && ov?.wedgeTime) {
        readout.innerHTML = t('inv.wedge.readout', {
          share: formatFieldNumber(100 / n, 1, getLocale()),
          time: escape(formatTime(ov.wedgeTime)),
        });
      }
      h.responses()[`${h.stepId()}:wedges`] = String(n);
      h.save();
    };
    wedgeSlider.addEventListener('input', apply);
    apply();
  }

  els.body.querySelector('[data-import]')?.addEventListener('click', () => {
    h.importSelection();
  });
  h.importSelection?.({ mount: true });

  const numeric = els.body.querySelector('[data-numeric]');
  const checkBtn = els.body.querySelector('[data-check-numeric]');
  if (numeric && checkBtn) {
    const submit = () => {
      // The first thing they committed to, kept. A student who tries a number,
      // is told it is wrong and revises has done something a report should show;
      // overwriting it leaves only the answer they arrived at with help.
      if (h.responses()[`${id}:first`] === undefined && numeric.value.trim()) {
        h.responses()[`${id}:first`] = numeric.value;
      }
      // The text and the convention it was typed under, together: the text alone
      // let a later reader (the PDF, a language switch) misread "1,234".
      recordAnswer(h.responses(), id, numeric.value, getLocale());
      h.attempts()[id] = (h.attempts()[id] || 0) + 1;
      delete typed[id];
      h.save();
      h.renderStep();
      // What the panel now says under the box, read out: a result that only
      // appears is one a screen reader never hears.
      announce(els.body.querySelector('.inv-feedback')?.textContent ?? '');
    };
    checkBtn.addEventListener('click', submit);
    numeric.oninput = () => {
      typed[id] = numeric.value;
      h.save();
    };
    numeric.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  }
  if (els.body.querySelector('[data-recover]'))
    import('./recovery.js').then(m => m.fill(h, announce, getLocale, hintsFor));
}

// --- Measured values ----------------------------------------------------------
// Kept here and not in js/answerParse.js: that module is a source of the
// instructor bundle, and changing it would need the bundle rebuilt.

/** A field as a number: its own convention, trailing text NaN, ".5" kept. */
export function parseFieldNumber(raw, locale) {
  const p = parseNumber(
    String(raw ?? '')
      .trim()
      .replace(/^([+-]?)([.,])(?=\d)/, '$10$2'),
    locale
  );
  return p.ok && !p.rest ? p.value : NaN;
}

/** A computed field's text, in the reader's convention. */
export const formatFieldNumber = (value, decimals, locale) =>
  Number.isFinite(value)
    ? value.toFixed(decimals).replace('.', decimalSeparatorFor(locale))
    : '';

// --- Persistence: the saved record and the save status (Prompt 139 part C) ----
// The engine's state comes through the host it binds once; this module owns
// the last write's status and this tab's copy of the progress.

/**
 * What persistence needs of the engine: state() is {active, responses,
 * attempts, visited, stepIndex, startedAt, depthChoice, deepest, spent,
 * progressNotes}; authoring() and assigned() are booleans; assignmentKey() is
 * where an assignment's progress lives; els() the elements; clock() brings the
 * time spent up to date.
 * @typedef {Object} PersistenceHost
 */
/** @type {PersistenceHost} */
let host = null;

/** Hand this module the engine's side, once, when the engine loads. */
export const bindPersistence = h => {
  host = h;
};

const STORAGE_PREFIX = KEY_INVESTIGATION_PREFIX;

export const storageKey = id => `${STORAGE_PREFIX}${id}`;

/** Where this activity's progress lives (lesson id -> storage key). */
const progressKey = id =>
  host.assigned() ? host.assignmentKey() : storageKey(id);
const progressArea = () => (host.assigned() ? 'assignments' : 'progress');

/**
 * An assignment's progress key: its lesson, steps and title, never its date,
 * so a link re-issued on another day keeps the work (work under an old dated
 * key moves across when first read). A new title re-keys on purpose.
 *
 * @param {object} a - A validated assignment payload
 * @returns {string} The storage key
 */
export function keyForAssignment(a) {
  const hash = shortHash(`${a.l}|${a.s.join(',')}|${a.t}`);
  const key = `gravitas_assignment_${hash}`;
  if (host.authoring()) return key;
  try {
    if (get(key) === null) {
      const old = Object.keys(localStorage)
        .filter(
          k =>
            k === assignmentStorageKey(a) ||
            new RegExp(`^gravitas_assignment_\\d{6}${hash}$`).test(k)
        )
        .sort()
        .pop();
      if (old) {
        put(key, get(old), 'assignments');
        drop(old);
      }
    }
  } catch {
    /* storage refused: there is nothing to move */
  }
  return key;
}

/** Whether the last write reached the disk: 'saved' | 'unavailable' | 'full' | 'authoring' | 'idle'. */
let saveState = { status: 'idle', at: null };

function setSaveState(status) {
  if (saveState.status === status) {
    // Same outcome as last time: refresh the timestamp for a success so the
    // reader sees it is still saving, but do not re-render a standing warning
    // on every keystroke.
    if (status === 'saved') saveState.at = Date.now();
    else return;
  } else {
    saveState = { status, at: Date.now() };
  }
  renderSaveStatus();
}

export function save() {
  const s = host.state();
  const { active } = s;
  if (!active) return;
  host.clock();
  // A payload from a newer build was left unread; overwriting it would destroy
  // progress this version does not understand. The reader is told, and their
  // answers stay usable in memory for the rest of the session.
  if (s.progressNotes.some(n => n.code === 'schemaTooNew')) {
    setSaveState('foreign');
    return;
  }
  // An author looking at step 30 of Tides must not overwrite the progress of
  // whoever is working through Tides on this machine.
  if (host.authoring()) {
    setSaveState('authoring');
    return;
  }
  const payload = writeProgress({
    lesson: active,
    responses: s.responses,
    attempts: s.attempts,
    visited: s.visited,
    stepSid: active.steps[s.stepIndex]?.sid ?? null,
    startedAt: s.startedAt,
    depth: s.depthChoice,
    deepest: s.deepest,
    spent: s.spent,
    earlier: earlierFor(active.id),
  });
  if (Object.keys(typed).length) payload.drafts = typed;

  // This tab's copy, always, and before the disk is asked. It is what makes
  // closing and reopening the lesson safe when the write below fails.
  const key = progressKey(active.id);
  sessionProgress.set(key, payload);

  try {
    put(key, JSON.stringify(payload), progressArea());
    setSaveState('saved');
    noteLesson(active.id, payload.stepSid);
  } catch (err) {
    // The answers stay in memory and the lesson keeps working; what changes is
    // that the reader is told, once, and given a way to take the work with
    // them.
    setSaveState(classifyStorageError(err));
  }
}

/** Say what reading the saved progress turned up, once, on opening. */
export function renderProgressNotice() {
  const el = host.els()?.progressNotice;
  if (!el) return;

  const lines = [];
  for (const note of host.state().progressNotes || []) {
    if (note.code === 'migratedByPosition') {
      lines.push(t('inv.progress.migrated', { n: note.carried }));
    } else if (note.code === 'removedSteps') {
      lines.push(t('inv.progress.removedSteps', { n: note.dropped }));
    } else if (note.code === 'schemaTooNew') {
      lines.push(t('inv.progress.foreign'));
    }
  }

  el.textContent = lines.join(' ');
  const { active } = host.state();
  const rows = earlierAnswers(active, earlierFor(active?.id)?.responses);
  const ul = rows.length && el.appendChild(document.createElement('ul'));
  for (const e of rows)
    ul.appendChild(document.createElement('li')).textContent = earlierLine(
      e,
      getLocale()
    );
  el.hidden = lines.length === 0 && rows.length === 0;
}

/**
 * Show whether the work is safe: a polite live region, not a toast (one would
 * fire on every keystroke). Successes announce nothing: "saved" forty times
 * while typing an answer is worse than silence.
 */
export function renderSaveStatus() {
  const el = host.els()?.saveStatus;
  if (!el) return;
  const { status } = saveState;

  const text = {
    saved: t('inv.save.saved'),
    full: t('inv.save.full'),
    unavailable: t('inv.save.unavailable'),
    authoring: t('inv.save.authoring'),
    foreign: t('inv.save.foreign'),
    idle: '',
  }[status];

  el.textContent = text || '';
  // The block is a status and a way to everything saved on this device (My work).
  if (text && ['saved', 'full', 'unavailable'].includes(status)) {
    const link = document.createElement('a');
    link.href = '/my-work/';
    link.textContent = t('inv.save.link');
    el.append(' ', link);
  }
  el.hidden = !text;
  el.dataset.state = status;
  // Only a problem interrupts. aria-live is set rather than removed so the
  // element keeps its identity across renders.
  el.setAttribute(
    'aria-live',
    status === 'full' || status === 'unavailable' || status === 'foreign'
      ? 'polite'
      : 'off'
  );
}

/** This tab's copy of every lesson's progress, written on every save. */
export const sessionProgress = new Map();

/**
 * A number typed and not yet checked, by step key, for the open lesson: kept so
 * that leaving a step half-typed loses nothing. Never an answer, so never in
 * `responses`; a 2.0.0 reader ignores the `drafts` field it is saved in.
 */
let typed = {};
export const forgetKept = id => ((typed = {}), id && keepEarlier(id));

/** Per storage key: answers to steps it no longer has, written back on save. */
const earlierKept = new Map();
export const earlierFor = id => earlierKept.get(progressKey(id));
/** Set more answers aside beside those kept; with none, forget them all. */
export const keepEarlier = (id, more) => {
  const kept = earlierFor(id);
  earlierKept.set(
    progressKey(id),
    more && {
      responses: { ...kept?.responses, ...more.responses },
      attempts: { ...kept?.attempts, ...more.attempts },
    }
  );
};

export const wasIn = (was, locale = 'en') =>
  (typeof was === 'string' ? was : was?.[locale] || was?.en) || '';

const str = v =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : `${v}`.trim();

// Answers under step ids the lesson lacks: [{id, text, r}], r its `retired` entry.
export function earlierAnswers(lesson, table) {
  const live = new Set((lesson?.steps || []).map(s => s?.sid));
  const by = new Map();
  for (const [k, v] of Object.entries(table || {})) {
    const [owner, sid, ...sub] = k.split(':');
    if (owner === lesson?.id && !live.has(sid))
      by.set(sid, [...(by.get(sid) || []), [sub.join(':'), v]]);
  }
  return [...by].flatMap(([id, kv]) => {
    const text =
      str(kv.find(([k]) => !k)?.[1]) ||
      kv
        .filter(
          ([k, v]) =>
            k &&
            !/^(shown|locale|help|hint)$|^tool:|:(locale|src)$/.test(k) &&
            str(v)
        )
        .map(([k, v]) => `${k}=${str(v)}`)
        .join('; ');
    return text
      ? [
          {
            id,
            text,
            r: Object.hasOwn(lesson.retired ?? {}, id)
              ? lesson.retired[id]
              : undefined,
          },
        ]
      : [];
  });
}

export const earlierLine = ({ text, r }, locale) => {
  const was = wasIn(r?.was, locale);
  return `${was ? `"${was}": ` : ''}${text}${r ? ` (${r.release})` : ''}`;
};

/** Where a v1 payload is kept after it has been migrated, in case it was wrong. */
const legacyKey = id => `${STORAGE_PREFIX}${id}:v1`;

/**
 * Read a lesson's saved progress, migrating an older save if need be.
 * @param {string} id - Lesson id
 * @param {?object} lesson - The merged lesson, when the caller has it
 * @returns {?object} The progress, or null when there is none
 */
export function load(id, lesson = null) {
  // This tab first. It is written on every save and storage is not, so when the
  // two differ the session copy is the newer one - and when storage refused
  // every write, it is the only one there is.
  if (lesson) {
    earlierKept.delete(progressKey(id));
    typed = {};
  }
  let data = sessionProgress.get(progressKey(id)) ?? null;

  if (!data) {
    try {
      const raw = get(progressKey(id));
      if (!raw) return null;
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Without the lesson only the counts are readable, which is all the card
  // wants. A v1 payload's `visited` is indices and a v2's is sids; either way
  // the size is the number of steps seen.
  if (!lesson) {
    const visited = Array.isArray(data?.visited) ? data.visited : [];
    return { countsOnly: true, visited: new Set(visited), data };
  }

  const isLegacy = !Number.isFinite(Number(data?.schema));
  const progress = readProgress(data, lesson);
  // A lesson from a capability package may have renamed a control since the
  // answers were saved; its manifest says how, and this applies it.
  progress.responses = migrateSavedProgress(id, progress.responses);
  keepEarlier(id, progress.earlier);
  // Only this lesson's own typed text: a draft is never carried between records.
  for (const [k, v] of Object.entries(data?.drafts ?? {}))
    if (k.startsWith(`${id}:`) && typeof v === 'string')
      typed[k] = v.slice(0, 99);

  // Keep the original: a positional migration cannot tell from the payload
  // whether the lesson was reordered since the save.
  if (isLegacy && progress.migrated) {
    try {
      put(legacyKey(id), JSON.stringify(data), progressArea());
    } catch {
      /* the migration still stands; only the safety copy is lost */
    }
  }
  return progress;
}

/**
 * How far through an investigation a student is.
 *
 * `done` counts steps seen (the progress bar); `at` is the step a resume lands
 * on, which differs once a student has gone back to reread.
 *
 * @param {string} id - Investigation id
 * @param {number} total - Steps in it. The lesson browser reads this from the
 *   manifest, which the engine does not import: the browser asks for all of
 *   them before any is loaded.
 * @returns {{done:number, total:number, started:boolean, at:number}} Progress
 */
export function progressFor(id, total = 0) {
  const saved = load(id);
  // `at` is a 1-based screen number for the card: a v2 payload stores a sid and
  // the card has no lesson to resolve it, so it is how far, not where exactly.
  const done = saved ? saved.visited.size : 0;
  return {
    done,
    total,
    started: Boolean(saved),
    at: done > 0 ? Math.min(done, total || done) : 1,
  };
}
