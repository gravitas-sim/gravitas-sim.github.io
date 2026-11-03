// The contrast of a planet and its star: a thermal term and a reflected term.
//
//   thermal    C_th(lambda) = (Rp / R*)^2 B_lambda(Tp) / B_lambda(T*)
//   reflected  C_ref(alpha) = A_g (Rp / a)^2 Phi(alpha),  Phi the Lambert phase function
//
// A flux ratio of the two unresolved bodies. It says nothing about whether any
// instrument can separate the planet from the star's light (observable.js).
import { planckLambda, bandRadiance } from '../radiation/planck.js';
import { lambertPhase, bondFromGeometric } from '../atmospheres/phase.js';
import { equilibriumFromStar } from '../atmospheres/equilibrium.js';
import { ASSUMES, DEFAULTS, ImagingError, posNum, unit } from './constants.js';

/** The reflected contrast A_g (Rp/a)^2 Phi(alpha); alpha is the phase angle, 0 at full phase. */
export function reflectedContrast({
  geometricAlbedo,
  planetRadiusM,
  semiMajorM,
  phaseAngleRad = 0,
}) {
  unit(geometricAlbedo, 'the geometric albedo');
  posNum(planetRadiusM, 'the planet radius');
  posNum(semiMajorM, 'the orbital radius');
  if (
    typeof phaseAngleRad !== 'number' ||
    !(phaseAngleRad >= 0 && phaseAngleRad <= Math.PI)
  )
    throw new ImagingError('input', 'the phase angle must lie in [0, pi]');
  return (
    geometricAlbedo *
    (planetRadiusM / semiMajorM) ** 2 *
    lambertPhase(phaseAngleRad)
  );
}

function thermalInputs(p) {
  posNum(p.planetTeffK, 'the planet temperature');
  posNum(p.starTeffK, 'the star temperature');
  posNum(p.planetRadiusM, 'the planet radius');
  posNum(p.starRadiusM, 'the star radius');
  return (p.planetRadiusM / p.starRadiusM) ** 2;
}

/** The thermal contrast at one wavelength (metres). */
export function thermalContrast(p) {
  const area = thermalInputs(p);
  posNum(p.wavelengthM, 'the wavelength');
  return (
    (area * planckLambda(p.wavelengthM, p.planetTeffK)) /
    planckLambda(p.wavelengthM, p.starTeffK)
  );
}

/** The thermal contrast of the energy in a band [lambdaMinM, lambdaMaxM] (photon-energy weighted, B_lambda d lambda). */
export function bandThermalContrast(p) {
  const area = thermalInputs(p);
  posNum(p.lambdaMinM, 'the band start');
  posNum(p.lambdaMaxM, 'the band end');
  if (!(p.lambdaMaxM > p.lambdaMinM))
    throw new ImagingError('input', 'the band must have a positive width');
  const n = p.intervals ?? DEFAULTS.bandIntervals;
  const a = bandRadiance(p.lambdaMinM, p.lambdaMaxM, p.planetTeffK, n);
  const b = bandRadiance(p.lambdaMinM, p.lambdaMaxM, p.starTeffK, n);
  return (area * a) / b;
}

/** The irradiation equilibrium temperature, K: the planet's temperature if starlight were all that heated it. */
export function irradiationTemperature({
  starTeffK,
  starRadiusM,
  semiMajorM,
  bondAlbedo = 0,
  redistribution = DEFAULTS.redistribution,
}) {
  posNum(starTeffK, 'the star temperature');
  posNum(starRadiusM, 'the star radius');
  posNum(semiMajorM, 'the orbital radius');
  if (!(semiMajorM > starRadiusM))
    throw new ImagingError('input', 'the orbit lies inside the star');
  unit(bondAlbedo, 'the Bond albedo');
  unit(redistribution, 'the redistribution efficiency');
  return equilibriumFromStar({
    starT: starTeffK,
    starRadiusOverA: starRadiusM / semiMajorM,
    bondAlbedo,
    redistribution,
  }).temperature;
}

/** Is the stated temperature far above what starlight alone would give? Returns the ratio and the flag. */
export function selfLuminousCheck({
  planetTeffK,
  irradiationTeqK,
  factor = DEFAULTS.selfLuminousFactor,
  irradiatedFactor = DEFAULTS.irradiatedFactor,
}) {
  posNum(planetTeffK, 'the planet temperature');
  if (!(irradiationTeqK >= 0) || !Number.isFinite(irradiationTeqK))
    throw new ImagingError(
      'input',
      'the equilibrium temperature must be zero or more'
    );
  // a Bond albedo of 1 gives an equilibrium of 0 K: any stated temperature is then not starlight's doing
  const ratio = planetTeffK / irradiationTeqK;
  return {
    ratio,
    selfLuminous: ratio > factor,
    irradiated: ratio <= irradiatedFactor,
  };
}

/** The phase angle (radians) of a circular orbit at orbital phase 0..1 (0 = transit), inclination i (pi/2 is edge-on). */
export function phaseAngleCircular({ inclinationRad, orbitalPhase }) {
  if (!Number.isFinite(inclinationRad) || !Number.isFinite(orbitalPhase))
    throw new ImagingError('input', 'inclination and phase must be numbers');
  const c = -Math.sin(inclinationRad) * Math.cos(2 * Math.PI * orbitalPhase);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** The projected separation (metres) of a circular orbit at that orbital phase. */
export function projectedSeparationCircular({
  semiMajorM,
  inclinationRad,
  orbitalPhase,
}) {
  posNum(semiMajorM, 'the orbital radius');
  const s = Math.sin(inclinationRad) * Math.cos(2 * Math.PI * orbitalPhase);
  return semiMajorM * Math.sqrt(Math.max(0, 1 - s * s));
}

/**
 * The contrast of one planet, thermal and reflected, with what it assumes.
 *
 * If planetTeffK is not given the thermal term uses the irradiation equilibrium
 * temperature (Bond albedo 1.5 A_g, the Lambert phase integral). If it is given
 * (a young planet's own temperature, say) the term uses it and the record says
 * whether that exceeds the irradiation equilibrium by the self-luminous factor.
 * With `band` the thermal and the stellar flux are integrated over [min, max]
 * metres; reflected light is taken as grey over the band.
 */
export function planetContrast(p) {
  const {
    starTeffK,
    starRadiusM,
    planetRadiusM,
    semiMajorM,
    geometricAlbedo = 0,
    phaseAngleRad = 0,
    redistribution = DEFAULTS.redistribution,
  } = p;
  const bond = Math.min(
    1,
    bondFromGeometric(unit(geometricAlbedo, 'the geometric albedo'))
  );
  const teq = irradiationTemperature({
    starTeffK,
    starRadiusM,
    semiMajorM,
    bondAlbedo: bond,
    redistribution,
  });
  const planetTeffK = p.planetTeffK ?? teq;
  // A Bond albedo of 1 absorbs nothing: no thermal emission without a stated temperature.
  const dark = !(planetTeffK > 0);
  const th = { starTeffK, starRadiusM, planetRadiusM, planetTeffK };
  const thermal = dark
    ? 0
    : p.band
      ? bandThermalContrast({
          ...th,
          lambdaMinM: p.band[0],
          lambdaMaxM: p.band[1],
          intervals: p.intervals,
        })
      : thermalContrast({ ...th, wavelengthM: p.wavelengthM });
  const reflected = reflectedContrast({
    geometricAlbedo,
    planetRadiusM,
    semiMajorM,
    phaseAngleRad,
  });
  const check = dark
    ? { ratio: Infinity, selfLuminous: false }
    : selfLuminousCheck({ planetTeffK, irradiationTeqK: teq });
  return {
    thermal,
    reflected,
    total: thermal + reflected,
    dominant: thermal >= reflected ? 'thermal' : 'reflected',
    planetTeffK,
    planetTeffStated: p.planetTeffK != null,
    irradiationTeqK: teq,
    temperatureRatio: check.ratio,
    selfLuminous: p.planetTeffK != null && check.selfLuminous,
    assumes: ASSUMES,
  };
}
