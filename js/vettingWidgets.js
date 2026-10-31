// =============================================================================
// The vetting panel (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// One panel in a lazy family. `vetting-checklist` vets a synthetic candidate: the three
// tests as a checklist (odd and even depths, a second eclipse half an orbit later, and
// where the light dips on the frames), each with its verdict, its reason and its numbers,
// the overall in three words that never include "planet", the rates the committed
// thresholds give on seeded ensembles, and the record the summary makes. The plots sit behind
// a control that opens with the panel. "Inconclusive" is an answer of its own, shown as one.
//
// Nothing is calculated here: every number is js/vettingField.js's, over js/kernels/vetting/.
// Every candidate is synthetic and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_VETTING } from './i18n/en.vetting.js';
import { ES_VETTING } from './i18n/es.vetting.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { PRESETS, runOf, plotsOf, ratesOf } from './vettingField.js';

registerMessages('en', EN_VETTING);
registerMessages('es', ES_VETTING);

const COLOR = { blue: '#1c7ed6', orange: '#e8590c', grey: '#495057' };
const pct = x =>
  fixed(100 * x, Math.abs(x) < 1e-3 ? 4 : Math.abs(x) < 0.1 ? 3 : 2);
const zero = x => fixed(100 * x, x > 0 && x < 0.01 ? 1 : 0);

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
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 4),
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
  format: x => t(x >= 0.5 ? 'vetW.on' : 'vetW.off'),
});

const verdictWord = v => t(`vetW.verdict.${v === 'not-run' ? 'notRun' : v}`);

function plotSpec(i, view) {
  const p = plotsOf(i);
  if (view === 2) {
    if (!p.centroid)
      return { xTitle: t('vetW.axis.x'), yTitle: t('vetW.axis.y'), series: [] };
    const c = p.centroid;
    const series = [
      {
        id: 'target',
        label: t('vetW.legend.target'),
        x: [c.target.x],
        y: [c.target.y],
        color: COLOR.blue,
        mode: 'points',
        radius: 5,
      },
      {
        id: 'dic',
        label: t('vetW.legend.dic'),
        x: [c.dic.x],
        y: [c.dic.y],
        color: COLOR.orange,
        mode: 'points',
        radius: 5,
      },
    ];
    return {
      xTitle: t('vetW.axis.x'),
      yTitle: t('vetW.axis.y'),
      xRange: [4, 13],
      yRange: [4, 13],
      series,
    };
  }
  const mk = (id, label, d, color) => ({
    id,
    label,
    x: d.x,
    y: d.y,
    color,
    mode: 'points',
    radius: 3,
  });
  const series =
    view === 0
      ? [
          mk('odd', t('vetW.legend.odd'), p.oddEven.odd, COLOR.blue),
          mk('even', t('vetW.legend.even'), p.oddEven.even, COLOR.orange),
        ]
      : [mk('half', t('vetW.legend.half'), p.secondary, COLOR.grey)];
  const all = series.flatMap(s => s.y);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.15 || 1e-3;
  return {
    xTitle: t('vetW.axis.offset'),
    yTitle: t('vetW.axis.flux'),
    xRange: [-1.5, 1.5],
    yRange: [lo - pad, hi + pad],
    series,
  };
}

const CHECKLIST = {
  id: 'vetting-checklist',
  get title() {
    return t('vetW.title');
  },
  get note() {
    return t('vetW.note');
  },
  animated: false,
  controls: [
    {
      id: 'candidate',
      get label() {
        return t('vetW.control.candidate');
      },
      min: 0,
      max: PRESETS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      // One letter: a long value would take the slider's room on a phone.
      format: x =>
        String.fromCharCode(
          65 + Math.max(0, Math.min(PRESETS.length - 1, Math.round(x)))
        ),
    },
    toggle('plots', 'vetW.control.plots', 1),
    {
      id: 'view',
      get label() {
        return t('vetW.control.view');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`vetW.view.${Math.max(0, Math.min(2, Math.round(x)))}`),
    },
    toggle('truth', 'vetW.control.truth'),
  ],
  draw(canvas, v) {
    const spec = {
      label: t('vetW.title'),
      ...plotSpec(Math.round(v.candidate ?? 0), Math.round(v.view ?? 0)),
    };
    const h = hostOf(canvas, t('vetW.title'));
    const show = Math.round(v.plots ?? 0) === 1;
    h.el.hidden = !show;
    if (show) h.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const i = Math.round(v.candidate ?? 0);
    const r = runOf(i);
    const s = r.summary;
    const o = s.tests.oddEven;
    const sc = s.tests.secondary;
    const c = s.tests.centroid;
    const rows = [
      {
        label: t('vetW.row.candidate'),
        value: t('vetW.v.candidate', {
          c: t(`vetW.cand.${i}`),
          n: r.series.t.length,
          s: pct(r.preset.sigma),
          p: fixed(r.series.ephemeris.P, 1),
          f: r.frames
            ? t('vetW.v.frames', { n: r.frames.images.length })
            : t('vetW.v.noFrames'),
        }),
      },
      {
        label: t('vetW.row.oddEven'),
        value: Number.isFinite(o.difference)
          ? t('vetW.v.oddEven', {
              v: verdictWord(o.verdict),
              r: t(`vetW.reason.${o.reason}`),
              a: pct(o.odd.depth),
              b: pct(o.even.depth),
              d: pct(o.difference),
              s: pct(o.sigma),
              z: fixed(o.z, 1),
              m: pct(o.minDetectableDifference),
              q: fixed(100 * (o.minDetectableDifference / o.meanDepth), 0),
            })
          : t('vetW.v.oddEvenNone', {
              v: verdictWord(o.verdict),
              r: t(`vetW.reason.${o.reason}`),
            }),
        emphasis: true,
      },
      {
        label: t('vetW.row.secondary'),
        value:
          Number.isFinite(sc.depth) && Number.isFinite(sc.ratio)
            ? t('vetW.v.secondary', {
                v: verdictWord(sc.verdict),
                r: t(`vetW.reason.${sc.reason}`),
                d: pct(sc.depth),
                s: pct(sc.sigma),
                u: pct(sc.upperLimit),
                q: fixed(100 * (sc.upperLimit / sc.primary.depth), 0),
              })
            : t('vetW.v.secondaryNone', {
                v: verdictWord(sc.verdict),
                r: t(`vetW.reason.${sc.reason}`),
              }),
        emphasis: true,
      },
      {
        label: t('vetW.row.centroid'),
        value: !c
          ? t('vetW.v.centroidNotRun')
          : c.offset
            ? t('vetW.v.centroid', {
                v: verdictWord(c.verdict),
                r: t(`vetW.reason.${c.reason}`),
                d: fixed(Math.hypot(c.offset.dx, c.offset.dy), 2),
                z: fixed(c.r, 1),
                x: fixed(c.exclusionRadius, 2),
              })
            : t('vetW.v.centroidNone', {
                v: verdictWord(c.verdict),
                r: t(`vetW.reason.${c.reason}`),
              }),
        emphasis: true,
      },
      {
        label: t('vetW.row.overall'),
        value: t(`vetW.overall.${s.overall}`),
        emphasis: true,
      },
    ];
    const R = ratesOf();
    rows.push({
      label: t('vetW.row.rates'),
      value: t('vetW.v.rates', {
        a: zero(R.oddEven.planet.fail / R.oddEven.planet.n),
        b: zero(R.secondary.planet.fail / R.secondary.planet.n),
        c: zero(R.oddEven.blendAlternating.pass / R.oddEven.blendAlternating.n),
        d: zero(R.secondary.binary.pass / R.secondary.binary.n),
        e: zero(R.frames.onTarget.fail / R.frames.onTarget.n),
        f: zero(R.frames.blend.pass / R.frames.blend.n),
      }),
    });
    const kinds = [
      ...new Set(r.record.quantities.map(q => q.uncertainty.kind)),
    ].join(', ');
    rows.push({
      label: t('vetW.row.record'),
      value: t('vetW.v.record', { n: r.record.quantities.length, k: kinds }),
    });
    if (Math.round(v.truth ?? 0) === 1)
      rows.push({
        label: t('vetW.row.truth'),
        value: t(`vetW.truth.${r.preset.id}`),
      });
    rows.push({ label: t('vetW.row.assumes'), value: t('vetW.a') });
    return rows;
  },
};

export const VETTING_WIDGETS = [CHECKLIST];
