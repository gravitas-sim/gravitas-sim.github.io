// =============================================================================
// The cluster's light and the mass-to-light ratio (Prompt 250, rule R12)
// -----------------------------------------------------------------------------
// M_abs = m - DM(z_c) - k - A; L / L_sun = 10^(-0.4 (M_abs - M_sun)) with the caller's solar absolute
// magnitude and its source (no default). The light is the sum over members brighter than the caller's
// limiting apparent magnitude; light below the limit is not estimated, so without the caller's share
// {fraction, sigma, source} the sum is a lower bound and M/L an upper bound. Photometric errors
// propagate as independent: sigma_L,i = 0.4 ln10 L_i sigma_m,i.
// =============================================================================

import { SOLAR_MASS_KG } from '../../../constants.js';
import { levelOfSigma, sigmaOfLevel } from '../../statistics/index.js';
import { refused } from './constants.js';

const LN10 = Math.log(10);

/**
 * @param {{members: {mag?: number, magErr?: number, k?: number, A?: number}[], dm: number,
 *   solarAbsMag: {value: number, source: string}, limitMag: number,
 *   missing?: {fraction: number, sigma: number, source: string}|null, levels?: number[]}} p
 */
export function clusterLight({
  members,
  dm,
  solarAbsMag,
  limitMag,
  missing = null,
  distanceRelSigma = 0,
  levels = [levelOfSigma(1)],
}) {
  if (
    !solarAbsMag ||
    !Number.isFinite(solarAbsMag.value) ||
    typeof solarAbsMag.source !== 'string' ||
    solarAbsMag.source.trim() === ''
  )
    return refused(
      'missing-solar-source',
      'the solar absolute magnitude needs a value and a source; there is no default'
    );
  if (!Number.isFinite(limitMag))
    return refused('missing-limit', 'the limiting magnitude is required');
  let sum = 0;
  let var2 = 0;
  let used = 0;
  let skipped = 0;
  let faintCut = 0;
  for (const g of members) {
    if (!Number.isFinite(g.mag)) {
      skipped++;
      continue;
    }
    if (g.mag > limitMag) {
      faintCut++;
      continue;
    }
    const abs = g.mag - dm - (g.k ?? 0) - (g.A ?? 0);
    const L = 10 ** (-0.4 * (abs - solarAbsMag.value));
    sum += L;
    const e = 0.4 * LN10 * L * (g.magErr ?? 0);
    var2 += e * e;
    used++;
  }
  if (used === 0)
    return refused(
      'no-photometry',
      'no member has a magnitude brighter than the limit'
    );
  let value = sum;
  let rel = Math.sqrt(var2) / sum;
  const photometricRelSigma = rel;
  if (distanceRelSigma > 0) rel = Math.hypot(rel, distanceRelSigma);
  if (missing) {
    if (
      !(missing.fraction >= 0 && missing.fraction < 1) ||
      !(missing.sigma >= 0) ||
      typeof missing.source !== 'string' ||
      missing.source.trim() === ''
    )
      return refused(
        'bad-missing-light',
        'the missing-light share needs a fraction in [0, 1), a sigma and a source'
      );
    value = sum / (1 - missing.fraction);
    rel = Math.hypot(rel, missing.sigma / (1 - missing.fraction));
  }
  return {
    status: 'ok',
    solar: value,
    sumSolar: sum,
    relSigma: rel,
    terms: { photometric: photometricRelSigma, distance: distanceRelSigma },
    used,
    skippedNoMagnitude: skipped,
    fainterThanLimit: faintCut,
    lowerBound: !missing,
    intervals: levels.map(level => {
      const z = sigmaOfLevel(level);
      return { level, lo: value * (1 - z * rel), hi: value * (1 + z * rel) };
    }),
  };
}

/** M/L in solar units from a mass (kg, its relative sigma) and a light (solar luminosities, its relative sigma). */
export function massToLight({
  massKg,
  massRelSigma,
  light,
  levels = [levelOfSigma(1)],
}) {
  const value = massKg / SOLAR_MASS_KG / light.solar;
  const rel = Math.hypot(massRelSigma, light.relSigma);
  return {
    status: 'ok',
    value,
    relSigma: rel,
    upperBound: light.lowerBound,
    intervals: levels.map(level => {
      const z = sigmaOfLevel(level);
      return {
        level,
        lo: value * Math.exp(-z * rel),
        hi: value * Math.exp(z * rel),
      };
    }),
  };
}
