// =============================================================================
// The eclipsing-binary panels (Prompt 217, BINARIES.md)
// -----------------------------------------------------------------------------
// Two panels in one lazy family. `eclipse-curve` shows the light of two eclipsing
// stars against the orbit's phase through the plot component, the eclipses' depths,
// durations and bottoms, the secondary's phase and what e cos w it gives, and, when
// asked, a synthetic data set to compare by chi-square. `eclipse-fit` runs the
// inference core's eclipsing-binary model on a synthetic data set and reports, for
// every fitted parameter, its value and uncertainty or "not constrained", the
// residual test and, when asked, the profile of the radius ratio.
//
// Nothing is calculated here: every number is js/eclipseField.js's, over
// js/inference/binaries.js and js/inference/. Every data set is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_ECLIPSE } from './i18n/en.eclipse.js';
import { ES_ECLIPSE } from './i18n/es.eclipse.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { PRESETS, curveView, fitView, sigmaOf } from './eclipseField.js';

registerMessages('en', EN_ECLIPSE);
registerMessages('es', ES_ECLIPSE);

const COLOR = { blue: '#1c7ed6', orange: '#e8590c', grey: '#495057' };

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
      number: v => fixed(v, v >= 100 ? 0 : v >= 1 ? 2 : 3),
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
  format: x => t(x >= 0.5 ? 'eclW.on' : 'eclW.off'),
});

const pct = x => fixed(100 * x, x < 0.1 ? 2 : 1);

// ----------------------------------------------------------------------------
// eclipse-curve
// ----------------------------------------------------------------------------
const CURVE = {
  id: 'eclipse-curve',
  get title() {
    return t('eclW.c.title');
  },
  get note() {
    return t('eclW.c.note');
  },
  animated: false,
  controls: [
    numeric('rsum', 'eclW.c.control.rsum', 0.05, 0.5, 0.005, 0.19, x =>
      fixed(x, 3)
    ),
    numeric('k', 'eclW.c.control.k', 0.3, 3, 0.05, 0.75, x => fixed(x, 2)),
    numeric('inc', 'eclW.c.control.inc', 70, 90, 0.1, 87.6, x =>
      t('eclW.v.deg', { x: fixed(x, 1) })
    ),
    numeric('J', 'eclW.c.control.J', 0.05, 1, 0.01, 0.55, x => fixed(x, 2)),
    numeric('ecosw', 'eclW.c.control.ecosw', -0.3, 0.3, 0.005, 0, x =>
      fixed(x, 3)
    ),
    numeric('esinw', 'eclW.c.control.esinw', -0.3, 0.3, 0.005, 0, x =>
      fixed(x, 3)
    ),
    {
      id: 'data',
      get label() {
        return t('eclW.c.control.data');
      },
      min: 0,
      max: PRESETS.length,
      step: 1,
      value: 0,
      decimals: 0,
      format: x =>
        t(`eclW.data.${Math.max(0, Math.min(PRESETS.length, Math.round(x)))}`),
    },
  ],
  draw(canvas, v) {
    const m = curveView(v);
    const series = [
      {
        id: 'model',
        label: t('eclW.legend.model'),
        x: Array.from(m.phase),
        y: Array.from(m.flux),
        color: COLOR.blue,
        width: 2,
        mode: 'line',
      },
    ];
    if (m.data)
      series.unshift({
        id: 'data',
        label: t('eclW.legend.data'),
        x: m.data.phase,
        y: m.data.flux,
        color: COLOR.grey,
        mode: 'points',
        radius: 1.5,
      });
    const lo = Math.min(...m.flux, ...(m.data ? m.data.flux : [1]));
    const spec = {
      label: t('eclW.c.title'),
      xTitle: t('eclW.axis.phase'),
      yTitle: t('eclW.axis.flux'),
      xRange: [0, 1],
      yRange: [Math.max(0, lo - 0.02), 1.02],
      series,
    };
    hostOf(canvas, t('eclW.c.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = curveView(v);
    const eclipse = (depth, c, flat) =>
      depth > 1e-6
        ? t('eclW.v.eclipse', {
            d: pct(depth),
            w: fixed(c, 3),
            b: t(flat ? 'eclW.bottom.flat' : 'eclW.bottom.curved'),
          })
        : t('eclW.v.none');
    const rows = [
      { label: t('eclW.row.model'), value: t('eclW.m.binary') },
      {
        label: t('eclW.row.primary'),
        value: eclipse(
          m.primaryDepth,
          m.derived.primaryDuration,
          m.primaryFlat
        ),
        emphasis: true,
      },
      {
        label: t('eclW.row.secondary'),
        value: eclipse(
          m.secondaryDepth,
          m.derived.secondaryDuration,
          m.secondaryFlat
        ),
        emphasis: true,
      },
      {
        label: t('eclW.row.phase'),
        value: t('eclW.v.phase', {
          p: fixed(m.secondaryPhase, 4),
          h: '0.5',
          e: fixed((Math.PI / 2) * (m.secondaryPhase - 0.5), 4),
        }),
      },
      {
        label: t('eclW.row.light'),
        value: t('eclW.v.light', { l: fixed(m.lightRatio, 3) }),
      },
      {
        label: t('eclW.row.radii'),
        value: t('eclW.v.radii', {
          a: fixed(m.derived.r1, 4),
          b: fixed(m.derived.r2, 4),
        }),
      },
    ];
    if (m.data)
      rows.push({
        label: t('eclW.row.orbit'),
        value: t('eclW.v.orbit', { p: fixed(m.params.P, 2) }),
      });
    if (m.data)
      rows.push({
        label: t('eclW.row.compare'),
        value: t('eclW.v.compare', {
          n: m.data.rows,
          c: fixed(m.data.chi2, 0),
          r: fixed(m.data.reducedChi2, 2),
        }),
        emphasis: true,
      });
    rows.push({ label: t('eclW.row.assumes'), value: t('eclW.a.curve') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// eclipse-fit
// ----------------------------------------------------------------------------
const PARAM_ORDER = ['tc', 'P', 'rsum', 'k', 'inc', 'J', 'ecosw', 'esinw'];
const DECIMALS = {
  tc: 4,
  P: 5,
  rsum: 4,
  k: 3,
  inc: 2,
  J: 3,
  ecosw: 4,
  esinw: 4,
};

const FIT = {
  id: 'eclipse-fit',
  get title() {
    return t('eclW.f.title');
  },
  get note() {
    return t('eclW.f.note');
  },
  animated: false,
  controls: [
    {
      id: 'dataset',
      get label() {
        return t('eclW.f.control.dataset');
      },
      min: 0,
      max: PRESETS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x =>
        t(
          `eclW.data.${Math.max(0, Math.min(PRESETS.length - 1, Math.round(x))) + 1}`
        ),
    },
    toggle('profile', 'eclW.f.control.profile'),
    toggle('truth', 'eclW.f.control.truth'),
  ],
  draw(canvas, v) {
    const m = fitView(v);
    const series = [];
    if (m.fit) {
      const p = m.preset;
      const phase = Array.from(
        m.data.x,
        x =>
          ((((x - m.fit.parameters[0].value) / m.fit.parameters[1].value) % 1) +
            1) %
          1
      );
      const step = Math.max(1, Math.floor(phase.length / 500));
      const f0 = m.fit.linear.f0;
      series.push({
        id: 'data',
        label: t('eclW.legend.data'),
        x: phase.filter((_, i) => i % step === 0),
        y: Array.from(m.data.y)
          .filter((_, i) => i % step === 0)
          .map(y => y / f0),
        color: COLOR.grey,
        mode: 'points',
        radius: 1.5,
      });
      const order = Array.from(phase.keys()).sort(
        (a, b) => phase[a] - phase[b]
      );
      series.push({
        id: 'fit',
        label: t('eclW.legend.fit'),
        x: order.filter((_, i) => i % 2 === 0).map(i => phase[i]),
        y: order.filter((_, i) => i % 2 === 0).map(i => m.fit.fit[i] / f0),
        color: COLOR.orange,
        width: 2,
        mode: 'line',
      });
      void p;
    }
    const lo = series.length ? Math.min(...series[0].y) : 0.9;
    const spec = {
      label: t('eclW.f.title'),
      xTitle: t('eclW.axis.phase'),
      yTitle: t('eclW.axis.flux'),
      xRange: [0, 1],
      yRange: [Math.max(0, lo - 0.02), 1.02],
      series,
    };
    hostOf(canvas, t('eclW.f.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = fitView(v);
    const rows = [
      {
        label: t('eclW.row.system'),
        value: t('eclW.v.system', {
          n: m.data.x.length,
          s: fixed(m.preset.sigma, 4),
          p: fixed(m.preset.truth.P, 2),
        }),
      },
    ];
    if (!m.fit) {
      rows.push({
        label: t('eclW.row.refused'),
        value: m.error,
        emphasis: true,
      });
      return rows;
    }
    const f = m.fit;
    for (const name of PARAM_ORDER) {
      const q = f.parameters.find(p => p.name === name);
      if (!q || q.mode !== 'fitted') continue;
      const open = f.identifiability.parameters[name];
      const d = DECIMALS[name];
      rows.push({
        label: t('eclW.row.param', { name }),
        value:
          open && open.status !== 'constrained'
            ? t('eclW.v.paramOpen', {
                v: fixed(q.value, d),
                why: t(`eclW.why.${open.why}`),
              })
            : t('eclW.v.param', {
                v: fixed(q.value, d),
                s: fixed(sigmaOf(q), d),
              }),
        emphasis: ['rsum', 'k'].includes(name),
      });
    }
    for (const [name, label] of [
      ['r1', 'R1/a'],
      ['r2', 'R2/a'],
    ]) {
      const d = m.derivedOf(name);
      const open = ['rsum', 'k'].some(
        n => f.identifiability.parameters[n]?.status === 'not constrained'
      );
      rows.push({
        label: t('eclW.row.param', { name: label }),
        value: open
          ? t('eclW.v.paramOpen', {
              v: fixed(d.value, 4),
              why: t('eclW.why.derived'),
            })
          : t('eclW.v.param', {
              v: fixed(d.value, 4),
              s: fixed(sigmaOf(d), 4),
            }),
        emphasis: true,
      });
    }
    const flagged = Object.entries(f.identifiability.parameters)
      .filter(([, x]) => x.status !== 'constrained')
      .map(([n]) => n);
    rows.push({
      label: t('eclW.row.verdict'),
      value: flagged.length
        ? t('eclW.verdict.open', { names: flagged.join(', ') })
        : t('eclW.verdict.constrained'),
      emphasis: true,
    });
    rows.push({
      label: t('eclW.row.chi2'),
      value: t('eclW.v.chi2', {
        c: fixed(f.reducedChi2, 2),
        d: f.dof,
        b: fixed(f.redNoise?.beta ?? 1, 2),
      }),
    });
    rows.push({
      label: t('eclW.row.residual'),
      value: t(m.residualFail ? 'eclW.resid.fail' : 'eclW.resid.pass'),
      emphasis: true,
    });
    const e = m.derivedOf('e');
    if (e && f.parameters.find(p => p.name === 'ecosw').mode === 'fitted')
      rows.push({
        label: t('eclW.row.ecc'),
        value: t('eclW.v.ecc', {
          e: fixed(e.value, 3),
          s: fixed(e.sigma, 3),
          w: fixed(m.derivedOf('omega').value, 0),
        }),
      });
    if (m.profile) {
      const [a, b] = m.profile.interval;
      const k = m.param('k').value;
      rows.push({
        label: t('eclW.row.profile'),
        value:
          a !== null && b !== null && (b - a) / k < 0.5
            ? t('eclW.v.profile', {
                a: fixed(a, 3),
                b: fixed(b, 3),
                k: fixed(k, 3),
              })
            : t('eclW.v.profileOpen', {
                a: a === null ? '…' : fixed(a, 3),
                b: b === null ? '…' : fixed(b, 3),
                k: fixed(k, 3),
              }),
        emphasis: true,
      });
    }
    if (Math.round(v.truth ?? 0) === 1) {
      const T = m.preset.truth;
      rows.push({
        label: t('eclW.row.truth'),
        value: t('eclW.v.truth', {
          r: fixed(T.rsum, 3),
          k: fixed(T.k, 2),
          i: fixed(T.inc, 2),
          j: fixed(T.J, 2),
          c: fixed(T.ecosw, 3),
          s: fixed(T.esinw, 3),
        }),
      });
    }
    rows.push({ label: t('eclW.row.assumes'), value: t('eclW.a.fit') });
    return rows;
  },
};

export const ECLIPSE_WIDGETS = [CURVE, FIT];
