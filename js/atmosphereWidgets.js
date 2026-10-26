// =============================================================================
// The atmosphere instruments (Prompt 200, ATMOSPHERES.md)
// -----------------------------------------------------------------------------
// Three instruments for "Why Venus Is Hot" and "Two Greenhouse Models", each
// standing on the kernel in js/kernels/atmospheres/ and drawing through the plot
// component (js/plot/chart.js), never a canvas of its own:
//
//   atmosphere-balance     the emission temperature of a body beside its
//                          measured temperature, the difference labelled
//   atmosphere-greenhouse  the one-layer model and the grey profile side by
//                          side for one planet
//   atmosphere-scale       the isothermal scale height and the pressure it implies
//
// No arithmetic is repeated here: every number is the kernel's, and
// tests/atmosphereLessons.test.js recomputes each one a lesson states. There is
// no escape instrument (verdict B of Prompt 199): the Jeans parameter is not built.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_ATMOSPHERES } from './i18n/en.atmospheres.js';
import { ES_ATMOSPHERES } from './i18n/es.atmospheres.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  BODIES,
  BODY_IDS,
  compareWithMeasured,
  distanceAu,
  greyDepthFor,
  greyGround,
  greyTemperature,
  greyTemperatureExact,
  oneLayer,
  oneLayerEmissivityFor,
  scaleHeight,
} from './kernels/atmospheres/index.js';

registerMessages('en', EN_ATMOSPHERES);
registerMessages('es', ES_ATMOSPHERES);

const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
const bodyId = (v, n = BODY_IDS.length, first = 0) =>
  BODY_IDS[first + clampIndex(v.body ?? 1, n)];
const name = id => t(`atmW.body.${id}`);

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 240,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      number: v => fixed(v, v >= 100 ? 0 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}
const SERIES = {
  blue: '#1c7ed6',
  green: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
};

const bodyControl = (count, first = 0, value = 1) => ({
  id: 'body',
  get label() {
    return t('atmW.control.body');
  },
  min: 0,
  max: count - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => name(BODY_IDS[first + Math.round(x)]),
});
const toggleControl = (id, label, value = 1) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(x >= 0.5 ? 'atmW.on' : 'atmW.off'),
});

// ----------------------------------------------------------------------------
// atmosphere-balance
// ----------------------------------------------------------------------------
export function balanceView(v) {
  const id = bodyId(v);
  const own = (v.own ?? 1) >= 0.5;
  const albedo = own ? undefined : (v.albedo ?? 0.3);
  const cmp = compareWithMeasured(id, {
    albedo,
    redistribution: v.redistribution ?? 1,
  });
  const layer = oneLayerEmissivityFor(cmp.ratio);
  const grey = greyDepthFor(cmp.ratio);
  return { id, cmp, layer, grey, albedo: albedo ?? BODIES[id].albedo };
}

const BALANCE = {
  id: 'atmosphere-balance',
  get title() {
    return t('atmW.b.title');
  },
  get note() {
    return t('atmW.b.note');
  },
  animated: false,
  controls: [
    bodyControl(BODY_IDS.length),
    toggleControl('own', 'atmW.b.control.own'),
    {
      id: 'albedo',
      get label() {
        return t('atmW.b.control.albedo');
      },
      min: 0,
      max: 0.95,
      step: 0.01,
      value: 0.3,
      decimals: 2,
      format: x => fixed(x, 2),
    },
    {
      id: 'redistribution',
      get label() {
        return t('atmW.b.control.redistribution');
      },
      min: 0,
      max: 1,
      step: 0.05,
      value: 1,
      decimals: 2,
      format: x => fixed(x, 2),
    },
  ],
  draw(canvas, v) {
    const f = balanceView(v);
    const eps = v.redistribution ?? 1;
    const xs = Array.from({ length: 60 }, (_, i) => 0.5 + (i * 30) / 59);
    const curve = xs.map(
      a =>
        compareWithMeasured(f.id, { albedo: f.albedo, redistribution: eps })
          .emissionK * Math.sqrt(distanceAu(f.id) / a)
    );
    const spec = {
      label: t('atmW.b.title'),
      xTitle: t('atmW.b.axis.x'),
      yTitle: t('atmW.axis.temperature'),
      series: [
        {
          id: 'model',
          label: t('atmW.b.legend.model', { body: name(f.id) }),
          x: xs,
          y: curve,
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'emission',
          label: t('atmW.b.legend.emission'),
          x: BODY_IDS.map(distanceAu),
          y: BODY_IDS.map(b => compareWithMeasured(b).emissionK),
          color: SERIES.green,
          mode: 'points',
          radius: 4,
        },
        {
          id: 'measured',
          label: t('atmW.b.legend.measured'),
          x: BODY_IDS.map(distanceAu),
          y: BODY_IDS.map(b => BODIES[b].measuredK),
          color: SERIES.orange,
          mode: 'points',
          radius: 4,
        },
      ],
    };
    hostOf(canvas, t('atmW.b.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = balanceView(v);
    const c = f.cmp;
    const none = t('atmW.refused');
    return [
      { label: t('atmW.row.model'), value: t('atmW.m.eq'), emphasis: true },
      { label: t('atmW.b.row.teq'), value: `${fixed(c.emissionK, 1)} K` },
      {
        label: t('atmW.b.row.measured', {
          where: t(`atmW.at.${c.measuredAt === 'surface' ? 'surface' : 'bar'}`),
        }),
        value: `${fixed(c.measuredK, 0)} K`,
      },
      {
        label: t('atmW.b.row.difference'),
        value: `${c.differenceK >= 0 ? '+' : '-'}${fixed(Math.abs(c.differenceK), 1)} K`,
        emphasis: true,
      },
      {
        label: t('atmW.b.row.reading'),
        value: t(
          `atmW.b.reading.${BODIES[f.id].kind}${BODIES[f.id].kind === 'terrestrial' && c.differenceK < 0 ? '.below' : ''}`
        ),
      },
      {
        label: t('atmW.b.row.layer'),
        value: f.layer.refused ? none : fixed(f.layer.emissivity, 3),
      },
      { label: t('atmW.b.row.gray'), value: fixed(f.grey.tauSurface, 2) },
      { label: t('atmW.row.assumes'), value: t('atmW.a.eq') },
    ];
  },
};

// ----------------------------------------------------------------------------
// atmosphere-greenhouse
// ----------------------------------------------------------------------------
export function greenhouseView(v) {
  const id = bodyId(v, 3);
  const cmp = compareWithMeasured(id);
  const te = cmp.emissionK;
  const tau = v.tau ?? 1;
  const emissivity = v.emissivity ?? 0.5;
  const ground = greyGround({ emissionTemperature: te, tauSurface: tau });
  const layer = oneLayer({ emissionTemperature: te, emissivity });
  const top = greyTemperature({ emissionTemperature: te, tau: 0 }).temperature;
  const topExact = greyTemperatureExact({
    emissionTemperature: te,
    tau: 0,
  }).temperature;
  return {
    id,
    cmp,
    te,
    tau,
    emissivity,
    ground,
    layer,
    gapTop: (top - topExact) / topExact,
    needLayer: oneLayerEmissivityFor(cmp.ratio),
    needGrey: greyDepthFor(cmp.ratio),
  };
}

const GREENHOUSE = {
  id: 'atmosphere-greenhouse',
  get title() {
    return t('atmW.g.title');
  },
  get note() {
    return t('atmW.g.note');
  },
  animated: false,
  controls: [
    bodyControl(3),
    {
      id: 'tau',
      get label() {
        return t('atmW.g.control.tau');
      },
      min: 0,
      max: 150,
      step: 0.01,
      value: 1,
      decimals: 2,
      format: x => fixed(x, 2),
    },
    {
      id: 'emissivity',
      get label() {
        return t('atmW.g.control.emissivity');
      },
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.5,
      decimals: 2,
      format: x => fixed(x, 2),
    },
  ],
  draw(canvas, v) {
    const f = greenhouseView(v);
    const xs = Array.from({ length: 61 }, (_, i) => (i * f.tau) / 60);
    const edd = xs.map(
      x => greyTemperature({ emissionTemperature: f.te, tau: x }).temperature
    );
    const exact = xs.map(
      x =>
        greyTemperatureExact({ emissionTemperature: f.te, tau: x }).temperature
    );
    const spec = {
      label: t('atmW.g.title'),
      xTitle: t('atmW.g.axis.x'),
      xRange: [0, Math.max(f.tau * 1.05, 0.05)],
      yTitle: t('atmW.axis.temperature'),
      series: [
        {
          id: 'eddington',
          label: t('atmW.g.legend.eddington'),
          x: xs,
          y: edd,
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'exact',
          label: t('atmW.g.legend.exact'),
          x: xs,
          y: exact,
          color: SERIES.green,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        },
        {
          id: 'ground',
          label: t('atmW.g.legend.ground'),
          x: [f.tau],
          y: [f.ground.ground],
          color: SERIES.orange,
          mode: 'points',
          radius: 5,
        },
        {
          id: 'layer',
          label: t('atmW.g.legend.layer'),
          x: [f.tau],
          y: [f.layer.surface],
          color: SERIES.violet,
          mode: 'points',
          radius: 5,
        },
      ],
    };
    hostOf(canvas, t('atmW.g.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = greenhouseView(v);
    const none = t('atmW.refused');
    return [
      { label: t('atmW.g.row.te'), value: `${fixed(f.te, 1)} K` },
      {
        label: t('atmW.g.row.measured'),
        value: `${fixed(f.cmp.measuredK, 0)} K`,
      },
      {
        label: t('atmW.g.row.gray'),
        value: `${fixed(f.ground.ground, 1)} K`,
        emphasis: true,
      },
      {
        label: t('atmW.g.row.layer'),
        value: `${fixed(f.layer.surface, 1)} K`,
        emphasis: true,
      },
      {
        label: t('atmW.g.row.needLayer'),
        value: f.needLayer.refused ? none : fixed(f.needLayer.emissivity, 3),
      },
      {
        label: t('atmW.g.row.needGray'),
        value: fixed(f.needGrey.tauSurface, 2),
      },
      {
        label: t('atmW.g.row.gap'),
        value: `${fixed(100 * f.gapTop, 1)} %`,
      },
      { label: t('atmW.row.model'), value: t('atmW.m.gr') },
      { label: t('atmW.row.assumes'), value: t('atmW.a.gr') },
    ];
  },
};

// ----------------------------------------------------------------------------
// atmosphere-scale
// ----------------------------------------------------------------------------
export function scaleView(v) {
  const id = bodyId(v, 3);
  const b = BODIES[id];
  const own = (v.own ?? 1) >= 0.5;
  const temperature = own ? b.measuredK : (v.temperature ?? 288);
  const h = scaleHeight({
    temperature,
    meanMolecularWeight: b.mu,
    gravity: b.g,
  });
  return { id, b, temperature, h, km: h.height / 1000 };
}

const SCALE = {
  id: 'atmosphere-scale',
  get title() {
    return t('atmW.s.title');
  },
  get note() {
    return t('atmW.s.note');
  },
  animated: false,
  controls: [
    bodyControl(3),
    toggleControl('own', 'atmW.s.control.own'),
    {
      id: 'temperature',
      get label() {
        return t('atmW.s.control.temperature');
      },
      min: 50,
      max: 800,
      step: 1,
      value: 288,
      decimals: 0,
      format: x => `${fixed(x, 0)} K`,
    },
  ],
  draw(canvas, v) {
    const f = scaleView(v);
    const top = 60;
    const zs = Array.from({ length: 41 }, (_, i) => (i * top) / 40);
    const curve = H => zs.map(z => Math.exp(-z / H));
    const own = ['venus', 'earth', 'mars'].map(id => ({
      id,
      H: scaleView({ body: BODY_IDS.indexOf(id), own: 1 }).km,
    }));
    const colors = [SERIES.orange, SERIES.blue, SERIES.green];
    const spec = {
      label: t('atmW.s.title'),
      xTitle: t('atmW.s.axis.x'),
      yTitle: t('atmW.s.axis.y'),
      series: [
        ...own.map((o, i) => ({
          id: o.id,
          label: name(o.id),
          x: zs,
          y: curve(o.H),
          color: colors[i],
          width: 2,
          mode: 'line',
        })),
        {
          id: 'chosen',
          label: t('atmW.s.legend.chosen', { body: name(f.id) }),
          x: zs,
          y: curve(f.km),
          color: SERIES.violet,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        },
      ],
    };
    hostOf(canvas, t('atmW.s.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = scaleView(v);
    return [
      { label: t('atmW.row.model'), value: t('atmW.m.sc'), emphasis: true },
      {
        label: t('atmW.s.row.height'),
        value: `${fixed(f.km, 2)} km`,
        emphasis: true,
      },
      {
        label: t('atmW.s.row.third'),
        value: `${fixed(100 * Math.exp(-3), 1)} %`,
      },
      {
        label: t('atmW.s.row.inputs'),
        value: t('atmW.s.value.inputs', {
          T: fixed(f.temperature, 0),
          mu: fixed(f.b.mu, 2),
          g: fixed(f.b.g, 2),
        }),
      },
      { label: t('atmW.row.assumes'), value: t('atmW.a.sc') },
    ];
  },
};

export const ATMOSPHERE_WIDGETS = [BALANCE, GREENHOUSE, SCALE];
