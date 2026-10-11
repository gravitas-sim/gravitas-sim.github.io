// =============================================================================
// SDSS DR18 galaxy redshifts in a 120 to 240 degree strip at declination 0 to 0.5 degrees (a wedge)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/cosmology.mjs) from sdss-dr18-redshift-slice-query.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/sdss-dr18-redshift-slice.json.
//
// The rows are not here. They are the sidecar cosmology/sdss-dr18-redshift-slice.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'sdss-dr18-redshift-slice',
  version: '1.0.0',
  title:
    'SDSS DR18 galaxy redshifts in a 120 to 240 degree strip at declination 0 to 0.5 degrees (a wedge)',
  object: {
    name: 'The SDSS Legacy main galaxy sample in a thin equatorial strip',
    identifiers: ['SDSS DR18 SpecPhoto'],
    frame:
      'ICRS, J2000: right ascension 120 to 240 degrees, declination 0 to 0.5 degrees',
  },
  facility: {
    observatory: 'Sloan Digital Sky Survey (Apache Point 2.5 m)',
    pipeline: 'SDSS DR18 SkyServer, SpecPhoto',
  },
  dataType: 'catalog',
  origin: 'observed',
  credit:
    'SDSS-I/II (the Legacy main sample), Data Release 18: Almeida et al. 2023, ApJS 267, 44; Strauss et al. 2002, AJ 124, 1810',
  license: {
    status: 'public-domain',
    statement:
      'SDSS states that all data released in its public data releases are considered public domain (image-use policy, read 2026-10-09); it asks for the acknowledgement of the survey phase and the data release.',
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'ra',
      name: 'right ascension',
      unit: 'deg',
      description:
        'J2000, rounded to 1e-4 degree (0.36 arcsecond step, 0.18 arcsecond largest rounding)',
    },
    {
      id: 'z',
      name: 'redshift',
      unit: '',
      description: 'the spectroscopic redshift, its eight digits kept',
    },
  ],
  masks: [
    {
      column: 'class, zWarning, sciencePrimary',
      rule: "class GALAXY, zWarning 0, the survey's primary spectrum",
      dropped: 0,
    },
    {
      column: 'petroMag_r',
      rule: 'r < 17.77, the Legacy main sample limit',
      dropped: 0,
    },
    {
      column: 'z, dec',
      rule: 'z up to 0.12, declination 0 to 0.5 degrees: the first cut of six declared before the run that fits the size ceilings',
      dropped: 13336,
    },
  ],
  reductions: [
    'The strip declination 0 to 0.5 degrees, right ascension 120 to 240 degrees and redshift up to 0.12: 2911 of the 16247 galaxies the query returned, sorted by right ascension.',
    'Right ascension is rounded to 1e-4 degree (a stated step, largest rounding 0.18 arcsecond); the redshift keeps its eight digits. Declination, magnitudes, errors and identifiers are not kept: the strip is thin, and declination is its limits.',
    'This is a flux-limited sample (r < 17.77, fiber-limited, with fiber collisions): it thins with distance because fainter galaxies fall below the limit. A page that draws it must say so.',
  ],
  citations: [
    {
      text: 'Almeida et al. 2023, ApJS 267, 44 (The Eighteenth Data Release of the Sloan Digital Sky Surveys)',
      doi: '10.3847/1538-4365/acda98',
    },
    {
      text: 'Strauss et al. 2002, AJ 124, 1810 (Spectroscopic target selection in the SDSS: the main galaxy sample)',
      doi: '10.1086/342343',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'cosmology/sdss-dr18-redshift-slice.json',
  bytes: 31226,
  sha256: '60b2c7f99007a79b47c5f912f6bc25d4080b3b6402cbf2bdf335d4841419ff40',
};
