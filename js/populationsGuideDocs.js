// =============================================================================
// Stars and their populations: the instructor documents
// -----------------------------------------------------------------------------
// Its instructor guide and answer key, laid out by js/guideDocs.js as every
// suite's are: what this module adds is only what no data structure holds,
// the teaching notes, the data inventory, the approximations and the
// introduction. tools/build-instructor-materials.js renders both.
// =============================================================================

import { suiteAnswerKey, suiteInstructorGuide } from './guideDocs.js';
import { ADOPTED, SUITE } from './observatory/guides/populations.js';
import { EN_GUIDES } from './i18n/en.guides.js';
import { EN_POPULATIONS } from './i18n/en.populations.js';

// What an instructor should know before a class runs each investigation.
const NOTES = {
  'pop-spectra': [
    'The four spectra are the ones the stellar investigations use (REAL_SPECTRA_EXPERIMENT.md), whose classroom criterion has not yet been run with students: treat this investigation as a first use, not a tested one.',
    'Equivalent width is the idea most students find hardest: a strength that does not depend on how bright the star is. The rank step’s wrong answer about distance is the place to discuss it.',
    'The A star’s gravity and metallicity are the pipeline’s nearest ELODIE template’s, not a measurement of this star. The guide says so, and the conclusion it draws, a star more luminous than its type suggests and most probably of the halo, is stated as probable.',
  ],
  'pop-cmd': [
    'The core hole is the investigation’s point, not a flaw in the data: SDSS’s standard photometry does not measure crowded fields, and the pack’s details say so. Ask students what other surveys would miss, and why.',
    'The field fraction assumes the field is the same in both rings. A student who notices that the cluster’s own outskirts may reach the outer ring has found why it is an estimate.',
    'Students often expect a color–magnitude diagram to be a clean sequence. The field-dominated diagram they make is the realistic starting point for membership in the next investigation.',
  ],
  'pop-members': [
    'The velocity window is the student’s choice, and the check accepts a range of ends: compare the member counts different students get, and what each window lets in.',
    'The field estimate from the neighboring windows is an upper estimate, since the cluster’s own velocity errors spill into them. A class can discuss what a better estimate needs: a model of the field’s velocities, or proper motions.',
    'The three metallicities disagree by more than their stated errors. That is the point of the step: calibration and method, not noise, dominate. The next investigation uses the disagreement.',
  ],
  'pop-age': [
    'The comparison is not a fit and gives no standard errors; the tool says so. Its statistic depends on the scales and cap chosen, which the panel exposes: a class can change them and watch the result move, or not.',
    'The age–metallicity–reddening trade-off is the investigation’s core. Students who ask which answer is right have asked the right question; the published values span the same range for the same reasons.',
    'The isochrones are a model and are labeled as one throughout: an age is always MIST’s age for what was assumed. A comparison with another model (the literature’s PARSEC-based age) is on the last step.',
  ],
  'pop-variable': [
    'SU Dra’s light curve installs from the catalog on first use (about 13 KB). Everything else in the suite is built in.',
    'The standard-candle distance uses only adopted numbers; the light curve’s role is to identify the kind of star. Say so plainly: it is how the method works in practice.',
    'The parallax agreement is not independent, since SU Dra was one of the five stars that set the relation’s zero point. The guide says so; a class can look for an RR Lyrae star that was not.',
    'The harmonic step reuses HD 209458 from the exoplanet suite. It is a good bridge back: the box search there looked for the right shape of signal.',
  ],
};

/** What the guides report that is still an educational approximation. */
export const APPROXIMATIONS = [
  'The spectra’s line and band measurements take their errors from the scatter in their windows, as the spectra carry no per-sample errors; they assume white noise.',
  'The spectral parameters shown for the four stars are the SDSS pipeline’s nearest ELODIE template, not a measurement of each star.',
  'The field fraction and the field stars in the velocity window assume a field that does not change across the rings or the window.',
  'Membership is chosen by velocity alone, with a window the student sets; no proper motions or parallaxes are used, because Gaia’s catalog is not licensed for redistribution with Gravitas (STELLAR_POPULATIONS.md).',
  'The isochrone comparison is a distance statistic, not a likelihood: it gives no standard errors, and its scales, cap and grid are choices it states. It adopts one extinction law (A_g / E(g − r) = 3.245, Schlafly & Finkbeiner 2011) and one model (MIST v1.2, non-rotating).',
  'The isochrones are MIST’s, at three metallicities and seven ages; an age at the edge of that grid is a limit, not a value.',
  'The RR Lyrae distance uses an adopted relation calibrated on five stars, SU Dra among them, and adopted values of its mean magnitude, extinction and metallicity.',
];

/** The data the guides use, and on what terms. */
export const DATASETS = [
  {
    name: 'Four stellar spectra (A, G, K, M), SDSS DR18',
    source: 'SDSS; built into Gravitas (js/data/spectra/sdssSpectra.js)',
    license: 'Public domain (SDSS); acknowledged in NOTICE',
  },
  {
    name: 'NGC 2420, SDSS DR18 photometry within 14.14 arcmin (2301 stars)',
    source:
      'SDSS SkyServer, pinned queries; built in as sdss-dr18-ngc2420-photometry 1.0.0',
    license: 'Public domain (SDSS); acknowledged in NOTICE',
  },
  {
    name: 'NGC 2420, SEGUE stellar parameters (517 spectra)',
    source:
      'SDSS SkyServer, pinned queries; built in as sdss-dr18-ngc2420-segue 1.0.0',
    license: 'Public domain (SDSS); acknowledged in NOTICE',
  },
  {
    name: 'MIST v1.2 isochrones in SDSS ugriz, three metallicities, seven ages',
    source:
      'MIST (Dotter 2016; Choi et al. 2016), the pinned SDSSugriz archive; built in as mist-sdss-isochrones 1.0.0',
    license:
      'No license stated by MIST; redistributed as a thinned subset with citation (DATA_PACKS.md gives the basis)',
  },
  {
    name: 'SU Draconis, TESS sector 15 light curve (TIC 142848794)',
    source:
      'MAST; the catalog extension community.su-dra-tess-s15 1.0.0, installed on first use',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'HD 209458, TESS sector 56 light curve',
    source: 'MAST; built in as tess-hd209458-s56-lc 1.0.0',
    license: 'Public domain (NASA mission data)',
  },
  {
    name: 'Adopted values: the cluster’s center and published properties, the dust map, SU Dra’s magnitude, metallicity, parallax and the RR Lyrae relation',
    source: [
      ADOPTED.ngc2420.ref,
      ADOPTED.lee2008.ref,
      ADOPTED.apogee.ref,
      ADOPTED.dustMap.ref,
      ADOPTED.suDra.ref,
    ].join('; '),
    license: 'Cited, not redistributed: numbers from the literature',
  },
];

/** Everything js/guideDocs.js lays out for this suite. */
export const DOCS = {
  messages: { ...EN_GUIDES, ...EN_POPULATIONS },
  name: 'Stellar Populations',
  title: 'Stars and their populations: spectra, clusters and variables',
  subtitle: `${SUITE.GUIDES.length} guided investigations  |  real SDSS, SEGUE and TESS data with MIST models  |  introductory and advanced paths`,
  intro: [
    'Five investigations, done in the Observatory (/observatory/) with real observations and the page’s own tools: the line and band tools on spectra, new columns, crops, filters and column summaries on tables, the isochrone comparison, the period search and the fold. They go from spectral features and classification, through a cluster’s color–magnitude diagram, membership and selection effects, to ages and distances from models, and a variable star. Each step is checked against the student’s own workspace or a number computed from the data on screen; values from the literature are named as adopted, with their sources. Each takes one class period on the introductory path.',
    'The suite is built to show where the data stop: the survey’s crowded core and saturated giants, a velocity cut that lets field stars in, three methods that disagree on a metallicity, and an age that moves with every assumption. The isochrones are a model throughout.',
  ],
  dataNote:
    'SU Draconis’s light curve is not built in: the first step that opens it installs it from the Gravitas catalog into the browser, where it stays for offline use. Everything else, the Observatory and the guides included, is precached by the service worker.',
  notes: NOTES,
  datasets: DATASETS,
  approximations: APPROXIMATIONS,
  keyTool: 'tools/populations-reference.mjs',
};

/** The instructor guide, with the curriculum map and assignment sheets. */
export const populationsInstructorGuide = ({ version = '' } = {}) =>
  suiteInstructorGuide(SUITE, DOCS, { version });

/** The answer key, from js/data/populationsAnswerKey.js. */
export const populationsAnswerKey = (rows, { version = '' } = {}) =>
  suiteAnswerKey(SUITE, rows, DOCS, { version });
