// =============================================================================
// Eta Aquilae: TESS sector 81 light curve (a classical Cepheid)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/variables.mjs) from tess2024196212429-s0081-0000000111010123-0276-s_lc.fits;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/tess-eta-aql-s81.json.
//
// The rows are not here. They are the sidecar variables/tess-eta-aql-s81.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'tess-eta-aql-s81',
  version: '1.0.0',
  title: 'Eta Aquilae: TESS sector 81 light curve (a classical Cepheid)',
  object: {
    name: 'Eta Aquilae',
    identifiers: ['TIC 111010123'],
    ra: 298.118209419885,
    dec: 1.00566065135047,
    frame: 'ICRS, epoch J2000',
    tessMagnitude: 3.14499998,
  },
  facility: {
    observatory: 'TESS',
    instrument: 'camera 1, CCD 2, 2-minute cadence',
    pipeline: 'SPOC spoc-5.0.107-20240830',
  },
  dataType: 'light-curve',
  origin: 'observed',
  credit: 'TESS, sector 81 (NASA; SPOC light curve from MAST)',
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
      dropped: 3194,
    },
    {
      column: 'bin',
      rule: 'a bin with fewer than 3 kept cadences is dropped',
      dropped: 0,
    },
  ],
  reductions: [
    '60-minute bins average 30 two-minute cadences each; the bin error is the quadrature sum over the count.',
    'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.0001 d (8.6 s); the manifest records the largest rounding.',
    'Eta Aql is a naked-eye star (Tmag 3.1), saturated in TESS: the SPOC aperture collects the bleed trails and the light curve carries systematics at the few-percent level, which is why the residuals about a Fourier fit are larger than the photon noise. The run covers about 3.7 cycles of its period.',
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
  file: 'variables/tess-eta-aql-s81.json',
  bytes: 6005,
  sha256: '2633aed54797ca1025dec8c8d44d45b88d8de8ad1a0da66c389bf1c6fbd56111',
};
