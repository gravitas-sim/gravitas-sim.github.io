// =============================================================================
// The cluster-fit panel (Prompt 219, CLUSTER_FITTING.md)
// -----------------------------------------------------------------------------
// One panel in one lazy family: `cluster-fit` draws a synthetic cluster's
// colour-magnitude diagram through the plot component with the best isochrone
// over it, and reports the fitted age and distance modulus with their intervals,
// the age-distance correlation and what the fit assumed. Nothing is calculated
// here: every number is js/clusterFitField.js's, over js/kernels/clusters/.
// Every cluster is synthetic and says so; its truth is one switch away.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_CLUSTERLESSON } from './i18n/en.clusterLesson.js';
import { ES_CLUSTERLESSON } from './i18n/es.clusterLesson.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { clusterView, gyr } from './clusterFitField.js';

registerMessages('en', EN_CLUSTERLESSON);
registerMessages('es', ES_CLUSTERLESSON);

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 320,
      legendMinHeight: 24, // WCAG 2.2 target size: the legend toggles are controls
      // The magnitude axis runs upward in the data (negated) so that brighter is up.
      number: v => fixed(v < -5 ? -v : v, Math.abs(v) >= 5 ? 1 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}

const toggle = (id, label, onKey, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x =>
    t(onKey ? `${onKey}.${x >= 0.5 ? 1 : 0}` : x >= 0.5 ? 'clW.on' : 'clW.off'),
});

const CLUSTER_FIT = {
  id: 'cluster-fit',
  get title() {
    return t('clW.title');
  },
  get note() {
    return t('clW.note');
  },
  animated: false,
  controls: [
    {
      id: 'cluster',
      get label() {
        return t('clW.control.cluster');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`clW.cluster.${Math.round(x)}`),
    },
    {
      id: 'feh',
      get label() {
        return t('clW.control.feh');
      },
      min: -0.5,
      max: 0,
      step: 0.25,
      value: -0.25,
      decimals: 2,
      format: x => fixed(x, 2),
    },
    toggle('binaries', 'clW.control.binaries', 'clW.binaries'),
    toggle('truth', 'clW.control.truth', null),
  ],
  draw(canvas, v) {
    const m = clusterView(v);
    const series = [
      {
        id: 'stars',
        label: t('clW.legend.stars'),
        x: Array.from(m.stars.colour),
        y: Array.from(m.stars.g, g => -g),
        color: '#495057',
        mode: 'points',
        radius: 1.8,
      },
    ];
    if (m.fit.best)
      series.push({
        id: 'fit',
        label: t('clW.legend.fit'),
        x: m.line.map(p => p[0]),
        y: m.line.map(p => -p[1]),
        color: '#e8590c',
        width: 2,
        mode: 'line',
      });
    const spec = {
      label: t('clW.title'),
      xTitle: t('clW.axis.colour'),
      yTitle: t('clW.axis.g'),
      xRange: [-0.2, 1.5],
      yRange: [-21, -14],
      series,
    };
    hostOf(canvas, t('clW.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = clusterView(v);
    const f = m.fit;
    if (!f.best)
      return [
        {
          label: t('clW.row.refused'),
          value: f.why ?? f.reason,
          emphasis: true,
        },
      ];
    const iv = f.intervals;
    const rows = [
      {
        label: t('clW.row.stars'),
        value: t('clW.v.stars', { n: f.members, m: m.spec.N }),
      },
    ];
    const open = iv.logAge.status !== 'ok';
    rows.push({
      label: t('clW.row.age'),
      value: open
        ? t('clW.v.ageOpen', { a: fixed(gyr(f.best.logAge), 2) })
        : t('clW.v.age', {
            a: fixed(gyr(f.best.logAge), 2),
            lo: fixed(gyr(iv.logAge.lo), 2),
            hi: fixed(gyr(iv.logAge.hi), 2),
          }),
      emphasis: true,
    });
    rows.push({
      label: t('clW.row.dm'),
      value: t('clW.v.dm', {
        d: fixed(f.best.dm, 2),
        lo: fixed(iv.dm.lo, 2),
        hi: fixed(iv.dm.hi, 2),
      }),
      emphasis: true,
    });
    rows.push({
      label: t('clW.row.distance'),
      value: t('clW.v.distance', {
        d: fixed(10 ** (f.best.dm / 5 + 1), 0),
      }),
    });
    if (f.correlation !== null && f.correlation !== undefined)
      rows.push({
        label: t('clW.row.corr'),
        value: t('clW.v.corr', { c: fixed(f.correlation, 2) }),
      });
    if (m.truth)
      rows.push({
        label: t('clW.row.truth'),
        value: t('clW.v.truth', {
          a: fixed(gyr(m.spec.logAge), 2),
          d: fixed(m.spec.dm, 2),
          f: fixed(m.spec.feh, 2),
          b: fixed(100 * m.fb, 0),
        }),
      });
    rows.push({ label: t('clW.row.assumes'), value: t('clW.a.fit') });
    return rows;
  },
};

export const CLUSTER_WIDGETS = [CLUSTER_FIT];
