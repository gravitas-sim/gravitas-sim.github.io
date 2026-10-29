// =============================================================================
// The strategy panels (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// Two panels in one lazy family. `strategy-window` shows the window function of a
// cadence through the plot component: the periodogram a perfect signal at the true
// frequency gives at your epochs, the aliases the kernel predicts, the verdict
// (resolved, ambiguous, not constrained) and the phase coverage, and, when asked,
// the synthetic series those epochs would produce with the period the search finds
// in it. `strategy-plan` plans the nights: the observing-window planner's usable
// stretch for a target from a library facility, visits placed in it, the weather
// losing whole nights from a seeded draw, the cost in hours, and the same series.
//
// Nothing is calculated here: every number is js/strategyField.js's (over
// js/kernels/strategy/), and tests/strategyLessons.test.js recomputes each one a
// lesson states. Every series is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_STRATEGY } from './i18n/en.strategy.js';
import { ES_STRATEGY } from './i18n/es.strategy.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  CADENCES,
  SITES,
  TARGETS,
  windowView,
  planView,
} from './strategyField.js';

registerMessages('en', EN_STRATEGY);
registerMessages('es', ES_STRATEGY);

const COLOR = {
  blue: '#1c7ed6',
  green: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
  grey: '#495057',
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

const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
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

// ----------------------------------------------------------------------------
// strategy-window
// ----------------------------------------------------------------------------
const WINDOW = {
  id: 'strategy-window',
  get title() {
    return t('strW.w.title');
  },
  get note() {
    return t('strW.w.note');
  },
  animated: false,
  controls: [
    {
      id: 'cadence',
      get label() {
        return t('strW.w.control.cadence');
      },
      min: 0,
      max: CADENCES.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`strW.cadence.${idx(x, CADENCES.length)}`),
    },
    numeric('period', 'strW.w.control.period', 0.3, 5, 0.05, 0.8, x =>
      t('strW.v.days', { p: fixed(x, 2) })
    ),
    numeric('nights', 'strW.w.control.nights', 10, 60, 1, 40, x => fixed(x, 0)),
    numeric('snr', 'strW.w.control.snr', 1, 10, 0.5, 5, x =>
      t('strW.v.snr', { s: fixed(x, 1) })
    ),
    {
      id: 'series',
      get label() {
        return t('strW.w.control.series');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(x >= 0.5 ? 'strW.on' : 'strW.off'),
    },
  ],
  draw(canvas, v) {
    const m = windowView(v);
    const series = [
      {
        id: 'response',
        label: t('strW.legend.response'),
        x: Array.from(m.grid),
        y: Array.from(m.response),
        color: COLOR.blue,
        width: 2,
        mode: 'line',
      },
    ];
    if (m.series)
      series.push({
        id: 'series',
        label: t('strW.legend.series'),
        x: Array.from(m.series.grid, p => 1 / p),
        y: Array.from(m.series.spectrum),
        color: COLOR.orange,
        width: 1.5,
        mode: 'line',
      });
    series.push({
      id: 'true',
      label: t('strW.legend.true'),
      x: [m.f0],
      y: [1],
      color: COLOR.green,
      mode: 'points',
      radius: 6,
    });
    const al = m.verdict.aliases.filter(a => a.frequency <= 3.2).slice(0, 12);
    if (al.length)
      series.push({
        id: 'alias',
        label: t('strW.legend.alias'),
        x: al.map(a => a.frequency),
        y: al.map(a => a.power),
        color: COLOR.violet,
        mode: 'points',
        radius: 5,
      });
    const spec = {
      label: t('strW.w.title'),
      xTitle: t('strW.axis.freq'),
      yTitle: t('strW.axis.power'),
      xRange: [0, 3.2],
      yRange: [0, 1.05],
      series,
    };
    hostOf(canvas, t('strW.w.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = windowView(v);
    const vd = m.verdict;
    const rows = [
      { label: t('strW.row.model'), value: t('strW.m.window') },
      {
        label: t('strW.row.epochs'),
        value: t('strW.v.epochs', {
          n: m.times.length,
          T: fixed(m.baseline, 1),
          r: fixed(m.resolution, 3),
        }),
      },
    ];
    const x = vd.worst
      ? fixed(vd.worst.dchi2, vd.worst.dchi2 < 0.05 ? 0 : 1)
      : '';
    rows.push({
      label: t('strW.row.verdict'),
      value: t(`strW.verdict.${vd.verdict}`, {
        x,
        p: vd.worst ? fixed(vd.worst.period, 3) : '',
        why: vd.reason ?? '',
      }),
      emphasis: true,
    });
    vd.aliases.slice(0, 3).forEach((a, i) =>
      rows.push({
        label: t('strW.row.alias', { k: i + 1 }),
        value: t('strW.v.alias', {
          p: fixed(a.period, 3),
          h: fixed(100 * a.power, 0),
          x: fixed(a.dchi2, a.dchi2 < 0.05 ? 0 : 1),
        }),
      })
    );
    if (m.coverage)
      rows.push({
        label: t('strW.row.coverage'),
        value: t('strW.v.coverage', {
          c: m.coverage.covered,
          g: fixed(m.coverage.largestGap, 3),
        }),
      });
    rows.push({
      label: t('strW.row.series'),
      value: m.series
        ? t('strW.v.series', {
            p: fixed(m.series.period, 4),
            s: fixed(m.series.sigmaPeriod, 4),
            w: t(
              m.series.rightLobe ? 'strW.series.right' : 'strW.series.wrong'
            ),
          })
        : t('strW.series.off'),
      emphasis: !!m.series,
    });
    rows.push({ label: t('strW.row.assumes'), value: t('strW.a.window') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// strategy-plan
// ----------------------------------------------------------------------------
const PLAN = {
  id: 'strategy-plan',
  get title() {
    return t('strW.p.title');
  },
  get note() {
    return t('strW.p.note');
  },
  animated: false,
  controls: [
    {
      id: 'site',
      get label() {
        return t('strW.p.control.site');
      },
      min: 0,
      max: SITES.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`strW.site.${idx(x, SITES.length)}`),
    },
    {
      id: 'target',
      get label() {
        return t('strW.p.control.target');
      },
      min: 0,
      max: TARGETS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`strW.target.${idx(x, TARGETS.length)}`),
    },
    numeric('nights', 'strW.p.control.nights', 5, 45, 1, 14, x => fixed(x, 0)),
    numeric('perNight', 'strW.p.control.perNight', 1, 6, 1, 3, x =>
      fixed(x, 0)
    ),
    numeric('spacing', 'strW.p.control.spacing', 0.5, 4, 0.5, 1.5, x =>
      t('strW.v.hours', { h: fixed(x, 1) })
    ),
    numeric('exposure', 'strW.p.control.exposure', 30, 1200, 30, 300, x =>
      t('strW.v.seconds', { s: fixed(x, 0) })
    ),
    numeric('overhead', 'strW.p.control.overhead', 0, 300, 15, 60, x =>
      t('strW.v.seconds', { s: fixed(x, 0) })
    ),
    numeric('pClear', 'strW.p.control.pClear', 0.2, 1, 0.1, 0.6, x =>
      t('strW.v.percent', { p: fixed(100 * x, 0) })
    ),
    numeric('persistence', 'strW.p.control.persistence', 0, 0.9, 0.1, 0.5, x =>
      fixed(x, 1)
    ),
    numeric('seed', 'strW.p.control.seed', 0, 9, 1, 3, x =>
      t('strW.v.draw', { d: fixed(x, 0) })
    ),
    numeric('period', 'strW.p.control.period', 0.3, 5, 0.05, 0.8, x =>
      t('strW.v.days', { p: fixed(x, 2) })
    ),
    numeric('snr', 'strW.p.control.snr', 1, 10, 0.5, 5, x =>
      t('strW.v.snr', { s: fixed(x, 1) })
    ),
    {
      id: 'run',
      get label() {
        return t('strW.p.control.run');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(x >= 0.5 ? 'strW.on' : 'strW.off'),
    },
  ],
  draw(canvas, v) {
    const m = planView(v);
    const rows = m.rows;
    const have = rows.filter(r => r.opensH !== null);
    const k = r => r.index + 1;
    const mid = new Map(m.nights.map((n, i) => [i, n.midnightJd]));
    const point = ok => m.plan.visits.filter(x => x.executed === ok);
    const series = [
      {
        id: 'opens',
        label: t('strW.p.legend.opens'),
        x: have.map(k),
        y: have.map(r => r.opensH),
        color: COLOR.grey,
        width: 1.5,
        mode: 'line',
      },
      {
        id: 'closes',
        label: t('strW.p.legend.closes'),
        x: have.map(k),
        y: have.map(r => r.closesH),
        color: COLOR.violet,
        width: 1.5,
        mode: 'line',
      },
    ];
    const done = point(true);
    const lost = point(false);
    if (done.length)
      series.push({
        id: 'done',
        label: t('strW.p.legend.done'),
        x: done.map(x => x.night + 1),
        y: done.map(x => (x.jd - mid.get(x.night)) * 24),
        color: COLOR.green,
        mode: 'points',
        radius: 4,
      });
    if (lost.length)
      series.push({
        id: 'lost',
        label: t('strW.p.legend.lost'),
        x: lost.map(x => x.night + 1),
        y: lost.map(x => (x.jd - mid.get(x.night)) * 24),
        color: COLOR.orange,
        mode: 'points',
        radius: 4,
      });
    const spec = {
      label: t('strW.p.title'),
      xTitle: t('strW.p.axis.x'),
      yTitle: t('strW.p.axis.y'),
      xRange: [0, m.cfg.nights + 1],
      yRange: [-8, 8],
      series,
    };
    hostOf(canvas, t('strW.p.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = planView(v);
    const c = m.plan.cost;
    const rows = [{ label: t('strW.row.model'), value: t('strW.p.m') }];
    if (m.plan.reason && !m.plan.visits.length)
      rows.push({
        label: t('strW.p.row.empty'),
        value: t(`strW.p.empty.${m.plan.reason}`),
        emphasis: true,
      });
    rows.push(
      {
        label: t('strW.p.row.cost'),
        value: t('strW.p.v.cost', {
          r: fixed(c.requestedHours, 2),
          e: fixed(c.executedHours, 2),
          l: fixed(c.lostHours, 2),
          w: fixed(c.windowHours, 1),
        }),
        emphasis: true,
      },
      {
        label: t('strW.p.row.nights'),
        value: t('strW.p.v.nights', {
          o: c.nightsObserved,
          l: c.nightsLost,
          n: c.nightsAsked,
        }),
      },
      {
        label: t('strW.p.row.visits'),
        value: t('strW.p.v.visits', {
          x: c.visitsExecuted,
          p: c.visitsPlanned,
        }),
      }
    );
    m.rows.slice(0, 10).forEach(r =>
      rows.push({
        label: t('strW.p.row.night', { k: r.index + 1 }),
        value: t('strW.p.v.night', {
          a: r.opensH === null ? '-' : fixed(r.opensH, 1),
          b: r.closesH === null ? '-' : fixed(r.closesH, 1),
          x: t(
            `strW.p.night.${r.status === 'observed' || r.status === 'weather' ? r.status : r.status}`,
            {
              n: r.status === 'weather' ? r.planned : r.executed,
            }
          ),
        }),
      })
    );
    rows.push({
      label: t('strW.p.row.verdict'),
      value: m.verdict
        ? t(`strW.verdict.${m.verdict.verdict}`, {
            x: m.verdict.worst
              ? fixed(
                  m.verdict.worst.dchi2,
                  m.verdict.worst.dchi2 < 0.05 ? 0 : 1
                )
              : '',
            p: m.verdict.worst ? fixed(m.verdict.worst.period, 3) : '',
            why: m.verdict.reason ?? '',
          })
        : t('strW.p.v.noverdict'),
      emphasis: true,
    });
    if (m.series)
      rows.push({
        label: t('strW.p.row.series'),
        value: t('strW.v.series', {
          p: fixed(m.series.period, 4),
          s: fixed(m.series.sigmaPeriod, 4),
          w: t(m.series.rightLobe ? 'strW.series.right' : 'strW.series.wrong'),
        }),
        emphasis: true,
      });
    rows.push({ label: t('strW.row.assumes'), value: t('strW.p.a') });
    return rows;
  },
};

export const STRATEGY_WIDGETS = [WINDOW, PLAN];
