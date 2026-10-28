// =============================================================================
// The habitable-zone limits, the locking radius and the zone along a track
// -----------------------------------------------------------------------------
// Prompt 205 part B (HABITABLE_ZONE_II.md). Three instruments for the deeper
// steps of "The Goldilocks Question", each standing on the kernel in
// js/kernels/habitablezone/ and drawing through the plot component:
//
//   hz-limits    the four limits as flux thresholds, each a toggle, the flux
//                of every limit always in the readout; a star outside the fit's
//                temperature range is refused, not clamped
//   hz-locking   the radius inside which the star's tide removes a planet's
//                spin within the age, beside the zone, for four model stars
//   hz-ages      the zone of a model star on the 1 solar-mass MIST track at an
//                age, and Earth's 1 AU beside it
//
// No arithmetic is repeated here: every number is the kernel's, and
// tests/habitableZoneLessons.test.js recomputes each one a lesson states. The
// escape bar is not built (verdict B of Prompt 199) and nothing here claims a
// planet is habitable: a band of flux is not a measurement of any planet.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_HABITABLEZONE } from './i18n/en.habitablezone.js';
import { ES_HABITABLEZONE } from './i18n/es.habitablezone.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import {
  HabitableZoneError,
  LIMIT_KEYS,
  lockingRadiusRange,
  zoneLimits,
} from './kernels/habitablezone/index.js';
import { zoneAtAge } from './kernels/habitablezone/age.js';

registerMessages('en', EN_HABITABLEZONE);
registerMessages('es', ES_HABITABLEZONE);

const GYR = 1e9;
const SERIES = {
  blue: '#1c7ed6',
  green: '#2f9e44',
  orange: '#e8590c',
  violet: '#7048e8',
  grey: '#495057',
};
const LIMIT_COLOR = {
  recentVenus: SERIES.orange,
  runawayGreenhouse: SERIES.violet,
  maximumGreenhouse: SERIES.blue,
  earlyMars: SERIES.green,
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

const clampIndex = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));
const toggleControl = (id, label, value) => ({
  id,
  get label() {
    return t(label);
  },
  min: 0,
  max: 1,
  step: 1,
  value,
  decimals: 0,
  format: x => t(x >= 0.5 ? 'hzL.on' : 'hzL.off'),
});

// ----------------------------------------------------------------------------
// hz-limits
// ----------------------------------------------------------------------------
/** Stars the limits are read for. TRAPPIST-1 is outside the fit's range on purpose. */
export const LIMIT_STARS = Object.freeze([
  { id: 'sun', teffK: 5780, luminositySolar: 1 },
  { id: 'f', teffK: 6800, luminositySolar: 4 },
  { id: 'k', teffK: 4200, luminositySolar: 0.15 },
  { id: 'm', teffK: 3200, luminositySolar: 0.004 },
  { id: 'trappist', teffK: 2566, luminositySolar: 0.000553 },
]);

export function limitsView(v) {
  const star = LIMIT_STARS[clampIndex(v.star ?? 0, LIMIT_STARS.length)];
  try {
    return { star, zone: zoneLimits(star), refused: null };
  } catch (e) {
    if (!(e instanceof HabitableZoneError)) throw e;
    return { star, zone: null, refused: e };
  }
}

const shown = v =>
  Object.fromEntries(
    LIMIT_KEYS.map(k => [
      k,
      (v[k] ??
        (k === 'runawayGreenhouse' || k === 'maximumGreenhouse' ? 1 : 0)) >=
        0.5,
    ])
  );

const LIMITS = {
  id: 'hz-limits',
  get title() {
    return t('hzL.l.title');
  },
  get note() {
    return t('hzL.l.note');
  },
  animated: false,
  controls: [
    {
      id: 'star',
      get label() {
        return t('hzL.l.control.star');
      },
      min: 0,
      max: LIMIT_STARS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x =>
        t(`hzL.star.${LIMIT_STARS[clampIndex(x, LIMIT_STARS.length)].id}`),
    },
    toggleControl('runawayGreenhouse', 'hzL.ctl.runawayGreenhouse', 1),
    toggleControl('maximumGreenhouse', 'hzL.ctl.maximumGreenhouse', 1),
    toggleControl('recentVenus', 'hzL.ctl.recentVenus', 0),
    toggleControl('earlyMars', 'hzL.ctl.earlyMars', 0),
  ],
  draw(canvas, v) {
    const f = limitsView(v);
    const on = shown(v);
    const z = f.zone;
    const L = f.star.luminositySolar;
    const far = z ? z.optimistic.outerAU * 1.15 : 1;
    const xs = Array.from({ length: 80 }, (_, i) => (far * (i + 1)) / 80);
    const series = [
      {
        id: 'flux',
        label: t('hzL.l.legend.flux'),
        x: xs,
        y: xs.map(d => L / (d * d)),
        color: SERIES.grey,
        width: 2,
        mode: 'line',
      },
    ];
    if (z) {
      for (const k of LIMIT_KEYS) {
        if (!on[k]) continue;
        const lim = z.limits[k];
        series.push({
          id: k,
          label: t(`hzL.limit.${k}`),
          x: [lim.distanceAU],
          y: [lim.flux],
          color: LIMIT_COLOR[k],
          mode: 'points',
          radius: 6,
        });
      }
    }
    const spec = {
      label: t('hzL.l.title'),
      xTitle: t('hzL.axis.distance'),
      yTitle: t('hzL.axis.flux'),
      xRange: [0, far],
      yRange: [0, 2.2],
      series,
    };
    hostOf(canvas, t('hzL.l.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = limitsView(v);
    const rows = [
      { label: t('hzL.row.model'), value: t('hzL.m.limits'), emphasis: true },
      {
        label: t('hzL.row.star'),
        value: t('hzL.value.star', {
          T: fixed(f.star.teffK, 0),
          L:
            f.star.luminositySolar >= 0.01
              ? fixed(f.star.luminositySolar, 2)
              : fixed(f.star.luminositySolar, 4),
        }),
      },
    ];
    if (f.refused) {
      rows.push({
        label: t('hzL.row.refused'),
        value: t('hzL.value.refused', {
          T: fixed(f.refused.detail.teffK, 0),
          min: fixed(f.refused.detail.min, 0),
          max: fixed(f.refused.detail.max, 0),
        }),
        emphasis: true,
      });
    } else {
      for (const k of LIMIT_KEYS) {
        const lim = f.zone.limits[k];
        rows.push({
          label: t(`hzL.limit.${k}`),
          value: t('hzL.value.limit', {
            flux: fixed(lim.flux, 3),
            wm2: fixed(lim.fluxWm2, 0),
            d: fixed(lim.distanceAU, lim.distanceAU >= 0.1 ? 3 : 4),
            kind: t(`hzL.kind.${lim.kind}`),
          }),
          emphasis: k === 'runawayGreenhouse' || k === 'maximumGreenhouse',
        });
      }
    }
    rows.push({ label: t('hzL.row.assumes'), value: t('hzL.as.limits') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// hz-locking
// ----------------------------------------------------------------------------
/** The four model stars the locking radius is set beside, by track. */
export const LOCKING_TRACKS = Object.freeze(['m020', 'm050', 'm100', 'm200']);
const Q_STEPS = Object.freeze([10, 30, 100, 300, 1000]);

/** One star at one age: its zone and the locking radius, or why it cannot be read. */
function lockingFor(trackId, ageYr, Q) {
  try {
    const r = zoneAtAge({ trackId, ageYr });
    const lock = lockingRadiusRange({
      starMassSun: r.star.initialMassSolar,
      ageYr,
      Q,
    });
    return { trackId, ok: true, star: r.star, zone: r.zone, lock };
  } catch (e) {
    if (!(e instanceof HabitableZoneError)) throw e;
    return { trackId, ok: false, refused: e };
  }
}

export function lockingView(v) {
  const ageYr = (v.age ?? 5) * GYR;
  const Q = Q_STEPS[clampIndex(v.q ?? 2, Q_STEPS.length)];
  const all = LOCKING_TRACKS.map(id => lockingFor(id, ageYr, Q));
  const chosen = all[clampIndex(v.star ?? 2, LOCKING_TRACKS.length)];
  let verdict = null;
  if (chosen.ok) {
    const inner = chosen.zone.conservative.innerAU;
    const outer = chosen.zone.conservative.outerAU;
    const r = chosen.lock.radiusAU;
    verdict = outer < r ? 'inside' : inner > r ? 'outside' : 'straddles';
  }
  return { ageYr, Q, all, chosen, verdict };
}

const LOCKING = {
  id: 'hz-locking',
  get title() {
    return t('hzL.k.title');
  },
  get note() {
    return t('hzL.k.note');
  },
  animated: false,
  controls: [
    {
      id: 'star',
      get label() {
        return t('hzL.k.control.star');
      },
      min: 0,
      max: LOCKING_TRACKS.length - 1,
      step: 1,
      value: 2,
      decimals: 0,
      format: x =>
        t(`hzL.mass.${LOCKING_TRACKS[clampIndex(x, LOCKING_TRACKS.length)]}`),
    },
    {
      id: 'age',
      get label() {
        return t('hzL.k.control.age');
      },
      min: 0.5,
      max: 10,
      step: 0.5,
      value: 5,
      decimals: 1,
      format: x => `${fixed(x, 1)} Gyr`,
    },
    {
      id: 'q',
      get label() {
        return t('hzL.k.control.q');
      },
      min: 0,
      max: Q_STEPS.length - 1,
      step: 1,
      value: 2,
      decimals: 0,
      format: x => `Q = ${Q_STEPS[clampIndex(x, Q_STEPS.length)]}`,
    },
  ],
  draw(canvas, v) {
    const f = lockingView(v);
    const ok = f.all.filter(s => s.ok);
    const pts = pick => ({
      x: ok.map(s => s.star.initialMassSolar),
      y: ok.map(pick),
    });
    const spec = {
      label: t('hzL.k.title'),
      xTitle: t('hzL.k.axis.x'),
      yTitle: t('hzL.axis.distance'),
      series: [
        {
          id: 'inner',
          label: t('hzL.k.legend.inner'),
          ...pts(s => s.zone.conservative.innerAU),
          color: SERIES.violet,
          width: 2,
          mode: 'line',
        },
        {
          id: 'outer',
          label: t('hzL.k.legend.outer'),
          ...pts(s => s.zone.conservative.outerAU),
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'lock',
          label: t('hzL.k.legend.lock', { Q: f.Q }),
          ...pts(s => s.lock.radiusAU),
          color: SERIES.orange,
          width: 2,
          mode: 'line',
        },
        {
          id: 'lockLow',
          label: t('hzL.k.legend.low'),
          ...pts(s => s.lock.lowAU),
          color: SERIES.orange,
          dash: [5, 3],
          mode: 'line',
        },
        {
          id: 'lockHigh',
          label: t('hzL.k.legend.high'),
          ...pts(s => s.lock.highAU),
          color: SERIES.orange,
          dash: [5, 3],
          mode: 'line',
        },
      ],
    };
    hostOf(canvas, t('hzL.k.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = lockingView(v);
    const c = f.chosen;
    const rows = [
      { label: t('hzL.row.model'), value: t('hzL.m.locking'), emphasis: true },
    ];
    if (!c.ok) {
      rows.push({
        label: t('hzL.row.refused'),
        value: t(`hzL.k.refused.${c.refused.code}`),
        emphasis: true,
      });
    } else {
      const d = x => fixed(x, x >= 0.1 ? 3 : 4);
      rows.push(
        {
          label: t('hzL.k.row.zone'),
          value: t('hzL.k.value.zone', {
            inner: d(c.zone.conservative.innerAU),
            outer: d(c.zone.conservative.outerAU),
          }),
        },
        {
          label: t('hzL.k.row.lock'),
          value: t('hzL.k.value.lock', {
            r: d(c.lock.radiusAU),
            low: d(c.lock.lowAU),
            high: d(c.lock.highAU),
          }),
          emphasis: true,
        },
        {
          label: t('hzL.k.row.verdict'),
          value: t(`hzL.k.verdict.${f.verdict}`),
          emphasis: true,
        }
      );
    }
    rows.push({ label: t('hzL.row.assumes'), value: t('hzL.as.locking') });
    return rows;
  },
};

// ----------------------------------------------------------------------------
// hz-ages
// ----------------------------------------------------------------------------
const TRACK = 'm100';
const AGE_GRID = Array.from({ length: 40 }, (_, i) => 0.25 + i * 0.25);

export function agesView(v) {
  const age = v.age ?? 4.57;
  const r = zoneAtAge({ trackId: TRACK, ageYr: age * GYR });
  const flux1AU = r.star.luminositySolar; // L / (1 AU)^2
  const z = r.zone.conservative;
  const where = 1 < z.innerAU ? 'inner' : 1 > z.outerAU ? 'outer' : 'inside';
  return { age, ...r, earthFlux: flux1AU, where };
}

const AGES = {
  id: 'hz-ages',
  get title() {
    return t('hzL.a.title');
  },
  get note() {
    return t('hzL.a.note');
  },
  animated: false,
  controls: [
    {
      id: 'age',
      get label() {
        return t('hzL.a.control.age');
      },
      min: 0.25,
      max: 10,
      step: 0.01,
      value: 4.57,
      decimals: 2,
      format: x => `${fixed(x, 2)} Gyr`,
    },
  ],
  presets: [
    {
      get label() {
        return '1 Gyr';
      },
      values: { age: 1 },
    },
    {
      get label() {
        return '4.57 Gyr';
      },
      values: { age: 4.57 },
    },
    {
      get label() {
        return '8 Gyr';
      },
      values: { age: 8 },
    },
  ],
  draw(canvas, v) {
    const f = agesView(v);
    const grid = AGE_GRID.map(a =>
      zoneAtAge({ trackId: TRACK, ageYr: a * GYR })
    );
    const spec = {
      label: t('hzL.a.title'),
      xTitle: t('hzL.a.axis.x'),
      yTitle: t('hzL.axis.distance'),
      series: [
        {
          id: 'inner',
          label: t('hzL.a.legend.inner'),
          x: AGE_GRID,
          y: grid.map(g => g.zone.conservative.innerAU),
          color: SERIES.violet,
          width: 2,
          mode: 'line',
        },
        {
          id: 'outer',
          label: t('hzL.a.legend.outer'),
          x: AGE_GRID,
          y: grid.map(g => g.zone.conservative.outerAU),
          color: SERIES.blue,
          width: 2,
          mode: 'line',
        },
        {
          id: 'earth',
          label: t('hzL.a.legend.earth'),
          x: [AGE_GRID[0], AGE_GRID[AGE_GRID.length - 1]],
          y: [1, 1],
          color: SERIES.green,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        },
        {
          id: 'now',
          label: t('hzL.a.legend.now'),
          x: [f.age, f.age],
          y: [f.zone.conservative.innerAU, f.zone.conservative.outerAU],
          color: SERIES.orange,
          mode: 'points',
          radius: 5,
        },
      ],
    };
    hostOf(canvas, t('hzL.a.title')).chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = agesView(v);
    const z = f.zone.conservative;
    const d = x => fixed(x, 3);
    return [
      { label: t('hzL.row.model'), value: t('hzL.m.ages'), emphasis: true },
      {
        label: t('hzL.a.row.star'),
        value: t('hzL.a.value.star', {
          L: fixed(f.star.luminositySolar, 3),
          T: fixed(f.star.teffK, 0),
        }),
      },
      {
        label: t('hzL.a.row.zone'),
        value: t('hzL.a.value.zone', {
          inner: d(z.innerAU),
          outer: d(z.outerAU),
        }),
        emphasis: true,
      },
      {
        label: t('hzL.a.row.earth'),
        value: t('hzL.a.value.earth', {
          flux: fixed(f.earthFlux, 3),
          where: t(`hzL.a.where.${f.where}`),
        }),
        emphasis: true,
      },
      { label: t('hzL.a.row.note'), value: t('hzL.a.value.note') },
      { label: t('hzL.row.assumes'), value: t('hzL.as.limits') },
    ];
  },
};

export const HABITABILITY_LIMIT_WIDGETS = [LIMITS, LOCKING, AGES];
