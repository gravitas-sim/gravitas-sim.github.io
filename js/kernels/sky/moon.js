// =============================================================================
// Sky kernel: the Moon's series, and the small functions it shares
// -----------------------------------------------------------------------------
// COPIED, with a test that holds each copy equal to its original, from
// js/observingWindow.js: the Meeus ch. 47 lunar series (lunarPosition), the
// Julian date and calendar date of ch. 7, the Kasten and Young airmass and the
// ecliptic-to-equatorial rotation. They are copied rather than imported
// because observingWindow.js is 45 KB of source and a page that imports one
// function of it downloads all of it, which the Sky Lab's route budget cannot
// pay (SKY_LAB.md). observingWindow.js stays as the lessons use it, so a
// lesson's expected values and bytes do not move. tests/skyKernel.test.js
// ("copies of observingWindow.js") fails if the two ever differ.
// Pure: no DOM, no clock.
// =============================================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;
const sin = d => Math.sin(d * DEG);
const cos = d => Math.cos(d * DEG);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const wrap360 = deg => ((deg % 360) + 360) % 360;
const julianCenturies = jd => (jd - J2000) / 36525;
/** Mean obliquity of the ecliptic, degrees (Meeus 22.2). */
export const meanObliquity = jd => {
  const t = julianCenturies(jd);
  return (
    23.439291111 - (46.815 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600
  );
};

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

/** Kasten and Young (1989) airmass for an apparent altitude, degrees; Infinity below the horizon. */
export function airmass(altitudeDeg) {
  if (!Number.isFinite(altitudeDeg) || altitudeDeg < 0) return Infinity;
  return (
    1 / (sin(altitudeDeg) + 0.50572 * Math.pow(altitudeDeg + 6.07995, -1.6364))
  );
}

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
