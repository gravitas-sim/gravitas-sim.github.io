// =============================================================================
// The Shape of Expansion
// -----------------------------------------------------------------------------
// Content only, no imports (see the-expanding-universe.js for the conventions).
// The instrument is the cosmology family's "hubble-diagram" tool
// (js/cosmologyWidgets.js over js/kernels/cosmology/): the DES supernovae against
// a flat Lambda-CDM curve whose matter density the student sets, the residual
// from an empty universe, the least-squares fit and its profile interval, and the
// degeneracy of the Hubble constant with the supernovae's absolute magnitude. The
// fit has statistical errors only, so its interval is narrower than the published
// one (0.352 +- 0.017, which carries the survey's systematic errors).
// The numbers are checked by tests/cosmologyInvestigations.test.js.
// =============================================================================

const GALAXIES = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'near', name: 'A nearby supernova', teffK: 12000, lumSun: 5e9 },
    { role: 'far', name: 'A distant supernova', teffK: 12000, lumSun: 5e9 },
  ],
};
const DIAGRAM = (values = {}) => ({ id: 'hubble-diagram', values });
const BASE = { om: 0.3, h0: 70, calib: 0, view: 0 };
const BEST = { om: 0.36, h0: 70, calib: 0, view: 1 };
const MATTER = { om: 1, h0: 70, calib: 0, view: 1 };

const THE_SHAPE_OF_EXPANSION = {
  id: 'the-shape-of-expansion',
  thumbnail: 'images/investigations/the-shape-of-expansion.webp',
  title: 'The Shape of Expansion',
  subtitle:
    'Fitting the matter density to 1,829 supernovae, and what the fit can and cannot say',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 29, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['standard-candles'],
  tags: ['galaxies', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what the curve of distance modulus against redshift depends on, and what a matter-only universe predicts for it',
    'Read a best-fit matter density, its interval and a chi-square against the fit',
    'Say why a fit with statistical errors only gives an interval that is too narrow',
    'Say what the supernovae can determine, and what they cannot',
  ],
  steps: [
    {
      sid: 'a-curve-through-the-diagram',
      stage: GALAXIES,
      type: 'read',
      title: 'A curve through the diagram',
      body: `The warm curve is a model: a flat universe of matter, with density
             Ω<sub>m</sub> as a fraction of the critical density, and a
             <strong>cosmological constant</strong> that makes up the rest. Its shape
             is the history of the expansion. The model has no free vertical
             position: the instrument shifts it by the one offset that fits best,
             because the supernovae alone do not fix the scale.
             \n\nThe second picture subtracts an <strong>empty, coasting
             universe</strong> from every point and from the curve, so a flat line
             at zero is what no deceleration and no acceleration would give.
             A supernova above the line is fainter than that universe says, and one
             below it is brighter. The data are the Dark Energy Survey’s
             <strong>authentic</strong> supernovae, with statistical errors only.`,
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'predict-matter-only',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'a-matter-only-universe',
      title: 'A universe of matter alone',
      body: `With matter alone, gravity slows the expansion, so for a given
             redshift the light has had a shorter path than in an empty universe.
             Set <strong>Ω<sub>m</sub> = 1</strong>, in the residual picture. Do
             not read the readout yet.`,
      prompt: 'The matter-only curve will lie&hellip;',
      options: [
        'right through the supernovae, because matter is all there is',
        'below the supernovae: the real ones are fainter than a decelerating universe predicts',
        'above the supernovae: the real ones are brighter than it predicts',
        'on the line at zero, the same as the empty universe',
      ],
      answer: 1,
      hints: [
        'A decelerating universe makes distances shorter, so supernovae in it look brighter. The real ones look…',
      ],
      because:
        'The curve lies below the supernovae. Deceleration shortens distances, so a matter-only universe predicts brighter supernovae than the real ones, which are fainter. The next step puts a number on how badly it fits.',
      tool: DIAGRAM(MATTER),
    },
    {
      sid: 'a-matter-only-universe',
      stage: GALAXIES,
      type: 'measure',
      title: 'How badly matter alone fits',
      body: `With <strong>Ω<sub>m</sub> = 1</strong> set, read the
             <strong>chi-square of the curve you chose</strong> and how far it is
             <strong>above the best fit</strong>.`,
      fields: [
        { id: 'chi2', label: 'Chi-square of the curve', hint: '3303' },
        { id: 'delta', label: 'Above the best fit', hint: '1615' },
      ],
      validate: v => {
        if (![v.chi2, v.delta].every(Number.isFinite)) return null;
        if (Math.abs(v.chi2 - 3303) <= 4 && Math.abs(v.delta - 1615) <= 4) {
          return {
            level: 'ok',
            message:
              'A chi-square of 3,303 against the best fit’s 1,688: worse by 1,615, for 1,827 degrees of freedom. A fit this bad is not a matter of a slightly wrong density: no flat universe of matter alone describes these supernovae, and the empty one is no better (3,684).',
          };
        }
        return {
          level: 'error',
          message:
            'Set Ωm to 1 and read “Chi-square of the curve you chose” and “Chi-square above the best fit”.',
        };
      },
      tool: DIAGRAM(MATTER),
    },
    {
      sid: 'the-best-fit',
      stage: GALAXIES,
      type: 'measure',
      title: 'The best fit',
      body: `Read the <strong>best-fit matter density</strong> and the two ends of
             its <strong>68% interval</strong>.`,
      fields: [
        { id: 'om', label: 'Best-fit Ωm', hint: '0.361' },
        { id: 'lo', label: 'Lower end of the interval', hint: '0.349' },
        { id: 'hi', label: 'Upper end of the interval', hint: '0.372' },
      ],
      validate: v => {
        if (![v.om, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          Math.abs(v.om - 0.361) <= 0.003 &&
          Math.abs(v.lo - 0.349) <= 0.003 &&
          Math.abs(v.hi - 0.372) <= 0.003
        ) {
          return {
            level: 'ok',
            message:
              'Ωm = 0.361, with a 68 percent interval from 0.349 to 0.372, from 1,829 supernovae. The rest, 0.639, is the cosmological constant. The interval is about ±0.012, which says the supernovae pin the density to a few percent, given a flat universe and the errors as printed.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Best-fit matter density”, and the lower and upper numbers of “68% interval for Ωm”.',
        };
      },
      tool: DIAGRAM(BEST),
    },
    {
      sid: 'the-usual-value',
      stage: GALAXIES,
      type: 'measure',
      title: 'Against 0.30',
      body: `Many textbooks use Ω<sub>m</sub> = 0.3. Set it to
             <strong>0.30</strong> and read how far the <strong>chi-square of the
             curve</strong> is <strong>above the best fit</strong>.`,
      fields: [{ id: 'delta', label: 'Above the best fit', hint: '30.9' }],
      validate: v => {
        if (![v.delta].every(Number.isFinite)) return null;
        if (Math.abs(v.delta - 30.9) <= 0.4) {
          return {
            level: 'ok',
            message:
              '30.9 above the best fit. For one fitted parameter, a chi-square 30.9 higher is 5.6 standard deviations away, if these errors are all there is. So by statistical errors alone, 0.30 is excluded.',
          };
        }
        return {
          level: 'error',
          message: 'Set Ωm to 0.30 and read “Chi-square above the best fit”.',
        };
      },
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'what-the-interval-leaves-out',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'Is 0.30 ruled out',
      body: `By the instrument’s errors, Ω<sub>m</sub> = 0.30 is 5.6 standard
             deviations from the best fit. The published analysis of this sample,
             with the survey’s full error budget, gives 0.352 ± 0.017.`,
      prompt:
        'What explains an interval that is narrower than the published one?',
      options: [
        'The instrument’s errors are the supernovae’s statistical errors only; errors that every supernova shares, such as the calibration, the corrections and the survey’s selection, are left out and widen the true interval',
        'The published value is simply wrong',
        'A larger sample always gives a wider interval',
        'The interval is the scatter of the points, which is large',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'published-wrong',
          option: 1,
          say: 'The published interval answers a harder question, with errors this fit leaves out. Its interval is wider because it is more honest, not because it is a different measurement.',
        },
        {
          id: 'larger-wider',
          option: 2,
          say: 'More data narrows the statistical interval. It cannot narrow the part of the error that every point shares.',
        },
      ],
      hints: [
        'Ask which errors move all the supernovae together, and whether a fit to the scatter of the points can see them.',
      ],
      because:
        'The interval comes from the points’ own errors, which average down with the number of supernovae. Errors common to all of them do not average down and are not in the table the instrument reads. The published value, 0.352 ± 0.017, is within 0.01 of this fit, and its interval is about 1.5 times as wide.',
      tool: DIAGRAM(BASE),
    },
    {
      sid: 'predict-the-degeneracy',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'the-degeneracy-check',
      title: 'Changing the scale',
      body: `Set the matter density to the best fit, <strong>0.36</strong>. Then
             think about the other control: the error in the supernovae’s absolute
             magnitude, which stands for any change of the calibration. Do not
             change it yet.`,
      prompt:
        'Moving it by 0.15 magnitudes will change the chi-square of the curve&hellip;',
      options: [
        'by hundreds: the curve will no longer fit',
        'by about thirty, as moving Ωm to 0.30 did',
        'not at all, though it will change the Hubble constant implied',
        'by 0.15',
      ],
      answer: 2,
      hints: [
        'The fit already solves for a free vertical offset. What happens when you add another one?',
      ],
      because:
        'The chi-square does not change. An error in the absolute magnitude is a vertical shift of all the moduli, and the fit has a free vertical shift, so the second one is absorbed. The Hubble constant it implies moves, and the next step shows by how much.',
      tool: DIAGRAM(BEST),
    },
    {
      sid: 'the-degeneracy-check',
      stage: GALAXIES,
      type: 'measure',
      title: 'The scale is free',
      body: `With Ω<sub>m</sub> at <strong>0.36</strong>, set the
             <strong>error in the absolute magnitude</strong> to
             <strong>0.15</strong>. Read the <strong>chi-square of the curve</strong>
             and the <strong>Hubble constant implied</strong>.`,
      fields: [
        { id: 'chi2', label: 'Chi-square of the curve', hint: '1688' },
        {
          id: 'implied',
          label: 'Implied Hubble constant',
          unit: 'km/s/Mpc',
          hint: '65.3',
        },
      ],
      validate: v => {
        if (![v.chi2, v.implied].every(Number.isFinite)) return null;
        if (
          Math.abs(v.chi2 - 1687.9) <= 2 &&
          Math.abs(v.implied - 65.33) <= 0.2
        ) {
          return {
            level: 'ok',
            message:
              'The chi-square is 1,687.9 whatever the error in the absolute magnitude, and the implied Hubble constant fell from 70 to 65.33. The supernovae fix the shape, Ωm; the scale, H₀, is not in them. That has to come from the calibration of the rungs below, which is why the two kinds of measurement are joined in a real analysis.',
          };
        }
        return {
          level: 'error',
          message:
            'Set Ωm to 0.36 and the error in the absolute magnitude to 0.15, and read “Chi-square of the curve you chose” and “Hubble constant implied by that magnitude error”.',
        };
      },
      tool: DIAGRAM({ om: 0.36, h0: 70, calib: 0.15, view: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: GALAXIES,
      type: 'read',
      title: 'What you worked out',
      body: `Matter alone cannot describe these supernovae: Ω<sub>m</sub> = 1 is
             1,615 in chi-square above the best fit, which is Ω<sub>m</sub> =
             0.361 (0.349 to 0.372), the rest a cosmological constant. The
             supernovae are fainter than a decelerating universe predicts, so the
             expansion has been speeding up. What they cannot give is the scale,
             H<sub>0</sub>, which any offset hides.
             \n\nAssumed here: a flat universe, a constant dark energy density (w =
             −1), no radiation and no curvature of the model apart from the empty
             universe in the residual picture, and statistical errors only. A
             different assumption, for instance a curved universe, shifts the
             density and gives a different interval; the data alone do not choose
             between them without other measurements.`,
      tool: DIAGRAM(BEST),
    },
  ],
};

export default THE_SHAPE_OF_EXPANSION;
