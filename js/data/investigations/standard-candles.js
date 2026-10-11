// =============================================================================
// Standard Candles
// -----------------------------------------------------------------------------
// Content only, no imports (see the-expanding-universe.js for the conventions).
// The instrument is the cosmology family's "hubble-diagram" tool
// (js/cosmologyWidgets.js over js/kernels/cosmology/fit.js): the 1,829 DES
// supernovae's distance moduli against redshift, and the one control that stands
// for the rungs below them, the error in the supernovae's absolute magnitude.
// The supernova distances are on the release's scale (H0 = 70); an error in the
// absolute magnitude moves every modulus alike, which is why the supernovae alone
// cannot give a Hubble constant. The Cepheid rung is The First Rung's (the
// variable-star investigations), and is quoted here, not recomputed. Numbers are
// checked by tests/cosmologyInvestigations.test.js.
// =============================================================================

const GALAXIES = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'cepheid', name: 'A Cepheid', teffK: 5500, lumSun: 5000 },
    {
      role: 'supernova',
      name: 'A Type Ia supernova',
      teffK: 12000,
      lumSun: 5e9,
    },
  ],
};
const DIAGRAM = (values = {}) => ({ id: 'hubble-diagram', values });
const BASE = { om: 0.3, h0: 70, calib: 0, view: 0 };

const STANDARD_CANDLES = {
  id: 'standard-candles',
  thumbnail: 'images/investigations/standard-candles.webp',
  title: 'Standard Candles',
  subtitle:
    'From Cepheids to supernovae: how an error in one rung becomes an error in the Hubble constant',
  duration: '12-20 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 26, section: '26.4' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: ['the-expanding-universe'],
  tags: ['galaxies', 'observing', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a standard candle is and why a supernova’s distance modulus gives a distance',
    'Show how an error in the calibration of a candle becomes an error in the Hubble constant, and by how much',
    'Say why the supernovae alone cannot give the Hubble constant, and what the rungs below them supply',
    'Compare the error of one rung with the size of the error it passes on',
  ],
  steps: [
    {
      sid: 'a-candle-and-its-distance',
      stage: GALAXIES,
      type: 'read',
      title: 'A candle and its distance',
      body: `A <strong>standard candle</strong> is an object whose true brightness
             you can know without knowing its distance. A Type Ia supernova, a
             white dwarf pushed over its limit, is close to one: all of them peak at
             about the same luminosity, after a small correction for how fast they
             fade. Compare how bright one looks with how bright it is, and the
             difference in magnitudes is its <strong>distance modulus</strong>.
             \n\nThe diagram plots the moduli of 1,829 supernovae of the Dark Energy
             Survey against their redshifts. These are <strong>authentic</strong>,
             with statistical errors only. The warm curve is a flat universe with the
             matter density and Hubble constant you set. A supernova on the left is
             near and a supernova on the right is far, and nothing here says how
             bright any of them truly is: that comes from the Cepheids and the other
             rungs of the ladder, below.`,
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'the-sample',
      stage: GALAXIES,
      type: 'measure',
      title: 'The sample',
      body: `Read the <strong>number of supernovae</strong> and the
             <strong>chi-square</strong> of the best fit, the first number of the
             pair.`,
      fields: [
        { id: 'n', label: 'Supernovae', hint: '1829' },
        { id: 'chi2', label: 'Chi-square of the best fit', hint: '1688' },
      ],
      validate: v => {
        if (![v.n, v.chi2].every(Number.isFinite)) return null;
        if (v.n === 1829 && Math.abs(v.chi2 - 1688) <= 2) {
          return {
            level: 'ok',
            message:
              '1,829 supernovae, and a chi-square of 1,688 for 1,827 degrees of freedom: the curve describes the points about as well as their errors say it should. That is a good fit; it does not say the errors are the whole story, because they are statistical only.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Supernovae” and the first number of “Chi-square of the best fit, with its degrees of freedom”.',
        };
      },
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'predict-a-calibration-error',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'a-calibration-error',
      title: 'A candle that is not what you thought',
      body: `Suppose every supernova is in truth 0.1 magnitude fainter than the
             calibration says. Each is then farther than it was taken to be, so
             every distance is too small by the same fraction. Do not change the
             instrument yet.`,
      prompt: 'The Hubble constant the supernovae imply will&hellip;',
      options: [
        'rise by about 4.5 percent',
        'fall by about 4.5 percent',
        'rise by about 45 percent',
        'not change, because the redshifts did not change',
      ],
      answer: 1,
      hints: [
        'Distances that are too small, for the same velocities, make a slope that is too large; correcting them makes it smaller.',
      ],
      because:
        'It falls, by about 4.5 percent. A fainter candle at the same observed brightness is farther, so the corrected distances are larger and, for the same recession speeds, the slope is smaller. Redshifts did not change, but a Hubble constant is a speed divided by a distance, and the distance did.',
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'a-calibration-error',
      stage: GALAXIES,
      type: 'measure',
      title: '0.1 magnitude off',
      body: `Set the <strong>error in the supernovae’s absolute magnitude</strong>
             to <strong>0.10</strong> magnitudes. Read the <strong>Hubble
             constant implied</strong> and the <strong>change in H<sub>0</sub> for
             0.1 mag</strong>.`,
      fields: [
        {
          id: 'implied',
          label: 'Implied Hubble constant',
          unit: 'km/s/Mpc',
          hint: '66.85',
        },
        {
          id: 'pct',
          label: 'Change in H₀ for 0.1 mag',
          unit: '%',
          hint: '4.5',
        },
      ],
      validate: v => {
        if (![v.implied, v.pct].every(Number.isFinite)) return null;
        if (
          Math.abs(v.implied - 66.85) <= 0.15 &&
          Math.abs(v.pct - 4.5) <= 0.1
        ) {
          return {
            level: 'ok',
            message:
              'A tenth of a magnitude moves the Hubble constant from 70 to 66.85, 4.5 percent. The chi-square of the curve does not move at all: the supernovae cannot tell that anything is wrong, because all the moduli shift together. The error is passed straight up the ladder.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the error in the absolute magnitude to 0.10 and read “Hubble constant implied by that magnitude error” and “Change in H0 for 0.1 mag”.',
        };
      },
      tool: DIAGRAM({ ...BASE, calib: 0.1 }),
    },
    {
      sid: 'the-degeneracy',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'Why the supernovae alone cannot say',
      body: `Moving the error in the absolute magnitude changes the Hubble constant
             the instrument implies, and leaves the chi-square of the curve where it
             was. The same holds for the Hubble constant of the curve itself: the
             chi-square for 50, 70 and 90 differs by about 10<sup>−12</sup>.`,
      prompt: 'What does that tell you?',
      options: [
        'The supernovae fix the shape of the curve, and the Hubble constant and the supernovae’s true brightness shift every modulus alike, so the supernovae cannot separate them; the scale has to come from the rungs below',
        'The supernovae measure the Hubble constant perfectly, so it does not matter what you choose',
        'The fit failed to converge',
        'The Hubble constant has no effect on the distances',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'perfect',
          option: 1,
          say: 'It is the opposite: the fit is blind to the scale. The chi-square would be the same for any value, so the data say nothing about which is right.',
        },
        {
          id: 'no-effect',
          option: 3,
          say: 'The Hubble constant changes every distance. What it cannot do is change the shape in a way the fit can see, because an offset is free and absorbs it.',
        },
      ],
      hints: [
        'The fit solves for one free offset in magnitude. Ask what else could be absorbed by an offset.',
      ],
      because:
        'The curve of distance modulus against redshift has a shape and a vertical position. The supernovae fix the shape; the vertical position is the Hubble constant and the calibration, together. To pin it down you need a distance to a few supernova hosts by another route, such as Cepheids, and that is the ladder.',
      tool: DIAGRAM({ ...BASE, calib: 0.1 }),
    },
    {
      sid: 'the-rung-below',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'An error handed up',
      body: `The investigation <em>The First Rung</em> finds a Cepheid distance
             modulus good to 0.051 magnitudes. A modulus error Δμ is a distance
             error of Δd ÷ d = 0.4605 Δμ, and a Hubble constant carries the same
             fractional error as the distance it is divided by.`,
      prompt:
        'How large an error in the Hubble constant does 0.051 magnitudes pass on?',
      options: [
        'About 0.05 percent, because 0.051 is small',
        'About 2.4 percent, from 0.4605 × 0.051',
        'About 5 percent, the same number',
        'About 24 percent, because magnitudes are logarithmic',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'same-number',
          option: 2,
          say: 'A magnitude is not a percent. The conversion is 0.4605 per magnitude, so 0.051 magnitudes is a couple of percent.',
        },
        {
          id: 'too-small',
          option: 0,
          say: 'Magnitudes are logarithmic: 0.05 of one is a few percent of a distance, not a twentieth of a percent.',
        },
      ],
      hints: ['0.4605 × 0.051 × 100.'],
      because:
        '0.4605 × 0.051 = 0.0235, about 2.4 percent from this one rung, before a single supernova is used. The rungs above add their own terms, and a result good to one or two percent needs every rung good to a few hundredths of a magnitude.',
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'what-you-worked-out',
      stage: GALAXIES,
      type: 'read',
      title: 'What you worked out',
      body: `A standard candle turns brightness into distance only as well as its
             true brightness is known. A tenth of a magnitude of calibration error
             is 4.5 percent in the Hubble constant, and the chi-square of the
             supernovae cannot see it, because the supernovae fix the shape of the
             diagram and not its scale. The scale is passed up from the rungs below,
             and an error in one rung is an error in all that stand on it.
             \n\nNot done here: the redshift-dependent corrections of a real
             supernova analysis, the errors that two supernovae share, and the
             host-galaxy dependence of the peak brightness. The table’s
             distance moduli are on the survey’s own scale; the instrument’s
             “error in the absolute magnitude” stands in for whatever the true
             calibration would change.`,
      tool: DIAGRAM(BASE),
    },
  ],
};

export default STANDARD_CANDLES;
