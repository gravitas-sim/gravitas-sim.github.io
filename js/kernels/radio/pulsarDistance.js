// =============================================================================
// Pulsar kernel: the crude distance from a dispersion measure
// -----------------------------------------------------------------------------
// DM = integral of n_e dl along the line of sight. If n_e were the same number
// everywhere along the path, d = DM / n_e. It is not: the electrons lie in a thin
// layer with arms and clumps, so the result is a rough order of magnitude and the
// function never returns one without saying so: every result carries the label
// 'crude; assumes this electron density', the density and its source. The density
// has no default: the caller supplies it with a citation, because a number typed
// here would be a published value from memory. A density range gives a distance
// range; neither is a pulsar's distance. Pure: no DOM, no clock.
// =============================================================================

import { refusal } from './constants.js';

/** The label shown wherever a DM distance is shown. */
export const DM_DISTANCE_LABEL = 'crude; assumes this electron density';

/**
 * @param {{dm: number, density: {value: number, source: string, range?: [number, number]}}} o
 *   dm in pc/cm^3; density.value in cm^-3 (uniform along the path); density.range an optional
 *   [low, high] in cm^-3
 */
export function dmDistance(o) {
  const { dm, density } = o ?? {};
  if (!Number.isFinite(dm) || dm < 0)
    return refusal(
      'bad-argument',
      'the dispersion measure must be a finite number, 0 or more',
      { dm }
    );
  if (!density || !(Number.isFinite(density.value) && density.value > 0))
    return refusal(
      'missing-density',
      'a distance from a dispersion measure needs a stated mean electron density (cm^-3), cited by the caller; there is no default',
      { density }
    );
  if (typeof density.source !== 'string' || density.source.trim().length < 3)
    return refusal(
      'missing-density',
      'the electron density needs its source (a citation) so the distance can name it',
      { density }
    );
  let range = null;
  if (density.range !== undefined) {
    const [lo, hi] = density.range;
    if (!(Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi >= lo))
      return refusal(
        'bad-argument',
        'a density range must be [low, high] with 0 < low <= high',
        {
          range: density.range,
        }
      );
    range = { distancePc: [dm / hi, dm / lo], density: [lo, hi] };
  }
  return {
    status: 'ok',
    distancePc: dm / density.value,
    dm,
    densityCm3: density.value,
    densitySource: density.source,
    range,
    label: DM_DISTANCE_LABEL,
    statement: `${DM_DISTANCE_LABEL}: n_e = ${density.value} cm^-3 (${density.source}), uniform along the whole path`,
    limits:
      'a uniform density ignores the thin layer of electrons, the arms and local clumps: this is an order of magnitude, not a pulsar distance',
  };
}
