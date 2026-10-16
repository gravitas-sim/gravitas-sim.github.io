// =============================================================================
// The Exoplanet Observatory's instructor documents
// -----------------------------------------------------------------------------
// Its instructor guide and answer key, laid out by js/guideDocs.js as every
// suite's are: what this module adds is only what no data structure holds,
// the teaching notes, the data inventory, the approximations and the
// introduction. tools/build-instructor-materials.js renders both.
// =============================================================================

import { suiteAnswerKey, suiteInstructorGuide } from './guideDocs.js';
import { ADOPTED, SUITE } from './observatory/guides/exoplanet.js';
import { EN_GUIDES } from './i18n/en.guides.js';
import { EN_EXOPLANET } from './i18n/en.exoplanet.js';

// What an instructor should know before a class runs each investigation.
const NOTES = {
  'exo-star': [
    'Students tend to read a light curve as the star’s light alone. The QUALITY count and the aperture are the two places the record says otherwise; ask what else could be in those 23 pixels.',
    'The share of light from two magnitudes is often a student’s first use of magnitudes as a ratio. Expect the sign of the exponent to go wrong, and a ratio of the two stars’ light given instead of A’s share of both.',
    'CROWDSAP is the pipeline’s model of the aperture, from the catalog and a model of how each star’s light spreads, not a measurement from this light curve. The guide treats it as adopted and says so.',
  ],
  'exo-find': [
    'The box search’s default range starts at about a day; a shorter period would be missed. Ask what range students would choose, and what a range that is too narrow would hide.',
    'One sector holds about eight transits, which pins the period to about a minute: that, not a mistake, is why the search differs from the long-baseline literature value.',
    'Folding is a change to the view, recorded and undoable; later measurements say which view they were made on.',
  ],
  'exo-fit': [
    'The fit is weighted least squares with the pipeline’s errors. It then offers three uncertainties: as given, scaled by the reduced chi-square, and with the correlated-noise factor beta. Discuss which to quote and why; the guide asks for beta on the advanced path.',
    'The correlation of b with a/R* is geometry, not a flaw of the fit: the light curve fixes the transit’s length and shape, not the orbit’s size and tilt separately.',
    'Rp is proportional to the adopted stellar radius. The two published radii differ by 3 percent, more than the fit’s own uncertainty on k: a good place to ask which uncertainty dominates a result.',
  ],
  'exo-dilution': [
    'The central idea is one line: light that is not the host’s fills the transit in by its share, so a depth shrinks by the host’s share and k by its square root.',
    'Neither SAP nor PDCSAP flux is the truth. PDCSAP’s correction assumes the catalog, the pipeline’s model of each star’s light and the host; SAP assumes nothing and so is diluted.',
    'The light curve cannot say which star is the host. Ask students what observation could: separating the two stars in an image, taking each star’s spectrum, or watching where the light comes from during a transit are all reasonable proposals.',
  ],
  'exo-planet': [
    'Passing the odd/even and secondary tests does not prove a planet; it removes two ways an eclipsing binary would give itself away. The blend limit on the advanced path removes the cataloged neighbors, and says what it cannot remove.',
    'The mass needs radial velocities, which no Gravitas pack holds for a transiting star; the radial-velocity investigation works with a simulated survey. As an extension, a class can combine the fitted radius with Stassun et al. (2017)’s mass, 0.73 +/- 0.04 Jupiter masses, labeled as adopted, for a density of about 0.36 g/cm3.',
    'The simulation step compares a built world with a measurement: the simulation uses rounded published values, and the two need not agree to the last digit.',
  ],
};

/** What the guides report that is still an educational approximation. */
export const APPROXIMATIONS = [
  'The depths in the computed panels are means over the middle half of the transit against the light well away from it: honest and reproducible, but not a model depth, and limb darkening makes them deeper than k squared.',
  'The planet’s ratio were it to orbit B ignores limb darkening and takes all the light that is not A’s to be B’s, which is the most B could have: it is the smallest ratio B’s planet could have, not an estimate of it.',
  'CROWDSAP is SPOC’s model of the aperture, and the TESS Input Catalog magnitudes are catalog values: both are adopted, not measured here.',
  'The transit model assumes a circular orbit and quadratic limb darkening, and holds the dilution fixed at the value given; a light curve alone cannot tell dilution from a smaller planet.',
  'The stellar radii are adopted from the literature; nothing in the guides tests them.',
  'The odd/even and secondary tests use three standard errors as their threshold, with uncertainties that include correlated noise measured from the out-of-transit light. A different threshold or noise model can change a marginal case.',
  'One sector’s period is known to about a minute, and the fit’s formal period uncertainty is smaller than its real one (INFERENCE_CORE.md measures by how much).',
  'The simulation’s HD 209458 is built from rounded published values.',
  'No radial velocities of a transiting star ship with Gravitas, so the guides teach the transit-only limit: no mass and no density is measured.',
];

/** The data the guides use, and on what terms. */
export const DATASETS = [
  {
    name: 'HD 209458, TESS sector 56 light curve (SPOC, 20-minute bins)',
    source: 'MAST; built into Gravitas as tess-hd209458-s56-lc 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'HD 209458, TESS sector 56 aperture image',
    source: 'MAST; built in as tess-hd209458-s56-aperture 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Kepler-13, TESS sector 14 light curve, SAP flux (TIC 158324245)',
    source:
      'MAST; the catalog extension community.kepler-13-tess-s14-sap 1.0.0, installed on first use',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Kepler-13, TESS sector 14 light curve, PDCSAP flux',
    source:
      'MAST; the catalog extension community.kepler-13-tess-s14-pdcsap 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Adopted values: periods, stellar radii, catalog magnitudes, published radii',
    source: [
      ADOPTED.hd209458.stellarRadius.ref,
      ADOPTED.hd209458.stellarRadiusTorres.ref,
      ADOPTED.kepler13.stellarRadius.ref,
      'TESS Input Catalog v8',
      'NASA Exoplanet Archive (retrieved 2026-09-26)',
    ].join('; '),
    license: 'Cited, not redistributed: numbers from the literature',
  },
];

/** Everything js/guideDocs.js lays out for this suite. */
export const DOCS = {
  messages: { ...EN_GUIDES, ...EN_EXOPLANET },
  name: 'Exoplanet Observatory',
  title: 'The Exoplanet Observatory: from photons to a planet',
  subtitle: `${SUITE.GUIDES.length} guided investigations  |  real TESS light curves  |  introductory and advanced paths`,
  intro: [
    'Five investigations, done in the Observatory (/observatory/) with real TESS light curves and the page’s own tools: the aperture tool, the box search, the fold and the transit fit. Each step is checked against the student’s own workspace or against a number computed from the data on screen; the few values taken from the literature are named as adopted, with their sources. They are meant to be done in order, and each takes one class period on the introductory path.',
  ],
  dataNote:
    'The Kepler-13 light curves are not built in: the first step that opens one installs it from the Gravitas catalog into the browser (about 9 KB each), where it stays for offline use. Everything else, the Observatory and the guides included, is precached by the service worker, so a class that has opened the guides once can work offline.',
  notes: NOTES,
  datasets: DATASETS,
  approximations: APPROXIMATIONS,
  keyTool: 'tools/exoplanet-reference.mjs',
};

/** The instructor guide, with the curriculum map and assignment sheets. */
export const exoplanetInstructorGuide = ({ version = '' } = {}) =>
  suiteInstructorGuide(SUITE, DOCS, { version });

/** The answer key, from js/data/exoplanetAnswerKey.js. */
export const exoplanetAnswerKey = (rows, { version = '' } = {}) =>
  suiteAnswerKey(SUITE, rows, DOCS, { version });
