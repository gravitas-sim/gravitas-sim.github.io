// =============================================================================
// Who Gets Counted
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the survey family's "who gets counted" tool
// (js/surveyWidgets.js over js/survey/model.js): synthetic stars of known
// brightness, spread evenly through a cone of space, counted by a survey with
// a magnitude limit. The numbers a student reads are checked against that model
// by tests/surveyInvestigations.test.js (tools/authoring/surveyModels.mjs).
// The stars are a model, not an observation, and the lesson says so.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the stars are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'bright', name: 'A bright star', teffK: 9000, lumSun: 30 },
    { role: 'dwarf', name: 'A red dwarf', teffK: 3300, lumSun: 0.01 },
  ],
};
const SC = (values = {}) => ({ id: 'survey-counts', values });

const WHO_GETS_COUNTED = {
  id: 'who-gets-counted',
  thumbnail: 'images/investigations/who-gets-counted.webp',
  title: 'Who Gets Counted',
  subtitle: 'What a magnitude limit does to a census of the stars',
  duration: '20-35 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a magnitude limit selects: the stars that look bright, not the stars that are common',
    'Measure how much of a synthetic population a survey counts at three limits, and what is in the part it misses',
    'Find how far away a star of a given brightness can be and still be counted',
    'Explain why a catalogue of the brightest stars has a different average brightness from the stars there are',
    'Say why a count of what was found is not a census of what is there',
  ],
  steps: [
    {
      sid: 'a-survey-counts-what-it-sees',
      stage: STARS,
      type: 'read',
      title: 'A census of the sky',
      body: `A survey counts the stars it can see. To see a star, its light has
             to reach the telescope above a limit: the faintest
             <strong>apparent magnitude</strong> the survey records. A star of
             magnitude 18 is a hundred times fainter than one of magnitude 13,
             and a smaller number means brighter.
             \n\nThe instrument below holds a cone of <strong>synthetic</strong>
             stars. They are a model: each has a known brightness, drawn from a
             population of red dwarfs, Sun-like stars and bright giants in the
             proportions that stars are born, and spread evenly through
             1,000&nbsp;parsecs. Because we made them, we know every star the
             survey missed. A real survey never does. Gray dots are missed
             stars, colored dots are counted; the orange line is the limit.`,
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'predict-what-is-missed',
      stage: STARS,
      type: 'predict',
      reveal: 'count-a-shallow-survey',
      title: 'What does a shallow survey miss?',
      body: `The survey has a limit of magnitude 14, which is shallow. Do not
             change the instrument yet.`,
      prompt: 'Most of the stars it misses will be&hellip;',
      options: [
        'the faint ones: stars of low luminosity, mostly red dwarfs',
        'the bright ones, because they are rare',
        'the Sun-like ones, which are neither bright nor faint',
        'a random sample of every kind of star',
      ],
      answer: 0,
      hints: [
        'A star is counted when it looks bright. What makes a star look faint?',
      ],
      because:
        'The faint ones. A star looks faint when it is intrinsically faint or far away, and red dwarfs are both the commonest and the faintest stars, so they are what a shallow survey loses. The next steps measure how many.',
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'count-a-shallow-survey',
      stage: STARS,
      type: 'measure',
      title: 'Count a shallow survey',
      body: `With the limit at <strong>14</strong>, read how many stars the
             survey <strong>counted</strong> and what share of all the stars in
             the cone that is.`,
      fields: [
        { id: 'counted', label: 'Stars counted', unit: 'stars', hint: '167' },
        { id: 'share', label: 'Share of the stars', unit: '%', hint: '6.3' },
      ],
      validate: v => {
        if (![v.counted, v.share].every(Number.isFinite)) return null;
        if (Math.abs(v.counted - 167) <= 8 && Math.abs(v.share - 6.3) <= 0.5) {
          return {
            level: 'ok',
            message:
              'About one star in sixteen is counted. The other fifteen are in the cone, at known places, and the survey never sees them.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Magnitude limit” to 14, then read “Stars counted” and “Share of the stars counted”.',
        };
      },
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'count-a-deep-survey',
      stage: STARS,
      type: 'measure',
      title: 'Go four magnitudes deeper',
      body: `Raise the limit to <strong>18</strong>, a deep survey: a star four
             magnitudes fainter is counted, which is forty times fainter in
             light. Read the number counted and the share again.`,
      fields: [
        { id: 'counted', label: 'Stars counted', unit: 'stars', hint: '1289' },
        { id: 'share', label: 'Share of the stars', unit: '%', hint: '49' },
      ],
      validate: v => {
        if (![v.counted, v.share].every(Number.isFinite)) return null;
        if (
          Math.abs(v.counted - 1289) <= 40 &&
          Math.abs(v.share - 48.7) <= 1.5
        ) {
          return {
            level: 'ok',
            message:
              'Forty times fainter in light brings the survey from one star in sixteen to one in two, not to all of them. Half of the stars in this cone are still missed by a deep survey.',
          };
        }
        return {
          level: 'error',
          message: 'Set “Magnitude limit” to 18 and read the two rows again.',
        };
      },
      tool: SC({ limit: 18, view: 0 }),
    },
    {
      sid: 'what-the-deep-survey-misses',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What is in the other half?',
      body: `At a limit of 18 the instrument lists the share of the
             <em>missed</em> stars that are fainter than an absolute magnitude of
             8, the red dwarfs. Read it.`,
      prompt: 'What is true of the stars a limit of 18 misses?',
      options: [
        'Essentially all of them are faint red dwarfs, fainter than absolute magnitude 8',
        'They are a fair sample of every kind of star',
        'Most are bright stars that were too far away',
        'None of them is a red dwarf',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'fair-sample',
          option: 1,
          say: 'A fair sample would contain bright and faint stars in the proportion they are made. The row says every missed star is faint: the survey did not pick at random, it picked on brightness.',
        },
      ],
      hints: ['Read “Missed stars that are fainter than M = 8”.'],
      because:
        'All of them. A star of absolute magnitude 8 reaches the limit of 18 only at 1,000 parsecs, the edge of the cone, so every star brighter than that is counted wherever it is. What a deep survey loses is the intrinsically faint end of the population, which is also the largest.',
      tool: SC({ limit: 18, view: 0 }),
    },
    {
      sid: 'how-far-can-it-see',
      stage: STARS,
      type: 'measure',
      title: 'How far can a star be?',
      body: `Set the limit back to <strong>14</strong>. The instrument lists the
             distance beyond which a star of a given brightness falls below the
             limit: a Sun-like star (absolute magnitude 4.7) and a red dwarf
             (absolute magnitude 10). Read both.`,
      fields: [
        { id: 'sun', label: 'A star like the Sun', unit: 'pc', hint: '711' },
        { id: 'dwarf', label: 'A red dwarf', unit: 'pc', hint: '63' },
      ],
      validate: v => {
        if (![v.sun, v.dwarf].every(Number.isFinite)) return null;
        if (Math.abs(v.sun - 711) <= 25 && Math.abs(v.dwarf - 63) <= 3) {
          return {
            level: 'ok',
            message:
              'A survey to magnitude 14 would see a Sun-like star out to 700 parsecs, but a red dwarf only to 63. The dwarfs it counts are the ones that happen to be near.',
          };
        }
        return {
          level: 'error',
          message:
            'Use a limit of 14 and read the two rows “A star like the Sun is lost beyond” and “A red dwarf is lost beyond”.',
        };
      },
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'the-average-star',
      stage: STARS,
      type: 'measure',
      title: 'The average star, counted and real',
      body: `At a limit of <strong>14</strong>, read the mean absolute magnitude
             of every star in the cone, and of the stars the survey counted. A
             larger number is a fainter star.`,
      fields: [
        { id: 'all', label: 'Mean of every star', unit: 'mag', hint: '8.3' },
        {
          id: 'counted',
          label: 'Mean of the counted stars',
          unit: 'mag',
          hint: '3.8',
        },
      ],
      validate: v => {
        if (![v.all, v.counted].every(Number.isFinite)) return null;
        if (
          Math.abs(v.all - 8.32) <= 0.15 &&
          Math.abs(v.counted - 3.79) <= 0.2
        ) {
          return {
            level: 'ok',
            message:
              'The stars that were counted are, on average, four and a half magnitudes brighter than the stars there are: a factor of sixty in luminosity. A survey describes what it can see, and that is not the average.',
          };
        }
        return {
          level: 'error',
          message:
            'Use a limit of 14 and read the two “Mean absolute magnitude” rows. The first is every star, the second only the counted ones.',
        };
      },
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'counts-by-magnitude',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Counting by magnitude',
      body: `Change the picture to <strong>the number of stars brighter than
             each magnitude</strong>. The gray line is every star; the colored line is what
             the survey counts. They run together at the bright end and split
             at the limit.`,
      prompt: 'Why do the two lines separate near the limit?',
      options: [
        'Beyond the limit the survey records nothing, though the stars are there',
        'The faint stars do not exist',
        'The telescope gets worse for brighter stars',
        'The gray line is wrong there',
      ],
      answer: 0,
      hints: ['Where does the colored line stop?'],
      because:
        'The survey records nothing fainter than its limit, so its count levels off there, while the stars (the gray line) keep rising. Past the limit the difference is not a fact about the sky.',
      tool: SC({ limit: 16, view: 1 }),
    },
    {
      sid: 'a-count-is-not-a-census',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the survey selects on apparent brightness, so the counted stars are the intrinsically bright or the near ones, and that this makes them a biased sample of the stars there are; and for saying what it misses (the faint red dwarfs, which are the commonest). Credit a number from the instrument (for example 49 percent counted at a limit of 18, or a mean brightness four and a half magnitudes above the truth). Do not credit an answer that says the counted stars are typical, or that the missing ones are unimportant.',
      title: 'A friend reads the catalogue',
      body: `A friend looks at a catalogue of the stars brighter than magnitude 14 and
             says, “Most stars are bright, Sun-like or brighter, so the Galaxy
             is mostly stars like these.”`,
      prompt:
        'In two or three sentences, say what is wrong with the conclusion, using what you measured.',
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A survey counts what is above its magnitude limit. In this model a
             limit of 14 counts one star in sixteen and a limit of 18 counts one
             in two; everything it misses is faint. A Sun-like star can be
             counted out to 700&nbsp;parsecs at the first limit, but a red dwarf
             only to 63. So a catalogue is brighter than the population it was
             drawn from, here by four and a half magnitudes. The next
             investigation measures that bias, and the one after corrects for it.`,
      tool: SC({ limit: 14, view: 0 }),
    },
  ],
};

export default WHO_GETS_COUNTED;
