// =============================================================================
// Why the Bright Ones Win
// -----------------------------------------------------------------------------
// Content only, no imports (see who-gets-counted.js for the conventions). The
// instrument is the survey family's Malmquist tool (js/surveyWidgets.js over
// js/survey/model.js): the same synthetic survey, grouped by distance, with the
// Malmquist bias of a magnitude limit and the bias of trusting only parallaxes
// that were measured well. Numbers are checked by
// tests/surveyInvestigations.test.js (tools/authoring/surveyModels.mjs).
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'near', name: 'A near star', teffK: 5000, lumSun: 0.4 },
    { role: 'far', name: 'A far star', teffK: 9000, lumSun: 30 },
  ],
};
const MM = (values = {}) => ({ id: 'malmquist', values });

const WHY_THE_BRIGHT_ONES_WIN = {
  id: 'why-the-bright-ones-win',
  thumbnail: 'images/investigations/why-the-bright-ones-win.webp',
  title: 'Why the Bright Ones Win',
  subtitle: 'Malmquist bias, measured against a truth we know',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['who-gets-counted'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure how much brighter the counted stars are than the stars there are, in shells of distance',
    'Explain why the bias grows with distance: a limit admits only the intrinsically bright stars from far away',
    'Compare a measured Malmquist bias with its closed form for standard candles with a scatter',
    'Say why selecting on a well-measured parallax makes the stars look fainter than they are',
    'Say what each bias does to a distance or a luminosity worked out from a catalog',
  ],
  steps: [
    {
      sid: 'the-same-survey-by-distance',
      stage: STARS,
      type: 'read',
      title: 'The same survey, by distance',
      body: `The last investigation found that a survey counts the bright stars.
             Here the stars are grouped into <strong>shells</strong> of
             distance, and for each shell the instrument compares the stars the
             survey <em>counted</em> with <em>all</em> the stars in the shell.
             Both are synthetic stars of known brightness.
             \n\nThe difference is the <strong>Malmquist bias</strong>
             (Malmquist, 1920 and 1936): in a magnitude-limited sample, the
             average star is brighter than the average star there is. Read it
             as magnitudes; a larger number means the counted stars are
             brighter by that much.`,
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
    {
      sid: 'predict-the-shells',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-the-shells',
      title: 'Near and far',
      body: `The survey has a limit of 16. Compare the stars counted in the
             nearest shell with all the stars there, and in the farthest shell
             with all the stars there. Do not change the instrument yet.`,
      prompt: 'How will the bias in the far shell compare with the near shell?',
      options: [
        'It will be larger: the counted stars are brighter, compared with the stars that are there',
        'It will be the same: the survey treats every shell alike',
        'It will be smaller: far stars are all alike',
        'There will be no bias in any shell',
      ],
      answer: 0,
      hints: [
        'The limit is the same everywhere. What does that do to which stars are bright enough at a large distance?',
      ],
      because:
        'Larger. The limit is one apparent magnitude, but a star far away needs a greater intrinsic brightness to reach it. So the farther the shell, the more only the brightest of its stars are counted and the larger the bias.',
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
    {
      sid: 'measure-the-shells',
      stage: STARS,
      type: 'measure',
      title: 'Measure the bias in two shells',
      body: `With the limit at <strong>16</strong> and the stars set to the
             <strong>stellar population</strong>, read the bias in the nearest
             shell (0–250&nbsp;pc) and the farthest (750–1,000&nbsp;pc): how many
             magnitudes brighter the counted stars are.`,
      fields: [
        { id: 'near', label: 'Shell 0–250 pc', unit: 'mag', hint: '0.5' },
        { id: 'far', label: 'Shell 750–1,000 pc', unit: 'mag', hint: '3.6' },
      ],
      validate: v => {
        if (![v.near, v.far].every(Number.isFinite)) return null;
        if (Math.abs(v.near - 0.5) <= 0.15 && Math.abs(v.far - 3.56) <= 0.25) {
          return {
            level: 'ok',
            message:
              'Half a magnitude in the nearest shell, three and a half in the farthest: a factor of about twenty-six in luminosity. In the far shell only 14 percent of the stars are counted, and they are the brightest of them.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the limit to 16 and the stars to the stellar population, then read the number after “brighter by” in the first and the last shell rows.',
        };
      },
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
    {
      sid: 'why-it-grows',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why does it grow?',
      body: `A star of absolute magnitude M appears at m = M + 5 log<sub>10</sub>(d ÷ 10 pc).
             At a limit of 16, a star at 100&nbsp;pc must have M below 11;
             at 1,000&nbsp;pc it must have M below 6.`,
      prompt: 'What does the limit do to the stars of a far shell?',
      options: [
        'It admits only the intrinsically bright ones, so the counted stars are a brighter and brighter sample',
        'It makes the far stars look closer',
        'It removes the near stars',
        'It changes how bright the stars really are',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'stars-change',
          option: 3,
          say: 'The stars are not changed by being far away or by being counted. Their brightness is fixed in the model; only which ones reach the survey depends on the limit.',
        },
      ],
      hints: [
        'Compare the M that a star needs at 100 pc with the M it needs at 1,000 pc.',
      ],
      because:
        'Only the bright ones. The brightness a star needs rises by five magnitudes for every factor of ten in distance, so the cut moves up the luminosity function, and the counted stars become a brighter sample of the population.',
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
    {
      sid: 'standard-candles',
      stage: STARS,
      type: 'measure',
      title: 'Standard candles with a scatter',
      body: `The textbook case: stars that are nearly the same brightness, with a
             scatter of 0.7 magnitude. Set the stars to <strong>standard
             candles</strong> (limit 16). Read the bias <em>at the limit</em>,
             among stars in the last half magnitude before it, and
             <strong>Malmquist’s closed form</strong>, −1.382&nbsp;σ², with
             σ = 0.7. Enter both with the sign the instrument shows.`,
      fields: [
        {
          id: 'measured',
          label: 'Bias at the limit',
          unit: 'mag',
          hint: '-0.65',
        },
        { id: 'formula', label: 'Closed form', unit: 'mag', hint: '-0.68' },
      ],
      validate: v => {
        if (![v.measured, v.formula].every(Number.isFinite)) return null;
        if (
          Math.abs(v.measured + 0.645) <= 0.12 &&
          Math.abs(v.formula + 0.677) <= 0.02
        ) {
          return {
            level: 'ok',
            message:
              'The measured bias and the formula agree to within the scatter of a finite sample of stars. The formula is a result about a uniform field: it needs no particular distance, only that the stars are spread evenly and the survey is cut on apparent magnitude.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Stars in the cone” to standard candles and the limit to 16, then read “At the limit” and the closed form.',
        };
      },
      tool: MM({ limit: 16, lf: 1, snr: 5 }),
    },
    {
      sid: 'double-the-scatter',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Double the scatter',
      body: `The closed form is −1.382&nbsp;σ². Suppose the stars were not
             0.7 magnitude apart but 1.4: twice as spread out.`,
      prompt: 'The bias becomes&hellip;',
      options: [
        'four times as large, because it goes as the square of the scatter',
        'twice as large',
        'unchanged: the bias does not depend on the scatter',
        'about 1.4 times as large',
      ],
      answer: 0,
      hints: ['Square both scatters and compare.'],
      because:
        'Four times: σ goes from 0.7 to 1.4 and σ² from 0.49 to 1.96. A population with a wide luminosity function, like the real stars, has a large bias; a clean standard candle has almost none, which is why they are prized.',
      tool: MM({ limit: 16, lf: 1, snr: 5 }),
    },
    {
      sid: 'a-second-bias',
      stage: STARS,
      type: 'measure',
      title: 'A second bias: trusting the good parallaxes',
      body: `A catalog gives parallaxes, and an analyst may keep only stars
             whose parallax is well measured, say at least 3 times its error.
             Set the limit to <strong>18</strong>, the stars to the
             <strong>population</strong> and the parallax cut to
             <strong>3</strong>. (This instrument measures parallax less well
             than Gaia.) Read how much too large the measured parallaxes in the
             sample are, and how much too faint the absolute magnitudes worked
             out from them come out.`,
      fields: [
        { id: 'plx', label: 'Parallaxes too large by', unit: '%', hint: '18' },
        {
          id: 'dM',
          label: 'Absolute magnitudes too faint by',
          unit: 'mag',
          hint: '0.25',
        },
      ],
      validate: v => {
        if (![v.plx, v.dM].every(Number.isFinite)) return null;
        if (Math.abs(v.plx - 18.1) <= 1.5 && Math.abs(v.dM - 0.25) <= 0.04) {
          return {
            level: 'ok',
            message:
              'The measured parallaxes are 18 percent too large, so the stars look 18 percent closer and are worked out to be 0.25 magnitude fainter than they are. Stars scatter into a sample selected on parallax from the far side, where there are more of them.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the limit to 18, the stars to the population and the parallax cut to 3, then read the last two rows.',
        };
      },
      tool: MM({ limit: 18, lf: 0, snr: 3 }),
    },
    {
      sid: 'raise-the-cut',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Raise the cut',
      body: `Set the parallax cut to <strong>10</strong> (limit 18). The
             bias nearly disappears, to about 1 percent. The row above shows the
             stars that were left.`,
      prompt: 'What did the stricter cut cost?',
      options: [
        'Most of the sample, and the stars that remain are the nearest and brightest, which is another selection',
        'Nothing: a stricter cut is always better',
        'The bias came back in the other direction',
        'It made the parallaxes less accurate',
      ],
      answer: 0,
      hints: ['Compare the number of stars with a cut of 3 and of 10.'],
      because:
        'Most of the sample: 82 stars remain from 471. They are the ones near enough to be measured well, so the bias in parallax is gone and the Malmquist bias of the survey, which grew with distance, is still there. Each cure is a new selection.',
      tool: MM({ limit: 18, lf: 0, snr: 10 }),
    },
    {
      sid: 'say-what-follows',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for stating both biases and their direction: a magnitude limit counts stars that are brighter than the population, increasingly so with distance (Malmquist, a few magnitudes in the far shell); a cut on measured parallax gives parallaxes that are too large and absolute magnitudes too faint (by 0.25 mag at a cut of 3 sigma in this model). Credit saying what they do to a result: an average luminosity worked out from a magnitude-limited catalog is too bright, one worked out from parallax-selected stars is too faint. Credit naming a fix (a volume-limited sample, or weighting by the volume each star could be seen in). Do not credit an answer that says either bias goes away with more stars.',
      title: 'What follows',
      body: `A student averages the absolute magnitudes of every star in a
             catalog with a limit of 16 and says, “That is the average
             brightness of stars in the Galaxy.”`,
      prompt:
        'In two or three sentences, say which bias this ignores, in which direction it pushes the answer, and one way to avoid it.',
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A magnitude limit admits only the intrinsically bright stars from
             far away, so the counted stars are brighter than the stars there
             are: here by half a magnitude near and three and a half far. For
             standard candles the bias at the limit is −1.382&nbsp;σ², and
             the measured value agrees. Selecting on a well-measured parallax
             adds the opposite error to a luminosity: it makes stars look
             closer and fainter. Both biases come from how stars were
             selected, not from how they were measured. The next investigation
             corrects for one of them.`,
      tool: MM({ limit: 16, lf: 0, snr: 5 }),
    },
  ],
};

export default WHY_THE_BRIGHT_ONES_WIN;
