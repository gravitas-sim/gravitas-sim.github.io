// =============================================================================
// Two Periodograms
// -----------------------------------------------------------------------------
// Content only, no imports. The companion of the compute page's notebook
// "periodograms" (Roadmap II Prompt 102, COMPUTE.md). There is no instrument on
// this page: the student runs the reviewed notebook at /compute/ on the TESS
// light curve of HD 209458 that the Observatory's box search reads, and types
// back the numbers the capsule holds. Every number here is a declared output of
// that notebook (js/compute/catalogueData.js), checked by
// tests/computeInvestigations.test.js against the notebook's own answer
// (tests/fixtures/compute/periodograms.answer.json) and, in
// tests/computeCurriculum.test.js, against the Observatory's box search and a
// Lomb-Scargle written again. The runs are deterministic: two students get the
// same digits.
//
// The numbers (default settings: periods to 15 days, durations to 6 hours):
//   Lomb-Scargle best period 1.7689 d (power 0.0723), box least squares best
//   period 3.52396 d, duration 2.5 h, depth 14,582 +/- 76 ppm, S/N 191; the
//   ratio of the two periods 0.502; the fit panel's period for the same
//   light curve 3.52454 +/- 0.00003 d, 19 of its sigmas from the box period.
//   Lomb-Scargle power at the harmonics of 3.52454 d: 0.056 at P, 0.073 at P/2,
//   0.071 at P/3 and P/4.
// =============================================================================

const TWO_PERIODOGRAMS = {
  id: 'two-periodograms',
  thumbnail: 'images/scenarios/transit-lab.webp',
  title: 'Two Periodograms',
  subtitle:
    'A Lomb-Scargle and a box least squares periodogram of the same light curve, computed with Astropy in Python, and what a period from a periodogram can claim',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Compute a Lomb-Scargle and a box least squares periodogram of a light curve with Astropy and read each one’s best period',
    'Explain why the Lomb-Scargle peak of a transit light curve is at a harmonic of the planet’s period',
    'Say what a periodogram’s period is, and why it has no error bar of its own',
    'Compare a period from a periodogram with a fitted period in units of the fit’s uncertainty',
  ],
  steps: [
    {
      sid: 'two-ways-to-look-for-a-period',
      type: 'read',
      setup: { scenario: 'Transit Lab', seed: 'transit-lab', paused: true },
      title: 'Two ways to look for a period',
      body: `A light curve that dips every few days has a period in it, and there are two
             standard ways to ask for it. A <strong>Lomb-Scargle periodogram</strong>
             fits a sine wave at each trial frequency, weighted by the error bars, and
             reports how much of the variation each one explains. It was made for unevenly
             spaced data and for signals that are sinusoids: a spotted star turning, a
             pulsation. A <strong>box least squares periodogram</strong> fits a flat-bottomed
             dip instead, at each trial period, epoch and duration, which is what a
             transit looks like. The Observatory's box search is the same idea.
             \n\nThe notebook computes both for the TESS light curve of HD 209458 with
             <strong>astropy.timeseries</strong>, and puts them on one period axis.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It is
             online only and downloads about 17 MB of Python the first time, when you
             press the button. Choose the notebook <strong>Two periodograms of one light
             curve</strong>, keep its example input, and its settings at 15 days and 6
             hours. Do not press Run yet.`,
    },
    {
      sid: 'the-tallest-peak',
      type: 'predict',
      reveal: 'the-two-periods',
      title: 'Where the tallest peak will be',
      body: `The planet transits every 3.52 days; the light curve is 27.9 days long. The
             notebook will search periods from half a day to fifteen.`,
      prompt: 'The Lomb-Scargle periodogram’s tallest peak will be at&hellip;',
      options: [
        'the planet’s period, about 3.5 days',
        'about half of it, 1.8 days',
        'about twice it, 7 days',
        'the spacecraft’s own orbit, about 13.7 days',
      ],
      answer: 1,
      because:
        'A train of narrow dips repeating every P is not a sine wave: it has power at P and at every harmonic, P/2, P/3, and so on, with similar strength in each. Which of them is tallest depends on the dips’ shape and on the gaps in the data. Here the fundamental is the weakest of the first four, and the tallest peak is the second harmonic.',
    },
    {
      sid: 'the-two-periods',
      compute: 'periodograms',
      type: 'measure',
      title: 'Run it: the two best periods',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here: each
             periodogram's best period, and the ratio of the Lomb-Scargle one to the box
             one.`,
      fields: [
        {
          id: 'ls',
          label: 'Lomb-Scargle best period',
          unit: 'd',
          hint: '1.7689',
        },
        {
          id: 'bls',
          label: 'Box least squares best period',
          unit: 'd',
          hint: '3.524',
        },
        {
          id: 'ratio',
          label: 'Lomb-Scargle over box',
          unit: '',
          hint: '0.502',
        },
      ],
      validate: v => {
        if (![v.ls, v.bls, v.ratio].every(Number.isFinite)) return null;
        if (
          Math.abs(v.ls - 1.7689) <= 0.01 &&
          Math.abs(v.bls - 3.524) <= 0.002 &&
          Math.abs(v.ratio - 0.502) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              'The box search finds 3.524 days, the planet’s period. The Lomb-Scargle peak is at 1.769 days, 0.502 of that: very nearly half.',
          };
        }
        return {
          level: 'error',
          message:
            'Run the notebook with its settings at 15 and 6, and read the two best periods and their ratio from the table of numbers it returns.',
        };
      },
    },
    {
      sid: 'why-half',
      type: 'question',
      kind: 'choice',
      title: 'Why half',
      body: `The notebook also returns a table of both periodograms on one axis. Look up
             the Lomb-Scargle power in the rows near 3.5, 1.76, 1.17 and 0.88 days:
             0.056, 0.073, 0.071 and 0.071.`,
      prompt: 'What does that show?',
      options: [
        'A repeating narrow dip has power at the planet’s period and its harmonics, and the harmonics are as strong as the period or stronger, so the tallest peak need not be the period',
        'The planet’s true period is 1.77 days',
        'The light curve contains four different planets',
        'Lomb-Scargle has a bug that halves periods',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'true-half',
          option: 1,
          say: 'The box search, the dips themselves, and the fit all say 3.52 days. Count the dips: eight in 28 days.',
        },
        {
          id: 'four-planets',
          option: 2,
          say: 'The powers at 3.5, 1.76, 1.17 and 0.88 are 1, 1/2, 1/3 and 1/4 of one period: the harmonics of one signal, not four signals.',
        },
      ],
      hints: [
        'A sine wave has one smooth hump per cycle. A narrow dip is not smooth, and a sum of sine waves at the period and its harmonics makes one.',
      ],
      because:
        'A narrow dip repeating every P is a sum of sine waves at P, P/2, P/3 and so on, with similar strengths. Lomb-Scargle fits one sine at a time, so each of these is a peak and any of them may be the tallest. Its tallest peak says there is a periodic signal and gives a period that divides the real one; it does not say which.',
    },
    {
      sid: 'the-box',
      compute: 'periodograms',
      type: 'measure',
      title: 'The best box',
      body: `The box search returns more than a period: the duration and depth of the box
             that fits best, and the depth's signal-to-noise ratio, where the depth's
             error bar is scaled up because the points scatter about 2.8 times their
             error bars. Enter the duration, the depth and the signal-to-noise ratio.`,
      fields: [
        { id: 'duration', label: 'Box duration', unit: 'h', hint: '2.5' },
        { id: 'depth', label: 'Box depth', unit: 'ppm', hint: '14582' },
        { id: 'snr', label: 'Depth S/N', unit: '', hint: '191' },
      ],
      validate: v => {
        if (![v.duration, v.depth, v.snr].every(Number.isFinite)) return null;
        if (
          Math.abs(v.duration - 2.5) <= 0.3 &&
          Math.abs(v.depth - 14582) <= 400 &&
          Math.abs(v.snr - 191) <= 30
        ) {
          return {
            level: 'ok',
            message:
              'The box is 2.5 hours long and 14,600 parts per million deep, detected at a signal-to-noise ratio of about 190. It is a box: the real transit has sloped ingress and egress and a limb-darkened floor, so the box is an average of it.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the box duration, the box depth and its signal-to-noise ratio from the table of numbers. They are rows of the table, in hours and in parts per million.',
        };
      },
    },
    {
      sid: 'against-the-fit',
      compute: 'periodograms',
      type: 'measure',
      title: 'Against the fit',
      body: `The Observatory's fit panel, which fits a transit to this light curve rather
             than a box, gives a period of <strong>3.52454</strong> days with an
             uncertainty of 0.00003. Subtract it from the box search's period, and say
             how many of the fit's uncertainties apart they are.`,
      fields: [
        {
          id: 'difference',
          label: 'Box period minus fitted period',
          unit: 'd',
          hint: '-0.00058',
        },
        {
          id: 'sigmas',
          label: 'In the fit’s uncertainties',
          unit: '',
          hint: '-19',
        },
      ],
      validate: v => {
        if (![v.difference, v.sigmas].every(Number.isFinite)) return null;
        if (
          Math.abs(v.difference - -0.00058) <= 0.0003 &&
          Math.abs(v.sigmas - -19.4) <= 7
        ) {
          return {
            level: 'ok',
            message:
              'The box period is 0.0006 day below the fitted one, about 19 of the fit’s uncertainties. That is not a mistake of the box search: its period is the best point of a grid of boxes, and it was never a number with an error bar of 0.00003.',
          };
        }
        return {
          level: 'error',
          message:
            'Subtract 3.52454 from the box least squares period, and divide by 0.00003.',
        };
      },
    },
    {
      sid: 'what-a-grid-step-is',
      type: 'question',
      kind: 'choice',
      title: 'What a grid step is',
      body: `A colleague reports the box search's period as 3.52396 &plusmn; 0.0000003
             days, taking the second number from the fine grid the notebook searches
             across the peak, which has a step of 3e-7 day.`,
      prompt: 'What is wrong with that?',
      options: [
        'The grid step is how finely the periods were sampled, not how well the data fix the period: this period is 19 of the fit’s uncertainties from the fit’s, so its real uncertainty is far larger than the step',
        'The grid step is too small and should be made larger',
        'A box search cannot find a period at all',
        'The uncertainty should be the signal-to-noise ratio',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'larger',
          option: 1,
          say: 'Making the step larger would make the quoted uncertainty larger and no more honest: it is still a property of the grid.',
        },
        {
          id: 'cannot',
          option: 2,
          say: 'It found the period, to a thousandth of a day. It cannot say how well, because nothing in a box search estimates that.',
        },
      ],
      hints: [
        'Change the grid and the step changes. Does what the data say about the period change?',
      ],
      because:
        'A periodogram’s period is the highest point of a curve evaluated on a grid. Its sharpness depends on the grid, the durations tried and the shape of the box, and none of these is an error bar. To say how well the data fix the period, fit a transit model to it, as the Observatory’s panel does, and take the covariance or the profile of the period.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Two periodograms of one light curve disagree by a factor of two, and both
             are right about what they were asked. Lomb-Scargle found the strongest
             sine wave, at 1.769 days, a harmonic of the planet's period. The box search
             found a dip, at 3.524 days, 2.5 hours long and 14,600 parts per million
             deep, and it matches the fit's period to 0.0006 day.
             \n\nA periodogram answers "is there a period here, and roughly where", and
             not "what is it, to what precision". The second needs a model, a fit and an
             uncertainty, which the previous investigation did and this one did not.
             The run is yours to keep: its capsule records the notebook's hash and the
             light curve's, so a report can cite it.`,
    },
  ],
};

export default TWO_PERIODOGRAMS;
