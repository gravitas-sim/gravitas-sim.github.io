// =============================================================================
// What a course may name that the builder cannot ask the page for cheaply
// -----------------------------------------------------------------------------
// Data, copied, and held to its sources by tests/coursePack.test.js:
//
// DATASETS    the observations the Observatory opens by name
//             (js/observatory/fixtures.js FIXTURES, /observatory/?open=<id>),
//             with their titles as the Observatory gives them
//             (js/i18n/*.observatory.js) and the status of their license as
//             the data says it (data-packs/*.json, or the fixture's own).
//             Importing the fixtures would fetch the data to read a title.
// GUIDED      the lessons with an instructor guide (js/data/instructorContent.js,
//             which is 480 KB of prose the builder has no other use for).
// =============================================================================

/** @type {ReadonlyArray<{id: string, kind: string, title: {en: string, es: string}, license: string}>} */
export const DATASETS = Object.freeze([
  {
    id: 'tess-light-curve',
    kind: 'time-series',
    title: {
      en: 'HD 209458: TESS light curve, sector 56',
      es: 'HD 209458: curva de luz de TESS, sector 56',
    },
    license: 'public-domain',
  },
  {
    id: 'sdss-a',
    kind: 'spectrum',
    title: { en: 'SDSS DR18: an A star', es: 'SDSS DR18: una estrella A' },
    license: 'public-domain',
  },
  {
    id: 'sdss-g',
    kind: 'spectrum',
    title: { en: 'SDSS DR18: a G star', es: 'SDSS DR18: una estrella G' },
    license: 'public-domain',
  },
  {
    id: 'sdss-k',
    kind: 'spectrum',
    title: { en: 'SDSS DR18: a K star', es: 'SDSS DR18: una estrella K' },
    license: 'public-domain',
  },
  {
    id: 'sdss-m',
    kind: 'spectrum',
    title: { en: 'SDSS DR18: an M star', es: 'SDSS DR18: una estrella M' },
    license: 'public-domain',
  },
  {
    id: 'gwosc-events',
    kind: 'table',
    title: {
      en: 'Five gravitational-wave events (GWOSC)',
      es: 'Cinco eventos de ondas gravitacionales (GWOSC)',
    },
    license: 'cc-by-4.0',
  },
  {
    id: 'tess-aperture',
    kind: 'image',
    title: {
      en: 'HD 209458: the TESS aperture mask',
      es: 'HD 209458: la máscara de apertura de TESS',
    },
    license: 'public-domain',
  },
  {
    id: 'ngc2420-photometry',
    kind: 'table',
    title: {
      en: 'NGC 2420: SDSS photometry (a cluster and its field)',
      es: 'NGC 2420: fotometría de SDSS (un cúmulo y su campo)',
    },
    license: 'public-domain',
  },
  {
    id: 'ngc2420-segue',
    kind: 'table',
    title: {
      en: 'NGC 2420: SEGUE stellar parameters (radial velocity, Teff, log g, [Fe/H])',
      es: 'NGC 2420: parámetros estelares de SEGUE (velocidad radial, Teff, log g, [Fe/H])',
    },
    license: 'public-domain',
  },
  {
    id: 'mist-isochrones',
    kind: 'table',
    title: {
      en: 'MIST isochrones in the SDSS bands (a model, not an observation)',
      es: 'Isócronas de MIST en las bandas de SDSS (un modelo, no una observación)',
    },
    license: 'no-license-stated',
  },
]);

/** Lessons with an instructor guide in the instructors' portal. */
export const GUIDED = Object.freeze([
  'a-universe-of-stars',
  'binary-star-planets',
  'black-holes',
  'butterfly-effect',
  'color-and-temperature',
  'design-the-schedule',
  'detect-this-planet',
  'goldilocks-question',
  'gravity-assist',
  'hohmann-transfer',
  'keplers-laws',
  'lagrange-points',
  'lines-and-motion',
  'listening-to-spacetime',
  'lives-of-stars',
  'missing-mass',
  'orbital-energy',
  'power-law-gravity',
  'radial-velocity',
  'retrograde-motion',
  'tides',
  'transit-photometry',
  'twelve-nights',
  'weighing-stars',
  'what-is-a-gravitational-wave',
  'when-orbits-lock',
]);
