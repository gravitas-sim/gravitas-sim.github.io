// =============================================================================
// Bolometric corrections BC_V(Teff): Flower (1996) with the coefficients Torres (2010) corrected
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/radiation.mjs) from torres10-arxiv-1008.3913.pdf; `npm run packs:check` verifies
// it offline and `npm run packs:provenance` rebuilds it from the pinned raw
// products and compares byte for byte. The full record - sources, pins, every
// step, the checks it passed - is data-packs/radiation-bolometric.json.
//
// LAW: BC_V(Teff) polynomials, read by js/kernels/radiation/magnitudes.js.
// The kernel (js/kernels/radiation/) does not import this module; a caller does,
// when it needs the data, and hands it in.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'radiation-bolometric',
  version: '1.0.0',
  title:
    'Bolometric corrections BC_V(Teff): Flower (1996) with the coefficients Torres (2010) corrected',
  object: {
    name: 'stellar bolometric corrections',
    identifiers: ['Flower 1996', 'Torres 2010'],
  },
  facility: {
    observatory: 'compiled from the literature',
    pipeline: 'tools/data-packs/radiation.mjs 1.0.0',
  },
  dataType: 'model-grid',
  origin: 'compilation',
  credit: 'Torres 2010, AJ 140, 1158 (Table 1); Flower 1996, ApJ 469, 355',
  license: {
    status: 'attribution-requested',
    statement:
      'The 13 coefficients of a published polynomial, cited to the paper that corrected them.',
    basis:
      'Thirteen numbers defining a relation, from an open arXiv preprint; no table or text of the paper is reproduced.',
  },
  retrieved: '2026-10-09',
  columns: [
    {
      name: 'law',
      unit: '',
      description:
        'BC_V in mag as a polynomial in log10 of Teff in K, in three ranges',
    },
  ],
  masks: [],
  reductions: [],
  citations: [
    {
      text: 'Torres 2010, AJ 140, 1158: On the use of empirical bolometric corrections for stars',
      doi: '10.1088/0004-6256/140/5/1158',
    },
    {
      text: 'Flower 1996, ApJ 469, 355: Transformations from theoretical Hertzsprung-Russell diagrams to color-magnitude diagrams',
      doi: '10.1086/177785',
    },
  ],
};

export const LAW = {
  law: 'Flower 1996 BC_V(log Teff), coefficients as corrected by Torres 2010, Table 1',
  logTeffMin: 3.5440680443502757,
  logTeffMax: 4.6020599913279625,
  segments: [
    {
      from: 0,
      to: 3.7,
      a: [
        -19053.7291496456, 15514.4866764412, -4212.78819301717,
        381.476328422343,
      ],
    },
    {
      from: 3.7,
      to: 3.9,
      a: [
        -37051.0203809015, 38567.2629965804, -15065.1486316025,
        2617.24637119416, -170.623810323864,
      ],
    },
    {
      from: 3.9,
      to: 9,
      a: [
        -118115.450538963, 137145.973583929, -63623.3812100225,
        14741.2923562646, -1705.87278406872, 78.873172180499,
      ],
    },
  ],
  solar: {
    teffK: 5777,
    bcV: -0.08,
    vSun: -26.76,
    note: 'BC_V,sun = -0.080 on the Flower scale, V_sun = -26.76 (Torres 2010, section 3)',
  },
  reliableAboveK: 4000,
};
