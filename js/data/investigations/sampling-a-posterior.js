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
// the steps accept a range. `the-draws-at-your-ratio` takes a menu choice (the
// a/R* the notebook holds), so its expected numbers are one set per choice
// (DRAWS) and the menu is a field of the step, since a check sees only its own
// step; tests/computeInvestigations.test.js copies every literal from the runs
// that tools/compute-answers.mjs generates (tests/fixtures/compute/
// investigation-runs.json).
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

/**
 * The draws for each a/R* a student may hold (the menu; 9.21 is the notebook's
 * default and the fit panel's own value): the median and the 68 percent
 * interval's width of Rp/R* and of the impact parameter.
 */
const DRAWS = {
  8: { k: 0, kWidth: 0, b: 0, bWidth: 0 },
  8.5: { k: 0, kWidth: 0, b: 0, bWidth: 0 },
  9.21: { k: 0.11926, kWidth: 0.00026, b: 0.4301, bWidth: 0.0051 },
  10: { k: 0, kWidth: 0, b: 0, bWidth: 0 },
};
/** One field's value for each choice, for the answer key. */
const byRatio = field =>
  Object.fromEntries(Object.entries(DRAWS).map(([n, r]) => [n, r[field]]));
/** The fit panel's Rp/R* and its uncertainty, with everything free. */
const PANEL = { k: 0.1193, sigma: 0.0016 };

const SAMPLING_A_POSTERIOR = {
  id: 'sampling-a-posterior',
  thumbnail: 'images/scenarios/transit-lab.webp',
  title: 'Sampling a Posterior',
  subtitle:
    'A transit’s planet size and impact parameter sampled in Python, checked for convergence, and compared with the profile interval of the same problem',
  duration: '20-30 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['transit-photometry', 'refitting-a-transit'],
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
      canvas: 'quiet',
      title: 'What a sampler does',
      body: `When some of a fit's numbers are held fixed, how much of the answer is the
             data's and how much is the choice of the held value? You will find out by
             choosing one. A fit asks which values make the data most likely, and how wide
             that valley of chi-square is. A <strong>posterior</strong> asks a different
             question: given the data and what you believed before them (a
             <strong>prior</strong>), how probable is each value? It is answered by
             drawing samples, many of them, from that distribution, and reading intervals
             off the draws.
             \n\nThe notebook samples the planet's size, Rp/R*, and the impact parameter
             of the HD 209458 transit with an <strong>affine-invariant ensemble
             sampler</strong>, written in NumPy and nothing else: four independent groups
             of eight walkers, each walker proposing a step along the line to another
             walker of its group, accepted by the posterior's ratio. The epoch, the period
             and the limb darkening are held fixed, at the values the Observatory's fit
             panel found, and so is a/R*, at a value you will choose. The prior is
             uniform. The notebook also computes the exact posterior on a grid, to check
             the sampler, and the profile interval of the same two-parameter problem, to
             compare with.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It is
             online only and downloads about 9 MB of Python the first time, when you
             press the button. Choose the notebook <strong>Sampling a transit's
             posterior</strong> and keep its example input and its step count. A run takes
             about a minute. Do not press Run yet.`,
    },
    {
      sid: 'pick-the-ratio-predict-the-width',
      type: 'predict',
      reveal: 'the-draws-at-your-ratio',
      title: 'Pick the orbit size, predict the width',
      body: `The next step has you hold the orbit size, a/R*, at a value from a menu:
             <strong>8</strong>, <strong>8.5</strong>, <strong>9.21</strong> or
             <strong>10</strong>. Only Rp/R* and the impact
             parameter stay free. The fit panel, with a/R*, the epoch, the period, the limb
             darkening and the baseline all free as well, found Rp/R* = 0.1193 with an
             uncertainty of 0.0016.`,
      prompt:
        'Whichever value you hold, the notebook’s 68 percent interval for Rp/R* will be&hellip;',
      options: [
        'about the same width, plus or minus 0.0016',
        'about ten times narrower, and about as narrow wherever you hold a/R*',
        'narrowest at the value the fit panel found, and much wider the further you hold a/R* from it',
        'about ten times wider, because sampling explores more',
      ],
      answer: 1,
      because:
        'Rp/R* is correlated with the numbers that are held fixed here, and a fit that frees them carries their uncertainty into Rp/R*’s. Holding them fixed removes that, and the interval shrinks to about a twelfth. Where you hold a/R* decides where the draws sit, not how widely they spread: the width comes from how the data constrain Rp/R* once a/R* is fixed.',
    },
    {
      sid: 'the-draws-at-your-ratio',
      compute: 'posterior-sampling',
      type: 'measure',
      title: 'Run it: the draws at your orbit size',
      body: `Choose the orbit size to hold from the menu: <strong>8</strong>,
             <strong>8.5</strong>, <strong>9.21</strong> or <strong>10</strong>.
             Press <strong>Start the runtime</strong>, wait, set
             <strong>a/R*</strong> to your choice, then <strong>Run the notebook</strong>.
             Read the quantities it returns and enter them here: your choice, the median of
             the draws for Rp/R* and the width of its 68 percent interval (high end minus
             low end), and the same for the impact parameter.`,
      fields: [
        {
          id: 'ratio',
          label: 'The a/R* you held',
          unit: '',
          options: [8, 8.5, 9.21, 10],
          want: '8',
        },
        {
          id: 'k',
          label: 'Rp/R*, median',
          unit: '',
          want: String(DRAWS[8].k),
          by: byRatio('k'),
        },
        {
          id: 'kWidth',
          label: 'Rp/R*, width of the interval',
          unit: '',
          want: String(DRAWS[8].kWidth),
          by: byRatio('kWidth'),
        },
        {
          id: 'b',
          label: 'Impact parameter, median',
          unit: '',
          want: String(DRAWS[8].b),
          by: byRatio('b'),
        },
        {
          id: 'bWidth',
          label: 'Impact parameter, width of the interval',
          unit: '',
          want: String(DRAWS[8].bWidth),
          by: byRatio('bWidth'),
        },
      ],
      validate: v => {
        const typed = [v.k, v.kWidth, v.b, v.bWidth];
        if (!Number.isFinite(v.ratio))
          return typed.some(Number.isFinite)
            ? {
                level: 'warn',
                message:
                  'Choose the a/R* you held from the menu first: what is right depends on it.',
              }
            : null;
        if (!typed.every(Number.isFinite)) return null;
        const mine = DRAWS[v.ratio];
        if (!mine) return null;
        const medians = row =>
          Math.abs(v.k - row.k) <= 0.0003 && Math.abs(v.b - row.b) <= 0.008;
        const widths = row =>
          Math.abs(v.kWidth - row.kWidth) <= 0.00006 &&
          Math.abs(v.bWidth - row.bWidth) <=
            Math.max(0.0006, 0.25 * row.bWidth);
        if (medians(mine) && widths(mine)) {
          const away = Math.abs(mine.k - PANEL.k);
          return {
            level: 'ok',
            message:
              v.ratio === 9.21
                ? 'a/R* 9.21 is the value the fit panel found, so Rp/R* comes out where the panel put it, 0.1193, with an interval 0.00026 wide, plus or minus 0.00013. That is about twelve times narrower than the panel’s 0.0016, which you will account for below.'
                : `With a/R* held at ${v.ratio}, Rp/R* is ${mine.k} with a 68 percent interval ${Number(mine.kWidth.toPrecision(2))} wide: as narrow as with the fit panel’s own value. But the median is ${away.toFixed(4)} from the panel’s 0.1193, ${(away / (mine.kWidth / 2)).toFixed(0)} times the interval’s half-width and ${(away / PANEL.sigma).toFixed(1)} of the panel’s uncertainties: a narrow interval around a different value. The width comes from the data once a/R* is held; where the interval sits comes from the value you held.`,
          };
        }
        for (const [n, row] of Object.entries(DRAWS))
          if (Number(n) !== v.ratio && medians(row))
            return {
              level: 'error',
              message: `Those are the medians of the run with a/R* ${n}. You chose ${v.ratio}: set a/R* to ${v.ratio} on the compute page and run again.`,
            };
        if (medians(mine))
          return {
            level: 'error',
            message:
              'The medians are right for your choice. Read each interval’s two ends from the table and subtract the low end from the high end for its width.',
          };
        return {
          level: 'error',
          message: `Set a/R* to ${v.ratio} on the compute page, run the notebook, and read each median from the Value column, and subtract the low end of its interval from the high end for its width.`,
        };
      },
    },
    {
      sid: 'did-it-converge',
      compute: 'posterior-sampling',
      type: 'measure',
      title: 'Did it converge',
      body: `A sampler's draws mean something only if the chain has run long enough to
             forget where it started. For the run you just made, the notebook reports the largest <strong>split
             R-hat</strong> (it must be under 1.05: the four independent ensembles agree
             with one another), the smallest <strong>effective sample size</strong> (at
             least 400 draws' worth of independent information), and the <strong>acceptance
             fraction</strong> of proposals (between 0.1 and 0.9). Enter all three.`,
      fields: [
        { id: 'rhat', label: 'Largest R-hat', unit: '', want: '1.01' },
        {
          id: 'ess',
          label: 'Smallest effective sample size',
          unit: '',
          want: '2000',
        },
        {
          id: 'acceptance',
          label: 'Acceptance fraction',
          unit: '',
          want: '0.72',
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
             of the draws' interval's width to it. Read the two ratios for your own run:
             both are close to one.`,
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
          say: 'The sampler is checked against the grid of the same posterior (its medians agree to within 0.03 standard deviations at every a/R* on the menu) and against problems with exact answers. The profile agrees for a different reason: the problem is nearly Gaussian.',
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
      body: `The fit panel's uncertainty for Rp/R* is 0.0016. The interval you found is
             plus or minus about 0.00014, a dozen times smaller, from the same light curve,
             whichever a/R* you held.`,
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
        'An interval is conditional on what is held fixed. Holding the epoch, period, a/R* and limb darkening makes Rp/R*’s interval about twelve times narrower, and none of them is known that well. The a/R* you held moved the median by many half-widths of the interval, and the width did not notice. Narrow is not the same as known.',
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
      body: `A sampler drew 128,000 values of Rp/R* and the impact parameter with a/R*
             held where you chose, and reported intervals as wide as the profile intervals
             of the same problem, because the problem is nearly Gaussian in these two
             numbers. The draws agree with a grid of the exact posterior, and the sampler
             has been checked on problems with exact answers.
             \n\nWhat the interval does not cover: it is conditional on the epoch, the
             period, the limb darkening and the a/R* you held, and about twelve times
             narrower than the fit panel's for that reason. Moving the held a/R* moved the
             median by many half-widths of the interval and barely changed its width, so a
             narrow interval is not a known value. And a sampler that is not run long enough
             says so and gives nothing, which is the behavior worth asking of any. The run
             is yours to keep: its capsule records the notebook's hash and the light
             curve's, so a report can cite it.`,
    },
  ],
  retired: {
    'how-wide': {
      to: 'pick-the-ratio-predict-the-width',
      release: '3.1',
      was: {
        en: 'Predict how wide the notebook’s 68 percent interval for Rp/R* will be, compared with the fit panel’s uncertainty of 0.0016.',
        es: 'Predecir qué tan ancho será el intervalo del 68 por ciento de Rp/R* del cuaderno, comparado con la incertidumbre de 0,0016 del panel de ajuste.',
      },
    },
    'the-draws': {
      to: 'the-draws-at-your-ratio',
      release: '3.1',
      was: {
        en: 'Run the notebook with its settings as they are and enter the median of Rp/R* and the width of its 68 percent interval, and the same for the impact parameter.',
        es: 'Ejecutar el cuaderno con sus ajustes tal como están e introducir la mediana de Rp/R* y la anchura de su intervalo del 68 por ciento, y lo mismo para el parámetro de impacto.',
      },
    },
  },
};

export default SAMPLING_A_POSTERIOR;
