// Unit-vector geometry for the crossmatch kernel: positions on the sphere,
// separations without the small-angle loss, a shift along a bearing.
import { unitVector } from '../sky/coords.js';
import { ARCSEC, RADIUS_TOLERANCE } from './constants.js';

const DEG = Math.PI / 180;

/** Unit vectors of ICRS positions (degrees), packed x, y, z. */
export function unitVectors(ra, dec) {
  const n = ra.length;
  const u = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const v = unitVector(ra[i], dec[i]);
    u[3 * i] = v[0];
    u[3 * i + 1] = v[1];
    u[3 * i + 2] = v[2];
  }
  return u;
}

/** Back to (ra, dec) in degrees, ra in [0, 360). */
export function raDecOf(x, y, z) {
  let ra = Math.atan2(y, x) / DEG;
  if (ra < 0) ra += 360;
  return [ra, Math.atan2(z, Math.hypot(x, y)) / DEG];
}

/** Angular separation of vector i of u and vector j of v in arcsec: atan2(|u x v|, u . v), exact near 0 and 180 degrees. */
export function separationArcsec(u, i, v, j) {
  const ax = u[3 * i];
  const ay = u[3 * i + 1];
  const az = u[3 * i + 2];
  const bx = v[3 * j];
  const by = v[3 * j + 1];
  const bz = v[3 * j + 2];
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  return (
    Math.atan2(Math.hypot(cx, cy, cz), ax * bx + ay * by + az * bz) / ARCSEC
  );
}

/**
 * The position `distanceArcsec` away along `bearingDeg` (from north through
 * east) by the great circle: r cos d + t sin d with t the unit tangent.
 * @returns {[number, number]} [ra, dec] degrees
 */
export function offsetPosition(raDeg, decDeg, distanceArcsec, bearingDeg) {
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  const b = bearingDeg * DEG;
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [
    -Math.sin(d) * Math.cos(a),
    -Math.sin(d) * Math.sin(a),
    Math.cos(d),
  ];
  const s = distanceArcsec * ARCSEC;
  const c = Math.cos(s);
  const sn = Math.sin(s);
  const t = [0, 1, 2].map(k => Math.cos(b) * north[k] + Math.sin(b) * east[k]);
  return raDecOf(
    r[0] * c + t[0] * sn,
    r[1] * c + t[1] * sn,
    r[2] * c + t[2] * sn
  );
}

/**
 * A search over the vectors u: rows within a radius of a query vector, by a
 * sweep over the rows sorted by z (a partner within a chord is within that
 * chord in z). No grid, so the poles and the right-ascension wrap need no case.
 * @param {Float64Array} u - packed unit vectors
 * @returns {(qx: number, qy: number, qz: number, radiusArcsec: number,
 *   visit: (j: number, separationArcsec: number) => void) => void}
 */
export function makeSweep(u) {
  const n = u.length / 3;
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (p, q) => u[3 * p + 2] - u[3 * q + 2] || p - q
  );
  const zs = Float64Array.from(order, i => u[3 * i + 2]);
  const lower = v => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (zs[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return (qx, qy, qz, radiusArcsec, visit) => {
    const chord = 2 * Math.sin((radiusArcsec * ARCSEC) / 2) * (1 + 1e-9);
    const q = [qx, qy, qz];
    for (let k = lower(qz - chord); k < n && zs[k] <= qz + chord; k++) {
      const j = order[k];
      const d = separationArcsec(q, 0, u, j);
      if (d <= radiusArcsec * (1 + RADIUS_TOLERANCE)) visit(j, d);
    }
  };
}
