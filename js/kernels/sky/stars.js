// =============================================================================
// Sky kernel: catalogue stars
// -----------------------------------------------------------------------------
// Unpacks the rows of the sky-bright-stars sidecar and moves a star from the
// catalogue's J2000.0 position to a date. Pure: no DOM, no clock, no network.
//
// Proper motion is linear, from the catalogue's pmra (which already carries
// cos dec) and pmde; radial velocity and parallax are neglected. Against ERFA's
// pmsafe, which keeps both, the position error over 1900-2100 is at most 0.016
// arcminute, on Barnard's-star-class motions. The stars of the pack all move
// less than 4.1 arcseconds a year.
// =============================================================================

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;

/** Unit vector of an equatorial direction, degrees. */
export const unitVector = (raDeg, decDeg) => {
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  const c = Math.cos(d);
  return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)];
};

/**
 * One row of the sidecar as a star, with its J2000 unit vector `p` and its
 * velocity `vel` in unit-vector units per Julian year, so a star at an epoch is
 * p + vel * years, normalised.
 * @param {Array} r - [hr, ra, dec, v, bv, pmra, pmde, desig, name, sp, tcol]
 */
export function unpackStar(r) {
  const s = {
    hr: r[0],
    raDeg: r[1] / 1e4,
    decDeg: r[2] / 1e4,
    v: r[3] / 100,
    bv: r[4] === null ? null : r[4] / 100,
    pmRaArcsecYr: r[5] / 1000,
    pmDecArcsecYr: r[6] / 1000,
    desig: r[7],
    name: r[8] || null,
    sp: r[9],
    colourTempK: r[10] || null,
  };
  const a = s.raDeg * DEG;
  const d = s.decDeg * DEG;
  s.p = unitVector(s.raDeg, s.decDeg);
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [
    -Math.sin(d) * Math.cos(a),
    -Math.sin(d) * Math.sin(a),
    Math.cos(d),
  ];
  s.vel = [0, 1, 2].map(
    i => (s.pmRaArcsecYr * east[i] + s.pmDecArcsecYr * north[i]) * ARCSEC
  );
  return s;
}

/** Every star of a sidecar document, brightest first. */
export const loadStars = doc => doc.stars.map(unpackStar);

/**
 * A star's equatorial J2000 position at a TT Julian date, with proper motion.
 * @param {object} s - From unpackStar
 * @param {number} jdTt
 * @returns {{raDeg: number, decDeg: number, vector: number[]}}
 */
export function starAtEpoch(s, jdTt) {
  const yr = (jdTt - 2451545.0) / 365.25;
  const x = s.p[0] + s.vel[0] * yr;
  const y = s.p[1] + s.vel[1] * yr;
  const z = s.p[2] + s.vel[2] * yr;
  const n = Math.hypot(x, y, z);
  return {
    raDeg: (((Math.atan2(y, x) / DEG) % 360) + 360) % 360,
    decDeg: Math.asin(z / n) / DEG,
    vector: [x, y, z],
  };
}

/**
 * How a star is drawn: a colour from its colour temperature (the Tanner Helland
 * blackbody fit js/bodyVisuals.js starColor uses, quantised to 100 K; a test
 * holds the two equal) and a radius that grows as the star brightens.
 * @param {number|null} tK - Colour temperature, kelvin; null is drawn white
 * @returns {{r: number, g: number, b: number}} 0-255
 */
export function colourOfTemperature(tK) {
  if (!Number.isFinite(tK) || tK <= 0) return { r: 255, g: 255, b: 255 };
  const k = Math.round(Math.min(40000, Math.max(1500, tK)) / 100);
  const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  let r;
  let g;
  let b;
  if (k <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(k) - 161.1195681661;
    b = k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (k - 60) ** -0.1332047592;
    g = 288.1221695283 * (k - 60) ** -0.0755148492;
    b = 255;
  }
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}
