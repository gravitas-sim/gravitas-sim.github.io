// =============================================================================
// The orbit of a binary star and the track of a moving object (Prompt 187, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// Two tools in one disclosure, both over a table the reader types or pastes:
//   orbit   the relative astrometry of a visual binary (epochs, and separation and
//           position angle or north and east offsets, with their uncertainties) fitted
//           by a circular apparent orbit or by Thiele-Innes elements; the fit says
//           "not constrained", with the reason and the numbers, when the arc cannot
//           support it (js/measure/orbit-fit.js, ORBIT_FIT_GATE.md); with a parallax
//           and its reference-frame statement it gives the mass sum by Kepler's third
//           law with an interval
//   track   sources at several frames: the mover found among the static sources,
//           with its rate and position angle (js/measure/mover-track.js)
// The orbit and the residuals are drawn through the plot component, each with its
// table; the fit is saved as CSV and kept in the ledger as a fit-result record.
// Nothing here takes a key: every control is a button, a box, a menu or a
// disclosure. Loaded when the disclosure first opens (it sits beside the series
// tool in the sky-coordinates panel); nothing is fetched.
// =============================================================================

import {
  csvRows,
  fitOrbit,
  fitRecordOf,
  massSum,
  orbitCurve,
  quantitiesOf,
  reductionOf,
} from '../measure/orbit-fit.js';
import * as track from '../measure/mover-track.js';
import { typedNumber } from '../answerParse.js';
import { toCsv, num } from '../csv.js';
import { roundSig } from '../format.js';
import { sha256Hex } from '../hash.js';

const WORDS = {
  en: () => import('../i18n/en.imageOrbit.js').then(m => m.EN_IMAGEORBIT),
  es: () => import('../i18n/es.imageOrbit.js').then(m => m.ES_IMAGEORBIT),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

/** A synthetic binary (a = 0.9 arcsec, e = 0.45, i = 62, node 35, omega 110, P = 14.2 years, 15 mas noise) and a synthetic field (a mover of 0.8 arcsec per hour at 60 degrees among 7 static sources, 40 mas noise). */
const EXAMPLE = {
  orbit: [
    '1998.00 0.8044 -0.0857 0.015',
    '1999.43 0.9243 0.1657 0.015',
    '2000.79 0.8920 0.3569 0.015',
    '2002.38 0.6060 0.5017 0.015',
    '2004.32 -0.3086 0.0668 0.015',
    '2005.00 -0.4929 -0.2236 0.015',
    '2006.88 -0.3067 -0.6095 0.015',
    '2008.50 0.0481 -0.5859 0.015',
    '2009.85 0.3632 -0.4635 0.015',
    '2011.55 0.7332 -0.1979 0.015',
    '2012.84 0.8753 0.0563 0.015',
    '2014.33 0.9637 0.2912 0.015',
  ].join('\n'),
  track: [
    [
      '2460000.50000',
      [
        [-6.475, -2.171],
        [-24.43, -21.29],
        [-0.674, -12.683],
        [15.49, 27.655],
        [-1.832, -12.335],
        [-1.144, 26.894],
        [-4.504, 17.172],
        [-9.963, -7.966],
      ],
    ],
    [
      '2460000.52083',
      [
        [-6.439, -2.142],
        [-24.427, -21.297],
        [-0.644, -12.716],
        [15.455, 27.659],
        [-1.92, -12.281],
        [-1.157, 26.92],
        [-4.487, 17.191],
        [-9.6, -7.791],
      ],
    ],
    [
      '2460000.54167',
      [
        [-6.516, -2.16],
        [-24.483, -21.31],
        [-0.679, -12.668],
        [15.426, 27.693],
        [-1.882, -12.421],
        [-1.149, 26.888],
        [-4.524, 17.113],
        [-9.301, -7.607],
      ],
    ],
    [
      '2460000.56250',
      [
        [-6.491, -2.11],
        [-24.476, -21.299],
        [-0.633, -12.764],
        [15.456, 27.752],
        [-1.851, -12.363],
        [-1.245, 26.824],
        [-4.482, 17.085],
        [-8.925, -7.388],
      ],
    ],
    [
      '2460000.58333',
      [
        [-6.538, -2.214],
        [-24.52, -21.311],
        [-0.728, -12.697],
        [15.445, 27.727],
        [-1.855, -12.336],
        [-1.22, 26.871],
        [-4.482, 17.18],
        [-8.59, -7.197],
      ],
    ],
  ]
    .flatMap(([jd, pts]) => pts.map(([x, y]) => `${jd} ${x} ${y} 0.04`))
    .join('\n'),
};

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

/**
 * Mount the tools in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   createPlot: Function, state: {view: object}}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountOrbit(box, ctx) {
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
  const text = (value = '') =>
    el('input', { type: 'text', value, className: 'ui-input' });
  const select = (values, current) =>
    el(
      'select',
      { className: 'ui-input' },
      ...values.map(v => el('option', { value: v, selected: v === current }))
    );

  // ---- the controls -----------------------------------------------------------------
  const modeSel = select(['orbit', 'track'], 'orbit');
  const depthSel = select(['elliptical', 'circular'], 'elliptical');
  const inputSel = select(['offsets', 'polar'], 'offsets');
  const yearSel = select(['year', 'byear', 'jd', 'mjd'], 'year');
  const plxIn = text('');
  const plxSigmaIn = text('');
  const frameSel = select(['relative', 'absolute'], 'relative');
  const sourceIn = text('');
  const tScaleSel = select(['utc', 'tt', 'tdb'], 'tdb');
  const tFormatSel = select(['jd', 'mjd'], 'jd');
  const coordsSel = select(['offsets', 'sky'], 'offsets');
  const data = el('textarea', {
    className: 'ui-input',
    rows: 8,
    spellcheck: false,
  });
  const orbitOnly = el(
    'div',
    { className: 'im-tools' },
    field('obs.orb.depth', depthSel),
    field('obs.orb.input', inputSel),
    field('obs.orb.epochFormat', yearSel)
  );
  const plxGroup = el(
    'div',
    { className: 'im-tools' },
    field('obs.orb.plx', plxIn),
    field('obs.orb.plxSigma', plxSigmaIn),
    field('obs.orb.frame', frameSel),
    field('obs.orb.source', sourceIn)
  );
  const trackOnly = el(
    'div',
    { className: 'im-tools' },
    field('obs.orb.epochFormat', tFormatSel),
    field('obs.orb.scale', tScaleSel),
    field('obs.orb.coords', coordsSel)
  );
  const dataHelp = word(
    el('p', { className: 'ui-hint' }),
    'obs.orb.dataHelp.orbit'
  );

  // ---- results ----------------------------------------------------------------------
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
  const fitBtn = button('obs.orb.fit', () => doFit());
  const exampleBtn = button('obs.orb.example', () => doExample());
  const csvBtn = button('obs.orb.csv', () => doCsv());
  const keepBtn = button('obs.orb.keep', () => doKeep());

  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.orb.help'),
    refusal,
    el('div', { className: 'im-tools' }, field('obs.orb.mode', modeSel)),
    orbitOnly,
    trackOnly,
    dataHelp,
    el(
      'label',
      { className: 'im-field' },
      word(el('span'), 'obs.orb.data'),
      data
    ),
    plxGroup,
    el('div', { className: 'im-tools' }, fitBtn, exampleBtn, csvBtn, keepBtn),
    out,
    pathSvg,
    residSvg,
    resid,
    word(el('p', { className: 'ui-hint' }), 'obs.orb.limits')
  );

  const optionWords = () => {
    const names = [
      [modeSel, 'obs.orb.mode', ['orbit', 'track']],
      [depthSel, 'obs.orb.depth', ['elliptical', 'circular']],
      [inputSel, 'obs.orb.input', ['offsets', 'polar']],
      [yearSel, 'obs.orb.fmt', ['year', 'byear', 'jd', 'mjd']],
      [frameSel, 'obs.orb.frame', ['relative', 'absolute']],
      [tScaleSel, 'obs.orb.scale', ['utc', 'tt', 'tdb']],
      [tFormatSel, 'obs.orb.fmt', ['jd', 'mjd']],
      [coordsSel, 'obs.orb.coords', ['offsets', 'sky']],
    ];
    for (const [sel, base, vals] of names)
      for (const v of vals)
        sel.querySelector(`option[value="${v}"]`).textContent = t(
          `${base}.${v}`
        );
    dataHelp.textContent = t(`obs.orb.dataHelp.${modeSel.value}`);
  };
  const showMode = () => {
    const orbit = modeSel.value === 'orbit';
    orbitOnly.hidden = plxGroup.hidden = !orbit;
    trackOnly.hidden = orbit;
    dataHelp.textContent = t(`obs.orb.dataHelp.${modeSel.value}`);
    fitBtn.textContent = t(orbit ? 'obs.orb.fit' : 'obs.orb.find');
    labelled.find(([n]) => n === fitBtn)[1] = orbit
      ? 'obs.orb.fit'
      : 'obs.orb.find';
  };

  let result = null; // { mode, fit|found, series|frames, mass }
  function invalidate() {
    result = null;
    out.replaceChildren();
    resid.replaceChildren();
    pathSvg.hidden = residSvg.hidden = true;
    update();
  }
  modeSel.addEventListener('change', () => {
    showMode();
    refusal.hidden = true;
    invalidate();
  });
  for (const c of [
    depthSel,
    inputSel,
    yearSel,
    plxIn,
    plxSigmaIn,
    frameSel,
    sourceIn,
    tScaleSel,
    tFormatSel,
    coordsSel,
    data,
  ])
    c.addEventListener('input', () => {
      refusal.hidden = true;
      invalidate();
    });

  // ---- reading the table ------------------------------------------------------------
  const rowsOf = () => {
    const lines = data.value
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    // A decimal comma in Spanish would clash with a comma separator: tabs, semicolons and spaces only there.
    const sep = lang() === 'es' ? /[\t;]\s*|\s+/ : /[\t;,]\s*|\s+/;
    return lines.map(l => l.split(sep).map(v => typedNumber(v, lang())));
  };
  const fail = (code, d = {}) => {
    refusal.hidden = false;
    refusal.textContent = t(`obs.orb.no.${code}`, d);
    out.replaceChildren();
    resid.replaceChildren();
    pathSvg.hidden = residSvg.hidden = true;
    say(refusal.textContent);
    result = null;
    update();
  };
  function orbitSeries() {
    const rows = rowsOf();
    const polar = inputSel.value === 'polar';
    const need = polar ? 5 : 4;
    if (
      !rows.length ||
      rows.some(
        r => r.length < need || r.slice(0, need).some(v => !Number.isFinite(v))
      )
    )
      return { ok: false, code: 'paste', data: { n: need } };
    return {
      ok: true,
      series: {
        epochs: rows.map(r => {
          const time = { value: r[0], format: yearSel.value };
          return polar
            ? { time, rho: r[1], theta: r[2], sigmaRho: r[3], sigmaTheta: r[4] }
            : {
                time,
                x: r[1],
                y: r[2],
                sx: r[3],
                sy: Number.isFinite(r[4]) ? r[4] : r[3],
              };
        }),
      },
    };
  }
  function trackFrames() {
    const rows = rowsOf();
    if (
      !rows.length ||
      rows.some(
        r => r.length < 4 || r.slice(0, 4).some(v => !Number.isFinite(v))
      )
    )
      return { ok: false, code: 'paste', data: { n: 4 } };
    const sky = coordsSel.value === 'sky';
    const byTime = new Map();
    for (const r of rows) {
      const key = String(r[0]);
      if (!byTime.has(key)) byTime.set(key, []);
      byTime
        .get(key)
        .push(
          sky
            ? { ra: r[1], dec: r[2], sigma: r[3] }
            : { x: r[1], y: r[2], sigma: r[3] }
        );
    }
    return {
      ok: true,
      frames: [...byTime].map(([k, sources]) => ({
        time: {
          value: Number(k),
          format: tFormatSel.value,
          scale: tScaleSel.value,
        },
        sources,
      })),
    };
  }
  function parallax() {
    if (plxIn.value.trim() === '') return null;
    const v = typedNumber(plxIn.value, lang());
    const s = typedNumber(plxSigmaIn.value, lang());
    return {
      value: v,
      sigma: s,
      unit: 'mas',
      frame: frameSel.value,
      source: sourceIn.value.trim() || undefined,
    };
  }

  // ---- fitting ----------------------------------------------------------------------
  function doExample() {
    data.value = EXAMPLE[modeSel.value];
    if (modeSel.value === 'orbit') {
      inputSel.value = 'offsets';
      yearSel.value = 'year';
      plxIn.value = ctx.number(100);
      plxSigmaIn.value = ctx.number(4);
      frameSel.value = 'relative';
    } else {
      coordsSel.value = 'offsets';
      tFormatSel.value = 'jd';
      tScaleSel.value = 'tdb';
    }
    refusal.hidden = true;
    invalidate();
    say(t(`obs.orb.said.example.${modeSel.value}`));
  }
  function doFit() {
    refusal.hidden = true;
    if (modeSel.value === 'track') return doTrack();
    const s = orbitSeries();
    if (!s.ok) return fail(s.code, s.data);
    const depth = depthSel.value;
    const fit = fitOrbit(s.series, { depth });
    if (!fit.ok) return fail(fit.code, refusalData(fit));
    const p = parallax();
    const mass = p ? massSum(fit, p) : null;
    result = { mode: 'orbit', fit, series: s.series, mass, depth };
    render();
    update();
    say(t('obs.orb.said.fitted', { n: fit.epochs }));
  }
  function doTrack() {
    const f = trackFrames();
    if (!f.ok) return fail(f.code, f.data);
    const found = track.findMover(f.frames);
    if (!found.ok) return fail(found.code, trackData(found));
    result = { mode: 'track', found, frames: f.frames };
    render();
    update();
    say(t('obs.orb.said.found'));
  }
  const refusalData = r => {
    const d = r.data ?? {};
    return {
      n: d.epochs ?? '',
      need: d.need ?? d.coverageNeeded ?? '',
      have: d.coverageLower !== undefined ? fmt(d.coverageLower, 2) : '',
      kappa: d.condition !== undefined ? fmt(d.condition, 2) : '',
      max: d.conditionMax !== undefined ? fmt(d.conditionMax, 2) : '',
      alt: d.alternatePeriod !== undefined ? fmt(d.alternatePeriod, 4) : '',
      p: d.pValue !== undefined ? fmt(d.pValue, 2) : '',
      row: d.row ?? '',
      days: d.days !== undefined ? fmt(d.days, 3) : '',
    };
  };
  const trackData = r => ({
    n: r.data?.frames ?? r.data?.n ?? '',
    movers: r.data?.movers?.length ?? '',
    static: r.data?.staticSources ?? '',
    frame: r.data?.frame ?? '',
  });

  // ---- rendering --------------------------------------------------------------------
  const cell = (tag, txt, extra = {}) =>
    el(tag, { textContent: txt, ...extra });
  const line = txt => el('p', { textContent: txt });
  const table = (caption, head, body) =>
    el(
      'div',
      { className: 'im-tablewrap' },
      el(
        'table',
        { className: 'im-table' },
        cell('caption', caption),
        el(
          'thead',
          {},
          el('tr', {}, ...head.map(h => cell('th', h, { scope: 'col' })))
        ),
        el(
          'tbody',
          {},
          ...body.map(r =>
            el(
              'tr',
              {},
              cell('th', r[0], { scope: 'row' }),
              ...r.slice(1).map(v => cell('td', v))
            )
          )
        )
      )
    );
  const pm = (v, s, d = 4) => `${fmt(v, d)} ± ${fmt(s, 2)}`;
  function render() {
    if (!result) return;
    if (result.mode === 'track') return renderTrack();
    const { fit, mass } = result;
    const el0 = fit.elements;
    const eccentric = fit.kind === 'thiele-innes-orbit';
    const rows = [
      [t('obs.orb.el.P'), pm(el0.P.value, el0.P.sigma), t('obs.orb.u.yr')],
      [
        t('obs.orb.el.a'),
        pm(el0.a.value * 1000, el0.a.sigma * 1000),
        t('obs.orb.u.mas'),
      ],
      [
        t('obs.orb.el.e'),
        eccentric && fit.eccentricity?.detected
          ? pm(el0.e.value, el0.e.sigma)
          : fit.eccentricity?.upper95
            ? t('obs.orb.eLimit', { e: fmt(fit.eccentricity.upper95, 2) })
            : fmt(0, 1),
        '',
      ],
      [t('obs.orb.el.i'), pm(el0.i.value, el0.i.sigma, 4), t('obs.orb.u.deg')],
      [
        t('obs.orb.el.Omega'),
        pm(el0.Omega.value, el0.Omega.sigma, 4),
        t('obs.orb.u.deg'),
      ],
      [
        t(
          eccentric && fit.eccentricity?.detected
            ? 'obs.orb.el.omega'
            : 'obs.orb.el.latitude'
        ),
        pm(el0.omega.value, el0.omega.sigma, 4),
        t('obs.orb.u.deg'),
      ],
    ];
    if (eccentric && fit.eccentricity?.detected)
      rows.push([
        t('obs.orb.el.T'),
        pm(el0.T.value, el0.T.sigma, 6),
        t('obs.orb.u.year'),
      ]);
    const parts = [
      table(
        t('obs.orb.elements'),
        ['name', 'value', 'unit'].map(k => t(`obs.orb.col.${k}`)),
        rows
      ),
      line(
        t('obs.orb.period', {
          lo: fmt(el0.P.interval68[0], 4),
          hi: fmt(el0.P.interval68[1], 4),
          lo95: fmt(el0.P.interval95?.[0], 4),
          hi95: fmt(el0.P.interval95?.[1], 4),
        })
      ),
      line(
        t('obs.orb.criterion', {
          have: fmt(fit.criterion.coverageLower, 2),
          need: fmt(fit.criterion.coverageNeeded, 2),
          kappa: fmt(fit.criterion.condition, 2),
          max: fmt(fit.criterion.conditionMax, 2),
          p: fmt(fit.pValue, 2),
          chi2: fmt(fit.chi2, 4),
          dof: fit.dof,
        })
      ),
      line(
        t(
          result.depth === 'elliptical'
            ? fit.eccentricity?.detected
              ? 'obs.orb.ecc.detected'
              : 'obs.orb.ecc.none'
            : 'obs.orb.ecc.circular',
          { d: fmt(fit.eccentricity?.deltaChi2 ?? 0, 3) }
        )
      ),
      el('p', { className: 'ui-hint', textContent: t('obs.orb.node') }),
    ];
    if (mass) {
      if (mass.ok) {
        const [a, b] = mass.intervals;
        parts.push(
          line(
            t('obs.orb.mass', {
              m: fmt(mass.value, 3),
              lo: fmt(a.lo, 3),
              hi: fmt(a.hi, 3),
              lo95: fmt(b.lo, 3),
              hi95: fmt(b.hi, 3),
            })
          ),
          el('p', {
            className: 'ui-hint',
            textContent: t(`obs.orb.frameStatement.${mass.parallax.frame}`, {
              source: mass.parallax.source ?? '',
            }),
          })
        );
      } else
        parts.push(
          line(
            t(`obs.orb.no.mass.${mass.code}`, {
              snr: mass.data?.snr !== undefined ? fmt(mass.data.snr, 2) : '',
              need: mass.data?.need ?? '',
            })
          )
        );
    }
    out.replaceChildren(...parts);
    drawOrbit(fit);
    resid.replaceChildren(
      table(
        t('obs.orb.resid'),
        ['n', 'year', 'dx', 'dy', 'zx', 'zy'].map(k => t(`obs.orb.rcol.${k}`)),
        fit.residuals.map((r, k) => [
          String(k + 1),
          fmt(r.year, 8),
          fmt(r.dx * 1000, 4),
          fmt(r.dy * 1000, 4),
          fmt(r.zx, 3),
          fmt(r.zy, 3),
        ])
      )
    );
  }
  function renderTrack() {
    const r = result.found;
    const parts = [
      table(
        t('obs.orb.trackParams'),
        ['name', 'value', 'unit'].map(k => t(`obs.orb.col.${k}`)),
        [
          [
            t('obs.orb.rate'),
            pm(r.rate.value, r.rate.sigma, 4),
            t('obs.orb.u.arcsecHour'),
          ],
          [
            t('obs.orb.pa'),
            pm(r.positionAngle.value, r.positionAngle.sigma, 4),
            t('obs.orb.u.deg'),
          ],
        ]
      ),
      line(
        t('obs.orb.trackFit', {
          n: r.frames,
          s: r.staticSources,
          sig: fmt(r.significance, 3),
          chi2: fmt(r.chi2, 4),
          dof: r.dof,
          p: fmt(r.pValue, 2),
        })
      ),
      el('p', {
        className: 'ui-hint',
        textContent: t(
          r.positionAngle.local ? 'obs.orb.paLocal' : 'obs.orb.paPlane'
        ),
      }),
    ];
    out.replaceChildren(...parts);
    const data0 = {
      kind: 'time-series',
      columns: [
        {
          id: 'x',
          name: t('obs.orb.axis.east'),
          unit: 'arcsec',
          role: 'x',
          values: r.positions.map(p => p.x),
        },
        {
          id: 'y',
          name: t('obs.orb.axis.north'),
          unit: 'arcsec',
          role: 'value',
          values: r.positions.map(p => p.y),
        },
      ],
      axes: { x: 'x', y: 'y' },
      masks: [],
    };
    const tRef = r.start.jd;
    const first = r.positions[0].jd;
    const last = r.positions[r.positions.length - 1].jd;
    const dense = [0, 1].map(k => {
      const h = (first + (last - first) * k - tRef) * 24;
      return [r.start.x + r.velocity.x * h, r.start.y + r.velocity.y * h];
    });
    pathSvg.hidden = false;
    pathPlot.draw(data0, {
      xColumn: 'x',
      yColumn: 'y',
      overlays: [{ label: t('obs.orb.model'), points: dense }],
    });
    pathSvg.setAttribute('aria-label', t('obs.orb.plot.track'));
    residSvg.hidden = true;
    resid.replaceChildren(
      table(
        t('obs.orb.resid'),
        ['n', 'dx', 'dy', 'zx', 'zy'].map(k => t(`obs.orb.rcol.${k}`)),
        r.residuals.map((q, k) => [
          String(k + 1),
          fmt(q.dx * 1000, 4),
          fmt(q.dy * 1000, 4),
          fmt(q.zx, 3),
          fmt(q.zy, 3),
        ])
      )
    );
  }
  function drawOrbit(fit) {
    const rs = fit.residuals;
    const d = {
      kind: 'time-series',
      columns: [
        {
          id: 'x',
          name: t('obs.orb.axis.east'),
          unit: 'arcsec',
          role: 'x',
          values: rs.map(r => r.y),
        },
        {
          id: 'y',
          name: t('obs.orb.axis.north'),
          unit: 'arcsec',
          role: 'value',
          values: rs.map(r => r.x),
        },
      ],
      axes: { x: 'x', y: 'y' },
      masks: [],
    };
    const curve = orbitCurve(fit, 120).map(p => [p.y, p.x]);
    pathSvg.hidden = false;
    pathPlot.draw(d, {
      xColumn: 'x',
      yColumn: 'y',
      overlays: [{ label: t('obs.orb.model'), points: curve }],
    });
    pathSvg.setAttribute('aria-label', t('obs.orb.plot.orbit'));
    const first = rs[0].year;
    const rd = {
      kind: 'time-series',
      columns: [
        {
          id: 't',
          name: t('obs.orb.axis.t'),
          unit: 'yr',
          role: 'x',
          values: rs.map(r => r.year - first),
        },
        {
          id: 'dx',
          name: t('obs.orb.axis.dx'),
          unit: 'mas',
          role: 'value',
          values: rs.map(r => r.dx * 1000),
        },
      ],
      axes: { x: 't', y: 'dx' },
      masks: [],
    };
    residSvg.hidden = false;
    residPlot.draw(rd, {
      xColumn: 't',
      yColumn: 'dx',
      overlays: [
        {
          label: t('obs.orb.axis.dy'),
          points: rs.map(r => [r.year - first, r.dy * 1000]),
        },
      ],
    });
    residSvg.setAttribute('aria-label', t('obs.orb.plot.resid'));
  }

  // ---- the lists, and the ledger ----------------------------------------------------
  function doCsv() {
    if (!result) return;
    let rows;
    if (result.mode === 'orbit')
      rows = csvRows(
        result.fit,
        ['n', 'year', 'x', 'y', 'dx', 'dy', 'zx', 'zy'].map(k =>
          t(`obs.orb.csvCol.${k}`)
        ),
        num
      );
    else
      rows = [
        ['n', 'dx', 'dy', 'zx', 'zy'].map(k => t(`obs.orb.csvCol.${k}`)),
        ...result.found.residuals.map((q, k) => [
          String(k + 1),
          num(q.dx),
          num(q.dy),
          num(q.zx),
          num(q.zy),
        ]),
      ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', { href: url, download: `${result.mode}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say(t('obs.orb.said.csv', { n: rows.length - 1 }));
  }
  async function doKeep() {
    if (!result) return;
    try {
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const orbit = result.mode === 'orbit';
      const input = orbit ? result.series : result.frames;
      const digest = await sha256Hex(
        new TextEncoder().encode(JSON.stringify(input))
      );
      const envelope = artifact({
        id: `${result.mode}-${digest.slice(0, 12)}`,
        source: { kind: 'analysis', id: result.mode, digest },
        quantities: orbit
          ? quantitiesOf(result.fit, result.mass)
          : track.quantitiesOf(result.found),
        ...(orbit ? { fit: fitRecordOf(result.fit) } : {}),
        provenance: {
          reductions: [
            orbit
              ? reductionOf(result.series, result.fit)
              : track.reductionOf(result.frames, result.found),
          ],
        },
        warnings: orbit && result.mass?.ok ? [result.mass.frameStatement] : [],
        made: { app: 'gravitas', tool: orbit ? 'image-orbit' : 'image-track' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_SERIES,
        envelope,
        title: t(
          orbit ? 'obs.orb.ledgerEntry.orbit' : 'obs.orb.ledgerEntry.track'
        ),
        labels: { quantity: q => t(`obs.orb.q.${q.id.split('.')[1]}`) },
        context: { page: 'observatory' },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.orb.said.kept'));
    } catch (err) {
      say(t('obs.orb.said.keepFailed', { why: err.message }));
    }
  }

  // ---- state of the buttons, and the page's language ----------------------------------
  function update() {
    csvBtn.disabled = !result;
    keepBtn.disabled = !result;
  }
  function label() {
    for (const [n, id, prop] of labelled) n[prop] = t(id);
    optionWords();
    if (result) render();
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  showMode();
  label();
  update();
  return { update };
}
