// =============================================================================
// A TESS light curve's aperture mask, as a data pack
// -----------------------------------------------------------------------------
// The third extension of every SPOC light curve is a small image: the pixels
// around the star that were read out, and which of them were summed into the
// light curve. Each pixel is the bit-wise OR of flags the TESS Science Data
// Products Description Document defines (APERTURE_BITS, with its table
// number), so the image is categorical, not a picture of the sky: it says
// where the light curve's light came from, and which pixels measured the sky
// behind it.
//
// The pixels are copied as the archive has them; nothing is resampled,
// rotated or rescaled. They are encoded as `image-uint16/1` - little-endian
// 16-bit integers, row by row from the lowest row, the FITS order - which
// js/observation.js decodes. The world coordinates are the extension's own.
//
// The check, readAperture()'s record: the optimal aperture holds exactly the
// NPIXSAP pixels the header counts, every pixel in it was collected, and the
// flux-weighted-centroid pixels, taken through the WCS, center within one
// pixel of the target's catalog position.
// =============================================================================

import { Buffer } from 'node:buffer';

import { separation, skyOf, unusableWcs } from '../../js/observatory/wcs.js';

/** Bumped with any change to what this writes; the manifest records it. */
export const APERTURE_VERSION = '1.0.0';

/** What each bit means. */
export const APERTURE_BITS = Object.freeze([
  { value: 1, meaning: 'collected by the spacecraft' },
  { value: 2, meaning: 'in the optimal aperture, summed into the light curve' },
  { value: 4, meaning: 'used to measure the background' },
  { value: 8, meaning: 'used for the flux-weighted centroid' },
  { value: 16, meaning: 'used for the PRF-fitted centroid' },
  { value: 32, meaning: 'on CCD output A' },
  { value: 64, meaning: 'on CCD output B' },
  { value: 128, meaning: 'on CCD output C' },
  { value: 256, meaning: 'on CCD output D' },
]);

export const BITS_SOURCE =
  'TESS Science Data Products Description Document, NASA/TM-2018-220036 (EXP-TESS-ARC-ICD-0014 Rev D, 31 July 2018), table 15: aperture mask image bits';

const ALL_BITS = APERTURE_BITS.reduce((a, b) => a | b.value, 0);

/**
 * The aperture mask of a SPOC light curve, checked.
 * @param {Array<object>} units - readFits() of the light curve
 */
export function readAperture(units) {
  const unit = units.find(u => u.cards.EXTNAME === 'APERTURE');
  if (!unit?.image) throw new Error('the file has no APERTURE image');
  const { width, height, values } = unit.image;
  const C = unit.cards;
  const counts = Object.fromEntries(APERTURE_BITS.map(b => [b.value, 0]));
  for (const v of values) {
    if (!Number.isInteger(v) || v < 0 || (v & ~ALL_BITS) !== 0) {
      throw new Error(
        `a pixel holds ${v}, which is not a combination of the documented bits`
      );
    }
    for (const b of APERTURE_BITS) if (v & b.value) counts[b.value]++;
  }
  const wcs = {
    ctype: [C.CTYPE1, C.CTYPE2],
    crpix: [C.CRPIX1, C.CRPIX2],
    crval: [C.CRVAL1, C.CRVAL2],
    cdelt: [C.CDELT1, C.CDELT2],
    pc: [
      [C.PC1_1, C.PC1_2],
      [C.PC2_1, C.PC2_2],
    ],
    radesys: C.RADESYS,
  };
  const why = unusableWcs(wcs);
  if (why) throw new Error(`the aperture's WCS is unusable: ${why}`);

  // The flux-weighted-centroid pixels' mean position, on the sky.
  let sx = 0;
  let sy = 0;
  let n = 0;
  values.forEach((v, i) => {
    if (v & 8) {
      sx += (i % width) + 1;
      sy += Math.floor(i / width) + 1;
      n++;
    }
  });
  const center = n ? skyOf(wcs, sx / n, sy / n) : null;
  const target = { ra: C.RA_OBJ, dec: C.DEC_OBJ };
  return {
    width,
    height,
    values: Uint16Array.from(values),
    wcs,
    cards: C,
    record: {
      pixels: values.length,
      counts,
      npixsap: C.NPIXSAP,
      npixmiss: C.NPIXMISS,
      centroidPixels: n,
      centroidOffsetArcsec: center
        ? Number((separation(center, target) * 3600).toFixed(2))
        : null,
      ccdCorner: { column: C.CRVAL1P, row: C.CRVAL2P },
    },
  };
}

/** `image-uint16/1`: little-endian 16-bit pixels, the lowest row first. */
export function encodeAperture({ width, height, values }) {
  const bytes = Buffer.alloc(2 * values.length);
  values.forEach((v, i) => bytes.writeUInt16LE(v, 2 * i));
  return {
    encoding: 'image-uint16/1',
    quantity: 'aperture-flags',
    width,
    height,
    data: bytes.toString('base64'),
  };
}
