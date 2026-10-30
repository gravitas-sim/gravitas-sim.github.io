// =============================================================================
// The mass panels (Prompt 218, BINARY_MASSES.md)
// -----------------------------------------------------------------------------
// Three panels in one lazy family. `masses-minimum` shows the velocities of a
// system that does not eclipse and what they fix: the mass ratio and MINIMUM
// masses of a double-lined pair, the mass function of a single-lined orbit, and
// what the masses would be at an inclination the reader chooses. `masses-solve`
// runs the inference core's joint model on an eclipsing system (the light curve
// and both velocity curves, one orbit): absolute masses and radii with the
// uncertainty of the whole fit, or "not constrained", and what a single line
// would give instead. `masses-diagram` puts the solved stars against the MIST
// tracks: mass and radius, or mass and luminosity.
//
// Nothing is calculated here: every number is js/massesField.js's, over
// js/inference/binaryMasses.js and js/inference/. Every data set is synthetic
// and says so.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_MASSES } from './i18n/en.masses.js';
import { ES_MASSES } from './i18n/es.masses.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  ECLIPSING,
  SYSTEMS,
  diagramView,
  inclinationShare,
  insideBand,
  minimumView,
  sigmaOf,
  solveView,
} from './massesField.js';

registerMessages('en', EN_MASSES);
registerMessages('es', ES_MASSES);

const COLOR = {
  blue: '#1c7ed6',
  orange: '#e8590c',
  grey: '#495057',
  green: '#2b8a3e',
  violet: '#7048e8',
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
const choice = (id, label, count, key, value = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: count - 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(`${key}.${Math.max(0, Math.min(count - 1, Math.round(x)))}`),
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
  format: x => t(x >= 0.5 ? 'masW.on' : 'masW.off'),
});

const f3 = x => fixed(x, 3);
const f2 = x => fixed(x, 2);
const f4 = x => fixed(x, 4);
const pm = (q, d) => `${fixed(q.value, d)} ± ${fixed(sigmaOf(q), d)}`;

// ----------------------------------------------------------------------------
// masses-minimum
// ----------------------------------------------------------------------------
const MINIMUM = {
  id: 'masses-minimum',
  get title() {
    return t('masW.m.title');
  },
  get note() {
    return t('masW.m.note');
  },
  animated: false,
  controls: [
    choice('system', 'masW.m.control.system', 2, 'masW.m.system'),
    numeric('inc', 'masW.m.control.inc', 20, 90, 1, 90, x =>
      t('masW.v.deg', { x: fixed(x, 0) })
    ),
  ],
  draw(canvas, v) {
    const m = minimumView(v);
    const series = [];
    if (m.fit) {
      const run = solveView({ system: SYSTEMS.indexOf(m.system), lines: 2 });
      const f = run.folded;
      series.push({
        id: 'd1',
        label: t('masW.legend.star1'),
        x: f.rv1.map(p => p.phase),
        y: f.rv1.map(p => p.y),
        color: COLOR.blue,
        mode: 'points',
        radius: 3,
      });
      if (f.rv2.length)
        series.push({
          id: 'd2',
          label: t('masW.legend.star2'),
          x: f.rv2.map(p => p.phase),
          y: f.rv2.map(p => p.y),
          color: COLOR.orange,
          mode: 'points',
          radius: 3,
        });
      const order = Array.from(f.grid.keys()).sort(
        (a, b) => f.grid[a] - f.grid[b]
      );
      series.push({
        id: 'm1',
        label: t('masW.legend.model1'),
        x: order.map(i => f.grid[i]),
        y: order.map(i => f.model1[i]),
        color: COLOR.blue,
        width: 2,
        mode: 'line',
      });
      if (f.rv2.length)
        series.push({
          id: 'm2',
          label: t('masW.legend.model2'),
          x: order.map(i => f.grid[i]),
          y: order.map(i => f.model2[i]),
          color: COLOR.orange,
          width: 2,
          mode: 'line',
        });
    }
    const spec = {
      label: t('masW.m.title'),
      xTitle: t('masW.axis.phase'),
      yTitle: t('masW.axis.rv'),
      xRange: [0, 1],
      series,
    };
    hostOf(canvas, t('masW.m.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = minimumView(v);
    const rows = [];
    if (!m.fit)
      return [{ label: t('masW.row.refused'), value: m.error, emphasis: true }];
    const f = m.fit;
    const val = n =>
      f.parameters.find(p => p.name === n) || f.derived.find(p => p.name === n);
    const single = m.system.kind === 'sb1';
    rows.push({
      label: t('masW.row.data'),
      value: t(single ? 'masW.v.data1' : 'masW.v.data', {
        n: m.system.nRv,
        s: fixed(m.system.sigmaRv, 1),
      }),
    });
    rows.push({
      label: t('masW.row.orbit'),
      value: t('masW.v.orbit', {
        p: fixed(val('P').value, 4),
        ps: fixed(sigmaOf(val('P')), 4),
        e: fixed(val('e').value, 3),
      }),
    });
    rows.push({
      label: t('masW.row.K1'),
      value: t('masW.v.K', {
        v: fixed(val('K1').value, 2),
        s: fixed(sigmaOf(val('K1')), 2),
      }),
    });
    if (!single) {
      rows.push({
        label: t('masW.row.K2'),
        value: t('masW.v.K', {
          v: fixed(val('K2').value, 2),
          s: fixed(sigmaOf(val('K2')), 2),
        }),
      });
      rows.push({
        label: t('masW.row.q'),
        value: t('masW.v.q', {
          v: f3(val('q').value),
          s: f3(sigmaOf(val('q'))),
        }),
      });
      rows.push({
        label: t('masW.row.asini'),
        value: t('masW.v.asini', {
          v: fixed(val('asini').value, 2),
          s: fixed(sigmaOf(val('asini')), 2),
        }),
      });
      rows.push({
        label: t('masW.row.min1'),
        value: t('masW.v.min', {
          v: f3(val('m1sin3i').value),
          s: f3(sigmaOf(val('m1sin3i'))),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('masW.row.min2'),
        value: t('masW.v.min', {
          v: f3(val('m2sin3i').value),
          s: f3(sigmaOf(val('m2sin3i'))),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('masW.row.atInc'),
        value: t('masW.v.atInc', {
          i: fixed(m.inc, 0),
          a: f2(m.atInc.M1),
          b: f2(m.atInc.M2),
        }),
      });
    } else {
      const mf = val('massFunction');
      rows.push({
        label: t('masW.row.mf'),
        value: t('masW.v.mf', { v: f4(mf.value), s: f4(sigmaOf(mf)) }),
        emphasis: true,
      });
      rows.push({
        label: t('masW.row.min'),
        value: t('masW.v.minCompanion', {
          v: f3(m.companionMinimum),
          m: f2(m.assumedM1),
        }),
        emphasis: true,
      });
      rows.push({
        label: t('masW.row.atInc'),
        value: t('masW.v.atIncCompanion', {
          i: fixed(m.inc, 0),
          v: f3(m.companionAtInc),
        }),
      });
    }
    rows.push({
      label: t('masW.row.assumes'),
      value: t(single ? 'masW.a.sb1' : 'masW.a.min'),
    });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// masses-solve
// ----------------------------------------------------------------------------
const WHY = open =>
  t(
    `masW.why.${open?.why === 'radii' || open?.why === 'mass' ? 'derived' : (open?.why ?? 'rank')}`
  );

const SOLVE = {
  id: 'masses-solve',
  get title() {
    return t('masW.s.title');
  },
  get note() {
    return t('masW.s.note');
  },
  animated: false,
  controls: [
    choice(
      'system',
      'masW.s.control.system',
      ECLIPSING.length,
      'masW.s.system'
    ),
    {
      id: 'lines',
      get label() {
        return t('masW.s.control.lines');
      },
      min: 1,
      max: 2,
      step: 1,
      value: 2,
      decimals: 0,
      format: x => t(`masW.s.lines.${x >= 1.5 ? 2 : 1}`),
    },
    choice('view', 'masW.s.control.view', 2, 'masW.s.view'),
    toggle('truth', 'masW.s.control.truth'),
  ],
  draw(canvas, v) {
    const m = solveView(v);
    const series = [];
    let yRange;
    let yTitle = t('masW.axis.flux');
    if (m.folded) {
      const f = m.folded;
      const view = Math.round(v.view ?? 0);
      if (view === 0) {
        series.push({
          id: 'flux',
          label: t('masW.legend.flux'),
          x: f.flux.map(p => p.phase),
          y: f.flux.map(p => p.y),
          color: COLOR.grey,
          mode: 'points',
          radius: 1.5,
        });
        const order = Array.from(f.grid.keys()).sort(
          (a, b) => f.grid[a] - f.grid[b]
        );
        series.push({
          id: 'fit',
          label: t('masW.legend.fit'),
          x: order.map(i => f.grid[i]),
          y: order.map(i => f.modelFlux[i]),
          color: COLOR.orange,
          width: 2,
          mode: 'line',
        });
        const lo = Math.min(...f.flux.map(p => p.y));
        yRange = [Math.max(0, lo - 0.02), 1.02];
      } else {
        yTitle = t('masW.axis.rv');
        const order = Array.from(f.grid.keys()).sort(
          (a, b) => f.grid[a] - f.grid[b]
        );
        series.push({
          id: 'd1',
          label: t('masW.legend.star1'),
          x: f.rv1.map(p => p.phase),
          y: f.rv1.map(p => p.y),
          color: COLOR.blue,
          mode: 'points',
          radius: 3,
        });
        series.push({
          id: 'm1',
          label: t('masW.legend.model1'),
          x: order.map(i => f.grid[i]),
          y: order.map(i => f.model1[i]),
          color: COLOR.blue,
          width: 2,
          mode: 'line',
        });
        if (f.rv2.length) {
          series.push({
            id: 'd2',
            label: t('masW.legend.star2'),
            x: f.rv2.map(p => p.phase),
            y: f.rv2.map(p => p.y),
            color: COLOR.orange,
            mode: 'points',
            radius: 3,
          });
          series.push({
            id: 'm2',
            label: t('masW.legend.model2'),
            x: order.map(i => f.grid[i]),
            y: order.map(i => f.model2[i]),
            color: COLOR.orange,
            width: 2,
            mode: 'line',
          });
        }
      }
    }
    const spec = {
      label: t('masW.s.title'),
      xTitle: t('masW.axis.phase'),
      yTitle,
      xRange: [0, 1],
      ...(yRange ? { yRange } : {}),
      series,
    };
    hostOf(canvas, t('masW.s.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = solveView(v);
    if (!m.fit)
      return [{ label: t('masW.row.refused'), value: m.error, emphasis: true }];
    const f = m.fit;
    const q = m.value;
    const rows = [
      {
        label: t('masW.row.system'),
        value: t('masW.v.system', {
          n: m.folded.flux.length,
          f: fixed(m.system.sigmaFlux, 4),
          r: m.system.nRv,
          s: fixed(m.system.sigmaRv, 1),
          p: fixed(q('P').value, 3),
        }),
      },
      {
        label: t('masW.row.geometry'),
        value: t('masW.v.geometry', {
          i: fixed(q('inc').value, 2),
          si: fixed(sigmaOf(q('inc')), 2),
          r1: f4(q('r1').value),
          r2: f4(q('r2').value),
        }),
      },
    ];
    const open = name => m.open(name);
    if (m.singleLined) {
      rows.push({
        label: t('masW.row.single'),
        value: t('masW.v.single', {
          f: f4(q('massFunction').value),
          m: f2(m.system.truth.M1),
          v: f3(q('m2min').value),
        }),
        emphasis: true,
      });
    } else {
      const a = q('M1');
      const b = q('M2');
      const masses = open('M1') || open('M2');
      rows.push({
        label: t('masW.row.masses'),
        value: masses
          ? t('masW.v.massesOpen', {
              a: f3(a.value),
              b: f3(b.value),
              why: WHY(masses),
            })
          : t('masW.v.massesPair', {
              a: f3(a.value),
              sa: f3(sigmaOf(a)),
              b: f3(b.value),
              sb: f3(sigmaOf(b)),
            }),
        emphasis: true,
      });
      const r1 = q('R1');
      const r2 = q('R2');
      const radii = open('R1') || open('R2');
      rows.push({
        label: t('masW.row.radii'),
        value: radii
          ? t('masW.v.radiiOpen', {
              a: f3(r1.value),
              b: f3(r2.value),
              why: WHY(radii),
            })
          : t('masW.v.radiiPair', {
              a: f3(r1.value),
              sa: f3(sigmaOf(r1)),
              b: f3(r2.value),
              sb: f3(sigmaOf(r2)),
            }),
        emphasis: true,
      });
      rows.push({
        label: t('masW.row.sep'),
        value: t('masW.v.sep', {
          a: f3(q('a').value),
          sa: f3(sigmaOf(q('a'))),
          q: f3(q('q').value),
          sq: f3(sigmaOf(q('q'))),
        }),
      });
      rows.push({
        label: t('masW.row.logg'),
        value: t('masW.v.logg', {
          a: f3(q('logg1').value),
          b: f3(q('logg2').value),
        }),
      });
      rows.push({
        label: t('masW.row.share'),
        value: t('masW.v.share', {
          x: fixed(100 * inclinationShare(f, 'M1'), 3),
        }),
      });
    }
    const flagged = Object.entries(f.identifiability.parameters)
      .filter(([, x]) => x.status !== 'constrained')
      .map(([n]) => n);
    rows.push({
      label: t('masW.row.verdict'),
      value: flagged.length
        ? t('masW.verdict.open', { names: flagged.join(', ') })
        : t('masW.verdict.constrained'),
      emphasis: true,
    });
    rows.push({
      label: t('masW.row.chi2'),
      value: t('masW.v.chi2', {
        c: fixed(f.reducedChi2, 2),
        d: f.dof,
        b: fixed(f.redNoise?.beta ?? 1, 2),
      }),
    });
    if (Math.round(v.truth ?? 0) === 1) {
      const T = m.truth;
      rows.push({
        label: t('masW.row.truth'),
        value: t('masW.v.truth', {
          a: f2(m.system.truth.M1),
          b: f2(m.system.truth.M2),
          c: f3(m.system.truth.R1),
          d: f3(m.system.truth.R2),
          i: fixed(m.system.truth.inc, 1),
          k1: fixed(T.elements.K1, 2),
          k2: fixed(T.elements.K2, 2),
        }),
      });
    }
    rows.push({ label: t('masW.row.assumes'), value: t('masW.a.solve') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// masses-diagram
// ----------------------------------------------------------------------------
const DIAGRAM = {
  id: 'masses-diagram',
  get title() {
    return t('masW.d.title');
  },
  get note() {
    return t('masW.d.note');
  },
  animated: false,
  controls: [
    choice('view', 'masW.d.control.view', 2, 'masW.d.view'),
    numeric(
      'systems',
      'masW.d.control.systems',
      1,
      ECLIPSING.length,
      1,
      ECLIPSING.length,
      x => fixed(x, 0)
    ),
    toggle('band', 'masW.d.control.band', 1),
  ],
  draw(canvas, v) {
    const m = diagramView(v);
    const series = [];
    const lum = m.luminosity;
    if (Math.round(v.band ?? 1) === 1) {
      series.push({
        id: 'zams',
        label: t('masW.legend.zams'),
        x: m.band.logM,
        y: lum ? m.band.zams.logL : m.band.zams.logR,
        color: COLOR.green,
        width: 2,
        mode: 'line',
      });
      series.push({
        id: 'tams',
        label: t('masW.legend.tams'),
        x: m.band.logM,
        y: lum ? m.band.tams.logL : m.band.tams.logR,
        color: COLOR.violet,
        width: 2,
        mode: 'line',
      });
    }
    series.push({
      id: 'stars',
      label: t('masW.legend.star'),
      x: m.stars.map(s => Math.log10(s.M)),
      y: m.stars.map(s => Math.log10(lum ? s.L : s.R)),
      sigma: m.stars.map(s => (lum ? s.sigma / s.L : s.sR / s.R) / Math.LN10),
      color: COLOR.orange,
      mode: 'points',
      radius: 4,
    });
    const spec = {
      label: t('masW.d.title'),
      xTitle: t('masW.axis.logM'),
      yTitle: t(lum ? 'masW.axis.logL' : 'masW.axis.logR'),
      series,
    };
    hostOf(canvas, t('masW.d.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = diagramView(v);
    const rows = m.stars.map(s => ({
      label: t('masW.row.star', { id: s.id.toUpperCase(), n: s.star }),
      value: t(m.luminosity ? 'masW.v.starL' : 'masW.v.starR', {
        m: f3(s.M),
        sm: f3(s.sM),
        r: f3(s.R),
        sr: f3(s.sR),
        l: fixed(s.L, s.L < 1 ? 3 : 2),
        sl: fixed(s.sigma, s.L < 1 ? 3 : 2),
        t: fixed(s.T, 0),
        st: fixed(s.sT, 0),
        where: t(insideBand(s.M, s.R) ? 'masW.where.in' : 'masW.where.out'),
      }),
      emphasis: true,
    }));
    rows.push({ label: t('masW.row.band'), value: t('masW.v.band') });
    rows.push({ label: t('masW.row.limits'), value: t('masW.a.diagram') });
    return rows;
  },
};

export const MASSES_WIDGETS = [MINIMUM, SOLVE, DIAGRAM];
