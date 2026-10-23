// =============================================================================
// Finding sources on an image, and the width of the stars (Prompt 183, DETECTION.md)
// -----------------------------------------------------------------------------
// The sources above the local sky as a table (position, size, light, shape,
// flags), drawn on the image, added to the marks table or saved as CSV; and the
// point-spread function measured from the stars among them, with the stacked
// radial profile through the plot component and a fit-result record in the
// ledger. The arithmetic is js/measure/detect.js over js/measure/photometry.js;
// this is the page around it.
//   find     one button; the threshold and the smallest source are behind the
//            settings disclosure
//   width    choose the model and the weights, press Measure the width
// A frame whose pixels are not a measure of light refuses, in words, and no
// number is shown. Nothing here takes a key: every control is a button, a box
// or a menu. Loaded when the panel first opens; it reaches
// js/observatory/imageMarks.js (the frames, the contract's `permits`, the marks)
// by import() so no chunk is shared with it.
// =============================================================================

import { adapt } from '../measure/photometry.js';
import {
  DEFAULTS,
  SELECT,
  csvRows,
  detectIn,
  measurePsf,
  psfRecord,
  reductionOf,
  selectStars,
} from '../measure/detect.js';
import { toCsv, num } from '../csv.js';
import { roundSig } from '../format.js';
import { sha256Hex } from '../hash.js';

const WORDS = {
  en: () => import('../i18n/en.imageDetect.js').then(m => m.EN_IMAGEDETECT),
  es: () => import('../i18n/es.imageDetect.js').then(m => m.ES_IMAGEDETECT),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const COLS = [
  'id',
  'x',
  'y',
  'area',
  'peak',
  'flux',
  'snr',
  'ellipticity',
  'orientation',
  'fwhm',
  'flags',
  'psf',
];
const CSV_COLS = [
  'id',
  'x',
  'y',
  'area',
  'peak',
  'flux',
  'fluxSigma',
  'snr',
  'ellipticity',
  'orientation',
  'fwhm',
  'flags',
];
const ROWS = 200;
const SIZE = 480;

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const digestOf = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   createPlot: Function, state: {view: object}, marks: {add?: Function}}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountDetect(box, ctx) {
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
  const input = (value, min, step = 'any') =>
    el('input', { type: 'number', step, min, value, className: 'ui-input' });
  const menu = (id, choices) => {
    const s = el(
      'select',
      { className: 'ui-select' },
      ...choices.map(c => el('option', { value: c }))
    );
    labelled.push([s, id, 'options']);
    return s;
  };

  const fwhmIn = input(DEFAULTS.fwhm, 0.5);
  const sigmaIn = input(DEFAULTS.sigma, 2);
  const areaIn = input(DEFAULTS.minArea, 1, 1);
  const boxIn = input(DEFAULTS.box, 4, 1);
  const snrIn = input(SELECT.snr, 5);
  const model = menu('obs.dt.model', ['gaussian', 'moffat']);
  const weights = menu('obs.dt.weights', ['poisson', 'none']);
  const settings = el(
    'details',
    { className: 'ui-disclosure' },
    word(el('summary'), 'obs.dt.settings'),
    el(
      'div',
      { className: 'im-tools' },
      field('obs.dt.sigma', sigmaIn),
      field('obs.dt.area', areaIn),
      field('obs.dt.box', boxIn)
    ),
    word(el('p', { className: 'ui-hint' }), 'obs.dt.settingsNote')
  );
  const pic = el('canvas', { className: 'dt-pic', width: SIZE, height: SIZE });
  word(pic, 'obs.dt.picture', 'ariaLabel');
  pic.setAttribute('role', 'img');
  const out = el('div', { className: 'ph-readout' });
  const table = el('div', { className: 'im-tablewrap' });
  const marksBtn = button('obs.dt.marks', () => doMarks());
  const csvBtn = button('obs.dt.csv', () => doCsv());
  const detectBtn = button('obs.dt.detect', () => doDetect());
  const psfBtn = button('obs.dt.psf', () => doPsf());
  const keepBtn = button('obs.dt.keep', () => doKeep());
  const psfOut = el('div', { className: 'ph-readout' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ow-plot');
  svg.setAttribute('role', 'img');
  svg.hidden = true;
  const profileTable = el('div', { className: 'im-tablewrap' });
  const plot = ctx.createPlot(svg, {
    number: ctx.number,
    labels: { notStated: t('obs.unit.notStated') },
  });
  const actions = [detectBtn, marksBtn, csvBtn];
  const psfActions = [psfBtn, keepBtn];
  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.dt.help'),
    refusal,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.dt.fwhm', fwhmIn),
      detectBtn,
      marksBtn,
      csvBtn
    ),
    settings,
    pic,
    out,
    table,
    word(el('p', { className: 'ui-hint' }), 'obs.dt.limits'),
    word(el('h4'), 'obs.dt.psfTitle'),
    word(el('p', { className: 'ui-hint' }), 'obs.dt.psfHelp'),
    el(
      'div',
      { className: 'im-tools' },
      field('obs.dt.model', model),
      field('obs.dt.weights', weights),
      field('obs.dt.snr', snrIn),
      psfBtn,
      keepBtn
    ),
    psfOut,
    svg,
    profileTable
  );
  marksBtn.hidden = !ctx.marks.add;

  // ---- the frame and its contract -----------------------------------------------
  let cur = null;
  let det = null;
  let psf = null;
  let picked = new Set();
  const why = r =>
    t(`obs.dt.no.${r.code}`, {
      missing: (r.missing ?? []).join(', '),
      name: r.name,
      pixels: r.pixels,
    });
  const refresh = () => {
    const o = ctx.state.view;
    if (o?.kind !== 'image') return (cur = null);
    if (cur?.o === o) return cur;
    const [frame] = framesOf(o);
    cur = { o, frame, a: adapt(frame, permits) };
    det = psf = null;
    picked = new Set();
    for (const n of [out, table, psfOut, profileTable]) n.replaceChildren();
    svg.hidden = true;
    return cur;
  };
  function update() {
    const c = refresh();
    refusal.hidden = !c || c.a.ok;
    if (c && !c.a.ok) refusal.textContent = why(c.a);
    for (const b of [...actions, ...psfActions]) b.disabled = !c?.a.ok;
    marksBtn.disabled = !det;
    csvBtn.disabled = !det;
    psfBtn.disabled = !det || !c?.a.ok;
    keepBtn.disabled = !psf;
    draw();
  }

  // ---- the picture -----------------------------------------------------------------
  function draw() {
    const g2 = pic.getContext('2d');
    const c = cur?.frame;
    if (!g2 || !c) return;
    // Data row 0 is the bottom row, as in the marks panel and the photometry tool.
    const k = Math.max(1, Math.floor(SIZE / Math.max(c.width, c.height)));
    const step = Math.max(1, Math.ceil(Math.max(c.width, c.height) / SIZE));
    const cols = Math.ceil(c.width / step);
    const rows = Math.ceil(c.height / step);
    pic.width = cols * k;
    pic.height = rows * k;
    const sample = [];
    const every = Math.max(1, Math.floor((c.width * c.height) / 20000));
    for (let i = 0; i < c.data.length; i += every) sample.push(c.data[i]);
    sample.sort((p, q) => p - q);
    const lo = sample[Math.floor(sample.length * 0.01)] ?? 0;
    const hi = sample[Math.floor(sample.length * 0.998)] ?? 1;
    const gain = 255 / (hi > lo ? hi - lo : 1);
    const img = g2.createImageData(pic.width, pic.height);
    for (let j = 0; j < pic.height; j++) {
      const Y = Math.min(c.height - 1, (rows - 1 - Math.floor(j / k)) * step);
      for (let i = 0; i < pic.width; i++) {
        const X = Math.min(c.width - 1, Math.floor(i / k) * step);
        const v = Math.max(
          0,
          Math.min(255, (c.data[Y * c.width + X] - lo) * gain)
        );
        const p = (j * pic.width + i) * 4;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
        img.data[p + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    if (!det) return;
    g2.lineWidth = 2;
    for (const s of det.sources) {
      const cx = (s.x / step + 0.5) * k;
      const cy = (rows - 1 - s.y / step + 0.5) * k;
      const chosen = picked.has(s.id);
      g2.strokeStyle = chosen ? '#ffd400' : '#ff6a3d';
      g2.beginPath();
      g2.arc(cx, cy, 7, 0, 2 * Math.PI);
      g2.stroke();
      if (chosen) {
        g2.beginPath();
        g2.arc(cx, cy, 11, 0, 2 * Math.PI);
        g2.stroke();
      }
    }
  }

  // ---- detection ---------------------------------------------------------------------
  const settle = () => new Promise(r => setTimeout(r, 0));
  async function doDetect() {
    const c = refresh();
    if (!c?.a.ok) return;
    say(t('obs.dt.said.working'));
    await settle();
    const d = detectIn(c.a, {
      fwhm: fwhmIn.valueAsNumber,
      sigma: sigmaIn.valueAsNumber,
      minArea: areaIn.valueAsNumber,
      box: boxIn.valueAsNumber,
    });
    psf = null;
    psfOut.replaceChildren();
    profileTable.replaceChildren();
    svg.hidden = true;
    if (!d.ok) {
      det = null;
      picked = new Set();
      table.replaceChildren();
      out.replaceChildren(el('p', { textContent: why(d) }));
      update();
      return say(why(d));
    }
    det = d;
    picked = new Set(selectStars(det, selectCriteria()).map(s => s.id));
    const flagged = d.sources.filter(s => s.flags.length).length;
    out.replaceChildren(
      el('p', {
        textContent: t('obs.dt.found', { n: d.sources.length, m: flagged }),
      }),
      ...(d.truncated
        ? [
            el('p', {
              textContent: t('obs.dt.truncated', { n: d.params.maxSources }),
            }),
          ]
        : []),
      el('p', { className: 'ui-hint', textContent: t('obs.dt.flagHelp') })
    );
    renderTable();
    update();
    say(
      d.sources.length
        ? t('obs.dt.said.detected', { n: d.sources.length, m: flagged })
        : t('obs.dt.said.none', { sigma: fmt(d.params.sigma) })
    );
  }
  const selectCriteria = () => ({
    snr: snrIn.valueAsNumber > 0 ? snrIn.valueAsNumber : SELECT.snr,
  });
  function renderTable() {
    if (!det) return table.replaceChildren();
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    const head = el(
      'tr',
      {},
      ...COLS.map(k => cell('th', t(`obs.dt.col.${k}`), { scope: 'col' }))
    );
    const list = det.sources
      .slice()
      .sort((p, q) => (q.snr ?? -Infinity) - (p.snr ?? -Infinity))
      .slice(0, ROWS);
    const rows = list.map(s =>
      el(
        'tr',
        {},
        cell('th', s.id, { scope: 'row' }),
        ...[
          fmt(s.x + 1, 5),
          fmt(s.y + 1, 5),
          String(s.area),
          fmt(s.peak),
          s.flux === null ? t('obs.dt.noFlux') : fmt(s.flux),
          s.snr === null ? '—' : fmt(s.snr, 3),
          s.shape ? fmt(s.ellipticity, 3) : '—',
          s.shape ? fmt(s.orientation, 3) : '—',
          s.shape ? fmt(s.fwhm, 3) : '—',
          s.flags.map(f => t(`obs.dt.flag.${f}`)).join(', '),
          picked.has(s.id) ? t('obs.dt.yes') : '',
        ].map(v => cell('td', v))
      )
    );
    table.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.dt.table')),
        el('thead', {}, head),
        el('tbody', {}, ...rows)
      )
    );
  }
  function doMarks() {
    if (!det || !ctx.marks.add) return;
    const n = ctx.marks.add(
      det.sources.map(s => [s.x + 1, s.y + 1]),
      'detected'
    );
    say(
      n < det.sources.length
        ? t('obs.dt.said.marksFull', { n, total: det.sources.length })
        : t('obs.dt.said.marks', { n })
    );
  }
  function download(text, name) {
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function doCsv() {
    if (!det) return;
    const rows = csvRows(
      det,
      CSV_COLS.map(k => t(`obs.dt.col.${k}`)),
      num
    );
    download(toCsv(rows), `${cur.o.id}-sources.csv`);
    say(t('obs.dt.said.csv', { n: rows.length - 1 }));
  }

  // ---- the width of the stars --------------------------------------------------------
  async function doPsf() {
    const c = refresh();
    if (!c?.a.ok || !det) return;
    say(t('obs.dt.said.working'));
    await settle();
    const chosen = selectStars(det, selectCriteria());
    picked = new Set(chosen.map(s => s.id));
    const r = measurePsf(
      c.a,
      det,
      chosen.map(s => ({
        id: s.id,
        x: s.x,
        y: s.y,
        flux: s.flux,
        fwhm: s.fwhm,
      })),
      { model: model.value, weights: weights.value }
    );
    renderTable();
    draw();
    if (!r.ok) {
      psf = null;
      svg.hidden = true;
      profileTable.replaceChildren();
      psfOut.replaceChildren(
        el('p', { textContent: why(chosen.length ? r : { code: 'no-stars' }) })
      );
      update();
      return say(why(chosen.length ? r : { code: 'no-stars' }));
    }
    psf = r;
    const line = x => el('p', { textContent: x });
    psfOut.replaceChildren(
      line(
        t('obs.dt.fwhmLine', {
          fwhm: fmt(r.fwhm.mean, 4),
          sigma: fmt(r.fwhm.sigma, 2),
        })
      ),
      ...(r.beta
        ? [
            line(
              t('obs.dt.betaLine', {
                beta: fmt(r.beta.mean, 3),
                sigma: fmt(r.beta.sigma, 2),
              })
            ),
          ]
        : []),
      line(
        t('obs.dt.starsLine', {
          n: r.stars.length,
          refused: r.refused.length,
          chi2: r.chi2red === null ? '—' : fmt(r.chi2red, 3),
        })
      ),
      ...(r.fwhm.scaled
        ? [
            el('p', {
              className: 'ui-hint',
              textContent: t('obs.dt.scaled', { chi2: fmt(r.fwhm.chi2red, 3) }),
            }),
          ]
        : []),
      ...(r.modelLimited
        ? [
            el('p', {
              className: 'ui-status is-error',
              textContent: t('obs.dt.modelLimited'),
            }),
          ]
        : [])
    );
    renderProfile();
    update();
    say(
      t('obs.dt.said.psf', {
        fwhm: fmt(r.fwhm.mean, 4),
        sigma: fmt(r.fwhm.sigma, 2),
        n: r.stars.length,
      })
    );
  }
  /** The model's profile at a radius: the unit-flux density of the fitted function. */
  const modelAt = (r, fwhm, beta) => {
    if (beta === null) {
      const s2 = (fwhm / 2.3548200450309493) ** 2;
      return Math.exp(-(r * r) / (2 * s2)) / (2 * Math.PI * s2);
    }
    const a = fwhm / (2 * Math.sqrt(2 ** (1 / beta) - 1));
    return ((beta - 1) / (Math.PI * a * a)) * (1 + (r * r) / (a * a)) ** -beta;
  };
  function renderProfile() {
    if (!psf?.profile.length) return;
    const bins = psf.profile;
    const o = {
      kind: 'time-series',
      columns: [
        {
          id: 'r',
          name: t('obs.dt.profile.r'),
          unit: 'pix',
          role: 'x',
          values: bins.map(b => b.r),
        },
        {
          id: 'v',
          name: t('obs.dt.profile.value'),
          unit: '',
          role: 'value',
          values: bins.map(b => b.value),
        },
        {
          id: 'e',
          name: t('obs.dt.profile.sem'),
          unit: '',
          role: 'uncertainty',
          of: 'v',
          values: bins.map(b => b.sem ?? NaN),
        },
      ],
      axes: { x: 'r', y: 'v' },
      masks: [],
    };
    const top = bins[bins.length - 1].r;
    const curve = Array.from({ length: 61 }, (_, i) => {
      const r = (i / 60) * top;
      return [r, modelAt(r, psf.fwhm.mean, psf.beta?.mean ?? null)];
    });
    svg.hidden = false;
    plot.draw(o, {
      xColumn: 'r',
      yColumn: 'v',
      overlays: [{ label: t('obs.dt.profile.model'), points: curve }],
    });
    svg.setAttribute(
      'aria-label',
      t('obs.dt.profileLabel', { n: psf.stars.length })
    );
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    profileTable.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.dt.profile.table')),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...['r', 'value', 'sem', 'stars'].map(k =>
              cell('th', t(`obs.dt.profile.${k}`), { scope: 'col' })
            )
          )
        ),
        el(
          'tbody',
          {},
          ...bins.map(b =>
            el(
              'tr',
              {},
              cell('th', fmt(b.r, 3), { scope: 'row' }),
              ...[
                fmt(b.value, 4),
                b.sem === null ? '—' : fmt(b.sem, 2),
                String(b.stars),
              ].map(v => cell('td', v))
            )
          )
        )
      ),
      el('p', {
        className: 'ui-hint',
        textContent: psf.profileFwhm
          ? t('obs.dt.profile.width', { w: fmt(psf.profileFwhm, 3) })
          : '',
      })
    );
  }

  // ---- the ledger -------------------------------------------------------------------------
  async function doKeep() {
    if (!psf || !cur) return;
    try {
      const { frame, o } = cur;
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const d = await digestOf(frame);
      const { quantities, fit } = psfRecord(psf);
      const envelope = artifact({
        id: `psf-${o.id}`.slice(0, 120),
        source: { kind: 'observation', id: o.id, digest: d },
        quantities,
        fit,
        provenance: { reductions: [reductionOf(frame, d, det, psf)] },
        made: { app: 'gravitas', tool: 'image-psf' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_DETECTION,
        envelope,
        title: t('obs.dt.ledgerEntry', { title: o.id }),
        labels: {
          quantity: q => t(`obs.dt.q.${q.id.split('.')[1]}`),
        },
        context: { page: 'observatory', observation: { id: o.id } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.dt.said.kept'));
    } catch (err) {
      say(t('obs.dt.said.keepFailed', { why: err.message }));
    }
  }

  // ---- words, and the page's language ---------------------------------------------------
  function label() {
    for (const [n, id, prop] of labelled) {
      if (prop === 'options')
        for (const o of n.options) o.textContent = t(`${id}.${o.value}`);
      else n[prop] = t(id);
    }
    if (cur && !cur.a.ok) refusal.textContent = why(cur.a);
    renderTable();
    if (psf) renderProfile();
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  label();
  update();
  return { update };
}
