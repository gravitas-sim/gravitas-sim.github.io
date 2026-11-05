// =============================================================================
// SED kernel: labelled synthetic stars (Prompt 245)
// -----------------------------------------------------------------------------
// Everything this module returns is SYNTHETIC: the kernel's own blackbody model of a star
// of stated temperature, radius and distance, seen through the bandpasses the caller hands
// in (the bandpass pack's), plus Gaussian noise from a seeded stream, with the truth beside
// it (the manifest). Optional scenes: a variability factor on listed points (the
// nonsimultaneity rule's assumption: independent, zero-mean, in log flux), a second
// blackbody that adds an excess at long wavelengths (a misspecified model), and epochs.
// The wavelengths of monochromatic points are whatever the spec says; no instrument is
// represented, and a lesson built on these points says so.
//
// Draw order, per point, in the order of the spec: a variability normal (only for a listed
// point), then a noise normal. The stream is stream('noise', seed, label, realisation).
// =============================================================================

import { PC_M, R_SUN_M, SIGMA_SB } from '../radiation/index.js';
import { gaussian, stream } from '../../random/streams.js';
import { jyToMag } from './conventions.js';
import { bandIntegratedJy, monochromaticJy } from './model.js';

const { Math } = globalThis;

export const SYNTHETIC_PREFIX = 'SYNTHETIC SED';
export const SYNTHETIC_LABEL =
  "SYNTHETIC SED: the kernel's blackbody model through the in-tree bandpasses plus seeded noise; no star, survey, catalogue or archive is represented.";

/**
 * One synthetic SED.
 * @param {object} spec
 * @param {{T: number, radiusSolar: number, distancePc: number}} spec.star
 * @param {object[]} spec.points - {id, band | lambdaNm, convention, sigma | sigmaFraction}
 * @param {boolean} [spec.noise] - Default true
 * @param {{reference: number, ids: string[], offsetDays: number, trueVariability: number}} [spec.epochs]
 * @param {{T: number, ratioAtNm: number, ratio: number}} [spec.excess]
 * @param {object} ctx
 * @param {Map<string, object>|object} ctx.bands - Decoded bands by id
 * @param {number|string} ctx.seed
 * @param {string} ctx.label
 * @param {number} [ctx.realisation]
 */
export function makeSyntheticSed(
  spec,
  { bands, seed, label, realisation = 0 }
) {
  const get = b => (bands instanceof Map ? bands.get(b) : bands[b]);
  const { T, radiusSolar, distancePc } = spec.star;
  const d = distancePc * PC_M;
  const theta = (radiusSolar * R_SUN_M) / d;
  const draw = gaussian(stream('noise', seed, label, realisation));
  const noise = spec.noise !== false;
  const modelJy = (p, TT, th2) =>
    th2 *
    (p.band
      ? bandIntegratedJy(get(p.band), TT)
      : monochromaticJy(TT, p.lambdaNm));
  let excessScale = 0;
  if (spec.excess) {
    const star12 = theta * theta * monochromaticJy(T, spec.excess.ratioAtNm);
    excessScale =
      (spec.excess.ratio * star12) /
      monochromaticJy(spec.excess.T, spec.excess.ratioAtNm);
  }
  const flagged = new Set(spec.epochs?.ids ?? []);
  const points = [];
  for (const p of spec.points) {
    let f = modelJy(p, T, theta * theta);
    if (spec.excess) f += modelJy(p, spec.excess.T, excessScale);
    let epoch = spec.epochs ? spec.epochs.reference : null;
    if (flagged.has(p.id)) {
      f *= Math.exp(spec.epochs.trueVariability * draw());
      epoch += spec.epochs.offsetDays;
    }
    const kind = p.band ? 'band-integrated' : 'monochromatic';
    const abMinusVega = p.band ? get(p.band).abMinusVega : null;
    let value;
    let sigma;
    if (p.convention === 'ab-mag' || p.convention === 'vega-mag') {
      value =
        jyToMag(f, p.convention, abMinusVega) + (noise ? p.sigma * draw() : 0);
      sigma = p.sigma;
    } else {
      value = f * (1 + (noise ? p.sigmaFraction * draw() : 0));
      sigma = p.sigmaFraction * value;
    }
    points.push({
      id: p.id,
      kind,
      ...(p.band ? { band: p.band } : { lambdaNm: p.lambdaNm }),
      convention: p.convention,
      value,
      sigma,
      epoch,
    });
  }
  const truth = {
    T,
    radiusSolar,
    distancePc,
    theta,
    luminosityW: 4 * Math.PI * (theta * d) ** 2 * SIGMA_SB * T ** 4,
    totalFluxWm2: theta * theta * SIGMA_SB * T ** 4,
    excess: spec.excess ?? null,
    noise,
    seed,
    label,
    realisation,
  };
  return { label: SYNTHETIC_LABEL, points, truth };
}
