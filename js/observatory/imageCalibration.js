// =============================================================================
// Sky coordinates for an image (Prompt 181, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// The page around js/measure/astrometry.js: a table of reference stars (a name,
// where each is in the picture, where it is on the sky), a solve, the solution
// with its uncertainties and its residuals, what the image's own header says,
// and a reading of any pixel or sky position through the solution.
//   stars      typed, taken from the point marks (the marks panel), or looked up
//              by name in the bright-star pack (the site's own file, fetched only
//              when that button is pressed)
//   solve      a linear fit with no distortion terms; it refuses, in words, with
//              fewer than three stars, stars in a line or a field too wide, and
//              it says when its residuals do not fit the stated uncertainties
//   keep       the solution as one record in the ledger (it can be run again),
//              and in the workspace file as `workspace.calibration`
// Nothing here takes a key: every control is a button, a box or a menu, so the
// keyboard path is the browser's own. Loaded when the panel first opens. It
// imports nothing the marks panel imports, so no chunk is shared with it.
// =============================================================================

import {
  DEFAULT_SIGMA,
  checkWcs,
  describeWcs,
  formatDec,
  formatRa,
  fitWcs,
  fromHeader,
  parseAngle,
  pixelOf,
  skyOf,
  uncertaintyAt,
} from '../measure/astrometry.js';
import {
  calibrationBlock,
  catalogOf,
  digestFrame,
  mjdOf,
  replay,
  validateCalibration,
  writeRecord,
} from '../measure/calibrationRecord.js';
import { loadStarFile } from '../kernels/sky/packs.js';
import { columnOf } from './schema.js';
import { decimalSeparatorFor } from '../answerParse.js';
import { roundSig } from '../format.js';

const WORDS = {
  en: () =>
    import('../i18n/en.imageCalibration.js').then(m => m.EN_IMAGECALIBRATION),
  es: () =>
    import('../i18n/es.imageCalibration.js').then(m => m.ES_IMAGECALIBRATION),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const FIELDS = ['name', 'x', 'y', 'ra', 'dec', 'sigma'];
/** The pack's own rounding (1e-4 degree) as a sigma on each coordinate, arcseconds. */
const PACK_SIGMA = 0.1;

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

/** The pixels of an image observation as a frame the record can digest. */
const frameOf = o => {
  const v = columnOf(o, o.image.value).values;
  return {
    id: o.id,
    width: o.image.width,
    height: o.image.height,
    data: v instanceof Float64Array ? v : Float64Array.from(v),
  };
};

/** The lookup text of a pack row: its name, designation without the Flamsteed number, and `HR n`. */
export const keysOf = r =>
  [
    r[8],
    r[7].replace(/^\d+\s+/, ''),
    r[7],
    `hr ${r[0]}`,
    `hr${r[0]}`,
    String(r[0]),
  ]
    .filter(Boolean)
    .map(k => String(k).toLowerCase());

/** A pack row's position at an MJD (or at J2000.0 with none): degrees. */
export function starAt(r, mjd) {
  const yr = Number.isFinite(mjd) ? (mjd - 51544.5) / 365.25 : 0;
  const dec = r[2] / 1e4;
  return {
    ra: r[1] / 1e4 + (r[5] / 3.6e6 / Math.cos((dec * Math.PI) / 180)) * yr,
    dec: dec + (r[6] / 3.6e6) * yr,
  };
}

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   state: {view: object}, marks: object}} ctx - `marks` is the page's hand-over:
 *   it holds `savedCal` until taken, and gets `cal` ({block, update}) for the workspace save
 * @returns {Promise<{update: () => void}>}
 */
export async function mountCalibration(box, ctx) {
  await words(ctx);
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
  const button = (id, onclick, act) => {
    const b = word(
      el('button', { type: 'button', className: 'ui-button is-small' }),
      id
    );
    b.onclick = onclick;
    if (act) b.dataset.act = act;
    return b;
  };
  const field = (id, control) =>
    el('label', { className: 'im-field' }, word(el('span'), id), control);
  const menu = (id, choices) => {
    const s = el(
      'select',
      { className: 'ui-select' },
      ...choices.map(c => el('option', { value: c }))
    );
    labelled.push([s, id, 'options']);
    return s;
  };
  const text = (props = {}) => el('input', { className: 'ui-input', ...props });
  const num = (props = {}) =>
    el('input', {
      type: 'number',
      step: 'any',
      className: 'ui-input',
      ...props,
    });

  // ---- the page ---------------------------------------------------------------
  const intro = word(el('p', { className: 'ui-hint' }), 'obs.cal.intro');
  const headerBox = el('div', { className: 'cal-header' });
  const refusal = el('p', { className: 'ui-status is-error', hidden: true });
  const coords = menu('obs.cal.coords', ['deg', 'hms']);
  const model = menu('obs.cal.model', ['affine', 'similarity']);
  const parity = menu('obs.cal.parity', ['-1', '1']);
  const tanRa = text({ size: 12 });
  const tanDec = text({ size: 12 });
  const epoch = text({ size: 24, maxLength: 80 });
  const options = el(
    'div',
    { className: 'im-tools' },
    field('obs.cal.coordsLabel', coords),
    field('obs.cal.modelLabel', model),
    field('obs.cal.parityLabel', parity),
    field('obs.cal.tangentRa', tanRa),
    field('obs.cal.tangentDec', tanDec),
    field('obs.cal.epoch', epoch)
  );
  const table = el('table', { className: 'im-table cal-table' });
  const caption = word(el('caption'), 'obs.cal.table');
  const head = el('tr');
  const tbody = el('tbody');
  table.append(caption, el('thead', {}, head), tbody);
  const wrap = el('div', { className: 'im-tablewrap' }, table);
  const out = el('div', { className: 'cal-out', hidden: true });
  const readouts = el('div', { className: 'cal-read', hidden: true });
  const pxIn = num({ min: -1e9 });
  const pyIn = num({ min: -1e9 });
  const raIn = text({ size: 12 });
  const decIn = text({ size: 12 });
  const skyAt = el('output', { className: 'ui-hint' });
  const pixAt = el('output', { className: 'ui-hint' });
  readouts.append(
    el(
      'div',
      { className: 'im-tools' },
      field('obs.cal.px', pxIn),
      field('obs.cal.py', pyIn),
      button('obs.cal.toSky', () => showSky(), 'toSky'),
      skyAt
    ),
    el(
      'div',
      { className: 'im-tools' },
      field('obs.cal.skyRa', raIn),
      field('obs.cal.skyDec', decIn),
      button('obs.cal.toPixel', () => showPixel(), 'toPixel'),
      pixAt
    )
  );
  const actions = el(
    'div',
    { className: 'im-tools' },
    button('obs.cal.add', () => addRow(), 'add'),
    button('obs.cal.marks', () => useMarks(), 'marks'),
    button('obs.cal.lookup', () => lookup(), 'lookup'),
    button('obs.cal.clear', () => clearRows(), 'clear'),
    button('obs.cal.solve', () => solve(), 'solve'),
    button('obs.cal.keep', () => keep(), 'keep')
  );
  const note = word(el('p', { className: 'ui-hint' }), 'obs.cal.limits');
  box.replaceChildren(
    intro,
    headerBox,
    options,
    wrap,
    actions,
    refusal,
    out,
    readouts,
    note,
    live
  );

  // ---- state ------------------------------------------------------------------
  let obs = null;
  let frame = null;
  let digest = null;
  let fit = null; // fitWcs's answer for the table as it stands, or null
  let chosen = null; // 'fit' | 'header' | null: which WCS the record and readouts use
  let headerWcs = null;
  let catalog = null; // set by a look-up; null: the positions were typed
  let starDoc = null;
  let saved = ctx.marks.savedCal ?? null;
  delete ctx.marks.savedCal;

  const label = () => {
    for (const [n, id, prop] of labelled) {
      if (prop === 'options')
        for (const o of n.options) o.textContent = t(`${id}.${o.value}`);
      else n[prop] = t(id);
    }
    head.replaceChildren(
      ...FIELDS.map(c =>
        el('th', { scope: 'col', textContent: t(`obs.cal.col.${c}`) })
      ),
      el('th', {
        scope: 'col',
        className: 'visually-hidden',
        textContent: t('obs.cal.col.remove'),
      })
    );
    [...tbody.rows].forEach((r, i) => nameRow(r, i + 1));
    if (fit) showFit();
    showHeader();
  };
  const nameRow = (tr, n) => {
    for (const f of FIELDS)
      tr.querySelector(`[data-f="${f}"]`).setAttribute(
        'aria-label',
        t('obs.cal.cell', { n, field: t(`obs.cal.col.${f}`) })
      );
    const rm = tr.querySelector('button');
    rm.textContent = t('obs.cal.remove');
    rm.setAttribute('aria-label', t('obs.cal.removeStar', { n }));
  };
  function addRow(v = {}) {
    const cells = {
      name: text({ size: 10, maxLength: 40 }),
      x: num({ min: -1e9 }),
      y: num({ min: -1e9 }),
      ra: text({ size: 12, inputMode: 'decimal' }),
      dec: text({ size: 12, inputMode: 'decimal' }),
      sigma: num({ min: 0, placeholder: String(DEFAULT_SIGMA) }),
    };
    const tr = el('tr');
    for (const f of FIELDS) {
      cells[f].dataset.f = f;
      if (v[f] !== undefined) cells[f].value = v[f];
      tr.append(el('td', {}, cells[f]));
    }
    tr.append(
      el(
        'td',
        {},
        el('button', { type: 'button', className: 'ui-button is-small' })
      )
    );
    tr.dataset.catalogue = v.catalogue ? '1' : '';
    tbody.append(tr);
    nameRow(tr, tbody.rows.length);
    return tr;
  }
  function clearRows() {
    tbody.replaceChildren();
    stale();
    catalog = null;
    say(t('obs.cal.cleared'));
  }
  /** A change to the table or the options: the last solution no longer describes them. */
  function stale() {
    if (!fit) return;
    fit = null;
    if (chosen === 'fit') chosen = null;
    out.hidden = readouts.hidden = true;
  }
  // One listener for every row (wired once; the rows come and go).
  tbody.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const tr = b.closest('tr');
    const n = [...tbody.rows].indexOf(tr) + 1;
    tr.remove();
    [...tbody.rows].forEach((r, i) => nameRow(r, i + 1));
    stale();
    say(t('obs.cal.removed', { n }));
  });
  box.addEventListener('input', e => {
    if (e.target.closest('.cal-read')) return;
    stale();
    if (
      e.target.closest('tr')?.dataset.catalogue &&
      e.target.dataset.f !== 'name'
    )
      e.target.closest('tr').dataset.catalogue = '';
  });
  parity.parentElement.hidden = true;
  model.onchange = () => {
    parity.parentElement.hidden = model.value !== 'similarity';
  };

  // ---- reading the table -----------------------------------------------------------
  const hours = () => coords.value === 'hms';
  const lang = () => ctx.language?.() ?? 'en';
  const comma = () => decimalSeparatorFor(lang()) === ',';
  /** The stars of the table, or the first thing wrong with it. */
  function readRows() {
    const stars = [];
    for (const [i, tr] of [...tbody.rows].entries()) {
      const v = Object.fromEntries(
        FIELDS.map(f => [f, tr.querySelector(`[data-f="${f}"]`).value.trim()])
      );
      if (FIELDS.every(f => !v[f])) continue;
      const n = i + 1;
      const bad = f => ({
        code: 'cell',
        data: { n, field: t(`obs.cal.col.${f}`) },
      });
      const cell = f => tr.querySelector(`[data-f="${f}"]`);
      // A number field's value is the browser's own (a point, whatever the language).
      const x = cell('x').valueAsNumber;
      const y = cell('y').valueAsNumber;
      if (!Number.isFinite(x)) return { error: bad('x') };
      if (!Number.isFinite(y)) return { error: bad('y') };
      const ra = parseAngle(v.ra, { hours: hours(), comma: comma() });
      const dec = parseAngle(v.dec, { comma: comma() });
      if (!Number.isFinite(ra)) return { error: bad('ra') };
      if (!Number.isFinite(dec)) return { error: bad('dec') };
      const star = { id: v.name || String(n), x, y, ra, dec };
      if (v.name) star.name = v.name;
      if (v.sigma !== '') {
        const s = cell('sigma').valueAsNumber;
        if (!(s > 0)) return { error: bad('sigma') };
        star.sigma = s;
      }
      if (tr.dataset.catalogue) star.catalogSigma = PACK_SIGMA;
      stars.push(star);
    }
    return { stars };
  }
  const refuse = (code, data = {}) => {
    refusal.hidden = false;
    const key = code === 'too-wide' && data.id === null ? 'too-wide-all' : code;
    refusal.textContent = t(`obs.cal.refuse.${key}`, data);
    say(refusal.textContent);
  };
  const noRefusal = () => {
    refusal.hidden = true;
  };

  // ---- the solution on the page ---------------------------------------------------
  const hms = (ra, dec) => `${formatRa(ra)} ${formatDec(dec)}`;
  const dl = pairs => {
    const d = el('dl', { className: 'cal-dl' });
    for (const [k, v] of pairs)
      d.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
    return d;
  };
  const pm = (v, s, d = 4) =>
    Number.isFinite(s) ? `${fmt(v, d)} ± ${fmt(s, 2)}` : fmt(v, d);
  function showFit() {
    if (!fit) return;
    const d = fit.derived;
    const s = fit.sigmas;
    const st = fit.stats;
    const first = [
      [
        t('obs.cal.res.ref'),
        `${hms(fit.wcs.crval[0], fit.wcs.crval[1])} (${fmt(fit.wcs.crval[0], 7)}°, ${fmt(fit.wcs.crval[1], 7)}°)`,
      ],
      [
        t('obs.cal.res.pix'),
        `${pm(fit.wcs.crpix[0], s.crpix[0])}, ${pm(fit.wcs.crpix[1], s.crpix[1])}`,
      ],
      [
        t('obs.cal.res.scale'),
        fit.model === 'affine'
          ? `${pm(d.scaleX, s.scaleX)} × ${pm(d.scaleY, s.scaleY)} (${pm(d.scale, s.scale)})`
          : pm(d.scale, s.scale),
      ],
      [t('obs.cal.res.pa'), pm(d.positionAngle, s.positionAngle)],
      [t('obs.cal.res.parity'), t(`obs.cal.parity.${d.parity}`)],
    ];
    if (fit.model === 'affine')
      first.push([t('obs.cal.res.skew'), pm(d.skew, s.skew)]);
    first.push([
      t('obs.cal.res.fit'),
      t('obs.cal.res.fitValue', {
        n: st.n,
        rms: fmt(st.rmsPix, 3),
        arcsec: fmt(st.rmsArcsec, 3),
      }),
    ]);
    const res = el('table', { className: 'im-table cal-table' });
    res.append(
      el('caption', { textContent: t('obs.cal.residuals') }),
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          ...['star', 'dx', 'dy', 'pix', 'arcsec'].map(c =>
            el('th', { scope: 'col', textContent: t(`obs.cal.rcol.${c}`) })
          )
        )
      ),
      el(
        'tbody',
        {},
        ...fit.residuals.map(r =>
          el(
            'tr',
            {},
            el('th', { scope: 'row', textContent: r.id }),
            ...[r.dx, r.dy, r.pix, r.arcsec].map(v =>
              el('td', { textContent: fmt(v, 3) })
            )
          )
        )
      )
    );
    const verdict = el('p', {
      className: `ui-status ${fit.consistent === false ? 'is-error' : ''}`,
      textContent: t(`obs.cal.verdict.${fit.verdict}`, {
        chi2: fmt(st.chi2, 3),
        dof: st.dof,
        p: st.p === null ? '' : fmt(st.p, 2),
      }),
    });
    const parts = [
      el('p', {}, el('strong', { textContent: t('obs.cal.solution') })),
      dl(first),
      verdict,
    ];
    if (st.sigmaAssumed)
      parts.push(
        el('p', {
          className: 'ui-hint',
          textContent: t('obs.cal.sigmaAssumed', { sigma: 0.5 }),
        })
      );
    if (headerWcs && fit.headerCheck?.ok)
      parts.push(
        el('p', {
          className: 'ui-hint',
          textContent: t(`obs.cal.headerCheck.${fit.headerCheck.verdict}`, {
            rms: fmt(fit.headerCheck.stats.rmsPix, 3),
          }),
        })
      );
    parts.push(el('div', { className: 'im-tablewrap' }, res));
    out.replaceChildren(...parts);
    out.hidden = readouts.hidden = false;
  }
  function showHeader() {
    headerBox.replaceChildren();
    if (!obs) return;
    const h = fromHeader(obs.image.wcs);
    const sidecarUse = obs.image.sidecar?.use;
    if (sidecarUse === 'display-only') {
      headerBox.append(
        el('p', {
          className: 'ui-hint',
          textContent: t('obs.cal.header.display-only'),
        })
      );
      return;
    }
    if (!h.ok) {
      headerBox.append(
        el('p', {
          className: 'ui-hint',
          textContent: t(
            `obs.cal.header.${h.code === 'no-wcs' ? 'none' : h.code}`,
            h.data
          ),
        })
      );
      headerWcs = null;
      return;
    }
    headerWcs = h.wcs;
    const d = describeWcs(h.wcs);
    headerBox.append(
      el('p', {
        className: 'ui-hint',
        textContent: t('obs.cal.header.ok', {
          pos: hms(h.wcs.crval[0], h.wcs.crval[1]),
          scale: fmt(d.scale, 4),
          pa: fmt(d.positionAngle, 4),
          parity: t(`obs.cal.parity.${d.parity}`),
        }),
      }),
      el('button', {
        type: 'button',
        className: 'ui-button is-small',
        textContent: t('obs.cal.header.use'),
        onclick: () => useHeader(),
      })
    );
  }
  function useHeader() {
    if (!headerWcs) return;
    fit = null;
    chosen = 'header';
    out.replaceChildren(
      el('p', {}, el('strong', { textContent: t('obs.cal.solution') })),
      dl([
        [t('obs.cal.res.ref'), hms(headerWcs.crval[0], headerWcs.crval[1])],
        [t('obs.cal.res.scale'), fmt(describeWcs(headerWcs).scale, 4)],
      ]),
      el('p', {
        className: 'ui-hint',
        textContent: t('obs.cal.header.notSolved'),
      })
    );
    out.hidden = readouts.hidden = false;
    noRefusal();
    say(t('obs.cal.header.used'));
  }
  const wcsNow = () =>
    chosen === 'fit' ? fit?.wcs : chosen === 'header' ? headerWcs : null;
  function showSky() {
    const w = wcsNow();
    const x = pxIn.valueAsNumber;
    const y = pyIn.valueAsNumber;
    if (
      !w ||
      pxIn.value === '' ||
      pyIn.value === '' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      skyAt.textContent = t('obs.cal.needPixel');
      return;
    }
    const s = skyOf(w, x, y);
    const u = chosen === 'fit' ? uncertaintyAt(fit, x, y) : null;
    skyAt.textContent = `${hms(s.ra, s.dec)} (${fmt(s.ra, 8)}°, ${fmt(s.dec, 8)}°)${u ? ` ± ${fmt(u.east, 2)}″ E, ${fmt(u.north, 2)}″ N` : ''}`;
    say(skyAt.textContent);
  }
  function showPixel() {
    const w = wcsNow();
    const ra = parseAngle(raIn.value, { hours: hours(), comma: comma() });
    const dec = parseAngle(decIn.value, { comma: comma() });
    const p =
      w && Number.isFinite(ra) && Number.isFinite(dec)
        ? pixelOf(w, ra, dec)
        : null;
    if (!p) {
      pixAt.textContent = t('obs.cal.needSky');
      return;
    }
    const inside =
      p.x >= 0.5 &&
      p.y >= 0.5 &&
      p.x <= obs.image.width + 0.5 &&
      p.y <= obs.image.height + 0.5;
    pixAt.textContent = t(inside ? 'obs.cal.pixelAt' : 'obs.cal.pixelOutside', {
      x: fmt(p.x, 6),
      y: fmt(p.y, 6),
    });
    say(pixAt.textContent);
  }

  // ---- solving -------------------------------------------------------------------
  function solve() {
    noRefusal();
    const read = readRows();
    if (read.error) return refuse(read.error.code, read.error.data);
    let tangent;
    if (tanRa.value.trim() || tanDec.value.trim()) {
      const a = parseAngle(tanRa.value, { hours: hours(), comma: comma() });
      const d = parseAngle(tanDec.value, { comma: comma() });
      if (!Number.isFinite(a) || !Number.isFinite(d) || d < -90 || d > 90)
        return refuse('tangent');
      tangent = [a, d];
    }
    const f = fitWcs(read.stars, {
      model: model.value,
      parity: parity.value === '1' ? 1 : -1,
      tangent,
    });
    if (!f.ok) {
      fit = null;
      out.hidden = readouts.hidden = true;
      return refuse(f.code, f.data);
    }
    fit = f;
    if (headerWcs) fit.headerCheck = checkWcs(headerWcs, read.stars);
    chosen = 'fit';
    fit.stars = read.stars;
    showFit();
    say(
      t('obs.cal.solved', {
        n: f.stats.n,
        verdict: t(`obs.cal.verdictShort.${f.verdict}`),
      })
    );
  }

  // ---- stars from the marks and from the pack --------------------------------------
  async function useMarks() {
    const block = await ctx.marks.block?.(ctx.state.view);
    const points = (block?.marks ?? []).filter(m => m.kind === 'point');
    if (!points.length) return say(t('obs.cal.noMarks'));
    const blank = () =>
      [...tbody.rows].find(r =>
        FIELDS.every(f => !r.querySelector(`[data-f="${f}"]`).value)
      );
    for (const m of points) {
      const p = m.result?.pts?.[0] ?? m.pts[0];
      const name = m.tag || m.id;
      const row =
        [...tbody.rows].find(
          r => r.querySelector('[data-f="name"]').value === name
        ) ?? blank();
      const vals = {
        name,
        x: p[0],
        y: p[1],
        ...(m.result ? { sigma: roundSig(m.result.sigma, 3) } : {}),
      };
      if (row)
        for (const [f, v] of Object.entries(vals))
          row.querySelector(`[data-f="${f}"]`).value = v;
      else addRow(vals);
    }
    stale();
    say(t('obs.cal.marksAdded', { n: points.length }));
  }
  async function lookup() {
    const rows = [...tbody.rows].filter(r => {
      const g = f => r.querySelector(`[data-f="${f}"]`).value.trim();
      return g('name') && !(g('ra') && g('dec'));
    });
    if (!rows.length) return say(t('obs.cal.lookupNone'));
    try {
      starDoc ??= await loadStarFile();
    } catch {
      return say(t('obs.cal.lookupFailed'));
    }
    const mjd = mjdOf(obs?.image?.time);
    const found = [];
    const missing = [];
    for (const r of rows) {
      const q = r.querySelector('[data-f="name"]').value.trim().toLowerCase();
      const hits = starDoc.stars.filter(s => keysOf(s).includes(q));
      if (hits.length !== 1) {
        missing.push(r.querySelector('[data-f="name"]').value.trim());
        continue;
      }
      const p = starAt(hits[0], mjd);
      const ra = hours()
        ? formatRa(p.ra)
        : String(Math.round(p.ra * 1e7) / 1e7);
      const dec = hours()
        ? formatDec(p.dec)
        : String(Math.round(p.dec * 1e7) / 1e7);
      r.querySelector('[data-f="ra"]').value = ra;
      r.querySelector('[data-f="dec"]').value = dec;
      r.dataset.catalogue = '1';
      found.push(q);
    }
    if (found.length) catalog = catalogOf({ doc: starDoc, mjd });
    stale();
    say(
      missing.length
        ? t('obs.cal.lookupSome', {
            found: found.length,
            missing: missing.join(', '),
          })
        : t('obs.cal.lookupDone', { found: found.length })
    );
  }

  // ---- the ledger and the workspace ---------------------------------------------
  async function frameNow() {
    frame ??= frameOf(obs);
    digest ??= await digestFrame(frame);
    return { id: frame.id, width: frame.width, height: frame.height, digest };
  }
  async function currentBlock() {
    if (!obs) return null;
    if (chosen === 'fit' && fit)
      return calibrationBlock({
        frame: await frameNow(),
        catalog: catalogRecord(),
        stars: fit.stars,
        fit,
      });
    if (chosen === 'header' && headerWcs)
      return calibrationBlock({
        frame: await frameNow(),
        catalog: catalogOf({ typed: 'the image header' }),
        stars: [],
        header: { wcs: headerWcs },
      });
    return null;
  }
  const catalogRecord = () =>
    !catalog
      ? catalogOf({ typed: epoch.value.trim() })
      : !fit.stars.every(s => s.catalogSigma)
        ? { ...catalog, note: 'some positions typed by the reader' }
        : catalog;
  const quantityLabel = q => t(`obs.cal.q.${q.id}`);
  async function keep() {
    const block = await currentBlock();
    if (!block) return say(t('obs.cal.nothing'));
    try {
      const record = await writeRecord({
        id: `calibration-${obs.id}`.slice(0, 120),
        setId: obs.id,
        block,
      });
      const [{ artifactEntry }, { SOURCE }, nb] = await Promise.all([
        import('../notebook/artifactEntry.js'),
        import('../notebook/entry.js'),
        import('../notebook/store.js'),
      ]);
      const entry = artifactEntry({
        source: SOURCE.IMAGE_CALIBRATION,
        envelope: record,
        title: t('obs.cal.ledgerEntry', { title: obs.id }),
        labels: { quantity: quantityLabel },
        context: { page: 'observatory', observation: { id: obs.id } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const done = nb.save([...loaded.entries, entry]);
      if (!done.ok) throw new Error(done.reason);
      say(t('obs.cal.kept', { n: record.quantities.length }));
      return record;
    } catch (err) {
      say(t('obs.cal.keepFailed', { why: err.message }));
      return null;
    }
  }
  /** Bring a saved block back: refuse if the image is not the one it was made on. */
  async function restore(block) {
    saved = null;
    const problems = validateCalibration(block);
    if (problems.length) return say(t('obs.cal.replay.invalid'));
    try {
      const r = await replay(block, frame ?? (frame = frameOf(obs)));
      tbody.replaceChildren();
      for (const s of block.stars)
        addRow({
          name: s.name ?? s.id,
          x: s.x,
          y: s.y,
          ra: s.ra,
          dec: s.dec,
          sigma: s.sigma,
          catalogue: Boolean(s.catalogSigma),
        });
      coords.value = 'deg';
      if (block.solution.origin === 'header') {
        useHeader();
        return;
      }
      model.value = block.solution.model;
      model.onchange();
      tanRa.value = tanDec.value = '';
      if (block.solution.tangentGiven) {
        tanRa.value = String(block.solution.tangent[0]);
        tanDec.value = String(block.solution.tangent[1]);
      }
      if (block.solution.parity) parity.value = String(block.solution.parity);
      catalog = block.catalog.source === 'typed' ? null : block.catalog;
      epoch.value =
        catalog || block.catalog.epoch === 'not stated by the reader'
          ? ''
          : block.catalog.epoch;
      solve();
      if (!r.agrees) say(t('obs.cal.replay.differs'));
    } catch (err) {
      say(t(`obs.cal.replay.${err.code ?? 'invalid'}`));
    }
  }
  /** The workspace's calibration block, or null when there is none. */
  const block = view =>
    view?.id === obs?.id ? currentBlock().then(b => b ?? saved) : null;

  function update() {
    const o = ctx.state.view;
    if (o?.kind !== 'image') return;
    if (obs?.id !== o.id) {
      frame = digest = null;
      fit = null;
      chosen = null;
      headerWcs = null;
      tbody.replaceChildren();
      out.hidden = readouts.hidden = true;
      noRefusal();
    }
    obs = o;
    showHeader();
    if (saved) restore(saved);
  }
  new MutationObserver(label).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  label();
  ctx.marks.cal = { block, update };
  update();
  if (!tbody.rows.length && !saved) addRow();
  return { update };
}
