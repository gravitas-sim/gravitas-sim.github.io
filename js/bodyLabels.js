// =============================================================================
// Body names and the selected-body cue on the main canvas
// -----------------------------------------------------------------------------
// The one authority for text that names a body. The drawers (bodyDraw.js,
// bodyDrawSky.js) queue a label as they paint; once every body is down the
// frame calls drawBodyMarks, which draws the selection cue and then the names
// in priority order, so a crowd shows its most important names and none on
// another.
//
// Sizes are CSS pixels. The canvas's backing store is its CSS box times
// js/quality.js renderScale, and its context is not scaled to match, so a font
// of 11 "px" covers 5.6 CSS pixels at a pixel ratio of 2. frameScale reads the
// ratio once per frame and labelFont turns CSS pixels into the font to set.
// Judged by criterion I-9 (DESIGN_SYSTEM.md, Visual direction).
// =============================================================================

import { SETTINGS, state } from './appState.js';
import { drawnRadiusPx } from './bodyVisuals.js';
import { drawSolarLabel } from './utils.js';

/** Smallest label, in CSS pixels. */
export const LABEL_MIN_CSS_PX = 11;
/** Names drawn beside the bound and selected ones, the most massive first. */
export const LABEL_CAP = 24;
/** The values of the body_labels setting; the first is the default. */
export const LABEL_MODES = ['all', 'bound', 'none'];

let k = 1;
let queue = [];
let spots = [];
let isBound = () => false;

/** The lesson scene says which bodies a step is about (js/lessonScene.js). */
export const setBoundTest = fn => {
  isBound = fn;
};

/** Backing pixels per CSS pixel; read once per frame. @returns {number} */
export function frameScale(canvas) {
  queue = [];
  spots = [];
  const w = canvas.clientWidth;
  return (k = w > 0 && canvas.width > 0 ? canvas.width / w : 1);
}

/** Backing pixels per CSS pixel, as of this frame. @returns {number} */
export const pixelScale = () => k;

/** A canvas font for `px` CSS pixels, never under the floor. @returns {string} */
export const labelFont = (px, family = 'Roboto Mono', weight = '') =>
  `${weight} ${Math.max(px, LABEL_MIN_CSS_PX) * k}px ${family}`.trim();

/** @returns {string} The setting, with anything unknown read as the default */
export const labelMode = () =>
  LABEL_MODES.includes(SETTINGS.body_labels) ? SETTINGS.body_labels : 'all';

/**
 * Queue a name for this frame.
 * @param {object} o - The body
 * @param {{x: number, y: number}} at - Its centre on screen, backing pixels
 * @param {number} r - Where the label starts below the centre, backing pixels
 * @param {object} spec - `name`, or `value` with `suffix` and `symbol`; `px`
 *   (CSS pixels); `gap` (CSS pixels past `r`); `gate` (false below the level
 *   of detail that names a body; a bound or selected body is named anyway)
 */
export function bodyLabel(o, at, r, spec) {
  const chosen = o === state.selectedObject?.object;
  if (!spec.gate && !chosen && !isBound(o)) return;
  queue.push({ o, at, r, spec, chosen });
}

const overlaps = (a, b) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** The spots this frame's names took, for other text to keep clear of. */
export const nameSpots = () => [...spots];

/**
 * Take a spot for a text of `w` by `h` centred at (x, y), if nothing in
 * `placed` is there; used by labels that are not bodies (the wedge areas).
 * @returns {boolean} False when the spot is taken
 */
export function claim(placed, x, y, w, h) {
  const box = { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
  if (placed.some(p => overlaps(p, box))) return false;
  placed.push(box);
  return true;
}

/**
 * Draw the selection cue, then this frame's names. Screen space, last of the
 * bodies.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(p: {x: number, y: number}) => {x: number, y: number}} toScreen
 */
export function drawBodyMarks(ctx, toScreen) {
  const picked = state.selectedObject;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (picked?.object?.pos && picked.object.alive !== false) {
    const c = toScreen(picked.object.pos);
    const r =
      Math.max(
        drawnRadiusPx(picked.object.radius, picked.type, state.zoom),
        4
      ) +
      6 * k;
    // A ring and four corner ticks, light over dark: it shows against a bright
    // star and a dark sky alike, in grayscale, and without animating.
    for (const [w, ink] of [
      [4.5, 'rgba(0,0,0,0.75)'],
      [2, '#fff'],
    ]) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
      for (const a of [1, 3, 5, 7]) {
        const dx = Math.cos((a * Math.PI) / 4);
        const dy = Math.sin((a * Math.PI) / 4);
        ctx.moveTo(c.x + dx * r, c.y + dy * r);
        ctx.lineTo(c.x + dx * (r + 6 * k), c.y + dy * (r + 6 * k));
      }
      ctx.stroke();
    }
  }
  const mode = labelMode();
  const shown = queue.filter(q =>
    mode === 'bound' ? q.chosen || isBound(q.o) : true
  );
  queue = [];
  if (mode !== 'none' && shown.length) {
    const rank = q => (q.chosen ? 0 : isBound(q.o) ? 1 : 2);
    shown.sort(
      (a, b) => rank(a) - rank(b) || (b.o.mass || 0) - (a.o.mass || 0)
    );
    let spare = LABEL_CAP;
    const placed = (spots = []);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3 * k;
    for (const q of shown) {
      const { spec, at } = q;
      const keep = rank(q) < 2;
      if (!keep && spare <= 0) continue;
      const text = spec.name ?? `${spec.value} M${spec.suffix || ''}`;
      ctx.font = labelFont(spec.px);
      const h = Math.max(spec.px, LABEL_MIN_CSS_PX) * k * 1.15;
      const w =
        ctx.measureText(text).width +
        (spec.name === undefined ? 0.7 * spec.px * k : 0);
      // A chosen body's ticks reach 12 px out; its name starts past them.
      const dy = q.r + (q.chosen ? 15 : spec.gap || 10) * k;
      // The home spot; if it is taken, slide down past what is there, and if
      // that does not clear it, up from above the body. No solver.
      let dyChosen = null;
      for (const sign of [1, -1]) {
        let d = sign * dy;
        for (let n = 0; n < 4 && dyChosen === null; n++) {
          const box = {
            x0: at.x - w / 2,
            x1: at.x + w / 2,
            y0: at.y + d - h / 2,
            y1: at.y + d + h / 2,
          };
          const hit = placed.find(p => overlaps(p, box));
          if (!hit) {
            dyChosen = d;
            placed.push(box);
          } else {
            d = (sign > 0 ? hit.y1 + h / 2 : hit.y0 - h / 2) - at.y;
          }
        }
      }
      if (dyChosen === null) {
        if (!keep) continue;
        dyChosen = dy;
      }
      if (!keep) spare--;
      if (dyChosen !== dy) {
        const side = Math.sign(dyChosen);
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = k;
        ctx.beginPath();
        ctx.moveTo(at.x, at.y + side * q.r);
        ctx.lineTo(at.x, at.y + dyChosen - side * (h / 2));
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#fff';
      if (spec.name !== undefined)
        ctx.fillText(spec.name, at.x, at.y + dyChosen);
      else
        drawSolarLabel(ctx, spec.value, at.x, at.y + dyChosen, {
          suffix: spec.suffix,
          symbol: spec.symbol,
        });
    }
  }
  ctx.restore();
}
