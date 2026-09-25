// =============================================================================
// HD 209458: TESS sector 56 light curve
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs from
// tess2022244194134-s0056-0000000420814525-0243-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte.
//
// THIS IS AN OBSERVATION. The full record - sources, checksums, every step of
// the transformation and the check it passed - is data-packs/tess-hd209458-s56-lc.json.
// This module carries only what an instrument shows: PACK, to label and credit
// the data, and SERIES, the numbers, which js/observation.js decodes.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-hd209458-s56-lc',
  version: '1.0.0',
  title: 'HD 209458: TESS sector 56 light curve',
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
  dataType: 'light-curve',
  origin: 'observed',
  credit: 'TESS, sector 56 (NASA; SPOC light curve from MAST)',
  license: {
    status: 'public-domain',
    statement:
      'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
  },
  retrieved: '2026-09-24',
  time: {
    scale: 'TDB',
    reference: 'BTJD = BJD - 2457000',
    unit: 'd',
  },
  columns: [
    {
      name: 'time',
      unit: 'd',
      description: 'bin centre: t0 + (index + 0.5) x binDays, in BTJD',
    },
    {
      name: 'flux',
      unit: '',
      description: 'PDCSAP flux over its median',
    },
    {
      name: 'flux error',
      unit: '',
      uncertaintyOf: 'flux',
      description:
        'propagated PDCSAP error over the median, one sigma, per bin',
    },
  ],
  masks: [
    {
      column: 'QUALITY',
      rule: 'any nonzero flag drops the cadence',
      dropped: 1288,
    },
    {
      column: 'TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR',
      rule: 'a cadence without a finite value in all three is dropped',
      dropped: 0,
    },
    {
      column: 'bin',
      rule: 'a bin with fewer than 3 kept cadences is dropped',
      dropped: 3,
    },
  ],
  reductions: [
    '20-minute bins average 10 two-minute cadences each, which rounds ingress and egress to a bin.',
    'Flux is kept to 1 ppm and its error to 5 ppm.',
  ],
};

/** The series, encoded as SERIES.encoding says; see js/observation.js. */
export const SERIES = {
  encoding: 'binned-relative-flux/1',
  t0: 2825.25,
  binDays: 0.013888888888888888,
  n: 1882,
  runs: [
    [1, 466],
    [482, 193],
    [756, 200],
    [971, 515],
    [1501, 508],
  ],
  flux: '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',
  errStepPpm: 5,
  err: 'Dw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDxAPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PEA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PEhAPDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDxsSDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8ODw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PGw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8TDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8QDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PGw==',
};
