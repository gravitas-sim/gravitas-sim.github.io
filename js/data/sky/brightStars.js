// =============================================================================
// Bright stars to V 4.5 for the Sky Lab: the Yale Bright Star Catalogue (5th revised edition)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/sky.mjs) from cds-v50-bsc5-readme.txt, cds-v50-bsc5-catalog.gz, cds-v50-bsc5-notes.gz;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw products and compares byte for byte. The full
// record - sources, pins, every step, the checks it passed - is
// data-packs/sky-bright-stars.json.
//
// The rows are not here. They are the sidecar sky/bright-stars.json, which the
// Sky Lab fetches, so that a page budget that counts JavaScript does not count
// a star table; SIDECAR records its size and checksum, and the file carries
// this PACK again so a reader of the file alone can credit it.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'sky-bright-stars',
  version: '1.0.0',
  title:
    'Bright stars to V 4.5 for the Sky Lab: the Yale Bright Star Catalogue (5th revised edition)',
  object: {
    name: 'the brightest stars of the whole sky',
    identifiers: ['Harvard Revised (Bright Star) numbers'],
  },
  facility: {
    observatory:
      'Yale University Observatory; NASA/NSSDC Astronomical Data Center; CDS (VizieR V/50)',
    pipeline: 'tools/data-packs/sky.mjs 1.0.0',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'Hoffleit, D. and Warren, W. H. Jr., The Bright Star Catalogue, 5th Revised Ed. (preliminary version), NASA/NSSDC Astronomical Data Center (1991); CDS V/50 (1991bsc..book.....H)',
  license: {
    status: 'no-license-stated',
    statement:
      "The ReadMe of CDS catalogue V/50 (pinned here), the Yale/Harvard catalogue pages and HEASARC's page state no licence and no permission to redistribute. CDS's terms (cds.unistra.fr/vizier-org/licences_vizier.html, read 2026-10-09) say VizieR data are free for scientific use with the original authors cited and that commercial use depends on the origin, so use with citation is confirmed and redistribution of a derived subset is not.",
    basis:
      'A reduced derivative for teaching (904 of 9,110 entries, the facts of position, brightness, colour and name, no remarks text), credited in full, with the checksum of every raw file recorded so the original can be fetched again and compared; shipped on the data-pack "no licence stated, credited" basis with citation, by Carl\'s instruction of 2026-10-09 (DECISION_REGISTER.md D-SKY-02). Hipparcos and Tycho are CC BY-NC 3.0 IGO and are not used.',
  },
  retrieved: '2026-10-09',
  columns: [
    {
      name: 'ra',
      unit: 'deg',
      description: 'right ascension J2000.0, stored in 1e-4 degree',
    },
    {
      name: 'dec',
      unit: 'deg',
      description: 'declination J2000.0, stored in 1e-4 degree',
    },
    {
      name: 'v',
      unit: 'mag',
      description: 'visual magnitude, stored in 1e-2 mag',
    },
    {
      name: 'tcol',
      unit: 'K',
      description:
        'blackbody colour temperature from B-V through the radiation kernel; not an effective temperature',
    },
  ],
  masks: [],
  reductions: [],
  citations: [
    {
      text: 'Hoffleit & Warren 1991, The Bright Star Catalogue, 5th Revised Ed. (preliminary version), NASA/ADC; CDS V/50',
      url: 'https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50',
    },
    {
      text: 'Hoffleit & Jaschek 1982, The Bright Star Catalogue, 4th Revised Ed., Yale University Observatory',
    },
    {
      text: 'Bessell & Murphy 2012, PASP 124, 140 (the B and V bands the colour temperature uses)',
      doi: '10.1086/664083',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'sky/bright-stars.json',
  bytes: 62075,
  sha256: 'da12c3290b40c6fce365666084a7232f7db6d4efc4e1e3f6509cf1164611f577',
  count: 904,
};
