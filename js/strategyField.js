// =============================================================================
// The views of the strategy panels (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/strategyWidgets.js
// and tests/strategyLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated in the widgets: the window, the
// aliases and the verdict are js/kernels/strategy/, the nights are the
// observing-window planner's (js/instruments/strategy.js), and the series is the
// periodic forward model (js/forward/models/periodic.js) observed at the epochs
// the plan produces, with noise from its seeded stream. The series is SYNTHETIC
// and says so: its truth is the period set in the control.
//
// Pure: no DOM, no clock.
// =============================================================================

import {
  COMBS,
  SIDEREAL_DAY,
  baselineOf,
  findPeaks,
  frequencyGrid,
  judgeCadence,
  periodUncertainty,
  phaseCoverage,
  sinusoidResponse,
  spectralWindow,
  planCampaign,
  weatherMask,
} from './kernels/strategy/index.js';
import { findPeriod } from './kernels/variables/period.js';
import { ID_OBSERVING_SETUP } from './names.js';
import { nightsFor } from './instruments/strategy.js';
import { julianDate } from './observingWindow.js';
import { stream } from './random/streams.js';
import * as periodic from './forward/models/periodic.js';

const { Math, Float64Array } = globalThis;

/** The sampling patterns of the window panel, by index. */
export const CADENCES = Object.freeze([
  'one-a-night',
  'three-a-night',
  'scatter',
  'two-seasons',
  'random',
]);
/** Clock offsets of the three-a-night pattern, days (the validation contract's nightlyThree). */
export const THREE_OFFSETS = Object.freeze([-0.11, 0, 0.13]);
/** The scatter of the one-a-night pattern with a varying clock time, days either side. */
export const SCATTER_DAYS = 0.15;
/** The searched periods, days: the same band the verdict reads. */
export const BAND = Object.freeze({ minPeriod: 0.25, maxPeriod: 20 });
/** Stated amplitude of the synthetic variable, in relative flux. */
export const AMPLITUDE = 0.02;

const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

/** The epochs of a pattern, days from the first night. */
export function epochsOf(cadence, nights) {
  const n = Math.max(3, Math.round(nights));
  const sid = SIDEREAL_DAY;
  if (cadence === 0) return Float64Array.from({ length: n }, (_, i) => i * sid);
  if (cadence === 1) {
    const t = [];
    for (let i = 0; i < n; i++)
      for (const o of THREE_OFFSETS) t.push(i * sid + o);
    return Float64Array.from(t).sort();
  }
  if (cadence === 2) {
    const u = stream('experiments', 'strategy-214', 'scatter');
    return Float64Array.from(
      { length: n },
      (_, i) => i * sid + (2 * u() - 1) * SCATTER_DAYS
    ).sort();
  }
  if (cadence === 3) {
    const ns = [];
    for (let i = 0; i < 20; i++) ns.push(i);
    for (let i = 60; i < 80; i++) ns.push(i);
    return Float64Array.from(ns, i => i * sid + 0.013 * (i % 5));
  }
  let s = 214;
  const out = [];
  for (let i = 0; i < 60; i++) {
    out.push((40 * s) / 2 ** 32);
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
  }
  return Float64Array.from(out).sort();
}

/** The values of the window panel's controls, with their defaults. */
export function windowConfig(v = {}) {
  return {
    cadence: idx(v.cadence ?? 0, CADENCES.length),
    period: v.period ?? 0.8,
    nights: Math.round(v.nights ?? 40),
    snr: v.snr ?? 5,
    series: (v.series ?? 0) >= 0.5,
  };
}

/** The synthetic series a set of epochs would produce, and the period the search finds in it. */
export function seriesAt(times, period, snr, seed = 'strategy-214:series') {
  const t0 = times[0];
  const setup = {
    format: ID_OBSERVING_SETUP,
    formatVersion: 1,
    seed,
    epochs: { kind: 'listed', list: Array.from(times, t => t - t0), unit: 'd' },
    noise: { white: { sigma: AMPLITUDE / snr } },
    instrument: { kind: 'photometer' },
    exposure: { time: 0.001, supersample: 1 },
  };
  const obs = periodic.run(
    {
      periodic: {
        kind: 'harmonic',
        periodDays: period,
        t0: 0,
        mean: 1,
        harmonics: [{ amplitude: AMPLITUDE, phaseDeg: 0 }],
      },
    },
    setup
  );
  const col = id => obs.columns.find(c => c.id === id).values;
  const t = Float64Array.from(col('time'));
  const y = Float64Array.from(col('value'));
  const found = findPeriod(t, y, { ...BAND, oversample: 20 });
  const fHat = 1 / found.period;
  const T = baselineOf(t);
  const { sigmaF } = periodUncertainty(t, period, AMPLITUDE, AMPLITUDE / snr);
  return {
    observation: obs,
    t,
    y,
    found,
    fHat,
    period: found.period,
    sigmaPeriod: sigmaF * found.period * found.period,
    rightLobe: Math.abs(fHat - 1 / period) < 0.5 / T,
    grid: found.grid,
    spectrum: found.spectrum,
  };
}

let lastWindow = null;
/** Everything the window panel shows for control values. */
export function windowView(v) {
  const cfg = windowConfig(v);
  const key = JSON.stringify(cfg);
  if (lastWindow?.key === key) return lastWindow.view;
  const t = epochsOf(cfg.cadence, cfg.nights);
  const T = baselineOf(t);
  const f0 = 1 / cfg.period;
  const grid = frequencyGrid(0.02, 3.2, T, 12);
  const response = sinusoidResponse(t, f0, grid);
  const classical = spectralWindow(
    t,
    Float64Array.from(grid, f => f - f0)
  );
  const verdict = judgeCadence(t, cfg.period, {
    snr: cfg.snr,
    combs: [COMBS.siderealDay],
    band: BAND,
  });
  const coverage = phaseCoverage(t, cfg.period, { bins: 20 });
  const peaks = findPeaks(grid, response, { top: 6 });
  const series = cfg.series ? seriesAt(t, cfg.period, cfg.snr) : null;
  const view = {
    cfg,
    times: t,
    baseline: T,
    resolution: 1 / T,
    f0,
    grid,
    response,
    classical,
    verdict,
    coverage,
    peaks,
    series,
  };
  lastWindow = { key, view };
  return view;
}

// ---- the plan panel ---------------------------------------------------------------

/** The facilities of the plan panel (instrument-library ids). */
export const SITES = Object.freeze(['lco-1m0', 'lco-0m35', 'rubin']);
/** Teaching targets: a right ascension and a declination, not catalogue stars. */
export const TARGETS = Object.freeze([
  { raDeg: 180, decDeg: -30 },
  { raDeg: 90, decDeg: 20 },
  { raDeg: 300, decDeg: 45 },
]);
/** The first night of every plan: the local day of this Julian Date. */
export const START_JD = julianDate(2026, 3, 14, 12);

/** The values of the plan panel's controls, with their defaults. */
export function planConfig(v = {}) {
  return {
    site: idx(v.site ?? 0, SITES.length),
    target: idx(v.target ?? 0, TARGETS.length),
    nights: Math.round(v.nights ?? 14),
    perNight: Math.round(v.perNight ?? 3),
    spacing: v.spacing ?? 1.5,
    exposure: Math.round(v.exposure ?? 300),
    overhead: Math.round(v.overhead ?? 60),
    pClear: v.pClear ?? 0.6,
    persistence: v.persistence ?? 0.5,
    seed: Math.round(v.seed ?? 3),
    period: v.period ?? 0.8,
    snr: v.snr ?? 5,
    run: (v.run ?? 0) >= 0.5,
  };
}

let lastNights = null;
const nightsOf = cfg => {
  const key = `${cfg.site}|${cfg.target}|${cfg.nights}`;
  if (lastNights?.key === key) return lastNights.nights;
  const nights = nightsFor({
    facility: SITES[cfg.site],
    target: TARGETS[cfg.target],
    startJd: START_JD,
    nights: cfg.nights,
  });
  lastNights = { key, nights };
  return nights;
};

/** The plan, its cost and (when asked) the series it would produce and the period found in it. */
export function planView(v) {
  const cfg = planConfig(v);
  const nights = nightsOf(cfg);
  const clear = weatherMask({
    nights: nights.length,
    pClear: cfg.pClear,
    persistence: cfg.persistence,
    seed: `strategy-214:plan:${cfg.seed}`,
  });
  const plan = planCampaign({
    nights,
    cadence: {
      perNight: cfg.perNight,
      spacingHours: cfg.spacing,
      placement: 'centre',
    },
    exposureSeconds: cfg.exposure,
    overheadSeconds: cfg.overhead,
    clear,
  });
  const times = Float64Array.from(plan.times);
  const verdict =
    times.length >= 3
      ? judgeCadence(times, cfg.period, {
          snr: cfg.snr,
          combs: [COMBS.siderealDay],
          band: BAND,
        })
      : null;
  const series =
    cfg.run && times.length >= 8 ? seriesAt(times, cfg.period, cfg.snr) : null;
  const rows = plan.nights.map((r, i) => {
    const night = nights[i];
    const iv = night.usable.intervals.reduce(
      (b, x) => (!b || x.endJd - x.startJd > b.endJd - b.startJd ? x : b),
      null
    );
    return {
      ...r,
      opensH: iv ? (iv.startJd - night.midnightJd) * 24 : null,
      closesH: iv ? (iv.endJd - night.midnightJd) * 24 : null,
    };
  });
  return { cfg, nights, clear, plan, rows, times, verdict, series };
}
