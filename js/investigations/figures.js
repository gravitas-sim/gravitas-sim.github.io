// The scatter plot, the ellipse explorer and the import row of a measure step,
// fetched when a lesson opens with a step that declares one of them
// (js/investigations.js, `loadSeams`); one module to hold Kepler's request count.

import { fixed, tickLabel } from '../format.js';
import { t } from '../i18n/index.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';

/** Pick round axis bounds and a tick step that contain the data. */
function niceScale(min, max) {
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
 * Forced through zero: an intercept would let bad data look straight.
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
function logSlope(pts) {
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
  // Log axes plot the logarithm; the table says so, to agree with the picture.
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
  // Log axes: a linear plot crushes Mercury to Neptune into a corner; a power
  // law is still a straight line on log-log.
  const useLog = log && shown.every(p => p.x > 0 && p.y > 0);
  if (useLog) {
    shown = shown.map(p => ({
      x: Math.log10(p.x),
      y: Math.log10(p.y),
      label: p.label,
    }));
  }

  // The points as numbers first, for a screen reader or a reader who cannot
  // tell colors apart; built from `shown`, so the table says what the picture does.
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
  // Always include the origin: the relation is anchored there.
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
      // Flip the label left when it would run off the right edge.
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

/**
 * Draw an ellipse with its anatomy labeled, at a chosen eccentricity (the
 * slider is how "the Sun is at a focus" becomes visible).
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
  // Fit the widest case (a circle) with room for labels: nothing clips.
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

/**
 * The button that copies the selected object's measurements into the form.
 *
 * @param {Object} step - A step that declares importFromSelection
 * @returns {string} Markup
 */
export const importRow = step =>
  `<div class="inv-import-row">
           <button type="button" class="inv-import-btn" data-import>
             ${escape(step.importLabel || t('inv.import.default'))}
           </button>
           <span class="inv-import-hint" data-import-hint></span>
         </div>`;

/**
 * Copy the selected object's measurements into the next empty row: no
 * transcription errors, and the click still needs the right object chosen.
 */
export function importSelection(host) {
  const { step, id, responses, recordAnswer, save, renderStep } = host;
  if (!step?.importFromSelection) return;
  const ctx = host.probeContext();
  let values;
  try {
    values = step.importFromSelection(ctx);
  } catch (err) {
    console.warn(err);
    values = null;
  }
  const hint = host.body.querySelector('[data-import-hint]');
  if (!values) {
    if (hint) hint.textContent = t('inv.import.needObject');
    return;
  }

  const groups = step.importGroups || [];

  // Refuse a row already recorded: two clicks would stamp one event twice.
  const already = groups.some(g =>
    g.every(
      (fid, i) =>
        String(responses[`${id}:${fid}`] ?? '').trim() === String(values[i])
    )
  );
  if (already) {
    if (hint) hint.textContent = t('inv.import.duplicate');
    return;
  }

  // Find the first row whose fields are all still empty.
  const target = groups.find(g =>
    g.every(fid => String(responses[`${id}:${fid}`] ?? '').trim() === '')
  );
  if (!target) {
    if (hint) hint.textContent = t('inv.import.full');
    return;
  }

  // The lesson writes these the JavaScript way, so they are English.
  target.forEach((fid, i) => {
    if (values[i] !== undefined)
      recordAnswer(responses, `${id}:${fid}`, String(values[i]), 'en');
  });
  save();
  renderStep();
  const hint2 = host.body.querySelector('[data-import-hint]');
  if (hint2) hint2.textContent = t('inv.import.added', { value: values[0] });
}
