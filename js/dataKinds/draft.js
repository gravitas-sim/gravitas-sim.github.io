// =============================================================================
// A sidecar drafted from a FITS header (Prompt 157)
// -----------------------------------------------------------------------------
// What the file says of itself, each claim carrying the card it came from, and
// nothing it does not say: a linearity range and a calibration state are not in
// a header, so a draft of an ordinary frame has gaps, and an image with a gap is
// `display-only` until the person who knows fills it in. The student's import
// (Prompt 188) shows `missing` as the list of what to fill.
// =============================================================================

import {
  photometryGaps,
  validateImage,
  FLUX_UNITS,
  TIME_SCALES,
  IMAGE_FORMAT,
  FORMAT_VERSION,
} from './contract.js';

const UNITS = {
  adu: 'adu',
  dn: 'adu',
  'adu/s': 'adu/s',
  'dn/s': 'adu/s',
  electron: 'electron',
  electrons: 'electron',
  'e-': 'electron',
  'electron/s': 'electron/s',
  'electrons/s': 'electron/s',
  'e-/s': 'electron/s',
  count: 'count',
  counts: 'count',
  'count/s': 'count/s',
  'counts/s': 'count/s',
};
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;

/**
 * @param {object} read - What readFits returned
 * @param {{id: string, title?: string, note?: string}} o
 * @returns {{doc: object, missing: string[], valid: boolean}}
 */
export function draftSidecar(
  read,
  { id, title = id, note = "a FITS file on the reader's device" }
) {
  const c = read.claims;
  const unit =
    UNITS[
      String(c.unit?.value ?? '')
        .trim()
        .toLowerCase()
    ] ?? 'unknown';
  const pixels = { unit };
  if (c.gain)
    pixels.gain = {
      value: c.gain.value,
      unit: 'electron/adu',
      source: 'header',
    };
  if (c.readNoise)
    pixels.readNoise = {
      value: c.readNoise.value,
      unit: 'electron',
      source: 'header',
    };
  if (c.saturation)
    pixels.saturation = {
      level: c.saturation.value,
      source: c.saturation.source,
    };
  const doc = {
    format: IMAGE_FORMAT,
    formatVersion: FORMAT_VERSION,
    id,
    title,
    use: 'display-only',
    width: read.width,
    height: read.height,
    pixels,
    planes: { data: { encoding: 'float64-le' } },
    history: [
      {
        step: 'decode',
        tool: 'js/dataKinds/fits.js',
        version: '1',
        lossy: false,
      },
    ],
    source: { kind: 'fits', note },
  };
  if (read.wcs) doc.wcs = read.wcs;
  if (c.exposureSeconds && c.exposureSeconds.value > 0)
    doc.exposure = { seconds: c.exposureSeconds.value, kind: 'nominal' };
  if (c.dateObs && ISO.test(c.dateObs.value)) {
    const scale = String(c.timeScale?.value ?? 'UTC').toUpperCase();
    doc.time = {
      value: c.dateObs.value,
      scale: TIME_SCALES.includes(scale) ? scale : 'UTC',
      format: 'iso',
      reference: 'start',
    };
  }
  const missing = photometryGaps(doc);
  if (FLUX_UNITS.includes(unit) && missing.length === 0)
    doc.use = 'quantitative';
  return { doc, missing, valid: validateImage(doc).ok };
}
