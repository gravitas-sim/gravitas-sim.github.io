// =============================================================================
// Type Ia supernova Hubble diagram: Pantheon+SH0ES, 1,701 light curves
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/cosmology.mjs) from Pantheon+SH0ES.dat;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/pantheon-plus-hd.json.
//
// The rows are not here. They are the sidecar cosmology/pantheon-plus-hd.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'pantheon-plus-hd',
  version: '1.0.0',
  title: 'Type Ia supernova Hubble diagram: Pantheon+SH0ES, 1,701 light curves',
  object: {
    name: 'Type Ia supernovae of the Pantheon+ compilation (1,701 light curves of 1,543 distinct supernovae) with the SH0ES Cepheid calibrators',
    identifiers: ['Pantheon+SH0ES'],
    frame:
      'redshift in the CMB frame; distance modulus on the SH0ES-calibrated scale',
  },
  facility: {
    observatory:
      'Surveys and samples (SDSS, SNLS, CSP, DES, Pan-STARRS, CfA, LOSS, HST and others), compiled by the Pantheon+ team',
    pipeline:
      'Pantheon+_Data/4_DISTANCES_AND_COVAR/Pantheon+SH0ES.dat of the public data release',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'Scolnic et al. 2022 (ApJ 938, 113), Brout et al. 2022 (ApJ 938, 110), Riess et al. 2022 (ApJL 934, L7): the Pantheon+SH0ES data release, cited paper by paper as its release page asks',
  license: {
    status: 'no-license-stated',
    statement:
      'The release page (https://pantheonplussh0es.github.io/, read 2026-10-11) states no licence and says only "Please cite papers individually when referencing them." and that "Details on data release usage will be added upon journal acceptance"; the data repository (https://github.com/PantheonPlusSH0ES/DataRelease, commit 7fc6805) carries no LICENSE file and its READMEs state no terms of use. The table is public.',
    basis:
      'Shipped on the data-pack "no licence stated, credited" basis with the citations the release page requests, by Carl\'s instruction of 2026-10-11 (DECISION_REGISTER.md D-RIGHTS-04), the basis of D-SKY-02.',
  },
  retrieved: '2026-10-11',
  columns: [
    {
      id: 'z',
      name: 'redshift',
      unit: '',
      description:
        'zHD, the Hubble-diagram redshift (CMB frame, corrected for peculiar velocity)',
    },
    {
      id: 'mu',
      name: 'distance modulus',
      unit: 'mag',
      description:
        "MU_SH0ES, on the release's scale: the supernova absolute magnitude fixed from the SH0ES Cepheid host distances (H0 near 73)",
    },
    {
      id: 'mu_err',
      name: 'distance modulus error',
      unit: 'mag',
      uncertaintyOf: 'distance modulus',
      description:
        "MU_SH0ES_ERR_DIAG, the diagonal of the full covariance: for plotting only, the release's own warning",
    },
    {
      id: 'cal',
      name: 'Cepheid calibrator',
      unit: '',
      description:
        "IS_CALIBRATOR: 1 for a supernova in a host with a Cepheid distance (the release's calibrators), 0 otherwise",
    },
    {
      id: 'survey',
      name: 'survey code',
      unit: '',
      description:
        "IDSURVEY, the release's survey number (1 SDSS, 4 SNLS, 5 CSP, 10 DES, 15 PS1MD, 50 to 65 low-redshift samples, 100 to 106 HST, 150 FOUND)",
    },
  ],
  masks: [],
  reductions: [
    'All 1,701 rows of Pantheon+SH0ES.dat (commit 7fc6805), sorted by redshift, then identifier, then survey code. A supernova observed by two surveys is two rows, as the release has it. Of the 47 columns, five are kept and the identifier is not; the other 41 columns (SALT2 parameters, host properties, positions, bias corrections) are left out.',
    'Errors are the diagonal of the full statistical-plus-systematic covariance, which the release says is for plotting only. The 33 MB covariance is not shipped, so a fit to this table is not the published fit and its Omega_m carries a larger scatter than the published error.',
    'The distance moduli sit on the SH0ES-calibrated scale, so H0 is not measured by the supernovae alone: they fix the shape of the curve, not its scale. 77 rows are Cepheid calibrators.',
    "111 of the 1,701 rows have z below 0.01, where peculiar velocities dominate; the release keeps them and so does this table. Redshift is stored to 1e-5, the modulus to 1e-4 mag and its error to 1e-6, the raw file's digits: the stored table's mean redshift and mean modulus equal the raw file's to better than 1e-12 relative.",
  ],
  citations: [
    {
      text: 'Scolnic et al. 2022, ApJ 938, 113 (The Pantheon+ Analysis: The Full Data Set and Light-curve Release)',
      url: 'https://arxiv.org/abs/2112.03863',
    },
    {
      text: 'Brout et al. 2022, ApJ 938, 110 (The Pantheon+ Analysis: Cosmological Constraints)',
      url: 'https://arxiv.org/abs/2202.04077',
    },
    {
      text: 'Riess et al. 2022, ApJL 934, L7 (A Comprehensive Measurement of the Local Value of the Hubble Constant with 1 km/s/Mpc Uncertainty from the Hubble Space Telescope and the SH0ES Team)',
      url: 'https://arxiv.org/abs/2112.04510',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'cosmology/pantheon-plus-hd.json',
  bytes: 36613,
  sha256: '4d867ba5ae3e1d6a2de6e5378fadaac7f28ed6744428aece34b4bd4adc6cc3dd',
};
