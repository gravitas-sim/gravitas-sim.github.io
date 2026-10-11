// =============================================================================
// Cepheids in the LMC, NGC 4258 and M101: periods and Wesenheit magnitudes (Riess et al. 2022)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/variables.mjs) from shoes-r22-table2.tex;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/shoes-r22-cepheids.json.
//
// The rows are not here. They are the sidecar variables/shoes-r22-cepheids.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'shoes-r22-cepheids',
  version: '1.0.0',
  title:
    'Cepheids in the LMC, NGC 4258 and M101: periods and Wesenheit magnitudes (Riess et al. 2022)',
  object: {
    name: 'Cepheids of three galaxies',
    identifiers: ['LMC', 'NGC 4258', 'M101'],
    frame: 'HST WFC3 F160W, F555W, F814W',
  },
  facility: {
    observatory: 'HST WFC3 (SH0ES program)',
    pipeline:
      'Riess et al. 2022, ApJ 934, L7, Table 2 (as held by the SH0ES data release)',
  },
  dataType: 'catalog',
  origin: 'compilation',
  credit:
    'Riess et al. 2022, ApJ 934, L7 (CC BY 4.0); the table as the SH0ES data release holds it',
  license: {
    status: 'cc-by-4.0',
    statement:
      "The paper's publisher page and Crossref record say original content may be used under CC BY 4.0 (read 2026-10-10); the repository copy of the table has no licence of its own, so the pack relies on the paper's. Attribute Riess et al. 2022, ApJ 934, L7.",
    basis:
      'A published table from a CC BY 4.0 article, reduced to periods and Wesenheit magnitudes with the paper cited and credited; the same finding as the cosmology gate (COSMOLOGY_GATE.md, D-COSMO-07), made again here because the pack does not depend on that delegated verdict (D-LADDER-01).',
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'host',
      name: 'host',
      unit: '',
      description: 'which galaxy: 1 the LMC, 2 NGC 4258, 3 M101',
    },
    {
      id: 'period',
      name: 'period',
      unit: 'd',
      description: 'pulsation period',
    },
    {
      id: 'mw',
      name: 'Wesenheit magnitude',
      unit: 'mag',
      description:
        'm_W = F160W - 0.386 (F555W - F814W), the reddening-free magnitude of R22 eq. 7',
    },
  ],
  masks: [],
  reductions: [
    "All 339 LMC rows, every fourth NGC 4258 row (111) and every fourth M101 row (65), in the table's order.",
    "The Wesenheit magnitude is F160W - 0.386 (F555W - F814W) to 0.001 mag; coordinates, identifiers, the colour, the individual errors and the metallicity are not kept. The table's errors do not carry the covariance (the paper's own note), so the lessons fit the scatter about the relation instead.",
    "Periods are the table's digits (to 0.001 d); the LMC and the two hosts are HST-only measurements, so the LMC slope is not the paper's, which leans on ground data.",
  ],
  citations: [
    {
      text: 'Riess et al. 2022, ApJ 934, L7 (A comprehensive measurement of the local value of the Hubble constant)',
      doi: '10.3847/2041-8213/ac5c5b',
    },
    {
      text: 'Pietrzynski et al. 2019, Nature 567, 200 (the LMC distance from eclipsing binaries)',
      doi: '10.1038/s41586-019-0999-4',
    },
    {
      text: 'Reid, Pesce & Riess 2019, ApJ 886, L27 (the NGC 4258 maser distance)',
      doi: '10.3847/2041-8213/ab552d',
    },
    {
      text: 'Leavitt & Pickering 1912, Harvard College Observatory Circular 173',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'variables/shoes-r22-cepheids.json',
  bytes: 5710,
  sha256: '4a03f5ced66e43374da1f26462d89abc789bc84e256387b8e5fbc4e02673f642',
};
