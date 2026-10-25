// The Jeans parameter and thermal-escape flux, as a bound: never a retention
// prediction. Needs the exobase temperature and radius, sourced per body.
import {
  K_BOLTZMANN,
  ATOMIC_MASS,
  G_NEWTON,
  refuse,
  isPos,
} from './constants.js';

const MODEL = 'Jeans thermal escape (a bound)';
const ASSUMES = [
  'a Maxwellian velocity distribution at the exobase',
  'thermal escape only (no photochemical, ion, hydrodynamic or impact loss)',
  'a stated exobase temperature and radius',
  'a stated column ratio L = N / n_exo',
];
const REQUIRES = ['exobase temperature', 'exobase radius'];

/** lambda = G M m / (k T r), m the particle mass (kg). */
export function jeansParameter({
  mass,
  exobaseRadius,
  exobaseTemperature,
  particleMass,
}) {
  if (!isPos(exobaseTemperature) || !isPos(exobaseRadius))
    return {
      ...refuse(MODEL, 'needs an exobase temperature and radius'),
      requires: REQUIRES,
    };
  if (!isPos(mass) || !isPos(particleMass))
    return refuse(
      MODEL,
      'the planet mass and the particle mass must be positive'
    );
  return (
    (G_NEWTON * mass * particleMass) /
    (K_BOLTZMANN * exobaseTemperature * exobaseRadius)
  );
}

/** Jeans flux per unit exobase density, m s^-1: v0 (1 + lambda) exp(-lambda) / (2 sqrt(pi)). */
export function jeansFluxPerDensity({
  lambda,
  exobaseTemperature,
  particleMass,
}) {
  const v0 = Math.sqrt((2 * K_BOLTZMANN * exobaseTemperature) / particleMass);
  return (v0 * (1 + lambda) * Math.exp(-lambda)) / (2 * Math.sqrt(Math.PI));
}

/** The smallest lambda with eta (1 + lambda) exp(-lambda) <= 2 sqrt(pi), eta = v0 t / L (bisection). */
export function lambdaMin(eta) {
  const target = 2 * Math.sqrt(Math.PI);
  if (!isPos(eta)) return NaN;
  if (eta <= target) return 0;
  let lo = 0;
  let hi = 1;
  while (eta * (1 + hi) * Math.exp(-hi) > target) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (eta * (1 + mid) * Math.exp(-mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * "Can retain over this time only if": a bound with the conditions it assumed.
 * timeS seconds; columnRatioM = N / n_exo in metres.
 */
export function retentionBound({
  mass,
  exobaseRadius,
  exobaseTemperature,
  particleMassAmu,
  timeS,
  columnRatioM,
}) {
  const m = particleMassAmu * ATOMIC_MASS;
  const lambda = jeansParameter({
    mass,
    exobaseRadius,
    exobaseTemperature,
    particleMass: m,
  });
  if (typeof lambda !== 'number') return lambda;
  const v0 = Math.sqrt((2 * K_BOLTZMANN * exobaseTemperature) / m);
  const need = lambdaMin((v0 * timeS) / columnRatioM);
  return {
    model: MODEL,
    assumes: ASSUMES,
    requires: REQUIRES,
    lambda,
    canRetainOnlyIf: { lambdaAtLeast: need, timeS, columnRatioM },
    meetsNecessaryCondition: lambda >= need,
  };
}
