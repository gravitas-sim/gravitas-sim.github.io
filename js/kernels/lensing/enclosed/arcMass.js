// =============================================================================
// The mass from an arc's radius, with its statistical interval and its model-limited bracket (Prompt 251)
// -----------------------------------------------------------------------------
// Input: the arc's angular radius and its sigma (radians; the arc fit's radius times the caller's pixel
// scale), the two redshifts and a flat cosmology. Two readings of the radius, stated by the caller
// (R5, R6):
//   kind 'ring'  the radius IS theta_E (a complete ring about the lens: the source on the axis). The mass
//                is M(<theta_E) with the interval [M(r - z s), M(r + z s)] at the stated two-sided level.
//   kind 'arc'   a single arc: for the SIS the outer image sits at theta_E (1 + y), y the source offset in
//                Einstein radii, so r is an upper bound of theta_E. With the caller's sourceOffsetMax the
//                bracket is [M(r / (1 + y_max) - 2 s), M(r + 2 s)]; without it y_max = 1 and the bracket
//                is [M(r / 2 - 2 s), M(r + 2 s)]. The narrow statistical interval is returned under
//                `statisticalIfOnAxis` and is NOT the mass.
// Without a lens redshift, or a source redshift, the answer is 'not-constrained' with only the angular
// radius (R7); nothing is assumed. A list of alternative cosmologies adds a separate cosmology spread.
// =============================================================================

import { normalQuantile } from '../../statistics/special.js';
import { enclosedMass } from './mass.js';
import { lensDistances } from './distances.js';

const posFinite = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * @param {{radius: number, sigmaRadius: number, zl?: number, zs?: number,
 *   cosmology: object, cosmologies?: object[], level?: number,
 *   kind?: 'ring'|'arc', sourceOffsetMax?: number}} p
 */
export function massFromArc(p) {
  const { radius, sigmaRadius, level = 0.68, kind = 'ring' } = p;
  if (
    !posFinite(radius) ||
    !(sigmaRadius >= 0) ||
    !Number.isFinite(sigmaRadius)
  )
    return {
      status: 'refused',
      code: 'bad-radius',
      mass: null,
      interval: null,
      bracket: null,
    };
  if (!(level > 0 && level < 1))
    return {
      status: 'refused',
      code: 'bad-level',
      mass: null,
      interval: null,
      bracket: null,
    };
  const angular = { thetaE: radius, sigma: sigmaRadius, kind };
  const d = lensDistances({ zl: p.zl, zs: p.zs, cosmology: p.cosmology });
  if (d.status !== 'ok')
    return {
      status: d.status,
      code: d.code,
      angular,
      mass: null,
      interval: null,
      bracket: null,
    };
  const z = normalQuantile((1 + level) / 2);
  const M = t => enclosedMass(Math.max(t, 0), d.dl, d.ds, d.dls);
  const narrow = {
    mass: M(radius),
    lo: M(radius - z * sigmaRadius),
    hi: M(radius + z * sigmaRadius),
    level,
    z,
  };
  const out = {
    status: 'ok',
    kind,
    level,
    z,
    angular,
    distances: { dl: d.dl, ds: d.ds, dls: d.dls },
    assumptions: [
      'thin lens in one plane, flat cosmology, the lens centre known or fitted',
      'mass inside the circle where the mean convergence is one, exact for axial symmetry',
    ],
  };
  if (Array.isArray(p.cosmologies) && p.cosmologies.length) {
    const ms = p.cosmologies
      .map(c => lensDistances({ zl: p.zl, zs: p.zs, cosmology: c }))
      .filter(c => c.status === 'ok')
      .map(c => enclosedMass(radius, c.dl, c.ds, c.dls));
    if (ms.length)
      out.cosmologySpread = {
        lo: Math.min(...ms),
        hi: Math.max(...ms),
        n: ms.length,
        note: 'model-limited; not part of the statistical interval',
      };
  }
  if (kind === 'ring') {
    return {
      ...out,
      mass: narrow.mass,
      interval: { lo: narrow.lo, hi: narrow.hi, level, z },
      bracket: null,
    };
  }
  const ymax = posFinite(p.sourceOffsetMax) ? p.sourceOffsetMax : 1;
  return {
    ...out,
    mass: null,
    interval: null,
    bracket: {
      lo: M(radius / (1 + ymax) - 2 * sigmaRadius),
      hi: M(radius + 2 * sigmaRadius),
      thetaELo: radius / (1 + ymax),
      thetaEHi: radius,
      sourceOffsetMax: ymax,
      widenedBySigma: 2,
    },
    modelLimited: posFinite(p.sourceOffsetMax)
      ? 'offset-bounded'
      : 'offset-unbounded',
    statisticalIfOnAxis: narrow,
  };
}
