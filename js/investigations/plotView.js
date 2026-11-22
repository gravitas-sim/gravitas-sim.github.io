// A lesson step's scatter plot, drawn by the shared plot component (js/plot/)
// and fetched with it, the first time a plot step is on screen. One selection
// of the plot's points is shared by the plot, its table, the object chips and
// the scene, as the Observatory shares one among its views.

import { tickLabel } from '../format.js';
import { registerMessages, t } from '../i18n/index.js';
import { EN_LINKED } from '../i18n/en.linked.js';
import { ES_LINKED } from '../i18n/es.linked.js';
import { PAD, createPlot, scales } from '../plot/plot.js';
import { createSelection, interact } from '../plot/select.js';
import { createTable } from '../plot/table.js';
import { fitSlope } from './figures.js';

registerMessages('en', EN_LINKED);
registerMessages('es', ES_LINKED);

const NS = 'http://www.w3.org/2000/svg';
/** The component's width in its own units: the scale of what is drawn on it. */
const UNITS_WIDE = 720;
const UNITS_TALL = 380;

const digits = n =>
  Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)
    ? n.toExponential(3)
    : n.toFixed(3);

/** Least-squares slope with a free intercept, for log-log axes. */
function logSlope(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

const rawPoints = (spec, vals) => {
  try {
    return (spec.points(vals) || []).map((p, row) => ({ ...p, row }));
  } catch {
    return [];
  }
};

/**
 * The form fields each plotted row reads, found by changing every field in
 * turn and seeing which rows move, so a lesson declares nothing for it.
 * @returns {Array<string[]>} Field ids, one list for each row the step plots
 */
export function fieldsOfRows(spec, fields, vals) {
  const base = rawPoints(spec, vals);
  const out = base.map(() => []);
  const same = (a, b) =>
    Object.is(a?.x, b?.x) && Object.is(a?.y, b?.y) && a?.label === b?.label;
  for (const f of fields) {
    const v = vals[f.id];
    const moved = rawPoints(spec, {
      ...vals,
      [f.id]: Number.isFinite(v) ? v + 1.37 : 1.37,
      [`${f.id}_text`]: `${vals[`${f.id}_text`] ?? ''}.`,
    });
    base.forEach((p, i) => {
      if (!same(p, moved[i])) out[i].push(f.id);
    });
  }
  return out;
}

let view = null;

/** One plot, table and selection per page: the panel is the page's only one. */
function build(svg, els, scene) {
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('role', 'status');
  const desc = document.createElement('p');
  desc.className = 'visually-hidden';
  desc.id = 'investigationPlotDesc';
  svg.after(live, desc);
  svg.setAttribute('role', 'group');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-describedby', desc.id);
  const v = {
    svg,
    els,
    live,
    desc,
    scene,
    rows: [],
    fields: [],
    step: null,
    selection: null,
    unsub: null,
    key: '',
    last: '',
    quiet: false,
    k: 1,
  };
  const hooks = {
    announce: text => (live.textContent = text),
    describe: i => describeRow(v, i),
    number: tickLabel,
    labels: { notStated: '' },
  };
  v.plot = createPlot(svg, hooks);
  interact(v.plot, svg, hooks, { brush: false, pick: true });
  v.table = createTable(els.plotTable, {
    announce: hooks.announce,
    describe: hooks.describe,
    number: digits,
    range: () => '',
    labels: {
      row: t('inv.plot.row'),
      masked: '',
      missing: t('inv.plot.missing'),
      notStated: '',
    },
  });
  return v;
}

/** A point read aloud: its name and both numbers, with the axes' own words. */
function describeRow(v, i) {
  const p = v.rows[i];
  return p
    ? t('inv.plot.read', {
        point: p.label || String(i + 1),
        xl: v.names.x,
        x: digits(p.x),
        yl: v.names.y,
        y: digits(p.y),
      })
    : '';
}

const rowRole = (v, p) => {
  if (!p) return null;
  if (p.role) return p.role;
  const name = String(p.label ?? '')
    .trim()
    .toLowerCase();
  if (!name || !v.scene) return null;
  return (
    v.scene
      .selectableBodies()
      .find(b => b.role && String(b.name).trim().toLowerCase() === name)
      ?.role ?? null
  );
};

const raws = v => new Set(Array.from(v.selection.rows(), i => v.rows[i]?.row));

/** Scale what the component draws in its own units to the panel's real width. */
function size(v) {
  const wide = v.svg.getBoundingClientRect?.().width || UNITS_WIDE;
  // Rounded up to a hundredth: type is never a hair under its size.
  const k = Math.max(
    1,
    Math.min(2.4, Math.ceil((UNITS_WIDE / wide) * 100) / 100)
  );
  v.k = k;
  for (const c of v.svg.querySelectorAll('.ow-pt, .ow-focus')) {
    c.setAttribute('r', (c.classList.contains('ow-focus') ? 8 : 4) * k);
    c.style.strokeWidth = `${2 * k}px`;
  }
  // Numbers at 11 px as the reader sees them, titles and names at 12.
  for (const x of v.svg.querySelectorAll('.ow-tick'))
    x.style.fontSize = `${11 * k}px`;
  for (const x of v.svg.querySelectorAll('.ow-label, .inv-plot-tag'))
    x.style.fontSize = `${12 * k}px`;
  // Larger type needs room under the axis: the frame grows downward only.
  const extra = Math.round(16 * (k - 1));
  v.svg.setAttribute('viewBox', `0 0 ${UNITS_WIDE} ${UNITS_TALL + extra}`);
  for (const x of v.svg.querySelectorAll('.ow-axes text')) {
    if (x.hasAttribute('transform')) {
      // The y title is turned: its tall letters need room on the left.
      x.dataset.t ??= x.getAttribute('transform');
      const at = 14 + 12 * (k - 1);
      x.setAttribute('x', at);
      x.setAttribute('transform', x.dataset.t.replace(/ 14 /, ` ${at} `));
      continue;
    }
    if (x.getAttribute('text-anchor') !== 'middle') continue;
    x.dataset.y ??= x.getAttribute('y');
    const title = x.classList.contains('ow-label');
    x.setAttribute('y', Number(x.dataset.y) + extra * (title ? 1 : 0.6));
  }
}

/** What changed in the selection: tell the views, then the scene and the form. */
function changed(v, source) {
  v.plot.update();
  v.table.update();
  size(v);
  if (v.quiet) return;
  const key = [...v.selection.rows()].join();
  if (key === v.last) return;
  v.last = key;
  const f = v.selection.focus;
  const p = v.rows[v.selection.has(f) ? f : v.selection.rows()[0]];
  if (!p) return;
  const role = rowRole(v, p);
  if (source !== 'scene' && role) v.scene?.selectRole(role);
  v.live.textContent = describeRow(v, v.rows.indexOf(p));
  // A point or a row that is chosen takes the reader to the form row it is.
  if (source === 'plot') {
    const id = v.fields[p.row]?.find(fid =>
      v.els.body.querySelector(`[data-field$=":${fid}"]:not([readonly])`)
    );
    v.els.body
      .querySelector(`[data-field$=":${id}"]`)
      ?.focus({ preventScroll: true });
  }
}

/**
 * Draw the step's plot from the lesson's current state.
 * @param {object} step - A step that declares `plot.points`
 * @param {object} vals - Field values by field id (and `<id>_text`)
 * @param {{canvas: SVGElement, els: object, transformed: boolean,
 *   log: boolean, scene?: object}} ctx - scene: {selectRole(role),
 *   selectableBodies()}, the lesson's objects
 */
export function draw(step, vals, { canvas, els, transformed, log, scene }) {
  const spec = step.plot;
  if (view?.svg !== canvas) view = build(canvas, els, scene);
  const v = view;
  v.scene = scene;
  if (v.step !== step) {
    v.step = step;
    v.fields = fieldsOfRows(spec, step.fields || [], vals);
    v.selection = null;
  }
  const transform = transformed && spec.transform ? spec.transform : null;
  let pts = rawPoints(spec, vals).filter(
    p => Number.isFinite(p.x) && Number.isFinite(p.y)
  );
  if (transform)
    pts = pts.map(p => ({
      ...transform.map(p),
      row: p.row,
      role: p.role,
    }));
  const useLog = log && pts.every(p => p.x > 0 && p.y > 0);
  if (useLog)
    pts = pts.map(p => ({
      ...p,
      x: Math.log10(p.x),
      y: Math.log10(p.y),
    }));
  const xl = transform?.xLabel || spec.xLabel || 'x';
  const yl = transform?.yLabel || spec.yLabel || 'y';
  v.names = {
    x: useLog ? `log₁₀(${xl})` : xl,
    y: useLog ? `log₁₀(${yl})` : yl,
  };
  const title = String(spec.title || '').replace(/<[^>]*>/g, '');

  // The selection outlives a redraw: a reading typed in changes the rows, not
  // which points were chosen, and one chosen is kept by the form row it is.
  const kept = v.selection ? raws(v) : new Set();
  const keptFocus = v.selection ? v.rows[v.selection.focus]?.row : -1;
  const key = pts.map(p => p.row).join();
  v.rows = pts;
  if (!v.selection || key !== v.key) {
    v.unsub?.();
    v.selection = createSelection(pts.length);
    v.key = key;
    v.quiet = true;
    const at = r => pts.findIndex(p => p.row === r);
    v.selection.set(pts.map((p, i) => (kept.has(p.row) ? i : -1)));
    if (at(keptFocus) >= 0) v.selection.moveFocus(at(keptFocus));
    v.quiet = false;
    v.unsub = v.selection.subscribe(({ source }) => changed(v, source));
  }

  const x = pts.map(p => p.x);
  const o = {
    kind: 'table',
    columns: [
      {
        id: 'p',
        name: t('inv.plot.point'),
        role: 'label',
        unit: null,
        values: pts.map((p, i) => p.label || String(i + 1)),
      },
      { id: 'x', name: v.names.x, role: 'x', unit: null, values: x },
      {
        id: 'y',
        name: v.names.y,
        role: 'value',
        unit: null,
        values: pts.map(p => p.y),
      },
    ],
  };
  const { els: e } = v;
  e.plotTableWrap.hidden = !pts.length;
  v.svg.setAttribute(
    'aria-label',
    t('inv.plot.canvasLabel', { title, n: pts.length })
  );
  v.desc.textContent = pts.length
    ? t('inv.plot.described', {
        n: pts.length,
        xl: v.names.x,
        lo: digits(Math.min(...x)),
        hi: digits(Math.max(...x)),
      })
    : t('inv.plot.placeholder');

  // A fit, only where straightness is the claim: transformed, or on log axes.
  const slope =
    (transform || useLog) && pts.length >= 2
      ? useLog
        ? logSlope(pts)
        : fitSlope(pts)
      : null;
  const mx = x.reduce((a, b) => a + b, 0) / (x.length || 1);
  const my = pts.reduce((a, p) => a + p.y, 0) / (pts.length || 1);
  const b0 = useLog ? my - slope * mx : 0;
  const lo = Math.min(0, ...x);
  const hi = Math.max(0, ...x, useLog ? -Infinity : 1);
  const reach = (hi - lo) * 2 || 2;
  const line =
    slope === null
      ? []
      : [
          {
            label: 'fit',
            points: [
              [lo - reach, slope * (lo - reach) + b0],
              [hi + reach, slope * (hi + reach) + b0],
            ],
          },
        ];
  v.plot.draw(o, {
    xColumn: 'x',
    yColumn: 'y',
    selection: v.selection,
    overlays: line,
    // The origin is in a plot of a relation that goes through it.
    xAlso: useLog ? [] : [0],
    yAlso: useLog ? [] : [0],
  });
  if (pts.length)
    v.table.draw(o, {
      selection: v.selection,
      caption: t('inv.plot.tableCaption', { title }),
    });
  else e.plotTable.replaceChildren();
  size(v);
  tag(v, slope, b0);
  size(v);
}

/** The part of the line y = m x + b inside the plot's box, as two x values. */
function inside(st, m, b) {
  const xs = [st.x0, st.x1];
  if (m) xs.push((st.y0 - b) / m, (st.y1 - b) / m);
  const tol = 1e-9 * (st.y1 - st.y0 || 1);
  const seen = xs
    .filter(
      x =>
        x >= st.x0 - 1e-9 &&
        x <= st.x1 + 1e-9 &&
        m * x + b >= st.y0 - tol &&
        m * x + b <= st.y1 + tol
    )
    .sort((p, q) => p - q);
  return seen.length > 1 ? [seen[0], seen.at(-1)] : null;
}

/**
 * The fit line told from the points without its color: triangles along it, and
 * its name, the slope, at its upper end where a legend would be looked up.
 */
function fitMark(v, g, st, { sx, sy }, slope, b0, say) {
  const ends = inside(st, slope, b0);
  if (!ends) return;
  const [a, z] = ends;
  const at = f => [sx(a + (z - a) * f), sy(slope * (a + (z - a) * f) + b0)];
  // Three places along the line that keep farthest from the dots and from each
  // other, so a triangle never sits on a reading.
  const dots = v.rows.map(p => [sx(p.x), sy(p.y)]);
  const spots = [];
  for (let n = 0; n < 3; n++) {
    let best = null;
    for (let f = 0.1; f < 0.95; f += 0.05) {
      const c = at(f);
      const gap = Math.min(
        ...[...dots, ...spots].map(d => Math.hypot(d[0] - c[0], d[1] - c[1]))
      );
      if (!best || gap > best.gap) best = { gap, c };
    }
    spots.push(best.c);
  }
  const mark = document.createElementNS(NS, 'path');
  mark.setAttribute('class', 'inv-plot-mark');
  mark.setAttribute('data-marker', 'triangle');
  const r = 6 * v.k;
  mark.setAttribute(
    'd',
    spots.map(([x, y]) => `M${x},${y - r}l${r},${2 * r}h${-2 * r}z`).join('')
  );
  g.append(mark);
  // Its name at the upper end, on the empty side of the line: below it where
  // the line rises (the points' names are above their points).
  const [ex, ey] = at(slope >= 0 ? 1 : 0);
  const [mx, my] = at(0.5);
  const lean = Math.abs((ey - my) / (ex - mx || 1));
  const k = v.k;
  const words = `slope ${slope.toFixed(3).replace('-0.000', '0.000')}`;
  say(words, {
    x: slope >= 0 ? ex : ex + 8 * k,
    y:
      slope >= 0
        ? Math.min(
            ey + 16 * k + lean * words.length * 7.2 * k,
            UNITS_TALL - PAD.bottom - 4 * k
          )
        : Math.max(PAD.top + 13 * k, ey - 10 * k),
    'text-anchor': slope >= 0 ? 'end' : 'start',
  });
}

/** The points' names, the slope and the empty-plot words, over the plot. */
function tag(v, slope, b0) {
  const st = v.plot.at();
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('aria-hidden', 'true');
  const say = (words, attrs) => {
    const n = document.createElementNS(NS, 'text');
    n.setAttribute('class', 'inv-plot-tag');
    for (const [a, val] of Object.entries(attrs)) n.setAttribute(a, val);
    n.textContent = words;
    g.append(n);
  };
  const { sx, sy } = scales(st);
  const right = UNITS_WIDE - 16;
  for (const p of v.rows) {
    const px = sx(p.x);
    const py = sy(p.y);
    const name = String(p.label ?? '');
    if (!name) continue;
    const k = v.k;
    const flip = px + 8 * k + name.length * 7.2 * k > right;
    say(name, {
      x: flip ? px - 8 * k : px + 8 * k,
      y: py - 12 * k < PAD.top ? py + 16 * k : py - 6 * k,
      'text-anchor': flip ? 'end' : 'start',
    });
  }
  if (slope !== null) fitMark(v, g, st, { sx, sy }, slope, b0, say);
  if (!v.rows.length)
    say(t('inv.plot.placeholder'), {
      x: UNITS_WIDE / 2,
      y: 190,
      'text-anchor': 'middle',
    });
  v.svg.append(g);
}

/** The scene's selected object changed: choose the rows that are that object. */
export function sync() {
  const v = view;
  if (!v?.selection || !v.scene) return;
  const mine = v.scene.selectableBodies().find(b => b.selected)?.role;
  if (!mine) return;
  const f = v.selection.focus;
  if (v.selection.has(f) && rowRole(v, v.rows[f]) === mine) return;
  const hit = v.rows.flatMap((p, i) => (rowRole(v, p) === mine ? [i] : []));
  if (!hit.length) return;
  v.selection.moveFocus(hit[0], 'scene');
  v.selection.set(hit, 'scene');
}

/** The step has no plot, or the lesson closed: nothing stays selected. */
export function clear() {
  if (!view) return;
  view.unsub?.();
  view.unsub = null;
  view.selection = null;
  view.step = null;
  view.key = '';
  view.last = '';
}
