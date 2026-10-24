// =============================================================================
// Catalog overlays, blink and compare (Prompt 182, OVERLAYS.md)
// -----------------------------------------------------------------------------
// The bright stars and the planets over the open image, at the time of the image,
// as a picture and as a table of read-only rows; and a second image laid over
// the first to blink against, to put beside it with linked cursors, or to
// subtract from it. The arithmetic is js/measure/overlay.js over Prompt 181's
// sky coordinates and registration; this is the page around it.
//   overlay   one button draws the catalogs; a box each for the stars, the planets
//             and the names; the page says which sky coordinates it used, what the
//             epoch and the proper-motion treatment are, and how good a planet is
//   compare   "use the next image I open" holds a second frame; the tie is the
//             sky, matched stars (typed, or taken from the cursors) or the same
//             pixels; blink at a chosen rate (by hand with reduced motion), side
//             by side, or the difference, which refuses unless both frames are
//             quantitative with one calibration state
//   keyboard  a picture takes the arrows (Alt a quarter pixel, Shift four) to move
//             its cursor; every picture control is also a button
// Nothing is uploaded or fetched but the site's own bright-star file, when the
// stars are first drawn. Loaded when the panel first opens; it reaches
// js/observatory/imageMarks.js (the frames and the contract's `permits`) by
// import() so no chunk is shared with it.
// =============================================================================

import { formatDec, formatRa, register, skyOf } from '../measure/astrometry.js';
import {
  RULES,
  blinkPlan,
  carry,
  differenceVerdict,
  planetsIn,
  predictionSigma,
  skyFor,
  starOfRow,
  starsIn,
  subtract,
  tieOf,
  toTt,
} from '../measure/overlay.js';
import { loadStarFile } from '../kernels/sky/packs.js';
import { roundSig } from '../format.js';
import { listeners } from '../listeners.js';

const WORDS = {
  en: () => import('../i18n/en.imageOverlay.js').then(m => m.EN_IMAGEOVERLAY),
  es: () => import('../i18n/es.imageOverlay.js').then(m => m.ES_IMAGEOVERLAY),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const SIZE = 480;
const STEPS = [0.25, 1, 4];
const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};
/** INTERACTION.md's nudge sizes: Alt a quarter, none one, Shift four. */
const nudgeScale = e => (e.altKey ? 0.25 : e.shiftKey ? 4 : 1);
const SETTLE_MS = 700;
const TIES = ['sky', 'pairs', 'identity'];
const VIEWS = ['blink', 'side', 'difference'];
const COLS = ['name', 'kind', 'x', 'y', 'ra', 'dec', 'mag', 'sigma'];

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

/** How a frame is drawn: the whole-number zoom, the stride that brings it under SIZE, and its drawn size. */
const geometryOf = f => {
  const k = Math.max(1, Math.floor(SIZE / Math.max(f.width, f.height)));
  const step = Math.max(1, Math.ceil(Math.max(f.width, f.height) / SIZE));
  return {
    k,
    step,
    cols: Math.ceil(f.width / step),
    rows: Math.ceil(f.height / step),
  };
};

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   state: {view: object}, marks: {cal?: object, take?: Function}}} ctx -
 *   `marks.take` is the page's hook for the next image opened
 * @returns {Promise<{update: () => void}>}
 */
export async function mountOverlay(box, ctx) {
  const listen = listeners();
  await words(ctx);
  const { framesOf, permits } = await import('./imageMarks.js');
  const { t } = ctx;
  const fmt = (v, d = 4) =>
    Number.isFinite(v) ? ctx.number(roundSig(v, d)) : '—';
  const labelled = [];
  const word = (node, id, prop = 'textContent') => {
    labelled.push([node, id, prop]);
    node[prop] = t(id);
    return node;
  };
  const live = el('div', { role: 'status', className: 'visually-hidden' });
  let timer = 0;
  const say = (m, later) => {
    clearTimeout(timer);
    const show = () => live.replaceChildren(el('p', { textContent: m }));
    if (later) timer = setTimeout(show, SETTLE_MS);
    else show();
  };
  const refusal = el('p', { className: 'ui-status is-error', hidden: true });
  const button = (id, onclick) => {
    const b = word(
      el('button', { type: 'button', className: 'ui-button is-small' }),
      id
    );
    b.onclick = onclick;
    return b;
  };
  const field = (id, control) =>
    el('label', { className: 'im-field' }, word(el('span'), id), control);
  const check = (id, on) => {
    const c = el('input', { type: 'checkbox', checked: on });
    return [c, el('label', { className: 'im-field' }, c, word(el('span'), id))];
  };
  const menu = (id, choices, value) => {
    const s = el(
      'select',
      { className: 'ui-select' },
      ...choices.map(c => el('option', { value: String(c) }))
    );
    s.value = String(value ?? choices[0]);
    labelled.push([s, id, 'options']);
    return s;
  };
  const number = (value, step = 'any') => {
    const i = el('input', { type: 'number', step, className: 'ui-input' });
    i.value = value ?? '';
    return i;
  };

  // ---- the overlay controls --------------------------------------------------------
  const [starsOn, starsBox] = check('obs.ov.stars', true);
  const [planetsOn, planetsBox] = check('obs.ov.planets', true);
  const [namesOn, namesBox] = check('obs.ov.names', true);
  const magIn = number(RULES.magnitudeLimitDefault, '0.1');
  const magField = el('label', { className: 'im-field' });
  magField.append(word(el('span'), 'obs.ov.magnitude'), magIn);
  const showBtn = button('obs.ov.show', () => showCatalogs());
  const ovNotes = el('div', { className: 'ov-notes' });
  const ovPic = el('canvas', { className: 'ov-pic', width: 16, height: 16 });
  word(ovPic, 'obs.ov.picture', 'ariaLabel');
  ovPic.setAttribute('role', 'img');
  const ovTable = el('div', { className: 'im-tablewrap' });

  // ---- the compare controls --------------------------------------------------------
  const takeBtn = button('obs.ov.take', () => arm());
  const cancelBtn = button('obs.ov.cancelTake', () => disarm(true));
  cancelBtn.hidden = true;
  const clearBtn = button('obs.ov.clear', () => clearSecond());
  const secondNote = el('p', { className: 'ui-hint' });
  const tieMenu = menu('obs.ov.tie', TIES, 'sky');
  const tieOut = el('p', { className: 'ui-hint', role: 'status' });
  const pairBody = el('tbody');
  const pairHead = el('tr');
  const addPairBtn = button('obs.ov.addPair', () => {
    addPair();
    tieAgain();
  });
  const fromCursorBtn = button('obs.ov.pairFromCursors', () => {
    if (!cur || !other) return;
    addPair(...curA, ...curB);
    tieAgain();
  });
  const pairsBox = el(
    'div',
    { className: 'im-tablewrap' },
    el('table', { className: 'im-table' }, el('thead', {}, pairHead), pairBody)
  );
  const pairTools = el(
    'div',
    { className: 'im-tools' },
    addPairBtn,
    fromCursorBtn
  );
  const viewMenu = menu('obs.ov.view', VIEWS, 'blink');
  const rateMenu = menu(
    'obs.ov.rate',
    RULES.blinkRatesPerSecond,
    RULES.blinkRateDefault
  );
  const startBtn = button('obs.ov.blinkStart', () => toggleBlink());
  const flipBtn = button('obs.ov.flip', () => flip(true));
  const reducedNote = word(
    el('p', { className: 'ui-hint', hidden: true }),
    'obs.ov.reduced'
  );
  const shown = el('p', { className: 'ui-hint' });
  const picA = el('canvas', {
    className: 'ov-pic',
    width: 16,
    height: 16,
    tabIndex: 0,
  });
  const picB = el('canvas', {
    className: 'ov-pic',
    width: 16,
    height: 16,
    tabIndex: 0,
  });
  for (const [c, id] of [
    [picA, 'obs.ov.picFirst'],
    [picB, 'obs.ov.picSecond'],
  ]) {
    word(c, id, 'ariaLabel');
    c.setAttribute('role', 'img');
  }
  const pair = el('div', { className: 'ov-pair' }, picA, picB);
  const linkOn = check('obs.ov.link', true);
  const stepMenu = menu('obs.ov.step', STEPS, '1');
  const padButton = (id, dx, dy) =>
    button(id, () => nudge(dx, dy, STEPS[stepMenu.selectedIndex], focusedPic));
  const pad = el(
    'div',
    { className: 'im-tools' },
    padButton('obs.ov.left', -1, 0),
    padButton('obs.ov.right', 1, 0),
    padButton('obs.ov.up', 0, 1),
    padButton('obs.ov.down', 0, -1),
    field('obs.ov.step', stepMenu),
    linkOn[1]
  );
  const cursorOut = el('p', { className: 'ui-hint' });
  const diffNote = el('p', { className: 'ui-hint', hidden: true });
  const diffRefusal = el('p', {
    className: 'ui-status is-error',
    hidden: true,
  });

  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.ov.help'),
    refusal,
    word(el('h3'), 'obs.ov.overlayTitle'),
    word(el('p', { className: 'ui-hint' }), 'obs.ov.overlayHelp'),
    el(
      'div',
      { className: 'im-tools' },
      starsBox,
      planetsBox,
      namesBox,
      magField,
      showBtn
    ),
    ovNotes,
    ovPic,
    ovTable,
    word(el('p', { className: 'ui-hint' }), 'obs.ov.tableNote'),
    word(el('h3'), 'obs.ov.compareTitle'),
    word(el('p', { className: 'ui-hint' }), 'obs.ov.compareHelp'),
    el('div', { className: 'im-tools' }, takeBtn, cancelBtn, clearBtn),
    secondNote,
    el('div', { className: 'im-tools' }, field('obs.ov.tie', tieMenu)),
    pairTools,
    pairsBox,
    tieOut,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.ov.view', viewMenu),
      field('obs.ov.rate', rateMenu),
      startBtn,
      flipBtn
    ),
    reducedNote,
    shown,
    diffRefusal,
    diffNote,
    pair,
    pad,
    cursorOut
  );

  // ---- the frames ---------------------------------------------------------------------
  let cur = null; // {o, frame}: the open image
  let other = null; // {o, frame}: the second frame
  let sky = null; // skyFor's answer for the first frame, with the fit when there is one
  let tie = null;
  let carried = null;
  let diff = null;
  let curA = [1, 1];
  let curB = [1, 1];
  let focusedPic = picA;
  let showing = 'A';
  let blinking = 0;
  let taking = false;
  let entries = null;
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isReduced = () => Boolean(reduced?.matches);

  const refresh = () => {
    const o = ctx.state.view;
    if (o?.kind !== 'image') return (cur = null);
    if (cur?.o === o) return cur;
    stopBlink(false);
    const [frame] = framesOf(o);
    cur = { o, frame };
    sky = tie = carried = diff = entries = null;
    curA = [Math.round(frame.width / 2), Math.round(frame.height / 2)];
    ovNotes.replaceChildren();
    ovTable.replaceChildren();
    return cur;
  };

  /** The sky coordinates of the first frame: the calibration solved, else the header. */
  async function skyOfFirst() {
    const c = cur;
    const b = await ctx.marks.cal?.block?.(c.o);
    const solved = b?.solution?.wcs ?? null;
    const r = skyFor({
      sidecar: c.frame.sidecar,
      header: c.o.image.wcs,
      solved,
      permits,
    });
    if (!r.ok) return r;
    const fit =
      b?.solution?.origin === 'fit' && b.result
        ? {
            params: b.result.params,
            covariance: b.result.covariance,
            tangent: b.solution.tangent,
          }
        : null;
    return { ...r, fit };
  }
  const why = r => t(`obs.ov.no.${r.code}`, { ...(r.data ?? {}) });

  // ---- drawing a frame -----------------------------------------------------------------
  const geo = new WeakMap();
  /** Paint data on a canvas, row 1 at the bottom. `signed` centers gray on zero. */
  function paint(canvas, f, data, signed = false) {
    const g = geometryOf(f);
    geo.set(canvas, g);
    canvas.width = g.cols * g.k;
    canvas.height = g.rows * g.k;
    const g2 = canvas.getContext('2d');
    if (!g2) return;
    const sample = [];
    const every = Math.max(1, Math.floor(data.length / 20000));
    for (let i = 0; i < data.length; i += every)
      if (data[i] === data[i])
        sample.push(signed ? Math.abs(data[i]) : data[i]);
    sample.sort((p, q) => p - q);
    const lo = signed ? 0 : (sample[Math.floor(sample.length * 0.01)] ?? 0);
    const hi = sample[Math.floor(sample.length * 0.998)] ?? 1;
    const span = hi > lo ? hi - lo : 1;
    const img = g2.createImageData(canvas.width, canvas.height);
    for (let j = 0; j < canvas.height; j++) {
      const Y = Math.min(
        f.height - 1,
        (g.rows - 1 - Math.floor(j / g.k)) * g.step
      );
      for (let i = 0; i < canvas.width; i++) {
        const X = Math.min(f.width - 1, Math.floor(i / g.k) * g.step);
        const v = data[Y * f.width + X];
        const p = (j * canvas.width + i) * 4;
        if (v !== v) {
          img.data[p] = 70;
          img.data[p + 1] = 0;
          img.data[p + 2] = 0;
        } else {
          const gray = signed
            ? 127.5 + (v / span) * 127.5
            : ((v - lo) / span) * 255;
          img.data[p] =
            img.data[p + 1] =
            img.data[p + 2] =
              Math.max(0, Math.min(255, gray));
        }
        img.data[p + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
  }
  const at = (canvas, x, y) => {
    const g = geo.get(canvas);
    return [
      ((x - 1) / g.step + 0.5) * g.k,
      (g.rows - 1 - (y - 1) / g.step + 0.5) * g.k,
    ];
  };
  function label(g2, text, x, y) {
    g2.font = '12px sans-serif';
    g2.lineWidth = 3;
    g2.strokeStyle = '#000';
    g2.strokeText(text, x + 8, y - 6);
    g2.fillStyle = '#fff';
    g2.fillText(text, x + 8, y - 6);
  }
  function drawCatalogs() {
    const c = cur?.frame;
    if (!c) return;
    paint(ovPic, c, c.data);
    if (!entries) return;
    const g2 = ovPic.getContext('2d');
    if (!g2) return;
    const g = geo.get(ovPic);
    g2.lineWidth = 2;
    for (const e of entries) {
      const [cx, cy] = at(ovPic, e.x, e.y);
      if (e.kind === 'planet') {
        g2.strokeStyle = '#4fd1ff';
        g2.setLineDash([5, 4]);
        g2.beginPath();
        g2.arc(
          cx,
          cy,
          Math.max(6, Math.min((e.boundPix / g.step) * g.k, SIZE)),
          0,
          2 * Math.PI
        );
        g2.stroke();
        g2.setLineDash([]);
        g2.beginPath();
        g2.moveTo(cx - 6, cy);
        g2.lineTo(cx + 6, cy);
        g2.moveTo(cx, cy - 6);
        g2.lineTo(cx, cy + 6);
        g2.stroke();
      } else {
        g2.strokeStyle = '#ffd400';
        g2.beginPath();
        g2.arc(cx, cy, 8, 0, 2 * Math.PI);
        g2.stroke();
      }
      if (namesOn.checked)
        label(
          g2,
          e.kind === 'planet' ? t(`obs.ov.planet.${e.id}`) : e.name,
          cx,
          cy
        );
    }
  }

  // ---- the catalogs ----------------------------------------------------------------------
  let starRows = null;
  async function showCatalogs() {
    const c = refresh();
    if (!c) return;
    refusal.hidden = true;
    const s = await skyOfFirst();
    sky = s;
    entries = null;
    ovNotes.replaceChildren();
    if (!s.ok) {
      refusal.hidden = false;
      refusal.textContent = why(s);
      drawCatalogs();
      renderTable();
      return say(why(s));
    }
    const frame = c.frame;
    const size = { width: frame.width, height: frame.height };
    const t0 = frame.sidecar?.time ?? frame.time;
    const time = toTt(t0, frame.sidecar?.exposure?.seconds);
    const notes = [t(`obs.ov.where.${s.source}`)];
    let list = [];
    let leftOut = 0;
    let reach = [];
    let nStars = 0;
    let nPlanets = 0;
    if (starsOn.checked) {
      try {
        starRows ??= (await loadStarFile()).stars.map(starOfRow);
      } catch {
        refusal.hidden = false;
        refusal.textContent = t('obs.ov.no.stars-file');
        return say(refusal.textContent);
      }
      const r = starsIn(starRows, s.wcs, size, {
        jdTt: time.ok ? time.jdTt : null,
        magnitude: Number.isFinite(magIn.valueAsNumber)
          ? magIn.valueAsNumber
          : RULES.magnitudeLimitDefault,
      });
      list = list.concat(r.entries);
      leftOut = r.leftOut;
      nStars = r.entries.length;
      notes.push(
        r.moved
          ? t('obs.ov.epoch.moved', {
              time: `${t0.value} ${t0.scale}`,
            })
          : t('obs.ov.epoch.notMoved', {
              why: t(`obs.ov.why.${time.code}`, {
                scale: time.data?.scale ?? '',
              }),
            })
      );
    }
    if (planetsOn.checked) {
      if (time.ok) {
        const r = planetsIn(s.wcs, size, time.jdTt);
        list = list.concat(r.entries);
        reach = r.reach;
        nPlanets = r.entries.length;
        notes.push(t('obs.ov.planets.bound', { deg: fmt(0.2, 2) }));
      } else
        notes.push(
          t('obs.ov.planets.no', {
            why: t(`obs.ov.why.${time.code}`, {
              scale: time.data?.scale ?? '',
            }),
          })
        );
    }
    entries = list;
    notes.push(t('obs.ov.counts', { stars: nStars, planets: nPlanets }));
    if (leftOut)
      notes.push(t('obs.ov.leftOut', { n: leftOut, max: RULES.maxEntries }));
    for (const p of reach)
      notes.push(
        t('obs.ov.reach', {
          name: t(`obs.ov.planet.${p.id}`),
          pixels: fmt(p.awayPix, 3),
        })
      );
    if (!s.fit) notes.push(t('obs.ov.noSigma'));
    ovNotes.replaceChildren(
      ...notes.map(n => el('p', { className: 'ui-hint', textContent: n }))
    );
    drawCatalogs();
    renderTable();
    say(t('obs.ov.said.drawn', { stars: nStars, planets: nPlanets }));
  }
  function renderTable() {
    if (!entries?.length) return ovTable.replaceChildren();
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    const sig = e => {
      if (!sky?.fit) return '—';
      const p = predictionSigma(sky.fit, e.ra, e.dec);
      return p ? `${fmt(p.sx, 2)} × ${fmt(p.sy, 2)}` : '—';
    };
    ovTable.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.ov.table')),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...COLS.map(k => cell('th', t(`obs.ov.col.${k}`), { scope: 'col' }))
          )
        ),
        el(
          'tbody',
          {},
          ...entries.map(e =>
            el(
              'tr',
              {},
              cell(
                'th',
                e.kind === 'planet' ? t(`obs.ov.planet.${e.id}`) : e.name,
                { scope: 'row' }
              ),
              ...[
                t(`obs.ov.kind.${e.kind}`),
                fmt(e.x, 6),
                fmt(e.y, 6),
                formatRa(e.ra),
                formatDec(e.dec),
                e.kind === 'planet'
                  ? t('obs.ov.bound', { deg: fmt(e.boundDeg, 2) })
                  : fmt(e.mag, 3),
                e.kind === 'planet' ? '—' : sig(e),
              ].map(v => cell('td', v))
            )
          )
        )
      )
    );
  }

  // ---- the second frame ----------------------------------------------------------------
  function arm() {
    taking = true;
    ctx.marks.take = o => {
      if (!taking || o?.kind !== 'image') return false;
      disarm(false);
      second(o);
      return true;
    };
    cancelBtn.hidden = false;
    say(t('obs.ov.waiting'));
    secondNote.textContent = t('obs.ov.waiting');
  }
  function disarm(announce) {
    taking = false;
    if (ctx.marks.take) ctx.marks.take = null;
    cancelBtn.hidden = true;
    if (announce) {
      noteSecond();
      say(t('obs.ov.cancelled'));
    }
  }
  async function second(o) {
    stopBlink(false);
    const [frame] = framesOf(o);
    other = { o, frame };
    curB = [Math.round(frame.width / 2), Math.round(frame.height / 2)];
    tie = carried = diff = null;
    pairBody.replaceChildren();
    const c = refresh();
    noteSecond();
    say(t('obs.ov.taken', { title: o.title ?? o.id }));
    if (!c) return showView();
    const a = await skyOfFirst();
    const b = skyFor({
      sidecar: frame.sidecar,
      header: o.image.wcs,
      solved: null,
      permits,
    });
    tieMenu.value = a.ok && b.ok ? 'sky' : 'pairs';
    syncTie();
  }
  function clearSecond() {
    stopBlink(false);
    other = tie = carried = diff = null;
    pairBody.replaceChildren();
    tieOut.textContent = '';
    noteSecond();
    showView();
    say(t('obs.ov.cleared'));
  }
  function noteSecond() {
    secondNote.textContent = other
      ? t('obs.ov.second', {
          title: other.o.title ?? other.o.id,
          width: other.frame.width,
          height: other.frame.height,
        })
      : t('obs.ov.secondNone');
    clearBtn.disabled = !other;
  }

  // ---- how the frames line up ----------------------------------------------------------
  const pairInputs = [];
  function addPair(ax = '', ay = '', bx = '', by = '') {
    const inputs = [ax, ay, bx, by].map(v => {
      const n = number(v === '' ? '' : v);
      n.onchange = () => tieAgain();
      return n;
    });
    const tr = el('tr', {}, ...inputs.map(i => el('td', {}, i)));
    const remove = button('obs.ov.removePair', () => {
      tr.remove();
      pairInputs.splice(pairInputs.indexOf(inputs), 1);
      tieAgain();
    });
    tr.append(el('td', {}, remove));
    pairInputs.push(inputs);
    pairBody.append(tr);
    labelPairs();
  }
  function labelPairs() {
    for (const row of pairInputs)
      row.forEach((n, i) => (n.ariaLabel = t(`obs.ov.pairCol.${i}`)));
    pairHead.replaceChildren(
      ...[0, 1, 2, 3].map(i =>
        el('th', { scope: 'col', textContent: t(`obs.ov.pairCol.${i}`) })
      ),
      el('th', { scope: 'col', textContent: t('obs.ov.removePair') })
    );
  }
  function readPairs() {
    return pairInputs
      .map((v, i) => ({ id: String(i + 1), v: v.map(n => n.valueAsNumber) }))
      .filter(p => p.v.every(Number.isFinite))
      .map(p => ({ id: p.id, a: [p.v[0], p.v[1]], b: [p.v[2], p.v[3]] }));
  }
  async function tieAgain() {
    const c = refresh();
    tie = carried = diff = null;
    if (!c || !other) return showView();
    const mode = tieMenu.value;
    let r;
    if (mode === 'identity') {
      const same =
        c.frame.width === other.frame.width &&
        c.frame.height === other.frame.height;
      r = same
        ? { tie: tieOf({ kind: 'identity' }), text: t('obs.ov.tied.identity') }
        : {
            why: t('obs.ov.noTie.shape', {
              first: `${c.frame.width} by ${c.frame.height}`,
              second: `${other.frame.width} by ${other.frame.height}`,
            }),
          };
    } else if (mode === 'sky') {
      const a = await skyOfFirst();
      const b = skyFor({
        sidecar: other.frame.sidecar,
        header: other.o.image.wcs,
        solved: null,
        permits,
      });
      r = !a.ok
        ? { why: t('obs.ov.noTie.sky-first', { why: why(a) }) }
        : !b.ok
          ? { why: t('obs.ov.noTie.sky-second', { why: why(b) }) }
          : {
              tie: tieOf({ kind: 'sky', first: a.wcs, second: b.wcs }),
              text: t('obs.ov.tied.sky'),
            };
    } else {
      const pairs = readPairs();
      const reg = register(pairs);
      r = !reg.ok
        ? {
            why: t(`obs.ov.noTie.${reg.code}`, {
              ...reg.data,
              id: reg.data?.id,
            }),
          }
        : {
            tie: tieOf({ kind: 'pairs', registration: reg }),
            text: t('obs.ov.tied.pairs', {
              n: pairs.length,
              theta: fmt(reg.thetaDeg, 4),
              sigmaTheta: fmt((reg.sigmaTheta * 180) / Math.PI, 2),
              dx: fmt(reg.t[0], 4),
              dy: fmt(reg.t[1], 4),
              rms: fmt(reg.distribution.rms, 3),
              verdict: t(`obs.ov.verdict.${reg.verdict}`),
            }),
          };
    }
    tie = r.tie ?? null;
    tieOut.textContent = r.text ?? r.why;
    tieOut.classList.toggle('is-error', !r.tie);
    if (tie) carried = carry(other.frame, c.frame, tie);
    showView();
    say(tieOut.textContent);
  }

  // ---- the views -------------------------------------------------------------------------
  const diffFor = () => {
    if (diff) return diff;
    const v = differenceVerdict(cur.frame, other.frame, { permits, tie });
    diff = v.ok
      ? {
          ok: true,
          data: subtract(cur.frame.data, carried),
          unit: cur.frame.sidecar.pixels.unit,
        }
      : v;
    return diff;
  };
  /** The sentence for a refusal: an incomplete contract with nothing named missing says what else was wrong with it. */
  const diffKey = d =>
    d.code === 'incomplete-contract' && !d.data.missing?.length
      ? `obs.ov.noDiff.contract-${d.data.reason}`
      : `obs.ov.noDiff.${d.code}`;
  /** The parameters of a difference refusal, each word in the page's language. */
  const diffWords = d => {
    const x = { ...(d.data ?? {}) };
    if (x.which) x.which = t(`obs.ov.which.${x.which}`);
    if (d.code === 'calibration-state')
      for (const k of ['first', 'second']) x[k] = t(`obs.ov.state.${x[k]}`);
    if (x.missing) x.missing = x.missing.join(', ');
    return x;
  };
  function showView() {
    const c = cur?.frame;
    diffRefusal.hidden = diffNote.hidden = true;
    const mode = viewMenu.value;
    const has = Boolean(c && other && tie && carried);
    pair.dataset.view = mode;
    picB.hidden = mode !== 'side' || !other;
    startBtn.hidden = mode !== 'blink' || isReduced();
    rateMenu.closest('label').hidden = mode !== 'blink' || isReduced();
    flipBtn.hidden = mode !== 'blink';
    reducedNote.hidden = !(isReduced() && mode === 'blink');
    startBtn.disabled = flipBtn.disabled = !has;
    if (!c) return;
    if (!has && mode !== 'side') {
      paint(picA, c, c.data);
      shown.textContent = other ? '' : t('obs.ov.secondNone');
      if (mode === 'difference' && other) {
        diffRefusal.hidden = false;
        diffRefusal.textContent = t('obs.ov.noDiff.no-tie');
      }
      drawCursors();
      return;
    }
    if (mode === 'blink') {
      paint(picA, c, showing === 'A' ? c.data : carried);
      shown.textContent = t(
        showing === 'A' ? 'obs.ov.showing.first' : 'obs.ov.showing.second'
      );
    } else if (mode === 'side') {
      paint(picA, c, c.data);
      if (other) paint(picB, other.frame, other.frame.data);
      shown.textContent = t('obs.ov.sideNote');
    } else {
      const d = diffFor();
      if (!d.ok) {
        paint(picA, c, c.data);
        diffRefusal.hidden = false;
        diffRefusal.textContent = t(diffKey(d), diffWords(d));
        shown.textContent = '';
      } else {
        paint(picA, c, d.data, true);
        diffNote.hidden = false;
        diffNote.textContent = t('obs.ov.diff.legend', { unit: d.unit });
        shown.textContent = t('obs.ov.showing.difference');
      }
    }
    drawCursors();
  }
  function drawCursors() {
    for (const [canvas, p] of [
      [picA, curA],
      [picB, curB],
    ]) {
      if (!geo.has(canvas) || canvas.hidden) continue;
      const g2 = canvas.getContext('2d');
      if (!g2) continue;
      const [x, y] = at(canvas, p[0], p[1]);
      g2.lineWidth = 3;
      g2.strokeStyle = '#000';
      g2.beginPath();
      g2.moveTo(x - 12, y);
      g2.lineTo(x + 12, y);
      g2.moveTo(x, y - 12);
      g2.lineTo(x, y + 12);
      g2.stroke();
      g2.lineWidth = 1.5;
      g2.strokeStyle = '#ffd27a';
      g2.stroke();
    }
    const parts = [
      t('obs.ov.cursorFirst', { x: fmt(curA[0], 6), y: fmt(curA[1], 6) }),
    ];
    if (other && !picB.hidden)
      parts.push(
        t('obs.ov.cursorSecond', { x: fmt(curB[0], 6), y: fmt(curB[1], 6) })
      );
    if (sky?.ok) {
      const s = skyOf(sky.wcs, curA[0], curA[1]);
      parts.push(
        t('obs.ov.cursorSky', { ra: formatRa(s.ra), dec: formatDec(s.dec) })
      );
    }
    cursorOut.textContent = parts.join(' ');
  }

  // ---- the blink --------------------------------------------------------------------------
  function flip(announce) {
    showing = showing === 'A' ? 'B' : 'A';
    if (viewMenu.value === 'blink') showView();
    if (announce) say(shown.textContent);
  }
  function stopBlink(announce) {
    if (blinking) clearInterval(blinking);
    blinking = 0;
    startBtn.textContent = t('obs.ov.blinkStart');
    delete startBtn.dataset.intervalMs;
    if (announce) say(t('obs.ov.said.stopped'));
  }
  function toggleBlink() {
    if (blinking) return stopBlink(true);
    const rate = RULES.blinkRatesPerSecond[rateMenu.selectedIndex];
    const plan = blinkPlan(rate, {
      reducedMotion: isReduced(),
    });
    if (!plan.ok || plan.mode !== 'timer' || !tie) return;
    blinking = setInterval(() => flip(false), plan.intervalMs);
    startBtn.textContent = t('obs.ov.blinkStop');
    startBtn.dataset.intervalMs = String(plan.intervalMs);
    say(t('obs.ov.said.blinking', { rate: ctx.number(rate) }));
  }
  rateMenu.onchange = () => {
    if (blinking) {
      stopBlink(false);
      toggleBlink();
    }
  };
  viewMenu.onchange = () => {
    stopBlink(false);
    showView();
  };
  function syncTie() {
    pairTools.hidden = pairsBox.hidden = tieMenu.value !== 'pairs';
    return tieAgain();
  }
  tieMenu.onchange = syncTie;
  if (reduced) {
    listen(reduced, 'change', () => {
      stopBlink(false);
      showView();
    });
  }
  const details = box.closest('details');
  if (details) {
    listen(details, 'toggle', e => {
      if (!e.target.open) stopBlink(false);
    });
  }
  pairTools.hidden = pairsBox.hidden = true;

  // ---- the cursors -------------------------------------------------------------------------
  function moveTo(canvas, x, y) {
    const f = canvas === picB ? other?.frame : cur?.frame;
    if (!f) return;
    const p = [
      Math.min(f.width, Math.max(1, x)),
      Math.min(f.height, Math.max(1, y)),
    ];
    if (canvas === picB) {
      curB = p;
      if (linkOn[0].checked && tie) {
        const a = tie.toFirst(...p);
        if (a)
          curA = [
            Math.min(cur.frame.width, Math.max(1, a[0])),
            Math.min(cur.frame.height, Math.max(1, a[1])),
          ];
      }
    } else {
      curA = p;
      if (linkOn[0].checked && tie && other) {
        const b = tie.toSecond(...p);
        if (b)
          curB = [
            Math.min(other.frame.width, Math.max(1, b[0])),
            Math.min(other.frame.height, Math.max(1, b[1])),
          ];
      }
    }
    showView();
    say(cursorOut.textContent, true);
  }
  const nudge = (dx, dy, size, canvas) => {
    const p = canvas === picB ? curB : curA;
    moveTo(canvas, p[0] + dx * size, p[1] + dy * size);
  };
  for (const c of [picA, picB]) {
    listen(c, 'focus', () => (focusedPic = c));
    listen(c, 'keydown', e => {
      const a = ARROWS[e.key];
      if (!a || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      nudge(a[0], a[1], nudgeScale(e), c);
    });
    listen(c, 'click', e => {
      const g = geo.get(c);
      const f = c === picB ? other?.frame : cur?.frame;
      if (!g || !f) return;
      c.focus({ preventScroll: true });
      const r = c.getBoundingClientRect();
      const col = Math.floor(
        (((e.clientX - r.left) / r.width) * c.width) / g.k
      );
      const row =
        g.rows -
        1 -
        Math.floor((((e.clientY - r.top) / r.height) * c.height) / g.k);
      moveTo(c, col * g.step + 1, row * g.step + 1);
    });
  }

  // ---- the panel -----------------------------------------------------------------------------
  function update() {
    const c = refresh();
    const ok = Boolean(c);
    for (const b of [showBtn, takeBtn]) b.disabled = !ok;
    if (!ok) return;
    drawCatalogs();
    showView();
  }
  function relabel() {
    for (const [n, id, prop] of labelled) {
      if (!id) continue;
      if (prop === 'options')
        for (const o of n.options) o.textContent = t(`${id}.${o.value}`);
      else n[prop] = t(id);
    }
    startBtn.textContent = t(
      blinking ? 'obs.ov.blinkStop' : 'obs.ov.blinkStart'
    );
    noteSecond();
    labelPairs();
    if (taking) secondNote.textContent = t('obs.ov.waiting');
    renderTable();
    showView();
  }
  new MutationObserver(async () => {
    await words(ctx);
    relabel();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  noteSecond();
  relabel();
  update();
  return { update };
}
