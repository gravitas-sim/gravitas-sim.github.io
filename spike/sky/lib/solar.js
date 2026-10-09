// SPIKE (Prompt 87), not production. Apparent Sun, apparent and topocentric
// Moon, and the instants of the Sun's longitude and of the lunar syzygies. The
// series themselves are js/observingWindow.js's (the Almanac low-precision Sun,
// Meeus ch. 47 Moon); this file adds what the gate needs on top of them.
import { solarPosition, lunarPosition, eclipticToEquatorial } from '../../../js/observingWindow.js';
import { nutation, meanObliquityDeg, wrap360, gastDeg } from './time.js';
import { toHorizontal } from './coords.js';
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap180 = d => wrap360(d + 180) - 180;

/** Sun, apparent, geocentric, of date: the series plus nutation and aberration. */
export function apparentSun(jdTt) {
  const s = solarPosition(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const lon = wrap360(s.longitudeDeg + dpsiArcsec / 3600 - 20.4898 / 3600 / s.distanceAu);
  const eps = meanObliquityDeg(jdTt) + depsArcsec / 3600;
  const eq = eclipticToEquatorial(lon, 0, eps);
  return { ...eq, longitudeDeg: lon, distanceAu: s.distanceAu };
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
