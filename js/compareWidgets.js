// =============================================================================
// Comparison instruments for lessons
// -----------------------------------------------------------------------------
// The lesson-side face of js/compare/ (COMPARE_INSTRUMENT.md): a system laid
// over declared data, with a slider on each of a few elements. A step docks one
// with `tool: { id: 'compare-transit', case: '<id>' }`; the case
// (js/compare/cases.js) is the data and the system it starts from.
//
// The picture is canvas, as every instrument's is, and the rows under it say
// everything it shows: the objective, where the model misses, which elements
// were moved. Nothing here fits. Moving a slider changes one value the model
// was given and the overlay is recomputed from it.
// =============================================================================

import { registerMessages, t } from './i18n/index.js';
import { EN_COMPARE } from './i18n/en.compare.js';
import { ES_COMPARE } from './i18n/es.compare.js';
import { formatNumber } from './format.js';
import { surface, token } from './widgetCanvas.js';
import { CASES, caseObservation } from './compare/cases.js';
import { CompareError, compareModel } from './compare/compare.js';
import { stateFromExoplanet, withElement } from './compare/system.js';

registerMessages('en', EN_COMPARE);
registerMessages('es', ES_COMPARE);

const GIVEN = stateFromExoplanet('hd209458');
const given = id =>
  ({
    radiusEarth: GIVEN.planets[0].radiusEarth,
    massEarth: GIVEN.planets[0].massEarth,
    periodDays: GIVEN.planets[0].periodDays,
    epochDays: 0,
    inclinationDeg: GIVEN.geometry.inclinationDeg,
    e: 0,
  })[id];

const control = (id, min, max, step, decimals, unit) => ({
  id,
  get label() {
    return t(`compareW.control.${id}`);
  },
  unit,
  min,
  max,
  step,
  value: given(id),
  decimals,
});

const observations = new Map();
const results = new Map();

/** The comparison for the slider values and the declared case. */
function compute(widget, v, tool) {
  const id = tool?.case ?? widget.defaultCase;
  const c = CASES[id];
  if (!c || c.model !== widget.model)
    return { error: `no ${widget.model} case "${id}"` };
  if (!observations.has(id)) observations.set(id, caseObservation(id));
  const key = `${id}|${widget.controls.map(k => v[k.id]).join('|')}`;
  if (results.has(key)) return results.get(key);
  let state = GIVEN;
  const moved = [];
  for (const k of widget.controls) {
    if (Math.abs(v[k.id] - k.value) > 1e-9) {
      state = withElement(state, k.id, v[k.id]);
      moved.push(k.id);
    }
  }
  let out;
  try {
    out = compareModel(observations.get(id), {
      kind: 'system',
      model: widget.model,
      state,
      moved,
    });
  } catch (e) {
    if (!(e instanceof CompareError)) throw e;
    out = { error: e.message };
  }
  if (results.size > 200) results.clear();
  results.set(key, out);
  return out;
}

function draw(canvas, v, _ctx, tool) {
  const { ctx, w } = surface(canvas, 260);
  const c = compute(this, v, tool);
  const muted = token('--text-muted', '#8a8f9e');
  const ink = token('--text', '#e6e9f2');
  const accent = token('--accent', '#38bdf8');
  const warn = '#f2a65a';
  if (c.error) {
    ctx.fillStyle = muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(c.error, 12, 24);
    return;
  }
  const x0 = 46;
  const pw = w - x0 - 10;
  const lo = Math.min(...c.y, ...c.model);
  const hi = Math.max(...c.y, ...c.model);
  const xs0 = c.x[0];
  const xs1 = c.x[c.x.length - 1];
  const X = x => x0 + ((x - xs0) / (xs1 - xs0 || 1)) * pw;
  const topH = 150;
  const Y = y => 8 + (1 - (y - lo) / (hi - lo || 1)) * (topH - 12);
  ctx.fillStyle = muted;
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(formatNumber(hi, { sig: 4 }), x0 - 4, 14);
  ctx.fillText(formatNumber(lo, { sig: 4 }), x0 - 4, topH - 2);
  ctx.fillStyle = ink;
  for (let i = 0; i < c.x.length; i++) {
    ctx.beginPath();
    ctx.arc(X(c.x[i]), Y(c.y[i]), 1.8, 0, 6.2832);
    ctx.fill();
  }
  ctx.strokeStyle = moved(c) ? warn : accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const order = Array.from(c.x, (_, i) => i).sort((a, b) => c.x[a] - c.x[b]);
  order.forEach((i, k) => {
    if (k === 0) ctx.moveTo(X(c.x[i]), Y(c.model[i]));
    else ctx.lineTo(X(c.x[i]), Y(c.model[i]));
  });
  ctx.stroke();
  // Residuals in sigmas, beneath.
  const base = topH + 14;
  const mid = base + 40;
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, mid);
  ctx.lineTo(x0 + pw, mid);
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.textAlign = 'left';
  ctx.fillText(t('compareW.axis.residual'), x0, base + 88);
  ctx.fillStyle = accent;
  for (let i = 0; i < c.x.length; i++) {
    const r = Math.max(-5, Math.min(5, c.normalised[i]));
    ctx.beginPath();
    ctx.arc(X(c.x[i]), mid - r * 7.5, 1.6, 0, 6.2832);
    ctx.fill();
  }
}

const moved = c => c.parameters.some(p => p.moved);

function readout(v, _ctx, tool) {
  const c = compute(this, v, tool);
  if (c.error) return [{ label: t('compareW.row.error'), value: c.error }];
  const fmt = x => formatNumber(x, { sig: 4 });
  const where = c.pattern.structured
    ? c.pattern.bins
        .filter(b => b.sense !== 'ok')
        .map(b =>
          t(`compareW.value.${b.sense}`, { from: fmt(b.from), to: fmt(b.to) })
        )
        .join('; ')
    : t('compareW.value.consistent');
  const els = c.parameters.filter(p => p.moved).map(p => p.name);
  return [
    { label: t('compareW.row.kind'), value: t('compareW.value.kind') },
    { label: t('compareW.row.objective'), value: fmt(c.chi2), emphasis: true },
    { label: t('compareW.row.reduced'), value: fmt(c.reducedChi2) },
    { label: t('compareW.row.dof'), value: String(c.dof) },
    { label: t('compareW.row.where'), value: where, emphasis: true },
    {
      label: t('compareW.row.moved'),
      value: els.length ? els.join(', ') : t('compareW.value.none'),
    },
    {
      label: t('compareW.row.given'),
      value: t('compareW.value.given', {
        n: c.parameters.filter(p => p.status === 'assumed').length,
        d: c.parameters.filter(p => p.status === 'derived').length,
      }),
    },
  ];
}

const family = (id, model, title, defaultCase, controls) => ({
  id,
  model,
  defaultCase,
  get title() {
    return t(title);
  },
  get note() {
    return t('compareW.note');
  },
  animated: false,
  controls,
  presets: [
    {
      get label() {
        return t('compareW.preset.given');
      },
      values: Object.fromEntries(controls.map(k => [k.id, k.value])),
    },
  ],
  draw,
  readout,
});

export const COMPARE_WIDGETS = [
  family(
    'compare-transit',
    'transit',
    'compareW.title.transit',
    'hd209458-larger-planet',
    [
      control('radiusEarth', 8, 24, 0.05, 2, 'R⊕'),
      control('periodDays', 3.4, 3.65, 0.0005, 4, 'd'),
      control('epochDays', -0.5, 0.5, 0.005, 3, 'd'),
      control('inclinationDeg', 80, 90, 0.05, 2, '°'),
    ]
  ),
  family(
    'compare-rv',
    'radial-velocity',
    'compareW.title.rv',
    'hd209458-heavier-planet',
    [
      control('massEarth', 100, 450, 1, 0, 'M⊕'),
      control('periodDays', 3.4, 3.65, 0.0005, 4, 'd'),
      control('epochDays', -0.5, 0.5, 0.005, 3, 'd'),
      control('e', 0, 0.5, 0.005, 3, ''),
    ]
  ),
];
