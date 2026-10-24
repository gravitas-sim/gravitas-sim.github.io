// =============================================================================
// Motion and parallax over time (Prompt 186, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// Positions of one source at several epochs, in a table the reader types, pastes
// or fills from the marks of the image that is open (each frame's mark, through
// the sky coordinates of the panel above), fitted over time: a two-epoch shift, a
// proper motion, or proper motion with parallax. The arithmetic is
// js/measure/astrometric-series.js; this is the page around it.
//   shift    two epochs: the displacement, always labelled a shift under a
//            fixed-motion assumption and not a parallax
//   motion   a straight-line proper motion with its residuals
//   joint    proper motion and parallax, only when the epochs sample the ellipse;
//            the parallax is relative to the reference frame, and every distance
//            carries its interval and that statement
// The path and the residuals are drawn through the plot component, each with its
// table, and the fit is saved as CSV and kept in the ledger as a fit-result
// record. Nothing here takes a key: every control is a button, a box, a menu or
// a disclosure. Loaded when the panel first opens (it sits in the sky-coordinates
// panel); the ephemeris sidecar the joint fit needs is fetched when a joint fit
// is first asked for.
// =============================================================================

import { parseAngle } from '../measure/astrometry.js';
import {
  csvRows,
  fitJoint,
  fitMotion,
  fitRecordOf,
  predict,
  quantitiesOf,
  reductionOf,
  twoEpochShift,
} from '../measure/astrometric-series.js';
import { typedNumber } from '../answerParse.js';
import { toCsv, num } from '../csv.js';
import { roundSig } from '../format.js';
import { sha256Hex } from '../hash.js';

const WORDS = {
  en: () => import('../i18n/en.imageSeries.js').then(m => m.EN_IMAGESERIES),
  es: () => import('../i18n/es.imageSeries.js').then(m => m.ES_IMAGESERIES),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const COLS = ['epoch', 'ra', 'dec', 'sx', 'sy'];
const CSV_COLS = ['n', 'jd', 'dx', 'dy', 'zx', 'zy'];
const MAS = 1000;

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const digestOf = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );

let earthPromise = null;
/** The Earth's barycentric position from the repository's ephemeris sidecar, fetched once. */
function loadEarth() {
  earthPromise ??= Promise.all([
    import('../kernels/sky/packs.js'),
    import('../mission/ephemeris.js'),
    import('../kernels/sky/planets.js'),
    import('../measure/astrometric-series.js'),
  ]).then(async ([packs, eph, planets, kernel]) => {
    const file = await packs.loadEphemerisFile();
    return kernel.createEarth({
      ephemeris: eph.createEphemeris(file.pack, file.data),
      heliocentric: planets.heliocentric,
    });
  });
  earthPromise.catch(() => (earthPromise = null));
  return earthPromise;
}

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   createPlot: Function, state: {view: object}, marks: object}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountSeries(box, ctx) {
  await words(ctx);
  const { t } = ctx;
  const lang = () => ctx.language();
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
  const text = (value = '', extra = {}) =>
    el('input', { type: 'text', value, className: 'ui-input', ...extra });
  const select = (values, current) =>
    el(
      'select',
      { className: 'ui-input' },
      ...values.map(v => el('option', { value: v, selected: v === current }))
    );

  // ---- the table of epochs --------------------------------------------------------
  const rowsBody = el('tbody');
  const rowCount = () => rowsBody.rows.length;
  const formatSel = select(['jd', 'mjd'], 'jd');
  const scaleSel = select(['utc', 'tt', 'tdb'], 'tdb');
  const hoursBox = el('input', { type: 'checkbox' });
  const tagSel = el('select', { className: 'ui-input' });
  const pasteArea = el('textarea', {
    className: 'ui-input',
    rows: 5,
    spellcheck: false,
  });
  const kindSel = select(['shift', 'motion', 'joint'], 'joint');
  const frameIn = text('');
  const corrIn = text('');
  const corrSigmaIn = text('');
  const corrSourceIn = text('');

  const table = el('table', { className: 'im-table' });
  const caption = word(el('caption'), 'obs.ser.rows');
  const head = el(
    'tr',
    {},
    word(
      el('th', { scope: 'col', className: 'visually-hidden' }),
      'obs.ser.col.n'
    ),
    ...COLS.map(c => word(el('th', { scope: 'col' }), `obs.ser.col.${c}`)),
    word(el('th', { scope: 'col' }), 'obs.ser.col.remove')
  );
  table.append(caption, el('thead', {}, head), rowsBody);

  const rowNumbers = () =>
    [...rowsBody.rows].forEach((r, i) => {
      r.cells[0].textContent = String(i + 1);
      const b = r.querySelector('button');
      b.textContent = t('obs.ser.removeRow', { n: i + 1 });
      for (const [j, c] of COLS.entries())
        r.cells[j + 1]
          .querySelector('input')
          .setAttribute(
            'aria-label',
            t('obs.ser.cell', { n: i + 1, col: t(`obs.ser.col.${c}`) })
          );
    });
  function addRow(values = {}) {
    const tr = el('tr');
    tr.append(el('th', { scope: 'row' }));
    for (const c of COLS)
      tr.append(el('td', {}, text(values[c] ?? '', { size: 12 })));
    const rm = el('button', {
      type: 'button',
      className: 'ui-button is-small',
    });
    rm.onclick = () => {
      tr.remove();
      rowNumbers();
      invalidate();
    };
    tr.append(el('td', {}, rm));
    tr.oninput = invalidate;
    rowsBody.append(tr);
    rowNumbers();
    return tr;
  }

  // ---- reading the table ------------------------------------------------------------
  const why = r =>
    t(`obs.ser.no.${r.code}`, {
      ...r.data,
      n: r.data?.n,
      min: r.data?.min,
      index: (r.data?.index ?? 0) + 1,
      first: fmt(r.data?.first, 9),
      last: fmt(r.data?.last, 9),
      startJd: r.data?.startJd,
      stopJd: r.data?.stopJd,
      format: String(r.data?.format ?? '').toUpperCase(),
      scale: String(r.data?.scale ?? '').toUpperCase(),
      spanYears: fmt(r.data?.spanYears, 3),
      sectors: r.data?.sectors,
    });
  const bad = (r, code, extra = {}) => ({ ok: false, code, data: extra, ...r });
  function readSeries() {
    const epochs = [];
    for (const [i, tr] of [...rowsBody.rows].entries()) {
      const v = [...tr.querySelectorAll('input')].map(x => x.value.trim());
      const [e, ra, dec, sx, sy] = v;
      const value = typedNumber(e, lang());
      const raD = parseAngle(ra, {
        hours: hoursBox.checked,
        comma: lang() === 'es',
      });
      const decD = parseAngle(dec, { comma: lang() === 'es' });
      const sigX = typedNumber(sx, lang());
      const sigY = sy === '' ? sigX : typedNumber(sy, lang());
      if (![value, raD, decD, sigX, sigY].every(Number.isFinite))
        return bad({}, 'row', { index: i });
      epochs.push({
        time: { value, format: formatSel.value, scale: scaleSel.value },
        ra: raD,
        dec: decD,
        sigma: [sigX, sigY],
      });
    }
    const series = { epochs };
    const cv = corrIn.value.trim();
    const name = frameIn.value.trim();
    if (cv !== '' || name || corrSourceIn.value.trim()) {
      series.reference = {
        ...(name ? { name } : {}),
        ...(cv !== ''
          ? {
              correction: {
                value: typedNumber(cv, lang()) / MAS,
                sigma:
                  (corrSigmaIn.value.trim() === ''
                    ? 0
                    : typedNumber(corrSigmaIn.value, lang())) / MAS,
                source: corrSourceIn.value,
              },
            }
          : {}),
      };
    }
    return { ok: true, series };
  }

  // ---- results ---------------------------------------------------------------------
  const out = el('div', { className: 'ph-readout' });
  const resid = el('div', { className: 'im-tablewrap' });
  const mkSvg = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ow-plot');
    s.setAttribute('role', 'img');
    s.hidden = true;
    return s;
  };
  const pathSvg = mkSvg();
  const residSvg = mkSvg();
  const plotOpts = {
    number: ctx.number,
    labels: { notStated: t('obs.unit.notStated') },
  };
  const pathPlot = ctx.createPlot(pathSvg, plotOpts);
  const residPlot = ctx.createPlot(residSvg, plotOpts);
  const fitBtn = button('obs.ser.fit', () => doFit());
  const csvBtn = button('obs.ser.csv', () => doCsv());
  const keepBtn = button('obs.ser.keep', () => doKeep());

  const pasteDetails = el(
    'details',
    { className: 'ui-disclosure' },
    word(el('summary'), 'obs.ser.paste'),
    word(el('p', { className: 'ui-hint' }), 'obs.ser.pasteHelp'),
    el(
      'label',
      { className: 'im-field' },
      word(el('span'), 'obs.ser.pasteLabel'),
      pasteArea
    ),
    button('obs.ser.pasteLoad', () => doPaste())
  );
  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.ser.help'),
    refusal,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.ser.format', formatSel),
      field('obs.ser.scale', scaleSel),
      el(
        'label',
        { className: 'im-field' },
        hoursBox,
        word(el('span'), 'obs.ser.raHours')
      )
    ),
    el('div', { className: 'im-tablewrap' }, table),
    el(
      'div',
      { className: 'im-tools' },
      button('obs.ser.addRow', () => {
        addRow();
        invalidate();
        say(t('obs.ser.said.rowAdded', { n: rowCount() }));
      }),
      field('obs.ser.tag', tagSel),
      button('obs.ser.addMark', () => doMark())
    ),
    pasteDetails,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.ser.kind', kindSel),
      field('obs.ser.frame', frameIn),
      field('obs.ser.corr', corrIn),
      field('obs.ser.corrSigma', corrSigmaIn),
      field('obs.ser.corrSource', corrSourceIn)
    ),
    el('div', { className: 'im-tools' }, fitBtn, csvBtn, keepBtn),
    out,
    pathSvg,
    residSvg,
    resid,
    word(el('p', { className: 'ui-hint' }), 'obs.ser.limits')
  );
  for (const k of ['shift', 'motion', 'joint'])
    kindSel.querySelector(`option[value="${k}"]`).textContent = t(
      `obs.ser.kind.${k}`
    );
  const optionWords = () => {
    for (const k of ['shift', 'motion', 'joint'])
      kindSel.querySelector(`option[value="${k}"]`).textContent = t(
        `obs.ser.kind.${k}`
      );
    for (const k of ['jd', 'mjd'])
      formatSel.querySelector(`option[value="${k}"]`).textContent = t(
        `obs.ser.format.${k}`
      );
    for (const k of ['utc', 'tt', 'tdb'])
      scaleSel.querySelector(`option[value="${k}"]`).textContent = t(
        `obs.ser.scale.${k}`
      );
  };
  optionWords();

  let result = null; // {kind, fit|shift, series, plotted}
  let running = false;
  function invalidate() {
    result = null;
    out.replaceChildren();
    resid.replaceChildren();
    pathSvg.hidden = residSvg.hidden = true;
    update();
  }

  // ---- filling the table -----------------------------------------------------------
  function doPaste() {
    const lines = pasteArea.value
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    const rows = lines.map(l => l.split(/[\t;,]\s*|\s+/));
    // A decimal comma in Spanish would clash with a comma separator: tabs, semicolons and spaces only there.
    const parts =
      lang() === 'es' ? lines.map(l => l.split(/[\t;]\s*|\s+/)) : rows;
    if (!parts.length || parts.some(p => p.length < 4)) {
      refusal.hidden = false;
      refusal.textContent = t('obs.ser.no.paste');
      return say(t('obs.ser.no.paste'));
    }
    rowsBody.replaceChildren();
    for (const [e, ra, dec, sx, sy] of parts)
      addRow({ epoch: e, ra, dec, sx, sy: sy ?? '' });
    refusal.hidden = true;
    invalidate();
    say(t('obs.ser.said.loaded', { n: parts.length }));
  }
  const tagsHere = () => {
    const s = ctx.marks.state?.();
    return [
      ...new Set(
        (s?.marks ?? [])
          .filter(m => m.kind === 'point' && m.tag)
          .map(m => m.tag)
      ),
    ];
  };
  function refreshTags() {
    const keep = tagSel.value;
    const tags = tagsHere();
    tagSel.replaceChildren(
      ...(tags.length
        ? tags.map(g => el('option', { value: g, textContent: g }))
        : [el('option', { value: '', textContent: t('obs.ser.noTags') })])
    );
    if (tags.includes(keep)) tagSel.value = keep;
    tagSel.disabled = !tags.length;
  }
  function doMark() {
    const o = ctx.state.view;
    const m = ctx.marks
      .state?.()
      .marks.find(k => k.kind === 'point' && k.tag === tagSel.value);
    const fail = id => {
      refusal.hidden = false;
      refusal.textContent = t(`obs.ser.no.${id}`);
      say(t(`obs.ser.no.${id}`));
    };
    if (!m) return fail('noMark');
    const time = o?.image?.time;
    if (!time?.scale || !Number.isFinite(+time.value)) return fail('noTime');
    const sky = ctx.marks.cal?.sky?.(m.pts[0][0], m.pts[0][1]);
    if (!sky) return fail('noWcs');
    const format = String(time.format ?? 'mjd').toLowerCase();
    const scale = String(time.scale).toLowerCase();
    if (
      !['jd', 'mjd'].includes(format) ||
      !['utc', 'tt', 'tdb'].includes(scale)
    )
      return fail('noTime');
    const blank = tr =>
      [...tr.querySelectorAll('input')].every(i => !i.value.trim());
    if ([...rowsBody.rows].every(blank)) {
      formatSel.value = format;
      scaleSel.value = scale;
    } else if (formatSel.value !== format || scaleSel.value !== scale)
      return fail('mismatch');
    const sigma = Math.hypot(m.sigma * sky.scale, sky.sigma?.[0] ?? 0);
    const sigmaN = Math.hypot(m.sigma * sky.scale, sky.sigma?.[1] ?? 0);
    const values = {
      epoch: String(time.value),
      ra: String(roundSig(sky.ra, 12)),
      dec: String(roundSig(sky.dec, 12)),
      sx: String(roundSig(sigma, 4)),
      sy: String(roundSig(sigmaN, 4)),
    };
    // A row left empty is filled before another is added.
    const spare = [...rowsBody.rows].find(blank);
    if (spare)
      spare.querySelectorAll('input').forEach((inp, k) => {
        inp.value = values[COLS[k]];
      });
    else addRow(values);
    refusal.hidden = true;
    invalidate();
    say(t('obs.ser.said.rowAdded', { n: rowCount() }));
  }

  // ---- fitting -----------------------------------------------------------------------
  const finishRefusal = r => {
    refusal.hidden = false;
    refusal.textContent = why(r);
    say(why(r));
  };
  async function doFit() {
    if (running) return;
    const read = readSeries();
    if (!read.ok) {
      refusal.hidden = false;
      refusal.textContent = t('obs.ser.no.row', { index: read.data.index + 1 });
      return say(refusal.textContent);
    }
    const { series } = read;
    result = null;
    const kind = kindSel.value;
    running = true;
    update();
    try {
      let r;
      if (kind === 'shift') {
        r =
          series.epochs.length === 2
            ? twoEpochShift(series.epochs[0], series.epochs[1])
            : { ok: false, code: 'needTwo', data: {} };
      } else if (kind === 'motion') r = fitMotion(series);
      else {
        let earth = null;
        try {
          earth = await loadEarth();
        } catch {
          r = { ok: false, code: 'ephemeris', data: {} };
        }
        if (earth) r = fitJoint(series, earth);
        if (r?.ok) r.earth = earth;
      }
      if (!r.ok) {
        out.replaceChildren();
        resid.replaceChildren();
        pathSvg.hidden = residSvg.hidden = true;
        return finishRefusal(r);
      }
      refusal.hidden = true;
      result = { kind, fit: r, series };
      render();
      say(summaryLine());
    } finally {
      running = false;
      update();
    }
  }

  const line = x => el('p', { textContent: x });
  const mas = v => fmt(v * MAS, 5);
  const verdictLine = f =>
    f.verdict === 'exact'
      ? t('obs.ser.exactNote')
      : t('obs.ser.stat', {
          chi2: fmt(f.chi2, 4),
          dof: f.dof,
          p: fmt(f.p, 2),
          verdict: t(`obs.ser.verdict.${f.verdict}`),
        });
  function summaryLine() {
    const { kind, fit } = result;
    if (kind === 'shift') return t('obs.ser.said.shift');
    return t('obs.ser.said.fitted', {
      verdict: t(`obs.ser.verdict.${fit.verdict}`),
      chi2: fmt(fit.chi2, 3),
      dof: fit.dof,
    });
  }
  function interval(i) {
    const level = fmt(100 * i.level, 4);
    if (i.distance.empty) return t('obs.ser.dist.empty', { level });
    if (i.distance.hi === null)
      return t('obs.ser.dist.open', { level, lo: fmt(i.distance.lo, 4) });
    return t('obs.ser.dist.int', {
      level,
      lo: fmt(i.distance.lo, 4),
      hi: fmt(i.distance.hi, 4),
    });
  }
  function renderDistance(f) {
    const d = f.distance;
    const parts = [];
    const rel = d.parallax.relative;
    parts.push(
      line(
        t('obs.ser.dist.parallax', {
          p: mas(rel.value),
          s: mas(rel.sigma),
        })
      )
    );
    if (d.parallax.used === 'absolute')
      parts.push(
        line(
          t('obs.ser.corrInfo', {
            abs: mas(d.parallax.absolute.value),
            rel: mas(rel.value),
            c: mas(f.zeroPoint.correction.value),
            source: f.zeroPoint.correction.source,
          })
        )
      );
    if (d.withheld)
      parts.push(
        line(
          t(
            f.verdict === 'inconsistent'
              ? 'obs.ser.dist.withheld.inconsistent'
              : 'obs.ser.dist.withheld.negative'
          )
        )
      );
    else {
      if (d.value !== null)
        parts.push(line(t('obs.ser.dist.value', { d: fmt(d.value, 4) })));
      else parts.push(line(t('obs.ser.dist.none')));
      if (d.lowSignificance && d.value !== null)
        parts.push(
          line(t('obs.ser.dist.low', { n: 5, s: fmt(d.significance, 3) }))
        );
      for (const i of d.intervals) parts.push(line(interval(i)));
      parts.push(
        line(t('obs.ser.dist.method', { method: t('obs.ser.method.profile') }))
      );
    }
    // The frame statement, always, beside the distance.
    parts.push(
      el('p', {
        className: 'ui-hint',
        textContent: t(`obs.ser.zp.${f.zeroPoint.id}`, {
          source: f.zeroPoint.correction?.source ?? '',
          c: f.zeroPoint.correction ? mas(f.zeroPoint.correction.value) : '',
        }),
      })
    );
    parts.push(
      el(
        'ul',
        {},
        ...d.assumptions.map((_, k) =>
          el('li', { textContent: t(`obs.ser.assume.${k}`) })
        )
      )
    );
    return parts;
  }
  function render() {
    if (!result) return;
    const { kind, fit } = result;
    if (kind === 'shift') {
      const d = fit.displacement;
      const parts = [
        el('p', {}, el('strong', { textContent: t('obs.ser.shiftLabel') })),
        line(
          t('obs.ser.shift.disp', {
            x: fmt(d.x.value, 5),
            sx: fmt(d.x.sigma, 3),
            y: fmt(d.y.value, 5),
            sy: fmt(d.y.sigma, 3),
          })
        ),
        line(
          t('obs.ser.shift.rate', {
            x: fmt(fit.rate.x.value, 4),
            y: fmt(fit.rate.y.value, 4),
            years: fmt(fit.baselineYears, 4),
          })
        ),
        el(
          'ul',
          {},
          ...[0, 1].map(k =>
            el('li', { textContent: t(`obs.ser.shift.assume.${k}`) })
          )
        ),
      ];
      out.replaceChildren(...parts);
      resid.replaceChildren();
      pathSvg.hidden = residSvg.hidden = true;
      return;
    }
    const cell = (tag, txt, extra = {}) =>
      el(tag, { textContent: txt, ...extra });
    const params = fit.order.map((n, i) => [n, fit.params[n], fit.units[i]]);
    const parts = [
      ...(fit.label
        ? [el('p', {}, el('strong', { textContent: t('obs.ser.shiftLabel') }))]
        : []),
      el(
        'div',
        { className: 'im-tablewrap' },
        el(
          'table',
          { className: 'im-table' },
          cell('caption', t('obs.ser.params')),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ...['name', 'value', 'sigma', 'unit'].map(k =>
                cell('th', t(`obs.ser.pcol.${k}`), { scope: 'col' })
              )
            )
          ),
          el(
            'tbody',
            {},
            ...params.map(([n, p, u]) =>
              el(
                'tr',
                {},
                cell('th', t(`obs.ser.p.${n}`), { scope: 'row' }),
                cell('td', mas(p.value)),
                cell('td', `± ${mas(p.sigma)}`),
                cell('td', u === 'arcsec' ? 'mas' : 'mas/yr')
              )
            )
          )
        )
      ),
      line(verdictLine(fit)),
    ];
    if (fit.verdict === 'inconsistent')
      parts.push(line(t('obs.ser.hint.inconsistent')));
    if (fit.warnings?.includes('negative-parallax'))
      parts.push(line(t('obs.ser.hint.negative')));
    if (kind === 'joint') parts.push(...renderDistance(fit));
    out.replaceChildren(...parts);
    drawPlots(fit);
    resid.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.ser.resid')),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...CSV_COLS.map(k =>
              cell('th', t(`obs.ser.rcol.${k}`), { scope: 'col' })
            )
          )
        ),
        el(
          'tbody',
          {},
          ...fit.residuals.map((r, k) =>
            el(
              'tr',
              {},
              cell('th', String(k + 1), { scope: 'row' }),
              ...[
                fmt(r.jd, 10),
                mas(r.dx),
                mas(r.dy),
                fmt(r.zx, 3),
                fmt(r.zy, 3),
              ].map(v => cell('td', v))
            )
          )
        )
      )
    );
  }
  function drawPlots(fit) {
    const p = prepareRows();
    const data = {
      kind: 'time-series',
      columns: [
        {
          id: 'x',
          name: t('obs.ser.axis.x'),
          unit: 'arcsec',
          role: 'x',
          values: p.map(r => r.x),
        },
        {
          id: 'y',
          name: t('obs.ser.axis.y'),
          unit: 'arcsec',
          role: 'value',
          values: p.map(r => r.y),
        },
      ],
      axes: { x: 'x', y: 'y' },
      masks: [],
    };
    const first = p[0].jd;
    const last = p[p.length - 1].jd;
    const dense = [];
    for (let k = 0; k <= 120; k++) {
      const m = predict(
        fit,
        first + ((last - first) * k) / 120,
        result.fit.earth ?? null
      );
      if (m) dense.push([m.x, m.y]);
    }
    pathSvg.hidden = false;
    pathPlot.draw(data, {
      xColumn: 'x',
      yColumn: 'y',
      overlays: dense.length
        ? [{ label: t('obs.ser.model'), points: dense }]
        : [],
    });
    pathSvg.setAttribute('aria-label', t('obs.ser.plot.path'));
    const rdata = {
      kind: 'time-series',
      columns: [
        {
          id: 't',
          name: t('obs.ser.axis.t'),
          unit: 'd',
          role: 'x',
          values: fit.residuals.map(r => r.jd - first),
        },
        {
          id: 'dx',
          name: t('obs.ser.axis.dx'),
          unit: 'mas',
          role: 'value',
          values: fit.residuals.map(r => r.dx * MAS),
        },
      ],
      axes: { x: 't', y: 'dx' },
      masks: [],
    };
    residSvg.hidden = false;
    residPlot.draw(rdata, {
      xColumn: 't',
      yColumn: 'dx',
      overlays: [
        {
          label: t('obs.ser.axis.dy'),
          points: fit.residuals.map(r => [r.jd - first, r.dy * MAS]),
        },
      ],
    });
    residSvg.setAttribute('aria-label', t('obs.ser.plot.resid'));
  }
  /** The standard coordinates of the fitted rows, in epoch order (from the fit's own residuals and model). */
  function prepareRows() {
    const { fit } = result;
    return fit.residuals.map(r => {
      const m = predict(fit, r.jd, fit.earth ?? null) ?? { x: 0, y: 0 };
      return { jd: r.jd, x: m.x + r.dx, y: m.y + r.dy };
    });
  }

  // ---- the lists, and the ledger ----------------------------------------------------
  function doCsv() {
    if (!result || result.kind === 'shift') return;
    const rows = csvRows(
      result.fit,
      CSV_COLS.map(k => t(`obs.ser.csvCol.${k}`)),
      num
    );
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', {
      href: url,
      download: `${ctx.state.view?.id ?? 'series'}-series.csv`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say(t('obs.ser.said.csv', { n: rows.length - 1 }));
  }
  async function doKeep() {
    if (!result || result.kind === 'shift') return;
    try {
      const o = ctx.state.view;
      const { framesOf } = await import('./imageMarks.js');
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const { fit, series } = result;
      const d = await digestOf(framesOf(o)[0]);
      const envelope = artifact({
        id: `series-${o.id}`.slice(0, 120),
        source: { kind: 'observation', id: o.id, digest: d },
        quantities: quantitiesOf(fit),
        fit: fitRecordOf(fit),
        provenance: { reductions: [reductionOf(series, fit)] },
        warnings: fit.zeroPoint ? [fit.zeroPoint.statement] : [],
        made: { app: 'gravitas', tool: 'image-series' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_SERIES,
        envelope,
        title: t('obs.ser.ledgerEntry', { title: o.id }),
        labels: { quantity: q => t(`obs.ser.q.${q.id.split('.')[1]}`) },
        context: { page: 'observatory', observation: { id: o.id } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.ser.said.kept'));
    } catch (err) {
      say(t('obs.ser.said.keepFailed', { why: err.message }));
    }
  }

  // ---- state of the buttons, and the page's language ------------------------------------
  function update() {
    const o = ctx.state.view;
    refreshTags();
    const image = o?.kind === 'image';
    fitBtn.disabled = running || !rowCount();
    csvBtn.disabled = !result || result.kind === 'shift' || running;
    keepBtn.disabled = !result || result.kind === 'shift' || running || !image;
  }
  function label() {
    for (const [n, id, prop] of labelled) n[prop] = t(id);
    optionWords();
    rowNumbers();
    refreshTags();
    if (result) render();
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  addRow();
  addRow();
  label();
  update();
  return { update };
}
