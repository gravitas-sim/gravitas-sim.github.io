// =============================================================================
// Sky kernel: coordinates
// -----------------------------------------------------------------------------
// Equatorial to horizontal and back, atmospheric refraction, ecliptic, and the
// whole chain from a J2000 catalogue position to an observed altitude and
// azimuth (precession, nutation, aberration, sidereal rotation, refraction).
// Azimuth is measured from north, east positive. Pure: no DOM, no clock.
//
// Two frames, one answer. makeFrame() applies every correction star by star
// and is the accurate chain (0.43 arcminute of ERFA's atco13 above 5 degrees
// of apparent altitude). makeFastFrame() folds precession, nutation and the
// site into one 3x3 matrix per instant, so a thousand stars are a thousand
// cheap rotations; it leaves out annual aberration (20.5 arcseconds, 0.35
// arcminute at most, 0.67 arcminute against ERFA), and says so.
//
// Refraction is the Saemundsson and Bennett fits (Meeus ch. 16) for a standard
// atmosphere (1010 hPa, 10 C). Above 5 degrees of apparent altitude they agree
// with ERFA within an arcminute. Below 5 degrees ERFA's model saturates at
// about 11 arcminutes while the fits give 20-35, which is what a standard
// atmosphere does; refractionSpreadArcmin() states how far the two disagree
// and the kernel makes no claim there that a published table would not.
// =============================================================================

import {
  precessRigorous,
  apparentOfDate,
  gastDeg,
  ttFromUt,
  wrap360,
  precessionAngles,
  nutation,
  meanObliquityDeg,
  centuries,
} from './time.js';
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap180 = d => wrap360(d + 180) - 180;

/** Hour angle and declination to altitude and azimuth (azimuth from north, east positive). */
export function toHorizontal(haDeg, decDeg, latDeg) {
  const h = haDeg * DEG;
  const d = decDeg * DEG;
  const p = latDeg * DEG;
  const sinAlt =
    Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    -Math.sin(h) * Math.cos(d),
    Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(h)
  );
  return { altDeg: alt * RAD, azDeg: wrap360(az * RAD) };
}

/** Altitude and azimuth to hour angle and declination (the inverse). */
export function toEquatorial(altDeg, azDeg, latDeg) {
  const a = altDeg * DEG;
  const z = azDeg * DEG;
  const p = latDeg * DEG;
  const sinDec =
    Math.sin(a) * Math.sin(p) + Math.cos(a) * Math.cos(p) * Math.cos(z);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const ha = Math.atan2(
    -Math.sin(z) * Math.cos(a),
    Math.sin(a) * Math.cos(p) - Math.cos(a) * Math.sin(p) * Math.cos(z)
  );
  return { haDeg: ha * RAD, decDeg: dec * RAD };
}

/**
 * Refraction in degrees, true altitude to apparent (Saemundsson 1986, as in
 * Meeus 16.4), for a pressure in hPa and temperature in Celsius.
 * 1.02' / tan(h + 10.3 / (h + 5.11)); zero below -1 degree of true altitude.
 */
export function refractionFromTrue(trueAltDeg, pressureHpa = 1010, tempC = 10) {
  if (trueAltDeg < -1.9) return 0;
  const h = Math.max(trueAltDeg, -1.9);
  const r = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG); // arcminutes
  return (r * (pressureHpa / 1010) * (283 / (273 + tempC))) / 60;
}

/** Refraction in degrees, apparent altitude to true (Bennett 1982, Meeus 16.3). */
export function refractionFromApparent(
  appAltDeg,
  pressureHpa = 1010,
  tempC = 10
) {
  if (appAltDeg < -1.9) return 0;
  const h = appAltDeg;
  const r = 1 / Math.tan((h + 7.31 / (h + 4.4)) * DEG); // arcminutes
  return (r * (pressureHpa / 1010) * (283 / (273 + tempC))) / 60;
}

export const apparentAltitude = (trueAlt, p, t) =>
  trueAlt + refractionFromTrue(trueAlt, p, t);
export const trueAltitude = (appAlt, p, t) =>
  appAlt - refractionFromApparent(appAlt, p, t);

/**
 * How far the refraction of a real night may be from the standard
 * atmosphere's, in arcminutes: the larger departure over a cold, high-pressure
 * night (-20 C, 1050 hPa) and a hot, low-pressure one (35 C, 950 hPa), through
 * the same pressure-and-temperature scaling the fits use. About 15 percent of
 * the refraction at every altitude, so 5 arcminutes at the horizon. It is a
 * weather spread, stated; it is not the fits' error, which is unknown below 5
 * degrees because no table was validated there (SKY_LAB.md).
 * @param {number} trueAltDeg - True altitude, degrees
 * @returns {number} Arcminutes
 */
export function refractionSpreadArcmin(trueAltDeg) {
  const std = refractionFromTrue(trueAltDeg) * 60;
  const cold = refractionFromTrue(trueAltDeg, 1050, -20) * 60;
  const hot = refractionFromTrue(trueAltDeg, 950, 35) * 60;
  return Math.max(Math.abs(cold - std), Math.abs(hot - std));
}

/**
 * J2000 catalogue position to observed altitude and azimuth.
 * @param {object} s {raDeg, decDeg} J2000 (proper motion already applied)
 * @param {object} o {jdUt, dtSec?, latDeg, lonDeg, pressureHpa?, tempC?, aberration?}
 *   dtSec is TT-UT1; default is the kernel's own delta-T model.
 */
export function observed(s, o) {
  const jdTt = o.dtSec != null ? o.jdUt + o.dtSec / 86400 : ttFromUt(o.jdUt);
  const mean = precessRigorous(s.raDeg, s.decDeg, jdTt);
  const app = apparentOfDate(mean.raDeg, mean.decDeg, jdTt, {
    aberration: o.aberration !== false,
  });
  const gast = gastDeg(o.jdUt, jdTt);
  const ha = wrap180(gast + o.lonDeg - app.raDeg);
  const geo = toHorizontal(ha, app.decDeg, o.latDeg);
  const p = o.pressureHpa ?? 1010;
  const t = o.tempC ?? 10;
  const altApp =
    geo.altDeg + (p > 0 ? refractionFromTrue(geo.altDeg, p, t) : 0);
  return {
    altGeomDeg: geo.altDeg,
    altDeg: altApp,
    azDeg: geo.azDeg,
    haDeg: ha,
    raAppDeg: app.raDeg,
    decAppDeg: app.decDeg,
  };
}

/** Equatorial to ecliptic for a position already reduced to date (the inverse of eclipticToEquatorial). */
export function equatorialToEcliptic(raDeg, decDeg, obliquityDeg) {
  const a = raDeg * DEG,
    d = decDeg * DEG,
    e = obliquityDeg * DEG;
  const lon = Math.atan2(
    Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e),
    Math.cos(a)
  );
  const lat = Math.asin(
    Math.max(
      -1,
      Math.min(
        1,
        Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a)
      )
    )
  );
  return { lonDeg: wrap360(lon * RAD), latDeg: lat * RAD };
}

/**
 * A frame for one instant: everything that does not depend on the star is
 * computed once, so a thousand stars cost a thousand cheap rotations and not a
 * thousand nutation series. frame(raDeg, decDeg) agrees with observed() (the
 * renderer test asserts it).
 */
export function makeFrame(o) {
  const jdTt = o.dtSec != null ? o.jdUt + o.dtSec / 86400 : ttFromUt(o.jdUt);
  const { zeta, z, theta } = precessionAngles(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt) * DEG;
  const dpsi = (dpsiArcsec / 3600) * DEG,
    deps = (depsArcsec / 3600) * DEG;
  const t = centuries(jdTt);
  const k = (20.49552 / 3600) * DEG;
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  const pi = (102.93735 + 1.71946 * t + 0.00046 * t * t) * DEG;
  const L0 = 280.46646 + 36000.76983 * t,
    M = (357.52911 + 35999.05029 * t) * DEG;
  const lam =
    (L0 +
      (1.914602 - 0.004817 * t) * Math.sin(M) +
      0.019993 * Math.sin(2 * M)) *
    DEG;
  const ce = Math.cos(eps),
    se = Math.sin(eps),
    te = Math.tan(eps);
  const clam = Math.cos(lam),
    slam = Math.sin(lam),
    cpi = Math.cos(pi),
    spi = Math.sin(pi);
  const gast = gastDeg(o.jdUt, jdTt);
  const lon = o.lonDeg,
    lat = o.latDeg * DEG;
  const sinLat = Math.sin(lat),
    cosLat = Math.cos(lat);
  const p = o.pressureHpa ?? 1010,
    tc = o.tempC ?? 10;
  const ct = Math.cos(theta),
    st = Math.sin(theta);
  return function frame(raDeg, decDeg) {
    // precession (rigorous)
    const a0 = raDeg * DEG,
      d0 = decDeg * DEG;
    const cd0 = Math.cos(d0),
      sd0 = Math.sin(d0);
    const A = cd0 * Math.sin(a0 + zeta);
    const B = ct * cd0 * Math.cos(a0 + zeta) - st * sd0;
    const Cc = st * cd0 * Math.cos(a0 + zeta) + ct * sd0;
    let a = Math.atan2(A, B) + z;
    let d = Math.asin(Math.max(-1, Math.min(1, Cc)));
    // nutation and aberration
    const sa = Math.sin(a),
      ca = Math.cos(a),
      sd = Math.sin(d),
      cd = Math.cos(d),
      td = sd / cd;
    let dra = (ce + se * sa * td) * dpsi - ca * td * deps;
    let dde = se * ca * dpsi + sa * deps;
    dra +=
      (-k * (ca * clam * ce + sa * slam) + e * k * (ca * cpi * ce + sa * spi)) /
      cd;
    dde +=
      -k * (clam * ce * (te * cd - sa * sd) + ca * sd * slam) +
      e * k * (cpi * ce * (te * cd - sa * sd) + ca * sd * spi);
    a += dra;
    d += dde;
    const H = wrap180(gast + lon - a / DEG) * DEG;
    const sinAlt = Math.sin(d) * sinLat + Math.cos(d) * cosLat * Math.cos(H);
    const altG = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
    const az = Math.atan2(
      -Math.sin(H) * Math.cos(d),
      Math.sin(d) * cosLat - Math.cos(d) * sinLat * Math.cos(H)
    );
    const alt = p > 0 ? altG + refractionFromTrue(altG, p, tc) : altG;
    return {
      altDeg: alt,
      altGeomDeg: altG,
      azDeg: wrap360(az * RAD),
      raAppDeg: wrap360(a * RAD),
      decAppDeg: d * RAD,
    };
  };
}

// --- the matrix frame ---------------------------------------------------
const Rx = a => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [1, 0, 0, 0, c, s, 0, -s, c];
};
const Ry = a => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, 0, -s, 0, 1, 0, s, 0, c];
};
const Rz = a => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
};
const mul = (a, b) => {
  const o = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      o[3 * i + j] =
        a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  return o;
};

/** Unit vector of J2000 RA/Dec (degrees). */
export const unitVector = (raDeg, decDeg) => {
  const a = raDeg * DEG,
    d = decDeg * DEG,
    c = Math.cos(d);
  return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)];
};

/** @returns {(x:number,y:number,z:number)=>{altDeg,azDeg,altGeomDeg}} for J2000 unit vectors */
export function makeFastFrame(o) {
  const jdTt = o.dtSec != null ? o.jdUt + o.dtSec / 86400 : ttFromUt(o.jdUt);
  const { zeta, z, theta } = precessionAngles(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt) * DEG;
  const P = mul(Rz(-z), mul(Ry(theta), Rz(-zeta)));
  const N = mul(
    Rx(-(eps + (depsArcsec / 3600) * DEG)),
    mul(Rz(-(dpsiArcsec / 3600) * DEG), Rx(eps))
  );
  const lst = (gastDeg(o.jdUt, jdTt) + o.lonDeg) * DEG;
  const phi = o.latDeg * DEG,
    sp = Math.sin(phi),
    cp = Math.cos(phi);
  const Hh = [0, 1, 0, -sp, 0, cp, cp, 0, sp]; // rows: East, North, Up from the hour-angle frame
  const M = mul(Hh, mul(Rz(lst), mul(N, P)));
  const press = o.pressureHpa ?? 1010,
    temp = o.tempC ?? 10;
  return (x, y, zc) => {
    const E = M[0] * x + M[1] * y + M[2] * zc,
      Nn = M[3] * x + M[4] * y + M[5] * zc,
      U = M[6] * x + M[7] * y + M[8] * zc;
    const altG = Math.asin(Math.max(-1, Math.min(1, U))) * RAD;
    const alt = press > 0 ? altG + refractionFromTrue(altG, press, temp) : altG;
    return {
      altDeg: alt,
      altGeomDeg: altG,
      azDeg: wrap360(Math.atan2(E, Nn) * RAD),
    };
  };
}
