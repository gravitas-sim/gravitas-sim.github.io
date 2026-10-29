// =============================================================================
// The survey panels (Prompt 215, SURVEY_DESIGN.md)
// -----------------------------------------------------------------------------
// Three panels in one lazy family. `survey-tradeoff` shows the trade between depth
// and area at fixed time: the area surveyed and the sources found against the
// exposure, the best exposure and the sky-limited rule it undershoots.
// `survey-plan` evaluates a plan (facility, exposure, visits, nights, threshold)
// against a goal and draws a synthetic patch of what it would find.
// `survey-compare` gives the time two facilities need for the same goal.
//
// Nothing is calculated here: every number is js/surveyField.js's (over
// js/kernels/survey/), and tests/surveyLessons.test.js recomputes each one a lesson
// states. Every patch is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SURVEYDESIGN } from './i18n/en.surveyDesign.js';
import { ES_SURVEYDESIGN } from './i18n/es.surveyDesign.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  FACILITIES,
  CLASS_IDS,
  compareView,
  exposureOf,
  planView,
  tradeoffView,
} from './surveyDesignField.js';
import { skyLimitedRatio } from './kernels/survey/index.js';

registerMessages('en', EN_SURVEYDESIGN);
registerMessages('es', ES_SURVEYDESIGN);

const COLOR = {
  blue: '#1c7ed6',
  green: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
  grey: '#495057',
};

const hosts = new WeakMap();
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 240,
      legendMinHeight: 24,
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
  decimals: step < 1 ? (step < 0.1 ? 2 : 1) : 0,
  format,
});
const choice = (id, label, n, key, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: n - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(`${key}.${Math.max(0, Math.min(n - 1, Math.round(x)))}`),
});
const secs = x =>
  t('sdW.v.seconds', { t: fixed(exposureOf(x), exposureOf(x) < 100 ? 1 : 0) });
const big = x => (x >= 1e6 ? x.toExponential(2) : fixed(x, x >= 100 ? 0 : 1));

// ----------------------------------------------------------------------------
// survey-tradeoff
// ----------------------------------------------------------------------------
const TRADE = {
  id: 'survey-design-tradeoff',
  get title() {
    return t('sdW.t.title');
  },
  get note() {
    return t('sdW.t.note');
  },
  animated: false,
  controls: [
    choice(
      'facility',
      'sdW.t.control.facility',
      FACILITIES.length,
      'sdW.facility',
      1
    ),
    choice('cls', 'sdW.t.control.cls', CLASS_IDS.length, 'sdW.class', 0),
    {
      ...numeric(
        'logExposure',
        'sdW.t.control.exposure',
        0.5,
        3.5,
        0.05,
        2,
        secs
      ),
    },
    numeric('nights', 'sdW.t.control.nights', 1, 30, 1, 10, x =>
      t('sdW.v.nights', { n: fixed(x, 0) })
    ),
  ],
  draw(canvas, v) {
    const m = tradeoffView(v);
    const lx = p => Math.log10(p.exposure);
    const series = [
      {
        id: 'area',
        label: t('sdW.legend.area'),
        x: m.curve.map(lx),
        y: m.curve.map(p => Math.log10(p.area)),
        color: COLOR.blue,
        width: 2,
        mode: 'line',
      },
      {
        id: 'found',
        label: t('sdW.legend.found'),
        x: m.curve.map(lx),
        y: m.curve.map(p => Math.log10(Math.max(p.detected, 1))),
        color: COLOR.orange,
        width: 2,
        mode: 'line',
      },
      {
        id: 'chosen',
        label: t('sdW.legend.chosen'),
        x: [Math.log10(m.exposure)],
        y: [
          m.chosen.counts
            ? Math.log10(Math.max(m.chosen.counts.detected, 1))
            : 0,
        ],
        color: COLOR.green,
        mode: 'points',
        radius: 6,
      },
    ];
    if (m.best)
      series.push({
        id: 'best',
        label: t('sdW.legend.optimum'),
        x: [Math.log10(m.best.exposure)],
        y: [Math.log10(Math.max(m.best.detected, 1))],
        color: COLOR.violet,
        mode: 'points',
        radius: 5,
      });
    const spec = {
      label: t('sdW.t.title'),
      xTitle: t('sdW.axis.exposure'),
      yTitle: t('sdW.axis.logcount'),
      series,
    };
    hostOf(canvas, t('sdW.t.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = tradeoffView(v);
    const r = m.chosen;
    const s = m.setup;
    const rows = [
      { label: t('sdW.row.model'), value: t('sdW.m.trade') },
      {
        label: t('sdW.t.row.setup'),
        value: t('sdW.t.v.setup', {
          fwhm: fixed(s.fwhm, 2),
          sky: fixed(s.skyMag, 1),
          fov: fixed(s.fovDeg2, 2),
          oh: fixed(s.overhead, 0),
        }),
      },
    ];
    if (!r.ok || !r.counts) {
      rows.push({
        label: t('sdW.t.row.depth'),
        value: t(`sdW.reason.${r.code ?? 'outside-count-model'}`),
        emphasis: true,
      });
      return rows;
    }
    rows.push(
      {
        label: t('sdW.t.row.depth'),
        value: t('sdW.t.v.depth', {
          m: t('sdW.v.mag', { m: fixed(r.depth, 2) }),
        }),
        emphasis: true,
      },
      {
        label: t('sdW.t.row.area'),
        value: t('sdW.t.v.area', {
          a: big(r.areaDeg2),
          p: fixed(r.pointings, 0),
          t: fixed(m.exposure, m.exposure < 100 ? 1 : 0),
          o: fixed(m.setup.overhead, 0),
        }),
      },
      {
        label: t('sdW.t.row.found'),
        value: t('sdW.t.v.found', {
          n: big(r.counts.detected),
          s: big(Math.sqrt(r.counts.detected)),
        }),
        emphasis: true,
      }
    );
    if (m.best)
      rows.push({
        label: t('sdW.t.row.best'),
        value: Number.isFinite(m.optimum)
          ? t('sdW.t.v.best', {
              t: fixed(m.best.exposure, 0),
              r: fixed(m.optimum, 0),
            })
          : t('sdW.t.v.deepwins', { t: fixed(m.best.exposure, 0) }),
      });
    rows.push({
      label: t('sdW.t.row.rule'),
      value: t('sdW.t.v.rule', { b: fixed(m.beta, 2), a: fixed(m.alpha, 1) }),
    });
    rows.push({ label: t('sdW.row.assumes'), value: t('sdW.t.a') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// survey-plan
// ----------------------------------------------------------------------------
const PLAN = {
  id: 'survey-design-plan',
  get title() {
    return t('sdW.p.title');
  },
  get note() {
    return t('sdW.p.note');
  },
  animated: false,
  controls: [
    choice(
      'facility',
      'sdW.p.control.facility',
      FACILITIES.length,
      'sdW.facility',
      1
    ),
    choice('cls', 'sdW.p.control.cls', CLASS_IDS.length, 'sdW.class', 0),
    numeric('logExposure', 'sdW.p.control.exposure', 0.5, 3.5, 0.05, 2.5, secs),
    numeric('visits', 'sdW.p.control.visits', 1, 16, 1, 1, x => fixed(x, 0)),
    numeric('nights', 'sdW.p.control.nights', 1, 30, 1, 10, x =>
      t('sdW.v.nights', { n: fixed(x, 0) })
    ),
    numeric('threshold', 'sdW.p.control.threshold', 3, 7, 0.5, 5, x =>
      t('sdW.v.sigma', { s: fixed(x, 1) })
    ),
    numeric('goalDepth', 'sdW.p.control.depth', 18, 27, 0.1, 23, x =>
      t('sdW.v.mag', { m: fixed(x, 1) })
    ),
    numeric('logGoalArea', 'sdW.p.control.area', -1, 4.6, 0.1, 1, x =>
      t('sdW.v.deg2', { a: big(10 ** x) })
    ),
  ],
  draw(canvas, v) {
    const m = planView(v);
    const p = m.patch;
    const series = [];
    if (p) {
      const f = p.sources.filter(s => s.found);
      const x = p.sources.filter(s => !s.found);
      series.push(
        {
          id: 'found',
          label: t('sdW.legend.found2'),
          x: f.map(s => s.x),
          y: f.map(s => s.y),
          color: COLOR.green,
          mode: 'points',
          radius: 3,
        },
        {
          id: 'missed',
          label: t('sdW.legend.missed'),
          x: x.map(s => s.x),
          y: x.map(s => s.y),
          color: COLOR.grey,
          mode: 'points',
          radius: 2,
        }
      );
      if (p.falseSources.length)
        series.push({
          id: 'false',
          label: t('sdW.legend.false'),
          x: p.falseSources.map(s => s.x),
          y: p.falseSources.map(s => s.y),
          color: COLOR.orange,
          mode: 'points',
          radius: 4,
        });
    }
    const spec = {
      label: t('sdW.p.title'),
      xTitle: t('sdW.axis.patchx'),
      yTitle: t('sdW.axis.patchy'),
      xRange: [0, 1],
      yRange: [0, 1],
      series,
    };
    hostOf(canvas, t('sdW.p.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = planView(v);
    const r = m.result;
    const rows = [
      { label: t('sdW.row.model'), value: t('sdW.m.trade') },
      { label: t('sdW.p.row.source'), value: t('sdW.p.v.source') },
    ];
    if (!r.ok) {
      rows.push({
        label: t('sdW.p.row.verdict'),
        value: t('sdW.p.v.not', { why: r.code }),
        emphasis: true,
      });
      return rows;
    }
    rows.push(
      {
        label: t('sdW.p.row.depth'),
        value: t('sdW.p.v.depth', {
          m: t('sdW.v.mag', { m: fixed(r.depth, 2) }),
          m5: t('sdW.v.mag', { m: fixed(r.depth5, 2) }),
        }),
        emphasis: true,
      },
      {
        label: t('sdW.p.row.area'),
        value: t('sdW.p.v.area', {
          a: big(r.areaDeg2),
          p: fixed(r.pointings, 0),
          v: fixed(m.plan.visits, 0),
          t: fixed(exposureOf(v.logExposure ?? 2.5), 0),
          u: fixed(r.secondsUsed / 3600, 1),
          h: fixed(r.secondsAvailable / 3600, 1),
        }),
      }
    );
    if (r.counts) {
      rows.push(
        {
          label: t('sdW.p.row.found'),
          value: t('sdW.p.v.found', {
            n: big(r.counts.detected),
            lo: big(r.counts.interval68.lo),
            hi: big(r.counts.interval68.hi),
            s: big(r.counts.sharp),
          }),
          emphasis: true,
        },
        {
          label: t('sdW.p.row.dens'),
          value: t('sdW.p.v.dens', { n: big(r.counts.perDeg2.detected) }),
          emphasis: true,
        },
        {
          label: t('sdW.p.row.false'),
          value:
            t('sdW.p.v.false', {
              n: big(r.counts.falsePositives),
              r: fixed(100 * r.counts.reliability, 1),
            }) + (r.counts.unreliable ? t('sdW.p.v.unreliable') : ''),
        }
      );
    }
    rows.push({
      label: t('sdW.p.row.verdict'),
      value: m.verdict.feasible
        ? t('sdW.p.v.feasible')
        : t('sdW.p.v.not', {
            why: m.verdict.reasons.map(c => t(`sdW.reason.${c}`)).join('; '),
          }),
      emphasis: true,
    });
    if (m.patch)
      rows.push({
        label: t('sdW.p.row.patch'),
        value: t('sdW.p.v.patch', {
          a: fixed(Math.sqrt(m.patch.areaDeg2) * 60, 1),
          n: m.patch.found,
          s: m.patch.sources.length,
          e: fixed(m.patch.areaDeg2 * (r.counts?.perDeg2.detected ?? 0), 0),
        }),
      });
    rows.push({ label: t('sdW.row.assumes'), value: t('sdW.p.a') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// survey-compare
// ----------------------------------------------------------------------------
const COMPARE = {
  id: 'survey-design-compare',
  get title() {
    return t('sdW.c.title');
  },
  get note() {
    return t('sdW.c.note');
  },
  animated: false,
  controls: [
    choice(
      'facilityA',
      'sdW.c.control.a',
      FACILITIES.length,
      'sdW.facility',
      1
    ),
    choice(
      'facilityB',
      'sdW.c.control.b',
      FACILITIES.length,
      'sdW.facility',
      2
    ),
    numeric('logExposure', 'sdW.c.control.exposure', 0.5, 3.5, 0.05, 2, secs),
    numeric('goalDepth', 'sdW.c.control.depth', 18, 27, 0.1, 23, x =>
      t('sdW.v.mag', { m: fixed(x, 1) })
    ),
    numeric('logGoalArea', 'sdW.c.control.area', -1, 4.6, 0.1, 1, x =>
      t('sdW.v.deg2', { a: big(10 ** x) })
    ),
  ],
  draw(canvas, v) {
    const m = compareView(v);
    const { a, b } = m.result;
    const pts = [a, b].map((r, i) =>
      r?.ok && Number.isFinite(r.seconds)
        ? { x: i, y: Math.log10(r.seconds / 3600) }
        : null
    );
    const series = pts
      .map((p, i) =>
        p
          ? {
              id: `p${i}`,
              label: t(
                `sdW.facility.${Math.round(i === 0 ? (v.facilityA ?? 1) : (v.facilityB ?? 2))}`
              ),
              x: [p.x],
              y: [p.y],
              color: i ? COLOR.orange : COLOR.blue,
              mode: 'points',
              radius: 8,
            }
          : null
      )
      .filter(Boolean);
    const spec = {
      label: t('sdW.c.title'),
      xTitle: t('sdW.axis.facility'),
      yTitle: t('sdW.axis.hours'),
      xRange: [-0.5, 1.5],
      series,
    };
    hostOf(canvas, t('sdW.c.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = compareView(v);
    const { a, b, ok } = m.result;
    const line = r =>
      r?.ok && Number.isFinite(r.seconds)
        ? t('sdW.c.v.each', {
            v: fixed(r.visits, 0),
            t: fixed(m.exposure, 0),
            p: big(r.pointings),
            h: big(r.seconds / 3600),
            n: big(r.nights),
          })
        : t('sdW.c.v.cannot', {
            why: (r?.reasons ?? ['refused'])
              .map(c => t(`sdW.reason.${c === 'saturates' ? 'saturates2' : c}`))
              .join('; '),
          });
    const rows = [
      { label: t('sdW.row.model'), value: t('sdW.m.trade') },
      { label: t('sdW.c.row.a'), value: line(a), emphasis: true },
      { label: t('sdW.c.row.b'), value: line(b), emphasis: true },
    ];
    if (ok && Number.isFinite(m.result.timeRatio)) {
      rows.push(
        {
          label: t('sdW.c.row.ratio'),
          value: t('sdW.c.v.ratio', {
            r: fixed(m.result.timeRatio, m.result.timeRatio < 1 ? 3 : 2),
          }),
          emphasis: true,
        },
        {
          label: t('sdW.c.row.rate'),
          value: t('sdW.c.v.rate', {
            a: fixed(a.ratePerHour, 2),
            b: fixed(b.ratePerHour, 2),
          }),
        },
        {
          label: t('sdW.c.row.rule'),
          value: t('sdW.c.v.rule', { r: fixed(skyLimitedRatio(m.a, m.b), 3) }),
        }
      );
    }
    rows.push({ label: t('sdW.row.assumes'), value: t('sdW.c.a') });
    return rows;
  },
};

export const SURVEY_DESIGN_WIDGETS = [TRADE, PLAN, COMPARE];
