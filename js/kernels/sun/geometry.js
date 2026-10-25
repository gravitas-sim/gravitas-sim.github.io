// =============================================================================
// Solar kernel: disc geometry (Prompt 194, SUN_KERNEL.md)
// -----------------------------------------------------------------------------
// A pixel on a solar disc image to a heliographic latitude and longitude, and
// back. The standard geometry of Thompson (2006, A&A 449, 791) and Meeus
// (Astronomical Algorithms, ch. 29): the disc's centre and radius in pixels, the
// position angle P of the solar north pole (counterclockwise from image up, the
// image having north up and east left), the heliographic latitude B0 of the disc
// centre and the Carrington longitude L0 of the central meridian. Pure: no DOM,
// no clock, no network.
//
// Without a distance the projection is orthographic (the observer at infinity).
// With `distanceAu` the observer is at a finite distance, the apparent disc has
// the angular radius asin(R_sun / d), the normalised radius is linear in angle
// and the visible hemisphere is slightly smaller than a half: the heliocentric
// angle of the limb is 90 degrees minus that radius (0.27 degree at 1 AU).
//
// Stonyhurst longitude is positive to the solar west (the right of the image);
// Carrington longitude is L0 plus it. A pixel off the disc is refused.
// =============================================================================

import { AU_M, R_SUN_M } from '../radiation/constants.js';
import { refused } from '../statistics/check.js';

const { Math, Number } = globalThis;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const finite = Number.isFinite;
const wrap360 = d => ((d % 360) + 360) % 360;

/** The Sun's apparent angular radius, radians, at `distanceAu`. */
export const sunAngularRadius = distanceAu =>
  Math.asin(R_SUN_M / (distanceAu * AU_M));

/** The disc, checked: null if it is usable, else a refusal. */
export function checkDisk(disk) {
  const d = disk;
  const bad = why => refused('bad-disk', why);
  if (!d || typeof d !== 'object') return bad('there is no disc geometry');
  if (!(finite(d.cx) && finite(d.cy)))
    return bad('the disc centre is not a pair of finite numbers');
  if (!(finite(d.radiusPx) && d.radiusPx > 0))
    return bad('the disc radius is not a positive number of pixels');
  if (!(finite(d.pDeg) && Math.abs(d.pDeg) <= 360))
    return bad('the position angle P is not within 360 degrees');
  if (!(finite(d.b0Deg) && Math.abs(d.b0Deg) <= 90))
    return bad('B0 is not within 90 degrees');
  if (!finite(d.l0Deg)) return bad('L0 is not a finite number');
  if (d.distanceAu !== undefined) {
    if (
      !(finite(d.distanceAu) && d.distanceAu > 0) ||
      d.distanceAu * AU_M <= R_SUN_M
    )
      return bad('the distance is not a positive distance outside the Sun');
  }
  return null;
}

/** sin of the angular radius (1 / D), or 0 for the orthographic case. */
const sinSun = d =>
  d.distanceAu === undefined ? 0 : R_SUN_M / (d.distanceAu * AU_M);

/**
 * Pixel (x right, y down, as marks are placed) to heliographic coordinates.
 * Returns { latDeg, lonStonyDeg, lonCarringtonDeg, mu, r } (r the normalised
 * radius, mu the cosine of the angle between the surface normal and the line of
 * sight: 1 at the centre, 0 at the limb) or a refusal.
 */
export function diskToHeliographic(x, y, disk) {
  const bad = checkDisk(disk);
  if (bad) return bad;
  if (!(finite(x) && finite(y)))
    return refused('off-disc', 'the pixel is not a pair of finite numbers');
  const X = (x - disk.cx) / disk.radiusPx;
  const Y = (disk.cy - y) / disk.radiusPx;
  const r0 = Math.hypot(X, Y);
  if (r0 > 1 + 1e-12)
    return refused('off-disc', 'the pixel is outside the solar disc');
  const r = Math.min(r0, 1);
  const cp = Math.cos(disk.pDeg * DEG);
  const sp = Math.sin(disk.pDeg * DEG);
  const s = sinSun(disk);
  let xs;
  let ys;
  let zs;
  let mu;
  if (s === 0) {
    // orthographic: rotate by -P
    xs = X * cp + Y * sp;
    ys = -X * sp + Y * cp;
    zs = Math.sqrt(Math.max(0, 1 - r * r));
    mu = zs;
  } else {
    const theta = r * Math.asin(s);
    const rho = Math.asin(Math.min(1, Math.sin(theta) / s)) - theta;
    const sr = Math.sin(rho);
    const ux = r > 0 ? X / r : 0;
    const uy = r > 0 ? Y / r : 0;
    xs = sr * (ux * cp + uy * sp);
    ys = sr * (-ux * sp + uy * cp);
    zs = Math.cos(rho);
    const D = 1 / s;
    mu = (zs * D - 1) / Math.sqrt(D * D - 2 * zs * D + 1);
  }
  const cb = Math.cos(disk.b0Deg * DEG);
  const sb = Math.sin(disk.b0Deg * DEG);
  const lat = Math.asin(Math.max(-1, Math.min(1, ys * cb + zs * sb)));
  const lon = Math.atan2(xs, zs * cb - ys * sb) * RAD;
  return {
    latDeg: lat * RAD,
    lonStonyDeg: lon,
    lonCarringtonDeg: wrap360(disk.l0Deg + lon),
    mu: Math.max(0, mu),
    r,
  };
}

/**
 * Heliographic latitude and Stonyhurst longitude (degrees) to a pixel, or a
 * refusal for a point on the far side. Returns { x, y, mu, r }.
 */
export function heliographicToDisk(latDeg, lonStonyDeg, disk) {
  const bad = checkDisk(disk);
  if (bad) return bad;
  if (!(finite(latDeg) && Math.abs(latDeg) <= 90 && finite(lonStonyDeg)))
    return refused('off-disc', 'the latitude or longitude is not a position');
  const phi = latDeg * DEG;
  const lam = lonStonyDeg * DEG;
  const hx = Math.cos(phi) * Math.sin(lam);
  const hy = Math.sin(phi);
  const hz = Math.cos(phi) * Math.cos(lam);
  const cb = Math.cos(disk.b0Deg * DEG);
  const sb = Math.sin(disk.b0Deg * DEG);
  const yo = hy * cb - hz * sb;
  const zo = hz * cb + hy * sb;
  const s = sinSun(disk);
  if (!(zo > s))
    return refused('off-disc', 'the point is on the far side of the Sun');
  const rho = Math.hypot(hx, yo);
  let r;
  let mu;
  if (s === 0) {
    r = rho;
    mu = zo;
  } else {
    const D = 1 / s;
    r = Math.atan2(rho, D - zo) / Math.asin(s);
    mu = (zo * D - 1) / Math.sqrt(D * D - 2 * zo * D + 1);
  }
  const ux = rho > 0 ? hx / rho : 0;
  const uy = rho > 0 ? yo / rho : 0;
  const cp = Math.cos(disk.pDeg * DEG);
  const sp = Math.sin(disk.pDeg * DEG);
  // rotate by +P back to the image
  const X = r * (ux * cp - uy * sp);
  const Y = r * (ux * sp + uy * cp);
  return {
    x: disk.cx + X * disk.radiusPx,
    y: disk.cy - Y * disk.radiusPx,
    mu: Math.max(0, mu),
    r,
  };
}

/**
 * The one-sigma uncertainty of a position from a placement sigma in pixels, by
 * the secant: the half difference of the position at +sigma and -sigma along image x
 * and along image y, in quadrature, a displaced point outside the disc clamped
 * to the limb. Near the limb it is large and one-sided: the foreshortening.
 */
export function positionSigma(x, y, disk, sigmaPx = 1) {
  const here = diskToHeliographic(x, y, disk);
  if (here.status === 'refused') return here;
  if (!(finite(sigmaPx) && sigmaPx > 0))
    return refused('bad-sigma', 'the placement sigma is not a positive number');
  const at = (xx, yy) => {
    const dx = xx - disk.cx;
    const dy = yy - disk.cy;
    const rr = Math.hypot(dx, dy) / disk.radiusPx;
    const k = rr > 1 ? (1 - 1e-12) / rr : 1;
    return diskToHeliographic(disk.cx + dx * k, disk.cy + dy * k, disk);
  };
  const half = (a, b, key) => Math.abs(a[key] - b[key]) / 2;
  const xp = at(x + sigmaPx, y);
  const xm = at(x - sigmaPx, y);
  const yp = at(x, y + sigmaPx);
  const ym = at(x, y - sigmaPx);
  return {
    sigmaLonDeg: Math.hypot(
      half(xp, xm, 'lonStonyDeg'),
      half(yp, ym, 'lonStonyDeg')
    ),
    sigmaLatDeg: Math.hypot(half(xp, xm, 'latDeg'), half(yp, ym, 'latDeg')),
    mu: here.mu,
  };
}
