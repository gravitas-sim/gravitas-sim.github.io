// =============================================================================
// The period-luminosity relation with a metallicity term (Prompt 223)
// -----------------------------------------------------------------------------
// ladder.js calibrates Leavitt's law where the distance is known and carries the
// offset to a host. The relation is not the same in every galaxy: a Cepheid of a
// given period is slightly brighter in the Wesenheit magnitude where the gas is
// richer in heavy elements. Written with the term,
//
//     M_W(P, Z) = M0 + b (log10 P - 1) + gamma (Z - Zref),      Z = [O/H] in dex
//
// and the ladder becomes
//
//     mu_host = (<m>_host - <m>_anchor) - b (<x>_host - <x>_anchor)
//               + mu_anchor - gamma (Z_host - Z_anchor)
//
// with gamma the cited coefficient. It is negative: a metal-rich Cepheid is
// brighter, so a host richer than the anchor has stars brighter than the anchor's
// relation says, which would make it look too near; the term puts that back.
// Three terms join the error
// budget in quadrature: the error of gamma carried across the metallicity
// difference, and the error of each galaxy's mean metallicity carried by gamma.
// The hosts' [O/H] are cited mean values of their Cepheid fields, not measured
// in this tool; the effect is the cited term times a difference of two such
// values, and it is only as good as they are. See VARIABLES_II.md.
// =============================================================================

import {
  ladderDistance,
  distanceFromModulus,
  distanceError,
} from './ladder.js';

const { Math, Number } = globalThis;

export const PLZ_VERSION = '1.0.0';

/** M_W(P, Z) for a relation {M0, b, gamma, zRef}. P in days, Z = [O/H] in dex. */
export const wesenheitAbsolute = ({ M0, b, gamma, zRef = 0 }, period, z) =>
  M0 + b * (Math.log10(period) - 1) + gamma * (z - zRef);

/** The change in the Wesenheit magnitude for a metallicity difference dZ at fixed period. */
export const metallicityShift = (gamma, dZ) => gamma * dZ;

/** The factor a distance changes by when the term is left out and the host differs by dZ from the anchor. */
export const distanceFactor = (gamma, dZ) => 10 ** ((gamma * dZ) / 5);

/**
 * A host's distance modulus with the metallicity term.
 * @param {{periods: ArrayLike<number>, mags: ArrayLike<number>}} host
 * @param {{periods: ArrayLike<number>, mags: ArrayLike<number>}} anchor
 * @param {{mu: number, sigma: number}} anchorDistance
 * @param {{gamma: number, sigmaGamma: number, host: number, anchor: number,
 *   sigmaHost?: number, sigmaAnchor?: number, range?: [number, number]}|null} metallicity
 *   gamma in mag/dex; host and anchor are [O/H] in dex; range the calibrated span
 * @returns {ReturnType<typeof ladderDistance> & {uncorrectedMu: number,
 *   metallicity: {status: 'applied'|'missing'|'outside-range', shift: number,
 *   dZ: number|null, factor: number|null, applied: boolean}}}
 */
export function ladderWithMetallicity(
  host,
  anchor,
  anchorDistance,
  metallicity,
  opts = {}
) {
  const base = ladderDistance(host, anchor, anchorDistance, opts);
  const missing =
    !metallicity ||
    !Number.isFinite(metallicity.host) ||
    !Number.isFinite(metallicity.anchor) ||
    !Number.isFinite(metallicity.gamma);
  if (missing)
    return {
      ...base,
      uncorrectedMu: base.mu,
      metallicity: {
        status: 'missing',
        shift: 0,
        dZ: null,
        factor: null,
        applied: false,
      },
    };
  const {
    gamma,
    sigmaGamma = 0,
    sigmaHost = 0,
    sigmaAnchor = 0,
    range,
  } = metallicity;
  const dZ = metallicity.host - metallicity.anchor;
  const outside =
    range && (metallicity.host < range[0] || metallicity.host > range[1]);
  const shift = -gamma * dZ; // what the term adds to the modulus
  const budget = [
    ...base.budget,
    { id: 'gamma', sigma: Math.abs(dZ) * sigmaGamma },
    { id: 'hostMetallicity', sigma: Math.abs(gamma) * sigmaHost },
    { id: 'anchorMetallicity', sigma: Math.abs(gamma) * sigmaAnchor },
  ];
  const sigma = Math.sqrt(budget.reduce((s, b) => s + b.sigma * b.sigma, 0));
  const mu = base.mu + shift;
  const pc = distanceFromModulus(mu);
  return {
    ...base,
    mu,
    sigma,
    budget,
    distanceMpc: pc / 1e6,
    distanceErrorMpc: distanceError(mu, sigma) / 1e6,
    uncorrectedMu: base.mu,
    metallicity: {
      status: outside ? 'outside-range' : 'applied',
      shift,
      dZ,
      factor: 10 ** (shift / 5),
      applied: true,
    },
  };
}
