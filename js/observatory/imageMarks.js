// =============================================================================
// The image marks instrument (Prompt 179)
// -----------------------------------------------------------------------------
// A picture, its marks and a table that says the same in words, ported from the
// gate's prototype (IMAGE_MEASUREMENT_GATE.md, D-R10-48) on js/measure/. The
// picture is a canvas at js/dataKinds/limits.js displayPlan; marks are drawn on a
// second canvas above it, in full-resolution coordinates. Every mark is a table
// row with typeable coordinates, so nothing in the picture is picture-only.
//   keyboard  arrows nudge (Alt a quarter pixel, one, Shift four: INTERACTION.md),
//             PageUp and PageDown fifty, Enter places at the aim, Escape cancels,
//             Delete, Ctrl or Cmd+Z undoes; everything else is a button
//   pointer   a click places; a tap sets a draft (with a loupe), the pad moves
//             it, Place confirms: no drag, no second finger (DESIGN_SYSTEM.md)
//   announce  one polite message per commit; a run of nudges is one commit,
//             said when the pressing stops
// Loaded when the panel is first opened, with the image kind: nothing here is on
// the Observatory's route. It imports nothing that pulls the interface catalogs
// (js/interaction.js and js/notify.js do, 81 KiB), so the settle rule and nudge
// sizes are written out below, held to the registry by a test. One panel serves
// the page's life and shows whichever image is open (`update`).
// =============================================================================

import { columnOf } from './schema.js';
import { displayPlan, downsampleMean } from '../dataKinds/limits.js';
import { permits } from '../dataKinds/contract.js';
// The photometry tool (imagePhotometry.js) takes the contract's check from here,
// by import(), so that no chunk is shared between the two.
export { permits };
import {
  ARITY,
  copyForward,
  createStore,
  edit,
  emptyState,
  marksOf,
  missingTags,
  nudge,
  place,
  refine,
  remove,
} from '../measure/marks.js';
import { scaleOf, sizeOf, timeOf } from '../measure/scale.js';
import { marksBlock, replay, writeRecord } from '../measure/imageRecord.js';

// One language's words, fetched when it is the page's: a reader downloads one.
const WORDS = {
  en: () => import('../i18n/en.imageMarks.js').then(m => m.EN_IMAGEMARKS),
  es: () => import('../i18n/es.imageMarks.js').then(m => m.ES_IMAGEMARKS),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

/** INTERACTION.md's nudge sizes: Alt a quarter, none one, Shift four (js/shortcuts.js nudgeScale). */
export const nudgeScale = e => (e.altKey ? 0.25 : e.shiftKey ? 4 : 1);
export const SETTLE_MS = 700;
const UNITS = ['km', 'm', 'cm', 'mm', 'arcsec', 'deg', 'AU', 'ly'];
const SORTS = ['order', 'tag', 'frame'];
const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const fixed = v => (Math.round(v * 100) / 100).toString();
const sig3 = v => {
  if (!Number.isFinite(v) || v === 0) return String(v);
  const k = 10 ** (2 - Math.floor(Math.log10(Math.abs(v))));
  return String(Math.round(v * k) / k);
};

/** The frames of an image observation: its pixels as the reader sees them. */
export function framesOf(o) {
  if (o?.kind !== 'image') return null;
  const { width, height, value, sidecar } = o.image;
  const v = columnOf(o, value).values;
  return [
    {
      id: o.id,
      width,
      height,
      data: v instanceof Float64Array ? v : Float64Array.from(v),
      ...(o.image.time ? { time: o.image.time } : {}),
      ...(sidecar ? { sidecar } : {}),
    },
  ];
}

/** Gray levels from the 1st to the 99.8th percentile of a sample of the frame. */
function stretch(values) {
  const s = [];
  for (let i = 0; i < values.length; i += 17)
    if (Number.isFinite(values[i])) s.push(values[i]);
  s.sort((a, b) => a - b);
  if (!s.length) return [0, 1];
  const lo = s[Math.floor(s.length * 0.01)];
  const hi = s[Math.floor(s.length * 0.998)];
  return [lo, hi > lo ? hi : lo + 1];
}

/**
 * Mount the instrument in `root`.
 * @param {HTMLElement} root
 * @param {{t: Function, registerMessages: Function, language: Function, frames?: object[],
 *   setId?: string, saved?: object, settleMs?: number, ledger?: boolean,
 *   onChange?: Function}} ctx - `t` and `registerMessages` are the
 *   Observatory's; `saved` is a gravitas.image-marks/1 block to restore
 *   once the frames are known; `ledger: false` turns the ledger off
 */
export function mountMarks(root, ctx) {
  const { t } = ctx;
  const settleMs = ctx.settleMs ?? SETTLE_MS;
  const live = el('div', {
    role: 'status',
    className: 'visually-hidden',
    id: 'obsMarksLive',
  });
  let timer = 0;
  const say = (m, later) => {
    clearTimeout(timer);
    const show = () => live.replaceChildren(el('p', { textContent: m }));
    if (later) timer = setTimeout(show, settleMs);
    else show();
  };

  let store = createStore(emptyState());
  let frames = [];
  let setId = '';
  let plan = { factor: 1, width: 1, height: 1 };
  let k = 1;
  let blocked = null;
  let saved = ctx.saved ?? null;
  const ui = {
    tool: 'point',
    pending: [],
    aim: { x: 1, y: 1 },
    sel: null,
    frame: 0,
    draft: false,
    step: 'normal',
    sort: 'order',
  };
  const fr = () => frames[ui.frame];
  const byId = id => store.state.marks.find(m => m.id === id);
  const here = () => marksOf(store.state, ui.frame);
  const side = () => (frames[0]?.sidecar?.wcs ? frames[0].sidecar : undefined);
  const scale = () =>
    scaleOf(store.state, {
      sidecar: side(),
      pixelScale: ctx.pixelScale,
    });

  // ---- the page ---------------------------------------------------------------
  const labelled = [];
  const word = (node, id, prop = 'textContent') => {
    labelled.push([node, id, prop]);
    node[prop] = t(id);
    return node;
  };
  const button = (id, onclick, name) => {
    const b = word(
      el('button', { type: 'button', className: 'ui-button is-small' }),
      id
    );
    b.onclick = onclick;
    if (name) b.dataset.act = name;
    return b;
  };
  const tools = word(
    el('div', { role: 'toolbar', className: 'im-tools' }),
    'obs.im.tools',
    'ariaLabel'
  );
  const toolButtons = Object.keys(ARITY).map(kind => {
    const b = word(
      el('button', {
        type: 'button',
        className: 'ui-button is-small',
        ariaPressed: String(kind === ui.tool),
      }),
      `obs.im.tool.${kind}`
    );
    b.dataset.tool = kind;
    b.onclick = () => {
      ui.tool = kind;
      ui.pending = [];
      toolButtons.forEach(x =>
        x.setAttribute('aria-pressed', String(x.dataset.tool === kind))
      );
      drawOverlay();
    };
    return b;
  });
  const known = el('input', {
    type: 'number',
    step: 'any',
    min: 0,
    className: 'ui-input',
  });
  const unit = el(
    'select',
    { className: 'ui-select' },
    ...UNITS.map(u => el('option', { value: u, textContent: u }))
  );
  const tagInput = el('input', {
    className: 'ui-input',
    size: 8,
    maxLength: 40,
  });
  const stepSelect = el(
    'select',
    { className: 'ui-select' },
    ...['fine', 'normal', 'coarse'].map(s => el('option', { value: s }))
  );
  const sortSelect = el(
    'select',
    { className: 'ui-select' },
    ...SORTS.map(s => el('option', { value: s }))
  );
  const labelOf = (id, control) =>
    el('label', { className: 'im-field' }, word(el('span'), id), control);
  const stage = el('div', { className: 'im-stage' });
  const img = el('canvas', { className: 'im-img' });
  const over = word(
    el('canvas', { className: 'im-over', tabIndex: 0, role: 'application' }),
    'obs.im.picture',
    'ariaLabel'
  );
  over.setAttribute('aria-describedby', 'obsMarksHelp');
  const loupe = el('canvas', {
    className: 'im-loupe',
    width: 96,
    height: 96,
    hidden: true,
  });
  stage.append(img, over, loupe);
  const help = word(
    el('p', { id: 'obsMarksHelp', className: 'ui-hint' }),
    'obs.im.help'
  );
  const pad = word(
    el('div', { role: 'group', className: 'im-pad' }),
    'obs.im.nudge',
    'ariaLabel'
  );
  const scaleOut = el('output', { className: 'im-scale' });
  const status = el('p', { className: 'ui-hint im-status' });
  const refusal = el('p', { className: 'ui-status is-error', hidden: true });
  const table = el('table', { className: 'im-table' });
  const caption = word(el('caption'), 'obs.im.table');
  const head = el('tr');
  const cols = [
    'mark',
    'kind',
    'tag',
    'frame',
    'x',
    'y',
    'size',
    'phys',
    'sigma',
  ];
  const thead = el('thead', {}, head);
  const tbody = el('tbody');
  table.append(caption, thead, tbody);
  const ledgerRow = el('div', { className: 'im-tools' });
  for (const [key, [dx, dy]] of Object.entries(ARROWS)) {
    const name = key.slice(5).toLowerCase();
    pad.append(
      button(
        `obs.im.${name}`,
        () => {
          const s = nudgeScale({
            altKey: ui.step === 'fine',
            shiftKey: ui.step === 'coarse',
          });
          move(dx * s, dy * s);
        },
        name
      )
    );
  }
  pad.append(
    labelOf('obs.im.step', stepSelect),
    button('obs.im.handleBack', () => cycle(-1), 'handleBack'),
    button('obs.im.handle', () => cycle(1), 'handle'),
    button('obs.im.place', () => confirm(), 'place'),
    button('obs.im.cancel', () => cancel(), 'cancel'),
    labelOf('obs.im.tag', tagInput)
  );
  const navButtons = [
    button('obs.im.prev', () => goto(ui.frame - 1), 'prev'),
    button('obs.im.next', () => goto(ui.frame + 1), 'next'),
    button('obs.im.copy', () => doCopy(), 'copy'),
  ];
  tools.append(
    ...toolButtons,
    button('obs.im.finish', () => finishPolygon(), 'finish'),
    button('obs.im.refine', () => doRefine(), 'refine'),
    button('obs.im.delete', () => doDelete(), 'delete'),
    button('obs.im.undo', () => doUndo(), 'undo'),
    button('obs.im.redo', () => doRedo(), 'redo'),
    ...navButtons
  );
  ledgerRow.append(
    button('obs.im.keep', () => keep(), 'keep'),
    button('obs.im.reopen', () => reopenFromLedger(), 'reopen')
  );
  const setup = el(
    'div',
    { className: 'im-tools' },
    labelOf('obs.im.length', known),
    labelOf('obs.im.unit', unit),
    labelOf('obs.im.sort', sortSelect)
  );
  const label = () => {
    for (const [n, id, prop] of labelled) n[prop] = t(id);
    for (const o of stepSelect.options) o.textContent = t(`obs.im.${o.value}`);
    for (const o of sortSelect.options)
      o.textContent = t(`obs.im.sort.${o.value}`);
    head.replaceChildren(
      ...cols.map(c =>
        el('th', {
          scope: 'col',
          textContent: t(c === 'phys' ? 'obs.im.col.size' : `obs.im.col.${c}`),
        })
      )
    );
    rows.clear();
    tbody.replaceChildren();
  };
  root.replaceChildren(
    live,
    tools,
    setup,
    stage,
    help,
    pad,
    scaleOut,
    status,
    refusal,
    ledgerRow,
    el('div', { className: 'im-tablewrap' }, table)
  );

  // ---- the picture ----------------------------------------------------------------
  function drawFrame() {
    const f = fr();
    plan = displayPlan(f.width, f.height);
    k = plan.factor;
    const values =
      k > 1 ? downsampleMean(f.data, f.width, f.height, k).values : f.data;
    const [lo, hi] = stretch(values);
    for (const c of [img, over]) {
      c.width = plan.width;
      c.height = plan.height;
    }
    const ctx2 = img.getContext('2d');
    const out = ctx2.createImageData(plan.width, plan.height);
    const gain = 255 / (hi - lo);
    const W = plan.width;
    const H = plan.height;
    for (let y = 0; y < H; y++) {
      const row = (H - 1 - y) * W; // row 1 is at the bottom
      for (let x = 0; x < W; x++) {
        const v = (values[row + x] - lo) * gain;
        const g = v < 0 ? 0 : v > 255 ? 255 : v;
        const o = 4 * (y * W + x);
        out.data[o] = out.data[o + 1] = out.data[o + 2] = g;
        out.data[o + 3] = 255;
      }
    }
    ctx2.putImageData(out, 0, 0);
  }
  const px = (x, y) => [(x - 0.5) / k, plan.height - (y - 0.5) / k];
  function cross(c, x, y, r, color) {
    const [a, b] = px(x, y);
    c.strokeStyle = color;
    c.beginPath();
    c.moveTo(a - r, b);
    c.lineTo(a + r, b);
    c.moveTo(a, b - r);
    c.lineTo(a, b + r);
    c.stroke();
  }
  function drawOverlay() {
    const c = over.getContext('2d');
    if (!c || !frames.length) return;
    c.clearRect(0, 0, over.width, over.height);
    c.lineWidth = Math.max(2, plan.width / 400);
    for (const m of here()) {
      const sel = ui.sel?.id === m.id;
      const color = sel ? '#ffd400' : m.refined ? '#4cf0a0' : '#ff6a3d';
      c.strokeStyle = color;
      const P = m.pts.map(p => px(p[0], p[1]));
      if (m.kind === 'circle') {
        c.beginPath();
        c.arc(
          P[0][0],
          P[0][1],
          Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]),
          0,
          2 * Math.PI
        );
        c.stroke();
      } else if (P.length > 1) {
        c.beginPath();
        P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        if (m.kind === 'polygon') c.closePath();
        c.stroke();
      }
      P.forEach((p, i) =>
        cross(
          c,
          m.pts[i][0],
          m.pts[i][1],
          sel && ui.sel.handle === i ? 14 : 8,
          color
        )
      );
    }
    ui.pending.forEach(p => cross(c, p[0], p[1], 8, '#5ac8ff'));
    if (ui.draft || document.activeElement === over)
      cross(c, ui.aim.x, ui.aim.y, 16, '#ffffff');
  }

  // ---- the table ------------------------------------------------------------------
  const cells = m => {
    const s = sizeOf(m, scale());
    const h = ui.sel?.id === m.id ? ui.sel.handle : 0;
    return {
      size: s ? `${fixed(s.px)}${s.kind === 'area' ? ' px²' : ''}` : '',
      phys: s?.phys !== undefined ? `${sig3(s.phys)} ${s.unit}` : '',
      sigma: fixed(m.sigmaR ?? m.sigma),
      x: fixed(m.pts[h][0]),
      y: fixed(m.pts[h][1]),
    };
  };
  function rowFor(m) {
    const tr = el('tr');
    tr.dataset.id = m.id;
    const c = cells(m);
    const num = (axis, v) => {
      const i = el('input', {
        type: 'number',
        step: 'any',
        className: 'ui-input',
        value: v,
        ariaLabel: `${m.id} ${axis}`,
      });
      i.dataset.axis = axis;
      return i;
    };
    const idb = el('button', {
      type: 'button',
      className: 'ui-button is-small',
      textContent: m.id,
    });
    idb.dataset.act = 'select';
    const tag = el('input', {
      className: 'ui-input',
      value: m.tag,
      size: 6,
      maxLength: 40,
      ariaLabel: `${m.id} ${t('obs.im.col.tag')}`,
    });
    tag.dataset.axis = 'tag';
    tr.append(
      el('th', { scope: 'row' }, idb),
      el('td', { textContent: t(`obs.im.tool.${m.kind}`) }),
      el('td', {}, tag),
      el('td', { textContent: String(m.frame + 1) }),
      el('td', {}, num('x', c.x)),
      el('td', {}, num('y', c.y)),
      el('td', { textContent: c.size }),
      el('td', { textContent: c.phys }),
      el('td', { textContent: c.sigma })
    );
    if (ui.sel?.id === m.id) tr.setAttribute('aria-selected', 'true');
    return tr;
  }
  /** Rows kept between renders: a mark that did not change keeps its row. */
  const rows = new Map();
  const ordered = () => {
    const list = [...store.state.marks];
    if (ui.sort === 'tag')
      list.sort(
        (a, b) =>
          (a.tag || '￿').localeCompare(b.tag || '￿') || a.frame - b.frame
      );
    else if (ui.sort === 'frame') list.sort((a, b) => a.frame - b.frame);
    return list;
  };
  const frameLine = () => {
    const miss = missingTags(store.state, ui.frame).join(', ');
    const time = timeOf(fr().time)?.label ?? t('obs.im.noTime');
    const v = {
      k: ui.frame + 1,
      n: frames.length,
      m: here().length,
      time,
      missing: miss,
    };
    return t('obs.im.frame', v) + (miss ? t('obs.im.missing', v) : '');
  };
  function renderTable() {
    const list = ordered();
    const want = new Set(list.map(m => m.id));
    for (const [id, r] of rows)
      if (!want.has(id)) {
        r.tr.remove();
        rows.delete(id);
      }
    const sc = scale();
    let prev = null;
    for (const m of list) {
      const sel = ui.sel?.id === m.id ? ui.sel.handle : -1;
      let r = rows.get(m.id);
      if (!r || r.mark !== m || r.sel !== sel || r.sc !== sc?.value) {
        const tr = rowFor(m);
        if (r?.tr.isConnected) r.tr.replaceWith(tr);
        r = { mark: m, sel, sc: sc?.value, tr };
        rows.set(m.id, r);
      }
      const at = prev ? prev.nextSibling : tbody.firstChild;
      if (r.tr !== at) tbody.insertBefore(r.tr, at);
      prev = r.tr;
    }
    const unitName = sc && !sc.refused ? sc.unit.replace('/pix', '') : '';
    head.cells[7].textContent = t('obs.im.col.phys', { unit: unitName || '-' });
    scaleOut.textContent = sc?.refused
      ? t('obs.im.scaleNotAllowed', { why: whyOf(sc.code) })
      : sc
        ? t('obs.im.scaleLine', {
            label: t('obs.im.scale'),
            value: sig3(sc.value),
            unit: sc.unit,
            sigma: sig3(sc.sigma),
          })
        : `${t('obs.im.scale')}: ${t('obs.im.none')}`;
    status.textContent = frameLine();
    const only = frames.length > 1;
    for (const b of navButtons) b.hidden = !only;
  }
  /** One row's cells, when only a coordinate changed. */
  function updateRow(id) {
    const m = byId(id);
    const tr = tbody.querySelector(`tr[data-id="${id}"]`);
    if (!m || !tr) return renderTable();
    const c = cells(m);
    const [ix, iy] = tr.querySelectorAll('input[type=number]');
    const kept = rows.get(id);
    if (kept) kept.mark = m;
    ix.value = c.x;
    iy.value = c.y;
    tr.cells[6].textContent = c.size;
    tr.cells[7].textContent = c.phys;
    tr.cells[8].textContent = c.sigma;
    status.textContent = frameLine();
  }

  // ---- operations ------------------------------------------------------------------
  const changed = () => ctx.onChange?.(store.state);
  function select(id, handle = 0, focus = false) {
    ui.sel = id ? { id, handle } : null;
    const m = id && byId(id);
    if (m) {
      if (m.frame !== ui.frame) {
        ui.frame = m.frame;
        drawFrame();
      }
      ui.aim = { x: m.pts[handle][0], y: m.pts[handle][1] };
    }
    tagInput.value = m?.tag ?? '';
    renderTable();
    drawOverlay();
    if (focus && m) {
      over.focus();
      say(t('obs.im.selected', { id, h: handle + 1 }));
    }
  }
  function commitPlace(pts) {
    const kind = ui.tool;
    const value = known.valueAsNumber;
    const length =
      kind === 'reference-pair' && value > 0
        ? { value, unit: unit.value, sigma: 0 }
        : undefined;
    const next = place(store.state, {
      kind,
      frame: ui.frame,
      tag: '',
      pts,
      length,
    });
    store.apply(next);
    store.seal();
    ui.pending = [];
    ui.draft = false;
    const mark = next.marks[next.marks.length - 1];
    ui.sel = null;
    renderTable();
    drawOverlay();
    changed();
    const last = pts[pts.length - 1];
    say(
      t('obs.im.placed', {
        kind: t(`obs.im.tool.${kind}`),
        id: mark.id,
        x: fixed(last[0]),
        y: fixed(last[1]),
      })
    );
  }
  /** The aim becomes a control point: the mark is made when it has all of them. */
  function confirm() {
    if (blocked || !frames.length) return;
    const p = [ui.aim.x, ui.aim.y];
    const need = ARITY[ui.tool];
    const poly = ui.tool === 'polygon';
    if (!poly && ui.pending.length + 1 >= need)
      return commitPlace([...ui.pending, p]);
    ui.pending.push(p);
    ui.draft = false;
    drawOverlay();
    say(t('obs.im.pending', { n: ui.pending.length, m: poly ? '3+' : need }));
  }
  function finishPolygon() {
    if (ui.tool === 'polygon' && ui.pending.length >= 3)
      commitPlace(ui.pending);
  }
  function cancel() {
    ui.pending = [];
    ui.draft = false;
    ui.sel = null;
    renderTable();
    drawOverlay();
    say(t('obs.im.cancelled'));
  }
  let sealTimer = 0;
  function move(dx, dy) {
    if (!frames.length) return;
    if (ui.sel && !ui.draft) {
      const { id, handle } = ui.sel;
      store.apply(
        nudge(store.state, id, handle, dx, dy),
        `nudge:${id}:${handle}`
      );
      const p = byId(id).pts[handle];
      ui.aim = { x: p[0], y: p[1] };
      updateRow(id);
      drawOverlay();
      say(t('obs.im.moved', { id, x: fixed(p[0]), y: fixed(p[1]) }), 1);
      clearTimeout(sealTimer);
      sealTimer = setTimeout(() => {
        store.seal();
        changed();
      }, settleMs);
    } else {
      ui.aim = {
        x: Math.min(fr().width, Math.max(1, ui.aim.x + dx)),
        y: Math.min(fr().height, Math.max(1, ui.aim.y + dy)),
      };
      drawOverlay();
      say(t('obs.im.draft', { x: fixed(ui.aim.x), y: fixed(ui.aim.y) }), 1);
    }
  }
  function cycle(d) {
    if (!ui.sel) return;
    const n = byId(ui.sel.id).pts.length;
    select(ui.sel.id, (ui.sel.handle + d + n) % n);
    say(t('obs.im.selected', { id: ui.sel.id, h: ui.sel.handle + 1 }));
  }
  function doRefine() {
    if (!ui.sel) return;
    const id = ui.sel.id;
    const { state, result } = refine(store.state, id, frames);
    if (!result.ok)
      return say(
        t('obs.im.refused', { id, why: t(`obs.im.reason.${result.reason}`) })
      );
    store.apply(state);
    store.seal();
    const m = byId(id);
    updateRow(id);
    drawOverlay();
    changed();
    say(
      t('obs.im.refined', {
        id,
        x: fixed(m.pts[0][0]),
        y: fixed(m.pts[0][1]),
        s: fixed(m.sigmaR ?? m.sigma),
      })
    );
  }
  function doDelete() {
    if (!ui.sel) return;
    const id = ui.sel.id;
    store.apply(remove(store.state, id));
    store.seal();
    ui.sel = null;
    renderTable();
    drawOverlay();
    over.focus();
    changed();
    say(t('obs.im.deleted', { id }));
  }
  function after(message) {
    if (ui.sel && !byId(ui.sel.id)) ui.sel = null;
    renderTable();
    drawOverlay();
    changed();
    say(message);
  }
  function doUndo() {
    clearTimeout(timer);
    store.seal();
    if (store.undo()) after(t('obs.im.undone', { n: here().length }));
  }
  function doRedo() {
    clearTimeout(timer);
    if (store.redo()) after(t('obs.im.redone', { n: here().length }));
  }
  function goto(n) {
    if (n < 0 || n >= frames.length) return;
    ui.frame = n;
    ui.sel = null;
    ui.pending = [];
    drawFrame();
    renderTable();
    drawOverlay();
    say(frameLine());
  }
  function doCopy() {
    if (!ui.sel || ui.frame + 1 >= frames.length) return;
    store.apply(copyForward(store.state, ui.sel.id, ui.frame + 1));
    store.seal();
    renderTable();
    changed();
    say(t('obs.im.copied', { id: ui.sel.id, k: ui.frame + 2 }));
  }

  // ---- the ledger and the workspace ---------------------------------------------
  const whyOf = code =>
    t(code === 'display-only' ? 'obs.im.why.display-only' : 'obs.im.why.other');
  /** A quantity of the record, in the reader's words (made at capture, as the ledger's are). */
  const markLabel = q => {
    const m = /^(m\d+)\.([xyr]|area)(\d*)$/.exec(q.id);
    const f = /^frame(\d+)\.time$/.exec(q.id);
    if (f) return t('obs.im.q.time', { frame: f[1] });
    if (!m) return t(`obs.im.q.${q.id.slice(q.id.indexOf('.') + 1)}`);
    const mk = store.state.marks.find(x => x.id === m[1]);
    return `${t(`obs.im.tool.${mk.kind}`)} ${m[1]}${mk.tag ? ` (${mk.tag})` : ''}: ${t(`obs.im.q.${m[2]}`)}${m[3]}, ${t('obs.im.col.frame')} ${mk.frame + 1}`;
  };
  async function currentRecord() {
    return writeRecord({
      id: `marks-${setId}`.slice(0, 120),
      setId,
      frames,
      sidecar: side(),
      state: store.state,
    });
  }
  /** The marks as one record in the notebook's ledger; resolves with the envelope. */
  async function keep() {
    if (!store.state.marks.length) return null;
    try {
      const record = await currentRecord();
      if (ctx.ledger !== false) {
        const [{ artifactEntry }, { SOURCE }, nb] = await Promise.all([
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
        const entry = artifactEntry({
          source: SOURCE.IMAGE_MARKS,
          envelope: record,
          title: t('obs.im.ledgerEntry', { title: setId }),
          labels: {
            quantity: markLabel,
          },
          context: { page: 'observatory', observation: { id: setId } },
        });
        const loaded = nb.load();
        if (!loaded.ok) throw new Error(loaded.reason);
        const saved2 = nb.save([...loaded.entries, entry]);
        if (!saved2.ok) throw new Error(saved2.reason);
      }
      say(t('obs.im.kept', { n: record.quantities.length }));
      return record;
    } catch (err) {
      say(t('obs.im.keepFailed', { why: err.message }));
      return null;
    }
  }
  /** Reopen a record on its image: the marks come back, or the replay refuses. */
  async function reopen(record) {
    try {
      const r = await replay(record, frames);
      store.apply(r.state);
      store.seal();
      ui.sel = null;
      ui.frame = 0;
      drawFrame();
      renderTable();
      drawOverlay();
      changed();
      say(
        r.agrees
          ? t('obs.im.reopened', { n: r.state.marks.length })
          : t('obs.im.reopenDiffers', {
              n: r.state.marks.length,
              m: r.differ.length,
            })
      );
      return r;
    } catch (err) {
      say(t(`obs.im.replay.${err.code ?? 'invalid'}`));
      return null;
    }
  }
  /** The latest record in the ledger made on this image; the replay refuses one made on other pixels. */
  async function reopenFromLedger() {
    const loaded = (await import('../notebook/store.js')).load();
    const mine = (loaded.entries ?? []).filter(
      e => e.source === 'image-marks' && e.snapshot.artifact.source.id === setId
    );
    return mine.length
      ? reopen(mine.at(-1).snapshot.artifact)
      : say(t('obs.im.noRecords'));
  }
  /** Restore a workspace's marks (a gravitas.image-marks/1 block), or say why not. */
  async function restore(block) {
    saved = block;
    if (!block || !frames.length) return null;
    saved = null;
    return reopen(block);
  }
  /** The workspace's marks block, or null when there are no marks. */
  async function block() {
    if (!store.state.marks.length) return saved;
    return marksBlock({ frames, state: store.state });
  }

  // ---- input ----------------------------------------------------------------------
  const toImage = e => {
    const r = over.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * plan.width * k + 0.5,
      y: fr().height + 0.5 - ((e.clientY - r.top) / r.height) * plan.height * k,
    };
  };
  const showLoupe = e => {
    const r = stage.getBoundingClientRect();
    const lc = loupe.getContext('2d');
    const oc = over.getBoundingClientRect();
    const sx = ((e.clientX - oc.left) / oc.width) * plan.width;
    const sy = ((e.clientY - oc.top) / oc.height) * plan.height;
    lc.clearRect(0, 0, 96, 96);
    lc.imageSmoothingEnabled = false;
    lc.drawImage(img, sx - 16, sy - 16, 32, 32, 0, 0, 96, 96);
    lc.strokeStyle = '#fff';
    lc.strokeRect(46, 46, 4, 4);
    loupe.hidden = false;
    const y = e.clientY - r.top;
    const top = y < 168 ? y + 72 : y - 168;
    loupe.style.left = `${Math.min(r.width - 96, Math.max(0, e.clientX - r.left - 48))}px`;
    loupe.style.top = `${top}px`;
  };
  over.addEventListener('pointerdown', e => {
    if (!frames.length) return;
    over.focus();
    ui.aim = toImage(e);
    if (e.pointerType === 'touch') showLoupe(e);
  });
  over.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && e.buttons) {
      ui.aim = toImage(e);
      showLoupe(e);
    }
  });
  over.addEventListener('pointerup', e => {
    loupe.hidden = true;
    if (!frames.length) return;
    ui.aim = toImage(e);
    ui.sel = null;
    if (e.pointerType === 'touch') {
      ui.draft = true;
      drawOverlay();
      say(t('obs.im.draft', { x: fixed(ui.aim.x), y: fixed(ui.aim.y) }));
    } else confirm();
  });
  over.addEventListener('focus', drawOverlay);
  over.addEventListener('blur', drawOverlay);
  over.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      return e.shiftKey ? doRedo() : doUndo();
    }
    const dir = ARROWS[e.key];
    if (dir) {
      e.preventDefault();
      const s = nudgeScale(e);
      return move(dir[0] * s, dir[1] * s);
    }
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      return move(0, e.key === 'PageUp' ? 50 : -50);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      return confirm();
    }
    if (e.key === 'Escape') return cancel();
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return doDelete();
    }
  });
  stepSelect.onchange = () => (ui.step = stepSelect.value);
  sortSelect.onchange = () => {
    ui.sort = sortSelect.value;
    renderTable();
  };
  known.onchange = () => {
    // A length typed after the pair was placed belongs to the selected pair.
    const m = ui.sel && byId(ui.sel.id);
    if (m?.kind !== 'reference-pair' || !(known.valueAsNumber > 0)) return;
    store.apply(
      edit(store.state, m.id, {
        length: { value: known.valueAsNumber, unit: unit.value, sigma: 0 },
      })
    );
    store.seal();
    renderTable();
    changed();
    say(t('obs.im.edited', { id: m.id, what: t('obs.im.length') }));
  };
  tagInput.onchange = () => {
    if (!ui.sel) return;
    store.apply(edit(store.state, ui.sel.id, { tag: tagInput.value }));
    store.seal();
    renderTable();
    changed();
    say(t('obs.im.edited', { id: ui.sel.id, what: t('obs.im.tag') }));
  };
  // The table's cells, delegated: a rebuilt row holds no listener of its own.
  tbody.addEventListener('click', e => {
    const b = e.target.closest('button[data-act=select]');
    if (b) select(b.closest('tr').dataset.id, 0, true);
  });
  tbody.addEventListener('change', e => {
    const i = e.target.closest('input[data-axis]');
    if (!i) return;
    const id = i.closest('tr').dataset.id;
    const axis = i.dataset.axis;
    if (axis === 'tag') {
      store.apply(edit(store.state, id, { tag: i.value }));
      if (ui.sel?.id === id) tagInput.value = i.value;
    } else {
      const v = i.valueAsNumber;
      if (!Number.isFinite(v)) return;
      const handle = ui.sel?.id === id ? ui.sel.handle : 0;
      store.apply(edit(store.state, id, { handle, [axis]: v }));
    }
    store.seal();
    updateRow(id);
    drawOverlay();
    changed();
    say(
      t('obs.im.edited', { id, what: axis === 'tag' ? t('obs.im.tag') : axis })
    );
  });

  // ---- showing an image ---------------------------------------------------------
  /** Show a set of frames; the marks stay if it is the image they were made on. */
  function load(next, id) {
    const same = id === setId && next.length === frames.length;
    setId = id;
    frames = next;
    blocked = null;
    const ok = frames[0]?.sidecar
      ? permits(frames[0].sidecar, 'marking')
      : { ok: true };
    refusal.hidden = ok.ok;
    if (!ok.ok) {
      blocked = ok;
      refusal.textContent = t('obs.im.noMarking', { why: whyOf(ok.code) });
    }
    if (!same) {
      store = createStore(emptyState());
      ui.sel = null;
      ui.frame = 0;
      ui.pending = [];
      ui.draft = false;
    }
    ui.frame = Math.min(ui.frame, Math.max(0, frames.length - 1));
    if (!frames.length) return;
    ui.aim = { x: Math.round(fr().width / 2), y: Math.round(fr().height / 2) };
    drawFrame();
    renderTable();
    drawOverlay();
    if (!same && saved) restore(saved);
  }
  /** Show an Observatory image observation, or nothing (null). */
  function update(o) {
    const next = framesOf(o);
    if (next) load(next, o.id);
  }
  // A language chosen on the page changes the words here (the page sets <html lang>).
  const langWatch = new MutationObserver(async () => {
    await words(ctx);
    label();
    if (frames.length) renderTable();
  });
  langWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  const sum = root.parentElement?.querySelector('summary');
  if (sum) labelled.push([sum, 'obs.im.title', 'textContent']);
  label();

  return {
    get store() {
      return store;
    },
    update,
    load,
    restore,
    block,
  };
}

const panels = new WeakMap();
/**
 * The page's one call, made each time it shows an image observation: the first
 * fetches the words and builds the panel (a pending `ctx.marks.saved` block
 * restores into it), later ones show the new image. `ctx.marks` is the page's
 * hand-over: it holds `saved` until taken, and gets `block(observation)` for the
 * workspace save.
 * @param {HTMLDetailsElement} box - Its first div is the panel's body
 * @param {{observation: object, marks: object}} ctx - and what mountMarks takes
 */
export async function mount(box, ctx) {
  const { observation: o, marks } = ctx;
  const saved = marks.saved ?? null;
  delete marks.saved;
  let ready = panels.get(box);
  const fresh = !ready;
  if (fresh) {
    ready = words(ctx).then(() => {
      const p = {
        cur: o,
        api: mountMarks(box.querySelector('div'), { ...ctx, saved }),
      };
      box.addEventListener('toggle', () => box.open && p.api.update(p.cur));
      marks.block = view => (view?.id === p.cur?.id ? p.api.block() : null);
      marks.state = () => p.api.store.state;
      return p;
    });
    panels.set(box, ready);
  }
  const p = await ready;
  p.cur = o;
  if (saved) box.open = true;
  if (box.open) p.api.update(o);
  if (saved && !fresh) p.api.restore(saved);
}
