// =============================================================================
// Which Kind of Variable
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the variable-star family's "variable-class" tool
// (js/variableInstruments.js over js/kernels/variables/classify.js): a labeled
// SYNTHETIC sample of 120 stars, 24 each of RRab, RRc, Cepheid, delta Scuti and
// eclipsing binary, made by the periodic forward model from stylised templates
// and measured by the same pipeline as a real light curve (variables/class-
// sample.json, held to the kernel by a test). It is not survey data and the
// lesson says so. The classifier is k-nearest-neighbours (k = 5) scored leave
// one out. The numbers a student reads are checked by
// tests/variableInvestigations.test.js.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'pulsator', name: 'A pulsating star', teffK: 6800, lumSun: 50 },
    { role: 'binary', name: 'An eclipsing binary', teffK: 9000, lumSun: 30 },
  ],
};
const CLASS = (values = {}) => ({ id: 'variable-class', values });

const WHICH_KIND_OF_VARIABLE = {
  id: 'which-kind-of-variable',
  thumbnail: 'images/investigations/which-kind-of-variable.webp',
  title: 'Which Kind of Variable',
  subtitle:
    'Telling five kinds of variable star apart, and reading a confusion table instead of one answer',
  duration: '12-22 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['the-beat-of-a-star'],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure a variable star by its period, its amplitude and the shape of its light curve',
    'Read a confusion table and say which kinds of star are mistaken for which',
    'Show what each added measurement buys, and why a single accuracy figure hides it',
    'Say what a synthetic, balanced sample does not tell you about a real survey',
  ],
  steps: [
    {
      sid: 'five-kinds-of-star',
      stage: STARS,
      type: 'read',
      title: 'Five kinds of star',
      body: `Surveys find millions of stars whose brightness changes, and no one
             can look at each. A <strong>classifier</strong> sorts them by numbers
             measured from the light curve: the <strong>period</strong>, the
             <strong>amplitude</strong> and the <strong>shape</strong> (here the
             number R21, the strength of the curve’s second harmonic over its
             first, as in the first investigation).
             \n\nThe instrument holds 120 stars, 24 each of five kinds: RR Lyrae
             stars with a sawtooth curve (RRab) and a smoother one (RRc),
             Cepheids, delta Scuti stars and eclipsing binaries. The sample is
             <strong>synthetic</strong>: made by a forward model from stylised
             templates of each kind, with noise, and measured by the same
             pipeline as a real light curve, so the labels are known. The
             classifier gives each star the majority kind of its five nearest
             neighbours among the other 119, and the instrument shows a
             <strong>confusion table</strong>: for each true kind, what it was
             called.`,
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'period-alone',
      stage: STARS,
      type: 'measure',
      title: 'The period alone',
      body: `With “the period only” as what the classifier may use, read the
             <strong>share classified correctly</strong>, and the
             <strong>share found</strong> of the eclipsing binaries.`,
      fields: [
        { id: 'acc', label: 'Classified correctly', unit: '%', hint: '83.3' },
        {
          id: 'ecl',
          label: 'Eclipsing binaries found',
          unit: '%',
          hint: '29.2',
        },
      ],
      validate: v => {
        if (![v.acc, v.ecl].every(Number.isFinite)) return null;
        if (Math.abs(v.acc - 83.3) <= 0.6 && Math.abs(v.ecl - 29.2) <= 0.6) {
          return {
            level: 'ok',
            message:
              '83 percent right overall, and 29 percent for the eclipsing binaries. That one number hides the story: four of the five kinds are found 92 to 100 percent of the time, and one is lost almost completely.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “the period only” and read “Share classified correctly (leave one out)” and the eclipsing binary’s “share found”, both as percentages.',
        };
      },
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'read-the-table',
      stage: STARS,
      type: 'measure',
      title: 'Reading the confusion table',
      body: `Each “Truly …, called” row counts the stars of one true kind by
             what the classifier called them. Look at the row for the
             <strong>eclipsing binaries</strong>: read how many were called
             <strong>RRab</strong> and how many were called
             <strong>eclipsing</strong>.`,
      fields: [
        {
          id: 'rrab',
          label: 'Eclipsing binaries called RRab',
          unit: '',
          hint: '6',
        },
        {
          id: 'right',
          label: 'Eclipsing binaries called eclipsing',
          unit: '',
          hint: '7',
        },
      ],
      validate: v => {
        if (![v.rrab, v.right].every(Number.isFinite)) return null;
        if (v.rrab === 6 && v.right === 7) {
          return {
            level: 'ok',
            message:
              '6 called RRab and 7 correct, out of 24; the rest were called RRc (5), Cepheid (4) and delta Scuti (2). The errors are not random: an eclipsing binary is taken for whichever pulsator has a similar period.',
          };
        }
        return {
          level: 'error',
          message:
            'Find the row beginning “Truly an eclipsing binary, called” and read the counts after “RRab” and after “eclipsing”.',
        };
      },
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'why-the-eclipsers-are-lost',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why the binaries are lost',
      body: `Look at the picture: with period alone, the eclipsing binaries
             spread across the same periods as the pulsators. A period search on
             an eclipsing binary finds half the orbital period, because the star
             dims twice in each orbit, nearly equally.`,
      prompt:
        'Why can the period alone not tell an eclipsing binary from a pulsator?',
      options: [
        'Eclipsing binaries do not vary in brightness',
        'Their periods fall in the same range as the pulsators’, so a period says little about which kind it is',
        'The classifier has no eclipsing binaries to learn from',
        'Binaries are always too faint to measure',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'no-variation',
          option: 0,
          say: 'An eclipsing binary dims by a large amount at each eclipse. It varies; it is the period it shares with other kinds that gives it away only poorly.',
        },
        {
          id: 'no-training',
          option: 2,
          say: 'There are 24 of them in the sample, the same as every other kind. The overlap is in the numbers, not the training.',
        },
      ],
      hints: [
        'Look at where the eclipsing binaries sit along the period axis in the picture.',
      ],
      because:
        'Period is a single number, and several kinds share the range from a few hours to a few days. The other measurements (how big the swing is and the shape of the curve) differ much more between the kinds.',
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'predict-the-amplitude',
      stage: STARS,
      type: 'predict',
      reveal: 'add-the-amplitude',
      title: 'Add the amplitude',
      body: `Now let the classifier use the amplitude as well as the period. Do
             not change the instrument yet.`,
      prompt: 'The kind of star that improves most will be&hellip;',
      options: [
        'the RR Lyrae stars with the sawtooth curve',
        'the delta Scuti stars',
        'the eclipsing binaries',
        'the Cepheids',
      ],
      answer: 2,
      hints: ['Which kind was found least often with the period alone?'],
      because:
        'The eclipsing binaries: they had the most room to improve, and a typical eclipse is deeper or shallower than a pulsation, which separates them from several pulsators. The next step reads the new numbers.',
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'add-the-amplitude',
      stage: STARS,
      type: 'measure',
      title: 'Period and amplitude',
      body: `Choose “the period and the amplitude”. Read the share classified
             correctly and the share found of the eclipsing binaries.`,
      fields: [
        { id: 'acc', label: 'Classified correctly', unit: '%', hint: '90.8' },
        {
          id: 'ecl',
          label: 'Eclipsing binaries found',
          unit: '%',
          hint: '54.2',
        },
      ],
      validate: v => {
        if (![v.acc, v.ecl].every(Number.isFinite)) return null;
        if (Math.abs(v.acc - 90.8) <= 0.6 && Math.abs(v.ecl - 54.2) <= 0.6) {
          return {
            level: 'ok',
            message:
              '91 percent overall; eclipsing binaries 54 percent, up from 29, and all four pulsator kinds found without a miss. The amplitude helps most where the period was weakest, but half the binaries are still lost.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “the period and the amplitude” and read “Share classified correctly (leave one out)” and the eclipsing binary’s “share found”.',
        };
      },
      tool: CLASS({ features: 1, view: 0 }),
    },
    {
      sid: 'the-shape',
      stage: STARS,
      type: 'measure',
      title: 'Add the shape',
      body: `Choose “the period, the amplitude and the shape”, and set the
             picture to “Shape (R21) against period”. Read the share classified
             correctly and the share found of the eclipsing binaries.`,
      fields: [
        { id: 'acc', label: 'Classified correctly', unit: '%', hint: '99.2' },
        {
          id: 'ecl',
          label: 'Eclipsing binaries found',
          unit: '%',
          hint: '100',
        },
      ],
      validate: v => {
        if (![v.acc, v.ecl].every(Number.isFinite)) return null;
        if (Math.abs(v.acc - 99.2) <= 0.6 && Math.abs(v.ecl - 100) <= 0.6) {
          return {
            level: 'ok',
            message:
              '99 percent, and every eclipsing binary found. An eclipse is a narrow dip in a flat light curve, so its second harmonic is nearly as strong as its first (R21 about 0.9), where a pulsator’s is at most about half. One star in 120 is still wrong: a delta Scuti called an RRc.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “the period, the amplitude and the shape” and read “Share classified correctly (leave one out)” and the eclipsing binary’s “share found”.',
        };
      },
      tool: CLASS({ features: 2, view: 1 }),
    },
    {
      sid: 'what-a-single-number-hides',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What one number hides',
      body: `A classifier that reports 99 percent accuracy sounds finished.`,
      prompt:
        'What does the confusion table tell you that the accuracy does not?',
      options: [
        'Nothing: accuracy already says how good a classifier is',
        'Which kinds are taken for which and how often each kind is found, and the accuracy itself depends on how many stars of each kind the sample holds',
        'How confident the classifier is in each star',
        'Whether the labels themselves are right',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'enough',
          option: 0,
          say: 'The period-only accuracy was 83 percent, and it hid a kind found only 29 percent of the time. One number averages over the kinds.',
        },
        {
          id: 'confidence',
          option: 2,
          say: 'This classifier gives a vote, not a confidence, and the table is a count of outcomes. Neither tells you how sure it was of one star.',
        },
      ],
      hints: [
        'Compare the 83 percent with the 29 percent of the eclipsing binaries, and ask what a sample with many more binaries would have given.',
      ],
      because:
        'The table says where the errors are, so you can see which kind is in trouble and what to measure to fix it. And because accuracy is an average over the kinds, weighted by how many of each there are, a sample with many binaries and few pulsators would give a worse figure from the same classifier. A real sky is not balanced, so the figure here does not transfer to a survey.',
      tool: CLASS({ features: 2, view: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `With the period alone, 83 percent of a balanced synthetic sample of
             five kinds is classified correctly, but eclipsing binaries only 29
             percent of the time, taken for pulsators of similar period. The
             amplitude lifts that to 54 percent, and the shape of the curve to
             100, with 99 percent overall. A confusion table shows which kinds
             are mistaken for which, and the accuracy depends on the mix of
             kinds in the sample.
             \n\nThe sample is synthetic and stylised: five kinds only, no
             blends, no outbursts, no second periods, and an eclipsing binary’s
             period search lands on half the orbit. A real survey is
             unbalanced and has stars outside these five. This shows how the
             method works; it does not say how well a particular survey’s
             classifier performs.`,
      tool: CLASS({ features: 2, view: 1 }),
    },
  ],
};

export default WHICH_KIND_OF_VARIABLE;
