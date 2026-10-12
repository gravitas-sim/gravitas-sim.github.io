// =============================================================================
// Sampling a Posterior
// -----------------------------------------------------------------------------
// Content only, no imports. The companion of the compute page's notebook
// "posterior-sampling" (Roadmap II Prompt 102, COMPUTE.md; the route Prompt 103's
// gate left open for sampling, SAMPLER_GATE.md). There is no instrument on this
// page: the student runs the reviewed notebook at /compute/ on the TESS light
// curve of HD 209458 and types back the numbers the capsule holds. Every number
// here is a declared output of that notebook (js/compute/catalogueData.js),
// checked by tests/computeInvestigations.test.js against the notebook's own
// answer (tests/fixtures/compute/posterior-sampling.answer.json). The sampler
// is seeded, but the digits of a run differ a little between Python builds, so
// the steps accept a range.
//
// The numbers (epoch, period, a/R* and limb darkening held fixed; Rp/R* and the
// impact parameter free; 8,000 steps of four ensembles of eight walkers):
//   Rp/R* 0.11926, 68 percent interval 0.11913 to 0.11939; b 0.4301, interval
//   0.4275 to 0.4327; the profile intervals are the same widths to 2 percent
//   (ratios 0.99 and 0.99); the draws agree with a grid of the same posterior
//   to 0.02 standard deviations; R-hat under 1.03, 1,500 to 3,500 effective
//   samples, acceptance 0.72. The fit panel's own sigma for Rp/R* with
//   everything free is 0.0016, twelve times these intervals' half-width. A
//   1,000-step run is refused.
// =============================================================================

const SAMPLING_A_POSTERIOR = {
  id: 'sampling-a-posterior',
  thumbnail: 'images/scenarios/transit-lab.webp',
  title: 'Sampling a Posterior',
  subtitle:
    'A transit’s planet size and impact parameter sampled in Python, checked for convergence, and compared with the profile interval of the same problem',
  duration: '40-50 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Run an ensemble sampler on a transit’s posterior and read its convergence diagnostics',
    'Say what a posterior interval and a profile interval are, and when they nearly coincide',
    'Explain why holding parameters fixed makes an interval narrower without making them known',
    'Say why a sampler that refuses to report an interval from a short run is working',
  ],
  steps: [
    {
      sid: 'what-a-sampler-does',
      type: 'read',
      setup: { scenario: 'Transit Lab', seed: 'transit-lab', paused: true },
      title: 'What a sampler does',
      body: `A fit asks which values make the data most likely, and how wide that valley
             of chi-square is. A <strong>posterior</strong> asks a different question: given
             the data and what you believed before them (a <strong>prior</strong>), how
             probable is each value? It is answered by drawing samples, many of them,
             from that distribution, and reading intervals off the draws.
             \n\nThe notebook samples the planet's size, Rp/R*, and the impact parameter
             of the HD 209458 transit with an <strong>affine-invariant ensemble
             sampler</strong>, written in NumPy and nothing else: four independent groups
             of eight walkers, each walker proposing a step along the line to another
             walker of its group, accepted by the posterior's ratio. The epoch, the
             period, a/R* and the limb darkening are held fixed, at the values the
             Observatory's fit panel found. The prior is uniform. The notebook also
             computes the exact posterior on a grid, to check the sampler, and the profile
             interval of the same two-parameter problem, to compare with.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It is
             online only and downloads about 9 MB of Python the first time, when you
             press the button. Choose the notebook <strong>Sampling a transit's
             posterior</strong>, keep its example input and its settings. The run takes
             about a minute. Do not press Run yet.`,
    },
    {
      sid: 'how-wide',
      type: 'predict',
      reveal: 'the-draws',
      title: 'How wide will it be',
      body: `The fit panel, with the epoch, the period, a/R*, the limb darkening and the
             baseline all free as well, found Rp/R* = 0.1193 with an uncertainty of
             0.0016.`,
      prompt:
        'Here only Rp/R* and the impact parameter are free. The notebook’s 68 percent interval for Rp/R* will be&hellip;',
      options: [
        'about the same width, plus or minus 0.0016',
        'about ten times narrower',
        'about ten times wider, because sampling explores more',
        'zero, because the sampler settles on one value',
      ],
      answer: 1,
      because:
        'Rp/R* is correlated with the numbers that are held fixed here, and a fit that frees them carries their uncertainty into Rp/R*’s. Holding them fixed removes that, and the interval shrinks to about a twelfth.',
    },
    {
      sid: 'the-draws',
      compute: 'posterior-sampling',
      type: 'measure',
      title: 'Run it: the draws',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here:
             the median of the draws for Rp/R* and the width of its 68 percent
             interval (high end minus low end), and the same for the impact
             parameter.`,
      fields: [
        { id: 'k', label: 'Rp/R*, median', unit: '', hint: '0.11926' },
        {
          id: 'kWidth',
          label: 'Rp/R*, width of the interval',
          unit: '',
          hint: '0.00026',
        },
        { id: 'b', label: 'Impact parameter, median', unit: '', hint: '0.430' },
        {
          id: 'bWidth',
          label: 'Impact parameter, width of the interval',
          unit: '',
          hint: '0.0051',
        },
      ],
      validate: v => {
        if (![v.k, v.kWidth, v.b, v.bWidth].every(Number.isFinite)) return null;
        if (
          Math.abs(v.k - 0.11926) <= 0.0003 &&
          Math.abs(v.kWidth - 0.00026) <= 0.00006 &&
          Math.abs(v.b - 0.43) <= 0.008 &&
          Math.abs(v.bWidth - 0.0051) <= 0.0012
        ) {
          return {
            level: 'ok',
            message:
              'Rp/R* is 0.1193 with a 68 percent interval 0.00026 wide, plus or minus 0.00013, and the impact parameter is 0.430 plus or minus 0.0026. These are about twelve times narrower than the fit panel’s, which you will account for below.',
          };
        }
        return {
          level: 'error',
          message:
            'Run the notebook with its settings as they are. Read each median from the Value column, and subtract the low end of its interval from the high end for its width.',
        };
      },
    },
    {
      sid: 'did-it-converge',
      compute: 'posterior-sampling',
      type: 'measure',
      title: 'Did it converge',
      body: `A sampler's draws mean something only if the chain has run long enough to
             forget where it started. The notebook reports the largest <strong>split
             R-hat</strong> (it must be under 1.05: the four independent ensembles agree
             with one another), the smallest <strong>effective sample size</strong> (at
             least 400 draws' worth of independent information), and the <strong>acceptance
             fraction</strong> of proposals (between 0.1 and 0.9). Enter all three.`,
      fields: [
        { id: 'rhat', label: 'Largest R-hat', unit: '', hint: '1.01' },
        {
          id: 'ess',
          label: 'Smallest effective sample size',
          unit: '',
          hint: '2000',
        },
        {
          id: 'acceptance',
          label: 'Acceptance fraction',
          unit: '',
          hint: '0.72',
        },
      ],
      validate: v => {
        if (![v.rhat, v.ess, v.acceptance].every(Number.isFinite)) return null;
        if (
          v.rhat >= 0.99 &&
          v.rhat < 1.05 &&
          v.ess >= 400 &&
          v.ess <= 40000 &&
          Math.abs(v.acceptance - 0.72) <= 0.1
        ) {
          return {
            level: 'ok',
            message:
              'R-hat is just above 1, there are thousands of effective samples out of 128,000 draws, and about 72 percent of proposals were accepted. Those are the three things a reader checks before quoting an interval from a chain, and the notebook checks them itself.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the largest R-hat, the smallest effective sample size and the acceptance fraction from the table of numbers. R-hat is a little above 1, and the sample size is in the thousands.',
        };
      },
    },
    {
      sid: 'profile-and-posterior',
      type: 'question',
      kind: 'choice',
      title: 'Posterior and profile',
      body: `The table also gives each parameter's profile interval, the range of values
             whose chi-square is within one of the best, found on the grid, and the ratio
             of the draws' interval's width to it. The ratios are 0.99 for
             both.`,
      prompt: 'What does that agreement say?',
      options: [
        'In these two parameters the problem is close to Gaussian, so a probability interval and a chi-square interval nearly coincide: a fact about this problem, not a rule',
        'A posterior interval and a profile interval are the same thing',
        'The sampler is correct, because it agrees with the profile',
        'The prior does not matter for any problem',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'same',
          option: 1,
          say: 'One is a probability under a prior; the other is a range of values that fit about as well. They agree here, and they would not for a lopsided or bounded posterior.',
        },
        {
          id: 'correct',
          option: 2,
          say: 'The sampler is checked against the grid of the same posterior (its medians agree to 0.02 standard deviations) and against problems with exact answers. The profile agrees for a different reason: the problem is nearly Gaussian.',
        },
        {
          id: 'prior',
          option: 3,
          say: 'With plenty of data a uniform prior changes little, as here. With little data, or a parameter near a bound, it can decide the answer.',
        },
      ],
      hints: [
        'For a Gaussian likelihood the range within one of chi-square’s minimum and the central 68 percent of the probability are the same range.',
      ],
      because:
        'A Gaussian posterior has a central 68 percent interval of plus and minus one standard deviation, and the profile’s chi-square-plus-one range is the same width. They differ when the posterior is lopsided or runs up against a bound, which is where a sampler earns its cost.',
    },
    {
      sid: 'why-narrower',
      type: 'question',
      kind: 'choice',
      title: 'Why so much narrower',
      body: `The fit panel's uncertainty for Rp/R* is 0.0016. This notebook's interval is
             plus or minus 0.00013, twelve times smaller, from the same light curve.`,
      prompt: 'Why?',
      options: [
        'The panel refits the epoch, the period, a/R* and the limb darkening at every value of Rp/R*, so their uncertainty is carried into it; here they are held fixed, which hides their uncertainty and does not remove it',
        'The notebook uses more data',
        'A sampler is always more precise than a fit',
        'The notebook’s error bars were made smaller',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'data',
          option: 1,
          say: 'It uses the same 1,882 points and the same error bars, scaled by the same reduced chi-square.',
        },
        {
          id: 'precise',
          option: 2,
          say: 'A sampler is a way of exploring a distribution, not of narrowing it: the width is a property of the likelihood and the prior, and of what is free.',
        },
      ],
      hints: [
        'The previous investigation held the limb darkening fixed and Rp/R*’s sigma fell to a third.',
      ],
      because:
        'An interval is conditional on what is held fixed. Holding the epoch, period, a/R* and limb darkening at their best values makes Rp/R*’s interval twelve times narrower, and none of them is known that well. Narrow is not the same as known.',
    },
    {
      sid: 'refuse-a-short-run',
      type: 'question',
      kind: 'choice',
      title: 'A run that is too short',
      body: `Set the notebook's <strong>steps</strong> to <strong>1000</strong>, keep the
             rest, and run it again. It takes about fifteen seconds.`,
      prompt: 'What does it do?',
      options: [
        'It stops with an error and reports no interval, saying which of its convergence limits failed and to raise the number of steps',
        'It reports narrower intervals, because fewer steps were used',
        'It reports the same intervals, only faster',
        'It crashes because 1000 is out of range',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'narrower',
          option: 1,
          say: 'Fewer steps do not narrow a distribution; they leave the chain not having forgotten where it started, which is what R-hat and the autocorrelation count measure.',
        },
        {
          id: 'range',
          option: 3,
          say: '1000 is the smallest value the setting allows; the notebook refuses on purpose, in its own words, not by failing.',
        },
      ],
      hints: [
        'Read the message the page shows after the words "The notebook stopped with an error".',
      ],
      because:
        'The notebook holds every run to limits: the ensembles must agree (R-hat under 1.05), there must be at least 400 effective samples, and the chain after its burn-in must be at least 50 autocorrelation times long. A 1000-step run fails the last and often the first, so the notebook returns the diagnostics and no interval, because an interval from a chain that has not converged is a number with nothing behind it.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `A sampler drew 128,000 values of Rp/R* and the impact parameter, and
             reported 0.1193 &plusmn; 0.0001 and 0.430 &plusmn; 0.003, the same widths
             as the profile intervals of the same problem, because the problem is nearly
             Gaussian in these two numbers. The draws agree with a grid of the exact
             posterior, and the sampler has been checked on problems with exact
             answers.
             \n\nWhat the interval is not: it is conditional on the epoch, the period,
             a/R* and the limb darkening, which were held fixed, and twelve times
             narrower than the fit panel's for that reason. And a sampler that is not
             run long enough says so and gives nothing, which is the behavior worth
             asking of any. The run is yours to keep: its capsule records the notebook's
             hash and the light curve's, so a report can cite it.`,
    },
  ],
};

export default SAMPLING_A_POSTERIOR;
