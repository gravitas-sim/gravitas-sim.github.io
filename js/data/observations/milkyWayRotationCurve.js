// =============================================================================
// The Milky Way's rotation curve (Bhattacharjee, Chaudhury and Kundu 2014)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/gaia-dynamics.mjs) from bhattacharjee-2014-table2.csv;
// `npm run packs:check` verifies it offline and `npm run packs:provenance`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is data-packs/milky-way-rotation-curve.json.
//
// The rows are not here. They are the sidecar gaia/milky-way-rotation-curve.json, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'milky-way-rotation-curve',
  version: '1.0.0',
  title:
    "The Milky Way's rotation curve (Bhattacharjee, Chaudhury and Kundu 2014)",
  object: {
    name: 'the Milky Way',
    identifiers: ['the Galaxy'],
    frame: 'Galactocentric, for three assumed pairs of R0 and V0',
  },
  facility: {
    observatory: 'compilation of published tracer surveys',
    pipeline:
      'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2 (CDS J/ApJ/785/63)',
  },
  dataType: 'rotation-curve',
  origin: 'compilation',
  credit:
    'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, through CDS VizieR J/ApJ/785/63',
  license: {
    status: 'no-license-stated',
    statement:
      "The data table of a published paper (Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2) as the CDS distributes it (J/ApJ/785/63/table2, read 2026-10-10). The CDS record and the paper's machine-readable table state no licence; the table is reproduced whole, with the paper cited and credited.",
    basis:
      "A published scientific data table, reproduced in full with citation and credit as scientific practice and the CDS's own acknowledgement policy expect, for education; the same basis as the other credited tables (D-SKY-02 is the same class of decision). 151 numbers, none of them the authors' code or text.",
  },
  retrieved: '2026-10-10',
  columns: [
    {
      id: 'r0',
      name: 'Sun distance assumed',
      unit: 'kpc',
      description:
        "the Sun's distance from the Galactic center the curve was computed with (R0)",
    },
    {
      id: 'v0',
      name: 'Sun speed assumed',
      unit: 'km/s',
      description: "the Sun's circular speed the curve was computed with (V0)",
    },
    {
      id: 'r',
      name: 'galactocentric radius',
      unit: 'kpc',
      description: 'distance from the Galactic center (r)',
    },
    {
      id: 'vc',
      name: 'circular speed',
      unit: 'km/s',
      description: 'circular speed (Vc), for the R0 and V0 of its row',
    },
    {
      id: 'vc_err',
      name: 'circular speed error',
      unit: 'km/s',
      uncertaintyOf: 'circular speed',
      description: 'its one-sigma error (e_Vc)',
    },
    {
      id: 'region',
      name: 'region',
      unit: '',
      description:
        'which tracers the point combines: 1 disk tracers (r below 25 kpc), 2 halo tracers (r of 25 kpc or more)',
    },
  ],
  masks: [],
  reductions: [
    "All 151 points of the paper's Table 2, unchanged, in its three sets: R0 = 8.3 kpc with V0 = 244 km/s, R0 = 8.0 with V0 = 200 (the Sofue 2012 set) and R0 = 8.5 with V0 = 220 (the IAU 1985 values). 57 points have r below 25 kpc and 94 beyond. Radii and speeds are rounded to 0.01.",
    'The "region" column is the one attribution the paper\'s table supports. Each disk-region point (r < 25 kpc) is the weighted average, in a radius bin, of the circular speeds from all of the paper\'s disk tracer samples; each halo-region point is the weighted average of its three non-disk samples in a 2 kpc bin. The table does not say which sample dominates a bin, so a point is cited by region, listing every sample that region combines, and no point is claimed for a single paper beyond that.',
    "The curve depends on the Sun's distance and circular speed assumed, R0 and V0; the same data give a different curve for another pair (the paper tabulates three). The pack carries the one the CDS holds, and its R0 and V0 are in the title and the frame.",
    "The paper also derives these speeds under an assumption about the halo tracers' velocity anisotropy (beta = 0 for this set), which is a model assumption inside the outer points.",
  ],
  citations: [
    {
      text: 'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63 (Rotation curve of the Milky Way out to ~200 kpc)',
      doi: '10.1088/0004-637X/785/1/63',
    },
    {
      text: 'Sofue 2012, PASJ 64, 75 (Grand rotation curve and dark-matter halo in the Milky Way Galaxy), the R0 = 8.0 kpc, V0 = 200 km/s set',
      doi: '10.1093/pasj/64.4.75',
    },
    {
      text: 'Disk tracers: HI regions, tangent points: Westerhout 1976 (Maryland-Bonn survey); Burton & Gordon 1978, A&A 63, 7',
    },
    {
      text: 'Disk tracers: CO clouds, tangent points: Burton & Gordon 1978, A&A 63, 7; Clemens 1985, ApJ 295, 422',
    },
    {
      text: 'Disk tracers: HI regions, tangent points: Fich, Blitz & Stark 1989, ApJ 342, 272',
    },
    {
      text: 'Disk tracers: HII regions: Fich, Blitz & Stark 1989, ApJ 342, 272',
    },
    {
      text: 'Disk tracers: HII regions and reflection nebulae: Brand & Blitz 1993, A&A 275, 67',
    },
    {
      text: 'Disk tracers: Cepheids: Pont, Mayor & Burki 1994, A&A 285, 415',
    },
    {
      text: 'Disk tracers: Planetary nebulae: Maciel & Lago 2005, RMxAA 41, 383; Maciel 1984, A&AS 55, 253; Durand, Acker & Zijlstra 1998, A&AS 132, 13',
    },
    {
      text: 'Halo tracers: Blue horizontal-branch stars, SDSS DR8: Xue et al. 2011, ApJ 738, 79',
    },
    {
      text: 'Halo tracers: K giants, SDSS DR9: Xue et al. 2012 (arXiv:1211.0549)',
    },
    {
      text: 'Halo tracers: Globular clusters (Harris 1996, 2010), field blue horizontal-branch stars (Clewley et al. 2004) and dwarf spheroidals (McConnachie 2012)',
    },
  ],
};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = {
  file: 'gaia/milky-way-rotation-curve.json',
  bytes: 2784,
  sha256: 'ede56476e42e620df6093e0fe3889d31f8b6624c983b0685429cf9db73abc379',
};
