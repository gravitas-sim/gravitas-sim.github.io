// =============================================================================
// The joint-fit panels (Prompt 227, JOINT_INFERENCE.md)
// -----------------------------------------------------------------------------
// Two panels in a lazy family, over one stored joint fit of a synthetic system:
//   joint-fit    the planet's mass, radius and density with the star's uncertainty inside
//                them: the star's stated mass and radius, their uncertainty and correlation,
//                the share of each planetary uncertainty that is the star's, and whether the
//                star the reader states fits the star the transit measures. A chart of the
//                density's uncertainty against the star's.
//   mass-radius  the planet on a diagram of radius against mass through the plot component, with
//                the lines of constant density, the planets of the Solar System and the box of one
//                sigma, with and without the star's share.
//
// Nothing is calculated here: every number is js/jointField.js's, over js/inference/jointPlanet.js.
// The system is synthetic and says so; the Solar System's masses and radii are the typed
// Prompt 203 table, which was not rechecked. No composition curve is drawn: none was supplied.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_JOINT } from './i18n/en.joint.js';
import { ES_JOINT } from './i18n/es.joint.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { compositionClass } from './kernels/interiors/bulk.js';
import {
  DENSITIES,
  SIGMA_STEPS,
  STORED,
  COVERAGE,
  densityLine,
  densityPercent,
  densityTension,
  planetBox,
  planetFrom,
  solarSystemPoints,
} from './jointField.js';

registerMessages('en', EN_JOINT);
registerMessages('es', ES_JOINT);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
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
      height: 260,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 3),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const toggle = (id, label, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(x >= 0.5 ? 'jointW.on' : 'jointW.off'),
});

const stepIndex = x =>
  Math.max(0, Math.min(SIGMA_STEPS.length - 1, Math.round(x ?? 0)));
const pctControl = (id, label, value) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: SIGMA_STEPS.length - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => `${fixed(SIGMA_STEPS[stepIndex(x)], 1)} %`,
});
const correlationControl = {
  id: 'correlation',
  get label() {
    return t('jointW.control.correlation');
  },
  min: 0,
  max: 0.9,
  step: 0.1,
  value: 0.5,
  decimals: 1,
  format: x => fixed(x, 1),
};

/** The stated star of a panel's control values. */
const stateOf = v => ({
  massPct: SIGMA_STEPS[stepIndex(v.massPct)],
  radiusPct: SIGMA_STEPS[stepIndex(v.radiusPct)],
  correlation: v.correlation ?? 0.5,
  massValue: v.starMass,
  radiusValue: v.starRadius,
});

const share = q => fixed(100 * q.share, 0);

const FIT = {
  id: 'joint-fit',
  get title() {
    return t('jointW.fit.title');
  },
  get note() {
    return t('jointW.fit.note');
  },
  animated: false,
  controls: [
    pctControl('massPct', 'jointW.control.massPct', 4),
    pctControl('radiusPct', 'jointW.control.radiusPct', 3),
    correlationControl,
    {
      id: 'starMass',
      get label() {
        return t('jointW.control.starMass');
      },
      min: 0.8,
      max: 1.4,
      step: 0.05,
      value: 1.1,
      decimals: 2,
      format: x => fixed(x, 2),
    },
    {
      id: 'starRadius',
      get label() {
        return t('jointW.control.starRadius');
      },
      min: 0.9,
      max: 1.8,
      step: 0.05,
      value: 1.15,
      decimals: 2,
      format: x => fixed(x, 2),
    },
  ],
  draw(canvas, v) {
    const s = stateOf(v);
    const xs = Array.from({ length: 25 }, (_, i) => (12 * i) / 24);
    const withStar = xs.map(x => densityPercent(x, s.correlation));
    const alone = xs.map(() => densityPercent(0, s.correlation));
    const spec = {
      label: t('jointW.fit.title'),
      xTitle: t('jointW.axis.pct'),
      yTitle: t('jointW.axis.rho'),
      xRange: [0, 12],
      yRange: [0, Math.max(...withStar) * 1.1],
      series: [
        {
          id: 'star',
          label: t('jointW.legend.star'),
          x: xs,
          y: withStar,
          color: COLOR.blue,
        },
        {
          id: 'alone',
          label: t('jointW.legend.alone'),
          x: xs,
          y: alone,
          color: COLOR.grey,
          dash: [4, 3],
        },
        {
          id: 'now',
          label: t('jointW.legend.now'),
          x: [(s.massPct + s.radiusPct) / 2],
          y: [(100 * planetFrom(s).rhoP.sigma) / planetFrom(s).rhoP.value],
          color: COLOR.orange,
          mode: 'points',
          radius: 5,
        },
      ],
    };
    const h = hostOf(canvas, t('jointW.fit.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const s = stateOf(v);
    const p = planetFrom(s);
    const tension = densityTension(s);
    const flag = Math.abs(tension.z) > 3 ? t('jointW.v.tensionFlag') : '';
    return [
      {
        label: t('jointW.row.system'),
        value: t('jointW.v.system', {
          j: fixed(STORED.jitter, 1),
          c: fixed(STORED.chi2, 0),
          d: fixed(STORED.dof, 0),
        }),
      },
      {
        label: t('jointW.row.star'),
        value: t('jointW.v.star', {
          m: fixed(p.star.mass.value, 2),
          sm: fixed(s.massPct, 1),
          r: fixed(p.star.radius.value, 2),
          sr: fixed(s.radiusPct, 1),
          rho: fixed(s.correlation, 1),
        }),
      },
      {
        label: t('jointW.row.mass'),
        value: t('jointW.v.mass', {
          v: fixed(p.Mp.value, 3),
          s: fixed(p.Mp.sigma, 3),
          e: fixed(p.MpEarth.value, 0),
          a: fixed(p.Mp.sigmaFit, 3),
          b: fixed(p.Mp.sigmaStar, 3),
          p: share(p.Mp),
        }),
        emphasis: true,
      },
      {
        label: t('jointW.row.radius'),
        value: t('jointW.v.radius', {
          v: fixed(p.Rp.value, 3),
          s: fixed(p.Rp.sigma, 3),
          a: fixed(p.Rp.sigmaFit, 3),
          b: fixed(p.Rp.sigmaStar, 3),
          p: share(p.Rp),
        }),
        emphasis: true,
      },
      {
        label: t('jointW.row.density'),
        value: t('jointW.v.density', {
          v: fixed(p.rhoP.value, 3),
          s: fixed(p.rhoP.sigma, 3),
          a: fixed(p.rhoP.sigmaFit, 3),
          b: fixed(p.rhoP.sigmaStar, 3),
          p: share(p.rhoP),
        }),
        emphasis: true,
      },
      {
        label: t('jointW.row.tension'),
        value: t('jointW.v.tension', {
          t: fixed(tension.transit, 2),
          st: fixed(tension.sigmaTransit, 2),
          s: fixed(tension.stated, 2),
          ss: fixed(tension.sigmaStated, 2),
          z: fixed(Math.abs(tension.z), 1),
          flag,
        }),
      },
      {
        label: t('jointW.row.rates'),
        value: t('jointW.v.rates', {
          n: COVERAGE.n,
          m: fixed(100 * COVERAGE.Mp, 0),
          n2: fixed(100 * COVERAGE.MpAlone, 0),
          a: fixed(100 * COVERAGE.Rp, 0),
          b: fixed(100 * COVERAGE.RpAlone, 0),
          c: fixed(100 * COVERAGE.rhoP, 0),
          d: fixed(100 * COVERAGE.rhoPAlone, 0),
        }),
      },
      { label: t('jointW.row.assumes'), value: t('jointW.a') },
    ];
  },
};

/** The one-sigma box of a point as a closed polyline, in log10 axes. */
const box = (m, r) => {
  const x0 = Math.log10(Math.max(1e-3, m.value - m.sigma));
  const x1 = Math.log10(m.value + m.sigma);
  const y0 = Math.log10(Math.max(1e-3, r.value - r.sigma));
  const y1 = Math.log10(r.value + r.sigma);
  return { x: [x0, x1, x1, x0, x0], y: [y0, y0, y1, y1, y0] };
};

const MASSES = Array.from(
  { length: 41 },
  (_, i) => 10 ** (-1.5 + (4.3 * i) / 40)
);

const MASS_RADIUS = {
  id: 'mass-radius',
  get title() {
    return t('jointW.mr.title');
  },
  get note() {
    return t('jointW.mr.note');
  },
  animated: false,
  controls: [
    pctControl('massPct', 'jointW.control.massPct', 4),
    pctControl('radiusPct', 'jointW.control.radiusPct', 3),
    toggle('alone', 'jointW.control.alone', 0),
    toggle('lines', 'jointW.control.lines', 1),
  ],
  draw(canvas, v) {
    const s = { ...stateOf(v), correlation: 0.5 };
    const b = planetBox(s);
    const series = [];
    if (Math.round(v.lines ?? 1) === 1)
      DENSITIES.forEach((d, i) => {
        const y = densityLine(d, MASSES);
        series.push({
          id: `density${i}`,
          label: t('jointW.legend.density', { d: fixed(d, 2) }),
          x: MASSES.map(Math.log10),
          y: y.map(Math.log10),
          color: COLOR.grey,
          dash: [2, 3],
        });
      });
    const solar = solarSystemPoints();
    series.push({
      id: 'solar',
      label: t('jointW.legend.solar'),
      x: solar.map(p => Math.log10(p.mass)),
      y: solar.map(p => Math.log10(p.radius)),
      color: COLOR.green,
      mode: 'points',
      radius: 4,
    });
    series.push({
      id: 'planet',
      label: t('jointW.legend.planet'),
      x: [Math.log10(b.mass.value)],
      y: [Math.log10(b.radius.value)],
      color: COLOR.blue,
      mode: 'points',
      radius: 5,
    });
    const bx = box(b.mass, b.radius);
    series.push({
      id: 'box',
      label: t('jointW.legend.box'),
      x: bx.x,
      y: bx.y,
      color: COLOR.blue,
    });
    if (Math.round(v.alone ?? 0) === 1) {
      const a = box(
        { value: b.mass.value, sigma: b.mass.sigmaFit },
        { value: b.radius.value, sigma: b.radius.sigmaFit }
      );
      series.push({
        id: 'boxAlone',
        label: t('jointW.legend.boxAlone'),
        x: a.x,
        y: a.y,
        color: COLOR.orange,
        dash: [4, 3],
      });
    }
    const spec = {
      label: t('jointW.mr.title'),
      xTitle: t('jointW.axis.logM'),
      yTitle: t('jointW.axis.logR'),
      xRange: [-1.5, 2.8],
      yRange: [-0.6, 1.4],
      series,
    };
    const h = hostOf(canvas, t('jointW.mr.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const s = { ...stateOf(v), correlation: 0.5 };
    const p = planetFrom(s);
    const b = planetBox(s);
    const cls = compositionClass({
      density: p.rhoP.value * 1000,
      sigma: p.rhoP.sigma * 1000,
    });
    return [
      {
        label: t('jointW.row.mass'),
        value: t('jointW.v.mass', {
          v: fixed(p.Mp.value, 3),
          s: fixed(p.Mp.sigma, 3),
          e: fixed(p.MpEarth.value, 0),
          a: fixed(p.Mp.sigmaFit, 3),
          b: fixed(p.Mp.sigmaStar, 3),
          p: share(p.Mp),
        }),
      },
      {
        label: t('jointW.row.radius'),
        value: `${fixed(p.Rp.value, 3)} ± ${fixed(p.Rp.sigma, 3)} (${fixed(b.radius.value, 1)} ± ${fixed(b.radius.sigma, 1)})`,
      },
      {
        label: t('jointW.row.density'),
        value: `${fixed(p.rhoP.value, 3)} ± ${fixed(p.rhoP.sigma, 3)} g/cm3`,
        emphasis: true,
      },
      {
        label: t('jointW.row.class'),
        value:
          t('jointW.v.class', { c: t(`jointW.class.${cls.class}`) }) +
          (cls.ambiguous ? t('jointW.v.ambiguous') : ''),
      },
    ];
  },
};

export const JOINT_WIDGETS = [FIT, MASS_RADIUS];
