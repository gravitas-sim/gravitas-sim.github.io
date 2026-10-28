// =============================================================================
// Lesson discovery metadata - GENERATED, do not edit
// -----------------------------------------------------------------------------
// Written by tools/build-investigation-manifest.js from the lesson files in
// this directory. Run `npm run manifest` after changing a lesson's audience,
// mathematics or prerequisites.
//
// For the views that choose lessons for a course, not for the lesson browser:
// browseData.js is read at start by every lesson and by the teaching page, and
// this is read by neither, so it costs them nothing until something needs it.
//
//   audience       who it is written for. `level` stays the words a card prints.
//   mathematics    what the student is asked to do: logarithms if they read or
//                  plot a logarithmic axis, algebra if a step asks for a number
//                  they must work out, arithmetic if they record measurements
//                  and the lesson works out the rest, none otherwise.
//   prerequisites  lesson ids, including every `needs` in sequences.js.
//   textbook       the OpenStax Astronomy 2e chapter, and section when one fits.
//   courseLevel    the course it suits: survey, majors or upper.
// =============================================================================

export const DISCOVERY = {
  'keplers-laws': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 3,
      section: '3.1',
    },
    courseLevel: 'survey',
  },
  'retrograde-motion': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 3,
      section: '3.1',
    },
    courseLevel: 'survey',
  },
  'transit-photometry': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 21,
      section: '21.4',
    },
    courseLevel: 'survey',
  },
  'orbital-energy': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['keplers-laws'],
    textbook: {
      chapter: 3,
      section: '3.5',
    },
    courseLevel: 'survey',
  },
  'weighing-stars': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 18,
      section: '18.2',
    },
    courseLevel: 'survey',
  },
  'black-holes': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 24,
      section: '24.5',
    },
    courseLevel: 'survey',
  },
  'radial-velocity': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry'],
    textbook: {
      chapter: 21,
      section: '21.4',
    },
    courseLevel: 'majors',
  },
  'goldilocks-question': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry'],
    textbook: {
      chapter: 30,
      section: null,
    },
    courseLevel: 'survey',
  },
  'missing-mass': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 28,
      section: '28.4',
    },
    courseLevel: 'survey',
  },
  tides: {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 4,
      section: '4.6',
    },
    courseLevel: 'survey',
  },
  'butterfly-effect': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lagrange-points'],
    textbook: {
      chapter: 3,
      section: '3.6',
    },
    courseLevel: 'majors',
  },
  'when-orbits-lock': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 12,
      section: null,
    },
    courseLevel: 'survey',
  },
  'detect-this-planet': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry', 'radial-velocity'],
    textbook: {
      chapter: 21,
      section: '21.4',
    },
    courseLevel: 'majors',
  },
  'design-the-schedule': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['radial-velocity', 'detect-this-planet'],
    textbook: {
      chapter: 21,
      section: '21.4',
    },
    courseLevel: 'majors',
  },
  'binary-star-planets': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['butterfly-effect'],
    textbook: {
      chapter: 21,
      section: '21.5',
    },
    courseLevel: 'majors',
  },
  'gravity-assist': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['orbital-energy'],
    textbook: {
      chapter: 3,
      section: '3.5',
    },
    courseLevel: 'majors',
  },
  'hohmann-transfer': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['orbital-energy'],
    textbook: {
      chapter: 3,
      section: '3.5',
    },
    courseLevel: 'majors',
  },
  'lagrange-points': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['hohmann-transfer', 'when-orbits-lock'],
    textbook: {
      chapter: 3,
      section: '3.6',
    },
    courseLevel: 'majors',
  },
  'what-is-a-gravitational-wave': {
    audience: 'beginner',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 24,
      section: '24.7',
    },
    courseLevel: 'survey',
  },
  'listening-to-spacetime': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['what-is-a-gravitational-wave'],
    textbook: {
      chapter: 24,
      section: '24.7',
    },
    courseLevel: 'majors',
  },
  'a-universe-of-stars': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 18,
      section: '18.1',
    },
    courseLevel: 'survey',
  },
  'lives-of-stars': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 22,
      section: '22.1',
    },
    courseLevel: 'survey',
  },
  'twelve-nights': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 4,
      section: '4.3',
    },
    courseLevel: 'majors',
  },
  'power-law-gravity': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 3,
      section: '3.3',
    },
    courseLevel: 'majors',
  },
  'color-and-temperature': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 5,
      section: '5.2',
    },
    courseLevel: 'survey',
  },
  'the-turning-sky': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 2,
      section: '2.1',
    },
    courseLevel: 'survey',
  },
  'the-sun-through-the-year': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-turning-sky'],
    textbook: {
      chapter: 2,
      section: '2.2',
    },
    courseLevel: 'survey',
  },
  'phases-and-eclipses': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-sun-through-the-year'],
    textbook: {
      chapter: 2,
      section: '2.3',
    },
    courseLevel: 'survey',
  },
  'wanderers-on-the-sky': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-turning-sky'],
    textbook: {
      chapter: 3,
      section: '3.1',
    },
    courseLevel: 'survey',
  },
  'plan-a-night': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-turning-sky', 'the-sun-through-the-year'],
    textbook: {
      chapter: 4,
      section: '4.3',
    },
    courseLevel: 'survey',
  },
  'lines-and-motion': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['color-and-temperature'],
    textbook: {
      chapter: 5,
      section: '5.4',
    },
    courseLevel: 'survey',
  },
  'what-a-spectrum-is-made-of': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lines-and-motion'],
    textbook: {
      chapter: 5,
      section: '5.3',
    },
    courseLevel: 'survey',
  },
  'the-suns-motion': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lines-and-motion'],
    textbook: {
      chapter: 25,
      section: '25.1',
    },
    courseLevel: 'majors',
  },
  'the-rotating-disk': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-suns-motion'],
    textbook: {
      chapter: 25,
      section: '25.3',
    },
    courseLevel: 'majors',
  },
  'cluster-membership': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lives-of-stars'],
    textbook: {
      chapter: 22,
      section: null,
    },
    courseLevel: 'majors',
  },
  'inside-a-star': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lives-of-stars'],
    textbook: {
      chapter: 16,
      section: null,
    },
    courseLevel: 'majors',
  },
  'scaling-the-main-sequence': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['inside-a-star'],
    textbook: {
      chapter: 18,
      section: null,
    },
    courseLevel: 'majors',
  },
  'the-limit': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['inside-a-star'],
    textbook: {
      chapter: 23,
      section: null,
    },
    courseLevel: 'majors',
  },
  'the-expanding-universe': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 26,
      section: '26.5',
    },
    courseLevel: 'majors',
  },
  'standard-candles': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['the-expanding-universe'],
    textbook: {
      chapter: 26,
      section: '26.4',
    },
    courseLevel: 'majors',
  },
  'the-shape-of-expansion': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['standard-candles'],
    textbook: {
      chapter: 29,
      section: null,
    },
    courseLevel: 'majors',
  },
  'where-galaxies-live': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-expanding-universe'],
    textbook: {
      chapter: 28,
      section: null,
    },
    courseLevel: 'majors',
  },
  'what-a-ccd-records': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'majors',
  },
  'signal-noise-and-exposure': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['what-a-ccd-records'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'majors',
  },
  'a-variable-star-from-frames': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['what-a-ccd-records'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'majors',
  },
  'the-beat-of-a-star': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lives-of-stars'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'leavitts-law': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['the-beat-of-a-star'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'the-first-rung': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['leavitts-law'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'which-kind-of-variable': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['the-beat-of-a-star'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'bending-light': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['what-is-a-gravitational-wave'],
    textbook: {
      chapter: 24,
      section: null,
    },
    courseLevel: 'majors',
  },
  'einstein-rings-and-arcs': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['bending-light'],
    textbook: {
      chapter: 24,
      section: null,
    },
    courseLevel: 'majors',
  },
  'a-lens-passing-by': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['einstein-rings-and-arcs'],
    textbook: {
      chapter: 24,
      section: null,
    },
    courseLevel: 'majors',
  },
  'who-gets-counted': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lives-of-stars'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'why-the-bright-ones-win': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['who-gets-counted'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'the-completeness-curve': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['why-the-bright-ones-win'],
    textbook: {
      chapter: 19,
      section: null,
    },
    courseLevel: 'majors',
  },
  'integrators-in-practice': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['orbital-energy'],
    textbook: {
      chapter: 3,
      section: null,
    },
    courseLevel: 'upper',
  },
  'extending-an-experiment': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
    textbook: {
      chapter: 21,
      section: null,
    },
    courseLevel: 'upper',
  },
  'refitting-a-transit': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['transit-photometry'],
    textbook: {
      chapter: 21,
      section: null,
    },
    courseLevel: 'upper',
  },
  'two-periodograms': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['transit-photometry'],
    textbook: {
      chapter: 21,
      section: null,
    },
    courseLevel: 'upper',
  },
  'sampling-a-posterior': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: ['transit-photometry', 'refitting-a-transit'],
    textbook: {
      chapter: 21,
      section: null,
    },
    courseLevel: 'upper',
  },
  'what-is-a-measurement': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'survey',
  },
  'what-does-plus-minus-claim': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['what-is-a-measurement'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'majors',
  },
  'when-the-method-must-refuse': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['what-does-plus-minus-claim'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'upper',
  },
  'measuring-the-moon': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['what-is-a-measurement'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'survey',
  },
  'how-far-is-that-star': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['what-does-plus-minus-claim'],
    textbook: {
      chapter: 19,
      section: '19.1',
    },
    courseLevel: 'majors',
  },
  'a-binary-stars-orbit': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['how-far-is-that-star'],
    textbook: {
      chapter: 18,
      section: '18.2',
    },
    courseLevel: 'upper',
  },
  'which-surface-is-older': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
    textbook: {
      chapter: 9,
      section: '9.2',
    },
    courseLevel: 'survey',
  },
  'craters-by-size': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['which-surface-is-older'],
    textbook: {
      chapter: 9,
      section: '9.2',
    },
    courseLevel: 'majors',
  },
  'what-a-crater-diameter-is-worth': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['which-surface-is-older'],
    textbook: {
      chapter: 9,
      section: null,
    },
    courseLevel: 'upper',
  },
  'what-is-in-this-field': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['signal-noise-and-exposure'],
    textbook: {
      chapter: 6,
      section: null,
    },
    courseLevel: 'majors',
  },
  'weighing-jupiter': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['a-binary-stars-orbit'],
    textbook: {
      chapter: 12,
      section: '12.2',
    },
    courseLevel: 'majors',
  },
  'why-rings': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 12,
      section: '12.5',
    },
    courseLevel: 'survey',
  },
  'tides-that-move-the-moon': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 4,
      section: '4.6',
    },
    courseLevel: 'majors',
  },
  'ios-fire': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['tides-that-move-the-moon'],
    textbook: {
      chapter: 12,
      section: '12.2',
    },
    courseLevel: 'majors',
  },
  'the-gaps-in-the-belt': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 14,
      section: null,
    },
    courseLevel: 'survey',
  },
  'how-fast-does-it-spin': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 14,
      section: null,
    },
    courseLevel: 'survey',
  },
  'why-venus-is-hot': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 10,
      section: '10.3',
    },
    courseLevel: 'survey',
  },
  'two-greenhouse-models': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['why-venus-is-hot'],
    textbook: {
      chapter: 8,
      section: '8.3',
    },
    courseLevel: 'majors',
  },
  'the-turning-sun': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 16,
      section: null,
    },
    courseLevel: 'survey',
  },
  'the-suns-power': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 15,
      section: null,
    },
    courseLevel: 'survey',
  },
  'how-hot-is-the-day-side': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['why-venus-is-hot'],
    textbook: {
      chapter: 21,
      section: '21.4',
    },
    courseLevel: 'majors',
  },
  'phases-and-albedo': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['phases-and-eclipses'],
    textbook: {
      chapter: 2,
      section: '2.3',
    },
    courseLevel: 'majors',
  },
  'the-scale-of-the-solar-system': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 7,
      section: null,
    },
    courseLevel: 'survey',
  },
  'moons-of-the-giants': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 12,
      section: '12.2',
    },
    courseLevel: 'survey',
  },
  'comets-and-the-sun': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
    textbook: {
      chapter: 13,
      section: null,
    },
    courseLevel: 'survey',
  },
};
