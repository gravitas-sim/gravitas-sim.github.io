// =============================================================================
// Hubble's 1929 distances and velocities of 24 nebulae (Table 1)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/cosmology.mjs) from hubble-1929-table1.tsv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/hubble-1929-table1.json.
//
// The rows are not here. They are the sidecar cosmology/hubble-1929-table1.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'hubble-1929-table1',
  version: '1.0.0',
  title: "Hubble's 1929 distances and velocities of 24 nebulae (Table 1)",
  object: {
    name: 'Twenty-four extra-galactic nebulae',
    identifiers: [
      'S. Mag.',
      'L. Mag.',
      'N.G.C. 6822',
      'N.G.C. 598',
      'N.G.C. 221',
      'N.G.C. 224',
      'N.G.C. 5457',
      'N.G.C. 4736',
      'N.G.C. 5194',
      'N.G.C. 4449',
      'N.G.C. 4214',
      'N.G.C. 3031',
      'N.G.C. 3627',
      'N.G.C. 4826',
      'N.G.C. 5236',
      'N.G.C. 1068',
      'N.G.C. 5055',
      'N.G.C. 7331',
      'N.G.C. 4258',
      'N.G.C. 4151',
      'N.G.C. 4382',
      'N.G.C. 4472',
      'N.G.C. 4486',
      'N.G.C. 4649',
    ],
    frame: 'distances in Mpc (the paper: 10^6 pc), velocities in km/s',
  },
  facility: {
    observatory:
      'Mount Wilson (Hubble) and Lowell (Slipher) velocities, as compiled by the paper',
    pipeline: 'Hubble 1929, PNAS 15, 168, Table 1, typed from the page image',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'Hubble, E. 1929, PNAS 15, 168 (a United States work of 1929, public domain)',
  license: {
    status: 'public-domain',
    statement:
      'Published in the United States in 1929. The US Copyright Office (Circular 15A) says every work published in the United States before 1 January 1931 is in the public domain.',
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'r',
      name: 'distance',
      unit: 'Mpc',
      description: "the paper's r, in megaparsecs (its unit is 10^6 pc)",
    },
    {
      id: 'v',
      name: 'velocity',
      unit: 'km/s',
      description:
        "the paper's v, a radial velocity from the nebula's lines, km/s",
    },
    {
      id: 'mt',
      name: 'total visual magnitude',
      unit: 'mag',
      description: "the paper's m_t",
    },
  ],
  masks: [],
  reductions: [
    "All 24 rows of Table 1, typed from the page image (PMC522427; pnas01016-0007.png, sha256 cc3f720d...), in the paper's order. The nebulae's names are in object.identifiers, in row order.",
    "Checked against the paper's own printed absolute-magnitude column: M_t recomputed from m_t and r for every row. 21 rows agree within rounding; 3 (NGC 5457, 3031 and 4826) differ by 0.066 to 0.071 mag, which is the paper's arithmetic, not a typing error. The printed mean, -15.5, is reproduced as -15.483.",
    "The paper's m_s column (blank for nine rows) and its printed M_t are not kept. Distances, velocities and magnitudes keep the paper's digits.",
  ],
  citations: [
    {
      text: 'Hubble, E. 1929, PNAS 15, 168 (A relation between distance and radial velocity among extra-galactic nebulae)',
      doi: '10.1073/pnas.15.3.168',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'cosmology/hubble-1929-table1.json',
  bytes: 397,
  sha256: '8ef48344ee1784e4682d14c5cee174a58fa94f015c604831e21411a88a3c5184',
};
