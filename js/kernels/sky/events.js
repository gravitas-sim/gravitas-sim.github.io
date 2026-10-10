// =============================================================================
// Sky kernel: rise, transit, set, twilight and phase events
// -----------------------------------------------------------------------------
// Altitude is sampled across a UT day and each crossing refined by bisection, so
// the answer is whatever the kernel's own positions say, not a closed-form
// approximation. Standard altitudes: the Sun's upper limb and a star or planet
// at the horizon are 34 arcminutes of refraction below it (Meeus ch. 15); the
// Sun adds its 16-arcminute radius; the Moon's upper limb adds its own, from
// its distance, to the topocentric altitude. Twilights are the Sun's centre at
// -6, -12 and -18 degrees, geometric. Pure: no DOM, no clock.
// =============================================================================

import { ttFromUt, gastDeg, wrap360 } from './time.js';
import { toHorizontal, makeFastFrame } from './coords.js';
import { apparentSun, topocentricMoon, syzygyTime } from './solar.js';
import { geocentricEquatorial } from './planets.js';
import { unitVector } from './stars.js';

const DEG = Math.PI / 180;
const wrap180 = d => wrap360(d + 180) - 180;
/** Refraction at the horizon, degrees: the published 34 arcminutes. */
export const HORIZON_REFRACTION_DEG = 34 / 60;
/** The Sun's mean semi-diameter, degrees. */
export const SUN_SEMIDIAMETER_DEG = 16 / 60;
export const TWILIGHT_DEG = Object.freeze({
  civil: -6,
  nautical: -12,
  astronomical: -18,
});

/**
 * A body as a function of time: {altGeom(jdUt), haDeg(jdUt), h0Deg(jdUt)},
 * geometric (unrefracted) altitude, hour angle, and the altitude at which it
 * rises or sets. `target` is {type: 'sun'|'moon'|'planet'|'fixed', id?, raDeg?, decDeg?}
 * with a fixed target's J2000 position.
 */
export function bodyTrack(target, site) {
  const { latDeg, lonDeg } = site;
  const hour = (jdUt, raDeg, decDeg) => {
    const ha = wrap180(gastDeg(jdUt) + lonDeg - raDeg);
    return { ha, alt: toHorizontal(ha, decDeg, latDeg).altDeg };
  };
  if (target.type === 'sun') {
    return {
      at: jdUt => {
        const s = apparentSun(ttFromUt(jdUt));
        const h = hour(jdUt, s.raDeg, s.decDeg);
        return { altGeom: h.alt, haDeg: h.ha };
      },
      h0Deg: () => -(HORIZON_REFRACTION_DEG + SUN_SEMIDIAMETER_DEG),
    };
  }
  if (target.type === 'moon') {
    return {
      at: jdUt => {
        const m = topocentricMoon(jdUt, ttFromUt(jdUt), latDeg, lonDeg);
        return {
          altGeom: m.altDeg,
          haDeg: wrap180(gastDeg(jdUt) + lonDeg - m.raDeg),
          dist: m.geocentric.distanceKm,
        };
      },
      h0Deg: jdUt => {
        const d = topocentricMoon(jdUt, ttFromUt(jdUt), latDeg, lonDeg)
          .geocentric.distanceKm;
        return -(HORIZON_REFRACTION_DEG + Math.asin(1737.4 / d) / DEG);
      },
    };
  }
  // A planet or a fixed star: precess to the date through the matrix frame.
  return {
    at: jdUt => {
      let ra = target.raDeg;
      let dec = target.decDeg;
      if (target.type === 'planet') {
        const p = geocentricEquatorial(target.id, ttFromUt(jdUt));
        ra = p.raDeg;
        dec = p.decDeg;
      }
      const u = unitVector(ra, dec);
      const f = makeFastFrame({ jdUt, latDeg, lonDeg, pressureHpa: 0 })(
        u[0],
        u[1],
        u[2]
      );
      // Hour angle of the apparent place, from its altitude and azimuth.
      const alt = f.altGeomDeg * DEG;
      const az = f.azDeg * DEG;
      const phi = latDeg * DEG;
      const ha = Math.atan2(
        -Math.sin(az) * Math.cos(alt),
        Math.sin(alt) * Math.cos(phi) -
          Math.cos(alt) * Math.sin(phi) * Math.cos(az)
      );
      return { altGeom: f.altGeomDeg, haDeg: ha / DEG };
    },
    h0Deg: () => -HORIZON_REFRACTION_DEG,
  };
}

const STEP_DAYS = 10 / 1440;

function bisect(f, a, b) {
  let fa = f(a);
  for (let i = 0; i < 40 && b - a > 0.05 / 86400; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0 || Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else b = m;
  }
  return (a + b) / 2;
}

/**
 * Rise, transit and set of a body inside the UT day starting at jd0 (a Julian
 * date at 0h UT). Times are Julian dates (UT) or null; `status` says why one
 * is missing.
 * @returns {{riseJd: ?number, transitJd: ?number, setJd: ?number,
 *   status: 'normal'|'circumpolar'|'neverRises', transitAltDeg: ?number}}
 */
export function riseTransitSet(target, jd0, site) {
  const track = bodyTrack(target, site);
  const n = Math.round(1 / STEP_DAYS);
  const g = jd => {
    const a = track.at(jd);
    return a.altGeom - track.h0Deg(jd);
  };
  const ha = jd => track.at(jd).haDeg;
  let rise = null;
  let set = null;
  let transit = null;
  let prev = g(jd0);
  let prevHa = ha(jd0);
  let up = prev > 0;
  let everUp = up;
  let everDown = !up;
  for (let i = 1; i <= n; i++) {
    const t0 = jd0 + (i - 1) * STEP_DAYS;
    const t1 = jd0 + i * STEP_DAYS;
    const cur = g(t1);
    const curHa = ha(t1);
    if (cur > 0) everUp = true;
    else everDown = true;
    if (prev <= 0 && cur > 0 && rise === null) rise = bisect(g, t0, t1);
    if (prev > 0 && cur <= 0 && set === null) set = bisect(g, t0, t1);
    if (prevHa < 0 && curHa >= 0 && curHa - prevHa < 180 && transit === null)
      transit = bisect(ha, t0, t1);
    prev = cur;
    prevHa = curHa;
  }
  let status = 'normal';
  if (rise === null && set === null)
    status = everUp && !everDown ? 'circumpolar' : 'neverRises';
  return {
    riseJd: rise,
    transitJd: transit,
    setJd: set,
    status,
    transitAltDeg: transit === null ? null : track.at(transit).altGeom,
  };
}

/**
 * The Sun's twilights in the UT day from jd0: dusk and dawn (the Sun's centre
 * crossing the level), per level, and the length of astronomical night.
 * @returns {{[level: string]: {dawnJd: ?number, duskJd: ?number}}}
 */
export function twilightTimes(jd0, site) {
  const track = bodyTrack({ type: 'sun' }, site);
  const out = {};
  for (const [name, level] of Object.entries(TWILIGHT_DEG)) {
    let dawn = null;
    let dusk = null;
    const n = Math.round(1 / STEP_DAYS);
    const f = jd => track.at(jd).altGeom - level;
    let prev = f(jd0);
    for (let i = 1; i <= n; i++) {
      const t0 = jd0 + (i - 1) * STEP_DAYS;
      const t1 = jd0 + i * STEP_DAYS;
      const cur = f(t1);
      if (prev <= 0 && cur > 0 && dawn === null) dawn = bisect(f, t0, t1);
      if (prev > 0 && cur <= 0 && dusk === null) dusk = bisect(f, t0, t1);
      prev = cur;
    }
    out[name] = { dawnJd: dawn, duskJd: dusk };
  }
  return out;
}

/**
 * The next new and the next full Moon at or after jdUt (UTC taken as UT1, so
 * the arguments are converted to TT inside and the answers back).
 * @returns {{newMoonJd: number, fullMoonJd: number}} Julian dates, UT
 */
export function nextSyzygies(jdUt) {
  const tt = ttFromUt(jdUt);
  const lunation = 29.530588861;
  const k0 = Math.floor((tt - 2451550.09766) / lunation) - 1;
  const after = diff => {
    for (let k = k0; k < k0 + 4; k++) {
      const guess = 2451550.09766 + lunation * (k + (diff === 180 ? 0.5 : 0));
      const jd = syzygyTime(diff, guess);
      if (jd >= tt) return jd;
    }
    return NaN;
  };
  const ut = x => x - (ttFromUt(x) - x);
  return { newMoonJd: ut(after(0)), fullMoonJd: ut(after(180)) };
}
