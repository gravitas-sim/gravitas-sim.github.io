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

import { formatNumber, tickLabel } from '../format.js';
import { evidenceFrom } from '../data/investigations/provenance.js';
import { getLocale, t } from '../i18n/index.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import { gradeAnswer, toleranceFor } from '../answerCheck.js';
import { localeOfAnswer } from '../answerParse.js';
import {
  answerClass,
  feedbackFor,
  matchMisconception,
} from '../answerFeedback.js';
import { command } from '../appState.js';

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
 * @param {Function} c.unreadableMessage - Why a typed number cannot be read
 * @param {Function} c.numericPlaceholder - A numeric field's placeholder
 * @param {Function} c.hintBlock - The hint controls
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
    unreadableMessage,
    numericPlaceholder,
    hintBlock,
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

    parts.push(hintBlock(step, id));
  } else if (step.kind !== 'short' || !step.reflect) {
    // A choice, a prediction or a measurement can carry a ladder too; a
    // reflection has no right answer to be helped towards.
    parts.push(hintBlock(step, id));
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
  ctx.fillText(`e = ${e.toFixed(3)}`, 6, 16);
  ctx.fillStyle = muted;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`b/a = ${(b / a).toFixed(3)}`, 6, 33);
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
