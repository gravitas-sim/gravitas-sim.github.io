// =============================================================================
// AU Microscopii: TESS sector 1 light curve (a spotted, flaring M dwarf)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/activity.mjs) from tess2018206045859-s0001-0000000441420236-0120-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/tess-au-mic-s1.json.
//
// The rows are not here. They are the sidecar variables/tess-au-mic-s1.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-au-mic-s1',
  version: '1.0.0',
  title:
    'AU Microscopii: TESS sector 1 light curve (a spotted, flaring M dwarf)',
  object: {
    name: 'AU Microscopii',
    identifiers: ['TIC 441420236'],
    ra: 311.289718192023,
    dec: -31.3409004606736,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 6.75500011,
  },
  facility: {
    observatory: 'TESS',
    instrument: 'camera 1, CCD 4, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.10-20200904',
  },
  dataType: 'light-curve',
  origin: 'observed',
  credit: 'TESS, sector 1 (NASA; SPOC light curve from MAST)',
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
      description: 'cadence mid-time, BTJD = BJD - 2457000',
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
      description: 'PDCSAP error over the median, one sigma',
    },
  ],
  masks: [
    {
      column: 'QUALITY',
      rule: 'any nonzero flag drops the cadence',
      dropped: 2389,
    },
  ],
  reductions: [
    'Every kept two-minute cadence is stored with its own time stamp; nothing is averaged.',
    'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.00001 d (0.86 s); the manifest records the largest rounding.',
    'AU Mic is a young, active M1 dwarf in the Beta Pictoris moving group with strong spot modulation and frequent flares; Gilbert et al. (2022) find 48 flares in 25.07 d of this sector at 2-minute cadence with their own pipeline.',
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
  file: 'variables/tess-au-mic-s1.json',
  bytes: 188902,
  sha256: '7815d6e7ea7b858ceec6a9038e861a70adff9113ec615e5688b9a04318b22959',
};
