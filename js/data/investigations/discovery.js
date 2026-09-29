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
// =============================================================================

export const DISCOVERY = {
  'keplers-laws': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
  },
  'retrograde-motion': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
  },
  'transit-photometry': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
  },
  'orbital-energy': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['keplers-laws'],
  },
  'weighing-stars': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
  },
  'black-holes': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
  },
  'radial-velocity': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry'],
  },
  'goldilocks-question': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry'],
  },
  'missing-mass': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
  },
  tides: {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
  },
  'butterfly-effect': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['lagrange-points'],
  },
  'when-orbits-lock': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: [],
  },
  'detect-this-planet': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['transit-photometry', 'radial-velocity'],
  },
  'design-the-schedule': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['radial-velocity', 'detect-this-planet'],
  },
  'binary-star-planets': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['butterfly-effect'],
  },
  'gravity-assist': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['orbital-energy'],
  },
  'hohmann-transfer': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['orbital-energy'],
  },
  'lagrange-points': {
    audience: 'intro',
    mathematics: 'algebra',
    prerequisites: ['hohmann-transfer', 'when-orbits-lock'],
  },
  'what-is-a-gravitational-wave': {
    audience: 'beginner',
    mathematics: 'arithmetic',
    prerequisites: [],
  },
  'listening-to-spacetime': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: ['what-is-a-gravitational-wave'],
  },
  'a-universe-of-stars': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
  },
  'lives-of-stars': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
  },
  'twelve-nights': {
    audience: 'intro',
    mathematics: 'arithmetic',
    prerequisites: [],
  },
  'power-law-gravity': {
    audience: 'intro',
    mathematics: 'logarithms',
    prerequisites: [],
  },
};
