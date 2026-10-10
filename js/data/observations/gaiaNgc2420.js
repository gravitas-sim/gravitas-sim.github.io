// =============================================================================
// NGC 2420: Gaia DR3 astrometry
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/gaia-dynamics.mjs) from gaia-dr3-ngc2420.csv, gaia-dr3-ngc2420-cone.csv, gaia-dr3-ngc2420-ruwe.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/gaia-dr3-ngc2420.json.
//
// The rows are not here. They are the sidecar gaia/ngc2420.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'gaia-dr3-ngc2420',
  version: '1.0.0',
  title: 'NGC 2420: Gaia DR3 astrometry',
  object: {
    name: 'NGC 2420',
    identifiers: ['NGC 2420'],
    ra: 114.602,
    dec: 21.575,
    frame: 'ICRS, epoch J2016.0',
  },
  facility: {
    observatory: 'ESA Gaia',
    instrument:
      'Gaia astrometric, photometric and radial-velocity spectrometer instruments',
    pipeline:
      'Gaia DR3 (gaiadr3.gaia_source), via the ESA Gaia archive TAP service',
  },
  dataType: 'catalog',
  origin: 'observed',
  credit:
    'ESA/Gaia/DPAC; Gaia Collaboration (Vallenari et al. 2023, A&A 674, A1). This work has made use of data from the European Space Agency (ESA) mission Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and Analysis Consortium (DPAC). NON-COMMERCIAL: CC BY-NC 3.0 IGO.',
  license: {
    status: 'cc-by-nc-3.0-igo',
    statement:
      "ESA's Gaia data licence page (https://www.cosmos.esa.int/web/gaia-users/license, read 2026-10-10) says: \"Gaia data are distributed under the CC BY-NC 3.0 IGO license.\" and refers to ESA's Terms and Conditions for the use of data in the ESA space science archives for commercial use. This pack is a compact subset of Gaia DR3, offered under CC BY-NC 3.0 IGO: attribute ESA/Gaia/DPAC and the Gaia DR3 papers, do not use it commercially, and say that it is a selected and rounded subset of the archive (the selection is the query in the manifest and each column's rounding is stated).",
    basis:
      'CC BY-NC 3.0 IGO permits copying, redistribution and adaptation, which includes a derived subset of the catalogue, with attribution and for non-commercial purposes; Gravitas is a free educational tool. It is the same licence, and so the same mechanism, as radiation-gaia-bandpasses (D-RAD-01), which the project owner shipped by explicit instruction; extending it to these Gaia samples is a delegated decision awaiting his review (DECISION_REGISTER.md D-GAIA-01), not a standing licence. Each sample is a pack of its own so that no other data is covered by the NC terms, and none may be bundled into a commercial redistribution of Gravitas (DATA_PACKS.md); removing the pack is removing its module, manifest and service-worker entry.',
    nonCommercial: true,
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'ra',
      name: 'ra',
      unit: 'deg',
      description: 'right ascension, ICRS, epoch J2016.0',
    },
    {
      id: 'dec',
      name: 'dec',
      unit: 'deg',
      description: 'declination, ICRS, epoch J2016.0',
    },
    {
      id: 'parallax',
      name: 'parallax',
      unit: 'mas',
      description: 'parallax, not corrected for the zero point',
    },
    {
      id: 'parallax_err',
      name: 'parallax error',
      unit: 'mas',
      uncertaintyOf: 'parallax',
      description: 'its one-sigma error',
    },
    {
      id: 'pmra',
      name: 'pm ra',
      unit: 'mas/yr',
      description: 'proper motion in right ascension times cos(dec), mu_alpha*',
    },
    {
      id: 'pmra_err',
      name: 'pm ra error',
      unit: 'mas/yr',
      uncertaintyOf: 'pm ra',
      description: 'its one-sigma error',
    },
    {
      id: 'pmdec',
      name: 'pm dec',
      unit: 'mas/yr',
      description: 'proper motion in declination',
    },
    {
      id: 'pmdec_err',
      name: 'pm dec error',
      unit: 'mas/yr',
      uncertaintyOf: 'pm dec',
      description: 'its one-sigma error',
    },
    {
      id: 'g',
      name: 'G',
      unit: 'mag',
      description: 'Gaia G magnitude',
    },
    {
      id: 'bp_rp',
      name: 'BP-RP',
      unit: 'mag',
      description: 'Gaia BP minus RP colour, not corrected for extinction',
    },
  ],
  masks: [
    {
      column: 'ruwe',
      rule: 'a star with RUWE of 1.4 or more, whose astrometric solution Gaia flags as poor, is dropped',
      dropped: 55,
    },
  ],
  reductions: [
    "Every star within 14.14 arcmin of the same adopted center as the SDSS photometry pack (RA 114.602, Dec +21.575): 1048 stars brighter than G = 17.5, of which 993 have RUWE below 1.4 and are kept. The circle is the SDSS pack's, so the two tables can be set side by side.",
    "Stars fainter than G = 17.5 are left out: their proper-motion errors approach the cluster's own spread.",
    "Gaia is not blind in the cluster's core, as SDSS is: its crowding limit is far higher, so the core is in this table.",
    'Positions are rounded to 0.00001 degree (0.04 arcsec), parallaxes, proper motions, errors and magnitudes to 0.001.',
    "The Gaia source ids are left out; the query in the pack's manifest returns them.",
  ],
  citations: [
    {
      text: 'Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 (Gaia Data Release 3: summary of the content and survey properties)',
      doi: '10.1051/0004-6361/202243940',
    },
    {
      text: 'Gaia Collaboration, Prusti et al. 2016, A&A 595, A1 (The Gaia mission)',
      doi: '10.1051/0004-6361/201629272',
    },
    {
      text: 'Katz et al. 2023, A&A 674, A5 (Gaia DR3: properties and validation of the radial velocities)',
      doi: '10.1051/0004-6361/202244220',
    },
    {
      text: 'Lindegren et al. 2021, A&A 649, A2 (Gaia EDR3: astrometric solution; the RUWE statistic and the parallax zero-point)',
      doi: '10.1051/0004-6361/202039709',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'gaia/ngc2420.json',
  bytes: 32390,
  sha256: '6709a0a33b43602e7e7bc62cc342502fb361ff2ff4595fb1ff1a5b019dbb42ef',
};
