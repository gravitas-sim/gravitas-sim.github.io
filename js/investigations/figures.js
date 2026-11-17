// The scatter plot, the ellipse explorer and the import row of a measure step,
// fetched when a lesson opens with a step that declares one of them
// (js/investigations.js, `loadSeams`); one module to hold Kepler's request count.

import { fixed } from '../format.js';
import { t } from '../i18n/index.js';
import { escapeHtml as escape } from '../lessonMarkup.js';

/** Least-squares fit through the origin (an intercept would let bad data look straight). */
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

let plotView = null;

/** Fetch the plot component and its glue; a plot step needs it, no other does. */
export const loadPlot = () =>
  plotView
    ? Promise.resolve(plotView)
    : import('./plotView.js').then(m => (plotView = m));

/**
 * Draw the step's scatter plot, fetching the plot component the first time.
 * Calls made while it loads are drawn in order once it has.
 */
export function drawPlot(step, vals, ctx) {
  if (!ctx.canvas || !step.plot?.points) return plotView?.clear();
  if (plotView) return plotView.draw(step, vals, ctx);
  // Offline before its first use the plot stays empty; nothing else breaks.
  loadPlot()
    .then(m => m.draw(step, vals, ctx))
    .catch(() => {});
}

let pointing = null;
let pointAt = null;

/** Point at the step's object, or stop pointing; the ring's code is fetched on use. */
export function point(step, host) {
  pointAt = step.point ?? null;
  if (!pointAt) return pointing?.stop();
  (pointing
    ? Promise.resolve(pointing)
    : import('./pointing.js').then(m => (pointing = m))
  )
    .then(m => pointAt === step.point && m.start(pointAt, host))
    .catch(() => {});
}

/** The scene's selection changed: the plot follows. */
export const syncSelection = () => plotView?.sync();

/** Draw an ellipse with its anatomy labeled, at a chosen eccentricity. */
export function drawEllipse(canvas, e) {
  if (!canvas) return;
  const css = getComputedStyle(document.documentElement);
  const tok = (n, f) => css.getPropertyValue(n).trim() || f;
  const ink = tok('--text-primary', '#e9edf7');
  const muted = tok('--text-muted', '#8a8f9e');
  const line = tok('--border-subtle', '#2a2f3d');
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

/** The button that copies the selected object's measurements into the form. */
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
