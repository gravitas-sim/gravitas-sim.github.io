// =============================================================================
// Epoch propagation: positions with proper motions to a common epoch
// -----------------------------------------------------------------------------
// Straight-line motion in space with the radial velocity taken as zero: for a
// source at unit vector r with tangent basis p (east) and q (north) and proper
// motion (mu_alpha*, mu_delta) in rad/yr,
//     r' = normalised(r + dt (mu_alpha* p + mu_delta q)),   dt = toEpoch - epoch.
// Pure northward motion therefore moves the declination by exactly
// atan(mu_delta dt). A radial velocity would add a perspective term the kernel
// neglects and CROSSMATCH.md states. Position variances per axis:
// sigma'^2 = sigma0^2 + (sigma_mu dt)^2, the position and proper-motion errors
// taken as uncorrelated (the packs carry no position-proper-motion correlation).
// =============================================================================

import { refused } from '../statistics/check.js';
import { ARCSEC, LIMITS, MAS } from './constants.js';
import { raDecOf } from './geometry.js';

const DEG = Math.PI / 180;
export const at = (v, i) =>
  Array.isArray(v) || ArrayBuffer.isView(v) ? v[i] : v;

/**
 * @param {{ra: ArrayLike<number>, dec: ArrayLike<number>, epoch: number|ArrayLike<number>,
 *   pmra?: ArrayLike<number>, pmdec?: ArrayLike<number>, sigmaPosArcsec?: number|ArrayLike<number>,
 *   pmraErr?: number|ArrayLike<number>, pmdecErr?: number|ArrayLike<number>}} cat
 * @param {number} toEpoch - Julian year
 * @returns {object} {status: 'ok', ra, dec, valid, excluded, sigmaRa, sigmaDec} or a refusal
 */
export function propagateCatalog(cat, toEpoch) {
  if (!Number.isFinite(toEpoch))
    return refused('epoch', 'the common epoch is not a number');
  const n = cat.ra.length;
  const ra = new Float64Array(n);
  const dec = new Float64Array(n);
  const valid = new Uint8Array(n);
  const hasSigma =
    cat.sigmaPosArcsec !== undefined && cat.sigmaPosArcsec !== null;
  const sigmaRa = hasSigma ? new Float64Array(n) : null;
  const sigmaDec = hasSigma ? new Float64Array(n) : null;
  let excluded = 0;
  for (let i = 0; i < n; i++) {
    const dt = toEpoch - at(cat.epoch, i);
    const a = cat.ra[i] * DEG;
    const d = cat.dec[i] * DEG;
    if (dt === 0) {
      ra[i] = cat.ra[i];
      dec[i] = cat.dec[i];
      valid[i] = 1;
      if (hasSigma) sigmaRa[i] = sigmaDec[i] = at(cat.sigmaPosArcsec, i);
      continue;
    }
    const mua = cat.pmra?.[i];
    const mud = cat.pmdec?.[i];
    if (!Number.isFinite(mua) || !Number.isFinite(mud)) {
      excluded++;
      continue;
    }
    const sa = mua * MAS * dt;
    const sd = mud * MAS * dt;
    const shift = Math.hypot(sa, sd) / ARCSEC;
    if (shift > LIMITS.maxShiftArcsec * (1 + 1e-12))
      return refused(
        'shift-too-large',
        `row ${i} moves ${Math.round(shift * 10) / 10} arcsec in ${dt} yr; the limit is ${LIMITS.maxShiftArcsec} arcsec`
      );
    const ca = Math.cos(a);
    const sna = Math.sin(a);
    const cd = Math.cos(d);
    const sdn = Math.sin(d);
    // r + sa p + sd q, p = (-sin a, cos a, 0), q = (-sin d cos a, -sin d sin a, cos d)
    const x = cd * ca - sa * sna - sd * sdn * ca;
    const y = cd * sna + sa * ca - sd * sdn * sna;
    const z = sdn + sd * cd;
    [ra[i], dec[i]] = raDecOf(x, y, z);
    valid[i] = 1;
    if (hasSigma) {
      const s0 = at(cat.sigmaPosArcsec, i);
      const ea = cat.pmraErr === undefined ? 0 : at(cat.pmraErr, i);
      const ed = cat.pmdecErr === undefined ? 0 : at(cat.pmdecErr, i);
      sigmaRa[i] = Math.sqrt(s0 * s0 + (ea * dt * 1e-3) ** 2);
      sigmaDec[i] = Math.sqrt(s0 * s0 + (ed * dt * 1e-3) ** 2);
    }
  }
  return { status: 'ok', ra, dec, valid, excluded, sigmaRa, sigmaDec };
}
