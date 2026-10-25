// =============================================================================
// Solar kernel: the sub-Earth heliographic point (Prompt 194)
// -----------------------------------------------------------------------------
// P, B0 and L0 for an instant, Meeus ch. 29 with the apparent Sun of the sky
// kernel. The elements are Carrington's: I = 7.25 degrees, the ascending node K =
// 73.6667 degrees at 1850.0 turning 1.3958333 degrees a century with the
// equinox, the rotation 360 / 25.38 degrees a day from JD 2398220. A pack built
// from Horizons' sub-Earth coordinates carries its own pinned numbers; this is
// the check on them and the fallback. L0 here is the geometric one of Meeus
// (no light-time turn of the surface, which is about 0.08 degree).
//
// The argument is UT (the instant of the frame); the Sun is evaluated at TT.
// =============================================================================

import { apparentSun } from '../sky/solar.js';
import { nutation, meanObliquityDeg, ttFromUt } from '../sky/time.js';

const { Math } = globalThis;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const wrap360 = d => ((d % 360) + 360) % 360;

/** Carrington's sidereal rotation, degrees per day (360 / 25.38 days). */
export const CARRINGTON_SIDEREAL_DEG_PER_DAY = 360 / 25.38;
/** Inclination of the solar equator to the ecliptic, degrees (Carrington). */
export const SOLAR_INCLINATION_DEG = 7.25;

/** { pDeg, b0Deg, l0Deg } at the UT Julian date `jdUt`. */
export function subEarth(jdUt) {
  const jdTt = ttFromUt(jdUt);
  const sun = apparentSun(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const lamApp = sun.longitudeDeg;
  // the geometric longitude of the mean equinox of date, the one K precesses with
  const lam = lamApp - dpsiArcsec / 3600 + 20.4898 / 3600 / sun.distanceAu;
  const eps = (meanObliquityDeg(jdTt) + depsArcsec / 3600) * DEG;
  const I = SOLAR_INCLINATION_DEG * DEG;
  const K = (73.6667 + (1.3958333 * (jdUt - 2396758)) / 36525) * DEG;
  const theta = ((jdUt - 2398220) * 360) / 25.38;
  const x = Math.atan(-Math.cos(lamApp * DEG) * Math.tan(eps));
  const y = Math.atan(-Math.cos(lam * DEG - K) * Math.tan(I));
  const b0 = Math.asin(Math.sin(lam * DEG - K) * Math.sin(I));
  const eta = Math.atan2(
    -Math.sin(lam * DEG - K) * Math.cos(I),
    -Math.cos(lam * DEG - K)
  );
  return {
    pDeg: (x + y) * RAD,
    b0Deg: b0 * RAD,
    l0Deg: wrap360(eta * RAD - theta),
  };
}
