// The scatter plot, the ellipse explorer and the readings a measure step takes (the
// import row, `source` and `take` fields, an interval), fetched when a lesson opens
// with a step that declares one (js/investigations.js, `loadSeams`); one module for Kepler's request count.

import { fixed, roundSig } from '../format.js';
import { getLocale, t } from '../i18n/index.js';
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

// --- Readings taken (an import, a probe or readout row, an interval) ---------
// One path writes a reading: the text as printed, how it was taken beside it
// (`<field>:src`, a JSON string), a polite announcement and one ledger entry.

// The engine's own functions, handed over by stepView.js (`fieldModule`): importing
// them here would split them into chunks of their own on every route using this module.
let kit = {};
export const setKit = k => (kit = k);

const SRC = ':src';
const NUMBER = /[−+-]?\d+(?:[.,]\d+)*(?:e[+-]?\d+)?/i;
const plain = s => String(s ?? '').replace(/<[^>]*>/g, '');
const attr = x => escape(x).replace(/"/g, '&quot;');
const parsed = raw => {
  try {
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
};
/** The convention a printed number was written in. */
const localeOf = text =>
  /\./.test(text) ? 'en' : /,/.test(text) ? 'es' : getLocale();

/** The number text a row gives a field: its declared `text`, else the first number printed. */
export const numberText = row =>
  String(row?.text ?? String(row?.value ?? '').match(NUMBER)?.[0] ?? '') ||
  null;

/** How each field of a step was filled, by field id (for `validate`). */
export const readings = (responses, id, step) =>
  Object.fromEntries(
    (step.fields || []).flatMap(f => {
      const s = parsed(responses[`${id}:${f.id}${SRC}`]);
      return s ? [[f.id, s]] : [];
    })
  );

/** Mark a captured value as typed over, the moment the reader edits it. */
export function typed(responses, key, body) {
  const s = parsed(responses[key + SRC]);
  if (!s || s.k === 't') return;
  responses[key + SRC] = JSON.stringify({ k: 't', r: s.r });
  const at = [...(body?.querySelectorAll('[data-src]') ?? [])].find(
    n => n.dataset.src === key
  );
  if (at) at.textContent = t('inv.take.typed');
}

const note = raw => {
  const s = parsed(raw);
  return s
    ? s.k === 't'
      ? t('inv.take.typed')
      : t('inv.take.from', { what: s.l })
    : '';
};

/** The words a reading is announced in, and the field it fills. */
const said = (f, text) =>
  t('inv.take.done', {
    what: plain(f.label),
    value: `${text}${f.unit ? ` ${f.unit}` : ''}`,
  });

/** The step's reading buttons: one after each field that has a `source`. */
export function takeRow(step, f, c) {
  if (!f.source || f.source.span !== undefined) return '';
  if (
    kit.predictionState(c.active?.steps, step, c.visited, c.responses) ===
    'uncommitted'
  )
    return `<p class="inv-import-hint">${escape(t('inv.take.predict'))}</p>`;
  const key = `${c.id}:${f.id}`;
  return `<div class="inv-import-row"><button type="button" class="inv-import-btn" data-take="${attr(f.id)}" aria-label="${attr(t('inv.take.name', { what: plain(f.label) }))}">${escape(step.take?.label || t('inv.take.default'))}</button><span class="inv-import-hint" data-src="${attr(key)}">${escape(note(c.responses[key + SRC]))}</span></div>`;
}

/** The interval controls of a step: one group for each series its fields read. */
export function spanGroups(step, c) {
  const ids = [
    ...new Set((step.fields || []).map(f => f.source?.span).filter(Boolean)),
  ];
  if (!ids.length) return '';
  if (
    kit.predictionState(c.active?.steps, step, c.visited, c.responses) ===
    'uncommitted'
  )
    return `<p class="inv-import-hint">${escape(t('inv.take.predict'))}</p>`;
  const bound = which =>
    `<label class="inv-field"><span class="inv-field-label">${escape(t(`inv.span.${which}`))}</span><input type="number" inputmode="decimal" data-bound="${which}" step="any" /></label>`;
  return ids
    .map(
      id =>
        `<div class="inv-fields" role="group" aria-label="${attr(t('inv.span.title'))}" data-span="${attr(id)}">${bound('from')}${bound('to')}<p class="inv-import-hint" data-span-step></p><p class="inv-field-label" data-span-result></p><div class="inv-import-row"><button type="button" class="inv-import-btn" data-take-span>${escape(step.take?.label || t('inv.span.take'))}</button><span class="inv-import-hint" data-span-hint></span></div></div>`
    )
    .join('');
}

/**
 * The mean, the number of points and the standard error of y over [a, b]
 * (sample standard deviation over the square root of n). Bounds are ordered
 * and clipped to the data; fewer than two points is refused.
 * @param {number[]} x - Abscissae
 * @param {number[]} y - Values
 * @param {number} a - One bound
 * @param {number} b - The other
 * @returns {{ok: boolean, n: number, mean?: number, se?: number, lo: number, hi: number, clipped: boolean}}
 */
export function spanStats(x, y, a, b) {
  const pts = [];
  x.forEach((v, i) => {
    if (Number.isFinite(v) && Number.isFinite(y[i])) pts.push([v, y[i]]);
  });
  const lo0 = Math.min(...pts.map(p => p[0]));
  const hi0 = Math.max(...pts.map(p => p[0]));
  const lo = Math.max(Math.min(a, b), lo0);
  const hi = Math.min(Math.max(a, b), hi0);
  const clipped = lo !== Math.min(a, b) || hi !== Math.max(a, b);
  const inside = pts.filter(p => p[0] >= lo && p[0] <= hi).map(p => p[1]);
  const n = inside.length;
  if (n < 2) return { ok: false, n, lo, hi, clipped };
  const mean = inside.reduce((s, v) => s + v, 0) / n;
  const ss = inside.reduce((s, v) => s + (v - mean) ** 2, 0);
  return {
    ok: true,
    n,
    mean,
    se: Math.sqrt(ss / (n - 1) / n),
    lo,
    hi,
    clipped,
  };
}

/** Decimals that print a standard error to two figures. */
const places = se => (se > 0 ? Math.max(0, 1 - Math.floor(Math.log10(se))) : 4);

/** The one place a reading is written. */
function commit(host, writes, announced, again) {
  const { id, responses, save, renderStep } = host;
  for (const w of writes) {
    const key = `${id}:${w.fid}`;
    responses[key] = w.text;
    responses[key + ':locale'] = w.locale;
    responses[key + SRC] = JSON.stringify(w.src);
  }
  save();
  renderStep();
  // The panel is redrawn, so the reader's place is put back on the button pressed.
  host.body.querySelector(again)?.focus();
  kit.announce(announced);
  for (const w of writes)
    keep(host, { ...w, value: kit.parseNumber(w.text, w.locale).value });
}

/** One ledger entry for a reading taken; quiet, the reader's notebook is not opened. */
const keep = (host, w) =>
  host
    .capture(
      (notebook, provenance) => notebook.fromReading({ ...w, provenance }),
      {
        quiet: true,
      }
    )
    .catch(() => {});

const refuse = (el, text) => {
  if (el) el.textContent = text;
  kit.announce(text);
};

/** The row a field reads, as it is printed, or null. */
function rowFor(host, src) {
  const { step } = host;
  try {
    const rows =
      src.probe !== undefined
        ? step.probe?.(host.probeContext())?.map(r => ({
            ...r,
            label: kit.lessonText(r.label),
            value: kit.lessonText(String(r.value)),
          }))
        : host.tool(step)?.rows;
    return rows?.find(r => r.id === (src.probe ?? src.tool)) ?? null;
  } catch (err) {
    console.warn(err);
    return null;
  }
}

/** Take a point reading into one field. */
function takeField(host, el, fid) {
  const { step, id, responses } = host;
  const f = step.fields.find(x => x.id === fid);
  const src = f?.source;
  const row = src && rowFor(host, src);
  const text = numberText(row);
  const hint = el.parentNode.querySelector('[data-src]');
  if (!text || !kit.parseNumber(text, localeOf(text)).ok)
    return refuse(hint, t('inv.take.none', { what: plain(f?.label) }));
  const key = `${id}:${fid}`;
  const before = parsed(responses[key + SRC]);
  if (
    responses[key] === text &&
    before?.k === 'c' &&
    before.r === (src.probe ?? src.tool)
  )
    return refuse(hint, t('inv.import.duplicate'));
  const ctx = host.probeContext();
  const tool = src.tool !== undefined ? host.tool(step) : null;
  commit(
    host,
    [
      {
        fid,
        text,
        locale: localeOf(text),
        label: plain(f.label),
        unit: f.unit || '',
        src: {
          k: 'c',
          r: src.probe ?? src.tool,
          x: text,
          l: plain(row.label),
          b: ctx.selected?.name,
          t: ctx.clock?.(),
          s: tool?.values,
        },
      },
    ],
    said(f, text),
    `[data-take="${fid}"]`
  );
}

/** The bounds chosen for each interval, kept across the panel's redraws. */
const bounds = new Map();

/** A bound as printed: six figures, no trailing zeros. */
const edge = x =>
  String(roundSig(x, 6)).replace('.', kit.decimalSeparatorFor(getLocale()));

/** The statistics of an interval as the step prints and takes them. */
const printed = s => {
  const d = places(s.se);
  return {
    mean: fixed(s.mean, d, getLocale()),
    n: String(s.n),
    se: fixed(s.se, d, getLocale()),
  };
};

/** Wire the reading buttons and interval groups of the open step. */
function mount(host) {
  const { body, step } = host;
  body
    .querySelectorAll('[data-take]')
    .forEach(btn =>
      btn.addEventListener('click', () =>
        takeField(host, btn, btn.dataset.take)
      )
    );
  body.querySelectorAll('[data-span]').forEach(g => {
    const sid = g.dataset.span;
    const at = `${host.id}|${sid}`;
    if (!bounds.has(at)) bounds.set(at, {});
    const b = bounds.get(at);
    const [from, to] = g.querySelectorAll('[data-bound]');
    const [out, hint, nudge] = ['result', 'hint', 'step'].map(n =>
      g.querySelector(`[data-span-${n}]`)
    );
    const fields = step.fields.filter(f => f.source?.span === sid);
    const read = () => {
      try {
        return step.series?.[sid]?.(host.probeContext()) ?? null;
      } catch (err) {
        console.warn(err);
        return null;
      }
    };
    /** The statistics of what is chosen: null when a bound is missing. */
    const chosen = d =>
      d?.x?.length && Number.isFinite(b.lo) && Number.isFinite(b.hi)
        ? spanStats(d.x, d.y, b.lo, b.hi)
        : null;
    const paint = () => {
      const d = read();
      if (!d?.x?.length) return void (out.textContent = '');
      const size = Math.max(...d.x) - Math.min(...d.x);
      from.step = to.step = d.step ?? roundSig(size / 200, 1);
      nudge.textContent = t('inv.span.step', {
        step: `${from.step}${d.unit ? ` ${d.unit}` : ''}`,
      });
      const s = chosen(d);
      out.textContent = !s
        ? t('inv.span.pick')
        : !s.ok
          ? t('inv.span.few')
          : [
              t('inv.span.result', {
                ...printed(s),
                lo: edge(s.lo),
                hi: edge(s.hi),
              }),
              s.clipped && t('inv.span.clip'),
              t('inv.span.note'),
            ]
              .filter(Boolean)
              .join(' ');
    };
    from.value = Number.isFinite(b.lo) ? b.lo : '';
    to.value = Number.isFinite(b.hi) ? b.hi : '';
    from.addEventListener(
      'input',
      () => ((b.lo = from.valueAsNumber), paint())
    );
    to.addEventListener('input', () => ((b.hi = to.valueAsNumber), paint()));
    g.querySelector('[data-take-span]').addEventListener('click', () => {
      const s = chosen(read());
      if (!s?.ok) return refuse(hint, t(s ? 'inv.span.few' : 'inv.span.pick'));
      const text = printed(s);
      commit(
        host,
        fields.map(f => ({
          fid: f.id,
          text: text[f.source.stat],
          locale: getLocale(),
          label: plain(f.label),
          unit: f.unit || '',
          src: {
            k: 's',
            r: sid,
            x: text[f.source.stat],
            a: s.lo,
            b: s.hi,
            n: s.n,
          },
          uncertainty:
            f.source.stat === 'mean'
              ? Math.round(s.se * 10 ** places(s.se)) / 10 ** places(s.se)
              : undefined,
        })),
        t('inv.span.done', { what: plain(fields[0]?.label), ...text }),
        `[data-span="${sid}"] [data-take-span]`
      );
    });
    paint();
  });
}

/**
 * What a reading button does: nothing asked for (`req` absent) copies the
 * selected object's measurements into the next empty row; `req.mount` wires the
 * open step's buttons and interval groups.
 */
export function take(host, req) {
  if (req?.mount) return mount(host);
  return importSelection(host);
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
function importSelection(host) {
  const { step, id, responses } = host;
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
  if (!values) return refuse(hint, t('inv.import.needObject'));

  const groups = step.importGroups || [];
  const held = (g, i) => String(responses[`${id}:${g[i]}`] ?? '').trim();

  // Refuse a row already recorded: two clicks would stamp one event twice.
  if (groups.some(g => g.every((_, i) => held(g, i) === String(values[i]))))
    return refuse(hint, t('inv.import.duplicate'));

  // Find the first row whose fields are all still empty.
  const target = groups.find(g => g.every((_, i) => held(g, i) === ''));
  if (!target) return refuse(hint, t('inv.import.full'));

  // The lesson writes these the JavaScript way, so they are English.
  const writes = target.flatMap((fid, i) => {
    if (values[i] === undefined) return [];
    const f = step.fields.find(x => x.id === fid);
    return [
      {
        fid,
        text: String(values[i]),
        locale: 'en',
        label: plain(f?.label ?? fid),
        unit: f?.unit || '',
        src: {
          k: 'c',
          r: 'selection',
          x: String(values[i]),
          b: ctx.selected?.name,
          t: ctx.clock?.(),
        },
      },
    ];
  });
  commit(
    host,
    writes,
    t('inv.import.added', { value: values[0] }),
    '[data-import]'
  );
  const hint2 = host.body.querySelector('[data-import-hint]');
  if (hint2) hint2.textContent = t('inv.import.added', { value: values[0] });
}
