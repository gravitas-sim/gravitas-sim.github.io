// The steps whose readings a long closing question is about, by lesson and step id: where a written answer would
// otherwise offer every reading of every step before it (21 to 48 in these three lessons), its own prompt names
// what it asks about, and the tray offers those steps' readings and predictions only (js/investigations/evidence.js,
// `citable`). Data, not words: a step id never translates. A test holds each id to an earlier step of the lesson.
export const CITES = {
  'listening-to-spacetime': {
    'measured-or-supplied': [
      'looks-like-is-not-enough',
      'the-same-moment',
      'rank-before-the-catalog',
    ],
    'what-the-signal-tells-you': [
      'an-unlabeled-signal',
      'frequency-early-and-late',
      'stop-at-a-milestone',
      'measure-time-in-band',
      'the-one-mass-that-matters',
      'test-distance',
    ],
  },
  'a-universe-of-stars': {
    'what-the-trend-covers': [
      'three-on-the-main-sequence',
      'predict-mass-and-light',
      'the-whole-sequence',
    ],
    'what-a-survey-misses': [
      'predict-the-bright-subset',
      'a-population',
      'only-the-bright-ones',
    ],
    'spectra-what-color-cannot-give': ['spectra-two-features'],
    'the-argument': [
      'three-stars-no-labels',
      'the-numbers-arrive',
      'measure-the-radius-ratio',
      'the-whole-sequence',
      'measure-the-lifetimes',
      'spectra-two-features',
    ],
  },
  'lives-of-stars': {
    'why-iron-stops-it': [
      'core-in-envelope-out',
      'predict-massive-lifetime',
      'massive-versus-sun',
    ],
    'the-lifecycle-argument': [
      'three-futures',
      'core-in-envelope-out',
      'measure-the-giant',
      'how-long-was-each-part',
      'massive-versus-sun',
      'design-a-comparison',
    ],
  },
};
