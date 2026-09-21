// =============================================================================
// The spherical-astronomy module's contract
// -----------------------------------------------------------------------------
// tools/physics-checks.mjs already holds this module against published
// ephemerides: the Almanac's Sun, the eclipse canon's Moon, Kasten & Young's
// airmass. Those checks answer "are the numbers right".
//
// These answer the other question, which a validation suite is the wrong shape
// for: what happens at the edges. A target that never rises, a night that never
// falls, a window already open when the search began, an airmass asked for
// below the horizon. Every one of them has a defined answer in the module and
// every one of them is a place where the obvious implementation returns NaN,
// null or a silent zero and lets a caller carry on.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  AIRMASS_MODEL,
  CIRCUMSTANCE,
  J2000,
  REJECT,
  TWILIGHT,
  WINDOW_DEFAULTS,
  airmass,
  altAz,
  altitudeForAirmass,
  angularSeparation,
  calendarDate,
  findIntervals,
  greenwichMeanSiderealTime,
  hourAngleAtAltitude,
  hourAngleOf,
  julianDate,
  localMidnight,
  localSiderealTime,
  lunarPhase,
  lunarPosition,
  meanObliquity,
  observability,
  observingNight,
  observingRun,
  solarPosition,
  totalHours,
  transitTime,
  wrap180,
  wrap360,
} from '../js/observingWindow.js';

/** La Silla, where the exoplanet lessons observe from. */
const LA_SILLA = { latitudeDeg: -29.2563, longitudeDeg: -70.738 };
/** HD 209458: the target the radial-velocity lessons already use. */
const HD209458 = { raDeg: 330.795, decDeg: 18.8842 };

describe('the calendar', () => {
  test('the J2000 epoch is 2000 January 1 at 12h UT', () => {
    expect(julianDate(2000, 1, 1, 12)).toBe(J2000);
  });

  test('January and February are handled as the previous year', () => {
    // The Meeus algorithm moves them, and getting it wrong shifts every date
    // in two months of the year by one day without touching the other ten.
    expect(julianDate(2026, 3, 1) - julianDate(2026, 2, 28)).toBe(1);
    expect(julianDate(2024, 3, 1) - julianDate(2024, 2, 29)).toBe(1);
    expect(julianDate(2026, 1, 1) - julianDate(2025, 12, 31)).toBe(1);
  });

  test('a date survives the round trip', () => {
    for (const [y, m, d, h] of [
      [1999, 8, 11, 11.05],
      [2026, 9, 5, 0],
      [2026, 12, 31, 23.999],
      [2100, 3, 1, 6.5],
    ]) {
      const back = calendarDate(julianDate(y, m, d, h));
      expect([back.year, back.month, back.day]).toEqual([y, m, d]);
    }
  });

  test('a time that rounds to the next minute carries rather than printing :60', () => {
    // 23:59:59.7 is the case. Printing 23:59:60 as a window boundary is not
    // wrong by much, but it is a time that does not exist.
    const back = calendarDate(
      julianDate(2026, 5, 4, 23 + 59 / 60 + 59.7 / 3600)
    );
    expect(back.seconds).toBeLessThan(60);
    expect(back.minutes).toBeLessThan(60);
  });

  test('local midnight is the same instant whichever hour of the day you ask from', () => {
    const lon = LA_SILLA.longitudeDeg;
    const base = localMidnight(julianDate(2026, 9, 5, 6), lon);
    for (const h of [5, 9, 14, 20, 23.9]) {
      expect(localMidnight(julianDate(2026, 9, 5, h), lon)).toBeCloseTo(
        base,
        9
      );
    }
  });

  test('local midnight steps by exactly one day', () => {
    const lon = LA_SILLA.longitudeDeg;
    const a = localMidnight(julianDate(2026, 9, 5, 6), lon);
    const b = localMidnight(julianDate(2026, 9, 6, 6), lon);
    expect(b - a).toBeCloseTo(1, 12);
  });
});

describe('angles', () => {
  test('wrapping puts angles where the caller needs them', () => {
    expect(wrap360(-1)).toBeCloseTo(359, 12);
    expect(wrap360(721)).toBeCloseTo(1, 12);
    expect(wrap180(190)).toBeCloseTo(-170, 12);
    expect(wrap180(-190)).toBeCloseTo(170, 12);
    // The boundary itself: an hour angle of exactly 180 is west, not east.
    expect(wrap180(180)).toBeCloseTo(-180, 12);
  });

  test('separation is symmetric and zero for a point with itself', () => {
    expect(angularSeparation(100, 20, 100, 20)).toBe(0);
    expect(angularSeparation(10, -40, 200, 35)).toBeCloseTo(
      angularSeparation(200, 35, 10, -40),
      12
    );
  });

  test('the poles are 180 degrees apart at any right ascension', () => {
    expect(angularSeparation(0, 90, 123, -90)).toBeCloseTo(180, 10);
  });
});

describe('altitude and azimuth', () => {
  test('a target at the observer latitude passes through the zenith', () => {
    const { altitudeDeg } = altAz({
      hourAngleDeg: 0,
      declinationDeg: -29.2563,
      latitudeDeg: -29.2563,
    });
    expect(altitudeDeg).toBeCloseTo(90, 9);
  });

  test('azimuth is measured from north through east', () => {
    // A target due south of a northern observer, on the meridian.
    const south = altAz({
      hourAngleDeg: 0,
      declinationDeg: 0,
      latitudeDeg: 40,
    });
    expect(south.azimuthDeg).toBeCloseTo(180, 9);
    // The same target three hours before the meridian is in the southeast.
    const rising = altAz({
      hourAngleDeg: -45,
      declinationDeg: 0,
      latitudeDeg: 40,
    });
    expect(rising.azimuthDeg).toBeGreaterThan(90);
    expect(rising.azimuthDeg).toBeLessThan(180);
  });

  test('altitude is symmetric about the meridian', () => {
    const east = altAz({
      hourAngleDeg: -50,
      declinationDeg: 10,
      latitudeDeg: -30,
    });
    const west = altAz({
      hourAngleDeg: 50,
      declinationDeg: 10,
      latitudeDeg: -30,
    });
    expect(east.altitudeDeg).toBeCloseTo(west.altitudeDeg, 12);
    expect(east.azimuthDeg).toBeCloseTo(360 - west.azimuthDeg, 9);
  });
});

describe('airmass', () => {
  test('below the horizon there is no airmass', () => {
    // Not a large number: a large number passes a "< limit" test on a loose
    // limit, and a target that has set must fail every comparison.
    expect(airmass(-0.001)).toBe(Infinity);
    expect(airmass(-30)).toBe(Infinity);
    expect(airmass(NaN)).toBe(Infinity);
  });

  test('exactly at the horizon the fit still has a value', () => {
    expect(airmass(0)).toBeCloseTo(37.92, 2);
  });

  test('it decreases all the way up', () => {
    let last = Infinity;
    for (let h = 0; h <= 90; h += 0.5) {
      const x = airmass(h);
      expect(x).toBeLessThan(last);
      last = x;
    }
  });

  test('the secant model diverges at the horizon and the fit does not', () => {
    expect(airmass(0.01, AIRMASS_MODEL.SECANT)).toBeGreaterThan(1000);
    expect(airmass(0.01, AIRMASS_MODEL.KASTEN_YOUNG)).toBeLessThan(40);
  });

  test('an airmass limit inverts to an altitude, in both models', () => {
    for (const model of [AIRMASS_MODEL.SECANT, AIRMASS_MODEL.KASTEN_YOUNG]) {
      for (const limit of [1.2, 1.5, 2, 3, 5]) {
        expect(airmass(altitudeForAirmass(limit, model), model)).toBeCloseTo(
          limit,
          8
        );
      }
    }
  });

  test('a limit at or below one is the whole sky above the zenith', () => {
    expect(altitudeForAirmass(1)).toBe(90);
    expect(altitudeForAirmass(0.5)).toBe(90);
  });

  test('a limit past the horizon value returns the horizon', () => {
    expect(altitudeForAirmass(100)).toBe(0);
  });
});

describe('rise and set', () => {
  test('a target too far south from a northern site never comes up', () => {
    const out = hourAngleAtAltitude({
      declinationDeg: -80,
      latitudeDeg: 50,
      altitudeDeg: 0,
    });
    expect(out.circumstance).toBe(CIRCUMSTANCE.NEVER_UP);
    expect(out.hourAngleDeg).toBeNull();
  });

  test('a circumpolar target reports a full semi-arc rather than nothing', () => {
    // 180 degrees, not null: a caller asking "how long is it up" must be able
    // to use the answer, and "always" is a length.
    const out = hourAngleAtAltitude({
      declinationDeg: 80,
      latitudeDeg: 50,
      altitudeDeg: 0,
    });
    expect(out.circumstance).toBe(CIRCUMSTANCE.ALWAYS_UP);
    expect(out.hourAngleDeg).toBe(180);
  });

  test('at the pole the answer does not depend on hour angle', () => {
    const up = hourAngleAtAltitude({
      declinationDeg: 40,
      latitudeDeg: 90,
      altitudeDeg: 20,
    });
    expect(up.circumstance).toBe(CIRCUMSTANCE.ALWAYS_UP);
    const down = hourAngleAtAltitude({
      declinationDeg: 10,
      latitudeDeg: 90,
      altitudeDeg: 20,
    });
    expect(down.circumstance).toBe(CIRCUMSTANCE.NEVER_UP);
  });

  test('the semi-arc shrinks as the altitude limit rises', () => {
    let last = 181;
    for (const alt of [0, 10, 20, 30, 40]) {
      const h = hourAngleAtAltitude({
        declinationDeg: 18.8842,
        latitudeDeg: -29.2563,
        altitudeDeg: alt,
      }).hourAngleDeg;
      expect(h).toBeLessThan(last);
      last = h;
    }
  });
});

describe('sidereal time', () => {
  test('a target culminates when the local sidereal time equals its RA', () => {
    const jd = transitTime(
      julianDate(2026, 9, 15, 3),
      LA_SILLA.longitudeDeg,
      HD209458.raDeg
    );
    expect(
      Math.abs(
        wrap180(localSiderealTime(jd, LA_SILLA.longitudeDeg) - HD209458.raDeg)
      )
    ).toBeLessThan(1e-6);
    expect(
      Math.abs(hourAngleOf(jd, LA_SILLA.longitudeDeg, HD209458.raDeg))
    ).toBeLessThan(1e-6);
  });

  test('the culmination found is the one nearest the instant asked about', () => {
    const near = julianDate(2026, 9, 15, 3);
    expect(
      Math.abs(transitTime(near, LA_SILLA.longitudeDeg, HD209458.raDeg) - near)
    ).toBeLessThan(0.5);
  });

  test('the sidereal clock gains exactly one turn in 365 days', () => {
    // 365 whole days, not a tropical year: the extra rotation the sidereal
    // rate accumulates comes to one full turn over that many DAYS, so the
    // clock lands back where it started. Measuring over 365.2422 days instead
    // leaves the quarter day's worth of extra rotation on the table - 87
    // degrees of it - which is the arithmetic that makes a sidereal day
    // shorter than a solar one in the first place.
    const a = greenwichMeanSiderealTime(J2000);
    const b = greenwichMeanSiderealTime(J2000 + 365);
    expect(Math.abs(wrap180(b - a))).toBeLessThan(0.5);
    // And a quarter day later it is a quarter of a turn on.
    const c = greenwichMeanSiderealTime(J2000 + 365.25);
    expect(wrap180(c - a)).toBeCloseTo(90, 0);
  });
});

describe('the Sun and the Moon', () => {
  test('the obliquity is falling, slowly', () => {
    expect(meanObliquity(J2000)).toBeGreaterThan(meanObliquity(J2000 + 36525));
    expect(meanObliquity(J2000) - meanObliquity(J2000 + 36525)).toBeCloseTo(
      46.815 / 3600,
      6
    );
  });

  test("the Sun's declination stays inside the obliquity all year", () => {
    for (let d = 0; d < 366; d += 1) {
      const jd = julianDate(2026, 1, 1) + d;
      expect(Math.abs(solarPosition(jd).decDeg)).toBeLessThanOrEqual(
        meanObliquity(jd) + 1e-9
      );
    }
  });

  test("the Moon's ecliptic latitude stays inside about five and a half degrees", () => {
    for (let d = 0; d < 400; d += 0.5) {
      expect(Math.abs(lunarPosition(J2000 + d).latitudeDeg)).toBeLessThan(5.6);
    }
  });

  test('the illuminated fraction runs from new to full and back', () => {
    const fractions = [];
    for (let d = 0; d < 30; d += 0.5) {
      fractions.push(
        lunarPhase(julianDate(2026, 9, 1) + d).illuminatedFraction
      );
    }
    expect(Math.min(...fractions)).toBeLessThan(0.02);
    expect(Math.max(...fractions)).toBeGreaterThan(0.98);
    for (const k of fractions) {
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
  });

  test('waxing and waning are distinguished, which the elongation alone cannot do', () => {
    // Two instants a fortnight apart at the same illuminated fraction.
    const first = lunarPhase(julianDate(2026, 9, 1));
    let matched = null;
    for (let d = 8; d < 25; d += 1 / 48) {
      const p = lunarPhase(julianDate(2026, 9, 1) + d);
      if (
        Math.abs(p.illuminatedFraction - first.illuminatedFraction) < 0.01 &&
        p.waxing !== first.waxing
      ) {
        matched = p;
        break;
      }
    }
    expect(matched).not.toBeNull();
    expect(matched.waxing).toBe(!first.waxing);
  });

  test('the age of the Moon runs from zero to a synodic month', () => {
    for (let d = 0; d < 40; d += 0.25) {
      const age = lunarPhase(julianDate(2026, 9, 1) + d).ageDays;
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(29.531);
    }
  });
});

describe('the interval finder', () => {
  const ivs = (pred, from = 0, to = 1) =>
    findIntervals(pred, from, to, { stepMinutes: 1, refineSeconds: 0.05 });

  test('a window in the middle is found with both ends sharp', () => {
    const [w] = ivs(jd => jd > 0.25 && jd < 0.6);
    expect(w.startJd).toBeCloseTo(0.25, 6);
    expect(w.endJd).toBeCloseTo(0.6, 6);
    expect(w.clippedStart).toBe(false);
    expect(w.clippedEnd).toBe(false);
  });

  test('a window already open at the start says so', () => {
    const [w] = ivs(jd => jd < 0.4);
    expect(w.clippedStart).toBe(true);
    expect(w.clippedEnd).toBe(false);
  });

  test('a window still open at the end says so', () => {
    const [w] = ivs(jd => jd > 0.7);
    expect(w.clippedStart).toBe(false);
    expect(w.clippedEnd).toBe(true);
  });

  test('two windows are two windows', () => {
    const found = ivs(jd => jd < 0.2 || jd > 0.8);
    expect(found).toHaveLength(2);
    expect(found[0].clippedStart).toBe(true);
    expect(found[1].clippedEnd).toBe(true);
  });

  test('hours add up to the span they cover', () => {
    const found = ivs(jd => jd < 0.2 || jd > 0.8);
    expect(totalHours(found)).toBeCloseTo(0.4 * 24, 3);
  });

  test('an empty span and a reversed span both yield nothing', () => {
    expect(findIntervals(() => true, 1, 1)).toEqual([]);
    expect(findIntervals(() => true, 1, 0)).toEqual([]);
  });

  test('totalHours tolerates nothing at all', () => {
    expect(totalHours(null)).toBe(0);
    expect(totalHours([])).toBe(0);
  });
});

describe('observability', () => {
  const at = (jd, options) =>
    observability(jd, { site: LA_SILLA, target: HD209458, options });

  test('daylight is refused, and the reason names twilight', () => {
    // Local noon, when nothing about the target can rescue it.
    const noon =
      localMidnight(julianDate(2026, 9, 15, 6), LA_SILLA.longitudeDeg) + 0.5;
    const o = at(noon);
    expect(o.ok).toBe(false);
    expect(o.reasons).toContain(REJECT.TWILIGHT);
    expect(o.sunAltitudeDeg).toBeGreaterThan(0);
  });

  test('every failing constraint is reported, not just the first', () => {
    // A target that has to be within a degree of the Moon is refused for the
    // Moon even when it is also refused for the Sun.
    const noon =
      localMidnight(julianDate(2026, 9, 15, 6), LA_SILLA.longitudeDeg) + 0.5;
    const o = at(noon, { airmassLimit: 1.01 });
    expect(o.reasons.length).toBeGreaterThan(1);
    expect(o.reason).toBe(REJECT.TWILIGHT);
  });

  test('the numbers come back whether or not the verdict is yes', () => {
    const o = at(
      localMidnight(julianDate(2026, 9, 15, 6), LA_SILLA.longitudeDeg)
    );
    for (const key of [
      'hourAngleDeg',
      'altitudeDeg',
      'azimuthDeg',
      'sunAltitudeDeg',
      'moonSeparationDeg',
      'moonAltitudeDeg',
      'moonIlluminatedFraction',
    ]) {
      expect(Number.isFinite(o[key])).toBe(true);
    }
  });

  test('a stricter twilight can only remove usable time', () => {
    const jd = localMidnight(julianDate(2026, 9, 15, 6), LA_SILLA.longitudeDeg);
    const civil = at(jd, { sunAltitudeDeg: TWILIGHT.CIVIL });
    const astro = at(jd, { sunAltitudeDeg: TWILIGHT.ASTRONOMICAL });
    expect(astro.ok ? civil.ok : true).toBe(true);
  });
});

describe('a night', () => {
  const night = (y, m, d, options) =>
    observingNight({
      site: LA_SILLA,
      target: HD209458,
      midnightJd: localMidnight(julianDate(y, m, d, 6), LA_SILLA.longitudeDeg),
      options: { stepMinutes: 5, refineSeconds: 0.5, ...options },
    });

  test('the usable window is never longer than either window it lies inside', () => {
    const n = night(2026, 9, 15);
    expect(n.usable.hours).toBeLessThanOrEqual(n.night.hours + 1e-6);
    expect(n.usable.hours).toBeLessThanOrEqual(n.targetUp.hours + 1e-6);
  });

  test('the target this lesson uses is up for only part of the night', () => {
    // The premise of the planning exercise. If this stopped being true the
    // lesson would still run and would teach nothing.
    const n = night(2026, 9, 15);
    expect(n.targetUp.hours).toBeLessThan(n.night.hours);
    expect(n.targetUp.hours).toBeGreaterThan(4);
  });

  test('a window is reported even on a night with no usable time', () => {
    // December: the target sets before the sky is dark. The night and the
    // target windows still have to come back, because "which of the two ran
    // out" is the only thing a reader can act on.
    const n = night(2026, 12, 20);
    expect(n.usable.hours).toBe(0);
    expect(n.night.hours).toBeGreaterThan(0);
    expect(n.targetUp.hours).toBeGreaterThan(0);
  });

  test('the Moon is described at an instant inside the window when there is one', () => {
    const n = night(2026, 9, 15);
    const [w] = n.usable.intervals;
    expect(n.moon.atJd).toBeGreaterThanOrEqual(w.startJd);
    expect(n.moon.atJd).toBeLessThanOrEqual(w.endJd);
  });

  test('a stricter airmass limit gives a shorter window', () => {
    expect(night(2026, 9, 15, { airmassLimit: 1.6 }).usable.hours).toBeLessThan(
      night(2026, 9, 15, { airmassLimit: 2.5 }).usable.hours
    );
  });

  test('the defaults are the documented ones', () => {
    expect(WINDOW_DEFAULTS.sunAltitudeDeg).toBe(TWILIGHT.ASTRONOMICAL);
    expect(WINDOW_DEFAULTS.airmassLimit).toBe(2);
    expect(night(2026, 9, 15).options.airmassLimit).toBe(2);
  });
});

describe('a run of nights', () => {
  const run = observingRun({
    site: LA_SILLA,
    target: HD209458,
    firstMidnightJd: localMidnight(
      julianDate(2026, 9, 5, 6),
      LA_SILLA.longitudeDeg
    ),
    nights: 6,
    options: { stepMinutes: 5, refineSeconds: 0.5 },
  });

  test('it returns one entry per night', () => {
    expect(run).toHaveLength(6);
  });

  test('the windows walk earlier by a sidereal day, not a solar one', () => {
    // The fact the planning exercise turns on. A solar-day step would put
    // every epoch at the same hour angle plus four minutes of drift; the
    // sidereal step is what makes the drift exactly cancel.
    const starts = run.map(n => n.usable.intervals[0].startJd);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeCloseTo(0.997269566, 5);
    }
  });

  test('asking for no nights is not an error', () => {
    expect(
      observingRun({
        site: LA_SILLA,
        target: HD209458,
        firstMidnightJd: J2000,
        nights: 0,
      })
    ).toEqual([]);
  });
});
