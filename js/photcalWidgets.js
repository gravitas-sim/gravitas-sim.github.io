// =============================================================================
// The photometric-calibration panel (Prompt 212, PHOTOMETRIC_CALIBRATION.md)
// -----------------------------------------------------------------------------
// A synthetic night of standard stars (js/photcalField.js: catalogue magnitudes
// and colours known, instrumental magnitudes drawn from a stated truth), the fit
// of Z1 - k (X - 1) + c C to it (js/kernels/detector/photcal.js), the residuals
// through the plot component, and the calibrated magnitude of one target with
// the uncertainty the fit leaves. The calibrated results are kept as
// gravitas.artifact records (js/instruments/photcal.js).
//
// Nothing is calculated here: every number is the kernel's, and
// tests/photometricLessons.test.js recomputes each one a lesson states. The night
// is synthetic and says so; the truth stays hidden until the reader asks for it.
// The extinction here is ATMOSPHERIC (magnitudes per airmass); the interstellar
// extinction of the radiation model is a different quantity and is not used.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_PHOTCAL } from './i18n/en.photcal.js';
import { ES_PHOTCAL } from './i18n/es.photcal.js';
import { fixed } from './format.js';
import { createChart } from './plot/mount.js';
import { calibrate, solveNight, LIMITS } from './kernels/detector/photcal.js';
import { drawNight, drawTarget, NIGHT_DEFAULTS } from './photcalField.js';
import { extinctionPrior } from './instruments/photcal.js';

registerMessages('en', EN_PHOTCAL);
registerMessages('es', ES_PHOTCAL);

const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

/** The three nights: what the instrument and the air did. Every one is a stated truth, not an observatory's. */
export const NIGHTS = Object.freeze([
  {
    id: 'clear',
    truth: { Z1: 24.8, k: 0.21, c: 0.08, k2: 0 },
    airmasses: NIGHT_DEFAULTS.airmasses,
  },
  {
    id: 'narrow',
    truth: { Z1: 24.8, k: 0.21, c: 0.08, k2: 0 },
    airmasses: [1.3, 1.36, 1.42, 1.3, 1.36, 1.42],
  },
  {
    id: 'colour',
    truth: { Z1: 24.8, k: 0.21, c: 0.08, k2: -0.04 },
    airmasses: NIGHT_DEFAULTS.airmasses,
  },
]);
/** Airmasses a star may be observed at beyond the limit, so a night can show what the limit does. */
const EXTRA = [2.7, 3.0];
/** The target's catalogue magnitude, its instrumental noise and the seed of its draw. */
export const TARGET = Object.freeze({
  M: 13.2,
  sigma: 0.008,
  seed: 'photcal-212',
});
/** The library coefficient used as a prior: Rubin r, a cited value for another site, with an assumed sigma. */
export const PRIOR_SITE = Object.freeze({ facility: 'rubin', band: 'r' });

/** The inputs a set of control values means. */
export function configOf(v = {}) {
  return {
    night: idx(v.night, NIGHTS.length),
    stars: Math.max(2, Math.min(14, Math.round(v.stars ?? 14))),
    noise: Math.max(1, Math.min(20, v.noise ?? 5)),
    reach: Math.max(1.4, Math.min(3, v.reach ?? 2.4)),
    second: (v.model ?? 0) >= 0.5,
    prior: (v.prior ?? 0) >= 0.5,
    view: idx(v.view, 3),
    colour: Math.max(-0.2, Math.min(1.6, v.colour ?? 0.8)),
    airmass: Math.max(1.05, Math.min(3, v.airmass ?? 1.9)),
    truth: (v.truth ?? 0) >= 0.5,
  };
}

/** The standards kept for a count: evenly spaced in colour, so two of them are the bluest and the reddest. */
const pick = n =>
  Array.from({ length: n }, (_, i) => Math.round((i * 13) / (n - 1)));

let last = null;
/** The night, its solution and the calibrated target for control values (the last is kept: draw and readout both ask). */
export function calibrationView(v) {
  const cfg = configOf(v);
  const key = JSON.stringify(cfg);
  if (last?.key === key) return last.view;
  const spec = NIGHTS[cfg.night];
  const list = [...spec.airmasses, ...EXTRA].filter(x => x <= cfg.reach + 1e-9);
  const night = drawNight({
    seed: `photcal-212:${spec.id}`,
    truth: spec.truth,
    airmasses: spec.id === 'narrow' ? spec.airmasses : list,
    perStar: spec.id === 'narrow' ? 3 : Math.min(3, list.length),
    sigmaInst: cfg.noise / 1000,
  });
  const keep = new Set(pick(cfg.stars).map(i => night.stars[i].id));
  const observations = night.observations.filter(o => keep.has(o.star));
  const site = cfg.prior
    ? extinctionPrior(PRIOR_SITE.facility, PRIOR_SITE.band)
    : null;
  const solution = solveNight(observations, {
    second: cfg.second,
    ...(site
      ? {
          extinctionPrior: {
            k: site.k,
            sigma: site.sigma,
            source: site.source,
          },
        }
      : {}),
  });
  const target = drawTarget(night, {
    id: 'target',
    M: TARGET.M,
    C: cfg.colour,
    X: cfg.airmass,
    sigma: TARGET.sigma,
    seed: TARGET.seed,
  });
  const calibrated = solution.ok ? calibrate(solution, target) : null;
  const view = { cfg, night, observations, solution, target, calibrated, site };
  last = { key, view };
  return view;
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
  decimals: step < 1 ? 1 : 0,
  format,
});

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 260,
      legendMinHeight: 24,
      number: x => fixed(x, Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 1 ? 2 : 3),
      labels: { legend: t('pcW.chart') },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}
const COLOURS = { used: '#1c7ed6', out: '#e8590c', fit: '#2f9e44' };

/** The chart's spec for the chosen view. */
export function chartSpec(view) {
  const { cfg, solution, observations } = view;
  if (!solution.ok) return null;
  const used = new Set(solution.used);
  const pc = solution.parameters.c;
  const cTerm =
    pc.status === 'constrained' || pc.status === 'fixed' ? (pc.value ?? 0) : 0;
  const inX = observations.filter(o => used.has(o.id));
  const out = observations.filter(o => !used.has(o.id));
  const num = x => fixed(x, 2);
  if (cfg.view === 0) {
    // m - M with the colour term taken out: the Bouguer line, whose slope is k
    const y = o => o.m - o.M + cTerm * o.C;
    const Z = solution.parameters.Z1.value ?? solution.reference?.value ?? 0;
    const k = solution.parameters.k.value ?? 0;
    const xs = [1, Math.max(...inX.map(o => o.X), 1.2)];
    const series = [
      {
        id: 'used',
        label: t('pcW.legend.used'),
        x: inX.map(o => o.X),
        y: inX.map(y),
        color: COLOURS.used,
        mode: 'points',
        radius: 3.5,
      },
    ];
    if (out.length)
      series.push({
        id: 'out',
        label: t('pcW.legend.out'),
        x: out.map(o => o.X),
        y: out.map(y),
        color: COLOURS.out,
        mode: 'points',
        radius: 4,
      });
    if (solution.parameters.Z1.status === 'constrained')
      series.push({
        id: 'fit',
        label: t('pcW.legend.fit', { k: fixed(k, 3) }),
        x: xs,
        y: xs.map(x => -Z + k * (x - 1)),
        color: COLOURS.fit,
        width: 2,
        dash: [5, 3],
        mode: 'line',
      });
    return {
      label: t('pcW.chart'),
      xTitle: t('pcW.axis.airmass'),
      yTitle: t('pcW.axis.bouguer'),
      xNumber: num,
      yNumber: x => fixed(x, 2),
      series,
    };
  }
  const xOf = cfg.view === 1 ? r => r.X : r => r.C;
  const res = solution.residuals;
  const xr = [Math.min(...res.map(xOf)), Math.max(...res.map(xOf))];
  return {
    label: t('pcW.chart'),
    xTitle: t(cfg.view === 1 ? 'pcW.axis.airmass' : 'pcW.axis.colour'),
    yTitle: t('pcW.axis.residual'),
    xNumber: num,
    yNumber: x => fixed(x, 3),
    series: [
      {
        id: 'res',
        label: t('pcW.legend.res'),
        x: res.map(xOf),
        y: res.map(r => r.residual),
        sigma: res.map(r => r.sigma),
        color: COLOURS.used,
        mode: 'points',
        radius: 3.5,
      },
      {
        id: 'zero',
        label: t('pcW.legend.zero'),
        x: xr,
        y: [0, 0],
        color: COLOURS.fit,
        width: 1.5,
        mode: 'line',
      },
    ],
  };
}

const PHOTOMETRIC_CALIBRATION = {
  id: 'photometric-calibration',
  get title() {
    return t('pcW.title');
  },
  get note() {
    return t('pcW.note');
  },
  animated: false,
  controls: [
    {
      id: 'night',
      get label() {
        return t('pcW.control.night');
      },
      min: 0,
      max: NIGHTS.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`pcW.night.${idx(x, NIGHTS.length)}`),
    },
    numeric('stars', 'pcW.control.stars', 2, 14, 1, 14, x => fixed(x, 0)),
    numeric('noise', 'pcW.control.noise', 1, 20, 1, 5, x =>
      t('pcW.v.mmag', { n: fixed(x, 0) })
    ),
    numeric('reach', 'pcW.control.reach', 1.4, 3, 0.1, 2.4, x => fixed(x, 1)),
    {
      id: 'model',
      get label() {
        return t('pcW.control.model');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`pcW.model.${Math.round(x)}`),
    },
    {
      id: 'prior',
      get label() {
        return t('pcW.control.prior');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`pcW.toggle.${Math.round(x)}`),
    },
    {
      id: 'view',
      get label() {
        return t('pcW.control.view');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`pcW.view.${idx(x, 3)}`),
    },
    numeric('colour', 'pcW.control.colour', -0.2, 1.6, 0.1, 0.8, x =>
      fixed(x, 1)
    ),
    numeric('airmass', 'pcW.control.airmass', 1.05, 3, 0.05, 1.9, x =>
      fixed(x, 2)
    ),
    {
      id: 'truth',
      get label() {
        return t('pcW.control.truth');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: x => t(`pcW.toggle.${Math.round(x)}`),
    },
  ],
  actions: [
    {
      id: 'keep',
      get label() {
        return t('pcW.action.keep');
      },
    },
  ],
  draw(canvas, v) {
    const view = calibrationView(v);
    const host = hostOf(canvas);
    const spec = chartSpec(view);
    if (!spec) return undefined;
    host.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const m = calibrationView(v);
    const s = m.solution;
    const rows = [{ label: t('pcW.row.model'), value: t('pcW.m') }];
    if (!s.ok) {
      rows.push({
        label: t('pcW.row.status'),
        value: t(`pcW.refuse.${s.code}`, { id: s.id ?? '' }),
        emphasis: true,
      });
      return rows;
    }
    const st = p => (p.status === 'prior' ? t('pcW.v.fromPrior') : '');
    const pm = (p, d) =>
      p.value === null
        ? t('pcW.v.notConstrained')
        : t('pcW.v.pm', { v: fixed(p.value, d), s: fixed(p.sigma ?? 0, d) });
    rows.push({
      label: t('pcW.row.night'),
      value: t('pcW.v.night', {
        n: s.night.standards,
        o: s.night.observations,
        lo: fixed(Math.min(...s.residuals.map(r => r.X)), 2),
        hi: fixed(Math.max(...s.residuals.map(r => r.X)), 2),
      }),
    });
    if (s.excluded.length)
      rows.push({
        label: t('pcW.row.excluded'),
        value: t('pcW.v.excluded', {
          n: s.excluded.length,
          lim: fixed(LIMITS.airmass, 1),
        }),
      });
    rows.push(
      {
        label: t('pcW.row.zero'),
        value:
          s.parameters.Z1.status === 'constrained'
            ? t('pcW.v.zero', { z: pm(s.parameters.Z1, 3) })
            : t('pcW.v.zeroOpen'),
        emphasis: true,
      },
      {
        label: t('pcW.row.k'),
        value:
          `${pm(s.parameters.k, 3)} ${t('pcW.v.perAirmass')} ${st(s.parameters.k)}`.trim(),
        emphasis: true,
      },
      {
        label: t('pcW.row.c'),
        value: pm(s.parameters.c, 3),
        emphasis: true,
      }
    );
    if (m.cfg.second)
      rows.push({ label: t('pcW.row.k2'), value: pm(s.parameters.k2, 3) });
    rows.push({
      label: t('pcW.row.fit'),
      value:
        s.dof > 0
          ? t('pcW.v.fit', {
              c: fixed(s.chi2, 1),
              d: s.dof,
              p: fixed(s.p ?? 1, 3),
              r: fixed(1000 * s.rms, 1),
            })
          : t('pcW.v.fitNone'),
    });
    if (s.secondOrder)
      rows.push({
        label: t('pcW.row.nested'),
        value: t('pcW.v.nested', {
          d: fixed(s.secondOrder.deltaChi2, 1),
          p: s.secondOrder.p < 0.001 ? '< 0.001' : fixed(s.secondOrder.p, 3),
        }),
      });
    const c = m.calibrated;
    if (c?.ok) {
      const iv = c.intervals[1];
      rows.push({
        label: t('pcW.row.target'),
        value: t('pcW.v.target', {
          m: fixed(m.target.m, 3),
          M: fixed(c.M, 3),
          s: fixed(c.sigma, 3),
          lo: fixed(iv.lo, 3),
          hi: fixed(iv.hi, 3),
        }),
        emphasis: true,
      });
    } else if (c)
      rows.push({
        label: t('pcW.row.target'),
        value: t(`pcW.refuse.${c.code}`, { id: '' }),
        emphasis: true,
      });
    if (m.cfg.truth) {
      const T = m.night.truth;
      rows.push({
        label: t('pcW.row.truth'),
        value: t('pcW.v.truth', {
          z: fixed(T.Z1, 3),
          k: fixed(T.k, 3),
          c: fixed(T.c, 3),
          M: fixed(TARGET.M, 3),
        }),
      });
    }
    const flags = [...new Set(s.flags.map(f => f.code))].filter(
      f => f !== 'outlier'
    );
    for (const f of c?.ok ? c.flags : [])
      if (!flags.includes(f.code)) flags.push(f.code);
    rows.push({
      label: t('pcW.row.flags'),
      value: flags.length
        ? flags.map(f => t(`pcW.flag.${f}`)).join('; ')
        : t('pcW.v.noflags'),
    });
    rows.push({ label: t('pcW.row.assumes'), value: t('pcW.a') });
    return rows;
  },
  async act(id, v) {
    if (id !== 'keep') return;
    const m = calibrationView(v);
    if (!m.solution.ok || !m.calibrated) return;
    const { keepCalibration } = await import('./photcalKeep.js');
    await keepCalibration(m);
  },
};

export const PHOTCAL_WIDGETS = [PHOTOMETRIC_CALIBRATION];
