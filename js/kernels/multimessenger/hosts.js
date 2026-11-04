// =============================================================================
// Finding the host: a stated rule, its refusals, and the distance from a redshift
// -----------------------------------------------------------------------------
// THE RULE. Given candidate galaxies on a tangent plane (offsets x, y in degrees
// from the localisation's centre, a distance D_i in Mpc, an optional mass weight
// m_i), a gravitational-wave distance D_hat with width s_D and a sky width s_x:
//
//   weight_i  proportional to  m_i exp(-(D_i - D_hat)^2/(2 s_D^2))
//                                   exp(-(x_i^2 + y_i^2)/(2 s_x^2))
//
// normalised over the candidates. If the true host is one of the candidates,
// chosen with probability proportional to its mass, and the measurements are
// Gaussian about it with those widths, the weights ARE the posterior
// probabilities (check C1 holds them to that). Every one of those "if"s is an
// assumption: the real distance posterior is not Gaussian, the sky region is not
// a circular Gaussian, a catalogue is incomplete, and the host need not be in it.
// So the rule never identifies a host unless
//   - its weight is at least `identifyWeight` (0.9), and
//   - the best-fitting candidate is itself consistent with the measurements: its
//     chi-square on 3 degrees of freedom has a survival probability of at least
//     `minChi2P` (1e-3). Weights normalise to 1 even when every candidate is
//     far from the measurement; the chi-square is what notices.
// Neither threshold is a physical constant; both are inputs a caller may change
// and the result carries what it used.
// =============================================================================

import { createCosmology } from '../cosmology/flrw.js';
import { chi2Sf } from '../statistics/special.js';
import { C_LIGHT, finite, refuse } from './constants.js';

const KMS = C_LIGHT / 1000;

/**
 * Rank candidate hosts by the stated rule.
 * @param {object} p
 * @param {{id: string, x: number, y: number, distanceMpc: number, mass?: number}[]} p.candidates
 * @param {number} p.distanceHatMpc - the gravitational-wave distance (the centre of the Gaussian)
 * @param {number} p.sigmaDistanceMpc
 * @param {number} p.sigmaSkyDeg
 * @param {boolean} [p.useMass=true] - false gives every candidate the same mass
 * @param {number} [p.identifyWeight=0.9]
 * @param {number} [p.minChi2P=1e-3]
 * @returns {{status: 'identified'|'ambiguous'|'no-consistent-candidate', identified: boolean, host: string|null,
 *   topWeight: number, ranked: object[], rule: object}}
 */
export function rankHosts({
  candidates,
  distanceHatMpc,
  sigmaDistanceMpc,
  sigmaSkyDeg,
  useMass = true,
  identifyWeight = 0.9,
  minChi2P = 1e-3,
}) {
  if (!Array.isArray(candidates) || !candidates.length)
    refuse('no-candidates', 'the host rule needs at least one candidate');
  finite(distanceHatMpc, 'distanceHatMpc');
  if (
    !(finite(sigmaDistanceMpc, 'sigmaDistanceMpc') > 0) ||
    !(finite(sigmaSkyDeg, 'sigmaSkyDeg') > 0)
  )
    refuse('bad-width', 'the distance and sky widths are positive');
  const rows = candidates.map(c => {
    finite(c.x, 'x');
    finite(c.y, 'y');
    finite(c.distanceMpc, 'distanceMpc');
    const mass = useMass && c.mass != null ? finite(c.mass, 'mass') : 1;
    if (!(mass > 0)) refuse('bad-mass', 'a mass weight is positive');
    const zd = (c.distanceMpc - distanceHatMpc) / sigmaDistanceMpc;
    const chi2 =
      zd * zd + (c.x * c.x + c.y * c.y) / (sigmaSkyDeg * sigmaSkyDeg);
    return {
      id: c.id,
      chi2,
      chi2P: chi2Sf(chi2, 3),
      logw: Math.log(mass) - chi2 / 2,
    };
  });
  const top = Math.max(...rows.map(r => r.logw));
  const sum = rows.reduce((s, r) => s + Math.exp(r.logw - top), 0);
  const ranked = rows
    .map(r => ({
      id: r.id,
      weight: Math.exp(r.logw - top) / sum,
      chi2: r.chi2,
      chi2P: r.chi2P,
    }))
    .sort((a, b) => b.weight - a.weight);
  const best = rows.reduce((a, b) => (b.chi2 < a.chi2 ? b : a));
  const consistent = best.chi2P >= minChi2P;
  const topWeight = ranked[0].weight;
  const identified = consistent && topWeight >= identifyWeight;
  return {
    status: !consistent
      ? 'no-consistent-candidate'
      : identified
        ? 'identified'
        : 'ambiguous',
    identified,
    host: identified ? ranked[0].id : null,
    topWeight,
    ranked,
    rule: {
      useMass,
      identifyWeight,
      minChi2P,
      note: 'the weights are posterior probabilities only if the stated model is true; the rule ranks, it does not identify, unless both thresholds are met',
    },
  };
}

/**
 * The distance from a redshift through the FLRW kernel, with the peculiar-velocity uncertainty carried.
 * At low redshift the host's recession velocity is comparable to its peculiar velocity, so the relative distance
 * uncertainty is sigma_v / (c z); a result above 0.1 is flagged and not hidden.
 * @param {{z: number, cosmology: {H0: number, Om: number, OL: number}, sigmaVKms?: number}} p
 */
export function hostDistance({ z, cosmology, sigmaVKms = 0 }) {
  if (!(finite(z, 'z') > 0))
    refuse('bad-redshift', 'the redshift must be positive');
  if (!(finite(sigmaVKms, 'sigmaVKms') >= 0))
    refuse('bad-width', 'a velocity uncertainty is not negative');
  const cosmo = createCosmology(cosmology);
  const distanceMpc = cosmo.luminosityDistance(z);
  const relative = sigmaVKms / (KMS * z);
  return {
    distanceMpc,
    hubbleFlowMpc: (KMS * z) / cosmology.H0,
    relativePeculiar: relative,
    sigmaDistanceMpc: distanceMpc * relative,
    flags: relative > 0.1 ? ['peculiar-velocity-dominated'] : [],
  };
}
