// =============================================================================
// Sky kernel: the readings of the five instruments
// -----------------------------------------------------------------------------
// Each function takes numbers and returns plain numbers: the altitude-azimuth
// reader, the sidereal clock, the airmass and twilight calculator, the
// rise-transit-set tool and the phase and elongation reader. The Sky Lab draws
// them and wraps them as evidence; a lesson that docks one reads the same
// function, so a reading and the drawing of it cannot differ. Pure.
// =============================================================================

import { airmass } from './moon.js';
import {
  ttFromUt,
  deltaT,
  deltaTRangeSec,
  gmstDeg,
  gastDeg,
  nutation,
  meanObliquityDeg,
  wrap360,
} from './time.js';
import {
  observed,
  refractionFromTrue,
  refractionSpreadArcmin,
} from './coords.js';
import { apparentSun, apparentMoon, topocentricMoon, phase } from './solar.js';
import { geocentricEquatorial, planetPhase } from './planets.js';
import { starAtEpoch } from './stars.js';
import {
  riseTransitSet,
  twilightTimes,
  nextSyzygies,
  bodyTrack,
} from './events.js';

const DEG = Math.PI / 180;
const wrap180 = d => wrap360(d + 180) - 180;

/** Plane-parallel airmass, sec z, for comparison with the fitted one. */
export const secantAirmass = altDeg =>
  altDeg > 0 ? 1 / Math.sin(altDeg * DEG) : Infinity;

/**
 * Altitude-azimuth reader: where a target is, for a site and an instant.
 * @param {{type: 'sun'|'moon'|'planet'|'star'|'fixed', id?: string,
 *   star?: object, raDeg?: number, decDeg?: number}} target - A star is an
 *   unpacked catalogue star; a fixed target has its J2000 position
 */
export function altAzReading(target, jdUt, site) {
  const jdTt = ttFromUt(jdUt);
  let eq;
  let altGeom;
  let az;
  let ha;
  if (target.type === 'sun') {
    const s = apparentSun(jdTt);
    const o = observed(
      { raDeg: s.raDeg, decDeg: s.decDeg },
      { jdUt, ...site, pressureHpa: 0, aberration: false }
    );
    eq = { raDeg: s.raDeg, decDeg: s.decDeg };
    ({ altDeg: altGeom, azDeg: az, haDeg: ha } = o);
  } else if (target.type === 'moon') {
    const m = topocentricMoon(jdUt, jdTt, site.latDeg, site.lonDeg);
    eq = { raDeg: m.raDeg, decDeg: m.decDeg };
    altGeom = m.altDeg;
    az = m.azDeg;
    ha = wrap180(gastDeg(jdUt, jdTt) + site.lonDeg - m.raDeg);
  } else {
    let j2000 = target;
    if (target.type === 'planet') j2000 = geocentricEquatorial(target.id, jdTt);
    if (target.type === 'star') j2000 = starAtEpoch(target.star, jdTt);
    const o = observed(j2000, { jdUt, ...site, pressureHpa: 0 });
    eq = { raDeg: o.raAppDeg, decDeg: o.decAppDeg };
    ({ altDeg: altGeom, azDeg: az, haDeg: ha } = o);
  }
  const refraction = refractionFromTrue(altGeom);
  const altApp = altGeom + refraction;
  return {
    jdUt,
    altGeomDeg: altGeom,
    altDeg: altApp,
    azDeg: az,
    haDeg: ha,
    raDeg: eq.raDeg,
    decDeg: eq.decDeg,
    refractionArcmin: refraction * 60,
    refractionSpreadArcmin: refractionSpreadArcmin(altGeom),
    airmass: altApp >= 0 ? airmass(altApp) : null,
    aboveHorizon: altApp > 0,
  };
}

/** Sidereal clock: UT, TT, the sidereal times at Greenwich and at the site. */
export function siderealClock(jdUt, lonDeg) {
  const jdTt = ttFromUt(jdUt);
  const gmst = gmstDeg(jdUt);
  const gast = gastDeg(jdUt, jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt) + depsArcsec / 3600;
  return {
    jdUt,
    jdTt,
    deltaTSec: deltaT(jdUt),
    deltaTRangeSec: deltaTRangeSec(jdUt),
    gmstDeg: gmst,
    gastDeg: gast,
    lmstDeg: wrap360(gmst + lonDeg),
    lastDeg: wrap360(gast + lonDeg),
    equationOfEquinoxesSec: (dpsiArcsec / 3600) * Math.cos(eps * DEG) * 240,
    meridianRaDeg: wrap360(gast + lonDeg),
  };
}

/** Airmass of an apparent altitude: the fit and the plane-parallel secant. */
export function airmassReading(altDeg) {
  const fit = altDeg >= 0 ? airmass(altDeg) : null;
  const sec = secantAirmass(altDeg);
  return {
    altDeg,
    airmass: fit,
    secantAirmass: Number.isFinite(sec) ? sec : null,
    secantMinusFit: fit !== null && Number.isFinite(sec) ? sec - fit : null,
  };
}

/** Twilight and the dark of the UT day from jd0: times and the length of night. */
export function twilightReading(jd0, site) {
  const t = twilightTimes(jd0, site);
  const sun = riseTransitSet({ type: 'sun' }, jd0, site);
  const a = t.astronomical;
  const night =
    a.duskJd !== null && a.dawnJd !== null
      ? a.dawnJd > a.duskJd
        ? a.dawnJd - a.duskJd
        : a.dawnJd + 1 - a.duskJd
      : null;
  return {
    jd0,
    sunrise: sun.riseJd,
    sunset: sun.setJd,
    sunStatus: sun.status,
    twilight: t,
    astronomicalNightDays: night,
  };
}

/** Rise, transit and set of a target in the UT day from jd0. */
export function riseTransitSetReading(target, jd0, site) {
  const r = riseTransitSet(target, jd0, site);
  const track = bodyTrack(target, site);
  const az = jd => observedAzimuth(target, jd, site, track);
  return {
    jd0,
    ...r,
    riseAzDeg: r.riseJd === null ? null : az(r.riseJd),
    setAzDeg: r.setJd === null ? null : az(r.setJd),
  };
}

function observedAzimuth(target, jd, site) {
  const a = altAzReading(target, jd, site);
  return a.azDeg;
}

/** Phase and elongation: the Moon, with its next new and full, and the planets. */
export function phaseReading(jdUt) {
  const jdTt = ttFromUt(jdUt);
  const ph = phase(jdTt);
  const sun = apparentSun(jdTt);
  const moon = apparentMoon(jdTt);
  const waxing = wrap360(moon.longitudeDeg - sun.longitudeDeg) < 180;
  const next = nextSyzygies(jdUt);
  const planets = {};
  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'])
    planets[id] = planetPhase(id, jdTt);
  return {
    jdUt,
    elongationDeg: ph.elongationDeg,
    phaseAngleDeg: ph.phaseAngleDeg,
    illuminated: ph.illuminated,
    waxing,
    eclipticElongationDeg: wrap360(moon.longitudeDeg - sun.longitudeDeg),
    nextNewMoonJd: next.newMoonJd,
    nextFullMoonJd: next.fullMoonJd,
    planets,
  };
}
