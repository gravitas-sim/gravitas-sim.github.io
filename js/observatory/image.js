// =============================================================================
// The image view: pixels as they are, their sky positions as the WCS says
// -----------------------------------------------------------------------------
// A canvas, each pixel a square, the lowest row at the bottom as FITS has it.
// Nothing is resampled or smoothed: a pixel is drawn as one color, and the
// color says what the pixel holds.
//
// - An image of bit fields (a column with `bits`, like TESS's aperture mask)
//   is categorical: each distinct value gets its own color, and the legend
//   says what each value is, bit by bit, in the source's words. No color
//   scale is implied between values that have no order.
// - Any other image is drawn on a gray scale between its lowest and highest
//   finite value, linearly or by square root, and the page says which.
//
// The selection is the workspace's, and an image's rows are its pixels (row
// index = (y - 1) * width + (x - 1)). A click selects a pixel, a drag a
// rectangle; the arrow keys move a focused pixel, Shift extends a rectangle
// from where it started, and Space adds or removes the focused pixel. What
// the focused pixel is - its value decoded, its position on the sky - is
// announced, and shown beside the image.
// =============================================================================

import { columnOf, maskedRows } from './schema.js';

/** Distinct, color-blind-safe colors for categories (Okabe and Ito). */
export const CATEGORY_COLORS = [
  '#56B4E9',
  '#E69F00',
  '#009E73',
  '#F0E442',
  '#0072B2',
  '#D55E00',
  '#CC79A7',
  '#999999',
];

/** The meanings of a bit-field value, in the order of the bits. */
export function decodeBits(value, bits) {
  return bits.filter(b => (value & b.value) !== 0).map(b => b.meaning);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{announce: Function, describe: Function}} hooks
 */
export function createImageView(canvas, hooks) {
  let state = null;
  let drag = null;
  let anchor = null;

  const indexOf = (x, y) => (y - 1) * state.width + (x - 1);
  const pixelAt = e => {
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * state.width;
    const py = ((e.clientY - r.top) / r.height) * state.height;
    const x = Math.min(state.width, Math.max(1, Math.floor(px) + 1));
    // Row 1 is at the bottom.
    const y = Math.min(
      state.height,
      Math.max(1, state.height - Math.floor(py))
    );
    return { x, y };
  };

  function rectangle(a, b) {
    const out = [];
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        out.push(indexOf(x, y));
      }
    }
    return out;
  }

  canvas.addEventListener('pointerdown', e => {
    if (!state || e.button !== 0) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture?.(e.pointerId);
    drag = { from: pixelAt(e), to: pixelAt(e) };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.to = pixelAt(e);
    paint(rectangle(drag.from, drag.to));
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return;
    drag.to = pixelAt(e);
    const { from, to } = drag;
    drag = null;
    if (from.x === to.x && from.y === to.y) {
      const i = indexOf(from.x, from.y);
      state.selection.moveFocus(i, 'image');
      state.selection.toggle(i, 'image');
      anchor = from;
    } else {
      state.selection.set(rectangle(from, to), 'image');
      state.selection.moveFocus(indexOf(to.x, to.y), 'image-focus');
      anchor = from;
    }
    hooks.announce(hooks.describe(state.selection.focus));
  });

  canvas.addEventListener('keydown', e => {
    if (!state) return;
    const { selection, width, height } = state;
    const f = Math.max(0, selection.focus);
    let x = (f % width) + 1;
    let y = Math.floor(f / width) + 1;
    if (e.key === 'ArrowRight') x++;
    else if (e.key === 'ArrowLeft') x--;
    else if (e.key === 'ArrowUp') y++;
    else if (e.key === 'ArrowDown') y--;
    else if (e.key === 'Home') x = 1;
    else if (e.key === 'End') x = width;
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      selection.toggle(f, 'image');
      hooks.announce(hooks.describe(f));
      return;
    } else if (e.key === 'Escape') {
      selection.clear('image');
      anchor = null;
      return;
    } else return;
    e.preventDefault();
    x = Math.min(width, Math.max(1, x));
    y = Math.min(height, Math.max(1, y));
    const here = { x, y };
    if (e.shiftKey) {
      anchor = anchor || { x: (f % width) + 1, y: Math.floor(f / width) + 1 };
      selection.set(rectangle(anchor, here), 'image');
    } else anchor = null;
    selection.moveFocus(indexOf(x, y), e.shiftKey ? 'image-focus' : 'image');
    hooks.announce(hooks.describe(indexOf(x, y)));
  });

  /**
   * Draw an image observation.
   * @param {object} o - After the changes
   * @param {{selection: object, stretch?: 'linear'|'sqrt'}} view
   * @returns {{legend: Array<{value: number, color: string, count: number,
   *   meanings: string[]}>|null, range: [number, number]|null}}
   */
  function draw(o, { selection, stretch = 'linear' }) {
    const { width, height } = o.image;
    const col = columnOf(o, o.image.value);
    const bits = col.role === 'flag' ? col.bits : null;
    const scale = Math.max(4, Math.floor(Math.min(640 / width, 480 / height)));
    canvas.width = width * scale;
    canvas.height = height * scale;
    let legend = null;
    let range = null;
    const colorOf = new Map();
    if (bits) {
      const counts = new Map();
      for (const v of col.values) counts.set(v, (counts.get(v) || 0) + 1);
      const values = [...counts.keys()].sort((a, b) => a - b);
      legend = values.map((value, k) => {
        const color = CATEGORY_COLORS[k % CATEGORY_COLORS.length];
        colorOf.set(value, color);
        return {
          value,
          color,
          count: counts.get(value),
          meanings: decodeBits(value, bits),
        };
      });
    } else {
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of col.values) {
        if (Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
      range = [lo, hi];
    }
    state = {
      o,
      width,
      height,
      scale,
      col,
      colorOf,
      range,
      stretch,
      selection,
      bits,
    };
    paint();
    return { legend, range };
  }

  function color(v) {
    if (state.bits) return state.colorOf.get(v) || '#000';
    if (!Number.isFinite(v)) return '#400';
    const [lo, hi] = state.range;
    let t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
    if (state.stretch === 'sqrt') t = Math.sqrt(Math.max(0, t));
    const g = Math.round(20 + t * 225);
    return `rgb(${g},${g},${g})`;
  }

  /** Paint the pixels, the selection and the focus; `preview` is a drag. */
  function paint(preview = null) {
    if (!state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height, scale, col, selection } = state;
    const masked = maskedRows(state.o);
    const pending = preview ? new Set(preview) : null;
    for (let i = 0; i < width * height; i++) {
      const x = i % width;
      const y = height - 1 - Math.floor(i / width);
      ctx.fillStyle = color(col.values[i]);
      ctx.fillRect(x * scale, y * scale, scale, scale);
      if (masked.has(i)) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
      if (pending ? pending.has(i) : selection.has(i)) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, scale / 10);
        ctx.strokeRect(x * scale + 2, y * scale + 2, scale - 4, scale - 4);
      }
    }
    const f = selection.focus;
    if (f >= 0) {
      const x = f % width;
      const y = height - 1 - Math.floor(f / width);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(3, scale / 6);
      ctx.strokeRect(x * scale + 1, y * scale + 1, scale - 2, scale - 2);
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = Math.max(2, scale / 10);
      ctx.strokeRect(x * scale + 1, y * scale + 1, scale - 2, scale - 2);
    }
  }

  return { draw, update: () => paint() };
}
