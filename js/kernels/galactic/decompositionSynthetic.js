// Synthetic rotation curves with their truth manifests (Prompt 236). The galaxy is a choice,
// not the Milky Way and not a published model: a Hernquist bulge, a razor-thin exponential disk
// and an NFW halo, sampled at stated radii with Gaussian errors. The truth is the parameter set
// that made the curve; nothing here is data.
import { stream, gaussian } from '../../random/streams.js';
import { componentSpeeds } from './decomposition.js';

const { Math } = globalThis;

/** The synthetic galaxy of tests/fixtures/rotation-decomposition/thresholds.json ("truth"). */
export const SYNTHETIC_TRUTH = Object.freeze({
  label:
    'synthetic: a galaxy that is a choice, not the Milky Way and not a published model',
  halo: 'nfw',
  bulgeMass: 1e10,
  bulgeScale: 0.7,
  diskMass: 4e10,
  diskScale: 2.6,
  haloSpeed: 420,
  haloScale: 20,
  luminosity: 5e10,
  massToLight: Object.freeze({ lo: 0.3, hi: 1.5 }),
});

/** n radii geometric from lo to hi, kpc. */
export const geometricRadii = (lo, hi, n) =>
  Array.from({ length: n }, (_, i) => lo * (hi / lo) ** (i / (n - 1)));

/**
 * One realization.
 * @param {{radii: number[], error: number, seed: string|number, labels?: Array<string|number>,
 *   truth?: object, bump?: {amplitude: number, at: number, width: number}}} args
 * @returns {{points: Array<{r: number, v: number, err: number}>, truth: object}}
 */
export function syntheticCurve({
  radii,
  error,
  seed,
  labels = [],
  truth = SYNTHETIC_TRUTH,
  bump = null,
}) {
  const gauss = gaussian(stream('noise', seed, ...labels));
  const points = radii.map(r => {
    let v = componentSpeeds(r, truth).total;
    if (bump)
      v += bump.amplitude * Math.exp(-0.5 * ((r - bump.at) / bump.width) ** 2);
    return { r, v: v + error * gauss(), err: error };
  });
  return {
    points,
    truth: {
      ...truth,
      label: truth.label,
      bump,
      note: 'the truth manifest: the parameters that made the curve, before the noise',
    },
  };
}
