// =============================================================================
// The Observatory's cluster-fit panel: an age and a distance at an assumed metallicity
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it (js/observatoryPage.js), so the page carries none
// of it. The arithmetic is js/kernels/clusters/ (Prompt 219, CLUSTER_FITTING.md):
// MIST isochrones fitted to the colour-magnitude diagram of the stars in view over log
// age and distance modulus, at a metallicity, a reddening and a non-member share the
// reader states; profile intervals, the age-distance valley, and a gravitas.artifact/2
// record. It never fits the metallicity or the reddening, and it says so.
//
// Nothing from the page's own modules is imported (its translator arrives in `ctx`),
// for the reason js/observatory/fitPanel.js gives.
// =============================================================================

import { listeners } from '../listeners.js';
import { fixed } from '../format.js';
import { typedNumber } from '../answerParse.js';
import * as K from '../kernels/clusters/index.js';
import { EN_CLUSTER } from '../i18n/en.cluster.js';
import { ES_CLUSTER } from '../i18n/es.cluster.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
};

/** The stars of a table observation that the fit reads: g and g - r, unmasked and finite. */
export function starsOf(o) {
  const col = id => o?.columns?.find(c => c.id === id);
  const g = col('g');
  const r = col('r');
  if (!g || !r) return null;
  const skip = new Set();
  for (const m of o.masks ?? []) for (const i of m.rows) skip.add(i);
  const gs = [];
  const cs = [];
  for (let i = 0; i < g.values.length; i++) {
    if (skip.has(i)) continue;
    const a = g.values[i];
    const b = r.values[i];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      gs.push(a);
      cs.push(a - b);
    }
  }
  return { g: gs, colour: cs };
}

/** The isochrone set from the model table the page opens. */
let setCache = null;
export async function isochroneSet(ctx) {
  if (setCache) return setCache;
  const table = await ctx.model('mist-isochrones');
  const columns = table.columns.map(c => ({ id: c.id, values: c.values }));
  setCache = K.parseIsochrones({ n: columns[0].values.length, columns });
  return setCache;
}

/** The fit's document for the guides' checks (the fit panel's shape). */
export function guideDocument(result, observation, settings) {
  const d = (name, value) => ({ name, value });
  return {
    data: { observation },
    model: { id: K.MODEL_ID },
    settings,
    results: {
      fit: {
        parameters: [d('logAge', result.best.logAge), d('dm', result.best.dm)],
        derived: [
          d('age', 10 ** (result.best.logAge - 9)),
          d('distance', 10 ** (result.best.dm / 5 + 1)),
        ],
      },
    },
  };
}

export function mountClusterPanel(root, ctx) {
  const { t, number, registerMessages, createPlot } = ctx;
  registerMessages({ en: EN_CLUSTER, es: ES_CLUSTER });
  let obs = ctx.observation ?? null;
  const input = (id, label, value, attrs = {}) => [
    el('label', { for: id, text: label }),
    el('input', { id, type: 'number', value, step: 'any', ...attrs }),
  ];
  const feh = el('select', { id: 'obsClFeh' });
  for (const v of [-0.5, -0.25, 0])
    feh.append(
      el('option', {
        value: v,
        text: fixed(v, 2),
        ...(v === -0.25 ? { selected: '' } : {}),
      })
    );
  const E = el('input', {
    id: 'obsClE',
    type: 'number',
    min: 0,
    max: 0.5,
    step: 0.001,
    value: K.DEFAULT_REDDENING,
  });
  const eps = el('input', {
    id: 'obsClEps',
    type: 'number',
    min: 0.01,
    max: 0.9,
    step: 0.01,
    value: K.DEFAULT_CONTAMINATION,
  });
  const lo = el('input', {
    id: 'obsClLo',
    type: 'number',
    min: 5,
    max: 20,
    step: 0.1,
    value: K.GRID.dm[0],
  });
  const hi = el('input', {
    id: 'obsClHi',
    type: 'number',
    min: 5,
    max: 20,
    step: 0.1,
    value: K.GRID.dm[1],
  });
  const go = el('button', {
    type: 'button',
    id: 'obsClFit',
    class: 'ui-button',
    text: t('clusterObs.fit'),
  });
  const form = el(
    'div',
    { class: 'ow-row' },
    el('label', { for: 'obsClFeh', text: t('clusterObs.feh') }),
    feh,
    el('label', { for: 'obsClE', text: t('clusterObs.E') }),
    E,
    el('label', { for: 'obsClEps', text: t('clusterObs.eps') }),
    eps,
    el('label', { for: 'obsClLo', text: t('clusterObs.dmLo') }),
    lo,
    el('label', { for: 'obsClHi', text: t('clusterObs.dmHi') }),
    hi,
    go
  );
  const out = el('div', { id: 'obsClOut', 'aria-live': 'polite' });
  root.replaceChildren(el('p', { text: t('clusterObs.note') }), form, out);

  const plotOf = (observation, view, label) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ow-plot');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    createPlot(svg, { number, labels: { notStated: '' } }).draw(
      observation,
      view
    );
    return svg;
  };
  const table = (id, rows) =>
    el(
      'div',
      {
        class: 'ui-table-wrap',
        tabindex: '0',
        role: 'region',
        'aria-label': t('clusterObs.title'),
      },
      el(
        'table',
        { id, class: 'ow-table' },
        el(
          'tbody',
          {},
          ...rows.map(([a, b]) =>
            el(
              'tr',
              {},
              el('th', { scope: 'row', text: a }),
              el('td', { text: b })
            )
          )
        )
      )
    );

  const show = (result, stars, settings, set) => {
    const kids = [];
    if (result.status === 'not-constrained') {
      kids.push(
        el('p', {
          class: 'ow-note',
          text: t(`clusterObs.nc.${result.reason}`, {
            n: result.stars,
            m: Math.round(result.members),
            min: K.MINIMUM_MEMBERS,
            gain: fixed(result.floorDeviance - result.deviance, 1),
          }),
        })
      );
      out.replaceChildren(...kids);
      return;
    }
    const iv = result.intervals;
    const fmt = (v, digits) => fixed(v, digits);
    const withInterval = (value, i, digits, unitKey, map = x => x) =>
      i.status === 'ok'
        ? t('clusterObs.v.interval', {
            v: t(unitKey, { v: fmt(map(value), digits) }),
            lo: fmt(map(i.lo), digits),
            hi: fmt(map(i.hi), digits),
          })
        : t('clusterObs.v.open', {
            v: t(unitKey, { v: fmt(map(value), digits) }),
          });
    const age = x => 10 ** (x - 9);
    const dist = x => 10 ** (x / 5 + 1);
    const rows = [
      [
        t('clusterObs.row.age'),
        withInterval(result.best.logAge, iv.logAge, 2, 'clusterObs.v.age', age),
      ],
      [t('clusterObs.row.logAge'), `${fmt(result.best.logAge, 3)}`],
      [
        t('clusterObs.row.dm'),
        withInterval(result.best.dm, iv.dm, 3, 'clusterObs.v.dm'),
      ],
      [
        t('clusterObs.row.distance'),
        withInterval(result.best.dm, iv.dm, 0, 'clusterObs.v.pc', dist),
      ],
      [t('clusterObs.row.members'), fmt(result.members, 0)],
      [t('clusterObs.row.stat'), fmt(result.deviance, 1)],
      [
        t('clusterObs.row.valley'),
        result.correlation === null
          ? t('clusterObs.v.valleyNone')
          : t('clusterObs.v.valley', { r: fmt(result.correlation, 2) }),
      ],
      [
        t('clusterObs.row.assumed'),
        t('clusterObs.v.assumed', {
          feh: fmt(settings.feh, 2),
          E: fmt(settings.E, 3),
          R: fmt(settings.R, 3),
          eps: fmt(settings.eps, 2),
        }),
      ],
    ];
    kids.push(table('obsClTable', rows));
    if (result.status === 'open')
      kids.push(
        el('p', { class: 'ow-note', text: t('clusterObs.nc.interval') })
      );
    for (const w of result.warnings)
      kids.push(el('p', { class: 'ow-note', text: t(`clusterObs.warn.${w}`) }));
    // the stars and the best isochrone
    const iso = K.isochroneAt(set, settings.feh, result.best.logAge);
    const shiftG = result.best.dm + settings.R * settings.E;
    const points = [];
    for (const p of iso.phases) {
      for (let i = 0; i < p.g.length; i++)
        points.push([p.g[i] - p.r[i] + settings.E, p.g[i] + shiftG]);
      points.push([NaN, NaN]);
    }
    const cmdObs = {
      kind: 'table',
      columns: [
        {
          id: 'colour',
          name: t('clusterObs.cmd.colour'),
          unit: 'mag',
          role: 'x',
          values: stars.colour,
        },
        {
          id: 'g',
          name: t('clusterObs.cmd.g'),
          unit: 'mag',
          role: 'value',
          values: stars.g,
        },
      ],
      axes: { x: 'colour', y: 'g' },
      masks: [],
    };
    kids.push(
      el('h3', { text: t('clusterObs.cmd') }),
      el(
        'figure',
        {},
        plotOf(
          cmdObs,
          {
            xColumn: 'colour',
            yColumn: 'g',
            overlays: [{ label: 'isochrone', points }],
          },
          t('clusterObs.cmd.label', { n: stars.g.length })
        )
      )
    );
    // the profiles
    const profile = (values, getDelta, what, titleKey) => {
      const d = values.map(getDelta);
      const o = {
        kind: 'table',
        columns: [
          {
            id: 'x',
            name: t(`clusterObs.profile.${what}`),
            unit: '',
            role: 'x',
            values,
          },
          {
            id: 'y',
            name: t('clusterObs.profile.delta'),
            unit: '',
            role: 'value',
            values: d,
          },
        ],
        axes: { x: 'x', y: 'y' },
        masks: [],
      };
      const top = Math.min(10, Math.max(...d.filter(Number.isFinite)));
      return [
        el('h3', { text: t(titleKey) }),
        el(
          'figure',
          {},
          plotOf(
            o,
            {
              xColumn: 'x',
              yColumn: 'y',
              overlays: [
                {
                  label: '1',
                  points: [
                    [values[0], 1],
                    [values.at(-1), 1],
                  ],
                },
              ],
            },
            t('clusterObs.profile.label', {
              what: t(`clusterObs.profile.${what}`),
            })
          )
        ),
      ].concat(top > 0 ? [] : []);
    };
    const { ages, dms, delta } = result.surface;
    const nD = dms.length;
    const profAge = ages.map((_, i) => {
      let m = Infinity;
      for (let j = 0; j < nD; j++) m = Math.min(m, delta[i * nD + j]);
      return m;
    });
    const profDm = dms.map((_, j) => {
      let m = Infinity;
      for (let i = 0; i < ages.length; i++) m = Math.min(m, delta[i * nD + j]);
      return m;
    });
    kids.push(
      ...profile(
        ages,
        (_, i) => Math.min(profAge[i], 10),
        'age',
        'clusterObs.profileAge'
      )
    );
    kids.push(
      ...profile(
        dms,
        (_, j) => Math.min(profDm[j], 10),
        'dm',
        'clusterObs.profileDm'
      )
    );
    kids.push(
      el('h3', { text: t('clusterObs.valley.title') }),
      el(
        'figure',
        {},
        plotOf(
          {
            kind: 'table',
            columns: [
              {
                id: 'a',
                name: t('clusterObs.profile.age'),
                unit: '',
                role: 'x',
                values: result.valley.map(v => v.logAge),
              },
              {
                id: 'd',
                name: t('clusterObs.profile.dm'),
                unit: '',
                role: 'value',
                values: result.valley.map(v => v.dm),
              },
            ],
            axes: { x: 'a', y: 'd' },
            masks: [],
          },
          { xColumn: 'a', yColumn: 'd' },
          t('clusterObs.valley.label')
        )
      )
    );
    kids.push(el('h3', { text: t('clusterObs.assumes') }));
    const list = el('ul', {});
    for (const k of [
      'feh',
      'single',
      'members',
      'selection',
      'model',
      'interval',
    ])
      list.append(el('li', { text: t(`clusterObs.a.${k}`) }));
    kids.push(list);
    const record = K.clusterRecord(result, {
      source: { kind: 'observation', id: String(obs?.id ?? 'view') },
    });
    const blobUrl = URL.createObjectURL(
      new Blob([`${JSON.stringify(record, null, 2)}\n`], {
        type: 'application/json',
      })
    );
    kids.push(
      el(
        'p',
        {},
        el('a', {
          class: 'ui-button subtle',
          id: 'obsClRecord',
          href: blobUrl,
          download: `${t('clusterObs.recordName')}.json`,
          text: t('clusterObs.record'),
        })
      )
    );
    out.replaceChildren(...kids);
  };

  const run = async () => {
    const stars = starsOf(obs);
    if (!stars || stars.g.length < 10) {
      out.replaceChildren(el('p', { text: t('clusterObs.needs') }));
      return;
    }
    out.replaceChildren(el('p', { text: t('clusterObs.busy') }));
    await new Promise(r => setTimeout(r, 30));
    const settings = {
      feh: Number(feh.value),
      E: typedNumber(E.value),
      R: K.EXTINCTION_RATIO,
      eps: typedNumber(eps.value),
    };
    const dmRange = [typedNumber(lo.value), typedNumber(hi.value)];
    if (
      !(settings.E >= 0) ||
      !(settings.eps > 0 && settings.eps < 1) ||
      !(dmRange[1] > dmRange[0])
    )
      return;
    const set = await isochroneSet(ctx);
    const result = K.fitCluster(set, stars.g, stars.colour, {
      ...settings,
      dmRange,
    });
    show(result, stars, result.settings ?? { ...settings }, set);
    if (result.best && result.status !== 'not-constrained')
      ctx.record?.(
        guideDocument(result, obs?.id, {
          feh: settings.feh,
          E: settings.E,
          eps: settings.eps,
        })
      );
  };
  const listen = listeners();
  listen(go, 'click', run);
  return {
    update(o) {
      obs = o;
      out.replaceChildren();
    },
    destroy() {
      listen.off();
      root.replaceChildren();
    },
  };
}
