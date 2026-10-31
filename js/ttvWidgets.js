// =============================================================================
// The transit-timing panels (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// Two panels in one lazy family. `ttv-transit` shows one transit's window of light curve
// and the template fit that measures its mid-time, with the time's one-sigma and the fit's
// own check. `ttv-timing` shows a planet's O-C diagram, the straight-line clock it is
// measured against, the sinusoid the fit finds, the super-period it reads and the one the
// cited relation gives from the pair's mean periods, and says when there is no signal above
// the noise or when the record is too short to resolve a period.
//
// Nothing is calculated here: every number is js/ttvField.js's, over js/kernels/ttv/. The
// systems are synthetic, made by the engine; no star was observed.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_TTV } from './i18n/en.ttv.js';
import { ES_TTV } from './i18n/es.ttv.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { NOISES_PPM, timingView, transitView } from './ttvField.js';

registerMessages('en', EN_TTV);
registerMessages('es', ES_TTV);

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

const min1 = x => fixed(x, Math.abs(x) >= 100 ? 0 : 1);

// ----------------------------------------------------------------------------
// ttv-transit
// ----------------------------------------------------------------------------
const TRANSIT = {
  id: 'ttv-transit',
  get title() {
    return t('ttvW.t.title');
  },
  get note() {
    return t('ttvW.t.note');
  },
  animated: false,
  controls: [
    choice('system', 'ttvW.control.system', 'ttvW.system', 3),
    choice('planet', 'ttvW.control.planet', 'ttvW.planet', 2),
    numeric('transit', 'ttvW.t.control.transit', 0, 109, 1, 0, x =>
      fixed(x, 0)
    ),
    choice('noise', 'ttvW.t.control.noise', 'ttvW.t.noise', 3, 0),
    choice('view', 'ttvW.t.control.view', 'ttvW.t.view', 2),
  ],
  draw(canvas, v) {
    const m = transitView(v);
    const label = t('ttvW.t.title');
    const w = m.window;
    const x = Array.from(w.t, tt => (tt - m.guess) * 1440);
    let spec;
    if (m.view === 1 && m.fit.status === 'ok') {
      spec = {
        xTitle: t('ttvW.axis.minFit'),
        yTitle: t('ttvW.axis.dchi2'),
        series: [
          {
            id: 'profile',
            label: t('ttvW.legend.profile'),
            x: m.profile.map(p => p[0]),
            y: m.profile.map(p => p[1]),
            color: COLOR.blue,
            width: 2,
            mode: 'line',
          },
          {
            id: 'one',
            label: t('ttvW.legend.one'),
            x: [m.profile[0][0], m.profile[m.profile.length - 1][0]],
            y: [1, 1],
            color: COLOR.grey,
            width: 1,
            mode: 'line',
          },
        ],
      };
    } else {
      spec = {
        xTitle: t('ttvW.axis.minPredicted'),
        yTitle: t('ttvW.axis.flux'),
        series: [
          {
            id: 'flux',
            label: t('ttvW.legend.flux'),
            x,
            y: Array.from(w.flux),
            color: COLOR.grey,
            mode: 'points',
            radius: 1.6,
          },
          ...(m.fit.status === 'ok'
            ? [
                {
                  id: 'fit',
                  label: t('ttvW.legend.fit'),
                  x: m.curve.map(p => (p[0] - m.guess) * 1440),
                  y: m.curve.map(p => p[1]),
                  color: COLOR.orange,
                  width: 2,
                  mode: 'line',
                },
              ]
            : []),
        ],
      };
    }
    spec.label = label;
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = transitView(v);
    const rows = [
      {
        label: t('ttvW.row.system'),
        value: t(`ttvW.system.${['S1', 'S2', 'S3'].indexOf(m.system)}`),
      },
      {
        label: t('ttvW.t.row.which'),
        value: t('ttvW.t.v.which', {
          n: m.transit,
          planet: t(`ttvW.planet.${m.planet}`),
        }),
      },
      {
        label: t('ttvW.t.row.noise'),
        value: t('ttvW.t.v.noise', {
          ppm: NOISES_PPM[Math.round(v.noise ?? 0)] ?? 100,
        }),
      },
    ];
    if (m.fit.status !== 'ok') {
      rows.push({
        label: t('ttvW.t.row.fit'),
        value: t('ttvW.t.v.refused'),
        emphasis: true,
      });
      return rows;
    }
    rows.push({
      label: t('ttvW.t.row.time'),
      value: t('ttvW.t.v.time', {
        dt: min1((m.fit.time - m.guess) * 1440),
        s: fixed(m.sigmaMinutes, 2),
      }),
      emphasis: true,
    });
    rows.push({
      label: t('ttvW.t.row.chi'),
      value: t(m.fit.flagged ? 'ttvW.t.v.chiFlag' : 'ttvW.t.v.chiOk', {
        c: fixed(m.fit.chi2 / m.fit.dof, 2),
        n: m.fit.dof,
      }),
    });
    rows.push({
      label: t('ttvW.t.row.regime'),
      value: t(
        m.fit.regime === 'reliable' ? 'ttvW.t.v.reliable' : 'ttvW.t.v.lowSnr',
        { s: fixed(m.sigmaMinutes, 2), c: fixed(m.fit.cadence * 1440, 0) }
      ),
      emphasis: m.fit.regime !== 'reliable',
    });
    rows.push({
      label: t('ttvW.t.row.truth'),
      value: t('ttvW.t.v.truth', {
        e: fixed(m.errorMinutes, 2),
        z: fixed(Math.abs(m.errorMinutes) / m.sigmaMinutes, 1),
      }),
    });
    rows.push({ label: t('ttvW.row.assumes'), value: t('ttvW.t.a.template') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// ttv-timing
// ----------------------------------------------------------------------------
const TIMING = {
  id: 'ttv-timing',
  get title() {
    return t('ttvW.o.title');
  },
  get note() {
    return t('ttvW.o.note');
  },
  animated: false,
  controls: [
    choice('system', 'ttvW.control.system', 'ttvW.system', 3),
    choice('planet', 'ttvW.control.planet', 'ttvW.planet', 2),
    numeric('span', 'ttvW.o.control.span', 20, 100, 5, 100, x =>
      t('ttvW.v.percent', { x: fixed(x, 0) })
    ),
  ],
  draw(canvas, v) {
    const m = timingView(v);
    const label = t('ttvW.o.title');
    const spec = {
      xTitle: t('ttvW.axis.transit'),
      yTitle: t('ttvW.axis.oc'),
      label,
      series: [
        {
          id: 'oc',
          label: t('ttvW.legend.oc'),
          x: m.oc.map(p => p[0]),
          y: m.oc.map(p => p[1]),
          sigma: m.oc.map(p => p[2]),
          color: COLOR.blue,
          mode: 'points',
          radius: 3,
        },
        {
          id: 'zero',
          label: t('ttvW.legend.line'),
          x: [m.oc[0]?.[0] ?? 0, m.oc[m.oc.length - 1]?.[0] ?? 1],
          y: [0, 0],
          color: COLOR.grey,
          width: 1,
          mode: 'line',
        },
        ...(m.model.length
          ? [
              {
                id: 'model',
                label: t('ttvW.legend.sine'),
                x: m.model.map(p => p[0]),
                y: m.model.map(p => p[1]),
                color: COLOR.orange,
                width: 2,
                mode: 'line',
              },
            ]
          : []),
      ],
    };
    hostOf(canvas, label).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = timingView(v);
    const a = m.analysis;
    const rows = [
      {
        label: t('ttvW.row.system'),
        value: t(`ttvW.system.${['S1', 'S2', 'S3'].indexOf(m.system)}`),
      },
      {
        label: t('ttvW.o.row.record'),
        value: t('ttvW.o.v.record', { n: m.count, d: fixed(a.baseline, 0) }),
      },
    ];
    if (a.status === 'refused') {
      rows.push({
        label: t('ttvW.o.row.verdict'),
        value: t('ttvW.o.v.refused'),
        emphasis: true,
      });
      return rows;
    }
    rows.push({
      label: t('ttvW.o.row.clock'),
      value: t('ttvW.o.v.clock', {
        p: fixed(a.ephemeris.P, 4),
        s: fixed(a.ephemeris.sigmaP, 5),
      }),
    });
    rows.push({
      label: t('ttvW.o.row.scatter'),
      value: t('ttvW.o.v.scatter', {
        rms: min1(a.signal.rms * 1440),
        c: fixed(a.signal.reducedChi2, 1),
      }),
    });
    if (a.status === 'no-signal') {
      rows.push({
        label: t('ttvW.o.row.verdict'),
        value: t('ttvW.o.v.noSignal', { p: fixed(a.signal.p, 2) }),
        emphasis: true,
      });
    } else if (a.status === 'unresolved') {
      rows.push({
        label: t('ttvW.o.row.verdict'),
        value: t('ttvW.o.v.unresolved', {
          c: fixed(a.cycles ?? m.analysis.baseline / m.pair.superPeriod, 1),
          m: fixed(m.minCycles, 1),
        }),
        emphasis: true,
      });
    } else {
      rows.push({
        label: t('ttvW.o.row.period'),
        value: t('ttvW.o.v.period', {
          p: fixed(a.superPeriod.value, 0),
          a: fixed(a.superPeriod.lo, 0),
          b: fixed(a.superPeriod.hi, 0),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('ttvW.o.row.amp'),
        value: t('ttvW.o.v.amp', { a: min1(a.amplitude * 1440) }),
      });
    }
    if (m.pair.relation.status === 'ok') {
      rows.push({
        label: t('ttvW.o.row.relation'),
        value: t('ttvW.o.v.relation', {
          p: fixed(m.pair.superPeriod, 0),
          d: fixed(m.pair.delta, 3),
          j: m.pair.sys.j,
        }),
      });
      rows.push({
        label: t('ttvW.o.row.formula'),
        value: t('ttvW.o.v.formula', { a: min1(m.relationAmplitudeMinutes) }),
      });
    } else {
      rows.push({
        label: t('ttvW.o.row.relation'),
        value: t(`ttvW.o.refuse.${m.domain.reason}`, {
          d: fixed(m.domain.delta ?? 0, 2),
        }),
        emphasis: true,
      });
    }
    rows.push({ label: t('ttvW.row.assumes'), value: t('ttvW.o.a.model') });
    return rows;
  },
};

export const TTV_WIDGETS = [TRANSIT, TIMING];
