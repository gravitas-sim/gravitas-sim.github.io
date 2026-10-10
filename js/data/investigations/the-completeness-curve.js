// =============================================================================
// The Completeness Curve
// -----------------------------------------------------------------------------
// Content only, no imports (see who-gets-counted.js for the conventions). The
// instrument is the survey family's completeness tool (js/surveyWidgets.js over
// js/survey/model.js): a survey that fades out before its limit, and the
// luminosity function recovered by weighting each counted star by the volume
// it could have been seen in. The truth is known, so the residual bias can be
// stated. Numbers are checked by tests/surveyInvestigations.test.js
// (tools/authoring/surveyModels.mjs).
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'sun', name: 'A star like the Sun', teffK: 5772, lumSun: 1 },
    { role: 'dwarf', name: 'A red dwarf', teffK: 3300, lumSun: 0.01 },
  ],
};
const CC = (values = {}) => ({ id: 'completeness-lf', values });
const SHARP = { limit: 20, m50: 20, width: 0.3, view: 0 };
const FADE = { limit: 20, m50: 17, width: 0.5, view: 0 };
const POOR = { limit: 17, m50: 16, width: 1, view: 1 };

const THE_COMPLETENESS_CURVE = {
  id: 'the-completeness-curve',
  thumbnail: 'images/investigations/the-completeness-curve.webp',
  title: 'The Completeness Curve',
  subtitle: 'Correcting a luminosity function, and saying what bias is left',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['why-the-bright-ones-win'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a completeness curve is, and what a raw count of the stars in a bin leaves out',
    'Correct a luminosity function by weighting each counted star by the volume it could have been seen in',
    'Judge a corrected value against its Poisson error, and say when the correction cannot help',
    'Say what bias is left when the correction uses the catalog’s own magnitudes',
    'State, for a corrected result, an assumption and a residual bias',
  ],
  steps: [
    {
      sid: 'a-survey-that-fades',
      stage: STARS,
      type: 'read',
      title: 'A survey that fades out',
      body: `A real survey does not count every star above its limit. The
             fraction it finds falls as stars grow fainter: the
             <strong>completeness curve</strong>. In this instrument it is a
             curve that is 50 percent at one magnitude and falls over a stated
             width.
             \n\nThe other picture is the <strong>luminosity function</strong>: how many stars
             there are per cubic parsec at each absolute magnitude. Because the
             stars are synthetic, we know the true one (gray). The
             <em>raw</em> count (an open square) just divides the stars counted in each bin by the
             volume of the cone; the <em>corrected</em> value (a dot, with its
             Poisson error) weights each counted star by 1 ÷ the volume in which
             it could have been counted.`,
      tool: CC(SHARP),
    },
    {
      sid: 'predict-the-raw-count',
      stage: STARS,
      type: 'predict',
      reveal: 'raw-against-truth',
      title: 'How much does a raw count lose?',
      body: `The survey has a limit of 20 and is 50 percent complete there, with a sharp edge, so it counts almost every star it can reach. Take the faintest bin, absolute magnitudes 10 to 12, and do not change the instrument yet.`,
      prompt: 'A raw count of that bin will recover&hellip;',
      options: [
        'about half of the stars that are there, because red dwarfs can be seen only nearby',
        'all of them: the survey is nearly complete',
        'almost none of them',
        'more than are there',
      ],
      answer: 0,
      hints: [
        'Remember how far a red dwarf can be seen at a limit of 20, compared with the depth of the cone.',
      ],
      because:
        'About half. Even with a sharp edge, a star of absolute magnitude 11 is lost beyond 630 parsecs, inside a cone 1,000 parsecs deep. The next step reads the number.',
      tool: CC(SHARP),
    },
    {
      sid: 'raw-against-truth',
      stage: STARS,
      type: 'measure',
      title: 'Raw against truth, with a sharp edge',
      body: `The limit is 20 and the survey is 50 percent complete at 20, with
             a sharp edge. In the two faintest bins, read the <strong>raw count as a
             share of the truth</strong>: the bin from M = 8 to 10 and the bin from 10 to 12.`,
      fields: [
        { id: 'b8', label: 'Bin 8 to 10', unit: '%', hint: '96' },
        { id: 'b10', label: 'Bin 10 to 12', unit: '%', hint: '57' },
      ],
      validate: v => {
        if (![v.b8, v.b10].every(Number.isFinite)) return null;
        if (Math.abs(v.b8 - 96.2) <= 2 && Math.abs(v.b10 - 56.7) <= 3) {
          return {
            level: 'ok',
            message:
              'Even with an edge this deep, a raw count loses 43 percent of the faintest bin: a red dwarf of absolute magnitude 11 is lost beyond 630 parsecs, inside the cone. The loss is not random. It is all in the faint end.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the first preset (limit 20, 50 percent at 20) and read the two “raw count, share of the truth” rows.',
        };
      },
      tool: CC(SHARP),
    },
    {
      sid: 'why-raw-is-low',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why is the raw count low?',
      body: `The survey reaches the same limit for every star, but a star of
             absolute magnitude 11 reaches it at 630&nbsp;parsecs and one of
             absolute magnitude 7 at 4,000, which is beyond the cone.`,
      prompt: 'Why does the raw count fall short for the faintest stars?',
      options: [
        'A faint star can be counted in only part of the cone, so the count comes from a smaller volume than the one it is divided by',
        'There are fewer faint stars than the model says',
        'Faint stars are bluer and harder to see',
        'The completeness curve is wrong',
      ],
      answer: 0,
      hints: [
        'Compare the volume in which a faint star can be seen with the volume of the cone.',
      ],
      because:
        'Each faint star can be seen only inside a smaller volume (a distance cubed), so a count divided by the whole cone is too small. Giving each counted star a weight of 1 ÷ its own volume puts the missing stars back.',
      tool: CC(SHARP),
    },
    {
      sid: 'correct-the-fade',
      stage: STARS,
      type: 'measure',
      title: 'Correct a survey that fades early',
      body: `Now the survey is 50 percent complete at magnitude 17, well before
             its limit of 20, and fades over half a magnitude (the second
             preset). Read the <strong>raw count as a share of the truth</strong>
             in the bin from M = 8 to 10, and the <strong>corrected</strong>
             value.`,
      fields: [
        { id: 'raw', label: 'Raw, bin 8 to 10', unit: '%', hint: '13' },
        {
          id: 'fixed',
          label: 'Corrected, bin 8 to 10',
          unit: '',
          hint: '0.97',
        },
      ],
      validate: v => {
        if (![v.raw, v.fixed].every(Number.isFinite)) return null;
        if (Math.abs(v.raw - 13.3) <= 2 && Math.abs(v.fixed - 0.97) <= 0.08) {
          return {
            level: 'ok',
            message:
              'A raw count gets 13 percent of the truth; the weighted count gets 97 percent, with an error of about 6 percent. Knowing the completeness curve turns a hopeless count into a usable one, in a part of the luminosity function where the survey is far from complete.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the second preset (limit 20, 50 percent at 17, width 0.5) and read the raw and corrected rows of the first bin.',
        };
      },
      tool: CC(FADE),
    },
    {
      sid: 'is-it-one',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Is 0.97 equal to 1?',
      body: `The corrected value is 0.97, with a Poisson error of 0.06. It is a
             share of the true value, so 1 would be exact.`,
      prompt: 'How should you read 0.97 ± 0.06?',
      options: [
        'Consistent with 1: the difference is smaller than the error, so the correction recovers the truth to within noise',
        'Wrong: it is not exactly 1',
        'Proof that the survey is complete',
        'Only valid when the survey is complete',
      ],
      answer: 0,
      hints: ['Compare the distance from 1 with the error.'],
      because:
        'Consistent with 1. The difference, 0.03, is half of the error. The error is the part of the answer that is chance: counting 368 stars gives a spread of about 5 percent, and a result inside it neither confirms nor refutes the correction.',
      tool: CC(FADE),
    },
    {
      sid: 'when-it-cannot-help',
      stage: STARS,
      type: 'measure',
      title: 'When a correction cannot help',
      body: `Switch to a poor survey: limit 17, 50 percent at 16, a wide
             fade (the third preset). In the bin from M = 10 to 12, read how
             many stars were <strong>counted</strong> and the Poisson error of the
             corrected value. Each of those stars carries a large weight.`,
      fields: [
        {
          id: 'n',
          label: 'Stars counted, bin 10 to 12',
          unit: '',
          hint: '3',
        },
        {
          id: 'err',
          label: 'Error of the corrected value',
          unit: '',
          hint: '0.46',
        },
      ],
      validate: v => {
        if (![v.n, v.err].every(Number.isFinite)) return null;
        if (Math.abs(v.n - 3) <= 1 && Math.abs(v.err - 0.459) <= 0.06) {
          return {
            level: 'ok',
            message:
              'Three stars stand for the whole bin, and the corrected value, 0.78, comes with an error of 0.46: it says almost nothing. A correction can put a fraction back, but only if some stars of that kind were counted.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the third preset (limit 17, 50 percent at 16, width 1) and read the last bin’s “stars counted” and the number after ± in its corrected row.',
        };
      },
      tool: CC(POOR),
    },
    {
      sid: 'the-catalog-own-magnitudes',
      stage: STARS,
      type: 'measure',
      title: 'Correct with the catalog’s own magnitudes',
      body: `So far the correction used each star’s true absolute magnitude, which only
             a synthetic survey knows. An analyst has the measured apparent
             magnitude and parallax and works the absolute magnitude out from
             them. Go back to the first preset. In the bin from M = 10 to 12, read the corrected value with true magnitudes and the
             value <strong>from the catalog’s own magnitudes</strong>.`,
      fields: [
        {
          id: 'true',
          label: 'Corrected, true magnitudes',
          unit: '',
          hint: '1.00',
        },
        {
          id: 'catalog',
          label: 'Corrected, catalog magnitudes',
          unit: '',
          hint: '1.6',
        },
      ],
      validate: v => {
        if (![v.true, v.catalog].every(Number.isFinite)) return null;
        if (
          Math.abs(v.true - 1.002) <= 0.06 &&
          Math.abs(v.catalog - 1.604) <= 0.12
        ) {
          return {
            level: 'ok',
            message:
              'The same stars, with the same correction, give 1.00 with true magnitudes and 1.60 with the catalog’s: 60 percent too many. A star’s parallax error scatters it between bins, and where bins have a steep number gradient more stars scatter in than out.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the first preset and read the last two rows of the bin from 10 to 12: the corrected value, and the one “from the catalog’s own magnitudes”.',
        };
      },
      tool: CC(SHARP),
    },
    {
      sid: 'state-the-residual',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for stating (1) the assumption the correction rests on, that the completeness function and the limit are known and the stars are spread evenly; (2) that the corrected luminosity function agrees with the truth to within its Poisson error where the survey counted enough stars; and (3) a residual bias with its source and a number: with the catalog’s own magnitudes the faintest bin comes out about 60 percent too high (1.6 against 1.0), because parallax and magnitude errors scatter stars between bins of a steep function. Credit also saying that a bin with three stars carries no usable constraint. Do not credit an answer that says the correction removes all bias, or that gives a corrected number with no error.',
      title: 'Report it',
      body: `You corrected a luminosity function from a survey with a fading
             completeness curve and measured it against a truth that a real
             survey does not give you.`,
      prompt:
        'In three or four sentences, report the corrected result: the assumption, the agreement with the truth, and the bias that remains.',
      tool: CC(SHARP),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A raw count of the stars in a bin is too low for faint stars because
             each can be seen only in part of the cone. Weighting each counted
             star by the volume it could have been seen in recovers the
             luminosity function to within its Poisson error, even for a survey
             that fades long before its limit, as long as some stars of each kind
             were counted. A correction made with the catalog’s own
             magnitudes leaves a bias, here 60 percent in the faintest bin, from the
             errors of the measurement. The result to report is the corrected
             value, its error, the assumption it rests on and the bias that
             remains.`,
      tool: CC(SHARP),
    },
  ],
};

export default THE_COMPLETENESS_CURVE;
