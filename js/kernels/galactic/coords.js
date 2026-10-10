// =============================================================================
// Galactic kernel: coordinates, projection and space velocities
// -----------------------------------------------------------------------------
// The ICRS to Galactic rotation, the same for positions and for proper
// motions, the space velocity (U, V, W) of a star from its Gaia astrometry, and
// the Hammer-Aitoff projection the Observatory draws the sky in. Pure: no DOM,
// no clock, no imports. Angles in degrees at the interface, proper motions in
// mas/yr, parallax in mas, velocities in km/s, distances in kpc.
//
// The rotation is the one the Hipparcos catalogue defined (ESA 1997, vol. 1,
// section 1.5.3) and that Gaia uses: the Galactic pole at (192.85948, +27.12825)
// in ICRS, and the Galactic centre direction at l = 0 fixed by the position
// angle 122.93192 degrees of the pole's meridian. ICRS and the Hipparcos
// equatorial frame of J2000 differ by well under a milliarcsecond at the level
// of the definition, which is far below what any lesson can see.
// =============================================================================

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * One astronomical unit per year in km/s: 4.740470446 km/s is the speed that
 * a proper motion of 1 mas/yr is at 1 kpc. (IAU 2012 AU, Julian year.)
 */
export const K_PM = 4.740470446;

/** The Hipparcos/Gaia matrix A_G': ICRS Cartesian to Galactic Cartesian. */
export const A_G = Object.freeze([
  Object.freeze([-0.0548755604162154, -0.873437090234885, -0.4838350155487132]),
  Object.freeze([0.4941094278755837, -0.4448296299600112, 0.7469822444972189]),
  Object.freeze([-0.8676661490190047, -0.1980763734312015, 0.4559837761750669]),
]);

/** Where the Galactic frame's defining directions are, in ICRS degrees. */
export const GALACTIC_FRAME = Object.freeze({
  poleRa: 192.85948,
  poleDec: 27.12825,
  centreRa: 266.40498829,
  centreDec: -28.93617776,
  positionAngle: 122.93192,
});

const wrap360 = d => ((d % 360) + 360) % 360;
const mul = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
const mulT = (m, v) => [
  m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
  m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
  m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
];
const unit = (lon, lat) => [
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
];
const lonLat = v => ({
  lon: wrap360(Math.atan2(v[1], v[0]) * RAD),
  lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) * RAD,
});
/** The east and north unit vectors at a position, in the frame the position is in. */
const basis = (lon, lat) => ({
  east: [-Math.sin(lon * DEG), Math.cos(lon * DEG), 0],
  north: [
    -Math.cos(lon * DEG) * Math.sin(lat * DEG),
    -Math.sin(lon * DEG) * Math.sin(lat * DEG),
    Math.cos(lat * DEG),
  ],
});
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Equatorial (ICRS) to Galactic coordinates.
 * @param {number} raDeg
 * @param {number} decDeg
 * @returns {{l: number, b: number}} l in [0, 360), b in [-90, 90], degrees
 */
export function icrsToGalactic(raDeg, decDeg) {
  const { lon, lat } = lonLat(mul(A_G, unit(raDeg, decDeg)));
  return { l: lon, b: lat };
}

/**
 * Galactic to equatorial (ICRS) coordinates.
 * @param {number} lDeg
 * @param {number} bDeg
 * @returns {{ra: number, dec: number}} ra in [0, 360), dec in [-90, 90], degrees
 */
export function galacticToIcrs(lDeg, bDeg) {
  const { lon, lat } = lonLat(mulT(A_G, unit(lDeg, bDeg)));
  return { ra: lon, dec: lat };
}

/**
 * A proper motion in the Galactic frame: the same vector on the sky, resolved
 * along l and b instead of along right ascension and declination.
 * @param {number} raDeg
 * @param {number} decDeg
 * @param {number} pmRa - mu_alpha* = mu_alpha cos(dec), mas/yr
 * @param {number} pmDec - mas/yr
 * @returns {{l: number, b: number, pmL: number, pmB: number}} pmL = mu_l*, mas/yr
 */
export function propermotionToGalactic(raDeg, decDeg, pmRa, pmDec) {
  const eq = basis(raDeg, decDeg);
  const v = [0, 1, 2].map(i => eq.east[i] * pmRa + eq.north[i] * pmDec);
  const { l, b } = icrsToGalactic(raDeg, decDeg);
  const gal = basis(l, b);
  const w = mul(A_G, v);
  return { l, b, pmL: dot(w, gal.east), pmB: dot(w, gal.north) };
}

/**
 * The Galactic space velocity of a star from its astrometry: U towards the
 * Galactic centre, V in the direction of rotation, W towards the north pole,
 * all relative to the Sun (heliocentric, not corrected for the Sun's motion).
 * The distance is 1/parallax; no zero-point correction is applied, and the
 * result says so by carrying the parallax it used.
 *
 * @param {{ra: number, dec: number, parallax: number, pmRa: number,
 *   pmDec: number, rv: number}} s - degrees, mas, mas/yr, km/s
 * @returns {{U: number, V: number, W: number, l: number, b: number,
 *   distance: number, vl: number, vb: number}|null} null if the parallax is not positive
 */
export function spaceVelocity(s) {
  if (!(s.parallax > 0)) return null;
  const { l, b, pmL, pmB } = propermotionToGalactic(
    s.ra,
    s.dec,
    s.pmRa,
    s.pmDec
  );
  const d = 1 / s.parallax;
  const vl = K_PM * pmL * d;
  const vb = K_PM * pmB * d;
  const [cl, sl, cb, sb] = [
    Math.cos(l * DEG),
    Math.sin(l * DEG),
    Math.cos(b * DEG),
    Math.sin(b * DEG),
  ];
  return {
    U: s.rv * cb * cl - vl * sl - vb * sb * cl,
    V: s.rv * cb * sl + vl * cl - vb * sb * sl,
    W: s.rv * sb + vb * cb,
    l,
    b,
    distance: d,
    vl,
    vb,
  };
}

/**
 * Hammer-Aitoff projection of a Galactic position: equal-area, the whole sky
 * in an ellipse twice as wide as it is tall, longitude 0 in the middle and
 * increasing to the left (the astronomers' convention for a Galactic map).
 * @param {number} lDeg
 * @param {number} bDeg
 * @returns {{x: number, y: number}} x in [-2sqrt(2), 2sqrt(2)], y in [-sqrt(2), sqrt(2)]
 */
export function hammerAitoff(lDeg, bDeg) {
  const lon = (lDeg > 180 ? lDeg - 360 : lDeg) * DEG;
  const lat = bDeg * DEG;
  const half = lon / 2;
  const k = Math.sqrt(1 + Math.cos(lat) * Math.cos(half));
  return {
    x: (-2 * Math.SQRT2 * Math.cos(lat) * Math.sin(half)) / k,
    y: (Math.SQRT2 * Math.sin(lat)) / k,
  };
}
