// SPIKE (Prompt 87), not production. Coordinates: equatorial to horizontal
// with refraction, and the whole chain from a J2000 catalogue position.
import { precessRigorous, apparentOfDate, gastDeg, ttFromUt, wrap360 } from './time.js';
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap180 = d => wrap360(d + 180) - 180;

/** Hour angle and declination to altitude and azimuth (azimuth from north, east positive). */
export function toHorizontal(haDeg, decDeg, latDeg) {
  const h = haDeg * DEG;
  const d = decDeg * DEG;
  const p = latDeg * DEG;
  const sinAlt = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.sin(h) * Math.cos(d), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(h));
  return { altDeg: alt * RAD, azDeg: wrap360(az * RAD) };
}

/** Altitude and azimuth to hour angle and declination (the inverse). */
export function toEquatorial(altDeg, azDeg, latDeg) {
  const a = altDeg * DEG;
  const z = azDeg * DEG;
  const p = latDeg * DEG;
  const sinDec = Math.sin(a) * Math.sin(p) + Math.cos(a) * Math.cos(p) * Math.cos(z);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const ha = Math.atan2(-Math.sin(z) * Math.cos(a), Math.sin(a) * Math.cos(p) - Math.cos(a) * Math.sin(p) * Math.cos(z));
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
  return ((r * (pressureHpa / 1010) * (283 / (273 + tempC))) / 60);
}

/** Refraction in degrees, apparent altitude to true (Bennett 1982, Meeus 16.3). */
export function refractionFromApparent(appAltDeg, pressureHpa = 1010, tempC = 10) {
  if (appAltDeg < -1.9) return 0;
  const h = appAltDeg;
  const r = 1 / Math.tan((h + 7.31 / (h + 4.4)) * DEG); // arcminutes
  return ((r * (pressureHpa / 1010) * (283 / (273 + tempC))) / 60);
}

export const apparentAltitude = (trueAlt, p, t) => trueAlt + refractionFromTrue(trueAlt, p, t);
export const trueAltitude = (appAlt, p, t) => appAlt - refractionFromApparent(appAlt, p, t);

/**
 * J2000 catalogue position to observed altitude and azimuth.
 * @param {object} s {raDeg, decDeg} J2000 (proper motion already applied)
 * @param {object} o {jdUt, dtSec?, latDeg, lonDeg, pressureHpa?, tempC?, aberration?}
 *   dtSec is TT-UT1; default is the kernel's own delta-T model.
 */
export function observed(s, o) {
  const jdTt = o.dtSec != null ? o.jdUt + o.dtSec / 86400 : ttFromUt(o.jdUt);
  const mean = precessRigorous(s.raDeg, s.decDeg, jdTt);
  const app = apparentOfDate(mean.raDeg, mean.decDeg, jdTt, { aberration: o.aberration !== false });
  const gast = gastDeg(o.jdUt, jdTt);
  const ha = wrap180(gast + o.lonDeg - app.raDeg);
  const geo = toHorizontal(ha, app.decDeg, o.latDeg);
  const p = o.pressureHpa ?? 1010;
  const t = o.tempC ?? 10;
  const altApp = geo.altDeg + (p > 0 ? refractionFromTrue(geo.altDeg, p, t) : 0);
  return { altGeomDeg: geo.altDeg, altDeg: altApp, azDeg: geo.azDeg, haDeg: ha, raAppDeg: app.raDeg, decAppDeg: app.decDeg };
}
