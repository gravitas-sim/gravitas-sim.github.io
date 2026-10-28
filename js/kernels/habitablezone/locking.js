// The tidal-locking radius: the distance inside which a planet's spin is
// removed by the star's tide within an age, in the constant-Q model of
// TIDAL_KERNEL.md. The locking time is the tides kernel's (lockingTime, which
// is not repeated here); because it goes as a^6, the radius at which it equals
// an age follows exactly: a = a_ref (age / t_lock(a_ref))^(1/6).
import {
  AU_METERS,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SOLAR_MASS_KG,
} from '../../constants.js';
import { ALPHA_EARTH, SECONDS_PER_YEAR, lockingTime } from '../tides/tides.js';
import { params, positive } from './errors.js';

/** The planet's unknown k2/Q: a factor of ten each way in Q about the central value. */
export const Q_FACTOR = 10;

export const LOCKING_ASSUMES = Object.freeze([
  'constant Q, one frequency-independent value',
  'a circular orbit and a spin aligned with it',
  'no eccentricity tide, no spin-orbit resonance (Mercury is outside the model)',
  'no atmospheric tide (Venus is outside the model)',
  'k2/Q of the planet is not known to a factor of ten',
]);

/** Earth-like defaults: k2 0.3, Q 100, a 10-hour initial spin, Earth's moment of inertia. */
export const LOCKING_DEFAULTS = Object.freeze({
  planetMassEarth: 1,
  planetRadiusEarth: 1,
  k2: 0.3,
  Q: 100,
  spinPeriodHours: 10,
  alpha: ALPHA_EARTH,
});

function resolve(p) {
  params(p);
  const d = { ...LOCKING_DEFAULTS };
  for (const key of Object.keys(d)) if (p[key] !== undefined) d[key] = p[key];
  return {
    starMassSun: positive(p.starMassSun, 'the star mass'),
    ageYr: positive(p.ageYr, 'the age'),
    ...d,
  };
}

/**
 * The radius at which the star's tide removes the planet's spin within `ageYr`.
 *
 * @param {{starMassSun:number, ageYr:number, planetMassEarth?:number, planetRadiusEarth?:number, k2?:number, Q?:number, spinPeriodHours?:number, alpha?:number}} p
 * @returns {{model:string, assumes:string[], radiusAU:number, radiusM:number, ageYr:number, k2OverQ:number}}
 */
export function lockingRadius(p) {
  const c = resolve(p);
  const star = c.starMassSun * SOLAR_MASS_KG;
  const base = {
    perturberMass: star,
    satelliteMass:
      positive(c.planetMassEarth, 'the planet mass') * EARTH_MASS_KG,
    satelliteRadius:
      positive(c.planetRadiusEarth, 'the planet radius') * EARTH_RADIUS_M,
    k2: c.k2,
    Q: c.Q,
    spin:
      (2 * Math.PI) / (positive(c.spinPeriodHours, 'the spin period') * 3600),
    alpha: c.alpha,
  };
  const refM = AU_METERS;
  const t = lockingTime({ ...base, semiMajorAxis: refM }).time;
  const radiusM = refM * ((c.ageYr * SECONDS_PER_YEAR) / t) ** (1 / 6);
  return {
    model: 'constant-Q tidal locking radius',
    assumes: LOCKING_ASSUMES,
    radiusAU: radiusM / AU_METERS,
    radiusM,
    ageYr: c.ageYr,
    k2OverQ: c.k2 / c.Q,
  };
}

/**
 * The locking radius with the planet's unknown dissipation as a range: Q a
 * factor Q_FACTOR below and above the central value, so the radius is a factor
 * Q_FACTOR^(1/6) = 1.47 either way.
 *
 * @returns {{central:object, lowAU:number, highAU:number, radiusAU:number}}
 */
export function lockingRadiusRange(p) {
  const c = resolve(p);
  const central = lockingRadius(p);
  const at = Q => lockingRadius({ ...p, Q }).radiusAU;
  return {
    central,
    radiusAU: central.radiusAU,
    // more dissipation (smaller Q) despins faster, so the radius is larger
    lowAU: at(c.Q * Q_FACTOR),
    highAU: at(c.Q / Q_FACTOR),
  };
}

/** Is a planet at `distanceAU` inside the locking radius (locked within the age)? */
export function lockedWithinAge(p, distanceAU) {
  positive(distanceAU, 'the distance', 'orbit');
  return distanceAU < lockingRadius(p).radiusAU;
}
