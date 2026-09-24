// =============================================================================
// Replicating 51 Pegasi b
// -----------------------------------------------------------------------------
// Eighteen steps on forty-three real velocities, through the fitting stack the
// application already ships: the chi-square period grid in js/rvFit.js and the
// seeded Monte Carlo with refits in js/rvUncertainty.js. Until this lesson that
// stack had exactly one consumer - a button in the observation panel - and
// everything it had ever been pointed at came out of js/rvSurvey.js, which is
// to say out of a generator whose answer was known before the fit began.
//
// What this lesson is for
// -----------------------------------------------------------------------------
// Not to teach the Doppler method: "The Star That Wobbles" does that, on a
// simulated system, and a student should have done it first. This is the next
// thing, and it is a different thing. It asks whether the number you get out of
// an instrument agrees with the number somebody else published, and it is built
// so that the answer is *yes and no* - which is the answer real replication
// usually gives and the one synthetic data almost never does.
//
// The measured/modeled line
// -----------------------------------------------------------------------------
// Step 2 draws it and no later step lets it blur. There is a simulated planetary
// system on the canvas behind this lesson, and it has nothing whatever to do
// with the numbers in the panel. Saying so once, early and plainly, is cheaper
// than any amount of repair later.
//
// The three real numbers this rests on, all verified against the shipped code
// before a word of it was written:
//
//   period search 1.5-100 d      P = 4.23090 d, K = 56.70 m/s
//   goodness of fit              chi2 = 257.3; the panel divides by 43 and
//                                shows 5.98, periodSearch divides by 43 - 4
//                                and reports 6.60. The lesson quotes the
//                                panel's, because that is the one on screen.
//   Monte Carlo, seed '51peg'    P in [4.23088, 4.23091] at 400 trials
//
// and the published value the lesson compares against, 4.23077 +/- 0.00005 d,
// lies OUTSIDE that interval. That is not a defect in the lesson. It is the
// lesson: the interval is correct given the quoted uncertainties, the quoted
// uncertainties are photon noise, and the reduced chi-square of about 6 the student
// already wrote down is the evidence that the star is doing something the error
// bars never described. Residual RMS is 2.79 m/s against a mean quoted sigma of
// 1.13, and 2.79 / 1.13 = 2.47, which is sqrt(5.98) - the two readings agree.
// =============================================================================

/** The dataset every working step opens. */
const OBSERVED = { dataset: '51peg' };

/**
 * A still backdrop, set once.
 *
 * Paused on purpose. A simulated system moving behind a lesson about measured
 * velocities invites exactly the confusion step 2 exists to prevent, and a
 * stopped one can be pointed at as "the model, over there, not this".
 */
const BACKDROP = {
  scenario: 'Exoplanet Characterization Lab',
  seed: 'replication',
  camera: { zoom: 55, pan: { x: 0, y: 0 } },
  paused: true,
};

const REPLICATING_51_PEG = {
  id: 'replicating-51-peg',
  // The scene standing still behind the panel. Chosen because it is what the
  // lesson actually shows, not because it depicts 51 Pegasi - nothing in this
  // application depicts 51 Pegasi, which is rather the point.
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  title: "Somebody Else's Star",
  subtitle: 'Forty-three real velocities, and whether you get the same answer',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  tags: ['exoplanets', 'observing'],
  summary:
    'Forty-three real velocities of 51 Pegasi, measured at Keck a decade after the discovery and reproduced here unaltered. Fit them with the same instrument you would use on simulated data. The period comes out right to three parts in a hundred thousand — and your confidence interval will not contain the published value. Why both are true is the lesson.',
  objectives: [
    'Fit a published radial-velocity time series and recover an orbital period',
    'Read a periodogram with a severe window function and say why the peak is still unambiguous',
    'Compute a reduced chi-square and interpret a value far from 1',
    'Distinguish an internal uncertainty from the true scatter of a measurement',
    'Run a seeded Monte Carlo and state what its interval does and does not cover',
    'Decide whether a replication succeeded when the numbers agree and the error bars do not',
  ],
  steps: [
    // --- Part 1: the claim ----------------------------------------------------
    {
      sid: 'the-claim',
      type: 'read',
      title: 'A claim from 1995',
      setup: BACKDROP,
      body: `On the sixth of October 1995, Michel Mayor and Didier Queloz
             announced that the star 51 Pegasi has a planet: roughly half the
             mass of Jupiter, going round once every 4.23 days, at a twentieth
             of the Earth's distance from the Sun.
             \n\nNothing in any theory of planet formation allowed that. A gas
             giant that close to its star should not have been able to form
             there and had no known way to arrive. The claim was doubted, and
             the doubt was reasonable: the evidence was a wobble of about fifty
             meters per second in the light of a star fifty light years away.
             \n\nWithin weeks two other groups had pointed their own instruments
             at it. That is what settled it — not the argument, the
             <strong>replication</strong>. You are about to do the same thing.`,
      tip: 'Mayor and Queloz shared the 2019 Nobel Prize in Physics for this measurement.',
    },
    {
      sid: 'where-these-numbers-came-from',
      type: 'read',
      title: 'Where these numbers came from',
      body: `The forty-three velocities you are about to fit are
             <strong>not from the discovery</strong>. They were taken with HIRES
             on the Keck I telescope, by the Lick–Carnegie survey, and published
             by Butler et al. (2017), Astronomical Journal 153, 208. They span
             2,749 days — about seven and
             — about seven and a half years — and they were retrieved from the
             VizieR archive at Strasbourg Observatory as catalog J/AJ/153/208,
             checksummed on the way in, and
             reproduced here with nothing done to them.
             \n\nThat they come from a different instrument, a different team and
             a different decade than the discovery is the whole point. If you fit
             the discovery data and got the discovery answer, you would have
             checked some arithmetic. Fitting somebody else's independent
             observations is what makes this a replication.
             \n\nOne line to hold on to for the rest of the lesson. There is a
             <strong>simulated</strong> planetary system on the canvas behind
             this panel. It is stopped, it is a model, and it has nothing to do
             with any number you are about to touch. Everything in the workspace
             is a <strong>measurement</strong> somebody made of a real star.`,
      tip: 'Every number in the panel carries its archive, its query and its checksum into whatever you export.',
    },
    {
      sid: 'before-you-look',
      type: 'predict',
      reveal: 'write-down-the-fit',
      title: 'Commit first',
      body: `You know what the published period is — it is in the first screen
             of this lesson, and it is 4.23 days.
             \n\nSo predict something harder. Your fit will not land exactly on
             the published value; no two fits of different data ever do. Commit
             now to how close you expect to get, and this stays unmarked until
             you have actually measured it.`,
      prompt:
        'My best-fit period will differ from the published 4.23077 days by about…',
      options: [
        'less than a second — the data are good enough to pin it that hard',
        'ten seconds or so — a part in a hundred thousand',
        'a few minutes — a part in a thousand',
        'an hour or more — this is a hard measurement',
      ],
      answer: 1,
      because:
        'About eleven seconds, which is three parts in a hundred thousand. That is a startling level of agreement for a quantity nobody can measure directly, and it comes from the length of the run rather than the quality of any one night: 2,749 days is 650 orbits, and an error in the period accumulates across every one of them. A period that was wrong by a minute would have the fit a quarter of a cycle out of phase by the end of the run, and the chi-square would notice.',
    },

    // --- Part 2: look before you fit -----------------------------------------
    {
      sid: 'open-the-velocities',
      type: 'explore',
      observed: OBSERVED,
      title: 'Look at them before you fit them',
      body: `The workspace has opened on the velocities. Before touching a
             single control, look at what you have been given.
             \n\nThis is not a habit worth skipping. Almost every bad fit in
             astronomy is a fit to data the fitter never looked at.`,
      checklist: [
        'Find the vertical spread: the star swings about 120 m/s top to bottom',
        'Find the error bars — they are about 1 m/s, smaller than the plotted points',
        'Look along the time axis and find the long empty stretches',
        'Find at least one place where two points sit on top of each other',
      ],
      tip: 'The points that sit on top of each other are consecutive exposures, taken a couple of minutes apart. The catalog publishes them separately and so does this lesson.',
    },
    {
      sid: 'the-shape-of-the-run',
      type: 'measure',
      observed: OBSERVED,
      requires: ['open-the-velocities'],
      title: 'The shape of the run',
      body: `Two numbers that describe the sampling rather than the star. Both
             are on the workspace readout.
             \n\nA real observing run is not a cadence somebody chose. It is
             whatever the weather, the telescope schedule and the star's
             position in the sky allowed, and those three things leave marks.`,
      fields: [
        { id: 'baseline', label: 'Total baseline of the run', unit: 'days' },
        { id: 'gap', label: 'The largest single gap in it', unit: 'days' },
      ],
      validate: v => {
        if (!Number.isFinite(v.baseline) || !Number.isFinite(v.gap)) {
          return {
            level: 'warn',
            message:
              'Both in days: how long the whole run lasted, and the longest stretch with no observations in it.',
          };
        }
        if (Math.abs(v.baseline - 2749.7) > 60) {
          return {
            level: 'error',
            message:
              'The run spans about 2,750 days. Check you are reading the full span from first epoch to last rather than the width of one season.',
          };
        }
        if (Math.abs(v.gap - 407.9) > 40) {
          return {
            level: 'error',
            message:
              'The longest gap is about 408 days. Look for the widest empty stretch on the time axis — there is more than one long one, and you want the largest.',
          };
        }
        return {
          level: 'ok',
          message: `A 408-day hole in a 2,750-day run. 51 Pegasi is behind the Sun for part of every year and Keck is oversubscribed for the rest of it, so this is what the sky and the schedule allowed. More than a year of this star's life is simply missing, and you are about to measure its orbit anyway.`,
        };
      },
      tip: 'Nothing was done to create that gap. It is what the observing record contains.',
    },
    {
      sid: 'what-a-gap-does',
      type: 'question',
      kind: 'choice',
      title: 'What does a hole like that do?',
      body: `You are looking for a signal that repeats every four days, in a
             record with a fourteen-month hole in it.`,
      prompt: 'A long gap in a time series mainly does which of these?',
      options: [
        'Nothing much — the data on either side are still good',
        'Makes short periods impossible to measure at all',
        'Adds extra peaks to the periodogram that are artifacts of the sampling, not the star',
        'Biases the measured period towards longer values',
      ],
      answer: 2,
      because:
        'It adds artifacts. A periodogram is not a property of the star alone; it is the star convolved with when you happened to look. Regular spacing in the observing record — nightly, monthly, yearly — puts extra peaks at frequencies offset from the true one by the frequency of that spacing, and those aliases can be as tall as the real peak. This is the single most common way a published period turns out to be wrong. You are about to see whether it happened here.',
    },

    // --- Part 3: the fit ------------------------------------------------------
    {
      sid: 'the-period-search',
      type: 'explore',
      observed: OBSERVED,
      title: 'Search',
      body: `Run a period search from <strong>1.5 to 100 days</strong>.
             \n\nThe workspace fits a Keplerian at every period on a grid and
             plots the chi-square it achieved. The grid it chooses is about ten
             samples across the narrowest peak your baseline can resolve, which
             on a 2,749-day run is around eighteen thousand of them, so give it
             a moment.`,
      checklist: [
        'Set the search range to 1.5 – 100 days and run it',
        'Find the deepest trough',
        'Count how many other troughs come close to it',
        'Snap the trial parameters to the best fit',
      ],
      tip: 'Every trough is a period at which some Keplerian fits better than the ones either side of it. Most of them are the sampling, not the star.',
    },
    {
      sid: 'write-down-the-fit',
      type: 'measure',
      observed: OBSERVED,
      requires: ['the-period-search'],
      title: 'Your answer',
      body: `Write down what the search found. These two numbers are your
             replication.`,
      fields: [
        { id: 'period', label: 'Best-fit period', unit: 'days' },
        { id: 'K', label: 'Best-fit semi-amplitude K', unit: 'm/s' },
      ],
      validate: v => {
        if (!Number.isFinite(v.period) || !Number.isFinite(v.K)) {
          return {
            level: 'warn',
            message:
              'The period in days and the semi-amplitude in m/s, both from the workspace readout.',
          };
        }
        if (Math.abs(v.period - 4.2309) > 0.02) {
          if (Math.abs(v.period - 1.3086) < 0.02 || v.period > 100) {
            return {
              level: 'error',
              message:
                'That is one of the aliases rather than the deepest trough. Go back and take the lowest chi-square in the whole range.',
            };
          }
          return {
            level: 'error',
            message:
              'The deepest trough is near 4.231 days. Check the search actually completed over the full 1.5–100 day range.',
          };
        }
        if (Math.abs(v.K - 56.7) > 3) {
          return {
            level: 'error',
            message:
              'K should come out near 56.7 m/s — half the peak-to-peak swing, not the whole of it.',
          };
        }
        return {
          level: 'ok',
          message: `P = ${v.period.toFixed(5)} d, K = ${v.K.toFixed(1)} m/s. The published values from these same velocities are 4.23077 d and 56.05 m/s, and the discovery paper's period, from a different instrument thirty years ago, was 4.2293 d. You have replicated a Nobel-winning measurement on a laptop.`,
        };
      },
    },
    {
      sid: 'how-close',
      type: 'question',
      kind: 'numeric',
      title: 'How close, exactly?',
      body: `Your period is 4.23090 days if you took the deepest trough.
             The published value from these velocities is
             <strong>4.23077</strong> days.
             \n\nThat difference is small enough that days are the wrong unit
             for it.`,
      prompt: 'Your period minus the published period, in seconds',
      answer: 11.2,
      unit: 's',
      tolerance: 5,
      expect: {
        dimension: 'time',
        unit: 's',
        accept: ['s', 'minutes', 'days'],
      },
      hints: [
        'Subtract first, convert afterwards. The difference is about 0.00013 days.',
        'There are 86,400 seconds in a day.',
      ],
      worked:
        '4.23090 − 4.23077 = 0.00013 d. 0.00013 × 86400 = 11.2 s. On a period of 4.23 days that is a fractional agreement of three parts in a hundred thousand.',
    },

    // --- Part 4: the thing synthetic data cannot teach ------------------------
    {
      sid: 'the-fit-is-good-but',
      type: 'measure',
      observed: OBSERVED,
      requires: ['write-down-the-fit'],
      title: 'Now look at how good the fit actually is',
      body: `You have the right period. That does not tell you the model
             describes the data.
             \n\nThe workspace reports a <strong>reduced chi-square</strong>
             for the curve currently on the sliders: the sum of squared
             residuals, each divided by that point's own uncertainty, averaged
             over the forty-three points. If the model is right and the error
             bars are right, it comes out near 1. Write down what it actually
             is, and write down the scatter of the residuals beside it.`,
      fields: [
        {
          id: 'redchi',
          label: 'Reduced chi-square of your best fit',
          unit: '',
        },
        { id: 'rms', label: 'RMS of the residuals', unit: 'm/s' },
      ],
      validate: v => {
        if (!Number.isFinite(v.redchi) || !Number.isFinite(v.rms)) {
          return {
            level: 'warn',
            message:
              'The reduced chi-square (a bare number) and the residual scatter in m/s. Both are on the readout under the folded curve.',
          };
        }
        // The panel scores the curve on the sliders, so its divisor is the
        // number of points: 257.3 / 43 = 5.98. periodSearch reports the same
        // chi-square against 43 - 4 degrees of freedom, which is 6.60, and a
        // student reading the panel will never see that one. The tolerance
        // spans both so neither reading is called wrong.
        if (Math.abs(v.redchi - 6.3) > 1.8) {
          return {
            level: 'error',
            message:
              'The reduced chi-square of the best fit is about 6. Make sure the trial parameters are snapped to the fit rather than left where you dragged them.',
          };
        }
        if (Math.abs(v.rms - 2.79) > 1) {
          return {
            level: 'error',
            message:
              'The residual scatter is about 2.8 m/s. That is the spread of the points around your curve, not the spread of the points themselves.',
          };
        }
        return {
          level: 'ok',
          message: `Reduced chi-square ${v.redchi.toFixed(1)}, residual scatter ${v.rms.toFixed(1)} m/s, against a mean quoted uncertainty of 1.13 m/s. The points miss your curve by about two and a half times what their error bars say they should. Hold on to both numbers.`,
        };
      },
      tip: 'A reduced chi-square of 6 is not a small deviation from 1. It means the squared residuals are six times what the error bars predict, so the points miss the curve by about the square root of that - two and a half times their stated uncertainty.',
    },
    {
      sid: 'what-six-point-six-means',
      type: 'question',
      kind: 'choice',
      title: 'What does a 6 mean?',
      body: `Your period agrees with the published one to eleven seconds, and
             your reduced chi-square is about 6. Both of those are true at
             once.`,
      prompt: 'The most likely explanation is…',
      options: [
        'The period is wrong after all — a good fit would give 1',
        'There are too few points for chi-square to mean anything',
        'The quoted uncertainties are smaller than the real scatter of the measurements',
        'A one-planet model is wrong and there is a second planet',
      ],
      answer: 2,
      because:
        'The error bars are too small — or more precisely, they are the wrong error bars. The uncertainties published with these velocities are *internal* errors: photon noise, the wavelength solution, how well the reduction pinned the spectrum. They are an honest account of what the instrument did. They are not an account of what the star did. 51 Pegasi has convective motions and magnetic activity on its surface that shift its spectral lines by a few m/s on timescales of days, and no spectrograph error bar knows about that. The extra scatter has a name — stellar jitter — and on this star it is about 2.5 m/s, which is exactly the gap between 1.13 and 2.79. A second planet is a real possibility in general and is the right instinct; here the residuals carry no periodic structure and the activity index does not track them.',
    },
    {
      sid: 'internal-errors',
      type: 'read',
      title: 'The error bar and the error',
      body: `This is the thing that is genuinely hard to learn from simulated
             data, and it is worth being blunt about why.
             \n\nWhen you fit a recording made by this application's own survey
             tool, the noise was drawn from a generator with a known width, and
             that width was written into the sigma column. The error bars are
             correct <em>by construction</em>. Fit it and your reduced
             chi-square comes out near 1, every time, because the thing that
             made the scatter and the thing that reported the scatter were the
             same line of code.
             \n\nA real measurement has no such guarantee. The people who
             published these velocities computed the best uncertainty they
             could from the instrument, and the star then added something they
             had no way to put in the column. Nobody did anything wrong. The
             number in the sigma column is simply not the number you need.
             \n\nEverything in the rest of this lesson follows from that.`,
      tip: 'A reduced chi-square is the cheapest instrument you own for detecting that your error bars are lying to you.',
    },

    // --- Part 5: the interval -------------------------------------------------
    {
      sid: 'run-the-monte-carlo',
      type: 'explore',
      observed: OBSERVED,
      requires: ['the-fit-is-good-but'],
      title: 'How well do you know the period?',
      body: `A best-fit number with no interval on it is not a measurement.
             \n\nThe workspace will estimate one. It draws a synthetic dataset
             at your own observing epochs from your own best fit, scattered by
             the quoted uncertainties, refits it from scratch through the same
             chi-square grid, and does that four hundred times. The spread of
             the four hundred answers is the interval.
             \n\nUse the seed <strong>51peg</strong> and 400 trials. The seed is
             recorded with the result: an interval nobody can reproduce is not
             evidence.`,
      checklist: [
        'Narrow the search bounds to roughly 4.1 – 4.4 days',
        'Set the seed to 51peg and the trials to 400',
        'Run it and wait for it to finish',
        'Press Save to notebook, write a claim, and press Keep it',
      ],
      tip: 'Every trial goes through exactly the same fitting code your own fit went through. That is deliberate — an interval computed by a second implementation would be an interval on a fit nobody ran.',
    },
    {
      sid: 'write-down-the-interval',
      type: 'measure',
      observed: OBSERVED,
      requires: ['run-the-monte-carlo'],
      title: 'Your interval',
      body: `Open your notebook entry. The panel rounds the period to four
             decimal places, and this interval is narrower than that — on screen
             both ends read 4.2309, which tells you something on its own. The
             notebook keeps the full precision, and it records the seed beside
             it, so the number below is one somebody else could reproduce.
             \n\nFind the row <strong>Period, with Monte Carlo interval</strong>.
             It is written as a value plus or minus a half-width. Write down
             that half-width, and then write down how far the published period
             sits from yours — both in units of 10<sup>-5</sup> days, which is
             what this measurement is actually quoted in.`,
      fields: [
        {
          id: 'halfwidth',
          label: 'The ± on your period',
          unit: '10⁻⁵ days',
          hint: 'e.g. 1.55',
        },
        {
          id: 'offset',
          label: 'Your period minus the published 4.23077 d',
          unit: '10⁻⁵ days',
          hint: 'e.g. 13',
        },
        {
          id: 'sigmas',
          label: 'The second divided by the first',
          unit: 'σ',
          compute: v => v.offset / v.halfwidth,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.halfwidth) || !Number.isFinite(v.offset)) {
          return {
            level: 'warn',
            message:
              'Both in units of 10⁻⁵ days. The half-width is the number after the ± in the notebook row; the offset is your period minus 4.23077, which is about 0.00013 d.',
          };
        }
        if (v.halfwidth <= 0) {
          return {
            level: 'error',
            message: 'A half-width is a positive number.',
          };
        }
        if (Math.abs(v.halfwidth - 1.55) > 0.8) {
          return {
            level: 'error',
            message:
              'With 400 trials and the seed 51peg the half-width is about 1.55 × 10⁻⁵ days. Check the run finished, and that you are reading the interval row rather than the plain period.',
          };
        }
        if (Math.abs(Math.abs(v.offset) - 13) > 6) {
          return {
            level: 'error',
            message:
              '4.23090 − 4.23077 = 0.00013 days, which is 13 in these units. Subtract first, then convert.',
          };
        }
        const sigmas = Math.abs(v.offset / v.halfwidth);
        return {
          level: 'ok',
          message: `The published period is about ${sigmas.toFixed(0)} of your own error bars away from your answer. An interval that misses by eight sigma is not bad luck. Do not fix it — it is the next three screens.`,
        };
      },
    },
    {
      sid: 'the-published-value-is-outside',
      type: 'question',
      kind: 'choice',
      title: 'The published value is outside your interval',
      body: `Your best fit agrees with the published period to eleven seconds.
             Your interval on that period is about a second and a third wide, so
             the published value sits roughly <strong>eight</strong> of your own
             error bars away from your answer.
             \n\nBoth measurements were made carefully. One of them is being
             over-confident.`,
      prompt: 'Which is the best account of what has gone wrong?',
      options: [
        'The published period is wrong; your fit used the same data and is more careful',
        'Your interval is too narrow, because it was drawn using error bars that understate the scatter',
        'The Monte Carlo needs more trials — 400 is not enough to find the tails',
        'Nothing is wrong; intervals are allowed to miss about a third of the time',
      ],
      answer: 1,
      because:
        'Your interval is too narrow, and you already measured why. The Monte Carlo scatters each synthetic point by its quoted sigma — about 1.13 m/s. The real points miss the curve by 2.79 m/s. So every synthetic dataset is about two and a half times cleaner than the real one, every refit is correspondingly better determined, and the spread of those refits understates the spread you would actually get. More trials would not help: four hundred is plenty to measure the width of a distribution, and the distribution itself is the thing that is wrong. The last option is worth taking seriously — a 68% interval really should miss about a third of the time — but the miss here is many interval-widths wide, which is a different complaint than bad luck.',
    },
    {
      sid: 'what-would-fix-it',
      type: 'read',
      title: 'What a paper does about this',
      body: `The standard repair is to add a <strong>jitter</strong> term: a
             single extra variance, the same for every point, fitted alongside
             the orbit and chosen so that the reduced chi-square comes out at 1.
             On these data that term would be about 2.5 m/s, and the interval it
             produces would be roughly two and a half times wider than yours —
             comfortably containing the published value.
             \n\nThis workspace does not do that, and the refusal is deliberate.
             Fitting a jitter term means asserting that the excess scatter is
             white, uncorrelated and the same size all run — three claims about
             a star, presented as a nuisance parameter. Sometimes they are true.
             When they are not, the term absorbs a real signal and hands back a
             tidy chi-square with a second planet buried inside it.
             \n\nSo the honest thing for an instrument that cannot test those
             claims is to report the interval it can actually justify, report
             the reduced chi-square beside it, and let you see that the two
             disagree. You have just done the reading that disagreement
             requires.`,
      tip: 'An interval quoted without its reduced chi-square is an interval you cannot evaluate.',
    },
    {
      sid: 'did-you-replicate-it',
      type: 'question',
      kind: 'short',
      title: 'So — did you replicate it?',
      body: `You recovered a period agreeing with the published one to three
             parts in a hundred thousand, and an amplitude agreeing to about one
             percent. Your formal interval excludes the published period.
             \n\nThere is no single right answer here and the grader will not
             mark one. Write what you would actually say.`,
      prompt:
        'In three or four sentences: did this replicate the published measurement? Say what agreed, what did not, and which of the two you would put more weight on.',
      tip: 'A good answer distinguishes "the measurements agree" from "the uncertainties are trustworthy". They are separate claims and this run settles them differently.',
      rubric:
        'There is no single correct verdict and the strongest answers disagree with each other. Credit any response that (a) states the agreement quantitatively - the period to about three parts in a hundred thousand, the amplitude to about one percent - and (b) states separately that the formal interval excludes the published value, and (c) gives a reason for weighting one over the other. A student who says "yes, replicated" because two independent instruments agree on the physical quantity has argued well. So has a student who says "not at the precision I quoted" because an interval that excludes a known-good value is an interval they cannot defend. What should NOT earn full credit is an answer that reports only one of the two facts, or that resolves the tension by asserting the published value is wrong: the lesson has already shown where the discrepancy comes from, and it is not there.',
    },
    {
      sid: 'what-you-did',
      type: 'read',
      title: 'What you just did',
      body: `You fitted a published time series with the same instrument this
             application uses on its own simulated recordings, and you got the
             published answer. That is worth stating plainly, because it is not
             a foregone conclusion and a great deal of published analysis does
             not survive it.
             

You also found the limit of what the fit could tell you, and
             you found it from inside the fit rather than by being told. The
             reduced chi-square was the whole instrument: one number, computed
             from quantities you already had, that said the error bars were not
             describing the data. Everything after it followed.
             

The habit is the transferable part. Whenever you are handed an
             uncertainty, the question is not whether the arithmetic that
             produced it was right — it usually was — but whether the inputs it
             propagated were the real ones. On simulated data they always are.
             On a real star they are whatever somebody could measure, and the
             star is under no obligation to agree.`,
      tip: 'The velocities, the archive they came from and the seed you used are all in your notebook. An interval nobody can reproduce is not evidence, and yours is reproducible.',
    },
  ],
};

export default REPLICATING_51_PEG;
