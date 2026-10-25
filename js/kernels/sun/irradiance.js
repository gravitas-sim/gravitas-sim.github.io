// =============================================================================
// Solar kernel: from a flux to the Sun's power and surface temperature
// -----------------------------------------------------------------------------
// (Prompt 194.) A flux S measured at a distance d from the Sun is corrected to
// 1 AU, S1 = S d^2; the luminosity is L = 4 pi AU^2 S1 (the AU exact, IAU 2012
// B2); the effective temperature follows from the radius through the radiation
// kernel's Stefan-Boltzmann relation (the IAU 2015 B3 nominal solar radius, an
// input that can be overridden). Uncertainties are propagated in quadrature.
// Nothing here is a measurement: the daily series a lesson would use is data.
// =============================================================================

import { AU_M, R_SUN_M } from '../radiation/constants.js';
import { effectiveTemperature } from '../radiation/planck.js';
import { refused } from '../statistics/check.js';

const { Math, Number } = globalThis;
const finite = Number.isFinite;

/** From a flux, W/m^2, at a distance in AU: the flux at 1 AU, L, and their sigmas. */
export function luminosityFromFlux({
  fluxWm2,
  distanceAu = 1,
  sigmaFlux = 0,
  sigmaDistanceAu = 0,
} = {}) {
  if (!(finite(fluxWm2) && fluxWm2 > 0))
    return refused('flux', 'the flux is not a positive number of W/m2');
  if (!(finite(distanceAu) && distanceAu > 0))
    return refused('distance', 'the distance is not a positive number of AU');
  if (!(
    finite(sigmaFlux) &&
    sigmaFlux >= 0 &&
    finite(sigmaDistanceAu) &&
    sigmaDistanceAu >= 0
  ))
    return refused('bad-sigma', 'a sigma is not zero or more');
  const fluxAt1Au = fluxWm2 * distanceAu * distanceAu;
  const luminosityW = 4 * Math.PI * AU_M * AU_M * fluxAt1Au;
  const rel = Math.hypot(
    sigmaFlux / fluxWm2,
    (2 * sigmaDistanceAu) / distanceAu
  );
  return {
    fluxAt1Au,
    sigmaFluxAt1Au: fluxAt1Au * rel,
    luminosityW,
    sigmaLuminosityW: luminosityW * rel,
  };
}

/** The flux at a distance from a luminosity: S = L / (4 pi d^2), W/m^2. */
export const fluxFromLuminosity = (luminosityW, distanceAu = 1) =>
  luminosityW / (4 * Math.PI * (distanceAu * AU_M) ** 2);

/** Effective temperature from a luminosity and the solar radius, with sigma. */
export function temperatureFromLuminosity({
  luminosityW,
  sigmaLuminosityW = 0,
  radiusM = R_SUN_M,
  sigmaRadiusM = 0,
} = {}) {
  if (!(finite(luminosityW) && luminosityW > 0))
    return refused('flux', 'the luminosity is not a positive number of W');
  if (!(finite(radiusM) && radiusM > 0))
    return refused('distance', 'the radius is not a positive number of metres');
  if (!(
    finite(sigmaLuminosityW) &&
    sigmaLuminosityW >= 0 &&
    finite(sigmaRadiusM) &&
    sigmaRadiusM >= 0
  ))
    return refused('bad-sigma', 'a sigma is not zero or more');
  const teffK = effectiveTemperature(luminosityW, radiusM);
  const rel =
    0.25 *
    Math.hypot(sigmaLuminosityW / luminosityW, (2 * sigmaRadiusM) / radiusM);
  return { teffK, sigmaTeffK: teffK * rel };
}

/** The chain: a flux at a distance to L and Teff, with sigmas. */
export function temperatureFromFlux(args = {}) {
  const lum = luminosityFromFlux(args);
  if (lum.status === 'refused') return lum;
  const t = temperatureFromLuminosity({
    luminosityW: lum.luminosityW,
    sigmaLuminosityW: lum.sigmaLuminosityW,
    radiusM: args.radiusM,
    sigmaRadiusM: args.sigmaRadiusM,
  });
  if (t.status === 'refused') return t;
  return { ...lum, ...t };
}

/**
 * A daily series [{ fluxWm2, distanceAu }] to one value: each flux corrected to
 * 1 AU, the mean, the sample scatter and the standard error of the mean, then
 * the luminosity and temperature of the mean. The instrument is the caller's to
 * name; without it the result carries a warning.
 */
export function summariseFluxSeries(series, { instrument } = {}) {
  if (!Array.isArray(series) || series.length === 0)
    return refused('empty', 'the irradiance series is empty');
  const at1 = [];
  for (const s of series) {
    if (!s || !(finite(s.fluxWm2) && s.fluxWm2 > 0))
      return refused('flux', 'a flux in the series is not a positive number');
    const d = s.distanceAu ?? 1;
    if (!(finite(d) && d > 0))
      return refused('distance', 'a distance in the series is not positive');
    at1.push(s.fluxWm2 * d * d);
  }
  const n = at1.length;
  const mean = at1.reduce((a, b) => a + b, 0) / n;
  const scatter =
    n > 1
      ? Math.sqrt(at1.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
      : 0;
  const sem = scatter / Math.sqrt(n);
  const chain = temperatureFromFlux({
    fluxWm2: mean,
    distanceAu: 1,
    sigmaFlux: sem,
  });
  const warnings = [];
  if (!instrument)
    warnings.push({
      code: 'instrument-not-named',
      why: 'a flux series names its instrument',
    });
  if (n < 2)
    warnings.push({ code: 'one-value', why: 'one value has no scatter' });
  return {
    n,
    instrument: instrument ?? null,
    meanFluxAt1Au: mean,
    scatter,
    standardError: sem,
    ...chain,
    warnings,
  };
}
