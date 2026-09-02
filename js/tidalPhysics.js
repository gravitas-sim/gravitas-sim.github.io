// =============================================================================
// Tidal physics: the difference gravity makes across a body
// -----------------------------------------------------------------------------
// One place that knows what "a tide" is, so the lesson, the instruments and the
// tests all quote the same numbers. Nothing here touches the DOM or the
// simulation: SI in, SI out, exactly like blackHolePhysics.js, which means it
// runs in plain node and can be tested without a canvas.
//
// The idea the whole file is built around is a subtraction. An extended body
// sitting a distance d from a mass M does not feel one gravitational pull; it
// feels a different pull at every point in it. The body as a whole accelerates
// at the rate its centre of mass does, so what is left over - what actually
// deforms it - is the local acceleration MINUS the centre's:
//
//     tidal acceleration at a point = g(local) - g(centre)
//
// On the near side that residual points toward the perturber, because the near
// side is pulled harder than average. On the far side it points AWAY from the
// perturber, and this is the point students get wrong: nothing is pushing the
// far side outward. It is pulled toward the perturber too, just less than
// average, so relative to the centre it falls behind. Two bulges, one cause.
//
// Everything is Newtonian, spherical and non-rotating. Real tides involve
// oceans with coastlines, bodies with material strength, and - around compact
// objects - hydrodynamics that this file does not attempt. Where that matters
// the lesson says so rather than quietly pretending otherwise.
// =============================================================================

import {
  G_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  JUPITER_MASS_KG,
  JUPITER_RADIUS_M,
  AU_METERS,
  C_SI,
} from './constants.js';
import { scientific, withUnit } from './format.js';
import { t } from './i18n/index.js';

export { G_SI, SOLAR_MASS_KG, SOLAR_RADIUS_M, EARTH_MASS_KG, EARTH_RADIUS_M };
export { JUPITER_MASS_KG, JUPITER_RADIUS_M, AU_METERS, C_SI };

/** Mass of the Moon, kg. */
export const MOON_MASS_KG = 7.342e22;
/** Mean radius of the Moon, m. */
export const MOON_RADIUS_M = 1.7374e6;
/** Mean Earth-Moon separation, m. */
export const MOON_DISTANCE_M = 3.844e8;

/** Mass of Io, kg. */
export const IO_MASS_KG = 8.932e22;
/** Mean radius of Io, m. */
export const IO_RADIUS_M = 1.8216e6;
/** Mean Jupiter-Io separation, m. */
export const IO_DISTANCE_M = 4.217e8;

/** Mass of Saturn, kg. */
export const SATURN_MASS_KG = 5.683e26;
/** Equatorial radius of Saturn, m. */
export const SATURN_RADIUS_M = 6.0268e7;
/** Outer edge of Saturn's A ring, m. Measured from Saturn's centre. */
export const A_RING_OUTER_M = 1.3678e8;
/** Semi-major axis of Mimas, the innermost round moon, m. */
export const MIMAS_DISTANCE_M = 1.8552e8;

/**
 * The classical rigid-body Roche coefficient, 2^(1/3).
 *
 * Quoted as the cube root rather than as 1.26 because it is not an empirical
 * fit: it falls straight out of setting the tidal stretch at a body's surface
 * equal to that body's own surface gravity, which is how the lesson derives it.
 */
export const ROCHE_RIGID_COEFF = Math.cbrt(2);

/**
 * The fluid Roche coefficient. Chandrasekhar's result for a synchronously
 * rotating, self-gravitating fluid satellite that is free to deform into the
 * tidal field is 2.455; 2.44 is the value quoted in most texts and is what
 * Saturn's rings are usually compared against.
 */
export const ROCHE_FLUID_COEFF = 2.44;

// --- The differential itself --------------------------------------------------

/**
 * Newtonian gravitational acceleration produced by a point mass.
 * @param {number} massKg - Mass of the attracting body, kg
 * @param {number} distanceM - Distance from its centre, m
 * @returns {number} Acceleration in m/s², positive toward the mass
 */
export const gravitationalAcceleration = (massKg, distanceM) =>
  distanceM > 0 ? (G_SI * massKg) / (distanceM * distanceM) : Infinity;

/**
 * The three accelerations across an extended body, and what is left after the
 * centre's is subtracted.
 *
 * Signs are measured along the line joining the two bodies, positive toward the
 * perturber. `nearResidual` therefore comes out positive (the near side is
 * pulled harder than the centre) and `farResidual` negative (the far side is
 * pulled less), which is the two-bulge result stated as arithmetic.
 *
 * @param {number} massKg - Mass of the perturbing body, kg
 * @param {number} distanceM - Centre-to-centre separation, m
 * @param {number} radiusM - Radius of the body being stretched, m
 * @returns {Object} near, centre, far, nearResidual, farResidual, approx, stretch
 */
export function tidalProfile(massKg, distanceM, radiusM) {
  const near = gravitationalAcceleration(massKg, distanceM - radiusM);
  const centre = gravitationalAcceleration(massKg, distanceM);
  const far = gravitationalAcceleration(massKg, distanceM + radiusM);
  return {
    near,
    centre,
    far,
    nearResidual: near - centre,
    farResidual: far - centre,
    /** The small-body approximation, 2GMR/d³, that the lesson ends up quoting. */
    approx: tidalAcceleration(massKg, distanceM, radiusM),
    /** Total stretch across the body: near residual plus far deficit. */
    stretch: near - far,
  };
}

/**
 * The tidal acceleration a body of radius R feels at distance d, in the
 * small-body limit: 2GMR/d³.
 *
 * This is the first two terms of the exact expression and is what "tidal force"
 * means in almost every text. It is accurate to about 3R/d, so it is excellent
 * for the Moon on the Earth (a sixtieth of a percent) and increasingly poor as
 * a body approaches its own Roche limit, where the exact profile above should
 * be used instead.
 *
 * @param {number} massKg - Mass of the perturbing body, kg
 * @param {number} distanceM - Centre-to-centre separation, m
 * @param {number} radiusM - Radius of the body being stretched, m
 * @returns {number} Acceleration in m/s²
 */
export const tidalAcceleration = (massKg, distanceM, radiusM) =>
  distanceM > 0 ? (2 * G_SI * massKg * radiusM) / distanceM ** 3 : Infinity;

/**
 * How far the small-body approximation is from the exact near-side residual.
 * Used by the lesson only to be honest about where it stops being safe.
 * @param {number} massKg - Perturber mass, kg
 * @param {number} distanceM - Separation, m
 * @param {number} radiusM - Radius of the stretched body, m
 * @returns {number} Fractional error, e.g. 0.05 for five percent
 */
export function approximationError(massKg, distanceM, radiusM) {
  const p = tidalProfile(massKg, distanceM, radiusM);
  if (!Number.isFinite(p.nearResidual) || p.nearResidual === 0) return Infinity;
  return Math.abs(p.approx - p.nearResidual) / Math.abs(p.nearResidual);
}

// --- Self-gravity, and the balance that sets a Roche limit --------------------

/**
 * Surface gravity of a body: what holds it together against being stretched.
 * @param {number} massKg - Mass, kg
 * @param {number} radiusM - Radius, m
 * @returns {number} Acceleration in m/s²
 */
export const selfGravity = (massKg, radiusM) =>
  radiusM > 0 ? (G_SI * massKg) / (radiusM * radiusM) : Infinity;

/** Mean (bulk) density of a sphere, kg/m³. */
export const bulkDensity = (massKg, radiusM) =>
  radiusM > 0 ? massKg / ((4 / 3) * Math.PI * radiusM ** 3) : Infinity;

/** The mass a sphere of a given radius and mean density has, kg. */
export const massFromDensity = (densityKgM3, radiusM) =>
  densityKgM3 * (4 / 3) * Math.PI * radiusM ** 3;

/**
 * Tidal stretch at the satellite's surface divided by the satellite's own
 * surface gravity.
 *
 * This single ratio is the whole of the Roche argument. Below 1 the body's own
 * gravity wins and it stays together; at 1 a loose pile of rubble at the ends
 * of the body is no longer held down; above 1 the stretch dominates. It is the
 * quantity the balance instrument draws as two bars.
 *
 * @param {number} primaryMassKg - Mass of the perturber, kg
 * @param {number} satelliteMassKg - Mass of the satellite, kg
 * @param {number} satelliteRadiusM - Radius of the satellite, m
 * @param {number} distanceM - Centre-to-centre separation, m
 * @returns {number} Dimensionless ratio
 */
export function tidalToSelfGravity(
  primaryMassKg,
  satelliteMassKg,
  satelliteRadiusM,
  distanceM
) {
  const grip = selfGravity(satelliteMassKg, satelliteRadiusM);
  if (!(grip > 0)) return Infinity;
  return tidalAcceleration(primaryMassKg, distanceM, satelliteRadiusM) / grip;
}

/**
 * The rigid Roche limit, written in masses and the satellite's own radius:
 *
 *     d = 2^(1/3) · R_satellite · (M_primary / M_satellite)^(1/3)
 *
 * which is exactly the separation at which `tidalToSelfGravity` reaches 1. The
 * more familiar density form, d = 1.26 · R_primary · (ρ_primary/ρ_sat)^(1/3),
 * is the same expression with the masses written out; `rocheLimitFromDensities`
 * gives that version.
 *
 * "Rigid" means the satellite holds its spherical shape right up to the limit.
 * A real body deforms as it approaches, which lets the tide get a longer lever
 * and breaks it up further out - see `rocheLimitFluid`.
 *
 * @param {number} primaryMassKg - Mass of the body being orbited, kg
 * @param {number} satelliteMassKg - Mass of the satellite, kg
 * @param {number} satelliteRadiusM - Radius of the satellite, m
 * @returns {number} Separation in m, measured centre to centre
 */
export const rocheLimitRigid = (
  primaryMassKg,
  satelliteMassKg,
  satelliteRadiusM
) =>
  satelliteMassKg > 0
    ? ROCHE_RIGID_COEFF *
      satelliteRadiusM *
      Math.cbrt(primaryMassKg / satelliteMassKg)
    : Infinity;

/**
 * The fluid Roche limit: the same balance for a satellite with no strength at
 * all, free to stretch into an elongated shape as it approaches.
 * @param {number} primaryMassKg - Mass of the body being orbited, kg
 * @param {number} satelliteMassKg - Mass of the satellite, kg
 * @param {number} satelliteRadiusM - Radius of the satellite, m
 * @returns {number} Separation in m
 */
export const rocheLimitFluid = (
  primaryMassKg,
  satelliteMassKg,
  satelliteRadiusM
) =>
  satelliteMassKg > 0
    ? ROCHE_FLUID_COEFF *
      satelliteRadiusM *
      Math.cbrt(primaryMassKg / satelliteMassKg)
    : Infinity;

/**
 * The density form of the Roche limit, which is the one most texts print.
 * Identical to the mass form above; both are provided because a student meets
 * the density version in a textbook and the mass version in this lesson, and
 * discovering they are the same expression is worth a step.
 *
 * @param {number} primaryRadiusM - Radius of the body being orbited, m
 * @param {number} primaryDensity - Its mean density, kg/m³
 * @param {number} satelliteDensity - The satellite's mean density, kg/m³
 * @param {number} [coeff] - 1.26 for rigid, 2.44 for fluid
 * @returns {number} Separation in m
 */
export const rocheLimitFromDensities = (
  primaryRadiusM,
  primaryDensity,
  satelliteDensity,
  coeff = ROCHE_RIGID_COEFF
) =>
  satelliteDensity > 0
    ? coeff * primaryRadiusM * Math.cbrt(primaryDensity / satelliteDensity)
    : Infinity;

/**
 * Where a body sits relative to its own Roche limits.
 *
 * Deliberately three-valued rather than two. The gap between the rigid and
 * fluid limits is real physics, not rounding: inside the fluid limit a body
 * with no strength comes apart, but a body that resists deformation survives
 * further in, and a small enough body held together by material strength rather
 * than by gravity survives all the way down. Reporting a single "breaks / does
 * not break" radius would teach exactly the misconception the lesson is trying
 * to avoid.
 *
 * @param {number} distanceM - Separation, m
 * @param {number} rigidM - Rigid Roche limit, m
 * @param {number} fluidM - Fluid Roche limit, m
 * @returns {'safe'|'deforming'|'disrupting'} Which regime
 */
export function disruptionRegime(distanceM, rigidM, fluidM) {
  if (distanceM >= fluidM) return 'safe';
  if (distanceM >= rigidM) return 'deforming';
  return 'disrupting';
}

// --- Compact objects ----------------------------------------------------------

/** Schwarzschild radius, m. Repeated from blackHolePhysics so this file stays pure. */
export const schwarzschildRadiusM = massKg =>
  (2 * G_SI * massKg) / (C_SI * C_SI);

/**
 * The tidal disruption radius for a star falling toward a black hole, and how
 * it compares with the horizon.
 *
 * Uses the rigid balance, which for this purpose is the standard order-of-
 * magnitude estimate written r_t ≈ R_*(M_BH/M_*)^(1/3); the 2^(1/3) is inside
 * the same factor and is kept so that this function and `rocheLimitRigid`
 * cannot disagree.
 *
 * When `ratio` falls below 1 the star crosses the horizon before the tide can
 * pull it apart, so nothing is torn up outside and there is no flare to see.
 * That crossover is a real and well known result; the flare itself is
 * hydrodynamic and is not something this file or the simulation models.
 *
 * @param {number} holeMassSuns - Black hole mass in solar masses
 * @param {number} [starMassSuns] - Star mass in solar masses
 * @param {number} [starRadiusSolar] - Star radius in solar radii
 * @returns {Object} tidalRadiusM, horizonM, ratio, disruptsOutside
 */
export function tidalDisruption(
  holeMassSuns,
  starMassSuns = 1,
  starRadiusSolar = 1
) {
  const holeMass = holeMassSuns * SOLAR_MASS_KG;
  const starMass = starMassSuns * SOLAR_MASS_KG;
  const starRadius = starRadiusSolar * SOLAR_RADIUS_M;
  const tidalRadiusM = rocheLimitRigid(holeMass, starMass, starRadius);
  const horizonM = schwarzschildRadiusM(holeMass);
  return {
    tidalRadiusM,
    horizonM,
    ratio: tidalRadiusM / horizonM,
    disruptsOutside: tidalRadiusM > horizonM,
  };
}

/**
 * The black hole mass at which the tidal radius equals the horizon, so that a
 * star of the given kind is swallowed whole rather than torn apart.
 *
 * Solving 2^(1/3) R_*(M/m)^(1/3) = 2GM/c² for M gives M ∝ M_*^(-1/2) R_*^(3/2),
 * which for a Sun-like star lands near 1.6 × 10^8 solar masses: the reason
 * tidal disruption flares are seen around modest galactic nuclei and not around
 * the largest ones.
 *
 * @param {number} [starMassSuns] - Star mass in solar masses
 * @param {number} [starRadiusSolar] - Star radius in solar radii
 * @returns {number} Black hole mass in solar masses
 */
export function swallowWholeMassSuns(starMassSuns = 1, starRadiusSolar = 1) {
  const starMass = starMassSuns * SOLAR_MASS_KG;
  const starRadius = starRadiusSolar * SOLAR_RADIUS_M;
  // 2^(1/3) R_* M^(1/3) / m^(1/3) = 2GM/c²  ->  M^(2/3) = 2^(1/3) R_* c² / (2G m^(1/3))
  const twoThirds =
    (ROCHE_RIGID_COEFF * starRadius * C_SI * C_SI) /
    (2 * G_SI * Math.cbrt(starMass));
  return Math.pow(twoThirds, 1.5) / SOLAR_MASS_KG;
}

// --- The systems the lesson compares -----------------------------------------

/**
 * Real pairs, with the tide the first body raises on the second.
 *
 * Ordered from the everyday to the extreme, because the comparison instrument
 * draws them as a single log scale and the point of that picture is that one
 * mechanism covers fourteen orders of magnitude.
 */
export const TIDAL_SYSTEMS = [
  {
    id: 'moon-earth',
    get label() {
      return t('tideP.moonOnEarth');
    },
    short: 'Moon → Earth',
    massKg: MOON_MASS_KG,
    distanceM: MOON_DISTANCE_M,
    radiusM: EARTH_RADIUS_M,
    note: 'The ocean tide you can walk down to and watch.',
  },
  {
    id: 'sun-earth',
    get label() {
      return t('tideP.sunOnEarth');
    },
    short: 'Sun → Earth',
    massKg: SOLAR_MASS_KG,
    distanceM: AU_METERS,
    radiusM: EARTH_RADIUS_M,
    note: 'Twenty seven million times the Moon’s mass, and less than half the tide.',
  },
  {
    id: 'earth-moon',
    get label() {
      return t('tideP.earthOnMoon');
    },
    short: 'Earth → Moon',
    massKg: EARTH_MASS_KG,
    distanceM: MOON_DISTANCE_M,
    radiusM: MOON_RADIUS_M,
    note: 'The same separation, the other way round. This is the tide that locked the Moon’s rotation.',
  },
  {
    id: 'jupiter-io',
    get label() {
      return t('tideP.jupiterOnIo');
    },
    short: 'Jupiter → Io',
    massKg: JUPITER_MASS_KG,
    distanceM: IO_DISTANCE_M,
    radiusM: IO_RADIUS_M,
    note: 'Strong enough to keep Io molten: the most volcanically active body in the Solar System.',
  },
  {
    id: 'star-hotjupiter',
    get label() {
      return t('tideP.starOnHotJupiter');
    },
    short: 'star → hot Jupiter',
    massKg: SOLAR_MASS_KG,
    distanceM: 0.05 * AU_METERS,
    radiusM: JUPITER_RADIUS_M,
    note: 'Close-in giant planets are tidally locked and measurably puffed up.',
  },
  {
    id: 'bh-star',
    get label() {
      return t('tideP.bhOnSunFar');
    },
    short: 'black hole → Sun',
    massKg: 10 * SOLAR_MASS_KG,
    distanceM: AU_METERS,
    radiusM: SOLAR_RADIUS_M,
    note: 'At one AU, nothing happens. The tide only becomes dangerous much closer in.',
  },
  {
    id: 'bh-star-close',
    get label() {
      return t('tideP.bhOnSunNear');
    },
    short: 'black hole → Sun, close',
    massKg: 10 * SOLAR_MASS_KG,
    distanceM: 3e9,
    radiusM: SOLAR_RADIUS_M,
    note: 'Fifty times nearer, and the stretch is now a quarter of the Sun’s own surface gravity. This is the distance at which a star begins to come apart.',
  },
];

/**
 * Everything the instruments and the readouts need about one pairing.
 * @param {Object} system - An entry from TIDAL_SYSTEMS, or the same shape
 * @returns {Object} The system with its tidal acceleration and profile attached
 */
export function systemFacts(system) {
  const profile = tidalProfile(system.massKg, system.distanceM, system.radiusM);
  return { ...system, profile, tidal: profile.approx };
}

/** Every system in TIDAL_SYSTEMS, with its tide worked out. */
export const tidalLineup = () => TIDAL_SYSTEMS.map(systemFacts);

// --- Labels -------------------------------------------------------------------

/**
 * An acceleration written the way a readout should show it.
 * @param {number} a - Acceleration, m/s²
 * @returns {string} e.g. "1.10 × 10⁻⁶ m/s²"
 */
export const accelerationLabel = a =>
  Number.isFinite(a) ? withUnit(scientific(a, 3), 'm/s²') : '—';

/**
 * A distance written in whichever unit keeps it readable.
 * @param {number} m - Distance, m
 * @returns {string} A distance with a unit
 */
export function distanceLabel(m) {
  if (!Number.isFinite(m)) return '—';
  // Kilometres are kept, with digit grouping, right up to a tenth of an AU.
  // A student reads "384,400 km" as a distance and "3.84 × 10⁵ km" as a piece
  // of notation, and the whole lesson is about distances.
  if (m >= 0.1 * AU_METERS) return withUnit((m / AU_METERS).toFixed(2), 'AU');
  if (m >= 1e6) {
    return withUnit(Math.round(m / 1000).toLocaleString('en-US'), 'km');
  }
  if (m >= 1000) return withUnit((m / 1000).toFixed(1), 'km');
  return withUnit(m.toFixed(0), 'm');
}

/**
 * A bare dimensionless ratio, which may be very small. Written plainly rather
 * than with a "×", because "stretch ÷ grip = 0.0040" is a comparison and
 * "0.0040×" reads as a multiplier of something unnamed.
 * @param {number} r - The ratio
 * @returns {string} e.g. "0.25", "4.0 × 10⁻³"
 */
export function ratioLabel(r) {
  if (!Number.isFinite(r)) return '—';
  if (r === 0) return '0';
  if (r < 0.01) return scientific(r, 2);
  if (r < 10) return r.toFixed(2);
  return timesLabel(r).replace(/×$/, '');
}

/**
 * A ratio written as "×" something, which is how every comparison in the lesson
 * is phrased.
 * @param {number} r - The ratio
 * @returns {string} e.g. "8.0×" or "1.2 × 10⁵×"
 */
export function timesLabel(r) {
  if (!Number.isFinite(r)) return '—';
  if (r >= 1e4 || (r > 0 && r < 1e-3)) return `${scientific(r, 2)}×`;
  if (r >= 100) return `${Math.round(r)}×`;
  if (r >= 10) return `${r.toFixed(1)}×`;
  return `${r.toFixed(2)}×`;
}
