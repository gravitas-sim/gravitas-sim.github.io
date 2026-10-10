// =============================================================================
// The solar neighbourhood: 1,570 Gaia DR3 stars with radial velocities
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/gaia-dynamics.mjs) from gaia-dr3-solar-neighbourhood.csv, gaia-dr3-solar-near-pool.csv, gaia-dr3-solar-far-pool.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/gaia-dr3-solar-neighbourhood.json.
//
// The rows are not here. They are the sidecar gaia/solar-neighbourhood.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'gaia-dr3-solar-neighbourhood',
  version: '1.0.0',
  title: 'The solar neighbourhood: 1,570 Gaia DR3 stars with radial velocities',
  object: {
    name: 'the solar neighbourhood (stars within 1 kpc of the Sun)',
    identifiers: ['Gaia DR3 (source ids are left out)'],
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
      description: 'parallax (parallax), not corrected for the zero point',
    },
    {
      id: 'parallax_err',
      name: 'parallax error',
      unit: 'mas',
      uncertaintyOf: 'parallax',
      description: 'its one-sigma error (parallax_error)',
    },
    {
      id: 'pmra',
      name: 'pm ra',
      unit: 'mas/yr',
      description:
        'proper motion in right ascension times cos(dec), mu_alpha* (pmra)',
    },
    {
      id: 'pmra_err',
      name: 'pm ra error',
      unit: 'mas/yr',
      uncertaintyOf: 'pm ra',
      description: 'its one-sigma error (pmra_error)',
    },
    {
      id: 'pmdec',
      name: 'pm dec',
      unit: 'mas/yr',
      description: 'proper motion in declination (pmdec)',
    },
    {
      id: 'pmdec_err',
      name: 'pm dec error',
      unit: 'mas/yr',
      uncertaintyOf: 'pm dec',
      description: 'its one-sigma error (pmdec_error)',
    },
    {
      id: 'rv',
      name: 'radial velocity',
      unit: 'km/s',
      description:
        'heliocentric radial velocity from the Gaia spectrometer (radial_velocity)',
    },
    {
      id: 'rv_err',
      name: 'radial velocity error',
      unit: 'km/s',
      uncertaintyOf: 'radial velocity',
      description: 'its one-sigma error (radial_velocity_error)',
    },
    {
      id: 'g',
      name: 'G',
      unit: 'mag',
      description: 'Gaia G magnitude (phot_g_mean_mag)',
    },
    {
      id: 'bp_rp',
      name: 'BP-RP',
      unit: 'mag',
      description:
        'Gaia BP minus RP colour (bp_rp), not corrected for extinction',
    },
  ],
  masks: [],
  reductions: [
    "The cuts: RUWE below 1.4 (Gaia's flag for a poor astrometric solution), a parallax measured to more than 10 times its error (so that 1/parallax is a distance to 10 percent or better), and a Gaia radial velocity.",
    "Two strata of the stars that pass those cuts, each a random subset chosen by Gaia's own random_index: the nearer 489 stars (parallax above 10 mas, closer than 100 pc) are about 1 in 273 of the 133,468 that pass; the remaining 1081 (parallax 1 to 10 mas, 100 pc to 1 kpc) are about 1 in 9,065 of the 9,798,805. The proportions are not the sky's: the near stratum is over-sampled so that the Sun's motion has stars near enough to be measured without the Galaxy's rotation in them.",
    'Gaia measures radial velocities only for stars brighter than about G_RVS = 14, which favours bright stars; the sample is not volume-complete and its colours are not those of the stellar population.',
    'No parallax zero-point correction is applied (Lindegren et al. 2021 give about -0.017 mas on average: 1.7 percent at 100 pc, 1.7 percent at 1 kpc to the distance).',
    'Positions are rounded to 0.006 degree in right ascension and 0.004 degree in declination (22 and 14 arcsec), parallaxes to 0.02 mas, proper motions to 0.01 mas/yr, radial velocities to 0.02 km/s: good for Galactic coordinates to 0.01 degree and for velocities to under 0.1 km/s, not for a cross-match.',
    "Galactic longitude and latitude are not stored: the galactic kernel computes them from the position, and its transformation is tested against the values Gaia's archive gives.",
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
  file: 'gaia/solar-neighbourhood.json',
  bytes: 59345,
  sha256: '8e0a738c697822aa7204c6dcc1118bc1755380a6a7c635c6da4c5f5e6f8d3c23',
};
