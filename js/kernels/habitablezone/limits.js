// The habitable-zone limits as flux thresholds (Prompt 205, HABITABLE_ZONE_II.md).
//
// Kopparapu et al. (2013), ApJ 765, 131, with the coefficients of the 2014
// erratum (ApJ 787, L29), for a planet of one Earth mass. Each limit is an
// effective stellar flux S_eff, in the unit of the flux Earth receives, as a
// quartic in T = Teff - 5780 K:
//
//     S_eff = S_sun + a T + b T^2 + c T^3 + d T^4
//
// and the limit's distance follows from the inverse-square law,
// d = sqrt((L / L_sun) / S_eff) AU. This is the table js/habitability.js holds
// for the panel and the ring (tests hold the two equal to 1e-14); it is copied
// here only because that module reads message catalogues and a kernel reads
// nothing. Unlike that module, this one REFUSES outside the fit's own range of
// stellar temperature instead of clamping to the nearest calibrated value.
import { HabitableZoneError, finite, params, positive } from './errors.js';

/** The unit: the solar constant, W per square metre (as js/habitability.js). */
export const EARTH_INSOLATION_WM2 = 1361;
/** The Sun's effective temperature, the reference point of the quartics. */
export const SUN_TEFF_K = 5780;
/** The temperatures the cited fit is calibrated over, inclusive. */
export const HZ_TEFF_DOMAIN = Object.freeze({ min: 2600, max: 7200 });

/** Where the numbers come from, for a caller that has to cite them. */
export const PARAMETERISATION = Object.freeze({
  citation:
    'Kopparapu et al. (2013), ApJ 765, 131, with the 2014 erratum, ApJ 787, L29',
  planet: 'one Earth mass',
  model:
    'a one-dimensional cloud-free radiative-convective climate model (a water-rich planet for the inner limit, a CO2 planet for the outer), with the empirical limits from Venus and Mars',
  fit: 'S_eff = S_sun + a T + b T^2 + c T^3 + d T^4, T = Teff - 5780 K',
  domainK: HZ_TEFF_DOMAIN,
});

/** What the thresholds leave out, for a caption that must say so. */
export const ASSUMES = Object.freeze([
  'one Earth mass, Earth gravity and a fixed surface pressure',
  'no clouds, no rotation or obliquity, no ocean heat transport',
  'a water-rich planet at the inner limits and a CO2 planet at the outer',
  'the fitted stellar temperature range only',
  'a band of flux, not a measurement of any planet',
]);

const LIMITS = {
  recentVenus: {
    label: 'Recent Venus',
    kind: 'empirical',
    role: 'inner edge of the optimistic zone',
    why: 'Venus has had no liquid water for about a billion years',
    sun: 1.7763,
    a: 1.4335e-4,
    b: 3.3954e-9,
    c: -7.6364e-12,
    d: -1.195e-15,
  },
  runawayGreenhouse: {
    label: 'Runaway greenhouse',
    kind: 'model',
    role: 'inner edge of the conservative zone',
    why: 'a water-rich planet loses its oceans to space',
    sun: 1.0385,
    a: 1.2456e-4,
    b: 1.4612e-8,
    c: -7.6345e-12,
    d: -1.7511e-15,
  },
  maximumGreenhouse: {
    label: 'Maximum greenhouse',
    kind: 'model',
    role: 'outer edge of the conservative zone',
    why: 'the most a CO2 atmosphere can warm a surface',
    sun: 0.3507,
    a: 5.9578e-5,
    b: 1.6707e-9,
    c: -3.0058e-12,
    d: -5.1925e-16,
  },
  earlyMars: {
    label: 'Early Mars',
    kind: 'empirical',
    role: 'outer edge of the optimistic zone',
    why: 'Mars appears to have had surface water about 3.8 billion years ago',
    sun: 0.3207,
    a: 5.4471e-5,
    b: 1.5275e-9,
    c: -2.1709e-12,
    d: -3.8282e-16,
  },
};

/** The limits, hottest to coldest. */
export const LIMIT_KEYS = Object.freeze([
  'recentVenus',
  'runawayGreenhouse',
  'maximumGreenhouse',
  'earlyMars',
]);

/** A stellar temperature in the fit's domain, or a refusal that says how far out. */
export function checkTeff(teffK) {
  finite(teffK, 'the stellar temperature');
  if (teffK < HZ_TEFF_DOMAIN.min || teffK > HZ_TEFF_DOMAIN.max) {
    throw new HabitableZoneError(
      'teff-domain',
      `the fit is calibrated for ${HZ_TEFF_DOMAIN.min} to ${HZ_TEFF_DOMAIN.max} K; ${teffK} K is outside it`,
      { teffK, min: HZ_TEFF_DOMAIN.min, max: HZ_TEFF_DOMAIN.max }
    );
  }
  return teffK;
}

function limitOf(key) {
  if (typeof key !== 'string' || !Object.hasOwn(LIMITS, key)) {
    throw new HabitableZoneError('limit', `unknown limit: ${String(key)}`, {
      known: LIMIT_KEYS,
    });
  }
  return LIMITS[key];
}

/**
 * The effective stellar flux at one limit, in Earth units.
 * @param {string} key - One of LIMIT_KEYS
 * @param {number} teffK - Stellar effective temperature, 2600 to 7200 K
 * @returns {number} S_eff
 */
export function limitFlux(key, teffK) {
  const c = limitOf(key);
  const t = checkTeff(teffK) - SUN_TEFF_K;
  return c.sun + c.a * t + c.b * t ** 2 + c.c * t ** 3 + c.d * t ** 4;
}

/** Distance at which a planet receives a given flux, AU. */
export function distanceForFlux(luminositySolar, flux) {
  positive(luminositySolar, 'the luminosity', 'luminosity');
  positive(flux, 'the flux');
  return Math.sqrt(luminositySolar / flux);
}

/** Flux at a distance, Earth units: the inverse-square law. */
export function fluxAtDistance(luminositySolar, distanceAU) {
  positive(luminositySolar, 'the luminosity', 'luminosity');
  positive(distanceAU, 'the distance', 'orbit');
  return luminositySolar / (distanceAU * distanceAU);
}

/**
 * Every limit's flux for a star of one temperature.
 * @param {{teffK:number}} p
 * @returns {Record<string, number>}
 */
export function fluxLimits(p) {
  params(p);
  const out = {};
  for (const key of LIMIT_KEYS) out[key] = limitFlux(key, p.teffK);
  return out;
}

/**
 * The zone of a star: each limit's flux and distance, the conservative zone
 * (runaway to maximum greenhouse) and the optimistic zone (recent Venus to
 * early Mars).
 *
 * @param {{luminositySolar:number, teffK:number}} p
 * @returns {{model:string, assumes:string[], parameterisation:object, teffK:number, luminositySolar:number, limits:Record<string,object>, conservative:object, optimistic:object}}
 */
export function zoneLimits(p) {
  params(p);
  const L = positive(p.luminositySolar, 'the luminosity', 'luminosity');
  const teffK = checkTeff(p.teffK);
  const limits = {};
  for (const key of LIMIT_KEYS) {
    const c = LIMITS[key];
    const flux = limitFlux(key, teffK);
    limits[key] = {
      key,
      label: c.label,
      kind: c.kind,
      role: c.role,
      why: c.why,
      flux,
      fluxWm2: flux * EARTH_INSOLATION_WM2,
      distanceAU: distanceForFlux(L, flux),
    };
  }
  const zone = (inner, outer) => ({
    innerAU: limits[inner].distanceAU,
    outerAU: limits[outer].distanceAU,
    innerFlux: limits[inner].flux,
    outerFlux: limits[outer].flux,
    innerLabel: limits[inner].label,
    outerLabel: limits[outer].label,
  });
  return {
    model: 'habitable-zone flux limits',
    assumes: ASSUMES,
    parameterisation: PARAMETERISATION,
    teffK,
    luminositySolar: L,
    limits,
    conservative: zone('runawayGreenhouse', 'maximumGreenhouse'),
    optimistic: zone('recentVenus', 'earlyMars'),
  };
}

/**
 * The edges alone, for a caller that wants the numbers the ring draws.
 * @param {{luminositySolar:number, teffK:number}} p
 * @param {'conservative'|'optimistic'} [model]
 */
export function zoneEdges(p, model = 'conservative') {
  if (model !== 'conservative' && model !== 'optimistic') {
    throw new HabitableZoneError(
      'model',
      `unknown zone model: ${String(model)}`
    );
  }
  const z = zoneLimits(p);
  return { model, ...z[model] };
}
