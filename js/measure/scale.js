// =============================================================================
// Scale, time and size: what a mark's pixels are worth (Prompt 179)
// -----------------------------------------------------------------------------
// The scale is one number with its uncertainty, from one of two places and never
// a blend of them:
//
//   the sidecar   arcseconds per pixel from the image's world coordinates
//                 (js/observatory/wcs.js pixelScale). It is a claim about the sky,
//                 so it needs what astrometry needs (js/dataKinds/contract.js
//                 permits): a display-only image refuses it, in the contract's
//                 words, and a reference pair is the way to a scale there.
//   a pair        a reference pair of marks and the length it spans, in any unit
//                 the person states (the Moon's diameter in km, a ruler in mm).
//                 It is the person's own measurement of the picture and is
//                 allowed on any image that can be marked, display-only included;
//                 its uncertainty is the pair's pixel length and the stated
//                 length, relative errors added in quadrature.
//
// The frame's time comes with its scale named (UTC, TT, TDB...), from the sidecar
// or the file's header; a time with no scale is not a time and is not shown as
// one. Pure; no DOM.
// =============================================================================

import { pixelScale } from '../observatory/wcs.js';
import { permits } from '../dataKinds/contract.js';

const pixelLength = m =>
  Math.hypot(m.pts[1][0] - m.pts[0][0], m.pts[1][1] - m.pts[0][1]);
/** The sigma of a segment's length from its two end points' sigmas (equal, independent axes). */
const lengthSigma = m => Math.SQRT2 * m.sigma;

/** A mark's length in pixels (a circle's is its radius); NaN for kinds with none. */
export const lengthOf = m =>
  m.pts.length === 2 && m.kind !== 'point' && m.kind !== 'count'
    ? pixelLength(m)
    : NaN;

/** The area of a polygon in square pixels (the shoelace formula). */
export function areaOf(m) {
  let s = 0;
  m.pts.forEach((p, i) => {
    const q = m.pts[(i + 1) % m.pts.length];
    s += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(s) / 2;
}

/**
 * The scale of a frame set.
 * @param {{marks: object[]}} state
 * @param {{sidecar?: object, permit?: object}} [from] - `sidecar` is a
 *   gravitas.image document; `permit` is what permits(doc, 'astrometry') said
 * @returns {{value: number, sigma: number, unit: string, source: string}
 *   |{refused: string, code: string}|null} null when there is no scale
 */
export function scaleOf(state, { sidecar, permit } = {}) {
  if (sidecar?.wcs) {
    const ok = permit ?? permits(sidecar, 'astrometry');
    if (!ok.ok) return { refused: ok.message, code: ok.code };
    const value = pixelScale(sidecar.wcs);
    return { value, sigma: 0, unit: 'arcsec/pix', source: 'sidecar' };
  }
  const pair = state.marks.find(m => m.kind === 'reference-pair' && m.length);
  if (!pair) return null;
  const p = pixelLength(pair);
  const sp = lengthSigma(pair);
  const L = pair.length.value;
  const sL = pair.length.sigma ?? 0;
  const value = L / p;
  return {
    value,
    unit: `${pair.length.unit}/pix`,
    sigma: value * Math.hypot(sL / L, sp / p),
    source: pair.id,
    pixels: p,
    pixelSigma: sp,
  };
}

/**
 * What a mark measures, with the scale where there is one: a length (a circle's
 * radius) or a polygon's area, in pixels and, if the scale allows, in its unit.
 * @returns {{kind: 'length'|'area', px: number, sigmaPx: number,
 *   phys?: number, sigmaPhys?: number, unit?: string}|null}
 */
export function sizeOf(m, scale) {
  const area = m.kind === 'polygon';
  const px = area ? areaOf(m) : lengthOf(m);
  if (!(px >= 0)) return null;
  const sigmaPx = area ? NaN : (m.sigmaR ?? lengthSigma(m));
  const out = { kind: area ? 'area' : 'length', px, sigmaPx };
  if (scale?.value > 0) {
    const k = area ? scale.value ** 2 : scale.value;
    out.phys = px * k;
    out.unit = area
      ? `${scale.unit.replace('/pix', '')}^2`
      : scale.unit.replace('/pix', '');
    out.sigmaPhys = area
      ? NaN
      : out.phys * Math.hypot(sigmaPx / px, scale.sigma / scale.value);
  }
  return out;
}

const DAY = 86400000;
const MJD_UNIX = 40587;

/**
 * A frame's time as the contract states it, or null: a number alone has no
 * scale and is not accepted; a legacy `{value, scale}` is read as an MJD.
 * @param {object} t - {value, scale, format?, reference?}
 * @returns {{mjd: number, scale: string, label: string, reference?: string}|null}
 */
export function timeOf(t) {
  if (!t || typeof t.scale !== 'string' || !t.scale) return null;
  const format = t.format ?? 'mjd';
  let mjd;
  if (format === 'iso')
    mjd =
      Date.parse(String(t.value).endsWith('Z') ? t.value : `${t.value}Z`) /
        DAY +
      MJD_UNIX;
  else if (format === 'jd') mjd = Number(t.value) - 2400000.5;
  else mjd = Number(t.value);
  if (!Number.isFinite(mjd)) return null;
  const label =
    format === 'iso' ? String(t.value) : `${format.toUpperCase()} ${t.value}`;
  return {
    mjd,
    scale: t.scale,
    label: `${label} ${t.scale}`,
    reference: t.reference,
  };
}
