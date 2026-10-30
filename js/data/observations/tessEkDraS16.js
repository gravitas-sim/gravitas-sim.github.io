// =============================================================================
// EK Draconis: TESS sector 16 light curve (a young Sun-like star)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/activity.mjs) from tess2019253231442-s0016-0000000159613900-0152-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/tess-ek-dra-s16.json.
//
// The rows are not here. They are the sidecar variables/tess-ek-dra-s16.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-ek-dra-s16',
  version: '1.0.0',
  title: 'EK Draconis: TESS sector 16 light curve (a young Sun-like star)',
  object: {
    name: 'EK Draconis',
    identifiers: ['TIC 159613900'],
    ra: 219.750878957174,
    dec: 64.2916603809589,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 7.03950024,
  },
  facility: {
    observatory: 'TESS',
    instrument: 'camera 4, CCD 2, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.96-20230729',
  },
  dataType: 'light-curve',
  origin: 'observed',
  credit: 'TESS, sector 16 (NASA; SPOC light curve from MAST)',
  license: {
    status: 'public-domain',
    statement:
      'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
  },
  retrieved: '2026-10-30',
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
      dropped: 2083,
    },
  ],
  reductions: [
    '30-minute bins average 15 two-minute cadences each; the bin error is the quadrature sum over the count.',
    'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.0001 d (8.6 s); the manifest records the largest rounding.',
    'EK Dra is a young (about 100 Myr) G1.5 dwarf whose rotation period is given as about 2.77 d (Audard et al. 1999; Ayres 2015; Namekata et al. 2022) and about 2.6 d (Gorgei et al. 2026); the difference is attributed to differential rotation. The band 2.5 to 2.9 d is the span of those values with 0.1 d of margin.',
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
  file: 'variables/tess-ek-dra-s16.json',
  bytes: 11492,
  sha256: '162506923f8e631cf186e99ddd85f6ffb0633df93b9482ed2e46764729dd7f22',
};
