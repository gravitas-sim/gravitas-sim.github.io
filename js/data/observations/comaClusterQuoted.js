// =============================================================================
// The Coma cluster: the four values the Coma scenario and its virial instrument quote
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/cosmology.mjs) from its own record;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/coma-cluster-quoted.json.
//
// The rows are not here. They are the sidecar cosmology/coma-cluster-quoted.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'coma-cluster-quoted',
  version: '1.0.0',
  title:
    'The Coma cluster: the four values the Coma scenario and its virial instrument quote',
  object: {
    name: 'Coma cluster (Abell 1656)',
    identifiers: ['Abell 1656', 'Coma'],
    frame: 'a cluster at z = 0.023',
  },
  facility: {
    observatory: 'compiled from the literature',
    pipeline: 'js/darkMatterWidgets.js COMA, as the scenario quotes it',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'The values the Coma scenario quotes; the dispersion is compared with Colless & Dunn 1996, ApJ 458, 435',
  license: {
    status: 'cc-by-4.0',
    statement:
      "Gravitas's own record of the numbers its scenario quotes, licensed as its teaching material is (CC BY 4.0, LICENSES.md). The published values it is compared with are cited, not reproduced.",
    basis:
      'The four numbers are rounded facts a lesson uses; the pack records them, cites the one published value that was checked, and marks the rest as not sourced to a table here.',
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'sigma',
      name: 'line-of-sight velocity dispersion',
      unit: 'km/s',
      description:
        'as the scenario quotes it, rounded; Colless & Dunn 1996 print 1038 +- 60',
    },
    {
      id: 'radius',
      name: 'radius of the quoted virial mass',
      unit: 'Mpc',
      description: 'the radius the virial mass is usually quoted within',
    },
    {
      id: 'star_mass',
      name: 'mass in galaxies',
      unit: 'Msun',
      description: 'a round teaching value',
    },
    {
      id: 'gas_mass',
      name: 'mass in hot intracluster gas',
      unit: 'Msun',
      description: 'a round teaching value from X-ray observations',
    },
  ],
  masks: [],
  reductions: [
    'One row, four values, exactly as js/darkMatterWidgets.js quotes them (tests/cosmologyData.test.js holds the two to each other).',
    'The dispersion, 1000 km/s, sits inside Colless & Dunn 1996 (ApJ 458, 435), who print 1038 +- 60 km/s for the Coma cluster; the Prompt 90 gate measured 972.6 km/s from SDSS members, which missed the published value by more than its bar and is not used.',
    'Approximate, unsourced to a table in this repository: the radius (1.4 Mpc), the stellar mass (3e13 Msun) and the gas mass (1.2e14 Msun) are round teaching values. They are not given a citation they do not have.',
  ],
  citations: [
    {
      text: 'Colless & Dunn 1996, ApJ 458, 435 (Structure and dynamics of the Coma cluster), the published dispersion the quoted one is compared with',
      doi: '10.1086/176827',
    },
    {
      text: 'Zwicky 1933, Helvetica Physica Acta 6, 110 (the first virial argument for missing mass in Coma)',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'cosmology/coma-cluster-quoted.json',
  bytes: 308,
  sha256: 'f633db98a945bd3b769235078ba7510831a77f6af75a72a388692c1aea650ac0',
};
