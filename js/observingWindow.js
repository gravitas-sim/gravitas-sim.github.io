// =============================================================================
// When the sky lets you look
// -----------------------------------------------------------------------------
// js/observerGeometry.js answers "which way am I standing relative to the
// orbit". This module answers the other half of the same question, and it is
// the half a real observing programme is actually limited by: the target has to
// be above the horizon, the Sun has to be below it, and the Moon has to be
// somewhere else. A schedule that ignores any of the three is a schedule that
// cannot be executed, and a lesson built on one teaches the wrong thing.
//
// The two modules are deliberately not merged. observerGeometry is a property
// of the *system* - a position angle and an inclination that the student
// chooses freely, because the simulation is a model. This one is a property of
// the *Earth* - a latitude, a declination and a date that the student does not
// get to choose, because the sky is not a model. Keeping them apart is what
// stops a lesson from quietly implying that an inconvenient window could be
// dialled away.
//
// Time is an argument, never a reading
// -----------------------------------------------------------------------------
// Nothing here calls Date.now(), reads a system clock, or asks what day it is.
// Every function takes a Julian Date as a number. That is not fastidiousness:
//
//   - it is what makes the module testable in node, with no browser and no
//     fake timers;
//   - it is what makes a lesson reproducible, in the same way a seeded world
//     is reproducible - two students on two machines on two different days
//     compute the same window for the same night;
//   - and it is what keeps an observing *exercise* from turning into an
//     observing *campaign*. A module that cannot read a clock cannot gate
//     anything on one.
//
// What this models, and what it does not
// -----------------------------------------------------------------------------
// Positions are geocentric and apparent to about the accuracy each series
// claims: the low-precision solar series is good to 0.01 degrees over
// 1950-2050, the truncated lunar series to a few hundredths of a degree in
// longitude. Both are quoted in the checks that validate them.
//
// Deliberately absent, because each would cost more than it buys at the scale a
// planning exercise works at:
//
//   atmospheric refraction   Moves a rising body by about half a degree at the
//                            horizon and under an arcminute above 30 degrees.
//                            The airmass models below already fold the real
//                            atmosphere into their own fit, and a planning
//                            window quoted to the minute does not need it.
//   lunar parallax           Up to about a degree in the Moon's apparent
//                            position. It matters for occultations; it does not
//                            matter for "is the Moon 40 degrees away".
//   delta-T                  UT is used where TT is meant, a difference of
//                            about 70 seconds in this era. That displaces the
//                            Moon by 0.01 degrees and the Sun by 0.0008.
//   the horizon              No terrain, no dome. The airmass limit is the
//                            operative constraint and it bites long before any
//                            real horizon does.
//
// Degrees at the boundary, radians inside. Every exported angle is in degrees,
// because that is what a star catalogue, a site record and a student all use.
// =============================================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** The J2000.0 epoch as a Julian Date. Every series here is referred to it. */
export const J2000 = 2451545.0;

/** Days in a Julian century, which is the unit the classical series use. */
export const DAYS_PER_CENTURY = 36525;

/**
 * How far the Sun has to be below the horizon for the sky to be dark.
 *
 * Astronomical twilight is the -18 degree one: the definition is that the Sun
 * no longer contributes measurable illumination to the sky background, which is
 * the threshold a photometric or a precise-velocity programme cares about. The
 * other two are here because a student will ask what they are, and because the
 * difference between them is the difference between an hour of usable night and
 * none.
 */
export const TWILIGHT = Object.freeze({
  /** Horizon still visible; bright planets out. */
  CIVIL: -6,
  /** Horizon gone; the usual "dark enough to navigate by stars". */
  NAUTICAL: -12,
  /** Sky background no longer lit by the Sun. What a spectrograph needs. */
  ASTRONOMICAL: -18,
});

/** Airmass models, which are not interchangeable near the horizon. */
export const AIRMASS_MODEL = Object.freeze({
  /** sec z. Exact for a flat atmosphere, and wrong by 10% by 80 degrees. */
  SECANT: 'secant',
  /** Kasten & Young (1989). The standard interpolative fit. */
  KASTEN_YOUNG: 'kastenYoung',
});

/**
 * Airmass at the horizon under Kasten & Young.
 *
 * Quoted in the paper and reproduced by the formula exactly; sec z diverges
 * here, which is the whole reason the fit exists.
 */
export const HORIZON_AIRMASS_KY = 37.92;

/** Why a target has no rise or set: it is always up, or never. */
export const CIRCUMSTANCE = Object.freeze({
  /** Crosses the altitude twice a day, as most things do. */
  RISES: 'rises',
  /** Never goes below the altitude from this latitude. */
  ALWAYS_UP: 'alwaysUp',
  /** Never gets above it. */
  NEVER_UP: 'neverUp',
});

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sin = d => Math.sin(d * DEG);
const cos = d => Math.cos(d * DEG);

/** Wrap an angle into [0, 360). */
export const wrap360 = deg => ((deg % 360) + 360) % 360;

/** Wrap an angle into [-180, 180), which is what an hour angle wants. */
export const wrap180 = deg => wrap360(deg + 180) - 180;

// =============================================================================
// Calendar and clock
// =============================================================================

/**
 * A Julian Date from a UTC calendar date.
 *
 * Gregorian only. The algorithm is the standard one (Meeus, Astronomical
 * Algorithms, chapter 7) and is exact in integer arithmetic before the
 * fractional day is added.
 *
 * A lesson uses this to name a night in words - "2026 March 14" - without
 * constructing a Date, which would drag the host machine's timezone into a
 * calculation that must not depend on it.
 *
 * @param {number} year - Gregorian year
 * @param {number} month - 1 to 12
 * @param {number} day - Day of month, may carry a fraction
 * @param {number} [hours] - UTC hours past midnight, may be fractional
 * @returns {number} Julian Date
 */
export function julianDate(year, month, day, hours = 0) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5 +
    hours / 24
  );
}

/**
 * A Julian Date back to a UTC calendar date, for a readout.
 *
 * @param {number} jd - Julian Date
 * @returns {{year: number, month: number, day: number, hours: number,
 *   minutes: number, seconds: number}} UTC
 */
export function calendarDate(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayFloat = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFloat);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  // Rounded to the second, then carried, so 23:59:59.9 does not print as
  // 23:59:60 and a window boundary does not read as an impossible time.
  let rest = (dayFloat - day) * 24;
  let hours = Math.floor(rest);
  rest = (rest - hours) * 60;
  let minutes = Math.floor(rest);
  let seconds = Math.round((rest - minutes) * 60);
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  return { year, month, day, hours, minutes, seconds };
}

/** Julian centuries from J2000.0. @param {number} jd - Julian Date @returns {number} Centuries */
export const julianCenturies = jd => (jd - J2000) / DAYS_PER_CENTURY;

/**
 * Greenwich mean sidereal time, in degrees.
 *
 * The IAU 1982 expression as given by Meeus (12.4). Mean rather than apparent:
 * the equation of the equinoxes is at most about a second of time, which is
 * four hundredths of a degree and far below anything a window is quoted to.
 *
 * @param {number} jd - Julian Date (UT)
 * @returns {number} GMST in degrees, 0 to 360
 */
export function greenwichMeanSiderealTime(jd) {
  const d = jd - J2000;
  const t = d / DAYS_PER_CENTURY;
  return wrap360(
    280.46061837 +
      360.98564736629 * d +
      0.000387933 * t * t -
      (t * t * t) / 38710000
  );
}

/**
 * Local mean sidereal time, in degrees.
 *
 * @param {number} jd - Julian Date (UT)
 * @param {number} longitudeDeg - East positive, the IAU convention
 * @returns {number} LST in degrees, 0 to 360
 */
export const localSiderealTime = (jd, longitudeDeg) =>
  wrap360(greenwichMeanSiderealTime(jd) + longitudeDeg);

/**
 * The hour angle of a right ascension, in degrees.
 *
 * Negative east of the meridian - the target has not culminated yet - and
 * positive west of it, which is the sign every observatory uses.
 *
 * @param {number} jd - Julian Date (UT)
 * @param {number} longitudeDeg - East positive
 * @param {number} raDeg - Right ascension, degrees
 * @returns {number} Hour angle in degrees, -180 to 180
 */
export const hourAngleOf = (jd, longitudeDeg, raDeg) =>
  wrap180(localSiderealTime(jd, longitudeDeg) - raDeg);

/**
 * Local mean solar midnight for the night that a given instant falls in.
 *
 * "The night of the 14th" is a local idea, and the JD day boundary is at noon
 * UT, which is not local anything. This returns the mean solar midnight of the
 * local day containing `jd`, so a caller can step nights by adding one day and
 * get midnights rather than drifting into afternoons.
 *
 * Mean solar, not apparent: the equation of time moves true midnight by up to a
 * quarter of an hour over a year, and a night's anchor that wandered by that
 * much would make a schedule's arithmetic depend on the season.
 *
 * @param {number} jd - Any instant during the local day
 * @param {number} longitudeDeg - East positive
 * @returns {number} Julian Date of local mean midnight
 */
export function localMidnight(jd, longitudeDeg) {
  const offset = longitudeDeg / 360;
  // +0.5 puts the day boundary at midnight rather than noon; the longitude
  // shift moves it from Greenwich to here.
  return Math.floor(jd + 0.5 + offset) - 0.5 - offset;
}

// =============================================================================
// Where a thing is in the sky
// =============================================================================

/**
 * Altitude and azimuth from hour angle and declination.
 *
 * The spherical triangle every observing plan rests on:
 *
 *   sin(alt) = sin(dec) sin(lat) + cos(dec) cos(lat) cos(HA)
 *
 * Azimuth is measured from north through east, which is the convention a site
 * record and a telescope control system both use. It is computed with atan2 so
 * it is unambiguous at the poles of the expression rather than wrapping wrongly
 * in one quadrant, which is the classic bug in the arccos form.
 *
 * @param {object} params
 * @param {number} params.hourAngleDeg - Hour angle, degrees, west positive
 * @param {number} params.declinationDeg - Declination, degrees
 * @param {number} params.latitudeDeg - Site latitude, north positive
 * @returns {{altitudeDeg: number, azimuthDeg: number}} Horizontal coordinates
 */
export function altAz({ hourAngleDeg, declinationDeg, latitudeDeg }) {
  const h = hourAngleDeg;
  const d = declinationDeg;
  const p = latitudeDeg;
  const sinAlt = clamp(sin(d) * sin(p) + cos(d) * cos(p) * cos(h), -1, 1);
  const altitudeDeg = Math.asin(sinAlt) * RAD;
  const y = -sin(h) * cos(d);
  const x = sin(d) * cos(p) - cos(d) * sin(p) * cos(h);
  const azimuthDeg = wrap360(Math.atan2(y, x) * RAD);
  return { altitudeDeg, azimuthDeg };
}

/**
 * Airmass: how much atmosphere the light came through, in units of the zenith.
 *
 * The secant model is sec z, which is what a flat atmosphere of uniform density
 * would give. It is exact at the zenith, good to a percent by 60 degrees from
 * it, and useless below about 15 degrees altitude, where it climbs to infinity
 * and the real atmosphere does not.
 *
 * Kasten & Young (1989) is the standard interpolative fit for the real
 * atmosphere:
 *
 *   X = 1 / ( sin(h) + 0.50572 (h + 6.07995)^-1.6364 )      h in degrees
 *
 * It reproduces a tabulated atmosphere to about a thousandth up to 80 degrees
 * from the zenith, and gives a finite 37.92 at the horizon.
 *
 * Below the horizon there is no airmass, and returning a large number would let
 * a caller's "<= limit" test quietly succeed on a target that has set.
 * Infinity is returned instead, which fails every comparison it should. Exactly
 * at the horizon the fit still has a value - 37.92, the number the paper quotes
 * - so zero is returned finite and the limit test excludes it on its own.
 *
 * @param {number} altitudeDeg - Apparent altitude, degrees
 * @param {string} [model] - From AIRMASS_MODEL
 * @returns {number} Airmass, or Infinity below the horizon
 */
export function airmass(altitudeDeg, model = AIRMASS_MODEL.KASTEN_YOUNG) {
  if (!Number.isFinite(altitudeDeg) || altitudeDeg < 0) return Infinity;
  if (model === AIRMASS_MODEL.SECANT) {
    return 1 / sin(altitudeDeg);
  }
  return (
    1 / (sin(altitudeDeg) + 0.50572 * Math.pow(altitudeDeg + 6.07995, -1.6364))
  );
}

/**
 * The altitude at which a given airmass is reached, under Kasten & Young.
 *
 * The inverse of the above, by bisection rather than algebra: the fit is not
 * invertible in closed form, and a planning tool states its limit as an airmass
 * ("X < 2") while the geometry needs an altitude. Monotone in altitude, so
 * bisection is exact to the tolerance and cannot land on the wrong branch.
 *
 * @param {number} targetAirmass - The limit, 1 or greater
 * @param {string} [model] - From AIRMASS_MODEL
 * @returns {number} Altitude in degrees, 0 to 90
 */
export function altitudeForAirmass(
  targetAirmass,
  model = AIRMASS_MODEL.KASTEN_YOUNG
) {
  if (!(targetAirmass > 1)) return 90;
  if (model === AIRMASS_MODEL.SECANT) {
    return Math.asin(clamp(1 / targetAirmass, -1, 1)) * RAD;
  }
  if (targetAirmass >= HORIZON_AIRMASS_KY) return 0;
  let lo = 0;
  let hi = 90;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (airmass(mid, model) > targetAirmass) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The hour angle at which a target crosses a given altitude.
 *
 * Solving the altitude relation for cos(HA):
 *
 *   cos(H) = ( sin(alt) - sin(dec) sin(lat) ) / ( cos(dec) cos(lat) )
 *
 * The answer is +-H: the target is above the altitude for hour angles between
 * them and below it outside. When the right-hand side leaves [-1, 1] there is
 * no crossing, and the two ways that happens are not the same fact - the target
 * is either always above the altitude or never reaches it - so the caller is
 * told which.
 *
 * @param {object} params
 * @param {number} params.declinationDeg - Declination, degrees
 * @param {number} params.latitudeDeg - Site latitude, degrees
 * @param {number} params.altitudeDeg - The altitude to cross, degrees
 * @returns {{hourAngleDeg: ?number, circumstance: string}} The semi-arc, or why
 *   there is not one
 */
export function hourAngleAtAltitude({
  declinationDeg,
  latitudeDeg,
  altitudeDeg,
}) {
  const denom = cos(declinationDeg) * cos(latitudeDeg);
  if (Math.abs(denom) < 1e-12) {
    // At a pole, or a target exactly at one: altitude does not depend on hour
    // angle at all, so the target is simply above the line or it is not.
    const alt = sin(declinationDeg) * sin(latitudeDeg);
    return {
      hourAngleDeg: null,
      circumstance:
        alt >= sin(altitudeDeg)
          ? CIRCUMSTANCE.ALWAYS_UP
          : CIRCUMSTANCE.NEVER_UP,
    };
  }
  const c = (sin(altitudeDeg) - sin(declinationDeg) * sin(latitudeDeg)) / denom;
  if (c < -1) {
    return { hourAngleDeg: 180, circumstance: CIRCUMSTANCE.ALWAYS_UP };
  }
  if (c > 1) {
    return { hourAngleDeg: null, circumstance: CIRCUMSTANCE.NEVER_UP };
  }
  return {
    hourAngleDeg: Math.acos(c) * RAD,
    circumstance: CIRCUMSTANCE.RISES,
  };
}

/**
 * Angular separation of two equatorial positions, in degrees.
 *
 * The Vincenty form rather than the cosine rule. The cosine rule loses all its
 * precision on small separations - it asks acos() for a number within an ulp of
 * 1 - and small separations are exactly what a Moon-avoidance test and an
 * eclipse check are about.
 *
 * @param {number} ra1 - Right ascension, degrees
 * @param {number} dec1 - Declination, degrees
 * @param {number} ra2 - Right ascension, degrees
 * @param {number} dec2 - Declination, degrees
 * @returns {number} Separation in degrees, 0 to 180
 */
export function angularSeparation(ra1, dec1, ra2, dec2) {
  const dra = (ra2 - ra1) * DEG;
  const d1 = dec1 * DEG;
  const d2 = dec2 * DEG;
  const sd1 = Math.sin(d1);
  const cd1 = Math.cos(d1);
  const sd2 = Math.sin(d2);
  const cd2 = Math.cos(d2);
  const num = Math.hypot(
    cd2 * Math.sin(dra),
    cd1 * sd2 - sd1 * cd2 * Math.cos(dra)
  );
  const den = sd1 * sd2 + cd1 * cd2 * Math.cos(dra);
  return Math.atan2(num, den) * RAD;
}

/**
 * Ecliptic to equatorial, for a position already reduced to date.
 *
 * @param {number} lambdaDeg - Ecliptic longitude
 * @param {number} betaDeg - Ecliptic latitude
 * @param {number} obliquityDeg - Obliquity of the ecliptic
 * @returns {{raDeg: number, decDeg: number}} Equatorial coordinates
 */
export function eclipticToEquatorial(lambdaDeg, betaDeg, obliquityDeg) {
  const sl = sin(lambdaDeg);
  const cl = cos(lambdaDeg);
  const sb = sin(betaDeg);
  const cb = cos(betaDeg);
  const se = sin(obliquityDeg);
  const ce = cos(obliquityDeg);
  const raDeg = wrap360(Math.atan2(sl * ce - (sb / cb) * se, cl) * RAD);
  const decDeg = Math.asin(clamp(sb * ce + cb * se * sl, -1, 1)) * RAD;
  return { raDeg, decDeg };
}

/**
 * The mean obliquity of the ecliptic, in degrees.
 *
 * IAU 1980 / Laskar's polynomial truncated to the cubic term, which is good to
 * about an arcsecond over this era. 23.4392911 degrees at J2000.0.
 *
 * @param {number} jd - Julian Date
 * @returns {number} Obliquity in degrees
 */
export function meanObliquity(jd) {
  const t = julianCenturies(jd);
  return (
    23.439291111 - (46.815 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600
  );
}

// =============================================================================
// The Sun
// -----------------------------------------------------------------------------
// The low-precision series from the Astronomical Almanac, section C: a mean
// longitude, a mean anomaly, and the first two terms of the equation of the
// centre. The Almanac states its own accuracy as 0.01 degrees in longitude over
// 1950 to 2050, which is a hundred times finer than anything a twilight time
// is quoted to, and the checks in tools/physics-checks.mjs hold it to that.
// =============================================================================

/** Kilometres in an astronomical unit. IAU 2012, exact by definition. */
export const AU_KM = 1.495978707e8;

/**
 * Where the Sun is, geocentric and apparent.
 *
 * @param {number} jd - Julian Date (UT, taken as TT; see the header)
 * @returns {{raDeg: number, decDeg: number, longitudeDeg: number,
 *   meanLongitudeDeg: number, distanceAu: number}} The Sun
 */
export function solarPosition(jd) {
  const n = jd - J2000;
  const meanLongitudeDeg = wrap360(280.46061837 + 0.9856474 * n);
  const g = wrap360(357.528 + 0.9856003 * n);
  // The equation of the centre, to two terms. The third is under an arcsecond.
  const longitudeDeg = wrap360(
    meanLongitudeDeg + 1.915 * sin(g) + 0.02 * sin(2 * g)
  );
  const obliquityDeg = meanObliquity(jd);
  const { raDeg, decDeg } = eclipticToEquatorial(longitudeDeg, 0, obliquityDeg);
  return {
    raDeg,
    decDeg,
    longitudeDeg,
    meanLongitudeDeg,
    distanceAu: 1.00014 - 0.01671 * cos(g) - 0.00014 * cos(2 * g),
  };
}

/**
 * The equation of time, in minutes.
 *
 * Apparent solar time minus mean solar time: how far ahead of the clock a
 * sundial reads. Positive means the Sun is ahead. It is here because it is the
 * cleanest external check on the solar series there is - the two annual
 * extremes are published to the second and are produced by the interaction of
 * the two terms the series has, so a sign error or a phase error in either
 * moves them immediately.
 *
 * The 20.5 arcsecond constant is annual aberration, which displaces the
 * apparent Sun and therefore belongs in a comparison against apparent solar
 * time.
 *
 * @param {number} jd - Julian Date
 * @returns {number} Minutes, roughly -14 to +17
 */
export function equationOfTimeMinutes(jd) {
  const sun = solarPosition(jd);
  const delta = wrap180(sun.meanLongitudeDeg - 0.0057183 - sun.raDeg);
  return delta * 4;
}

// =============================================================================
// The Moon
// -----------------------------------------------------------------------------
// The ELP-2000/82 series as truncated by Meeus (Astronomical Algorithms,
// chapter 47), carrying the terms above roughly a thousandth of a degree. The
// full table runs to sixty terms in longitude; this keeps the thirty that
// matter at the accuracy a Moon-avoidance radius is set to, which is degrees.
//
// The checks that validate it are eclipses. An eclipse is a published statement
// about the Sun-Moon elongation accurate to the second, and it constrains the
// series far more sharply than any single coordinate could: a total solar
// eclipse says the elongation was under about a quarter of a degree, and a
// total lunar eclipse says it was within about a degree of a hundred and
// eighty.
// =============================================================================

/**
 * Periodic terms in the Moon's longitude and distance.
 *
 * Each row is [D, M, M', F, coefficient in millionths of a degree, coefficient
 * in metres]. The arguments are the Delaunay variables; the two coefficients
 * belong to the sine series for longitude and the cosine series for distance,
 * which share the same arguments and are therefore tabulated together.
 */
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
];

/**
 * Periodic terms in the Moon's ecliptic latitude.
 *
 * [D, M, M', F, coefficient in millionths of a degree], sine series.
 */
const MOON_B = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
];

/**
 * Where the Moon is, geocentric and apparent.
 *
 * Geocentric: an observer on the surface sees the Moon displaced by up to about
 * a degree of parallax, which matters for an occultation and does not matter
 * for the question this module asks of it.
 *
 * @param {number} jd - Julian Date
 * @returns {{raDeg: number, decDeg: number, longitudeDeg: number,
 *   latitudeDeg: number, distanceKm: number}} The Moon
 */
export function lunarPosition(jd) {
  const t = julianCenturies(jd);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  const Lp = wrap360(
    218.3164477 +
      481267.88123421 * t -
      0.0015786 * t2 +
      t3 / 538841 -
      t4 / 65194000
  );
  const D = wrap360(
    297.8501921 +
      445267.1114034 * t -
      0.0018819 * t2 +
      t3 / 545868 -
      t4 / 113065000
  );
  const M = wrap360(
    357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000
  );
  const Mp = wrap360(
    134.9633964 +
      477198.8675055 * t +
      0.0087414 * t2 +
      t3 / 69699 -
      t4 / 14712000
  );
  const F = wrap360(
    93.272095 +
      483202.0175233 * t -
      0.0036539 * t2 -
      t3 / 3526000 +
      t4 / 863310000
  );

  // The Earth's orbital eccentricity is falling, and terms that depend on the
  // Sun's anomaly have to be scaled by it or they drift out of phase over
  // centuries. Squared where the anomaly enters twice.
  const E = 1 - 0.002516 * t - 0.0000074 * t2;

  let sumL = 0;
  let sumR = 0;
  for (const [d, m, mp, f, cl, cr] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sumL += cl * e * sin(arg);
    sumR += cr * e * cos(arg);
  }
  let sumB = 0;
  for (const [d, m, mp, f, cb] of MOON_B) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sumB += cb * e * sin(arg);
  }

  // Additive terms: Venus (A1), Jupiter (A2) and the flattening of the Earth.
  // Small, but the first is 0.004 degrees and the series is being held to a
  // hundredth in the checks.
  const a1 = wrap360(119.75 + 131.849 * t);
  const a2 = wrap360(53.09 + 479264.29 * t);
  const a3 = wrap360(313.45 + 481266.484 * t);
  sumL += 3958 * sin(a1) + 1962 * sin(Lp - F) + 318 * sin(a2);
  sumB +=
    -2235 * sin(Lp) +
    382 * sin(a3) +
    175 * sin(a1 - F) +
    175 * sin(a1 + F) +
    127 * sin(Lp - Mp) -
    115 * sin(Lp + Mp);

  const longitudeDeg = wrap360(Lp + sumL / 1e6);
  const latitudeDeg = sumB / 1e6;
  const distanceKm = 385000.56 + sumR / 1000;

  const obliquityDeg = meanObliquity(jd);
  const { raDeg, decDeg } = eclipticToEquatorial(
    longitudeDeg,
    latitudeDeg,
    obliquityDeg
  );
  return { raDeg, decDeg, longitudeDeg, latitudeDeg, distanceKm };
}

/** The mean synodic month: new Moon to new Moon, averaged. */
export const SYNODIC_MONTH_DAYS = 29.530588853;

/**
 * How lit the Moon is, and which way it is going.
 *
 * The illuminated fraction is not (1 - cos of the elongation) / 2. That form
 * assumes the Sun is infinitely far away, and the correction is the reason the
 * Moon is not exactly half lit at quadrature. The phase angle is computed
 * properly from the triangle:
 *
 *   tan(i) = R sin(psi) / ( delta - R cos(psi) )
 *
 * with R the Earth-Sun distance, delta the Earth-Moon distance and psi the
 * elongation. k = (1 + cos i) / 2.
 *
 * @param {number} jd - Julian Date
 * @returns {{elongationDeg: number, phaseAngleDeg: number,
 *   illuminatedFraction: number, waxing: boolean, ageDays: number}} The phase
 */
export function lunarPhase(jd) {
  return phaseFrom(solarPosition(jd), lunarPosition(jd));
}

/**
 * The phase, from positions already computed.
 *
 * observability() below needs the Sun and the Moon anyway, and calling
 * lunarPhase() there would compute both a second time - the single most
 * expensive thing in the predicate, evaluated a few hundred times per night.
 *
 * @param {object} sun - From solarPosition
 * @param {object} moon - From lunarPosition
 * @returns {object} The same shape lunarPhase returns
 */
export function phaseFrom(sun, moon) {
  const elongationDeg = angularSeparation(
    sun.raDeg,
    sun.decDeg,
    moon.raDeg,
    moon.decDeg
  );
  const R = sun.distanceAu * AU_KM;
  const phaseAngleDeg =
    Math.atan2(
      R * sin(elongationDeg),
      moon.distanceKm - R * cos(elongationDeg)
    ) * RAD;
  // The ecliptic longitude difference, not the elongation: elongation cannot
  // tell a waxing crescent from a waning one, because it is unsigned.
  const separationInLongitude = wrap360(moon.longitudeDeg - sun.longitudeDeg);
  return {
    elongationDeg,
    phaseAngleDeg,
    illuminatedFraction: (1 + cos(phaseAngleDeg)) / 2,
    waxing: separationInLongitude < 180,
    /** Days since the new Moon, on the mean synodic month. */
    ageDays: (separationInLongitude / 360) * SYNODIC_MONTH_DAYS,
  };
}

// =============================================================================
// The usable window
// -----------------------------------------------------------------------------
// Three conditions have to hold at once for a measurement to be worth taking,
// and they are answered here as one predicate rather than as three windows
// intersected afterwards. That is not a shortcut - it is the only correct way
// to do it. The Moon moves about half a degree an hour, so "the Moon is far
// enough away" is not an interval that can be computed once and intersected;
// it is a condition that turns on and off during the night. An intersection of
// three closed forms would be right in two terms and wrong in the third.
//
// So: one boolean of time, sampled on a grid and refined by bisection. Every
// constraint composes, adding a fourth costs one line, and the interval finder
// has no idea what it is finding, which is what lets the validation suite check
// it against the closed-form rise and set times for the one case that has them.
// =============================================================================

/** Why an instant is not usable. Reported in the order below. */
export const REJECT = Object.freeze({
  /** Usable. */
  OK: 'ok',
  /** The sky is not dark: the Sun is above the twilight limit. */
  TWILIGHT: 'twilight',
  /** The target is below the airmass limit, or below the horizon entirely. */
  AIRMASS: 'airmass',
  /** The Moon is too close to the target. */
  MOON: 'moon',
});

/**
 * The defaults a planning exercise uses, and why each number is that number.
 */
export const WINDOW_DEFAULTS = Object.freeze({
  /** Astronomical twilight. A precise-velocity programme needs a dark sky. */
  sunAltitudeDeg: TWILIGHT.ASTRONOMICAL,
  /** X < 2 is 30 degrees altitude. The usual floor in a time allocation. */
  airmassLimit: 2,
  /** Degrees. Inside 30 the scattered moonlight starts costing signal to
   *  noise on a faint target; the number varies by instrument and this is the
   *  conventional conservative one. */
  moonSeparationDeg: 30,
  /** Minutes between predicate samples when finding a window. A usable
   *  stretch shorter than this can be missed, which no real exposure is. */
  stepMinutes: 2,
  /** Seconds. How tightly a boundary is refined once it is bracketed. */
  refineSeconds: 1,
  /** Which airmass model the limit is expressed in. */
  airmassModel: AIRMASS_MODEL.KASTEN_YOUNG,
});

/**
 * Everything true about one target, at one site, at one instant.
 *
 * The single place the three constraints are evaluated. Returns the numbers as
 * well as the verdict, so a panel can say "the Sun is 11 degrees down" rather
 * than "no", which is the difference between a tool a student learns from and
 * a tool that just refuses them.
 *
 * `reasons` carries every failure; `reason` carries the first in the order
 * twilight, airmass, Moon. That order is how hard each is to work around: you
 * cannot move twilight at all, you can wait out an airmass, and you can
 * sometimes just accept the Moon.
 *
 * @param {number} jd - Julian Date
 * @param {object} params
 * @param {{latitudeDeg: number, longitudeDeg: number}} params.site - The site
 * @param {{raDeg: number, decDeg: number}} params.target - The target
 * @param {object} [params.options] - Overrides for WINDOW_DEFAULTS
 * @returns {object} The full state of the constraint at that instant
 */
export function observability(jd, { site, target, options = {} }) {
  const o = { ...WINDOW_DEFAULTS, ...options };
  const sun = solarPosition(jd);
  const sunHa = hourAngleOf(jd, site.longitudeDeg, sun.raDeg);
  const sunAlt = altAz({
    hourAngleDeg: sunHa,
    declinationDeg: sun.decDeg,
    latitudeDeg: site.latitudeDeg,
  }).altitudeDeg;

  const hourAngleDeg = hourAngleOf(jd, site.longitudeDeg, target.raDeg);
  const { altitudeDeg, azimuthDeg } = altAz({
    hourAngleDeg,
    declinationDeg: target.decDeg,
    latitudeDeg: site.latitudeDeg,
  });
  const x = airmass(altitudeDeg, o.airmassModel);

  const moon = lunarPosition(jd);
  const moonSeparationDeg = angularSeparation(
    moon.raDeg,
    moon.decDeg,
    target.raDeg,
    target.decDeg
  );
  const moonAltitudeDeg = altAz({
    hourAngleDeg: hourAngleOf(jd, site.longitudeDeg, moon.raDeg),
    declinationDeg: moon.decDeg,
    latitudeDeg: site.latitudeDeg,
  }).altitudeDeg;

  const reasons = [];
  if (sunAlt > o.sunAltitudeDeg) reasons.push(REJECT.TWILIGHT);
  if (!(x <= o.airmassLimit)) reasons.push(REJECT.AIRMASS);
  // A Moon below the horizon cannot shine on the target however close it is on
  // the sky, so the separation cut is only applied while it is up. Without
  // this a programme would refuse perfectly dark hours for a Moon that has set.
  if (moonAltitudeDeg > 0 && moonSeparationDeg < o.moonSeparationDeg) {
    reasons.push(REJECT.MOON);
  }

  return {
    jd,
    ok: reasons.length === 0,
    reason: reasons[0] || REJECT.OK,
    reasons,
    hourAngleDeg,
    altitudeDeg,
    azimuthDeg,
    airmass: x,
    sunAltitudeDeg: sunAlt,
    moonSeparationDeg,
    moonAltitudeDeg,
    moonIlluminatedFraction: phaseFrom(sun, moon).illuminatedFraction,
  };
}

/**
 * Every stretch of time in a span for which a predicate holds.
 *
 * Sampled on a fixed grid, then each sign change refined by bisection. The
 * predicate is opaque to this function, which is the point: the same code
 * finds a twilight window, an airmass window and the intersection of all three
 * constraints, and the validation suite can therefore check it on the one case
 * whose answer is known in closed form.
 *
 * Two honesty requirements, both met and neither optional:
 *
 *   A window narrower than one grid step can fall between two samples and be
 *   missed. The default step is two minutes, which is shorter than any
 *   exposure, and the step is reported back so a caller can say what it used.
 *
 *   A window that is already open at the start of the span, or still open at
 *   the end, is marked rather than silently reported as beginning or ending
 *   there. A caller that shows a student "the window opens at 19:04" when the
 *   truth is "it was already open when we started looking" has lied to them.
 *
 * @param {Function} predicate - jd => boolean
 * @param {number} fromJd - Start of the span
 * @param {number} toJd - End of the span
 * @param {object} [opts] - stepMinutes, refineSeconds
 * @returns {Array<{startJd: number, endJd: number, hours: number,
 *   clippedStart: boolean, clippedEnd: boolean}>} The intervals, in order
 */
export function findIntervals(predicate, fromJd, toJd, opts = {}) {
  const stepMinutes = opts.stepMinutes || WINDOW_DEFAULTS.stepMinutes;
  const refineSeconds = opts.refineSeconds || WINDOW_DEFAULTS.refineSeconds;
  const step = stepMinutes / 1440;
  const tol = refineSeconds / 86400;
  if (!(toJd > fromJd) || !(step > 0)) return [];

  /** Where between two samples the predicate flips, to the tolerance. */
  const boundary = (aJd, bJd, valueAtA) => {
    let lo = aJd;
    let hi = bJd;
    while (hi - lo > tol) {
      const mid = (lo + hi) / 2;
      if (predicate(mid) === valueAtA) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const out = [];
  let prevJd = fromJd;
  let prev = predicate(fromJd);
  let openedAt = prev ? fromJd : null;
  let openClipped = prev;

  const count = Math.ceil((toJd - fromJd) / step);
  for (let i = 1; i <= count; i++) {
    const jd = i === count ? toJd : fromJd + i * step;
    const here = predicate(jd);
    if (here !== prev) {
      const edge = boundary(prevJd, jd, prev);
      if (here) {
        openedAt = edge;
        openClipped = false;
      } else if (openedAt !== null) {
        out.push({
          startJd: openedAt,
          endJd: edge,
          hours: (edge - openedAt) * 24,
          clippedStart: openClipped,
          clippedEnd: false,
        });
        openedAt = null;
      }
    }
    prevJd = jd;
    prev = here;
  }
  if (openedAt !== null) {
    out.push({
      startJd: openedAt,
      endJd: toJd,
      hours: (toJd - openedAt) * 24,
      clippedStart: openClipped,
      clippedEnd: true,
    });
  }
  return out;
}

/** Total hours in a list of intervals. */
export const totalHours = intervals =>
  (intervals || []).reduce((s, i) => s + i.hours, 0);

/**
 * When a target culminates, nearest a given instant.
 *
 * Hour angle zero. Sidereal time runs at 360.98564736629 degrees per day of
 * UT, so the offset is one division rather than a search, and wrapping the
 * difference into +-180 picks the culmination on the right side of midnight.
 *
 * @param {number} nearJd - The instant to find the nearest culmination to
 * @param {number} longitudeDeg - East positive
 * @param {number} raDeg - Right ascension of the target
 * @returns {number} Julian Date of culmination
 */
export function transitTime(nearJd, longitudeDeg, raDeg) {
  const lst = localSiderealTime(nearJd, longitudeDeg);
  return nearJd + wrap180(raDeg - lst) / 360.98564736629;
}

/**
 * One night, fully described.
 *
 * The span searched is the whole day centred on local midnight, which contains
 * every night at every latitude: a night cannot be longer than a day, and
 * anchoring on midnight rather than on sunset means a polar night reports as
 * one interval clipped at both ends rather than as two halves of nothing.
 *
 * Three windows are returned and they are not the same thing:
 *
 *   night   when the sky is dark, regardless of the target
 *   target  when the target is above the airmass limit, regardless of the sky
 *   usable  when all three constraints hold at once, which is the only one a
 *           schedule may draw on
 *
 * Giving all three is deliberate. A student whose window is empty needs to see
 * which of the two it was - the target never got high enough, or it was only
 * high in daylight - and a single "usable: none" cannot tell them.
 *
 * @param {object} params
 * @param {{latitudeDeg: number, longitudeDeg: number, name?: string}} params.site
 * @param {{raDeg: number, decDeg: number, name?: string}} params.target
 * @param {number} params.midnightJd - Local mean midnight, from localMidnight()
 * @param {object} [params.options] - Overrides for WINDOW_DEFAULTS
 * @returns {object} The night
 */
export function observingNight({ site, target, midnightJd, options = {} }) {
  const o = { ...WINDOW_DEFAULTS, ...options };
  const from = midnightJd - 0.5;
  const to = midnightJd + 0.5;
  const search = { stepMinutes: o.stepMinutes, refineSeconds: o.refineSeconds };

  const darkAt = jd => {
    const sun = solarPosition(jd);
    return (
      altAz({
        hourAngleDeg: hourAngleOf(jd, site.longitudeDeg, sun.raDeg),
        declinationDeg: sun.decDeg,
        latitudeDeg: site.latitudeDeg,
      }).altitudeDeg <= o.sunAltitudeDeg
    );
  };
  const highAt = jd =>
    airmass(
      altAz({
        hourAngleDeg: hourAngleOf(jd, site.longitudeDeg, target.raDeg),
        declinationDeg: target.decDeg,
        latitudeDeg: site.latitudeDeg,
      }).altitudeDeg,
      o.airmassModel
    ) <= o.airmassLimit;
  const usableAt = jd => observability(jd, { site, target, options: o }).ok;

  const nightIntervals = findIntervals(darkAt, from, to, search);
  const targetIntervals = findIntervals(highAt, from, to, search);
  const usableIntervals = findIntervals(usableAt, from, to, search);

  const transitJd = transitTime(midnightJd, site.longitudeDeg, target.raDeg);
  const maxAltitudeDeg = altAz({
    hourAngleDeg: 0,
    declinationDeg: target.decDeg,
    latitudeDeg: site.latitudeDeg,
  }).altitudeDeg;

  // Reported at the middle of the usable window when there is one, and at
  // midnight when there is not, so the number always describes an instant the
  // student could be observing at rather than an arbitrary one.
  const sampleJd = usableIntervals.length
    ? (usableIntervals[0].startJd + usableIntervals[0].endJd) / 2
    : midnightJd;
  const moonState = observability(sampleJd, { site, target, options: o });
  const phase = phaseFrom(solarPosition(sampleJd), lunarPosition(sampleJd));

  return {
    midnightJd,
    site,
    target,
    options: o,
    night: {
      intervals: nightIntervals,
      hours: totalHours(nightIntervals),
    },
    targetUp: {
      intervals: targetIntervals,
      hours: totalHours(targetIntervals),
      transitJd,
      maxAltitudeDeg,
      circumstance: hourAngleAtAltitude({
        declinationDeg: target.decDeg,
        latitudeDeg: site.latitudeDeg,
        altitudeDeg: altitudeForAirmass(o.airmassLimit, o.airmassModel),
      }).circumstance,
    },
    usable: {
      intervals: usableIntervals,
      hours: totalHours(usableIntervals),
    },
    moon: {
      illuminatedFraction: phase.illuminatedFraction,
      waxing: phase.waxing,
      separationDeg: moonState.moonSeparationDeg,
      altitudeDeg: moonState.moonAltitudeDeg,
      atJd: sampleJd,
    },
  };
}

/**
 * A run of consecutive nights, described the same way.
 *
 * Nights are stepped by adding a mean solar day to the midnight, not by
 * recomputing from a calendar. A sidereal day is four minutes shorter, so the
 * usable window drifts about four minutes earlier every night - which is the
 * single most important fact a student has to discover in a planning exercise,
 * and it would be hidden by any stepping that re-anchored on the target.
 *
 * @param {object} params
 * @param {object} params.site - The site
 * @param {object} params.target - The target
 * @param {number} params.firstMidnightJd - Local midnight of the first night
 * @param {number} params.nights - How many
 * @param {object} [params.options] - Overrides for WINDOW_DEFAULTS
 * @returns {Array<object>} One entry per night, from observingNight
 */
export function observingRun({
  site,
  target,
  firstMidnightJd,
  nights,
  options = {},
}) {
  const out = [];
  const n = Math.max(0, Math.floor(nights) || 0);
  for (let i = 0; i < n; i++) {
    out.push(
      observingNight({
        site,
        target,
        midnightJd: firstMidnightJd + i,
        options,
      })
    );
  }
  return out;
}
