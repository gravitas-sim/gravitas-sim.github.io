// =============================================================================
// What a step looks like: its markup
// -----------------------------------------------------------------------------
// The part of renderStep that only reads: the step and the reader's state (in
// `c`) in, markup out as strings; then the saved record and the answer boxes'
// listeners. Folded in here to keep the lesson routes' request count.
// =============================================================================

import { formatNumber } from '../format.js';
import { evidenceFrom } from '../data/investigations/provenance.js';
import { getLocale, t } from '../i18n/index.js';
import { markHeld, predictionState } from '../lesson/held.js';
import { lessonText } from '../i18n/lesson.js';
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
  typedNumber,
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
import {
  drop,
  get,
  noteLesson,
  noteResume,
  previewing,
  put,
} from '../storage/local.js';
import { ENTRY_LINK, isKeptLink, isTooLongLink } from '../names.js';
import { migrateSavedProgress } from '../platform/resolver.js';
import { assignmentStorageKey, shortHash } from '../assignments/assignment.js';
import {
  classifyStorageError,
  readProgress,
  stepKey,
  writeProgress,
} from './progressSchema.js';
import { KEY_ASSIGNMENT_PREFIX, KEY_INVESTIGATION_PREFIX } from '../names.js';
import { bindSceneContext, isPeek, openSheet } from '../lessonFrame.js';
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
 * Six places a lazy module adds to a step (an empty slot is the step as it was),
 * filled when a lesson opens: field (importFromSelection, source, take, span),
 * runs (variation), reveal, time, canvas, feedback.
 */
export const slots = {
  field: null,
  runs: null,
  reveal: null,
  time: null,
  canvas: null,
  feedback: null,
};

/** Install the runs slot's module with the words and helpers it needs. */
export function runsModule(m) {
  m.setKit({
    announce,
    escape,
    formatNumber,
    lessonText,
    predictionState,
    t,
  });
  return (slots.runs = m);
}

let lost = false; // a lazy module failed to load: Next stops waiting for the estimate box
/** Fetch the run and reveal code with the step that needs it: offline, the lesson opens. */
export function fetchSeams(step, again) {
  const get = (needed, load, use) =>
    needed &&
    load().then(
      m => (use(m), again()),
      () => (lost = true)
    );
  get(
    step.variation && !slots.runs,
    () => import('../lesson/runs.js'),
    runsModule
  );
  get(
    (step.evidence || step.kind === 'estimate') && !slots.reveal,
    () => import('./reveal.js'),
    revealModule
  );
}

/** Install the field slot's module with the engine functions it needs. */
export function fieldModule(m) {
  m.setKit({
    announce,
    decimalSeparatorFor,
    judge: judgeReadings,
    lessonText,
    parseNumber,
    predictionState,
  });
  return (slots.field = m);
}

/** Install the reveal slot's module (an estimate, and the box where a prediction meets the readings) with the engine functions it needs. */
export function revealModule(m) {
  m.setKit({ announce, localeOfAnswer, recordAnswer, stepKey, typedNumber });
  return (slots.reveal = m);
}

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
      `<div class="inv-wedge-control"><label class="inv-ecc-row" for="invWedgeCount"><span>Slices</span><input type="range" id="invWedgeCount" data-wedges min="3" max="16" step="1" value="${n}" /><output data-wedges-out>${n}</output></label><p class="inv-wedge-readout" data-wedges-readout></p></div>`
    );
  }

  if (step.figure && !step.figure.from) {
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
      `<figure class="inv-figure"><img src="${attr(f.src)}" alt="${attr(f.alt)}" loading="lazy" decoding="async" /><figcaption><span class="inv-figure-caption">${prose(f.caption)}</span>${credit ? `<span class="inv-figure-credit">${credit}</span>` : ''}</figcaption></figure>`
    );
  }

  if (step.quote) {
    parts.push(
      `<figure class="inv-quote"><blockquote>${prose(step.quote.text)}</blockquote><figcaption>${escape(step.quote.by)}</figcaption></figure>`
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

  if (step.kind === 'estimate')
    parts.push(
      slots.reveal?.estimate(step, c) ??
        `<p class="inv-held" data-est-wait>${escape(t('inv.card.loading'))}</p>`
    );
  else if (step.type === 'predict' || step.kind === 'choice') {
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
  const boxed = step.evidence && slots.reveal?.verdict(step, c, predicted);
  if (boxed) parts.push(boxed);
  else if (predicted) {
    parts.push(
      `<div class="inv-verdict ${predicted.right ? 'is-right' : 'is-wrong'}"><p class="inv-verdict-head">${prose(
        t('inv.predict.youSaid', { choice: predicted.chose })
      )}</p><p class="inv-verdict-mark">${prose(
        predicted.right
          ? t('inv.predict.right')
          : t('inv.predict.wrong', { answer: predicted.answer })
      )}</p>${predicted.because ? `<p class="inv-because">${prose(predicted.because)}</p>` : ''}</div>`
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
        `<div class="inv-short-reveal"><button type="button" class="ui-button" data-reveal="${attr(id)}" ${shown ? 'hidden' : ''} ${ready ? '' : 'disabled'}>${escape(t('inv.model.compare'))}</button><span class="inv-short-hint" data-reveal-hint ${shown || ready ? 'hidden' : ''}>${escape(t('inv.model.writeFirst'))}</span><div class="inv-because is-model" data-reveal-body ${shown ? '' : 'hidden'}><strong>${escape(t('inv.answer.oneGood'))}</strong> ${prose(step.because)}</div></div>`
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
      `<div class="inv-numeric"><input type="text" inputmode="decimal" class="inv-answer-num" data-numeric="${attr(id)}" value="${attr(typed[id] ?? saved ?? '')}" placeholder="${attr(numericPlaceholder(step))}" />${step.unit ? `<span class="inv-unit">${escape(step.unit)}</span>` : ''}<button type="button" class="ui-button" data-check-numeric="${attr(id)}">${escape(t('inv.answer.check'))}</button></div>`
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
              ${
                f.options
                  ? slots.menu(key, f, responses[key])
                  : `<input type="text" ${f.kind === 'text' ? '' : 'inputmode="decimal"'}
                     data-field="${attr(key)}" value="${attr(responses[key] ?? '')}"
                     ${derived ? 'readonly tabindex="-1"' : ''}
                     placeholder="${escape(cueText(f.hint))}" />`
              }
            </label>${slots.field?.takeRow(step, f, c) ?? ''}`;
        })
        .join('')}</div>`
    );
    parts.push(slots.field?.spanGroups(step, c) ?? '');
    parts.push(
      '<div class="inv-check" data-check-slot></div>',
      slipRow(step, id)
    );
  }
  if (step.variation) parts.push(slots.runs?.markup(step, c) ?? '');
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

// --- A measure step's tries and slips -----------------------------------------
// A try is a reading taken or a value set committed (focus leaving the fields), once per distinct set,
// counted in `attempts` as a question's is. A slip is named only if the author declared it
// (`fields[].misconceptions`); it is never a value, and never shown for an uncommitted prediction.

let bound = null; // what the open step's controls are bound to
const slips = new Map(); // step id -> the slip on screen
const seen = new Map(); // step id -> the value sets already counted
const edited = new Set(); // step ids typed in since the last count

const showSlip = text => {
  const el = bound?.els().body.querySelector('[data-slip]');
  if (el) [el.textContent, el.hidden] = [text, !text];
};

const slipRow = (step, id) =>
  step.fields?.some(f => f.misconceptions)
    ? `<p class="inv-feedback is-wrong" data-slip${slips.has(id) ? '' : ' hidden'}>${escape(slips.get(id) ?? '')}</p>`
    : '';

/**
 * Count a try for the step's values and name the slip they show, once per distinct set. Said at once when
 * the fields were left; handed back as words when a reading was taken (it is announced with the reading).
 */
function judgeReadings(taken) {
  const h = bound;
  const step = h?.currentStep();
  const id = h?.stepId();
  const r = h?.responses();
  const own = (step?.fields || []).filter(f => !f.compute);
  const at = f => `${id}:${f.id}`;
  if (
    step?.type !== 'measure' ||
    !(step.validate || own.some(f => f.misconceptions)) ||
    !own.length ||
    !own.every(f => String(r[at(f)] ?? '').trim()) ||
    (!taken && !edited.has(id)) ||
    predictionState(h.steps(), step, h.visited(), r) === 'uncommitted'
  )
    return '';
  const set = JSON.stringify(own.map(f => [r[at(f)], r[`${at(f)}:src`]]));
  const done = seen.get(id) ?? seen.set(id, new Map()).get(id);
  edited.delete(id);
  slips.delete(id);
  if (done.has(set)) {
    // A set already counted is not another try, and not announced again; its slip is drawn again.
    const old = done.get(set);
    if (old) slips.set(id, old);
    showSlip(old);
    return taken ? old : '';
  }
  h.attempts()[id] = (h.attempts()[id] || 0) + 1;
  let said = '';
  try {
    const ctx = h.probeContext();
    const how = slots.field?.readings(r, id, step);
    for (const f of own) {
      const model = Number(String(f.want ?? '').replace(/[^0-9eE+\-.]/g, ''));
      const hit = matchMisconception(
        { misconceptions: f.misconceptions, answer: model },
        parseNumber(r[at(f)], localeOfAnswer(r, at(f), getLocale())).value,
        f.tolerance ?? Math.abs(model) * 0.05,
        {
          src: how?.[f.id],
          roleOf: n => ctx.roleOf(ctx.bodies.find(b => b.name === n)),
        }
      );
      if (!hit?.message) continue;
      said = `${spoken(lessonText(hit.message))} ${t('inv.slip.again')}`;
      slips.set(id, said);
      const was = String(r[`${id}:slip`] ?? '').split(',');
      if (hit.id && !was.includes(hit.id))
        r[`${id}:slip`] = [...was, hit.id].filter(Boolean).join(',');
      break;
    }
  } catch (err) {
    console.warn(err);
  }
  done.set(set, said);
  h.save();
  showSlip(said);
  if (!taken) announce(said);
  return said;
}

const setAreaSweepWedges = command('setAreaSweepWedges');
const showAreaSweepFor = command('showAreaSweepFor');

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
  bound = h;

  slots.reveal?.bind(h, els.body);
  // The orbit geometry panel belongs to the step that has the object card:
  // where a lesson withholds the card again, the panel goes with it.
  if (
    state.orbitGeometry?.active &&
    document.getElementById('objectInspector')?.style.display === 'none'
  )
    import('../orbitGeometryOverlay.js').then(m => m.setOrbitGeometry(false));
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
      edited.add(id);
      if (slips.delete(id)) showSlip('');
      h.save();
      h.refreshMeasurements();
    });
  });

  // Leaving the fields commits the set: a try, and the slip it shows if one is declared.
  els.body.querySelector('.inv-fields')?.addEventListener('focusout', e => {
    if (!e.currentTarget.contains(e.relatedTarget)) judgeReadings(false);
  });

  const wedgeSlider = els.body.querySelector('[data-wedges]');
  if (wedgeSlider) {
    const out = els.body.querySelector('[data-wedges-out]');
    const readout = els.body.querySelector('[data-wedges-readout]');
    const apply = () => {
      const n = wedgeSlider.valueAsNumber;
      out.textContent = String(n);
      // A lesson that keeps the wedges off until this step names the body.
      const of = h.currentStep().wedgeOf;
      if (of && !state.areaSweepOverlay.active)
        showAreaSweepFor(h.probeContext().find(of));
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
  slots.runs?.mount(h);

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
  const drawn = h.currentStep();
  if (drawn.figure?.from) {
    // The text the figure follows, taken now: the panel may re-render or move on before the import resolves.
    const at = els.body.querySelector('.inv-step-body');
    import('../lessonFigures.js')
      .then(m => h.currentStep() === drawn && m.fill(at, drawn))
      .catch(() => {});
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
 * progressNotes}; authoring() and assigned() are booleans, assignmentKey() is
 * where an assignment's progress lives; els() the elements; clock() the time spent.
 * @typedef {Object} PersistenceHost
 */
/** @type {PersistenceHost} */
let host = null;

/** The open investigation, steps seen and place. */
export const sceneContext = () => {
  const s = host?.state();
  return { id: s?.active?.id, n: s?.visited.size, i: s?.stepIndex };
};
bindSceneContext(sceneContext);

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

// The link this open came from (activity, assignment or pack), kept with the work.
let entry = null;
let kept = null;
export { ENTRY_LINK };

/** Remember the link; true where it is too long to keep (js/remix/open.js says so). */
export const setEntryLink = hash => {
  entry = isKeptLink(hash) ? hash : null;
  kept = null;
  return isTooLongLink(hash);
};

/** The link a record already holds, read once per open, for work opened without one. */
export function keptLink(key) {
  if (kept?.key === key) return kept.link;
  let link;
  try {
    const held = JSON.parse(get(key) ?? 'null')?.link;
    link = isKeptLink(held) ? held : undefined;
  } catch {
    link = undefined;
  }
  kept = { key, link };
  return link;
}

/** The resume record's note for this work: its link when it has one. */
function noteWork(active, step, link, key) {
  if (!link) return noteLesson(active.id, step);
  const a = host.assigned() ? host.assignment() : null;
  const name = a?.t || active.title;
  noteResume({
    id: a
      ? `assignment:${key.slice(KEY_ASSIGNMENT_PREFIX.length)}`
      : `investigation:${active.id}`,
    route: `/${link}`,
    step,
    // Under the language the name came from only.
    ...(name ? { title: { [getLocale() === 'es' ? 'es' : 'en']: name } } : {}),
  });
}

/** Whether the last write reached the disk: 'saved' | 'unavailable' | 'full' | 'authoring' | 'foreign' | 'idle'. */
let saveState = { status: 'idle', was: 'idle' };

/** A change of state is said once; the same outcome again draws nothing. */
function setSaveState(status) {
  if (saveState.status !== status)
    saveState = { status, was: saveState.status };
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
  const key = progressKey(active.id);
  const link = entry ?? keptLink(key);
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
    link,
  });
  if (Object.keys(typed).length) payload.drafts = typed;
  if (isPeek()) payload.sheet = 'peek';

  // This tab's copy, always, and before the disk is asked. It is what makes
  // closing and reopening the lesson safe when the write below fails.
  sessionProgress.set(key, payload);

  try {
    put(key, JSON.stringify(payload), progressArea());
    setSaveState(previewing() ? 'preview' : 'saved');
    noteWork(active, payload.stepSid, link, key);
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
 * Show whether the work is safe, in words, on a status line. It is drawn once
 * per state and language; a refusal, a recovery and a foreign record are also
 * spoken once. A refusal carries the backup button.
 */
export function renderSaveStatus() {
  const el = host.els()?.saveStatus;
  if (!el) return;
  const { status, was } = saveState;
  const key = `${status}${getLocale()}`;
  if (el.dataset.shown === key) return;
  const changed = el.dataset.state !== status;
  const refused = status === 'full' || status === 'unavailable';
  const focused = el.contains(document.activeElement);
  const text = status === 'idle' ? '' : t(`inv.save.${status}`);
  el.dataset.shown = key;
  el.dataset.state = status;
  el.textContent = text;
  el.hidden = status === 'idle';
  // A way out of a refusal, and a way to everything saved when saving works.
  if (refused) {
    const go = el.appendChild(document.createElement('button'));
    go.type = 'button';
    go.className = 'ui-button subtle';
    go.textContent = t('inv.backup.download');
    go.onclick = () => host.els()?.backupDownload?.click();
  } else if (status === 'saved') {
    const link = document.createElement('a');
    link.href = '/my-work/';
    link.textContent = t('inv.save.link');
    el.append(' ', link);
  }
  // The button that had focus is gone: keep the reader's place on the line.
  if (focused) ((el.tabIndex = -1), el.focus());
  // Said a moment later: the region keeps only the last thing written to it.
  clearTimeout(saidLater);
  if (
    changed &&
    (status === 'foreign' ||
      refused ||
      (status === 'saved' && ['full', 'unavailable'].includes(was)))
  )
    saidLater = setTimeout(() => {
      if (el.dataset.state === status) announce(text);
    }, 1200);
}
let saidLater = 0;

/** This tab's copy of every lesson's progress, written on every save. */
export const sessionProgress = new Map();

/**
 * A number typed and not yet checked, by step key, for the open lesson: kept so
 * that leaving a step half-typed loses nothing. Never an answer, so never in
 * `responses`; a 2.0.0 reader ignores the `drafts` field it is saved in.
 */
let typed = {};
export const forgetKept = id => ((typed = {}), id && keepEarlier(id));
/** The typed-but-unchecked text, copied; given a table, put that back too. */
export const drafts = more =>
  more ? Object.assign(typed, more) : { ...typed };

/** What the panel holds of the open record (for restart.js). */
export const persisted = () => host.state();
/** Whether a write reaches the disk now. */
export const canSave = () =>
  !['unavailable', 'full', 'foreign', 'authoring', 'preview'].includes(
    saveState.status
  );

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
  const saved = read(id, lesson);
  if (lesson) openSheet(saved?.sheet);
  return saved;
}

function read(id, lesson) {
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
 * How far through an investigation a student is: `done` counts steps seen (the
 * progress bar); `at` is the step a resume lands on.
 *
 * @param {string} id - Investigation id
 * @param {number} total - Steps in it (the browser reads it from the manifest)
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

/**
 * A reader-facing name for a lesson's role key. A translation wins; otherwise
 * the key is derived (`starA` becomes "star A", `m2000` "20 M☉"), right in both
 * languages, so a role a lesson invents still gets a sensible label.
 *
 * @param {string} key - The role as the lesson wrote it
 * @returns {string} What to show in the object list
 */
export function roleLabel(key) {
  const id = `inv.role.${key}`;
  const text = t(id);
  if (text !== id) return text;
  // The stellar shelves name their members by mass in hundredths of a solar
  // mass, which is a storage format and not a label.
  const mass = /^m(\d{2,4})$/.exec(key);
  if (mass) return `${Number(mass[1]) / 100} M☉`;
  return key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Whether the role chip would only repeat the body's own name.
 *
 * Half the lessons name their roles after the bodies - `earth`, `io`, `moon` -
 * and the chip then read "EARTH Earth", which is a label and its own echo. The
 * name is the more useful of the two, so in that case the role is dropped.
 *
 * @param {string} label - The resolved role label
 * @param {string} name - The body's name in the world
 * @returns {boolean} True when the role adds nothing
 */
export function roleEchoesName(label, name) {
  const a = String(label).trim().toLowerCase();
  const b = String(name).trim().toLowerCase();
  return Boolean(a) && (a === b || b.startsWith(`${a} `));
}

/** Whether Next waits: an estimate's box is fetched with its step, and is never passed unseen. */
export const estimateHolds = () =>
  bound?.currentStep()?.kind === 'estimate' &&
  !slots.reveal &&
  !lost &&
  (announce(t('inv.card.loading')), true);

/** Reset a docked panel's "What am I looking at?" button for the step drawn (words: js/explainers.js). */
export function resetExplainer(button) {
  if (!button) return;
  const host = button.closest('header');
  if (host?.nextElementSibling?.classList.contains('explainer'))
    host.nextElementSibling.remove();
  button.setAttribute('aria-expanded', 'false');
  button.removeAttribute('aria-controls');
  button.textContent = t('inv.explain.open');
}

/** Wire a panel's explainer button once; keyOf names the explainer for what is showing. */
export function wireExplainer(button, keyOf, opts) {
  button?.addEventListener(
    'click',
    async () => {
      const m = await import('../explainers.js');
      const key = keyOf(m);
      if (key) m.toggleExplainer(button, key, button.closest('header'));
    },
    opts
  );
}
