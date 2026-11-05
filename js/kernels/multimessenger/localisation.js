// =============================================================================
// The sky localisation and the galaxy-count problem
// -----------------------------------------------------------------------------
// A gravitational-wave detection gives a region of sky (tens to thousands of
// square degrees) and a distance with an interval. The galaxies inside that
// region and shell are the candidate hosts; how many there are decides whether
// a host can be found at all. This module does the geometry only:
//
//   circle of angular radius r        2 pi (1 - cos r) sr  = 4 pi sin^2(r/2) sr
//   HEALPix pixel at nside n          4 pi / (12 n^2) sr   (n a power of two)
//   level-p region of a circular      -2 pi sigma^2 ln(1 - p)    (small angle;
//     Gaussian of width sigma          the kernel refuses sigma above 10 deg)
//   expected catalogue count          n (A / 4 pi) (4 pi / 3)(D_hi^3 - D_lo^3)
//
// The shell volume reads the distances as Euclidean distances. A luminosity
// distance is not a Euclidean one at any redshift; the gap is measured, not
// assumed, in MULTIMESSENGER.md (check R1) and sets the domain.
// =============================================================================

import { finite, refuse } from './constants.js';

const DEG = 180 / Math.PI;

/** The whole sky, square degrees. */
export const WHOLE_SKY_DEG2 = 4 * Math.PI * DEG * DEG;

/** Square degrees of a circle of angular radius `radiusDeg` (0 to 180). */
export function circleAreaDeg2(radiusDeg) {
  finite(radiusDeg, 'radiusDeg');
  if (radiusDeg < 0 || radiusDeg > 180)
    refuse(
      'bad-angle',
      "a circle's angular radius is between 0 and 180 degrees"
    );
  const s = Math.sin(radiusDeg / DEG / 2);
  return 4 * Math.PI * s * s * DEG * DEG;
}

const isPow2 = n => Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;

/** Square degrees of one HEALPix pixel at `nside` (a power of two). */
export function healpixPixelAreaDeg2(nside) {
  if (!isPow2(nside)) refuse('bad-nside', 'nside is a power of two');
  return WHOLE_SKY_DEG2 / (12 * nside * nside);
}

/** Square degrees of `pixels` HEALPix pixels at `nside`. */
export function healpixAreaDeg2(nside, pixels) {
  if (!Number.isInteger(pixels) || pixels < 0 || pixels > 12 * nside * nside)
    refuse('bad-pixels', 'a pixel count is an integer from 0 to 12 nside^2');
  return pixels * healpixPixelAreaDeg2(nside);
}

/** Square degrees inside the level-p contour of a circular Gaussian of width `sigmaDeg` (small angle only). */
export function gaussianAreaDeg2({ sigmaDeg, level }) {
  if (!(finite(sigmaDeg, 'sigmaDeg') > 0))
    refuse('bad-width', 'the width is positive');
  if (sigmaDeg > 10)
    refuse(
      'out-of-domain',
      'the flat-sky Gaussian area holds for widths up to 10 degrees'
    );
  if (!(finite(level, 'level') > 0 && level < 1))
    refuse('bad-level', 'a credible level is between 0 and 1');
  return -2 * Math.PI * sigmaDeg * sigmaDeg * Math.log1p(-level);
}

/** The Euclidean volume, Mpc^3, of the cone-shell of `areaDeg2` between two distances. */
export function shellVolumeMpc3({ areaDeg2, loMpc, hiMpc }) {
  finite(areaDeg2, 'areaDeg2');
  finite(loMpc, 'loMpc');
  finite(hiMpc, 'hiMpc');
  if (areaDeg2 < 0 || areaDeg2 > WHOLE_SKY_DEG2 * (1 + 1e-9))
    refuse('bad-area', 'an area is between 0 and the whole sky');
  if (loMpc < 0 || hiMpc < loMpc)
    refuse('bad-distance', 'the shell is 0 <= lo <= hi');
  return (
    (areaDeg2 / WHOLE_SKY_DEG2) *
    ((4 * Math.PI) / 3) *
    (hiMpc ** 3 - loMpc ** 3)
  );
}

/**
 * The expected number of catalogue galaxies in the localisation.
 * @param {{areaDeg2: number, loMpc: number, hiMpc: number, densityPerMpc3: number}} p
 */
export function expectedCount({ areaDeg2, loMpc, hiMpc, densityPerMpc3 }) {
  if (!(finite(densityPerMpc3, 'densityPerMpc3') >= 0))
    refuse('bad-density', 'a number density is not negative');
  return densityPerMpc3 * shellVolumeMpc3({ areaDeg2, loMpc, hiMpc });
}

/** Probability that a Poisson count with mean N is zero (no candidate at all). */
export const probabilityNoCandidate = N => Math.exp(-N);

/** Probability of at least one, without the cancellation of 1 - exp(-N) at small N. */
export const probabilityAtLeastOne = N => -Math.expm1(-N);

/** The distance shell a catalogue interval gives, Mpc: [value + lower, value + upper] (lower is negative). */
export function distanceShell({ value, lower, upper }) {
  const lo = finite(value, 'value') + finite(lower, 'lower');
  const hi = value + finite(upper, 'upper');
  if (!(lo >= 0 && hi >= lo))
    refuse('bad-distance', 'the interval is not a shell');
  return { loMpc: lo, hiMpc: hi };
}

/**
 * Gnomonic (tangent-plane) offsets, degrees, of a sky position about a centre: x east, y north. The host rule
 * works on this plane. A point 90 degrees or more from the centre is refused.
 * @param {{raDeg: number, decDeg: number}} p
 * @param {{raDeg: number, decDeg: number}} centre
 */
export function tangentOffsetDeg(p, centre) {
  const r = Math.PI / 180;
  const a =
    (finite(p.raDeg, 'raDeg') - finite(centre.raDeg, 'centre.raDeg')) * r;
  const d = finite(p.decDeg, 'decDeg') * r;
  const d0 = finite(centre.decDeg, 'centre.decDeg') * r;
  const cosc =
    Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a);
  if (!(cosc > 1e-9))
    refuse(
      'out-of-domain',
      'the position is 90 degrees or more from the centre'
    );
  return {
    x: ((Math.cos(d) * Math.sin(a)) / cosc) * DEG,
    y:
      ((Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a)) /
        cosc) *
      DEG,
  };
}
