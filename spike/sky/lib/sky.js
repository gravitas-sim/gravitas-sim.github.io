// SPIKE (Prompt 87), not production. One function that says what is where: the
// single source for the drawing and the table, so they cannot disagree.
import { airmass } from '../../../js/observingWindow.js';
import { ttFromUt, gastDeg, centuries, wrap360 } from './time.js';
import { toHorizontal, refractionFromTrue } from './coords.js';
import { makeFastFrame, unitVector } from './fastframe.js';
import { apparentSun, topocentricMoon, phase } from './solar.js';
import { geocentricEquatorial } from './planets.js';
import { unpack } from './stars.js';

export const PLANET_IDS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const wrap180 = d => wrap360(d + 180) - 180;

/** Unpack star rows once, with their proper motion at the epoch of the sky. */
export const loadStars = doc =>
  doc.stars.map(r => {
    const s = unpack(r);
    const a = (s.raDeg * Math.PI) / 180, d = (s.decDeg * Math.PI) / 180;
    const ARC = Math.PI / 180 / 3600;
    // J2000 position and its proper-motion velocity (per year) as vectors: a star at an epoch is p + vel * years
    s.p = unitVector(s.raDeg, s.decDeg);
    const e = [-Math.sin(a), Math.cos(a), 0], n = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
    s.vel = [0, 1, 2].map(i => (s.pmRaArcsecYr * e[i] + s.pmDecArcsecYr * n[i]) * ARC);
    return s;
  });

/**
 * @param {number} jdUt  Julian date, UT (UTC taken as UT1)
 * @param {{latDeg, lonDeg}} site
 * @param {object[]} stars unpacked stars (loadStars)
 * @returns {{objects: object[], jdTt, lstDeg, moon, sun}}
 */
export function skyAt(jdUt, site, stars) {
  const jdTt = ttFromUt(jdUt);
  const frame = makeFastFrame({ jdUt, latDeg: site.latDeg, lonDeg: site.lonDeg });
  const gast = gastDeg(jdUt, jdTt);
  const yr = (jdTt - 2451545.0) / 365.25;
  const objects = [];
  const add = (id, type, name, h, extra = {}) => {
    const altDeg = h.altDeg;
    objects.push({ id, type, name, altDeg, azDeg: h.azDeg, airmass: altDeg > 0 ? airmass(altDeg) : null, ...extra });
  };
  // Sun
  const sun = apparentSun(jdTt);
  const hs = toHorizontal(wrap180(gast + site.lonDeg - sun.raDeg), sun.decDeg, site.latDeg);
  add('sun', 'sun', 'Sun', { altDeg: hs.altDeg + refractionFromTrue(hs.altDeg), azDeg: hs.azDeg }, { mag: -26.7, raDeg: sun.raDeg, decDeg: sun.decDeg });
  // Moon (parallax then refraction)
  const mo = topocentricMoon(jdUt, jdTt, site.latDeg, site.lonDeg);
  const ph = phase(jdTt);
  add('moon', 'moon', 'Moon', { altDeg: mo.altDeg + refractionFromTrue(mo.altDeg), azDeg: mo.azDeg }, { mag: null, raDeg: mo.raDeg, decDeg: mo.decDeg, illuminated: ph.illuminated, waxing: wrap360(mo.geocentric.longitudeDeg - sun.longitudeDeg) < 180 });
  // planets (J2000 mean positions from the series, then the same frame as a star)
  for (const id of PLANET_IDS) {
    const p = geocentricEquatorial(id, jdTt);
    const u = unitVector(p.raDeg, p.decDeg);
    const h = frame(u[0], u[1], u[2]);
    add(id, 'planet', id[0].toUpperCase() + id.slice(1), h, { mag: null, raDeg: p.raDeg, decDeg: p.decDeg });
  }
  // stars
  for (const s of stars) {
    const x = s.p[0] + s.vel[0] * yr, y = s.p[1] + s.vel[1] * yr, z = s.p[2] + s.vel[2] * yr;
    const h = frame(x, y, z);
    const up = h.altDeg > 0;
    objects.push({
      id: 'hr' + s.hr, type: 'star', name: s.name ?? (s.bayer || 'HR ' + s.hr), altDeg: h.altDeg, azDeg: h.azDeg, mag: s.v, bv: s.bv,
      airmass: up ? airmass(h.altDeg) : null,
      raDeg: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, decDeg: (Math.asin(z / Math.hypot(x, y, z)) * 180) / Math.PI,
    });
  }
  return { objects, jdTt, lstDeg: wrap360(gast + site.lonDeg), sun: objects[0], moon: objects[1] };
}
