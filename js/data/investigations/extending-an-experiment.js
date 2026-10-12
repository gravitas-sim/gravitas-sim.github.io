// =============================================================================
// Extending an Experiment
// -----------------------------------------------------------------------------
// Content only, no imports. The companion of the compute page's notebook
// "population-at-scale" (Roadmap II Prompt 102, COMPUTE.md). There is no
// instrument on this page: the student runs the reviewed notebook at /compute/
// on an experiment result the experiment runner writes (twenty planets of the
// Binary Planet Lab, each started at a seeded random distance from Star A and
// run by the engine) and types back the numbers the capsule holds. Every number
// here is a declared output of that notebook (js/compute/catalogueData.js),
// checked by tests/computeInvestigations.test.js against the notebook's own
// answer (tests/fixtures/compute/population-at-scale.answer.json). The runs are
// seeded: two students get the same digits.
//
// The numbers (slope 1, 200,000 synthetic planets, cutoff 3 unless stated):
//   a.crit 0.255 +/- 0.0243 (setting 0.12 to 0.42; the edge of the unbound),
//   bound fraction in the trials 0.600 +/- 0.110, in the extension 0.596 +/-
//   0.076; slope 0: 0.451 +/- 0.081; cutoff 6: a.crit 0.289 +/- 0.0096,
//   extension 0.701 +/- 0.028.
// =============================================================================

const EXTENDING_AN_EXPERIMENT = {
  id: 'extending-an-experiment',
  thumbnail: 'images/scenarios/binary-planet-lab.webp',
  title: 'Extending an Experiment',
  subtitle:
    'From twenty planets that the engine ran to a population of two hundred thousand, with every uncertainty, in Python on the compute page',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: [],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Classify the trials of an experiment result into an outcome, and say how the definition of the outcome moves the result',
    'Run a reviewed Python notebook that fits the chance of an outcome with a bootstrap and extends it to a large synthetic population',
    'Say what the interval of an extension does and does not cover',
    'Explain why a sample of twenty can differ from the population it was drawn from by more than its error bar suggests',
  ],
  steps: [
    {
      sid: 'twenty-planets',
      type: 'read',
      setup: { scenario: 'Binary Planet Lab', seed: 'binary', paused: true },
      title: 'Twenty planets that the engine ran',
      body: `The Binary Planet Lab puts a planet near one star of a pair that is ten
             astronomical units apart. An <strong>experiment</strong> on the
             experiment runner ran twenty trials of it: in each the planet started at
             a distance from its star drawn at random between 0.12 and 0.42 of the
             stars' separation, and the engine ran it for about twenty orbits of the binary. Some planets
             stayed in orbit and some were thrown out.
             \n\nThe experiment's result is a file, and the notebook reads it. It
             calls a planet <strong>bound</strong> if its mean distance from the star
             stayed within a cutoff (three, to start) times the distance it started
             at, fits the chance of being bound as a smooth curve of the starting
             distance, repeats the fit on 400 resamples of the twenty to get its
             uncertainty, and draws two hundred thousand synthetic planets to say how
             many would stay bound in a larger population.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It
             is online only and downloads about 19 MB of Python the first time, when
             you press the button. Choose the notebook <strong>A population of
             planets, extended</strong>, keep its example input (the twenty planets),
             and its settings at slope 1, 200,000 planets and cutoff 3. Do not press
             Run yet.`,
    },
    {
      sid: 'how-well-can-twenty-place-an-edge',
      type: 'predict',
      reveal: 'the-fit',
      title: 'How well can twenty place an edge',
      body: `Before you run it. Of the twenty planets, the ones that stayed bound
             started closer than about 0.25, and those that did not started beyond
             about 0.34, with nothing in between except a few close calls.`,
      prompt:
        'The notebook will report the starting distance where the chance of staying bound is one half, with an uncertainty. That uncertainty will be&hellip;',
      options: [
        'tiny, because two hundred thousand synthetic planets are used',
        'a few hundredths, a fraction of the gap between the last planet that stayed and the first that left',
        'zero, because the engine is exact',
        'large, because twenty is too few to say anything',
      ],
      answer: 1,
      because:
        'The edge lies somewhere in the gap between the last planet that stayed and the first that left, about a tenth of the stars’ separation wide. The bootstrap, which repeats the fit on resamples of the twenty, reports a spread that is a fraction of that gap, a few hundredths; the two hundred thousand synthetic planets add nothing to it.',
    },
    {
      sid: 'the-fit',
      compute: 'population-at-scale',
      type: 'measure',
      title: 'Run it: the edge and the fractions',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here: the
             starting distance where the chance of staying bound is a half, and the
             uncertainty shown beside it; the fraction of the twenty trials that were
             bound; and the fraction of the synthetic population.`,
      fields: [
        { id: 'edge', label: 'Half-way distance', unit: '', hint: '0.255' },
        {
          id: 'edgeSigma',
          label: 'Its uncertainty',
          unit: '',
          hint: '0.0243',
        },
        {
          id: 'sample',
          label: 'Fraction bound in the trials',
          unit: '',
          hint: '0.6',
        },
        {
          id: 'extended',
          label: 'Fraction bound in the synthetic population',
          unit: '',
          hint: '0.596',
        },
      ],
      validate: v => {
        if (![v.edge, v.edgeSigma, v.sample, v.extended].every(Number.isFinite))
          return null;
        if (
          Math.abs(v.edge - 0.255) <= 0.003 &&
          Math.abs(v.edgeSigma - 0.0243) <= 0.004 &&
          Math.abs(v.sample - 0.6) <= 0.01 &&
          Math.abs(v.extended - 0.596) <= 0.02
        ) {
          return {
            level: 'ok',
            message:
              'The edge is at 0.255 of the stars’ separation, good to 0.024, a fraction of the gap of about a tenth that the trials leave open. Twelve of the twenty stayed, and the extension to two hundred thousand gives nearly the same fraction, 0.596, but with an uncertainty of 0.076.',
          };
        }
        return {
          level: 'error',
          message:
            'Check the settings (slope 1, 200,000 planets, cutoff 3) and read the edge, its uncertainty, and the two fractions from the page.',
        };
      },
    },
    {
      sid: 'a-uniform-population',
      compute: 'population-at-scale',
      type: 'measure',
      title: 'A uniform population',
      body: `The twenty planets were drawn uniformly in the starting distance. Set the
             <strong>slope</strong> to <strong>0</strong>, which draws the synthetic
             population the same way, and run again. Enter the fraction bound in the
             synthetic population and how far it is below the trials' fraction of
             0.6.`,
      fields: [
        {
          id: 'extended',
          label: 'Fraction bound, uniform population',
          unit: '',
          hint: '0.451',
        },
        {
          id: 'gap',
          label: 'Trials’ fraction minus this',
          unit: '',
          hint: '0.149',
        },
      ],
      validate: v => {
        if (![v.extended, v.gap].every(Number.isFinite)) return null;
        if (
          Math.abs(v.extended - 0.451) <= 0.02 &&
          Math.abs(v.gap - 0.149) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'A uniform population at the same edge would have 0.451 bound, not 0.6: the twenty drawn happened to put more planets near the star than a uniform draw does on average.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the slope to 0, keep the other two settings, run, read the fraction in the synthetic population, and subtract it from 0.6.',
        };
      },
    },
    {
      sid: 'why-the-sample-differs',
      type: 'question',
      kind: 'choice',
      title: 'Why the sample differs',
      body: `The trials' fraction, 0.6, is 0.15 above the uniform population's, 0.451.
             The bootstrap uncertainty of the extension, 0.081, is about half that
             gap.`,
      prompt: 'What is the best account of the difference?',
      options: [
        'The twenty were a random draw, and a random draw of twenty puts the sample fraction off the population fraction by about its own binomial error, here 0.11',
        'The notebook has a bug that lowers the population fraction',
        'The engine runs differently on the synthetic planets',
        'The bootstrap interval is wrong and should be zero',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'bug',
          option: 1,
          say: 'The population fraction is the fitted curve averaged over a uniform draw, which is (0.255 − 0.12) ÷ (0.42 − 0.12) = 0.45, worked by hand: nothing is wrong with it.',
        },
        {
          id: 'engine',
          option: 2,
          say: 'No synthetic planet is run by the engine. Each is given the fitted chance, which is the notebook’s assumption.',
        },
      ],
      hints: [
        'A fraction of twenty planets has a binomial error of the square root of p(1 − p) ÷ 20.',
      ],
      because:
        'The sample fraction of twenty has a binomial error near 0.11, so 0.6 against 0.45 is under two of those errors: unremarkable. The population fraction is the model’s average over a uniform draw, and it is what the twenty were meant to estimate.',
    },
    {
      sid: 'move-the-definition',
      compute: 'population-at-scale',
      type: 'measure',
      title: 'Move the definition',
      body: `Put the <strong>slope</strong> back to <strong>1</strong> and set the
             <strong>cutoff</strong> to <strong>6</strong>: a planet now counts as bound
             if it stays within six starting distances, not three. Run again. Enter the
             new half-way distance, and the fraction of the synthetic population.`,
      fields: [
        {
          id: 'edge',
          label: 'Half-way distance, cutoff 6',
          unit: '',
          hint: '0.289',
        },
        {
          id: 'extended',
          label: 'Fraction bound, cutoff 6',
          unit: '',
          hint: '0.701',
        },
      ],
      validate: v => {
        if (![v.edge, v.extended].every(Number.isFinite)) return null;
        if (
          Math.abs(v.edge - 0.289) <= 0.004 &&
          Math.abs(v.extended - 0.701) <= 0.02
        ) {
          return {
            level: 'ok',
            message:
              'The edge moved from 0.255 to 0.289, and the bound fraction from 0.596 to 0.701, with the same twenty planets. The notebook also warns that the transition is now a clean step, so its width means nothing beyond "sharper than the grid".',
          };
        }
        return {
          level: 'error',
          message:
            'Set the slope to 1 and the cutoff to 6, keep 200,000 planets, run, and read the half-way distance and the fraction in the synthetic population.',
        };
      },
    },
    {
      sid: 'what-moved-it',
      type: 'question',
      kind: 'choice',
      title: 'What moved the edge',
      body: `Nothing about the planets changed between the two runs: the same twenty
             trials, the same engine, the same orbits.`,
      prompt: 'Why did the edge move from 0.255 to 0.289?',
      options: [
        'A planet whose mean distance was 3.8 times its starting distance was reclassified from unbound to bound: the definition of bound changed',
        'The bootstrap found a different answer by chance',
        'The engine gave different trials the second time',
        'The synthetic population changed',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'chance',
          option: 1,
          say: 'The bootstrap is seeded, so it does not vary between runs; the change comes from the classification.',
        },
        {
          id: 'engine-again',
          option: 2,
          say: 'The trials are the file’s: the engine does not run again. Only the notebook’s reading of them changed.',
        },
      ],
      hints: [
        'Which planets are bound at a cutoff of six that were not at three?',
      ],
      because:
        'One planet, at a starting distance of 0.2315, stayed at a mean distance of 3.8 times its start: unbound at a cutoff of three and bound at six. That one reclassification moves the edge by a third of the gap beside it. An outcome is a definition, and the uncertainty of the extension does not include the choice of it.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Twenty planets, run by the engine, fixed the edge of the bound region to
             about 0.255 &plusmn; 0.024 of the stars' separation. Extended to two hundred
             thousand synthetic planets, the bound fraction was 0.596 &plusmn; 0.076 for a
             population with equal numbers per factor of distance, and 0.451 &plusmn; 0.081
             for a uniform one, which is where the sample's own 0.6 should have been.
             \n\nWhat the numbers do not say: the interval counts the scatter of twenty
             trials and nothing else. It does not count the choice of a logistic curve,
             the definition of bound, or the draw's range, outside of which no synthetic
             planet is made. A larger synthetic population has a smaller sampling error
             and exactly the same assumptions. The run is yours to keep: its capsule
             records the notebook's hash and the result file's, so a report can cite it.`,
    },
  ],
};

export default EXTENDING_AN_EXPERIMENT;
