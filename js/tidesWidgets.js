// =============================================================================
// The ring and tide instruments (Prompt 204 part 2, TIDAL_KERNEL.md)
// -----------------------------------------------------------------------------
// Four instruments for "Why Rings?", "Tides That Move the Moon" and "Io's Fire",
// each standing on the kernel in js/kernels/tides/ and drawing through the plot
// component (js/plot/chart.js), never a canvas of its own:
//
//   tides-roche      the rigid and the fluid Roche limit of four named
//                    primary and satellite pairs, and where a distance lies
//   tides-resonance  where a moon's p:q resonance falls inside it, beside the
//                    edges and gaps of Saturn's rings
//   tides-moon       the constant-Q recession of the Moon and the lengthening of
//                    the day, a precomputed table (tidalTrajectory): no force
//   tides-heating    the tidal heating of Io as a bound, from the formula with a
//                    stated k2/Q, against the observed heat flow
//
// No arithmetic is repeated here: every number is the kernel's, and
// tests/tidesLessons.test.js recomputes each one a lesson states. The model, and
// what it leaves out, is named on every readout.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_TIDES } from './i18n/en.tides.js';
import { ES_TIDES } from './i18n/es.tides.js';
import { fixed, scientific } from './format.js';
import { createChart } from './plot/mount.js';
import {
  TidesError,
  heatingRange,
  nearestResonances,
  recession,
  requiredK2OverQ,
  resonanceRadius,
  rocheLimit,
  rocheRegimeAt,
  tidalHeating,
  tidalTrajectory,
} from './kernels/tides/index.js';

registerMessages('en', EN_TIDES);
registerMessages('es', ES_TIDES);

const SECONDS_PER_YEAR = 365.25 * 86400;
const GYR = 1e9 * SECONDS_PER_YEAR;
const pick = (v, n, d = 0) => Math.max(0, Math.min(n - 1, Math.round(v ?? d)));
const sci = x => scientific(x, 3);

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
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : 2),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}
const SERIES = {
  blue: '#1c7ed6',
  green: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
};

const ctl = (id, label, min, max, step, value, format, decimals = 0) => ({
  id,
  get label() {
    return t(label);
  },
  min,
  max,
  step,
  value,
  decimals,
  format,
});
const choice = (id, label, count, name, value = 0) =>
  ctl(id, label, 0, count - 1, 1, value, x => name(Math.round(x)));
const toggle = (id, label, on, off, value = 1) =>
  ctl(id, label, 0, 1, 1, value, x => t(x >= 0.5 ? on : off));

// ----------------------------------------------------------------------------
// tides-roche
// ----------------------------------------------------------------------------
/** Radius, bulk densities and distance of four pairs, from the sources the kernel's tier (b) cites. */
export const ROCHE_SYSTEMS = [
  { id: 'phobos', R: 3389.5e3, rhoP: 3933, rhoS: 1876, d: 9376e3 },
  { id: 'sl9', R: 71492e3, rhoP: 1326, rhoS: 600, d: 1.3 * 71492e3 },
  { id: 'moon', R: 6371e3, rhoP: 5514, rhoS: 3344, d: 384400e3 },
  { id: 'ring', R: 60268e3, rhoP: 687, rhoS: 900, d: 117580e3 },
];

export function rocheView(v) {
  const s = ROCHE_SYSTEMS[pick(v.system, ROCHE_SYSTEMS.length)];
  const own = (v.own ?? 1) >= 0.5;
  const d = own ? s.d : (v.radii ?? 3) * s.R;
  const base = {
    primaryRadius: s.R,
    primaryDensity: s.rhoP,
    satelliteDensity: s.rhoS,
  };
  const rigid = rocheLimit({ ...base, kind: 'rigid' });
  const fluid = rocheLimit({ ...base, kind: 'fluid' });
  const regime = rocheRegimeAt({ ...base, distance: d });
  return {
    s,
    d,
    rigid,
    fluid,
    regime: regime.regime ?? regime,
    radii: d / s.R,
  };
}

const ROCHE = {
  id: 'tides-roche',
  get title() {
    return t('tideW.r.title');
  },
  get note() {
    return t('tideW.r.note');
  },
  animated: false,
  controls: [
    choice('system', 'tideW.r.control.system', ROCHE_SYSTEMS.length, i =>
      t(`tideW.r.sys.${ROCHE_SYSTEMS[i].id}`)
    ),
    toggle('own', 'tideW.r.control.own', 'tideW.r.real', 'tideW.r.mine'),
    ctl('radii', 'tideW.r.control.radii', 1, 12, 0.1, 3, x => fixed(x, 1), 1),
  ],
  draw(canvas, v) {
    const f = rocheView(v);
    const xs = Array.from({ length: 56 }, (_, i) => 1 + (i * 11) / 55);
    const dr = f.rigid.inPrimaryRadii;
    const ratio = x => (dr / x) ** 3;
    const spec = {
      label: t('tideW.r.title'),
      xTitle: t('tideW.r.axis.x'),
      yTitle: t('tideW.r.axis.y'),
      series: [
        {
          id: 'curve',
          label: t('tideW.r.legend.curve'),
          x: xs,
          y: xs.map(ratio),
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'limits',
          label: t('tideW.r.legend.limits'),
          x: [dr, f.fluid.inPrimaryRadii],
          y: [1, ratio(f.fluid.inPrimaryRadii)],
          color: SERIES.green,
          mode: 'points',
          radius: 5,
        },
        {
          id: 'here',
          label: t('tideW.r.legend.here'),
          x: [Math.min(12, f.radii)],
          y: [ratio(Math.min(12, f.radii))],
          color: SERIES.orange,
          mode: 'points',
          radius: 5,
        },
      ],
    };
    hostOf(canvas, t('tideW.r.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = rocheView(v);
    const km = x => `${fixed(x / 1000, 0)} km`;
    return [
      {
        label: t('tideW.row.model'),
        value: t('tideW.model.roche'),
        emphasis: true,
      },
      {
        label: t('tideW.r.row.rigid'),
        value: `${km(f.rigid.distance)} (${fixed(f.rigid.inPrimaryRadii, 2)} R)`,
      },
      {
        label: t('tideW.r.row.fluid'),
        value: `${km(f.fluid.distance)} (${fixed(f.fluid.inPrimaryRadii, 2)} R)`,
      },
      {
        label: t('tideW.r.row.at'),
        value: `${km(f.d)} (${fixed(f.radii, 2)} R)`,
      },
      {
        label: t('tideW.r.row.regime'),
        value: t(`tideW.r.regime.${f.regime}`),
        emphasis: true,
      },
      { label: t('tideW.row.assumes'), value: t('tideW.a.roche') },
    ];
  },
};

// ----------------------------------------------------------------------------
// tides-resonance
// ----------------------------------------------------------------------------
/** Saturn's inner moons: semi-major axes in metres (JPL satellite mean elements). */
export const RING_MOONS = [
  { id: 'mimas', a: 185540e3 },
  { id: 'enceladus', a: 238020e3 },
  { id: 'tethys', a: 294660e3 },
];
/** Edges and gaps in Saturn's rings, in metres from its centre (Porco et al. 2005; Cassini imaging). */
export const RING_FEATURES = [
  { id: 'bOuter', r: 117580e3 },
  { id: 'aInner', r: 122170e3 },
  { id: 'encke', r: 133589e3 },
  { id: 'keeler', r: 136505e3 },
];

export function resonanceView(v) {
  const moon = RING_MOONS[pick(v.moon, RING_MOONS.length)];
  const q = Math.round(v.q ?? 1);
  const p = Math.max(q + 1, Math.round(v.p ?? 2));
  const { radius } = resonanceRadius({ semiMajorAxis: moon.a, p, q });
  let nearest = RING_FEATURES[0];
  for (const f of RING_FEATURES)
    if (Math.abs(f.r - radius) < Math.abs(nearest.r - radius)) nearest = f;
  return {
    moon,
    p,
    q,
    radius,
    nearest,
    offset: (radius - nearest.r) / nearest.r,
  };
}

const RESONANCE = {
  id: 'tides-resonance',
  get title() {
    return t('tideW.s.title');
  },
  get note() {
    return t('tideW.s.note');
  },
  animated: false,
  controls: [
    choice('moon', 'tideW.s.control.moon', RING_MOONS.length, i =>
      t(`tideW.s.moon.${RING_MOONS[i].id}`)
    ),
    ctl('p', 'tideW.s.control.p', 2, 6, 1, 2, x => fixed(x, 0)),
    ctl('q', 'tideW.s.control.q', 1, 3, 1, 1, x => fixed(x, 0)),
  ],
  draw(canvas, v) {
    const f = resonanceView(v);
    const k = 1e-6;
    const spec = {
      label: t('tideW.s.title'),
      xTitle: t('tideW.s.axis.x'),
      yTitle: '',
      series: [
        {
          id: 'features',
          label: t('tideW.s.legend.features'),
          x: RING_FEATURES.map(r => r.r * k),
          y: RING_FEATURES.map(() => 1),
          color: SERIES.green,
          mode: 'points',
          radius: 5,
        },
        {
          id: 'resonance',
          label: t('tideW.s.legend.resonance', { p: f.p, q: f.q }),
          x: [f.radius * k],
          y: [2],
          color: SERIES.orange,
          mode: 'points',
          radius: 6,
        },
      ],
    };
    hostOf(canvas, t('tideW.s.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = resonanceView(v);
    const km = x => `${fixed(x / 1000, 0)} km`;
    return [
      {
        label: t('tideW.row.model'),
        value: t('tideW.model.res'),
        emphasis: true,
      },
      {
        label: t('tideW.s.row.radius', { p: f.p, q: f.q }),
        value: km(f.radius),
        emphasis: true,
      },
      {
        label: t('tideW.s.row.nearest'),
        value: t(`tideW.s.feature.${f.nearest.id}`),
      },
      {
        label: t('tideW.s.row.offset'),
        value: `${f.offset >= 0 ? '+' : '−'}${fixed(100 * Math.abs(f.offset), 2)} %`,
      },
      { label: t('tideW.row.assumes'), value: t('tideW.a.res') },
    ];
  },
};

// ----------------------------------------------------------------------------
// tides-moon
// ----------------------------------------------------------------------------
const EARTH = {
  primaryMass: 5.9722e24,
  primaryRadius: 6.3781e6,
  satelliteMass: 7.342e22,
  semiMajorAxis: 3.844e8,
  spin: 7.2921159e-5,
};

export function moonView(v) {
  const k2 = v.k2 ?? 0.3;
  const Q = v.Q ?? 12;
  const span = (v.gyr ?? 1) * GYR;
  const base = { ...EARTH, k2, Q };
  const now = recession(base);
  // Day length changes by -2 pi / omega^2 d(omega)/dt; in milliseconds per century.
  const dayMsPerCentury =
    ((2 * Math.PI) / EARTH.spin ** 2) *
    Math.abs(now.dOmegaDt) *
    1000 *
    100 *
    SECONDS_PER_YEAR;
  let table = null;
  let refused = null;
  if (span !== 0) {
    try {
      table = tidalTrajectory({ ...base, duration: span, samples: 60 });
    } catch (e) {
      if (!(e instanceof TidesError)) throw e;
      refused = e;
    }
  }
  const last = table?.rows[table.rows.length - 1];
  return {
    k2,
    Q,
    gyr: v.gyr ?? 1,
    dadtCmPerYear: now.dadt * 100 * SECONDS_PER_YEAR,
    dayMsPerCentury,
    table,
    refused,
    endedBy: table?.endedBy ?? null,
    last,
  };
}

const MOON = {
  id: 'tides-moon',
  get title() {
    return t('tideW.m.title');
  },
  get note() {
    return t('tideW.m.note');
  },
  animated: false,
  controls: [
    ctl('k2', 'tideW.m.control.k2', 0.05, 0.6, 0.01, 0.3, x => fixed(x, 2), 2),
    ctl('Q', 'tideW.m.control.Q', 5, 200, 1, 12, x => fixed(x, 0)),
    ctl('gyr', 'tideW.m.control.gyr', -4, 4, 0.1, 1, x => fixed(x, 1), 1),
  ],
  draw(canvas, v) {
    const f = moonView(v);
    const rows = f.table?.rows ?? [{ time: 0, a: EARTH.semiMajorAxis }];
    const span = f.table ? (f.gyr * GYR) / (rows.length - 1) : 0;
    void span;
    const spec = {
      label: t('tideW.m.title'),
      xTitle: t('tideW.m.axis.x'),
      yTitle: t('tideW.m.axis.y'),
      series: [
        {
          id: 'orbit',
          label: t('tideW.m.legend.orbit'),
          x: rows.map(r => r.time / GYR),
          y: rows.map(r => r.a / EARTH.primaryRadius),
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'now',
          label: t('tideW.m.legend.now'),
          x: [0],
          y: [EARTH.semiMajorAxis / EARTH.primaryRadius],
          color: SERIES.orange,
          mode: 'points',
          radius: 5,
        },
      ],
    };
    hostOf(canvas, t('tideW.m.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = moonView(v);
    const rows = [
      {
        label: t('tideW.row.model'),
        value: t('tideW.m.model'),
        emphasis: true,
      },
      {
        label: t('tideW.m.row.rate'),
        value: `${fixed(f.dadtCmPerYear, 2)} cm/yr (${t('tideW.m.llr')})`,
        emphasis: true,
      },
      {
        label: t('tideW.m.row.day'),
        value: `${fixed(f.dayMsPerCentury, 2)} ms/century (${t('tideW.m.eclipse')})`,
      },
    ];
    if (f.last) {
      rows.push({
        label: t('tideW.m.row.at', { gyr: fixed(f.gyr, 1) }),
        value: t('tideW.m.value.at', {
          a: fixed(f.last.a / 1000, 0),
          radii: fixed(f.last.a / EARTH.primaryRadius, 1),
          day: fixed(f.last.spinPeriod / 3600, 1),
        }),
      });
    }
    if (f.endedBy || f.refused) {
      const code = f.endedBy?.code ?? f.refused.code;
      const time = f.endedBy?.time ?? f.refused.detail?.contactTime;
      rows.push({
        label: t('tideW.m.row.ends'),
        value: t(`tideW.m.ends.${code}`, {
          gyr: Number.isFinite(time) ? fixed(Math.abs(time) / GYR, 2) : '?',
        }),
        emphasis: true,
      });
    }
    rows.push({ label: t('tideW.row.assumes'), value: t('tideW.a.moon') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// tides-heating
// ----------------------------------------------------------------------------
const IO = {
  primaryMass: 1.8982e27,
  satelliteRadius: 1.8216e6,
  semiMajorAxis: 4.217e8,
  satelliteMass: 8.932e22,
};
/** Io's observed total heat flow, W (Veeder et al. 1994; Spencer et al. 2000). */
export const IO_OBSERVED = { low: 6e13, high: 1.6e14 };

export function heatingView(v) {
  const k2 = v.k2 ?? 1.5;
  const Q = v.Q ?? 100;
  const e = v.e ?? 0.0041;
  const base = { ...IO, eccentricity: e, k2, Q };
  const h = tidalHeating(base);
  const range = heatingRange({ ...IO, eccentricity: e });
  const need = requiredK2OverQ({
    ...IO,
    eccentricity: e,
    power: (IO_OBSERVED.low + IO_OBSERVED.high) / 2,
  });
  return { k2, Q, e, h, range, need };
}

const HEATING = {
  id: 'tides-heating',
  get title() {
    return t('tideW.h.title');
  },
  get note() {
    return t('tideW.h.note');
  },
  animated: false,
  controls: [
    ctl('k2', 'tideW.h.control.k2', 0.1, 1.5, 0.05, 1.5, x => fixed(x, 2), 2),
    ctl('Q', 'tideW.h.control.Q', 5, 500, 1, 100, x => fixed(x, 0)),
    ctl(
      'e',
      'tideW.h.control.e',
      0.001,
      0.01,
      0.0001,
      0.0041,
      x => fixed(x, 4),
      4
    ),
  ],
  draw(canvas, v) {
    const f = heatingView(v);
    const es = Array.from({ length: 40 }, (_, i) => 0.001 + (i * 0.009) / 39);
    const at = (e, k2, Q) =>
      tidalHeating({ ...IO, eccentricity: e, k2, Q }).power / 1e13;
    const spec = {
      label: t('tideW.h.title'),
      xTitle: t('tideW.h.axis.x'),
      yTitle: t('tideW.h.axis.y'),
      series: [
        {
          id: 'chosen',
          label: t('tideW.h.legend.chosen'),
          x: es,
          y: es.map(e => at(e, f.k2, f.Q)),
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'max',
          label: t('tideW.h.legend.max'),
          x: es,
          y: es.map(e => at(e, 1.5, 5)),
          color: SERIES.violet,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        },
        {
          id: 'observed',
          label: t('tideW.h.legend.observed'),
          x: [0.001, 0.01],
          y: [IO_OBSERVED.high / 1e13, IO_OBSERVED.high / 1e13],
          color: SERIES.green,
          width: 2,
          mode: 'line',
        },
        {
          id: 'observedLow',
          label: t('tideW.h.legend.observedLow'),
          x: [0.001, 0.01],
          y: [IO_OBSERVED.low / 1e13, IO_OBSERVED.low / 1e13],
          color: SERIES.orange,
          width: 2,
          mode: 'line',
        },
      ],
    };
    hostOf(canvas, t('tideW.h.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = heatingView(v);
    return [
      {
        label: t('tideW.row.model'),
        value: t('tideW.h.model'),
        emphasis: true,
      },
      {
        label: t('tideW.h.row.power'),
        value: `${sci(f.h.power)} W`,
        emphasis: true,
      },
      {
        label: t('tideW.h.row.orbit'),
        value: `${sci(f.h.energyPerOrbit)} J (${fixed(f.h.period / 86400, 3)} d)`,
      },
      {
        label: t('tideW.h.row.bound'),
        value: `${sci(f.range.low)} – ${sci(f.range.high)} W`,
      },
      {
        label: t('tideW.h.row.observed'),
        value: `${sci(IO_OBSERVED.low)} – ${sci(IO_OBSERVED.high)} W`,
      },
      { label: t('tideW.h.row.need'), value: fixed(f.need.k2OverQ, 4) },
      { label: t('tideW.row.assumes'), value: t('tideW.a.heating') },
    ];
  },
};

export const TIDE_WIDGETS = [ROCHE, RESONANCE, MOON, HEATING];
export { nearestResonances };
