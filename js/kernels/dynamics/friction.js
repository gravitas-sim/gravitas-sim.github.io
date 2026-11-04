// Chandrasekhar's dynamical friction (Prompt 237, DYNAMICS.md): a body of mass M moving at speed v
// through a Maxwellian background of density rho and one-dimensional dispersion sigma is slowed by
//
//   dv/dt = - 4 pi G^2 M rho lnLambda f(X) / v^2,   X = v / (sqrt(2) sigma),
//   f(X) = erf(X) - 2 X exp(-X^2) / sqrt(pi)
//
// (Chandrasekhar 1943). The Coulomb logarithm is always an argument and is stated with the result:
// there is no default. In a singular isothermal sphere of circular speed v_c (rho = v_c^2 / (4 pi G r^2),
// sigma = v_c / sqrt(2)), a body on a circular orbit has X = 1 and sinks as
//   r dr/dt = - G M lnLambda f(1) / v_c,  so  t(r_i to r_f) = (r_i^2 - r_f^2) v_c / (2 G M lnLambda f(1)).
import { refused } from '../statistics/check.js';
import { gammaQ } from '../statistics/special.js';
import { G_PC_KMS2_MSUN, PC_PER_KMS_MYR } from './constants.js';

const { Math, Number } = globalThis;
const positive = x => Number.isFinite(x) && x > 0;

/** f(X) = erf(X) - 2 X exp(-X^2) / sqrt(pi), by its series for small X (no cancellation) and by the error function above. */
export function frictionFunction(X) {
  if (!(Number.isFinite(X) && X >= 0)) return NaN;
  if (X === 0) return 0;
  if (X < 1.5) {
    // erf(X) = (2 / sqrt(pi)) exp(-X^2) sum_{n>=0} 2^n X^(2n+1) / (2n+1)!!, so
    // f = (2 / sqrt(pi)) exp(-X^2) sum_{n>=1} 2^n X^(2n+1) / (2n+1)!!
    let term = X; // n = 0
    let sum = 0;
    for (let n = 1; n < 200; n++) {
      term *= (2 * X * X) / (2 * n + 1);
      sum += term;
      if (term < 1e-18 * sum) break;
    }
    return (2 / Math.sqrt(Math.PI)) * Math.exp(-X * X) * sum;
  }
  const erf = 1 - gammaQ(0.5, X * X);
  return erf - (2 * X * Math.exp(-X * X)) / Math.sqrt(Math.PI);
}

/** The deceleration, in (km/s) per Myr, of a body of mass M (solar masses) at speed v (km/s). */
export function frictionDeceleration({
  mass,
  speed,
  density,
  sigma,
  lnLambda,
}) {
  if (![mass, speed, density, sigma].every(positive))
    return refused(
      'input',
      'the mass, the speed, the density and the dispersion must be positive numbers'
    );
  if (!(Number.isFinite(lnLambda) && lnLambda > 0))
    return refused(
      'coulomb',
      'the Coulomb logarithm must be stated, and positive: there is no default'
    );
  const X = speed / (Math.SQRT2 * sigma);
  const a =
    (4 *
      Math.PI *
      G_PC_KMS2_MSUN ** 2 *
      mass *
      density *
      lnLambda *
      frictionFunction(X)) /
    speed ** 2 /
    PC_PER_KMS_MYR;
  return {
    status: 'ok',
    value: a,
    unit: '(km/s) per Myr',
    X,
    lnLambda,
    relation: 'dv/dt = -4 pi G^2 M rho lnLambda f(X) / v^2',
    assumes: [
      `ln Lambda = ${lnLambda} (stated by the caller)`,
      'a body much heavier than the field stars moving through a Maxwellian, uniform, infinite background: the wake is not modelled',
    ],
  };
}

/** The time for a circular orbit in a singular isothermal sphere to sink from r to rFinal (Myr). */
export function sinkingTimeIsothermal({
  radius,
  circularSpeed,
  mass,
  lnLambda,
  finalRadius = 0,
}) {
  if (![radius, circularSpeed, mass].every(positive))
    return refused(
      'input',
      'the radius, the circular speed and the mass must be positive numbers'
    );
  if (!(
    Number.isFinite(finalRadius) &&
    finalRadius >= 0 &&
    finalRadius < radius
  ))
    return refused(
      'range',
      'the final radius must be from 0 up to the starting radius'
    );
  if (!(Number.isFinite(lnLambda) && lnLambda > 0))
    return refused(
      'coulomb',
      'the Coulomb logarithm must be stated, and positive: there is no default'
    );
  const f1 = frictionFunction(1);
  const t =
    (((radius * radius - finalRadius * finalRadius) * circularSpeed) /
      (2 * G_PC_KMS2_MSUN * mass * lnLambda * f1)) *
    PC_PER_KMS_MYR;
  return {
    status: 'ok',
    value: t,
    unit: 'Myr',
    lnLambda,
    relation: 't = (r_i^2 - r_f^2) v_c / (2 G M lnLambda f(1))',
    assumes: [
      `ln Lambda = ${lnLambda} (stated by the caller)`,
      'a circular orbit in a singular isothermal sphere, the satellite much lighter than the mass inside its orbit, the orbit staying nearly circular as it sinks',
      'the satellite does not lose mass and the host does not respond',
    ],
  };
}
