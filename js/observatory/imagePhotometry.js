// =============================================================================
// The photometry tool on an image (Prompt 180, PHOTOMETRY.md)
// -----------------------------------------------------------------------------
// An aperture and a sky ring on a source, the light inside with its error, and
// the same over the marks table. The arithmetic is js/measure/photometry.js
// over js/kernels/detector/reduce.js; this is the page around it.
//   one source   choose a mark (or type a position), set the aperture and the
//                ring in the boxes, with the buttons or by tapping the picture
//                (a tap sets the chosen radius: no drag), press Measure
//   every mark   Measure all marks: the table, each row a source with its
//                error, an upper limit or the reason it was not measured
//   keep         the table as one record in the ledger (it can be run again),
//                or as CSV through js/csv.js
// A frame whose pixels are not a measure of light refuses, in words, and no
// number is shown. Nothing here takes a key: every control is a button, a box
// or a menu, so the keyboard path is the browser's own. Loaded when the panel
// first opens. It reaches js/observatory/imageMarks.js (the frames, the
// contract's `permits`, the marks) by import() so no chunk is shared with it.
// =============================================================================

import {
  adapt,
  apertureFor,
  csvRows,
  curveOfGrowth,
  measure,
  measureBatch,
  quantitiesOf,
  reductionOf,
} from '../measure/photometry.js';
import { toCsv } from '../csv.js';
import { roundSig } from '../format.js';
import { sha256Hex } from '../hash.js';

const WORDS = {
  en: () =>
    import('../i18n/en.imagePhotometry.js').then(m => m.EN_IMAGEPHOTOMETRY),
  es: () =>
    import('../i18n/es.imagePhotometry.js').then(m => m.ES_IMAGEPHOTOMETRY),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const STEPS = { fine: 0.25, normal: 1, coarse: 4 };
const RINGS = ['aperture', 'inner', 'outer'];
const COLS = ['mark', 'x', 'y', 'net', 'sigma', 'snr', 'sky', 'mag', 'status'];
const CSV_COLS = [
  'mark',
  'x',
  'y',
  'net',
  'sigma',
  'snr',
  'sky',
  'skySigma',
  'mag',
  'magSigma',
  'status',
];
const SIZE = 320;

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const digest = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   state: {view: object}, marks: {state?: () => {marks: object[]}}}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountPhotometry(box, ctx) {
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
  const say = m => live.replaceChildren(el('p', { textContent: m }));
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
  const num = (value, min = 0.25) =>
    el('input', {
      type: 'number',
      step: 'any',
      min,
      value,
      className: 'ui-input',
    });
  const menu = (id, choices, choose) => {
    const s = el(
      'select',
      { className: 'ui-select' },
      ...choices.map(c => el('option', { value: c }))
    );
    labelled.push([s, id, 'options']);
    if (choose) s.onchange = choose;
    return s;
  };
  const ap0 = apertureFor(3);
  const target = el('select', { className: 'ui-select' });
  const xIn = num('', -Infinity);
  const yIn = num('', -Infinity);
  const fwhm = num(3);
  const rIn = num(ap0.r);
  const sIn = num(ap0.rIn);
  const oIn = num(ap0.rOut);
  const edge = menu('obs.ph.edge', ['exact', 'center']);
  const sky = menu('obs.ph.sky', ['annulus', 'plane']);
  const recentre = el('input', { type: 'checkbox' });
  const ring = menu('obs.ph.ring', RINGS, () => draw());
  const step = menu('obs.ph.step', Object.keys(STEPS));
  step.value = 'normal';
  const pic = el('canvas', { className: 'ph-pic', width: SIZE, height: SIZE });
  const help = word(el('p', { className: 'ui-hint' }), 'obs.ph.help');
  const out = el('div', { className: 'ph-readout' });
  const growth = el('div');
  const table = el('div', { className: 'im-tablewrap' });
  const keep = button('obs.ph.keep', () => doKeep());
  const csv = button('obs.ph.csv', () => doCsv());
  const stop = button('obs.ph.cancel', () => (run.stop = true));
  stop.hidden = true;
  const sizes = el(
    'div',
    { className: 'im-tools' },
    field('obs.ph.fwhm', fwhm),
    field('obs.ph.r', rIn),
    field('obs.ph.rIn', sIn),
    field('obs.ph.rOut', oIn)
  );
  const modes = el(
    'div',
    { className: 'im-tools' },
    field('obs.ph.edge', edge),
    field('obs.ph.sky', sky),
    el(
      'label',
      { className: 'im-field' },
      recentre,
      word(el('span'), 'obs.ph.recentre')
    )
  );
  const where = el(
    'div',
    { className: 'im-tools' },
    field('obs.ph.target', target),
    field('obs.ph.x', xIn),
    field('obs.ph.y', yIn)
  );
  const resize = el(
    'div',
    { className: 'im-tools', role: 'group' },
    field('obs.ph.ring', ring),
    button('obs.ph.smaller', () => bump(-1)),
    button('obs.ph.larger', () => bump(1)),
    field('obs.ph.step', step)
  );
  const actions = el(
    'div',
    { className: 'im-tools' },
    button('obs.ph.measure', () => doOne()),
    button('obs.ph.curve', () => doCurve()),
    button('obs.ph.all', () => doAll()),
    stop,
    keep,
    csv
  );
  word(pic, 'obs.ph.picture', 'ariaLabel');
  pic.setAttribute('role', 'img');
  box.replaceChildren(
    live,
    help,
    refusal,
    where,
    sizes,
    modes,
    resize,
    pic,
    actions,
    out,
    growth,
    table
  );

  // ---- the frame and its contract -----------------------------------------------
  let cur = null;
  let last = null;
  const run = { stop: false };
  const refreshSource = () => {
    const o = ctx.state.view;
    if (o?.kind !== 'image') return (cur = null);
    if (cur?.o === o) return cur;
    const [frame] = framesOf(o);
    const a = adapt(frame, permits);
    cur = { o, frame, a };
    last = null;
    out.replaceChildren();
    growth.replaceChildren();
    table.replaceChildren();
    return cur;
  };
  const why = r => {
    const text = t(`obs.ph.no.${r.code}`, {
      missing: (r.missing ?? []).join(', '),
      pixels: r.pixels,
      with: (r.with ?? []).join(', '),
      reason: r.reason ? t(`obs.ph.reason.${r.reason}`) : '',
    });
    return text;
  };
  const marksOf = () =>
    (ctx.marks.state?.().marks ?? []).filter(
      m => m.frame === 0 && (m.kind === 'point' || m.kind === 'count')
    );
  function fillTargets() {
    const keepId = target.value;
    const list = marksOf();
    target.replaceChildren(
      el('option', { value: '', textContent: t('obs.ph.typed') }),
      ...list.map(m =>
        el('option', {
          value: m.id,
          textContent: m.tag ? `${m.id} (${m.tag})` : m.id,
        })
      )
    );
    target.value = list.some(m => m.id === keepId) ? keepId : '';
  }
  function update() {
    const c = refreshSource();
    fillTargets();
    refusal.hidden = !c || c.a.ok;
    if (c && !c.a.ok) refusal.textContent = why(c.a);
    for (const b of actions.querySelectorAll('button')) b.disabled = !c?.a.ok;
    if (c && !xIn.value) {
      xIn.value = String(Math.round(c.frame.width / 2));
      yIn.value = String(Math.round(c.frame.height / 2));
    }
    draw();
  }

  // ---- the picture ----------------------------------------------------------------
  const geom = () => {
    const c = cur?.frame;
    const x = xIn.valueAsNumber - 1;
    const y = yIn.valueAsNumber - 1;
    const R = Math.ceil(oIn.valueAsNumber + 2);
    if (!c || ![x, y, R].every(Number.isFinite)) return null;
    const n = 2 * R + 1;
    return {
      c,
      x,
      y,
      R,
      n,
      k: Math.max(1, Math.floor(SIZE / n)),
      i0: Math.round(x) - R,
      j0: Math.round(y) - R,
    };
  };
  function draw() {
    const g = geom();
    const ctx2 = pic.getContext('2d');
    if (!ctx2 || !g) return;
    const { c, n, k, i0, j0 } = g;
    pic.width = pic.height = n * k;
    const vals = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const X = i0 + i;
        const Y = j0 + j;
        if (X >= 0 && Y >= 0 && X < c.width && Y < c.height)
          vals.push(c.data[Y * c.width + X]);
      }
    vals.sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * 0.01)] ?? 0;
    const hi = vals[Math.floor(vals.length * 0.998)] ?? 1;
    const scale = 255 / (hi > lo ? hi - lo : 1);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const X = i0 + i;
        const Y = j0 + j;
        const v =
          X >= 0 && Y >= 0 && X < c.width && Y < c.height
            ? (c.data[Y * c.width + X] - lo) * scale
            : 0;
        const q = Math.max(0, Math.min(255, v));
        ctx2.fillStyle = `rgb(${q},${q},${q})`;
        ctx2.fillRect(i * k, (n - 1 - j) * k, k, k);
      }
    const at = (x, y) => [(x - i0 + 0.5) * k, (n - 1 - (y - j0) + 0.5) * k];
    const [cx, cy] = at(g.x, g.y);
    ctx2.lineWidth = 2;
    RINGS.forEach((name, i) => {
      const r = [rIn, sIn, oIn][i].valueAsNumber;
      ctx2.strokeStyle =
        name === ring.value ? '#ffd400' : i ? '#5ac8ff' : '#ff6a3d';
      ctx2.setLineDash(i ? [6, 4] : []);
      ctx2.beginPath();
      ctx2.arc(cx, cy, r * k, 0, 2 * Math.PI);
      ctx2.stroke();
    });
    ctx2.setLineDash([]);
    ctx2.strokeStyle = '#ffffff';
    ctx2.beginPath();
    ctx2.moveTo(cx - 6, cy);
    ctx2.lineTo(cx + 6, cy);
    ctx2.moveTo(cx, cy - 6);
    ctx2.lineTo(cx, cy + 6);
    ctx2.stroke();
  }
  // The rings stay in order and apart: aperture < inner < outer.
  function setRing(name, v) {
    const boxes = { aperture: rIn, inner: sIn, outer: oIn };
    const lo = {
      aperture: 0.25,
      inner: rIn.valueAsNumber + 0.25,
      outer: sIn.valueAsNumber + 1,
    };
    const hi = {
      aperture: sIn.valueAsNumber - 0.25,
      inner: oIn.valueAsNumber - 1,
      outer: 1e6,
    };
    const r = Math.round(Math.min(hi[name], Math.max(lo[name], v)) * 4) / 4;
    boxes[name].value = String(r);
    draw();
    say(t('obs.ph.said.radius', { ring: t(`obs.ph.ring.${name}`), r: fmt(r) }));
  }
  const ringBox = () => ({ aperture: rIn, inner: sIn, outer: oIn })[ring.value];
  const bump = d =>
    setRing(ring.value, ringBox().valueAsNumber + d * STEPS[step.value]);
  pic.addEventListener('click', e => {
    const g = geom();
    if (!g) return;
    const r = pic.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * pic.width;
    const py = ((e.clientY - r.top) / r.height) * pic.height;
    const cx = (g.x - g.i0 + 0.5) * g.k;
    const cy = (g.n - 1 - (g.y - g.j0) + 0.5) * g.k;
    setRing(ring.value, Math.hypot(px - cx, py - cy) / g.k);
  });
  fwhm.onchange = () => {
    const a = apertureFor(fwhm.valueAsNumber);
    if (!(a.r > 0)) return;
    [rIn.value, sIn.value, oIn.value] = [a.r, a.rIn, a.rOut].map(v =>
      String(Math.round(v * 4) / 4)
    );
    draw();
  };
  for (const i of [xIn, yIn, rIn, sIn, oIn]) i.onchange = draw;
  target.onchange = () => {
    const m = marksOf().find(k => k.id === target.value);
    if (!m) return;
    [xIn.value, yIn.value] = m.pts[0].map(v =>
      String(Math.round(v * 100) / 100)
    );
    draw();
    say(
      t('obs.ph.said.target', {
        id: m.id,
        x: fmt(m.pts[0][0]),
        y: fmt(m.pts[0][1]),
      })
    );
  };

  // ---- measuring -------------------------------------------------------------------
  const specOf = (id, x, y) => {
    const f = apertureFor(fwhm.valueAsNumber);
    return {
      id,
      x: x - 1,
      y: y - 1,
      r: rIn.valueAsNumber,
      rIn: sIn.valueAsNumber,
      rOut: oIn.valueAsNumber,
      weighting: edge.value,
      background: sky.value,
      ...(recentre.checked
        ? { recentre: { half: f.half, sigmaW: f.sigmaW } }
        : {}),
    };
  };
  const valid = s =>
    [s.x, s.y, s.r, s.rIn, s.rOut].every(Number.isFinite) &&
    s.r > 0 &&
    s.rIn >= s.r &&
    s.rOut > s.rIn;
  function show(m, id) {
    if (!m.ok) {
      out.replaceChildren(el('p', { textContent: why(m) }));
      return say(t('obs.ph.said.refused', { id, why: why(m) }));
    }
    const line = text => el('p', { textContent: text });
    const lines = [];
    lines.push(
      m.detected
        ? t('obs.ph.net', {
            net: fmt(m.net),
            sigma: fmt(m.sigma, 3),
            snr: fmt(m.snr, 3),
          })
        : t('obs.ph.limit', {
            limit: fmt(m.upperLimit, 3),
            mag: fmt(m.magLimit, 3),
          })
    );
    if (m.detected)
      lines.push(
        t('obs.ph.mag', { mag: fmt(m.mag), sigma: fmt(m.magSigma, 2) })
      );
    lines.push(
      t('obs.ph.sky.line', {
        sky: fmt(m.sky),
        skySigma: fmt(m.skySigma, 2),
        n: m.skyPixels,
      })
    );
    const c = m.centroid;
    lines.push(
      t('obs.ph.pos', {
        x: fmt(m.x + 1, 5),
        y: fmt(m.y + 1, 5),
        sx: c ? fmt(c.sigmaX, 2) : '—',
        sy: c ? fmt(c.sigmaY, 2) : '—',
      })
    );
    lines.push(
      t('obs.ph.area', { area: fmt(m.area, 4) }),
      t(`obs.ph.route.${cur.a.route}`)
    );
    out.replaceChildren(
      el('p', { className: 'ui-hint' }, t('obs.ph.readout')),
      ...lines.map(line)
    );
    say(
      m.detected
        ? t('obs.ph.said.measured', {
            id,
            net: fmt(m.net),
            sigma: fmt(m.sigma, 3),
          })
        : t('obs.ph.said.limit', { id, limit: fmt(m.upperLimit, 3) })
    );
  }
  function doOne() {
    const c = refreshSource();
    if (!c?.a.ok) return;
    const s = specOf(target.value || 'm', xIn.valueAsNumber, yIn.valueAsNumber);
    if (!valid(s)) return;
    const m = measure(c.a, s);
    if (m.ok && m.centroid) {
      xIn.value = String(Math.round((m.x + 1) * 100) / 100);
      yIn.value = String(Math.round((m.y + 1) * 100) / 100);
      draw();
    }
    show(m, target.value || t('obs.ph.typed'));
  }
  function doCurve() {
    const c = refreshSource();
    if (!c?.a.ok) return;
    const s = specOf('curve', xIn.valueAsNumber, yIn.valueAsNumber);
    if (!valid(s)) return;
    const radii = Array.from(
      { length: 10 },
      (_, i) => Math.round(((i + 1) / 10) * s.rIn * 4) / 4
    ).filter((r, i, a) => r > 0 && a.indexOf(r) === i);
    const g = curveOfGrowth(c.a, { ...s, recentre: undefined }, radii);
    if (!g.ok) return growth.replaceChildren(el('p', { textContent: why(g) }));
    const top = g.net[g.net.length - 1];
    const cap = el('caption', { textContent: t('obs.ph.growth.caption') });
    const head = el(
      'tr',
      {},
      ...['r', 'net', 'frac'].map(k =>
        el('th', { scope: 'col', textContent: t(`obs.ph.growth.${k}`) })
      )
    );
    const rows = radii.map((r, i) =>
      el(
        'tr',
        {},
        el('th', { scope: 'row', textContent: fmt(r) }),
        el('td', { textContent: fmt(g.net[i]) }),
        el('td', { textContent: fmt(g.net[i] / top, 3) })
      )
    );
    growth.replaceChildren(
      el(
        'div',
        { className: 'im-tablewrap' },
        el(
          'table',
          { className: 'im-table' },
          cap,
          el('thead', {}, head),
          el('tbody', {}, ...rows)
        )
      )
    );
    say(t('obs.ph.said.curve', { r: fmt(g.plateau) }));
  }
  async function doAll() {
    const c = refreshSource();
    if (!c?.a.ok) return;
    const list = marksOf();
    if (!list.length) return say(t('obs.ph.noMarks'));
    const sources = list.map(m => specOf(m.id, m.pts[0][0], m.pts[0][1]));
    if (!sources.every(valid)) return;
    run.stop = false;
    stop.hidden = false;
    const b = await measureBatch(c.frame, sources, {
      check: permits,
      signal: {
        get aborted() {
          return run.stop;
        },
      },
      chunk: 20,
    });
    stop.hidden = true;
    last = { b, a: c.a, frame: c.frame, setId: c.o.id };
    renderTable(b.results);
    const done = b.results.filter(r => r.ok && r.detected).length;
    say(
      b.cancelled
        ? t('obs.ph.said.cancelled', {
            n: b.results.length,
            total: sources.length,
          })
        : t('obs.ph.said.batch', {
            n: done,
            total: sources.length,
            other: b.results.length - done,
          })
    );
  }
  function renderTable(results) {
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    const head = el(
      'tr',
      {},
      ...COLS.map(k => cell('th', t(`obs.ph.col.${k}`), { scope: 'col' }))
    );
    const rows = results.map(r =>
      el(
        'tr',
        {},
        cell('th', r.id, { scope: 'row' }),
        ...(r.ok
          ? [
              fmt(r.x + 1, 5),
              fmt(r.y + 1, 5),
              r.detected ? fmt(r.net) : `< ${fmt(r.upperLimit, 3)}`,
              fmt(r.sigma, 3),
              fmt(r.snr, 3),
              fmt(r.sky),
              r.detected ? fmt(r.mag) : `> ${fmt(r.magLimit, 3)}`,
              t(r.detected ? 'obs.ph.status.measured' : 'obs.ph.status.limit'),
            ].map(v => cell('td', v))
          : [...Array(7).fill(''), why(r)].map(v => cell('td', v)))
      )
    );
    table.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.ph.table')),
        el('thead', {}, head),
        el('tbody', {}, ...rows)
      )
    );
  }

  // ---- the ledger and the file ---------------------------------------------------------
  async function doKeep() {
    if (!last?.b.results.length) return;
    try {
      const { frame, a, b, setId } = last;
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const d = await digest(frame);
      const envelope = artifact({
        id: `photometry-${setId}`.slice(0, 120),
        source: { kind: 'observation', id: setId, digest: d },
        quantities: quantitiesOf(b.results, { unit: a.unit }),
        provenance: { reductions: [reductionOf(frame, d, a, b.results)] },
        made: { app: 'gravitas', tool: 'image-photometry' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_PHOTOMETRY,
        envelope,
        title: t('obs.ph.ledgerEntry', { title: setId }),
        labels: {
          quantity: q => {
            const [id, kind] = q.id.split('.');
            return `${id}: ${t(`obs.ph.q.${kind}`)}`;
          },
        },
        context: { page: 'observatory', observation: { id: setId } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.ph.said.kept', { n: envelope.quantities.length }));
    } catch (err) {
      say(t('obs.ph.said.keepFailed', { why: err.message }));
    }
  }
  function doCsv() {
    if (!last?.b.results.length) return;
    const rows = csvRows(
      last.b.results,
      CSV_COLS.map(k => t(`obs.ph.col.${k}`))
    );
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', { href: url, download: `${last.setId}-photometry.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say(t('obs.ph.said.csv', { n: rows.length - 1 }));
  }

  // ---- words, and the page's language --------------------------------------------------
  function label() {
    for (const [n, id, prop] of labelled) {
      if (prop === 'options')
        for (const o of n.options)
          o.textContent = t(
            id === 'obs.ph.ring'
              ? `obs.ph.ring.${o.value}`
              : id === 'obs.ph.step'
                ? `obs.ph.step.${o.value}`
                : `${id}.${o.value}`
          );
      else n[prop] = t(id);
    }
    fillTargets();
    if (cur && !cur.a.ok) refusal.textContent = why(cur.a);
    if (last) renderTable(last.b.results);
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  label();
  box.addEventListener('focusin', fillTargets);
  update();
  return { update };
}
