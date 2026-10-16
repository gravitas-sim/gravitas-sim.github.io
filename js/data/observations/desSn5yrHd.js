// =============================================================================
// Type Ia supernova Hubble diagram: DES-SN5YR, 1,829 supernovae
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/cosmology.mjs) from DES-SN5YR_HD.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/des-sn5yr-hd.json.
//
// The rows are not here. They are the sidecar cosmology/des-sn5yr-hd.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'des-sn5yr-hd',
  version: '1.0.0',
  title: 'Type Ia supernova Hubble diagram: DES-SN5YR, 1,829 supernovae',
  object: {
    name: 'Type Ia supernovae of the Dark Energy Survey five-year sample and its low-redshift companions',
    identifiers: ['DES-SN5YR'],
    frame:
      'redshift in the CMB frame; distance modulus on the release scale (H0 = 70)',
  },
  facility: {
    observatory:
      'Dark Energy Survey (CTIO) with low-redshift supernovae from other surveys',
    pipeline: 'DES-SN5YR-1.2, 4_DISTANCES_COVMAT/DES-SN5YR_HD.csv',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'Sanchez et al. 2024 and DES Collaboration 2024 (the record asks for both), Zenodo 10.5281/zenodo.12720778, CC BY 4.0',
  license: {
    status: 'cc-by-4.0',
    statement:
      "The Zenodo record's metadata gives CC BY 4.0, whose Share clause permits reproducing the material with attribution (read 2026-10-09). Cite Sanchez et al. 2024 (arXiv:2406.05046) and DES Collaboration 2024, ApJL 973, L14.",
    basis:
      'COSMOLOGY_GATE.md section 1: the license as read from the record, kept with its legal code; D-COSMO-02 (delegated).',
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'z',
      name: 'redshift',
      unit: '',
      description:
        'zHD, the redshift corrected to the CMB frame and for peculiar velocity',
    },
    {
      id: 'mu',
      name: 'distance modulus',
      unit: 'mag',
      description:
        "MU, on the release's scale: H0 = 70 and its fixed absolute magnitude",
    },
    {
      id: 'mu_err',
      name: 'distance modulus error',
      unit: 'mag',
      uncertaintyOf: 'distance modulus',
      description:
        'MUERR_FINAL, statistical, with the intrinsic scatter included',
    },
    {
      id: 'des',
      name: 'survey',
      unit: '',
      description:
        '1 for a supernova found by the Dark Energy Survey, 0 for the low-redshift compilation',
    },
  ],
  masks: [],
  reductions: [
    'All 1,829 rows of DES-SN5YR_HD.csv, sorted by redshift (then identifier). The identifier, the CMB-frame and heliocentric redshifts are not kept; IDSURVEY is reduced to one flag (10 is the Dark Energy Survey).',
    'Statistical errors only: the published cosmology uses the full systematic covariance matrix (16 MB compressed), which is not shipped, and the statistical covariance in the release is all zeros. A fit to this table is therefore not the published fit.',
    "The distance moduli are on a scale fixed to H0 = 70 and the survey's absolute magnitude, so H0 is not measured by these supernovae alone: they fix the shape of the curve, not its scale.",
    "75 of the 1,829 rows have an error above 1 mag (the largest 450): the survey's down-weighted candidates. They are kept, as the release keeps them, and carry almost no weight in a weighted fit.",
    "Redshift is stored to 1e-5 and the modulus and its error to 1e-4 mag, the raw file's own digits: the mean redshift and mean modulus of the stored table equal the raw file's to better than 1e-12 relative (the manifest records the rounding).",
  ],
  citations: [
    {
      text: 'Sanchez et al. 2024 (The Dark Energy Survey Supernova Program: cosmological analysis and systematic uncertainties)',
      url: 'https://arxiv.org/abs/2406.05046',
    },
    {
      text: 'DES Collaboration 2024, ApJL 973, L14 (The Dark Energy Survey: cosmology results with ~1500 new high-redshift type Ia supernovae using the full 5-year dataset)',
      doi: '10.3847/2041-8213/ad6f9f',
    },
    {
      text: 'Zenodo record, DES-SN5YR-1.2 data release',
      doi: '10.5281/zenodo.12720778',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'cosmology/des-sn5yr-hd.json',
  bytes: 34423,
  sha256: '882fac34a4c4b4c73b72a22238410daa9cb0c686d209af4b7c9ad7763c75f76f',
};
