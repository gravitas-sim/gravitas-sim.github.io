// The atmosphere instruments (spike of Prompt 199): energy balance and the
// grey profile, each plotted through js/plot/chart.js; the escape instrument is
// its own module. Registered by js/widgets.js as the family "atmospheres".
import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_ATMOSPHERES } from './i18n/en.atmospheres.js';
import { ES_ATMOSPHERES } from './i18n/es.atmospheres.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  equilibriumTemperature,
  fluxAt,
  oneLayer,
  oneLayerEmissivityFor,
  greyTemperature,
  greyGround,
  greyDepthFor,
  scaleHeight,
} from './kernels/atmospheres/index.js';
import { escapeControls, drawEscape, readEscape } from './atmosphereEscape.js';

registerMessages('en', EN_ATMOSPHERES);
registerMessages('es', ES_ATMOSPHERES);

/** The three bodies the instrument offers, from the application's table; albedo and published emission temperature typed with their citations in the gate's fixture. */
export const BODIES = [
  {
    id: 'venus',
    a: 0.723,
    albedo: 0.76,
    ground: 737,
    published: 227,
    mu: 43.45,
    g: 8.87,
  },
  {
    id: 'earth',
    a: 1.0,
    albedo: 0.306,
    ground: 288,
    published: 255,
    mu: 28.97,
    g: 9.81,
  },
  {
    id: 'mars',
    a: 1.524,
    albedo: 0.25,
    ground: 210,
    published: 210,
    mu: 43.34,
    g: 3.71,
  },
];

/** Mark's approximation to the Hopf function, q(tau) = 0.7104 - 0.1331 exp(-3.4488 tau). */
export const hopfQ = tau => 0.7104 - 0.1331 * Math.exp(-3.4488 * tau);

const hosts = new WeakMap();
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 240,
      number: v => fixed(v, v >= 100 ? 0 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const bodyOf = v => BODIES[Math.max(0, Math.min(2, Math.round(v.body ?? 1)))];

function balanceView(v) {
  const b = bodyOf(v);
  const albedo = v.albedo ?? b.albedo;
  const flux = fluxAt(1, b.a);
  const teq = equilibriumTemperature({
    flux,
    bondAlbedo: albedo,
    redistribution: v.redistribution ?? 1,
  });
  const ratio = b.ground / teq.temperature;
  return {
    b,
    albedo,
    teq,
    ratio,
    layer: oneLayerEmissivityFor(ratio),
    grey: greyDepthFor(ratio),
  };
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
    {
      id: 'body',
      get label() {
        return t('atmW.b.control.body');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 1,
      decimals: 0,
      format: x => t(`atmW.b.body.${BODIES[Math.round(x)].id}`),
    },
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
    const albedo = v.albedo ?? 0.3;
    const xs = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.05);
    const curve = xs.map(
      a =>
        equilibriumTemperature({
          flux: fluxAt(1, a),
          bondAlbedo: albedo,
          redistribution: v.redistribution ?? 1,
        }).temperature
    );
    const spec = {
      label: t('atmW.b.title'),
      xTitle: t('atmW.b.axis.x'),
      yTitle: t('atmW.b.axis.y'),
      series: [
        {
          id: 'model',
          label: t('atmW.b.legend.model'),
          x: xs,
          y: curve,
          color: '#1c7ed6',
          width: 2,
          mode: 'line',
        },
        {
          id: 'pub',
          label: t('atmW.b.legend.published'),
          x: BODIES.map(b => b.a),
          y: BODIES.map(b => b.published),
          color: '#e8590c',
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
    const refused = x => (x.refused ? t('atmW.refused') : null);
    return [
      { label: t('atmW.row.model'), value: f.teq.model, emphasis: true },
      { label: t('atmW.b.row.teq'), value: `${fixed(f.teq.temperature, 1)} K` },
      { label: t('atmW.b.row.observed'), value: `${f.b.ground} K` },
      {
        label: t('atmW.b.row.layer'),
        value: refused(f.layer) ?? fixed(f.layer.emissivity, 3),
      },
      { label: t('atmW.b.row.grey'), value: fixed(f.grey.tauSurface, 2) },
      { label: t('atmW.row.assumes'), value: f.teq.assumes.join('; ') },
    ];
  },
};

const PROFILE = {
  id: 'atmosphere-profile',
  get title() {
    return t('atmW.p.title');
  },
  get note() {
    return t('atmW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'tau',
      get label() {
        return t('atmW.p.control.tau');
      },
      min: 0.1,
      max: 20,
      step: 0.1,
      value: 1,
      decimals: 1,
      format: x => fixed(x, 1),
    },
    {
      id: 'te',
      get label() {
        return t('atmW.p.control.te');
      },
      min: 100,
      max: 400,
      step: 5,
      value: 255,
      decimals: 0,
      format: x => `${fixed(x, 0)} K`,
    },
  ],
  draw(canvas, v) {
    const te = v.te ?? 255;
    const tauS = v.tau ?? 1;
    const xs = Array.from({ length: 41 }, (_, i) => (i * tauS) / 40);
    const edd = xs.map(
      x => greyTemperature({ emissionTemperature: te, tau: x }).temperature
    );
    const exact = xs.map(x => te * (0.75 * (x + hopfQ(x))) ** 0.25);
    const ground = greyGround({
      emissionTemperature: te,
      tauSurface: tauS,
    }).ground;
    const spec = {
      label: t('atmW.p.title'),
      xTitle: t('atmW.p.axis.x'),
      yTitle: t('atmW.p.axis.y'),
      series: [
        {
          id: 'edd',
          label: t('atmW.p.legend.eddington'),
          x: xs,
          y: edd,
          color: '#1c7ed6',
          width: 2,
          mode: 'line',
        },
        {
          id: 'exact',
          label: t('atmW.p.legend.exact'),
          x: xs,
          y: exact,
          color: '#2f9e44',
          width: 2,
          dash: [5, 3],
          mode: 'line',
        },
        {
          id: 'ground',
          label: t('atmW.p.legend.layer'),
          x: [tauS],
          y: [ground],
          color: '#e8590c',
          mode: 'points',
          radius: 5,
        },
      ],
    };
    hostOf(canvas, t('atmW.p.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const te = v.te ?? 255;
    const tau = v.tau ?? 1;
    const g = greyGround({ emissionTemperature: te, tauSurface: tau });
    const eps = 1 - Math.exp(-tau);
    const l = oneLayer({ emissionTemperature: te, emissivity: eps });
    const top = greyTemperature({
      emissionTemperature: te,
      tau: 0,
    }).temperature;
    const topExact = te * (0.75 * hopfQ(0)) ** 0.25;
    return [
      { label: t('atmW.row.model'), value: g.model, emphasis: true },
      { label: t('atmW.p.row.ground'), value: `${fixed(g.ground, 1)} K` },
      { label: t('atmW.p.row.layer'), value: `${fixed(l.surface, 1)} K` },
      {
        label: t('atmW.p.row.gap'),
        value: `${fixed((100 * (top - topExact)) / topExact, 1)} %`,
      },
      { label: t('atmW.row.assumes'), value: g.assumes.join('; ') },
    ];
  },
};

/** Used by the gate: the isothermal scale height of each body. */
export const scaleHeights = () =>
  BODIES.map(
    b =>
      scaleHeight({
        temperature: b.ground,
        meanMolecularWeight: b.mu,
        gravity: b.g,
      }).height
  );

const ESCAPE = {
  id: 'atmosphere-escape',
  get title() {
    return t('atmW.e.title');
  },
  get note() {
    return t('atmW.e.note');
  },
  animated: false,
  controls: escapeControls(),
  draw: drawEscape,
  readout: readEscape,
};

export const ATMOSPHERE_WIDGETS = [BALANCE, PROFILE, ESCAPE];
