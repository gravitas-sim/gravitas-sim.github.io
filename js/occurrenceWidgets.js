// =============================================================================
// The occurrence panels (Prompt 229, OCCURRENCE_RATES.md)
// -----------------------------------------------------------------------------
// Two panels in a lazy family, over one synthetic searched population:
//   occurrence-efficiency  who the survey could have seen: the share of transiting planets the
//                          search recovers, by period for each radius bin, or the measured curve
//                          against the signal to noise with its analytic form
//   occurrence-grid        the rate of every bin of a radius from one population's listings: the
//                          rate and its interval, the upper limit of a bin with none, the bins
//                          that cannot be constrained, the stated reliability
//
// Nothing is calculated here: every number is js/occurrenceField.js's, over the occurrence kernel.
// The survey is synthetic and says so; the reliability is a stated input.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_OCCURRENCE } from './i18n/en.occurrence.js';
import { ES_OCCURRENCE } from './i18n/es.occurrence.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { analyticEfficiency } from './kernels/occurrence/index.js';
import {
  FLOOR,
  MIN_TRANSITS,
  PERIODS,
  RADII,
  SURVEY,
  THRESHOLD,
  binRecord,
  curvePoints,
  efficiencyRow,
  levelOf,
  modeOf,
  periodBin,
  periodMid,
  periodRange,
  radiusBin,
  radiusRange,
  radiusRow,
  radiusSum,
  seedOf,
  starsWithEpochs,
} from './occurrenceField.js';

registerMessages('en', EN_OCCURRENCE);
registerMessages('es', ES_OCCURRENCE);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
  purple: '#7048e8',
  red: '#c92a2a',
};
const RADIUS_COLORS = [
  COLOR.red,
  COLOR.orange,
  COLOR.green,
  COLOR.blue,
  COLOR.purple,
];

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
  format: x => t(x >= 0.5 ? 'occW.on' : 'occW.off'),
});

const stepControl = (id, label, max, value, format) => ({
  id,
  get label() {
    return t(label);
  },
  min: id === 'seed' ? 1 : 0,
  max,
  step: 1,
  value,
  decimals: 0,
  format,
});

const range = ([a, b]) =>
  `${fixed(a, a < 10 ? 1 : 0)} to ${fixed(b, b < 10 ? 1 : 0)}`;
const radiusLabel = k => range(radiusRange(k));
const periodLabel = j => range(periodRange(j));
const radiusControl = value =>
  stepControl('radius', 'occW.control.radius', RADII - 1, value, x =>
    radiusLabel(radiusBin(x))
  );
const periodControl = value =>
  stepControl('period', 'occW.control.period', PERIODS - 1, value, x =>
    periodLabel(periodBin(x))
  );
const rate = x => fixed(x, x >= 1 ? 2 : x >= 0.1 ? 3 : 4);

const EFFICIENCY = {
  id: 'occurrence-efficiency',
  get title() {
    return t('occW.eff.title');
  },
  get note() {
    return t('occW.eff.note');
  },
  animated: false,
  controls: [
    radiusControl(1),
    periodControl(2),
    stepControl('view', 'occW.control.view', 1, 0, x =>
      t(x >= 0.5 ? 'occW.view.curve' : 'occW.view.period')
    ),
  ],
  draw(canvas, v) {
    const k = radiusBin(v.radius);
    const j = periodBin(v.period);
    let spec;
    if (Math.round(v.view ?? 0) === 1) {
      const pts = curvePoints().filter(p => p.s <= 20);
      const xs = Array.from({ length: 81 }, (_, i) => (20 * i) / 80);
      spec = {
        label: t('occW.eff.title'),
        xTitle: t('occW.axis.snr'),
        yTitle: t('occW.axis.eff'),
        xRange: [0, 20],
        yRange: [0, 1],
        series: [
          {
            id: 'analytic',
            label: t('occW.legend.analytic'),
            x: xs,
            y: xs.map(s => analyticEfficiency(s)),
            color: COLOR.grey,
            dash: [4, 3],
          },
          {
            id: 'measured',
            label: t('occW.legend.measured'),
            x: pts.map(p => p.s),
            y: pts.map(p => p.p),
            color: COLOR.blue,
            mode: 'points',
            radius: 4,
          },
          {
            id: 'low',
            label: t('occW.legend.band'),
            x: pts.map(p => p.s),
            y: pts.map(p => p.low),
            color: COLOR.blue,
            width: 1,
          },
          {
            id: 'high',
            label: t('occW.legend.band'),
            x: pts.map(p => p.s),
            y: pts.map(p => p.high),
            color: COLOR.blue,
            width: 1,
          },
          {
            id: 'threshold',
            label: t('occW.legend.threshold'),
            x: [THRESHOLD, THRESHOLD],
            y: [0, 1],
            color: COLOR.orange,
          },
        ],
      };
    } else {
      const xs = Array.from({ length: PERIODS }, (_, i) =>
        Math.log10(periodMid(i))
      );
      const series = Array.from({ length: RADII }, (_, kk) => ({
        id: `radius${kk}`,
        label: t('occW.legend.radius', {
          a: fixed(radiusRange(kk)[0], 1),
          b: fixed(radiusRange(kk)[1], 0),
        }),
        x: xs,
        y: efficiencyRow(kk).map(e => e ?? 0),
        color: RADIUS_COLORS[kk],
        width: kk === k ? 3 : 1.5,
        mode: 'both',
        radius: 3,
      }));
      series.push({
        id: 'now',
        label: t('occW.legend.now'),
        x: [xs[j]],
        y: [efficiencyRow(k)[j] ?? 0],
        color: COLOR.grey,
        mode: 'points',
        radius: 6,
      });
      spec = {
        label: t('occW.eff.title'),
        xTitle: t('occW.axis.period'),
        yTitle: t('occW.axis.eff'),
        xRange: [xs[0] - 0.1, xs[xs.length - 1] + 0.1],
        yRange: [0, 1.02],
        series,
      };
    }
    const h = hostOf(canvas, t('occW.eff.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const k = radiusBin(v.radius);
    const j = periodBin(v.period);
    const E = SURVEY.E[j][k];
    const e = SURVEY.efficiency[j][k];
    return [
      {
        label: t('occW.row.survey'),
        value: t('occW.v.survey', {
          n: SURVEY.stars,
          k: SURVEY.injected,
          t: SURVEY.trials,
          s: fixed(THRESHOLD, 1),
          m: MIN_TRANSITS,
        }),
      },
      {
        label: t('occW.row.bin'),
        value: t('occW.v.bin', { r: radiusLabel(k), p: periodLabel(j) }),
      },
      {
        label: t('occW.row.efficiency'),
        value: t('occW.v.efficiency', {
          e: fixed(100 * (e ?? 0), 0),
          g: fixed(SURVEY.G[j][k], 1),
        }),
        emphasis: true,
      },
      {
        label: t('occW.row.completeness'),
        value:
          E < FLOOR
            ? t('occW.v.floor', { c: fixed(E, 2), f: FLOOR })
            : t('occW.v.completeness', {
                c: fixed(E, 1),
                f: fixed(starsWithEpochs(j), 0),
                m: MIN_TRANSITS,
              }),
        emphasis: true,
      },
      { label: t('occW.row.assumes'), value: t('occW.a') },
    ];
  },
};

const GRID = {
  id: 'occurrence-grid',
  get title() {
    return t('occW.grid.title');
  },
  get note() {
    return t('occW.grid.note');
  },
  animated: false,
  controls: [
    stepControl('seed', 'occW.control.seed', 12, 1, x => fixed(seedOf(x), 0)),
    radiusControl(0),
    periodControl(1),
    stepControl('level', 'occW.control.level', 1, 0, x =>
      t(levelOf(x) > 0.9 ? 'occW.level.95' : 'occW.level.68')
    ),
    stepControl('reliability', 'occW.control.reliability', 2, 1, x =>
      t(`occW.mode.${modeOf(x)}`)
    ),
    toggle('truth', 'occW.control.truth', 0),
  ],
  draw(canvas, v) {
    const opts = {
      seed: seedOf(v.seed),
      level: levelOf(v.level),
      mode: modeOf(v.reliability),
    };
    const k = radiusBin(v.radius);
    const j = periodBin(v.period);
    const row = radiusRow(opts, k);
    const xs = row.map((_, i) => Math.log10(periodMid(i)));
    const ok = row
      .map((r, i) => (r.status === 'ok' ? i : -1))
      .filter(i => i >= 0);
    const lim = row
      .map((r, i) => (r.status === 'upper-limit' ? i : -1))
      .filter(i => i >= 0);
    const series = [];
    if (Math.round(v.truth ?? 0) === 1)
      series.push({
        id: 'truth',
        label: t('occW.legend.truth'),
        x: xs,
        y: row.map(r => r.truth),
        color: COLOR.grey,
        dash: [4, 3],
      });
    if (ok.length) {
      series.push({
        id: 'rate',
        label: t('occW.legend.rate'),
        x: ok.map(i => xs[i]),
        y: ok.map(i => row[i].rate),
        color: COLOR.blue,
        mode: 'both',
        radius: 4,
      });
      series.push({
        id: 'lo',
        label: t('occW.legend.lo'),
        x: ok.map(i => xs[i]),
        y: ok.map(i => row[i].lo),
        color: COLOR.blue,
        width: 1,
        dash: [2, 3],
      });
      series.push({
        id: 'hi',
        label: t('occW.legend.hi'),
        x: ok.map(i => xs[i]),
        y: ok.map(i => row[i].hi),
        color: COLOR.blue,
        width: 1,
        dash: [2, 3],
      });
    }
    if (lim.length)
      series.push({
        id: 'limit',
        label: t('occW.legend.limit'),
        x: lim.map(i => xs[i]),
        y: lim.map(i => row[i].upperLimit),
        color: COLOR.orange,
        mode: 'points',
        radius: 4,
      });
    const here = row[j];
    const top = Math.max(0.05, ...series.flatMap(s => s.y));
    if (here.status === 'ok' || here.status === 'upper-limit')
      series.push({
        id: 'now',
        label: t('occW.legend.now'),
        x: [xs[j]],
        y: [here.status === 'ok' ? here.rate : here.upperLimit],
        color: COLOR.grey,
        mode: 'points',
        radius: 7,
      });
    const spec = {
      label: t('occW.grid.title'),
      xTitle: t('occW.axis.period'),
      yTitle: t('occW.axis.rate'),
      xRange: [xs[0] - 0.1, xs[xs.length - 1] + 0.1],
      yRange: [0, top * 1.12],
      series: series.length
        ? series
        : [
            {
              id: 'none',
              label: t('occW.legend.rate'),
              x: [xs[j]],
              y: [0],
              color: COLOR.grey,
              mode: 'points',
              radius: 3,
            },
          ],
    };
    const h = hostOf(canvas, t('occW.grid.title'));
    h.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const opts = {
      seed: seedOf(v.seed),
      level: levelOf(v.level),
      mode: modeOf(v.reliability),
    };
    const k = radiusBin(v.radius);
    const j = periodBin(v.period);
    const r = binRecord({ ...opts, j, k });
    const sum = radiusSum(radiusRow(opts, k));
    const lv = fixed(100 * r.level, 0);
    let rateText;
    if (r.status === 'ok')
      rateText =
        t('occW.v.rate', {
          v: rate(r.rate),
          lo: rate(r.lo),
          hi: rate(r.hi),
          lv: `${lv} %`,
          n: r.n,
        }) + (r.rate > 1 ? t('occW.v.rateAbove') : '');
    else if (r.status === 'upper-limit')
      rateText = t('occW.v.limit', { v: rate(r.upperLimit) });
    else rateText = t('occW.v.floor', { c: fixed(r.E, 2), f: FLOOR });
    const rows = [
      {
        label: t('occW.row.bin'),
        value: t('occW.v.bin', { r: radiusLabel(k), p: periodLabel(j) }),
      },
      {
        label: t('occW.row.listed'),
        value: t('occW.v.listed', { n: r.listed }),
      },
      {
        label: t('occW.row.completeness'),
        value: t('occW.v.completeness', {
          c: fixed(r.E, 1),
          f: fixed(starsWithEpochs(j), 0),
          m: MIN_TRANSITS,
        }),
      },
      {
        label: t('occW.row.reliability'),
        value: t('occW.v.reliability', {
          r: t(`occW.mode.${opts.mode}`),
          p: fixed(100 * r.reliability, 0),
        }),
      },
      { label: t('occW.row.rate'), value: rateText, emphasis: true },
      {
        label: t('occW.row.sum'),
        value: t('occW.v.sum', {
          s: rate(sum.sum),
          a: sum.rates,
          b: sum.limits,
          c: sum.unconstrained,
        }),
      },
    ];
    if (Math.round(v.truth ?? 0) === 1)
      rows.push({
        label: t('occW.row.truth'),
        value: t('occW.v.truth', {
          t: rate(r.truth),
          r: r.real,
          n: r.listed,
          f: r.falseListings,
        }),
      });
    rows.push({ label: t('occW.row.assumes'), value: t('occW.a') });
    return rows;
  },
};

export const OCCURRENCE_WIDGETS = [EFFICIENCY, GRID];
