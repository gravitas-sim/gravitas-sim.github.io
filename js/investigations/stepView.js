// =============================================================================
// What a step looks like: its markup and its two figures
// -----------------------------------------------------------------------------
// js/investigations.js used to build this inline in renderStep. It is the part
// of that function that only reads: it takes the step and the reader's state
// (named in `c`, not reached for) and returns the panel's markup as a list of
// strings. renderStep joins it into the panel and does everything that touches
// the page (the panels beside it, the probe, the footer, the listeners).
//
// Nothing here writes to the page or to a saved record. Prompt 139 part A.
//
// Pure to import, as writtenAnswer.js was (it is folded in below): this module
// reaches no canvas and no simulation, so a unit test can load it. Folding it
// in kept the lesson routes' request count where it was.
// =============================================================================

import { fixed, formatNumber, tickLabel } from '../format.js';
import { evidenceFrom } from '../data/investigations/provenance.js';
import { getLocale, t } from '../i18n/index.js';
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
import { drop, get, noteResume, put } from '../storage/local.js';
import { migrateSavedProgress } from '../platform/resolver.js';
import { investigationMeta } from '../data/investigations/registry.js';
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
    `<h3 class="inv-step-title">${escape(step.title)}</h3>`,
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
    // A prediction that is marked the instant it is committed has not been
    // tested by anything: the answer key settles it before the experiment
    // runs. A step that names `reveal` holds the marking and the explanation
    // until the reader has reached the step where the result actually
    // arrives, and that step shows them how it turned out.
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
    // Where the number this step asks about came from. Four sources, and the
    // difference is the thing this application is most often misread about: a
    // Schwarzschild radius is a closed-form panel and a period is the
    // integrator, and a reader who thinks the first was simulated has learned
    // something false. Shown only on the step that asks for an interpretation,
    // because that is where a reader is about to commit to what the evidence
    // means. See js/data/investigations/provenance.js.
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
    // Shown only once something has been typed that is not an answer: an empty
    // box on arrival is where every reader starts and does not need telling.
    const empty =
      String(saved || '').trim().length > 0 && !isWrittenAnswer(saved);
    parts.push(
      `<p class="inv-answer-note" id="invAnswerNote" role="status"
          ${empty ? '' : 'hidden'}>${escape(t('inv.answer.saysNothing'))}</p>`
    );
    // A written answer no one ever sees an answer to is not an exercise, it is
    // a diary entry. The model answer is available, but only once the student
    // has written enough to have committed to something: reading it first and
    // then writing turns the step into a copying task.
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
                value="${attr(saved ?? '')}" placeholder="${attr(numericPlaceholder(step))}" />
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
        `<p class="inv-feedback is-wrong">${escape(t('inv.answer.notYet'))}${named}</p>`
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
    if (step.importFromSelection) {
      parts.push(
        `<div class="inv-import-row">
           <button type="button" class="inv-import-btn" data-import>
             ${escape(step.importLabel || t('inv.import.default'))}
           </button>
           <span class="inv-import-hint" data-import-hint></span>
         </div>`
      );
    }
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
                     placeholder="${escape(f.hint || '')}" />
            </label>`;
        })
        .join('')}</div>`
    );
    parts.push('<div class="inv-check" data-check-slot></div>');
  }
  return parts;
}

// --- Ellipse explorer ---------------------------------------------------------

/**
 * Draw an ellipse with its anatomy labeled, at a chosen eccentricity.
 *
 * Kepler's first law is a statement about a shape, and the shape is the part a
 * student has no intuition for: "the Sun is at a focus" means nothing until you
 * have watched the focus slide out of the center as e grows. The slider is the
 * explanation.
 */
export function drawEllipse(canvas, e) {
  if (!canvas) return;
  const css = getComputedStyle(document.documentElement);
  const tok = (n, f) => css.getPropertyValue(n).trim() || f;
  const ink = tok('--text-primary', '#e9edf7');
  const muted = tok('--text-muted', '#8a8f9e');
  const line = tok('--border-subtle', '#2a2f3d');
  // One color per quantity, matched by the key beneath the canvas.
  const C_A = '#5ec8f5';
  const C_B = '#8de08a';
  const C_C = '#f2a65a';
  const C_STAR = '#ffd34d';
  const C_EMPTY = '#9aa2b8';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 420;
  const h = 330;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 6;
  // Fit the widest case (e -> 0, a circle) inside the canvas with room for
  // labels, so nothing is ever clipped as the slider moves.
  const a = Math.min(w * 0.4, (h - 96) / 2, 200);
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const c = a * e;

  ctx.font =
    '600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Axes through the center
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx - a - 12, cy);
  ctx.lineTo(cx + a + 12, cy);
  ctx.moveTo(cx, cy - b - 12);
  ctx.lineTo(cx, cy + b + 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // The ellipse
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
  ctx.stroke();

  // a: center to the left edge, above the axis
  const aY = cy - 20;
  ctx.strokeStyle = C_A;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, aY);
  ctx.lineTo(cx - a, aY);
  ctx.stroke();
  ctx.fillStyle = C_A;
  ctx.fillText('a', cx - a / 2, aY - 11);

  // b: center up to the top of the ellipse, to the right of the minor axis
  if (b > 26) {
    ctx.strokeStyle = C_B;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy);
    ctx.lineTo(cx + 14, cy - b);
    ctx.stroke();
    ctx.fillStyle = C_B;
    ctx.textAlign = 'left';
    ctx.fillText('b', cx + 20, cy - b / 2);
    ctx.textAlign = 'center';
  }

  // c: center to the occupied focus, below the axis
  const cY = cy + 22;
  if (c > 10) {
    ctx.strokeStyle = C_C;
    ctx.beginPath();
    ctx.moveTo(cx, cY);
    ctx.lineTo(cx + c, cY);
    ctx.stroke();
    ctx.fillStyle = C_C;
    ctx.fillText('c', cx + c / 2, cY + 12);
  }

  // The two foci
  const focus = (x, filled, label, color) => {
    ctx.beginPath();
    ctx.arc(x, cy, filled ? 7 : 5, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = color;
    // Below the axis so it never collides with a or c above it.
    ctx.fillText(label, x, cy + 44);
  };
  focus(cx + c, true, 'star', C_STAR);
  if (c > 10) focus(cx - c, false, 'empty', C_EMPTY);

  // Center marker
  ctx.fillStyle = muted;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText('center', cx, cy - b - 24);

  // Readout, top left, clear of the figure
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.fillText(`e = ${fixed(e, 3)}`, 6, 16);
  ctx.fillStyle = muted;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`b/a = ${fixed(b / a, 3)}`, 6, 33);
}

// --- Plotting -----------------------------------------------------------------

/** Pick round axis bounds and a tick step that contain the data. */
export function niceScale(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const c = Number.isFinite(min) ? min : 0;
    return { lo: c - 1, hi: c + 1, step: 0.5 };
  }
  const span = max - min;
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return {
    lo: Math.floor(min / step) * step,
    hi: Math.ceil(max / step) * step,
    step,
  };
}

/** Format an axis tick without trailing noise. */
const tick = v => tickLabel(v);

/**
 * Least-squares fit through the origin.
 *
 * Forced through zero because the relation being tested has no constant term:
 * a planet with no orbit takes no time. Fitting an intercept would let a bad
 * data set look straight by sliding the line sideways.
 *
 * @param {Array} pts - [{x, y}]
 * @returns {number|null} Slope, or null when it is not determined
 */
export function fitSlope(pts) {
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  return sxx > 0 ? sxy / sxx : null;
}

/**
 * Least-squares slope with a free intercept, for log-log axes.
 * @param {Array} pts - [{x, y}]
 * @returns {number|null} Slope
 */
export function logSlope(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((t, p) => t + p.x, 0) / n;
  const my = pts.reduce((t, p) => t + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/**
 * Draw the step's scatter plot.
 *
 * The point of the toggle is that a power law is hard to judge by eye as a
 * curve and trivial to judge as a straight line, which is exactly the move
 * that turns four measurements into evidence for Kepler's third law.
 */
/**
 * The plot's points, as a table.
 * @param {Object} spec - The step's plot specification
 * @param {Array<{x:number,y:number,label?:string}>} points - What is drawn
 * @param {Object} opts - {transform, useLog} - which labels apply
 */
function renderPlotTable(els, spec, points, { transform, useLog } = {}) {
  const wrap = els.plotTableWrap;
  const table = els.plotTable;
  if (!wrap || !table) return;
  if (!points.length) {
    wrap.hidden = true;
    table.innerHTML = '';
    return;
  }
  const xLabel = transform?.xLabel || spec.xLabel || 'x';
  const yLabel = transform?.yLabel || spec.yLabel || 'y';
  // Log axes plot the logarithm, and saying so is the difference between a
  // table a reader can check against the picture and one that quietly
  // disagrees with it.
  const head = useLog
    ? [t('inv.plot.point'), `log₁₀(${xLabel})`, `log₁₀(${yLabel})`]
    : [t('inv.plot.point'), xLabel, yLabel];
  const digits = n =>
    Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)
      ? n.toExponential(3)
      : n.toFixed(3);
  const body = points
    .map(
      (p, i) =>
        `<tr><th scope="row">${escape(p.label || String(i + 1))}</th>` +
        `<td>${escape(digits(p.x))}</td><td>${escape(digits(p.y))}</td></tr>`
    )
    .join('');
  const html =
    `<caption>${escape(t('inv.plot.tableCaption', { title: spec.title || '' }))}</caption>` +
    `<thead><tr>${head.map(h => `<th scope="col">${prose(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${body}</tbody>`;
  if (table.innerHTML !== html) table.innerHTML = html;
  wrap.hidden = false;
}

export function drawPlot(step, vals, { canvas, els, transformed, log }) {
  if (!canvas || !step.plot) return;
  const spec = step.plot;
  let pts;
  try {
    pts = (spec.points(vals) || []).filter(
      p => Number.isFinite(p.x) && Number.isFinite(p.y)
    );
  } catch {
    pts = [];
  }
  const transform = transformed && spec.transform ? spec.transform : null;
  let shown = transform ? pts.map(transform.map) : pts;
  // Log axes: with Mercury at 0.39 AU and Neptune at 30, a linear plot crushes
  // the inner planets into the corner. On log-log a power law is still a
  // straight line, and the spacing becomes readable.
  const useLog = log && shown.every(p => p.x > 0 && p.y > 0);
  if (useLog) {
    shown = shown.map(p => ({
      x: Math.log10(p.x),
      y: Math.log10(p.y),
      label: p.label,
    }));
  }

  // The same points as numbers, before anything is drawn. A scatter is a
  // picture of a relationship, and the position of a dot is not available to
  // a reader on a screen reader nor to one who cannot tell two plotted
  // colors apart. Built from `shown` rather than from the raw values, so the
  // table says what the picture says: press "Square P, cube a" and both
  // transform together.
  renderPlotTable(els, spec, shown, { transform, useLog });
  canvas.setAttribute(
    'aria-label',
    t('inv.plot.canvasLabel', {
      title: String(spec.title || '').replace(/<[^>]*>/g, ''),
      n: shown.length,
    })
  );

  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) =>
    css.getPropertyValue(name).trim() || fallback;
  const ink = token('--text-primary', '#e9edf7');
  const muted = token('--text-muted', '#8a8f9e');
  const grid = token('--border-subtle', '#2a2f3d');
  const accent = token('--accent', '#38bdf8');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 320;
  const h = spec.height || 260;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 46;
  const padB = 30;
  const padT = 12;
  const padR = 10;
  const plotW = Math.max(10, w - padL - padR);
  const plotH = Math.max(10, h - padT - padB);

  const xs = shown.map(p => p.x);
  const ys = shown.map(p => p.y);
  // Always include the origin: the relation is anchored there, and a plot that
  // starts at the first data point hides how far the trend has to reach.
  const sx = useLog
    ? niceScale(Math.min(...xs), Math.max(...xs))
    : niceScale(Math.min(0, ...xs), Math.max(0, ...xs, 1));
  const sy = useLog
    ? niceScale(Math.min(...ys), Math.max(...ys))
    : niceScale(Math.min(0, ...ys), Math.max(0, ...ys, 1));
  const X = v => padL + ((v - sx.lo) / (sx.hi - sx.lo)) * plotW;
  const Y = v => padT + plotH - ((v - sy.lo) / (sy.hi - sy.lo)) * plotH;

  // Grid and ticks
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = sy.lo; v <= sy.hi + 1e-9; v += sy.step) {
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(tick(v), padL - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = sx.lo; v <= sx.hi + 1e-9; v += sx.step) {
    const x = X(v);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.fillText(tick(v), x, padT + plotH + 6);
  }

  // Axis labels
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  const xLab = transform ? transform.xLabel : spec.xLabel;
  const yLab = transform ? transform.yLabel : spec.yLabel;
  ctx.fillText(useLog ? `log10( ${xLab} )` : xLab, padL + plotW / 2, h - 11);
  ctx.save();
  ctx.translate(11, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(useLog ? `log10( ${yLab} )` : yLab, 0, 0);
  ctx.restore();

  // Fitted line, only in the transformed view where straightness is the claim
  if ((transform || useLog) && shown.length >= 2) {
    const slope = useLog ? logSlope(shown) : fitSlope(shown);
    if (slope !== null) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (useLog) {
        // y = slope*x + intercept in log space.
        const mx = shown.reduce((t, p) => t + p.x, 0) / shown.length;
        const my = shown.reduce((t, p) => t + p.y, 0) / shown.length;
        const b0 = my - slope * mx;
        ctx.moveTo(X(sx.lo), Y(slope * sx.lo + b0));
        ctx.lineTo(X(sx.hi), Y(slope * sx.hi + b0));
      } else {
        ctx.moveTo(X(sx.lo), Y(slope * sx.lo));
        ctx.lineTo(X(sx.hi), Y(slope * sx.hi));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`slope ${slope.toFixed(3)}`, padL + 6, padT + 4);
    }
  }

  // Points
  for (const p of shown) {
    const x = X(p.x);
    const y = Y(p.y);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.label) {
      ctx.fillStyle = ink;
      // Flip the label to the left of the point when it would otherwise run off
      // the right edge, which is exactly where the outermost planet lands.
      const lw = ctx.measureText(p.label).width;
      const flip = x + 7 + lw > padL + plotW;
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.textBaseline = y - 12 < padT ? 'top' : 'bottom';
      ctx.fillText(
        p.label,
        flip ? x - 7 : x + 7,
        ctx.textBaseline === 'top' ? y + 8 : y - 5
      );
    }
  }

  if (!shown.length) {
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('inv.plot.placeholder'), padL + plotW / 2, padT + plotH / 2);
  }
}

// --- Written answers ----------------------------------------------------------

/**
 * Whether a written answer is a written answer.
 *
 * Deliberately weak. This is not marking: a reader who writes something short
 * and wrong has answered, and telling them their phrasing is unscientific is
 * not this function's business. What it refuses is the null response - an empty
 * box, a space, a full stop, "..." - because the step is a prompt to say
 * something and those say nothing, and recording them as an answer puts an
 * empty field into a report a teacher will read.
 *
 * @param {string} value - What the reader typed
 * @returns {boolean} True when there is something there
 */
export function isWrittenAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  // Two letters or digits anywhere, in any script - not two in a row. A run of
  // two would reject "a = 1.5", which is terse but is an answer: a reader who
  // writes down the number they measured has said something. Any script,
  // because a Spanish reader's answer and a Greek symbol are both content.
  const content = text.match(/[\p{L}\p{N}]/gu);
  return (content?.length ?? 0) >= 2;
}

// --- Answer controls ----------------------------------------------------------

/**
 * The placeholder for a numeric box.
 *
 * Audited, because a placeholder is visible before the student has thought
 * about the question: one that shows the shape of the expected measurement -
 * "e.g. 3.52" - hands over the answer to the first digit. A step may set its
 * own only when it says something about *form* rather than value, and the
 * default says nothing at all beyond the unit.
 *
 * @param {Object} step - Step definition
 * @returns {string} The placeholder text
 */
function numericPlaceholder(step) {
  if (step.placeholder) return step.placeholder;
  return step.unit
    ? t('inv.answer.placeholderUnit', { unit: step.unit })
    : t('inv.answer.placeholder');
}

/**
 * Why a typed answer could not be read, in words a student can act on.
 *
 * Each refusal names a different thing to do about it, which is the whole
 * reason the parser distinguishes them instead of returning NaN.
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
 * Nothing appears unbidden. A hint that shows itself has done the thinking
 * before the student has tried to, which is the opposite of what a hint is
 * for - so each stage is a button, and the worked explanation is behind one
 * more press than the hints are.
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
      // A held prediction has no verdict yet, on screen or off it. This used to
      // be graded here regardless, so a screen reader heard "Correct.", or the
      // whole explanation, before the experiment meant to settle it, while the
      // screen said only that the answer was recorded. The note h.renderStep()
      // has just drawn under the options is what it hears now: the same words,
      // by construction, and nothing the screen is keeping back.
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
      // A box holding only whitespace or punctuation is not an answer, and
      // saying so beside it is kinder than letting it reach a report as one.
      const note = els.body.querySelector('#invAnswerNote');
      if (note) {
        // Raw length, not trimmed: a box of spaces is something the reader
        // typed and is not an answer, while a box they have not touched needs
        // no telling.
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

  const numeric = els.body.querySelector('[data-numeric]');
  const checkBtn = els.body.querySelector('[data-check-numeric]');
  if (numeric && checkBtn) {
    const submit = () => {
      // The first thing they committed to, kept. A student who tries a number,
      // is told it is wrong, and revises has done something a report should be
      // able to show; overwriting it leaves only the answer they arrived at
      // with help, which is a different fact about a different moment.
      if (h.responses()[`${id}:first`] === undefined && numeric.value.trim()) {
        h.responses()[`${id}:first`] = numeric.value;
      }
      // The text and the convention it was typed under, together. Storing the
      // text alone let a later reader - the PDF, or the same panel after a
      // language switch - decide that "1,234" had meant something else.
      recordAnswer(h.responses(), id, numeric.value, getLocale());
      h.attempts()[id] = (h.attempts()[id] || 0) + 1;
      h.save();
      h.renderStep();
      // What the panel now says under the box, read out: a result that only
      // appears is one a screen reader never hears.
      announce(els.body.querySelector('.inv-feedback')?.textContent ?? '');
    };
    checkBtn.addEventListener('click', submit);
    numeric.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  }
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
// What the engine holds (the lesson open, its answers, the clock, the
// assignment in force, the elements) is read through the host it binds once,
// when it loads; this module owns the status of the last write and this tab's
// copy of every lesson's progress. Keys, payloads, migration and notices are
// exactly what they were.

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

/**
 * Where this activity's progress lives.
 *
 * @param {string} id - Lesson id
 * @returns {string} Storage key
 */
const progressKey = id =>
  host.assigned() ? host.assignmentKey() : storageKey(id);
const progressArea = () => (host.assigned() ? 'assignments' : 'progress');

/**
 * An assignment's progress key: its lesson, steps and title, never its date,
 * so a link re-issued on another day keeps the work. A new title is a new
 * activity and re-keys on purpose. Work under the old dated key, from this
 * link or an earlier issue of it, moves across the first time it is read.
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

/**
 * Whether the last write reached the disk, and what went wrong if not.
 *
 * 'saved' | 'unavailable' | 'full' | 'authoring' | 'idle'
 *
 * This used to be swallowed entirely - the comment said progress was "not worth
 * an alert", which is true of a toast and false of the reader's forty minutes
 * of work. A student in a private window, or on a machine whose disk is full,
 * was told nothing at all and found out when they closed the tab.
 */
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

/** The step last noted in the resume record, so a keystroke is not a write. */
let notedAt = '';

/**
 * Tell the one resume record where the reader is (js/storage/local.js): this
 * lesson, at this step. The Library's link wrote the pathway they came by, and
 * the record keeps it. Only a step that is new to the record is written.
 */
function noteWhereWeAre(id, step) {
  const at = `${id}/${step ?? ''}`;
  if (!step || at === notedAt) return;
  notedAt = at;
  noteResume({
    id: `investigation:${id}`,
    route: `/#investigation=${id}`,
    step,
  });
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
  });

  // This tab's copy, always, and before the disk is asked. It is what makes
  // closing and reopening the lesson safe when the write below fails.
  sessionProgress.set(progressKey(active.id), payload);

  try {
    put(progressKey(active.id), JSON.stringify(payload), progressArea());
    setSaveState('saved');
    noteWhereWeAre(active.id, payload.stepSid);
  } catch (err) {
    // The answers stay in memory and the lesson keeps working; what changes is
    // that the reader is told, once, and given a way to take the work with
    // them.
    setSaveState(classifyStorageError(err));
  }
}

/**
 * Show whether the work is safe, without shouting about it.
 *
 * A polite live region, not a toast: a toast for a storage failure would fire
 * on every keystroke, and the one thing a reader needs here is a message that
 * *stays* until the situation changes. Successes announce nothing - the text is
 * there to be looked at, and a screen reader being told "saved" forty times
 * while typing an answer is worse than silence.
 */
/**
 * Say what reading the saved progress turned up, once, when the lesson opens.
 *
 * Only three things reach here and all three mean the reader's answers may not
 * be where they left them, so none of them is a toast: a migration from the
 * pre-sid format, which was necessarily done by position; answers for steps the
 * lesson no longer has; and a payload from a newer build, which was not read.
 */
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
  el.hidden = lines.length === 0;
}

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

/**
 * This tab's copy of every lesson's progress, whether or not the disk took it.
 * Written on every save, so never the older of the two: when localStorage
 * refuses a write, closing and reopening the lesson still finds the work. It
 * dies with the tab, as the unsaved warning promises. Authoring previews never
 * reach it, as they never reach storage.
 *
 * @type {Map<string, object>}
 */
export const sessionProgress = new Map();

/** Where a v1 payload is kept after it has been migrated, in case it was wrong. */
const legacyKey = id => `${STORAGE_PREFIX}${id}:v1`;

/**
 * Read a lesson's saved progress, migrating an older save if that is what is
 * there.
 * @param {string} id - Lesson id
 * @param {?object} lesson - The merged lesson, when the caller has it
 * @returns {?object} The progress, or null when there is none
 */
export function load(id, lesson = null) {
  // This tab first. It is written on every save and storage is not, so when the
  // two differ the session copy is the newer one - and when storage refused
  // every write, it is the only one there is.
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

  // Keep the original. A positional migration is right whenever the lesson has
  // not been reordered since the save and there is no way to tell from the
  // payload, so the thing it replaced is worth keeping until the reader has
  // looked at their answers.
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
 * `done` counts steps seen, which is what the progress bar shows; `at` is the
 * step a resume would land on, which is not the same number once a student has
 * gone back to reread something.
 *
 * @param {string} id - Investigation id
 * @returns {{done:number, total:number, started:boolean, at:number}} Progress
 */
export function progressFor(id) {
  // From the manifest: the browser asks this for all ten lessons before any of
  // them is loaded, and a step count is a number the manifest already carries.
  const total = investigationMeta(id)?.stepCount || 0;
  const saved = load(id);
  // `at` is a 1-based screen number for the card. A v2 payload stores a sid
  // rather than an index and the card has no lesson to resolve it against, so
  // it reports how far the reader got rather than exactly where they stopped.
  const done = saved ? saved.visited.size : 0;
  return {
    done,
    total,
    started: Boolean(saved),
    at: done > 0 ? Math.min(done, total || done) : 1,
  };
}
