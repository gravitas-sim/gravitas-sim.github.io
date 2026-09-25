// =============================================================================
// A star's radial velocity around its planet's orbit
// -----------------------------------------------------------------------------
//   v(t) = K [cos(nu + omega) + e cos omega] + gamma
//
// nu is the true anomaly at t, from the mean anomaly by Kepler's equation,
// E - e sin E = M, solved by Newton's method from E = M + e sin M. The orbit
// is placed by the time of inferior conjunction tc - the time a transit would
// happen - rather than of periastron, so a radial-velocity fit and a transit
// fit name the same instant, and a joint fit later can share it.
//
// Eccentricity and the argument of periastron enter as sqrt(e) cos(omega) and
// sqrt(e) sin(omega), each in [-1, 1] with their squares summing below 1, which
// keeps a fit from being pushed away from e = 0 by the geometry of the
// parameters rather than by the data (Eastman et al. 2013). gamma, the
// systemic velocity and each instrument's zero point, is linear and is solved
// for exactly by the fitter; jitter, the scatter an instrument's error bars
// leave out, adds in quadrature to them (./fit.js).
//
// Pure: no DOM, no state.
// =============================================================================

/**
 * The eccentric anomaly.
 * @param {number} M - Mean anomaly, radians
 * @param {number} e - Eccentricity, [0, 1)
 */
export function solveKepler(M, e) {
  if (e === 0) return M;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 50; k++) {
    const f = E - e * Math.sin(E) - M;
    const step = f / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  return E;
}

/** Eccentricity and argument of periastron from the fitted pair. */
export function eccentricity(sqrtEcosw, sqrtEsinw) {
  const e = sqrtEcosw * sqrtEcosw + sqrtEsinw * sqrtEsinw;
  return { e, omega: e > 0 ? Math.atan2(sqrtEsinw, sqrtEcosw) : Math.PI / 2 };
}

/** The mean anomaly at inferior conjunction, where nu = pi/2 - omega. */
function conjunctionAnomaly(e, omega) {
  const nu = Math.PI / 2 - omega;
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu / 2),
      Math.sqrt(1 + e) * Math.cos(nu / 2)
    );
  return E - e * Math.sin(E);
}

/**
 * The star's velocity at each time, gamma excluded.
 *
 * @param {ArrayLike<number>} times - Days, like tc and P
 * @param {{P: number, tc: number, K: number, sqrtEcosw: number,
 *   sqrtEsinw: number}} p
 * @returns {Float64Array} In the units of K
 */
export function rvCurve(times, p) {
  const { e, omega } = eccentricity(p.sqrtEcosw, p.sqrtEsinw);
  const Mc = conjunctionAnomaly(e, omega);
  const out = new Float64Array(times.length);
  const ecw = e * Math.cos(omega);
  for (let i = 0; i < times.length; i++) {
    const M = Mc + (2 * Math.PI * (times[i] - p.tc)) / p.P;
    const E = solveKepler(M, e);
    const nu =
      2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
      );
    out[i] = p.K * (Math.cos(nu + omega) + ecw);
  }
  return out;
}
