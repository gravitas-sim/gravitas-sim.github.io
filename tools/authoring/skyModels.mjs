// =============================================================================
// The sky investigations' expected values, from the Sky Lab kernel
// -----------------------------------------------------------------------------
// Each is the value a lesson writes as a literal, recomputed here from
// js/kernels/sky (SKY_LAB.md) and the lesson instrument's own facts functions
// (js/skyWidgets.js), in the unit the step asks for. tools/authoring/
// modelChecked.mjs spreads this table into MODELS; tests/skyInvestigations.test.js
// also reads it. Node only: no route downloads any of it.
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  julianDate,
  ttFromUt,
  apparentSun,
  bodyTrack,
  airmassReading,
} from '../../js/kernels/sky/index.js';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

// The instruments fetch the star sidecar by URL; Node serves it from disk.
const realFetch = globalThis.fetch;
globalThis.fetch = (url, ...rest) =>
  typeof url === 'string' && url.startsWith('/sky/')
    ? Promise.resolve({
        ok: true,
        json: async () =>
          JSON.parse(readFileSync(path.join(root, url.slice(1)), 'utf8')),
      })
    : realFetch(url, ...rest);
const W = await import('../../js/skyWidgets.js');
await W.skyReady;

const DEG = Math.PI / 180;
const turning = (nights, star = 1, lat = 40) =>
  W.turningFacts({ lat, nights, star });
const sun = day => apparentSun(ttFromUt(W.REF_JD + day + 0.5));
const wander = (planet, day) => W.wandererFacts({ planet, day });

/** Day number (from 2024-10-01) with the most negative longitude rate for Mars. */
const fastestWestDay = () => {
  let best = [0, 0];
  for (let d = 90; d <= 125; d++) {
    const r = wander(2, d).rateDegPerDay;
    if (r < best[1]) best = [d, r];
  }
  return best[0];
};

const countAtLeast3 = f => f.targets.filter(t => t.usableHours >= 3).length;

export const SKY_MODELS = {
  'the-turning-sky/a-month-on': {
    via: 'js/kernels/sky events.js riseTransitSet: Arcturus at 40 N, the rising time on night 0 less night 30, scaled to 31 nights',
    value: () =>
      ((turning(0).riseMinAfterNoon - turning(30).riseMinAfterNoon) / 30) * 31,
  },
  'the-turning-sky/height-at-the-meridian': {
    via: 'js/kernels/sky events.js riseTransitSet transitAltDeg: Arcturus at 40 N',
    value: () => turning(0).transitAltDeg,
  },
  'the-sun-through-the-year/what-if-the-tilt': {
    via: 'js/kernels/sky solar.js apparentSun at the June solstice with the tilt as the ecliptic obliquity: 90 - 40 + declination',
    value: () => W.seasonFacts({ lat: 40, day: 171, tilt: 10 }).noonAltDeg,
  },
  'the-sun-through-the-year/equinox-longitude': {
    via: 'js/kernels/sky solar.js apparentSun ecliptic longitude at noon UT on 2025-09-22',
    value: () => sun(264).longitudeDeg,
  },
  'phases-and-eclipses/phase-from-elongation': {
    via: 'js/kernels/sky planets.js planetPhase: the illuminated fraction (1 - cos E)/2; tests hold it to js/kernels/sky planetPhase/phaseReading at the instrument’s readings',
    value: () => (1 - Math.cos(60 * DEG)) / 2,
  },
  'phases-and-eclipses/months-between': {
    via: 'js/kernels/sky events.js nextSyzygies: the full Moons of 2025-03-14 and 2025-09-07, in days',
    value: () => {
      const list = m => W.eclipseList({ month: m }).events;
      const mar = list(0).find(e => e.kind === 'full' && e.possible);
      const sep = list(6).find(e => e.kind === 'full' && e.possible);
      return sep.jd - mar.jd;
    },
  },
  'wanderers-on-the-sky/fastest-westward': {
    via: 'js/kernels/sky planets.js planetPhase: Mars’s elongation on the day of its most negative longitude rate',
    value: () => wander(2, fastestWestDay()).elongationDeg,
  },
  'wanderers-on-the-sky/the-inner-limit': {
    via: 'js/kernels/sky planets.js: arcsin of Venus’s orbit radius, 0.723 au (circular orbits)',
    value: () => Math.asin(0.723) / DEG,
  },
  'plan-a-night/airmass-at-thirty': {
    via: 'js/kernels/sky readings.js airmassReading (Kasten and Young) at an altitude of 30 degrees',
    value: () => airmassReading(30).airmass,
  },
  'plan-a-night/count-the-targets': {
    via: 'js/skyWidgets.js planFacts at 30 N on 2025-02-15, airmass 2, Moon 30 degrees: stars with 3 usable hours or more',
    value: () =>
      countAtLeast3(
        W.planFacts({ lat: 30, day: 45, airmassMax: 2, moonSep: 30 })
      ),
  },
  'plan-a-night/tighten-the-limit': {
    via: 'js/skyWidgets.js planFacts with the airmass limit at 1.5',
    value: () =>
      countAtLeast3(
        W.planFacts({ lat: 30, day: 45, airmassMax: 1.5, moonSep: 30 })
      ),
  },
};

/** The deeper steps' values (not literals of the core lesson, so not in MODELS). */
export const SKY_DEPTH_VALUES = {
  'the-turning-sky/sidereal-day': {
    via: '1440 min over 366.2422 turns of the Earth in the tropical year of 365.2422 days',
    value: () => 1440 / 366.2422,
  },
  'the-turning-sky/time-above-the-horizon': {
    via: 'js/kernels/sky events.js riseTransitSet: Arcturus at 40 N, setting less rising time, in hours',
    value: () => turning(0).aboveHours,
  },
  'the-sun-through-the-year/distance-in-percent': {
    via: 'js/kernels/sky solar.js apparentSun distance on the two solstices, inverse square, as a percent',
    value: () => ((sun(171).distanceAu / sun(354).distanceAu) ** 2 - 1) * 100,
  },
  'phases-and-eclipses/eclipse-year': {
    via: 'the regression of the nodes: 1/E = 1/365.2422 + 1/6798.4 per day, halved',
    value: () => 1 / (1 / 365.2422 + 1 / 6798.4) / 2,
  },
  'phases-and-eclipses/saros': {
    via: '242 draconic months of 27.212221 d less 223 synodic months of 29.530589 d',
    value: () => 242 * 27.212221 - 223 * 29.530589,
  },
  'wanderers-on-the-sky/synodic-period': {
    via: 'js/tidalPhysics.js periods: 1/S = 1/P Earth - 1/P Mars with 365.256 and 686.98 d',
    value: () => 1 / (1 / 365.256 - 1 / 686.98),
  },
  'wanderers-on-the-sky/westward-rate': {
    via: 'circular orbits: (29.78 - 24.07) km/s over 0.524 au, in degrees per day',
    value: () =>
      ((29.78 - 24.07) / (0.524 * 1.495978707e8)) * 86400 * (180 / Math.PI),
  },
  'plan-a-night/secant-versus-fit': {
    via: 'js/kernels/sky readings.js airmassReading secantMinusFit at 10 degrees',
    value: () => airmassReading(10).secantMinusFit,
  },
  'plan-a-night/midnight-sun-altitude': {
    via: 'js/kernels/sky events.js bodyTrack: the lowest geometric altitude of the Sun on 2025-06-21 at 60 N',
    value: () => {
      const tr = bodyTrack({ type: 'sun' }, { latDeg: 60, lonDeg: 0 });
      const jd0 = julianDate(2025, 6, 21, 0);
      let lowest = 90;
      for (let i = 0; i < 1440; i++)
        lowest = Math.min(lowest, tr.at(jd0 + i / 1440).altGeom);
      return lowest;
    },
  },
};
