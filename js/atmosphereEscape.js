// The escape instrument of the atmosphere family (spike of Prompt 199): the
// Jeans parameter as a bound, plotted through the plot component.
import { t } from './i18n/index.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  G_NEWTON,
  K_BOLTZMANN,
  ATOMIC_MASS,
} from './kernels/atmospheres/constants.js';
import { retentionBound } from './kernels/atmospheres/escape.js';

const EARTH_MASS = 5.9722e24;
const SPECIES = [
  { id: 'h', amu: 1.00784, color: '#e8590c' },
  { id: 'he', amu: 4.0026, color: '#1c7ed6' },
  { id: 'n2', amu: 28.0134, color: '#2f9e44' },
];
const GYR = 4.5e9 * 365.25 * 86400;

const hosts = new WeakMap();
function hostOf(canvas) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 240,
      number: v => fixed(v, v >= 100 ? 0 : 2),
      labels: { legend: t('atmW.e.title') },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const view = v => {
  const mass = (v.mass ?? 1) * EARTH_MASS;
  const r = (v.radius ?? 6.9e3) * 1e3;
  return { mass, r, te: v.te ?? 1000 };
};

export const escapeControls = () => [
  {
    id: 'te',
    get label() {
      return t('atmW.e.control.te');
    },
    min: 200,
    max: 3000,
    step: 50,
    value: 1000,
    decimals: 0,
    format: x => `${fixed(x, 0)} K`,
  },
  {
    id: 'mass',
    get label() {
      return t('atmW.e.control.mass');
    },
    min: 0.05,
    max: 20,
    step: 0.05,
    value: 1,
    decimals: 2,
    format: x => `${fixed(x, 2)} M⊕`,
  },
  {
    id: 'radius',
    get label() {
      return t('atmW.e.control.radius');
    },
    min: 3000,
    max: 20000,
    step: 100,
    value: 6900,
    decimals: 0,
    format: x => `${fixed(x, 0)} km`,
  },
];

export const drawEscape = (canvas, v) => {
  const { mass, r } = view(v);
  const xs = Array.from({ length: 29 }, (_, i) => 200 + i * 100);
  const series = SPECIES.map(s => ({
    id: s.id,
    label: t(`atmW.e.legend.${s.id}`),
    x: xs,
    y: xs.map(
      T => (G_NEWTON * mass * s.amu * ATOMIC_MASS) / (K_BOLTZMANN * T * r)
    ),
    color: s.color,
    width: 2,
    mode: 'line',
  }));
  const spec = {
    label: t('atmW.e.title'),
    xTitle: t('atmW.e.axis.x'),
    yTitle: t('atmW.e.axis.y'),
    series,
  };
  hostOf(canvas).chart.draw(spec);
  return spec;
};

export const readEscape = v => {
  const { mass, r, te } = view(v);
  const b = retentionBound({
    mass,
    exobaseRadius: r,
    exobaseTemperature: te,
    particleMassAmu: SPECIES[0].amu,
    timeS: GYR,
    columnRatioM: 1e5,
  });
  return [
    {
      label: t('atmW.e.row.lambda'),
      value: fixed(b.lambda, 2),
      emphasis: true,
    },
    {
      label: t('atmW.e.row.need'),
      value: fixed(b.canRetainOnlyIf.lambdaAtLeast, 1),
    },
  ];
};
