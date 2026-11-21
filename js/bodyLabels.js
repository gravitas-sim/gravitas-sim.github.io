// Body labels and the selected-body cue (criterion I-9). Drawers queue a label;
// drawBodyMarks draws the cue, then the labels by priority, each only where no
// placed label is. Sizes are CSS pixels (the backing store is scaled).
import { SETTINGS, state } from './appState.js';
import { drawnRadiusPx } from './bodyVisuals.js';
import { SUN_SYMBOL, drawSolarLabel } from './utils.js';

export const LABEL_MIN_CSS_PX = 11;
export const LABEL_CAP = 24; // labels beyond the chosen and bound bodies
// all: a name where the model gives one, else the mass; bound: chosen and lesson bodies.
export const LABEL_MODES = ['all', 'names', 'masses', 'bound', 'none'];

let k = 1;
let queue = [];
let spots = [];
let isBound = () => false;
// Canvas text of its own (scale bar, notes), set a frame ahead; labels keep off it.
let keptClear = [];

export const setBoundTest = fn => {
  isBound = fn;
};

// A lesson step that asks for the masses to be worked out keeps them off the canvas.
let massesHidden = false;
export const hideMasses = on => {
  massesHidden = on === true;
};
export const massesAreHidden = () => massesHidden;

// CSS width kept by an observer: clientWidth in the frame forces a layout.
let cssW = null;
let watched = null;
let watcher = null;
function cssWidth(canvas) {
  if (watched !== canvas) {
    watcher?.disconnect();
    watched = canvas;
    cssW = null;
    watcher =
      typeof globalThis.ResizeObserver === 'function'
        ? new globalThis.ResizeObserver(() => (cssW = canvas.clientWidth))
        : null;
    watcher?.observe(canvas);
  }
  return cssW ?? canvas.clientWidth;
}

export function frameScale(canvas) {
  queue = [];
  spots = [];
  const w = cssWidth(canvas);
  return (k = w > 0 && canvas.width > 0 ? canvas.width / w : 1);
}

export const pixelScale = () => k;

export const resetKeepClear = () => {
  keptClear = [];
};

export const keepClear = (x0, y0, x1, y1) =>
  keptClear.push({ x0: x0 * k, y0: y0 * k, x1: x1 * k, y1: y1 * k });

export const labelFont = (px, family = 'Roboto Mono', weight = '') =>
  `${weight} ${Math.max(px, LABEL_MIN_CSS_PX) * k}px ${family}`.trim();

export const labelMode = () =>
  LABEL_MODES.includes(SETTINGS.body_labels) ? SETTINGS.body_labels : 'all';

/** Queue a label at screen point `at`, starting `r` below it. spec: name (default view), known (any name), mass as text or value+symbol+suffix. */
export function bodyLabel(o, at, r, spec) {
  const chosen = o === state.selectedObject?.object;
  if (spec.gate || chosen || isBound(o)) queue.push({ o, at, r, spec, chosen });
}

/** What a label says: a name, null for its mass, false for nothing. */
function say(q, mode) {
  const word = sayMode(q, mode);
  return word === null && massesHidden ? false : word;
}

function sayMode({ spec, chosen, o }, mode) {
  const mass = spec.text !== undefined || spec.value !== undefined;
  if (mode === 'names') {
    const name = spec.name ?? spec.known;
    if (name) return name;
    // The chosen body and a lesson's are named whatever the setting.
    return mass && (chosen || isBound(o)) ? null : false;
  }
  if (mode === 'masses') return mass ? null : (spec.name ?? false);
  return spec.name !== undefined ? spec.name : mass ? null : false;
}

const massText = spec =>
  spec.text ??
  `${spec.value} M${spec.symbol || SUN_SYMBOL}${spec.suffix || ''}`;

// Text widths by font and text, so a crowd of unplaceable labels measures once.
const widths = new Map();
function textWidth(ctx, text) {
  const key = `${ctx.font}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    if (widths.size > 400) widths.clear();
    widths.set(key, (w = ctx.measureText(text).width));
  }
  return w;
}

const overlaps = (a, b) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export const nameSpots = () => [...spots];

/** Last frame's label texts. */
export const drawnLabels = () => spots.filter(p => p.text).map(p => p.text);

/** Take a spot for text w by h centred at (x, y); false if one in `placed` is there. */
export function claim(placed, x, y, w, h) {
  const box = { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
  if (placed.some(p => overlaps(p, box))) return false;
  placed.push(box);
  return true;
}

export function drawBodyMarks(ctx, toScreen, cap = LABEL_CAP) {
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
    // Ring and four corner ticks, light over dark: seen in grayscale, static.
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
  const shown = [];
  for (const q of queue) {
    if (mode === 'none' || (mode === 'bound' && !q.chosen && !isBound(q.o)))
      continue;
    q.word = say(q, mode);
    if (q.word !== false) shown.push(q);
  }
  queue = [];
  const rank = q => (q.chosen ? 0 : isBound(q.o) ? 1 : 2);
  shown.sort((a, b) => rank(a) - rank(b) || (b.o.mass || 0) - (a.o.mass || 0));
  let spare = cap;
  let tries = cap * 8; // attempts, placed or not, for the labels beyond the cap
  const placed = (spots = [...keptClear]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3 * k;
  for (const q of shown) {
    const { spec, at, word } = q;
    const keep = rank(q) < 2;
    if (!keep && (spare <= 0 || tries-- <= 0)) continue;
    const named = word !== null;
    ctx.font = labelFont(spec.px);
    const h = Math.max(spec.px, LABEL_MIN_CSS_PX) * k * 1.15;
    const plain = named || spec.text !== undefined;
    const w =
      textWidth(
        ctx,
        named ? word : (spec.text ?? `${spec.value} M${spec.suffix || ''}`)
      ) + (plain ? 0 : 0.7 * spec.px * k);
    // The chosen body's ticks reach 12 px out; its name starts past them.
    const dy = q.r + (q.chosen ? 15 : spec.gap || 10) * k;
    // Home spot; if taken, slide down past what is there, else up.
    let at0 = null;
    for (const sign of [1, -1]) {
      let d = sign * dy;
      for (let n = 0; n < 4 && at0 === null; n++) {
        const box = {
          x0: at.x - w / 2,
          x1: at.x + w / 2,
          y0: at.y + d - h / 2,
          y1: at.y + d + h / 2,
          text: named ? word : massText(spec),
        };
        const hit = placed.find(p => overlaps(p, box));
        if (hit) d = (sign > 0 ? hit.y1 + h / 2 : hit.y0 - h / 2) - at.y;
        else (placed.push(box), (at0 = d));
      }
    }
    if (at0 === null) {
      if (!keep) continue;
      // A chosen or lesson body keeps its home spot, and takes it on record.
      at0 = dy;
      placed.push({
        x0: at.x - w / 2,
        x1: at.x + w / 2,
        y0: at.y + dy - h / 2,
        y1: at.y + dy + h / 2,
        text: named ? word : massText(spec),
      });
    }
    if (!keep) spare--;
    if (at0 !== dy) {
      const side = Math.sign(at0);
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = k;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y + side * q.r);
      ctx.lineTo(at.x, at.y + at0 - side * (h / 2));
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#fff';
    if (named) ctx.fillText(word, at.x, at.y + at0);
    else if (spec.text !== undefined) ctx.fillText(spec.text, at.x, at.y + at0);
    else drawSolarLabel(ctx, spec.value, at.x, at.y + at0, spec);
  }
  ctx.restore();
}
