// SPIKE (Prompt 87), not production. Planet positions from the JPL "Keplerian
// Elements for Approximate Positions of the Major Planets" (E. M. Standish, JPL
// SSD), Table 1, valid 1800 AD - 2050 AD: elements and their rates per Julian
// century, referred to the mean ecliptic and equinox of J2000.
//   [a (au), da, e, de, I (deg), dI, L (deg), dL, long.peri (deg), d, long.node (deg), d]
const DEG = Math.PI / 180;
const TABLE = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  mars: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.9542763, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
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
  let M = (((L - wbar) % 360) + 540) % 360 - 180; // degrees, -180..180
  M *= DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(I), si = Math.sin(I);
  return [
    (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Geocentric ecliptic (J2000) vector, au: the body less the Earth-Moon barycenter. */
export function geocentricEcliptic(body, jdTt) {
  const p = heliocentric(body, jdTt);
  const e = heliocentric('earth', jdTt);
  return [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
}

/** Geocentric RA/Dec (J2000 mean equator), degrees, and distance in au. */
export function geocentricEquatorial(body, jdTt) {
  const [x, y, z] = geocentricEcliptic(body, jdTt);
  const ce = Math.cos(EPS_J2000), se = Math.sin(EPS_J2000);
  const X = x, Y = y * ce - z * se, Z = y * se + z * ce;
  const r = Math.hypot(X, Y, Z);
  return { raDeg: ((Math.atan2(Y, X) / DEG) + 360) % 360, decDeg: Math.asin(Z / r) / DEG, distanceAu: r };
}
