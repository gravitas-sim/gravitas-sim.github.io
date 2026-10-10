// =============================================================================
// The observatory's comparison panel: a model laid over the data in view
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it (js/observatoryPage.js), so the page
// carries none of it. The arithmetic is js/compare/compare.js; this is the
// view: the data with the model over them, the residuals with the data's own
// error bars, the numbers, a sentence about where the model misses, a table of
// every row, and for a system, a slider on each element. COMPARE_INSTRUMENT.md
// is the reading guide.
//
// It never fits. A slider changes a value the model was given and the overlay
// is recomputed from it; the page says which numbers are fitted, fixed, derived
// or assumed, and which one the reader has moved.
//
// Nothing from the page's own modules is imported (its plot and translator
// arrive in `ctx`), for the reason js/observatory/fitPanel.js gives.
// =============================================================================

import { EN_INFERENCE } from '../i18n/en.inference.js';
import { ES_INFERENCE } from '../i18n/es.inference.js';
import {
  CompareError,
  SYSTEM_MODELS,
  compareModel,
} from '../compare/compare.js';
import { comparisonArtifact } from '../compare/artifact.js';
import {
  EXOPLANET_IDS,
  elementRange,
  stateFromExoplanet,
  withElement,
  elementValue,
} from '../compare/system.js';
import { MODELS } from '../inference/models.js';
import { artifactEntry } from '../notebook/artifactEntry.js';
import { SOURCE } from '../notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../notebook/store.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
};

const svgEl = id => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('id', id);
  node.setAttribute('class', 'ow-plot');
  node.setAttribute('role', 'img');
  return node;
};

const fmt = v =>
  Number.isFinite(v)
    ? String(Number(Math.abs(v) < 1e-300 ? 0 : v.toPrecision(5)))
    : '-';
/** The table's rows, enough to read and to keep the page light. */
const TABLE_ROWS = 200;
/** The overlay is a curve: thinned past this many points. */
const OVERLAY_POINTS = 3000;

/** The model a system is observed through, from the data's y dimension. */
export function systemModelFor(o, dimensionOfText) {
  if (o?.kind !== 'time-series') return null;
  const y = o.columns.find(c => c.id === o.axes.y);
  const dim = dimensionOfText(y?.unit ?? null);
  if (dim === 'velocity') return 'radial-velocity';
  if (dim === 'ratio' || dim === null) return 'transit';
  return null;
}

/**
 * @param {HTMLElement} root
 * @param {{t: Function, number: Function, createPlot: Function,
 *   registerMessages: Function, observation: object,
 *   dimensionOfText: Function, fits?: () => object[]}} ctx
 */
export function mountComparePanel(root, ctx) {
  const { t, number, createPlot, dimensionOfText } = ctx;
  ctx.registerMessages({ en: EN_INFERENCE, es: ES_INFERENCE });
  let o = ctx.observation;
  let kind = 'system';
  let systemId = EXOPLANET_IDS[0];
  let base = stateFromExoplanet(systemId);
  let state = base;
  let moved = new Set();
  let last = null;

  const sourceSelect = el('select', { id: 'cmpSource', class: 'ui-select' });
  const systemSelect = el('select', { id: 'cmpSystem', class: 'ui-select' });
  const controls = el('div', { id: 'cmpControls', class: 'ow-cmp-controls' });
  const status = el('p', {
    id: 'cmpStatus',
    class: 'ui-hint',
    role: 'status',
    'aria-live': 'polite',
  });
  const summary = el('div', { id: 'cmpSummary' });
  const plotSvg = svgEl('cmpPlot');
  const resSvg = svgEl('cmpResiduals');
  const params = el('div', { id: 'cmpParams' });
  const rows = el('details', { id: 'cmpRows', class: 'ui-disclosure' });
  const keep = el('button', {
    id: 'cmpKeep',
    class: 'ui-button',
    type: 'button',
    text: t('obs.cmp.keep'),
  });
  const reset = el('button', {
    id: 'cmpReset',
    class: 'ui-button subtle',
    type: 'button',
    text: t('obs.cmp.reset'),
  });
  const plotter = svg =>
    createPlot(svg, {
      number,
      labels: { notStated: t('obs.unit.notStated') },
    });
  const mainPlot = plotter(plotSvg);
  const resPlot = plotter(resSvg);

  const field = (label, control) =>
    el(
      'label',
      { class: 'ui-field' },
      el('span', { class: 'ui-label', text: label }),
      control
    );

  for (const k of ['system', 'analytic', 'inference'])
    sourceSelect.append(
      el('option', { value: k, text: t(`obs.cmp.src.${k}`) })
    );
  for (const id of EXOPLANET_IDS)
    systemSelect.append(
      el('option', { value: id, text: t(`obs.cmp.sys.${id}`) })
    );

  root.replaceChildren(
    el('p', { class: 'ui-hint', text: t('obs.cmp.intro') }),
    el(
      'div',
      { class: 'ui-toolbar' },
      field(t('obs.cmp.source'), sourceSelect),
      field(t('obs.cmp.system'), systemSelect),
      reset
    ),
    controls,
    status,
    plotSvg,
    resSvg,
    summary,
    params,
    rows,
    el('p', { class: 'ui-hint', text: t('obs.cmp.cite') }),
    el('div', { class: 'ui-toolbar' }, keep)
  );

  /** The source the controls describe, or a refusal in words. */
  function currentSource() {
    if (kind === 'system') {
      const model = systemModelFor(o, dimensionOfText);
      if (!model)
        throw new CompareError('model', t('obs.cmp.refused', { why: '' }));
      return {
        kind,
        model,
        state,
        moved: [...moved],
        exposureDays: 0,
      };
    }
    if (kind === 'inference') {
      const doc = ctx.fits?.().at(-1);
      if (!doc) throw new CompareError('result', t('obs.cmp.noFit'));
      return { kind, result: doc };
    }
    const id =
      systemModelFor(o, dimensionOfText) === 'radial-velocity'
        ? 'rv-keplerian'
        : 'transit-quadratic';
    const values = {};
    for (const p of o.synthetic?.truth?.parameters ?? [])
      if (p.fit) values[p.fit] = p.value;
    for (const p of MODELS[id].parameters)
      values[p.name] ??= Number(
        controls.querySelector?.(`[data-param="${p.name}"]`)?.value
      );
    return { kind, model: id, parameters: values };
  }

  function drawControls() {
    controls.replaceChildren();
    if (kind !== 'system') return;
    const model = systemModelFor(o, dimensionOfText);
    if (!model) return;
    for (const id of SYSTEM_MODELS[model].elements) {
      const range = elementRange(base, id);
      const v = elementValue(state, id);
      const input = el('input', {
        id: `cmpEl-${id}`,
        type: 'range',
        class: 'ui-range',
        min: range.min,
        max: Math.max(range.max, v),
        step: range.step,
        value: v,
        'data-element': id,
      });
      const out = el('output', { for: `cmpEl-${id}`, text: fmt(v) });
      input.addEventListener('input', () => {
        const value = Number(input.value);
        state = withElement(state, id, value);
        moved.add(id);
        out.textContent = fmt(value);
        refresh();
      });
      controls.append(
        el(
          'label',
          { class: 'ui-field' },
          el('span', { class: 'ui-label', text: t(`obs.cmp.el.${id}`) }),
          input,
          out
        )
      );
    }
  }

  function overlayPoints(c) {
    const order = Array.from(c.x, (_, i) => i).sort((a, b) => c.x[a] - c.x[b]);
    const step = Math.max(1, Math.ceil(order.length / OVERLAY_POINTS));
    return order
      .filter((_, k) => k % step === 0)
      .map(i => [c.x[i], c.model[i]]);
  }

  function render(c) {
    const yCol = o.columns.find(col => col.id === c.data.columns.y);
    mainPlot.draw(o, {
      xColumn: o.axes.x,
      yColumn: o.axes.y,
      overlays: [{ label: t('obs.cmp.col.model'), points: overlayPoints(c) }],
    });
    plotSvg.setAttribute('aria-label', t('obs.cmp.plotLabel', { n: c.n }));
    const resObs = {
      kind: 'time-series',
      columns: [
        {
          id: 'x',
          name: t('obs.cmp.res.x'),
          unit: c.data.units.x,
          role: 'x',
          values: c.x,
        },
        {
          id: 'r',
          name: t('obs.cmp.res.residual'),
          unit: yCol?.unit ?? c.data.units.y,
          role: 'value',
          values: c.residual,
        },
        ...(c.sigma
          ? [
              {
                id: 'r-sigma',
                name: 'sigma',
                unit: c.data.units.y,
                role: 'uncertainty',
                of: 'r',
                values: c.sigma,
              },
            ]
          : []),
      ],
      axes: { x: 'x', y: 'r' },
      masks: [],
    };
    resPlot.draw(resObs, { xColumn: 'x', yColumn: 'r' });
    resSvg.setAttribute('aria-label', t('obs.cmp.resLabel', { n: c.n }));

    const lines = [
      c.data.weighted
        ? t('obs.cmp.stat.weighted', {
            chi2: fmt(c.chi2),
            n: c.n,
            dof: c.dof,
            red: fmt(c.reducedChi2),
            m2lnL: fmt(c.objective.m2lnL),
          })
        : t('obs.cmp.stat.plain', {
            value: fmt(c.objective.value),
            rms: fmt(c.rms),
          }),
      t('obs.cmp.stat.dof', { fitted: c.fitted }),
    ];
    const pattern = c.pattern.structured
      ? el(
          'div',
          {},
          el('p', { text: t('obs.cmp.pattern.head') }),
          el(
            'ul',
            {},
            ...c.pattern.bins
              .filter(b => b.sense !== 'ok')
              .map(b =>
                el('li', {
                  text: t(`obs.cmp.pattern.${b.sense}`, {
                    from: fmt(b.from),
                    to: fmt(b.to),
                  }),
                })
              )
          ),
          el('p', {
            text: t('obs.cmp.pattern.run', { run: c.pattern.longestRun }),
          })
        )
      : el('p', { text: t('obs.cmp.pattern.ok') });
    summary.replaceChildren(...lines.map(l => el('p', { text: l })), pattern);
    status.textContent = c.pattern.structured
      ? t('obs.cmp.pattern.head')
      : t('obs.cmp.pattern.ok');

    const tr = p =>
      el(
        'tr',
        {},
        el('th', { scope: 'row', text: p.name }),
        el('td', { text: `${fmt(p.value)} ${p.unit ?? ''}`.trim() }),
        el('td', {
          'data-kind': p.status,
          text:
            t(`obs.cmp.kind.${p.status}`) +
            (p.moved ? ` · ${t('obs.cmp.moved')}` : ''),
        })
      );
    params.replaceChildren(
      el(
        'div',
        {
          class: 'ui-table-wrap is-numeric',
          tabindex: '0',
          role: 'region',
          'aria-label': t('obs.cmp.params'),
        },
        el(
          'table',
          { class: 'ow-cmp-params' },
          el('caption', { text: t('obs.cmp.params') }),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ...['parameter', 'value', 'kind'].map(k =>
                el('th', { scope: 'col', text: t(`obs.cmp.col.${k}`) })
              )
            )
          ),
          el('tbody', {}, ...c.parameters.map(tr))
        )
      )
    );

    const n = Math.min(TABLE_ROWS, c.n);
    const head = [
      'x',
      'data',
      'model',
      'residual',
      ...(c.sigma ? ['normalised'] : []),
    ];
    const body = [];
    for (let i = 0; i < n; i++)
      body.push(
        el(
          'tr',
          {},
          ...[
            c.x[i],
            c.y[i],
            c.model[i],
            c.residual[i],
            ...(c.sigma ? [c.normalised[i]] : []),
          ].map(v => el('td', { text: fmt(v) }))
        )
      );
    rows.replaceChildren(
      el('summary', { text: t('obs.cmp.table.caption') }),
      el(
        'div',
        {
          class: 'ui-table-wrap is-numeric is-scroll',
          tabindex: '0',
          role: 'region',
          'aria-label': t('obs.cmp.table.caption'),
        },
        el(
          'table',
          {},
          el('caption', { text: t('obs.cmp.table.caption') }),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ...head.map(k =>
                el('th', {
                  scope: 'col',
                  text: k === 'x' ? t('obs.cmp.res.x') : t(`obs.cmp.col.${k}`),
                })
              )
            )
          ),
          el('tbody', {}, ...body)
        )
      )
    );
  }

  function refresh() {
    try {
      last = compareModel(o, currentSource());
      render(last);
      keep.disabled = false;
    } catch (err) {
      last = null;
      keep.disabled = true;
      if (!(err instanceof CompareError)) throw err;
      status.textContent =
        err.code === 'result'
          ? err.message
          : t('obs.cmp.refused', { why: err.message });
      summary.replaceChildren();
      params.replaceChildren();
    }
  }

  sourceSelect.addEventListener('change', () => {
    kind = sourceSelect.value;
    systemSelect.disabled = kind !== 'system';
    drawControls();
    refresh();
  });
  systemSelect.addEventListener('change', () => {
    systemId = systemSelect.value;
    base = stateFromExoplanet(systemId);
    state = base;
    moved = new Set();
    drawControls();
    refresh();
  });
  reset.addEventListener('click', () => {
    state = base;
    moved = new Set();
    drawControls();
    refresh();
  });
  keep.addEventListener('click', () => {
    if (!last) return;
    try {
      const entry = artifactEntry({
        source: SOURCE.COMPARISON,
        envelope: comparisonArtifact(last, { observation: o }),
        title: `${t('obs.cmp.title')}: ${o.title ?? o.id}`,
        labels: {
          quantity: q => q.id,
          note: q => t(`obs.cmp.kind.${q.origin}`, {}) ?? q.origin,
        },
        context: { page: 'observatory', observation: o.id },
      });
      const loaded = loadNotebook();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = saveNotebook([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      status.textContent = t('obs.cmp.kept');
    } catch (err) {
      status.textContent = t('obs.cmp.keepFailed', { why: err.message });
    }
  });

  drawControls();
  refresh();

  return {
    /** The page's view changed: compare against the new one. */
    update(next) {
      o = next;
      state = base;
      moved = new Set();
      drawControls();
      refresh();
    },
    result: () => last,
    destroy() {
      root.replaceChildren();
    },
  };
}
