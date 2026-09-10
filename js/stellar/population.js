// =============================================================================
// A synthetic stellar population
// -----------------------------------------------------------------------------
// A few hundred model stars, drawn from a stated initial-mass distribution and
// a stated star-formation history, placed on the bundled MIST tracks. It exists
// to make one point that a catalogue of famous stars cannot: the stars you can
// see are not the stars there are.
//
// This is a sample of a model. It is not a survey, it is not observed, and no
// star in it is a real star. The interface says so wherever it is drawn.
//
// What it contains, and what it leaves out
// -----------------------------------------------------------------------------
// Main-sequence stars only. A star whose age exceeds its own main-sequence
// lifetime has left it, and rather than invent a post-main-sequence state by
// interpolating between two tracks at unrelated moments, it is dropped and
// counted. `excludedEvolved` reports how many, and the interface reports it
// too: a population that quietly omitted its giants would understate exactly
// the objects a student is about to be told are the brightest things in a
// field.
//
// Nothing here is extinguished by dust, nothing is in a binary, and every star
// has the same composition. All three matter for a real survey and none of them
// is modelled.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { mainSequenceAt } from './tracks.js';
import { luminosityClass } from './geometry.js';
import { spectralType } from './state.js';

/**
 * The initial mass function, as a broken power law.
 *
 * Kroupa (2001), MNRAS 322, 231: the number of stars formed per unit mass goes
 * as m^-1.3 below half a solar mass and m^-2.3 above it. The break is the
 * reason the distribution is not a single power law and the reason small stars
 * outnumber large ones by so much more than a naive extrapolation suggests.
 *
 * Sampled over the range the bundled tracks cover and no further. Extending it
 * to the brown dwarfs below 0.08 solar masses would be sampling a mass no model
 * here can place.
 */
export const IMF = Object.freeze({
  reference: 'Kroupa (2001), MNRAS 322, 231',
  breakMassSun: 0.5,
  slopeBelow: -1.3,
  slopeAbove: -2.3,
  minMassSun: 0.2,
  maxMassSun: 20,
});

/** How long the population has been forming stars, at a constant rate. */
export const STAR_FORMATION_YEARS = 1e10;

/** The default size. Modest on purpose: this is drawn, not integrated. */
export const DEFAULT_COUNT = 400;

/**
 * The integral of m^slope from a to b. Used to normalise the two segments.
 * @param {number} a - Lower mass
 * @param {number} b - Upper mass
 * @param {number} slope - The exponent
 * @returns {number} The integral
 */
function powerIntegral(a, b, slope) {
  const p = slope + 1;
  return Math.abs(p) < 1e-9 ? Math.log(b / a) : (b ** p - a ** p) / p;
}

/**
 * Draw one initial mass from the broken power law, by inverting its CDF.
 *
 * Exact rather than rejection-sampled, so the same seed gives the same
 * population in the same order however the code around it changes.
 *
 * @param {Function} rand - Uniform [0, 1) source
 * @returns {number} An initial mass in solar masses
 */
export function sampleInitialMass(rand) {
  const { minMassSun: lo, maxMassSun: hi, breakMassSun: mid } = IMF;
  const lowWeight = powerIntegral(lo, mid, IMF.slopeBelow);
  // The two segments have to join continuously in dN/dm, so the upper one
  // carries a factor of mid^(slopeBelow - slopeAbove).
  const join = mid ** (IMF.slopeBelow - IMF.slopeAbove);
  const highWeight = join * powerIntegral(mid, hi, IMF.slopeAbove);
  const u = rand() * (lowWeight + highWeight);

  const invert = (a, slope, target) => {
    const p = slope + 1;
    return Math.abs(p) < 1e-9
      ? a * Math.exp(target)
      : (target * p + a ** p) ** (1 / p);
  };
  if (u <= lowWeight) return invert(lo, IMF.slopeBelow, u);
  return invert(mid, IMF.slopeAbove, (u - lowWeight) / join);
}

/**
 * A synthetic population, reproducible from its seed.
 *
 * @param {object} [spec]
 * @param {number} [spec.count] - How many stars to attempt
 * @param {string|number} [spec.seed] - Fixes the sample
 * @param {number} [spec.starFormationYears] - Constant rate over this span
 * @returns {object} The stars, and an account of what was left out
 */
export function synthesisePopulation({
  count = DEFAULT_COUNT,
  seed = 'stellar-population-1',
  starFormationYears = STAR_FORMATION_YEARS,
} = {}) {
  const rand = mulberry32(normalizeSeed(seed));
  const stars = [];
  let excludedEvolved = 0;
  let excludedUnmodelled = 0;

  for (let i = 0; i < count; i++) {
    const massSun = sampleInitialMass(rand);
    // A constant star-formation rate: every age in the span equally likely.
    const ageYr = rand() * starFormationYears;
    const zams = mainSequenceAt(massSun, 0);
    if (!zams) {
      excludedUnmodelled++;
      continue;
    }
    if (ageYr > zams.mainSequenceYr) {
      excludedEvolved++;
      continue;
    }
    const state = mainSequenceAt(massSun, ageYr / zams.mainSequenceYr);
    if (!state) {
      excludedUnmodelled++;
      continue;
    }
    stars.push({
      index: stars.length,
      massSun,
      ageYr,
      teffK: state.teffK,
      luminositySun: state.luminositySun,
      radiusSun: state.radiusSun,
      mainSequenceFraction: state.mainSequenceFraction,
      mainSequenceYr: state.mainSequenceYr,
      spectralType: spectralType(state.teffK),
      luminosityClass: luminosityClass(state.radiusSun, state.luminositySun),
    });
  }

  return Object.freeze({
    seed: String(seed),
    requested: count,
    stars: Object.freeze(stars),
    /** Sampled, then found to have left the main sequence, so not placed. */
    excludedEvolved,
    /** Sampled outside what the bundled tracks cover. Should be zero. */
    excludedUnmodelled,
    starFormationYears,
    imf: IMF,
    composition: 'solar, as the bundled tracks',
    notModelled: Object.freeze([
      'Stars that have left the main sequence, which are counted above',
      'Interstellar extinction',
      'Binaries and multiples',
      'Any composition but solar',
    ]),
  });
}

/**
 * How bright a star of this luminosity looks from a distance.
 *
 * Flux in solar units at one parsec, which is a display convenience rather
 * than a magnitude: the lesson compares stars against each other, and a
 * quantity with a reversed logarithmic scale would be a second thing to teach.
 *
 * @param {number} luminositySun - Bolometric luminosity
 * @param {number} distancePc - Distance in parsecs
 * @returns {number} Relative flux
 */
export const fluxAt = (luminositySun, distancePc) =>
  distancePc > 0 ? luminositySun / (distancePc * distancePc) : NaN;

/**
 * The subset a threshold selects, and what selecting it did.
 *
 * The whole point of the two views is that the population underneath does not
 * change: this returns the same star objects, filtered, so nothing can drift
 * between the two.
 *
 * @param {object} population - From synthesisePopulation()
 * @param {object} [spec]
 * @param {number} [spec.distancePc] - The common illustrative distance
 * @param {number} [spec.thresholdFlux] - Keep stars at or above this flux
 * @returns {object} The subset and a comparison of the two
 */
export function brightSubset(
  population,
  { distancePc = 100, thresholdFlux = 1e-4 } = {}
) {
  const kept = population.stars.filter(
    s => fluxAt(s.luminositySun, distancePc) >= thresholdFlux
  );
  const tally = list => {
    const byType = {};
    for (const s of list)
      byType[s.spectralType] = (byType[s.spectralType] || 0) + 1;
    return byType;
  };
  return {
    distancePc,
    thresholdFlux,
    stars: kept,
    kept: kept.length,
    total: population.stars.length,
    byTypeAll: tally(population.stars),
    byTypeBright: tally(kept),
    /** Everything at one distance, so this is a luminosity cut in disguise. */
    note: 'every star placed at the same distance, and no extinction',
  };
}

/**
 * Counts by spectral type, for the accessible table beside the plot.
 * @param {Array<object>} stars - Any list of population members
 * @returns {Array<{type: string, count: number, fraction: number}>} Rows, hottest first
 */
export function countByType(stars) {
  const order = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const byType = {};
  for (const s of stars)
    byType[s.spectralType] = (byType[s.spectralType] || 0) + 1;
  const total = stars.length || 1;
  return order.map(type => ({
    type,
    count: byType[type] || 0,
    fraction: (byType[type] || 0) / total,
  }));
}
