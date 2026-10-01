// =============================================================================
// The NGC 3198 rotation curve "The Missing Mass" is fitted to: synthetic
// -----------------------------------------------------------------------------
// The one data pack of `origin: synthetic`, and a pack so that it can say so
// everywhere it is shown. These points are not a measurement. They are a model
// galaxy's rotation curve - a point-mass bulge, a Freeman exponential disc and
// a pseudo-isothermal halo (js/darkMatter.js galaxyCurveAt) - with an offset of
// a few km/s written out for each point and an error bar that grows outward.
// That is what gives the fitting exercise an exact answer.
//
// The model is built to resemble NGC 3198, the galaxy van Albada et al. (1985)
// made the textbook case of a flat rotation curve. What that paper gives and
// what this model uses, side by side (read in the article scan, 2026-10-01):
//
//   disc scale length   2.68 kpc (60 arcsec, H0 = 75)    2.6 kpc here
//   flat speed          146-157 km/s from 2 to 11 arcmin  150 km/s here
//   last point          30 kpc, 11 disc scale lengths    30 kpc here
//
// The bulge mass, the disc mass and the halo core radius are this model's own
// choices, not the paper's. No number here is a measurement of NGC 3198, and
// the manifest, the runtime copy and every panel that plots the points say so.
//
// A real published rotation curve (van Albada et al. 1985, table 2; or THINGS,
// de Blok et al. 2008) would be a second pack, of `origin: observed`, once its
// redistribution rights are confirmed. They are not, so there is none
// (DATA_PACKS.md).
// =============================================================================

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curveResidual, galaxyCurveAt } from '../../js/darkMatter.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** The tool version that wrote the pack; packs:check holds it to it. */
export const TRANSFORM_VERSION = '1.0.0';

/**
 * The generating model, in solar masses, kpc and km/s. The values the curve
 * has always been made from: js/darkMatterWidgets.js read them from a literal
 * of its own until Roadmap II Prompt 62.
 */
const PARAMETERS = {
  bulgeMass: 0.05e10,
  discMass: 3.3e10,
  discScale: 2.6,
  haloVFlat: 150,
  haloCore: 6,
};

/**
 * The scatter, written out rather than drawn at random: a random scatter would
 * give every student a different galaxy, and a fitting exercise needs a fixed
 * target. Errors grow outward, as they do in a real curve: the outer points
 * come from fainter gas over a longer integration. r in kpc; off and err in
 * km/s.
 */
const POINTS = [
  { r: 1, off: 2, err: 3 },
  { r: 2, off: -3, err: 3 },
  { r: 3, off: 1, err: 3 },
  { r: 4, off: 3, err: 3 },
  { r: 6, off: -2, err: 4 },
  { r: 8, off: 2, err: 4 },
  { r: 11, off: -3, err: 5 },
  { r: 14, off: 1, err: 5 },
  { r: 18, off: 2, err: 6 },
  { r: 22, off: -2, err: 6 },
  { r: 26, off: 1, err: 7 },
  { r: 30, off: -1, err: 7 },
];

/** Each DOI resolved through Crossref on 2026-10-01. */
const CITATIONS = [
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
];

async function prettierOptions() {
  try {
    return JSON.parse(
      await readFile(path.join(REPO, '.prettierrc.json'), 'utf8')
    );
  } catch {
    return {};
  }
}

/** The points as the instruments read them: r, v and err. */
export const curveOf = (parameters, points) =>
  points.map(p => ({
    r: p.r,
    v: galaxyCurveAt(p.r, parameters).total + p.off,
    err: p.err,
  }));

function build() {
  const meta = {
    id: 'ngc3198-synthetic-curve',
    version: '1.0.0',
    title: 'NGC 3198: a synthetic rotation curve',
    object: { name: 'NGC 3198', identifiers: ['NGC 3198'] },
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
      { name: 'radius', unit: 'kpc', description: 'from the center' },
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
      parameters: PARAMETERS,
      scatter:
        'fixed offsets of -3 to +3 km/s, written out one per point; error bars of 3 to 7 km/s growing outward',
      resembles:
        'NGC 3198 as van Albada et al. (1985) describe it: a 2.68 kpc disc scale length (2.6 here), a curve flat near 150 km/s, measured to 30 kpc',
      chosen:
        'the bulge mass, the disc mass and the halo core radius are this model’s own choices, not the paper’s',
    },
  };
  const manifestRest = {
    source: {
      archive: 'none: generated by Gravitas',
      urls: ['https://articles.adsabs.harvard.edu/pdf/1985ApJ...295..305V'],
      citations: CITATIONS,
      checked:
        'van Albada et al. (1985), read in the scan ADS serves (2026-10-01): the abstract’s rotation curve “that extends to 11 disk scale lengths” with its “last point … at 30 kpc”, the disc scale length of 60 arcsec = 2.68 kpc for H0 = 75, and table 2’s velocities of 146 to 157 km/s from 2 to 11 arcmin.',
    },
    raw: [],
    transformation: {
      script: 'tools/data-packs/ngc3198-synthetic.mjs',
      version: TRANSFORM_VERSION,
      options: {},
      steps: [
        'Evaluate the model’s circular speed (js/darkMatter.js galaxyCurveAt) at each radius.',
        'Add the written-out offset, and attach the written-out error bar.',
      ],
    },
    assumptions: [
      'These points are not a measurement of NGC 3198 or of any galaxy, and nothing that shows them may say they are.',
      'The model resembles NGC 3198 in its disc scale length, its flat speed and its extent, and in nothing else.',
    ],
    compatible: {
      widgets: ['dm-fit', 'dm-mond'],
      investigations: ['missing-mass'],
    },
    offline: 'core',
  };
  return {
    meta,
    manifestRest,
    render: async PACK => {
      const body = `// =============================================================================
// NGC 3198: a synthetic rotation curve
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/ngc3198-synthetic.mjs;
// \`npm run packs:check\` verifies it and \`npm run packs:data\` rewrites it.
//
// SYNTHETIC. NOT A MEASUREMENT. A model galaxy's rotation curve, built to
// resemble NGC 3198, with a fixed scatter written out so a fitting exercise
// has an exact answer. PACK.model says what made it; every panel that plots
// the points says they are synthetic. The record is the data pack's manifest,
// data-packs/ngc3198-synthetic-curve.json.
// =============================================================================

/** What the data is, and what made it, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/**
 * The scatter: at each radius (kpc), the offset added to the model's speed
 * and the error bar drawn on it (km/s). The curve is PACK.model.parameters
 * through js/darkMatter.js galaxyCurveAt, plus the offset.
 */
export const POINTS = ${JSON.stringify(POINTS, null, 2)};
`;
      return (await import('prettier')).format(body, {
        parser: 'babel',
        ...(await prettierOptions()),
      });
    },
  };
}

function check(mod) {
  const problems = [];
  if (mod.PACK?.origin !== 'synthetic') {
    problems.push('the runtime copy does not say the curve is synthetic');
  }
  if (!/not a measurement/i.test(mod.PACK?.credit || '')) {
    problems.push('the credit does not say it is not a measurement');
  }
  if (!mod.PACK?.model?.parameters || !mod.PACK?.model?.scatter) {
    problems.push('the runtime copy does not carry the generating model');
  }
  if (!Array.isArray(mod.POINTS) || mod.POINTS.length < 10) {
    problems.push('fewer than ten points');
  }
  for (const p of mod.POINTS || []) {
    if (!(p.r > 0 && p.err > 0 && Math.abs(p.off) <= p.err)) {
      problems.push(
        `the point at ${p.r} kpc has an offset outside its error bar`
      );
    }
  }
  return problems;
}

/**
 * The scientific check: the generating model fits its own points to within
 * their error bars, and the visible matter alone - the same disc with no halo
 * - cannot, which is the result the lesson is built on.
 */
function validate(mod) {
  const parameters = mod.PACK.model.parameters;
  const curve = curveOf(parameters, mod.POINTS);
  const withHalo = curveResidual(curve, parameters);
  const starsOnly = curveResidual(curve, { ...parameters, haloVFlat: 0 });
  const meanErr = curve.reduce((s, p) => s + p.err, 0) / curve.length;
  const result = {
    rmsWithHaloKms: Number(withHalo.rms.toFixed(2)),
    rmsStarsOnlyKms: Number(starsOnly.rms.toFixed(2)),
    meanErrorKms: Number(meanErr.toFixed(2)),
    lastRadiusKpc: curve.at(-1).r,
  };
  return {
    check:
      'the generating model fits the points to within their mean error bar, the same disc with no halo misses them by more than five error bars, and the curve reaches 30 kpc',
    against: [
      {
        quantity: 'last point of the curve',
        value: 30,
        unit: 'kpc',
        ref: 'van Albada et al. 1985, ApJ 295, 305, abstract',
      },
    ],
    result,
    ok:
      result.rmsWithHaloKms <= result.meanErrorKms &&
      result.rmsStarsOnlyKms > 5 * result.meanErrorKms &&
      result.lastRadiusKpc === 30,
  };
}

/** The pack, as tools/build-data-packs.mjs builds and checks it. */
export const NGC3198_SYNTHETIC = {
  id: 'ngc3198-synthetic-curve',
  label: 'The synthetic NGC 3198 curve',
  manifest: 'data-packs/ngc3198-synthetic-curve.json',
  capability: null,
  module: 'js/data/ngc3198Synthetic.js',
  transformVersion: TRANSFORM_VERSION,
  raw: [],
  build,
  decode: mod => mod,
  check,
  validate,
};
