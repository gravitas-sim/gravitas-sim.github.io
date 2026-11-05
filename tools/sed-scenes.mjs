// =============================================================================
// The committed scenes of the SED kernel's validation (Prompt 245)
// -----------------------------------------------------------------------------
// tests/fixtures/sed/thresholds.json fixed the parameters of every scene before the kernel
// existed; this turns them into generator specs. Shared by the validator and by the oracle's
// input writer, so the two always judge the same points.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeBand } from '../js/kernels/radiation/index.js';
import { BANDS, PACK, ZERO_POINTS } from '../js/data/radiation/bandpasses.js';
import { makeSyntheticSed } from '../js/kernels/sed/synthetic.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = 'tests/fixtures/sed';
export const THRESHOLDS = JSON.parse(
  readFileSync(path.join(ROOT, DIR, 'thresholds.json'), 'utf8')
);
export const SYN = THRESHOLDS.synthetic;
export const limits = id => THRESHOLDS.checks.find(c => c.id === id).limits;

/** The bandpass pack's bands, decoded, by id. */
export const bands = new Map(BANDS.map(b => [b.id, decodeBand(b)]));
export { PACK, ZERO_POINTS };

/** The committed point sets by name: with-mir is sdss-2mass plus the mir-extra points. */
export const SETS = {
  'optical-nir': SYN.pointSets['optical-nir'].points,
  'sdss-2mass': SYN.pointSets['sdss-2mass'].points,
  'with-mir': [
    ...SYN.pointSets['sdss-2mass'].points,
    ...SYN.pointSets['mir-extra'].points,
  ],
  'rayleigh-jeans': SYN.pointSets['rayleigh-jeans'].points,
};

export const starOf = key => SYN.stars[key];

/** One realisation of a scene. */
export function makeScene(
  starKey,
  setKey,
  {
    seed,
    label,
    realisation = 0,
    noise = true,
    nonsimultaneous = false,
    excess = false,
  }
) {
  const spec = { star: starOf(starKey), points: SETS[setKey], noise };
  if (nonsimultaneous)
    spec.epochs = {
      reference: SYN.epochs.reference,
      ids: SYN.epochs.nonsimultaneousIds,
      offsetDays: SYN.epochs.nonsimultaneousOffsetDays,
      trueVariability: SYN.epochs.trueVariability,
    };
  else
    spec.epochs = {
      reference: SYN.epochs.reference,
      ids: [],
      offsetDays: 0,
      trueVariability: 0,
    };
  if (excess)
    spec.excess = {
      T: SYN.excess.T,
      ratio: SYN.excess.ratioToStarAt12000nm,
      ratioAtNm: 12000,
    };
  return makeSyntheticSed(spec, { bands, seed, label, realisation });
}
