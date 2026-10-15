// =============================================================================
// js/plot/: the series chart (PLOT_COMPONENT.md, "Stage 3a")
// -----------------------------------------------------------------------------
// Connected series, points and filled areas over plain arrays: the shape the
// application's five charts have (a time series that grows while the
// simulation runs; two runs drawn against each other; a trace with error bars
// and a survey's measurements). It imports one name (the theme event, from the
// leaf registry js/names.js), so a route that draws one pays for this file and
// not for the observation table's readers, the units registry or ./plot.js.
//
// - **Raw arrays.** A series is two arrays and a few words: the axis titles
//   are the caller's strings, the numbers are written by the caller's
//   `number`. No unit id has to be registered for a chart to be drawn.
// - **A draw that updates.** draw() reconciles the DOM with the spec: the
//   axes are rebuilt only when their ticks or titles change, each series keeps
//   its nodes and has its attributes set, the points and error bars are
//   pooled. Only the newest `maxPoints` of a series are drawn, and a series
//   with more than about two points per pixel column is drawn as the lowest
//   and highest in each column, so the cost of a draw is bounded by the
//   chart's width and not by the length of the recording.
// - **Every series can be hidden** from its legend entry, a real button, so
//   Tab and Enter or Space work; the ranges follow the series that are shown.
// - **A readout that is not the mouse's.** Hovering shows the values at the
//   pointer; Left and Right step along a series from the keyboard, Up and
//   Down change series, Home and End go to the ends, Escape lets go. The same
//   words are spoken (a polite status), so a value is not only a tooltip.
// - **Theme.** A color is a CSS color or a function that returns one;
//   repaint() reads the functions again, and the chart does it on the page's
//   theme-change event. Axes, grid and text are CSS variables with fallbacks,
//   set as presentation attributes, so they follow a theme without a draw and
//   without a stylesheet: nothing here depends on page.css.
//
// ./export.js is the PNG, fetched when it is asked for.
// =============================================================================

import { EV_THEME_CHANGED } from '../names.js';

const NS = 'http://www.w3.org/2000/svg';
const TICK = 10;
const TITLE = 11;
/** Points per pixel column before a line is drawn as lows and highs. */
const PER_COLUMN = 2;
/** Fallbacks for a page that has not drawn the chart's size yet. */
const FALLBACK = { width: 640, height: 220 };

const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** A coordinate as markup, to a tenth of a pixel. */
const r1 = v => Math.round(v * 10) / 10;
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Set an attribute only when it changes: a draw at 15 Hz writes little. */
function put(node, name, value) {
  const cache = (node.ocCache ??= {});
  const v = value === null || value === undefined ? null : String(value);
  if (cache[name] === v) return;
  cache[name] = v;
  if (v === null) node.removeAttribute(name);
  else node.setAttribute(name, v);
}

/** Round, readable tick values across a range. */
export function niceTicks(lo, hi, count = 5) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  // Whole multiples of the step, written without the float noise of adding.
  const places = 10 ** Math.max(0, 2 - Math.floor(Math.log10(step)));
  const out = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + step * 1e-9; k++) {
    out.push(Math.round(k * step * places) / places);
  }
  return out;
}

/**
 * Which points of a series to draw: all of them, or the lowest and highest in
 * each pixel column when there are more than the chart can show.
 * @param {ArrayLike<number>} xs
 * @param {ArrayLike<number>} ys
 * @param {number} from - First index of the window
 * @param {number} to - One past the last
 * @param {number} x0 - Left edge of the plot, in data units
 * @param {number} x1 - Right edge
 * @param {number} columns - Pixel columns across the plot
 * @returns {number[]|null} Indices in order, or null for every one
 */
export function decimate(xs, ys, from, to, x0, x1, columns) {
  if (to - from <= columns * PER_COLUMN) return null;
  const lo = new Int32Array(columns).fill(-1);
  const hi = new Int32Array(columns).fill(-1);
  const span = x1 - x0 || 1;
  for (let i = from; i < to; i++) {
    if (!isNum(xs[i]) || !isNum(ys[i])) continue;
    const c = Math.min(
      columns - 1,
      Math.max(0, Math.floor(((xs[i] - x0) / span) * columns))
    );
    if (lo[c] < 0 || ys[i] < ys[lo[c]]) lo[c] = i;
    if (hi[c] < 0 || ys[i] > ys[hi[c]]) hi[c] = i;
  }
  const out = [];
  for (let c = 0; c < columns; c++) {
    if (lo[c] < 0) continue;
    if (lo[c] === hi[c]) out.push(lo[c]);
    else if (lo[c] < hi[c]) out.push(lo[c], hi[c]);
    else out.push(hi[c], lo[c]);
  }
  return out;
}

/** Index of the point nearest x in an ascending series window, or -1. */
function nearestIndex(xs, from, to, x) {
  let a = from;
  let b = to - 1;
  if (b < a) return -1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (xs[m] < x) a = m;
    else b = m;
  }
  return Math.abs(xs[a] - x) <= Math.abs(xs[b] - x) ? a : b;
}

const color = c => (typeof c === 'function' ? c() : c);

/**
 * @param {HTMLElement} host - Emptied and drawn into; give it a width (and, for
 *   height: 'fill', a height)
 * @param {object} [opts]
 * @param {Function} [opts.number] - Writes a tick or a readout number
 * @param {number|'fill'} [opts.height] - CSS pixels; 'fill' takes the host's
 * @param {number} [opts.width] - Used while the host has none (hidden, or a
 *   page without layout)
 * @param {number} [opts.maxPoints] - Draw only the newest n of each series
 * @param {boolean} [opts.theme] - Repaint on the page's theme change
 * @param {number} [opts.capPx] - Error-bar caps, in screen pixels per side
 * @param {{mode?: 'index'|'nearest', title?: Function, format?: Function}}
 *   [opts.tooltip] - mode picks every series at the pointer or the one
 *   nearest; title(x) and format({label, x, y, i, id}) write the words
 * @param {{role?: string, legend?: string, toggled?: Function}} [opts.labels]
 *   - the translated words: the roledescription, the legend's name, and
 *   toggled(label, shown) for what is spoken when a series is shown or hidden
 */
export function createChart(host, opts = {}) {
  const number = opts.number ?? (v => String(Math.round(v * 1e6) / 1e6));
  const L = opts.labels ?? {};
  const T = opts.tooltip ?? {};
  const capPx = opts.capPx ?? 3;
  const clipId = `ocClip${++createChart.count}`;

  // --- The pieces ------------------------------------------------------------
  const legendEl = document.createElement('ul');
  const wrap = document.createElement('div');
  const svg = el('svg', { role: 'group', tabindex: 0 });
  const tip = document.createElement('div');
  const status = document.createElement('p');
  Object.assign(legendEl.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
    margin: '0 0 4px',
    padding: '0',
    listStyle: 'none',
    justifyContent: 'center',
  });
  Object.assign(wrap.style, { position: 'relative', width: '100%' });
  Object.assign(svg.style, {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
  });
  Object.assign(tip.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    lineHeight: '1.35',
    whiteSpace: 'nowrap',
    zIndex: 2,
    color: 'var(--text-primary, #eee)',
    background: 'var(--surface-2, #1b2030)',
    border: '1px solid var(--border, rgba(128, 128, 128, 0.4))',
  });
  tip.setAttribute('aria-hidden', 'true');
  // Visually hidden, still read: the clip technique, in CSSOM.
  Object.assign(status.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    margin: '-1px',
    padding: '0',
    whiteSpace: 'nowrap',
  });
  status.setAttribute('role', 'status');
  if (L.role) svg.setAttribute('aria-roledescription', L.role);
  legendEl.hidden = true;
  wrap.append(svg, tip, status);
  host.replaceChildren(legendEl, wrap);

  const defs = el('defs');
  const clipRect = el('rect');
  const clip = el('clipPath', { id: clipId });
  clip.append(clipRect);
  defs.append(clip);
  const axesG = el('g', { 'aria-hidden': 'true' });
  const seriesG = el('g', { 'aria-hidden': 'true' });
  const cursorG = el('g', { 'aria-hidden': 'true' });
  const guide = el('line', {
    stroke: 'var(--text-muted, #888)',
    'stroke-dasharray': '3 3',
    visibility: 'hidden',
  });
  cursorG.append(guide);
  svg.append(defs, axesG, seriesG, cursorG);
  const GRID = 'var(--border-subtle, rgba(128, 128, 128, 0.25))';
  const INK = 'var(--text-muted, #888)';
  // Each axis' ticks, the frame's two lines and the titles.
  const axisX = [];
  const axisY = [];
  const frameX = el('line', { stroke: INK });
  const frameY = el('line', { stroke: INK });
  const titleX = el('text', {
    'text-anchor': 'middle',
    fill: 'var(--text-secondary, #999)',
    'font-size': TITLE,
  });
  const titleY = el('text', {
    'text-anchor': 'middle',
    fill: 'var(--text-secondary, #999)',
    'font-size': TITLE,
  });
  axesG.append(frameX, frameY, titleX, titleY);

  // --- State -----------------------------------------------------------------
  let spec = null;
  let size = null;
  let legendSig = '';
  let cursor = null;
  let dead = false;
  /** id -> hidden, the reader's choice or the spec's last word. */
  const hidden = new Map();
  const specHidden = new Map();
  /** id -> the nodes of one series. */
  const nodes = new Map();
  let drawn = [];
  let rebuilds = 0;

  const idOf = (s, k) => s.id ?? s.label ?? String(k);
  const isHidden = (s, k) => hidden.get(idOf(s, k)) === true;

  function measure() {
    const w = Math.round(wrap.clientWidth);
    let h = opts.height ?? FALLBACK.height;
    if (h === 'fill') {
      h = Math.max(
        120,
        Math.round(
          host.clientHeight - (legendEl.hidden ? 0 : legendEl.offsetHeight)
        )
      );
    }
    if (w > 0) size = { w, h };
    return (
      size ?? {
        w: opts.width ?? FALLBACK.width,
        h: isNum(h) ? h : FALLBACK.height,
      }
    );
  }

  // --- The draw --------------------------------------------------------------
  /**
   * Draw the chart's spec, reusing what it has drawn.
   * @param {object} next
   * @param {string} [next.label] - What the chart is, for a screen reader
   * @param {string} [next.xTitle]
   * @param {string} [next.yTitle]
   * @param {[number, number]} [next.xRange] - Fixed edges, in data units
   * @param {[number, number]} [next.yRange]
   * @param {Function} [next.xNumber] - Writes an x tick, where it is not
   *   `number`; yNumber likewise
   * @param {boolean} [next.legend] - Whether the legend shows (default: when
   *   there is more than one series)
   * @param {Array<object>} next.series - id, label, x, y, sigma?, color,
   *   width (2), dash ([]), mode ('line', 'points' or 'both'), fill (true, or
   *   a color), radius (3), hidden, order, maxPoints
   */
  function draw(next) {
    spec = next;
    next.series.forEach((s, k) => {
      const id = idOf(s, k);
      // A spec that changes a series' visibility wins over the reader's last
      // choice; one that merely repeats itself does not undo it.
      if (s.hidden !== undefined && specHidden.get(id) !== s.hidden) {
        hidden.set(id, Boolean(s.hidden));
      }
      if (s.hidden !== undefined) specHidden.set(id, s.hidden);
    });
    render();
  }

  function render() {
    if (!spec || dead) return;
    // The legend first: a chart that fills its host has what it leaves.
    syncLegend();
    const { w, h } = measure();
    put(svg, 'viewBox', `0 0 ${w} ${h}`);
    put(svg, 'height', h);
    put(svg, 'aria-label', spec.label ?? '');
    const all = spec.series;
    const live = [];
    all.forEach((s, k) => {
      if (isHidden(s, k)) return;
      const cap = s.maxPoints ?? opts.maxPoints ?? Infinity;
      const n = Math.min(s.x.length, s.y.length);
      live.push({ s, k, n, from: Math.max(0, n - cap) });
    });

    // Ranges: the series that are shown, error bars included.
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const { s, n, from } of live) {
      for (let i = from; i < n; i++) {
        const x = s.x[i];
        const y = s.y[i];
        if (!isNum(x) || !isNum(y)) continue;
        const e = s.sigma && isNum(s.sigma[i]) ? s.sigma[i] : 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y - e < y0) y0 = y - e;
        if (y + e > y1) y1 = y + e;
      }
    }
    if (x0 > x1) [x0, x1, y0, y1] = [0, 1, 0, 1];
    if (spec.xRange) [x0, x1] = spec.xRange;
    if (spec.yRange) [y0, y1] = spec.yRange;
    else {
      const pad = (y1 - y0) * 0.05 || Math.abs(y0) * 0.05 || 1;
      y0 -= pad;
      y1 += pad;
    }
    if (x1 === x0) {
      const pad = Math.abs(x0) * 0.05 || 1;
      x0 -= pad;
      x1 += pad;
    }

    // The frame: its left edge makes room for the widest y tick.
    const yTicks = niceTicks(
      y0,
      y1,
      Math.max(2, Math.min(6, Math.round((h - 60) / 36)))
    );
    const yWords = yTicks.map(spec.yNumber ?? number);
    const widest = yWords.reduce((m, t) => Math.max(m, t.length), 0);
    const left = Math.max(40, Math.round(widest * TICK * 0.6) + 28);
    const frame = { left, top: 8, right: 10, bottom: 36 };
    const fw = Math.max(10, w - frame.left - frame.right);
    const fh = Math.max(10, h - frame.top - frame.bottom);
    const sx = x => frame.left + ((x - x0) / (x1 - x0 || 1)) * fw;
    const sy = y => frame.top + fh - ((y - y0) / (y1 - y0 || 1)) * fh;
    const xTicks = niceTicks(
      x0,
      x1,
      Math.max(2, Math.min(8, Math.round(fw / 80)))
    );
    const xWords = xTicks.map(spec.xNumber ?? number);
    const geo = { x0, x1, y0, y1, w, h, fw, fh, frame, sx, sy };

    paintAxes(geo, xTicks, xWords, yTicks, yWords);
    put(clipRect, 'x', frame.left);
    put(clipRect, 'y', frame.top);
    put(clipRect, 'width', fw);
    put(clipRect, 'height', fh);

    // Series, in draw order: a higher `order` is drawn first, behind.
    const seen = new Set();
    const base = Math.min(Math.max(0, y0), y1);
    const ordered = [...live].sort(
      (a, b) => (b.s.order ?? 0) - (a.s.order ?? 0)
    );
    drawn = [];
    ordered.forEach((entry, at) => {
      const { s, k } = entry;
      const id = idOf(s, k);
      seen.add(id);
      let nd = nodes.get(id);
      if (!nd) {
        nd = {
          g: el('g', { 'clip-path': `url(#${clipId})` }),
          area: el('path', { stroke: 'none' }),
          bars: el('path', { fill: 'none', 'stroke-width': 1 }),
          line: el('path', {
            fill: 'none',
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
          }),
          pts: el('g'),
          dots: [],
        };
        nd.g.append(nd.area, nd.bars, nd.line, nd.pts);
        nodes.set(id, nd);
        rebuilds++;
      }
      if (seriesG.children[at] !== nd.g) {
        seriesG.insertBefore(nd.g, seriesG.children[at] ?? null);
      }
      paintSeries(nd, s, entry, geo, base);
      drawn.push({ id, s, k, n: entry.n, from: entry.from });
    });
    for (const [id, nd] of nodes) {
      if (!seen.has(id)) {
        nd.g.remove();
        nodes.delete(id);
      }
    }
    // The readout walks the series in the order they were given.
    drawn.sort((a, b) => a.k - b.k);
    geoNow = geo;
    refreshCursor();
  }

  let geoNow = null;

  function paintSeries(nd, s, { n, from }, geo, base) {
    const { x0, x1, fw, sx, sy } = geo;
    const c = color(s.color) ?? 'currentColor';
    const mode = s.mode ?? 'line';
    const wantLine = mode === 'line' || mode === 'both';
    const wantPts = mode === 'points' || mode === 'both';
    const idx = wantLine ? decimate(s.x, s.y, from, n, x0, x1, fw) : null;

    if (wantLine) {
      const parts = [];
      const area = [];
      let run = 0;
      let runStart = '';
      let last = '';
      const close = () => {
        if (s.fill && run > 1) {
          area.push(
            `${runStart}${last}L${r1(sx(lastX))},${r1(sy(base))}L${r1(sx(firstX))},${r1(sy(base))}Z`
          );
        }
        run = 0;
      };
      let firstX = 0;
      let lastX = 0;
      const each = idx ?? { length: n - from };
      for (let j = 0; j < each.length; j++) {
        const i = idx ? idx[j] : from + j;
        const x = s.x[i];
        const y = s.y[i];
        if (!isNum(x) || !isNum(y)) {
          close();
          continue;
        }
        const pt = `${r1(sx(x))},${r1(sy(y))}`;
        if (run === 0) {
          firstX = x;
          runStart = `M${pt}`;
          parts.push(`M${pt}`);
          last = '';
        } else {
          parts.push(`L${pt}`);
          last += `L${pt}`;
        }
        lastX = x;
        run++;
      }
      close();
      put(nd.line, 'd', parts.join(''));
      put(nd.line, 'stroke', c);
      put(nd.line, 'stroke-width', s.width ?? 2);
      put(
        nd.line,
        'stroke-dasharray',
        s.dash?.length ? s.dash.join(' ') : null
      );
      put(nd.area, 'd', area.join(''));
      put(nd.area, 'fill', s.fill === true ? c : (color(s.fill) ?? null));
      put(nd.area, 'fill-opacity', s.fill === true ? 0.15 : null);
    } else {
      put(nd.line, 'd', '');
      put(nd.area, 'd', '');
    }

    // Points: a pool of circles, moved and, at the tail, added or dropped.
    const radius = s.radius ?? 3;
    let used = 0;
    if (wantPts) {
      for (let i = from; i < n; i++) {
        const x = s.x[i];
        const y = s.y[i];
        if (!isNum(x) || !isNum(y)) continue;
        let dot = nd.dots[used];
        if (!dot) {
          dot = el('circle');
          nd.dots.push(dot);
          nd.pts.append(dot);
        }
        put(dot, 'cx', r1(sx(x)));
        put(dot, 'cy', r1(sy(y)));
        put(dot, 'r', radius);
        put(dot, 'fill', c);
        used++;
      }
    }
    while (nd.dots.length > used) nd.dots.pop().remove();

    // Error bars: one path, each bar with its caps, a fixed count of pixels
    // wide whatever the chart's size.
    if (s.sigma) {
      const d = [];
      for (let i = from; i < n; i++) {
        const x = s.x[i];
        const y = s.y[i];
        const e = s.sigma[i];
        if (!isNum(x) || !isNum(y) || !isNum(e) || e <= 0) continue;
        const px = r1(sx(x));
        const top = r1(sy(y + e));
        const bottom = r1(sy(y - e));
        d.push(
          `M${px},${top}L${px},${bottom}M${r1(px - capPx)},${top}L${r1(px + capPx)},${top}M${r1(px - capPx)},${bottom}L${r1(px + capPx)},${bottom}`
        );
      }
      put(nd.bars, 'd', d.join(''));
      put(nd.bars, 'stroke', c);
    } else put(nd.bars, 'd', '');
  }

  /** Set a line's four ends, writing only what moved. */
  function line(node, x1, y1, x2, y2) {
    put(node, 'x1', x1);
    put(node, 'y1', y1);
    put(node, 'x2', x2);
    put(node, 'y2', y2);
  }
  /** Set a text node's words, only when they changed. */
  function say(node, words) {
    if (node.ocText === words) return;
    node.ocText = words;
    node.textContent = words;
  }

  /**
   * The axes, moved and not rebuilt: each tick is three nodes that are kept
   * while the tick exists, so a window that scrolls writes their positions and
   * nothing else.
   */
  function paintAxes(geo, xTicks, xWords, yTicks, yWords) {
    const { frame, fw, fh, h, sx, sy } = geo;
    const bottom = frame.top + fh;
    const pool = (list, n) => {
      while (list.length < n) {
        const u = {
          grid: el('line', { stroke: GRID }),
          mark: el('line', { stroke: INK }),
          label: el('text', { fill: INK, 'font-size': TICK }),
        };
        axesG.append(u.grid, u.mark, u.label);
        list.push(u);
      }
      while (list.length > n) {
        const u = list.pop();
        u.grid.remove();
        u.mark.remove();
        u.label.remove();
      }
    };
    pool(axisX, xTicks.length);
    pool(axisY, yTicks.length);
    xTicks.forEach((v, i) => {
      const u = axisX[i];
      const x = r1(sx(v));
      line(u.grid, x, frame.top, x, bottom);
      line(u.mark, x, bottom, x, bottom + 4);
      put(u.label, 'x', x);
      put(u.label, 'y', bottom + 16);
      put(u.label, 'text-anchor', 'middle');
      say(u.label, xWords[i]);
    });
    yTicks.forEach((v, i) => {
      const u = axisY[i];
      const y = r1(sy(v));
      line(u.grid, frame.left, y, frame.left + fw, y);
      line(u.mark, frame.left - 4, y, frame.left, y);
      put(u.label, 'x', frame.left - 7);
      put(u.label, 'y', y + 3.5);
      put(u.label, 'text-anchor', 'end');
      say(u.label, yWords[i]);
    });
    line(frameX, frame.left, bottom, frame.left + fw, bottom);
    line(frameY, frame.left, frame.top, frame.left, bottom);
    const mid = frame.top + fh / 2;
    put(titleX, 'x', frame.left + fw / 2);
    put(titleX, 'y', h - 6);
    say(titleX, spec.xTitle ?? '');
    put(titleY, 'x', 12);
    put(titleY, 'y', mid);
    put(titleY, 'transform', `rotate(-90 12 ${mid})`);
    say(titleY, spec.yTitle ?? '');
  }

  // --- The legend ------------------------------------------------------------
  function swatch(s, c) {
    const sv = el('svg', { width: 26, height: 10, 'aria-hidden': 'true' });
    const mode = s.mode ?? 'line';
    if (mode !== 'points') {
      sv.append(
        el('line', {
          x1: 1,
          y1: 5,
          x2: 25,
          y2: 5,
          stroke: c,
          'stroke-width': Math.min(3, s.width ?? 2),
          'stroke-dasharray': s.dash?.length ? s.dash.join(' ') : 'none',
        })
      );
    }
    if (mode !== 'line')
      sv.append(el('circle', { cx: 13, cy: 5, r: 3, fill: c }));
    return sv;
  }

  /** The legend's buttons by series id, for the state they show. */
  let legendButtons = new Map();

  function syncLegend() {
    const show = spec.legend ?? spec.series.length > 1;
    const items = spec.series.map((s, k) => ({
      id: idOf(s, k),
      s,
      c: color(s.color) ?? 'currentColor',
      off: isHidden(s, k),
    }));
    // What the buttons look like is rebuilt when it changes; whether a series
    // is shown only changes an attribute, so a button the keyboard is on is
    // still the button the keyboard is on.
    const sig = show
      ? items
          .map(i =>
            [i.id, i.s.label, i.c, i.s.mode, i.s.dash, i.s.width].join('~')
          )
          .join('|')
      : '';
    legendEl.hidden = !show;
    if (sig !== legendSig) {
      legendSig = sig;
      const active =
        legendEl.contains(document.activeElement) &&
        document.activeElement.dataset.series;
      legendButtons = new Map();
      if (L.legend) legendEl.setAttribute('aria-label', L.legend);
      legendEl.replaceChildren(
        ...(show ? items : []).map(({ id, s, c }) => {
          const li = document.createElement('li');
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.series = id;
          // A page may style bare buttons; the legend's are plain text.
          Object.assign(b.style, {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            margin: '0',
            padding: '2px 6px',
            minHeight: '0',
            border: '0',
            borderRadius: '4px',
            background: 'transparent',
            boxShadow: 'none',
            font: 'inherit',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--text-secondary, #999)',
          });
          b.append(
            swatch(s, c),
            document.createTextNode(String(s.label ?? id))
          );
          b.addEventListener('click', () => setHidden(id, !isOff(id), true));
          legendButtons.set(id, b);
          li.append(b);
          return li;
        })
      );
      if (active) legendButtons.get(active)?.focus();
    }
    for (const { id, off } of show ? items : []) {
      const b = legendButtons.get(id);
      put(b, 'aria-pressed', String(!off));
      b.style.opacity = off ? 0.55 : 1;
      b.style.textDecoration = off ? 'line-through' : 'none';
    }
  }
  const isOff = id => hidden.get(id) === true;

  /** Show or hide a series, as its legend button does. */
  function setHidden(id, off, say = false) {
    hidden.set(id, Boolean(off));
    if (say && L.toggled) {
      const s = spec.series.find((v, k) => idOf(v, k) === id);
      status.textContent = L.toggled(String(s?.label ?? id), !off);
    }
    render();
  }

  // --- The readout -----------------------------------------------------------
  function words(hit) {
    const { s, i } = hit;
    const info = { id: hit.id, label: s.label, x: s.x[i], y: s.y[i], i };
    if (T.format) return T.format(info);
    const e = s.sigma && isNum(s.sigma[i]) ? ` ± ${number(s.sigma[i])}` : '';
    return `${s.label ?? hit.id}: ${number(info.y)}${e}`;
  }

  function show(hits, keyboard) {
    if (!hits.length || !geoNow) return hideTip();
    const first = hits[0];
    const title = T.title
      ? T.title(first.s.x[first.i])
      : number(first.s.x[first.i]);
    const lines = hits.map(words);
    tip.replaceChildren();
    if (title) {
      const t = document.createElement('div');
      t.textContent = title;
      t.style.fontWeight = '600';
      tip.append(t);
    }
    for (const [j, text] of lines.entries()) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';
      row.append(
        swatch(hits[j].s, color(hits[j].s.color) ?? 'currentColor'),
        text
      );
      tip.append(row);
    }
    tip.style.display = 'block';
    const { sx, sy, frame, w } = geoNow;
    const px = sx(first.s.x[first.i]);
    const py = sy(first.s.y[first.i]);
    const flip = px > w * 0.6;
    tip.style.left = flip ? 'auto' : `${Math.round(px + 12)}px`;
    tip.style.right = flip ? `${Math.round(w - px + 12)}px` : 'auto';
    tip.style.top = `${Math.round(Math.max(frame.top, py - 10))}px`;
    // Marks at the values read.
    cursorG.replaceChildren(guide);
    put(guide, 'x1', r1(px));
    put(guide, 'x2', r1(px));
    put(guide, 'y1', frame.top);
    put(guide, 'y2', frame.top + geoNow.fh);
    put(
      guide,
      'visibility',
      (T.mode ?? 'index') === 'index' ? 'visible' : 'hidden'
    );
    for (const h of hits) {
      cursorG.append(
        el('circle', {
          cx: r1(sx(h.s.x[h.i])),
          cy: r1(sy(h.s.y[h.i])),
          r: 4.5,
          fill: 'none',
          stroke: color(h.s.color) ?? 'currentColor',
          'stroke-width': 2,
        })
      );
    }
    if (keyboard)
      status.textContent = [title, ...lines].filter(Boolean).join('. ');
  }

  function hideTip() {
    tip.style.display = 'none';
    cursorG.replaceChildren(guide);
    put(guide, 'visibility', 'hidden');
  }

  function hitsAt(px, py) {
    if (!geoNow) return [];
    const { x0, x1, fw, frame, sx, sy } = geoNow;
    const x = x0 + ((px - frame.left) / fw) * (x1 - x0);
    const found = [];
    for (const d of drawn) {
      const i = nearestIndex(d.s.x, d.from, d.n, x);
      if (i >= 0 && isNum(d.s.y[i]) && isNum(d.s.x[i])) found.push({ ...d, i });
    }
    if ((T.mode ?? 'index') === 'index') return found;
    let best = null;
    let bestD = Infinity;
    for (const f of found) {
      const dx = sx(f.s.x[f.i]) - px;
      const dy = sy(f.s.y[f.i]) - py;
      const dd = dx * dx + dy * dy;
      if (dd < bestD) {
        bestD = dd;
        best = f;
      }
    }
    return best ? [best] : [];
  }

  /** Where the pointer is, in the chart's pixels; null outside the frame. */
  function where(e) {
    const r = svg.getBoundingClientRect();
    if (!geoNow || !r.width) return null;
    const px = ((e.clientX - r.left) / r.width) * geoNow.w;
    const py = ((e.clientY - r.top) / r.height) * geoNow.h;
    const { frame, fw, fh } = geoNow;
    if (
      px < frame.left ||
      px > frame.left + fw ||
      py < frame.top ||
      py > frame.top + fh
    ) {
      return null;
    }
    return [px, py];
  }

  const onMove = e => {
    if (cursor) return;
    const p = where(e);
    if (p) show(hitsAt(p[0], p[1]), false);
    else hideTip();
  };
  const onLeave = () => {
    if (!cursor) hideTip();
  };

  /**
   * What the keyboard's place reads: the point itself, and in index mode the
   * other series' points at the same place along x.
   */
  function cursorHits(d, i) {
    const own = { ...d, i };
    if ((T.mode ?? 'index') !== 'index') return [own];
    const rest = [];
    for (const v of drawn) {
      if (v.id === d.id) continue;
      const j = nearestIndex(v.s.x, v.from, v.n, d.s.x[i]);
      if (j >= 0 && isNum(v.s.y[j])) rest.push({ ...v, i: j });
    }
    return [own, ...rest];
  }

  /** The keyboard's place: a series' id and a point of it. */
  function refreshCursor() {
    if (!cursor) return;
    const d = drawn.find(v => v.id === cursor.id);
    if (!d) return clearCursor();
    cursor.i = Math.max(d.from, Math.min(d.n - 1, cursor.i));
    show(cursorHits(d, cursor.i), false);
  }
  function clearCursor() {
    cursor = null;
    hideTip();
  }

  const onKey = e => {
    if (!drawn.length) return;
    if (e.key === 'Escape') {
      if (cursor) {
        e.preventDefault();
        clearCursor();
      }
      return;
    }
    const along = { ArrowRight: 1, ArrowLeft: -1, PageDown: 10, PageUp: -10 }[
      e.key
    ];
    const across = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    const end = e.key === 'Home' || e.key === 'End';
    if (along === undefined && across === undefined && !end) return;
    e.preventDefault();
    if (!cursor) {
      // The first key lands on the newest point of the first series; Home and
      // End go on to their ends.
      const d = drawn.find(v => v.n > v.from);
      if (!d) return;
      cursor = { id: d.id, i: d.n - 1 };
      if (!end) return show(cursorHits(d, cursor.i), true);
    }
    const at = drawn.findIndex(v => v.id === cursor.id);
    let d = drawn[at];
    if (across !== undefined) {
      // To the next series that has points, at the same place along x.
      for (let j = 1; j <= drawn.length; j++) {
        const next = drawn[(at + across * j + drawn.length * j) % drawn.length];
        const i = nearestIndex(next.s.x, next.from, next.n, d.s.x[cursor.i]);
        if (i >= 0) {
          d = next;
          cursor = { id: next.id, i };
          break;
        }
      }
    } else if (e.key === 'Home') cursor.i = d.from;
    else if (e.key === 'End') cursor.i = d.n - 1;
    else cursor.i += along;
    cursor.i = Math.max(d.from, Math.min(d.n - 1, cursor.i));
    show(cursorHits(d, cursor.i), true);
  };

  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerleave', onLeave);
  svg.addEventListener('keydown', onKey);
  svg.addEventListener('blur', clearCursor);

  // --- Size, theme and the end -----------------------------------------------
  let ro = null;
  if (typeof window.ResizeObserver === 'function') {
    ro = new window.ResizeObserver(() => {
      const w = Math.round(wrap.clientWidth);
      if (w > 0 && (!size || size.w !== w || opts.height === 'fill')) {
        size = null;
        render();
      }
    });
    ro.observe(host);
  }
  const themed = () => render();
  if (opts.theme !== false) window.addEventListener(EV_THEME_CHANGED, themed);

  return {
    draw,
    /** Read the colors again, as a theme change does. */
    repaint: render,
    /** Measure the host again and redraw. */
    resize() {
      size = null;
      render();
    },
    setHidden: (id, off) => setHidden(id, off),
    toggle: id => setHidden(id, !hidden.get(id), true),
    isHidden: id => hidden.get(id) === true,
    /** Draw's counters and the last geometry, for tests and measurement. */
    stats: () => ({ rebuilds, drawn: drawn.length, geometry: geoNow }),
    /** The chart's <svg>, for the page to label and describe. */
    element: svg,
    /** What ./export.js needs. */
    parts: () => ({
      svg,
      width: geoNow?.w ?? FALLBACK.width,
      height: geoNow?.h ?? FALLBACK.height,
      series: (spec?.series ?? []).map((s, k) => ({
        label: String(s.label ?? idOf(s, k)),
        color: color(s.color) ?? 'currentColor',
        dash: s.dash ?? [],
        width: s.width ?? 2,
        mode: s.mode ?? 'line',
        hidden: isHidden(s, k),
      })),
    }),
    /** The chart as a PNG (a Blob), through ./export.js. */
    async toPNG(options) {
      return (await import('./export.js')).toPNG(this.parts(), options);
    },
    destroy() {
      dead = true;
      ro?.disconnect();
      window.removeEventListener(EV_THEME_CHANGED, themed);
      host.replaceChildren();
    },
  };
}
createChart.count = 0;
