// =============================================================================
// SU Draconis: TESS sector 15 light curve (an RR Lyrae star)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/variables.mjs) from tess2019226182529-s0015-0000000142848794-0151-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/tess-su-dra-s15.json.
//
// The rows are not here. They are the sidecar variables/tess-su-dra-s15.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-su-dra-s15',
  version: '1.0.0',
  title: 'SU Draconis: TESS sector 15 light curve (an RR Lyrae star)',
  object: {
    name: 'SU Draconis',
    identifiers: ['TIC 142848794'],
    ra: 174.485863152031,
    dec: 67.3297391178305,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 9.45479965,
  },
  facility: {
    observatory: 'TESS',
    instrument: 'camera 4, CCD 3, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.96-20230729',
  },
  dataType: 'light-curve',
  origin: 'observed',
  credit: 'TESS, sector 15 (NASA; SPOC light curve from MAST)',
  license: {
    status: 'public-domain',
    statement:
      'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
  },
  retrieved: '2026-10-10',
  time: {
    scale: 'TDB',
    reference: 'BTJD = BJD - 2457000',
    unit: 'd',
  },
  columns: [
    {
      id: 'time',
      name: 'time',
      unit: 'd',
      description: 'bin centre, BTJD = BJD - 2457000',
    },
    {
      id: 'flux',
      name: 'flux',
      unit: '',
      description: 'PDCSAP flux over its median',
    },
    {
      id: 'flux_err',
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
      dropped: 1054,
    },
    {
      column: 'bin',
      rule: 'a bin with fewer than 3 kept cadences is dropped',
      dropped: 0,
    },
  ],
  reductions: [
    '20-minute bins average 10 two-minute cadences each; the bin error is the quadrature sum over the count.',
    'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.0001 d (8.6 s); the manifest records the largest rounding.',
    'SU Dra is a fundamental-mode RR Lyrae star with no Blazhko modulation, so one period describes the whole run.',
  ],
  citations: [
    {
      text: 'TESS Light Curves - All Sectors, STScI/MAST',
      doi: '10.17909/t9-nmc8-f686',
    },
    {
      text: 'Ricker et al. 2015, JATIS 1, 014003 (TESS)',
      doi: '10.1117/1.JATIS.1.1.014003',
    },
    {
      text: 'Jenkins et al. 2016, Proc. SPIE 9913, 99133E (SPOC)',
      doi: '10.1117/12.2233418',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'variables/tess-su-dra-s15.json',
  bytes: 19428,
  sha256: 'af4ddc932fb768ca17051b4c035971c7d237873516a817e59cd2cc43c1b2b00e',
};
