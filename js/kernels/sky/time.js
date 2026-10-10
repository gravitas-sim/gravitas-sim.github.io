// =============================================================================
// Sky kernel: time
// -----------------------------------------------------------------------------
// Delta-T, the nutation series, apparent sidereal time, precession (rigorous
// and first order) and the periodic part of TDB - TT. Julian date and calendar
// date are copies of js/observingWindow.js's (./moon.js says why), re-exported so a caller of the sky kernel
// needs one import.
//
// Pure: no DOM, no clock, no module state; importable in Node and in a Worker.
// Time arguments are Julian dates and nothing reads a clock.
//
// The stated approximations (SKY_LAB.md has the measured errors):
//   - Civil time (UTC) is used as UT1. They differ by less than 0.9 s, which is
//     13.5 arcseconds of Earth rotation (0.004 degree).
//   - Delta-T is the IERS value on 1 January of each year 1972-2025 (54
//     numbers) with linear interpolation, the Espenak-Meeus polynomial before
//     1972 and 0.1 s per year after 2025. After 2025 it is a range, not an
//     accuracy (deltaTRangeSec); the table needs one new number a year.
//   - TDB is never used where TT is accurate enough. TDB - TT is two terms.
//   - Valid for 1900-2100.
// =============================================================================

export { julianDate, calendarDate } from './moon.js';

export const J2000 = 2451545.0;
const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
export const wrap360 = d => ((d % 360) + 360) % 360;
const sin = d => Math.sin(d * DEG);
const cos = d => Math.cos(d * DEG);

// --- delta-T = TT - UT1, seconds ------------------------------------------
// 1972-2025: the measured value on 1 January of each year, from the IERS EOP 20
// C04 series (UT1-UTC) and the leap-second table (TT-UTC = 32.184 s + TAI-UTC).
// Rounded to 0.01 s. 54 numbers, about 270 bytes.
const DT_FIRST = 1972;
const DT_TABLE = [
  42.23, 43.37, 44.48, 45.48, 46.46, 47.52, 48.53, 49.59, 50.54, 51.38, 52.17,
  52.96, 53.79, 54.34, 54.87, 55.32, 55.82, 56.3, 56.86, 57.57, 58.31, 59.12,
  59.98, 60.79, 61.63, 62.3, 62.97, 63.47, 63.83, 64.09, 64.3, 64.47, 64.57,
  64.69, 64.85, 65.15, 65.46, 65.78, 66.07, 66.32, 66.6, 66.91, 67.28, 67.64,
  68.1, 68.59, 68.97, 69.22, 69.36, 69.36, 69.29, 69.2, 69.18, 69.14,
];
const DT_LAST = DT_FIRST + DT_TABLE.length - 1; // 2025

/** The decimal year of a Julian date (to a day, which is all delta-T needs). */
export const yearOf = jd => 2000 + (jd - J2000) / 365.25;

/**
 * Espenak and Meeus (NASA, 2006) polynomial, 1900-2150. The pre-1972 form and
 * the comparison for the table; it drifts from the measured values after 2005.
 */
export function deltaTPolynomial(y) {
  let t;
  if (y < 1920) {
    t = y - 1900;
    return (
      -2.79 +
      1.494119 * t -
      0.0598939 * t ** 2 +
      0.0061966 * t ** 3 -
      0.000197 * t ** 4
    );
  }
  if (y < 1941) {
    t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (y < 2005) {
    t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
}

/** Delta-T in seconds: the measured table 1972-2025, the polynomial before, a
 *  slow extrapolation after (0.1 s per year, uncertain by about 0.5 s per year). */
export function deltaT(jd) {
  const y = yearOf(jd);
  if (y < DT_FIRST) return deltaTPolynomial(y);
  if (y >= DT_LAST) return DT_TABLE[DT_TABLE.length - 1] + 0.1 * (y - DT_LAST);
  const i = Math.floor(y - DT_FIRST);
  const f = y - DT_FIRST - i;
  return DT_TABLE[i] + f * (DT_TABLE[i + 1] - DT_TABLE[i]);
}

/**
 * How far delta-T may be from the truth, in seconds, as a stated range and not
 * a measured accuracy: 0.1 s inside the table (its own rounding and the
 * interpolation, measured at 0.069 s on the July points), and after the last
 * measured year the extrapolation is uncertain by about 0.5 s per year. Before
 * 1972 the polynomial was not validated here (null): no IERS series in this
 * kernel's reference reaches it.
 * @param {number} jd - Julian date
 * @returns {number|null} Seconds
 */
export function deltaTRangeSec(jd) {
  const y = yearOf(jd);
  if (y < DT_FIRST) return null;
  if (y <= DT_LAST) return 0.1;
  return 0.1 + 0.5 * (y - DT_LAST);
}

/** TT as a Julian date from UT (UTC taken as UT1). */
export const ttFromUt = jdUt => jdUt + deltaT(jdUt) / 86400;

/** TDB - TT in seconds, two terms of the Fairhead and Bretagnon series. */
export function tdbMinusTt(jdTt) {
  const g = wrap360(357.53 + 0.9856003 * (jdTt - J2000));
  return 0.001657 * sin(g) + 0.000014 * sin(2 * g);
}

// --- nutation, IAU 1980, the 20 largest terms ------------------------------
// [D, M, M', F, Omega, dpsi, dpsi*T, deps, deps*T], coefficients in 0.0001".
const NUT = [
  [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
  [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
  [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
  [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
  [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
  [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
  [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
  [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
  [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
  [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
  [-2, 0, 1, 0, 0, -158, 0, 0, 0],
  [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
  [0, 0, -1, 2, 2, 123, 0, -53, 0],
  [2, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
  [2, 0, -1, 2, 2, -59, 0, 26, 0],
  [0, 0, -1, 0, 1, -58, -0.1, 32, 0],
  [0, 0, 1, 2, 1, -51, 0, 27, 0],
  [-2, 0, 2, 0, 0, 48, 0, 0, 0],
  [0, 0, -2, 2, 1, 46, 0, -24, 0],
];

export const centuries = jdTt => (jdTt - J2000) / 36525;

/** Nutation in longitude and obliquity, arcseconds, at a TT Julian date. */
export function nutation(jdTt) {
  const t = centuries(jdTt);
  const D =
    297.85036 + 445267.11148 * t - 0.0019142 * t * t + (t * t * t) / 189474;
  const M =
    357.52772 + 35999.05034 * t - 0.0001603 * t * t - (t * t * t) / 300000;
  const Mp =
    134.96298 + 477198.867398 * t + 0.0086972 * t * t + (t * t * t) / 56250;
  const F =
    93.27191 + 483202.017538 * t - 0.0036825 * t * t + (t * t * t) / 327270;
  const O =
    125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000;
  let dpsi = 0;
  let deps = 0;
  for (const [d, m, mp, f, o, a, b, c, e] of NUT) {
    const arg = d * D + m * M + mp * Mp + f * F + o * O;
    dpsi += (a + b * t) * sin(arg);
    deps += (c + e * t) * cos(arg);
  }
  return { dpsiArcsec: dpsi / 1e4, depsArcsec: deps / 1e4 };
}

/** Mean obliquity, degrees (IAU 1976, as in Meeus 22.2). */
export const meanObliquityDeg = jdTt => {
  const t = centuries(jdTt);
  return (
    23.439291111 - (46.815 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600
  );
};

/** Greenwich mean sidereal time, degrees, from UT (Meeus 12.4). */
export function gmstDeg(jdUt) {
  const d = jdUt - J2000;
  const t = d / 36525;
  return wrap360(
    280.46061837 +
      360.98564736629 * d +
      0.000387933 * t * t -
      (t * t * t) / 38710000
  );
}

/** Greenwich apparent sidereal time, degrees: GMST plus the equation of the equinoxes. */
export function gastDeg(jdUt, jdTt = ttFromUt(jdUt)) {
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt) + depsArcsec / 3600;
  return wrap360(gmstDeg(jdUt) + (dpsiArcsec / 3600) * cos(eps));
}

// --- precession ------------------------------------------------------------
/** Rigorous IAU 1976 angles zeta, z, theta (radians) from J2000.0 to a TT date. */
export function precessionAngles(jdTt) {
  const t = centuries(jdTt);
  return {
    zeta: (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * ARCSEC,
    z: (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * ARCSEC,
    theta: (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * ARCSEC,
  };
}

/** J2000 mean equatorial (degrees) to the mean equator and equinox of date. */
export function precessRigorous(raDeg, decDeg, jdTt) {
  const { zeta, z, theta } = precessionAngles(jdTt);
  const a0 = raDeg * DEG;
  const d0 = decDeg * DEG;
  const A = Math.cos(d0) * Math.sin(a0 + zeta);
  const B =
    Math.cos(theta) * Math.cos(d0) * Math.cos(a0 + zeta) -
    Math.sin(theta) * Math.sin(d0);
  const C =
    Math.sin(theta) * Math.cos(d0) * Math.cos(a0 + zeta) +
    Math.cos(theta) * Math.sin(d0);
  return {
    raDeg: wrap360((Math.atan2(A, B) + z) / DEG),
    decDeg: Math.asin(Math.max(-1, Math.min(1, C))) / DEG,
  };
}

/** First order: the annual rates m and n (Meeus 21), the form a student can derive. */
export function precessFirstOrder(raDeg, decDeg, jdTt) {
  const years = (jdTt - J2000) / 365.25;
  const m = (46.1244 * ARCSEC) / DEG; // degrees per year (3.07496 s)
  const n = (20.0431 * ARCSEC) / DEG; // 1.33621 s
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  return {
    raDeg: wrap360(raDeg + (m + n * Math.sin(a) * Math.tan(d)) * years),
    decDeg: decDeg + n * Math.cos(a) * years,
  };
}

/** Apparent place corrections (Meeus 23): nutation, and optionally annual aberration. */
export function apparentOfDate(
  raDeg,
  decDeg,
  jdTt,
  { aberration = true } = {}
) {
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt);
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  const dpsi = dpsiArcsec * ARCSEC;
  const deps = depsArcsec * ARCSEC;
  let dra =
    (Math.cos(eps * DEG) + Math.sin(eps * DEG) * Math.sin(a) * Math.tan(d)) *
      dpsi -
    Math.cos(a) * Math.tan(d) * deps;
  let dde = Math.sin(eps * DEG) * Math.cos(a) * dpsi + Math.sin(a) * deps;
  if (aberration) {
    const t = centuries(jdTt);
    const k = 20.49552 * ARCSEC;
    const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
    const pi = (102.93735 + 1.71946 * t + 0.00046 * t * t) * DEG;
    // Sun's true longitude (low-precision, 0.01 degree is ample for 20 arcseconds)
    const L0 = 280.46646 + 36000.76983 * t;
    const M = (357.52911 + 35999.05029 * t) * DEG;
    const lam =
      (L0 +
        (1.914602 - 0.004817 * t) * Math.sin(M) +
        0.019993 * Math.sin(2 * M)) *
      DEG;
    const ce = Math.cos(eps * DEG);
    const te = Math.tan(eps * DEG);
    dra +=
      (-k * (Math.cos(a) * Math.cos(lam) * ce + Math.sin(a) * Math.sin(lam)) +
        e *
          k *
          (Math.cos(a) * Math.cos(pi) * ce + Math.sin(a) * Math.sin(pi))) /
      Math.cos(d);
    dde +=
      -k *
        (Math.cos(lam) * ce * (te * Math.cos(d) - Math.sin(a) * Math.sin(d)) +
          Math.cos(a) * Math.sin(d) * Math.sin(lam)) +
      e *
        k *
        (Math.cos(pi) * ce * (te * Math.cos(d) - Math.sin(a) * Math.sin(d)) +
          Math.cos(a) * Math.sin(d) * Math.sin(pi));
  }
  return { raDeg: wrap360(raDeg + dra / DEG), decDeg: decDeg + dde / DEG };
}
