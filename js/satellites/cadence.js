// =============================================================================
// A cadence that can measure the moons (Prompt 193, SATELLITE_EPHEMERIS.md)
// -----------------------------------------------------------------------------
// One sample a night is the usual way to watch the Galilean moons, and it
// cannot measure Io. Io goes round in 1.769 days, 0.565 cycles a day, and a
// sample every day can only see frequencies below 0.5 cycles a day (the
// Nyquist frequency): the data of a moon at 0.565 cycles a day are the data of
// one at 1 - 0.565 = 0.435, a period of 2.30 days, and nothing in them says
// which. This module states that, and plans the cadence that does:
//
//   three nights of hourly sampling inside the observatory's night and above
//   25 degrees of altitude, then one sample a night at a fixed clock time over
//   the rest of the window, a few nights lost to weather (seeded).
//
// The hourly nights tell the alias from the moon; the nightly points, over
// forty days, make the period precise. Pure: no DOM, no fetch.
// =============================================================================

import { twilightTimes } from '../kernels/sky/events.js';
import { gastDeg, ttFromUt } from '../kernels/sky/time.js';
import { toHorizontal } from '../kernels/sky/coords.js';
import { mulberry32 } from '../rng.js';
import {
  MOON_IDS,
  REFERENCE,
  moonsAt,
  poleVector,
  viewOf,
} from './galilean.js';

export const PLAN = Object.freeze({
  /** UT midnight that starts the first night (2025 November 21). */
  firstNightJdUt: 2461000.5,
  nights: 39,
  /** The three nights sampled hourly (December 5, 6 and 7, five weeks before opposition on 2026 January 10). */
  hourlyNightsJdUt: Object.freeze([2461014.5, 2461015.5, 2461016.5]),
  /** The fixed clock time of the nightly sample, hours UT. */
  nightlyUtHours: 8,
  lostNights: 6,
  lostNightsSeed: 193,
  minAltitudeDeg: 25,
  observatory: Object.freeze({
    name: 'Kitt Peak, Arizona (a stated example site)',
    latDeg: 31.9583,
    lonDeg: -111.5997,
  }),
});

const wrap180 = d => ((((d + 180) % 360) + 360) % 360) - 180;

/** Jupiter's altitude from the site at a UT Julian date, degrees (geometric). */
export function jupiterAltitude(model, jdUt, site = PLAN.observatory) {
  const jdTt = ttFromUt(jdUt);
  const eq = model.source.geocentric('jupiter', jdTt);
  // The sky kernel's own equatorial conversion, from the same vector.
  const eps = (23.439291111 * Math.PI) / 180;
  const X = eq[0];
  const Y = eq[1] * Math.cos(eps) - eq[2] * Math.sin(eps);
  const Z = eq[1] * Math.sin(eps) + eq[2] * Math.cos(eps);
  const raDeg = (Math.atan2(Y, X) * 180) / Math.PI;
  const decDeg = (Math.asin(Z / Math.hypot(X, Y, Z)) * 180) / Math.PI;
  const ha = wrap180(gastDeg(jdUt) + site.lonDeg - raDeg);
  return toHorizontal(ha, decDeg, site.latDeg).altDeg;
}

/** Dusk and dawn (nautical) of the night that begins in the UT day from jd0, as JD UT. */
export function nightOf(jd0, site = PLAN.observatory) {
  const t = twilightTimes(jd0, site).nautical;
  return { duskJd: t.duskJd, dawnJd: t.dawnJd };
}

/**
 * The epochs of the observing plan, in time order: the hourly nights, one
 * nightly sample on every other night that was not lost.
 * @returns {Array<{jdUt:number, jdTt:number, night:number, kind:'hourly'|'nightly'}>}
 */
export function designEpochs(model, plan = PLAN) {
  const nights = Array.from(
    { length: plan.nights },
    (_, k) => plan.firstNightJdUt + k
  );
  const hourly = new Set(plan.hourlyNightsJdUt);
  // The nights lost to weather: a seeded draw among the nights that are not hourly.
  const rng = mulberry32(plan.lostNightsSeed);
  const pool = nights.filter(n => !hourly.has(n));
  const lost = new Set();
  while (lost.size < plan.lostNights)
    lost.add(pool[Math.floor(rng() * pool.length)]);
  const epochs = [];
  nights.forEach((jd0, k) => {
    const night = k + 1;
    if (hourly.has(jd0)) {
      const { duskJd, dawnJd } = nightOf(jd0, plan.observatory);
      if (duskJd === null || dawnJd === null) return;
      // Whole UT hours from half an hour after dusk to half an hour before dawn.
      const first = Math.ceil((duskJd + 0.5 / 24 - jd0) * 24 - 1e-9);
      const last = Math.floor((dawnJd - 0.5 / 24 - jd0) * 24 + 1e-9);
      for (let h = first; h <= last; h++) {
        const jdUt = jd0 + h / 24;
        if (
          jupiterAltitude(model, jdUt, plan.observatory) >= plan.minAltitudeDeg
        )
          epochs.push({ jdUt, jdTt: ttFromUt(jdUt), night, kind: 'hourly' });
      }
    } else if (!lost.has(jd0)) {
      const jdUt = jd0 + plan.nightlyUtHours / 24;
      epochs.push({ jdUt, jdTt: ttFromUt(jdUt), night, kind: 'nightly' });
    }
  });
  epochs.sort((a, b) => a.jdUt - b.jdUt);
  return epochs;
}

/** The nightly points alone, as a once-a-night observer would have them. */
export const nightlyOnly = epochs => epochs.filter(e => e.kind === 'nightly');

/**
 * The frequencies a sampling interval cannot tell apart: a signal at f cycles
 * a day looks like |f + k/dt| for any whole k. `aliased` is true when the
 * moon's own frequency is above the Nyquist frequency 1/(2 dt).
 * @param {number} periodDays
 * @param {number} intervalDays - The spacing of the samples
 * @returns {{nyquistPeriodDays: number, aliased: boolean, aliases: Array<{k: number, periodDays: number, belowNyquist: boolean}>}}
 */
export function aliasAnalysis(periodDays, intervalDays, kmax = 2) {
  const f = 1 / periodDays;
  const fs = 1 / intervalDays;
  const aliases = [];
  for (let k = -kmax; k <= kmax; k++) {
    if (k === 0) continue;
    const fa = Math.abs(f + k * fs);
    if (fa < 1e-9) continue;
    aliases.push({ k, periodDays: 1 / fa, belowNyquist: fa <= fs / 2 });
  }
  aliases.sort((a, b) => b.periodDays - a.periodDays);
  return {
    nyquistPeriodDays: 2 * intervalDays,
    aliased: f > fs / 2,
    aliases,
  };
}

/** Every moon's alias analysis for a one-night sampling interval. */
export const nightlyAliasTable = (intervalDays = 1) =>
  Object.fromEntries(
    MOON_IDS.map(id => [
      id,
      aliasAnalysis(REFERENCE[id].periodDays, intervalDays),
    ])
  );

/**
 * The truth marks: each moon's elongation x and offset y (Jupiter radii) at
 * every epoch, from the pack, with no noise.
 * @returns {Array<{epoch: object, view: object, moons: Object}>}
 */
export function truthMarks(model, epochs) {
  return epochs.map(epoch => {
    const { view, moons } = moonsAt(model, epoch.jdTt);
    return { epoch, view, moons };
  });
}

/**
 * How fast the sky frame the elongations are read in (x-hat, y-hat) turns about
 * Jupiter's pole, degrees a day, positive eastward: the Earth's motion and
 * Jupiter's, seen from the Earth. A moon at orbital rate n shows an apparent
 * rate n - rate, so the sidereal period is 1/(1/apparent + rate/360).
 */
export function frameRate(model, jdTt) {
  const a = viewOf(model, jdTt - 0.5);
  const b = viewOf(model, jdTt + 0.5);
  const pole = poleVector(jdTt);
  const dot =
    a.xHat[0] * b.xHat[0] + a.xHat[1] * b.xHat[1] + a.xHat[2] * b.xHat[2];
  const c = [
    a.xHat[1] * b.xHat[2] - a.xHat[2] * b.xHat[1],
    a.xHat[2] * b.xHat[0] - a.xHat[0] * b.xHat[2],
    a.xHat[0] * b.xHat[1] - a.xHat[1] * b.xHat[0],
  ];
  const sin = c[0] * pole[0] + c[1] * pole[1] + c[2] * pole[2];
  return (Math.atan2(sin, dot) * 180) / Math.PI;
}

/** The mean frame rate over a set of epochs, degrees a day. */
export const meanFrameRate = (model, epochs) =>
  epochs.reduce((s, e) => s + frameRate(model, e.jdTt), 0) / epochs.length;

/** The sidereal period from an apparent one and a frame rate (deg/day). */
export const siderealPeriod = (apparentDays, rateDegPerDay) =>
  1 / (1 / apparentDays + rateDegPerDay / 360);
