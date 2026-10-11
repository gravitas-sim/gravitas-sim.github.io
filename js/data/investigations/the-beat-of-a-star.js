// =============================================================================
// The Beat of a Star
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the variable-star family's "variable-fold" tool
// (js/variableWidgets.js over js/kernels/variables): two authentic TESS
// light curves (SU Draconis, an RR Lyrae star, and Eta Aquilae, a Cepheid) and
// SU Draconis kept once a night, a period search on each and a fold. The numbers
// a student reads are checked against that pipeline by
// tests/variableInvestigations.test.js. Not modeled: the TESS band is not V,
// and the bootstrap treats points as independent, so its error is a floor.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'rrlyrae', name: 'SU Draconis', teffK: 6800, lumSun: 50 },
    { role: 'cepheid', name: 'Eta Aquilae', teffK: 5700, lumSun: 2000 },
  ],
};
const FOLD = (values = {}) => ({ id: 'variable-fold', values });
const SEARCH = { star: 0, view: 1, multiple: 1, offset: 0 };

const THE_BEAT_OF_A_STAR = {
  id: 'the-beat-of-a-star',
  thumbnail: 'images/investigations/the-beat-of-a-star.webp',
  title: 'The Beat of a Star',
  subtitle:
    'Finding a pulsating star’s period, and the false periods of a telescope that looks once a night',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Find a pulsating star’s period from a light curve with a period search, and fold the light on it',
    'Give a period with an error, and say why a run of few cycles gives a wider peak and a larger error',
    'Show that a wrong fold period smears the curve and that twice the period shows two copies of it',
    'Explain why observing once a night puts false peaks in the period search, and where they fall',
  ],
  steps: [
    {
      sid: 'a-star-that-repeats',
      stage: STARS,
      type: 'read',
      title: 'A star that repeats',
      body: `Some stars swell and shrink on a schedule, and their brightness
             rises and falls with them. SU Draconis, an RR Lyrae star, does it
             in about sixteen hours. The instrument holds a real light curve of
             it from NASA’s TESS space telescope: 1,799 binned points over
             26 days. Brighter is up.
             \n\nTo find the <strong>period</strong> you do not count by eye.
             A <strong>period search</strong> tries every trial period and
             scores how well a smooth repeating curve of that period fits the
             points; the score, called the power, peaks at the period the star
             really has. <strong>Folding</strong> then lays every cycle on top
             of the others by plotting brightness against phase, the fraction of
             a period since the same point in the cycle. Choose “The period
             search” and then “Folded on a period” under “Picture” to see both.`,
      tool: FOLD({ star: 0, view: 0 }),
    },
    {
      sid: 'the-first-period',
      stage: STARS,
      type: 'measure',
      title: 'The first period',
      body: `With “SU Draconis, the whole run” and the picture set to “The
             period search”, read the <strong>period at the highest peak</strong>
             and the <strong>width of that peak</strong> at half its height. The
             width says how well the run can tell one period from a nearby one.`,
      fields: [
        { id: 'peak', label: 'Highest peak', unit: 'd', hint: '0.6604' },
        { id: 'width', label: 'Width of the peak', unit: 'd', hint: '0.0167' },
      ],
      validate: v => {
        if (![v.peak, v.width].every(Number.isFinite)) return null;
        if (
          Math.abs(v.peak - 0.6604) <= 0.002 &&
          Math.abs(v.width - 0.0167) <= 0.003
        ) {
          return {
            level: 'ok',
            message:
              'A period of 0.6604 days, 15.85 hours, with a peak 0.0167 days wide. The peak is narrow because the run holds almost forty cycles: a wrong period would put the later cycles badly out of step with the first.',
          };
        }
        return {
          level: 'error',
          message:
            'Pick “SU Draconis (an RR Lyrae star), the whole run” and “The period search”, then read “Highest peak of the period search” and “Width of that peak (at half power)”, both in days.',
        };
      },
      tool: FOLD(SEARCH),
    },
    {
      sid: 'fold-it',
      stage: STARS,
      type: 'measure',
      title: 'Fold it, and give an error',
      body: `The peak of the search is a first guess. The instrument refines it by
             fitting a repeating curve made of a few sine waves, and gives its
             error by <strong>bootstrap</strong>: it redoes the search on many
             re-drawn copies of the data and takes the spread of the answers.
             Read the refined <strong>period</strong>, its <strong>error</strong>
             and the star’s <strong>amplitude</strong>, the full height of the
             folded curve in magnitudes.`,
      fields: [
        { id: 'period', label: 'Period', unit: 'd', hint: '0.66041' },
        { id: 'error', label: 'Period error', unit: 'd', hint: '0.00015' },
        { id: 'amp', label: 'Amplitude', unit: 'mag', hint: '0.712' },
      ],
      validate: v => {
        if (![v.period, v.error, v.amp].every(Number.isFinite)) return null;
        if (
          Math.abs(v.period - 0.66041) <= 0.0003 &&
          Math.abs(v.error - 0.00015) <= 0.00006 &&
          Math.abs(v.amp - 0.712) <= 0.01
        ) {
          return {
            level: 'ok',
            message:
              '0.66041 ± 0.00015 days, a precision of 0.02 percent, and a star that varies by 0.71 magnitudes, a factor of 1.9 in brightness, in the TESS band. The published period is 0.66042 days: this run gets it to a part in 100,000. The bootstrap treats the points as independent, so its error is a floor.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Folded on a period” (or stay on the search) and read “Period (refined with a Fourier series)”, “Period error (bootstrap)” and “Amplitude, peak to peak”.',
        };
      },
      tool: FOLD({ star: 0, view: 2, multiple: 1, offset: 0 }),
    },
    {
      sid: 'predict-twice-the-period',
      stage: STARS,
      type: 'predict',
      reveal: 'fold-on-twice-the-period',
      title: 'Fold on twice the period',
      body: `Suppose you fold the light on <strong>twice</strong> the star’s
             period. Do not change the instrument yet.`,
      prompt: 'On the fold, the points will&hellip;',
      options: [
        'fall on one thin curve, exactly as they did before',
        'fall on one thin curve that shows the same shape twice in each fold',
        'scatter into a cloud with no curve in it',
        'fall on a thin curve only half as tall',
      ],
      answer: 1,
      hints: [
        'Two true cycles now fit in each fold. Are the two cycles different from each other?',
      ],
      because:
        'The same shape twice in each fold. Every true cycle is the same, so two of them side by side make a curve that repeats once inside the fold. A fold on twice the period (or any whole multiple) is not wrong, only redundant: this is why the shortest period that folds the curve onto itself is the one to report. The next step puts it on the screen.',
      tool: FOLD({ star: 0, view: 2, multiple: 1, offset: 0 }),
    },
    {
      sid: 'fold-on-twice-the-period',
      stage: STARS,
      type: 'measure',
      title: 'Twice the period',
      body: `Set “Fold on” to <strong>twice the period</strong> and read the
             period the fold uses. Look at the picture: it shows two cycles of
             phase, so the shape should appear four times.`,
      fields: [
        {
          id: 'fold',
          label: 'Period the fold uses',
          unit: 'd',
          hint: '1.3208',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.fold)) return null;
        if (Math.abs(v.fold - 1.3208) <= 0.002) {
          return {
            level: 'ok',
            message:
              '1.3208 days, twice 0.66041. The curve is as thin as before and now repeats inside the fold. Try “half the period” as well: each fold then covers half a cycle, and the two halves of the true curve land on top of each other as a band, not a single curve.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Fold on” to “twice the period”, with “Folded on a period” as the picture, then read “Period the fold uses”.',
        };
      },
      tool: FOLD({ star: 0, view: 2, multiple: 2, offset: 0 }),
    },
    {
      sid: 'a-slightly-wrong-period',
      stage: STARS,
      type: 'measure',
      title: 'A period that is two percent off',
      body: `Back to “the period”. Move the slider “Period, above or below the
             best one” to <strong>+2 percent</strong> and watch the folded
             curve spread into a band. Read the period the fold uses.`,
      fields: [
        {
          id: 'fold',
          label: 'Period the fold uses',
          unit: 'd',
          hint: '0.6736',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.fold)) return null;
        if (Math.abs(v.fold - 0.6736) <= 0.0008) {
          return {
            level: 'ok',
            message:
              '0.6736 days, 0.013 days too long. That sounds small, but it is a fresh error in every cycle, and 39 cycles of them add up: the last cycle is most of a cycle out of step with the first, so the points no longer line up. A period search is a search for the period at which they do.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Fold on” to “the period”, “Period, above or below the best one” to +2.0 %, and read “Period the fold uses”.',
        };
      },
      tool: FOLD({ star: 0, view: 2, multiple: 1, offset: 2 }),
    },
    {
      sid: 'a-second-star',
      stage: STARS,
      type: 'measure',
      title: 'A second star',
      body: `Eta Aquilae is a Cepheid, a much larger star that pulses far more
             slowly. Choose it, and read its refined <strong>period</strong>,
             the <strong>error</strong> on it, and the <strong>number of
             cycles</strong> the run covers.`,
      fields: [
        { id: 'period', label: 'Period', unit: 'd', hint: '7.226' },
        { id: 'error', label: 'Period error', unit: 'd', hint: '0.030' },
        { id: 'cycles', label: 'Cycles in the run', unit: '', hint: '3.68' },
      ],
      validate: v => {
        if (![v.period, v.error, v.cycles].every(Number.isFinite)) return null;
        if (
          Math.abs(v.period - 7.226) <= 0.04 &&
          Math.abs(v.error - 0.03) <= 0.01 &&
          Math.abs(v.cycles - 3.68) <= 0.06
        ) {
          return {
            level: 'ok',
            message:
              '7.226 ± 0.030 days over 3.7 cycles. The published period is 7.177 days, which is 0.7 percent away. The error here is 0.4 percent of the period, against 0.02 percent for SU Draconis, and the peak in the period search is 2.1 days wide: with so few cycles the run cannot tell nearby periods apart.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Eta Aquilae (a Cepheid), the whole run” and read “Period (refined with a Fourier series)”, “Period error (bootstrap)” and “Cycles in the run”.',
        };
      },
      tool: FOLD({ star: 1, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'why-the-error-is-bigger',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why the larger error',
      body: `Eta Aquilae’s period is known to 0.4 percent and SU Draconis’s to
             0.02 percent, from the same telescope and the same method.`,
      prompt: 'Which statement explains the difference best?',
      options: [
        'Cepheids pulse less regularly than RR Lyrae stars',
        'The run covers 3.7 cycles of Eta Aquilae and 39 of SU Draconis, so its search peak is wider and its period less well fixed',
        'TESS is less sensitive to Cepheids',
        'The bootstrap does not work for periods longer than a day',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'regularity',
          option: 0,
          say: 'Both stars repeat very closely. The difference here is not in the stars but in how many cycles one 27-day run can hold.',
        },
        {
          id: 'sensitivity',
          option: 2,
          say: 'Eta Aquilae is bright and well measured; if anything it saturates the detector, which is a different problem. The error is set mostly by the number of cycles.',
        },
      ],
      hints: [
        'Compare the cycles in each run and the widths of the two peaks.',
      ],
      because:
        'A peak’s width is about the period squared over the length of the run, so a 7-day period in a 27-day run has a peak about 2 days wide, while a 0.66-day period in a run of the same length has one about 0.017 days wide. To pin down a long period you need a long run.',
      tool: FOLD({ star: 1, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'predict-once-a-night',
      stage: STARS,
      type: 'predict',
      reveal: 'once-a-night',
      title: 'A telescope on the ground',
      body: `A telescope on the ground sees SU Draconis once a night, at about
             the same hour, because the Sun gets in the way the rest of the day.
             The instrument keeps only one bin a day of the same TESS data, 178
             points. Do not change the instrument yet.`,
      prompt: 'The highest peak of the period search will be&hellip;',
      options: [
        'at 0.66 days again: the points still carry the same information',
        'at a different period, with the true period still a peak almost as high',
        'nowhere: with so few points no peak can be found',
        'at half the true period',
      ],
      answer: 1,
      hints: [
        'Think about what a once-a-night observer would see if the star repeated exactly once per day.',
      ],
      because:
        'At a different period, with the true one nearly as high. Sampling once a day cannot tell a rhythm from the same rhythm shifted by one cycle per day, so the data fit several periods about equally. The next step reads them.',
      tool: FOLD({ star: 2, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'once-a-night',
      stage: STARS,
      type: 'measure',
      title: 'Once a night',
      body: `Choose “SU Draconis, seen once a night” with the period search.
             Read the <strong>period at the highest peak</strong> and the
             <strong>width of that peak</strong>.`,
      fields: [
        { id: 'peak', label: 'Highest peak', unit: 'd', hint: '1.972' },
        { id: 'width', label: 'Width of the peak', unit: 'd', hint: '0.212' },
      ],
      validate: v => {
        if (![v.peak, v.width].every(Number.isFinite)) return null;
        if (
          Math.abs(v.peak - 1.972) <= 0.02 &&
          Math.abs(v.width - 0.212) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'The highest peak is at 1.97 days, three times the star’s true period, and it is the wrong answer. The search also has peaks at 0.66 and 0.40 days that are within about two percent of it in power; with these data nothing in the numbers says which is the star. Folded on 1.97 days the star seems to vary by 1.45 magnitudes, twice the 0.71 of the whole run.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “SU Draconis, seen once a night” and “The period search”, then read “Highest peak of the period search” and “Width of that peak (at half power)”.',
        };
      },
      tool: FOLD({ star: 2, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'the-false-periods',
      stage: STARS,
      type: 'measure',
      title: 'Where the false peaks fall',
      body: `Go back to the whole run of SU Draconis, where the true period is
             not in doubt, and read the two <strong>aliases</strong> the
             instrument lists: the periods that a once-a-day sampling would
             confuse with it, one per day longer in frequency and one per day
             shorter.`,
      fields: [
        { id: 'a1', label: 'First alias', unit: 'd', hint: '1.945' },
        { id: 'a2', label: 'Second alias', unit: 'd', hint: '0.3977' },
      ],
      validate: v => {
        if (![v.a1, v.a2].every(Number.isFinite)) return null;
        if (
          Math.abs(v.a1 - 1.945) <= 0.01 &&
          Math.abs(v.a2 - 0.3977) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              '1.945 and 0.398 days: peaks near exactly those periods stand in the once-a-night search, one of them the highest. An alias is a frequency that differs from the true one by a whole number of samplings per day. The true frequency is 1.514 per day, and 1.514 − 1 and 1.514 + 1 give 1.945 days and 0.398 days.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “SU Draconis (an RR Lyrae star), the whole run”, then read “First alias, 1 per day longer” and “Second alias, 1 per day shorter”.',
        };
      },
      tool: FOLD(SEARCH),
    },
    {
      sid: 'why-aliases',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why aliases',
      body: `The false peaks sit at 1.945 and 0.398 days, and the true period is
             0.660 days.`,
      prompt: 'What makes a once-a-night search produce them?',
      options: [
        'Noise in the data that happens to repeat',
        'Observing at the same time every day cannot tell a frequency from that frequency plus or minus one per day',
        'The star has three different periods',
        'The Fourier series adds extra periods of its own',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'noise',
          option: 0,
          say: 'The same data, kept at every cadence, give no false peaks. They come from the pattern of the observation times, not from noise.',
        },
        {
          id: 'three-periods',
          option: 2,
          say: 'The star has one period. The other peaks are what the sampling makes of it.',
        },
      ],
      hints: [
        'A clock that is looked at once a day shows the same hour whatever its speed, to within a whole number of turns.',
      ],
      because:
        'Each night the star is seen at one moment of its cycle, and a star that gains exactly a cycle between visits looks the same as one that gains none. The remedies are to observe at varied times, to add a site at another longitude, or to keep a long run, which is what TESS does.',
      tool: FOLD({ star: 2, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A period search scores every trial period and peaks at the star’s;
             folding on it stacks the cycles into one curve, and a bootstrap
             gives an error. SU Draconis’s 0.66041 ± 0.00015 days comes from
             nearly forty cycles; Eta Aquilae’s 7.226 ± 0.030 days from fewer
             than four, so its peak is wide. A period that is two percent off
             smears the fold, and twice the period shows the shape twice. Seen
             once a night the same star gives a highest peak at 1.97 days, three
             times its real period, with equal peaks at 0.66 and 0.40: the
             aliases that sampling makes.
             \n\nThis is the first step toward the distance ladder: a
             Cepheid’s period tells you how luminous it is. Left out here: the
             TESS band is not the V band; the bootstrap treats the points as
             independent, so its errors are floors; and pulsar timing, which
             needs a different method, is not modeled.`,
      tool: FOLD({ star: 0, view: 2, multiple: 1, offset: 0 }),
    },
  ],
};

export default THE_BEAT_OF_A_STAR;
