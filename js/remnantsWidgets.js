// =============================================================================
// The remnants panels (Prompt 222, REMNANTS.md)
// -----------------------------------------------------------------------------
// Two panels in one lazy family. `remnant-cooling` gives the cooling age of a white
// dwarf from its mass and its luminosity or temperature, with the two uncertainties
// kept apart (the observational one and the law's own, measured against a published
// cooling table) and the domain drawn, refusing outside it. `remnant-outcome` gives
// the final mass of a star of a given initial mass with the scatter of the relation,
// the probabilities of leaving a white dwarf, a neutron star or a black hole, and the
// cited masses of neutron stars.
//
// Nothing is calculated here: every number is js/remnantsField.js's, over
// js/kernels/remnants/. No observed white-dwarf table is shown (D-INTERIOR-01).
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_REMNANTS } from './i18n/en.remnants.js';
import { ES_REMNANTS } from './i18n/es.remnants.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { MODEL_DELTA_LN } from './kernels/remnants/calibration.js';
import {
  PRECISIONS,
  CHANDRASEKHAR,
  coolingView,
  outcomeView,
} from './remnantsField.js';

registerMessages('en', EN_REMNANTS);
registerMessages('es', ES_REMNANTS);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
  red: '#c92a2a',
};

// -----------------------------------------------------------------------------
// shared pieces
// -----------------------------------------------------------------------------
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
  decimals: step < 1 ? (step < 0.01 ? 3 : step < 0.1 ? 2 : 1) : 0,
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

const pct = (x, d = 0) => fixed(100 * x, d);
const gyr = yr => fixed(yr / 1e9, yr < 1e8 ? 3 : 2);

// ----------------------------------------------------------------------------
// remnant-cooling
// ----------------------------------------------------------------------------
const COOLING = {
  id: 'remnant-cooling',
  get title() {
    return t('remW.c.title');
  },
  get note() {
    return t('remW.c.note');
  },
  animated: false,
  controls: [
    numeric('mass', 'remW.c.control.mass', 0.3, 1.4, 0.05, 0.6, x =>
      t('remW.v.msun', { x: fixed(x, 2) })
    ),
    choice('entry', 'remW.c.control.entry', 'remW.c.entry', 2),
    numeric('logL', 'remW.c.control.logL', -4.6, -1, 0.05, -3, x =>
      fixed(x, 2)
    ),
    numeric('teff', 'remW.c.control.teff', 3000, 40000, 250, 8000, x =>
      t('remW.v.k', { x: fixed(x, 0) })
    ),
    choice('precision', 'remW.c.control.precision', 'remW.c.precision', 4),
    choice('view', 'remW.c.control.view', 'remW.c.view', 2),
  ],
  draw(canvas, v) {
    const m = coolingView(v);
    const label = t('remW.c.title');
    const [l0, l1] = m.domain.logLSun;
    let spec;
    if (m.view === 1) {
      const k = Math.exp(MODEL_DELTA_LN);
      spec = {
        xTitle: t('remW.axis.mass'),
        yTitle: t('remW.axis.gyr'),
        xRange: [0.5, 1],
        series: [
          {
            id: 'law',
            label: t('remW.legend.law'),
            x: m.byMass.map(p => p[0]),
            y: m.byMass.map(p => p[1]),
            color: COLOR.blue,
            width: 2,
            mode: 'line',
          },
          {
            id: 'upper',
            label: t('remW.legend.model'),
            x: m.byMass.map(p => p[0]),
            y: m.byMass.map(p => p[1] * k),
            color: COLOR.grey,
            width: 1,
            mode: 'line',
          },
          {
            id: 'lower',
            label: t('remW.legend.modelLower'),
            x: m.byMass.map(p => p[0]),
            y: m.byMass.map(p => p[1] / k),
            color: COLOR.grey,
            width: 1,
            mode: 'line',
          },
          ...(m.result.status === 'ok'
            ? [
                {
                  id: 'star',
                  label: t('remW.legend.star'),
                  x: [m.result.massSun],
                  y: [m.result.ageYr / 1e9],
                  color: COLOR.orange,
                  mode: 'points',
                  radius: 5,
                },
              ]
            : []),
        ],
      };
    } else {
      const k = Math.exp(MODEL_DELTA_LN);
      const series = [
        {
          id: 'law',
          label: t('remW.legend.law'),
          x: m.curve.map(p => p[1]),
          y: m.curve.map(p => p[0]),
          color: COLOR.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'upper',
          label: t('remW.legend.model'),
          x: m.curve.map(p => p[1] + Math.log10(k)),
          y: m.curve.map(p => p[0]),
          color: COLOR.grey,
          width: 1,
          mode: 'line',
        },
        {
          id: 'lower',
          label: t('remW.legend.modelLower'),
          x: m.curve.map(p => p[1] - Math.log10(k)),
          y: m.curve.map(p => p[0]),
          color: COLOR.grey,
          width: 1,
          mode: 'line',
        },
        {
          id: 'edge-hot',
          label: t('remW.legend.domain'),
          x: [6.5, 10.3],
          y: [l1, l1],
          color: COLOR.green,
          width: 1,
          mode: 'line',
        },
        {
          id: 'edge-cool',
          label: t('remW.legend.domainCool'),
          x: [6.5, 10.3],
          y: [l0, l0],
          color: COLOR.green,
          width: 1,
          mode: 'line',
        },
      ];
      if (m.result.status === 'ok') {
        const r = m.result;
        series.push({
          id: 'star',
          label: t('remW.legend.star'),
          x: [Math.log10(r.ageYr)],
          y: [r.logLSun],
          color: COLOR.orange,
          mode: 'points',
          radius: 5,
        });
        series.push({
          id: 'interval',
          label: t('remW.legend.interval'),
          x: [Math.log10(r.interval95.lo), Math.log10(r.interval95.hi)],
          y: [r.logLSun, r.logLSun],
          color: COLOR.orange,
          width: 3,
          mode: 'line',
        });
      }
      spec = {
        xTitle: t('remW.axis.logAge'),
        yTitle: t('remW.axis.logL'),
        xRange: [6.5, 10.3],
        yRange: [-4.6, -1],
        series,
      };
    }
    spec.label = label;
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = coolingView(v);
    const r = m.result;
    const rows = [{ label: t('remW.c.row.model'), value: t('remW.c.m.law') }];
    if (r.status !== 'ok') {
      rows.push({
        label: t('remW.c.row.none'),
        value: t(`remW.refuse.${r.reason}`),
        emphasis: true,
      });
      rows.push({
        label: t('remW.c.row.domain'),
        value: t('remW.c.v.domain', {
          m0: fixed(m.domain.massSun[0], 1),
          m1: fixed(m.domain.massSun[1], 1),
          l0: fixed(m.domain.logLSun[0], 1),
          l1: fixed(m.domain.logLSun[1], 1),
        }),
      });
      return rows;
    }
    rows.push({
      label: t('remW.c.row.lum'),
      value: t('remW.c.v.lum', {
        l: fixed(r.logLSun, 2),
        teff: fixed(r.teffK, 0),
        r: fixed(r.radiusSun, 4),
      }),
    });
    rows.push({
      label: t('remW.c.row.age'),
      value: t('remW.c.v.age', { a: gyr(r.ageYr) }),
      emphasis: true,
    });
    rows.push({
      label: t('remW.c.row.obs'),
      value:
        m.precision.id === 'none'
          ? t('remW.c.v.obsNone')
          : t('remW.c.v.obs', { p: pct(r.sigmaObsLn * 1.959963984540054) }),
    });
    rows.push({
      label: t('remW.c.row.model2'),
      value: t('remW.c.v.model', {
        p: pct(r.sigmaModelLn * 1.959963984540054),
      }),
    });
    rows.push({
      label: t('remW.c.row.interval'),
      value: t('remW.c.v.interval', {
        a: gyr(r.interval95.lo),
        b: gyr(r.interval95.hi),
      }),
      emphasis: true,
    });
    rows.push({
      label: t('remW.c.row.limited'),
      value: t(r.modelLimited ? 'remW.c.v.limitedYes' : 'remW.c.v.limitedNo'),
    });
    rows.push({
      label: t('remW.c.row.domain'),
      value: t('remW.c.v.domain', {
        m0: fixed(m.domain.massSun[0], 1),
        m1: fixed(m.domain.massSun[1], 1),
        l0: fixed(m.domain.logLSun[0], 1),
        l1: fixed(m.domain.logLSun[1], 1),
      }),
    });
    rows.push({ label: t('remW.c.row.assumes'), value: t('remW.c.a.law') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// remnant-outcome
// ----------------------------------------------------------------------------
const OUTCOME = {
  id: 'remnant-outcome',
  get title() {
    return t('remW.o.title');
  },
  get note() {
    return t('remW.o.note');
  },
  animated: false,
  controls: [
    numeric('mi', 'remW.o.control.mi', 0.5, 60, 0.25, 3, x =>
      t('remW.v.msun', { x: fixed(x, 2) })
    ),
    choice('relation', 'remW.o.control.relation', 'remW.o.relation', 2),
    choice('view', 'remW.o.control.view', 'remW.o.view', 3),
  ],
  draw(canvas, v) {
    const m = outcomeView(v);
    const label = t('remW.o.title');
    let spec;
    if (m.view === 1) {
      const xs = m.probs.map(p => p[0]);
      spec = {
        xTitle: t('remW.axis.mi'),
        yTitle: t('remW.axis.prob'),
        xRange: [0, 60],
        yRange: [0, 1.02],
        series: [
          {
            id: 'wd',
            label: t('remW.legend.wd'),
            x: xs,
            y: m.probs.map(p => p[1].whiteDwarf),
            color: COLOR.blue,
            width: 2,
            mode: 'line',
          },
          {
            id: 'ns',
            label: t('remW.legend.ns'),
            x: xs,
            y: m.probs.map(p => p[1].neutronStar),
            color: COLOR.green,
            width: 2,
            mode: 'line',
          },
          {
            id: 'bh',
            label: t('remW.legend.bh'),
            x: xs,
            y: m.probs.map(p => p[1].blackHole),
            color: COLOR.red,
            width: 2,
            mode: 'line',
          },
          {
            id: 'here',
            label: t('remW.legend.here'),
            x: [m.mi, m.mi],
            y: [0, 1],
            color: COLOR.orange,
            width: 2,
            mode: 'line',
          },
        ],
      };
    } else if (m.view === 2) {
      const sys = m.neutronStars.systems;
      spec = {
        xTitle: t('remW.axis.system'),
        yTitle: t('remW.axis.mass'),
        xRange: [0.5, sys.length + 0.5],
        yRange: [1, 1.7],
        series: [
          {
            id: 'psr',
            label: t('remW.legend.pulsar'),
            x: sys.map((_, i) => i + 1),
            y: sys.map(s => s.pulsar),
            color: COLOR.blue,
            mode: 'points',
            radius: 4,
          },
          {
            id: 'comp',
            label: t('remW.legend.companion'),
            x: sys.map((_, i) => i + 1),
            y: sys.map(s => s.companion),
            color: COLOR.red,
            mode: 'points',
            radius: 4,
          },
          {
            id: 'dns',
            label: t('remW.legend.dns'),
            x: [0.5, sys.length + 0.5],
            y: [1.33, 1.33],
            color: COLOR.grey,
            width: 2,
            mode: 'line',
          },
          {
            id: 'chandra',
            label: t('remW.legend.chandra'),
            x: [0.5, sys.length + 0.5],
            y: [CHANDRASEKHAR, CHANDRASEKHAR],
            color: COLOR.orange,
            width: 2,
            mode: 'line',
          },
        ],
      };
    } else {
      const series = [
        {
          id: 'rel',
          label: t('remW.legend.relation'),
          x: m.curve.map(p => p.mi),
          y: m.curve.map(p => p.mf),
          color: COLOR.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'upper',
          label: t('remW.legend.upper'),
          x: m.curve.map(p => p.mi),
          y: m.curve.map(p => p.hi),
          color: COLOR.grey,
          width: 1,
          mode: 'line',
        },
        {
          id: 'lower',
          label: t('remW.legend.lower'),
          x: m.curve.map(p => p.mi),
          y: m.curve.map(p => p.lo),
          color: COLOR.grey,
          width: 1,
          mode: 'line',
        },
        {
          id: 'chandra',
          label: t('remW.legend.chandra'),
          x: [0.8, 7.5],
          y: [CHANDRASEKHAR, CHANDRASEKHAR],
          color: COLOR.orange,
          width: 1,
          mode: 'line',
        },
      ];
      if (m.remnant.status === 'ok')
        series.push({
          id: 'here',
          label: t('remW.legend.here'),
          x: [m.mi],
          y: [m.remnant.finalMass],
          color: COLOR.red,
          mode: 'points',
          radius: 5,
        });
      spec = {
        xTitle: t('remW.axis.mi'),
        yTitle: t('remW.axis.mf'),
        xRange: [0.8, 7.5],
        yRange: [0, 1.6],
        series,
      };
    }
    spec.label = label;
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = outcomeView(v);
    const rows = [{ label: t('remW.o.row.model'), value: t('remW.o.m.model') }];
    const r = m.remnant;
    if (r.status === 'ok') {
      rows.push({
        label: t('remW.o.row.final'),
        value: t('remW.o.v.final', {
          m: fixed(r.finalMass, 2),
          s: fixed(r.scatter, 2),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('remW.o.row.lost'),
        value: t('remW.o.v.lost', {
          l: fixed(r.massLost, 2),
          p: pct(r.lossFraction, 0),
        }),
      });
      rows.push({
        label: t('remW.o.row.interval'),
        value: t('remW.o.v.interval', {
          a: fixed(r.interval95.lo, 2),
          b: fixed(r.interval95.hi, 2),
          c: fixed(r.sigmaParameters, 2),
        }),
      });
      if (r.extrapolated)
        rows.push({
          label: t('remW.o.row.flag'),
          value: t('remW.o.v.extrapolated'),
        });
    } else
      rows.push({
        label: t('remW.o.row.nofinal'),
        value: t(`remW.refuse.${r.reason}`),
        emphasis: true,
      });
    const o = m.outcome;
    if (o.status === 'ok') {
      rows.push({
        label: t('remW.o.row.wd'),
        value: t('remW.o.v.prob', { p: pct(o.probabilities.whiteDwarf) }),
      });
      rows.push({
        label: t('remW.o.row.ns'),
        value: t('remW.o.v.prob', { p: pct(o.probabilities.neutronStar) }),
      });
      rows.push({
        label: t('remW.o.row.bh'),
        value: t('remW.o.v.prob', { p: pct(o.probabilities.blackHole) }),
      });
      rows.push({
        label: t('remW.o.row.verdict'),
        value: t(`remW.o.verdict.${o.verdict}`, {
          c: t(`remW.o.class.${o.mostLikely.outcome}`),
          p: pct(o.mostLikely.probability),
        }),
        emphasis: true,
      });
    } else
      rows.push({
        label: t('remW.o.row.noout'),
        value: t(`remW.refuse.${o.reason}`),
        emphasis: true,
      });
    rows.push({
      label: t('remW.o.row.ranges'),
      value: t('remW.o.v.ranges', {
        a: fixed(m.thresholds.whiteDwarfToNeutronStar.lo, 1),
        b: fixed(m.thresholds.whiteDwarfToNeutronStar.hi, 1),
        c: fixed(m.thresholds.neutronStarToBlackHole.lo, 0),
        d: fixed(m.thresholds.neutronStarToBlackHole.hi, 0),
      }),
    });
    if (m.view === 2)
      rows.push({
        label: t('remW.o.row.ns2'),
        value: t('remW.o.v.ns', {
          n: m.neutronStars.masses.length,
          lo: fixed(m.neutronStars.min, 2),
          hi: fixed(m.neutronStars.max, 2),
          c: fixed(CHANDRASEKHAR, 2),
        }),
      });
    rows.push({ label: t('remW.o.row.assumes'), value: t('remW.o.a.model') });
    return rows;
  },
};

export const REMNANTS_WIDGETS = [COOLING, OUTCOME];
void PRECISIONS;
