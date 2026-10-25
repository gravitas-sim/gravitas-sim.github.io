// Equilibrium (emission) temperature: the temperature of a black body that
// radiates what the planet absorbs. Not a surface temperature.
import {
  SIGMA_SB,
  SOLAR_CONSTANT,
  refuse,
  isPos,
  isUnit,
} from './constants.js';

const MODEL = 'equilibrium temperature';
const ASSUMES = [
  'no internal heat',
  'black-body emission',
  'a Bond albedo, not a geometric albedo',
  'heat redistribution set by one efficiency',
  'not a surface temperature',
];

/** f = 2/3 - 5 eps / 12: 1/4 for uniform redistribution (Cowan and Agol 2011). */
export const redistributionFactor = eps => 2 / 3 - (5 * eps) / 12;

/** Flux at distance a (AU) from a star of luminosity ratio L (solar), W m^-2. */
export function fluxAt(luminositySolar, aAu) {
  if (!isPos(luminositySolar) || !isPos(aAu))
    return refuse('stellar flux', 'luminosity and distance must be positive');
  return (SOLAR_CONSTANT * luminositySolar) / (aAu * aAu);
}

/**
 * @param {{flux:number, bondAlbedo:number, redistribution?:number}} p
 * redistribution is the efficiency eps in [0, 1]; 1 is uniform.
 */
export function equilibriumTemperature({
  flux,
  bondAlbedo,
  redistribution = 1,
}) {
  if (!isPos(flux))
    return refuse(MODEL, 'the flux must be positive and finite');
  if (!isUnit(bondAlbedo))
    return refuse(MODEL, 'the Bond albedo must lie in [0, 1]');
  if (!isUnit(redistribution))
    return refuse(MODEL, 'the redistribution efficiency must lie in [0, 1]');
  const f = redistributionFactor(redistribution);
  const temperature = ((flux * (1 - bondAlbedo) * f) / SIGMA_SB) ** 0.25;
  return { model: MODEL, assumes: ASSUMES, kind: 'equilibrium', temperature };
}

/** The same, from a star's temperature and radius ratio to the orbit, A = 0 allowed. */
export function equilibriumFromStar({
  starT,
  starRadiusOverA,
  bondAlbedo = 0,
  redistribution = 1,
}) {
  if (!isPos(starT) || !isPos(starRadiusOverA))
    return refuse(MODEL, 'the star temperature and R/a must be positive');
  if (!isUnit(bondAlbedo) || !isUnit(redistribution))
    return refuse(MODEL, 'albedo and redistribution must lie in [0, 1]');
  const f = redistributionFactor(redistribution);
  return {
    model: MODEL,
    assumes: ASSUMES,
    kind: 'equilibrium',
    temperature:
      starT * Math.sqrt(starRadiusOverA) * ((1 - bondAlbedo) * f) ** 0.25,
  };
}
