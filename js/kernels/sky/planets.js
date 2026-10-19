// =============================================================================
// Sky kernel: planets
// -----------------------------------------------------------------------------
// Positions of the planets from the JPL "Keplerian Elements for Approximate
// Positions of the Major Planets" (E. M. Standish, JPL Solar System Dynamics),
// Table 1, valid 1800-2050 AD: elements and their rates per Julian century,
// referred to the mean ecliptic and equinox of J2000. Geometric, geocentric,
// with no light-time. Against ERFA's plan94 over 1900-2050 the worst cases are
// Mercury 0.014, Venus 0.023, Mars 0.051, Jupiter 0.175 and Saturn 0.2043
// degree, 0.0043 over the 0.2 the Sky Lab gate set for Saturn, so Saturn is
// drawn with that tolerance stated. Uranus and Neptune (0.033 and 0.019
// degree) are in the table and not drawn. Pure: no DOM, no clock.
// Outside 1800-2050 the series is extrapolated and not validated.
//   [a (au), da, e, de, I (deg), dI, L (deg), dL, long.peri (deg), d, long.node (deg), d]
// =============================================================================

import { solveKepler } from '../../kepler.js';

const DEG = Math.PI / 180;
const TABLE = {
  mercury: [
    0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749,
    252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593,
    -0.12534081,
  ],
  venus: [
    0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889,
    181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255,
    -0.27769418,
  ],
  earth: [
    1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668,
    100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0,
  ],
  mars: [
    1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131,
    -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891,
    -0.29257343,
  ],
  jupiter: [
    5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714,
    34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909,
    0.20469106,
  ],
  saturn: [
    9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609,
    49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448,
    -0.28867794,
  ],
  uranus: [
    19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939,
    313.23810451, 428.48202785, 170.9542763, 0.40805281, 74.01692503,
    0.04240589,
  ],
  neptune: [
    30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372,
    -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574,
    -0.00508664,
  ],
};
export const PLANETS = Object.keys(TABLE).filter(k => k !== 'earth');
const EPS_J2000 = 23.439291111 * DEG;

/** Heliocentric ecliptic (J2000) position of a body, au, at a TT Julian date. */
export function heliocentric(body, jdTt) {
  const t = (jdTt - 2451545.0) / 36525;
  const k = TABLE[body];
  const a = k[0] + k[1] * t;
  const e = k[2] + k[3] * t;
  const I = (k[4] + k[5] * t) * DEG;
  const L = k[6] + k[7] * t;
  const wbar = k[8] + k[9] * t;
  const node = (k[10] + k[11] * t) * DEG;
  const w = (wbar - (k[10] + k[11] * t)) * DEG;
  let M = ((((L - wbar) % 360) + 540) % 360) - 180; // degrees, -180..180
  M *= DEG;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w),
    sw = Math.sin(w),
    cn = Math.cos(node),
    sn = Math.sin(node),
    ci = Math.cos(I),
    si = Math.sin(I);
  return [
    (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/**
 * Where a planet is, from one of two sources: Standish's elements, or an
 * ephemeris source (createPlanetSource, below) where it covers the body and the
 * date. `source` is the optional last argument everywhere below; null (the
 * default) is the elements alone, so a caller that never heard of the source
 * reads what it always read.
 * @typedef {object} PlanetSource
 * @property {(body: string, jdTt: number) => boolean} covers
 * @property {(body: string, jdTt: number) => number[]} geocentric - au, ecliptic J2000, light-time corrected
 * @property {(body: string, jdTt: number) => {p: number[], e: number[]}} helio - the planet as seen leaving it and the Earth, au
 */

/** Whether a source supplies this planet at this date. */
export const sourceCovers = (source, body, jdTt) =>
  Boolean(source) && source.covers(body, jdTt);

/** Geocentric ecliptic (J2000) vector, au: the body less the Earth-Moon barycenter. */
export function geocentricEcliptic(body, jdTt, source = null) {
  if (sourceCovers(source, body, jdTt)) return source.geocentric(body, jdTt);
  const p = heliocentric(body, jdTt);
  const e = heliocentric('earth', jdTt);
  return [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
}

/** Geocentric RA/Dec (J2000 mean equator), degrees, and distance in au. */
export function geocentricEquatorial(body, jdTt, source = null) {
  const [x, y, z] = geocentricEcliptic(body, jdTt, source);
  const ce = Math.cos(EPS_J2000),
    se = Math.sin(EPS_J2000);
  const X = x,
    Y = y * ce - z * se,
    Z = y * se + z * ce;
  const r = Math.hypot(X, Y, Z);
  return {
    raDeg: (Math.atan2(Y, X) / DEG + 360) % 360,
    decDeg: Math.asin(Z / r) / DEG,
    distanceAu: r,
  };
}

/**
 * Elongation from the Sun, phase angle (Sun-planet-Earth) and illuminated
 * fraction, from the same positions as the planet's place: the elements', or
 * the source's where it covers the planet. Geometric; with a source the planet
 * is where its light left it.
 * @param {string} body - A key of PLANETS
 * @param {number} jdTt - TT Julian date
 * @param {PlanetSource|null} [source]
 * @returns {{elongationDeg: number, phaseAngleDeg: number,
 *   illuminated: number, distanceAu: number, sunDistanceAu: number}}
 */
export function planetPhase(body, jdTt, source = null) {
  const viaSource = sourceCovers(source, body, jdTt);
  const { p, e } = viaSource
    ? source.helio(body, jdTt)
    : { p: heliocentric(body, jdTt), e: heliocentric('earth', jdTt) };
  const r = Math.hypot(...p); // Sun - planet
  const R = Math.hypot(...e); // Sun - Earth
  const d = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]); // Earth - planet
  const cl = x => Math.max(-1, Math.min(1, x));
  const elongation = Math.acos(cl((R * R + d * d - r * r) / (2 * R * d)));
  const phase = Math.acos(cl((r * r + d * d - R * R) / (2 * r * d)));
  return {
    elongationDeg: elongation / DEG,
    phaseAngleDeg: phase / DEG,
    illuminated: (1 + Math.cos(phase)) / 2,
    distanceAu: d,
    sunDistanceAu: R,
  };
}

// -----------------------------------------------------------------------------
// The ephemeris pack as a source of planet positions (Roadmap II Prompt 106,
// SKY_LAB.md "Planet positions")
// -----------------------------------------------------------------------------
// The mission lab's pack (MISSION_LAB.md: JPL DE441, Venus, Earth, Mars and the
// Jupiter system barycenter, 2025 to 2045, a few km) becomes the Sky Lab's
// source of planet positions wherever it covers the date; elsewhere, and for
// Mercury and Saturn, which the pack does not hold, the elements above stay,
// and the page says which it used. What the source does that the elements do
// not:
//   - the Earth is the geocenter (Horizons 399), not the Earth-Moon barycenter
//     the elements give, so the planets are not shifted by the Moon's 4,670 km
//   - the planet is where its light left it: the light-time is solved from the
//     pack's own positions (four passes; the planet's motion in the light-time
//     changes the next pass by 1e-4 of itself)
// What it does not do: stellar aberration and the Sun's light bending are not
// applied here (the Sky Lab's frame adds the observer's aberration), and the
// pack is read at a TT date as a TDB one (under 2 ms apart, 3e-8 degree of a
// planet's motion). The pack's Jupiter is the Jupiter system barycenter, which
// moves smoothly; the planet's center differs by up to about 1,000 km, 0.4
// arcsecond at the nearest approach. Pure: a source is made from an ephemeris
// (js/mission/ephemeris.js), and nothing here reads a file or a clock.
// -----------------------------------------------------------------------------

const AU_KM = 149597870.7;
const C_KM_S = 299792.458;
const DAY_S = 86400;
/** Light-time margin at the start of the range, days (Jupiter's is 0.04). */
const MARGIN_DAYS = 0.05;

/** The sky planets the pack holds, by the Sky Lab's ids. */
export const SOURCE_BODIES = Object.freeze(['venus', 'mars', 'jupiter']);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = a => Math.hypot(a[0], a[1], a[2]);

/**
 * A planet source from an ephemeris.
 * @param {{pack: object, range: {startJd: number, stopJd: number},
 *   stateAt: Function}} ephemeris - From createEphemeris
 * @returns {object} A PlanetSource (./planets.js) with `info`
 */
export function createPlanetSource(ephemeris) {
  const { startJd, stopJd } = ephemeris.range;
  const earthAt = jd => ephemeris.stateAt('earth', jd).r;
  /** The planet as seen from the geocenter, light-time corrected, km. */
  function geometry(body, jd) {
    const e = earthAt(jd);
    let tau = 0;
    let p = ephemeris.stateAt(body, jd).r;
    for (let i = 0; i < 4; i++) {
      p = ephemeris.stateAt(body, jd - tau / DAY_S).r;
      tau = norm(sub(p, e)) / C_KM_S;
    }
    return { p, e, tauS: tau };
  }
  const bounds = Object.fromEntries(
    ephemeris.pack.bodies.map(b => [b.id, b.maxError])
  );
  return {
    id: 'ephemeris',
    info: Object.freeze({
      pack: ephemeris.pack.id,
      version: ephemeris.pack.version,
      title: ephemeris.pack.title,
      credit: ephemeris.pack.credit,
      frame: ephemeris.pack.frame,
      startJd,
      stopJd,
      bodies: SOURCE_BODIES,
      /**
       * The pack's stated bound on a body's geocentric position, km: its own
       * and the Earth's, which are subtracted.
       */
      positionBoundKm: id =>
        bounds[id] && bounds.earth
          ? bounds[id].positionKm + bounds.earth.positionKm
          : null,
    }),
    covers: (body, jdTt) =>
      SOURCE_BODIES.includes(body) &&
      jdTt - MARGIN_DAYS >= startJd &&
      jdTt <= stopJd,
    /** Geocentric ecliptic J2000 vector, au. */
    geocentric(body, jdTt) {
      const { p, e } = geometry(body, jdTt);
      return sub(p, e).map(x => x / AU_KM);
    },
    /** The planet and the Earth, heliocentric, au: for the phase. */
    helio(body, jdTt) {
      const { p, e } = geometry(body, jdTt);
      return { p: p.map(x => x / AU_KM), e: e.map(x => x / AU_KM) };
    },
    /** The light-time to a planet, seconds. */
    lightTimeSeconds: (body, jdTt) => geometry(body, jdTt).tauS,
  };
}

/**
 * Which source a planet at a date is drawn from, and how well.
 * @param {object|null} source - A PlanetSource, or null for the elements alone
 * @param {string} body - A sky planet's id
 * @param {number} jdTt
 * @returns {{via: 'ephemeris'|'elements', boundDeg: number,
 *   positionBoundKm: ?number}} `boundDeg` is the planet's own position bound
 *   (the pack's km at the planet's distance, or the elements' measured 0.2
 *   degree), before the sky chain's.
 */
export function planetProvenance(source, body, jdTt) {
  if (source?.covers(body, jdTt)) {
    const km = source.info.positionBoundKm(body);
    const d = norm(source.geocentric(body, jdTt)) * AU_KM;
    return {
      via: 'ephemeris',
      positionBoundKm: km,
      boundDeg: (Math.atan2(km, d) * 180) / Math.PI,
    };
  }
  return { via: 'elements', boundDeg: 0.2, positionBoundKm: null };
}
