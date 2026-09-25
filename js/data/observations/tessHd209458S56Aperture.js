// =============================================================================
// HD 209458: TESS sector 56 aperture mask
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs from
// tess2022244194134-s0056-0000000420814525-0243-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte.
//
// THIS IS AN OBSERVATION. The full record - sources, checksums, every step of
// the transformation and the check it passed - is data-packs/tess-hd209458-s56-aperture.json.
// This module carries only what an instrument shows: PACK, to label and credit
// the data, and SERIES, the numbers, which js/observation.js decodes.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-hd209458-s56-aperture',
  version: '1.0.0',
  title: 'HD 209458: TESS sector 56 aperture mask',
  object: {
    name: 'HD 209458',
    identifiers: ['TIC 420814525'],
    ra: 330.794887332661,
    dec: 18.8843189579296,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 7.12739992,
  },
  facility: {
    observatory: 'TESS',
    instrument: 'camera 1, CCD 2, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.96-20230729',
  },
  dataType: 'image',
  origin: 'observed',
  credit: 'TESS, sector 56 (NASA; SPOC light-curve aperture from MAST)',
  license: {
    status: 'public-domain',
    statement:
      'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
  },
  retrieved: '2026-09-24',
  columns: [
    {
      name: 'aperture flags',
      unit: '',
      description:
        'each pixel is the bit-wise OR of the bits in image.bits, as the archive has it',
    },
  ],
  masks: [],
  reductions: [],
  image: {
    width: 11,
    height: 13,
    pixels:
      'row by row from the lowest; x along a row and y up, 1 at the center of the first pixel, as in FITS',
    wcs: {
      ctype: ['RA---TAN', 'DEC--TAN'],
      crpix: [6.254819344476573, 6.530449812067786],
      crval: [330.7950845247853, 18.884206107937736],
      cdelt: [-0.005395091119529, 0.005395091119528831],
      pc: [
        [0.8513512737077913, -0.46043911374994434],
        [-0.5219565893104138, -0.8923117801814796],
      ],
      radesys: 'ICRS',
    },
    bits: [
      {
        value: 1,
        meaning: 'collected by the spacecraft',
      },
      {
        value: 2,
        meaning: 'in the optimal aperture, summed into the light curve',
      },
      {
        value: 4,
        meaning: 'used to measure the background',
      },
      {
        value: 8,
        meaning: 'used for the flux-weighted centroid',
      },
      {
        value: 16,
        meaning: 'used for the PRF-fitted centroid',
      },
      {
        value: 32,
        meaning: 'on CCD output A',
      },
      {
        value: 64,
        meaning: 'on CCD output B',
      },
      {
        value: 128,
        meaning: 'on CCD output C',
      },
      {
        value: 256,
        meaning: 'on CCD output D',
      },
    ],
    bitsSource:
      'TESS Science Data Products Description Document, NASA/TM-2018-220036 (EXP-TESS-ARC-ICD-0014 Rev D, 31 July 2018), table 15: aperture mask image bits',
    ccdCorner: {
      column: 1862,
      row: 352,
    },
  },
};

/** The series, encoded as SERIES.encoding says; see js/observation.js. */
export const SERIES = {
  encoding: 'image-uint16/1',
  quantity: 'aperture-flags',
  width: 11,
  height: 13,
  data: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBBQEFAQUBBQEFAQEBAQEFAQUBBQEBAQEBBQEFAQUBAQEBAQEBAQEBAQUBAQEBAQEBAQEBAQEBAQEBAQEBAQEFAQEBAQEBAQsBCwELAQsBCwEBAQEBBQEBAQEBCwELAQsBCwELAQsBAQEFAQUBAQEBAQEBCwELAQsBCwELAQEBBQEFAQUBAQEBAQsBCwELAQsBCwEBAQEBAQEFAQUBAQEBAQEBCwELAQEBAQEBAQEBBQEFAQEBAQEBAQEBAQEBAQEBAQEBAQUBBQEBAQEBAQEBAQEBAQEFAQUBBQEBAQEBBQEBAQUBBQEFAQUBBQEFAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
};
