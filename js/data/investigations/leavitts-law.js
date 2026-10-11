// =============================================================================
// Leavitt's Law
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the variable-star family's "leavitt-law" tool
// (js/variableInstruments.js over js/kernels/variables/ladder.js): 339 Cepheids
// of the Large Magellanic Cloud from the Hubble Space Telescope table of Riess
// et al. 2022 (CC BY 4.0), as Wesenheit magnitudes, fitted by least squares
// with one pass of sigma clipping. The numbers a student reads are checked
// against that fit by tests/variableInvestigations.test.js. Not corrected:
// metallicity and crowding.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'long', name: 'A long-period Cepheid', teffK: 5400, lumSun: 8000 },
    { role: 'short', name: 'A short-period Cepheid', teffK: 6100, lumSun: 800 },
  ],
};
const LEAVITT = (values = {}) => ({ id: 'leavitt-law', values });
const LMC = { host: 0 };

const LEAVITTS_LAW = {
  id: 'leavitts-law',
  thumbnail: 'images/investigations/leavitts-law.webp',
  title: 'Leavitt’s Law',
  subtitle:
    'Fitting the period-luminosity relation of Cepheids in the Large Magellanic Cloud',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: ['the-beat-of-a-star'],
  tags: ['observing', 'stars', 'galaxies'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why Cepheids in one galaxy can be used to calibrate brightness against period',
    'Fit the period-luminosity relation to 339 Cepheids and read its slope, its zero point and its scatter',
    'Say why a Wesenheit magnitude is used and how much dust it still leaves',
    'Turn the slope into a brightness ratio between a long-period and a short-period Cepheid',
  ],
  steps: [
    {
      sid: 'brighter-and-slower',
      stage: STARS,
      type: 'read',
      title: 'Brighter and slower',
      body: `In 1912 Henrietta Leavitt, sorting photographic plates of the Small
             Magellanic Cloud, noticed that the Cepheid variables with the
             longer periods were the brighter ones. Every star in that cloud is
             at nearly the same distance, so a difference in apparent
             brightness is a difference in true luminosity: the period of a
             Cepheid tells you what it is worth.
             \n\nThe instrument holds the same relation for the Large Magellanic
             Cloud, measured with the Hubble Space Telescope: 339 Cepheids, each
             a dot of Wesenheit magnitude (brightness with the effect of dust
             nearly removed) against period on a logarithmic axis. Brighter is
             up. The line is a least-squares fit. These are
             <strong>authentic</strong> measurements; the table’s source is in
             the instrument’s first row.`,
      tool: LEAVITT(LMC),
    },
    {
      sid: 'predict-the-trend',
      stage: STARS,
      type: 'predict',
      reveal: 'the-calibration',
      title: 'Which way does it slope',
      body: `The plot has period along the bottom and magnitude up the side,
             with brighter stars higher. Do not change the instrument yet.`,
      prompt:
        'Compared with a short-period Cepheid, a long-period one will appear&hellip;',
      options: [
        'higher on the plot, brighter, so the line rises to the right',
        'lower on the plot, fainter, so the line falls to the right',
        'at the same height: period tells you nothing about brightness',
        'higher, but only for periods over thirty days',
      ],
      answer: 0,
      hints: [
        'Think of Leavitt’s result: the longer the period, the more luminous the star.',
      ],
      because:
        'Higher, brighter: the line rises to the right on this plot. Magnitudes run backward, so a brighter star has a smaller magnitude, and the fitted slope is negative. The next step reads it.',
      tool: LEAVITT(LMC),
    },
    {
      sid: 'the-calibration',
      stage: STARS,
      type: 'measure',
      title: 'The calibration',
      body: `Read the <strong>slope</strong> of the fit in magnitudes per dex
             (a dex is a factor of ten in period) and the
             <strong>magnitude it gives at a period of 10 days</strong>, the
             relation’s zero point.`,
      fields: [
        { id: 'slope', label: 'Slope', unit: 'mag/dex', hint: '-3.29' },
        {
          id: 'zero',
          label: 'Magnitude at 10 days',
          unit: 'mag',
          hint: '12.60',
        },
      ],
      validate: v => {
        if (![v.slope, v.zero].every(Number.isFinite)) return null;
        if (v.slope > 0 && Math.abs(v.slope) < 4.5) {
          return {
            level: 'error',
            message:
              'The slope is negative: a longer period means a smaller magnitude, which is a brighter star. Enter it with its minus sign.',
          };
        }
        if (
          Math.abs(v.slope + 3.29) <= 0.03 &&
          Math.abs(v.zero - 12.6) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'A slope of −3.29 ± 0.02 magnitudes per factor of ten in period, and 12.60 at 10 days. Each tenfold step in period is 3.3 magnitudes, a factor of 21 in brightness. The slope comes from 339 stars and is known to better than one percent.',
          };
        }
        return {
          level: 'error',
          message:
            'Pick “The Large Magellanic Cloud (the calibration)” and read “Slope” and “Magnitude at a period of 10 days”.',
        };
      },
      tool: LEAVITT(LMC),
    },
    {
      sid: 'how-tight',
      stage: STARS,
      type: 'measure',
      title: 'How tight the relation is',
      body: `Read the <strong>scatter about the relation</strong>, the spread of
             the stars above and below the line, and the <strong>dust left in
             a Wesenheit magnitude</strong> for each magnitude of visual dust
             dimming (A<sub>V</sub>).`,
      fields: [
        {
          id: 'scatter',
          label: 'Scatter about the relation',
          unit: 'mag',
          hint: '0.089',
        },
        {
          id: 'dust',
          label: 'Dust left per magnitude of A_V',
          unit: '',
          hint: '0.040',
        },
      ],
      validate: v => {
        if (![v.scatter, v.dust].every(Number.isFinite)) return null;
        if (
          Math.abs(v.scatter - 0.089) <= 0.005 &&
          Math.abs(v.dust - 0.04) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              'Stars sit within 0.09 magnitudes, about 9 percent in brightness, of the line. The dust figure is the fraction of a magnitude of dimming a Wesenheit magnitude still feels for each magnitude of V dimming: 0.04. The infrared band alone would feel 0.21, about five times as much.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Scatter about the relation” and “Dust left in a Wesenheit magnitude, per magnitude of A_V” with the calibration selected.',
        };
      },
      tool: LEAVITT(LMC),
    },
    {
      sid: 'why-wesenheit',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why a Wesenheit magnitude',
      body: `A Cepheid’s measured brightness is dimmed by dust between it and
             us, by an amount that differs from star to star. The Wesenheit
             magnitude combines the infrared brightness with the difference of
             two visible colors, in the proportion that dust dims them.`,
      prompt: 'What does the combination do?',
      options: [
        'It makes the stars brighter so the relation is easier to see',
        'It cancels most of the dimming by dust, because dust changes the colors and the brightness together in a known proportion',
        'It removes the effect of the star’s own pulsation',
        'It corrects for the star’s distance',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'brighter',
          option: 0,
          say: 'Nothing is made brighter: the combination is built so that dust, which dims and reddens, leaves it almost unchanged.',
        },
        {
          id: 'distance',
          option: 3,
          say: 'Distance is not corrected: the stars here are all at nearly one distance, which is why the relation can be fitted at all.',
        },
      ],
      hints: [
        'Dust dims blue light more than red; what you measure in two colors tells you how much dimming the star has had.',
      ],
      because:
        'Dust dims the colors in a known ratio, so a particular mix of the magnitudes (the Wesenheit one) is blind to it: what is left is 0.04 magnitudes per magnitude of V dimming, with the law of the radiation kernel and a standard R_V of 3.3. A different dust law or R_V would change that figure, which is the stated assumption.',
      tool: LEAVITT(LMC),
    },
    {
      sid: 'the-tenfold-step',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A tenfold step in period',
      body: `The fitted slope is −3.29 magnitudes per dex. Two Cepheids have
             periods of 10 and 100 days.`,
      prompt: 'How much brighter, in magnitudes, is the 100-day Cepheid?',
      options: [
        '0.33 magnitudes',
        '3.3 magnitudes',
        '33 magnitudes',
        'The same: they are the same kind of star',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'tenth',
          option: 0,
          say: 'A factor of ten in period is one dex, and the slope is 3.29 magnitudes for each dex, not for each tenth of a dex.',
        },
      ],
      hints: ['The step from 10 to 100 days is exactly one dex.'],
      because:
        'One dex is 3.29 magnitudes, and five magnitudes is a factor of 100 in brightness, so 3.29 magnitudes is a factor of 10^(0.4 × 3.29) = 21. A Cepheid ten times slower is twenty-one times as luminous.',
      tool: LEAVITT(LMC),
    },
    {
      sid: 'why-one-galaxy',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why fit in one galaxy',
      body: `The relation is fitted on stars of the Large Magellanic Cloud, not
             on a mixture of galaxies.`,
      prompt: 'Why?',
      options: [
        'Cepheids elsewhere are a different kind of star and obey no relation',
        'All its stars are at nearly the same distance, so differences in brightness are differences in luminosity',
        'It is the nearest galaxy, and nearer stars are less affected by dust',
        'The Hubble telescope could observe no other galaxy',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'different-kind',
          option: 0,
          say: 'The same relation is used in other galaxies in the next investigation. The point of one galaxy is that distance is a constant there.',
        },
      ],
      hints: [
        'If stars were at different distances, a faint one could be a luminous Cepheid far away.',
      ],
      because:
        'In one galaxy the distance is a single number, so the stars’ magnitudes differ only by luminosity, and the fit reads luminosity off period. To turn that into an absolute scale the cloud’s distance has to be known on its own, which comes from eclipsing binaries and enters the next investigation as a stated number.',
      tool: LEAVITT(LMC),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Cepheids of the Large Magellanic Cloud lie on a line: Wesenheit
             magnitude falls by 3.29 magnitudes for every factor of ten in
             period, with a zero point of 12.60 at 10 days and a scatter of
             0.09 magnitudes, so a Cepheid ten times slower is twenty-one times
             as luminous. A Wesenheit magnitude cancels almost all the dimming by
             dust. Fitting in one galaxy works because all its stars are at
             one distance.
             \n\nThe line is a ruler with its length known only up to
             the cloud’s distance. The next investigation puts it against
             Cepheids in two other galaxies, and measures how far away they
             are, with a budget of every error. Not corrected here:
             metallicity, which changes the relation a little, and crowding in
             the host galaxies’ images.`,
      tool: LEAVITT(LMC),
    },
  ],
};

export default LEAVITTS_LAW;
