// =============================================================================
// The Cardelli, Clayton & Mathis (1989) interstellar extinction law: coefficients
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (tools/data-packs/radiation.mjs) from ccm89-apj-345-245.pdf; `npm run packs:check` verifies
// it offline and `npm run packs:provenance` rebuilds it from the pinned raw
// products and compares byte for byte. The full record - sources, pins, every
// step, the checks it passed - is data-packs/radiation-extinction.json.
//
// LAW: the coefficients, read by js/kernels/radiation/extinction.js.
// The kernel (js/kernels/radiation/) does not import this module; a caller does,
// when it needs the data, and hands it in.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = {
  id: 'radiation-extinction',
  version: '1.0.0',
  title:
    'The Cardelli, Clayton & Mathis (1989) interstellar extinction law: coefficients',
  object: {
    name: 'interstellar extinction',
    identifiers: ['CCM89'],
  },
  facility: {
    observatory: 'compiled from the literature',
    pipeline: 'tools/data-packs/radiation.mjs 1.0.0',
  },
  dataType: 'model-grid',
  origin: 'compilation',
  credit: 'Cardelli, Clayton & Mathis 1989, ApJ 345, 245',
  license: {
    status: 'attribution-requested',
    statement:
      'The coefficients of a published analytic law (eqs. 2 to 4 of the paper), cited to it.',
    basis:
      'Thirty-odd numbers that define a mathematical relation; no table, text or figure of the paper is reproduced beyond the eight published values the validation compares against. The paper is in the NASA ADS scanned archive.',
  },
  retrieved: '2026-10-09',
  columns: [
    {
      name: 'law',
      unit: '',
      description:
        'the coefficients of A(lambda)/A(V) = a(x) + b(x)/R_V, x = 1/lambda in 1/um',
    },
  ],
  masks: [],
  reductions: [],
  citations: [
    {
      text: 'Cardelli, Clayton & Mathis 1989, ApJ 345, 245',
      doi: '10.1086/167900',
    },
    {
      text: "O'Donnell 1994, ApJ 422, 158 (a later revision of the optical coefficients, not used)",
      doi: '10.1086/173713',
    },
  ],
};

export const LAW = {
  law: 'Cardelli, Clayton & Mathis 1989, eqs. 1-4',
  xMin: 0.3,
  xMax: 8,
  xIrOptical: 1.1,
  xOpticalUv: 3.3,
  xFarUv: 5.9,
  ir: { a: 0.574, b: -0.527, power: 1.61 },
  optical: {
    y0: 1.82,
    a: [1, 0.17699, -0.50447, -0.02427, 0.72085, 0.01979, -0.7753, 0.32999],
    b: [0, 1.41338, 2.28305, 1.07233, -5.38434, -0.62251, 5.3026, -2.09002],
  },
  uv: {
    a0: 1.752,
    a1: -0.316,
    aPole: { x0: 4.67, w: 0.341, k: -0.104 },
    b0: -3.09,
    b1: 1.825,
    bPole: { x0: 4.62, w: 0.263, k: 1.206 },
  },
  farUv: { x0: 5.9, fa: [-0.04473, -0.009779], fb: [0.213, 0.1207] },
  defaultRv: 3.1,
};
