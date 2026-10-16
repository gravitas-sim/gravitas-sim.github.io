// =============================================================================
// NGC 3198: a synthetic rotation curve
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/ngc3198-synthetic.mjs;
// `npm run packs:check` verifies it and `npm run packs:data` rewrites it.
//
// SYNTHETIC. NOT A MEASUREMENT. A model galaxy's rotation curve, built to
// resemble NGC 3198, with a fixed scatter written out so a fitting exercise
// has an exact answer. PACK.model says what made it; every panel that plots
// the points says they are synthetic. The record is the data pack's manifest,
// data-packs/ngc3198-synthetic-curve.json.
// =============================================================================

/** What the data is, and what made it, as an interface shows it. */
export const PACK = {
  id: 'ngc3198-synthetic-curve',
  version: '1.0.0',
  title: 'NGC 3198: a synthetic rotation curve',
  object: {
    name: 'NGC 3198',
    identifiers: ['NGC 3198'],
  },
  facility: {
    observatory: 'none: synthetic, made by Gravitas',
    pipeline: 'js/darkMatter.js galaxyCurveAt, with written-out scatter',
  },
  dataType: 'rotation-curve',
  origin: 'synthetic',
  credit:
    'Synthetic: built by Gravitas to resemble NGC 3198 (van Albada et al. 1985). Not a measurement.',
  license: {
    status: 'cc-by-4.0',
    statement:
      'Gravitas’s own synthetic data, licensed as its teaching material is (CC BY 4.0, LICENSES.md).',
  },
  retrieved: '2026-10-01',
  columns: [
    {
      name: 'radius',
      unit: 'kpc',
      description: 'from the center',
    },
    {
      name: 'circular speed',
      unit: 'km/s',
      description: 'the model’s, plus the written-out offset',
    },
    {
      name: 'speed error',
      unit: 'km/s',
      uncertaintyOf: 'circular speed',
      description: 'one sigma, chosen: it grows outward as a real one does',
    },
  ],
  masks: [],
  reductions: [],
  model: {
    name: 'bulge + Freeman exponential disc + pseudo-isothermal halo (js/darkMatter.js galaxyCurveAt)',
    parameters: {
      bulgeMass: 500000000,
      discMass: 33000000000,
      discScale: 2.6,
      haloVFlat: 150,
      haloCore: 6,
    },
    scatter:
      'fixed offsets of -3 to +3 km/s, written out one per point; error bars of 3 to 7 km/s growing outward',
    resembles:
      'NGC 3198 as van Albada et al. (1985) describe it: a 2.68 kpc disc scale length (2.6 here), a curve flat near 150 km/s, measured to 30 kpc',
    chosen:
      'the bulge mass, the disc mass and the halo core radius are this model’s own choices, not the paper’s',
  },
  citations: [
    {
      text: 'van Albada, Bahcall, Begeman & Sancisi 1985, ApJ 295, 305 (the galaxy the model is built to resemble)',
      doi: '10.1086/163375',
    },
    {
      text: 'Freeman 1970, ApJ 160, 811 (the exponential disc)',
      doi: '10.1086/150474',
    },
    {
      text: 'de Blok et al. 2008, AJ 136, 2648 (THINGS: a published NGC 3198 curve, not used here)',
      doi: '10.1088/0004-6256/136/6/2648',
    },
  ],
};

/**
 * The scatter: at each radius (kpc), the offset added to the model's speed
 * and the error bar drawn on it (km/s). The curve is PACK.model.parameters
 * through js/darkMatter.js galaxyCurveAt, plus the offset.
 */
export const POINTS = [
  {
    r: 1,
    off: 2,
    err: 3,
  },
  {
    r: 2,
    off: -3,
    err: 3,
  },
  {
    r: 3,
    off: 1,
    err: 3,
  },
  {
    r: 4,
    off: 3,
    err: 3,
  },
  {
    r: 6,
    off: -2,
    err: 4,
  },
  {
    r: 8,
    off: 2,
    err: 4,
  },
  {
    r: 11,
    off: -3,
    err: 5,
  },
  {
    r: 14,
    off: 1,
    err: 5,
  },
  {
    r: 18,
    off: 2,
    err: 6,
  },
  {
    r: 22,
    off: -2,
    err: 6,
  },
  {
    r: 26,
    off: 1,
    err: 7,
  },
  {
    r: 30,
    off: -1,
    err: 7,
  },
];
