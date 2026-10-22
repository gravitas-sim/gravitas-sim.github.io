/* global document, setTimeout, clearTimeout */
// =============================================================================
// The marks instrument's panel (Prompt 178 prototype; spike code, imported by no
// page)
// -----------------------------------------------------------------------------
// A picture, its marks and a table that says the same thing in words. The
// picture is a canvas drawn at js/dataKinds/limits.js's displayPlan; the marks
// are drawn on a second canvas above it and keep full-resolution coordinates.
// The table is the semantic alternative: every mark is a row, every coordinate
// a cell a person can type in, and nothing can be done in the picture that
// cannot be done in the table and the pad beside it.
//
//   keyboard  the canvas takes the arrows (a quarter pixel with Alt, one, four
//             with Shift: the contract's nudge sizes), PageUp and PageDown
//             (fifty), Enter to place at the aim, Escape to cancel, Delete,
//             Ctrl or Cmd+Z and +Shift+Z; everything else is a button
//   pointer   a mouse click places; a tap sets a draft marker (with the loupe
//             under the finger), the pad moves it, Place confirms: no drag, no
//             second finger (DESIGN_SYSTEM.md, touch measurement)
//   announce  one message per commit through #srStatus; a run of nudges is one
//             commit, said when the pressing stops (js/interaction.js)
// =============================================================================

import { displayPlan, downsampleMean } from '../../js/dataKinds/limits.js';
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
  scaleOf,
} from './marks.js';
import { replay, writeRecord } from './record.js';

/**
 * The contract's nudge sizes (INTERACTION.md: Alt a quarter, none one, Shift four;
 * js/shortcuts.js nudgeScale), written here because the registry module is a
 * global one; tests/imageMeasureGate.test.js holds the two equal.
 */
export const nudgeScale = e => (e.altKey ? 0.25 : e.shiftKey ? 4 : 1);

/**
 * The announcement rule for a readout a nudge changes (js/interaction.js
 * settledAnnouncer, written out because that module imports the whole interface
 * catalog through js/notify.js, which the Observatory route does not load): a
 * nudge is said once the pressing stops; a commit is said now and drops a nudge
 * still waiting.
 */
function settledAnnouncer({ say, delay }) {
  let timer = null;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return {
    nudge(message) {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        say(message);
      }, delay);
    },
    commit(message) {
      cancel();
      say(message);
    },
    cancel,
  };
}

const TEXT = {
  en: {
    tools: {
      point: 'Point',
      segment: 'Segment',
      circle: 'Circle',
      polygon: 'Polygon',
      count: 'Count',
      'reference-pair': 'Reference pair',
    },
    keep: 'Keep in ledger',
    kept: n => `Kept in the ledger: ${n} quantities`,
    reopened: n => `Record reopened with ${n} marks`,
    undo: 'Undo',
    redo: 'Redo',
    refine: 'Refine',
    del: 'Delete',
    finish: 'Finish polygon',
    place: 'Place',
    cancel: 'Cancel',
    prev: 'Previous frame',
    next: 'Next frame',
    copy: 'Copy to next frame',
    handle: 'Next handle',
    handleBack: 'Previous handle',
    left: 'Left',
    right: 'Right',
    up: 'Up',
    down: 'Down',
    step: 'Step',
    fine: 'Fine (0.25 px)',
    normal: 'Normal (1 px)',
    coarse: 'Coarse (4 px)',
    tag: 'Tag',
    length: 'Known length',
    scale: 'Scale',
    none: 'not set',
    picture: 'Image',
    table: 'Marks',
    cols: [
      'Mark',
      'Kind',
      'Tag',
      'Frame',
      'x (px)',
      'y (px)',
      'Size (px)',
      'Uncertainty (px)',
    ],
    help: 'Arrow keys move the marker or the selected mark: Alt a quarter pixel, Shift four, Page keys fifty. Enter places.',
    placed: (k, id, x, y) => `${k} ${id} placed at x ${x}, y ${y}`,
    pending: (n, m) => `Point ${n} of ${m} set; place the next`,
    draft: (x, y) =>
      `Marker at x ${x}, y ${y}; move it with the pad, then Place`,
    moved: (id, x, y) => `${id} moved to x ${x}, y ${y}`,
    edited: (id, what) => `${id}: ${what}`,
    deleted: id => `${id} deleted`,
    refined: (id, x, y, s) =>
      `${id} refined to x ${x}, y ${y}, uncertainty ${s} px`,
    refused: (id, why) => `${id} not refined: ${why}`,
    undone: n => `Undone; ${n} marks in this frame`,
    redone: n => `Redone; ${n} marks in this frame`,
    frame: (k, n, m, miss) =>
      `Frame ${k} of ${n}, ${m} marks${miss ? `; not yet marked here: ${miss}` : ''}`,
    copied: (id, k) => `${id} copied to frame ${k}`,
    selected: (id, h) => `${id} selected, handle ${h}`,
    cancelled: 'Cancelled',
    reasons: {
      edge: 'too near the frame edge',
      'too-faint': 'too faint',
      'too-sharp': 'sharper than a point source',
      'not-round': 'not round (a blend?)',
      'moved-too-far': 'the nearest source is too far from the click',
      'no-edge': 'no clear edge found',
      'not-circular': 'not circular',
      'too-small': 'too small to fit',
      'not-refinable': 'this kind is not refined',
      flat: 'no noise to compare with',
      'no-flux': 'no signal',
    },
  },
  es: {
    tools: {
      point: 'Punto',
      segment: 'Segmento',
      circle: 'Círculo',
      polygon: 'Polígono',
      count: 'Conteo',
      'reference-pair': 'Par de referencia',
    },
    keep: 'Guardar en el registro',
    kept: n => `Guardado en el registro: ${n} cantidades`,
    reopened: n => `Registro reabierto con ${n} marcas`,
    undo: 'Deshacer',
    redo: 'Rehacer',
    refine: 'Refinar',
    del: 'Borrar',
    finish: 'Terminar polígono',
    place: 'Colocar',
    cancel: 'Cancelar',
    prev: 'Imagen anterior',
    next: 'Imagen siguiente',
    copy: 'Copiar a la siguiente imagen',
    handle: 'Siguiente punto de control',
    handleBack: 'Punto de control anterior',
    left: 'Izquierda',
    right: 'Derecha',
    up: 'Arriba',
    down: 'Abajo',
    step: 'Paso',
    fine: 'Fino (0,25 px)',
    normal: 'Normal (1 px)',
    coarse: 'Grueso (4 px)',
    tag: 'Etiqueta',
    length: 'Longitud conocida',
    scale: 'Escala',
    none: 'sin definir',
    picture: 'Imagen',
    table: 'Marcas',
    cols: [
      'Marca',
      'Tipo',
      'Etiqueta',
      'Imagen',
      'x (px)',
      'y (px)',
      'Tamaño (px)',
      'Incertidumbre (px)',
    ],
    help: 'Las flechas mueven el marcador o la marca seleccionada: Alt un cuarto de píxel, Mayús cuatro, Re Pág y Av Pág cincuenta. Intro coloca.',
    placed: (k, id, x, y) => `${k} ${id} colocado en x ${x}, y ${y}`,
    pending: (n, m) => `Punto ${n} de ${m} fijado; coloque el siguiente`,
    draft: (x, y) =>
      `Marcador en x ${x}, y ${y}; muévalo con el panel y pulse Colocar`,
    moved: (id, x, y) => `${id} movido a x ${x}, y ${y}`,
    edited: (id, what) => `${id}: ${what}`,
    deleted: id => `${id} borrado`,
    refined: (id, x, y, s) =>
      `${id} refinado a x ${x}, y ${y}, incertidumbre ${s} px`,
    refused: (id, why) => `${id} no refinado: ${why}`,
    undone: n => `Deshecho; ${n} marcas en esta imagen`,
    redone: n => `Rehecho; ${n} marcas en esta imagen`,
    frame: (k, n, m, miss) =>
      `Imagen ${k} de ${n}, ${m} marcas${miss ? `; sin marcar aquí: ${miss}` : ''}`,
    copied: (id, k) => `${id} copiado a la imagen ${k}`,
    selected: (id, h) => `${id} seleccionado, punto de control ${h}`,
    cancelled: 'Cancelado',
    reasons: {
      edge: 'demasiado cerca del borde',
      'too-faint': 'demasiado débil',
      'too-sharp': 'más nítido que una fuente puntual',
      'not-round': 'no es redonda (¿una mezcla?)',
      'moved-too-far': 'la fuente más cercana está lejos del clic',
      'no-edge': 'no hay un borde claro',
      'not-circular': 'no es circular',
      'too-small': 'demasiado pequeño para ajustar',
      'not-refinable': 'este tipo no se refina',
      flat: 'sin ruido con que comparar',
      'no-flux': 'sin señal',
    },
  },
};

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const fixed = v => (Math.round(v * 100) / 100).toString();

/** Gray levels from the 1st to the 99.8th percentile of a sample of the frame. */
function stretch(values) {
  const s = [];
  for (let i = 0; i < values.length; i += 17) s.push(values[i]);
  s.sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.01)];
  const hi = s[Math.floor(s.length * 0.998)];
  return [lo, hi > lo ? hi : lo + 1];
}

/**
 * Mount the instrument in `root`.
 * @param {HTMLElement} root
 * @param {{frames: object[], setId: string, announce: Function, sidecar?: object, lang?: string, settleMs?: number}} o
 *   `announce` is the page's own live-region writer, as createImageView's hooks are
 */
export function mount(
  root,
  { frames, setId, announce, sidecar = {}, lang = 'en', settleMs = 700 }
) {
  const T = TEXT[lang] ?? TEXT.en;
  const store = createStore(emptyState());
  const ui = {
    tool: 'point',
    pending: [],
    aim: { x: 0, y: 0 },
    sel: null,
    frame: 0,
    draft: false,
    step: 'normal',
    waiting: false,
  };
  let plan;
  let k = 1;
  const settled = settledAnnouncer({
    say: m => {
      ui.waiting = false;
      announce(m, true);
    },
    delay: settleMs,
  });
  /** A commit's one announcement; a nudge still waiting to be said is dropped. */
  const say = m => settled.commit(m);
  const fr = () => frames[ui.frame];
  const here = () => marksOf(store.state, ui.frame);
  const byId = id => store.state.marks.find(m => m.id === id);

  // ---- the page ---------------------------------------------------------------
  const tools = el('div', {
    role: 'toolbar',
    ariaLabel: T.picture,
    className: 'im-tools',
  });
  const toolButtons = Object.keys(ARITY).map(kind => {
    const b = el('button', {
      type: 'button',
      textContent: T.tools[kind],
      ariaPressed: String(kind === ui.tool),
    });
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
  const button = (text, onclick, name) => {
    const b = el('button', { type: 'button', textContent: text, onclick });
    if (name) b.dataset.act = name;
    return b;
  };
  const known = el('input', {
    type: 'number',
    value: sidecar.knownLength?.value ?? '',
    step: 'any',
    ariaLabel: T.length,
  });
  const tagSelect = el(
    'select',
    { ariaLabel: T.tag },
    el('option', { value: '', textContent: '-' }),
    ...'abcdefghijkl'
      .split('')
      .map(t => el('option', { value: t, textContent: t }))
  );
  const stepSelect = el(
    'select',
    { ariaLabel: T.step },
    ...['fine', 'normal', 'coarse'].map(s =>
      el('option', { value: s, textContent: T[s] })
    )
  );
  stepSelect.value = 'normal';
  stepSelect.onchange = () => (ui.step = stepSelect.value);
  const scaleOut = el('output', { className: 'im-scale' });
  const stage = el('div', { className: 'im-stage' });
  const img = el('canvas', { className: 'im-img' });
  const over = el('canvas', {
    className: 'im-over',
    tabIndex: 0,
    role: 'application',
    ariaLabel: T.picture,
  });
  over.setAttribute('aria-describedby', 'imHelp');
  const loupe = el('canvas', {
    className: 'im-loupe',
    width: 96,
    height: 96,
    hidden: true,
  });
  stage.append(img, over, loupe);
  const help = el('p', {
    id: 'imHelp',
    className: 'im-help',
    textContent: T.help,
  });
  const pad = el('div', {
    role: 'group',
    ariaLabel: 'Nudge',
    className: 'im-pad',
  });
  const dirs = [
    ['left', -1, 0],
    ['right', 1, 0],
    ['up', 0, 1],
    ['down', 0, -1],
  ];
  for (const [name, dx, dy] of dirs)
    pad.append(
      button(
        T[name],
        () =>
          move(
            dx *
              nudgeScale({
                altKey: ui.step === 'fine',
                shiftKey: ui.step === 'coarse',
              }),
            dy *
              nudgeScale({
                altKey: ui.step === 'fine',
                shiftKey: ui.step === 'coarse',
              })
          ),
        name
      )
    );
  pad.append(
    stepSelect,
    button(T.handleBack, () => cycle(-1), 'handleBack'),
    button(T.handle, () => cycle(1), 'handle'),
    button(T.place, () => confirm(), 'place'),
    button(T.cancel, () => cancel(), 'cancel'),
    el('label', {}, T.tag + ' ', tagSelect),
    el('label', {}, T.length + ' ', known)
  );
  tagSelect.onchange = () => {
    if (!ui.sel) return;
    store.apply(edit(store.state, ui.sel.id, { tag: tagSelect.value }));
    store.seal();
    say(T.edited(ui.sel.id, `${T.tag} ${tagSelect.value || T.none}`));
  };
  const table = el(
    'table',
    { className: 'im-table' },
    el('caption', { textContent: T.table })
  );
  const thead = el(
    'thead',
    {},
    el('tr', {}, ...T.cols.map(c => el('th', { scope: 'col', textContent: c })))
  );
  const tbody = el('tbody');
  table.append(thead, tbody);
  const status = el('p', { className: 'im-status' });
  tools.append(
    ...toolButtons,
    button(T.finish, () => finishPolygon(), 'finish'),
    button(T.refine, () => doRefine(), 'refine'),
    button(T.del, () => doDelete(), 'delete'),
    button(T.undo, () => doUndo(), 'undo'),
    button(T.redo, () => doRedo(), 'redo'),
    button(T.prev, () => goto(ui.frame - 1), 'prev'),
    button(T.next, () => goto(ui.frame + 1), 'next'),
    button(T.copy, () => doCopy(), 'copy'),
    button(T.keep, () => keep(), 'keep')
  );
  root.replaceChildren(
    tools,
    stage,
    help,
    pad,
    scaleOut,
    status,
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
    const ctx = img.getContext('2d');
    const out = ctx.createImageData(plan.width, plan.height);
    const scale = 255 / (hi - lo);
    const W = plan.width;
    const H = plan.height;
    for (let y = 0; y < H; y++) {
      const row = (H - 1 - y) * W; // row 1 is at the bottom
      for (let x = 0; x < W; x++) {
        const v = (values[row + x] - lo) * scale;
        const g = v < 0 ? 0 : v > 255 ? 255 : v;
        const o = 4 * (y * W + x);
        out.data[o] = out.data[o + 1] = out.data[o + 2] = g;
        out.data[o + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
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
    c.clearRect(0, 0, over.width, over.height);
    c.lineWidth = 2;
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
      } else if (
        m.kind === 'segment' ||
        m.kind === 'reference-pair' ||
        m.kind === 'polygon'
      ) {
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
  const sizeOf = m =>
    m.kind === 'circle' || m.kind === 'segment' || m.kind === 'reference-pair'
      ? fixed(Math.hypot(m.pts[1][0] - m.pts[0][0], m.pts[1][1] - m.pts[0][1]))
      : '';
  function rowFor(m) {
    const h = ui.sel?.id === m.id ? ui.sel.handle : 0;
    const tr = el('tr');
    tr.dataset.id = m.id;
    const idb = el('button', { type: 'button', textContent: m.id });
    idb.onclick = () => select(m.id, 0, true);
    const tag = el('input', {
      value: m.tag,
      ariaLabel: `${m.id} ${T.tag}`,
      size: 6,
    });
    tag.onchange = () => {
      store.apply(edit(store.state, m.id, { tag: tag.value }));
      store.seal();
      if (ui.sel?.id === m.id) tagSelect.value = tag.value;
      status.textContent = T.frame(
        ui.frame + 1,
        frames.length,
        here().length,
        missingTags(store.state, ui.frame).join(', ')
      );
      say(T.edited(m.id, `${T.tag} ${tag.value || T.none}`));
    };
    const num = axis => {
      const i = el('input', {
        type: 'number',
        step: 'any',
        value: fixed(m.pts[h][axis]),
        ariaLabel: `${m.id} ${axis ? 'y' : 'x'}`,
      });
      i.dataset.axis = axis;
      i.onchange = () => {
        const v = Number(i.value);
        if (!Number.isFinite(v)) return;
        const sh = ui.sel?.id === m.id ? ui.sel.handle : 0;
        store.apply(
          edit(store.state, m.id, { handle: sh, [axis ? 'y' : 'x']: v })
        );
        store.seal();
        updateRow(m.id);
        drawOverlay();
        say(T.edited(m.id, `${axis ? 'y' : 'x'} ${fixed(v)}`));
      };
      return i;
    };
    tr.append(
      el('th', { scope: 'row' }, idb),
      el('td', { textContent: T.tools[m.kind] }),
      el('td', {}, tag),
      el('td', { textContent: String(m.frame + 1) }),
      el('td', {}, num(0)),
      el('td', {}, num(1)),
      el('td', { textContent: sizeOf(m) }),
      el('td', { textContent: fixed(m.sigma) })
    );
    if (ui.sel?.id === m.id) tr.setAttribute('aria-selected', 'true');
    return tr;
  }
  /** Rows kept between renders: a mark that did not change keeps its row. */
  const rows = new Map();
  function renderTable() {
    const list = here();
    const want = new Set(list.map(m => m.id));
    for (const [id, r] of rows)
      if (!want.has(id)) {
        r.tr.remove();
        rows.delete(id);
      }
    let prev = null;
    for (const m of list) {
      const sel = ui.sel?.id === m.id ? ui.sel.handle : -1;
      let r = rows.get(m.id);
      if (!r || r.mark !== m || r.sel !== sel) {
        const tr = rowFor(m);
        if (r?.tr.isConnected) r.tr.replaceWith(tr);
        r = { mark: m, sel, tr };
        rows.set(m.id, r);
      }
      const at = prev ? prev.nextSibling : tbody.firstChild;
      if (r.tr !== at) tbody.insertBefore(r.tr, at);
      prev = r.tr;
    }
    const sc = scaleOf(store.state, sidecar);
    scaleOut.textContent = `${T.scale}: ${sc ? `${fixed(sc.value * 1000) / 1000} ${sc.unit} ± ${fixed(sc.sigma * 1000) / 1000}` : T.none}`;
    status.textContent = T.frame(
      ui.frame + 1,
      frames.length,
      here().length,
      missingTags(store.state, ui.frame).join(', ')
    );
  }
  /** One row's cells, when only a coordinate changed. */
  function updateRow(id) {
    const m = byId(id);
    const tr = tbody.querySelector(`tr[data-id="${id}"]`);
    if (!m || !tr) return renderTable();
    const h = ui.sel?.id === id ? ui.sel.handle : 0;
    const [ix, iy] = tr.querySelectorAll('input[type=number]');
    const kept = rows.get(id);
    if (kept) kept.mark = m;
    ix.value = fixed(m.pts[h][0]);
    iy.value = fixed(m.pts[h][1]);
    tr.cells[6].textContent = sizeOf(m);
    tr.cells[7].textContent = fixed(m.sigma);
  }

  // ---- operations ------------------------------------------------------------------
  function select(id, handle = 0, focus = false) {
    ui.sel = id ? { id, handle } : null;
    const m = id && byId(id);
    if (m) ui.aim = { x: m.pts[handle][0], y: m.pts[handle][1] };
    tagSelect.value = m?.tag ?? '';
    renderTable();
    drawOverlay();
    if (focus && m) {
      over.focus();
      say(T.selected(id, handle + 1));
    }
  }
  function commitPlace(pts) {
    const kind = ui.tool;
    const length =
      kind === 'reference-pair' && Number(known.value) > 0
        ? {
            value: Number(known.value),
            unit: sidecar.knownLength?.unit ?? 'km',
            sigma: sidecar.knownLength?.sigma ?? 0,
          }
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
    say(
      T.placed(
        T.tools[kind],
        mark.id,
        fixed(pts[pts.length - 1][0]),
        fixed(pts[pts.length - 1][1])
      )
    );
  }
  /** The aim becomes a control point: the mark is made when it has all of them. */
  function confirm() {
    const p = [ui.aim.x, ui.aim.y];
    const need = ARITY[ui.tool];
    if (ui.tool === 'polygon') {
      ui.pending.push(p);
      drawOverlay();
      say(T.pending(ui.pending.length, '3+'));
    } else if (ui.pending.length + 1 < need) {
      ui.pending.push(p);
      ui.draft = false;
      drawOverlay();
      say(T.pending(ui.pending.length, need));
    } else commitPlace([...ui.pending, p]);
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
    say(T.cancelled);
  }
  function move(dx, dy) {
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
      ui.waiting = true;
      settled.nudge(T.moved(id, fixed(p[0]), fixed(p[1])));
      sealLater();
    } else {
      ui.aim = {
        x: Math.min(fr().width, Math.max(1, ui.aim.x + dx)),
        y: Math.min(fr().height, Math.max(1, ui.aim.y + dy)),
      };
      drawOverlay();
      ui.waiting = true;
      settled.nudge(T.draft(fixed(ui.aim.x), fixed(ui.aim.y)));
    }
  }
  let sealTimer = 0;
  function sealLater() {
    clearTimeout(sealTimer);
    sealTimer = setTimeout(() => store.seal(), settleMs);
  }
  function cycle(d) {
    if (!ui.sel) return;
    const n = byId(ui.sel.id).pts.length;
    select(ui.sel.id, (ui.sel.handle + d + n) % n);
    say(T.selected(ui.sel.id, ui.sel.handle + 1));
  }
  function doRefine() {
    if (!ui.sel) return;
    const id = ui.sel.id;
    const { state, result } = refine(store.state, id, frames);
    if (!result.ok)
      return say(T.refused(id, T.reasons[result.reason] ?? result.reason));
    store.apply(state);
    store.seal();
    const p = byId(id).pts[0];
    updateRow(id);
    drawOverlay();
    say(T.refined(id, fixed(p[0]), fixed(p[1]), fixed(byId(id).sigma)));
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
    say(T.deleted(id));
  }
  function doUndo() {
    settled.cancel();
    ui.waiting = false;
    store.seal();
    if (store.undo()) after(T.undone(here().length));
  }
  function doRedo() {
    settled.cancel();
    if (store.redo()) after(T.redone(here().length));
  }
  function after(message) {
    if (ui.sel && !byId(ui.sel.id)) ui.sel = null;
    renderTable();
    drawOverlay();
    say(message);
  }
  function goto(n) {
    if (n < 0 || n >= frames.length) return;
    ui.frame = n;
    ui.sel = null;
    ui.pending = [];
    drawFrame();
    renderTable();
    drawOverlay();
    say(
      T.frame(
        n + 1,
        frames.length,
        here().length,
        missingTags(store.state, n).join(', ')
      )
    );
  }
  /** The marks as one record (the ledger bridge); resolves with the envelope. */
  async function keep() {
    const record = await writeRecord({
      id: `marks-${setId}`,
      setId,
      frames,
      sidecar,
      state: store.state,
    });
    api.lastRecord = record;
    say(T.kept(record.quantities.length));
    return record;
  }
  /** Reopen a record on its image: the marks come back, or the replay refuses. */
  async function reopen(record) {
    const r = await replay(record, frames);
    store.apply(r.state);
    store.seal();
    ui.sel = null;
    renderTable();
    drawOverlay();
    say(T.reopened(r.state.marks.length));
    return r;
  }
  function doCopy() {
    if (!ui.sel || ui.frame + 1 >= frames.length) return;
    store.apply(copyForward(store.state, ui.sel.id, ui.frame + 1));
    store.seal();
    say(T.copied(ui.sel.id, ui.frame + 2));
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
    const top =
      e.clientY - r.top - 72 - 96 < 0
        ? e.clientY - r.top + 72
        : e.clientY - r.top - 72 - 96;
    loupe.style.cssText = `position:absolute;left:${Math.min(r.width - 96, Math.max(0, e.clientX - r.left - 48))}px;top:${top}px;`;
  };
  over.addEventListener('pointerdown', e => {
    over.focus();
    const p = toImage(e);
    ui.aim = { x: p.x, y: p.y };
    if (e.pointerType === 'touch') showLoupe(e);
  });
  over.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && e.buttons) {
      const p = toImage(e);
      ui.aim = { x: p.x, y: p.y };
      showLoupe(e);
    }
  });
  over.addEventListener('pointerup', e => {
    loupe.hidden = true;
    const p = toImage(e);
    ui.aim = { x: p.x, y: p.y };
    ui.sel = null;
    if (e.pointerType === 'touch') {
      ui.draft = true;
      drawOverlay();
      say(T.draft(fixed(p.x), fixed(p.y)));
    } else confirm();
  });
  over.addEventListener('focus', drawOverlay);
  over.addEventListener('blur', drawOverlay);
  over.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      return e.shiftKey ? doRedo() : doUndo();
    }
    const arrows = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    };
    if (arrows[e.key]) {
      e.preventDefault();
      const s = nudgeScale(e);
      return move(arrows[e.key][0] * s, arrows[e.key][1] * s);
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

  // ---- start ----------------------------------------------------------------------
  const f0 = fr();
  ui.aim = { x: Math.round(f0.width / 2), y: Math.round(f0.height / 2) };
  drawFrame();
  renderTable();
  drawOverlay();
  const api = {
    store,
    ui,
    frames,
    sidecar,
    setId,
    T,
    state: () => store.state,
    keep,
    reopen,
    goto,
    select,
    confirm,
    doRefine,
    doDelete,
    doUndo,
    doRedo,
    drawFrame,
    renderTable,
    drawOverlay,
    setAim: (x, y) => ((ui.aim = { x, y }), drawOverlay()),
    setTool: kind => toolButtons.find(b => b.dataset.tool === kind).click(),
    destroy: () => root.replaceChildren(),
  };
  return api;
}
