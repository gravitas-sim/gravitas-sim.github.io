// =============================================================================
// What a star leaves, as probabilities
// -----------------------------------------------------------------------------
// The mass at which a star stops making a white dwarf and a neutron star
// begins, and the mass at which black holes begin, are not known to better
// than the ranges the literature gives (constants.js THRESHOLDS: 7 to 9.5 and
// 20 to 40 solar masses, with the caution that above 20 the outcome is not
// even a monotonic function of the mass). So a star's outcome at a given
// initial mass is a probability: here each threshold is uniform over its cited
// range, which is this kernel's choice (the papers give ranges, not
// distributions), and the remnant is the white dwarf with the probability that
// its threshold lies above the mass, the black hole with the probability that
// the other lies below it, and the neutron star otherwise. A result is
// decisive only when one outcome is at least 0.9 likely; the most likely class
// is never given without its probabilities beside it.
// =============================================================================

import { THRESHOLDS, NEUTRON_STARS } from './constants.js';

const refuse = (reason, detail) => ({ status: 'refused', reason, detail });

const clamp01 = x => Math.min(1, Math.max(0, x));

/** P(threshold > m) and P(threshold < m) for a threshold uniform on [lo, hi]. */
export const probabilityAbove = (m, { lo, hi }) =>
  clamp01((hi - m) / (hi - lo));
export const probabilityBelow = (m, { lo, hi }) =>
  clamp01((m - lo) / (hi - lo));

/**
 * The outcome probabilities for a star of an initial mass (solar masses,
 * solar metallicity).
 */
export function remnantOutcome(initialMass) {
  const [lo, hi] = THRESHOLDS.domain;
  if (
    typeof initialMass !== 'number' ||
    !Number.isFinite(initialMass) ||
    initialMass <= 0
  )
    return refuse(
      'invalid-input',
      'an initial mass that is a positive finite number'
    );
  if (initialMass < lo)
    return refuse(
      'below-the-domain',
      `outcomes are defined from ${lo} solar masses: lighter stars have not left the main sequence in the age of the universe`
    );
  if (initialMass > hi)
    return refuse(
      'above-the-domain',
      `outcomes are defined to ${hi} solar masses; pair instability begins near ${THRESHOLDS.pairInstability}, and very massive stars are not in the cited ranges`
    );
  const pWd = probabilityAbove(initialMass, THRESHOLDS.whiteDwarfToNeutronStar);
  const pBh = probabilityBelow(initialMass, THRESHOLDS.neutronStarToBlackHole);
  const pNs = 1 - pWd - pBh;
  const probabilities = {
    whiteDwarf: pWd,
    neutronStar: Math.max(0, pNs),
    blackHole: pBh,
  };
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const decisive = entries[0][1] >= 0.9;
  return {
    status: 'ok',
    initialMass,
    probabilities,
    decisive,
    verdict: decisive ? 'decisive' : 'uncertain',
    mostLikely: { outcome: entries[0][0], probability: entries[0][1] },
    thresholds: {
      whiteDwarfToNeutronStar: THRESHOLDS.whiteDwarfToNeutronStar,
      neutronStarToBlackHole: THRESHOLDS.neutronStarToBlackHole,
    },
  };
}

/** The curves of the three probabilities over initial mass, for a plot. */
export function outcomeCurve(masses) {
  return masses.map(m => {
    const r = remnantOutcome(m);
    return [m, r.status === 'ok' ? r.probabilities : null];
  });
}

/** The cited neutron-star masses: the component masses of the table and the populations. */
export function neutronStarMasses() {
  const masses = NEUTRON_STARS.systems.flatMap(s => [s.pulsar, s.companion]);
  const mean = masses.reduce((a, b) => a + b, 0) / masses.length;
  return {
    masses,
    mean,
    min: Math.min(...masses),
    max: Math.max(...masses),
    populations: NEUTRON_STARS.populations,
    systems: NEUTRON_STARS.systems,
  };
}

export { THRESHOLDS, NEUTRON_STARS };
