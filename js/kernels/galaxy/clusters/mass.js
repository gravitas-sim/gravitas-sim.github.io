// =============================================================================
// The virial mass, its three-term interval, the baryon budget (Prompt 250, rules R11 and R14)
// -----------------------------------------------------------------------------
//   M = K sigma^2 R / G        (sigma in m/s, R in metres, G the tree's)
// K is the projection factor and is supplied, never defaulted: {value, sigma, source, radiusKind}, the
// radius kind being the one R is. ln M = ln K + 2 ln sigma + ln R - ln G, so to first order
//   s_lnM = sqrt((sigma_K / K)^2 + (2 sigma_s / sigma)^2 + (sigma_R / R)^2)
// (independent terms) and the interval is M exp(+- z s_lnM) with z = sigmaOfLevel(level). The statistical
// part (dispersion and radius) and the factor's part are reported apart, with the interval with and
// without the factor's term. The interval stands for K's stated uncertainty and the sampling error only:
// a breakdown of equilibrium, of isotropy or of an unbiased member sample is not in it.
// =============================================================================

import { G_SI, SOLAR_MASS_KG } from '../../../constants.js';
import { levelOfSigma, sigmaOfLevel } from '../../statistics/index.js';
import { MPC_M, refused } from './constants.js';

const DEFAULT_LEVEL = levelOfSigma(1);

const positive = x => typeof x === 'number' && Number.isFinite(x) && x > 0;

/** Validate a projection factor; returns a refusal or null. */
export function checkFactor(factor, radiusKind) {
  if (!factor || factor.value === undefined)
    return refused(
      'missing-factor',
      'a virial mass needs a projection factor K with a source'
    );
  if (
    !positive(factor.value) ||
    !(Number.isFinite(factor.sigma) && factor.sigma >= 0)
  )
    return refused(
      'bad-factor',
      'K must be positive and its sigma non-negative'
    );
  if (typeof factor.source !== 'string' || factor.source.trim() === '')
    return refused(
      'missing-factor-source',
      'the projection factor needs a source; the kernel holds no published value'
    );
  if (factor.radiusKind !== radiusKind)
    return refused(
      'factor-radius-mismatch',
      `the factor is for the ${factor.radiusKind} radius and the radius is the ${radiusKind}`
    );
  return null;
}

/**
 * The virial mass of a dispersion and a radius.
 * @param {{sigmaKms: number, sigmaSigmaKms: number, radiusMpc: number, sigmaRadiusMpc: number,
 *   factor: {value: number, sigma: number, source: string, radiusKind: string},
 *   levels?: number[]}} p
 */
export function virialMass({
  sigmaKms,
  sigmaSigmaKms,
  radiusMpc,
  sigmaRadiusMpc,
  factor,
  levels = [DEFAULT_LEVEL],
}) {
  if (!positive(sigmaKms) || !positive(radiusMpc))
    return refused(
      'bad-input',
      'the dispersion and the radius must be positive'
    );
  const sig = sigmaKms * 1000;
  const radius = radiusMpc * MPC_M;
  const kg = (factor.value * sig * sig * radius) / G_SI;
  const termDispersion = (2 * sigmaSigmaKms) / sigmaKms;
  const termRadius = sigmaRadiusMpc / radiusMpc;
  const termFactor = factor.sigma / factor.value;
  const statistical = Math.hypot(termDispersion, termRadius);
  const sLn = Math.hypot(statistical, termFactor);
  const interval = (level, s) => {
    const z = sigmaOfLevel(level);
    return { level, lo: kg * Math.exp(-z * s), hi: kg * Math.exp(z * s) };
  };
  return {
    status: 'ok',
    kg,
    solar: kg / SOLAR_MASS_KG,
    relSigma: sLn,
    terms: {
      dispersion: termDispersion,
      radius: termRadius,
      factor: termFactor,
    },
    statisticalRelSigma: statistical,
    intervals: levels.map(l => interval(l, sLn)),
    intervalsWithoutFactor: levels.map(l => interval(l, statistical)),
    factor: { ...factor },
    assumes:
      "M = K sigma^2 R / G with the stated K; equilibrium, isotropy and an unbiased member sample are assumed and not priced beyond K's own uncertainty",
  };
}

/**
 * The gas and baryon fractions of a mass from cited numbers (R14). Masses in solar masses.
 * @param {{mass: {value: number, relSigma: number}, gas: {value: number, sigma: number, source: string,
 *   aperture: string}, stars?: {value: number, sigma: number, source: string}}} p
 */
export function baryonBudget({ mass, gas, stars = null }) {
  if (!gas || typeof gas.source !== 'string' || gas.source.trim() === '')
    return refused('missing-gas-source', 'a gas mass needs a source');
  if (!positive(gas.value) || !positive(gas.sigma))
    return refused('bad-gas', 'the gas mass and its sigma must be positive');
  if (typeof gas.aperture !== 'string' || gas.aperture.trim() === '')
    return refused(
      'missing-gas-aperture',
      'a gas mass needs the aperture it was measured in'
    );
  const relGas = gas.sigma / gas.value;
  const fGas = gas.value / mass.value;
  const out = {
    status: 'ok',
    gasFraction: { value: fGas, relSigma: Math.hypot(relGas, mass.relSigma) },
    note: 'a ratio of two numbers measured in apertures the caller must have matched; no X-ray model',
  };
  if (stars) {
    if (
      typeof stars.source !== 'string' ||
      stars.source.trim() === '' ||
      !positive(stars.value) ||
      !positive(stars.sigma)
    )
      return refused(
        'bad-stars',
        'a stellar mass needs a value, a sigma and a source'
      );
    const total = gas.value + stars.value;
    const sTotal = Math.hypot(gas.sigma, stars.sigma);
    out.baryonFraction = {
      value: total / mass.value,
      relSigma: Math.hypot(sTotal / total, mass.relSigma),
    };
  }
  return out;
}
