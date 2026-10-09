// SPIKE (Prompt 87), not production. Apparent Sun, apparent and topocentric
// Moon, and the instants of the Sun's longitude and of the lunar syzygies. The
// series themselves are js/observingWindow.js's (the Almanac low-precision Sun,
// Meeus ch. 47 Moon); this file adds what the gate needs on top of them.
import { lunarPosition, eclipticToEquatorial } from '../../../js/observingWindow.js';
import { nutation, meanObliquityDeg, wrap360, gastDeg } from './time.js';
import { toHorizontal } from './coords.js';
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap180 = d => wrap360(d + 180) - 180;

/**
 * Sun, apparent, geocentric, of date. Meeus ch. 25 (low accuracy): mean
 * longitude and anomaly with the secular terms, a three-term equation of the
 * centre, the true distance; then nutation in longitude and annual aberration.
 * js/observingWindow.js's solarPosition uses the Almanac's two-term form, whose
 * constant (280.4606) folds the aberration offset in and misses 0.01 degree
 * (measured); this is the replacement the gate proposes.
 */
export function apparentSun(jdTt) {
  const t = (jdTt - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const sM = Math.sin(M * DEG);
  const C =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * sM +
    (0.019993 - 0.000101 * t) * Math.sin(2 * M * DEG) +
    0.000289 * Math.sin(3 * M * DEG);
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  const nu = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(nu * DEG));
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const lon = wrap360(L0 + C + dpsiArcsec / 3600 - 20.4898 / 3600 / R);
  const eps = meanObliquityDeg(jdTt) + depsArcsec / 3600;
  const eq = eclipticToEquatorial(lon, 0, eps);
  return { ...eq, longitudeDeg: lon, distanceAu: R };
}

/** Moon, geocentric, of date, with nutation in longitude. */
export function apparentMoon(jdTt) {
  const m = lunarPosition(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const lon = wrap360(m.longitudeDeg + dpsiArcsec / 3600);
  const eps = meanObliquityDeg(jdTt) + depsArcsec / 3600;
  const eq = eclipticToEquatorial(lon, m.latitudeDeg, eps);
  return { ...eq, longitudeDeg: lon, latitudeDeg: m.latitudeDeg, distanceKm: m.distanceKm };
}

/** Meeus ch. 40: parallax of the Moon for an observer at sea level. */
export function topocentricMoon(jdUt, jdTt, latDeg, lonDeg) {
  const m = apparentMoon(jdTt);
  const u = Math.atan(0.99664719 * Math.tan(latDeg * DEG));
  const rhoSin = 0.99664719 * Math.sin(u);
  const rhoCos = Math.cos(u);
  const sinPi = 6378.14 / m.distanceKm;
  const H = wrap180(gastDeg(jdUt, jdTt) + lonDeg - m.raDeg) * DEG;
  const d = m.decDeg * DEG;
  const dra = Math.atan2(-rhoCos * sinPi * Math.sin(H), Math.cos(d) - rhoCos * sinPi * Math.cos(H));
  const dec = Math.atan2((Math.sin(d) - rhoSin * sinPi) * Math.cos(dra), Math.cos(d) - rhoCos * sinPi * Math.cos(H));
  const raT = wrap360(m.raDeg + dra * RAD);
  const Ht = wrap180(gastDeg(jdUt, jdTt) + lonDeg - raT);
  const hor = toHorizontal(Ht, dec * RAD, latDeg);
  return { raDeg: raT, decDeg: dec * RAD, ...hor, geocentric: m };
}

/** The TT Julian date, near `guess`, when f(jd) (degrees, wrapped) crosses `target`. */
function solveAngle(f, target, guess, rate) {
  let jd = guess;
  for (let i = 0; i < 12; i++) {
    const err = wrap180(f(jd) - target);
    jd -= err / rate;
    if (Math.abs(err) < 1e-7) break;
  }
  return jd;
}

/** TT instant near `guess` that the Sun's apparent longitude equals `lonDeg`. */
export const sunLongitudeTime = (lonDeg, guess) => solveAngle(jd => apparentSun(jd).longitudeDeg, lonDeg, guess, 0.9856);

/** TT instants of syzygy: Moon minus Sun apparent longitude = 0 (new) or 180 (full). */
export const syzygyTime = (diffDeg, guess) =>
  solveAngle(jd => wrap360(apparentMoon(jd).longitudeDeg - apparentSun(jd).longitudeDeg), diffDeg, guess, 12.19);

/** Phase angle and illuminated fraction from the apparent Sun and Moon. */
export function phase(jdTt) {
  const s = apparentSun(jdTt);
  const m = apparentMoon(jdTt);
  const elong = Math.acos(
    Math.sin(s.decDeg * DEG) * Math.sin(m.decDeg * DEG) +
      Math.cos(s.decDeg * DEG) * Math.cos(m.decDeg * DEG) * Math.cos((s.raDeg - m.raDeg) * DEG)
  );
  const R = s.distanceAu * 149597870.7;
  const i = Math.atan2(R * Math.sin(elong), m.distanceKm - R * Math.cos(elong));
  return { elongationDeg: elong * RAD, phaseAngleDeg: i * RAD, illuminated: (1 + Math.cos(i)) / 2 };
}
