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
};
