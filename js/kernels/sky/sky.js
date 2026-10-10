// =============================================================================
// Sky kernel: what is where
// -----------------------------------------------------------------------------
// One function that says what is where, for a date, a site and a list of stars.
// The drawing and the table both read it, so they cannot disagree.
//
// Altitudes are apparent (refracted, in a standard atmosphere); the Moon is
// topocentric (parallax applied). The Sun and Moon are the series of
// ./solar.js, the planets Standish's elements (./planets.js), the stars the
// catalogue with linear proper motion (./stars.js). Pure: no DOM, no clock.
// =============================================================================

import { airmass } from '../../observingWindow.js';
import { ttFromUt, gastDeg, wrap360 } from './time.js';
import {
  toHorizontal,
  makeFastFrame,
  refractionFromTrue,
  unitVector,
} from './coords.js';
import { apparentSun, topocentricMoon, phase } from './solar.js';
import { geocentricEquatorial } from './planets.js';
import { starAtEpoch } from './stars.js';

/** The planets the Sky Lab draws, in order. Saturn carries its 0.2 degree tolerance. */
export const PLANET_IDS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
/** The planets' validity (Standish Table 1); drawn only inside it. */
export const PLANET_RANGE_JD = [2378496.5, 2469807.5]; // 1800-01-01 to 2050-01-01

const wrap180 = d => wrap360(d + 180) - 180;
const DEG = Math.PI / 180;

/**
 * @typedef {object} SkyObject
 * @property {string} id - 'sun', 'moon', a planet's id, or 'hr' and its number
 * @property {'sun'|'moon'|'planet'|'star'} type
 * @property {number} altDeg - Apparent altitude
 * @property {number} azDeg - Azimuth from north, east positive
 * @property {number|null} airmass - Kasten and Young, null below the horizon
 * @property {number|null} mag
 * @property {number} raDeg - Of date, apparent
 * @property {number} decDeg
 */

/**
 * @param {number} jdUt - Julian date, UT (UTC taken as UT1)
 * @param {{latDeg: number, lonDeg: number}} site - Longitude east positive
 * @param {object[]} stars - Unpacked stars (loadStars)
 * @param {{planets?: boolean}} [opts]
 * @returns {{objects: SkyObject[], jdTt: number, lstDeg: number, gastDeg: number,
 *   sun: SkyObject, moon: SkyObject, planetsInRange: boolean}}
 */
export function skyAt(jdUt, site, stars, { planets = true } = {}) {
  const jdTt = ttFromUt(jdUt);
  const frame = makeFastFrame({
    jdUt,
    latDeg: site.latDeg,
    lonDeg: site.lonDeg,
  });
  const gast = gastDeg(jdUt, jdTt);
  const objects = [];
  const add = (id, type, h, extra) =>
    objects.push({
      id,
      type,
      altDeg: h.altDeg,
      azDeg: h.azDeg,
      airmass: h.altDeg > 0 ? airmass(h.altDeg) : null,
      ...extra,
    });

  const sun = apparentSun(jdTt);
  const hs = toHorizontal(
    wrap180(gast + site.lonDeg - sun.raDeg),
    sun.decDeg,
    site.latDeg
  );
  add(
    'sun',
    'sun',
    { altDeg: hs.altDeg + refractionFromTrue(hs.altDeg), azDeg: hs.azDeg },
    { mag: -26.74, raDeg: sun.raDeg, decDeg: sun.decDeg, altGeomDeg: hs.altDeg }
  );

  const mo = topocentricMoon(jdUt, jdTt, site.latDeg, site.lonDeg);
  const ph = phase(jdTt);
  add(
    'moon',
    'moon',
    { altDeg: mo.altDeg + refractionFromTrue(mo.altDeg), azDeg: mo.azDeg },
    {
      mag: null,
      raDeg: mo.raDeg,
      decDeg: mo.decDeg,
      altGeomDeg: mo.altDeg,
      illuminated: ph.illuminated,
      waxing: wrap360(mo.geocentric.longitudeDeg - sun.longitudeDeg) < 180,
    }
  );

  const planetsInRange =
    planets && jdTt >= PLANET_RANGE_JD[0] && jdTt <= PLANET_RANGE_JD[1];
  if (planetsInRange) {
    for (const id of PLANET_IDS) {
      const p = geocentricEquatorial(id, jdTt);
      const u = unitVector(p.raDeg, p.decDeg);
      add(id, 'planet', frame(u[0], u[1], u[2]), {
        mag: null,
        raDeg: p.raDeg,
        decDeg: p.decDeg,
      });
    }
  }

  for (const s of stars) {
    const [x, y, z] = starAtEpoch(s, jdTt).vector;
    const h = frame(x, y, z);
    objects.push({
      id: `hr${s.hr}`,
      type: 'star',
      altDeg: h.altDeg,
      azDeg: h.azDeg,
      airmass: h.altDeg > 0 ? airmass(h.altDeg) : null,
      mag: s.v,
      raDeg: wrap360(Math.atan2(y, x) / DEG),
      decDeg: Math.asin(z / Math.hypot(x, y, z)) / DEG,
    });
  }
  return {
    objects,
    jdTt,
    lstDeg: wrap360(gast + site.lonDeg),
    gastDeg: gast,
    sun: objects[0],
    moon: objects[1],
    planetsInRange,
  };
}
