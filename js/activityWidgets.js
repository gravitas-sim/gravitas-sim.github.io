// =============================================================================
// The stellar-activity panels (Prompt 220, STELLAR_ACTIVITY.md)
// -----------------------------------------------------------------------------
// Four panels in one lazy family. `activity-spots` turns a synthetic star with one or
// two dark spots and reads its period from the light curve, with the longer or shorter
// period it could also be. `activity-period` does the same on two real TESS light curves
// (AU Microscopii, EK Draconis). `activity-flares` marks the flares of AU Microscopii
// with their equivalent durations and uncertainties, and `activity-ffd` counts them by
// size and fits the power law through the kernel.
//
// Nothing is calculated here: every number is js/activityField.js's, over
// js/kernels/activity/. The real curves arrive as sidecar files after the module, and
// every panel says so while they load. No age and no energy appears (the gate, D-R10-220-90).
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_ACTIVITY } from './i18n/en.activity.js';
import { ES_ACTIVITY } from './i18n/es.activity.js';
import { fixed, scientific } from './format.js';
import { createChart } from './plot/mount.js';
import { loadActivityCurve } from './activityData.js';
import {
  SPOT_PERIOD,
  spotsView,
  rotationView,
  flareView,
  ffdView,
  lawRate,
  foldPhase,
  provideCurves,
  curvesIn,
} from './activityField.js';

registerMessages('en', EN_ACTIVITY);
registerMessages('es', ES_ACTIVITY);

const COLOR = { blue: '#1c7ed6', orange: '#e8590c', grey: '#495057' };

// -----------------------------------------------------------------------------
// The real curves: sidecars, fetched once
// -----------------------------------------------------------------------------
let failed = false;
let last = null;

/**
 * Resolves true once the loading has finished, whether or not it succeeded: a failure is
 * said by the panels themselves (the readout), not by a family that never becomes ready.
 * Never rejects.
 */
export const activityReady = (async () => {
  try {
    const [auMic, ekDra] = await Promise.all([
      loadActivityCurve('auMic'),
      loadActivityCurve('ekDra'),
    ]);
    provideCurves({ auMic, ekDra });
  } catch (err) {
    failed = true;
    console.warn('The stellar-activity light curves could not be loaded:', err);
  }
  if (last) last.redraw();
  return true;
})();

const waitingRow = () => ({
  label: t('actW.r.row.data'),
  value: t(failed ? 'actW.r.failed' : 'actW.r.loading'),
});

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
  format: x => t(x >= 0.5 ? 'actW.on' : 'actW.off'),
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

const pct = (x, d = 2) => fixed(100 * x, d);
const every = (n, k) => Math.max(1, Math.floor(n / k));
const thin = (a, k) =>
  Array.from(a).filter((_, i) => i % every(a.length, k) === 0);

/** The rows both rotation panels share: the period reported and the other period it could be. */
function periodRows(rot, labels) {
  const rows = [];
  const text = t(`actW.verdict.${rot.verdict}`, {
    p: rot.period === null ? '' : fixed(rot.period, 3),
    a: rot.interval ? fixed(rot.interval[0], 3) : '',
    b: rot.interval ? fixed(rot.interval[1], 3) : '',
  });
  rows.push({ label: labels.period, value: text, emphasis: true });
  const others = rot.candidates.filter(c => c.status !== 'primary');
  for (const c of others)
    rows.push({
      label: labels.alias,
      value: t('actW.v.cand', {
        p: fixed(c.period, 3),
        s: t(`actW.cand.${c.status}`),
      }),
      emphasis: true,
    });
  return rows;
}

/** A periodogram or folded view as a chart spec. */
function periodView(v, d) {
  const view = Math.round(v.view ?? 0);
  const rot = d.rotation;
  if (view === 1) {
    const peak = rot.period;
    return {
      xTitle: t('actW.axis.period'),
      yTitle: t('actW.axis.power'),
      series: [
        {
          id: 'power',
          label: t('actW.legend.power'),
          x: thin(d.spectrum.grid, 700),
          y: thin(d.spectrum.power, 700),
          color: COLOR.blue,
          width: 2,
          mode: 'line',
        },
        ...(peak
          ? [
              {
                id: 'peak',
                label: t('actW.legend.peak'),
                x: [peak, peak],
                y: [0, 1],
                color: COLOR.orange,
                width: 2,
                mode: 'line',
              },
              {
                id: 'double',
                label: t('actW.legend.double'),
                x: [2 * peak, 2 * peak],
                y: [0, 1],
                color: COLOR.grey,
                width: 1,
                mode: 'line',
              },
            ]
          : []),
      ],
    };
  }
  return null;
}

// ----------------------------------------------------------------------------
// activity-spots
// ----------------------------------------------------------------------------
const SPOTS = {
  id: 'activity-spots',
  get title() {
    return t('actW.s.title');
  },
  get note() {
    return t('actW.s.note');
  },
  animated: false,
  controls: [
    numeric('lat', 'actW.s.control.lat', 0, 80, 5, 30, x =>
      t('actW.v.deg', { x: fixed(x, 0) })
    ),
    numeric('size', 'actW.s.control.size', 5, 30, 1, 15, x =>
      t('actW.v.deg', { x: fixed(x, 0) })
    ),
    numeric('contrast', 'actW.s.control.contrast', 0.3, 0.95, 0.05, 0.65, x =>
      fixed(x, 2)
    ),
    numeric('inc', 'actW.s.control.inc', 20, 90, 5, 70, x =>
      t('actW.v.deg', { x: fixed(x, 0) })
    ),
    toggle('second', 'actW.s.control.second'),
    numeric('shear', 'actW.s.control.shear', 0, 0.4, 0.05, 0, x => fixed(x, 2)),
    choice('view', 'actW.s.control.view', 'actW.s.view', 4),
  ],
  draw(canvas, v) {
    const m = spotsView(v);
    const view = Math.round(v.view ?? 0);
    const rot = m.rotation;
    let spec;
    if (view === 1) {
      spec = {
        ...periodView(v, m),
        xRange: [0.5, 8],
        yRange: [0, 1.02],
      };
    } else if (view >= 2) {
      const P = (rot.period ?? SPOT_PERIOD) * (view === 3 ? 2 : 1);
      const ph = foldPhase(m.data.t, P);
      spec = {
        xTitle: t('actW.axis.phase'),
        yTitle: t('actW.axis.flux'),
        xRange: [0, 1],
        series: [
          {
            id: 'data',
            label: t('actW.legend.data'),
            x: Array.from(ph),
            y: Array.from(m.data.flux),
            color: COLOR.grey,
            mode: 'points',
            radius: 1.8,
          },
        ],
      };
    } else {
      spec = {
        xTitle: t('actW.axis.time'),
        yTitle: t('actW.axis.flux'),
        xRange: [0, m.days],
        series: [
          {
            id: 'data',
            label: t('actW.legend.data'),
            x: Array.from(m.data.t),
            y: Array.from(m.data.flux),
            color: COLOR.grey,
            mode: 'points',
            radius: 1.8,
          },
          {
            id: 'model',
            label: t('actW.legend.model'),
            x: Array.from(m.data.t),
            y: Array.from(m.data.truth.spotted),
            color: COLOR.blue,
            width: 2,
            mode: 'line',
          },
        ],
      };
    }
    spec.label = t('actW.s.title');
    hostOf(canvas, t('actW.s.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = spotsView(v);
    const rot = m.rotation;
    const rows = [
      { label: t('actW.s.row.model'), value: t('actW.s.m.spots') },
      {
        label: t('actW.s.row.amp'),
        value: t('actW.s.v.amp', { a: pct(m.amplitude, 1) }),
      },
      ...periodRows(rot, {
        period: t('actW.s.row.period'),
        alias: t('actW.s.row.alias'),
      }),
      {
        label: t('actW.s.row.spot'),
        value: t('actW.s.v.spot', {
          p: fixed(m.spotPeriod, 2),
          e: fixed(m.periodEq, 2),
          q: fixed(m.periodAt60, 2),
        }),
      },
      { label: t('actW.s.row.assumes'), value: t('actW.s.a.spots') },
    ];
    return rows;
  },
};

// ----------------------------------------------------------------------------
// activity-period
// ----------------------------------------------------------------------------
const PERIOD = {
  id: 'activity-period',
  get title() {
    return t('actW.r.title');
  },
  get note() {
    return t('actW.r.note');
  },
  animated: false,
  controls: [
    choice('star', 'actW.r.control.star', 'actW.r.star', 2),
    choice('view', 'actW.r.control.view', 'actW.r.view', 4),
  ],
  draw(canvas, v) {
    last = { redraw: () => PERIOD.draw(canvas, v) };
    const m = rotationView(v);
    const label = t('actW.r.title');
    if (!m) {
      hostOf(canvas, label).chart.draw({
        label,
        xTitle: t('actW.axis.time'),
        yTitle: t('actW.axis.flux'),
        series: [],
      });
      return null;
    }
    const view = Math.round(v.view ?? 0);
    const rot = m.rotation;
    let spec;
    if (view === 1) {
      spec = {
        ...periodView(v, m),
        xRange: [0.5, m.star.maxPeriod],
        yRange: [0, 1.02],
      };
    } else if (view >= 2) {
      const P = (rot.period ?? 1) * (view === 3 ? 2 : 1);
      spec = {
        xTitle: t('actW.axis.phase'),
        yTitle: t('actW.axis.flux'),
        xRange: [0, 1],
        series: [
          {
            id: 'data',
            label: t('actW.legend.data'),
            x: Array.from(foldPhase(m.t, P, m.t[0])),
            y: Array.from(m.y),
            color: COLOR.grey,
            mode: 'points',
            radius: 1.8,
          },
        ],
      };
    } else {
      spec = {
        xTitle: t('actW.axis.time'),
        yTitle: t('actW.axis.flux'),
        series: [
          {
            id: 'data',
            label: t('actW.legend.data'),
            x: thin(m.t, 900),
            y: thin(m.y, 900),
            color: COLOR.grey,
            mode: 'points',
            radius: 1.8,
          },
        ],
      };
    }
    spec.label = label;
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = rotationView(v);
    if (!m) return [waitingRow()];
    const rot = m.rotation;
    const span = m.t[m.t.length - 1] - m.t[0];
    const rows = [
      {
        label: t('actW.r.row.data'),
        value: t('actW.r.v.data', { n: m.t.length, d: fixed(span, 1) }),
      },
      ...periodRows(rot, {
        period: t('actW.r.row.period'),
        alias: t('actW.r.row.alias'),
      }),
    ];
    if (rot.cycles !== null)
      rows.push({
        label: t('actW.r.row.cycles'),
        value: t('actW.r.v.cycles', { c: fixed(rot.cycles, 1) }),
      });
    if (rot.amplitude !== null)
      rows.push({
        label: t('actW.r.row.amp'),
        value: t('actW.r.v.amp', { a: pct(rot.amplitude, 1) }),
      });
    if (rot.peak)
      rows.push({
        label: t('actW.r.row.fap'),
        value:
          rot.peak.fap < 1e-300
            ? t('actW.r.v.fapBelow')
            : t('actW.r.v.fap', { x: scientific(rot.peak.fap, 2) }),
      });
    rows.push({
      label: t('actW.r.row.paper'),
      value: m.star.published
        ? t('actW.r.v.paper', {
            p: fixed(m.star.published, 2),
            s: fixed(m.star.publishedSigma, 2),
          })
        : t('actW.r.v.nopaper'),
    });
    rows.push({ label: t('actW.r.row.assumes'), value: t('actW.r.a.curve') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// activity-flares
// ----------------------------------------------------------------------------
const FLARES = {
  id: 'activity-flares',
  get title() {
    return t('actW.f.title');
  },
  get note() {
    return t('actW.f.note');
  },
  animated: false,
  controls: [
    choice('view', 'actW.f.control.view', 'actW.f.view', 2),
    numeric('day', 'actW.f.control.day', 0, 27, 1, 9, x => fixed(x, 0)),
    numeric('flare', 'actW.f.control.flare', 1, 76, 1, 1, x => fixed(x, 0)),
  ],
  draw(canvas, v) {
    last = { redraw: () => FLARES.draw(canvas, v) };
    const m = flareView(v);
    const label = t('actW.f.title');
    if (!m) {
      hostOf(canvas, label).chart.draw({
        label,
        xTitle: t('actW.axis.time'),
        yTitle: t('actW.axis.flux'),
        series: [],
      });
      return null;
    }
    const t0 = m.window[0];
    const rel = a => Array.from(a, x => x - t0);
    const series = [
      {
        id: 'data',
        label: t('actW.legend.data'),
        x: rel(m.t),
        y: m.flux,
        color: COLOR.grey,
        mode: 'points',
        radius: 1.6,
      },
      {
        id: 'quiet',
        label: t('actW.legend.quiet'),
        x: rel(m.t),
        y: m.quiet,
        color: COLOR.blue,
        width: 2,
        mode: 'line',
      },
    ];
    if (m.flares.length)
      series.push({
        id: 'flares',
        label: t('actW.legend.flares'),
        x: m.flares.map(f => f.tPeak - t0),
        y: m.flares.map(f => {
          const i = m.t.findIndex(x => x >= f.tPeak - 1e-9);
          return i >= 0 ? m.flux[i] : 1;
        }),
        color: COLOR.orange,
        mode: 'points',
        radius: 4,
      });
    const spec = {
      label,
      xTitle: t('actW.axis.time'),
      yTitle: t('actW.axis.flux'),
      xRange: [0, m.window[1] - m.window[0]],
      series,
    };
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = flareView(v);
    if (!m) return [waitingRow()];
    const rows = [
      {
        label: t('actW.f.row.rule'),
        value: t('actW.f.v.rule', {
          n: m.total,
          d: fixed(m.days, 1),
          s: '3',
          sig: pct(m.sigma, 3),
        }),
      },
      {
        label: t('actW.f.row.window'),
        value: t('actW.f.v.window', { n: m.flares.length }),
      },
    ];
    const list = m.view === 1 ? [m.one] : m.flares;
    if (!list.length) rows.push({ label: t('actW.f.row.none'), value: '' });
    for (const f of list) {
      rows.push({
        label: t('actW.f.row.ed'),
        value: t('actW.f.v.ed', { e: fixed(f.ed, 1), s: fixed(f.edSigma, 1) }),
        emphasis: true,
      });
      if (m.view === 1) {
        rows.push({
          label: t('actW.f.row.amp'),
          value: t('actW.f.v.amp', { a: pct(f.amp, 2) }),
        });
        rows.push({
          label: t('actW.f.row.half'),
          value: t('actW.f.v.half', { h: fixed(f.fwhm * 1440, 0) }),
        });
        if (f.fit)
          rows.push({
            label: t('actW.f.row.fit'),
            value: t('actW.f.v.fit', {
              c: fixed(f.fit.chi2, 0),
              d: fixed(f.fit.dof, 0),
            }),
          });
      }
    }
    rows.push({ label: t('actW.f.row.assumes'), value: t('actW.f.a.rule') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// activity-ffd
// ----------------------------------------------------------------------------
const FFD = {
  id: 'activity-ffd',
  get title() {
    return t('actW.d.title');
  },
  get note() {
    return t('actW.d.note');
  },
  animated: false,
  controls: [
    choice('source', 'actW.d.control.source', 'actW.d.source', 2),
    choice('floor', 'actW.d.control.floor', 'actW.d.floor', 3),
  ],
  draw(canvas, v) {
    last = { redraw: () => FFD.draw(canvas, v) };
    const m = ffdView(v);
    const label = t('actW.d.title');
    if (!m) {
      hostOf(canvas, label).chart.draw({
        label,
        xTitle: t('actW.axis.logEd'),
        yTitle: t('actW.axis.logRate'),
        series: [],
      });
      return null;
    }
    const series = [
      {
        id: 'cum',
        label: t('actW.legend.cum'),
        x: m.cum.map(p => Math.log10(p.ed)),
        y: m.cum.map(p => Math.log10(p.rate)),
        color: COLOR.grey,
        mode: 'points',
        radius: 2.5,
      },
    ];
    if (m.fit) {
      const hi = Math.log10(m.cum[0].ed);
      const lo = Math.log10(m.edMin);
      series.push({
        id: 'law',
        label: t('actW.legend.law'),
        x: [lo, hi],
        y: [Math.log10(lawRate(m, m.edMin)), Math.log10(lawRate(m, 10 ** hi))],
        color: COLOR.orange,
        width: 2,
        mode: 'line',
      });
    }
    const spec = {
      label,
      xTitle: t('actW.axis.logEd'),
      yTitle: t('actW.axis.logRate'),
      series,
    };
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = ffdView(v);
    if (!m) return [waitingRow()];
    const rows = [
      {
        label: t('actW.d.row.found'),
        value: t('actW.d.v.found', { n: m.flares, d: fixed(m.days, 1) }),
      },
    ];
    if (!m.fit) {
      rows.push({ label: t('actW.d.row.none'), value: '', emphasis: true });
    } else {
      rows.push({
        label: t('actW.d.row.floor'),
        value: t('actW.d.v.floor', { e: fixed(m.edMin, 1), n: m.fit.n }),
      });
      rows.push({
        label: t('actW.d.row.alpha'),
        value: t('actW.d.v.alpha', {
          a: fixed(m.fit.alpha, 2),
          lo: fixed(m.fit.interval[0], 2),
          hi: fixed(m.fit.interval[1], 2),
        }),
        emphasis: true,
      });
    }
    if (m.truth)
      rows.push({
        label: t('actW.d.row.truth'),
        value: t('actW.d.v.truth', {
          a: fixed(m.truth.alpha, 2),
          n: m.truth.injected,
        }),
      });
    rows.push({ label: t('actW.d.row.assumes'), value: t('actW.d.a.law') });
    return rows;
  },
};

export const ACTIVITY_WIDGETS = [SPOTS, PERIOD, FLARES, FFD];
void curvesIn;
