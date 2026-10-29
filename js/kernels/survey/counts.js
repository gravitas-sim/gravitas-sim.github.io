// =============================================================================
// Number counts: classes, the Euclidean slope and the cited normalisation (Prompt 215)
// -----------------------------------------------------------------------------
// A class is a cumulative count per square degree, N(<m) = n0 10^(alpha (m - m0)),
// valid up to `mMax`. For sources uniform in a Euclidean volume the flux limit is a
// distance limit, so N ~ d^3 ~ 10^(0.6 m): alpha = 0.6. With a Schechter luminosity
// function the count to the flux limit has a closed form (euclidSchechterCount); the
// one cited class takes its normalisation from it. The other classes are stated slopes
// and normalisations, TEACHING MODELS with no claim about a real population
// (SURVEY_DESIGN.md). Counts beyond `mMax` are never extrapolated.
// =============================================================================

import { gamma } from './special.js';

const { Math } = globalThis;

const SR_PER_DEG2 = (Math.PI / 180) ** 2;
const PC_PER_MPC = 1e6;

/**
 * Sources per square degree brighter than apparent magnitude `m`, for a Schechter function
 * (phiStar in Mpc^-3, MStar, alphaS) in a Euclidean volume with no K-correction or evolution:
 * (Omega / 3) phiStar dStar^3 Gamma(alphaS + 5/2), dStar the distance at which an L* source
 * has magnitude m.
 */
export function euclidSchechterCount(m, { phiStar, MStar, alphaS }) {
  const dStarMpc = 10 ** ((m - MStar + 5) / 5) / PC_PER_MPC;
  return (SR_PER_DEG2 / 3) * phiStar * dStarMpc ** 3 * gamma(alphaS + 2.5);
}

const SCHECHTER_LOCAL = Object.freeze({
  phiStar: 0.00511,
  MStar: -21.215,
  alphaS: -1.05,
});

/** The classes a plan can count. `basis` says what stands behind the numbers. */
export const CLASSES = Object.freeze({
  'galaxies-local': Object.freeze({
    id: 'galaxies-local',
    alpha: 0.6,
    m0: 15,
    n0: euclidSchechterCount(15, SCHECHTER_LOCAL),
    mMin: 12,
    mMax: 15,
    schechter: SCHECHTER_LOCAL,
    basis: 'schechter',
  }),
  'uniform-euclidean': Object.freeze({
    id: 'uniform-euclidean',
    n0: 300,
    m0: 20,
    alpha: 0.6,
    mMax: 28,
    basis: 'teaching',
  }),
  flattened: Object.freeze({
    id: 'flattened',
    n0: 4000,
    m0: 22,
    alpha: 0.4,
    mMax: 28,
    basis: 'teaching',
  }),
  steep: Object.freeze({
    id: 'steep',
    n0: 400,
    m0: 22,
    alpha: 1,
    mMax: 28,
    basis: 'teaching',
  }),
});

export const classIds = () => Object.keys(CLASSES);

/** A class by id, or the object itself when it carries n0, m0, alpha and mMax; null when neither. */
export function classOf(c) {
  if (typeof c === 'string') return CLASSES[c] ?? null;
  if (
    c &&
    Number.isFinite(c.n0) &&
    Number.isFinite(c.m0) &&
    c.alpha > 0 &&
    Number.isFinite(c.mMax)
  )
    return c;
  return null;
}

/** The cumulative count per square degree brighter than m. */
export const cumulative = (cls, m) => cls.n0 * 10 ** (cls.alpha * (m - cls.m0));

/** The differential count, per square degree per magnitude. */
export const differential = (cls, m) =>
  cls.alpha * Math.LN10 * cumulative(cls, m);

/** The cumulative slope in dex per magnitude: alpha. */
export const slopeOf = cls => cls.alpha;
