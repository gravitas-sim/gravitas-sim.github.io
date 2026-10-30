// =============================================================================
// The variables-II panels (Prompt 223, VARIABLES_II.md)
// -----------------------------------------------------------------------------
// Three panels in one lazy family. `plz-metallicity` measures a galaxy's
// distance from the LMC's Cepheids with the metallicity term left out or
// included (the coefficient and the galaxies' [O/H] are cited values), with the
// error budget that term adds and the effect it has. `variable-features` reads
// the period, amplitude, skewness and Fourier numbers of a real TESS light
// curve with their errors, and refuses the shape of a run too short to hold it.
// `variable-ambiguity` runs the nearest-neighbour exercise on the labelled
// synthetic sample with a refusal: a star is given a class only if enough
// neighbours agree.
//
// Nothing is calculated here: every number is js/variablesIIField.js's, over
// js/kernels/variables/.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_VARIABLES_II } from './i18n/en.variablesII.js';
import { ES_VARIABLES_II } from './i18n/es.variablesII.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { loadVariablesData } from './variablesData.js';
import { CLASSES } from './kernels/variables/index.js';
import {
  PLZ_DZ,
  plzView,
  featuresView,
  ambiguityView,
} from './variablesIIField.js';

registerMessages('en', EN_VARIABLES_II);
registerMessages('es', ES_VARIABLES_II);

let data = null;
/** Resolves true once the data have been tried; a missing file is logged, never thrown. */
export const variablesIIReady = loadVariablesData()
  .then(d => {
    data = d;
    return true;
  })
  .catch(err => {
    console.warn('The variable-star data could not be loaded:', err);
    return true;
  });

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
  red: '#c92a2a',
  violet: '#7048e8',
};
const CLASS_COLOR = {
  rrab: COLOR.blue,
  rrc: COLOR.green,
  cepheid: COLOR.orange,
  dscuti: COLOR.violet,
  eclipsing: COLOR.grey,
};

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 250,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 3),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const numeric = (id, label, min, max, step, value, format) => ({
  id,
  get label() {
    return t(label);
  },
  min,
  max,
  step,
  value,
  decimals: step < 1 ? (step < 0.1 ? 2 : 1) : 0,
  format,
});
const choice = (id, label, prefix, count, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: count - 1,
  step: 1,
  value,
  decimals: 0,
  format: x =>
    t(`${prefix}.${Math.max(0, Math.min(count - 1, Math.round(x)))}`),
});
const preset = (key, values) => ({
  values,
  get label() {
    return t(key);
  },
});
const loadingRows = () => [
  { label: t('v2W.row.state'), value: t('v2W.loading') },
];
const empty = (canvas, titleKey) => {
  const spec = { label: t(titleKey), xTitle: '', yTitle: '', series: [] };
  hostOf(canvas, spec.label).chart.draw(spec);
  return spec;
};
const num = (x, d = 3) => (Number.isFinite(x) ? fixed(x, d) : '—');
const signedNum = (x, d = 3) =>
  Number.isFinite(x) ? (x < 0 ? `−${fixed(-x, d)}` : fixed(x, d)) : '—';
const pm = (x, s, d = 3) => `${signedNum(x, d)} ± ${fixed(s, d)}`;

// ----------------------------------------------------------------------------
// plz-metallicity
// ----------------------------------------------------------------------------
const PLZ = {
  id: 'plz-metallicity',
  get title() {
    return t('v2W.p.title');
  },
  get note() {
    return t('v2W.p.note');
  },
  animated: false,
  controls: [
    choice('host', 'v2W.p.control.host', 'v2W.p.host', 2),
    choice('term', 'v2W.p.control.term', 'v2W.p.term', 2, 1),
    choice('metal', 'v2W.p.control.metal', 'v2W.p.metal', 3),
    numeric(
      'dz',
      'v2W.p.control.dz',
      PLZ_DZ.min,
      PLZ_DZ.max,
      PLZ_DZ.step,
      0,
      x => `${signedNum(x, 2)} dex`
    ),
    choice('view', 'v2W.p.control.view', 'v2W.p.view', 2),
  ],
  presets: [
    preset('v2W.p.preset.cited', { host: 0, term: 1, metal: 0, view: 0 }),
    preset('v2W.p.preset.left', { host: 0, term: 0, metal: 0, view: 0 }),
    preset('v2W.p.preset.m101', { host: 1, term: 1, metal: 0, view: 0 }),
  ],
  draw(canvas, v) {
    if (!data) return empty(canvas, 'v2W.p.title');
    const m = plzView(v, data);
    const label = t('v2W.p.title');
    let spec;
    if (Math.round(v.view ?? 0) === 1) {
      spec = {
        xTitle: t('v2W.p.axisDz'),
        yTitle: t('v2W.p.axisShift'),
        xRange: [PLZ_DZ.min, PLZ_DZ.max],
        series: [
          {
            id: 'shift',
            label: t('v2W.p.legend.shift'),
            x: m.effect.map(p => p.dZ),
            y: m.effect.map(p => p.shift),
            color: COLOR.blue,
            width: 2,
            mode: 'line',
          },
          {
            id: 'upper',
            label: t('v2W.p.legend.upper'),
            x: m.effect.map(p => p.dZ),
            y: m.effect.map(p => p.hi),
            color: COLOR.grey,
            width: 1,
            mode: 'line',
          },
          {
            id: 'lower',
            label: t('v2W.p.legend.lower'),
            x: m.effect.map(p => p.dZ),
            y: m.effect.map(p => p.lo),
            color: COLOR.grey,
            width: 1,
            mode: 'line',
          },
          {
            id: 'here',
            label: t('v2W.p.legend.here'),
            x: [m.dZ],
            y: [-m.gamma * m.dZ],
            color: COLOR.orange,
            mode: 'points',
            radius: 5,
          },
        ],
      };
    } else {
      const cal = m.calibration;
      const xs = [0.7, 2];
      const line = (offset, id, name, color) => ({
        id,
        label: name,
        x: xs,
        y: xs.map(x => -(cal.a + cal.b * (x - 1) + offset)),
        color,
        width: 2,
        mode: 'line',
      });
      const pts = (s, id, name, color, mu0) => ({
        id,
        label: name,
        x: Array.from(s.periods, p => Math.log10(p)),
        y: Array.from(s.mags, y => -(y - mu0)),
        color,
        mode: 'points',
        radius: 2.5,
      });
      // The host's stars are drawn at the LMC's distance by taking away the
      // difference of the two moduli, so the two samples overlie one relation.
      const off = m.mu - 18.477;
      spec = {
        xTitle: t('v2W.p.axisP'),
        yTitle: t('v2W.p.axisM'),
        series: [
          pts(m.anchorPoints, 'lmc', t('v2W.p.legend.lmc'), COLOR.grey, 0),
          pts(m.hostPoints, 'host', t('v2W.p.legend.host'), COLOR.orange, off),
          line(0, 'line', t('v2W.p.legend.line'), COLOR.blue),
        ],
      };
    }
    spec.label = label;
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    if (!data) return loadingRows();
    const m = plzView(v, data);
    const b = m.budget;
    const rows = [
      { label: t('v2W.p.row.source'), value: t('v2W.p.v.source') },
      {
        label: t('v2W.p.row.gamma'),
        value: `${pm(m.gamma, m.sigmaGamma, 3)} mag/dex`,
      },
      {
        label: t('v2W.p.row.zhost'),
        value: `${signedNum(m.zHost, 2)} / ${signedNum(m.zAnchor, 2)} → ${signedNum(m.dZ, 2)} dex`,
      },
      {
        label: t('v2W.p.row.muWithout'),
        value: `${num(m.muWithout, 3)} mag`,
      },
      { label: t('v2W.p.row.muWith'), value: `${num(m.muWith, 3)} mag` },
      {
        label: t('v2W.p.row.shift'),
        value: `${signedNum(m.shift, 3)} mag`,
        emphasis: true,
      },
      {
        label: t('v2W.p.row.mu'),
        value: `${num(m.mu, 3)} ± ${fixed(m.sigma, 3)} mag`,
        emphasis: true,
      },
      {
        label: t('v2W.p.row.distance'),
        value: `${num(m.distanceMpc, 2)} ± ${fixed(m.distanceErrorMpc, 2)} Mpc`,
        emphasis: true,
      },
      {
        label: t('v2W.p.row.factor'),
        value: num(10 ** (m.shift / 5), 3),
      },
    ];
    if (m.maser)
      rows.push({
        label: t('v2W.p.row.maser'),
        value: `${num(m.maser.mu, 3)} ± ${fixed(m.maser.sigma, 3)} mag`,
      });
    const term = (id, key) =>
      id in b ? [{ label: t(key), value: `${fixed(b[id], 3)} mag` }] : [];
    rows.push(
      ...term('host', 'v2W.p.row.budgetHost'),
      ...term('anchor', 'v2W.p.row.budgetAnchor'),
      ...term('slope', 'v2W.p.row.budgetSlope'),
      ...term('anchorDistance', 'v2W.p.row.budgetDistance'),
      ...term('gamma', 'v2W.p.row.budgetGamma'),
      ...term('hostMetallicity', 'v2W.p.row.budgetHostZ'),
      ...term('anchorMetallicity', 'v2W.p.row.budgetAnchorZ'),
      {
        label: t('v2W.p.row.status'),
        value: t(`v2W.p.status.${m.status}`),
      },
      { label: t('v2W.row.assumes'), value: t('v2W.p.a.model') }
    );
    return rows;
  },
};

// ----------------------------------------------------------------------------
// variable-features
// ----------------------------------------------------------------------------
const FEATURES = {
  id: 'variable-features',
  get title() {
    return t('v2W.f.title');
  },
  get note() {
    return t('v2W.f.note');
  },
  animated: false,
  controls: [
    choice('star', 'v2W.f.control.star', 'v2W.f.star', 2),
    numeric('days', 'v2W.f.control.days', 1, 28, 1, 28, x => fixed(x, 0)),
  ],
  presets: [
    preset('v2W.f.preset.suDra', { star: 0, days: 28 }),
    preset('v2W.f.preset.short', { star: 0, days: 1 }),
    preset('v2W.f.preset.etaAql', { star: 1, days: 28 }),
  ],
  draw(canvas, v) {
    if (!data) return empty(canvas, 'v2W.f.title');
    const m = featuresView(v, data);
    const label = t('v2W.f.title');
    const grid = Array.from({ length: 121 }, (_, i) => i / 120);
    const series = [
      {
        id: 'data',
        label: t('v2W.f.legend.data'),
        x: Array.from(m.phase),
        y: Array.from(m.mag, y => -y),
        color: COLOR.grey,
        mode: 'points',
        radius: 1.5,
      },
    ];
    if (m.fit)
      series.push({
        id: 'fit',
        label: t('v2W.f.legend.fit'),
        x: grid,
        y: grid.map(p => -m.fit.at(m.fit.t0 + p * m.period)),
        color: COLOR.orange,
        width: 2,
        mode: 'line',
      });
    const spec = {
      label,
      xTitle: t('v2W.f.axisPhase'),
      yTitle: t('v2W.f.axisM'),
      xRange: [0, 1],
      series,
    };
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    if (!data) return loadingRows();
    const m = featuresView(v, data);
    const f = m.features;
    const ok = f.status === 'ok';
    const withdrawn = t('v2W.f.v.withdrawn');
    const fo = f.fourier;
    const rows = [
      { label: t('v2W.f.row.source'), value: t('v2W.f.source') },
      {
        label: t('v2W.f.row.state'),
        value: ok
          ? t('v2W.f.state.ok')
          : `${t('v2W.f.state.not-constrained')}: ${t(`v2W.f.reason.${f.reason}`)}`,
        emphasis: true,
      },
      { label: t('v2W.f.row.period'), value: `${num(m.period, 5)} d` },
      { label: t('v2W.f.row.cycles'), value: num(f.cycles, 2), emphasis: true },
      {
        label: t('v2W.f.row.mean'),
        value:
          f.mean === null
            ? '—'
            : `${signedNum(f.mean, 3)} ± ${fixed(f.meanError, 3)} mag`,
      },
      {
        label: t('v2W.f.row.amplitude'),
        value: ok ? `${num(f.amplitude, 3)} mag` : withdrawn,
        emphasis: true,
      },
      {
        label: t('v2W.f.row.skew'),
        value: ok ? signedNum(f.skewness, 2) : withdrawn,
      },
      {
        label: t('v2W.f.row.rise'),
        value: ok ? num(f.riseFraction, 2) : withdrawn,
      },
      {
        label: t('v2W.f.row.r21'),
        value: ok ? pm(fo.r21.value, fo.r21.sigma, 3) : withdrawn,
        emphasis: true,
      },
      {
        label: t('v2W.f.row.r31'),
        value: ok ? pm(fo.r31.value, fo.r31.sigma, 3) : withdrawn,
      },
      {
        label: t('v2W.f.row.phi21'),
        value: ok ? `${pm(fo.phi21.value, fo.phi21.sigma, 2)} rad` : withdrawn,
      },
      {
        label: t('v2W.f.row.phi31'),
        value: ok ? `${pm(fo.phi31.value, fo.phi31.sigma, 2)} rad` : withdrawn,
      },
      {
        label: t('v2W.f.row.detected'),
        value: ok
          ? t('v2W.f.v.detected', {
              n: f.harmonics.filter(h => h.detected).length,
            })
          : withdrawn,
      },
      { label: t('v2W.row.assumes'), value: t('v2W.f.a.model') },
    ];
    return rows;
  },
};

// ----------------------------------------------------------------------------
// variable-ambiguity
// ----------------------------------------------------------------------------
const AMBIGUITY = {
  id: 'variable-ambiguity',
  get title() {
    return t('v2W.a.title');
  },
  get note() {
    return t('v2W.a.note');
  },
  animated: false,
  controls: [
    choice('features', 'v2W.a.control.features', 'v2W.a.features', 3, 1),
    numeric('votes', 'v2W.a.control.votes', 3, 5, 1, 4, x => fixed(x, 0)),
  ],
  presets: [
    preset('v2W.a.preset.default', { features: 1, votes: 4 }),
    preset('v2W.a.preset.strict', { features: 0, votes: 5 }),
  ],
  draw(canvas, v) {
    if (!data) return empty(canvas, 'v2W.a.title');
    const m = ambiguityView(v, data);
    const label = t('v2W.a.title');
    const series = CLASSES.map(c => {
      const idx = m.rows
        .map((r, j) => ({ r, j }))
        .filter(x => x.r.cls === c.id && m.verdicts[x.j].cls !== null);
      return {
        id: c.id,
        label: t(`v2W.a.class.${c.id}`),
        x: idx.map(x => x.r.logP),
        y: idx.map(x => x.r.logAmp),
        color: CLASS_COLOR[c.id],
        mode: 'points',
        radius: 3,
      };
    });
    const open = m.rows
      .map((r, j) => ({ r, j }))
      .filter(x => m.verdicts[x.j].cls === null);
    series.push({
      id: 'open',
      label: t('v2W.a.legend.open'),
      x: open.map(x => x.r.logP),
      y: open.map(x => x.r.logAmp),
      color: COLOR.red,
      mode: 'points',
      radius: 5,
    });
    const spec = {
      label,
      xTitle: t('v2W.a.axisP'),
      yTitle: t('v2W.a.axisA'),
      series,
    };
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    if (!data) return loadingRows();
    const m = ambiguityView(v, data);
    const o = m.openByClass;
    return [
      { label: t('v2W.a.row.source'), value: t('v2W.a.v.source') },
      { label: t('v2W.a.row.called'), value: String(m.called), emphasis: true },
      { label: t('v2W.a.row.open'), value: String(m.open), emphasis: true },
      {
        label: t('v2W.a.row.calledAccuracy'),
        value: `${fixed(100 * m.calledAccuracy, 1)} %`,
        emphasis: true,
      },
      {
        label: t('v2W.a.row.everyone'),
        value: `${fixed(100 * m.accuracyEveryone, 1)} %`,
      },
      {
        label: t('v2W.a.row.openBy'),
        value: t('v2W.a.v.openBy', {
          a: o.rrab,
          b: o.rrc,
          c: o.cepheid,
          d: o.dscuti,
          e: o.eclipsing,
        }),
      },
      { label: t('v2W.row.assumes'), value: t('v2W.a.a.model') },
    ];
  },
};

export const VARIABLES_II_WIDGETS = [PLZ, FEATURES, AMBIGUITY];
